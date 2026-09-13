import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { apiFetch, getTenantId, getToken, setTenantId, setToken } from "./lib/api.js";
import Docs from "./pages/Docs.js";
import InboundLogs from "./pages/InboundLogs.js";
import InboundLogDetail from "./pages/InboundLogDetail.js";
import "./styles/InboundLogs.css";

const I = {
  search: (p:any)=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="11" cy="11" r="7"/><path d="M20 20L16 16"/></svg>,
  dash: (p:any)=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  box: (p:any)=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7L12 12l8.7-5"/><path d="M12 22V12"/></svg>,
  target:(p:any)=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>,
  mail:(p:any)=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M4 4h16v16H4z"/><path d="M4 7l8 6 8-6"/></svg>,
  webhook:(p:any)=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M18 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M6 8a3 3 0 1 0 0 6 3 3 0 0 0 0 0z"/><path d="M9 11h6M9 13h6"/></svg>,
  logs:(p:any)=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M10 13H8M16 17H8M13 13h2"/></svg>,
  key:(p:any)=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M21 2l-6 6"/><circle cx="7.5" cy="15.5" r="5.5"/><path d="M14 14l6 6"/></svg>,
  shield:(p:any)=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  settings:(p:any)=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 1-2 0 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 8.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 1 0-2c.18-.18.4-.33.6-.44A1.65 1.65 0 0 0 8.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 13 4.6c.18.18.4.33.6.44A1.65 1.65 0 0 1 15.4 5a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c-.18.18-.33.4-.44.6A1.65 1.65 0 0 1 19 11.4c0 .18 0 .36-.06.54-.11.2-.26.38-.44.54A1.65 1.65 0 0 0 19.4 15z"/></svg>,
  bell:(p:any)=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-6 9-6 9h18s-6-2-6-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  plus:(p:any)=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  chev:(p:any)=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M6 9l6 6 6-6"/></svg>,
  up:(p:any)=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M12 19V5M5 12l7-7 7 7"/></svg>,
  down:(p:any)=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M12 5v14M19 12l-7 7-7-7"/></svg>,
  x:(p:any)=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M18 6L6 18M6 6l12 12"/></svg>,
  copy:(p:any)=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3"/></svg>,
  trash:(p:any)=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6"/></svg>,
};

function useTenantId(){ const [tid,setTid]=useState<string|null>(()=>getTenantId()); useEffect(()=>{ const h=()=>setTid(getTenantId()); window.addEventListener("storage",h); return()=>window.removeEventListener("storage",h); },[]); return tid; }
function Spark({ color="var(--accent)", values }:{color?:string;values:number[]}) {
  if(!values?.length) return null;
  const w=100, h=32, max=Math.max(...values,1), min=Math.min(...values,0);
  const range=max-min||1;
  const pts=values.map((v,i)=>`${(i/(values.length-1))*w},${h - ((v-min)/range)*(h-6) -3}`).join(" ");
  return <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="32" preserveAspectRatio="none"><polyline fill="none" stroke={color} strokeWidth="1.8" points={pts} strokeLinejoin="round" strokeLinecap="round"/><polyline fill={color} opacity="0.08" points={`${pts} ${w},${h} 0,${h}`} /></svg>;
}
function StatusBadge({ status }:{status:string}){
  const s=status.toLowerCase();
  const map:any={ delivered:"delivered", failed:"failed", dead:"failed", retrying:"queued", queued:"queued", processing:"processing", connected:"connected", active:"delivered", healthy:"delivered", degraded:"queued", disabled:"failed", revoked:"failed" };
  const k=map[s] ?? "queued";
  const dot={ delivered:"var(--success)", failed:"var(--danger)", queued:"var(--warning)", processing:"#A855F7", connected:"var(--success)" } as any;
  return <span className={`pl-status pl-status-${k}`}><span className="pl-status-dot" style={{background:dot[k] ?? "#737373"}}/>{status}</span>;
}
function Skeleton({h=16}:{h?:number}){ return <div className="pl-skeleton" style={{height:h}}/>; }
function qs(p:Record<string,string|undefined>){ const u=new URLSearchParams(); for(const [k,v] of Object.entries(p)) if(v) u.set(k,v); const s=u.toString(); return s?`?${s}`:""; }

function LoginGate({ onAuth }:{onAuth:()=>void}){
  const [mode,setMode]=useState<"login"|"register">("login");
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [name,setName]=useState(""); const [err,setErr]=useState<string|null>(null); const [loading,setLoading]=useState(false);
  async function submit(e:React.FormEvent){ e.preventDefault(); setErr(null); setLoading(true);
    try{ const path=mode==="login"?"/api/v1/auth/login":"/api/v1/auth/register";
      const body=mode==="login"?{email,password}:{email,password,name};
      const j=await apiFetch(path,{method:"POST",body:JSON.stringify(body)});
      setToken(j.data.token); if(j.data.tenant?.id) setTenantId(j.data.tenant.id);
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

function Overview({ tenantId }:{tenantId:string}){
  const [data,setData]=useState<any>(null); const [err,setErr]=useState<string|null>(null);
  const [conns,setConns]=useState<any[]>([]); const [dels,setDels]=useState<any[]>([]); const [events,setEvents]=useState<any[]>([]);
  const [range,setRange]=useState<"24h"|"7d"|"30d">("7d");
  useEffect(()=>{ apiFetch(`/api/v1/tenants/${tenantId}/overview`).then(j=>setData(j.data)).catch(e=>setErr(e.message));
    apiFetch(`/api/v1/tenants/${tenantId}/provider-connections`).then(j=>setConns(j.data)).catch(()=>{});
    apiFetch(`/api/v1/tenants/${tenantId}/deliveries`).then(j=>setDels(j.data)).catch(()=>{});
    apiFetch(`/api/v1/tenants/${tenantId}/webhook-events`).then(j=>setEvents(j.data)).catch(()=>{});
  },[tenantId]);
  if(err) return <div style={{padding:16,background:"var(--danger-soft)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:12,color:"var(--danger)"}}>{err}</div>;
  if(!data) return <div style={{display:"grid",gap:16}}><div className="pl-metric-grid">{[1,2,3,4].map(i=><div key={i} className="pl-card"><Skeleton h={90}/></div>)}</div></div>;
  const metrics=[
    {label:"Messages Today", value:data.messages_today ?? 0, change:"+8.2%", up:true, icon:"✉️", color:"var(--accent)", spark:[4,6,5,8,7,10,8,12,9,14]},
    {label:"Delivered", value:data.delivered ?? 0, change:"99.6%", up:true, icon:"✓", color:"var(--success)", spark:[6,7,8,7,9,10,12,11,13,14]},
    {label:"Failed", value:data.failed ?? 0, change:"↓ 12%", up:false, icon:"!", color:"var(--danger)", spark:[2,3,2,5,3,4,6,4,5,3]},
    {label:"Webhooks", value:data.webhooks_received_today ?? 0, change:"↑ 4.1%", up:true, icon:"↗", color:"var(--accent)", spark:[5,6,4,7,8,6,9,10,8,11]},
  ];
  const bars = [ {o:22,g:18,r:4},{o:28,g:24,r:3},{o:18,g:16,r:5},{o:32,g:28,r:6},{o:26,g:22,r:4},{o:36,g:30,r:5},{o:30,g:26,r:7},{o:24,g:20,r:3},{o:34,g:29,r:4},{o:28,g:25,r:3},{o:30,g:27,r:5},{o:26,g:22,r:4} ];
  const maxBar=Math.max(...bars.map(b=>b.o),1);
  const breakdown=[
    {label:"Telegram", pct:42, color:"#FF7A00"},
    {label:"Discord", pct:28, color:"#FF9A3D"},
    {label:"SMTP", pct:21, color:"#FFB366"},
    {label:"Webhook", pct:9, color:"#2A2A2A"},
  ];
  const q = { queued: data.queued ?? dels.filter(d=>d.status==="QUEUED").length, processing: dels.filter(d=>d.status==="PROCESSING").length, retrying: dels.filter(d=>d.status==="RETRYING").length, dead: dels.filter(d=>d.status==="DEAD").length };
  const recent = dels.slice(0,5);
  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div className="pl-metric-grid">
      {metrics.map(m=>(
        <div key={m.label} className="pl-metric">
          <div className="pl-metric-head"><span className="pl-metric-label">{m.label}</span><span className="pl-metric-icon" style={{background: m.color=== "var(--accent)"? "var(--accent-soft)": m.color==="var(--success)"?"var(--success-soft)":"var(--danger-soft)", borderColor: m.color=== "var(--accent)"? "var(--accent-border)": "transparent", color:m.color}}>{m.icon}</span></div>
          <div className="pl-metric-value">{m.value.toLocaleString()}</div>
          <div className={`pl-metric-change ${m.up?"up":"down"}`}>{m.up? <I.up/> : <I.down/>}{m.change} <span style={{color:"var(--text-muted)"}}>from yesterday</span></div>
          <div className="pl-spark"><Spark color={m.color} values={m.spark}/></div>
        </div>
      ))}
    </div>
    <div className="pl-grid-2">
      <div className="pl-card">
        <div className="pl-card-head"><div><div className="pl-card-title">Delivery Activity</div><div className="pl-card-sub">Delivered vs failed — {range}</div></div>
          <div className="pl-tabs">{(["24h","7d","30d"] as const).map(r=><button key={r} className={`pl-tab ${range===r?"active":""}`} onClick={()=>setRange(r)}>{r}</button>)}</div>
        </div>
        <div className="pl-chart-wrap">
          <div className="pl-chart-grid">{[0,1,2,3].map(i=><div key={i} className="pl-chart-grid-line"/>)}</div>
          <div className="pl-bars" style={{position:"relative",zIndex:1}}>
            {bars.map((b,i)=>(
              <div key={i} style={{flex:1,display:"flex",gap:3,alignItems:"end",height:"100%",paddingBottom:4}}>
                <div className="pl-bar pl-bar-o" style={{flex:1,height:`${(b.o/maxBar)*88}%`, opacity: i===5?1:0.9}}/>
                <div style={{flex:1,height:`${(b.r/maxBar)*88}%`,background:"var(--danger)",borderRadius:"6px 6px 4px 4px",opacity:0.95}}/>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:16,marginTop:10,fontSize:11,color:"var(--text-muted)"}}><span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:8,height:8,background:"var(--accent)",borderRadius:99,display:"inline-block"}}/> Delivered</span><span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:8,height:8,background:"var(--danger)",borderRadius:99,display:"inline-block"}}/> Failed</span></div>
      </div>
      <div className="pl-card">
        <div className="pl-card-head"><div className="pl-card-title">Provider Mix</div><span className="pl-pill">This week</span></div>
        <div className="pl-donut">
          <svg width="110" height="110" viewBox="0 0 110 110">
            {(()=>{
              let acc=0; const tot=100;
              return breakdown.map(b=>{
                const start=(acc/tot)*2*Math.PI - Math.PI/2;
                const sweep=(b.pct/tot)*2*Math.PI;
                const end=start+sweep; acc+=b.pct;
                const x1=55+ 40*Math.cos(start), y1=55+40*Math.sin(start), x2=55+40*Math.cos(end), y2=55+40*Math.sin(end);
                const large=sweep>Math.PI?1:0;
                const xi1=55+ 24*Math.cos(end), yi1=55+24*Math.sin(end), xi2=55+24*Math.cos(start), yi2=55+24*Math.sin(start);
                return <path key={b.label} d={`M ${x1} ${y1} A 40 40 0 ${large} 1 ${x2} ${y2} L ${xi1} ${yi1} A 24 24 0 ${large} 0 ${xi2} ${yi2} Z`} fill={b.color} stroke="var(--bg-card)" strokeWidth="2"/>;
              });
            })()}
            <circle cx="55" cy="55" r="24" fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1"/>
            <text x="55" y="52" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text-primary)">{conns.length||4}</text>
            <text x="55" y="64" textAnchor="middle" fontSize="9" fill="var(--text-muted)">providers</text>
          </svg>
          <div className="pl-legend">
            {breakdown.map(b=><div key={b.label} className="pl-legend-row"><span className="pl-dot" style={{background:b.color}}/><span>{b.label}</span><span className="pl-legend-val">{b.pct}%</span></div>)}
          </div>
        </div>
        {conns.length===0 && <div style={{fontSize:11,color:"var(--text-muted)",marginTop:8}}>No provider connections yet — breakdown shows sample.</div>}
      </div>
    </div>
    <div className="pl-grid-3">
      <div className="pl-card">
        <div className="pl-card-head"><span className="pl-card-title">Recent Deliveries</span><span style={{fontSize:12,color:"var(--accent)",cursor:"pointer"}}>View all</span></div>
        <div className="pl-list">
          {recent.length===0? <div className="pl-empty"><div className="pl-empty-ic"><I.mail/></div>No deliveries yet</div> :
            recent.map((d:any)=>(
              <div key={d.id} className="pl-row-item">
                <div className="pl-row-icon" style={{color: d.status==="DELIVERED"?"var(--success)": d.status==="FAILED"||d.status==="DEAD"?"var(--danger)":"var(--warning)"}}>{d.status==="DELIVERED"?"✓":"!"}</div>
                <div style={{flex:1,minWidth:0}}><div className="pl-row-title" style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.destination_id.slice(0,10)} · {d.status}</div><div className="pl-row-sub">{new Date(d.updated_at).toLocaleString()}</div></div>
                <StatusBadge status={d.status}/>
              </div>
            ))}
        </div>
      </div>
      <div className="pl-card">
        <div className="pl-card-head"><span className="pl-card-title">Queue Health</span><span className="pl-pill" style={{height:22,padding:"0 8px",fontSize:11}}>{q.queued+q.processing+q.retrying+q.dead} pending</span></div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {[
            {k:"Queued", v:q.queued, c:"#737373"},
            {k:"Processing", v:q.processing, c:"#A855F7"},
            {k:"Retrying", v:q.retrying, c:"var(--warning)"},
            {k:"Dead", v:q.dead, c:"var(--danger)"},
          ].map(r=>(
            <div key={r.k}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6}}><span style={{color:"var(--text-secondary)"}}>{r.k}</span><span style={{fontWeight:600}}>{r.v}</span></div><div className="pl-progress"><div className="pl-progress-fill" style={{width:`${Math.min(100, (r.v/ Math.max(1,q.queued+q.processing+q.retrying+q.dead))*100)}%`, background:r.c}}/></div></div>
          ))}
        </div>
      </div>
      <div className="pl-card">
        <div className="pl-card-head"><span className="pl-card-title">Provider Health</span><span className="pl-pill" style={{height:22,fontSize:11}}>Live</span></div>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          {(conns.length?conns:[{id:"1",name:"Telegram Production",status:"connected"},{id:"2",name:"Discord Alerts",status:"connected"},{id:"3",name:"SMTP Production",status:"degraded"}]).slice(0,4).map((c:any)=>(
            <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 6px",borderRadius:8,background:"transparent"}}>
              <div style={{width:8,height:8,borderRadius:99,background: c.status==="connected"||c.status==="active"?"var(--success)": c.status==="degraded"?"var(--warning)":"var(--danger)"}}/>
              <span style={{fontSize:13,flex:1}}>{c.name}</span>
              <span style={{fontSize:11,color:"var(--text-muted)"}}>{c.status}</span>
            </div>
          ))}
        </div>
        <div style={{marginTop:10,fontSize:11,color:"var(--text-muted)"}}>{events.length? `${events.length} webhook events today` : "All core providers healthy."}</div>
      </div>
    </div>
    <div className="pl-banner">
      <div><div className="pl-banner-title">{q.dead>0 ? "Action required — dead letters detected" : "Portlane is operating normally."}</div><div className="pl-banner-sub">{q.dead>0 ? `${q.dead} dead deliveries need attention.` : `99.6% of deliveries succeeded in last 24h.`}</div></div>
      <button className="pl-btn" style={{background:"white",color:"#111",borderColor:"white"}}>View details</button>
    </div>
  </div>;
}

