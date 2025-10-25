# Tasks: Fraud Detection and Unilateral Exit Alerts

**Input**: Design documents from `/specs/001-fraud-detection-alerts/`
**Prerequisites**: plan.md (configuration-only deployment), spec.md (4 user stories), research.md (log patterns), data-model.md (event entities), contracts/ (alert rules)

**Tests**: This feature uses manual testing via log injection and alert validation (see quickstart.md). No automated test suite required.

**Organization**: Tasks are grouped by user story (4 P1-P3 stories) to enable independent implementation and testing of each alert category.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This is a configuration-only feature targeting the ark-telemetry repository:
- **Alert rules**: `${ARK_TELEMETRY_REPO}/alert.rules.yml`, `${ARK_TELEMETRY_REPO}/loki-alert-rules.yml`
- **OpenTelemetry config**: `${ARK_TELEMETRY_REPO}/collector-config.yaml`
- **Grafana dashboards**: `${ARK_TELEMETRY_REPO}/grafana/dashboards/`
- **Test scripts**: `${ARK_TELEMETRY_REPO}/tests/alert-simulation/`
- **Documentation**: `${ARK_TELEMETRY_REPO}/docs/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare ark-telemetry repository and validate prerequisites

- [ ] T001 Clone or update ark-telemetry repository to latest version
- [ ] T002 Backup existing alert configurations: alert.rules.yml, loki-alert-rules.yml, collector-config.yaml
- [ ] T003 [P] Verify ark-telemetry stack is running: `docker ps | grep -E '(prometheus|loki|otel-collector|alertmanager)'`
- [ ] T004 [P] Verify Slack webhook configuration: `echo $SLACK_API_URL && echo $SLACK_CHANNEL`
- [ ] T005 [P] Validate existing alert rules syntax: `promtool check rules alert.rules.yml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Configure log-to-metrics transformation in OpenTelemetry Collector (shared by all user stories)

**⚠️ CRITICAL**: This phase enables metric-based alerting for fraud detection. Must complete before any user story alert rules.

- [ ] T006 Add logstometric connector to `${ARK_TELEMETRY_REPO}/collector-config.yaml` connectors section per contracts/otel-collector-config-snippet.yaml
- [ ] T007 Create arkd_unilateral_exit_initiated_total counter metric in connector config
- [ ] T008 [P] Create arkd_double_spend_attempt_total counter metric in connector config
- [ ] T009 [P] Create arkd_forfeit_failure_total counter metric in connector config
- [ ] T010 [P] Create arkd_round_participants_total counter metric in connector config
- [ ] T011 Modify service.pipelines.logs section to include logstometrics/fraud_detection connector
- [ ] T012 Add new service.pipelines.metrics/fraud_detection pipeline consuming log-derived metrics
- [ ] T013 Validate OpenTelemetry Collector config syntax: `otel-collector --config=collector-config.yaml --dry-run`
- [ ] T014 Restart OpenTelemetry Collector: `docker restart otel-collector`
- [ ] T015 Verify log-to-metrics transformation is working: `curl http://localhost:9090/api/v1/query?query=arkd_unilateral_exit_initiated_total`

**Checkpoint**: Foundation ready - log-to-metrics working, user story alert rules can now be added

---

## Phase 3: User Story 1 - Operator Detects Suspicious Unilateral Exits (Priority: P1) 🎯 MVP

**Goal**: Detect and alert on unilateral exit patterns indicating service degradation or trust loss

**Independent Test**: Inject unilateral exit log pattern, verify alert fires within 30s with correct metadata

### Implementation for User Story 1

