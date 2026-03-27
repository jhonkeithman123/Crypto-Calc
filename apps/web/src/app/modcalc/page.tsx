"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

// ─── Math ────────────────────────────────────────────────────────────
function gcd(a: number, b: number): number {
  a = Math.abs(Math.floor(a)); b = Math.abs(Math.floor(b));
  return b === 0 ? a : gcd(b, a % b);
}
function modInv(a: number, m: number): number | null {
  a = ((Math.floor(a) % m) + m) % m;
  if (a === 0) return null;
  let [or, r] = [a, m], [os, s] = [1, 0];
  while (r !== 0) {
    const q = Math.floor(or / r);
    [or, r] = [r, or - q * r];
    [os, s] = [s, os - q * s];
  }
  return or === 1 ? ((os % m) + m) % m : null;
}
function modPow(base: number, exp: number, mod: number): number {
  if (mod === 1) return 0;
  base = ((Math.floor(base) % mod) + mod) % mod;
  exp = Math.max(0, Math.floor(exp));
  let result = 1;
  while (exp > 0) {
    if (exp & 1) result = (result * base) % mod;
    base = (base * base) % mod;
    exp >>= 1;
  }
  return result;
}

// ─── Tokeniser / Parser ──────────────────────────────────────────────
type TT = "num" | "op" | "fn" | "lp" | "rp" | "comma";
interface Tok { t: TT; v: string }

function tokenize(raw: string): Tok[] {
  const s = raw.replace(/×/g,"*").replace(/÷/g,"/").replace(/[−\u2212]/g,"-").trim();
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === " ") { i++; continue; }
    if (/\d/.test(c)) { let n=""; while(i<s.length&&/\d/.test(s[i])) n+=s[i++]; out.push({t:"num",v:n}); continue; }
    if (/[a-zA-Z]/.test(c)) { let w=""; while(i<s.length&&/[a-zA-Z]/.test(s[i])) w+=s[i++]; out.push(w==="mod"?{t:"op",v:"mod"}:{t:"fn",v:w.toLowerCase()}); continue; }
    if (c==="(") { out.push({t:"lp",v:"("}); i++; continue; }
    if (c===")") { out.push({t:"rp",v:")"}); i++; continue; }
    if (c===",") { out.push({t:"comma",v:","}); i++; continue; }
    if ("+-*/^".includes(c)) { out.push({t:"op",v:c}); i++; continue; }
    i++;
  }
  return out;
}

class Parser {
  pos=0;
  constructor(private toks: Tok[], private T: number){}
  private pk(): Tok|null { return this.toks[this.pos]??null; }
  private nx(): Tok { const t=this.toks[this.pos++]; if(!t) throw new Error("Unexpected end"); return t; }
  private ex(t:TT,v?:string): Tok { const tok=this.nx(); if(tok.t!==t||(v&&tok.v!==v)) throw new Error(`Expected ${v??t} got '${tok.v}'`); return tok; }

