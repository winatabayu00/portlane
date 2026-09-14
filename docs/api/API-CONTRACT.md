# Portlane — API Contract

Related: [documentation index](../../README.md)

Base path:

```text
/api/v1
```

## 1. Authentication

Machine API (only `POST /messages`):

```http
Authorization: Bearer pl_live_<prefix>.<secret>
```

Dashboard API (all `/tenants/:tenantId/*`):

```http
Authorization: Bearer <jwt>
```

`GET /providers`, `GET /health`, `GET /ready` public. `pl_live_` rejected on JWT routes (`401`). JWT routes require membership else `403`; missing tenant resource → `404`.

Optional idempotency:

```http
Idempotency-Key: <client-generated-key>
```

## 2. Envelope

All API responses use `rc` (response code) + `status`.

Success:

```json
{
  "rc": 2000,
  "status": "success",
  "message": "Success",
  "data": { "...": "..." },
  "errors": null,
  "correlationId": "req_xxx",
  "timestamp": "2026-03-07T00:00:00.000Z",
  "meta": { "page": 1, "per_page": 25, "total": 42 }
}
```

`meta` present only on paginated endpoints. `201 Created` uses `rc: 2001`. `DELETE` returns `204` empty, tanpa envelope. `POST /auth/register` return `200 rc:2001` (kecualian).

Error: `errorBody` kirim `errors:{code,message,statusCode,request_id}` tanpa `path,method,error`. `failure()` tambah `path,method`. `404` handler pakai `errorBody`. `IP_NOT_ALLOWED` map ke HTTP `403 rc:4030`.

Idempotency replay return `200` data lama, bukan `409`. `413` ganda: hook `VALIDATION_ERROR`, global `PAYLOAD_TOO_LARGE rc:4013`.

Error (all 4xx/5xx + 404 handler):

```json
{
  "rc": 4002,
  "status": "failed",
  "message": "Resource not found.",
  "data": null,
  "errors": { "code": "NOT_FOUND", "message": "Resource not found.", "statusCode": 404, "path": "/api/v1/...", "method": "GET" },
  "correlationId": "req_xxx",
  "timestamp": "2026-03-07T00:00:00.000Z",
  "error": { "code": "NOT_FOUND", "message": "Resource not found.", "request_id": "req_xxx" }
}
```

`error` is compat — clients should read `rc`/`errors`/`correlationId`. `correlationId` echoes `x-request-id` and `x-correlation-id` headers.

Provider secrets must never be returned in errors.

## 3. Messages

### POST /messages (machine, tenant dari API key)

Replay idempotency key sama return `200` data lama, bukan `409`.

### POST /tenants/:tenantId/messages (dashboard JWT, tanpa idempotency)

### GET /tenants/:tenantId/messages

Tenant-scoped paginated history. Machine `GET /messages` tidak ada.

### GET /tenants/:tenantId/messages/:id

Returns message + deliveries.

## 4. Deliveries

### GET /tenants/:tenantId/deliveries (list)

### GET /tenants/:tenantId/deliveries/:id

Returns delivery details and attempts.

### POST /tenants/:tenantId/deliveries/:id/retry

Eligible: `FAILED,DEAD,RETRYING` else `409`. Missing → `404`.

## 5. Provider Connections

Semua tenant-scoped: `/tenants/:tenantId/provider-connections...`.

### GET /tenants/:tenantId/overview, GET .../logs, GET .../deliveries

Dashboard observability. `GET .../overview?range=24h|7d|30d` (default `7d`)
adds `activity` (bucketed delivered/failed, zero-filled), `provider_mix`
(real counts by `provider_key` with `pct`), `queue`
(`queued/processing/retrying/dead`), and `latency`
(`p50_ms/p95_ms/samples` from `delivery_attempts.duration_ms` in range,
`null` when no samples). Base counters unchanged.

### GET /providers (public)

Returns installed provider definitions and capabilities.

### GET /tenants/:tenantId/provider-connections

### POST /tenants/:tenantId/provider-connections

### PATCH /tenants/:tenantId/provider-connections/:id

