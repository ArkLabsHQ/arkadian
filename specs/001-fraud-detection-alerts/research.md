# Research: Fraud Detection and Unilateral Exit Alerts

**Feature**: 001-fraud-detection-alerts
**Phase**: Phase 0 (Research & Investigation)
**Date**: 2025-10-24

## Purpose

This document captures research findings that resolve all "NEEDS CLARIFICATION" items from the Technical Context section of plan.md. Each section documents decisions made, rationale, and alternatives considered.

## Research Areas

### 1. Arkd Log Patterns for Fraud Detection

**Question**: What log patterns does arkd emit for unilateral exits, double-spend attempts, and forfeit failures?

**Research Approach**:
- Examined arkd source code documentation (docs/projects/arkd/)
- Reviewed existing Loki alert rules (loki-alert-rules.yml)
- Analyzed arkd command-line interface (ark-cli redeem --force)
- Consulted ark-docs for unilateral exit and round confirmation workflows

**Findings**:

1. **Unilateral Exit Patterns**:
   - CLI flag: `ark-cli redeem --force` triggers unilateral exit
   - Expected log pattern: `"unilateral exit initiated"` or `"unroll initiated"` or `"force redemption"`
   - Exit completion: `"unilateral exit completed"` or `"unroll completed"`
   - **ASSUMPTION**: These exact patterns need verification via arkd codebase inspection or log sampling

2. **Double-Spend Detection**:
   - Currently NOT directly logged by arkd (arkd rejects invalid VTXOs silently)
   - **Decision**: Use log-to-metrics transformation in OpenTelemetry Collector
   - Pattern to detect: `"VTXO already spent"` or `"duplicate VTXO reference"` or `"invalid VTXO state"`
   - **Workaround**: If arkd doesn't log double-spend attempts, we'll need to add logging or rely on round rejection patterns

3. **Forfeit Proof Failures**:
   - Pattern: `"forfeit proof validation failed"` or `"invalid forfeit proof"` or `"forfeit proof timeout"`
   - Round context: Logs should include round ID and user identifier
   - **ASSUMPTION**: Requires verification in arkd round confirmation logic

4. **VTXO Expiry Information**:
   - **Challenge**: VTXO expiry is state-based, not event-based
   - arkd likely doesn't log "VTXO expiring in 24h" proactively
   - **Decision**: Use Prometheus metrics from arkd (if available) or query-based approach
   - **Alternative**: Arkd may expose VTXO expiry times via metrics: `arkd_vtxo_expiry_timestamp`

**Decision**:
- Proceed with assumed log patterns, document as "requires validation" in quickstart.md
- Create test suite to inject log patterns and verify alert behavior
- If patterns don't exist, open arkd enhancement issue to add structured logging

**Rationale**:
- Existing Loki alerts (ArkdLowLiquidity, ArkdWalletLocked) prove log-based detection works
- Pattern-matching is flexible enough to adapt to actual arkd log format
- Configuration-only approach avoids requiring arkd code changes (ideal for MVP)

**Alternatives Considered**:
- **Alternative 1**: Modify arkd to emit structured JSON logs with fraud event types
  - Rejected: Requires code changes, deployment coordination, more complex
- **Alternative 2**: Use metric-only approach (no log parsing)
  - Rejected: Arkd may not expose all fraud signals as metrics; logs provide richer context

### 2. Alert Threshold Research

**Question**: What are appropriate thresholds for fraud alerts to minimize false positives while ensuring timely detection?

**Research Approach**:
- Analyzed existing ark-telemetry alert thresholds (HighMachineCPUUsage: 70% for 2m, ServiceMissing: 10s)
- Reviewed security alerting best practices (OWASP, NIST guidelines)
- Considered Ark protocol characteristics (rounds every 30s, typical user behavior)

**Findings**:

1. **Unilateral Exit Thresholds**:
   - **Single exit**: Alert immediately (informational) - any unilateral exit is notable
   - **High frequency**: >3 exits in 5 minutes (critical) - indicates systemic problem
   - **Rationale**: Unilateral exits are rare in healthy operation; even 3 exits suggest service degradation

2. **Double-Spend Thresholds**:
   - **Any occurrence**: Critical alert immediately (0 tolerance)
   - **Rationale**: Double-spend attempts are always malicious or buggy; zero false positives expected

3. **Forfeit Proof Failure Thresholds**:
   - **Individual failure**: Warning after single failure
   - **High rate**: Critical if >10% of round participants fail in single round
   - **Repeat offender**: Warning if same user fails >3 times in 24 hours
   - **Rationale**: Individual failures may be network issues; high rates indicate attacks or bugs

