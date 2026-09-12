# Local Development (minisever via Tailscale, tanpa Docker)

Infra (Postgres + Redis) jalan di minisever, diakses lewat Tailscale.
Repo ini TIDAK memakai Docker / compose. Jangan tambahkan `Dockerfile`,
`docker-compose.yml`, atau `.dockerignore` tanpa instruksi eksplisit.

## 1. Prasyarat

- Tailscale connect ke minisever (pastikan IP 100.x reachable)
- Node >= 20, `yarn` (classic)
- Kredensial minisever (minta ke owner, simpan di `.env`, jangan commit)

## 2. Setup

```bash
# .env gitignore — prod secrets, tanpa file example
# buat .env manual atau via: yarn rtk setup
cat > .env <<'ENV'
APP_PORT=4002
DATABASE_URL=postgresql://USER:PASS@YOUR_TAILSCALE_IP:5432/portlane
REDIS_URL=redis://YOUR_TAILSCALE_IP:6379
APP_ENCRYPTION_KEY=$(openssl rand -hex 32)
ENV
# PENTING: DB portlane terpisah — JANGAN pakai ai_engineering_os
yarn install
yarn rtk db:create      # buat DB portlane jika belum ada
yarn rtk db:migrate     # atau: yarn workspace @portlane/api migrate
```

## 3. Jalan

Port: **API 4002**, **Web (Vite) 3002**. Prod single-port: BE serve `apps/web/dist` di 4002.
Dev: Vite HMR di 3002 proxy `/api /health /ready /hooks /internal` ke API 4002.

Pakai toolkit (recommended):

```bash
yarn rtk dev        # api 4002 + worker + web 3002 (log .rtk/logs/)
yarn rtk status
yarn rtk logs -f
yarn rtk stop
```

Manual (tanpa rtk):

```bash
# terminal 1 — API (4002)
yarn dev:api

# terminal 2 — worker (proof queue M00)
yarn workspace @portlane/api dev:worker

# terminal 3 — dashboard shell (Vite HMR 3002 → proxy ke 4002)
yarn dev:web
```

Prod single-port (4002):

```bash
yarn build
DATABASE_URL=... REDIS_URL=... node apps/api/dist/index.js
# buka :4002 → / → dashboard, /health → JSON, /api/* → 404 JSON
```

## 4. Verifikasi

```bash
curl localhost:4002/health
curl localhost:4002/ready            # 503 + pesan jelas bila infra down
curl -X POST localhost:4002/internal/m00-ping
yarn lint && yarn typecheck && yarn test && yarn build
# atau via toolkit:
yarn rtk health && yarn rtk ready && yarn rtk check
```

## 5. Jika infra down

App fail fast dengan pesan jelas (`Database connection failed…`,
`Redis connection failed…`). Jangan klaim PASS — laporkan
`IMPLEMENTED — VERIFICATION BLOCKED` + pesan error persisnya (AGENTS §77).