  parse(): number {
    if(!this.toks.length) throw new Error("Empty expression");
    const v=this.addSub();
    if(this.pos<this.toks.length) throw new Error(`Unexpected '${this.toks[this.pos].v}'`);
    return ((Math.floor(v)%this.T)+this.T)%this.T;
  }
  addSub(): number {
    let l=this.mulDiv();
    while(this.pk()?.t==="op"&&(this.pk()!.v==="+"||this.pk()!.v==="-")){
      const op=this.nx().v, r=this.mulDiv();
      l=op==="+"?((l+r)%this.T+this.T)%this.T:((l-r)%this.T+this.T)%this.T;
    }
    return l;
  }
  mulDiv(): number {
    let l=this.modOp();
    while(this.pk()?.t==="op"&&(this.pk()!.v==="*"||this.pk()!.v==="/")){
      const op=this.nx().v, r=this.modOp();
      if(op==="*"){ l=(l*r)%this.T; }
      else { const inv=modInv(r,this.T); if(inv===null) throw new Error(`${r}⁻¹ mod ${this.T} undefined (gcd=${gcd(r,this.T)})`); l=(l*inv)%this.T; }
    }
    return l;
  }
  modOp(): number {
    let l=this.pow();
    while(this.pk()?.t==="op"&&this.pk()!.v==="mod"){
      this.nx(); const r=this.pow();
      if(r===0) throw new Error("mod 0 undefined");
      l=((Math.floor(l)%r)+r)%r;
    }
    return l;
  }
  pow(): number {
    let b=this.unary();
    if(this.pk()?.t==="op"&&this.pk()!.v==="^"){ this.nx(); b=modPow(b,this.pow(),this.T); }
    return b;
  }
  unary(): number {
    if(this.pk()?.t==="op"&&this.pk()!.v==="-"){ this.nx(); return(this.T-(this.primary()%this.T))%this.T; }
    return this.primary();
  }
  primary(): number {
    const t=this.pk(); if(!t) throw new Error("Expected value");
    if(t.t==="num"){ this.nx(); return parseInt(t.v,10); }
    if(t.t==="lp"){ this.nx(); const v=this.addSub(); this.ex("rp"); return v; }
    if(t.t==="fn"){
      this.nx(); this.ex("lp");
      if(t.v==="inv"){ const a=this.addSub(); this.ex("rp"); const inv=modInv(a,this.T); if(inv===null) throw new Error(`inv(${a}) undefined mod ${this.T}`); return inv; }
      if(t.v==="gcd"){ const a=this.addSub(); this.ex("comma"); const b=this.addSub(); this.ex("rp"); return gcd(a,b); }
      throw new Error(`Unknown fn '${t.v}'`);
    }
    throw new Error(`Unexpected '${t.v}'`);
  }
}

function evaluate(expr: string, T: number): { result: number } | { error: string } {
  try { return { result: new Parser(tokenize(expr), T).parse() }; }
  catch(e) { return { error: (e as Error).message }; }
}

// ─── History ─────────────────────────────────────────────────────────
interface HEntry { id: string; expr: string; T: number; result: number; error?: string; ts: number }
const HKEY = "modcalc_v1";
function loadH(): HEntry[] { try { return JSON.parse(localStorage.getItem(HKEY)||"[]"); } catch { return []; } }
function saveH(h: HEntry[]) { try { localStorage.setItem(HKEY,JSON.stringify(h.slice(0,60))); } catch{} }
function ago(ts: number): string {
  const d=Date.now()-ts;
  if(d<60000) return "just now";
  if(d<3600000) return `${Math.floor(d/60000)}m ago`;
  if(d<86400000) return `${Math.floor(d/3600000)}h ago`;
  return `${Math.floor(d/86400000)}d ago`;
}

// ─── Button Layout ───────────────────────────────────────────────────
type BK = "num"|"op"|"fn"|"eq"|"clr"|"del"|"mem"|"spec";
interface Btn { label: string; insert?: string; action?: string; kind: BK; span?: number }

const ROWS: Btn[][] = [
  [{ label:"gcd(", insert:"gcd(",  kind:"fn" },{ label:"inv(", insert:"inv(",  kind:"fn" },{ label:"^",    insert:"^",     kind:"op" },{ label:"mod",  insert:" mod ", kind:"op" }],
  [{ label:"(",    insert:"(",     kind:"fn" },{ label:")",    insert:")",     kind:"fn" },{ label:"+/−",  action:"neg",   kind:"spec" },{ label:"C",    action:"clear", kind:"clr" }],
  [{ label:"MC",   action:"mc",    kind:"mem"},{ label:"MR",   action:"mr",    kind:"mem"},{ label:"M+",   action:"mplus", kind:"mem"},{ label:"M−",   action:"mminus",kind:"mem"}],
  [{ label:"7", insert:"7",kind:"num"},{ label:"8",insert:"8",kind:"num"},{ label:"9",insert:"9",kind:"num"},{ label:"÷",insert:" ÷ ",kind:"op"}],
  [{ label:"4", insert:"4",kind:"num"},{ label:"5",insert:"5",kind:"num"},{ label:"6",insert:"6",kind:"num"},{ label:"×",insert:" × ",kind:"op"}],
  [{ label:"1", insert:"1",kind:"num"},{ label:"2",insert:"2",kind:"num"},{ label:"3",insert:"3",kind:"num"},{ label:"−",insert:" − ",kind:"op"}],
  [{ label:"ANS",  action:"ans",   kind:"spec"},{ label:"0",insert:"0",kind:"num"},{ label:"+",insert:" + ",kind:"op"},{ label:"⌫", action:"back",kind:"del"}],
  [{ label:"=",    action:"eval",  kind:"eq", span:4 }],
];

