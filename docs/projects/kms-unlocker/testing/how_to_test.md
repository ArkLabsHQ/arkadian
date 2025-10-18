# How to Test KMS Unlocker

This guide explains how to run different types of tests for kms-unlocker.

## Unit Tests

Fast tests with no external dependencies, using mock implementations.

```bash
make test
```

**What it tests:**
- Core business logic
- Password provider implementations
- Backup service logic
- Error handling
- Configuration parsing

**Characteristics:**
- No Docker required
- Runs in seconds
- Safe for CI/CD
- No external services

## Integration Tests

End-to-end tests that validate complete workflows with real services.

```bash
make integrationtest
```

**Requirements:**
- Docker and Docker Compose
- Nigiri Bitcoin regtest environment
- 15+ minutes timeout

**What it tests:**
- Complete wallet lifecycle
- Local and AWS backup modes
- Connection resilience
- Auto-reconnect behavior
- Secret management

## Environment-Specific Tests

### Local Environment Test

Tests file-based backup with local services:

```bash
make integrationtest-local
```

**Duration:** ~5 minutes

**What it validates:**
- Wallet creation and unlock
- Local file backup
- Reconnection after arkd restart
- Graceful shutdown

### AWS Environment Test

Tests AWS Secrets Manager backup with LocalStack:

```bash
make integrationtest-aws
```

**Duration:** ~10 minutes

**What it validates:**
- LocalStack initialization
- AWS secret creation
- KMS-encrypted password retrieval
- Macaroon backup to Secrets Manager
- Seed backup to Secrets Manager

## E2E Test Workflow

The tests in `${KMS_UNLOCKER_REPO}/internal/test/e2e/e2e_test.go` demonstrate the complete flow.

### Local E2E Test Flow

1. **Start arkd services** (without kms-unlocker)
   - arkd, arkd-wallet, nbxplorer, pgnbxplorer

2. **Verify wallet not initialized**
   - Check `arkd wallet status` returns `initialized: false`

3. **Start kms-unlocker**
   - Wait 5 seconds for startup

4. **Verify initialization and unlock**
   - Wallet should be initialized
   - Wallet should be unlocked
   - Retry up to 30 times with 2-second intervals

5. **Test reconnection**
   - Stop arkd
   - Verify kms-unlocker still running
   - Restart arkd
   - Verify automatic unlock

6. **Test graceful shutdown**
   - Stop kms-unlocker
   - Verify clean shutdown

### AWS E2E Test Flow

Same as local, plus:

1. **Start LocalStack**
   - Wait for initialization (10 seconds)
   - Verify KMS and Secrets Manager ready

2. **Verify AWS resources**
   - Password secret exists
   - Seed secret created after initialization
   - Macaroon secrets created after unlock

3. **Verify secrets persist**
   - After arkd restart
   - Macaroon secrets still accessible

## Running Specific Tests

### Single Test Function

```bash
# Local test only
go test -v -count=1 ./internal/test/e2e/... -run TestKMSUnlockerLocalE2E

# AWS test only
go test -v -count=1 ./internal/test/e2e/... -run TestKMSUnlockerAWSE2E
```

### With Timeout

```bash
go test -v -count=1 -timeout=10m ./internal/test/e2e/... -run TestKMSUnlockerAWSE2E
```

### With Race Detection

```bash
go test -v -count=1 -race ./internal/test/e2e/...
```

### Skip Integration Tests

```bash
# Run only unit tests (skip integration)
go test -short -v ./...
```

## Coverage Report

Generate code coverage report:

```bash
make cov
```

Output shows coverage percentage for each package.

## CI Workflow

Run GitHub Actions workflows locally using act:

```bash
make ci-local
```

**Requirements:**
- Docker
- act tool (containerized)

**What it does:**
- Builds act container
- Runs integration test workflow
- Uses GitHub Actions YAML
- Tests CI/CD pipeline locally

## What to Verify After Tests

### 1. Wallet Status

```bash
docker exec arkd arkd wallet status
```

Expected output:
```
initialized: true
unlocked: true
```

### 2. Backup Files (Local Mode)

Check backup directory exists and contains seed:

```bash
docker exec kms-unlocker ls -la /data/kms-unlocker/
```

### 3. AWS Secrets (AWS Mode)

List all secrets:

```bash
make secrets
```

Expected secrets:
- `arkd-wallet-password`
- `arkd-wallet-seed-encrypted`
- `admin`

Get secret value:

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  secretsmanager get-secret-value --secret-id admin
```

### 4. Log Output

Check for expected log patterns:

```bash
docker-compose -f docker-compose.local.yml logs kms-unlocker | grep -i "unlock"
```

Expected patterns:
- "Unlocking wallet..."
- "Wallet unlocked successfully"
- "Connection state changed"

### 5. Macaroon Files

Verify macaroon files created:

```bash
docker exec arkd ls -la /data/regtest/macaroons/
```

Expected files:
- `admin.macaroon`
- `readonly.macaroon`

## Debugging Failed Tests

### Get Container Logs

```bash
# Last 50 lines
docker logs --tail=50 kms-unlocker

# Full logs
docker logs kms-unlocker > kms-unlocker.log
```

### Inspect Container

```bash
# Execute shell in container
docker exec -it kms-unlocker sh

# Check environment variables
docker exec kms-unlocker env | grep KMS_UNLOCKER
```

### Check Network

```bash
# List networks
docker network ls

# Inspect network
docker network inspect kms-unlocker-e2e_default
```

### Manual Wallet Operations

```bash
# Create wallet manually
docker exec arkd arkd wallet init --password ciaociao

# Check status
docker exec arkd arkd wallet status

# Unlock manually
docker exec arkd arkd wallet unlock --password ciaociao
```

## Test Best Practices

1. **Always cleanup after tests**
   - Tests automatically cleanup with `t.Cleanup()`
   - Manual cleanup: `make stop-local` or `make stop-aws`

2. **Check logs on failure**
   - E2E tests dump container logs on assertion failures
   - Review kms-unlocker and arkd logs together

3. **Allow sufficient time**
   - LocalStack needs 10+ seconds to initialize
   - Wallet operations may take 2-5 seconds
   - Use retry logic with timeouts

4. **Isolate test environments**
   - Local uses `kms-unlocker-e2e` project name
   - AWS uses `kms-unlocker-e2e-aws` project name
   - Prevents conflicts between test runs
