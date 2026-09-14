import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/api.js";
import { StatusBadge } from "../components/primitives.js";
import { I } from "../components/icons.js";

function hookUrl(base: string | null, ready: boolean, publicId: string) {
  return ready && base ? `${base}/hooks/${publicId}` : `/hooks/${publicId}`;
}

function eventLabel(status: string) {
  const s = (status ?? "received").toLowerCase();
  if (s === "received") return "Diterima";
  if (s === "forwarded") return "Diteruskan";
  if (s === "failed") return "Gagal";
  return status;
}

function attemptLabel(a: any) {
  if (a.status === "SUCCESS") return `Terkirim${a.response_status ? ` (${a.response_status})` : ""}`;
  return `Gagal${a.response_status ? ` (${a.response_status})` : ""}${a.error_message ? ` — ${a.error_message}` : ""}`;
}

function secLabel(r: any) {
  const mode = r.signature_mode === "hmac_sha256" ? "HMAC" : "Secret";
  return r.has_secret ? `${mode} ●` : "Tanpa kunci";
}

export default function Webhooks({ tenantId }: { tenantId: string }) {
  const [eps, setEps] = useState<any[]>([]); const [events, setEvents] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", forwarding_url: "", signature_mode: "none", secret: "" }); const [showCreate, setShowCreate] = useState(false); const [edit, setEdit] = useState<any | null>(null); const [editForm, setEditForm] = useState({ name: "", forwarding_url: "", status: "active", signature_mode: "none", secret: "" });
  const [oneTime, setOneTime] = useState<{ name: string; secret: string } | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null); const [eventAttempts, setEventAttempts] = useState<any[]>([]); const [msg, setMsg] = useState<string | null>(null);
  const [page, setPage] = useState(1); const [total, setTotal] = useState(0);
  const [ipFor, setIpFor] = useState<string | null>(null); const [ipList, setIpList] = useState<any[]>([]); const [ipForm, setIpForm] = useState({ cidr: "", description: "" });
  const [pub, setPub] = useState<{ public_base_url: string | null; ready: boolean } | null>(null);
  const [conns, setConns] = useState<any[]>([]);
  const [tgLinks, setTgLinks] = useState<any[]>([]);
  const [tgWire, setTgWire] = useState({ connectionId: "", endpointId: "", secret: "" }); const [tgMsg, setTgMsg] = useState<string | null>(null);
  const [tgInfo, setTgInfo] = useState<any | null>(null); const [tgChecking, setTgChecking] = useState(false);
  const wizardRef = useRef<HTMLDivElement>(null);
  const tgConns = conns.filter((c: any) => c.provider_key === "telegram");
  const epName = (id: string) => eps.find((x: any) => x.id === id)?.name ?? `${id.slice(0, 8)}…`;

  const reload = useCallback(() => {
    apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints`).then(j => setEps(j.data)).catch(() => { });
    apiFetch(`/api/v1/tenants/${tenantId}/provider-connections?provider_key=telegram`).then(j => setConns(j.data ?? [])).catch(() => { });
    apiFetch(`/api/v1/tenants/${tenantId}/telegram/webhook-links`).then(j => setTgLinks(j.data ?? [])).catch(() => { });
  }, [tenantId]);
  const reloadEvents = useCallback(() => {
    apiFetch(`/api/v1/tenants/${tenantId}/webhook-events?page=${page}&per_page=10`).then(j => { setEvents(j.data); setTotal(j.meta?.total ?? j.data.length); }).catch(() => { });
  }, [tenantId, page]);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { apiFetch(`/api/v1/tenants/${tenantId}/webhooks/public-status`).then(j => setPub(j.data)).catch(() => { }); }, [tenantId]);
  useEffect(() => { reloadEvents(); }, [reloadEvents]);

  async function create(e: React.FormEvent) { e.preventDefault(); try { const j = await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints`, { method: "POST", body: JSON.stringify({ name: form.name, forwarding_url: form.forwarding_url || undefined, signature_mode: form.signature_mode, ...(form.secret ? { secret: form.secret } : {}) }) }); const newId = (j as any)?.data?.id as string | undefined; const once = (j as any)?.data?._oneTimeSecret as string | undefined; if (once) setOneTime({ name: form.name, secret: once }); setForm({ name: "", forwarding_url: "", signature_mode: "none", secret: "" }); setShowCreate(false); if (newId) setTgWire(f => ({ ...f, endpointId: f.endpointId || newId })); reload(); } catch (er: any) { setMsg(er.message || er.code || "Unknown error"); } }
  async function remove(id: string) { if (!confirm("Hapus penerima ini? Pesan yang sudah masuk tetap tersimpan.")) return; await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints/${id}`, { method: "DELETE" }); reload(); }
  function openEdit(r: any) { setEdit(r); setEditForm({ name: r.name, forwarding_url: r.forwarding_config_json?.url ?? "", status: r.status, signature_mode: r.signature_mode ?? "none", secret: "" }); }
  async function saveEdit(e: React.FormEvent) { e.preventDefault(); if (!edit) return; try { const j = await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints/${edit.id}`, { method: "PATCH", body: JSON.stringify({ name: editForm.name, forwarding_url: editForm.forwarding_url || null, status: editForm.status, signature_mode: editForm.signature_mode, ...(editForm.secret ? { secret: editForm.secret } : {}) }) }); const once = (j as any)?.data?._oneTimeSecret as string | undefined; if (once) setOneTime({ name: editForm.name, secret: once }); setEdit(null); reload(); } catch (er: any) { setMsg(er.message || er.code || "Unknown error"); } }
  async function openEvent(ev: any) {
    const j = await apiFetch(`/api/v1/tenants/${tenantId}/webhook-events/${ev.id}`); setSelectedEvent(j.data.event); setEventAttempts(j.data.attempts);
  }
  async function retry(evId: string) { try { const j = await apiFetch(`/api/v1/tenants/${tenantId}/webhook-events/${evId}/retry`, { method: "POST" }); setMsg(`Kirim ulang: ${j.data?.status ?? "ok"}`); reloadEvents(); } catch (e: any) { setMsg(e.message || e.code || "Unknown error"); } }
  async function testForward(endpointId: string) { setTesting(endpointId); setMsg(null); try { const j = await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints/${endpointId}/test-forward`, { method: "POST", body: JSON.stringify({}) }); setMsg(j.data?.ok ? `Tes terkirim (test, ${j.data?.statusCode ?? ""}). Cek di aplikasi Anda lalu abaikan flag test.` : `Tes gagal (${j.data?.statusCode ?? "?"}) — cek URL penerusan.`); } catch (e: any) { setMsg(e.message || e.code || "Unknown error"); } finally { setTesting(null); } }
  async function loadIp(endpointId: string) { setIpFor(endpointId); const j = await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints/${endpointId}/ip-allowlist`); setIpList(j.data); }
  async function addIp(e: React.FormEvent) { e.preventDefault(); if (!ipFor) return; await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints/${ipFor}/ip-allowlist`, { method: "POST", body: JSON.stringify(ipForm) }); setIpForm({ cidr: "", description: "" }); loadIp(ipFor); }
  async function delIp(entryId: string) { if (!ipFor) return; await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints/${ipFor}/ip-allowlist/${entryId}`, { method: "DELETE" }); loadIp(ipFor); }

  function genSecret() { const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"; let s = ""; const a = new Uint32Array(32); crypto.getRandomValues(a); for (const n of a) s += chars[n % 64]; setTgWire(f => ({ ...f, secret: s })); }
  function focusWizard(endpointId: string) { setTgWire(f => ({ ...f, endpointId })); setTgMsg(null); wizardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  async function tgSet(e: React.FormEvent) {
    e.preventDefault(); setTgMsg(null); setTgInfo(null);
    try {
      const j = await apiFetch(`/api/v1/tenants/${tenantId}/telegram/set-webhook`, { method: "POST", body: JSON.stringify({ connectionId: tgWire.connectionId, endpointId: tgWire.endpointId, ...(tgWire.secret ? { secret: tgWire.secret } : {}) }) });
      setTgMsg(`Berhasil! Pesan dari bot sekarang masuk lewat ${j.data?.url ?? "URL penerima"}.`);
      setTgWire(f => ({ ...f, secret: "" })); reload(); reloadEvents();
    } catch (er: any) { setTgMsg(er.message || er.code || "Unknown error"); }
  }
  async function tgCheck() {
    setTgMsg(null);
    if (!tgWire.connectionId) { setTgMsg("Pilih dulu bot Telegram-nya."); return; }
    setTgChecking(true);
    try { const j = await apiFetch(`/api/v1/tenants/${tenantId}/telegram/webhook-info?connectionId=${encodeURIComponent(tgWire.connectionId)}`); setTgInfo(j.data); }
    catch (er: any) { setTgMsg(er.message || er.code || "Unknown error"); }
    finally { setTgChecking(false); }
  }
  async function tgDelete() { if (!tgWire.connectionId) { setTgMsg("Pilih dulu bot Telegram-nya."); return; } if (!confirm("Putuskan bot ini dari Portlane? Bot tidak akan lagi mengirim pesan ke sini.")) return; try { await apiFetch(`/api/v1/tenants/${tenantId}/telegram/delete-webhook`, { method: "POST", body: JSON.stringify({ connectionId: tgWire.connectionId }) }); setTgMsg("Bot diputus. Tidak ada pesan yang akan masuk sampai disambungkan lagi."); setTgInfo(null); reload(); } catch (er: any) { setTgMsg(er.message || er.code || "Unknown error"); } }

  const selectedEp = eps.find((x: any) => x.id === tgWire.endpointId);
  const expectedUrl = selectedEp ? hookUrl(pub?.public_base_url ?? null, !!pub?.ready, selectedEp.public_identifier) : null;
  const actualUrl = (tgInfo?.url as string | undefined) || null;
  const match = expectedUrl && actualUrl ? actualUrl === expectedUrl : null;

  return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div><h2 style={{ margin: 0, fontSize: 18 }}>Webhooks</h2><p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>Terima pesan dari Telegram atau layanan lain, lalu teruskan ke aplikasi Anda.</p></div>
    {msg && <div style={{ fontSize: 12, padding: "8px 12px", borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)" }}>{msg}</div>}
    {oneTime && <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "var(--warning-soft, rgba(245,158,11,0.08))", border: "1px solid rgba(245,158,11,0.3)", fontSize: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}><strong>Kunci “{oneTime.name}” (sekali tampil):</strong> <span className="pl-mono" style={{ wordBreak: "break-all" }}>{oneTime.secret}</span><div style={{ color: "var(--text-muted)", marginTop: 4 }}>Salin sekarang — tutup banner ini dan kunci tidak bisa dilihat lagi.</div></div>
      <button className="pl-btn pl-btn-secondary pl-btn-sm" onClick={() => navigator.clipboard.writeText(oneTime.secret)}><I.copy /> Salin</button>
      <button className="pl-icon-btn" onClick={() => setOneTime(null)}><I.x /></button>
    </div>}
    {pub && (pub.ready ? (
      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "var(--success-soft, rgba(34,197,94,0.08))", border: "1px solid rgba(34,197,94,0.25)", fontSize: 13 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--success, #22C55E)", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}><strong>Siap menerima pesan.</strong> <span style={{ color: "var(--text-secondary)" }}>Telegram & layanan lain bisa menghubungi </span><span className="pl-mono" style={{ fontSize: 12 }}>{pub.public_base_url}</span></div>
        <button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => pub.public_base_url && navigator.clipboard.writeText(pub.public_base_url)}><I.copy /> Salin</button>
      </div>
    ) : (
      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "var(--warning-soft, rgba(245,158,11,0.08))", border: "1px solid rgba(245,158,11,0.3)", fontSize: 13 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--warning, #F59E0B)", flexShrink: 0 }} />
        <div><strong>Belum bisa dihubungi dari internet.</strong> <span style={{ color: "var(--text-secondary)" }}>Minta admin mengisi <span className="pl-mono" style={{ fontSize: 12 }}>PORTLANE_PUBLIC_BASE_URL</span> (domain/tunnel) supaya Telegram bisa mengirim pesan ke sini.</span></div>
      </div>
    ))}

    <div className="pl-card" ref={wizardRef} style={{ display: "flex", flexDirection: "column", gap: 12, scrollMarginTop: 12 }}>
      <div><div style={{ fontWeight: 600, fontSize: 14 }}>Sambungkan bot Telegram</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>3 langkah: pilih bot → pilih alamat penerima → aktifkan. Satu alamat bisa dipakai banyak bot.</div></div>
      <div style={{ display: "flex", gap: 8, fontSize: 12 }}>
        {[1, 2, 3].map(n => {
          const done = n === 1 ? !!tgWire.connectionId : n === 2 ? !!tgWire.endpointId : match === true;
          const active = n === 1 ? !tgWire.connectionId : n === 2 ? !!tgWire.connectionId && !tgWire.endpointId : !!tgWire.endpointId && match !== true;
          return <div key={n} style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: done ? "var(--success-soft, rgba(34,197,94,0.08))" : active ? "var(--bg-input)" : "transparent" }}>
            <span style={{ width: 22, height: 22, borderRadius: 999, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, background: done ? "var(--success, #22C55E)" : "var(--bg-input)", color: done ? "white" : "var(--text-muted)", border: "1px solid var(--border)", flexShrink: 0 }}>{done ? "✓" : n}</span>
            <span style={{ color: done ? "var(--text-primary)" : "var(--text-secondary)" }}>{n === 1 ? "Pilih bot" : n === 2 ? "Pilih penerima" : "Aktifkan"}</span>
          </div>;
        })}
      </div>
      {tgMsg && <div style={{ fontSize: 12, padding: "8px 12px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", wordBreak: "break-all" }}>{tgMsg}</div>}
      <form onSubmit={tgSet} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><label className="pl-label">1. Bot Telegram mana?</label><select className="pl-select" value={tgWire.connectionId} onChange={e => { setTgWire({ ...tgWire, connectionId: e.target.value }); setTgInfo(null); }} required><option value="">— Pilih bot —</option>{tgConns.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          {tgConns.length === 0 && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Belum ada bot. Tambahkan dulu di halaman Providers → Telegram.</div>}</div>
        <div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><label className="pl-label">2. Diterima di alamat mana?</label>{eps.length > 0 && <button type="button" className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => setShowCreate(true)}><I.plus /> Baru</button>}</div>
          {eps.length === 0 ? (
            <div style={{ padding: 12, borderRadius: 8, background: "var(--bg-input)", border: "1px dashed var(--border)", fontSize: 12, display: "flex", flexDirection: "column", gap: 8 }}><span>Belum ada alamat penerima. Buat dulu supaya dapat URL publik.</span><span><button type="button" className="pl-btn pl-btn-primary pl-btn-sm" onClick={() => setShowCreate(true)}><I.plus /> Buat penerima</button></span></div>
          ) : (
            <select className="pl-select" value={tgWire.endpointId} onChange={e => { setTgWire({ ...tgWire, endpointId: e.target.value }); setTgInfo(null); }} required><option value="">— Pilih penerima —</option>{eps.map((x: any) => <option key={x.id} value={x.id}>{x.name} · {hookUrl(pub?.public_base_url ?? null, !!pub?.ready, x.public_identifier)}</option>)}</select>
          )}</div>
        <div><label className="pl-label">Kata sandi tambahan (opsional — kosongkan saja bila ragu)</label>
          <div style={{ display: "flex", gap: 8 }}><input className="pl-input pl-mono" value={tgWire.secret} onChange={e => setTgWire({ ...tgWire, secret: e.target.value })} placeholder="huruf, angka, - dan _" pattern="[A-Za-z0-9_-]{1,256}" style={{ flex: 1 }} /><button type="button" className="pl-btn pl-btn-secondary pl-btn-sm" onClick={genSecret}>Acak</button></div></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="submit" className="pl-btn pl-btn-primary pl-btn-sm" disabled={!tgWire.connectionId || !tgWire.endpointId}>3. Aktifkan</button><button type="button" className="pl-btn pl-btn-secondary pl-btn-sm" onClick={tgCheck} disabled={!tgWire.connectionId || tgChecking}>{tgChecking ? "Mengecek…" : "Cek status"}</button><button type="button" className="pl-btn pl-btn-ghost pl-btn-sm" style={{ color: "var(--danger)" }} onClick={tgDelete}>Putuskan bot</button></div>
      </form>
      {tgInfo && <div style={{ fontSize: 12, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-input)", display: "flex", flexDirection: "column", gap: 6 }}>
        {match === true && <div><strong style={{ color: "var(--success, #22C55E)" }}>● Terhubung.</strong> Pesan dari bot ini masuk lewat <span className="pl-mono" style={{ fontSize: 11 }}>{expectedUrl}</span>.</div>}
        {match === false && <div><strong style={{ color: "var(--danger, #EF4444)" }}>● Mengarah ke tempat lain.</strong> Bot ini sedang mengirim ke <span className="pl-mono" style={{ fontSize: 11, wordBreak: "break-all" }}>{actualUrl}</span>, bukan ke penerima yang dipilih. Klik <strong>Aktifkan</strong> untuk memindahkan ke sini.</div>}
        {match === null && !actualUrl && <div><strong>● Belum terhubung.</strong> Bot ini belum mengirim pesan ke mana pun. Klik <strong>Aktifkan</strong>.</div>}
        {match === null && actualUrl && <div><strong>Status bot:</strong> mengirim ke <span className="pl-mono" style={{ fontSize: 11, wordBreak: "break-all" }}>{actualUrl}</span>.</div>}
        {(tgInfo.pending_update_count ?? 0) > 0 && <div style={{ color: "var(--warning, #F59E0B)" }}>{tgInfo.pending_update_count} pesan menumpuk di Telegram dan belum diambil.</div>}
        {tgInfo.last_error_message && <div style={{ color: "var(--danger, #EF4444)" }}>Error terakhir dari Telegram: {tgInfo.last_error_message}</div>}
        <details><summary style={{ cursor: "pointer", color: "var(--text-muted)" }}>Detail teknis</summary><pre className="pl-mono" style={{ fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-all", margin: "8px 0 0" }}>{JSON.stringify(tgInfo, null, 2)}</pre></details>
      </div>}
    </div>

    {tgLinks.length > 0 && <div className="pl-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", fontWeight: 600, fontSize: 13 }}>Bot yang sudah terhubung</div>
      <table className="pl-table"><thead><tr><th>Bot</th><th>Penerima</th><th>Terakhir diaktifkan</th></tr></thead><tbody>{tgLinks.map((l: any) => <tr key={l.id}><td style={{ fontWeight: 500 }}>{l.connection_name}</td><td style={{ fontSize: 12 }}>{l.endpoint_name}</td><td style={{ fontSize: 11, color: "var(--text-muted)" }}>{l.last_set_at ? new Date(l.last_set_at).toLocaleString() : "-"}</td></tr>)}</tbody></table>
    </div>}

    <div className="pl-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontWeight: 600, fontSize: 13 }}>Alamat penerima</span><button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => setShowCreate(true)}><I.plus /> Baru</button></div>
      {eps.length === 0 ? <div className="pl-empty"><div className="pl-empty-ic"><I.webhook /></div>Belum ada penerima. Buat satu untuk mendapatkan URL publik.</div> :
        <table className="pl-table"><thead><tr><th>Nama</th><th>URL publik</th><th>Diteruskan ke</th><th>Kunci</th><th>Status</th><th /></tr></thead><tbody>{eps.map((r: any) => <tr key={r.id}><td style={{ fontWeight: 500 }}>{r.name}</td><td className="pl-mono" style={{ fontSize: 11 }}>{hookUrl(pub?.public_base_url ?? null, !!pub?.ready, r.public_identifier)} <button onClick={() => navigator.clipboard.writeText(hookUrl(pub?.public_base_url ?? null, !!pub?.ready, r.public_identifier))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }} title="Salin URL"><I.copy /></button></td><td className="pl-mono" style={{ fontSize: 11 }}>{r.forwarding_config_json?.url ?? <span style={{ color: "var(--text-muted)" }}>hanya disimpan</span>}</td><td style={{ fontSize: 11, color: r.has_secret ? "var(--text-primary)" : "var(--text-muted)" }}>{secLabel(r)}</td><td><StatusBadge status={r.status === "active" ? "Aktif" : r.status} /></td><td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => focusWizard(r.id)}>Sambungkan bot</button><button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => openEdit(r)}>Ubah</button>{r.forwarding_config_json?.url && <button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => testForward(r.id)} disabled={testing === r.id}>{testing === r.id ? "Mengirim…" : "Tes"}</button>}<button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => loadIp(r.id)}>IP</button><button className="pl-btn pl-btn-ghost pl-btn-sm" style={{ color: "var(--danger)" }} onClick={() => remove(r.id)}><I.trash /></button></td></tr>)}</tbody></table>}
    </div>

    <div className="pl-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", fontWeight: 600, fontSize: 13 }}>Pesan masuk</div>
      {events.length === 0 ? <div className="pl-empty">Belum ada pesan. Kirim sesuatu ke salah satu URL publik di atas.</div> :
        <div>
          <table className="pl-table"><thead><tr><th>Waktu</th><th>Penerima</th><th>Status</th><th /></tr></thead><tbody>{events.map((e: any) => <tr key={e.id} style={{ cursor: "pointer" }} onClick={() => openEvent(e)}><td style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(e.created_at ?? e.received_at).toLocaleString()}</td><td style={{ fontSize: 12 }}>{epName(e.webhook_endpoint_id)}</td><td><StatusBadge status={eventLabel(e.status ?? "received")} /></td><td><button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={ev => { ev.stopPropagation(); retry(e.id); }}>Kirim ulang</button></td></tr>)}</tbody></table>
          <div style={{ display: "flex", gap: 8, padding: "10px 16px", justifyContent: "flex-end", borderTop: "1px solid var(--border)" }}>
            <button className="pl-btn pl-btn-ghost pl-btn-sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Sebelumnya</button>
            <span style={{ fontSize: 12, color: "var(--text-muted)", alignSelf: "center" }}>hal {page} · {total} total</span>
            <button className="pl-btn pl-btn-ghost pl-btn-sm" disabled={events.length < 10} onClick={() => setPage(p => p + 1)}>Berikutnya</button>
          </div>
        </div>
      }
    </div>

    {edit && (
      <div className="pl-overlay" onClick={() => setEdit(null)}>
        <div className="pl-modal" onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><h3 style={{ margin: 0, fontSize: 15 }}>Ubah penerima</h3><button className="pl-icon-btn" onClick={() => setEdit(null)}><I.x /></button></div>
          <form onSubmit={saveEdit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label className="pl-label">Nama</label><input className="pl-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required /></div>
            <div><label className="pl-label">Teruskan pesan ke aplikasi saya (opsional)</label><input className="pl-input" value={editForm.forwarding_url} onChange={e => setEditForm({ ...editForm, forwarding_url: e.target.value })} placeholder="https://..." /><div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Dikosongkan = pesan hanya disimpan dan bisa dilihat di bawah.</div></div>
            <div><label className="pl-label">Mode kunci</label><select className="pl-select" value={editForm.signature_mode} onChange={e => setEditForm({ ...editForm, signature_mode: e.target.value })}><option value="none">Secret biasa (header x-webhook-secret)</option><option value="hmac_sha256">HMAC-SHA256 (header x-webhook-signature)</option></select></div>
            <div><label className="pl-label">Ganti kunci (opsional — kosongkan = tetap pakai yang lama)</label>
              <div style={{ display: "flex", gap: 8 }}><input className="pl-input pl-mono" value={editForm.secret} onChange={e => setEditForm({ ...editForm, secret: e.target.value })} placeholder="kunci baru…" style={{ flex: 1 }} /><button type="button" className="pl-btn pl-btn-secondary pl-btn-sm" onClick={() => { const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"; let s = ""; const a = new Uint32Array(32); crypto.getRandomValues(a); for (const n of a) s += chars[n % 64]; setEditForm(f => ({ ...f, secret: s })); }}>Acak</button></div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Kunci lama langsung diganti. Nilai baru hanya tampil sekali setelah disimpan.</div></div>
            <div><label className="pl-label">Status</label><select className="pl-select" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}><option value="active">Aktif</option><option value="disabled">Nonaktif</option></select></div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button type="button" className="pl-btn pl-btn-ghost" onClick={() => setEdit(null)}>Batal</button><button type="submit" className="pl-btn pl-btn-primary">Simpan</button></div>
          </form>
        </div>
      </div>
    )}
    {selectedEvent && (
      <div className="pl-drawer">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}><strong>Pesan {selectedEvent.id.slice(0, 8)}</strong><button className="pl-icon-btn" onClick={() => setSelectedEvent(null)}><I.x /></button></div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 4 }}>
            <div>ID permintaan: <span className="pl-mono" style={{ fontSize: 11 }}>{selectedEvent.request_id ?? "-"}</span></div>
            <div>Diterima {new Date(selectedEvent.received_at ?? selectedEvent.created_at).toLocaleString()} · dari {selectedEvent.source_ip ?? "-"} · {selectedEvent.method ?? "POST"}</div>
            <div>Status: {eventLabel(selectedEvent.status ?? "received")}</div>
          </div>
          {selectedEvent.safe_headers_json && Object.keys(selectedEvent.safe_headers_json).length > 0 && <div><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Header aman</div>
            <div className="pl-mono" style={{ fontSize: 11, background: "var(--bg-input)", padding: 10, borderRadius: 8, border: "1px solid var(--border)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{JSON.stringify(selectedEvent.safe_headers_json, null, 2)}</div></div>}
          <div><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Isi pesan</div>
            <div className="pl-mono" style={{ fontSize: 11, background: "var(--bg-input)", padding: 10, borderRadius: 8, border: "1px solid var(--border)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{JSON.stringify(selectedEvent.payload_json, null, 2)}</div></div>
          <div style={{ fontSize: 12 }}><strong>Riwayat penerusan</strong>{eventAttempts.length === 0 ? <div style={{ color: "var(--text-muted)", marginTop: 6 }}>Belum diteruskan ke mana pun.</div> : eventAttempts.map((a: any, i: number) => <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--border-subtle)", fontSize: 12 }}>{attemptLabel(a)} <span style={{ color: "var(--text-muted)" }}>{new Date(a.created_at).toLocaleString()}</span></div>)}</div>
          <button className="pl-btn pl-btn-primary" onClick={() => retry(selectedEvent.id)}>Kirim ulang ke aplikasi saya</button>
        </div>
      </div>
    )}
    {showCreate && (
      <div className="pl-overlay" onClick={() => setShowCreate(false)}>
        <div className="pl-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><h3 style={{ margin: 0, fontSize: 15 }}>Buat penerima baru</h3><button className="pl-icon-btn" onClick={() => setShowCreate(false)}><I.x /></button></div>
          <form onSubmit={create} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label className="pl-label">Nama penerima</label><input className="pl-input" placeholder="mis. bot-toko" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
            <div><label className="pl-label">Teruskan pesan ke aplikasi saya (opsional)</label><input className="pl-input" placeholder="https://..." value={form.forwarding_url} onChange={e => setForm({ ...form, forwarding_url: e.target.value })} /><div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Bisa diisi nanti. Dikosongkan = pesan hanya disimpan.</div></div>
            <div><label className="pl-label">Mode kunci</label><select className="pl-select" value={form.signature_mode} onChange={e => setForm({ ...form, signature_mode: e.target.value })}><option value="none">Secret biasa (header x-webhook-secret)</option><option value="hmac_sha256">HMAC-SHA256 (header x-webhook-signature)</option></select></div>
            <div><label className="pl-label">Kunci (opsional — kosongkan = tanpa kunci)</label>
              <div style={{ display: "flex", gap: 8 }}><input className="pl-input pl-mono" value={form.secret} onChange={e => setForm({ ...form, secret: e.target.value })} placeholder="kunci rahasia…" style={{ flex: 1 }} /><button type="button" className="pl-btn pl-btn-secondary pl-btn-sm" onClick={() => { const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"; let s = ""; const a = new Uint32Array(32); crypto.getRandomValues(a); for (const n of a) s += chars[n % 64]; setForm(f => ({ ...f, secret: s })); }}>Acak</button></div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Hanya tampil sekali setelah dibuat — salin langsung.</div></div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button type="button" className="pl-btn pl-btn-ghost" onClick={() => setShowCreate(false)}>Batal</button><button className="pl-btn pl-btn-primary" type="submit"><I.plus /> Buat</button></div>
          </form>
        </div>
      </div>
    )}
    {ipFor && (
      <div className="pl-overlay" onClick={() => setIpFor(null)}>
        <div className="pl-modal" onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><h3 style={{ margin: 0, fontSize: 15 }}>Batasi IP pengirim</h3><button className="pl-icon-btn" onClick={() => setIpFor(null)}><I.x /></button></div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>Opsional. Dikosongkan = semua IP boleh mengirim ke alamat ini.</div>
          <form onSubmit={addIp} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input className="pl-input" placeholder="1.2.3.4/32" value={ipForm.cidr} onChange={e => setIpForm({ ...ipForm, cidr: e.target.value })} required style={{ flex: 1 }} />
            <input className="pl-input" placeholder="keterangan" value={ipForm.description} onChange={e => setIpForm({ ...ipForm, description: e.target.value })} style={{ flex: 1 }} />
            <button className="pl-btn pl-btn-primary" type="submit">Tambah</button>
          </form>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{ipList.length === 0 ? <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Belum ada batasan — semua IP boleh masuk.</div> : ipList.map((r: any) => <div key={r.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8 }}><span className="pl-mono" style={{ fontSize: 12, flex: 1 }}>{r.cidr}</span><span style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.description ?? ""}</span><button className="pl-btn pl-btn-ghost pl-btn-sm" style={{ color: "var(--danger)" }} onClick={() => delIp(r.id)}><I.trash /></button></div>)}</div>
        </div>
      </div>
    )}
  </div>;
}
