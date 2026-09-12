import { useEffect, useState } from "react";
import { NavLink, Route, Routes, useNavigate, useRouteError } from "react-router-dom";
import { apiFetch, getTenantId, getToken, setTenantId, setToken } from "./lib/api.js";
import "./styles/tokens.css";

const NAV = ["Overview", "Providers", "Destinations", "Messages", "Webhooks", "Logs", "Settings"] as const;
type Theme = "system" | "light" | "dark";
function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("pl-theme") as Theme | null) ?? "system");
  useEffect(()=>{ localStorage.setItem("pl-theme", theme); if(theme==="system") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", theme); },[theme]);
  return [theme, setTheme];
}
export function RouteError(){ const err=useRouteError(); return <div className="pl-card"><h2>Something went wrong</h2><p className="pl-muted">{err instanceof Error?err.message:"Unknown error."}</p></div>; }

function useTenantId(){ const [tid,setTid]=useState<string|null>(()=>getTenantId()); useEffect(()=>{ const h=()=>setTid(getTenantId()); window.addEventListener("storage",h); return()=>window.removeEventListener("storage",h); },[]); return tid; }

function LoginGate({ onAuth }:{ onAuth:()=>void }){
  const [mode,setMode]=useState<"login"|"register">("login");
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [name,setName]=useState(""); const [err,setErr]=useState<string|null>(null); const [loading,setLoading]=useState(false);
  async function submit(e:React.FormEvent){ e.preventDefault(); setErr(null); setLoading(true);
    try{
      const path = mode==="login" ? "/api/v1/auth/login" : "/api/v1/auth/register";
      const body = mode==="login" ? { email, password } : { email, password, name };
      const json = await apiFetch(path, { method:"POST", body: JSON.stringify(body) });
      setToken(json.data.token);
      if(json.data.tenant?.id) setTenantId(json.data.tenant.id);
      // fetch me to pick tenant if not set
      if(!json.data.tenant?.id){
        try{ const me=await apiFetch("/api/v1/auth/me"); if(me.data.tenants?.[0]) setTenantId(me.data.tenants[0].id);}catch{/* ignore */}
      }
      onAuth();
    }catch(e:any){ setErr(e.message);} finally{ setLoading(false); }
  }
  return <div className="pl-card" style={{maxWidth:420, margin:"40px auto"}}><h2>{mode==="login"?"Sign in":"Create account"}</h2><form onSubmit={submit} className="pl-col" style={{display:"flex",flexDirection:"column",gap:12}}>
    {mode==="register" && <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} required />}
    <input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
    <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
    {err && <div className="pl-error">{err}</div>}
    <button type="submit" disabled={loading}>{loading?"...":mode==="login"?"Sign in":"Create & sign in"}</button>
    <button type="button" onClick={()=>setMode(mode==="login"?"register":"login")} style={{background:"transparent", border:"none", color:"var(--pl-muted)", cursor:"pointer"}}>{mode==="login"?"Need account? Register":"Have account? Sign in"}</button>
  </form></div>;
}

function Overview({ tenantId }:{ tenantId:string }){
  const [data,setData]=useState<any>(null); const [err,setErr]=useState<string|null>(null);
  useEffect(()=>{ apiFetch(`/api/v1/tenants/${tenantId}/overview`).then(j=>setData(j.data)).catch(e=>setErr(e.message)); },[tenantId]);
  if(err) return <div className="pl-error">{err}</div>;
  if(!data) return <div className="pl-muted">Loading...</div>;
  return <div style={{display:"grid",gap:16}}>
    <h2>Overview</h2>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
      <Stat label="Today messages" value={data.messages_today} />
      <Stat label="Delivered" value={data.delivered} />
      <Stat label="Failed" value={data.failed} />
      <Stat label="Queued" value={data.queued} />
      <Stat label="Providers" value={data.active_providers} />
      <Stat label="Webhooks today" value={data.webhooks_received_today} />
    </div>
    {data.recent_failures?.length>0 && <div className="pl-card"><h3>Recent failures</h3><pre style={{fontSize:12,overflow:"auto"}}>{JSON.stringify(data.recent_failures,null,2)}</pre></div>}
  </div>;
}
function Stat({label,value}:{label:string;value:number}){ return <div className="pl-card"><div className="pl-muted" style={{fontSize:12}}>{label}</div><div style={{fontSize:22,fontWeight:700}}>{value}</div></div>; }

