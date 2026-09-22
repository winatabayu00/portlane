import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";
import {
  isWebhookMismatch,
  isCallbackUpdateMissing,
  pickLatestLinkPerConnection,
  syncTelegramWebhooks,
  type TelegramLinkRow,
} from "./modules/providers/telegram/sync.js";

function cfg(base: string, sync = "true") {
  return loadConfig({
    DATABASE_URL: "postgres://x",
    REDIS_URL: "redis://x",
    PORTLANE_PUBLIC_BASE_URL: base,
    TELEGRAM_WEBHOOK_AUTOSYNC: sync,
  } as NodeJS.ProcessEnv);
}

function row(over: Partial<TelegramLinkRow> = {}): TelegramLinkRow {
  return {
    link_id: "tgl_1",
    tenant_id: "tnt_1",
    provider_connection_id: "conn_1",
    webhook_endpoint_id: "ep_1",
    telegram_url: "https://old.trycloudflare.com/hooks/wh_abc",
    last_set_at: "2026-09-20T00:00:00Z",
    encrypted_credentials: "enc",
    conn_status: "active",
    public_identifier: "wh_abc",
    endpoint_status: "active",
    encrypted_secret: null,
    ...over,
  };
}

describe("telegram autosync config", () => {
  it("defaults to enabled", () => {
    expect(loadConfig({ DATABASE_URL: "postgres://x", REDIS_URL: "redis://x" } as NodeJS.ProcessEnv).TELEGRAM_WEBHOOK_AUTOSYNC).toBe(true);
  });
  it("parses false/0 as disabled, rejects garbage", () => {
    expect(cfg("https://x.example.com", "false").TELEGRAM_WEBHOOK_AUTOSYNC).toBe(false);
    expect(cfg("https://x.example.com", "0").TELEGRAM_WEBHOOK_AUTOSYNC).toBe(false);
    expect(() => cfg("https://x.example.com", "maybe")).toThrow(/TELEGRAM_WEBHOOK_AUTOSYNC/);
  });
});

describe("pickLatestLinkPerConnection", () => {
  it("one bot = one active url: keeps newest, rest superseded", () => {
    const a = row({ link_id: "new", last_set_at: "2026-09-21T00:00:00Z" });
    const b = row({ link_id: "old", last_set_at: "2026-09-20T00:00:00Z" });
    const c = row({ link_id: "other-bot", provider_connection_id: "conn_2" });
    const { latest, superseded } = pickLatestLinkPerConnection([a, b, c]);
    expect(latest.map((r) => r.link_id)).toEqual(["new", "other-bot"]);
    expect(superseded.map((r) => r.link_id)).toEqual(["old"]);
  });
});

describe("isWebhookMismatch", () => {
  it("empty or different url = mismatch", () => {
    expect(isWebhookMismatch("", "https://new/hooks/wh_abc")).toBe(true);
    expect(isWebhookMismatch(undefined, "https://new/hooks/wh_abc")).toBe(true);
    expect(isWebhookMismatch("https://old/hooks/wh_abc", "https://new/hooks/wh_abc")).toBe(true);
    expect(isWebhookMismatch("https://new/hooks/wh_abc", "https://new/hooks/wh_abc")).toBe(false);
  });
});

describe("isCallbackUpdateMissing", () => {
  it("requires callback_query in the Telegram webhook subscription", () => {
    expect(isCallbackUpdateMissing(undefined)).toBe(true);
    expect(isCallbackUpdateMissing(["message"])).toBe(true);
    expect(isCallbackUpdateMissing(["message", "callback_query"])).toBe(false);
  });
});

