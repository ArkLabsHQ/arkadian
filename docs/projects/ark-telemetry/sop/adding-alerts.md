# Adding Alert Rules - SOP

## Overview

This guide provides step-by-step procedures for creating and deploying new alert rules in ark-telemetry. Alert rules are defined in PromQL and evaluated continuously by Prometheus.

**Reference Documentation:**
- Alert Rules: `/docs/projects/ark-telemetry/system/alert-rules.md`
- Configuration: `/docs/projects/ark-telemetry/system/configuration.md`

## Prerequisites

- [ ] Access to `${ARK_TELEMETRY_REPO}/alert.rules.yml`
- [ ] Prometheus running locally or in development environment
- [ ] Slack webhook configured (for notification testing)
- [ ] Basic understanding of PromQL query language

## Procedure: Adding a New Alert Rule

### Step 1: Identify the Alert Condition

**Define the following:**

1. **Alert Name**: Use PascalCase (e.g., `HighMemoryUsage`, `SlowRPCResponse`)
2. **Metric to Monitor**: Identify the Prometheus metric (e.g., `system_memory_usage_bytes`, `rpc_server_duration_milliseconds`)
3. **Threshold**: Determine the critical value (e.g., `> 80`, `< 1`)
4. **Duration**: How long condition must persist (e.g., `2m`, `5m`, `30s`)
5. **Severity**: Choose severity level (`critical`, `warning`, `info`)

**Example Decision Matrix:**

| Alert Type | Severity | Typical Duration |
|------------|----------|------------------|
| Service Down | critical | 10s-30s |
| Resource High | warning | 2m-5m |
| Performance Degradation | warning | 5m-10m |
| Informational | info | varies |

### Step 2: Write the PromQL Expression

**Test the query in Prometheus UI first:**

1. Navigate to http://localhost:9090
2. Go to Graph page
3. Enter your PromQL expression
4. Click "Execute" and verify results
5. Adjust query as needed

**Common Query Patterns:**

```promql
# Memory usage percentage
(1 - (system_memory_usage_bytes{state="free"} /
      sum(system_memory_usage_bytes))) * 100 > 80

# RPC latency percentile (p95)
histogram_quantile(0.95,
  rate(rpc_server_duration_milliseconds_bucket[5m])) > 1000

# Rate of failed requests
rate(ark_rpc_requests_total{status="error"}[5m]) > 0.1

# Absence check (service down)
absent(ark_service_up)

# Goroutine leak detection
ark_sched_goroutines_goroutines > 10000
```

### Step 3: Add Rule to alert.rules.yml

**Open the file:**

```bash
cd ${ARK_TELEMETRY_REPO}
vi alert.rules.yml
```

**Add new rule under the `rules:` section:**

```yaml
- alert: YourAlertName
  expr: your_promql_expression > threshold
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "Brief description (shown in notification title)"
    description: "Detailed explanation of what triggered and potential impact."
```

**Example - High Memory Alert:**

```yaml
- alert: HighMemoryUsage
  expr: (1 - (system_memory_usage_bytes{state="free"} /
        sum(system_memory_usage_bytes))) * 100 > 80
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High memory usage (>80%)"
    description: "Memory usage has exceeded 80% for more than 5 minutes. This may impact Ark performance."
```

### Step 4: Validate Rule Syntax

**Before deploying, validate the syntax:**

```bash
docker run --rm -v $PWD:/config prom/prometheus:latest \
  promtool check rules /config/alert.rules.yml
```

**Expected output:**
```
Checking /config/alert.rules.yml
  SUCCESS: 3 rules found
```

**If errors occur:**
- Check YAML indentation (use spaces, not tabs)
- Verify PromQL syntax
- Ensure all required fields are present

### Step 5: Deploy the Alert Rule

**Restart Prometheus to load new rules:**

```bash
docker restart prometheus
```

**Or reload without restart:**

```bash
curl -X POST http://localhost:9090/-/reload
```

**Verify reload succeeded:**

```bash
docker logs prometheus --tail 50
```

