---
project_id: arkade-regtest
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_run.md"]
  dev:        ["sop/development-workflow.md", "system/configuration.md"]
  debug:      ["testing/troubleshooting.md", "testing/how_to_run.md"]
  monitoring: ["testing/usage.md", "testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md", "testing/how_to_run.md"]
  config: ["system/configuration.md"]
  submodule: ["sop/development-workflow.md", "system/project_overview.md"]
scripts:
  start_env: "node regtest.mjs start"
  start_profile: "node regtest.mjs start --profile <name>"
  start_with_env: "node regtest.mjs start --env <path>"
  stop_env: "node regtest.mjs stop"
  clean_env: "node regtest.mjs clean"
  faucet: "node regtest.mjs faucet <address> <amountBtc> [--confirm]"
  mine: "node regtest.mjs mine [n]"
  create_invoice: "node regtest.mjs create-invoice [--secondary]"
  pay_invoice: "node regtest.mjs pay-invoice <invoice>"
  rotate_signer: "node regtest.mjs rotate-signer [--cutoff <secs>]"
---

# Arkade Regtest — Project Index

**arkade-regtest** is a self-contained, **cross-platform** regtest environment for Ark protocol development. It orchestrates Bitcoin Core, Fulcrum, mempool, NBXplorer, arkd + arkd-wallet, Fulmine, Boltz, an LND node, the arkade-script Emulator, and the arkade Solver into a single reproducible Docker Compose stack — driven by a small **zero-dependency Node CLI** (`regtest.mjs`). There is **no dependency on nigiri** and **no compiled binary** to maintain; it runs the same on Linux, macOS, and Windows (no WSL required). Designed to be embedded as a git submodule in projects that need a local Ark test network.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/arkade-regtest/system/` — System Architecture & Design
Core technical documentation about the regtest environment:

- **${ARKADIAN_DIR}/docs/projects/arkade-regtest/system/project_overview.md** — What arkade-regtest is, services it bundles, use cases
- **${ARKADIAN_DIR}/docs/projects/arkade-regtest/system/architecture.md** — Node CLI orchestration, compose profiles, networking, env-loading strategy
- **${ARKADIAN_DIR}/docs/projects/arkade-regtest/system/configuration.md** — `.env.defaults`, override layering, image/version pinning, signer rotation, fast-expiry locktimes

### `${ARKADIAN_DIR}/docs/projects/arkade-regtest/testing/` — Usage & Operations
Practical guides for running the regtest stack:

- **${ARKADIAN_DIR}/docs/projects/arkade-regtest/testing/usage.md** — Quick start, CLI commands, profiles, helper invoices
- **${ARKADIAN_DIR}/docs/projects/arkade-regtest/testing/how_to_run.md** — Prerequisites, profiles, CI integration
- **${ARKADIAN_DIR}/docs/projects/arkade-regtest/testing/how_to_test.md** — Smoke checks, port verification, integration patterns
- **${ARKADIAN_DIR}/docs/projects/arkade-regtest/testing/troubleshooting.md** — Common issues, port conflicts, profile/service failures

### `${ARKADIAN_DIR}/docs/projects/arkade-regtest/sop/` — Standard Operating Procedures
Step-by-step guides:

- **${ARKADIAN_DIR}/docs/projects/arkade-regtest/sop/development-workflow.md** — Submodule integration, version bumps, contributing changes

### `${ARKADIAN_DIR}/docs/projects/arkade-regtest/tasks/` — Product Requirements & Plans
Feature specifications and implementation tracking.

### `${ARKADIAN_DIR}/docs/projects/arkade-regtest/change-log/` — Recent Changes
Curated summaries of significant changes.

### `${ARKADIAN_DIR}/docs/projects/arkade-regtest/pr-report/` — Pull Request Summaries
Analysis and summaries of pull requests.

---

## Key Concepts

### Self-Contained, Nigiri-Free Stack
arkade-regtest bundles every service needed for end-to-end Ark testing into one Docker Compose project (`name: arkade-regtest`). Everything is standard Docker images plus a Node orchestrator — **no nigiri, no compiled helper binary, no `npm install`**. The chain/indexer/explorer tier (Bitcoin Core + Fulcrum + mempool + NBXplorer) replaces nigiri's electrs/esplora/chopsticks.

### Zero-Dependency Node CLI
`regtest.mjs` (Node ≥ 18, standard library only) is the single entry point for every lifecycle and helper command: `start`, `stop`, `clean`, `faucet`, `mine`, `reorg`, `rpc`, `create-invoice`, `pay-invoice`, `ark`, `arkd`, `rotate-signer`, `set-signers`, `signer-info`. `npm start` / `npm stop` / `npm run clean` are aliases for the three lifecycle commands.

### Compose Profiles
Services are grouped into profiles (`base`, `ark`, `delegate`, `boltz`, `emulator`, `solver`); the CLI resolves the dependency closure automatically. Select with `--profile <name>` (repeatable) or pin via the `REGTEST_PROFILES` env var. Precedence: `--profile` > `REGTEST_PROFILES` > full stack. `stop`/`clean` always act on the whole project.

### Layered Environment Loading
`.env.defaults` is the always-on baseline. The first override found is layered on top, in priority order:
1. `--env <path>` CLI flag (explicit, highest priority)
2. `../.env.regtest` (parent repo override — typical submodule case)
3. `.env` (local override inside arkade-regtest)

Override files only specify what differs; a variable already set in the shell environment wins over the files.

### Esplora REST via mempool
arkd and Fulmine consume the **Esplora-compatible REST API that mempool serves under `/api`** (`http://mempool_web/api` in-network; `http://localhost:3000/api` on the host) — an officially supported arkd explorer backend.

