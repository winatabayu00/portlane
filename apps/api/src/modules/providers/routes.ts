import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { dbPool } from "../../db.js";
import { id } from "../../lib/ids.js";
import { requireJwtUser, requireTenantMember } from "../auth/routes.js";
import { encryptCreds, decryptCreds } from "./core/crypto.js";
import { getProvider, listProviders } from "./core/registry.js";
import { checkRateLimit } from "../../lib/rateLimit.js";
import { validateOutboundUrl } from "../../lib/ssrf.js";
import { telegramProvider } from "./telegram/index.js";
import { discordProvider } from "./discord/index.js";
import { smtpProvider } from "./smtp/index.js";
import { webhookProvider } from "./webhook/index.js";
import type { AppConfig } from "../../config.js";
import { errorBody } from "../../errors.js";

// register once
import { registerProvider } from "./core/registry.js";
registerProvider(telegramProvider); registerProvider(discordProvider); registerProvider(smtpProvider); registerProvider(webhookProvider);

export async function providerRoutes(app: FastifyInstance, config: AppConfig) {
  const pool = dbPool(config);

  app.get("/api/v1/providers", async (_req, reply) => {
    const defs = listProviders().map(p=>({ key: p.key, capabilities: p.capabilities }));
    return reply.send({ data: defs });
  });

  app.get("/api/v1/tenants/:tenantId/provider-connections", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if(!user) return;
    const { tenantId } = req.params as any;
    if(!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const r = await pool.query("SELECT id,tenant_id,provider_key,name,config_json,status,last_tested_at,last_test_result,created_at,updated_at FROM provider_connections WHERE tenant_id=$1 ORDER BY created_at DESC", [tenantId]);
    return reply.send({ data: r.rows });
  });

  app.post("/api/v1/tenants/:tenantId/provider-connections", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if(!user) return;
    const { tenantId } = req.params as any;
    if(!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const body = z.object({ provider_key: z.enum(["telegram","discord","smtp","webhook"]), name: z.string().min(1), config: z.record(z.unknown()).default({}), credentials: z.record(z.unknown()).default({}) }).parse(req.body);
    const adapter = getProvider(body.provider_key);
    if(!adapter) return reply.status(422).send(errorBody("VALIDATION_ERROR","Unknown provider",String(req.id)));
    try { adapter.validateConnectionConfig(body.config as any, body.credentials as any); } catch(e:any){ return reply.status(422).send(errorBody("VALIDATION_ERROR", e.message, String(req.id))); }
    if (body.provider_key === "webhook") {
      const url = String((body.config as Record<string,unknown>).url ?? (body.credentials as Record<string,unknown>).url ?? "");
      if (url) try { await validateOutboundUrl(url); } catch(e: unknown){ return reply.status(422).send(errorBody("VALIDATION_ERROR", `Webhook URL blocked by SSRF policy: ${String((e as Error).message)}`, String(req.id))); }
    }
    const enc = encryptCreds(body.credentials as any, config.APP_ENCRYPTION_KEY || config.JWT_SECRET);
    const connId = id("conn");
    await pool.query("INSERT INTO provider_connections (id,tenant_id,provider_key,name,encrypted_credentials,config_json) VALUES ($1,$2,$3,$4,$5,$6)", [connId, tenantId, body.provider_key, body.name, enc, JSON.stringify(body.config)]);
    await pool.query("INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("aud"), tenantId,"user",user.userId,"provider_connection.created","provider_connection",connId]);
    const row = (await pool.query("SELECT id,tenant_id,provider_key,name,config_json,status,created_at FROM provider_connections WHERE id=$1",[connId])).rows[0];
    return reply.status(201).send({ data: row });
  });

  app.patch("/api/v1/tenants/:tenantId/provider-connections/:connId", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if(!user) return;
    const { tenantId, connId } = req.params as any;
    if(!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const body = z.object({ name: z.string().min(1).optional(), config: z.record(z.unknown()).optional(), credentials: z.record(z.unknown()).optional(), status: z.enum(["active","disabled"]).optional() }).parse(req.body);
    const cur = await pool.query("SELECT * FROM provider_connections WHERE id=$1 AND tenant_id=$2",[connId, tenantId]);
    if(!cur.rows.length) return reply.status(404).send(errorBody("NOT_FOUND","Connection not found",String(req.id)));
    // SSRF check on webhook URL change (config.url or credentials.url)
    if (cur.rows[0].provider_key === "webhook" && (body.config || body.credentials)) {
      const nextConfig = (body.config ?? cur.rows[0].config_json) as Record<string,unknown>;
      const nextCreds = (body.credentials ?? {}) as Record<string,unknown>;
      const url = String(nextConfig.url ?? nextCreds.url ?? (cur.rows[0].config_json as Record<string,unknown>).url ?? "");
      if (url) try { await validateOutboundUrl(url); } catch(e: unknown){ return reply.status(422).send(errorBody("VALIDATION_ERROR", `Webhook URL blocked by SSRF policy: ${String((e as Error).message)}`, String(req.id))); }
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
    const row=(await pool.query("SELECT id,tenant_id,provider_key,name,config_json,status,created_at,updated_at FROM provider_connections WHERE id=$1",[connId])).rows[0];
    return reply.send({ data: row });
  });

  app.delete("/api/v1/tenants/:tenantId/provider-connections/:connId", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if(!user) return;
    const { tenantId, connId } = req.params as any;
    if(!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    await pool.query("DELETE FROM provider_connections WHERE id=$1 AND tenant_id=$2",[connId, tenantId]);
    await pool.query("INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("aud"), tenantId, "user", user.userId, "provider_connection.deleted", "provider_connection", connId]);
    return reply.status(204).send();
  });

  app.post("/api/v1/tenants/:tenantId/provider-connections/:connId/test", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if(!user) return;
    if (!checkRateLimit(`provider:test:${user.userId}`, 10, 60_000)) return reply.status(429).send(errorBody("RATE_LIMITED", "Too many requests.", String(req.id)));
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
    return reply.send({ data: result });
  });
}
