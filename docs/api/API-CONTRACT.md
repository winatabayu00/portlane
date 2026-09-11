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

## 2. Standard Error Shape

```json
{
  "error": {
    "code": "IP_NOT_ALLOWED",
    "message": "Request source is not allowed for this API key.",
    "request_id": "req_xxx"
  }
}
```

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

Response:

```json
{
  "data": {
    "id": "msg_123",
    "status": "queued",
    "deliveries": [
      {
        "id": "dlv_1",
        "destination_id": "dst_123",
        "status": "QUEUED"
      },
      {
        "id": "dlv_2",
        "destination_id": "dst_456",
        "status": "QUEUED"
      }
    ]
  }
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
### POST /api-keys
### POST /api-keys/:id/revoke

Creation response is the only time the full secret is shown.

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
