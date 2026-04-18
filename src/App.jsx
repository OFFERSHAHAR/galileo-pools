import { useState, useRef, useEffect } from "react";

// ─── Fallback demo data ────────────────────────────────────────────────────
const DEMO_USERS = [
  { username:"admin",   password:"1234", role:"admin",    name:"מנהל גליליאו",  icon:"👔", welcomeMessage:"ברוך הבא למרכז הניהול", phone:"0501234567" },
  { username:"avi",     password:"1234", role:"operator", name:"אבי כהן",        icon:"🏊", welcomeMessage:"יאללה לעבודה אבי! 💪",   phone:"0521234567" },
  { username:"yossi",   password:"1234", role:"operator", name:"יוסי לוי",       icon:"🌊", welcomeMessage:"יום טוב יוסי!",           phone:"0531234567" },
  { username:"moti",    password:"1234", role:"operator", name:"מוטי גולן",      icon:"⚡", welcomeMessage:"בוקר טוב מוטי!",           phone:"0541234567" },
];
const DEMO_CLIENTS = [
  { name:"משפחת כהן - הגפן 12",   phone:"0521111111", address:"רחוב הגפן 12" },
  { name:"משפחת לוי - הזית 5",    phone:"0522222222", address:"רחוב הזית 5" },
  { name:"מלון כרמי",              phone:"0523333333", address:"רחוב האלמוגים 1" },
  { name:"משפחת גולן - הגעתון 3", phone:"0524444444", address:"רחוב הגעתון 3" },
  { name:"וילה ים - הנמל 18",     phone:"0525555555", address:"רחוב הנמל 18" },
  { name:"ספא עכו",               phone:"0526666666", address:"רחוב הדקל 7" },
  { name:"מלון דן כרמל",          phone:"0527777777", address:"רחוב המלכים 5" },
  { name:"מועדון ימי",            phone:"0528888888", address:"רחוב הים 2" },
];

const CITY = "אילת";
const wazeUrl = (address) =>
  `https://waze.com/ul?q=${encodeURIComponent(address + ", " + CITY)}&navigate=yes`;

// ─── Helpers ───────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().slice(0,10);
const fmtDate  = s => { if(!s)return""; const[y,m,d]=s.split("-"); return`${d}/${m}/${y}`; };
const calcNext = (s,days=90) => { if(!s)return null; const d=new Date(s); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); };
const daysLeft = s => s ? Math.ceil((new Date(s)-new Date())/864e5) : null;
const nowStr   = () => new Date().toLocaleString("he-IL");

// ─── Google Apps Script API ────────────────────────────────────────────────
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzKKk_M0noXnKrniCsBDO4dAUWPDkpK8YH0QhhpJQfSaCyfqmAQlLJOb-sN5atSj5nj/exec";

async function sheetCall(action, payload={}) {
  try {
    const r = await fetch(SCRIPT_URL, {
      method:"POST",
      headers:{"Content-Type":"text/plain"},
      body: JSON.stringify({ action, ...payload })
    });
    return await r.json();
  } catch(e) {
    console.error("sheetCall error:", e);
    return null;
  }
}
function parseJSON(txt) {
  try { return JSON.parse(txt.replace(/```json|```/g,"").trim()); } catch { return null; }
}

// ─── UI atoms ─────────────────────────────────────────────────────────────
const BG  = {minHeight:"100vh",background:"linear-gradient(135deg,#020c1b,#0a1628,#071a2e)",fontFamily:"'Heebo',sans-serif",padding:"20px 16px"};
const WRAP = {maxWidth:540,margin:"0 auto"};
const INP  = {width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:11,padding:"11px 13px",color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"'Heebo',sans-serif"};
const SEL  = {...INP,background:"#0d1e35"};
const CARD = (extra={})=>({background:"rgba(255,255,255,0.04)",borderRadius:14,padding:16,border:"1px solid rgba(255,255,255,0.08)",...extra});

const Btn = ({children,onClick,color="#0ea5e9",disabled,style={}}) => (
  <button onClick={onClick} disabled={disabled}
    style={{width:"100%",padding:"13px",borderRadius:12,border:"none",cursor:disabled?"not-allowed":"pointer",
      fontSize:15,fontWeight:800,background:disabled?"rgba(255,255,255,0.08)":`linear-gradient(135deg,${color},${color}cc)`,
      color:disabled?"#475569":"#fff",boxShadow:disabled?"none":`0 4px 18px ${color}44`,...style}}>
    {children}
  </button>
);

const Badge = ({label,col="#7dd3fc",bg}) => (
  <span style={{background:bg||`${col}18`,color:col,border:`1px solid ${col}33`,borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700}}>{label}</span>
);

