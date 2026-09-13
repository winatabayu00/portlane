export function maskSecret(s: string): string {
  if (!s) return "***";
  if (s.length <= 8) return "***";
  return s.slice(0, 4) + "***" + s.slice(-4);
}
export function redactHeaders(h: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = { ...h };
  for (const k of Object.keys(out)) if (/auth|cookie|secret|token|password|signature|api[-_]?key|x-signature/i.test(k)) out[k] = "***";
  return out;
}
export function redactCredentials(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(redactCredentials);
  if (!obj || typeof obj !== "object") return obj;
  const o = obj as Record<string, unknown>;
  const copy: Record<string, unknown> = { ...o };
  for (const k of Object.keys(copy)) {
    if (/password|secret|token|credential|signature|auth|cookie|api[-_]?key|bottoken|webhookurl|private[-_]?key/i.test(k)) { copy[k] = "***"; continue; }
    copy[k] = redactCredentials(copy[k]);
  }
  return copy;
}