4. **VTXO Expiry Thresholds**:
   - **24 hours**: Warning if >10% of total system value expiring
   - **6 hours**: Informational if user has >50% balance expiring
   - **1 hour**: Escalated warning for imminent expiry
   - **Rationale**: Provides layered warning system; operators can intervene before funds are locked

**Decision**:
- Use researched thresholds as defaults
- Make all thresholds configurable via environment variables
- Document threshold tuning guidance in quickstart.md

**Rationale**:
- Conservative thresholds (low tolerance for fraud) are appropriate for financial protocol
- Configurability allows operators to tune based on observed baseline
- Tiered severity (informational → warning → critical) prevents alert fatigue

**Alternatives Considered**:
- **Alternative 1**: Adaptive thresholds using ML/statistical baselines
  - Rejected: Too complex for MVP; operators can manually tune based on experience
- **Alternative 2**: Single universal threshold for all alert types
  - Rejected: Different fraud types have different severity and expected frequency

### 3. OpenTelemetry Collector Log-to-Metrics Transformation

**Question**: How to detect double-spend attempts if arkd doesn't emit metrics for VTXO duplicates?

**Research Approach**:
- Reviewed OpenTelemetry Collector documentation for connectors and processors
- Examined ark-telemetry collector-config.yaml for existing transformations
- Consulted OpenTelemetry Collector Contrib processors (logstometric, transform)

**Findings**:

1. **Log-to-Metrics Processor**:
   - OpenTelemetry Collector supports `logstometric` processor
   - Can parse log lines and increment counters based on patterns
   - Example from existing RoundFailureDetected alert:
     ```yaml
     connectors:
       logstometrics:
         metrics:
           - name: arkd_round_failed_total
             type: counter
             description: "Count of round failures detected in logs"
             match: 'Attributes["log.body"] matches "(?i)round failed"'
     ```

2. **Double-Spend Counter**:
   - Create metric: `arkd_double_spend_attempt_total`
   - Pattern match: `"VTXO already spent"` or `"duplicate VTXO"` or `"invalid VTXO: spent"`
   - Prometheus alert: `rate(arkd_double_spend_attempt_total[1m]) > 0`

3. **Unilateral Exit Counter**:
   - Create metric: `arkd_unilateral_exit_initiated_total`
   - Pattern match: `"unilateral exit"` or `"force redemption"` or `"unroll initiated"`
   - Prometheus alerts:
     - Informational: `rate(arkd_unilateral_exit_initiated_total[1m]) > 0`
     - Critical: `sum(increase(arkd_unilateral_exit_initiated_total[5m])) > 3`

**Decision**:
- Add logstometric connector to collector-config.yaml
- Transform critical log patterns to Prometheus metrics
- Use hybrid approach: Loki alerts for detailed analysis, Prometheus alerts for high-reliability

**Rationale**:
- Log-to-metrics provides consistent alerting even if Loki is temporarily unavailable
- Prometheus metrics enable long-term trend analysis and dashboards
- Existing RoundFailureDetected alert proves this pattern works in production

**Alternatives Considered**:
- **Alternative 1**: Loki LogQL alerts only (no metric transformation)
  - Rejected: Single point of failure; Loki downtime means no alerts
- **Alternative 2**: Modify arkd to emit native Prometheus metrics
  - Rejected: Requires code changes, defeats configuration-only approach

### 4. Grafana Dashboard Design

**Question**: What visualizations best convey fraud patterns and operational health to operators?

**Research Approach**:
- Reviewed existing Grafana dashboards (Host Metrics, RPC Latency, Container Metrics)
- Analyzed Grafana best practices for security monitoring dashboards
- Consulted OWASP Dashboard Design Guidelines

**Findings**:

1. **Dashboard 1: Fraud Detection Overview** (Primary Dashboard)
   - **Panel 1**: Unilateral Exit Rate (time series, last 24h)
     - Query: `rate(arkd_unilateral_exit_initiated_total[5m])`
     - Threshold line at 3 exits/5min (critical level)
   - **Panel 2**: Double-Spend Attempts (stat panel, current value + 24h trend)
     - Query: `sum(increase(arkd_double_spend_attempt_total[24h]))`
     - Red alert if > 0
   - **Panel 3**: Forfeit Failure Rate (gauge, percentage of participants)
     - Query: `(arkd_forfeit_failures / arkd_round_participants) * 100`
   - **Panel 4**: VTXO Expiry Timeline (histogram, bucketed by time-to-expiry)
     - Query: `arkd_vtxo_expiry_timestamp - time()`
   - **Panel 5**: Recent Fraud Events (table, last 50 events from Loki)
     - Query: `{container="arkd"} |~ "(?i)(unilateral exit|double spend|forfeit fail)"`

