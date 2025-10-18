# Disaster Recovery - Standard Operating Procedure

## Overview
Comprehensive backup and recovery procedures for all Ark infrastructure components.

## Backup Strategy

### 1. Wallet Seed (Critical - Zero Loss)
**Backup**: Automatic via kms-unlocker
**Storage**: AWS Secrets Manager (`arkd-wallet-seed`)
**Encryption**: KMS

**Verify Backup**:
```bash
aws secretsmanager describe-secret --secret-id arkd-wallet-seed
```

**Recovery**:
```bash
# Retrieve seed
aws secretsmanager get-secret-value \
  --secret-id arkd-wallet-seed \
  --query 'SecretString' --output text | jq -r '.seed'
```

### 2. OpenTofu State (Zero Loss via S3 Versioning)
**Backup**: Automatic S3 versioning
**Storage**: `ark-{env}-terraform-state` bucket
**Retention**: All versions indefinitely

**List Versions**:
```bash
aws s3api list-object-versions \
  --bucket ark-prod-terraform-state \
  --prefix workspaces/prod/terraform.tfstate \
  --query 'Versions[*].[VersionId,LastModified,IsLatest]' \
  --output table
```

**Restore Previous Version**:
```bash
# Download specific version
VERSION_ID="abc123..."
aws s3api get-object \
  --bucket ark-prod-terraform-state \
  --key workspaces/prod/terraform.tfstate \
  --version-id $VERSION_ID \
  state-backup.json

# Push as current (in docker-compose dir)
cat state-backup.json | make tofu-state ARGS="push -"
```

### 3. RDS Databases (5-minute RPO)
**Backup**: Automated snapshots + manual
**Retention**: 7 days (prod), 1 day (dev)
**Point-in-time recovery**: 5-minute granularity

**Create Manual Snapshot**:
```bash
aws rds create-db-snapshot \
  --db-instance-identifier ark-postgres-projection-prod \
  --db-snapshot-identifier ark-projection-manual-$(date +%Y%m%d-%H%M%S)
```

**List Snapshots**:
```bash
make list-snapshots ENV=prod
```

### 4. EBS Volumes (Optional, Weekly)
**Backup**: Manual or AWS Backup service
**Retention**: 30 days recommended

**Create Snapshot**:
```bash
VOLUME_ID=$(aws ec2 describe-volumes \
  --filters "Name=attachment.instance-id,Values=$INSTANCE_ID" \
  --query 'Volumes[0].VolumeId' --output text)

aws ec2 create-snapshot \
  --volume-id $VOLUME_ID \
  --description "Ark prod Bitcoin data - $(date +%Y%m%d)"
```

## Recovery Procedures

### Wallet Recovery

**Scenario**: Wallet lost or corrupted

**Steps**:
1. Retrieve seed from Secrets Manager
2. Stop wallet service
3. Restore wallet from seed
4. Restart services
5. Verify wallet unlocked

```bash
# 1. Get seed
aws secretsmanager get-secret-value \
  --secret-id arkd-wallet-seed \
  --query 'SecretString' --output text > wallet-seed.json

# 2. Stop wallet
docker compose -f docker-compose.ark.prod.yaml stop arkd-wallet

# 3. Restore (implementation-specific)
# docker exec arkd-wallet arkd-wallet restore --seed="<mnemonic>"

# 4. Restart
docker compose -f docker-compose.ark.prod.yaml start arkd-wallet
docker compose -f docker-compose.ark.prod.yaml restart kms-unlocker

# 5. Verify
docker logs kms-unlocker | grep -i unlock
```

### RDS Point-in-Time Recovery

**Scenario**: Accidental data deletion, need to restore to 1 hour ago

**Steps**:
1. Identify recovery point
2. Restore to new instance
3. Verify data
4. Swap endpoints
5. Delete old instance

```bash
# 1. Find latest restorable time
aws rds describe-db-instances \
  --db-instance-identifier ark-postgres-projection-prod \
  --query 'DBInstances[0].LatestRestorableTime'

# 2. Restore
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier ark-postgres-projection-prod \
  --target-db-instance-identifier ark-postgres-projection-prod-restored \
  --restore-time 2025-10-15T10:00:00Z \
  --db-subnet-group-name ark-db-subnet-group-prod \
  --vpc-security-group-ids $RDS_SG_ID

# 3. Wait for restore
aws rds wait db-instance-available \
  --db-instance-identifier ark-postgres-projection-prod-restored

# 4. Update application
aws ssm start-session --target $INSTANCE_ID
nano /opt/ark-infra/docker-compose/compose/.env.ark
# Update ARKD_PG_DB_URL to restored endpoint

docker compose -f docker-compose.ark.prod.yaml restart arkd

# 5. Verify and clean up
# After verification, delete old instance
```

