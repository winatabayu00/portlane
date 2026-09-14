// Portlane M11 E2E verification (13 scenarios) against live Postgres+Redis.
// Run: yarn workspace @portlane/api e2e
// Boots the real API (Fastify inject-free, real HTTP) + delivery/forward
// workers in-process, drives all M11 flows, then deletes its own data.
// SSRF note: the capture server is addressed via the machine's Tailscale IP
// (100.x, not in the SSRF blocklist) so webhook delivery/forwarding succeeds.
import dotenv from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// Single .env at repo root (apps/api/.env deleted as duplicate) — resolve
// explicitly instead of relying on cwd like `dotenv/config` does.
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", ".env") });
import http from "node:http";
import os from "node:os";
import pg from "pg";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { closeDb } from "../src/db.js";
import { closeRedis } from "../src/redis.js";
import { registerAllProviders } from "../src/modules/providers/index.js";
import { registerDeliveryWorker } from "../src/modules/delivery/worker.js";
import { enqueueDelivery } from "../src/modules/delivery/queue.js";
import { registerForwardWorker } from "../src/modules/webhooks/forward.js";

const PORT = 4112;
const HOOK_PORT = 4911;

function lanIp(): string {
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets))
    for (const n of list ?? [])
      if (n.family === "IPv4" && !n.internal && n.address.startsWith("100.")) return n.address;
  throw new Error("no Tailscale (100.x) interface found — E2E capture server needs a non-SSRF-blocked IP");
}

const results: { n: number; name: string; ok: boolean; detail?: string }[] = [];
function pass(n: number, name: string) {
  results.push({ n, name, ok: true });
  console.log(`  ✓ [${n}] ${name}`);
}
function fail(n: number, name: string, detail: unknown): never {
  const d = detail instanceof Error ? detail.message : JSON.stringify(detail)?.slice(0, 500);
  results.push({ n, name, ok: false, detail: d });
  console.error(`  ✗ [${n}] ${name}: ${d}`);
  throw new Error(`E2E [${n}] ${name} FAILED: ${d}`);
}
function assert(cond: unknown, n: number, name: string, detail: unknown) {
  if (!cond) fail(n, name, detail);
}

async function waitFor<T>(fn: () => Promise<T | null>, label: string, timeoutMs = 45_000): Promise<T> {
  const t0 = Date.now();
  for (;;) {
    const v = await fn().catch(() => null);
    if (v) return v;
    if (Date.now() - t0 > timeoutMs) throw new Error(`timeout waiting: ${label}`);
    await new Promise((r) => setTimeout(r, 750));
  }
}

