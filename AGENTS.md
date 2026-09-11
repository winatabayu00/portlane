# AGENTS.md

# Portlane — Coding Agent Instructions

## 1. Purpose

This file defines the mandatory operating rules for any AI coding agent working inside the **Portlane** repository.

Portlane is a multi-tenant communication gateway that centralizes:

* outbound notifications
* broadcasting
* incoming webhooks
* provider integrations
* delivery processing
* retries
* observability
* access control

Initial supported providers:

* Telegram
* Discord
* SMTP / Email
* Generic HTTP Webhook

Portlane acts as a gateway between client applications and communication providers.

```text
Client Application
        ↓
     Portlane
        ↓
Canonical Message
        ↓
Delivery Runtime
        ↓
Provider Adapter
        ↓
External Provider
```

All implementation decisions MUST preserve this architecture.

---

# 2. Source of Truth

Before making implementation changes, read the relevant documentation.

Primary documentation hierarchy:

```text
docs/

product/
└── PRD.md

architecture/
├── SYSTEM-ARCHITECTURE.md
├── MODULE-BOUNDARIES.md
└── DELIVERY-FLOW.md

data/
└── DATA-MODEL.md

api/
└── API-CONTRACT.md

providers/
├── PROVIDER-CONTRACT.md
├── TELEGRAM.md
├── DISCORD.md
├── SMTP.md
└── WEBHOOK.md

security/
└── SECURITY.md

frontend/
└── UI-UX.md

testing/
└── ACCEPTANCE-CRITERIA.md

implementation/
└── MILESTONES.md
```

Priority when documents appear to conflict:

```text
1. Explicit user instruction
2. PRD
3. Security specification
4. Architecture specification
5. API contract
6. Data model
7. Provider specification
8. Implementation milestone
9. Existing implementation
```

Do not silently reinterpret requirements.

If existing code conflicts with the documented architecture, treat the discrepancy as a gap that must be explicitly reported.

---

# 3. Product Boundary

Portlane is intentionally a simple communication gateway.

V1 responsibilities:

```text
Connect
Receive
Validate
Authenticate
Authorize
Queue
Dispatch
Deliver
Retry
Observe
Secure
```

Portlane V1 is NOT:

* an n8n replacement
* a Zapier replacement
* a visual workflow platform
* an AI agent platform
* an arbitrary automation engine
* an arbitrary code execution environment
* a general event-processing platform
* a microservice ecosystem

Do not introduce those concepts without explicit approval.

---

# 4. Core Product Model

The main relationship is:

```text
User
  ↓
Tenant Membership
  ↓
Tenant
  │
  ├── API Keys
  ├── IP Allowlist
  ├── Provider Connections
  ├── Destinations
  ├── Messages
  ├── Deliveries
  └── Webhook Endpoints
```

Provider relationship:

```text
Provider Definition
        ↓
Provider Connection
        ↓
Destination
```

Messaging relationship:

```text
Message
   ↓
Delivery
   ↓
Provider Connection
   ↓
Provider Adapter
```

One message may create multiple independent deliveries.

---

# 5. Architecture Rule

Portlane V1 MUST remain a:

> Modular Monolith

Do not split provider implementations into standalone microservices unless explicitly requested.

Preferred logical structure:

```text
src/
└── modules/
    ├── auth/
    ├── users/
    ├── tenants/
    ├── api-keys/
    ├── access-control/
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
    └── settings/
```

Exact file placement may follow the existing codebase conventions, but module boundaries must remain equivalent.

---

# 6. Core vs Provider Responsibility

This is one of the most important rules in Portlane.

## Core owns

The core application owns:

* authentication
* tenant authorization
* API keys
* IP allowlists
* canonical messages
* destinations
* delivery state
* queues
* retries
* dead-letter handling
* rate limits
* idempotency
* delivery logging
* observability

## Provider modules own

Provider modules own only provider-specific behavior:

* configuration validation
* provider SDK/client
* credential usage
* provider payload mapping
* connection test
* provider-specific capabilities
* provider error mapping

Example provider module:

```text
providers/
└── telegram/
    ├── telegram.adapter
    ├── telegram.client
    ├── telegram.config
    ├── telegram.validator
    ├── telegram.mapper
    └── telegram.module
```

