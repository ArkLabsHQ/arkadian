# Prometheus API Reference & Investigation Manual

Quick reference for querying Prometheus metrics during investigation workflows.

---

## API Reference for Investigation

### Base URL

```
http://localhost:9090/api/v1
```

### Authentication

No built-in auth in default configuration. For production, configure authentication via reverse proxy.

---

## Query Endpoints

### Instant Query

Query metrics at a single point in time.

```bash
curl -s "http://localhost:9090/api/v1/query?query=up"
```

**With time parameter:**
```bash
curl -s "http://localhost:9090/api/v1/query?query=up&time=$(date +%s)"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "resultType": "vector",
    "result": [
      {
        "metric": {"__name__": "up", "job": "arkd"},
        "value": [1700000000, "1"]
      }
    ]
  }
}
```

### Range Query

Query metrics over a time range.

```bash
# Last 30 minutes with 60s step
NOW=$(date +%s)
START=$((NOW - 1800))
curl -s "http://localhost:9090/api/v1/query_range?query=rate(process_cpu_seconds_total[5m])&start=${START}&end=${NOW}&step=60"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "resultType": "matrix",
    "result": [
      {
        "metric": {"job": "arkd"},
        "values": [[1700000000, "0.5"], [1700000060, "0.6"]]
      }
    ]
  }
}
```

### Label Names

Get all label names.

```bash
curl -s "http://localhost:9090/api/v1/labels"
```

**With time range:**
```bash
NOW=$(date +%s)
START=$((NOW - 3600))
curl -s "http://localhost:9090/api/v1/labels?start=${START}&end=${NOW}"
```

### Label Values

Get values for a specific label.

```bash
curl -s "http://localhost:9090/api/v1/label/job/values"
```

### Series

Find series matching selectors.

```bash
curl -s "http://localhost:9090/api/v1/series?match[]=up"

# Multiple matchers
curl -s "http://localhost:9090/api/v1/series?match[]=up&match[]=process_cpu_seconds_total"
```

### Metadata

Get metric metadata.

```bash
curl -s "http://localhost:9090/api/v1/metadata?metric=process_cpu_seconds_total"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "process_cpu_seconds_total": [
      {
        "type": "counter",
        "unit": "",
        "help": "Total user and system CPU time spent in seconds."
      }
    ]
  }
}
```

---

## Status Endpoints

### Targets

Get scrape target status.

```bash
curl -s "http://localhost:9090/api/v1/targets"
```

**Response includes:**
- `activeTargets`: Currently scraped targets
- `droppedTargets`: Targets that were dropped

### Rules

Get alerting and recording rules.

```bash
curl -s "http://localhost:9090/api/v1/rules"

# Filter by type
curl -s "http://localhost:9090/api/v1/rules?type=alert"
```

### Alerts

Get currently firing alerts.

```bash
curl -s "http://localhost:9090/api/v1/alerts"
```

### Configuration

Get current Prometheus configuration.

```bash
curl -s "http://localhost:9090/api/v1/status/config"
```

### Runtime Information

```bash
curl -s "http://localhost:9090/api/v1/status/runtimeinfo"
```

### Build Information

```bash
curl -s "http://localhost:9090/api/v1/status/buildinfo"
```

### TSDB Statistics

Get time series database stats.

```bash
curl -s "http://localhost:9090/api/v1/status/tsdb"
```

**Response includes:**
- `headStats`: Current head block stats
- `seriesCountByMetricName`: Top metrics by series count

---

## CLI Investigation Examples

### Check Prometheus Health

```bash
# Ready check
curl -s "http://localhost:9090/-/ready"

# Health check
curl -s "http://localhost:9090/-/healthy"
```

### Get CPU Usage Over Last Hour

```bash
NOW=$(date +%s)
START=$((NOW - 3600))
curl -s "http://localhost:9090/api/v1/query_range?query=rate(process_cpu_seconds_total[5m])&start=${START}&end=${NOW}&step=60" | jq '.data.result[].values[-1]'
```

### Get Current Memory Usage

```bash
curl -s "http://localhost:9090/api/v1/query?query=process_resident_memory_bytes" | jq '.data.result[] | {job: .metric.job, memory_mb: (.value[1] | tonumber / 1048576)}'
```

### Get Error Rate (5xx)

```bash
curl -s "http://localhost:9090/api/v1/query?query=sum(rate(http_requests_total{status_code=~\"5..\"}[5m]))" | jq '.data.result[].value[1]'
```

### Get Request Latency Percentiles

```bash
# P99 latency
curl -s "http://localhost:9090/api/v1/query?query=histogram_quantile(0.99,rate(http_request_duration_seconds_bucket[5m]))" | jq '.data.result'

# P50 latency
curl -s "http://localhost:9090/api/v1/query?query=histogram_quantile(0.50,rate(http_request_duration_seconds_bucket[5m]))" | jq '.data.result'
```

### Get All Firing Alerts

```bash
curl -s "http://localhost:9090/api/v1/alerts" | jq '.data.alerts[] | select(.state == "firing") | {alertname: .labels.alertname, severity: .labels.severity}'
```

### Check Target Health

```bash
curl -s "http://localhost:9090/api/v1/targets" | jq '.data.activeTargets[] | {job: .labels.job, health: .health, lastScrape: .lastScrape}'
```

### Get Top 10 Metrics by Series Count

```bash
curl -s "http://localhost:9090/api/v1/status/tsdb" | jq '.data.seriesCountByMetricName[:10]'
```

### Compare Metric Value Over Two Time Ranges

```bash
# 1 hour ago vs now
NOW=$(date +%s)
HOUR_AGO=$((NOW - 3600))

echo "=== 1 Hour Ago ==="
curl -s "http://localhost:9090/api/v1/query?query=process_cpu_seconds_total&time=${HOUR_AGO}" | jq '.data.result[].value[1]'

echo "=== Now ==="
curl -s "http://localhost:9090/api/v1/query?query=process_cpu_seconds_total&time=${NOW}" | jq '.data.result[].value[1]'
```

---

## Common PromQL Queries for Investigation

| Use Case | Query |
|----------|-------|
| CPU usage rate | `rate(process_cpu_seconds_total[5m])` |
| Memory usage | `process_resident_memory_bytes` |
| HTTP request rate | `sum(rate(http_requests_total[5m]))` |
| Error rate (5xx) | `sum(rate(http_requests_total{status_code=~"5.."}[5m]))` |
| P99 latency | `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))` |
| Up/Down status | `up{job="arkd"}` |
| Goroutine count | `go_goroutines` |
| Open file descriptors | `process_open_fds` |
| Heap memory | `go_memstats_heap_alloc_bytes` |
| GC pause time | `rate(go_gc_duration_seconds_sum[5m])` |

---

## Query Parameters Reference

| Parameter | Description | Example |
|-----------|-------------|---------|
| `query` | PromQL expression | `up{job="arkd"}` |
| `time` | Evaluation timestamp (Unix) | `1700000000` |
| `start` | Range start (Unix) | `1699996400` |
| `end` | Range end (Unix) | `1700000000` |
| `step` | Query resolution (seconds) | `60` |
| `timeout` | Evaluation timeout | `30s` |
| `match[]` | Series selector | `up{job="arkd"}` |

---

## References

- [Prometheus HTTP API](https://prometheus.io/docs/prometheus/latest/querying/api/)
- [PromQL Documentation](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)
