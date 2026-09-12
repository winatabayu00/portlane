import type { ProviderAdapter } from "../core/types.js";
import { ProviderError } from "../core/types.js";
import nodemailer from "nodemailer";
export const smtpProvider: ProviderAdapter = {
  key:"smtp",
  capabilities:["SEND_MESSAGE","SEND_HTML"],
  validateConnectionConfig(_cfg, creds){
    const c=creds as any;
    if(!c.host) throw new ProviderError("VALIDATION_ERROR","host required",false);
    if(!c.port) throw new ProviderError("VALIDATION_ERROR","port required",false);
    if(!c.senderEmail) throw new ProviderError("VALIDATION_ERROR","senderEmail required",false);
  },
  validateDestinationConfig(cfg){
    if(!cfg.email && !cfg.address) throw new ProviderError("VALIDATION_ERROR","email required",false);
  },
  async send({ message, destination, connection }){
    const c=connection.credentials as any;
    const to = String((destination.config as any).email ?? (destination.config as any).address);
    const transporter=nodemailer.createTransport({
      host: c.host, port: Number(c.port), secure: Boolean(c.secure),
      auth: c.user ? { user: c.user, pass: c.password } : undefined,
      connectionTimeout: 8000, greetingTimeout: 8000,
    });
    try{
      const info=await transporter.sendMail({
        from: c.senderName ? `"${c.senderName}" <${c.senderEmail}>` : c.senderEmail,
        to,
        subject: message.subject ?? "(no subject)",
        text: message.body,
        html: (message.metadata as any)?.html,
      });
      return { providerReference: info.messageId, statusCode: 250, raw:{ messageId: info.messageId }};
    }catch(e:any){
      const msg=String(e.message||"smtp error");
      const retryable = /timeout|connection| greet|ETIMEDOUT|ECONN/i.test(msg);
      const isAuth = /auth|credential|password/i.test(msg);
      throw new ProviderError(isAuth?"INVALID_CREDENTIALS":retryable?"PROVIDER_ERROR":"INVALID_DESTINATION", msg, retryable && !isAuth);
    }
  },
  async testConnection(creds){
    const c=creds as any;
    const transporter=nodemailer.createTransport({
      host: c.host, port: Number(c.port), secure: Boolean(c.secure),
      auth: c.user ? { user: c.user, pass: c.password } : undefined,
      connectionTimeout: 6000,
    });
    try{ await transporter.verify(); return { ok:true, message:"smtp verify ok" }; }catch(e:any){ return { ok:false, message:e.message }; }
  }
};
