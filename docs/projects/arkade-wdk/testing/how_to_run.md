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

The repository ships a setup helper that installs root dependencies, builds the package, and links submodule dependencies in a sensible order.

```bash
npm install
npm run setup:dev
```

> **Note:** `scripts/setup-dev.js` still references the legacy `@wdk/bare` naming in some link commands while the actual submodule package is `@tetherto/pear-wrk-wdk`. Treat the script's results as best-effort — verify links explicitly when something looks off.

## Build

```bash
npm run build         # tsc → dist/
npm run dev           # tsc --watch
npm run clean         # rimraf dist
```

## Lint & Format

```bash
npm run lint          # eslint src --ext .ts
npm run lint:fix      # eslint src --ext .ts --fix
npm run format        # prettier --write "src/**/*.ts"
```

## Tests

```bash
npm test
```

> **Known issue:** `jest.config.js` references `src/__tests__/setup.ts`, which is missing from the current tree. `npm test` therefore fails on Jest config validation until that file is added (or the reference is removed). See `testing/troubleshooting.md`.

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

Repeat for each touched submodule (`packages/pear-wrk-wdk`, `examples/wdk-starter-react-native`).

## Patch Workflow

When you cannot commit upstream (e.g., changes go into a fork tracking a vendor repo), keep the diff as a patch file under `./patches/`.

```bash
# Apply patches after a fresh clone or submodule update
node scripts/apply-patches.js

# Verify patches still apply cleanly without modifying the working tree
node scripts/apply-patches.js --check

# Regenerate patches after editing submodule files
node scripts/generate-patches.js

# Use a different base ref (default: origin/main)
node scripts/generate-patches.js --base origin/v2
```

After regenerating, commit the updated patch files in the parent repo:

```bash
git add patches/wdk-react-native-provider.patch
git commit -m "Update wdk-react-native-provider patch"
```

## Provider Build (Submodule)

After editing `packages/wdk-react-native-provider`, regenerate bundles and type definitions before committing:

```bash
cd packages/wdk-react-native-provider
npm run prepare   # gen:secret-manager-bundle + gen:worker-bundle + bob build
```

This re-bundles the worklet (picking up HRPC schema changes from `pear-wrk-wdk`) and type-checks under the stricter `bob build` settings.

## Running the Example RN App

```bash
cd examples/wdk-starter-react-native

# Install according to the example's own README/instructions
npm install   # or pnpm/yarn depending on the submodule

# Typecheck (if available)
npm run typecheck

# Run on Android or iOS
npm run android
npm run ios
```

> **Reminder:** The Expo example currently routes Bitcoin through `@wdk/wallet-btc` by default — not `@arkade-os/wdk`. If you are validating `@arkade-os/wdk` end-to-end, ensure the provider/example wiring has been updated to register `WalletManagerArkade` for the `bitcoin` chain.

## Environment Variables

The adapter itself reads no environment variables; configuration is passed at construction time via `ArkadeWalletConfig`. The example app may define its own `.env`/`app.json` settings — see its own README.

## Pre-Hand-off Checklist

- `npm run build` passes at root.
- `npm run lint` passes at root.
- Any expected failures (e.g. the current Jest config issue) are called out in the PR description.
- `git status --short` is clean at root and in any touched submodule.
- No accidental lockfile churn unless intentional.
