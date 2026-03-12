---
name: fulmine-dev-loop
description: Fast iteration loop for developing fulmine locally. Three infrastructure modes (internal-only, real-boltz, mock-boltz), smart pre-flight checks, and a build-test-fix iteration loop with mandatory log capture.
---

# Fulmine Dev Loop

Fast-iteration development workflow for fulmine with three infrastructure modes. Smart pre-flight checks detect running services, then iterate with build-test-fix cycles including mandatory multi-service log capture.

Fulmine has many dependencies (arkd, boltz, LN nodes, mock-boltz) that are complex to run individually. The dev loop pattern is: **run everything in Docker first, then stop the container(s) you're working on and run locally.**

## Prerequisites

- `nigiri` CLI installed (with `--ln` support)
- Docker running
- Go toolchain, `templ`, `yarn` (for static assets)
- fulmine repo at `${FULMINE_REPO}`

## Section 1: Pre-Flight Checks

Before starting anything, detect what's already running and decide how to adapt.

### 1a. Service Detection

```bash
# Check if nigiri/Esplora is already running
curl -s http://localhost:3000/api/blocks/tip/height && echo " -> Esplora responding"

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

### 1b. Health Classification

For each detected service, classify its state:

| Service State | Action |
|--------------|--------|
| Running + healthy + correct config | **Reuse** — skip setup for that service |
| Running in Docker but need local | `docker stop <service>` then run locally |
| Port in use by unknown process | **STOP** — report conflict, ask user |
| Not running | Start normally |

### 1c. Which Fulmine Instances Are Running?

Check if fulmine instances are in Docker vs running locally:
- If `docker ps` shows `fulmine` → it's in Docker, will need `docker stop fulmine` to run locally
- If port 7000/7001 is in use but no Docker container → it's already running locally

## Section 2: Choose Infrastructure Mode

Choose the mode based on what you're testing:

---

### Mode A: Internal-Only (fulmine + arkd, no boltz)

**When to use:** VHTLC, delegator, wallet ops, core protocol features — anything that doesn't involve boltz swaps.

**Applicable tests:** `TestVHTLC`, `TestClaimVhtlcSettlement`, `TestRefundVhtlcSettlement`, `TestSettleVHTLCByDelegateRefund`, `TestDelegate`, `TestDelegateCollaborativeExit`, `TestDelegateSameInput`, `TestDelegateSeveralInputs`

#### Setup (skip services detected as healthy in pre-flight):

```bash
cd ${FULMINE_REPO}

# Start nigiri (skip if Esplora already responding on :3000)
nigiri start

# Start minimal Docker stack (arkd + its deps, but NOT fulmine containers)
docker compose -f test.docker-compose.yml up -d pgnbxplorer nbxplorer arkd-wallet arkd
```

Wait for arkd:

```bash
until curl -s http://localhost:7070/v1/info 2>/dev/null > /dev/null; do sleep 3; done
echo "arkd ready"
```

#### Provision arkd wallet:

```bash
# Check status
curl -s http://localhost:7071/v1/admin/wallet/status | jq .

