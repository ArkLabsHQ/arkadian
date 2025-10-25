# Ark Telemetry Alert Rules

## Overview

Alert rules in ark-telemetry are defined in two systems:

1. **Prometheus (PromQL)**: Metric-based alerts for resource usage and service health
2. **Loki (LogQL)**: Log-based alerts for pattern detection and application errors

When an alert condition is met, both Prometheus and Loki send alerts to Alertmanager, which handles notification routing and delivery to Slack.

## Alert Configuration

### Prometheus Alert Rules
Alert rules are defined in `${ARK_TELEMETRY_REPO}/alert.rules.yml` and loaded by Prometheus at startup. The rules are organized in groups with common evaluation intervals.

### Loki Alert Rules
Log-based alert rules are defined in `${ARK_TELEMETRY_REPO}/loki-alert-rules.yml` and evaluated by Loki's ruler component. These rules use LogQL syntax to detect patterns in application logs.

### Alert Rule Structure

Each alert rule consists of:

- **alert**: Alert name (used in notifications and routing)
- **expr**: PromQL expression that triggers the alert
- **for**: Duration condition must be true before firing
- **labels**: Key-value pairs for routing and classification
- **annotations**: Human-readable information included in notifications

## Current Alert Rules

### HighMachineCPUUsage

**Purpose**: Detect sustained high CPU utilization that may impact Ark performance.

**Configuration:**
```yaml
- alert: HighMachineCPUUsage
  expr: (1 - sum(rate(system_cpu_time_seconds_total{state="idle"}[1m])) /
        sum(rate(system_cpu_time_seconds_total[1m]))) * 100 > 70
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "High machine CPU usage (>70%)"
    description: "The machine's CPU usage has been above 70% for more than 2 minutes."
```

**How It Works:**

1. **Expression Breakdown:**
   - `system_cpu_time_seconds_total`: Total CPU time in different states (idle, user, system, etc.)
   - `rate(...[1m])`: Calculate rate of change over 1 minute
   - `sum(rate(system_cpu_time_seconds_total{state="idle"}[1m]))`: Rate of idle CPU time
   - `1 - (idle_rate / total_rate)`: Calculate percentage of non-idle CPU time
   - `* 100`: Convert to percentage
   - `> 70`: Trigger when CPU usage exceeds 70%

2. **Duration**: Alert fires only if condition persists for 2 minutes (avoids transient spikes)

3. **Severity**: Labeled as "warning" (not critical)

**When It Fires:**
- CPU usage consistently above 70% for 2+ minutes
- Possible causes: Resource-intensive round execution, inefficient queries, external load

**Response Actions:**
- Check which process is consuming CPU (top, htop)
- Review Ark logs for unusual activity
- Check if round size or participant count increased
- Consider horizontal scaling or optimization

### ServiceMissing

**Purpose**: Detect when the Ark service stops exporting metrics, indicating the service is down or unreachable.

**Configuration:**
```yaml
- alert: ServiceMissing
  expr: absent(ark_service_up)
  for: 10s
  labels:
    severity: critical
  annotations:
    summary: "Ark service stopped exporting metrics"
    description: "No ark_service_up sample received for > 10 s"
```

**How It Works:**

1. **Expression Breakdown:**
   - `ark_service_up`: Custom metric exported by Ark (value 1 when healthy)
   - `absent(ark_service_up)`: Returns true when metric is missing
   - No threshold comparison needed (presence/absence check)

2. **Duration**: Alert fires after 10 seconds of missing metrics (quick detection)

3. **Severity**: Labeled as "critical" (service outage)

**When It Fires:**
- Ark daemon crashes or exits
- Ark cannot connect to OTel Collector
- Network issues between Ark and telemetry stack
- Ark is stuck and not exporting metrics

**Response Actions:**
- Check if Ark process is running: `ps aux | grep arkd`
- Check Ark logs for errors: `docker logs arkd`
- Verify connectivity to OTel Collector
- Restart Ark service if necessary
- Investigate root cause (crash dump, error logs)

### RoundFailureDetected

**Purpose**: Detect when round processing failures occur in arkd by parsing log messages for the "round failed" pattern.

**Configuration:**
```yaml
- alert: RoundFailureDetected
  expr: rate(arkd_round_failed_total[1m]) > 0
  for: 10s
  labels:
    severity: warning
  annotations:
    summary: "Round failure detected in arkd logs"
    description: "The pattern 'round failed' appeared in arkd logs, indicating a round processing error. Check arkd logs for details."
```

