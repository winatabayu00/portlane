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
    // Range-aware operational summary. Existing top-level counters are kept
    // verbatim for backward compatibility (§41); `activity`, `provider_mix`,
    // `queue` and `latency` are additive (M12 perf observability).
    const range = (req.query as Record<string, string>).range === "24h" ? "24h"
      : (req.query as Record<string, string>).range === "30d" ? "30d" : "7d";
    const trunc = range === "24h" ? "hour" : "day";
    const interval = range === "24h" ? "1 day" : range === "30d" ? "30 days" : "7 days";
    const buckets = range === "24h" ? 24 : range === "30d" ? 30 : 7;
    const [msgToday, delivered, failed, queued, providers, webhooks, recentFailures, queueRows, activityRows, mixRows, latencyRows] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM messages WHERE tenant_id=$1 AND created_at > NOW() - INTERVAL '1 day'", [tenantId]),
      pool.query("SELECT COUNT(*) FROM deliveries WHERE tenant_id=$1 AND status='DELIVERED'", [tenantId]),
      pool.query("SELECT COUNT(*) FROM deliveries WHERE tenant_id=$1 AND status IN ('FAILED','DEAD')", [tenantId]),
      pool.query("SELECT COUNT(*) FROM deliveries WHERE tenant_id=$1 AND status IN ('QUEUED','PROCESSING','RETRYING')", [tenantId]),
      pool.query("SELECT COUNT(*) FROM provider_connections WHERE tenant_id=$1 AND status='active'", [tenantId]),
      pool.query("SELECT COUNT(*) FROM webhook_events WHERE tenant_id=$1 AND received_at > NOW() - INTERVAL '1 day'", [tenantId]),
      pool.query("SELECT id, destination_id, last_error_code, last_error_message, updated_at FROM deliveries WHERE tenant_id=$1 AND status IN ('FAILED','DEAD') ORDER BY updated_at DESC LIMIT 10", [tenantId]),
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status='QUEUED')::int AS queued,
           COUNT(*) FILTER (WHERE status='PROCESSING')::int AS processing,
           COUNT(*) FILTER (WHERE status='RETRYING')::int AS retrying,
           COUNT(*) FILTER (WHERE status='DEAD')::int AS dead
         FROM deliveries WHERE tenant_id=$1`, [tenantId]),
      pool.query(
        `SELECT date_trunc($1, created_at) AS bucket,
           COUNT(*) FILTER (WHERE status='DELIVERED')::int AS delivered,
           COUNT(*) FILTER (WHERE status IN ('FAILED','DEAD'))::int AS failed
         FROM deliveries WHERE tenant_id=$2 AND created_at > NOW() - $3::interval
         GROUP BY 1 ORDER BY 1`, [trunc, tenantId, interval]),
      pool.query(
        `SELECT COALESCE(pc.provider_key,'unknown') AS provider_key, COUNT(*)::int AS count
          FROM deliveries d LEFT JOIN provider_connections pc ON pc.id=d.provider_connection_id
          WHERE d.tenant_id=$1 AND d.created_at > NOW() - $2::interval
          GROUP BY 1 ORDER BY 2 DESC`, [tenantId, interval]),
      pool.query(
        `SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms)::int AS p50_ms,
            percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms)::int AS p95_ms,
            COUNT(*)::int AS samples
          FROM delivery_attempts
          WHERE tenant_id=$1 AND created_at > NOW() - $2::interval AND duration_ms IS NOT NULL`,
        [tenantId, interval]),
    ]);
    // Fill missing buckets with zeros so charts never mislead (§39).
    // Buckets are generated in UTC to match date_trunc boundaries.
    const byBucket = new Map<string, { delivered: number; failed: number }>();
    for (const r of activityRows.rows) byBucket.set(new Date(r.bucket).toISOString(), { delivered: r.delivered, failed: r.failed });
    const now = new Date();
    const activity: { bucket: string; delivered: number; failed: number }[] = [];
    for (let i = buckets - 1; i >= 0; i--) {
      const d = new Date(now);
      if (trunc === "hour") { d.setUTCMinutes(0, 0, 0); d.setUTCHours(d.getUTCHours() - i); }
      else { d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - i); }
      const key = d.toISOString();
      const hit = byBucket.get(key) ?? { delivered: 0, failed: 0 };
      activity.push({ bucket: key, delivered: hit.delivered, failed: hit.failed });
    }
    const mixTotal = mixRows.rows.reduce((a: number, r: { count: number }) => a + r.count, 0) || 1;
    const provider_mix = mixRows.rows.map((r: { provider_key: string; count: number }) => ({
      provider_key: r.provider_key, count: r.count, pct: Math.round((r.count / mixTotal) * 1000) / 10,
    }));
    const lat = latencyRows.rows[0] ?? { p50_ms: null, p95_ms: null, samples: 0 };
    const latency = {
      p50_ms: lat.samples > 0 ? lat.p50_ms : null,
      p95_ms: lat.samples > 0 ? lat.p95_ms : null,
      samples: lat.samples ?? 0,
    };
    return reply.send(success({
        messages_today: parseInt(msgToday.rows[0].count, 10),
        delivered: parseInt(delivered.rows[0].count, 10),
        failed: parseInt(failed.rows[0].count, 10),
        queued: parseInt(queued.rows[0].count, 10),
        active_providers: parseInt(providers.rows[0].count, 10),
        webhooks_received_today: parseInt(webhooks.rows[0].count, 10),
        recent_failures: recentFailures.rows,
        queue: queueRows.rows[0],
        activity,
        provider_mix,
        latency,
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
