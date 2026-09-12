import type { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "node:crypto";
import { dbPool } from "../../db.js";
import { id } from "../../lib/ids.js";
import { hashSecret } from "../../lib/crypto.js";
import { requireJwtUser, requireTenantMember } from "../auth/routes.js";
import type { AppConfig } from "../../config.js";
import { errorBody } from "../../errors.js";
import { success } from "../../common/api-response.js";
import { ResponseCode } from "../../common/response-code.enum.js";

function generateApiKey(): { full: string; prefix: string; secret: string } {
  const prefix = crypto.randomBytes(4).toString("hex");
  const secret = crypto.randomBytes(24).toString("hex");
  return { full: `pl_live_${prefix}.${secret}`, prefix, secret };
}

export async function apiKeyRoutes(app: FastifyInstance, config: AppConfig) {
  const pool = dbPool(config);

  app.get("/api/v1/tenants/:tenantId/api-keys", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const r = await pool.query("SELECT id,tenant_id,name,key_prefix,status,last_used_at,created_at,revoked_at FROM api_keys WHERE tenant_id=$1 ORDER BY created_at DESC", [tenantId]);
    return reply.send(success(r.rows, String(req.id)));
  });

  app.post("/api/v1/tenants/:tenantId/api-keys", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const body = z.object({ name: z.string().min(1) }).parse(req.body);
    const { full, prefix, secret } = generateApiKey();
    const hash = hashSecret(secret);
    const keyId = id("ak");
    await pool.query("INSERT INTO api_keys (id,tenant_id,name,key_prefix,secret_hash,status) VALUES ($1,$2,$3,$4,$5,'active')", [keyId, tenantId, body.name, prefix, hash]);
    await pool.query("INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("aud"), tenantId, "user", user.userId, "api_key.created", "api_key", keyId]);
    return reply.status(201).send(success({ id: keyId, name: body.name, key: full, prefix, status: "active" }, String(req.id), ResponseCode.CREATED));
  });

  app.post("/api/v1/tenants/:tenantId/api-keys/:keyId/revoke", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId, keyId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const r = await pool.query("UPDATE api_keys SET status='revoked', revoked_at=NOW() WHERE id=$1 AND tenant_id=$2 AND status='active' RETURNING id", [keyId, tenantId]);
    if (!r.rows.length) return reply.status(404).send(errorBody("NOT_FOUND","API key not found.",String(req.id)));
    await pool.query("INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("aud"), tenantId, "user", user.userId, "api_key.revoked", "api_key", keyId]);
    return reply.send(success({ id: keyId, status: "revoked" }, String(req.id)));
  });

  app.get("/api/v1/tenants/:tenantId/api-keys/:keyId/ip-allowlist", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId, keyId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const r = await pool.query("SELECT * FROM ip_allowlist_entries WHERE tenant_id=$1 AND scope_type='API_KEY' AND scope_id=$2 ORDER BY created_at", [tenantId, keyId]);
    return reply.send(success(r.rows, String(req.id)));
  });

  app.post("/api/v1/tenants/:tenantId/api-keys/:keyId/ip-allowlist", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId, keyId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const body = z.object({ cidr: z.string().min(1), description: z.string().optional() }).parse(req.body);
    // validate CIDR format using lib/ip
    const { parseCidrOrThrow } = await import("../../lib/ip.js");
    const cidr = parseCidrOrThrow(body.cidr);
    const entryId = id("ip");
    await pool.query("INSERT INTO ip_allowlist_entries (id,tenant_id,scope_type,scope_id,cidr,description) VALUES ($1,$2,$3,$4,$5,$6)", [entryId, tenantId, "API_KEY", keyId, cidr, body.description ?? null]);
    await pool.query("INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id,metadata_json) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [id("aud"), tenantId, "user", user.userId, "api_key.ip_allowlist_added", "api_key", keyId, JSON.stringify({ cidr })]);
    const row = (await pool.query("SELECT * FROM ip_allowlist_entries WHERE id=$1", [entryId])).rows[0];
    return reply.status(201).send(success(row, String(req.id), ResponseCode.CREATED));
  });

  app.delete("/api/v1/tenants/:tenantId/api-keys/:keyId/ip-allowlist/:entryId", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId, keyId, entryId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    await pool.query("DELETE FROM ip_allowlist_entries WHERE id=$1 AND tenant_id=$2 AND scope_id=$3", [entryId, tenantId, keyId]);
    await pool.query("INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("aud"), tenantId, "user", user.userId, "api_key.ip_allowlist_removed", "api_key", keyId]);
    return reply.status(204).send();
  });
}

export async function resolveApiKey(pool: any, bearer: string): Promise<any|null> {
  if (!bearer?.startsWith("pl_live_")) return null;
  const dot = bearer.lastIndexOf(".");
  if (dot === -1) return null;
  const prefix = bearer.slice(8, dot);
  const secret = bearer.slice(dot+1);
  const r = await pool.query("SELECT * FROM api_keys WHERE key_prefix=$1 AND status='active' LIMIT 1", [prefix]);
  if (!r.rows.length) return null;
  const row = r.rows[0];
  const hash = hashSecret(secret);
  const a = Buffer.from(hash), b = Buffer.from(row.secret_hash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a,b)) return null;
  await pool.query("UPDATE api_keys SET last_used_at=NOW() WHERE id=$1", [row.id]);
  return row;
}
