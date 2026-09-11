# Telegram Provider

Related: [documentation index](../../README.md)

## V1 Capabilities

- SEND_MESSAGE
- RECEIVE_WEBHOOK (optional provider-side inbound integration)
- basic formatting

## Connection Config

- bot token
- optional default parse mode

## Destination Config

- chat_id
- optional thread/topic identifier later

## Test Connection

Use the Telegram API to validate bot credentials without exposing the token.

## Error Mapping

Normalize cases such as:

- invalid token
- forbidden bot
- chat not found
- rate limited
- timeout
- Telegram 5xx
