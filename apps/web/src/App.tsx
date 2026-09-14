import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { apiFetch, getTenantId, getToken, setTenantId, setToken, hasSessionHint, setSessionHint, clearSessionHint, signOutEverywhere } from "./lib/api.js";
import { Skeleton } from "./components/primitives.js";
import { I } from "./components/icons.js";
import "./styles/InboundLogs.css";

// Route-level code splitting: every page is its own chunk, loaded on demand.
// App shell (nav, tenant switcher, command palette) stays in the entry chunk.
const Overview = lazy(() => import("./pages/Overview.js"));
const Providers = lazy(() => import("./pages/Providers.js"));
const Destinations = lazy(() => import("./pages/Destinations.js"));
const Messages = lazy(() => import("./pages/Messages.js"));
const Webhooks = lazy(() => import("./pages/Webhooks.js"));
const Logs = lazy(() => import("./pages/Logs.js"));
const Settings = lazy(() => import("./pages/Settings.js"));
const IpAccess = lazy(() => import("./pages/IpAccess.js"));
const Docs = lazy(() => import("./pages/Docs.js"));
const InboundLogs = lazy(() => import("./pages/InboundLogs.js"));
const InboundLogDetail = lazy(() => import("./pages/InboundLogDetail.js"));

function PageFallback() { return <div className="pl-card"><Skeleton h={120} /></div>; }

function useTenantId(){ const [tid,setTid]=useState<string|null>(()=>getTenantId()); useEffect(()=>{ const h=()=>setTid(getTenantId()); window.addEventListener("storage",h); return()=>window.removeEventListener("storage",h); },[]); return tid; }

function LoginGate({ onAuth }:{onAuth:()=>void}){
  const [mode,setMode]=useState<"login"|"register">("login");
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [name,setName]=useState(""); const [err,setErr]=useState<string|null>(null); const [loading,setLoading]=useState(false);
  async function submit(e:React.FormEvent){ e.preventDefault(); setErr(null); setLoading(true);
    try{ const path=mode==="login"?"/api/v1/auth/login":"/api/v1/auth/register";
      const body=mode==="login"?{email,password}:{email,password,name};
      const j=await apiFetch(path,{method:"POST",body:JSON.stringify(body)});
      setSessionHint(); if(j.data.tenant?.id) setTenantId(j.data.tenant.id);
      if(!j.data.tenant?.id){ try{ const me=await apiFetch("/api/v1/auth/me"); if(me.data.tenants?.[0]) setTenantId(me.data.tenants[0].id);}catch{ /* ignore auth me errors */ } }
      onAuth();
    }catch(e:any){ setErr(e.message || e.code || "Unknown error");} finally{ setLoading(false); }
  }
  return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"var(--bg-base)",padding:20}}>
    <div style={{width:420,background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:16,padding:24}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}><div className="pl-brand-mark">P</div><div><div style={{fontWeight:700}}>Portlane</div><div style={{fontSize:12,color:"var(--text-muted)"}}>Infrastructure control center</div></div></div>
      <h2 style={{margin:"0 0 4px",fontSize:18}}>{mode==="login"?"Sign in":"Create account"}</h2><p style={{margin:"0 0 16px",fontSize:13,color:"var(--text-secondary)"}}>{mode==="login"?"Welcome back.":"Create your workspace."}</p>
      <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:10}}>
        {mode==="register" && <><label className="pl-label">Name</label><input className="pl-input" value={name} onChange={e=>setName(e.target.value)} required /></>}
        <label className="pl-label">Email</label><input className="pl-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <label className="pl-label">Password</label><input className="pl-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        {err && <div style={{fontSize:12,color:"var(--danger)",background:"var(--danger-soft)",border:"1px solid rgba(239,68,68,0.2)",padding:"8px 10px",borderRadius:8}}>{err}</div>}
        <button className="pl-btn pl-btn-primary" style={{justifyContent:"center",marginTop:4}} disabled={loading}>{loading?"...":mode==="login"?"Sign in":"Create & sign in"}</button>
        <button type="button" onClick={()=>setMode(mode==="login"?"register":"login")} style={{background:"transparent",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:12}}>{mode==="login"?"Need account? Register":"Have account? Sign in"}</button>
      </form>
    </div>
  </div>;
}

