import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api.js";
import { StatusBadge, qs } from "../components/primitives.js";
import { I } from "../components/icons.js";

export default function Messages({ tenantId }: { tenantId: string }) {
  const [list, setList] = useState<any[]>([]); const [detail, setDetail] = useState<any>(null); const [q, setQ] = useState(""); const [drawer, setDrawer] = useState<any>(null);
  const [page, setPage] = useState(1); const [total, setTotal] = useState(0); const [per] = useState(10);
  const [showSend, setShowSend] = useState(false); const [destinations, setDestinations] = useState<any[]>([]);
  const [sendForm, setSendForm] = useState({ subject: "", body: "", destination_ids: [] as string[] }); const [sendMsg, setSendMsg] = useState<string | null>(null);

  const reload = useCallback(() => {
    const query = qs({ q: q || undefined, page: String(page), per_page: String(per) });
    return apiFetch(`/api/v1/tenants/${tenantId}/messages${query}`).then(j => { setList(j.data); setTotal(j.meta?.total ?? j.data.length); });
  }, [tenantId, q, page, per]);
  useEffect(() => { const t = setTimeout(reload, 250); return () => clearTimeout(t); }, [reload]);
  useEffect(() => { if (showSend) apiFetch(`/api/v1/tenants/${tenantId}/destinations`).then(j => setDestinations(j.data)).catch(() => { }); }, [tenantId, showSend]);

  async function open(id: string) { const j = await apiFetch(`/api/v1/tenants/${tenantId}/messages/${id}`); setDetail(j.data); }
  async function retry(dlvId: string) { await apiFetch(`/api/v1/tenants/${tenantId}/deliveries/${dlvId}/retry`, { method: "POST" }); setSendMsg("Retry queued"); setTimeout(() => setSendMsg(null), 2000); }
  async function openDelivery(d: any) {
    try { const j = await apiFetch(`/api/v1/tenants/${tenantId}/deliveries/${d.id}`); setDrawer({ ...d, attempts: j.data.attempts, attempt_count: j.data.attempts?.length }); } catch { setDrawer(d); }
  }
  async function send(e: React.FormEvent) {
    e.preventDefault(); setSendMsg(null);
    try {
      await apiFetch(`/api/v1/tenants/${tenantId}/messages`, { method: "POST", body: JSON.stringify({ destinations: sendForm.destination_ids, message: { subject: sendForm.subject || undefined, body: sendForm.body } }) });
      setShowSend(false); setSendForm({ subject: "", body: "", destination_ids: [] }); setSendMsg("Sent"); reload();
    } catch (er: any) { setSendMsg(er.message); }
  }
  const totalPages = Math.max(1, Math.ceil(total / per));

  return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><div><h2 style={{ margin: 0, fontSize: 18 }}>Messages</h2><p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>Track outbound communication and delivery status.</p></div><button className="pl-btn pl-btn-primary" onClick={() => setShowSend(true)}><I.plus /> Send Message</button></div>
    {sendMsg && <div style={{ fontSize: 12, padding: "10px 12px", borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)" }}>{sendMsg}</div>}
    <div className="pl-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 8, padding: "12px 16px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 280 }}><span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}><I.search /></span><input className="pl-input" style={{ paddingLeft: 30 }} placeholder="Search subject, body, id..." value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /></div>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{total} total · page {page}/{totalPages}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button className="pl-btn pl-btn-ghost pl-btn-sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
          <button className="pl-btn pl-btn-ghost pl-btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>
      <div style={{ overflow: "auto" }}>
        <table className="pl-table"><thead><tr><th>Message</th><th>Destinations</th><th>Created</th></tr></thead><tbody>
          {list.length === 0 ? <tr><td colSpan={3}><div className="pl-empty">Empty — send via dashboard or machine API: POST /api/v1/messages with Bearer pl_live_...</div></td></tr> :
            list.map((r: any) => <tr key={r.id} onClick={() => open(r.id)} style={{ cursor: "pointer" }}><td><div style={{ fontWeight: 500, fontSize: 13 }}>{r.subject ?? "(no subject)"}</div><div className="pl-mono" style={{ color: "var(--text-muted)", fontSize: 11 }}>{r.id.slice(0, 14)} · {r.body.slice(0, 48)}</div></td><td className="pl-mono" style={{ fontSize: 11 }}>{typeof r.delivery_total === "number" ? `${r.delivered_count ?? 0}/${r.delivery_total} delivered${(r.failed_count ?? 0) ? ` · ${r.failed_count} failed` : ""}` : (r.destination_ids?.length ?? "-")}</td><td style={{ color: "var(--text-muted)", fontSize: 12 }}>{new Date(r.created_at).toLocaleString()}</td></tr>)}
        </tbody></table>
      </div>
    </div>
    {detail && <div className="pl-card">
      <div style={{ display: "flex", justifyContent: "space-between" }}><div><div style={{ fontWeight: 600 }}>{detail.message.subject ?? detail.message.id}</div><div className="pl-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>{detail.message.id} · {new Date(detail.message.created_at).toLocaleString()}</div></div><button className="pl-icon-btn" onClick={() => setDetail(null)}><I.x /></button></div>
      <div style={{ marginTop: 12, background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}><div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Body</div><div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{detail.message.body}</div></div>
      <div style={{ marginTop: 12 }}><strong style={{ fontSize: 12 }}>Deliveries</strong><div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>{detail.deliveries?.map((d: any) => <div key={d.id} onClick={() => openDelivery(d)} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer" }}><StatusBadge status={d.status} /><span className="pl-mono" style={{ fontSize: 11, flex: 1 }}>{d.id.slice(0, 12)} → {d.destination_id.slice(0, 8)}</span>{["FAILED", "DEAD", "RETRYING"].includes(d.status) && <button className="pl-btn pl-btn-secondary pl-btn-sm" onClick={e => { e.stopPropagation(); retry(d.id); }}>Retry</button>}<span style={{ color: "var(--text-muted)" }}>›</span></div>)}</div></div>
    </div>}
    {drawer && (
      <div className="pl-drawer">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}><strong>Delivery Detail</strong><button className="pl-icon-btn" onClick={() => setDrawer(null)}><I.x /></button></div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
          <div className="pl-mono" style={{ fontSize: 12, wordBreak: "break-all", background: "var(--bg-input)", padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}>{drawer.id}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}><div><div style={{ color: "var(--text-muted)", fontSize: 11 }}>Status</div><StatusBadge status={drawer.status} /></div><div><div style={{ color: "var(--text-muted)", fontSize: 11 }}>Attempts</div>{drawer.attempt_count ?? drawer.attempts?.length ?? "-"}</div><div><div style={{ color: "var(--text-muted)", fontSize: 11 }}>Destination</div><span className="pl-mono" style={{ fontSize: 11 }}>{drawer.destination_id}</span></div><div><div style={{ color: "var(--text-muted)", fontSize: 11 }}>Updated</div>{new Date(drawer.updated_at).toLocaleString()}</div></div>
          {(drawer.last_error_message || drawer.last_error_code) && <div style={{ background: "var(--danger-soft)", border: "1px solid rgba(239,68,68,0.2)", padding: 10, borderRadius: 8, fontSize: 12 }}><strong>{drawer.last_error_code}</strong> {drawer.last_error_message}</div>}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}><strong style={{ fontSize: 12 }}>Attempts</strong>{(drawer.attempts ?? []).length ? drawer.attempts.map((a: any, i: number) => <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--border-subtle)", fontSize: 12 }}><div>{a.error_message ?? a.result ?? a.status} {a.provider_status_code ? `(${a.provider_status_code})` : ""}</div><div style={{ color: "var(--text-muted)", fontSize: 11 }}>{a.created_at ? new Date(a.created_at).toLocaleString() : a.started_at ? new Date(a.started_at).toLocaleString() : ""}</div></div>) : <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>No attempt logs.</div>}</div>
          {["FAILED", "DEAD", "RETRYING"].includes(drawer.status) && <button className="pl-btn pl-btn-primary" onClick={() => retry(drawer.id)}>Retry delivery</button>}
        </div>
      </div>
    )}
    {showSend && (
      <div className="pl-overlay" onClick={() => setShowSend(false)}>
        <div className="pl-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><h3 style={{ margin: 0, fontSize: 15 }}>Send Message</h3><button className="pl-icon-btn" onClick={() => setShowSend(false)}><I.x /></button></div>
          <form onSubmit={send} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label className="pl-label">Destinations (hold Cmd/Ctrl to select multiple)</label>
              <select multiple className="pl-input" style={{ height: 120 }} value={sendForm.destination_ids} onChange={e => setSendForm({ ...sendForm, destination_ids: Array.from(e.target.selectedOptions).map(o => o.value) })} required>
                {destinations.map((d: any) => <option key={d.id} value={d.id}>{d.name} ({d.destination_type})</option>)}
              </select>
            </div>
            <div><label className="pl-label">Subject (optional)</label><input className="pl-input" value={sendForm.subject} onChange={e => setSendForm({ ...sendForm, subject: e.target.value })} placeholder="Production Alert" /></div>
            <div><label className="pl-label">Body</label><textarea className="pl-input" style={{ minHeight: 90 }} value={sendForm.body} onChange={e => setSendForm({ ...sendForm, body: e.target.value })} required placeholder="Message body..." /></div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button type="button" className="pl-btn pl-btn-ghost" onClick={() => setShowSend(false)}>Cancel</button><button type="submit" className="pl-btn pl-btn-primary">Send</button></div>
          </form>
        </div>
      </div>
    )}
  </div>;
}