describe("syncTelegramWebhooks", () => {
  const base = "https://new.trycloudflare.com";
  const expected = `${base}/hooks/wh_abc`;

  it("skips when disabled or base url empty", async () => {
    const s1 = await syncTelegramWebhooks(cfg(base, "false"), { query: async () => ({ rows: [] }) });
    expect(s1.skipped).toBe("disabled");
    const s2 = await syncTelegramWebhooks(cfg("", "true"), { query: async () => ({ rows: [] }) });
    expect(s2.skipped).toBe("no-base-url");
  });

  it("re-registers on mismatch and persists link + audit, keeps secret out of logs", async () => {
    const calls: { url: string; secret?: string }[] = [];
    const updated: string[] = [];
    const audits: unknown[] = [];
    const logged: unknown[] = [];
    const summary = await syncTelegramWebhooks(cfg(base), {
      query: async () => ({ rows: [row({ encrypted_secret: "enc-secret" })] }),
      getInfo: async () => ({ url: "https://old.trycloudflare.com/hooks/wh_abc" }),
      setHook: async (_t, url, secret) => { calls.push({ url, secret }); return true; },
      decryptCredsFn: () => ({ botToken: "TOKEN123" }),
      decryptSecretFn: () => "s3cr3t",
      updateLink: async (linkId) => { updated.push(linkId); },
      audit: async (_t, _e, m) => { audits.push(m); },
      log: { info: (o, m) => { logged.push([o, m]); }, warn: () => {}, error: () => {} },
    });
    expect(summary).toMatchObject({ checked: 1, synced: 1, upToDate: 0, failed: [] });
    expect(calls).toEqual([{ url: expected, secret: "s3cr3t" }]);
    expect(updated).toEqual(["tgl_1"]);
    expect(audits).toHaveLength(1);
    expect(JSON.stringify(logged)).not.toContain("TOKEN123");
    expect(JSON.stringify(logged)).not.toContain("s3cr3t");
    expect(JSON.stringify(audits)).not.toContain("TOKEN123");
  });

  it("no-op when already up to date", async () => {
    let setCalls = 0;
    const summary = await syncTelegramWebhooks(cfg(base), {
      query: async () => ({ rows: [row({ telegram_url: expected })] }),
      getInfo: async () => ({ url: expected, allowed_updates: ["message", "callback_query"] }),
      setHook: async () => { setCalls += 1; return true; },
      decryptCredsFn: () => ({ botToken: "T" }),
      updateLink: async () => {},
      audit: async () => {},
    });
    expect(summary).toMatchObject({ checked: 1, synced: 0, upToDate: 1 });
    expect(setCalls).toBe(0);
  });

  it("re-registers when the URL is current but callback updates are missing", async () => {
    let setCalls = 0;
    const summary = await syncTelegramWebhooks(cfg(base), {
      query: async () => ({ rows: [row({ telegram_url: expected })] }),
      getInfo: async () => ({ url: expected, allowed_updates: ["message"] }),
      setHook: async () => { setCalls += 1; return true; },
      decryptCredsFn: () => ({ botToken: "T" }),
      updateLink: async () => {},
      audit: async () => {},
    });
    expect(summary).toMatchObject({ checked: 1, synced: 1, upToDate: 0 });
    expect(setCalls).toBe(1);
  });

  it("boot-style call with only {log} uses real DB path (no null-pool crash)", async () => {
    const { closeDb } = await import("./db.js");
    try {
      const s = await syncTelegramWebhooks(cfg(base), {
        log: { info: () => {}, warn: () => {}, error: () => {} },
      });
      // DB "postgres://x" tidak reachable → skipped, bukan TypeError pool null.
      expect(s.skipped).toBe("db-unavailable");
    } finally {
      await closeDb().catch(() => {});
    }
  });

  it("partial deps fall back to real DB, never null pool (boot/CLI shape)", async () => {
    const { closeDb } = await import("./db.js");
    try {
      // Link drift (DB usang, Telegram sudah benar) → updateLink fallback terpakai.
      // Bug lama: `pool!` null → "Cannot read properties of null".
      const s = await syncTelegramWebhooks(cfg(base), {
        query: async () => ({ rows: [row()] }),
        getInfo: async () => ({ url: expected, allowed_updates: ["message", "callback_query"] }),
        decryptCredsFn: () => ({ botToken: "T" }),
        log: { info: () => {}, warn: () => {}, error: () => {} },
      });
      expect(s.upToDate).toBe(1);
      for (const f of s.failed) expect(f.error).not.toMatch(/null/i);
    } finally {
      await closeDb().catch(() => {});
    }
  });

  it("skips disabled connection/endpoint, records bad creds as failed (never throws)", async () => {
    const s1 = await syncTelegramWebhooks(cfg(base), {
      query: async () => ({ rows: [row({ conn_status: "disabled" })] }),
      getInfo: async () => ({}),
      setHook: async () => true,
      decryptCredsFn: () => ({ botToken: "T" }),
    });
    expect(s1.skippedDisabled).toBe(1);
    expect(s1.checked).toBe(0);
    const s2 = await syncTelegramWebhooks(cfg(base), {
      query: async () => ({ rows: [row()] }),
      getInfo: async () => ({}),
      setHook: async () => true,
      decryptCredsFn: () => ({}),
    });
    expect(s2.failed).toHaveLength(1);
    expect(s2.failed[0].error).toMatch(/unreadable/);
  });
});
