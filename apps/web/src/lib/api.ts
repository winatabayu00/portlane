export function getToken(): string | null { return localStorage.getItem("pl_token"); }
export function setToken(t: string | null) { if (t) localStorage.setItem("pl_token", t); else localStorage.removeItem("pl_token"); }
export function getTenantId(): string | null { return localStorage.getItem("pl_tenant_id"); }
export function setTenantId(id: string | null) { if (id) localStorage.setItem("pl_tenant_id", id); else localStorage.removeItem("pl_tenant_id"); }

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string,string> = { "content-type":"application/json", ...(opts.headers as Record<string,string> ?? {}) };
  if (token) headers["authorization"] = `Bearer ${token}`;
  const res = await fetch(path, { ...opts, headers });
  const text = await res.text();
  let json: any = null; try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) {
    const msg = json?.error?.message ?? json?.message ?? `Request failed ${res.status}`;
    const err = new Error(msg) as Error & { status:number; body:any };
    err.status = res.status; err.body = json;
    throw err;
  }
  return json;
}
