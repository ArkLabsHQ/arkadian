# Usage

Quick-start guide for running and using the arkade-regtest stack.

## Prerequisites

- **Docker** + **Docker Compose** (v2 plugin form: `docker compose ...`)
- **git** with submodule support (when used as a submodule)
- **Go 1.23+** — only required when building Nigiri from source (the default)
- **bash** + standard POSIX tools

## Start the Environment

From the arkade-regtest checkout:
```bash
./start-env.sh
```

This will:
1. Load `.env.defaults` (and any override file).
2. Build Nigiri from source (or use the system binary if `NIGIRI_BRANCH=""`).
3. Start nigiri (Bitcoin + arkd + arkd-wallet + electrs/esplora/chopsticks).
4. Optionally swap nigiri's arkd for `ARKD_IMAGE` if it's set.
5. Bring up the Ark compose stack (Boltz, Fulmine, LND, Wallet, Nginx, LNURL).
6. Run faucet flows (fund Ark wallet, fulmine, Boltz LND, open LN channel).

First run takes longer (nigiri source build). Subsequent runs are fast — the binary is cached in `_build/`.

### Useful Flags

```bash
./start-env.sh --clean              # Force rebuild of nigiri
./start-env.sh --env path/.env      # Use explicit override file
```

## Stop the Environment

Two lifecycle modes:

```bash
./stop-env.sh   # Stop services, preserve volumes (fast restart)
./clean-env.sh  # Full teardown: stop + remove containers, volumes, _build/
```

Use `stop` between iterations of the same test session. Use `clean` when changing image versions or when state corruption is suspected.

## Service Endpoints

After startup, services are reachable on `localhost`:

| Service          | Endpoint               | Notes                                  |
| ---------------- | ---------------------- | -------------------------------------- |
| Bitcoin RPC      | `localhost:18443`      | nigiri default; user `admin1` / `123`  |
| arkd gRPC        | `localhost:7070`       | nigiri-bundled or override image       |
| Fulmine HTTP     | `localhost:7002`       | Web UI / health                        |
| Fulmine API      | `localhost:7003`       | REST API                               |
| Fulmine gRPC     | `localhost:7004`       | gRPC                                   |
| Boltz gRPC       | `localhost:9000`       |                                        |
| Boltz REST       | `localhost:9001`       |                                        |
| Boltz WS         | `localhost:9004`       |                                        |
| Nginx (CORS)     | `localhost:9069`       | CORS proxy fronting Boltz              |
| LNURL Server     | `localhost:9090`       |                                        |
| Boltz LND P2P    | `localhost:9736`       |                                        |
| Boltz LND RPC    | `localhost:10010`      |                                        |
| Wallet (PWA)     | `localhost:3003`       | Open in browser                        |

Other nigiri services (electrs, esplora, chopsticks) keep their standard nigiri ports.

## Lightning Helpers

Convenience scripts for testing payment flows through Boltz:

```bash
./helpers/create-invoice.sh                   # Invoice on primary (boltz-lnd)
./helpers/create-invoice.sh --secondary       # Invoice on secondary (lnd)
./helpers/pay-invoice.sh <bolt11>             # Pay from boltz-lnd
```

Useful when manually exercising Boltz reverse swaps (Lightning → Ark) or submarine swaps (Ark → Lightning).

## Typical Workflows

### Run integration tests against the stack
```bash
./start-env.sh
go test ./...               # or whatever your test command is
./stop-env.sh
```

### Test a specific arkd build
```bash
echo 'ARKD_IMAGE=ghcr.io/arkade-os/arkd:v0.9.0'         > .env
echo 'ARKD_WALLET_IMAGE=ghcr.io/arkade-os/arkd-wallet:v0.9.0' >> .env
./start-env.sh
```

### Use as a submodule
From the parent repo:
```bash
git submodule add https://github.com/arkade-os/arkade-regtest.git regtest
echo 'ARKD_IMAGE=ghcr.io/arkade-os/arkd:v0.9.0' >> .env.regtest
./regtest/start-env.sh
```
The launcher auto-discovers `../.env.regtest` from inside `regtest/`.

## Logs & Debugging

```bash
docker compose -p nigiri logs -f boltz-fulmine
docker compose -p nigiri logs -f boltz
docker compose -p nigiri logs -f boltz-lnd
docker exec -it boltz-lnd lncli --network=regtest getinfo
```

The compose project name is `nigiri` (intentional — services attach to the network nigiri creates).
