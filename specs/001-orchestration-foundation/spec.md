# Feature Specification: Orchestration Foundation (Phase 1)

**Feature Branch**: `001-orchestration-foundation`
**Created**: 2025-10-25
**Status**: Draft
**Input**: User description: "Phase 1 Foundation improvements for arkadian orchestration system: Intent Sub-Classification Enhancement, Workflow Templates System, Context Budget Management, and Execution Logging System"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Intelligent Intent Routing (Priority: P1)

As an Arkadian user, when I request a simple code fix like "fix typo in README", the system should immediately route me to ark-developer instead of unnecessarily involving ark-project-manager for full specification and planning.

**Why this priority**: This is the most impactful improvement - it directly affects every user interaction with the system. Currently, the system cannot distinguish between "fix typo" (5 minutes) and "rewrite payment system" (days), leading to wasted time and poor user experience.

**Independent Test**: Can be fully tested by submitting various development requests (quick fixes, small features, medium features, large features) and verifying that each routes to the appropriate agent workflow. Delivers immediate value by reducing unnecessary overhead for simple tasks.

**Acceptance Scenarios**:

1. **Given** a user requests "fix typo in CLAUDE.md", **When** the orchestrator classifies intent, **Then** it identifies as develop:quick_fix with complexity:simple and routes directly to ark-developer
2. **Given** a user requests "add fraud detection alerts to arkd", **When** the orchestrator classifies intent, **Then** it identifies as develop:medium_feature with complexity:medium and routes to ark-project-manager for full lifecycle
3. **Given** a user requests "rewrite the entire payment processing system", **When** the orchestrator classifies intent, **Then** it identifies as develop:large_feature with complexity:complex and routes to ark-project-manager with research phase
4. **Given** a production outage occurs and user says "arkd is down, fix immediately", **When** the orchestrator classifies urgency, **Then** it identifies as urgency:critical and enables emergency mode (skip approvals)
5. **Given** a user asks "how do VTXOs work?", **When** the orchestrator classifies intent, **Then** it identifies as ask_question with complexity:simple and routes to ark-guru

---

### User Story 2 - Standardized Workflow Execution (Priority: P1)

As an Arkadian orchestrator, when I receive a feature request, I should use a predefined workflow template instead of creating a custom plan from scratch, reducing orchestration complexity and ensuring consistent execution.

**Why this priority**: Currently every request requires ad-hoc plan creation, leading to inconsistent execution and wasted computational overhead. Templates provide standardization and are foundational for all other improvements.

**Independent Test**: Can be fully tested by requesting different task types (questions, fixes, features, debugging, PR reviews) and verifying that the orchestrator uses the correct template with appropriate phases, approval points, and checkpoints. Delivers value by reducing plan creation time by 40%.

**Acceptance Scenarios**:

1. **Given** a user requests a quick question, **When** the orchestrator selects a workflow, **Then** it uses the quick_question template (ark-guru, no approval, 2min duration)
2. **Given** a user requests a quick fix, **When** the orchestrator selects a workflow, **Then** it uses the quick_fix template (ark-developer, no approval, auto-test, 5min duration)
3. **Given** a user requests a medium feature, **When** the orchestrator selects a workflow, **Then** it uses the feature_full_lifecycle template (ark-project-manager specify→plan→tasks→implement→test→pr with checkpoints)
4. **Given** a workflow template is loaded, **When** execution begins, **Then** the orchestrator follows the template's defined phases, approval points, and checkpoints without custom planning
5. **Given** a workflow completes, **When** reviewing execution, **Then** the system logged which template was used for future learning

---

### User Story 3 - Context Budget Protection (Priority: P1)

As an Arkadian orchestrator, when loading context for a multi-project investigation, I should track token usage against the 200K limit and apply overflow strategies before hitting the limit, preventing workflow failures.

**Why this priority**: This is CRITICAL - currently there is zero protection against context overflow. When users ask about multiple projects (arkd + go-sdk + wallet), the system can easily exceed 200K tokens and fail completely. This is a showstopper bug.

**Independent Test**: Can be fully tested by requesting multi-project investigations and verifying that the system tracks token usage, warns when approaching limits, and applies overflow strategies (prioritize recent, summarize large files, ask user to narrow scope). Delivers value by preventing catastrophic failures.

