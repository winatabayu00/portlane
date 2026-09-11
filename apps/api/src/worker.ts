import { loadConfig } from "./config.js";
import { registerM00Worker } from "./queue.js";

// Standalone worker entry: `yarn dev:worker`. Scales by running more processes (AGENTS §71).
const config = loadConfig();
const worker = registerM00Worker(config);

console.log(JSON.stringify({ level: "info", msg: "m00 worker started", queue: "portlane-m00" }));

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await worker.close();
    process.exit(0);
  });
}
