import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { dbPool } from "../../db.js";
import { id } from "../../lib/ids.js";
import { requireJwtUser, requireTenantMember } from "../auth/routes.js";
import { resolveApiKey } from "../api-keys/routes.js";
import { isIpAllowed } from "../../lib/ip.js";
import { checkRateLimit } from "../../lib/rateLimit.js";
import type { AppConfig } from "../../config.js";
import { errorBody } from "../../errors.js";
import { enqueueDelivery } from "../delivery/queue.js";

async function authenticateMachine(req:any, config:AppConfig){
  const pool=dbPool(config);
  const h=req.headers.authorization;
  if(!h?.startsWith("Bearer ")) return null;
  const token=h.slice(7);
  if(!token.startsWith("pl_live_")) return null;
  const ak=await resolveApiKey(pool, token);
  if(!ak) return null;
  return ak;
}

export async function messagingRoutes(app:FastifyInstance, config:AppConfig){
  const pool=dbPool(config);

  // Machine API: POST /api/v1/messages (tenant derived from api key)
  app.post("/api/v1/messages", async (req, reply)=>{
    // 1 trusted source ip handled by fastify trustProxy
    const ak = await authenticateMachine(req, config);
    if(!ak){
      const h=req.headers.authorization;
      if(h?.startsWith("Bearer pl_live_")) return reply.status(401).send(errorBody("UNAUTHORIZED","Invalid API key.",String(req.id)));
      // try JWT fallback for dashboard
      return reply.status(401).send(errorBody("UNAUTHORIZED","Missing API key. Use Authorization: Bearer pl_live_...",String(req.id)));
    }
    if(ak.status!=="active") return reply.status(401).send(errorBody("UNAUTHORIZED","API key revoked.",String(req.id)));
    // 4 IP allowlist
    const entries = await pool.query("SELECT cidr FROM ip_allowlist_entries WHERE scope_type='API_KEY' AND scope_id=$1 AND enabled=true",[ak.id]);
    const cidrs=entries.rows.map((r:any)=>r.cidr);
    if(cidrs.length>0){
      const ip=(req.ip ?? req.headers["x-forwarded-for"] as string ?? "127.0.0.1").toString().split(",")[0].trim();
      if(!isIpAllowed(ip, cidrs)){
        await pool.query("INSERT INTO audit_logs (id,tenant_id,actor_type,actor_id,action,target_type,target_id,metadata_json) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",[id("aud"),ak.tenant_id,"system",ak.id,"api_key.blocked_ip","api_key",ak.id, JSON.stringify({ip})]);
        return reply.status(403).send(errorBody("IP_NOT_ALLOWED","Request source is not allowed for this API key.",String(req.id)));
      }
    }
    // 5 rate limit: 60/min per api key
    if(!checkRateLimit(`ak:${ak.id}`, 60, 60_000)) return reply.status(429).send(errorBody("RATE_LIMITED","Rate limit exceeded.",String(req.id)));

    const body = z.object({
      destinations: z.array(z.string().min(1)).min(1).max(50),
      message: z.object({ subject: z.string().max(500).optional(), body: z.string().min(1).max(20000), metadata: z.record(z.unknown()).optional() }),
    }).parse(req.body);
    const idempotencyKey = (req.headers["idempotency-key"] as string | undefined) ?? (req.headers["Idempotency-Key"] as string | undefined) ?? null;

    // 6 tenant already from ak
    const tenantId=ak.tenant_id;

    // 7 validate destinations ownership & active
    const destRows = await pool.query(`SELECT id, provider_connection_id, status FROM destinations WHERE id = ANY($1) AND tenant_id=$2`, [body.destinations, tenantId]);
    if(destRows.rows.length !== body.destinations.length) return reply.status(404).send(errorBody("NOT_FOUND","One or more destinations not found.",String(req.id)));
    for(const d of destRows.rows) if(d.status!=="active") return reply.status(422).send(errorBody("VALIDATION_ERROR",`Destination ${d.id} is disabled.`,String(req.id)));

    // 8 idempotency check
    if(idempotencyKey){
      const existing = await pool.query("SELECT id FROM messages WHERE tenant_id=$1 AND api_key_id=$2 AND idempotency_key=$3",[tenantId, ak.id, idempotencyKey]);
      if(existing.rows.length){
        const mid=existing.rows[0].id;
        const dels=await pool.query("SELECT id,destination_id,status FROM deliveries WHERE message_id=$1",[mid]);
        return reply.status(200).send({ data:{ id: mid, status:"queued", deliveries: dels.rows.map((r:any)=>({ id:r.id, destination_id:r.destination_id, status:r.status })) } });
      }
    }

    const msgId=id("msg");
    await pool.query("INSERT INTO messages (id,tenant_id,api_key_id,idempotency_key,subject,body,metadata_json) VALUES ($1,$2,$3,$4,$5,$6,$7)",[msgId, tenantId, ak.id, idempotencyKey, body.message.subject ?? null, body.message.body, body.message.metadata? JSON.stringify(body.message.metadata): null]);

    const deliveries:any[]=[];
    for(const destId of body.destinations){
      const dest = destRows.rows.find((r:any)=>r.id===destId);
      const dlvId=id("dlv");
      await pool.query("INSERT INTO deliveries (id,tenant_id,message_id,provider_connection_id,destination_id,status) VALUES ($1,$2,$3,$4,$5,'QUEUED')",[dlvId, tenantId, msgId, dest.provider_connection_id, destId]);
      deliveries.push({ id: dlvId, destination_id: destId, status:"QUEUED" });
      // 11 enqueue
      try{ await enqueueDelivery(config, dlvId); }catch(e:any){ req.log.error({ err:e }, "enqueue failed"); }
    }

    return reply.status(201).send({ data:{ id: msgId, status:"queued", deliveries } });
  });

  // Dashboard: list messages scoped to tenant via JWT
  app.get("/api/v1/tenants/:tenantId/messages", async (req, reply)=>{
    const user=await requireJwtUser(req, reply, config); if(!user) return;
    const { tenantId } = req.params as any;
    if(!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const q=req.query as any; const page=parseInt(q.page??"1",10)||1; const per=parseInt(q.per_page??"25",10)||25;
    const total=(await pool.query("SELECT COUNT(*) FROM messages WHERE tenant_id=$1",[tenantId])).rows[0].count;
    const rows=await pool.query("SELECT * FROM messages WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",[tenantId, per, (page-1)*per]);
    // include delivery summary per message
    return reply.send({ data: rows.rows, meta:{ page, per_page: per, total: parseInt(total,10) } });
  });

  app.get("/api/v1/tenants/:tenantId/messages/:msgId", async (req, reply)=>{
    const user=await requireJwtUser(req, reply, config); if(!user) return;
    const { tenantId, msgId } = req.params as any;
    if(!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const msg=await pool.query("SELECT * FROM messages WHERE id=$1 AND tenant_id=$2",[msgId, tenantId]);
    if(!msg.rows.length) return reply.status(404).send(errorBody("NOT_FOUND","Message not found.",String(req.id)));
    const dels=await pool.query("SELECT * FROM deliveries WHERE message_id=$1 AND tenant_id=$2",[msgId, tenantId]);
    return reply.send({ data:{ message: msg.rows[0], deliveries: dels.rows } });
  });

  app.get("/api/v1/tenants/:tenantId/deliveries/:dlvId", async (req, reply)=>{
    const user=await requireJwtUser(req, reply, config); if(!user) return;
    const { tenantId, dlvId } = req.params as any;
    if(!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const dlv=await pool.query("SELECT * FROM deliveries WHERE id=$1 AND tenant_id=$2",[dlvId, tenantId]);
    if(!dlv.rows.length) return reply.status(404).send(errorBody("NOT_FOUND","Delivery not found.",String(req.id)));
    const attempts=await pool.query("SELECT * FROM delivery_attempts WHERE delivery_id=$1 ORDER BY attempt_number",[dlvId]);
    return reply.send({ data:{ delivery: dlv.rows[0], attempts: attempts.rows } });
  });

  // also support machine-level GET /api/v1/deliveries/:id via api key? optional
  app.post("/api/v1/tenants/:tenantId/deliveries/:dlvId/retry", async (req, reply)=>{
    const user=await requireJwtUser(req, reply, config); if(!user) return;
    const { tenantId, dlvId } = req.params as any;
    if(!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const dlv=await pool.query("SELECT * FROM deliveries WHERE id=$1 AND tenant_id=$2",[dlvId, tenantId]);
    if(!dlv.rows.length) return reply.status(404).send(errorBody("NOT_FOUND","Delivery not found.",String(req.id)));
    const cur=dlv.rows[0];
    if(!["FAILED","DEAD","RETRYING"].includes(cur.status)) return reply.status(409).send(errorBody("CONFLICT","Delivery not eligible for retry.",String(req.id)));
    await pool.query("UPDATE deliveries SET status='QUEUED', next_retry_at=null, updated_at=NOW() WHERE id=$1",[dlvId]);
    await enqueueDelivery(config, dlvId);
    return reply.send({ data:{ id: dlvId, status:"QUEUED" } });
  });
}