### Operator Signer Rotation
`rotate-signer` / `set-signers` / `signer-info` simulate an arkd operator rotating its VTXO signer key and advertising the previous key as a *deprecated signer* with an optional cutoff (DUE_NOW / MIGRATABLE / EXPIRED), driving client-side migration/recovery flows. Requires the rc images (default `v0.9.9-rc.1`; deprecated-signer support landed after `v0.9.6`).

### Fast VTXO Expiry (block-denominated locktimes)
arkd interprets `ARKD_VTXO_TREE_EXPIRY` and the exit delays **by magnitude** (BIP68 boundary = 512): values `≥ 512` are seconds (wall-clock scheduler), values `< 512` are **blocks** (regtest-only block scheduler). Setting small block values lets you fire VTXO-tree expiry / sweeps **instantly by mining** — set `AUTOMINE_INTERVAL=0` so the auto-miner can't advance the tip mid-test. All five values must share the same type.

### Custom arkd / Image Versions
arkd is always run from `ARKD_IMAGE` / `ARKD_WALLET_IMAGE` (no built-in fallback). Every image and host port is an overridable `.env.defaults` variable; container-internal ports stay fixed so multiple stacks can run side by side.

---

## Bundled Services

| Service          | Image (default)                                     | Default Port(s)        | Profile  | Purpose                                          |
| ---------------- | --------------------------------------------------- | ---------------------- | -------- | ------------------------------------------------ |
| Bitcoin Core     | `btcpayserver/bitcoin:31.0`                         | 18443 / 18444          | base     | Bitcoin regtest node (RPC `admin1`/`123`)        |
| Postgres         | `postgres:16`                                       | 39372                  | base     | Backs arkd + nbxplorer (+ boltz)                 |
| NBXplorer        | `nicolasdorier/nbxplorer:2.6.7`                     | 32838                  | base     | UTXO indexer (for LND / boltz)                   |
| Fulcrum          | `cculianu/fulcrum:v2.1.1`                           | 50001 / 50003          | base     | Electrum server (TCP / WS)                       |
| mempool          | `mempool/backend:v3.3.1` + `frontend:v3.3.1`        | 3000 (web + `/api`)    | base     | Block explorer + Esplora REST API                |
| LND (counterparty)| `btcpayserver/lnd:v0.19.3-beta`                     | 9735 / 10009           | base     | Lightning node boltz-lnd channels to             |
| arkd             | `ghcr.io/arkade-os/arkd:v0.9.9-rc.1`                | 7070 / 7071            | ark      | Ark protocol server (+ admin)                    |
| arkd-wallet      | `ghcr.io/arkade-os/arkd-wallet:v0.9.9-rc.1`         | 6060                   | ark      | Signer/wallet for arkd                           |
| Arkade Wallet    | `ghcr.io/arkade-os/wallet:latest`                   | 3003                   | ark      | Browser wallet (PWA)                             |
| Arkade Explorer  | `ghcr.io/arklabshq/arkade-explorer:latest`          | 7080                   | ark      | Ark explorer UI                                  |
| Fulmine Delegator| `ghcr.io/arklabshq/fulmine:v0.3.25`                 | 7010 / 7011 / 7012     | delegate | Delegated-signing Fulmine (`FULMINE_DELEGATE_*`) |
| Boltz Backend    | `boltz/boltz:latest`                                | 9000 / 9001 / 9004     | boltz    | Submarine / reverse swap orchestrator            |
| Boltz Fulmine    | `ghcr.io/arklabshq/fulmine:v0.3.25`                 | 7002 / 7003 / 7004     | boltz    | Ark wallet + Boltz integration                   |
| Boltz LND        | `btcpayserver/lnd:v0.19.3-beta`                     | 9736 / 10010           | boltz    | Lightning node used by Boltz                     |
| Nginx (Boltz)    | `nginx:alpine`                                      | 9069                   | boltz    | CORS proxy fronting Boltz                        |
| LNURL Server     | `ghcr.io/arklabshq/lnurl-server:0.1.0`              | 9090                   | boltz    | LNURL endpoints for testing                      |
| Emulator         | `ghcr.io/arkade-os/emulator:v0.0.1`                 | 7073                   | emulator | arkade-script signing service (default-on)       |
| Solver           | `ghcr.io/arkade-os/solver:v0.0.1-rc.2`              | 7090 / 7091            | solver   | Arkade virtual-mempool intent solver             |

