import { useEffect, useState } from "react";
import { apiFetch, signOutEverywhere } from "../lib/api.js";
import { StatusBadge } from "../components/primitives.js";
import { I } from "../components/icons.js";

export default function Settings({ tenantId }: { tenantId: string }) {
  const SCOPES = ["messages:write", "messages:read", "deliveries:read", "deliveries:retry"] as const;
  const PROVIDERS = ["telegram", "discord", "smtp", "webhook"] as const;
  const [keys, setKeys] = useState<any[]>([]); const [destinations, setDestinations] = useState<any[]>([]);
  const [name, setName] = useState(""); const [expires, setExpires] = useState("");
  const [lastKey, setLastKey] = useState<string | null>(null); const [msg, setMsg] = useState<string | null>(null); const [toast, setToast] = useState<string | null>(null);
  const [ipFor, setIpFor] = useState<string | null>(null); const [ipList, setIpList] = useState<any[]>([]); const [ipForm, setIpForm] = useState({ cidr: "", description: "" });
  const [editKey, setEditKey] = useState<any | null>(null); const [editForm, setEditForm] = useState({ name: "", expires_at: "", scopes: [] as string[], allowed_providers: [] as string[], allowed_destination_ids: [] as string[] });
  const [q, setQ] = useState(""); const [fStatus, setFStatus] = useState<"" | "active" | "revoked" | "expired">(""); const [showCreate, setShowCreate] = useState(true);
  const [confirm, setConfirm] = useState<{ id: string; action: "revoke" | "delete"; name: string } | null>(null);
  const reload = () => apiFetch(`/api/v1/tenants/${tenantId}/api-keys`).then(j => setKeys(j.data));
  useEffect(() => { reload(); apiFetch(`/api/v1/tenants/${tenantId}/destinations`).then(j => setDestinations(j.data)).catch(() => { }); }, [tenantId]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t); } }, [toast]);
  function copy(text: string, label = "Copied") { navigator.clipboard.writeText(text).then(() => setToast(label)).catch(() => setToast("Copy failed")); }
  async function create(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const payload: any = { name }; if (expires) payload.expires_at = new Date(expires).toISOString();
    try { const j = await apiFetch(`/api/v1/tenants/${tenantId}/api-keys`, { method: "POST", body: JSON.stringify(payload) }); setLastKey(j.data.key); setName(""); setExpires(""); setToast("API key created — copy secret now"); reload(); } catch (er: any) { setMsg(er.message); }
  }
  async function revoke(id: string) { await apiFetch(`/api/v1/tenants/${tenantId}/api-keys/${id}/revoke`, { method: "POST" }); setToast("Key revoked"); reload(); }
  async function delKey(id: string) {
    try { await apiFetch(`/api/v1/tenants/${tenantId}/api-keys/${id}`, { method: "DELETE" }); setToast("Key deleted"); reload(); } catch (er: any) { setMsg(er.message); setToast(er.message); }
  }
  async function openIp(keyId: string) { setIpFor(keyId); const j = await apiFetch(`/api/v1/tenants/${tenantId}/api-keys/${keyId}/ip-allowlist`); setIpList(j.data); }
  async function addIp(e: React.FormEvent) { e.preventDefault(); if (!ipFor) return; try { await apiFetch(`/api/v1/tenants/${tenantId}/api-keys/${ipFor}/ip-allowlist`, { method: "POST", body: JSON.stringify(ipForm) }); setIpForm({ cidr: "", description: "" }); openIp(ipFor); setToast("IP added"); } catch (er: any) { setMsg(er.message); } }
  async function delIp(entryId: string) { if (!ipFor) return; await apiFetch(`/api/v1/tenants/${tenantId}/api-keys/${ipFor}/ip-allowlist/${entryId}`, { method: "DELETE" }); openIp(ipFor); setToast("IP removed"); }
  function openEdit(k: any) {
    const sc = Array.isArray(k.scopes) ? k.scopes : (typeof k.scopes === "string" ? JSON.parse(k.scopes || "[]") : k.scopes || []);
    const ap = Array.isArray(k.allowed_providers) ? k.allowed_providers : (typeof k.allowed_providers === "string" ? JSON.parse(k.allowed_providers || "[]") : k.allowed_providers || []);
    const ad = Array.isArray(k.allowed_destination_ids) ? k.allowed_destination_ids : (typeof k.allowed_destination_ids === "string" ? JSON.parse(k.allowed_destination_ids || "[]") : k.allowed_destination_ids || []);
    setEditKey(k); setEditForm({ name: k.name, expires_at: k.expires_at ? new Date(k.expires_at).toISOString().slice(0, 16) : "", scopes: sc, allowed_providers: ap, allowed_destination_ids: ad });
  }
  async function saveEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editKey) return; setMsg(null);
    const payload: any = { name: editForm.name, scopes: editForm.scopes, allowed_providers: editForm.allowed_providers, allowed_destination_ids: editForm.allowed_destination_ids };
    payload.expires_at = editForm.expires_at ? new Date(editForm.expires_at).toISOString() : null;
    try { await apiFetch(`/api/v1/tenants/${tenantId}/api-keys/${editKey.id}`, { method: "PATCH", body: JSON.stringify(payload) }); setEditKey(null); setToast("Key updated"); reload(); } catch (er: any) { setMsg(er.message); }
  }
  function fmtScopes(v: any) { const a = Array.isArray(v) ? v : (typeof v === "string" ? JSON.parse(v || "[]") : v || []); return a; }
  function isExpiredAt(v: string | null) { if (!v) return false; return new Date(v) <= new Date(); }
  function daysLeft(v: string | null) { if (!v) return null; const d = Math.ceil((new Date(v).getTime() - Date.now()) / 86400000); return d; }
  const stats = { total: keys.length, active: keys.filter(k => k.status === "active" && !isExpiredAt(k.expires_at)).length, revoked: keys.filter(k => k.status === "revoked").length, expired: keys.filter(k => isExpiredAt(k.expires_at)).length };
  const filtered = keys.filter(k => {
    if (q && !`${k.name} ${k.id} ${k.key_prefix}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (fStatus === "active" && (k.status !== "active" || isExpiredAt(k.expires_at))) return false;
    if (fStatus === "revoked" && k.status !== "revoked") return false;
    if (fStatus === "expired" && !isExpiredAt(k.expires_at)) return false;
    return true;
  });
  const destName = (id: string) => destinations.find((d: any) => d.id === id)?.name ?? id.slice(0, 8);

  return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
      <div><h2 style={{ margin: 0, fontSize: 18 }}>API Keys</h2><p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>Token akses mesin. Secret full hanya tampil sekali — simpan aman. Key lama tetap bisa salin prefix/ID, edit, revoke, delete.</p></div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><span className="pl-pill" style={{ background: "var(--success-soft)", borderColor: "rgba(34,197,94,0.18)", color: "var(--success)" }}>● {stats.active} active</span><span className="pl-pill">{stats.total} total</span><span className="pl-pill" style={{ color: stats.expired ? "var(--danger)" : "var(--text-muted)" }}>⏰ {stats.expired} expired</span><span className="pl-pill" style={{ color: "var(--text-muted)" }}>{stats.revoked} revoked</span></div>
    </div>

    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", display: "grid", placeItems: "center", flexShrink: 0, color: "var(--accent)", fontSize: 14 }}>ℹ</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text-secondary)" }}>
        <strong style={{ color: "var(--text-primary)" }}>Cara pakai:</strong> <span className="pl-mono" style={{ background: "var(--bg-input)", border: "1px solid var(--border)", padding: "1px 6px", borderRadius: 6 }}>Authorization: Bearer pl_live_&lt;prefix&gt;.&lt;secret&gt;</span> · Secret tidak bisa dilihat lagi setelah create — hanya <strong>prefix</strong> + <strong>ID</strong> yang bisa disalin dari key lama. Revoke dulu baru bisa Delete (hard delete).
        <div style={{ marginTop: 6, color: "var(--text-muted)" }}>Scopes kosong = akses penuh. Batasi provider/destination untuk least-privilege.</div>
      </div>
    </div>

    {toast && <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#111", color: "white", padding: "10px 14px", borderRadius: 999, border: "1px solid #2A2A2A", fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 60 }}>{toast}</div>}
    {msg && <div style={{ fontSize: 12, padding: "10px 12px", borderRadius: 8, background: "var(--danger-soft)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)", display: "flex", justifyContent: "space-between", gap: 8 }}><span>{msg}</span><button onClick={() => setMsg(null)} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer" }}><I.x /></button></div>}

    <div className="pl-card" style={{ padding: 0, overflow: "hidden" }}>
      <button onClick={() => setShowCreate(v => !v)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{showCreate ? "▾" : "▸"} Buat API Key baru</span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{showCreate ? "sembunyikan" : "tampilkan"} form</span>
      </button>
      {showCreate && (
        <form onSubmit={create} style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px 16px", borderTop: "1px solid var(--border-subtle)" }}>
          <div style={{ height: 8 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 10 }}>
            <div><label className="pl-label">Nama key <span style={{ color: "var(--danger)" }}>*</span></label><input className="pl-input" placeholder="prod / mobile-app / cron" value={name} onChange={e => setName(e.target.value)} required /></div>
            <div><label className="pl-label">Expiry (opsional)</label><input className="pl-input" type="datetime-local" value={expires} onChange={e => setExpires(e.target.value)} /><div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Kosong = tidak expire</div></div>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-input)", border: "1px solid var(--border)", padding: "8px 10px", borderRadius: 8 }}>Config default (scopes/providers/destinations = semua). Atur lengkap lewat tombol <strong style={{ color: "var(--text-primary)" }}>Edit</strong> setelah create.</div>
          <button className="pl-btn pl-btn-primary" type="submit" style={{ alignSelf: "flex-start" }}><I.plus /> Create key</button>
        </form>
      )}
    </div>

    {lastKey && <div style={{ background: "var(--warning-soft)", border: "1px solid rgba(245,158,11,0.35)", padding: "14px", borderRadius: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><strong style={{ fontSize: 13 }}>⚠️ Salin sekarang — hanya tampil sekali!</strong><button className="pl-btn pl-btn-primary pl-btn-sm" onClick={() => copy(lastKey, "Secret copied")}> <I.copy /> Copy secret</button></div>
      <pre style={{ wordBreak: "break-all", whiteSpace: "pre-wrap", fontFamily: "var(--font-mono)", fontSize: 12, margin: "10px 0 0", background: "var(--bg-input)", padding: 12, borderRadius: 8, border: "1px solid var(--border)", position: "relative" }}>{lastKey}</pre>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>Simpan di env: <span className="pl-mono">PORTLANE_API_KEY={lastKey.slice(0, 24)}…</span> · Header: <span className="pl-mono">Authorization: Bearer {lastKey.slice(0, 16)}…</span> <button onClick={() => setLastKey(null)} style={{ marginLeft: 8, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", textDecoration: "underline", fontSize: 11 }}>sembunyikan</button></div>
    </div>}

    <div className="pl-card" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <div style={{ position: "relative", flex: 1, minWidth: 180 }}><span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}><I.search /></span><input className="pl-input" style={{ paddingLeft: 30 }} placeholder="Cari nama / ID / prefix..." value={q} onChange={e => setQ(e.target.value)} /></div>
      <select className="pl-select" value={fStatus} onChange={e => setFStatus(e.target.value as any)} style={{ maxWidth: 160 }}><option value="">Semua status</option><option value="active">active</option><option value="revoked">revoked</option><option value="expired">expired</option></select>
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{filtered.length}/{keys.length} keys</span>
      <button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={reload}>↻ Refresh</button>
    </div>

    {filtered.length === 0 ? <div className="pl-card pl-empty" style={{ gridColumn: "1/-1" }}>{keys.length === 0 ? "Belum ada API key — buat di atas." : "Tidak ada key sesuai filter."}</div> :
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))", gap: 12 }}>
        {filtered.map((k: any) => {
          const expired = isExpiredAt(k.expires_at); const dl = daysLeft(k.expires_at);
          const scopesArr = fmtScopes(k.scopes); const provArr = fmtScopes(k.allowed_providers);
          const destArr = Array.isArray(k.allowed_destination_ids) ? k.allowed_destination_ids : (typeof k.allowed_destination_ids === "string" ? JSON.parse(k.allowed_destination_ids || "[]") : []);
          const statusLabel = expired ? "expired" : k.status;
          return <div key={k.id} className="pl-card" style={{ display: "flex", flexDirection: "column", gap: 10, borderLeft: expired ? "3px solid var(--danger)" : k.status === "revoked" ? "3px solid #525252" : "3px solid var(--success)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: expired ? "var(--danger-soft)" : k.status === "revoked" ? "#1A1A1A" : "var(--accent-soft)", border: "1px solid " + (expired ? "rgba(239,68,68,0.2)" : k.status === "revoked" ? "var(--border)" : "var(--accent-border)"), display: "grid", placeItems: "center", flexShrink: 0 }}><I.key /></div>
                <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{k.name}</div><div className="pl-mono" style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", gap: 4, alignItems: "center" }}>{k.id.slice(0, 18)}… <button onClick={() => copy(k.id, "ID copied")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }} title="Copy ID"><I.copy /></button></div></div>
              </div>
              <StatusBadge status={statusLabel} />
            </div>

            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div className="pl-mono" style={{ flex: 1, fontSize: 11, background: "var(--bg-input)", border: "1px solid var(--border)", padding: "7px 8px", borderRadius: 8, display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span title={k.key_prefix}>{k.key_prefix}••••••••</span>
                <button onClick={() => copy(k.key_prefix, "Prefix copied")} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 6px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}><I.copy /> Salin</button>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
              <div>Dibuat {new Date(k.created_at).toLocaleString()} · Last used <strong style={{ color: k.last_used_at ? "var(--text-primary)" : "var(--text-muted)" }}>{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}</strong> {k.revoked_at && <>· Revoked {new Date(k.revoked_at).toLocaleString()}</>}</div>
              <div>
                {k.expires_at ? <>Expires {new Date(k.expires_at).toLocaleString()} {expired ? <span style={{ color: "var(--danger)", fontWeight: 700 }}>· EXPIRED</span> : dl !== null && dl <= 7 ? <span style={{ color: "var(--warning)", fontWeight: 600 }}>· {dl}d left</span> : <span style={{ color: "var(--success)" }}>· {dl}d left</span>}</> : <span>Expires: <em>never</em></span>}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}><span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 52 }}>Scopes:</span>{scopesArr.length ? scopesArr.map((s: string) => <span key={s} style={{ fontSize: 11, background: "var(--bg-input)", border: "1px solid var(--border)", padding: "2px 6px", borderRadius: 999 }}>{s}</span>) : <span style={{ fontSize: 11, color: "var(--text-muted)" }}>all (unrestricted)</span>}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}><span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 52 }}>Providers:</span>{provArr.length ? provArr.map((p: string) => <span key={p} style={{ fontSize: 11, background: "var(--bg-card-alt)", border: "1px solid var(--border)", padding: "2px 6px", borderRadius: 999, textTransform: "capitalize" }}>{p}</span>) : <span style={{ fontSize: 11, color: "var(--text-muted)" }}>all</span>}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}><span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 52 }}>Destinations:</span>{destArr.length ? destArr.slice(0, 3).map((id: string) => <span key={id} title={id} style={{ fontSize: 11, background: "var(--bg-input)", border: "1px solid var(--border)", padding: "2px 6px", borderRadius: 6 }}>{destName(id)}</span>) : <span style={{ fontSize: 11, color: "var(--text-muted)" }}>all</span>}{destArr.length > 3 && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>+{destArr.length - 3} lagi</span>}</div>
            </div>

            <div style={{ display: "flex", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
              <button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => openEdit(k)} title="Edit name/expiry/scopes">Edit</button>
              <button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => openIp(k.id)} title="Atur IP allowlist">IP Allowlist</button>
              <button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => copy(k.id, "ID copied")}> <I.copy /> ID</button>
              {k.status === "active" && !expired && <button className="pl-btn pl-btn-secondary pl-btn-sm" onClick={() => setConfirm({ id: k.id, action: "revoke", name: k.name })} style={{ color: "var(--warning)", borderColor: "rgba(245,158,11,0.3)" }}>Revoke</button>}
              {k.status === "active" && expired && <button className="pl-btn pl-btn-secondary pl-btn-sm" onClick={() => setConfirm({ id: k.id, action: "revoke", name: k.name })} style={{ color: "var(--danger)" }}>Revoke expired</button>}
              <button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => {
                if (k.status === "active") { setMsg("Revoke dulu sebelum delete — demi keamanan."); setToast("Revoke dulu sebelum delete"); return; }
                setConfirm({ id: k.id, action: "delete", name: k.name });
              }} style={{ color: "var(--danger)", marginLeft: "auto" }} title={k.status === "active" ? "Revoke dulu baru bisa delete" : "Hapus permanen"}><I.trash /> Delete</button>
            </div>
            {expired && k.status === "active" && <div style={{ fontSize: 11, background: "var(--danger-soft)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)", padding: "6px 8px", borderRadius: 6 }}>Expired — key tidak bisa dipakai. Revoke lalu Delete untuk bersihkan.</div>}
          </div>;
        })}
      </div>}

    {confirm && (
      <div className="pl-overlay" onClick={() => setConfirm(null)}>
        <div className="pl-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>{confirm.action === "revoke" ? "Revoke key?" : "Hapus permanen?"}</h3>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {confirm.action === "revoke" ? <>Key <strong>{confirm.name}</strong> akan dinonaktifkan. Request pakai key ini akan ditolak (401). Bisa di-delete setelah revoke.</> : <>Key <strong>{confirm.name}</strong> akan dihapus permanen beserta IP allowlist-nya. Tidak bisa di-undo.</>}
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
            <button className="pl-btn pl-btn-ghost" onClick={() => setConfirm(null)}>Batal</button>
            <button className="pl-btn" style={{ background: confirm.action === "delete" ? "var(--danger)" : "var(--warning)", color: "white", borderColor: "transparent" }} onClick={async () => { const c = confirm; setConfirm(null); if (c.action === "revoke") await revoke(c.id); else await delKey(c.id); }}>{confirm.action === "revoke" ? "Ya, revoke" : "Ya, hapus"}</button>
          </div>
        </div>
      </div>
    )}

    {editKey && (
      <div className="pl-overlay" onClick={() => setEditKey(null)}>
        <div className="pl-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><h3 style={{ margin: 0, fontSize: 15 }}>Edit API Key — {editKey.name}</h3><button className="pl-icon-btn" onClick={() => setEditKey(null)}><I.x /></button></div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10, background: "var(--bg-input)", border: "1px solid var(--border)", padding: "8px 10px", borderRadius: 8 }}>ID <span className="pl-mono">{editKey.id}</span> <button onClick={() => copy(editKey.id, "ID copied")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)" }}><I.copy /></button> · Prefix <span className="pl-mono">{editKey.key_prefix}</span> <button onClick={() => copy(editKey.key_prefix, "Prefix copied")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)" }}><I.copy /></button></div>
          <form onSubmit={saveEdit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label className="pl-label">Name</label><input className="pl-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required /></div>
            <div><label className="pl-label">Expires at</label><input className="pl-input" type="datetime-local" value={editForm.expires_at} onChange={e => setEditForm({ ...editForm, expires_at: e.target.value })} /><div style={{ fontSize: 11, color: "var(--text-muted)" }}>Kosongkan untuk tidak expire. Format lokal → disimpan UTC.</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Scopes (empty = all):</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{SCOPES.map(s => <label key={s} style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center", background: editForm.scopes.includes(s) ? "var(--accent-soft)" : "transparent", border: "1px solid " + (editForm.scopes.includes(s) ? "var(--accent-border)" : "var(--border)"), padding: "6px 8px", borderRadius: 6, cursor: "pointer" }}><input type="checkbox" checked={editForm.scopes.includes(s)} onChange={e => setEditForm({ ...editForm, scopes: e.target.checked ? [...editForm.scopes, s] : editForm.scopes.filter(x => x !== s) })} /> {s}</label>)}</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Allowed providers (empty = all):</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{PROVIDERS.map(p => <label key={p} style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center", background: editForm.allowed_providers.includes(p) ? "var(--accent-soft)" : "transparent", border: "1px solid " + (editForm.allowed_providers.includes(p) ? "var(--accent-border)" : "var(--border)"), padding: "6px 8px", borderRadius: 999, cursor: "pointer" }}><input type="checkbox" checked={editForm.allowed_providers.includes(p)} onChange={e => setEditForm({ ...editForm, allowed_providers: e.target.checked ? [...editForm.allowed_providers, p] : editForm.allowed_providers.filter(x => x !== p) })} /> {p}</label>)}</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Allowed destinations (empty = all):</div><select multiple className="pl-input" style={{ height: 92 }} value={editForm.allowed_destination_ids} onChange={e => setEditForm({ ...editForm, allowed_destination_ids: Array.from(e.target.selectedOptions).map(o => o.value) })}>{destinations.map((d: any) => <option key={d.id} value={d.id}>{d.name} ({d.destination_type})</option>)}{destinations.length === 0 && <option disabled>(no destinations)</option>}</select></div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button type="button" className="pl-btn pl-btn-ghost" onClick={() => setEditKey(null)}>Cancel</button><button type="submit" className="pl-btn pl-btn-primary">Save</button></div>
          </form>
        </div>
      </div>
    )}
    {ipFor && (
      <div className="pl-overlay" onClick={() => setIpFor(null)}>
        <div className="pl-modal" onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><h3 style={{ margin: 0, fontSize: 15 }}>IP Allowlist</h3><button className="pl-icon-btn" onClick={() => setIpFor(null)}><I.x /></button></div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>Kosong = semua IP boleh. Tambah CIDR untuk batasi. Cth: 103.10.20.30/32 atau 10.0.0.0/16</div>
          <form onSubmit={addIp} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input className="pl-input" placeholder="1.2.3.4/32 or 10.0.0.0/16" value={ipForm.cidr} onChange={e => setIpForm({ ...ipForm, cidr: e.target.value })} required style={{ flex: 1 }} />
            <input className="pl-input" placeholder="deskripsi" value={ipForm.description} onChange={e => setIpForm({ ...ipForm, description: e.target.value })} style={{ flex: 1 }} />
            <button className="pl-btn pl-btn-primary" type="submit">Add</button>
          </form>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflow: "auto" }}>{ipList.length === 0 ? <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "12px 0", textAlign: "center" }}>No entries — all IPs allowed. Add a CIDR to restrict.</div> : ipList.map((r: any) => <div key={r.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8 }}><span className="pl-mono" style={{ fontSize: 12, flex: 1 }}>{r.cidr}</span><span style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.description ?? ""}</span><button className="pl-btn pl-btn-ghost pl-btn-sm" style={{ color: "var(--danger)" }} onClick={() => delIp(r.id)}><I.trash /></button></div>)}</div>
        </div>
      </div>
    )}
    <div className="pl-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontWeight: 600, fontSize: 13 }}>Account</div><div style={{ fontSize: 12, color: "var(--text-muted)" }}>Sign out of this workspace.</div></div><button className="pl-btn pl-btn-secondary" onClick={() => { void signOutEverywhere(); }}>Sign out</button></div>
  </div>;
}