async function main() {
  const config = { ...loadConfig(), APP_PORT: PORT, LOG_LEVEL: "error" as const };
  const base = `http://127.0.0.1:${PORT}`;
  const tailIp = lanIp();
  const captureUrl = `http://${tailIp}:${HOOK_PORT}/hook`;
  const hits: { url: string; body: string; headers: Record<string, string> }[] = [];

  const capture = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", () => {
      hits.push({ url: req.url ?? "/", body, headers: req.headers as Record<string, string> });
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
    });
  });
  await new Promise<void>((r) => capture.listen(HOOK_PORT, "0.0.0.0", r));

  registerAllProviders();
  const dw = registerDeliveryWorker(config);
  const fw = registerForwardWorker(config);
  const app = await buildApp(config);
  await app.listen({ port: PORT, host: "127.0.0.1" });
  const pool = new pg.Pool({ connectionString: config.DATABASE_URL });

  async function api(method: string, path: string, opts: { token?: string; machineKey?: string; body?: unknown; headers?: Record<string, string> } = {}) {
    const headers: Record<string, string> = { ...(opts.headers ?? {}) };
    if (opts.body !== undefined) headers["content-type"] = "application/json";
    if (opts.machineKey) headers["authorization"] = `Bearer ${opts.machineKey}`;
    else if (opts.token) headers["authorization"] = `Bearer ${opts.token}`;
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    const text = await res.text();
    let j: any = null;
    try { j = text ? JSON.parse(text) : null; } catch { j = { raw: text }; }
    return { status: res.status, body: j, headers: { "set-cookie": res.headers.get("set-cookie") ?? "" } };
  }

  const ts = Date.now();
  const emailA = `e2e-a-${ts}@example.com`;
  const emailB = `e2e-b-${ts}@example.com`;
  const st: Record<string, string> = {};
  console.log("E2E M11 — Portlane V1 release verification");

  try {
    // [1] Create tenant (register auto-creates workspace + explicit create)
    {
      const r = await api("POST", "/api/v1/auth/register", { body: { name: "E2E A", email: emailA, password: "secret123" } });
      assert(r.status === 200, 1, "create tenant (register)", r);
      st.tokenA = r.body.data.token; st.userA = r.body.data.user.id; st.tenantA = r.body.data.tenant.id;
      const t2 = await api("POST", "/api/v1/tenants", { token: st.tokenA, body: { name: "E2E Second" } });
      assert(t2.status === 201, 1, "create tenant (explicit)", t2);
      st.tenantA2 = t2.body.data.id;
      // cookie session (HttpOnly) wajib diset di register — XSS tidak bisa colong sesi via JS
      assert(r.headers["set-cookie"].includes("pl_token=") && r.headers["set-cookie"].includes("HttpOnly"), 1, "register sets HttpOnly session cookie", r.headers);
      pass(1, "create tenant (register + explicit POST /tenants, HttpOnly cookie set)");
    }
    // [2] Create API key
    {
      const r = await api("POST", `/api/v1/tenants/${st.tenantA}/api-keys`, { token: st.tokenA, body: { name: "e2e-key" } });
      assert(r.status === 201 && typeof r.body.data.key === "string" && r.body.data.key.startsWith("pl_live_"), 2, "create API key", r.body);
      st.key1 = r.body.data.key;
      pass(2, "create API key (full secret returned once)");
    }
    // [3] Restrict API key by IP — wrong IP 403s at the gate, right IP passes it
    {
      const k2 = await api("POST", `/api/v1/tenants/${st.tenantA}/api-keys`, { token: st.tokenA, body: { name: "e2e-restricted" } });
      st.key2 = k2.body.data.key; st.key2id = k2.body.data.id;
      const add = await api("POST", `/api/v1/tenants/${st.tenantA}/api-keys/${st.key2id}/ip-allowlist`, { token: st.tokenA, body: { cidr: "192.0.2.1/32", description: "e2e" } });
      assert(add.status === 201, 3, "add IP allowlist", add.body);
      const bad = await api("POST", "/api/v1/messages", { machineKey: st.key2, body: { nope: true } });
      assert(bad.status === 403 && bad.body?.errors?.code === "IP_NOT_ALLOWED", 3, "non-allowed IP receives 403", bad.body);
      const k3 = await api("POST", `/api/v1/tenants/${st.tenantA}/api-keys`, { token: st.tokenA, body: { name: "e2e-local" } });
      st.key3 = k3.body.data.key;
      await api("POST", `/api/v1/tenants/${st.tenantA}/api-keys/${k3.body.data.id}/ip-allowlist`, { token: st.tokenA, body: { cidr: "127.0.0.1/32" } });
      const okLocal = await api("POST", "/api/v1/messages", { machineKey: st.key3, body: { nope: true } });
      assert(okLocal.status === 422, 3, "allowed IP passes gate (fails later at validation)", okLocal.body);
      pass(3, "restrict API key by IP (403 vs 422)");
    }
    // [4] Create provider connections (good capture target + bad target)
    {
      const good = await api("POST", `/api/v1/tenants/${st.tenantA}/provider-connections`, {
        token: st.tokenA, body: { provider_key: "webhook", name: "e2e-good", config: { url: captureUrl }, credentials: {} },
      });
      assert(good.status === 201, 4, "create good provider connection", good.body);
      st.connGood = good.body.data.id;
      const bad = await api("POST", `/api/v1/tenants/${st.tenantA}/provider-connections`, {
        token: st.tokenA, body: { provider_key: "webhook", name: "e2e-bad", config: { url: "https://8.8.8.8:9/hang" }, credentials: {} },
      });
      assert(bad.status === 201, 4, "create bad provider connection", bad.body);
      st.connBad = bad.body.data.id;
      pass(4, "create provider connections (good + bad)");
    }
    // [5] Create destinations
    {
      const d1 = await api("POST", `/api/v1/tenants/${st.tenantA}/destinations`, { token: st.tokenA, body: { provider_connection_id: st.connGood, name: "e2e-d1", config: {} } });
      const d2 = await api("POST", `/api/v1/tenants/${st.tenantA}/destinations`, { token: st.tokenA, body: { provider_connection_id: st.connGood, name: "e2e-d2", config: {} } });
      const dBad = await api("POST", `/api/v1/tenants/${st.tenantA}/destinations`, { token: st.tokenA, body: { provider_connection_id: st.connBad, name: "e2e-dbad", config: {} } });
      assert(d1.status === 201 && d2.status === 201 && dBad.status === 201, 5, "create destinations", { d1: d1.body, d2: d2.body });
      st.dest1 = d1.body.data.id; st.dest2 = d2.body.data.id; st.destBad = dBad.body.data.id;
      pass(5, "create destinations (2 good + 1 bad)");
    }
    // [6] Submit broadcast (+ idempotency: replay returns same message, no dup)
    {
      const idem = `e2e-${ts}`;
      const b1 = await api("POST", "/api/v1/messages", {
        machineKey: st.key1,
        headers: { "Idempotency-Key": idem },
        body: { destinations: [st.dest1, st.dest2], message: { subject: "E2E", body: "hello" } },
      });
      assert(b1.status === 201 && b1.body.data.deliveries?.length === 2, 6, "submit broadcast", b1.body);
      st.msgId = b1.body.data.id;
      st.dlv1 = b1.body.data.deliveries[0].id; st.dlv2 = b1.body.data.deliveries[1].id;
      const b2 = await api("POST", "/api/v1/messages", {
        machineKey: st.key1,
        headers: { "Idempotency-Key": idem },
        body: { destinations: [st.dest1, st.dest2], message: { subject: "E2E", body: "hello" } },
      });
      assert(b2.status === 200 && b2.body.data.id === st.msgId, 6, "idempotent replay", b2.body);
      pass(6, "submit broadcast (1 message → 2 deliveries, idempotent)");
    }
    // [7] Successful delivery
    {
      const both = await waitFor(async () => {
        const r = await pool.query("SELECT COUNT(*) AS c FROM deliveries WHERE id = ANY($1) AND status='DELIVERED'", [[st.dlv1, st.dlv2]]);
        return r.rows[0].c === "2" ? true : null;
      }, "both deliveries DELIVERED");
      assert(both, 7, "deliveries delivered", null);
      assert(hits.filter((h) => h.url === "/hook").length >= 2, 7, "capture server received both", hits.length);
      pass(7, "process successful delivery (2/2 DELIVERED, provider hit)");
    }
    // [8] Retryable failure → RETRYING
    {
      const m = await api("POST", "/api/v1/messages", { machineKey: st.key1, body: { destinations: [st.destBad], message: { body: "boom" } } });
      st.dlvBad = m.body.data.deliveries[0].id;
      const r = await waitFor(async () => {
        const q = await pool.query("SELECT status FROM deliveries WHERE id=$1", [st.dlvBad]);
        return q.rows[0]?.status === "RETRYING" ? q.rows[0] : null;
      }, "bad delivery RETRYING", 60_000);
      assert(r, 8, "retryable failure schedules retry", null);
      pass(8, "process retryable failure (→ RETRYING)");
    }
    // [9] Retry exhaustion → DEAD
    {
      await pool.query("UPDATE deliveries SET attempt_count=4 WHERE id=$1", [st.dlvBad]);
      await enqueueDelivery(config, st.dlvBad);
      const r = await waitFor(async () => {
        const q = await pool.query("SELECT status FROM deliveries WHERE id=$1", [st.dlvBad]);
        return q.rows[0]?.status === "DEAD" ? q.rows[0] : null;
      }, "bad delivery DEAD", 60_000);
      assert(r, 9, "retry exhaustion reaches DEAD", null);
      pass(9, "reach dead state (attempt history preserved)");
    }
    // [10] Manual retry → DELIVERED (after fixing the connection target)
    {
      const p = await api("PATCH", `/api/v1/tenants/${st.tenantA}/provider-connections/${st.connBad}`, { token: st.tokenA, body: { config: { url: captureUrl } } });
      assert(p.status === 200, 10, "fix connection target", p.body);
      const before = hits.length;
      const rt = await api("POST", `/api/v1/tenants/${st.tenantA}/deliveries/${st.dlvBad}/retry`, { token: st.tokenA });
      assert(rt.status === 200, 10, "manual retry accepted", rt.body);
      const r = await waitFor(async () => {
        const q = await pool.query("SELECT status FROM deliveries WHERE id=$1", [st.dlvBad]);
        return q.rows[0]?.status === "DELIVERED" ? q.rows[0] : null;
      }, "retried delivery DELIVERED", 60_000);
      assert(r && hits.length > before, 10, "manual retry delivered", null);
      const att = await pool.query("SELECT COUNT(*) AS c FROM delivery_attempts WHERE delivery_id=$1", [st.dlvBad]);
      assert(Number(att.rows[0].c) >= 3, 10, "attempt history preserved across retries", att.rows[0]);
      pass(10, "manual retry (→ DELIVERED, history intact)");
    }
    // [11] Inbound webhook: secret enforced, event persisted, forwarded
    {
      const ep = await api("POST", `/api/v1/tenants/${st.tenantA}/webhook-endpoints`, {
        token: st.tokenA, body: { name: "e2e-hook", secret: "e2e-secret", forwarding_url: captureUrl },
      });
      assert(ep.status === 201, 11, "create webhook endpoint", ep.body);
      const pub = ep.body.data.public_identifier as string;
      st.epId = ep.body.data.id;
      const noSecret = await api("POST", `/hooks/${pub}`, { body: { event: "x" } });
      assert(noSecret.status === 401, 11, "missing secret rejected", noSecret.body);
      const before = hits.filter((h) => h.url === "/hook").length;
      const yes = await api("POST", `/hooks/${pub}`, { headers: { "x-webhook-secret": "e2e-secret" }, body: { event: "order.created" } });
      assert(yes.status === 200, 11, "valid webhook received", yes.body);
      const evt = await waitFor(async () => {
        const q = await pool.query("SELECT id FROM webhook_events WHERE id=$1", [yes.body.data.id]);
        return q.rows[0] ?? null;
      }, "event persisted");
      assert(evt, 11, "event persisted", null);
      await waitFor(async () => (hits.filter((h) => h.url === "/hook").length > before ? true : null), "forward delivered");
      pass(11, "inbound webhook (401 without secret, persisted + forwarded)");
    }
    // [12] Reject wrong IP (webhook surface; machine surface covered in [3])
    {
      const ep2 = await api("POST", `/api/v1/tenants/${st.tenantA}/webhook-endpoints`, { token: st.tokenA, body: { name: "e2e-locked" } });
      await api("POST", `/api/v1/tenants/${st.tenantA}/webhook-endpoints/${ep2.body.data.id}/ip-allowlist`, { token: st.tokenA, body: { cidr: "192.0.2.1/32" } });
      const blocked = await api("POST", `/hooks/${ep2.body.data.public_identifier}`, { body: {} });
      assert(blocked.status === 403 && blocked.body?.errors?.code === "IP_NOT_ALLOWED", 12, "webhook wrong IP rejected", blocked.body);
      pass(12, "reject wrong IP (machine 403 in [3] + webhook 403)");
    }
    // [13] Cross-tenant access rejected
    {
      const rb = await api("POST", "/api/v1/auth/register", { body: { name: "E2E B", email: emailB, password: "secret123" } });
      const tokenB = rb.body.data.token as string; const tenantB = rb.body.data.tenant.id as string;
      st.tokenB = tokenB; st.tenantB = tenantB; st.userB = rb.body.data.user.id;
      const cross = await api("GET", `/api/v1/tenants/${st.tenantA}/messages/${st.msgId}`, { token: tokenB });
      assert(cross.status === 403, 13, "cross-tenant read denied", cross.body);
      const kb = await api("POST", `/api/v1/tenants/${tenantB}/api-keys`, { token: tokenB, body: { name: "b-key" } });
      const crossSend = await api("POST", "/api/v1/messages", { machineKey: kb.body.data.key, body: { destinations: [st.dest1], message: { body: "x" } } });
      assert(crossSend.status === 404, 13, "cross-tenant destination rejected", crossSend.body);
      pass(13, "reject cross-tenant resource access (403 read, 404 send)");
    }

    console.log(`\nE2E M11: ${results.filter((r) => r.ok).length}/13 PASS`);
  } finally {
    // cleanup: remove all E2E data (audit logs have no FK → delete first)
    try {
      const tenants = [st.tenantA, st.tenantA2, st.tenantB].filter(Boolean);
      const users = [st.userA, st.userB].filter(Boolean);
      if (tenants.length) {
        await pool.query("DELETE FROM audit_logs WHERE tenant_id = ANY($1)", [tenants]);
        await pool.query("DELETE FROM tenants WHERE id = ANY($1)", [tenants]);
      }
      if (users.length) {
        await pool.query("DELETE FROM audit_logs WHERE actor_id = ANY($1)", [users]);
        await pool.query("DELETE FROM users WHERE id = ANY($1)", [users]);
      }
      const left = await pool.query(
        "SELECT (SELECT COUNT(*) FROM users WHERE email LIKE 'e2e-%@example.com') AS u, (SELECT COUNT(*) FROM tenants WHERE name LIKE 'E2E%') AS t",
      );
      console.log("cleanup residue (expect 0/0):", JSON.stringify(left.rows[0]));
    } catch (e) {
      console.error("cleanup failed:", (e as Error).message);
    }
    await new Promise<void>((r) => capture.close(() => r()));
    await dw.close().catch(() => {});
    await fw.close().catch(() => {});
    await app.close();
    await closeDb();
    await closeRedis();
    await pool.end().catch(() => {});
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error("E2E fatal:", e.message);
  process.exit(1);
});
