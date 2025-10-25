# Quickstart: Deploying Fraud Detection Alerts

**Feature**: 001-fraud-detection-alerts
**Date**: 2025-10-24
**Estimated Deployment Time**: 30-45 minutes

## Purpose

This guide provides step-by-step instructions for deploying fraud detection and unilateral exit alerts to the ark-telemetry stack.

## Prerequisites

- [ ] Access to ark-telemetry repository: `${ARK_TELEMETRY_REPO}`
- [ ] Docker and Docker Compose installed
- [ ] Ark-telemetry stack currently running (`make docker-run`)
- [ ] Slack webhook configured (`SLACK_API_URL` and `SLACK_CHANNEL` environment variables set)
- [ ] Basic familiarity with Prometheus, Loki, and Grafana

## Deployment Steps

### Step 1: Backup Existing Configuration

Before making changes, backup current alert rules:

```bash
cd ${ARK_TELEMETRY_REPO}

# Backup Prometheus alert rules
cp alert.rules.yml alert.rules.yml.backup

# Backup Loki alert rules
cp loki-alert-rules.yml loki-alert-rules.yml.backup

# Backup OpenTelemetry Collector config
cp collector-config.yaml collector-config.yaml.backup
```

### Step 2: Deploy Prometheus Alert Rules

Append fraud detection rules to Prometheus alert configuration:

```bash
# Copy Prometheus alert rules from contract
cat ${ARKADIAN_DIR}/specs/001-fraud-detection-alerts/contracts/prometheus-alert-rules.yaml >> alert.rules.yml

# Validate syntax
docker run --rm -v $PWD:/config prom/prometheus:latest \
  promtool check rules /config/alert.rules.yml

# Expected output: "SUCCESS: X rules found" (where X is total rules)
```

### Step 3: Deploy Loki Alert Rules

Append fraud detection rules to Loki alert configuration:

```bash
# Copy Loki alert rules from contract
cat ${ARKADIAN_DIR}/specs/001-fraud-detection-alerts/contracts/loki-alert-rules.yaml >> loki-alert-rules.yml

# Validate syntax (Loki syntax validation)
docker run --rm -v $PWD:/config grafana/loki:latest \
  -config.file=/etc/loki/local-config.yaml \
  -verify-config

# Note: This validates Loki config, not just rules. Should pass if existing config is valid.
```

### Step 4: Update OpenTelemetry Collector Configuration

Add log-to-metrics transformation to OpenTelemetry Collector:

```bash
# Manually edit collector-config.yaml
vi collector-config.yaml

# Add connectors section from:
# ${ARKADIAN_DIR}/specs/001-fraud-detection-alerts/contracts/otel-collector-config-snippet.yaml

# Key changes:
# 1. Add "connectors:" section with logstometrics/fraud_detection
# 2. Modify "service.pipelines.logs" to include connectors
# 3. Add new "service.pipelines.metrics/fraud_detection" pipeline

# Validate OpenTelemetry Collector config
docker run --rm -v $PWD:/config otel/opentelemetry-collector-contrib:latest \
  --config=/config/collector-config.yaml --dry-run

# Expected output: "config validation successful"
```

### Step 5: Restart Telemetry Services

Restart services to load new configurations:

```bash
# Option 1: Restart individual services (faster)
docker restart prometheus
docker restart loki
docker restart otel-collector

# Wait 10 seconds for services to stabilize
sleep 10

# Verify services are running
docker ps | grep -E '(prometheus|loki|otel-collector)'

# Option 2: Restart entire stack (more reliable)
make docker-stop
make docker-run
```

### Step 6: Verify Alert Rules Loaded

Check that alert rules are loaded and active:

**Prometheus:**
```bash
# View loaded alert rules
curl -s http://localhost:9090/api/v1/rules | jq '.data.groups[] | select(.name=="fraud_detection")'

# Expected output: JSON object with fraud_detection rules
```

**Loki:**
```bash
# View loaded Loki ruler rules
curl -s http://localhost:3100/loki/api/v1/rules | jq '.data.groups[] | select(.name=="fraud_detection_logs")'

# Expected output: JSON object with fraud_detection_logs rules
```

**Grafana:**
```bash
# Open Grafana in browser
open http://localhost:3333

# Navigate to: Alerting → Alert rules
# Verify: fraud_detection and fraud_detection_logs groups appear
```

