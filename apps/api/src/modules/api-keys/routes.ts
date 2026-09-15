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

const ALLOWED_PROVIDERS = ["telegram","discord","smtp","webhook"] as const;
const ALLOWED_SCOPES = ["messages:write","messages:read","deliveries:read","deliveries:retry","telegram:webhook:write"] as const;
// Pre-scope capabilities (existed before M11 introduced scopes). Empty-scopes
// keys are grandfathered ONLY for these (§79 backward-compat); newer scopes
// are deny-by-default (§80).
const LEGACY_SCOPES = ["messages:write","messages:read","deliveries:read","deliveries:retry"] as const;

function parseExpires(v: string | null | undefined){
  if(v==null || v==="") return null;
  const d=new Date(v); if(isNaN(d.getTime())) throw new Error("Invalid expires_at");
  return d.toISOString();
}

export async function apiKeyRoutes(app: FastifyInstance, config: AppConfig) {
  const pool = dbPool(config);

  app.get("/api/v1/tenants/:tenantId/api-keys", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    try {
      const r = await pool.query("SELECT id,tenant_id,name,key_prefix,status,last_used_at,created_at,revoked_at,expires_at,scopes,allowed_destination_ids,allowed_providers FROM api_keys WHERE tenant_id=$1 ORDER BY created_at DESC", [tenantId]);
      return reply.send(success(r.rows, String(req.id)));
    } catch (e:any) {
      if (!String(e?.message ?? e).includes("does not exist")) throw e;
      const r = await pool.query("SELECT id,tenant_id,name,key_prefix,status,last_used_at,created_at,revoked_at FROM api_keys WHERE tenant_id=$1 ORDER BY created_at DESC", [tenantId]);
      const patched = r.rows.map((row:any)=> ({ ...row, expires_at:null, scopes:[], allowed_destination_ids:[], allowed_providers:[] }));
      return reply.send(success(patched, String(req.id)));
    }
  });

  app.post("/api/v1/tenants/:tenantId/api-keys", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const body = z.object({
      name: z.string().min(1),
      expires_at: z.string().nullable().optional(),
      scopes: z.array(z.string()).optional(),
      allowed_destination_ids: z.array(z.string()).optional(),
      allowed_providers: z.array(z.enum(ALLOWED_PROVIDERS)).optional(),
    }).parse(req.body);
    let expiresAt: string | null = null;
    try{ expiresAt = parseExpires(body.expires_at); }catch(e:any){ return reply.status(422).send(errorBody("VALIDATION_ERROR", e.message, String(req.id))); }
    if(expiresAt && new Date(expiresAt) <= new Date()) return reply.status(422).send(errorBody("VALIDATION_ERROR","expires_at must be in the future",String(req.id)));
    const scopes = body.scopes ?? [];
    const allowedDests = body.allowed_destination_ids ?? [];
    const allowedProviders = body.allowed_providers ?? [];
    // ponytail: validate scopes against ALLOWED_SCOPES loosely; upgrade to strict enum when contracts freeze
    for(const s of scopes) if(!ALLOWED_SCOPES.includes(s as any)) return reply.status(422).send(errorBody("VALIDATION_ERROR",`Invalid scope: ${s}`,String(req.id)));
    if(allowedDests.length){
      const chk = await pool.query("SELECT id FROM destinations WHERE id = ANY($1) AND tenant_id=$2", [allowedDests, tenantId]);
      if(chk.rows.length !== allowedDests.length) return reply.status(422).send(errorBody("VALIDATION_ERROR","One or more allowed_destination_ids not found in tenant",String(req.id)));
    }
    const { full, prefix, secret } = generateApiKey();
    const hash = hashSecret(secret);
    const keyId = id("ak");
    await pool.query("INSERT INTO api_keys (id,tenant_id,name,key_prefix,secret_hash,status,expires_at,scopes,allowed_destination_ids,allowed_providers) VALUES ($1,$2,$3,$4,$5,'active',$6,$7,$8,$9)", [keyId, tenantId, body.name, prefix, hash, expiresAt, JSON.stringify(scopes), JSON.stringify(allowedDests), JSON.stringify(allowedProviders)]);
    await pool.query("INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("aud"), tenantId, "user", user.userId, "api_key.created", "api_key", keyId]);
    const row=(await pool.query("SELECT id,tenant_id,name,key_prefix,status,expires_at,scopes,allowed_destination_ids,allowed_providers,created_at FROM api_keys WHERE id=$1",[keyId])).rows[0];
    return reply.status(201).send(success({ ...row, key: full, prefix }, String(req.id), ResponseCode.CREATED));
  });

  app.patch("/api/v1/tenants/:tenantId/api-keys/:keyId", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId, keyId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const body = z.object({
      name: z.string().min(1).optional(),
      expires_at: z.string().nullable().optional(),
      scopes: z.array(z.string()).optional(),
      allowed_destination_ids: z.array(z.string()).optional(),
      allowed_providers: z.array(z.enum(ALLOWED_PROVIDERS)).optional(),
    }).parse(req.body);
    const cur = await pool.query("SELECT * FROM api_keys WHERE id=$1 AND tenant_id=$2",[keyId, tenantId]);
    if(!cur.rows.length) return reply.status(404).send(errorBody("NOT_FOUND","API key not found.",String(req.id)));
    const sets:string[]=[]; const vals:any[]=[]; let idx=1;
    if(body.name!==undefined){ sets.push(`name=$${idx++}`); vals.push(body.name); }
    if(body.expires_at!==undefined){
      let exp:string|null=null;
      try{ exp=parseExpires(body.expires_at); }catch(e:any){ return reply.status(422).send(errorBody("VALIDATION_ERROR",e.message,String(req.id))); }
      if(exp && new Date(exp) <= new Date()) return reply.status(422).send(errorBody("VALIDATION_ERROR","expires_at must be in the future",String(req.id)));
      sets.push(`expires_at=$${idx++}`); vals.push(exp);
    }
    if(body.scopes!==undefined){
      for(const s of body.scopes) if(!ALLOWED_SCOPES.includes(s as any)) return reply.status(422).send(errorBody("VALIDATION_ERROR",`Invalid scope: ${s}`,String(req.id)));
      sets.push(`scopes=$${idx++}`); vals.push(JSON.stringify(body.scopes));
    }
    if(body.allowed_destination_ids!==undefined){
      if(body.allowed_destination_ids.length){
        const chk = await pool.query("SELECT id FROM destinations WHERE id = ANY($1) AND tenant_id=$2", [body.allowed_destination_ids, tenantId]);
        if(chk.rows.length !== body.allowed_destination_ids.length) return reply.status(422).send(errorBody("VALIDATION_ERROR","One or more allowed_destination_ids not found",String(req.id)));
      }
      sets.push(`allowed_destination_ids=$${idx++}`); vals.push(JSON.stringify(body.allowed_destination_ids));
    }
    if(body.allowed_providers!==undefined){ sets.push(`allowed_providers=$${idx++}`); vals.push(JSON.stringify(body.allowed_providers)); }
    if(!sets.length) return reply.status(422).send(errorBody("VALIDATION_ERROR","No fields to update",String(req.id)));
    vals.push(keyId); vals.push(tenantId);
    const r = await pool.query(`UPDATE api_keys SET ${sets.join(", ")} WHERE id=$${idx++} AND tenant_id=$${idx++} RETURNING id,tenant_id,name,key_prefix,status,expires_at,scopes,allowed_destination_ids,allowed_providers,created_at,revoked_at,last_used_at`, vals);
    await pool.query("INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("aud"), tenantId, "user", user.userId, "api_key.updated", "api_key", keyId]);
    return reply.send(success(r.rows[0], String(req.id)));
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

  app.delete("/api/v1/tenants/:tenantId/api-keys/:keyId", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId, keyId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const cur = await pool.query("SELECT status FROM api_keys WHERE id=$1 AND tenant_id=$2", [keyId, tenantId]);
    if (!cur.rows.length) return reply.status(404).send(errorBody("NOT_FOUND","API key not found.",String(req.id)));
    if (cur.rows[0].status === "active") return reply.status(422).send(errorBody("VALIDATION_ERROR","Revoke key before delete.",String(req.id)));
    await pool.query("DELETE FROM ip_allowlist_entries WHERE scope_type='API_KEY' AND scope_id=$1", [keyId]);
    await pool.query("DELETE FROM api_keys WHERE id=$1 AND tenant_id=$2", [keyId, tenantId]);
    await pool.query("INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("aud"), tenantId, "user", user.userId, "api_key.deleted", "api_key", keyId]);
    return reply.status(204).send();
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
    const row = (await pool.query("SELECT * FROM ip_allowlist_entries WHERE id=$1 AND tenant_id=$2 AND scope_id=$3", [entryId, tenantId, keyId])).rows[0];
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

export function hasScope(ak:any, scope:string):boolean{
  const scopes: string[] = Array.isArray(ak.scopes) ? ak.scopes : (typeof ak.scopes==="string" ? JSON.parse(ak.scopes) : ak.scopes ?? []);
  // §79/§80: empty scopes grandfather ONLY pre-scope (legacy) capabilities.
  // Keys created before M11 have scopes=[] and must keep working on the
  // original endpoints. Capabilities introduced after scoping (e.g.
  // telegram:webhook:write) are deny-by-default and require an explicit
  // grant — otherwise every legacy key would silently gain new privileges.
  if(!scopes || scopes.length===0) return (LEGACY_SCOPES as readonly string[]).includes(scope);
  return scopes.includes(scope);
}
export function isExpired(ak:any):boolean{
  if(!ak.expires_at) return false;
  return new Date(ak.expires_at) <= new Date();
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
  // last_used_at is updated by the caller after IP/rate/scope gates pass,
  // so blocked attempts don't pollute the signal.
  return row;
}
