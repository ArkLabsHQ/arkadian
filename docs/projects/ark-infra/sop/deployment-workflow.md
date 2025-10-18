# Deployment Workflow - Step-by-Step Procedure

## Overview
This SOP provides the exact sequence for deploying Ark infrastructure to any environment.

## Pre-Deployment Phase

### 1. Prepare Environment (15 minutes)

**1.1 Clone Repository**
```bash
git clone https://github.com/ArkLabsHQ/ark-infra.git
cd ark-infra/docker-compose
```

**1.2 Run Setup Script**
```bash
make setup-env
```

Interactive prompts:
- Environment name: `prod|staging|regtest`
- Secret name: `ark-pass`
- Wallet password: `<secure-password>` (hidden)
- Initialize OpenTofu: `yes`

Creates:
- KMS key for encryption
- S3 bucket for state (versioned)
- DynamoDB table for locking
- Secrets Manager secret
- Backend config file
- OpenTofu workspace

**1.3 Gather Secrets**
Create file `secrets.env` (DO NOT COMMIT):
```bash
# AWS
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_DEFAULT_REGION="eu-central-1"
export AWS_ACCOUNT_ID="123456789012"

# GitHub
export GITHUB_TOKEN="ghp_..."

# Cloudflare
export CLOUDFLARE_DNS_API_TOKEN="..."
export TUNNEL_TOKEN="eyJh..."

# Slack
export SLACK_API_URL="https://hooks.slack.com/..."

# Database
export POSTGRES_PASSWORD="<secure-password>"

# Wallet
export ARKD_WALLET_SIGNER_KEY="xprv..."
```

Source: `source secrets.env`

### 2. Review Configuration (5 minutes)

**2.1 Environment Config**
Review `environments/<env>.tfvars`:
```hcl
# Regtest
env = "regtest"
instance_type = "t3.large"
additional_volume_size = 0

# Production
env = "prod"
instance_type = "t3.xlarge"
additional_volume_size = 800
btc_fast_sync_enabled = true
db_instance_class_nbxplorer = "db.t3.medium"
```

**2.2 Verify Workspace**
```bash
make tofu-workspace-show
# Expected: correct environment name
```

### 3. Create Deployment Plan (5 minutes)

**3.1 Generate Plan**
```bash
make tofu-plan VARS="\
-var-file=../environments/$ENV.tfvars \
-var=env=$ENV \
-var=postgres_username=root \
-var=postgres_password=$POSTGRES_PASSWORD \
-var=github_token=$GITHUB_TOKEN \
-var=arkd_image_tag=master \
-var=arkd_wallet_image_tag=master \
-var=ark_infra_repo_branch=main \
-var=ark_telemetry_branch=main \
-var=traefik_acme_email=ops@example.com \
-var=arkd_domain=$DOMAIN \
-var=slack_api_url=$SLACK_API_URL \
-var=slack_channel=\"#alerts\" \
-var=aws_account_id=$AWS_ACCOUNT_ID \
-var=tunnel_token=$TUNNEL_TOKEN \
-var=cloudflare_dns_api_token=$CLOUDFLARE_DNS_API_TOKEN \
-var=kms_unlocker_image_tag=master \
-var=kms_unlocker_secret_id=ark-pass \
-var=kms_unlocker_max_retry=10 \
-var=kms_unlocker_server_url=http://arkd-wallet:6060 \
-var=kms_unlocker_password_provider_type=aws" | tee plan-$ENV.txt
```

**3.2 Review Plan**
Critical checks:
- [ ] Correct environment tag
- [ ] No unexpected resource deletions
- [ ] Instance type matches requirements
- [ ] EBS volume size appropriate (prod only)
- [ ] RDS instance classes correct
- [ ] All 3 databases configured

**3.3 Team Approval**
For production:
- Share plan with team
- Schedule deployment window
- Prepare rollback procedure

## Deployment Phase

### 4. Apply Infrastructure (15-20 minutes)

**4.1 Execute Apply**
```bash
make tofu-apply VARS="<same as plan>" ARGS="-auto-approve"
```

**4.2 Monitor Progress**
Watch for:
- VPC and subnets created
- EC2 instance launching
- RDS instances creating
- VPC endpoints establishing

Approximate timeline:
- 0-2 min: VPC, subnets, security groups
- 2-5 min: NAT Gateway, VPC endpoints
- 5-10 min: RDS instances
- 10-15 min: EC2 instance + user-data script
- 15-20 min: Services starting

**4.3 Capture Outputs**
```bash
make tofu-output > outputs-$ENV.txt
```

Save for reference:
- `ec2_instance_id`
- `postgres_projection_endpoint`
- `postgres_event_endpoint`
- `postgres_nbxplorer_endpoint`
- `redis_endpoint`
- `ssm_session_command`

### 5. Verify Deployment (10-15 minutes)

