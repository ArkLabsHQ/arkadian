# Ark Telemetry Components

## OpenTelemetry Collector

### Purpose

The OpenTelemetry Collector is the central hub of the ark-telemetry stack. It receives, processes, and exports telemetry data (metrics, logs, and traces) from Ark and the host system.

### Key Features

- **Multi-Protocol Support**: Accepts OTLP via gRPC (port 4317) and HTTP (port 4318)
- **Host Metrics Collection**: Built-in scrapers for CPU, memory, disk, filesystem, load, and network
- **Flexible Pipeline**: Configurable receivers, processors, and exporters
- **Batch Processing**: Aggregates data before export to reduce overhead
- **Multiple Exporters**: Simultaneously exports to Prometheus, Loki, and Jaeger

### Configuration

Receivers:
- **hostmetrics**: Scrapes host statistics every 10 seconds from /hostfs mount
- **otlp**: Listens for application telemetry on gRPC and HTTP

Processors:
- **batch**: Aggregates data to improve export efficiency

Exporters:
- **prometheus**: Exposes metrics on port 8889 for Prometheus scraping
- **otlphttp/loki**: Forwards logs to Loki's OTLP endpoint
- **otlp/jaeger**: Sends traces to Jaeger via gRPC
- **debug**: Detailed logging for troubleshooting

### Resource Requirements

- Privileged mode required for host metrics collection
- Mounts: /proc, /sys, /, /var/run/docker.sock
- Security: AppArmor unconfined for system access

### Integration Points

- Ark sends metrics via OTLP to ports 4317/4318
- Prometheus scrapes metrics from port 8889
- Loki receives logs via HTTP POST to its OTLP endpoint
- Jaeger receives traces on port 4317

## Prometheus

### Purpose

Prometheus is the time-series database that stores and queries all metrics. It scrapes metrics from the OTel Collector and cAdvisor, evaluates alert rules, and serves data to Grafana.

### Key Features

- **Pull-Based Scraping**: Actively fetches metrics every 10 seconds
- **Powerful Query Language**: PromQL enables complex metric analysis
- **Alert Evaluation**: Continuously evaluates alert rules
- **Data Retention**: Stores 15 days of metrics history
- **Built-in UI**: Web interface on port 9090 for ad-hoc queries

### Configuration

Scrape Targets:
- **otel-collector:8889**: Host and application metrics (10s interval)
- **cadvisor:8080**: Container resource metrics (10s interval)

Alert Configuration:
- **Alertmanager**: alertmanager:9093
- **Rules File**: /etc/prometheus/alert.rules.yml
- **Evaluation Interval**: 10 seconds

### Storage

- **Volume**: prometheus_data (Docker volume)
- **Path**: /prometheus inside container
- **Retention**: 15 days (--storage.tsdb.retention.time=15d)

### Query Examples

CPU utilization:
```promql
(1 - sum(rate(system_cpu_time_seconds_total{state="idle"}[1m])) /
 sum(rate(system_cpu_time_seconds_total[1m]))) * 100
```

Memory usage by state:
```promql
sum by (state) (system_memory_usage_bytes) / 1024 / 1024 / 1024
```

### Integration Points

- Scrapes OTel Collector and cAdvisor
- Sends alerts to Alertmanager
- Queried by Grafana dashboards
- Provides metrics API for external tools

## Grafana

### Purpose

Grafana is the visualization platform that unifies metrics, logs, and traces into interactive dashboards. It's the primary interface for operators to monitor Ark deployments.

### Key Features

- **Multi-Source Support**: Queries Prometheus, Loki, and Jaeger simultaneously
- **Pre-Built Dashboards**: Five dashboards covering all aspects of the system
- **Dashboard Provisioning**: Dashboards loaded automatically from /etc/grafana/dashboards
- **Loki Explore**: Enhanced log exploration via grafana-lokiexplore-app plugin
- **Custom Home Dashboard**: Defaults to Host Metrics dashboard

### Configuration

Access:
- **URL**: http://localhost:3333 (localhost-only binding)
- **Port Mapping**: 3333:3000 (avoids conflicts with other services)
- **Authentication**: Optional via grafana.htpasswd

Data Sources (provisioned automatically):
- **Prometheus**: http://prometheus:9090
- **Loki**: http://loki:3100
- **Jaeger**: http://jaeger:16686

Environment Variables:
- **GF_SERVER_ROOT_URL**: External URL for proper link generation
- **GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH**: Default dashboard
- **GF_INSTALL_PLUGINS**: Loki Explore app for enhanced log analysis

### Storage

- **Volume**: grafana_data (persists dashboards and user settings)
- **Dashboard Files**: /etc/grafana/dashboards (read-only)
- **Provisioning**: /etc/grafana/provisioning (data source configuration)

### Security

