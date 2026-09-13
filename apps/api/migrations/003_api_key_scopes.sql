-- API key scoping: expiry, scopes, destination allowlist, provider limit
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS scopes JSONB NOT NULL DEFAULT '[]';
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS allowed_destination_ids JSONB NOT NULL DEFAULT '[]';
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS allowed_providers JSONB NOT NULL DEFAULT '[]';
CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON api_keys(expires_at) WHERE expires_at IS NOT NULL;
