# Ark Telemetry Configuration

## Configuration Overview

Ark-telemetry is configured through a combination of YAML files, environment variables, and Docker Compose settings. This document describes all configuration options and how to customize the stack for your needs.

## Environment Variables

### Required Variables

These must be provided at startup:

**SLACK_API_URL**
- Purpose: Slack webhook URL for alert notifications
- Format: `https://hooks.slack.com/services/YOUR/WEBHOOK/PATH`
- Usage: `export SLACK_API_URL='https://hooks.slack.com/services/...'`
- Note: Obtained from Slack's "Incoming Webhooks" app

**SLACK_CHANNEL**
- Purpose: Target Slack channel for alerts
- Format: `#channel-name` or `@username`
- Usage: `export SLACK_CHANNEL='#ark-alerts'`
- Note: Channel must exist and webhook must have access

### Optional Variables

**GF_SERVER_ROOT_URL**
- Purpose: External URL for Grafana (used in links and embeds)
- Default: `http://localhost:3333`
- Usage: `export GF_SERVER_ROOT_URL='https://grafana.example.com'`

## Configuration Files

### OpenTelemetry Collector (collector-config.yaml)

Located at: `${ARK_TELEMETRY_REPO}/collector-config.yaml`

#### Receivers Configuration

**hostmetrics receiver:**
```yaml
hostmetrics:
  collection_interval: 10s  # How often to scrape host metrics
  root_path: /hostfs        # Mount point for host filesystem
  scrapers:                 # Which metrics to collect
    cpu:                    # CPU utilization
    memory:                 # RAM usage
    disk:                   # Disk I/O
    filesystem:             # Filesystem usage
    load:                   # System load average
    network:                # Network I/O
```

**OTLP receiver:**
```yaml
otlp:
  protocols:
    grpc:
      endpoint: 0.0.0.0:4317  # Listen on all interfaces
    http:
      endpoint: 0.0.0.0:4318  # HTTP/JSON alternative
```

#### Processors Configuration

```yaml
processors:
  batch: {}  # Batch data before export (reduces overhead)
```

Advanced batch configuration:
```yaml
batch:
  timeout: 10s           # Max time before sending batch
  send_batch_size: 1024  # Max records per batch
```

#### Exporters Configuration

**Prometheus exporter:**
```yaml
prometheus:
  metric_expiration: 30s      # Remove stale metrics after 30s
  endpoint: "0.0.0.0:8889"    # Where Prometheus scrapes
```

**Loki exporter:**
```yaml
otlphttp/loki:
  endpoint: "http://loki:3100/otlp"  # Loki's OTLP endpoint
```

**Jaeger exporter:**
```yaml
otlp/jaeger:
  endpoint: jaeger:4317
  tls:
    insecure: true  # No TLS in Docker network
```

**Debug exporter:**
```yaml
debug:
  verbosity: detailed  # Options: basic, normal, detailed
```

#### Pipeline Configuration

```yaml
service:
  pipelines:
    metrics:
      receivers: [hostmetrics, otlp]
      processors: [batch]
      exporters: [prometheus]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/jaeger]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/loki]
```

### Prometheus (prometheus-config.yaml)

Located at: `${ARK_TELEMETRY_REPO}/prometheus-config.yaml`

#### Global Configuration

```yaml
global:
  scrape_interval: 10s      # How often to scrape targets
  evaluation_interval: 10s  # How often to evaluate alerts
```

Customization:
- Increase intervals (e.g., 30s) to reduce resource usage
- Decrease intervals (e.g., 5s) for higher resolution metrics

#### Scrape Configuration

```yaml
scrape_configs:
  - job_name: 'otel-collector'
    static_configs:
      - targets: ['otel-collector:8889']
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
```

Adding custom targets:
```yaml
  - job_name: 'custom-exporter'
    static_configs:
      - targets: ['custom-exporter:9100']
    scrape_interval: 30s  # Override global interval
```

#### Alerting Configuration

```yaml
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

#### Rule Files

```yaml
rule_files:
  - "alert.rules.yml"
```

### Loki (loki-config.yaml)

Located at: `${ARK_TELEMETRY_REPO}/loki-config.yaml`

#### Server Configuration

```yaml
server:
  http_listen_port: 3100
  grpc_listen_port: 9096
  log_level: info  # Options: debug, info, warn, error
  grpc_server_max_concurrent_streams: 1000
```

#### Storage Configuration

```yaml
common:
  storage:
    filesystem:
      chunks_directory: /loki/chunks  # Where log chunks are stored
      rules_directory: /loki/rules    # Where alert rules are stored
  replication_factor: 1  # Single instance deployment
```

#### Retention Configuration

```yaml
limits_config:
  retention_period: 360h  # 15 days (can be increased)
```

Customization:
```yaml
limits_config:
  retention_period: 720h  # 30 days
  max_query_length: 721h  # Must be >= retention_period
```

#### Schema Configuration

```yaml
schema_config:
  configs:
    - from: 2025-09-01
      store: tsdb          # Time-series database format
      object_store: filesystem
      schema: v13          # Latest schema version
      index:
        prefix: index_
        period: 24h        # Daily index rotation
