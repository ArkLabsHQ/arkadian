---
project_id: kms-unlocker
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "sop/development-workflow.md"]
  monitoring: ["testing/troubleshooting.md", "sop/aws-deployment.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md", "testing/how_to_run.md"]
  aws: ["system/aws-integration.md", "sop/aws-deployment.md"]
  backup: ["system/backup-systems.md", "sop/backup-recovery.md"]
scripts:
  test: "make test"
  integration_all: "make integrationtest"
  integration_local: "make integrationtest-local"
  integration_aws: "make integrationtest-aws"
  run_dev: "make run"
  run_local: "make run-local"
  run_aws: "make run-aws"
  list_secrets: "make secrets"
---

# KMS Unlocker — Project Index

**kms-unlocker** is a specialized Go service that automatically manages ARK daemon (arkd) wallet operations. It continuously monitors arkd connections, automatically creates and unlocks wallets when needed, and securely backs up critical wallet data (seeds and macaroon authentication files) to either local storage or AWS Secrets Manager.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/kms-unlocker/system/` — System Architecture & Components
Core documentation about kms-unlocker architecture and design:

- **${ARKADIAN_DIR}/docs/projects/kms-unlocker/system/project_overview.md** — — What kms-unlocker is, features, and capabilities
- **${ARKADIAN_DIR}/docs/projects/kms-unlocker/system/architecture.md** — — Hexagonal architecture, service lifecycle, state machine
- **${ARKADIAN_DIR}/docs/projects/kms-unlocker/system/backup-systems.md** — — Local vs AWS backup, seed and macaroon backup flows
- **${ARKADIAN_DIR}/docs/projects/kms-unlocker/system/aws-integration.md** — — AWS KMS, Secrets Manager, IAM permissions
- **${ARKADIAN_DIR}/docs/projects/kms-unlocker/system/connection-resilience.md** — — Connection monitoring, auto-reconnect, health checks
- **${ARKADIAN_DIR}/docs/projects/kms-unlocker/system/configuration.md** — — Environment variables and configuration options

### `${ARKADIAN_DIR}/docs/projects/kms-unlocker/testing/` — Usage & Operations
Practical guides for running and testing:

- **${ARKADIAN_DIR}/docs/projects/kms-unlocker/testing/usage.md** — — Quick start and common operations
- **${ARKADIAN_DIR}/docs/projects/kms-unlocker/testing/how_to_run.md** — — Local development, Docker Compose modes
- **${ARKADIAN_DIR}/docs/projects/kms-unlocker/testing/how_to_test.md** — — Unit tests, integration tests, E2E tests
- **${ARKADIAN_DIR}/docs/projects/kms-unlocker/testing/troubleshooting.md** — — Common issues and debugging

### `${ARKADIAN_DIR}/docs/projects/kms-unlocker/sop/` — Standard Operating Procedures
Step-by-step guides for operations:

- **${ARKADIAN_DIR}/docs/projects/kms-unlocker/sop/development-workflow.md** — — Development setup and workflow
- **${ARKADIAN_DIR}/docs/projects/kms-unlocker/sop/aws-deployment.md** — — AWS production deployment guide
- **${ARKADIAN_DIR}/docs/projects/kms-unlocker/sop/backup-recovery.md** — — Backup strategies and disaster recovery
- **${ARKADIAN_DIR}/docs/projects/kms-unlocker/sop/localstack-testing.md** — — Testing with LocalStack (AWS simulation)

### `${ARKADIAN_DIR}/docs/projects/kms-unlocker/tasks/` — Product Requirements & Plans
Feature specifications and implementation tracking.

### `${ARKADIAN_DIR}/docs/projects/arkd/change-log/` — Recent Changes
Curated summaries of significant changes.

### `${ARKADIAN_DIR}/docs/projects/arkd/pr-report/` — Pull Request Summaries
Analysis and summaries of pull requests.

---

## Key Concepts

### Automatic Wallet Management
- **Wallet Creation**: Automatically creates arkd wallet on startup if it doesn't exist
- **Auto-Unlock**: Automatically unlocks wallet on startup and after reconnections
- **Retry Logic**: Configurable exponential backoff for failed operations
- **Connection Monitoring**: Real-time gRPC connection state tracking

### Security & Secrets Management
- **Password Providers**: Environment variables (dev) or AWS KMS (prod)
- **Backup Services**: Local filesystem (dev) or AWS Secrets Manager (prod)
- **Seed Protection**: Automatic wallet seed backup after initialization
- **Macaroon Backup**: Authentication files backed up after wallet unlock
- **Individual Secrets**: Each macaroon stored as separate AWS secret

### Service Lifecycle
The service follows a state machine pattern:

1. **Monitor**: Watch arkd gRPC connection state
2. **Check**: On connection ready, verify wallet initialization
3. **Init Path**: If not initialized → create wallet → backup seed → unlock → backup macaroons
4. **Unlock Path**: If initialized → unlock wallet
5. **Reconnect**: On connection failure → retry with exponential backoff

### Backup Timing
- **Seed Backup**: Immediately after wallet creation (during initialization)
- **Macaroon Backup**: After successful wallet unlock
- **Secret Names**: Each `.macaroon` file → separate secret (filename without extension)

---

## Quick Reference

### Prerequisites
```bash
# Start Nigiri (Bitcoin regtest)
nigiri start

