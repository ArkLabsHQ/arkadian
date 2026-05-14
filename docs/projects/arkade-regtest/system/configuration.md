# Configuration

All configuration lives in a single file: `.env.defaults`. Overrides are layered on top through one of three discovery paths. There is no application-level config file — everything is environment variables consumed by Docker Compose interpolation and the launcher scripts.

## Environment Discovery (Priority Order)

`lib/env.sh` always sources `.env.defaults` first, then layers the **first** override found from:

1. **`--env <path>` CLI flag** — explicit, highest priority
2. **`../.env.regtest`** — parent-repo override (typical submodule case)
3. **`.env`** — local override inside the arkade-regtest checkout

Variables in the override file replace their `.env.defaults` counterparts; unspecified variables keep their default values.

```bash
./start-env.sh --env /path/to/my.env   # explicit override
./start-env.sh                         # auto-discover ../.env.regtest or .env
```

## Configuration Categories

### Nigiri Resolution
| Variable          | Default                                       | Meaning                                                          |
| ----------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| `NIGIRI_BRANCH`   | `master`                                      | Build nigiri from this branch. Set to `""` to use system nigiri. |
| `NIGIRI_REPO_URL` | `https://github.com/vulpemventures/nigiri.git`| Source repo for nigiri build.                                    |

When `NIGIRI_BRANCH` is non-empty, `start-env.sh` clones/pulls the repo into `_build/nigiri/` and builds the platform-specific binary. The `--clean` flag forces a rebuild.

### arkd Image Override
| Variable             | Default | Meaning                                                            |
| -------------------- | ------- | ------------------------------------------------------------------ |
| `ARKD_IMAGE`         | (empty) | If set, replace nigiri's built-in arkd with this image.            |
| `ARKD_WALLET_IMAGE`  | (empty) | If set, replace nigiri's built-in arkd-wallet with this image.     |
| `ARK_CONTAINER`      | (auto)  | Ark container name used for `docker exec` (wallet setup, faucet, logs). Auto-derived: `arkd` when `ARKD_IMAGE` is set, `ark` for nigiri built-in. Override only if your SDK tests expect a specific container name. |

Example pinning to a release:
```bash
ARKD_IMAGE=ghcr.io/arkade-os/arkd:v0.9.0
ARKD_WALLET_IMAGE=ghcr.io/arkade-os/arkd-wallet:v0.9.0
```

When set, `start-env.sh` brings up `docker-compose.arkd-override.yml` which propagates all `ARKD_*` configuration variables.

### Pinned Image Versions
| Variable           | Default                                  |
| ------------------ | ---------------------------------------- |
| `BOLTZ_LND_IMAGE`  | `btcpayserver/lnd:v0.19.3-beta`          |
| `FULMINE_IMAGE`    | `ghcr.io/arklabshq/fulmine:v0.3.23`      |
| `BOLTZ_IMAGE`      | `boltz/boltz:latest`                     |
| `NGINX_IMAGE`      | `nginx:alpine`                           |
| `LNURL_IMAGE`      | `ghcr.io/arklabshq/lnurl-server:0.1.0`   |
| `WALLET_IMAGE`     | `ghcr.io/arkade-os/wallet:latest`        |

Override any of these to test specific upstream versions.

### Ports
| Variable                 | Default | Service                  |
| ------------------------ | ------- | ------------------------ |
| `BOLTZ_LND_P2P_PORT`     | 9736    | Boltz LND P2P            |
| `BOLTZ_LND_RPC_PORT`     | 10010   | Boltz LND RPC            |
| `FULMINE_HTTP_PORT`      | 7002    | Fulmine HTTP             |
| `FULMINE_API_PORT`       | 7003    | Fulmine API              |
| `FULMINE_GRPC_PORT`      | 7004    | Fulmine gRPC             |
| `DELEGATOR_GRPC_PORT`    | 7010    | Delegator gRPC           |
| `DELEGATOR_API_PORT`     | 7011    | Delegator API            |
| `DELEGATOR_HTTP_PORT`    | 7012    | Delegator HTTP           |
| `BOLTZ_GRPC_PORT`        | 9000    | Boltz gRPC               |
| `BOLTZ_API_PORT`         | 9001    | Boltz REST API           |
| `BOLTZ_WS_PORT`          | 9004    | Boltz WebSocket          |
| `NGINX_PORT`             | 9069    | Nginx CORS proxy         |
| `LNURL_PORT`             | 9090    | LNURL Server             |
| `WALLET_PORT`            | 3003    | Wallet (PWA)             |

