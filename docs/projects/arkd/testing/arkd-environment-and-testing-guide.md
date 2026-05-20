# arkd Environment & Testing Guide

Complete guide for setting up arkd environments, running tests, and troubleshooting. This guide covers everything needed to bring up services, validate health, execute tests, and debug issues.

**Target Audience**: ark-developer agent, QA engineers, testers
**For Code Patterns**: See [arkd Development Reference](./arkd-development-reference.md)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup with Health Checks](#environment-setup-with-health-checks)
3. [Choosing the Right Make Target](#choosing-the-right-make-target)
4. [Testing REST Endpoints](#testing-rest-endpoints)
5. [Testing gRPC Endpoints](#testing-grpc-endpoints)
6. [Test Types & Execution](#test-types--execution)
7. [Debugging Tests](#debugging-tests)
8. [Log Checking & Analysis](#log-checking--analysis)
9. [Troubleshooting Test Failures](#troubleshooting-test-failures)
10. [Troubleshooting Runtime Issues](#troubleshooting-runtime-issues)
11. [Best Practices](#best-practices)

---

## Prerequisites

- **Go 1.26.3 or later**
- **Docker and Docker Compose**
- **Nigiri** for Bitcoin regtest
- **grpcurl** (optional, for gRPC testing)

**Install Nigiri:**
```bash
curl https://nigiri.vulpem.com | bash
```

---

## Environment Setup with Health Checks

### Complete Pre-Flight Check Script

This script checks if services are already running before starting them:

```bash
#!/bin/bash
# arkd-preflight-check.sh

set -e

echo "🔍 Checking Ark environment..."

# 1. Check Nigiri (use RPC, not 'nigiri status' which doesn't exist)
echo -n "Nigiri: "
if nigiri rpc getblockchaininfo &>/dev/null; then
    echo "✅ running"
else
    echo "⚠️  not running, starting..."
    nigiri start
    sleep 5
    echo "✅ started"
fi

# 2. Check arkd
echo -n "arkd: "
if curl -fsS http://localhost:7070/v1/health &>/dev/null 2>&1; then
    echo "✅ running"

    # Check wallet balance
    if command -v arkd &>/dev/null; then
        BALANCE=$(arkd wallet balance 2>/dev/null | awk '/Balance:/ {print $2}')
        if [[ -n "$BALANCE" ]]; then
            echo "  Balance: $BALANCE BTC"

            # Top up if low
            if (( $(echo "$BALANCE < 0.1" | bc -l) )); then
                echo "  ⚠️  Low balance, funding..."
                ADDR=$(arkd wallet address)
                nigiri faucet "$ADDR" 1.0
                nigiri rpc --generate 6
                echo "  ✅ Funded and confirmed"
            fi
        fi
    fi
else
    echo "⚠️  not running"
    echo ""
    echo "Start arkd with one of:"
    echo "  make run-light    # SQLite, fast, no deps"
    echo "  make run          # PostgreSQL + Redis"
    echo "  make docker-run   # Full stack (wait 30s)"
fi

# 3. Check arkd-wallet
echo -n "arkd-wallet: "
if curl -fsS http://localhost:6060/v1/wallet/status &>/dev/null 2>&1; then
    echo "✅ running"
else
    echo "⚠️  not running"
fi

# 4. Check NBXplorer
echo -n "NBXplorer: "
if curl -fsS http://localhost:32838/v1/health &>/dev/null 2>&1; then
    echo "✅ running"
else
    echo "⚠️  not running"
fi

echo ""
echo "Environment check complete!"
```

### Manual Step-by-Step Setup

**Step 1: Start Bitcoin Regtest**

```bash
# Check if Nigiri is already running
if nigiri rpc getblockchaininfo &>/dev/null; then
    echo "✅ Nigiri already running"
else
    nigiri start
fi

# Verify
nigiri rpc getblockchaininfo
curl http://localhost:3000/api/blocks/tip/height
```

**Step 2: Choose Your arkd Stack**

See [Choosing the Right Make Target](#choosing-the-right-make-target) section below.

**Step 3: Verify Health**

```bash
# arkd health
curl http://localhost:7070/v1/health

# arkd-wallet health
curl http://localhost:6060/v1/wallet/status

# NBXplorer health
curl http://localhost:32838/v1/health
```

**Step 4: Initialize and Fund Wallet**

```bash
# Create wallet (if needed)
arkd wallet create --password test123

# Unlock wallet
arkd wallet unlock --password test123

# Get address
ADDR=$(arkd wallet address)
echo "Address: $ADDR"

# Fund wallet
nigiri faucet "$ADDR" 1.0

# Generate confirmations
nigiri rpc --generate 6

# Check balance
arkd wallet balance
```

---

## Choosing the Right Make Target

### Decision Tree

```
┌─────────────────────────────────────────┐
│ What do you want to do?                 │
└─────────────────────────────────────────┘
                │
                ▼
    ┌───────────────────────┐
    │ Fast local dev?       │
    └───────────────────────┘
         │ YES                │ NO
         ▼                    ▼
    make run-light      ┌────────────────┐
    (SQLite + inmem)    │ Full stack     │
                        │ integration?   │
                        └────────────────┘
                             │ YES    │ NO
                             ▼        ▼
                        make        make run
                        docker-run  (PostgreSQL
                        (wait 30s)  + Redis)
```

### Make Target Comparison

| Target | Database | Cache | Services | Startup | Use Case |
|--------|----------|-------|----------|---------|----------|
| `make run-light` | SQLite | In-memory | arkd only | ~2s | **Local dev**, fast iteration |
| `make run` | PostgreSQL | Redis | arkd + deps | ~10s | **Production-like** config testing |
| `make docker-run` | PostgreSQL | Redis | Full stack | ~30s | **Integration testing**, E2E tests |

### When to Use Each Target

**Use `make run-light` when:**
- Developing locally and want fast restarts
- Testing application logic (not infrastructure)
- Don't need production databases
- Want minimal dependencies

```bash
make run-light
```

**Use `make run` when:**
- Testing production-like configuration
- Need PostgreSQL or Redis
- Testing database migrations
- Want to verify production setup works

```bash
# Starts PostgreSQL and Redis via Docker
make run
```

**Use `make docker-run` when:**
- Running integration tests
- Need full stack (arkd + wallet + NBXplorer + Bitcoin)
- Testing complete workflows
- Running E2E tests in CI

```bash
make docker-run
# CRITICAL: Wait 30 seconds for initialization
sleep 30
```

### Environment Lifecycle

**Setup:**
```bash
nigiri start
make docker-run
sleep 30  # Critical wait period!
```

**Running Tests:**
```bash
make test               # Unit tests
make integrationtest    # E2E tests
```

**Cleanup:**
```bash
make docker-stop
```

**Complete Reset:**
```bash
make docker-stop
docker volume prune -f
nigiri stop
nigiri start
make docker-run
sleep 30
```

---

## Testing REST Endpoints

### Server Endpoints (arkd)

**Health check:**
```bash
curl http://localhost:7070/v1/health
```

**Server info:**
```bash
curl http://localhost:7070/v1/info | jq
```

**Wallet status (admin):**
```bash
curl http://localhost:7070/v1/admin/wallet/status | jq
```

**List VTXOs:**
```bash
curl http://localhost:7070/v1/admin/wallet/vtxos | jq
```

### Wallet Endpoints (arkd-wallet)

**Wallet status:**
```bash
curl http://localhost:6060/v1/wallet/status | jq
```

**Health check:**
```bash
curl http://localhost:6060/health
```

### NBXplorer Endpoints

**Health:**
```bash
curl http://localhost:32838/v1/health | jq
```

**Bitcoin sync status:**
```bash
curl http://localhost:32838/v1/cryptos/BTC/status | jq
```

### Testing with httpie (Alternative)

```bash
# Install httpie
brew install httpie  # macOS
apt install httpie   # Ubuntu

# Use with better formatting
http localhost:7070/v1/info
http localhost:6060/v1/wallet/status
```

---

## Testing gRPC Endpoints

### Important Note

arkd **does NOT support gRPC reflection**, so you must specify proto file paths explicitly.

### Setup Environment Variables

```bash
# Add to ~/.zshrc or ~/.bashrc
export ARKD_PROTO_PATH="${ARKD_REPO:-/Users/dusansekulic/code/go/ark}/api-spec/protobuf"
export GRPC_GATEWAY_PATH="$(go env GOPATH)/pkg/mod/github.com/grpc-ecosystem/grpc-gateway@v1.16.0/third_party/googleapis"
```

### Common gRPC Calls

**GetInfo:**
```bash
grpcurl \
  -plaintext \
  -import-path $ARKD_PROTO_PATH \
  -import-path $GRPC_GATEWAY_PATH \
  -proto ark/v1/service.proto \
  -d '{}' \
  localhost:7070 \
  ark.v1.ArkService/GetInfo
```

**GetEventStream:**
```bash
grpcurl \
  -plaintext \
  -import-path $ARKD_PROTO_PATH \
  -import-path $GRPC_GATEWAY_PATH \
  -proto ark/v1/service.proto \
  -d '{}' \
  localhost:7070 \
  ark.v1.ArkService/GetEventStream
```

**Wallet GetStatus:**
```bash
grpcurl \
  -plaintext \
  -import-path $ARKD_PROTO_PATH \
  -import-path $GRPC_GATEWAY_PATH \
  -proto ark/v1/wallet.proto \
  -d '{}' \
  localhost:7070 \
  ark.v1.WalletService/GetStatus
```

**List available services (requires reflection - won't work):**
```bash
# This WILL FAIL because arkd doesn't support reflection
grpcurl -plaintext localhost:7070 list
# Error: server does not support the reflection API
```

### Alternative: Use arkd CLI

Instead of grpcurl, use arkd CLI commands which wrap gRPC internally:

```bash
# Much simpler!
arkd wallet status
arkd wallet balance
arkd wallet address
arkd round-info
arkd rounds
```

### Helper Script for gRPC Testing

Create `scripts/grpc-call.sh`:
```bash
#!/bin/bash
# Helper for making gRPC calls to arkd

ARKD_PROTO="${ARKD_REPO}/api-spec/protobuf"
GRPC_GATEWAY="$(go env GOPATH)/pkg/mod/github.com/grpc-ecosystem/grpc-gateway@v1.16.0/third_party/googleapis"

grpcurl \
  -plaintext \
  -import-path "$ARKD_PROTO" \
  -import-path "$GRPC_GATEWAY" \
  -proto "$1" \
  -d "${2:-{}}" \
  localhost:7070 \
  "$3"

# Usage:
# ./scripts/grpc-call.sh ark/v1/service.proto '{}' ark.v1.ArkService/GetInfo
```

---

## Test Types & Execution

### Unit Tests

Test individual components in isolation.

**Run all unit tests:**
```bash
make test
```

This automatically:
1. Starts PostgreSQL test database
2. Starts Redis
3. Runs tests in all packages
4. Cleans up

**Run specific package:**
```bash
go test -v -count=1 ./internal/core/application/...
go test -v -count=1 ./internal/infrastructure/db/...
```

**Run with race detection:**
```bash
go test -v -count=1 -race ./internal/...
```

**Generate coverage report:**
```bash
make cov
# Opens coverage.html in browser
```

**Run tests with verbose output:**
```bash
go test -v -count=1 ./...
```

### Integration Tests (E2E)

Test complete workflows with real Bitcoin regtest.

**Prerequisites (CRITICAL):**
```bash
nigiri start
make docker-run
sleep 30  # Wait for initialization!
```

**Run all E2E tests:**
```bash
make integrationtest

# Or directly:
go test -v -count=1 -timeout 600s github.com/arkade-os/arkd/test/e2e
```

**Run specific test:**
```bash
# Single test
go test -v -count=1 -timeout 600s \
  github.com/arkade-os/arkd/test/e2e \
  -run TestSettleInSameRound

# Test pattern
go test -v -count=1 -timeout 600s \
  github.com/arkade-os/arkd/test/e2e \
  -run TestUnilateral

# Specific subtest
go test -v -count=1 -timeout 600s \
  github.com/arkade-os/arkd/test/e2e \
  -run TestUnilateralExit/leaf
```

### Test Coverage by Feature

**Settlement Tests:**
```bash
go test -v -run TestSettleInSameRound
go test -v -run TestBatchSettleMultipleClients
```

**Exit Tests:**
```bash
go test -v -run TestUnilateralExit
go test -v -run TestCollaborativeExit
```

**Fraud Detection:**
```bash
go test -v -run TestReactToRedemptionOfRefreshedVtxos
go test -v -run TestReactToRedemptionOfVtxosSpentAsync
```

**Off-Chain Transactions:**
```bash
go test -v -run TestChainOffchainTransactions
go test -v -run TestAliceSendsSeveralTimesToBob
```

**Recovery:**
```bash
go test -v -run TestSweep
go test -v -run TestRedeemNotes
```

### Simulation Tests

Performance and load testing with multiple concurrent clients.

**Quick start (5 clients):**
```bash
make run-simulation
```

**Custom configuration:**
```bash
# 10 clients
make run-simulation CLIENTS=10

# 10 clients, exact batch size
make run-simulation CLIENTS=10 MAX=10

# 20 clients, min batch of 5
make run-simulation CLIENTS=20 MIN=5

# Large simulation
make run-simulation CLIENTS=50 MIN=10 MAX=50
```

**Simulation parameters:**
- `CLIENTS`: Number of concurrent clients (default: 5)
- `MIN`: Minimum participants per round (default: same as CLIENTS)
- `MAX`: Maximum participants per round (default: 128)

**Analyze results:**
```bash
cat report.json | jq
```

Output includes:
- Round statistics (intents, VTXOs, tree nodes)
- Performance metrics (latency, CPU, memory)
- Stage breakdown
- Tree visualization URL

### Performance Tests

**Smoke tests:**
```bash
go test -v -count=1 -timeout 1200s \
  github.com/arkade-os/arkd/test/e2e \
  -run TestBatchSettleMultipleClients \
  -args -smoke -num-clients=10
```

**Benchmarks:**
```bash
go test -bench=. -benchmem ./internal/...

# Specific benchmark
go test -bench=BenchmarkRoundExecution -benchmem \
  ./internal/core/application/
```

---

## Debugging Tests

### View Docker Logs

```bash
# Follow arkd logs
docker logs arkd -f

# Follow wallet logs
docker logs arkd-wallet -f

# Follow NBXplorer logs
docker logs nbxplorer -f

# Last 100 lines
docker logs arkd --tail 100

# Save to file
docker logs arkd > arkd.log 2>&1
```

### Enable Debug Logging

```bash
# Set log level (0=panic, 6=trace)
export ARKD_LOG_LEVEL=6

# For tests
ARKD_LOG_LEVEL=6 go test -v -run TestName

# In Docker (edit docker-compose.regtest.yml)
ARKD_LOG_LEVEL: 6
```

### Access Docker Containers

```bash
# Open shell in arkd container
docker exec -it arkd /bin/bash

# Run commands in container
docker exec arkd ark balance
docker exec arkd ark wallet status
```

### Manual Bitcoin Operations

```bash
# Generate blocks
nigiri rpc --generate 10

# Check block height
nigiri rpc getblockcount

# Fund address
nigiri faucet <address> 1.0

# Get blockchain info
nigiri rpc getblockchaininfo

# Check mempool
nigiri rpc getmempoolinfo
```

---

## Log Checking & Analysis

### Log Locations

**Docker containers:**
- arkd: `docker logs arkd`
- arkd-wallet: `docker logs arkd-wallet`
- NBXplorer: `docker logs nbxplorer`
- Bitcoin: `nigiri logs`

**Save logs:**
```bash
# Save arkd logs
docker logs arkd > arkd.log 2>&1

# Follow and save
docker logs arkd -f | tee arkd.log
```

### Filtering Logs

```bash
# Filter for specific events
docker logs arkd -f | grep -i round
docker logs arkd -f | grep -i vtxo
docker logs arkd -f | grep -i error
docker logs arkd -f | grep -E '(error|fatal|panic)'

# Show last 30 minutes
docker logs arkd --since=30m
```

### Health Check Endpoints

```bash
# arkd
curl http://localhost:7070/v1/health

# arkd-wallet
curl http://localhost:6060/v1/wallet/status

# NBXplorer
curl http://localhost:32838/v1/health

# Bitcoin (via Nigiri)
nigiri rpc getnetworkinfo
```

### Common Log Patterns

**Connection errors:**
- "connection refused"
- "dial tcp"

**Database issues:**
- "database connection failed"
- "migration failed"

**Wallet issues:**
- "wallet is locked"
- "insufficient balance"

**Round issues:**
- "round not starting"
- "no participants"

**Signer issues:**
- "signer not configured"
- "signature failed"

---

## Troubleshooting Test Failures

### Setup Issues

**NBXplorer Connection Failed:**

```bash
# Check if running
docker ps | grep nbxplorer

# View logs
docker logs nbxplorer

# Verify health
curl http://localhost:32838/v1/health

# Restart
docker restart nbxplorer pgnbxplorer
```

**Bitcoin Node Not Responding:**

```bash
# Check Nigiri (use RPC, not status)
nigiri rpc getblockchaininfo

# Restart if needed
nigiri stop
nigiri start

# Verify Esplora
curl http://localhost:3000/api/blocks/tip/height
```

**Port Conflicts:**

```bash
# Find process using port
lsof -i :7070
lsof -i :6060

# Kill process
kill -9 <PID>

# Or use different ports
export ARKD_PORT=7071
```

**Database Connection Errors:**

```bash
# PostgreSQL
docker ps | grep ark-pg
make droppg && make pg

# Redis
docker ps | grep redis
docker restart ark-redis
```

### Test Execution Issues

**Tests Hang or Timeout:**

```bash
# Check all services running
docker ps

# Check Nigiri
nigiri rpc getblockchaininfo

# Increase timeout
go test -timeout 1200s ...

# Check for deadlocks
docker logs arkd --tail 100 | grep -i panic
```

**Connection Refused Errors:**

```bash
# Verify services
docker ps
curl http://localhost:7070/v1/health
curl http://localhost:6060/v1/wallet/status

# Wait longer after docker-run
make docker-run
sleep 30  # Give services time to initialize
```

**Insufficient Funds:**

```bash
# Fund server wallet
ADDR=$(docker exec arkd ark wallet address)
nigiri faucet "$ADDR" 1.0
nigiri rpc --generate 6

# Check balance
docker exec arkd ark wallet balance
```

**State Inconsistencies:**

```bash
# Complete reset
make docker-stop
docker volume prune -f
nigiri stop
nigiri start
make docker-run
sleep 30
```

---

## Troubleshooting Runtime Issues

### Wallet Locked

```bash
# Unlock via CLI
arkd wallet unlock --password <password>

# Or via API
curl -X POST http://localhost:7070/v1/admin/wallet/unlock \
  -H "Content-Type: application/json" \
  -d '{"password":"<password>"}'
```

### Round Not Starting

```bash
# Check round config in docker-compose.regtest.yml
ARKD_ROUND_INTERVAL=10
ARKD_ROUND_MIN_PARTICIPANTS_COUNT=1

# View round events
docker logs arkd -f | grep -i round

# Generate blocks to trigger scheduler
nigiri rpc --generate 1
```

### Signer Not Loaded

```bash
# Option 1: Environment variable (before start)
export ARKD_WALLET_SIGNER_KEY=<private-key>
make run-wallet

# Option 2: Via API (after start)
arkd signer load --signer-prvkey <private-key>

# Option 3: Use wallet as signer
arkd signer load --signer-url localhost:6060
```

### Memory Issues

```bash
# Reduce simulation size
make run-simulation CLIENTS=5

# Monitor memory
docker stats

# Increase Docker memory
# Docker Desktop → Settings → Resources → Memory
```

---

## Best Practices

1. **Always run tests before PR:**
   ```bash
   make test && make integrationtest
   ```

2. **Use `-count=1` to disable test caching:**
   ```bash
   go test -count=1 ./...
   ```

3. **Set appropriate timeouts for E2E tests:**
   ```bash
   go test -timeout 600s ...  # 10 minutes
   ```

4. **Clean environment between test runs:**
   ```bash
   make docker-stop
   make docker-run
   sleep 30
   ```

5. **Check logs when debugging:**
   ```bash
   docker logs arkd --tail 100
   ```

6. **Run specific tests when debugging:**
   ```bash
   go test -v -run TestSpecificTest
   ```

7. **Wait 30 seconds after docker-run:**
   ```bash
   make docker-run
   sleep 30  # Critical!
   make integrationtest
   ```

8. **Check services before running tests:**
   ```bash
   ./scripts/preflight-check.sh  # Your pre-flight script
   ```

---

## See Also

- **[arkd Development Reference](./arkd-development-reference.md)** - Code patterns and architecture
- **[Architecture](../system/architecture.md)** - Understanding arkd internals
- **[Folder Structure](../system/folder_structure.md)** - Repository organization
- **[E2E Testing Overview](../../../ark/test/e2e/E2E_TESTING_OVERVIEW.md)** - Detailed test docs

---

**Last Updated**: 2026-02-19
**For**: ark-developer agent (environment setup, testing, troubleshooting)
