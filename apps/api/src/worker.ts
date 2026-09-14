import { loadConfig } from "./config.js";
import { dbPool } from "./db.js";
import { runRetentionCleanup } from "./lib/retention.js";
import { registerM00Worker } from "./queue.js";
import { registerDeliveryWorker } from "./modules/delivery/worker.js";
import { registerForwardWorker } from "./modules/webhooks/forward.js";
import { registerAllProviders } from "./modules/providers/index.js";

registerAllProviders();

const config = loadConfig();
const workers = [registerM00Worker(config), registerDeliveryWorker(config), registerForwardWorker(config)];

console.log(JSON.stringify({ level: "info", msg: "workers started", queues: ["portlane-m00", "portlane-deliveries", "portlane-webhook-forwards"] }));

// M12 retention (opt-in, default off): daily purge of verbose tables only.
// No-op unless RETENTION_ENABLED=true — never silent data loss (§61/§69).
async function runRetentionOnce() {
  try {
    const res = await runRetentionCleanup(dbPool(config), config);
    console.log(JSON.stringify({ level: "info", msg: "retention cleanup", ...res }));
  } catch (err) {
    console.error(JSON.stringify({ level: "error", msg: "retention cleanup failed", err: err instanceof Error ? err.message : String(err) }));
  }
}

let retentionTimer: NodeJS.Timeout | null = null;
if (config.RETENTION_ENABLED) {
  console.log(JSON.stringify({ level: "info", msg: "retention scheduled", days: config.RETENTION_DAYS }));
  void runRetentionOnce();
  retentionTimer = setInterval(() => { void runRetentionOnce(); }, 24 * 3600 * 1000);
  retentionTimer.unref?.();
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    if (retentionTimer) clearInterval(retentionTimer);
    await Promise.all(workers.map((w) => w.close()));
    process.exit(0);
  });
}
