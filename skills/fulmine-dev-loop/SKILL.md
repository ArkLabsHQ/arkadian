---
name: fulmine-dev-loop
description: Fast iteration loop for developing fulmine locally. Start the full docker-compose stack, stop the fulmine instance(s) being developed, run locally with adapted env vars, test with single e2e tests, check logs, fix, repeat.
---

# Fulmine Dev Loop

Fast-iteration development workflow for fulmine: run all dependencies in Docker, stop the service(s) you're developing, run them locally, iterate with single tests.

Fulmine has many dependencies (arkd, boltz, LN nodes, mock-boltz) that are complex to run individually. The dev loop pattern is: **run everything in Docker first, then stop the container(s) you're working on and run locally.**

## Prerequisites

- `nigiri` CLI installed (with `--ln` support)
- Docker running
- Go toolchain, `templ`, `yarn` (for static assets)
- fulmine repo at `${FULMINE_REPO}`

## Step 0: Pre-Flight Checks

Before starting anything, check what's already running and adapt:

```bash
# Check if nigiri is already running
curl -s http://localhost:3000/api/blocks/tip/height && echo " -> Nigiri running, skip nigiri start"

# Check if the full docker stack is already running
docker ps --format '{{.Names}}' | grep -E 'arkd|fulmine|boltz' && echo " -> Docker stack (partially) running"

# Check which fulmine instances are running
docker ps --format '{{.Names}}' | grep -w fulmine && echo " -> fulmine container running"
docker ps --format '{{.Names}}' | grep -w boltz-fulmine && echo " -> boltz-fulmine container running"
docker ps --format '{{.Names}}' | grep -w fulmine-mock && echo " -> fulmine-mock container running"

# Check if something is already listening on fulmine ports
lsof -i :7000 -i :7001 2>/dev/null | grep LISTEN && echo " -> Ports 7000/7001 in use"
lsof -i :7002 -i :7003 2>/dev/null | grep LISTEN && echo " -> Ports 7002/7003 in use"
lsof -i :7100 -i :7101 2>/dev/null | grep LISTEN && echo " -> Ports 7100/7101 in use"

# Check service health
curl -s http://localhost:7001/api/v1/info 2>/dev/null | jq . && echo " -> fulmine responding on :7001"
curl -s http://localhost:7070/v1/info 2>/dev/null | jq . && echo " -> arkd responding on :7070"
curl -s http://localhost:9001/version 2>/dev/null | jq . && echo " -> boltz responding on :9001"
```

**Decision tree:**
- Full stack running from previous session? Just `docker stop fulmine` (or whichever instance) and go to Step 3
- Nigiri running but no docker stack? Go to Step 1 (start docker-compose only, skip nigiri)
- Nothing running? Start from Step 1
- Fulmine running locally from previous iteration? Ctrl+C it and go to Step 4
- Port conflicts? Check `docker ps` and `lsof` to find what's using the port, stop it

## Step 1: Full Environment Setup (First Time)

```bash
cd ${FULMINE_REPO}

# Build Docker images
make build-test-env

# Start everything + provision wallets, LN channels, funds (~3 minutes)
make setup-test-env
```

This runs `scripts/setup` which:
- Starts nigiri with Lightning (`nigiri start --ln`)
- Starts all docker-compose services
- Creates and funds arkd wallet
- Opens LN channels between nodes
- Provisions all 3 fulmine instances with funds

If nigiri is already running, `scripts/setup` will tear it down and restart. To avoid this and just start docker services on an existing nigiri:
```bash
cd ${FULMINE_REPO}
docker compose -f test.docker-compose.yml up -d
# Then provision manually (see Step 5 for wallet operations)
```

Verify the stack is healthy:

```bash
curl -s http://localhost:7001/api/v1/info | jq .          # fulmine
curl -s http://localhost:7003/api/v1/info | jq .          # boltz-fulmine
curl -s http://localhost:7101/api/v1/info | jq .          # fulmine-mock
curl -s http://localhost:7070/v1/info | jq .              # arkd
curl -s http://localhost:9001/version | jq .              # boltz
```

## Step 2: Stop the Fulmine Instance(s) You're Developing

### Main client fulmine (most common):
```bash
docker stop fulmine
```

