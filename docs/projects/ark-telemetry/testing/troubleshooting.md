# Ark Telemetry Troubleshooting

## Quick Diagnostics

```bash
# Check all containers
docker ps -a

# View recent logs
docker compose -f docker-compose.otel.yaml logs --tail=50

# Check resource usage
docker stats --no-stream

# Test service endpoints
curl http://localhost:9090/-/healthy  # Prometheus
curl http://localhost:3333/api/health  # Grafana
curl http://localhost:3100/ready  # Loki
```

## Common Issues

### Services Won't Start

**Symptoms**: `make docker-run` fails, containers exit immediately

**Diagnose**:
```bash
# Check Docker daemon
docker info

# Check port conflicts
lsof -i :3333 -i :9090 -i :4317 -i :16686

# Check disk space
docker system df
```

**Solutions**:
```bash
# Stop conflicting services
docker stop $(docker ps -aq)

# Clean up
docker compose -f docker-compose.otel.yaml down -v

# Restart Docker Desktop (macOS)
# Docker Desktop → Restart

# Try again
make docker-run
```

### Missing Environment Variables

**Symptoms**: "SLACK_API_URL: variable is not set"

**Solution**:
```bash
# Export variables
export SLACK_API_URL='https://hooks.slack.com/services/YOUR/WEBHOOK'
export SLACK_CHANNEL='#your-channel'

# Then run
make docker-run

# Or inline
SLACK_API_URL='...' SLACK_CHANNEL='...' make docker-run
```

### Grafana Shows "No Data"

**Diagnose**:
```bash
# Check Prometheus health
curl http://localhost:9090/-/healthy

# Check if Prometheus has metrics
curl -s 'http://localhost:9090/api/v1/query?query=up' | jq .

# Check Prometheus targets
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'
```

**Common Causes**:
1. Time range in Grafana is wrong (select "Last 5 minutes")
2. Prometheus targets are DOWN
3. System time is incorrect: `date`

**Solution**:
```bash
# Restart Prometheus
docker restart prometheus

# Wait for scraping
sleep 30

# Verify metrics
curl 'http://localhost:9090/api/v1/query?query=up'

# Refresh Grafana dashboard
```

### OTel Collector Not Receiving Data

**Diagnose**:
```bash
# Check endpoints are reachable
nc -zv localhost 4317  # gRPC
nc -zv localhost 4318  # HTTP

# Check collector logs
docker logs otel-collector | tail -n 50

# Check metrics endpoint
curl http://localhost:8889/metrics
```

**Solution**:
```bash
# Verify Ark telemetry config
docker logs arkd | grep -i telemetry

# Check network connectivity
docker network inspect nigiri  # or ark-telemetry_default

# Restart collector
docker restart otel-collector

# Verify Ark endpoint config
# Should be: http://otel-collector:4317 (container) or http://localhost:4317 (host)
```

### Prometheus Not Scraping

**Symptoms**: Targets show "DOWN" in http://localhost:9090/targets

**Diagnose**:
```bash
# Test connectivity from Prometheus
docker exec prometheus wget -O- http://otel-collector:8889/metrics
docker exec prometheus nc -zv otel-collector 8889
docker exec prometheus nc -zv cadvisor 8080

# Check Prometheus config
docker exec prometheus cat /etc/prometheus/prometheus.yml
```

**Solution**:
```bash
# Restart Prometheus
docker restart prometheus

# Check logs for errors
docker logs prometheus | grep -i error

# Validate config
docker exec prometheus promtool check config /etc/prometheus/prometheus.yml
```

### Alerts Not Firing

**Diagnose**:
```bash
# Check alert status in Prometheus
curl http://localhost:9090/api/v1/alerts | jq .
# Or visit: http://localhost:9090/alerts

# Check Alertmanager config
docker exec alertmanager cat /etc/alertmanager/alertmanager.yml | grep slack

# Check Alertmanager logs
docker logs alertmanager | tail -n 50
```

**Test Slack webhook**:
```bash
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test alert"}' \
  $SLACK_API_URL
```

