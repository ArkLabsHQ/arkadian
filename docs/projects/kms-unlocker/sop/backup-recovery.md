# Backup and Recovery

## Backup Strategies

### Local Backup

**Use Case**: Development and testing environments

**Storage**: Filesystem-based backup in local data directory

**Pros**:
- Simple setup
- No external dependencies
- Quick access for debugging

**Cons**:
- Not suitable for production
- No redundancy
- Limited disaster recovery

### AWS Backup

**Use Case**: Production deployments

**Storage**: AWS Secrets Manager with KMS encryption

**Pros**:
- High availability
- Encrypted at rest
- Disaster recovery ready
- Automatic replication

**Cons**:
- Requires AWS setup
- Additional cost
- Network dependency

## What Gets Backed Up

### Wallet Seed

**When**: One-time backup after wallet creation

**Content**: BIP39 mnemonic seed phrase

**Purpose**: Complete wallet recovery in disaster scenarios

**Critical**: Without this, wallet funds are permanently lost

### Macaroon Files

**When**: After each successful wallet unlock

**Content**: Authentication tokens for arkd API access

**Purpose**: Restore API access after data loss

**Files Backed Up**:
- `admin.macaroon` - Full administrative access
- Other `.macaroon` files in the configured directory

## Local Backup

### Location

Default data directory (OS-specific):
- **Linux**: `~/.local/share/kms-unlocker/`
- **macOS**: `~/Library/Application Support/kms-unlocker/`
- **Windows**: `%APPDATA%\kms-unlocker\`

Override with: `KMS_UNLOCKER_DATADIR=/custom/path`

### File Structure

```
$KMS_UNLOCKER_DATADIR/
├── seed.txt              # Wallet seed
└── macaroons/
    ├── admin.macaroon
    └── *.macaroon
```

### Permissions

Files are created with restricted permissions (0600 on Unix systems).

### Manual Backup Procedure

1. Locate data directory:
```bash
echo $KMS_UNLOCKER_DATADIR
# OR use default OS-specific location
```

2. Copy files to secure location:
```bash
cp -r $KMS_UNLOCKER_DATADIR /secure/backup/location/
```

3. Verify backup:
```bash
ls -la /secure/backup/location/
```

## AWS Backup

### Automatic Backup Flow

1. Service creates wallet
2. Seed is immediately backed up to Secrets Manager
3. Wallet is unlocked
4. All `.macaroon` files are backed up to Secrets Manager

### Secret Naming Conventions

- **Seed**: Configured by `KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME` (default: `arkd-seed`)
- **Macaroons**: Filename without `.macaroon` extension
  - `admin.macaroon` → secret name: `admin`
  - `readonly.macaroon` → secret name: `readonly`

### Viewing Backups

List all secrets:
```bash
aws secretsmanager list-secrets --region us-east-1
```

Get seed:
```bash
aws secretsmanager get-secret-value \
  --secret-id arkd-seed \
  --region us-east-1 \
  --query SecretString \
  --output text
```

Get macaroon:
```bash
aws secretsmanager get-secret-value \
  --secret-id admin \
  --region us-east-1 \
  --query SecretBinary \
  --output text | base64 --decode > admin.macaroon
```

## Disaster Recovery

### Recovery Procedures

#### Scenario 1: Lost Wallet, Have Seed

**Situation**: Wallet data deleted, seed backup exists

**Steps**:

1. Retrieve seed from backup:
```bash
# Local
cat $KMS_UNLOCKER_DATADIR/seed.txt

# AWS
aws secretsmanager get-secret-value \
  --secret-id arkd-seed \
  --query SecretString \
  --output text
```

2. Stop arkd and kms-unlocker

3. Delete wallet data directory

4. Start kms-unlocker - it will recreate wallet using the same password

5. Manually restore seed to arkd wallet using the retrieved seed

#### Scenario 2: Lost Macaroons

**Situation**: Macaroon files deleted, backups exist

**Steps**:

1. Retrieve macaroons from backup:
```bash
# Local
cp $KMS_UNLOCKER_DATADIR/macaroons/* /path/to/macaroons/

# AWS
aws secretsmanager get-secret-value \
  --secret-id admin \
  --query SecretBinary \
  --output text | base64 --decode > admin.macaroon
```

2. Restart services if needed

3. Verify API access works

#### Scenario 3: Complete Data Loss with AWS Backup

**Situation**: Complete server failure, AWS backups available

**Steps**:

1. Deploy new kms-unlocker instance

2. Configure with same environment variables:
   - Same `KMS_UNLOCKER_SECRET_ID`
   - Same `KMS_UNLOCKER_BACKUP_SEED_SECRET_NAME`
   - Same IAM permissions

3. Retrieve seed from AWS:
```bash
aws secretsmanager get-secret-value \
  --secret-id arkd-seed \
  --region us-east-1
```

4. Retrieve macaroons from AWS:
```bash
aws secretsmanager get-secret-value \
  --secret-id admin \
  --region us-east-1
```

5. Manually restore wallet using seed

6. Place macaroons in configured directory

7. Start kms-unlocker

## Testing Recovery

### Simulate Data Loss

Local mode:
```bash
rm -rf $KMS_UNLOCKER_DATADIR
```

AWS mode (test only - don't do in production):
```bash
# Delete secrets
aws secretsmanager delete-secret \
  --secret-id arkd-seed \
  --force-delete-without-recovery
```

### Restore from Backup

Follow the appropriate scenario above based on what was deleted.

### Verify Functionality

1. Check wallet is accessible
2. Verify API calls work with macaroons
3. Confirm balance is correct
4. Test transaction signing

## Best Practices

- Keep backups in geographically separate locations
- Test recovery procedures regularly
- Never store plaintext seeds in source control
- Encrypt local backups if stored on shared systems
- Monitor backup success/failure in logs
- Document custom backup locations for team
