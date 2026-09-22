import "dotenv/config";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { syncTelegramWebhooks } from "./modules/providers/telegram/sync.js";

const config = loadConfig();
const app = await buildApp(config);

try {
  await app.listen({ port: config.APP_PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error({ err }, "Application startup failed");
  process.exit(1);
}

// Telegram autosync (default on): Telegram hanya simpan 1 active webhook URL
// per bot — setelah restart/deploy atau ganti tunnel URL, daftarkan ulang
// setWebhook bila mismatch. Fire-and-forget: tidak pernah blokir/gagalkan
// boot; skip bila disabled, base URL kosong, atau DB unavailable. Tanpa
// token/secret di log (sync modul hanya log id + hitungan).
void syncTelegramWebhooks(config, {
  log: {
    info: (o, m) => app.log.info(o, m),
    warn: (o, m) => app.log.warn(o, m),
    error: (o, m) => app.log.error(o, m),
  },
})
  .then((s) => {
    if (!s.skipped) app.log.info({ checked: s.checked, synced: s.synced, upToDate: s.upToDate }, "telegram autosync done");
  })
  .catch((err) => app.log.error({ err: String((err as Error)?.message ?? err) }, "telegram autosync failed"));
