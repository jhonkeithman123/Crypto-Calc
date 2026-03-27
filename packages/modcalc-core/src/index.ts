// @crypto/modcalc-core — shared modular arithmetic engine
// T=0 means "free" mode: plain integer arithmetic, no auto-modulus.
// T>0 means modular mode: all ops reduced mod T automatically.

// ─── Core math helpers ────────────────────────────────────────────────
export function gcd(a: number, b: number): number {
  a = Math.abs(Math.floor(a));
  b = Math.abs(Math.floor(b));
  return b === 0 ? a : gcd(b, a % b);
}

export function modInv(a: number, m: number): number | null {
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

export function modPow(base: number, exp: number, mod: number): number {
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

export function timeAgo(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60000) return 'just now';
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

// ─── Tokeniser ────────────────────────────────────────────────────────
type TT = 'num' | 'op' | 'fn' | 'lp' | 'rp' | 'comma';
interface Tok { t: TT; v: string }

function tokenize(raw: string): Tok[] {
  const s = raw
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−\u2212]/g, '-')
    .trim();
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ') { i++; continue; }
    if (/\d/.test(c)) {
      let n = '';
      while (i < s.length && /\d/.test(s[i])) n += s[i++];
      out.push({ t: 'num', v: n });
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      let w = '';
      while (i < s.length && /[a-zA-Z]/.test(s[i])) w += s[i++];
      out.push(w === 'mod' ? { t: 'op', v: 'mod' } : { t: 'fn', v: w.toLowerCase() });
      continue;
    }
    if (c === '(') { out.push({ t: 'lp', v: '(' }); i++; continue; }
    if (c === ')') { out.push({ t: 'rp', v: ')' }); i++; continue; }
    if (c === ',') { out.push({ t: 'comma', v: ',' }); i++; continue; }
    if ('+-*/^'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
    i++;
  }
  return out;
}

// ─── Parser ───────────────────────────────────────────────────────────
// Operator precedence (high→low): unary − | ^ | * / | mod | + −
// The explicit `mod` keyword is always a remainder operation and
// is NOT affected by T — it uses the operand value directly.
// Only the final result (and intermediate +/−/×/÷) is reduced mod T
// when T > 0.
class Parser {
  private pos = 0;
  constructor(private readonly toks: Tok[], private readonly T: number) {}

  private free(): boolean { return this.T === 0; }
  private applyT(v: number): number {
    return this.free() ? Math.trunc(v) : ((Math.floor(v) % this.T) + this.T) % this.T;
  }
  private pk(): Tok | null { return this.toks[this.pos] ?? null; }
  private nx(): Tok {
    const t = this.toks[this.pos++];
    if (!t) throw new Error('Unexpected end of expression');
    return t;
  }
  private ex(t: TT, v?: string): Tok {
    const tok = this.nx();
    if (tok.t !== t || (v && tok.v !== v)) throw new Error(`Expected '${v ?? t}', got '${tok.v}'`);
    return tok;
  }

  parse(): number {
    if (!this.toks.length) throw new Error('Empty expression');
    const v = this.addSub();
    if (this.pos < this.toks.length) throw new Error(`Unexpected '${this.toks[this.pos].v}'`);
    return this.applyT(v);
  }

  private addSub(): number {
    let l = this.mulDiv();
    while (this.pk()?.t === 'op' && (this.pk()!.v === '+' || this.pk()!.v === '-')) {
      const op = this.nx().v;
      const r = this.mulDiv();
      l = this.free()
        ? (op === '+' ? l + r : l - r)
        : this.applyT(op === '+' ? l + r : l - r);
    }
    return l;
  }

  private mulDiv(): number {
    let l = this.modOp();
    while (this.pk()?.t === 'op' && (this.pk()!.v === '*' || this.pk()!.v === '/')) {
      const op = this.nx().v;
      const r = this.modOp();
      if (this.free()) {
        if (op === '*') { l = l * r; }
        else { if (r === 0) throw new Error('Division by zero'); l = Math.trunc(l / r); }
      } else {
        if (op === '*') { l = this.applyT(l * r); }
        else {
          const inv = modInv(r, this.T);
          if (inv === null) throw new Error(`${r}⁻¹ mod ${this.T} undefined (gcd=${gcd(r, this.T)})`);
          l = this.applyT(l * inv);
        }
      }
    }
    return l;
  }

  // The `mod` keyword is ALWAYS a plain remainder, regardless of T
  private modOp(): number {
    let l = this.pow();
    while (this.pk()?.t === 'op' && this.pk()!.v === 'mod') {
      this.nx();
      const r = this.pow();
      if (r === 0) throw new Error('mod 0 is undefined');
      l = ((Math.floor(l) % r) + r) % r;
    }
    return l;
  }

  private pow(): number {
    const b = this.unary();
    if (this.pk()?.t === 'op' && this.pk()!.v === '^') {
      this.nx();
      const exp = this.pow(); // right-associative
      return this.free()
        ? Math.trunc(Math.pow(b, exp))
        : modPow(b, exp, this.T);
    }
    return b;
  }

  private unary(): number {
    if (this.pk()?.t === 'op' && this.pk()!.v === '-') {
      this.nx();
      const v = this.primary();
      return this.free() ? -v : this.applyT(-v);
    }
    return this.primary();
  }

  private primary(): number {
    const t = this.pk();
    if (!t) throw new Error('Expected a value');
    if (t.t === 'num') { this.nx(); return parseInt(t.v, 10); }
    if (t.t === 'lp') { this.nx(); const v = this.addSub(); this.ex('rp'); return v; }
    if (t.t === 'fn') {
      this.nx(); this.ex('lp');
      if (t.v === 'inv') {
        const a = this.addSub(); this.ex('rp');
        if (this.free()) throw new Error('inv() requires a modulus — select a T value');
        const inv = modInv(a, this.T);
        if (inv === null) throw new Error(`inv(${a}) is undefined mod ${this.T} (gcd=${gcd(a, this.T)})`);
        return inv;
      }
      if (t.v === 'gcd') {
        const a = this.addSub(); this.ex('comma'); const b = this.addSub(); this.ex('rp');
        return gcd(a, b);
      }
      throw new Error(`Unknown function '${t.v}'`);
    }
    throw new Error(`Unexpected token '${t.v}'`);
  }
}

// ─── Public evaluate API ──────────────────────────────────────────────
export type EvalResult = { result: number } | { error: string };

export function evaluate(expr: string, T: number): EvalResult {
  try {
    return { result: new Parser(tokenize(expr), T).parse() };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
