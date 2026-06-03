---
project_id: ark-telemetry
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_run.md"]
  dev:        ["sop/adding-alerts.md", "sop/adding-dashboards.md"]
  monitoring: ["sop/monitoring-guide.md", "system/alert-rules.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md", "testing/how_to_run.md"]
  alerts: ["system/alert-rules.md", "sop/adding-alerts.md"]
  dashboards: ["system/dashboards.md", "sop/adding-dashboards.md"]
scripts:
  compose_up: "make docker-run"
  compose_stop: "make docker-stop"
  compose_dev: "make docker-run-dev"
  backup_dashboards: "make backup_grafana"
---

# Ark Telemetry — Project Index

**ark-telemetry** provides an integrated observability stack for Ark with OpenTelemetry Collector as the central hub for metrics, traces, and logs.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/ark-telemetry/system/` — System Architecture & Components
Core documentation about the telemetry stack:

- **${ARKADIAN_DIR}/docs/projects/ark-telemetry/system/project_overview.md** — — What ark-telemetry is and how it works
- **${ARKADIAN_DIR}/docs/projects/ark-telemetry/system/architecture.md** — — System architecture with OpenTelemetry as central hub
- **${ARKADIAN_DIR}/docs/projects/ark-telemetry/system/components.md** — — Detailed component descriptions (Prometheus, Grafana, Loki, Jaeger, etc.)
- **${ARKADIAN_DIR}/docs/projects/ark-telemetry/system/configuration.md** — — Configuration files and environment variables
- **${ARKADIAN_DIR}/docs/projects/ark-telemetry/system/alert-rules.md** — — Alert rule definitions and strategies
- **${ARKADIAN_DIR}/docs/projects/ark-telemetry/system/dashboards.md** — — Available dashboards and their purposes

### `${ARKADIAN_DIR}/docs/projects/ark-telemetry/testing/` — Usage & Operations
Practical guides for running and using the stack:

- **${ARKADIAN_DIR}/docs/projects/ark-telemetry/testing/usage.md** — — Quick start and common operations
- **${ARKADIAN_DIR}/docs/projects/ark-telemetry/testing/how_to_run.md** — — Starting the stack, configuration, and setup
- **${ARKADIAN_DIR}/docs/projects/ark-telemetry/testing/troubleshooting.md** — — Common issues and debugging

### `${ARKADIAN_DIR}/docs/projects/ark-telemetry/sop/` — Standard Operating Procedures
Step-by-step guides for telemetry operations:

- **${ARKADIAN_DIR}/docs/projects/ark-telemetry/sop/adding-alerts.md** — — How to add new alert rules
- **${ARKADIAN_DIR}/docs/projects/ark-telemetry/sop/adding-dashboards.md** — — How to create and modify dashboards
- **${ARKADIAN_DIR}/docs/projects/ark-telemetry/sop/configuring-correlation.md** — — How configuring and using Grafana data source correlation
- **${ARKADIAN_DIR}/docs/projects/ark-telemetry/sop/monitoring-guide.md** — — Best practices for monitoring Ark
- **${ARKADIAN_DIR}/docs/projects/ark-telemetry/sop/pyroscope-manual.md** — — Quick reference for querying Pyroscope profiles during investigation workflows

### `${ARKADIAN_DIR}/docs/projects/ark-telemetry/tasks/` — Product Requirements & Plans
Feature specifications and implementation tracking.

### `${ARKADIAN_DIR}/docs/projects/arkd/change-log/` — Recent Changes
Curated summaries of significant changes to the stack.

### `${ARKADIAN_DIR}/docs/projects/arkd/pr-report/` — Pull Request Summaries
Analysis and summaries of pull requests.

---

## Key Concepts

### OpenTelemetry Collector
Central hub for all observability data:
- Receives metrics and traces from Ark services (OTLP gRPC/HTTP)
- Scrapes host metrics (CPU, memory, disk, network)
- Processes and exports to Prometheus, Loki, and Jaeger

### Prometheus
Time-series database for metrics:
- Scrapes metrics from OpenTelemetry Collector and cAdvisor
- Evaluates alert rules
- Stores 15 days of metrics data
- Powers Grafana dashboards

### Grafana
Visualization and dashboards:
- Pre-configured dashboards for Ark, host, and containers
- Loki integration for log exploration
- Jaeger integration for trace visualization
- Default home: Host Metrics dashboard

### Alertmanager
Alert routing and notifications:
- Receives alerts from Prometheus
- Routes to Slack (configurable webhook)
- Supports grouping, inhibition, and silencing

### Loki
Log aggregation system:
- Receives logs from OpenTelemetry Collector
- Queryable via Grafana
- Integrated with Grafana Explore

### Jaeger
Distributed tracing:
- Receives traces from OpenTelemetry Collector
- Visualizes request flows through Ark services
- Trace search and analysis

### cAdvisor
Container metrics:
- Collects detailed container-level metrics
- Scraped directly by Prometheus
- Powers container dashboards

---

## Quick Reference

### Starting the Stack
```bash
# Configure (copy and edit)
cp .env.ark-telemetry.example .env.ark-telemetry
# Set SLACK_API_URL, SLACK_CHANNEL, GF_SECURITY_ADMIN_PASSWORD,
# GF_SERVER_ROOT_URL, and Google OAuth (GF_AUTH_GOOGLE_*) variables

