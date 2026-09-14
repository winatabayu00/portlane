import { Queue, Worker, type Job } from "bullmq";
import type { AppConfig } from "./config.js";
import { makeRedisConnection } from "./lib/redis-connection.js";

export const M00_QUEUE_NAME = "portlane-m00";

export type M00PingJob = { kind: "m00-ping"; enqueuedAt: string };

let queue: Queue<M00PingJob> | null = null;

function connection(config: AppConfig) {
  return makeRedisConnection(config);
}

// Infrastructure-only proof job: API -> queue -> worker. No provider logic (M00 §10).
export async function enqueueM00Ping(config: AppConfig): Promise<{ jobId: string }> {
  queue ??= new Queue<M00PingJob>(M00_QUEUE_NAME, { connection: connection(config) });
  const job = await queue.add("m00-ping", { kind: "m00-ping", enqueuedAt: new Date().toISOString() });
  if (!job.id) throw new Error("Queue enqueue failed: missing job id");
  return { jobId: job.id };
}

export function registerM00Worker(config: AppConfig, onCompleted?: (job: Job<M00PingJob>) => void): Worker<M00PingJob> {
  const worker = new Worker<M00PingJob>(
    M00_QUEUE_NAME,
    async (job) => ({ processedAt: new Date().toISOString(), kind: job.data.kind }),
    { connection: connection(config) },
  );
  worker.on("completed", (job) => onCompleted?.(job));
  worker.on("failed", (job, err) => {
    // Safe log: job id only, no payload/credentials.
    console.error(JSON.stringify({ level: "error", msg: "m00 worker job failed", jobId: job?.id, err: err.message }));
  });
  return worker;
}

export async function closeM00Queue(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }
}
