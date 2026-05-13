# Ark Telemetry Configuration

## Configuration Overview

Ark-telemetry is configured through a combination of YAML files, environment variables, and Docker Compose settings. This document describes all configuration options and how to customize the stack for your needs.

## Environment Variables

As of PR #9 the Grafana service loads its environment from a `.env.ark-telemetry` file on the telemetry host. A template is checked in as `.env.ark-telemetry.example`.

### Slack alerting

**SLACK_API_URL** — Slack webhook URL (`https://hooks.slack.com/services/...`)
**SLACK_CHANNEL** — target Slack channel (`#ark-alerts`)

### Grafana

**GF_SECURITY_ADMIN_PASSWORD** — Grafana admin password (no longer the default)
**GF_SERVER_ROOT_URL** — external URL for Grafana (e.g. `https://grafana.example.com`); the ALB-fronted hostname

### Grafana Google OAuth (PR #9)

Google SSO is enabled by default. Set `GF_AUTH_GOOGLE_ENABLED=false` to disable.

- **GF_AUTH_GOOGLE_CLIENT_ID** / **GF_AUTH_GOOGLE_CLIENT_SECRET** — OAuth credentials
- **GF_AUTH_GOOGLE_SCOPES** — typically `openid email profile`
- **GF_AUTH_GOOGLE_AUTH_URL** — `https://accounts.google.com/o/oauth2/v2/auth`
- **GF_AUTH_GOOGLE_TOKEN_URL** — `https://oauth2.googleapis.com/token`
- **GF_AUTH_GOOGLE_API_URL** — `https://openidconnect.googleapis.com/v1/userinfo`
- **GF_AUTH_GOOGLE_ALLOWED_DOMAINS** — restrict sign-in to specific email domains
- **GF_AUTH_GOOGLE_ALLOW_SIGN_UP** — `true` to auto-provision Grafana users from Google identities

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
  resource/local:                # Tag locally-scraped hostmetrics
    attributes:
      - key: host.role
        value: telemetry
        action: upsert
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
  resource_to_telemetry_conversion:
    enabled: true             # Promote resource attrs (host.role, ...) to labels
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

As of PR #9 hostmetrics and OTLP metrics are split into two parallel pipelines so the local telemetry-host metrics can be tagged separately:

```yaml
service:
  pipelines:
    metrics/local:
      receivers: [hostmetrics]
      processors: [resource/local, batch]
      exporters: [prometheus]
    metrics:
      receivers: [otlp]
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
        labels:
          host_role: 'telemetry'   # PR #9: tag local cadvisor scrape
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

Exposed ports as of PR #9 (standalone EC2 deployment — host security group / ALB enforces access):

```yaml
ports:
  - "4317:4317"            # OTel gRPC (publicly exposed for app-host ingest)
  - "4318:4318"            # OTel HTTP
  - "127.0.0.1:8889:8889"  # OTel Prometheus exporter (localhost-only)
  - "3000:3000"            # Grafana — fronted by ALB
  - "9093:9093"            # Alertmanager
  - "4040:4040"            # Pyroscope ingestion
```

The previously-required external Docker networks (`nigiri` for dev, `ark` for prod) were removed; the stack now runs on its own default compose network.

### Pinned Container Versions (PR #9)

| Service        | Image                                                                                       |
|----------------|---------------------------------------------------------------------------------------------|
| otel-collector | `ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:0.151.0` |
| cadvisor       | `ghcr.io/google/cadvisor:0.56.2`                                                            |

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
