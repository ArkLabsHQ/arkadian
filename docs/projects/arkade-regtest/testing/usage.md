# Usage

Quick-start guide for running and using the arkade-regtest stack.

## Prerequisites

- **Docker** + the **`docker compose`** plugin
- **Node.js ≥ 18** (standard library only — no `npm install` needed)
- **git** with submodule support (when used as a submodule)

No Go toolchain and no nigiri build are required — the stack is pulled Docker images plus the Node CLI. Runs the same on Linux, macOS, and Windows (no WSL).

## Start the Environment

From the arkade-regtest checkout:
```bash
node regtest.mjs start                  # full stack (all profiles)
```

You can scope to a profile (the CLI resolves dependencies automatically):
```bash
node regtest.mjs start --profile base   # chain + explorer/indexer only
node regtest.mjs start --profile ark    # base + ark (incl. wallet + explorer)
node regtest.mjs start --profile boltz  # base + ark + boltz
node regtest.mjs start --profile solver # base + ark + emulator + solver
node regtest.mjs start --profile emulator --profile boltz   # combine targets
```

`start` brings up the requested profiles, sets up the arkd wallet (seed → create → unlock), funds the wallets/LND, initializes the `ark` client, and starts the auto-miner. Profiles can also be pinned via `REGTEST_PROFILES` in an env file. npm aliases: `npm start`, `npm stop`, `npm run clean`.

## Stop the Environment

```bash
node regtest.mjs stop    # stop services, preserve volumes (fast restart)
node regtest.mjs clean   # full teardown: remove containers + volumes (resets signer set)
```

Use `stop` between iterations of the same test session. Use `clean` when changing image versions or when state corruption is suspected. Both always act on the whole project regardless of profiles.

## Chain & Wallet Commands

```bash
node regtest.mjs faucet <addr> <btc> [--confirm]   # send from node wallet; --confirm mines 1
node regtest.mjs mine [n]                           # mine n blocks (default 1)
node regtest.mjs reorg [depth]                      # simulate a reorg (default 1)
node regtest.mjs rpc <args...>                      # bitcoin-cli passthrough
node regtest.mjs ark <args...>                      # ark client CLI (inside arkd container)
node regtest.mjs arkd <args...>                     # arkd server CLI (e.g. arkd note --amount 100000000)
```

> **Auto-miner.** One block is mined every `AUTOMINE_INTERVAL` seconds (default **600**); set `AUTOMINE_INTERVAL=0` to mine only explicitly — required when using block-denominated locktimes for fast expiry/sweep tests.

## Service Endpoints

After startup, services are reachable on `localhost`:

| Service            | Endpoint                          | Notes                                  |
| ------------------ | --------------------------------- | -------------------------------------- |
| Bitcoin Core RPC   | `localhost:18443`                 | user `admin1` / `123`                  |
| Mempool explorer   | `http://localhost:3000`           | block explorer                         |
| Esplora REST API   | `http://localhost:3000/api`       | arkd/fulmine backend (mempool `/api`)  |
| Fulcrum (Electrum) | `localhost:50001` / `:50003`      | TCP / WS                               |
| NBXplorer          | `http://localhost:32838`          |                                        |
| Postgres           | `localhost:39372`                 | DBs: arkd, nbxplorer                    |
| arkd               | `http://localhost:7070`           | admin `7071`                           |
| arkd-wallet        | `http://localhost:6060`           |                                        |
| Fulmine API        | `http://localhost:7003`           | HTTP `7002`, gRPC `7004`               |
| Delegator API      | `http://localhost:7011`           | gRPC `7010`, HTTP `7012`               |
| Boltz gRPC / REST / WS | `localhost:9000` / `:9001` / `:9004` |                                 |
| Nginx (CORS proxy) | `http://localhost:9069`           | fronts Boltz                           |
| LNURL Server       | `http://localhost:9090`           |                                        |
| Boltz LND RPC      | `localhost:10010`                 | P2P `9736`                             |
| Web wallet         | `http://localhost:3003`           | open in browser                        |
| Arkade explorer    | `http://localhost:7080`           |                                        |
| Emulator           | `http://localhost:7073`           | arkade-script signer (`GET /v1/info`)  |
| Solver HTTP / gRPC | `http://localhost:7091` / `localhost:7090` | `solver` profile             |

## Lightning Helpers

```bash
node regtest.mjs create-invoice               # 100k-sat invoice on boltz-lnd
node regtest.mjs create-invoice --secondary   # mint on the secondary (lnd) node
node regtest.mjs pay-invoice <invoice>        # pay from the non-destination node
```

Useful when manually exercising Boltz reverse swaps (Lightning → Ark) or submarine swaps (Ark → Lightning).

## Typical Workflows

### Run integration tests against the stack
```bash
node regtest.mjs start
<your test command>          # e.g. go test ./... / vitest / dotnet test
node regtest.mjs stop
```

### Use as a submodule (from the parent repo)
```bash
git submodule add https://github.com/arkade-os/arkade-regtest.git regtest
echo 'ARKD_IMAGE=ghcr.io/arkade-os/arkd:v0.9.9-rc.1' >> .env.regtest
node regtest/regtest.mjs start
```
The CLI auto-discovers `../.env.regtest` from inside `regtest/`.

## Logs & Debugging

```bash
docker compose -p arkade-regtest logs -f boltz-fulmine
docker compose -p arkade-regtest logs -f arkd
docker exec -it boltz-lnd lncli --network=regtest getinfo
```

The compose project name is `arkade-regtest`.