Look for:
```
level=info msg="Loading configuration file" filename=/etc/prometheus/prometheus.yml
level=info msg="Completed loading of configuration file"
```

### Step 6: Verify Alert in Prometheus UI

1. Navigate to http://localhost:9090/alerts
2. Find your new alert in the list
3. Check current state: **Inactive** (green) or **Pending** (yellow)
4. Verify expression is correct
5. Check "for" duration matches your intent

### Step 7: Test the Alert

**Option A: Simulate the Condition**

For CPU alerts:
```bash
stress --cpu 16 --timeout 180s
```

For memory alerts:
```bash
stress --vm 2 --vm-bytes 4G --timeout 180s
```

For service down alerts:
```bash
docker stop arkd
```

**Option B: Temporarily Lower Threshold**

```yaml
# Temporarily change threshold for testing
expr: ... > 10  # Instead of > 80
for: 10s        # Instead of 5m
```

**Monitor alert state:**
1. Watch Prometheus Alerts page
2. Wait for "for" duration to elapse
3. Alert should transition: Inactive → Pending → Firing

### Step 8: Verify Slack Notification

**When alert fires, check:**

- [ ] Slack message received in correct channel
- [ ] Title matches `annotations.summary`
- [ ] Description matches `annotations.description`
- [ ] Severity label is visible
- [ ] Timestamp is accurate

**When alert resolves:**

- [ ] Resolution notification received (if `send_resolved: true`)
- [ ] Status shows as "Resolved"

### Step 9: Restore Production Settings

**If you lowered thresholds for testing:**

```yaml
# Restore original values
expr: ... > 80
for: 5m
```

**Reload configuration:**

```bash
docker restart prometheus
```

## Checklist: New Alert Rule

- [ ] Alert name is descriptive and uses PascalCase
- [ ] PromQL expression tested in Prometheus UI
- [ ] Threshold is appropriate for production environment
- [ ] Duration prevents false positives from transient spikes
- [ ] Severity label matches alert criticality
- [ ] Summary is concise and actionable
- [ ] Description explains impact and potential causes
- [ ] Syntax validated with `promtool check rules`
- [ ] Prometheus reloaded successfully
- [ ] Alert visible in Prometheus UI
- [ ] Alert tested by simulating condition
- [ ] Slack notification received and formatted correctly
- [ ] Resolution notification tested
- [ ] Production thresholds restored

## Common Alert Examples

### Service Health Alerts

```yaml
- alert: ArkServiceDown
  expr: absent(ark_service_up) or ark_service_up == 0
  for: 30s
  labels:
    severity: critical
  annotations:
    summary: "Ark service is down"
    description: "Ark service has stopped responding for 30 seconds."
```

### Resource Alerts

```yaml
- alert: HighDiskUsage
  expr: (system_filesystem_usage_bytes{mountpoint="/", state="used"} /
        system_filesystem_usage_bytes{mountpoint="/", state="used|free|reserved"}) * 100 > 85
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High disk usage (>85%)"
    description: "Root filesystem usage exceeded 85%. Consider cleanup or expansion."
```

### Performance Alerts

```yaml
- alert: SlowRPCLatency
  expr: histogram_quantile(0.95,
        rate(rpc_server_duration_milliseconds_bucket[5m])) > 1000
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "RPC p95 latency >1s"
    description: "95% of RPC requests are taking over 1 second to complete."
```

## Troubleshooting

**Alert not firing when condition is met:**
- Check "for" duration has elapsed
- Verify PromQL query returns expected value
- Check alert state in Prometheus UI (may be Pending)

**Alert firing too frequently:**
- Increase "for" duration (e.g., `2m` → `5m`)
- Adjust threshold to be less sensitive

**No Slack notification received:**
- Verify Alertmanager is running: `docker ps | grep alertmanager`
- Check Alertmanager logs: `docker logs alertmanager`
- Verify webhook URL and channel in `alertmanager.yml`
- Test webhook manually with curl

**Syntax errors after reload:**
- Check indentation (2 spaces, no tabs)
- Validate with `promtool check rules`
- Check Prometheus logs for specific error messages
