import { describe, expect, it, afterEach } from "vitest";
import { buildApp } from "./app.js";
import { loadConfig, type AppConfig } from "./config.js";
import { setSessionCookie } from "./modules/auth/routes.js";
import { dbPool, closeDb } from "./db.js";
import { closeRedis } from "./redis.js";

// Live-DB session cookie tests (§19/§20). Gated on DATABASE_URL so the
// default suite stays green without infra; run with dev DB to execute:
//   DATABASE_URL=postgresql://... yarn workspace @portlane/api test
const hasDb = !!process.env.DATABASE_URL;

function testConfig(): AppConfig {
  return {
    APP_ENV: "test",
    APP_PORT: 3000,
    LOG_LEVEL: "error",
    REQUEST_ID_HEADER: "x-request-id",
    TRUSTED_PROXIES: "",
    DATABASE_URL: process.env.DATABASE_URL as string,
    REDIS_URL: process.env.REDIS_URL ?? "redis://127.0.0.1:1",
    APP_ENCRYPTION_KEY: "test-encryption-key-32chars-long!!",
    WEB_DIST_DIR: "",
    COOKIE_SECURE: false,
    JWT_SECRET: "test-jwt-secret",
    JWT_EXPIRES_IN: "7d",
    WORKER_CONCURRENCY: 5,
    DB_POOL_MAX: 10,
    REDIS_CLUSTER_URLS: "",
    RETENTION_ENABLED: false,
    RETENTION_DAYS: 90,
    PORTLANE_PUBLIC_BASE_URL: "",
    TELEGRAM_WEBHOOK_AUTOSYNC: true,
  };
}

describe("session cookie Secure flag (no DB)", () => {
  const base = {
    DATABASE_URL: "postgres://localhost:5432/portlane_test",
    REDIS_URL: "redis://localhost:6379",
    APP_ENCRYPTION_KEY: "test-encryption-key-32chars-long!!",
    JWT_SECRET: "test-jwt-secret-32chars-long!!!!!",
    JWT_EXPIRES_IN: "7d",
  };
  function headerFor(secure: boolean): string {
    let captured = "";
    setSessionCookie({ header: (_k: string, v: string) => { captured = v; } }, "tok123", {
      COOKIE_SECURE: secure,
      JWT_EXPIRES_IN: "7d",
    } as AppConfig);
    return captured;
  }

  it("auto: Secure in production, not in development/test", () => {
    expect(loadConfig({ ...base, APP_ENV: "production" }).COOKIE_SECURE).toBe(true);
    expect(loadConfig({ ...base, APP_ENV: "development" }).COOKIE_SECURE).toBe(false);
    expect(loadConfig({ ...base, APP_ENV: "test" }).COOKIE_SECURE).toBe(false);
  });

  it("explicit override wins over auto", () => {
    expect(loadConfig({ ...base, APP_ENV: "production", COOKIE_SECURE: "false" }).COOKIE_SECURE).toBe(false);
    expect(loadConfig({ ...base, APP_ENV: "development", COOKIE_SECURE: "true" }).COOKIE_SECURE).toBe(true);
  });

  it("invalid value throws loudly", () => {
    expect(() => loadConfig({ ...base, APP_ENV: "production", COOKIE_SECURE: "maybe" })).toThrow(/COOKIE_SECURE/);
  });

  it("Set-Cookie carries Secure only when enabled (HttpOnly + SameSite kept)", () => {
    const off = headerFor(false);
    expect(off).toMatch(/HttpOnly/);
    expect(off).toMatch(/SameSite=Lax/);
    expect(off).not.toMatch(/Secure/);
    expect(headerFor(true)).toMatch(/Secure/);
  });
});

describe.skipIf(!hasDb)("session cookie auth (live DB)", () => {
  afterEach(async () => {
    await closeDb();
    await closeRedis();
  });

  it("register sets HttpOnly session cookie; cookie alone authenticates; logout clears", async () => {
    const app = await buildApp(testConfig());
    const email = `e2e-cookie-${Date.now()}@example.com`;
    try {
      const reg = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: { name: "Cookie User", email, password: "secret123" },
      });
      expect(reg.statusCode).toBe(200);
      const setCookie = reg.headers["set-cookie"] as unknown as string;
      expect(setCookie).toMatch(/pl_token=[^;]+/);
      expect(setCookie).toMatch(/HttpOnly/);
      expect(setCookie).toMatch(/SameSite=Lax/);
      expect(setCookie).toMatch(/Max-Age=604800/);
      expect(setCookie).not.toMatch(/Secure/); // test env: no Secure flag
      const cookie = String(setCookie).split(";")[0];

      // Authorization header intentionally omitted: cookie must suffice.
      const me = await app.inject({ method: "GET", url: "/api/v1/auth/me", headers: { cookie } });
      expect(me.statusCode).toBe(200);
      expect(me.json().data.user.email).toBe(email);
      const tenantId = me.json().data.tenants[0].id as string;

      const anon = await app.inject({ method: "GET", url: "/api/v1/auth/me" });
      expect(anon.statusCode).toBe(401);

      const out = await app.inject({ method: "POST", url: "/api/v1/auth/logout", headers: { cookie } });
      expect(out.statusCode).toBe(200);
      expect(String(out.headers["set-cookie"])).toMatch(/pl_token=;\s*.*Max-Age=0/);

      // cleanup: tenant cascade removes memberships, keys, providers,
      // destinations, messages, deliveries, webhooks, inbound logs.
      const pool = dbPool(testConfig());
      const userId = me.json().data.user.id as string;
      await pool.query("DELETE FROM audit_logs WHERE tenant_id=$1 OR actor_id=$2", [tenantId, userId]);
      await pool.query("DELETE FROM tenants WHERE id=$1", [tenantId]);
      await pool.query("DELETE FROM users WHERE id=$1", [userId]);
    } finally {
      await app.close();
    }
  });
});
