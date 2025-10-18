# OpenTofu Reference

## State Management

### S3 Backend Architecture
**Components per environment**:
1. S3 bucket: `ark-{env}-terraform-state`
   - Versioning: Enabled (every change preserved)
   - Encryption: KMS
   - Public access: Blocked

2. DynamoDB table: `terraform-state-lock` (shared)
   - State locking
   - Prevents concurrent modifications

3. KMS key: `alias/terraform-state-key` (shared)
   - Encrypts all state files
   - CloudTrail audit logging

**Setup**: `make setup-env` creates all resources automatically

### Workspaces
- **Purpose**: Environment isolation (prod, staging, regtest)
- **Commands**:
  - `make tofu-workspace-new NAME=prod`
  - `make tofu-workspace-select NAME=prod`
  - `make tofu-workspace-show`

## Variable System

### Required Variables (Never Commit)
- `postgres_password`: RDS master password
- `github_token`: GitHub PAT for private repos
- `cloudflare_dns_api_token`: For Let's Encrypt DNS-01
- `tunnel_token`: Cloudflare tunnel token
- `slack_api_url`: Slack webhook
- `arkd_wallet_signer_key`: Wallet signer key

### Optional Variables (Have Defaults)
**Sizing**:
- `instance_type`: t3.large (default)
- `additional_volume_size`: 0 (no EBS by default)
- `db_instance_class_projection`: db.t3.micro
- `db_instance_class_event`: db.t3.micro
- `db_instance_class_nbxplorer`: db.t3.micro

**RDS Tuning**:
- `projection_pg_max_connections`: 100
- `event_pg_max_connections`: 100
- `nbx_pg_max_connections`: 100

**Application**:
- `arkd_image_tag`: latest
- `arkd_wallet_image_tag`: latest
- `btc_fast_sync_enabled`: true

### Configuration Files
- `environments/regtest.tfvars`: Base regtest config
- `environments/prod.tfvars`: Production config
- Secrets passed via `-var` flags at apply time

## Common Commands

### Initialization
```bash
make setup-env              # Complete setup (AWS + workspace)
make tofu-init              # Initialize OpenTofu
```

### Planning & Applying
```bash
make tofu-plan VARS="-var-file=../environments/prod.tfvars -var=..."
make tofu-apply VARS="-var-file=../environments/prod.tfvars -var=..."
```

### State Operations
```bash
make tofu-state ARGS="list"                    # List resources
make tofu-state ARGS="pull" | jq              # View state
make tofu-taint RESOURCE=aws_instance.app     # Force recreate
```

### Outputs
```bash
make tofu-output                              # All outputs
make tofu-output ARGS="ec2_instance_id"       # Specific output
```

### Snapshots
```bash
make list-snapshots ENV=prod                  # RDS & EBS snapshots
```

## State Versioning

### Automatic Versioning (S3)
- Every `tofu apply` creates new S3 version
- List versions: `aws s3api list-object-versions --bucket ark-prod-terraform-state`
- Restore previous: Pull specific version and push as current

### Manual Backups (Optional)
```bash
make state-backup          # Local backup with serial number
make state-version         # Show current state metadata
```

## Best Practices
- Always run `tofu-plan` before `apply`
- Use separate workspaces per environment
- Never commit state files or secrets
- Backup state before major changes
- Tag all resources with Environment

Source: `${ARK_INFRA_REPO}/docker-compose/docs/` + Makefile
