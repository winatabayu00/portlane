# Portlane — Provider Contract

Related: [documentation index](../../README.md)

## 1. Objective

Provider modules must be replaceable and isolated.

Core communicates through a provider contract.

Conceptual interface:

```ts
interface ProviderAdapter {
  key(): string;
  capabilities(): ProviderCapability[];

  validateConfiguration(input: unknown): ValidationResult;
  testConnection(context: ProviderContext): Promise<TestResult>;

  send(
    context: ProviderContext,
    destination: CanonicalDestination,
    message: CanonicalMessage,
  ): Promise<ProviderSendResult>;

  mapError(error: unknown): ProviderError;
}
```

Aktual (`core/types.ts`): `key`/`capabilities` sebagai property; validasi
split `validateConnectionConfig` + `validateDestinationConfig`; network policy
optional `verifyConnectionNetwork(config, credentials)` (SSRF milik adapter —
route memanggilnya generik tanpa branching per-provider); `send(input:
ProviderSendInput)` single-object; error mapping = `throw new
ProviderError(...)` di dalam `send()` (bentuk executable dari `mapError`).

## 2. ProviderError

Aktual (`core/types.ts`): `code, message, retryable, statusCode, raw`. Docs lama sebut `provider_status_code/safe_details` — map ke `statusCode/raw`.

Telegram `TIMEOUT/INVALID_CREDENTIALS/INVALID_DESTINATION`; Discord/SMTP mirip; docs tanpa tabel mapping. Discord klaim `EMBEDS` tapi kirim plain `content`; bot mode `NOT_IMPLEMENTED`. Telegram passthrough `parse_mode` apa pun. SMTP `secure` boolean vs docs mode TLS. Webhook outbound tanpa signing.

## 3. Rules

Provider modules may:

- validate provider-specific config
- use provider SDKs
- transform payloads
- normalize provider errors
- expose provider capabilities

Provider modules may not:

- decide tenant authorization
- own retry schedule
- own global rate limits
- own message persistence
- own delivery state machine
- expose raw secrets in logs

## 4. Capability Examples

- SEND_MESSAGE
- SEND_HTML
- SEND_MEDIA
- RECEIVE_WEBHOOK
- BUTTONS
- EMBEDS
- CUSTOM_HEADERS
