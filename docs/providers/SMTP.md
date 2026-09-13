# SMTP Provider

Related: [documentation index](../../README.md)

## V1 Capabilities

- SEND_MESSAGE
- SEND_HTML if HTML body support is enabled

## Connection Config

- host (`validateSmtpHost`: blocklist loopback/private/link-local/metadata + DNS resolve check)
- port (`validateSmtpPort`: blokir privileged non-mail <1024 kecuali 25/465/587; 2525+ lolos)
- username
- password
- `secure` boolean (bukan mode TLS/STARTTLS eksplisit)
- sender email
- sender name optional

## Destination Config

- email address
- display name optional

## Test Connection

Validate connectivity and authentication safely.

Do not send test email unless the UI explicitly asks to do so.

## Error Mapping

Normalize:

- auth failure
- connection failure
- TLS failure
- invalid recipient
- mailbox rejected
- timeout
