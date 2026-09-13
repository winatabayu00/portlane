# Discord Provider

Related: [documentation index](../../README.md)

## V1 Capabilities

- SEND_MESSAGE
- EMBEDS diklaim tapi kirim plain `content` saja; bot mode `NOT_IMPLEMENTED`

## Connection Modes

Aktual: webhook-only; test offline (cek hostname, tanpa network). Send/test + create/update validasi via `validateOutboundUrl`; redirect `manual`, 3xx diblokir.

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
