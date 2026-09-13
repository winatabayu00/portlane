import { describe, expect, it, afterEach } from "vitest";
import { validateSmtpPort } from "./lib/ssrf.js";
import { checkRateLimit } from "./lib/rateLimit.js";
import { Redis } from "ioredis";
import { closeRedis } from "./redis.js";

describe("hardening gaps", () => {
  afterEach(async () => { await closeRedis(); });

  it("blocks privileged non-mail SMTP ports, allows mail ports", () => {
    for (const p of [25, 465, 587, 2525, "2525"]) expect(() => validateSmtpPort(p)).not.toThrow();
    for (const p of [22, 80, 135, 110, 0, 99999, "abc", undefined]) expect(() => validateSmtpPort(p)).toThrow();
  });

  it("shares rate limit across instances via Redis, falls back to memory", async () => {
    const redis = new Redis("redis://localhost:6379", { maxRetriesPerRequest: 2 });
    const key = `test:${Date.now()}`;
    try {
      expect(await checkRateLimit(key, 2, 60_000, redis)).toBe(true);
      expect(await checkRateLimit(key, 2, 60_000, redis)).toBe(true);
      expect(await checkRateLimit(key, 2, 60_000, redis)).toBe(false);
      await redis.del(`rl:${key}`);
    } finally {
      redis.disconnect();
    }
    // redis down → memory fallback, same fail-open behavior as before
    const dead = new Redis("redis://127.0.0.1:1", { maxRetriesPerRequest: 1, connectTimeout: 500, retryStrategy: () => null });
    try {
      const k2 = `test:${Date.now()}:mem`;
      expect(await checkRateLimit(k2, 1, 60_000, dead)).toBe(true);
      expect(await checkRateLimit(k2, 1, 60_000, dead)).toBe(false);
    } finally {
      dead.disconnect();
    }
  });
});
