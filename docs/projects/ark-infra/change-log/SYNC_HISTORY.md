# Documentation Sync History - Ark Infra

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
