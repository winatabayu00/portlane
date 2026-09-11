import { z } from "zod";

// ponytail: zod is the single validation convention for API input (AGENTS §15).
const configSchema = z.object({
  APP_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  REQUEST_ID_HEADER: z.string().min(1).default("x-request-id"),
  // Empty = trust no proxy (never blindly trust X-Forwarded-For, AGENTS §16).
  TRUSTED_PROXIES: z.string().default(""),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (Postgres on minisever via Tailscale)"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required (Redis on minisever via Tailscale)"),
  APP_ENCRYPTION_KEY: z.string().default(""),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = configSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid configuration: ${details}`);
  }
  return parsed.data;
}

export function trustedProxyList(config: AppConfig): string[] | false {
  const list = config.TRUSTED_PROXIES.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list : false;
}
