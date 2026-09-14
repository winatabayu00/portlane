import { describe, expect, it, vi, beforeEach } from "vitest";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.unstubAllGlobals();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});

describe("apiFetch", () => {
  it("sends cookies (session) and legacy bearer when present", async () => {
    store.set("pl_token", "legacy-token");
    const seen: { url: unknown; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: unknown, init: RequestInit) => {
      seen.push({ url, init });
      return new Response(JSON.stringify({ data: { ok: true } }), { status: 200 });
    }));
    const api = await import("./api.js");
    const out = await api.apiFetch("/api/v1/auth/me");
    expect(out).toMatchObject({ data: { ok: true } });
    const headers = seen[0].init.headers as Record<string, string>;
    expect(headers["authorization"]).toBe("Bearer legacy-token");
    expect(seen[0].init.credentials).toBe("include");
  });

  it("maps envelope errors to code/message/request_id", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({
        rc: 1004, status: "failed", message: "Blocked.",
        errors: { code: "IP_NOT_ALLOWED", message: "Blocked.", request_id: "req_abc" },
        correlationId: "req_abc",
      }),
      { status: 403 },
    )));
    const api = await import("./api.js");
    const err = await api.apiFetch("/api/v1/messages").catch((e: unknown) => e) as { code: string; message: string; request_id?: string };
    expect(err.code).toBe("IP_NOT_ALLOWED");
    expect(err.message).toBe("Blocked.");
    expect(err.request_id).toBe("req_abc");
  });
});
