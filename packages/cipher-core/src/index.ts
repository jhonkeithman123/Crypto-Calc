import type { BaseInput, CipherContract, CipherResult } from "./types";

/* ─── Alphabet cipher types (exported so any consumer can import from @crypto/cipher-core) ── */
export type SingleKeyOp = "add" | "sub" | "mul" | "div";
export type DualKeyOp   = "scale_sum" | "affine" | "scale_product";
export type CipherOp    = SingleKeyOp | DualKeyOp;
export type CaseMode    = "sensitive" | "lower" | "upper";

export interface ComputeStep {
  inLabel:  string;
  idx:      number;
  effKey:   number;
  opSym:    string;
  t:        number;
  premod:   number;
  ni:       number;
  outLabel: string;
  pass:     boolean;
  warn?:    string;
}

export interface AlphabetCipherOptions {
  alphabet:  string[];
  op:        CipherOp;
  keyX:      number;
  keyY?:     number;
  caseMode?: CaseMode;
}

export interface AlphabetCipherResult {
  ciphertext: string;
  logs:       string[];
  steps:      ComputeStep[];
}

/* ─── Preset cipher (named bases) ───────────────────────────────── */

const BASE_MAP: Record<string, number> = {
  alpha: 26,
  ascii: 128,
  unicode: 65536,
};

function resolveBase(base: BaseInput): number {
  if (typeof base === "number") return base;
  return BASE_MAP[base] ?? 26;
}

function validateKey(key: number | string, base: BaseInput): boolean {
  if (typeof key === "number") return Number.isFinite(key);
  return key.length > 0;
}

function keyToNumeric(key: number | string, baseNum: number): number {
  if (typeof key === "number") {
    const v = Math.floor(key);
    return ((v % baseNum) + baseNum) % baseNum;
  }
  let sum = 0;
  for (const ch of key) {
    const cp = ch.codePointAt(0);
    if (typeof cp === "number" && Number.isFinite(cp)) {
      sum = (sum + cp) % baseNum;
    }
  }
  return sum;
}

function shiftAlphaChar(ch: string, shift: number): string {
  const code = ch.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(((((code - 65 + shift) % 26) + 26) % 26) + 65);
  }
  if (code >= 97 && code <= 122) {
    return String.fromCharCode(((((code - 97 + shift) % 26) + 26) % 26) + 97);
  }
  return ch;
}

function shiftAsciiChar(ch: string, shift: number): string {
  const code = ch.charCodeAt(0);
  if (code >= 0 && code < 128) {
    return String.fromCharCode((((code + shift) % 128) + 128) % 128);
  }
  return ch;
}

function shiftUnicodeChar(ch: string, shift: number): string {
  const cp = ch.codePointAt(0);
  if (typeof cp !== "number" || !Number.isFinite(cp)) return ch;
  return String.fromCodePoint((((cp + shift) % 65536) + 65536) % 65536);
}

export const cipherCore: CipherContract = {
  async encrypt(
    text: string,
    key: number | string,
    base: BaseInput,
    options: { log?: boolean } = { log: false },
  ): Promise<CipherResult> {
    const logs: string[] = [];
    const baseNum = resolveBase(base);
    logs.push(`resolvedBase:${baseNum}`);
    if (!validateKey(key, base)) {
      logs.push("invalid-key");
      return { ciphertext: text, logs };
    }
    const numericKey = keyToNumeric(key, baseNum);
    logs.push(`numericKey:${numericKey}`);

    let ciphertext = "";
    for (const ch of text) {
      let out = ch;
      if (base === "alpha") out = shiftAlphaChar(ch, numericKey);
      else if (base === "ascii") out = shiftAsciiChar(ch, numericKey);
      else if (base === "unicode") out = shiftUnicodeChar(ch, numericKey);
      else {
        const shift = numericKey % baseNum;
        out = String.fromCodePoint(
          (((ch.codePointAt(0)! + shift) % baseNum) + baseNum) % baseNum,
        );
      }
      if (options?.log) logs.push(`char:${ch}->${out}`);
      ciphertext += out;
    }

    return { ciphertext, logs, meta: { baseNum, numericKey } };
  },

  async decrypt(
    text: string,
    key: number | string,
    base: BaseInput,
    options: { log?: boolean } = { log: false },
  ): Promise<CipherResult> {
    const logs: string[] = [];
    const baseNum = resolveBase(base);
    logs.push(`resolvedBase:${baseNum}`);
    if (!validateKey(key, base)) {
      logs.push("invalid-key");
      return { ciphertext: text, logs };
    }
    const numericKey = keyToNumeric(key, baseNum);
    logs.push(`numericKey:${numericKey}`);

    let plaintext = "";
    for (const ch of text) {
      let out = ch;
      const invShift = (baseNum - (numericKey % baseNum)) % baseNum;
      if (base === "alpha") out = shiftAlphaChar(ch, invShift);
      else if (base === "ascii") out = shiftAsciiChar(ch, invShift);
      else if (base === "unicode") out = shiftUnicodeChar(ch, invShift);
      else {
        out = String.fromCodePoint(
          (((ch.codePointAt(0)! + invShift) % baseNum) + baseNum) % baseNum,
        );
      }
      if (options?.log) logs.push(`char:${ch}->${out}`);
      plaintext += out;
    }

    return { ciphertext: plaintext, logs, meta: { baseNum, numericKey } };
  },

  resolveBase,
  validateKey,
};

