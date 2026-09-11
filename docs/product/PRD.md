# Portlane — Product Requirements Document

Related: [documentation index](../../README.md)

## 1. Product Overview

**Product name:** Portlane  
**Product type:** Multi-tenant communication gateway / broadcaster / proxy  
**Version:** V1

Portlane is a centralized gateway that allows applications to send and receive communications through multiple providers without implementing provider-specific integrations in every client application.

Initial providers:

- Telegram
- Discord
- SMTP / Email
- Generic Webhook

Portlane exposes one canonical API, manages provider credentials, routes deliveries, performs retries, records delivery history, and isolates resources per tenant.

## 2. Problem Statement

Without Portlane, every application must independently implement provider SDKs, authentication, retry logic, logging, credentials, webhook handling, and operational monitoring.

Portlane centralizes those responsibilities.

```text
App A ─┐
App B ─┼── Portlane ── Telegram
App C ─┘             ├─ Discord
                     ├─ SMTP
                     └─ Webhook
```

## 3. Goals

V1 must:

1. Support user registration and login.
2. Allow one user to belong to multiple tenants.
3. Support multiple provider connections per tenant.
4. Allow multiple destinations per provider connection.
5. Allow external applications to authenticate using tenant API keys.
6. Support IP whitelist rules per API key and webhook endpoint.
7. Accept one canonical message contract.
8. Fan out one message into multiple independent deliveries.
9. Process deliveries asynchronously through a queue.
10. Retry transient failures.
11. Mark exhausted deliveries as dead-letter.
12. Allow manual retry.
13. Provide delivery logs and operational visibility.
14. Receive generic incoming webhooks.
15. Keep provider integrations modular.

## 4. Product Principles

### 4.1 Provider Agnostic

Applications integrate with Portlane, not with Telegram, Discord, SMTP, or any other provider.

### 4.2 Simple Product

V1 does only:

```text
Connect
Receive
Validate
Queue
Dispatch
Deliver
Retry
Observe
```

### 4.3 Modular Provider Design

Provider-specific behavior must be isolated behind provider adapters.

### 4.4 Multi-Tenant by Design

All business resources must be scoped to a tenant.

### 4.5 Security Before Convenience

API authentication, IP filtering, tenant authorization, secure credential storage, and rate limiting are mandatory boundaries.

## 5. Core Entities

- User
- Tenant
- Tenant Membership
- API Key
- IP Allowlist Entry
- Provider Definition
- Provider Connection
- Destination
- Message
- Delivery
- Delivery Attempt
- Webhook Endpoint
- Webhook Event

## 6. User and Tenant Model

```text
User
  ↓
Tenant Membership
  ↓
Tenant
  ↓
Resources
```

Minimum roles:

- OWNER
- MEMBER

V1 does not require complex RBAC.

## 7. Provider Model

A **Provider Definition** describes a supported transport such as `telegram`, `discord`, `smtp`, or `webhook`.

A **Provider Connection** is a tenant-owned configured instance of a provider.

Example:

```text
Tenant: Trading Workspace

Provider Connections:
├── Telegram / Production Bot
├── Telegram / Development Bot
├── SMTP / Transactional Mail
└── Discord / Engineering
```

## 8. Provider Capabilities

Provider modules declare supported capabilities.

Possible capabilities:

- SEND_MESSAGE
- RECEIVE_WEBHOOK
- SEND_HTML
- SEND_MEDIA
- BUTTONS
- EMBEDS
- CUSTOM_HEADERS

Core logic must never assume all providers support the same features.

## 9. Destination

A destination represents a concrete delivery target under a provider connection.

Examples:

- Telegram chat ID
- Discord channel/webhook target
- Email address
- HTTP URL

## 10. Canonical Message

Canonical messages are provider-independent.

Example:

```json
{
  "subject": "Production Alert",
  "body": "Production API is unavailable."
}
```

Provider adapters translate the canonical message into provider-specific payloads.

## 11. Sending Messages

Primary endpoint:

```text
POST /api/v1/messages
```

Example conceptual request:

```json
{
  "destinations": [
    "dst_telegram_prod",
    "dst_discord_alert",
    "dst_email_admin"
  ],
  "message": {
    "subject": "Server Alert",
    "body": "Production API is unavailable."
  }
}
```

Flow:

```text
API Key Authentication
        ↓
IP Allowlist Check
        ↓
Tenant Authorization
        ↓
Request Validation
        ↓
Persist Message
        ↓
Create Deliveries
        ↓
Queue
        ↓
Provider Adapters
```

## 12. Broadcast

Broadcast is simply one message fan-out to many destinations.

There is no visual workflow engine in V1.

Each resulting delivery is independent.

## 13. Delivery Lifecycle

Normal path:

```text
QUEUED
  ↓
PROCESSING
  ↓
DELIVERED
```

Failure path:

