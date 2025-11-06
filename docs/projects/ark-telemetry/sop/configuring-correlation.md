# Configuring Data Source Correlation - SOP

## Overview

This guide provides procedures for configuring and using Grafana data source correlation in ark-telemetry. Data source correlation enables seamless navigation between logs (Loki), metrics (Prometheus), traces (Jaeger), and profiles (Pyroscope) to accelerate troubleshooting and investigation workflows.

**Reference Documentation:**
- Components: `/docs/projects/ark-telemetry/system/components.md`
- Architecture: `/docs/projects/ark-telemetry/system/architecture.md`
- Configuration: `/docs/projects/ark-telemetry/system/configuration.md`

## Prerequisites

- [ ] Grafana running at http://localhost:3333
- [ ] All observability components running (Loki, Prometheus, Jaeger, Pyroscope)
- [ ] Ark services instrumented with trace IDs in logs
- [ ] Basic understanding of trace IDs and observability concepts

## What is Data Source Correlation?

Data source correlation creates clickable links between different observability signals:

**Common Workflows:**
- **Logs → Traces**: Click trace ID in logs to view full distributed trace
- **Logs → Profiles**: Click service name in logs to view CPU/memory profiles
- **Metrics → Traces**: Click metric spike to see trace that contributed to it
- **Traces → Logs**: From trace span, jump to associated logs
- **Traces → Metrics**: View metric trends for traced requests

## Architecture: How Correlation Works

### Required Tag Consistency

For correlation to work, Ark services must emit **consistent identifiers** across all signals:

```
Trace ID: abc123def456  ← Primary correlation key
Service Name: arkd      ← Secondary correlation key
Time Range: 14:30-14:35 ← Temporal correlation
```

All four observability backends must receive data tagged with these identifiers:
- **Loki**: `{service="arkd", trace_id="abc123def456"}`
- **Prometheus**: `{job="arkd"}` + exemplar with `traceID=abc123def456`
- **Jaeger**: Trace `abc123def456` with service tag `arkd`
- **Pyroscope**: Profile `{service_name="arkd"}` at timestamp matching trace

### Correlation Mechanisms

**1. Derived Fields (Loki)**
- Extract patterns from log text (regex)
- Generate clickable links to other data sources
- Example: Extract `trace_id=abc123` → link to Jaeger

**2. Exemplars (Prometheus)**
- Attach trace IDs to metric samples
- Enable "click metric spike → view trace"
- Requires OpenTelemetry instrumentation with exemplar support

**3. Trace-to-X Links (Jaeger)**
- Built-in Grafana correlation from traces to logs/metrics
- Uses tag mapping (e.g., `service.name` → `service` label)

## Procedure: Verify Correlation Configuration

The ark-telemetry stack includes pre-configured correlation in data source provisioning files.

### Step 1: Verify Data Source Files

**Check that correlation is configured:**

```bash
cd /Users/dusansekulic/code/go/ark-telemetry

# Verify Loki has derived fields
grep -A 10 "derivedFields" provisioning/datasources/loki.yaml

# Verify Prometheus has exemplar configuration
grep -A 5 "exemplarTraceIdDestinations" provisioning/datasources/prometheus.yaml

# Verify Jaeger has traces-to-logs/metrics
grep -A 10 "tracesToLogs" provisioning/datasources/jaeger.yaml
```

**Expected output:**
- Loki: 3 derived fields (TraceID, TraceIDQuoted, ServiceProfile)
- Prometheus: exemplarTraceIdDestinations with jaeger datasourceUid
- Jaeger: tracesToLogsV2 and tracesToMetrics configured

### Step 2: Restart Grafana to Apply Configuration

```bash
cd /Users/dusansekulic/code/go/ark-telemetry

# Restart entire stack (recommended for first-time setup)
make docker-stop
make docker-run

# Or restart only Grafana (if data sources already running)
docker restart grafana
```

**Verify Grafana started successfully:**
```bash
docker logs grafana | grep -i "provisioning"
```

Expected log messages:
```
[provisioning] datasources: Loki
[provisioning] datasources: Prometheus
[provisioning] datasources: Jaeger
[provisioning] datasources: Pyroscope
```

### Step 3: Verify in Grafana UI

1. **Open Grafana**: http://localhost:3333
2. **Navigate to**: Configuration → Data Sources
3. **Check each data source:**

