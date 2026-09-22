// CI/CD hook: daftarkan ulang Telegram webhook ke PUBLIC_BASE_URL baru.
// Dipakai setelah deploy / ganti tunnel URL (cloudflared quick tunnel random
// tiap restart). Alternatif: biarkan API boot autosync (TELEGRAM_WEBHOOK_AUTOSYNC).
// Run: yarn workspace @portlane/api sync:telegram-webhooks
// Env: DATABASE_URL, PORTLANE_PUBLIC_BASE_URL (+ APP_ENCRYPTION_KEY/JWT_SECRET).
import "dotenv/config";
import { loadConfig } from "../src/config.js";
import { syncTelegramWebhooks } from "../src/modules/providers/telegram/sync.js";
import { closeDb } from "../src/db.js";

const config = loadConfig();
const summary = await syncTelegramWebhooks(config, { log: console as unknown as { info(o: Record<string, unknown>, m: string): void; warn(o: Record<string, unknown>, m: string): void; error(o: Record<string, unknown>, m: string): void } });
// Ringkasan aman: tanpa token/secret/URL penuh yang sensitif — hanya hitungan + id.
console.log(JSON.stringify({ ...summary, failed: summary.failed.map((f) => ({ ...f })) }, null, 2));
await closeDb().catch(() => {});
if (summary.failed.length > 0) process.exit(1);
