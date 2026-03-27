# Multi-Variable Cipher Operations + Package Refactor

Move all cipher math out of `page.tsx` and into the shared packages, then add 2-key operations.

---

## User Review Required

> [!IMPORTANT]
> **Clarification on single-variable inverses**: The current single-variable operations already compute correct mathematical inverses. The user's note `N(o) = N(D) / X mod T` and `N(o) = N(D) - X mod T` match what we have internally — this is just about how the **formula is displayed**, not a logic bug.

> [!IMPORTANT]
> **Naming of 2-key operations**: I propose these names — please confirm:
> | UI Name | Encrypt formula | Decrypt formula |
> |---|---|---|
> | **Scale (X+Y)** | `N(D) = N(o) × (X+Y) mod T` | `N(o) = N(D) × (X+Y)⁻¹ mod T` |
> | **Affine (×X+Y)** | `N(D) = (N(o) × X + Y) mod T` | `N(o) = (N(D) − Y) × X⁻¹ mod T` |
> | **Product (X·Y)** | `N(D) = N(o) × (X·Y) mod T` | `N(o) = N(D) × (X·Y)⁻¹ mod T` |

> [!WARNING]
> All multiplication/division-based operations (single and dual key) require `gcd(key, T) = 1` for decryption to be unique. The UI already shows this warning live.

---

## Proposed Changes

### Package: `cipher-contract`

#### [MODIFY] [types.ts](file:///home/keith/Personal-Projects/Crypto_Calc/packages/cipher-contract/src/types.ts)
- Add `CipherOp` type (single + dual key operations)
- Add `ComputeStep` interface
- Add `AlphabetCipherOptions` and `AlphabetCipherResult` interfaces

```ts
export type SingleKeyOp = "add" | "sub" | "mul" | "div";
export type DualKeyOp   = "scale_sum" | "affine" | "scale_product";
export type CipherOp    = SingleKeyOp | DualKeyOp;

export interface ComputeStep { /* ... */ }
export interface AlphabetCipherOptions { alphabet: string[]; op: CipherOp; keyX: number; keyY?: number; caseMode?: string; }
export interface AlphabetCipherResult  { ciphertext: string; logs: string[]; steps: ComputeStep[]; }
```

---

### Package: `cipher-core`

#### [MODIFY] [index.ts](file:///home/keith/Personal-Projects/Crypto_Calc/packages/cipher-core/src/index.ts)
Extract and export:
1. **Math utilities**: `gcd(a, b)`, `modInv(a, m)`
2. **Single-key alphabet cipher**: `encryptChar`, `decryptChar` per `CipherOp`
3. **Dual-key alphabet cipher**: same pattern for dual ops
4. **Main function**: `runAlphabetCipher(text, direction, opts): AlphabetCipherResult`

---

### App: `apps/web`

#### [MODIFY] [page.tsx](file:///home/keith/Personal-Projects/Crypto_Calc/apps/web/src/app/page.tsx)
- **Remove**: inline `gcd`, `modInv`, `runCustomCipher`, `CipherOp` type, `ComputeStep` interface
- **Import**: all of the above from `@crypto/cipher-core`
- **Add**: `keyY` state (second key, shown only for dual-key ops)
- **Add**: "2-Key Operations" section in the operation selector UI (3 more buttons)
- **Update**: `FormulaPanel` to show 2-key formulas with both X and Y

---

## Verification Plan

### Automated
- `pnpm build` — confirm packages compile cleanly

### Manual
- Test each of the 7 operations (4 single + 3 dual) with Encrypt and Decrypt
- Verify round-trip: encrypt then use "Use result as input" and decrypt gives back original
- Verify the gcd warning fires correctly for mul/div when key and base share a factor

---

## Open Questions

> [!IMPORTANT]
> Is `N(D) = N(o) XY mod T` meant as **N(o) × X × Y** (product of two keys) or **N(o) × (X concatenated with Y as a 2-digit number)**? I'm assuming it's **N(o) × X × Y**.
