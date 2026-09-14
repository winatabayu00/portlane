import { describe, expect, it, vi, beforeEach } from "vitest";
import { qs } from "./primitives.js";

describe("qs", () => {
  it("empty params yield empty string", () => {
    expect(qs({})).toBe("");
    expect(qs({ q: undefined, status: undefined })).toBe("");
  });

  it("drops undefined, encodes the rest", () => {
    expect(qs({ q: "hello world", page: "2", status: undefined })).toBe("?q=hello+world&page=2");
  });
});

describe("session hint storage", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });

  it("hint toggles without storing secrets", async () => {
    const api = await import("../lib/api.js");
    expect(api.hasSessionHint()).toBe(false);
    api.setSessionHint();
    expect(api.hasSessionHint()).toBe(true);
    expect(api.getToken()).toBeNull();
    api.clearSessionHint();
    expect(api.hasSessionHint()).toBe(false);
  });
});
