# How to Run

Detailed guide for launching the arkade-regtest stack across local and CI environments.

## Prerequisites

| Requirement      | Why                                                                         |
| ---------------- | --------------------------------------------------------------------------- |
| Docker + Compose | All services run as containers via `docker compose`                         |
| Node.js ≥ 18     | Runs `regtest.mjs` (standard library only — no `npm install`)              |
| git              | Required for submodule usage                                                |
| Disk: ~2 GB      | Docker images for the full stack                                            |
| Free ports       | See the port table in [usage.md](./usage.md)                               |

No Go toolchain and no nigiri build are required. The stack is cross-platform (Linux / macOS / Windows, no WSL).

## Standalone Run

```bash
git clone https://github.com/arkade-os/arkade-regtest.git
cd arkade-regtest
node regtest.mjs start
```

First run pulls the Docker images (slower); subsequent runs reuse the local image cache.

## Profiles

Bring up just the tier you need; the CLI resolves the dependency closure automatically.

| Profile    | Services                                                          | Depends on        |
| ---------- | ----------------------------------------------------------------- | ----------------- |
| `base`     | bitcoin, postgres, nbxplorer, fulcrum, mempool (api/web/db), lnd  | —                 |
| `ark`      | arkd, arkd-wallet, arkade-wallet, arkade-explorer                 | `base`            |
| `delegate` | fulmine-delegator                                                 | `ark`             |
| `boltz`    | boltz, boltz-fulmine, boltz-lnd, nginx-boltz, lnurl-server        | `ark`             |
| `emulator` | emulator                                                          | `ark`             |
| `solver`   | solver                                                            | `ark`, `emulator` |

```bash
node regtest.mjs start                      # full stack (all profiles)
node regtest.mjs start --profile base       # chain + explorer/indexer
node regtest.mjs start --profile boltz      # base + ark + boltz
node regtest.mjs start --profile emulator --profile boltz   # combine
```

Pin profiles via `REGTEST_PROFILES` (comma-separated) instead of flags. Precedence: `--profile` > `REGTEST_PROFILES` > full stack. `stop`/`clean` always act on the whole project.

## Submodule Run

```bash
git submodule add https://github.com/arkade-os/arkade-regtest.git regtest
git submodule update --init --recursive
```

Configure overrides at the parent repo root:
```bash
cat > .env.regtest <<'EOF'
ARKD_IMAGE=ghcr.io/arkade-os/arkd:v0.9.9-rc.1
ARKD_WALLET_IMAGE=ghcr.io/arkade-os/arkd-wallet:v0.9.9-rc.1
REGTEST_PROFILES=ark,boltz
EOF
```

Launch (the CLI auto-discovers `../.env.regtest` from inside `regtest/`):
```bash
node regtest/regtest.mjs start
```

## CI Integration (GitHub Actions)

```yaml
- uses: actions/checkout@v4
  with:
    submodules: true

- uses: actions/setup-node@v4
  with:
    node-version: '20'

- name: Start regtest environment
  run: node regtest/regtest.mjs start

- name: Run tests
  run: <your test command>

- name: Cleanup
  if: always()
  run: node regtest/regtest.mjs clean
```

No build cache step is needed — the stack is pulled Docker images only. No Go setup, no nigiri PATH/cache.

## Lifecycle Commands

| Command                   | What it does                                                          |
| ------------------------- | --------------------------------------------------------------------- |
| `node regtest.mjs start`  | Bring up the requested profiles, run setup + faucet flows             |
| `node regtest.mjs stop`   | Stop services; preserves volumes (fast restart)                       |
| `node regtest.mjs clean`  | Full teardown: remove containers + volumes; resets the signer set     |

`npm start` / `npm stop` / `npm run clean` alias the three lifecycle commands. Use `stop` between test iterations to keep state; use `clean` when changing image versions or recovering from corrupted state.

## Verifying Startup

After `start` returns, sanity-check:

```bash
# Bitcoin Core
node regtest.mjs rpc getblockchaininfo | jq '.chain'   # → "regtest"

# arkd
grpcurl -plaintext localhost:7070 list 2>/dev/null | head     # gRPC service list

# Esplora REST (via mempool)
curl -s http://localhost:3000/api/blocks/tip/height

# Boltz REST
curl -s http://localhost:9001/version | jq

# Boltz LND
docker exec boltz-lnd lncli --network=regtest getinfo | jq '.alias'
```

## Selecting Versions

Every service runs from an overridable `*_IMAGE` variable (see `system/configuration.md`). Pin any of them in your override file:

```bash
ARKD_IMAGE=ghcr.io/arkade-os/arkd:v0.9.9-rc.1
ARKD_WALLET_IMAGE=ghcr.io/arkade-os/arkd-wallet:v0.9.9-rc.1
FULMINE_IMAGE=ghcr.io/arklabshq/fulmine:v0.3.25
```

arkd is always run from `ARKD_IMAGE` / `ARKD_WALLET_IMAGE` — there is no built-in fallback. The default `v0.9.9-rc.1` is required for the signer-rotation feature.
