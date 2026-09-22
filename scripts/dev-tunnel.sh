#!/usr/bin/env bash
# Dev helper: full-otomatis Telegram webhook meski pakai quick tunnel.
#
# Alur: start cloudflared quick tunnel → tangkap URL random-nya →
# export PORTLANE_PUBLIC_BASE_URL → jalankan API. Autosync di dalam API
# (TELEGRAM_WEBHOOK_AUTOSYNC, default on) yang lanjut daftarkan ulang
# setWebhook ke Telegram bila URL berubah. Restart laptop = jalanin ini lagi,
# tidak ada klik manual di dashboard.
#
# Pakai: yarn dev:tunnel  (atau ./scripts/dev-tunnel.sh)
# Env opsional: APP_PORT (default 4002), CF_LOG (default /tmp/portlane-cloudflared.log)
set -euo pipefail

PORT="${APP_PORT:-4002}"
CF_LOG="${CF_LOG:-/tmp/portlane-cloudflared.log}"
: > "$CF_LOG"

echo "[tunnel] starting cloudflared quick tunnel -> http://localhost:${PORT} ..."
cloudflared tunnel --url "http://localhost:${PORT}" --no-autoupdate > "$CF_LOG" 2>&1 &
CF_PID=$!
trap 'kill $CF_PID 2>/dev/null || true' EXIT INT TERM

URL=""
for _ in $(seq 1 45); do
  URL=$(grep -oE 'https://[A-Za-z0-9.-]*\.trycloudflare\.com' "$CF_LOG" | head -n 1 || true)
  if [ -n "$URL" ]; then break; fi
  sleep 1
done

if [ -z "$URL" ]; then
  echo "[tunnel] gagal dapat URL dari cloudflared. Lihat log: $CF_LOG" >&2
  tail -n 20 "$CF_LOG" >&2 || true
  exit 1
fi

export PORTLANE_PUBLIC_BASE_URL="$URL"
echo "[tunnel] $URL -> http://localhost:${PORT}"
echo "[tunnel] PORTLANE_PUBLIC_BASE_URL=$URL (autosync webhook jalan saat API boot)"
echo "[tunnel] log cloudflared: $CF_LOG (pid $CF_PID)"

exec yarn dev:api
