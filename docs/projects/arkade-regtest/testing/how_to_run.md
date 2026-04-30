# How to Run

Detailed guide for launching the arkade-regtest stack across local and CI environments.

## Prerequisites

| Requirement      | Why                                                                         |
| ---------------- | --------------------------------------------------------------------------- |
| Docker + Compose | All services run as containers via `docker compose`                         |
| Go 1.23+         | Required to build Nigiri from source (default behavior)                     |
| git              | Required for submodule usage and for cloning the nigiri repo into `_build/` |
| Bash + jq        | `start-env.sh` and helpers use bash; helpers use `jq`                       |
| Disk: ~2 GB      | Docker images + nigiri build cache (`_build/nigiri/`)                       |
| Free ports       | See port table in [usage.md](./usage.md)                                    |

If `NIGIRI_BRANCH=""` is set in your override, you must have `nigiri` already installed and on `$PATH`; Go is no longer required.

## Standalone Run

```bash
git clone https://github.com/arkade-os/arkade-regtest.git
cd arkade-regtest
./start-env.sh
```

First run builds nigiri from source. Expect 1-5 minutes depending on network/CPU. Subsequent runs reuse the cached binary in `_build/`.

## Submodule Run

Add to a parent repo:
```bash
git submodule add https://github.com/arkade-os/arkade-regtest.git regtest
git submodule update --init --recursive
```

Configure overrides at the parent repo root:
```bash
cat > .env.regtest <<'EOF'
ARKD_IMAGE=ghcr.io/arkade-os/arkd:v0.9.0
ARKD_WALLET_IMAGE=ghcr.io/arkade-os/arkd-wallet:v0.9.0
EOF
```

Launch:
```bash
./regtest/start-env.sh
```

The launcher auto-discovers `../.env.regtest` from inside `regtest/`. No flag is needed.

## CI Integration (GitHub Actions)

```yaml
- uses: actions/checkout@v4
  with:
    submodules: true

- uses: actions/setup-go@v5
  with:
    go-version: '1.23'

- uses: actions/cache@v4
  with:
    path: regtest/_build
    key: nigiri-${{ hashFiles('regtest/.env.defaults', '.env.regtest') }}

- name: Start regtest environment
  run: ./regtest/start-env.sh

- name: Run tests
  run: <your test command>

- name: Cleanup
  if: always()
  run: ./regtest/clean-env.sh
```

Caching `regtest/_build` significantly speeds up subsequent CI runs by avoiding the nigiri rebuild.

## Launcher Flags

| Flag             | Effect                                                                       |
| ---------------- | ---------------------------------------------------------------------------- |
| `--clean`        | Force rebuild of Nigiri from source (clones/pulls fresh and rebuilds)        |
| `--env <path>`   | Use the given override file (highest priority of the three discovery paths) |

All other configuration goes through the env file (see `system/configuration.md`).

## Lifecycle Commands

| Command            | What it does                                                          |
| ------------------ | --------------------------------------------------------------------- |
| `./start-env.sh`   | Bring up the full stack, run faucet flows                             |
| `./stop-env.sh`    | `docker compose stop` for both compose projects; preserves volumes    |
| `./clean-env.sh`   | Full teardown: `down -v`, removes `_build/`, prunes leftover state    |

Use `stop` between test iterations to keep state. Use `clean` when changing image versions or recovering from corrupted state.

## Verifying Startup

After `start-env.sh` returns, sanity-check:

```bash
# Bitcoin Core
curl -s -u admin1:123 -H 'content-type: text/plain;' \
  --data '{"jsonrpc":"1.0","id":"1","method":"getblockchaininfo","params":[]}' \
  http://localhost:18443/ | jq '.result.chain'   # → "regtest"

# arkd
grpcurl -plaintext localhost:7070 list  2>/dev/null | head     # gRPC service list

# Boltz REST
curl -s http://localhost:9001/version | jq

# Fulmine HTTP
curl -s http://localhost:7002/health  # or /api/v1/info

# Boltz LND
docker exec boltz-lnd lncli --network=regtest getinfo | jq '.alias'   # → "Ark Labs"
```

## Selecting Versions

Two overlapping mechanisms control versions:

**Image pin variables** (always honored):
- `BOLTZ_LND_IMAGE`, `FULMINE_IMAGE`, `BOLTZ_IMAGE`, `NGINX_IMAGE`, `LNURL_IMAGE`, `WALLET_IMAGE`

**arkd override** (special-cased):
- `ARKD_IMAGE` and `ARKD_WALLET_IMAGE` — when set, nigiri's bundled arkd is stopped and replaced via `docker-compose.arkd-override.yml`. All `ARKD_*` config variables apply only in this mode.

For Nigiri-managed services (Bitcoin Core, electrs, esplora, chopsticks) you control versions by pinning `NIGIRI_BRANCH` to a specific commit/branch.