const Sec = ({icon,title,children}) => (
  <div style={{marginBottom:24}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
      <span>{icon}</span>
      <span style={{color:"#7dd3fc",fontSize:11,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase"}}>{title}</span>
      <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(125,211,252,0.25),transparent)"}}/>
    </div>
    {children}
  </div>
);

const Slider = ({label,min,max,step=0.1,value,onChange,optimal,unit="",warnAbove,warnBelow}) => {
  const pct=((value-min)/(max-min))*100;
  let col="#22c55e",txt="תקין",bg="rgba(34,197,94,0.1)";
  if(warnAbove&&value>warnAbove){col="#ef4444";txt="⚠️ גבוה מדי";bg="rgba(239,68,68,0.1)";}
  else if(warnBelow&&value<warnBelow){col="#f59e0b";txt="⚠️ נמוך מדי";bg="rgba(245,158,11,0.1)";}
  else if(optimal&&Math.abs(value-optimal)<0.3){col="#06b6d4";txt="✓ אופטימלי";bg="rgba(6,182,212,0.1)";}
  return(
    <div style={{...CARD(),marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{color:"#cbd5e1",fontSize:14,fontWeight:600}}>{label}</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{background:bg,color:col,borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:700,border:`1px solid ${col}33`}}>{txt}</span>
          <span style={{color:"#7dd3fc",fontSize:20,fontWeight:800,minWidth:46,textAlign:"right"}}>{value}{unit}</span>
        </div>
      </div>
      <div style={{position:"relative",height:6,borderRadius:99,background:"rgba(255,255,255,0.08)",marginBottom:6}}>
        <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${pct}%`,borderRadius:99,background:`linear-gradient(90deg,#0ea5e9,${col})`,transition:"width 0.15s"}}/>
        {optimal&&<div style={{position:"absolute",top:-4,left:`${((optimal-min)/(max-min))*100}%`,width:2,height:14,background:"#06b6d4",borderRadius:2,transform:"translateX(-50%)"}}/>}
        <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(parseFloat(e.target.value))}
          style={{position:"absolute",top:-8,left:0,width:"100%",opacity:0,cursor:"pointer",height:22}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#475569"}}>
        <span>{min}</span>{optimal&&<span style={{color:"#06b6d4"}}>אופטימלי {optimal}</span>}<span>{max}</span>
      </div>
    </div>
  );
};

const Toggle = ({label,value,onChange}) => (
  <div style={{...CARD(),marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
    <span style={{color:"#cbd5e1",fontSize:14,fontWeight:600}}>{label}</span>
    <div style={{display:"flex",gap:6}}>
      {["תקין","לא תקין"].map(o=>(
        <button key={o} onClick={()=>onChange(o)} style={{padding:"5px 14px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,
          background:value===o?(o==="תקין"?"#0ea5e9":"#ef4444"):"rgba(255,255,255,0.07)",color:value===o?"#fff":"#64748b",transition:"all 0.15s"}}>{o}</button>
      ))}
    </div>
  </div>
);


const ProgressBar = ({done,total,col="#0ea5e9"}) => {
  const pct = total>0 ? Math.round((done/total)*100) : 0;
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#94a3b8",marginBottom:5}}>
        <span>{done}/{total} משימות</span><span style={{color:col,fontWeight:700}}>{pct}%</span>
      </div>
      <div style={{height:7,background:"rgba(255,255,255,0.07)",borderRadius:99}}>
        <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${col},${col}88)`,borderRadius:99,transition:"width 0.4s"}}/>
      </div>
    </div>
  );
};

// ─── Blank form ────────────────────────────────────────────────────────────
const blank = () => ({
  reportDate:todayStr(), client:"",
  chlorine:1.5, ph:7.4, salt:3.5,
  elModel:"", elSerial:"", elDate:"",
  waterLevel:"תקין", clarity:"תקין", fat:"תקין", flow:"תקין",
  acid:false, phUp:false, saltPkg:false, saltBags:1,
  poolStatus:"מאוזנת", customStatusText:"", restrictedUntil:"",
  notes:"", photos:[], clientLocked:false,
});

// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  // ── Auth ──────────────────────────────────────────────────────────
  const [user, setUser]         = useState(null); // { username,role,name,icon,welcomeMessage,phone }
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr,  setLoginErr]  = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Sheets ────────────────────────────────────────────────────────
  const [sheetId,      setSheetId]      = useState("");
  const [sheetsStatus, setSheetsStatus] = useState("idle");
  const [allUsers,     setAllUsers]     = useState(DEMO_USERS);
  const [clients,      setClients]      = useState(DEMO_CLIENTS); // [{name,phone}]
  const [tasks,        setTasks]        = useState([]); // [{id,date,client,operators:[],status,changeLog:[]}]
  const [supplyDB,     setSupplyDB]     = useState({}); // {client: {acid,phUp,saltPkg,saltBags,updatedAt}}
  const [reports,      setReports]      = useState([]);
  const [pending,      setPending]      = useState([]);

  const clientPhone   = (name) => (clients.find(c=>c.name===name)||{}).phone||"";
  const clientAddress = (name) => (clients.find(c=>c.name===name)||{}).address||"";

  // ── UI ────────────────────────────────────────────────────────────
  const [screen,    setScreen]    = useState("login"); // login|form|done|daily|admin
  const [dismissed, setDismissed] = useState(false);
  const [syncing,   setSyncing]   = useState(false);
  const [syncMsg,   setSyncMsg]   = useState(null);

  // ── Form ──────────────────────────────────────────────────────────
  const [form, setForm] = useState(blank());
  const fileRef = useRef();
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));
  const { reportDate,client,chlorine,ph,salt,elModel,elSerial,elDate,
          waterLevel,clarity,fat,flow,acid,phUp,saltPkg,saltBags,
          poolStatus,customStatusText,restrictedUntil,notes,photos } = form;

  // ── Admin panel ───────────────────────────────────────────────────
  const [adminTab,     setAdminTab]     = useState("daily"); // daily|progress|users
  const [taskDate,     setTaskDate]     = useState(todayStr());
  const [taskClient,   setTaskClient]   = useState("");
  const [taskOps,      setTaskOps]      = useState([]); // selected operator names
  const [taskNote,     setTaskNote]     = useState("");
  const [editTaskId,   setEditTaskId]   = useState(null);

  // ── Daily board ───────────────────────────────────────────────────
  const [dailyDate,    setDailyDate]    = useState(todayStr());

  // ── Conversation ─────────────────────────────────────────────────
  const [showConv,     setShowConv]     = useState(false);
  const [convTarget,   setConvTarget]   = useState("");

  const operatorUsers = allUsers.filter(u=>u.role==="operator");
  const opNames       = operatorUsers.map(u=>u.name);
  const clList        = clients; // [{name, phone}]
  const opList        = opNames;

  // ══ Sheets connect ════════════════════════════════════════════════
  const connectSheets = async () => {
    setSheetsStatus("connecting");
    try {
      // fetch users
      const uRes = await sheetCall("getUsers");
      if (uRes?.users?.length) setAllUsers(uRes.users);

      // fetch clients
      const cRes = await sheetCall("getClients");
      if (cRes?.clients?.length) setClients(cRes.clients);

      // fetch tasks
      const tRes = await sheetCall("getTasks");
      if (Array.isArray(tRes?.tasks)) setTasks(tRes.tasks);

      // fetch supply DB
      const sRes = await sheetCall("getSupplyDB");
      if (sRes?.supplyDB) setSupplyDB(sRes.supplyDB);

      setSheetId("connected");
      setSheetsStatus("ready");
    } catch(e) { setSheetsStatus("error"); }
  };

  // ══ Login ═════════════════════════════════════════════════════════
  const handleLogin = async () => {
    setLoginErr(""); setLoginLoading(true);
    const found = allUsers.find(u=>u.username.toLowerCase()===loginUser.toLowerCase().trim() && u.password.toLowerCase()===loginPass.toLowerCase().trim());
    if (found) {
      setUser(found);
      setScreen(found.role==="admin"?"admin":"daily");
    } else {
      setLoginErr("שם משתמש או סיסמה שגויים");
    }
    setLoginLoading(false);
  };

  // ══ Task management ═══════════════════════════════════════════════
  const saveTask = async (task) => {
    const isEdit = !!editTaskId;
    const logEntry = {
      at: nowStr(),
      note: taskNote || (isEdit ? "משימה עודכנה" : "משימה נוצרה"),
      by: user?.name,
      ...(taskNote ? { needsAck: true, ackedBy: [] } : {})
    };
    const newTasks = isEdit
      ? tasks.map(t=>t.id===editTaskId ? {...t,...task, changeLog:[...(t.changeLog||[]), logEntry]} : t)
      : [...tasks, {id:Date.now(), ...task, status:"pending", changeLog:[logEntry]}];
    setTasks(newTasks);
    setEditTaskId(null); setTaskClient(""); setTaskOps([]); setTaskNote("");
    if (sheetId) {
      const rows = newTasks.map(t=>[t.id,t.date,t.client,t.operators.join(","),t.status,JSON.stringify(t.changeLog)]);
      await sheetCall("saveTasks", { tasks: newTasks });
    }
  };

  const updateTask = async (id, changes, logNote, isAdminChange=false) => {
    const newTasks = tasks.map(t=>{
      if(t.id!==id) return t;
      const entry = {
        at: nowStr(),
        note: logNote,
        by: user?.name,
        ...(isAdminChange ? { needsAck: true, ackedBy: [] } : {})
      };
      const newLog = [...(t.changeLog||[]), entry];
      return {...t,...changes,changeLog:newLog};
    });
    setTasks(newTasks);
    if (sheetId) {
      const rows = newTasks.map(t=>[t.id,t.date,t.client,t.operators.join(","),t.status,JSON.stringify(t.changeLog)]);
      await sheetCall("saveTasks", { tasks: newTasks });
    }
  };

  // Operator acknowledges a change
  const ackChange = async (taskId, logIndex) => {
    const newTasks = tasks.map(t=>{
      if(t.id!==taskId) return t;
      const newLog = t.changeLog.map((entry,i)=>{
        if(i!==logIndex) return entry;
        const ackedBy = [...(entry.ackedBy||[])];
        if(!ackedBy.includes(user?.name)) ackedBy.push(user?.name);
        return {...entry, ackedBy};
      });
      return {...t, changeLog:newLog};
    });
    setTasks(newTasks);
    if (sheetId) {
      const rows = newTasks.map(t=>[t.id,t.date,t.client,t.operators.join(","),t.status,JSON.stringify(t.changeLog)]);
      await sheetCall("saveTasks", { tasks: newTasks });
    }
  };

  const removeOpFromTask = (id,opName) => {
    const t = tasks.find(x=>x.id===id);
    if(!t) return;
    const newOps = t.operators.filter(o=>o!==opName);
    updateTask(id,{operators:newOps},`הוסר ${opName} מהמשימה`,true);
  };
  const addOpToTask = (id,opName) => {
    const t = tasks.find(x=>x.id===id);
    if(!t||t.operators.includes(opName)) return;
    updateTask(id,{operators:[...t.operators,opName]},`נוסף ${opName} למשימה`,true);
  };
  const markTaskDone = (id) => {
    updateTask(id,{status:"done"},`דוח הוגש — משימה סומנה כבוצעה`,false);
  };

  // ══ Form submit ════════════════════════════════════════════════════
  const handleSubmit = async () => {
    const elNext = calcNext(elDate);
    const supplyLabel = [acid&&"חומצת מלח",phUp&&"מעלה pH",saltPkg&&`מלח ×${saltBags}`].filter(Boolean).join(", ");

    // update supply DB
    if (client&&(acid||phUp||saltPkg)) {
      const newDB = {...supplyDB,[client]:{acid,phUp,saltPkg,saltBags,updatedAt:fmtDate(reportDate)}};
      setSupplyDB(newDB);
      if(sheetId){
        const rows=Object.entries(newDB).map(([c,v])=>[c,v.acid?"כן":"לא",v.phUp?"כן":"לא",v.saltPkg?"כן":"לא",v.saltBags||0,v.updatedAt]);
        await sheetCall("saveSupplyDB", { rows });
      }
    }

    // mark matching task done
    const matchTask = tasks.find(t=>t.date===reportDate && t.client===client && t.operators.includes(user?.name) && t.status!=="done");
    if(matchTask) markTaskDone(matchTask.id);

    const report = {
      id:Date.now(), reportDate, operator:user?.name||"", client,
      chlorine, ph, salt, elModel, elSerial, elDate, elNext:elNext||"",
      supplyLabel, waterLevel, clarity, fat, flow,
      poolStatus, customStatusText, restrictedUntil,
      notes, photosCount:photos.length,
      followupNeeded: poolStatus==="אחר" && !!restrictedUntil,
    };

    const newReports = [...reports, report];
    setReports(newReports);

    setSyncing(true);
    let saved = false;
    if(sheetId){
      const res = await sheetCall("saveReport", { report }).catch(()=>null);
      saved = res?.success === true;
    }
    if(!saved){ setPending(p=>[...p,report]); setDismissed(false); }
    setSyncing(false);

    // Auto-open WhatsApp to client
    const phone = clientPhone(client);
    const waMsg = buildWA(report);
    const waUrl = phone
      ? `https://wa.me/972${phone.replace(/^0/,"")}?text=${encodeURIComponent(waMsg)}`
      : `https://wa.me/?text=${encodeURIComponent(waMsg)}`;
    window.open(waUrl, "_blank");

    setScreen("done");
  };

  // ══ Manual sync ════════════════════════════════════════════════════
  const handleManualSync = async () => {
    if(!pending.length||!sheetId) return;
    setSyncing(true); setSyncMsg(null);
    let allOk = true;
    for (const report of pending) {
      const res = await sheetCall("saveReport", { report }).catch(()=>null);
      if (!res?.success) allOk = false;
    }
    if(allOk){setPending([]);setSyncMsg("ok");}else setSyncMsg("fail");
    setSyncing(false);
    setTimeout(()=>setSyncMsg(null),4000);
  };

    const buildWA = (r=form) => {
    const name   = r.client?.split(" - ")[0]||"לקוח יקר";
    const opName = user?.name||"";
    const statusLine = r.poolStatus==="אחר"
      ? `⚠️ *נדרשת תשומת לב:*\n${r.customStatusText}${r.restrictedUntil?`\nהבריכה לא זמינה עד ${fmtDate(r.restrictedUntil)}`:""}`
      : "✅ הבריכה מאוזנת ומוכנה לשימוש מלא";
    return `🏊 *צוות גליליאו טיפל בבריכתכם!*

שלום ${name} 👋

${opName} סיים את הטיפול המסור בבריכה שלכם היום 💙

${statusLine}
${r.notes?`\n📝 ${r.notes}`:""}

תמיד כאן בשבילכם 🌊
_צוות גליליאו_`;
  };

  // ── Tasks for a given date + operator ──────────────────────────────
  const myTasks = (date=dailyDate) =>
    tasks.filter(t => t.date===date && (user?.role==="admin" || t.operators.includes(user?.name)));

  const todayReportedClients = reports.filter(r=>r.reportDate===dailyDate && r.operator===user?.name).map(r=>r.client);

  // ══════════════════════════════════════════════════════════════════
  // SCREEN: LOGIN
  // ══════════════════════════════════════════════════════════════════
  if (screen==="login") return (
    <div dir="rtl" style={BG}>
      <div style={{...WRAP,maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:36,paddingTop:40}}>
          <div style={{fontSize:52,marginBottom:10}}>🌊</div>
          <h1 style={{color:"#fff",fontSize:26,fontWeight:900,margin:0}}>צוות גליליאו</h1>
          <p style={{color:"#475569",fontSize:13,margin:"6px 0 0"}}>מערכת ניהול בריכות</p>
        </div>

        {/* Sheets connect (optional before login) */}
        {sheetsStatus==="idle" && (
          <div style={{...CARD(),marginBottom:20,display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={connectSheets}>
            <span style={{fontSize:20}}>📊</span>
            <div style={{flex:1}}>
              <div style={{color:"#7dd3fc",fontSize:13,fontWeight:800}}>חבר ל-Google Sheets</div>
              <div style={{color:"#475569",fontSize:11}}>לניהול משתמשים מהגיליון</div>
            </div>
            <span style={{color:"#7dd3fc",fontSize:13,fontWeight:700}}>חבר</span>
          </div>
        )}
        {sheetsStatus==="connecting"&&<div style={{...CARD(),marginBottom:20,color:"#7dd3fc",fontSize:13,fontWeight:700,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>🔄</span>מתחבר...</div>}
        {sheetsStatus==="ready"&&<div style={{...CARD({border:"1px solid rgba(34,197,94,0.3)"}),marginBottom:20,color:"#4ade80",fontSize:13,fontWeight:700,textAlign:"center"}}>✅ מחובר ל-Google Sheets</div>}

        <div style={{...CARD(),padding:24}}>
          <div style={{marginBottom:14}}>
            <label style={{color:"#94a3b8",fontSize:11,fontWeight:700,display:"block",marginBottom:6}}>שם משתמש</label>
            <input value={loginUser} onChange={e=>setLoginUser(e.target.value)} placeholder="username"
              onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={INP}/>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{color:"#94a3b8",fontSize:11,fontWeight:700,display:"block",marginBottom:6}}>סיסמה</label>
            <input type="password" value={loginPass} onChange={e=>setLoginPass(e.target.value)} placeholder="••••"
              onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={INP}/>
          </div>
          {loginErr&&<div style={{color:"#f87171",fontSize:13,textAlign:"center",marginBottom:14,fontWeight:700}}>{loginErr}</div>}
          <Btn onClick={handleLogin} disabled={loginLoading||!loginUser||!loginPass}>
            {loginLoading?"⏳ מתחבר...":"כניסה →"}
          </Btn>
        </div>

        <div style={{textAlign:"center",marginTop:20,color:"#1e3a5f",fontSize:11}}>
          <div>Demo: admin/1234 · avi/1234 · yossi/1234</div>
        </div>
      </div>
      <STYLES/>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════
  // SCREEN: ADMIN PANEL
  // ══════════════════════════════════════════════════════════════════
  if (screen==="admin") {
    const dayTasks = tasks.filter(t=>t.date===taskDate);
    // progress per operator
    const progressData = operatorUsers.map(op=>{
      const assigned = tasks.filter(t=>t.date===dailyDate && t.operators.includes(op.name));
      const done     = assigned.filter(t=>t.status==="done");
      return {op, total:assigned.length, done:done.length};
    });

    return (
      <div dir="rtl" style={BG}>
        <div style={WRAP}>
          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
            <div>
              <h1 style={{color:"#fff",fontSize:21,fontWeight:900,margin:0}}>פאנל ניהול 👔</h1>
              <p style={{color:"#475569",fontSize:12,margin:"3px 0 0"}}>שלום {user?.name}</p>
            </div>
            <button onClick={()=>{setUser(null);setScreen("login");}}
              style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:9,padding:"7px 12px",color:"#64748b",cursor:"pointer",fontSize:12,fontWeight:700}}>
              יציאה
            </button>
          </div>

          {/* Tabs */}
          <div style={{display:"flex",gap:6,marginBottom:22,background:"rgba(255,255,255,0.04)",borderRadius:12,padding:5}}>
            {[["daily","📋 חלוקת עבודה"],["progress","📊 התקדמות"],["users","👥 משתמשים"]].map(([t,lbl])=>(
              <button key={t} onClick={()=>setAdminTab(t)} style={{flex:1,padding:"9px 4px",borderRadius:9,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,
                background:adminTab===t?"linear-gradient(135deg,#0284c7,#06b6d4)":"transparent",color:adminTab===t?"#fff":"#64748b",transition:"all 0.15s"}}>
                {lbl}
              </button>
            ))}
          </div>

          {/* ── TAB: daily assignment ── */}
          {adminTab==="daily" && (
            <div>
              <Sec icon="📅" title="הוספת / עריכת משימה">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                  <div>
                    <label style={{color:"#64748b",fontSize:11,fontWeight:700,display:"block",marginBottom:5}}>תאריך</label>
                    <input type="date" value={taskDate} onChange={e=>setTaskDate(e.target.value)} style={{...INP,color:"#7dd3fc",border:"1px solid rgba(14,165,233,0.3)",fontWeight:700}}/>
                  </div>
                  <div>
                    <label style={{color:"#64748b",fontSize:11,fontWeight:700,display:"block",marginBottom:5}}>לקוח</label>
                    <select value={taskClient} onChange={e=>setTaskClient(e.target.value)} style={{...SEL,color:taskClient?"#fff":"#64748b"}}>
                      <option value="">בחר לקוח</option>
                      {clients.map(c=><option key={c.name}>{c.name}</option>)}
                    </select>
                    {/* Supply preview from last report */}
                    {taskClient && supplyDB[taskClient] && (()=>{
                      const s = supplyDB[taskClient];
                      const items = [s.acid&&"🧪 חומצת מלח", s.phUp&&"📈 מעלה pH", s.saltPkg&&`🧂 מלח ×${s.saltBags}`].filter(Boolean);
                      return items.length > 0 ? (
                        <div style={{marginTop:8,background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:10,padding:"10px 12px"}}>
                          <div style={{color:"#fbbf24",fontSize:11,fontWeight:700,marginBottom:6}}>📦 ציוד נדרש מדוח קודם · {s.updatedAt}</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                            {items.map(it=><Badge key={it} label={it} col="#fbbf24" bg="rgba(245,158,11,0.12)"/>)}
                          </div>
                        </div>
                      ) : (
                        <div style={{marginTop:6,color:"#475569",fontSize:11,padding:"6px 10px"}}>✓ אין ציוד נדרש מהדוח האחרון</div>
                      );
                    })()}
                  </div>
                </div>
                {/* Multi-operator select */}
                <div style={{marginBottom:12}}>
                  <label style={{color:"#64748b",fontSize:11,fontWeight:700,display:"block",marginBottom:7}}>מפעילים משובצים</label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                    {opNames.map(n=>{
                      const sel=taskOps.includes(n);
                      return(
                        <button key={n} onClick={()=>setTaskOps(sel?taskOps.filter(x=>x!==n):[...taskOps,n])}
                          style={{padding:"7px 14px",borderRadius:20,border:`2px solid ${sel?"#0ea5e9":"rgba(255,255,255,0.12)"}`,cursor:"pointer",fontSize:13,fontWeight:700,
                            background:sel?"rgba(14,165,233,0.15)":"rgba(255,255,255,0.04)",color:sel?"#7dd3fc":"#64748b",transition:"all 0.15s"}}>
                          {sel?"✓ ":""}{n}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{marginBottom:12}}>
                  <label style={{color:"#64748b",fontSize:11,fontWeight:700,display:"block",marginBottom:5}}>הערה (log)</label>
                  <input value={taskNote} onChange={e=>setTaskNote(e.target.value)} placeholder="הערה לשינוי..." style={INP}/>
                </div>
                <Btn onClick={()=>saveTask({date:taskDate,client:taskClient,operators:taskOps})} disabled={!taskClient||!taskOps.length}
                  style={{marginBottom:0}}>
                  {editTaskId?"💾 עדכן משימה":"➕ הוסף משימה"}
                </Btn>
              </Sec>

              {/* Tasks list for selected date */}
              <Sec icon="📋" title={`משימות — ${fmtDate(taskDate)}`}>
                {dayTasks.length===0
                  ? <div style={{textAlign:"center",padding:"30px 0",color:"#334155"}}><div style={{fontSize:36,marginBottom:8}}>📭</div><p>אין משימות לתאריך זה</p></div>
                  : dayTasks.map(t=>{
                    const lastLog = t.changeLog?.[t.changeLog.length-1];
                    return(
                      <div key={t.id} style={{...CARD(),marginBottom:10}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                          <div>
                            <div style={{color:"#fff",fontWeight:700,fontSize:15}}>{t.client}</div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:6}}>
                              {t.operators.map(op=>(
                                <span key={op} style={{display:"flex",alignItems:"center",gap:4,background:"rgba(14,165,233,0.1)",border:"1px solid rgba(14,165,233,0.2)",borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700,color:"#7dd3fc"}}>
                                  {op}
                                  <button onClick={()=>removeOpFromTask(t.id,op)} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:11,padding:0,lineHeight:1}}>✕</button>
                                </span>
                              ))}
                            </div>
                          </div>
                          <Badge label={t.status==="done"?"✓ בוצע":"ממתין"} col={t.status==="done"?"#4ade80":"#f59e0b"}/>
                        </div>
                        {/* Add operator */}
                        <div style={{display:"flex",gap:6,marginBottom:lastLog?8:0}}>
                          <select defaultValue="" onChange={e=>{if(e.target.value){addOpToTask(t.id,e.target.value);e.target.value="";}}}
                            style={{...SEL,flex:1,fontSize:12,padding:"7px 10px",color:"#64748b"}}>
                            <option value="">+ הוסף מפעיל</option>
                            {opNames.filter(n=>!t.operators.includes(n)).map(n=><option key={n}>{n}</option>)}
                          </select>
                          <button onClick={()=>{setEditTaskId(t.id);setTaskClient(t.client);setTaskOps(t.operators);setTaskDate(t.date);window.scrollTo(0,0);}}
                            style={{background:"rgba(14,165,233,0.1)",border:"1px solid rgba(14,165,233,0.2)",borderRadius:9,padding:"7px 12px",color:"#7dd3fc",cursor:"pointer",fontSize:12,fontWeight:700}}>עריכה</button>
                          <button onClick={async()=>{
                            if(!window.confirm("למחוק את המשימה?")) return;
                            const newTasks = tasks.filter(x=>x.id!==t.id);
                            setTasks(newTasks);
                            if(sheetId) await sheetCall("saveTasks",{tasks:newTasks});
                          }} style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:9,padding:"7px 12px",color:"#f87171",cursor:"pointer",fontSize:12,fontWeight:700}}>🗑️</button>
                        </div>
                        {lastLog && (
                          <div style={{borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:8,marginTop:4}}>
                            <div style={{color:"#475569",fontSize:11,marginBottom: lastLog.needsAck?6:0}}>
                              🕐 {lastLog.at} — {lastLog.note} ({lastLog.by})
                            </div>
                            {lastLog.needsAck && (
                              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                                {t.operators.map(op=>{
                                  const acked = (lastLog.ackedBy||[]).includes(op);
                                  return(
                                    <span key={op} style={{background:acked?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.08)",border:`1px solid ${acked?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.25)"}`,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,color:acked?"#4ade80":"#f87171"}}>
                                      {acked?"✓":"⏳"} {op}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                }
              </Sec>
            </div>
          )}

          {/* ── TAB: progress ── */}
          {adminTab==="progress" && (
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
                <label style={{color:"#64748b",fontSize:12,fontWeight:700}}>תאריך:</label>
                <input type="date" value={dailyDate} onChange={e=>setDailyDate(e.target.value)} style={{...INP,maxWidth:160,color:"#7dd3fc",border:"1px solid rgba(14,165,233,0.3)",fontWeight:700}}/>
              </div>
              {progressData.map(({op,total,done})=>(
                <div key={op.name} style={{...CARD(),marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                    <span style={{fontSize:24}}>{op.icon}</span>
                    <div>
                      <div style={{color:"#fff",fontWeight:700,fontSize:15}}>{op.name}</div>
                      <div style={{color:"#475569",fontSize:11}}>{total===0?"אין משימות היום":`${done} הושלמו · ${total-done} נותרו`}</div>
                    </div>
                  </div>
                  {total>0 && <ProgressBar done={done} total={total}/>}
                  {/* Tasks detail */}
                  {tasks.filter(t=>t.date===dailyDate&&t.operators.includes(op.name)).map(t=>(
                    <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderTop:"1px solid rgba(255,255,255,0.05)",marginTop:8}}>
                      <span style={{color:"#94a3b8",fontSize:13}}>{t.client}</span>
                      <Badge label={t.status==="done"?"✓ בוצע":"ממתין"} col={t.status==="done"?"#4ade80":"#f59e0b"}/>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* ── TAB: users ── */}
          {adminTab==="users" && (
            <div>
              {allUsers.map(u=>(
                <div key={u.username} style={{...CARD(),marginBottom:10,display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:28}}>{u.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{color:"#fff",fontWeight:700,fontSize:14}}>{u.name}</div>
                    <div style={{color:"#475569",fontSize:12}}>{u.username} · {u.phone}</div>
                    <div style={{color:"#64748b",fontSize:11,marginTop:2}}>"{u.welcomeMessage}"</div>
                  </div>
                  <Badge label={u.role==="admin"?"מנהל":"מפעיל"} col={u.role==="admin"?"#f59e0b":"#0ea5e9"}/>
                </div>
              ))}
              <div style={{...CARD({border:"1px dashed rgba(255,255,255,0.1)"}),textAlign:"center",padding:20,color:"#334155",marginTop:6}}>
                <div style={{fontSize:24,marginBottom:6}}>📊</div>
                <p style={{margin:0,fontSize:13}}>לניהול משתמשים ערוך ישירות בגיליון "Users"</p>
                {sheetId&&<a href={`https://docs.google.com/spreadsheets/d/${sheetId}`} target="_blank" rel="noreferrer" style={{color:"#7dd3fc",fontSize:13,fontWeight:700}}>פתח גיליון ↗</a>}
              </div>
            </div>
          )}

          <div style={{paddingBottom:24}}/>
        </div>
        <STYLES/>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // SCREEN: DAILY BOARD (operator)
  // ══════════════════════════════════════════════════════════════════
  if (screen==="daily") {
    const todayTasks = myTasks(dailyDate);

    return (
      <div dir="rtl" style={BG}>
        <div style={WRAP}>
          {/* Personal card */}
          <div style={{...CARD({background:"linear-gradient(135deg,rgba(14,165,233,0.12),rgba(6,182,212,0.06))",border:"1px solid rgba(14,165,233,0.2)"}),marginBottom:20,display:"flex",alignItems:"center",gap:14}}>
            <span style={{fontSize:40}}>{user?.icon}</span>
            <div style={{flex:1}}>
              <div style={{color:"#fff",fontWeight:900,fontSize:17}}>{user?.name}</div>
              <div style={{color:"#7dd3fc",fontSize:13,marginTop:3}}>{user?.welcomeMessage}</div>
            </div>
            <button onClick={()=>{setUser(null);setScreen("login");}}
              style={{background:"rgba(255,255,255,0.06)",border:"none",borderRadius:9,padding:"6px 10px",color:"#64748b",cursor:"pointer",fontSize:12}}>יציאה</button>
          </div>

          {/* Date selector */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
            <input type="date" value={dailyDate} onChange={e=>setDailyDate(e.target.value)}
              style={{...INP,maxWidth:170,color:"#7dd3fc",border:"1px solid rgba(14,165,233,0.3)",fontWeight:700}}/>
            <div style={{flex:1}}>
              <div style={{color:"#fff",fontWeight:700,fontSize:14}}>{todayTasks.length} משימות</div>
              <div style={{color:"#475569",fontSize:11}}>{todayReportedClients.length} דוחות הוגשו</div>
            </div>
            <button onClick={()=>setScreen("form")}
              style={{background:"linear-gradient(135deg,#0284c7,#06b6d4)",border:"none",borderRadius:10,padding:"9px 14px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:800}}>
              + דוח
            </button>
          </div>

          {/* Progress bar */}
          {todayTasks.length>0 && (
            <div style={{...CARD(),marginBottom:18}}>
              <ProgressBar done={todayReportedClients.filter(c=>todayTasks.some(t=>t.client===c)).length} total={todayTasks.length}/>
            </div>
          )}

          {/* Tasks */}
          {todayTasks.length===0
            ? <div style={{textAlign:"center",padding:"50px 0",color:"#334155"}}><div style={{fontSize:44,marginBottom:8}}>🏖️</div><p style={{fontSize:14}}>אין משימות לתאריך זה</p></div>
            : todayTasks.map((t,i)=>{
              const done = todayReportedClients.includes(t.client);
              const sup  = supplyDB[t.client];
              const supItems = sup?[sup.acid&&"🧪 חומצת מלח",sup.phUp&&"📈 מעלה pH",sup.saltPkg&&`🧂 מלח ×${sup.saltBags}`].filter(Boolean):[];
              const lastLog = t.changeLog?.[t.changeLog.length-1];
              const recentChange = lastLog && (new Date()-new Date(lastLog.at.replace(/(\d+)\/(\d+)\/(\d+),/,"$3-$2-$1,"))) < 3600000*4;
              return(
                <div key={t.id} style={{...CARD({border:done?"1px solid rgba(34,197,94,0.3)":"1px solid rgba(255,255,255,0.08)"}),marginBottom:12,opacity:done?0.75:1}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{background:"rgba(14,165,233,0.15)",color:"#7dd3fc",borderRadius:99,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,flexShrink:0}}>{i+1}</span>
                      <div>
                        <div style={{color:done?"#4ade80":"#fff",fontWeight:700,fontSize:15}}>{t.client.split(" - ")[0]}</div>
                        <div style={{color:"#475569",fontSize:11}}>{clientAddress(t.client)||t.client.split(" - ")[1]||""}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      {clientAddress(t.client) && (
                        <a href={wazeUrl(clientAddress(t.client))} target="_blank" rel="noreferrer"
                          style={{background:"rgba(100,220,100,0.12)",border:"1px solid rgba(100,220,100,0.25)",borderRadius:9,padding:"5px 10px",textDecoration:"none",fontSize:13,display:"flex",alignItems:"center",gap:4}}>
                          <span>🗺️</span><span style={{color:"#4ade80",fontWeight:700,fontSize:12}}>Waze</span>
                        </a>
                      )}
                      <Badge label={done?"✓ בוצע":"ממתין"} col={done?"#4ade80":"#f59e0b"}/>
                    </div>
                  </div>

                  {/* Supplies */}
                  {supItems.length>0 && (
                    <div style={{marginBottom:8}}>
                      <div style={{color:"#64748b",fontSize:11,fontWeight:700,marginBottom:5}}>📦 ציוד נדרש:</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                        {supItems.map(it=><Badge key={it} label={it} col="#22d3ee"/>)}
                      </div>
                    </div>
                  )}

                  {/* Latest unacknowledged change only */}
                  {(()=>{
                    const log = t.changeLog||[];
                    // find the last entry that needs ack and operator hasn't acked yet
                    let pending = null;
                    let pendingIdx = -1;
                    log.forEach((e,i)=>{
                      if(e.needsAck && !(e.ackedBy||[]).includes(user?.name)){
                        pending = e; pendingIdx = i;
                      }
                    });
                    if(!pending) return null;
                    return (
                      <div style={{background:"rgba(245,158,11,0.1)",border:"2px solid rgba(245,158,11,0.4)",borderRadius:11,padding:"12px 14px",marginBottom:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>
                          <span style={{fontSize:16}}>🔔</span>
                          <span style={{color:"#fbbf24",fontSize:12,fontWeight:800}}>שים לב! גליליאו עדכן את הלוח היומי שלך</span>
                          <span style={{color:"#475569",fontSize:11,marginRight:"auto"}}>{pending.at}</span>
                        </div>
                        <div style={{color:"#fde68a",fontSize:14,fontWeight:700,lineHeight:1.5,marginBottom:10}}>
                          {pending.note}
                        </div>
                        <button onClick={()=>ackChange(t.id, pendingIdx)}
                          style={{width:"100%",padding:"9px",borderRadius:9,border:"none",cursor:"pointer",fontSize:13,fontWeight:800,background:"linear-gradient(135deg,#16a34a,#22c55e)",color:"#fff"}}>
                          קיבלתי ✓
                        </button>
                      </div>
                    );
                  })()}

                  {!done && (
                    <button onClick={()=>{setForm({...blank(),client:t.client,reportDate:dailyDate,clientLocked:true});setScreen("form");}}
                      style={{width:"100%",padding:"9px",borderRadius:9,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,background:"rgba(14,165,233,0.1)",border:"1px solid rgba(14,165,233,0.2)",color:"#7dd3fc"}}>
                      📝 פתח דוח טיפול
                    </button>
                  )}
                </div>
              );
            })
          }

          {/* Open conversation */}
          <div style={{...CARD(),marginBottom:20}}>
            <div style={{color:"#64748b",fontSize:12,fontWeight:700,marginBottom:10}}>📱 פתח שיחה</div>
            <div style={{display:"flex",gap:8}}>
              <select value={convTarget} onChange={e=>setConvTarget(e.target.value)} style={{...SEL,flex:1,color:convTarget?"#fff":"#64748b",fontSize:13}}>
                <option value="">בחר נמען</option>
                <option value={allUsers.find(u=>u.role==="admin")?.phone||""}>👔 מנהל</option>
                {operatorUsers.filter(u=>u.name!==user?.name).map(u=>(
                  <option key={u.username} value={u.phone}>{u.icon} {u.name}</option>
                ))}
              </select>
              <a href={convTarget?`https://wa.me/972${convTarget.replace(/^0/,"")}`:"#"}
                onClick={e=>!convTarget&&e.preventDefault()}
                target="_blank" rel="noreferrer"
                style={{background:convTarget?"#22c55e":"rgba(255,255,255,0.05)",border:"none",borderRadius:10,padding:"10px 16px",color:convTarget?"#fff":"#334155",cursor:convTarget?"pointer":"default",fontSize:13,fontWeight:800,textDecoration:"none",display:"flex",alignItems:"center"}}>
                פתח
              </a>
            </div>
          </div>

          <div style={{paddingBottom:24}}/>
        </div>
        <STYLES/>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // SCREEN: DONE
  // ══════════════════════════════════════════════════════════════════
  if (screen==="done") {
    const lastReport   = reports[reports.length-1];
    const isRestricted = lastReport?.poolStatus==="אחר" && lastReport?.restrictedUntil;
    const phone        = clientPhone(lastReport?.client||"");

    const openFollowup = () => {
      const msg = `שלום!\nהגבלת השימוש בבריכה הסתיימה ב-${fmtDate(lastReport?.restrictedUntil)}.\nהבריכה מוכנה לשימוש מלא 🏊\n_צוות גליליאו_`;
      const url  = phone
        ? `https://wa.me/972${phone.replace(/^0/,"")}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(url,"_blank");
    };

    return (
      <div dir="rtl" style={BG}>
        <div style={WRAP}>

          {/* Success card */}
          <div style={{textAlign:"center",padding:"36px 0 24px"}}>
            <div style={{fontSize:60,marginBottom:12}}>✅</div>
            <h2 style={{color:"#fff",fontSize:22,fontWeight:900,margin:"0 0 8px"}}>הטיפול הושלם!</h2>
            <p style={{color:"#7dd3fc",fontSize:14,margin:0}}>
              הדוח נשמר{sheetId?" ב-Google Sheets":" מקומית"} · הודעה נשלחה ל{lastReport?.client?.split(" - ")[0]||"לקוח"}
            </p>
          </div>

          {/* Pending reminder */}
          {pending.length>0&&!dismissed&&(
            <div style={{...CARD({border:"1px solid rgba(239,68,68,0.3)"}),marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:16}}>🔔</span>
              <div style={{flex:1}}><div style={{color:"#fca5a5",fontWeight:800,fontSize:13}}>{pending.length} דוחות ממתינים לגיליון</div></div>
              <button onClick={handleManualSync} disabled={syncing||!sheetId}
                style={{background:"#ef4444",border:"none",borderRadius:8,padding:"6px 12px",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:800,opacity:!sheetId?0.4:1}}>שלח</button>
              <button onClick={()=>setDismissed(true)} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:16}}>✕</button>
            </div>
          )}

          {/* Restricted pool follow-up */}
          {isRestricted && (
            <div style={{...CARD({border:"1px solid rgba(245,158,11,0.35)"}),marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{fontSize:20}}>⚠️</span>
                <div>
                  <div style={{color:"#fbbf24",fontWeight:800,fontSize:14}}>הבריכה מוגבלת לשימוש</div>
                  <div style={{color:"#64748b",fontSize:12}}>עד {fmtDate(lastReport?.restrictedUntil)}</div>
                </div>
              </div>
              <button onClick={openFollowup}
                style={{width:"100%",padding:"11px",borderRadius:11,border:"1px solid rgba(245,158,11,0.35)",cursor:"pointer",fontSize:14,fontWeight:800,background:"rgba(245,158,11,0.1)",color:"#fbbf24"}}>
                📲 שלח הודעת follow-up כשהבריכה תהיה מוכנה
              </button>
            </div>
          )}

          {/* סיום */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <button onClick={()=>{setForm(blank());setScreen("form");}}
              style={{padding:"13px",borderRadius:12,border:"1px solid rgba(14,165,233,0.3)",cursor:"pointer",fontSize:14,fontWeight:800,background:"rgba(14,165,233,0.08)",color:"#7dd3fc"}}>
              + דוח נוסף
            </button>
            <button onClick={()=>setScreen("daily")}
              style={{padding:"13px",borderRadius:12,border:"none",cursor:"pointer",fontSize:16,fontWeight:900,background:"linear-gradient(135deg,#0284c7,#06b6d4)",color:"#fff",boxShadow:"0 4px 18px rgba(14,165,233,0.35)"}}>
              סיום ✓
            </button>
          </div>

          <div style={{paddingBottom:24}}/>
        </div>
        <STYLES/>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // SCREEN: FORM
  // ══════════════════════════════════════════════════════════════════
  const elNext = calcNext(elDate);
  const elDays = daysLeft(elNext);

  return (
    <div dir="rtl" style={BG}>
      <div style={WRAP}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:28}}>{user?.icon}</span>
            <div>
              <h1 style={{color:"#fff",fontSize:18,fontWeight:900,margin:0}}>דוח טיפול</h1>
              <p style={{color:"#475569",margin:0,fontSize:12}}>{user?.name}</p>
            </div>
          </div>
          <button onClick={()=>setScreen("daily")}
            style={{background:"rgba(14,165,233,0.08)",border:"1px solid rgba(14,165,233,0.2)",borderRadius:10,padding:"8px 13px",color:"#7dd3fc",cursor:"pointer",fontSize:13,fontWeight:700}}>
            ← לוח יומי
          </button>
        </div>

        {/* Pending reminder */}
        {pending.length>0&&!dismissed&&(
          <div style={{...CARD({border:"1px solid rgba(239,68,68,0.3)"}),marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>🔔</span>
            <div style={{flex:1}}><div style={{color:"#fca5a5",fontWeight:800,fontSize:13}}>{pending.length} דוחות ממתינים</div><div style={{color:"#64748b",fontSize:11}}>שמורים מקומית</div></div>
            <button onClick={handleManualSync} disabled={syncing||!sheetId} style={{background:"#ef4444",border:"none",borderRadius:8,padding:"6px 12px",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:800,opacity:!sheetId?0.4:1}}>שלח</button>
            <button onClick={()=>setDismissed(true)} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:16}}>✕</button>
          </div>
        )}

        {/* SECTION: פרטי טיפול */}
        <Sec icon="📅" title="פרטי טיפול">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <label style={{color:"#64748b",fontSize:11,fontWeight:700,display:"block",marginBottom:5}}>תאריך</label>
              <input type="date" value={reportDate} onChange={e=>sf("reportDate",e.target.value)} style={{...INP,color:"#7dd3fc",border:"1px solid rgba(14,165,233,0.3)",fontWeight:700}}/>
            </div>
            <div>
              <label style={{color:"#64748b",fontSize:11,fontWeight:700,display:"block",marginBottom:5}}>מפעיל</label>
              <div style={{...INP,color:"#7dd3fc",fontWeight:700,display:"flex",alignItems:"center",gap:8,cursor:"default"}}>
                <span>{user?.icon}</span><span>{user?.name}</span>
              </div>
            </div>
          </div>
          <div>
            <label style={{color:"#64748b",fontSize:11,fontWeight:700,display:"block",marginBottom:5}}>לקוח</label>
            {form.clientLocked ? (
              <div style={{...INP,color:"#7dd3fc",fontWeight:700,display:"flex",alignItems:"center",gap:8,cursor:"default",opacity:0.85}}>
                <span>🏊</span><span>{client}</span>
                <span style={{marginRight:"auto",fontSize:11,color:"#334155"}}>🔒</span>
              </div>
            ) : (
              <select value={client} onChange={e=>sf("client",e.target.value)} style={{...SEL,color:client?"#fff":"#64748b"}}>
                <option value="">בחר לקוח</option>
                {clients.map(c=><option key={c.name}>{c.name}</option>)}
              </select>
            )}
            {client && clientPhone(client) && (
              <a href={`tel:${clientPhone(client)}`}
                style={{display:"flex",alignItems:"center",gap:8,marginTop:8,padding:"10px 14px",background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:10,textDecoration:"none",color:"#4ade80",fontSize:14,fontWeight:700}}>
                <span style={{fontSize:18}}>📞</span>
                <span>{client.split(" - ")[0]}</span>
                <span style={{color:"#475569",fontSize:12,fontWeight:400,marginRight:"auto"}}>לחץ לחיוג</span>
              </a>
            )}
          </div>
        </Sec>

        {/* SECTION: מדידות */}
        <Sec icon="📊" title="ערכי מדידה">
          <Slider label="כלור" min={0} max={8} value={chlorine} onChange={v=>sf("chlorine",v)} unit=" ppm" warnAbove={3} optimal={1.5}/>
          <Slider label="pH"   min={5} max={9} value={ph}       onChange={v=>sf("ph",v)}       warnAbove={8} warnBelow={6} optimal={7.4}/>
          <Slider label="מלח"  min={0} max={6} value={salt}     onChange={v=>sf("salt",v)}      unit=" g/L" optimal={3.5}/>
        </Sec>

        {/* SECTION: אלקטרודה */}
        <Sec icon="⚡" title="אלקטרודה">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <label style={{color:"#64748b",fontSize:11,fontWeight:700,display:"block",marginBottom:5}}>דגם</label>
              <input value={elModel} onChange={e=>sf("elModel",e.target.value)} placeholder="Astral 400" style={INP}/>
            </div>
            <div>
              <label style={{color:"#64748b",fontSize:11,fontWeight:700,display:"block",marginBottom:5}}>סריאלי</label>
              <input value={elSerial} onChange={e=>sf("elSerial",e.target.value)} placeholder="SN-XXXXX" style={INP}/>
            </div>
          </div>
          <label style={{color:"#64748b",fontSize:11,fontWeight:700,display:"block",marginBottom:5}}>ניקיון אחרון</label>
          <input type="date" value={elDate} onChange={e=>sf("elDate",e.target.value)} style={INP}/>
          {elDate&&elDays!==null&&(
            <div style={{marginTop:10,...CARD({background:elDays<0?"rgba(239,68,68,0.07)":elDays<=14?"rgba(245,158,11,0.07)":"rgba(34,197,94,0.05)",border:`1px solid ${elDays<0?"rgba(239,68,68,0.25)":elDays<=14?"rgba(245,158,11,0.25)":"rgba(34,197,94,0.2)"}`}),display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18}}>{elDays<0?"🚨":elDays<=14?"⚠️":"✅"}</span>
              <div>
                <div style={{color:elDays<0?"#f87171":elDays<=14?"#fbbf24":"#4ade80",fontWeight:800,fontSize:13}}>
                  {elDays<0?`באיחור ${Math.abs(elDays)} יום`:elDays===0?"היום":` בעוד ${elDays} ימים`}
                </div>
                <div style={{color:"#475569",fontSize:11}}>הבא: {fmtDate(elNext)} · כל 90 יום</div>
              </div>
            </div>
          )}
        </Sec>

        {/* SECTION: מצב בריכה */}
        <Sec icon="🏊" title="מצב הבריכה">
          <div style={{display:"flex",gap:8,marginBottom:poolStatus==="אחר"?12:0}}>
            {["מאוזנת","אחר"].map(opt=>(
              <button key={opt} onClick={()=>sf("poolStatus",opt)}
                style={{flex:1,padding:"12px",borderRadius:12,border:`2px solid ${poolStatus===opt?(opt==="מאוזנת"?"#22c55e":"#ef4444"):"rgba(255,255,255,0.1)"}`,cursor:"pointer",fontWeight:700,fontSize:14,
                  background:poolStatus===opt?(opt==="מאוזנת"?"rgba(34,197,94,0.12)":"rgba(239,68,68,0.12)"):"rgba(255,255,255,0.03)",
                  color:poolStatus===opt?(opt==="מאוזנת"?"#4ade80":"#f87171"):"#64748b"}}>
                {opt==="מאוזנת"?"✅ מאוזנת ומוכנה":"⚠️ אחר / הגבלה"}
              </button>
            ))}
          </div>
          {poolStatus==="אחר"&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div>
                <label style={{color:"#64748b",fontSize:11,fontWeight:700,display:"block",marginBottom:5}}>פירוט המצב</label>
                <textarea value={customStatusText} onChange={e=>sf("customStatusText",e.target.value)} placeholder="תאר את הבעיה / המגבלה..." rows={3}
                  style={{...INP,resize:"vertical"}}/>
              </div>
              <div>
                <label style={{color:"#64748b",fontSize:11,fontWeight:700,display:"block",marginBottom:5}}>לא זמינה עד תאריך</label>
                <input type="date" value={restrictedUntil} onChange={e=>sf("restrictedUntil",e.target.value)} style={INP}/>
              </div>
            </div>
          )}
        </Sec>

        {/* SECTION: בדיקות מצב */}
        <Sec icon="🔍" title="בדיקות מצב">
          <Toggle label="💧 גובה מים"   value={waterLevel} onChange={v=>sf("waterLevel",v)}/>
          <Toggle label="🔵 צלילות מים" value={clarity}    onChange={v=>sf("clarity",v)}/>
          <Toggle label="🧴 פס שומן"    value={fat}        onChange={v=>sf("fat",v)}/>
          <Toggle label="🌀 זרימה"      value={flow}       onChange={v=>sf("flow",v)}/>
        </Sec>

        {/* SECTION: ציוד לטיפול הבא */}
        <Sec icon="📦" title="ציוד לטיפול הבא">
          <div style={{background:"rgba(14,165,233,0.04)",borderRadius:9,padding:"7px 12px",marginBottom:10,display:"flex",gap:6,alignItems:"center"}}>
            <span>🔒</span><span style={{color:"#475569",fontSize:11,fontWeight:600}}>פנימי בלבד — לא נשלח ללקוח</span>
          </div>
          <div style={{...CARD({padding:14})}}>
            {[{k:"acid",l:"חומצת מלח",i:"🧪"},{k:"phUp",l:"מעלה pH",i:"📈"},{k:"saltPkg",l:"שקי מלח",i:"🧂"}].map(({k,l,i})=>(
              <div key={k}>
                <div onClick={()=>sf(k,!form[k])} style={{display:"flex",alignItems:"center",gap:11,padding:"10px 0",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <div style={{width:21,height:21,borderRadius:6,border:`2px solid ${form[k]?"#0ea5e9":"rgba(255,255,255,0.18)"}`,background:form[k]?"#0ea5e9":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                    {form[k]&&<span style={{color:"#fff",fontSize:12}}>✓</span>}
                  </div>
                  <span style={{fontSize:15}}>{i}</span>
                  <span style={{color:"#cbd5e1",fontSize:14,fontWeight:600}}>{l}</span>
                </div>
                {k==="saltPkg"&&saltPkg&&(
                  <div style={{padding:"10px 0 4px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{color:"#64748b",fontSize:12}}>כמות שקים</span>
                      <span style={{color:"#7dd3fc",fontWeight:800}}>{saltBags}</span>
                    </div>
                    <input type="range" min={1} max={10} value={saltBags} onChange={e=>sf("saltBags",+e.target.value)} style={{width:"100%",accentColor:"#0ea5e9"}}/>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Sec>

        {/* SECTION: תמונות */}
        <Sec icon="📷" title="תמונות">
          <div onClick={()=>fileRef.current.click()} style={{border:"2px dashed rgba(125,211,252,0.2)",borderRadius:12,padding:18,textAlign:"center",cursor:"pointer"}}>
            <div style={{fontSize:26,marginBottom:4}}>📸</div>
            <p style={{color:"#7dd3fc",margin:0,fontSize:13,fontWeight:600}}>צרף תמונות</p>
          </div>
          <input ref={fileRef} type="file" multiple accept="image/*" onChange={e=>{const u=Array.from(e.target.files).map(f=>URL.createObjectURL(f));sf("photos",[...photos,...u]);}} style={{display:"none"}}/>
          {photos.length>0&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginTop:10}}>
              {photos.map((u,i)=>(
                <div key={i} style={{position:"relative"}}>
                  <img src={u} alt="" style={{width:"100%",height:75,objectFit:"cover",borderRadius:9,border:"1px solid rgba(255,255,255,0.08)"}}/>
                  <button onClick={()=>sf("photos",photos.filter((_,j)=>j!==i))} style={{position:"absolute",top:3,right:3,background:"rgba(0,0,0,0.65)",border:"none",borderRadius:"50%",width:20,height:20,color:"#ef4444",cursor:"pointer",fontSize:11}}>✕</button>
                </div>
              ))}
            </div>
          )}
        </Sec>

        <Sec icon="📝" title="הערות ללקוח">
          <textarea value={notes} onChange={e=>sf("notes",e.target.value)} placeholder="הערה קצרה ללקוח (תישלח בוואטסאפ)..." rows={3}
            style={{...INP,resize:"vertical"}}/>
        </Sec>

        <Btn onClick={handleSubmit} disabled={syncing||!client}>
          {syncing?"⏳ שומר...":"שמור דוח ⚡"}
        </Btn>
        <div style={{paddingBottom:28}}/>
      </div>
      <STYLES/>
    </div>
  );
}

// ─── Global styles ────────────────────────────────────────────────────────────
function STYLES() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800;900&display=swap');
      *{font-family:'Heebo',sans-serif;box-sizing:border-box}
      input[type=range]{-webkit-appearance:none;appearance:none;height:6px;border-radius:99px;background:rgba(255,255,255,0.08);cursor:pointer;width:100%}
      input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#0ea5e9;box-shadow:0 0 7px rgba(14,165,233,0.5);cursor:pointer}
      input[type=date]{color-scheme:dark}
      select option{background:#0d1e35;color:#fff}
      @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    `}</style>
  );
}
