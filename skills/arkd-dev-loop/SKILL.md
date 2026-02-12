---
name: arkd-dev-loop
description: Fast iteration loop for developing arkd locally. Start dependencies in Docker, run arkd locally, test with single e2e tests, check logs, fix, repeat.
---

# Arkd Dev Loop

Fast-iteration development workflow for arkd: run dependencies in Docker, run arkd locally, iterate with single tests.

## Prerequisites

- `nigiri` CLI installed
- Docker running
- Go toolchain
- arkd repo at `${ARKD_REPO}`

## Step 0: Pre-Flight Checks

Before starting anything, check what's already running and adapt:

```bash
# Check if nigiri is already running
curl -s http://localhost:3000/api/blocks/tip/height && echo " -> Nigiri already running, skip Step 1"

# Check if docker deps are running
docker ps --format '{{.Names}}' | grep -E 'nbxplorer|pgnbxplorer' && echo " -> Docker deps already running, skip Step 2"

# Check if arkd-wallet is running
curl -s http://localhost:6060/v1/wallet/status 2>/dev/null && echo " -> arkd-wallet already running, skip Step 3"

# Check if arkd is running (locally or in docker)
curl -s http://localhost:7070/v1/info 2>/dev/null && echo " -> arkd already running on :7070"

# Check if arkd is running in docker (need to stop it for local dev)
docker ps --format '{{.Names}}' | grep -w arkd && echo " -> arkd running in Docker, stop it: docker stop arkd"

# Check for port conflicts
lsof -i :7070 -i :7071 -i :6060 2>/dev/null | grep LISTEN && echo " -> Ports in use, check what's occupying them"
```

**Decision tree:**
- Nigiri running? Skip to Step 2
- Docker deps running? Skip to Step 3
- arkd in Docker? `docker stop arkd` then run locally
- arkd-wallet in Docker? `docker stop arkd-wallet` then run locally
- arkd already running locally? Ctrl+C and restart with your changes
- Wallet already initialized? Skip to "Unlock and Fund" in Step 5

## Step 1: Start Nigiri (Bitcoin Regtest)

```bash
nigiri start
```

Wait ~10s for Bitcoin and Esplora to be ready:

```bash
# Poll until Esplora responds
until curl -s http://localhost:3000/api/blocks/tip/height > /dev/null 2>&1; do sleep 2; done
echo "Nigiri ready"
```

## Step 2: Start ONLY arkd Dependencies via Docker Compose

Start postgres-for-nbxplorer and nbxplorer, but NOT arkd-wallet or arkd:

```bash
cd ${ARKD_REPO}
docker compose -f docker-compose.regtest.yml up -d pgnbxplorer nbxplorer
```

Wait for nbxplorer to sync:

```bash
# Poll until synced (may take 15-30s)
until curl -s http://localhost:32838/v1/cryptos/BTC/status 2>/dev/null | jq -e '.isFullySynced == true' > /dev/null 2>&1; do
  sleep 3
done
echo "NBXplorer synced"
```

If arkd or arkd-wallet containers are also running from a previous `docker-compose up`:
```bash
docker stop arkd arkd-wallet 2>/dev/null
```

## Step 3: Run arkd-wallet Locally

```bash
cd ${ARKD_REPO}
make run-wallet
```

Uses `envs/arkd-wallet.regtest.env` → points at `localhost:32838` for nbxplorer.

Verify (in another terminal):
```bash
curl -s http://localhost:6060/v1/wallet/status | jq .
```

## Step 4: Run arkd Locally

### Light Mode (fastest, no PostgreSQL/Redis needed):

```bash
cd ${ARKD_REPO}
make run-light
```

Uses `envs/arkd.light.env`. Key env vars:
- `ARKD_ESPLORA_URL=http://localhost:3000`
- `ARKD_WALLET_ADDR=127.0.0.1:6060`
- `ARKD_DB_TYPE=sqlite`, `ARKD_LIVE_STORE_TYPE=inmemory`
- `ARKD_SESSION_DURATION=10`

### Full Mode (PostgreSQL + Redis):

```bash
cd ${ARKD_REPO}
make run
```

Uses `envs/arkd.dev.env`. Requires PostgreSQL at `:5433` and Redis at `:6379` (auto-started by `make run`).

Verify arkd is running:

```bash
curl -s http://localhost:7070/v1/info | jq .
```

## Step 5: arkd Wallet Operations

All admin endpoints use `http://localhost:7071` with basic auth header `Authorization: Basic YWRtaW46YWRtaW4=` (admin:admin).

### Check wallet status (do this first to decide what's needed)

```bash
curl -s http://localhost:7071/v1/admin/wallet/status | jq .
# Returns: {"initialized": bool, "unlocked": bool, "synced": bool}
```

### If NOT initialized — create wallet:

```bash
# Generate a seed
SEED=$(curl -s http://localhost:7071/v1/admin/wallet/seed | jq -r '.seed')
echo "Seed: $SEED"

# Create wallet with seed
curl -X POST http://localhost:7071/v1/admin/wallet/create \
  -H "Content-Type: application/json" \
  -d "{\"seed\": \"$SEED\", \"password\": \"password\"}"
```

### If initialized but locked — unlock:

```bash
curl -X POST http://localhost:7071/v1/admin/wallet/unlock \
  -H "Content-Type: application/json" \
  -d '{"password":"password"}'
```

