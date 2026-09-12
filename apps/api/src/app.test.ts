import { describe, expect, it, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp } from "./app.js";
import type { AppConfig } from "./config.js";
import { closeDb } from "./db.js";
import { closeRedis } from "./redis.js";

const testConfig: AppConfig = {
  APP_ENV: "test",
  APP_PORT: 3000,
  LOG_LEVEL: "error",
  REQUEST_ID_HEADER: "x-request-id",
  TRUSTED_PROXIES: "",
  DATABASE_URL: "postgres://localhost:5432/portlane_test",
  REDIS_URL: "redis://localhost:6379",
  APP_ENCRYPTION_KEY: "test-encryption-key-32chars-long!!",
  WEB_DIST_DIR: "",
  JWT_SECRET: "test-jwt-secret",
  JWT_EXPIRES_IN: "7d",
};

describe("app foundation", () => {
  afterEach(async () => {
    await closeDb();
    await closeRedis();
  });

  it("GET /health returns ok with request id", async () => {
    const app = await buildApp(testConfig);
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("ok");
    expect(res.headers["x-request-id"]).toMatch(/^req_/);
    await app.close();
  });

  it("unknown route returns tenant-safe 404 shape without internals", async () => {
    const app = await buildApp(testConfig);
    const res = await app.inject({ method: "GET", url: "/nope" });
    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body).toMatchObject({
      rc: 4002,
      status: "failed",
      message: "Resource not found.",
      correlationId: expect.any(String),
      timestamp: expect.any(String),
    });
    expect(body.errors).toMatchObject({ code: "NOT_FOUND", statusCode: 404 });
    expect(body.correlationId).toBe(body.errors.request_id);
    expect(body.error).toBeUndefined();
    expect(res.headers["x-correlation-id"]).toBe(body.correlationId);
    await app.close();
  });

  it("GET /ready degrades clearly without infra (no fake success)", async () => {
    const app = await buildApp({
      ...testConfig,
      DATABASE_URL: "postgres://127.0.0.1:1/nodb",
      REDIS_URL: "redis://127.0.0.1:1",
    });
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.status).toBe("degraded");
    expect(body.checks.database).toMatch(/Database connection failed/);
    expect(body.checks.redis).toMatch(/Redis connection failed/);
    await app.close();
  });

  it("POST /internal/m00-ping returns 503 (not 500) when queue is down", async () => {
    const app = await buildApp({
      ...testConfig,
      REDIS_URL: "redis://127.0.0.1:1",
    });
    const res = await app.inject({ method: "POST", url: "/internal/m00-ping" });
    expect(res.statusCode).toBe(503);
    expect(res.json().errors.code).toBe("INFRA_UNAVAILABLE");
    await app.close();
  });

  it("serves dashboard + SPA fallback from one port, API paths stay JSON 404", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pl-web-"));
    await writeFile(join(dir, "index.html"), "<html>spa-shell</html>");
    try {
      const app = await buildApp({ ...testConfig, WEB_DIST_DIR: dir });
      const root = await app.inject({ method: "GET", url: "/", headers: { accept: "text/html" } });
      expect(root.statusCode).toBe(200);
      expect(root.body).toContain("spa-shell");
      const spa = await app.inject({
        method: "GET",
        url: "/messages",
        headers: { accept: "text/html" },
      });
      expect(spa.statusCode).toBe(200);
      expect(spa.body).toContain("spa-shell");
      const api = await app.inject({ method: "GET", url: "/api/whatever" });
      expect(api.statusCode).toBe(404);
      expect(api.json().errors.code).toBe("NOT_FOUND");
      await app.close();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
