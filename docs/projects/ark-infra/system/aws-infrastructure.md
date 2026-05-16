# AWS Infrastructure - Detailed Reference

## VPC Configuration

### Network CIDR
- **VPC CIDR**: 10.10.0.0/16 (65,536 IPs)
- **Public Subnets**: 10.10.1.0/24, 10.10.2.0/24, 10.10.3.0/24 (3 × /24)
- **Private Subnets**: 10.10.101.0/24, 10.10.102.0/24, 10.10.103.0/24 (3 × /24)

### Availability Zones
- **AZ-a**: eu-central-1a (public_a, private_a)
- **AZ-b**: eu-central-1b (public_b, private_b)
- **AZ-c**: eu-central-1c (public_c, private_c) — added for true 3-AZ HA
- Resources distributed across all 3 AZs for high availability

### NAT Gateway Topology
Controlled by the `vpc_nat_per_az` variable (default `true` for HA):

| Setting | Behavior | Cost Impact |
|---------|----------|-------------|
| `true` (HA) | One NAT gateway + EIP per AZ; private route table per AZ; each private subnet routes through its own AZ's NAT | ~$96/mo (3 × ~$32) + per-AZ data charges |
| `false` (cost) | Single NAT gateway in AZ-a; all private subnets share that NAT via one route table | ~$32/mo, suitable for dev/staging |

EIPs are tagged `ark-nat-az-{a,b,c}-{env}`. State migration from the previous singular
`aws_eip.nat` / `aws_nat_gateway.gw` / `aws_route_table.private` resources to the per-AZ
for_each map (key `"a"`) is handled with OpenTofu `moved {}` blocks — applies are idempotent.

## Compute Resources

### EC2 Instance Configuration

**Default Sizing** (regtest):
- Instance type: t3.large (2 vCPU, 8GB RAM)
- Root EBS: 60GB gp3 (configurable via `root_volume_size`)
- Additional EBS: None

**Production Sizing**:
- Instance type: t3.xlarge (4 vCPU, 16GB RAM)
- Root EBS: 120GB gp3 (`root_volume_size = 120` in `prod.tfvars`)
- Additional EBS: 600-1000GB gp3/io2 (Bitcoin data)

**Lifecycle**: `aws_instance.app` is currently configured with `lifecycle { ignore_changes = all }`
to treat the running EC2 as a "pet" — OpenTofu will not detect or apply changes to the instance
until the directive is removed. Update images and configuration via Docker Compose / SSM.

**IAM Role Permissions**:
- `AmazonSSMManagedInstanceCore` - SSM Session Manager
- `CloudWatchAgentServerPolicy` - Metrics and logs
- Custom inline policy for ECR, Secrets Manager, KMS, CloudWatch Logs (for `awslogs` driver)

**CloudWatch Agent**:
- Collects memory, disk, network metrics
- Metrics namespace: `CWAgent`
- Metrics: mem_used_percent, disk_used_percent, disk_inodes_free

## Database Configuration

### RDS PostgreSQL Instances

**Instance 1: Projection Database**
- Identifier: `ark-postgres-projection-{env}`
- Engine: PostgreSQL 17
- Default class: db.t3.micro
- Storage: 20GB (auto-scaling to 1000GB)
- Purpose: CQRS read model (query-heavy)
- Max connections: 300 (prod)

**Instance 2: Event Database**
- Identifier: `ark-postgres-event-{env}`
- Engine: PostgreSQL 17
- Default class: db.t3.micro
- Storage: 20GB (auto-scaling to 1000GB)
- Purpose: Event sourcing store (write-heavy)
- Max connections: 300 (prod)

**Instance 3: NBXplorer Database**
- Identifier: `ark-postgres-nbxplorer-{env}`
- Engine: PostgreSQL 17
- Default class: db.t3.micro (prod: db.t3.medium+)
- Storage: 20GB (auto-scaling to 1000GB)
- Purpose: Bitcoin blockchain indexer (highest load)
- Max connections: 400 (prod)

