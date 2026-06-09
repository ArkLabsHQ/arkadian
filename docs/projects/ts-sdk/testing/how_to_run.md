# Ark TypeScript SDK — How to Run

## Prerequisites

- **Node.js** 24 LTS (`.nvmrc` → `24.15.0`; root `engines.node` `>=24.15.0 <25`; published `@arkade-os/sdk` `engines.node` `>=22.12.0 <25` for downstream consumers)
- **pnpm** `>=10.25.0 <11` (`packageManager: pnpm@10.25.0`)
- **Docker** + Docker Compose v2 (for integration tests)
- **Git submodules** — clone with `--recurse-submodules` (the `regtest/` submodule is the in-house arkade-regtest stack; since `7e34960a` on 2026-06-01 the SDK is fully off `nigiri`, so no separate install is required)

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

The regtest stack is the in-house **arkade-regtest** Docker Compose stack driven by a zero-dependency Node CLI (`regtest/regtest.mjs`), wired in by `7e34960a` on 2026-06-01 to replace the prior `nigiri`/`chopsticks`/`esplora` setup. `scripts/regtest.sh <pkg> <action>` is a thin wrapper around `node regtest/regtest.mjs` from the repo root; each package supplies its own `.env.regtest` (functional overrides like ports, but `BITCOIN_LOW_FEE` and the `ARKD_IMAGE` override have been dropped since they're now baked into the compose base / inherited from the submodule's blessed default — `v0.9.6`).

### Root-level monorepo regtest (recommended)

```bash
# Full cycle (reset + up + setup + test for the ts-sdk package only)
pnpm test:integration:ts-sdk           # = bash scripts/regtest.sh ts-sdk cycle

# Or step-by-step
pnpm regtest:up:ts-sdk                 # bring stack up   = node regtest/regtest.mjs start
pnpm regtest:setup:ts-sdk              # fund wallets + initial state
pnpm regtest:test:ts-sdk               # run e2e suite against the stack
pnpm regtest:down:ts-sdk               # tear down        = node regtest/regtest.mjs stop
pnpm regtest:reset:ts-sdk              # nuke state       = node regtest/regtest.mjs clean
```

CI symlinks the repo-root `regtest/` submodule into each package directory on each run (since `da0698fc`) so per-package e2e suites that invoke `node regtest/regtest.mjs ...` relative to their package cwd resolve the CLI; the symlink is git-ignored.

### Per-package Docker Compose (in-package scripts)

```bash
# From inside packages/ts-sdk — these now invoke the Node CLI under the hood
pnpm -C packages/ts-sdk regtest:start       # node regtest/regtest.mjs start
pnpm -C packages/ts-sdk test:setup-docker
pnpm -C packages/ts-sdk test:integration-docker
pnpm -C packages/ts-sdk regtest:stop        # node regtest/regtest.mjs stop
pnpm -C packages/ts-sdk regtest:clean       # node regtest/regtest.mjs clean
```

The docker-compose stack includes (default ports as exposed by the arkade-regtest base):
- **arkd** on port 7070 — Ark server (regtest, block scheduler, 10s rounds, `round.min-participants=1`)
- **arkd-wallet** on port 6060 — wallet service (started after nbxplorer healthcheck)
- **nbxplorer** on port 32838 — Bitcoin block indexer (2.6.7)
- **bitcoind** — Bitcoin Core (btcpay image; authenticates via `rpcuser=admin1` / `rpcpassword=123` rather than cookie, so any `docker exec bitcoin bitcoin-cli ...` invocation must pass those flags)
- **mempool_web** — mempool-spec Esplora API, exposed in-network as `http://mempool_web/api` and from the host as `http://localhost:3000/api`
- **fulmine** on ports 7000-7002 — swap + delegate service

### Faucet, mining, and ad-hoc ops

The Node CLI also exposes the operations the e2e suites use directly:

```bash
node regtest/regtest.mjs faucet <btc-or-ark-address> [amount-sat] --confirm
node regtest/regtest.mjs mine <n-blocks>
```

These replace the prior `nigiri faucet ...` / `nigiri rpc --generate N` invocations.

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
- **Esplora (mempool)**: `http://localhost:3000/api` — note the `/api` suffix; the regtest backend is the mempool-spec Esplora API exposed by the arkade-regtest stack (was `http://localhost:3000` against nigiri/chopsticks)
- **Fulmine**: `http://localhost:7000` (delegate)

Public mutinynet endpoints:
- **arkd**: `https://mutinynet.arkade.sh`
- **Esplora**: `https://mutinynet.com/api`
