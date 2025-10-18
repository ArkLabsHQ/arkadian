# How to Run KMS Unlocker

This guide explains different ways to run kms-unlocker for various use cases.

## Development Workflow

### Active Development Mode

Use this when actively coding and iterating:

```bash
# 1. Start Nigiri
nigiri start

# 2. Start all services except kms-unlocker
make dev-local

# 3. Code and make changes...

# 4. Run kms-unlocker from source
make run
```

**Benefits:**
- Fast iteration cycle
- Direct access to debug output
- Easy to modify and test changes
- No container rebuild needed

### Full Docker Mode

Use this to test the complete system:

**Local mode:**
```bash
make run-local
```

**AWS mode:**
```bash
make run-aws
```

**Benefits:**
- Tests production-like environment
- Validates Docker configuration
- Tests complete service integration

## Local Mode (File-based Backup)

### Services Included

- **arkd** - ARK daemon on port 7070
- **arkd-wallet** - Wallet service on port 6060
- **nbxplorer** - Blockchain explorer on port 32838
- **pgnbxplorer** - PostgreSQL database for nbxplorer
- **kms-unlocker** - Wallet unlocker service

### Configuration

Key environment variables in `docker-compose.local.yml`:

```yaml
KMS_UNLOCKER_SERVER_URL=arkd:7070
KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE=env
KMS_UNLOCKER_PASSWORD=ciaociao
KMS_UNLOCKER_BACKUP_TYPE=local
KMS_UNLOCKER_MACAROONS_PATH=/data/macaroons
KMS_UNLOCKER_LOG_LEVEL=5
```

### Backup Location

Local backup directory inside container:
- Path: `/data/kms-unlocker` (mounted from Docker volume)
- Contains: `seed.txt` and other backup files

### Use Case

Perfect for:
- Local development
- Testing basic functionality
- No AWS dependencies
- Fast setup and teardown

### Running

```bash
# Start all services
make run-local

# View logs
docker-compose -f docker-compose.local.yml logs -f

# View specific service logs
docker-compose -f docker-compose.local.yml logs -f kms-unlocker

# Stop all services
make stop-local
```

## AWS Mode (LocalStack)

### Services Included

All local mode services plus:
- **localstack** - AWS service emulator on port 4566

### Configuration

Key environment variables in `docker-compose.aws.yml`:

```yaml
KMS_UNLOCKER_SERVER_URL=arkd:7070
KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE=aws
KMS_UNLOCKER_SECRET_ID=arkd-wallet-password
KMS_UNLOCKER_BACKUP_TYPE=aws
KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME=arkd-wallet-seed-encrypted
KMS_UNLOCKER_MACAROONS_PATH=/data/macaroons
AWS_ENDPOINT_URL=http://localstack:4566
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

### Secret Management

LocalStack initialization script creates:
- KMS key for encryption
- Initial password secret (`arkd-wallet-password`)

kms-unlocker creates:
- Wallet seed secret (`arkd-wallet-seed-encrypted`)
- Macaroon secrets (`admin`, `readonly`, etc.)

### Use Case

Perfect for:
- Testing AWS integration
- Validating Secrets Manager backup
- CI/CD pipeline testing
- AWS feature development

### Running

```bash
# Start all services (including LocalStack)
make run-aws

# Wait for LocalStack to initialize (5-10 seconds)
# Check LocalStack is ready
docker logs localstack 2>&1 | grep "Ready"

# View logs
docker-compose -f docker-compose.aws.yml logs -f

# List secrets
make secrets

# Stop all services
make stop-aws
```

## Starting and Stopping Services

### Start All Services

```bash
# Local mode
make run-local

# AWS mode
make run-aws
```

### Stop All Services

```bash
# Local mode
make stop-local

# AWS mode
make stop-aws
```

### Individual Service Control

Start specific service:

```bash
# Local mode
make run-local SERVICE=arkd

# AWS mode
make run-aws SERVICE=kms-unlocker
```

Stop specific service:

```bash
# Local mode
make stop-local SERVICE=arkd

# AWS mode
make stop-aws SERVICE=localstack
```

## Testing Reconnection

This demonstrates kms-unlocker's auto-reconnect capability:

### 1. Stop arkd

```bash
make stop-local SERVICE=arkd
```

### 2. Watch kms-unlocker Logs

```bash
docker-compose -f docker-compose.local.yml logs -f kms-unlocker
```

Expected: Connection state changes, retry attempts

### 3. Restart arkd

```bash
make run-local SERVICE=arkd
```

### 4. Observe Auto-Unlock

kms-unlocker should:
- Detect connection restored
- Automatically unlock wallet
- Resume normal operation

## Viewing Logs

### All Services

```bash
# Local mode
docker-compose -f docker-compose.local.yml logs -f

# AWS mode
docker-compose -f docker-compose.aws.yml logs -f
```

### Specific Service

```bash
# kms-unlocker
docker-compose -f docker-compose.local.yml logs -f kms-unlocker

# arkd
docker-compose -f docker-compose.local.yml logs -f arkd

# localstack (AWS mode)
docker-compose -f docker-compose.aws.yml logs -f localstack
```

### Last N Lines

```bash
docker-compose -f docker-compose.local.yml logs --tail=100 kms-unlocker
```

### Follow Specific Pattern

```bash
docker-compose -f docker-compose.local.yml logs -f kms-unlocker | grep -i "unlock"
```
