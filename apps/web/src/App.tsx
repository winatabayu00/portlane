import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { apiFetch, getTenantId, getToken, setTenantId, setToken } from "./lib/api.js";

// ── icons (inline, no dep) ──
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
};

// ── helpers ──
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
  const map:any={ delivered:"delivered", failed:"failed", dead:"failed", retrying:"queued", queued:"queued", processing:"processing", connected:"connected", active:"delivered", healthy:"delivered", degraded:"queued", disabled:"failed" };
  const k=map[s] ?? "queued";
  const dot={ delivered:"var(--success)", failed:"var(--danger)", queued:"var(--warning)", processing:"#A855F7", connected:"var(--success)" } as any;
  return <span className={`pl-status pl-status-${k}`}><span className="pl-status-dot" style={{background:dot[k] ?? "#737373"}}/>{status}</span>;
}
function Skeleton({h=16}:{h?:number}){ return <div className="pl-skeleton" style={{height:h}}/>; }

// ── login ──
function LoginGate({ onAuth }:{onAuth:()=>void}){
  const [mode,setMode]=useState<"login"|"register">("login");
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [name,setName]=useState(""); const [err,setErr]=useState<string|null>(null); const [loading,setLoading]=useState(false);
  async function submit(e:React.FormEvent){ e.preventDefault(); setErr(null); setLoading(true);
    try{ const path=mode==="login"?"/api/v1/auth/login":"/api/v1/auth/register";
      const body=mode==="login"?{email,password}:{email,password,name};
      const j=await apiFetch(path,{method:"POST",body:JSON.stringify(body)});
      setToken(j.data.token); if(j.data.tenant?.id) setTenantId(j.data.tenant.id);
      if(!j.data.tenant?.id){ try{ const me=await apiFetch("/api/v1/auth/me"); if(me.data.tenants?.[0]) setTenantId(me.data.tenants[0].id);}catch{} }
      onAuth();
    }catch(e:any){ setErr(e.message);} finally{ setLoading(false); }
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

// ── pages ──
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
  // bar data mock from overview or fallback
  const bars = [ {o:22,g:18,r:4},{o:28,g:24,r:3},{o:18,g:16,r:5},{o:32,g:28,r:6},{o:26,g:22,r:4},{o:36,g:30,r:5},{o:30,g:26,r:7},{o:24,g:20,r:3},{o:34,g:29,r:4},{o:28,g:25,r:3},{o:30,g:27,r:5},{o:26,g:22,r:4} ];
  const maxBar=Math.max(...bars.map(b=>b.o),1);
  // provider breakdown mock
  const breakdown=[
    {label:"Telegram", pct:42, color:"#FF7A00"},
    {label:"Discord", pct:28, color:"#FF9A3D"},
    {label:"SMTP", pct:21, color:"#FFB366"},
    {label:"Webhook", pct:9, color:"#2A2A2A"},
  ];
  // queue health from deliveries
  const q = { queued: data.queued ?? dels.filter(d=>d.status==="QUEUED").length, processing: dels.filter(d=>d.status==="PROCESSING").length, retrying: dels.filter(d=>d.status==="RETRYING").length, dead: dels.filter(d=>d.status==="DEAD").length };
  const recent = dels.slice(0,5);

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    {/* metric cards */}
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
            {(() => {
              let acc=0;
              const tot=100;
              return breakdown.map(b=>{
                const start=(acc/tot)*2*Math.PI - Math.PI/2;
                const sweep=(b.pct/tot)*2*Math.PI;
                const end=start+sweep;
                acc+=b.pct;
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
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState({ provider_key:"telegram", name:"", botToken:"", webhookUrl:"", host:"", port:"", senderEmail:"", url:"" });
  const reload=()=> apiFetch(`/api/v1/tenants/${tenantId}/provider-connections`).then(j=>setList(j.data)).finally(()=>setL(false));
  useEffect(()=>{ reload(); },[tenantId]);
  async function create(e:React.FormEvent){ e.preventDefault(); setMsg(null);
    let creds:Record<string,unknown>={}, cfg:Record<string,unknown>={};
    if(form.provider_key==="telegram") creds={ botToken: form.botToken };
    if(form.provider_key==="discord") creds={ webhookUrl: form.webhookUrl };
    if(form.provider_key==="smtp") creds={ host:form.host, port:form.port, senderEmail:form.senderEmail };
    if(form.provider_key==="webhook") cfg={ url: form.url };
    try{ await apiFetch(`/api/v1/tenants/${tenantId}/provider-connections`,{method:"POST",body:JSON.stringify({provider_key:form.provider_key,name:form.name,config:cfg,credentials:creds})}); setMsg("Created"); setOpen(false); reload(); }catch(e:any){ setMsg(e.message); }
  }
  async function test(id:string){ try{ const j=await apiFetch(`/api/v1/tenants/${tenantId}/provider-connections/${id}/test`,{method:"POST"}); setMsg(JSON.stringify(j.data)); }catch(e:any){ setMsg(e.message);} }
  if(loading) return <div><Skeleton h={120}/></div>;
  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><h2 style={{margin:0,fontSize:18}}>Providers</h2><p style={{margin:"4px 0 0",fontSize:13,color:"var(--text-secondary)"}}>Connect and manage communication providers.</p></div><button className="pl-btn pl-btn-primary" onClick={()=>setOpen(true)}><I.plus/> Add Provider</button></div>
    {msg && <div style={{fontSize:12,padding:"10px 12px",borderRadius:8,background:"var(--bg-card)",border:"1px solid var(--border)",wordBreak:"break-all"}}>{msg}</div>}
    {list.length===0? <div className="pl-card pl-empty"><div className="pl-empty-ic"><I.box/></div>No providers connected<br/><span style={{fontSize:12,color:"var(--text-muted)"}}>Connect Telegram, Discord, SMTP, or Webhook to start routing messages.</span><div style={{marginTop:12}}><button className="pl-btn pl-btn-primary" onClick={()=>setOpen(true)}>Add Provider</button></div></div> :
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
        {list.map((r:any)=>(
          <div key={r.id} className="pl-card" style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:600,fontSize:14}}>{r.name}</span><StatusBadge status={r.status}/></div>
            <div style={{fontSize:12,color:"var(--text-muted)"}}>{r.provider_key} · {r.id.slice(0,8)}</div>
            <div style={{display:"flex",gap:6,marginTop:"auto"}}><button className="pl-btn pl-btn-secondary pl-btn-sm" onClick={()=>test(r.id)}>Test Connection</button><button className="pl-btn pl-btn-ghost pl-btn-sm" style={{marginLeft:"auto"}}>•••</button></div>
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
  </div>;
}

function Destinations({ tenantId }:{tenantId:string}){
  const [list,setList]=useState<any[]>([]); const [conns,setConns]=useState<any[]>([]); const [q,setQ]=useState(""); const [form,setForm]=useState({provider_connection_id:"",name:"",chat_id:"",email:""});
  const reload=()=> apiFetch(`/api/v1/tenants/${tenantId}/destinations`).then(j=>setList(j.data));
  useEffect(()=>{ reload(); apiFetch(`/api/v1/tenants/${tenantId}/provider-connections`).then(j=>setConns(j.data)).catch(()=>{}); },[tenantId]);
  async function create(e:React.FormEvent){ e.preventDefault(); const cfg:Record<string,unknown>={}; if(form.chat_id) cfg.chat_id=form.chat_id; if(form.email) cfg.email=form.email; await apiFetch(`/api/v1/tenants/${tenantId}/destinations`,{method:"POST",body:JSON.stringify({provider_connection_id:form.provider_connection_id,name:form.name,config:cfg})}); reload(); }
  const filtered=list.filter(r=>!q|| r.name.toLowerCase().includes(q.toLowerCase()) || r.destination_type.includes(q));
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
    </div>
    <div className="pl-card" style={{padding:0,overflow:"hidden"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",gap:8}}>
        <div style={{position:"relative",flex:1,maxWidth:260}}><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)"}}><I.search/></span><input className="pl-input" style={{paddingLeft:30}} placeholder="Search destinations..." value={q} onChange={e=>setQ(e.target.value)} /></div>
        <span style={{fontSize:12,color:"var(--text-muted)"}}>{filtered.length} total</span>
      </div>
      {filtered.length===0? <div className="pl-empty">No destinations yet.</div> :
      <div style={{overflow:"auto"}}><table className="pl-table"><thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Updated</th></tr></thead><tbody>{filtered.map((r:any)=><tr key={r.id}><td style={{fontWeight:500}}>{r.name}</td><td><span style={{fontSize:12,background:"var(--bg-card-alt)",border:"1px solid var(--border)",padding:"2px 6px",borderRadius:6}}>{r.destination_type}</span></td><td><StatusBadge status={r.status}/></td><td className="pl-mono" style={{color:"var(--text-muted)"}}>{new Date(r.updated_at).toLocaleString()}</td></tr>)}</tbody></table></div>}
    </div>
  </div>;
}

function Messages({ tenantId }:{tenantId:string}){
  const [list,setList]=useState<any[]>([]); const [detail,setDetail]=useState<any>(null); const [q,setQ]=useState(""); const [drawer,setDrawer]=useState<any>(null);
  useEffect(()=>{ apiFetch(`/api/v1/tenants/${tenantId}/messages`).then(j=>setList(j.data)); },[tenantId]);
  async function open(id:string){ const j=await apiFetch(`/api/v1/tenants/${tenantId}/messages/${id}`); setDetail(j.data); }
  async function retry(dlvId:string){ await apiFetch(`/api/v1/tenants/${tenantId}/deliveries/${dlvId}/retry`,{method:"POST"}); alert("Retry queued"); }
  const filtered=list.filter(r=>!q|| (r.subject??"").toLowerCase().includes(q.toLowerCase()) || r.body.toLowerCase().includes(q.toLowerCase()) || r.id.includes(q));
  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><h2 style={{margin:0,fontSize:18}}>Messages</h2><p style={{margin:"4px 0 0",fontSize:13,color:"var(--text-secondary)"}}>Track outbound communication and delivery status.</p></div><button className="pl-btn pl-btn-primary"><I.plus/> Send Message</button></div>
    <div className="pl-card" style={{padding:0,overflow:"hidden"}}>
      <div style={{display:"flex",gap:8,padding:"12px 16px",alignItems:"center",flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:1,maxWidth:280}}><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)"}}><I.search/></span><input className="pl-input" style={{paddingLeft:30}} placeholder="Search messages..." value={q} onChange={e=>setQ(e.target.value)} /></div>
        <span className="pl-pill">Status ▾</span><span className="pl-pill">Provider ▾</span><span className="pl-pill">Date ▾</span>
      </div>
      <div style={{overflow:"auto"}}>
        <table className="pl-table"><thead><tr><th>Message</th><th>Destinations</th><th>Status</th><th>Created</th></tr></thead><tbody>
          {filtered.length===0? <tr><td colSpan={4}><div className="pl-empty">Empty — send via machine API: POST /api/v1/messages with Bearer pl_live_...</div></td></tr> :
            filtered.map((r:any)=><tr key={r.id} onClick={()=>open(r.id)} style={{cursor:"pointer"}}><td><div style={{fontWeight:500,fontSize:13}}>{r.subject ?? "(no subject)"}</div><div className="pl-mono" style={{color:"var(--text-muted)",fontSize:11}}>{r.id.slice(0,14)} · {r.body.slice(0,48)}</div></td><td className="pl-mono" style={{fontSize:11}}>{r.destination_ids?.length ?? "-"}</td><td><StatusBadge status={r.status ?? "QUEUED"}/></td><td style={{color:"var(--text-muted)",fontSize:12}}>{new Date(r.created_at).toLocaleString()}</td></tr>)}
        </tbody></table>
      </div>
    </div>
    {detail && <div className="pl-card">
      <div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{fontWeight:600}}>{detail.message.subject ?? detail.message.id}</div><div className="pl-mono" style={{fontSize:11,color:"var(--text-muted)"}}>{detail.message.id} · {new Date(detail.message.created_at).toLocaleString()}</div></div><button className="pl-icon-btn" onClick={()=>setDetail(null)}><I.x/></button></div>
      <div style={{marginTop:12,background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:8,padding:12}}><div style={{fontSize:12,color:"var(--text-muted)",marginBottom:4}}>Body</div><div style={{fontSize:13,whiteSpace:"pre-wrap"}}>{detail.message.body}</div></div>
      <div style={{marginTop:12}}><strong style={{fontSize:12}}>Deliveries</strong><div style={{display:"flex",flexDirection:"column",gap:6,marginTop:8}}>{detail.deliveries?.map((d:any)=><div key={d.id} onClick={()=>setDrawer(d)} style={{display:"flex",gap:10,alignItems:"center",padding:"10px 12px",background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:8,cursor:"pointer"}}><StatusBadge status={d.status}/><span className="pl-mono" style={{fontSize:11,flex:1}}>{d.id.slice(0,12)} → {d.destination_id.slice(0,8)}</span>{["FAILED","DEAD","RETRYING"].includes(d.status) && <button className="pl-btn pl-btn-secondary pl-btn-sm" onClick={e=>{e.stopPropagation();retry(d.id);}}>Retry</button>}<span style={{color:"var(--text-muted)"}}>›</span></div>)}</div></div>
    </div>}
    {drawer && (
      <div className="pl-drawer">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:"1px solid var(--border)"}}><strong>Delivery Detail</strong><button className="pl-icon-btn" onClick={()=>setDrawer(null)}><I.x/></button></div>
        <div style={{padding:20,display:"flex",flexDirection:"column",gap:12,overflow:"auto"}}>
          <div className="pl-mono" style={{fontSize:12,wordBreak:"break-all",background:"var(--bg-input)",padding:10,borderRadius:8,border:"1px solid var(--border)"}}>{drawer.id}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,fontSize:13}}><div><div style={{color:"var(--text-muted)",fontSize:11}}>Status</div><StatusBadge status={drawer.status}/></div><div><div style={{color:"var(--text-muted)",fontSize:11}}>Attempts</div>{drawer.attempt_count ?? drawer.attempts?.length ?? "-"}</div><div><div style={{color:"var(--text-muted)",fontSize:11}}>Destination</div><span className="pl-mono" style={{fontSize:11}}>{drawer.destination_id}</span></div><div><div style={{color:"var(--text-muted)",fontSize:11}}>Updated</div>{new Date(drawer.updated_at).toLocaleString()}</div></div>
          <div style={{borderTop:"1px solid var(--border)",paddingTop:12}}><strong style={{fontSize:12}}>Attempts</strong>{(drawer.attempts ?? []).length? drawer.attempts.map((a:any,i:number)=><div key={i} style={{padding:"8px 0",borderBottom:"1px solid var(--border-subtle)",fontSize:12}}><div>{a.error ?? a.status}</div><div style={{color:"var(--text-muted)",fontSize:11}}>{a.created_at? new Date(a.created_at).toLocaleString():""}</div></div>) : <div style={{fontSize:12,color:"var(--text-muted)",marginTop:6}}>No attempt logs.</div>}</div>
        </div>
      </div>
    )}
  </div>;
}

function Webhooks({ tenantId }:{tenantId:string}){
  const [eps,setEps]=useState<any[]>([]); const [events,setEvents]=useState<any[]>([]); const [tab,setTab]=useState<"endpoints"|"events">("endpoints"); const [form,setForm]=useState({name:"",forwarding_url:""});
  const reload=()=>{ apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints`).then(j=>setEps(j.data)); apiFetch(`/api/v1/tenants/${tenantId}/webhook-events`).then(j=>setEvents(j.data)); };
  useEffect(()=>{ reload(); },[tenantId]);
  async function create(e:React.FormEvent){ e.preventDefault(); await apiFetch(`/api/v1/tenants/${tenantId}/webhook-endpoints`,{method:"POST",body:JSON.stringify({name:form.name,forwarding_url:form.forwarding_url})}); setForm({name:"",forwarding_url:""}); reload(); }
  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><h2 style={{margin:0,fontSize:18}}>Webhooks</h2><p style={{margin:"4px 0 0",fontSize:13,color:"var(--text-secondary)"}}>Receive and forward inbound webhooks.</p></div>
      <form onSubmit={create} style={{display:"flex",gap:8}}><input className="pl-input" placeholder="Endpoint name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required style={{width:160}}/><input className="pl-input" placeholder="Forwarding URL (optional)" value={form.forwarding_url} onChange={e=>setForm({...form,forwarding_url:e.target.value})} style={{width:220}}/><button className="pl-btn pl-btn-primary" type="submit"><I.plus/> Create</button></form>
    </div>
    <div style={{display:"flex",gap:8,borderBottom:"1px solid var(--border)",paddingBottom:8}}><button onClick={()=>setTab("endpoints")} style={{padding:"6px 12px",borderRadius:8,border:"none",background:tab==="endpoints"?"var(--accent)":"transparent",color:tab==="endpoints"?"white":"var(--text-secondary)",fontSize:13,fontWeight:600,cursor:"pointer"}}>Endpoints</button><button onClick={()=>setTab("events")} style={{padding:"6px 12px",borderRadius:8,border:"none",background:tab==="events"?"var(--accent)":"transparent",color:tab==="events"?"white":"var(--text-secondary)",fontSize:13,fontWeight:600,cursor:"pointer"}}>Events</button></div>
    {tab==="endpoints"? (
      <div className="pl-card" style={{padding:0,overflow:"hidden"}}>{eps.length===0? <div className="pl-empty"><div className="pl-empty-ic"><I.webhook/></div>No endpoints yet.</div> :
        <table className="pl-table"><thead><tr><th>Name</th><th>Public ID</th><th>URL</th><th>Status</th></tr></thead><tbody>{eps.map((r:any)=><tr key={r.id}><td style={{fontWeight:500}}>{r.name}</td><td className="pl-mono"><span style={{background:"var(--bg-input)",border:"1px solid var(--border)",padding:"2px 6px",borderRadius:6}}>{r.public_identifier}</span> <button onClick={()=>navigator.clipboard.writeText(r.public_identifier)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)"}}><I.copy/></button></td><td className="pl-mono" style={{fontSize:11}}>/hooks/{r.public_identifier}</td><td><StatusBadge status="Active"/></td></tr>)}</tbody></table>}</div>
    ) : (
      <div className="pl-card" style={{padding:0,overflow:"hidden"}}>{events.length===0? <div className="pl-empty">No events yet. POST to /hooks/:publicIdentifier</div> :
        <table className="pl-table"><thead><tr><th>Time</th><th>Endpoint</th><th>Method</th><th>Source IP</th><th>Status</th><th>Duration</th></tr></thead><tbody>{events.map((e:any)=><tr key={e.id}><td style={{fontSize:12,color:"var(--text-muted)"}}>{new Date(e.created_at).toLocaleTimeString()}</td><td>{e.webhook_endpoint_id?.slice(0,8) ?? "-"}</td><td><span style={{fontFamily:"var(--font-mono)",fontSize:11,background:"var(--bg-input)",padding:"2px 6px",borderRadius:6,border:"1px solid var(--border)"}}>{e.method ?? "POST"}</span></td><td className="pl-mono" style={{fontSize:11}}>{e.source_ip ?? "-"}</td><td><StatusBadge status={e.status ?? "Forwarded"}/></td><td style={{fontSize:12}}>{e.duration_ms? `${e.duration_ms}ms`:"—"}</td></tr>)}</tbody></table>}</div>
    )}
  </div>;
}

function Logs({ tenantId }:{tenantId:string}){
  const [logs,setLogs]=useState<any[]>([]); const [dels,setDels]=useState<any[]>([]); const [filter,setFilter]=useState("All");
  useEffect(()=>{ apiFetch(`/api/v1/tenants/${tenantId}/logs`).then(j=>setLogs(j.data)).catch(()=>{}); apiFetch(`/api/v1/tenants/${tenantId}/deliveries`).then(j=>setDels(j.data)).catch(()=>{}); },[tenantId]);
  const cats=["All","Delivery","Webhook","Security","Provider","System"];
  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div><h2 style={{margin:0,fontSize:18}}>Logs</h2><p style={{margin:"4px 0 0",fontSize:13,color:"var(--text-secondary)"}}>Operational events, not raw server logs.</p></div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{cats.map(c=><button key={c} onClick={()=>setFilter(c)} style={{padding:"6px 12px",borderRadius:999,border:"1px solid var(--border)",background:filter===c?"var(--accent)":"var(--bg-card)",color:filter===c?"white":"var(--text-secondary)",fontSize:12,fontWeight:600,cursor:"pointer"}}>{c}</button>)}</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div className="pl-card"><div className="pl-card-title" style={{marginBottom:12}}>Deliveries</div>{dels.length===0? <div className="pl-empty">No deliveries.</div> : <table className="pl-table"><thead><tr><th>ID</th><th>Status</th><th>Updated</th></tr></thead><tbody>{dels.slice(0,10).map((r:any)=><tr key={r.id}><td className="pl-mono" style={{fontSize:11}}>{r.id.slice(0,12)}</td><td><StatusBadge status={r.status}/></td><td style={{fontSize:12,color:"var(--text-muted)"}}>{new Date(r.updated_at).toLocaleString()}</td></tr>)}</tbody></table>}</div>
      <div className="pl-card"><div className="pl-card-title" style={{marginBottom:12}}>Audit logs</div>{logs.length===0? <div className="pl-empty" style={{fontSize:12}}>No audit logs yet.</div> : <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:420,overflow:"auto"}}>{logs.slice(0,20).map((l:any,i:number)=><div key={i} style={{padding:"10px 12px",background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:8}}><div style={{fontSize:12,fontWeight:500}}>{l.action ?? l.event ?? JSON.stringify(l).slice(0,80)}</div><div style={{fontSize:11,color:"var(--text-muted)"}}>{l.created_at? new Date(l.created_at).toLocaleString():""} · {l.actor ?? ""}</div></div>)}</div>}</div>
    </div>
  </div>;
}

function Settings({ tenantId }:{tenantId:string}){
  const [keys,setKeys]=useState<any[]>([]); const [name,setName]=useState(""); const [lastKey,setLastKey]=useState<string|null>(null);
  const reload=()=> apiFetch(`/api/v1/tenants/${tenantId}/api-keys`).then(j=>setKeys(j.data));
  useEffect(()=>{ reload(); },[tenantId]);
  async function create(e:React.FormEvent){ e.preventDefault(); const j=await apiFetch(`/api/v1/tenants/${tenantId}/api-keys`,{method:"POST",body:JSON.stringify({name})}); setLastKey(j.data.key); setName(""); reload(); }
  async function revoke(id:string){ await apiFetch(`/api/v1/tenants/${tenantId}/api-keys/${id}/revoke`,{method:"POST"}); reload(); }
  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div><h2 style={{margin:0,fontSize:18}}>API Keys</h2><p style={{margin:"4px 0 0",fontSize:13,color:"var(--text-secondary)"}}>Manage machine access tokens. Secrets shown only once.</p></div>
    <form onSubmit={create} className="pl-card" style={{display:"flex",gap:8}}><input className="pl-input" placeholder="Key name (e.g. prod)" value={name} onChange={e=>setName(e.target.value)} required style={{maxWidth:260}}/><button className="pl-btn pl-btn-primary" type="submit"><I.plus/> Create key</button></form>
    {lastKey && <div style={{background:"var(--warning-soft)",border:"1px solid rgba(245,158,11,0.25)",padding:"12px 14px",borderRadius:12}}><strong style={{fontSize:13}}>Copy now — shown once:</strong><pre style={{wordBreak:"break-all",whiteSpace:"pre-wrap",fontFamily:"var(--font-mono)",fontSize:12,margin:"8px 0 0",background:"var(--bg-input)",padding:10,borderRadius:8}}>{lastKey}</pre></div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
      {keys.map((k:any)=><div key={k.id} className="pl-card" style={{display:"flex",flexDirection:"column",gap:8}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:600,fontSize:14}}>{k.name}</span><StatusBadge status={k.status}/></div><div className="pl-mono" style={{fontSize:12,background:"var(--bg-input)",border:"1px solid var(--border)",padding:"6px 8px",borderRadius:6}}>{k.key_prefix}••••••••</div><div style={{fontSize:11,color:"var(--text-muted)"}}>Last used {k.last_used_at? new Date(k.last_used_at).toLocaleString():"never"} · {k.ip_rules_count ?? 0} IP rules</div><div style={{display:"flex",gap:8,marginTop:4}}>{k.status==="active" && <button className="pl-btn pl-btn-secondary pl-btn-sm" onClick={()=>revoke(k.id)}>Revoke</button>}<button className="pl-btn pl-btn-ghost pl-btn-sm">Manage</button></div></div>)}
      {keys.length===0 && <div className="pl-card pl-empty" style={{gridColumn:"1/-1"}}>No API keys yet.</div>}
    </div>
    <div className="pl-card" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontWeight:600,fontSize:13}}>Account</div><div style={{fontSize:12,color:"var(--text-muted)"}}>Sign out of this workspace.</div></div><button className="pl-btn pl-btn-secondary" onClick={()=>{ setToken(null); setTenantId(null); location.reload(); }}>Sign out</button></div>
  </div>;
}

function IpAccess(){
  return <div style={{display:"flex",flexDirection:"column",gap:16}}><div><h2 style={{margin:0,fontSize:18}}>IP Access</h2><p style={{margin:"4px 0 0",fontSize:13,color:"var(--text-secondary)"}}>Allowlist per API key / scope.</p></div>
    <div className="pl-card" style={{padding:0,overflow:"hidden"}}><table className="pl-table"><thead><tr><th>IP / CIDR</th><th>Scope</th><th>Description</th><th>Status</th></tr></thead><tbody><tr><td className="pl-mono">103.20.10.40/32</td><td>Production API</td><td style={{color:"var(--text-muted)"}}>Mini server API</td><td><StatusBadge status="Active"/></td></tr><tr><td className="pl-mono">10.10.0.0/16</td><td>Internal API</td><td style={{color:"var(--text-muted)"}}>Internal network</td><td><StatusBadge status="Active"/></td></tr></tbody></table></div>
    <div style={{fontSize:12,color:"var(--text-muted)"}}>Monospace for network values — configure via API.</div>
  </div>;
}

// ── shell ──
export default function App(){
  const [authed,setAuthed]=useState(()=>!!getToken());
  const tenantId=useTenantId();
  const [tenants,setTenants]=useState<any[]>([]);
  const [collapsed,setCollapsed]=useState(false);
  const [cmd,setCmd]=useState(false);
  const [tenantOpen,setTenantOpen]=useState(false);
  const navigate=useNavigate();
  const searchRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{ if(authed) apiFetch("/api/v1/auth/me").then(j=>{ setTenants(j.data.tenants||[]); if(!getTenantId() && j.data.tenants?.[0]) setTenantId(j.data.tenants[0].id); }).catch(()=>{ setToken(null); setAuthed(false); }); },[authed]);
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{ if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==="k"){ e.preventDefault(); setCmd(v=>!v);} if(e.key==="Escape") setCmd(false); };
    window.addEventListener("keydown",h); return()=>window.removeEventListener("keydown",h);
  },[]);
  const tenant=useMemo(()=> tenants.find((t:any)=>t.id===tenantId), [tenants,tenantId]);

  if(!authed) return <LoginGate onAuth={()=>{ setAuthed(true); navigate("/"); }} />;
  if(!tenantId) return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"var(--bg-base)",padding:24}}><div className="pl-card" style={{width:420}}><h3 style={{margin:"0 0 12px"}}>Select workspace</h3>{tenants.length===0?<Skeleton h={60}/>: tenants.map((t:any)=><button key={t.id} className="pl-btn pl-btn-secondary" onClick={()=>{ setTenantId(t.id); location.reload(); }} style={{display:"flex",width:"100%",margin:"8px 0",justifyContent:"space-between"}}>{t.name} <span className="pl-mono" style={{fontSize:11,color:"var(--text-muted)"}}>{t.slug}</span></button>)}<button className="pl-btn pl-btn-ghost" onClick={()=>{ setToken(null); setTenantId(null); location.reload(); }}>Sign out</button></div></div>;

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
                {tenants.map((t:any)=><button key={t.id} onClick={()=>{ setTenantId(t.id); setTenantOpen(false); location.reload(); }} style={{display:"flex",width:"100%",padding:"8px 10px",borderRadius:8,border:"none",background: t.id===tenantId?"var(--accent-soft)":"transparent",color: t.id===tenantId?"var(--text-primary)":"var(--text-secondary)",textAlign:"left",cursor:"pointer",fontSize:13}}>{t.name}</button>)}
                <div style={{height:1,background:"var(--border)",margin:"6px 0"}}/>
                <button style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px dashed var(--border)",background:"transparent",color:"var(--text-muted)",fontSize:12,cursor:"pointer"}}>+ Create Tenant</button>
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
          <Route path="/deliveries" element={<Logs tenantId={tenantId} />} />
          <Route path="/settings" element={<Settings tenantId={tenantId} />} />
          <Route path="/api-keys" element={<Settings tenantId={tenantId} />} />
          <Route path="/ip-access" element={<IpAccess/>} />
          <Route path="*" element={<div className="pl-card"><h2>Not found</h2></div>} />
        </Routes>
      </div>
    </main>

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
