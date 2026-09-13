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

Credentials that must be reused (Telegram token, SMTP password, Discord credentials) require reversible encryption at rest (AES-GCM).

Aktual: key `APP_ENCRYPTION_KEY || JWT_SECRET`, default `dev-jwt-secret-change-me`. Tanpa rotation path. `sha256(s)` fallback. Rotation tercatat audit tapi manual.

## 6. Tenant Isolation

Every data access path must enforce tenant ownership server-side.

Cross-tenant IDs must produce a safe `404` or authorization failure.

## 7. Rate Limiting

Rate limits should exist for:

- API keys (`ak:{id}` 60/min machine, 60/min dashboard send)
- login/auth endpoints (10/min per IP)
- public webhook endpoints (120/min)
- provider test endpoints (10/min)

Aktual: Redis fixed-window `rl:{key}` INCR+PEXPIRE (shared multi-instance), fallback memory fail-open bila Redis down. `ponytail:` fixed window, bukan sliding; upgrade Lua sliding window bila abuse.

## 8. Logging

Never log:

- full API keys
- SMTP passwords
- bot tokens
- webhook secrets
- Authorization headers
- cookies/session tokens

Sensitive webhook headers/payload fields should be maskable.

Aktual: `inbound_logs` simpan body ter-redact (`redactCredentials`), header via `redactHeaders` (auth/cookie/secret/token/password/signature/api-key). Logger `REDACTED_PATHS` + preview `redactCredentials`. `GET webhook-events` list tanpa `payload_json`; `GET :id` return `payload_json` + header ter-redact. Tanpa max header config (hanya `bodyLimit` 1MB; hook 100KB → `413`).

## 9. Request Limits

Set:

- maximum request body size (1MB global, 100KB hook)
- maximum header size where supported (belum ada)
- timeout limits (forward 1-15s clamp, async via `portlane-webhook-forwards`; queue down → FAILED attempt, hook tetap 200)
- outbound webhook response-size limits (`readCapped` streaming cap 4096B)

## 10. SSRF Protection

Generic outbound webhooks introduce SSRF risk.

Aktual: `validateOutboundUrl` di webhook provider (send/test), koneksi webhook/discord create+update, forward hook create+update+retry. Discord send/test validasi URL. SMTP host validasi via `validateSmtpHost` (send/test/create/update). Redirect `manual`, 3xx diblokir total tanpa revalidate-follow. TOCTOU resolve-then-fetch inherent (best-effort).

## 11. Secret Verification

Webhook IP allowlisting is additional protection, not a replacement for signatures or secrets.

Aktual: HMAC atas raw bytes (`req.rawBody`, fallback `JSON.stringify`) via `verifyHmacSha256` + wajib prefix `sha256=`. Header: `x-webhook-signature`/`x-signature` atau `x-webhook-secret`/`Authorization`. Mode `none` + `secret_hash` tetap enforce secret.

## 12. Audit-Relevant Events

Record security-relevant actions such as:

- API key created/revoked
- IP allowlist changed
- provider connection created/updated/deleted
- credential rotation
- webhook endpoint secret rotation
- blocked IP request