Do NOT create duplicated core functionality such as:

```text
TelegramRetryService
DiscordRetryService
SmtpRetryService
WebhookRetryService
```

There should instead be a shared:

```text
DeliveryRetryService
```

with provider-specific errors normalized through adapters.

---

# 7. Provider Contract

All outbound providers must comply with the common provider contract.

Conceptually:

```ts
interface ProviderAdapter {
  key(): string;

  capabilities(): ProviderCapability[];

  validateConfiguration(
    configuration: unknown
  ): ValidationResult;

  testConnection(
    context: ProviderContext
  ): Promise<TestResult>;

  send(
    context: ProviderContext,
    destination: CanonicalDestination,
    message: CanonicalMessage
  ): Promise<ProviderSendResult>;

  mapError(
    error: unknown
  ): ProviderError;
}
```

Exact language syntax may differ from the repository implementation.

The architectural contract must not.

---

# 8. Provider-Agnostic Core

The messaging core MUST NOT contain logic such as:

```text
if provider == telegram
if provider == discord
if provider == smtp
```

for provider-specific behavior.

Prefer:

```text
ProviderRegistry
    ↓
resolve(providerKey)
    ↓
ProviderAdapter
```

Provider selection is acceptable.

Provider-specific behavior inside the messaging or delivery core is not.

---

# 9. Provider Capabilities

Do not assume every provider supports the same functionality.

Examples:

```text
SEND_MESSAGE
SEND_HTML
SEND_MEDIA
RECEIVE_WEBHOOK
BUTTONS
EMBEDS
CUSTOM_HEADERS
```

Capabilities must be declared by the provider module.

Core behavior should check capabilities rather than infer them from provider names.

---

# 10. Multi-Tenant Boundary

Tenant isolation is a critical security property.

Every tenant-owned operation MUST resolve and verify tenant ownership server-side.

Never trust:

```text
tenant_id
provider_connection_id
destination_id
message_id
delivery_id
webhook_endpoint_id
```

just because they came from an authenticated client.

Bad:

```text
findById(destinationId)
```

Preferred:

```text
findOne({
  id: destinationId,
  tenantId: authorizedTenantId
})
```

or equivalent repository behavior.

---

# 11. Explicit Tenant Scope

Important business entities should include explicit tenant scope where practical.

Examples:

```text
api_keys
provider_connections
destinations
messages
deliveries
delivery_attempts
webhook_endpoints
webhook_events
ip_allowlist_entries
```

Do not rely exclusively on deeply nested relationships to determine tenant ownership.

---

# 12. Cross-Tenant Security

The following MUST be impossible:

```text
Tenant A
    ↓
uses provider connection from Tenant B

Tenant A
    ↓
sends to destination from Tenant B

Tenant A
    ↓
reads message from Tenant B

Tenant A
    ↓
retries delivery from Tenant B

Tenant A
    ↓
reads webhook payload from Tenant B
```

Every resource access path requires test coverage for cross-tenant denial.

---

# 13. User and Membership Model

Do not model tenant ownership only as:

```text
tenants.user_id
```

Use membership semantics.

Conceptually:

```text
users

tenants

tenant_memberships
- tenant_id
- user_id
- role
```

V1 minimum roles:

```text
OWNER
MEMBER
```

Do not introduce complex RBAC unless explicitly required.

---

# 14. API Key Rules

Tenant API keys are machine credentials.

Each tenant may have multiple keys.

Example:

```text
Production API
Development API
Internal Service
```

API keys must support:

* creation
* revocation
* active/inactive state
* last-used tracking
* optional IP allowlist
* optional rate policy

The full API key secret must only be returned when initially created.

If retrieval is unnecessary, store the secret as a secure irreversible hash.

---

# 15. IP Allowlist

Portlane supports IP access restrictions.

Allowlist scopes:

```text
API Key
Webhook Endpoint
```

Must support:

```text
IPv4
IPv6
CIDR
```

Examples:

```text
103.10.20.30/32
10.10.0.0/16
2001:db8::/32
```

Do NOT implement IP matching using plain string comparison.

Use a proper IP/CIDR parser or database network type.

---

# 16. Trusted Proxy Security