**Common RDS Configuration**:
- Subnet group: `ark-db-subnet-{env}` — spans private subnets in all 3 AZs (private_a/b/c)
- Security group: `rds_sg` (port 5432 from app_sg only)
- **Multi-AZ**: `multi_az = true` for non-ephemeral envs (provisions a standby replica
  in another AZ that auto-promotes during failover); `false` for `ephemeral_env = true`
- **Backup retention**: `db_instance_backup_retention_period` — default 7 days, prod 30 days
- Backup window: 03:00-04:00 UTC
- Maintenance window: Sun:04:00-Sun:05:00 UTC (Multi-AZ removes most maintenance downtime)
- Encryption: AWS-managed KMS key
- **Performance Insights**: Enabled on every instance.
  `db_instance_performance_insights_retention_period` — default 7 days, prod 31 days.
  Validated to 7, 731, or 31×N (1≤N≤23).
- Parameter `track_io_timing = 1` is applied with `apply_method = pending-reboot`
  (immediate apply is not supported by AWS for this parameter and would cause
  perpetual plan drift).

### Parameter Groups

**Custom tuning per database**:
```
projection:
  max_connections: 300
  log_min_duration_statement: 500ms

event:
  max_connections: 300
  log_min_duration_statement: 500ms

nbxplorer:
  max_connections: 400
  log_min_duration_statement: 1000ms
```

## Cache Configuration

### ElastiCache Redis (Replication Group)

**Configuration**:
- Replication group ID: `ark-redis-{env}`
- Engine: Redis 7.0
- Node type: cache.t3.micro (prod: cache.t3.small)
- `num_cache_clusters`: `2` for non-ephemeral envs (primary + replica), `1` for ephemeral
- `multi_az_enabled` and `automatic_failover_enabled`: `true` for non-ephemeral envs
- Subnet group: `ark-redis-subnet-{env}` (spans private subnets in all 3 AZs)
- Security group: `redis_sg` (port 6379 from app_sg only)

**Cost note**: Multi-AZ adds ~$12/mo for the replica on `cache.t3.micro`. Failover takes
effect at the next scheduled maintenance window.

## Container Registry

### ECR Repositories

**Repository 1: arkd**
- Name: `arkd-{env}`
- Image scanning: On push
- Lifecycle policy: Keep last 10 images
- Encryption: AES-256

**Repository 2: arkd-wallet**
- Name: `arkd-wallet-{env}`
- Image scanning: On push
- Lifecycle policy: Keep last 10 images
- Encryption: AES-256

**Repository 3: kms-unlocker**
- Name: `kms-unlocker-{env}`
- Image scanning: On push
- Lifecycle policy: Keep last 10 images
- Encryption: AES-256

## VPC Endpoints

### Interface Endpoints (PrivateLink)

**Cost**: ~$0.01/hour per endpoint (~$7/month each)

1. **SSM Core** (`com.amazonaws.{region}.ssm`)
   - Purpose: Systems Manager API
   - Security group: vpc_endpoints_sg
   - Private DNS: Enabled

2. **SSM Messages** (`com.amazonaws.{region}.ssmmessages`)
   - Purpose: Session Manager messaging
   - Required for SSM sessions

3. **EC2 Messages** (`com.amazonaws.{region}.ec2messages`)
   - Purpose: EC2 agent communication
   - Required for SSM agent

4. **ECR API** (`com.amazonaws.{region}.ecr.api`)
   - Purpose: ECR control plane (auth, image manifest)
   - Reduces NAT data transfer

5. **ECR DKR** (`com.amazonaws.{region}.ecr.dkr`)
   - Purpose: Docker registry operations
   - Image layer downloads via S3 gateway

6. **CloudWatch Logs** (`com.amazonaws.{region}.logs`)
   - Purpose: SSM session logging
   - Reduces NAT data transfer

### Gateway Endpoint (Free)

7. **S3 Gateway** (`com.amazonaws.{region}.s3`)
   - Purpose: ECR image layers
   - No hourly charge
   - No data processing charge
   - Automatic prefix list routes

## IAM Configuration

### EC2 Instance Role

**Role Name**: `ark-app-role-{env}`

