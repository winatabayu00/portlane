import { z } from "zod";

const configSchema = z.object({
  APP_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_PORT: z.coerce.number().int().positive().default(4002),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  REQUEST_ID_HEADER: z.string().min(1).default("x-request-id"),
  TRUSTED_PROXIES: z.string().default(""),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (Postgres on minisever via Tailscale)"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required (Redis on minisever via Tailscale)"),
  APP_ENCRYPTION_KEY: z.string().default(""),
  WEB_DIST_DIR: z.string().default(""),
  // "true"/"false" eksplisit, atau "" (=auto: Secure hanya di production).
  // Set "false" bila dashboard diakses via HTTP polos di jaringan privat
  // (mis. Tailscale) — browser menolak cookie Secure di atas HTTP sehingga
  // sesi tidak menempel ("Missing token" setelah login sukses).
  COOKIE_SECURE: z.string().default(""),
  JWT_SECRET: z.string().default(""),
  JWT_EXPIRES_IN: z.string().default("7d"),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(5),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  REDIS_CLUSTER_URLS: z.string().default(""),
  RETENTION_ENABLED: z.string().default("false"),
  RETENTION_DAYS: z.coerce.number().int().min(7).max(3650).default(90),
  // Public base URL Portlane (mis. https://portlane.example.com) untuk
  // membangun webhook URL Telegram (/hooks/wh_xxx). Kosong = fitur
  // set-webhook nonaktif (422 yang jelas, bukan URL rusak).
  PORTLANE_PUBLIC_BASE_URL: z.string().default(""),
  // Autosync Telegram setWebhook saat boot/deploy (default on). "true"/"1"/""
  // = aktif, "false"/"0" = nonaktif. Perlu PORTLANE_PUBLIC_BASE_URL.
  TELEGRAM_WEBHOOK_AUTOSYNC: z.string().default("true"),
});

export type AppConfig = Omit<z.infer<typeof configSchema>, "COOKIE_SECURE" | "RETENTION_ENABLED" | "TELEGRAM_WEBHOOK_AUTOSYNC"> & { COOKIE_SECURE: boolean; RETENTION_ENABLED: boolean; TELEGRAM_WEBHOOK_AUTOSYNC: boolean };

