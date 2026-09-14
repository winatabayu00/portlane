# Portlane — Data Model

Related: [documentation index](../../README.md)

This is the logical V1 model. Exact column types may be finalized during implementation.

## users

- id
- name
- email unique
- password_hash
- created_at
- updated_at

## tenants

- id
- name
- slug unique
- status
- created_at
- updated_at

## tenant_memberships

- id
- tenant_id
- user_id
- role (`OWNER`, `MEMBER`)
- created_at

Unique:
- `(tenant_id, user_id)`

## api_keys

- id
- tenant_id
- name
- key_prefix
- secret_hash
- status
- last_used_at
- created_at
- revoked_at
- expires_at nullable (ISO8601, enforced 401 when expired)
- scopes jsonb default `[]` — empty = unrestricted; allowed: `messages:write`, `messages:read`, `deliveries:read`, `deliveries:retry`
- allowed_providers jsonb default `[]` — empty = all; subset of `telegram|discord|smtp|webhook`
- allowed_destination_ids jsonb default `[]` — empty = all; validated tenant-scoped destination IDs

## ip_allowlist_entries

- id
- tenant_id
- scope_type (`API_KEY`, `WEBHOOK_ENDPOINT`)
- scope_id
- cidr
- description
- enabled
- created_at
- updated_at

- cidr `TEXT` (validasi app-side; rekomendasi `inet/cidr` belum dipakai)

## provider_connections

- id
- tenant_id
- provider_key
- name
- encrypted_credentials
- config_json
- status
- last_tested_at
- last_test_result
- created_at
- updated_at

## destinations

- id
- tenant_id
- provider_connection_id
- name
- destination_type
- config_json
- status
- created_at
- updated_at

## messages

- id
- tenant_id
- api_key_id nullable
- idempotency_key nullable
- subject nullable
- body
- metadata_json nullable
- created_at

Recommended unique constraint (code pakai full `UNIQUE`, bukan partial — JWT path insert `NULL/NULL`, replay check hanya machine path):

- `(tenant_id, api_key_id, idempotency_key)` where idempotency_key is not null

## deliveries

- id
- tenant_id
- message_id
- provider_connection_id (`RESTRICT` — blokir hard delete conn dipakai)
- destination_id (`RESTRICT` — blokir hard delete dst dipakai)
- status
- attempt_count
- next_retry_at nullable
- started_at nullable
- delivered_at nullable
- last_error_code nullable
- last_error_message nullable
- created_at
- updated_at

## delivery_attempts

- id
- tenant_id
- delivery_id
- attempt_number
- started_at
- finished_at
- duration_ms
- result (`SUCCESS/RETRYABLE/FAILED`)
- created_at (default now, insert worker)
- provider_status_code nullable
- provider_reference nullable
- error_code nullable
- error_message nullable
- safe_response_json nullable

## webhook_endpoints

- id
- tenant_id
- name
- public_identifier unique
- secret_hash + encrypted_secret (keduanya nullable, query tulis keduanya)
- signature_mode
- forwarding_config_json
- status
- created_at
- updated_at

## webhook_events

- id
- tenant_id
- webhook_endpoint_id
- request_id
- source_ip
- method
- safe_headers_json
- payload_json
- status (`received` saja dipakai; `forwarded/failed` ada di DB tapi tak pernah transisi; retry tulis `webhook_forward_attempts`)
- received_at
- processed_at nullable (tak pernah diisi)
- created_at

## webhook_forward_attempts

- id
- tenant_id
- webhook_event_id
- attempt_number
- status
- response_status nullable
- error_message nullable
- created_at

## inbound_logs

- id (== request_id / correlationId)
- tenant_id nullable (resolved from `/api/v1/tenants/:tenantId` path; null for non-tenant paths)
- request_id
- method
- path
- source_ip
- user_agent nullable
- request_headers_json (authorization/cookie stripped)
- request_body_json nullable
- response_status nullable
- response_headers_json nullable
- response_body_json nullable (not stored for privacy — null)
- duration_ms nullable
- created_at

## audit_logs (dipakai berat, belum didokumen sebelum ini)

- id, tenant_id, actor_type, actor_id, action, target_type, target_id, metadata_json, created_at
- actions: `api_key.blocked_ip, webhook.blocked_ip, api_key.*, provider.*, webhook.*`

Infra: `schema_migrations`, `m00_healthcheck` ada di `001_m00_baseline.sql`, bukan domain.

Indexes: kode punya banyak index (`002`, `003`, `004`, `005`, `006`, `007`); docs hanya list UNIQUE. Lihat migrasi sebagai sumber. `005` tambah composite per pola query (`tenant_id+created_at`, `tenant_id+status`, `tenant_id+message_id`, `delivery_id+attempt_number`, `webhook_endpoint_id+received_at`) tanpa index PK redundan. `006` tambah `UNIQUE(delivery_id,attempt_number)` agar race duplikat attempt menjadi error keras. `007` tambah `delivery_attempts(tenant_id,created_at)` untuk latensi p50/p95 overview + `created_at` indexes untuk purge retensi. `api_keys.key_prefix` index non-unique + `LIMIT 1` — tabrakan mungkin. Validasi `scopes/allowed_*/expires_at` app-only, tanpa CHECK DB.

## Retention (M12, opt-in default OFF)

`RETENTION_ENABLED=false` = tanpa hapus. `=true` = worker purge harian
(`RETENTION_DAYS`, min 7) hanya `delivery_attempts`,
`webhook_forward_attempts`, `inbound_logs` — batched `LIMIT 1000` per tabel.
Core history (`messages`, `deliveries`, `webhook_events`, `audit_logs`)
tidak pernah di-purge.

## Tenant Boundary Rule

Tenant-owned resources must never be fetched by ID alone from an untrusted request.

Prefer queries such as:

```text
WHERE id = :resource_id
AND tenant_id = :authorized_tenant_id
```

over fetching globally and checking later.
