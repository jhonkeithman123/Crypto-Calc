# Monorepo Plan: Cryptography Calculator (Mobile + Web)

## 📂 Repository Structure

```
crypto-calculator/
├── apps/
│   ├── mobile/         # React Native app (Expo)
│   └── web/            # Next.js app
├── packages/
│   ├── cipher-contract/ # Types + stable API surface
│   ├── cipher-core/     # Pure implementation (encrypt/decrypt)
│   ├── cipher-cli/      # Optional CLI for quick testing
│   └── ui-components/   # Optional shared UI atoms
├── examples/            # Example keys, sample inputs
├── package.json         # Root scripts + workspace config
├── turbo.json           # (or pnpm-workspace.yaml)
├── tsconfig.base.json
└── README.md
```

---

## ⚙️ Tech Stack

- **Monorepo Tooling**: Turborepo (recommended) or pnpm workspaces + Turborepo.
- **Mobile App**: React Native (Expo).
- **Web App**: Next.js (TypeScript).
- **Language**: TypeScript for all shared logic and contracts.

---

## Packages Overview

- `packages/cipher-contract`: package that defines stable types and the public API surface used by apps and other packages.
- `packages/cipher-core`: pure implementation of ciphers, deterministic and well-tested.
- `packages/cipher-cli` (optional): small CLI to run quick encrypt/decrypt commands for manual testing and examples.

---

## 🔑 Contract Package (`packages/cipher-contract`)

### Purpose

Provide a stable, minimal API surface so apps can call encryption/decryption without depending on implementation details.

### Suggested Types & API

```ts
// types.ts
export type BaseInput = number | 'alpha' | 'ascii' | 'unicode';

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
    options?: { log?: boolean }
  ): Promise<CipherResult>;

  decrypt(
    text: string,
    key: number | string,
    base: BaseInput,
    options?: { log?: boolean }
  ): Promise<CipherResult>;

  resolveBase(base: BaseInput): number;
  validateKey(key: number | string, base: BaseInput): boolean;
}
```

Notes:
- `key` accepts either a numeric shift or keyword string. Implementation must document deterministic resolution rules for keywords.
- `logs` should be structured, containing transformation steps to help debugging and demoing.

---

## 🔧 Implementation: `packages/cipher-core`

Guidelines:

- Keep functions pure and deterministic; no platform APIs.
- Export small helpers: `resolveBase`, `keyToNumeric`, `shiftChar`, etc.
- Provide both synchronous and async-friendly APIs (returning `Promise` in contract is OK to allow future I/O).
- Include detailed logs for each step when `options.log` is true.

Edge cases to cover:
- Empty input
- Non-ASCII / Unicode characters
- Long inputs and streaming considerations (if needed later)

---

## ✅ Testing

- Use `vitest` (fast) or `jest` with TypeScript support.
- Unit tests:
  - `resolveBase` behavior
  - `keyToNumeric` and validation
  - `encrypt`/`decrypt` round-trips
  - Edge cases (empty, unicode, invalid keys)

Add a simple `examples/` harness that runs several key/text pairs and asserts round-trip equality.

---

## 🧰 Monorepo Tooling & Scripts

Root `package.json` scripts (suggested):

```json
{
  "scripts": {
    "bootstrap": "pnpm -w install",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "dev:web": "turbo run dev --filter=apps/web",
    "dev:mobile": "turbo run dev --filter=apps/mobile"
  }
}
```

Add `tsconfig.base.json` and workspace-level ESLint/Prettier configs.

---

## 🖥️ Apps

- `apps/web` (Next.js): import the contract types and call into `cipher-core` via the contract package.
- `apps/mobile` (Expo): same as web; keep UI minimal and delegate logic to `cipher-core`.

---

## 📦 CI

- Minimal pipeline:
  1. Install (pnpm/turbo bootstrap)
  2. Lint
  3. Test
  4. Build packages

---

## 📚 Docs & Examples

- Update `README.md` with quick start and architecture overview.
- Add `packages/cipher-core/README.md` with API examples and sample code snippets.
- Provide runnable examples in `examples/` showing CLI commands and sample keys.

Example CLI usage (from repo root):

```bash
pnpm --filter cipher-cli run start -- encrypt --text "hello" --key 3 --base alpha
```

---

## 🎯 Milestones (small, testable)

1. Define contract types and export them from `packages/cipher-contract`.
2. Implement `cipher-core.encrypt` and `cipher-core.decrypt` with unit tests.
3. Add `cipher-cli` for quick manual testing and examples.
4. Scaffold `apps/web` and wire a demo page.
5. Scaffold `apps/mobile` and wire a demo screen.
6. Add CI to run lint/test/build on PRs.

---

If you'd like, I can now apply these changes directly to this file (commit the patch I just created) and then start implementing step 1 (define `packages/cipher-contract`).