All images and host ports are configurable via `.env.defaults` overrides.

### Profiles

| Profile    | Services                                                          | Depends on        |
| ---------- | ----------------------------------------------------------------- | ----------------- |
| `base`     | bitcoin, postgres, nbxplorer, fulcrum, mempool (api/web/db), lnd  | —                 |
| `ark`      | arkd, arkd-wallet, arkade-wallet, arkade-explorer                 | `base`            |
| `delegate` | fulmine-delegator                                                 | `ark`             |
| `boltz`    | boltz, boltz-fulmine, boltz-lnd, nginx-boltz, lnurl-server        | `ark`             |
| `emulator` | emulator                                                          | `ark`             |
| `solver`   | solver                                                            | `ark`, `emulator` |

---

## Quick Reference

### Lifecycle
```bash
node regtest.mjs start                    # full stack (all profiles)
node regtest.mjs start --profile base     # just chain + explorer/indexer
node regtest.mjs start --profile boltz    # base + ark + boltz
node regtest.mjs stop                     # stop services (preserve data)
node regtest.mjs clean                    # stop + remove containers + volumes
npm start / npm stop / npm run clean      # aliases for the three lifecycle commands
```

### Chain & wallet helpers
```bash
node regtest.mjs faucet <addr> <btc> [--confirm]   # send from node wallet; --confirm mines 1
node regtest.mjs mine [n]                          # mine n blocks (default 1)
node regtest.mjs reorg [depth]                     # simulate a reorg (default 1)
node regtest.mjs rpc <args...>                     # bitcoin-cli passthrough
node regtest.mjs ark <args...>                     # ark client CLI (inside arkd container)
node regtest.mjs arkd <args...>                    # arkd server CLI (inside arkd container)
```

### Lightning helpers
```bash
node regtest.mjs create-invoice              # 100k-sat invoice on boltz-lnd
node regtest.mjs create-invoice --secondary  # mint on the secondary (lnd) node
node regtest.mjs pay-invoice <invoice>       # pay from the non-destination node
```

### Signer rotation
```bash
node regtest.mjs rotate-signer                 # new active key; deprecate current (DUE_NOW)
node regtest.mjs rotate-signer --cutoff +86400 # deprecate with a future cutoff (MIGRATABLE)
node regtest.mjs signer-info                   # print the active + deprecated signer set
```

### Submodule Usage (parent repo)
```bash
git submodule add https://github.com/arkade-os/arkade-regtest.git regtest
echo 'ARKD_IMAGE=ghcr.io/arkade-os/arkd:v0.9.9-rc.1' >> .env.regtest
node regtest/regtest.mjs start
```

---

## Documentation Size Guidelines

- **usage / how-to**: ≤ 100-120 lines
- **architecture**: 400-700 words
- **configuration**: 400-800 words
- **SOP procedures**: ≤ 120 lines

Keep files focused and cross-reference instead of duplicating.