# Ensure Go 1.21+ installed
go version
```

### Local Development
```bash
# Start all services except kms-unlocker
make dev-local

# Run kms-unlocker locally (with hot reload)
make run

# Or run everything in Docker
make run-local
```

### Testing
```bash
# Unit tests only
make test

# All integration tests (local + AWS)
make integrationtest

# Specific environment tests
make integrationtest-local
make integrationtest-aws
```

### Docker Compose Modes

**Local Mode (file-based backup)**
```bash
# Start all services
make run-local

# Start individual service
make run-local SERVICE=arkd

# Stop all services
make stop-local

# Stop individual service
make stop-local SERVICE=kms-unlocker
```

**AWS Mode (LocalStack simulation)**
```bash
# Start all services with LocalStack
make run-aws

# List secrets in LocalStack
make secrets

# Stop all services
make stop-aws
```

---

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `KMS_UNLOCKER_SERVER_URL` | ARK daemon gRPC URL | - | ✅ |
| `KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE` | `env` or `aws` | `env` | ❌ |
| `KMS_UNLOCKER_PASSWORD` | Wallet password (for `env` provider) | - | ✅* |
| `KMS_UNLOCKER_SECRET_ID` | AWS secret ID (for `aws` provider) | - | ✅* |
| `KMS_UNLOCKER_BACKUP_TYPE` | `local` or `aws` | `local` | ❌ |
| `KMS_UNLOCKER_DATADIR` | Local backup directory | OS app data dir | ❌ |
| `KMS_UNLOCKER_MACAROONS_PATH` | Path to macaroon files | - | ✅ |
| `KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME` | AWS secret name for seed | `arkd-seed` | ❌ |
| `KMS_UNLOCKER_MAX_RETRY` | Max retry attempts | `5` | ❌ |
| `KMS_UNLOCKER_LOG_LEVEL` | Log level (0-5) | `4` (info) | ❌ |

*Required depending on provider type.

### Configuration Modes

**Development (Local)**
```bash
export KMS_UNLOCKER_SERVER_URL=127.0.0.1:7070
export KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE=env
export KMS_UNLOCKER_PASSWORD=your_password
export KMS_UNLOCKER_BACKUP_TYPE=local
export KMS_UNLOCKER_MACAROONS_PATH=./arkd-volume/regtest/macaroons
```

**Production (AWS)**
```bash
export KMS_UNLOCKER_SERVER_URL=arkd.example.com:7070
export KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE=aws
export KMS_UNLOCKER_SECRET_ID=arkd-wallet-password
export KMS_UNLOCKER_BACKUP_TYPE=aws
export KMS_UNLOCKER_MACAROONS_PATH=/app/data/regtest/macaroons
export KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME=arkd-wallet-seed
```

---

## Architecture Overview

### Hexagonal Architecture

**Core Domain** (`internal/core/`)
- `application/service.go`: Main business logic and state machine
- `ports/`: Interface definitions for external adapters

**Infrastructure** (`internal/infrastructure/`)
- `arkd-client/`: gRPC client for arkd wallet operations
- `password-provider/`: `env` or `aws` implementations
- `backup/`: `local` or `aws` implementations

**Configuration** (`internal/config/`)
- Dependency injection based on environment variables
- Factory pattern for creating concrete implementations

### Service Flow

```
┌─────────────────────────────────────────────────────────┐
│              KMS Unlocker Service                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐         ┌──────────────┐             │
│  │   Monitor    │────────▶│ Check Ready  │             │
│  │ Connection   │         │   State      │             │
│  └──────────────┘         └──────┬───────┘             │
│                                   │                      │
│                          ┌────────▼────────┐            │
│                          │  Wallet Init?   │            │
│                          └────┬───────┬────┘            │
│                               │       │                  │
│                          No   │       │  Yes             │
│                               │       │                  │
│                  ┌────────────▼──┐ ┌──▼────────────┐   │
│                  │ Create Wallet │ │ Unlock Wallet │   │
│                  │ Backup Seed   │ └───────────────┘   │
│                  │ Unlock        │                      │
│                  │ Backup Macs   │                      │
│                  └───────────────┘                      │
│                                                           │
│                  On Connection Lost → Reconnect          │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Backup Systems

