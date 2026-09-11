# Portlane — Acceptance Criteria

Related: [documentation index](../../README.md)

## Auth and Tenant

- [ ] User can register and log in.
- [ ] User can create a tenant.
- [ ] User can belong to multiple tenants.
- [ ] User cannot access another tenant's resources without membership.

## API Keys

- [ ] Tenant can create multiple API keys.
- [ ] Full key is shown only once.
- [ ] Stored secret is hashed.
- [ ] Revoked key is rejected.
- [ ] Last-used timestamp updates.

## IP Allowlist

- [ ] API key with no allowlist behaves according to configured default policy.
- [ ] Exact IPv4 rule works.
- [ ] IPv4 CIDR works.
- [ ] IPv6/CIDR works.
- [ ] Non-allowed source receives `403`.
- [ ] Blocked requests are observable.
- [ ] Spoofed forwarding headers do not bypass policy when trusted-proxy config is correct.

## Providers

- [ ] Telegram connection can be created and tested.
- [ ] Discord connection can be created and tested.
- [ ] SMTP connection can be created and tested.
- [ ] Generic webhook connection can be created and tested.
- [ ] Secrets do not appear in normal API responses/logs.

## Destinations

- [ ] Destination belongs to exactly one tenant and provider connection.
- [ ] Cross-tenant destination IDs are rejected.
- [ ] Disabled destination cannot receive new delivery.

## Messaging

- [ ] Valid message creates one message record.
- [ ] One destination creates one delivery.
- [ ] Multiple destinations create independent deliveries.
- [ ] API returns queued state without waiting for provider delivery.
- [ ] Idempotency prevents unintended duplicate message creation.

## Delivery

- [ ] Worker processes queued delivery.
- [ ] Successful delivery becomes `DELIVERED`.
- [ ] Retryable failure schedules retry.
- [ ] Permanent failure does not loop forever.
- [ ] Retry exhaustion becomes `DEAD`.
- [ ] Manual retry works.
- [ ] Delivery attempts are preserved.

## Webhooks

- [ ] Public webhook endpoint receives valid request.
- [ ] Webhook IP allowlist works.
- [ ] Invalid secret/signature is rejected.
- [ ] Event is persisted.
- [ ] Forwarding can retry.
- [ ] Sensitive headers are masked.

## Security

- [ ] Provider credentials are encrypted at rest.
- [ ] API secrets are not logged.
- [ ] Tenant resource access is server-side scoped.
- [ ] Rate limits are active.
- [ ] Request size limits exist.
- [ ] Generic outbound webhook has SSRF protections or is explicitly blocked from unsafe targets.

## Architecture

- [ ] Provider modules implement the provider contract.
- [ ] Retry policy is not duplicated inside each provider.
- [ ] Messaging core contains no Telegram/Discord/SMTP-specific branching except provider selection through registry/adapter.