Never blindly trust:

```text
X-Forwarded-For
X-Real-IP
```

The server must only trust forwarding headers from explicitly trusted proxies.

Otherwise an attacker could spoof an allowlisted source IP.

Source IP resolution must follow:

```text
Request
   ↓
Trusted Proxy Policy
   ↓
Resolved Client IP
   ↓
IP Allowlist
```

This rule is mandatory.

---

# 17. API Request Security Flow

Protected machine API requests should conceptually follow:

```text
Request
  ↓
Resolve Client IP
  ↓
Authenticate API Key
  ↓
Check Key Status
  ↓
Check IP Allowlist
  ↓
Apply Rate Limit
  ↓
Resolve Tenant
  ↓
Authorize Resource Ownership
  ↓
Validate Request
  ↓
Execute Application Logic
```

Do not move business processing ahead of access validation.

---

# 18. Incoming Webhook Security Flow

Incoming webhook requests should conceptually follow:

```text
Request
  ↓
Resolve Webhook Endpoint
  ↓
Resolve Client IP
  ↓
Check IP Allowlist
  ↓
Validate Secret / Signature
  ↓
Apply Rate Limit
  ↓
Validate Payload
  ↓
Persist Event
  ↓
Queue Forwarding
```

IP allowlisting is an additional security layer.

It does NOT replace:

* webhook secrets
* provider signatures
* authentication
* rate limiting

---

# 19. Credential Security

Credentials that need to be reused must be encrypted at rest.

Examples:

* Telegram bot token
* SMTP password
* Discord token
* webhook authentication secret

Requirements:

```text
database
    ↓
encrypted credential
```

Encryption keys MUST live outside the database.

Never log credential plaintext.

Never include stored credentials in normal API responses.

---

# 20. Secret Redaction

Never log:

* API key secrets
* Authorization headers
* SMTP passwords
* Telegram bot tokens
* Discord tokens
* webhook secrets
* cookies
* session credentials

Responses and logs should expose only redacted forms when needed.

Example:

```text
pl_live_abcd************
```

---

# 21. Canonical Message

Client applications send Portlane canonical messages.

Example:

```json
{
  "subject": "Production Alert",
  "body": "Production API is unavailable."
}
```

Client applications should not need to know Telegram or Discord request structures.

Provider adapters translate canonical messages into external provider payloads.

---

# 22. Messaging Flow

Message submission should conceptually follow:

```text
POST /api/v1/messages
       ↓
Authentication
       ↓
IP Access Control
       ↓
Tenant Authorization
       ↓
Validate Destinations
       ↓
Idempotency Check
       ↓
Persist Message
       ↓
Create Deliveries
       ↓
Enqueue
       ↓
Return
```

External provider requests must not block the initial HTTP request unless explicitly required.

---

# 23. Broadcast Semantics

Broadcast means:

> One canonical message creates multiple independent deliveries.

Example:

```text
Message
├── Telegram Delivery
├── Discord Delivery
└── Email Delivery
```

A failed email delivery must not make a successful Telegram delivery fail.

Do not create a workflow engine around broadcasting.

---

# 24. Delivery State Machine

Minimum lifecycle:

```text
QUEUED
  ↓
PROCESSING
  ↓
DELIVERED
```

Failure:

```text
PROCESSING
  ↓
FAILED
  ↓
RETRYING
```

Retry success:

```text
RETRYING
  ↓
DELIVERED
```

Retry exhaustion:

```text
RETRYING
  ↓
DEAD
```

Do not introduce undocumented statuses casually.

---

# 25. Delivery Attempts

Every delivery retry must preserve attempt history.

A delivery attempt should include operational data such as:

```text
attempt_number
started_at
finished_at
duration
provider_status
provider_reference
normalized_error
safe_response
```

Do not overwrite previous attempts.

---

# 26. Retry Ownership

Retry behavior belongs to Delivery Core.

Providers only classify errors.

Example normalized error:

```json
{
  "code": "PROVIDER_RATE_LIMITED",
  "message": "Provider rate limit exceeded.",
  "retryable": true
}
```

Delivery Core decides:

```text
retry?
when?
how many attempts?
when DEAD?
```

---