function Providers({ tenantId }:{ tenantId:string }){
  const [list,setList]=useState<any[]>([]); const [loading,setL]=useState(true); const [msg,setMsg]=useState<string|null>(null);
  const [form,setForm]=useState({ provider_key:"telegram", name:"", botToken:"", webhookUrl:"", host:"", port:"", senderEmail:"", url:"" });
  const reload=()=> apiFetch(`/api/v1/tenants/${tenantId}/provider-connections`).then(j=>setList(j.data)).finally(()=>setL(false));
  useEffect(()=>{ reload(); },[tenantId]);
  async function create(e:React.FormEvent){ e.preventDefault(); setMsg(null);
    let creds:Record<string,unknown>={}; let cfg:Record<string,unknown>={};
    if(form.provider_key==="telegram") creds={ botToken: form.botToken };
    if(form.provider_key==="discord") creds={ webhookUrl: form.webhookUrl };
    if(form.provider_key==="smtp") creds={ host:form.host, port:form.port, senderEmail:form.senderEmail };
    if(form.provider_key==="webhook") cfg={ url: form.url };
    try{ await apiFetch(`/api/v1/tenants/${tenantId}/provider-connections`,{ method:"POST", body: JSON.stringify({ provider_key: form.provider_key, name: form.name, config: cfg, credentials: creds })}); setMsg("Created"); reload(); }catch(e:any){ setMsg(e.message); }
  }
  async function test(id:string){ try{ const j=await apiFetch(`/api/v1/tenants/${tenantId}/provider-connections/${id}/test`,{method:"POST"}); setMsg(JSON.stringify(j.data)); }catch(e:any){ setMsg(e.message); } }
  if(loading) return <div className="pl-muted">Loading...</div>;
  return <div style={{display:"grid",gap:16}}><h2>Providers</h2>
    <form onSubmit={create} className="pl-card" style={{display:"flex",flexDirection:"column",gap:8}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <select value={form.provider_key} onChange={e=>setForm({...form,provider_key:e.target.value})}><option value="telegram">telegram</option><option value="discord">discord</option><option value="smtp">smtp</option><option value="webhook">webhook</option></select>
        <input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
      </div>
      {form.provider_key==="telegram" && <input placeholder="botToken" value={form.botToken} onChange={e=>setForm({...form,botToken:e.target.value})} required />}
      {form.provider_key==="discord" && <input placeholder="webhookUrl" value={form.webhookUrl} onChange={e=>setForm({...form,webhookUrl:e.target.value})} required />}
      {form.provider_key==="smtp" && <><input placeholder="host" value={form.host} onChange={e=>setForm({...form,host:e.target.value})}/><input placeholder="port" value={form.port} onChange={e=>setForm({...form,port:e.target.value})}/><input placeholder="senderEmail" value={form.senderEmail} onChange={e=>setForm({...form,senderEmail:e.target.value})}/></>}
      {form.provider_key==="webhook" && <input placeholder="https://target.url/hook" value={form.url} onChange={e=>setForm({...form,url:e.target.value})} required />}
      <button type="submit">Create connection</button>
      {msg && <div className="pl-muted" style={{fontSize:12,wordBreak:"break-all"}}>{msg}</div>}
    </form>
    <div className="pl-card"><h3>Connections ({list.length})</h3>{list.length===0?<p className="pl-muted">Empty — add one above.</p>:<table style={{width:"100%",fontSize:13}}><thead><tr><th>Name</th><th>Provider</th><th>Status</th><th></th></tr></thead><tbody>{list.map((r:any)=><tr key={r.id}><td>{r.name}</td><td>{r.provider_key}</td><td>{r.status}</td><td><button onClick={()=>test(r.id)}>Test</button></td></tr>)}</tbody></table>}</div>
  </div>;
}

function Destinations({ tenantId }:{ tenantId:string }){
  const [list,setList]=useState<any[]>([]); const [conns,setConns]=useState<any[]>([]);
  const [form,setForm]=useState({ provider_connection_id:"", name:"", chat_id:"", email:"" });
  const reload=()=> apiFetch(`/api/v1/tenants/${tenantId}/destinations`).then(j=>setList(j.data));
  useEffect(()=>{ reload(); apiFetch(`/api/v1/tenants/${tenantId}/provider-connections`).then(j=>setConns(j.data)).catch(()=>{}); },[tenantId]);
  async function create(e:React.FormEvent){ e.preventDefault();
    const cfg:Record<string,unknown>={}; if(form.chat_id) cfg.chat_id=form.chat_id; if(form.email) cfg.email=form.email;
    await apiFetch(`/api/v1/tenants/${tenantId}/destinations`,{ method:"POST", body: JSON.stringify({ provider_connection_id: form.provider_connection_id, name: form.name, config: cfg })}); reload();
  }
  return <div style={{display:"grid",gap:16}}><h2>Destinations</h2>
    <form onSubmit={create} className="pl-card" style={{display:"flex",flexDirection:"column",gap:8}}>
      <select value={form.provider_connection_id} onChange={e=>setForm({...form,provider_connection_id:e.target.value})} required><option value="">-- provider connection --</option>{conns.map((c:any)=><option key={c.id} value={c.id}>{c.name} ({c.provider_key})</option>)}</select>
      <input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
      <input placeholder="chat_id (telegram) or email (smtp)" value={form.chat_id || form.email} onChange={e=>setForm({...form,chat_id:e.target.value, email:e.target.value})} />
      <button type="submit">Create</button>
    </form>
    <div className="pl-card"><h3>List ({list.length})</h3>{list.length===0?<p className="pl-muted">Empty.</p>:<table style={{width:"100%",fontSize:13}}><thead><tr><th>Name</th><th>Type</th><th>Status</th></tr></thead><tbody>{list.map((r:any)=><tr key={r.id}><td>{r.name}</td><td>{r.destination_type}</td><td>{r.status}</td></tr>)}</tbody></table>}</div>
  </div>;
}

function Messages({ tenantId }:{ tenantId:string }){
  const [list,setList]=useState<any[]>([]); const [detail,setDetail]=useState<any>(null);
  useEffect(()=>{ apiFetch(`/api/v1/tenants/${tenantId}/messages`).then(j=>setList(j.data)); },[tenantId]);
  async function open(id:string){ const j=await apiFetch(`/api/v1/tenants/${tenantId}/messages/${id}`); setDetail(j.data); }
  async function retry(dlvId:string){ await apiFetch(`/api/v1/tenants/${tenantId}/deliveries/${dlvId}/retry`,{ method:"POST" }); alert("Retry queued"); }
  return <div style={{display:"grid",gap:16}}><h2>Messages</h2>
    <div className="pl-card"><h3>Recent ({list.length})</h3>{list.length===0?<p className="pl-muted">Empty — send via machine API: POST /api/v1/messages with Bearer pl_live_...</p>:<table style={{width:"100%",fontSize:13}}><thead><tr><th>Subject</th><th>Body</th><th>Created</th></tr></thead><tbody>{list.map((r:any)=><tr key={r.id} onClick={()=>open(r.id)} style={{cursor:"pointer"}}><td>{r.subject ?? "-"}</td><td>{r.body.slice(0,60)}</td><td>{new Date(r.created_at).toLocaleString()}</td></tr>)}</tbody></table>}</div>
    {detail && <div className="pl-card"><h3>Detail {detail.message.id}</h3><pre style={{fontSize:12,whiteSpace:"pre-wrap"}}>{JSON.stringify(detail,null,2)}</pre>{detail.deliveries?.map((d:any)=><div key={d.id} style={{display:"flex",gap:8,alignItems:"center"}}><span>{d.destination_id}: {d.status}</span>{["FAILED","DEAD","RETRYING"].includes(d.status) && <button onClick={()=>retry(d.id)}>Retry</button>}</div>)}</div>}
  </div>;
}

function Webhooks({ tenantId }:{ tenantId:string }){
  const [eps,setEps]=useState<any[]>([]); const [events,setEvents]=useState<any[]>([]); const [form,setForm]=useState({ name:"", forwarding_url:"" });
  const reload=()=>{ apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints`).then(j=>setEps(j.data)); apiFetch(`/api/v1/tenants/${tenantId}/webhook-events`).then(j=>setEvents(j.data)); };
  useEffect(()=>{ reload(); },[tenantId]);
  async function create(e:React.FormEvent){ e.preventDefault(); await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints`,{ method:"POST", body: JSON.stringify({ name: form.name, forwarding_url: form.forwarding_url })}); reload(); }
  return <div style={{display:"grid",gap:16}}><h2>Webhooks</h2>
    <form onSubmit={create} className="pl-card" style={{display:"flex",gap:8}}><input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required /><input placeholder="Forwarding URL (optional)" value={form.forwarding_url} onChange={e=>setForm({...form,forwarding_url:e.target.value})} /><button type="submit">Create endpoint</button></form>
    <div className="pl-card"><h3>Endpoints</h3>{eps.length===0?<p className="pl-muted">Empty.</p>:<table style={{width:"100%",fontSize:13}}><thead><tr><th>Name</th><th>Public ID</th><th>URL</th></tr></thead><tbody>{eps.map((r:any)=><tr key={r.id}><td>{r.name}</td><td><code>{r.public_identifier}</code></td><td>/hooks/{r.public_identifier}</td></tr>)}</tbody></table>}</div>
    <div className="pl-card"><h3>Events ({events.length})</h3>{events.length===0?<p className="pl-muted">No events yet. POST to /hooks/:publicIdentifier</p>:<pre style={{fontSize:12,overflow:"auto"}}>{JSON.stringify(events.slice(0,5),null,2)}</pre>}</div>
  </div>;
}