**Attached Policies**:
1. `AmazonSSMManagedInstanceCore` (AWS managed)
2. `CloudWatchAgentServerPolicy` (AWS managed)
3. `ark-app-ecr-full` (Custom inline)
4. `ark-app-s3-dump-upload-{env}` (Custom inline) — `s3:PutObject` on `arn:aws:s3:::ark-tmp-{env}/db-dumps/*` for the SSM `Ark-DumpDatabase` document
5. `ark-app-ssm-db-params-{env}` (Custom inline) — `ssm:GetParameter*` on `/ark/{env}/db/*` (DB credentials consumed by `pg_dump`)

**Custom Policy (ark-app-ecr-full)**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": [
        "arn:aws:ecr:{region}:{account}:repository/arkd-{env}",
        "arn:aws:ecr:{region}:{account}:repository/arkd-wallet-{env}",
        "arn:aws:ecr:{region}:{account}:repository/kms-unlocker-{env}"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:PutSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:{region}:{account}:secret:ark-pass*",
        "arn:aws:secretsmanager:{region}:{account}:secret:arkd-wallet-seed*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:Encrypt"
      ],
      "Resource": "arn:aws:kms:{region}:{account}:key/*"
    }
  ]
}
```

## Application Load Balancer (`modules/ark/`)

A single internet-facing ALB (`ark-{env}`) hosts both the telemetry Grafana UI and arkd
(staging+ since 2026-05).

**Listener** (HTTPS, ACM cert via `alb_certificate_arn`, policy `ELBSecurityPolicy-TLS13-1-2-2021-06`):

| Priority | Rule conditions | Target group | Purpose |
|----------|-----------------|--------------|---------|
| 10 | `host_header ∈ arkd_hosts` + `content-type: application/grpc*` | `arkdg-*` (HTTP/GRPC) | arkd gRPC |
| 15 | `host_header ∈ arkd_hosts` + `path ∈ arkd_sse_streaming_endpoint_paths` | `arkds-*` (HTTP1) | arkd SSE streams |
| (default for host) | `host_header ∈ arkd_hosts` | `arkdr-*` (HTTP1) | arkd REST |
| 100 | `host_header = telemetry_grafana_host` | grafana TG (port 3000) | Grafana UI |

Target groups all attach the single `app_instance_id`, port 7070. Health checks: gRPC uses
`/grpc.health.v1.Health/Check` (matcher `0`); REST/SSE use `/v1/info` (matcher `200`).

**Behavior**:
- `idle_timeout = 180s` (exceeds arkd 60s SSE heartbeats and Cloudflare 120s edge timeout)
- Access logs → `s3://ark-logs-{env}-{account_id}/alb/access/` (lifecycle `alb_log_retention_days` days; default 30, staging 7)
- Connection logs → `s3://ark-logs-{env}-{account_id}/alb/connection/`
- HTTP/1.1 support gated by `arkd_http1_support` (default `true`); flip to HTTP/2 once clients negotiate it

**Spot-check tool**: `scripts/alb-spot-check.sh <host>` runs gRPC `GetInfo`, REST `/v1/info`,
and SSE `/v1/batch/events` over both HTTP/1.1 and HTTP/2 and reports per-protocol results.

## S3 Buckets (`modules/ark/s3.tf`)

| Bucket | Purpose | Lifecycle | Notes |
|--------|---------|-----------|-------|
| `ark-logs-{env}-{account_id}` | ALB access + connection logs | `alb_log_retention_days` (default 30, staging 7) | AES256, public-access blocked, bucket policy permits `logdelivery.elasticloadbalancing.amazonaws.com` |
| `ark-tmp-{env}` | Ad-hoc operational storage (DB dumps, etc.) | 7-day expiry on all objects | AES256, public-access blocked, written by `Ark-DumpDatabase` SSM doc under `db-dumps/` |

## CloudWatch Configuration

### Log Groups

**Container Application Logs** (managed by `cloudwatch.tf`):
- Log group: `/ark/${env}` (e.g. `/ark/prod`, `/ark/regtest`)
- Retention: 14 days
- Streams (one per container, set in compose `logging.options.awslogs-stream`):
  `traefik`, `arkd`, `arkd-wallet`, `kms-unlocker`, `nbxplorer`, `bitcoind`, `cloudflared`
