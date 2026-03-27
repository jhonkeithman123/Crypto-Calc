export type BaseInput = number | "alpha" | "ascii" | "unicode";

export interface CipherResult {
  ciphertext: string;
  logs: string[];
  meta?: Record<string, any>;
}

export interface CipherContract {
  encrypt(
    text: string,
    key: number | string,
    base: BaseInput,
    options?: { log?: boolean },
  ): Promise<CipherResult>;

  decrypt(
    text: string,
    key: number | string,
    base: BaseInput,
    options?: { log?: boolean },
  ): Promise<CipherResult>;

  resolveBase(base: BaseInput): number;
  validateKey(key: number | string, base: BaseInput): boolean;
}

/* ─── Alphabet-cipher types ──────────────────────────────────────── */

/** Single-key cipher operations (modular arithmetic on one key X) */
export type SingleKeyOp = "add" | "sub" | "mul" | "div";

/**
 * Dual-key cipher operations:
 *  scale_sum    – N(D) = N(o) × (X+Y)     mod T
 *  affine       – N(D) = N(o) × X + Y     mod T  (classic Affine cipher)
 *  scale_product– N(D) = N(o) × (X×Y)     mod T
 */
export type DualKeyOp = "scale_sum" | "affine" | "scale_product";

export type CipherOp = SingleKeyOp | DualKeyOp;

export type CaseMode = "sensitive" | "lower" | "upper";

/** One character's worth of computation, used to power the Formula View */
export interface ComputeStep {
  inLabel: string;
  idx: number;       // position in alphabet (-1 = pass-through)
  effKey: number;    // actual scalar used (e.g. X, X⁻¹, X+Y, X×Y …)
  opSym: string;     // "+" | "−" | "×"
  t: number;         // base (T)
  premod: number;    // result before mod
  ni: number;        // premod mod t  (-1 = pass-through)
  outLabel: string;
  pass: boolean;
  warn?: string;     // set when inverse doesn't exist
}

export interface AlphabetCipherOptions {
  /** Ordered character set defining the cipher alphabet */
  alphabet: string[];
  /** Which cipher operation to apply */
  op: CipherOp;
  /** Primary key X */
  keyX: number;
  /** Secondary key Y (required for dual-key operations) */
  keyY?: number;
  /** Case normalisation before alphabet lookup */
  caseMode?: CaseMode;
}

export interface AlphabetCipherResult {
  ciphertext: string;
  logs: string[];
  steps: ComputeStep[];
}

