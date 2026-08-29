# Secrets Management - Standard Operating Procedure

## Overview
Most sensitive information is stored in AWS Secrets Manager with KMS encryption. The wallet signer key is an exception — stored in secrets.<env>.tfvars pending future migration (see Section 3). Never commit secrets to git.

## Secret Types

### 1. Wallet Password
**Location**: AWS Secrets Manager
**Secret ID**: `ark-pass`
**Purpose**: Wallet encryption password

**Create**:
```bash
aws secretsmanager create-secret \
  --name ark-pass \
  --secret-string "$(openssl rand -base64 32)" \
  --kms-key-id alias/aws/secretsmanager \
  --region $AWS_REGION
```

**Retrieve**:
```bash
aws secretsmanager get-secret-value \
  --secret-id ark-pass \
  --query 'SecretString' --output text
```

**Update**:
```bash
aws secretsmanager update-secret \
  --secret-id ark-pass \
  --secret-string "<new-password>"
```

### 2. Wallet Seed Backup
**Location**: AWS Secrets Manager
**Secret ID**: `arkd-wallet-seed`
**Purpose**: Disaster recovery
**Managed by**: kms-unlocker (automatic)

**Retrieve** (emergency only):
```bash
aws secretsmanager get-secret-value \
  --secret-id arkd-wallet-seed \
  --query 'SecretString' --output text | jq -r '.seed'
```

### 3. Arkd Wallet Signer Key
**Location**: `secrets.<env>.tfvars` (NOT in AWS Secrets Manager)
**Variable**: `arkd_wallet_signer_key`
**Purpose**: secp256k1 private key used by arkd-wallet for ASP signing operations. 64-character hex string (32 bytes).

> **Note**: Currently stored as plaintext in tfvars. Future: migrate to AWS Secrets Manager (see deployment-guide.md TODO).

**Generate**:
```bash
SIGNER_KEY=$(openssl rand -hex 32)
echo "arkd_wallet_signer_key = \"$SIGNER_KEY\"" >> secrets.<env>.tfvars
```

**Storage**:
- Regtest/dev: hardcoded in `regtest.tfvars` (intentional, not a real secret)
- Prod/staging: generated per environment, stored in local `secrets.<env>.tfvars` (gitignored), never committed

### 4. Deployment Secrets
**Location**: Never committed, passed via `-var` flags

**Required Secrets**:
- `AWS_ACCESS_KEY_ID`: AWS authentication
- `AWS_SECRET_ACCESS_KEY`: AWS authentication
- `GITHUB_TOKEN`: Private repo access
- `CLOUDFLARE_DNS_API_TOKEN`: SSL certificate DNS validation
- `TUNNEL_TOKEN`: Cloudflare tunnel authentication
- `SLACK_API_URL`: Alert notifications
- `POSTGRES_PASSWORD`: Database master password
- `ARKD_WALLET_SIGNER_KEY`: Wallet signing key

**Storage**: Local `.env` file (gitignored) or password manager

## Secret Rotation

### Wallet Password Rotation

**Schedule**: Every 90 days for production

**Procedure**:
1. Generate new password:
```bash
NEW_PASSWORD=$(openssl rand -base64 32)
```

2. Update Secrets Manager:
```bash
aws secretsmanager update-secret \
  --secret-id ark-pass \
  --secret-string "$NEW_PASSWORD"
```

3. Connect to instance:
```bash
aws ssm start-session --target $INSTANCE_ID
```

4. Restart kms-unlocker (will fetch new password):
```bash
docker compose -f docker-compose.ark.prod.yaml restart kms-unlocker
```

5. Verify wallet unlocked:
```bash
docker logs kms-unlocker | grep -i unlock
```

### GitHub Token Rotation

**Schedule**: Every 90 days

**Procedure**:
1. Generate new token in GitHub settings
2. Update local `.env` file
3. Next deployment will use new token
4. Revoke old token after verification

### Cloudflare Token Rotation

**Schedule**: Every 90 days

**Procedure**:
1. Generate new API token in Cloudflare dashboard
2. Update local `.env` file
3. Update services:
```bash
# Connect to instance
aws ssm start-session --target $INSTANCE_ID

# Update .env.ark
sudo nano /opt/ark-infra/docker-compose/compose/.env.ark
# Update: CF_DNS_API_TOKEN=<new-token>

# Restart traefik
docker compose -f docker-compose.ark.prod.yaml restart traefik
```

### Database Password Rotation

**Schedule**: Every 180 days or on-demand

**Procedure**:
1. Generate new password:
```bash
NEW_PASS=$(openssl rand -base64 24)
```

2. Update RDS master password:
```bash
aws rds modify-db-instance \
  --db-instance-identifier ark-postgres-projection-prod \
  --master-user-password "$NEW_PASS" \
  --apply-immediately

# Repeat for other databases
```

3. Update `.env.ark` on instance:
```bash
aws ssm start-session --target $INSTANCE_ID
sudo nano /opt/ark-infra/docker-compose/compose/.env.ark
# Update all POSTGRES_PASSWORD references
```

4. Restart affected services:
```bash
docker compose -f docker-compose.ark.prod.yaml restart arkd nbxplorer
```

5. Verify connections:
```bash
docker logs arkd | grep -i postgres
docker logs nbxplorer | grep -i database
```

## Secret Access Control

### IAM Policy for Secrets
EC2 instance role has:
```json
{
  "Effect": "Allow",
  "Action": [
    "secretsmanager:GetSecretValue",
    "secretsmanager:PutSecretValue"
  ],
  "Resource": [
    "arn:aws:secretsmanager:${region}:${account}:secret:ark-pass*",
    "arn:aws:secretsmanager:${region}:${account}:secret:arkd-wallet-seed*"
  ]
}
```

### User Access
Restricted via IAM policies:
```bash
# Only allow GetSecretValue (not PutSecretValue)
{
  "Effect": "Allow",
  "Action": "secretsmanager:GetSecretValue",
  "Resource": "arn:aws:secretsmanager:*:*:secret:ark-pass*",
  "Condition": {
    "Bool": {"aws:MultiFactorAuthPresent": "true"}
  }
}
```

## Audit and Compliance

### Audit Secret Access
```bash
# CloudTrail events
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceType,AttributeValue=AWS::SecretsManager::Secret \
  --max-results 50
```

### List All Secrets
```bash
aws secretsmanager list-secrets \
  --query 'SecretList[?contains(Name, `ark`)].Name' \
  --output table
```

### Check Last Rotation
```bash
aws secretsmanager describe-secret \
  --secret-id ark-pass \
  --query '[Name,LastChangedDate,LastAccessedDate]' \
  --output table
```

## Best Practices

1. **Never commit secrets to git**
   - Use `.gitignore` for local `.env` files
   - Pass secrets via `-var` flags at deploy time

2. **Use strong passwords**
   - Minimum 32 characters for wallet passwords
   - Use cryptographically secure random generation

3. **Rotate regularly**
   - Production: Every 90 days
   - Staging: Every 180 days
   - On employee departure

4. **Audit access**
   - Review CloudTrail logs monthly
   - Monitor unauthorized access attempts

5. **Use MFA**
   - Require MFA for secret access
   - Enforce in IAM policies

Source: `${ARK_INFRA_REPO}/docker-compose/docs/09-security.md`