# Production
make docker-run

# Development mode
make docker-run-dev

# Stop stack
make docker-stop
```

### Service Endpoints

As of PR #9 the stack runs on a **standalone EC2 instance**. Ports are exposed publicly (the host's security group / ALB controls access), not bound to localhost:
- **Grafana**: `:3000` — fronted by an ALB; Google SSO enabled
- **OpenTelemetry Collector**: gRPC `:4317`, HTTP `:4318` — receives OTLP from the app instance
- **Alertmanager**: `:9093`
- **Pyroscope**: `:4040` — profile ingestion endpoint
- **Prometheus**: `:9090` (internal)
- **Loki**: `:3100` (internal)
- **Jaeger**: `:16686` (internal)
- **cAdvisor**: container-internal `:8080`
- **OTel Prometheus exporter**: `127.0.0.1:8889` (localhost-only)

### Available Dashboards
- **Host Metrics** — CPU, memory, disk, network — segmented by `host_role` (default home)
- **Ark Go Metrics** — Runtime metrics for Ark services
- **Cadvisor Exporter** — Docker container resource usage, filtered by `host_role`
- **RPC Latency** — gRPC request latencies
- **RPC Request/Response Size** — Message sizes

### Alert Rules
Alerts are split by `host_role` (`app` vs `telemetry`):
- **HighCPUUsage_App** / **HighCPUUsage_Telemetry** — CPU >70% for 2 min
- **HighMemoryUsage_App** / **HighMemoryUsage_Telemetry** — RAM >85% for 2 min
- **RootDiskHighUsage_App** / **RootDiskHighUsage_Telemetry** — `/` >70% for 5 min
- **DataDiskHighUsage_App** / **DataDiskHighUsage_Telemetry** — `/mnt/data` >70% for 5 min (PR #12 added telemetry variant; alert was previously `DataDiskHighUsage`, app-only)
- **ServiceMissing** — Ark service stopped exporting metrics

---

## Integration with Ark

### Ark Configuration
To send telemetry to this stack, configure Ark services:

```bash
# arkd with OpenTelemetry
export ARKD_OTEL_COLLECTOR_ENDPOINT=http://localhost:4317
export ARKD_OTEL_SERVICE_NAME=arkd
export ARKD_OTEL_INSECURE=true

# Metrics, traces, and logs flow to OpenTelemetry Collector
```

### Data Flow
```
Ark Services → OpenTelemetry Collector → {Prometheus, Loki, Jaeger}
                                          ↓
                                       Grafana (visualization)
                                       Alertmanager (alerts)
```

---

## Documentation Size Guidelines

To keep context lean for Claude agents:

- **usage/how-to**: ≤ 100-120 lines
- **component descriptions**: 400-700 words
- **configuration guide**: 400-800 words
- **SOP procedures**: ≤ 120 lines

Keep files focused and cross-reference when needed.
