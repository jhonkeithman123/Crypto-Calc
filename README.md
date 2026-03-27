# Crypto Calculator Monorepo

This monorepo contains a shared cipher implementation and two apps (web + mobile) demonstrating encryption/decryption.

Quick commands (repo root):

```bash
pnpm install
pnpm run build       # build all packages
pnpm --filter apps/web dev    # start Next.js web app
pnpm --filter apps/mobile start # start Expo mobile app
```

Development notes:

- Shared types: `packages/cipher-contract`
- Implementation: `packages/cipher-core`
- Examples and sample keys: `examples/`

If you used the CLI to generate the apps, run the `create:web` and `create:mobile` scripts in `package.json`.
