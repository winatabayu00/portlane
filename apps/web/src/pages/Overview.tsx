import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api.js";
import { Spark, StatusBadge, Skeleton } from "../components/primitives.js";
import { I } from "../components/icons.js";

const MIX_COLORS = ["#FF7A00", "#FF9A3D", "#FFB366", "#8A8A8A", "#525252"];

export default function Overview({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<any>(null); const [err, setErr] = useState<string | null>(null);
  const [conns, setConns] = useState<any[]>([]); const [recent, setRecent] = useState<any[]>([]);
  const [range, setRange] = useState<"24h" | "7d" | "30d">("7d");
  // Range-aware fetch + 15s live polling (DESIGN.md §42). Interval cleared on
  // unmount/tenant/range change; stale responses after unmount are dropped.
  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const [o, c, r] = await Promise.all([
          apiFetch(`/api/v1/tenants/${tenantId}/overview?range=${range}`),
          apiFetch(`/api/v1/tenants/${tenantId}/provider-connections`).catch(() => ({ data: [] })),
          apiFetch(`/api/v1/tenants/${tenantId}/deliveries?per_page=5`).catch(() => ({ data: [] })),
        ]);
        if (!stop) { setData(o.data); setConns(c.data ?? []); setRecent(r.data ?? []); setErr(null); }
      } catch (e: any) { if (!stop) setErr(e.message); }
    }
    load();
    const t = setInterval(load, 15000);
    return () => { stop = true; clearInterval(t); };
  }, [tenantId, range]);
  if (err) return <div style={{ padding: 16, background: "var(--danger-soft)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, color: "var(--danger)" }}>{err}</div>;
  if (!data) return <div style={{ display: "grid", gap: 16 }}><div className="pl-metric-grid">{[1, 2, 3, 4].map(i => <div key={i} className="pl-card"><Skeleton h={90} /></div>)}</div></div>;
  const totalDone = (data.delivered ?? 0) + (data.failed ?? 0);
  const successRate = totalDone > 0 ? `${((100 * (data.delivered ?? 0)) / totalDone).toFixed(1)}%` : "—";
  const activity: (Array<{ bucket: string; delivered: number; failed: number }>) = data.activity ?? [];
  const deliveredSeries = activity.map(a => a.delivered);
  const failedSeries = activity.map(a => a.failed);
  const totalSeries = activity.map(a => a.delivered + a.failed);
  const metrics = [
    { label: "Messages Today", value: data.messages_today ?? 0, sub: `${data.queued ?? 0} in queue`, icon: "✉️", color: "var(--accent)", spark: totalSeries },
    { label: "Delivered", value: data.delivered ?? 0, sub: `${successRate} success`, icon: "✓", color: "var(--success)", spark: deliveredSeries },
    { label: "Failed", value: data.failed ?? 0, sub: data.failed > 0 ? "needs attention" : "all clear", icon: "!", color: "var(--danger)", spark: failedSeries },
    { label: "Webhooks", value: data.webhooks_received_today ?? 0, sub: "received last 24h", icon: "↗", color: "var(--accent)", spark: totalSeries },
  ];
  const maxBar = Math.max(...activity.map(a => Math.max(a.delivered, a.failed)), 1);
  const mix: (Array<{ provider_key: string; count: number; pct: number }>) = data.provider_mix ?? [];
  const mixTotal = mix.reduce((a, b) => a + b.count, 0);
  const breakdown = mix.map((m, i) => ({ label: m.provider_key, pct: m.pct, color: MIX_COLORS[i % MIX_COLORS.length] }));
  const q = data.queue ?? { queued: data.queued ?? 0, processing: 0, retrying: 0, dead: 0 };
  const pending = q.queued + q.processing + q.retrying + q.dead;
  return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div className="pl-metric-grid">
      {metrics.map(m => (
        <div key={m.label} className="pl-metric">
          <div className="pl-metric-head"><span className="pl-metric-label">{m.label}</span><span className="pl-metric-icon" style={{ background: m.color === "var(--accent)" ? "var(--accent-soft)" : m.color === "var(--success)" ? "var(--success-soft)" : "var(--danger-soft)", borderColor: m.color === "var(--accent)" ? "var(--accent-border)" : "transparent", color: m.color }}>{m.icon}</span></div>
          <div className="pl-metric-value">{m.value.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.sub}</div>
          <div className="pl-spark"><Spark color={m.color} values={m.spark} /></div>
        </div>
      ))}
    </div>
    <div className="pl-grid-2">
      <div className="pl-card">
        <div className="pl-card-head"><div><div className="pl-card-title">Delivery Activity</div><div className="pl-card-sub">Delivered vs failed — {range}</div></div>
          <div className="pl-tabs">{(["24h", "7d", "30d"] as const).map(r => <button key={r} className={`pl-tab ${range === r ? "active" : ""}`} onClick={() => setRange(r)}>{r}</button>)}</div>
        </div>
        {activity.length === 0 ? <div className="pl-empty">No delivery data in range.</div> :
          <div className="pl-chart-wrap">
            <div className="pl-chart-grid">{[0, 1, 2, 3].map(i => <div key={i} className="pl-chart-grid-line" />)}</div>
            <div className="pl-bars" style={{ position: "relative", zIndex: 1 }}>
              {activity.map((b, i) => (
                <div key={b.bucket} style={{ flex: 1, display: "flex", gap: 3, alignItems: "end", height: "100%", paddingBottom: 4 }} title={`${new Date(b.bucket).toLocaleString()}: ${b.delivered} delivered, ${b.failed} failed`}>
                  <div className="pl-bar pl-bar-o" style={{ flex: 1, height: `${Math.max(3, (b.delivered / maxBar) * 88)}%`, opacity: i === activity.length - 1 ? 1 : 0.9 }} />
                  <div style={{ flex: 1, height: `${Math.max(b.failed > 0 ? 3 : 0, (b.failed / maxBar) * 88)}%`, background: "var(--danger)", borderRadius: "6px 6px 4px 4px", opacity: 0.95 }} />
                </div>
              ))}
            </div>
          </div>}
        <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, background: "var(--accent)", borderRadius: 99, display: "inline-block" }} /> Delivered</span><span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, background: "var(--danger)", borderRadius: 99, display: "inline-block" }} /> Failed</span></div>
      </div>
      <div className="pl-card">
        <div className="pl-card-head"><div className="pl-card-title">Provider Mix</div><span className="pl-pill">{range}</span></div>
        {breakdown.length === 0 ? <div className="pl-empty">No deliveries in range.</div> :
          <div className="pl-donut">
            <svg width="110" height="110" viewBox="0 0 110 110">
              {(() => {
                let acc = 0; const tot = breakdown.reduce((a, b) => a + b.pct, 0) || 1;
                return breakdown.map(b => {
                  const start = (acc / tot) * 2 * Math.PI - Math.PI / 2;
                  const sweep = (b.pct / tot) * 2 * Math.PI;
                  const end = start + sweep; acc += b.pct;
                  const x1 = 55 + 40 * Math.cos(start), y1 = 55 + 40 * Math.sin(start), x2 = 55 + 40 * Math.cos(end), y2 = 55 + 40 * Math.sin(end);
                  const large = sweep > Math.PI ? 1 : 0;
                  const xi1 = 55 + 24 * Math.cos(end), yi1 = 55 + 24 * Math.sin(end), xi2 = 55 + 24 * Math.cos(start), yi2 = 55 + 24 * Math.sin(start);
                  return <path key={b.label} d={`M ${x1} ${y1} A 40 40 0 ${large} 1 ${x2} ${y2} L ${xi1} ${yi1} A 24 24 0 ${large} 0 ${xi2} ${yi2} Z`} fill={b.color} stroke="var(--bg-card)" strokeWidth="2" />;
                });
              })()}
              <circle cx="55" cy="55" r="24" fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1" />
              <text x="55" y="52" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text-primary)">{mixTotal}</text>
              <text x="55" y="64" textAnchor="middle" fontSize="9" fill="var(--text-muted)">deliveries</text>
            </svg>
            <div className="pl-legend">
              {breakdown.map(b => <div key={b.label} className="pl-legend-row"><span className="pl-dot" style={{ background: b.color }} /><span>{b.label}</span><span className="pl-legend-val">{b.pct}%</span></div>)}
            </div>
          </div>}
        {conns.length === 0 && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>No provider connections yet — connect one to start routing.</div>}
      </div>
    </div>
    <div className="pl-grid-3">
      <div className="pl-card">
        <div className="pl-card-head"><span className="pl-card-title">Recent Deliveries</span><span style={{ fontSize: 12, color: "var(--accent)", cursor: "pointer" }}>View all</span></div>
        <div className="pl-list">
          {recent.length === 0 ? <div className="pl-empty"><div className="pl-empty-ic"><I.mail /></div>No deliveries yet</div> :
            recent.map((d: any) => (
              <div key={d.id} className="pl-row-item">
                <div className="pl-row-icon" style={{ color: d.status === "DELIVERED" ? "var(--success)" : d.status === "FAILED" || d.status === "DEAD" ? "var(--danger)" : "var(--warning)" }}>{d.status === "DELIVERED" ? "✓" : "!"}</div>
                <div style={{ flex: 1, minWidth: 0 }}><div className="pl-row-title" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.destination_id.slice(0, 10)} · {d.status}</div><div className="pl-row-sub">{new Date(d.updated_at).toLocaleString()}</div></div>
                <StatusBadge status={d.status} />
              </div>
            ))}
        </div>
      </div>
      <div className="pl-card">
        <div className="pl-card-head"><span className="pl-card-title">Queue Health</span><span className="pl-pill" style={{ height: 22, padding: "0 8px", fontSize: 11 }}>{pending} pending</span></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { k: "Queued", v: q.queued, c: "#737373" },
            { k: "Processing", v: q.processing, c: "#A855F7" },
            { k: "Retrying", v: q.retrying, c: "var(--warning)" },
            { k: "Dead", v: q.dead, c: "var(--danger)" },
          ].map(r => (
            <div key={r.k}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}><span style={{ color: "var(--text-secondary)" }}>{r.k}</span><span style={{ fontWeight: 600 }}>{r.v}</span></div><div className="pl-progress"><div className="pl-progress-fill" style={{ width: `${Math.min(100, (r.v / Math.max(1, pending)) * 100)}%`, background: r.c }} /></div></div>
          ))}
        </div>
      </div>
      <div className="pl-card">
        <div className="pl-card-head"><span className="pl-card-title">Provider Health</span><span className="pl-pill" style={{ height: 22, fontSize: 11 }}>Live</span></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {conns.length === 0 ? <div className="pl-empty" style={{ fontSize: 12 }}>No providers connected.</div> :
            conns.slice(0, 4).map((c: any) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderRadius: 8, background: "transparent" }}>
                <div style={{ width: 8, height: 8, borderRadius: 99, background: c.status === "active" ? "var(--success)" : "var(--danger)" }} />
                <span style={{ fontSize: 13, flex: 1 }}>{c.name}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.status}</span>
              </div>
            ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}>{data.webhooks_received_today ? `${data.webhooks_received_today} webhook events today` : "No webhook traffic in the last 24h."}</div>
      </div>
    </div>
    <div className="pl-banner">
      <div><div className="pl-banner-title">{q.dead > 0 ? "Action required — dead letters detected" : "Portlane is operating normally."}</div><div className="pl-banner-sub">{q.dead > 0 ? `${q.dead} dead deliveries need attention.` : totalDone > 0 ? `${successRate} delivery success across ${totalDone.toLocaleString()} deliveries.` : "No deliveries recorded yet."}</div></div>
      <button className="pl-btn" style={{ background: "white", color: "#111", borderColor: "white" }}>View details</button>
    </div>
  </div>;
}
