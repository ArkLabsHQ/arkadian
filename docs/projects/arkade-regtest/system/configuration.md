# Configuration

All configuration lives in a single file: `.env.defaults`. Overrides are layered on top through one of three discovery paths. There is no application-level config file — everything is environment variables consumed by Docker Compose interpolation and the `regtest.mjs` CLI.

## Environment Discovery (Priority Order)

`lib/env.mjs` always loads `.env.defaults` first, then layers the **first** override found from:

1. **`--env <path>` CLI flag** — explicit, highest priority
2. **`../.env.regtest`** — parent-repo override (typical submodule case)
3. **`.env`** — local override inside the arkade-regtest checkout

Variables in the override file replace their `.env.defaults` counterparts; unspecified variables keep their defaults. A variable already set in your shell environment wins over the files.

```bash
node regtest.mjs start --env /path/to/my.env   # explicit override
node regtest.mjs start                         # auto-discover ../.env.regtest or .env
```

## Configuration Categories

### Profiles
| Variable           | Default | Meaning                                                                 |
| ------------------ | ------- | ----------------------------------------------------------------------- |
| `REGTEST_PROFILES` | (empty) | Comma-separated profiles to bring up (`base`, `ark`, `delegate`, `boltz`, `emulator`, `solver`). Empty = full stack. A `--profile` flag overrides this. |

### Base-layer images (chain / indexer / explorer / counterparty LN)
| Variable                  | Default                                  |
| ------------------------- | ---------------------------------------- |
| `BITCOIN_IMAGE`           | `btcpayserver/bitcoin:31.0`              |
| `POSTGRES_IMAGE`          | `postgres:16`                            |
| `NBXPLORER_IMAGE`         | `nicolasdorier/nbxplorer:2.6.7`          |
| `FULCRUM_IMAGE`           | `cculianu/fulcrum:v2.1.1`                |
| `MARIADB_IMAGE`           | `mariadb:10.5`                           |
| `MEMPOOL_BACKEND_IMAGE`   | `mempool/backend:v3.3.1`                 |
| `MEMPOOL_FRONTEND_IMAGE`  | `mempool/frontend:v3.3.1`                |
| `LND_IMAGE`               | `btcpayserver/lnd:v0.19.3-beta`          |

> NBXplorer is pinned to `2.6.7` because it must parse Bitcoin Core 31's `getpeerinfo` response (NBitcoin); earlier nbxplorer crash-loops on Core 31.

### Ark-stack images
| Variable             | Default                                  |
| -------------------- | ---------------------------------------- |
| `ARKD_IMAGE`         | `ghcr.io/arkade-os/arkd:v0.9.9-rc.1`     |
| `ARKD_WALLET_IMAGE`  | `ghcr.io/arkade-os/arkd-wallet:v0.9.9-rc.1` |
| `FULMINE_IMAGE`      | `ghcr.io/arklabshq/fulmine:v0.3.25`      |
| `BOLTZ_LND_IMAGE`    | `btcpayserver/lnd:v0.19.3-beta`          |
| `BOLTZ_IMAGE`        | `boltz/boltz:latest`                     |
| `NGINX_IMAGE`        | `nginx:alpine`                           |
| `LNURL_IMAGE`        | `ghcr.io/arklabshq/lnurl-server:0.2.6`   |
| `WALLET_IMAGE`       | `ghcr.io/arkade-os/wallet:latest`        |
| `EXPLORER_IMAGE`     | `ghcr.io/arklabshq/arkade-explorer:latest` |
| `EMULATOR_IMAGE`     | `ghcr.io/arkade-os/emulator:v0.0.3`      |
| `SOLVER_IMAGE`       | `ghcr.io/arkade-os/solver:v0.0.1-rc.5`   |

