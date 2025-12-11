# How to Test Fulmine

This guide covers unit testing, package-specific tests, and integration testing for Fulmine.

## Unit Tests

Unit tests are fast and run without external dependencies. They test individual components in isolation.

### Run All Unit Tests

```bash
make test
```

This command:
- Runs all unit tests excluding integration tests
- Uses race detector (`-race` flag)
- Runs tests once (`--count=1` to avoid cache)
- Excludes `internal/test/e2e` directory

### Run Specific Package Tests

```bash
go test -v ./internal/core/application/...
go test -v ./internal/infrastructure/...
```

### Run with Coverage

```bash
make cov
```

This generates a coverage report for all packages.

### Generate Detailed Coverage Report

```bash
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html
```

Open `coverage.html` in your browser to view detailed coverage.

## VHTLC Tests

The VHTLC (Virtual Hash Time-Locked Contract) package has its own dedicated test suite.

### Run VHTLC Tests

```bash
make test-vhtlc
```

This runs tests specifically for the `pkg/vhtlc` package, covering:
- VHTLC address generation
- Script construction
- Claim and refund paths
- Timelock logic

## Integration Tests

Integration tests require a full Docker environment with all services running. They test end-to-end workflows.

### Complete Integration Test Workflow

Run the full integration test suite with these commands:

#### 1. Build Test Environment

Build Docker images for the test environment:

```bash
make build-test-env
```

This builds fresh images for:
- arkd (Ark server)
- arkd-wallet (Wallet service)
- fulmine (Wallet daemon)

#### 2. Start Services

Start all required services:

```bash
docker compose -f test.docker-compose.yml up -d
```

This starts the following services via Docker Compose:
- **Bitcoin regtest** (via Nigiri network)
- **Esplora** (chopsticks) at http://localhost:3000
- **PostgreSQL** for NBXplorer
- **NBXplorer** at http://localhost:32838
- **arkd-wallet** at port 6060
- **arkd** at port 7070
- **Boltz backend** at ports 9001 (HTTP) and 9004 (WebSocket)
- **fulmine** at ports 7000 (gRPC) and 7001 (HTTP)

Wait for all services to be healthy (typically 30-60 seconds).

#### 3. Setup Test Environment

Initialize Ark server and Fulmine wallet:

```bash
make setup-test-env
```

This runs setup scripts that:
- Configure and fund the Ark server
- Create and unlock the Fulmine wallet
- Prepare initial state for tests

#### 4. Run Integration Tests

Execute the integration test suite:

```bash
make integrationtest
```

This runs all end-to-end tests with:
- Verbose output (`-v`)
- No test caching (`-count=1`)
- Race detector (`-race`)
- Sequential execution (`-p=1`)

#### 5. Teardown

Stop and remove all test services:

```bash
make down-test-env
```

This stops and removes all containers, networks, and volumes.

### Quick Integration Test Run

For repeated test runs after initial setup:

```bash
# First time only
make build-test-env
docker compose -f test.docker-compose.yml up -d
make setup-test-env

# Run tests (can repeat)
make integrationtest

# Cleanup when done
make down-test-env
```

## What Integration Tests Cover

The integration test suite (`internal/test/e2e/e2e_test.go`) covers:

### Wallet Operations
- Wallet creation and initialization
- Wallet unlock and lock
- Wallet status checks

### Onboarding
- Generating boarding addresses
- Receiving onchain funds
- Converting boarding UTXOs to VTXOs via settle

### Sending
- **Offchain payments**: Sending funds within Ark network
- **Onchain payments**: Sending funds to Bitcoin addresses
- Balance verification after sends
- Transaction history tracking

### VTXOs
- Settling pending transactions
- Renewing expiring VTXOs
- Balance updates after settlement

### VHTLCs
- Creating VHTLC addresses
- Funding VHTLCs with offchain payments
- Claiming VHTLCs with preimages
- Refunding VHTLCs after timeout
- Listing VHTLC outputs

### Swaps (via Boltz)
- Lightning invoice generation
- Submarine swaps (Ark to Lightning)
- Reverse swaps (Lightning to Ark)
- Swap status tracking

### Virtual Transactions
- Retrieving virtual transaction data
- Transaction hex verification

## Test Environment Services

The test environment includes these services defined in `test.docker-compose.yml`:

| Service | Port | Purpose |
|---------|------|---------|
| bitcoin | 18443 | Bitcoin regtest node (Nigiri) |
| chopsticks | 3000 | Esplora API for blockchain data |
| pgnbxplorer | 5432 | PostgreSQL for NBXplorer |
| nbxplorer | 32838 | Bitcoin indexer for wallet |
| arkd-wallet | 6060 | Ark wallet and signer service |
| arkd | 7070 | Ark server |
| boltz | 9001, 9004 | Swap backend (HTTP + WebSocket) |
| fulmine | 7000, 7001 | Fulmine daemon (gRPC + HTTP) |

All services connect via the external `nigiri` Docker network.

## Running Specific Tests

### Run Single Test

```bash
go test -v -count=1 ./internal/test/e2e -run TestOnboard
```

### Run Tests Matching Pattern

```bash
go test -v -count=1 ./internal/test/e2e -run TestSend
```

This runs `TestSendOffChain` and `TestSendOnChain`.

## Test Utilities

Integration tests use helper functions defined in `internal/test/e2e/utils_test.go`:

- `getBalance()`: Retrieve wallet balance
- `getOnboardAddress(amount)`: Get boarding address
- `sendOffChain(address, amount)`: Send offchain payment
- `sendOnChain(address, amount)`: Send onchain payment
- `settle()`: Settle/renew VTXOs
- `createVHTLC(preimageHash, receiverPubkey)`: Create VHTLC
- `claimVHTLC(vhtlcId, preimage)`: Claim VHTLC
- `getTransactionHistory()`: Get tx history
- `faucet(address, amount)`: Fund address from regtest faucet

## Debugging Failed Tests

### View Test Logs

When tests fail, check service logs:

```bash
# Fulmine logs
docker logs fulmine

# Arkd logs
docker logs arkd

# All logs
docker-compose -f test.docker-compose.yml logs -f
```

### Inspect Test State

Connect to services during test execution:

```bash
# Check Fulmine status
curl http://localhost:7001/api/v1/wallet/status

# Check balance
curl http://localhost:7001/api/v1/balance

# Check Ark server
curl http://localhost:7070/info
```

### Run Tests with Debug Logging

Enable debug logs in the test environment:

```bash
# Edit test.docker-compose.yml temporarily
# Set FULMINE_LOG_LEVEL=5 for debug output

make up-test-env
make integrationtest
```

## Continuous Integration

For CI environments, use the complete workflow:

```bash
#!/bin/bash
set -e

# Build and start
make build-test-env
docker compose -f test.docker-compose.yml up -d

# Wait for services (adjust timing as needed)
sleep 30

# Setup
make setup-test-env

# Test
make integrationtest

# Cleanup
make down-test-env
```

## Test Best Practices

1. **Always clean up**: Run `make down-test-env` after testing
2. **Fresh builds**: Use `make build-test-env` when dependencies change
3. **Check logs first**: When tests fail, check Docker logs before debugging code
4. **Sequential execution**: Integration tests run with `-p=1` to avoid race conditions
5. **Timing sensitive**: Some tests use `time.Sleep()` for blockchain confirmations
