import { Pool } from "pg";
import type { AppConfig } from "./config.js";

let pool: Pool | null = null;

export function dbPool(config: AppConfig): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: config.DATABASE_URL,
      connectionTimeoutMillis: 5_000,
    });
  }
  return pool;
}

// Never include credentials in messages/logs — pg errors may echo the host only.
export async function checkDatabase(config: AppConfig): Promise<"ok" | string> {
  try {
    const result = await dbPool(config).query("SELECT 1 AS ok");
    return result.rows[0]?.ok === 1 ? "ok" : "unexpected response";
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Database connection failed: ${reason}`);
  }
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
