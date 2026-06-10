# Documentation Sync History - Ark Infra

## 2026-06-09 - Documentation Update
**Commit**: `80a49fa7301451aa526c65e09f8711226943947d`
**Previous Sync**: `fbcda79126342c37df6c7f50346ad54bf40595fd`
**Synced By**: update-project skill
**Status**: Completed

**Commits Analyzed**: 4 commits (PRs #87, #83, #81, #88)

**Highlights**:
- 📦 **arkd release bump to v0.9.7** (#87, `2965061`): `compose/docker-compose.ark.prod.yaml`
  pins `ghcr.io/arkade-os/arkd:v0.9.7` and `ghcr.io/arkade-os/arkd-wallet:v0.9.7` (previously
  `v0.9.6`). Production-only change; regtest compose unchanged.
- 🧰 **Telemetry resource profiles** (#88, `80a49fa`): new validated
  `telemetry_resource_profile` variable in `modules/ark/variables_telemetry.tf` (`small` |
  `large`, default `large`). The `ark-telemetry.service` systemd unit in
  `modules/ark/ansible/telemetry-playbook.yml` now layers
  `docker-compose.resources.{{ resource_profile }}.yaml` on top of `docker-compose.otel.yaml`
  for both `ExecStart` and `ExecStop`, so per-container memory/CPU limits track instance size.
  `user-data-telemetry.sh` propagates `resource_profile` as an extra Ansible var; the launch
  template templates it from `var.telemetry_resource_profile`. Wired in apps:
  `apps/ark/staging/ark.tf` → `"small"`, `apps/ark/prod/ark.tf` → `"large"`.
- 📊 **Telemetry CloudWatch Agent** (#88, `80a49fa`): the telemetry instance now installs the
  Amazon CloudWatch Agent (latest .deb from `https://s3.amazonaws.com/amazoncloudwatch-agent/
  ubuntu/amd64/latest/amazon-cloudwatch-agent.deb` — AWS does not publish versioned URLs,
  hence `/latest/`). Config publishes `cpu` (idle/system/user, `totalcpu = true`), `mem`
  (`mem_used_percent`), and `disk` (`disk_used_percent` scoped to `/` and `/mnt/data`,
  ignoring `tmpfs/devtmpfs/overlay/squashfs`) with `InstanceId` appended as a dimension.
  Agent is enabled via systemd and `fetch-config` is `changed_when: false` so the reconcile
  is idempotent. IAM gains
  `aws_iam_role_policy_attachment "telemetry_cloudwatch_agent"` →
  `arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy` on `ec2_telemetry_role`.
- 🔐 **Grafana brute-force login protection** (#88): explicitly set
  `GF_AUTH_DISABLE_BRUTE_FORCE_LOGIN_PROTECTION=false` and
  `GF_AUTH_DISABLE_BRUTE_FORCE_LOGIN_PROTECTION_BY_IP=false` in the Grafana container env
  (overrides defaults to be explicit, since Google SSO is on and the host is public-internet
  via the shared ALB).
- 📈 **App-side CloudWatch disk alarms split** (#83, `30b7beb`):
  `docker-compose/opentofu/cloudwatch.tf` replaces the single `HighDisk-${env}` alarm with
  two: `HighDisk-Root-${env}` (dimensions `path = "/"`, `device = "nvme0n1p1"`,
  `fstype = "ext4"`) and `HighDisk-Data-${env}` (`path = "/mnt/data"`, `device = "nvme1n1"`,
  `fstype = "ext4"`). Both alarm at 80% over 2×120s, `actions_enabled = false` (still
  observe-only). Required because the previous unscoped alarm fired on `*` resources
  (including ephemeral tmpfs), producing noise.
- 🛠️ **CloudWatch Agent config aligned** (#83): both `docker-compose/scripts/user-data-ec2-prod.sh`
  and `…-regtest.sh` now append `InstanceId` to dimensions, scope `disk` collection to
  `["/", "/mnt/data"]` (was `["*"]`), and ignore
  `tmpfs/devtmpfs/overlay/squashfs`. Regtest also gains CPU metrics
  (`cpu_usage_idle/system/user`, `totalcpu = true`) bringing it in line with prod.
- 🔌 **otel-agent OTLP keepalive** (#81, `7986e07`): `modules/ark/agent/otel-agent-config.yaml`
  adds a `keepalive` stanza to the OTLP exporter (`time: 30s`, `timeout: 5s`,
  `permit_without_stream: true`) so the app-side agent → central collector gRPC channel
  survives idle periods without being torn down by intermediate NAT/keepalive timers.

**Files Updated**:
- docs/INDEX.md (ark-infra Key Capabilities: arkd/arkd-wallet `v0.9.6` → `v0.9.7`; new
  bullets for telemetry resource profiles + CloudWatch Agent, app-side CloudWatch alarm
  split, and otel-agent OTLP keepalive; tags appended: `cloudwatch-agent`,
  `cloudwatch-alarms`, `grafana-brute-force`, `otlp-keepalive`, `telemetry-resource-profile`)
- docs/projects/ark-infra/INDEX.md (frontmatter: `version` → 1.7.0, `last_sync_commit`,
  `last_sync_date`; Telemetry Stack architecture note gains a Resource profiles + CloudWatch
  Agent paragraph; arkd / arkd-wallet bullets pinned to `v0.9.7`; otel-agent bullet notes
  gRPC keepalive)
- docs/projects/ark-infra/system/project_overview.md (Telemetry Stack section: new
  Resource profiles + CloudWatch Agent paragraph, app-side CloudWatch alarms paragraph,
  otel-agent OTLP keepalive paragraph; ECR/GHCR note bumped to `v0.9.7`)
- docs/projects/ark-infra/change-log/last-sync.txt (commit hash updated)
- docs/projects/ark-infra/change-log/SYNC_HISTORY.md (this entry)

---

## 2026-06-06 - Documentation Update
**Commit**: `fbcda79126342c37df6c7f50346ad54bf40595fd`
**Previous Sync**: `2f2b2e1655a3855b71012ffb4d8f5f7e91bb9efd`
**Synced By**: update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit (PR #86, "Vpc module")

**Highlights**:
- 🌐 **Shared VPC module extracted** (#86, `fbcda79`): new `modules/vpc/` (`main.tf`,
  `vpc.tf`, `variables.tf`, `outputs.tf`, `README.md`) defines a reusable VPC owning
  the VPC, public/private subnets across 3 AZs (keyed by AZ suffix `a`/`b`/`c`),
  Internet Gateway, NAT topology (`nat_per_az` bool, default `true`), private
  route tables, the egress-only `vpc_endpoints_sg`, six interface VPC endpoints
  (`ssm`, `ssmmessages`, `ec2messages`, `ecr.api`, `ecr.dkr`, `logs`) created via
  `for_each`, and the S3 gateway endpoint. Inputs: `env`, `region` (default
  `eu-central-1`), `vpc_cidr` (default `10.10.0.0/16`), `public_subnet_cidrs`,
  `private_subnet_cidrs`, `nat_per_az`. Required provider: `hashicorp/aws ~> 5.0`.
- 🏷️ **Subnet `Tier` tags added** on import: module tags public subnets `Tier = "public"`
  and private subnets `Tier = "private"` — the old `docker-compose/opentofu` stack
  didn't set these, so the first `tofu plan` after import shows expected in-place
  updates (resolves a longstanding TODO around data-source lookups by `Tier`).
- 🔒 **VPC endpoint SG is egress-only**: ingress responsibility moves to callers
  (`aws_security_group_rule "vpc_endpoints_ingress_app"` is no longer module-owned).
  Import will show an in-place description update vs. the old SG — intentional.
- 🧰 **State migration script** (`scripts/migrate-vpc-state.sh [--dry-run] <staging|prod>`):
  4-phase workflow — (0) backs up both source `docker-compose/opentofu` and target
  account state (`aws/dev-438465126741` / `aws/prod-982590065524`) to local
  `.tfstate` files with a timestamp; (1) extracts AWS resource IDs from the source
  workspace via `tofu state show`; (2) `tofu import`s VPC, IGW, subnets,
  route tables + associations, NAT (EIP/NAT/RT per AZ that has one), VPC-endpoint
  SG + egress rule, and all interface/gateway endpoints into `module.vpc_{env}.*`
  in the target account stack; (3) prints `tofu plan` verification command;
  (4) prints (but does not run) the `tofu state rm` commands to delete the migrated
  resources from the docker-compose state. The old ingress rule is removed but
  intentionally not re-imported.
- 🔌 **Not yet wired into apps**: `docker-compose/opentofu/main.tf` contains a
  commented-out `module "vpc" { source = "./modules/vpc" … }` invocation; no
  `apps/ark/{staging,prod}` stack consumes the module yet. This PR ships the
  module and migration tooling so that VPC ownership can move from
  `docker-compose/opentofu` to per-account stacks in a follow-up apply.

**Files Updated**:
- docs/INDEX.md (ark-infra Key Capabilities gains a shared VPC module bullet; tags
  appended: `vpc-module`, `state-migration`, `subnet-tags`)
- docs/projects/ark-infra/INDEX.md (frontmatter: `version` → 1.6.0, `last_sync_commit`,
  `last_sync_date`; new `Configuration Files / Modules` mention of `modules/vpc/`
  and `scripts/migrate-vpc-state.sh`)
- docs/projects/ark-infra/system/networking.md (Security Groups section notes that
  the new shared `modules/vpc` provisions `vpc_endpoints_sg` as egress-only with
  caller-owned ingress; new "Shared VPC Module (migration)" paragraph)
- docs/projects/ark-infra/system/project_overview.md (Repository Structure: add
  `modules/vpc/` directory and `scripts/migrate-vpc-state.sh`)
- docs/projects/ark-infra/change-log/last-sync.txt (commit hash updated)
- docs/projects/ark-infra/change-log/SYNC_HISTORY.md (this entry)

## 2026-06-02 - Documentation Update
**Commit**: `2f2b2e1655a3855b71012ffb4d8f5f7e91bb9efd`
**Previous Sync**: `4bd46fa06d1399940634b4c723b426abca2c09f2`
**Synced By**: update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit (PR #80, "Persistent EBS volume for telemetry data")

**Highlights**:
- 💾 **Persistent EBS data volume for telemetry** (#80, `2f2b2e1`): `modules/ark/telemetry.tf`
  adds `aws_ebs_volume.telemetry_data` (encrypted `gp3`, tag `ark-telemetry-data-${env}`,
  sized by new `telemetry_data_volume_size` var, default 20 GB). New `data "aws_subnet" "telemetry"`
  resolves the AZ from a new required `telemetry_subnet_id` so the volume and ASG live in the
  same AZ. The ASG `vpc_zone_identifier` is narrowed from `var.vpc_private_subnet_ids` to
  `[var.telemetry_subnet_id]` — **HA trade-off**: telemetry is now single-AZ, but Prometheus /
  Loki / Grafana state survives instance recycles.
- 🔐 **IAM additions on `aws_iam_role_policy.telemetry`**: `ec2:Describe{Volumes,VolumeStatus,VolumeAttribute,Instances,Tags}`
  (Resource `"*"`) plus `ec2:AttachVolume`/`DetachVolume` scoped to the volume ARN and
  `instance/*` conditioned on `ec2:ResourceTag/Environment = var.env`.
- 📦 **Bootstrap rename + Docker data-root relocation**: `scripts/user-data.sh` →
  `scripts/user-data-telemetry.sh`, `ansible/playbook.yml` → `ansible/telemetry-playbook.yml`.
  The renamed playbook now: (1) gathers EC2 metadata via `amazon.aws.ec2_metadata_facts`,
  (2) attaches the data volume via `amazon.aws.ec2_vol` (retries 12 × 10s) at `/dev/xvdb`,
  (3) formats `/dev/nvme1n1` ext4 if new, (4) mounts by UUID at `/mnt/data` via `ansible.posix.mount`,
  (5) cleans stale `/mnt/data/docker/containers` from previous instance, (6) rewrites
  `/etc/docker/daemon.json` to point `data-root` at `/mnt/data/docker` and restarts Docker —
  but **only when current Docker root != target** (idempotency fix). User-data template now
  receives `data_volume_id` from Terraform.
- 📚 **Ansible collections bumped**: `requirements.yml` now `amazon.aws >= 10.3.1`
  (was `>= 7.0.0`), plus new `community.general >= 8.0.0` and `ansible.posix >= 1.5.0`.
- 📏 **Root volume parameterized**: launch template `ebs.volume_size` is now
  `var.telemetry_root_volume_size` (default 20, was hardcoded 60).
- 🖥️ **Per-env sizing landed in apps**: `apps/ark/staging/ark.tf` adds
  `telemetry_instance_type = "t3.small"` + `telemetry_subnet_id = "subnet-0929002f609855e83"`
  (eu-central-1b) — staging downgraded from default `t3.medium`. `apps/ark/prod/ark.tf` adds
  `telemetry_instance_type = "t3.large"` + `telemetry_data_volume_size = 30` +
  `telemetry_subnet_id = "subnet-0aa4bfb28c983f5be"` (eu-central-1b) — **initial prod
  telemetry config**.

**Files Updated**:
- docs/INDEX.md (new Persistent telemetry state bullet under ark-infra; telemetry split bullet's
  playbook path updated to `telemetry-playbook.yml`; tags appended: `ebs`, `persistent-volume`,
  `telemetry-state`, `single-az`)
- docs/projects/ark-infra/INDEX.md (frontmatter: `version` → 1.5.3, `last_sync_commit`,
  `last_sync_date`; Telemetry Stack architecture note gains a Persistent state update paragraph
  covering subnet pinning, EBS volume, `/mnt/data` / Docker data-root, renamed bootstrap files,
  Ansible collection bumps, and the new variables)
- docs/projects/ark-infra/system/project_overview.md (Repository Structure paths renamed for
  `user-data-telemetry.sh` / `telemetry-playbook.yml`; Telemetry Stack section gains a
  Persistent state paragraph with EBS volume, IAM permissions, Docker data-root, and Ansible
  requirement bumps)
- docs/projects/ark-infra/change-log/last-sync.txt
- docs/projects/ark-infra/change-log/SYNC_HISTORY.md

---

## 2026-05-28 - Documentation Update
**Commit**: `4bd46fa06d1399940634b4c723b426abca2c09f2`
**Previous Sync**: `6bcd75dfdba0dc3158a91ee0ba4e24bdb5307b54`
**Synced By**: update-project skill
**Status**: Completed

**Commits Analyzed**: 2 commits

**Highlights**:
- 📦 **arkd release bump to v0.9.6** (#76, `4bd46fa`): `compose/docker-compose.ark.prod.yaml`
  pins `ghcr.io/arkade-os/arkd:v0.9.6` and `ghcr.io/arkade-os/arkd-wallet:v0.9.6` (previously
  `v0.9.5`). Production-only change; regtest compose unchanged.
- 🩺 **NBXplorer upgrade `2.5.30-1` → `2.6.7` with curl-enabled health checks** (#74,
  `e64e5e9`): the upstream `nicolasdorier/nbxplorer` base image ships without `curl` or `wget`,
  preventing reliable HTTP health probes. A new local `compose/Dockerfile.nbxplorer` wraps it
  (`FROM nicolasdorier/nbxplorer:${NBXPLORER_VERSION}` + `apt-get install -y --no-install-recommends curl`)
  and is built by both compose files via a `build:` block (context `.`, `args: NBXPLORER_VERSION=2.6.7`),
  tagged `ark-infra/nbxplorer:2.6.7-curl`. The health check moved from a stub `GET /health` to a
  JSON-RPC `POST /v1/cryptos/BTC/rpc` with body
  `{"jsonrpc":"1.0","method":"getblockchaininfo","params":[]}`, grepping for `"result"`; retry
  budget doubled from 30 to 60 (5s interval). Applied identically to
  `compose/docker-compose.ark.prod.yaml` and `compose/docker-compose.ark.regtest.yaml`.
- 🔗 **`arkd-wallet depends_on nbxplorer` (service_healthy)**: in both prod and regtest compose
  files, `arkd-wallet` now declares `depends_on: { nbxplorer: { condition: service_healthy } }`
  so the wallet sidecar only starts once nbxplorer's JSON-RPC probe is green. Combined with the
  new health probe, this eliminates the previous race where arkd-wallet booted against an
  unindexed nbxplorer.

**Files Updated**:
- docs/INDEX.md (capability lines: arkd/arkd-wallet `v0.9.5` → `v0.9.6`; new NBXplorer `2.6.7` line covering the local Dockerfile override, JSON-RPC health check, and `arkd-wallet depends_on nbxplorer`; tags: `nbxplorer`, `healthcheck`, `dockerfile-override`)
- docs/projects/ark-infra/INDEX.md (frontmatter: `last_sync_commit`, `last_sync_date`, version 1.5.2; Core Services nbxplorer bullet now lists `2.6.7`, local `Dockerfile.nbxplorer`, JSON-RPC health check, and the new `arkd-wallet` health dependency)
- docs/projects/ark-infra/system/project_overview.md (ECR note: GHCR image tags `v0.9.5` → `v0.9.6`; nbxplorer service section expanded with version, Dockerfile override rationale, health check, and `arkd-wallet` dependency)
- docs/projects/ark-infra/change-log/last-sync.txt
- docs/projects/ark-infra/change-log/SYNC_HISTORY.md

---

## 2026-05-27 - Documentation Update
**Commit**: `6bcd75dfdba0dc3158a91ee0ba4e24bdb5307b54`
**Previous Sync**: `6ec1a7a474f3a98e843224b7b2de604d923426ef`
**Synced By**: update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit

**Highlights**:
- 🚀 **Prod `ark` app deployed** (`6bcd75d`): new `apps/ark/prod/` OpenTofu entry point composes
  `modules/ark` with `env = "prod"` — the prod equivalent of the staging stack landed in the
  previous sync. `main.tf` uses S3 backend `ark-prod-terraform-state` (key
  `apps/ark/prod/terraform.tfstate`, region `eu-central-1`, DynamoDB `terraform-state-lock`) and
  standard `default_tags` (`Application=ark`, `Environment=prod`, `ManagedBy=opentofu`,
  `Repository=ark-infra`, `Owner=platform`). `vpc.tf` / `data.tf` look up the existing
  `ark-vpc-prod` VPC, `ark-private-*` / `ark-public-*` subnets, and `ark-app-sg-prod` /
  `ark-vpc-endpoints-sg-prod` security groups by `Name` tag. `ark.tf` wires app instance
  `i-0f3d436aad5dbf55e` (ark-app-prod), `ssm_prefix = /ark/prod`,
  `arkd_hosts = ["prod.arkade.sh", "prod-cf.arkade.sh"]`, `arkd_http1_support = true`,
  `telemetry_grafana_host = telemetry.prod.arkade.sh`, ACM cert
  `…/certificate/57e4dfc4-2a6f-4b20-aa60-c2617e9e4bd2` (domain `prod.arkade.sh`, SANs
  `*.prod.arkade.sh`, `prod-cf.arkade.sh`), `alb_log_retention_days = 30`, and
  `ark_infra_branch` / `ark_telemetry_branch = master`. Two Route53 A-record aliases point
  `prod.arkade.sh` and `telemetry.prod.arkade.sh` at `module.ark.alb_dns_name`.
- 🌍 **Prod-account Route53 zone** (`aws/prod-982590065524/route53.tf`): new
  `aws_route53_zone "prod"` for `prod.arkade.sh` at the prod account (`982590065524`) level,
  consumed by the `apps/ark/prod/` stack via `data.aws_route53_zone.prod`.

**Files Updated**:
- docs/INDEX.md (new capability line for the prod stack: `apps/ark/prod/`, `ark-prod-terraform-state`, prod endpoints/Grafana/ACM SANs, prod-account Route53 zone)
- docs/projects/ark-infra/INDEX.md (frontmatter: `last_sync_commit`, `last_sync_date`, version 1.5.1; ALB → arkd now "staging + prod"; new Endpoints bullet covering prod hosts, app instance, log retention, ACM SANs)
- docs/projects/ark-infra/system/project_overview.md (repo structure: `apps/ark/{staging,prod}/`; ALB → arkd subsection adds prod endpoints)
- docs/projects/ark-infra/system/networking.md (Traffic Flow ALB path now "staging + prod", adds direct A-record hosts and prod-account Route53 zone reference)

## 2026-05-16 - Documentation Update
**Commit**: `6ec1a7a474f3a98e843224b7b2de604d923426ef`
**Previous Sync**: `a981284ec1ad09a66ece6dcf0fa132b86318fd51`
**Synced By**: update-project skill
**Status**: Completed

**Commits Analyzed**: 3 commits

**Highlights**:
- 🌐 **arkd on the shared ALB** (#72, `5feac2c`): `modules/ark/arkd.tf` adds three target
  groups on port 7070 — `arkdg-*` (`HTTP/GRPC`, health `/grpc.health.v1.Health/Check`
  matcher `0`, listener priority 10), `arkds-*` (HTTP1 if `arkd_http1_support=true` else
  HTTP2, health `/v1/info`, priority 15, path-pattern based), and `arkdr-*` (REST
  fallthrough on the same host). Routing combines host header (`arkd_hosts`),
  `content-type: application/grpc*` for gRPC, and path patterns
  (`arkd_sse_streaming_endpoint_paths`, default `/v1/batch/events`, `/v1/txs`,
  `/v1/indexer/script/subscription/*`) for SSE. ALB `idle_timeout` raised to 180s so SSE
  survives arkd's 60s heartbeat and Cloudflare's 120s edge idle. ALB access + connection
  logs ship to a new bucket `ark-logs-${env}-${account_id}` (lifecycle by
  `alb_log_retention_days`, default 30; staging set to 7). Grafana listener rule
  deprioritized to 100. New module vars: `app_instance_id`, `alb_log_retention_days`,
  `app_security_group_id`, `arkd_hosts`, `arkd_http1_support`,
  `arkd_sse_streaming_endpoint_paths`. New module files: `arkd.tf`, `s3.tf`, `locals.tf`
  (`account_id` / `region` data locals), `outputs.tf` (`alb_dns_name`, `alb_zone_id`).
- 🌍 **Staging endpoints + Route53**: `aws/dev-438465126741/route53.tf` creates
  `aws_route53_zone "staging"` for `staging.arkade.sh`. `apps/ark/staging/ark.tf` now
  wires `arkd_hosts = ["staging.arkade.sh", "staging-cf.arkade.sh"]`, swaps the ACM cert
  for one with SANs (`*.staging.arkade.sh`, `staging-cf.arkade.sh`) to enable TLS Full
  Strict to Cloudflare, moves Grafana to `telemetry.staging.arkade.sh`, sets
  `alb_log_retention_days = 7`, hardcodes `app_instance_id = "i-0bb28815cb7dc75fe"`
  temporarily, and adds two A-record aliases to the ALB. App SG is now looked up via
  `data.aws_security_group.app` instead of being hardcoded.
- 🧪 **ALB spot-check script**: `scripts/alb-spot-check.sh <host>` builds a buf protoset
  from a local arkd checkout and probes gRPC `GetInfo`, REST `/v1/info`, and SSE
  `/v1/batch/events` over both HTTP/1.1 and HTTP/2, reporting per-protocol pass/fail.
- 🗄️ **SSM DB-dump utility** (#73, `7f8d593`): new SSM document `Ark-DumpDatabase-${env}`
  runs `pg_dump` on the app instance for one of `projection|event|nbxplorer` and uploads
  to `s3://ark-tmp-${env}/db-dumps/` (default; `S3Bucket` / `S3Prefix` /
  `DumpFileName` overridable). Working directory `/mnt` to use the data volume; errors
  are trapped and surfaced in the SSM output. Scoped IAM: new role policies
  `ark-app-s3-dump-upload-${env}` (s3:PutObject on the dump prefix) and
  `ark-app-ssm-db-params-${env}` (ssm:GetParameter* on `/ark/${env}/db/*`). New module
  bucket `ark-tmp-${env}` (AES256, public-access blocked, 7-day object expiry) defined
  in `modules/ark/s3.tf`. Console outputs include `ssm_dump_database_command` and
  ready-to-copy `ssm_deployment_examples` snippets.
- 🛠️ **VPC-endpoint SG refactor** (within #73): inline ingress/egress on
  `vpc_endpoints_sg` was extracted into standalone `aws_security_group_rule.vpc_endpoints_*`
  resources so other stacks can add rules without causing plan drift.
- 📝 **Docs nit** (`6ec1a7a`): `docker-compose/docs/reference.md` corrects the
  `arkd_wallet_signer_key` example from a misleading `xprv...` to a 64-char hex value
  generated with `openssl rand -hex 32`. (Upstream-repo doc only; no Arkadian doc change.)

**Files Updated**:
- docs/INDEX.md (capability lines: ALB-fronted arkd, staging endpoints, SSM DB-dump; tags: `alb-arkd`, `target-groups`, `grpc-alb`, `sse`, `route53`, `cloudflare-proxy`, `acm`, `alb-access-logs`, `s3-logs`, `pg-dump`, `db-backup`)
- docs/projects/ark-infra/INDEX.md (frontmatter: `last_sync_commit`, `last_sync_date`, version 1.5.0; new aliases `alb` / `dbdump`; new scripts `alb_spot_check` / `ssm_dump_db`; Ingress & Routing section adds ALB → arkd path with target groups, health checks, log bucket; new Operational SSM Commands section for dumping DBs)
- docs/projects/ark-infra/system/project_overview.md (repo structure: `modules/ark/{arkd,s3,locals,outputs}.tf`; Ingress & Routing: ALB → arkd subsection)
- docs/projects/ark-infra/system/architecture.md (Container Architecture: ALB ingress path with target groups; new ALB-fronted arkd paragraph in Telemetry section)
- docs/projects/ark-infra/system/aws-infrastructure.md (EC2 role: new `s3-dump-upload` and `ssm-db-params` inline policies; new Application Load Balancer section with listener rules table and behavior; new S3 Buckets section for `ark-logs-*` and `ark-tmp-*`)
- docs/projects/ark-infra/system/networking.md (ALB ingress flow added; SG note on `vpc_endpoints_sg` refactor)
- docs/projects/ark-infra/testing/operations.md (Dump-DB SSM recipe with three variants; ALB spot-check usage; ALB log bucket pointer)
- docs/projects/ark-infra/change-log/last-sync.txt
- docs/projects/ark-infra/change-log/SYNC_HISTORY.md

---

## 2026-05-13 - Documentation Update
**Commit**: `a981284ec1ad09a66ece6dcf0fa132b86318fd51`
**Previous Sync**: `29b6cb84f86741457a43710cfd090e964d2cbf19`
**Synced By**: update-project skill
**Status**: Completed

**Commits Analyzed**: 2 commits

**Highlights**:
- 🏗️ **Telemetry migrated to separate EC2 + ALB** (#68, `a981284`): the telemetry stack
  (Grafana, Prometheus, Loki, Jaeger, Alertmanager, OTLP collector, Pyroscope) is no longer
  co-located on the app instance. A new reusable module `modules/ark/` provisions:
  - A telemetry EC2 in an **Auto Scaling Group** (default `t3.medium`) bootstrapped by
    `modules/ark/scripts/user-data.sh` + `modules/ark/ansible/playbook.yml` (clones
    `ark-telemetry` from the configurable `ark_telemetry_branch`, default `master`, and
    runs `docker compose` on the host).
  - A **shared internet-facing ALB** (`modules/ark/alb.tf`) with HTTPS listener
    (`ELBSecurityPolicy-TLS13-1-2-2021-06`) terminated by an ACM cert
    (`alb_certificate_arn` variable). Grafana is now publicly exposed via
    `telemetry_grafana_host` listener rule on a new target group with `/api/health` health check.
  - **AWS Cloud Map service discovery** (`modules/ark/service_discovery.tf`) so app
    instances resolve the telemetry collector by DNS; stale instances are deregistered
    on boot.
  - **IMDSv2-only**, least-privilege IAM (`ark-telemetry-role-${env}` with `AmazonSSMManagedInstanceCore`,
    scoped `ssm:GetParameter` on `${ssm_prefix}/*`, scoped `s3:GetObject`/`ListBucket` on
    `ark-tmp`, and `servicediscovery:Register/Deregister/ListInstances`).
  - Security groups opening OTLP gRPC (4317), OTLP HTTP (4318), Pyroscope (4040), and
    Alertmanager (9093) **from app SGs only**, plus Grafana (3000) **from ALB SG only**.
  - Systemd one-shot `ark-telemetry.service` with env file for easy access.
  - **Google SSO for Grafana** (client-id / client-secret from SSM, `secure`-at-end naming
    convention: `/grafana/google/secure/client-secret`).
- 🔌 **App-side telemetry sidecars bundled into the Ark Compose stack**:
  `docker-compose/compose/docker-compose.ark.prod.yaml` now includes `otel-agent`
  (`otel/opentelemetry-collector-contrib:0.151.0`, config at `modules/ark/agent/otel-agent-config.yaml`)
  and `cadvisor` (`gcr.io/cadvisor/cadvisor:v0.56.2`) on the `ark` Docker network. Both
  ship logs to CloudWatch (`awslogs` driver, `/ark/${ARK_ENVIRONMENT}`). Agent exports OTLP
  to the central telemetry collector via Cloud Map DNS; ports 4317/4318 are now used
  **locally** on the app host. Requires a new env var in `.env.ark`:
  - `ARK_TELEMETRY_COLLECTOR_ENDPOINT` (e.g. `telemetry.ark-staging.internal:4317`).
- 🆕 **`apps/ark/staging/` Terraform layout** introduced as the new staging entry point.
  Uses the `modules/ark` module with `ssm_prefix = "/ark/staging"`, branches pinned to
  `master`, and an ACM cert wired in. Backend: S3 `ark-dev-terraform-state` /
  DynamoDB `terraform-state-lock`. VPC + subnets resolved via `data` lookups by `Name` tag.
- 🧰 **SSM parameter convention refactor**: app + telemetry now share a single
  `ssm_prefix` and migrated to **`secure`-at-end naming** (e.g.
  `/secure/grafana/google/client-secret` → `/grafana/google/secure/client-secret`). The
  Ansible playbook resolves prefixed paths from `aws ssm get-parameter`.
- 🧪 **Developer sandbox sub-account** (`29a70d3`): added `aruokhai`
  (`aaron+aws-dev-aruokhai@arklabs.xyz`) under the dev account in
  `aws/dev-438465126741/organizations.tf`, plus `aws_iam_user_policy`
  `AruokhaiAccountAssumeRole` granting `aaron.carlucci` `sts:AssumeRole` on the new
  sub-account's `OrganizationAccountAccessRole`, and an `aws.aruokhai` provider alias
  bootstrapping an IAM admin user with login profile.

**Files Updated**:
- docs/INDEX.md (capability lines: telemetry-on-separate-EC2/ALB, otel-agent + cadvisor sidecars, Grafana Google SSO, ARK_TELEMETRY_COLLECTOR_ENDPOINT; tags: `alb`, `asg`, `cloud-map`, `service-discovery`, `ansible`, `imdsv2`, `grafana-sso`)
- docs/projects/ark-infra/INDEX.md (frontmatter: `last_sync_commit`, `last_sync_date`, version 1.4.0; deployed services note for ALB; telemetry split note)
- docs/projects/ark-infra/system/project_overview.md (repo structure: `apps/ark/staging/`, `modules/ark/`; telemetry stack split; new env var)
- docs/projects/ark-infra/system/architecture.md (telemetry layer: separate EC2 in ASG, ALB-fronted Grafana, otel-agent/cadvisor on app host)
- docs/projects/ark-infra/change-log/last-sync.txt
- docs/projects/ark-infra/change-log/SYNC_HISTORY.md

---

## 2026-05-12 - Documentation Update
**Commit**: `29b6cb84f86741457a43710cfd090e964d2cbf19`
**Previous Sync**: `c64a12b7b769c84766b38fbf92b91dc6c6f6584c`
**Synced By**: update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit

**Highlights**:
- 📦 **arkd release bump** (`29b6cb8`): `compose/docker-compose.ark.prod.yaml` now pins
  `ghcr.io/arkade-os/arkd:v0.9.5` and `ghcr.io/arkade-os/arkd-wallet:v0.9.5` (previously
  `v0.9.4`). Production-only change; regtest compose unchanged.

**Files Updated**:
- docs/INDEX.md (capability line: arkd/arkd-wallet pinned version `v0.9.4` → `v0.9.5`)
- docs/projects/ark-infra/INDEX.md (frontmatter: `last_sync_commit`, `last_sync_date`, version 1.3.2)
- docs/projects/ark-infra/system/project_overview.md (ECR note: GHCR image tags `v0.9.4` → `v0.9.5`)
- docs/projects/ark-infra/change-log/last-sync.txt
- docs/projects/ark-infra/change-log/SYNC_HISTORY.md

---

## 2026-05-05 - Documentation Update
**Commit**: `c64a12b7b769c84766b38fbf92b91dc6c6f6584c`
**Previous Sync**: `cf02b85cf224f4c2c2d8025309cc066dec4eb6f7`
**Synced By**: update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit

**Highlights**:
- 🧪 **Developer sandbox sub-account** (`c64a12b`): added `aws/dev-438465126741/organizations.tf`
  provisioning an `aws_organizations_account` named `se7enz` under the dev account, plus an
  `aws_iam_user_policy` (`Se7enZAccountAssumeRole`) granting IAM user `aaron.carlucci`
  `sts:AssumeRole` on `arn:aws:iam::<se7enz-account-id>:role/OrganizationAccountAccessRole`.
  Establishes the pattern for per-developer sandbox sub-accounts isolated from the shared
  dev account.

**Files Updated**:
- docs/INDEX.md (capability + tags: `aws-organizations`, `sandbox-accounts`)
- docs/projects/ark-infra/INDEX.md (frontmatter: `last_sync_commit`, `last_sync_date`, version 1.3.1)
- docs/projects/ark-infra/system/project_overview.md (repo structure note on `organizations.tf`)
- docs/projects/ark-infra/system/security.md (Developer Sandbox Sub-Accounts subsection)
- docs/projects/ark-infra/change-log/last-sync.txt
- docs/projects/ark-infra/change-log/SYNC_HISTORY.md

---

## 2026-05-02 - Documentation Update
**Commit**: `cf02b85cf224f4c2c2d8025309cc066dec4eb6f7`
**Previous Sync**: `c12813d1c9039a82fe8367f1971a010a1b0e869c`
**Synced By**: update-project skill
**Status**: Completed

**Commits Analyzed**: 6 commits

**Highlights**:
- 🔐 **AWS IAM + Google Workspace SSO** (#26): SAML federation provisioned per AWS account
  (prod `982590065524`, dev `438465126741`) with role prefixes `ArkProd` / `ArkDev`. Four
  roles per account — `SuperAdministrator`, `Administrator`, `Developer`, `ReadOnly` — built
  from two new reusable OpenTofu modules:
  - `modules/ark-iam-roles`: SAML-federated roles with layered guardrail policies
    (`AdminRestrictions`, `DeveloperRestrictions`, `SSMPortForwarding`).
  - `modules/ark-gws-sync`: Lambda (`secure-gws-aws-sync-{env}`) running every 15 minutes
    that reads Google Workspace group membership and writes the `Amazon.Role` user attribute.
    Multi-account aware (preserves sibling-account attributes) and clears the attribute for
    users orphaned from all mapped groups (revokes access on next sync).
- Repo restructure: flattened from `aws/{account}/gws-aws/opentofu/` to `aws/{account}/`;
  per-account configs `aws/dev-438465126741/` and `aws/prod-982590065524/`.
- Guardrails: deny Secrets Manager value access, `*secure*` SSM parameters, CloudTrail /
  GuardDuty / Config / SecurityHub / Access Analyzer disruption, KMS destructive ops,
  Route53 domain transfer, `*secure*` Lambda mutation, S3 public-access toggles, Terraform
  state bucket / lock table mutation, `sts:AssumeRole` on SuperAdministrator, and SSM
  **shell** sessions for non-SuperAdmins (port forwarding stays available).
- Sensitive log restriction (commit `0c854fc`): `DenySensitiveLogs` added to
  `DeveloperRestrictions` for `/aws/ssm/sessions/*` and any `/*secure*` log group
  (`Get/FilterLogEvents`, `StartQuery`, `CreateExportTask`, etc.) — applies to Developer
  and ReadOnly.
- ReadOnly inherits `DeveloperRestrictions` so it cannot read Terraform state via
  `s3:GetObject` (which `ReadOnlyAccess` would otherwise grant).
- ABAC: SAML trust policy includes `sts:TagSession` to enable principal-tag based access
  control from Google Workspace; account ID derived from `data.aws_caller_identity`
  (no hardcoded account variable).
- Provider `default_tags` standardized: `Environment`, `ManagedBy = "opentofu"`,
  `Repository = "ark-infra"`, `Owner` (resource-level `ManagedBy` removed).
- SSM access model:
  - SuperAdministrator: shell ✓, port forward ✓, run commands ✓
  - Administrator: shell ✗, port forward ✓, run commands ✓
  - Developer: shell ✗, port forward ✓, run commands ✗
  - ReadOnly: shell ✗, port forward ✗, run commands ✗
- Nix devshell (`flake.nix` + `.envrc`, commit `825be6e`): pins OpenTofu 1.9.1
  (`nixpkgs e6f23dc0`), Node.js 20, Python 3 — `direnv allow` enters the shell.
- `Makefile`: cross-platform `bash` resolution fix (commit `cad9b75`).
- Terraform lock files added/updated for both accounts (`commits cf02b85`, `4dd7d27`).

**Files Updated**:
- docs/INDEX.md (capabilities, tags — IAM/SSO/SAML/Nix)
- docs/projects/ark-infra/INDEX.md (frontmatter, repo structure, IAM Roles section, SSO aliases, prerequisites)
- docs/projects/ark-infra/system/project_overview.md (repo structure with aws/ + modules/, Security Architecture: SSO)
- docs/projects/ark-infra/system/architecture.md (Layer 2: federated access, role tiers, SSM access model)
- docs/projects/ark-infra/system/security.md (full IAM/SSO section, role hierarchy, guardrails, SSM access model, ABAC)
- docs/projects/ark-infra/change-log/last-sync.txt
- docs/projects/ark-infra/change-log/SYNC_HISTORY.md

---

## 2026-04-29 - Documentation Update
**Commit**: `c12813d1c9039a82fe8367f1971a010a1b0e869c`
**Previous Sync**: `ef32279f8e8830ba50b235c4ddf95d0eadeb2aa5`
**Synced By**: update-project skill
**Status**: Completed

**Commits Analyzed**: 21 commits

**Highlights**:
- 🚨 Logging shift: all containers now ship stdout/stderr to AWS CloudWatch via the
  Docker `awslogs` driver (`/ark/${ARK_ENVIRONMENT}` log group, 14-day retention).
  `docker logs` no longer prints output on the host — query CloudWatch instead.
  Manual deploys must export `ARK_ENVIRONMENT` in `.env.ark`.
- VPC: added eu-central-1c subnets (public 10.10.3.0/24, private 10.10.103.0/24);
  3-AZ topology end-to-end (RDS subnet group, Redis subnet group, VPC endpoints).
- VPC: NAT-per-AZ feature flag (`vpc_nat_per_az`, default `true`) with `moved {}` blocks
  to migrate existing singular NAT/route tables; tagged NAT EIPs `ark-nat-az-{a,b,c}-{env}`.
- RDS: Multi-AZ enabled for non-ephemeral envs (~+$28/instance, automatic failover replica),
  Performance Insights enabled (default 7 days, prod 31), automatic backups (default 7,
  prod 30), `track_io_timing` apply method moved to `pending-reboot` (fixes plan drift).
- Redis: `num_cache_clusters = 2` for non-ephemeral envs with `automatic_failover_enabled`
  and `multi_az_enabled` (~+$12/mo for replica).
- EC2: configurable `root_volume_size` (default 60 GB; prod 120 GB);
  `lifecycle { ignore_changes = all }` — instance is treated as a pet for now.
- Compose: arkd / arkd-wallet bumped to v0.9.4 (also v0.9.3 staged earlier) and switched
  to GHCR (`ghcr.io/arkade-os/arkd*`); ECR remains in use for `Ark-DeployService` deploys.
- Compose: Traefik upgraded `v3.0` → `v3.6.14`; JSON log format, `--log.level=INFO`,
  `--accesslog=true`; regtest now `depends_on: arkd`; port 443 published explicitly.
- Compose: cloudflared exposes metrics on `0.0.0.0:20241`; `--loglevel debug` for now.

**Files Updated**:
- docs/INDEX.md (capabilities, tags)
- docs/projects/ark-infra/INDEX.md (frontmatter, networking, env comparison, automatic ops)
- docs/projects/ark-infra/system/project_overview.md (HA/multi-AZ, GHCR note, awslogs)
- docs/projects/ark-infra/system/architecture.md (VPC topology, RDS Multi-AZ, logging)
- docs/projects/ark-infra/system/aws-infrastructure.md (subnets, NAT, RDS, Redis, log group)
- docs/projects/ark-infra/system/networking.md (3-AZ subnets, NAT topology, endpoints)
- docs/projects/ark-infra/sop/monitoring-guide.md (CloudWatch container logs)
- docs/projects/ark-infra/testing/operations.md (CloudWatch log queries, v0.9.4 deploys)
- docs/projects/ark-infra/change-log/last-sync.txt
- docs/projects/ark-infra/change-log/SYNC_HISTORY.md

---

## 2026-02-19 - Documentation Update
**Commit**: `5896359848366feb5e491d2b32788e21bb619557`
**Previous Sync**: `9b1ba0bbbdb201c3b2bf2708c94860ed3ad3110c`
**Synced By**: /update-project command
**Status**: Completed

**Commits Analyzed**: 2 commits

**Changes**:
- ⚠️ Deploy API breaking change: `ImageTag` → `ImageURL` (full image URLs)
- ⚠️ SSM document renamed: `Ark-PullAndRestartService` → `Ark-DeployService`
- Removed `Ark-UpdateEnvAndRestartService` SSM document
- Added remote host port forwarding (RDS database, Redis) via admin dashboard
- Expanded EC2-local port forwarding: added prometheus, alertmanager, loki, jaeger, pyroscope
- Added `scripts/image-pin.sh` for collecting pinned container image digests
- Validator updated to accept both simple tags and full image URLs

**Files Updated**:
- docs/INDEX.md (capabilities, tags)
- docs/projects/ark-infra/system/project_overview.md (features, repo structure)
- docs/projects/ark-infra/system/architecture.md (access methods)
- docs/projects/ark-infra/testing/operations.md (deploy commands, port forwarding, image pinning)
- docs/projects/ark-infra/change-log/last-sync.txt
- docs/projects/ark-infra/change-log/SYNC_HISTORY.md

---

## 2025-12-02 16:00:00 - Documentation Update
**Commit**: `9b1ba0bb` (ark-infra repository)
**Previous Sync**: `(none - initial sync)`
**Synced By**: /update-project command
**Status**: Completed

**Commits Analyzed**: 15 commits (last 60 days)

**Features Added**:
- Ark Admin Web App - Go-based web UI for managing AWS infrastructure via SSM
  - Multi-environment support (prod, staging, regtest)
  - Service deployment with real-time output streaming (SSE)
  - Port forwarding management (Grafana, Traefik, Arkd Admin)
  - Infrastructure overview (EC2, ECR, RDS, Redis)
  - Service health monitoring with auto-refresh
- Makefile improvements:
  - `make use` unified command for environment setup
  - `make taint` for resource recreation
  - `make clean-local-state` for collaborative work

**Bug Fixes**:
- Fixed SSM command execution (#19)
- Fixed Traefik gRPC service discovery (#12)
- Fixed arkd indexer SSE path (/v1/indexer/script/subscription)

**Infrastructure Updates**:
- NBXplorer & KMS Unlocker improvements (#3)
- PostgreSQL snapshot restore support
- OpenTofu collaborative workflow improvements (#11)
- Pinned CloudFlare and OpenTofu versions

**Files Updated**:
- docs/projects/ark-infra/INDEX.md (added sync metadata, Admin Web App, new commands)
- docs/projects/ark-infra/change-log/last-sync.txt
- docs/projects/ark-infra/change-log/SYNC_HISTORY.md

---

## 2025-10-16 12:00:00 - Initial Metadata Setup
**Commit**: ``
**Synced By**: Manual setup
**Status**: Baseline established

**Changes**:
- Added sync metadata to INDEX.md
- Created SYNC_HISTORY.md structure
- Established documentation freshness tracking system

**Notes**:
- This is the initial sync point
- Future syncs will track commits since this baseline
- Use `arkadian-refresh-docs ark-infra` to update after new commits
