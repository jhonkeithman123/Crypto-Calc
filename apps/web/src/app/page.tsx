"use client";

import { useState, useMemo, useCallback } from "react";
import { runAlphabetCipher, gcd, modInv } from "@crypto/cipher-core";
import type { CipherOp, CaseMode, AlphabetCipherResult, ComputeStep } from "@crypto/cipher-core";

// ─── Local Types ────────────────────────────────────────────────────
type BaseMode = "alpha27" | "alpha26" | "ascii" | "unicode" | "custom";
type CharGroup = { space: boolean; upper: boolean; lower: boolean; digits: boolean };

// ─── Data ───────────────────────────────────────────────────────────
const UPPER   = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const LOWER   = "abcdefghijklmnopqrstuvwxyz".split("");
const DIGITS  = "0123456789".split("");
const SAMPLES = ["Hello World", "The Quick Brown Fox", "Cryptography is Fun", "Caesar Cipher 101"];
const PREDEFINED_EXTRA = [",", ".", "?", "!", ":", ";", "'", '"', "-", "/"];

const OPS: { id: CipherOp; label: string; dual: boolean; encFmt: string; decFmt: string }[] = [
  { id: "add",           label: "Addition",      dual: false, encFmt: "N(D) = N(o) + X mod T",           decFmt: "N(o) = N(D) − X mod T" },
  { id: "sub",           label: "Subtraction",   dual: false, encFmt: "N(D) = N(o) − X mod T",           decFmt: "N(o) = N(D) + X mod T" },
  { id: "mul",           label: "Multiply",      dual: false, encFmt: "N(D) = N(o) × X mod T",           decFmt: "N(o) = N(D) × X⁻¹ mod T" },
  { id: "div",           label: "Division",      dual: false, encFmt: "N(D) = N(o) × X⁻¹ mod T",        decFmt: "N(o) = N(D) × X mod T" },
  { id: "scale_sum",     label: "Scale (X+Y)",   dual: true,  encFmt: "N(D) = N(o) × (X+Y) mod T",      decFmt: "N(o) = N(D) × (X+Y)⁻¹ mod T" },
  { id: "affine",        label: "Affine (×X+Y)", dual: true,  encFmt: "N(D) = N(o) × X + Y mod T",      decFmt: "N(o) = (N(D)−Y) × X⁻¹ mod T" },
  { id: "scale_product", label: "Scale (X·Y)",   dual: true,  encFmt: "N(D) = N(o) × (X·Y) mod T",      decFmt: "N(o) = N(D) × (X·Y)⁻¹ mod T" },
];

const BASE_TABS: { id: BaseMode; label: string }[] = [
  { id: "alpha27", label: "BASE 27" },
  { id: "alpha26", label: "BASE 26" },
  { id: "ascii",   label: "ASCII" },
  { id: "unicode", label: "UNICODE" },
  { id: "custom",  label: "CUSTOM" },
];

// ─── Helpers ────────────────────────────────────────────────────────
function dispChar(c: string) { return c === " " ? "␣" : c; }

function buildAlphabet(groups: CharGroup, extraRaw: string, activePre: Set<string>, baseMode: BaseMode): string[] {
  if (baseMode === "alpha27") return [" ", ...UPPER];
  if (baseMode === "alpha26") return [...UPPER];
  if (baseMode === "ascii")   return Array.from({ length: 128 }, (_, i) => String.fromCharCode(i));
  if (baseMode === "unicode") return Array.from({ length: 256 }, (_, i) => String.fromCodePoint(i));

  // custom
  const chars: string[] = [];
  if (groups.space)  chars.push(" ");
  if (groups.upper)  chars.push(...UPPER);
  if (groups.lower)  chars.push(...LOWER);
  if (groups.digits) chars.push(...DIGITS);
  const seen = new Set(chars);
  const extra = [...activePre, ...extraRaw.split("").filter(Boolean)];
  for (const ch of extra) { if (!seen.has(ch)) { chars.push(ch); seen.add(ch); } }
  return chars;
}

