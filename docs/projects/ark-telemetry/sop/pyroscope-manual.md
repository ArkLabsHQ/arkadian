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
# Memory allocation rate (total allocated over time)
curl -s "http://localhost:4040/pyroscope/render?query=memory:alloc_space:bytes:space:bytes{service_name=\"arkd\"}&from=now-1h&until=now&format=json" | jq '.flamebearer.numTicks'

# Memory currently in-use (heap snapshot)
curl -s "http://localhost:4040/pyroscope/render?query=memory:inuse_space:bytes:space:bytes{service_name=\"arkd\"}&from=now-1h&until=now&format=json" | jq '.flamebearer.numTicks'
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

## Working with Grafana Datasource Queries

### Query Format for Grafana Integration

When querying Pyroscope through Grafana (via the pyroscope datasource), use this format:

```
memory:inuse_space:bytes:space:bytes-service_name="arkd"-no-group-by
```

**Query Structure:**
- Profile type: `memory:inuse_space:bytes:space:bytes`
- Filters: `-service_name="arkd"` (dash-separated)
- Grouping: `-no-group-by` (prevents automatic aggregation)

**Common Query Patterns:**

```bash
# Memory currently in-use by arkd service (snapshot)
memory:inuse_space:bytes:space:bytes-service_name="arkd"-no-group-by

# Memory allocation rate for arkd service (over time)
memory:alloc_space:bytes:space:bytes-service_name="arkd"-no-group-by

# CPU time for arkd service
process_cpu:cpu:nanoseconds:cpu:nanoseconds-service_name="arkd"-no-group-by

# Goroutine count for arkd service
goroutines:goroutine:count:goroutine:count-service_name="arkd"-no-group-by
```

### Timestamp Format

Pyroscope uses **Unix milliseconds** for time ranges:

```bash
# Example time range (1 hour window)
FROM="1764530324411"  # 2025-11-30 20:18:44 UTC
TO="1764533971164"    # 2025-11-30 21:19:31 UTC

# Convert from human-readable (requires GNU date)
FROM=$(date -u -d "2025-11-30 20:18:44" +%s%3N)
TO=$(date -u -d "2025-11-30 21:19:31" +%s%3N)

# Convert from relative time
FROM=$(date -u -d "1 hour ago" +%s%3N)
TO=$(date -u +%s%3N)
```

### Flame Graph Interpretation

**Top Table:**
- Shows functions sorted by **Self** (direct allocations) or **Total** (including callees)
- Click column headers to sort by different metrics

**Call Stack Panel:**
- Right panel shows complete call chain from root to allocation site
- Read from top (caller) to bottom (actual allocation)

**Tooltip Information:**
- Hover over flame graph bars to see:
  - RAM total: Total memory attributed to this function
  - Self: Memory directly allocated by this function
  - Percentage: % of total memory
  - Sample count: Number of profiling samples

**Common Allocators to Watch:**

```
github.com/lib/pq.textDecode
  → PostgreSQL text column decoding (strings, UUIDs, JSON)
  → High values indicate large query result sets

internal/runtime/maps.newarray
  → Go map allocations
  → High values indicate map growth or many small maps

github.com/btcsuite/btcd/wire.*
  → Bitcoin protocol serialization
  → High values during transaction processing

github.com/klauspost/compress/flate.NewWriter
  → Compression buffer allocations
  → Expected during response encoding
```

### Investigation Workflow

**Step 1: Identify memory spike in timeline**
```bash
# Query memory:inuse_space for 1-hour window
# Look for spikes above baseline
```

**Step 2: Zoom into spike time range**
```bash
# Narrow time range to spike duration (e.g., 3-minute window)
# FROM: spike start timestamp (ms)
# TO: spike end timestamp (ms)
```

**Step 3: Analyze flame graph**
```bash
# Look for functions with high Self percentage (>10%)
# Trace call stack to identify root cause
# Check if allocations are in:
#   - Database queries (pq.textDecode)
#   - Map/slice growth (runtime.newarray)
#   - External libraries (btcd, compress, etc.)
```

**Step 4: Compare allocation profiles**
```bash
# Compare memory:inuse_space (snapshot) vs memory:alloc_space (rate)
# inuse_space shows what's live at peak
# alloc_space shows allocation hot paths
```

---

## References

- [Pyroscope API Reference](https://grafana.com/docs/pyroscope/latest/reference-server-api/)
- [Pyroscope Go SDK](https://github.com/grafana/pyroscope-go)
- [Grafana Pyroscope Datasource](https://grafana.com/docs/grafana/latest/datasources/pyroscope/)