### Boltz's fulmine instance:
```bash
docker stop boltz-fulmine
```

### Mock boltz fulmine instance:
```bash
docker stop fulmine-mock
```

All other services remain running (arkd, boltz, LN nodes, etc.).

## Step 3: Adapt Environment Variables for Local Run

**Source of truth**: Read the `environment:` section of the stopped container in `${FULMINE_REPO}/test.docker-compose.yml`.

**Key translation rule**: Replace Docker container hostnames with `localhost`:
- `arkd:7070` → `localhost:7070`
- `chopsticks:3000` → `localhost:3000`
- `boltz:9001` → `localhost:9001`
- `boltz:9004` → `localhost:9004`
- `mock-boltz:9001` → `localhost:9101` (mock-boltz maps container 9001 to host 9101)

**Existing env files for reference**: `${FULMINE_REPO}/envs/dev.env`, `${FULMINE_REPO}/envs/dev.2.env`

### Per-Instance Quick Reference

#### fulmine (client, ports 7000/7001):
```bash
export FULMINE_DATADIR=./datadir
export FULMINE_NO_MACAROONS=true
export FULMINE_LOG_LEVEL=5
export FULMINE_SCHEDULER_POLL_INTERVAL=10
export FULMINE_DISABLE_TELEMETRY=true
export FULMINE_SWAP_TIMEOUT=120
export FULMINE_ARK_SERVER=localhost:7070
export FULMINE_ESPLORA_URL=http://localhost:3000
export FULMINE_BOLTZ_URL=http://localhost:9001
export FULMINE_BOLTZ_WS_URL=ws://localhost:9004
```

#### boltz-fulmine (Boltz's instance, ports 7002/7003):
```bash
export FULMINE_DATADIR=./datadir-boltz
export FULMINE_GRPC_PORT=7002
export FULMINE_HTTP_PORT=7003
export FULMINE_NO_MACAROONS=true
export FULMINE_LOG_LEVEL=5
export FULMINE_SCHEDULER_POLL_INTERVAL=10
export FULMINE_DISABLE_TELEMETRY=true
export FULMINE_SWAP_TIMEOUT=120
export FULMINE_ARK_SERVER=localhost:7070
export FULMINE_ESPLORA_URL=http://localhost:3000
export FULMINE_BOLTZ_URL=http://localhost:9001
export FULMINE_BOLTZ_WS_URL=ws://localhost:9004
```

#### fulmine-mock (mock boltz client, ports 7100/7101):
```bash
export FULMINE_DATADIR=./datadir-mock
export FULMINE_GRPC_PORT=7100
export FULMINE_HTTP_PORT=7101
export FULMINE_NO_MACAROONS=true
export FULMINE_LOG_LEVEL=5
export FULMINE_SCHEDULER_POLL_INTERVAL=10
export FULMINE_DISABLE_TELEMETRY=true
export FULMINE_SWAP_TIMEOUT=120
export FULMINE_ARK_SERVER=localhost:7070
export FULMINE_ESPLORA_URL=http://localhost:3000
export FULMINE_BOLTZ_URL=http://localhost:9101
export FULMINE_BOLTZ_WS_URL=ws://localhost:9104
```

Note: fulmine-mock connects to mock-boltz (host port 9101), not the real boltz.

## Step 4: Run Fulmine Locally

```bash
cd ${FULMINE_REPO}

# Build static assets first (required)
make build-static-assets

# Run with the exported env vars from Step 3
go run ./cmd/fulmine
```

Or inline for the main fulmine instance:

```bash
FULMINE_DATADIR=./datadir FULMINE_NO_MACAROONS=true FULMINE_LOG_LEVEL=5 \
  FULMINE_SCHEDULER_POLL_INTERVAL=10 FULMINE_DISABLE_TELEMETRY=true \
  FULMINE_SWAP_TIMEOUT=120 FULMINE_ARK_SERVER=localhost:7070 \
  FULMINE_ESPLORA_URL=http://localhost:3000 \
  FULMINE_BOLTZ_URL=http://localhost:9001 FULMINE_BOLTZ_WS_URL=ws://localhost:9004 \
  go run ./cmd/fulmine
```

Verify:

```bash
curl -s http://localhost:7001/api/v1/info | jq .
```

## Step 5: Fulmine Wallet Operations

