---
project_id: ark-infra
version: 1.7.8
last_sync_commit: 0a02408c18e0dcca09708544fc8b85ec9de18c7b
last_sync_date: 2026-07-07T00:00:00Z
repository_path: ${ARK_INFRA_REPO}
documentation_path: ${ARKADIAN_DOCS}/projects/ark-infra
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/getting-started.md"]
  qa:         ["testing/getting-started.md", "testing/validation.md"]
  dev:        ["sop/deployment-workflow.md", "system/opentofu-reference.md"]
  monitoring: ["testing/operations.md", "sop/monitoring-guide.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  deploy: ["testing/deployment-guide.md", "sop/deployment-workflow.md"]
  aws: ["system/aws-infrastructure.md", "system/networking.md"]
  security: ["system/security.md", "sop/secrets-management.md"]
  iam: ["system/security.md"]
  sso: ["system/security.md"]
  alb: ["system/architecture.md", "system/aws-infrastructure.md"]
  dbdump: ["testing/operations.md"]
scripts:
  tofu_init: "cd docker-compose/opentofu && tofu init"
  tofu_plan: "make tofu-plan ENV=<env>"
  tofu_apply: "make tofu-apply ENV=<env>"
  compose_up: "make compose-up-attach ENV=<env>"
  ssm_session: "make ssm-session ENV=<env>"
  alb_spot_check: "scripts/alb-spot-check.sh <host>"
  ssm_dump_db: "aws ssm send-command --document-name Ark-DumpDatabase-<env> --instance-ids <i-...> --parameters '{\"DatabaseName\":[\"projection|event|nbxplorer\"]}'"
---

# Ark Infra — Project Index

**ark-infra** is the single source of truth for all Ark infrastructure deployments across environments (regtest, staging, production) using OpenTofu and Docker Compose on AWS.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/ark-infra/system/` — System Architecture & Infrastructure
Core infrastructure documentation:

- **${ARKADIAN_DIR}/docs/projects/ark-infra/system/project_overview.md** — — What ark-infra is, multi-environment strategy, services
- **${ARKADIAN_DIR}/docs/projects/ark-infra/system/architecture.md** — — AWS layers, service architecture, data flow, no-SSH design
- **${ARKADIAN_DIR}/docs/projects/ark-infra/system/aws-infrastructure.md** — — VPC, EC2, RDS, ElastiCache, ECR, CloudWatch
- **${ARKADIAN_DIR}/docs/projects/ark-infra/system/networking.md** — — VPC endpoints, security groups, ingress/egress flow
- **${ARKADIAN_DIR}/docs/projects/ark-infra/system/security.md** — — SSM access, secrets management, network isolation
- **${ARKADIAN_DIR}/docs/projects/ark-infra/system/opentofu-reference.md** — — Variables, outputs, state management

### `${ARKADIAN_DIR}/docs/projects/ark-infra/testing/` — Deployment & Operations
Practical guides for deployment and daily operations:

- **${ARKADIAN_DIR}/docs/projects/ark-infra/testing/getting-started.md** — — 5-minute regtest deployment
- **${ARKADIAN_DIR}/docs/projects/ark-infra/testing/deployment-guide.md** — — Complete deployment for regtest, staging, production
- **${ARKADIAN_DIR}/docs/projects/ark-infra/testing/validation.md** — — Post-deployment validation checklists
- **${ARKADIAN_DIR}/docs/projects/ark-infra/testing/operations.md** — — Daily operations, service management, monitoring
- **${ARKADIAN_DIR}/docs/projects/ark-infra/testing/troubleshooting.md** — — Common issues and solutions

### `${ARKADIAN_DIR}/docs/projects/ark-infra/sop/` — Standard Operating Procedures
Step-by-step procedures for infrastructure tasks:

- **${ARKADIAN_DIR}/docs/projects/ark-infra/sop/deployment-workflow.md** — — End-to-end deployment process
- **${ARKADIAN_DIR}/docs/projects/ark-infra/sop/secrets-management.md** — — Managing secrets with AWS Secrets Manager/KMS
- **${ARKADIAN_DIR}/docs/projects/ark-infra/sop/monitoring-guide.md** — — Monitoring stack, metrics, alerts
- **${ARKADIAN_DIR}/docs/projects/ark-infra/sop/disaster-recovery.md** — — Backup strategies, recovery procedures
- **${ARKADIAN_DIR}/docs/projects/ark-infra/sop/scaling-guide.md** — — Sizing recommendations and scaling procedures

### `${ARKADIAN_DIR}/docs/projects/ark-infra/tasks/` — Infrastructure Plans & Changes
Infrastructure changes, migrations, and improvements.

### `${ARKADIAN_DIR}/docs/projects/arkd/change-log/` — Recent Changes
Curated summaries of infrastructure changes.

### `${ARKADIAN_DIR}/docs/projects/arkd/pr-report/` — Pull Request Summaries
Analysis and summaries of pull requests.

---

## Key Concepts

### Multi-Environment Design
**Three isolated environments using OpenTofu workspaces:**
- **regtest**: Development/testing with Nigiri Bitcoin network
- **staging**: Pre-production with real Bitcoin node
- **prod**: Production with full Bitcoin mainnet node and backups

### Infrastructure as Code
**OpenTofu (Terraform fork) provisions:**
- VPC with public/private subnets
- EC2 instance with Docker Compose
- RDS PostgreSQL (3 databases)
- ElastiCache Redis
- ECR repositories
- VPC endpoints for private AWS access
- CloudWatch monitoring
- IAM roles and security groups

### Docker Compose Orchestration
**Application services on EC2:**
- **Ingress**: cloudflared (tunnel) → traefik (reverse proxy)
- **Core**: arkd, arkd-wallet, kms-unlocker, nbxplorer, bitcoind (prod only)
- **Telemetry**: otel-collector, prometheus, grafana, loki, jaeger, alertmanager

### No-SSH Architecture
**All access via AWS Systems Manager (SSM):**
- No port 22 exposure
- No SSH key management
- Full session audit trail
- Port forwarding for localhost-only services

### Automatic Operations
**Services that run without manual intervention:**
- **kms-unlocker**: Fetches password from Secrets Manager, unlocks wallet, backs up seed
- **nbxplorer**: Indexes Bitcoin blockchain automatically
- **traefik** (v3.6.14): Handles SSL certificates with Let's Encrypt; JSON logs at INFO with access logs enabled
- **cloudflared**: Maintains secure tunnel to Cloudflare; metrics on `:20241`

### Centralized Logging (CloudWatch)
All container stdout/stderr is shipped directly to CloudWatch via the Docker `awslogs` driver:
- Log group: `/ark/${ARK_ENVIRONMENT}` (14-day retention, created by OpenTofu)
- Per-service streams: `traefik`, `arkd`, `arkd-wallet`, `kms-unlocker`, `nbxplorer`, `bitcoind`, `cloudflared`, `threat-monitor`, `ark-metrics`
- ⚠️ `docker logs` no longer works on the host — use the CloudWatch UI / `aws logs tail`
- Manual deploys must export `ARK_ENVIRONMENT` in `.env.ark`

---

## Quick Reference

### Environment Setup
```bash
# Prerequisites
# 1. OpenTofu installed (or `direnv allow` to enter the Nix devshell from flake.nix)
# 2. AWS credentials configured (Google SSO via AWS app tile, role picker)
# 3. Required secrets available

# Initialize OpenTofu
cd docker-compose/opentofu
tofu init

# Unified environment setup (new recommended approach)
make use ENV=regtest PROFILE=your-aws-profile

# Or manual workspace management:
# Create workspace
make tofu-workspace-new NAME=regtest

# Switch workspace
make tofu-workspace-select NAME=regtest
```

### Deployment Commands
```bash
# Plan infrastructure
make tofu-plan ENV=regtest

# Apply infrastructure (interactive)
make tofu-apply ENV=regtest

# Deploy with secrets
make tofu-apply ENV=prod \
  -var="slack_api_url=..." \
  -var="cloudflare_tunnel_token=..." \
  -var="kms_unlocker_secret=..."

# Start services
make compose-up-attach ENV=regtest

# Check service status
make compose-ps ENV=regtest
```

### Access & Monitoring
```bash
# SSM session (interactive shell)
make ssm-session ENV=prod

# Port forwarding (Grafana)
make ssm-port-forward ENV=prod LOCAL=3333 REMOTE=3333

# View logs
make compose-logs ENV=prod SERVICE=arkd

# Check arkd status
make arkd-wallet-balance ENV=prod
```

### Operational SSM Commands
```bash
# Dump a PostgreSQL database to s3://ark-tmp-${env}/db-dumps/ (7-day expiry)
aws ssm send-command --document-name Ark-DumpDatabase-${ENV} \
  --instance-ids $INSTANCE_ID \
  --parameters '{"DatabaseName":["projection"]}'   # or "event" | "nbxplorer"

# With custom filename
aws ssm send-command --document-name Ark-DumpDatabase-${ENV} \
  --instance-ids $INSTANCE_ID \
  --parameters '{"DatabaseName":["event"],"DumpFileName":["event-pre-migration.dump"]}'
```

### Maintenance Commands
```bash
# List EC2 snapshots
make list-snapshots ENV=prod

# Backup/restore OpenTofu state
make backup-state ENV=prod
make restore-state ENV=prod FILE=backup.tfstate

# Update services
make compose-pull ENV=prod
make compose-up-recreate ENV=prod

# Taint resource for recreation
make taint ENV=prod RESOURCE=aws_instance.main

# Clean local state (for collaborative work)
make clean-local-state ENV=prod
```

---

## Deployed Services

### Core Services
- **arkd** (7070, `v0.9.12` since #106) — Main Ark daemon (REST + gRPC API)
- **arkd-wallet** (6060, `v0.9.12` since #106) — Wallet sidecar (auto-unlocked)
- **kms-unlocker** — Automatic wallet unlock with AWS KMS
- **nbxplorer** (prod `2.6.8`, regtest `2.6.7-curl`) — Bitcoin blockchain indexer (automatic). **Prod (since #97)** runs the stock `nicolasdorier/nbxplorer:2.6.8` image directly — the `compose/Dockerfile.nbxplorer` curl-override hack was removed and the file deleted. **Regtest** still builds `ark-infra/nbxplorer:2.6.7-curl` from `Dockerfile.nbxplorer` (FROM `nicolasdorier/nbxplorer:2.6.7` + `apt-get install curl`). JSON-RPC health check (`POST /v1/cryptos/BTC/rpc` with `getblockchaininfo`, probing for `"result"`, 60 retries × 5s); `arkd-wallet` `depends_on: { nbxplorer: { condition: service_healthy } }` (prod + regtest)
- **bitcoind** (8333, 8332) — Full Bitcoin node [prod only]

### Administration
- **ark-admin-app** — Go-based web application for managing AWS Ark infrastructure via SSM commands and port forwarding. Provides web UI for service deployment, port forwarding management, infrastructure overview, and health monitoring.

### Security Monitoring
- **threat-monitor** (`ghcr.io/arklabshq/threat-monitor:v0.2.5`, prod only, since #92) — Watches on-chain and mempool activity for threats and alerts to Slack. Sources: `nbxplorer` on-chain provider (`THREAT_MONITOR_NBXPLORER_URL=http://nbxplorer:32838`, `THREAT_MONITOR_ONCHAIN_PROVIDER=nbxplorer`), Ark indexer (`https://${ARKD_DOMAIN}`), Ark explorer (`https://arkade.space`), and mempool.space explorer. Tuning: `THREAT_MONITOR_MEMPOOL_SCAN_INTERVAL=300s`, `THREAT_MONITOR_BLOCK_RECONCILE_INTERVAL=0s` (disabled), `THREAT_MONITOR_START_HEIGHT=952900`. State persisted to a named `threat-monitor` volume (`/data/threat-monitor.badger`); `traefik.enable=false`; logs to CloudWatch stream `threat-monitor`. New required env var `THREAT_MONITOR_SLACK_WEBHOOK_URL`. `depends_on: { nbxplorer }` is commented out to reduce the risk of NBX restarts.

### Metrics
- **ark-metrics** (`ghcr.io/arklabshq/ark-metrics:v0.2.0`, prod only, since #98; bumped `v0.1.0` → `v0.2.0` in #106) — Collects Ark protocol metrics and exports them to the telemetry stack over OTLP. `depends_on: [arkd, otel-agent]`; exports to `otel-agent` (`ARK_METRICS_OTLP_ENDPOINT=http://otel-agent:4318`, `ARK_METRICS_OTLP_INSECURE=true`). Reads the arkd projection DB (`ARK_METRICS_DATABASE_URL=${ARKD_PG_DB_URL}`) and Ark info API (`ARK_METRICS_ARK_INFO_URL=https://${ARKD_DOMAIN}`); `ARK_METRICS_LOG_LEVEL=debug`. **New in #106:** scrapes arkd gRPC channelz introspection via `ARK_METRICS_CHANNELZ_ENDPOINT=arkd:7071` (admin port) and `ARK_METRICS_CHANNELZ_MAIN_PORT=7070`. `traefik.enable=false`; logs to CloudWatch stream `ark-metrics`.

### Ingress & Routing
- **cloudflared** — Cloudflare Tunnel for secure ingress (legacy path; still used on prod)
- **traefik** (443, 8080*) — Reverse proxy + SSL termination
- **Shared ALB → arkd** (staging + prod, since 2026-05) — `modules/ark/arkd.tf` adds three target groups on port 7070 fronted by the same ALB that hosts Grafana:
  - **arkdg-*** (`HTTP/GRPC`, health `/grpc.health.v1.Health/Check` matcher `0`) — listener rule priority 10, host header in `arkd_hosts`, `content-type: application/grpc*`
  - **arkds-*** (`HTTP1` if `arkd_http1_support=true` else `HTTP2`, health `/healthz`) — listener rule priority 15, host header + path in `arkd_sse_streaming_endpoint_paths` (`/v1/batch/events`, `/v1/txs`, `/v1/indexer/script/subscription/*`)
  - **arkdr-*** — REST catch-all on the same host
  - ALB `idle_timeout = 180s` (exceeds arkd 60s SSE heartbeat + Cloudflare 120s edge)
  - Access + connection logs to `ark-logs-${env}-${account_id}` S3 bucket (lifecycle by `alb_log_retention_days`, default 30 days, staging 7)
  - Spot-check: `scripts/alb-spot-check.sh <host>` exercises gRPC, REST `/v1/info`, and SSE streams over HTTP/1.1 and HTTP/2
  - **Endpoints** — staging: `staging.arkade.sh` / `staging-cf.arkade.sh`, Grafana `telemetry.staging.arkade.sh`. Prod (live since 2026-05-26, `apps/ark/prod/`): `prod.arkade.sh` / `prod-cf.arkade.sh`, Grafana `telemetry.prod.arkade.sh`; app instance `i-0f3d436aad5dbf55e`, `alb_log_retention_days = 30`, ACM cert SANs `*.prod.arkade.sh` + `prod-cf.arkade.sh`

### Data Stores
- **PostgreSQL** (RDS) — projection, event, nbxplorer databases
- **Redis** (ElastiCache) — Caching and queues

### Telemetry Stack

> **Architecture note (2026-05):** the telemetry stack now runs on a **separate EC2 instance** (Auto Scaling Group, default `t3.medium`) provisioned by `modules/ark/`. Grafana is exposed publicly via a **shared ALB** (HTTPS, ACM cert) using Google SSO. App instances run only `otel-agent` + `cadvisor` (bundled in the Ark Compose stack) and forward OTLP to the telemetry instance via AWS Cloud Map service discovery. New required env var on app hosts: `ARK_TELEMETRY_COLLECTOR_ENDPOINT` (e.g. `telemetry.ark-staging.internal:4317`).
>
> **Persistent state update (2026-06, #80):** the telemetry ASG is now **pinned to a single subnet/AZ** (new required `telemetry_subnet_id`) and mounts a **re-attachable encrypted EBS data volume** (`aws_ebs_volume.telemetry_data`, `gp3`, tag `ark-telemetry-data-${env}`) at `/dev/xvdb` → `/mnt/data`, with Docker's `data-root` relocated to `/mnt/data/docker`. Prometheus / Loki / Grafana state therefore survives instance recycles, trading multi-AZ HA for stateful telemetry. Staging: t3.small + 20 GB data, `subnet-0929002f609855e83` (eu-central-1b). Prod: t3.large + 30 GB data, `subnet-0aa4bfb28c983f5be` (eu-central-1b). Bootstrap scripts renamed: `scripts/user-data.sh` → `scripts/user-data-telemetry.sh`, `ansible/playbook.yml` → `ansible/telemetry-playbook.yml`; Ansible requirements bumped to `amazon.aws >= 10.3.1` plus `community.general`, `ansible.posix`. New vars: `telemetry_data_volume_size` (default 20), `telemetry_root_volume_size` (default 20), `telemetry_subnet_id` (required).
>
> **Resource profiles + CloudWatch Agent (2026-06, #88):** new required-but-defaulted `telemetry_resource_profile` variable (`small` | `large`, default `large`, validated) layers a `docker-compose.resources.{profile}.yaml` override on top of `docker-compose.otel.yaml` in the `ark-telemetry.service` systemd unit (both `ExecStart` and `ExecStop`), so per-container memory/CPU limits track instance size. Staging set to `small` (`apps/ark/staging/ark.tf`), prod set to `large` (`apps/ark/prod/ark.tf`). The telemetry instance now also installs the **Amazon CloudWatch Agent** (latest .deb from the AWS bucket — only `/latest/` is published) and ships `cpu` (idle/system/user, `totalcpu = true`), `mem` (used %), and `disk` (used %, scoped to `/` and `/mnt/data`, ignoring `tmpfs/devtmpfs/overlay/squashfs`) to CloudWatch, dimensioned by `InstanceId`. IAM gains `arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy` attached to `ec2_telemetry_role`. The Grafana container now explicitly enables brute-force login protection (`GF_AUTH_DISABLE_BRUTE_FORCE_LOGIN_PROTECTION=false`, `…_BY_IP=false`).

**Telemetry instance (separate EC2 + ALB):**
- **otel-collector** (4317/4318) — OTLP ingress from app instances
- **prometheus** (9090) — Metrics storage
- **grafana** (3000, via ALB) — Dashboards (Google SSO)
- **loki** — Log aggregation
- **jaeger** (16686) — Distributed tracing
- **alertmanager** (9093) — Alert routing to Slack
- **pyroscope** (4040) — Continuous profiling

**App instance (bundled with Ark Compose):**
- **otel-agent** (`otel/opentelemetry-collector-contrib:0.151.0`) — Local OTLP receiver + host metrics; exports to central collector (gRPC keepalive `time=30s`, `timeout=5s`, `permit_without_stream=true` since #81 to avoid idle-NAT drops)
- **cadvisor** (`v0.56.2`) — Container metrics (scraped by local otel-agent)

---

## AWS Infrastructure

### Networking
- **VPC**: 10.10.0.0/16 spanning 3 AZs (eu-central-1a/1b/1c)
- **Public Subnets**: 10.10.1.0/24, 10.10.2.0/24, 10.10.3.0/24 (NAT Gateways, VPC endpoints)
- **Private Subnets**: 10.10.101.0/24, 10.10.102.0/24, 10.10.103.0/24 (EC2, RDS, Redis)
- **NAT Topology**: `vpc_nat_per_az` feature flag — `true` = NAT per AZ (HA, default), `false` = single NAT in AZ-a (saves ~$64/mo for dev)
- **VPC Endpoints**: SSM, ECR, CloudWatch, S3 (no NAT charges) — span all 3 AZs

### Security Groups
- **app_sg**: EC2 instance
- **rds_sg**: PostgreSQL instances
- **redis_sg**: ElastiCache
- **vpc_endpoints_sg**: VPC endpoint access

### IAM Roles
- **EC2 Instance Role**: SSM, ECR, Secrets Manager, CloudWatch
- **ECS Task Execution Role**: For future ECS support

### Human Access — Google Workspace SSO (per AWS account)
Defined in `aws/{prod-982590065524,dev-438465126741}/`, built from reusable modules:
- `modules/ark-iam-roles` — four SAML-federated roles per account (`ArkProd*` / `ArkDev*`): `SuperAdministrator`, `Administrator`, `Developer`, `ReadOnly` with layered guardrails (`AdminRestrictions`, `DeveloperRestrictions`, `SSMPortForwarding`)
- `modules/ark-gws-sync` — Lambda (`secure-gws-aws-sync-{env}`) running every 15 minutes that maps Google Workspace group membership to the `Amazon.Role` attribute, multi-account aware (preserves attributes from sibling accounts), clears the attribute for users orphaned from all mapped groups
- Login flow: https://accounts.google.com/ → AWS app tile → role picker
- SSM access tiers — shell: SuperAdmin only; port forward: SuperAdmin/Admin/Developer; run-command: SuperAdmin/Admin
- Sensitive log groups (`/*secure*`, `/aws/ssm/sessions/*`) are denied to Developer and ReadOnly
- Terraform state bucket and lock table protected against admin mutation and developer/read-only access

---

## Environment Comparison

| Aspect | Regtest | Staging | Production |
|--------|---------|---------|------------|
| **Bitcoin Node** | External (Nigiri) | bitcoind | bitcoind |
| **EBS Root Volume** | 60 GB (default) | 60 GB (default) | 120 GB (`root_volume_size=120`) |
| **Additional EBS** | None | Optional | Required |
| **Instance Type** | t3.small | t3.medium | t3.xlarge |
| **RDS** | t3.micro | t3.micro | db.t3.small / db.t3.medium |
| **RDS Multi-AZ** | No (ephemeral_env) | Yes | Yes |
| **RDS Backups** | None | 7 days | 30 days |
| **RDS Performance Insights** | 7 days | 7 days | 31 days |
| **Redis** | t3.micro (single node) | t3.micro (Multi-AZ pair) | t3.small (Multi-AZ pair) |
| **Fast Sync** | N/A | AssumeUTXO | AssumeUTXO |
| **Monitoring** | Basic | Full | Full + Alerts |

---

## Configuration Files

### OpenTofu
- `opentofu/main.tf` — Main infrastructure definition
- `opentofu/variables.tf` — Variable definitions
- `opentofu/outputs.tf` — Output values
- `opentofu/ecr.tf` — ECR repositories
- `opentofu/cloudwatch.tf` — Monitoring setup

### Environments
- `environments/regtest.tfvars` — Regtest configuration
- `environments/prod.tfvars` — Production template (secrets via -var flags)

### Docker Compose
- `compose/docker-compose.ark.regtest.yaml` — Regtest services
- `compose/docker-compose.ark.prod.yaml` — Production services

### Scripts
- `scripts/user-data-prod.sh` — EC2 initialization for production
- `scripts/user-data-regtest.sh` — EC2 initialization for regtest
- `scripts/migrate-vpc-state.sh` — Migrate VPC resources from `docker-compose/opentofu` state into the per-account `module.vpc_{staging|prod}` (`--dry-run` supported; backs up both states, imports into target, prints `state rm` commands for the source — see `modules/vpc/README.md`)

### Modules
- `modules/vpc/` — Shared VPC module (since #86, 2026-06): VPC, public/private subnets across 3 AZs (keyed by AZ suffix), IGW, NAT gateway(s) controlled by `nat_per_az` (default `true`, HA), private route tables, egress-only `vpc_endpoints_sg` (callers add their own ingress rules), six interface VPC endpoints + S3 gateway endpoint. Subnets are tagged `Tier = "public"`/`"private"` for cleaner data-source lookups. Not yet consumed by `apps/ark/*` — invocation in `docker-compose/opentofu/main.tf` is commented out pending migration.
- `modules/foundation/` — Foundation module (since #99, 2026-07): **long-lived** resources that survive app-stack destroy/recreate cycles. Creates the master KMS key (`alias/ark-master-{env}`, multi-region symmetric, not shared cross-account), the data KMS key (`alias/ark-data-{env}`, multi-region symmetric, optionally shared cross-account via `data_key_cross_account_ids`), and the arkd wallet signer-key Secrets Manager secret (`ark/${env}/arkd-wallet-signer-key`, encrypted with the master key). Both keys have rotation enabled; the module creates **containers only** — secret/SSM values are set outside Terraform to keep them out of state. Vars: `env`, `kms_key_deletion_window_in_days` (default 30, 7–30), `data_key_cross_account_ids` (default `[]`). Wired into `aws/dev-438465126741/main.tf` (env=`staging`, deletion window 7, data key shared with prod account `982590065524`).
- `modules/ark/` — Shared Ark app + telemetry module (ALB, arkd target groups, telemetry ASG, Cloud Map, Ansible provisioning, S3 buckets)
- `modules/ark-iam-roles/` — SAML-federated IAM roles + guardrail policies (per account)
- `modules/ark-gws-sync/` — Lambda syncing Google Workspace group membership to AWS role attribute

### Base AMI (Packer + Ansible) — since #102, 2026-07
Reusable **base image** that child AMIs (and live hosts) build from, in top-level `packer/` + `ansible/`:
- **`packer/base.pkr.hcl`** — `amazon-ebs` source (arm64) + `ansible-local` provisioner + manifest post-processor. Builds `ark-base-ubuntu-26.04-arm64-<timestamp>` on Ubuntu 26.04 LTS, **arm64 / Graviton only**, in `eu-central-1` (`t4g.small`, gp3 root). Deliberately minimal: no Docker, no `ufw`/`fail2ban` (SSM-only access, no SSH ingress). Vars: `region`, `instance_type`, `root_volume_size` (20), `kms_key_id`, `git_sha`.
- **`ansible/site.yml`** — connection-agnostic (`hosts: all`); the same roles run at Packer build time and idempotently on a live host via `sudo ansible-playbook -c local -i localhost, /opt/ark/ansible/site.yml`. Roles: `baseline`, `awscli` (installs the AWS CLI, verifying the installer signature against the committed PGP key `roles/awscli/files/aws-cli.gpg`), `ssm_agent`, `cloudwatch_agent`, `ansible_runtime` (persists the playbook to `/opt/ark/ansible`), and build-only `deprovision` (gated on `packer_build_name`).
- `ansible/requirements.yml` pulls `community.general >= 8.0.0` (snap module); child images add their own collections. Base ships a minimal CloudWatch host-metrics config (`00-baseline.json`, merged) that children override via file drop or the `cloudwatch_agent_fetch_from_ssm` SSM path.
- Follow-up (not yet done): wire Terraform to consume the AMI via `data "aws_ami"` (replacing the hardcoded `ami-…` ids).

---

## Security Features

### No Public Access
- Private subnets for all application resources
- No SSH (port 22) access
- Admin APIs bound to localhost only
- Access via SSM Session Manager with audit logging

### Secrets Management
- Wallet password: AWS Secrets Manager (KMS encrypted)
- Wallet seed: Auto-backed up to Secrets Manager
- Environment secrets: Passed via -var flags (never committed)
- SSL certificates: Automatic via Let's Encrypt

### Network Isolation
- VPC endpoints for AWS service access (no internet routing)
- NAT Gateway only for required external traffic
- Security groups with least-privilege rules
- CloudWatch audit logs for all SSM sessions

---

## Bitcoin Fast Sync Options

### Option A: Pre-synced EBS Volume
Attach existing synced volume (fastest, same AZ).

### Option B: AssumeUTXO Snapshot
Download UTXO snapshot for fast sync (~20 min vs days).
```bash
make tofu-apply ENV=prod -var="utxo_set_url=https://..."
```

### Option C: EBS Snapshot Restore
Restore from point-in-time snapshot (portable across AZs/regions).

---

## Documentation Size Guidelines

To keep context lean for Claude agents:

- **usage/how-to**: ≤ 100-120 lines
- **architecture**: 400-700 words
- **deployment guide**: 600-1000 words
- **SOP procedures**: ≤ 120 lines

Keep files focused and cross-reference when needed.
