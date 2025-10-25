# Data Model: Fraud Detection Events

**Feature**: 001-fraud-detection-alerts
**Phase**: Phase 1 (Design & Contracts)
**Date**: 2025-10-24

## Purpose

This document defines the data entities used in fraud detection alerts. These entities represent conceptual models of fraud events detected by the alerting system. They are not stored in databases but are structured representations of log entries, metrics, and alert payloads.

## Entity Definitions

### 1. UnilateralExitEvent

**Purpose**: Represents a user-initiated unilateral exit (force redemption) from arkd.

**Attributes**:

| Attribute | Type | Description | Example | Source |
|-----------|------|-------------|---------|--------|
| `timestamp` | ISO8601 | When exit was initiated | `2025-10-24T14:32:15Z` | Log timestamp |
| `user_id_hash` | string (32 char) | Privacy-preserving hash of user identifier | `a1b2c3d4e5f6...` | Derived from log (SHA256) |
| `vtxo_id` | string (64 char) | VTXO identifier being exited | `vtxo_xyz789...` | Extracted from log message |
| `exit_depth` | integer | Depth of VTXO in virtual tree (1-10) | `3` | Extracted from log or inferred |
| `exit_value` | integer | Value in satoshis | `50000` | Extracted from log |
| `exit_type` | enum | Type of unilateral exit | `"initiated"` or `"completed"` | Pattern match on log |
| `round_context` | string | Round ID if exit is round-related | `"round-42"` or `null` | Extracted from log |
| `completion_time` | ISO8601 (optional) | When timelock expires and exit can complete | `2025-10-25T14:32:15Z` | Calculated from exit initiation + delay |

**Validation Rules**:
- `user_id_hash` must be 64 hex characters (SHA256 output)
- `exit_depth` must be >= 1 (minimum 1 transaction to exit)
- `exit_value` must be > 0
- `exit_type` must be "initiated" or "completed"

**State Transitions**:
1. Exit initiated → Alert fires (informational)
2. If 3+ exits in 5 minutes → Critical alert fires
3. Exit completed → Audit log entry (informational)

**Log Pattern Mapping**:
```text
Example arkd log line:
"2025-10-24T14:32:15Z INFO unilateral exit initiated: user=abc123, vtxo=vtxo_xyz789, depth=3, value=50000, round=round-42"

Extracted to UnilateralExitEvent:
{
  "timestamp": "2025-10-24T14:32:15Z",
  "user_id_hash": "a1b2c3d4e5f6..." (SHA256(abc123)),
  "vtxo_id": "vtxo_xyz789",
  "exit_depth": 3,
  "exit_value": 50000,
  "exit_type": "initiated",
  "round_context": "round-42",
  "completion_time": null
}
```

**Alert Rule Reference**:
- Loki alert: `ArkdUnilateralExitInitiated` (any occurrence)
- Prometheus alert: `ArkdUnilateralExitHighFrequency` (>3 in 5min)

---

### 2. DoubleSpendAttempt

**Purpose**: Represents detection of duplicate VTXO spend within or across rounds.

**Attributes**:

| Attribute | Type | Description | Example | Source |
|-----------|------|-------------|---------|--------|
| `timestamp` | ISO8601 | When duplicate detected | `2025-10-24T14:35:22Z` | Log timestamp |
| `vtxo_id` | string (64 char) | VTXO being double-spent | `vtxo_abc456...` | Extracted from log |
| `first_spend_round` | string | Round where VTXO was first spent | `"round-40"` | Retrieved from arkd state or log history |
| `second_spend_round` | string | Round where duplicate detected | `"round-42"` | Current round from log |
| `user_id_hash` | string (32 char) | Hash of user attempting double-spend | `f7e6d5c4b3a2...` | Derived from log (SHA256) |
| `detection_method` | enum | How duplicate was detected | `"same_round"` or `"cross_round"` | Pattern match |
| `action_taken` | enum | System response | `"rejected"` or `"logged"` | Extracted from log |

**Validation Rules**:
- `vtxo_id` must match pattern `vtxo_[a-f0-9]{64}`
- `first_spend_round` and `second_spend_round` must be different (unless same_round detection)
- `detection_method` must be "same_round" or "cross_round"
- `action_taken` must be "rejected" or "logged"

