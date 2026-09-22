import type { RedisConnection } from "./redis-connection.js";

const buckets = new Map<string, { count: number; resetAt: number }>();

function checkMemory(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

// Redis fixed-window via INCR+PEXPIRE (shared across instances); falls back to
// in-memory map when Redis is unavailable. `strict` fails closed (deny) when
// Redis is configured but unreachable — for auth gates where abuse during a
// Redis outage is worse than a 503. Non-strict keeps fail-open for availability.
// ponytail: fixed window, not sliding; upgrade to Lua sliding window when abuse observed.
export async function checkRateLimit(key: string, limit: number, windowMs: number, redis?: RedisConnection | null, opts: { strict?: boolean } = {}): Promise<boolean> {
  if (redis) {
    try {
      const redisKey = `rl:${key}`;
      const count = await redis.incr(redisKey);
      if (count === 1) await redis.pexpire(redisKey, windowMs);
      return count <= limit;
    } catch {
      if (opts.strict) return false;
      // fall through to memory
    }
  }
  return checkMemory(key, limit, windowMs);
}
