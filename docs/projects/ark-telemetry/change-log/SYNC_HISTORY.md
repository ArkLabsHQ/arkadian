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

---

## 2026-05-26 - Ark Go Metrics dashboard: stable uid
**From**: `52a8856524cbb27139b04d9db134a800abc16eac`
**To**: `fc63ce96e470215d94e7e119877701cc5fe9ea46`
**Synced By**: Automated update-project skill

**Commits Analyzed**: 1
- `fc63ce9` Add uid to Ark application metrics dashboard

**Dashboard changes**:
- `dashboards/Ark_Go_metrics.json`: set top-level `uid` to `ark-application-metrics` (previously empty). Gives Grafana a stable identifier so the dashboard keeps the same URL/permalinks across provisioning reloads and can be deep-linked from alerts/annotations.

**No doc-file updates needed**: cosmetic provisioning-metadata change; panels, queries, and behavior are unchanged. `system/dashboards.md` describes panels (not Grafana uids), so no edit required. Only sync tracking is updated.

---

## 2026-06-03 - Jaeger v2 + persistent BadgerDB storage; telemetry-host data-disk alert
**From**: `fc63ce96e470215d94e7e119877701cc5fe9ea46`
**To**: `13fb7db303e7cdfa2eed3efb8165e441676b6063`
**Synced By**: Automated update-project skill

