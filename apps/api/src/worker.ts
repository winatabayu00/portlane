import { loadConfig } from "./config.js";
import { registerM00Worker } from "./queue.js";
import { registerDeliveryWorker } from "./modules/delivery/worker.js";

const config = loadConfig();
const workers = [registerM00Worker(config), registerDeliveryWorker(config)];

console.log(JSON.stringify({ level: "info", msg: "workers started", queues: ["portlane-m00", "portlane-deliveries"] }));

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await Promise.all(workers.map((w) => w.close()));
    process.exit(0);
  });
}
