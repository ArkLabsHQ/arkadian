# How to Test

arkade-regtest itself has no application tests — the deliverable is a working stack. "Testing" arkade-regtest means **smoke-testing the running stack** to confirm services are healthy, then **running consumer test suites** against it.

## Smoke Tests

Run these immediately after `node regtest.mjs start` to confirm the stack is healthy.

### Bitcoin Core
```bash
node regtest.mjs rpc getblockchaininfo | jq '.chain'
# expected: "regtest"
```

### arkd (gRPC reachability)
```bash
grpcurl -plaintext localhost:7070 list 2>/dev/null | head -5
# expected: list of gRPC services exposed by arkd
```

### Esplora REST (via mempool)
```bash
curl -s http://localhost:3000/api/blocks/tip/height
# expected: a block height (integer)
```

### Boltz Backend
```bash
curl -s http://localhost:9001/version | jq
# expected: { "version": "..." }
```

### Fulmine
```bash
curl -s http://localhost:7003/api/v1/info
# Boltz Fulmine REST API
```

### Boltz LND
```bash
docker exec boltz-lnd lncli --network=regtest getinfo | jq '{alias, num_active_channels, synced_to_chain}'
# expected: synced_to_chain=true, channel count > 0 after faucet flow
```

### Emulator (default-on)
```bash
curl -s http://localhost:7073/v1/info | jq
# expected: signer pubkey / info
```

### Wallet PWA / Explorer
Open `http://localhost:3003` (Arkade Wallet) and `http://localhost:7080` (Arkade Explorer) in a browser.

## Lightning Helper Tests

Verify the LND nodes can mint and pay invoices:
```bash
INV=$(node regtest.mjs create-invoice)        # 100k-sat invoice on boltz-lnd
echo "$INV"
node regtest.mjs pay-invoice "$INV"           # pays from the non-destination node
```
Use `--secondary` on `create-invoice` to mint on the secondary node and have the other pay.

## Chain Control for Tests

```bash
node regtest.mjs mine 6                        # confirm transactions / advance the tip
node regtest.mjs faucet <addr> 1 --confirm     # fund an address and mine 1 block
node regtest.mjs reorg 2                        # simulate a 2-block reorg
```

For block-denominated fast-expiry tests, set `AUTOMINE_INTERVAL=0` and drive expiry/sweeps with explicit `mine` calls (see `system/configuration.md`).

## Running Consumer Tests Against the Stack

arkade-regtest is the standard target for integration tests in:

- **arkd** — `make integrationtest` (pointed at `localhost:7070`)
- **fulmine** — Boltz integration tests
- **go-sdk / ts-sdk / rust-sdk / dotnet-sdk** — SDK integration tests (ts-sdk drives signer rotation via `set-signers`)
- **wallet** — E2E browser tests
- **boltz-swap / boltz-backend** — swap UI / integration tests

Typical pattern (from a consumer repo with arkade-regtest as a submodule):
```bash
node regtest/regtest.mjs start
<run consumer integration test command>
node regtest/regtest.mjs stop
```

Refer to each consumer project's `testing/how_to_test.md` for command specifics.

## Test Isolation

Volumes persist across `stop` invocations. To reset state between runs:
```bash
node regtest.mjs clean && node regtest.mjs start
```
For maximum determinism in CI, use `clean` between test jobs.

## Common Failure Signals

| Symptom                                       | Likely cause                                                 |
| --------------------------------------------- | ------------------------------------------------------------ |
| `port already in use`                         | Another stack already running, or a host service on the port |
| `arkd` container exits immediately            | Bad `ARKD_IMAGE` tag or mismatched `ARKD_*` config types     |
| Boltz LND `synced_to_chain: false`            | nbxplorer ↔ Bitcoin Core connectivity issue                  |
| Sweeps/expiry fire mid-test                   | Auto-miner left on with block-denominated locktimes (set `AUTOMINE_INTERVAL=0`) |
| Helpers report "no funded channels"           | Faucet flow didn't complete; `clean` + `start`               |

See `testing/troubleshooting.md` for debugging steps.