**Acceptance Scenarios**:

1. **Given** the orchestrator loads Tier 1 master index (5K tokens), **When** context budget is checked, **Then** it shows 5K/200K used (2.5%)
2. **Given** the orchestrator is loading Tier 3 docs and usage reaches 160K tokens (80% of 200K), **When** more files are requested, **Then** it applies "prioritize recent files" strategy and removes old documentation
3. **Given** the orchestrator is loading Tier 3 docs and usage reaches 170K tokens (85% of 200K), **When** more files are requested, **Then** it applies "prefer usage docs over architecture" strategy and removes system/architecture.md files
4. **Given** the orchestrator is loading Tier 4 code and usage reaches 180K tokens (90% of 200K), **When** a large file is requested, **Then** it summarizes the file instead of loading full content
5. **Given** the orchestrator is loading context and usage reaches 190K tokens (95% of 200K), **When** more content is requested, **Then** it asks the user to narrow scope ("Context too large. Focus on arkd or wallet?")
6. **Given** a multi-project investigation completes, **When** reviewing context usage, **Then** the system logged token usage per tier for monitoring

---

### User Story 4 - Execution History and Learning Foundation (Priority: P2)

As an Arkadian system, when workflows execute, I should log execution details (intent, workflow, agents, duration, success) to build a historical dataset that enables future learning capabilities.

**Why this priority**: While not immediately user-facing, this lays the groundwork for Phase 3's learning system. Without historical data, we cannot implement adaptive routing, success rate tracking, or failure pattern detection. It's a prerequisite for future intelligence.

**Independent Test**: Can be fully tested by running various workflows and verifying that execution-history.json is populated with complete records. Delivers value by enabling Phase 3 learning system and providing debugging insights.

**Acceptance Scenarios**:

1. **Given** a workflow completes successfully, **When** the orchestrator logs execution, **Then** the execution-history.json contains: timestamp, user_request, intent classification, workflow used, agents spawned, duration, success:true
2. **Given** a workflow fails, **When** the orchestrator logs execution, **Then** the execution-history.json contains: timestamp, user_request, intent classification, workflow used, agents spawned, duration, success:false, error details
3. **Given** a user approves a plan, **When** the orchestrator logs execution, **Then** the execution-history.json contains: user_satisfaction:approved
4. **Given** a user rejects a plan, **When** the orchestrator logs execution, **Then** the execution-history.json contains: user_satisfaction:rejected
5. **Given** multiple workflows have executed, **When** reviewing execution-history.json, **Then** each record is properly formatted JSON with consistent schema

---

### Edge Cases