export default cipherCore;

/* ═══════════════════════════════════════════════════════════════════
   Alphabet cipher — shared logic for all 7 operations
   Exported for use by any microservice (web, mobile, API, etc.)
═══════════════════════════════════════════════════════════════════ */

/** Greatest common divisor (Euclidean) */
export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Modular multiplicative inverse via extended Euclidean algorithm.
 *  Returns null when gcd(a, m) !== 1 (inverse doesn't exist). */
export function modInv(a: number, m: number): number | null {
  a = ((a % m) + m) % m;
  if (a === 0) return null;
  let [or, r] = [a, m];
  let [os, s] = [1, 0];
  while (r !== 0) {
    const q = Math.floor(or / r);
    [or, r] = [r, or - q * r];
    [os, s] = [s, os - q * s];
  }
  return or === 1 ? ((os % m) + m) % m : null;
}

const disp = (c: string) => c === " " ? "\u23b5" : c;

type ApplyResult = { ni: number; effKey: number; opSym: string; premod: number; warn?: string };

/** Compute one character's cipher output, returning all metadata for Formula View. */
function applyOp(
  idx: number,
  op: CipherOp,
  direction: "encrypt" | "decrypt",
  X: number,
  Y: number,
  T: number,
): ApplyResult {
  const enc = direction === "encrypt";

  switch (op) {
    /* ── Single-key ─────────────────────────────────────────── */
    case "add": {
      const k = enc ? X : ((T - X) % T);
      const pre = idx + k;
      return { effKey: k, opSym: enc ? "+" : "\u2212", premod: pre, ni: ((pre % T) + T) % T };
    }
    case "sub": {
      const pre = enc ? (idx - X + T * 2) : (idx + X);
      return { effKey: X, opSym: enc ? "\u2212" : "+", premod: pre, ni: pre % T };
    }
    case "mul": {
      const k = enc ? X : modInv(X, T);
      if (k === null) return { effKey: X, opSym: "\u00d7", premod: idx * X, ni: (idx * X) % T, warn: `gcd(${X},${T})=${gcd(X, T)} \u2014 no unique decrypt` };
      return { effKey: k, opSym: "\u00d7", premod: idx * k, ni: (idx * k) % T, warn: enc ? undefined : `X\u207b\u00b9=${k} (mod ${T})` };
    }
    case "div": {
      const k = enc ? modInv(X, T) : X;
      if (k === null) return { effKey: X, opSym: "\u00d7", premod: idx * X, ni: (idx * X) % T, warn: `gcd(${X},${T})=${gcd(X, T)} \u2014 X has no inverse mod ${T}` };
      return { effKey: k, opSym: "\u00d7", premod: idx * k, ni: (idx * k) % T, warn: enc ? `X\u207b\u00b9=${k} (mod ${T})` : undefined };
    }

    /* ── Dual-key ───────────────────────────────────────────── */
    case "scale_sum": {
      // Encrypt: N(o) × (X+Y) mod T  |  Decrypt: N(D) × (X+Y)⁻¹ mod T
      const composite = ((X + Y) % T + T) % T;
      const k = enc ? composite : modInv(composite, T);
      if (k === null) return { effKey: composite, opSym: "\u00d7", premod: idx * composite, ni: (idx * composite) % T, warn: `gcd(X+Y=${composite},${T})=${gcd(composite, T)} \u2014 no inverse` };
      return { effKey: k, opSym: "\u00d7", premod: idx * k, ni: (idx * k) % T, warn: enc ? undefined : `(X+Y)\u207b\u00b9=${k} (mod ${T})` };
    }
    case "affine": {
      // Encrypt: N(o)×X + Y mod T  |  Decrypt: (N(D)−Y) × X⁻¹ mod T
      if (enc) {
        const pre = idx * X + Y;
        return { effKey: X, opSym: "\u00d7", premod: pre, ni: ((pre % T) + T) % T };
      } else {
        const inv = modInv(X, T);
        if (inv === null) return { effKey: X, opSym: "\u00d7", premod: -1, ni: 0, warn: `gcd(X=${X},T=${T})=${gcd(X, T)} \u2014 X has no inverse` };
        const shifted = ((idx - Y) % T + T) % T;
        const pre = shifted * inv;
        return { effKey: inv, opSym: "\u00d7", premod: pre, ni: pre % T, warn: `X\u207b\u00b9=${inv} (mod ${T})` };
      }
    }
    case "scale_product": {
      // Encrypt: N(o) × (X×Y) mod T  |  Decrypt: N(D) × (X×Y)⁻¹ mod T
      const composite = ((X * Y) % T + T) % T;
      const k = enc ? composite : modInv(composite, T);
      if (k === null) return { effKey: composite, opSym: "\u00d7", premod: idx * composite, ni: (idx * composite) % T, warn: `gcd(X\u00d7Y=${composite},${T})=${gcd(composite, T)} \u2014 no inverse` };
      return { effKey: k, opSym: "\u00d7", premod: idx * k, ni: (idx * k) % T, warn: enc ? undefined : `(X\u00d7Y)\u207b\u00b9=${k} (mod ${T})` };
    }

    default:
      return { effKey: 0, opSym: "+", premod: idx, ni: idx };
  }
}

/**
 * Run a full alphabet cipher across an input string.
 *
 * @example
 * import { runAlphabetCipher } from "@crypto/cipher-core";
 *
 * // Classic Caesar (add, shift 3, uppercase alpha)
 * runAlphabetCipher("Hello World", "encrypt", {
 *   alphabet: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
 *   op: "add", keyX: 3,
 * });
 *
 * // Affine cipher (X=5, Y=8)
 * runAlphabetCipher("Hello", "encrypt", {
 *   alphabet: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
 *   op: "affine", keyX: 5, keyY: 8,
 * });
 */
export function runAlphabetCipher(
  text: string,
  direction: "encrypt" | "decrypt",
  opts: AlphabetCipherOptions,
): AlphabetCipherResult {
  const { alphabet, op, keyX, keyY = 0, caseMode = "sensitive" } = opts;
  const T = alphabet.length;
  if (T === 0) return { ciphertext: text, logs: ["error: empty alphabet"], steps: [] };

  const X = ((keyX % T) + T) % T;
  const Y = ((keyY % T) + T) % T;

  const norm = (c: string): string =>
    caseMode === "lower" ? c.toLowerCase() :
    caseMode === "upper" ? c.toUpperCase() : c;

  const logs: string[] = [`base:${T}`, `op:${op}`, `X:${X}`, `Y:${Y}`, `case:${caseMode}`];
  const steps: ComputeStep[] = [];
  let ciphertext = "";

  for (const ch of text) {
    const nc = norm(ch);
    const idx = alphabet.findIndex((a: string) => norm(a) === nc);

    if (idx === -1) {
      ciphertext += ch;
      logs.push(`${disp(ch)}\u2192(pass)`);
      steps.push({ inLabel: disp(ch), idx: -1, effKey: X, opSym: "+", t: T, premod: -1, ni: -1, outLabel: disp(ch), pass: true });
      continue;
    }

    const res = applyOp(idx, op, direction, X, Y, T);
    const out = alphabet[res.ni] ?? ch;
    ciphertext += out;
    logs.push(`${disp(ch)}[${idx}]\u2192${disp(out)}[${res.ni}]`);
    steps.push({
      inLabel: disp(ch), idx,
      effKey: res.effKey, opSym: res.opSym,
      t: T, premod: res.premod, ni: res.ni,
      outLabel: disp(out), pass: false,
      warn: res.warn,
    });
  }

  return { ciphertext, logs, steps };
}
