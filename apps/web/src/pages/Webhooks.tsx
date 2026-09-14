import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api.js";
import { StatusBadge } from "../components/primitives.js";
import { I } from "../components/icons.js";

export default function Webhooks({ tenantId }: { tenantId: string }) {
  const [eps, setEps] = useState<any[]>([]); const [events, setEvents] = useState<any[]>([]); const [tab, setTab] = useState<"endpoints" | "events" | "telegram">("endpoints");
  const [form, setForm] = useState({ name: "", forwarding_url: "" }); const [showCreate, setShowCreate] = useState(false); const [edit, setEdit] = useState<any | null>(null); const [editForm, setEditForm] = useState({ name: "", forwarding_url: "", status: "active" });
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null); const [eventAttempts, setEventAttempts] = useState<any[]>([]); const [msg, setMsg] = useState<string | null>(null);
  const [page, setPage] = useState(1); const [total, setTotal] = useState(0);
  const [ipFor, setIpFor] = useState<string | null>(null); const [ipList, setIpList] = useState<any[]>([]); const [ipForm, setIpForm] = useState({ cidr: "", description: "" });
  const [pub, setPub] = useState<{ public_base_url: string | null; ready: boolean } | null>(null);
  const [conns, setConns] = useState<any[]>([]);
  const [tgLinks, setTgLinks] = useState<any[]>([]);
  const [tgWire, setTgWire] = useState({ connectionId: "", endpointId: "", secret: "" }); const [tgWireMsg, setTgWireMsg] = useState<string | null>(null);
  const [setTg, setSetTg] = useState<any | null>(null);
  const [setTgForm, setSetTgForm] = useState({ connectionId: "", secret: "" });
  const [tgInfo, setTgInfo] = useState<any | null>(null); const [tgInfoErr, setTgInfoErr] = useState<string | null>(null);
  const [setTgMsg, setSetTgMsg] = useState<string | null>(null);
  const tgConns = conns.filter((c: any) => c.provider_key === "telegram");

  const reload = useCallback(() => {
    apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints`).then(j => setEps(j.data)).catch(() => { });
    apiFetch(`/api/v1/tenants/${tenantId}/provider-connections?provider_key=telegram`).then(j => setConns(j.data ?? [])).catch(() => { });
    apiFetch(`/api/v1/tenants/${tenantId}/telegram/webhook-links`).then(j => setTgLinks(j.data ?? [])).catch(() => { });
  }, [tenantId]);
  const reloadEvents = useCallback(() => {
    apiFetch(`/api/v1/tenants/${tenantId}/webhook-events?page=${page}&per_page=10`).then(j => { setEvents(j.data); setTotal(j.meta?.total ?? j.data.length); }).catch(() => { });
  }, [tenantId, page]);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { apiFetch(`/api/v1/tenants/${tenantId}/webhooks/public-status`).then(j => setPub(j.data)).catch(() => { }); }, [tenantId]);
  useEffect(() => { if (tab === "events") reloadEvents(); }, [tab, reloadEvents]);

  async function create(e: React.FormEvent) { e.preventDefault(); const j = await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints`, { method: "POST", body: JSON.stringify({ name: form.name, forwarding_url: form.forwarding_url || undefined }) }); const newId = (j as any)?.data?.id as string | undefined; setForm({ name: "", forwarding_url: "" }); setShowCreate(false); if (newId) setTgWire(f => ({ ...f, endpointId: f.endpointId || newId })); reload(); }
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
  async function tgSet(e: React.FormEvent) { e.preventDefault(); setTgWireMsg(null); setTgInfo(null); try { const j = await apiFetch(`/api/v1/tenants/${tenantId}/telegram/set-webhook`, { method: "POST", body: JSON.stringify({ connectionId: tgWire.connectionId, endpointId: tgWire.endpointId, ...(tgWire.secret ? { secret: tgWire.secret } : {}) }) }); setTgWireMsg(`Webhook set: ${j.data?.url ?? ""}`); setTgWire({ ...tgWire, secret: "" }); reload(); } catch (er: any) { setTgWireMsg(er.message || er.code || "Unknown error"); } }
  async function tgLoadInfo() { setTgWireMsg(null); if (!tgWire.connectionId) { setTgWireMsg("Pick a Telegram bot first."); return; } try { const j = await apiFetch(`/api/v1/tenants/${tenantId}/telegram/webhook-info?connectionId=${encodeURIComponent(tgWire.connectionId)}`); setTgInfo(j.data); } catch (er: any) { setTgWireMsg(er.message || er.code || "Unknown error"); } }
  async function tgDelete() { if (!tgWire.connectionId) { setTgWireMsg("Pick a Telegram bot first."); return; } if (!confirm("Delete Telegram webhook for this bot?")) return; try { await apiFetch(`/api/v1/tenants/${tenantId}/telegram/delete-webhook`, { method: "POST", body: JSON.stringify({ connectionId: tgWire.connectionId }) }); setTgWireMsg("Webhook deleted."); setTgInfo(null); reload(); } catch (er: any) { setTgWireMsg(er.message || er.code || "Unknown error"); } }

  function genSecret() { const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"; let s = ""; const a = new Uint32Array(32); crypto.getRandomValues(a); for (const n of a) s += chars[n % 64]; setSetTgForm(f => ({ ...f, secret: s })); }
  async function loadTgInfo(connectionId: string) {
    setTgInfo(null); setTgInfoErr(null);
    if (!connectionId) return;
    try { const j = await apiFetch(`/api/v1/tenants/${tenantId}/telegram/webhook-info?connectionId=${connectionId}`); setTgInfo(j.data); }
    catch (e: any) { setTgInfoErr(e.message || e.code || "Unknown error"); }
  }
  function openSetTg(ep: any) { setSetTg(ep); setSetTgForm({ connectionId: "", secret: "" }); setTgInfo(null); setTgInfoErr(null); setSetTgMsg(null); }
  async function submitSetTg(e: React.FormEvent) {
    e.preventDefault(); if (!setTg || !setTgForm.connectionId) return; setSetTgMsg(null);
    try {
      const body: any = { connectionId: setTgForm.connectionId, endpointId: setTg.id };
      if (setTgForm.secret) body.secret = setTgForm.secret;
      const j = await apiFetch(`/api/v1/tenants/${tenantId}/telegram/set-webhook`, { method: "POST", body: JSON.stringify(body) });
      setSetTgMsg(`Webhook terdaftar: ${j.data?.url ?? ""}`);
      await loadTgInfo(setTgForm.connectionId);
      reload();
    } catch (er: any) { setSetTgMsg(er.message || er.code || "Unknown error"); }
  }
  async function deleteTg() {
    if (!setTgForm.connectionId || !confirm("Hapus webhook Telegram di akun ini?")) return; setSetTgMsg(null);
    try { await apiFetch(`/api/v1/tenants/${tenantId}/telegram/delete-webhook`, { method: "POST", body: JSON.stringify({ connectionId: setTgForm.connectionId }) }); setSetTgMsg("Webhook dihapus."); await loadTgInfo(setTgForm.connectionId); reload(); }
    catch (er: any) { setSetTgMsg(er.message || er.code || "Unknown error"); }
  }

  return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div><h2 style={{ margin: 0, fontSize: 18 }}>Webhooks</h2><p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>Receive and forward inbound webhooks.</p></div>
    {msg && <div style={{ fontSize: 12, padding: "8px 12px", borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)" }}>{msg}</div>}
    {pub && (pub.ready ? (
      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "var(--success-soft, rgba(34,197,94,0.08))", border: "1px solid rgba(34,197,94,0.25)", fontSize: 13 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--success, #22C55E)", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}><strong>Public webhooks ready.</strong> <span style={{ color: "var(--text-secondary)" }}>Telegram & external services can reach </span><span className="pl-mono" style={{ fontSize: 12 }}>{pub.public_base_url}</span></div>
        <button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => pub.public_base_url && navigator.clipboard.writeText(pub.public_base_url)}><I.copy /> Copy</button>
      </div>
    ) : (
      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "var(--warning-soft, rgba(245,158,11,0.08))", border: "1px solid rgba(245,158,11,0.3)", fontSize: 13 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--warning, #F59E0B)", flexShrink: 0 }} />
        <div><strong>Public webhooks not reachable.</strong> <span style={{ color: "var(--text-secondary)" }}>Set <span className="pl-mono" style={{ fontSize: 12 }}>PORTLANE_PUBLIC_BASE_URL</span> (tunnel/domain) so Telegram & external services can callback here.</span></div>
      </div>
    ))}
    <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}><button onClick={() => setTab("endpoints")} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: tab === "endpoints" ? "var(--accent)" : "transparent", color: tab === "endpoints" ? "white" : "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Endpoints</button><button onClick={() => setTab("events")} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: tab === "events" ? "var(--accent)" : "transparent", color: tab === "events" ? "white" : "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Events</button><button onClick={() => setTab("telegram")} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: tab === "telegram" ? "var(--accent)" : "transparent", color: tab === "telegram" ? "white" : "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Telegram</button></div>
    {tab === "endpoints" ? (
      <div className="pl-card" style={{ padding: 0, overflow: "hidden" }}>{eps.length === 0 ? <div className="pl-empty"><div className="pl-empty-ic"><I.webhook /></div>No endpoints yet.</div> :
        <table className="pl-table"><thead><tr><th>Name</th><th>Public ID</th><th>URL</th><th>Status</th><th /></tr></thead><tbody>{eps.map((r: any) => <tr key={r.id}><td style={{ fontWeight: 500 }}>{r.name}</td><td className="pl-mono"><span style={{ background: "var(--bg-input)", border: "1px solid var(--border)", padding: "2px 6px", borderRadius: 6 }}>{r.public_identifier}</span> <button onClick={() => navigator.clipboard.writeText(r.public_identifier)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><I.copy /></button></td><td className="pl-mono" style={{ fontSize: 11 }}>{pub?.ready && pub.public_base_url ? <><span>{pub.public_base_url}/hooks/{r.public_identifier}</span> <button onClick={() => navigator.clipboard.writeText(`${pub.public_base_url}/hooks/${r.public_identifier}`)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><I.copy /></button></> : <span>/hooks/{r.public_identifier}</span>} {r.forwarding_config_json?.url && <span style={{ color: "var(--text-muted)" }}>→ {r.forwarding_config_json.url}</span>}</td><td><StatusBadge status={r.status ?? "Active"} /></td><td style={{ display: "flex", gap: 6 }}><button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => openEdit(r)}>Edit</button><button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => loadIp(r.id)}>IP</button><button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => openSetTg(r)}>Telegram</button><button className="pl-btn pl-btn-ghost pl-btn-sm" style={{ color: "var(--danger)" }} onClick={() => remove(r.id)}><I.trash /></button></td></tr>)}</tbody></table>}</div>
    ) : tab === "telegram" ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="pl-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div><div style={{ fontWeight: 600, fontSize: 13 }}>Hubungkan bot Telegram ke URL publik</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>3 langkah: pilih bot → pilih/buat endpoint → klik Set webhook. 1 endpoint = 1 URL publik (/hooks/…), boleh forward ke webhook downstream yang sama.</div></div>
          {tgWireMsg && <div style={{ fontSize: 12, padding: "8px 12px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", wordBreak: "break-all" }}>{tgWireMsg}</div>}
          <form onSubmit={tgSet} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div><label className="pl-label">1. Bot Telegram</label><select className="pl-select" value={tgWire.connectionId} onChange={e => setTgWire({ ...tgWire, connectionId: e.target.value })} required><option value="">— Pilih bot —</option>{tgConns.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              {tgConns.length === 0 && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Belum ada bot. Buat dulu di halaman Providers → Telegram.</div>}</div>
            <div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><label className="pl-label">2. Endpoint (URL publik)</label>{eps.length > 0 && <button type="button" className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => setShowCreate(true)}><I.plus /> Baru</button>}</div>
              {eps.length === 0 ? (
                <div style={{ padding: 12, borderRadius: 8, background: "var(--bg-input)", border: "1px dashed var(--border)", fontSize: 12, display: "flex", flexDirection: "column", gap: 8 }}><span>Belum ada endpoint. Buat dulu biar dapat URL publik (/hooks/…).</span><span><button type="button" className="pl-btn pl-btn-primary pl-btn-sm" onClick={() => setShowCreate(true)}><I.plus /> Buat endpoint</button></span></div>
              ) : (
                <select className="pl-select" value={tgWire.endpointId} onChange={e => setTgWire({ ...tgWire, endpointId: e.target.value })} required><option value="">— Pilih endpoint —</option>{eps.map((x: any) => <option key={x.id} value={x.id}>{x.name} · /hooks/{x.public_identifier}</option>)}</select>
              )}</div>
            <div><label className="pl-label">3. Secret (opsional — kosong = pakai secret endpoint)</label><input className="pl-input pl-mono" value={tgWire.secret} onChange={e => setTgWire({ ...tgWire, secret: e.target.value })} placeholder="A-Za-z0-9_- 1-256 chars" /></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="submit" className="pl-btn pl-btn-primary pl-btn-sm" disabled={eps.length === 0}>Set webhook</button><button type="button" className="pl-btn pl-btn-secondary pl-btn-sm" onClick={tgLoadInfo}>Check status</button><button type="button" className="pl-btn pl-btn-ghost pl-btn-sm" style={{ color: "var(--danger)" }} onClick={tgDelete}>Delete webhook</button></div>
          </form>
          {tgInfo && <div className="pl-mono" style={{ fontSize: 11, background: "var(--bg-input)", padding: 10, borderRadius: 8, border: "1px solid var(--border)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{JSON.stringify(tgInfo, null, 2)}</div>}
        </div>
        <div className="pl-card" style={{ padding: 0, overflow: "hidden" }}>{tgLinks.length === 0 ? <div className="pl-empty">Belum ada bot yang terhubung.</div> :
          <table className="pl-table"><thead><tr><th>Bot</th><th>Endpoint</th><th>URL</th><th>Last set</th></tr></thead><tbody>{tgLinks.map((l: any) => <tr key={l.id}><td style={{ fontWeight: 500 }}>{l.connection_name}</td><td className="pl-mono" style={{ fontSize: 11 }}>{l.endpoint_name} · {l.public_identifier}</td><td className="pl-mono" style={{ fontSize: 11 }}>{l.telegram_url}</td><td style={{ fontSize: 11, color: "var(--text-muted)" }}>{l.last_set_at ? new Date(l.last_set_at).toLocaleString() : "-"}</td></tr>)}</tbody></table>}</div>
      </div>
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
    {setTg && (
      <div className="pl-overlay" onClick={() => setSetTg(null)}>
        <div className="pl-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><h3 style={{ margin: 0, fontSize: 15 }}>Set Telegram Webhook</h3><button className="pl-icon-btn" onClick={() => setSetTg(null)}><I.x /></button></div>
          <div style={{ fontSize: 13, marginBottom: 4 }}>Endpoint: <strong>{setTg.name}</strong></div>
          <div className="pl-mono" style={{ fontSize: 11, background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", wordBreak: "break-all", marginBottom: 4 }}>
            {pub?.ready && pub.public_base_url ? `${pub.public_base_url}/hooks/${setTg.public_identifier}` : `/hooks/${setTg.public_identifier}`}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>Update yang masuk akan diteruskan ke: {setTg.forwarding_config_json?.url ? <span className="pl-mono" style={{ fontSize: 11 }}>{setTg.forwarding_config_json.url}</span> : <em>tidak diteruskan — hanya tersimpan sebagai event</em>}</div>
          {!pub?.ready && <div style={{ fontSize: 12, color: "var(--warning, #F59E0B)", marginBottom: 12 }}>Base URL publik belum dikonfigurasi — set-webhook akan ditolak server sampai <span className="pl-mono">PORTLANE_PUBLIC_BASE_URL</span> diisi.</div>}
          <form onSubmit={submitSetTg} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label className="pl-label">Akun Telegram (provider connection)</label>
              <select className="pl-select" value={setTgForm.connectionId} onChange={e => { setSetTgForm(f => ({ ...f, connectionId: e.target.value })); loadTgInfo(e.target.value); }} required style={{ width: "100%" }}>
                <option value="">— pilih akun —</option>
                {tgConns.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.status})</option>)}
              </select>
              {tgConns.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Belum ada koneksi Telegram. Tambahkan dulu di halaman Providers.</div>}
            </div>
            {tgInfoErr && <div style={{ fontSize: 12, color: "var(--danger)" }}>Gagal baca status Telegram: {tgInfoErr}</div>}
            {tgInfo && (() => {
              const expected = pub?.ready && pub.public_base_url ? `${pub.public_base_url}/hooks/${setTg.public_identifier}` : null;
              const actual = tgInfo.url as string | undefined;
              return <div style={{ fontSize: 12, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-input)" }}>
                <div>Status di sisi Telegram: {actual ? <span className="pl-mono" style={{ fontSize: 11, wordBreak: "break-all" }}>{actual}</span> : <em>belum terdaftar</em>}</div>
                {actual && expected && (actual === expected
                  ? <div style={{ color: "var(--success, #22C55E)", marginTop: 4 }}>Cocok dengan endpoint ini — jalur sudah benar.</div>
                  : <div style={{ color: "var(--danger, #EF4444)", marginTop: 4 }}>Tidak cocok — akun ini mengarah ke URL lain{(expected ? <> (endpoint ini: <span className="pl-mono" style={{ fontSize: 11 }}>{expected}</span>)</> : "")}. Set ulang di bawah bila ingin pindahkan ke sini.</div>)}
                {(tgInfo.pending_update_count ?? 0) > 0 && <div style={{ color: "var(--warning, #F59E0B)", marginTop: 4 }}>{tgInfo.pending_update_count} update menumpuk di Telegram.</div>}
                {tgInfo.last_error_message && <div style={{ color: "var(--danger, #EF4444)", marginTop: 4 }}>Error terakhir Telegram: {tgInfo.last_error_message}</div>}
              </div>;
            })()}
            <div><label className="pl-label">Secret token (opsional)</label>
              <div style={{ display: "flex", gap: 8 }}><input className="pl-input" value={setTgForm.secret} onChange={e => setSetTgForm(f => ({ ...f, secret: e.target.value }))} placeholder="kosong = pakai secret endpoint yang ada" pattern="[A-Za-z0-9_-]{1,256}" style={{ flex: 1 }} /><button type="button" className="pl-btn pl-btn-secondary" onClick={genSecret}>Generate</button></div>
            </div>
            {setTgMsg && <div style={{ fontSize: 12 }}>{setTgMsg}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
              <button type="button" className="pl-btn pl-btn-ghost" style={{ color: "var(--danger)" }} disabled={!setTgForm.connectionId} onClick={deleteTg}>Hapus webhook</button>
              <div style={{ display: "flex", gap: 8 }}><button type="button" className="pl-btn pl-btn-ghost" onClick={() => setSetTg(null)}>Tutup</button><button type="submit" className="pl-btn pl-btn-primary" disabled={!setTgForm.connectionId}>Set webhook</button></div>
            </div>
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
