# AlertManager API Reference & Investigation Manual

Quick reference for querying AlertManager during investigation workflows.

---

## API Reference for Investigation

### Base URL

```
http://localhost:9093/api/v2
```

### Authentication

No built-in auth in default configuration. For production, configure authentication via reverse proxy.

---

## Query Endpoints (Read-Only)

### Get Status

Get AlertManager cluster and version status.

```bash
curl -s "http://localhost:9093/api/v2/status"
```

**Response:**
```json
{
  "cluster": {
    "name": "01KAXHZBB50Y80BYEV5V2JK690",
    "peers": [{"address": "172.18.0.10:9094", "name": "01KAXHZBB50Y80BYEV5V2JK690"}],
    "status": "ready"
  },
  "config": {"original": "..."},
  "uptime": "2025-11-25T13:06:46.761Z",
  "versionInfo": {"version": "0.28.1", "branch": "HEAD"}
}
```

### List Alerts

Get all current alerts.

```bash
curl -s "http://localhost:9093/api/v2/alerts"
```

**With filters:**
```bash
# Filter by active state
curl -s "http://localhost:9093/api/v2/alerts?active=true"

# Filter by silenced
curl -s "http://localhost:9093/api/v2/alerts?silenced=false"

# Filter by inhibited
curl -s "http://localhost:9093/api/v2/alerts?inhibited=false"

# Filter by receiver
curl -s "http://localhost:9093/api/v2/alerts?receiver=slack-notifications"

# Filter by label matcher
curl -s "http://localhost:9093/api/v2/alerts?filter=alertname%3DHighMachineCPUUsage"
```

**Response:**
```json
[
  {
    "annotations": {
      "description": "The machine's CPU usage has been above 70% for more than 2 minutes.",
      "summary": "High machine CPU usage (>70%)"
    },
    "endsAt": "2025-11-26T13:16:05.899Z",
    "fingerprint": "c73606e5e6713b5b",
    "receivers": [{"name": "slack-notifications"}],
    "startsAt": "2025-11-25T13:08:55.899Z",
    "status": {
      "inhibitedBy": [],
      "silencedBy": [],
      "state": "active"
    },
    "labels": {
      "alertname": "HighMachineCPUUsage",
      "severity": "warning"
    },
    "generatorURL": "http://prometheus:9090/graph?..."
  }
]
```

### Get Alert Groups

Get alerts grouped by labels.

```bash
curl -s "http://localhost:9093/api/v2/alerts/groups"
```

**Response:**
```json
[
  {
    "alerts": [...],
    "labels": {"alertname": "HighMachineCPUUsage"},
    "receiver": {"name": "slack-notifications"}
  }
]
```

### List Receivers

Get configured receivers.

```bash
curl -s "http://localhost:9093/api/v2/receivers"
```

**Response:**
```json
[
  {"name": "slack-notifications"},
  {"name": "slack-notifications-no-resolve"},
  {"name": "slack-notifications-info"}
]
```

### List Silences

Get all silences (active and expired).

```bash
curl -s "http://localhost:9093/api/v2/silences"
```

**With filter:**
```bash
# Filter by matcher
curl -s "http://localhost:9093/api/v2/silences?filter=alertname%3DHighMachineCPUUsage"
```

**Response:**
```json
[
  {
    "id": "silence-id",
    "status": {"state": "active"},
    "matchers": [{"name": "alertname", "value": "HighCPU", "isRegex": false}],
    "startsAt": "2025-11-25T10:00:00.000Z",
    "endsAt": "2025-11-25T12:00:00.000Z",
    "createdBy": "admin",
    "comment": "Maintenance window"
  }
]
```

### Get Single Silence

```bash
curl -s "http://localhost:9093/api/v2/silence/SILENCE_ID"
```

---

## Status Endpoints

### Ready Check

```bash
curl -s "http://localhost:9093/-/ready"
```

### Health Check

```bash
curl -s "http://localhost:9093/-/healthy"
```

### Metrics

```bash
curl -s "http://localhost:9093/metrics"
```

---

## CLI Investigation Examples

### Check AlertManager Health

```bash
curl -s "http://localhost:9093/-/ready"
curl -s "http://localhost:9093/api/v2/status" | jq '{status: .cluster.status, version: .versionInfo.version}'
```

### List All Firing Alerts

```bash
curl -s "http://localhost:9093/api/v2/alerts?active=true&silenced=false&inhibited=false" | jq '.[] | {alertname: .labels.alertname, severity: .labels.severity, state: .status.state}'
```

### Get Alert Details

```bash
curl -s "http://localhost:9093/api/v2/alerts" | jq '.[] | select(.labels.alertname == "HighMachineCPUUsage") | {alertname: .labels.alertname, summary: .annotations.summary, started: .startsAt, duration_hours: ((now - (.startsAt | fromdateiso8601)) / 3600)}'
```

### Count Alerts by Severity

```bash
curl -s "http://localhost:9093/api/v2/alerts" | jq 'group_by(.labels.severity) | map({severity: .[0].labels.severity, count: length})'
```

