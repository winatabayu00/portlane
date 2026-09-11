# Portlane Documentation

Portlane is a multi-tenant communication gateway that acts as a third-party proxy/broadcaster between client applications and communication providers such as Telegram, Discord, SMTP/Email, and generic webhooks.

## V1 Scope

Portlane focuses on:

- User authentication
- Multi-tenant isolation
- Tenant API keys
- IP whitelist / CIDR access control
- Modular provider connections
- Destinations
- Canonical messages
- Broadcast fan-out
- Asynchronous delivery
- Retry and dead-letter handling
- Delivery observability
- Incoming generic webhooks
- Secure credential storage

Portlane is **not** a workflow automation platform, n8n replacement, Zapier replacement, AI orchestration platform, or arbitrary code execution system.

## Documentation Map

- [Product requirements](docs/product/PRD.md)
- Architecture: [system](docs/architecture/SYSTEM-ARCHITECTURE.md), [module boundaries](docs/architecture/MODULE-BOUNDARIES.md), [delivery flow](docs/architecture/DELIVERY-FLOW.md)
- [Data model](docs/data/DATA-MODEL.md) and [API contract](docs/api/API-CONTRACT.md)
- Providers: [contract](docs/providers/PROVIDER-CONTRACT.md), [Telegram](docs/providers/TELEGRAM.md), [Discord](docs/providers/DISCORD.md), [SMTP](docs/providers/SMTP.md), [Webhook](docs/providers/WEBHOOK.md)
- [Security](docs/security/SECURITY.md), [UI/UX](docs/frontend/UI-UX.md), [acceptance criteria](docs/testing/ACCEPTANCE-CRITERIA.md), and [milestones](docs/implementation/MILESTONES.md)

## Core Rule

Client applications talk to Portlane's canonical API, not directly to provider-specific contracts.

```text
Client Application
        ↓
     Portlane
        ↓
Canonical Message
        ↓
Delivery Core
        ↓
Provider Adapter
        ↓
Telegram / Discord / SMTP / Webhook
```