```

### Alertmanager (alertmanager.yml)

Located at: `${ARK_TELEMETRY_REPO}/alertmanager.yml`

**Note**: This file is a template. The actual file is generated by the Makefile with secrets injected.

#### Global Settings

```yaml
global:
  resolve_timeout: 30s  # How long to wait before declaring alert resolved
```

#### Routing Configuration

```yaml
route:
  receiver: 'slack-notifications'  # Default receiver
  routes:
    - match:
        severity: critical
      receiver: 'slack-notifications'
    - receiver: 'default'
```

Advanced routing:
```yaml
route:
  receiver: 'slack-notifications'
  group_by: ['alertname', 'severity']  # Group similar alerts
  group_wait: 10s                      # Wait before sending first notification
  group_interval: 5m                   # Wait before sending group updates
  repeat_interval: 4h                  # Wait before resending same alert
  routes:
    - match:
        severity: critical
      receiver: 'slack-critical'
      repeat_interval: 1h  # More frequent for critical alerts
    - match:
        severity: warning
      receiver: 'slack-warnings'
```

#### Receivers Configuration

```yaml
receivers:
  - name: 'slack-notifications'
    slack_configs:
      - api_url: ''  # Injected at runtime
        channel: ''  # Injected at runtime
        send_resolved: true
        title: '{{ .CommonAnnotations.summary }}'
        text: '{{ .CommonAnnotations.description }}'
```

Custom message templates:
```yaml
slack_configs:
  - api_url: ''
    channel: ''
    send_resolved: true
    title: |
      [{{ .Status | toUpper }}] {{ .CommonLabels.alertname }}
    text: |
      {{ range .Alerts }}
      *Alert:* {{ .Labels.alertname }}
      *Severity:* {{ .Labels.severity }}
      *Description:* {{ .Annotations.description }}
      {{ end }}
    color: |
      {{ if eq .Status "firing" }}danger{{ else }}good{{ end }}
```

## Docker Compose Configuration

### Service Ports

Exposed ports (can be customized in docker-compose.otel.yaml):

```yaml
ports:
  - "4317:4317"           # OTel gRPC
  - "4318:4318"           # OTel HTTP
  - "127.0.0.1:3333:3000" # Grafana (localhost-only)
  - "9090:9090"           # Prometheus
  - "16686:16686"         # Jaeger UI
  - "3100:3100"           # Loki
```

Example customization (change Grafana port):
```yaml
ports:
  - "127.0.0.1:8080:3000"  # Access on localhost:8080
```

### Volume Configuration

Persistent data storage:

```yaml
volumes:
  prometheus_data:     # Time-series metrics
  grafana_data:        # Dashboards and settings
  alertmanager_data:   # Alert state
  loki_data:          # Log chunks
```

To use host directories instead of volumes:
```yaml
volumes:
  - ./data/prometheus:/prometheus
  - ./data/grafana:/var/lib/grafana
```

### Resource Limits

Currently unlimited. Add resource constraints:

```yaml
otel-collector:
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 512M
      reservations:
        cpus: '0.5'
        memory: 256M
```

## Customization Examples

### Increase Metric Retention

Edit prometheus-config.yaml:
```bash
--storage.tsdb.retention.time=30d  # Change from 15d to 30d
```

### Add Email Alerting

Edit alertmanager.yml:
```yaml
receivers:
  - name: 'email-alerts'
    email_configs:
      - to: 'ops-team@example.com'
        from: 'alertmanager@example.com'
        smarthost: 'smtp.example.com:587'
        auth_username: 'alertmanager'
        auth_password: 'secret'
```

### Change Collection Intervals

Edit collector-config.yaml:
```yaml
hostmetrics:
  collection_interval: 30s  # Change from 10s to 30s
```

Edit prometheus-config.yaml:
```yaml
global:
  scrape_interval: 30s  # Change from 10s to 30s
```

### Enable Grafana Authentication

Create grafana.htpasswd:
```bash
htpasswd -c auth/grafana.htpasswd admin
```

Edit docker-compose.otel.yaml:
```yaml
grafana:
  environment:
    - GF_AUTH_BASIC_ENABLED=true
    - GF_AUTH_ANONYMOUS_ENABLED=false
```

### Add Additional Data Sources

Create file in provisioning/datasources/:
```yaml
apiVersion: 1
datasources:
  - name: InfluxDB
    type: influxdb
    url: http://influxdb:8086
    access: proxy
    database: metrics
```

## Configuration Validation

Before deploying changes, validate configuration files:

**Prometheus:**
```bash
docker run --rm -v $PWD:/config prom/prometheus:latest \
  promtool check config /config/prometheus-config.yaml
```

**Alertmanager:**
```bash
docker run --rm -v $PWD:/config prom/alertmanager:latest \
  amtool check-config /config/alertmanager.yml
```

**Loki:**
```bash
docker run --rm -v $PWD:/config grafana/loki:latest \
  -config.file=/config/loki-config.yaml -verify-config
```

## Configuration Management

Configuration files are mounted as read-only volumes in containers. To apply changes:

1. Edit configuration file
2. Validate syntax
3. Restart affected service: `docker restart <service-name>`
4. Verify changes in service logs: `docker logs <service-name>`

For major changes, use `make docker-stop && make docker-run` to restart the entire stack.

For alert rule details, see alert-rules.md. For dashboard information, see dashboards.md.