# 27. Retry Safety

Queues commonly provide at-least-once execution semantics.

Assume jobs may execute more than once.

Implementation must consider:

* duplicate workers
* worker crash
* retry after timeout
* queue redelivery
* partially completed execution

Use appropriate:

* transactional state transitions
* row locking
* unique constraints
* idempotency
* atomic operations

where required.

---

# 28. Idempotency

Message creation must support:

```text
Idempotency-Key
```

Repeated requests using the same valid idempotency context must not unintentionally create duplicate messages.

Idempotency must be tenant-scoped.

Do not implement a global idempotency key namespace.

---

# 29. Dead Letter

When retry policy is exhausted:

```text
delivery.status = DEAD
```

Dead deliveries must remain:

* inspectable
* traceable
* manually retryable

Do not silently delete failed messages.

---

# 30. Generic Webhook Security

Generic outbound HTTP webhooks introduce SSRF risk.

Do not treat arbitrary outbound URLs as harmless.

Before production readiness, enforce protections against requests to dangerous destinations such as:

```text
localhost
127.0.0.0/8
::1
link-local networks
cloud metadata services
internal infrastructure
```

unless explicitly allowed by configuration and product requirements.

Redirect targets must also be validated if redirects are permitted.

Outbound requests require:

* connection timeout
* response timeout
* response size limit
* redirect policy

---

# 31. Incoming Webhook Payloads

Webhook payloads may contain sensitive information.

Do not automatically expose every header or payload field in logs.

Provide masking/redaction capability.

Avoid storing:

```text
Authorization
Cookie
API keys
signatures
credentials
```

in plaintext logs.

---

# 32. Queue Rule

Outbound communication should be asynchronous.

Preferred flow:

```text
API
 ↓
Database
 ↓
Queue
 ↓
Worker
 ↓
Provider
```

The API should generally return once the delivery has been successfully persisted and queued.

Do not call external providers synchronously inside message creation unless explicitly required.

---

# 33. Transaction Boundary

When creating a message and its deliveries:

```text
Message
+
Delivery records
+
queue dispatch intention
```

must not enter an inconsistent state.

Use safe transaction/outbox/after-commit semantics according to the chosen infrastructure.

Avoid:

```text
database committed
queue silently failed
```

without recovery.

---

# 34. Provider Connection

A provider connection is a configured provider instance owned by a tenant.

Example:

```text
Provider:
telegram

Connection:
Production Trading Bot
```

One tenant may have multiple connections for the same provider.

Do not model provider configuration as a single tenant-level Telegram/SMTP configuration.

---

# 35. Destination

A destination belongs to:

```text
Tenant
+
Provider Connection
```

Examples:

Telegram:

```text
chat_id
```

SMTP:

```text
email_address
```

Discord:

```text
channel/webhook destination
```

Webhook:

```text
HTTP endpoint
```

Provider modules validate their own destination configuration.

---

# 36. Provider Registry

Provider modules must register themselves through a central registry.

Conceptually:

```text
telegram → TelegramAdapter
discord  → DiscordAdapter
smtp     → SmtpAdapter
webhook  → WebhookAdapter
```

Adding a provider should not require editing messaging core logic.

---

# 37. Dashboard Scope

V1 main navigation:

```text
Overview
Providers
Destinations
Messages
Webhooks
Logs
Settings
```

Do not add unnecessary surfaces without requirement.

The product should remain operationally simple.

---

# 38. UI Security

The UI must never show previously stored secret values in plaintext.

Credential edit forms should behave like:

```text
Current credential:
Configured

New credential:
[ optional replacement ]
```

Do not pre-fill secrets into forms.

---

# 39. Operational Observability

Users should be able to answer:

```text
Did the message enter Portlane?

Which tenant sent it?

Which destinations were targeted?

Was it queued?

Which provider processed it?

Was it delivered?

How long did it take?

Why did it fail?

How many times was it retried?
```

If the implementation cannot answer these questions, observability is incomplete.

---

# 40. Error Handling

Prefer normalized domain/application errors.

Example categories:

