# Deployment Guide

## Environment Overview

| Environment | Bitcoin Node | Resources | Backups | Cost/Month |
|-------------|--------------|-----------|---------|------------|
| **Regtest** | External (nigiri) | Minimal | No | ~$150 |
| **Staging** | Full mainnet | Medium | Optional | ~$400 |
| **Production** | Full mainnet | Full | Required | ~$800+ |

## Pre-Deployment

### 1. Setup Environment
```bash
cd docker-compose
make setup-env
```

This interactive script:
- Creates KMS key, S3 bucket, DynamoDB table
- Creates Secrets Manager secret for wallet password
- Generates backend config (`opentofu/backend-{env}.hcl`)
- Creates OpenTofu workspace
- Initializes OpenTofu

### 2. Gather Secrets
All sensitive values passed via `-var` flags (never commit):
- AWS credentials
- GitHub token
- Cloudflare tokens
- Slack webhook
- Database password
- Wallet signer key

## Regtest Deployment

**Purpose**: Fast testing with minimal resources

**Characteristics**:
- Bitcoin: External node (no blockchain sync)
- EBS: None
- Backups: Disabled
- Cost: ~$150/mo

**Deploy**:
```bash
make tofu-workspace-select NAME=regtest
make tofu-apply VARS="-var-file=../environments/regtest.tfvars -var=..."
```

**Validate**:
```bash
make validate-deployment ENV=regtest
```

## Staging Deployment

**Purpose**: Pre-production validation

**Characteristics**:
- Bitcoin: Full mainnet node
- EBS: Optional (600GB)
- Fast sync: Enabled
- Backups: Optional
- Cost: ~$400/mo

**Deploy**:
```bash
make tofu-workspace-new NAME=staging
make tofu-workspace-select NAME=staging
make tofu-apply VARS="-var-file=../environments/staging.tfvars -var=..."
```

## Production Deployment

**Purpose**: Live system

**Characteristics**:
- Bitcoin: Full mainnet with fast sync
- EBS: Required (800GB+)
- Backups: Automated (7-day RDS retention)
- Multi-AZ: Optional
- Cost: ~$800+/mo

**Critical Variables**:
```hcl
instance_type = "t3.xlarge"
additional_volume_size = 800
db_instance_class_nbxplorer = "db.t3.medium"
btc_fast_sync_enabled = true
```

**Pre-Production Checklist**:
- [ ] All secrets gathered
- [ ] Backup strategy planned
- [ ] Team notified
- [ ] Plan reviewed carefully

**Deploy**:
```bash
make tofu-workspace-new NAME=prod
make tofu-workspace-select NAME=prod
make tofu-plan VARS="..." | tee plan-prod.txt  # Review!
make tofu-apply VARS="..."
```

**Post-Deployment**:
1. Backup state file
2. Run full validation
3. Configure monitoring alerts
4. Document deployment
5. Test restore procedure

## Common Operations

### Update Docker Images
```bash
# Connect to instance
aws ssm start-session --target $INSTANCE_ID

# Pull and restart
cd /opt/ark-infra/docker-compose/compose
docker compose -f docker-compose.ark.prod.yaml pull arkd
docker compose -f docker-compose.ark.prod.yaml up -d arkd
```

### Restart Services
```bash
docker compose -f docker-compose.ark.prod.yaml restart arkd
```

### View Logs
```bash
docker compose -f docker-compose.ark.prod.yaml logs -f arkd
```

## Troubleshooting

**SSM Agent Not Online**:
- Wait 2-3 minutes after deployment
- Check VPC endpoints available
- Verify IAM role attached

**Wallet Not Unlocking**:
- Check kms-unlocker logs: `docker logs kms-unlocker`
- Verify secret exists in Secrets Manager
- Check IAM permissions

**Bitcoin Sync Slow**:
- Enable fast sync: `-var=btc_fast_sync_enabled=true`
- Use larger instance type
- Increase EBS IOPS

Source: `${ARK_INFRA_REPO}/docker-compose/docs/03-deployment-guide.md`
