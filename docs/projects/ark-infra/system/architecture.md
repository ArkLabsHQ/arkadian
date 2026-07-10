# Ark Infrastructure Architecture

## Overview

The Ark infrastructure follows a multi-layered architecture combining AWS cloud services with containerized applications. The design emphasizes security, automation, and operational simplicity through the no-SSH paradigm.

## Infrastructure Layers

### 1. AWS Infrastructure Layer

#### VPC Architecture
```
VPC: 10.10.0.0/16 (65,536 IPs)
├── Public Subnets (Internet-facing)
│   ├── 10.10.1.0/24 (AZ-a) - NAT Gateway
│   ├── 10.10.2.0/24 (AZ-b) - NAT Gateway (when vpc_nat_per_az=true)
│   └── 10.10.3.0/24 (AZ-c) - NAT Gateway (when vpc_nat_per_az=true)
└── Private Subnets (Internal only)
    ├── 10.10.101.0/24 (AZ-a) - EC2, RDS, Redis
    ├── 10.10.102.0/24 (AZ-b) - RDS replica, Redis replica
    └── 10.10.103.0/24 (AZ-c) - RDS / Redis spare AZ for Multi-AZ failover
```

**Design Rationale**:
- 3 AZs for high availability (eu-central-1a/1b/1c)
- Public subnets host only NAT Gateway (no compute)
- Private subnets host all application resources
- No public IPs on application instances
- `vpc_nat_per_az` feature flag: `true` provisions one NAT per AZ (~$32/mo each, true HA);
  `false` routes all egress through the AZ-a NAT (saves ~$64/mo, suitable for dev/staging)
- OpenTofu `moved {}` blocks migrate the previous singular NAT/route table state into the
  per-AZ map keyed by `"a"`

#### Compute Resources
- **EC2 Instance** (private subnet)
  - Default: t3.large (2 vCPU, 8GB RAM)
  - Prod: t3.xlarge (4 vCPU, 16GB RAM)
  - Root EBS: configurable via `root_volume_size` (default 60 GB; prod 120 GB)
  - Additional EBS: Variable (for Bitcoin data)
  - IAM role with SSM, ECR, Secrets Manager, CloudWatch Logs permissions
  - `lifecycle { ignore_changes = all }` — instance is treated as a pet; OpenTofu
    will not replace or modify it on subsequent applies

#### Databases
- **RDS PostgreSQL 17** (3 instances):
  - `postgres-projection`: CQRS read model (query-heavy)
  - `postgres-event`: Event sourcing (write-heavy)
  - `postgres-nbxplorer`: Blockchain indexer (highest load)
  - Custom parameter groups with tuning (`track_io_timing` applied at `pending-reboot`)
  - **Multi-AZ**: enabled for non-ephemeral envs (~+$28/instance) — automatic standby replica
    in a failover AZ; promotes during maintenance for near-zero downtime
  - **Automated backups**: `db_instance_backup_retention_period` — default 7 days, prod 30 days
  - **Performance Insights**: enabled on all instances —
    `db_instance_performance_insights_retention_period` default 7 days, prod 31 days
  - Subnet group spans private subnets in all 3 AZs

#### Cache
- **ElastiCache Redis 7.0** (replication group)
  - Default: cache.t3.micro
  - Prod: cache.t3.small
  - Subnet group spans private subnets in all 3 AZs
  - Non-ephemeral envs: 2 cache clusters (primary + replica), `multi_az_enabled = true`,
    `automatic_failover_enabled = true` (~+$12/mo for replica)
  - Ephemeral envs: 1 cache cluster, no failover

#### Networking Components
- **NAT Gateway**: Outbound internet access (~$32/mo + data)
- **Internet Gateway**: Public subnet connectivity
- **VPC Endpoints** (7 Interface + 1 Gateway):
  - SSM (ssm, ssmmessages, ec2messages)
  - ECR (ecr.api, ecr.dkr)
  - CloudWatch Logs
  - S3 Gateway (free)

### 2. Network Security Layer

#### Security Groups
1. **app_sg** (EC2)
   - Inbound: Self-referential + VPC endpoints (443)
   - Outbound: All

2. **rds_sg** (PostgreSQL)
   - Inbound: Port 5432 from app_sg only
   - Outbound: None

3. **redis_sg** (ElastiCache)
   - Inbound: Port 6379 from app_sg only
   - Outbound: None

4. **vpc_endpoints_sg**
   - Inbound: Port 443 from app_sg only
   - Outbound: None