- [ ] T016 [P] [US1] Add ArkdUnilateralExitInitiated Loki alert rule to `${ARK_TELEMETRY_REPO}/loki-alert-rules.yml` from contracts/loki-alert-rules.yaml
- [ ] T017 [P] [US1] Add ArkdUnilateralExitCompleted Loki alert rule to `${ARK_TELEMETRY_REPO}/loki-alert-rules.yml`
- [ ] T018 [US1] Add ArkdUnilateralExitHighFrequency Prometheus alert rule to `${ARK_TELEMETRY_REPO}/alert.rules.yml` from contracts/prometheus-alert-rules.yaml
- [ ] T019 [US1] Validate Loki alert rules syntax: `docker run --rm -v $PWD:/config grafana/loki:latest -config.file=/etc/loki/local-config.yaml -verify-config`
- [ ] T020 [US1] Validate Prometheus alert rules syntax: `promtool check rules alert.rules.yml`
- [ ] T021 [US1] Restart Prometheus and Loki: `docker restart prometheus loki`
- [ ] T022 [US1] Verify alerts loaded: `curl http://localhost:9090/api/v1/rules | jq '.data.groups[] | select(.name=="fraud_detection")'`
- [ ] T023 [US1] Create test script `${ARK_TELEMETRY_REPO}/tests/alert-simulation/simulate-unilateral-exit.sh` to inject log patterns
- [ ] T024 [US1] Run simulation test and verify ArkdUnilateralExitInitiated alert fires: `bash simulate-unilateral-exit.sh && sleep 30 && curl http://localhost:9093/api/v2/alerts`
- [ ] T025 [US1] Verify Slack notification received for unilateral exit alert
- [ ] T026 [US1] Document unilateral exit alert behavior in `${ARK_TELEMETRY_REPO}/docs/fraud-detection-alerts.md`

**Checkpoint**: User Story 1 complete - unilateral exit detection fully functional and independently tested

---

## Phase 4: User Story 2 - Operator Detects Potential Double-Spend Attempts (Priority: P1)

**Goal**: Detect and alert on duplicate VTXO spend attempts (critical security control)

**Independent Test**: Inject double-spend log pattern, verify critical alert fires within 10s

### Implementation for User Story 2

- [ ] T027 [P] [US2] Add ArkdDoubleSpendPattern Loki alert rule to `${ARK_TELEMETRY_REPO}/loki-alert-rules.yml` from contracts/loki-alert-rules.yaml
- [ ] T028 [US2] Add ArkdDoubleSpendDetected Prometheus alert rule to `${ARK_TELEMETRY_REPO}/alert.rules.yml` from contracts/prometheus-alert-rules.yaml
- [ ] T029 [US2] Validate alert rules syntax: `promtool check rules alert.rules.yml`
- [ ] T030 [US2] Restart Prometheus and Loki: `docker restart prometheus loki`
- [ ] T031 [US2] Verify alerts loaded: `curl http://localhost:3100/loki/api/v1/rules | jq '.data.groups[] | select(.name=="fraud_detection_logs")'`
- [ ] T032 [US2] Create test script `${ARK_TELEMETRY_REPO}/tests/alert-simulation/simulate-double-spend.sh` to inject double-spend log patterns
- [ ] T033 [US2] Run simulation test and verify ArkdDoubleSpendPattern alert fires with critical severity: `bash simulate-double-spend.sh && sleep 15`
- [ ] T034 [US2] Verify Slack notification received with critical severity indicator
- [ ] T035 [US2] Document double-spend alert behavior and response procedures in fraud-detection-alerts.md

**Checkpoint**: User Story 2 complete - double-spend detection fully functional and independently tested

---

## Phase 5: User Story 3 - Operator Monitors Forfeit Transaction Violations (Priority: P2)

**Goal**: Detect and alert on forfeit proof submission failures that block round completion

**Independent Test**: Inject forfeit failure log patterns, verify warning alerts fire with correct thresholds

### Implementation for User Story 3

