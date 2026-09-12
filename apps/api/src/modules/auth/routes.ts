import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { dbPool } from "../../db.js";
import { id } from "../../lib/ids.js";
import { slugify } from "../../lib/slug.js";
import { signJwt, verifyJwt } from "../../lib/auth.js";
import { checkRateLimit } from "../../lib/rateLimit.js";
import type { AppConfig } from "../../config.js";
import { errorBody } from "../../errors.js";

export async function authRoutes(app: FastifyInstance, config: AppConfig) {
  const pool = dbPool(config);

  app.post("/api/v1/auth/register", async (req, reply) => {
    if (!checkRateLimit(`auth:register:${req.ip}`, 10, 60_000)) return reply.status(429).send(errorBody("RATE_LIMITED", "Too many requests.", String(req.id)));
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
    return reply.send({ data: { user: { id: userId, email, name: body.name }, tenant: { id: tenantId, slug }, token } });
  });

  app.post("/api/v1/auth/login", async (req, reply) => {
    if (!checkRateLimit(`auth:login:${req.ip}`, 10, 60_000)) return reply.status(429).send(errorBody("RATE_LIMITED", "Too many requests.", String(req.id)));
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    const email = body.email.toLowerCase().trim();
    const r = await pool.query("SELECT id,name,email,password_hash FROM users WHERE email=$1", [email]);
    if (!r.rows.length) return reply.status(401).send(errorBody("UNAUTHORIZED", "Invalid credentials.", String(req.id)));
    const u = r.rows[0];
    const ok = await bcrypt.compare(body.password, u.password_hash);
    if (!ok) return reply.status(401).send(errorBody("UNAUTHORIZED", "Invalid credentials.", String(req.id)));
    const token = signJwt({ userId: u.id, email: u.email }, config);
    return reply.send({ data: { token, user: { id: u.id, email: u.email, name: u.name } } });
  });

  app.get("/api/v1/auth/me", async (req, reply) => {
    const user = await requireJwtUser(req, reply, config);
    if (!user) return;
    const tenants = await pool.query("SELECT t.id,t.name,t.slug,t.status,t.created_at FROM tenants t JOIN tenant_memberships m ON m.tenant_id=t.id WHERE m.user_id=$1 ORDER BY t.created_at", [user.userId]);
    return reply.send({ data: { user: { id: user.userId, email: user.email }, tenants: tenants.rows } });
  });
}

export async function requireJwtUser(req: any, reply: any, config: AppConfig): Promise<{ userId: string; email: string } | null> {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) { reply.status(401).send(errorBody("UNAUTHORIZED", "Missing token.", String(req.id))); return null; }
  const token = h.slice(7);
  try {
    const p: any = verifyJwt(token, config);
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
