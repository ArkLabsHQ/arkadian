# Ark Telemetry Dashboards

## Overview

Ark-telemetry includes five pre-configured Grafana dashboards that provide comprehensive visibility into host metrics, application performance, and container resource usage. All dashboards are automatically provisioned when Grafana starts and are stored in persistent storage.

## Dashboard Architecture

### Provisioning

Dashboards are loaded from `${ARK_TELEMETRY_REPO}/dashboards/` and provisioned automatically via:
- Mount point: `/etc/grafana/dashboards` (read-only)
- Provisioning config: `/etc/grafana/provisioning/dashboards/`
- Storage: `grafana_data` volume (persists user modifications)

### Data Sources

All dashboards query:
- **Prometheus**: Primary data source for metrics
- **Loki**: Optional data source for log correlation
- **Jaeger**: Optional data source for trace correlation

### Access

Dashboards are accessible at:
- **URL**: http://localhost:3333/dashboards
- **Default Home**: Host Metrics dashboard loads by default
- **Navigation**: Dashboard dropdown in Grafana UI

## Available Dashboards

### 1. Host Metrics (Host_metrics.json)

**Purpose**: Monitor system-level resource utilization and health.

**Default Home Dashboard**: This dashboard loads automatically when you open Grafana.

**Panels:**

**CPU Utilization (Time Series)**
- Query: `sum(rate(system_cpu_time_seconds_total{state!="idle"}[5m])) * 100`
- Shows: CPU usage percentage over time
- Format: Line graph with 16-core normalized display
- Threshold: Red line at 80%

**CPU Utilization (Gauge)**
- Query: Same as time series
- Shows: Current CPU usage as percentage
- Format: Gauge with threshold markers
- Use Case: Quick visual health check

**RAM Memory**
- Query: `sum by (state) (system_memory_usage_bytes) / 1024 / 1024 / 1024`
- Shows: Memory usage by state (used, free, cached, buffers)
- Format: Time series with multiple series
- Units: Gigabytes

**File System Memory (Gauge)**
- Query: `system_filesystem_usage_bytes{mountpoint="/", state="used|free|reserved"} / (1024^3)`
- Shows: Root filesystem usage breakdown
- Format: Multi-series gauge
- Use Case: Disk space monitoring

**Network I/O**
- Query: `sum by(direction) (rate(system_network_io_bytes_total[5m])) / 1024`
- Shows: Transmit and receive rates
- Format: Time series (transmit vs receive)
- Units: Kilobytes per second

**Disk I/O**
- Query: `sum by(direction) (rate(system_disk_io_bytes_total[5m])) / 1024`
- Shows: Read and write rates
- Format: Time series (read vs write)
- Units: Kilobytes per second

**Use Cases:**
- Daily health monitoring
- Resource capacity planning
- Identifying system bottlenecks
- Correlating resource usage with Ark activity

### 2. Ark Go Metrics (Ark_Go_metrics.json)

**Purpose**: Monitor Go runtime performance and behavior of the Ark application.

**Typical Panels** (Go runtime metrics):
- **Goroutine Count**: Number of active goroutines
- **Heap Memory**: Go heap allocation and usage
- **GC Pause Time**: Garbage collection pause duration
- **Go Threads**: OS thread count
- **Memory Allocations**: Rate of memory allocations

**Example Queries:**
```promql
go_goroutines{job="otel-collector"}
go_memstats_heap_alloc_bytes
rate(go_gc_duration_seconds_sum[5m])
```

