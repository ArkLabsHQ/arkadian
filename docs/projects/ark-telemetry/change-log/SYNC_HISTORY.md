# Documentation Sync History - Ark Telemetry

## 2026-07-16 - Pin container images and install Grafana plugins from catalog
**From**: `d0eb7581fcf8a60d824b1bd2793c54a9a350b45c`
**To**: `bae4ed65954d7e29aad391bd60345f32a8f2bcaa`
**Synced By**: Automated update-project skill

**Commits Analyzed**: 1
- `bae4ed6` fix: Install Grafana Loki plugin from catalog and pin all images

**Changes**:
- `docker-compose.otel.yaml`: pinned previously-`:latest` service images to explicit versions — `prom/prometheus:v3.13.1`, `grafana/grafana:13.1.0`, `prom/alertmanager:v0.33.1`, `grafana/loki:3.7.3`, `grafana/pyroscope:2.1.1`.
- `docker-compose.otel.yaml` & `docker-compose.otel.dev.yaml`: `GF_INSTALL_PLUGINS` no longer side-loads `grafana-lokiexplore-app` from the `integration-artifacts` zip; both plugins (`grafana-lokiexplore-app`, `grafana-pyroscope-app`) are now installed from the Grafana catalog (version-matched to the pinned Grafana image). The old zip build (React-18, 1.0.14) failed to load under Grafana 13's React 19 (`Cannot read properties of undefined (ReactCurrentOwner)`).

**Docs updated**:
- `system/configuration.md` — added prometheus/grafana/alertmanager/loki/pyroscope rows to the Pinned Container Versions table
- `system/components.md` — expanded the `GF_INSTALL_PLUGINS` env-var description to reflect catalog install and the React-19 rationale
- `docs/INDEX.md` (master) — extended the Docker Compose stack capability bullet with the pinned image versions and catalog-based plugin install

**Notes**:
- Config-only, non-breaking change. No capability, dependency, or tag changes. Version pinning stabilizes the upgrade path; catalog install fixes the Loki Explore plugin load failure under Grafana 13.

## 2026-07-07 - PR #24: Ark Channelz gateway proxy dashboard
**From**: `71c21a1747b8893a31fc4e4c5a7d61253a36f836`
**To**: `d0eb7581fcf8a60d824b1bd2793c54a9a350b45c`
**Synced By**: Automated update-project skill