### RDS Snapshot Recovery

**Scenario**: Restore from manual snapshot

```bash
# 1. List snapshots
aws rds describe-db-snapshots --snapshot-type manual

# 2. Restore
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier ark-postgres-projection-prod-restored \
  --db-snapshot-identifier ark-projection-manual-20251015-100000 \
  --db-subnet-group-name ark-db-subnet-group-prod \
  --vpc-security-group-ids $RDS_SG_ID

# 3. Follow steps 3-5 from point-in-time recovery
```

### EBS Volume Recovery

**Scenario**: Bitcoin data corrupted

```bash
# 1. List snapshots
aws ec2 describe-snapshots \
  --owner-ids self \
  --filters "Name=tag:Environment,Values=prod"

# 2. Create volume from snapshot
AZ=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].Placement.AvailabilityZone' --output text)

NEW_VOLUME_ID=$(aws ec2 create-volume \
  --snapshot-id $SNAPSHOT_ID \
  --availability-zone $AZ \
  --volume-type gp3 \
  --query 'VolumeId' --output text)

# 3. Stop services
docker compose -f docker-compose.ark.prod.yaml down

# 4. Swap volumes
OLD_VOLUME_ID=$(aws ec2 describe-volumes \
  --filters "Name=attachment.instance-id,Values=$INSTANCE_ID" \
  --query 'Volumes[0].VolumeId' --output text)

aws ec2 detach-volume --volume-id $OLD_VOLUME_ID
aws ec2 wait volume-available --volume-ids $OLD_VOLUME_ID

aws ec2 attach-volume \
  --volume-id $NEW_VOLUME_ID \
  --instance-id $INSTANCE_ID \
  --device /dev/xvdb

# 5. Mount and start services
sudo mount -a
docker compose -f docker-compose.ark.prod.yaml up -d

# 6. Verify
docker exec bitcoind bitcoin-cli -datadir=/data getblockchaininfo
```

### Full Infrastructure Rebuild

**Scenario**: Complete infrastructure loss

**Prerequisites**:
- S3 state bucket with versions (survives regional failure)
- RDS snapshots available
- Wallet seed in Secrets Manager

**Steps**:
1. Verify S3 state backend exists
2. Initialize OpenTofu with existing backend
3. Verify state recovery
4. Restore from state (recreate all resources)
5. Restore databases from snapshots
6. Verify wallet seed in Secrets Manager
7. Run full validation

```bash
# 1. Check state bucket
aws s3 ls s3://ark-prod-terraform-state/

# 2. Initialize
cd docker-compose
make tofu-init

# 3. Select workspace
make tofu-workspace-select NAME=prod

# 4. Verify state
make tofu-state ARGS="list"

# 5. Recreate infrastructure
make tofu-apply VARS="<same as original deployment>"

# 6-7. Follow restoration procedures above
```

## RTO/RPO Targets

| Component | RTO | RPO | Notes |
|-----------|-----|-----|-------|
| Application (EC2) | 30 min | 0 | Redeploy via OpenTofu |
| RDS (Point-in-Time) | 1 hour | 5 min | Automated backup restore |
| RDS (Snapshot) | 2 hours | 24 hours | Manual snapshot restore |
| EBS Volume | 1 hour | 7 days | Weekly snapshots |
| Full Rebuild | 4 hours | As above | Complete recreation |
| Bitcoin Sync | 24-48 hours | N/A | Without fast sync |
| Bitcoin Fast Sync | 20 min | N/A | With AssumeUTXO |
| Wallet Seed | 0 | 0 | Always available |
| OpenTofu State | 0 | 0 | S3 versioning |

## Testing DR Procedures

### Monthly Backup Verification
```bash
make verify-backups ENV=prod
```

Checks:
- Wallet seed backup exists
- RDS automated backups enabled
- RDS manual snapshots exist (last 3)
- EBS snapshots exist (last 3)
- S3 state versions exist

### Quarterly DR Test

**Procedure**:
1. Create test environment (separate workspace)
2. Deploy from backups
3. Validate all services
4. Document results (time, issues, improvements)
5. Clean up test environment

Source: `${ARK_INFRA_REPO}/docker-compose/docs/10-disaster-recovery.md`