**Commits Analyzed**: 2
- `bde16fb` jaeger: Upgrade to `2.18.0` and store traces on filesystem (#13)
- `13fb7db` Disk usage alert for Telemetry data volume (#12)

**Jaeger upgrade (PR #13)**:
- Image: `jaegertracing/all-in-one:latest` → **`jaegertracing/jaeger:2.18.0`** (Jaeger v2 binary) in both `docker-compose.otel.yaml` and `docker-compose.otel.dev.yaml`
- Container is now config-driven (`command: ["--config", "/etc/jaeger/config.yaml"]`); `COLLECTOR_OTLP_ENABLED=true` env var dropped
- Removed legacy `14250` gRPC collector port; OTLP receivers on `0.0.0.0:4317` (gRPC) and `0.0.0.0:4318` (HTTP) defined in the new config file
- New `jaeger-config.yaml` configures: `jaeger_storage` extension with **BadgerDB** backend (`/badger/key`, `/badger/data`, `ephemeral: false`, `ttl.spans: 72h`); `jaeger_query` extension reading the same store; OTLP receiver → `batch` processor → `jaeger_storage_exporter` pipeline
- New named volume `jaeger_data` mounted at `/badger` for trace persistence across restarts
- New **`jaeger-init` sidecar** (same image, `user: root`) that creates `/badger/{key,data}` and chowns to UID `10001` before jaeger starts (`depends_on … service_completed_successfully`)

**Alerting (PR #12)**:
- `prometheus.alert.rules.yml`: previous `DataDiskHighUsage` (app-only) **renamed to `DataDiskHighUsage_App`**, and a new **`DataDiskHighUsage_Telemetry`** alert added for `mountpoint="/mnt/data",host_role="telemetry"` (5m, severity `warning`). Closes the gap left by PR #9, where the telemetry host's `/mnt/data` had no usage alert — now needed because Jaeger persists traces there via the `jaeger_data` volume.

**Doc-file updates**:
- `INDEX.md` — Alert Rules section: `DataDiskHighUsage` → `DataDiskHighUsage_App` / `DataDiskHighUsage_Telemetry`
- `system/alert-rules.md` — renamed section, added telemetry variant YAML
- `system/components.md` — Jaeger section rewritten: v2 image, OTLP `:4317`/`:4318` receivers, BadgerDB storage, 72h TTL, `jaeger-init` sidecar; legacy `14250` / `COLLECTOR_OTLP_ENABLED` references removed
- `system/configuration.md` — pinned-versions table extended with `jaeger` + `jaeger-init` (PR #13); added "Jaeger (jaeger-config.yaml)" config section; volume list adds `jaeger_data` and `pyroscope_data`
- `sop/jaeger-manual.md` — added PR #13 note at top covering version, persistence and OTLP-direct receiver
- master `docs/INDEX.md` — `ark-telemetry` entry: Jaeger capability bullet expanded with v2/BadgerDB/72h-TTL details; alert-rules bullet calls out the new per-host `DataDiskHighUsage_*` split

---

## 2026-06-04 - Alertmanager: throttle info-level Slack duplicates
**From**: `13fb7db303e7cdfa2eed3efb8165e441676b6063`
**To**: `18a32c6d40fbc58f4ef59a2d3324e5a898feb8c2`
**Synced By**: Automated update-project skill

**Commits Analyzed**: 1
- `18a32c6` Remove info duplicate alerts (#14)

**Alertmanager routing change (PR #14)**:
- `alertmanager.yml.tmpl`: on the `severity = info` route (→ `slack-notifications-info` receiver), `group_interval` raised from **`1s` → `30s`**. `group_wait: 0s` and `repeat_interval: 1m` unchanged. With the prior 1-second group interval, info-level alerts (e.g. round-finalized notifications) were re-fanned into Slack almost immediately after each firing, producing duplicate messages; 30s gives Alertmanager a real window to batch them into a single group update.

**No doc-file updates needed**: route-timer values are not documented in `system/configuration.md` (only generic examples are shown), `system/alert-rules.md` (rule definitions only, not routing), or `INDEX.md`. Master `docs/INDEX.md` `ark-telemetry` entry — capabilities, tags, dependencies — is unaffected. Only sync tracking is updated.

---

## 2026-06-06 - Resource limit override files for t3.small / t3.medium
**From**: `18a32c6d40fbc58f4ef59a2d3324e5a898feb8c2`
**To**: `dbf9aeea2359c794d0d29e29266746e520ac2541`
**Synced By**: Automated update-project skill

**Commits Analyzed**: 1
- `dbf9aee` Resource limit override configuration

**Compose changes**:
- New `docker-compose.resources.small.yaml` — memory limits sized for **t3.small (2GB RAM)**: otel-collector 256m, cadvisor 128m, prometheus 400m, grafana 350m, alertmanager 64m, loki 400m, jaeger 256m, pyroscope 256m
- New `docker-compose.resources.medium.yaml` — memory limits sized for **t3.medium (8GB RAM)**: otel-collector 512m, cadvisor 256m, prometheus 2g, grafana 512m, alertmanager 256m, loki 1536m, jaeger 1g, pyroscope 1g
- Both are pure overrides (only `deploy.resources.limits.memory`); apply with `-f docker-compose.otel.yaml -f docker-compose.resources.<class>.yaml`. The base compose file remains unconstrained.

**Doc-file updates**:
- `system/configuration.md` — "Resource Limits" section: replaced the stale "Currently unlimited" lead with a table of per-service memory limits for both override files and how to layer them onto the base compose command
- master `docs/INDEX.md` — `ark-telemetry` capabilities: added bullet for the new per-host-class memory-limit override files

---

## 2026-06-07 - Ark Go dashboard: CPU panel unit fix (`percentunit` → `percent`)
**From**: `dbf9aeea2359c794d0d29e29266746e520ac2541`
**To**: `6f3164755e7a5ed23037f98db688a860b90c3e5c`
**Synced By**: Automated update-project skill

**Commits Analyzed**: 1
- `6f31647` fix: Display Ark Go CPU metric as a percent

**Dashboard fix**:
- `dashboards/Ark_Go_metrics.json`: CPU utilization panel `fieldConfig.defaults.unit` changed from `percentunit` to `percent`. The underlying query returns a 0–100+ percentage value (100% = one full core, >100% = multi-core), but `percentunit` tells Grafana to interpret the value as a 0–1 fraction and multiply by 100 for display — so the panel was rendering values 100× too high. `percent` is the correct unit for an already-scaled percentage. Panel description text is unchanged.

**No doc-file updates needed**: pure Grafana display-unit fix; no new capability, query, panel, alert, or behavior. `system/dashboards.md` describes the Ark Go dashboard in terms of Go-runtime panels (goroutines, heap, GC) and does not document panel units; master `docs/INDEX.md` `ark-telemetry` capabilities bullet ("Grafana dashboards …") is unaffected. Only sync tracking is updated.

---

## 2026-06-09 - Tighten small resource profile; rename medium → large
**From**: `6f3164755e7a5ed23037f98db688a860b90c3e5c`
**To**: `3b6d6864f82cf4ab858a730b94132a36de09f6d8`
**Synced By**: Automated update-project skill

**Commits Analyzed**: 1
- `3b6d686` Tighten small resource profile and rename medium -> large (#16)

**Compose changes**:
- Renamed `docker-compose.resources.medium.yaml` → `docker-compose.resources.large.yaml`; in-file comment updated from "Resource limits for t3.medium (8GB RAM)" → "Resource limits for t3.large (8GB RAM)". Memory values inside the file unchanged (otel 512m, cadvisor 256m, prometheus 2g, grafana 512m, alertmanager 256m, loki 1536m, jaeger 1g, pyroscope 1g). Rationale: the previous `medium` filename was a misnomer — the values were sized for a t3.large (2 vCPU / 8GB), not a t3.medium (2 vCPU / 4GB).
- `docker-compose.resources.small.yaml`: file-header comment tightened to "t3.small (2GB RAM, ~1.5GB available after OS overhead)". Per-service memory limits reduced across the board to fit the ~1.5GB available envelope: otel-collector 256m→**192m**, cadvisor 128m→**96m**, prometheus 400m→**300m**, grafana 350m→**256m**, alertmanager 64m→**48m**, loki 400m→**300m**, jaeger 256m→**192m**, pyroscope 256m→**128m**. New total: ~1552m (was ~2080m).

**Doc-file updates**:
- `system/configuration.md` — "Resource Limits" table: renamed the `medium` row to `large` (t3.medium → t3.large) and updated the `small` row to the new tightened memory limits and the "~1.5GB available after OS overhead" host note.
- master `docs/INDEX.md` — `ark-telemetry` capabilities bullet: renamed `docker-compose.resources.medium.yaml` (t3.medium/8GB) → `docker-compose.resources.large.yaml` (t3.large/8GB).
- Project `INDEX.md` unaffected — does not reference the per-class override filenames.

**Breaking change for operators**: anyone composing with `-f docker-compose.resources.medium.yaml` must switch to `-f docker-compose.resources.large.yaml`; the old filename no longer exists.