```text
PROCESSING
  ↓
FAILED
  ↓
RETRYING
  ↓
DELIVERED
```

or:

```text
RETRYING
  ↓
DEAD
```

Minimum statuses:

- QUEUED
- PROCESSING
- DELIVERED
- FAILED
- RETRYING
- DEAD

## 14. Retry and Dead Letter

Retry policy belongs to the Delivery Core, not provider modules.

Transient errors may be retried with exponential or staged backoff.

Permanent failures must not be retried indefinitely.

When retry limits are exhausted, delivery becomes `DEAD`.

Dead deliveries remain inspectable and can be manually retried.

## 15. Idempotency

Message submission supports an `Idempotency-Key`.

The same tenant + API key + idempotency key combination must not create duplicate messages unintentionally.

## 16. API Keys

Each tenant may create multiple API keys, e.g.:

- Production
- Development
- Internal Service

API keys must support:

- create
- revoke
- active/inactive state
- last-used timestamp
- optional rate limit
- optional IP allowlist
- one-time secret display

Secrets should be stored as irreversible hashes when retrieval is not required.

## 17. IP Whitelist / Allowlist

IP allowlisting is an optional defense layer.

Supported rules:

- IPv4
- IPv6
- CIDR ranges

Allowlist may be configured per:

- tenant API key
- incoming webhook endpoint

Example:

```text
103.10.20.30
10.10.0.0/16
2001:db8::/32
```

IP allowlisting does not replace authentication, webhook secrets, signatures, or rate limiting.

## 18. Incoming Webhooks

Portlane supports generic incoming webhook endpoints.

Flow:

```text
External System
     ↓
Portlane Endpoint
     ↓
IP Allowlist
     ↓
Secret / Signature Validation
     ↓
Persist Event
     ↓
Forward
     ↓
Log Result
```

V1 supports:

- request ingestion
- optional secret validation
- optional IP filtering
- payload storage
- forwarding
- retry
- logs

No workflow builder is included.

## 19. Initial Provider Modules

### Telegram
- Bot token configuration
- Test connection
- Text message sending
- Destination using chat ID
- Error mapping

### Discord
- Webhook or bot-based connection
- Test connection
- Message sending
- Destination configuration
- Error mapping

### SMTP
- Host
- Port
- Authentication
- TLS configuration
- Sender identity
- Email delivery
- Test connection

### Generic Webhook
- URL
- HTTP method
- Headers
- Authentication/secret
- Timeout
- Payload delivery
- Response logging

## 20. Queue

Outbound messages must be delivered asynchronously.

```text
POST /messages
   ↓
Persist
   ↓
Queue
   ↓
Worker
   ↓
Provider
```

API response may return once dispatch is successfully queued.

## 21. Dashboard

V1 navigation:

```text
Overview
Providers
Destinations
Messages
Webhooks
Logs
Settings
```

## 22. Security Requirements

Minimum V1 requirements:

- Password hashing
- Tenant isolation
- API key authentication
- API key hashing
- IP allowlist / CIDR checks
- Credential encryption
- Rate limiting
- Request size limits
- Webhook secret/signature validation where configured
- Sensitive payload masking
- Secure error responses
- Audit timestamps
- Safe proxy/IP resolution configuration

## 23. Observability

Every delivery must capture:

- tenant_id
- message_id
- provider_connection_id
- destination_id
- status
- attempt_count
- timestamps
- duration
- provider response reference where safe
- error code
- error message

Every blocked request due to IP policy should be observable without exposing secrets.

## 24. Non-Goals V1

Explicitly out of scope:

- Visual workflow builder
- n8n/Zapier replacement
- AI agents
- Arbitrary code execution
- Complex conditional workflows
- Scheduler automation engine
- Complex RBAC
- Billing
- Subscription plans
- Provider marketplace
- Microservices
- Advanced analytics
- WhatsApp
- SMS
- Slack
- Push notifications

## 25. Success Criteria

V1 is accepted when:

1. User can register/login.
2. User can own/join multiple tenants.
3. Tenant can create/revoke API keys.
4. API key can be restricted by IP/CIDR.
5. Tenant can configure Telegram, Discord, SMTP, and Webhook connections.
6. Provider connections can be tested.
7. Destinations can be created.
8. External app can submit a message.
9. One message can produce multiple deliveries.
10. Delivery occurs asynchronously.
11. Failed delivery retries.
12. Exhausted delivery becomes dead.
13. Manual retry works.
14. Delivery logs are visible.
15. Incoming webhook can be received and forwarded.
16. Webhook endpoint IP allowlist works.
17. Tenant boundaries cannot be bypassed.
18. Provider secrets are not exposed in logs.
19. Provider modules remain isolated from messaging core.
20. New providers can be added without redesigning core delivery flow.

## 26. Product Boundary

A feature belongs in V1 only if it directly supports:

```text
Connect
Send
Receive
Deliver
Retry
Observe
Secure
```
