# Portlane — Module Boundaries

Related: [documentation index](../../README.md)

## 1. Core Modules

```text
apps/api/src/modules/
├── auth/
├── tenants/
├── api-keys/ (+ ip.ts, rateLimit.ts, ssrf.ts di lib/ — belum access-control/)
├── providers/
│   ├── core/
│   ├── telegram/
│   ├── discord/
│   ├── smtp/
│   └── webhook/
├── destinations/
├── messaging/
├── delivery/
├── webhooks/
├── observability/
├── inbound/
```

`users/, access-control/, settings/` belum ada sebagai modul (tersebar). `inbound/` tambahan di luar peta awal.

## 2. Ownership Rules

### Auth
Owns login/session/token mechanics.

### Tenants
Owns tenant lifecycle and memberships.

### API Keys
Owns machine credentials, hashing, revocation, last-used tracking.

### Access Control
Owns IP allowlists, CIDR matching, rate limit policies, trusted-proxy resolution policy.

### Providers/Core
Owns provider registry, capability declarations, adapter contracts, common provider errors.

### Provider Modules
Own provider-specific configuration validation, client implementation, payload mapping, and error mapping.

### Destinations
Owns reusable tenant-scoped targets.

### Messaging
Owns canonical messages and broadcast fan-out intent.

### Delivery
Owns queue dispatch, delivery lifecycle, retries, delivery attempts, dead-letter handling.

### Webhooks
Owns inbound endpoint definitions, event persistence, secret verification orchestration, forwarding.

### Observability
Owns user-facing logs and operational summaries.

## 3. Critical Boundary

Provider modules must **not** own:

- global retry policy
- delivery state machine
- queue policy
- tenant authorization
- API key validation
- global rate limiting
- delivery observability model

They only answer: **how does this provider send or receive?**

## 4. Dependency Direction

Preferred dependency direction:

```text
Controllers
   ↓
Application Services
   ↓
Domain/Core Contracts
   ↓
Infrastructure Adapters
```

Provider modules implement core contracts, not the other way around.
