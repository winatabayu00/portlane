import { loadConfig } from "./config.js";
import { registerM00Worker } from "./queue.js";
import { registerDeliveryWorker } from "./modules/delivery/worker.js";
import { registerProvider } from "./modules/providers/core/registry.js";
import { telegramProvider } from "./modules/providers/telegram/index.js";
import { discordProvider } from "./modules/providers/discord/index.js";
import { smtpProvider } from "./modules/providers/smtp/index.js";
import { webhookProvider } from "./modules/providers/webhook/index.js";

registerProvider(telegramProvider);
registerProvider(discordProvider);
registerProvider(smtpProvider);
registerProvider(webhookProvider);

const config = loadConfig();
const workers = [registerM00Worker(config), registerDeliveryWorker(config)];

console.log(JSON.stringify({ level: "info", msg: "workers started", queues: ["portlane-m00", "portlane-deliveries"] }));

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await Promise.all(workers.map((w) => w.close()));
    process.exit(0);
  });
}
