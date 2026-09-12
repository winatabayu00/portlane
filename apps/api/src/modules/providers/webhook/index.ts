import type { ProviderAdapter } from "../core/types.js";
import { ProviderError } from "../core/types.js";
import { validateOutboundUrl } from "../../../lib/ssrf.js";
export const webhookProvider: ProviderAdapter = {
  key:"webhook",
  capabilities:["SEND_MESSAGE","CUSTOM_HEADERS"],
  validateConnectionConfig(cfg){
    const c=cfg as any;
    if(!c.url) throw new ProviderError("VALIDATION_ERROR","url required",false);
    try{ new URL(c.url);}catch{ throw new ProviderError("VALIDATION_ERROR","invalid url",false);}
  },
  validateDestinationConfig(_cfg){},
  async send({ message, connection }){
    const cfg=connection.config as any;
    const creds=connection.credentials as any;
    const url = String(cfg.url ?? creds.url);
    await validateOutboundUrl(url);
    const method = (cfg.method ?? "POST").toUpperCase();
    const headers: Record<string,string> = { "content-type":"application/json", ...(cfg.headers ?? {}), ...(creds.headers ?? {}) };
    const payload = JSON.stringify({ subject: message.subject, body: message.body, metadata: message.metadata, timestamp: new Date().toISOString() });
    // truncate response to 4kb
    let res: Response;
    try{
      res=await fetch(url,{ method, headers, body: method==="GET" ? undefined : payload, signal: AbortSignal.timeout(Number(cfg.timeoutMs ?? 8000)), redirect:"manual" });
    }catch(e:any){ throw new ProviderError("TIMEOUT", e.message, true); }
    if(res.status>=300 && res.status<400){
      // block redirects without revalidation
      throw new ProviderError("PROVIDER_ERROR","redirect blocked", false, res.status);
    }
    const text=await res.text().catch(()=>"");
    const safe=text.slice(0,4000);
    if(res.status>=500 || res.status===429){
      throw new ProviderError(res.status===429?"RATE_LIMITED":"PROVIDER_ERROR", `webhook ${res.status}: ${safe.slice(0,200)}`, true, res.status);
    }
    if(res.status>=400){
      throw new ProviderError("INVALID_DESTINATION", `webhook ${res.status}: ${safe.slice(0,200)}`, false, res.status);
    }
    return { statusCode: res.status, raw:{ body: safe } };
  },
  async testConnection(_creds, cfg){
    const url=String((cfg as any).url ?? (_creds as any).url ?? "");
    if(!url) return { ok:false, message:"url required" };
    try{ await validateOutboundUrl(url); return { ok:true, message:"url valid (ssrf checked)" }; }catch(e:any){ return { ok:false, message:e.message };}
  }
};