```text
INVALID_API_KEY
API_KEY_REVOKED
IP_NOT_ALLOWED
RATE_LIMITED
TENANT_ACCESS_DENIED
PROVIDER_CONNECTION_DISABLED
DESTINATION_NOT_FOUND
PROVIDER_AUTH_FAILED
PROVIDER_RATE_LIMITED
PROVIDER_TIMEOUT
DELIVERY_FAILED
```

Do not leak raw provider stack traces to API consumers.

---

# 41. API Contract Stability

Do not casually change existing:

* request shapes
* response shapes
* status codes
* pagination
* identifiers
* error contracts

If a change is necessary:

1. identify affected documentation
2. identify affected clients/tests
3. update contract intentionally
4. report the change

---

# 42. Database Changes

All schema changes must use migrations.

Never manually rely on a local database state.

For every migration consider:

* foreign keys
* indexes
* unique constraints
* tenant-scoped indexes
* nullable behavior
* cascading behavior
* rollback impact

---

# 43. Indexing

High-volume operational tables may include:

```text
messages
deliveries
delivery_attempts
webhook_events
```

Design indexes around real query patterns.

Typical useful combinations may include:

```text
tenant_id + created_at

tenant_id + status

tenant_id + message_id

delivery_id + attempt_number

webhook_endpoint_id + received_at
```

Do not add indexes blindly.

---

# 44. Deletion Rules

Do not casually hard-delete operational history.

Consider retention semantics for:

* messages
* deliveries
* attempts
* webhook events
* API keys
* audit/security logs

Provider connections referenced by historical deliveries may require soft deletion or preservation of historical metadata.

---

# 45. Testing Requirements

Every feature must include appropriate tests.

Minimum categories:

```text
unit
integration
authorization
tenant isolation
failure path
security
```

Critical flows should have E2E coverage.

---

# 46. Required Tenant Tests

For tenant-scoped endpoints, test at minimum:

```text
Tenant A resource
+
Tenant A user
→ allowed

Tenant A resource
+
Tenant B user
→ denied
```

Do this for:

* provider connections
* destinations
* API keys
* messages
* deliveries
* webhook endpoints
* webhook events

---

# 47. Required IP Tests

Test:

* exact IPv4
* IPv4 CIDR
* IPv6
* IPv6 CIDR
* non-matching IP
* disabled allowlist
* malformed CIDR
* trusted proxy behavior
* spoofed forwarding headers

---

# 48. Provider Tests

Each provider module should test:

```text
configuration validation
connection test
payload mapping
successful sending
retryable error mapping
permanent error mapping
secret redaction
```

External provider calls should be mocked/faked in normal automated tests.

---

# 49. Delivery Tests

Verify:

```text
QUEUED → PROCESSING → DELIVERED

PROCESSING → FAILED → RETRYING → DELIVERED

PROCESSING → FAILED → RETRYING → DEAD
```

Also test:

* duplicate worker execution
* manual retry
* disabled provider
* disabled destination
* provider timeout
* provider rate limit

---

# 50. Security Tests

At minimum verify:

* cross-tenant access blocked
* API key secret not stored plaintext
* provider credential not exposed
* blocked IP receives rejection
* rate limiting works
* webhook secret validation works
* SSRF unsafe destination is blocked
* sensitive headers are redacted

---

# 51. Documentation Discipline

When behavior changes, update the relevant documentation in the same change.

Examples:

API change:

```text
docs/api/API-CONTRACT.md
```

Provider behavior:

```text
docs/providers/*
```

Security behavior:

```text
docs/security/SECURITY.md
```

Architecture:

```text
docs/architecture/*
```

Do not allow documentation and implementation to silently diverge.

---

# 52. Milestone Discipline

Implementation milestones are defined in:

```text
docs/implementation/MILESTONES.md
```

Work should proceed milestone-by-milestone unless explicitly instructed otherwise.

Do not implement future milestones opportunistically unless required by the active milestone.

Example:

```text
M02 API Keys
```

should not quietly introduce:

```text
AI workflows
provider marketplace
advanced analytics
```

---

# 53. Scope Creep Rule

Before adding a capability, ask internally:

> Does this directly support Portlane's gateway responsibility?

Valid:

```text
Telegram delivery
SMTP provider
IP allowlist
retry
delivery logging
```

Potential scope creep:

