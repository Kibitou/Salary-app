
import { useState, useMemo } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────────────────────────────
const DARK = {
  bg0:"#020617", bg1:"#0f172a", bg2:"#1e293b", bg3:"#0a0f1e",
  border:"#1e293b", borderMid:"#334155",
  t0:"#f1f5f9", t1:"#cbd5e1", t2:"#64748b", t3:"#334155",
  green:"#4ade80", greenDim:"#052e16", greenBorder:"#166534", greenText:"#86efac",
  blue:"#60a5fa", purple:"#a78bfa", yellow:"#fbbf24", orange:"#fb923c",
  red:"#f87171", redDim:"#450a0a", redBorder:"#7f1d1d", redText:"#fca5a5",
  inBg:"#0f172a", inColor:"#f1f5f9",
  navBg:"#080e1d",
  segBg:"#0f172a", segBorder:"#1e293b", segText:"#475569",
  segABg:"#172554", segABorder:"#1d4ed8", segAText:"#93c5fd",
  calBg:"#1e293b", calBorder:"#0f172a",
  calTodayBg:"#172554", calTodayBorder:"#2563eb",
  calShiftBg:"#052e16", calShiftBorder:"#166534",
  modBg:"#1e293b",
  shadow:"0 0 0 1px #1e293b, 0 25px 60px rgba(0,0,0,.8)",
};
const LIGHT = {
  bg0:"#f0f4f8", bg1:"#ffffff", bg2:"#f8fafc", bg3:"#f1f5f9",
  border:"#e8edf2", borderMid:"#cbd5e1",
  t0:"#0f172a", t1:"#334155", t2:"#64748b", t3:"#94a3b8",
  green:"#16a34a", greenDim:"#f0fdf4", greenBorder:"#bbf7d0", greenText:"#15803d",
  blue:"#2563eb", purple:"#7c3aed", yellow:"#d97706", orange:"#ea580c",
  red:"#dc2626", redDim:"#fef2f2", redBorder:"#fecaca", redText:"#dc2626",
  inBg:"#f1f5f9", inColor:"#0f172a",
  navBg:"#ffffff",
  segBg:"#f1f5f9", segBorder:"#e2e8f0", segText:"#64748b",
  segABg:"#eff6ff", segABorder:"#bfdbfe", segAText:"#1d4ed8",
  calBg:"#f8fafc", calBorder:"#e8edf2",
  calTodayBg:"#eff6ff", calTodayBorder:"#93c5fd",
  calShiftBg:"#f0fdf4", calShiftBorder:"#86efac",
  modBg:"#ffffff",
  shadow:"0 0 0 1px #e2e8f0, 0 20px 50px rgba(0,0,0,.15)",
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const NOW = new Date();
const fmtDate = (d) =>
  d.getFullYear() + "-" +
  String(d.getMonth() + 1).padStart(2, "0") + "-" +
  String(d.getDate()).padStart(2, "0");
const TODAY = fmtDate(NOW);
const DOW = ["日","月","火","水","木","金","土"];

const parseMin = (t) => { if (!t) return null; const [h,m]=t.split(":"); return +h*60 + +m; };
const roundM = (m,u,mode) => { if(!u||m<=0)return m; return mode==="up"?Math.ceil(m/u)*u:Math.floor(m/u)*u; };
const rawMins = (e) => { const s=parseMin(e.start),en=parseMin(e.end),b=parseMin(e.break)||0; if(s===null||en===null)return 0; return Math.max(en-s-b,0); };
const monthTotal = (entries,cfg) => {
  if(cfg.calcMode==="daily") return entries.reduce((s,e)=>s+roundM(rawMins(e),cfg.roundUnit,cfg.roundMode),0);
  return roundM(entries.reduce((s,e)=>s+rawMins(e),0),cfg.roundUnit,cfg.roundMode);
};
const commuteAmt = (days,cfg) => {
  const sorted=[...(cfg.passes||[])].sort((a,b)=>a.threshold-b.threshold);
  for(const p of sorted) if(days>=p.threshold)return p.amount;
  return days*(cfg.commuteDaily||0);
};
const payoffCalc = (bal,rate,mo) => {
  if(!bal||!mo)return null;
  if(!rate)return{months:Math.ceil(bal/mo),interest:0};
  const r=rate/100/12; let b=bal,months=0,interest=0;
  while(b>0&&months<600){const i=b*r;interest+=i;const p=mo-i;if(p<=0)return null;b-=p;months++;}
  return{months,interest};
};
const daysTo = (day) => {
  const now=new Date(), pay=new Date(now.getFullYear(),now.getMonth(),day);
  if(pay<=now)pay.setMonth(pay.getMonth()+1);
  return Math.ceil((pay-now)/86400000);
};
const yen = (n) => "¥"+Math.floor(Math.max(n,0)).toLocaleString();
const yenS = (n) => n<0?"-¥"+Math.floor(Math.abs(n)).toLocaleString():"¥"+Math.floor(n).toLocaleString();
const hm = (m) => !m?"0h00m":Math.floor(m/60)+"h"+String(m%60).padStart(2,"0")+"m";
const mDayKeys = (y,m) => { const last=new Date(y,m+1,0).getDate(), mk=y+"-"+String(m+1).padStart(2,"0"); return Array.from({length:last},(_,i)=>mk+"-"+String(i+1).padStart(2,"0")); };
const calCells = (y,m) => { const out=[],sd=new Date(y,m,1).getDay(),last=new Date(y,m+1,0).getDate(); for(let i=0;i<sd;i++)out.push(null); for(let d=1;d<=last;d++)out.push(d); return out; };

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────
const DEF_CFG = { wage:1100, roundUnit:15, roundMode:"down", calcMode:"daily", commuteDaily:0, passes:[], payday:25, taxRate:10, catTaxName:"税・社会保険", catOtherName:"その他支払い" };
const DEF_PRESETS = [
  {id:1,label:"早番",start:"08:00",end:"16:00",brk:"01:00"},
  {id:2,label:"日勤",start:"09:00",end:"18:00",brk:"01:00"},
  {id:3,label:"遅番",start:"13:00",end:"22:00",brk:"01:00"},
  {id:4,label:"夜勤",start:"22:00",end:"07:00",brk:"01:00"},
];

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const css = {
  card: (T, accent) => ({ background:T.bg2, border:"1px solid "+T.border, borderLeft:"3px solid "+accent, borderRadius:14, padding:"12px 14px", marginBottom:10 }),
  inp:  (T) => ({ width:"100%", boxSizing:"border-box", background:T.inBg, border:"1px solid "+T.borderMid, borderRadius:10, padding:"9px 12px", color:T.inColor, fontSize:14, outline:"none" }),
  seg:  (T,on) => ({ background:on?T.segABg:T.segBg, border:"1px solid "+(on?T.segABorder:T.segBorder), borderRadius:8, padding:"6px 12px", color:on?T.segAText:T.segText, fontSize:13, cursor:"pointer", fontWeight:on?700:400 }),
  btn:  () => ({ width:"100%", background:"linear-gradient(135deg,#4ade80,#22d3ee)", border:"none", borderRadius:12, padding:"13px", color:"#0f172a", fontWeight:800, fontSize:15, cursor:"pointer" }),
  rmBtn:(T) => ({ background:T.redDim, border:"1px solid "+T.redBorder, borderRadius:8, color:T.redText, width:30, height:30, cursor:"pointer", fontSize:12, fontWeight:700, flexShrink:0 }),
};

function Inp({ T, value, onChange, type="text", placeholder="" }) {
  return <input type={type} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)} style={css.inp(T)} />;
}
function NumInp({ T, value, onChange, placeholder="" }) {
  const [focused, setFocused] = useState(false);
  const [local, setLocal] = useState("");
  const show = focused ? local : (value === 0 || value === "" ? "" : String(value));
  return (
    <input
      type="number" inputMode="numeric"
      value={show}
      placeholder={placeholder || "0"}
      onFocus={() => { setFocused(true); setLocal(value === 0 ? "" : String(value)); }}
      onBlur={() => { setFocused(false); const n = Number(local); onChange(isNaN(n) ? 0 : n); }}
      onChange={e => setLocal(e.target.value)}
      style={{...css.inp(T), fontSize:16}}
    />
  );
}
function TimeBtn({ T, label, value, onChange, accent }) {
  // Big thumb-friendly time button
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:4 }}>
      <span style={{ fontSize:11, color:accent, fontWeight:700, textAlign:"center", letterSpacing:1 }}>{label}</span>
      <input type="time" value={value} onChange={e=>onChange(e.target.value)}
        style={{ width:"100%", boxSizing:"border-box", background:T.inBg, border:"2px solid "+(value?accent:T.borderMid), borderRadius:12, padding:"12px 4px", color:T.inColor, fontSize:16, textAlign:"center", outline:"none", fontFamily:"monospace", fontWeight:700, touchAction:"manipulation" }} />
    </div>
  );
}
function SegRow({ T, opts, val, onChange }) {
  return (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
      {opts.map(({v,l})=>(<button key={String(v)} onClick={()=>onChange(v)} style={css.seg(T,val===v)}>{l}</button>))}
    </div>
  );
}
function GradBtn({ onClick, children }) {
  return <button onClick={onClick} style={css.btn()}>{children}</button>;
}
function Field({ T, label, children }) {
  return <div style={{ marginBottom:13 }}><div style={{ fontSize:11, color:T.t2, marginBottom:5 }}>{label}</div>{children}</div>;
}
function SectionTitle({ T, children, right }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
      <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>{children}</span>
      {right}
    </div>
  );
}
function Divider({ T }) { return <div style={{ height:1, background:T.border, margin:"8px 0" }} />; }
function PayRow({ T, label, amount, onRemove }) {
  return (
    <div style={{ display:"flex", alignItems:"center", background:T.bg3, border:"1px solid "+T.border, borderRadius:10, padding:"10px 12px", marginBottom:6 }}>
      <span style={{ flex:1, fontSize:13, color:T.t1 }}>{label}</span>
      <span style={{ fontWeight:700, color:T.red, marginRight:10, fontSize:14 }}>¥{Number(amount).toLocaleString()}</span>
      <button onClick={onRemove} style={css.rmBtn(T)}>✕</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(true);
  const T = dark ? DARK : LIGHT;

  const [tab, setTab]       = useState("home");
  const [cfg, setCfg]       = useState(DEF_CFG);
  const [payments, setPay]  = useState({ tax:[], other:[] });
  const [debts, setDebts]   = useState([]);
  const [shifts, setShifts] = useState({});
  const [actual, setActual] = useState({});
  const [selDate, setSel]   = useState(TODAY);
  const [calY, setCalY]     = useState(NOW.getFullYear());
  const [calM, setCalM]     = useState(NOW.getMonth());
  const [presets, setPre]   = useState(DEF_PRESETS);
  const [memo, setMemo]     = useState({ advance:"", living:"", note:"", incomeMode:"auto", prevIncome:"", customIncome:"" });

  const getEntry = (d) => actual[d] || shifts[d] || { start:"", end:"", break:"01:00" };
  const selEntry = getEntry(selDate);
  const setField = (field, val) => {
    const base = actual[selDate] || shifts[selDate] || { start:"", end:"", break:"01:00" };
    setActual(p=>({...p,[selDate]:{...base,...actual[selDate],[field]:val}}));
  };

  // Calculations
  const mKeys    = useMemo(()=>mDayKeys(NOW.getFullYear(),NOW.getMonth()),[]);
  const mEntries = useMemo(()=>mKeys.map(getEntry).filter(e=>e.start&&e.end),[mKeys,actual,shifts]);
  const totalMin = useMemo(()=>monthTotal(mEntries,cfg),[mEntries,cfg]);
  const workDays = mEntries.length;
  const gross    = (totalMin/60)*cfg.wage + commuteAmt(workDays,cfg);
  const net      = gross*(1-cfg.taxRate/100);
  const debtMo   = debts.reduce((s,d)=>s+Number(d.monthly||0),0);
  const taxTot   = payments.tax.reduce((s,p)=>s+Number(p.amount),0);
  const othTot   = payments.other.reduce((s,p)=>s+Number(p.amount),0);
  const totalPay = taxTot+othTot+debtMo;
  const advAmt   = Number(memo.advance)||0;
  const livAmt   = Number(memo.living)||0;
  const memoNet  = memo.incomeMode==="custom" ? (Number(memo.customIncome)||0) : memo.incomeMode==="prev" ? (Number(memo.prevIncome)||0) : net;
  const free     = memoNet-totalPay-advAmt-livAmt;
  const daysLeft = daysTo(cfg.payday);
  const daily    = daysLeft>0?free/daysLeft:0;

  const sh = { T, cfg, setCfg, payments, setPay, debts, setDebts, shifts, setShifts, actual, setActual, selDate, setSel, selEntry, setField, getEntry, totalMin, workDays, gross, net, memoNet, totalPay, taxTot, othTot, debtMo, free, daysLeft, daily, advAmt, livAmt, calY, setCalY, calM, setCalM, presets, setPre, memo, setMemo };

  const NAV = [
    {key:"home",     icon:"🏠", label:"ホーム"},
    {key:"calendar", icon:"📅", label:"カレンダー"},
    {key:"payments", icon:"💳", label:"支払い"},
    {key:"memo",     icon:"📝", label:"メモ"},
    {key:"settings", icon:"⚙️", label:"設定"},
  ];

  return (
    <div style={{ width:"100%", height:"100vh", background:T.bg0, display:"flex", justifyContent:"center", alignItems:"center", fontFamily:"'Noto Sans JP','Hiragino Sans',sans-serif" }}>
      {/* Phone shell */}
      <div style={{ width:"min(390px,100vw)", height:"min(844px,100vh)", background:T.bg1, borderRadius:"min(44px,4vw)", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:T.shadow, position:"relative" }}>

        {/* ── Status bar ── */}
        <div style={{ height:48, background:T.bg1, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 20px", flexShrink:0, borderBottom:"1px solid "+T.border }}>
          <span style={{ fontSize:13, fontWeight:700, color:T.t0 }}>
            {NOW.toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"})}
          </span>
          <span style={{ fontSize:13, fontWeight:600, color:T.t1 }}>{NOW.getMonth()+1}月の給与</span>
          <button onClick={()=>setDark(d=>!d)}
            style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, padding:4 }}>
            {dark?"☀️":"🌙"}
          </button>
        </div>

        {/* ── Content ── */}
        <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column", minHeight:0 }}>
          {tab==="home"     && <HomeTab     {...sh}/>}
          {tab==="calendar" && <CalendarTab {...sh}/>}
          {tab==="payments" && <PayTab      {...sh}/>}
          {tab==="memo"     && <MemoTab     {...sh}/>}
          {tab==="settings" && <SettingsTab {...sh}/>}
        </div>

        {/* ── Bottom Nav ── always visible ── */}
        <div style={{ height:60, background:T.navBg, borderTop:"1px solid "+T.border, display:"flex", flexShrink:0 }}>
          {NAV.map(({key,icon,label})=>(
            <button key={key} onClick={()=>setTab(key)}
              style={{ flex:1, background:"none", border:"none", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, cursor:"pointer", color:tab===key?T.green:T.t2, transition:"color .15s" }}>
              <span style={{ fontSize:20, lineHeight:1 }}>{icon}</span>
              <span style={{ fontSize:9, fontWeight:tab===key?700:400, letterSpacing:.3 }}>{label}</span>
              {tab===key && <div style={{ width:18, height:2, background:T.green, borderRadius:1, marginTop:1 }}/>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCROLL WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
function Scr({ children, pb=16 }) {
  return <div style={{ flex:1, overflowY:"auto", padding:"0 15px", paddingBottom:pb, scrollbarWidth:"none", WebkitOverflowScrolling:"touch", minHeight:0 }}>{children}</div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME TAB
// ─────────────────────────────────────────────────────────────────────────────
function HomeTab({ T, selEntry, setField, selDate, setSel, shifts, actual, cfg, totalMin, workDays, gross, net, totalPay, free, daysLeft, daily, advAmt, livAmt }) {
  const d    = new Date(selDate+"T00:00:00");
  const diff = Math.round((d - new Date(TODAY+"T00:00:00"))/86400000);
  const dl   = diff===0?"今日":diff===-1?"昨日":(d.getMonth()+1)+"/"+d.getDate();

  const go = (delta) => { const nd=new Date(selDate+"T00:00:00"); nd.setDate(nd.getDate()+delta); setSel(fmtDate(nd)); };

  const sh      = shifts[selDate];
  const hasShift= !!(sh&&sh.start);
  const hasAct  = !!actual[selDate];
  const todayM  = cfg.calcMode==="daily" ? roundM(rawMins(selEntry),cfg.roundUnit,cfg.roundMode) : rawMins(selEntry);
  const todayE  = (todayM/60)*cfg.wage;

  // date nav button
  const arrowBtn = (dir) => (
    <button onClick={()=>go(dir)} style={{ width:36, height:36, background:T.bg2, border:"1px solid "+T.border, borderRadius:10, color:T.t1, fontSize:20, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{dir<0?"‹":"›"}</button>
  );

  return (
    <Scr>
      {/* ── 勤怠入力カード ── */}
      <div style={{ background:T.bg2, border:"1px solid "+T.border, borderRadius:16, padding:"14px 14px 12px", marginTop:12, marginBottom:10 }}>

        {/* 日付ナビ */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          {arrowBtn(-1)}
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:16, fontWeight:800, color:T.t0 }}>{dl}</div>
            {hasShift && <div style={{ fontSize:10, color:T.greenText, marginTop:1 }}>📅 シフト {sh.start}〜{sh.end}</div>}
          </div>
          {arrowBtn(1)}
        </div>

        {/* Time inputs — big touch targets */}
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          <TimeBtn T={T} label="出勤" value={selEntry.start||""} onChange={v=>setField("start",v)} accent={T.green}/>
          <TimeBtn T={T} label="退勤" value={selEntry.end||""}   onChange={v=>setField("end",v)}   accent={T.blue}/>
          <TimeBtn T={T} label="休憩" value={selEntry.break||"01:00"} onChange={v=>setField("break",v)} accent={T.orange}/>
        </div>

        {/* Result row */}
        {todayM > 0
          ? <div style={{ background:T.greenDim, border:"1px solid "+T.greenBorder, borderRadius:10, padding:"8px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:12, color:T.greenText }}>✓ {hm(todayM)}</span>
              <span style={{ fontSize:15, fontWeight:800, color:T.green }}>{yen(todayE)}</span>
            </div>
          : <div style={{ background:T.bg3, borderRadius:10, padding:"8px 12px", textAlign:"center", fontSize:12, color:T.t2 }}>出勤・退勤を入力してください</div>
        }

        {hasAct && hasShift && (
          <button onClick={()=>setActual(p=>{const n={...p};delete n[selDate];return n;})}
            style={{ marginTop:8, width:"100%", background:"none", border:"1px solid "+T.borderMid, borderRadius:9, color:T.t2, fontSize:12, padding:"6px", cursor:"pointer" }}>
            ↺ シフト時間に戻す
          </button>
        )}
      </div>

      {/* ── 今月サマリー ── 2列グリッド ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
        <StatTile T={T} label="総勤務時間" value={hm(totalMin)} color={T.blue} />
        <StatTile T={T} label="出勤日数" value={workDays+"日"} color={T.purple} />
        <StatTile T={T} label="総支給（見込）" value={yen(gross)} color={T.yellow} />
        <StatTile T={T} label="手取り（見込）" value={yen(net)} color={T.green} />
      </div>

      {/* ── 残り・予算 ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
        <div style={{ background:free>=0?T.greenDim:T.redDim, border:"1px solid "+(free>=0?T.greenBorder:T.redBorder), borderRadius:14, padding:"12px" }}>
          <div style={{ fontSize:10, color:free>=0?T.greenText:T.redText, marginBottom:3 }}>残り使える額</div>
          <div style={{ fontSize:17, fontWeight:800, color:free>=0?T.green:T.red, lineHeight:1 }}>{yenS(free)}</div>
          <div style={{ fontSize:9, color:T.t2, marginTop:3 }}>支払計 {yen(totalPay)}</div>
        </div>
        <div style={{ background:T.bg2, border:"1px solid "+T.border, borderRadius:14, padding:"12px" }}>
          <div style={{ fontSize:10, color:T.t2, marginBottom:3 }}>1日の予算</div>
          <div style={{ fontSize:17, fontWeight:800, color:T.blue, lineHeight:1 }}>{yen(daily)}</div>
          <div style={{ fontSize:9, color:T.t2, marginTop:3 }}>給料日まで{daysLeft}日</div>
        </div>
      </div>

      {/* ── メモ反映 ── */}
      {(advAmt>0||livAmt>0) && (
        <div style={{ background:T.bg2, border:"1px solid "+T.border, borderRadius:12, padding:"10px 12px", marginBottom:10 }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.t1, marginBottom:6 }}>メモ反映</div>
          {advAmt>0 && <Row2 T={T} label="前払い" value={yen(advAmt)} color={T.orange}/>}
          {livAmt>0 && <Row2 T={T} label="生活費" value={yen(livAmt)} color={T.blue}/>}
        </div>
      )}

      {/* ── 給料日バナー ── */}
      <div style={{ background:T.bg2, border:"1px solid "+T.border, borderRadius:12, padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:13, color:T.t1 }}>給料日まで</span>
        <span style={{ fontSize:22, fontWeight:800, color:T.green }}>{daysLeft}<span style={{ fontSize:13, fontWeight:400, color:T.t2 }}> 日</span></span>
      </div>

      <div style={{ height:8 }}/>
    </Scr>
  );
}

function StatTile({ T, label, value, color }) {
  return (
    <div style={{ background:T.bg2, border:"1px solid "+T.border, borderRadius:14, padding:"11px 12px" }}>
      <div style={{ fontSize:10, color:T.t2, marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:17, fontWeight:800, color }}>{value}</div>
    </div>
  );
}
function Row2({ T, label, value, color }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:T.t1, marginBottom:3 }}>
      <span>{label}</span><span style={{ fontWeight:700, color }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR TAB
// ─────────────────────────────────────────────────────────────────────────────
function CalendarTab({ T, shifts, setShifts, actual, calY, setCalY, calM, setCalM, presets }) {
  const [editKey, setEditKey]   = useState(null);
  const [editSh, setEditSh]     = useState({ start:"", end:"", break:"01:00" });

  const cells = calCells(calY, calM);
  const mk = calY+"-"+String(calM+1).padStart(2,"0");

  const prevM = () => { if(calM===0){setCalY(y=>y-1);setCalM(11);}else setCalM(m=>m-1); };
  const nextM = () => { if(calM===11){setCalY(y=>y+1);setCalM(0);}else setCalM(m=>m+1); };

  const open = (d) => {
    const key=mk+"-"+String(d).padStart(2,"0");
    setEditKey(key);
    setEditSh(shifts[key]?{...shifts[key]}:{start:"",end:"",break:"01:00"});
  };
  const save = () => {
    if(!editKey)return;
    if(editSh.start&&editSh.end) setShifts(p=>({...p,[editKey]:{start:editSh.start,end:editSh.end,break:editSh.break}}));
    else setShifts(p=>{const n={...p};delete n[editKey];return n;});
    setEditKey(null);
  };
  const del = () => { if(!editKey)return; setShifts(p=>{const n={...p};delete n[editKey];return n;}); setEditKey(null); };

  const shCnt = Object.keys(shifts).filter(d=>d.startsWith(mk)).length;

  const navBtn = (onClick, ch) => (
    <button onClick={onClick} style={{ width:36, height:36, background:T.bg2, border:"1px solid "+T.border, borderRadius:10, color:T.t1, fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>{ch}</button>
  );

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0, position:"relative" }}>
      <Scr>
        {/* Month nav */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0 8px" }}>
          {navBtn(prevM,"‹")}
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:16, fontWeight:800, color:T.t0 }}>{calY}年{calM+1}月</div>
            <div style={{ fontSize:10, color:T.t2 }}>シフト{shCnt}日</div>
          </div>
          {navBtn(nextM,"›")}
        </div>

        {/* DOW */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:3 }}>
          {DOW.map((d,i)=><div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:600, padding:"3px 0", color:i===0?T.red:i===6?T.blue:T.t2 }}>{d}</div>)}
        </div>

        {/* Days */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
          {cells.map((d,i)=>{
            if(!d)return <div key={"e"+i}/>;
            const key=mk+"-"+String(d).padStart(2,"0");
            const sh=shifts[key], att=actual[key], isToday=key===TODAY;
            const dow=i%7;
            let bg=T.calBg, bd=T.calBorder;
            if(isToday){bg=T.calTodayBg;bd=T.calTodayBorder;}
            else if(sh){bg=T.calShiftBg;bd=T.calShiftBorder;}
            return (
              <button key={key} onClick={()=>open(d)}
                style={{ background:bg, border:"1px solid "+bd, boxShadow:att?"inset 0 0 0 2px "+T.orange:"none", borderRadius:8, padding:"4px 2px", display:"flex", flexDirection:"column", alignItems:"center", cursor:"pointer", minHeight:48, gap:1, outline:"none", touchAction:"manipulation" }}>
                <span style={{ fontSize:13, fontWeight:isToday?800:400, color:dow===0?T.red:dow===6?T.blue:T.t0 }}>{d}</span>
                {sh&&<span style={{ fontSize:8, color:T.green, lineHeight:1.2 }}>{sh.start}</span>}
                {sh&&<span style={{ fontSize:8, color:T.greenText, lineHeight:1.2 }}>{sh.end}</span>}
                {att&&<span style={{ fontSize:8, color:T.orange }}>✎</span>}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display:"flex", gap:12, padding:"10px 2px" }}>
          {[{c:T.calShiftBorder,bg:T.calShiftBg,l:"シフト"},{c:T.orange,bg:"transparent",l:"実績修正"},{c:T.calTodayBorder,bg:T.calTodayBg,l:"今日"}].map(({c,bg,l})=>(
            <div key={l} style={{ display:"flex", alignItems:"center", gap:4 }}>
              <div style={{ width:10, height:10, borderRadius:2, background:bg, border:"1px solid "+c }}/>
              <span style={{ fontSize:10, color:T.t2 }}>{l}</span>
            </div>
          ))}
        </div>
        <div style={{ height:8 }}/>
      </Scr>

      {/* ── Modal ── */}
      {editKey && (
        <div onClick={e=>e.target===e.currentTarget&&setEditKey(null)}
          style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.65)", display:"flex", alignItems:"flex-end", zIndex:50 }}>
          <div style={{ background:T.modBg, borderRadius:"20px 20px 0 0", padding:"20px 16px 24px", width:"100%", border:"1px solid "+T.border }}>
            <div style={{ fontSize:15, fontWeight:800, color:T.t0, marginBottom:12 }}>
              📅 {editKey.slice(5).replace("-","/")} のシフト
            </div>

            {/* Presets */}
            <div style={{ fontSize:11, color:T.t2, marginBottom:6 }}>プリセット</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
              {presets.map(p=>(
                <button key={p.id} onClick={()=>setEditSh({start:p.start,end:p.end,break:p.brk})}
                  style={{ background:T.bg2, border:"1px solid "+T.border, borderRadius:10, padding:"7px 10px", color:T.t1, cursor:"pointer", textAlign:"center", outline:"none" }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>{p.label}</div>
                  <div style={{ fontSize:10, color:T.t2 }}>{p.start}〜{p.end}</div>
                </button>
              ))}
            </div>

            {/* Time inputs */}
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              {[["出勤","start",T.green],["退勤","end",T.blue],["休憩","break",T.orange]].map(([lbl,key,col])=>(
                <div key={key} style={{ flex:1 }}>
                  <div style={{ fontSize:11, color:col, fontWeight:700, marginBottom:4, textAlign:"center" }}>{lbl}</div>
                  <input type="time" value={editSh[key]} onChange={e=>setEditSh(p=>({...p,[key]:e.target.value}))}
                    style={{ width:"100%", boxSizing:"border-box", background:T.inBg, border:"2px solid "+(editSh[key]?col:T.borderMid), borderRadius:11, padding:"11px 4px", color:T.inColor, fontSize:15, textAlign:"center", outline:"none", fontFamily:"monospace", fontWeight:700 }}/>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", gap:8 }}>
              <button onClick={save} style={{ flex:2, background:"linear-gradient(135deg,#4ade80,#22d3ee)", border:"none", borderRadius:12, padding:13, color:"#0f172a", fontWeight:800, fontSize:15, cursor:"pointer" }}>保存</button>
              <button onClick={del} style={{ flex:1, background:"none", border:"1px solid "+T.red, borderRadius:12, padding:13, color:T.red, fontWeight:700, fontSize:14, cursor:"pointer" }}>削除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENTS TAB
// ─────────────────────────────────────────────────────────────────────────────
function PayTab({ T, payments, setPay, debts, setDebts, cfg, setCfg, net, taxTot, othTot, debtMo }) {
  const [sub, setSub] = useState("overview");
  const total = taxTot+othTot+debtMo;
  const ratio = net>0?Math.min(total/net*100,100):0;

  const SUBS = [{key:"overview",label:"概要"},{key:"tax",label:cfg.catTaxName},{key:"debt",label:"借金"},{key:"other",label:cfg.catOtherName}];

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0 }}>
      {/* Sub tab bar */}
      <div style={{ display:"flex", gap:5, padding:"8px 15px", overflowX:"auto", scrollbarWidth:"none", flexShrink:0, borderBottom:"1px solid "+T.border }}>
        {SUBS.map(st=>(
          <button key={st.key} onClick={()=>setSub(st.key)}
            style={{ background:sub===st.key?T.segABg:T.segBg, border:"1px solid "+(sub===st.key?T.segABorder:T.segBorder), borderRadius:20, padding:"5px 13px", color:sub===st.key?T.segAText:T.segText, fontSize:12, cursor:"pointer", whiteSpace:"nowrap", fontWeight:sub===st.key?700:400, flexShrink:0 }}>
            {st.label}
          </button>
        ))}
      </div>

      <Scr>
        {sub==="overview" && (
          <>
            <div style={{ background:T.bg2, border:"1px solid "+T.border, borderRadius:14, padding:"14px", marginTop:12, marginBottom:10 }}>
              <div style={{ fontSize:11, color:T.t2, marginBottom:4 }}>今月の支払い合計</div>
              <div style={{ fontSize:26, fontWeight:800, color:T.red }}>¥{Math.floor(total).toLocaleString()}</div>
              <div style={{ height:6, background:T.border, borderRadius:3, marginTop:10 }}>
                <div style={{ height:6, background:"linear-gradient(90deg,"+T.red+","+T.orange+")", borderRadius:3, width:ratio+"%" }}/>
              </div>
              <div style={{ fontSize:10, color:T.t2, marginTop:3 }}>手取りの {ratio.toFixed(1)}%</div>
            </div>
            {[{label:cfg.catTaxName,amount:taxTot,color:T.purple},{label:"借金（月払い）",amount:debtMo,color:T.red},{label:cfg.catOtherName,amount:othTot,color:T.blue}].map(({label,amount,color})=>(
              <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:T.bg2, border:"1px solid "+T.border, borderRadius:12, padding:"11px 14px", marginBottom:8 }}>
                <span style={{ fontSize:13, color:T.t1 }}>{label}</span>
                <span style={{ fontWeight:700, color, fontSize:15 }}>¥{Math.floor(amount).toLocaleString()}</span>
              </div>
            ))}
          </>
        )}
        {sub==="tax" && <PayList T={T} items={payments.tax} setItems={v=>setPay(p=>({...p,tax:v}))} catLabel={cfg.catTaxName} setCatLabel={v=>setCfg(c=>({...c,catTaxName:v}))} accent={T.purple}/>}
        {sub==="debt" && <DebtList T={T} debts={debts} setDebts={setDebts}/>}
        {sub==="other" && <PayList T={T} items={payments.other} setItems={v=>setPay(p=>({...p,other:v}))} catLabel={cfg.catOtherName} setCatLabel={v=>setCfg(c=>({...c,catOtherName:v}))} accent={T.blue}/>}
        <div style={{ height:8 }}/>
      </Scr>
    </div>
  );
}

function PayList({ T, items, setItems, catLabel, setCatLabel, accent }) {
  const [form, setForm] = useState({ label:"", amount:"" });
  const [ren, setRen]   = useState(false);
  const add = () => { if(!form.label||!form.amount)return; setItems([...items,{id:Date.now(),label:form.label,amount:Number(form.amount)}]); setForm({label:"",amount:""}); };
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:12, marginBottom:10 }}>
        {ren
          ? <input autoFocus onBlur={()=>setRen(false)} value={catLabel} onChange={e=>setCatLabel(e.target.value)} style={{ ...css.inp(T), flex:1, fontSize:13 }}/>
          : <span style={{ flex:1, fontSize:14, fontWeight:700, color:T.t0 }}>{catLabel}</span>
        }
        <button onClick={()=>setRen(r=>!r)} style={{ background:T.bg2, border:"1px solid "+T.border, borderRadius:8, color:T.t2, fontSize:11, padding:"4px 10px", cursor:"pointer" }}>✎</button>
      </div>
      <div style={css.card(T,accent)}>
        <div style={{ display:"flex", gap:8, marginBottom:8 }}>
          <div style={{ flex:2 }}><Inp T={T} value={form.label} onChange={v=>setForm(p=>({...p,label:v}))} placeholder="名称"/></div>
          <div style={{ flex:1 }}><Inp T={T} type="number" value={form.amount} onChange={v=>setForm(p=>({...p,amount:v}))} placeholder="金額"/></div>
        </div>
        <GradBtn onClick={add}>追加する</GradBtn>
      </div>
      {items.map(p=><PayRow key={p.id} T={T} label={p.label} amount={p.amount} onRemove={()=>setItems(items.filter(x=>x.id!==p.id))}/>)}
      {items.length===0 && <div style={{ textAlign:"center", color:T.t2, fontSize:13, padding:"20px 0" }}>まだありません</div>}
    </div>
  );
}

function DebtList({ T, debts, setDebts }) {
  const [form, setForm] = useState({ label:"借金", balance:"", rate:"", monthly:"" });
  const add = () => {
    if(!form.balance||!form.monthly)return;
    setDebts(p=>[...p,{id:Date.now(),label:form.label,balance:Number(form.balance),rate:Number(form.rate)||0,monthly:Number(form.monthly)}]);
    setForm({label:"借金",balance:"",rate:"",monthly:""});
  };
  return (
    <div>
      <div style={{ ...css.card(T,T.red), marginTop:12 }}>
        <SectionTitle T={T}>📉 借金を追加</SectionTitle>
        <Field T={T} label="名称"><Inp T={T} value={form.label} onChange={v=>setForm(p=>({...p,label:v}))}/></Field>
        <div style={{ display:"flex", gap:8 }}>
          <div style={{ flex:1 }}><Field T={T} label="残高（円）"><Inp T={T} type="number" value={form.balance} onChange={v=>setForm(p=>({...p,balance:v}))} placeholder="300000"/></Field></div>
          <div style={{ flex:1 }}><Field T={T} label="年利（%）"><Inp T={T} type="number" value={form.rate} onChange={v=>setForm(p=>({...p,rate:v}))} placeholder="15"/></Field></div>
        </div>
        <Field T={T} label="月返済額（円）"><Inp T={T} type="number" value={form.monthly} onChange={v=>setForm(p=>({...p,monthly:v}))} placeholder="20000"/></Field>
        <GradBtn onClick={add}>追加する</GradBtn>
      </div>
      {debts.map(d=>{
        const res=payoffCalc(d.balance,d.rate,d.monthly);
        const yrs=res?Math.floor(res.months/12):0;
        const mos=res?res.months%12:0;
        return (
          <div key={d.id} style={{ background:T.bg2, border:"1px solid "+T.border, borderRadius:12, padding:"12px 14px", marginBottom:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div>
                <div style={{ fontWeight:700, color:T.t0, fontSize:14 }}>{d.label}</div>
                <div style={{ fontSize:11, color:T.t2, marginTop:2 }}>残高 ¥{Number(d.balance).toLocaleString()} ／ 年利 {d.rate}%</div>
              </div>
              <button onClick={()=>setDebts(debts.filter(x=>x.id!==d.id))} style={css.rmBtn(T)}>✕</button>
            </div>
            <Divider T={T}/>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:10, color:T.t2 }}>月々の返済</div>
                <div style={{ fontSize:16, fontWeight:700, color:T.red }}>¥{Number(d.monthly).toLocaleString()}/月</div>
              </div>
              {res
                ? <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:10, color:T.t2 }}>完済まで</div>
                    <div style={{ fontSize:18, fontWeight:800, color:T.green }}>{yrs>0?yrs+"年":""}{mos}ヶ月</div>
                    <div style={{ fontSize:10, color:T.t2 }}>総利息 ¥{Math.floor(res.interest).toLocaleString()}</div>
                  </div>
                : <div style={{ fontSize:11, color:T.red }}>返済額が利息以下</div>
              }
            </div>
            {res && (
              <div style={{ marginTop:8 }}>
                <div style={{ height:5, background:T.border, borderRadius:3 }}>
                  <div style={{ height:5, background:"linear-gradient(90deg,"+T.red+","+T.orange+")", borderRadius:3, width:Math.min(res.months/120*100,100)+"%" }}/>
                </div>
                <div style={{ fontSize:9, color:T.t2, marginTop:2 }}>{res.months}ヶ月</div>
              </div>
            )}
          </div>
        );
      })}
      {debts.length===0 && <div style={{ textAlign:"center", color:T.t2, fontSize:13, padding:"20px 0" }}>借金を追加してください</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMO TAB
// ─────────────────────────────────────────────────────────────────────────────
function MemoTab({ T, memo, setMemo, net, memoNet, totalPay }) {
  const s = (k,v) => setMemo(p=>({...p,[k]:v}));
  const adv  = Number(memo.advance)||0;
  const liv  = Number(memo.living)||0;
  const free = memoNet-totalPay-adv-liv;

  const MODES = [
    {v:"auto",  l:"今月分（自動）"},
    {v:"prev",  l:"前月分を入力"},
    {v:"custom",l:"任意で入力"},
  ];

  return (
    <Scr>
      <div style={{ fontSize:18, fontWeight:800, color:T.t0, paddingTop:12, paddingBottom:10 }}>予算シミュレーター</div>

      {/* Result banner */}
      <div style={{ background:free>=0?T.greenDim:T.redDim, border:"1px solid "+(free>=0?T.greenBorder:T.redBorder), borderRadius:14, padding:"14px 16px", marginBottom:10 }}>
        <div style={{ fontSize:11, color:free>=0?T.greenText:T.redText, marginBottom:4 }}>自由に使えるお金</div>
        <div style={{ fontSize:30, fontWeight:800, color:free>=0?T.green:T.red, marginBottom:10, lineHeight:1 }}>{yenS(free)}</div>
        {[
          {l:"手取り（"+MODES.find(m=>m.v===memo.incomeMode).l+"）", a:memoNet, c:T.green, s:"+"},
          {l:"支払い合計", a:totalPay, c:T.red, s:"-"},
          {l:"前払い", a:adv, c:T.orange, s:"-"},
          {l:"生活費", a:liv, c:T.blue, s:"-"},
        ].map(({l,a,c,s})=>(
          <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
            <span style={{ color:T.t2 }}>{l}</span>
            <span style={{ fontWeight:600, color:c }}>{s} {yen(Math.abs(a))}</span>
          </div>
        ))}
      </div>

      {/* Income source selector */}
      <div style={css.card(T,T.green)}>
        <SectionTitle T={T}>💰 手取りの設定</SectionTitle>
        <div style={{ display:"flex", gap:5, marginBottom:10 }}>
          {MODES.map(({v,l})=>(
            <button key={v} onClick={()=>s("incomeMode",v)}
              style={{ ...css.seg(T, memo.incomeMode===v), flex:1, fontSize:11, padding:"6px 4px", textAlign:"center" }}>{l}</button>
          ))}
        </div>
        {memo.incomeMode==="auto" && (
          <div style={{ background:T.bg3, borderRadius:10, padding:"9px 12px", fontSize:13, color:T.t1 }}>
            今月の勤怠から自動計算：<strong style={{color:T.green}}>{yen(net)}</strong>
          </div>
        )}
        {memo.incomeMode==="prev" && (
          <Field T={T} label="前月の手取り（円）">
            <NumInp T={T} value={memo.prevIncome||0} onChange={v=>s("prevIncome",v)} placeholder="例：120000"/>
          </Field>
        )}
        {memo.incomeMode==="custom" && (
          <Field T={T} label="任意の金額（円）">
            <NumInp T={T} value={memo.customIncome||0} onChange={v=>s("customIncome",v)} placeholder="例：150000"/>
          </Field>
        )}
      </div>

      {/* Other inputs */}
      <div style={css.card(T,T.orange)}>
        <SectionTitle T={T}>✏️ 差し引く金額</SectionTitle>
        <Field T={T} label="前払い・仮払い（円）">
          <NumInp T={T} value={memo.advance||0} onChange={v=>s("advance",v)} placeholder="例：20000"/>
        </Field>
        <Field T={T} label="生活費の目安（円）">
          <NumInp T={T} value={memo.living||0} onChange={v=>s("living",v)} placeholder="例：50000"/>
        </Field>
      </div>

      {/* Note */}
      <div style={css.card(T,T.blue)}>
        <SectionTitle T={T}>📝 メモ</SectionTitle>
        <textarea value={memo.note} onChange={e=>s("note",e.target.value)}
          placeholder={"例：\n・今月は3日多めに出た\n・来月は旅行あり"}
          style={{ width:"100%", boxSizing:"border-box", background:T.inBg, border:"1px solid "+T.borderMid, borderRadius:10, padding:"10px 12px", color:T.inColor, fontSize:13, outline:"none", resize:"none", minHeight:80, fontFamily:"inherit", lineHeight:1.6 }}/>
      </div>

      <div style={{ height:8 }}/>
    </Scr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS TAB
// ─────────────────────────────────────────────────────────────────────────────
function SettingsTab({ T, cfg, setCfg, presets, setPre }) {
  const set = (k,v) => setCfg(p=>({...p,[k]:v}));
  const [np, setNp] = useState({ label:"", amount:"", threshold:15 });
  const [nPre, setNPre] = useState({ label:"", start:"", end:"", brk:"01:00" });

  const addPass = () => {
    if(!np.amount)return;
    set("passes",[...cfg.passes,{id:Date.now(),label:np.label,amount:Number(np.amount),threshold:Number(np.threshold)}]);
    setNp({label:"",amount:"",threshold:15});
  };
  const addPre = () => {
    if(!nPre.label||!nPre.start||!nPre.end)return;
    setPre(p=>[...p,{id:Date.now(),...nPre}]);
    setNPre({label:"",start:"",end:"",brk:"01:00"});
  };

  return (
    <Scr>
      <div style={{ fontSize:18, fontWeight:800, color:T.t0, paddingTop:12, paddingBottom:10 }}>設定</div>

      {/* Basic */}
      <div style={css.card(T,T.green)}>
        <SectionTitle T={T}>💴 基本設定</SectionTitle>
        <Field T={T} label="時給（円）"><NumInp T={T} value={cfg.wage} onChange={v=>set("wage",v)}/></Field>
        <Field T={T} label="給料日"><NumInp T={T} value={cfg.payday} onChange={v=>set("payday",v)}/></Field>
      </div>

      {/* Rounding */}
      <div style={css.card(T,T.orange)}>
        <SectionTitle T={T}>⏱ 丸め設定</SectionTitle>
        <Field T={T} label="丸め単位">
          <SegRow T={T} opts={[{v:0,l:"なし"},{v:15,l:"15分"},{v:30,l:"30分"}]} val={cfg.roundUnit} onChange={v=>set("roundUnit",v)}/>
        </Field>
        <Field T={T} label="丸め方向">
          <SegRow T={T} opts={[{v:"up",l:"切り上げ"},{v:"down",l:"切り捨て"}]} val={cfg.roundMode} onChange={v=>set("roundMode",v)}/>
        </Field>
        <Field T={T} label="適用タイミング">
          <SegRow T={T} opts={[{v:"daily",l:"日別に丸め"},{v:"monthly",l:"月合算で丸め"}]} val={cfg.calcMode} onChange={v=>set("calcMode",v)}/>
          <div style={{ marginTop:6, fontSize:11, color:T.t2 }}>{cfg.calcMode==="daily"?"📌 各日を丸め→合算":"📌 合算→1回だけ丸め"}</div>
        </Field>
      </div>

      {/* Commute */}
      <div style={css.card(T,T.blue)}>
        <SectionTitle T={T}>🚃 交通費設定</SectionTitle>
        <Field T={T} label="日別交通費（円/日）"><NumInp T={T} value={cfg.commuteDaily} onChange={v=>set("commuteDaily",v)}/></Field>
        <div style={{ fontSize:11, color:T.t2, marginBottom:10, lineHeight:1.6 }}>定期代：出勤日数が閾値以上になると日別の代わりに適用</div>
        {cfg.passes.map(p=>(
          <div key={p.id} style={{ display:"flex", alignItems:"center", background:T.bg3, border:"1px solid "+T.border, borderRadius:10, padding:"9px 12px", marginBottom:6 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, color:T.t1 }}>{p.label||"定期"}</div>
              <div style={{ fontSize:10, color:T.t2 }}>{p.threshold}日以上で適用</div>
            </div>
            <span style={{ fontWeight:700, color:T.blue, marginRight:10 }}>¥{Number(p.amount).toLocaleString()}</span>
            <button onClick={()=>set("passes",cfg.passes.filter(x=>x.id!==p.id))} style={css.rmBtn(T)}>✕</button>
          </div>
        ))}
        <div style={{ display:"flex", gap:6, marginBottom:6 }}>
          <div style={{ flex:1.5 }}><Inp T={T} value={np.label} onChange={v=>setNp(p=>({...p,label:v}))} placeholder="名称"/></div>
          <div style={{ flex:1 }}><Inp T={T} type="number" value={np.amount} onChange={v=>setNp(p=>({...p,amount:v}))} placeholder="金額"/></div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
          <span style={{ fontSize:12, color:T.t2, whiteSpace:"nowrap" }}>出勤</span>
          <div style={{ width:70 }}><Inp T={T} type="number" value={np.threshold} onChange={v=>setNp(p=>({...p,threshold:v}))}/></div>
          <span style={{ fontSize:12, color:T.t2, whiteSpace:"nowrap" }}>日以上で適用</span>
        </div>
        <GradBtn onClick={addPass}>定期を追加</GradBtn>
      </div>

      {/* Presets */}
      <div style={css.card(T,T.purple)}>
        <SectionTitle T={T}>📅 シフトプリセット</SectionTitle>
        {presets.map(p=>(
          <div key={p.id} style={{ display:"flex", alignItems:"center", background:T.bg3, border:"1px solid "+T.border, borderRadius:10, padding:"9px 12px", marginBottom:6 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.t0 }}>{p.label}</div>
              <div style={{ fontSize:11, color:T.t2 }}>{p.start}〜{p.end}（休憩{p.brk}）</div>
            </div>
            <button onClick={()=>setPre(presets.filter(x=>x.id!==p.id))} style={css.rmBtn(T)}>✕</button>
          </div>
        ))}
        <Divider T={T}/>
        <Field T={T} label="名称"><Inp T={T} value={nPre.label} onChange={v=>setNPre(p=>({...p,label:v}))} placeholder="例：AM便"/></Field>
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          {[["出勤","start",T.green],["退勤","end",T.blue],["休憩","brk",T.orange]].map(([lbl,key,col])=>(
            <div key={key} style={{ flex:1 }}>
              <div style={{ fontSize:10, color:col, fontWeight:700, marginBottom:4, textAlign:"center" }}>{lbl}</div>
              <input type="time" value={nPre[key]} onChange={e=>setNPre(p=>({...p,[key]:e.target.value}))}
                style={{ width:"100%", boxSizing:"border-box", background:T.inBg, border:"1px solid "+T.borderMid, borderRadius:10, padding:"9px 4px", color:T.inColor, fontSize:13, textAlign:"center", outline:"none", fontFamily:"monospace" }}/>
            </div>
          ))}
        </div>
        <GradBtn onClick={addPre}>プリセットを追加</GradBtn>
      </div>

      <div style={{ height:8 }}/>
    </Scr>
  );
}

function SectionTitle({ T, children }) {
  return <div style={{ fontSize:13, fontWeight:700, color:T.t1, marginBottom:10 }}>{children}</div>;
}
function Divider({ T }) {
  return <div style={{ height:1, background:T.border, margin:"8px 0" }}/>;
}
