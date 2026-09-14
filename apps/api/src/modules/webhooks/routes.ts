import type { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "node:crypto";
import { dbPool } from "../../db.js";
import { id } from "../../lib/ids.js";
import { requireJwtUser, requireTenantMember } from "../auth/routes.js";
import { checkRateLimit } from "../../lib/rateLimit.js";
import { redisClient } from "../../redis.js";
import { isIpAllowed, parseCidrOrThrow } from "../../lib/ip.js";
import { redactCredentials, redactHeaders } from "../../lib/mask.js";
import { readCapped, validateOutboundUrl } from "../../lib/ssrf.js";
import { enqueueForward } from "./forward.js";
import type { AppConfig } from "../../config.js";
import { errorBody } from "../../errors.js";
import { success } from "../../common/api-response.js";
import { ResponseCode } from "../../common/response-code.enum.js";
import { hashSecret, encrypt, decrypt, verifyHmacSha256, timingSafeEqual } from "../../lib/crypto.js";

function genPublicId(): string { return "wh_" + crypto.randomBytes(12).toString("hex"); }

// Verifikasi secret plaintext inbound (timing-safe via hash compare).
// Menerima transport legacy `x-webhook-secret` maupun Telegram
// `x-telegram-bot-api-secret-token` — keduanya dibandingkan ke secret
// endpoint yang sama, jadi 1 URL publik tetap multi-project: Portlane
// teruskan raw update apa adanya, routing per project di downstream.
// Cabang hmac_sha256 tidak tersentuh (ditangani terpisah di handleHook).
export function verifyPlaintextWebhookSecret(secretHash: string | null, headers: Record<string, unknown>): boolean {
  if (!secretHash) return false;
  const raw = headers["x-webhook-secret"] ?? headers["x-telegram-bot-api-secret-token"] ?? "";
  const provided = Array.isArray(raw) ? String(raw[0] ?? "") : String(raw ?? "");
  if (!provided) return false;
  return timingSafeEqual(hashSecret(provided), secretHash);
}

export async function webhookRoutes(app: FastifyInstance, config: AppConfig) {
  const pool = dbPool(config);

  // Management CRUD - tenant scoped via JWT
  app.get("/api/v1/tenants/:tenantId/webhook-endpoints", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const r = await pool.query("SELECT id,tenant_id,name,public_identifier,signature_mode,status,forwarding_config_json,created_at,updated_at FROM webhook_endpoints WHERE tenant_id=$1 ORDER BY created_at DESC", [tenantId]);
    return reply.send(success(r.rows, String(req.id)));
  });

  app.post("/api/v1/tenants/:tenantId/webhook-endpoints", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const body = z.object({ name: z.string().min(1), signature_mode: z.enum(["none","hmac_sha256"]).default("none"), secret: z.string().optional(), forwarding_url: z.string().optional(), forwarding_config: z.record(z.unknown()).optional() }).parse(req.body);
    const wid = id("whe");
    const pub = genPublicId();
    let secretHash: string | null = null; let encSecret: string | null = null;
    if (body.secret) { secretHash = hashSecret(body.secret); encSecret = encrypt(body.secret, config.APP_ENCRYPTION_KEY || config.JWT_SECRET); }
    const fwd: Record<string, unknown> = body.forwarding_config ?? {};
    if (body.forwarding_url) {
      try { await validateOutboundUrl(body.forwarding_url); } catch (e: unknown) { return reply.status(422).send(errorBody("VALIDATION_ERROR", `Forwarding URL blocked by SSRF policy: ${String((e as Error).message)}`, String(req.id))); }
      fwd.url = body.forwarding_url;
    }
    await pool.query("INSERT INTO webhook_endpoints (id,tenant_id,name,public_identifier,secret_hash,encrypted_secret,signature_mode,forwarding_config_json) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [wid, tenantId, body.name, pub, secretHash, encSecret, body.signature_mode, JSON.stringify(fwd)]);
    await pool.query("INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("aud"), tenantId, "user", user.userId, "webhook_endpoint.created", "webhook_endpoint", wid]);
    const row = (await pool.query("SELECT id,tenant_id,name,public_identifier,signature_mode,status,forwarding_config_json,created_at FROM webhook_endpoints WHERE id=$1 AND tenant_id=$2", [wid, tenantId])).rows[0];
    return reply.status(201).send(success({ ...row, secret: body.secret ? "***" : undefined, _oneTimeSecret: body.secret ?? undefined }, String(req.id), ResponseCode.CREATED));
  });

  app.patch("/api/v1/tenants/:tenantId/webhook-endpoints/:endpointId", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId, endpointId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const body = z.object({ name: z.string().optional(), status: z.enum(["active","disabled"]).optional(), signature_mode: z.enum(["none","hmac_sha256"]).optional(), secret: z.string().optional(), forwarding_url: z.string().nullable().optional() }).parse(req.body);
    const cur = await pool.query("SELECT * FROM webhook_endpoints WHERE id=$1 AND tenant_id=$2", [endpointId, tenantId]);
    if (!cur.rows.length) return reply.status(404).send(errorBody("NOT_FOUND","Webhook endpoint not found.",String(req.id)));
    const updates: string[] = []; const vals: unknown[] = []; let idx=1;
    if (body.name) { updates.push(`name=$${idx++}`); vals.push(body.name); }
    if (body.status) { updates.push(`status=$${idx++}`); vals.push(body.status); }
    if (body.signature_mode) { updates.push(`signature_mode=$${idx++}`); vals.push(body.signature_mode); }
    if (body.secret) { updates.push(`secret_hash=$${idx++}`); vals.push(hashSecret(body.secret)); updates.push(`encrypted_secret=$${idx++}`); vals.push(encrypt(body.secret, config.APP_ENCRYPTION_KEY || config.JWT_SECRET)); }
    if (body.forwarding_url !== undefined) {
      const fwd = (cur.rows[0].forwarding_config_json as Record<string, unknown>) ?? {};
      if (body.forwarding_url) {
        try { await validateOutboundUrl(body.forwarding_url); } catch (e: unknown) { return reply.status(422).send(errorBody("VALIDATION_ERROR", `Forwarding URL blocked by SSRF policy: ${String((e as Error).message)}`, String(req.id))); }
        fwd.url = body.forwarding_url;
      } else delete fwd.url;
      updates.push(`forwarding_config_json=$${idx++}`); vals.push(JSON.stringify(fwd));
    }
    if (!updates.length) return reply.status(422).send(errorBody("VALIDATION_ERROR","No fields.",String(req.id)));
    updates.push("updated_at=NOW()");
    vals.push(endpointId, tenantId);
    await pool.query(`UPDATE webhook_endpoints SET ${updates.join(",")} WHERE id=$${idx++} AND tenant_id=$${idx++}`, vals);
    if (body.secret) await pool.query("INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("aud"), tenantId, "user", user.userId, "webhook_endpoint.secret_rotated", "webhook_endpoint", endpointId]);
    if (body.status || body.name || body.signature_mode || body.forwarding_url !== undefined) await pool.query("INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("aud"), tenantId, "user", user.userId, "webhook_endpoint.updated", "webhook_endpoint", endpointId]);
    const row = (await pool.query("SELECT id,tenant_id,name,public_identifier,signature_mode,status,forwarding_config_json,created_at,updated_at FROM webhook_endpoints WHERE id=$1 AND tenant_id=$2", [endpointId, tenantId])).rows[0];
    return reply.send(success(row, String(req.id)));
  });

  app.delete("/api/v1/tenants/:tenantId/webhook-endpoints/:endpointId", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId, endpointId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    await pool.query("DELETE FROM webhook_endpoints WHERE id=$1 AND tenant_id=$2", [endpointId, tenantId]);
    await pool.query("INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("aud"), tenantId, "user", user.userId, "webhook_endpoint.deleted", "webhook_endpoint", endpointId]);
    return reply.status(204).send();
  });

  app.get("/api/v1/tenants/:tenantId/webhook-endpoints/:endpointId/ip-allowlist", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId, endpointId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const r = await pool.query("SELECT * FROM ip_allowlist_entries WHERE tenant_id=$1 AND scope_type='WEBHOOK_ENDPOINT' AND scope_id=$2", [tenantId, endpointId]);
    return reply.send(success(r.rows, String(req.id)));
  });

  app.post("/api/v1/tenants/:tenantId/webhook-endpoints/:endpointId/ip-allowlist", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId, endpointId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const body = z.object({ cidr: z.string().min(1), description: z.string().optional() }).parse(req.body);
    const cidr = parseCidrOrThrow(body.cidr);
    const entryId = id("ip");
    await pool.query("INSERT INTO ip_allowlist_entries (id,tenant_id,scope_type,scope_id,cidr,description) VALUES ($1,$2,$3,$4,$5,$6)", [entryId, tenantId, "WEBHOOK_ENDPOINT", endpointId, cidr, body.description ?? null]);
    await pool.query("INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id,metadata_json) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [id("aud"), tenantId, "user", user.userId, "webhook_endpoint.ip_allowlist_added", "webhook_endpoint", endpointId, JSON.stringify({ cidr })]);
    const row = (await pool.query("SELECT * FROM ip_allowlist_entries WHERE id=$1 AND tenant_id=$2 AND scope_id=$3", [entryId, tenantId, endpointId])).rows[0];
    return reply.status(201).send(success(row, String(req.id), ResponseCode.CREATED));
  });

  app.delete("/api/v1/tenants/:tenantId/webhook-endpoints/:endpointId/ip-allowlist/:entryId", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId, endpointId, entryId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    await pool.query("DELETE FROM ip_allowlist_entries WHERE id=$1 AND tenant_id=$2 AND scope_id=$3", [entryId, tenantId, endpointId]);
    await pool.query("INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("aud"), tenantId, "user", user.userId, "webhook_endpoint.ip_allowlist_removed", "webhook_endpoint", endpointId]);
    return reply.status(204).send();
  });

  app.get("/api/v1/tenants/:tenantId/webhook-events", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const q = req.query as Record<string, string>; const page = parseInt(q.page ?? "1",10)||1; const per=Math.min(100, parseInt(q.per_page??"25",10)||25);
    const total = (await pool.query("SELECT COUNT(*) FROM webhook_events WHERE tenant_id=$1", [tenantId])).rows[0].count;
    const rows = await pool.query("SELECT id,tenant_id,webhook_endpoint_id,request_id,source_ip,method,safe_headers_json,status,received_at,processed_at,created_at FROM webhook_events WHERE tenant_id=$1 ORDER BY received_at DESC LIMIT $2 OFFSET $3", [tenantId, per, (page-1)*per]);
    return reply.send(success(rows.rows, String(req.id), ResponseCode.OK, undefined, { page, per_page: per, total: parseInt(total,10) }));
  });

  app.get("/api/v1/tenants/:tenantId/webhook-events/:eventId", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId, eventId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const r = await pool.query("SELECT * FROM webhook_events WHERE id=$1 AND tenant_id=$2", [eventId, tenantId]);
    if (!r.rows.length) return reply.status(404).send(errorBody("NOT_FOUND","Webhook event not found.",String(req.id)));
    const attempts = await pool.query("SELECT * FROM webhook_forward_attempts WHERE webhook_event_id=$1 ORDER BY attempt_number", [eventId]);
    const event = { ...r.rows[0], payload_json: redactCredentials(r.rows[0].payload_json), safe_headers_json: redactHeaders(r.rows[0].safe_headers_json ?? {}) };
    return reply.send(success({ event, attempts: attempts.rows }, String(req.id)));
  });

  app.post("/api/v1/tenants/:tenantId/webhook-events/:eventId/retry", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId, eventId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const ev = await pool.query("SELECT * FROM webhook_events WHERE id=$1 AND tenant_id=$2", [eventId, tenantId]);
    if (!ev.rows.length) return reply.status(404).send(errorBody("NOT_FOUND","Webhook event not found.",String(req.id)));
    const endpoint = await pool.query("SELECT * FROM webhook_endpoints WHERE id=$1 AND tenant_id=$2", [ev.rows[0].webhook_endpoint_id, tenantId]);
    if (!endpoint.rows.length) return reply.status(404).send(errorBody("NOT_FOUND","Endpoint not found.",String(req.id)));
    const fwd = endpoint.rows[0].forwarding_config_json as Record<string, unknown>;
    if (!fwd.url) return reply.status(422).send(errorBody("VALIDATION_ERROR","No forwarding url.",String(req.id)));
    try { await validateOutboundUrl(String(fwd.url)); } catch (e: unknown) { return reply.status(422).send(errorBody("VALIDATION_ERROR", `Forwarding URL blocked by SSRF policy: ${String((e as Error).message)}`, String(req.id))); }
    try {
      const bodyRaw = JSON.stringify(ev.rows[0].payload_json ?? {});
      const headers: Record<string,string> = { "content-type":"application/json", "x-portlane-event-id": eventId, "x-portlane-request-id": String(req.id) };
      const extra = (fwd as any).headers as Record<string,string>|undefined;
      if (extra && typeof extra === "object") for (const [k,v] of Object.entries(extra)) if (typeof v==="string" && /^[a-z0-9-]+$/i.test(k)) headers[k.toLowerCase()] = v;
      if (endpoint.rows[0].encrypted_secret) { try { const s = decrypt(endpoint.rows[0].encrypted_secret, config.APP_ENCRYPTION_KEY || config.JWT_SECRET); headers["x-portlane-signature"] = "sha256=" + crypto.createHmac("sha256", s).update(bodyRaw).digest("hex"); } catch {} }
      const timeoutMs = Math.min(15000, Math.max(1000, Number((fwd as any).timeout_ms ?? 8000)));
      const n = parseInt((await pool.query("SELECT COUNT(*) FROM webhook_forward_attempts WHERE webhook_event_id=$1",[eventId])).rows[0].count,10)+1;
      const res = await fetch(String(fwd.url), { method: "POST", headers, body: bodyRaw, signal: AbortSignal.timeout(timeoutMs), redirect: "manual" });
      if (res.status >= 300 && res.status < 400) { await readCapped(res, 4096).catch(() => ""); throw new Error(`Forward blocked: redirect ${res.status}`); }
      await readCapped(res, 4096).catch(() => "");
      await pool.query("INSERT INTO webhook_forward_attempts (id,tenant_id,webhook_event_id,attempt_number,status,response_status) VALUES ($1,$2,$3,$4,$5,$6)", [id("wfa"), tenantId, eventId, n, res.ok?"SUCCESS":"FAILED", res.status]);
      return reply.send(success({ status: res.ok ? "forwarded" : "failed", statusCode: res.status }, String(req.id)));
    } catch (e: unknown) {
      const n = parseInt((await pool.query("SELECT COUNT(*) FROM webhook_forward_attempts WHERE webhook_event_id=$1",[eventId])).rows[0].count,10)+1;
      await pool.query("INSERT INTO webhook_forward_attempts (id,tenant_id,webhook_event_id,attempt_number,status,error_message) VALUES ($1,$2,$3,$4,$5,$6)", [id("wfa"), tenantId, eventId, n, "FAILED", String((e as Error).message).slice(0,500)]);
      return reply.status(502).send(errorBody("PROVIDER_ERROR","Forward failed.",String(req.id)));
    }
  });

  // Public inbound hook: POST /hooks/:publicIdentifier (and legacy /api/v1/hooks)
  async function handleHook(req: any, reply: any) {
    const { publicIdentifier } = req.params as { publicIdentifier: string };
    const endpoint = (await pool.query("SELECT * FROM webhook_endpoints WHERE public_identifier=$1", [publicIdentifier])).rows[0];
    if (!endpoint) return reply.status(404).send(errorBody("NOT_FOUND","Webhook endpoint not found.",String(req.id)));
    if (endpoint.status !== "active") return reply.status(404).send(errorBody("NOT_FOUND","Webhook endpoint disabled.",String(req.id)));

    const ip = req.ip ?? "0.0.0.0";
    const entries = await pool.query("SELECT cidr FROM ip_allowlist_entries WHERE scope_type='WEBHOOK_ENDPOINT' AND scope_id=$1 AND enabled=true", [endpoint.id]);
    const cidrs = entries.rows.map((r: { cidr: string })=>r.cidr);
    if (cidrs.length > 0 && !isIpAllowed(ip, cidrs)) {
      await pool.query("INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id,metadata_json) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [id("aud"), endpoint.tenant_id, "system", endpoint.id, "webhook.blocked_ip", "webhook_endpoint", endpoint.id, JSON.stringify({ ip })]);
      return reply.status(403).send(errorBody("IP_NOT_ALLOWED","Source not allowed.",String(req.id)));
    }

    if (!(await checkRateLimit(`wh:${endpoint.id}`, 120, 60_000, redisClient(config)))) return reply.status(429).send(errorBody("RATE_LIMITED","Rate limit exceeded.",String(req.id)));

    const rawBody = typeof (req as any).rawBody === "string" && (req as any).rawBody ? (req as any).rawBody as string : JSON.stringify(req.body ?? {});
    if (rawBody.length > 100_000) return reply.status(413).send(errorBody("VALIDATION_ERROR","Payload too large.",String(req.id)));

    if (endpoint.signature_mode === "hmac_sha256" && endpoint.encrypted_secret) {
      const sig = (req.headers["x-webhook-signature"] ?? req.headers["x-signature"] ?? "") as string;
      const bodyRaw = rawBody;
      let secret: string;
      try { secret = decrypt(endpoint.encrypted_secret, config.APP_ENCRYPTION_KEY || config.JWT_SECRET); } catch { secret = endpoint.encrypted_secret; }
      if (!verifyHmacSha256(bodyRaw, sig, secret)) return reply.status(401).send(errorBody("UNAUTHORIZED","Invalid signature.",String(req.id)));
    } else if (endpoint.secret_hash) {
      if (!verifyPlaintextWebhookSecret(endpoint.secret_hash, req.headers as Record<string, unknown>)) return reply.status(401).send(errorBody("UNAUTHORIZED","Invalid secret.",String(req.id)));
    }

    const safeHeaders = redactHeaders(req.headers as Record<string,string>);
    const eventId = id("whe_evt");
    await pool.query("INSERT INTO webhook_events (id,tenant_id,webhook_endpoint_id,request_id,source_ip,method,safe_headers_json,payload_json,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'received')", [eventId, endpoint.tenant_id, endpoint.id, String(req.id), ip, req.method, JSON.stringify(safeHeaders), JSON.stringify(req.body ?? null)]);

    const fwd = endpoint.forwarding_config_json as Record<string, unknown>;
    if (fwd.url) {
      try {
        await validateOutboundUrl(String(fwd.url));
        try {
          await enqueueForward(config, eventId);
        } catch (e: unknown) {
          // queue down: hook still 200 (event persisted), failure stays visible
          await pool.query("INSERT INTO webhook_forward_attempts (id,tenant_id,webhook_event_id,attempt_number,status,error_message) VALUES ($1,$2,$3,$4,$5,$6)", [id("wfa"), endpoint.tenant_id, eventId, 1, "FAILED", `enqueue failed: ${String((e as Error).message).slice(0,400)}`]);
        }
      } catch (e: unknown) {
        await pool.query("INSERT INTO webhook_forward_attempts (id,tenant_id,webhook_event_id,attempt_number,status,error_message) VALUES ($1,$2,$3,$4,$5,$6)", [id("wfa"), endpoint.tenant_id, eventId, 1, "FAILED", String((e as Error).message).slice(0,500)]);
      }
    }

    return reply.status(200).send(success({ id: eventId, status: "received" }, String(req.id)));
  }

  app.post("/hooks/:publicIdentifier", handleHook);
  app.post("/api/v1/hooks/:publicIdentifier", handleHook);
}
