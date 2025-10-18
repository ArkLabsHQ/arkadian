# AWS Deployment

## Production AWS Setup

### Required AWS Services

- **AWS KMS**: Key Management Service for encryption
- **AWS Secrets Manager**: Secure storage for passwords and backups
- **IAM**: Identity and Access Management for permissions

## Step-by-Step Deployment

### 1. Create KMS Key

Create a KMS key for encryption:

```bash
aws kms create-key \
  --description "arkd-wallet-unlocker" \
  --region us-east-1
```

Note the KeyId from the response (e.g., `arn:aws:kms:us-east-1:123456789012:key/xxxxx`).

### 2. Create Password File

Create a plaintext password file:

```bash
echo -n "your-secure-password" > /tmp/password.txt
```

Note: Use `-n` to avoid adding a newline character.

### 3. Encrypt with KMS

Encrypt the password file using KMS:

```bash
aws kms encrypt \
  --key-id arn:aws:kms:us-east-1:123456789012:key/xxxxx \
  --plaintext fileb:///tmp/password.txt \
  --region us-east-1 \
  --output text --query CiphertextBlob \
  | base64 --decode > /tmp/ciphertext.bin
```

Important: Encrypt the file, not the string directly.

### 4. Store Encrypted Password in Secrets Manager

Create the secret with the encrypted ciphertext:

```bash
aws secretsmanager create-secret \
  --name arkd-wallet-password \
  --secret-binary fileb:///tmp/ciphertext.bin \
  --region us-east-1
```

### 5. Clean Up Temporary Files

```bash
rm /tmp/password.txt /tmp/ciphertext.bin
```

### 6. Configure IAM Permissions

Create an IAM role or attach this policy to your service's role:

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
        "secretsmanager:PutSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:arkd-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/xxxxx"
    }
  ]
}
```

### 7. Set Environment Variables

Configure the service with these environment variables:

```bash
# ARK daemon connection
export KMS_UNLOCKER_SERVER_URL=localhost:7070

# AWS password provider
export KMS_UNLOCKER_PASSWORD_PROVIDER_TYPE=aws
export KMS_UNLOCKER_SECRET_ID=arkd-wallet-password

# AWS backup
export KMS_UNLOCKER_BACKUP_TYPE=aws
export KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME=arkd-seed

# Macaroon location
export KMS_UNLOCKER_MACAROONS_PATH=/path/to/macaroons

# AWS region
export AWS_REGION=us-east-1
```

### 8. Deploy Service

Deploy the kms-unlocker service with the configured environment variables and IAM role.

## Verifying Deployment

### Check Service Logs

```bash
# View service logs
journalctl -u kms-unlocker -f
# OR
docker logs kms-unlocker
```

Look for these log messages:
- "Wallet initialized successfully"
- "Wallet unlocked successfully"
- "Seed backed up successfully"
- "Macaroon backed up successfully"

### Verify Wallet Unlocked

The logs should show successful unlock without errors.

### Check Seed Backup Exists

```bash
aws secretsmanager get-secret-value \
  --secret-id arkd-seed \
  --region us-east-1
```

### Check Macaroon Backups

```bash
# List all secrets
aws secretsmanager list-secrets --region us-east-1

# Check specific macaroon
aws secretsmanager get-secret-value \
  --secret-id admin \
  --region us-east-1
```

## Backup Verification

### List Secrets

```bash
aws secretsmanager list-secrets \
  --region us-east-1 \
  --query 'SecretList[?starts_with(Name, `arkd`)].Name'
```

### Retrieve Seed

```bash
aws secretsmanager get-secret-value \
  --secret-id arkd-seed \
  --region us-east-1 \
  --query SecretString \
  --output text
```

### Retrieve Macaroons

```bash
# Admin macaroon
aws secretsmanager get-secret-value \
  --secret-id admin \
  --region us-east-1 \
  --query SecretBinary \
  --output text | base64 --decode > admin.macaroon
```

## Security Considerations

### KMS Key Rotation

Enable automatic key rotation:

```bash
aws kms enable-key-rotation \
  --key-id arn:aws:kms:us-east-1:123456789012:key/xxxxx
```

### IAM Least Privilege

- Limit secret access to specific ARN patterns
- Use separate KMS keys for different environments
- Restrict KMS decrypt to specific keys only

### Secret Access Logging

Enable CloudTrail to monitor secret access:
- Monitor GetSecretValue calls
- Alert on unauthorized access attempts
- Review access patterns regularly

## Monitoring and Alerting

### CloudWatch Metrics

Monitor these metrics:
- Secret retrieval failures
- KMS decrypt failures
- Service restart frequency

### Recommended Alarms

1. Failed secret retrievals
2. KMS decrypt errors
3. Service unavailable for > 5 minutes
4. Abnormal secret access patterns
