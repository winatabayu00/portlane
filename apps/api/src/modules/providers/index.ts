import { registerProvider } from "./core/registry.js";
import { telegramProvider } from "./telegram/index.js";
import { discordProvider } from "./discord/index.js";
import { smtpProvider } from "./smtp/index.js";
import { webhookProvider } from "./webhook/index.js";

// Single place to register every provider. Adding a provider means editing
// this file only — messaging/delivery core stays untouched (§36).
export function registerAllProviders(): void {
  registerProvider(telegramProvider);
  registerProvider(discordProvider);
  registerProvider(smtpProvider);
  registerProvider(webhookProvider);
}
