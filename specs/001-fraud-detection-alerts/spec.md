# Feature Specification: Fraud Detection and Unilateral Exit Alerts

**Feature Branch**: `001-fraud-detection-alerts`
**Created**: 2025-10-24
**Status**: Draft
**Input**: User description: "Introduce alerts for fraud detection / unilateral exits in arkd"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Operator Detects Suspicious Unilateral Exits (Priority: P1)

Operators need immediate notification when users initiate unilateral exits, as this may indicate service degradation, loss of trust, or attempts to bypass collaborative settlement. Early detection allows operators to investigate root causes and take corrective action.

**Why this priority**: Unilateral exits are a critical trust signal. High frequency indicates service problems that could cascade into broader user exodus. P1 because it directly impacts operator reputation and service health.

**Independent Test**: Can be fully tested by simulating unilateral exit requests and verifying alerts fire with correct metadata (user count, exit depth, total value).

**Acceptance Scenarios**:

1. **Given** arkd is running with telemetry enabled, **When** a user initiates a unilateral exit using the `--force` flag, **Then** an alert fires within 30 seconds with details: user address (hashed for privacy), VTXO exit depth, and exit value
2. **Given** multiple users initiate unilateral exits within 5 minutes, **When** the count exceeds 3 exits, **Then** a critical alert fires indicating unusual exit pattern with aggregate statistics
3. **Given** a user completes a unilateral exit after timelock expiry, **When** the exit transaction is broadcast onchain, **Then** an informational alert logs the completion for audit purposes

---

### User Story 2 - Operator Detects Potential Double-Spend Attempts (Priority: P1)

Operators must detect when users attempt to spend the same VTXO multiple times within a round or across rounds, which could indicate malicious behavior or software bugs. Immediate detection prevents fraud and protects other users.

**Why this priority**: Double-spend detection is fundamental to maintaining protocol integrity. Undetected double-spends could compromise the entire round and user funds. P1 because it's a critical security control.

**Independent Test**: Can be tested by submitting duplicate VTXO spend requests within the same round and verifying alert fires with VTXO identifier and user identity.

**Acceptance Scenarios**:

1. **Given** a round is in registration phase, **When** a user submits payment intents that reference the same VTXO twice, **Then** a critical alert fires immediately with VTXO ID, round number, and user identifier
2. **Given** a VTXO was spent in a previous round, **When** a user attempts to spend it again in a new round, **Then** a critical alert fires indicating stale VTXO reuse with historical context
3. **Given** the system detects a double-spend attempt, **When** the alert fires, **Then** the offending payment intent is rejected and logged for security audit

---

### User Story 3 - Operator Monitors Forfeit Transaction Violations (Priority: P2)

Operators need alerts when users fail to provide valid forfeit proofs during round confirmation, as this prevents round finalization and disrupts service for all participants. Detection helps identify malicious users or connectivity issues.

**Why this priority**: Forfeit proof failures block round completion but are usually recoverable by excluding the problematic user. P2 because it impacts round performance but doesn't compromise security directly.

**Independent Test**: Can be tested by simulating forfeit proof submission failures during round confirmation and verifying alerts include user count and round impact metrics.

**Acceptance Scenarios**:

1. **Given** a round is in confirmation phase, **When** a user fails to submit a valid forfeit proof within the timeout window, **Then** a warning alert fires with user identifier and round ID
2. **Given** multiple users (>10% of participants) fail forfeit proof submission in a single round, **When** the threshold is exceeded, **Then** a critical alert fires indicating potential network attack or systemic issue
3. **Given** a user repeatedly fails forfeit proof submission across multiple rounds, **When** the failure count exceeds 3 in 24 hours, **Then** an alert fires recommending user investigation or temporary restriction

---

### User Story 4 - Operator Detects Abnormal VTXO Expiry Patterns (Priority: P3)

Operators should be notified when large numbers of VTXOs approach expiry without renewal, as this may indicate users abandoning the service or preparing mass unilateral exits. Early warning enables proactive user communication.

