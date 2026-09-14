import { describe, expect, it } from "vitest";
import { publicHookStatus } from "./routes.js";
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
