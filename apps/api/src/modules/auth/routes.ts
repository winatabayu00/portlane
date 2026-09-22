import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { dbPool } from "../../db.js";
import { id } from "../../lib/ids.js";
import { slugify } from "../../lib/slug.js";
import { isJwtRevoked, revokeJwt, signJwt, verifyJwt } from "../../lib/auth.js";
import { checkRateLimit } from "../../lib/rateLimit.js";
import { redisClient } from "../../redis.js";
import type { AppConfig } from "../../config.js";
import { errorBody } from "../../errors.js";
import { success } from "../../common/api-response.js";
import { ResponseCode } from "../../common/response-code.enum.js";

export const SESSION_COOKIE = "pl_token";
// Same-origin write guard for cookie sessions: browser top-level navigation
// sends Sec-Fetch-Site; cross-site POST without it is rejected. Machine
// Bearer calls skip this (no cookie). No extra dep (§54).

function expiresInSeconds(v: string): number {
  const m = /^(\d+)\s*([smhd])?$/.exec(v.trim());
  if (!m) return 604800; // default 7d, sama seperti JWT_EXPIRES_IN
  const n = parseInt(m[1], 10);
  const mult = m[2] === "s" ? 1 : m[2] === "m" ? 60 : m[2] === "h" ? 3600 : 86400;
  return n * mult;
}

// Dashboard session via HttpOnly cookie (§19/§20: token tidak lagi harus
// menyentuh JS/localStorage sehingga XSS tidak langsung mencuri sesi).
// Authorization Bearer tetap didukung untuk kompatibilitas + API clients.
export function setSessionCookie(reply: any, token: string, config: AppConfig): void {
  const parts = [`${SESSION_COOKIE}=${encodeURIComponent(token)}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${expiresInSeconds(config.JWT_EXPIRES_IN)}`];
  // Secure hanya bila COOKIE_SECURE (auto: true di production). HTTP polos +
  // Secure = browser membuang cookie sehingga sesi tak menempel; set
  // COOKIE_SECURE=false hanya untuk akses HTTP di jaringan privat (tailscale).
  if (config.COOKIE_SECURE) parts.push("Secure");
  reply.header("Set-Cookie", parts.join("; "));
}

