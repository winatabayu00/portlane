import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { requireTenantMember } from "./modules/auth/routes.js";

function mockReply() {
  const r: { statusCode: number | null; sent: unknown } & Record<string, unknown> = {
    statusCode: null,
    sent: null,
    status(c: number) { r.statusCode = c; return r; },
    send(b: unknown) { r.sent = b; return r; },
  };
  return r;
}

// Unit-level tenant boundary (§10/§46): membership row → allowed,
// no row → 403 denied. Full cross-tenant HTTP E2E remains manual (M11 list)
// because it needs live Postgres; this guards the gate logic itself.
describe("requireTenantMember gate (§10)", () => {
  it("allows a member of the tenant", async () => {
    const calls: unknown[][] = [];
    const pool = { query: async (...a: unknown[]) => { calls.push(a); return { rows: [{ role: "MEMBER" }] }; } };
    const reply = mockReply();
    const ok = await requireTenantMember(pool, "usr_A", "ten_A", reply, { id: "req_t1" });
    expect(ok).toBe(true);
    expect(reply.statusCode).toBeNull();
    // gate query is scoped to both tenant and user — never trust client ids alone
    expect(calls[0][1]).toEqual(["ten_A", "usr_A"]);
  });

  it("denies a user from another tenant with 403", async () => {
    const pool = { query: async () => ({ rows: [] }) };
    const reply = mockReply();
    const ok = await requireTenantMember(pool, "usr_B", "ten_A", reply, { id: "req_t2" });
    expect(ok).toBe(false);
    expect(reply.statusCode).toBe(403);
  });
});

describe("tenant scope static guard (§10/§46)", () => {
  const modules = ["tenants", "api-keys", "providers", "destinations", "messaging", "webhooks", "observability", "inbound"];
  it.each(modules)("%s routes enforce membership server-side", (m) => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const file = join(dir, "modules", m, "routes.ts");
    expect(existsSync(file)).toBe(true);
    const src = readFileSync(file, "utf8");
    expect(src).toMatch(/requireTenantMember/);
    expect(src).toMatch(/tenant_id/);
  });
});