# Create wallet (if not initialized)
SEED=$(curl -s http://localhost:7071/v1/admin/wallet/seed | jq -r '.seed')
curl -X POST http://localhost:7071/v1/admin/wallet/create \
  -H "Content-Type: application/json" \
  -d "{\"seed\": \"$SEED\", \"password\": \"password\"}"

# Unlock wallet (if locked)
curl -X POST http://localhost:7071/v1/admin/wallet/unlock \
  -H "Content-Type: application/json" \
  -d '{"password":"password"}'

# Fund with 21 BTC
ARKD_ADDR=$(curl -s http://localhost:7071/v1/admin/wallet/address | jq -r '.address')
for i in $(seq 1 21); do nigiri faucet $ARKD_ADDR 1; done
nigiri rpc generatetoaddress 1 $ARKD_ADDR
```

#### Run fulmine locally:

Source of truth: `test.docker-compose.yml` → `fulmine` service, minus boltz-specific vars since no boltz in Mode A.

```bash
cd ${FULMINE_REPO}
make build-static-assets

FULMINE_DATADIR=./datadir FULMINE_NO_MACAROONS=true FULMINE_LOG_LEVEL=5 \
  FULMINE_SCHEDULER_POLL_INTERVAL=10 FULMINE_DISABLE_TELEMETRY=true \
  FULMINE_ARK_SERVER=localhost:7070 \
  FULMINE_ESPLORA_URL=http://localhost:3000 \
  go run ./cmd/fulmine 2>&1 | tee /tmp/fulmine-dev.log
```

**TestMain workaround for Mode A:** The e2e package's `TestMain` tries to connect to all 3 fulmine instances (fulmine, boltz-fulmine, fulmine-mock), which fails in Mode A. To write and run e2e tests with Mode A:

1. **Comment out `TestMain`** in the e2e test files temporarily:
   ```go
   // func TestMain(m *testing.M) { ... }
   ```
2. **Write your test** in `internal/test/e2e/` as normal — set up gRPC/HTTP connections directly in your test function
3. **Run your test** with the minimal stack (arkd in Docker, fulmine running locally)
4. **Uncomment `TestMain`** when done — verify all tests still pass with the full `TestMain`

This is the **fastest development workflow** — no need to build/start the full 3-instance Docker stack.

#### Mode A Cleanup:

```bash
# Stop local fulmine (Ctrl+C)
cd ${FULMINE_REPO}
docker compose -f test.docker-compose.yml down -v
nigiri stop
```

---

### Mode B: Real Boltz Integration (full stack)

**When to use:** Submarine/reverse/chain swaps, full integration testing — anything involving real boltz swap operations.

**Applicable tests:** `TestSubmarineSwap`, `TestReverseSwap`, `TestCircularSwap`, `TestConcurrentSwaps`, `TestChainSwapArkToBTC`, `TestChainSwapBTCtoARK`, `TestChainSwapBTCtoARKWithQuote`, `TestChainSwapRecovery`

#### Setup (skip if stack already healthy):

```bash
cd ${FULMINE_REPO}

# Build Docker images
make build-test-env

# Start everything + provision wallets, LN channels, funds (~3 min)
make setup-test-env
```

This runs `scripts/setup` which starts nigiri with Lightning, all docker-compose services, creates and funds arkd wallet, opens LN channels, and provisions all 3 fulmine instances.

#### Stop fulmine container and run locally:

```bash
docker stop fulmine
```

Source of truth for env vars: `test.docker-compose.yml` → `fulmine` service `environment:` section. The skill provides the localhost-translated version. Agent should NOT invent env vars — only add/modify if a specific test case requires it.

```bash
cd ${FULMINE_REPO}
make build-static-assets

FULMINE_DATADIR=./datadir FULMINE_NO_MACAROONS=true FULMINE_LOG_LEVEL=5 \
  FULMINE_SCHEDULER_POLL_INTERVAL=10 FULMINE_DISABLE_TELEMETRY=true \
  FULMINE_SWAP_TIMEOUT=120 FULMINE_ARK_SERVER=localhost:7070 \
  FULMINE_ESPLORA_URL=http://localhost:3000 \
  FULMINE_BOLTZ_URL=http://localhost:9001 FULMINE_BOLTZ_WS_URL=ws://localhost:9004 \
  go run ./cmd/fulmine 2>&1 | tee /tmp/fulmine-dev.log
```

**NOTE on delegator port conflict:** When running main fulmine locally alongside boltz-fulmine in Docker, the delegator defaults to port 7002 which conflicts with boltz-fulmine's gRPC on host port 7002. Set `FULMINE_DELEGATOR_PORT=7004` when running locally alongside boltz-fulmine:

```bash
FULMINE_DELEGATOR_PORT=7004 FULMINE_DATADIR=./datadir ... go run ./cmd/fulmine 2>&1 | tee /tmp/fulmine-dev.log
```

Verify:

```bash
curl -s http://localhost:7001/api/v1/info | jq .
```

#### Mode B Cleanup:

```bash
# Stop local fulmine (Ctrl+C)
cd ${FULMINE_REPO}
make down-test-env
nigiri stop --delete
```

---

### Mode C: Mock Boltz Testing (non-happy paths)

**When to use:** Chain swap failures, refunds, cooperative claims/refunds — testing non-happy-path scenarios using mock-boltz.

**Applicable tests:** `TestChainSwapMockArkToBTCScriptPathClaim`, `TestChainSwapMockArkToBTCCooperativeRefund`, `TestChainSwapMockArkToBTCUnilateralRefund`, `TestChainSwapMockBTCToARKUnilateralRefund`, `TestChainSwapMockRefundChainSwapRPC`

#### Setup: Same as Mode B (full stack needed for mock-boltz to connect to arkd):

```bash
cd ${FULMINE_REPO}
make build-test-env
make setup-test-env
```

#### Stop fulmine-mock container and run locally:

```bash
docker stop fulmine-mock
```

Source of truth: `test.docker-compose.yml` → `fulmine-mock` service. mock-boltz maps `9101:9001`, so both API and WS use `localhost:9101`.

```bash
cd ${FULMINE_REPO}
make build-static-assets

FULMINE_DATADIR=./datadir-mock FULMINE_GRPC_PORT=7100 FULMINE_HTTP_PORT=7101 \
  FULMINE_NO_MACAROONS=true FULMINE_LOG_LEVEL=5 \
  FULMINE_SCHEDULER_POLL_INTERVAL=10 FULMINE_DISABLE_TELEMETRY=true \
  FULMINE_SWAP_TIMEOUT=120 FULMINE_ARK_SERVER=localhost:7070 \
  FULMINE_ESPLORA_URL=http://localhost:3000 \
  FULMINE_BOLTZ_URL=http://localhost:9101 FULMINE_BOLTZ_WS_URL=ws://localhost:9101 \
  go run ./cmd/fulmine 2>&1 | tee /tmp/fulmine-mock-dev.log
```

Agent should NOT modify env vars unless a specific test case requires it.

#### Mock-boltz admin API for configuring failure scenarios:

```bash
POST http://localhost:9101/admin/config
```

Verify:

```bash
curl -s http://localhost:7101/api/v1/info | jq .
```

#### Mode C Cleanup:

```bash
# Stop local fulmine-mock (Ctrl+C)
cd ${FULMINE_REPO}
make down-test-env
nigiri stop --delete
```

---

## Section 3: Wallet Setup

### Mode A: Manual provisioning

arkd wallet is provisioned as part of Mode A setup above. For the fulmine wallet:

```bash
# Check wallet status
curl -s http://localhost:7001/api/v1/wallet/status | jq .

# If NOT initialized — create wallet:
SEED=$(curl -s http://localhost:7001/api/v1/wallet/genseed | jq -r '.hex')
curl -X POST http://localhost:7001/api/v1/wallet/create \
  -H "Content-Type: application/json" \
  -d "{\"private_key\": \"$SEED\", \"password\": \"password\", \"server_url\": \"localhost:7070\"}"

# If initialized but locked — unlock:
curl -X POST http://localhost:7001/api/v1/wallet/unlock \
  -H "Content-Type: application/json" \
  -d '{"password":"password"}'

# Fund fulmine (onboard + settle):
ADDR=$(curl -s -X POST http://localhost:7001/api/v1/onboard \
  -H "Content-Type: application/json" \
  -d '{"amount": 100000}' | jq -r '.address')
nigiri faucet $ADDR 0.001
sleep 5
curl -s http://localhost:7001/api/v1/settle | jq .
curl -s http://localhost:7001/api/v1/balance | jq .
```

### Mode B/C: Automatic provisioning

`make setup-test-env` handles all wallet provisioning automatically (arkd wallet, fulmine wallets, LN channel funding).

If you need to top up arkd balance after setup:

```bash
ARKD_ADDR=$(docker exec arkd arkd wallet address | tr -d '\n')
nigiri faucet $ARKD_ADDR 1
```

## Section 4: Fast Reuse Path (MOST COMMON)

**If Docker stack is already running** (detected in Section 1 pre-flight), skip straight here:

```bash
# Verify stack is healthy
curl -s http://localhost:7001/api/v1/balance | jq .
curl -s http://localhost:7070/v1/info > /dev/null && echo "arkd OK"

# If healthy → go straight to Section 5 (write code + test)
# If not healthy → go back to Section 2 to set up
```

## Section 5: Development & Test Iteration Loop

This is the core of the skill. Repeat this cycle until all tests pass.

### 5a. Write e2e test (MANDATORY — this is the primary deliverable)

**Tests MUST go in `internal/test/e2e/`** — this is non-negotiable. Tests in `internal/core/` are unit tests and do NOT satisfy the e2e requirement.

**File and package:**
- Add to `${FULMINE_REPO}/internal/test/e2e/` (new `*_test.go` file or add to existing)
- Package: `package e2e_test` (external test package)

**Before writing:** Verify the function does NOT already exist:
```bash
grep -rn "func TestYourFunctionName" ${FULMINE_REPO}/internal/test/e2e/
# Must return NO output — if it exists, choose a different name
```

**TestMain handling (CRITICAL):**
- `TestMain` in this package tries to connect to ALL 3 fulmine instances (fulmine, boltz-fulmine, fulmine-mock)
- In Mode A (minimal stack), **comment out `TestMain`** temporarily so your test can run with just 1 fulmine instance
- Set up gRPC/HTTP connections directly in your test function instead
- **Uncomment `TestMain` before finalizing** — verify all tests still pass

**Minimal e2e test template (with direct connection setup — for Mode A):**
```go
func TestYourFeatureName(t *testing.T) {
    ctx := t.Context()

    // 1. Set up gRPC connection directly (when TestMain is commented out)
    conn, err := grpc.NewClient("localhost:7000", grpc.WithTransportCredentials(insecure.NewCredentials()))
    require.NoError(t, err)
    defer conn.Close()
    client := pb.NewServiceClient(conn)

    // 2. Exercise your feature
    resp, err := client.YourEndpoint(ctx, &pb.YourRequest{...})
    require.NoError(t, err)

    // 3. Assert
    require.Equal(t, expected, resp.SomeField)
}
```

**IMPORTANT:** Always read `utils_test.go` and existing test files to discover the actual helper functions and patterns available in this package.

**Rules:**
- Always `require.*` (not `assert.*`) — stops on first failure
- For async events (gRPC streams, callbacks): use goroutines + channels/mutex + timeout
- When using Mode B (full stack with TestMain active), you can use package-level vars and helpers from `utils_test.go`

### 5b. Iteration Loop

```
REPEAT:
  a. Write/modify code

  b. Write unit test where suitable:
     go test -v -count=1 ./internal/path/to/package/...

  c. Comment out TestMain if using Mode A (so test can run with single fulmine)

  d. Run your e2e test:
     go test -v -count=1 -run TestYourName -timeout 600s -race -p=1 ./internal/test/e2e/...

  e. MANDATORY on failure: Read ALL relevant logs:
     - Test output (terminal)
     - /tmp/fulmine-dev.log (if running fulmine locally)
     - docker logs arkd 2>&1 | tail -100
     - docker logs fulmine 2>&1 | tail -100 (if fulmine is in Docker)

  f. If test fails → fix code → go back to (a)

  g. If test passes → UNCOMMENT TestMain → run 1-2 regression tests → done
```

**Key rules:**
- Docker deps stay running between iterations — only restart what you changed
- arkd MUST stay in Docker (TestMain uses `docker exec arkd arkd` for CLI commands)
- When using Mode A: fulmine runs locally, comment out TestMain during development
- When done: uncomment TestMain and verify with full stack if possible

### Running a specific sub-test:

```bash
go test -v -count=1 -run "TestChainSwapArkToBTC" -timeout 600s -race -p=1 ./internal/test/e2e/...
```

### Running all integration tests (slow, final verification only):

```bash
make integrationtest
```

### If wallet state is corrupt, wipe and reinitialize:

```bash
rm -rf ${FULMINE_REPO}/datadir
# Then restart fulmine and redo Section 3 (Wallet Setup)
```

## Section 6: Cleanup

### Mode A:

```bash
# Stop local fulmine (Ctrl+C)
cd ${FULMINE_REPO}
docker compose -f test.docker-compose.yml down -v
```

### Mode B/C:

```bash
# Stop local fulmine/fulmine-mock (Ctrl+C)
cd ${FULMINE_REPO}
make down-test-env
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
| fulmine delegator | 7004 | gRPC | Main fulmine delegator (host 7004 → container 7002) |
| fulmine-mock gRPC | 7100 | gRPC | Mock client (Docker or local) |
| fulmine-mock HTTP | 7101 | HTTP | Mock client REST |
| arkd gRPC | 7070 | gRPC | Docker |
| arkd admin | 7071 | HTTP | Docker |
| Boltz API | 9001 | HTTP | Docker |
| Boltz WS | 9004 | WS | Docker |
| mock-boltz API/WS | 9101 | HTTP/WS | Docker (maps container 9001 → host 9101) |
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

| Test | File | Description | Mode |
|------|------|-------------|------|
| TestSubmarineSwap | swap_test.go | Basic submarine swap | B |
| TestReverseSwap | swap_test.go | Reverse swap | B |
| TestCircularSwap | swap_test.go | Circular swap | B |
| TestConcurrentSwaps | swap_test.go | Multiple concurrent swaps | B |
| TestChainSwapArkToBTC | chainswap_test.go | Chain swap Ark to BTC | B |
| TestChainSwapBTCtoARK | chainswap_test.go | Chain swap BTC to Ark | B |
| TestChainSwapBTCtoARKWithQuote | chainswap_test.go | Chain swap with quote | B |
| TestChainSwapRecovery | chainswap_test.go | Chain swap recovery flow | B |
| TestChainSwapMockArkToBTCScriptPathClaim | chainswap_test.go | Mock: script path claim | C |
| TestChainSwapMockArkToBTCCooperativeRefund | chainswap_test.go | Mock: cooperative refund | C |
| TestChainSwapMockArkToBTCUnilateralRefund | chainswap_test.go | Mock: unilateral refund | C |
| TestChainSwapMockBTCToARKUnilateralRefund | chainswap_test.go | Mock: BTC to Ark refund | C |
| TestChainSwapMockRefundChainSwapRPC | chainswap_test.go | Mock: refund via RPC | C |
| TestVHTLC | vhtlc_test.go | VHTLC create and settle | A/B |
| TestClaimVhtlcSettlement | vhtlc_test.go | Claim path settlement | A/B |
| TestRefundVhtlcSettlement | vhtlc_test.go | Refund path settlement | A/B |
| TestSettleVHTLCByDelegateRefund | vhtlc_test.go | Delegate refund settlement | A/B |
| TestDelegate | delegator_test.go | Basic delegator operation | A/B |
| TestDelegateCollaborativeExit | delegator_test.go | Delegator collaborative exit | A/B |
| TestDelegateSameInput | delegator_test.go | Delegator same input handling | A/B |
| TestDelegateSeveralInputs | delegator_test.go | Delegator multiple inputs | A/B |
