# KMS Unlocker - Configuration

## Environment Variables

All configuration uses the `KMS_UNLOCKER_` prefix. Variables are loaded using Viper with automatic environment variable binding.

### Core Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `KMS_UNLOCKER_SERVER_URL` | ARK daemon gRPC server URL (host:port) | - | Yes |
| `KMS_UNLOCKER_MACAROONS_PATH` | Path to macaroon files directory for backup | - | Yes |
| `KMS_UNLOCKER_MAX_RETRY` | Maximum retry attempts for operations | `5` | No |
| `KMS_UNLOCKER_LOG_LEVEL` | Log level (0=panic, 1=fatal, 2=error, 3=warn, 4=info, 5=debug) | `4` (info) | No |

### Password Provider Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE` | Password provider type: `env` or `aws` | `env` | No |
| `KMS_UNLOCKER_PASSWORD` | Wallet password (for `env` provider) | - | Yes (if env) |
| `KMS_UNLOCKER_SECRET_ID` | AWS secret ID for password (for `aws` provider) | - | Yes (if aws) |

### Backup Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `KMS_UNLOCKER_BACKUP_TYPE` | Backup type: `local` or `aws` | `local` | No |
| `KMS_UNLOCKER_DATADIR` | Local data directory for backups | OS-specific | No |
| `KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME` | AWS secret name for wallet seed backup | `arkd-seed` | No |

### AWS SDK Configuration

Standard AWS SDK environment variables (when using AWS providers):

| Variable | Description | Required |
|----------|-------------|----------|
| `AWS_REGION` | AWS region for services | Yes (if aws) |
| `AWS_ACCESS_KEY_ID` | AWS access key | Yes (if not IAM role) |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Yes (if not IAM role) |
| `AWS_ENDPOINT_URL` | Custom endpoint (for LocalStack) | No |

## Configuration Modes

### Development Mode (Local)

Uses local filesystem and direct password for simplified setup.

```bash
# Core configuration
export KMS_UNLOCKER_SERVER_URL=localhost:6060
export KMS_UNLOCKER_MACAROONS_PATH=/data/macaroons

# Password provider (local)
export KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE=env
export KMS_UNLOCKER_PASSWORD=your-password

# Backup (local filesystem)
export KMS_UNLOCKER_BACKUP_TYPE=local
export KMS_UNLOCKER_DATADIR=/data/kms-unlocker

# Optional settings
export KMS_UNLOCKER_MAX_RETRY=5
export KMS_UNLOCKER_LOG_LEVEL=5  # Debug level for development
```

**Characteristics:**
- No AWS dependencies
- Fast setup and testing
- Secrets stored on filesystem
- Suitable for: local development, testing, CI/CD

### Production Mode (AWS)

Uses AWS services for secure credential management.

```bash
# Core configuration
export KMS_UNLOCKER_SERVER_URL=arkd-wallet.internal:6060
export KMS_UNLOCKER_MACAROONS_PATH=/data/macaroons

# Password provider (AWS)
export KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE=aws
export KMS_UNLOCKER_SECRET_ID=kms-unlocker-password

# Backup (AWS Secrets Manager)
export KMS_UNLOCKER_BACKUP_TYPE=aws
export KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME=arkd-seed

# AWS configuration
export AWS_REGION=us-east-1
# IAM role credentials used automatically in AWS environments

# Optional settings
export KMS_UNLOCKER_MAX_RETRY=10  # Higher for production
export KMS_UNLOCKER_LOG_LEVEL=4   # Info level for production
```

**Characteristics:**
- Uses AWS KMS and Secrets Manager
- Enterprise-grade security
- Requires IAM permissions
- Suitable for: production deployments, cloud environments

### LocalStack Mode (AWS Simulation)

Simulates AWS services locally for testing AWS integration.

```bash
# Core configuration
export KMS_UNLOCKER_SERVER_URL=localhost:6060
export KMS_UNLOCKER_MACAROONS_PATH=/data/macaroons

# Password provider (AWS simulation)
export KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE=aws
export KMS_UNLOCKER_SECRET_ID=arkd-pass

# Backup (AWS simulation)
export KMS_UNLOCKER_BACKUP_TYPE=aws
export KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME=arkd-seed

# LocalStack configuration
export AWS_REGION=us-east-1
export AWS_ENDPOINT_URL=http://localhost:4566
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test

# Optional settings
export KMS_UNLOCKER_MAX_RETRY=5
export KMS_UNLOCKER_LOG_LEVEL=5  # Debug level
```

**Characteristics:**
- AWS API compatibility without AWS account
- Free and offline
- Data not persistent across restarts
- Suitable for: integration tests, AWS workflow development

