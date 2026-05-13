# Documentation Sync History - Ark Infra

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
