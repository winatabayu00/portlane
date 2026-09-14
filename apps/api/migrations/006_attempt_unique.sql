-- Attempt number uniqueness per delivery (§25): worker inserts one row per
-- attempt; the constraint turns duplicate-worker races into loud errors
-- instead of silent history corruption. Verified zero duplicates before apply.
-- Rollback: DROP INDEX IF EXISTS uq_attempts_delivery_number.
CREATE UNIQUE INDEX IF NOT EXISTS uq_attempts_delivery_number ON delivery_attempts(delivery_id, attempt_number);
