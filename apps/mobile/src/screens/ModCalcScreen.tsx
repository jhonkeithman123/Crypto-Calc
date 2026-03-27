import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { evaluate, timeAgo } from '@crypto/modcalc-core';
import { C, F } from '../theme';

// ─── Types ────────────────────────────────────────────────────────────
interface HEntry { id: string; expr: string; T: number; result: number; error?: string; ts: number }
type BK = 'num'|'op'|'fn'|'eq'|'clr'|'del'|'mem'|'spec';
interface Btn { label: string; insert?: string; action?: string; kind: BK; span?: boolean }

// ─── Button layout ────────────────────────────────────────────────────
const ROWS: Btn[][] = [
  [{label:'gcd(',insert:'gcd(',kind:'fn'},{label:'inv(',insert:'inv(',kind:'fn'},{label:'^',insert:'^',kind:'op'},{label:'mod',insert:' mod ',kind:'op'}],
  [{label:'(',insert:'(',kind:'fn'},{label:')',insert:')',kind:'fn'},{label:',',insert:',',kind:'fn'},{label:'C',action:'clear',kind:'clr'}],
  [{label:'MC',action:'mc',kind:'mem'},{label:'MR',action:'mr',kind:'mem'},{label:'M+',action:'mplus',kind:'mem'},{label:'M−',action:'mminus',kind:'mem'}],
  [{label:'7',insert:'7',kind:'num'},{label:'8',insert:'8',kind:'num'},{label:'9',insert:'9',kind:'num'},{label:'÷',insert:' ÷ ',kind:'op'}],
  [{label:'4',insert:'4',kind:'num'},{label:'5',insert:'5',kind:'num'},{label:'6',insert:'6',kind:'num'},{label:'×',insert:' × ',kind:'op'}],
  [{label:'1',insert:'1',kind:'num'},{label:'2',insert:'2',kind:'num'},{label:'3',insert:'3',kind:'num'},{label:'−',insert:' − ',kind:'op'}],
  [{label:'+/−',action:'neg',kind:'spec'},{label:'0',insert:'0',kind:'num'},{label:'+',insert:' + ',kind:'op'},{label:'⌫',action:'back',kind:'del'}],
  [{label:'=',action:'eval',kind:'eq',span:true}],
];

const T_PRESETS = [2,7,10,26,27,29];

const KIND_STYLE: Record<BK,{bg:string;color:string;pressedBg:string}> = {
  num:  {bg:'#1a1836',color:C.textPrimary, pressedBg:'#242048'},
  op:   {bg:'#251550',color:'#c084fc',      pressedBg:'#321d65'},
  fn:   {bg:'#0f2035',color:C.cyan,         pressedBg:'#162b48'},
  eq:   {bg:C.violet, color:'#fff',          pressedBg:'#5b21b6'},
  clr:  {bg:'#3b0f12',color:'#f87171',       pressedBg:'#4d151a'},
  del:  {bg:'#1a1a30',color:'#94a3b8',       pressedBg:'#232340'},
  mem:  {bg:'#0a2420',color:C.green,         pressedBg:'#103030'},
  spec: {bg:'#1e1510',color:C.amber,         pressedBg:'#2a1e12'},
};

const HKEY = 'modcalc_rn_v1';