function getFormulaLine(opId: CipherOp, dir: "encrypt" | "decrypt", X: number, Y: number, T: number): string {
  const inv = (n: number) => { const r = modInv(n, T); return r !== null ? `${r}` : "∄"; };
  switch (opId) {
    case "add":           return dir === "encrypt" ? `N(D) = N(o) + ${X} mod ${T}` : `N(o) = N(D) − ${X} mod ${T}`;
    case "sub":           return dir === "encrypt" ? `N(D) = N(o) − ${X} mod ${T}` : `N(o) = N(D) + ${X} mod ${T}`;
    case "mul":           return dir === "encrypt" ? `N(D) = N(o) × ${X} mod ${T}` : `N(o) = N(D) × X⁻¹=${inv(X)} mod ${T}`;
    case "div":           return dir === "encrypt" ? `N(D) = N(o) × X⁻¹=${inv(X)} mod ${T}` : `N(o) = N(D) × ${X} mod ${T}`;
    case "scale_sum": {
      const c = ((X + Y) % T + T) % T;
      return dir === "encrypt" ? `N(D) = N(o) × (${X}+${Y}) mod ${T}  [= N(o) × ${c} mod ${T}]` : `N(o) = N(D) × (${X}+${Y})⁻¹=${inv(c)} mod ${T}`;
    }
    case "affine":        return dir === "encrypt" ? `N(D) = N(o) × ${X} + ${Y} mod ${T}` : `N(o) = (N(D) − ${Y}) × X⁻¹=${inv(X)} mod ${T}`;
    case "scale_product": {
      const c = ((X * Y) % T + T) % T;
      return dir === "encrypt" ? `N(D) = N(o) × (${X}·${Y}) mod ${T}  [= N(o) × ${c} mod ${T}]` : `N(o) = N(D) × (${X}·${Y})⁻¹=${inv(c)} mod ${T}`;
    }
    default: return "";
  }
}

function buildComputation(step: ComputeStep, opId: CipherOp, dir: "encrypt" | "decrypt", T: number, X: number, Y: number): string {
  if (step.pass) return "—";
  const { idx, effKey, opSym, premod, ni } = step;
  if (opId === "affine" && dir === "decrypt") {
    const inv = modInv(X, T);
    if (inv === null) return `(${idx} − ${Y}) × ∄ mod ${T}`;
    const shifted = ((idx - Y) % T + T) % T;
    return `(${idx} − ${Y}) × ${inv} = ${premod === -1 ? "?" : premod} mod ${T} = ${ni}`;
  }
  return `${idx} ${opSym} ${effKey} = ${premod} mod ${T} = ${ni}`;
}

