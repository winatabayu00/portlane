# Portlane — API Contract

Related: [documentation index](../../README.md)

Base path:

```text
/api/v1
```

## 1. Authentication

Machine API:

```http
Authorization: Bearer <portlane_api_key>
```

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

`meta` present only on paginated endpoints. `201 Created` uses `rc: 2001`.

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

### POST /messages

```json
{
  "destinations": [
    "dst_123",
    "dst_456"
  ],
  "message": {
    "subject": "Production Alert",
    "body": "API unavailable.",
    "metadata": {
      "severity": "critical"
    }
  }
}
```

Response (`201`, `rc: 2001`):

```json
{
  "rc": 2001,
  "status": "success",
  "message": "Resource created successfully",
  "data": {
    "id": "msg_123",
    "status": "queued",
    "deliveries": [
      { "id": "dlv_1", "destination_id": "dst_123", "status": "QUEUED" },
      { "id": "dlv_2", "destination_id": "dst_456", "status": "QUEUED" }
    ]
  },
  "errors": null,
  "correlationId": "req_xxx",
  "timestamp": "2026-03-07T00:00:00.000Z"
}
```

### GET /messages

Tenant-scoped paginated history.

### GET /messages/:id

Returns message + deliveries.

## 4. Deliveries

### GET /deliveries/:id

Returns delivery details and attempts.

### POST /deliveries/:id/retry

Allowed only for eligible failed/dead deliveries.

## 5. Provider Connections

### GET /providers

Returns installed provider definitions and capabilities.

### GET /provider-connections

### POST /provider-connections

### PATCH /provider-connections/:id

### DELETE /provider-connections/:id

### POST /provider-connections/:id/test

Secrets must be write-only in normal responses.

## 6. Destinations

### GET /destinations
### POST /destinations
### GET /destinations/:id
### PATCH /destinations/:id
### DELETE /destinations/:id

## 7. API Keys

### GET /api-keys

Returns `id, tenant_id, name, key_prefix, status, last_used_at, created_at, revoked_at, expires_at, scopes, allowed_destination_ids, allowed_providers`. `scopes/allowed_*` empty = unrestricted. Fallback maps legacy rows to `null/[]` when migration `003` not yet applied.

### POST /api-keys

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

### PATCH /api-keys/:id

Updatable: `name, expires_at, scopes, allowed_destination_ids, allowed_providers`. Same validation as create. `expires_at: null` clears expiry. Returns updated row.

### POST /api-keys/:id/revoke

Marks `revoked`. Subsequent machine auth `401`.

### DELETE /api-keys/:id

Hard delete. Requires `revoked` first else `422 Revoke key before delete.` Cascades `ip_allowlist_entries` for that key scope. `204` on success.

Machine auth enforcement (applies to `POST /messages` and all `Authorization: Bearer pl_live_…` paths):

- `401 API key expired.` when `expires_at <= now`
- `403 API key scope not allowed: messages:write required.` when `scopes` non-empty and lacking required scope
- `403 Destination not allowed for this API key: …` when `allowed_destination_ids` non-empty and request contains outside set
- `403 Provider not allowed for this API key: …` when `allowed_providers` non-empty and destination provider outside set

## 8. API Key IP Allowlist

### GET /api-keys/:id/ip-allowlist
### POST /api-keys/:id/ip-allowlist
### DELETE /api-keys/:id/ip-allowlist/:entryId

Request:

```json
{
  "cidr": "103.10.20.30/32",
  "description": "Production server"
}
```

## 9. Incoming Webhooks

Public endpoint example:

```text
POST /hooks/:publicIdentifier
```

This endpoint is not authenticated by tenant API key.

Security may use:

- IP allowlist
- endpoint secret
- signature verification

## 10. Webhook Management

### GET /webhook-endpoints
### POST /webhook-endpoints
### PATCH /webhook-endpoints/:id
### DELETE /webhook-endpoints/:id

### GET /webhook-events
### GET /webhook-events/:id
### POST /webhook-events/:id/retry

## 11. Webhook IP Allowlist

### GET /webhook-endpoints/:id/ip-allowlist
### POST /webhook-endpoints/:id/ip-allowlist
### DELETE /webhook-endpoints/:id/ip-allowlist/:entryId

## 11b. Inbound Logs

### GET /tenants/:tenantId/inbound?method=&status=&page=&per_page=

Tenant-scoped via JWT. `status` integer HTTP code, invalid → `422`. Returns `meta` pagination envelope.

### GET /tenants/:tenantId/inbound/:logId

Tenant-scoped. Missing → `404` envelope (`errors.code: NOT_FOUND`).

## 12. Pagination

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