// ─── Component ────────────────────────────────────────────────────────
export default function ModCalcScreen() {
  const [expr,     setExpr]     = useState('');
  const [result,   setResult]   = useState<number|null>(null);
  const [error,    setError]    = useState<string|null>(null);
  const [modT,     setModT]     = useState(0);    // 0=free
  const [modInput, setModInput] = useState('');
  const [mem,      setMem]      = useState(0);
  const [ans,      setAns]      = useState<number|null>(null);
  const [history,  setHistory]  = useState<HEntry[]>([]);
  const [showHist, setShowHist] = useState(false);
  const [pressed,  setPressed]  = useState<string|null>(null);

  useEffect(() => {
    AsyncStorage.getItem(HKEY).then(v => { if(v) setHistory(JSON.parse(v)); }).catch(()=>{});
  }, []);

  const saveHistory = (h: HEntry[]) => {
    AsyncStorage.setItem(HKEY, JSON.stringify(h.slice(0,50))).catch(()=>{});
  };

  const addToHistory = useCallback((e: HEntry) => {
    setHistory(prev => { const n=[e,...prev]; saveHistory(n); return n; });
  }, []);

  const runEval = useCallback(() => {
    if (!expr.trim()) return;
    const r = evaluate(expr, modT);
    if ('result' in r) {
      setResult(r.result); setError(null); setAns(r.result);
      addToHistory({id:Date.now()+'',expr,T:modT,result:r.result,ts:Date.now()});
    } else {
      setError(r.error); setResult(null);
      addToHistory({id:Date.now()+'',expr,T:modT,result:-1,error:r.error,ts:Date.now()});
    }
  }, [expr, modT, addToHistory]);

  const handleBtn = useCallback((btn: Btn) => {
    setPressed(btn.label);
    Vibration.vibrate(20);
    setTimeout(() => setPressed(null), 100);

    if (btn.insert !== undefined) {
      if (result !== null && !btn.insert.trim().match(/^[+\-×÷*\/^]/)) {
        setExpr(btn.insert); setResult(null); setError(null); return;
      }
      if (result !== null) { setExpr(String(result) + btn.insert); setResult(null); setError(null); return; }
      setExpr(p => p + btn.insert!); return;
    }
    if (btn.action==='clear')  { setExpr(''); setResult(null); setError(null); return; }
    if (btn.action==='back')   { setResult(null); setError(null); setExpr(p => p.slice(0,-1).trimEnd()); return; }
    if (btn.action==='eval')   { runEval(); return; }
    if (btn.action==='neg')    { if(result!==null){const v=modT>0?(modT-result)%modT:-result;setResult(v);setAns(v);}else{setExpr(p=>p?`(0 − (${p}))`:'')}; return; }
    if (btn.action==='ans')    { if(ans!==null){setExpr(p=>result!==null?String(ans):p+String(ans));setResult(null);setError(null);} return; }
    if (btn.action==='mc')     { setMem(0); return; }
    if (btn.action==='mr')     { setExpr(p=>result!==null?String(mem):p+String(mem)); setResult(null); setError(null); return; }
    if (btn.action==='mplus')  { setMem(m=>result!==null?(modT>0?(m+result)%modT:m+result):m); return; }
    if (btn.action==='mminus') { setMem(m=>result!==null?(modT>0?((m-result)%modT+modT)%modT:m-result):m); return; }
  }, [result, ans, mem, modT, runEval]);

  const commitModT = () => {
    const raw = modInput.trim();
    if (raw === '' || raw === '∞') { setModT(0); setModInput(''); return; }
    const v = parseInt(raw, 10);
    if (!isNaN(v) && v >= 2) setModT(v);
    else setModInput(modT > 0 ? String(modT) : '');
  };

  const restoreHistory = (h: HEntry) => {
    setExpr(String(h.result));
    setResult(null); setError(null);
    setModT(h.T); setModInput(h.T === 0 ? '' : String(h.T));
    setShowHist(false);
  };

  const displayBig  = result !== null ? String(result) : (expr || '0');
  const displayExpr = result !== null ? expr : null;

  return (
    <SafeAreaView style={s.root}>
      <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">

        {/* DISPLAY */}
        <View style={s.display}>
          {/* T presets */}
          <View style={s.tRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.tPresets}>
                {/* Free mode */}
                <TouchableOpacity
                  style={[s.tBtn, modT===0 && s.tBtnFree]}
                  onPress={() => {setModT(0); setModInput('');}}>
                  <Text style={[s.tBtnTxt, modT===0 && {color:'#06b6d4',fontWeight:'700'}]}>∞ free</Text>
                </TouchableOpacity>
                {[2,7,10,26,27,29].map(t => (
                  <TouchableOpacity key={t} style={[s.tBtn,modT===t&&s.tBtnActive]} onPress={() => {setModT(t);setModInput(String(t));}}>
                    <Text style={[s.tBtnTxt,modT===t&&{color:C.lime}]}>T={t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={s.modInputWrap}>
              <Text style={s.modLabel}>mod</Text>
              <TextInput
                style={[s.modInput, modT===0 && {borderColor:C.cyan, color:C.cyan}]}
                keyboardType="number-pad"
                value={modInput}
                onChangeText={setModInput}
                onBlur={commitModT}
                onSubmitEditing={commitModT}
                placeholder="∞"
                placeholderTextColor={C.cyan}
              />
            </View>
          </View>

          {/* Mode label */}
          <Text style={{textAlign:'right',fontSize:9,fontFamily:F.mono,color:modT===0?C.cyan:C.lime,letterSpacing:1,marginBottom:2}}>
            {modT===0 ? 'FREE  (no auto-mod)' : `AUTO MOD ${modT}`}
          </Text>

          {/* Expression small */}
          {displayExpr ? <Text style={s.exprSmall} numberOfLines={2}>{displayExpr}</Text> : null}

          {/* Big number */}
          {error
            ? <Text style={s.errorTxt} numberOfLines={3}>{error}</Text>
            : <Text style={s.bigNum} numberOfLines={1} adjustsFontSizeToFit>{displayBig}</Text>
          }

          {/* Memory */}
          {mem !== 0 && (
            <View style={s.memRow}>
              <Text style={s.memTxt}>M={mem}</Text>
              {ans !== null && <Text style={s.memTxt}>ANS={ans}</Text>}
            </View>
          )}
        </View>

        {/* BUTTON GRID */}
        <View style={s.grid}>
          {ROWS.map((row, ri) => (
            <View key={ri} style={s.btnRow}>
              {row.map((btn, bi) => {
                const ks = KIND_STYLE[btn.kind];
                const isP = pressed === btn.label;
                return (
                  <TouchableOpacity
                    key={bi}
                    activeOpacity={0.75}
                    style={[
                      s.btn,
                      btn.span && s.btnSpan,
                      { backgroundColor: isP ? ks.pressedBg : ks.bg },
                      btn.kind==='eq' && s.btnEq,
                    ]}
                    onPress={() => handleBtn(btn)}
                  >
                    <Text style={[s.btnTxt, {color:ks.color}, btn.kind==='eq'&&s.btnTxtEq]}>
                      {btn.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* HISTORY TOGGLE */}
        <TouchableOpacity style={s.histToggle} onPress={() => setShowHist(v=>!v)}>
          <Text style={s.histToggleTxt}>
            {showHist ? '▲ Hide' : '▼ Show'} History ({history.length})
          </Text>
        </TouchableOpacity>

        {/* HISTORY */}
        {showHist && (
          <View style={s.histPanel}>
            <View style={s.histHeader}>
              <Text style={s.histTitle}>History</Text>
              <TouchableOpacity onPress={() => { setHistory([]); saveHistory([]); }}>
                <Text style={{fontSize:11,color:C.rose}}>Clear all</Text>
              </TouchableOpacity>
            </View>
            {history.length === 0
              ? <Text style={s.histEmpty}>No history yet</Text>
              : history.map(h => (
                <TouchableOpacity key={h.id} style={s.histItem} onPress={() => restoreHistory(h)}>
                  <Text style={s.histExpr} numberOfLines={1}>{h.expr}</Text>
                  <View style={s.histBottom}>
                    {h.error
                      ? <Text style={{fontSize:13,color:C.rose}}>Error</Text>
                      : <Text style={s.histResult}>{h.result}</Text>
                    }
                    <View>
                      <Text style={s.histMod}>mod {h.T}</Text>
                      <Text style={s.histTs}>{timeAgo(h.ts)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            }
          </View>
        )}

        {/* QUICK REFERENCE */}
        <View style={s.refGrid}>
          {[
            ['a + b','Add mod T'],['a − b','Sub mod T'],['a × b','Mul mod T'],
            ['a ÷ b','Modular division'],['a ^ b','Modular exponent'],['a mod b','Plain remainder'],
            ['inv(a)','Modular inverse'],['gcd(a,b)','Greatest common div'],
          ].map(([fn,desc]) => (
            <View key={fn} style={s.refCard}>
              <Text style={s.refFn}>{fn}</Text>
              <Text style={s.refDesc}>{desc}</Text>
            </View>
          ))}
        </View>

        <View style={{height:30}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:        { flex:1, backgroundColor:C.bgBase },
  scroll:      { flex:1 },
  display:     { backgroundColor:'#0a0818', borderWidth:1, borderColor:C.borderMid, borderRadius:16, margin:10, padding:14, minHeight:160 },
  tRow:        { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:6 },
  tPresets:    { flexDirection:'row', gap:5 },
  tBtn:        { paddingHorizontal:8, paddingVertical:3, borderRadius:99, borderWidth:1, borderColor:C.border },
  tBtnActive:  { borderColor:C.lime, backgroundColor:'rgba(163,230,53,0.1)' },
  tBtnFree:    { borderColor:C.cyan, backgroundColor:'rgba(6,182,212,0.08)' },
  tBtnTxt:     { fontSize:10, fontFamily:F.mono, color:C.textMuted },
  modInputWrap:{ flexDirection:'row', alignItems:'center', gap:5 },
  modLabel:    { fontSize:11, color:C.textMuted },
  modInput:    { width:52, textAlign:'center', fontFamily:F.mono, fontSize:16, fontWeight:'700', borderWidth:1, borderColor:C.borderMid, borderRadius:6, color:C.lime, padding:4, backgroundColor:'transparent' },
  exprSmall:   { textAlign:'right', fontFamily:F.mono, fontSize:12, color:C.textMuted, marginBottom:4 },
  bigNum:      { textAlign:'right', fontFamily:F.mono, fontSize:52, fontWeight:'700', color:C.cyan, lineHeight:60 },
  errorTxt:    { textAlign:'right', fontFamily:F.mono, fontSize:12, color:C.rose, lineHeight:18, marginTop:4 },
  memRow:      { flexDirection:'row', justifyContent:'space-between', marginTop:6 },
  memTxt:      { fontSize:10, fontFamily:F.mono, color:C.lime },
  grid:        { marginHorizontal:10, gap:6 },
  btnRow:      { flexDirection:'row', gap:6 },
  btn:         { flex:1, paddingVertical:16, borderRadius:11, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'rgba(255,255,255,0.06)', borderBottomWidth:3, borderBottomColor:'rgba(0,0,0,0.35)' },
  btnSpan:     { flex:4 },
  btnEq:       { shadowColor:C.purple, shadowOpacity:0.4, shadowRadius:10 },
  btnTxt:      { fontSize:15, fontWeight:'600' },
  btnTxtEq:    { fontSize:20, letterSpacing:1 },
  histToggle:  { margin:10, padding:12, borderRadius:10, borderWidth:1, borderColor:C.border, backgroundColor:C.bgCard, alignItems:'center' },
  histToggleTxt:{fontSize:12, color:C.textSecondary, fontWeight:'600'},
  histPanel:   { marginHorizontal:10, borderRadius:12, overflow:'hidden', borderWidth:1, borderColor:C.border },
  histHeader:  { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:12, backgroundColor:C.bgPanel, borderBottomWidth:1, borderColor:C.border },
  histTitle:   { fontSize:12, fontWeight:'700', color:C.textPrimary },
  histEmpty:   { padding:20, textAlign:'center', fontSize:12, color:C.textMuted, backgroundColor:C.bgPanel },
  histItem:    { padding:12, borderBottomWidth:1, borderColor:C.border, backgroundColor:C.bgPanel },
  histExpr:    { fontFamily:F.mono, fontSize:11, color:C.textMuted, marginBottom:4 },
  histBottom:  { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  histResult:  { fontFamily:F.mono, fontSize:18, fontWeight:'700', color:C.cyan },
  histMod:     { fontFamily:F.mono, fontSize:9, color:C.lime, textAlign:'right' },
  histTs:      { fontSize:9, color:C.textMuted, textAlign:'right' },
  refGrid:     { flexDirection:'row', flexWrap:'wrap', margin:10, gap:8 },
  refCard:     { width:'47%', backgroundColor:C.bgCard, borderRadius:9, borderWidth:1, borderColor:C.border, padding:10 },
  refFn:       { fontFamily:F.mono, fontSize:12, color:C.purple, marginBottom:2 },
  refDesc:     { fontSize:10, color:C.textMuted },
});
