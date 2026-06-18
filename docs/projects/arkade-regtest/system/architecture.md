# Architecture

arkade-regtest is a thin orchestration layer that composes upstream Docker images into a single reproducible Ark regtest stack. There is no compiled code in the repo — the architecture is a **zero-dependency Node CLI** (`regtest.mjs` + `lib/*.mjs`, Node ≥ 18 standard library only) plus two Docker Compose files. It replaced the previous nigiri-based Bash launcher; there is no nigiri and no helper binary to build.

## High-Level Diagram

```
                        ┌──────────────────────────────┐
                        │         regtest.mjs          │
                        │  (Node CLI / orchestrator)   │
                        └───────────────┬──────────────┘
                                        │
        ┌───────────────────┬───────────┴───────────┬───────────────────┐
        ▼                   ▼                       ▼                   ▼
 ┌────────────┐   ┌──────────────────┐   ┌────────────────────┐  ┌──────────────┐
 │  lib/env   │   │  lib/compose     │   │  lib/setup/*       │  │  lib/chain   │
 │ (env load) │   │ (profile→up)     │   │ (arkd/boltz/...)   │  │ (mine/faucet)│
 └────────────┘   └────────┬─────────┘   └──────────┬─────────┘  └──────────────┘
                           │                        │
                           ▼                        ▼
        ┌──────────────────────────────┐  ┌────────────────────────────────┐
        │  compose.base.yml            │  │  compose.ark.yml               │
        │  bitcoin · postgres ·        │  │  arkd · arkd-wallet · boltz ·  │
        │  nbxplorer · fulcrum ·       │  │  boltz-fulmine · fulmine-      │
        │  mempool(api/web/db) · lnd   │  │  delegator · wallet · explorer │
        └──────────────────────────────┘  │  · emulator · solver           │
                                          └────────────────────────────────┘
```

## Component Layers

### 1. CLI Layer (`regtest.mjs`)
Single entry point. Subcommands: `start`, `stop`, `clean`, `faucet`, `mine`, `reorg`, `rpc`, `create-invoice`, `pay-invoice`, `ark`, `arkd`, `rotate-signer`, `set-signers`, `signer-info`. On `start` it: loads env, resolves the requested profiles to their dependency closure, brings up the merged compose project, runs per-service setup (arkd wallet seed/create/unlock, faucet flows, boltz/fulmine/solver wiring, emulator readiness), and starts the auto-miner. `npm start`/`stop`/`run clean` alias the lifecycle commands.

### 2. Environment Layer (`lib/env.mjs` + `.env.defaults`)
`.env.defaults` is always loaded first (baseline). The first matching override is layered on top, in priority order:
1. `--env <path>` (explicit, highest priority)
2. `../.env.regtest` (parent repo — typical submodule case)
3. `.env` (local override inside arkade-regtest)

Override files only specify what differs; a variable already set in the shell environment wins over the files. The CLI itself reads `ARKD_PORT` / `ARKD_ADMIN_PORT` to reach arkd on the host, and `REGTEST_PROFILES` to pin profiles.

### 3. Compose Layer (`docker/compose.base.yml` + `compose.ark.yml`)
Two files are merged into one project (`name: arkade-regtest`):
- **`compose.base.yml`** — chain + indexers + explorer + counterparty LN: `bitcoin` (Bitcoin Core regtest), `postgres`, `nbxplorer`, `fulcrum` (Electrum), `mempool_api` + `mempool_web` + `mempool_mariadb`, and `lnd`.
- **`compose.ark.yml`** — the Ark stack: `arkd` + `arkd-wallet`, `boltz`, `boltz-lnd`, `boltz-fulmine`, `fulmine-delegator`, `nginx-boltz`, `lnurl-server`, `arkade-wallet`, `arkade-explorer`, the profile-gated `emulator`, and `solver`.