## Provider Selection

### Password Provider Selection

```go
if KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE == "env":
    provider = EnvPasswordProvider(KMS_UNLOCKER_PASSWORD)
elif KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE == "aws":
    provider = AWSPasswordProvider(KMS_UNLOCKER_SECRET_ID)
```

**Decision matrix:**

| Environment | Provider | Reason |
|-------------|----------|--------|
| Local dev | `env` | Simple, no AWS setup |
| CI/CD | `env` | Fast, no external dependencies |
| Staging | `aws` | Test production configuration |
| Production | `aws` | Security requirements |
| LocalStack test | `aws` | Test AWS integration |

### Backup Service Selection

```go
if KMS_UNLOCKER_BACKUP_TYPE == "local":
    backup = LocalBackupService(KMS_UNLOCKER_DATADIR, KMS_UNLOCKER_MACAROONS_PATH)
elif KMS_UNLOCKER_BACKUP_TYPE == "aws":
    backup = AWSBackupService(
        KMS_UNLOCKER_MACAROONS_PATH,
        KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME,
        passwordProvider
    )
```

**Decision matrix:**

| Environment | Backup Type | Reason |
|-------------|-------------|--------|
| Local dev | `local` | Simple, visible files |
| CI/CD | `local` | Fast, no AWS costs |
| Staging | `aws` | Test production setup |
| Production | `aws` | Disaster recovery, compliance |
| LocalStack test | `aws` | Test AWS integration |

## Default Values

### Data Directory Defaults (Local Backup)

The default data directory is OS-specific:

**Linux:**
```
~/.arkd-unlocker/
```

**macOS:**
```
~/Library/Application Support/Arkd-unlocker/
```

**Windows:**
```
%LOCALAPPDATA%\Arkd-unlocker\
```

Override with `KMS_UNLOCKER_DATADIR`.

### Other Defaults

```bash
KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE=env
KMS_UNLOCKER_BACKUP_TYPE=local
KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME=arkd-seed
KMS_UNLOCKER_MAX_RETRY=5
KMS_UNLOCKER_LOG_LEVEL=4  # Info level
```

## Configuration Validation

Configuration is validated on startup. The service will fail to start if:

### Always Required

- `KMS_UNLOCKER_SERVER_URL` is empty
- `KMS_UNLOCKER_MACAROONS_PATH` is empty
- `KMS_UNLOCKER_MAX_RETRY` is less than 1

### Provider-Specific

**If `PASSWORD_PROVIDER_TYPE=env`:**
- `KMS_UNLOCKER_PASSWORD` must be set

**If `PASSWORD_PROVIDER_TYPE=aws`:**
- `KMS_UNLOCKER_SECRET_ID` must be set

**If `BACKUP_TYPE=aws`:**
- `KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME` must be set

### Invalid Values

- Unknown `PASSWORD_PROVIDER_TYPE` (not `env` or `aws`)
- Unknown `BACKUP_TYPE` (not `local` or `aws`)
- Invalid log level (outside 0-5 range)

## Configuration Examples

### Example 1: Local Development

```bash
# docker-compose.yml or .env file
KMS_UNLOCKER_SERVER_URL=arkd-wallet:6060
KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE=env
KMS_UNLOCKER_PASSWORD=development-password
KMS_UNLOCKER_BACKUP_TYPE=local
KMS_UNLOCKER_DATADIR=/data
KMS_UNLOCKER_MACAROONS_PATH=/macaroons
KMS_UNLOCKER_LOG_LEVEL=5
```

### Example 2: Production with AWS

```bash
# Kubernetes ConfigMap / Environment
KMS_UNLOCKER_SERVER_URL=arkd-wallet.prod.svc.cluster.local:6060
KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE=aws
KMS_UNLOCKER_SECRET_ID=prod-arkd-password
KMS_UNLOCKER_BACKUP_TYPE=aws
KMS_UNLOCKER_MACAROONS_PATH=/var/arkd/macaroons
KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME=prod-arkd-seed
KMS_UNLOCKER_MAX_RETRY=15
KMS_UNLOCKER_LOG_LEVEL=4
AWS_REGION=us-west-2
# AWS credentials from IAM role (not set explicitly)
```

### Example 3: Integration Testing with LocalStack

