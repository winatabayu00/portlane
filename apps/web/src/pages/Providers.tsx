import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api.js";
import { StatusBadge, Skeleton, qs } from "../components/primitives.js";
import { I } from "../components/icons.js";

export default function Providers({ tenantId }: { tenantId: string }) {
  const [list, setList] = useState<any[]>([]); const [loading, setL] = useState(true); const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false); const [edit, setEdit] = useState<any | null>(null);
  const [q, setQ] = useState(""); const [fProvider, setFProvider] = useState(""); const [fStatus, setFStatus] = useState("");
  const [form, setForm] = useState({ provider_key: "telegram", name: "", botToken: "", webhookUrl: "", host: "", port: "", senderEmail: "", url: "" });
  const [editForm, setEditForm] = useState({ name: "", status: "active" });

  const reload = useCallback(() => {
    const query = qs({ q: q || undefined, provider_key: fProvider || undefined, status: fStatus || undefined });
    return apiFetch(`/api/v1/tenants/${tenantId}/provider-connections${query}`).then(j => setList(j.data)).finally(() => setL(false));
  }, [tenantId, q, fProvider, fStatus]);
  useEffect(() => { setL(true); const t = setTimeout(reload, 250); return () => clearTimeout(t); }, [reload]);
  async function create(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const creds: Record<string, unknown> = {}, cfg: Record<string, unknown> = {};
    if (form.provider_key === "telegram") creds.botToken = form.botToken;
    if (form.provider_key === "discord") creds.webhookUrl = form.webhookUrl;
    if (form.provider_key === "smtp") { creds.host = form.host; creds.port = form.port; creds.senderEmail = form.senderEmail; }
    if (form.provider_key === "webhook") cfg.url = form.url;
    try { await apiFetch(`/api/v1/tenants/${tenantId}/provider-connections`, { method: "POST", body: JSON.stringify({ provider_key: form.provider_key, name: form.name, config: cfg, credentials: creds }) }); setMsg("Created"); setOpen(false); setForm({ provider_key: "telegram", name: "", botToken: "", webhookUrl: "", host: "", port: "", senderEmail: "", url: "" }); reload(); } catch (e: any) { setMsg(e.message || e.code || "Unknown error"); }
  }
  async function test(id: string) { try { const j = await apiFetch(`/api/v1/tenants/${tenantId}/provider-connections/${id}/test`, { method: "POST" }); setMsg(JSON.stringify(j.data)); } catch (e: any) { setMsg(e.message || e.code || "Unknown error"); } }
  async function remove(id: string) { if (!confirm("Delete provider connection?")) return; await apiFetch(`/api/v1/tenants/${tenantId}/provider-connections/${id}`, { method: "DELETE" }); reload(); }
  async function saveEdit(e: React.FormEvent) { e.preventDefault(); if (!edit) return; await apiFetch(`/api/v1/tenants/${tenantId}/provider-connections/${edit.id}`, { method: "PATCH", body: JSON.stringify({ name: editForm.name, status: editForm.status }) }); setEdit(null); reload(); }
  function openEdit(r: any) { setEdit(r); setEditForm({ name: r.name, status: r.status }); }

  if (loading) return <div><Skeleton h={120} /></div>;
  return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}><div><h2 style={{ margin: 0, fontSize: 18 }}>Providers</h2><p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>Connect and manage communication providers.</p></div><div style={{ display: "flex", gap: 8 }}><button className="pl-btn pl-btn-primary" onClick={() => setOpen(true)}><I.plus /> Add Provider</button></div></div>
    <div className="pl-card" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <div style={{ position: "relative", flex: 1, minWidth: 180 }}><span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}><I.search /></span><input className="pl-input" style={{ paddingLeft: 30 }} placeholder="Search name or provider..." value={q} onChange={e => setQ(e.target.value)} /></div>
      <select className="pl-select" value={fProvider} onChange={e => setFProvider(e.target.value)}><option value="">All providers</option><option value="telegram">telegram</option><option value="discord">discord</option><option value="smtp">smtp</option><option value="webhook">webhook</option></select>
      <select className="pl-select" value={fStatus} onChange={e => setFStatus(e.target.value)}><option value="">All status</option><option value="active">active</option><option value="disabled">disabled</option></select>
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{list.length} results</span>
    </div>
    {msg && <div style={{ fontSize: 12, padding: "10px 12px", borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)", wordBreak: "break-all" }}>{msg}</div>}
    {list.length === 0 ? <div className="pl-card pl-empty"><div className="pl-empty-ic"><I.box /></div>No providers found<br /><span style={{ fontSize: 12, color: "var(--text-muted)" }}>Connect Telegram, Discord, SMTP, or Webhook to start routing messages.</span><div style={{ marginTop: 12 }}><button className="pl-btn pl-btn-primary" onClick={() => setOpen(true)}>Add Provider</button></div></div> :
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
        {list.map((r: any) => (
          <div key={r.id} className="pl-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</span><StatusBadge status={r.status} /></div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.provider_key} · {r.id.slice(0, 8)} · {r.last_tested_at ? new Date(r.last_tested_at).toLocaleString() : "never tested"}</div>
            <div style={{ display: "flex", gap: 6, marginTop: "auto", flexWrap: "wrap" }}><button className="pl-btn pl-btn-secondary pl-btn-sm" onClick={() => test(r.id)}>Test</button><button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => openEdit(r)}>Edit</button><button className="pl-btn pl-btn-ghost pl-btn-sm" style={{ color: "var(--danger)" }} onClick={() => remove(r.id)}><I.trash /> Delete</button></div>
          </div>
        ))}
      </div>}

    {open && (
      <div className="pl-overlay" onClick={() => setOpen(false)}>
        <div className="pl-modal" onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><h3 style={{ margin: 0, fontSize: 15 }}>Add Provider</h3><button className="pl-icon-btn" onClick={() => setOpen(false)}><I.x /></button></div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>{["telegram", "discord", "smtp", "webhook"].map(k => (
            <button key={k} onClick={() => setForm({ ...form, provider_key: k })} style={{ flex: 1, padding: "10px 8px", borderRadius: 10, border: form.provider_key === k ? "1px solid var(--accent)" : "1px solid var(--border)", background: form.provider_key === k ? "var(--accent-soft)" : "var(--bg-input)", color: form.provider_key === k ? "var(--text-primary)" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>{k}</button>
          ))}</div>
          <form onSubmit={create} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label className="pl-label">Connection Name</label><input className="pl-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
            {form.provider_key === "telegram" && <div><label className="pl-label">Bot Token</label><input className="pl-input" value={form.botToken} onChange={e => setForm({ ...form, botToken: e.target.value })} required placeholder="123456:ABC..." /></div>}
            {form.provider_key === "discord" && <div><label className="pl-label">Webhook URL</label><input className="pl-input" value={form.webhookUrl} onChange={e => setForm({ ...form, webhookUrl: e.target.value })} required placeholder="https://discord.com/api/webhooks/..." /></div>}
            {form.provider_key === "smtp" && <><div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 8 }}><div><label className="pl-label">Host</label><input className="pl-input" value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} /></div><div><label className="pl-label">Port</label><input className="pl-input" value={form.port} onChange={e => setForm({ ...form, port: e.target.value })} /></div></div><div><label className="pl-label">Sender Email</label><input className="pl-input" value={form.senderEmail} onChange={e => setForm({ ...form, senderEmail: e.target.value })} /></div></>}
            {form.provider_key === "webhook" && <div><label className="pl-label">Target URL</label><input className="pl-input" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} required placeholder="https://..." /></div>}
            {msg && <div style={{ fontSize: 12, color: "var(--danger)" }}>{msg}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}><button type="button" className="pl-btn pl-btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button type="submit" className="pl-btn pl-btn-primary">Save Provider</button></div>
          </form>
        </div>
      </div>
    )}
    {edit && (
      <div className="pl-overlay" onClick={() => setEdit(null)}>
        <div className="pl-modal" onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><h3 style={{ margin: 0, fontSize: 15 }}>Edit Provider</h3><button className="pl-icon-btn" onClick={() => setEdit(null)}><I.x /></button></div>
          <form onSubmit={saveEdit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label className="pl-label">Name</label><input className="pl-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required /></div>
            <div><label className="pl-label">Status</label><select className="pl-select" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}><option value="active">active</option><option value="disabled">disabled</option></select></div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button type="button" className="pl-btn pl-btn-ghost" onClick={() => setEdit(null)}>Cancel</button><button type="submit" className="pl-btn pl-btn-primary">Save</button></div>
          </form>
        </div>
      </div>
    )}
  </div>;
}
