# Monitoring Guide

## Overview
Ark infrastructure includes a complete telemetry stack: Prometheus, Grafana, Loki, Jaeger, Alertmanager.

## Accessing Dashboards

### Grafana (Primary Interface)

**Access**:
```bash
# Port forward
INSTANCE_ID=$(make tofu-output ARGS="-raw ec2_instance_id")
aws ssm start-session --target $INSTANCE_ID \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["3333"],"localPortNumber":["3333"]}'

# Browser: http://localhost:3333
# Default: admin / admin
```

**Available Dashboards**:
- Host Metrics (CPU, memory, disk, network)
- Container Metrics (resource usage per service)
- Ark Metrics (rounds, VTXOs, transactions)
- Bitcoin Metrics (sync status, peer count)
- PostgreSQL Metrics (connections, queries)
- Redis Metrics (memory, evictions)

### Prometheus (Advanced)

**Access**:
```bash
# Port forward
aws ssm start-session --target $INSTANCE_ID \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["9090"],"localPortNumber":["9090"]}'

# Browser: http://localhost:9090
```

**Useful Queries**:
```promql
# CPU usage
100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Disk usage
(1 - (node_filesystem_avail_bytes{mountpoint="/mnt/data"} / node_filesystem_size_bytes)) * 100

# Container CPU
rate(container_cpu_usage_seconds_total{name="arkd"}[5m]) * 100

# Container memory
container_memory_usage_bytes{name="arkd"} / 1024 / 1024

# Bitcoin sync progress
bitcoin_verification_progress * 100
```

## CloudWatch Metrics

### EC2 Metrics
```bash
# CPU utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=$INSTANCE_ID \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average

# Network out
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name NetworkOut \
  --dimensions Name=InstanceId,Value=$INSTANCE_ID \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### RDS Metrics
```bash
# Database connections
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=ark-postgres-projection-prod \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

### Redis Metrics
```bash
# Memory usage
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name DatabaseMemoryUsagePercentage \
  --dimensions Name=CacheClusterId,Value=ark-redis-prod \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

## Log Aggregation

### CloudWatch Logs (Primary, container stdout/stderr)

All containers ship logs to CloudWatch via the Docker `awslogs` driver. There is one
log group per environment with one stream per service.

```bash
# Follow arkd logs
aws logs tail "/ark/prod" --log-stream-name-prefix arkd --follow

# Filter for errors in the last hour
aws logs filter-log-events \
  --log-group-name "/ark/prod" \
  --log-stream-name-prefix arkd \
  --start-time $(($(date +%s) - 3600))000 \
  --filter-pattern "error"

# Wallet unlock events
aws logs tail "/ark/prod" --log-stream-name-prefix kms-unlocker --since 1h | grep -i unlock

# Bitcoin sync progress
aws logs tail "/ark/prod" --log-stream-name-prefix bitcoind --since 30m | grep -i progress
```

⚠️ `docker logs` and `docker compose logs` no longer print container stdout/stderr — the
`awslogs` driver redirects everything to CloudWatch. Streams use multiline patterns
(Go panics, dated lines, ANSI escapes for nbxplorer) so multi-line stack traces stay
grouped as a single event.

### Loki (via Grafana — telemetry stack only)

Loki retains logs from the in-stack telemetry components and Prometheus targets, accessed
via Grafana → Explore → Data Source: Loki. For application container logs, prefer
CloudWatch (above).

### CloudWatch Logs (SSM Sessions)
```bash
# View session logs
aws logs tail "/aws/ssm/sessions/prod" --follow

# Search for user
aws logs filter-log-events \
  --log-group-name "/aws/ssm/sessions/prod" \
  --filter-pattern "user-name"
