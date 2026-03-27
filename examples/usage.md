# Examples / Usage

This folder contains quick examples showing how to call the shared cipher implementation.

Node script example (run from repo root):

```js
// examples/run.js
const { cipherCore } = require("../packages/cipher-core/dist");

async function main() {
  const res = await cipherCore.encrypt("Hello", 3, "alpha", { log: true });
  console.log("ciphertext:", res.ciphertext);
  console.log("logs:", res.logs.join("\n"));
}

main();
```

CLI-style examples:

```bash
# encrypt
node examples/run.js
```

Notes:

- Build `packages/cipher-core` before running these examples: `pnpm --filter @crypto/cipher-core run build`.
- The web and mobile demo UIs already call the shared package; run their dev servers to try the interactive demos.
