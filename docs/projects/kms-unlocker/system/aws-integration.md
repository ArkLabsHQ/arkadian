# KMS Unlocker - AWS Integration

## Overview

KMS Unlocker integrates with AWS services to provide enterprise-grade security for production deployments. The integration consists of two main components: password management via AWS KMS and Secrets Manager, and backup storage via Secrets Manager.

## AWS Services Used

### AWS KMS (Key Management Service)

**Purpose**: Encryption and decryption of the wallet password

AWS KMS provides centralized cryptographic key management. KMS Unlocker uses it to decrypt the wallet password stored in Secrets Manager. The password is encrypted using a customer-managed KMS key before being stored.

**Key features:**
- Hardware security modules (HSMs) protect keys
- Audit trail via CloudTrail
- Fine-grained access control via IAM
- Automatic key rotation support

### AWS Secrets Manager

**Purpose**: Secure storage for passwords, seeds, and macaroon files

Secrets Manager stores all sensitive data:
1. Encrypted wallet password (retrieved and decrypted by password provider)
2. Wallet seed phrase (written by backup service)
3. Macaroon authentication files (written by backup service, one secret per file)

**Key features:**
- Automatic encryption at rest using KMS
- Versioning support
- Access auditing via CloudTrail
- Cross-region replication available

## Password Provider Integration

The AWS password provider (`internal/infrastructure/password-provider/aws/kms_client.go`) implements secure password retrieval.

### How It Works

```go
1. Retrieve secret from Secrets Manager using secret ID
2. Check secret format:
   a. If SecretString: return directly
   b. If SecretBinary: decrypt using KMS
3. Return plaintext password
```

### Secret Formats Supported

**SecretString** (not recommended for production):
- Plain text password stored as string
- No additional encryption beyond Secrets Manager default
- Suitable for development/testing only

**SecretBinary** (recommended for production):
- Password encrypted with KMS before storage
- Requires KMS Decrypt permission
- Provides additional security layer
- Recommended for production use

### Configuration

Set these environment variables for AWS password provider:

```bash
KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE=aws
KMS_UNLOCKER_SECRET_ID=<secret-name>
```

The password provider uses AWS SDK default credential chain:
1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
2. Shared credentials file (~/.aws/credentials)
3. IAM role (for EC2/ECS/Lambda)

## Backup Service Integration

The AWS backup service (`internal/infrastructure/backup/aws/service.go`) writes wallet data to Secrets Manager.

### Secret Naming Conventions

**Seed Secret:**
- Default name: `arkd-seed`
- Configurable via: `KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME`
- Format: SecretBinary containing raw seed bytes

**Macaroon Secrets:**
- Naming rule: Filename without `.macaroon` extension
- Examples:
  - `admin.macaroon` → `admin` secret
  - `read.macaroon` → `read` secret
  - `write.macaroon` → `write` secret
- Format: SecretBinary containing raw macaroon bytes

### Individual Secrets Per Macaroon

Each macaroon file is stored as a separate secret for several reasons:

1. **Granular access control**: Different services can be granted access to specific macaroons
2. **Independent updates**: Each macaroon can be updated without affecting others
3. **Easier retrieval**: Clients can request specific macaroons by name
4. **Better auditing**: CloudTrail shows access per macaroon

### Configuration

Set these environment variables for AWS backup:

```bash
KMS_UNLOCKER_BACKUP_TYPE=aws
KMS_UNLOCKER_MACAROONS_PATH=/path/to/arkd/macaroons
KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME=arkd-seed  # Optional, this is default
```

## IAM Permissions Required

### Password Provider Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:<password-secret-id>-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:*:*:key/<kms-key-id>"
    }
  ]
}
```

### Backup Service Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:CreateSecret",
        "secretsmanager:PutSecretValue",
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

### Combined Policy

For a service using both providers and backup, combine both policies. Adjust resource ARNs based on your specific secret names and KMS key.

## Production Setup Workflow

Follow these steps to set up KMS Unlocker in production with AWS:

### Step 1: Create KMS Key

```bash
# Create a customer-managed key for password encryption
aws kms create-key \
  --description "KMS Unlocker password encryption key" \
  --region <your-region>

# Save the KeyId from the output
export KMS_KEY_ID=<key-id-from-output>

# Optionally create an alias for easier reference
aws kms create-alias \
  --alias-name alias/kms-unlocker-password \
  --target-key-id $KMS_KEY_ID \
  --region <your-region>
```

### Step 2: Encrypt Password

```bash
# Create password file (avoid command history)
echo -n "your-secure-password" > /tmp/password.txt

# Encrypt the password file using KMS
aws kms encrypt \
  --key-id $KMS_KEY_ID \
  --plaintext fileb:///tmp/password.txt \
  --region <your-region> \
  --output text \
  --query CiphertextBlob \
  | base64 --decode > /tmp/ciphertext.bin