**Why this priority**: VTXO expiry monitoring is important for capacity planning and user retention but doesn't indicate immediate fraud or security issues. P3 because it's operational intelligence rather than critical alerting.

**Independent Test**: Can be tested by creating VTXOs with short expiry times and verifying alerts fire at appropriate thresholds (24h, 6h, 1h before expiry).

**Acceptance Scenarios**:

1. **Given** VTXOs worth more than 10% of total system value are expiring within 24 hours, **When** the threshold is crossed, **Then** a warning alert fires with aggregate expiry value and affected user count
2. **Given** a single user has VTXOs representing >50% of their balance expiring within 6 hours, **When** the threshold is crossed, **Then** an informational alert fires suggesting proactive user outreach
3. **Given** VTXOs have expired (timelock passed), **When** users have not yet executed unilateral exits, **Then** a daily summary alert reports total expired-but-unclaimed VTXO value for operational awareness

---

### Edge Cases

- What happens when alert notification delivery fails (Slack webhook timeout/error)?
- How does the system handle alert spam if hundreds of fraud attempts occur simultaneously?
- What happens when telemetry stack (Prometheus/Loki/Alertmanager) is down during a fraud event?
- How are alerts suppressed for expected behavior (e.g., planned maintenance causing unilateral exits)?
- What happens when log patterns change due to arkd version updates, breaking LogQL queries?
- How does the system detect coordinated attacks where multiple users collude on timing?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect unilateral exit initiations by parsing arkd logs for `--force` flag or unroll API calls
- **FR-002**: System MUST generate alerts when unilateral exit count exceeds threshold (default: 3 exits in 5 minutes)
- **FR-003**: System MUST detect duplicate VTXO spend attempts within the same round by tracking VTXO identifiers in payment intents
- **FR-004**: System MUST alert when the same VTXO is referenced in multiple rounds (stale VTXO reuse)
- **FR-005**: System MUST monitor forfeit proof submission failures during round confirmation phase
- **FR-006**: System MUST alert when forfeit proof failure rate exceeds threshold (default: 10% of round participants)
- **FR-007**: System MUST track VTXO expiry times and alert at configurable intervals (24h, 6h, 1h before expiry)
- **FR-008**: System MUST include in alerts: timestamp, affected user identifiers (privacy-preserving hashes), VTXO details, and round context
- **FR-009**: System MUST route critical fraud alerts (double-spend, high-frequency unilateral exits) to dedicated Slack channel or notification priority
- **FR-010**: System MUST log all fraud detection events to Loki for historical analysis and compliance audit trails
- **FR-011**: Alerts MUST be configurable via environment variables for thresholds, time windows, and severity levels
- **FR-012**: System MUST provide Grafana dashboards visualizing fraud metrics: unilateral exit trends, double-spend attempts over time, forfeit failure rates

### Key Entities

- **UnilateralExitEvent**: Represents a user-initiated unilateral exit with attributes: user_id_hash, vtxo_id, exit_depth, exit_value, timestamp, round_context
- **DoubleSpendAttempt**: Represents detection of duplicate VTXO spend with attributes: vtxo_id, first_spend_round, second_spend_round, user_id_hash, timestamp
- **ForfeitFailureEvent**: Represents forfeit proof submission failure with attributes: user_id_hash, round_id, failure_reason, timestamp
- **VTXOExpiryWarning**: Represents approaching VTXO expiry with attributes: vtxo_id, expiry_time, current_value, user_id_hash, time_remaining

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators receive unilateral exit alerts within 30 seconds of user-initiated exit action
- **SC-002**: Double-spend attempts are detected and alerted within 10 seconds of duplicate VTXO submission
- **SC-003**: Alert false positive rate is below 5% (measured by operator feedback on alert validity)
- **SC-004**: System can process and alert on fraud patterns across 1000+ concurrent users without degradation
- **SC-005**: Grafana dashboards display fraud metrics updated every 10 seconds with historical trends
- **SC-006**: Operators can tune alert thresholds via configuration without code changes or redeployment
- **SC-007**: Alert notification delivery success rate exceeds 99% (measured by Alertmanager delivery logs)
