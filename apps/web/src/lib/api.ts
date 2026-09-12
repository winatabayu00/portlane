export function getToken(): string | null { return localStorage.getItem("pl_token"); }
export function setToken(t: string | null) { if (t) localStorage.setItem("pl_token", t); else localStorage.removeItem("pl_token"); }
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
  const res = await fetch(path, { ...opts, headers });
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
