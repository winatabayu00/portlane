// Minimal SQL migration runner (no extra dep): applies apps/api/migrations/*.sql in order.
// Tracks versions in schema_migrations. Fails loudly with clear message when DB is unreachable.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

// ponytail: 40-line runner over a migration framework; upgrade when rollbacks/seed needed.
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "migrations");

// Load .env if present (dev convenience; real secrets stay out of git).
const envFile = join(root, "..", "..", ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Migration failed: DATABASE_URL is required (Postgres on minisever via Tailscale).");
  process.exit(1);
}

const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5_000 });
const client = await pool.connect().catch((err) => {
  console.error(`Migration failed: Database connection failed: ${err.message}`);
  process.exit(1);
});

try {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const applied = new Set(
    (await client.query("SELECT version FROM schema_migrations")).rows.map((r) => r.version),
  );
  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    if (applied.has(version)) {
      console.log(`skip ${version} (already applied)`);
      continue;
    }
    const sql = readFileSync(join(dir, file), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [version]);
      await client.query("COMMIT");
      console.log(`applied ${version}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }
  console.log("Migrations complete.");
} catch (err) {
  console.error(`Migration failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
