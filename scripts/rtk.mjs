#!/usr/bin/env node
// rtk — Portlane runtime toolkit (lazy, stdlib only)
// usage: yarn rtk <cmd>
// No Docker. Infra Postgres+Redis di minisever via Tailscale.
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, openSync, closeSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawn, spawnSync, execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PID_DIR = join(ROOT, ".rtk", "pids");
const LOG_DIR = join(ROOT, ".rtk", "logs");

const C = { dim: "\x1b[2m", cyan: "\x1b[36m", green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m", reset: "\x1b[0m" };
const log = (m) => console.log(m);
const ok = (m) => console.log(`${C.green}✓${C.reset} ${m}`);
const warn = (m) => console.log(`${C.yellow}!${C.reset} ${m}`);
const err = (m) => console.log(`${C.red}✗${C.reset} ${m}`);
const info = (m) => console.log(`${C.cyan}›${C.reset} ${m}`);

function loadDotEnv() {
  const f = join(ROOT, ".env");
  if (!existsSync(f)) return {};
  const env = {};
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}
function getPort() { return loadDotEnv().APP_PORT || process.env.APP_PORT || "4002"; }
function resolveDatabaseUrl(env) {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  const host = env.DB_HOST || ""; if (!host) return "";
  const user = env.DB_USERNAME || env.DB_USER || "postgres";
  const pass = env.DB_PASSWORD || ""; const port = env.DB_PORT || "5432";
  const db = env.DB_DATABASE || env.DB_NAME || "portlane";
  const encUser = encodeURIComponent(user);
  return pass ? `postgresql://${encUser}:${encodeURIComponent(pass)}@${host}:${port}/${db}` : `postgresql://${encUser}@${host}:${port}/${db}`;
}
function ensureDirs() { mkdirSync(PID_DIR, { recursive: true }); mkdirSync(LOG_DIR, { recursive: true }); }
function pidFile(name) { return join(PID_DIR, `${name}.pid`); }
function logFile(name) { return join(LOG_DIR, `${name}.log`); }
function isRunning(pid) { try { process.kill(pid, 0); return true; } catch { return false; } }
function readPid(name) {
  const f = pidFile(name); if (!existsSync(f)) return null;
  const pid = Number(readFileSync(f, "utf8").trim()); return Number.isFinite(pid) ? pid : null;
}
function killPid(name) {
  const pid = readPid(name); if (!pid) return false;
  if (!isRunning(pid)) { rmSync(pidFile(name), { force: true }); return false; }
  // detached bg → pgid == pid, kill group biar subtree (yarn→tsx) ikut mati
  try { process.kill(-pid, "SIGTERM"); } catch { try { process.kill(pid, "SIGTERM"); } catch {} }
  const start = Date.now();
  while (Date.now() - start < 3000 && isRunning(pid)) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  if (isRunning(pid)) { try { process.kill(-pid, "SIGKILL"); } catch { try { process.kill(pid, "SIGKILL"); } catch {} } }
  rmSync(pidFile(name), { force: true }); return true;
}
// sync spawn helpers
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit", ...opts });
  return r.status === 0;
}
function runCapture(cmd, args) {
  try { return execSync([cmd, ...args].join(" "), { cwd: ROOT, encoding: "utf8", stdio: "pipe" }); } catch (e) { return e.stdout?.toString() ?? e.message; }
}

function printHelp() {
  log(`
${C.cyan}rtk${C.reset} — Portlane toolkit  ${C.dim}(tanpa Docker, infra via Tailscale)${C.reset}
  ${C.dim}API 4002 | Web 3002 | DB portlane (isolated, bukan ai_engineering_os)${C.reset}

${C.green}Setup & Build${C.reset}
  yarn rtk setup              buat .env jika belum (template kosong) + generate APP_ENCRYPTION_KEY, yarn install
  yarn rtk install            yarn install
  yarn rtk build              yarn build (api + web)
  yarn rtk check              lint + typecheck + test
  yarn rtk clean              hapus .rtk, dist, node_modules/.cache

${C.green}Run${C.reset}
  yarn rtk dev                dev: api 4002 + worker + web 3002 (Vite HMR proxy ke API) — log .rtk/logs/
  yarn rtk start              alias dev (tanpa build) — api 4002 + worker + web 3002
  yarn rtk build              yarn build (api + web) — tanpa start
  yarn rtk prod               prod: build lalu single-port 4002 (serve dist) + worker
  yarn rtk start:prod         alias prod
  yarn rtk stop               hentikan semua proses rtk
  yarn rtk restart            stop + start/prod (deteksi mode jalan)
  yarn rtk status             cek PID + curl :4002/health /ready
  yarn rtk logs [svc] [-f]    svc: api|worker|web|all (default all), -f follow
  yarn rtk health             curl :4002/health
  yarn rtk ready              curl :4002/ready

${C.green}DB (isolated: portlane)${C.reset}
  yarn rtk db:migrate         jalankan migrasi (apps/api/migrations/*.sql)
  yarn rtk db:create          buat database portlane jika belum ada
  yarn rtk db:status          tampilkan schema_migrations
  yarn rtk db:reset           ${C.red}HAPUS SEMUA TABEL${C.reset} lalu migrate ulang (butuh --yes)
  yarn rtk db:shell           psql via DATABASE_URL (butuh psql terinstal)

${C.green}Contoh cepat${C.reset}
  yarn rtk setup && yarn rtk db:migrate && yarn rtk start  # dev (start = dev, tanpa build)
  yarn rtk build && yarn rtk prod && yarn rtk status       # prod: build + single-port

Env: .env (DATABASE_URL prioritas 1, fallback DB_* → rakit URL; APP_PORT=4002, REDIS_URL, APP_ENCRYPTION_KEY)
Logs: .rtk/logs/   PIDs: .rtk/pids/
  DB JANGAN pakai ai_engineering_os — Portlane pakai 'portlane' terpisah.
`);
}

// ---- commands ----
async function cmdSetup() {
  const env = join(ROOT, ".env");
  if (!existsSync(env)) {
    const tmpl = `# Portlane env — prod secrets, gitignore. Jangan commit .env
# Minta kredensial minisever ke owner (Tailscale IP + DB/Redis creds)
APP_ENV=development
APP_PORT=4002
LOG_LEVEL=info
REQUEST_ID_HEADER=x-request-id
TRUSTED_PROXIES=
DB_CONNECTION=pgsql
DB_HOST=YOUR_TAILSCALE_IP
DB_PORT=5432
DB_DATABASE=portlane
DB_USERNAME=YOUR_DB_USER
DB_PASSWORD=YOUR_DB_PASSWORD
DB_SCHEMA=public
DATABASE_URL=postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@YOUR_TAILSCALE_IP:5432/portlane
REDIS_URL=redis://YOUR_TAILSCALE_IP:6379
APP_ENCRYPTION_KEY=
WEB_DIST_DIR=
JWT_SECRET=
JWT_EXPIRES_IN=7d
`;
    writeFileSync(env, tmpl); ok(".env dibuat dari template internal → isi DATABASE_URL / REDIS_URL");
  } else ok(".env sudah ada");

  // generate APP_ENCRYPTION_KEY + JWT_SECRET jika kosong (prod wajib beda)
  if (existsSync(env)) {
    let txt = readFileSync(env, "utf8");
    if (/^APP_ENCRYPTION_KEY=\s*$/m.test(txt)) {
      const key = execSync("openssl rand -hex 32", { encoding: "utf8" }).trim();
      txt = txt.replace(/^APP_ENCRYPTION_KEY=.*$/m, `APP_ENCRYPTION_KEY=${key}`);
      writeFileSync(env, txt); ok(`APP_ENCRYPTION_KEY digenerate`);
    }
    if (/^JWT_SECRET=\s*$/m.test(txt)) {
      const key = execSync("openssl rand -hex 32", { encoding: "utf8" }).trim();
      txt = txt.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${key}`);
      writeFileSync(env, txt); ok(`JWT_SECRET digenerate`);
    }
  }
  info("yarn install..."); run("yarn", ["install"]);
  ok("setup selesai → isi DATABASE_URL & REDIS_URL di .env lalu: yarn rtk db:migrate && yarn rtk dev");
}

async function cmdDev() {
  ensureDirs();
  const env = loadDotEnv();
  const dbUrl = resolveDatabaseUrl(env) || process.env.DATABASE_URL || "";
  if (!dbUrl) warn("DATABASE_URL/DB_* kosong di .env — /ready akan 503");
  else if (dbUrl.includes("/ai_engineering_os")) warn("DATABASE_URL menunjuk ai_engineering_os — ganti ke /portlane (isolated)");
  if (!env.REDIS_URL && !process.env.REDIS_URL) warn("REDIS_URL kosong di .env — queue akan 503");
  // merge .env ke child env (fix: sebelumnya hanya process.env → DATABASE_URL Required)
  const mergedEnv = { ...env, ...process.env, FORCE_COLOR: "1" };
  if (!mergedEnv.DATABASE_URL) {
    const built = resolveDatabaseUrl({ ...env, ...process.env });
    if (built) mergedEnv.DATABASE_URL = built;
  }
  for (const s of ["api", "worker", "web"]) killPid(s);
  function bg(name, cmd, args) {
    const fd = openSync(logFile(name), "w");
    const child = spawn(cmd, args, { cwd: ROOT, detached: true, stdio: ["ignore", fd, fd], env: mergedEnv });
    child.unref();
    closeSync(fd);
    writeFileSync(pidFile(name), String(child.pid));
    ok(`${name} pid ${child.pid} → ${logFile(name)}`);
  }
  bg("api", "yarn", ["workspace", "@portlane/api", "dev"]);
  bg("worker", "yarn", ["workspace", "@portlane/api", "dev:worker"]);
  bg("web", "yarn", ["workspace", "@portlane/web", "dev"]);
  const port = getPort();
  log(`\n${C.green}dev jalan${C.reset} → api http://localhost:${port}  web http://localhost:3002  logs: yarn rtk logs -f\n`);
  log(`${C.dim}API 4002 ← Web 3002 proxy /api /health /ready ke API${C.reset}\n`);
}

async function cmdStart() {
  ensureDirs();
  const env = loadDotEnv();
  const dbUrl = resolveDatabaseUrl(env) || process.env.DATABASE_URL || "";
  if (!dbUrl || !env.REDIS_URL) warn("DATABASE_URL/REDIS_URL kosong — cek .env (DB portlane isolated)");
  if (dbUrl.includes("/ai_engineering_os")) { err("DATABASE_URL jangan pakai ai_engineering_os — ganti ke /portlane"); process.exit(1); }
  info("build..."); if (!run("yarn", ["build"])) { err("build gagal"); process.exit(1); }
  for (const s of ["api", "worker", "web"]) killPid(s);
  const mergedEnv = { ...env, ...process.env };
  if (!mergedEnv.DATABASE_URL) {
    const built = resolveDatabaseUrl({ ...env, ...process.env });
    if (built) mergedEnv.DATABASE_URL = built;
  }
  function bg(name, cmd, args) {
    const fd = openSync(logFile(name), "w");
    const child = spawn(cmd, args, { cwd: ROOT, detached: true, stdio: ["ignore", fd, fd], env: mergedEnv });
    child.unref();
    closeSync(fd);
    writeFileSync(pidFile(name), String(child.pid));
    ok(`${name} pid ${child.pid} → ${logFile(name)}`);
  }
  bg("api", "node", ["apps/api/dist/index.js"]);
  bg("worker", "node", ["apps/api/dist/worker.js"]);
  const port = getPort();
  log(`\n${C.green}prod jalan (single-port)${C.reset} → http://localhost:${port}/  /health  /ready\n  logs: yarn rtk logs -f   stop: yarn rtk stop\n`);
}

function cmdStop() {
  let n = 0; for (const s of ["api", "worker", "web"]) if (killPid(s)) { ok(`stop ${s}`); n++; }
  if (n === 0) warn("tidak ada proses rtk yang jalan");
  else ok("semua proses rtk dihentikan");
}

async function cmdStatus() {
  const port = getPort();
  for (const s of ["api", "worker", "web"]) {
    const pid = readPid(s); const alive = pid ? isRunning(pid) : false;
    log(`  ${alive ? C.green + "●" : C.dim + "○"}${C.reset} ${s.padEnd(7)} ${pid ? `pid ${String(pid).padEnd(7)}` : "(no pid)".padEnd(11)} ${alive ? C.green + "running" : C.dim + "stopped"}${C.reset}  log: .rtk/logs/${s}.log`);
  }
  for (const ep of ["health", "ready"]) {
    try {
      const j = execSync(`curl -s http://localhost:${port}/${ep} || echo "__FAIL__"`, { encoding: "utf8", timeout: 3000 }).trim();
      if (j === "__FAIL__" || !j) err(`${ep}: no response (api belum jalan?)`);
      else log(`  ${C.cyan}GET /${ep}${C.reset} → ${j.slice(0, 400)}`);
    } catch (e) { err(`${ep}: ${e.message}`); }
  }
}

async function cmdLogs(args) {
  const svc = args.find((a) => ["api", "worker", "web", "all"].includes(a)) || "all";
  const follow = args.includes("-f") || args.includes("--follow");
  const svcs = svc === "all" ? ["api", "worker", "web"] : [svc];
  for (const s of svcs) {
    const f = logFile(s); log(`\n${C.cyan}== ${s} → ${f} ==${C.reset}`);
    if (!existsSync(f)) { warn("(belum ada log)"); continue; }
    if (follow) {
      spawn("tail", ["-F", f], { stdio: "inherit" });
      return; // follow first only
    } else {
      const txt = readFileSync(f, "utf8").slice(-8000); process.stdout.write(txt + (txt.endsWith("\n") ? "" : "\n"));
    }
  }
  if (!follow) log(`\n${C.dim}tip: yarn rtk logs -f  untuk follow${C.reset}`);
}

async function cmdDbMigrate() {
  const env = loadDotEnv(); const url = resolveDatabaseUrl(env) || process.env.DATABASE_URL || "";
  if (url.includes("/ai_engineering_os")) { err("DATABASE_URL jangan pakai ai_engineering_os — ganti ke /portlane"); process.exit(1); }
  info(`migrate → ${url.replace(/:[^@]+@/, ":***@")}`);
  const ok_ = run("yarn", ["workspace", "@portlane/api", "migrate"], { env: { ...process.env, DATABASE_URL: url || process.env.DATABASE_URL } });
  if (!ok_) process.exit(1);
}
async function cmdDbCreate() {
  const env = loadDotEnv(); let url = resolveDatabaseUrl(env) || process.env.DATABASE_URL || "";
  if (!url) { err("DATABASE_URL/DB_* kosong — isi .env dulu"); process.exit(1); }
  if (url.includes("/ai_engineering_os")) { err("DATABASE_URL jangan pakai ai_engineering_os"); process.exit(1); }
  const u = new URL(url); const dbName = u.pathname.replace(/^\//, "") || "portlane";
  u.pathname = "/postgres";
  const adminUrl = u.toString();
  info(`db:create → ${dbName} @ ${u.host}`);
  const code = `
import pg from 'pg';
const target = process.env.TARGET_DB;
const pool = new pg.Pool({ connectionString: process.env.ADMIN_URL, connectionTimeoutMillis: 5000 });
const c = await pool.connect();
try {
  const r = await c.query('SELECT 1 FROM pg_database WHERE datname=$1', [target]);
  if (r.rows.length) console.log('db sudah ada:', target);
  else { await c.query('CREATE DATABASE ' + '"' + target.replace(/"/g,'""') + '"'); console.log('db dibuat:', target); }
} finally { c.release(); await pool.end(); }
`;
  const r = spawnSync("node", ["--input-type=module", "-e", code], { cwd: ROOT, stdio: "inherit", env: { ...process.env, ADMIN_URL: adminUrl, TARGET_DB: dbName } });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
async function cmdDbStatus() {
  const env = loadDotEnv(); const url = resolveDatabaseUrl(env) || process.env.DATABASE_URL || "";
  if (!url) { err("DATABASE_URL kosong di .env"); process.exit(1); }
  if (url.includes("/ai_engineering_os")) { err("DATABASE_URL jangan pakai ai_engineering_os — ganti ke /portlane"); process.exit(1); }
  const sql = `SELECT version, applied_at FROM schema_migrations ORDER BY version; SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;`;
  // inline node pg query tanpa tambah dep (pakai pg dari api)
  const code = `
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
try {
  const c = await pool.connect();
  try {
    const m = await c.query('SELECT version, applied_at FROM schema_migrations ORDER BY version').catch(()=>({rows:[]}));
    console.log('schema_migrations:'); for(const r of m.rows) console.log(' ', r.version, r.applied_at?.toISOString?.() ?? r.applied_at);
    if(!m.rows.length) console.log('  (kosong — belum migrate)');
    const t = await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    console.log('\\ntables:'); for(const r of t.rows) console.log(' ', r.tablename);
  } finally { c.release(); await pool.end(); }
} catch(e){ console.error('DB error:', e.message); process.exit(1); }
`;
  const r = spawnSync("node", ["--input-type=module", "-e", code], { cwd: ROOT, stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
async function cmdDbReset(args) {
  if (!args.includes("--yes")) { err("butuh --yes  →  yarn rtk db:reset --yes   (hapus semua tabel!)"); process.exit(1); }
  const env = loadDotEnv(); const url = resolveDatabaseUrl(env) || process.env.DATABASE_URL || "";
  if (!url) { err("DATABASE_URL kosong"); process.exit(1); }
  if (url.includes("/ai_engineering_os")) { err("DATABASE_URL jangan pakai ai_engineering_os — ganti ke /portlane"); process.exit(1); }
  warn("RESET DB: drop semua tabel...");
  const code = `
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();
try {
  await c.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  console.log('schema public di-reset');
} finally { c.release(); await pool.end(); }
`;
  let r = spawnSync("node", ["--input-type=module", "-e", code], { cwd: ROOT, stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
  if (r.status !== 0) process.exit(r.status ?? 1);
  await cmdDbMigrate();
}
async function cmdDbShell() {
  const env = loadDotEnv(); const url = resolveDatabaseUrl(env) || process.env.DATABASE_URL || "";
  if (!url) { err("DATABASE_URL kosong"); process.exit(1); }
  if (url.includes("/ai_engineering_os")) { err("DATABASE_URL jangan pakai ai_engineering_os"); process.exit(1); }
  spawnSync("psql", [url], { cwd: ROOT, stdio: "inherit" });
}

const cmd = process.argv[2];
const rest = process.argv.slice(3);

switch (cmd) {
  case undefined: case "help": case "--help": case "-h": printHelp(); break;
  case "setup": await cmdSetup(); break;
  case "install": run("yarn", ["install"]); break;
  case "build": run("yarn", ["build"]); break;
  case "check": run("yarn", ["lint"]) && run("yarn", ["typecheck"]) && run("yarn", ["workspaces", "run", "test"]); break;
  case "clean": rmSync(join(ROOT, ".rtk"), { recursive: true, force: true }); rmSync(join(ROOT, "apps/api/dist"), { recursive: true, force: true }); rmSync(join(ROOT, "apps/web/dist"), { recursive: true, force: true }); ok("clean selesai"); break;
  case "dev": case "start": case "start:dev": await cmdDev(); break;
  case "prod": case "start:prod": await cmdStart(); break;
  case "stop": cmdStop(); break;
  case "restart": {
    const isDev = readPid("web") && isRunning(readPid("web"));
    cmdStop(); await new Promise((r) => setTimeout(r, 800));
    if (isDev) await cmdDev(); else await cmdStart(); break;
  }
  case "status": await cmdStatus(); break;
  case "logs": await cmdLogs(rest); break;
  case "health": execSync(`curl -s http://localhost:${getPort()}/health | cat`, { stdio: "inherit" }); break;
  case "ready": execSync(`curl -s http://localhost:${getPort()}/ready | cat`, { stdio: "inherit" }); break;
  case "migrate": case "db:migrate": await cmdDbMigrate(); break;
  case "db:create": await cmdDbCreate(); break;
  case "db:status": await cmdDbStatus(); break;
  case "db:reset": await cmdDbReset(rest); break;
  case "db:shell": await cmdDbShell(); break;
  default: err(`unknown: ${cmd}`); printHelp(); process.exit(1);
}