function Logs({ tenantId }:{ tenantId:string }){
  const [logs,setLogs]=useState<any[]>([]); const [dels,setDels]=useState<any[]>([]);
  useEffect(()=>{ apiFetch(`/api/v1/tenants/${tenantId}/logs`).then(j=>setLogs(j.data)); apiFetch(`/api/v1/tenants/${tenantId}/deliveries`).then(j=>setDels(j.data)); },[tenantId]);
  return <div style={{display:"grid",gap:16}}><h2>Logs</h2>
    <div className="pl-card"><h3>Deliveries</h3>{dels.length===0?<p className="pl-muted">Empty.</p>:<table style={{width:"100%",fontSize:12}}><thead><tr><th>ID</th><th>Status</th><th>Dest</th><th>Updated</th></tr></thead><tbody>{dels.map((r:any)=><tr key={r.id}><td style={{fontFamily:"monospace"}}>{r.id.slice(0,12)}</td><td>{r.status}</td><td style={{fontFamily:"monospace"}}>{r.destination_id.slice(0,8)}</td><td>{new Date(r.updated_at).toLocaleString()}</td></tr>)}</tbody></table>}</div>
    <div className="pl-card"><h3>Audit logs</h3><pre style={{fontSize:12,overflow:"auto"}}>{logs.length===0?"Empty":JSON.stringify(logs.slice(0,20),null,2)}</pre></div>
  </div>;
}

