import React, { useState, useMemo, useCallback } from 'react';
import { C, F } from '../theme';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { runAlphabetCipher } from '@crypto/cipher-core';
import type { CipherOp, CaseMode } from '@crypto/cipher-core';
import { gcd, modInv } from '../math';

// ─── Data ────────────────────────────────────────────────────────────
const UPPER  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const LOWER  = 'abcdefghijklmnopqrstuvwxyz'.split('');
const DIGITS = '0123456789'.split('');
const EXTRA_PRE = [',','.',  '?', '!', ':', ';'];
const SAMPLES = ['Hello World', 'The Quick Brown Fox', 'Caesar Cipher 101'];

type BaseMode = 'alpha27'|'alpha26'|'custom';
type CharGroup = { space: boolean; upper: boolean; lower: boolean; digits: boolean };

const OPS: {id:CipherOp;label:string;dual:boolean;enc:string;dec:string}[] = [
  {id:'add',           label:'+ Add',      dual:false, enc:'N(D)=N(o)+X mod T',     dec:'N(o)=N(D)−X mod T'},
  {id:'sub',           label:'− Sub',      dual:false, enc:'N(D)=N(o)−X mod T',     dec:'N(o)=N(D)+X mod T'},
  {id:'mul',           label:'× Mul',      dual:false, enc:'N(D)=N(o)×X mod T',     dec:'N(o)=N(D)×X⁻¹ mod T'},
  {id:'div',           label:'÷ Div',      dual:false, enc:'N(D)=N(o)×X⁻¹ mod T',  dec:'N(o)=N(D)×X mod T'},
  {id:'scale_sum',     label:'Scale X+Y',  dual:true,  enc:'N(D)=N(o)×(X+Y) mod T', dec:'N(o)=N(D)×(X+Y)⁻¹ mod T'},
  {id:'affine',        label:'Affine ×X+Y',dual:true,  enc:'N(D)=N(o)×X+Y mod T',   dec:'N(o)=(N(D)−Y)×X⁻¹ mod T'},
  {id:'scale_product', label:'Scale X·Y',  dual:true,  enc:'N(D)=N(o)×(X·Y) mod T', dec:'N(o)=N(D)×(X·Y)⁻¹ mod T'},
];

// ─── Helpers ─────────────────────────────────────────────────────────
function buildAlphabet(groups: CharGroup, extra: string, activeExtra: Set<string>, baseMode: BaseMode): string[] {
  if (baseMode === 'alpha27') return [' ', ...UPPER];
  if (baseMode === 'alpha26') return [...UPPER];
  const chars: string[] = [];
  if (groups.space)  chars.push(' ');
  if (groups.upper)  chars.push(...UPPER);
  if (groups.lower)  chars.push(...LOWER);
  if (groups.digits) chars.push(...DIGITS);
  const seen = new Set(chars);
  for (const ch of [...activeExtra, ...extra.split('').filter(Boolean)]) {
    if (!seen.has(ch)) { chars.push(ch); seen.add(ch); }
  }
  return chars;
}

function disp(c: string) { return c === ' ' ? '␣' : c; }

function compLine(step: {idx:number;effKey:number;opSym:string;premod:number;ni:number;pass:boolean}, op: CipherOp, dir: 'encrypt'|'decrypt', T: number, X: number, Y: number): string {
  if (step.pass) return '—';
  if (op === 'affine' && dir === 'decrypt') {
    const inv = modInv(X, T);
    return inv === null ? `(${step.idx}−${Y})×∄` : `(${step.idx}−${Y})×${inv}=${step.premod < 0 ? '?' : step.premod} mod ${T}=${step.ni}`;
  }
  return `${step.idx} ${step.opSym} ${step.effKey} = ${step.premod} mod ${T} = ${step.ni}`;
}