**5.1 Run Automated Validation**
```bash
make validate-deployment ENV=$ENV
```

**5.2 Manual Verification**
```bash
# Get instance ID
INSTANCE_ID=$(make tofu-output ARGS="-raw ec2_instance_id")

# Check SSM agent
aws ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=$INSTANCE_ID" \
  --query 'InstanceInformationList[0].PingStatus'

# Connect
aws ssm start-session --target $INSTANCE_ID

# Check services
docker compose -f docker-compose.ark.$ENV.yaml ps

# Check logs
docker compose -f docker-compose.ark.$ENV.yaml logs --tail=50
```

**5.3 Service-Specific Checks**

Bitcoin (prod only):
```bash
docker exec bitcoind bitcoin-cli -datadir=/data getblockchaininfo
```

NBXplorer:
```bash
curl -s http://localhost:32838/v1/cryptos/BTC/status | jq
```

Wallet unlock:
```bash
docker logs kms-unlocker | grep -i unlock
```

**5.4 External Access**
```bash
# Test public API
curl https://$DOMAIN/v1/info

# Test admin API (via port forward)
aws ssm start-session --target $INSTANCE_ID \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["7071"],"localPortNumber":["7071"]}'

# In another terminal
curl http://localhost:7071/admin/info
```

## Post-Deployment Phase

### 6. Configure Monitoring (5 minutes)

**6.1 Access Grafana**
```bash
# Port forward
aws ssm start-session --target $INSTANCE_ID \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["3333"],"localPortNumber":["3333"]}'

# Browser: http://localhost:3333
# Default: admin / admin
```

**6.2 Verify Dashboards**
- [ ] Host metrics (CPU, memory, disk)
- [ ] Container metrics
- [ ] Ark metrics
- [ ] Bitcoin metrics (if prod)

**6.3 Configure Alerts**
Review Alertmanager config:
```bash
cat /opt/ark-telemetry/prometheus/alertmanager.yml
```

### 7. Backup Configuration (5 minutes)

**7.1 Create Initial Snapshots**
```bash
# RDS snapshots
aws rds create-db-snapshot \
  --db-instance-identifier ark-postgres-projection-$ENV \
  --db-snapshot-identifier ark-projection-initial-$(date +%Y%m%d)

aws rds create-db-snapshot \
  --db-instance-identifier ark-postgres-event-$ENV \
  --db-snapshot-identifier ark-event-initial-$(date +%Y%m%d)

aws rds create-db-snapshot \
  --db-instance-identifier ark-postgres-nbxplorer-$ENV \
  --db-snapshot-identifier ark-nbx-initial-$(date +%Y%m%d)
```

**7.2 Verify State Backup**
```bash
# Check S3 versioning
aws s3api get-bucket-versioning --bucket ark-$ENV-terraform-state

# List versions
aws s3api list-object-versions \
  --bucket ark-$ENV-terraform-state \
  --prefix workspaces/$ENV/terraform.tfstate
```

**7.3 Document Deployment**
Create record:
```
Date: YYYY-MM-DD
Environment: $ENV
Version: <arkd-version>
Instance ID: $INSTANCE_ID
Deployed by: <name>
Special notes: <any customizations>
```

### 8. Test Disaster Recovery (10 minutes)

**8.1 Verify Backup Existence**
```bash
make verify-backups ENV=$ENV
```

**8.2 Document Recovery Procedures**
- [ ] Wallet seed backed up in Secrets Manager
- [ ] RDS snapshots exist
- [ ] State file versioned in S3
- [ ] Recovery runbook documented

## Rollback Procedure

**If deployment fails**:

1. **Capture Diagnostics**
```bash
# Save logs
docker compose logs > deployment-failure-logs.txt

# Save state
make tofu-state ARGS="pull" > state-pre-rollback.json
```

2. **Destroy Failed Resources**
```bash
make tofu-destroy VARS="<same variables>" ARGS="-auto-approve"
```

3. **Review Errors**
- Check CloudWatch Logs
- Review user-data script logs
- Verify all secrets correct

4. **Fix and Retry**
- Correct configuration
- Re-run deployment from step 4

## Production-Specific Requirements

**Additional Steps for Production**:

1. **Pre-Deployment**
   - [ ] Maintenance window scheduled
   - [ ] Team notified
   - [ ] Rollback plan documented
   - [ ] Backup procedures verified

2. **During Deployment**
   - [ ] Monitor CloudWatch metrics
   - [ ] Watch for errors in real-time
   - [ ] Keep team updated

3. **Post-Deployment**
   - [ ] Full validation (30-45 minutes)
   - [ ] Enable automated backups
   - [ ] Configure alerts
   - [ ] Update documentation
   - [ ] Team notification (deployment complete)

Source: Compiled from `${ARK_INFRA_REPO}/docker-compose/docs/`
