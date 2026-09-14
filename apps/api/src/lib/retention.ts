import type { Pool } from "pg";
import type { AppConfig } from "../config.js";

// M12 retention (opt-in, AGENTS 44/69): purge only operational/verbose tables,
// never core history (messages/deliveries/webhook_events/provider_connections).
// Disabled by default (RETENTION_ENABLED=false) — no silent data loss (§61).
export const RETENTION_TABLES = [
  "delivery_attempts",
  "webhook_forward_attempts",
  "inbound_logs",
] as const;

export type RetentionTable = (typeof RETENTION_TABLES)[number];

const BATCH_LIMIT = 1000;

export function retentionCutoffDays(config: AppConfig): number {
  return config.RETENTION_DAYS;
}

export function isRetentionEnabled(config: AppConfig): boolean {
  return config.RETENTION_ENABLED === true;
}

// Batched delete by ctid to avoid long locks on high-volume tables.
// created_at cutoff is parameterized — never interpolated.
export function retentionDeleteSql(table: RetentionTable): string {
  return `DELETE FROM ${table} WHERE ctid IN (
    SELECT ctid FROM ${table} WHERE created_at < NOW() - ($1 || ' days')::interval LIMIT ${BATCH_LIMIT}
  )`;
}

export async function runRetentionCleanup(
  pool: Pool,
  config: AppConfig,
): Promise<{ enabled: boolean; days: number; deleted: Partial<Record<RetentionTable, number>> }> {
  const days = retentionCutoffDays(config);
  if (!isRetentionEnabled(config)) return { enabled: false, days, deleted: {} };
  const deleted: Partial<Record<RetentionTable, number>> = {};
  for (const table of RETENTION_TABLES) {
    let total = 0;
    for (;;) {
      const r = await pool.query(retentionDeleteSql(table), [String(days)]);
      const n = r.rowCount ?? 0;
      total += n;
      if (n < BATCH_LIMIT) break;
    }
    deleted[table] = total;
  }
  return { enabled: true, days, deleted };
}