### Step 7: Configure Alert Thresholds (Optional)

Tune alert thresholds via environment variables:

```bash
# Edit .env file or docker-compose.otel.yaml
vi .env

# Add threshold configuration (examples):
FRAUD_DETECTION_UNILATERAL_EXIT_THRESHOLD=5        # Change from default 3
FRAUD_DETECTION_TIME_WINDOW=10m                     # Change from default 5m
FRAUD_DETECTION_FORFEIT_FAILURE_PCT=0.15           # Change from default 0.10 (10%)

# Restart services to apply
make docker-stop && make docker-run
```

## Testing

### Test 1: Validate Alert Syntax

```bash
# Already done in Step 2-4, but re-run if needed
cd ${ARK_TELEMETRY_REPO}
promtool check rules alert.rules.yml
```

**Expected**: SUCCESS message with no syntax errors

### Test 2: Simulate Unilateral Exit Alert

Inject unilateral exit log pattern to trigger alert:

```bash
# Inject log line into arkd container
docker exec arkd sh -c 'echo "2025-10-24T15:00:00Z INFO unilateral exit initiated: user=test_user_123, vtxo=vtxo_abc456, depth=3, value=50000" >> /var/log/arkd.log'

# Wait 30 seconds for alert evaluation
sleep 30

# Check Alertmanager for firing alerts
curl -s http://localhost:9093/api/v2/alerts | jq '.[] | select(.labels.alertname=="ArkdUnilateralExitInitiated")'

# Expected: JSON object showing alert in "firing" state

# Check Slack channel for notification
# Expected: Message with title "Unilateral exit initiated"
```

### Test 3: Simulate Double-Spend Alert

Inject double-spend log pattern:

```bash
# Inject log line
docker exec arkd sh -c 'echo "2025-10-24T15:05:00Z ERROR VTXO already spent: vtxo=vtxo_xyz789, first_round=round-40, current_round=round-42, user=test_user_456, action=rejected" >> /var/log/arkd.log'

# Wait 15 seconds (shorter for critical alerts)
sleep 15

# Check Alertmanager
curl -s http://localhost:9093/api/v2/alerts | jq '.[] | select(.labels.alertname=="ArkdDoubleSpendPattern")'

# Expected: Alert in "firing" state with severity=critical

# Check Slack channel
# Expected: CRITICAL severity message about double-spend
```

### Test 4: Simulate Forfeit Failure Alert

Inject forfeit failure log pattern:

```bash
# Inject log line
docker exec arkd sh -c 'echo "2025-10-24T15:10:00Z WARN forfeit proof validation failed: user=test_user_789, round=round-43, reason=timeout, phase=confirmation, participants=25" >> /var/log/arkd.log'

# Wait 30 seconds
sleep 30

# Check Alertmanager
curl -s http://localhost:9093/api/v2/alerts | jq '.[] | select(.labels.alertname=="ArkdForfeitProofFailure")'

# Expected: Alert in "firing" state with severity=warning
```

### Test 5: Verify Log-to-Metrics Transformation

Check that log patterns are being transformed to Prometheus metrics:

```bash
# Query Prometheus for fraud detection metrics
curl -s 'http://localhost:9090/api/v1/query?query=arkd_unilateral_exit_initiated_total' | jq '.data.result'

# Expected: Metric value > 0 (from Test 2 injection)

curl -s 'http://localhost:9090/api/v1/query?query=arkd_double_spend_attempt_total' | jq '.data.result'

# Expected: Metric value > 0 (from Test 3 injection)

# If metrics are not showing up:
# 1. Check OpenTelemetry Collector logs: docker logs otel-collector
# 2. Verify connector configuration in collector-config.yaml
# 3. Restart otel-collector: docker restart otel-collector
```

### Test 6: End-to-End Testing with Ark-Simulator (Advanced)

For comprehensive testing with real arkd operations:

```bash
# Prerequisites:
# - arkd running with telemetry enabled
# - ark-simulator configured to use arkd

# Simulate unilateral exit via ark-cli
cd ${ARKD_REPO}
ark-cli redeem --force --password test_password

# Wait 30 seconds
sleep 30

# Check for real alert (not injected log)
curl -s http://localhost:9093/api/v2/alerts | jq '.[] | select(.labels.alert_type=="unilateral_exit")'

# Expected: Alert with real user/VTXO data from arkd

# Note: Double-spend testing requires custom ark-simulator scenarios
# See: ${ARK_SIMULATOR_REPO}/scenarios/double-spend-test.yaml
```