```bash
# Integration test environment
KMS_UNLOCKER_SERVER_URL=localhost:6060
KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE=aws
KMS_UNLOCKER_SECRET_ID=test-password
KMS_UNLOCKER_BACKUP_TYPE=aws
KMS_UNLOCKER_MACAROONS_PATH=/tmp/test-macaroons
KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME=test-seed
AWS_REGION=us-east-1
AWS_ENDPOINT_URL=http://localhost:4566
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
KMS_UNLOCKER_MAX_RETRY=3
KMS_UNLOCKER_LOG_LEVEL=5
```

## Docker Compose Configuration

### Local Development Configuration

From `docker-compose.local.yml`:

```yaml
services:
  kms-unlocker:
    environment:
      - KMS_UNLOCKER_SERVER_URL=arkd-wallet:6060
      - KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE=env
      - KMS_UNLOCKER_PASSWORD=ciaociao
      - KMS_UNLOCKER_BACKUP_TYPE=local
      - KMS_UNLOCKER_DATADIR=/data
      - KMS_UNLOCKER_MACAROONS_PATH=/macaroons
      - KMS_UNLOCKER_LOG_LEVEL=5
    volumes:
      - kms-data:/data
      - arkd-macaroons:/macaroons:ro
```

### AWS/LocalStack Configuration

From `docker-compose.aws.yml`:

```yaml
services:
  kms-unlocker:
    environment:
      - KMS_UNLOCKER_SERVER_URL=arkd-wallet:6060
      - KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE=aws
      - KMS_UNLOCKER_SECRET_ID=arkd-pass
      - KMS_UNLOCKER_BACKUP_TYPE=aws
      - KMS_UNLOCKER_MACAROONS_PATH=/macaroons
      - KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME=arkd-seed
      - AWS_REGION=us-east-1
      - AWS_ENDPOINT_URL=http://localstack:4566
      - AWS_ACCESS_KEY_ID=test
      - AWS_SECRET_ACCESS_KEY=test
      - KMS_UNLOCKER_LOG_LEVEL=5
    volumes:
      - arkd-macaroons:/macaroons:ro
    depends_on:
      - localstack
```

## Log Level Reference

| Level | Value | Description | Use Case |
|-------|-------|-------------|----------|
| Panic | 0 | System unusable | Never set manually |
| Fatal | 1 | Critical errors, service exits | Production errors only |
| Error | 2 | Error conditions | Production error tracking |
| Warn | 3 | Warning conditions | Production with warnings |
| Info | 4 | Informational messages | **Production default** |
| Debug | 5 | Detailed information | Development and troubleshooting |

**Recommendations:**
- **Production**: Level 4 (Info) - Key events without noise
- **Development**: Level 5 (Debug) - Full visibility
- **Troubleshooting**: Level 5 (Debug) - Diagnose issues
- **CI/CD**: Level 4 (Info) - Important events only

## Configuration Best Practices

1. **Use environment-specific files**: Separate `.env` files for dev, staging, prod
2. **Never commit secrets**: Use secret management tools
3. **Set appropriate retry counts**: Higher for production, lower for dev
4. **Use IAM roles in AWS**: Avoid hardcoded credentials
5. **Test configuration changes**: Use LocalStack before production
6. **Monitor log levels**: Too verbose in production affects performance
7. **Document custom values**: Explain non-default settings
8. **Version control compose files**: Track infrastructure as code

## Troubleshooting Configuration

### Service Won't Start

Check validation errors in logs:
```bash
docker logs kms-unlocker 2>&1 | grep -i "error\|fatal"
```

Common issues:
- Missing required variables
- Invalid provider type
- Unreachable SERVER_URL
- Invalid AWS credentials

### Can't Connect to arkd

```bash
# Verify server URL
docker exec kms-unlocker nc -zv arkd-wallet 6060

# Check DNS resolution
docker exec kms-unlocker nslookup arkd-wallet

# Test with curl (if arkd has HTTP endpoint)
curl http://arkd-wallet:6060/health
```

### AWS Authentication Fails

```bash
# Test AWS credentials
docker exec kms-unlocker aws sts get-caller-identity

# For LocalStack
docker exec kms-unlocker aws --endpoint-url=http://localstack:4566 sts get-caller-identity

# Check environment variables
docker exec kms-unlocker env | grep AWS
```

### Backup Directory Issues (Local)

```bash
# Check directory permissions
docker exec kms-unlocker ls -la /data

# Verify mount
docker exec kms-unlocker df -h /data

# Test write access
docker exec kms-unlocker touch /data/test && rm /data/test
```

## See Also

- [project_overview.md](./project_overview.md) - Configuration in context
- [aws-integration.md](./aws-integration.md) - AWS-specific setup
- [architecture.md](./architecture.md) - How configuration creates services
- [backup-systems.md](./backup-systems.md) - Backup configuration details