```text
workflow canvas
AI agent
cron automation platform
database actions
script execution
visual event pipeline
```

Do not implement scope creep without explicit requirement.

---

# 54. Dependencies

Before introducing a new dependency:

1. Check whether existing dependencies already solve the problem.
2. Confirm active maintenance.
3. Consider security implications.
4. Consider bundle/runtime cost.
5. Avoid overlapping libraries.
6. Prefer mature libraries for security-sensitive tasks.

Do not add packages merely to save a few lines of simple code.

---

# 55. Package Manager

Use the package manager already declared by the repository.

Do not:

* switch package managers
* create competing lockfiles
* regenerate a lockfile using a different package manager

unless explicitly instructed.

---

# 56. Existing Code

Before implementing a feature:

1. inspect the existing implementation
2. identify relevant modules
3. identify existing abstractions
4. inspect tests
5. inspect migrations/schema
6. inspect documentation
7. determine whether functionality already exists

Do not create duplicate implementations.

---

# 57. No Blind Rewrite

Do not replace large existing modules solely because another structure looks cleaner.

Prefer:

```text
understand
→ identify gap
→ make targeted change
→ test
```

over:

```text
rewrite everything
```

unless a rewrite is explicitly required.

---

# 58. Reuse Existing Patterns

Follow repository conventions for:

* naming
* controllers/routes
* service structure
* validation
* DTO/schema definitions
* repositories
* error handling
* testing
* migrations
* logging

Do not introduce a second architecture inside the same repository.

---

# 59. Avoid Premature Abstraction

Portlane is intentionally simple.

Do not introduce unnecessary:

* CQRS
* event sourcing
* hexagonal layers everywhere
* complex domain aggregates
* internal event bus
* distributed sagas
* microservices
* generic plugin frameworks

unless there is a concrete requirement.

Clean module boundaries are more important than architectural ceremony.

---

# 60. No Hidden Fallback

If provider sending fails, do not silently send through another provider unless explicitly configured.

Example:

```text
Telegram failed
```

must not automatically become:

```text
send email instead
```

without a defined product rule.

---

# 61. No Silent Data Loss

Never silently discard:

* failed deliveries
* webhook events
* queue failures
* provider errors

Failures must remain observable and recoverable where appropriate.

---

# 62. Logging Context

Operational logs should include safe identifiers where relevant:

```text
request_id
tenant_id
message_id
delivery_id
provider_connection_id
webhook_event_id
```

Never include raw credentials.

---

# 63. Correlation IDs

Use or preserve request/correlation identifiers through:

```text
API Request
   ↓
Message
   ↓
Delivery
   ↓
Worker
```

when practical.

This makes debugging distributed asynchronous flows significantly easier.

---

# 64. Time and Timestamps

Store timestamps consistently, preferably UTC internally.

Presentation may convert to user timezone.

Do not mix local server time and UTC unpredictably.

---

# 65. Manual Retry Semantics

Manual retry must:

* verify tenant ownership
* verify delivery state
* preserve previous attempts
* create a new attempt
* not mutate historical attempt records
* respect provider/destination status

---

# 66. Provider Connection Test

Testing a provider connection must not accidentally trigger production messaging unless explicitly intended.

Connection tests should prefer safe provider-specific verification APIs.

---

# 67. Webhook Test

If providing a test webhook delivery action:

* label it clearly as test
* record it as test traffic
* ensure tenant ownership
* apply normal network security rules

---

# 68. Pagination

List endpoints must use bounded pagination.

Do not expose unbounded operational history endpoints.

Messages, deliveries, attempts, and webhook events may grow quickly.

---

# 69. Retention Awareness

Payload-heavy tables can grow rapidly.

Architecture should leave room for future retention policies.

Do not implement automatic destructive retention unless explicitly required.

---

# 70. File and Payload Size

Do not add media/file handling implicitly.

V1 focuses primarily on message delivery.

If media support is added later, explicitly define:

* upload limits
* storage
* retention
* provider constraints
* security scanning

---

# 71. Performance Priorities

Prioritize correctness before optimization.

Likely first scaling pressure:

```text
delivery worker throughput
webhook event volume
delivery history
provider rate limits
```

Scale workers horizontally before redesigning the entire architecture.

---

