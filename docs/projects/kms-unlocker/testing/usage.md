# KMS Unlocker Usage Guide

This guide provides practical instructions for running and using kms-unlocker in different scenarios.

## Prerequisites

Before starting, ensure you have:

- **Nigiri**: Bitcoin regtest environment
- **Go 1.21+**: For building and running from source
- **Docker & Docker Compose**: For containerized deployment
- **AWS CLI** (optional): For LocalStack secret inspection

## Quick Start for Development

### 1. Start Nigiri

```bash
nigiri start
```

### 2. Start Supporting Services

Start all services except kms-unlocker to develop actively:

```bash
make dev-local
```

This starts:
- arkd (ARK daemon)
- arkd-wallet (wallet service)
- nbxplorer (blockchain explorer)
- pgnbxplorer (PostgreSQL for nbxplorer)

### 3. Run kms-unlocker

```bash
make run
```

This runs kms-unlocker with debug logging and local file-based backup.

## Docker Compose Usage

### Local Mode (File-based Backup)

Start all services including kms-unlocker:

```bash
make run-local
```

Stop all services:

```bash
make stop-local
```

Start/stop individual services:

```bash
# Start specific service
make run-local SERVICE=arkd

# Stop specific service
make stop-local SERVICE=arkd
```

### AWS Mode (LocalStack)

Start all services with LocalStack:

```bash
make run-aws
```

Stop all services:

```bash
make stop-aws
```

Individual service control:

```bash
make run-aws SERVICE=kms-unlocker
make stop-aws SERVICE=localstack
```

## Common Operations

### Check Logs

Local mode:

```bash
docker-compose -f docker-compose.local.yml logs -f
docker-compose -f docker-compose.local.yml logs -f kms-unlocker
docker-compose -f docker-compose.local.yml logs -f arkd
```

AWS mode:

```bash
docker-compose -f docker-compose.aws.yml logs -f
docker-compose -f docker-compose.aws.yml logs -f kms-unlocker
```

### Inspect Backups

Local mode (file-based):

```bash
# Default location (macOS)
ls -la ~/Library/Application\ Support/kms-unlocker/

# Custom location (if KMS_UNLOCKER_DATADIR is set)
ls -la $KMS_UNLOCKER_DATADIR
```

AWS mode (LocalStack):

```bash
# List all secrets
make secrets

# Get specific secret value
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  secretsmanager get-secret-value --secret-id admin
```

### List Secrets in LocalStack

```bash
# Using make target
make secrets

# Or directly with AWS CLI
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  secretsmanager list-secrets
```

Expected secrets after successful initialization:
- `arkd-wallet-password` - Wallet password
- `arkd-wallet-seed-encrypted` - Encrypted wallet seed
- `admin` - Admin macaroon
- `readonly` - Read-only macaroon (if exists)

## Configuration Scenarios

### Development with Local Backup

```bash
export KMS_UNLOCKER_SERVER_URL=127.0.0.1:7070
export KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE=env
export KMS_UNLOCKER_PASSWORD=ciaociao
export KMS_UNLOCKER_BACKUP_TYPE=local
export KMS_UNLOCKER_MACAROONS_PATH=./arkd-volume/regtest/macaroons
export KMS_UNLOCKER_LOG_LEVEL=5

make run
```

### Testing AWS Integration with LocalStack

Update `docker-compose.aws.yml` environment variables or create `.env` file:

```bash
KMS_UNLOCKER_SERVER_URL=arkd:7070
KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE=aws
KMS_UNLOCKER_SECRET_ID=arkd-wallet-password
KMS_UNLOCKER_BACKUP_TYPE=aws
KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME=arkd-wallet-seed-encrypted
KMS_UNLOCKER_MACAROONS_PATH=/data/macaroons
AWS_ENDPOINT_URL=http://localstack:4566
AWS_REGION=us-east-1
```

## Verification Steps

After starting kms-unlocker, verify it's working:

### 1. Check Connection

```bash
docker logs kms-unlocker-e2e-kms-unlocker-1 2>&1 | grep -i "connected"
```

Expected output: Connection state transitions and successful unlock messages

### 2. Verify Wallet Status

```bash
docker exec arkd arkd wallet status
```

Expected output:
```
initialized: true
unlocked: true
```

### 3. Verify Backups

Local mode:

```bash
ls ~/Library/Application\ Support/kms-unlocker/
```

AWS mode:

```bash
make secrets
```

Should show `arkd-wallet-seed-encrypted` and macaroon secrets

### 4. Test Reconnection

Stop arkd:

```bash
make stop-local SERVICE=arkd
```

Check kms-unlocker logs (should show connection monitoring):

```bash
docker-compose -f docker-compose.local.yml logs -f kms-unlocker
```

Restart arkd:

```bash
make run-local SERVICE=arkd
```

kms-unlocker should automatically reconnect and unlock the wallet.