Bitcoin Core and the counterparty LND use the BTCPay images, so their configuration is embedded directly via `BITCOIN_EXTRA_ARGS` / `LND_EXTRA_ARGS` — there are no bind-mounted conf files. arkd and Fulmine point at the Esplora REST API mempool serves at `http://mempool_web/api` inside the network.

### 4. Profiles
Compose profiles group services so you can bring up just one tier; the CLI resolves the dependency closure automatically:

| Profile    | Services                                                          | Depends on        |
| ---------- | ----------------------------------------------------------------- | ----------------- |
| `base`     | bitcoin, postgres, nbxplorer, fulcrum, mempool (api/web/db), lnd  | —                 |
| `ark`      | arkd, arkd-wallet, arkade-wallet, arkade-explorer                 | `base`            |
| `delegate` | fulmine-delegator                                                 | `ark`             |
| `boltz`    | boltz, boltz-fulmine, boltz-lnd, nginx-boltz, lnurl-server        | `ark`             |
| `emulator` | emulator                                                          | `ark`             |
| `solver`   | solver                                                            | `ark`, `emulator` |

Select with `--profile <name>` (repeatable) or `REGTEST_PROFILES`. Precedence: `--profile` > `REGTEST_PROFILES` > full stack. `stop`/`clean` act on the whole project regardless of profiles.

### 5. Setup Layer (`lib/setup/*.mjs`)
Per-service wiring run after compose-up: `arkd.mjs` (seed → create → unlock the wallet via the admin API, wait for sync, fund the CLI client wallet offchain via `arkd note` / `ark redeem-notes`), `boltz.mjs`, `fulmine.mjs`, `signer.mjs` (seeds `.signer-state.json` from the boot signer key for rotation), and `solver.mjs`.

### 6. Chain & Helper Layer (`lib/chain.mjs`, `lib/lnd.mjs`, `lib/invoice.mjs`, `helpers/`)
Auto-miner (`AUTOMINE_INTERVAL`, default 600s), `mine` / `reorg` / `faucet` / `rpc` chain controls, and `create-invoice` / `pay-invoice` Lightning helpers (wrapping `lncli` in the boltz-lnd / lnd containers).

## Networking

All services run on the Docker network of the `arkade-regtest` compose project; container hostnames (`bitcoin`, `arkd`, `mempool_web`, `boltz-lnd`, etc.) are used inside the network. Only the host side of each port mapping is configurable via `.env.defaults`; container-internal ports are fixed so multiple stacks can run side by side. Host ports include: bitcoin RPC `18443`, mempool web + Esplora `/api` `3000`, fulcrum `50001`/`50003`, nbxplorer `32838`, postgres `39372`, arkd `7070` (+ admin `7071`), arkd-wallet `6060`, fulmine `7002`/`7003`/`7004`, delegator `7010`/`7011`/`7012`, boltz `9000`/`9001`/`9004`, nginx `9069`, lnurl `9090`, wallet `3003`, explorer `7080`, emulator `7073`, solver `7090`/`7091`.

## Data Flow

A typical Ark settlement test: **funding** (`faucet` / mined blocks seed the wallets and LND) → **boarding** (wallet locks BTC on-chain via arkd) → **off-chain transfer** (wallet → wallet through arkd rounds) → **Boltz swap** (Lightning ↔ Ark via Boltz + Fulmine) → **settlement / exit** (round-settled or unilateral exit back to chain). Every leg runs against in-stack services with deterministic regtest behavior; mining (auto or explicit) drives confirmations and block-denominated expiry.

## Lifecycle Commands

| Command                   | Behavior                                                          |
| ------------------------- | ----------------------------------------------------------------- |
| `node regtest.mjs start`  | Bring up the requested profiles, run setup + faucet flows         |
| `node regtest.mjs stop`   | Stop services, preserve volumes (fast restart)                    |
| `node regtest.mjs clean`  | Full teardown: remove containers + volumes; reset the signer set  |

Use `stop` between iterations of the same test session; use `clean` when changing image versions or recovering from stuck state.
