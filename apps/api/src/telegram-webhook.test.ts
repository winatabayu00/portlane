import { describe, expect, it, vi, afterEach } from "vitest";
import { normalizePublicBaseUrl, publicHookUrl, loadConfig } from "./config.js";
import { verifyPlaintextWebhookSecret } from "./modules/webhooks/routes.js";
import { setTelegramWebhook, getTelegramWebhookInfo, deleteTelegramWebhook } from "./modules/providers/telegram/index.js";
import { hashSecret } from "./lib/crypto.js";
import { ProviderError } from "./modules/providers/core/types.js";

afterEach(() => { vi.unstubAllGlobals(); });

function baseConfig(base: string) {
  return loadConfig({ DATABASE_URL: "postgres://x", REDIS_URL: "redis://x", PORTLANE_PUBLIC_BASE_URL: base } as NodeJS.ProcessEnv);
}

describe("normalizePublicBaseUrl", () => {
  it("empty stays empty (set-webhook disabled)", () => {
    expect(normalizePublicBaseUrl("")).toBe("");
  });
  it("strips trailing slash", () => {
    expect(normalizePublicBaseUrl("https://portlane.example.com/")).toBe("https://portlane.example.com");
  });
  it("rejects non-http and invalid", () => {
    expect(() => normalizePublicBaseUrl("ftp://x")).toThrow(/http\(s\)/);
    expect(() => normalizePublicBaseUrl("not-a-url")).toThrow();
  });
});

describe("publicHookUrl", () => {
  it("builds per-endpoint inbound url", () => {
    expect(publicHookUrl(baseConfig("https://portlane.example.com"), "wh_abc")).toBe("https://portlane.example.com/hooks/wh_abc");
  });
  it("throws clear error when base unconfigured", () => {
    expect(() => publicHookUrl(baseConfig(""), "wh_abc")).toThrow(/PORTLANE_PUBLIC_BASE_URL is not configured/);
  });
});

describe("verifyPlaintextWebhookSecret", () => {
  const hash = hashSecret("s3cr3t");
  it("false without hash or header", () => {
    expect(verifyPlaintextWebhookSecret(null, {})).toBe(false);
    expect(verifyPlaintextWebhookSecret(hash, {})).toBe(false);
  });
  it("accepts legacy and telegram transports", () => {
    expect(verifyPlaintextWebhookSecret(hash, { "x-webhook-secret": "s3cr3t" })).toBe(true);
    expect(verifyPlaintextWebhookSecret(hash, { "x-telegram-bot-api-secret-token": "s3cr3t" })).toBe(true);
    expect(verifyPlaintextWebhookSecret(hash, { "x-telegram-bot-api-secret-token": ["s3cr3t"] })).toBe(true);
  });
  it("rejects wrong secret", () => {
    expect(verifyPlaintextWebhookSecret(hash, { "x-telegram-bot-api-secret-token": "wrong" })).toBe(false);
  });
});

describe("telegram webhook bot api", () => {
  const token = "TOKEN123";
  it("setWebhook sends secret_token when given", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, result: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await setTelegramWebhook(token, "https://portlane.example.com/hooks/wh_abc", "s3cr3t");
    const [, opts] = fetchMock.mock.calls[0] as any[];
    expect(JSON.parse(opts.body)).toMatchObject({ url: "https://portlane.example.com/hooks/wh_abc", secret_token: "s3cr3t" });
  });
  it("getWebhookInfo + deleteWebhook pass through result", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true, result: { url: "u" } }), { status: 200 })));
    expect(await getTelegramWebhookInfo(token)).toMatchObject({ url: "u" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true, result: true }), { status: 200 })));
    expect(await deleteTelegramWebhook(token, true)).toBe(true);
  });
  it("maps 401 to INVALID_CREDENTIALS, 429 retryable, never echoes token", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: false, description: "Unauthorized" }), { status: 401, statusText: "Unauthorized" })));
    const e401: any = await getTelegramWebhookInfo(token).catch((e) => e);
    expect(e401).toBeInstanceOf(ProviderError);
    expect(e401.code).toBe("INVALID_CREDENTIALS");
    expect(e401.message).not.toContain(token);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: false, description: "Too Many Requests" }), { status: 429, statusText: "Slow" })));
    const e429: any = await getTelegramWebhookInfo(token).catch((e) => e);
    expect(e429.code).toBe("RATE_LIMITED");
    expect(e429.retryable).toBe(true);
  });
  it("network failure becomes retryable TIMEOUT", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("boom"); }));
    const e: any = await getTelegramWebhookInfo(token).catch((err) => err);
    expect(e.code).toBe("TIMEOUT");
    expect(e.retryable).toBe(true);
  });
});
