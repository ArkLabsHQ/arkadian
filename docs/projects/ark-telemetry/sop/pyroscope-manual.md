# Pyroscope API Reference & Investigation Manual

Quick reference for querying Pyroscope profiles during investigation workflows.

---

## API Reference for Investigation

### Authentication

No built-in auth. For multi-tenant deployments, set `X-Scope-OrgID` header.

### Query Endpoints (Connect Protocol)

All query endpoints use POST with JSON bodies.

#### List Profile Types

```bash
curl -X POST http://localhost:4040/querier.v1.QuerierService/ProfileTypes \
  -H "Content-Type: application/json" \
  -d '{
    "start": 1700000000000,
    "end": 1700003600000
  }'
```

**Response:** Available profile types (cpu, memory, goroutine, etc.)

#### List Label Names

```bash
curl -X POST http://localhost:4040/querier.v1.QuerierService/LabelNames \
  -H "Content-Type: application/json" \
  -d '{
    "start": 1700000000000,
    "end": 1700003600000,
    "matchers": []
  }'
```

#### Get Label Values

```bash
curl -X POST http://localhost:4040/querier.v1.QuerierService/LabelValues \
  -H "Content-Type: application/json" \
  -d '{
    "start": 1700000000000,
    "end": 1700003600000,
    "name": "service_name"
  }'
```

#### Query Series

```bash
curl -X POST http://localhost:4040/querier.v1.QuerierService/Series \
  -H "Content-Type: application/json" \
  -d '{
    "start": 1700000000000,
    "end": 1700003600000,
    "matchers": ["{service_name=\"arkd\"}"],
    "labelNames": ["service_name", "instance"]
  }'
```

#### Get Merged Flamegraph

```bash
curl -X POST http://localhost:4040/querier.v1.QuerierService/SelectMergeStacktraces \
  -H "Content-Type: application/json" \
  -d '{
    "start": 1700000000000,
    "end": 1700003600000,
    "labelSelector": "{service_name=\"arkd\"}",
    "profileTypeID": "process_cpu:cpu:nanoseconds:cpu:nanoseconds",
    "maxNodes": 16384
  }'
```

**Response:** Flamegraph data structure for visualization.

#### Get Merged Profile (pprof format)

```bash
curl -X POST http://localhost:4040/querier.v1.QuerierService/SelectMergeProfile \
  -H "Content-Type: application/json" \
  -d '{
    "start": 1700000000000,
    "end": 1700003600000,
    "labelSelector": "{service_name=\"arkd\"}",
    "profileTypeID": "process_cpu:cpu:nanoseconds:cpu:nanoseconds",
    "maxNodes": 16384
  }'
```

#### Compare Two Time Ranges (Diff)

```bash
curl -X POST http://localhost:4040/querier.v1.QuerierService/Diff \
  -H "Content-Type: application/json" \
  -d '{
    "left": {
      "start": 1700000000000,
      "end": 1700001800000,
      "labelSelector": "{service_name=\"arkd\"}",
      "profileTypeID": "process_cpu:cpu:nanoseconds:cpu:nanoseconds"
    },
    "right": {
      "start": 1700001800000,
      "end": 1700003600000,
      "labelSelector": "{service_name=\"arkd\"}",
      "profileTypeID": "process_cpu:cpu:nanoseconds:cpu:nanoseconds"
    }
  }'
```

**Use Case:** Compare performance before/after a deployment.

#### Time Series Data

```bash
curl -X POST http://localhost:4040/querier.v1.QuerierService/SelectSeries \
  -H "Content-Type: application/json" \
  -d '{
    "start": 1700000000000,
    "end": 1700003600000,
    "labelSelector": "{service_name=\"arkd\"}",
    "profileTypeID": "process_cpu:cpu:nanoseconds:cpu:nanoseconds",
    "step": 60,
    "groupBy": ["instance"]
  }'
```

### Legacy HTTP API

#### Render Flamegraph

```bash
# Basic query
curl "http://localhost:4040/pyroscope/render?query=process_cpu:cpu:nanoseconds:cpu:nanoseconds{service_name=\"arkd\"}&from=now-1h&until=now"

# With parameters
curl "http://localhost:4040/pyroscope/render?\
query=process_cpu:cpu:nanoseconds:cpu:nanoseconds{service_name=\"arkd\"}\
&from=1700000000\
&until=1700003600\
&maxNodes=16384\
&format=json"
```

**Query Syntax:** `<profile_type>{label="value", label2="value2"}`

**Time Formats:**
- Absolute: Unix timestamp (seconds)
- Relative: `now-1h`, `now-30m`, `now-1d`

**Response Structure:**
```json
{
  "flamebearer": {
    "names": ["func1", "func2"],
    "levels": [[...]],
    "numTicks": 1000,
    "maxSelf": 100
  },
  "metadata": {
    "units": "nanoseconds",
    "sampleRate": 100
  },
  "timeline": {
    "startTime": 1700000000,
    "samples": [10, 20, 30],
    "durationDelta": 60
  }
}
```

#### Ingest Profiles

