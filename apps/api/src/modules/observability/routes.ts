import type { FastifyInstance } from "fastify";
import { dbPool } from "../../db.js";
import { requireJwtUser, requireTenantMember } from "../auth/routes.js";
import { success } from "../../common/api-response.js";
import { ResponseCode } from "../../common/response-code.enum.js";
import type { AppConfig } from "../../config.js";

export async function observabilityRoutes(app: FastifyInstance, config: AppConfig) {
  const pool = dbPool(config);

  app.get("/api/v1/tenants/:tenantId/overview", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const [msgToday, delivered, failed, queued, providers, webhooks, recentFailures] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM messages WHERE tenant_id=$1 AND created_at > NOW() - INTERVAL '1 day'", [tenantId]),
      pool.query("SELECT COUNT(*) FROM deliveries WHERE tenant_id=$1 AND status='DELIVERED'", [tenantId]),
      pool.query("SELECT COUNT(*) FROM deliveries WHERE tenant_id=$1 AND status IN ('FAILED','DEAD')", [tenantId]),
      pool.query("SELECT COUNT(*) FROM deliveries WHERE tenant_id=$1 AND status IN ('QUEUED','PROCESSING','RETRYING')", [tenantId]),
      pool.query("SELECT COUNT(*) FROM provider_connections WHERE tenant_id=$1 AND status='active'", [tenantId]),
      pool.query("SELECT COUNT(*) FROM webhook_events WHERE tenant_id=$1 AND received_at > NOW() - INTERVAL '1 day'", [tenantId]),
      pool.query("SELECT id, destination_id, last_error_code, last_error_message, updated_at FROM deliveries WHERE tenant_id=$1 AND status IN ('FAILED','DEAD') ORDER BY updated_at DESC LIMIT 10", [tenantId]),
    ]);
    return reply.send(success({
        messages_today: parseInt(msgToday.rows[0].count, 10),
        delivered: parseInt(delivered.rows[0].count, 10),
        failed: parseInt(failed.rows[0].count, 10),
        queued: parseInt(queued.rows[0].count, 10),
        active_providers: parseInt(providers.rows[0].count, 10),
        webhooks_received_today: parseInt(webhooks.rows[0].count, 10),
        recent_failures: recentFailures.rows,
      }, String(req.id)));
  });

  app.get("/api/v1/tenants/:tenantId/logs", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const q = req.query as Record<string, string>;
    const page = parseInt(q.page ?? "1", 10) || 1;
    const per = Math.min(100, parseInt(q.per_page ?? "50", 10) || 50);
    const total = (await pool.query("SELECT COUNT(*) FROM audit_logs WHERE tenant_id=$1", [tenantId])).rows[0].count;
    const rows = await pool.query("SELECT * FROM audit_logs WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3", [tenantId, per, (page - 1) * per]);
    return reply.send(success(rows.rows, String(req.id), ResponseCode.OK, undefined, { page, per_page: per, total: parseInt(total, 10) }));
  });

  app.get("/api/v1/tenants/:tenantId/deliveries", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config); if (!user) return;
    const { tenantId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    const q = req.query as Record<string, string>;
    const page = parseInt(q.page ?? "1", 10) || 1;
    const per = Math.min(100, parseInt(q.per_page ?? "25", 10) || 25);
    const status = q.status;
    const params = status ? [tenantId, status, per, (page - 1) * per] : [tenantId, per, (page - 1) * per];
    const totalQ = status
      ? await pool.query("SELECT COUNT(*) FROM deliveries WHERE tenant_id=$1 AND status=$2", [tenantId, status])
      : await pool.query("SELECT COUNT(*) FROM deliveries WHERE tenant_id=$1", [tenantId]);
    const rows = status
      ? await pool.query(`SELECT * FROM deliveries WHERE tenant_id=$1 AND status=$2 ORDER BY created_at DESC LIMIT $3 OFFSET $4`, params as unknown[])
      : await pool.query(`SELECT * FROM deliveries WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`, params as unknown[]);
    return reply.send(success(rows.rows, String(req.id), ResponseCode.OK, undefined, { page, per_page: per, total: parseInt(totalQ.rows[0].count, 10) }));
  });
}
