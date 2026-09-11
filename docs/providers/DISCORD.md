# Discord Provider

Related: [documentation index](../../README.md)

## V1 Capabilities

- SEND_MESSAGE
- optional EMBEDS if implemented

## Connection Modes

V1 may support one or both:

- webhook URL
- bot token

Keep the provider contract stable even if implementation initially chooses webhook-only delivery.

## Destination Config

Depends on connection mode:

- webhook target
- channel ID

## Error Mapping

Normalize:

- unauthorized
- forbidden
- channel not found
- rate limit
- timeout
- Discord 5xx
