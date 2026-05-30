# Architecture

arkade-regtest is a thin orchestration layer that composes upstream services into a single reproducible Ark regtest stack. There is no compiled code in the repo — the architecture is defined by Bash scripts and Docker Compose files.

## High-Level Diagram

```
                               ┌─────────────────────────────┐
                               │         start-env.sh         │
                               │  (launcher / orchestrator)   │
                               └──────────────┬──────────────┘
                                              │
                  ┌───────────────────────────┼───────────────────────────┐
                  ▼                           ▼                           ▼
        ┌──────────────────┐      ┌────────────────────┐      ┌────────────────────┐
        │  lib/env.sh      │      │  Nigiri resolver   │      │  docker compose up │
        │  (env loader)    │      │  (build or system) │      │  (compose stack)   │
        └──────────────────┘      └─────────┬──────────┘      └─────────┬──────────┘
                                            │                           │
                                            ▼                           ▼
                                  ┌──────────────────────┐    ┌────────────────────┐
                                  │  Bitcoin + arkd      │    │ Boltz + Fulmine +  │
                                  │  + arkd-wallet       │    │ LND + Wallet +     │
                                  │  (nigiri-managed)    │    │ Nginx + LNURL      │
                                  └──────────────────────┘    └────────────────────┘
```

## Component Layers

