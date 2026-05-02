# Arkade WDK — How to Run

## Prerequisites

- Node.js >= 18
- npm (root); submodules use their own package managers
- Git (with submodule support)
- For the React Native example: Xcode / Android Studio toolchains, plus the standard Expo prerequisites
- (Optional) A reachable Ark server (`arkServerUrl`) and Boltz swap provider (`swapProviderUrl`) for Lightning

## Clone with Submodules

```bash
git clone git@github.com:ArkLabsHQ/arkade-wdk.git
cd arkade-wdk
git submodule update --init --recursive
```

## Local Development Setup

The repository ships an idempotent setup helper that installs root dependencies, initialises submodules, applies all patches, and symlinks packages into one another's `node_modules`.

```bash
npm install
npm run setup:dev
```

`scripts/setup-dev.js` is safe to re-run: each patch is checked with `git apply --reverse --check` first, and existing symlinks are removed before being recreated. There is **no build step** for the runtime code (the package ships `src/*.js` directly).

## Build (declarations only)

The package has no compiled runtime — only emitted type declarations:

```bash
npm run build:types   # tsc -p tsconfig.json → types/*.d.ts
```

This is what `prepublishOnly` runs before `npm publish`.

## Lint, Format, Type-Check

```bash
npm run lint          # eslint src --ext .js && tsc -p jsconfig.json --noEmit
npm run lint:fix      # eslint src --ext .js --fix
npm run format        # prettier --write "src/**/*.js"
npm run typecheck     # tsc -p jsconfig.json --noEmit (JSDoc-driven type-check)
```

## Tests

```bash
npm test              # node --test src/__tests__/*.test.js
npm run test:watch    # node --test --watch src/__tests__/*.test.js
```

Tests use the built-in `node:test` runner (no Jest, no `--experimental-vm-modules`). Current specs:

- `src/__tests__/bech32m.test.js` — cross-checks `arkAddressToPkScript` against `ArkAddress` from the SDK.
- `src/__tests__/phase-0.test.js` — Phase-0 wiring (manager / account boundary tests).
- `src/__tests__/wdk.test.js` — WDK integration: `WdkManager` registration, account types, etc.

## Submodule Workflow

The `packages/` and `examples/` directories are independent git repositories. Changes flow **inside-out**: commit inside the submodule first, then bump the submodule pointer in the parent repo.

```bash
# 1. Edit inside a submodule
cd packages/wdk-react-native-provider
# ... edit files ...
git add -A && git commit -m "your change"
git push

# 2. From the parent repo, commit the updated submodule reference
cd ../..
git add packages/wdk-react-native-provider
git commit -m "Update wdk-react-native-provider submodule"
```

## Patch Workflow

When you cannot commit upstream (e.g., changes go into a vendor repo), keep the diff as a patch file under `./patches/`.

```bash
# Apply patches into a freshly synced submodule
npm run setup:dev   # idempotent: applies every patch via git apply

# Regenerate patches after editing submodule files (default base = parent's pinned submodule SHA)
node scripts/generate-patches.js

# Use a different base ref
node scripts/generate-patches.js --base origin/main
```

After regenerating, commit the updated patch files in the parent repo:

```bash
git add patches/wdk-react-native-provider.patch
git commit -m "Update wdk-react-native-provider patch"
```

The `--base` default was changed (`30aabf8`) to the parent's pinned submodule SHA — important when the submodule is checked out at an older tag (true for the two `packages/` submodules).

## Running the Example RN App

```bash
cd examples/wdk-starter-react-native

# Install according to the example's own README
npm install

# Run on Android or iOS
npm run android
npm run ios
```

The example app exercises the full Arkade chain (send/receive, including BIP21 + Lightning) once `setup:dev` has applied all patches.

## Environment Variables

The adapter itself reads no environment variables; configuration is passed at construction time via `ArkadeWalletConfig`. The example app may define its own `.env` / `app.json` settings — see its own README.

## Pre-Hand-off Checklist

- `npm run lint` passes (covers ESLint + JSDoc type-check).
- `npm test` passes.
- `npm run format` produced no further changes (or formatting changes are isolated in a separate commit).
- `git status --short` is clean at root and in any touched submodule.
- No accidental lockfile churn unless intentional (the project commits `package-lock.json`; `pnpm-lock.yaml` was removed and `npm` is enforced).
