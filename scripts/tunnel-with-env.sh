#!/usr/bin/env bash
# Wrapper ExecStart untuk cloudflared-portlane.service.
# Menulis URL quick tunnel yang aktif ke /run/portlane/tunnel-url agar
# portlane-tunnel-url.path bisa memicu sync env + restart API otomatis.
# Tanpa ini, reboot = tunnel dapat URL baru tapi BASE di env file basi
# dan webhook Telegram mati sampai diperbaiki manual.
set -euo pipefail

PORT="${APP_PORT:-4002}"
URL_FILE="/run/portlane/tunnel-url"
LOG_FILE="${TUNNEL_LOG:-/run/portlane/tunnel.log}"

mkdir -p "$(dirname "$URL_FILE")"
/usr/local/bin/cloudflared tunnel --url "http://127.0.0.1:${PORT}" --no-autoupdate > "$LOG_FILE" 2>&1 &
CF_PID=$!

# Tunggu URL muncul di log, lalu publish ke URL_FILE (atomic via tmp+mv
# agar path unit tidak baca file setengah tulis).
for _ in $(seq 1 60); do
  URL=$(grep -oE 'https://[A-Za-z0-9.-]*\.trycloudflare\.com' "$LOG_FILE" 2>/dev/null | head -n 1 || true)
  if [ -n "${URL:-}" ]; then
    echo -n "$URL" > "${URL_FILE}.tmp" && mv "${URL_FILE}.tmp" "$URL_FILE"
    break
  fi
  sleep 1
done

# Jadikan cloudflared sebagai proses utama: teruskan sinyal, tunggu exit
# (kodenya = kode service ini, systemd Restart=always tetap berlaku).
trap 'kill "$CF_PID" 2>/dev/null || true' INT TERM
wait "$CF_PID"
