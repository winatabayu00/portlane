import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api.js";
import { StatusBadge, qs } from "../components/primitives.js";
import { I } from "../components/icons.js";

export default function Destinations({ tenantId }: { tenantId: string }) {
  const [list, setList] = useState<any[]>([]); const [conns, setConns] = useState<any[]>([]);
  const [q, setQ] = useState(""); const [fStatus, setFStatus] = useState(""); const [fProvider, setFProvider] = useState("");
  const [form, setForm] = useState({ provider_connection_id: "", name: "", chat_id: "", email: "" });
  const [edit, setEdit] = useState<any | null>(null); const [editForm, setEditForm] = useState({ name: "", status: "active", chat_id: "", email: "" }); const [msg, setMsg] = useState<string | null>(null);

  const reload = useCallback(() => {
    const query = qs({ q: q || undefined, status: fStatus || undefined, provider_key: fProvider || undefined });
    return apiFetch(`/api/v1/tenants/${tenantId}/destinations${query}`).then(j => setList(j.data));
  }, [tenantId, q, fStatus, fProvider]);
  useEffect(() => { const t = setTimeout(reload, 250); return () => clearTimeout(t); }, [reload]);
  useEffect(() => { apiFetch(`/api/v1/tenants/${tenantId}/provider-connections`).then(j => setConns(j.data)).catch(() => { }); }, [tenantId]);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    try {
      const cfg: Record<string, unknown> = {}; if (form.chat_id) cfg.chat_id = form.chat_id; if (form.email) cfg.email = form.email;
      await apiFetch(`/api/v1/tenants/${tenantId}/destinations`, { method: "POST", body: JSON.stringify({ provider_connection_id: form.provider_connection_id, name: form.name, config: cfg }) });
      setForm({ provider_connection_id: "", name: "", chat_id: "", email: "" }); reload();
    } catch (e: any) { setMsg(e.message || e.code || "Unknown error"); }
  }
  async function remove(id: string) { if (!confirm("Delete destination?")) return; await apiFetch(`/api/v1/tenants/${tenantId}/destinations/${id}`, { method: "DELETE" }); reload(); }
  function openEdit(r: any) { setEdit(r); const cfg = r.config_json ?? {}; setEditForm({ name: r.name, status: r.status, chat_id: cfg.chat_id ?? "", email: cfg.email ?? "" }); }
  async function saveEdit(e: React.FormEvent) {
    e.preventDefault(); if (!edit) return;
    const cfg: Record<string, unknown> = {}; if (editForm.chat_id) cfg.chat_id = editForm.chat_id; if (editForm.email) cfg.email = editForm.email;
    await apiFetch(`/api/v1/tenants/${tenantId}/destinations/${edit.id}`, { method: "PATCH", body: JSON.stringify({ name: editForm.name, status: editForm.status, config: cfg }) }); setEdit(null); reload();
  }

  return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div><h2 style={{ margin: 0, fontSize: 18 }}>Destinations</h2><p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>Route messages to chats, emails, channels, or HTTP endpoints.</p></div>
    <div className="pl-card" style={{ display: "flex", gap: 8, flexDirection: "column" }}>
      <strong style={{ fontSize: 13 }}>Add destination</strong>
      <form onSubmit={create} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select className="pl-select" style={{ maxWidth: 220 }} value={form.provider_connection_id} onChange={e => setForm({ ...form, provider_connection_id: e.target.value })} required><option value="">Provider connection</option>{conns.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.provider_key})</option>)}</select>
        <input className="pl-input" style={{ maxWidth: 180 }} placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <input className="pl-input" style={{ maxWidth: 220 }} placeholder="chat_id or email" value={form.chat_id || form.email} onChange={e => setForm({ ...form, chat_id: e.target.value, email: e.target.value })} />
        <button className="pl-btn pl-btn-primary" type="submit"><I.plus /> Create</button>
      </form>
      {msg && <div style={{ fontSize: 12, color: "var(--danger)" }}>{msg}</div>}
    </div>
    <div className="pl-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 8, padding: "12px 16px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 260 }}><span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}><I.search /></span><input className="pl-input" style={{ paddingLeft: 30 }} placeholder="Search destinations..." value={q} onChange={e => setQ(e.target.value)} /></div>
        <select className="pl-select" value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ maxWidth: 140 }}><option value="">All status</option><option value="active">active</option><option value="disabled">disabled</option></select>
        <select className="pl-select" value={fProvider} onChange={e => setFProvider(e.target.value)} style={{ maxWidth: 160 }}><option value="">All providers</option><option value="telegram">telegram</option><option value="discord">discord</option><option value="smtp">smtp</option><option value="webhook">webhook</option></select>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{list.length} total</span>
      </div>
      {list.length === 0 ? <div className="pl-empty">No destinations yet.</div> :
        <div style={{ overflow: "auto" }}><table className="pl-table"><thead><tr><th>Name</th><th>Type</th><th>Provider</th><th>Status</th><th>Updated</th><th /></tr></thead><tbody>{list.map((r: any) => <tr key={r.id}><td style={{ fontWeight: 500 }}>{r.name}</td><td><span style={{ fontSize: 12, background: "var(--bg-card-alt)", border: "1px solid var(--border)", padding: "2px 6px", borderRadius: 6 }}>{r.destination_type}</span></td><td style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.provider_name ?? r.provider_key ?? "-"}</td><td><StatusBadge status={r.status} /></td><td className="pl-mono" style={{ color: "var(--text-muted)" }}>{new Date(r.updated_at).toLocaleString()}</td><td style={{ display: "flex", gap: 6 }}><button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => openEdit(r)}>Edit</button><button className="pl-btn pl-btn-ghost pl-btn-sm" style={{ color: "var(--danger)" }} onClick={() => remove(r.id)}><I.trash /></button></td></tr>)}</tbody></table></div>}
    </div>
    {edit && (
      <div className="pl-overlay" onClick={() => setEdit(null)}>
        <div className="pl-modal" onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><h3 style={{ margin: 0, fontSize: 15 }}>Edit Destination</h3><button className="pl-icon-btn" onClick={() => setEdit(null)}><I.x /></button></div>
          <form onSubmit={saveEdit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label className="pl-label">Name</label><input className="pl-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required /></div>
            <div><label className="pl-label">Status</label><select className="pl-select" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}><option value="active">active</option><option value="disabled">disabled</option></select></div>
            <div><label className="pl-label">Config (chat_id / email)</label><div style={{ display: "flex", gap: 8 }}><input className="pl-input" placeholder="chat_id" value={editForm.chat_id} onChange={e => setEditForm({ ...editForm, chat_id: e.target.value })} /><input className="pl-input" placeholder="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div></div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button type="button" className="pl-btn pl-btn-ghost" onClick={() => setEdit(null)}>Cancel</button><button type="submit" className="pl-btn pl-btn-primary">Save</button></div>
          </form>
        </div>
      </div>
    )}
  </div>;
}
