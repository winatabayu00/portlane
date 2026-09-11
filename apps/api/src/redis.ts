import { Redis } from "ioredis";
import type { AppConfig } from "./config.js";

let redis: Redis | null = null;

export function redisClient(config: AppConfig): Redis {
  if (!redis) {
    redis = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 2,
      connectTimeout: 5_000,
      lazyConnect: false,
    });
  }
  return redis;
}

export async function checkRedis(config: AppConfig): Promise<"ok"> {
  try {
    const pong = await redisClient(config).ping();
    if (pong !== "PONG") throw new Error(`unexpected response: ${pong}`);
    return "ok";
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Redis connection failed: ${reason}`);
  }
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    redis.disconnect();
    redis = null;
  }
}
