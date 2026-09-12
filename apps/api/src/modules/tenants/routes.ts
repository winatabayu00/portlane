import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { dbPool } from "../../db.js";
import { id } from "../../lib/ids.js";
import { slugify } from "../../lib/slug.js";
import { requireJwtUser, requireTenantMember } from "../auth/routes.js";
import type { AppConfig } from "../../config.js";
import { errorBody } from "../../errors.js";
import { success } from "../../common/api-response.js";
import { ResponseCode } from "../../common/response-code.enum.js";

export async function tenantRoutes(app: FastifyInstance, config: AppConfig) {
  const pool = dbPool(config);

  app.get("/api/v1/tenants", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const r = await pool.query("SELECT t.* FROM tenants t JOIN tenant_memberships m ON m.tenant_id=t.id WHERE m.user_id=$1 ORDER BY t.created_at", [user.userId]);
    return reply.send(success(r.rows, String(req.id)));
  });

  app.post("/api/v1/tenants", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const body = z.object({ name: z.string().min(1) }).parse(req.body);
    const tid = id("ten"), slug = slugify(body.name) + "-" + tid.slice(-6);
    await pool.query("INSERT INTO tenants (id,name,slug) VALUES ($1,$2,$3)", [tid, body.name, slug]);
    await pool.query("INSERT INTO tenant_memberships (id,tenant_id,user_id,role) VALUES ($1,$2,$3,$4)", [id("mem"), tid, user.userId, "OWNER"]);
    const row = (await pool.query("SELECT * FROM tenants WHERE id=$1", [tid])).rows[0];
    return reply.status(201).send(success(row, String(req.id), ResponseCode.CREATED));
  });

  app.get("/api/v1/tenants/:id", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { id: tid } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tid, reply, req)) return;
    const r = await pool.query("SELECT * FROM tenants WHERE id=$1", [tid]);
    if (!r.rows.length) return reply.status(404).send(errorBody("NOT_FOUND","Tenant not found.",String(req.id)));
    return reply.send(success(r.rows[0], String(req.id)));
  });

  app.get("/api/v1/tenants/:id/members", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { id: tid } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tid, reply, req)) return;
    const r = await pool.query("SELECT u.id,u.name,u.email,m.role FROM users u JOIN tenant_memberships m ON m.user_id=u.id WHERE m.tenant_id=$1", [tid]);
    return reply.send(success(r.rows, String(req.id)));
  });

  app.post("/api/v1/tenants/:id/members", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { id: tid } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tid, reply, req)) return;
    const body = z.object({ email: z.string().email(), role: z.enum(["OWNER","MEMBER"]).default("MEMBER") }).parse(req.body);
    const u = await pool.query("SELECT id FROM users WHERE email=$1", [body.email.toLowerCase().trim()]);
    if (!u.rows.length) return reply.status(404).send(errorBody("NOT_FOUND","User not found.",String(req.id)));
    const uid = u.rows[0].id;
    try {
      await pool.query("INSERT INTO tenant_memberships (id,tenant_id,user_id,role) VALUES ($1,$2,$3,$4)", [id("mem"), tid, uid, body.role]);
    } catch (e: any) { if (e.code==="23505") return reply.status(409).send(errorBody("CONFLICT","Already member.",String(req.id))); throw e; }
    return reply.status(201).send(success({ tenant_id: tid, user_id: uid, role: body.role }, String(req.id), ResponseCode.CREATED));
  });
}