function Providers({ tenantId }:{tenantId:string}){
  const [list,setList]=useState<any[]>([]); const [loading,setL]=useState(true); const [msg,setMsg]=useState<string|null>(null);
  const [open,setOpen]=useState(false); const [edit,setEdit]=useState<any|null>(null);
  const [q,setQ]=useState(""); const [fProvider,setFProvider]=useState(""); const [fStatus,setFStatus]=useState("");
  const [form,setForm]=useState({ provider_key:"telegram", name:"", botToken:"", webhookUrl:"", host:"", port:"", senderEmail:"", url:"" });
  const [editForm,setEditForm]=useState({name:"",status:"active"});

  const reload=useCallback(()=>{
    const query=qs({q:q||undefined, provider_key:fProvider||undefined, status:fStatus||undefined});
    return apiFetch(`/api/v1/tenants/${tenantId}/provider-connections${query}`).then(j=>setList(j.data)).finally(()=>setL(false));
  },[tenantId,q,fProvider,fStatus]);
  useEffect(()=>{ setL(true); const t=setTimeout(reload,250); return()=>clearTimeout(t); },[reload]);
  async function create(e:React.FormEvent){ e.preventDefault(); setMsg(null);
    let creds:Record<string,unknown>={}, cfg:Record<string,unknown>={};
    if(form.provider_key==="telegram") creds={ botToken: form.botToken };
    if(form.provider_key==="discord") creds={ webhookUrl: form.webhookUrl };
    if(form.provider_key==="smtp") creds={ host:form.host, port:form.port, senderEmail:form.senderEmail };
    if(form.provider_key==="webhook") cfg={ url: form.url };
    try{ await apiFetch(`/api/v1/tenants/${tenantId}/provider-connections`,{method:"POST",body:JSON.stringify({provider_key:form.provider_key,name:form.name,config:cfg,credentials:creds})}); setMsg("Created"); setOpen(false); setForm({provider_key:"telegram",name:"",botToken:"",webhookUrl:"",host:"",port:"",senderEmail:"",url:""}); reload(); }catch(e:any){ setMsg(e.message || e.code || "Unknown error"); }
  }
  async function test(id:string){ try{ const j=await apiFetch(`/api/v1/tenants/${tenantId}/provider-connections/${id}/test`,{method:"POST"}); setMsg(JSON.stringify(j.data)); }catch(e:any){ setMsg(e.message || e.code || "Unknown error"); } }
  async function remove(id:string){ if(!confirm("Delete provider connection?")) return; await apiFetch(`/api/v1/tenants/${tenantId}/provider-connections/${id}`,{method:"DELETE"}); reload(); }
  async function saveEdit(e:React.FormEvent){ e.preventDefault(); if(!edit) return; await apiFetch(`/api/v1/tenants/${tenantId}/provider-connections/${edit.id}`,{method:"PATCH",body:JSON.stringify({name:editForm.name,status:editForm.status})}); setEdit(null); reload(); }
  function openEdit(r:any){ setEdit(r); setEditForm({name:r.name,status:r.status}); }

  if(loading) return <div><Skeleton h={120}/></div>;
  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}><div><h2 style={{margin:0,fontSize:18}}>Providers</h2><p style={{margin:"4px 0 0",fontSize:13,color:"var(--text-secondary)"}}>Connect and manage communication providers.</p></div><div style={{display:"flex",gap:8}}><button className="pl-btn pl-btn-primary" onClick={()=>setOpen(true)}><I.plus/> Add Provider</button></div></div>
    <div className="pl-card" style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
      <div style={{position:"relative",flex:1,minWidth:180}}><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)"}}><I.search/></span><input className="pl-input" style={{paddingLeft:30}} placeholder="Search name or provider..." value={q} onChange={e=>setQ(e.target.value)} /></div>
      <select className="pl-select" value={fProvider} onChange={e=>setFProvider(e.target.value)}><option value="">All providers</option><option value="telegram">telegram</option><option value="discord">discord</option><option value="smtp">smtp</option><option value="webhook">webhook</option></select>
      <select className="pl-select" value={fStatus} onChange={e=>setFStatus(e.target.value)}><option value="">All status</option><option value="active">active</option><option value="disabled">disabled</option></select>
      <span style={{fontSize:12,color:"var(--text-muted)"}}>{list.length} results</span>
    </div>
    {msg && <div style={{fontSize:12,padding:"10px 12px",borderRadius:8,background:"var(--bg-card)",border:"1px solid var(--border)",wordBreak:"break-all"}}>{msg}</div>}
    {list.length===0? <div className="pl-card pl-empty"><div className="pl-empty-ic"><I.box/></div>No providers found<br/><span style={{fontSize:12,color:"var(--text-muted)"}}>Connect Telegram, Discord, SMTP, or Webhook to start routing messages.</span><div style={{marginTop:12}}><button className="pl-btn pl-btn-primary" onClick={()=>setOpen(true)}>Add Provider</button></div></div> :
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
        {list.map((r:any)=>(
          <div key={r.id} className="pl-card" style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:600,fontSize:14}}>{r.name}</span><StatusBadge status={r.status}/></div>
            <div style={{fontSize:12,color:"var(--text-muted)"}}>{r.provider_key} · {r.id.slice(0,8)} · {r.last_tested_at? new Date(r.last_tested_at).toLocaleString():"never tested"}</div>
            <div style={{display:"flex",gap:6,marginTop:"auto",flexWrap:"wrap"}}><button className="pl-btn pl-btn-secondary pl-btn-sm" onClick={()=>test(r.id)}>Test</button><button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={()=>openEdit(r)}>Edit</button><button className="pl-btn pl-btn-ghost pl-btn-sm" style={{color:"var(--danger)"}} onClick={()=>remove(r.id)}><I.trash/> Delete</button></div>
          </div>
        ))}
      </div>}
      
    {open && (
      <div className="pl-overlay" onClick={()=>setOpen(false)}>
        <div className="pl-modal" onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h3 style={{margin:0,fontSize:15}}>Add Provider</h3><button className="pl-icon-btn" onClick={()=>setOpen(false)}><I.x/></button></div>
          <div style={{display:"flex",gap:8,marginBottom:12}}>{["telegram","discord","smtp","webhook"].map(k=>(
            <button key={k} onClick={()=>setForm({...form,provider_key:k})} style={{flex:1,padding:"10px 8px",borderRadius:10,border: form.provider_key===k?"1px solid var(--accent)":"1px solid var(--border)",background: form.provider_key===k?"var(--accent-soft)":"var(--bg-input)",color: form.provider_key===k?"var(--text-primary)":"var(--text-secondary)",fontSize:12,fontWeight:600,textTransform:"capitalize"}}>{k}</button>
          ))}</div>
          <form onSubmit={create} style={{display:"flex",flexDirection:"column",gap:10}}>
            <div><label className="pl-label">Connection Name</label><input className="pl-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required /></div>
            {form.provider_key==="telegram" && <div><label className="pl-label">Bot Token</label><input className="pl-input" value={form.botToken} onChange={e=>setForm({...form,botToken:e.target.value})} required placeholder="123456:ABC..." /></div>}
            {form.provider_key==="discord" && <div><label className="pl-label">Webhook URL</label><input className="pl-input" value={form.webhookUrl} onChange={e=>setForm({...form,webhookUrl:e.target.value})} required placeholder="https://discord.com/api/webhooks/..." /></div>}
            {form.provider_key==="smtp" && <><div style={{display:"grid",gridTemplateColumns:"1fr 100px",gap:8}}><div><label className="pl-label">Host</label><input className="pl-input" value={form.host} onChange={e=>setForm({...form,host:e.target.value})} /></div><div><label className="pl-label">Port</label><input className="pl-input" value={form.port} onChange={e=>setForm({...form,port:e.target.value})} /></div></div><div><label className="pl-label">Sender Email</label><input className="pl-input" value={form.senderEmail} onChange={e=>setForm({...form,senderEmail:e.target.value})} /></div></>}
            {form.provider_key==="webhook" && <div><label className="pl-label">Target URL</label><input className="pl-input" value={form.url} onChange={e=>setForm({...form,url:e.target.value})} required placeholder="https://..." /></div>}
            {msg && <div style={{fontSize:12,color:"var(--danger)"}}>{msg}</div>}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}><button type="button" className="pl-btn pl-btn-ghost" onClick={()=>setOpen(false)}>Cancel</button><button type="submit" className="pl-btn pl-btn-primary">Save Provider</button></div>
          </form>
        </div>
      </div>
    )}
    {edit && (
      <div className="pl-overlay" onClick={()=>setEdit(null)}>
        <div className="pl-modal" onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h3 style={{margin:0,fontSize:15}}>Edit Provider</h3><button className="pl-icon-btn" onClick={()=>setEdit(null)}><I.x/></button></div>
          <form onSubmit={saveEdit} style={{display:"flex",flexDirection:"column",gap:10}}>
            <div><label className="pl-label">Name</label><input className="pl-input" value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})} required /></div>
            <div><label className="pl-label">Status</label><select className="pl-select" value={editForm.status} onChange={e=>setEditForm({...editForm,status:e.target.value})}><option value="active">active</option><option value="disabled">disabled</option></select></div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button type="button" className="pl-btn pl-btn-ghost" onClick={()=>setEdit(null)}>Cancel</button><button type="submit" className="pl-btn pl-btn-primary">Save</button></div>
          </form>
        </div>
      </div>
    )}
  </div>;
}

