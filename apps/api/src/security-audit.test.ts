import { describe, expect, it, vi, afterEach } from "vitest";
import nodeCrypto from "node:crypto";
import { isIpAllowed, parseCidrOrThrow } from "./lib/ip.js";
import { validateOutboundUrl, validateSmtpPort } from "./lib/ssrf.js";
import { encrypt, decrypt, hashSecret, timingSafeEqual, verifyHmacSha256 } from "./lib/crypto.js";
import { redactHeaders, redactCredentials } from "./lib/mask.js";
import { loadConfig } from "./config.js";
import { ProviderError } from "./modules/providers/core/types.js";
import { webhookProvider } from "./modules/providers/webhook/index.js";
import { discordProvider } from "./modules/providers/discord/index.js";

afterEach(() => { vi.unstubAllGlobals(); });

describe("ip allowlist (§15/§47)", () => {
  it("exact IPv4 match passes, other fails", () => {
    expect(isIpAllowed("127.0.0.1", ["127.0.0.1/32"])).toBe(true);
    expect(isIpAllowed("127.0.0.2", ["127.0.0.1/32"])).toBe(false);
  });
  it("IPv4 CIDR range", () => {
    expect(isIpAllowed("10.1.2.3", ["10.1.0.0/16"])).toBe(true);
    expect(isIpAllowed("10.2.0.1", ["10.1.0.0/16"])).toBe(false);
  });
  it("IPv6 exact + CIDR", () => {
    expect(isIpAllowed("::1", ["::1"])).toBe(true);
    expect(isIpAllowed("2001:db8::1", ["2001:db8::/32"])).toBe(true);
    expect(isIpAllowed("2001:db9::1", ["2001:db8::/32"])).toBe(false);
  });
  it("empty allowlist allows, malformed cidr throws", () => {
    expect(isIpAllowed("1.2.3.4", [])).toBe(true);
    expect(() => parseCidrOrThrow("not-a-cidr!!")).toThrow();
  });
});

describe("ssrf policy (§30)", () => {
  it("blocks localhost, loopback, private, metadata", async () => {
    await expect(validateOutboundUrl("http://localhost/hook")).rejects.toThrow();
    await expect(validateOutboundUrl("http://127.0.0.1/hook")).rejects.toThrow();
    await expect(validateOutboundUrl("http://10.0.0.5/hook")).rejects.toThrow();
    await expect(validateOutboundUrl("http://169.254.169.254/hook")).rejects.toThrow();
    await expect(validateOutboundUrl("http://metadata.google.internal/hook")).rejects.toThrow();
    await expect(validateOutboundUrl("ftp://8.8.8.8/hook")).rejects.toThrow();
  });
  it("allows public literal IP without DNS", async () => {
    await expect(validateOutboundUrl("https://8.8.8.8/hook")).resolves.toBeUndefined();
  });
  it("smtp privileged non-mail ports blocked", () => {
    expect(() => validateSmtpPort(22)).toThrow();
    expect(() => validateSmtpPort(25)).not.toThrow();
    expect(() => validateSmtpPort(587)).not.toThrow();
  });
});

describe("secrets (§19/§20)", () => {
  it("encrypt/decrypt round-trip, hmac verify, timing-safe compare", () => {
    const key = "a".repeat(64);
    expect(decrypt(encrypt("hello", key), key)).toBe("hello");
    expect(verifyHmacSha256("body", "sha256=" + nodeCrypto.createHmac("sha256", "s").update("body").digest("hex"), "s")).toBe(true);
    expect(verifyHmacSha256("body", "sha256=wrong", "s")).toBe(false);
    expect(timingSafeEqual(hashSecret("x"), hashSecret("x"))).toBe(true);
    expect(timingSafeEqual(hashSecret("x"), hashSecret("y"))).toBe(false);
  });
  it("redacts auth headers and nested credentials", () => {
    expect(redactHeaders({ authorization: "Bearer abc", "content-type": "application/json" })).toMatchObject({ authorization: "***" });
    const out = redactCredentials({ nested: { botToken: "secret", ok: 1 } }) as any;
    expect(out.nested.botToken).toBe("***");
    expect(out.nested.ok).toBe(1);
  });
  it("production requires APP_ENCRYPTION_KEY + distinct JWT_SECRET", () => {
    const base: any = { DATABASE_URL: "postgres://x/y", REDIS_URL: "redis://x", APP_ENV: "production", JWT_SECRET: "j".repeat(32) };
    expect(() => loadConfig({ ...base, APP_ENCRYPTION_KEY: "" })).toThrow();
    expect(() => loadConfig({ ...base, APP_ENCRYPTION_KEY: "b".repeat(64), JWT_SECRET: "" })).toThrow();
    expect(() => loadConfig({ ...base, APP_ENCRYPTION_KEY: "b".repeat(64), JWT_SECRET: "short" })).toThrow();
    expect(() => loadConfig({ ...base, APP_ENCRYPTION_KEY: "b".repeat(64), JWT_SECRET: "b".repeat(64) })).toThrow();
    expect(loadConfig({ ...base, APP_ENCRYPTION_KEY: "b".repeat(64) }).APP_ENV).toBe("production");
  });
});

describe("provider error mapping (§26)", () => {
  it("webhook 500 retryable, 400 permanent", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_u: unknown, _o: unknown) => new Response("err", { status: 500 })));
    const err = await webhookProvider.send({ message: { body: "hi" }, destination: { config: {} }, connection: { config: { url: "https://8.8.8.8/h" }, credentials: {} } }).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.retryable).toBe(true);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad", { status: 400 })));
    const err2 = await webhookProvider.send({ message: { body: "hi" }, destination: { config: {} }, connection: { config: { url: "https://8.8.8.8/h" }, credentials: {} } }).catch((e) => e);
    expect(err2.retryable).toBe(false);
    expect(err2.code).toBe("INVALID_DESTINATION");
  });
  it("discord 429 rate-limited retryable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("rl", { status: 429 })));
    const err = await discordProvider.send({ message: { body: "hi" }, destination: { config: {} }, connection: { config: {}, credentials: { webhookUrl: "https://8.8.8.8/d" } } }).catch((e) => e);
    expect(err.code).toBe("RATE_LIMITED");
    expect(err.retryable).toBe(true);
  });
});
