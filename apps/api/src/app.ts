import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { loadConfig, trustedProxyList, type AppConfig } from "./config.js";
import { checkDatabase } from "./db.js";
import { ApiError, errorBody } from "./errors.js";
import { failure, success } from "./common/api-response.js";
import { ResponseCode } from "./common/response-code.enum.js";
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
  // allow POST with empty body + application/json (e.g. /provider-connections/:id/test) → {} instead of 500
  app.addContentTypeParser("application/json", { parseAs: "string" }, ( _req, body, done) => {
    if (body === "" || body == null) return done(null, {});
    try { done(null, JSON.parse(body as string)); } catch (e) { done(e as Error, undefined); }
  });

  app.addHook("onRequest", async (req, reply) => {
    const cid = String(req.id);
    reply.header(config.REQUEST_ID_HEADER, cid);
    reply.header("x-correlation-id", cid);
    (req as any).correlationId = cid;
    (req as any)._startAt = Date.now();
    if (req.url !== "/health" && req.url !== "/ready") {
      // body preview truncated — never log secrets (redacted by logger)
      let preview = "";
      try {
        if (req.body && typeof req.body === "object" && Object.keys(req.body as object).length) {
          const s = JSON.stringify(req.body);
          preview = ` ${s.slice(0, 500)}${s.length > 500 ? "..." : ""}`;
        }
      } catch {}
      req.log.info({ correlationId: cid, method: req.method, path: req.url }, `▶ ${req.method} ${req.url}${preview}`);
    }
  });

  app.addHook("onResponse", async (req, reply) => {
    const cid = String(req.id);
    const dur = Date.now() - ((req as any)._startAt ?? Date.now());
    if (req.url !== "/health" && req.url !== "/ready") {
      req.log.info({ correlationId: cid, method: req.method, path: req.url, statusCode: reply.statusCode, duration: `${dur}ms` }, `◀ ${req.method} ${req.url} — ${reply.statusCode} — ${dur}ms`);
    }
  });

  app.setErrorHandler((err: FastifyError, req, reply) => {
    const correlationId = String(req.id ?? "req_unknown");
    const isDev = config.APP_ENV !== "production";
    const path = req.url;
    const method = req.method;
    const stackSlice = (e: Error) => e.stack?.split("\n").slice(0, 5).map((s) => s.trim());

    if (err instanceof ApiError) {
      const detail: Record<string, unknown> = {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
        path,
        method,
        ...(isDev && err.stack ? { stack: stackSlice(err) } : {}),
      };
      req.log.error({ err, correlationId, path, statusCode: err.statusCode }, err.message);
      return reply.status(err.statusCode).send(failure(err.rc, detail, correlationId, err.message));
    }
    if ((err as unknown as { name?: string }).name === "ZodError") {
      const zerr = err as unknown as { issues: { message: string }[] };
      const msg = zerr.issues?.[0]?.message ?? "Validation failed.";
      const detail = { code: "VALIDATION_ERROR", message: msg, statusCode: 422, path, method, ...(isDev && (err as Error).stack ? { stack: stackSlice(err as Error) } : {}) };
      return reply.status(422).send(failure(ResponseCode.VALIDATION_ERROR, detail, correlationId, msg));
    }
    if (err.validation) {
      const detail = { code: "VALIDATION_ERROR", message: "Request validation failed.", statusCode: 422, path, method };
      return reply.status(422).send(failure(ResponseCode.VALIDATION_ERROR, detail, correlationId));
    }
    if (err.statusCode === 413) {
      const detail = { code: "PAYLOAD_TOO_LARGE", message: "Payload too large.", statusCode: 413, path, method };
      return reply.status(413).send(failure(ResponseCode.PAYLOAD_TOO_LARGE, detail, correlationId));
    }
    if (err.statusCode === 400) {
      const raw = err.message ?? "Bad request.";
      const msg = raw.includes("Body cannot be empty") ? "Request body empty: send {} or omit Content-Type for this endpoint." : raw;
      const isMedia = (err as unknown as { code?: string }).code === "FST_ERR_CTP_INVALID_MEDIA_TYPE";
      const rc = isMedia ? ResponseCode.UNSUPPORTED_MEDIA_TYPE : ResponseCode.BAD_REQUEST;
      const code = isMedia ? "UNSUPPORTED_MEDIA_TYPE" : "BAD_REQUEST";
      const detail = { code, message: msg, statusCode: 400, path, method, ...(isDev && (err as Error).stack ? { stack: stackSlice(err as Error) } : {}) };
      return reply.status(400).send(failure(rc, detail, correlationId, msg));
    }
    // Security: production never leaks stack/filesystem paths to client; full err goes to server log only
    const detail: Record<string, unknown> = {
      code: "INTERNAL_ERROR",
      message: "Unexpected server error.",
      statusCode: 500,
      path,
      method,
      ...(isDev && (err as Error).stack ? { stack: stackSlice(err as Error) } : {}),
    };
    const agg = (err as unknown as { errors?: unknown }).errors;
    if (agg) req.log.error({ err, correlationId, aggregateErrors: agg }, "unhandled error");
    else req.log.error({ err, correlationId }, "unhandled error");
    return reply.status(500).send(failure(ResponseCode.INTERNAL_ERROR, detail, correlationId));
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
      return reply.send(success({ jobId, request_id: req.id }, String(req.id)));
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
