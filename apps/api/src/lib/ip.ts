import ipaddr from "ipaddr.js";

export function isIpAllowed(clientIp: string, cidrs: string[]): boolean {
  if (cidrs.length === 0) return true;
  let addr: ipaddr.IPv4 | ipaddr.IPv6;
  try { addr = ipaddr.parse(clientIp) as any; } catch { return false; }
  for (const cidr of cidrs) {
    try {
      if (cidr.includes("/")) {
        const [range, bits] = ipaddr.parseCIDR(cidr);
        if (addr.kind() === range.kind() && (addr as any).match([range, bits])) return true;
      } else {
        const r = ipaddr.parse(cidr) as any;
        if (addr.kind() === r.kind() && addr.toString() === r.toString()) return true;
      }
    } catch { /* ignore parse fail */ }
  }
  return false;
}

export function parseCidrOrThrow(cidr: string): string {
  const v = cidr.trim();
  if (!v) throw new Error("cidr required");
  try {
    if (v.includes("/")) { ipaddr.parseCIDR(v); return v; }
    const p = ipaddr.parse(v);
    return p.toString();
  } catch { throw new Error(`Invalid CIDR/IP: ${v}`); }
}