**How It Works:**

1. **Log-to-Metric Conversion:**
   - OpenTelemetry Collector's `logstometrics` processor parses arkd logs
   - When "round failed" pattern is found, increments `arkd_round_failed_total` counter
   - Counter metric is exported to Prometheus for alerting

2. **Expression Breakdown:**
   - `arkd_round_failed_total`: Counter metric incremented when "round failed" appears in logs
   - `rate(arkd_round_failed_total[1m])`: Calculate rate of failures over 1 minute
   - `> 0`: Trigger when any failure occurs

3. **Duration**: Alert fires after 10 seconds of detecting failures (near-immediate notification)

4. **Severity**: Labeled as "warning" (operational issue requiring investigation)

**When It Fires:**
- Round processing encounters errors
- Network issues preventing round completion
- Participant connection failures during round
- Database or state management errors during round processing

**Response Actions:**
- Check arkd logs for full error context: `docker logs arkd | grep "round failed"`
- Review recent round activity in Grafana dashboards
- Check participant connection status
- Verify database connectivity and state
- Monitor for patterns (single failure vs recurring failures)
- Escalate if failures persist or increase in frequency

## Alert Evaluation

### Evaluation Cycle

Prometheus evaluates alert rules every 10 seconds (configured in prometheus-config.yaml):

```yaml
global:
  evaluation_interval: 10s
```

This means:
- New alerts are detected within 10 seconds
- Alert state changes are processed quickly
- Resolution notifications sent within 10 seconds of recovery

### Alert States

Alerts can be in three states:

1. **Inactive**: Condition is false (normal operation)
2. **Pending**: Condition is true, but waiting for `for` duration to elapse
3. **Firing**: Condition has been true for longer than `for` duration

Example timeline for HighMachineCPUUsage:
- T+0s: CPU spikes to 80% → Alert enters Pending state
- T+30s: CPU still at 80% → Alert remains Pending
- T+120s: CPU still at 80% → Alert enters Firing state → Notification sent
- T+130s: CPU drops to 50% → Alert enters Inactive state → Resolution notification sent

## Alert Notification

### Notification Flow

1. Prometheus detects alert condition
2. Alert enters Firing state after `for` duration
3. Prometheus sends alert to Alertmanager
4. Alertmanager routes alert based on labels
5. Slack notification sent with summary and description
6. When condition resolves, resolution notification sent (if send_resolved: true)

### Notification Format

Slack messages include:
- **Title**: Alert summary (from annotations.summary)
- **Text**: Detailed description (from annotations.description)
- **Status**: Firing or Resolved
- **Severity**: From labels.severity
- **Timestamp**: When alert fired

Example notification:
```
Title: High machine CPU usage (>70%)
Text: The machine's CPU usage has been above 70% for more than 2 minutes.
```

## Customizing Alert Rules

### Adding a New Alert

Add to alert.rules.yml:
```yaml
- alert: HighMemoryUsage
  expr: (1 - (system_memory_usage_bytes{state="free"} /
        sum(system_memory_usage_bytes))) * 100 > 80
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High memory usage (>80%)"
    description: "Memory usage has exceeded 80% for more than 5 minutes."
```

### Modifying Thresholds

Change existing alert sensitivity:
```yaml
# Lower CPU threshold from 70% to 60%
expr: ... > 60  # Changed from > 70

# Longer duration before firing
for: 5m  # Changed from 2m
```

### Adjusting Severity

Change alert severity for different routing:
```yaml
labels:
  severity: critical  # Changed from warning
```

This would route to critical alerts receiver if configured in Alertmanager.

## Advanced Alert Techniques

### Multi-Condition Alerts

Combine multiple conditions:
```yaml
- alert: ArkUnhealthy
  expr: ark_service_up == 0 or ark_rounds_failed > 5
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Ark service is unhealthy"
    description: "Ark is either down or experiencing frequent round failures."
```

### Time-Based Alerts

Alert only during business hours:
```yaml
- alert: HighCPUBusinessHours
  expr: (... > 70) and hour() >= 9 and hour() <= 17
  for: 2m
```

### Rate-of-Change Alerts

Alert on rapid changes:
```yaml
- alert: SuddenTrafficSpike
  expr: rate(ark_rpc_requests_total[1m]) >
        4 * rate(ark_rpc_requests_total[1m] offset 10m)
  for: 2m
  annotations:
    summary: "RPC traffic increased 4x suddenly"
```

