# Arkade Regtest - Project Overview

## Introduction

**arkade-regtest** is a self-contained, **cross-platform** regtest environment for Ark protocol development. It orchestrates Bitcoin Core, Fulcrum (Electrum server), mempool (block explorer + Esplora REST API), NBXplorer, `arkd` (Ark Server) + `arkd-wallet`, Fulmine (and a delegated-signing Fulmine), Boltz Backend, two LND Lightning nodes, an LNURL server, an Nginx CORS proxy, the Arkade Wallet PWA, the Arkade Explorer, the arkade-script Emulator signing service, and the arkade Solver into a single reproducible Docker Compose stack.

The whole stack is driven by **`regtest.mjs`, a zero-dependency Node CLI** (Node ≥ 18, standard library only — no `npm install`). There is **no dependency on nigiri** and **no compiled binary** to maintain: everything is standard Docker images plus the Node orchestrator. It runs the same on Linux, macOS, and Windows (no WSL required).

## Purpose and Use Cases

Local Ark development needs more than a single binary. A realistic test loop exercises a Bitcoin regtest node, an indexer/explorer, an Ark Server, a wallet/signer, Lightning nodes, and a Boltz swap backend — all wired together. arkade-regtest collapses that into:

```bash
node regtest.mjs start
```

### Primary Use Cases

- **End-to-end Ark testing**: VTXOs, rounds, settlement, boarding, redemption — exercised against real running services.
- **Boltz / Lightning swap testing**: Full submarine and reverse swap flows with real LND nodes and a Boltz backend.
- **Wallet integration testing**: Arkade Wallet PWA, fulmine wallet, and SDK clients all reachable on stable local ports.
- **CI integration**: Embedded as a git submodule in projects (arkd, fulmine, go-sdk, ts-sdk, dotnet-sdk, etc.) and spun up in GitHub Actions — no Go toolchain or nigiri build step needed.
- **arkd version / signer-rotation / fast-expiry testing**: Pin `ARKD_IMAGE`, drive operator signer rotation, or use block-denominated locktimes to fire VTXO expiry/sweeps instantly by mining.

## Key Features

### Self-Contained, Nigiri-Free Stack
One command brings up the whole environment. The chain/indexer/explorer tier (Bitcoin Core + Fulcrum + mempool + NBXplorer) replaces nigiri's electrs/esplora/chopsticks. arkd and Fulmine consume the Esplora-compatible REST API mempool serves under `/api`.

### Zero-Dependency Node CLI
`regtest.mjs` is the single entry point for every lifecycle and helper command: `start`, `stop`, `clean`, `faucet`, `mine`, `reorg`, `rpc`, `create-invoice`, `pay-invoice`, `ark`, `arkd`, `rotate-signer`, `set-signers`, `signer-info`. `npm start` / `npm stop` / `npm run clean` are aliases for the lifecycle commands.

### Compose Profiles
Services are grouped into profiles (`base`, `ark`, `delegate`, `boltz`, `emulator`, `solver`) so you can bring up just the tier you need; the CLI resolves the dependency closure. Select with `--profile <name>` (repeatable) or pin via `REGTEST_PROFILES`. Precedence: `--profile` > `REGTEST_PROFILES` > full stack.

### Built-in Auto-Miner & Chain Tools
A built-in auto-miner mines one block every `AUTOMINE_INTERVAL` seconds (default **600**); set `AUTOMINE_INTERVAL=0` to mine only explicitly. `faucet`, `mine`, `reorg`, and the `rpc` passthrough give direct chain control.

### Operator Signer Rotation
`rotate-signer` / `set-signers` / `signer-info` simulate an arkd operator rotating its VTXO signer key and advertising the previous key as a deprecated signer (DUE_NOW / MIGRATABLE / EXPIRED). Requires the rc images (deprecated-signer support landed after `v0.9.6`).

### Fast VTXO Expiry (block-denominated locktimes)
Small `ARKD_VTXO_TREE_EXPIRY` / exit-delay values (`< 512`) switch arkd to the regtest block scheduler, so expiry and sweeps fire by **mining** rather than waiting wall-clock time.

