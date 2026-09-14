import type { AppConfig } from "./config.js";
import { makeRedisConnection, type RedisConnection } from "./lib/redis-connection.js";

let redis: RedisConnection | null = null;

export function redisClient(config: AppConfig): RedisConnection {
  if (!redis) {
    redis = makeRedisConnection(config, { maxRetriesPerRequest: 2, connectTimeout: 5_000 });
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