**State Transitions**:
1. Duplicate VTXO reference detected → Critical alert fires immediately
2. Payment intent rejected → Logged for audit
3. Persistent offender (>3 attempts in 24h) → Escalated alert

**Log Pattern Mapping**:
```text
Example arkd log line:
"2025-10-24T14:35:22Z ERROR VTXO already spent: vtxo=vtxo_abc456, first_round=round-40, current_round=round-42, user=def789, action=rejected"

Extracted to DoubleSpendAttempt:
{
  "timestamp": "2025-10-24T14:35:22Z",
  "vtxo_id": "vtxo_abc456",
  "first_spend_round": "round-40",
  "second_spend_round": "round-42",
  "user_id_hash": "f7e6d5c4b3a2..." (SHA256(def789)),
  "detection_method": "cross_round",
  "action_taken": "rejected"
}
```

**Alert Rule Reference**:
- Prometheus alert: `ArkdDoubleSpendDetected` (any occurrence, critical)
- Loki alert: `ArkdDoubleSpendPattern` (pattern match with context)

---

### 3. ForfeitFailureEvent

**Purpose**: Represents forfeit proof submission failure during round confirmation.

**Attributes**:

| Attribute | Type | Description | Example | Source |
|-----------|------|-------------|---------|--------|
| `timestamp` | ISO8601 | When failure occurred | `2025-10-24T14:40:10Z` | Log timestamp |
| `user_id_hash` | string (32 char) | Hash of user who failed | `b3a2c1d0e9f8...` | Derived from log (SHA256) |
| `round_id` | string | Round where failure occurred | `"round-43"` | Extracted from log |
| `failure_reason` | enum | Why forfeit proof failed | `"timeout"`, `"invalid"`, `"missing"` | Pattern match |
| `round_participants` | integer | Total participants in round | `25` | Extracted from log or metric |
| `failure_count_24h` | integer | User's failure count in last 24h | `2` | Calculated from historical logs |
| `round_phase` | enum | Round phase when failure occurred | `"confirmation"` | Extracted from log |

**Validation Rules**:
- `failure_reason` must be one of: "timeout", "invalid", "missing"
- `round_participants` must be >= 1
- `failure_count_24h` must be >= 1 (current failure included)
- `round_phase` must be "confirmation" (forfeit proofs only submitted in confirmation phase)

**State Transitions**:
1. Single failure → Warning alert
2. Failure rate > 10% of participants → Critical alert (potential attack)
3. User fails >3 times in 24h → Repeat offender alert

**Log Pattern Mapping**:
```text
Example arkd log line:
"2025-10-24T14:40:10Z WARN forfeit proof validation failed: user=ghi012, round=round-43, reason=timeout, phase=confirmation, participants=25"

Extracted to ForfeitFailureEvent:
{
  "timestamp": "2025-10-24T14:40:10Z",
  "user_id_hash": "b3a2c1d0e9f8..." (SHA256(ghi012)),
  "round_id": "round-43",
  "failure_reason": "timeout",
  "round_participants": 25,
  "failure_count_24h": 2 (queried from historical logs),
  "round_phase": "confirmation"
}
```

**Alert Rule Reference**:
- Loki alert: `ArkdForfeitProofFailure` (individual failure, warning)
- Prometheus alert: `ArkdForfeitFailureHighRate` (>10% of participants, critical)
- Loki alert: `ArkdForfeitRepeatOffender` (user >3 failures in 24h)

---

### 4. VTXOExpiryWarning

**Purpose**: Represents approaching VTXO expiry requiring operator attention.

**Attributes**:

