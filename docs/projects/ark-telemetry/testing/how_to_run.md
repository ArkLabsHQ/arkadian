# How to Run Ark Telemetry

## Prerequisites

### Required Software

```bash
# Docker (v20+)
docker --version

# Docker Compose (v2+)
docker compose version

# Make
make --version

# envsubst (for Slack config generation)
# macOS
brew install gettext && brew link --force gettext
# Ubuntu/Debian
sudo apt-get install gettext-base
```

### System Requirements

- **Minimum**: 2 CPU cores, 4GB RAM, 10GB disk
- **Recommended**: 4 CPU cores, 8GB RAM, 20GB disk

### Port Requirements

Required ports must be available:
- 3333 (Grafana), 4317/4318 (OTel), 8081 (cAdvisor), 8889 (OTel metrics)
- 9090 (Prometheus), 9093 (Alertmanager), 3100 (Loki), 16686 (Jaeger)

Check availability:
```bash
lsof -i :3333 -i :9090 -i :4317 -i :16686
```

## Setup

### 1. Clone Repository

```bash
cd ~/code
git clone https://github.com/ark-network/ark-telemetry.git
cd ark-telemetry
```

### 2. Verify Files

```bash
ls -la
# Expected: Makefile, docker-compose.otel.yaml, alertmanager.yml.tmpl,
#           collector-config.yaml, prometheus-config.yaml, etc.
```

### 3. Configure Slack (Optional)

Obtain webhook URL from https://api.slack.com/apps:
1. Create app → Enable Incoming Webhooks
2. Create webhook for your channel
3. Copy URL: `https://hooks.slack.com/services/XXX/YYY/ZZZ`

Test webhook:
```bash
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test from ark-telemetry"}' \
  YOUR_WEBHOOK_URL
```

## Running the Stack

### Production Mode

Standalone monitoring deployment:

```bash
export SLACK_API_URL='https://hooks.slack.com/services/YOUR/WEBHOOK'
export SLACK_CHANNEL='#ark-alerts'
make docker-run
```

Verify services:
```bash
# Check containers
docker ps
# Expected: 7 containers (otel-collector, prometheus, grafana, loki, jaeger, alertmanager, cadvisor)

# Check health
curl http://localhost:8889/metrics  # OTel Collector
curl http://localhost:9090/-/healthy  # Prometheus
curl http://localhost:3333/api/health  # Grafana
curl http://localhost:3100/ready  # Loki
```

### Development Mode

Connects to Nigiri Docker network for local Ark development:

```bash
# Start Nigiri first
nigiri start

# Start telemetry in dev mode
export SLACK_API_URL='https://hooks.slack.com/services/YOUR/WEBHOOK'
export SLACK_CHANNEL='#dev-alerts'
make docker-run-dev
```

Verify network:
```bash
docker network inspect nigiri
# Should show ark-telemetry containers
```

### Without Slack

Skip Slack alerts:

```bash
# Create minimal alertmanager.yml
cat > alertmanager.yml <<EOF
global:
  resolve_timeout: 30s
route:
  receiver: 'default'
receivers:
- name: 'default'
EOF

# Start without env vars
docker compose -f docker-compose.otel.yaml up -d
```

## Post-Startup Verification

### Check Service Logs

```bash
# All services
docker compose -f docker-compose.otel.yaml logs

# Specific service
docker logs otel-collector
docker logs prometheus

# Check for errors
docker compose -f docker-compose.otel.yaml logs | grep -i error
```

### Verify Data Collection

```bash
# Host metrics
curl -s 'http://localhost:9090/api/v1/query?query=system_cpu_utilization' | jq .

# Prometheus targets
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'

# Container metrics
curl http://localhost:8081/metrics | grep container_cpu
```

### Access Grafana

1. Open http://localhost:3333
2. Navigate to Dashboards → Browse
3. Open "Host Metrics"
4. Verify panels show data (check time range: Last 5m)

### Test Alerting

```bash
# Trigger ServiceMissing alert
docker stop prometheus
sleep 60  # Wait for alert
# Check Slack channel

# Resolve alert
docker start prometheus
sleep 30  # Wait for resolution
# Check Slack for resolution
```

## Stopping the Stack

### Stop and Remove Everything

```bash
# Production
make docker-stop

# Development
make docker-stop-dev

# Or directly
docker compose -f docker-compose.otel.yaml down -v
```

This removes containers AND volumes (data deleted).

### Stop Without Removing Data

```bash
docker compose -f docker-compose.otel.yaml down
# Volumes persist

# Restart with existing data
make docker-run
```

## Configuration Changes

### Modify Alert Rules

```bash
# Edit rules
vim alert.rules.yml

# Validate
docker run --rm -v $(pwd):/config prom/prometheus:latest \
  promtool check rules /config/alert.rules.yml

# Restart Prometheus
docker restart prometheus
```

### Modify OTel Collector

```bash
# Edit config
vim collector-config.yaml

# Restart
docker restart otel-collector

# Verify
docker logs otel-collector | grep "Everything is ready"
```

### Update Dashboards

```bash
# Edit JSON in dashboards/
vim dashboards/Host_metrics.json

# Restart Grafana
docker restart grafana
```

## Troubleshooting

### Services Won't Start

```bash
# Check Docker
docker info

# Check ports
lsof -i :3333 -i :9090

# View logs
docker compose -f docker-compose.otel.yaml logs
```

### Reset Everything

```bash
make docker-stop
docker volume prune -f
rm alertmanager.yml
make docker-run
```

## Cross-References

- Usage guide: `./usage.md`
- Troubleshooting: `./troubleshooting.md`
- Components: `../system/components.md`
- Configuration: `../system/configuration.md`
