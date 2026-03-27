# @crypto/cipher-core

Pure implementation of cipher operations used by apps. Implements a simple shift-based cipher with deterministic keyword resolution.

Behavior summary:

- `base` can be a number or one of `alpha` (letters only), `ascii` (0-127), `unicode` (0-65535).
- `key` can be a number (shift) or a string; string keys are converted to a numeric key by summing code points modulo the base.
- `encrypt` and `decrypt` return `CipherResult` with `ciphertext`, `logs`, and optional `meta`.

Example:

```ts
import { cipherCore } from "@crypto/cipher-core";

await cipherCore.encrypt("Hello", 3, "alpha");
```
