import { useState } from "react";

const BASE = window.location.origin;

function Code({ children, lang }: { children: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: "relative", background: "#0D0D0D", border: "1px solid #242424", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid #1E1E1E", background: "#101010" }}>
        <span style={{ fontSize: 11, color: "#737373", fontFamily: "var(--font-mono)" }}>{lang ?? "bash"}</span>
        <button
          onClick={async () => { await navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
          style={{ fontSize: 11, background: copied ? "#22C55E" : "#171717", color: copied ? "white" : "#A3A3A3", border: "1px solid #2A2A2A", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre style={{ margin: 0, padding: "14px 16px", overflow: "auto", fontFamily: "var(--font-mono)", fontSize: 12.5, lineHeight: 1.6, color: "#E5E5E5", whiteSpace: "pre" }}>{children}</pre>
    </div>
  );
}

function Badge({ children, tone = "neutral" }: { children: string; tone?: "green" | "orange" | "neutral" | "red" | "blue" }) {
  const bg: Record<string, string> = { green: "rgba(34,197,94,0.12)", orange: "rgba(255,122,0,0.12)", neutral: "#171717", red: "rgba(239,68,68,0.12)", blue: "rgba(59,130,246,0.12)" };
  const fg: Record<string, string> = { green: "#22C55E", orange: "#FF7A00", neutral: "#A3A3A3", red: "#EF4444", blue: "#3B82F6" };
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: bg[tone], color: fg[tone], border: `1px solid ${tone === "neutral" ? "#2A2A2A" : "transparent"}`, fontFamily: "var(--font-mono)" }}>{children}</span>;
}

function Method({ m }: { m: string }) {
  const map: Record<string, string> = { GET: "#22C55E", POST: "#FF7A00", PATCH: "#3B82F6", DELETE: "#EF4444", PUT: "#A855F7" };
  return <span style={{ fontSize: 11, fontWeight: 700, background: map[m] ?? "#737373", color: "white", padding: "3px 7px", borderRadius: 6, fontFamily: "var(--font-mono)" }}>{m}</span>;
}

const NAV = [
  { id: "overview", label: "Overview" },
  { id: "base", label: "Base URL & Header" },
  { id: "auth", label: "Autentikasi" },
  { id: "envelope", label: "Response Envelope" },
  { id: "errors", label: "Error Codes" },
  { id: "telegram", label: "Telegram End-to-End" },
  { id: "send", label: "POST /api/v1/messages" },
  { id: "dashboard-send", label: "Dashboard Send" },
  { id: "messages", label: "Messages & Deliveries" },
  { id: "providers", label: "Provider Connections" },
  { id: "destinations", label: "Destinations" },
  { id: "webhook-inbound", label: "Webhook Inbound (Publik)" },
  { id: "webhook-mgmt", label: "Webhook Management" },
  { id: "health", label: "Health & Ready" },
];

export default function Docs() {
  return (
    <div style={{ minHeight: "100vh", background: "#070707", color: "#F5F5F5" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(7,7,7,0.9)", backdropFilter: "blur(8px)", borderBottom: "1px solid #242424" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "#FF7A00", display: "grid", placeItems: "center", color: "white", fontWeight: 700, fontSize: 13 }}>P</div>
          <div style={{ fontWeight: 700, letterSpacing: -0.02 }}>PORTLANE</div>
          <span style={{ fontSize: 12, color: "#737373", borderLeft: "1px solid #242424", paddingLeft: 12, marginLeft: 4 }}>API Documentation</span>
          <Badge tone="green">Publik — tanpa login</Badge>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#737373", fontFamily: "var(--font-mono)" }}>{BASE}</span>
            <a href="/" style={{ fontSize: 12, color: "#A3A3A3", border: "1px solid #242424", padding: "6px 10px", borderRadius: 8, textDecoration: "none", background: "#101010" }}>← Dashboard</a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 20px 40px", display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
        <aside style={{ position: "sticky", top: 64, alignSelf: "start", maxHeight: "calc(100vh - 80px)", overflow: "auto", paddingRight: 8 }}>
          <div style={{ fontSize: 11, letterSpacing: 0.08, color: "#737373", fontWeight: 600, marginBottom: 8 }}>DAFTAR ISI</div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`} style={{ fontSize: 13, color: "#A3A3A3", textDecoration: "none", padding: "7px 10px", borderRadius: 8, border: "1px solid transparent" }}>{n.label}</a>
            ))}
          </nav>
          <div style={{ marginTop: 16, padding: 12, background: "#101010", border: "1px solid #242424", borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Coba cepat</div>
            <div style={{ fontSize: 11, color: "#737373", lineHeight: 1.5 }}>Semua contoh <code style={{ fontFamily: "var(--font-mono)", background: "#1A1A1A", padding: "1px 5px", borderRadius: 4 }}>curl</code> callable — ganti <code style={{ fontFamily: "var(--font-mono)", background: "#1A1A1A", padding: "1px 5px", borderRadius: 4 }}>pl_live_...</code>, <code style={{ fontFamily: "var(--font-mono)", background: "#1A1A1A", padding: "1px 5px", borderRadius: 4 }}>tenantId</code>, dan <code style={{ fontFamily: "var(--font-mono)", background: "#1A1A1A", padding: "1px 5px", borderRadius: 4 }}>destinationId</code> dengan nilai asli.</div>
          </div>
        </aside>

        <main style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>

          <section id="overview" style={{ background: "#101010", border: "1px solid #242424", borderRadius: 12, padding: 20 }}>
            <h1 style={{ margin: 0, fontSize: 22, letterSpacing: -0.02 }}>Portlane API — kirim Telegram & terima Webhook</h1>
            <p style={{ color: "#A3A3A3", fontSize: 13, lineHeight: 1.6, margin: "8px 0 0" }}>
              Portlane gateway multi-tenant. Satu <em>canonical message</em> → banyak <em>deliveries</em> via provider adapter (Telegram, Discord, SMTP, Webhook). Dokumentasi ini <strong>publik</strong> dan spesifikasi diambil langsung dari kode (<code style={{ fontFamily: "var(--font-mono)" }}>apps/api/src/modules/*</code>).
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <Badge tone="orange">Telegram SEND_MESSAGE</Badge><Badge tone="blue">Webhook RECEIVE_WEBHOOK</Badge><Badge>Idempotency per-tenant</Badge><Badge>SSRF guard</Badge><Badge>IP allowlist CIDR</Badge>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
              <div style={{ background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, color: "#737373", fontWeight: 600 }}>ALUR TELEGRAM</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#E5E5E5", marginTop: 6, lineHeight: 1.6 }}>Client → POST /api/v1/messages (Bearer pl_live_) → validasi destination active → simpan message + deliveries QUEUED → enqueue → worker → TelegramAdapter → https://api.telegram.org/bot&lt;token&gt;/sendMessage</div>
              </div>
              <div style={{ background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, color: "#737373", fontWeight: 600 }}>ALUR WEBHOOK INBOUND</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#E5E5E5", marginTop: 6, lineHeight: 1.6 }}>Provider → POST /hooks/:publicIdentifier → cek status active → cek IP allowlist → cek signature/secret → rate limit → simpan webhook_events → forward ke forwarding_url (SSRF-checked) → 200 {"{id, status:'received'}"}</div>
              </div>
            </div>
          </section>

          <section id="base" style={{ background: "#101010", border: "1px solid #242424", borderRadius: 12, padding: 20 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Base URL & Header Umum</h2>
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ fontSize: 12, color: "#737373" }}>Base URL</span><code style={{ fontFamily: "var(--font-mono)", background: "#0D0D0D", border: "1px solid #242424", padding: "6px 10px", borderRadius: 8, fontSize: 12 }}>{BASE}</code></div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ color: "#737373", fontSize: 11 }}><th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #1E1E1E" }}>Header</th><th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #1E1E1E" }}>Wajib</th><th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #1E1E1E" }}>Keterangan</th></tr></thead>
                <tbody>
                  <tr><td style={{ padding: "8px 6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>Content-Type: application/json</td><td style={{ padding: "8px 6px", borderBottom: "1px solid #1E1E1E" }}>Ya</td><td style={{ padding: "8px 6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>Body kosong kirim <code style={{ fontFamily: "var(--font-mono)" }}>{"{}"}</code> atau tanpa Content-Type</td></tr>
                  <tr><td style={{ padding: "8px 6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>Authorization: Bearer pl_live_...</td><td style={{ padding: "8px 6px", borderBottom: "1px solid #1E1E1E" }}>Machine API</td><td style={{ padding: "8px 6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>Untuk POST /api/v1/messages</td></tr>
                  <tr><td style={{ padding: "8px 6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>Authorization: Bearer &lt;jwt&gt;</td><td style={{ padding: "8px 6px", borderBottom: "1px solid #1E1E1E" }}>Dashboard</td><td style={{ padding: "8px 6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>Untuk /api/v1/tenants/:tenantId/*</td></tr>
                  <tr><td style={{ padding: "8px 6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>Idempotency-Key: &lt;string&gt;</td><td style={{ padding: "8px 6px", borderBottom: "1px solid #1E1E1E" }}>Opsional</td><td style={{ padding: "8px 6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>Cegah duplikat message (scope tenant+apiKey)</td></tr>
                  <tr><td style={{ padding: "8px 6px", fontFamily: "var(--font-mono)" }}>x-request-id / x-correlation-id</td><td style={{ padding: "8px 6px" }}>Auto</td><td style={{ padding: "8px 6px", color: "#A3A3A3" }}>Server kembalikan di response header & body.correlationId</td></tr>
                </tbody>
              </table>
              <div style={{ fontSize: 12, color: "#737373" }}>Body limit 1 MB. Correlation ID format <code style={{ fontFamily: "var(--font-mono)" }}>req_&lt;24hex&gt;</code> ada di setiap response.</div>
            </div>
          </section>

          <section id="auth" style={{ background: "#101010", border: "1px solid #242424", borderRadius: 12, padding: 20 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Autentikasi</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <div style={{ background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: 10, padding: 14 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Machine API — API Key <Badge tone="orange">pl_live_*</Badge></div>
                <div style={{ fontSize: 12, color: "#A3A3A3", marginTop: 6, lineHeight: 1.6 }}>Buat di dashboard: <code style={{ fontFamily: "var(--font-mono)" }}>POST /api/v1/tenants/:tenantId/api-keys {"{name}"}</code> → dapat <code style={{ fontFamily: "var(--font-mono)" }}>key</code> plaintext 1x saja. Selanjutnya kirim <code style={{ fontFamily: "var(--font-mono)" }}>Authorization: Bearer pl_live_xxx</code>. Validasi: key ada, status active, IP allowlist (CIDR) lolos, rate limit.</div>
                <Code lang="bash">{`curl -i ${BASE}/api/v1/messages \\
  -H "Authorization: Bearer pl_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"destinations":["dst_xxx"],"message":{"body":"hello"}}'`}</Code>
              </div>
              <div style={{ background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: 10, padding: 14 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Dashboard — JWT</div>
                <div style={{ fontSize: 12, color: "#A3A3A3", marginTop: 6, lineHeight: 1.6 }}><code style={{ fontFamily: "var(--font-mono)" }}>POST /api/v1/auth/login {"{email,password}"}</code> → <code style={{ fontFamily: "var(--font-mono)" }}>token</code>. Pakai <code style={{ fontFamily: "var(--font-mono)" }}>Authorization: Bearer &lt;jwt&gt;</code> untuk semua <code style={{ fontFamily: "var(--font-mono)" }}>/api/v1/tenants/:tenantId/*</code>. Server cek membership (OWNER/MEMBER) dan tenant isolation.</div>
                <Code lang="bash">{`curl -s ${BASE}/api/v1/auth/login -H "Content-Type: application/json" \\
  -d '{"email":"you@mail.com","password":"secret"}' | jq
# -> {"data":{"token":"eyJ...","tenant":{"id":"t_xxx"}}}

curl ${BASE}/api/v1/tenants/t_xxx/messages -H "Authorization: Bearer eyJ..."`}</Code>
              </div>
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, padding: 12, fontSize: 12, lineHeight: 1.6 }}>
                <strong style={{ color: "#F59E0B" }}>Catatan keamanan:</strong> tenantId selalu diverifikasi server-side via <code style={{ fontFamily: "var(--font-mono)" }}>tenant_memberships</code>. Kirim API key milik Tenant A tidak bisa akses destination/connection milik Tenant B → <code style={{ fontFamily: "var(--font-mono)" }}>404 NOT_FOUND</code> atau <code style={{ fontFamily: "var(--font-mono)" }}>403</code>. IP allowlist dukung IPv4/IPv6/CIDR, dicek via parser CIDR (bukan string compare). Forwarded IP hanya dipercaya dari proxy terdaftar (<code style={{ fontFamily: "var(--font-mono)" }}>trustProxy</code> config).
              </div>
            </div>
          </section>

          <section id="envelope" style={{ background: "#101010", border: "1px solid #242424", borderRadius: 12, padding: 20 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Response Envelope</h2>
            <p style={{ color: "#A3A3A3", fontSize: 12, margin: "6px 0 0" }}>Semua endpoint pakai format terpusat <code style={{ fontFamily: "var(--font-mono)" }}>ApiResponse</code> (apps/api/src/common/api-response.ts). Correlation ID ada di header dan body.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Sukses</div>
                <Code lang="json">{`{
  "rc": 200,
  "status": "success",
  "message": "OK",
  "data": { "id": "msg_xxx", "status": "queued", "deliveries": [...] },
  "errors": null,
  "correlationId": "req_abc123...",
  "timestamp": "2026-03-09T00:00:00.000Z",
  "meta": { "page": 1, "per_page": 25, "total": 42 }
}`}</Code>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Gagal</div>
                <Code lang="json">{`{
  "rc": 401,
  "status": "failed",
  "message": "Unauthorized",
  "data": null,
  "errors": { "code": "UNAUTHORIZED", "message": "Invalid API key." },
  "correlationId": "req_abc123...",
  "timestamp": "2026-03-09T00:00:00.000Z"
}`}</Code>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#737373", marginTop: 8 }}>Header response: <code style={{ fontFamily: "var(--font-mono)" }}>x-request-id</code> dan <code style={{ fontFamily: "var(--font-mono)" }}>x-correlation-id</code> = body.correlationId. Log server redact Authorization/Cookie/token/botToken.</div>
          </section>

          <section id="errors" style={{ background: "#101010", border: "1px solid #242424", borderRadius: 12, padding: 20 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Error Codes & HTTP Status</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 12 }}>
              <thead><tr style={{ color: "#737373", fontSize: 11 }}><th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #1E1E1E" }}>HTTP</th><th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #1E1E1E" }}>code</th><th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #1E1E1E" }}>Kapan</th></tr></thead>
              <tbody style={{ color: "#E5E5E5" }}>
                <tr><td style={{ padding: "7px 6px", borderBottom: "1px solid #1E1E1E" }}>400</td><td style={{ padding: "7px 6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>BAD_REQUEST</td><td style={{ padding: "7px 6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>JSON invalid / Content-Type salah</td></tr>
                <tr><td style={{ padding: "7px 6px", borderBottom: "1px solid #1E1E1E" }}>401</td><td style={{ padding: "7px 6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>UNAUTHORIZED</td><td style={{ padding: "7px 6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>API key hilang/salah/revoked, webhook secret/signature salah</td></tr>
                <tr><td style={{ padding: "7px 6px", borderBottom: "1px solid #1E1E1E" }}>403</td><td style={{ padding: "7px 6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>IP_NOT_ALLOWED</td><td style={{ padding: "7px 6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>IP sumber tidak masuk CIDR allowlist</td></tr>
                <tr><td style={{ padding: "7px 6px", borderBottom: "1px solid #1E1E1E" }}>404</td><td style={{ padding: "7px 6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>NOT_FOUND</td><td style={{ padding: "7px 6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>Destination/connection/message/endpoint tidak ada atau beda tenant</td></tr>
                <tr><td style={{ padding: "7px 6px", borderBottom: "1px solid #1E1E1E" }}>409</td><td style={{ padding: "7px 6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>CONFLICT</td><td style={{ padding: "7px 6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>Delivery tidak eligible untuk retry</td></tr>
                <tr><td style={{ padding: "7px 6px", borderBottom: "1px solid #1E1E1E" }}>413</td><td style={{ padding: "7px 6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>PAYLOAD_TOO_LARGE</td><td style={{ padding: "7px 6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>Body &gt;1MB atau webhook payload &gt;100_000 chars</td></tr>
                <tr><td style={{ padding: "7px 6px", borderBottom: "1px solid #1E1E1E" }}>422</td><td style={{ padding: "7px 6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>VALIDATION_ERROR</td><td style={{ padding: "7px 6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>Zod fail / destination disabled / SSRF block / forwarding_url kosong</td></tr>
                <tr><td style={{ padding: "7px 6px", borderBottom: "1px solid #1E1E1E" }}>429</td><td style={{ padding: "7px 6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>RATE_LIMITED</td><td style={{ padding: "7px 6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>Machine 60/min, Dashboard msg 60/min, webhook 120/min, provider test 10/min</td></tr>
                <tr><td style={{ padding: "7px 6px", borderBottom: "1px solid #1E1E1E" }}>502</td><td style={{ padding: "7px 6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>PROVIDER_ERROR</td><td style={{ padding: "7px 6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>Forward webhook gagal</td></tr>
                <tr><td style={{ padding: "7px 6px" }}>500/503</td><td style={{ padding: "7px 6px", fontFamily: "var(--font-mono)" }}>INTERNAL_ERROR / INFRA_UNAVAILABLE</td><td style={{ padding: "7px 6px", color: "#A3A3A3" }}>Enqueue gagal / Redis down (production hide stack)</td></tr>
              </tbody>
            </table>
          </section>

          <section id="telegram" style={{ background: "#101010", border: "1px solid #242424", borderRadius: 12, padding: 20 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Telegram — End-to-End (sesuai kode)</h2>
            <p style={{ color: "#A3A3A3", fontSize: 12, margin: "6px 0 0", lineHeight: 1.6 }}>Provider key <code style={{ fontFamily: "var(--font-mono)" }}>telegram</code> capability <code style={{ fontFamily: "var(--font-mono)" }}>SEND_MESSAGE, RECEIVE_WEBHOOK</code>. Adapter di <code style={{ fontFamily: "var(--font-mono)" }}>apps/api/src/modules/providers/telegram/index.ts</code>.</p>
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <div style={{ background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>1) Buat Provider Connection (Telegram)</div>
                <div style={{ fontSize: 12, color: "#A3A3A3", marginTop: 4 }}><Method m="POST" /> <code style={{ fontFamily: "var(--font-mono)" }}>/api/v1/tenants/:tenantId/provider-connections</code> — butuh JWT. <code style={{ fontFamily: "var(--font-mono)" }}>credentials: {"{botToken}"}</code> wajib (string). <code style={{ fontFamily: "var(--font-mono)" }}>config.parse_mode</code> opsional diteruskan ke Telegram.</div>
                <Code lang="bash">{`curl -X POST ${BASE}/api/v1/tenants/t_xxx/provider-connections \\
  -H "Authorization: Bearer eyJ..." -H "Content-Type: application/json" \\
  -d '{
    "provider_key": "telegram",
    "name": "Prod Bot",
    "config": { "parse_mode": "HTML" },
    "credentials": { "botToken": "123456:ABC..." }
  }'
# -> 201 {"data":{"id":"conn_...","provider_key":"telegram","name":"Prod Bot",...}}`}</Code>
                <div style={{ fontSize: 11, color: "#737373", marginTop: 6 }}>Validasi: kalau <code style={{ fontFamily: "var(--font-mono)" }}>credentials.botToken</code> kosong → 422 VALIDATION_ERROR "botToken required". Kredensial dienkripsi at-rest (APP_ENCRYPTION_KEY), tidak pernah dikembalikan di GET.</div>
              </div>
              <div style={{ background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>2) Buat Destination (chat_id)</div>
                <div style={{ fontSize: 12, color: "#A3A3A3", marginTop: 4 }}><Method m="POST" /> <code style={{ fontFamily: "var(--font-mono)" }}>/api/v1/tenants/:tenantId/destinations</code> — butuh <code style={{ fontFamily: "var(--font-mono)" }}>provider_connection_id</code> milik tenant yang sama.</div>
                <Code lang="bash">{`curl -X POST ${BASE}/api/v1/tenants/t_xxx/destinations \\
  -H "Authorization: Bearer eyJ..." -H "Content-Type: application/json" \\
  -d '{
    "provider_connection_id": "conn_xxx",
    "name": "Ops Group",
    "config": { "chat_id": "-1001234567890" }
  }'
# config.chat_id atau config.chatId wajib, else 422 "chat_id required"`}</Code>
              </div>
              <div style={{ background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>3) Test koneksi</div>
                <div style={{ fontSize: 12, color: "#A3A3A3", marginTop: 4 }}><Method m="POST" /> <code style={{ fontFamily: "var(--font-mono)" }}>/api/v1/tenants/:tenantId/provider-connections/:connId/test</code> — panggil <code style={{ fontFamily: "var(--font-mono)" }}>https://api.telegram.org/bot&lt;token&gt;/getMe</code> (timeout 8s), rate 10/min per user.</div>
                <Code lang="bash">{`curl -X POST ${BASE}/api/v1/tenants/t_xxx/provider-connections/conn_xxx/test \\
  -H "Authorization: Bearer eyJ..." -H "Content-Type: application/json" -d '{}'
# -> {"data":{"ok":true,"message":"ok as @MyBot"}}`}</Code>
              </div>
              <div style={{ background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>4) Payload yang dikirim adapter ke Telegram</div>
                <Code lang="json">{`POST https://api.telegram.org/bot<botToken>/sendMessage
{
  "chat_id": "-1001234567890",
  "text": "Production Alert\\nAPI down at 02:00 UTC",
  "parse_mode": "HTML" // jika config.parse_mode di-set
}`}</Code>
                <div style={{ fontSize: 11, color: "#737373", marginTop: 6 }}>Adapter set <code style={{ fontFamily: "var(--font-mono)" }}>text = subject ? subject + "\\n" + body : body</code>. Timeout 10s. Error map: 429→RATE_LIMITED (retryable), 401/403→INVALID_CREDENTIALS, 400→INVALID_DESTINATION, 500+→PROVIDER_ERROR (retryable). Retry diputuskan Delivery Core, bukan adapter.</div>
              </div>
            </div>
          </section>

          <section id="send" style={{ background: "#101010", border: "1px solid #242424", borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Method m="POST" /><code style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>/api/v1/messages</code>
              <Badge tone="orange">Machine API</Badge><Badge>Bearer pl_live_</Badge>
            </div>
            <p style={{ color: "#A3A3A3", fontSize: 12, margin: "8px 0 0" }}>Kirim canonical message → buat deliveries QUEUED + enqueue. Auth dari API key → tenant otomatis (tanpa :tenantId di path).</p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 12 }}>
              <thead><tr style={{ color: "#737373", fontSize: 11 }}><th style={{ textAlign: "left", padding: "6px", borderBottom: "1px solid #1E1E1E" }}>Field</th><th style={{ textAlign: "left", padding: "6px", borderBottom: "1px solid #1E1E1E" }}>Tipe</th><th style={{ textAlign: "left", padding: "6px", borderBottom: "1px solid #1E1E1E" }}>Aturan</th></tr></thead>
              <tbody>
                <tr><td style={{ padding: "6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>destinations</td><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E" }}>string[]</td><td style={{ padding: "6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>1..50, tiap string min 1, harus ada & status active & milik tenant yang sama</td></tr>
                <tr><td style={{ padding: "6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>message.subject</td><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E" }}>string?</td><td style={{ padding: "6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>0..500</td></tr>
                <tr><td style={{ padding: "6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>message.body</td><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E" }}>string</td><td style={{ padding: "6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>1..20000, wajib</td></tr>
                <tr><td style={{ padding: "6px", fontFamily: "var(--font-mono)" }}>message.metadata</td><td style={{ padding: "6px" }}>object?</td><td style={{ padding: "6px", color: "#A3A3A3" }}>record unknown, disimpan sebagai metadata_json</td></tr>
              </tbody>
            </table>
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <Code lang="bash">{`# Minimal — kirim ke 1 Telegram destination
curl -X POST ${BASE}/api/v1/messages \\
  -H "Authorization: Bearer pl_live_xxx" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: order-123" \\
  -d '{
    "destinations": ["dst_abc123"],
    "message": { "body": "Halo dari Portlane" }
  }'

# Broadcast ke banyak provider + subject
curl -X POST ${BASE}/api/v1/messages \\
  -H "Authorization: Bearer pl_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "destinations": ["dst_telegram","dst_discord","dst_smtp"],
    "message": {
      "subject": "Production Alert",
      "body": "API unavailable — investigating",
      "metadata": { "severity": "critical" }
    }
  }'`}</Code>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>201 Created</div>
                  <Code lang="json">{`{
  "rc": 201, "status": "success",
  "data": {
    "id": "msg_xxx",
    "status": "queued",
    "deliveries": [
      { "id": "dlv_1", "destination_id": "dst_abc123", "status": "QUEUED" }
    ]
  },
  "correlationId": "req_..."
}`}</Code>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>200 Idempotent replay</div>
                  <Code lang="json">{`// Jika Idempotency-Key sama (tenant+apiKey+key) sudah pernah
// server tidak buat message baru, kembalikan message lama
{
  "rc": 200, "status": "success",
  "data": { "id": "msg_xxx", "status": "queued", "deliveries": [...] }
}`}</Code>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#A3A3A3", lineHeight: 1.6, background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: 8, padding: 10 }}>
                Flow validasi (sesuai <code style={{ fontFamily: "var(--font-mono)" }}>messaging/routes.ts</code>): resolve API key → cek status active → cek IP allowlist CIDR untuk scope API_KEY → rate 60/min → parse Zod → cek destinations milik tenant & active (else 404/422) → idempotency check → insert messages + deliveries QUEUED → <code style={{ fontFamily: "var(--font-mono)" }}>enqueueDelivery</code> per destination (jika enqueue gagal → 500 INTERNAL_ERROR). Satu message bisa 50 deliveries; gagal enqueue satu destination → respons 500 (delivery lain sudah terinsert). Header Idempotency-Key case-insensitive (<code style={{ fontFamily: "var(--font-mono)" }}>Idempotency-Key</code> atau <code style={{ fontFamily: "var(--font-mono)" }}>idempotency-key</code>).
              </div>
            </div>
          </section>

          <section id="dashboard-send" style={{ background: "#101010", border: "1px solid #242424", borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}><Method m="POST" /><code style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>/api/v1/tenants/:tenantId/messages</code><Badge tone="blue">JWT</Badge></div>
            <p style={{ color: "#A3A3A3", fontSize: 12, margin: "6px 0 0" }}>Varian dashboard — sama dengan machine API tapi tenantId eksplisit di path, auth JWT + membership check, rate 60/min per tenant:user. Body sama. Tidak pakai Idempotency-Key.</p>
            <Code lang="bash">{`curl -X POST ${BASE}/api/v1/tenants/t_xxx/messages \\
  -H "Authorization: Bearer eyJ..." -H "Content-Type: application/json" \\
  -d '{"destinations":["dst_xxx"],"message":{"subject":"Hi","body":"from dashboard"}}'`}</Code>
          </section>

          <section id="messages" style={{ background: "#101010", border: "1px solid #242424", borderRadius: 12, padding: 20 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Messages & Deliveries — query</h2>
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
                <span><Method m="GET" /> <code style={{ fontFamily: "var(--font-mono)" }}>/api/v1/tenants/:tenantId/messages?q=&page=&per_page=</code> <span style={{ color: "#737373" }}>JWT, paginasi per_page max 100, q cari subject/body/id ILIKE</span></span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
                <span><Method m="GET" /> <code style={{ fontFamily: "var(--font-mono)" }}>/api/v1/tenants/:tenantId/messages/:msgId</code> <span style={{ color: "#737373" }}>= message + deliveries</span></span>
                <span><Method m="GET" /> <code style={{ fontFamily: "var(--font-mono)" }}>/api/v1/tenants/:tenantId/deliveries/:dlvId</code> <span style={{ color: "#737373" }}>= delivery + attempts</span></span>
                <span><Method m="POST" /> <code style={{ fontFamily: "var(--font-mono)" }}>/api/v1/tenants/:tenantId/deliveries/:dlvId/retry</code> <span style={{ color: "#737373" }}>hanya jika status FAILED/DEAD/RETRYING → set QUEUED + enqueue (else 409)</span></span>
              </div>
              <Code lang="bash">{`curl ${BASE}/api/v1/tenants/t_xxx/messages?q=alert&page=1&per_page=10 \\
  -H "Authorization: Bearer eyJ..."

curl ${BASE}/api/v1/tenants/t_xxx/messages/msg_xxx -H "Authorization: Bearer eyJ..."
# -> {"data":{"message":{...},"deliveries":[...]}}

curl ${BASE}/api/v1/tenants/t_xxx/deliveries/dlv_xxx -H "Authorization: Bearer eyJ..."
# -> {"data":{"delivery":{...},"attempts":[...]}}

curl -X POST ${BASE}/api/v1/tenants/t_xxx/deliveries/dlv_xxx/retry \\
  -H "Authorization: Bearer eyJ..." -H "Content-Type: application/json" -d '{}'`}</Code>
              <div style={{ fontSize: 11, color: "#737373" }}>Status delivery: QUEUED → PROCESSING → DELIVERED, atau FAILED → RETRYING → DELIVERED/DEAD. Attempts tidak pernah di-overwrite.</div>
            </div>
          </section>

          <section id="providers" style={{ background: "#101010", border: "1px solid #242424", borderRadius: 12, padding: 20 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Provider Connections</h2>
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <div><Method m="GET" /> <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>/api/v1/providers</code> <span style={{ fontSize: 12, color: "#737373" }}>— publik tanpa auth, list kunci & capabilities: telegram [SEND_MESSAGE,RECEIVE_WEBHOOK], discord [SEND_MESSAGE,EMBEDS], smtp, webhook</span></div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr style={{ color: "#737373", fontSize: 11 }}><th style={{ textAlign: "left", padding: "6px", borderBottom: "1px solid #1E1E1E" }}>Method</th><th style={{ textAlign: "left", padding: "6px", borderBottom: "1px solid #1E1E1E" }}>Path</th><th style={{ textAlign: "left", padding: "6px", borderBottom: "1px solid #1E1E1E" }}>Auth</th><th style={{ textAlign: "left", padding: "6px", borderBottom: "1px solid #1E1E1E" }}>Body</th></tr></thead>
                <tbody>
                  <tr><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E" }}><Method m="GET" /></td><td style={{ padding: "6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>/api/v1/tenants/:tenantId/provider-connections?q=&provider_key=&status=</td><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E" }}>JWT</td><td style={{ padding: "6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>filter ILIKE name/provider_key</td></tr>
                  <tr><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E" }}><Method m="POST" /></td><td style={{ padding: "6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>/api/v1/tenants/:tenantId/provider-connections</td><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E" }}>JWT</td><td style={{ padding: "6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>{"{provider_key: 'telegram'|'discord'|'smtp'|'webhook', name, config:{}, credentials:{}}"} </td></tr>
                  <tr><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E" }}><Method m="PATCH" /></td><td style={{ padding: "6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>/api/v1/tenants/:tenantId/provider-connections/:connId</td><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E" }}>JWT</td><td style={{ padding: "6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>{"{name?, config?, credentials?, status:'active'|'disabled'}"}</td></tr>
                  <tr><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E" }}><Method m="DELETE" /></td><td style={{ padding: "6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>/api/v1/tenants/:tenantId/provider-connections/:connId</td><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E" }}>JWT</td><td style={{ padding: "6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>204</td></tr>
                  <tr><td style={{ padding: "6px" }}><Method m="POST" /></td><td style={{ padding: "6px", fontFamily: "var(--font-mono)" }}>/api/v1/tenants/:tenantId/provider-connections/:connId/test</td><td style={{ padding: "6px" }}>JWT</td><td style={{ padding: "6px", color: "#A3A3A3" }}>body {"{}"} (boleh kosong), rate 10/min, update last_tested_at</td></tr>
                </tbody>
              </table>
              <Code lang="bash">{`# Discord webhook
curl -X POST ${BASE}/api/v1/tenants/t_xxx/provider-connections \\
  -H "Authorization: Bearer eyJ..." -H "Content-Type: application/json" \\
  -d '{"provider_key":"discord","name":"Alerts","config":{},"credentials":{"webhookUrl":"https://discord.com/api/webhooks/..."}}'

# SMTP
curl -X POST ${BASE}/api/v1/tenants/t_xxx/provider-connections \\
  -H "Authorization: Bearer eyJ..." -H "Content-Type: application/json" \\
  -d '{"provider_key":"smtp","name":"Mail","config":{},"credentials":{"host":"smtp.mailgun.org","port":587,"senderEmail":"noreply@acme.com"}}'

# Webhook outbound (SSRF-checked)
curl -X POST ${BASE}/api/v1/tenants/t_xxx/provider-connections \\
  -H "Authorization: Bearer eyJ..." -H "Content-Type: application/json" \\
  -d '{"provider_key":"webhook","name":"HTTP","config":{"url":"https://example.com/hook"},"credentials":{}}'
# url diblok jika localhost/127.0.0.0/8/::1/link-local/metadata — 422 "Webhook URL blocked by SSRF policy"`}</Code>
            </div>
          </section>

          <section id="destinations" style={{ background: "#101010", border: "1px solid #242424", borderRadius: 12, padding: 20 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Destinations</h2>
            <div style={{ display: "grid", gap: 10, marginTop: 12, fontSize: 12 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Method m="GET" /> <code style={{ fontFamily: "var(--font-mono)" }}>/api/v1/tenants/:tenantId/destinations?q=&status=&provider_key=</code>
                <Method m="POST" /> <code style={{ fontFamily: "var(--font-mono)" }}>/api/v1/tenants/:tenantId/destinations</code>
                <Method m="GET" /> <code style={{ fontFamily: "var(--font-mono)" }}>/.../:destId</code>
                <Method m="PATCH" /> <code style={{ fontFamily: "var(--font-mono)" }}>/.../:destId</code>
                <Method m="DELETE" /> <code style={{ fontFamily: "var(--font-mono)" }}>/.../:destId</code>
                <span style={{ color: "#737373" }}> — semua JWT, tenant-scoped, hapus 204</span>
              </div>
              <Code lang="bash">{`curl -X POST ${BASE}/api/v1/tenants/t_xxx/destinations \\
  -H "Authorization: Bearer eyJ..." -H "Content-Type: application/json" \\
  -d '{"provider_connection_id":"conn_xxx","name":"My Chat","config":{"chat_id":"-100123"}}'

# List filter provider
curl "${BASE}/api/v1/tenants/t_xxx/destinations?provider_key=telegram&status=active" \\
  -H "Authorization: Bearer eyJ..."`}</Code>
            </div>
          </section>

          <section id="webhook-inbound" style={{ background: "#101010", border: "1px solid #242424", borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Method m="POST" /><code style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>/hooks/:publicIdentifier</code>
              <Badge tone="green">Publik tanpa auth</Badge><Badge>alias /api/v1/hooks/:publicIdentifier</Badge>
            </div>
            <p style={{ color: "#A3A3A3", fontSize: 12, margin: "8px 0 0", lineHeight: 1.6 }}>Endpoint inbound untuk menerima webhook dari provider eksternal. <code style={{ fontFamily: "var(--font-mono)" }}>publicIdentifier</code> format <code style={{ fontFamily: "var(--font-mono)" }}>wh_&lt;24hex&gt;</code> didapat saat buat webhook endpoint via dashboard. Tidak butuh JWT/API key — autentikasi via signature/secret + IP allowlist + rate limit.</p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 12 }}>
              <thead><tr style={{ color: "#737373", fontSize: 11 }}><th style={{ textAlign: "left", padding: "6px", borderBottom: "1px solid #1E1E1E" }}>Aspek</th><th style={{ textAlign: "left", padding: "6px", borderBottom: "1px solid #1E1E1E" }}>Detail (sesuai webhooks/routes.ts)</th></tr></thead>
              <tbody>
                <tr><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E", fontWeight: 600 }}>Method & Path</td><td style={{ padding: "6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>POST /hooks/:publicIdentifier  dan  POST /api/v1/hooks/:publicIdentifier</td></tr>
                <tr><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E", fontWeight: 600 }}>Body</td><td style={{ padding: "6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>JSON apa saja (disimpan sebagai payload_json). Jika <code style={{ fontFamily: "var(--font-mono)" }}>JSON.stringify(body).length &gt; 100_000</code> → 413.</td></tr>
                <tr><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E", fontWeight: 600 }}>IP Allowlist</td><td style={{ padding: "6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>Jika ada entries untuk endpoint (scope WEBHOOK_ENDPOINT, enabled=true) → IP client harus match salah satu CIDR (IPv4/IPv6/CIDR). Gagal → 403 IP_NOT_ALLOWED + audit log <code style={{ fontFamily: "var(--font-mono)" }}>webhook.blocked_ip</code>.</td></tr>
                <tr><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E", fontWeight: 600 }}>Rate limit</td><td style={{ padding: "6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>120 req / 60s per endpoint (key <code style={{ fontFamily: "var(--font-mono)" }}>wh:endpointId</code>) → 429.</td></tr>
                <tr><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E", fontWeight: 600 }}>Auth HMAC</td><td style={{ padding: "6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>Jika <code style={{ fontFamily: "var(--font-mono)" }}>signature_mode=hmac_sha256</code> & ada <code style={{ fontFamily: "var(--font-mono)" }}>encrypted_secret</code> → header <code style={{ fontFamily: "var(--font-mono)" }}>x-webhook-signature</code> atau <code style={{ fontFamily: "var(--font-mono)" }}>x-signature</code> harus = <code style={{ fontFamily: "var(--font-mono)" }}>sha256=&lt;hex HMAC-SHA256(JSON.stringify(body), secret)&gt;</code>. Cek <code style={{ fontFamily: "var(--font-mono)" }}>timingSafeEqual</code>. Salah → 401.</td></tr>
                <tr><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E", fontWeight: 600 }}>Auth Secret</td><td style={{ padding: "6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>Jika tidak hmac tapi ada <code style={{ fontFamily: "var(--font-mono)" }}>secret_hash</code> → header <code style={{ fontFamily: "var(--font-mono)" }}>x-webhook-secret</code> atau <code style={{ fontFamily: "var(--font-mono)" }}>Authorization: Bearer &lt;secret&gt;</code> di-hash dan dicocokkan. Salah → 401.</td></tr>
                <tr><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E", fontWeight: 600 }}>Tanpa secret</td><td style={{ padding: "6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>Jika <code style={{ fontFamily: "var(--font-mono)" }}>signature_mode=none</code> & tanpa secret → tidak ada cek signature (hanya IP & rate).</td></tr>
                <tr><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E", fontWeight: 600 }}>Sukses</td><td style={{ padding: "6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>200 {"{rc:200, status:'success', data:{id:'whe_evt_...', status:'received'}}"}</td></tr>
                <tr><td style={{ padding: "6px", fontWeight: 600 }}>Forward</td><td style={{ padding: "6px", color: "#A3A3A3" }}>Jika <code style={{ fontFamily: "var(--font-mono)" }}>forwarding_config_json.url</code> ada → server <code style={{ fontFamily: "var(--font-mono)" }}>fetch POST JSON</code> ke URL itu (timeout 8s, redirect manual diblok, SSRF-checked). Hasil dicatat di <code style={{ fontFamily: "var(--font-mono)" }}>webhook_forward_attempts</code> (SUCCESS/FAILED). Gagal forward tidak menggagalkan penerimaan event.</td></tr>
              </tbody>
            </table>
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <Code lang="bash">{`# Tanpa secret
curl -X POST ${BASE}/hooks/wh_abc123def456 \\
  -H "Content-Type: application/json" \\
  -d '{"event":"order.created","id":42}'

# Dengan HMAC (signature_mode=hmac_sha256, secret="s3cr3t")
# signature = "sha256=" + HMAC-SHA256(JSON.stringify(body), secret).hex
BODY='{"event":"paid","amount":1000}'
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "s3cr3t" | sed 's/^.* //')
curl -X POST ${BASE}/hooks/wh_abc123def456 \\
  -H "Content-Type: application/json" \\
  -H "x-webhook-signature: sha256=$SIG" \\
  -d "$BODY"

# Dengan secret sederhana
curl -X POST ${BASE}/hooks/wh_abc123def456 \\
  -H "Content-Type: application/json" \\
  -H "x-webhook-secret: s3cr3t" \\
  -d '{"ping":1}'`}</Code>
              <Code lang="javascript">{`// Node.js — generate header HMAC
import crypto from "node:crypto";
const secret = "s3cr3t";
const body = { event: "paid", amount: 1000 };
const raw = JSON.stringify(body);
const sig = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
// kirim header: "x-webhook-signature": sig
`}</Code>
              <div style={{ fontSize: 11, color: "#737373", background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: 8, padding: 10, lineHeight: 1.6 }}>
                Header sensitif (<code style={{ fontFamily: "var(--font-mono)" }}>Authorization, Cookie, x-webhook-*</code>) diredaksi di log & disimpan sebagai <code style={{ fontFamily: "var(--font-mono)" }}>safe_headers_json</code>. Source IP & method & payload disimpan di <code style={{ fontFamily: "var(--font-mono)" }}>webhook_events</code> tenant-scoped. Status endpoint <code style={{ fontFamily: "var(--font-mono)" }}>disabled</code> → 404 (disamarkan).
              </div>
            </div>
          </section>

          <section id="webhook-mgmt" style={{ background: "#101010", border: "1px solid #242424", borderRadius: 12, padding: 20 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Webhook Management (Dashboard, JWT)</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 12 }}>
              <thead><tr style={{ color: "#737373", fontSize: 11 }}><th style={{ textAlign: "left", padding: "6px", borderBottom: "1px solid #1E1E1E" }}>Method</th><th style={{ textAlign: "left", padding: "6px", borderBottom: "1px solid #1E1E1E" }}>Path</th><th style={{ textAlign: "left", padding: "6px", borderBottom: "1px solid #1E1E1E" }}>Body / Query</th></tr></thead>
              <tbody>
                <tr><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E" }}><Method m="GET" /></td><td style={{ padding: "6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>/api/v1/tenants/:tenantId/webhook-endpoints</td><td style={{ padding: "6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>—</td></tr>
                <tr><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E" }}><Method m="POST" /></td><td style={{ padding: "6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>/api/v1/tenants/:tenantId/webhook-endpoints</td><td style={{ padding: "6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>{"{name, signature_mode:'none'|'hmac_sha256', secret?, forwarding_url?, forwarding_config?}"} — forwarding_url SSRF-checked, secret di-hash+encrypt, one-time di response _oneTimeSecret</td></tr>
                <tr><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E" }}><Method m="PATCH" /></td><td style={{ padding: "6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>/api/v1/tenants/:tenantId/webhook-endpoints/:endpointId</td><td style={{ padding: "6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>{"{name?, status:'active'|'disabled', signature_mode?, secret?, forwarding_url?}"}</td></tr>
                <tr><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E" }}><Method m="DELETE" /></td><td style={{ padding: "6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>/api/v1/tenants/:tenantId/webhook-endpoints/:endpointId</td><td style={{ padding: "6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>204</td></tr>
                <tr><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E" }}><Method m="GET" /><br /><Method m="POST" /><br /><Method m="DELETE" /></td><td style={{ padding: "6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>/.../webhook-endpoints/:endpointId/ip-allowlist<br />/.../ip-allowlist/:entryId</td><td style={{ padding: "6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>POST {"{cidr, description?}"} — cidr parse IPv4/IPv6/CIDR, else 400</td></tr>
                <tr><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E" }}><Method m="GET" /></td><td style={{ padding: "6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>/api/v1/tenants/:tenantId/webhook-events?page=&per_page=</td><td style={{ padding: "6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>per_page max 100, default 25, order received_at DESC</td></tr>
                <tr><td style={{ padding: "6px", borderBottom: "1px solid #1E1E1E" }}><Method m="GET" /></td><td style={{ padding: "6px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #1E1E1E" }}>/api/v1/tenants/:tenantId/webhook-events/:eventId</td><td style={{ padding: "6px", color: "#A3A3A3", borderBottom: "1px solid #1E1E1E" }}>{"{event, attempts:[{attempt_number,status,response_status,error_message}]}"}</td></tr>
                <tr><td style={{ padding: "6px" }}><Method m="POST" /></td><td style={{ padding: "6px", fontFamily: "var(--font-mono)" }}>/api/v1/tenants/:tenantId/webhook-events/:eventId/retry</td><td style={{ padding: "6px", color: "#A3A3A3" }}>forward ulang ke forwarding_url (SSRF-checked, timeout 8s, block redirect). Sukses → 200, gagal → 502.</td></tr>
              </tbody>
            </table>
            <Code lang="bash">{`# Buat endpoint dengan HMAC + forward
curl -X POST ${BASE}/api/v1/tenants/t_xxx/webhook-endpoints \\
  -H "Authorization: Bearer eyJ..." -H "Content-Type: application/json" \\
  -d '{
    "name": "Stripe Hook",
    "signature_mode": "hmac_sha256",
    "secret": "s3cr3t",
    "forwarding_url": "https://example.com/ingest"
  }'
# -> {"data":{"id":"whe_...","public_identifier":"wh_abc...","signature_mode":"hmac_sha256",...,"_oneTimeSecret":"s3cr3t"}}

# IP allowlist
curl -X POST ${BASE}/api/v1/tenants/t_xxx/webhook-endpoints/whe_xxx/ip-allowlist \\
  -H "Authorization: Bearer eyJ..." -H "Content-Type: application/json" \\
  -d '{"cidr":"203.0.113.0/24","description":"Stripe"}'

# List events
curl "${BASE}/api/v1/tenants/t_xxx/webhook-events?page=1&per_page=10" \\
  -H "Authorization: Bearer eyJ..."

# Retry forward
curl -X POST ${BASE}/api/v1/tenants/t_xxx/webhook-events/whe_evt_xxx/retry \\
  -H "Authorization: Bearer eyJ..." -H "Content-Type: application/json" -d '{}'`}</Code>
            <div style={{ fontSize: 11, color: "#737373", marginTop: 8 }}>SSRF guard blok localhost/127.0.0.0/8/::1/link-local/metadata & redirect target. Forward butuh koneksi timeout + response timeout + size limit implisit via fetch. Kredensial webhook disimpan terenkripsi, hash via SHA-256 untuk verifikasi.</div>
          </section>

          <section id="health" style={{ background: "#101010", border: "1px solid #242424", borderRadius: 12, padding: 20 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Health & Lainnya</h2>
            <div style={{ display: "grid", gap: 8, marginTop: 12, fontSize: 12 }}>
              <div><Method m="GET" /> <code style={{ fontFamily: "var(--font-mono)" }}>/health</code> <span style={{ color: "#737373" }}>→ {"{status:'ok', env, time}"} — no auth</span></div>
              <div><Method m="GET" /> <code style={{ fontFamily: "var(--font-mono)" }}>/ready</code> <span style={{ color: "#737373" }}>→ {"{status:'ok'|'degraded', checks:{database, redis, queue}}"} — 200/503</span></div>
              <div style={{ color: "#A3A3A3", lineHeight: 1.6 }}>List lengkap lain (tenant, api-keys, observe): <code style={{ fontFamily: "var(--font-mono)" }}>GET /api/v1/tenants, POST /api/v1/tenants, GET /api/v1/tenants/:id/members, GET /api/v1/tenants/:tenantId/api-keys (+ revoke & ip-allowlist), GET /api/v1/tenants/:tenantId/overview, GET /api/v1/tenants/:tenantId/logs, GET /api/v1/tenants/:tenantId/deliveries?status=&page=</code> — semua JWT + membership. Detail di <code style={{ fontFamily: "var(--font-mono)" }}>apps/api/src/app.ts</code> & <code style={{ fontFamily: "var(--font-mono)" }}>docs/api/API-CONTRACT.md</code>.</div>
            </div>
          </section>

          <div style={{ textAlign: "center", color: "#525252", fontSize: 11, padding: "10px 0" }}>Portlane Docs — publik, spec sinkron dengan kode. Base: {BASE} · Coba di terminal, semua contoh callable.</div>
        </main>
      </div>
    </div>
  );
}
