# Portlane — Implementation Milestones

Related: [documentation index](../../README.md)

The project should be implemented incrementally.

## M00 — Foundation

Goal: establish project baseline.

Deliverables:

- repository structure
- environment configuration
- database
- Redis
- queue worker baseline
- health endpoint
- lint/test/typecheck pipeline

Exit criteria:

- app boots
- DB migration works
- queue job can be executed
- CI checks pass

## M01 — Identity and Tenant Boundary

Deliverables:

- users
- auth
- tenants
- memberships
- tenant switch/access enforcement

Exit criteria:

- user can access own tenant
- cross-tenant access tests fail safely

## M02 — API Keys and IP Access Control

Deliverables:

- API key creation/revocation
- secret hashing
- source IP resolution
- trusted proxy configuration
- IP/CIDR allowlist
- blocked request logging

Exit criteria:

- authorized IP passes
- non-allowed IP receives 403
- spoofed forwarding header cannot bypass configured trust boundary

## M03 — Provider Core

Deliverables:

- provider registry
- provider contract
- capability model
- provider connection persistence
- credential encryption abstraction
- test connection command

Exit criteria:

- dummy provider can implement contract without core changes

## M04 — Initial Providers

Deliverables:

- Telegram
- Discord
- SMTP
- Generic Webhook outbound

Exit criteria:

- each connection can be validated/tested
- provider errors normalize into common format

## M05 — Destinations

Deliverables:

- destination CRUD
- provider-specific destination validation
- tenant ownership rules

Exit criteria:

- destination can be safely resolved for a tenant

## M06 — Messaging and Broadcast

Deliverables:

- canonical message
- POST /messages
- idempotency
- fan-out to deliveries
- queue dispatch

Exit criteria:

- one API call can queue multiple independent deliveries

## M07 — Delivery Runtime

Deliverables:

- worker processing
- state transitions
- delivery attempts
- retry policy
- dead-letter state
- manual retry

Exit criteria:

- transient and permanent failure paths verified

## M08 — Incoming Webhooks

Deliverables:

- webhook endpoints
- endpoint secrets/signature mode
- IP allowlist
- event persistence
- forwarding
- retry

Exit criteria:

- inbound webhook securely reaches configured forward destination

## M09 — Dashboard

Deliverables:

- Overview
- Providers
- Destinations
- Messages
- Delivery Detail
- Webhooks
- Logs
- Settings/API Keys/IP Rules

Exit criteria:

- primary operational workflow can be completed without database access

## M10 — Security Hardening

Deliverables:

- request limits
- log masking
- SSRF defense for outbound webhook
- credential rotation considerations
- rate limit verification
- security event audit records

Exit criteria:

- security acceptance suite passes

## M11 — E2E Verification and V1 Release

Required E2E scenarios:

1. Create tenant.
2. Create API key.
3. Restrict API key by IP.
4. Create provider connection.
5. Create destination.
6. Submit broadcast.
7. Process successful delivery.
8. Process retryable failure.
9. Reach dead state.
10. Manual retry.
11. Receive inbound webhook.
12. Reject wrong IP.
13. Reject cross-tenant resource access.

Release only after these flows are verified.
