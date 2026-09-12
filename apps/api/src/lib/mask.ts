export function maskSecret(s: string): string {
  if (!s) return "***";
  if (s.length <= 8) return "***";
  return s.slice(0, 4) + "***" + s.slice(-4);
}
export function redactHeaders(h: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = { ...h };
  for (const k of Object.keys(out)) if (/auth|cookie|secret|token|password/i.test(k)) out[k] = "***";
  return out;
}
export function redactCredentials(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  const o = obj as Record<string, unknown>;
  const copy: Record<string, unknown> = { ...o };
  for (const k of Object.keys(copy)) if (/password|secret|token|credential/i.test(k)) copy[k] = "***";
  return copy;
}
