# Troubleshooting KMS Unlocker

This guide helps diagnose and fix common issues with kms-unlocker.

## Common Issues

### "Connection refused"

**Symptom:** kms-unlocker cannot connect to arkd

```
Error: dial tcp 127.0.0.1:7070: connect: connection refused
```

**Solutions:**

1. Check arkd is running:
   ```bash
   docker ps | grep arkd
   # or
   curl -v http://localhost:7070
   ```

2. Verify port configuration:
   ```bash
   # Check arkd port
   docker logs arkd | grep -i "listening"

   # Check KMS_UNLOCKER_SERVER_URL matches
   docker exec kms-unlocker env | grep SERVER_URL
   ```

3. Check network connectivity:
   ```bash
   # From kms-unlocker container
   docker exec kms-unlocker ping -c 3 arkd
   ```

### "Failed to unlock wallet"

**Symptom:** Wallet exists but unlock fails

```
Error: failed to unlock wallet: invalid password
```

**Solutions:**

1. Verify password configuration:
   ```bash
   # Check environment variable
   docker exec kms-unlocker env | grep PASSWORD

   # Check AWS secret (if using aws provider)
   aws --endpoint-url=http://localhost:4566 --region us-east-1 \
     secretsmanager get-secret-value --secret-id arkd-wallet-password
   ```

2. Check password provider type:
   ```bash
   docker exec kms-unlocker env | grep PASSWORD_PROVIDER_TYPE
   ```

3. Manually verify password:
   ```bash
   # Unlock manually with same password
   docker exec arkd arkd wallet unlock --password ciaociao
   ```

### "Permission denied" on Macaroons

**Symptom:** Cannot read or backup macaroon files

```
Error: failed to read macaroon file: permission denied
```

**Solutions:**

1. Check file permissions:
   ```bash
   docker exec arkd ls -la /data/regtest/macaroons/
   ```

2. Verify volume mounts:
   ```bash
   docker inspect kms-unlocker | grep -A 10 Mounts
   ```

3. Check user/group in containers:
   ```bash
   # kms-unlocker user
   docker exec kms-unlocker id

   # arkd user
   docker exec arkd id
   ```

4. Fix permissions:
   ```bash
   docker exec arkd chmod -R 755 /data/regtest/macaroons/
   ```

### Backup Not Working

**Local backup issues:**

```
Error: failed to save backup: no such file or directory
```

**Solutions:**

1. Check backup directory exists:
   ```bash
   docker exec kms-unlocker ls -la /data/kms-unlocker/
   ```

2. Create directory if missing:
   ```bash
   docker exec kms-unlocker mkdir -p /data/kms-unlocker/
   ```

3. Verify KMS_UNLOCKER_DATADIR:
   ```bash
   docker exec kms-unlocker env | grep DATADIR
   ```

**AWS backup issues:**

```
Error: failed to create secret: operation error Secrets Manager
```

**Solutions:**

1. Check AWS credentials:
   ```bash
   docker exec kms-unlocker env | grep AWS
   ```

2. Verify LocalStack is running:
   ```bash
   docker ps | grep localstack
   docker logs localstack | grep "Ready"
   ```

3. Check AWS endpoint:
   ```bash
   aws --endpoint-url=http://localhost:4566 --region us-east-1 \
     secretsmanager list-secrets
   ```

### LocalStack Secrets Not Found

**Symptom:** Cannot retrieve secrets from LocalStack

```
Error: ResourceNotFoundException: Secrets Manager can't find the specified secret
```

**Solutions:**

1. Verify initialization script ran:
   ```bash
   docker logs localstack | grep "init-aws.sh"
   ```

2. List existing secrets:
   ```bash
   make secrets
   ```

3. Manually create missing secret:
   ```bash
   aws --endpoint-url=http://localhost:4566 --region us-east-1 \
     secretsmanager create-secret \
     --name arkd-wallet-password \
     --secret-string "ciaociao"
   ```

## Debugging Techniques

### Enable Debug Logging

Set log level to debug (5):

```bash
export KMS_UNLOCKER_LOG_LEVEL=5
make run
```

Or in docker-compose:

```yaml
environment:
  KMS_UNLOCKER_LOG_LEVEL: 5
```

**Log levels:**
- 0 = panic
- 1 = fatal
- 2 = error
- 3 = warn
- 4 = info (default)
- 5 = debug

### Check arkd Logs

```bash
# All logs
docker logs arkd

# Follow logs
docker logs -f arkd

# Last 100 lines
docker logs --tail=100 arkd

# Search for errors
docker logs arkd 2>&1 | grep -i error
```

### Inspect Docker Volumes

