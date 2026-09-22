import { dbPool } from "../../../db.js";
import type { Pool } from "pg";
import { credentialEncryptionKey, publicHookUrl, type AppConfig } from "../../../config.js";
import { id } from "../../../lib/ids.js";
import { decrypt } from "../../../lib/crypto.js";
import { decryptCreds } from "../core/crypto.js";
import { getTelegramWebhookInfo, setTelegramWebhook } from "./index.js";

// Auto re-sync Telegram `setWebhook` setelah restart laptop / deploy CI/CD.
//
// Root cause yang ditangani: Telegram hanya menyimpan 1 active webhook URL per
// bot di sisi Telegram. Bila `PORTLANE_PUBLIC_BASE_URL` berganti (cloudflared
// quick tunnel memberi URL random tiap restart), URL lama di sisi Telegram
// jadi mati dan inbound berhenti — sampai ada yang klik "Aktifkan" manual.
// Modul ini membandingkan `getWebhookInfo` vs URL ekspektasi baru dan
// memanggil `setWebhook` ulang bila mismatch.
//
// Batasan Telegram (last set wins): satu bot hanya punya 1 URL aktif. Bila
// satu connection punya N link di `telegram_webhook_links`, hanya link paling
// baru (`last_set_at` DESC) yang di-sync; sisanya dilaporkan sebagai
// `superseded` (riwayat tetap tersimpan di DB agar observable, §39).
//
// Keamanan (§19/§20/§62): token & secret tidak pernah di-log; audit memakai
// actor `system`; koneksi/endpoint `disabled` dilewati.

export interface TelegramLinkRow {
  link_id: string;
  tenant_id: string;
  provider_connection_id: string;
  webhook_endpoint_id: string;
  telegram_url: string;
  last_set_at: string;
  encrypted_credentials: string;
  conn_status: string;
  public_identifier: string;
  endpoint_status: string;
  encrypted_secret: string | null;
}