### DELETE /tenants/:tenantId/provider-connections/:id (`204`)

Dibatasi `RESTRICT` bila dipakai deliveries → `409` bila ada histori.

### POST /tenants/:tenantId/provider-connections/:id/test (10/min)

Secrets must be write-only in normal responses. Discord test offline (hostname check), Telegram live `getMe`.

### POST /tenants/:tenantId/telegram/set-webhook (10/min)

Body `{connectionId, endpointId, secret?}` (`secret` regex `[A-Za-z0-9_-]{1,256}`). Registers Telegram `setWebhook` to `{PORTLANE_PUBLIC_BASE_URL}/hooks/:publicIdentifier`. `secret` eksplisit disimpan di endpoint; kosong reuse secret lama. Requires `PORTLANE_PUBLIC_BASE_URL` else `422`. Errors: `404` connection/endpoint, `422` non-Telegram/unreadable creds, Telegram `401/403` → `422`, lain → `502`.

### GET /tenants/:tenantId/telegram/webhook-links (?connectionId=)

Lists persisted bot↔endpoint wiring (`telegram_webhook_links`): connection/endpoint names, `telegram_url`, `last_set_at`. Tenant-scoped JWT.

### GET /tenants/:tenantId/telegram/webhook-info?connectionId= (10/min)

Proxies Telegram `getWebhookInfo`. Same `404/422/502` mapping.

### POST /tenants/:tenantId/telegram/delete-webhook (10/min)

Body `{connectionId, drop_pending_updates?}`. Proxies Telegram `deleteWebhook`. Same mapping.

## 6. Destinations

Semua tenant-scoped: `/tenants/:tenantId/destinations...`.

### GET /tenants/:tenantId/destinations
### POST /tenants/:tenantId/destinations
### GET /tenants/:tenantId/destinations/:id
### PATCH /tenants/:tenantId/destinations/:id
### DELETE /tenants/:tenantId/destinations/:id (`204`, `RESTRICT` bila dipakai → `409` bila ada histori)

## 7. API Keys

Semua tenant-scoped: `/tenants/:tenantId/api-keys...`.

### GET /tenants/:tenantId/api-keys

Returns `id, tenant_id, name, key_prefix, status, last_used_at, created_at, revoked_at, expires_at, scopes, allowed_destination_ids, allowed_providers`. `scopes/allowed_*` empty = unrestricted. Fallback maps legacy rows to `null/[]` when migration `003` not yet applied.

### POST /tenants/:tenantId/api-keys

```json
{
  "name": "prod",
  "expires_at": "2026-12-31T00:00:00.000Z",
  "scopes": ["messages:write"],
  "allowed_providers": ["telegram"],
  "allowed_destination_ids": ["dst_xxx"]
}
```

`expires_at` must be future ISO8601 or `null`. `scopes` allowed: `messages:write|messages:read|deliveries:read|deliveries:retry`. `allowed_providers` subset of `telegram|discord|smtp|webhook`. `allowed_destination_ids` validated tenant-scoped. Response `201 rc:2001` includes row + `key: pl_live_<prefix>.<secret>` + `prefix`. Full secret shown only once.

### PATCH /tenants/:tenantId/api-keys/:id

Updatable: `name, expires_at, scopes, allowed_destination_ids, allowed_providers`. Same validation as create. `expires_at: null` clears expiry. Returns updated row.

### POST /tenants/:tenantId/api-keys/:id/revoke

Marks `revoked`. Subsequent machine auth `401`.

### DELETE /tenants/:tenantId/api-keys/:id

Hard delete. Requires `revoked` first else `422 Revoke key before delete.` Cascades `ip_allowlist_entries` for that key scope. `204` on success.

Machine auth enforcement (only `POST /messages` checks scope/allowlist/IP/rate; JWT routes reject `pl_live_` with `401`):

- `401 API key expired.` when `expires_at <= now`
- `403 API key scope not allowed: messages:write required.` when `scopes` non-empty and lacking required scope
- `403 Destination not allowed for this API key: …` when `allowed_destination_ids` non-empty and request contains outside set
- `403 Provider not allowed for this API key: …` when `allowed_providers` non-empty and destination provider outside set