### Default-On Emulator & Solver
The arkade-script Emulator (port `7073`) is part of the default stack; disable it with `EMULATOR_IMAGE=`. The `solver` profile adds the arkade virtual-mempool intent solver (depends on arkd + emulator).

### Submodule-First Design
Intended to be added as a git submodule (typically at `regtest/`). The CLI auto-discovers `../.env.regtest` from the parent directory so consumers can pin versions without modifying arkade-regtest.

### Layered Environment Loading
`.env.defaults` is the always-on baseline. The first override found is layered on top: `--env <path>` > `../.env.regtest` > `.env`. Missing variables fall through to defaults; a variable already set in the shell wins over the files.

### Stop / Clean Lifecycle
- `node regtest.mjs stop` — stops services, preserves data volumes (fast restart)
- `node regtest.mjs clean` — full teardown including containers and volumes (also resets the signer set)

### Lightning Helpers
`create-invoice` / `pay-invoice` offer one-line shortcuts for invoicing through Boltz LND, supporting both primary and secondary nodes.

## Technology Stack

- **Node.js (≥ 18, stdlib only)** — `regtest.mjs` orchestrator and `lib/*.mjs` modules
- **Docker Compose** — `docker/compose.base.yml` + `docker/compose.ark.yml` (merged into project `arkade-regtest`)
- **Bitcoin Core / LND (BTCPay images)** — chain + Lightning; config embedded via `BITCOIN_EXTRA_ARGS` / `LND_EXTRA_ARGS`
- **Fulcrum + mempool + NBXplorer** — Electrum server, block explorer + Esplora REST API, UTXO indexer
- **arkd / arkd-wallet** — Ark protocol server + signer (always run from `ARKD_IMAGE` / `ARKD_WALLET_IMAGE`)
- **Fulmine / Boltz Backend** — Ark wallet + submarine/reverse swap orchestrator
- **Emulator / Solver** — arkade-script signing service + virtual-mempool intent solver

## Repository Layout

| Path                                | Purpose                                                         |
| ----------------------------------- | -------------------------------------------------------------- |
| `regtest.mjs`                       | Node CLI entry point (all lifecycle + helper commands)         |
| `lib/*.mjs`                         | Orchestrator modules (`compose`, `env`, `chain`, `lnd`, `invoice`, `proc`, `wait`, `log`) |
| `lib/setup/*.mjs`                   | Per-service setup (`arkd`, `boltz`, `fulmine`, `signer`, `solver`) |
| `docker/compose.base.yml`           | Chain + indexers + explorer + counterparty LN                  |
| `docker/compose.ark.yml`            | Ark stack: arkd, boltz, fulmine, delegator, wallet, explorer, emulator, solver |
| `docker/compose.emulator.yml`       | Emulator overlay (profile-gated)                               |
| `helpers/create-invoice.sh`, `pay-invoice.sh` | Lightning helpers wrapped by the CLI                 |
| `.env.defaults`                     | Baseline configuration (images, ports, arkd config)            |
| `package.json`                      | npm aliases (`start` / `stop` / `clean`), `bin` entry          |
| `README.md`                         | Project documentation                                          |

## Relationship to Other Ark Projects

- **arkd / arkd-wallet** — the Ark Server + signer under test (always run from `ARKD_IMAGE`/`ARKD_WALLET_IMAGE`, default `v0.9.9-rc.1`)
- **fulmine** — exercised as a wallet + Boltz client and as a delegated signer (`fulmine-delegator`)
- **boltz-backend** — exercised as the swap orchestrator
- **wallet** — Arkade Wallet PWA included for end-to-end browser testing
- **arkade-explorer** — explorer UI bundled in the `ark` profile
- **arkade-os/emulator** — arkade-script signing service, default-on
- **arkade-os/solver** — virtual-mempool intent solver (`solver` profile)
- **go-sdk / ts-sdk / rust-sdk / dotnet-sdk** — SDK consumers point their integration tests at this stack (e.g. ts-sdk drives signer rotation through `set-signers`)

arkade-regtest is the standard local target every Ark project test suite is expected to run against.