#### Route Tables
**Private Route Table**:
- `0.0.0.0/0` → NAT Gateway
- `10.10.0.0/16` → Local (VPC)
- VPC Endpoints → AWS PrivateLink

**Public Route Table**:
- `0.0.0.0/0` → Internet Gateway
- `10.10.0.0/16` → Local (VPC)

### 3. Application Layer

#### Container Architecture
```
┌─────────────── Ingress (legacy path: prod) ──┐
│  cloudflared (Cloudflare Tunnel)             │
│      ↓                                         │
│  traefik (Reverse Proxy + SSL)               │
│      ├──→ /v1/* → arkd:7070 (REST)           │
│      ├──→ grpc → arkd:7070 (gRPC)            │
│      └──→ SSE → arkd:7070 (events)           │
└───────────────────────────────────────────────┘

┌─── Ingress (shared ALB path: staging+ since 2026-05) ───┐
│  Internet / Cloudflare proxy                            │
│      ↓ HTTPS (ACM cert: *.staging.arkade.sh)           │
│  ALB (idle 180s, access+conn logs → S3)                │
│      ├─[host + content-type=application/grpc*]→         │
│      │   arkdg-* TG (HTTP/GRPC) → arkd:7070 (gRPC)     │
│      ├─[host + path in arkd_sse_streaming_endpoint_paths]│
│      │   arkds-* TG (HTTP1) → arkd:7070 (SSE)          │
│      └─[host + REST fallthrough]→                       │
│          arkdr-* TG (HTTP1) → arkd:7070 (REST)         │
│  (Grafana TG remains, listener priority 100)            │
└──────────────────────────────────────────────────────────┘

┌─────────────── Core Services ─────────┐
│  arkd (Main Daemon)                    │
│    - REST API: 7070                     │
│    - Admin API: 127.0.0.1:7071         │
│    - Connects to: wallet, redis, dbs   │
│                                         │
│  arkd-wallet (Auto-unlocked)           │
│    - Connects to: nbxplorer, postgres  │
│                                         │
│  kms-unlocker (Automation)             │
│    - Unlocks wallet on startup         │
│    - Backs up seed to Secrets Manager  │
│                                         │
│  nbxplorer (Blockchain Indexer)        │
│    - Connects to: bitcoind, postgres   │
│                                         │
│  bitcoind [PROD ONLY]                  │
│    - Full Bitcoin mainnet node         │
│    - Fast sync via AssumeUTXO          │
└────────────────────────────────────────┘

┌─────────────── Telemetry (separate EC2 + ALB) ─────────────┐
│  App host (sidecars in Ark Compose):                        │
│    otel-agent (0.151.0) + cadvisor (v0.56.2)                │
│        │ OTLP gRPC :4317 (resolved via AWS Cloud Map)       │
│        ▼                                                     │
│  Telemetry EC2 (ASG, t3.medium, IMDSv2):                    │
│    otel-collector → prometheus, loki, jaeger,               │
│    alertmanager, pyroscope                                  │
│    grafana :3000 ◀── ALB (HTTPS, ACM, Google SSO)           │
└──────────────────────────────────────────────────────────────┘
```

**Telemetry architecture (2026-05):**
- App and telemetry are deployed on **separate EC2 instances**. App hosts run only the
  local `otel-agent` and `cadvisor` (bundled in the Ark Docker Compose stack); all
  telemetry storage and UI runs on a dedicated telemetry instance in an Auto Scaling
  Group provisioned by `modules/ark/telemetry.tf` and bootstrapped via
  `modules/ark/ansible/playbook.yml`.
- App ↔ telemetry routing uses **AWS Cloud Map** (`modules/ark/service_discovery.tf`).
  The telemetry instance registers itself on boot; the app instance dials
  `${ARK_TELEMETRY_COLLECTOR_ENDPOINT}` (e.g. `telemetry.ark-staging.internal:4317`).
- A **shared internet-facing ALB** (`modules/ark/alb.tf`) terminates HTTPS with an ACM
  certificate (`alb_certificate_arn`, `ELBSecurityPolicy-TLS13-1-2-2021-06`) and routes
  to Grafana's target group on port 3000 (health check `/api/health`). Grafana auth is
  **Google SSO** (client-id / client-secret stored under
  `${ssm_prefix}/grafana/google/secure/client-secret`).
- App SG → telemetry SG ingress is opened for OTLP gRPC (4317), OTLP HTTP (4318),
  Pyroscope (4040), and Alertmanager (9093). ALB SG → telemetry SG opens Grafana (3000).

