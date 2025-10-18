# Getting Started - 5-Minute Regtest Deployment

## Prerequisites
- Docker (for running OpenTofu)
- AWS CLI with configured credentials
- AWS account with sufficient permissions
- GitHub Personal Access Token
- Cloudflare account (tunnel + DNS)

## Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/ArkLabsHQ/ark-infra.git
cd ark-infra/docker-compose
```

### 2. Setup Environment (One Command)
```bash
make setup-env
```

**This creates**:
- KMS key (encryption)
- S3 bucket (state storage with versioning)
- DynamoDB table (state locking)
- Secrets Manager secret (wallet password)
- Backend config file (`opentofu/backend-{env}.hcl`)
- OpenTofu workspace
- Initializes OpenTofu

**Prompts for**:
- Environment name (regtest, staging, prod)
- Secret name (e.g., ark-wallet-password)
- Wallet password (hidden input)
- Initialize OpenTofu? (yes/no)

### 3. Gather Secrets
Never commit these:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_DEFAULT_REGION`
- `AWS_ACCOUNT_ID`
- `GITHUB_TOKEN`
- `CLOUDFLARE_DNS_API_TOKEN`
- `TUNNEL_TOKEN`
- `SLACK_API_URL`
- `POSTGRES_PASSWORD`

### 4. Deploy
```bash
AWS_ACCESS_KEY_ID=<key> \
AWS_SECRET_ACCESS_KEY=<secret> \
AWS_DEFAULT_REGION=eu-central-1 \
make tofu-apply VARS="\
-var-file=../environments/regtest.tfvars \
-var=env=regtest \
-var=postgres_username=root \
-var=postgres_password=<password> \
-var=github_token=<token> \
-var=arkd_image_tag=master \
-var=arkd_wallet_image_tag=master \
-var=ark_infra_repo_branch=main \
-var=ark_telemetry_branch=main \
-var=traefik_acme_email=<email> \
-var=arkd_domain=<domain> \
-var=slack_api_url=<url> \
-var=slack_channel=\"#alerts\" \
-var=aws_account_id=<account-id> \
-var=tunnel_token=<token> \
-var=cloudflare_dns_api_token=<token> \
-var=kms_unlocker_image_tag=master \
-var=kms_unlocker_secret_id=ark-pass"
```

Takes ~15 minutes total.

### 5. Verify Deployment
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
docker compose -f docker-compose.ark.regtest.yaml ps
```

### 6. Access Services
**Admin API** (via SSM port forward):
```bash
aws ssm start-session --target $INSTANCE_ID \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["7071"],"localPortNumber":["7071"]}'

curl http://localhost:7071/admin/info
```

**Public API** (via domain):
```bash
curl https://<your-domain>/v1/info
```

## What Just Happened?

1. **AWS Resources Created**:
   - VPC with public/private subnets
   - EC2 instance (private subnet)
   - 3 RDS PostgreSQL instances
   - ElastiCache Redis
   - VPC endpoints (SSM, ECR, CloudWatch, S3)
   - NAT Gateway

2. **Services Started**:
   - arkd (main daemon)
   - arkd-wallet (auto-unlocked)
   - kms-unlocker (wallet unlock)
   - nbxplorer (blockchain indexer)
   - traefik (reverse proxy)
   - cloudflared (tunnel)
   - Telemetry stack (Prometheus, Grafana, etc.)

3. **Automatic Operations**:
   - kms-unlocker fetched password and unlocked wallet
   - nbxplorer started indexing blockchain
   - traefik obtained SSL certificate
   - cloudflared established tunnel

## Next Steps
- Review full deployment guide: `deployment-guide.md`
- Run validation: `validation.md`
- Learn operations: `operations.md`

Source: `${ARK_INFRA_REPO}/docker-compose/docs/02-getting-started.md`