### arkd Wallet (override mode only)
| Variable                  | Default                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| `ARKD_WALLET_SIGNER_KEY`  | `afcd3fa10f82a05fddc9574fdb13b3991b568e89cc39a72ba4401df8abef35f0` |

### arkd Configuration (override mode only)
| Variable                    | Default    | Meaning                                                |
| --------------------------- | ---------- | ------------------------------------------------------ |
| `ARKD_SCHEDULER_TYPE`       | `gocron`   | Round scheduler implementation                         |
| `ARKD_ALLOW_CSV_BLOCK_TYPE` | `false`    | Allow CSV block-locktime closures                      |
| `ARKD_VTXO_TREE_EXPIRY`     | `1024`     | VTXO tree expiry (blocks)                              |
| `ARKD_UNILATERAL_EXIT_DELAY`| `512`      | Unilateral exit delay (blocks)                         |
| `ARKD_BOARDING_EXIT_DELAY`  | `2048`     | Boarding exit delay (blocks)                           |
| `ARKD_LIVE_STORE_TYPE`      | `inmemory` | Live store backend (`inmemory` or `redis`)             |
| `ARKD_LOG_LEVEL`            | `4`        | arkd log level                                         |
| `ARKD_SESSION_DURATION`     | `30`       | Round session duration (seconds)                       |
| `ARKD_ROUND_INTERVAL`       | `10`       | Round interval (seconds)                               |

### Faucet & Wallet Setup
| Variable                | Default | Meaning                                  |
| ----------------------- | ------- | ---------------------------------------- |
| `ARKD_PASSWORD`         | `secret`| Arkd wallet unlock password              |
| `ARKD_FAUCET_AMOUNT`    | `2`     | BTC funded into Ark wallet at startup    |
| `FULMINE_FAUCET_AMOUNT` | `0.01`  | BTC funded into fulmine at startup       |
| `LND_FAUCET_AMOUNT`     | `2`     | BTC funded into Boltz LND at startup     |
| `LND_CHANNEL_SIZE`      | `1000000`| Channel capacity (sats) opened at startup|

### Bitcoin Core Behavior
| Variable          | Default | Meaning                                                  |
| ----------------- | ------- | -------------------------------------------------------- |
| `BITCOIN_LOW_FEE` | `true`  | Enable very-low-fee policy (may break nbxplorer link)    |

Set to `false` if your tests don't need very-low-fee transactions and you want stable nbxplorer connectivity.

### Ark Fees
| Variable                    | Default          | Meaning                                              |
| --------------------------- | ---------------- | ---------------------------------------------------- |
| `ARK_OFFCHAIN_INPUT_FEE`    | `amount * 0.01`  | CEL expression for off-chain input fee               |
| `ARK_ONCHAIN_INPUT_FEE`     | `amount * 0.01`  | CEL expression for on-chain input fee                |
| `ARK_OFFCHAIN_OUTPUT_FEE`   | `0.0`            | CEL expression for off-chain output fee              |
| `ARK_ONCHAIN_OUTPUT_FEE`    | `250.0`          | CEL expression for on-chain output fee               |

These are CEL expressions parsed by arkd's programmable fee system.

## Override File Patterns

### Submodule consumer (parent repo)
Create `.env.regtest` next to your parent repo's root. arkade-regtest auto-discovers it via `../.env.regtest`:
```bash
ARKD_IMAGE=ghcr.io/arkade-os/arkd:v0.9.0
ARKD_WALLET_IMAGE=ghcr.io/arkade-os/arkd-wallet:v0.9.0
NIGIRI_BRANCH=""     # use system nigiri instead of building
```

### Local-only override
Create `.env` inside arkade-regtest. Lower priority than `../.env.regtest`:
```bash
BOLTZ_API_PORT=9101  # avoid host port conflict
```

### Explicit per-invocation
```bash
./start-env.sh --env /tmp/scenario-A.env
```
