# How to Test

arkade-regtest itself has no application tests — the deliverable is a working stack. "Testing" arkade-regtest means **smoke-testing the running stack** to confirm services are healthy, then **running consumer test suites** against it.

## Smoke Tests

Run these immediately after `./start-env.sh` to confirm the stack is healthy.

### Bitcoin Core
```bash
curl -s -u admin1:123 -H 'content-type: text/plain;' \
  --data '{"jsonrpc":"1.0","id":"1","method":"getblockchaininfo","params":[]}' \
  http://localhost:18443/ | jq '.result.chain'
# expected: "regtest"
```

### arkd (gRPC reachability)
```bash
grpcurl -plaintext localhost:7070 list 2>/dev/null | head -5
# expected: list of gRPC services exposed by arkd
```

### Boltz Backend
```bash
curl -s http://localhost:9001/version | jq
# expected: { "version": "..." }
```

### Fulmine
```bash
curl -s http://localhost:7002/health
# or
curl -s http://localhost:7003/api/v1/info
```

### Boltz LND
```bash
docker exec boltz-lnd lncli --network=regtest getinfo | jq '{alias, num_active_channels, synced_to_chain}'
# expected: alias="Ark Labs", synced_to_chain=true, channel count > 0 after faucet flow
```

### Wallet PWA
Open `http://localhost:3003` in a browser. The Ark Wallet PWA should load.

## Lightning Helper Tests

Verify Boltz LND can mint and pay invoices:
```bash
INV=$(./helpers/create-invoice.sh)             # creates 1000 sat invoice on boltz-lnd
echo "$INV"
./helpers/pay-invoice.sh "$INV"                # pays from boltz-lnd
```
With only one node funded by default, you typically pay from `boltz-lnd` to `lnd` (the secondary). Use `--secondary` on `create-invoice.sh` to mint on the secondary node and have the primary pay.

## Running Consumer Tests Against the Stack

arkade-regtest is the standard target for integration tests in:

- **arkd** — `make integrationtest` (after pointing at `localhost:7070`)
- **fulmine** — Boltz integration tests
- **go-sdk / ts-sdk / rust-sdk / dotnet-sdk** — SDK integration tests
- **wallet** — E2E browser tests
- **boltz-swap** — UI integration tests
- **boltz-backend** — Boltz integration tests

Typical pattern (from a consumer repo with arkade-regtest as a submodule):
```bash
./regtest/start-env.sh
<run consumer integration test command>
./regtest/stop-env.sh
```

Refer to each consumer project's `testing/how_to_test.md` for command specifics.

## Verifying arkd Override Mode

When using `ARKD_IMAGE`, confirm nigiri's arkd was actually replaced:
```bash
docker ps --format '{{.Names}}\t{{.Image}}' | grep -E 'arkd'
# expected: arkd container running the override image, not nigiri's bundled one
```

If nigiri's arkd is still running, override mode failed. Check the launcher output for errors and verify `ARKD_IMAGE` is set in the env file the launcher actually loaded (its first log line shows the override path).

## Test Isolation

Volumes persist across `stop-env.sh` invocations. To reset state between test runs:
```bash
./clean-env.sh && ./start-env.sh
```

For maximum determinism in CI, always use `clean-env.sh` between test jobs (even though it's slower).

## Common Failure Signals

| Symptom                                       | Likely cause                                                |
| --------------------------------------------- | ----------------------------------------------------------- |
| `port already in use`                         | Another stack already running, or host service on same port |
| `arkd` container exits immediately            | Override image mismatch or missing `ARKD_*` config var      |
| Boltz LND `synced_to_chain: false`            | nbxplorer–LND connectivity issue (try `BITCOIN_LOW_FEE=false`) |
| Nigiri build fails                            | Go version too old or network issue cloning the repo        |
| Helpers report "no funded channels"           | Faucet flow didn't complete; rerun `start-env.sh`           |

See `testing/troubleshooting.md` for debugging steps.
