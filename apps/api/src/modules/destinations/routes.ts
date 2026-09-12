import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { dbPool } from "../../db.js";
import { id } from "../../lib/ids.js";
import { requireJwtUser, requireTenantMember } from "../auth/routes.js";
import type { AppConfig } from "../../config.js";
import { errorBody } from "../../errors.js";

export async function destinationRoutes(app: FastifyInstance, config: AppConfig) {
  const pool = dbPool(config);

  app.get("/api/v1/tenants/:tenantId/destinations", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const r = await pool.query("SELECT d.*, pc.provider_key, pc.name as provider_name FROM destinations d JOIN provider_connections pc ON pc.id=d.provider_connection_id WHERE d.tenant_id=$1 ORDER BY d.created_at DESC", [tenantId]);
    return reply.send({ data: r.rows });
  });

  app.post("/api/v1/tenants/:tenantId/destinations", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const body = z.object({ provider_connection_id: z.string().min(1), name: z.string().min(1), destination_type: z.string().optional(), config: z.record(z.unknown()) }).parse(req.body);
    const pc = await pool.query("SELECT id, provider_key FROM provider_connections WHERE id=$1 AND tenant_id=$2", [body.provider_connection_id, tenantId]);
    if (!pc.rows.length) return reply.status(404).send(errorBody("NOT_FOUND", "Provider connection not found.", String(req.id)));
    // validate via adapter if available
    const { getProvider } = await import("../providers/core/registry.js");
    const adapter = getProvider(pc.rows[0].provider_key);
    if (adapter) try { adapter.validateDestinationConfig(body.config as any); } catch (e: any) { return reply.status(422).send(errorBody("VALIDATION_ERROR", e.message, String(req.id))); }
    const destId = id("dst");
    const destType = body.destination_type ?? pc.rows[0].provider_key;
    await pool.query("INSERT INTO destinations (id,tenant_id,provider_connection_id,name,destination_type,config_json) VALUES ($1,$2,$3,$4,$5,$6)", [destId, tenantId, body.provider_connection_id, body.name, destType, JSON.stringify(body.config)]);
    const row = (await pool.query("SELECT * FROM destinations WHERE id=$1", [destId])).rows[0];
    return reply.status(201).send({ data: row });
  });

  app.get("/api/v1/tenants/:tenantId/destinations/:destId", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId, destId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const r = await pool.query("SELECT * FROM destinations WHERE id=$1 AND tenant_id=$2", [destId, tenantId]);
    if (!r.rows.length) return reply.status(404).send(errorBody("NOT_FOUND", "Destination not found.", String(req.id)));
    return reply.send({ data: r.rows[0] });
  });

  app.patch("/api/v1/tenants/:tenantId/destinations/:destId", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId, destId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const body = z.object({ name: z.string().min(1).optional(), config: z.record(z.unknown()).optional(), status: z.enum(["active","disabled"]).optional() }).parse(req.body);
    const cur = await pool.query("SELECT * FROM destinations WHERE id=$1 AND tenant_id=$2", [destId, tenantId]);
    if (!cur.rows.length) return reply.status(404).send(errorBody("NOT_FOUND", "Destination not found.", String(req.id)));
    const updates: string[] = []; const vals: unknown[] = []; let idx = 1;
    if (body.name) { updates.push(`name=$${idx++}`); vals.push(body.name); }
    if (body.config) { updates.push(`config_json=$${idx++}`); vals.push(JSON.stringify(body.config)); }
    if (body.status) { updates.push(`status=$${idx++}`); vals.push(body.status); }
    if (!updates.length) return reply.status(422).send(errorBody("VALIDATION_ERROR", "No fields.", String(req.id)));
    updates.push("updated_at=NOW()");
    vals.push(destId, tenantId);
    await pool.query(`UPDATE destinations SET ${updates.join(",")} WHERE id=$${idx++} AND tenant_id=$${idx++}`, vals);
    const row = (await pool.query("SELECT * FROM destinations WHERE id=$1", [destId])).rows[0];
    return reply.send({ data: row });
  });

  app.delete("/api/v1/tenants/:tenantId/destinations/:destId", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId, destId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    await pool.query("DELETE FROM destinations WHERE id=$1 AND tenant_id=$2", [destId, tenantId]);
    return reply.status(204).send();
  });
}