- What happens when the orchestrator classifies a request incorrectly (e.g., identifies "add user auth" as quick_fix instead of medium_feature)? User should be able to provide feedback to improve classification.
- How does the system handle requests that span multiple intent types (e.g., "fix this bug and add this feature")? Should decompose into multiple independent tasks.
- What happens when context budget is exceeded despite all overflow strategies? System should fail gracefully with clear error message explaining the limitation.
- How does the system handle a workflow template that doesn't exist? Fall back to ad-hoc planning with warning.
- What happens when execution logging fails (disk full, permissions)? Log error but continue workflow execution.
- What happens when a user requests an urgency:critical task but it's not actually critical? System should allow override but log the mismatch.
- How does the system handle workflows that exceed maximum duration estimates? Log the overrun for future duration prediction improvements.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST extend intent classification from 7 flat types to hierarchical structure with primary intent, sub-intent, complexity level, and urgency level
- **FR-002**: System MUST classify 'develop' intent into four sub-types: quick_fix (≤3 files, <100 lines), small_feature (≤10 files, <500 lines), medium_feature (≤30 files, <1000 lines), large_feature (>30 files or >1000 lines)
- **FR-003**: System MUST classify complexity level as: simple (single-agent, no planning), medium (multi-agent, standard planning), complex (multi-agent, planning + research)
- **FR-004**: System MUST classify urgency level as: low (can wait days), normal (standard development cycle), high (need within hours), critical (production issue, need within minutes)
- **FR-005**: System MUST route quick_fix requests directly to ark-developer without ark-project-manager involvement
- **FR-006**: System MUST route large_feature requests to ark-project-manager with research phase included
- **FR-007**: System MUST create 8 workflow template files in .specify/templates/workflows/: quick_question.yaml, quick_fix.yaml, small_feature.yaml, feature_full_lifecycle.yaml, debug_and_fix.yaml, performance_optimization.yaml, pr_review_comprehensive.yaml, multi_project_investigation.yaml
- **FR-008**: Each workflow template MUST define: template name, description, applicable agents, execution phases, approval points, checkpoints, duration estimate, success criteria
- **FR-009**: System MUST select workflow template based on intent classification (primary + sub-intent + complexity + urgency)
- **FR-010**: System MUST execute workflow according to template phases without ad-hoc planning
- **FR-011**: System MUST track context token usage across all four tiers: Tier 1 (master index), Tier 2 (project indexes), Tier 3 (deep docs), Tier 4 (code)
- **FR-012**: System MUST enforce context budget allocations: Response buffer (20K), Tier 1 (5K), Tier 2 (10K), Tier 3 (50K), Tier 4 (100K), Agent scratch (15K), totaling 200K
- **FR-013**: System MUST apply overflow strategy 1 when usage reaches 80%: prioritize recent files over old files
- **FR-014**: System MUST apply overflow strategy 2 when usage reaches 85%: prefer usage/testing docs over architecture docs
- **FR-015**: System MUST apply overflow strategy 3 when usage reaches 90%: summarize files >5000 tokens instead of loading full content
- **FR-016**: System MUST apply overflow strategy 4 when usage reaches 95%: ask user to narrow scope with specific options
- **FR-017**: System MUST log context usage metrics to .specify/logs/context-usage.json: total_tokens_used, tokens_per_tier, overflow_events, user_focus_requests
- **FR-018**: System MUST create execution log entry in .specify/memory/execution-history.json for every workflow
- **FR-019**: Each execution log entry MUST contain: timestamp (ISO 8601), user_request (original text), intent (primary, sub, complexity, urgency), workflow (template name), agents (list of spawned agents), duration (seconds), success (boolean), user_satisfaction (approved/rejected/unknown)
- **FR-020**: System MUST append to execution-history.json without overwriting existing entries
- **FR-021**: System MUST validate execution-history.json is valid JSON after each append
- **FR-022**: System MUST handle execution logging failures gracefully without blocking workflow execution

### Key Entities *(include if feature involves data)*

- **Intent Classification**: Represents the parsed understanding of user request with fields: primary intent (ask_question, develop, debug, etc.), sub-intent (quick_fix, small_feature, medium_feature, large_feature), complexity (simple, medium, complex), urgency (low, normal, high, critical), confidence score (0.0-1.0)
- **Workflow Template**: Represents a predefined execution pattern with fields: template name, description, applicable intent patterns, agents list, phases (ordered steps), approval points (indices), checkpoints (artifact paths), duration estimate (seconds), success criteria
- **Context Budget**: Represents token usage tracking with fields: total limit (200K), used tokens (current), breakdown by tier (Tier 1-4 usage), overflow events (count and strategy applied), current tier (actively loading)
- **Execution Record**: Represents a workflow execution history entry with fields: execution ID (UUID), timestamp, user request text, intent classification, workflow template used, agents spawned, duration, success flag, user satisfaction, error details (if failed), artifacts created (paths)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Simple requests (quick fixes, simple questions) complete 60% faster than current baseline by eliminating unnecessary planning overhead
- **SC-002**: Orchestration complexity reduces by 40% as measured by lines of plan creation code executed per request
- **SC-003**: Context window overflow failures reduce to zero from current baseline of unprotected overflow risk
- **SC-004**: Multi-project investigations (3+ projects) complete successfully 100% of the time versus current risk of overflow failure
- **SC-005**: Workflow execution time becomes predictable within ±20% of template duration estimates
- **SC-006**: System successfully logs 100% of workflow executions to execution-history.json with complete schema
- **SC-007**: Context budget tracking accurately reports token usage within ±5% of actual usage
- **SC-008**: User satisfaction (approval rate) for routed workflows improves by 30% from baseline due to better intent matching
- **SC-009**: System applies overflow strategies before hitting 200K limit in 100% of cases where overflow would have occurred
- **SC-010**: Execution history data quality enables Phase 3 learning system implementation with complete historical context