### Fund the wallet (top up):

```bash
# Check current balance
curl -s http://localhost:7071/v1/admin/wallet/balance | jq .
# Returns: {"mainAccount":{"locked":"0","available":"100000000"}, "connectorsAccount":{...}}

# Get address
ADDR=$(curl -s http://localhost:7071/v1/admin/wallet/address | jq -r '.address')

# Fund with nigiri faucet (1 BTC each call)
nigiri faucet $ADDR 1

# Mine a block to confirm
nigiri rpc generatetoaddress 1 $ADDR

# Verify balance increased
curl -s http://localhost:7071/v1/admin/wallet/balance | jq '.mainAccount.available'
```

### Generate a note (for SDK client testing):

```bash
curl -X POST http://localhost:7071/v1/admin/note \
  -H "Authorization: Basic YWRtaW46YWRtaW4=" \
  -H "Content-Type: application/json" \
  -d '{"amount": "10000"}' | jq .
# Returns: {"note": "ark:..."}
```

## Step 6: Manual Testing

```bash
# Server info (public gRPC gateway)
curl -s http://localhost:7070/v1/info | jq .

# List rounds
curl -s http://localhost:7071/v1/admin/rounds | jq .

# grpcurl (if installed)
grpcurl -plaintext localhost:7070 ark.v1.ArkService/GetInfo
grpcurl -plaintext localhost:7070 list  # list all services
```

## Step 7: Run a SINGLE E2E Test

```bash
cd ${ARKD_REPO}

# Run one specific test
go test -v -count=1 -run TestBatchSession -timeout 800s github.com/arkade-os/arkd/internal/test/e2e

# Run a specific sub-test
go test -v -count=1 -run "TestUnilateralExit/preconfirmed_vtxo" -timeout 800s github.com/arkade-os/arkd/internal/test/e2e

# Run all integration tests (slow, use for final verification only)
make integrationtest
```

Note: `TestMain` in e2e tests auto-handles wallet state — it checks balance and refills if below 15 BTC threshold. Your wallet just needs to be unlocked.

## Step 8: Iterate

1. **Ctrl+C** arkd in its terminal
2. Fix code
3. Re-run: `make run-light` (or `make run`)
4. Re-run the specific test
5. Docker deps (nigiri, nbxplorer) and arkd-wallet stay running — no restart needed

If wallet state is corrupt, wipe and reinitialize:
```bash
rm -rf ${ARKD_REPO}/data/regtest
# Then restart arkd and redo Step 5
```

## Step 9: Cleanup

```bash
# Stop arkd (Ctrl+C)
# Stop arkd-wallet (Ctrl+C)
cd ${ARKD_REPO}
docker compose -f docker-compose.regtest.yml down -v
nigiri stop
```

## Env Vars Reference

Source of truth for env vars:
- Light mode: `${ARKD_REPO}/envs/arkd.light.env`
- Full mode: `${ARKD_REPO}/envs/arkd.dev.env`
- Wallet: `${ARKD_REPO}/envs/arkd-wallet.regtest.env`
- Docker: `${ARKD_REPO}/docker-compose.regtest.yml` → `environment:` sections

## Port Reference

| Service | Port | Protocol |
|---------|------|----------|
| Esplora (chopsticks) | 3000 | HTTP |
| Bitcoin RPC | 18443 | RPC |
| NBXplorer | 32838 | HTTP |
| arkd-wallet | 6060 | HTTP |
| arkd gRPC | 7070 | gRPC/HTTP |
| arkd admin | 7071 | HTTP |
| PostgreSQL (dev mode) | 5433 | TCP |
| Redis (dev mode) | 6379 | TCP |

## arkd Admin API Quick Reference

All endpoints at `http://localhost:7071` (no auth needed when `ARKD_NO_MACAROONS=true`):

| Operation | Method | Path | Body |
|-----------|--------|------|------|
| Status | GET | `/v1/admin/wallet/status` | — |
| Gen Seed | GET | `/v1/admin/wallet/seed` | — |
| Create | POST | `/v1/admin/wallet/create` | `{"seed":"...","password":"..."}` |
| Unlock | POST | `/v1/admin/wallet/unlock` | `{"password":"..."}` |
| Lock | POST | `/v1/admin/wallet/lock` | `{}` |
| Address | GET | `/v1/admin/wallet/address` | — |
| Balance | GET | `/v1/admin/wallet/balance` | — |
| Note | POST | `/v1/admin/note` | `{"amount":"10000"}` |

## Available E2E Tests

| Test | Description |
|------|-------------|
| TestBatchSession | Batch session flows (settle, refresh) |
| TestUnilateralExit | Unilateral exit paths (leaf, preconfirmed) |
| TestCollaborativeExit | Collaborative exit with/without change |
| TestOffchainTx | Offchain transaction chains |
| TestDelegateRefresh | Delegate refresh operations |
| TestSendToCLTVMultisigClosure | CLTV multisig closure sends |
| TestSendToConditionMultisigClosure | Condition multisig closure |
| TestReactToFraud | Fraud detection and reaction |
| TestSweep | Sweep operations |
| TestCollisionBetweenInRoundAndRedeemVtxo | Round collision handling |
| TestIntent | Intent registration |
| TestBan | Ban mechanism |
| TestFee | Fee calculations |
| TestBatchSettleMultipleClients | Multi-client batch settlement |