# Important: Encrypt the FILE, not the string directly
# Using fileb:// ensures binary handling
```

### Step 3: Store in Secrets Manager

```bash
# Create secret with encrypted password
aws secretsmanager create-secret \
  --name kms-unlocker-password \
  --secret-binary fileb:///tmp/ciphertext.bin \
  --description "KMS-encrypted password for arkd wallet" \
  --region <your-region>

# Clean up temporary files
rm /tmp/password.txt /tmp/ciphertext.bin
```

### Step 4: Configure IAM Role

Create an IAM role for your service (EC2, ECS, etc.) with the combined permissions policy shown above.

### Step 5: Deploy Service

```bash
# Set environment variables
export KMS_UNLOCKER_SERVER_URL=<arkd-grpc-url>
export KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE=aws
export KMS_UNLOCKER_SECRET_ID=kms-unlocker-password
export KMS_UNLOCKER_BACKUP_TYPE=aws
export KMS_UNLOCKER_MACAROONS_PATH=/data/macaroons
export KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME=arkd-seed

# Run service (will use IAM role credentials automatically)
./kms-unlocker
```

## LocalStack for Testing

LocalStack provides local emulation of AWS services, enabling development and testing without AWS costs or internet access.

### What LocalStack Simulates

- **AWS Secrets Manager**: Full CRUD operations on secrets
- **AWS KMS**: Encryption and decryption operations
- **IAM**: Basic access control (simplified compared to real AWS)

### Using LocalStack

Start LocalStack via Docker Compose:

```bash
# Start all services in AWS mode with LocalStack
make run-aws

# Services started:
# - LocalStack (port 4566)
# - arkd-wallet
# - kms-unlocker
```

The `scripts/localstack-init.sh` script automatically:
1. Creates KMS key
2. Encrypts password
3. Stores password in Secrets Manager

### Inspecting Secrets in LocalStack

```bash
# List all secrets
make secrets

# Or use AWS CLI directly
aws --endpoint-url=http://localhost:4566 secretsmanager list-secrets

# Get specific secret value
aws --endpoint-url=http://localhost:4566 secretsmanager get-secret-value --secret-id arkd-seed

# Get macaroon secret (returns base64)
aws --endpoint-url=http://localhost:4566 secretsmanager get-secret-value --secret-id admin --query SecretBinary --output text

# Decode macaroon
aws --endpoint-url=http://localhost:4566 secretsmanager get-secret-value --secret-id admin --query SecretBinary --output text | base64 -d
```

### LocalStack vs Real AWS

| Feature | LocalStack | Real AWS |
|---------|-----------|----------|
| Secret Storage | In-memory (lost on restart) | Persistent |
| KMS Encryption | Simulated | Hardware HSM |
| Access Control | Basic | Full IAM |
| Audit Logging | None | CloudTrail |
| Cost | Free | Pay per use |
| Internet Required | No | Yes |

LocalStack is perfect for:
- Unit and integration tests
- Local development
- CI/CD pipelines
- Understanding AWS workflows

## AWS Configuration Environment Variables

### AWS SDK Configuration

These standard AWS SDK environment variables are supported:

```bash
# Credentials (not needed if using IAM role)
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>
AWS_SESSION_TOKEN=<token>  # Optional, for temporary credentials

# Region
AWS_REGION=us-east-1
AWS_DEFAULT_REGION=us-east-1

# LocalStack endpoint (for testing)
AWS_ENDPOINT_URL=http://localhost:4566
```

### KMS Unlocker Specific

```bash
# Password provider configuration
KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE=aws
KMS_UNLOCKER_SECRET_ID=<password-secret-name>

# Backup configuration
KMS_UNLOCKER_BACKUP_TYPE=aws
KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME=arkd-seed
```

## Troubleshooting

### Password Decryption Fails

**Symptoms**: Error "kms decrypt: AccessDeniedException"

**Solutions**:
- Verify IAM role has `kms:Decrypt` permission
- Check KMS key policy allows the role
- Ensure correct region configuration

### Secret Not Found

**Symptoms**: Error "ResourceNotFoundException"

**Solutions**:
- Verify secret name matches `KMS_UNLOCKER_SECRET_ID`
- Check region matches where secret was created
- Confirm IAM role has `secretsmanager:GetSecretValue` permission

### Backup Fails to Create Secrets

**Symptoms**: Error on CreateSecret or PutSecretValue

**Solutions**:
- Verify IAM role has `secretsmanager:CreateSecret` and `PutSecretValue` permissions
- Check secret name doesn't conflict with existing secrets
- Ensure macaroons directory is mounted and accessible

## See Also

- [backup-systems.md](./backup-systems.md) - Detailed backup implementation
- [configuration.md](./configuration.md) - All environment variables
- [architecture.md](./architecture.md) - How AWS adapters fit into architecture