**Loki:**
- Scroll to "Derived fields"
- Should see 3 fields: TraceID, TraceIDQuoted, ServiceProfile
- Each should have a data source link (Jaeger or Pyroscope)

**Prometheus:**
- Scroll to "Exemplars"
- Should see "Trace ID destinations" configured
- Data source: Jaeger

**Jaeger:**
- Scroll to "Trace to logs"
- Should see Loki configured
- Scroll to "Trace to metrics"
- Should see Prometheus configured

**If configuration is missing:**
- Check file syntax (YAML indentation)
- Verify `uid` fields match between data sources
- Restart Grafana: `docker restart grafana`

## Procedure: Using Correlation Features

### Workflow 1: Logs → Traces

**Scenario:** Investigating slow request by jumping from logs to trace.

1. **Open Grafana Explore**: http://localhost:3333/explore
2. **Select data source**: Loki
3. **Query logs with trace IDs:**
   ```logql
   {service="arkd"} |= "trace_id"
   ```
4. **View results**: Logs containing trace IDs display
5. **Click trace ID link**: Blue clickable link appears next to trace ID
6. **Action**: Click "View Trace"
7. **Result**: Opens Jaeger with the specific trace loaded

**Expected behavior:**
- Link appears as `[View Trace]` button next to trace ID
- Clicking opens new Explore tab with Jaeger data source
- Trace view shows all spans, timing, and tags

**Troubleshooting:**
- **No link appears**: Verify log contains `trace_id=<hex>` or `trace_id:<hex>` pattern
- **Link error**: Check Jaeger data source is running: http://localhost:16686
- **Trace not found**: Verify trace ID exists in Jaeger

### Workflow 2: Logs → Profiles

**Scenario:** High CPU usage reported in logs; jump to profile.

1. **Query logs for service:**
   ```logql
   {service="arkd"} |= "high cpu" or "performance"
   ```
2. **Identify service name** in log line
3. **Click "View CPU Profile" link** next to service field
4. **Result**: Opens Pyroscope with CPU flame graph for that service

**Expected behavior:**
- Opens Pyroscope filtered to service and time range
- Shows CPU profile flame graph
- Hovering over flame graph shows function call stacks

### Workflow 3: Metrics → Traces (via Exemplars)

**Scenario:** CPU spike in dashboard; investigate with trace.

**Prerequisites:**
- Ark service must emit exemplars (requires OpenTelemetry SDK configuration)
- Prometheus must scrape exemplars (enabled by default)

1. **Open dashboard with metrics** (e.g., Ark Go Metrics)
2. **Identify metric spike** (e.g., CPU usage spike at 14:30)
3. **Hover over data point** on graph
4. **Look for exemplar marker**: Small diamond/dot on the data point
5. **Click exemplar marker**
6. **Select "View Trace"** from context menu
7. **Result**: Opens Jaeger with trace that contributed to that metric sample

**Expected behavior:**
- Exemplars appear as markers overlaid on metric graphs
- Tooltip shows `traceID` value
- Clicking opens trace in Jaeger

**Troubleshooting:**
- **No exemplars visible**:
  - Enable in panel: Edit panel → Query options → Exemplars: true
  - Verify Ark service emits exemplars (check instrumentation)
  - Query Prometheus exemplars directly:
    ```bash
    curl 'http://localhost:9090/api/v1/query_exemplars?query=rate(arkd_request_duration_seconds[5m])'
    ```

### Workflow 4: Traces → Logs

**Scenario:** Slow trace detected; view associated logs.

1. **Open Jaeger UI**: http://localhost:16686
2. **Search for traces** (e.g., service: arkd, operation: ProcessRound)
3. **Select a trace** with high duration
4. **In trace view**, look for **"Logs for this span"** button
5. **Click "Logs for this span"**
6. **Result**: Opens Grafana Explore with Loki, filtered to:
   - Same service
   - Time range: ±1 hour around span
   - Filtered by trace ID (if `filterByTraceID: true`)

**Expected behavior:**
- Opens Loki with relevant logs pre-filtered
- Shows logs from all services involved in the trace
- Time range automatically adjusted to span duration

### Workflow 5: Traces → Metrics

**Scenario:** Trace shows slow database query; check metric trends.

1. **In Jaeger trace view**, click **"Metrics"** tab or button
2. **View related metrics queries**:
   - Request rate for this service
   - Error rate
   - Duration percentiles
3. **Result**: Shows Prometheus metrics for the traced service over time

