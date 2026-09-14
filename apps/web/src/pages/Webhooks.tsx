import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api.js";
import { StatusBadge } from "../components/primitives.js";
import { I } from "../components/icons.js";

export default function Webhooks({ tenantId }: { tenantId: string }) {
  const [eps, setEps] = useState<any[]>([]); const [events, setEvents] = useState<any[]>([]); const [tab, setTab] = useState<"endpoints" | "events">("endpoints");
  const [form, setForm] = useState({ name: "", forwarding_url: "" }); const [showCreate, setShowCreate] = useState(false); const [edit, setEdit] = useState<any | null>(null); const [editForm, setEditForm] = useState({ name: "", forwarding_url: "", status: "active" });
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null); const [eventAttempts, setEventAttempts] = useState<any[]>([]); const [msg, setMsg] = useState<string | null>(null);
  const [page, setPage] = useState(1); const [total, setTotal] = useState(0);
  const [ipFor, setIpFor] = useState<string | null>(null); const [ipList, setIpList] = useState<any[]>([]); const [ipForm, setIpForm] = useState({ cidr: "", description: "" });

  const reload = useCallback(() => { apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints`).then(j => setEps(j.data)); }, [tenantId]);
  const reloadEvents = useCallback(() => {
    apiFetch(`/api/v1/tenants/${tenantId}/webhook-events?page=${page}&per_page=10`).then(j => { setEvents(j.data); setTotal(j.meta?.total ?? j.data.length); }).catch(() => { });
  }, [tenantId, page]);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { if (tab === "events") reloadEvents(); }, [tab, reloadEvents]);

  async function create(e: React.FormEvent) { e.preventDefault(); await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints`, { method: "POST", body: JSON.stringify({ name: form.name, forwarding_url: form.forwarding_url || undefined }) }); setForm({ name: "", forwarding_url: "" }); setShowCreate(false); reload(); }
  async function remove(id: string) { if (!confirm("Delete endpoint?")) return; await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints/${id}`, { method: "DELETE" }); reload(); }
  function openEdit(r: any) { setEdit(r); setEditForm({ name: r.name, forwarding_url: r.forwarding_config_json?.url ?? "", status: r.status }); }
  async function saveEdit(e: React.FormEvent) { e.preventDefault(); if (!edit) return; await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints/${edit.id}`, { method: "PATCH", body: JSON.stringify({ name: editForm.name, forwarding_url: editForm.forwarding_url || null, status: editForm.status }) }); setEdit(null); reload(); }
  async function openEvent(ev: any) {
    const j = await apiFetch(`/api/v1/tenants/${tenantId}/webhook-events/${ev.id}`); setSelectedEvent(j.data.event); setEventAttempts(j.data.attempts);
  }
  async function retry(evId: string) { try { const j = await apiFetch(`/api/v1/tenants/${tenantId}/webhook-events/${evId}/retry`, { method: "POST" }); setMsg(`Retry: ${JSON.stringify(j.data)}`); } catch (e: any) { setMsg(e.message || e.code || "Unknown error"); } }
  async function loadIp(endpointId: string) { setIpFor(endpointId); const j = await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints/${endpointId}/ip-allowlist`); setIpList(j.data); }
  async function addIp(e: React.FormEvent) { e.preventDefault(); if (!ipFor) return; await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints/${ipFor}/ip-allowlist`, { method: "POST", body: JSON.stringify(ipForm) }); setIpForm({ cidr: "", description: "" }); loadIp(ipFor); }
  async function delIp(entryId: string) { if (!ipFor) return; await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints/${ipFor}/ip-allowlist/${entryId}`, { method: "DELETE" }); loadIp(ipFor); }

  return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}><div><h2 style={{ margin: 0, fontSize: 18 }}>Webhooks</h2><p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>Receive and forward inbound webhooks.</p></div>
      <button className="pl-btn pl-btn-primary" onClick={() => setShowCreate(true)}><I.plus /> Create Endpoint</button>
    </div>
    {msg && <div style={{ fontSize: 12, padding: "8px 12px", borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)" }}>{msg}</div>}
    <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}><button onClick={() => setTab("endpoints")} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: tab === "endpoints" ? "var(--accent)" : "transparent", color: tab === "endpoints" ? "white" : "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Endpoints</button><button onClick={() => setTab("events")} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: tab === "events" ? "var(--accent)" : "transparent", color: tab === "events" ? "white" : "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Events</button></div>
    {tab === "endpoints" ? (
      <div className="pl-card" style={{ padding: 0, overflow: "hidden" }}>{eps.length === 0 ? <div className="pl-empty"><div className="pl-empty-ic"><I.webhook /></div>No endpoints yet.</div> :
        <table className="pl-table"><thead><tr><th>Name</th><th>Public ID</th><th>URL</th><th>Status</th><th /></tr></thead><tbody>{eps.map((r: any) => <tr key={r.id}><td style={{ fontWeight: 500 }}>{r.name}</td><td className="pl-mono"><span style={{ background: "var(--bg-input)", border: "1px solid var(--border)", padding: "2px 6px", borderRadius: 6 }}>{r.public_identifier}</span> <button onClick={() => navigator.clipboard.writeText(r.public_identifier)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><I.copy /></button></td><td className="pl-mono" style={{ fontSize: 11 }}>/hooks/{r.public_identifier} {r.forwarding_config_json?.url && <span style={{ color: "var(--text-muted)" }}>→ {r.forwarding_config_json.url}</span>}</td><td><StatusBadge status={r.status ?? "Active"} /></td><td style={{ display: "flex", gap: 6 }}><button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => openEdit(r)}>Edit</button><button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => loadIp(r.id)}>IP</button><button className="pl-btn pl-btn-ghost pl-btn-sm" style={{ color: "var(--danger)" }} onClick={() => remove(r.id)}><I.trash /></button></td></tr>)}</tbody></table>}</div>
    ) : (
      <div className="pl-card" style={{ padding: 0, overflow: "hidden" }}>{events.length === 0 ? <div className="pl-empty">No events yet. POST to /hooks/:publicIdentifier</div> :
        <div>
          <table className="pl-table"><thead><tr><th>Time</th><th>Endpoint</th><th>Method</th><th>Source IP</th><th>Status</th><th /></tr></thead><tbody>{events.map((e: any) => <tr key={e.id} style={{ cursor: "pointer" }} onClick={() => openEvent(e)}><td style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(e.created_at ?? e.received_at).toLocaleTimeString()}</td><td>{e.webhook_endpoint_id?.slice(0, 8) ?? "-"}</td><td><span style={{ fontFamily: "var(--font-mono)", fontSize: 11, background: "var(--bg-input)", padding: "2px 6px", borderRadius: 6, border: "1px solid var(--border)" }}>{e.method ?? "POST"}</span></td><td className="pl-mono" style={{ fontSize: 11 }}>{e.source_ip ?? "-"}</td><td><StatusBadge status={e.status ?? "received"} /></td><td><button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={ev => { ev.stopPropagation(); retry(e.id); }}>Retry</button></td></tr>)}</tbody></table>
          <div style={{ display: "flex", gap: 8, padding: "10px 16px", justifyContent: "flex-end", borderTop: "1px solid var(--border)" }}>
            <button className="pl-btn pl-btn-ghost pl-btn-sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
            <span style={{ fontSize: 12, color: "var(--text-muted)", alignSelf: "center" }}>page {page} · {total} total</span>
            <button className="pl-btn pl-btn-ghost pl-btn-sm" disabled={events.length < 10} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      }</div>
    )}
    {edit && (
      <div className="pl-overlay" onClick={() => setEdit(null)}>
        <div className="pl-modal" onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><h3 style={{ margin: 0, fontSize: 15 }}>Edit Endpoint</h3><button className="pl-icon-btn" onClick={() => setEdit(null)}><I.x /></button></div>
          <form onSubmit={saveEdit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label className="pl-label">Name</label><input className="pl-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required /></div>
            <div><label className="pl-label">Forwarding URL</label><input className="pl-input" value={editForm.forwarding_url} onChange={e => setEditForm({ ...editForm, forwarding_url: e.target.value })} placeholder="https://..." /></div>
            <div><label className="pl-label">Status</label><select className="pl-select" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}><option value="active">active</option><option value="disabled">disabled</option></select></div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button type="button" className="pl-btn pl-btn-ghost" onClick={() => setEdit(null)}>Cancel</button><button type="submit" className="pl-btn pl-btn-primary">Save</button></div>
          </form>
        </div>
      </div>
    )}
    {selectedEvent && (
      <div className="pl-drawer">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}><strong>Event {selectedEvent.id.slice(0, 8)}</strong><button className="pl-icon-btn" onClick={() => setSelectedEvent(null)}><I.x /></button></div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
          <div className="pl-mono" style={{ fontSize: 11, background: "var(--bg-input)", padding: 10, borderRadius: 8, border: "1px solid var(--border)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{JSON.stringify(selectedEvent.payload_json, null, 2)}</div>
          <div style={{ fontSize: 12 }}><strong>Forward attempts</strong>{eventAttempts.length === 0 ? <div style={{ color: "var(--text-muted)", marginTop: 6 }}>No attempts yet.</div> : eventAttempts.map((a: any, i: number) => <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--border-subtle)", fontSize: 12 }}>{a.status} {a.response_status ? `(${a.response_status})` : ""} {a.error_message && `— ${a.error_message}`} <span style={{ color: "var(--text-muted)" }}>{new Date(a.created_at).toLocaleString()}</span></div>)}</div>
          <button className="pl-btn pl-btn-primary" onClick={() => retry(selectedEvent.id)}>Retry forward</button>
        </div>
      </div>
    )}
    {showCreate && (
      <div className="pl-overlay" onClick={() => setShowCreate(false)}>
        <div className="pl-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><h3 style={{ margin: 0, fontSize: 15 }}>Create Endpoint</h3><button className="pl-icon-btn" onClick={() => setShowCreate(false)}><I.x /></button></div>
          <form onSubmit={create} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label className="pl-label">Endpoint name</label><input className="pl-input" placeholder="my-hook" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
            <div><label className="pl-label">Forwarding URL (optional)</label><input className="pl-input" placeholder="https://..." value={form.forwarding_url} onChange={e => setForm({ ...form, forwarding_url: e.target.value })} /></div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button type="button" className="pl-btn pl-btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button><button className="pl-btn pl-btn-primary" type="submit"><I.plus /> Create</button></div>
          </form>
        </div>
      </div>
    )}
    {ipFor && (
      <div className="pl-overlay" onClick={() => setIpFor(null)}>
        <div className="pl-modal" onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><h3 style={{ margin: 0, fontSize: 15 }}>IP Allowlist</h3><button className="pl-icon-btn" onClick={() => setIpFor(null)}><I.x /></button></div>
          <form onSubmit={addIp} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input className="pl-input" placeholder="1.2.3.4/32" value={ipForm.cidr} onChange={e => setIpForm({ ...ipForm, cidr: e.target.value })} required style={{ flex: 1 }} />
            <input className="pl-input" placeholder="description" value={ipForm.description} onChange={e => setIpForm({ ...ipForm, description: e.target.value })} style={{ flex: 1 }} />
            <button className="pl-btn pl-btn-primary" type="submit">Add</button>
          </form>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{ipList.length === 0 ? <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No entries — all IPs allowed.</div> : ipList.map((r: any) => <div key={r.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8 }}><span className="pl-mono" style={{ fontSize: 12, flex: 1 }}>{r.cidr}</span><span style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.description ?? ""}</span><button className="pl-btn pl-btn-ghost pl-btn-sm" style={{ color: "var(--danger)" }} onClick={() => delIp(r.id)}><I.trash /></button></div>)}</div>
        </div>
      </div>
    )}
  </div>;
}
