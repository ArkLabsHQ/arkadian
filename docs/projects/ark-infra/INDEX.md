---
project_id: ark-infra
version: 1.10.0
last_sync_commit: 232a5c553378f4361830c10e1afd09e19992e33b
last_sync_date: 2026-07-17T00:00:00Z
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
- **Per-service log groups (new since #109):** a new pattern gives selected services their **own** log group for better segmentation/alerting — first adopted by `emulator` (`/ark/${env}/emulator`, provisioned in `modules/ark/emulator.tf` with `log_retention_days`, error metric filter + CloudWatch alarm). Expect more services to migrate off the shared group over time
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
- **arkd** (7070, `v0.9.14` since #114; `v0.9.13` #107) — Main Ark daemon (REST + gRPC API)
- **arkd-wallet** (6060, `v0.9.14` since #114; `v0.9.13` #107) — Wallet sidecar (auto-unlocked)
- **kms-unlocker** — Automatic wallet unlock with AWS KMS
- **nbxplorer** (prod/staging-ECS `2.6.8`, regtest `2.6.7-curl`) — Bitcoin blockchain indexer (automatic). **Prod (since #97)** runs the stock `nicolasdorier/nbxplorer:2.6.8` image directly as a Compose container — the `compose/Dockerfile.nbxplorer` curl-override hack was removed and the file deleted. **Regtest** still builds `ark-infra/nbxplorer:2.6.7-curl` from `Dockerfile.nbxplorer` (FROM `nicolasdorier/nbxplorer:2.6.7` + `apt-get install curl`). JSON-RPC health check (`POST /v1/cryptos/BTC/rpc` with `getblockchaininfo`, probing for `"result"`, 60 retries × 5s); `arkd-wallet` `depends_on: { nbxplorer: { condition: service_healthy } }` (prod + regtest). **Staging (since #111)** now runs NBXplorer as an **ECS service** on the new `ark-${env}` cluster instead of a Compose container — see `modules/ark/ecs.tf` + `nbxplorer.tf` below; it points at the standalone bitcoind pet, uses reused RDS Postgres (stateless task, `NBXPLORER_NOAUTH=1`), a `curl /health` container health check, and Cloud Map service discovery
- **bitcoind** (8333, 8332) — Full Bitcoin node [prod only]
- **emulator** (`ghcr.io/arkade-os/emulator:v0.0.4`, prod only, since #109) — Emulator daemon with multiplexed REST + gRPC on `:7073`. `depends_on: arkd`, `EMULATOR_ARKD_URL=http://arkd:7070`. Fronted by the shared ALB (`modules/ark/emulator.tf`) via a gRPC target group (`emulg-*`, priority 30, `/grpc.health.v1.Health/Check`) and a REST target group (`emulr-*`, priority 35, `/healthz`), routed by `emulator_hosts` with an ALB→app ingress rule on the emulator port. Ships logs to a **dedicated** CloudWatch log group `/ark/${env}/emulator` (stream `ark-app`, `awslogs` non-blocking, multiline pattern for Go panics/`time=` lines) — the first use of the per-service-log-group pattern. Error alerting: metric filter `EmulatorErrorCount` (namespace `Ark/${title(env)}`, matches `level=error`/`level=fatal`/`panic:`) drives the `EmulatorErrors-${env}` alarm, which publishes to the account-level SNS alerting topic when `alerts_sns_topic_arn` is set (empty = alarm created for console visibility but notifies nobody). Staging: `emulator_hosts = ["emulator.staging.arkade.sh"]` (Route53 A-alias to ALB), `emulator_port = 7073`

### Administration
- **ark-admin-app** — Go-based web application for managing AWS Ark infrastructure via SSM commands and port forwarding. Provides web UI for service deployment, port forwarding management, infrastructure overview, and health monitoring.

### Security Monitoring
- **threat-monitor** (`ghcr.io/arklabshq/threat-monitor:v0.2.5`, prod only, since #92) — Watches on-chain and mempool activity for threats and alerts to Slack. Sources: `nbxplorer` on-chain provider (`THREAT_MONITOR_NBXPLORER_URL=http://nbxplorer:32838`, `THREAT_MONITOR_ONCHAIN_PROVIDER=nbxplorer`), Ark indexer (`https://${ARKD_DOMAIN}`), Ark explorer (`https://arkade.space`), and mempool.space explorer. Tuning: `THREAT_MONITOR_MEMPOOL_SCAN_INTERVAL=300s`, `THREAT_MONITOR_BLOCK_RECONCILE_INTERVAL=0s` (disabled), `THREAT_MONITOR_START_HEIGHT=952900`. State persisted to a named `threat-monitor` volume (`/data/threat-monitor.badger`); `traefik.enable=false`; logs to CloudWatch stream `threat-monitor`. New required env var `THREAT_MONITOR_SLACK_WEBHOOK_URL`. `depends_on: { nbxplorer }` is commented out to reduce the risk of NBX restarts.

### Metrics
- **ark-metrics** (`ghcr.io/arklabshq/ark-metrics:v0.3.0`, prod only, since #98; bumped `v0.1.0` → `v0.2.0` in #106, `v0.2.0` → `v0.3.0` in `20f2650`) — Collects Ark protocol metrics and exports them to the telemetry stack over OTLP. `depends_on: [arkd, otel-agent]`; exports to `otel-agent` (`ARK_METRICS_OTLP_ENDPOINT=http://otel-agent:4318`, `ARK_METRICS_OTLP_INSECURE=true`). Reads the arkd projection DB (`ARK_METRICS_DATABASE_URL=${ARKD_PG_DB_URL}`) and Ark info API (`ARK_METRICS_ARK_INFO_URL=https://${ARKD_DOMAIN}`); `ARK_METRICS_LOG_LEVEL=debug`. **New in #106:** scrapes arkd gRPC channelz introspection via `ARK_METRICS_CHANNELZ_ENDPOINT=arkd:7071` (admin port) and `ARK_METRICS_CHANNELZ_MAIN_PORT=7070`. `traefik.enable=false`; logs to CloudWatch stream `ark-metrics`.

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
  - **Endpoints** — staging (since #110): **`btcstaging.arkade.sh`** (primary ALB host) + `staging.arkade.sh`, Grafana `telemetry.staging.arkade.sh`, emulator `emulator.staging.arkade.sh`. `arkd_hosts = ["btcstaging.arkade.sh", "staging.arkade.sh"]` (dropped `staging-cf.arkade.sh` from the primary set); primary ALB cert is now the dedicated `btcstaging.arkade.sh` ACM cert (`b4977685-…`, SANs `btcstaging.arkade.sh` + `*.btcstaging.arkade.sh`). The prior `staging.arkade.sh`/`*.staging.arkade.sh`/`staging-cf.arkade.sh` cert (`7b9a0e38-…`) is retained as a **temporary extra listener cert** via `aws_lb_listener_certificate.tmp` (TODO to remove after the ALB deployment stabilizes), attached using `module.ark.alb_https_listener_arn`. Prod (live since 2026-05-26, `apps/ark/prod/`): **`arkade.computer`** (primary since #104/#107) + `prod.arkade.sh`, Grafana `telemetry.prod.arkade.sh`; app instance `i-0f3d436aad5dbf55e`, `alb_log_retention_days = 30`. `arkd_hosts = ["arkade.computer", "prod.arkade.sh"]`; primary ALB cert is now the dedicated `arkade.computer` ACM cert (`f80fd08a-…`, provisioned in #104). The prior `prod.arkade.sh`/`*.prod.arkade.sh`/`prod-cf.arkade.sh` cert (`57e4dfc4-…`) is retained as a **temporary extra listener cert** via `aws_lb_listener_certificate.tmp` (marked with a TODO to remove after the ALB deployment stabilizes) — it uses the new `module.ark.alb_https_listener_arn` output (`modules/ark/outputs.tf`)

### Data Stores
- **PostgreSQL** (RDS) — projection, event, nbxplorer databases
- **Redis** (ElastiCache) — Caching and queues

### Telemetry Stack

> **Architecture note (2026-05):** the telemetry stack now runs on a **separate EC2 instance** (Auto Scaling Group, default `t3.medium`) provisioned by `modules/ark/`. Grafana is exposed publicly via a **shared ALB** (HTTPS, ACM cert) using Google SSO. App instances run only `otel-agent` + `cadvisor` (bundled in the Ark Compose stack) and forward OTLP to the telemetry instance via AWS Cloud Map service discovery. New required env var on app hosts: `ARK_TELEMETRY_COLLECTOR_ENDPOINT` (e.g. `telemetry.ark-staging.internal:4317`).
>
> **Persistent state update (2026-06, #80):** the telemetry ASG is now **pinned to a single subnet/AZ** (new required `telemetry_subnet_id`) and mounts a **re-attachable encrypted EBS data volume** (`aws_ebs_volume.telemetry_data`, `gp3`, tag `ark-telemetry-data-${env}`) at `/dev/xvdb` → `/mnt/data`, with Docker's `data-root` relocated to `/mnt/data/docker`. Prometheus / Loki / Grafana state therefore survives instance recycles, trading multi-AZ HA for stateful telemetry. Staging: t3.small + 20 GB data, `subnet-0929002f609855e83` (eu-central-1b). Prod: t3.large + 30 GB data, `subnet-0aa4bfb28c983f5be` (eu-central-1b). Bootstrap scripts renamed: `scripts/user-data.sh` → `scripts/user-data-telemetry.sh`, `ansible/playbook.yml` → `ansible/telemetry-playbook.yml`; Ansible requirements bumped to `amazon.aws >= 10.3.1` plus `community.general`, `ansible.posix`. New vars: `telemetry_data_volume_size` (default 20), `telemetry_root_volume_size` (default 20), `telemetry_subnet_id` (required).
>
> **Resource profiles + CloudWatch Agent (2026-06, #88):** new required-but-defaulted `telemetry_resource_profile` variable (`small` | `large`, default `large`, validated) layers a `docker-compose.resources.{profile}.yaml` override on top of `docker-compose.otel.yaml` in the `ark-telemetry.service` systemd unit (both `ExecStart` and `ExecStop`), so per-container memory/CPU limits track instance size. Staging set to `small` (`apps/ark/staging/ark.tf`), prod set to `large` (`apps/ark/prod/ark.tf`). The telemetry instance now also installs the **Amazon CloudWatch Agent** (latest .deb from the AWS bucket — only `/latest/` is published) and ships `cpu` (idle/system/user, `totalcpu = true`), `mem` (used %), and `disk` (used %, scoped to `/` and `/mnt/data`, ignoring `tmpfs/devtmpfs/overlay/squashfs`) to CloudWatch, dimensioned by `InstanceId`. IAM gains `arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy` attached to `ec2_telemetry_role`. The Grafana container now explicitly enables brute-force login protection (`GF_AUTH_DISABLE_BRUTE_FORCE_LOGIN_PROTECTION=false`, `…_BY_IP=false`).
>
> **Migrated to Graviton + AL2023 AMI pattern (2026-07, #117):** the telemetry instance now follows the standalone-bitcoin-node provisioning pattern — moved off Ubuntu/x86 (`t3.small`/`t3.medium` default) onto **Amazon Linux 2023 arm64 (Graviton)**, default `t4g.small`. A new **`packer/telemetry/telemetry.pkr.hcl`** image (`make ami-telemetry`) builds `ark-telemetry-al2023-arm64-<ts>` on the latest base AMI (encrypted `/dev/xvda` gp3, IMDSv2-required), baking Docker + the Compose v2 plugin via the new top-level **`ansible/telemetry.yml`** playbook (roles `docker`, `telemetry`, `ansible_runtime`, build-only `deprovision`); the ark-telemetry stack is cloned live at boot at `ark_telemetry_ref` (was `ark_telemetry_branch`), not baked. The monolithic `modules/ark/ansible/telemetry-playbook.yml` (+ `requirements.yml`) is **deleted**. New **shared Ansible roles** `ebs_data_volume` (attach/mount `/dev/xvdb`→`/mnt/data`) and `fixed_eni_ip` (bind the reserved secondary IP) are used by both the bitcoind and telemetry roles; the `docker` role installs Compose plugin `2.29.7` aarch64 (AL2023 omits it). A generic **`ark-converge@` template systemd unit** (`systemctl start ark-converge@telemetry` / `@bitcoin-node`, keyed by the playbook basename, `/opt/ark/ansible/<name>.yml` + `@/etc/ark/<name>-bootstrap.yml`, on-demand `Type=oneshot`) replaces the per-AMI converge units — the bitcoin-node's dedicated `ark-bitcoin-node-ansible-converge.service` is deleted. **Static Cloud Map registration** replaces boot-time self-registration: new **required** `telemetry_fixed_private_ip` var + `aws_ec2_subnet_cidr_reservation.telemetry_fixed_ip` reserve a stable in-VPC IP that the `fixed_eni_ip` role binds as a secondary IP on the primary ENI at boot, and a static `aws_service_discovery_instance.telemetry` points Cloud Map at it (the register/deregister bash + `cloudmap-deregister` shutdown unit are gone). Telemetry IAM drops `servicediscovery:Register/Deregister/ListInstances` and gains `ec2:AssignPrivateIpAddresses`/`UnassignPrivateIpAddresses` (scoped by **`ec2:Vpc`**, because launch-template network-interface `tag_specifications` don't reliably tag the primary ENI at ASG launch — an `Environment`-tag condition denies the bind with `UnauthorizedOperation`) plus `ec2:DescribeNetworkInterfaces`; the launch template also tags the network-interface and its root device is now `/dev/xvda`. The telemetry-specific CloudWatch drop-in is **removed** (the base image's cloudwatch_agent baseline already covers host metrics + `/mnt/data`; a second drop-in made the agent's strict multi-file merge fail and crash-loop). `user-data-telemetry.sh` shrinks from ~104 to ~29 lines — it just writes `/etc/ark/telemetry-bootstrap.yml` and runs `ansible-playbook -c local -i localhost, telemetry.yml` (no apt/pip/awscli install, no repo clone). `telemetry_ami_id` is now **required** (default removed). Staging: `t4g.small`, `ami-0644e3471d063291b`, fixed IP `10.10.102.12` (`apps/ark/staging/ark.tf`).

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
- `modules/foundation/` — Foundation module (since #99, 2026-07): **long-lived** resources that survive app-stack destroy/recreate cycles. Creates the master KMS key (`alias/ark-master-{env}`, multi-region symmetric, not shared cross-account), the data KMS key (`alias/ark-data-{env}`, multi-region symmetric, optionally shared cross-account via `data_key_cross_account_ids`), and the arkd wallet signer-key Secrets Manager secret (`ark/${env}/arkd-wallet-signer-key`, encrypted with the master key). Both keys have rotation enabled; the module creates **containers only** — secret/SSM values are set outside Terraform to keep them out of state. Vars: `env`, `kms_key_deletion_window_in_days` (default 30, 7–30), `data_key_cross_account_ids` (default `[]`). Wired into `aws/dev-438465126741/main.tf` (env=`staging`, deletion window 7, data key shared with prod account `982590065524`). **Since #105** also creates the Bitcoin node RPC password SecureString container `/ark/${env}/bitcoin-node/secure/rpc-password` (encrypted with the master key, `lifecycle { ignore_changes = [value] }`, value set outside Terraform) with outputs `bitcoin_rpc_password_ssm_arn`/`_name`.
- `modules/alerting/` — Account-level alerting spine (since #109, 2026-07): an `ark-alerts-${env}` SNS topic (CloudWatch alarms publish to it, restricted to same-account `cloudwatch.amazonaws.com`) wired into an **AWS Chatbot (Amazon Q) Slack channel configuration** that renders alarm cards in Slack. Chatbot's control plane is **us-east-1 only**, so the channel config uses an `aws.us_east_1` provider alias while the SNS topic lives in the default region (subscribed cross-region). A read-only `ark-chatbot-${env}` IAM role (`CloudWatchReadOnlyAccess` + `CloudWatchLogsReadOnlyAccess`) enables alarm click-through; `guardrail_policy_arns` (default `ReadOnlyAccess`) caps commands run from Slack; `logging_level = ERROR`. Vars: `env`, `slack_channel_id`, `slack_team_id`, `guardrail_policy_arns`. Outputs: `sns_topic_arn`, `chatbot_configuration_arn`. Wired into `aws/dev-438465126741/main.tf` (env=`staging`), which adds the `aws.us_east_1` provider and bumps `hashicorp/aws` to `~> 5.61` (required for `aws_chatbot_slack_channel_configuration`)
- `modules/bitcoin-node/` — Standalone Bitcoin node on EC2 (since #105, 2026-07): a single-node ASG pinned to `subnet_id` (must match the AZ of the re-attachable `gp3` blockchain-data EBS volume, optionally seeded from `data_volume_snapshot_id`), a security group (RPC 8332, P2P 8333, optional ZMQ 28334-28336), an IAM role decrypting SecureString SSM params via `kms_key_arn`, and a per-node CloudWatch log group. All bitcoind config is written to per-instance SSM params (`${ssm_prefix}/bitcoin-node/${name}/*`: `network`, `prune`, `dbcache`, `maxmempool`, `maxconnections`, `rpc-user`, `rpc-allowip`, `rpc-bind`, `whitelist`, `zmq-enabled`) and read by Ansible at boot; the RPC password is the shared SecureString container from `modules/foundation/`. Vars incl. `enabled` (scale ASG to zero without destroying the volume), `instance_type` (default `t4g.large`, arm64), `fixed_private_ip` (reserved secondary IP bound on the primary ENI, survives instance replacement), `rpc_consumer_sg_ids`, `p2p_cidr_blocks`, `vpc_endpoint_sg_ids`. Outputs: `security_group_id`, `ebs_volume_id`, `asg_name`, `iam_role_arn`, `log_group_name`, `fixed_private_ip`. **Basic host alerts (since #116)** — `modules/bitcoin-node/alarms.tf` adds five CloudWatch alarms, all gated on `var.enabled` and keyed on the **`AutoScalingGroupName`** dimension (never `InstanceId`, which churns on every replacement): high memory (`CWAgent` `mem_used_percent`, sustained 10 min, `memory_alarm_threshold` default 90%), chain-disk-full (`CWAgent` `disk_used_percent` on `path=/mnt/data`, `data_disk_alarm_threshold` default 80%), root-disk-full (`path=/`, `root_disk_alarm_threshold` default 85%), high CPU (`AWS/EC2` `CPUUtilization`, sustained 15 min, `cpu_alarm_threshold` default 85%), and EC2 status-check-failed (`AWS/EC2` `StatusCheckFailed`, 3 min, `treat_missing_data=breaching` so a vanished instance also fires). Alarm/OK actions publish to `alerts_sns_topic_arn` (the account-level `ark-alerts-<env>` topic → Chatbot → Slack) when set; empty = alarms created for console visibility only. Staging (`apps/bitcoin/staging/bitcoin.tf`) wires `alerts_sns_topic_arn = arn:aws:sns:eu-central-1:438465126741:ark-alerts-staging`. New vars: `alerts_sns_topic_arn`, `memory_alarm_threshold`, `data_disk_alarm_threshold`, `root_disk_alarm_threshold`, `cpu_alarm_threshold`.
- `modules/vpc-lookup/` — Read-only VPC discovery (since #105, 2026-07): mirrors `modules/vpc`'s output interface (`vpc_id`, `vpc_cidr_block`, `public/private_subnet_ids[_by_az]`, `nat_gateway_ids`, `vpc_endpoints_sg_id`, …) via data-source lookups on `Name`-tagged resources. Lets app stacks reference an existing VPC without owning its lifecycle. Vars: `env`, `region` (default `eu-central-1`).
- `modules/ark/` — Shared Ark app + telemetry module (ALB, arkd + emulator target groups, telemetry ASG, Cloud Map, Ansible provisioning, S3 buckets, per-service log groups + error alarms). **Since #117** the telemetry ASG runs a Graviton/AL2023 custom AMI (`telemetry_ami_id` required, `telemetry_fixed_private_ip` required) bootstrapped by the top-level `ansible/telemetry.yml` roles instead of the deleted `modules/ark/ansible/telemetry-playbook.yml`; `telemetry.tf` adds `aws_ec2_subnet_cidr_reservation.telemetry_fixed_ip` + a static `aws_service_discovery_instance.telemetry` and reworks the telemetry IAM to `ec2:AssignPrivateIpAddresses`/`ec2:DescribeNetworkInterfaces` (VPC-scoped) in place of the `servicediscovery:*` register/deregister actions. **Since #111 also carries an ECS substrate:** `ecs.tf` (a `ark-${env}` ECS cluster on an EC2 capacity provider, stock ECS-optimized AL2023 arm64 AMI via SSM, container-instance IAM/SG, enhanced container insights, ECS-Exec logging; `scripts/user-data-ecs.sh` bootstrap; vars in `variables_ecs.tf`) and `nbxplorer.tf` (first service — NBXplorer 2.6.8 arm64 on port 32838, RPC/P2P to the standalone bitcoind pet, stateless on reused RDS Postgres via a SecureString DSN, Cloud Map discovery, `nbxplorer_down`/`errors`/`memory` CloudWatch alarms, cross-stack SG rules onto bitcoind + RDS; vars in `variables_nbxplorer.tf`; `nbxplorer_enabled` toggles desired_count). Shared data sources + `ec2_assume`/`ecs_tasks_assume` trust policies moved into `data.tf`; new required `kms_key_arn` var. New outputs: `ecs_cluster_name`, `ecs_instance_security_group_id`, `nbxplorer_security_group_id`, `nbxplorer_service_discovery_name`
- `modules/ark-iam-roles/` — SAML-federated IAM roles + guardrail policies (per account)
- `modules/ark-gws-sync/` — Lambda syncing Google Workspace group membership to AWS role attribute

### AMI builds (Packer + Ansible) — base since #102 (2026-07); restructured into subdirs + bitcoin-node image in #105
Each `packer/<image>/` subdirectory is a self-contained Packer build; child images layer software on the base. `packer/Makefile` exposes `make ami-base`, `make ami-bitcoin-node`, and `make ami-telemetry` (since #117; each runs `packer init && validate && build -var git_sha=…`).

> **Telemetry AMI added (#117, 2026-07):** `packer/telemetry/telemetry.pkr.hcl` layers Docker + the Compose v2 plugin (via the top-level `ansible/telemetry.yml` playbook) on the latest base image, producing `ark-telemetry-al2023-arm64-<ts>` (`t4g.small`, encrypted `/dev/xvda` gp3, IMDSv2-required, `Role=telemetry` tag). The ark-telemetry stack itself is cloned live at boot, not baked. See the Telemetry Stack section for the full Graviton/AL2023 migration.

> **AMI migrated to Amazon Linux 2023 (#115, 2026-07):** both the base image and the bitcoin-node image moved off Ubuntu 26.04 onto **Amazon Linux 2023 (AL2023)**, standardizing on the same OS as the ECS-optimized AL2023 hosts. AL2023 preinstalls the **SSM agent and AWS CLI** (so the `awscli` and `ssm_agent` Ansible roles were dropped from `site.yml`) and ships hardening, chrony, and secondary-ENI handling out of the box. The staging bitcoin node's `ami_id` is now `ami-0c36323cf3acc49e3` (`ark-bitcoin-node-29.0-al2023-arm64-…`). Details below reflect the post-migration state.

**`packer/base/`** — reusable **base image** that child AMIs (and live hosts) build from, paired with top-level `ansible/`:
- **`base.pkr.hcl`** — `amazon-ebs` source (arm64) + `ansible-local` provisioner + manifest post-processor. Builds `ark-base-al2023-arm64-<timestamp>` on **Amazon Linux 2023**, **arm64 / Graviton only**, in `eu-central-1` (`t4g.small`, gp3 root). The source AMI is resolved via `data "amazon-ami"` (`owner=amazon`, `most_recent`, name filter `al2023-ami-2023.*-kernel-6.1-arm64` — the public `/aws/service/ami-al2023` SSM params aren't readable in this account), `ssh_username=ec2-user`, root device `/dev/xvda`; Ansible is installed with `dnf -y install ansible-core`. Deliberately minimal: no Docker, no `ufw`/`fail2ban` (SSM-only access, no SSH ingress). Vars: `region`, `instance_type`, `root_volume_size` (20), `kms_key_id`, `git_sha`, `al2023_ami_owner` (default `amazon`), `al2023_ami_name_filter`.
- **`ansible/site.yml`** — connection-agnostic (`hosts: all`); the same roles run at Packer build time and idempotently on a live host via `sudo ansible-playbook -c local -i localhost, /opt/ark/ansible/site.yml`. Roles: `baseline`, `cloudwatch_agent`, `ansible_runtime` (persists the playbook to `/opt/ark/ansible`), and build-only `deprovision` (gated on `packer_build_name`). The `awscli` and `ssm_agent` roles were **removed in #115** — AL2023 ships the AWS CLI and SSM agent preinstalled.
- `ansible/requirements.yml` pulls `community.general` (child images add their own collections). Base ships a minimal CloudWatch host-metrics config (`00-baseline.json`, merged) that children override via file drop or the `cloudwatch_agent_fetch_from_ssm` SSM path.
- Follow-up (not yet done): wire Terraform to consume the AMI via `data "aws_ami"` (replacing the hardcoded `ami-…` ids).

**`packer/bitcoin-node/`** (since #105) — layers **Bitcoin Core `29.0`** (`bitcoin_version` var) on the latest base image (resolved via `data "amazon-ami"` on `tag:BaseImage=true` + `tag:Project=ark`, owner `self`). Produces `ark-bitcoin-node-<version>-al2023-arm64-<ts>` (`t4g.medium` default, `ssh_username=ec2-user`, root device `/dev/xvda` since #115). Runtime config comes from SSM at boot, not baked in. Ships an `ansible/roles/bitcoind` role and systemd oneshot units:
  - `ark-bitcoin-node-snapshot` — stops bitcoind → snapshots the EBS data volume → restarts (used to seed future nodes)
  - `ark-bitcoin-node-peer-discovery.timer` — discovers and adds other bitcoin nodes as peers (every 5 min)
  - Re-converge is now via the **shared `ark-converge@` template unit** (`systemctl start ark-converge@bitcoin-node`) installed by the `ansible_runtime` role since #117 — the dedicated `ark-bitcoin-node-ansible-converge.service` was removed. Its `iam.tf` `AssignPrivateIpAddresses` condition also switched from `ec2:ResourceTag/Environment` to `ec2:Vpc` (the primary ENI isn't reliably tagged at ASG launch, so the tag condition denied the bind with `UnauthorizedOperation` and halted the boot converge).

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
