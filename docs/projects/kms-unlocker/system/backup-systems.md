# KMS Unlocker - Backup Systems

## Overview

KMS Unlocker provides two backup implementations: local filesystem storage for development and AWS Secrets Manager for production. Both implementations follow the same interface contract defined in the `BackupSvc` port, ensuring consistent behavior across environments.

## Backup Operations

The backup system handles two types of data:

1. **Wallet Seed**: Backed up immediately after wallet creation
2. **Macaroon Files**: Backed up after wallet unlock when authentication files are generated

Both operations are critical for disaster recovery and must succeed for the service to consider initialization complete.

## Local Backup System

The local backup implementation (`internal/infrastructure/backup/local/service.go`) uses the filesystem for storage, making it ideal for development and testing environments.

### Directory Structure

```
<datadir>/
└── backup/
    ├── arkd-seed.txt           # Wallet seed phrase
    └── macaroons/              # Macaroon files directory
        ├── admin.macaroon
        ├── read.macaroon
        └── write.macaroon
```

The `<datadir>` defaults to OS-specific application data directories:
- **Linux**: `~/.arkd-unlocker/`
- **macOS**: `~/Library/Application Support/Arkd-unlocker/`
- **Windows**: `%APPDATA%\Arkd-unlocker\`

Override with `KMS_UNLOCKER_DATADIR` environment variable.

### File Permissions and Security

Local backup enforces strict file permissions for security:

- **Directories**: `0700` (owner read/write/execute only)
- **Files**: `0600` (owner read/write only)

This ensures that sensitive wallet data is protected from unauthorized access on shared systems.

### Seed Backup Process

```go
1. Create backup directory with 0700 permissions
2. Write seed to arkd-seed.txt with 0600 permissions
3. Sync to disk for durability
4. Log success with file path
```

### Macaroon Backup Process

```go
1. Verify source macaroons directory exists
2. Create backup/macaroons directory with 0700 permissions
3. Iterate all files in source directory
4. Copy each file to backup directory
   - Set 0600 permissions on destination
   - Sync each file to disk
5. Log success with file count and path
```

### Recovery from Local Backup

To recover from local backup:

1. Locate backup directory (check logs or use default path)
2. Copy seed file to secure location
3. Use seed to recreate wallet in arkd
4. Copy macaroon files to arkd's macaroons directory

## AWS Backup System

The AWS backup implementation (`internal/infrastructure/backup/aws/service.go`) uses AWS Secrets Manager for cloud-based storage, providing enterprise-grade security for production deployments.

### AWS Services Used

- **AWS Secrets Manager**: Primary storage for all secrets
- **AWS KMS**: Encryption key management (via Secrets Manager integration)

### Secret Organization

**Seed Secret:**
- Name: Configurable via `KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME` (default: `arkd-seed`)
- Type: SecretBinary
- Content: Raw seed phrase bytes
- Description: "Encrypted ARK wallet seed"

**Macaroon Secrets:**
- Name: Derived from filename without extension
  - `admin.macaroon` → secret `admin`
  - `read.macaroon` → secret `read`
  - `write.macaroon` → secret `write`
- Type: SecretBinary
- Content: Raw macaroon file bytes
- Description: "ARK macaroon file: <filename>"

### Seed Backup Process

```go
1. Attempt CreateSecret with seed data
2. If secret already exists:
   - Use PutSecretValue to update
3. Log success with secret name
4. Return error if both operations fail
```

### Macaroon Backup Process

```go
1. Verify macaroons directory exists
2. Read directory contents
3. For each .macaroon file:
   - Read file contents
   - Extract secret name (filename without extension)
   - Attempt CreateSecret
   - If exists, use PutSecretValue to update
   - Track count of stored secrets