export interface SyncLogger {
  info(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
}

export interface SyncDeps {
  query?(text: string, params?: unknown[]): Promise<{ rows: TelegramLinkRow[] }>;
  getInfo?(token: string): Promise<unknown>;
  setHook?(token: string, url: string, secret?: string): Promise<unknown>;
  decryptCredsFn?(cipher: string, key: string): Record<string, unknown>;
  decryptSecretFn?(cipher: string, key: string): string;
  updateLink?(linkId: string, tenantId: string, url: string): Promise<void>;
  audit?(tenantId: string, endpointId: string, metadata: Record<string, unknown>): Promise<void>;
  log?: SyncLogger;
}

export interface SyncSummary {
  skipped?: string;
  checked: number;
  synced: number;
  upToDate: number;
  superseded: number;
  skippedDisabled: number;
  failed: { connectionId: string; endpointId: string; tenantId: string; error: string }[];
}

// Pure: satu bot = satu URL aktif → pertahankan link terbaru per connection.
export function pickLatestLinkPerConnection(rows: TelegramLinkRow[]): {
  latest: TelegramLinkRow[];
  superseded: TelegramLinkRow[];
} {
  const seen = new Set<string>();
  const latest: TelegramLinkRow[] = [];
  const superseded: TelegramLinkRow[] = [];
  for (const r of rows) {
    if (seen.has(r.provider_connection_id)) superseded.push(r);
    else {
      seen.add(r.provider_connection_id);
      latest.push(r);
    }
  }
  return { latest, superseded };
}

// Pure: mismatch bila URL sisi Telegram kosong atau beda dari ekspektasi.
export function isWebhookMismatch(actualUrl: string | null | undefined, expectedUrl: string): boolean {
  return (actualUrl ?? "") !== expectedUrl;
}

const LINKS_QUERY = `
  SELECT l.id AS link_id, l.tenant_id, l.provider_connection_id, l.webhook_endpoint_id,
         l.telegram_url, l.last_set_at,
         c.encrypted_credentials, c.status AS conn_status,
         e.public_identifier, e.status AS endpoint_status, e.encrypted_secret
  FROM telegram_webhook_links l
  JOIN provider_connections c ON c.id = l.provider_connection_id AND c.tenant_id = l.tenant_id
  JOIN webhook_endpoints e ON e.id = l.webhook_endpoint_id AND e.tenant_id = l.tenant_id
  WHERE c.provider_key = 'telegram'
  ORDER BY l.last_set_at DESC
`;

export async function syncTelegramWebhooks(config: AppConfig, deps?: SyncDeps): Promise<SyncSummary> {
  const log = deps?.log;
  const empty: SyncSummary = { checked: 0, synced: 0, upToDate: 0, superseded: 0, skippedDisabled: 0, failed: [] };
  if (config.TELEGRAM_WEBHOOK_AUTOSYNC === false) return { ...empty, skipped: "disabled" };
  if (!config.PORTLANE_PUBLIC_BASE_URL) return { ...empty, skipped: "no-base-url" };

  // Lazy pool: hanya konek DB bila ada fallback yang butuh DB (q/update/audit
  // tanpa override). Jangan `deps ? null` — pemanggil boot/CLI hanya kirim
  // { log } dan tetap butuh DB asli.
  let pool: Pool | null = null;
  const getPool = (): Pool => (pool ??= dbPool(config));
  const q = deps?.query ?? ((text: string, params?: unknown[]) => getPool().query(text, params as unknown[]));
  const getInfo = deps?.getInfo ?? getTelegramWebhookInfo;
  const setHook = deps?.setHook ?? setTelegramWebhook;
  const decCreds = deps?.decryptCredsFn ?? decryptCreds;
  const decSecret = deps?.decryptSecretFn ?? decrypt;
  const encryptionKey = credentialEncryptionKey(config);

  let rows: TelegramLinkRow[];
  try {
    rows = (await q(LINKS_QUERY)).rows;
  } catch (e: unknown) {
    log?.error({ err: String((e as Error)?.message ?? e) }, "telegram autosync: failed to load links");
    return { ...empty, skipped: "db-unavailable" };
  }
  if (!rows.length) return { ...empty, skipped: "no-links" };

  const { latest, superseded } = pickLatestLinkPerConnection(rows);
  const summary: SyncSummary = { ...empty, superseded: superseded.length };

  const updateLink =
    deps?.updateLink ??
    (async (linkId: string, tenantId: string, url: string) => {
      await getPool().query(
        "UPDATE telegram_webhook_links SET telegram_url=$1, last_set_at=NOW(), updated_at=NOW() WHERE id=$2 AND tenant_id=$3",
        [url, linkId, tenantId],
      );
    });
  const audit =
    deps?.audit ??
    (async (tenantId: string, endpointId: string, metadata: Record<string, unknown>) => {
      await getPool().query(
        "INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id,metadata_json) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
        [id("aud"), tenantId, "system", "system", "telegram.webhook_autosync", "webhook_endpoint", endpointId, JSON.stringify(metadata)],
      );
    });

  for (const row of latest) {
    if (row.conn_status !== "active" || row.endpoint_status !== "active") {
      summary.skippedDisabled += 1;
      continue;
    }
    summary.checked += 1;
    let expectedUrl: string;
    try {
      expectedUrl = publicHookUrl(config, row.public_identifier);
    } catch (e: unknown) {
      summary.failed.push({
        connectionId: row.provider_connection_id,
        endpointId: row.webhook_endpoint_id,
        tenantId: row.tenant_id,
        error: String((e as Error)?.message ?? e),
      });
      continue;
    }
    let token: string;
    try {
      const creds = decCreds(row.encrypted_credentials, encryptionKey);
      token = String((creds as { botToken?: unknown }).botToken ?? "");
      if (!token) throw new Error("Connection credentials unreadable.");
    } catch (e: unknown) {
      summary.failed.push({
        connectionId: row.provider_connection_id,
        endpointId: row.webhook_endpoint_id,
        tenantId: row.tenant_id,
        error: String((e as Error)?.message ?? e),
      });
      continue;
    }
    try {
      const info = (await getInfo(token)) as { url?: string } | null;
      const actualUrl = info?.url ?? "";
      if (!isWebhookMismatch(actualUrl, expectedUrl)) {
        summary.upToDate += 1;
        if (row.telegram_url !== expectedUrl) {
          await updateLink(row.link_id, row.tenant_id, expectedUrl);
        }
        continue;
      }
      let secretToken: string | undefined;
      if (row.encrypted_secret) {
        try {
          secretToken = decSecret(row.encrypted_secret, encryptionKey);
        } catch {
          secretToken = undefined;
        }
      }
      await setHook(token, expectedUrl, secretToken);
      await updateLink(row.link_id, row.tenant_id, expectedUrl);
      await audit(row.tenant_id, row.webhook_endpoint_id, { expected_url: expectedUrl, mismatch: true });
      summary.synced += 1;
      log?.info(
        { tenant_id: row.tenant_id, connection_id: row.provider_connection_id, endpoint_id: row.webhook_endpoint_id },
        "telegram autosync: webhook re-registered",
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      summary.failed.push({
        connectionId: row.provider_connection_id,
        endpointId: row.webhook_endpoint_id,
        tenantId: row.tenant_id,
        error: msg,
      });
      log?.warn(
        { tenant_id: row.tenant_id, connection_id: row.provider_connection_id, endpoint_id: row.webhook_endpoint_id },
        `telegram autosync: failed: ${msg}`,
      );
    }
  }
  return summary;
}
