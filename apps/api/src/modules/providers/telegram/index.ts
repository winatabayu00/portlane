import type { ProviderAdapter } from "../core/types.js";
import { ProviderError } from "../core/types.js";

// Inbound webhook management (Bot API). Provider-owned per AGENTS §6:
// token dipakai di sini, core hanya teruskan hasil. Error tidak pernah
// menggemakan token — hanya method + description Telegram.
const TG_API = "https://api.telegram.org";
const TG_TIMEOUT_MS = 10_000;

async function callTelegramBotApi(token: string, method: string, body?: Record<string, unknown>): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${TG_API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TG_TIMEOUT_MS),
    });
  } catch (e: unknown) {
    throw new ProviderError("TIMEOUT", `Telegram ${method} failed: ${String((e as Error)?.message ?? e)}`, true);
  }
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    const desc = String(json.description ?? res.statusText);
    const retryable = res.status === 429 || res.status >= 500;
    const code = res.status === 429 ? "RATE_LIMITED" : res.status === 401 || res.status === 403 ? "INVALID_CREDENTIALS" : "PROVIDER_ERROR";
    throw new ProviderError(code, `Telegram ${method} failed: ${desc}`, retryable, res.status);
  }
  return json.result ?? null;
}

export async function setTelegramWebhook(token: string, url: string, secretToken?: string): Promise<unknown> {
  const body: Record<string, unknown> = {
    url,
    drop_pending_updates: false,
    allowed_updates: ['message', 'callback_query'],
  };
  if (secretToken) body.secret_token = secretToken;
  return callTelegramBotApi(token, "setWebhook", body);
}

export async function getTelegramWebhookInfo(token: string): Promise<unknown> {
  return callTelegramBotApi(token, "getWebhookInfo");
}

export async function deleteTelegramWebhook(token: string, dropPendingUpdates = false): Promise<unknown> {
  return callTelegramBotApi(token, "deleteWebhook", { drop_pending_updates: dropPendingUpdates });
}

export const telegramProvider: ProviderAdapter = {
  key: "telegram",
  capabilities: ["SEND_MESSAGE","RECEIVE_WEBHOOK"],
  validateConnectionConfig(_cfg, creds){
    if(!creds.botToken || typeof creds.botToken!=="string") throw new ProviderError("VALIDATION_ERROR","botToken required",false);
  },
  validateDestinationConfig(cfg){
    if(!cfg.chat_id && !cfg.chatId) throw new ProviderError("VALIDATION_ERROR","chat_id required",false);
  },
  async send({ message, destination, connection }){
    const token = String((connection.credentials as any).botToken);
    const chatId = String((destination.config as any).chat_id ?? (destination.config as any).chatId);
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const body:any={ chat_id: chatId, text: message.subject ? `${message.subject}\n${message.body}` : message.body };
    if((connection.config as any).parse_mode) body.parse_mode=(connection.config as any).parse_mode;
    let res: Response;
    try{ res=await fetch(url,{ method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000)});}catch(e:any){
      throw new ProviderError("TIMEOUT", e.message, true);
    }
    const json:any=await res.json().catch(()=> ({}));
    if(!res.ok || !json.ok){
      const code=json.error_code ?? res.status;
      const desc=json.description ?? res.statusText;
      const retryable = res.status===429 || res.status>=500;
      const errCode = res.status===429 ? "RATE_LIMITED" : res.status===401||res.status===403 ? "INVALID_CREDENTIALS" : res.status===400 ? "INVALID_DESTINATION" : "PROVIDER_ERROR";
      throw new ProviderError(errCode, `Telegram ${code}: ${desc}`, retryable, res.status);
    }
    return { providerReference: String(json.result?.message_id ?? ""), statusCode: res.status, raw: { message_id: json.result?.message_id } };
  },
  async testConnection(creds){
    const token=String((creds as any).botToken);
    try{
      const res=await fetch(`https://api.telegram.org/bot${token}/getMe`,{ signal: AbortSignal.timeout(8000)});
      const j:any=await res.json().catch(()=>({}));
      if(!res.ok || !j.ok) return { ok:false, message: j.description ?? res.statusText };
      return { ok:true, message:`ok as @${j.result.username}`};
    }catch(e:any){ return { ok:false, message: e.message }; }
  }
};