| Attribute | Type | Description | Example | Source |
|-----------|------|-------------|---------|--------|
| `timestamp` | ISO8601 | When warning was generated | `2025-10-24T15:00:00Z` | Alert evaluation time |
| `vtxo_id` | string (64 char) | VTXO approaching expiry | `vtxo_jkl345...` | Queried from arkd metrics |
| `expiry_time` | ISO8601 | When VTXO timelock expires | `2025-10-25T15:00:00Z` | Queried from arkd metrics |
| `current_value` | integer | VTXO value in satoshis | `100000` | Queried from arkd metrics |
| `user_id_hash` | string (32 char) | Hash of VTXO owner | `e9f8g7h6i5j4...` | Derived from VTXO metadata (SHA256) |
| `time_remaining` | integer | Seconds until expiry | `86400` (24h) | Calculated: expiry_time - now |
| `warning_level` | enum | Urgency level | `"24h"`, `"6h"`, `"1h"`, `"expired"` | Calculated from time_remaining |
| `user_balance_pct` | float | % of user's total balance in this VTXO | `0.75` (75%) | Calculated from arkd metrics |

**Validation Rules**:
- `expiry_time` must be in the future (for non-expired warnings)
- `current_value` must be > 0
- `time_remaining` must be >= 0
- `warning_level` must be one of: "24h", "6h", "1h", "expired"
- `user_balance_pct` must be 0.0 - 1.0

**State Transitions**:
1. 24h before expiry, >10% system value → Warning alert
2. 6h before expiry, >50% user balance → Informational alert
3. 1h before expiry → Escalated warning
4. Expired, unclaimed → Daily summary alert

**Metric Source**:
```promql
# Example Prometheus queries to populate VTXOExpiryWarning
vtxo_expiry_timestamp{vtxo_id="vtxo_jkl345"} - time() < 86400  # 24h remaining
vtxo_current_value{vtxo_id="vtxo_jkl345"}                      # 100000 sats
vtxo_owner{vtxo_id="vtxo_jkl345"}                              # user_xyz
```

**Alert Rule Reference**:
- Prometheus alert: `ArkdVTXOExpiry24h` (>10% system value expiring)
- Prometheus alert: `ArkdVTXOExpiry6h` (>50% user balance expiring)
- Prometheus alert: `ArkdVTXOExpiry1h` (imminent expiry)
- Prometheus alert: `ArkdVTXOExpiredUnclaimed` (daily summary)

---

## Entity Relationships

```text
UnilateralExitEvent
├── May reference: VTXOExpiryWarning (if exit due to imminent expiry)
└── May trigger: Multiple UnilateralExitEvents (if cascade effect)

DoubleSpendAttempt
├── References: VTXO (spent multiple times)
└── May correlate with: ForfeitFailureEvent (user attempting fraud may also fail forfeit proofs)

ForfeitFailureEvent
├── Part of: Round (multiple participants)
└── May correlate with: DoubleSpendAttempt (malicious user patterns)

VTXOExpiryWarning
├── May trigger: UnilateralExitEvent (user exits to avoid expiry)
└── Aggregates to: System-wide expiry risk metrics
```

## Data Flow

1. **Log Events** → Loki → LogQL queries extract structured events → Alerts fire
2. **Log Events** → OpenTelemetry Collector (logstometric) → Prometheus counters → Alerts fire
3. **Metrics** → Prometheus → PromQL queries calculate rates/thresholds → Alerts fire
4. **Alerts** → Alertmanager → Slack notifications + audit log
5. **Events** → Grafana dashboards → Visual analysis by operators

## Privacy Considerations

- **User Identification**: All user identifiers hashed using SHA256 before storage/display
- **VTXO IDs**: Preserved for traceability but considered semi-sensitive (don't expose publicly)
- **Values**: Preserved for analysis but consider aggregating in public dashboards
- **Notification Content**: Slack alerts include hashed IDs, not raw user identifiers

## Storage and Retention

- **Loki**: Log-based events retained for 15 days (360h retention)
- **Prometheus**: Metric-based events retained for 15 days (TSDB retention)
- **Alertmanager**: Alert state retained until resolved (no long-term storage)
- **Grafana**: Dashboard queries pull from Prometheus/Loki (no separate storage)

**Note**: For compliance/audit requirements exceeding 15 days, export Loki logs to long-term storage (S3, ELK stack, etc.) - out of scope for MVP.

## Next Steps (Contracts)

- Generate alert rule YAML schemas based on these entities
- Create Grafana dashboard JSON with panels querying these entity attributes
- Document entity validation in quickstart.md testing procedures
