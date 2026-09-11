# Portlane — Security Specification

Related: [documentation index](../../README.md)

## 1. Security Boundary

Outbound API request:

```text
Request
  ↓
Trusted Proxy Resolution
  ↓
Source IP Resolution
  ↓
API Key Authentication
  ↓
API Key Status
  ↓
IP Allowlist
  ↓
Rate Limit
  ↓
Tenant Authorization
  ↓
Validation
  ↓
Business Logic
```

Inbound webhook request:

```text
Request
  ↓
Trusted Proxy Resolution
  ↓
Source IP Resolution
  ↓
Endpoint Resolution
  ↓
IP Allowlist
  ↓
Secret / Signature Verification
  ↓
Rate Limit
  ↓
Payload Validation
  ↓
Persist
```

## 2. IP Allowlist

Support:

- IPv4
- IPv6
- CIDR

Use proper network parsing. Do not compare IPs as simple strings.

## 3. Reverse Proxy Warning

Never blindly trust `X-Forwarded-For`.

The deployment must explicitly configure which reverse proxies are trusted. Source IP should be derived according to framework/proxy trust rules.

Otherwise clients could spoof allowlisted addresses.

## 4. API Keys

Recommended format:

```text
pl_live_<public-prefix>.<secret>
```

Persist:

- public prefix
- hash of secret
- metadata

Do not persist the raw secret if not required.

## 5. Provider Credentials

Credentials that must be reused (Telegram token, SMTP password, Discord credentials) require reversible encryption at rest.

Requirements:

- application encryption key outside database
- authenticated encryption
- key rotation strategy
- no secret logging
- redacted UI responses

## 6. Tenant Isolation

Every data access path must enforce tenant ownership server-side.

Cross-tenant IDs must produce a safe `404` or authorization failure.

## 7. Rate Limiting

Rate limits should exist for:

- API keys
- login/auth endpoints
- public webhook endpoints
- provider test endpoints

Provider-specific rate limits should also be respected by workers.

## 8. Logging

Never log:

- full API keys
- SMTP passwords
- bot tokens
- webhook secrets
- Authorization headers
- cookies/session tokens

Sensitive webhook headers/payload fields should be maskable.

## 9. Request Limits

Set:

- maximum request body size
- maximum header size where supported
- timeout limits
- outbound webhook response-size limits

## 10. SSRF Protection

Generic outbound webhooks introduce SSRF risk.

At minimum, define a security policy before production use.

Recommended protections:

- block loopback/link-local/metadata endpoints by default
- resolve and validate destination addresses
- optionally disallow private networks unless tenant explicitly opts in
- apply connect/read timeouts
- restrict redirects or revalidate redirect targets

This is mandatory to address before exposing generic webhook destinations publicly.

## 11. Secret Verification

Webhook IP allowlisting is additional protection, not a replacement for signatures or secrets.

## 12. Audit-Relevant Events

Record security-relevant actions such as:

- API key created/revoked
- IP allowlist changed
- provider connection created/updated/deleted
- credential rotation
- webhook endpoint secret rotation
- blocked IP request