**Client Compatibility Panels (PR #17, June 2026)** — Loki-backed panels (datasource uid `loki`) track client integrity and SDK adoption. The aggregation window is driven by the dashboard's `$window` template variable (PR #20; selectable 1m / 5m / 15m / 1h, default 5m):
- **Digest Mismatch Errors**: count of `DIGEST_MISMATCH` errors over time
  - `sum(count_over_time({service_name="arkd"} |~ "method=/ark.v1.ArkService/" |~ "DIGEST_MISMATCH" [$window]))`
- **Requests by Build Version**: request volume grouped by the `x-build-version` header value, plus a `missing` series for requests with no `x-build-version` header — tracks client adoption of v0.9.9+ (renamed from "Requests Missing Client Version" and re-segmented in PR #21)
  - `sum by (build_version) (count_over_time({service_name="arkd"} |~ "method=/ark.v1.ArkService/" |~ "x-build-version" | regexp "x-build-version.{3}(?P<build_version>[^\"]+)" [$window]))`
  - `sum(count_over_time({service_name="arkd"} |~ "method=/ark.v1.ArkService/" !~ "x-build-version" [$window]))` → `missing`
- **Requests by SDK Version**: request volume grouped by the `x-sdk-version` header value, plus a `missing` series for requests with no `x-sdk-version` header (PR #19)
  - `sum by (sdk_version) (count_over_time({service_name="arkd"} |~ "method=/ark.v1.ArkService/" |~ "x-sdk-version" | regexp "x-sdk-version.{3}(?P<sdk_version>[^\"]+)" [$window]))`
  - `sum(count_over_time({service_name="arkd"} |~ "method=/ark.v1.ArkService/" !~ "x-sdk-version" [$window]))` → `missing`

**Use Cases:**
- Detect memory leaks (increasing heap usage)
- Identify goroutine leaks (unbounded goroutine growth)
- Monitor GC pressure and performance impact
- Validate Go runtime health
- Track client SDK adoption and integrity (digest mismatches, version headers)

### 3. Cadvisor Exporter (Cadvisor_exporter.json)

**Purpose**: Monitor container-level resource usage for all Docker containers.

**Typical Panels:**
- **Container CPU Usage**: Per-container CPU utilization
- **Container Memory**: Memory usage and limits per container
- **Container Network**: Network I/O per container
- **Container Disk I/O**: Disk read/write per container
- **Container Restart Count**: Container restart frequency

**Example Queries:**
```promql
rate(container_cpu_usage_seconds_total[5m]) * 100
container_memory_usage_bytes{name=~"arkd.*"}
rate(container_network_transmit_bytes_total[5m])
```

**Use Cases:**
- Identify resource-hungry containers
- Detect containers hitting resource limits
- Monitor container stability (restart counts)
- Compare resource usage across containers

### 4. RPC Latency (RPC_Latency.json)

**Purpose**: Monitor Ark gRPC request latencies and performance.

**Typical Panels:**
- **Average RPC Latency**: Mean latency per RPC method
- **P95 RPC Latency**: 95th percentile latency
- **P99 RPC Latency**: 99th percentile latency
- **RPC Latency Heatmap**: Distribution visualization
- **Slow Requests**: Requests exceeding threshold

**Example Queries:**
```promql
histogram_quantile(0.95,
  rate(grpc_server_handling_seconds_bucket[5m]))
rate(grpc_server_handling_seconds_sum[5m]) /
  rate(grpc_server_handling_seconds_count[5m])
```

**Use Cases:**
- Identify slow RPC methods
- Detect performance regressions
- Validate SLA compliance
- Troubleshoot user-reported latency issues

### 5. RPC Request Response Size (RPC_Request_Response_Size.json)

**Purpose**: Monitor the size of gRPC request and response payloads.

**Typical Panels:**
- **Average Request Size**: Mean request payload size per method
- **Average Response Size**: Mean response payload size per method
- **Request Size Distribution**: Histogram of request sizes
- **Response Size Distribution**: Histogram of response sizes
- **Large Payloads**: Requests/responses exceeding threshold

**Example Queries:**
```promql
rate(grpc_server_msg_received_size_bytes_sum[5m]) /
  rate(grpc_server_msg_received_size_bytes_count[5m])
rate(grpc_server_msg_sent_size_bytes_sum[5m]) /
  rate(grpc_server_msg_sent_size_bytes_count[5m])
```

**Use Cases:**
- Identify methods with large payloads
- Detect payload size anomalies
- Optimize data serialization
- Validate network bandwidth usage

## Dashboard Features

### Time Range Selection

All dashboards support flexible time ranges:
- **Quick Ranges**: Last 5m, 15m, 1h, 6h, 12h, 24h, 7d, 30d
- **Custom Range**: Select specific start and end times
- **Relative Range**: "now-6h to now" (default for Host Metrics)

### Auto-Refresh

Enable auto-refresh to monitor in real-time:
- Options: 5s, 10s, 30s, 1m, 5m, 15m, 30m, 1h
- Location: Top-right corner of dashboard
- Use Case: Live monitoring during incidents

### Variables and Templates

Some dashboards support variables for filtering:
- **Instance**: Filter by specific host or container
- **Job**: Filter by Prometheus job name
- **Namespace**: Filter by Kubernetes namespace (if applicable)
- **Window** (Ark Go Metrics, PR #20): custom variable (`name: window`) controlling the `count_over_time` aggregation window on the Loki client-compatibility panels — options `1m`, `5m` (default), `15m`, `1h`, referenced in queries as `[$window]`

### Panel Interactions

**Zoom**: Click and drag on graph to zoom into time range
**Inspect**: Click panel title → Inspect → Data/Query/JSON
**Edit**: Click panel title → Edit (requires authentication)
**Share**: Click panel title → Share → Link/Snapshot
**Explore**: Click panel title → Explore → Open in Explore view

## Customizing Dashboards

### Modifying Existing Panels

1. Click panel title → Edit
2. Modify query, visualization, or settings
3. Click "Apply" to save changes
4. Changes persist in grafana_data volume

### Adding New Panels

1. Click "Add panel" button (top-right)
2. Select "Add a new panel"
3. Configure data source and query
4. Choose visualization type
5. Set panel title and description
6. Click "Apply"

### Creating Variables

1. Click gear icon (Dashboard settings)
2. Navigate to Variables section
3. Click "Add variable"
4. Configure variable query and options
5. Use variable in panel queries: `$variable_name`

### Importing Dashboards

Import community dashboards:
1. Navigate to Dashboards → Import
2. Enter dashboard ID (from grafana.com/dashboards)
3. Select Prometheus data source
4. Click "Import"

Popular dashboard IDs:
- **Node Exporter Full**: 1860
- **Docker and System Monitoring**: 893
- **Go Metrics**: 10826

## Dashboard Organization

### Dashboard Navigation

**Home Dashboard**: Click Grafana logo to return to Host Metrics

**Dashboard List**: Click "Dashboards" → Browse to see all dashboards

**Search**: Press `/` to open search, type dashboard name

**Starred Dashboards**: Click star icon to favorite frequently used dashboards

### Dashboard Folders

Organize dashboards in folders:
1. Dashboards → Manage
2. Create folder (e.g., "Ark", "System", "Containers")
3. Move dashboards into folders
4. Access via folder navigation

### Dashboard Playlists

Create rotation of dashboards for NOC displays:
1. Dashboards → Playlists
2. Create new playlist
3. Add dashboards in desired order
4. Set interval (e.g., 30s per dashboard)
5. Start playlist

## Best Practices

### Dashboard Design

- **Clarity**: Use clear panel titles and descriptions
- **Hierarchy**: Place most important panels at top
- **Consistency**: Use consistent time ranges across panels
- **Color**: Use color to indicate severity (green=good, red=bad)
- **Units**: Always specify units in panel settings

### Performance

- **Query Optimization**: Use recording rules for expensive queries
- **Time Range**: Avoid excessively long time ranges
- **Refresh Rate**: Use appropriate auto-refresh intervals
- **Variables**: Use variables to reduce number of dashboards

### Collaboration

- **Annotations**: Add annotations for deployments and incidents
- **Snapshots**: Create snapshots for sharing with external teams
- **Links**: Add dashboard links for related dashboards
- **Documentation**: Add dashboard description with relevant links

## Troubleshooting

### No Data in Panels

1. Verify data source is configured correctly
2. Check if Prometheus is scraping targets
3. Verify metric names in query (typos)
4. Check time range (data may be outside range)
5. Inspect panel query for errors

### Slow Dashboard Loading

1. Reduce time range (e.g., 6h instead of 30d)
2. Decrease auto-refresh rate
3. Simplify queries (avoid complex regex)
4. Use recording rules for expensive queries

### Dashboard Changes Not Persisting

1. Verify you're authenticated (required for saving)
2. Check if dashboard is provisioned (read-only)
3. Make a copy of provisioned dashboard to edit

For related information on metrics and alerts, see alert-rules.md. For dashboard configuration, see configuration.md.
