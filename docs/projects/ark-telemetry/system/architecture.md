# Ark Telemetry Architecture

## Overview

Ark-telemetry implements a modern observability architecture with the OpenTelemetry Collector as the central telemetry hub. This design follows the "collector-as-gateway" pattern, where all metrics, logs, and traces flow through a single point before being routed to their appropriate backends.

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
Ark Application (OTLP) ──┐
                         ├──> OpenTelemetry Collector ──> Prometheus ──> Grafana
Host System (scrapers) ──┘                                     │
                                                                └──> Alertmanager ──> Slack
Container Stats ────────────────────────────────────────> cAdvisor ──> Prometheus
```

**Flow Description:**

1. **Collection**:
   - Ark exports metrics via OTLP protocol (gRPC or HTTP) to port 4317/4318
   - OTel Collector's hostmetrics receiver scrapes host statistics every 10 seconds
   - cAdvisor monitors Docker container resource usage

2. **Aggregation**:
   - OTel Collector batches incoming metrics
   - Exposes aggregated metrics on port 8889 in Prometheus format

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

All services run in a shared Docker network, enabling DNS-based service discovery:

- **otel-collector:4317** - OTLP gRPC receiver
- **otel-collector:4318** - OTLP HTTP receiver
- **otel-collector:8889** - Prometheus metrics exporter
- **prometheus:9090** - Prometheus server and UI
- **loki:3100** - Loki API endpoint
- **jaeger:16686** - Jaeger query UI
- **jaeger:14250** - Jaeger gRPC collector
- **alertmanager:9093** - Alertmanager API and UI
- **cadvisor:8080** - cAdvisor metrics endpoint
- **grafana:3000** - Grafana UI (mapped to localhost:3333)

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

- Grafana is bound to localhost (127.0.0.1:3333), requiring SSH or port forwarding for remote access
- Optional HTTP basic authentication via grafana.htpasswd
- cAdvisor is localhost-only (127.0.0.1:8081)

### Network Isolation

All services communicate within a private Docker network. Only essential ports are exposed to the host:
- Grafana: localhost-only
- Prometheus: exposed for admin access
- OTel Collector: exposed for metric ingestion

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
