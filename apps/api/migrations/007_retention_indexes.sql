-- M12 retention + latency support: created_at indexes for purge and p50/p95 queries.
-- Idempotent (IF NOT EXISTS). Rollback: DROP INDEX IF EXISTS <name>.
-- Non-destructive: indexes only, no data deletion (AGENTS 42/43/69).

CREATE INDEX IF NOT EXISTS idx_attempts_tenant_created ON delivery_attempts(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_created ON delivery_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_forward_attempts_created ON webhook_forward_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