// ─── Component ───────────────────────────────────────────────────────
export default function CipherScreen() {
  const [inputText, setInputText]   = useState('Hello World');
  const [op, setOp]                 = useState<CipherOp>('scale_sum');
  const [keyX, setKeyX]             = useState(13);
  const [keyY, setKeyY]             = useState(6);
  const [groups, setGroups]         = useState<CharGroup>({space:true,upper:true,lower:false,digits:false});
  const [extraRaw, setExtraRaw]     = useState('');
  const [activePre, setActivePre]   = useState<Set<string>>(new Set());
  const [caseMode, setCaseMode]     = useState<CaseMode>('lower');
  const [baseMode, setBaseMode]     = useState<BaseMode>('alpha27');
  const [customBase, setCustomBase] = useState('29');
  const [result, setResult]         = useState<null|{ciphertext:string;steps:any[];logs:string[];dir:'encrypt'|'decrypt'}>(null);
  const [showSteps, setShowSteps]   = useState(true);

  const alphabet   = useMemo(() => buildAlphabet(groups, extraRaw, activePre, baseMode), [groups, extraRaw, activePre, baseMode]);
  const T          = baseMode === 'custom' ? Math.max(2, parseInt(customBase)||29) : alphabet.length;
  const X          = ((keyX % T) + T) % T;
  const Y          = ((keyY % T) + T) % T;
  const opInfo     = OPS.find(o => o.id === op)!;
  const isDual     = opInfo.dual;
  const gcdWarn    = useMemo(() => {
    if (op === 'add' || op === 'sub') return null;
    let c = X;
    if (op === 'scale_sum') c = ((X+Y)%T+T)%T;
    if (op === 'scale_product') c = ((X*Y)%T+T)%T;
    const g = gcd(c, T);
    return g !== 1 ? `gcd=${g} — no unique decrypt` : null;
  }, [op, X, Y, T]);

  const run = useCallback((dir: 'encrypt'|'decrypt') => {
    const res = runAlphabetCipher(inputText, dir, { alphabet, op, keyX: X, keyY: Y, caseMode });
    setResult({ ...res, dir });
  }, [inputText, alphabet, op, X, Y, caseMode]);

  const togglePre = (ch: string) => setActivePre(p => { const n=new Set(p); n.has(ch)?n.delete(ch):n.add(ch); return n; });
  const toggleGroup = (k: keyof CharGroup) => setGroups(p => ({...p,[k]:!p[k]}));

  return (
    <SafeAreaView style={s.root}>
      <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Input */}
        <View style={s.card}>
          <Text style={s.label}>PLAINTEXT / INPUT</Text>
          <TextInput
            style={s.textArea}
            value={inputText}
            onChangeText={setInputText}
            multiline
            placeholder="Enter text…"
            placeholderTextColor={C.textMuted}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:6}}>
            {SAMPLES.map(t => (
              <TouchableOpacity key={t} style={s.sampleBtn} onPress={() => { setInputText(t); setResult(null); }}>
                <Text style={s.sampleTxt}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Character groups */}
        <View style={s.card}>
          <Text style={s.label}>CHARACTER GROUPS</Text>
          <View style={s.row}>
            {([['space','␣ Space'],['upper','A–Z'],['lower','a–z'],['digits','0–9']] as [keyof CharGroup,string][]).map(([k,l]) => {
              const on = baseMode==='alpha27'?(k==='space'||k==='upper'):baseMode==='alpha26'?k==='upper':groups[k];
              return (
                <TouchableOpacity key={k} style={[s.chip, on&&s.chipActive]} onPress={() => { if(baseMode==='custom') toggleGroup(k); }}>
                  <Text style={[s.chipTxt, on&&s.chipTxtActive]}>{on?'✓ ':''}{l}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Case mode */}
          <Text style={[s.label,{marginTop:10}]}>CASE HANDLING</Text>
          <View style={s.row}>
            {(['sensitive','lower','upper'] as CaseMode[]).map(cm => (
              <TouchableOpacity key={cm} style={[s.chip,caseMode===cm&&s.chipActive]} onPress={() => setCaseMode(cm)}>
                <Text style={[s.chipTxt,caseMode===cm&&s.chipTxtActive]}>{cm==='sensitive'?'Sensitive':cm==='lower'?'Lowercase':'UPPERCASE'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Extra chars */}
        <View style={s.card}>
          <Text style={s.label}>EXTRA CHARACTERS</Text>
          <View style={s.row}>
            {EXTRA_PRE.map(ch => (
              <TouchableOpacity key={ch} style={[s.chip,activePre.has(ch)&&s.chipActive]} onPress={() => togglePre(ch)}>
                <Text style={[s.chipTxt,activePre.has(ch)&&s.chipTxtActive]}>{ch}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={[s.input,{marginTop:7}]} value={extraRaw} onChangeText={setExtraRaw} placeholder=", . ? ! extra symbols" placeholderTextColor={C.textMuted} />
        </View>

        {/* Base */}
        <View style={s.card}>
          <Text style={s.label}>BASE</Text>
          <View style={s.row}>
            {([['alpha27','BASE 27'],['alpha26','BASE 26'],['custom','CUSTOM']] as [BaseMode,string][]).map(([b,l]) => (
              <TouchableOpacity key={b} style={[s.chip,baseMode===b&&s.chipLime]} onPress={() => setBaseMode(b)}>
                <Text style={[s.chipTxt,baseMode===b&&{color:C.lime}]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {baseMode==='custom' && (
            <View style={[s.row,{marginTop:7}]}>
              <Text style={s.sub}>T =</Text>
              <TextInput style={[s.input,{width:60,textAlign:'center',marginLeft:8}]} keyboardType="number-pad" value={customBase} onChangeText={setCustomBase} />
            </View>
          )}
          <View style={[s.row,{marginTop:8}]}>
            <View style={s.baseBadge}><Text style={s.baseBadgeTxt}>BASE {T}</Text></View>
            {gcdWarn ? <Text style={s.warnTxt}> ⚠ {gcdWarn}</Text> : null}
          </View>
        </View>

        {/* Operation */}
        <View style={s.card}>
          <Text style={s.label}>1 KEY OPERATIONS</Text>
          <View style={s.opGrid}>
            {OPS.filter(o=>!o.dual).map(o => (
              <TouchableOpacity key={o.id} style={[s.opBtn,op===o.id&&s.opBtnActive]} onPress={() => setOp(o.id)}>
                <Text style={[s.opLabel,op===o.id&&s.opLabelActive]}>{o.label}</Text>
                <Text style={s.opFmt}>{o.enc.slice(0,20)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[s.label,{marginTop:10}]}>2 KEY OPERATIONS</Text>
          <View style={s.opGrid}>
            {OPS.filter(o=>o.dual).map(o => (
              <TouchableOpacity key={o.id} style={[s.opBtn,op===o.id&&s.opBtnActive]} onPress={() => setOp(o.id)}>
                <Text style={[s.opLabel,op===o.id&&s.opLabelActive]}>{o.label}</Text>
                <Text style={s.opFmt}>{o.enc.slice(0,20)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Keys */}
        <View style={s.card}>
          <Text style={s.label}>KEY X  <Text style={s.sub}>(0–{T-1})</Text></Text>
          <View style={s.keyRow}>
            <View style={s.keyDisplay}><Text style={s.keyNum}>{X}</Text></View>
            <View style={s.keyBtns}>
              {[-5,-1,1,5].map(d => (
                <TouchableOpacity key={d} style={s.nudge} onPress={() => setKeyX(k => ((k+d+T)%T+T)%T)}>
                  <Text style={s.nudgeTxt}>{d>0?`+${d}`:d}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[s.input,{width:54,textAlign:'center'}]} keyboardType="number-pad" value={String(keyX)} onChangeText={v => setKeyX(Math.max(0,Math.min(T-1,parseInt(v)||0)))} />
          </View>
          {isDual && <>
            <Text style={[s.label,{marginTop:10}]}>KEY Y  <Text style={s.sub}>(0–{T-1})</Text></Text>
            <View style={s.keyRow}>
              <View style={s.keyDisplay}><Text style={s.keyNum}>{Y}</Text></View>
              <View style={s.keyBtns}>
                {[-5,-1,1,5].map(d => (
                  <TouchableOpacity key={d} style={s.nudge} onPress={() => setKeyY(k => ((k+d+T)%T+T)%T)}>
                    <Text style={s.nudgeTxt}>{d>0?`+${d}`:d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={[s.input,{width:54,textAlign:'center'}]} keyboardType="number-pad" value={String(keyY)} onChangeText={v => setKeyY(Math.max(0,Math.min(T-1,parseInt(v)||0)))} />
            </View>
          </>}
        </View>

        {/* Alphabet map */}
        <View style={s.card}>
          <Text style={s.label}>ALPHABET MAP — {T} chars</Text>
          <View style={s.alphaGrid}>
            {alphabet.slice(0,54).map((ch,i) => (
              <View key={i} style={s.alphaCell}>
                <Text style={s.alphaChar}>{disp(ch)}</Text>
                <Text style={s.alphaIdx}>{i}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Action buttons */}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.encBtn} onPress={() => run('encrypt')}>
            <Text style={s.encBtnTxt}>🔒 Encrypt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.decBtn} onPress={() => run('decrypt')}>
            <Text style={s.decBtnTxt}>🔓 Decrypt</Text>
          </TouchableOpacity>
        </View>

        {/* Result */}
        {result && (
          <View style={s.resultCard}>
            {/* badges */}
            <View style={s.row}>
              <View style={[s.badge, result.dir==='encrypt'?s.badgePurple:s.badgeCyan]}>
                <Text style={s.badgeTxt}>{result.dir==='encrypt'?'🔒 ENCRYPTED':'🔓 DECRYPTED'}</Text>
              </View>
              <View style={s.badgeLime}><Text style={s.badgeLimeTxt}>BASE {T} · {opInfo.label}</Text></View>
            </View>
            {/* ciphertext */}
            <Text style={s.cipherTxt}>{result.ciphertext}</Text>
            {/* formula summary */}
            <View style={{
              backgroundColor:C.bgInput, padding:8, borderRadius:7,
              borderWidth:1, borderColor:C.border, marginBottom:2,
            }}>
              <Text style={{fontFamily:F.mono,fontSize:11,color:C.purple,marginBottom:2}}>
                {result.dir==='encrypt' ? opInfo.enc : opInfo.dec}
              </Text>
              <Text style={{fontFamily:F.mono,fontSize:11,color:C.textSecondary}}>
                <Text style={{color:C.cyan}}>X={X}</Text>
                {isDual ? <Text style={{color:C.lime}}> · Y={Y}</Text> : null}
                <Text style={{color:C.amber}}> · T={T}</Text>
              </Text>
            </View>
            {/* action row */}
            <View style={[s.row,{marginTop:8,gap:8}]}>
              <TouchableOpacity style={s.ghostBtn} onPress={() => Alert.alert('Copied', result.ciphertext.slice(0,80))}>
                <Text style={s.ghostBtnTxt}>📋 Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.ghostBtn} onPress={() => setShowSteps(v=>!v)}>
                <Text style={s.ghostBtnTxt}>∑ Steps {showSteps?'▲':'▼'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.ghostBtn} onPress={() => { setInputText(result.ciphertext); setResult(null); }}>
                <Text style={s.ghostBtnTxt}>↩ Use as input</Text>
              </TouchableOpacity>
            </View>
            {/* step table */}
            {showSteps && (
              <View style={{marginTop:10}}>
                <View style={s.tableHeader}>
                  <Text style={[s.thCell,{flex:0.8}]}>CHAR</Text>
                  <Text style={[s.thCell,{flex:0.8}]}>N(i)</Text>
                  <Text style={[s.thCell,{flex:3}]}>COMPUTATION</Text>
                  <Text style={[s.thCell,{flex:0.8,textAlign:'right'}]}>OUT</Text>
                </View>
                {result.steps.map((step:any,i:number) => (
                  <View key={i} style={[s.tableRow,i%2===0&&{backgroundColor:'rgba(139,92,246,0.04)'}]}>
                    <Text style={[s.tdChar,{flex:0.8}]}>{step.inLabel}</Text>
                    <Text style={[s.tdIdx,{flex:0.8}]}>{step.pass?'—':step.idx}</Text>
                    <Text style={[s.tdComp,{flex:3}]} numberOfLines={2}>{compLine(step,op,result.dir,T,X,Y)}</Text>
                    <Text style={[s.tdOut,{flex:0.8}]}>{step.outLabel}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{height:30}} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:       { flex:1, backgroundColor:C.bgBase },
  scroll:     { flex:1 },
  card:       { margin:10, marginBottom:0, backgroundColor:C.bgPanel, borderRadius:12, padding:14, borderWidth:1, borderColor:C.border },
  resultCard: { margin:10, marginBottom:0, backgroundColor:C.bgPanel, borderRadius:12, padding:14, borderWidth:1, borderColor:'rgba(139,92,246,0.35)' },
  label:      { fontSize:9, fontWeight:'700', letterSpacing:1, color:C.textMuted, marginBottom:7, textTransform:'uppercase' },
  sub:        { fontSize:10, color:C.textMuted, fontWeight:'400' },
  textArea:   { backgroundColor:C.bgInput, color:C.textPrimary, borderRadius:8, padding:10, minHeight:72, fontSize:14, fontFamily:F.mono, borderWidth:1, borderColor:C.border },
  input:      { backgroundColor:C.bgInput, color:C.textPrimary, borderRadius:7, padding:8, fontSize:13, fontFamily:F.mono, borderWidth:1, borderColor:C.border },
  row:        { flexDirection:'row', flexWrap:'wrap', gap:6, alignItems:'center' },
  chip:       { paddingHorizontal:10, paddingVertical:5, borderRadius:99, borderWidth:1, borderColor:C.border, backgroundColor:C.bgCard },
  chipActive: { borderColor:C.purple, backgroundColor:'rgba(139,92,246,0.15)' },
  chipLime:   { borderColor:C.lime,   backgroundColor:'rgba(163,230,53,0.1)' },
  chipTxt:    { fontSize:11, fontWeight:'600', color:C.textMuted },
  chipTxtActive: { color:C.purple },
  sampleBtn:  { paddingHorizontal:10, paddingVertical:4, borderRadius:6, borderWidth:1, borderColor:C.border, backgroundColor:C.bgCard, marginRight:6 },
  sampleTxt:  { fontSize:10, color:C.textMuted },
  baseBadge:  { paddingHorizontal:10, paddingVertical:3, borderRadius:99, backgroundColor:'rgba(163,230,53,0.1)', borderWidth:1, borderColor:'rgba(163,230,53,0.35)' },
  baseBadgeTxt:{ fontSize:11, fontWeight:'700', color:C.lime, fontFamily:F.mono },
  warnTxt:    { fontSize:10, color:C.amber, flex:1 },
  opGrid:     { flexDirection:'row', flexWrap:'wrap', gap:6 },
  opBtn:      { width:'48%', padding:9, borderRadius:9, borderWidth:1, borderColor:C.border, backgroundColor:C.bgCard },
  opBtnActive:{ borderColor:C.purple, backgroundColor:'rgba(139,92,246,0.18)' },
  opLabel:    { fontSize:12, fontWeight:'600', color:C.textMuted },
  opLabelActive:{ color:C.textPrimary },
  opFmt:      { fontSize:9, fontFamily:F.mono, color:C.textMuted, marginTop:2 },
  keyRow:     { flexDirection:'row', alignItems:'center', gap:10 },
  keyDisplay: { backgroundColor:C.bgInput, borderRadius:9, borderWidth:1, borderColor:C.purple, paddingHorizontal:18, paddingVertical:12, minWidth:60, alignItems:'center' },
  keyNum:     { fontSize:24, fontWeight:'700', fontFamily:F.mono, color:C.textPrimary },
  keyBtns:    { flexDirection:'row', gap:4, flex:1 },
  nudge:      { flex:1, paddingVertical:8, backgroundColor:C.bgCard, borderRadius:6, borderWidth:1, borderColor:C.border, alignItems:'center' },
  nudgeTxt:   { fontSize:11, fontFamily:F.mono, color:C.textSecondary },
  alphaGrid:  { flexDirection:'row', flexWrap:'wrap', gap:3, marginTop:4 },
  alphaCell:  { width:34, height:36, backgroundColor:C.bgCard, borderRadius:5, borderWidth:1, borderColor:C.border, alignItems:'center', justifyContent:'center' },
  alphaChar:  { fontSize:11, fontWeight:'600', color:C.textPrimary, fontFamily:F.mono },
  alphaIdx:   { fontSize:8,  color:C.textMuted, fontFamily:F.mono },
  actionRow:  { flexDirection:'row', margin:10, gap:8 },
  encBtn:     { flex:1, paddingVertical:14, borderRadius:11, backgroundColor:C.violet, alignItems:'center', shadowColor:C.purple, shadowOpacity:0.5, shadowRadius:12 },
  encBtnTxt:  { fontSize:15, fontWeight:'700', color:'#fff' },
  decBtn:     { flex:1, paddingVertical:14, borderRadius:11, borderWidth:1, borderColor:C.border, backgroundColor:C.bgCard, alignItems:'center' },
  decBtnTxt:  { fontSize:15, fontWeight:'700', color:C.textPrimary },
  badge:      { paddingHorizontal:10, paddingVertical:3, borderRadius:99, borderWidth:1, marginRight:5 },
  badgePurple:{ borderColor:C.purple, backgroundColor:'rgba(139,92,246,0.15)' },
  badgeCyan:  { borderColor:C.cyan, backgroundColor:'rgba(6,182,212,0.1)' },
  badgeTxt:   { fontSize:10, fontWeight:'700' },
  badgeLime:  { paddingHorizontal:8, paddingVertical:3, borderRadius:99, borderWidth:1, borderColor:'rgba(163,230,53,0.3)', backgroundColor:'rgba(163,230,53,0.08)' },
  badgeLimeTxt:{ fontSize:9, fontWeight:'700', color:C.lime },
  cipherTxt:  { fontSize:20, fontWeight:'700', fontFamily:F.mono, color:C.textPrimary, marginTop:10, marginBottom:6 },
  formulaTxt: { fontSize:11, fontFamily:F.mono, color:C.textSecondary, lineHeight:18, backgroundColor:C.bgInput, padding:8, borderRadius:7, borderWidth:1, borderColor:C.border },
  ghostBtn:   { paddingHorizontal:10, paddingVertical:6, borderRadius:6, borderWidth:1, borderColor:C.border, backgroundColor:'transparent' },
  ghostBtnTxt:{ fontSize:11, color:C.textSecondary },
  tableHeader:{ flexDirection:'row', borderBottomWidth:1, borderColor:C.border, paddingBottom:4, marginBottom:2 },
  thCell:     { fontSize:9, fontWeight:'700', letterSpacing:0.8, color:C.textMuted, textTransform:'uppercase' },
  tableRow:   { flexDirection:'row', paddingVertical:5, borderBottomWidth:1, borderColor:'rgba(139,92,246,0.06)' },
  tdChar:     { fontSize:11, fontWeight:'600', fontFamily:F.mono, color:C.textPrimary },
  tdIdx:      { fontSize:11, fontFamily:F.mono, color:C.purple },
  tdComp:     { fontSize:10, fontFamily:F.mono, color:C.textSecondary },
  tdOut:      { fontSize:11, fontWeight:'700', fontFamily:F.mono, color:C.cyan, textAlign:'right' },
});