- [ ] T036 [P] [US3] Add ArkdForfeitProofFailure Loki alert rule to `${ARK_TELEMETRY_REPO}/loki-alert-rules.yml` from contracts/loki-alert-rules.yaml
- [ ] T037 [P] [US3] Add ArkdForfeitRepeatOffender Loki alert rule to `${ARK_TELEMETRY_REPO}/loki-alert-rules.yml`
- [ ] T038 [US3] Add ArkdForfeitFailureHighRate Prometheus alert rule to `${ARK_TELEMETRY_REPO}/alert.rules.yml` from contracts/prometheus-alert-rules.yaml
- [ ] T039 [US3] Validate alert rules syntax: `promtool check rules alert.rules.yml`
- [ ] T040 [US3] Restart Prometheus and Loki: `docker restart prometheus loki`
- [ ] T041 [US3] Verify alerts loaded for forfeit failure detection
- [ ] T042 [US3] Create test script `${ARK_TELEMETRY_REPO}/tests/alert-simulation/simulate-forfeit-failure.sh` to inject forfeit failure log patterns
- [ ] T043 [US3] Run simulation test and verify ArkdForfeitProofFailure alert fires: `bash simulate-forfeit-failure.sh && sleep 30`
- [ ] T044 [US3] Test high-rate scenario: inject multiple forfeit failures and verify ArkdForfeitFailureHighRate critical alert fires
- [ ] T045 [US3] Verify Slack notifications received for both warning and critical forfeit alerts
- [ ] T046 [US3] Document forfeit failure alert behavior and threshold tuning in fraud-detection-alerts.md

**Checkpoint**: User Story 3 complete - forfeit failure monitoring fully functional and independently tested

---

## Phase 6: User Story 4 - Operator Detects Abnormal VTXO Expiry Patterns (Priority: P3)

**Goal**: Provide early warning of VTXOs approaching expiry for capacity planning and user retention

**Independent Test**: Create VTXOs with short expiry times, verify tiered alerts fire at 24h/6h/1h thresholds

### Implementation for User Story 4

- [ ] T047 [P] [US4] Add ArkdVTXOExpiry24h Prometheus alert rule to `${ARK_TELEMETRY_REPO}/alert.rules.yml` from contracts/prometheus-alert-rules.yaml
- [ ] T048 [P] [US4] Add ArkdVTXOExpiry6h Prometheus alert rule to `${ARK_TELEMETRY_REPO}/alert.rules.yml`
- [ ] T049 [P] [US4] Add ArkdVTXOExpiry1h Prometheus alert rule to `${ARK_TELEMETRY_REPO}/alert.rules.yml`
- [ ] T050 [P] [US4] Add ArkdVTXOExpiredUnclaimed Prometheus alert rule to `${ARK_TELEMETRY_REPO}/alert.rules.yml`
- [ ] T051 [US4] Validate alert rules syntax: `promtool check rules alert.rules.yml`
- [ ] T052 [US4] Restart Prometheus: `docker restart prometheus`
- [ ] T053 [US4] Verify VTXO expiry alerts loaded: `curl http://localhost:9090/api/v1/rules | jq '.data.groups[] | select(.name=="fraud_detection") | .rules[] | select(.alert | startswith("ArkdVTXOExpiry"))'`
- [ ] T054 [US4] Document VTXO expiry alert behavior in fraud-detection-alerts.md
- [ ] T055 [US4] Note: E2E testing requires arkd with real VTXOs (out of scope for MVP, document in quickstart.md Test 6)

**Checkpoint**: User Story 4 complete - VTXO expiry monitoring configured (E2E testing deferred to integration with live arkd)

---

## Phase 7: Grafana Dashboards & Visualization

**Purpose**: Create dashboards for visualizing fraud metrics across all user stories

- [ ] T056 [P] Create Fraud Detection Overview dashboard JSON at `${ARK_TELEMETRY_REPO}/grafana/dashboards/fraud-detection-dashboard.json`
- [ ] T057 [P] Add Unilateral Exit Rate time series panel (queries arkd_unilateral_exit_initiated_total)
- [ ] T058 [P] Add Double-Spend Attempts stat panel (queries arkd_double_spend_attempt_total)
- [ ] T059 [P] Add Forfeit Failure Rate gauge panel (queries arkd_forfeit_failure_total / arkd_round_participants_total)
- [ ] T060 [P] Add Recent Fraud Events table panel (Loki query for all fraud patterns)
- [ ] T061 [P] Create Unilateral Exit Trends drill-down dashboard JSON at `${ARK_TELEMETRY_REPO}/grafana/dashboards/unilateral-exit-trends.json`
- [ ] T062 [P] Add Exit Depth Distribution histogram panel
- [ ] T063 [P] Add Exit Value Distribution histogram panel
- [ ] T064 [P] Add Exits by Time of Day heatmap panel
- [ ] T065 Provision dashboards to Grafana: copy JSON files to grafana/provisioning/dashboards/ and restart Grafana
- [ ] T066 Verify dashboards appear in Grafana UI: navigate to http://localhost:3333 and search for "Fraud Detection"
- [ ] T067 Configure auto-refresh (10s) and time range (24h) for real-time monitoring
- [ ] T068 Test dashboard drill-through links from overview to detailed views
- [ ] T069 Document dashboard usage and panel queries in fraud-detection-alerts.md

