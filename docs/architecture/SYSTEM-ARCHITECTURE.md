# Portlane — System Architecture

Related: [documentation index](../../README.md)

## 1. Architectural Style

Portlane V1 uses a **modular monolith**.

Reasons:

- Product scope is intentionally small.
- Shared transactional boundaries remain simple.
- Provider modules can stay isolated without distributed-system overhead.
- A provider or worker may be extracted later if scale requires it.

## 2. Logical Architecture

```text
                ┌─────────────────────┐
                │   Web Dashboard     │
                └─────────┬───────────┘
                          │
                ┌─────────▼───────────┐
                │      API Layer      │
                └─────────┬───────────┘
                          │
          ┌───────────────▼────────────────┐
          │        Portlane Core           │
          │                                │
          │ Auth / Tenants / API Keys      │
          │ Messaging / Delivery           │
          │ Webhooks / Observability       │
          └───────────────┬────────────────┘
                          │
                    Queue / Jobs
                          │
                ┌─────────▼───────────┐
                │   Delivery Worker   │
                └─────────┬───────────┘
                          │
                Provider Adapter Layer
            ┌─────────┬───────┬───────┬─────────┐
            ▼         ▼       ▼       ▼
        Telegram   Discord   SMTP   Webhook
```

## 3. Core Components

### API
Responsible for authentication, request validation, authorization, persistence entry points, and returning canonical responses.

### PostgreSQL
System of record for users, tenants, provider metadata, destinations, messages, deliveries, delivery attempts, API keys, webhook events, and security policies.

### Redis
Used for queueing, retry scheduling, rate limit counters, and short-lived coordination.

### Worker
Consumes delivery jobs and invokes provider adapters.

### Provider Adapters
Translate Portlane's canonical contracts to external provider contracts.

## 4. Request Boundary

All external API requests pass through:

```text
Trusted Proxy Resolution
      ↓
Source IP Resolution
      ↓
API Key Authentication
      ↓
IP Allowlist Check
      ↓
Rate Limit
      ↓
Tenant Authorization
      ↓
Request Validation
      ↓
Application Service
```

## 5. Outbound Message Flow

```text
Client App
  ↓
POST /messages
  ↓
Authenticate + IP Policy
  ↓
Create Message
  ↓
Create Deliveries
  ↓
Enqueue Jobs
  ↓
Worker
  ↓
Provider Adapter
  ↓
External Provider
  ↓
Update Delivery
```

## 6. Inbound Webhook Flow

```text
External Sender
  ↓
Webhook Endpoint
  ↓
Resolve Endpoint
  ↓
IP Allowlist
  ↓
Secret/Signature Verification
  ↓
Persist Event
  ↓
Forward Job
  ↓
Configured Destination
  ↓
Persist Result
```

## 7. Data Isolation

Every tenant-owned record must either:

- include `tenant_id` directly, or
- be resolved only through a tenant-owned aggregate with server-side ownership validation.

For high-risk resources, direct `tenant_id` is preferred for auditing and filtering.

## 8. Scaling Path

Scale in this order:

1. More worker processes.
2. Dedicated queue names by provider.
3. Provider-specific concurrency limits.
4. Read replicas / partitioning if required.
5. Only then consider extracting heavy provider workers.

Do not introduce microservices in V1.
