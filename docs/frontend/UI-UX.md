# Portlane — UI/UX Specification

Related: [documentation index](../../README.md)

## 1. Navigation

Aktual (`App.tsx`):

```text
Overview
Providers
Destinations
Messages
Deliveries (/deliveries)
Webhooks
Logs
API Keys (/api-keys, bukan /settings)
IP Access (/ip-access, top-level tambahan)
Inbound (/inbound, tambahan)
Docs (/docs, tambahan)
```

Settings direname API Keys; Tenant/Members/General belum ada UI (API members ada, nol caller).

## 2. Overview

Cards (spec):

- Messages today
- Delivered
- Failed
- Queued
- Active providers
- Webhooks received

Also show recent failures.

Aktual: abaikan `recent_failures`, sparks/bars/breakdown hardcoded, kartu Queued/Active providers hilang.

## 3. Providers

List provider connections:

- name
- provider
- status
- last tested
- actions

Actions:

- Add
- Edit
- Test
- Enable/disable
- Delete

Provider credentials must never be shown back in full after creation.

## 4. Destinations

Show:

- destination name
- provider
- provider connection
- status
- target summary

## 5. Messages

Columns:

- message ID
- created at
- destination count
- delivered
- failed
- overall summary

Message detail includes all deliveries.

## 6. Delivery Detail

Show:

- provider
- destination
- current status
- attempt count
- timestamps
- safe provider response
- normalized error
- retry button when eligible

## 7. Webhooks

Single-flow layout (no tabs), user POV:

- Public readiness banner (plain language: "Siap menerima pesan" / "Belum bisa dihubungi dari internet").
- Telegram wizard card: stepper Pilih bot → Pilih penerima → Aktifkan, with per-connection match/mismatch/pending diagnosis and technical details collapsed.
- Linked bots table (bot, endpoint, last set).
- Endpoints table: name, public URL (copy), forwarding target ("hanya disimpan" when none), key (`Secret ●`/`HMAC ●`/`Tanpa kunci` via `has_secret` + `signature_mode`), status.
- Actions per endpoint: Sambungkan bot (scrolls to wizard + preselects), Edit (name/forwarding URL/mode kunci/rotasi secret/status), Tes (test-forward, only when forwarding URL set, `x-portlane-test` flag, audit only), IP allowlist, Delete (confirm).
- Creation entry point: wizard step 2 ("Baru"/"Buat penerima") opens the Create Endpoint modal (name + optional forwarding URL + mode kunci + optional secret); secret baru tampil sekali via `_oneTimeSecret` banner (copy + dismiss).
- Edit endpoint: mode kunci (`none`/`hmac_sha256`) + rotasi secret (kosongkan = tetap lama); secret baru tampil sekali via `_oneTimeSecret` banner.

Webhook event detail (drawer: `payload_json` ter-redact + forward attempts + `request_id,source_ip,method,safe_headers_json,status,received_at`):

Webhook event detail (drawer: `payload_json` ter-redact + forward attempts + `request_id,source_ip,method,safe_headers_json,status,received_at`):

- request ID
- time
- source IP
- method
- safe headers
- payload
- processing status
- forwarding attempts

## 8. Settings

Spec subsections:

- Tenant
- Members
- API Keys
- IP Access Rules
- General

Aktual: hanya API Keys. Members API ada tanpa UI.

API key detail:

- name
- status
- created
- last used
- allowed IPs/CIDRs
- revoke

## 9. UX Rules

- Always show tenant context clearly.
- Use explicit destructive confirmations.
- Never reveal stored secrets.
- Provide copy-once API key behavior.
- Show provider test result immediately.
- Make failed deliveries easy to inspect.
- Avoid advanced workflow-builder UI in V1.
