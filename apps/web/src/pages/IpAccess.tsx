import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api.js";
import { StatusBadge, Skeleton } from "../components/primitives.js";

export default function IpAccess({ tenantId }: { tenantId: string }) {
  const [rows, setRows] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [keys, eps] = await Promise.all([
        apiFetch(`/api/v1/tenants/${tenantId}/api-keys`).then(j => j.data).catch(() => []),
        apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints`).then(j => j.data).catch(() => []),
      ]);
      const out: any[] = [];
      for (const k of keys) {
        try { const j = await apiFetch(`/api/v1/tenants/${tenantId}/api-keys/${k.id}/ip-allowlist`); for (const e of j.data) out.push({ ...e, scope_label: `API Key: ${k.name}`, scope_type: "API_KEY" }); } catch { /* ignore IP allowlist fetch errors */ }
      }
      for (const ep of eps) {
        try { const j = await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints/${ep.id}/ip-allowlist`); for (const e of j.data) out.push({ ...e, scope_label: `Webhook: ${ep.name}`, scope_type: "WEBHOOK_ENDPOINT" }); } catch { /* ignore IP allowlist fetch errors */ }
      }
      setRows(out);
    } finally { setLoading(false); }
  }, [tenantId]);
  useEffect(() => { reload(); }, [reload]);
  if (loading) return <div><Skeleton h={120} /></div>;
  return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}><div><h2 style={{ margin: 0, fontSize: 18 }}>IP Access</h2><p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>Allowlist per API key / webhook endpoint. Manage from API Keys or Webhooks.</p></div>
    <div className="pl-card" style={{ padding: 0, overflow: "hidden" }}><table className="pl-table"><thead><tr><th>IP / CIDR</th><th>Scope</th><th>Description</th><th>Status</th></tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={4}><div className="pl-empty" style={{ fontSize: 12 }}>No IP rules yet. Add from API Keys → IP Allowlist or Webhooks → IP.</div></td></tr> : rows.map((r: any) => <tr key={r.id}><td className="pl-mono">{r.cidr}</td><td>{r.scope_label}</td><td style={{ color: "var(--text-muted)" }}>{r.description ?? "-"}</td><td><StatusBadge status={r.enabled === false ? "Disabled" : "Active"} /></td></tr>)}</tbody></table></div>
    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Monospace for network values — configure via API or the per-resource panels.</div>
  </div>;
}
