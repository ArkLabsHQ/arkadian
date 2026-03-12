---
name: arkd-dev-loop
description: Fast iteration loop for developing arkd locally. Smart pre-flight detects running services, sets up infrastructure, manages wallet state, then iterates with build-test-fix cycles including mandatory log capture.
---

# Arkd Dev Loop

Fast-iteration development workflow for arkd: smart pre-flight checks, infrastructure setup, wallet management, and a build-test-fix iteration loop with mandatory log capture.

## Prerequisites

- `nigiri` CLI installed
- Docker running
- Go toolchain
- arkd repo at `${ARKD_REPO}`

## NEVER Use `make test` or `make integrationtest`

These Makefile targets start a PostgreSQL container (`ark-pg-test`) on **port 5432**, which conflicts with the `pgnbxplorer` container started by `make run-wallet`. This causes Docker port binding errors and wastes debugging time.

**Instead, run individual tests:**
```bash
go test -v -count=1 -run TestName -timeout 800s github.com/arkade-os/arkd/internal/test/e2e
```

For Makefile targets (proto, build, sqlc, lint), invoke `Skill("arkd-makefile-ref")`.

## Section 1: Pre-Flight Checks

Before starting anything, detect what's already running and decide how to adapt.

### 1a. Service Detection

```bash
# Check if nigiri/Esplora is already running
curl -s http://localhost:3000/api/blocks/tip/height && echo " -> Esplora responding"

# Check if Docker deps are running
docker ps --format '{{.Names}}' | grep -E 'nbxplorer|pgnbxplorer' && echo " -> Docker deps running"

# Check if arkd-wallet is running
curl -s http://localhost:6060/v1/wallet/status 2>/dev/null && echo " -> arkd-wallet responding"

# Check if arkd is running (locally or in Docker)
curl -s http://localhost:7070/v1/info 2>/dev/null && echo " -> arkd responding on :7070"

# Check if arkd is running in Docker (need to stop for local dev)
docker ps --format '{{.Names}}' | grep -w arkd && echo " -> arkd running in Docker"

# Check for port conflicts
lsof -i :7070 -i :7071 -i :6060 2>/dev/null | grep LISTEN && echo " -> Ports in use"
```

### 1b. Health Classification

For each detected service, classify its state:

| Service State | Action |
|--------------|--------|
| Running + healthy + correct config | **Reuse** — skip setup for that service |
| Running in Docker but need local | `docker stop <service>` then run locally |
| Port in use by unknown process | **STOP** — report conflict, ask user |
| Not running | Start normally |

### 1c. Wallet State Detection

```bash
# Check arkd admin wallet status
curl -s http://localhost:7071/v1/admin/wallet/status | jq .
# Returns: {"initialized": bool, "unlocked": bool, "synced": bool}
```

- If `initialized: true, unlocked: true, synced: true` → skip wallet setup entirely
- If `initialized: true, unlocked: false` → just unlock
- If `initialized: false` → full wallet creation needed

## Section 2: Infrastructure Setup

Consolidate all infrastructure into one section. **Skip any service detected as healthy in pre-flight.**

### Start Nigiri (skip if Esplora already responding on :3000)

```bash
nigiri start
```

Wait for Esplora:

```bash
until curl -s http://localhost:3000/api/blocks/tip/height > /dev/null 2>&1; do sleep 2; done
echo "Nigiri ready"
```

### Start arkd-wallet (skip if already responding on :6060)

```bash
cd ${ARKD_REPO}
make run-wallet
```

**NOTE:** `make run-wallet` automatically starts Docker deps (`pg`, `nbxplorer`) via `docker compose -f docker-compose.regtest.yml up -d pg nbxplorer`. Do NOT start Docker deps separately.

Uses `envs/arkd-wallet.regtest.env` → points at `localhost:32838` for nbxplorer.

Wait for arkd-wallet:

```bash
until curl -s http://localhost:6060/v1/wallet/status 2>/dev/null > /dev/null; do sleep 2; done
echo "arkd-wallet ready"
```

### Run arkd Locally (redirect output to log file — MANDATORY)

If arkd is running in Docker, stop it first:

```bash
docker stop arkd 2>/dev/null
```

#### Light Mode (fastest, no PostgreSQL/Redis needed):

```bash
cd ${ARKD_REPO}
make run-light 2>&1 | tee /tmp/arkd-dev.log
```

Uses `envs/arkd.light.env`. Key env vars:
- `ARKD_ESPLORA_URL=http://localhost:3000`
- `ARKD_WALLET_ADDR=127.0.0.1:6060`
- `ARKD_DB_TYPE=sqlite`, `ARKD_LIVE_STORE_TYPE=inmemory`
- `ARKD_SESSION_DURATION=10`

#### Full Mode (PostgreSQL + Redis):

```bash
cd ${ARKD_REPO}
make run 2>&1 | tee /tmp/arkd-dev.log
```

Uses `envs/arkd.dev.env`. Requires PostgreSQL at `:5433` and Redis at `:6379` (auto-started by `make run`).

### Verify All Services Healthy

```bash
curl -s http://localhost:3000/api/blocks/tip/height > /dev/null && echo "Esplora OK"
curl -s http://localhost:6060/v1/wallet/status > /dev/null && echo "arkd-wallet OK"
curl -s http://localhost:7070/v1/info | jq . && echo "arkd OK"
```

## Section 3: Wallet Setup

**CRITICAL: arkd will not function correctly without a funded wallet. This is the #1 cause of test failures.**

