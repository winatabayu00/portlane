import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { clusterNodes } from "./lib/redis-connection.js";
import {
  RETENTION_TABLES,
  isRetentionEnabled,
  retentionDeleteSql,
  runRetentionCleanup,
  type RetentionTable,
} from "./lib/retention.js";

const base = {
  DATABASE_URL: "postgres://x",
  REDIS_URL: "redis://x",
};

describe("M12 throughput config", () => {
  it("defaults preserve V1 behavior (concurrency 5, pool 10, retention off)", () => {
    const c = loadConfig({ ...base } as NodeJS.ProcessEnv);
    expect(c.WORKER_CONCURRENCY).toBe(5);
    expect(c.DB_POOL_MAX).toBe(10);
    expect(c.REDIS_CLUSTER_URLS).toBe("");
    expect(c.RETENTION_ENABLED).toBe(false);
    expect(c.RETENTION_DAYS).toBe(90);
  });

  it("parses explicit overrides", () => {
    const c = loadConfig({
      ...base,
      WORKER_CONCURRENCY: "20",
      DB_POOL_MAX: "30",
      REDIS_CLUSTER_URLS: "h1:6379,h2:6379",
      RETENTION_ENABLED: "true",
      RETENTION_DAYS: "30",
    } as NodeJS.ProcessEnv);
    expect(c.WORKER_CONCURRENCY).toBe(20);
    expect(c.DB_POOL_MAX).toBe(30);
    expect(c.RETENTION_ENABLED).toBe(true);
    expect(c.RETENTION_DAYS).toBe(30);
  });

  it("rejects out-of-range concurrency and bad retention flag loudly", () => {
    expect(() => loadConfig({ ...base, WORKER_CONCURRENCY: "0" } as NodeJS.ProcessEnv)).toThrow();
    expect(() => loadConfig({ ...base, WORKER_CONCURRENCY: "101" } as NodeJS.ProcessEnv)).toThrow();
    expect(() => loadConfig({ ...base, RETENTION_ENABLED: "maybe" } as NodeJS.ProcessEnv)).toThrow(/RETENTION_ENABLED/);
  });
});

describe("M12 redis cluster factory", () => {
  it("single mode by default (no cluster urls)", () => {
    const c = loadConfig({ ...base } as NodeJS.ProcessEnv);
    expect(clusterNodes(c)).toEqual([]);
  });

  it("parses comma-separated cluster nodes with and without scheme", () => {
    const c = loadConfig({ ...base, REDIS_CLUSTER_URLS: "redis://h1:7000, h2:7001" } as NodeJS.ProcessEnv);
    expect(clusterNodes(c)).toEqual([
      { host: "h1", port: 7000 },
      { host: "h2", port: 7001 },
    ]);
  });
});

describe("M12 retention safety (opt-in, never core history)", () => {
  it("purges only verbose tables — messages/deliveries/events untouched", () => {
    expect([...RETENTION_TABLES].sort()).toEqual(
      ["delivery_attempts", "inbound_logs", "webhook_forward_attempts"].sort(),
    );
    for (const t of ["messages", "deliveries", "webhook_events", "audit_logs", "tenants"]) {
      expect(RETENTION_TABLES).not.toContain(t);
    }
  });

  it("delete SQL is parameterized with cutoff + batch limit (no TRUNCATE/DROP)", () => {
    for (const t of RETENTION_TABLES) {
      const sql = retentionDeleteSql(t as RetentionTable);
      expect(sql).toContain(`DELETE FROM ${t}`);
      expect(sql).toContain("created_at < NOW()");
      expect(sql).toContain("$1");
      expect(sql).toMatch(/LIMIT 1000/);
      expect(sql).not.toMatch(/TRUNCATE|DROP TABLE|DELETE FROM \w+;?\s*$/);
    }
  });

  it("disabled retention never touches the database", async () => {
    const c = loadConfig({ ...base } as NodeJS.ProcessEnv);
    expect(isRetentionEnabled(c)).toBe(false);
    let calls = 0;
    const pool = { query: async () => { calls++; return { rowCount: 0 }; } } as never;
    const res = await runRetentionCleanup(pool, c);
    expect(res.enabled).toBe(false);
    expect(calls).toBe(0);
  });

  it("enabled retention batches per table with days param", async () => {
    const c = loadConfig({ ...base, RETENTION_ENABLED: "true", RETENTION_DAYS: "30" } as NodeJS.ProcessEnv);
    const seen: { sql: string; params: unknown[] }[] = [];
    const pool = {
      query: async (sql: string, params: unknown[]) => {
        seen.push({ sql, params });
        return { rowCount: 0 };
      },
    } as never;
    const res = await runRetentionCleanup(pool, c);
    expect(res.enabled).toBe(true);
    expect(res.days).toBe(30);
    expect(seen.length).toBe(RETENTION_TABLES.length);
    for (const s of seen) expect(s.params).toEqual(["30"]);
  });

  it("migration 007 adds retention/latency indexes (idempotent)", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const file = join(dir, "..", "migrations", "007_retention_indexes.sql");
    expect(existsSync(file)).toBe(true);
    const sql = readFileSync(file, "utf8");
    for (const idx of [
      "idx_attempts_tenant_created",
      "idx_attempts_created",
      "idx_forward_attempts_created",
      "idx_audit_created",
    ]) {
      expect(sql).toContain(idx);
    }
    expect(sql).toMatch(/IF NOT EXISTS/);
  });
});