function Destinations({ tenantId }:{tenantId:string}){
  const [list,setList]=useState<any[]>([]); const [conns,setConns]=useState<any[]>([]);
  const [q,setQ]=useState(""); const [fStatus,setFStatus]=useState(""); const [fProvider,setFProvider]=useState("");
  const [form,setForm]=useState({provider_connection_id:"",name:"",chat_id:"",email:""});
  const [edit,setEdit]=useState<any|null>(null); const [editForm,setEditForm]=useState({name:"",status:"active",chat_id:"",email:""}); const [msg,setMsg]=useState<string|null>(null);

  const reload=useCallback(()=>{
    const query=qs({q:q||undefined,status:fStatus||undefined,provider_key:fProvider||undefined});
    return apiFetch(`/api/v1/tenants/${tenantId}/destinations${query}`).then(j=>setList(j.data));
  },[tenantId,q,fStatus,fProvider]);
  useEffect(()=>{ const t=setTimeout(reload,250); return()=>clearTimeout(t); },[reload]);
  useEffect(()=>{ apiFetch(`/api/v1/tenants/${tenantId}/provider-connections`).then(j=>setConns(j.data)).catch(()=>{}); },[tenantId]);

  async function create(e:React.FormEvent){ e.preventDefault(); setMsg(null);
    try{
      const cfg:Record<string,unknown>={}; if(form.chat_id) cfg.chat_id=form.chat_id; if(form.email) cfg.email=form.email;
      await apiFetch(`/api/v1/tenants/${tenantId}/destinations`,{method:"POST",body:JSON.stringify({provider_connection_id:form.provider_connection_id,name:form.name,config:cfg})});
      setForm({provider_connection_id:"",name:"",chat_id:"",email:""}); reload();
}catch(e:any){ setMsg(e.message || e.code || "Unknown error"); }
  }
  async function remove(id:string){ if(!confirm("Delete destination?")) return; await apiFetch(`/api/v1/tenants/${tenantId}/destinations/${id}`,{method:"DELETE"}); reload(); }
  function openEdit(r:any){ setEdit(r); const cfg=r.config_json??{}; setEditForm({name:r.name,status:r.status,chat_id:cfg.chat_id??"",email:cfg.email??""}); }
  async function saveEdit(e:React.FormEvent){ e.preventDefault(); if(!edit) return;
    const cfg:Record<string,unknown>={}; if(editForm.chat_id) cfg.chat_id=editForm.chat_id; if(editForm.email) cfg.email=editForm.email;
    await apiFetch(`/api/v1/tenants/${tenantId}/destinations/${edit.id}`,{method:"PATCH",body:JSON.stringify({name:editForm.name,status:editForm.status,config:cfg})}); setEdit(null); reload();
  }

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div><h2 style={{margin:0,fontSize:18}}>Destinations</h2><p style={{margin:"4px 0 0",fontSize:13,color:"var(--text-secondary)"}}>Route messages to chats, emails, channels, or HTTP endpoints.</p></div>
    <div className="pl-card" style={{display:"flex",gap:8,flexDirection:"column"}}>
      <strong style={{fontSize:13}}>Add destination</strong>
      <form onSubmit={create} style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <select className="pl-select" style={{maxWidth:220}} value={form.provider_connection_id} onChange={e=>setForm({...form,provider_connection_id:e.target.value})} required><option value="">Provider connection</option>{conns.map((c:any)=><option key={c.id} value={c.id}>{c.name} ({c.provider_key})</option>)}</select>
        <input className="pl-input" style={{maxWidth:180}} placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
        <input className="pl-input" style={{maxWidth:220}} placeholder="chat_id or email" value={form.chat_id||form.email} onChange={e=>setForm({...form,chat_id:e.target.value,email:e.target.value})} />
        <button className="pl-btn pl-btn-primary" type="submit"><I.plus/> Create</button>
      </form>
      {msg && <div style={{fontSize:12,color:"var(--danger)"}}>{msg}</div>}
    </div>
    <div className="pl-card" style={{padding:0,overflow:"hidden"}}>
      <div style={{display:"flex",gap:8,padding:"12px 16px",alignItems:"center",flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:1,maxWidth:260}}><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)"}}><I.search/></span><input className="pl-input" style={{paddingLeft:30}} placeholder="Search destinations..." value={q} onChange={e=>setQ(e.target.value)} /></div>
        <select className="pl-select" value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{maxWidth:140}}><option value="">All status</option><option value="active">active</option><option value="disabled">disabled</option></select>
        <select className="pl-select" value={fProvider} onChange={e=>setFProvider(e.target.value)} style={{maxWidth:160}}><option value="">All providers</option><option value="telegram">telegram</option><option value="discord">discord</option><option value="smtp">smtp</option><option value="webhook">webhook</option></select>
        <span style={{fontSize:12,color:"var(--text-muted)"}}>{list.length} total</span>
      </div>
      {list.length===0? <div className="pl-empty">No destinations yet.</div> :
      <div style={{overflow:"auto"}}><table className="pl-table"><thead><tr><th>Name</th><th>Type</th><th>Provider</th><th>Status</th><th>Updated</th><th /></tr></thead><tbody>{list.map((r:any)=><tr key={r.id}><td style={{fontWeight:500}}>{r.name}</td><td><span style={{fontSize:12,background:"var(--bg-card-alt)",border:"1px solid var(--border)",padding:"2px 6px",borderRadius:6}}>{r.destination_type}</span></td><td style={{fontSize:12,color:"var(--text-muted)"}}>{r.provider_name ?? r.provider_key ?? "-"}</td><td><StatusBadge status={r.status}/></td><td className="pl-mono" style={{color:"var(--text-muted)"}}>{new Date(r.updated_at).toLocaleString()}</td><td style={{display:"flex",gap:6}}><button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={()=>openEdit(r)}>Edit</button><button className="pl-btn pl-btn-ghost pl-btn-sm" style={{color:"var(--danger)"}} onClick={()=>remove(r.id)}><I.trash/></button></td></tr>)}</tbody></table></div>}
    </div>
    {edit && (
      <div className="pl-overlay" onClick={()=>setEdit(null)}>
        <div className="pl-modal" onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h3 style={{margin:0,fontSize:15}}>Edit Destination</h3><button className="pl-icon-btn" onClick={()=>setEdit(null)}><I.x/></button></div>
          <form onSubmit={saveEdit} style={{display:"flex",flexDirection:"column",gap:10}}>
            <div><label className="pl-label">Name</label><input className="pl-input" value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})} required /></div>
            <div><label className="pl-label">Status</label><select className="pl-select" value={editForm.status} onChange={e=>setEditForm({...editForm,status:e.target.value})}><option value="active">active</option><option value="disabled">disabled</option></select></div>
            <div><label className="pl-label">Config (chat_id / email)</label><div style={{display:"flex",gap:8}}><input className="pl-input" placeholder="chat_id" value={editForm.chat_id} onChange={e=>setEditForm({...editForm,chat_id:e.target.value})} /><input className="pl-input" placeholder="email" value={editForm.email} onChange={e=>setEditForm({...editForm,email:e.target.value})} /></div></div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button type="button" className="pl-btn pl-btn-ghost" onClick={()=>setEdit(null)}>Cancel</button><button type="submit" className="pl-btn pl-btn-primary">Save</button></div>
          </form>
        </div>
      </div>
    )}
  </div>;
}

