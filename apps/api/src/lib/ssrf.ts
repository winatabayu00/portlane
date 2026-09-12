import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_RANGES = [
  "127.0.0.0/8",
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "169.254.0.0/16",
  "0.0.0.0/8",
  "::1/128",
  "fe80::/10",
  "fc00::/7",
  "ff00::/8",
];

import ipaddr from "ipaddr.js";

function isBlockedIp(ip: string): boolean {
  try {
    const addr = ipaddr.parse(ip);
    for (const cidr of BLOCKED_RANGES) {
      const [range, bits] = ipaddr.parseCIDR(cidr);
      if (addr.kind() === range.kind() && (addr as any).match([range, bits])) return true;
    }
    // metadata service 169.254.169.254 explicitly
    if (ip === "169.254.169.254") return true;
  } catch { /* ignore */ }
  return false;
}

export async function validateOutboundUrl(urlStr: string): Promise<void> {
  let url: URL;
  try { url = new URL(urlStr); } catch { throw new Error("Invalid URL"); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("URL must be http(s)");
  const host = url.hostname;
  if (["localhost", "metadata.google.internal"].includes(host)) throw new Error("Blocked target");
  // if host is literal IP, check directly
  if (isIP(host)) {
    if (isBlockedIp(host)) throw new Error(`Blocked private/loopback target: ${host}`);
    return;
  }
  // DNS resolve and check all addresses
  try {
    const addrs = await lookup(host, { all: true });
    for (const a of addrs) if (isBlockedIp(a.address)) throw new Error(`Blocked private target resolved: ${a.address}`);
  } catch (e: any) {
    if (e?.message?.startsWith("Blocked")) throw e;
    // if DNS fails, allow to fail later at fetch, but don't block
  }
}

export function isSafeRedirect(urlStr: string): boolean {
  try { const u = new URL(urlStr); return ["http:", "https:"].includes(u.protocol) && !isBlockedIp(u.hostname); } catch { return false; }
}
