-- V1.1 perf indexes: composite per real query patterns (AGENTS 43).
-- No redundant PK indexes. Idempotent (IF NOT EXISTS). Rollback: DROP INDEX IF EXISTS <name>.
-- Retention: non-destructive, indexes only, no data deletion.

CREATE INDEX IF NOT EXISTS idx_messages_tenant_created ON messages(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_tenant_status_created ON deliveries(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_tenant_message ON deliveries(tenant_id, message_id);
CREATE INDEX IF NOT EXISTS idx_attempts_delivery_number ON delivery_attempts(delivery_id, attempt_number);
CREATE INDEX IF NOT EXISTS idx_webhook_events_endpoint_received ON webhook_events(webhook_endpoint_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant_created ON webhook_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_tenant_created ON inbound_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_created ON audit_logs(tenant_id, created_at DESC);