function Messages({ tenantId }:{tenantId:string}){
  const [list,setList]=useState<any[]>([]); const [detail,setDetail]=useState<any>(null); const [q,setQ]=useState(""); const [drawer,setDrawer]=useState<any>(null);
  const [page,setPage]=useState(1); const [total,setTotal]=useState(0); const [per]=useState(10);
  const [showSend,setShowSend]=useState(false); const [destinations,setDestinations]=useState<any[]>([]);
  const [sendForm,setSendForm]=useState({subject:"",body:"",destination_ids:[] as string[]}); const [sendMsg,setSendMsg]=useState<string|null>(null);

  const reload=useCallback(()=>{
    const query=qs({q:q||undefined, page:String(page), per_page:String(per)});
    return apiFetch(`/api/v1/tenants/${tenantId}/messages${query}`).then(j=>{ setList(j.data); setTotal(j.meta?.total ?? j.data.length); });
  },[tenantId,q,page,per]);
  useEffect(()=>{ const t=setTimeout(reload,250); return()=>clearTimeout(t); },[reload]);
  useEffect(()=>{ if(showSend) apiFetch(`/api/v1/tenants/${tenantId}/destinations`).then(j=>setDestinations(j.data)).catch(()=>{}); },[tenantId,showSend]);

  async function open(id:string){ const j=await apiFetch(`/api/v1/tenants/${tenantId}/messages/${id}`); setDetail(j.data); }
  async function retry(dlvId:string){ await apiFetch(`/api/v1/tenants/${tenantId}/deliveries/${dlvId}/retry`,{method:"POST"}); setSendMsg("Retry queued"); setTimeout(()=>setSendMsg(null),2000); }
  async function openDelivery(d:any){
    try{ const j=await apiFetch(`/api/v1/tenants/${tenantId}/deliveries/${d.id}`); setDrawer({...d, attempts:j.data.attempts, attempt_count:j.data.attempts?.length}); }catch{ setDrawer(d); }
  }
  async function send(e:React.FormEvent){
    e.preventDefault(); setSendMsg(null);
    try{
      await apiFetch(`/api/v1/tenants/${tenantId}/messages`,{method:"POST",body:JSON.stringify({destinations:sendForm.destination_ids, message:{subject:sendForm.subject||undefined, body:sendForm.body}})});
      setShowSend(false); setSendForm({subject:"",body:"",destination_ids:[]}); setSendMsg("Sent"); reload();
    }catch(er:any){ setSendMsg(er.message); }
  }
  const totalPages=Math.max(1,Math.ceil(total/per));

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><h2 style={{margin:0,fontSize:18}}>Messages</h2><p style={{margin:"4px 0 0",fontSize:13,color:"var(--text-secondary)"}}>Track outbound communication and delivery status.</p></div><button className="pl-btn pl-btn-primary" onClick={()=>setShowSend(true)}><I.plus/> Send Message</button></div>
    {sendMsg && <div style={{fontSize:12,padding:"10px 12px",borderRadius:8,background:"var(--bg-card)",border:"1px solid var(--border)"}}>{sendMsg}</div>}
    <div className="pl-card" style={{padding:0,overflow:"hidden"}}>
      <div style={{display:"flex",gap:8,padding:"12px 16px",alignItems:"center",flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:1,maxWidth:280}}><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)"}}><I.search/></span><input className="pl-input" style={{paddingLeft:30}} placeholder="Search subject, body, id..." value={q} onChange={e=>{ setQ(e.target.value); setPage(1); }} /></div>
        <span style={{fontSize:12,color:"var(--text-muted)"}}>{total} total · page {page}/{totalPages}</span>
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          <button className="pl-btn pl-btn-ghost pl-btn-sm" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
          <button className="pl-btn pl-btn-ghost pl-btn-sm" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next</button>
        </div>
      </div>
      <div style={{overflow:"auto"}}>
        <table className="pl-table"><thead><tr><th>Message</th><th>Destinations</th><th>Created</th></tr></thead><tbody>
          {list.length===0? <tr><td colSpan={3}><div className="pl-empty">Empty — send via dashboard or machine API: POST /api/v1/messages with Bearer pl_live_...</div></td></tr> :
            list.map((r:any)=><tr key={r.id} onClick={()=>open(r.id)} style={{cursor:"pointer"}}><td><div style={{fontWeight:500,fontSize:13}}>{r.subject ?? "(no subject)"}</div><div className="pl-mono" style={{color:"var(--text-muted)",fontSize:11}}>{r.id.slice(0,14)} · {r.body.slice(0,48)}</div></td><td className="pl-mono" style={{fontSize:11}}>{r.destination_ids?.length ?? "-"}</td><td style={{color:"var(--text-muted)",fontSize:12}}>{new Date(r.created_at).toLocaleString()}</td></tr>)}
        </tbody></table>
      </div>
    </div>
    {detail && <div className="pl-card">
      <div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{fontWeight:600}}>{detail.message.subject ?? detail.message.id}</div><div className="pl-mono" style={{fontSize:11,color:"var(--text-muted)"}}>{detail.message.id} · {new Date(detail.message.created_at).toLocaleString()}</div></div><button className="pl-icon-btn" onClick={()=>setDetail(null)}><I.x/></button></div>
      <div style={{marginTop:12,background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:8,padding:12}}><div style={{fontSize:12,color:"var(--text-muted)",marginBottom:4}}>Body</div><div style={{fontSize:13,whiteSpace:"pre-wrap"}}>{detail.message.body}</div></div>
      <div style={{marginTop:12}}><strong style={{fontSize:12}}>Deliveries</strong><div style={{display:"flex",flexDirection:"column",gap:6,marginTop:8}}>{detail.deliveries?.map((d:any)=><div key={d.id} onClick={()=>openDelivery(d)} style={{display:"flex",gap:10,alignItems:"center",padding:"10px 12px",background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:8,cursor:"pointer"}}><StatusBadge status={d.status}/><span className="pl-mono" style={{fontSize:11,flex:1}}>{d.id.slice(0,12)} → {d.destination_id.slice(0,8)}</span>{["FAILED","DEAD","RETRYING"].includes(d.status) && <button className="pl-btn pl-btn-secondary pl-btn-sm" onClick={e=>{e.stopPropagation();retry(d.id);}}>Retry</button>}<span style={{color:"var(--text-muted)"}}>›</span></div>)}</div></div>
    </div>}
    {drawer && (
      <div className="pl-drawer">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:"1px solid var(--border)"}}><strong>Delivery Detail</strong><button className="pl-icon-btn" onClick={()=>setDrawer(null)}><I.x/></button></div>
        <div style={{padding:20,display:"flex",flexDirection:"column",gap:12,overflow:"auto"}}>
          <div className="pl-mono" style={{fontSize:12,wordBreak:"break-all",background:"var(--bg-input)",padding:10,borderRadius:8,border:"1px solid var(--border)"}}>{drawer.id}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,fontSize:13}}><div><div style={{color:"var(--text-muted)",fontSize:11}}>Status</div><StatusBadge status={drawer.status}/></div><div><div style={{color:"var(--text-muted)",fontSize:11}}>Attempts</div>{drawer.attempt_count ?? drawer.attempts?.length ?? "-"}</div><div><div style={{color:"var(--text-muted)",fontSize:11}}>Destination</div><span className="pl-mono" style={{fontSize:11}}>{drawer.destination_id}</span></div><div><div style={{color:"var(--text-muted)",fontSize:11}}>Updated</div>{new Date(drawer.updated_at).toLocaleString()}</div></div>
          {(drawer.last_error_message||drawer.last_error_code) && <div style={{background:"var(--danger-soft)",border:"1px solid rgba(239,68,68,0.2)",padding:10,borderRadius:8,fontSize:12}}><strong>{drawer.last_error_code}</strong> {drawer.last_error_message}</div>}
          <div style={{borderTop:"1px solid var(--border)",paddingTop:12}}><strong style={{fontSize:12}}>Attempts</strong>{(drawer.attempts ?? []).length? drawer.attempts.map((a:any,i:number)=><div key={i} style={{padding:"8px 0",borderBottom:"1px solid var(--border-subtle)",fontSize:12}}><div>{a.error_message ?? a.result ?? a.status} {a.provider_status_code?`(${a.provider_status_code})`:""}</div><div style={{color:"var(--text-muted)",fontSize:11}}>{a.created_at? new Date(a.created_at).toLocaleString(): a.started_at? new Date(a.started_at).toLocaleString():""}</div></div>) : <div style={{fontSize:12,color:"var(--text-muted)",marginTop:6}}>No attempt logs.</div>}</div>
          {["FAILED","DEAD","RETRYING"].includes(drawer.status) && <button className="pl-btn pl-btn-primary" onClick={()=>retry(drawer.id)}>Retry delivery</button>}
        </div>
      </div>
    )}
    {showSend && (
      <div className="pl-overlay" onClick={()=>setShowSend(false)}>
        <div className="pl-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:520}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h3 style={{margin:0,fontSize:15}}>Send Message</h3><button className="pl-icon-btn" onClick={()=>setShowSend(false)}><I.x/></button></div>
          <form onSubmit={send} style={{display:"flex",flexDirection:"column",gap:10}}>
            <div><label className="pl-label">Destinations (hold Cmd/Ctrl to select multiple)</label>
              <select multiple className="pl-input" style={{height:120}} value={sendForm.destination_ids} onChange={e=>setSendForm({...sendForm,destination_ids:Array.from(e.target.selectedOptions).map(o=>o.value)})} required>
                {destinations.map((d:any)=><option key={d.id} value={d.id}>{d.name} ({d.destination_type})</option>)}
              </select>
            </div>
            <div><label className="pl-label">Subject (optional)</label><input className="pl-input" value={sendForm.subject} onChange={e=>setSendForm({...sendForm,subject:e.target.value})} placeholder="Production Alert" /></div>
            <div><label className="pl-label">Body</label><textarea className="pl-input" style={{minHeight:90}} value={sendForm.body} onChange={e=>setSendForm({...sendForm,body:e.target.value})} required placeholder="Message body..." /></div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button type="button" className="pl-btn pl-btn-ghost" onClick={()=>setShowSend(false)}>Cancel</button><button type="submit" className="pl-btn pl-btn-primary">Send</button></div>
          </form>
        </div>
      </div>
    )}
  </div>;
}

