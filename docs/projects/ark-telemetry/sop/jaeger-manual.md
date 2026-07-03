# Jaeger API Reference & Investigation Manual

Quick reference for querying Jaeger traces during investigation workflows.

> **PR #13 (June 2026)**: stack now runs **Jaeger v2** (`jaegertracing/jaeger:2.18.0`) with BadgerDB filesystem storage (48h span TTL, persisted across restarts). OTLP is received directly on `:4317` / `:4318` — the legacy `14250` collector port and `COLLECTOR_OTLP_ENABLED` env var are gone. The query API surface (`/api/services`, `/api/traces`, `/api/dependencies`, …) is unchanged.

---

## API Reference for Investigation

### Base URL

```
http://localhost:16686/api
```

### Authentication

No built-in auth in default configuration. For production, configure authentication via reverse proxy.

**Note:** If experiencing connection issues, force IPv4 with `curl -4`.

---

## Query Endpoints

### List Services

Get all services that have sent traces.

```bash
curl -4 -s "http://localhost:16686/api/services"
```

**Response:**
```json
{
  "data": ["arkd", "arkd-wallet", "jaeger-all-in-one"],
  "total": 3,
  "limit": 0,
  "offset": 0,
  "errors": null
}
```

### List Operations

Get all operations for a service.

```bash
curl -4 -s "http://localhost:16686/api/operations?service=arkd"
```

**With span kind filter:**
```bash
curl -4 -s "http://localhost:16686/api/operations?service=arkd&spanKind=server"
```

**Response:**
```json
{
  "data": [
    {"name": "ark.v1.ArkService/GetInfo", "spanKind": "server"},
    {"name": "arkwallet.v1.WalletService/GetBalance", "spanKind": "client"}
  ],
  "total": 50,
  "limit": 0,
  "offset": 0,
  "errors": null
}
```

### Search Traces

Search for traces matching criteria.

```bash
# Basic search (last hour)
NOW_MICROS=$(($(date +%s) * 1000000))
HOUR_AGO_MICROS=$((($(date +%s) - 3600) * 1000000))
curl -4 -s "http://localhost:16686/api/traces?service=arkd&limit=20&start=${HOUR_AGO_MICROS}&end=${NOW_MICROS}"
```

**With duration filter (find slow traces):**
```bash
curl -4 -s "http://localhost:16686/api/traces?service=arkd&limit=20&minDuration=100ms&start=${HOUR_AGO_MICROS}&end=${NOW_MICROS}"
```

**With operation filter:**
```bash
curl -4 -s "http://localhost:16686/api/traces?service=arkd&operation=ark.v1.ArkService/GetInfo&limit=20&start=${HOUR_AGO_MICROS}&end=${NOW_MICROS}"
```

**With tags filter:**
```bash
curl -4 -s "http://localhost:16686/api/traces?service=arkd&tags={\"rpc.grpc.status_code\":\"0\"}&limit=20&start=${HOUR_AGO_MICROS}&end=${NOW_MICROS}"
```

### Get Single Trace

Get a complete trace by ID.

```bash
curl -4 -s "http://localhost:16686/api/traces/60f53e17fd9f6211b11c26d3ce9b2c93"
```

**Response Structure:**
```json
{
  "data": [{
    "traceID": "60f53e17fd9f6211b11c26d3ce9b2c93",
    "spans": [
      {
        "traceID": "60f53e17fd9f6211b11c26d3ce9b2c93",
        "spanID": "7dc918e9c876a93c",
        "operationName": "ark.v1.ArkService/GetInfo",
        "references": [],
        "startTime": 1700000000000000,
        "duration": 5340,
        "tags": [
          {"key": "rpc.grpc.status_code", "type": "int64", "value": 0},
          {"key": "span.kind", "type": "string", "value": "server"}
        ],
        "logs": [],
        "processID": "p1"
      }
    ],
    "processes": {
      "p1": {
        "serviceName": "arkd",
        "tags": [{"key": "hostname", "type": "string", "value": "arkd-server"}]
      }
    }
  }]
}
```

### Service Dependencies

Get dependency graph between services.

```bash
# Dependencies in last 24 hours
END_TS=$(($(date +%s) * 1000))
curl -4 -s "http://localhost:16686/api/dependencies?endTs=${END_TS}&lookback=86400000"
```

**Response:**
```json
{
  "data": [
    {"parent": "arkd", "child": "arkd-wallet", "callCount": 1500}
  ]
}
```

---

## Status Endpoints

### Health Check

```bash
curl -4 -s "http://localhost:16686/"
# Returns HTML if healthy
```

### Metrics

```bash
curl -4 -s "http://localhost:16686/metrics"
```

---

## CLI Investigation Examples

### Check Jaeger Health

```bash
curl -4 -s -o /dev/null -w "%{http_code}" "http://localhost:16686/"
# Should return 200
```

### List All Services

```bash
curl -4 -s "http://localhost:16686/api/services" | jq '.data[]'
```

### Get Operations for a Service

```bash
curl -4 -s "http://localhost:16686/api/operations?service=arkd" | jq '.data[] | .name'
```

### Find Slow Traces (>100ms)

```bash
NOW_MICROS=$(($(date +%s) * 1000000))
HOUR_AGO_MICROS=$((($(date +%s) - 3600) * 1000000))
curl -4 -s "http://localhost:16686/api/traces?service=arkd&minDuration=100ms&limit=10&start=${HOUR_AGO_MICROS}&end=${NOW_MICROS}" | jq '.data[] | {traceID, duration: .spans[0].duration}'
```

