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
cp .env.example .env
# isi DATABASE_URL + REDIS_URL ke IP Tailscale minisever
yarn install
yarn workspace @portlane/api migrate
```

## 3. Jalan

```bash
# terminal 1 — API
yarn dev:api

# terminal 2 — worker (proof queue M00)
yarn workspace @portlane/api dev:worker

# terminal 3 — dashboard shell
yarn dev:web
```

## 4. Verifikasi

```bash
curl localhost:3000/health
curl localhost:3000/ready            # 503 + pesan jelas bila infra down
curl -X POST localhost:3000/internal/m00-ping
yarn lint && yarn typecheck && yarn test && yarn build
```

## 5. Jika infra down

App fail fast dengan pesan jelas (`Database connection failed…`,
`Redis connection failed…`). Jangan klaim PASS — laporkan
`IMPLEMENTED — VERIFICATION BLOCKED` + pesan error persisnya (AGENTS §77).
