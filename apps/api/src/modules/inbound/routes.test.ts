import { describe, expect, it } from "vitest";
import { resolveInboundTenantId } from "./routes.js";

describe("resolveInboundTenantId", () => {
  it("ambil tenant dari path", () => {
    expect(resolveInboundTenantId("/api/v1/tenants/ten_123/inbound?page=1")).toBe("ten_123");
  });
  it("null untuk non-tenant path", () => {
    expect(resolveInboundTenantId("/api/v1/messages")).toBeNull();
    expect(resolveInboundTenantId("/health")).toBeNull();
  });
});