export function clearSessionCookie(reply: any): void {
  reply.header("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

// Manual cookie parse — tanpa dep baru (§54): hanya ambil satu nilai,
// JWT-nya sendiri sudah signed jadi tidak butuh signed-cookie machinery.
export function getSessionToken(req: any): string | null {
  const h = req.headers?.authorization;
  if (typeof h === "string" && h.startsWith("Bearer ")) return h.slice(7);
  const cookie = req.headers?.cookie;
  if (typeof cookie === "string") {
    for (const part of cookie.split(";")) {
      const i = part.indexOf("=");
      if (i > 0 && part.slice(0, i).trim() === SESSION_COOKIE) {
        const v = part.slice(i + 1).trim();
        if (v) { try { return decodeURIComponent(v); } catch { return v; } }
      }
    }
  }
  return null;
}

export async function authRoutes(app: FastifyInstance, config: AppConfig) {
  const pool = dbPool(config);

  app.post("/api/v1/auth/register", async (req, reply) => {
    if (!(await checkRateLimit(`auth:register:${req.ip}`, 10, 60_000, redisClient(config), { strict: true }))) return reply.status(429).send(errorBody("RATE_LIMITED", "Too many requests.", String(req.id)));
    const body = z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(6) }).parse(req.body);
    const email = body.email.toLowerCase().trim();
    const exists = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    if (exists.rows.length) return reply.status(409).send(errorBody("CONFLICT", "Email already registered.", String(req.id)));
    const hash = await bcrypt.hash(body.password, 10);
    const userId = id("usr");
    await pool.query("INSERT INTO users (id,name,email,password_hash) VALUES ($1,$2,$3,$4)", [userId, body.name, email, hash]);
    // auto create personal tenant
    const tenantId = id("ten");
    const slug = slugify(body.name) + "-" + tenantId.slice(-6);
    await pool.query("INSERT INTO tenants (id,name,slug) VALUES ($1,$2,$3)", [tenantId, `${body.name}'s workspace`, slug]);
    await pool.query("INSERT INTO tenant_memberships (id,tenant_id,user_id,role) VALUES ($1,$2,$3,$4)", [id("mem"), tenantId, userId, "OWNER"]);
    const token = signJwt({ userId, email }, config);
    setSessionCookie(reply, token, config);
    // Cookie-only session (§19/§20): token never touches JS response body,
    // so reflected/stored XSS cannot steal it via API output.
    return reply.send(success({ user: { id: userId, email, name: body.name }, tenant: { id: tenantId, slug } }, String(req.id), ResponseCode.CREATED));
  });

  app.post("/api/v1/auth/login", async (req, reply) => {
    if (!(await checkRateLimit(`auth:login:${req.ip}`, 10, 60_000, redisClient(config), { strict: true }))) return reply.status(429).send(errorBody("RATE_LIMITED", "Too many requests.", String(req.id)));
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    const email = body.email.toLowerCase().trim();
    const r = await pool.query("SELECT id,name,email,password_hash FROM users WHERE email=$1", [email]);
    if (!r.rows.length) return reply.status(401).send(errorBody("UNAUTHORIZED", "Invalid credentials.", String(req.id)));
    const u = r.rows[0];
    const ok = await bcrypt.compare(body.password, u.password_hash);
    if (!ok) return reply.status(401).send(errorBody("UNAUTHORIZED", "Invalid credentials.", String(req.id)));
    const token = signJwt({ userId: u.id, email: u.email }, config);
    setSessionCookie(reply, token, config);
    return reply.send(success({ user: { id: u.id, email: u.email, name: u.name } }, String(req.id)));
  });

  // Logout: clear cookie + denylist token (stateless logout fix). Frontend
  // also drops its session hint; remaining cookie-less token replay fails
  // via Redis denylist until natural expiry.
  app.post("/api/v1/auth/logout", async (req, reply) => {
    const token = getSessionToken(req);
    if (token) await revokeJwt(token, redisClient(config));
    clearSessionCookie(reply);
    return reply.send(success({ logged_out: true }, String(req.id)));
  });

  app.get("/api/v1/auth/me", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config);
    if (!user) return;
    const tenants = await pool.query("SELECT t.id,t.name,t.slug,t.status,t.created_at FROM tenants t JOIN tenant_memberships m ON m.tenant_id=t.id WHERE m.user_id=$1 ORDER BY t.created_at", [user.userId]);
    const u = await pool.query("SELECT name FROM users WHERE id=$1", [user.userId]);
    return reply.send(success({ user: { id: user.userId, email: user.email, name: u.rows[0]?.name ?? null }, tenants: tenants.rows }, String(req.id)));
  });
}

export async function requireJwtUser(req: any, reply: any, config: AppConfig): Promise<{ userId: string; email: string } | null> {
  const token = getSessionToken(req);
  if (!token) { reply.status(401).send(errorBody("UNAUTHORIZED", "Missing token.", String(req.id))); return null; }
  try {
    const p: any = verifyJwt(token, config);
    if (await isJwtRevoked(token, redisClient(config))) {
      reply.status(401).send(errorBody("UNAUTHORIZED", "Session revoked.", String(req.id)));
      return null;
    }
    // CSRF guard for cookie sessions: cross-site writes must present either
    // an explicit Bearer token (machine/API client) or a same-origin fetch
    // marker browsers attach automatically. SameSite=Lax covers top-level
    // navigation; this covers fetch/XHR from evil origins carrying cookies.
    const isCookieSession = !String(req.headers?.authorization ?? "").startsWith("Bearer ");
    if (isCookieSession && ["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
      const site = String(req.headers?.["sec-fetch-site"] ?? "");
      const requestedWith = String(req.headers?.["x-requested-with"] ?? "");
      const origin = String(req.headers?.origin ?? "");
      const base = (config.PORTLANE_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
      const originOk = !origin || !base || origin === base;
      const markerOk = site === "same-origin" || requestedWith === "XMLHttpRequest" || (!site && originOk);
      if (!markerOk) {
        reply.status(403).send(errorBody("FORBIDDEN", "Cross-site request rejected.", String(req.id)));
        return null;
      }
    }
    return { userId: p.userId ?? p.sub, email: p.email };
  } catch {
    reply.status(401).send(errorBody("UNAUTHORIZED", "Invalid token.", String(req.id)));
    return null;
  }
}

export async function requireTenantMember(pool: any, userId: string, tenantId: string, reply: any, req: any): Promise<boolean> {
  const r = await pool.query("SELECT role FROM tenant_memberships WHERE tenant_id=$1 AND user_id=$2", [tenantId, userId]);
  if (!r.rows.length) { reply.status(403).send(errorBody("FORBIDDEN", "Not a member of tenant.", String(req.id))); return false; }
  return true;
}