const BK_STYLE: Record<BK,{bg:string;color:string;hoverBg:string}> = {
  num:  { bg:"#1a1836",  color:"#e2e0ff", hoverBg:"#242048" },
  op:   { bg:"#251550",  color:"#c084fc", hoverBg:"#321d65" },
  fn:   { bg:"#0f2035",  color:"#67e8f9", hoverBg:"#162b48" },
  eq:   { bg:"#6d28d9",  color:"#ffffff", hoverBg:"#5b21b6" },
  clr:  { bg:"#3b0f12",  color:"#f87171", hoverBg:"#4d151a" },
  del:  { bg:"#1a1a30",  color:"#94a3b8", hoverBg:"#232340" },
  mem:  { bg:"#0a2420",  color:"#34d399", hoverBg:"#103030" },
  spec: { bg:"#1e1510",  color:"#fbbf24", hoverBg:"#2a1e12" },
};

// ─── Component ───────────────────────────────────────────────────────
export default function ModCalcPage() {
  const [expr,    setExpr]    = useState("");
  const [result,  setResult]  = useState<number|null>(null);
  const [error,   setError]   = useState<string|null>(null);
  const [modT,    setModT]    = useState(27);
  const [modInput,setModInput]= useState("27");
  const [mem,     setMem]     = useState(0);
  const [ans,     setAns]     = useState<number|null>(null);
  const [history, setHistory] = useState<HEntry[]>([]);
  const [showHist,setShowHist]= useState(false);
  const [pressing,setPressing]= useState<string|null>(null);

  useEffect(() => { setHistory(loadH()); }, []);

  const addToHistory = useCallback((e: HEntry) => {
    setHistory(prev => { const n=[e,...prev]; saveH(n); return n; });
  }, []);

  const runEval = useCallback(() => {
    if (!expr.trim()) return;
    const r = evaluate(expr, modT);
    if ("result" in r) {
      setResult(r.result);
      setError(null);
      setAns(r.result);
      addToHistory({ id: Date.now()+"", expr, T: modT, result: r.result, ts: Date.now() });
    } else {
      setError(r.error);
      setResult(null);
      addToHistory({ id: Date.now()+"", expr, T: modT, result: -1, error: r.error, ts: Date.now() });
    }
  }, [expr, modT, addToHistory]);

  const handleBtn = useCallback((btn: Btn) => {
    setPressing(btn.label);
    setTimeout(() => setPressing(null), 120);

    if (btn.insert !== undefined) {
      // if we just evaluated, start fresh unless it's an op
      if (result !== null && !btn.insert.trim().match(/^[+\-×÷*\/^]/)) {
        setExpr(btn.insert); setResult(null); setError(null); return;
      }
      if (result !== null) { setExpr(String(result) + btn.insert); setResult(null); setError(null); return; }
      setExpr(p => p + btn.insert);
      return;
    }
    if (btn.action === "clear")  { setExpr(""); setResult(null); setError(null); return; }
    if (btn.action === "back")   { setResult(null); setError(null); setExpr(p => p.trimEnd().replace(/\S+\s*$|.$/, m => m.length>1 ? m.slice(0,-1) : "")); return; }
    if (btn.action === "eval")   { runEval(); return; }
    if (btn.action === "neg")    { 
      if (result !== null) { const v=(modT-result)%modT; setResult(v); setAns(v); return; }
      setExpr(p => p ? `(${modT} − (${p}))` : ""); return; 
    }
    if (btn.action === "ans")    { 
      if (ans !== null) { setExpr(p => result !== null ? String(ans) : p + String(ans)); setResult(null); setError(null); }
      return; 
    }
    if (btn.action === "mc")     { setMem(0); return; }
    if (btn.action === "mr")     { setExpr(p => result!==null ? String(mem) : p+String(mem)); setResult(null); setError(null); return; }
    if (btn.action === "mplus")  { setMem(m => result!==null ? (m+result)%modT : m); return; }
    if (btn.action === "mminus") { setMem(m => result!==null ? ((m-result)%modT+modT)%modT : m); return; }
  }, [result, ans, mem, modT, runEval]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (["INPUT","TEXTAREA","SELECT"].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === "Enter" || e.key === "=") { e.preventDefault(); runEval(); }
      else if (e.key === "Backspace") { setResult(null); setError(null); setExpr(p=>p.slice(0,-1)); }
      else if (e.key === "Escape") { setExpr(""); setResult(null); setError(null); }
      else if (/^[\d+\-*/^(),]$/.test(e.key)) { setResult(null); setError(null); setExpr(p => p + e.key); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [runEval]);

  const commitModT = useCallback(() => {
    const v = parseInt(modInput, 10);
    if (!isNaN(v) && v >= 2) setModT(v);
    else setModInput(String(modT));
  }, [modInput, modT]);

  const restoreHistory = (h: HEntry) => {
    setExpr(String(h.result));
    setResult(null);
    setError(null);
    setModT(h.T);
    setModInput(String(h.T));
    setShowHist(false);
  };

  const displayExpr = result !== null ? expr : expr || "0";
  const displayResult = result !== null ? String(result) : null;

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg-base)", display:"flex", flexDirection:"column" }}>

      {/* NAV */}
      <header style={{ padding:"11px 16px", borderBottom:"1px solid var(--border-subtle)", background:"var(--bg-panel)", display:"flex", alignItems:"center", gap:10, position:"sticky", top:0, zIndex:50, flexShrink:0 }}>
        <div style={{ width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,var(--accent-purple),var(--accent-violet))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff",boxShadow:"var(--shadow-glow-purple)",flexShrink:0 }}>M</div>
        <div>
          <h1 style={{ margin:0,fontSize:14,fontWeight:700,color:"var(--text-primary)" }}>Mod Calc</h1>
          <p style={{ margin:0,fontSize:10,color:"var(--text-muted)" }}>Modular Arithmetic Calculator</p>
        </div>
        <div style={{ marginLeft:"auto",display:"flex",gap:8,alignItems:"center" }}>
          <Link href="/" style={{ fontSize:11,color:"var(--text-muted)",textDecoration:"none",padding:"4px 10px",borderRadius:6,border:"1px solid var(--border-subtle)",background:"var(--bg-card)",transition:"all .15s" }}
            onMouseEnter={e=>(e.currentTarget.style.color="var(--accent-purple)")}
            onMouseLeave={e=>(e.currentTarget.style.color="var(--text-muted)")}
          >← Cipher</Link>
          <button id="toggle-history-btn" onClick={() => setShowHist(v=>!v)} style={{ fontSize:11,color:showHist?"var(--accent-cyan)":"var(--text-muted)",padding:"4px 10px",borderRadius:6,border:`1px solid ${showHist?"var(--accent-cyan)":"var(--border-subtle)"}`,background:"var(--bg-card)",cursor:"pointer",transition:"all .15s" }}>
            History ({history.length})
          </button>
        </div>
      </header>

      {/* BODY */}
      <div style={{ flex:1, maxWidth:900, margin:"0 auto", width:"100%", padding:"14px 12px 40px", display:"flex", flexDirection:"column", gap:12 }}>

        {/* MAIN LAYOUT: calc + history */}
        <div style={{ display:"grid", gridTemplateColumns: showHist ? "1fr 300px" : "1fr", gap:12, alignItems:"start" }}>

          {/* CALCULATOR */}
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>

            {/* Display */}
            <div style={{
              background:"#0a0818", border:"1px solid var(--border-mid)", borderRadius:"16px 16px 0 0",
              padding:"16px 18px 14px", minHeight:140, display:"flex", flexDirection:"column", justifyContent:"space-between",
              boxShadow:"inset 0 2px 16px rgba(0,0,0,0.5)",
            }}>
              {/* Modulus T selector */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  {[2,7,10,26,27,29,128].map(t => (
                    <button key={t} onClick={() => { setModT(t); setModInput(String(t)); }}
                      style={{ fontSize:10,fontFamily:"monospace",padding:"2px 7px",borderRadius:99,border:`1px solid ${modT===t?"var(--accent-lime)":"var(--border-subtle)"}`,background:modT===t?"rgba(163,230,53,0.1)":"transparent",color:modT===t?"var(--accent-lime)":"var(--text-muted)",cursor:"pointer",transition:"all .1s" }}
                    >T={t}</button>
                  ))}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ fontSize:10, color:"var(--text-muted)" }}>mod</span>
                  <input
                    id="mod-t-input"
                    type="number" min={2} value={modInput}
                    onChange={e => setModInput(e.target.value)}
                    onBlur={commitModT}
                    onKeyDown={e => e.key==="Enter" && commitModT()}
                    style={{ width:56,textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:16,fontWeight:700,background:"transparent",border:"1px solid var(--border-mid)",borderRadius:6,color:"var(--accent-lime)",padding:"3px 6px",outline:"none" }}
                  />
                </div>
              </div>

              {/* Expression line */}
              <div style={{ textAlign:"right", minHeight:22 }}>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:"var(--text-muted)", wordBreak:"break-all" }}>
                  {expr || (result === null ? "" : "")}
                </span>
              </div>

              {/* Result / current input */}
              <div style={{ textAlign:"right", marginTop:4 }}>
                {error ? (
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:"var(--accent-rose)", wordBreak:"break-word" }}>
                    ⚠ {error}
                  </span>
                ) : displayResult !== null ? (
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:44, fontWeight:700, color:"var(--accent-cyan)", lineHeight:1 }}>
                    {displayResult}
                  </span>
                ) : (
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:44, fontWeight:700, color:"var(--text-primary)", lineHeight:1, wordBreak:"break-all" }}>
                    {displayExpr}
                  </span>
                )}
              </div>

              {/* Memory indicator */}
              {mem !== 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                  <span style={{ fontSize:10, color:"var(--accent-lime)", fontFamily:"monospace" }}>M = {mem}</span>
                  <span style={{ fontSize:10, color:"var(--text-muted)", fontFamily:"monospace" }}>ans = {ans ?? "—"}</span>
                </div>
              )}
            </div>

            {/* Button grid */}
            <div style={{ background:"#0e0c20", border:"1px solid var(--border-mid)", borderTop:"none", borderRadius:"0 0 16px 16px", padding:"10px 10px 14px", boxShadow:"0 8px 32px rgba(0,0,0,0.5)" }}>
              {ROWS.map((row, ri) => (
                <div key={ri} style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:6 }}>
                  {row.map((btn, bi) => {
                    const s = BK_STYLE[btn.kind];
                    const isPressed = pressing === btn.label;
                    return (
                      <button
                        key={bi}
                        id={`calc-btn-${btn.action ?? btn.insert?.trim() ?? btn.label}`}
                        onClick={() => handleBtn(btn)}
                        style={{
                          gridColumn: btn.span ? `span ${btn.span}` : undefined,
                          background: isPressed ? s.hoverBg : s.bg,
                          color: s.color,
                          border: `1px solid ${isPressed ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)"}`,
                          borderBottom: isPressed ? `1px solid rgba(255,255,255,0.06)` : `3px solid rgba(0,0,0,0.4)`,
                          borderRadius: 10,
                          padding: btn.span ? "16px 0" : "13px 0",
                          fontSize: btn.kind==="eq" ? 20 : 14,
                          fontWeight: 600,
                          fontFamily: /^\d$/.test(btn.label) ? "'JetBrains Mono',monospace" : "inherit",
                          cursor: "pointer",
                          transform: isPressed ? "translateY(1px)" : "none",
                          transition: "all 0.08s",
                          boxShadow: isPressed ? "none" : btn.kind==="eq" ? "0 0 16px rgba(109,40,217,0.3)" : "none",
                          letterSpacing: btn.kind==="eq" ? "0.05em" : 0,
                        }}
                      >
                        {btn.label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Keyboard hint */}
            <div style={{ textAlign:"center", fontSize:10, color:"var(--text-muted)", marginTop:8 }}>
              Keyboard supported · Enter = · Esc = clear · Backspace = ⌫
            </div>
          </div>

          {/* HISTORY PANEL (desktop inline) */}
          {showHist && (
            <div style={{ background:"var(--bg-panel)", border:"1px solid var(--border-subtle)", borderRadius:14, overflow:"hidden", display:"flex", flexDirection:"column", maxHeight:"calc(100vh - 100px)" }}>
              <div style={{ padding:"12px 14px", borderBottom:"1px solid var(--border-subtle)", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
                <span style={{ fontSize:12, fontWeight:700, color:"var(--text-primary)" }}>History</span>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => { setHistory([]); saveH([]); }} style={{ fontSize:10,color:"var(--accent-rose)",background:"transparent",border:"1px solid rgba(248,113,113,0.2)",borderRadius:4,padding:"2px 8px",cursor:"pointer" }}>Clear all</button>
                </div>
              </div>
              <div style={{ overflowY:"auto", flex:1 }}>
                {history.length === 0 ? (
                  <div style={{ padding:24, textAlign:"center", color:"var(--text-muted)", fontSize:12 }}>No history yet</div>
                ) : history.map(h => (
                  <div key={h.id} onClick={() => restoreHistory(h)}
                    style={{ padding:"10px 14px", borderBottom:"1px solid var(--border-subtle)", cursor:"pointer", transition:"background .15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background="var(--bg-card)")}
                    onMouseLeave={e => (e.currentTarget.style.background="transparent")}
                  >
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"var(--text-muted)", marginBottom:3, wordBreak:"break-all" }}>{h.expr}</div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      {h.error
                        ? <span style={{ fontSize:11, color:"var(--accent-rose)" }}>Error</span>
                        : <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:15, fontWeight:700, color:"var(--accent-cyan)" }}>{h.result}</span>
                      }
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:9, color:"var(--accent-lime)", fontFamily:"monospace" }}>mod {h.T}</div>
                        <div style={{ fontSize:9, color:"var(--text-muted)" }}>{ago(h.ts)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* HISTORY: mobile inline (when showHist and small screen, already handled by CSS) */}
        {showHist && (
          <div className="hist-mobile" style={{ display:"none" }}>
            <div style={{ background:"var(--bg-panel)", border:"1px solid var(--border-subtle)", borderRadius:14, overflow:"hidden" }}>
              <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--border-subtle)", display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:12,fontWeight:700,color:"var(--text-primary)" }}>History</span>
                <button onClick={() => { setHistory([]); saveH([]); }} style={{ fontSize:10,color:"var(--accent-rose)",background:"transparent",border:"none",cursor:"pointer" }}>Clear all</button>
              </div>
              <div style={{ maxHeight:280, overflowY:"auto" }}>
                {history.length===0 ? <div style={{ padding:20,textAlign:"center",color:"var(--text-muted)",fontSize:12 }}>No history yet</div>
                  : history.map(h => (
                  <div key={h.id+"m"} onClick={() => restoreHistory(h)}
                    style={{ padding:"9px 14px",borderBottom:"1px solid var(--border-subtle)",cursor:"pointer" }}>
                    <div style={{ fontFamily:"monospace",fontSize:10,color:"var(--text-muted)",marginBottom:2,wordBreak:"break-all" }}>{h.expr}</div>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                      {h.error ? <span style={{ fontSize:11,color:"var(--accent-rose)" }}>Error</span>
                        : <span style={{ fontFamily:"monospace",fontSize:15,fontWeight:700,color:"var(--accent-cyan)" }}>{h.result}</span>}
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:9,color:"var(--accent-lime)",fontFamily:"monospace" }}>mod {h.T}</div>
                        <div style={{ fontSize:9,color:"var(--text-muted)" }}>{ago(h.ts)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick reference */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:8 }}>
          {[
            { fn:"a + b", desc:"Addition mod T" },
            { fn:"a − b", desc:"Subtraction mod T" },
            { fn:"a × b", desc:"Multiplication mod T" },
            { fn:"a ÷ b", desc:"b⁻¹ × a mod T" },
            { fn:"a ^ b", desc:"Modular exponentiation" },
            { fn:"a mod b", desc:"Remainder (mod b)" },
            { fn:"inv(a)", desc:"Modular inverse of a" },
            { fn:"gcd(a,b)", desc:"Greatest common divisor" },
          ].map(r => (
            <div key={r.fn} style={{ background:"var(--bg-card)", border:"1px solid var(--border-subtle)", borderRadius:8, padding:"8px 10px" }}>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"var(--accent-purple)", marginBottom:2 }}>{r.fn}</div>
              <div style={{ fontSize:10, color:"var(--text-muted)" }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .hist-mobile { display: block !important; }
        }
        @media (min-width: 641px) {
          .hist-mobile { display: none !important; }
        }
        @media (max-width: 640px) {
          div[style*="300px"] {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