---

## Phase 8: Configuration & Environment Variables

**Purpose**: Make alert thresholds configurable for operator tuning

- [ ] T070 [P] Document environment variables in `${ARK_TELEMETRY_REPO}/.env.example`: FRAUD_DETECTION_UNILATERAL_EXIT_THRESHOLD, FRAUD_DETECTION_TIME_WINDOW, FRAUD_DETECTION_FORFEIT_FAILURE_PCT
- [ ] T071 [P] Update docker-compose.otel.yaml to pass environment variables to Prometheus and Loki containers
- [ ] T072 [P] Modify Prometheus alert rules to reference environment variables: `${FRAUD_DETECTION_UNILATERAL_EXIT_THRESHOLD:-3}`
- [ ] T073 [P] Modify Loki alert rules to reference environment variables: `${FRAUD_DETECTION_TIME_WINDOW:-5m}`
- [ ] T074 Test threshold configuration by setting FRAUD_DETECTION_UNILATERAL_EXIT_THRESHOLD=5 and verifying alert behavior changes
- [ ] T075 Document threshold tuning guidelines in quickstart.md Step 7

---

## Phase 9: Testing & Validation

**Purpose**: Comprehensive validation of all fraud detection capabilities

- [ ] T076 [P] Create master test script `${ARK_TELEMETRY_REPO}/tests/alert-simulation/verify-alerts.sh` that runs all simulations and checks alerts
- [ ] T077 [P] Run full test suite: `cd tests/alert-simulation && bash verify-alerts.sh`
- [ ] T078 [P] Verify all alert rules appear in Prometheus UI: http://localhost:9090/alerts
- [ ] T079 [P] Verify all alert rules appear in Loki ruler: `curl http://localhost:3100/loki/api/v1/rules`
- [ ] T080 [P] Verify all Slack notifications were received for test alerts
- [ ] T081 [P] Verify Grafana dashboards display fraud metrics correctly
- [ ] T082 [P] Check service logs for errors: `docker logs prometheus loki otel-collector alertmanager`
- [ ] T083 Test rollback procedure: restore backup configs and verify system returns to pre-deployment state
- [ ] T084 Document validation checklist completion in quickstart.md

---

## Phase 10: Documentation & Deployment Guide

**Purpose**: Finalize documentation for operator reference and future maintenance

- [ ] T085 [P] Complete `${ARK_TELEMETRY_REPO}/docs/fraud-detection-alerts.md` with all alert descriptions, thresholds, and response procedures
- [ ] T086 [P] Update `${ARKADIAN_DIR}/docs/projects/ark-telemetry/system/alert-rules.md` to include new fraud detection alerts
- [ ] T087 [P] Update `${ARKADIAN_DIR}/docs/projects/ark-telemetry/system/components.md` to document log-to-metrics transformation
- [ ] T088 [P] Create runbook links for each alert type: unilateral-exit-spike, double-spend-response, forfeit-failure-spike, vtxo-expiry-warnings
- [ ] T089 [P] Document edge cases and troubleshooting in quickstart.md
- [ ] T090 Review quickstart.md for completeness: all deployment steps, test procedures, troubleshooting, rollback
- [ ] T091 Create deployment checklist for production rollout
- [ ] T092 Document alert tuning recommendations based on baseline observations
- [ ] T093 Add fraud detection feature to ark-telemetry CHANGELOG.md

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements and production readiness

