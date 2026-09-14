import { Worker, type Job } from "bullmq";
import { Redis } from "ioredis";
import type { AppConfig } from "../../config.js";
import { dbPool } from "../../db.js";
import { id } from "../../lib/ids.js";
import { redactCredentials } from "../../lib/mask.js";
import { decryptCreds } from "../providers/core/crypto.js";
import { getProvider } from "../providers/core/registry.js";
import { ProviderError } from "../providers/core/types.js";
import { DELIVERY_QUEUE, enqueueDeliveryDelayed, type DeliveryJob } from "./queue.js";

// Central retry policy (AGENTS: provider modules must not own this).
// attempt_count is already incremented at claim time, so the first retry
// after a failure waits RETRY_DELAYS_MS[1] (5s); index 0 covers requeue edge.
// Exported (pure) for unit tests — behavior contract: 5 attempts max, backoff.
export const RETRY_DELAYS_MS = [0, 5_000, 30_000, 120_000, 600_000]; // up to 5 attempts
export const MAX_ATTEMPTS = RETRY_DELAYS_MS.length;

export function getRetryDelay(attempt: number): number | null {
  if (attempt >= MAX_ATTEMPTS) return null;
  return RETRY_DELAYS_MS[attempt] ?? null;
}

export function isRetryableError(err: unknown): boolean {
  if (err instanceof ProviderError) return err.retryable;
  const msg = typeof (err as Error)?.message === "string" ? (err as Error).message : String(err ?? "");
  return /timeout|429|5\d\d|ECONN|ETIMEDOUT/i.test(msg);
}