**Commits Analyzed**: 1 (squash-merged PR #24)
- `d0eb758` Dashboard for ark-metrics Channelz data (#24)

**Changes**:
- Added a new Grafana dashboard `dashboards/Ark_Channelz.json` ("Ark Channelz — Gateway Proxy", uid `ark-channelz-gateway`) with 8 panels visualizing HTTP/2 stream utilization on the arkd gRPC gateway proxy. Prometheus-backed, driven by the `ark_channelz_unary_active_streams` and `ark_channelz_stream_pool_active_streams` metrics exported by ark-metrics scraping arkd channelz. Panels cover active streams (overview, per-connection), utilization % against the 1000-stream `MaxConcurrentStreams` budget, and stat tiles (unary/stream-pool active streams, peak utilization, active pool connections).

**Docs updated**:
- `system/dashboards.md` — overview count updated "five" → "six"; added a new "6. Ark Channelz — Gateway Proxy" section documenting all 8 panels and their queries
- `docs/projects/ark-telemetry/INDEX.md` — added the dashboard to the Available Dashboards list
- `docs/INDEX.md` (master) — extended the Grafana dashboards capability bullet with the Channelz dashboard; added `channelz`, `grpc-gateway` tags

**Notes**:
- Dashboard-only, additive change — no new dependencies or breaking changes.

## 2026-07-03 - Jaeger span TTL 72h → 48h
**From**: `f65ac4cdcc0d22bb844701e518bee35edc89cd64`
**To**: `71c21a1747b8893a31fc4e4c5a7d61253a36f836`
**Synced By**: Automated update-project skill

**Commits Analyzed**: 1
- `71c21a1` jaeger: Drop TTL from 72h to 48h

**Changes**:
- `jaeger-config.yaml`: BadgerDB storage extension span retention TTL reduced from `72h` to `48h`.

**Docs updated**:
- `system/components.md` — Jaeger TTL bullet updated to `48h`
- `system/configuration.md` — jaeger-config.yaml description updated to `48h span TTL`
- `sop/jaeger-manual.md` — PR #13 note updated to `48h span TTL`
- `docs/INDEX.md` (master) — Jaeger capability bullet updated to `48h span TTL`

**Notes**:
- Config-only, non-breaking change. Traces now retained 48h instead of 72h; no capability, dependency, or tag changes.

## 2026-07-01 - PR #23: VTXOs by signer key dashboard pane
**From**: `f7c2a5a8007eafb6d6f0e49287887523e57a2ac2`
**To**: `f65ac4cdcc0d22bb844701e518bee35edc89cd64`
**Synced By**: Automated update-project skill

**Commits Analyzed**: 1 (squash-merged PR #23)
- `f65ac4c` VTXOs by signer key pane (#23)

**Changes**:
- Added a new "Signer Key VTXO Usage" panel to the Ark Go Metrics dashboard (`dashboards/Ark_Go_metrics.json`). Unlike the existing Loki client-compatibility panels, this panel is **Prometheus-backed** and plots the `ark_signer_key_matched` metric — the number of active VTXOs matched per signer pubkey. Rendered as stacked bars with a multi-value tooltip, series labelled by `pubkey` (`legendFormat: {{pubkey}}`). Intended to track signer key rotation progress.

**Docs updated**:
- `system/dashboards.md` — documented the new "Signer Key VTXO Usage" panel and added a matching use case under Ark Go Metrics
- `docs/INDEX.md` (master) — extended the Grafana dashboards capability bullet to note the new signer-key VTXO panel

**Notes**:
- Dashboard-only, additive change — no new dependencies or breaking changes.

## 2026-06-30 - Disable ArkdMissingClientVersion Loki alert
**From**: `dc280ac35f6f2589f160d49c8aa3e5a5f2d422e7`
**To**: `f7c2a5a8007eafb6d6f0e49287887523e57a2ac2`
**Synced By**: Automated update-project skill

**Commits Analyzed**: 1
- `f7c2a5a` loki: Disable missing `x-build-version` alert

**Changes**:
- The `ArkdMissingClientVersion` Loki alert (`loki.alert.rules.yml`) was commented out / disabled. It no longer fires. The rule body is unchanged (still present as a comment), and the `slack-notifications-info` AlertManager route matcher (`alert_type =~ "client_compatibility"`) is untouched. Client build-version adoption remains observable via the "Requests by Build Version" Grafana dashboard panel.

**Docs updated**:
- `system/alert-rules.md` — marked `ArkdMissingClientVersion` section **[DISABLED]**, commented the YAML config block, updated "When It Fires"
- `system/project_overview.md` — alerting bullet now notes the alert is disabled; `ArkdDigestMismatch` is the active client-compatibility alert
- `system/configuration.md` — client-compatibility route note clarified: only `ArkdDigestMismatch` is active; `ArkdMissingClientVersion` disabled but route matcher retained
- `INDEX.md` (project) — `ArkdMissingClientVersion` bullet marked *(disabled June 2026)*
- `docs/INDEX.md` (master) — ark-telemetry client-compatibility capability bullet updated to reflect the disabled alert

**Notes**:
- Configuration/alert-rule change only — no new capabilities, dependencies, or breaking changes. The alert can be re-enabled by uncommenting the rule.

## 2026-06-24 - PR #22: DIGEST_MISMATCH queries search structured metadata
**From**: `42fccfdb567ead2e5eae7906add19f5f3c6f825e`
**To**: `dc280ac35f6f2589f160d49c8aa3e5a5f2d422e7`
**Synced By**: Automated update-project skill

**Commits Analyzed**: 1 (squash-merged PR #22)

**Changes**:
- `ArkdDigestMismatch` Loki alert (`loki.alert.rules.yml`) and the "Digest Mismatch Errors" dashboard panel (`dashboards/Ark_Go_metrics.json`) now match on the structured-metadata `error` label (`| error =~ "DIGEST_MISMATCH.*"`) instead of a raw log-line filter (`|~ "DIGEST_MISMATCH"`). Both the `expr` and the `logql_query` annotation were updated.

**Docs updated**:
- `system/alert-rules.md` — updated `ArkdDigestMismatch` `expr` + `logql_query`, added PR #22 note
- `system/dashboards.md` — updated Digest Mismatch Errors panel query
- `docs/INDEX.md` — noted the structured-metadata query change in the ark-telemetry capabilities

**Notes**:
- No new capabilities, dependencies, or breaking changes — query-syntax refinement only.

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

---

## 2026-06-12 - cAdvisor restart policy; small-profile memory rebalance toward Grafana
**From**: `3b6d6864f82cf4ab858a730b94132a36de09f6d8`
**To**: `af3fbb2762e527a265648cd9d036e73a86f01e8c`
**Synced By**: Automated update-project skill

**Commits Analyzed**: 2
- `879f813` grafana: More memory for small resource profile
- `af3fbb2` cadvisor: Restart service

**Compose changes**:
- `docker-compose.otel.yaml`: cadvisor gains `restart: unless-stopped` — it was the only service in the base compose file without a restart policy, so a crash (e.g. OOM-kill under the new tighter 64m limit) left it down until manual intervention. All 8 services now restart automatically.
- `docker-compose.resources.small.yaml` (t3.small profile): memory rebalanced toward Grafana, total unchanged at ~1552m — grafana 256m→**384m** (+128m), funded by cadvisor 96m→**64m**, prometheus 300m→**256m**, loki 300m→**256m**. Unchanged: otel-collector 192m, alertmanager 48m, jaeger 192m, pyroscope 128m. The large profile is untouched.

**Doc-file updates**:
- `system/configuration.md` — "Resource Limits" table: small-profile row updated to the new per-service values (cadvisor 64m, prometheus 256m, grafana 384m, loki 256m).
- Master `docs/INDEX.md` unaffected — the `ark-telemetry` capabilities bullet names the override files but not per-service values, and restart policies are not indexed. Project `INDEX.md` also does not reference these values. Only the configuration table and sync tracking are updated.


## 2026-06-17 - PR #17: Build version / client compatibility alerts
**From**: `531b46e36b922dca8bb6bfa1ff92f0b315baf965`
**To**: `646d4e9bd38b15e6b10ed796f41313c5114dfc53`
**Synced By**: Automated update-project skill

**Commits Analyzed**: 1 (squash-merged PR #17 — `646d4e9` "Build version alerts")

**Alerting changes** (`loki.alert.rules.yml`):
- New Loki log-based alert **`ArkdDigestMismatch`** (severity `warning`, `alert_type: client_integrity`): fires when `DIGEST_MISMATCH` errors appear in arkd `ark.v1.ArkService` logs over the last hour — clients sending invalid/missing digest headers.
- New Loki log-based alert **`ArkdMissingClientVersion`** (severity `info`, `alert_type: client_compatibility`): fires when requests arrive without a populated `x-build-version` header in the last hour — clients not yet on v0.9.9+.

**Routing changes** (`alertmanager.yml.tmpl`):
- New route matching `alert_type =~ "client_integrity|client_compatibility"` → receiver `slack-notifications-info`, observational hourly cadence (`group_wait: 0s`, `group_interval: 30s`, `repeat_interval: 1h`).

**Dashboard changes** (`dashboards/Ark_Go_metrics.json`):
- Three new Loki-backed panels (datasource uid `loki`): **Digest Mismatch Errors**, **Requests Missing Client Version**, and **Requests by SDK Version** (grouped by the `x-sdk-version` header).

**Datasource changes** (`provisioning/datasources/loki.yaml`):
- Loki datasource pinned to a stable `uid: loki` (so dashboard panels can reference it), with a `deleteDatasources` cleanup block removing any pre-existing `Loki` datasource first.

**Doc-file updates**:
- `system/alert-rules.md` — added "Client Compatibility Alerts" section documenting `ArkdDigestMismatch` and `ArkdMissingClientVersion`.
- `system/dashboards.md` — documented the three new client-compatibility panels under Ark Go Metrics.
- `system/configuration.md` — documented the new Alertmanager client-compatibility route and the pinned Loki datasource UID.
- `system/project_overview.md` — added client compatibility alerts to the Proactive Alerting feature list.
- Project `INDEX.md` — added the two client compatibility alerts to the Alert Rules quick reference.
- Master `docs/INDEX.md` — added a client compatibility/integrity capability bullet to `ark-telemetry`.

---

## 2026-06-18 - Ark Go dashboard: missing-SDK series + configurable aggregation window
**From**: `646d4e9bd38b15e6b10ed796f41313c5114dfc53`
**To**: `cd92c3bcc2126d34a5e874f4f32f510fe68c9c6f`
**Synced By**: Automated update-project skill

**Commits Analyzed**: 2 (dashboard-only; both touch `dashboards/Ark_Go_metrics.json`)
- `f2e66f7` Graph missing `x-sdk-version` requests alongside SDK versions (#19)
- `cd92c3b` loki: Add configurable window to metric panels (#20)

**Dashboard changes** (`dashboards/Ark_Go_metrics.json`):
- **PR #19**: the **Requests by SDK Version** panel gains a second target (refId `B`, legend `missing`) — `sum(count_over_time({service_name="arkd"} |~ "method=/ark.v1.ArkService/" !~ "x-sdk-version" [5m]))` — so requests arriving with no `x-sdk-version` header are graphed alongside the per-version breakdown rather than being invisible.
- **PR #20**: added a custom dashboard template variable `window` (`templating.list`; label "Window", default `5m`, options `1m,5m,15m,1h`) and replaced the hardcoded `[5m]` aggregation window with `[$window]` in all four Loki client-compatibility queries (Digest Mismatches, Missing Version, Requests by SDK Version + its new `missing` series). Lets operators rescale the count window without editing the dashboard.

**Doc-file updates**:
- `system/dashboards.md` — Client Compatibility Panels section: queries updated to `[$window]`, added the new `missing` SDK series, and noted the `$window` variable; "Variables and Templates" section: documented the new **Window** variable on the Ark Go Metrics dashboard.
- Master `docs/INDEX.md` — `ark-telemetry` client-compatibility capability bullet: noted the `missing` SDK-header series (PR #19) and the selectable `$window` aggregation window (PR #20).

**Not updated**: Project `INDEX.md` "Available Dashboards" lists dashboards by name only (no per-panel detail), so no change needed. These are dashboard-display refinements — no new stack capability, alert, route, or config — so `components.md`, `configuration.md`, `alert-rules.md`, and `project_overview.md` are unaffected.

---

## 2026-06-19 - Ark Go dashboard: segment client requests by `x-build-version`
**From**: `cd92c3bcc2126d34a5e874f4f32f510fe68c9c6f`
**To**: `42fccfdb567ead2e5eae7906add19f5f3c6f825e`
**Synced By**: Automated update-project skill

**Commits Analyzed**: 1 (dashboard-only; touches `dashboards/Ark_Go_metrics.json`)
- `42fccfd` Segment client requests pane by `x-build-version` (#21)

**Dashboard changes** (`dashboards/Ark_Go_metrics.json`):
- **PR #21**: the former **Requests Missing Client Version** panel is renamed to **Requests by Build Version** and re-segmented. Its single "Missing Version" target is replaced by a per-version breakdown grouped by the `x-build-version` header (refId `A`, legend `{{build_version}}`) — `sum by (build_version) (count_over_time({service_name="arkd"} |~ "method=/ark.v1.ArkService/" |~ "x-build-version" | regexp "x-build-version.{3}(?P<build_version>[^\"]+)" [$window]))` — plus a second target (refId `B`, legend `missing`) for requests with no `x-build-version` header — `sum(count_over_time({service_name="arkd"} |~ "method=/ark.v1.ArkService/" !~ "x-build-version" [$window]))`. Panel description updated to "Count of requests by x-build-version header." This mirrors the existing **Requests by SDK Version** panel structure (PR #19), turning a missing-only counter into a full adoption breakdown of v0.9.9+.

**Doc-file updates**:
- `system/dashboards.md` — Client Compatibility Panels section: replaced the "Requests Missing Client Version" bullet with the renamed **Requests by Build Version** panel, documenting both the per-`build_version` query and the `missing` series.
- Master `docs/INDEX.md` — `ark-telemetry` client-compatibility capability bullet: panel re-described as request volume by `x-build-version` (re-segmented with a `missing` series in PR #21) rather than missing-version requests.

**Not updated**: The `ArkdMissingClientVersion` alert rule (`alert-rules.md`, project `INDEX.md`) is untouched by this PR — it remains a separate Loki alert independent of the dashboard panel. Project `INDEX.md` "Available Dashboards" lists dashboards by name only, so no change needed. No new stack capability, alert, route, or config — so `components.md`, `configuration.md`, `alert-rules.md`, and `project_overview.md` are unaffected.

---
