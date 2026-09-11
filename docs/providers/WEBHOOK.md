# Generic Webhook Provider

Related: [documentation index](../../README.md)

## Outbound Capabilities

- SEND_MESSAGE
- CUSTOM_HEADERS

## Connection / Destination Config

Possible fields:

- URL
- HTTP method
- headers
- authentication mode
- timeout
- secret/signing configuration

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
