import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { dbPool } from "../../db.js";
import { id } from "../../lib/ids.js";
import { requireJwtUser, requireTenantMember } from "../auth/routes.js";
import { encryptCreds, decryptCreds } from "./core/crypto.js";
import { getProvider, listProviders } from "./core/registry.js";
import { ProviderError } from "./core/types.js";
import { deleteTelegramWebhook, getTelegramWebhookInfo, setTelegramWebhook } from "./telegram/index.js";
import { checkRateLimit } from "../../lib/rateLimit.js";
import { redisClient } from "../../redis.js";
import { hashSecret, encrypt, decrypt } from "../../lib/crypto.js";
import { registerAllProviders } from "./index.js";
import type { AppConfig } from "../../config.js";
import { publicHookUrl } from "../../config.js";
import { errorBody } from "../../errors.js";
import { success } from "../../common/api-response.js";
import { ResponseCode } from "../../common/response-code.enum.js";

// register once (single source; worker.ts uses the same entry)
registerAllProviders();

export async function providerRoutes(app: FastifyInstance, config: AppConfig) {
  const pool = dbPool(config);

  app.get("/api/v1/providers", async (req, reply) => {
    const defs = listProviders().map(p=>({ key: p.key, capabilities: p.capabilities }));
    return reply.send(success(defs, String((req as any).id ?? "req_unknown")));
  });

  app.get("/api/v1/tenants/:tenantId/provider-connections", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if(!user) return;
    const { tenantId } = req.params as any;
    if(!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const q = req.query as Record<string,string>;
    const where:string[]=["tenant_id=$1"]; const vals:any[]=[tenantId]; let idx=2;
    if(q.provider_key){ where.push(`provider_key=$${idx++}`); vals.push(q.provider_key); }
    if(q.status){ where.push(`status=$${idx++}`); vals.push(q.status); }
    if(q.q){ where.push(`(name ILIKE $${idx} OR provider_key ILIKE $${idx})`); vals.push(`%${q.q}%`); idx++; }
    const r = await pool.query(`SELECT id,tenant_id,provider_key,name,config_json,status,last_tested_at,last_test_result,created_at,updated_at FROM provider_connections WHERE ${where.join(" AND ")} ORDER BY created_at DESC`, vals);
    return reply.send(success(r.rows, String(req.id)));
  });

app.post("/api/v1/tenants/:tenantId/provider-connections", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if(!user) return;
    const { tenantId } = req.params as any;
    if(!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const body = z.object({ provider_key: z.enum(["telegram","discord","smtp","webhook"]), name: z.string().min(1), config: z.record(z.unknown()).default({}), credentials: z.record(z.unknown()).default({}) }).parse(req.body);
    const adapter = getProvider(body.provider_key);
    if(!adapter) return reply.status(422).send(errorBody("VALIDATION_ERROR","Unknown provider",String(req.id)));
    try { adapter.validateConnectionConfig(body.config as any, body.credentials as any); } catch(e:any){ return reply.status(422).send(errorBody("VALIDATION_ERROR", e.message, String(req.id))); }
    // Provider-owned network policy (§6/§36): no per-provider branching here.
    try { await adapter.verifyConnectionNetwork?.(body.config as any, body.credentials as any); } catch(e: unknown){ return reply.status(422).send(errorBody("VALIDATION_ERROR", `Network policy: ${String((e as Error).message)}`, String(req.id))); }
    const enc = encryptCreds(body.credentials as any, config.APP_ENCRYPTION_KEY || config.JWT_SECRET);
    const connId = id("conn");
    await pool.query("INSERT INTO provider_connections (id,tenant_id,provider_key,name,encrypted_credentials,config_json) VALUES ($1,$2,$3,$4,$5,$6)", [connId, tenantId, body.provider_key, body.name, enc, JSON.stringify(body.config)]);
    await pool.query("INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("aud"), tenantId,"user",user.userId,"provider_connection.created","provider_connection",connId]);
    const row = (await pool.query("SELECT id,tenant_id,provider_key,name,config_json,status,created_at FROM provider_connections WHERE id=$1 AND tenant_id=$2",[connId, tenantId])).rows[0];
    return reply.status(201).send(success(row, String(req.id), ResponseCode.CREATED));
  });

  

  app.patch("/api/v1/tenants/:tenantId/provider-connections/:connId", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if(!user) return;
    const { tenantId, connId } = req.params as any;
    if(!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const body = z.object({ name: z.string().min(1).optional(), config: z.record(z.unknown()).optional(), credentials: z.record(z.unknown()).optional(), status: z.enum(["active","disabled"]).optional() }).parse(req.body);
    const cur = await pool.query("SELECT * FROM provider_connections WHERE id=$1 AND tenant_id=$2",[connId, tenantId]);
    if(!cur.rows.length) return reply.status(404).send(errorBody("NOT_FOUND","Connection not found",String(req.id)));
    // Provider-owned network policy on change (§6/§36): generic, no branching.
    if (body.config || body.credentials) {
      const patchAdapter = getProvider(cur.rows[0].provider_key);
      const nextConfig = (body.config ?? cur.rows[0].config_json) as Record<string,unknown>;
      let nextCreds: Record<string,unknown>;
      if (body.credentials) {
        nextCreds = body.credentials as Record<string,unknown>;
      } else if (cur.rows[0].provider_key === "webhook") {
        nextCreds = {} as Record<string,unknown>;
      } else {
        nextCreds = {} as Record<string,unknown>;
      }
      try { await patchAdapter?.verifyConnectionNetwork?.(nextConfig, nextCreds); } catch(e: unknown){ return reply.status(422).send(errorBody("VALIDATION_ERROR", `Network policy: ${String((e as Error).message)}`, String(req.id))); }
    }
    const updates: string[]=[]; const vals:any[]=[]; let idx=1;
    if(body.name){ updates.push(`name=$${idx++}`); vals.push(body.name); }
    if(body.config){ updates.push(`config_json=$${idx++}`); vals.push(JSON.stringify(body.config)); }
    if(body.credentials){ const enc=encryptCreds(body.credentials as any, config.APP_ENCRYPTION_KEY || config.JWT_SECRET); updates.push(`encrypted_credentials=$${idx++}`); vals.push(enc); }
    if(body.status){ updates.push(`status=$${idx++}`); vals.push(body.status); }
    if(!updates.length) return reply.status(422).send(errorBody("VALIDATION_ERROR","No fields",String(req.id)));
    updates.push(`updated_at=NOW()`);
    vals.push(connId, tenantId);
    await pool.query(`UPDATE provider_connections SET ${updates.join(",")} WHERE id=$${idx++} AND tenant_id=$${idx++}`, vals);
    if (body.credentials) await pool.query("INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("aud"), tenantId, "user", user.userId, "provider_connection.credential_rotated", "provider_connection", connId]);
    if (body.name || body.config || body.status) await pool.query("INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("aud"), tenantId, "user", user.userId, "provider_connection.updated", "provider_connection", connId]);
    const row=(await pool.query("SELECT id,tenant_id,provider_key,name,config_json,status,created_at,updated_at FROM provider_connections WHERE id=$1 AND tenant_id=$2",[connId, tenantId])).rows[0];
    return reply.send(success(row, String(req.id)));
  });

  app.delete("/api/v1/tenants/:tenantId/provider-connections/:connId", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if(!user) return;
    const { tenantId, connId } = req.params as any;
    if(!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    try{
      await pool.query("DELETE FROM provider_connections WHERE id=$1 AND tenant_id=$2",[connId, tenantId]);
    }catch(e:any){
      if(e?.code==="23503") return reply.status(409).send(errorBody("CONFLICT","Connection has delivery history and cannot be deleted.",String(req.id)));
      throw e;
    }
    await pool.query("INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("aud"), tenantId, "user", user.userId, "provider_connection.deleted", "provider_connection", connId]);
    return reply.status(204).send();
  });

  app.post("/api/v1/tenants/:tenantId/provider-connections/:connId/test", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if(!user) return;
    if (!(await checkRateLimit(`provider:test:${user.userId}`, 10, 60_000, redisClient(config)))) return reply.status(429).send(errorBody("RATE_LIMITED", "Too many requests.", String(req.id)));
    const { tenantId, connId } = req.params as any;
    if(!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const cur = await pool.query("SELECT * FROM provider_connections WHERE id=$1 AND tenant_id=$2",[connId, tenantId]);
    if(!cur.rows.length) return reply.status(404).send(errorBody("NOT_FOUND","Connection not found",String(req.id)));
    const row=cur.rows[0];
    const adapter=getProvider(row.provider_key);
    if(!adapter) return reply.status(422).send(errorBody("VALIDATION_ERROR","Unknown provider",String(req.id)));
    const creds=decryptCreds(row.encrypted_credentials, config.APP_ENCRYPTION_KEY || config.JWT_SECRET);
    const cfg = row.config_json as any;
    const result = await adapter.testConnection(creds as any, cfg);
    await pool.query("UPDATE provider_connections SET last_tested_at=NOW(), last_test_result=$1 WHERE id=$2", [JSON.stringify(result), connId]);
    return reply.send(success(result, String(req.id)));
  });

  // Telegram inbound wiring (1 bot = 1 connection boleh punya N endpoint,
  // 1 endpoint = 1 public URL; semuanya boleh forward ke satu global
  // webhook downstream yang sama — routing per project tetap di downstream).
  async function loadTelegramConn(tenantId: string, connectionId: string) {
    const conn = (await pool.query("SELECT * FROM provider_connections WHERE id=$1 AND tenant_id=$2", [connectionId, tenantId])).rows[0];
    if (!conn) return { error: "NOT_FOUND" as const };
    if (conn.provider_key !== "telegram") return { error: "NOT_TELEGRAM" as const };
    let creds: Record<string, unknown>;
    try {
      creds = decryptCreds(conn.encrypted_credentials, config.APP_ENCRYPTION_KEY || config.JWT_SECRET);
    } catch {
      return { error: "BAD_CREDS" as const };
    }
    const token = String((creds as any).botToken ?? "");
    if (!token) return { error: "BAD_CREDS" as const };
    return { conn, token };
  }

  function telegramRouteError(reply: any, req: any, e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (e instanceof ProviderError && e.code === "INVALID_CREDENTIALS")
      return reply.status(422).send(errorBody("VALIDATION_ERROR", msg, String(req.id)));
    return reply.status(502).send(errorBody("PROVIDER_ERROR", msg, String(req.id)));
  }

  app.post("/api/v1/tenants/:tenantId/telegram/set-webhook", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    if (!(await checkRateLimit(`telegram:webhook:${user.userId}`, 10, 60_000, redisClient(config)))) return reply.status(429).send(errorBody("RATE_LIMITED", "Too many requests.", String(req.id)));
    const { tenantId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const body = z.object({
      connectionId: z.string().min(1),
      endpointId: z.string().min(1),
      secret: z.string().regex(/^[A-Za-z0-9_-]{1,256}$/, "secret must be 1-256 chars [A-Za-z0-9_-]").optional(),
    }).parse(req.body);
    const loaded = await loadTelegramConn(tenantId, body.connectionId);
    if (loaded.error === "NOT_FOUND") return reply.status(404).send(errorBody("NOT_FOUND", "Provider connection not found.", String(req.id)));
    if (loaded.error === "NOT_TELEGRAM") return reply.status(422).send(errorBody("VALIDATION_ERROR", "Connection is not a Telegram connection.", String(req.id)));
    if (loaded.error === "BAD_CREDS") return reply.status(422).send(errorBody("VALIDATION_ERROR", "Connection credentials unreadable.", String(req.id)));
    const endpoint = (await pool.query("SELECT * FROM webhook_endpoints WHERE id=$1 AND tenant_id=$2", [body.endpointId, tenantId])).rows[0];
    if (!endpoint) return reply.status(404).send(errorBody("NOT_FOUND", "Webhook endpoint not found.", String(req.id)));
    let hookUrl: string;
    try {
      hookUrl = publicHookUrl(config, endpoint.public_identifier);
    } catch (e: unknown) {
      return reply.status(422).send(errorBody("VALIDATION_ERROR", String((e as Error).message), String(req.id)));
    }
    // Secret: eksplisit menang (disimpan di endpoint untuk verifikasi inbound);
    // bila kosong, reuse secret endpoint yang sudah ada agar setup lama tetap jalan.
    const key = config.APP_ENCRYPTION_KEY || config.JWT_SECRET;
    let secretToken: string | undefined;
    if (body.secret) {
      secretToken = body.secret;
      await pool.query("UPDATE webhook_endpoints SET secret_hash=$1, encrypted_secret=$2, updated_at=NOW() WHERE id=$3 AND tenant_id=$4", [hashSecret(body.secret), encrypt(body.secret, key), endpoint.id, tenantId]);
    } else if (endpoint.encrypted_secret) {
      try {
        secretToken = decrypt(endpoint.encrypted_secret, key);
      } catch {
        secretToken = undefined;
      }
    }
    try {
      const result = await setTelegramWebhook(loaded.token, hookUrl, secretToken);
      await pool.query("INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("aud"), tenantId, "user", user.userId, "telegram.webhook_set", "webhook_endpoint", endpoint.id]);
      return reply.send(success({ ok: true, url: hookUrl, result }, String(req.id)));
    } catch (e: unknown) {
      return telegramRouteError(reply, req, e);
    }
  });

  app.get("/api/v1/tenants/:tenantId/telegram/webhook-info", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    if (!(await checkRateLimit(`telegram:webhook:${user.userId}`, 10, 60_000, redisClient(config)))) return reply.status(429).send(errorBody("RATE_LIMITED", "Too many requests.", String(req.id)));
    const { tenantId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const { connectionId } = req.query as Record<string, string>;
    if (!connectionId) return reply.status(422).send(errorBody("VALIDATION_ERROR", "connectionId query required.", String(req.id)));
    const loaded = await loadTelegramConn(tenantId, connectionId);
    if (loaded.error === "NOT_FOUND") return reply.status(404).send(errorBody("NOT_FOUND", "Provider connection not found.", String(req.id)));
    if (loaded.error === "NOT_TELEGRAM") return reply.status(422).send(errorBody("VALIDATION_ERROR", "Connection is not a Telegram connection.", String(req.id)));
    if (loaded.error === "BAD_CREDS") return reply.status(422).send(errorBody("VALIDATION_ERROR", "Connection credentials unreadable.", String(req.id)));
    try {
      const info = await getTelegramWebhookInfo(loaded.token);
      return reply.send(success(info ?? null, String(req.id)));
    } catch (e: unknown) {
      return telegramRouteError(reply, req, e);
    }
  });

  app.post("/api/v1/tenants/:tenantId/telegram/delete-webhook", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    if (!(await checkRateLimit(`telegram:webhook:${user.userId}`, 10, 60_000, redisClient(config)))) return reply.status(429).send(errorBody("RATE_LIMITED", "Too many requests.", String(req.id)));
    const { tenantId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const body = z.object({ connectionId: z.string().min(1), drop_pending_updates: z.boolean().optional() }).parse(req.body);
    const loaded = await loadTelegramConn(tenantId, body.connectionId);
    if (loaded.error === "NOT_FOUND") return reply.status(404).send(errorBody("NOT_FOUND", "Provider connection not found.", String(req.id)));
    if (loaded.error === "NOT_TELEGRAM") return reply.status(422).send(errorBody("VALIDATION_ERROR", "Connection is not a Telegram connection.", String(req.id)));
    if (loaded.error === "BAD_CREDS") return reply.status(422).send(errorBody("VALIDATION_ERROR", "Connection credentials unreadable.", String(req.id)));
    try {
      const result = await deleteTelegramWebhook(loaded.token, body.drop_pending_updates ?? false);
      await pool.query("INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("aud"), tenantId, "user", user.userId, "telegram.webhook_deleted", "provider_connection", loaded.conn.id]);
      return reply.send(success({ ok: true, result }, String(req.id)));
    } catch (e: unknown) {
      return telegramRouteError(reply, req, e);
    }
  });
}
