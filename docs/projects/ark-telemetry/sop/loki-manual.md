# Loki API Reference & Investigation Manual

Quick reference for querying Loki logs during investigation workflows.

---

## API Reference for Investigation

### Base URL

```
http://localhost:3100/loki/api/v1
```

### Authentication

No built-in auth in default configuration. For multi-tenant deployments, set `X-Scope-OrgID` header.

---

## Query Endpoints

### Instant Query

Query logs at a single point in time (aggregations only).

```bash
# Count logs in last 5 minutes
curl -s "http://localhost:3100/loki/api/v1/query?query=count_over_time({service_name=\"arkd\"}[5m])&time=$(date +%s)"
```

**Note:** Instant queries only work with metric/aggregation queries, not raw log queries.

### Range Query

Query logs over a time range.

```bash
# Last 5 minutes of logs
NOW=$(date +%s)
START=$((NOW - 300))
curl -s "http://localhost:3100/loki/api/v1/query_range?query={service_name=\"arkd\"}&start=${START}&end=${NOW}&limit=100"
```

**With filter:**
```bash
# Logs containing "error"
curl -s "http://localhost:3100/loki/api/v1/query_range?query={service_name=\"arkd\"}|=\"error\"&start=${START}&end=${NOW}&limit=50"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "resultType": "streams",
    "result": [
      {
        "stream": {"service_name": "arkd", "level": "error"},
        "values": [
          ["1700000000000000000", "error: connection refused"]
        ]
      }
    ]
  }
}
```

### Labels

Get all label names.

```bash
curl -s "http://localhost:3100/loki/api/v1/labels"
```

**With time range:**
```bash
NOW=$(date +%s)
START=$((NOW - 3600))
curl -s "http://localhost:3100/loki/api/v1/labels?start=${START}&end=${NOW}"
```

### Label Values

Get values for a specific label.

```bash
curl -s "http://localhost:3100/loki/api/v1/label/service_name/values"
```

### Series

Find log streams matching selectors.

```bash
curl -s "http://localhost:3100/loki/api/v1/series?match[]={service_name=~\".+\"}"
```

### Index Stats

Get statistics about the log index.

```bash
NOW=$(date +%s)
START=$((NOW - 3600))
curl -s "http://localhost:3100/loki/api/v1/index/stats?query={service_name=~\".+\"}&start=${START}&end=${NOW}"
```

---

## Status Endpoints

### Ready Check

```bash
curl -s "http://localhost:3100/ready"
```

### Metrics

```bash
curl -s "http://localhost:3100/metrics"
```

### Config

```bash
curl -s "http://localhost:3100/config"
```

---

## CLI Investigation Examples

### Check Loki Health

```bash
curl -s "http://localhost:3100/ready"
```

### List Available Services

```bash
curl -s "http://localhost:3100/loki/api/v1/label/service_name/values" | jq '.data[]'
```

### Get Recent Logs for a Service

```bash
NOW=$(date +%s)
START=$((NOW - 300))
curl -s "http://localhost:3100/loki/api/v1/query_range?query={service_name=\"arkd\"}&start=${START}&end=${NOW}&limit=50" | jq '.data.result[].values[]'
```

### Search for Error Logs

```bash
NOW=$(date +%s)
START=$((NOW - 3600))
curl -s "http://localhost:3100/loki/api/v1/query_range?query={service_name=\"arkd\"}|=\"error\"&start=${START}&end=${NOW}&limit=100" | jq '.data.result[].values[] | .[1]'
```

### Search with Case-Insensitive Match

```bash
NOW=$(date +%s)
START=$((NOW - 3600))
curl -s "http://localhost:3100/loki/api/v1/query_range?query={service_name=\"arkd\"}|~\"(?i)error\"&start=${START}&end=${NOW}&limit=50"
```

### Filter by Log Level

```bash
NOW=$(date +%s)
START=$((NOW - 3600))
curl -s "http://localhost:3100/loki/api/v1/query_range?query={service_name=\"arkd\",level=\"error\"}&start=${START}&end=${NOW}&limit=100"
```

### Count Errors Over Time

```bash
NOW=$(date +%s)
START=$((NOW - 3600))
curl -s "http://localhost:3100/loki/api/v1/query_range?query=count_over_time({service_name=\"arkd\"}|=\"error\"[5m])&start=${START}&end=${NOW}&step=300" | jq '.data.result'
```

### Get Logs Around a Specific Time

```bash
# Get logs around a specific incident (e.g., 10:30 AM)
INCIDENT_TIME=1700000000  # Replace with actual timestamp
START=$((INCIDENT_TIME - 300))
END=$((INCIDENT_TIME + 300))
curl -s "http://localhost:3100/loki/api/v1/query_range?query={service_name=\"arkd\"}&start=${START}&end=${END}&limit=200"
```