- Driver: Docker `awslogs` (mode=non-blocking, 16M buffer + cache, multiline pattern for
  Go panics / dated lines / nbxplorer ANSI escapes)
- Required env: `ARK_ENVIRONMENT` and `AWS_REGION` in `.env.ark`
- ⚠️ `docker logs <container>` no longer prints output on the host — query CloudWatch instead

**SSM Session Logs**:
- Log group: `/aws/ssm/sessions/{env}`
- Retention: 30 days
- Encryption: CloudWatch Logs managed key
- Purpose: Audit trail for all SSM sessions

**CloudWatch Agent Logs**:
- Log group: `/aws/ec2/{instance-id}`
- Retention: 7 days
- Metrics: Custom namespace `CWAgent`

### Metrics

**EC2 Standard Metrics** (AWS/EC2):
- CPUUtilization
- NetworkIn/Out
- DiskReadOps/WriteOps
- StatusCheckFailed

**CloudWatch Agent Metrics** (CWAgent):
- mem_used_percent
- disk_used_percent
- disk_inodes_free
- netstat_tcp_established

**RDS Metrics** (AWS/RDS):
- CPUUtilization
- DatabaseConnections
- FreeableMemory
- ReadIOPS/WriteIOPS
- FreeStorageSpace

**ElastiCache Metrics** (AWS/ElastiCache):
- CPUUtilization
- FreeableMemory
- NetworkBytesIn/Out
- CurrConnections
- Evictions

## Cost Breakdown

### Monthly Fixed Costs
- NAT Gateway: ~$32/mo (730 hours × $0.045/hr)
- VPC Endpoints (7 Interface): ~$50/mo (7 × $0.01/hr × 730hr)
- S3 Gateway Endpoint: $0 (free)

### Variable Costs

**Compute**:
- t3.large: ~$60/mo
- t3.xlarge: ~$120/mo
- c6i.2xlarge: ~$250/mo
- c6i.4xlarge: ~$500/mo

**Database**:
- db.t3.micro (3x): ~$30/mo
- db.t3.small (3x): ~$60/mo
- db.r6g.large (3x): ~$350/mo

**Cache**:
- cache.t3.micro: ~$15/mo
- cache.t3.small: ~$25/mo
- cache.r6g.large: ~$180/mo

**Storage**:
- EBS gp3 (per GB): ~$0.08/GB/mo
- 800GB Bitcoin data: ~$64/mo
- RDS storage (per GB): ~$0.115/GB/mo

**Data Transfer**:
- First 100GB out: Free
- Next 10TB: $0.09/GB
- NAT data processing: $0.045/GB

### Environment Cost Estimates
- **Regtest**: ~$150/mo
- **Staging**: ~$400/mo
- **Production**: ~$800+/mo

## Disaster Recovery Resources

### RDS Automated Backups
- Retention: 7 days (prod), 1 day (dev)
- Point-in-time recovery: 5-minute granularity
- Cross-region copy: Optional
- Cost: Free up to 100% of provisioned storage

### EBS Snapshots
- Manual snapshots: User-triggered
- AWS Backup: Automated via backup plans
- Data Lifecycle Manager (DLM): Policy-based
- Cross-region copy: Supported
- Cost: $0.05/GB/month

### State Files
- S3 versioning: Enabled on state buckets
- Every change creates new version
- Point-in-time recovery: Any version
- Cross-region replication: Optional
- Cost: Minimal (state files are small)

## Resource Tagging Strategy

**Standard Tags** (applied to all resources):
- `Environment`: prod|staging|regtest
- `ManagedBy`: opentofu
- `Project`: ark-infra
- `Workspace`: {workspace-name}

**Additional Tags**:
- `Backup`: true (for backup automation)
- `CostCenter`: {team-name}
- `Application`: {service-name}

Source: `${ARK_INFRA_REPO}/docker-compose/opentofu/*.tf`
