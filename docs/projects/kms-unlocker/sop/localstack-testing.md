# LocalStack Testing

## What is LocalStack

### Overview

LocalStack is a fully functional local AWS cloud stack that runs in Docker. It provides:
- AWS service emulator for local development
- No AWS account or internet required
- Instant feedback during development
- Cost-free testing of AWS integrations

### Services Emulated

KMS Unlocker uses:
- **AWS KMS**: Key Management Service for encryption
- **AWS Secrets Manager**: Secret storage and retrieval

### Benefits

- Test AWS integration without AWS costs
- Fast iteration during development
- Offline development capability
- Consistent test environment

## Setting Up LocalStack

### Start LocalStack

```bash
make run-aws
```

This starts:
- LocalStack container
- NBXplorer (Bitcoin wallet indexer)
- arkd (ARK daemon)
- kms-unlocker

### Initialization Script

LocalStack is initialized via `scripts/localstack-init.sh`:
- Creates mock KMS key
- Creates password secret
- Sets up test environment

### Accessibility

LocalStack API endpoint: `http://localhost:4566`

All AWS CLI commands must use this endpoint URL.

## Working with LocalStack Secrets

### List All Secrets

Quick command:
```bash
make secrets
```

Full command:
```bash
aws --endpoint-url=http://localhost:4566 \
  secretsmanager list-secrets
```

### Get Secret Value

Get seed:
```bash
aws --endpoint-url=http://localhost:4566 \
  secretsmanager get-secret-value \
  --secret-id arkd-seed
```

Get macaroon:
```bash
aws --endpoint-url=http://localhost:4566 \
  secretsmanager get-secret-value \
  --secret-id admin
```

### Create Secret Manually

Create a new secret:
```bash
aws --endpoint-url=http://localhost:4566 \
  secretsmanager create-secret \
  --name my-test-secret \
  --secret-string "test-value"
```

### Update Secret

```bash
aws --endpoint-url=http://localhost:4566 \
  secretsmanager put-secret-value \
  --secret-id my-test-secret \
  --secret-string "new-value"
```

### Delete Secret

```bash
aws --endpoint-url=http://localhost:4566 \
  secretsmanager delete-secret \
  --secret-id my-test-secret \
  --force-delete-without-recovery
```

## Testing AWS Integration

### Run AWS Tests

```bash
make integrationtest-aws
```

This runs end-to-end tests using LocalStack.

### What It Validates

- Password retrieval from Secrets Manager
- Wallet creation and unlock
- Seed backup to Secrets Manager
- Macaroon backup to Secrets Manager
- Reconnection and auto-unlock
- Error handling and retries

## LocalStack Configuration

### Environment Variables

For AWS mode with LocalStack:

```bash
# AWS endpoints
export AWS_ENDPOINT_URL=http://localhost:4566

# Mock credentials (LocalStack accepts any values)
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_REGION=us-east-1

# KMS Unlocker config
export KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE=aws
export KMS_UNLOCKER_SECRET_ID=arkd-password
export KMS_UNLOCKER_BACKUP_TYPE=aws
export KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME=arkd-seed
```

### Endpoint URL

All AWS SDK calls must specify LocalStack endpoint:
- Via environment: `AWS_ENDPOINT_URL=http://localhost:4566`
- Via AWS CLI: `--endpoint-url=http://localhost:4566`

### Mock Credentials

LocalStack doesn't validate credentials. Use any values:
- Access Key: `test`
- Secret Key: `test`

## Debugging with LocalStack

### View LocalStack Logs

```bash
docker logs localstack
```

Look for:
- Secret creation events
- KMS operations
- API calls

### Inspect Secret State

Check if secret exists:
```bash
aws --endpoint-url=http://localhost:4566 \
  secretsmanager describe-secret \
  --secret-id arkd-seed
```

### Test KMS Operations

List KMS keys:
```bash
aws --endpoint-url=http://localhost:4566 \
  kms list-keys
```

Describe key:
```bash
aws --endpoint-url=http://localhost:4566 \
  kms describe-key \
  --key-id <key-id>
```

### Service Logs

View kms-unlocker logs:
```bash
docker logs kms-unlocker
```

Look for:
- "Retrieved password from AWS Secrets Manager"
- "Seed backed up successfully"
- "Macaroon backed up successfully"

## LocalStack vs Real AWS Differences

### Initialization

**LocalStack**: Uses `scripts/localstack-init.sh` to pre-create secrets

**Real AWS**: Requires manual KMS key creation and secret encryption

### Encryption Behavior

**LocalStack**: Simplified encryption, accepts plaintext secrets

**Real AWS**: Requires proper KMS encryption with ciphertext binary

### Credential Handling

**LocalStack**: Accepts any credentials

**Real AWS**: Requires valid IAM credentials with proper permissions

### Endpoint Configuration

**LocalStack**: Requires explicit `--endpoint-url` or `AWS_ENDPOINT_URL`

**Real AWS**: Uses default AWS endpoints

## When to Use LocalStack vs Real AWS

### Use LocalStack When:

- Developing new features
- Running integration tests in CI/CD
- Testing error handling and edge cases
- Learning AWS service behavior
- No internet connection available
- Want fast feedback loops
- Testing without AWS costs

### Use Real AWS When:

- Final production deployment testing
- Validating IAM permission configurations
- Testing KMS key rotation
- Performance testing at scale
- Verifying compliance requirements
- Testing cross-region replication

## Common Issues and Solutions

### Issue: Secrets Not Persisting

**Cause**: LocalStack container restarted

**Solution**: LocalStack state is ephemeral. Re-run initialization or recreate secrets.

### Issue: Connection Refused

**Cause**: LocalStack not running or wrong endpoint

**Solution**:
```bash
# Check LocalStack is running
docker ps | grep localstack

# Verify endpoint
curl http://localhost:4566/_localstack/health
```

### Issue: Invalid Credentials Error

**Cause**: Missing AWS credential environment variables

**Solution**: Set mock credentials:
```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
```