**Expected behavior:**
- Metrics charts appear inline in Jaeger UI
- Time range matches trace timestamp ±1 hour
- Service label automatically applied from trace tags

## Procedure: Customizing Correlation

### Add Custom Derived Field to Loki

**Use case:** Extract custom log pattern and link to external system.

**Edit file:**
```bash
vi /Users/dusansekulic/code/go/ark-telemetry/provisioning/datasources/loki.yaml
```

**Add new derived field:**
```yaml
derivedFields:
  # ... existing fields ...

  # Link to external system via custom ID
  - name: RoundID
    matcherRegex: "round_id[=:\\s]([0-9]+)"
    url: "https://ark-explorer.example.com/round/$${__value.raw}"
    urlDisplayLabel: "View Round in Explorer"
```

**Restart Grafana:**
```bash
docker restart grafana
```

**Test:**
- Query logs: `{service="arkd"} |= "round_id"`
- Verify "View Round in Explorer" link appears

### Add Custom Trace-to-Metrics Query

**Use case:** Add custom metric query for trace analysis.

**Edit file:**
```bash
vi /Users/dusansekulic/code/go/ark-telemetry/provisioning/datasources/jaeger.yaml
```

**Add query to tracesToMetrics:**
```yaml
tracesToMetrics:
  datasourceUid: prometheus
  queries:
    # ... existing queries ...

    - name: "Database Query Duration"
      query: "histogram_quantile(0.95, rate(arkd_db_query_duration_seconds_bucket{$__tags}[5m]))"
```

**Restart Grafana:**
```bash
docker restart grafana
```

### Adjust Time Range Shifts

**Use case:** Expand time window when jumping from traces to logs.

**Default:** ±1 hour around span
**Change to:** ±3 hours for longer investigations

**Edit file:**
```bash
vi /Users/dusansekulic/code/go/ark-telemetry/provisioning/datasources/jaeger.yaml
```

**Modify:**
```yaml
tracesToLogsV2:
  spanStartTimeShift: "-3h"  # Changed from -1h
  spanEndTimeShift: "3h"     # Changed from 1h
```

## Procedure: Instrumenting Ark Services for Correlation

For correlation to work end-to-end, Ark services must emit trace IDs in logs.

### Go Service Instrumentation (arkd, arkd-wallet)

**Add trace context to structured logs:**

```go
import (
    "context"
    "go.opentelemetry.io/otel/trace"
    "go.uber.org/zap"
)

func LogWithTrace(ctx context.Context, logger *zap.Logger, msg string) {
    span := trace.SpanFromContext(ctx)
    traceID := span.SpanContext().TraceID().String()
    spanID := span.SpanContext().SpanID().String()

    logger.Info(msg,
        zap.String("trace_id", traceID),
        zap.String("span_id", spanID),
        zap.String("service", "arkd"),
    )
}
```

**Add exemplars to Prometheus metrics:**

```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "go.opentelemetry.io/otel/trace"
)

// Create histogram with exemplar support
requestDuration := prometheus.NewHistogramVec(
    prometheus.HistogramOpts{
        Name: "arkd_request_duration_seconds",
        Help: "Request duration in seconds",
    },
    []string{"method", "status"},
)

// Record metric with exemplar
func RecordWithExemplar(ctx context.Context, duration float64) {
    span := trace.SpanFromContext(ctx)
    traceID := span.SpanContext().TraceID().String()

    exemplar := prometheus.Labels{
        "traceID": traceID,
    }

    requestDuration.WithLabelValues("POST", "200").
        ObserveWithExemplar(duration, exemplar)
}
```

### Verify Instrumentation

**Check logs contain trace IDs:**
```bash
docker logs arkd 2>&1 | grep -o 'trace_id=[a-f0-9]\+' | head -5
```

**Expected output:**
```
trace_id=abc123def456789
trace_id=fedcba987654321
...
```

**Check Prometheus receives exemplars:**
```bash
curl -s 'http://localhost:9090/api/v1/query_exemplars?query=rate(arkd_request_duration_seconds[5m])' | jq .
```

**Expected output:**
```json
{
  "status": "success",
  "data": [
    {
      "seriesLabels": {"method": "POST", "status": "200"},
      "exemplars": [
        {
          "labels": {"traceID": "abc123..."},
          "value": "0.523",
          "timestamp": 1699000000.0
        }
      ]
    }
  ]
}
```

## Troubleshooting

### Derived Fields Not Appearing

**Symptom:** Log lines show trace IDs, but no clickable links appear.

