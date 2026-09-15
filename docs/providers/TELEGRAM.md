# Telegram Provider

Related: [documentation index](../../README.md)

## V1 Capabilities

- SEND_MESSAGE
- RECEIVE_WEBHOOK via Telegram `setWebhook` to Portlane inbound URL
- basic formatting (`parse_mode` passthrough apa pun, tanpa whitelist)
- test live `getMe`

## Inbound Wiring

- Requires `PORTLANE_PUBLIC_BASE_URL` (tanpa trailing slash). Kosong = `POST .../telegram/set-webhook` return `422`, bukan URL rusak.
- Satu bot (provider connection) boleh punya N webhook endpoint; satu endpoint = satu URL publik `POST /hooks/:publicIdentifier` (`/api/v1/hooks/:publicIdentifier` legacy alias).
- Semua endpoint boleh forward ke satu global webhook downstream yang sama — routing per project tetap di downstream, Portlane teruskan raw update apa adanya.
- Secret: `secret` eksplisit di `set-webhook` disimpan di endpoint untuk verifikasi inbound (`x-telegram-bot-api-secret-token` atau legacy `x-webhook-secret`); bila kosong, reuse secret endpoint yang sudah ada.
- Endpoints: `POST /tenants/:tenantId/telegram/set-webhook` (`connectionId, endpointId, secret?`, `10/min`), `GET /tenants/:tenantId/telegram/webhook-info?connectionId=`, `POST /tenants/:tenantId/telegram/delete-webhook` (`connectionId, drop_pending_updates?`).
- Machine: `POST /api/v1/telegram/set-webhook` (Bearer `pl_live_...`, scope `telegram:webhook:write` explicitly granted — scope-less legacy keys are denied, `10/min` per key, IP allowlist enforced, `allowed_providers` must be empty or include `telegram`, `telegram.webhook_set` audit with `actor_type api_key`).
- Error mapping: `401/403` Telegram → `422 VALIDATION_ERROR`; gagal lain → `502 PROVIDER_ERROR`. Pesan error hanya method + description Telegram, tanpa token.
- UI (halaman Webhooks → tombol Telegram per endpoint): pilih endpoint + akun Telegram, lihat URL yang sedang terdaftar di sisi Telegram (`getWebhookInfo`), peringatan bila tidak cocok dengan endpoint ini (anti salah alamat), jalur forward endpoint ditampilkan, secret opsional + Generate, lalu Set/Hapus. Setelah set, status dibaca ulang untuk konfirmasi cocok.

## Connection Config

- bot token
- optional default parse mode

## Destination Config

- chat_id
- optional thread/topic identifier later

## Test Connection

Use the Telegram API to validate bot credentials without exposing the token.

## Error Mapping

Normalize cases such as:

- invalid token
- forbidden bot
- chat not found
- rate limited
- timeout
- Telegram 5xx