```bash
# pprof format
curl -X POST "http://localhost:4040/ingest?name=myapp.cpu&format=pprof" \
  --data-binary @profile.pprof

# Folded format
curl -X POST "http://localhost:4040/ingest?name=myapp.cpu&format=folded" \
  --data-binary @folded.txt
```

**Query Parameters:**
- `name` (required): Application name with optional tags `app{key=value}`
- `format`: `pprof`, `jfr`, `folded`, `lines`
- `from`, `until`: Timestamps
- `sampleRate`: Samples per second
- `spyName`: Profiler name
- `units`: `samples`, `objects`, `bytes`, etc.

---

## CLI Investigation Examples

### Check Pyroscope Status

```bash
# Health check
curl http://localhost:4040/ready

# Metrics (Prometheus format)
curl http://localhost:4040/metrics
```

### List Available Services

```bash
curl -s -X POST http://localhost:4040/querier.v1.QuerierService/LabelValues \
  -H "Content-Type: application/json" \
  -d '{"start": '$(date -d "1 hour ago" +%s000)', "end": '$(date +%s000)', "name": "service_name"}' | jq
```

### Get CPU Profile Metadata for Last Hour

```bash
curl -s "http://localhost:4040/pyroscope/render?query=process_cpu:cpu:nanoseconds:cpu:nanoseconds{service_name=\"arkd\"}&from=now-1h&until=now" | jq '.metadata'
```

### Export to pprof for `go tool pprof`

```bash
curl -X POST http://localhost:4040/querier.v1.QuerierService/SelectMergeProfile \
  -H "Content-Type: application/json" \
  -d '{
    "start": '$(date -d "1 hour ago" +%s000)',
    "end": '$(date +%s000)',
    "labelSelector": "{service_name=\"arkd\"}",
    "profileTypeID": "process_cpu:cpu:nanoseconds:cpu:nanoseconds"
  }' | jq -r '.profile' | base64 -d > profile.pprof

go tool pprof profile.pprof
```

### Compare Before/After Deployment

```bash
# Set timestamps (adjust as needed)
BEFORE_START=$(date -d "2 hours ago" +%s000)
BEFORE_END=$(date -d "1 hour ago" +%s000)
AFTER_START=$(date -d "1 hour ago" +%s000)
AFTER_END=$(date +%s000)

curl -s -X POST http://localhost:4040/querier.v1.QuerierService/Diff \
  -H "Content-Type: application/json" \
  -d '{
    "left": {
      "start": '$BEFORE_START',
      "end": '$BEFORE_END',
      "labelSelector": "{service_name=\"arkd\"}",
      "profileTypeID": "process_cpu:cpu:nanoseconds:cpu:nanoseconds"
    },
    "right": {
      "start": '$AFTER_START',
      "end": '$AFTER_END',
      "labelSelector": "{service_name=\"arkd\"}",
      "profileTypeID": "process_cpu:cpu:nanoseconds:cpu:nanoseconds"
    }
  }' | jq
```

### Get Memory Allocation Profile

```bash
curl -s "http://localhost:4040/pyroscope/render?query=memory:alloc_space:bytes:space:bytes{service_name=\"arkd\"}&from=now-1h&until=now&format=json" | jq '.flamebearer.numTicks'
```

### List All Profile Types Available

```bash
curl -s -X POST http://localhost:4040/querier.v1.QuerierService/ProfileTypes \
  -H "Content-Type: application/json" \
  -d '{"start": '$(date -d "1 hour ago" +%s000)', "end": '$(date +%s000)'}' | jq '.profileTypes[].ID'
```

### Get Goroutine Count Over Time

```bash
curl -s -X POST http://localhost:4040/querier.v1.QuerierService/SelectSeries \
  -H "Content-Type: application/json" \
  -d '{
    "start": '$(date -d "1 hour ago" +%s000)',
    "end": '$(date +%s000)',
    "labelSelector": "{service_name=\"arkd\"}",
    "profileTypeID": "goroutines:goroutine:count:goroutine:count",
    "step": 60
  }' | jq '.series[].points'
```

---

## Common Profile Types

| Profile Type ID | Description |
|-----------------|-------------|
| `process_cpu:cpu:nanoseconds:cpu:nanoseconds` | CPU time |
| `process_cpu:samples:count:cpu:nanoseconds` | CPU samples count |
| `memory:alloc_objects:count:space:bytes` | Allocation count |
| `memory:alloc_space:bytes:space:bytes` | Allocation size |
| `memory:inuse_objects:count:space:bytes` | In-use object count |
| `memory:inuse_space:bytes:space:bytes` | In-use memory size |
| `goroutines:goroutine:count:goroutine:count` | Goroutine count |
| `mutex:contentions:count:contentions:count` | Mutex contention count |
| `mutex:delay:nanoseconds:contentions:count` | Mutex contention delay |
| `block:contentions:count:contentions:count` | Block contention count |
| `block:delay:nanoseconds:contentions:count` | Block contention delay |

---

## References

- [Pyroscope API Reference](https://grafana.com/docs/pyroscope/latest/reference-server-api/)
- [Pyroscope Go SDK](https://github.com/grafana/pyroscope-go)
