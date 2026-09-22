import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import type { AppConfig } from "../config.js";
import { hashSecret } from "./crypto.js";
import type { RedisConnection } from "./redis-connection.js";

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export function signJwt(payload: object, config: AppConfig): string {
  return jwt.sign({ ...payload, jti: randomUUID() }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN as any });
}
export function verifyJwt(token: string, config: AppConfig): any {
  return jwt.verify(token, config.JWT_SECRET);
}

// Stateless logout: token hash denylist in Redis with TTL = remaining life.
// Cookie clear handles the browser; this handles stolen-token replay.
export function tokenDenylistKey(token: string): string {
  return `jwt:revoked:${hashSecret(token)}`;
}

export async function revokeJwt(token: string, redis?: RedisConnection | null): Promise<void> {
  if (!redis) return;
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    const ttlMs = decoded?.exp ? decoded.exp * 1000 - Date.now() : 7 * 86400 * 1000;
    if (ttlMs <= 0) return;
    await redis.set(tokenDenylistKey(token), "1", "PX", Math.min(ttlMs, 30 * 86400 * 1000));
  } catch { /* best-effort */ }
}

export async function isJwtRevoked(token: string, redis?: RedisConnection | null): Promise<boolean> {
  if (!redis) return false;
  try {
    return (await redis.get(tokenDenylistKey(token))) !== null;
  } catch {
    return false;
  }
}
