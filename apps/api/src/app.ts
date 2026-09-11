import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { loadConfig, trustedProxyList, type AppConfig } from "./config.js";
import { checkDatabase } from "./db.js";
import { ApiError, errorBody } from "./errors.js";
import { enqueueM00Ping } from "./queue.js";
import { checkRedis } from "./redis.js";

const REDACTED_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers['x-api-key']",
  "*.password",
  "*.secret",
  "*.token",
  "*botToken*",
];

export function newRequestId(): string {
  return `req_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

export async function buildApp(config: AppConfig = loadConfig()): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      redact: { paths: REDACTED_PATHS, remove: true },
    },
    trustProxy: trustedProxyList(config),
    requestIdHeader: config.REQUEST_ID_HEADER,
    genReqId: () => newRequestId(),
  });

  app.addHook("onRequest", async (req, reply) => {
    // Prefer existing safe correlation header, else generated id.
    reply.header(config.REQUEST_ID_HEADER, req.id);
  });

  app.setErrorHandler((err: FastifyError, req, reply) => {
    const requestId = String(req.id ?? "req_unknown");
    if (err instanceof ApiError) {
      return reply.status(err.statusCode).send(errorBody(err.code, err.message, requestId));
    }
    if (err.validation) {
      return reply.status(422).send(errorBody("VALIDATION_ERROR", "Request validation failed.", requestId));
    }
    req.log.error({ err, request_id: requestId }, "unhandled error");
    return reply.status(500).send(errorBody("INTERNAL_ERROR", "Unexpected server error.", requestId));
  });

  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send(errorBody("NOT_FOUND", "Resource not found.", String(req.id ?? "req_unknown")));
  });

  app.get("/health", async () => ({
    status: "ok",
    env: config.APP_ENV,
    time: new Date().toISOString(),
  }));

  app.get("/ready", async (_req, reply) => {
    const checks: Record<string, string> = {};
    let ok = true;
    try {
      await checkDatabase(config);
      checks.database = "ok";
    } catch (err) {
      ok = false;
      checks.database = err instanceof Error ? err.message : "unavailable";
    }
    try {
      await checkRedis(config);
      checks.redis = "ok";
    } catch (err) {
      ok = false;
      checks.redis = err instanceof Error ? err.message : "unavailable";
    }
    checks.queue = checks.redis === "ok" ? "ok" : "blocked: redis unavailable";
    if (!ok) checks.queue = "blocked: redis unavailable";
    return reply.status(ok ? 200 : 503).send({ status: ok ? "ok" : "degraded", checks });
  });

  // M00 infra proof: enqueue a test job. No provider delivery.
  // Fast readiness gate first so a down Redis returns 503 immediately
  // instead of hanging inside queue client retries.
  app.post("/internal/m00-ping", async (req, reply) => {
    try {
      await checkRedis(config);
      const { jobId } = await enqueueM00Ping(config);
      return reply.send({ data: { jobId, request_id: req.id } });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      req.log.error({ request_id: req.id }, `queue enqueue failed: ${reason}`);
      return reply
        .status(503)
        .send(errorBody("INFRA_UNAVAILABLE", "Queue unavailable: Redis connection failed.", String(req.id)));
    }
  });

  return app;
}