### Extract JSON Fields from Logs

```bash
NOW=$(date +%s)
START=$((NOW - 3600))
curl -s "http://localhost:3100/loki/api/v1/query_range?query={service_name=\"arkd\"}|json|error!=\"\"&start=${START}&end=${NOW}&limit=50"
```

### Rate of Log Lines per Minute

```bash
NOW=$(date +%s)
START=$((NOW - 3600))
curl -s "http://localhost:3100/loki/api/v1/query_range?query=rate({service_name=\"arkd\"}[1m])&start=${START}&end=${NOW}&step=60" | jq '.data.result[].values'
```

### Top Error Messages (Aggregation)

```bash
NOW=$(date +%s)
START=$((NOW - 3600))
curl -s "http://localhost:3100/loki/api/v1/query_range?query=topk(10,sum(count_over_time({service_name=\"arkd\"}|=\"error\"[1h]))by(level))&start=${START}&end=${NOW}&step=3600"
```

---

## LogQL Query Syntax

### Stream Selectors

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Exact match | `{service_name="arkd"}` |
| `!=` | Not equal | `{service_name!="test"}` |
| `=~` | Regex match | `{service_name=~"ark.*"}` |
| `!~` | Regex not match | `{service_name!~"test.*"}` |

### Line Filters

| Operator | Description | Example |
|----------|-------------|---------|
| `\|=` | Contains | `{job="arkd"} \|= "error"` |
| `!=` | Not contains | `{job="arkd"} != "debug"` |
| `\|~` | Regex match | `{job="arkd"} \|~ "error\|warn"` |
| `!~` | Regex not match | `{job="arkd"} !~ "debug\|trace"` |

### Parser Expressions

| Parser | Description | Example |
|--------|-------------|---------|
| `json` | Parse JSON logs | `{job="arkd"} \| json` |
| `logfmt` | Parse logfmt | `{job="arkd"} \| logfmt` |
| `regexp` | Extract with regex | `{job="arkd"} \| regexp "(?P<ip>\\d+\\.\\d+\\.\\d+\\.\\d+)"` |
| `pattern` | Pattern extraction | `{job="arkd"} \| pattern "<ip> - - <_>"` |

### Aggregation Functions

| Function | Description |
|----------|-------------|
| `count_over_time(log_stream[interval])` | Count log lines |
| `rate(log_stream[interval])` | Log lines per second |
| `bytes_over_time(log_stream[interval])` | Bytes in logs |
| `bytes_rate(log_stream[interval])` | Bytes per second |
| `sum`, `avg`, `min`, `max` | Aggregate metrics |
| `topk(n, expr)` | Top N results |
| `bottomk(n, expr)` | Bottom N results |

---

## Common Investigation Queries

| Use Case | LogQL Query |
|----------|-------------|
| All error logs | `{service_name="arkd"} \|= "error"` |
| HTTP 5xx errors | `{service_name="arkd"} \|= "status_code=5"` |
| Slow requests | `{service_name="arkd"} \| json \| duration > 1000` |
| Stack traces | `{service_name="arkd"} \|= "panic" or \|= "stacktrace"` |
| Connection errors | `{service_name="arkd"} \|~ "connection refused\|timeout"` |
| gRPC errors | `{service_name="arkd"} \|= "rpc error"` |
| Database errors | `{service_name="arkd"} \|~ "sql\|postgres\|database"` |
| Error rate (per minute) | `rate({service_name="arkd"} \|= "error"[1m])` |
| Error count (last hour) | `count_over_time({service_name="arkd"} \|= "error"[1h])` |

---

## Query Parameters Reference

| Parameter | Description | Example |
|-----------|-------------|---------|
| `query` | LogQL expression | `{service_name="arkd"}` |
| `start` | Start time (Unix nanoseconds or seconds) | `1700000000` |
| `end` | End time (Unix nanoseconds or seconds) | `1700003600` |
| `limit` | Max entries to return | `100` |
| `direction` | Sort order (`forward` or `backward`) | `backward` |
| `step` | Query resolution for range queries | `60` |

---

## Time Format Notes

Loki accepts timestamps in multiple formats:
- Unix seconds: `1700000000`
- Unix nanoseconds: `1700000000000000000`
- RFC3339: `2023-11-15T10:00:00Z`

**Important:** Query range is limited by Loki configuration (default: 30 days).

---

## References

- [Loki API Reference](https://grafana.com/docs/loki/latest/reference/api/)
- [LogQL Documentation](https://grafana.com/docs/loki/latest/query/)
- [LogQL Cheat Sheet](https://grafana.com/docs/loki/latest/query/query_examples/)