### 1. Launcher Layer (`start-env.sh`)
Entry point. Responsibilities, in order:
1. Verify the script is run from a populated checkout (not an empty submodule).
2. Parse `--clean` and `--env <path>` flags.
3. Source `lib/env.sh` and call `load_env "$SCRIPT_DIR"`.
4. Export environment variables for compose interpolation.
5. Resolve `nigiri` (build from source or use system binary).
6. Bring up nigiri (Bitcoin + arkd by default).
7. Optionally swap nigiri's arkd for an override image (`ARKD_IMAGE`).
8. Bring up the Ark compose stack (Boltz, Fulmine, LND, Wallet, Nginx, LNURL).
9. Run faucet flows so wallets and LND start with usable balances. The CLI client wallet is always funded with 100M sats offchain via `arkd note` / `ark redeem-notes` on the happy path (falls back to a `WARNING:` log on older arkd versions that don't support redeem-notes).
10. If `EMULATOR_IMAGE` is set (default), bring up the arkade-script Emulator overlay on the `nigiri` network and wait for `GET /v1/info` to respond before returning.

### 2. Environment Layer (`lib/env.sh` + `.env.defaults`)
Centralized environment loading shared by `start-env.sh` (via the script). Behavior:
- `.env.defaults` is always sourced first (baseline).
- The first matching override is sourced on top:
  1. `--env <path>` flag value
  2. `../.env.regtest` (parent repo, the typical submodule case)
  3. `.env` (local override inside arkade-regtest)
- Override files only need to specify variables that differ; missing variables keep their defaults.
- After overrides are applied, `lib/env.sh` derives `ARK_CONTAINER` once (`arkd` when `ARKD_IMAGE` is set, `ark` for nigiri built-in) and exports it. All downstream scripts (`start-env.sh`, `stop-env.sh`, `clean-env.sh`, compose override) use `$ARK_CONTAINER` instead of branching on mode, and SDK tests can pin a specific container name by exporting `ARK_CONTAINER` themselves.

This design lets parent repos (arkd, fulmine, etc.) pin versions and ports in `.env.regtest` without modifying arkade-regtest itself.

Wallet setup is also unified across modes: both the nigiri built-in arkd and the `ARKD_IMAGE` override path call the admin API directly (seed → create → unlock via `docker exec $ARK_CONTAINER`), then wait up to 60 attempts for the wallet to sync before running faucet flows.

### 3. Nigiri Layer
By default, Nigiri is built from source from `NIGIRI_REPO_URL` on branch `NIGIRI_BRANCH` (default `master`) into `_build/nigiri/`. The resulting binary is platform-specific (`nigiri-${os}-${arch}`).

The `--clean` flag forces a full rebuild. Setting `NIGIRI_BRANCH=""` opts out of the source build and uses whatever `nigiri` binary is on `$PATH`.

Nigiri itself manages: Bitcoin Core, electrs, esplora, chopsticks, arkd (and optionally Liquid components).

### 4. Compose Layer (`docker/docker-compose.ark.yml`)
Compose project name is `nigiri` (intentional — services attach to the same network nigiri creates). Services defined here:
- **boltz-lnd** — `btcpayserver/lnd` configured against `bitcoin` and `nbxplorer`
- **boltz-fulmine** — `ghcr.io/arklabshq/fulmine` pointed at the in-stack arkd
- **boltz** — `boltz/boltz` connecting to `bitcoin`, `boltz-lnd`, and arkd
- **boltz-nginx** — CORS-enabled proxy fronting Boltz REST/gRPC/WS
- **boltz-lnurl** — LNURL endpoint server
- **wallet** — Ark Wallet PWA

A second compose file (`docker-compose.arkd-override.yml`) is conditionally applied when `ARKD_IMAGE` is set, replacing nigiri's bundled arkd with an explicit image and propagating all `ARKD_*` configuration variables.

A third compose file (`docker-compose.emulator.yml`) brings up the arkade-script Emulator signing service on the same `nigiri` network. It is applied **by default** (the `EMULATOR_IMAGE` is pinned in `.env.defaults`) and skipped when an override clears the variable. The overlay starts after arkd is wallet-ready because `EMULATOR_ARKD_URL` must resolve to a live arkd that accepts `SubmitTx` — the emulator forwards finalized arkade transactions back to arkd. Data is held in a tmpfs (stateless across regtest sessions; the signing identity lives in `EMULATOR_SECRET_KEY`).

### 5. Helper Layer (`helpers/`)
Convenience scripts that wrap `lncli` calls inside the `boltz-lnd` (or `lnd`) container:
- `create-invoice.sh [--secondary]` — generate a Lightning invoice
- `pay-invoice.sh <bolt11>` — pay an invoice and print the result

These are not part of the compose stack — they are operator tools used during interactive testing.

## Networking

All services run on the Docker network created by the `nigiri` compose project. Container hostnames (`bitcoin`, `arkd`, `boltz-lnd`, `boltz-fulmine`, `boltz`, etc.) are used inside the network. The host exposes a fixed set of ports (configurable via `.env.defaults`):

| Service            | Default Port |
| ------------------ | ------------ |
| Boltz LND P2P      | 9736         |
| Boltz LND RPC      | 10010        |
| Fulmine HTTP       | 7002         |
| Fulmine API        | 7003         |
| Fulmine gRPC       | 7004         |
| Delegator gRPC/API/HTTP | 7010 / 7011 / 7012 |
| Boltz gRPC         | 9000         |
| Boltz REST API     | 9001         |
| Boltz WebSocket    | 9004         |
| Nginx (CORS proxy) | 9069         |
| LNURL Server       | 9090         |
| Wallet (PWA)       | 3003         |
| Emulator           | 7073         |

Nigiri-managed services (Bitcoin RPC, electrs, esplora, chopsticks, arkd) keep their standard nigiri ports.

## Data Flow

A typical Ark settlement test follows:

1. **Funding** — `arkd` mines blocks via Bitcoin Core; faucet flow sends BTC to the Ark wallet, fulmine wallet, and Boltz LND.
2. **Boarding** — wallet client locks BTC on-chain via arkd to receive VTXOs.
3. **Off-chain transfer** — wallet → wallet payment processed through arkd rounds.
4. **Boltz swap** — Lightning ↔ Ark via Boltz backend + Fulmine, settling against the on-chain state managed by Bitcoin Core / LND.
5. **Settlement / exit** — VTXOs settled in a round or unilaterally exited back to the chain.

Every leg of this flow runs against in-stack services with deterministic regtest behavior.

## Lifecycle Scripts

| Script           | Behavior                                                          |
| ---------------- | ----------------------------------------------------------------- |
| `start-env.sh`   | Build/start nigiri + compose stack, run faucet flows              |
| `stop-env.sh`    | `docker compose stop` — preserves volumes for fast restart        |
| `clean-env.sh`   | Full teardown: `down -v`, remove `_build/`, prune leftover state  |

Use `stop` between iterations of the same test session; use `clean` when changing image versions or debugging stuck state.