function Webhooks({ tenantId }:{tenantId:string}){
  const [eps,setEps]=useState<any[]>([]); const [events,setEvents]=useState<any[]>([]); const [tab,setTab]=useState<"endpoints"|"events">("endpoints");
  const [form,setForm]=useState({name:"",forwarding_url:""}); const [showCreate,setShowCreate]=useState(false); const [edit,setEdit]=useState<any|null>(null); const [editForm,setEditForm]=useState({name:"",forwarding_url:"",status:"active"});
  const [selectedEvent,setSelectedEvent]=useState<any|null>(null); const [eventAttempts,setEventAttempts]=useState<any[]>([]); const [msg,setMsg]=useState<string|null>(null);
  const [page,setPage]=useState(1); const [total,setTotal]=useState(0);
  const [ipFor,setIpFor]=useState<string|null>(null); const [ipList,setIpList]=useState<any[]>([]); const [ipForm,setIpForm]=useState({cidr:"",description:""});

  const reload=useCallback(()=>{ apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints`).then(j=>setEps(j.data)); },[tenantId]);
  const reloadEvents=useCallback(()=>{
    apiFetch(`/api/v1/tenants/${tenantId}/webhook-events?page=${page}&per_page=10`).then(j=>{ setEvents(j.data); setTotal(j.meta?.total ?? j.data.length); }).catch(()=>{});
  },[tenantId,page]);
  useEffect(()=>{ reload(); },[reload]);
  useEffect(()=>{ if(tab==="events") reloadEvents(); },[tab,reloadEvents]);

  async function create(e:React.FormEvent){ e.preventDefault(); await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints`,{method:"POST",body:JSON.stringify({name:form.name,forwarding_url:form.forwarding_url||undefined})}); setForm({name:"",forwarding_url:""}); setShowCreate(false); reload(); }
  async function remove(id:string){ if(!confirm("Delete endpoint?")) return; await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints/${id}`,{method:"DELETE"}); reload(); }
  function openEdit(r:any){ setEdit(r); setEditForm({name:r.name, forwarding_url:r.forwarding_config_json?.url ?? "", status:r.status}); }
  async function saveEdit(e:React.FormEvent){ e.preventDefault(); if(!edit) return; await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints/${edit.id}`,{method:"PATCH",body:JSON.stringify({name:editForm.name, forwarding_url:editForm.forwarding_url||null, status:editForm.status})}); setEdit(null); reload(); }
  async function openEvent(ev:any){
    const j=await apiFetch(`/api/v1/tenants/${tenantId}/webhook-events/${ev.id}`); setSelectedEvent(j.data.event); setEventAttempts(j.data.attempts);
  }
  async function retry(evId:string){ try{ const j=await apiFetch(`/api/v1/tenants/${tenantId}/webhook-events/${evId}/retry`,{method:"POST"}); setMsg(`Retry: ${JSON.stringify(j.data)}`);}catch(e:any){ setMsg(e.message || e.code || "Unknown error"); } }
  async function loadIp(endpointId:string){ setIpFor(endpointId); const j=await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints/${endpointId}/ip-allowlist`); setIpList(j.data); }
  async function addIp(e:React.FormEvent){ e.preventDefault(); if(!ipFor) return; await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints/${ipFor}/ip-allowlist`,{method:"POST",body:JSON.stringify(ipForm)}); setIpForm({cidr:"",description:""}); loadIp(ipFor); }
  async function delIp(entryId:string){ if(!ipFor) return; await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints/${ipFor}/ip-allowlist/${entryId}`,{method:"DELETE"}); loadIp(ipFor); }

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}><div><h2 style={{margin:0,fontSize:18}}>Webhooks</h2><p style={{margin:"4px 0 0",fontSize:13,color:"var(--text-secondary)"}}>Receive and forward inbound webhooks.</p></div>
      <button className="pl-btn pl-btn-primary" onClick={()=>setShowCreate(true)}><I.plus/> Create Endpoint</button>
    </div>
    {msg && <div style={{fontSize:12,padding:"8px 12px",borderRadius:8,background:"var(--bg-card)",border:"1px solid var(--border)"}}>{msg}</div>}
    <div style={{display:"flex",gap:8,borderBottom:"1px solid var(--border)",paddingBottom:8}}><button onClick={()=>setTab("endpoints")} style={{padding:"6px 12px",borderRadius:8,border:"none",background:tab==="endpoints"?"var(--accent)":"transparent",color:tab==="endpoints"?"white":"var(--text-secondary)",fontSize:13,fontWeight:600,cursor:"pointer"}}>Endpoints</button><button onClick={()=>setTab("events")} style={{padding:"6px 12px",borderRadius:8,border:"none",background:tab==="events"?"var(--accent)":"transparent",color:tab==="events"?"white":"var(--text-secondary)",fontSize:13,fontWeight:600,cursor:"pointer"}}>Events</button></div>
    {tab==="endpoints"? (
      <div className="pl-card" style={{padding:0,overflow:"hidden"}}>{eps.length===0? <div className="pl-empty"><div className="pl-empty-ic"><I.webhook/></div>No endpoints yet.</div> :
        <table className="pl-table"><thead><tr><th>Name</th><th>Public ID</th><th>URL</th><th>Status</th><th /></tr></thead><tbody>{eps.map((r:any)=><tr key={r.id}><td style={{fontWeight:500}}>{r.name}</td><td className="pl-mono"><span style={{background:"var(--bg-input)",border:"1px solid var(--border)",padding:"2px 6px",borderRadius:6}}>{r.public_identifier}</span> <button onClick={()=>navigator.clipboard.writeText(r.public_identifier)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)"}}><I.copy/></button></td><td className="pl-mono" style={{fontSize:11}}>/hooks/{r.public_identifier} {r.forwarding_config_json?.url && <span style={{color:"var(--text-muted)"}}>→ {r.forwarding_config_json.url}</span>}</td><td><StatusBadge status={r.status ?? "Active"}/></td><td style={{display:"flex",gap:6}}><button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={()=>openEdit(r)}>Edit</button><button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={()=>loadIp(r.id)}>IP</button><button className="pl-btn pl-btn-ghost pl-btn-sm" style={{color:"var(--danger)"}} onClick={()=>remove(r.id)}><I.trash/></button></td></tr>)}</tbody></table>}</div>
    ) : (
      <div className="pl-card" style={{padding:0,overflow:"hidden"}}>{events.length===0? <div className="pl-empty">No events yet. POST to /hooks/:publicIdentifier</div> :
        <div>
          <table className="pl-table"><thead><tr><th>Time</th><th>Endpoint</th><th>Method</th><th>Source IP</th><th>Status</th><th /></tr></thead><tbody>{events.map((e:any)=><tr key={e.id} style={{cursor:"pointer"}} onClick={()=>openEvent(e)}><td style={{fontSize:12,color:"var(--text-muted)"}}>{new Date(e.created_at ?? e.received_at).toLocaleTimeString()}</td><td>{e.webhook_endpoint_id?.slice(0,8) ?? "-"}</td><td><span style={{fontFamily:"var(--font-mono)",fontSize:11,background:"var(--bg-input)",padding:"2px 6px",borderRadius:6,border:"1px solid var(--border)"}}>{e.method ?? "POST"}</span></td><td className="pl-mono" style={{fontSize:11}}>{e.source_ip ?? "-"}</td><td><StatusBadge status={e.status ?? "received"}/></td><td><button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={ev=>{ev.stopPropagation(); retry(e.id);}}>Retry</button></td></tr>)}</tbody></table>
          <div style={{display:"flex",gap:8,padding:"10px 16px",justifyContent:"flex-end",borderTop:"1px solid var(--border)"}}>
            <button className="pl-btn pl-btn-ghost pl-btn-sm" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
            <span style={{fontSize:12,color:"var(--text-muted)",alignSelf:"center"}}>page {page} · {total} total</span>
            <button className="pl-btn pl-btn-ghost pl-btn-sm" disabled={events.length<10} onClick={()=>setPage(p=>p+1)}>Next</button>
          </div>
        </div>
      }</div>
    )}
    {edit && (
      <div className="pl-overlay" onClick={()=>setEdit(null)}>
        <div className="pl-modal" onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h3 style={{margin:0,fontSize:15}}>Edit Endpoint</h3><button className="pl-icon-btn" onClick={()=>setEdit(null)}><I.x/></button></div>
          <form onSubmit={saveEdit} style={{display:"flex",flexDirection:"column",gap:10}}>
            <div><label className="pl-label">Name</label><input className="pl-input" value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})} required /></div>
            <div><label className="pl-label">Forwarding URL</label><input className="pl-input" value={editForm.forwarding_url} onChange={e=>setEditForm({...editForm,forwarding_url:e.target.value})} placeholder="https://..." /></div>
            <div><label className="pl-label">Status</label><select className="pl-select" value={editForm.status} onChange={e=>setEditForm({...editForm,status:e.target.value})}><option value="active">active</option><option value="disabled">disabled</option></select></div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button type="button" className="pl-btn pl-btn-ghost" onClick={()=>setEdit(null)}>Cancel</button><button type="submit" className="pl-btn pl-btn-primary">Save</button></div>
          </form>
        </div>
      </div>
    )}
    {selectedEvent && (
      <div className="pl-drawer">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:"1px solid var(--border)"}}><strong>Event {selectedEvent.id.slice(0,8)}</strong><button className="pl-icon-btn" onClick={()=>setSelectedEvent(null)}><I.x/></button></div>
        <div style={{padding:20,display:"flex",flexDirection:"column",gap:12,overflow:"auto"}}>
          <div className="pl-mono" style={{fontSize:11,background:"var(--bg-input)",padding:10,borderRadius:8,border:"1px solid var(--border)",whiteSpace:"pre-wrap",wordBreak:"break-all"}}>{JSON.stringify(selectedEvent.payload_json, null, 2)}</div>
          <div style={{fontSize:12}}><strong>Forward attempts</strong>{eventAttempts.length===0? <div style={{color:"var(--text-muted)",marginTop:6}}>No attempts yet.</div> : eventAttempts.map((a:any,i:number)=><div key={i} style={{padding:"8px 0",borderBottom:"1px solid var(--border-subtle)",fontSize:12}}>{a.status} {a.response_status?`(${a.response_status})`:""} {a.error_message && `— ${a.error_message}`} <span style={{color:"var(--text-muted)"}}>{new Date(a.created_at).toLocaleString()}</span></div>)}</div>
          <button className="pl-btn pl-btn-primary" onClick={()=>retry(selectedEvent.id)}>Retry forward</button>
        </div>
      </div>
    )}
    {showCreate && (
      <div className="pl-overlay" onClick={()=>setShowCreate(false)}>
        <div className="pl-modal" onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h3 style={{margin:0,fontSize:15}}>Create Endpoint</h3><button className="pl-icon-btn" onClick={()=>setShowCreate(false)}><I.x/></button></div>
          <form onSubmit={create} style={{display:"flex",flexDirection:"column",gap:10}}>
            <div><label className="pl-label">Endpoint name</label><input className="pl-input" placeholder="my-hook" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required /></div>
            <div><label className="pl-label">Forwarding URL (optional)</label><input className="pl-input" placeholder="https://..." value={form.forwarding_url} onChange={e=>setForm({...form,forwarding_url:e.target.value})} /></div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button type="button" className="pl-btn pl-btn-ghost" onClick={()=>setShowCreate(false)}>Cancel</button><button className="pl-btn pl-btn-primary" type="submit"><I.plus/> Create</button></div>
          </form>
        </div>
      </div>
    )}
    {ipFor && (
      <div className="pl-overlay" onClick={()=>setIpFor(null)}>
        <div className="pl-modal" onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h3 style={{margin:0,fontSize:15}}>IP Allowlist</h3><button className="pl-icon-btn" onClick={()=>setIpFor(null)}><I.x/></button></div>
          <form onSubmit={addIp} style={{display:"flex",gap:8,marginBottom:12}}>
            <input className="pl-input" placeholder="1.2.3.4/32" value={ipForm.cidr} onChange={e=>setIpForm({...ipForm,cidr:e.target.value})} required style={{flex:1}}/>
            <input className="pl-input" placeholder="description" value={ipForm.description} onChange={e=>setIpForm({...ipForm,description:e.target.value})} style={{flex:1}}/>
            <button className="pl-btn pl-btn-primary" type="submit">Add</button>
          </form>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>{ipList.length===0? <div style={{fontSize:12,color:"var(--text-muted)"}}>No entries — all IPs allowed.</div> : ipList.map((r:any)=><div key={r.id} style={{display:"flex",gap:8,alignItems:"center",padding:"8px 10px",background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:8}}><span className="pl-mono" style={{fontSize:12,flex:1}}>{r.cidr}</span><span style={{fontSize:11,color:"var(--text-muted)"}}>{r.description ?? ""}</span><button className="pl-btn pl-btn-ghost pl-btn-sm" style={{color:"var(--danger)"}} onClick={()=>delIp(r.id)}><I.trash/></button></div>)}</div>
        </div>
      </div>
    )}
  </div>;
}

function Logs({ tenantId }:{tenantId:string}){
  const [logs,setLogs]=useState<any[]>([]); const [dels,setDels]=useState<any[]>([]);
  const [filter,setFilter]=useState("All"); const [status,setStatus]=useState(""); const [page,setPage]=useState(1); const [total,setTotal]=useState(0);
  const cats=["All","Delivery","Webhook","Security","Provider","System"];
  const reloadDels=useCallback(()=>{
    const q=qs({status:status||undefined, page:String(page), per_page:"10"});
    apiFetch(`/api/v1/tenants/${tenantId}/deliveries${q}`).then(j=>{ setDels(j.data); setTotal(j.meta?.total ?? j.data.length); }).catch(()=>{});
  },[tenantId,status,page]);
  useEffect(()=>{ apiFetch(`/api/v1/tenants/${tenantId}/logs`).then(j=>setLogs(j.data)).catch(()=>{}); },[tenantId]);
  useEffect(()=>{ reloadDels(); },[reloadDels]);

  const filteredLogs=useMemo(()=>{
    if(filter==="All") return logs;
    const map:Record<string,string[]>={ Delivery:["delivery","provider_connection"], Webhook:["webhook"], Security:["api_key","blocked_ip","ip_allowlist"], Provider:["provider"], System:["tenant","member"] };
    const keys=map[filter]??[];
    return logs.filter((l:any)=> keys.some(k=> (l.action??"").includes(k) || (l.target_type??"").includes(k)));
  },[logs,filter]);

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div><h2 style={{margin:0,fontSize:18}}>Logs</h2><p style={{margin:"4px 0 0",fontSize:13,color:"var(--text-secondary)"}}>Operational events, not raw server logs.</p></div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{cats.map(c=><button key={c} onClick={()=>setFilter(c)} style={{padding:"6px 12px",borderRadius:999,border:"1px solid var(--border)",background:filter===c?"var(--accent)":"var(--bg-card)",color:filter===c?"white":"var(--text-secondary)",fontSize:12,fontWeight:600,cursor:"pointer"}}>{c}</button>)}</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div className="pl-card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <span className="pl-card-title">Deliveries</span>
          <select className="pl-select" value={status} onChange={e=>{ setStatus(e.target.value); setPage(1); }} style={{maxWidth:150}}>
            <option value="">All status</option><option value="QUEUED">QUEUED</option><option value="PROCESSING">PROCESSING</option><option value="DELIVERED">DELIVERED</option><option value="FAILED">FAILED</option><option value="RETRYING">RETRYING</option><option value="DEAD">DEAD</option>
          </select>
        </div>
        {dels.length===0? <div className="pl-empty">No deliveries.</div> : <table className="pl-table"><thead><tr><th>ID</th><th>Status</th><th>Updated</th></tr></thead><tbody>{dels.map((r:any)=><tr key={r.id}><td className="pl-mono" style={{fontSize:11}}>{r.id.slice(0,12)}</td><td><StatusBadge status={r.status}/></td><td style={{fontSize:12,color:"var(--text-muted)"}}>{new Date(r.updated_at).toLocaleString()}</td></tr>)}</tbody></table>}
        <div style={{display:"flex",gap:6,justifyContent:"flex-end",marginTop:10}}>
          <button className="pl-btn pl-btn-ghost pl-btn-sm" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
          <span style={{fontSize:12,color:"var(--text-muted)",alignSelf:"center"}}>{total} total</span>
          <button className="pl-btn pl-btn-ghost pl-btn-sm" disabled={dels.length<10} onClick={()=>setPage(p=>p+1)}>Next</button>
        </div>
      </div>
      <div className="pl-card"><div className="pl-card-title" style={{marginBottom:12}}>Audit logs</div>{filteredLogs.length===0? <div className="pl-empty" style={{fontSize:12}}>No audit logs yet.</div> : <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:420,overflow:"auto"}}>{filteredLogs.slice(0,20).map((l:any,i:number)=><div key={i} style={{padding:"10px 12px",background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:8}}><div style={{fontSize:12,fontWeight:500}}>{l.action ?? l.event ?? JSON.stringify(l).slice(0,80)}</div><div style={{fontSize:11,color:"var(--text-muted)"}}>{l.created_at? new Date(l.created_at).toLocaleString():""} · {l.actor ?? ""} {l.target_type?`· ${l.target_type}`:""}</div></div>)}</div>}</div>
    </div>
  </div>;
}

function Settings({ tenantId }:{tenantId:string}){
  const SCOPES=["messages:write","messages:read","deliveries:read","deliveries:retry"] as const;
  const PROVIDERS=["telegram","discord","smtp","webhook"] as const;
  const [keys,setKeys]=useState<any[]>([]); const [destinations,setDestinations]=useState<any[]>([]);
  const [name,setName]=useState(""); const [expires,setExpires]=useState("");
  const [lastKey,setLastKey]=useState<string|null>(null); const [msg,setMsg]=useState<string|null>(null); const [toast,setToast]=useState<string|null>(null);
  const [ipFor,setIpFor]=useState<string|null>(null); const [ipList,setIpList]=useState<any[]>([]); const [ipForm,setIpForm]=useState({cidr:"",description:""});
  const [editKey,setEditKey]=useState<any|null>(null); const [editForm,setEditForm]=useState({name:"",expires_at:"",scopes:[] as string[], allowed_providers:[] as string[], allowed_destination_ids:[] as string[]});
  const [q,setQ]=useState(""); const [fStatus,setFStatus]=useState<""|"active"|"revoked"|"expired">(""); const [showCreate,setShowCreate]=useState(true);
  const [confirm,setConfirm]=useState<{id:string;action:"revoke"|"delete";name:string}|null>(null);
  const reload=()=> apiFetch(`/api/v1/tenants/${tenantId}/api-keys`).then(j=>setKeys(j.data));
  useEffect(()=>{ reload(); apiFetch(`/api/v1/tenants/${tenantId}/destinations`).then(j=>setDestinations(j.data)).catch(()=>{}); },[tenantId]);
  useEffect(()=>{ if(toast){ const t=setTimeout(()=>setToast(null),2200); return()=>clearTimeout(t);} },[toast]);
  function copy(text:string, label="Copied"){ navigator.clipboard.writeText(text).then(()=>setToast(label)).catch(()=>setToast("Copy failed")); }
  async function create(e:React.FormEvent){ e.preventDefault(); setMsg(null);
    const payload:any={name}; if(expires) payload.expires_at=new Date(expires).toISOString();
    try{ const j=await apiFetch(`/api/v1/tenants/${tenantId}/api-keys`,{method:"POST",body:JSON.stringify(payload)}); setLastKey(j.data.key); setName(""); setExpires(""); setToast("API key created — copy secret now"); reload(); }catch(er:any){ setMsg(er.message); }
  }
  async function revoke(id:string){ await apiFetch(`/api/v1/tenants/${tenantId}/api-keys/${id}/revoke`,{method:"POST"}); setToast("Key revoked"); reload(); }
  async function delKey(id:string){
    try{ await apiFetch(`/api/v1/tenants/${tenantId}/api-keys/${id}`,{method:"DELETE"}); setToast("Key deleted"); reload(); }catch(er:any){ setMsg(er.message); setToast(er.message); }
  }
  async function openIp(keyId:string){ setIpFor(keyId); const j=await apiFetch(`/api/v1/tenants/${tenantId}/api-keys/${keyId}/ip-allowlist`); setIpList(j.data); }
  async function addIp(e:React.FormEvent){ e.preventDefault(); if(!ipFor) return; try{ await apiFetch(`/api/v1/tenants/${tenantId}/api-keys/${ipFor}/ip-allowlist`,{method:"POST",body:JSON.stringify(ipForm)}); setIpForm({cidr:"",description:""}); openIp(ipFor); setToast("IP added"); }catch(er:any){ setMsg(er.message); } }
  async function delIp(entryId:string){ if(!ipFor) return; await apiFetch(`/api/v1/tenants/${tenantId}/api-keys/${ipFor}/ip-allowlist/${entryId}`,{method:"DELETE"}); openIp(ipFor); setToast("IP removed"); }
  function openEdit(k:any){
    const sc=Array.isArray(k.scopes)?k.scopes:(typeof k.scopes==="string"?JSON.parse(k.scopes||"[]"):k.scopes||[]);
    const ap=Array.isArray(k.allowed_providers)?k.allowed_providers:(typeof k.allowed_providers==="string"?JSON.parse(k.allowed_providers||"[]"):k.allowed_providers||[]);
    const ad=Array.isArray(k.allowed_destination_ids)?k.allowed_destination_ids:(typeof k.allowed_destination_ids==="string"?JSON.parse(k.allowed_destination_ids||"[]"):k.allowed_destination_ids||[]);
    setEditKey(k); setEditForm({name:k.name, expires_at:k.expires_at? new Date(k.expires_at).toISOString().slice(0,16):"", scopes:sc, allowed_providers:ap, allowed_destination_ids:ad});
  }
  async function saveEdit(e:React.FormEvent){ e.preventDefault(); if(!editKey) return; setMsg(null);
    const payload:any={name:editForm.name, scopes:editForm.scopes, allowed_providers:editForm.allowed_providers, allowed_destination_ids:editForm.allowed_destination_ids};
    payload.expires_at = editForm.expires_at ? new Date(editForm.expires_at).toISOString() : null;
    try{ await apiFetch(`/api/v1/tenants/${tenantId}/api-keys/${editKey.id}`,{method:"PATCH",body:JSON.stringify(payload)}); setEditKey(null); setToast("Key updated"); reload(); }catch(er:any){ setMsg(er.message); }
  }
  function fmtScopes(v:any){ const a=Array.isArray(v)?v:(typeof v==="string"?JSON.parse(v||"[]"):v||[]); return a; }
  function isExpiredAt(v:string|null){ if(!v) return false; return new Date(v) <= new Date(); }
  function daysLeft(v:string|null){ if(!v) return null; const d=Math.ceil((new Date(v).getTime()-Date.now())/86400000); return d; }
  const stats={total:keys.length, active:keys.filter(k=>k.status==="active" && !isExpiredAt(k.expires_at)).length, revoked:keys.filter(k=>k.status==="revoked").length, expired:keys.filter(k=>isExpiredAt(k.expires_at)).length};
  const filtered=keys.filter(k=>{
    if(q && !`${k.name} ${k.id} ${k.key_prefix}`.toLowerCase().includes(q.toLowerCase())) return false;
    if(fStatus==="active" && (k.status!=="active" || isExpiredAt(k.expires_at))) return false;
    if(fStatus==="revoked" && k.status!=="revoked") return false;
    if(fStatus==="expired" && !isExpiredAt(k.expires_at)) return false;
    return true;
  });
  const destName=(id:string)=> destinations.find((d:any)=>d.id===id)?.name ?? id.slice(0,8);

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
      <div><h2 style={{margin:0,fontSize:18}}>API Keys</h2><p style={{margin:"4px 0 0",fontSize:13,color:"var(--text-secondary)"}}>Token akses mesin. Secret full hanya tampil sekali — simpan aman. Key lama tetap bisa salin prefix/ID, edit, revoke, delete.</p></div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}><span className="pl-pill" style={{background:"var(--success-soft)",borderColor:"rgba(34,197,94,0.18)",color:"var(--success)"}}>● {stats.active} active</span><span className="pl-pill">{stats.total} total</span><span className="pl-pill" style={{color:stats.expired?"var(--danger)":"var(--text-muted)"}}>⏰ {stats.expired} expired</span><span className="pl-pill" style={{color:"var(--text-muted)"}}>{stats.revoked} revoked</span></div>
    </div>

    <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 14px",display:"flex",gap:10,alignItems:"flex-start"}}>
      <div style={{width:28,height:28,borderRadius:8,background:"var(--accent-soft)",border:"1px solid var(--accent-border)",display:"grid",placeItems:"center",flexShrink:0,color:"var(--accent)",fontSize:14}}>ℹ</div>
      <div style={{fontSize:12,lineHeight:1.6,color:"var(--text-secondary)"}}>
        <strong style={{color:"var(--text-primary)"}}>Cara pakai:</strong> <span className="pl-mono" style={{background:"var(--bg-input)",border:"1px solid var(--border)",padding:"1px 6px",borderRadius:6}}>Authorization: Bearer pl_live_&lt;prefix&gt;.&lt;secret&gt;</span> · Secret tidak bisa dilihat lagi setelah create — hanya <strong>prefix</strong> + <strong>ID</strong> yang bisa disalin dari key lama. Revoke dulu baru bisa Delete (hard delete).
        <div style={{marginTop:6,color:"var(--text-muted)"}}>Scopes kosong = akses penuh. Batasi provider/destination untuk least-privilege.</div>
      </div>
    </div>

    {toast && <div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:"#111",color:"white",padding:"10px 14px",borderRadius:999,border:"1px solid #2A2A2A",fontSize:12,boxShadow:"0 8px 24px rgba(0,0,0,0.4)",zIndex:60}}>{toast}</div>}
    {msg && <div style={{fontSize:12,padding:"10px 12px",borderRadius:8,background:"var(--danger-soft)",border:"1px solid rgba(239,68,68,0.2)",color:"var(--danger)",display:"flex",justifyContent:"space-between",gap:8}}><span>{msg}</span><button onClick={()=>setMsg(null)} style={{background:"transparent",border:"none",color:"inherit",cursor:"pointer"}}><I.x/></button></div>}

    <div className="pl-card" style={{padding:0,overflow:"hidden"}}>
      <button onClick={()=>setShowCreate(v=>!v)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",background:"transparent",border:"none",cursor:"pointer",textAlign:"left"}}>
        <span style={{fontWeight:600,fontSize:13}}>{showCreate?"▾":"▸"} Buat API Key baru</span>
        <span style={{fontSize:11,color:"var(--text-muted)"}}>{showCreate?"sembunyikan":"tampilkan"} form</span>
      </button>
      {showCreate && (
        <form onSubmit={create} style={{display:"flex",flexDirection:"column",gap:12,padding:"0 16px 16px",borderTop:"1px solid var(--border-subtle)"}}>
          <div style={{height:8}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 240px",gap:10}}>
            <div><label className="pl-label">Nama key <span style={{color:"var(--danger)"}}>*</span></label><input className="pl-input" placeholder="prod / mobile-app / cron" value={name} onChange={e=>setName(e.target.value)} required /></div>
            <div><label className="pl-label">Expiry (opsional)</label><input className="pl-input" type="datetime-local" value={expires} onChange={e=>setExpires(e.target.value)} /><div style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>Kosong = tidak expire</div></div>
          </div>
          <div style={{fontSize:11,color:"var(--text-muted)",background:"var(--bg-input)",border:"1px solid var(--border)",padding:"8px 10px",borderRadius:8}}>Config default (scopes/providers/destinations = semua). Atur lengkap lewat tombol <strong style={{color:"var(--text-primary)"}}>Edit</strong> setelah create.</div>
          <button className="pl-btn pl-btn-primary" type="submit" style={{alignSelf:"flex-start"}}><I.plus/> Create key</button>
        </form>
      )}
    </div>

    {lastKey && <div style={{background:"var(--warning-soft)",border:"1px solid rgba(245,158,11,0.35)",padding:"14px",borderRadius:12}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><strong style={{fontSize:13}}>⚠️ Salin sekarang — hanya tampil sekali!</strong><button className="pl-btn pl-btn-primary pl-btn-sm" onClick={()=>copy(lastKey,"Secret copied")}> <I.copy/> Copy secret</button></div>
      <pre style={{wordBreak:"break-all",whiteSpace:"pre-wrap",fontFamily:"var(--font-mono)",fontSize:12,margin:"10px 0 0",background:"var(--bg-input)",padding:12,borderRadius:8,border:"1px solid var(--border)",position:"relative"}}>{lastKey}</pre>
      <div style={{fontSize:11,color:"var(--text-muted)",marginTop:8}}>Simpan di env: <span className="pl-mono">PORTLANE_API_KEY={lastKey.slice(0,24)}…</span> · Header: <span className="pl-mono">Authorization: Bearer {lastKey.slice(0,16)}…</span> <button onClick={()=>setLastKey(null)} style={{marginLeft:8,background:"transparent",border:"none",color:"var(--text-muted)",cursor:"pointer",textDecoration:"underline",fontSize:11}}>sembunyikan</button></div>
    </div>}

    <div className="pl-card" style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
      <div style={{position:"relative",flex:1,minWidth:180}}><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)"}}><I.search/></span><input className="pl-input" style={{paddingLeft:30}} placeholder="Cari nama / ID / prefix..." value={q} onChange={e=>setQ(e.target.value)} /></div>
      <select className="pl-select" value={fStatus} onChange={e=>setFStatus(e.target.value as any)} style={{maxWidth:160}}><option value="">Semua status</option><option value="active">active</option><option value="revoked">revoked</option><option value="expired">expired</option></select>
      <span style={{fontSize:12,color:"var(--text-muted)"}}>{filtered.length}/{keys.length} keys</span>
      <button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={reload}>↻ Refresh</button>
    </div>

    {filtered.length===0? <div className="pl-card pl-empty" style={{gridColumn:"1/-1"}}>{keys.length===0?"Belum ada API key — buat di atas.":"Tidak ada key sesuai filter."}</div> :
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(360px,1fr))",gap:12}}>
      {filtered.map((k:any)=>{
        const expired=isExpiredAt(k.expires_at); const dl=daysLeft(k.expires_at);
        const scopesArr=fmtScopes(k.scopes); const provArr=fmtScopes(k.allowed_providers);
        const destArr=Array.isArray(k.allowed_destination_ids)?k.allowed_destination_ids:(typeof k.allowed_destination_ids==="string"?JSON.parse(k.allowed_destination_ids||"[]"):[]);
        const statusLabel=expired?"expired":k.status;
        return <div key={k.id} className="pl-card" style={{display:"flex",flexDirection:"column",gap:10, borderLeft: expired? "3px solid var(--danger)" : k.status==="revoked"?"3px solid #525252": "3px solid var(--success)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
            <div style={{display:"flex",gap:10,alignItems:"center",minWidth:0}}>
              <div style={{width:36,height:36,borderRadius:9,background: expired?"var(--danger-soft)":k.status==="revoked"?"#1A1A1A":"var(--accent-soft)",border:"1px solid "+(expired?"rgba(239,68,68,0.2)":k.status==="revoked"?"var(--border)":"var(--accent-border)"),display:"grid",placeItems:"center",flexShrink:0}}><I.key/></div>
              <div style={{minWidth:0}}><div style={{fontWeight:600,fontSize:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:180}}>{k.name}</div><div className="pl-mono" style={{fontSize:10,color:"var(--text-muted)",display:"flex",gap:4,alignItems:"center"}}>{k.id.slice(0,18)}… <button onClick={()=>copy(k.id,"ID copied")} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",padding:2}} title="Copy ID"><I.copy/></button></div></div>
            </div>
            <StatusBadge status={statusLabel}/>
          </div>

          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <div className="pl-mono" style={{flex:1,fontSize:11,background:"var(--bg-input)",border:"1px solid var(--border)",padding:"7px 8px",borderRadius:8,display:"flex",justifyContent:"space-between",gap:8}}>
              <span title={k.key_prefix}>{k.key_prefix}••••••••</span>
              <button onClick={()=>copy(k.key_prefix,"Prefix copied")} style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:6,padding:"2px 6px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:11}}><I.copy/> Salin</button>
            </div>
          </div>
          <div style={{fontSize:11,color:"var(--text-muted)",lineHeight:1.5}}>
            <div>Dibuat {new Date(k.created_at).toLocaleString()} · Last used <strong style={{color: k.last_used_at?"var(--text-primary)":"var(--text-muted)"}}>{k.last_used_at? new Date(k.last_used_at).toLocaleString():"never"}</strong> {k.revoked_at && <>· Revoked {new Date(k.revoked_at).toLocaleString()}</>}</div>
            <div>
              {k.expires_at? <>Expires {new Date(k.expires_at).toLocaleString()} {expired? <span style={{color:"var(--danger)",fontWeight:700}}>· EXPIRED</span> : dl!==null && dl<=7? <span style={{color:"var(--warning)",fontWeight:600}}>· {dl}d left</span>: <span style={{color:"var(--success)"}}>· {dl}d left</span>}</> : <span>Expires: <em>never</em></span>}
            </div>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}><span style={{fontSize:11,color:"var(--text-muted)",minWidth:52}}>Scopes:</span>{scopesArr.length? scopesArr.map((s:string)=><span key={s} style={{fontSize:11,background:"var(--bg-input)",border:"1px solid var(--border)",padding:"2px 6px",borderRadius:999}}>{s}</span>) : <span style={{fontSize:11,color:"var(--text-muted)"}}>all (unrestricted)</span>}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}><span style={{fontSize:11,color:"var(--text-muted)",minWidth:52}}>Providers:</span>{provArr.length? provArr.map((p:string)=><span key={p} style={{fontSize:11,background:"var(--bg-card-alt)",border:"1px solid var(--border)",padding:"2px 6px",borderRadius:999,textTransform:"capitalize"}}>{p}</span>) : <span style={{fontSize:11,color:"var(--text-muted)"}}>all</span>}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}><span style={{fontSize:11,color:"var(--text-muted)",minWidth:52}}>Destinations:</span>{destArr.length? destArr.slice(0,3).map((id:string)=><span key={id} title={id} style={{fontSize:11,background:"var(--bg-input)",border:"1px solid var(--border)",padding:"2px 6px",borderRadius:6}}>{destName(id)}</span>) : <span style={{fontSize:11,color:"var(--text-muted)"}}>all</span>}{destArr.length>3 && <span style={{fontSize:11,color:"var(--text-muted)"}}>+{destArr.length-3} lagi</span>}</div>
          </div>

          <div style={{display:"flex",gap:6,marginTop:2,flexWrap:"wrap"}}>
            <button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={()=>openEdit(k)} title="Edit name/expiry/scopes">Edit</button>
            <button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={()=>openIp(k.id)} title="Atur IP allowlist">IP Allowlist</button>
            <button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={()=>copy(k.id, "ID copied")}> <I.copy/> ID</button>
            {k.status==="active" && !expired && <button className="pl-btn pl-btn-secondary pl-btn-sm" onClick={()=>setConfirm({id:k.id,action:"revoke",name:k.name})} style={{color:"var(--warning)",borderColor:"rgba(245,158,11,0.3)"}}>Revoke</button>}
            {k.status==="active" && expired && <button className="pl-btn pl-btn-secondary pl-btn-sm" onClick={()=>setConfirm({id:k.id,action:"revoke",name:k.name})} style={{color:"var(--danger)"}}>Revoke expired</button>}
            <button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={()=>{
              if(k.status==="active") { setMsg("Revoke dulu sebelum delete — demi keamanan."); setToast("Revoke dulu sebelum delete"); return; }
              setConfirm({id:k.id,action:"delete",name:k.name});
            }} style={{color:"var(--danger)",marginLeft:"auto"}} title={k.status==="active"?"Revoke dulu baru bisa delete":"Hapus permanen"}><I.trash/> Delete</button>
          </div>
          {expired && k.status==="active" && <div style={{fontSize:11,background:"var(--danger-soft)",border:"1px solid rgba(239,68,68,0.2)",color:"var(--danger)",padding:"6px 8px",borderRadius:6}}>Expired — key tidak bisa dipakai. Revoke lalu Delete untuk bersihkan.</div>}
        </div>;
      })}
    </div>}

    {confirm && (
      <div className="pl-overlay" onClick={()=>setConfirm(null)}>
        <div className="pl-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:420}}>
          <h3 style={{margin:"0 0 8px",fontSize:15}}>{confirm.action==="revoke"?"Revoke key?":"Hapus permanen?"}</h3>
          <p style={{margin:0,fontSize:13,color:"var(--text-secondary)",lineHeight:1.5}}>
            {confirm.action==="revoke" ? <>Key <strong>{confirm.name}</strong> akan dinonaktifkan. Request pakai key ini akan ditolak (401). Bisa di-delete setelah revoke.</> : <>Key <strong>{confirm.name}</strong> akan dihapus permanen beserta IP allowlist-nya. Tidak bisa di-undo.</>}
          </p>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}>
            <button className="pl-btn pl-btn-ghost" onClick={()=>setConfirm(null)}>Batal</button>
            <button className="pl-btn" style={{background: confirm.action==="delete"?"var(--danger)":"var(--warning)",color:"white",borderColor:"transparent"}} onClick={async()=>{ const c=confirm; setConfirm(null); if(c.action==="revoke") await revoke(c.id); else await delKey(c.id); }}>{confirm.action==="revoke"?"Ya, revoke":"Ya, hapus"}</button>
          </div>
        </div>
      </div>
    )}

    {editKey && (
      <div className="pl-overlay" onClick={()=>setEditKey(null)}>
        <div className="pl-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:520}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h3 style={{margin:0,fontSize:15}}>Edit API Key — {editKey.name}</h3><button className="pl-icon-btn" onClick={()=>setEditKey(null)}><I.x/></button></div>
          <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:10,background:"var(--bg-input)",border:"1px solid var(--border)",padding:"8px 10px",borderRadius:8}}>ID <span className="pl-mono">{editKey.id}</span> <button onClick={()=>copy(editKey.id,"ID copied")} style={{background:"none",border:"none",cursor:"pointer",color:"var(--accent)"}}><I.copy/></button> · Prefix <span className="pl-mono">{editKey.key_prefix}</span> <button onClick={()=>copy(editKey.key_prefix,"Prefix copied")} style={{background:"none",border:"none",cursor:"pointer",color:"var(--accent)"}}><I.copy/></button></div>
          <form onSubmit={saveEdit} style={{display:"flex",flexDirection:"column",gap:10}}>
            <div><label className="pl-label">Name</label><input className="pl-input" value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})} required /></div>
            <div><label className="pl-label">Expires at</label><input className="pl-input" type="datetime-local" value={editForm.expires_at} onChange={e=>setEditForm({...editForm,expires_at:e.target.value})} /><div style={{fontSize:11,color:"var(--text-muted)"}}>Kosongkan untuk tidak expire. Format lokal → disimpan UTC.</div></div>
            <div><div style={{fontSize:11,fontWeight:600,marginBottom:4}}>Scopes (empty = all):</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{SCOPES.map(s=><label key={s} style={{fontSize:12,display:"flex",gap:4,alignItems:"center",background:editForm.scopes.includes(s)?"var(--accent-soft)":"transparent",border:"1px solid "+(editForm.scopes.includes(s)?"var(--accent-border)":"var(--border)"),padding:"6px 8px",borderRadius:6,cursor:"pointer"}}><input type="checkbox" checked={editForm.scopes.includes(s)} onChange={e=>setEditForm({...editForm,scopes:e.target.checked?[...editForm.scopes,s]:editForm.scopes.filter(x=>x!==s)})}/> {s}</label>)}</div></div>
            <div><div style={{fontSize:11,fontWeight:600,marginBottom:4}}>Allowed providers (empty = all):</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{PROVIDERS.map(p=><label key={p} style={{fontSize:12,display:"flex",gap:4,alignItems:"center",background:editForm.allowed_providers.includes(p)?"var(--accent-soft)":"transparent",border:"1px solid "+(editForm.allowed_providers.includes(p)?"var(--accent-border)":"var(--border)"),padding:"6px 8px",borderRadius:999,cursor:"pointer"}}><input type="checkbox" checked={editForm.allowed_providers.includes(p)} onChange={e=>setEditForm({...editForm,allowed_providers:e.target.checked?[...editForm.allowed_providers,p]:editForm.allowed_providers.filter(x=>x!==p)})}/> {p}</label>)}</div></div>
            <div><div style={{fontSize:11,fontWeight:600,marginBottom:4}}>Allowed destinations (empty = all):</div><select multiple className="pl-input" style={{height:92}} value={editForm.allowed_destination_ids} onChange={e=>setEditForm({...editForm,allowed_destination_ids:Array.from(e.target.selectedOptions).map(o=>o.value)})}>{destinations.map((d:any)=><option key={d.id} value={d.id}>{d.name} ({d.destination_type})</option>)}{destinations.length===0 && <option disabled>(no destinations)</option>}</select></div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button type="button" className="pl-btn pl-btn-ghost" onClick={()=>setEditKey(null)}>Cancel</button><button type="submit" className="pl-btn pl-btn-primary">Save</button></div>
          </form>
        </div>
      </div>
    )}
    {ipFor && (
      <div className="pl-overlay" onClick={()=>setIpFor(null)}>
        <div className="pl-modal" onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><h3 style={{margin:0,fontSize:15}}>IP Allowlist</h3><button className="pl-icon-btn" onClick={()=>setIpFor(null)}><I.x/></button></div>
          <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:10}}>Kosong = semua IP boleh. Tambah CIDR untuk batasi. Cth: 103.10.20.30/32 atau 10.0.0.0/16</div>
          <form onSubmit={addIp} style={{display:"flex",gap:8,marginBottom:12}}>
            <input className="pl-input" placeholder="1.2.3.4/32 or 10.0.0.0/16" value={ipForm.cidr} onChange={e=>setIpForm({...ipForm,cidr:e.target.value})} required style={{flex:1}}/>
            <input className="pl-input" placeholder="deskripsi" value={ipForm.description} onChange={e=>setIpForm({...ipForm,description:e.target.value})} style={{flex:1}}/>
            <button className="pl-btn pl-btn-primary" type="submit">Add</button>
          </form>
          <div style={{display:"flex",flexDirection:"column",gap:6, maxHeight:260, overflow:"auto"}}>{ipList.length===0? <div style={{fontSize:12,color:"var(--text-muted)",padding:"12px 0",textAlign:"center"}}>No entries — all IPs allowed. Add a CIDR to restrict.</div> : ipList.map((r:any)=><div key={r.id} style={{display:"flex",gap:8,alignItems:"center",padding:"8px 10px",background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:8}}><span className="pl-mono" style={{fontSize:12,flex:1}}>{r.cidr}</span><span style={{fontSize:11,color:"var(--text-muted)"}}>{r.description ?? ""}</span><button className="pl-btn pl-btn-ghost pl-btn-sm" style={{color:"var(--danger)"}} onClick={()=>delIp(r.id)}><I.trash/></button></div>)}</div>
        </div>
      </div>
    )}
    <div className="pl-card" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontWeight:600,fontSize:13}}>Account</div><div style={{fontSize:12,color:"var(--text-muted)"}}>Sign out of this workspace.</div></div><button className="pl-btn pl-btn-secondary" onClick={()=>{ setToken(null); setTenantId(null); location.reload(); }}>Sign out</button></div>
  </div>;
}

function IpAccess({ tenantId }:{tenantId:string}){
  const [rows,setRows]=useState<any[]>([]); const [loading,setLoading]=useState(true);
  const reload=useCallback(async()=>{
    setLoading(true);
    try{
      const [keys, eps]=await Promise.all([
        apiFetch(`/api/v1/tenants/${tenantId}/api-keys`).then(j=>j.data).catch(()=>[]),
        apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints`).then(j=>j.data).catch(()=>[]),
      ]);
      const out:any[]=[];
      for(const k of keys){
        try{ const j=await apiFetch(`/api/v1/tenants/${tenantId}/api-keys/${k.id}/ip-allowlist`); for(const e of j.data) out.push({...e, scope_label:`API Key: ${k.name}`, scope_type:"API_KEY"}); }catch{ /* ignore IP allowlist fetch errors */ }
      }
      for(const ep of eps){
        try{ const j=await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints/${ep.id}/ip-allowlist`); for(const e of j.data) out.push({...e, scope_label:`Webhook: ${ep.name}`, scope_type:"WEBHOOK_ENDPOINT"}); }catch{ /* ignore IP allowlist fetch errors */ }
      }
      setRows(out);
    }finally{ setLoading(false); }
  },[tenantId]);
  useEffect(()=>{ reload(); },[reload]);
  if(loading) return <div><Skeleton h={120}/></div>;
  return <div style={{display:"flex",flexDirection:"column",gap:16}}><div><h2 style={{margin:0,fontSize:18}}>IP Access</h2><p style={{margin:"4px 0 0",fontSize:13,color:"var(--text-secondary)"}}>Allowlist per API key / webhook endpoint. Manage from API Keys or Webhooks.</p></div>
    <div className="pl-card" style={{padding:0,overflow:"hidden"}}><table className="pl-table"><thead><tr><th>IP / CIDR</th><th>Scope</th><th>Description</th><th>Status</th></tr></thead><tbody>{rows.length===0? <tr><td colSpan={4}><div className="pl-empty" style={{fontSize:12}}>No IP rules yet. Add from API Keys → IP Allowlist or Webhooks → IP.</div></td></tr> : rows.map((r:any)=><tr key={r.id}><td className="pl-mono">{r.cidr}</td><td>{r.scope_label}</td><td style={{color:"var(--text-muted)"}}>{r.description ?? "-"}</td><td><StatusBadge status={r.enabled===false?"Disabled":"Active"}/></td></tr>)}</tbody></table></div>
    <div style={{fontSize:12,color:"var(--text-muted)"}}>Monospace for network values — configure via API or the per-resource panels.</div>
  </div>;
}

export default function App(){
  const routerLocation = useLocation();
  if (routerLocation.pathname === "/docs" || routerLocation.pathname.startsWith("/docs/")) return <Docs />;
  const [authed,setAuthed]=useState(()=>!!getToken());
  const tenantId=useTenantId();
  const [tenants,setTenants]=useState<any[]>([]);
  const [collapsed,setCollapsed]=useState(false);
  const [cmd,setCmd]=useState(false);
  const [tenantOpen,setTenantOpen]=useState(false);
  const [showTenantCreate,setShowTenantCreate]=useState(false); const [newTenantName,setNewTenantName]=useState(""); const [tenantMsg,setTenantMsg]=useState<string|null>(null);
  const navigate=useNavigate();
  const searchRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{ if(authed) apiFetch("/api/v1/auth/me").then(j=>{ setTenants(j.data.tenants||[]); if(!getTenantId() && j.data.tenants?.[0]) setTenantId(j.data.tenants[0].id); }).catch(()=>{ setToken(null); setAuthed(false); }); },[authed]);
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
  if(!tenantId) return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"var(--bg-base)",padding:24}}><div className="pl-card" style={{width:420}}><h3 style={{margin:"0 0 12px"}}>Select workspace</h3>{tenants.length===0?<Skeleton h={60}/>: tenants.map((t:any)=><button key={t.id} className="pl-btn pl-btn-secondary" onClick={()=>{ setTenantId(t.id); window.location.reload(); }} style={{display:"flex",width:"100%",margin:"8px 0",justifyContent:"space-between"}}>{t.name} <span className="pl-mono" style={{fontSize:11,color:"var(--text-muted)"}}>{t.slug}</span></button>)}<button className="pl-btn pl-btn-ghost" onClick={()=>{ setToken(null); setTenantId(null); window.location.reload(); }}>Sign out</button></div></div>;

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
