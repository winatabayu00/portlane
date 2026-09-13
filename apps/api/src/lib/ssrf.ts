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

async function assertSafeHost(host: string, label: string): Promise<void> {
  const h = host.toLowerCase();
  if (["localhost", "metadata.google.internal"].includes(h)) throw new Error(`Blocked target: ${label}`);
  // if host is literal IP, check directly
  if (isIP(h)) {
    if (isBlockedIp(h)) throw new Error(`Blocked private/loopback target: ${label}`);
    return;
  }
  // DNS resolve and check all addresses (best-effort; TOCTOU inherent to resolve-then-fetch)
  try {
    const addrs = await lookup(host, { all: true });
    for (const a of addrs) if (isBlockedIp(a.address)) throw new Error(`Blocked private target resolved: ${a.address}`);
  } catch (e: any) {
    if (e?.message?.startsWith("Blocked")) throw e;
    // if DNS fails, allow to fail later at fetch, but don't block
  }
}

export async function validateOutboundUrl(urlStr: string): Promise<void> {
  let url: URL;
  try { url = new URL(urlStr); } catch { throw new Error("Invalid URL"); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("URL must be http(s)");
  await assertSafeHost(url.hostname, url.hostname);
}

export async function readCapped(res: Response, maxBytes = 4096): Promise<string> {
  if (!res.body) return (await res.text().catch(() => "")).slice(0, maxBytes);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) { chunks.push(value); total += value.length; }
    if (total > maxBytes) break;
  }
  try { await reader.cancel(); } catch {}
  const buf = Buffer.concat(chunks).subarray(0, maxBytes);
  return buf.toString("utf8");
}

export async function validateSmtpHost(host: string): Promise<void> {
  if (!host || typeof host !== "string") throw new Error("SMTP host required");
  await assertSafeHost(host, host);
}

// ponytail: range + privileged-port block only; upgrade to full allowlist [25,465,587,2525,2587] when abuse observed.
const SMTP_PRIVILEGED_ALLOW = new Set([25, 465, 587]);
export function validateSmtpPort(port: unknown): void {
  const n = typeof port === "string" && port.trim() !== "" ? Number(port) : (port as number);
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 65535) throw new Error(`Invalid SMTP port: ${String(port)}`);
  if (n < 1024 && !SMTP_PRIVILEGED_ALLOW.has(n)) throw new Error(`SMTP port ${n} blocked (privileged non-mail port)`);
}
