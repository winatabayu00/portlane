import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ProviderError } from "../providers/core/types.js";
import { MAX_ATTEMPTS, RETRY_DELAYS_MS, getRetryDelay, isRetryableError } from "./worker.js";

describe("delivery retry policy (§26, central — not per-provider)", () => {
  it("backoff schedule is fixed and exported as contract", () => {
    expect(RETRY_DELAYS_MS).toEqual([0, 5_000, 30_000, 120_000, 600_000]);
    expect(MAX_ATTEMPTS).toBe(5);
  });

  it("QUEUED → PROCESSING → DELIVERED path uses attempt 0 edge, retries back off", () => {
    expect(getRetryDelay(0)).toBe(0);
    expect(getRetryDelay(1)).toBe(5_000);
    expect(getRetryDelay(2)).toBe(30_000);
    expect(getRetryDelay(3)).toBe(120_000);
    expect(getRetryDelay(4)).toBe(600_000);
  });

  it("retry exhaustion → DEAD: delay null at and beyond max attempts", () => {
    expect(getRetryDelay(5)).toBeNull();
    expect(getRetryDelay(99)).toBeNull();
  });

  it("ProviderError classification is honored (providers classify, core decides)", () => {
    expect(isRetryableError(new ProviderError("RATE_LIMITED", "slow down", true, 429))).toBe(true);
    expect(isRetryableError(new ProviderError("PROVIDER_ERROR", "boom", true, 500))).toBe(true);
    expect(isRetryableError(new ProviderError("INVALID_DESTINATION", "bad chat", false, 400))).toBe(false);
    expect(isRetryableError(new ProviderError("INVALID_CREDENTIALS", "bad token", false, 401))).toBe(false);
  });

  it("non-ProviderError heuristic: timeout/429/5xx/conn errors retryable, else permanent", () => {
    expect(isRetryableError(new Error("connection timeout"))).toBe(true);
    expect(isRetryableError(new Error("Discord 429"))).toBe(true);
    expect(isRetryableError(new Error("webhook 503: unavailable"))).toBe(true);
    expect(isRetryableError(new Error("ECONNREFUSED 127.0.0.1"))).toBe(true);
    expect(isRetryableError(new Error("ETIMEDOUT"))).toBe(true);
    expect(isRetryableError(new Error("invalid destination chat"))).toBe(false);
    expect(isRetryableError(new Error("auth rejected"))).toBe(false);
    expect(isRetryableError("timeout")).toBe(true);
  });
});

describe("delivery attempt history (§25/§27)", () => {
  it("migration 006 enforces attempt uniqueness per delivery (duplicate workers fail loud)", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const file = join(dir, "..", "..", "..", "migrations", "006_attempt_unique.sql");
    expect(existsSync(file)).toBe(true);
    const sql = readFileSync(file, "utf8");
    expect(sql).toMatch(/uq_attempts_delivery_number/);
    expect(sql).toMatch(/UNIQUE/i);
    expect(sql).toMatch(/delivery_attempts/);
  });
});
