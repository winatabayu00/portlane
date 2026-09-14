import { Queue, Worker } from "bullmq";
import crypto from "node:crypto";
import type { AppConfig } from "../../config.js";
import { dbPool } from "../../db.js";
import { id } from "../../lib/ids.js";
import { readCapped, validateOutboundUrl } from "../../lib/ssrf.js";
import { decrypt } from "../../lib/crypto.js";
import { makeRedisConnection } from "../../lib/redis-connection.js";

export const FORWARD_QUEUE = "portlane-webhook-forwards";
export type ForwardJob = { eventId: string };

let forwardQueue: Queue<ForwardJob> | null = null;

function conn(config: AppConfig) {
  return makeRedisConnection(config);
}

export async function enqueueForward(config: AppConfig, eventId: string): Promise<void> {
  forwardQueue ??= new Queue<ForwardJob>(FORWARD_QUEUE, { connection: conn(config) });
  await forwardQueue.add("forward", { eventId }, { attempts: 1, removeOnComplete: 1000, removeOnFail: 1000 });
}

export async function closeForwardQueue(): Promise<void> {
  if (forwardQueue) { await forwardQueue.close(); forwardQueue = null; }
}

export function registerForwardWorker(config: AppConfig): Worker<ForwardJob> {
  const pool = dbPool(config);
  const worker = new Worker<ForwardJob>(
    FORWARD_QUEUE,
    async (job) => {
      const { eventId } = job.data;
      const ev = (await pool.query("SELECT * FROM webhook_events WHERE id=$1", [eventId])).rows[0];
      if (!ev) return { skipped: true };
      const endpoint = (await pool.query("SELECT * FROM webhook_endpoints WHERE id=$1 AND tenant_id=$2", [ev.webhook_endpoint_id, ev.tenant_id])).rows[0];
      if (!endpoint) return { skipped: true };
      const fwd = endpoint.forwarding_config_json as Record<string, unknown>;
      if (!fwd?.url) return { skipped: true };
      const n = parseInt((await pool.query("SELECT COUNT(*) FROM webhook_forward_attempts WHERE webhook_event_id=$1", [eventId])).rows[0].count, 10) + 1;
      try {
        await validateOutboundUrl(String(fwd.url));
        const bodyRaw = JSON.stringify(ev.payload_json ?? {});
        const headers: Record<string, string> = { "content-type": "application/json", "x-portlane-event-id": eventId, "x-portlane-request-id": ev.request_id ?? "" };
        const extra = fwd.headers as Record<string, string> | undefined;
        if (extra && typeof extra === "object") for (const [k, v] of Object.entries(extra)) if (typeof v === "string" && /^[a-z0-9-]+$/i.test(k)) headers[k.toLowerCase()] = v;
        if (endpoint.encrypted_secret) { try { const s = decrypt(endpoint.encrypted_secret, config.APP_ENCRYPTION_KEY || config.JWT_SECRET); headers["x-portlane-signature"] = "sha256=" + crypto.createHmac("sha256", s).update(bodyRaw).digest("hex"); } catch {} }
        const timeoutMs = Math.min(15000, Math.max(1000, Number((fwd as Record<string, unknown>).timeout_ms ?? 8000)));
        const res = await fetch(String(fwd.url), { method: "POST", headers, body: bodyRaw, signal: AbortSignal.timeout(timeoutMs), redirect: "manual" });
        if (res.status >= 300 && res.status < 400) { await readCapped(res, 4096).catch(() => ""); throw new Error(`Forward blocked: redirect ${res.status}`); }
        await readCapped(res, 4096).catch(() => "");
        await pool.query("INSERT INTO webhook_forward_attempts (id,tenant_id,webhook_event_id,attempt_number,status,response_status) VALUES ($1,$2,$3,$4,$5,$6)", [id("wfa"), ev.tenant_id, eventId, n, res.ok ? "SUCCESS" : "FAILED", res.status]);
        return { eventId, status: res.status };
      } catch (e: unknown) {
        await pool.query("INSERT INTO webhook_forward_attempts (id,tenant_id,webhook_event_id,attempt_number,status,error_message) VALUES ($1,$2,$3,$4,$5,$6)", [id("wfa"), ev.tenant_id, eventId, n, "FAILED", String((e as Error).message).slice(0, 500)]);
        return { eventId, failed: true };
      }
    },
    { connection: makeRedisConnection(config), concurrency: config.WORKER_CONCURRENCY },
  );
  worker.on("failed", (job, err) => {
    console.error(JSON.stringify({ level: "error", msg: "forward worker job failed", jobId: job?.id, err: err.message }));
  });
  return worker;
}
