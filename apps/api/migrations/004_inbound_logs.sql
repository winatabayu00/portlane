-- Inbound request-response logs (existing DBs: 002 already applied before table added)
CREATE TABLE IF NOT EXISTS inbound_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  source_ip TEXT NOT NULL,
  user_agent TEXT,
  request_headers_json JSONB,
  request_body_json JSONB,
  response_status INT,
  response_headers_json JSONB,
  response_body_json JSONB,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inbound_tenant ON inbound_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inbound_request_id ON inbound_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_inbound_created ON inbound_logs(created_at DESC);
