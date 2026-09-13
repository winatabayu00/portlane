import type { FastifyInstance } from "fastify";
import { dbPool } from "../../db.js";
import { requireJwtUser, requireTenantMember } from "../auth/routes.js";
import { errorBody } from "../../errors.js";
import { success } from "../../common/api-response.js";
import { ResponseCode } from "../../common/response-code.enum.js";
import type { AppConfig } from "../../config.js";

export function resolveInboundTenantId(url: string): string | null {
  const m = url.match(/^\/api\/v1\/tenants\/([^/?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export async function inboundRoutes(app: FastifyInstance, config: AppConfig) {
  const pool = dbPool(config);

  app.get("/api/v1/tenants/:tenantId/inbound", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config);
    if (!user) return;
    const { tenantId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    
    const q = req.query as Record<string, string>;
    const page = parseInt(q.page ?? "1", 10) || 1;
    const per = Math.min(100, parseInt(q.per_page ?? "50", 10) || 50);
    const method = q.method;
    const status = q.status;
    
    const where: string[] = ["tenant_id=$1"];
    const values: unknown[] = [tenantId];
    let idx = 2;

    if (method) {
      where.push(`method=$${idx++}`);
      values.push(method);
    }

    if (status) {
      const n = parseInt(status, 10);
      if (!Number.isInteger(n)) return reply.status(422).send(errorBody("VALIDATION_ERROR", "status must be integer.", String(req.id)));
      where.push(`response_status=$${idx++}`);
      values.push(n);
    }
    
    const baseWhere = where.join(" AND ");
    const countSql = `SELECT COUNT(*) FROM inbound_logs WHERE ${baseWhere}`;
    const total = (await pool.query(countSql, values)).rows[0].count;
    
    const offset = (page - 1) * per;
    const dataSql = `SELECT id, request_id, method, path, source_ip, user_agent, response_status, duration_ms, created_at FROM inbound_logs WHERE ${baseWhere} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    const rows = await pool.query(dataSql, [...values, per, offset]);
    
    return reply.send(success(rows.rows, String(req.id), ResponseCode.OK, undefined, { page, per_page: per, total: parseInt(total, 10) }));
  });

  app.get("/api/v1/tenants/:tenantId/inbound/:logId", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config);
    if (!user) return;
    const { tenantId, logId } = req.params as any;
    if (!await requireTenantMember(pool, user.userId, tenantId, reply, req)) return;
    
    const log = await pool.query("SELECT * FROM inbound_logs WHERE id=$1 AND tenant_id=$2", [logId, tenantId]);
    if (!log.rows.length) return reply.status(404).send(errorBody("NOT_FOUND", "Log not found.", String(req.id)));
    
    return reply.send(success(log.rows[0], String(req.id)));
  });
}