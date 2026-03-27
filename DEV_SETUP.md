# Creating apps with official CLIs

Run these commands from the repo root to create apps via the official CLIs.

Optional: remove any placeholder app folders first:

```bash
rm -rf apps/web apps/mobile
```

Create Next.js web app:

```bash
pnpm run create:web
# or
npx create-next-app@latest apps/web --typescript
```

Create Expo mobile app:

```bash
pnpm run create:mobile
# or
npx create-expo-app apps/mobile --template expo-template-blank-typescript
```

After creation, run installs and dev servers:

```bash
pnpm install
pnpm install
# Use Turbo for workspace task orchestration and TUI
# Start web dev (opens local dev server for web)
pnpm run dev:web
# Start mobile dev (Expo)
pnpm run dev:mobile
```

Quick turbo tips:

```bash
# Run all builds with turbo (and open the TUI by running `turbo` interactively)
pnpm run build
pnpm run test
# Launch interactive Turbo UI
pnpm dlx turbo
```

If you want me to integrate the generated apps with `@crypto/cipher-contract` and `@crypto/cipher-core` (add imports/examples), tell me and I will add small demo pages/screens.