All endpoints at `http://localhost:7001` (no auth when `FULMINE_NO_MACAROONS=true`).

### Check wallet status (do this first to decide what's needed)

```bash
curl -s http://localhost:7001/api/v1/wallet/status | jq .
# Returns: {"initialized": bool, "synced": bool, "unlocked": bool}
```

### If NOT initialized — create wallet:

```bash
# Generate a seed
SEED=$(curl -s http://localhost:7001/api/v1/wallet/genseed | jq -r '.hex')
echo "Seed hex: $SEED"

# Create wallet (server_url points to arkd)
curl -X POST http://localhost:7001/api/v1/wallet/create \
  -H "Content-Type: application/json" \
  -d "{\"private_key\": \"$SEED\", \"password\": \"password\", \"server_url\": \"localhost:7070\"}"
```

### If initialized but locked — unlock:

```bash
curl -X POST http://localhost:7001/api/v1/wallet/unlock \
  -H "Content-Type: application/json" \
  -d '{"password":"password"}'
```

### Fund fulmine (onboard + settle):

```bash
# Check current balance
curl -s http://localhost:7001/api/v1/balance | jq .
# Returns: {"amount": <sats>}

# Get onboard address (on-chain address for funding)
ADDR=$(curl -s -X POST http://localhost:7001/api/v1/onboard \
  -H "Content-Type: application/json" \
  -d '{"amount": 100000}' | jq -r '.address')
echo "Onboard address: $ADDR"

# Fund with nigiri faucet
nigiri faucet $ADDR 0.001

# Wait for confirmation
sleep 5

# Settle (converts boarding UTXOs to VTXOs)
curl -s http://localhost:7001/api/v1/settle | jq .

# Verify balance
curl -s http://localhost:7001/api/v1/balance | jq .
```

### Get offchain address (for receiving):

```bash
curl -s http://localhost:7001/api/v1/address | jq .
# Returns: {"address": "ark1...", "pubkey": "02..."}
```

## Step 6: Manual Testing

```bash
# Service info
curl -s http://localhost:7001/api/v1/info | jq .

# Wallet status
curl -s http://localhost:7001/api/v1/wallet/status | jq .

# Balance
curl -s http://localhost:7001/api/v1/balance | jq .

# List swaps
curl -s http://localhost:7001/api/v1/swaps | jq .

# gRPC (if grpcurl installed)
grpcurl -plaintext localhost:7000 fulmine.v1.FulmineService/GetBalance
grpcurl -plaintext localhost:7000 list  # list all services
```

### Fund arkd via docker (needed if arkd balance is low):

```bash
# Check arkd balance
docker exec arkd arkd wallet balance

# Fund arkd
ARKD_ADDR=$(docker exec arkd arkd wallet address | tr -d '\n')
nigiri faucet $ARKD_ADDR 1
```

## Step 7: Run a SINGLE E2E Test

```bash
cd ${FULMINE_REPO}

# Run one specific test
go test -v -count=1 -run TestSubmarineSwap -timeout 20m -race -p=1 ./internal/test/e2e/...

# Run a specific sub-test
go test -v -count=1 -run "TestChainSwapArkToBTC" -timeout 20m -race -p=1 ./internal/test/e2e/...

# Run all integration tests (slow, use for final verification only)
make integrationtest
```

**Caveats:**
- `TestMain` uses `docker exec arkd arkd` for arkd CLI commands — arkd MUST stay in Docker
- `TestMain` calls `refillArkd` and `refillFulmine` which auto-top-up balances if below threshold (arkd < 5 BTC, fulmine < 100k sats)
- Tests connect to `localhost:7000` (your local fulmine), `localhost:7002` (boltz-fulmine in docker), `localhost:7100` (fulmine-mock in docker)

## Step 8: Iterate

1. **Ctrl+C** fulmine in its terminal
2. Fix code
3. If template/UI changes: `make build-static-assets`
4. Re-run: `go run ./cmd/fulmine` (with env vars)
5. Re-run the specific test
6. Docker deps stay running — no restart needed

If wallet state is corrupt, wipe and reinitialize:
```bash
rm -rf ${FULMINE_REPO}/datadir
# Then restart fulmine and redo Step 5
```

## Step 9: Cleanup