### Count Alerts by State

```bash
curl -s "http://localhost:9093/api/v2/alerts" | jq 'group_by(.status.state) | map({state: .[0].status.state, count: length})'
```

### Get Alert Timeline

```bash
curl -s "http://localhost:9093/api/v2/alerts" | jq '.[] | {alertname: .labels.alertname, started: .startsAt, ends: .endsAt}'
```

### Find Silenced Alerts

```bash
curl -s "http://localhost:9093/api/v2/alerts?silenced=true" | jq '.[] | {alertname: .labels.alertname, silenced_by: .status.silencedBy}'
```

### Find Inhibited Alerts

```bash
curl -s "http://localhost:9093/api/v2/alerts?inhibited=true" | jq '.[] | {alertname: .labels.alertname, inhibited_by: .status.inhibitedBy}'
```

### List Active Silences

```bash
curl -s "http://localhost:9093/api/v2/silences" | jq '.[] | select(.status.state == "active") | {id: .id, matchers: .matchers, ends: .endsAt, comment: .comment}'
```

### Get Alerts for Specific Receiver

```bash
curl -s "http://localhost:9093/api/v2/alerts?receiver=slack-notifications" | jq 'length'
```

### Calculate Alert Duration

```bash
curl -s "http://localhost:9093/api/v2/alerts" | jq '.[] | {alertname: .labels.alertname, duration_minutes: ((now - (.startsAt | fromdateiso8601)) / 60 | floor)}'
```

### Get Generator URLs (Link to Prometheus)

```bash
curl -s "http://localhost:9093/api/v2/alerts" | jq '.[] | {alertname: .labels.alertname, prometheus_url: .generatorURL}'
```

### Export Alert History

```bash
# Get all alerts and save to file
curl -s "http://localhost:9093/api/v2/alerts" > alerts_$(date +%Y%m%d_%H%M%S).json
```

---

## Query Parameters Reference

### /api/v2/alerts

| Parameter | Description | Example |
|-----------|-------------|---------|
| `active` | Show active alerts | `true`, `false` |
| `silenced` | Show silenced alerts | `true`, `false` |
| `inhibited` | Show inhibited alerts | `true`, `false` |
| `unprocessed` | Show unprocessed alerts | `true`, `false` |
| `filter` | Label matcher filter | `alertname=HighCPU` |
| `receiver` | Filter by receiver | `slack-notifications` |

### /api/v2/silences

| Parameter | Description | Example |
|-----------|-------------|---------|
| `filter` | Label matcher filter | `alertname=HighCPU` |

---

## Alert States

| State | Description |
|-------|-------------|
| `active` | Alert is currently firing |
| `suppressed` | Alert is silenced or inhibited |

### Status Fields

| Field | Description |
|-------|-------------|
| `state` | Current alert state |
| `silencedBy` | IDs of silences suppressing this alert |
| `inhibitedBy` | Fingerprints of alerts inhibiting this alert |
| `mutedBy` | Mute timing references |

---

## Alert Lifecycle

```
[Firing in Prometheus]
        ↓
[Sent to AlertManager]
        ↓
[Grouped by labels]
        ↓
[Check inhibitions] → [Inhibited] → Suppressed
        ↓
[Check silences] → [Silenced] → Suppressed
        ↓
[Route to receiver]
        ↓
[Send notification]
        ↓
[Wait for repeat_interval]
        ↓
[Resolve or repeat]
```

---

## Common Alert Labels

| Label | Description | Example |
|-------|-------------|---------|
| `alertname` | Alert rule name | `HighMachineCPUUsage` |
| `severity` | Alert severity | `critical`, `warning`, `info` |
| `job` | Prometheus job name | `arkd` |
| `instance` | Target instance | `arkd:8080` |
| `service` | Service name | `arkd` |

---

## Common Annotations

| Annotation | Description |
|------------|-------------|
| `summary` | Short alert description |
| `description` | Detailed alert description |
| `runbook_url` | Link to runbook |
| `dashboard_url` | Link to Grafana dashboard |
| `firing_title` | Custom title when firing |
| `resolved_title` | Custom title when resolved |

---

## Modifying Operations (Use with Caution)

**WARNING:** These operations modify AlertManager state. Only use during active incident management.

### Create Silence (POST)

```bash
# DO NOT USE without explicit approval
curl -X POST "http://localhost:9093/api/v2/silences" \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [{"name": "alertname", "value": "HighCPU", "isRegex": false}],
    "startsAt": "2025-11-25T10:00:00.000Z",
    "endsAt": "2025-11-25T12:00:00.000Z",
    "createdBy": "admin",
    "comment": "Maintenance window"
  }'
```

### Delete Silence (DELETE)

```bash
# DO NOT USE without explicit approval
curl -X DELETE "http://localhost:9093/api/v2/silence/SILENCE_ID"
```

---

## References

- [AlertManager API Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [AlertManager Configuration](https://prometheus.io/docs/alerting/latest/configuration/)
- [AlertManager Routing](https://prometheus.io/docs/alerting/latest/alertmanager/#routing)