2. **Dashboard 2: Unilateral Exit Trends** (Drill-Down Dashboard)
   - **Panel 1**: Exit Depth Distribution (histogram, how deep in VTXO tree)
   - **Panel 2**: Exit Value Distribution (histogram, sats per exit)
   - **Panel 3**: Exits by Time of Day (heatmap, detect patterns)
   - **Panel 4**: Top Users by Exit Count (bar chart, identify power users or attackers)

**Decision**:
- Create two Grafana dashboards as specified above
- Use consistent color scheme: green (normal), yellow (warning), red (critical)
- Enable auto-refresh every 10s for real-time monitoring
- Add drill-through links from overview to detailed dashboards

**Rationale**:
- Overview dashboard provides at-a-glance health assessment
- Drill-down dashboard supports investigation and pattern analysis
- Table view of recent events provides immediate context for alerts
- Histogram visualizations reveal patterns not visible in time series

**Alternatives Considered**:
- **Alternative 1**: Single comprehensive dashboard with all metrics
  - Rejected: Too cluttered; operators need quick glance overview
- **Alternative 2**: Separate dashboard per alert type (4 dashboards total)
  - Rejected: Too many dashboards; operators want unified view

### 5. Testing Strategy

**Question**: How to validate alert rules without waiting for real fraud events in production?

**Research Approach**:
- Reviewed existing ark-telemetry testing approach (none documented)
- Examined Prometheus/Loki alert testing tools (promtool, amtool)
- Consulted SRE best practices for alert validation

**Findings**:

1. **Unit Testing (Alert Syntax)**:
   - Tool: `promtool check rules alert.rules.yml`
   - Validates: PromQL syntax, alert structure, label consistency
   - Limitation: Doesn't test alert logic or thresholds

2. **Integration Testing (Simulated Events)**:
   - Approach: Inject log patterns via `docker exec arkd sh -c 'echo "..." >> /var/log/arkd.log'`
   - For unilateral exits: Simulate log: `"unilateral exit initiated: user=abc123, vtxo=xyz789"`
   - For double-spend: Simulate log: `"VTXO already spent: vtxo=xyz789, round=42"`
   - Verify: Check Alertmanager API for firing alerts: `curl http://localhost:9093/api/v2/alerts`

3. **End-to-End Testing (Live Simulation)**:
   - Use ark-simulator to generate real unilateral exit requests
   - Create test VTXOs with short expiry times (5 minutes) to trigger expiry alerts
   - Submit duplicate VTXO spend requests to trigger double-spend detection
   - Limitation: Requires running arkd + ark-simulator + telemetry stack

**Decision**:
- Create test scripts in `specs/001-fraud-detection-alerts/contracts/test/`
- Phase 1: Unit tests (syntax validation) - automated via CI
- Phase 2: Integration tests (log injection) - manual execution documented in quickstart.md
- Phase 3: E2E tests (live simulation) - documented as optional advanced testing

**Rationale**:
- Layered testing provides confidence without requiring full stack
- Log injection is fast and deterministic (no flaky tests)
- E2E testing with ark-simulator validates real-world scenarios

**Alternatives Considered**:
- **Alternative 1**: Only E2E testing with ark-simulator
  - Rejected: Too slow, too many dependencies, hard to reproduce
- **Alternative 2**: Mock Prometheus/Loki for unit testing
  - Rejected: Complex setup, doesn't validate actual telemetry stack behavior

## Summary of Research Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Log Patterns | Use assumed patterns, validate in testing | Configuration-only approach, avoid arkd changes |
| Alert Thresholds | Conservative defaults, configurable via env vars | Low tolerance for fraud, tunable by operators |
| Log-to-Metrics | Use OTel Collector logstometric connector | Hybrid approach, reliability + rich context |
| Dashboard Design | 2 dashboards (overview + drill-down) | Balance quick glance with detailed investigation |
| Testing Strategy | Layered (unit → integration → E2E) | Fast feedback, deterministic results |

## Unresolved Questions

1. **Exact arkd log patterns**: Requires arkd codebase inspection or log sampling
   - **Mitigation**: Document as validation step in quickstart.md, create regex patterns flexible enough to match variations
2. **Arkd VTXO expiry metrics**: Unclear if arkd exposes `arkd_vtxo_expiry_timestamp` metric
   - **Mitigation**: If not available, implement expiry detection via periodic queries to arkd API (out of scope for MVP)

## Next Steps (Phase 1)

- Create data-model.md defining UnilateralExitEvent, DoubleSpendAttempt, ForfeitFailureEvent, VTXOExpiryWarning
- Generate contracts/ with alert rule YAML schemas and Grafana dashboard JSON
- Create quickstart.md with deployment and testing procedures