```bash
# Stop local fulmine (Ctrl+C)
cd ${FULMINE_REPO}
make down-test-env
nigiri stop --delete
```

## Env Vars Reference

Source of truth for env vars:
- Docker services: `${FULMINE_REPO}/test.docker-compose.yml` → `environment:` sections
- Local dev: `${FULMINE_REPO}/envs/dev.env` (missing ARK_SERVER and ESPLORA_URL)
- Second instance: `${FULMINE_REPO}/envs/dev.2.env`

When adapting from docker-compose to local, always translate container hostnames to `localhost` and check that port mappings in the compose file match.

## Port Reference

| Service | Host Port | Protocol | Notes |
|---------|-----------|----------|-------|
| fulmine gRPC | 7000 | gRPC | Main client (your local instance) |
| fulmine HTTP | 7001 | HTTP | Main client REST API |
| boltz-fulmine gRPC | 7002 | gRPC | Boltz's fulmine (Docker or local) |
| boltz-fulmine HTTP | 7003 | HTTP | Boltz's fulmine REST |
| fulmine-mock gRPC | 7100 | gRPC | Mock client (Docker or local) |
| fulmine-mock HTTP | 7101 | HTTP | Mock client REST |
| arkd gRPC | 7070 | gRPC | Docker |
| arkd admin | 7071 | HTTP | Docker |
| Boltz API | 9001 | HTTP | Docker |
| Boltz WS | 9004 | WS | Docker |
| mock-boltz API | 9101 | HTTP | Docker (maps to container 9001) |
| Esplora | 3000 | HTTP | Nigiri |

## Fulmine API Quick Reference

All endpoints at `http://localhost:7001` (no auth when `FULMINE_NO_MACAROONS=true`):

| Operation | Method | Path | Body |
|-----------|--------|------|------|
| Status | GET | `/api/v1/wallet/status` | — |
| Gen Seed | GET | `/api/v1/wallet/genseed` | — |
| Create | POST | `/api/v1/wallet/create` | `{"private_key":"...","password":"...","server_url":"localhost:7070"}` |
| Unlock | POST | `/api/v1/wallet/unlock` | `{"password":"..."}` |
| Lock | POST | `/api/v1/wallet/lock` | `{"password":"..."}` |
| Address | GET | `/api/v1/address` | — |
| Onboard | POST | `/api/v1/onboard` | `{"amount":100000}` |
| Balance | GET | `/api/v1/balance` | — |
| Settle | GET | `/api/v1/settle` | — |
| Swaps | GET | `/api/v1/swaps` | — |
| Info | GET | `/api/v1/info` | — |

## Available E2E Tests

| Test | File | Description |
|------|------|-------------|
| TestSubmarineSwap | swap_test.go | Basic submarine swap |
| TestReverseSwap | swap_test.go | Reverse swap |
| TestCircularSwap | swap_test.go | Circular swap |
| TestConcurrentSwaps | swap_test.go | Multiple concurrent swaps |
| TestChainSwapArkToBTC | chainswap_test.go | Chain swap Ark to BTC |
| TestChainSwapBTCtoARK | chainswap_test.go | Chain swap BTC to Ark |
| TestChainSwapBTCtoARKWithQuote | chainswap_test.go | Chain swap with quote |
| TestChainSwapMockArkToBTCScriptPathClaim | chainswap_test.go | Mock: script path claim |
| TestChainSwapMockArkToBTCCooperativeRefund | chainswap_test.go | Mock: cooperative refund |
| TestChainSwapMockArkToBTCUnilateralRefund | chainswap_test.go | Mock: unilateral refund |
| TestChainSwapMockBTCToARKUnilateralRefund | chainswap_test.go | Mock: BTC to Ark refund |
| TestChainSwapMockRefundChainSwapRPC | chainswap_test.go | Mock: refund via RPC |
| TestChainSwapRecovery | chainswap_test.go | Chain swap recovery flow |
| TestVHTLC | vhtlc_test.go | VHTLC create and settle |
| TestClaimVhtlcSettlement | vhtlc_test.go | Claim path settlement |
| TestRefundVhtlcSettlement | vhtlc_test.go | Refund path settlement |
| TestSettleVHTLCByDelegateRefund | vhtlc_test.go | Delegate refund settlement |