function Settings({ tenantId }:{ tenantId:string }){
  const [keys,setKeys]=useState<any[]>([]); const [name,setName]=useState(""); const [lastKey,setLastKey]=useState<string|null>(null); const [msg,setMsg]=useState<string|null>(null);
  const reload=()=> apiFetch(`/api/v1/tenants/${tenantId}/api-keys`).then(j=>setKeys(j.data));
  useEffect(()=>{ reload(); },[tenantId]);
  async function create(e:React.FormEvent){ e.preventDefault(); const j=await apiFetch(`/api/v1/tenants/${tenantId}/api-keys`,{ method:"POST", body: JSON.stringify({ name })}); setLastKey(j.data.key); reload(); }
  async function revoke(id:string){ await apiFetch(`/api/v1/tenants/${tenantId}/api-keys/${id}/revoke`,{ method:"POST" }); reload(); setMsg("Revoked"); }
  return <div style={{display:"grid",gap:16}}><h2>Settings · API Keys</h2>
    <form onSubmit={create} className="pl-card" style={{display:"flex",gap:8}}><input placeholder="Key name (e.g. prod)" value={name} onChange={e=>setName(e.target.value)} required /><button type="submit">Create key</button></form>
    {lastKey && <div className="pl-card" style={{borderColor:"var(--pl-warn)"}}><strong>Copy now — shown once:</strong><pre style={{wordBreak:"break-all",whiteSpace:"pre-wrap"}}>{lastKey}</pre></div>}
    {msg && <div className="pl-muted">{msg}</div>}
    <div className="pl-card"><h3>Keys ({keys.length})</h3><table style={{width:"100%",fontSize:13}}><thead><tr><th>Name</th><th>Prefix</th><th>Status</th><th></th></tr></thead><tbody>{keys.map((k:any)=><tr key={k.id}><td>{k.name}</td><td><code>{k.key_prefix}</code></td><td>{k.status}</td><td>{k.status==="active" && <button onClick={()=>revoke(k.id)}>Revoke</button>}</td></tr>)}</tbody></table></div>
    <div className="pl-card"><h3>Account</h3><button onClick={()=>{ setToken(null); setTenantId(null); location.reload(); }}>Sign out</button></div>
  </div>;
}

