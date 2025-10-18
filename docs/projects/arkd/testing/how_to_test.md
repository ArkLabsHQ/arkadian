# How to Test arkd

Comprehensive guide for running unit tests, integration tests, and simulations.

## Test Types

### Unit Tests

Test individual components in isolation.

**Location**: `internal/`, `pkg/`

**Run all unit tests**:
```bash
make test
```

This automatically:
1. Starts PostgreSQL test database
2. Starts Redis
3. Runs tests in all packages
4. Cleans up test database

**Run specific package**:
```bash
go test -v -count=1 ./internal/core/application/...
go test -v -count=1 ./internal/infrastructure/db/...
```

**Run with race detection**:
```bash
go test -v -count=1 -race ./internal/...
```

**Generate coverage report**:
```bash
make cov
```

### Integration Tests (E2E)

Test complete workflows with real Bitcoin regtest.

**Location**: `test/e2e/`

**Prerequisites**:
```bash
# Must be running
nigiri start
make docker-run
```

**Run all E2E tests**:
```bash
make integrationtest

# Or directly
go test -v -count=1 -timeout 600s github.com/arkade-os/arkd/test/e2e
```

**Run specific test**:
```bash
# Single test
go test -v -count=1 -timeout 600s github.com/arkade-os/arkd/test/e2e -run TestSettleInSameRound

# Test pattern
go test -v -count=1 -timeout 600s github.com/arkade-os/arkd/test/e2e -run TestUnilateral

# Specific subtest
go test -v -count=1 -timeout 600s github.com/arkade-os/arkd/test/e2e -run TestUnilateralExit/leaf
```

## Simulation Tests

Performance and scalability tests with multiple clients.

### Quick Start

```bash
# Default: 5 clients settling in one batch
make run-simulation

# Custom client count
make run-simulation CLIENTS=10

# Custom batch size
make run-simulation CLIENTS=20 MIN=5 MAX=20
```

### Configuration Parameters

- **CLIENTS**: Number of concurrent clients (default: 5)
- **MIN**: Minimum participants per round (default: same as CLIENTS)
- **MAX**: Maximum participants per round (default: 128)

### Examples

```bash
# Exact batch of 10 clients
make run-simulation CLIENTS=10 MAX=10

# 20 clients with min batch size of 5
make run-simulation CLIENTS=20 MIN=5

# Large simulation with 50 clients
make run-simulation CLIENTS=50 MIN=10 MAX=50
```

### Simulation Output

After completion, check `report.json`:
```bash
cat report.json | jq .
```

Contains:
- Round statistics (intents, VTXOs, tree nodes)
- Performance metrics (latency, CPU, memory)
- Stage-by-stage breakdown
- Tree visualization URL

## Test Coverage by Feature

### Settlement Tests
```bash
go test -v -run TestSettleInSameRound
go test -v -run TestBatchSettleMultipleClients -args -smoke
```

### Exit Tests
```bash
go test -v -run TestUnilateralExit
go test -v -run TestCollaborativeExit
```

### Fraud Detection
```bash
go test -v -run TestReactToRedemptionOfRefreshedVtxos
go test -v -run TestReactToRedemptionOfVtxosSpentAsync
```

### Off-Chain Transactions
```bash
go test -v -run TestChainOffchainTransactions
go test -v -run TestAliceSendsSeveralTimesToBob
```

### Custom Scripts
```bash
go test -v -run TestSendToCLTVMultisigClosure
go test -v -run TestSendToConditionMultisigClosure
```

### Recovery
```bash
go test -v -run TestSweep
go test -v -run TestRedeemNotes
```

## Debugging Tests

### View Docker Logs

```bash
# Follow arkd logs
docker logs arkd -f

# Follow wallet logs
docker logs arkd-wallet -f

# Get last 100 lines
docker logs arkd --tail 100
```

### Enable Debug Logging

```bash
# Maximum verbosity
ARKD_LOG_LEVEL=6 go test -v -run TestName

# In Docker (edit docker-compose.regtest.yml)
ARKD_LOG_LEVEL: 6
```

### Access Docker Containers

```bash
# Open shell in arkd container
docker exec -it arkd /bin/bash

# Run ark CLI commands
docker exec -it arkd ark balance
docker exec -it arkd ark wallet status
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
```

## Test Environment Lifecycle

### Setup
```bash
# Start fresh environment
nigiri start
make docker-run
sleep 30  # Wait for initialization
```

### Running Tests
```bash
# Run test suite
make integrationtest
```

### Cleanup
```bash
# Stop services
make docker-stop

# Reset Nigiri (if needed)
nigiri stop
nigiri start
```

### Complete Reset
```bash
# Stop everything
make docker-stop
nigiri stop

# Remove Docker volumes
docker volume prune

# Restart clean
nigiri start
make docker-run
sleep 30
```

## CI/CD Testing

Tests run automatically on PRs via GitHub Actions:

- **Unit tests**: `.github/workflows/unit.yaml`
- **Integration tests**: `.github/workflows/integration.yaml`

Local CI simulation:
```bash
# Run what CI runs
make lint
make test
make docker-run
sleep 30
make integrationtest
make docker-stop
```

## Performance Testing

### Smoke Tests

Designed for performance validation:

```bash
# Run smoke test suite
go test -v -count=1 -timeout 1200s \
  github.com/arkade-os/arkd/test/e2e \
  -run TestBatchSettleMultipleClients \
  -args -smoke -num-clients=10
```

### Benchmarking

```bash
# Run benchmarks
go test -bench=. -benchmem ./internal/...

# Specific benchmark
go test -bench=BenchmarkRoundExecution -benchmem ./internal/core/application/
```

## Best Practices

1. **Always run tests before PR**: `make test && make integrationtest`
2. **Use -count=1**: Disables test caching for accurate results
3. **Set appropriate timeouts**: E2E tests need longer timeouts (600s+)
4. **Clean environment**: Reset between test runs if flaky
5. **Check logs**: Use `docker logs` for debugging failures
6. **Run specific tests**: Don't run full suite when debugging
7. **Parallel testing**: Most unit tests can run in parallel

## See Also

- [E2E Testing Overview](../../../ark/test/e2e/E2E_TESTING_OVERVIEW.md) - Detailed test documentation
- [Usage Guide](./usage.md) - Common commands
- [Troubleshooting](./troubleshooting.md) - Fixing test failures