### Check wallet status first

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

### Fund the wallet (CRITICAL — always check balance and top up):

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

## Section 4: Development & Test Iteration Loop

This is the core of the skill. Repeat this cycle until all tests pass.

```
REPEAT:
  a. Write/modify code for bug fix or feature

  b. Write unit test where suitable:
     go test -v -count=1 ./internal/path/to/package/...

  c. Write NEW e2e test function (MANDATORY for features):

     **Before writing:** Verify the function does NOT already exist:
     ```bash
     grep -n "func TestYourFunctionName" ${ARKD_REPO}/internal/test/e2e/e2e_test.go
     # Must return NO output — if it exists, choose a different name
     ```

     **File and package:**
     - Add to `${ARKD_REPO}/internal/test/e2e/e2e_test.go` (or new `*_test.go` in same dir)
     - Package: `package e2e_test` (external test package, same as existing tests)
     - No TestMain setup needed — shared TestMain auto-manages wallet state

     **Minimal template:**
     ```go
     func TestYourFeatureName(t *testing.T) {
         ctx := t.Context()

         // 1. Fresh wallet per client
         alice := setupArkSDK(t)

         // 2. Fund offchain (amount in BTC as float64)
         faucetOffchain(t, alice, 0.001)

         // 3. For two-party tests:
         bob := setupArkSDK(t)
         _, bobOffchainAddr, _, err := bob.Receive(ctx)
         require.NoError(t, err)

         // 4. CRITICAL: notification goroutine BEFORE the action
         wg := &sync.WaitGroup{}
         wg.Add(1)
         var notifyErr error
         go func() {
             defer wg.Done()
             _, notifyErr = bob.NotifyIncomingFunds(ctx, bobOffchainAddr)
         }()

         // 5. Exercise your feature
         _, err = alice.SendOffChain(ctx, false, []types.Receiver{{
             To:     bobOffchainAddr,
             Amount: 21000,
         }})
         require.NoError(t, err)
         wg.Wait()
         require.NoError(t, notifyErr)

         // 6. Assert feature-specific behavior
         balance, err := bob.Balance(ctx)
         require.NoError(t, err)
         require.NotZero(t, balance.OffchainBalance.Total)
     }
     ```

     **Available helpers** (all in `utils_test.go`):
     | Helper | Purpose |
     |--------|---------|
     | `setupArkSDK(t)` | Fresh random-key wallet, initialized+unlocked |
     | `faucet(t, client, amt)` | Fund offchain + tiny onchain for fees |
     | `faucetOffchain(t, client, amt)` | Fund offchain only (via admin note) |
     | `faucetOnchain(t, addr, amt)` | Fund onchain only (via nigiri) |
     | `generateBlocks(n)` | Mine n blocks via nigiri rpc |
     | `generateNote(t, sats)` | Create admin note for given sat amount |

     **Rules:**
     - Always `require.*` (not `assert.*`) — stops on first failure
     - Always start `NotifyIncomingFunds` goroutine BEFORE send/settle/redeem
     - After `generateBlocks`: `time.Sleep(5-10 * time.Second)` for indexer sync
     - Esplora hardcoded to `localhost:3000` in test code (not env var)

     **Run your test:**
     ```bash
     go test -v -count=1 -run TestYourFeatureName -timeout 800s github.com/arkade-os/arkd/internal/test/e2e
     ```
     Capture output in `test-evidence.md` under `## Integration Test`.

  d. Restart arkd (Ctrl+C → make run-light 2>&1 | tee /tmp/arkd-dev.log)
     NOTE: arkd-wallet and Docker deps stay running — do NOT restart them

  e. Run specific e2e test:
     go test -v -count=1 -run TestName -timeout 800s github.com/arkade-os/arkd/internal/test/e2e

  f. MANDATORY: Read BOTH test output AND arkd logs:
     - Terminal: test assertions and failures
     - /tmp/arkd-dev.log: panics, errors, unexpected warnings
     - tail -100 /tmp/arkd-dev.log | grep -i "error\|panic\|fatal"

  g. If test fails → fix code → go back to (a)

  h. If test passes → verify no errors in arkd logs → done
```

**Key rules:**
- Always redirect arkd output to `/tmp/arkd-dev.log` via `tee`
- At EVERY iteration, check both test output AND arkd logs
- `TestMain` in e2e tests auto-handles wallet state — it checks balance and refills if below 15 BTC threshold. Your wallet just needs to be unlocked.
- arkd-wallet and Docker deps stay running between iterations — only restart arkd itself

### Running a specific sub-test:

```bash
go test -v -count=1 -run "TestUnilateralExit/preconfirmed_vtxo" -timeout 800s github.com/arkade-os/arkd/internal/test/e2e
```

### Running multiple regression tests (one-by-one, final verification only):

```bash
# Run specific regression tests individually — do NOT use make integrationtest
go test -v -count=1 -run TestBatchSession -timeout 800s github.com/arkade-os/arkd/internal/test/e2e
go test -v -count=1 -run TestCollaborativeExit -timeout 800s github.com/arkade-os/arkd/internal/test/e2e
```

### If wallet state is corrupt, wipe and reinitialize:

```bash
rm -rf ${ARKD_REPO}/data/regtest
# Then restart arkd and redo Section 3 (Wallet Setup)
```

## Section 5: Cleanup

```bash
# Stop arkd (Ctrl+C)
# Stop arkd-wallet (Ctrl+C)
cd ${ARKD_REPO}
docker compose -f docker-compose.regtest.yml down -v
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