- Localhost-only binding prevents direct internet exposure
- Requires SSH tunnel or port forwarding for remote access
- Optional HTTP basic authentication
- Dashboard editing requires authentication

## Loki

### Purpose

Loki is the log aggregation system that stores and indexes logs from Ark. It provides log query capabilities similar to Prometheus but for log data, and includes a ruler component for log-based alerting.

### Key Features

- **Label-Based Indexing**: Indexes metadata, not log content (efficient storage)
- **LogQL**: Query language similar to PromQL for log exploration
- **OTLP Support**: Native support for OpenTelemetry log format
- **Pattern Detection**: Automatically extracts patterns from logs
- **Retention**: 15-day log retention (360 hours)
- **Ruler for Alerting**: Evaluates LogQL alert rules and sends alerts to Alertmanager

### Configuration

Storage:
- **Backend**: Filesystem (tsdb schema v13)
- **Chunks**: /loki/chunks
- **Indexes**: Period-based with 24h rotation
- **Rules**: /etc/loki/rules (for alert rule definitions)
- **Retention**: 360 hours with compactor

Ingestion:
- **Endpoint**: http://loki:3100/otlp
- **Protocol**: OTLP HTTP from OTel Collector
- **Authentication**: Disabled (auth_enabled: false)

Query Optimization:
- **Results Cache**: 100MB embedded cache
- **Metric Aggregation**: Enabled for pattern detection
- **Structured Metadata**: Supported for rich log context

Ruler Configuration:
- **Alertmanager URL**: http://alertmanager:9093
- **Rule Directory**: /etc/loki/rules
- **Evaluation Interval**: 10 seconds (matches Prometheus)
- **Storage Type**: Local filesystem
- **API Enabled**: Yes (for rule management)

### Alert Rules

Loki evaluates LogQL-based alert rules defined in `/etc/loki/rules/fake/loki-alert-rules.yml`:

**Liquidity Monitoring:**
- **ArkdLowLiquidity**: Detects "not enough liquidity" pattern in logs
- **ArkdLowLiquidityFrequent**: Fires when pattern appears >10 times in 5 minutes (critical)
- **ArkdInsufficientFunds**: Detects "insufficient funds" errors
- **ArkdUtxoSelectionFailure**: Detects UTXO selection failures

**Wallet Access:**
- **ArkdWalletLocked**: Detects "wallet is locked" pattern

**Combined Monitoring:**
- **ArkdLiquidityIssue**: Aggregates all liquidity-related errors (>5 in 10 minutes)

All alerts use case-insensitive regex patterns and configurable time windows.

### Integration Points

- Receives logs from OTel Collector via OTLP
- Queried by Grafana for log panels and Explore
- Sends alerts to Alertmanager (ruler enabled)
- Provides ruler API for rule management and status checking

## Jaeger

### Purpose

Jaeger is the distributed tracing backend that stores and visualizes traces from Ark. It helps identify performance bottlenecks in RPC calls and round execution.

### Key Features

