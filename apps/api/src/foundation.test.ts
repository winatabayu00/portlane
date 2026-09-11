import { describe, expect, it } from "vitest";
import { trustedProxyList, loadConfig } from "./config.js";
import { M00_QUEUE_NAME } from "./queue.js";

describe("config", () => {
  it("fails loudly on missing infra URLs", () => {
    expect(() => loadConfig({} as NodeJS.ProcessEnv)).toThrow(/DATABASE_URL/);
  });

  it("trusts no proxy by default (no spoofed forwarding headers)", () => {
    const config = loadConfig({
      DATABASE_URL: "postgres://x",
      REDIS_URL: "redis://x",
    } as NodeJS.ProcessEnv);
    expect(trustedProxyList(config)).toBe(false);
  });

  it("parses explicit trusted proxies (Tailscale range)", () => {
    const config = loadConfig({
      DATABASE_URL: "postgres://x",
      REDIS_URL: "redis://x",
      TRUSTED_PROXIES: "100.64.0.0/10",
    } as NodeJS.ProcessEnv);
    expect(trustedProxyList(config)).toEqual(["100.64.0.0/10"]);
  });
});

describe("queue baseline", () => {
  it("uses a single infra-only queue name", () => {
    expect(M00_QUEUE_NAME).toBe("portlane-m00");
  });
});
