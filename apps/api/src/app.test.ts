import { describe, expect, it, afterEach } from "vitest";
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
  APP_ENCRYPTION_KEY: "",
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
    expect(res.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Resource not found.", request_id: expect.any(String) },
    });
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
    expect(res.json().error.code).toBe("INFRA_UNAVAILABLE");
    await app.close();
  });
});