## Testing Alerts

### Manual Testing

Test alert expression in Prometheus UI (http://localhost:9090):
1. Navigate to Graph page
2. Enter alert expression
3. Click "Execute"
4. Verify result matches expectation

### Simulating Alerts

Force alert to fire:
```bash
# Generate CPU load
stress --cpu 16 --timeout 180s

# Stop Ark service
docker stop arkd
```

### Verifying Notifications

Check if alert fired:
1. Prometheus UI → Alerts page
2. Look for alert in Firing state
3. Check Slack channel for notification
4. Verify alert details are correct

## Alert Maintenance

### Reloading Rules

After editing alert.rules.yml:
```bash
docker restart prometheus
```

Or reload without restart:
```bash
curl -X POST http://localhost:9090/-/reload
```

### Validating Rule Syntax

Before deploying:
```bash
docker run --rm -v $PWD:/config prom/prometheus:latest \
  promtool check rules /config/alert.rules.yml
```

### Viewing Alert History

In Prometheus UI:
1. Navigate to Alerts page
2. Click on alert name
3. View firing history and state transitions

## Loki Log-Based Alert Rules

### Overview

Loki alert rules use LogQL (Loki Query Language) to detect patterns in application logs. These rules are particularly useful for detecting application-level errors that don't produce metrics, such as low liquidity warnings, wallet errors, and transaction failures.

### ArkdLowLiquidity

**Purpose**: Detect when arkd reports insufficient liquidity to process rounds.

**Configuration:**
```yaml
- alert: ArkdLowLiquidity
  expr: |
    sum(count_over_time({container="arkd"} |~ "(?i)not enough liquidity" [5m])) > 0
  for: 30s
  labels:
    severity: warning
    component: arkd
    alert_type: liquidity
  annotations:
    summary: "Arkd low liquidity detected"
    description: "The pattern 'not enough liquidity' appeared in arkd logs."
    logql_query: '{container="arkd"} |~ "(?i)not enough liquidity"'
```

**How It Works:**

1. **LogQL Expression Breakdown:**
   - `{container="arkd"}`: Filter logs from arkd container
   - `|~ "(?i)not enough liquidity"`: Case-insensitive regex pattern match
   - `count_over_time(...[5m])`: Count occurrences in last 5 minutes
   - `sum(...)`: Aggregate across all log streams
   - `> 0`: Trigger if pattern appears at least once

2. **Duration**: Alert fires after pattern persists for 30 seconds

3. **Severity**: Labeled as "warning" (operational issue)

**When It Fires:**
- Arkd wallet balance is too low to fund round operations
- Round processing requires more liquidity than available
- UTXO set doesn't have sufficient funds for required outputs

**Response Actions:**
- Check wallet balance: `docker exec arkd-wallet ark-cli getbalance`
- Review recent rounds and liquidity consumption
- Top up wallet if balance is critically low
- Investigate abnormal liquidity drain patterns

### ArkdWalletLocked

**Purpose**: Detect when arkd cannot access wallet due to locked state.

**Configuration:**
```yaml
- alert: ArkdWalletLocked
  expr: |
    sum(count_over_time({container="arkd"} |~ "(?i)wallet is locked" [5m])) > 0
  for: 30s
  labels:
    severity: warning
    component: arkd
    alert_type: wallet_access
```

**When It Fires:**
- Wallet passphrase not provided or incorrect
- kms-unlocker service failed to unlock wallet
- Manual wallet lock operation

**Response Actions:**
- Verify kms-unlocker service is running: `docker ps | grep kms-unlocker`
- Check kms-unlocker logs: `docker logs kms-unlocker`
- Manually unlock wallet if needed
- Verify AWS KMS permissions and secrets

### ArkdInsufficientFunds

**Purpose**: Detect when arkd has insufficient funds for operations.

**Configuration:**
```yaml
- alert: ArkdInsufficientFunds
  expr: |
    sum(count_over_time({container="arkd"} |~ "(?i)insufficient funds" [5m])) > 0
  for: 30s
  labels:
    severity: warning
    component: arkd
    alert_type: funding
```

**When It Fires:**
- Transaction fees exceed available balance
- Round outputs require more funds than wallet contains
- Fee rate spike causes unexpected funding shortfall

**Response Actions:**
- Check wallet balance and available UTXOs
- Review recent transaction fee rates
- Consider consolidating UTXOs to reduce fee overhead
- Top up wallet with additional funds

### ArkdUtxoSelectionFailure

**Purpose**: Detect UTXO selection failures that prevent round processing.

**Configuration:**
```yaml
- alert: ArkdUtxoSelectionFailure
  expr: |
    sum(count_over_time({container="arkd"} |~ "(?i)failed to select UTXOs" [5m])) > 0
  for: 30s
  labels:
    severity: warning
    component: arkd
    alert_type: utxo_management
```

**When It Fires:**
- UTXO set is too fragmented
- No single UTXO large enough for round requirements
- Dust UTXOs prevent efficient coin selection
- All UTXOs are locked/reserved

**Response Actions:**
- Check UTXO set: `docker exec arkd-wallet ark-cli listunspent`
- Consider UTXO consolidation transaction
- Review round size parameters
- Check for stuck/pending transactions locking UTXOs

### ArkdLowLiquidityFrequent

**Purpose**: Detect persistent high-frequency liquidity issues requiring immediate attention.

**Configuration:**
```yaml
- alert: ArkdLowLiquidityFrequent
  expr: |
    sum(count_over_time({container="arkd"} |~ "(?i)not enough liquidity" [5m])) > 10
  for: 1m
  labels:
    severity: critical
    component: arkd
    alert_type: liquidity
```

**When It Fires:**
- Low liquidity pattern appears more than 10 times in 5 minutes
- Indicates systemic liquidity management problem
- Arkd likely unable to process rounds consistently

**Response Actions:**
- IMMEDIATE: Check wallet balance and funding status
- Review liquidity management strategy
- Consider emergency wallet top-up
- Investigate root cause of rapid liquidity depletion
- May require service restart after liquidity restoration

### ArkdLiquidityIssue (Combined)

**Purpose**: Detect any liquidity-related error pattern across multiple error types.

**Configuration:**
```yaml
- alert: ArkdLiquidityIssue
  expr: |
    sum(count_over_time({container="arkd"} |~ "(?i)(not enough liquidity|insufficient funds|failed to select UTXOs)" [10m])) > 5
  for: 2m
  labels:
    severity: warning
    component: arkd
    alert_type: liquidity_combined
```

**When It Fires:**
- More than 5 liquidity-related errors in 10 minutes
- Combines all liquidity error patterns
- Indicates broader liquidity management issues

**Response Actions:**
- Comprehensive wallet health check
- Review all liquidity-related logs
- Assess UTXO set health and fragmentation
- Evaluate liquidity management policies
- Consider operational adjustments

## LogQL Alert Best Practices

### Pattern Matching

Use case-insensitive regex for robustness:
```logql
{container="arkd"} |~ "(?i)error pattern"
```

### Time Windows

Choose appropriate time windows based on error frequency:
- Short windows (1-5m): For critical errors that need immediate attention
- Long windows (10-30m): For pattern analysis and trend detection

### Threshold Tuning

- Start conservative (threshold > 0) to catch all occurrences
- Increase threshold after observing baseline error rates
- Use separate alerts for high-frequency variants (critical severity)

### Testing LogQL Queries

Test queries in Grafana Explore before deploying:

1. Navigate to Grafana → Explore
2. Select Loki datasource
3. Enter LogQL query: `{container="arkd"} |~ "(?i)not enough liquidity"`
4. Observe results and adjust pattern
5. Add `count_over_time()` and test threshold logic

### Configurable Thresholds

Use environment variables for flexible threshold tuning:

```yaml
expr: |
  sum(count_over_time({container="arkd"} |~ "(?i)pattern" [${LOKI_ALERT_WINDOW:-5m}])) > ${THRESHOLD:-0}
```

Set at runtime:
```bash
LOKI_ALERT_WINDOW=10m THRESHOLD=5 make docker-run
```

## Loki Alert Maintenance

### Reloading Rules

After editing loki-alert-rules.yml:
```bash
docker restart loki
```

### Validating LogQL Syntax

Test in Grafana Explore or use Loki's API:
```bash
curl -G -s "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query={container="arkd"} |~ "(?i)not enough liquidity"' \
  | jq .
```

### Viewing Loki Alert Status

Check Loki's ruler API:
```bash
curl -s "http://localhost:3100/loki/api/v1/rules" | jq .
```

Or view in Grafana:
1. Navigate to Alerting → Alert rules
2. Filter by datasource: Loki
3. View rule status and firing history

For more information on configuring notification routing, see configuration.md. For dashboard visualization of alert metrics, see dashboards.md.
