import { z } from "zod";

const configSchema = z.object({
  APP_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_PORT: z.coerce.number().int().positive().default(4002),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  REQUEST_ID_HEADER: z.string().min(1).default("x-request-id"),
  TRUSTED_PROXIES: z.string().default(""),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (Postgres on minisever via Tailscale)"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required (Redis on minisever via Tailscale)"),
  APP_ENCRYPTION_KEY: z.string().default(""),
  WEB_DIST_DIR: z.string().default(""),
  JWT_SECRET: z.string().default(""),
  JWT_EXPIRES_IN: z.string().default("7d"),
});

export type AppConfig = z.infer<typeof configSchema>;

function buildDatabaseUrlFromDbVars(env: NodeJS.ProcessEnv): string | undefined {
  const host = (env.DB_HOST as string) || "";
  if (!host) return undefined;
  const user = (env.DB_USERNAME as string) || (env.DB_USER as string) || "postgres";
  const pass = (env.DB_PASSWORD as string) || "";
  const port = (env.DB_PORT as string) || "5432";
  const db = (env.DB_DATABASE as string) || (env.DB_NAME as string) || "portlane";
  if (db === "ai_engineering_os") {
    throw new Error("DB_DATABASE must not be ai_engineering_os — Portlane uses isolated DB 'portlane'");
  }
  const encUser = encodeURIComponent(user);
  if (pass) return `postgresql://${encUser}:${encodeURIComponent(pass)}@${host}:${port}/${db}`;
  return `postgresql://${encUser}@${host}:${port}/${db}`;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  // Allow DB_* vars as fallback builder for DATABASE_URL (JANGAN pakai DB yang sama dengan app lain)
  const e = { ...env } as NodeJS.ProcessEnv & Record<string, string | undefined>;
  if (!e.DATABASE_URL) {
    const built = buildDatabaseUrlFromDbVars(e);
    if (built) e.DATABASE_URL = built;
  }
  // Default API port 4002 (UI di 3002)
  if (!e.APP_PORT) e.APP_PORT = "4002";
  const parsed = configSchema.safeParse(e);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid configuration: ${details}`);
  }
  const cfg = parsed.data;
  if (cfg.DATABASE_URL.includes("/ai_engineering_os")) {
    throw new Error("DATABASE_URL must not point to ai_engineering_os — use isolated DB 'portlane' (e.g. .../portlane)");
  }
  if (!cfg.JWT_SECRET) cfg.JWT_SECRET = cfg.APP_ENCRYPTION_KEY || "dev-jwt-secret-change-me";
  return cfg;
}

export function trustedProxyList(config: AppConfig): string[] | false {
  const list = config.TRUSTED_PROXIES.split(",").map((s) => s.trim()).filter(Boolean);
  return list.length > 0 ? list : false;
}

export function requireEncryptionKey(config: AppConfig): string {
  const k = config.APP_ENCRYPTION_KEY;
  if (!k || k.length < 16) throw new Error("APP_ENCRYPTION_KEY required (32 hex chars, openssl rand -hex 32)");
  return k;
}
