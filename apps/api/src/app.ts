import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { loadConfig, trustedProxyList, type AppConfig } from "./config.js";
import { checkDatabase } from "./db.js";
import { ApiError, errorBody } from "./errors.js";
import { enqueueM00Ping } from "./queue.js";
import { checkRedis } from "./redis.js";
import { authRoutes } from "./modules/auth/routes.js";
import { tenantRoutes } from "./modules/tenants/routes.js";
import { apiKeyRoutes } from "./modules/api-keys/routes.js";
import { providerRoutes } from "./modules/providers/routes.js";
import { destinationRoutes } from "./modules/destinations/routes.js";
import { messagingRoutes } from "./modules/messaging/routes.js";
import { webhookRoutes } from "./modules/webhooks/routes.js";
import { observabilityRoutes } from "./modules/observability/routes.js";

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

const RESERVED_PREFIXES = ["/health", "/ready", "/internal", "/api", "/hooks"];

export function resolveWebDist(config: AppConfig): string | null {
  if (config.WEB_DIST_DIR) {
    if (!existsSync(join(config.WEB_DIST_DIR, "index.html"))) {
      throw new Error(`Web dist not found at WEB_DIST_DIR=${config.WEB_DIST_DIR} (run yarn build first).`);
    }
    return config.WEB_DIST_DIR;
  }
  const candidate = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "web", "dist");
  return existsSync(join(candidate, "index.html")) ? candidate : null;
}

export async function buildApp(config: AppConfig = loadConfig()): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL, redact: { paths: REDACTED_PATHS, remove: true } },
    trustProxy: trustedProxyList(config),
    requestIdHeader: config.REQUEST_ID_HEADER,
    genReqId: () => newRequestId(),
    bodyLimit: 1_048_576,
  });

  app.addHook("onRequest", async (req, reply) => {
    reply.header(config.REQUEST_ID_HEADER, req.id);
  });

  app.setErrorHandler((err: FastifyError, req, reply) => {
    const requestId = String(req.id ?? "req_unknown");
    if (err instanceof ApiError) return reply.status(err.statusCode).send(errorBody(err.code, err.message, requestId));
    if ((err as unknown as { name?: string }).name === "ZodError") {
      const zerr = err as unknown as { issues: { message: string }[] };
      const msg = zerr.issues?.[0]?.message ?? "Validation failed.";
      return reply.status(422).send(errorBody("VALIDATION_ERROR", msg, requestId));
    }
    if (err.validation) return reply.status(422).send(errorBody("VALIDATION_ERROR", "Request validation failed.", requestId));
    if (err.statusCode === 413) return reply.status(413).send(errorBody("VALIDATION_ERROR", "Payload too large.", requestId));
    req.log.error({ err, request_id: requestId }, "unhandled error");
    return reply.status(500).send(errorBody("INTERNAL_ERROR", "Unexpected server error.", requestId));
  });

  // health
  app.get("/health", async () => ({ status: "ok", env: config.APP_ENV, time: new Date().toISOString() }));
  app.get("/ready", async (_req, reply) => {
    const checks: Record<string, string> = {};
    let ok = true;
    try { await checkDatabase(config); checks.database = "ok"; } catch (err) { ok = false; checks.database = err instanceof Error ? err.message : "unavailable"; }
    try { await checkRedis(config); checks.redis = "ok"; } catch (err) { ok = false; checks.redis = err instanceof Error ? err.message : "unavailable"; }
    checks.queue = checks.redis === "ok" ? "ok" : "blocked: redis unavailable";
    if (!ok) checks.queue = "blocked: redis unavailable";
    return reply.status(ok ? 200 : 503).send({ status: ok ? "ok" : "degraded", checks });
  });
  app.post("/internal/m00-ping", async (req, reply) => {
    try {
      await checkRedis(config);
      const { jobId } = await enqueueM00Ping(config);
      return reply.send({ data: { jobId, request_id: req.id } });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      req.log.error({ request_id: req.id }, `queue enqueue failed: ${reason}`);
      return reply.status(503).send(errorBody("INFRA_UNAVAILABLE", "Queue unavailable: Redis connection failed.", String(req.id)));
    }
  });

  // V1 API routes - tenant isolation via service layer, no global auth hook
  await authRoutes(app, config);
  await tenantRoutes(app, config);
  await apiKeyRoutes(app, config);
  await providerRoutes(app, config);
  await destinationRoutes(app, config);
  await messagingRoutes(app, config);
  await webhookRoutes(app, config);
  await observabilityRoutes(app, config);

  const webDist = resolveWebDist(config);
  app.setNotFoundHandler((req, reply) => {
    const requestId = String(req.id ?? "req_unknown");
    const path = req.url.split("?")[0];
    const reserved = RESERVED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
    const wantsHtml = (req.headers.accept ?? "").includes("text/html");
    if (webDist && !reserved && wantsHtml) return reply.sendFile("index.html");
    reply.status(404).send(errorBody("NOT_FOUND", "Resource not found.", requestId));
  });

  if (webDist) {
    await app.register(fastifyStatic, { root: webDist });
    app.log.info({ webDist }, "serving dashboard from backend (single port)");
  }

  return app;
}
