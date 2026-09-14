export type ProviderKey = "telegram"|"discord"|"smtp"|"webhook";
export type ProviderCapability = "SEND_MESSAGE"|"RECEIVE_WEBHOOK"|"SEND_HTML"|"CUSTOM_HEADERS"|"EMBEDS";
export interface ProviderSendInput { message: { subject?: string; body: string; metadata?: Record<string,unknown> }; destination: { config: Record<string,unknown> }; connection: { config: Record<string,unknown>; credentials: Record<string,unknown> }; }
export interface ProviderSendResult { providerReference?: string; statusCode?: number; raw?: unknown; }
export class ProviderError extends Error {
  constructor(public code: string, msg: string, public retryable: boolean, public statusCode?: number){ super(msg); }
}
export interface ProviderAdapter {
  key: ProviderKey;
  capabilities: ProviderCapability[];
  validateConnectionConfig(config: Record<string,unknown>, credentials: Record<string,unknown>): void;
  validateDestinationConfig(config: Record<string,unknown>): void;
  // Optional async network policy check (SSRF). Core calls it generically so
  // adding a provider never requires editing route logic (§36). Core owns
  // retry decisions; adapters only classify errors via ProviderError.
  verifyConnectionNetwork?(config: Record<string,unknown>, credentials: Record<string,unknown>): Promise<void>;
  send(input: ProviderSendInput): Promise<ProviderSendResult>;
  testConnection(credentials: Record<string,unknown>, config: Record<string,unknown>): Promise<{ ok: boolean; message?: string }>;
  // Note: error mapping is done inline via `throw new ProviderError(...)`
  // inside send(), which is the executable form of the documented mapError.
}