**ALB-fronted arkd (2026-05):** the same shared ALB now also fronts arkd via three target
groups in `modules/ark/arkd.tf` — gRPC (`arkdg-*`, `HTTP/GRPC` protocol, listener priority 10),
SSE streaming (`arkds-*`, `HTTP1` if `arkd_http1_support=true`, priority 15), and REST
(`arkdr-*`). Routing combines host header (`arkd_hosts`), `content-type: application/grpc*`
for gRPC, and path patterns (`arkd_sse_streaming_endpoint_paths`) for SSE. ALB
`idle_timeout` raised to 180s so SSE streams survive both arkd's 60s heartbeat and
Cloudflare's 120s edge idle. ALB access + connection logs ship to
`ark-logs-${env}-${account_id}` (lifecycle by `alb_log_retention_days`, default 30,
staging 7). Grafana listener rule was deprioritized to 100 so it remains the fallback.
Staging (since #110): primary host is now `btcstaging.arkade.sh` (A-record → ALB), with
`staging.arkade.sh` retained in `arkd_hosts`; the ALB cert switched to a new
`btcstaging.arkade.sh` ACM cert (SANs `btcstaging.arkade.sh` + `*.btcstaging.arkade.sh`) while
the old `staging.arkade.sh`/`staging-cf.arkade.sh` cert stays as a temporary extra listener cert
(`aws_lb_listener_certificate.tmp`, TODO removal).

**ALB-fronted emulator (2026-07, #109):** the shared ALB also fronts the `emulator` service via
`modules/ark/emulator.tf` — a gRPC target group (`emulg-*`, priority 30) and a REST target group
(`emulr-*`, priority 35) on `emulator_port` (staging `7073`), routed by `emulator_hosts`
(staging `emulator.staging.arkade.sh`, A-record → ALB), with an `app_sg`←`alb_sg` ingress rule
on that port.

### 4. Data Flow Architecture

#### Client Request Flow
```
User Request
  ↓ HTTPS
Cloudflare CDN (DDoS protection)
  ↓ Encrypted Tunnel
cloudflared (EC2 private subnet)
  ↓ HTTP
traefik (TLS termination)
  ↓ HTTP/gRPC
arkd (business logic)
  ↓
arkd-wallet → nbxplorer → bitcoind
  ↓                ↓
PostgreSQL (3x)  Redis
```

#### Telemetry Flow
```
Ark Services → otel-collector → prometheus → grafana
             ↓                          ↓
           loki (logs)             alertmanager → Slack
             ↓
         jaeger (traces)
```

#### Backup Flow
```
kms-unlocker → AWS Secrets Manager (wallet password + seed)
RDS → Automated Snapshots (7-day retention)
EBS → Manual/Automated Snapshots (via AWS Backup)
OpenTofu State → S3 (versioned) + DynamoDB (locking)
```

## Service Architecture

### arkd (Core Service)

**Purpose**: Main Ark protocol daemon handling rounds, VTXOs, and payments

**Ports**:
- `7070`: Public API (REST + gRPC via Traefik)
- `127.0.0.1:7071`: Admin API (SSM access only)

**Dependencies**:
- arkd-wallet (6060)
- Redis (ElastiCache)
- PostgreSQL projection + event (RDS)

**Configuration**:
- Environment via `.env.ark` (generated by user-data)
- Round lifecycle: 120s
- Max participants: 128
- Min participants: 1

### arkd-wallet (Automatic Sidecar)

**Purpose**: Bitcoin wallet operations and UTXO management

**Auto-unlock**: kms-unlocker fetches password and unlocks on startup

**Dependencies**:
- NBXplorer (32838) for UTXO tracking
- PostgreSQL (RDS)

**No manual intervention**: Fully automated lifecycle

### kms-unlocker (Automation Service)

**Purpose**: Automatic wallet unlock and seed backup

**Functions**:
1. Fetch encrypted password from Secrets Manager
2. Decrypt using KMS
3. Create/unlock arkd-wallet
4. Backup seed to Secrets Manager (if configured)
5. Monitor and reconnect if needed

**Security**: Double encryption (KMS + Secrets Manager)

### nbxplorer (Blockchain Indexer)

**Purpose**: Bitcoin blockchain indexing for wallet UTXO tracking

**Database**: Dedicated PostgreSQL instance (highest load)

**Auto-configured**: Connects to bitcoind automatically

**Configuration**:
- Network: mainnet (prod) or regtest
- Bitcoin RPC: bitcoind:8332
- P2P endpoint: bitcoind:8333

### bitcoind (Production Only)

**Purpose**: Full Bitcoin mainnet node

**Fast Sync**: AssumeUTXO snapshot (~20 minutes vs 24-48 hours)

**Storage**: EBS volume at /mnt/data

**Ports**:
- `8333`: P2P network (external via NAT)
- `8332`: RPC (internal only)

### traefik (Reverse Proxy)

**Purpose**: TLS termination, request routing, SSL certificate management

**Features**:
- Automatic Let's Encrypt via DNS-01 (Cloudflare)
- Content-Type based routing (REST vs gRPC)
- Server-Sent Events (SSE) no-buffering
- Dashboard: localhost:8080 (SSM access)

**SSL Certificates**:
- Auto-renewal 30 days before expiry
- Stored in `/letsencrypt/acme.json`
- DNS-01 challenge via Cloudflare API

### cloudflared (Ingress Tunnel)

**Purpose**: Secure ingress without public IPs

**Benefits**:
- DDoS protection at Cloudflare edge
- Zero Trust tunnel authentication
- TLS encryption (mutual)
- No open ports on EC2

**Configuration**: Tunnel token from Cloudflare dashboard

## Multi-Environment Design

### Environment Isolation

**Separation Mechanisms**:
1. **OpenTofu Workspaces**: Separate state per environment
2. **S3 Backends**: `ark-{env}-terraform-state` buckets
3. **AWS Resource Tags**: `Environment: prod|staging|regtest`
4. **Dedicated Resources**: No sharing between environments

### Environment-Specific Configuration

| Aspect | Regtest | Staging | Production |
|--------|---------|---------|------------|
| Bitcoin Node | External (nigiri) | bitcoind mainnet | bitcoind mainnet |
| Root Volume | 60 GB | 60 GB | 120 GB |
| EBS Data Volume | No | Optional | Required (800GB) |
| RDS Size | t3.micro | t3.micro | t3.small / t3.medium |
| RDS Multi-AZ | No (ephemeral_env) | Yes | Yes |
| RDS Backup Retention | None | 7 days | 30 days |
| RDS Performance Insights | 7 days | 7 days | 31 days |
| Redis | t3.micro single | t3.micro Multi-AZ | t3.small Multi-AZ |
| NAT Gateways | per AZ (HA, default) | per AZ (HA, default) | per AZ (HA) |
| Fast Sync | N/A | Yes | Yes |
| Cost/Month | ~$150 | ~$400 | ~$800+ |

## Security Architecture

### Defense in Depth

**Layer 1: Network Security**
- No public IPs on application instances
- Security groups: least-privilege
- VPC endpoints for AWS services
- NAT Gateway for controlled egress

**Layer 2: Access Control**
- SSM Session Manager only (no SSH)
- Google Workspace SAML federation per account (`ArkProd*` / `ArkDev*` roles); 15-min Lambda syncs GWS group → `Amazon.Role` attribute (`modules/ark-gws-sync`)
- Four-tier role model with guardrail policies (`modules/ark-iam-roles`): SuperAdministrator (no guardrails), Administrator (`AdminRestrictions`), Developer (`AdminRestrictions` + `DeveloperRestrictions` + `SSMPortForwarding`), ReadOnly (`AdminRestrictions` + `DeveloperRestrictions`)
- Guardrails deny: Secrets Manager value access, `*secure*` SSM params, CloudTrail/GuardDuty/Config/SecurityHub disruption, KMS destructive ops, Terraform state bucket / lock table mutation, SuperAdmin role assumption, S3 public-access toggles, SSM **shell** sessions (port forwarding still permitted)
- Developer/ReadOnly additionally cannot read `/aws/ssm/sessions/*` or `/*secure*` log groups, write Terraform state, or assume the Administrator role
- SSM access tiers — shell: SuperAdmin only; port forward: SuperAdmin + Admin + Developer; run-command: SuperAdmin + Admin
- ABAC enabled via `sts:TagSession` in the SAML trust policy; account ID derived from `data.aws_caller_identity` (no hardcoded account variable)
- CloudWatch audit logging (30-day retention)
- Session encryption via TLS

**Layer 3: Application Security**
- Cloudflared tunnel authentication
- Traefik TLS-only (no port 80)
- Basic auth middleware (optional)
- Localhost-only admin services

**Layer 4: Data Security**
- KMS encryption for secrets
- S3 encryption for state files
- RDS encryption at rest
- EBS encryption

### No-SSH Design

**Benefits**:
- No SSH keys to manage
- No port 22 exposure
- No bastion host
- Full audit trail
- IAM-based access control

**Access Methods**:
1. **Interactive Session**: `aws ssm start-session`
2. **Port Forwarding**: For EC2-local services (7071, 8080, 3333, 9090, 9093, 3100, 16686, 4040)
3. **Remote Host Port Forwarding**: For RDS/Redis through EC2 (5432, 6379)
4. **Remote Commands**: Via `Ark-DeployService` SSM document

## State Management Architecture

### S3 Backend with Versioning

**Components**:
1. **S3 Bucket** (per environment): `ark-{env}-terraform-state`
   - Versioning enabled
   - KMS encryption
   - Public access blocked

2. **DynamoDB Table** (shared): `terraform-state-lock`
   - State locking
   - Pay-per-request billing
   - Prevents concurrent modifications

3. **KMS Key** (shared): `alias/terraform-state-key`
   - Encrypts all state files
   - CloudTrail audit logging

**Benefits**:
- Zero data loss (every change preserved)
- Point-in-time recovery
- Team collaboration (shared state)
- Automatic backups (S3 versioning)

## Monitoring & Observability

### Metrics Collection
- **Prometheus**: Time-series metrics storage
- **otel-collector**: OpenTelemetry metrics ingestion
- **cadvisor**: Container resource metrics
- **CloudWatch**: EC2, RDS, Redis metrics

### Visualization
- **Grafana** (localhost:3333): Custom dashboards
  - Host metrics (CPU, memory, disk)
  - Container metrics (resource usage)
  - Ark metrics (rounds, VTXOs, transactions)
  - Bitcoin metrics (sync status, peer count)

### Logging
- **CloudWatch Logs (primary)**: All container stdout/stderr is shipped via the Docker
  `awslogs` driver to log group `/ark/${ARK_ENVIRONMENT}` (14-day retention) — one stream
  per service. ⚠️ `docker logs` no longer prints output on the host; query CloudWatch instead.
- **Per-service log groups (since #109)**: selected services get a dedicated Terraform-managed
  log group + retention — first is `/ark/${env}/emulator` (`modules/ark/emulator.tf`).
- **Loki**: Log aggregation for telemetry stack (Grafana Explore)
- **CloudWatch Logs**: SSM session logs (`/aws/ssm/sessions/{env}`)

### Tracing
- **Jaeger**: Distributed tracing for request flows

### Alerting
- **Alertmanager**: Alert routing and grouping (telemetry stack)
- **Slack Integration**: Real-time notifications to channels
- **AWS-native alerting spine (since #109, `modules/alerting/`)**: CloudWatch alarms publish to
  an account-level `ark-alerts-${env}` SNS topic, which an **AWS Chatbot (Amazon Q)** Slack
  channel configuration renders into Slack. Chatbot's control plane is **us-east-1 only** (module
  takes an `aws.us_east_1` provider alias; SNS topic subscribed cross-region). A read-only
  `ark-chatbot-${env}` IAM role backs alarm click-through; `guardrail_policy_arns` (default
  `ReadOnlyAccess`) caps Slack-run commands. Wired on staging (`aws/dev-438465126741`); the
  emulator error alarm is the first producer.

## Cost Optimization

### Fixed Costs
- NAT Gateway: ~$32/mo
- VPC Endpoints: ~$50/mo (7 × $0.01/hr × 730hr)
- CloudWatch Logs: ~$5/mo

### Variable Costs
- EC2: Based on instance type (~$60-500/mo)
- RDS: Based on instance class (~$30-350/mo)
- Redis: Based on node type (~$15-180/mo)
- EBS: Based on size (~$64/TB/mo for gp3)
- Data transfer: ~$0.09/GB out (after 100GB)

### Optimization Strategies
1. **VPC Endpoints**: Reduce NAT data transfer for AWS services
2. **Reserved Instances**: 30-60% savings for 1-3 year commitments
3. **Right-sizing**: Monitor CloudWatch metrics, adjust instance sizes
4. **EBS Optimization**: Use gp3 instead of io2 unless high IOPS needed

## Future Extensibility

### Horizontal Scaling
- Multiple EC2 instances with Application Load Balancer
- RDS read replicas for projection database
- Redis cluster mode for high availability

### Multi-Region
- Cross-region S3 replication for state files
- RDS cross-region read replicas
- Route53 for DNS failover

### Alternative Orchestrators
- **ECS**: For managed container orchestration
- **Nomad**: For multi-cloud deployments
- **Kubernetes**: For large-scale, complex workloads

## References

For detailed information:
- **AWS Resources**: See `aws-infrastructure.md`
- **Networking**: See `networking.md`
- **Security**: See `security.md`
- **OpenTofu Details**: See `opentofu-reference.md`

Source: `${ARK_INFRA_REPO}/docker-compose/docs/01-architecture.md`