- [ ] T094 [P] Add ArkdCoordinatedFraudPattern alert (combines all fraud indicators) to loki-alert-rules.yml
- [ ] T095 [P] Configure alert severity routing in Alertmanager: critical alerts to #ark-critical, warnings to #ark-alerts
- [ ] T096 [P] Add alert silencing configuration for planned maintenance windows
- [ ] T097 [P] Implement alert rate limiting to prevent Slack spam (group_wait, group_interval, repeat_interval)
- [ ] T098 [P] Add metric retention configuration for long-term fraud trend analysis (extend from 15d to 30d if needed)
- [ ] T099 Run security review: verify user IDs are hashed, no PII in alerts, Slack webhook security
- [ ] T100 Run performance validation: verify telemetry stack handles 1000+ concurrent users without degradation
- [ ] T101 Create operator training materials: how to interpret alerts, investigate fraud, tune thresholds
- [ ] T102 Final quickstart.md validation: run through entire deployment and testing procedure from scratch

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
  - User Story 1 (P1): Unilateral exits - MVP priority
  - User Story 2 (P1): Double-spend - Can run parallel with US1
  - User Story 3 (P2): Forfeit failures - Can run parallel with US1/US2
  - User Story 4 (P3): VTXO expiry - Can run parallel with US1/US2/US3
- **Dashboards (Phase 7)**: Can run parallel with user stories (after foundational)
- **Configuration (Phase 8)**: After alert rules deployed (depends on US1-US4)
- **Testing (Phase 9)**: After all user stories + dashboards complete
- **Documentation (Phase 10)**: Can run parallel with implementation phases
- **Polish (Phase 11)**: Depends on all previous phases complete

### User Story Dependencies

- **User Story 1 (P1 - Unilateral Exits)**: Independent after Foundational
- **User Story 2 (P1 - Double-Spend)**: Independent after Foundational
- **User Story 3 (P2 - Forfeit Failures)**: Independent after Foundational
- **User Story 4 (P3 - VTXO Expiry)**: Independent after Foundational (E2E testing requires live arkd)

**Key Insight**: All 4 user stories are independently deployable and testable after Foundational phase completes.

### Within Each User Story

- Loki alert rules before Prometheus alert rules (no dependency, just convention)
- Alert rules before restart services
- Restart services before verification
- Verification before test script creation
- Test script before running tests
- Tests before documentation

### Parallel Opportunities

**Phase 1 (Setup)**: Tasks T003, T004, T005 can run in parallel (different validation checks)

**Phase 2 (Foundational)**: Tasks T007-T010 can run in parallel (different counter metrics)

**After Foundational Complete**: All 4 user stories can run in parallel with sufficient team capacity:
- Developer A: User Story 1 (T016-T026)
- Developer B: User Story 2 (T027-T035)
- Developer C: User Story 3 (T036-T046)
- Developer D: User Story 4 (T047-T055)
- Developer E: Grafana Dashboards (T056-T069) - parallel with stories

**Phase 7 (Dashboards)**: All dashboard tasks T056-T064 can run in parallel (different JSON files)

**Phase 8 (Configuration)**: Tasks T070-T073 can run in parallel (different config files)

**Phase 9 (Testing)**: Tasks T076-T082 can run in parallel (different validation checks)

**Phase 10 (Documentation)**: Tasks T085-T093 can run in parallel (different doc files)

**Phase 11 (Polish)**: Tasks T094-T098 can run in parallel (different improvements)

---

## Parallel Example: After Foundational Phase

