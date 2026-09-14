import { describe, expect, it } from "vitest";
import { publicHookStatus } from "./routes.js";
import { buildForwardHeaders } from "./forward.js";
import type { AppConfig } from "../../config.js";

function cfg(base: string): AppConfig {
  return { PORTLANE_PUBLIC_BASE_URL: base } as AppConfig;
}

describe("publicHookStatus", () => {
  it("ready + base URL bila dikonfigurasi", () => {
    expect(publicHookStatus(cfg("https://hooks.example.com"))).toEqual({
      public_base_url: "https://hooks.example.com",
      ready: true,
    });
  });
  it("not ready bila kosong", () => {
    expect(publicHookStatus(cfg(""))).toEqual({ public_base_url: null, ready: false });
  });
});

describe("buildForwardHeaders", () => {
  it("korelasi + flag test + HMAC + sanitasi extra", () => {
    const h = buildForwardHeaders(
      { headers: { "X-Custom": "v", "bad key!": "x" } },
      { eventId: "e1", requestId: "r1", bodyRaw: "{}", secret: "s", test: true },
    );
    expect(h["x-portlane-event-id"]).toBe("e1");
    expect(h["x-portlane-request-id"]).toBe("r1");
    expect(h["x-portlane-test"]).toBe("true");
    expect(h["x-custom"]).toBe("v");
    expect(h["bad key!"]).toBeUndefined();
    expect(h["x-portlane-signature"]).toMatch(/^sha256=/);
  });
  it("tanpa secret + bukan test: tanpa signature/flag", () => {
    const h = buildForwardHeaders({}, { eventId: "e", requestId: "r", bodyRaw: "{}" });
    expect(h["x-portlane-signature"]).toBeUndefined();
    expect(h["x-portlane-test"]).toBeUndefined();
  });
});
