# Generic Webhook Provider

Related: [documentation index](../../README.md)

## Outbound Capabilities

- SEND_MESSAGE
- CUSTOM_HEADERS

## Connection / Destination Config

Aktual:

- URL (`validateOutboundUrl` di send/test + create/update koneksi + forward hook; DNS resolve check; redirect `manual`, 3xx diblokir)
- HTTP method (GET tanpa body)
- headers (forward allowlist `/^[a-z0-9-]+$/i`, lowercase)
- timeout clamp 1000-15000ms (`AbortSignal.timeout`)
- response dibaca via `readCapped` streaming cap 4096B
- tanpa auth mode/signing outbound

## Delivery

Canonical message is serialized into a well-defined Portlane webhook payload.

Avoid arbitrary user code or arbitrary transformation logic in V1.

## Response Handling

Persist only safe response data.

Large or sensitive response bodies should be truncated or masked.

## Inbound Webhook

Inbound webhook endpoints are managed by the Webhooks module, not by outbound delivery core.

Security options:

- IP allowlist
- shared secret
- signature verification mode
