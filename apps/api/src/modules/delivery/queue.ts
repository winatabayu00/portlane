import { Queue } from "bullmq";
import { Redis } from "ioredis";
import type { AppConfig } from "../../config.js";

export const DELIVERY_QUEUE = "portlane-deliveries";
export type DeliveryJob = { deliveryId: string };

let deliveryQueue: Queue<DeliveryJob> | null = null;

function conn(config: AppConfig): Redis {
  return new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
}

export async function enqueueDelivery(config: AppConfig, deliveryId: string): Promise<void> {
  deliveryQueue ??= new Queue<DeliveryJob>(DELIVERY_QUEUE, { connection: conn(config) });
  await deliveryQueue.add("deliver", { deliveryId }, { attempts: 1, removeOnComplete: 1000, removeOnFail: 1000 });
}

export async function closeDeliveryQueue(): Promise<void> {
  if (deliveryQueue) { await deliveryQueue.close(); deliveryQueue = null; }
}
