# Ark Telemetry Usage Guide

## Quick Start

```bash
# Configure (PR #9: stack reads .env.ark-telemetry)
cp .env.ark-telemetry.example .env.ark-telemetry
$EDITOR .env.ark-telemetry   # set SLACK_*, GF_SECURITY_ADMIN_PASSWORD, GF_AUTH_GOOGLE_*

cd /path/to/ark-telemetry
make docker-run

# Stop stack
make docker-stop
```

## Service URLs

In production the telemetry host runs on its own EC2 instance and Grafana is fronted by an ALB at `${GF_SERVER_ROOT_URL}`. Locally, host-bound services are reachable as:

| Service | URL | Purpose |
|---------|-----|---------|
| Grafana | http://localhost:3000 | Primary visualization interface (Google SSO in prod) |
| OTel Collector | grpc://localhost:4317, http://localhost:4318 | OTLP ingest from app host |
| Alertmanager | http://localhost:9093 | Alert routing and notifications |
| Pyroscope | http://localhost:4040 | Profile ingestion endpoint |
| OTel Prom exporter | http://127.0.0.1:8889 | Internal scrape target (localhost-only) |

Internal-only (compose network):

| Service | URL | Purpose |
|---------|-----|---------|
| Prometheus | http://prometheus:9090 | Metrics query and alert rules |
| Loki | http://loki:3100 | Log aggregation API |
| Jaeger | http://jaeger:16686 | Distributed tracing UI |
| cAdvisor | http://cadvisor:8080 | Container metrics |

## Grafana Dashboards

**Access**: http://localhost:3000

**Available Dashboards**:
- Host Metrics (default home) - CPU, memory, disk, network
- Ark Application Metrics - RPC latencies, request rates
- Cadvisor Exporter - Container resource usage
- Loki Logs - Log exploration and search
- Jaeger Traces - Distributed trace visualization

**Quick Navigation**:
1. Click hamburger menu (top left)
2. Select "Dashboards" → "Browse"
3. Click dashboard name to open
4. Adjust time range (top right) - default: Last 5m

## Common Tasks

### Configure Ark to Send Metrics

```bash
# Environment variables
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_SERVICE_NAME=arkd

# Restart Ark
docker compose restart arkd
```

### Verify Metrics Collection

```bash
# Check OTel Collector logs
docker logs otel-collector | tail -n 20

# Query Prometheus for metrics
curl 'http://localhost:9090/api/v1/query?query=up'

# View in Grafana
# 1. Open http://localhost:3000
# 2. Navigate to "Host Metrics" dashboard
# 3. Verify panels show recent data
```

### Query Logs in Loki

Via Grafana Explore:
1. Open Grafana → Explore (compass icon)
2. Select "Loki" data source
3. Enter LogQL query: `{service_name="ark"}`
4. Run query

Common queries:
```logql
# All Ark logs
{service_name="ark"}

# Error logs only
{service_name="ark"} |= "error"

# Last 5 minutes
{service_name="ark"} [5m]
```

### View Traces in Jaeger

1. Open http://localhost:16686
2. Select service: "arkd"
3. Choose operation (e.g., "GetInfo")
4. Click "Find Traces"
5. Click trace to view span details

### Create Alert Silence

1. Open http://localhost:9093
2. Navigate to "Silences" tab
3. Click "New Silence"
4. Set matcher: `alertname="ServiceMissing"`
5. Set duration and comment
6. Submit

## Development Workflows

### Local Development with Nigiri

```bash
# Ensure Nigiri is running
nigiri start

# Start telemetry in dev mode
SLACK_API_URL='...' SLACK_CHANNEL='#dev' make docker-run-dev
```

### Monitor Ark Simulations

```bash
# Terminal 1: Start telemetry
cd ark-telemetry && make docker-run

# Terminal 2: Run simulation
cd ark && make run-simulation CLIENTS=10

# Terminal 3: Watch metrics
watch -n 2 'curl -s http://localhost:9090/api/v1/query?query=up'
```

In Grafana:
- Open "Ark Application Metrics" dashboard
- Watch RPC latencies and request rates
- Monitor resource usage in "Host Metrics"

### Export Dashboard

From Grafana UI:
1. Open dashboard
2. Click share icon (top right)
3. Select "Export" → "Save to file"

Via script:
```bash
./scripts/backup_grafana.sh
```

## Useful Queries

### Prometheus (PromQL)

```promql
# CPU utilization percentage
(1 - sum(rate(system_cpu_time_seconds_total{state="idle"}[1m])) /
 sum(rate(system_cpu_time_seconds_total[1m]))) * 100

# Memory usage by state
sum by (state) (system_memory_usage_bytes) / 1024 / 1024 / 1024

# Check service health
up{job="otel-collector"}
```

### API Queries

```bash
# Prometheus API
curl 'http://localhost:9090/api/v1/query?query=system_cpu_utilization'

# Loki API
curl -G 'http://localhost:3100/loki/api/v1/query' \
  --data-urlencode 'query={service_name="ark"}' \
  --data-urlencode 'limit=10'

# Check Prometheus targets
curl 'http://localhost:9090/api/v1/targets' | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'
```

## Cross-References

- Setup instructions: `./how_to_run.md`
- Troubleshooting: `./troubleshooting.md`
- System architecture: `../system/architecture.md`
- Component details: `../system/components.md`
- Configuration: `../system/configuration.md`