### Find Error Traces

```bash
NOW_MICROS=$(($(date +%s) * 1000000))
HOUR_AGO_MICROS=$((($(date +%s) - 3600) * 1000000))
curl -4 -s "http://localhost:16686/api/traces?service=arkd&tags={\"error\":\"true\"}&limit=20&start=${HOUR_AGO_MICROS}&end=${NOW_MICROS}" | jq '.data | length'
```

### Get Trace Details

```bash
# Get a trace ID first
NOW_MICROS=$(($(date +%s) * 1000000))
HOUR_AGO_MICROS=$((($(date +%s) - 3600) * 1000000))
TRACE_ID=$(curl -4 -s "http://localhost:16686/api/traces?service=arkd&limit=1&start=${HOUR_AGO_MICROS}&end=${NOW_MICROS}" | jq -r '.data[0].traceID')

# Get full trace
curl -4 -s "http://localhost:16686/api/traces/${TRACE_ID}" | jq '.data[0].spans[] | {operation: .operationName, duration: .duration, status: (.tags[] | select(.key == "rpc.grpc.status_code") | .value)}'
```

### Analyze Trace Span Durations

```bash
TRACE_ID="your-trace-id-here"
curl -4 -s "http://localhost:16686/api/traces/${TRACE_ID}" | jq '[.data[0].spans[] | {op: .operationName, duration_us: .duration}] | sort_by(-.duration_us) | .[0:5]'
```

### Find Traces for Specific Operation

```bash
NOW_MICROS=$(($(date +%s) * 1000000))
HOUR_AGO_MICROS=$((($(date +%s) - 3600) * 1000000))
curl -4 -s "http://localhost:16686/api/traces?service=arkd&operation=ark.v1.ArkService/GetInfo&limit=10&start=${HOUR_AGO_MICROS}&end=${NOW_MICROS}" | jq '.data | length'
```

### Get Service Dependencies

```bash
END_TS=$(($(date +%s) * 1000))
curl -4 -s "http://localhost:16686/api/dependencies?endTs=${END_TS}&lookback=86400000" | jq '.data[] | "\(.parent) -> \(.child): \(.callCount) calls"'
```

### Calculate Average Latency for Operation

```bash
NOW_MICROS=$(($(date +%s) * 1000000))
HOUR_AGO_MICROS=$((($(date +%s) - 3600) * 1000000))
curl -4 -s "http://localhost:16686/api/traces?service=arkd&operation=ark.v1.ArkService/GetInfo&limit=100&start=${HOUR_AGO_MICROS}&end=${NOW_MICROS}" | jq '[.data[].spans[0].duration] | add / length'
```

### Find Traces Around a Specific Time

```bash
# 5 minutes around incident time
INCIDENT_TIME=1700000000  # Replace with actual timestamp
START_MICROS=$(((INCIDENT_TIME - 300) * 1000000))
END_MICROS=$(((INCIDENT_TIME + 300) * 1000000))
curl -4 -s "http://localhost:16686/api/traces?service=arkd&limit=50&start=${START_MICROS}&end=${END_MICROS}"
```

---

## Query Parameters Reference

| Parameter | Description | Example |
|-----------|-------------|---------|
| `service` | Service name (required) | `arkd` |
| `operation` | Operation name filter | `ark.v1.ArkService/GetInfo` |
| `start` | Start time (microseconds) | `1700000000000000` |
| `end` | End time (microseconds) | `1700003600000000` |
| `limit` | Max traces to return | `20` |
| `minDuration` | Minimum trace duration | `100ms`, `1s` |
| `maxDuration` | Maximum trace duration | `10s` |
| `tags` | JSON object of tag filters | `{"error":"true"}` |
| `lookback` | Time range (dependencies) | `86400000` (24h in ms) |

---

## Time Format Notes

Jaeger uses **microseconds** for trace timestamps:
- Unix seconds to microseconds: `$(date +%s) * 1000000`
- Duration formats: `100ms`, `1s`, `1m`

---

## Span Tags Reference

Common span tags to filter on:

| Tag | Description | Example Values |
|-----|-------------|----------------|
| `error` | Error occurred | `true`, `false` |
| `rpc.grpc.status_code` | gRPC status | `0` (OK), `2` (Unknown), `13` (Internal) |
| `rpc.method` | RPC method name | `GetInfo` |
| `rpc.service` | RPC service name | `ark.v1.ArkService` |
| `rpc.system` | RPC system | `grpc` |
| `span.kind` | Span type | `server`, `client`, `internal` |
| `http.status_code` | HTTP status | `200`, `500` |
| `http.method` | HTTP method | `GET`, `POST` |
| `db.system` | Database type | `postgresql`, `redis` |

---

## gRPC Status Codes

| Code | Name | Description |
|------|------|-------------|
| 0 | OK | Success |
| 1 | CANCELLED | Operation cancelled |
| 2 | UNKNOWN | Unknown error |
| 3 | INVALID_ARGUMENT | Invalid argument |
| 4 | DEADLINE_EXCEEDED | Timeout |
| 5 | NOT_FOUND | Resource not found |
| 13 | INTERNAL | Internal error |
| 14 | UNAVAILABLE | Service unavailable |

---

## References

- [Jaeger API Documentation](https://www.jaegertracing.io/docs/latest/apis/)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)
- [Jaeger Query Service](https://www.jaegertracing.io/docs/latest/deployment/#query-service--ui)