**Solution**:
```bash
# Regenerate alertmanager config
SLACK_API_URL='...' SLACK_CHANNEL='...' envsubst < alertmanager.yml.tmpl > alertmanager.yml

# Restart Alertmanager
docker restart alertmanager

# Trigger test alert
docker stop prometheus
sleep 60  # Wait for alert
# Check Slack
docker start prometheus
```

### No Logs in Loki

**Diagnose**:
```bash
# Query Loki API
curl -G -s http://localhost:3100/loki/api/v1/query \
  --data-urlencode 'query={service_name="ark"}' | jq .

# Check OTel Collector config
docker exec otel-collector cat /etc/otelcol/config.yaml | grep loki

# Check collector logs
docker logs otel-collector | grep -i loki

# Check Loki logs
docker logs loki | tail -n 50
```

**Solution**:
```bash
# Restart Loki and OTel Collector
docker restart loki
docker restart otel-collector

# Wait and retry query
sleep 10
curl -G -s http://localhost:3100/loki/api/v1/query \
  --data-urlencode 'query={service_name="ark"}' | jq .
```

### High Memory Usage

**Diagnose**:
```bash
# Check container memory
docker stats --no-stream

# Check Prometheus retention
docker inspect prometheus | grep retention
```

**Solutions**:

Reduce Prometheus retention:
```bash
# Edit docker-compose.otel.yaml
# Change: '--storage.tsdb.retention.time=7d'
docker compose -f docker-compose.otel.yaml up -d prometheus
```

Restart memory-heavy containers:
```bash
docker restart prometheus
docker restart grafana
```

### Cannot Access Grafana

**Diagnose**:
```bash
# Check container status
docker ps | grep grafana

# Check logs
docker logs grafana | tail -n 20

# Check port binding
lsof -i :3333

# Test endpoints
curl http://127.0.0.1:3333/api/health
curl http://localhost:3333/api/health
```

**Solution**:
```bash
# Restart Grafana
docker restart grafana

# Check container IP
docker inspect grafana | grep IPAddress

# Test container IP directly
curl http://<IP>:3000/api/health
```

## Debugging Techniques

### View Container Logs

```bash
# All services (follow mode)
docker compose -f docker-compose.otel.yaml logs -f

# Specific service
docker logs -f otel-collector

# Last 100 lines
docker logs --tail 100 prometheus
```

### Validate Configuration

```bash
# Prometheus config
docker run --rm -v $(pwd):/config prom/prometheus:latest \
  promtool check config /config/prometheus-config.yaml

# Alert rules
docker run --rm -v $(pwd):/config prom/prometheus:latest \
  promtool check rules /config/alert.rules.yml
```

### Query APIs Directly

```bash
# Prometheus: check service health
curl -s 'http://localhost:9090/api/v1/query?query=up' | jq .

# Loki: query logs
curl -G -s http://localhost:3100/loki/api/v1/query \
  --data-urlencode 'query={service_name="ark"}' \
  --data-urlencode 'limit=10' | jq .

# Check Prometheus targets
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[]'
```

### Test Network Connectivity

```bash
# Between containers
docker exec prometheus wget -O- http://otel-collector:8889/metrics

# From host
curl http://localhost:8889/metrics
```

### Collect Diagnostics

```bash
# Gather logs from all services
for service in otel-collector prometheus grafana loki jaeger alertmanager cadvisor; do
  echo "=== $service ===" >> diagnostics.log
  docker logs --tail 100 $service >> diagnostics.log 2>&1
done

# System info
docker version >> diagnostics.log
docker compose version >> diagnostics.log
uname -a >> diagnostics.log

# Container status
docker ps -a >> diagnostics.log
```

## Reset Everything

```bash
# Nuclear option: start fresh
make docker-stop
docker volume prune -f
docker network prune -f
rm alertmanager.yml

# Start clean
SLACK_API_URL='...' SLACK_CHANNEL='...' make docker-run
```

## Cross-References

- Usage guide: `./usage.md`
- Setup instructions: `./how_to_run.md`
- Component details: `../system/components.md`
- Configuration: `../system/configuration.md`
- Architecture: `../system/architecture.md`