## 8. API Key IP Allowlist

### GET /tenants/:tenantId/api-keys/:id/ip-allowlist
### POST /tenants/:tenantId/api-keys/:id/ip-allowlist
### DELETE /tenants/:tenantId/api-keys/:id/ip-allowlist/:entryId

Request:

```json
{
  "cidr": "103.10.20.30/32",
  "description": "Production server"
}
```

## 9. Incoming Webhooks

Public:

```text
POST /hooks/:publicIdentifier
POST /api/v1/hooks/:publicIdentifier (legacy alias)
```

Headers: `x-webhook-signature`/`x-signature` (`sha256=` prefix) atau `x-webhook-secret`/`Authorization`. Rate `120/min`, payload `100KB` → `413`. Mode `none` + `secret_hash` tetap enforce secret.

## 10. Webhook Management

Semua tenant-scoped: `/tenants/:tenantId/webhook-endpoints...`.

### GET /tenants/:tenantId/webhook-endpoints (row: `has_secret` boolean, tanpa secret plaintext)
### POST /tenants/:tenantId/webhook-endpoints (return `_oneTimeSecret` sekali)
### PATCH /tenants/:tenantId/webhook-endpoints/:id (rotasi secret → return `_oneTimeSecret` sekali)
### DELETE /tenants/:tenantId/webhook-endpoints/:id (`204`)
### POST /tenants/:tenantId/webhook-endpoints/:id/test-forward (`10/min`; body `{payload?}`, header `x-portlane-test: true`, audit `webhook_endpoint.test_forward`, tanpa event/attempt)
### GET /tenants/:tenantId/webhooks/public-status

Public inbound readiness untuk UI: return `{public_base_url, ready}` dari `PORTLANE_PUBLIC_BASE_URL` (tanpa secret). `ready=false` = Telegram/external belum bisa callback ke sini.

### GET /tenants/:tenantId/webhook-events
### GET /tenants/:tenantId/webhook-events/:id (return `request_id,source_ip,method,safe_headers_json,status,received_at`)
### POST /tenants/:tenantId/webhook-events/:id/retry (`200/422/502/404`; manual only, auto-retry belum ada)

## 11. Webhook IP Allowlist

### GET /tenants/:tenantId/webhook-endpoints/:id/ip-allowlist
### POST /tenants/:tenantId/webhook-endpoints/:id/ip-allowlist
### DELETE /tenants/:tenantId/webhook-endpoints/:id/ip-allowlist/:entryId

## 11b. Inbound Logs

### GET /tenants/:tenantId/inbound?method=&status=&page=&per_page=

Tenant-scoped via JWT. `status` integer HTTP code, invalid → `422`. Returns `meta` pagination envelope.

### GET /tenants/:tenantId/inbound/:logId

Tenant-scoped. Missing → `404` envelope (`errors.code: NOT_FOUND`).

## 12. Auth, Tenants, Health (dashboard, JWT)

`POST /api/v1/auth/register` (`200 rc:2001`), `POST /api/v1/auth/login` (`10/min` per IP), `GET /api/v1/auth/me` (returns `user:{id,email,name}` + `tenants`). `GET/POST /api/v1/tenants`, `GET /api/v1/tenants/:id`, `GET/POST /api/v1/tenants/:id/members`. `GET /health`, `GET /ready`, `POST /internal/m00-ping` tidak pakai envelope. `GET /ready` adds `perf` (`worker_concurrency/db_pool_max/redis_mode single|cluster/retention_enabled/retention_days`, no secrets).

## 13. Pagination

Recommended canonical shape:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "per_page": 25,
    "total": 0
  }
}
```

## 13. Required HTTP Behaviors

- `401` invalid/missing credentials
- `403` valid credentials but blocked by policy/tenant access
- `404` tenant-scoped resource not found
- `409` idempotency or state conflict
- `422` validation error
- `429` rate limit
- `5xx` unexpected internal/provider gateway issue where appropriate
