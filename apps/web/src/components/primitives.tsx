// Portlane shared UI primitives (DESIGN.md §50).
// Extracted verbatim from App.tsx so pages share one implementation:
// StatusBadge, Spark, Skeleton, qs. No page-specific styling here.
export function Spark({ color = "var(--accent)", values }: { color?: string; values: number[] }) {
  if (!values?.length) return null;
  const w = 100, h = 32, max = Math.max(...values, 1), min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * (h - 6) - 3}`).join(" ");
  return <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="32" preserveAspectRatio="none"><polyline fill="none" stroke={color} strokeWidth="1.8" points={pts} strokeLinejoin="round" strokeLinecap="round" /><polyline fill={color} opacity="0.08" points={`${pts} ${w},${h} 0,${h}`} /></svg>;
}

export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const map: Record<string, string> = { delivered: "delivered", failed: "failed", dead: "failed", retrying: "queued", queued: "queued", processing: "processing", connected: "connected", active: "delivered", healthy: "delivered", degraded: "queued", disabled: "failed", revoked: "failed" };
  const k = map[s] ?? "queued";
  const dot: Record<string, string> = { delivered: "var(--success)", failed: "var(--danger)", queued: "var(--warning)", processing: "#A855F7", connected: "var(--success)" };
  return <span className={`pl-status pl-status-${k}`}><span className="pl-status-dot" style={{ background: dot[k] ?? "#737373" }} />{status}</span>;
}

export function Skeleton({ h = 16 }: { h?: number }) { return <div className="pl-skeleton" style={{ height: h }} />; }

export function qs(p: Record<string, string | undefined>) { const u = new URLSearchParams(); for (const [k, v] of Object.entries(p)) if (v) u.set(k, v); const s = u.toString(); return s ? `?${s}` : ""; }
