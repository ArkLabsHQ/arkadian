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

Loki is the log aggregation system that stores and indexes logs from Ark. It provides log query capabilities similar to Prometheus but for log data.

### Key Features

- **Label-Based Indexing**: Indexes metadata, not log content (efficient storage)
- **LogQL**: Query language similar to PromQL for log exploration
- **OTLP Support**: Native support for OpenTelemetry log format
- **Pattern Detection**: Automatically extracts patterns from logs
- **Retention**: 15-day log retention (360 hours)

### Configuration

Storage:
- **Backend**: Filesystem (tsdb schema v13)
- **Chunks**: /loki/chunks
- **Indexes**: Period-based with 24h rotation
- **Retention**: 360 hours with compactor

Ingestion:
- **Endpoint**: http://loki:3100/otlp
- **Protocol**: OTLP HTTP from OTel Collector
- **Authentication**: Disabled (auth_enabled: false)

Query Optimization:
- **Results Cache**: 100MB embedded cache
- **Metric Aggregation**: Enabled for pattern detection
- **Structured Metadata**: Supported for rich log context

### Integration Points

- Receives logs from OTel Collector via OTLP
- Queried by Grafana for log panels and Explore
- Optionally sends alerts to Alertmanager (ruler enabled)

## Jaeger

### Purpose

Jaeger is the distributed tracing backend that stores and visualizes traces from Ark. It helps identify performance bottlenecks in RPC calls and round execution.

### Key Features

- **All-in-One Deployment**: Combined collector, query service, and UI
- **OTLP Support**: Native support for OpenTelemetry traces
- **Trace Search**: Search traces by service, operation, tags, and duration
- **Service Dependency Graph**: Visualizes service relationships
- **Performance Analysis**: Identifies slow operations and bottlenecks

### Configuration

Endpoints:
- **UI**: http://localhost:16686 (Jaeger query UI)
- **Collector**: port 14250 (gRPC endpoint for OTel Collector)
- **OTLP**: Enabled via COLLECTOR_OTLP_ENABLED=true

Storage:
- **Backend**: In-memory (suitable for development and testing)
- **Note**: For production, consider external storage (Elasticsearch, Cassandra)

### Use Cases

- Trace RPC request flow through Ark components
- Identify slow database queries
- Analyze round execution timing
- Debug distributed transaction processing

### Integration Points

- Receives traces from OTel Collector via OTLP
- Provides UI for trace visualization
- Can be queried by Grafana with Jaeger data source

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

## Component Dependencies

### Startup Order

1. **otel-collector** - Must start first (metrics hub)
2. **prometheus** - Depends on otel-collector
3. **loki**, **jaeger** - Independent, can start in parallel
4. **alertmanager** - Can start anytime, used by Prometheus
5. **cadvisor** - Independent container monitor
6. **grafana** - Last, queries all other services

### Runtime Dependencies

- Grafana requires Prometheus, Loki, and Jaeger to be running for full functionality
- Prometheus requires OTel Collector and cAdvisor for metric collection
- Alertmanager requires Slack webhook configuration to send notifications
- OTel Collector requires Loki and Jaeger to export logs and traces

For configuration details, see configuration.md. For alert rules, see alert-rules.md.