```bash
# List volumes
docker volume ls | grep kms-unlocker

# Inspect volume
docker volume inspect kms-unlocker-e2e_arkd-volume

# View volume contents
docker run --rm -v kms-unlocker-e2e_arkd-volume:/data alpine ls -la /data
```

### List LocalStack Secrets

```bash
# Using make target
make secrets

# Or AWS CLI directly
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  secretsmanager list-secrets

# Get specific secret
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  secretsmanager get-secret-value --secret-id admin
```

## Connection Issues

### gRPC Connection State

Check connection state in logs:

```bash
docker logs kms-unlocker 2>&1 | grep -i "connection state"
```

**Expected states:**
- `CONNECTING` - Attempting to connect
- `READY` - Connected successfully
- `TRANSIENT_FAILURE` - Temporary failure, will retry
- `IDLE` - Not connected

### Retry Logic Behavior

kms-unlocker uses exponential backoff:

**Default configuration:**
- Initial retry: immediate
- Max retries: 5
- Backoff: exponential

**Check retry attempts in logs:**

```bash
docker logs kms-unlocker 2>&1 | grep -i "retry"
```

### Max Retry Exceeded

```
Error: max retry exceeded
```

**Solutions:**

1. Increase max retry:
   ```bash
   export KMS_UNLOCKER_MAX_RETRY=10
   ```

2. Check why arkd isn't responding:
   ```bash
   docker logs arkd
   docker exec arkd arkd wallet status
   ```

3. Restart both services:
   ```bash
   make stop-local
   make run-local
   ```

## AWS/LocalStack Issues

### Endpoint Configuration

**Problem:** Cannot connect to LocalStack

```
Error: operation error KMS: DescribeKey, https response error StatusCode: 0
```

**Solutions:**

1. Verify endpoint URL:
   ```bash
   docker exec kms-unlocker env | grep AWS_ENDPOINT_URL
   ```

2. Should be `http://localstack:4566` (not `localhost`)

3. Check from container:
   ```bash
   docker exec kms-unlocker curl http://localstack:4566/_localstack/health
   ```

### Credentials

LocalStack uses dummy credentials:

```bash
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REGION=us-east-1
```

Verify these are set:

```bash
docker exec kms-unlocker env | grep AWS_
```

### Secret Not Found

List all secrets to verify what exists:

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  secretsmanager list-secrets --query 'SecretList[*].Name'
```

## Backup Verification

### Local Backup

Check backup directory:

```bash
# From host (if volume mounted)
ls -la ./arkd-volume/kms-unlocker/

# From container
docker exec kms-unlocker ls -la /data/kms-unlocker/
```

**Expected files:**
- `seed.txt` - Wallet seed backup

### AWS Backup

List and verify secrets:

```bash
# List all secrets
make secrets

# Get seed secret
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  secretsmanager get-secret-value --secret-id arkd-wallet-seed-encrypted

# Get macaroon secret
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  secretsmanager get-secret-value --secret-id admin
```

**Expected secrets:**
- `arkd-wallet-password` - Initial password
- `arkd-wallet-seed-encrypted` - Encrypted seed
- `admin` - Admin macaroon
- `readonly` - Readonly macaroon (if exists)

## Getting Help

When reporting issues, include:

### 1. Environment Information

```bash
# Docker version
docker --version

# Docker Compose version
docker-compose --version

# Operating system
uname -a
```

### 2. Configuration

```bash
# Environment variables (sanitize sensitive data)
docker exec kms-unlocker env | grep KMS_UNLOCKER
```

### 3. Logs

```bash
# kms-unlocker logs
docker logs kms-unlocker > kms-unlocker.log

# arkd logs
docker logs arkd > arkd.log

# LocalStack logs (if using AWS mode)
docker logs localstack > localstack.log
```

### 4. Service Status

```bash
# Running containers
docker ps

# Service health
docker exec arkd arkd wallet status
```

### 5. Test Output

If tests are failing:

```bash
# Run with verbose output
go test -v -count=1 ./internal/test/e2e/... -run TestKMSUnlockerLocalE2E 2>&1 | tee test.log
```

### Issue Template

```markdown
**Environment:**
- OS: [e.g., macOS 13.1]
- Docker: [version]
- kms-unlocker mode: [local/aws]

**Problem:**
[Describe the issue]

**Steps to Reproduce:**
1. [First step]
2. [Second step]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Logs:**
[Attach kms-unlocker.log and arkd.log]

**Configuration:**
[Include relevant environment variables]
```

For more help, check:
- Project README: `${KMS_UNLOCKER_REPO}/README.md`
- E2E tests: `${KMS_UNLOCKER_REPO}/internal/test/e2e/e2e_test.go`
- Docker Compose files: `docker-compose.local.yml`, `docker-compose.aws.yml`