export default function App(){
  const [theme,setTheme]=useTheme();
  const [authed,setAuthed]=useState(()=>!!getToken());
  const tenantId=useTenantId();
  const [tenants,setTenants]=useState<any[]>([]);
  const navigate=useNavigate();
  useEffect(()=>{ if(authed) apiFetch("/api/v1/auth/me").then(j=>{ setTenants(j.data.tenants||[]); if(!getTenantId() && j.data.tenants?.[0]) setTenantId(j.data.tenants[0].id); }).catch(()=>{ setToken(null); setAuthed(false); }); },[authed]);
  if(!authed) return <div><div className="pl-top" style={{padding:16}}><strong>portlane</strong><select value={theme} onChange={e=>setTheme(e.target.value as Theme)} aria-label="theme"><option value="system">system</option><option value="light">light</option><option value="dark">dark</option></select></div><LoginGate onAuth={()=>{ setAuthed(true); navigate("/"); }} /></div>;
  if(!tenantId) return <div className="pl-card" style={{margin:24}}><h3>Select workspace</h3>{tenants.length===0?<p className="pl-muted">Loading tenants...</p>:tenants.map((t:any)=><button key={t.id} onClick={()=>{ setTenantId(t.id); location.reload(); }} style={{display:"block",margin:"8px 0"}}>{t.name} ({t.slug})</button>)}<button onClick={()=>{ setToken(null); setTenantId(null); location.reload(); }}>Sign out</button></div>;
  return <div className="pl-shell">
    <aside className="pl-side"><div className="pl-brand">portlane</div><div className="pl-tenant" title={tenantId}>tenant: {tenants.find(t=>t.id===tenantId)?.slug ?? tenantId.slice(0,10)}</div>
      <nav className="pl-nav">{NAV.map(item=><NavLink key={item} to={item==="Overview"?"/":`/${item.toLowerCase()}`} className={({isActive})=>isActive?"active":""}>{item}</NavLink>)}</nav></aside>
    <main className="pl-main"><div className="pl-top"><strong>Console</strong><div className="pl-row"><span className="pl-muted">theme</span><select value={theme} onChange={e=>setTheme(e.target.value as Theme)} aria-label="theme"><option value="system">system</option><option value="light">light</option><option value="dark">dark</option></select></div></div>
      <Routes>
        <Route path="/" element={<Overview tenantId={tenantId} />} />
        <Route path="/providers" element={<Providers tenantId={tenantId} />} />
        <Route path="/destinations" element={<Destinations tenantId={tenantId} />} />
        <Route path="/messages" element={<Messages tenantId={tenantId} />} />
        <Route path="/webhooks" element={<Webhooks tenantId={tenantId} />} />
        <Route path="/logs" element={<Logs tenantId={tenantId} />} />
        <Route path="/settings" element={<Settings tenantId={tenantId} />} />
        <Route path="*" element={<div className="pl-card"><h2>Not found</h2></div>} />
      </Routes>
    </main>
  </div>;
}