4. Log success with total count
5. Return error if any operation fails
```

### Error Handling

The AWS backup service implements robust error handling:

- **Create/Update Pattern**: Always attempts CreateSecret first, falls back to PutSecretValue if secret exists
- **Missing Directory**: Returns descriptive error suggesting arkd configuration issues
- **Partial Failures**: Returns error immediately on first failure to ensure consistency
- **AWS Errors**: Propagates AWS SDK errors with context for troubleshooting

### IAM Permissions Required

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:CreateSecret",
        "secretsmanager:PutSecretValue",
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:*:*:secret:arkd-seed-*",
        "arn:aws:secretsmanager:*:*:secret:admin-*",
        "arn:aws:secretsmanager:*:*:secret:read-*",
        "arn:aws:secretsmanager:*:*:secret:write-*"
      ]
    }
  ]
}
```

### Recovery from AWS Backup

To recover from AWS backup:

1. Retrieve seed secret from Secrets Manager:
   ```bash
   aws secretsmanager get-secret-value --secret-id arkd-seed
   ```

2. Retrieve macaroon secrets:
   ```bash
   aws secretsmanager get-secret-value --secret-id admin --query SecretBinary --output text | base64 -d > admin.macaroon
   aws secretsmanager get-secret-value --secret-id read --query SecretBinary --output text | base64 -d > read.macaroon
   aws secretsmanager get-secret-value --secret-id write --query SecretBinary --output text | base64 -d > write.macaroon
   ```

3. Use seed to recreate wallet in arkd
4. Place macaroon files in arkd's macaroons directory

## Backup Timing and Guarantees

### When Backups Occur

1. **Seed Backup**:
   - Triggered: After wallet creation (`Create()` completes)
   - Location: `initAndUnlock()` at line 210 in `service.go`
   - Guarantee: Must succeed before proceeding to unlock

2. **Macaroon Backup**:
   - Triggered: After wallet unlock (`Unlock()` completes)
   - Location: `initAndUnlock()` at line 229 in `service.go`
   - Guarantee: Must succeed for initialization to be considered complete

### Failure Behavior

If backup operations fail:
- Operation returns error to caller
- Service enters retry loop with exponential backoff
- After max retries, triggers reconnection
- Wallet remains initialized/unlocked but backup incomplete

This ensures the service continues attempting backup without blocking wallet operations indefinitely.

### Idempotency

Both backup implementations are idempotent:
- **Local**: Overwrites existing files
- **AWS**: Uses update operation if secret exists

This allows safe retries and supports scenarios where backup succeeds but subsequent operations fail.

## Testing Backup Systems

### Local Backup Testing

```bash
# Run in local mode
make run-local

# Verify backup directory created
ls -la ~/.arkd-unlocker/backup/

# Check file permissions
ls -l ~/.arkd-unlocker/backup/arkd-seed.txt
# Should show: -rw------- (600)

# Verify macaroons copied
ls -la ~/.arkd-unlocker/backup/macaroons/
```

### AWS Backup Testing (LocalStack)

```bash
# Run in AWS mode with LocalStack
make run-aws

# List secrets
make secrets

# Get specific secret value
aws --endpoint-url=http://localhost:4566 secretsmanager get-secret-value --secret-id arkd-seed

# Verify macaroon secrets
aws --endpoint-url=http://localhost:4566 secretsmanager get-secret-value --secret-id admin
aws --endpoint-url=http://localhost:4566 secretsmanager get-secret-value --secret-id read
```

## Configuration Reference

| Variable | Local Backup | AWS Backup |
|----------|--------------|------------|
| `KMS_UNLOCKER_BACKUP_TYPE` | `local` | `aws` |
| `KMS_UNLOCKER_DATADIR` | Required | Not used |
| `KMS_UNLOCKER_MACAROONS_PATH` | Required | Required |
| `KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME` | Not used | Optional (default: `arkd-seed`) |

See [configuration.md](./configuration.md) for complete configuration details.

## See Also

- [aws-integration.md](./aws-integration.md) - AWS services setup and production workflow
- [configuration.md](./configuration.md) - Environment variables and provider selection
- [architecture.md](./architecture.md) - Backup service in hexagonal architecture