**Diagnosis:**
1. Check regex pattern matches log format:
   ```bash
   # Test regex locally
   echo 'trace_id=abc123' | grep -oE 'trace_id[=:]([a-fA-F0-9]+)'
   ```
2. Verify data source UID matches:
   ```bash
   grep "uid:" provisioning/datasources/*.yaml
   ```
3. Check Grafana logs for provisioning errors:
   ```bash
   docker logs grafana | grep -i error
   ```

**Solution:**
- Fix regex pattern in loki.yaml
- Ensure target data source (Jaeger/Pyroscope) has matching `uid`
- Restart Grafana: `docker restart grafana`

### Exemplars Not Showing in Metrics

**Symptom:** No diamond markers on metric graphs.

**Diagnosis:**
1. Verify panel has exemplars enabled:
   - Edit panel → Query options → Exemplars: true
2. Check if metrics have exemplars:
   ```bash
   curl -s 'http://localhost:9090/api/v1/query_exemplars?query=up' | jq .
   ```
3. Verify OpenTelemetry instrumentation emits exemplars

**Solution:**
- Enable exemplars in panel settings
- Update Ark service to emit exemplars (see instrumentation above)
- Verify Prometheus scrape config includes exemplars (enabled by default)

### Trace-to-Logs Returns Empty Results

**Symptom:** Clicking "Logs for this span" in Jaeger opens Loki with no results.

**Diagnosis:**
1. Check tag mapping:
   - Jaeger trace has tag `service.name=arkd`
   - Loki logs have label `{service="arkd"}`
   - Tag key in jaeger.yaml should be `service.name`
   - Tag value should map to `service` label
2. Verify time range:
   - Check if logs exist in ±1 hour window
   - Expand time range in Loki Explore
3. Verify filterByTraceID:
   - If `true`, logs MUST contain trace_id field
   - If no trace_id in logs, set to `false`

**Solution:**
- Adjust tag mapping in jaeger.yaml:
  ```yaml
  tags:
    - key: "service.name"
      value: "service"  # Must match Loki label name
  ```
- Increase time shift if logs are outside window
- Disable filterByTraceID if trace IDs not in logs
- Restart Grafana

### Links Open to Wrong Data Source

**Symptom:** Clicking link opens correct data source but wrong query/data.

**Diagnosis:**
- Check datasourceUid matches target data source name
- Verify URL template syntax: `$${__value.raw}` for captured regex group

**Solution:**
```bash
# List all data source UIDs
grep "uid:" provisioning/datasources/*.yaml

# Expected output:
# loki.yaml:    uid: loki
# prometheus.yaml:    uid: prometheus
# jaeger.yaml:    uid: jaeger
# pyroscope.yaml:    uid: pyroscope

# Verify these match datasourceUid in correlation configs
```

## Validation Checklist

After configuration, verify all correlation paths work:

- [ ] **Logs → Traces**: Trace ID link in Loki opens Jaeger trace
- [ ] **Logs → Profiles**: Service link in Loki opens Pyroscope profile
- [ ] **Metrics → Traces**: Exemplar marker in Prometheus opens Jaeger trace
- [ ] **Traces → Logs**: "Logs for span" in Jaeger opens filtered Loki logs
- [ ] **Traces → Metrics**: Metrics tab in Jaeger shows Prometheus charts
- [ ] All data sources have unique `uid` fields
- [ ] Tag naming is consistent across all services (service vs service.name)
- [ ] Time range shifts provide adequate context (±1h default)

## Performance Considerations

**Derived Fields:**
- Minimal overhead (client-side regex matching in browser)
- No impact on log ingestion or storage

**Exemplars:**
- Small storage overhead (~1% of metric storage)
- Requires OpenTelemetry SDK support
- Prometheus scrapes exemplars automatically (no config needed)

**Trace Correlation:**
- Uses Grafana's built-in correlation engine
- No additional backend services required
- All correlation logic runs in Grafana frontend

## Next Steps

1. **Instrument services**: Ensure all Ark services emit trace IDs in logs
2. **Enable exemplars**: Update OpenTelemetry SDK to record exemplars
3. **Create dashboards**: Build unified dashboards with correlation-enabled panels
4. **Train team**: Show operators how to use correlation for investigations
5. **Monitor usage**: Track which correlation paths are most valuable

For dashboard creation with correlation, see `sop/adding-dashboards.md`.
For alert configuration, see `sop/adding-alerts.md`.