### Seed Backup
- **When**: Immediately after wallet creation
- **What**: Wallet seed phrase (for recovery)
- **Where**:
  - Local: `$KMS_UNLOCKER_DATADIR/seed.txt`
  - AWS: Secret with name from `KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME`

### Macaroon Backup
- **When**: After successful wallet unlock
- **What**: Authentication `.macaroon` files
- **Where**:
  - Local: `$KMS_UNLOCKER_DATADIR/<filename>.macaroon`
  - AWS: Each file → separate secret (e.g., `admin.macaroon` → `admin` secret)

### Backup Naming Convention (AWS)
```
admin.macaroon      → secret name: "admin"
readonly.macaroon   → secret name: "readonly"
invoice.macaroon    → secret name: "invoice"
```

---

## AWS Integration

### Required AWS Services
- **AWS KMS**: Encryption key management for secrets
- **AWS Secrets Manager**: Secure storage for passwords, seeds, macaroons

### IAM Permissions
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:CreateSecret",
        "secretsmanager:PutSecretValue",
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "*"
    }
  ]
}
```

### AWS Production Setup
```bash
# 1. Create KMS key
aws kms create-key --description "arkd-wallet-unlocker"

# 2. Create password file
echo -n "your_password" > /tmp/password.txt

# 3. Encrypt password
aws kms encrypt \
  --key-id arn:aws:kms:region:account:key/key-id \
  --plaintext fileb:///tmp/password.txt \
  --output text --query CiphertextBlob \
  | base64 --decode > /tmp/ciphertext.bin

# 4. Store in Secrets Manager
aws secretsmanager create-secret \
  --name arkd-wallet-password \
  --secret-binary fileb:///tmp/ciphertext.bin

# 5. Cleanup
rm /tmp/password.txt /tmp/ciphertext.bin
```

---

## LocalStack Testing

### What is LocalStack?
LocalStack simulates AWS services locally for testing without real AWS costs:
- Mock KMS and Secrets Manager
- Initialized via `scripts/localstack-init.sh`
- Accessible at `http://localhost:4566`

### Working with LocalStack Secrets
```bash
# List all secrets
make secrets

# Get specific secret value
aws --endpoint-url=http://localhost:4566 \
  secretsmanager get-secret-value --secret-id admin

# Create test secret
aws --endpoint-url=http://localhost:4566 \
  secretsmanager create-secret \
  --name test-secret \
  --secret-string "test-value"
```

---

## Integration Points

### Arkd Wallet Service
- **Connection**: gRPC at `KMS_UNLOCKER_SERVER_URL`
- **Operations**:
  - `Status()` - Check wallet initialization
  - `Create()` - Create new wallet
  - `Unlock()` - Unlock existing wallet
- **Reconnection**: Automatic on connection failure with exponential backoff

### Password Providers
- **Env Provider**: Direct from `KMS_UNLOCKER_PASSWORD` env var
- **AWS Provider**: KMS-encrypted secret from `KMS_UNLOCKER_SECRET_ID`

### Backup Services
- **Local Service**: Filesystem-based, writes to `KMS_UNLOCKER_DATADIR`
- **AWS Service**: Secrets Manager-based, creates individual secrets

---

## Development Commands

### Building
```bash
# Build binary for all platforms
make build

# Clean build artifacts
make clean
```

### Testing
```bash
# Unit tests (fast)
make test

# Integration tests (requires Docker)
make integrationtest
make integrationtest-local
make integrationtest-aws

# Coverage report
make cov
```

### Code Quality
```bash
# Lint code
make lint

# Static analysis
make vet
```

### Protocol Buffers
```bash
# Compile proto stubs (uses Docker)
make proto
```

---

## E2E Test Workflow

The complete workflow is demonstrated in `internal/test/e2e/e2e_test.go`:

1. **Setup**: Start Nigiri, run Docker Compose stack
2. **Connection**: kms-unlocker monitors arkd connection
3. **Initialization**: Detects wallet not initialized, creates it, backs up seed
4. **Unlock**: Unlocks wallet, backs up macaroons
5. **Reconnection**: Arkd restarts, kms-unlocker reconnects and unlocks
6. **Validation**: Verify backups exist and are correct

---

## Documentation Size Guidelines

To keep context lean for Claude agents:

- **usage/how-to**: ≤ 100-120 lines
- **architecture**: 400-700 words
- **configuration guide**: 400-800 words
- **SOP procedures**: ≤ 120 lines

Keep files focused and cross-reference when needed.