export function registerDeliveryWorker(config: AppConfig): Worker<DeliveryJob> {
  const pool = dbPool(config);
  const worker = new Worker<DeliveryJob>(
    DELIVERY_QUEUE,
    async (job: Job<DeliveryJob>) => {
      const { deliveryId } = job.data;
      // atomically claim
      const claimed = await pool.query(
        `UPDATE deliveries SET status='PROCESSING', started_at=COALESCE(started_at,NOW()), attempt_count=attempt_count+1, updated_at=NOW()
         WHERE id=$1 AND status IN ('QUEUED','RETRYING') RETURNING *`,
        [deliveryId],
      );
      if (!claimed.rows.length) return { skipped: true, reason: "already claimed" };
      const dlv = claimed.rows[0];
      const attemptNumber = dlv.attempt_count;

      const started = Date.now();
      let result: string = "FAILED";
      let errorCode: string | null = null;
      let errorMessage: string | null = null;
      let providerStatus: number | null = null;
      let providerRef: string | null = null;
      let safeResponse: unknown = null;

      try {
        // resolve message, connection, destination — all tenant-scoped to the
        // delivery so a forged/moved job id can't cross tenants (§10)
        const msgR = await pool.query("SELECT * FROM messages WHERE id=$1 AND tenant_id=$2", [dlv.message_id, dlv.tenant_id]);
        if (!msgR.rows.length) throw new ProviderError("NOT_FOUND", "Message not found", false);
        const msg = msgR.rows[0];

        const connR = await pool.query("SELECT * FROM provider_connections WHERE id=$1 AND tenant_id=$2", [dlv.provider_connection_id, dlv.tenant_id]);
        if (!connR.rows.length) throw new ProviderError("NOT_FOUND", "Provider connection not found", false);
        const conn = connR.rows[0];
        if (conn.status !== "active") throw new ProviderError("INVALID_CREDENTIALS", "Provider connection disabled", false);

        const destR = await pool.query("SELECT * FROM destinations WHERE id=$1 AND tenant_id=$2", [dlv.destination_id, dlv.tenant_id]);
        if (!destR.rows.length) throw new ProviderError("NOT_FOUND", "Destination not found", false);
        if (destR.rows[0].status !== "active") throw new ProviderError("INVALID_DESTINATION", "Destination disabled", false);

        const adapter = getProvider(conn.provider_key);
        if (!adapter) throw new ProviderError("NOT_FOUND", `Unknown provider ${conn.provider_key}`, false);

        const creds = decryptCreds(conn.encrypted_credentials, config.APP_ENCRYPTION_KEY || config.JWT_SECRET);
        const input = {
          message: { subject: msg.subject ?? undefined, body: msg.body, metadata: msg.metadata_json ?? undefined },
          destination: { config: destR.rows[0].config_json },
          connection: { config: conn.config_json, credentials: creds },
        };
        const sendRes = await adapter.send(input);
        result = "SUCCESS";
        providerStatus = sendRes.statusCode ?? 200;
        providerRef = sendRes.providerReference ?? null;
        const redacted = redactCredentials(sendRes.raw ?? null);
        safeResponse = redacted ? JSON.parse(JSON.stringify(redacted).slice(0, 4000)) : null;
        await pool.query(
          `UPDATE deliveries SET status='DELIVERED', delivered_at=NOW(), last_error_code=null, last_error_message=null, updated_at=NOW() WHERE id=$1 AND tenant_id=$2`,
          [deliveryId, dlv.tenant_id],
        );
      } catch (e: unknown) {
        const err = e as ProviderError & Error;
        errorCode = (err.code as string) ?? "PROVIDER_ERROR";
        errorMessage = String(err.message ?? "delivery failed").slice(0, 1000);
        providerStatus = (err as ProviderError).statusCode ?? null;
        const retryable = isRetryableError(e);
        result = retryable ? "RETRYABLE" : "FAILED";
        safeResponse = null;

        if (retryable) {
          const delay = getRetryDelay(attemptNumber);
          if (delay !== null && attemptNumber < MAX_ATTEMPTS) {
            const nextRetryAt = new Date(Date.now() + delay);
            await pool.query(
              `UPDATE deliveries SET status='RETRYING', next_retry_at=$1, last_error_code=$2, last_error_message=$3, updated_at=NOW() WHERE id=$4 AND tenant_id=$5`,
              [nextRetryAt.toISOString(), errorCode, errorMessage, deliveryId, dlv.tenant_id],
            );
            // schedule retry via singleton delayed job (no new Queue/Redis per retry)
            await enqueueDeliveryDelayed(config, deliveryId, delay);
          } else {
            await pool.query(
              `UPDATE deliveries SET status='DEAD', next_retry_at=null, last_error_code=$1, last_error_message=$2, updated_at=NOW() WHERE id=$3 AND tenant_id=$4`,
              [errorCode, errorMessage, deliveryId, dlv.tenant_id],
            );
            result = "FAILED";
          }
        } else {
          // permanent failure -> FAILED (DEAD is reserved for retry exhaustion;
          // both are terminal and listed together in observability)
          await pool.query(
            `UPDATE deliveries SET status='FAILED', last_error_code=$1, last_error_message=$2, updated_at=NOW() WHERE id=$3 AND tenant_id=$4`,
            [errorCode, errorMessage, deliveryId, dlv.tenant_id],
          );
        }
      } finally {
        const finished = new Date();
        const duration = Date.now() - started;
        await pool.query(
          `INSERT INTO delivery_attempts (id, tenant_id, delivery_id, attempt_number, started_at, finished_at, duration_ms, result, provider_status_code, provider_reference, error_code, error_message, safe_response_json)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            id("att"),
            dlv.tenant_id,
            deliveryId,
            attemptNumber,
            new Date(started).toISOString(),
            finished.toISOString(),
            duration,
            result,
            providerStatus,
            providerRef,
            errorCode,
            errorMessage,
            safeResponse ? JSON.stringify(safeResponse) : null,
          ],
        );
      }
      return { deliveryId, result };
    },
    { connection: new Redis(config.REDIS_URL, { maxRetriesPerRequest: null }), concurrency: 5 },
  );

  worker.on("failed", (job, err) => {
    console.error(JSON.stringify({ level: "error", msg: "delivery worker job failed", jobId: job?.id, err: err.message }));
  });
  return worker;
}