```

## Alerting

### Bitcoin Node Host Alarms (CloudWatch → SNS → Chatbot → Slack)

The standalone Bitcoin node (`modules/bitcoin-node/`, since #116) ships five native
CloudWatch alarms defined in `alarms.tf`. All are gated on `var.enabled` (a scaled-to-zero
node does not page) and keyed on the **`AutoScalingGroupName`** dimension rather than
`InstanceId` — the single-instance ASG's `InstanceId` churns on every replacement, so an
InstanceId-keyed alarm would go stale. When `alerts_sns_topic_arn` is set (the account-level
`ark-alerts-<env>` topic), alarm/OK actions notify via **SNS → AWS Chatbot → Slack**;
otherwise the alarms are created for console visibility only.

| Alarm | Namespace / Metric | Condition | Threshold var (default) |
|-------|--------------------|-----------|-------------------------|
| `BitcoinNodeHighMemory-<env>-<name>` | `CWAgent` / `mem_used_percent` | > threshold for 10 min | `memory_alarm_threshold` (90%) |
| `BitcoinNodeChainDiskFull-<env>-<name>` | `CWAgent` / `disk_used_percent` (`path=/mnt/data`) | > threshold (5-min period) | `data_disk_alarm_threshold` (80%) |
| `BitcoinNodeRootDiskFull-<env>-<name>` | `CWAgent` / `disk_used_percent` (`path=/`) | > threshold (5-min period) | `root_disk_alarm_threshold` (85%) |
| `BitcoinNodeHighCPU-<env>-<name>` | `AWS/EC2` / `CPUUtilization` | > threshold for 15 min | `cpu_alarm_threshold` (85%) |
| `BitcoinNodeStatusCheckFailed-<env>-<name>` | `AWS/EC2` / `StatusCheckFailed` | ≥ 1 for 3 min (`treat_missing_data=breaching`) | fixed |

Notes: the CWAgent mem/disk metrics carry an ASG-keyed aggregation (see
`baseline-cwagent.json`); the status-check alarm treats missing data as breaching so a
vanished instance still fires; the CPU window is long because `t4g` is burstable.

### Alertmanager Configuration

**Location**: `/opt/ark-telemetry/prometheus/alertmanager.yml`

**Example**:
```yaml
route:
  receiver: 'slack'
  group_by: ['alertname']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

receivers:
  - name: 'slack'
    slack_configs:
      - api_url: '$SLACK_API_URL'
        channel: '#alerts'
        title: 'Ark Alert'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

### Alert Rules

**Location**: `/opt/ark-telemetry/prometheus/alert_rules.yml`

**Example Rules**:
```yaml
groups:
  - name: ark_alerts
    rules:
      - alert: HighCPUUsage
        expr: (100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)) > 80
        for: 5m
        annotations:
          description: 'CPU usage is above 80% for 5 minutes'

      - alert: LowDiskSpace
        expr: (1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100 > 85
        for: 10m
        annotations:
          description: 'Disk usage is above 85%'

      - alert: ServiceDown
        expr: up == 0
        for: 2m
        annotations:
          description: 'Service {{ $labels.job }} is down'
```

### Testing Alerts
```bash
# Trigger test alert
curl -X POST http://localhost:9093/api/v1/alerts -d '[
  {
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning"
    },
    "annotations": {
      "description": "This is a test alert"
    }
  }
]'
```

## Health Checks

### Service Health Script
```bash
#!/bin/bash
# health-check.sh

echo "=== Docker Services ==="
docker compose -f docker-compose.ark.prod.yaml ps

echo "=== Bitcoin Sync ==="
docker exec bitcoind bitcoin-cli -datadir=/data getblockchaininfo | jq '{blocks, headers, verificationprogress}'

echo "=== NBXplorer ==="
curl -s http://localhost:32838/v1/health | jq

echo "=== Disk Usage ==="
df -h | grep -E '(Filesystem|/mnt/data|/$)'

echo "=== Memory Usage ==="
free -h

echo "=== RDS Status ==="
aws rds describe-db-instances --query 'DBInstances[?contains(DBInstanceIdentifier, `prod`)][DBInstanceIdentifier,DBInstanceStatus]' --output table
```

Make executable and run:
```bash
chmod +x health-check.sh
./health-check.sh
```

## Recommended Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| CPU | 70% | 85% | Scale up instance |
| Memory | 75% | 90% | Scale up instance |
| Disk | 80% | 90% | Clean/expand |
| RDS Connections | 80% | 95% | Investigate leaks |
| Redis Memory | 75% | 90% | Scale up node |
| Bitcoin Peers | < 5 | < 2 | Check network |

Source: `${ARK_INFRA_REPO}/docker-compose/docs/05-operations.md`
