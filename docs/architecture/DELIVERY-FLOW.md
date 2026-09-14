# Portlane — Delivery Flow

Related: [documentation index](../../README.md)

## 1. Submission

1. Resolve trusted source IP.
2. Authenticate API key.
3. Confirm API key status.
4. Evaluate IP allowlist.
5. Apply rate limit.
6. Resolve tenant.
7. Validate all destination ownership.
8. Check idempotency key (machine path saja; dashboard JWT tanpa check).
9. Persist message + deliveries dalam satu transaksi (`BEGIN/COMMIT`).
10. Idempotency race-safe: `ON CONFLICT (tenant_id,api_key_id,idempotency_key) DO NOTHING` + replay path.
11. Enqueue tiap delivery setelah COMMIT; queue down → `503`, baris tetap `QUEUED` dan bisa manual retry (tanpa fan-out parsial).
12. `last_used_at` API key di-update setelah auth + IP + rate gates lolos.
13. Return message + delivery summary.

## 2. Worker Processing

For each queued delivery:

1. Atomically claim delivery (`QUEUED/RETRYING` → `PROCESSING`).
2. Resolve message, provider connection, destination — semua tenant-scoped ke delivery (`AND tenant_id`).
3. Validate connection aktif + destination aktif.
4. Resolve provider adapter via registry.
5. Invoke adapter.
6. Record attempt (`safe_response` ter-redact).
7. On success, set `DELIVERED`.
8. On retryable failure, schedule retry (`[0,5s,30s,120s,600s]`, max 5; retry pertama setelah failure = 5s karena attempt_count sudah increment saat claim).
9. On permanent failure, set `FAILED` (`DEAD` khusus untuk retry exhaustion; keduanya terminal dan diobservasi bersama).
10. On retry exhaustion, set `DEAD`.

## 3. Retry Policy

Default example:

```text
Attempt 1: immediate
Attempt 2: +5 seconds
Attempt 3: +30 seconds
Attempt 4: +2 minutes
Attempt 5: +10 minutes
```

Exact policy should be configurable centrally.

Retryable examples:

- timeout
- connection reset
- provider 429
- provider 5xx

Usually non-retryable:

- invalid credentials
- invalid destination
- malformed message
- forbidden destination
- permanent validation errors

## 4. Manual Retry

Manual retry creates a new delivery attempt but preserves the original delivery history.

Gate: tenant ownership + status `FAILED/DEAD/RETRYING` (else `409`) +
provider connection dan destination harus `active` (else `422`) + update
kondisional `WHERE status IN (...)` agar race dengan worker aman. Enqueue
gagal → `503`, baris tetap `QUEUED`.

If desired later, a cloned delivery may be created instead, but V1 should keep the model simple.

## 5. Duplicate Protection

Workers must be safe under at-least-once queue semantics.

A delivery job may execute more than once, so state transitions and provider calls should be protected with locking/idempotency where feasible.

Aktual: claim atomik `UPDATE ... WHERE status IN (...) RETURNING` +
`UNIQUE(delivery_id,attempt_number)` (006) sehingga race duplikat menjadi
error keras, bukan korupsi histori diam-diam.