function buildDatabaseUrlFromDbVars(env: NodeJS.ProcessEnv): string | undefined {
  const host = (env.DB_HOST as string) || "";
  if (!host) return undefined;
  const user = (env.DB_USERNAME as string) || (env.DB_USER as string) || "postgres";
  const pass = (env.DB_PASSWORD as string) || "";
  const port = (env.DB_PORT as string) || "5432";
  const db = (env.DB_DATABASE as string) || (env.DB_NAME as string) || "portlane";
  if (db === "ai_engineering_os") {
    throw new Error("DB_DATABASE must not be ai_engineering_os — Portlane uses isolated DB 'portlane'");
  }
  const encUser = encodeURIComponent(user);
  if (pass) return `postgresql://${encUser}:${encodeURIComponent(pass)}@${host}:${port}/${db}`;
  return `postgresql://${encUser}@${host}:${port}/${db}`;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  // Allow DB_* vars as fallback builder for DATABASE_URL (JANGAN pakai DB yang sama dengan app lain)
  const e = { ...env } as NodeJS.ProcessEnv & Record<string, string | undefined>;
  if (!e.DATABASE_URL) {
    const built = buildDatabaseUrlFromDbVars(e);
    if (built) e.DATABASE_URL = built;
  }
  // Default API port 4002 (UI di 3002)
  if (!e.APP_PORT) e.APP_PORT = "4002";
  const parsed = configSchema.safeParse(e);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid configuration: ${details}`);
  }
  const cfg = parsed.data;
  const rawSecure = cfg.COOKIE_SECURE.trim().toLowerCase();
  let cookieSecure: boolean;
  if (rawSecure === "") cookieSecure = cfg.APP_ENV === "production";
  else if (rawSecure === "true" || rawSecure === "1") cookieSecure = true;
  else if (rawSecure === "false" || rawSecure === "0") cookieSecure = false;
  else throw new Error("COOKIE_SECURE must be true/false (or empty for auto: Secure in production)");
  const rawRet = cfg.RETENTION_ENABLED.trim().toLowerCase();
  if (!["", "true", "false", "1", "0"].includes(rawRet)) throw new Error("RETENTION_ENABLED must be true/false");
  const rawSync = cfg.TELEGRAM_WEBHOOK_AUTOSYNC.trim().toLowerCase();
  if (!["", "true", "false", "1", "0"].includes(rawSync)) throw new Error("TELEGRAM_WEBHOOK_AUTOSYNC must be true/false");
  const publicBase = normalizePublicBaseUrl(cfg.PORTLANE_PUBLIC_BASE_URL);
  const out: AppConfig = { ...cfg, COOKIE_SECURE: cookieSecure, RETENTION_ENABLED: rawRet === "true" || rawRet === "1", TELEGRAM_WEBHOOK_AUTOSYNC: rawSync === "" || rawSync === "true" || rawSync === "1", PORTLANE_PUBLIC_BASE_URL: publicBase };
  if (out.DATABASE_URL.includes("/ai_engineering_os")) {
    throw new Error("DATABASE_URL must not point to ai_engineering_os — use isolated DB 'portlane' (e.g. .../portlane)");
  }
  if (!out.JWT_SECRET) out.JWT_SECRET = out.APP_ENV === "production" ? "" : "dev-jwt-secret-change-me-32chars!!!";
  // Credential encryption key: single source. Production wajib APP_ENCRYPTION_KEY
  // (distinct dari JWT_SECRET). Dev/test dapat default independen — tidak lagi
  // fallback ke JWT_SECRET agar dua domain kunci tidak tercampur.
  if (out.APP_ENV === "production") {
    requireEncryptionKey(out);
    if (!out.JWT_SECRET || out.JWT_SECRET.length < 32)
      throw new Error("JWT_SECRET required in production (32+ chars, openssl rand -hex 32)");
    if (out.JWT_SECRET === out.APP_ENCRYPTION_KEY)
      throw new Error("JWT_SECRET must differ from APP_ENCRYPTION_KEY in production");
  }
  return out;
}

// Validasi + normalisasi public base URL: harus http(s), tanpa trailing slash.
// Return "" bila kosong (fitur set-webhook nonaktif sampai dikonfigurasi).
export function normalizePublicBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    throw new Error("PORTLANE_PUBLIC_BASE_URL must be a valid http(s) URL");
  }
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("PORTLANE_PUBLIC_BASE_URL must be http(s)");
  return u.toString().replace(/\/+$/, "");
}

// Bangun URL inbound publik untuk satu webhook endpoint.
// Multi-bot didukung: satu URL per endpoint (public_identifier unik),
// semuanya boleh forward ke satu global webhook downstream yang sama.
export function publicHookUrl(config: AppConfig, publicIdentifier: string): string {
  if (!config.PORTLANE_PUBLIC_BASE_URL) throw new Error("PORTLANE_PUBLIC_BASE_URL is not configured — set the public http(s) base URL to register Telegram webhooks");
  return `${config.PORTLANE_PUBLIC_BASE_URL}/hooks/${publicIdentifier}`;
}

export function trustedProxyList(config: AppConfig): string[] | false {
  const list = config.TRUSTED_PROXIES.split(",").map((s) => s.trim()).filter(Boolean);
  return list.length > 0 ? list : false;
}

export function requireEncryptionKey(config: AppConfig): string {
  const k = config.APP_ENCRYPTION_KEY;
  if (!k || k.length < 16) throw new Error("APP_ENCRYPTION_KEY required (32 hex chars, openssl rand -hex 32)");
  return k;
}

// Single source kunci enkripsi kredensial. Production: wajib
// APP_ENCRYPTION_KEY (distinct dari JWT_SECRET). Dev/test: default stabil
// agar tidak tercampur dengan JWT_SECRET bila env kosong.
export function credentialEncryptionKey(config: AppConfig): string {
  if (config.APP_ENV === "production") return requireEncryptionKey(config);
  return config.APP_ENCRYPTION_KEY || "dev-encryption-key-32chars-long!!";
}
