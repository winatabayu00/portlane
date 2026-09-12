import crypto from "node:crypto";

function keyBuf(hexOrB64: string): Buffer {
  const s = hexOrB64.trim();
  if (/^[0-9a-fA-F]{64}$/.test(s)) return Buffer.from(s, "hex");
  // try base64 32 bytes
  try {
    const b = Buffer.from(s, "base64");
    if (b.length === 32) return b;
  } catch {}
  // fallback: sha256 of string (dev only)
  return crypto.createHash("sha256").update(s).digest();
}

// AES-256-GCM authenticated encryption
export function encrypt(plaintext: string, keyHex: string): string {
  const key = keyBuf(keyHex);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

export function decrypt(ciphertext: string, keyHex: string): string {
  const key = keyBuf(keyHex);
  const [ivB64, tagB64, encB64] = ciphertext.split(".");
  if (!ivB64 || !tagB64 || !encB64) throw new Error("Invalid ciphertext");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const enc = Buffer.from(encB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

export function hashSecret(secret: string): string {
  // SHA256 hash for API key secret (fast + safe with high-entropy secret). ponytail: upgrade to bcrypt/argon if low-entropy.
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function randomSecret(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}
