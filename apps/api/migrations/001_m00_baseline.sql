-- M00 baseline: migration mechanism proof. No product tables yet (later milestones).
-- Tracks applied migrations so `yarn migrate` is idempotent.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Infra canary row: proves write path works against minisever Postgres.
CREATE TABLE IF NOT EXISTS m00_healthcheck (
  id TEXT PRIMARY KEY,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO m00_healthcheck (id) VALUES ('baseline')
ON CONFLICT (id) DO NOTHING;
