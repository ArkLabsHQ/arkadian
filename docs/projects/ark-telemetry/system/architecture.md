# Ark Telemetry Architecture

## Overview

Ark-telemetry implements a modern observability architecture with the OpenTelemetry Collector as the central telemetry hub. This design follows the "collector-as-gateway" pattern, where all metrics, logs, and traces flow through a single point before being routed to their appropriate backends.

**Deployment topology (PR #9, May 2026):** the stack runs on a **standalone EC2 instance** ("telemetry host"), separate from the application instance ("app host") that runs arkd and friends. The OTel Collector exposes its OTLP endpoints publicly (port 4317/4318), so the app host pushes telemetry over the network. Local hostmetrics scraped on the telemetry host carry `host.role=telemetry`; OTLP arriving from the app host carries `host.role=app` (set by the app-side instrumentation). All metrics retain this `host_role` label for routing, dashboards, and alerts.

## Architectural Principles

### Hub-and-Spoke Design

The OpenTelemetry Collector acts as the hub, with spokes connecting to:
- Data sources (Ark application, host system)
- Storage backends (Prometheus, Loki, Jaeger)
- Visualization tools (Grafana)
- Notification systems (Alertmanager)

This centralized approach provides:
- Simplified client configuration (Ark only needs to know about the OTel Collector)
- Flexibility to add or change backends without reconfiguring clients
- Centralized data processing and enrichment
- Single point for access control and rate limiting

### Separation of Concerns

Each component has a specific responsibility:
- **Collection**: OpenTelemetry Collector, cAdvisor
- **Storage**: Prometheus (metrics), Loki (logs), Jaeger (traces)
- **Analysis**: Prometheus (queries), Grafana (visualization)
- **Alerting**: Prometheus (evaluation), Alertmanager (notification)

This separation allows each tool to excel at its specific task and makes the system easier to understand, operate, and scale.

## Data Flow

### Metrics Pipeline

```
[App host]
  Ark Application (OTLP) ───────────────► OpenTelemetry Collector ─┐
                                          (pipeline: metrics/otlp)  │
[Telemetry host]                                                    ▼
  Host System (hostmetrics) ──► resource/local (host.role=telemetry) ► Prometheus ──► Grafana
                                (pipeline: metrics/local)              │
  Container Stats ──► cAdvisor (host_role=telemetry) ──────────────────┤
                                                                       └► Alertmanager ► Slack
```

**Flow Description:**

1. **Collection**:
   - Ark on the app host exports metrics via OTLP (gRPC/HTTP) to the telemetry host on port 4317/4318
   - OTel Collector's hostmetrics receiver scrapes telemetry-host statistics every 10 seconds (tagged `host.role=telemetry` via the `resource/local` processor)
   - cAdvisor monitors Docker container resource usage on the telemetry host (Prometheus adds `host_role=telemetry` to the scrape)

2. **Aggregation**:
   - The collector runs **two parallel metrics pipelines**: `metrics/local` (hostmetrics → telemetry-tagged) and `metrics` (OTLP from app)
   - Batched output is exposed on port 8889 in Prometheus format
   - The `prometheus` exporter has `resource_to_telemetry_conversion: true` so resource attributes (including `host.role`) become Prometheus labels

3. **Storage**:
   - Prometheus scrapes OTel Collector (port 8889) and cAdvisor (port 8080) every 10 seconds
   - Stores time-series data with 15-day retention

4. **Analysis**:
   - Prometheus evaluates alert rules every 10 seconds
   - Grafana queries Prometheus for dashboard visualization

5. **Notification**:
   - Prometheus sends alerts to Alertmanager
   - Alertmanager routes notifications to Slack

### Logs Pipeline

```
Ark Application (OTLP logs) ──> OpenTelemetry Collector ──> Loki ──> Grafana
```

**Flow Description:**

1. Ark sends structured logs via OTLP to OTel Collector
2. OTel Collector batches and forwards logs to Loki's OTLP endpoint
3. Loki stores logs with 15-day retention (360 hours)
4. Grafana queries Loki for log exploration and dashboard panels

### Traces Pipeline

```
Ark Application (OTLP traces) ──> OpenTelemetry Collector ──> Jaeger ──> Jaeger UI
```

**Flow Description:**

1. Ark generates distributed traces for RPC calls and round execution
2. Traces are sent via OTLP to OTel Collector
3. OTel Collector batches and forwards to Jaeger's gRPC endpoint (port 14250)
4. Traces are visualized in Jaeger UI (port 16686)

## Component Interaction

### Network Topology

All services run on the telemetry host in a single Docker compose project (default network — the previously-required external `nigiri`/`ark` networks were removed in PR #9). DNS-based service discovery still works inside the compose network:

- **otel-collector:4317** / host `:4317` - OTLP gRPC receiver (publicly exposed for app-host ingest)
- **otel-collector:4318** / host `:4318` - OTLP HTTP receiver (publicly exposed)
- **otel-collector:8889** - Prometheus metrics exporter (host-side `127.0.0.1:8889` only)
- **prometheus:9090** - Prometheus server and UI (compose-internal)
- **loki:3100** - Loki API endpoint (compose-internal)
- **jaeger:16686** - Jaeger query UI (compose-internal)
- **jaeger:14250** - Jaeger gRPC collector
- **alertmanager:9093** / host `:9093` - publicly exposed
- **cadvisor:8080** - cAdvisor metrics endpoint (compose-internal)
- **grafana:3000** / host `:3000` - publicly exposed; fronted by an ALB
- **pyroscope:4040** / host `:4040` - publicly exposed for profile ingestion

### Data Storage

Persistent Docker volumes ensure data survives container restarts:

- **prometheus_data**: Time-series metrics database
- **grafana_data**: Dashboard configurations and user settings
- **loki_data**: Log chunks and indexes
- **alertmanager_data**: Alert state and silences

Host filesystem mounts provide access to system metrics:

- **/proc**, **/sys** - Host system statistics for hostmetrics receiver
- **/var/run/docker.sock** - Docker daemon socket for container monitoring
- **/**rootfs** - Root filesystem for cAdvisor container stats

## Scalability Considerations

### Current Architecture

The current single-node architecture is suitable for:
- Development environments
- Small production deployments (1-5 Ark nodes)
- Environments where 15 days of metrics history is sufficient

### Future Scaling Options

For larger deployments, the architecture can be extended:

1. **Horizontal Scaling**:
   - Deploy multiple OTel Collectors behind a load balancer
   - Use Prometheus federation or remote write to central storage
   - Deploy Loki in microservices mode with separate ingesters and queriers

2. **Long-Term Storage**:
   - Configure Prometheus remote write to Thanos or Cortex
   - Use Loki's object storage backend (S3, GCS)
   - Export metrics to data warehouses for long-term analysis

3. **High Availability**:
   - Run multiple instances of each component
   - Use external databases for Grafana configuration
   - Deploy Alertmanager in clustered mode

## Security Architecture

### Access Control

- Grafana is exposed on `:3000` and fronted by an AWS ALB; **Google OAuth/SSO** is the primary authentication method (`GF_AUTH_GOOGLE_*` env vars), with allowed-domain restrictions
- The `grafana.htpasswd` file is still mounted as a fallback
- Admin password is provided via `GF_SECURITY_ADMIN_PASSWORD` (loaded from `.env.ark-telemetry`)

### Network Isolation

The telemetry host is a dedicated EC2 instance. The host's security group / ALB enforces access to publicly bound ports:
- Grafana `:3000` — via ALB
- OTel Collector `:4317` / `:4318` — for app-host ingest
- Alertmanager `:9093`
- Pyroscope `:4040` — profile ingestion
- The OTel Prometheus exporter on `:8889` is bound to `127.0.0.1` and stays internal

### Privileged Access

Some components require elevated privileges for system monitoring:
- cAdvisor: privileged mode for container statistics
- OTel Collector: privileged mode for host metrics, AppArmor unconfined

## Configuration Management

### Static Configuration

Most configuration is static and defined in YAML files:
- **collector-config.yaml**: OTel pipeline configuration
- **prometheus-config.yaml**: Scrape targets and alerting
- **loki-config.yaml**: Log storage and retention
- **alert.rules.yml**: Alert definitions

### Dynamic Configuration

Some configuration is provided at runtime:
- **SLACK_API_URL**: Webhook URL for Slack notifications
- **SLACK_CHANNEL**: Target Slack channel
- **GF_SERVER_ROOT_URL**: Grafana external URL

The Makefile renders alertmanager.yml from alertmanager.yml template with runtime secrets.

## Monitoring the Monitors

The observability stack monitors itself:
- Prometheus scrapes its own metrics
- Grafana includes system health dashboards
- OTel Collector exports self-metrics
- Alert rules can detect stack component failures

This self-monitoring ensures that issues with the observability system itself are detected and reported.

For details on individual components, see components.md. For configuration specifics, see configuration.md.
