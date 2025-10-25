# Implementation Plan: Fraud Detection and Unilateral Exit Alerts

**Branch**: `001-fraud-detection-alerts` | **Date**: 2025-10-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-fraud-detection-alerts/spec.md`

**Note**: This plan defines how to implement fraud detection and unilateral exit alerting for arkd using the existing ark-telemetry observability stack.

## Summary

This feature implements real-time fraud detection and operational alerting for arkd by adding log-based alerts (Loki LogQL) and metric-based alerts (Prometheus PromQL) to detect: unilateral exit patterns, double-spend attempts, forfeit proof failures, and VTXO expiry warnings. The solution leverages the existing ark-telemetry stack (OpenTelemetry Collector, Prometheus, Loki, Alertmanager, Grafana) and requires no changes to arkd itself - only configuration and dashboard additions to the telemetry infrastructure.

## Technical Context

**Language/Version**: YAML (alert rules, config files), PromQL (Prometheus queries), LogQL (Loki queries)
**Primary Dependencies**: Prometheus 2.x, Loki 2.x with ruler enabled, Alertmanager 0.25+, Grafana 10.x, OpenTelemetry Collector 0.88+
**Storage**: Prometheus TSDB (15 days retention), Loki filesystem (360h retention), Alertmanager state (Docker volumes)
**Testing**: Manual alert simulation via stress testing, log pattern injection, VTXO manipulation
**Target Platform**: Docker Compose stack on Linux (ark-telemetry deployment)
**Project Type**: Configuration-only (no code changes to arkd or telemetry services)
**Performance Goals**: Alert latency <30s for log-based alerts, <10s for metric-based alerts, support 1000+ concurrent users without degradation
**Constraints**: Must use existing log output from arkd (cannot modify arkd logging), must be configurable via environment variables, false positive rate <5%
**Scale/Scope**: 4 alert rule categories (unilateral exits, double-spend, forfeit failures, VTXO expiry), 8-12 individual alert rules, 2-3 Grafana dashboards

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS - No constitution file exists yet for Arkadian project. This feature follows established patterns in ark-telemetry (existing alert rules in alert-rules.md and loki-alert-rules.yml). No new complexity introduced - purely configuration additions to existing infrastructure.

## Project Structure

### Documentation (this feature)

```text
specs/001-fraud-detection-alerts/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0: Log pattern research, alert threshold research
├── data-model.md        # Phase 1: Event entities for fraud detection
├── quickstart.md        # Phase 1: How to deploy and test fraud detection alerts
├── contracts/           # Phase 1: Alert rule schemas, Grafana dashboard JSON
│   ├── alert-rules.schema.yaml
│   ├── loki-alert-rules.schema.yaml
│   └── fraud-dashboard.json
├── checklists/
│   └── requirements.md  # Quality validation (already created)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Target Repository (ark-telemetry)

This feature modifies configuration files in the ark-telemetry repository:

```text
${ARK_TELEMETRY_REPO}/
├── alert.rules.yml                    # ADD: Prometheus alert rules
├── loki-alert-rules.yml              # ADD: Loki log-based alert rules
├── collector-config.yaml             # MODIFY: Add log-to-metrics processor for double-spend detection
├── grafana/dashboards/               # ADD: New dashboards
│   ├── fraud-detection-dashboard.json
│   └── unilateral-exit-trends.json
├── docs/
│   └── fraud-detection-alerts.md     # ADD: Feature documentation
└── tests/
    └── alert-simulation/              # ADD: Test scripts
        ├── simulate-unilateral-exit.sh
        ├── simulate-double-spend.sh
        └── verify-alerts.sh
```

**Structure Decision**: Configuration-only feature deployed to ark-telemetry repository. No new services or code changes required. All fraud detection logic implemented via alert rules (PromQL/LogQL expressions) and dashboard visualizations.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No violations. This feature follows established patterns.