arkd is **always** run from `ARKD_IMAGE` / `ARKD_WALLET_IMAGE` — there is no built-in fallback. The default `v0.9.9-rc.1` is required for the [signer rotation](#operator-signer-rotation) feature (deprecated-signer support landed after `v0.9.6`).

### Host ports
Only the host side of each mapping is configurable; container-internal ports are fixed. Override any that collide locally or when running multiple stacks side by side.

| Variable                                                              | Default                  | Service                          |
| -------------------------------------------------------------------- | ------------------------ | -------------------------------- |
| `BITCOIN_RPC_PORT` / `BITCOIN_P2P_PORT`                              | 18443 / 18444            | Bitcoin Core                     |
| `BITCOIN_ZMQ_BLOCK_PORT` / `BITCOIN_ZMQ_TX_PORT`                    | 28332 / 28333            | Bitcoin ZMQ                      |
| `NBXPLORER_PORT`                                                      | 32838                    | NBXplorer                        |
| `POSTGRES_PORT`                                                       | 39372                    | Postgres (arkd + nbxplorer DBs)  |
| `FULCRUM_TCP_PORT` / `FULCRUM_WS_PORT`                              | 50001 / 50003            | Fulcrum (Electrum)               |
| `MEMPOOL_WEB_PORT` / `MEMPOOL_API_PORT`                            | 3000 / 8999              | mempool explorer + Esplora `/api`|
| `LND_P2P_PORT` / `LND_RPC_PORT`                                    | 9735 / 10009             | Counterparty LND                 |
| `ARKD_PORT` / `ARKD_ADMIN_PORT`                                    | 7070 / 7071              | arkd server + admin              |
| `ARKD_WALLET_PORT`                                                   | 6060                     | arkd-wallet                      |
| `FULMINE_HTTP_PORT` / `FULMINE_API_PORT` / `FULMINE_GRPC_PORT`     | 7002 / 7003 / 7004       | Boltz Fulmine                    |
| `DELEGATOR_GRPC_PORT` / `DELEGATOR_API_PORT` / `DELEGATOR_HTTP_PORT`| 7010 / 7011 / 7012       | Fulmine delegator                |
| `BOLTZ_GRPC_PORT` / `BOLTZ_API_PORT` / `BOLTZ_WS_PORT`            | 9000 / 9001 / 9004       | Boltz backend                    |
| `BOLTZ_LND_P2P_PORT` / `BOLTZ_LND_RPC_PORT`                       | 9736 / 10010             | Boltz LND                        |
| `NGINX_PORT` / `LNURL_PORT`                                        | 9069 / 9090              | Nginx CORS proxy / LNURL         |
| `WALLET_PORT` / `EXPLORER_PORT`                                    | 3003 / 7080              | Arkade Wallet / Explorer         |
| `EMULATOR_PORT`                                                      | 7073                     | Emulator                         |
| `SOLVER_GRPC_PORT` / `SOLVER_HTTP_PORT`                            | 7090 / 7091              | Solver (remapped off arkd's 7070/7071) |

The CLI reads `ARKD_PORT` / `ARKD_ADMIN_PORT` itself, so overriding them keeps `start`'s arkd setup pointed at the right host ports.

### Auto-miner
| Variable            | Default | Meaning                                                              |
| ------------------- | ------- | -------------------------------------------------------------------- |
| `AUTOMINE_INTERVAL` | `600`   | Mine 1 block every N seconds. `0` disables it (mine explicitly).     |

Set to `0` when using block-denominated locktimes (see below) so the background miner can't advance the tip and fire sweeps/expiry mid-test.

### arkd configuration
| Variable                            | Default    | Meaning                                                |
| ----------------------------------- | ---------- | ------------------------------------------------------ |
| `ARKD_VTXO_TREE_EXPIRY`             | `1024`     | VTXO tree expiry (see magnitude rule below)            |
| `ARKD_UNILATERAL_EXIT_DELAY`        | `512`      | Unilateral exit delay                                  |
| `ARKD_PUBLIC_UNILATERAL_EXIT_DELAY` | `512`      | Public unilateral exit delay                           |
| `ARKD_BOARDING_EXIT_DELAY`          | `2048`     | Boarding exit delay                                    |
| `ARKD_CHECKPOINT_EXIT_DELAY`        | `1024`     | Checkpoint exit delay                                  |
| `ARKD_LIVE_STORE_TYPE`              | `inmemory` | Live store backend (`inmemory` or `redis`)             |
| `ARKD_LOG_LEVEL`                    | `4`        | arkd log level                                         |
| `ARKD_SESSION_DURATION`             | `30`       | Round session duration (seconds)                       |

**Magnitude rule (fast VTXO expiry).** arkd interprets the tree-expiry/exit-delay values by magnitude — the BIP68 boundary is **512** — and auto-selects its scheduler:

- **≥ 512** → **seconds**, wall-clock "time" scheduler (the default `1024` ≈ 17 min).
- **< 512** → **blocks**, regtest-only block scheduler. Expiry/sweeps fire when the chain **tip height** reaches the target — i.e. when you **mine**. arkd rejects block-denominated locktimes on non-regtest networks.

When using block values, **all five must share the same type** (all blocks or all seconds — arkd refuses a mismatch) **and** you must set `AUTOMINE_INTERVAL=0`. arkd's own e2e fast values are `ARKD_VTXO_TREE_EXPIRY=40`, `ARKD_UNILATERAL_EXIT_DELAY=20`, `ARKD_PUBLIC_UNILATERAL_EXIT_DELAY=20`, `ARKD_BOARDING_EXIT_DELAY=30`, `ARKD_CHECKPOINT_EXIT_DELAY=10`.

### Operator signer rotation
| Variable                  | Default                                                            | Meaning                                  |
| ------------------------- | ------------------------------------------------------------------ | ---------------------------------------- |
| `ARKD_WALLET_SIGNER_KEY`  | `afcd3fa10f82a05fddc9574fdb13b3991b568e89cc39a72ba4401df8abef35f0` | Boot signer key the wallet starts from (a known default, not self-generated) so even the first rotation can deprecate the boot signer. |

arkd-wallet reads its active signer from `ARKD_WALLET_SIGNER_KEY` and deprecated signers from `ARKD_WALLET_DEPRECATED_SIGNER_KEYS` (`<hexpriv>[:<cutoff>],…`). `rotate-signer` recreates arkd-wallet with the new env (reusing its on-chain volume), unlocks it, and restarts arkd to re-fetch the set; the CLI tracks keys in `.signer-state.json`. `set-signers --active <priv> --deprecated <priv>[:<cutoff>],…` applies an explicit set (the primitive ts-sdk e2e drives). Cutoffs are Unix-seconds or signed `+N`/`-N` offsets: no cutoff → DUE_NOW, future → MIGRATABLE, past → EXPIRED. `clean` resets the signer set.

### Faucet & wallet setup
| Variable             | Default     | Meaning                                            |
| -------------------- | ----------- | -------------------------------------------------- |
| `ARKD_PASSWORD`      | `secret`    | arkd wallet unlock password                        |
| `ARKD_FAUCET_AMOUNT` | `2`         | BTC funded into the Ark wallet at startup          |
| `FULMINE_NOTE_AMOUNT`| `100000000` | Offchain sats funded into Fulmine + delegator (credit note) |
| `LND_FAUCET_AMOUNT`  | `2`         | BTC funded into Boltz LND at startup               |
| `LND_CHANNEL_SIZE`   | `1000000`   | Channel capacity (sats) opened at startup          |

### Ark fees
| Variable                  | Default          | Meaning                              |
| ------------------------- | ---------------- | ------------------------------------ |
| `ARK_OFFCHAIN_INPUT_FEE`  | `amount * 0.01`  | CEL expression for off-chain input fee |
| `ARK_ONCHAIN_INPUT_FEE`   | `amount * 0.01`  | CEL expression for on-chain input fee  |
| `ARK_OFFCHAIN_OUTPUT_FEE` | `0.0`            | CEL expression for off-chain output fee|
| `ARK_ONCHAIN_OUTPUT_FEE`  | `250.0`          | CEL expression for on-chain output fee |

### Emulator (arkade-script signing service, default-on)
| Variable              | Default                            | Meaning                                                       |
| --------------------- | ---------------------------------- | ------------------------------------------------------------- |
| `EMULATOR_IMAGE`      | `ghcr.io/arkade-os/emulator:v0.0.3`| Image for the Emulator. Set to `""` to disable the overlay.   |
| `EMULATOR_PORT`       | `7073`                             | Host port for the emulator's `/v1/info` HTTP API.             |
| `EMULATOR_SECRET_KEY` | (32-byte hex; see `.env.defaults`) | Deterministic signing key; the matching x-only pubkey is reported on `/v1/info`. |
| `EMULATOR_ARKD_URL`   | `arkd:7070`                        | arkd hostname:port reachable inside the docker network.       |
| `EMULATOR_LOG_LEVEL`  | `4`                                | Emulator log level.                                           |

Started last, after arkd is wallet-ready. Disable for a faster boot with `EMULATOR_IMAGE=` in your override.

### Solver (arkade virtual-mempool intent solver)
| Variable                  | Default                                  | Meaning                                                       |
| ------------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| `SOLVER_IMAGE`            | `ghcr.io/arkade-os/solver:v0.0.1-rc.5`   | Image for the solver (`solver` profile).                      |
| `SOLVER_GRPC_PORT` / `SOLVER_HTTP_PORT` | `7090` / `7091`            | Host ports (remapped off arkd's 7070/7071 to avoid collision).|
| `SOLVER_WALLET_SEED`      | (32-byte / 64-hex; see `.env.defaults`)  | Deterministic wallet seed; must be even-length hex.           |
| `SOLVER_WALLET_PASSWORD`  | `password`                               | Solver wallet password.                                       |
| `SOLVER_LOG_LEVEL`        | `4`                                      | Solver log level.                                             |

The `solver` profile depends on arkd **and** the emulator (`SOLVER_EMULATOR_URL` is required), so selecting it pulls in both.

## Override File Patterns

### Submodule consumer (parent repo)
Create `.env.regtest` at the parent repo root (auto-discovered via `../.env.regtest`):
```bash
ARKD_IMAGE=ghcr.io/arkade-os/arkd:v0.9.9-rc.1
ARKD_WALLET_IMAGE=ghcr.io/arkade-os/arkd-wallet:v0.9.9-rc.1
REGTEST_PROFILES=ark,boltz
```

### Local-only override
Create `.env` inside arkade-regtest (lower priority than `../.env.regtest`):
```bash
BOLTZ_API_PORT=9101   # avoid host port conflict
```

### Explicit per-invocation
```bash
node regtest.mjs start --env /tmp/scenario-A.env
```
