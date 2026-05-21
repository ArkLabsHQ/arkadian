# Documentation Sync History - Ark Telemetry

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
- Use `arkadian-refresh-docs ark-telemetry` to update after new commits

---

## 2026-05-13 - PR #9: Migrate Telemetry to standalone EC2 instance
**From**: `a94118b0b1454b9cb36abfbe78a48f0cb4ac429d`
**To**: `17f93753f7e2a591f91640903b7f9d5d0215605e`
**Synced By**: Automated update-project skill

**Commits Analyzed**: 1 (squash-merged PR #9)

**Operational changes**:
- Telemetry stack now deployed on a **standalone EC2 instance**, decoupled from the arkd application host
- Removed external Docker networks (`nigiri`, `ark`) from compose files — stack runs on its own default network
- Container images **pinned**: `otel-collector:0.151.0`, `cadvisor:0.56.2`
- New `.env.ark-telemetry` env file consumed by Grafana (template added: `.env.ark-telemetry.example`)
- **Grafana**: Google OAuth/SSO enabled via `GF_AUTH_GOOGLE_*` env vars; admin password via `GF_SECURITY_ADMIN_PASSWORD`
- **Port exposure changed** (no longer localhost-only): OTLP `4317`/`4318`, Alertmanager `9093`, Grafana `3000` (via ALB), Pyroscope `4040` (ingestion)

**Metrics & alerting changes**:
- OTel collector now adds `host.role=telemetry` resource attribute to local hostmetrics; `resource_to_telemetry_conversion` enabled in Prometheus exporter
- Split collector pipeline: `metrics/local` (hostmetrics → telemetry-labeled) vs `metrics` (OTLP from app)
- Prometheus cadvisor scrape labelled `host_role=telemetry`
- Alert rules **split by host role**:
  - `HighMachineCPUUsage` → `HighCPUUsage_App` + `HighCPUUsage_Telemetry`
  - `HighMachineMemoryUsage` → `HighMemoryUsage_App` + `HighMemoryUsage_Telemetry`
  - `RootDiskHighUsage` → `RootDiskHighUsage_App` + `RootDiskHighUsage_Telemetry`
  - `DataDiskHighUsage` now scoped to `host_role=app`
- All alerts carry a `host_role` label for routing

**Dashboard changes**:
- `Host_metrics.json`: segments by `host_role`; CPU utilization fixed for arbitrary CPU counts (no more hard-coded 16 cores); filesystem gauge collapsed to 1 with min/max percentages
- `Cadvisor_exporter.json`: filtered by `host_role`

---

## 2026-05-21 - Loki: ArkdVtxoUnrolled alert surfaces VTXO ID
**From**: `17f93753f7e2a591f91640903b7f9d5d0215605e`
**To**: `52a8856524cbb27139b04d9db134a800abc16eac`
**Synced By**: Automated update-project skill

**Commits Analyzed**: 1
- `52a8856` loki: Add VTXO id to unrolled alert copy

**Alert changes**:
- `ArkdVtxoUnrolled` (loki.alert.rules.yml) now applies `regexp "(?i)vtxo (?P<vtxo_id>\S+) unrolled"` to extract the unrolled VTXO outpoint and groups `count_over_time(...)` by the new `vtxo_id` label
- Annotation `description` now renders the specific outpoint: `VTXO `{{ $labels.vtxo_id }}` has been unrolled (spent unilaterally onchain).`
- `logql_query` annotation updated to include the same regexp so the linked Grafana Explore query reproduces the label extraction

**No doc-file updates needed**: alert was not previously documented in `system/alert-rules.md`; only sync tracking is updated.
