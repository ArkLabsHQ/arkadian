# Ark TypeScript SDK — How to Run

## Prerequisites

- **Node.js** 24 LTS (`.nvmrc` → `24.15.0`; root `engines.node` `>=24.15.0 <25`; published `@arkade-os/sdk` `engines.node` `>=22.12.0 <25` for downstream consumers)
- **pnpm** `>=10.25.0 <11` (`packageManager: pnpm@10.25.0`)
- **Docker** (for integration tests)
- **nigiri** (local Bitcoin regtest) — `curl https://getnigiri.vulpem.com | bash`

## Install Dependencies

The repo is a pnpm workspace monorepo (since 2026-05-22). One install at the root pulls deps for both `packages/ts-sdk/` and `packages/boltz-swap/`:

```bash
cd /path/to/ts-sdk        # repo root
pnpm install
```

## Build

```bash
# Root — builds both packages (ts-sdk first, boltz-swap depends on it)
pnpm build

# Scoped to @arkade-os/sdk only
pnpm -C packages/ts-sdk typecheck     # tsc --noEmit (CI-gated before build)
pnpm -C packages/ts-sdk build         # single-step tsup
pnpm -C packages/ts-sdk smoke:dist    # post-build dist-shape + singleton-identity smoke
```

Output (flat `packages/ts-sdk/dist/` since #496 — was `dist/{esm,cjs,types}/` under the prior `tsc` chain):
- `packages/ts-sdk/dist/<entry>.js` — ES modules
- `packages/ts-sdk/dist/<entry>.cjs` — CommonJS modules
- `packages/ts-sdk/dist/<entry>.d.ts` — ESM-condition TypeScript declarations
- `packages/ts-sdk/dist/<entry>.d.cts` — CJS-condition TypeScript declarations
- `packages/ts-sdk/dist/<entry>.*.map` — source maps

## Run Regtest Environment

The regtest stack is driven from the repo root by `scripts/regtest.sh <pkg> <action>`. Each package supplies its own `.env.regtest`.

### Option 1: Nigiri with Ark (Recommended for quick dev cycles)

```bash
# Start nigiri with built-in Ark support
nigiri start --ark

# Run setup script (scoped to ts-sdk)
pnpm -C packages/ts-sdk test:setup

# When done:
nigiri stop --delete
```

### Option 2: Root-level monorepo regtest (Docker Compose)

```bash
# Full cycle (reset + up + setup + test for the ts-sdk package only)
pnpm test:integration:ts-sdk           # = bash scripts/regtest.sh ts-sdk cycle

# Or step-by-step
pnpm regtest:up:ts-sdk                 # bring stack up
pnpm regtest:setup:ts-sdk              # fund wallets + initial state
pnpm regtest:test:ts-sdk               # run e2e suite against the stack
pnpm regtest:down:ts-sdk               # tear down
pnpm regtest:reset:ts-sdk              # nuke state without down
```

### Option 3: Per-package Docker Compose (in-package scripts)

```bash
# From inside packages/ts-sdk
pnpm -C packages/ts-sdk regtest:start       # ./regtest/start-env.sh
pnpm -C packages/ts-sdk test:setup-docker
pnpm -C packages/ts-sdk test:integration-docker
pnpm -C packages/ts-sdk regtest:stop        # ./regtest/stop-env.sh
pnpm -C packages/ts-sdk regtest:clean       # ./regtest/clean-env.sh
```

The docker-compose stack includes:
- **arkd** on port 7070 — Ark server (regtest, block scheduler, 10s rounds)
- **arkd-wallet** on port 6060 — Wallet service
- **nbxplorer** on port 32838 — Bitcoin block indexer
- **pgnbxplorer** on port 5432 — PostgreSQL for NBXplorer
- **fulmine** on ports 7000-7002 — Swap + delegator service

## Run Examples

```bash
# Examples now live under the package:
ls packages/ts-sdk/examples/
# spilman.js  vhtlc.js

# Run an example (requires regtest running):
node packages/ts-sdk/examples/spilman.js
```

## Build Documentation

```bash
# Generate TypeDoc API docs (output: monorepo-level docs/, aligned in 5fb76c0f)
pnpm -C packages/ts-sdk docs:build

# Open in browser
pnpm -C packages/ts-sdk docs:open
```

## Environment

The SDK connects to these services:
- **arkd**: `http://localhost:7070` (regtest)
- **Esplora/Chopsticks**: `http://localhost:3000` (via nigiri)
- **Fulmine**: `http://localhost:7000` (delegator)

Public mutinynet endpoints:
- **arkd**: `https://mutinynet.arkade.sh`
- **Esplora**: `https://mutinynet.com/api`
