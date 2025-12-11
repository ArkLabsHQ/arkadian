# How to Test Ark Simulator

This guide covers testing strategies for ark-simulator, including validation tests, regression tests, and troubleshooting.

## Test Types

### Unit Tests

Unit tests validate individual simulator components in isolation.

**Run all unit tests**:
```bash
go test -v ./...
```

**Run with race detection**:
```bash
go test -v -race ./...
```

**Generate coverage report**:
```bash
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html
```

### Integration Tests (Simulation Runs)

Integration tests run actual simulations against a live Ark server to validate end-to-end workflows.

## Prerequisites for Integration Tests

Before running simulation tests:

### 1. Start Bitcoin Regtest

```bash
nigiri start
nigiri rpc generatetoaddress 600 bcrt1q6vdad6ngd9ep8edjgmemv697xed7j4233kswuf
```

### 2. Start Ark Stack

```bash
# Terminal 1: Start arkd-wallet
cd ${ARKD_REPO}
make run-wallet

# Terminal 2: Start arkd
cd ${ARKD_REPO}
make run-light

# Wait for services to initialize
sleep 10
```

### 3. Verify Services

```bash
# Check arkd
curl http://localhost:7070/v1/info

# Check arkd-wallet
curl http://localhost:6060/v1/wallet/status
```

## Running Simulation Tests

### Functional Validation Tests

Test basic functionality with small client counts:

#### Smoke Test (Quick Validation)

```bash
# 20 clients, 4 rounds
make run ARGS="--sim config/simulation_1_20.yaml"
```

**Expected results**:
- All clients onboard successfully
- Payments are sent and received
- Balances match expected values
- Completes in 1-3 minutes

**Validation**:
```bash
# Check server processed transactions
curl http://localhost:7070/v1/info | jq '.vtxos_count'

# Should show VTXOs created
```

#### Standard Functional Test

```bash
# 70 clients, broadcast pattern
make run ARGS="--sim config/simulation1.yaml"
```

**Expected results**:
- Round 1: 69 clients onboard
- Round 2: All send to client_69
- Round 3: client_69 claims all payments
- Round 4: Stats verification
- Completes in 2-5 minutes

### Performance Regression Tests

Establish baseline performance metrics:

#### Small Scale (32 clients)

```bash
make run ARGS="--sim config/simulation_1_32.yaml"
```

**Expected**:
- Round completion: 20-40s per round
- Total runtime: 3-5 minutes
- No errors or timeouts

#### Medium Scale (50 clients)

```bash
make run ARGS="--sim config/simulation_1_50.yaml"
```

**Expected**:
- Round completion: 30-60s per round
- Total runtime: 5-10 minutes
- No memory issues

#### Large Scale (128 clients)

```bash
make run ARGS="--sim config/simulation_1_128.yaml"
```

**Expected**:
- Round completion: 60-120s per round
- Total runtime: 10-30 minutes (local), 5-15 minutes (AWS)
- Server handles load without crashes

**Monitoring during large tests**:
```bash
# Watch arkd logs in separate terminal
docker logs -f arkd

# Monitor resource usage
top -p $(pgrep arkd)
```

### Endurance Tests

Test stability over multiple rounds:

#### Medium Endurance (20 rounds)

```bash
make run ARGS="--sim config/simulation_20.yaml"
```

**Expected**:
- Consistent performance across rounds
- No memory leaks or degradation
- Runtime: 10-20 minutes

#### Long Endurance (60 rounds)

```bash
make run ARGS="--sim config/simulation_60.yaml"
```

**Expected**:
- Sustained operation without failures
- Stable memory usage
- Runtime: 30-60 minutes

## Test Scenarios by Feature

### Testing Onboarding Flow

```bash
# Create test config
cat > config/test_onboard.yaml << 'EOF'
metadata:
  name: "Onboard Test"

ark_server:
  url: "http://localhost:7070"

clients:
  - id: "client_0"
  - id: "client_1"

rounds:
  - number: 1
    actions:
      client_0:
        - type: "Onboard"
          amount: 0.001
      client_1:
        - type: "Onboard"
          amount: 0.002
  - number: 2
    actions:
      client_0:
        - type: "Balance"
      client_1:
        - type: "Balance"
EOF

# Run test
make run ARGS="--sim config/test_onboard.yaml"
```

**Validate**:
- Both clients onboard successfully
- Balances reflect onboard amounts (minus fees)
- VTXOs created on server

### Testing Payment Flow

```bash
# Create test config
cat > config/test_payment.yaml << 'EOF'
metadata:
  name: "Payment Test"

ark_server:
  url: "http://localhost:7070"

clients:
  - id: "client_0"
  - id: "client_1"

rounds:
  - number: 1
    actions:
      client_0:
        - type: "Onboard"
          amount: 0.001
  - number: 2
    actions:
      client_0:
        - type: "SendAsync"
          amount: 0.0005
          to: "client_1"
  - number: 3
    actions:
      client_1:
        - type: "Claim"
      client_1:
        - type: "Balance"
EOF

# Run test
make run ARGS="--sim config/test_payment.yaml"
```

