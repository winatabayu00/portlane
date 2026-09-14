-- Telegram inbound wiring linkage: 1 bot (provider connection) boleh punya N
-- webhook endpoint; 1 endpoint = 1 public URL. Semua endpoint boleh forward
-- ke satu global webhook downstream yang sama (routing per project di downstream).
-- Telegram Bot API sendiri hanya menyimpan 1 active URL per bot (last set wins);
-- tabel ini persist riwayat wiring agar observable (siapa link ke mana, kapan).
CREATE TABLE IF NOT EXISTS telegram_webhook_links (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider_connection_id TEXT NOT NULL REFERENCES provider_connections(id) ON DELETE CASCADE,
  webhook_endpoint_id TEXT NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  telegram_url TEXT NOT NULL,
  last_set_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_connection_id, webhook_endpoint_id)
);
CREATE INDEX IF NOT EXISTS idx_tg_links_tenant ON telegram_webhook_links(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tg_links_conn ON telegram_webhook_links(provider_connection_id);
CREATE INDEX IF NOT EXISTS idx_tg_links_endpoint ON telegram_webhook_links(webhook_endpoint_id);