// ─── Main Component ─────────────────────────────────────────────────
export default function CryptoCalcPage() {
  const [inputText,      setInputText]     = useState("Hello World");
  const [op,             setOp]            = useState<CipherOp>("scale_sum");
  const [keyX,           setKeyX]          = useState(13);
  const [keyY,           setKeyY]          = useState(6);
  const [groups,         setGroups]        = useState<CharGroup>({ space: true, upper: true, lower: false, digits: false });
  const [extraRaw,       setExtraRaw]      = useState("");
  const [activePre,      setActivePre]     = useState<Set<string>>(new Set());
  const [caseMode,       setCaseMode]      = useState<CaseMode>("lower");
  const [baseMode,       setBaseMode]      = useState<BaseMode>("alpha27");
  const [customBase,     setCustomBase]    = useState(29);
  const [result,         setResult]        = useState<AlphabetCipherResult | null>(null);
  const [lastDir,        setLastDir]       = useState<"encrypt" | "decrypt">("encrypt");
  const [showLogs,       setShowLogs]      = useState(false);
  const [showFormula,    setShowFormula]   = useState(true);

  const alphabet   = useMemo(() => buildAlphabet(groups, extraRaw, activePre, baseMode), [groups, extraRaw, activePre, baseMode]);
  const effectiveT = baseMode === "custom" ? Math.max(2, customBase) : alphabet.length;
  const X          = ((keyX % effectiveT) + effectiveT) % effectiveT;
  const Y          = ((keyY % effectiveT) + effectiveT) % effectiveT;
  const opInfo     = OPS.find(o => o.id === op)!;
  const isDual     = opInfo.dual;
  const isLargeBase = baseMode === "ascii" || baseMode === "unicode";
  const isCustom   = baseMode === "custom";

  // gcd warning for multiplicative ops
  const gcdWarn = useMemo(() => {
    if (op === "add" || op === "sub") return null;
    let composite = X;
    if (op === "scale_sum")     composite = ((X + Y) % effectiveT + effectiveT) % effectiveT;
    if (op === "scale_product") composite = ((X * Y) % effectiveT + effectiveT) % effectiveT;
    const g = gcd(composite, effectiveT);
    if (g !== 1) {
      const label = op === "scale_sum" ? "X+Y" : op === "scale_product" ? "X·Y" : "X";
      return `gcd(${label}=${composite}, T=${effectiveT}) = ${g} — no unique decryption`;
    }
    return null;
  }, [op, X, Y, effectiveT]);

  // Highlight index from first char
  const firstChar = inputText.length > 0 ? inputText[0] : null;
  const firstCharIdx = useMemo(() => {
    if (!firstChar || isLargeBase) return -1;
    const norm = (c: string) => caseMode === "lower" ? c.toLowerCase() : caseMode === "upper" ? c.toUpperCase() : c;
    return alphabet.findIndex(a => a === norm(firstChar));
  }, [firstChar, alphabet, caseMode, isLargeBase]);

  const run = useCallback((dir: "encrypt" | "decrypt") => {
    const res = runAlphabetCipher(inputText, dir, { alphabet, op, keyX: X, keyY: Y, caseMode });
    setResult(res);
    setLastDir(dir);
  }, [inputText, alphabet, op, X, Y, caseMode]);

  const toggleGroup = (k: keyof CharGroup) => setGroups(prev => ({ ...prev, [k]: !prev[k] }));
  const togglePre   = (ch: string) => setActivePre(prev => { const n = new Set(prev); n.has(ch) ? n.delete(ch) : n.add(ch); return n; });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>

      {/* ─── Header ─── */}
      <header style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-panel)",
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: "linear-gradient(135deg,var(--accent-purple),var(--accent-violet))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, fontWeight: 800, color: "#fff",
          boxShadow: "var(--shadow-glow-purple)",
        }}>C</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Crypto Calc</h1>
          <p style={{ margin: 0, fontSize: 10, color: "var(--text-muted)" }}>Caesar Cipher Playground</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexShrink: 0 }}>
          <span className="chip">Caesar</span>
          <span className="chip" style={{ display: "none" }}>Substitution</span>
        </div>
      </header>

      {/* ─── Body ─── */}
      <div style={{ maxWidth: 940, margin: "0 auto", padding: "14px 12px 60px" }}>

        {/* INPUT */}
        <div className="panel" style={{ padding: "12px 14px", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
            <span className="section-label" style={{ margin: 0 }}>Plaintext / Input</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select
                id="sample-select"
                className="input-field"
                style={{ width: "auto", fontSize: 11, padding: "3px 8px" }}
                onChange={e => { if (e.target.value) { setInputText(e.target.value); setResult(null); } e.target.value = ""; }}
                defaultValue=""
              >
                <option value="">Sample texts…</option>
                {SAMPLES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button id="clear-btn" className="btn-ghost" style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => { setInputText(""); setResult(null); }}>✕ Clear</button>
            </div>
          </div>
          <textarea
            id="cipher-input"
            className="input-field"
            style={{ minHeight: 68, fontSize: 14, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.6 }}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Enter text to encrypt or decrypt…"
          />
          <div style={{ textAlign: "right", fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>{inputText.length} chars</div>
        </div>

        {/* TWO-COLUMN GRID */}
        <div className="two-col-grid" style={{ display: "grid", gap: 10, marginBottom: 10 }}>

          {/* ── LEFT ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Character groups */}
            <div className="panel" style={{ padding: "11px 13px" }}>
              <div className="section-label">Character Groups</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {([
                  { key: "space",  label: "␣ Space",  count: "+1" },
                  { key: "upper",  label: "A–Z",       count: "26" },
                  { key: "lower",  label: "a–z",       count: "26" },
                  { key: "digits", label: "0–9",       count: "10" },
                ] as { key: keyof CharGroup; label: string; count: string }[]).map(g => {
                  const isOn = baseMode === "alpha27"
                    ? (g.key === "space" || g.key === "upper")
                    : baseMode === "alpha26"
                    ? g.key === "upper"
                    : isCustom ? groups[g.key] : false;
                  return (
                    <button
                      key={g.key}
                      id={`group-${g.key}`}
                      className={`chip ${isOn ? (g.key === "space" ? "active-cyan" : "active") : ""}`}
                      onClick={() => { if (isCustom) toggleGroup(g.key); }}
                      style={{ opacity: (!isCustom) ? 0.5 : 1, cursor: isCustom ? "pointer" : "default" }}
                    >
                      {isOn ? "✓ " : ""}{g.label} {g.count}
                    </button>
                  );
                })}
              </div>
              {!isCustom && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 5 }}>Switch to CUSTOM base to toggle groups</div>}
            </div>

            {/* Case handling */}
            <div className="panel" style={{ padding: "11px 13px" }}>
              <div className="section-label">Case Handling</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {([
                  { id: "sensitive" as CaseMode, label: "Case Sensitive", sub: "A ≠ a" },
                  { id: "lower"     as CaseMode, label: "Lowercase",      sub: "A → a = 26" },
                  { id: "upper"     as CaseMode, label: "UPPERCASE",      sub: "a → A = 26" },
                ]).map(cm => (
                  <button key={cm.id} id={`case-${cm.id}`}
                    className={`chip ${caseMode === cm.id ? "active" : ""}`}
                    style={{ flexDirection: "column", alignItems: "flex-start", padding: "6px 10px", borderRadius: 8 }}
                    onClick={() => setCaseMode(cm.id)}
                  >
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{cm.label}</span>
                    <span style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 1 }}>{cm.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Extra characters */}
            <div className="panel" style={{ padding: "11px 13px" }}>
              <div className="section-label">Extra Characters</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 7 }}>
                {PREDEFINED_EXTRA.map(ch => (
                  <button key={ch} id={`pre-${ch.charCodeAt(0)}`}
                    className={`chip ${activePre.has(ch) ? "active" : ""}`}
                    style={{ fontSize: 12, fontFamily: "monospace", padding: "3px 8px", minWidth: 28 }}
                    onClick={() => togglePre(ch)}
                  >{ch}</button>
                ))}
              </div>
              <input
                id="extra-symbols-input"
                className="input-field"
                style={{ fontSize: 13, fontFamily: "monospace" }}
                placeholder=", . ? ! — type extra symbols"
                value={extraRaw}
                onChange={e => setExtraRaw(e.target.value)}
              />
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>Appended after group chars · duplicates ignored</div>
            </div>

            {/* Base selector */}
            <div className="panel" style={{ padding: "11px 13px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                {BASE_TABS.map(b => (
                  <button key={b.id} id={`base-${b.id}`}
                    className={`base-tab ${baseMode === b.id ? "active" : ""}`}
                    onClick={() => setBaseMode(b.id)}
                  >{b.label}</button>
                ))}
              </div>
              {isCustom && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Custom T:</span>
                  <input id="custom-base-input" type="number" className="input-field" min={2}
                    style={{ width: 72, textAlign: "center" }}
                    value={customBase}
                    onChange={e => setCustomBase(Math.max(2, parseInt(e.target.value) || 2))}
                  />
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{
                  display: "inline-block", padding: "3px 10px", borderRadius: 99,
                  background: "rgba(163,230,53,0.1)", border: "1px solid rgba(163,230,53,0.35)",
                  color: "var(--accent-lime)", fontSize: 12, fontWeight: 700,
                  fontFamily: "'JetBrains Mono',monospace",
                }}>BASE {effectiveT}</span>
                {gcdWarn && (
                  <div className="gcd-warning" style={{ flex: 1, padding: "4px 10px", fontSize: 10 }}>⚠ {gcdWarn}</div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Operations */}
            <div className="panel" style={{ padding: "11px 13px" }}>
              <div className="section-label">Cipher Operation</div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 5 }}>1 KEY OPERATIONS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 10 }}>
                {OPS.filter(o => !o.dual).map(o => (
                  <button key={o.id} id={`op-${o.id}`}
                    className={`op-btn ${op === o.id ? "active" : ""}`}
                    onClick={() => setOp(o.id)}
                  >
                    <span>{o.label}</span>
                    <span className="formula">{o.encFmt.slice(0, 22)}</span>
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 5 }}>2 KEY OPERATIONS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                {OPS.filter(o => o.dual).map(o => (
                  <button key={o.id} id={`op-${o.id}`}
                    className={`op-btn ${op === o.id ? "active" : ""}`}
                    onClick={() => setOp(o.id)}
                    style={o.id === "affine" && OPS.filter(x => x.dual).length % 2 !== 0 ? { gridColumn: "span 1" } : {}}
                  >
                    <span>{o.label}</span>
                    <span className="formula">{o.encFmt.slice(0, 22)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Formula */}
            <div className="panel" style={{ padding: "11px 13px" }}>
              <div className="section-label">Formula</div>
              <div className="formula-box" style={{ fontSize: 11 }}>
                <div style={{ color: "var(--accent-cyan)", marginBottom: 2 }}>
                  {/* Encrypt formula */}
                  {getFormulaLine(op, "encrypt", X, Y, effectiveT)}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: 10 }}>
                  {/* Decrypt formula */}
                  {getFormulaLine(op, "decrypt", X, Y, effectiveT)}
                </div>
              </div>
            </div>

            {/* Key X */}
            <div className="panel" style={{ padding: "11px 13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span className="section-label" style={{ margin: 0 }}>Key X</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>0 – {effectiveT - 1}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="key-number-display">{X}</div>
                <div style={{ flex: 1 }}>
                  <input id="key-x-slider" type="range" className="range-slider"
                    min={0} max={effectiveT - 1} value={keyX}
                    onChange={e => setKeyX(Number(e.target.value))}
                  />
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>
                    {(op === "mul" || op === "div" || isDual)
                      ? `gcd(X,T) = ${gcd(X, effectiveT)} ${gcd(X, effectiveT) === 1 ? "✓" : "⚠"}`
                      : `shift = ${X}`}
                  </div>
                </div>
                <input id="key-x-number" type="number" className="input-field"
                  style={{ width: 56, textAlign: "center", flexShrink: 0 }}
                  min={0} max={effectiveT - 1} value={keyX}
                  onChange={e => setKeyX(Math.max(0, Math.min(effectiveT - 1, parseInt(e.target.value) || 0)))}
                />
              </div>
            </div>

            {/* Key Y — dual only */}
            {isDual && (
              <div className="panel" style={{ padding: "11px 13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span className="section-label" style={{ margin: 0 }}>Key Y</span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>0 – {effectiveT - 1}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="key-number-display">{Y}</div>
                  <div style={{ flex: 1 }}>
                    <input id="key-y-slider" type="range" className="range-slider"
                      min={0} max={effectiveT - 1} value={keyY}
                      onChange={e => setKeyY(Number(e.target.value))}
                    />
                  </div>
                  <input id="key-y-number" type="number" className="input-field"
                    style={{ width: 56, textAlign: "center", flexShrink: 0 }}
                    min={0} max={effectiveT - 1} value={keyY}
                    onChange={e => setKeyY(Math.max(0, Math.min(effectiveT - 1, parseInt(e.target.value) || 0)))}
                  />
                </div>
              </div>
            )}

            {/* Alphabet Map */}
            {!isLargeBase && (
              <div className="panel" style={{ padding: "11px 13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span className="section-label" style={{ margin: 0 }}>
                    Alphabet Map — {effectiveT} chars (T = {effectiveT})
                  </span>
                </div>
                <div className="alpha-map-grid">
                  {alphabet.slice(0, 108).map((ch, i) => (
                    <div key={i}
                      className={`alpha-cell ${i === firstCharIdx ? "highlighted" : ""}`}
                      title={`${dispChar(ch)} = ${i}`}
                    >
                      <span className="char">{dispChar(ch)}</span>
                      <span className="idx">{i}</span>
                    </div>
                  ))}
                  {alphabet.length > 108 && (
                    <div style={{ fontSize: 9, color: "var(--text-muted)", padding: "4px 0" }}>
                      +{alphabet.length - 108} more chars…
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── ACTION BUTTONS ─── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <button id="encrypt-btn" className="btn-primary" style={{ flex: "1 1 120px" }} onClick={() => run("encrypt")}>
            🔒 Encrypt
          </button>
          <button id="decrypt-btn" className="btn-secondary" style={{ flex: "1 1 120px" }} onClick={() => run("decrypt")}>
            🔓 Decrypt
          </button>
          {result && (
            <button id="use-result-btn" className="btn-ghost"
              style={{ flex: "1 1 140px", justifyContent: "center" }}
              onClick={() => { setInputText(result.ciphertext); setResult(null); }}
            >
              ↩ Use result as input
            </button>
          )}
        </div>

        {/* ─── RESULT PANEL ─── */}
        {result ? (
          <div className="panel animate-in" style={{ padding: "13px 15px" }}>

            {/* Result header */}
            <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
              <span className={`result-badge ${lastDir === "encrypt" ? "badge-encrypted" : "badge-decrypted"}`}>
                {lastDir === "encrypt" ? "🔒 ENCRYPTED" : "🔓 DECRYPTED"}
              </span>
              <span className="result-badge badge-info">
                BASE {effectiveT} · {opInfo.label.toUpperCase()}
              </span>
              <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: 2 }}>
                {lastDir === "encrypt" ? "CIPHERTEXT" : "PLAINTEXT"}
              </span>
              <div style={{ flex: 1 }} />
              <button id="copy-result-btn" className="btn-ghost" onClick={() => navigator.clipboard.writeText(result.ciphertext)}>📋 Copy result</button>
              <button id="formula-view-btn" className="btn-ghost"
                style={{ borderColor: showFormula ? "var(--accent-purple)" : undefined }}
                onClick={() => setShowFormula(v => !v)}
              >
                ∑ Formula View ({showFormula ? "×" : "+"})
              </button>
              <button id="show-logs-btn" className="btn-ghost" onClick={() => setShowLogs(v => !v)}>
                Show logs ({result.logs.length})
              </button>
            </div>

            {/* Ciphertext */}
            <div className="ciphertext-display" style={{ marginBottom: 10 }}>
              {result.ciphertext || <span style={{ color: "var(--text-muted)" }}>(empty)</span>}
            </div>

            {/* Formula summary */}
            <div className="formula-summary" style={{ marginBottom: 10, fontSize: 11 }}>
              <span style={{ color: "var(--accent-purple)", fontWeight: 600 }}>
                {lastDir === "encrypt" ? opInfo.encFmt : opInfo.decFmt}
              </span>
              <br />
              <span style={{ color: "var(--accent-cyan)" }}>X = {X}</span>
              {isDual && <><span style={{ color: "var(--text-muted)" }}> · </span><span style={{ color: "var(--accent-lime)" }}>Y = {Y}</span></>}
              <span style={{ color: "var(--text-muted)" }}> · </span>
              <span style={{ color: "var(--accent-amber)" }}>T = {effectiveT}</span>
              {op === "scale_sum" && (() => {
                const c = ((X + Y) % effectiveT + effectiveT) % effectiveT;
                const inv = modInv(c, effectiveT);
                return <><span style={{ color: "var(--text-muted)" }}> · </span><span style={{ color: "var(--text-secondary)" }}>(X+Y) = {c}</span><span style={{ color: "var(--text-muted)" }}> · </span><span style={{ color: "var(--accent-purple)" }}>(X+Y)* = {inv ?? "∄"}</span></>;
              })()}
              {op === "scale_product" && (() => {
                const c = ((X * Y) % effectiveT + effectiveT) % effectiveT;
                const inv = modInv(c, effectiveT);
                return <><span style={{ color: "var(--text-muted)" }}> · </span><span style={{ color: "var(--text-secondary)" }}>(X·Y) = {c}</span><span style={{ color: "var(--text-muted)" }}> · </span><span style={{ color: "var(--accent-purple)" }}>(X·Y)* = {inv ?? "∄"}</span></>;
              })()}
              {(op === "mul" || op === "affine") && (() => {
                const inv = modInv(X, effectiveT);
                return <><span style={{ color: "var(--text-muted)" }}> · </span><span style={{ color: "var(--accent-purple)" }}>X⁻¹ = {inv ?? "∄"}</span></>;
              })()}
            </div>

            {/* Step table */}
            {showFormula && result.steps.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table className="step-table">
                  <thead>
                    <tr>
                      <th>CHAR</th>
                      <th>N(i)</th>
                      <th style={{ minWidth: 200 }}>COMPUTATION</th>
                      <th style={{ textAlign: "right" }}>OUTPUT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.steps.map((step: ComputeStep, i: number) => (
                      <tr key={i}>
                        <td className="td-char">{step.inLabel}</td>
                        <td className={step.pass ? "td-pass" : "td-idx"}>{step.pass ? "—" : step.idx}</td>
                        <td className="td-comp">
                          {step.pass
                            ? <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>pass-through</span>
                            : <>
                                {buildComputation(step, op, lastDir, effectiveT, X, Y)}
                                {step.warn && <span style={{ color: "var(--accent-amber)", fontSize: 10, marginLeft: 8 }}>⚠ {step.warn}</span>}
                              </>
                          }
                        </td>
                        <td className={step.pass ? "td-pass" : "td-out"}>{step.outLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Logs */}
            {showLogs && (
              <div style={{ marginTop: 10 }}>
                <div className="section-label">Debug Logs</div>
                <div style={{
                  fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--text-muted)",
                  background: "var(--bg-input)", border: "1px solid var(--border-subtle)",
                  borderRadius: 8, padding: "7px 11px", maxHeight: 150, overflowY: "auto", lineHeight: 1.8,
                }}>
                  {result.logs.map((l: string, i: number) => <div key={i}>{l}</div>)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "28px 20px", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>🔐</div>
            <div style={{ fontWeight: 600, marginBottom: 3, color: "var(--text-secondary)", fontSize: 13 }}>Ready to encrypt or decrypt</div>
            <div style={{ fontSize: 11 }}>Configure your settings above, then hit Encrypt or Decrypt</div>
          </div>
        )}
      </div>
    </div>
  );
}