**Validate**:
- Payment sent successfully
- Claim succeeds
- Recipient balance updated correctly

### Testing Balance Queries

```bash
# After onboarding, verify balances
make run ARGS="--sim config/simulation_1_20.yaml"

# Check individual client balance via API
# (requires client wallet address tracking in simulator)
```

### Testing Stats Queries

```bash
# Run simulation and check stats
make run ARGS="--sim config/simulation1.yaml"

# Verify server stats
curl http://localhost:7070/v1/info | jq '{
  vtxos_count,
  pending_payments_count
}'
```

## Automated Test Suite

Create a comprehensive test script:

```bash
#!/bin/bash
# test_suite.sh

set -e

echo "Starting Ark Simulator Test Suite"

# Functional tests
echo "Running functional tests..."
make run ARGS="--sim config/simulation_1_20.yaml"
echo "✓ Smoke test passed"

make run ARGS="--sim config/simulation1.yaml"
echo "✓ Standard functional test passed"

# Performance tests
echo "Running performance tests..."
make run ARGS="--sim config/simulation_1_32.yaml"
echo "✓ Small scale test passed"

make run ARGS="--sim config/simulation_1_50.yaml"
echo "✓ Medium scale test passed"

# Optional large scale
# make run ARGS="--sim config/simulation_1_128.yaml"
# echo "✓ Large scale test passed"

echo "All tests passed!"
```

Run the suite:
```bash
chmod +x test_suite.sh
./test_suite.sh
```

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Simulator Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.24.6'

      - name: Install Nigiri
        run: curl https://nigiri.vulpem.com | bash

      - name: Start Bitcoin Regtest
        run: |
          nigiri start
          sleep 10
          nigiri rpc generatetoaddress 600 bcrt1q6vdad6ngd9ep8edjgmemv697xed7j4233kswuf

      - name: Start Ark Stack
        run: |
          cd ../arkd
          make run-wallet &
          sleep 5
          make run-light &
          sleep 10

      - name: Run Unit Tests
        run: go test -v -race ./...

      - name: Run Smoke Test
        run: make run ARGS="--sim config/simulation_1_20.yaml"

      - name: Run Functional Test
        run: make run ARGS="--sim config/simulation1.yaml"
```

## Validation Checklist

After running tests, verify:

- [ ] All rounds completed successfully
- [ ] No errors in simulator output
- [ ] No errors in arkd logs
- [ ] Balances match expected values
- [ ] Server stats reflect correct transaction counts
- [ ] No memory leaks or resource exhaustion
- [ ] Performance within acceptable thresholds

## Test Failure Analysis

### Common Failure Patterns

#### Balance Insufficient

```
[client_5] SendAsync: ERROR insufficient balance
```

**Root cause**: Client trying to send more than available balance

**Fix**:
- Increase initial onboard amount
- Reduce send amounts
- Verify onboard succeeded in previous round

#### Round Timeout

```
[Round 3] ERROR: timeout waiting for round finalization
```

**Root cause**: Server taking too long to process round

**Debug**:
```bash
# Check arkd logs
docker logs arkd | tail -50

# Check server load
curl http://localhost:7070/v1/info

# Verify Bitcoin regtest is responsive
nigiri rpc getblockcount
```

**Fix**:
- Reduce client count
- Increase round interval in arkd config
- Mine more blocks on regtest

#### Connection Refused

```
[Orchestrator] Cannot connect to Ark server at http://localhost:7070
```

**Root cause**: arkd not running or not reachable

**Fix**:
```bash
# Verify arkd is running
curl http://localhost:7070/v1/info

# If not running, start it
cd ${ARKD_REPO}
make run-light
```

### Debugging Tips

1. **Enable verbose logging**:
   ```bash
   make run ARGS="--sim config/simulation1.yaml --verbose"
   ```

2. **Check arkd logs**:
   ```bash
   # Real-time monitoring
   docker logs -f arkd

   # Last 100 lines
   docker logs arkd --tail 100
   ```

3. **Verify Bitcoin regtest**:
   ```bash
   nigiri status
   nigiri rpc getblockchaininfo
   ```

4. **Inspect server state**:
   ```bash
   curl http://localhost:7070/v1/info | jq .
   curl http://localhost:7070/v1/wallet/balance
   ```

5. **Monitor resources**:
   ```bash
   docker stats arkd
   ```

## Best Practices

1. **Start small**: Test with 5-20 clients before scaling
2. **Validate incrementally**: Add Balance actions after state changes
3. **Clean environment**: Reset between test runs
4. **Monitor continuously**: Watch arkd logs during tests
5. **Document baselines**: Record expected performance metrics
6. **Test edge cases**: Empty balances, max clients, long endurance

## See Also

- [How to Run](./how_to_run.md) - Setup and execution guide
- [Usage Guide](./usage.md) - Configuration patterns
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
- [Local Deployment](./local-deployment.md) - Advanced local setup