export default function App(){
  const routerLocation = useLocation();
  if (routerLocation.pathname === "/docs" || routerLocation.pathname.startsWith("/docs/")) return <Suspense fallback={<PageFallback />}><Docs /></Suspense>;
  const [authed,setAuthed]=useState(()=> hasSessionHint() || !!getToken());
  const tenantId=useTenantId();
  const [tenants,setTenants]=useState<any[]>([]);
  const [collapsed,setCollapsed]=useState(false);
  const [cmd,setCmd]=useState(false);
  const [tenantOpen,setTenantOpen]=useState(false);
  const [showTenantCreate,setShowTenantCreate]=useState(false); const [newTenantName,setNewTenantName]=useState(""); const [tenantMsg,setTenantMsg]=useState<string|null>(null);
  const navigate=useNavigate();
  const searchRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{ if(authed) apiFetch("/api/v1/auth/me").then(j=>{ setTenants(j.data.tenants||[]); if(!getTenantId() && j.data.tenants?.[0]) setTenantId(j.data.tenants[0].id); }).catch(()=>{ setToken(null); clearSessionHint(); setAuthed(false); }); },[authed]);
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{ if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==="k"){ e.preventDefault(); setCmd(v=>!v);} if(e.key==="Escape") setCmd(false); };
    window.addEventListener("keydown",h); return()=>window.removeEventListener("keydown",h);
  },[]);
  const tenant=useMemo(()=> tenants.find((t:any)=>t.id===tenantId), [tenants,tenantId]);

  async function createTenant(e:React.FormEvent){
    e.preventDefault(); setTenantMsg(null);
    try{ const j=await apiFetch("/api/v1/tenants",{method:"POST",body:JSON.stringify({name:newTenantName})}); setTenants([...tenants, j.data]); setTenantId(j.data.id); setNewTenantName(""); setShowTenantCreate(false); setTenantOpen(false); window.location.reload(); }catch(er:any){ setTenantMsg(er.message); }
  }

  if(!authed) return <LoginGate onAuth={()=>{ setAuthed(true); navigate("/"); }} />;
  if(!tenantId) return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"var(--bg-base)",padding:24}}><div className="pl-card" style={{width:420}}><h3 style={{margin:"0 0 12px"}}>Select workspace</h3>{tenants.length===0?<Skeleton h={60}/>: tenants.map((t:any)=><button key={t.id} className="pl-btn pl-btn-secondary" onClick={()=>{ setTenantId(t.id); window.location.reload(); }} style={{display:"flex",width:"100%",margin:"8px 0",justifyContent:"space-between"}}>{t.name} <span className="pl-mono" style={{fontSize:11,color:"var(--text-muted)"}}>{t.slug}</span></button>)}<button className="pl-btn pl-btn-ghost" onClick={()=>{ void signOutEverywhere(); }}>Sign out</button></div></div>;

  const cmdItems=[
    {label:"Go to Overview", to:"/"},
    {label:"Go to Providers", to:"/providers"},
    {label:"Go to Destinations", to:"/destinations"},
    {label:"Go to Messages", to:"/messages"},
    {label:"Go to Webhooks", to:"/webhooks"},
    {label:"Go to Logs", to:"/logs"},
    {label:"Go to API Keys", to:"/settings"},
    {label:"Create Provider", to:"/providers"},
    {label:"Create Destination", to:"/destinations"},
    {label:"Send Message", to:"/messages"},
  ];

  return <div className={`pl-shell ${collapsed?"pl-side-collapsed":""}`}>
    <aside className="pl-side">
      <div className="pl-brand"><div className="pl-brand-mark">P</div>{!collapsed && <div><div className="pl-brand-text">PORTLANE</div><div className="pl-brand-sub">Infrastructure</div></div>}<button onClick={()=>setCollapsed(v=>!v)} style={{marginLeft:"auto",background:"transparent",border:"none",color:"var(--text-muted)",cursor:"pointer"}}>{collapsed?"›":"‹"}</button></div>

      {!collapsed && (
        <div className="pl-search" onClick={()=>setCmd(true)}>
          <span className="pl-search-ic"><I.search/></span>
          <input ref={searchRef} placeholder="Search..." readOnly />
          <span className="pl-search-kbd">⌘K</span>
        </div>
      )}

      <div className="pl-nav-section">
        {!collapsed && <div className="pl-nav-label">Main</div>}
        <nav className="pl-nav">
          <NavLink to="/" className={({isActive})=>isActive?"active":""}><I.dash/> {!collapsed && "Overview"}</NavLink>
          <NavLink to="/providers" className={({isActive})=>isActive?"active":""}><I.box/> {!collapsed && "Providers"}</NavLink>
          <NavLink to="/destinations" className={({isActive})=>isActive?"active":""}><I.target/> {!collapsed && "Destinations"}</NavLink>
          <NavLink to="/messages" className={({isActive})=>isActive?"active":""}><I.mail/> {!collapsed && "Messages"}</NavLink>
          <NavLink to="/webhooks" className={({isActive})=>isActive?"active":""}><I.webhook/> {!collapsed && "Webhooks"}</NavLink>
        </nav>
      </div>

      <div className="pl-nav-section">
        {!collapsed && <div className="pl-nav-label">Operations</div>}
        <nav className="pl-nav">
          <NavLink to="/logs" className={({isActive})=>isActive?"active":""}><I.logs/> {!collapsed && "Logs"}</NavLink>
        </nav>
      </div>

      <div className="pl-nav-section">
        {!collapsed && <div className="pl-nav-label">System</div>}
        <nav className="pl-nav">
          <NavLink to="/settings" className={({isActive})=>isActive?"active":""}><I.key/> {!collapsed && "API Keys"}</NavLink>
          <NavLink to="/ip-access" className={({isActive})=>isActive?"active":""}><I.shield/> {!collapsed && "IP Access"}</NavLink>
          <a href="/docs" style={{display:"flex",alignItems:"center",gap:10,height:38,padding:"0 10px",borderRadius:8,color:"var(--text-secondary)",textDecoration:"none",fontSize:13,fontWeight:500}}><I.logs/> {!collapsed && "Docs (publik)"}</a>
        </nav>
      </div>

      <div className="pl-side-bottom">
        {!collapsed && (
          <div style={{position:"relative"}}>
            <button className="pl-tenant-btn" onClick={()=>setTenantOpen(v=>!v)}>
              <div className="pl-tenant-avatar">{(tenant?.name ?? "VA").slice(0,2).toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}><div className="pl-tenant-name" style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tenant?.name ?? "Vanta Arc"}</div><div className="pl-tenant-sub">Production</div></div>
              <I.chev/>
            </button>
            {tenantOpen && (
              <div style={{position:"absolute",bottom:"100%",left:0,right:0,marginBottom:8,background:"var(--bg-modal)",border:"1px solid var(--border)",borderRadius:10,padding:6,boxShadow:"0 8px 24px rgba(0,0,0,0.5)"}}>
                {tenants.map((t:any)=><button key={t.id} onClick={()=>{ setTenantId(t.id); setTenantOpen(false); window.location.reload(); }} style={{display:"flex",width:"100%",padding:"8px 10px",borderRadius:8,border:"none",background: t.id===tenantId?"var(--accent-soft)":"transparent",color: t.id===tenantId?"var(--text-primary)":"var(--text-secondary)",textAlign:"left",cursor:"pointer",fontSize:13}}>{t.name}</button>)}
                <div style={{height:1,background:"var(--border)",margin:"6px 0"}}/>
                <button onClick={()=>setShowTenantCreate(true)} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px dashed var(--border)",background:"transparent",color:"var(--text-muted)",fontSize:12,cursor:"pointer"}}>+ Create Tenant</button>
              </div>
            )}
          </div>
        )}
        <div className="pl-user"><div className="pl-avatar">W</div>{!collapsed && <div style={{flex:1,minWidth:0}}><div className="pl-user-name">Winata</div><div className="pl-user-role">Owner</div></div>}{!collapsed && <I.chev/>}</div>
      </div>
    </aside>

    <main className="pl-main">
      <div className="pl-top">
        <div>
          <h1>Good morning, Winata 👋</h1>
          <p>Here's what's happening across Portlane today.</p>
        </div>
        <div className="pl-top-actions">
          <button className="pl-icon-btn" onClick={()=>setCmd(true)} aria-label="Search"><I.search/></button>
          <button className="pl-icon-btn" aria-label="Notifications"><I.bell/></button>
          <span style={{fontSize:12,color:"var(--text-muted)",border:"1px solid var(--border)",padding:"6px 10px",borderRadius:8,background:"var(--bg-card)"}}>{new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>
        </div>
      </div>

      <div className="pl-content">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Overview tenantId={tenantId} />} />
            <Route path="/providers" element={<Providers tenantId={tenantId} />} />
            <Route path="/destinations" element={<Destinations tenantId={tenantId} />} />
            <Route path="/messages" element={<Messages tenantId={tenantId} />} />
            <Route path="/webhooks" element={<Webhooks tenantId={tenantId} />} />
            <Route path="/logs" element={<Logs tenantId={tenantId} />} />
            <Route path="/inbound" element={<InboundLogs tenantId={tenantId} />} />
            <Route path="/inbound/:logId" element={<InboundLogDetail tenantId={tenantId} />} />
            <Route path="/deliveries" element={<Logs tenantId={tenantId} />} />
            <Route path="/settings" element={<Settings tenantId={tenantId} />} />
            <Route path="/api-keys" element={<Settings tenantId={tenantId} />} />
            <Route path="/ip-access" element={<IpAccess tenantId={tenantId}/>} />
            <Route path="*" element={<div className="pl-card"><h2>Not found</h2></div>} />
          </Routes>
        </Suspense>
      </div>
    </main>

    {showTenantCreate && (
      <div className="pl-overlay" onClick={()=>setShowTenantCreate(false)}>
        <div className="pl-modal" onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h3 style={{margin:0,fontSize:15}}>Create Tenant</h3><button className="pl-icon-btn" onClick={()=>setShowTenantCreate(false)}><I.x/></button></div>
          <form onSubmit={createTenant} style={{display:"flex",flexDirection:"column",gap:10}}>
            <div><label className="pl-label">Workspace name</label><input className="pl-input" value={newTenantName} onChange={e=>setNewTenantName(e.target.value)} required placeholder="Acme Inc" /></div>
            {tenantMsg && <div style={{fontSize:12,color:"var(--danger)"}}>{tenantMsg}</div>}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button type="button" className="pl-btn pl-btn-ghost" onClick={()=>setShowTenantCreate(false)}>Cancel</button><button type="submit" className="pl-btn pl-btn-primary">Create</button></div>
          </form>
        </div>
      </div>
    )}

    {cmd && (
      <div className="pl-cmd-overlay" onClick={()=>setCmd(false)}>
        <div className="pl-cmd" onClick={e=>e.stopPropagation()}>
          <input className="pl-cmd-input" autoFocus placeholder="Search or jump to..." />
          <div className="pl-cmd-list">
            {cmdItems.map(it=>(
              <div key={it.label} className="pl-cmd-item" onClick={()=>{ setCmd(false); navigate(it.to); }}>
                <I.search/> {it.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
  </div>;
}
