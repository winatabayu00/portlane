import { Cluster, Redis } from "ioredis";
import type { AppConfig } from "../config.js";

export type RedisConnection = Redis | Cluster;

export function clusterNodes(config: AppConfig): { host: string; port: number }[] {
  const raw = (config.REDIS_CLUSTER_URLS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return raw.map((u) => {
    try {
      const parsed = new URL(u.includes("://") ? u : `redis://${u}`);
      return { host: parsed.hostname, port: Number(parsed.port || 6379) };
    } catch {
      const [host, port] = u.split(":");
      return { host: host || u, port: Number(port || 6379) };
    }
  });
}

export interface RedisClientOptions {
  maxRetriesPerRequest?: number | null;
  connectTimeout?: number;
}

export function makeRedisConnection(config: AppConfig, opts: RedisClientOptions = {}): RedisConnection {
  const { maxRetriesPerRequest = null, connectTimeout = 5_000 } = opts;
  const nodes = clusterNodes(config);
  if (nodes.length > 0)
    return new Cluster(nodes, { redisOptions: { maxRetriesPerRequest, connectTimeout } });
  return new Redis(config.REDIS_URL, { maxRetriesPerRequest, connectTimeout });
}
