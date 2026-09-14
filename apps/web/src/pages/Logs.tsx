import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api.js";
import { StatusBadge, qs } from "../components/primitives.js";

export default function Logs({ tenantId }: { tenantId: string }) {
  const [logs, setLogs] = useState<any[]>([]); const [dels, setDels] = useState<any[]>([]);
  const [filter, setFilter] = useState("All"); const [status, setStatus] = useState(""); const [page, setPage] = useState(1); const [total, setTotal] = useState(0);
  const cats = ["All", "Delivery", "Webhook", "Security", "Provider", "System"];
  const reloadDels = useCallback(() => {
    const q = qs({ status: status || undefined, page: String(page), per_page: "10" });
    apiFetch(`/api/v1/tenants/${tenantId}/deliveries${q}`).then(j => { setDels(j.data); setTotal(j.meta?.total ?? j.data.length); }).catch(() => { });
  }, [tenantId, status, page]);
  useEffect(() => { apiFetch(`/api/v1/tenants/${tenantId}/logs`).then(j => setLogs(j.data)).catch(() => { }); }, [tenantId]);
  useEffect(() => { reloadDels(); }, [reloadDels]);

  const filteredLogs = useMemo(() => {
    if (filter === "All") return logs;
    const map: Record<string, string[]> = { Delivery: ["delivery", "provider_connection"], Webhook: ["webhook"], Security: ["api_key", "blocked_ip", "ip_allowlist"], Provider: ["provider"], System: ["tenant", "member"] };
    const keys = map[filter] ?? [];
    return logs.filter((l: any) => keys.some(k => (l.action ?? "").includes(k) || (l.target_type ?? "").includes(k)));
  }, [logs, filter]);

  return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div><h2 style={{ margin: 0, fontSize: 18 }}>Logs</h2><p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>Operational events, not raw server logs.</p></div>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{cats.map(c => <button key={c} onClick={() => setFilter(c)} style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid var(--border)", background: filter === c ? "var(--accent)" : "var(--bg-card)", color: filter === c ? "white" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{c}</button>)}</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div className="pl-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span className="pl-card-title">Deliveries</span>
          <select className="pl-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={{ maxWidth: 150 }}>
            <option value="">All status</option><option value="QUEUED">QUEUED</option><option value="PROCESSING">PROCESSING</option><option value="DELIVERED">DELIVERED</option><option value="FAILED">FAILED</option><option value="RETRYING">RETRYING</option><option value="DEAD">DEAD</option>
          </select>
        </div>
        {dels.length === 0 ? <div className="pl-empty">No deliveries.</div> : <table className="pl-table"><thead><tr><th>ID</th><th>Status</th><th>Updated</th></tr></thead><tbody>{dels.map((r: any) => <tr key={r.id}><td className="pl-mono" style={{ fontSize: 11 }}>{r.id.slice(0, 12)}</td><td><StatusBadge status={r.status} /></td><td style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(r.updated_at).toLocaleString()}</td></tr>)}</tbody></table>}
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 10 }}>
          <button className="pl-btn pl-btn-ghost pl-btn-sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
          <span style={{ fontSize: 12, color: "var(--text-muted)", alignSelf: "center" }}>{total} total</span>
          <button className="pl-btn pl-btn-ghost pl-btn-sm" disabled={dels.length < 10} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>
      <div className="pl-card"><div className="pl-card-title" style={{ marginBottom: 12 }}>Audit logs</div>{filteredLogs.length === 0 ? <div className="pl-empty" style={{ fontSize: 12 }}>No audit logs yet.</div> : <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 420, overflow: "auto" }}>{filteredLogs.slice(0, 20).map((l: any, i: number) => <div key={i} style={{ padding: "10px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8 }}><div style={{ fontSize: 12, fontWeight: 500 }}>{l.action ?? l.event ?? JSON.stringify(l).slice(0, 80)}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>{l.created_at ? new Date(l.created_at).toLocaleString() : ""} · {l.actor ?? ""} {l.target_type ? `· ${l.target_type}` : ""}</div></div>)}</div>}</div>
    </div>
  </div>;
}