```bash
# Once Phase 2 (Foundational) completes, launch all 4 user stories + dashboards in parallel:

# Terminal 1: User Story 1 - Unilateral Exits
Task: "Add ArkdUnilateralExitInitiated Loki alert rule"
Task: "Add ArkdUnilateralExitCompleted Loki alert rule"
Task: "Add ArkdUnilateralExitHighFrequency Prometheus alert rule"
# ... continue through T016-T026

# Terminal 2: User Story 2 - Double-Spend
Task: "Add ArkdDoubleSpendPattern Loki alert rule"
Task: "Add ArkdDoubleSpendDetected Prometheus alert rule"
# ... continue through T027-T035

# Terminal 3: User Story 3 - Forfeit Failures
Task: "Add ArkdForfeitProofFailure Loki alert rule"
Task: "Add ArkdForfeitRepeatOffender Loki alert rule"
# ... continue through T036-T046

# Terminal 4: User Story 4 - VTXO Expiry
Task: "Add ArkdVTXOExpiry24h Prometheus alert rule"
Task: "Add ArkdVTXOExpiry6h Prometheus alert rule"
# ... continue through T047-T055

# Terminal 5: Grafana Dashboards (independent of stories)
Task: "Create Fraud Detection Overview dashboard JSON"
Task: "Create Unilateral Exit Trends dashboard JSON"
# ... continue through T056-T069
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T015) - **CRITICAL BLOCKING PHASE**
3. Complete Phase 3: User Story 1 - Unilateral Exits (T016-T026)
4. **STOP and VALIDATE**: Test unilateral exit detection independently
5. Deploy/demo if ready - operators can now detect suspicious exit patterns

**MVP Delivered**: Operators receive immediate alerts when users initiate unilateral exits, enabling investigation of service degradation or trust issues.

### Incremental Delivery

1. Complete Setup (Phase 1) + Foundational (Phase 2) → Foundation ready
2. Add User Story 1 (Phase 3) → Test independently → **Deploy/Demo (MVP!)** - Unilateral exit detection
3. Add User Story 2 (Phase 4) → Test independently → **Deploy/Demo** - Double-spend detection added
4. Add User Story 3 (Phase 5) → Test independently → **Deploy/Demo** - Forfeit failure monitoring added
5. Add User Story 4 (Phase 6) → Test independently → **Deploy/Demo** - VTXO expiry warnings added
6. Add Dashboards (Phase 7) → **Deploy/Demo** - Visual fraud analysis
7. Polish (Phases 8-11) → **Deploy/Demo** - Production-ready

Each story adds fraud detection capability without breaking previous stories.

### Parallel Team Strategy

With 4+ developers after Foundational phase completes:

1. Team completes Setup + Foundational together (T001-T015)
2. Once Foundational is done (log-to-metrics working):
   - **Developer A**: User Story 1 - Unilateral Exits (T016-T026)
   - **Developer B**: User Story 2 - Double-Spend (T027-T035)
   - **Developer C**: User Story 3 - Forfeit Failures (T036-T046)
   - **Developer D**: User Story 4 - VTXO Expiry (T047-T055)
   - **Developer E**: Grafana Dashboards (T056-T069)
3. Stories complete independently, integrate via shared telemetry stack
4. Test each story independently before moving to integration testing

---

## Notes

- [P] tasks = different files, no dependencies on incomplete work
- [Story] label (US1-US4) maps task to specific user story for traceability
- Each user story is independently deployable and testable after Foundational phase
- No automated tests required - manual testing via log injection documented in quickstart.md
- Configuration-only feature: no code changes to arkd, only to ark-telemetry configs
- Commit after each phase or logical task group
- Stop at any checkpoint to validate story independently
- Alert rules follow existing ark-telemetry patterns (see alert-rules.md for examples)

---

## Task Summary

**Total Tasks**: 102 tasks across 11 phases

**Task Count by Phase**:
- Phase 1 (Setup): 5 tasks
- Phase 2 (Foundational): 10 tasks ⚠️ BLOCKING
- Phase 3 (US1 - Unilateral Exits): 11 tasks 🎯 MVP
- Phase 4 (US2 - Double-Spend): 9 tasks
- Phase 5 (US3 - Forfeit Failures): 11 tasks
- Phase 6 (US4 - VTXO Expiry): 9 tasks
- Phase 7 (Dashboards): 14 tasks
- Phase 8 (Configuration): 6 tasks
- Phase 9 (Testing): 9 tasks
- Phase 10 (Documentation): 9 tasks
- Phase 11 (Polish): 9 tasks

**Parallel Opportunities**: 47 tasks marked [P] (46% parallelizable)

**Independent User Stories**: All 4 user stories can run in parallel after Foundational phase

**MVP Scope**: Phases 1-3 (26 tasks) deliver unilateral exit detection - first production-ready capability

**Full Feature**: All 11 phases (102 tasks) deliver complete fraud detection suite with dashboards, configuration, testing, and documentation