- **Jaeger v2 binary** (`jaegertracing/jaeger:2.18.0`, PR #13) — config-driven deployment replacing the legacy `all-in-one` image
- **OTLP Support**: Native support for OpenTelemetry traces (OTLP gRPC `:4317` and HTTP `:4318` receivers)
- **Trace Search**: Search traces by service, operation, tags, and duration
- **Service Dependency Graph**: Visualizes service relationships
- **Performance Analysis**: Identifies slow operations and bottlenecks

### Configuration

Driven by `jaeger-config.yaml` mounted at `/etc/jaeger/config.yaml` (PR #13). A `jaeger-init` sidecar (same image, run as root) pre-creates `/badger/{key,data}` and chowns them to UID `10001` before the main jaeger container starts (`depends_on … service_completed_successfully`).

Endpoints:
- **UI / Query API**: http://localhost:16686
- **OTLP gRPC**: `0.0.0.0:4317` (receiver)
- **OTLP HTTP**: `0.0.0.0:4318` (receiver)
- **Note**: the legacy `14250` gRPC collector port and the `COLLECTOR_OTLP_ENABLED=true` env var are gone — Jaeger v2 receives OTLP directly via its own receiver pipeline rather than the all-in-one collector

Storage (PR #13):
- **Backend**: BadgerDB on the local filesystem (named volume `jaeger_data` → `/badger`)
- **Keys**: `/badger/key` — **Values**: `/badger/data`
- **Ephemeral**: `false` (traces persist across container restarts)
- **TTL**: `72h` for spans
- **Pipeline**: `otlp` receiver → `batch` processor → `jaeger_storage_exporter` (badger_store); query served by the `jaeger_query` extension

### Use Cases

- Trace RPC request flow through Ark components
- Identify slow database queries
- Analyze round execution timing
- Debug distributed transaction processing

### Integration Points

- Receives traces from OTel Collector via OTLP
- Provides UI for trace visualization
- Can be queried by Grafana with Jaeger data source

## Pyroscope

### Purpose

Pyroscope is the continuous profiling platform that collects and stores performance profiles from Ark services. It provides low-overhead profiling for CPU, memory, goroutines, mutex, and block profiles to identify performance bottlenecks and resource leaks.

### Key Features

- **Continuous Profiling**: Always-on profiling with < 1% CPU overhead
- **Multiple Profile Types**: CPU, heap allocations, goroutines, mutex contention, blocking operations
- **Flame Graphs**: Interactive visualization of profile data showing function call hierarchies
- **Time-Series Profiling**: View profile changes over time to detect performance regressions
- **Differential Profiling**: Compare profiles across time ranges to measure optimization impact
- **Tag-Based Filtering**: Filter profiles by service, network, version, and custom tags

### Configuration

Access:
- **UI**: http://localhost:4040 (localhost-only, Pyroscope web interface)
- **Ingestion**: http://pyroscope:4040 (internal Docker network endpoint)

Storage:
- **Volume**: pyroscope_data (persists profiles across container restarts)
- **Path**: /var/lib/pyroscope inside container
- **Retention**: 7 days (default, configurable)

Environment Variables:
- **PYROSCOPE_LOG_LEVEL**: info (logging level for Pyroscope server)

### Profile Types

- **CPU**: Identifies which functions consume CPU time (100Hz sampling)
- **Heap Inuse Space**: Current memory allocations (shows memory leaks)
- **Heap Alloc Space**: Total memory allocated over time
- **Goroutines**: Active goroutine count and stack traces
- **Mutex Count/Duration**: Lock contention statistics
- **Block Count/Duration**: Blocking operations (channel ops, I/O)

### Use Cases

- Identify CPU-intensive functions during high-load periods
- Detect memory leaks by tracking heap growth over 24+ hours
- Find goroutine leaks causing resource exhaustion
- Optimize mutex contention in concurrent code paths
- Analyze blocking operations affecting throughput

### Integration Points

- Receives profiles from instrumented Go services (arkd, arkd-wallet) via HTTP push
- Provides standalone web UI for flame graph visualization
- Integrated with Grafana via Pyroscope datasource for unified dashboards
- Profiles tagged with service name, network, and version for filtering

### Instrumentation

Ark services use github.com/grafana/pyroscope-go SDK:
- Configured via ARKD_PYROSCOPE_SERVER_URL environment variable
- Graceful degradation when Pyroscope server unavailable
- Automatic profile upload every 10 seconds
- Tagged with service=arkd/arkd-wallet, network=bitcoin/testnet, version

## Alertmanager

### Purpose

Alertmanager handles alert routing, grouping, and notification delivery. It receives alerts from Prometheus and sends notifications to Slack.

### Key Features

- **Alert Routing**: Routes alerts based on labels and severity
- **Notification Channels**: Slack integration with customizable messages
- **Resolved Notifications**: Sends follow-up when alerts clear
- **Alert Grouping**: Prevents alert storms by grouping related alerts
- **Silencing**: Temporary mute for known issues

### Configuration

Global Settings:
- **Resolve Timeout**: 30 seconds

Routes:
- **Critical Severity**: Routes to slack-notifications receiver
- **Default**: Routes to default receiver (no-op)

Slack Integration:
- **API URL**: Set via SLACK_API_URL environment variable
- **Channel**: Set via SLACK_CHANNEL environment variable
- **Template**: Shows alert summary and description
- **Resolved**: Enabled to notify when issues are fixed

### Storage

- **Volume**: alertmanager_data (persists alert state and silences)
- **Path**: /alertmanager inside container

### Integration Points

- Receives alerts from Prometheus
- Sends notifications to Slack
- Can be configured for additional channels (PagerDuty, email, etc.)

## cAdvisor

### Purpose

cAdvisor (Container Advisor) collects detailed resource usage statistics for Docker containers. It provides granular metrics about CPU, memory, network, and disk usage per container.

### Key Features

- **Real-Time Monitoring**: Continuous collection of container statistics
- **Resource Metrics**: CPU, memory, network I/O, disk I/O per container
- **Prometheus Export**: Native Prometheus metrics format
- **No Agent Required**: Direct integration with Docker daemon

### Configuration

Access:
- **Metrics**: http://localhost:8081/metrics (localhost-only)
- **UI**: http://localhost:8081 (basic web interface)

Privileges:
- **Mode**: Privileged (required for accurate statistics)
- **Device**: /dev/kmsg access

Mounts:
- **/rootfs**: Host root filesystem (read-only)
- **/var/run**: Docker socket directory
- **/sys**: System pseudo-filesystem
- **/var/lib/docker**: Docker data directory

### Metrics Examples

Container CPU usage:
```promql
rate(container_cpu_usage_seconds_total[5m])
```

Container memory usage:
```promql
container_memory_usage_bytes{name=~"arkd.*"}
```

### Integration Points

- Scraped by Prometheus every 10 seconds
- Visualized in Cadvisor Exporter dashboard
- Complements OTel Collector host metrics with container-level detail

### Security

- Localhost-only binding on port 8081
- Requires privileged mode for kernel statistics
- Read-only mounts for host filesystem access

## Data Source Correlation

### Overview

Grafana data source correlation enables seamless navigation between logs, metrics, traces, and profiles. The ark-telemetry stack includes pre-configured correlation to accelerate troubleshooting workflows.

### Correlation Features

**Logs to Traces (Loki → Jaeger):**
- Derived fields extract trace IDs from log text
- Clickable links appear next to trace IDs in logs
- Supports multiple trace ID formats: `trace_id=abc`, `"trace_id":"abc"`
- Opens Jaeger with the specific trace loaded

**Logs to Profiles (Loki → Pyroscope):**
- Service name extraction creates profile links
- Click service name to view CPU/memory flame graphs
- Time range automatically matched to log timestamp

**Metrics to Traces (Prometheus → Jaeger):**
- Exemplars attach trace IDs to metric samples
- Diamond markers on graphs indicate available traces
- Click marker to investigate slow requests or spikes
- Requires OpenTelemetry instrumentation with exemplar support

**Traces to Logs (Jaeger → Loki):**
- "Logs for this span" button in trace view
- Opens Loki filtered by service and time range
- Optionally filters by trace ID
- Time window: ±1 hour around span by default

**Traces to Metrics (Jaeger → Prometheus):**
- "Metrics" tab shows related metric trends
- Pre-configured queries: request rate, error rate, duration
- Service labels automatically applied from trace tags
- Helps identify if issue is isolated or systemic

### Configuration

Correlation is provisioned automatically via data source YAML files:

- **loki.yaml**: Derived fields for trace and service extraction
- **prometheus.yaml**: Exemplar trace ID destinations
- **jaeger.yaml**: Traces-to-logs and traces-to-metrics mappings
- **pyroscope.yaml**: Profile data source configuration

All data sources use consistent UIDs for cross-referencing:
- `loki` - Log aggregation
- `prometheus` - Metrics storage
- `jaeger` - Distributed tracing
- `pyroscope` - Continuous profiling

### Usage Patterns

**Investigating High CPU:**
1. Notice CPU spike in Prometheus dashboard
2. Click exemplar marker on spike
3. View trace showing slow function call
4. Click "Logs for span" to see log context
5. Click "View CPU Profile" to see flame graph
6. Identify exact function consuming CPU

**Debugging Slow Request:**
1. Find error in Loki logs
2. Click trace ID link
3. View trace showing 3-second database query
4. Click "Metrics" tab to check if DB is consistently slow
5. Navigate to Pyroscope to profile database code

**Root Cause Analysis:**
- Start with symptom (metric alert, error log)
- Jump to trace for detailed timing breakdown
- View logs for additional context
- Check profiles for code-level bottlenecks
- Return to metrics to verify fix

### Requirements for Correlation

For correlation to work properly, Ark services must:

1. **Emit trace IDs in logs** (structured logging):
   ```
   {"level":"info","trace_id":"abc123...","msg":"processing round"}
   ```

2. **Emit exemplars with metrics** (OpenTelemetry SDK):
   - Attach trace ID to metric observations
   - Prometheus scrapes and stores exemplars automatically

3. **Use consistent tags across signals**:
   - Loki: `{service="arkd"}`
   - Prometheus: `{job="arkd"}`
   - Jaeger: `service.name=arkd`
   - Pyroscope: `{service_name="arkd"}`

For detailed correlation setup and troubleshooting, see `/sop/configuring-correlation.md`.

## Component Dependencies

### Startup Order

1. **otel-collector** - Must start first (metrics hub)
2. **prometheus** - Depends on otel-collector
3. **loki**, **jaeger** - Independent, can start in parallel
4. **alertmanager** - Can start anytime, used by Prometheus
5. **cadvisor** - Independent container monitor
6. **pyroscope** - Independent profiling backend
7. **grafana** - Last, queries all other services

### Runtime Dependencies

- Grafana requires Prometheus, Loki, Jaeger, and Pyroscope to be running for full functionality
- Data source correlation requires consistent UIDs across all data sources
- Prometheus requires OTel Collector and cAdvisor for metric collection
- Alertmanager requires Slack webhook configuration to send notifications
- OTel Collector requires Loki and Jaeger to export logs and traces

For configuration details, see configuration.md. For alert rules, see alert-rules.md. For correlation setup, see /sop/configuring-correlation.md.
