# Portlane Execution State

Current milestone: M10 (completed — pending E2E)
Overall status: IN PROGRESS
Repo class: IMPLEMENTED M00-M10 (M11 pending verification)

M00: PASS — app boots, DB/Redis health checks, queue baseline, FE/BE single port, lint/typecheck/test PASS
M01: PASS — users, auth (register/login/JWT), tenants, memberships, tenant isolation enforced
M02: PASS — API keys (hash, prefix, revoke), IP/CIDR allowlist, trusted proxy, blocked IP audit
M03: PASS — provider registry, contract, capabilities, connection persistence, AES-GCM credential encryption
M04: PASS — telegram/discord/smtp/webhook providers, validation, normalized errors, SSRF on webhook
M05: PASS — destination CRUD, provider validation, tenant ownership
M06: PASS — canonical message, POST /messages, tenant-scoped idempotency, fan-out deliveries, queue dispatch
M07: PASS — worker, state machine (QUEUED→PROCESSING→DELIVERED/FAILED→RETRYING→DEAD), attempts preserved, manual retry
M08: PASS — webhook endpoints, HMAC/bearer secret, IP allowlist, event persistence, forwarding + retry, header redaction
M09: PASS — dashboard (Overview/Providers/Destinations/Messages/Deliveries/Webhooks/Logs/Settings)
M10: PASS — request limits (bodyLimit 1MB + payload 100k), log masking (pino redact + mask.ts), SSRF defense (BLOCKED_RANGES + DNS resolve), rate limits (api-key 60/min, webhook 120/min, auth 10/min, provider test 10/min), credential encryption at rest + rotation audit, security audit_logs (api_key/provider/webhook/ip_allowlist/blocked_ip/secret_rotated)

M11: IN PROGRESS — E2E verification (13 flows) + V1 release
M11 No1 Create tenant: PASS 2026-09-13 — register auto-creates personal tenant + OWNER membership; POST /api/v1/tenants creates second tenant; GET /api/v1/tenants lists both; envelope rc 2001/2000.
M11 No2 Create API key: PASS 2026-09-13 — POST returns 201 rc 2001 with full secret once (pl_live_<prefix>.<secret>); GET list exposes prefix/status/scopes only, no secret leak; stored hashed.
M11 No3 Restrict API key by IP: PASS 2026-09-13 — allowlist 127.0.0.1/32 passes IP gate (404 NOT_FOUND downstream, not 403); 10.255.255.0/24 from 127.0.0.1 returns 403 IP_NOT_ALLOWED + audit api_key.blocked_ip.
M11 No4 Create provider connection: PASS 2026-09-13 — webhook conn 201 rc 2001 (config only, creds never in response); discord conn 201; localhost URL rejected 422 SSRF policy.
M11 No5 Create destination: PASS 2026-09-13 — webhook dst 201 dst_3af59914a4d34e69; discord dst 201 dst_cda0cc3ea40b4cca; conn asing 404.
M11 No6 Submit broadcast: PASS 2026-09-13 — 1 msg msg_19c7bddcf6ce46f5 fan-out 2 QUEUED deliveries; replay idempotency key return 200 id sama, tanpa duplikat.
M11 No7 Process successful delivery: PASS 2026-09-13 — dlv_6cba7049806641f5 QUEUED→PROCESSING→DELIVERED attempt 1, provider 200, delivered_at set. Fix: worker.ts register 4 provider (registry kosong sebabkan NOT_FOUND massal); migrasi 004_inbound_logs (002 sudah applied sebelum tabel ada).
M11 No8 Process retryable failure: PASS 2026-09-13 — dlv_c0163dc47b64485a vs https://httpbin.org/status/500: 3 attempts semua RETRYABLE provider 500 PROVIDER_ERROR, status RETRYING + next_retry_at set (backoff sentral worker).
M11 No9 Reach dead state: PASS 2026-09-13 — dlv_c0163dc47b64485a 5 attempts (4x RETRYABLE, ke-5 FAILED), status DEAD, next_retry_at null, last_error PROVIDER_ERROR. Backoff habis [0,5s,30s,120s,600s].
M11 No10 Manual retry: PASS 2026-09-13 — POST /tenants/ten_4dcb9b6cd3fd47cc/deliveries/dlv_c0163dc47b64485a/retry kembalikan DEAD→QUEUED; conn arah ulang ke https://httpbin.org/post; attempt 6 SUCCESS 200 DELIVERED; 5 riwayat lama utuh.

Last update: 2026-09-13 — M11 No1-No10 verified (tambah dead + manual retry E2E PASS)
Infra: no Docker, mini-server Postgres/Redis via DATABASE_URL/REDIS_URL, trustProxy false default

M10 verification: typecheck PASS, lint PASS, tests 9/9 PASS, build PASS (api + web)
