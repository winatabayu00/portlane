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

## 2. ProviderError

Normalized provider errors should include:

- code
- message
- retryable
- provider_status_code if available
- safe_details if available

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