# 72. No Provider Leakage

Client-facing API should remain canonical.

Avoid requiring client applications to send raw provider payloads such as:

```json
{
  "telegram_parse_mode": "...",
  "discord_embed": "..."
}
```

inside the base messaging contract unless introduced through an explicit and well-contained extension mechanism.

---

# 73. Safe Provider Extensions

If provider-specific extensions become necessary, isolate them.

Example concept:

```json
{
  "message": {
    "subject": "...",
    "body": "..."
  },
  "provider_options": {
    "telegram": {}
  }
}
```

Do not let extensions redefine core message semantics.

V1 should minimize these options.

---

# 74. HTTP Status Semantics

Maintain consistent HTTP behavior.

General expectation:

```text
400 malformed request
401 unauthenticated
403 blocked/forbidden
404 tenant-scoped resource unavailable
409 state/idempotency conflict
422 validation failure
429 rate limited
5xx unexpected server/provider gateway failure
```

Do not expose internal exception details.

---

# 75. Definition of Done

A task is not complete merely because code compiles.

A feature is complete when applicable items are satisfied:

```text
[ ] Requirement implemented
[ ] Tenant boundary enforced
[ ] Security implications addressed
[ ] Validation implemented
[ ] Error handling implemented
[ ] Tests added/updated
[ ] Existing tests pass
[ ] Type checks pass
[ ] Lint passes
[ ] Migration verified
[ ] Documentation updated
[ ] No secrets exposed
[ ] No unrelated scope introduced
```

---

# 76. Coding Agent Workflow

For every implementation task:

## Step 1 — Understand

Read:

```text
AGENTS.md
relevant PRD section
relevant architecture docs
relevant milestone
existing implementation
existing tests
```

## Step 2 — Inspect

Determine:

```text
current behavior
expected behavior
gap
affected modules
security impact
data impact
API impact
```

## Step 3 — Plan

Create a minimal implementation plan.

Do not redesign unrelated modules.

## Step 4 — Implement

Make focused changes that preserve documented boundaries.

## Step 5 — Verify

Run available:

```text
tests
lint
typecheck
build
migration validation
```

Use the repository's declared commands.

## Step 6 — Report

Report:

```text
Implemented
Changed files
Architecture/security decisions
Verification performed
Tests
Known limitations
Remaining gaps
```

Do not claim verification that was not actually performed.

---

# 77. Failure Reporting

If something cannot be verified because infrastructure is unavailable:

Do not mark it as PASS.

Use explicit status such as:

```text
IMPLEMENTED — VERIFICATION BLOCKED
```

and explain why.

Example:

```text
PostgreSQL unavailable.
Migration created but integration test not executed.
```

Never fabricate test results.

---

# 78. Existing Gap Handling

When discovering a pre-existing issue:

1. determine whether it blocks the active task
2. document it
3. fix it only if required or clearly within scope
4. otherwise report it as a gap

Do not silently expand one task into repository-wide cleanup.

---

# 79. Backward Compatibility

Before changing existing behavior, determine whether it may affect:

* external API consumers
* database records
* queued jobs
* provider configs
* existing tenant resources

Prefer backward-compatible migration paths whenever practical.

---

# 80. Security Takes Priority

If a documented implementation would create an obvious security vulnerability, do not blindly implement it.

Examples:

* plaintext provider tokens
* trusting arbitrary forwarded IP headers
* unrestricted SSRF
* cross-tenant lookup
* exposing API key secrets

Implement the safe interpretation and clearly report the discrepancy.

---

# 81. Final Architecture Principle

Portlane should remain conceptually understandable as:

```text
APPLICATION
    ↓
 PORTLANE
    ↓
 MESSAGE
    ↓
 DELIVERY
    ↓
 PROVIDER
```

The system must not slowly become:

```text
application
↓
workflow engine
↓
automation platform
↓
script runner
↓
agent framework
↓
provider
```

without an explicit product decision.

---

# 82. Final Rule

When uncertain between:

```text
more abstraction
```

and:

```text
simpler implementation that preserves clean boundaries
```

prefer the simpler implementation.

Portlane's guiding principle is:

> **Simple product. Modular implementation. Secure boundaries. Observable delivery.**
