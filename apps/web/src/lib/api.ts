export function getToken(): string | null { return localStorage.getItem("pl_token"); }
export function setToken(t: string | null) { if (t) localStorage.setItem("pl_token", t); else localStorage.removeItem("pl_token"); }
// Session hint (BUKAN secret): hanya penanda UX bahwa login pernah sukses.
// Sesi aslinya dipegang HttpOnly cookie `pl_token` yang tidak bisa dibaca JS,
// jadi XSS tidak bisa mencuri token dari sini. Diverifikasi via /auth/me.
const HINT = "pl_session";
export function hasSessionHint(): boolean { try { return localStorage.getItem(HINT) === "1"; } catch { return false; } }
export function setSessionHint() { try { localStorage.setItem(HINT, "1"); } catch { /* storage unavailable */ } }
export function clearSessionHint() { try { localStorage.removeItem(HINT); } catch { /* storage unavailable */ } }

// Full sign-out: server clears the HttpOnly session cookie, local hints and
// legacy tokens are dropped, workspace context reset.
export async function signOutEverywhere(): Promise<void> {
  try { await apiFetch("/api/v1/auth/logout", { method: "POST" }); } catch { /* cookie clear best-effort */ }
  setToken(null); clearSessionHint(); setTenantId(null); location.reload();
}
export function getTenantId(): string | null { return localStorage.getItem("pl_tenant_id"); }
export function setTenantId(id: string | null) { if (id) localStorage.setItem("pl_tenant_id", id); else localStorage.removeItem("pl_tenant_id"); }

export interface ApiError {
  code: string;
  message: string;
  request_id?: string;
}

export async function apiFetch(path: string, opts: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string,string> = { ...(opts.headers as Record<string,string> ?? {}) };
  if (opts.body !== undefined && !headers["content-type"] && !headers["Content-Type"]) headers["content-type"] = "application/json";
  if (token) headers["authorization"] = `Bearer ${token}`;
  const res = await fetch(path, { ...opts, headers, credentials: "include" });
  const text = await res.text();
  let json: any = null; try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) {
    const error: ApiError = {
      code: json?.errors?.code ?? (json?.rc != null ? String(json.rc) : "UNKNOWN_ERROR"),
      message: json?.errors?.message ?? json?.message ?? `Request failed ${res.status}`,
      request_id: json?.correlationId ?? json?.errors?.request_id
    };
    (error as unknown as Record<string, unknown>).rc = json?.rc;
    (error as unknown as Record<string, unknown>).status = json?.status;
    throw error;
  }
  return json;
}
