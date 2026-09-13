import "dotenv/config";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = await buildApp(config);

try {
  await app.listen({ port: config.APP_PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error({ err }, "Application startup failed");
  process.exit(1);
}