## Troubleshooting

### Issue: Alerts Not Firing

**Symptom**: Injected log patterns don't trigger alerts

**Diagnosis**:
```bash
# Check Prometheus is scraping OpenTelemetry Collector
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.scrapeUrl | contains("otel-collector"))'

# Check Loki is receiving logs
curl -s 'http://localhost:3100/loki/api/v1/query?query={container="arkd"}' | jq '.data.result | length'

# Check Alertmanager connectivity
curl -s http://localhost:9093/api/v2/status | jq '.cluster'
```

**Solutions**:
- Restart telemetry stack: `make docker-stop && make docker-run`
- Verify container networking: `docker network inspect ark-telemetry_default`
- Check service logs: `docker logs prometheus`, `docker logs loki`, `docker logs alertmanager`

### Issue: False Positive Alerts

**Symptom**: Alerts firing for normal operations

**Diagnosis**:
```bash
# Check alert evaluation in Prometheus
curl -s http://localhost:9090/api/v1/rules | jq '.data.groups[].rules[] | select(.state=="firing")'

# Review recent logs in Loki
curl -s 'http://localhost:3100/loki/api/v1/query_range?query={container="arkd"}&start=1h' | jq '.data.result'
```

**Solutions**:
- Increase alert thresholds (see Step 7)
- Adjust `for` duration in alert rules (increase from 10s to 1m)
- Refine log pattern regex to be more specific

### Issue: Slack Notifications Not Received

**Symptom**: Alerts firing in Alertmanager but no Slack messages

**Diagnosis**:
```bash
# Check Alertmanager configuration
docker exec alertmanager cat /etc/alertmanager/alertmanager.yml

# Test Slack webhook manually
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test alert from ark-telemetry"}' \
  $SLACK_API_URL

# Check Alertmanager logs for send errors
docker logs alertmanager | grep -i slack
```

**Solutions**:
- Verify `SLACK_API_URL` and `SLACK_CHANNEL` are set correctly
- Regenerate Slack webhook if expired
- Check Slack app permissions (Incoming Webhooks must be enabled)

## Validation Checklist

After deployment, verify:

- [ ] All alert rules appear in Prometheus UI (http://localhost:9090/alerts)
- [ ] All alert rules appear in Loki ruler (curl http://localhost:3100/loki/api/v1/rules)
- [ ] Test alerts fired successfully (Test 2-4 passed)
- [ ] Slack notifications received for test alerts
- [ ] Prometheus metrics exist for log-derived counters (Test 5 passed)
- [ ] No errors in service logs (docker logs prometheus/loki/otel-collector)
- [ ] Alert thresholds tuned appropriately for production load

## Rollback Procedure

If deployment causes issues:

```bash
cd ${ARK_TELEMETRY_REPO}

# Restore backup configurations
cp alert.rules.yml.backup alert.rules.yml
cp loki-alert-rules.yml.backup loki-alert-rules.yml
cp collector-config.yaml.backup collector-config.yaml

# Restart services
make docker-stop && make docker-run

# Verify rollback
curl -s http://localhost:9090/api/v1/rules | jq '.data.groups[] | .name'
# Expected: Original rule groups only, no fraud_detection
```

## Next Steps

1. **Monitor alert frequency**: Track how often alerts fire in first week
2. **Tune thresholds**: Adjust based on observed baseline (see Step 7)
3. **Create Grafana dashboards**: Visualize fraud metrics (see /speckit.implement for dashboard deployment)
4. **Document runbooks**: Update Ark docs with fraud response procedures
5. **Long-term storage**: Consider exporting Loki logs to S3 for compliance (>15 days retention)

## Support

- **Documentation**: ${ARKADIAN_DIR}/docs/projects/ark-telemetry/
- **Alert Rules Reference**: ${ARKADIAN_DIR}/docs/projects/ark-telemetry/system/alert-rules.md
- **Slack Channel**: #ark-alerts (for real-time notifications)
- **Issue Tracking**: ${ARK_TELEMETRY_REPO}/issues
