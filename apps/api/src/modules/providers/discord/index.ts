import type { ProviderAdapter } from "../core/types.js";
import { ProviderError } from "../core/types.js";
export const discordProvider: ProviderAdapter = {
  key:"discord",
  capabilities:["SEND_MESSAGE","EMBEDS"],
  validateConnectionConfig(_cfg, creds){
    const anyCreds=creds as any;
    if(!anyCreds.webhookUrl && !anyCreds.botToken) throw new ProviderError("VALIDATION_ERROR","webhookUrl or botToken required",false);
    if(anyCreds.webhookUrl) try{ new URL(anyCreds.webhookUrl);}catch{ throw new ProviderError("VALIDATION_ERROR","invalid webhookUrl",false);}
  },
  validateDestinationConfig(_cfg){},
  async send({ message, connection }){
    const creds=connection.credentials as any;
    const content = message.subject ? `**${message.subject}**\n${message.body}` : message.body;
    if(creds.webhookUrl){
      let res:Response;
      try{ res=await fetch(creds.webhookUrl,{ method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ content }), signal: AbortSignal.timeout(10000)});}catch(e:any){ throw new ProviderError("TIMEOUT", e.message, true);}
      if(!res.ok){
        const retryable=res.status===429||res.status>=500;
        throw new ProviderError(res.status===429?"RATE_LIMITED":res.status>=500?"PROVIDER_ERROR":"INVALID_DESTINATION", `Discord ${res.status}`, retryable, res.status);
      }
      return { statusCode: res.status };
    }
    throw new ProviderError("NOT_IMPLEMENTED","bot token mode not in V1",false);
  },
  async testConnection(creds){
    const anyCreds=creds as any;
    if(anyCreds.webhookUrl){
      try{
        const u=new URL(anyCreds.webhookUrl);
        if(!u.hostname.includes("discord")) return { ok:false, message:"not a discord webhook" };
        return { ok:true, message:"webhook url looks valid (no network test)" };
      }catch(e:any){ return { ok:false, message:e.message };}
    }
    return { ok:false, message:"bot token test not implemented"};
  }
};
