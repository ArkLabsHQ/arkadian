---
description: "Task list for Orchestration Foundation (Phase 1) implementation"
---

# Tasks: Orchestration Foundation (Phase 1)

**Feature ID**: 001-orchestration-foundation
**Branch**: `001-orchestration-foundation`
**Input**: Design documents from `/specs/001-orchestration-foundation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/workflow-template-schema.yaml

**Tests**: Tests are NOT explicitly requested in this feature specification. This is an orchestration infrastructure enhancement with manual validation scenarios.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This feature modifies existing orchestration files and creates new infrastructure:
- **Orchestrator prompt**: `/Users/dusansekulic/code/go/arkadian/CLAUDE.md`
- **Workflow templates**: `/Users/dusansekulic/code/go/arkadian/.specify/templates/workflows/`
- **Memory/logs**: `/Users/dusansekulic/code/go/arkadian/.specify/memory/` and `.specify/logs/`

---

## Phase 1: Setup (Infrastructure Creation)

**Purpose**: Create directory structure and initialize empty infrastructure files before any user story implementation.

- [ ] T001 Create directory structure: `.specify/templates/workflows/`, `.specify/memory/`, `.specify/logs/`
- [ ] T002 [P] Initialize empty execution log file at `.specify/memory/execution-history.json`
- [ ] T003 [P] Initialize empty context usage log file at `.specify/logs/context-usage.json`
- [ ] T004 [P] Update `.gitignore` to exclude `.specify/memory/execution-history.json` and `.specify/logs/context-usage.json`

---

## Phase 2: Foundational (CLAUDE.md Baseline Modifications)

**Purpose**: Core CLAUDE.md modifications that ALL user stories depend on - MUST be complete before ANY user story implementation.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Add intent sub-classification section to CLAUDE.md after line 52 in "INTENT ANALYSIS" section (includes develop sub-types: quick_fix, small_feature, medium_feature, large_feature; complexity levels: simple, medium, complex; urgency levels: low, normal, high, critical)
- [ ] T006 Add context budget tracking section to CLAUDE.md after line 81 in "CONTEXT LOADING POLICY" section (includes budget allocations, overflow strategies at 80%, 85%, 90%, 95%, and tracking mechanism)
- [ ] T007 Add execution logging section to CLAUDE.md after "STATE UPDATES" section around line 261 (includes NDJSON format, schema definition, append-only writes, graceful failure handling)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Intelligent Intent Routing (Priority: P1) 🎯 MVP

**Goal**: Enable the orchestrator to distinguish between different development request complexities (quick_fix vs medium_feature vs large_feature) and route appropriately, eliminating unnecessary overhead for simple tasks.

**Why MVP**: This is the most impactful improvement - directly affects every user interaction. Delivers immediate value by reducing unnecessary overhead for simple tasks (60% faster quick fixes).

**Independent Test**: Submit various development requests (quick fixes, small features, medium features, large features) and verify each routes to the appropriate agent workflow without unnecessary planning overhead.

### Implementation for User Story 1

- [ ] T008 [P] [US1] Modify CLAUDE.md "PLAN & EXECUTE" section (replace "Create Plan (DAG)" subsection around line 153) to add workflow template selection logic with template matching rules for all 8 workflow types
- [ ] T009 [P] [US1] Add workflow template execution logic to CLAUDE.md in "PLAN & EXECUTE" section (phase execution loop, approval checking, checkpoint creation, fallback to ad-hoc planning)
- [ ] T010 [US1] Validate intent classification logic handles all test cases from spec.md acceptance scenarios (quick_fix, medium_feature, large_feature, production outage, simple question)

**Checkpoint**: User Story 1 complete - orchestrator can now intelligently classify and route requests based on complexity

**Acceptance Validation**:
- ✓ Request "fix typo in README" routes to ark-developer (quick_fix, no PM)
- ✓ Request "add fraud detection alerts" routes to ark-project-manager (medium_feature, full lifecycle)
- ✓ Request "rewrite payment system" routes to ark-project-manager with research (large_feature)
- ✓ Request "arkd is down, fix now" identifies urgency:critical and enables emergency mode
- ✓ Request "how do VTXOs work?" routes to ark-guru (ask_question, simple)

---

## Phase 4: User Story 2 - Standardized Workflow Execution (Priority: P1)

**Goal**: Provide predefined workflow templates instead of custom plan creation for each request, reducing orchestration complexity by 40% and ensuring consistent execution.

**Why This Priority**: Standardization is foundational for all other improvements. Templates eliminate ad-hoc planning overhead and enable predictable execution.

**Independent Test**: Request different task types (questions, fixes, features, debugging, PR reviews) and verify orchestrator uses correct template with appropriate phases, approval points, and checkpoints. Execution should follow template without custom planning.

### Implementation for User Story 2

- [ ] T011 [P] [US2] Create `quick_question.yaml` workflow template in `.specify/templates/workflows/` (applies to ask_question intent, simple complexity, single guru agent, no approvals, 2min duration)
- [ ] T012 [P] [US2] Create `quick_fix.yaml` workflow template in `.specify/templates/workflows/` (applies to develop:quick_fix, simple complexity, developer only, auto-test, 5min duration)
- [ ] T013 [P] [US2] Create `small_feature.yaml` workflow template in `.specify/templates/workflows/` (applies to develop:small_feature, simple-medium complexity, developer + tester, approval before implement, 15min duration)
- [ ] T014 [P] [US2] Create `feature_full_lifecycle.yaml` workflow template in `.specify/templates/workflows/` (applies to develop:medium_feature/large_feature, medium/complex complexity, PM + developer + tester, 8 phases: specify → clarify → plan → tasks → analyze → implement → test → pr, approval after specify/plan/tasks/before_pr, 45min duration)
- [ ] T015 [P] [US2] Create `debug_and_fix.yaml` workflow template in `.specify/templates/workflows/` (applies to debug intent, severity-based routing with critical/high/medium variants, debugger → developer → tester workflow, conditional approval based on severity)
- [ ] T016 [P] [US2] Create `performance_optimization.yaml` workflow template in `.specify/templates/workflows/` (applies to performance_analysis intent, 5-phase workflow: baseline → analyze → research → optimize → benchmark, researcher + tester + debugger + developer, 45min duration)
- [ ] T017 [P] [US2] Create `pr_review_comprehensive.yaml` workflow template in `.specify/templates/workflows/` (applies to analyze_pr intent, multi-phase: review → test (parallel) → aggregate → remediate (conditional), PR reviewer + tester + developer, 15min duration)
- [ ] T018 [P] [US2] Create `multi_project_investigation.yaml` workflow template in `.specify/templates/workflows/` (applies to multi_project investigations with 2+ projects, parallel guru agents per project + synthesis phase, 5min duration)
- [ ] T019 [US2] Validate all 8 workflow templates conform to schema in `contracts/workflow-template-schema.yaml` (check DAG validity, agent references, timeout constraints, approval message presence, checkpoint paths)

**Checkpoint**: User Story 2 complete - orchestrator has 8 standardized workflow templates ready for use

**Acceptance Validation**:
- ✓ Quick question request uses `quick_question.yaml` (guru, no approval, 2min)
- ✓ Quick fix request uses `quick_fix.yaml` (developer, no approval, auto-test, 5min)
- ✓ Medium feature request uses `feature_full_lifecycle.yaml` (PM → Dev → Tester with checkpoints)
- ✓ Workflow executes template phases without custom planning
- ✓ System logs which template was used in execution-history.json

---

## Phase 5: User Story 3 - Context Budget Protection (Priority: P1)

**Goal**: Track token usage against the 200K limit and apply overflow strategies before hitting the limit, preventing catastrophic workflow failures on multi-project investigations.

**Why CRITICAL**: Currently zero protection against context overflow. Multi-project investigations (arkd + go-sdk + wallet) can exceed 200K tokens and fail completely. This is a showstopper bug.

**Independent Test**: Request multi-project investigations and verify system tracks token usage, warns when approaching limits (80%, 85%, 90%, 95%), and applies overflow strategies (prioritize recent, summarize large files, ask user to narrow scope) before failing.

### Implementation for User Story 3

- [ ] T020 [US3] Add context budget conceptual tracking model to CLAUDE.md in "Context Budget Tracking" section (already added in T006, now validate it includes all 4 overflow strategies with correct thresholds and token estimator using chars/4 heuristic)
- [ ] T021 [US3] Implement overflow strategy 1 (80% threshold): Prioritize recent files logic in CLAUDE.md context loading instructions (remove oldest 30% of Tier 3 files when usage reaches 160K tokens)
- [ ] T022 [US3] Implement overflow strategy 2 (85% threshold): Prefer usage docs logic in CLAUDE.md context loading instructions (remove architecture docs, keep testing/usage when usage reaches 170K tokens)
- [ ] T023 [US3] Implement overflow strategy 3 (90% threshold): Summarize large files logic in CLAUDE.md context loading instructions (summarize files >5000 tokens when usage reaches 180K tokens)
- [ ] T024 [US3] Implement overflow strategy 4 (95% threshold): Ask user to narrow scope logic in CLAUDE.md context loading instructions (pause and ask user to focus on primary project, reduce docs, or abort when usage reaches 190K tokens)
- [ ] T025 [US3] Add context usage logging to `.specify/logs/context-usage.json` with schema: total_tokens_used, tokens_per_tier (tier1-4), overflow_events (strategy applied, tokens freed), timestamp, execution_id

**Checkpoint**: User Story 3 complete - context budget tracking protects against 200K token overflow

**Acceptance Validation**:
- ✓ Load Tier 1 master index (5K tokens) shows 5K/200K (2.5%) usage
- ✓ At 160K tokens (80%), applies "prioritize recent files" strategy
- ✓ At 170K tokens (85%), applies "prefer usage docs over architecture" strategy
- ✓ At 180K tokens (90%), applies "summarize large files" strategy
- ✓ At 190K tokens (95%), asks user to narrow scope with specific options
- ✓ Multi-project investigation completes with logged token usage per tier in context-usage.json

---

## Phase 6: User Story 4 - Execution History and Learning Foundation (Priority: P2)

**Goal**: Log execution details (intent, workflow, agents, duration, success) to build historical dataset that enables Phase 3's future learning capabilities.

**Why P2**: Not immediately user-facing, but prerequisite for future intelligence. Without historical data, cannot implement adaptive routing or failure pattern detection in Phase 3.

**Independent Test**: Run various workflows and verify `execution-history.json` is populated with complete records including timestamp, user_request, intent classification, workflow used, agents spawned, duration, success flag, user satisfaction.

### Implementation for User Story 4

- [ ] T026 [US4] Validate execution logging schema in CLAUDE.md "EXECUTION LOGGING" section (already added in T007) includes all required fields: execution_id (UUID v4), timestamp (ISO 8601), user_request, intent (primary/sub/complexity/urgency), workflow (template_name/version/fallback_flag), agents (array with types and durations), duration_seconds, success (boolean), user_satisfaction (approved/rejected/unknown), artifacts (array of paths), context_usage (total_tokens + tier breakdown + overflow_events), errors (array if success=false)
- [ ] T027 [US4] Add execution log creation trigger at workflow start in CLAUDE.md (create entry with execution_id, timestamp, user_request, intent classification)
- [ ] T028 [US4] Add execution log update trigger at workflow end in CLAUDE.md (update entry with duration, success, user_satisfaction, artifacts, context_usage)
- [ ] T029 [US4] Add execution log update trigger on user approval/rejection in CLAUDE.md (update entry with user_satisfaction: approved or rejected)
- [ ] T030 [US4] Add execution log update trigger on workflow failure in CLAUDE.md (update entry with success: false, errors array with phase, timestamp, error_type, message, stack_trace, recovery_attempted, recovery_success)
- [ ] T031 [US4] Implement graceful failure handling for execution logging in CLAUDE.md (if logging fails, log warning to console but continue workflow execution without blocking)
- [ ] T032 [US4] Add JSON schema validation for execution records in CLAUDE.md execution logging logic (validate required fields before appending: execution_id, timestamp, user_request, intent, workflow)

**Checkpoint**: User Story 4 complete - all workflows log execution history for future learning system

**Acceptance Validation**:
- ✓ Successful workflow logs: timestamp, user_request, intent, workflow, agents, duration, success:true
- ✓ Failed workflow logs: timestamp, user_request, intent, workflow, agents, duration, success:false, error details
- ✓ User approval logs: user_satisfaction:approved
- ✓ User rejection logs: user_satisfaction:rejected
- ✓ Multiple executions create properly formatted NDJSON with consistent schema (one JSON object per line)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, final validation, and documentation.

- [ ] T033 [P] Create quickstart validation script in `.specify/scripts/bash/validate-orchestration.sh` that tests all 4 user stories' acceptance criteria (intent classification, template selection, context budget, execution logging)
- [ ] T034 [P] Add monitoring dashboard instructions to quickstart.md for reviewing execution-history.json and context-usage.json (jq queries for success rates, duration stats, overflow events)
- [ ] T035 Run full quickstart.md validation scenarios (Test Scenario 1: Intent Classification, Test Scenario 2: Context Budget Protection, Test Scenario 3: Execution Logging, Test Scenario 4: Template Execution)
- [ ] T036 Validate all CLAUDE.md modifications preserve backward compatibility (fallback to ad-hoc planning if no template matches, graceful degradation if logging fails)
- [ ] T037 Create feature completion summary documenting total improvements: 60% reduction in quick fix time, 40% reduction in orchestration complexity, zero context overflow failures, 100% execution logging coverage

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User Story 1 (Intent Routing): Can start after Foundational
  - User Story 2 (Workflow Templates): Can start after Foundational
  - User Story 3 (Context Budget): Can start after Foundational
  - User Story 4 (Execution Logging): Can start after Foundational
  - **Note**: User Stories 1-4 are INDEPENDENT and can proceed in parallel
- **Polish (Phase 7)**: Depends on all user stories (1-4) being complete

### User Story Dependencies

- **User Story 1 (P1 - Intent Routing)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1 - Workflow Templates)**: Can start after Foundational (Phase 2) - No dependencies on other stories (templates reference US1's classification, but can be created independently)
- **User Story 3 (P1 - Context Budget)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 4 (P2 - Execution Logging)**: Can start after Foundational (Phase 2) - No dependencies on other stories

**Key Insight**: All 4 user stories are independently implementable and testable. No cross-story dependencies exist.

### Within Each User Story

**User Story 1** (Intent Routing):
- T008, T009 can run in parallel (different CLAUDE.md sections)
- T010 depends on T008, T009 completion

**User Story 2** (Workflow Templates):
- T011-T018 (all template files) can run in parallel
- T019 depends on T011-T018 completion

**User Story 3** (Context Budget):
- T020 must complete first (base tracking model)
- T021-T024 (overflow strategies) can run in parallel after T020
- T025 can run in parallel with T021-T024

**User Story 4** (Execution Logging):
- T026 must complete first (validate schema)
- T027-T030 (logging triggers) can run in parallel after T026
- T031, T032 can run in parallel with T027-T030

### Parallel Opportunities

- **Setup tasks** (T002, T003, T004): All marked [P], can run in parallel
- **US1 tasks** (T008, T009): Can run in parallel (different CLAUDE.md sections)
- **US2 tasks** (T011-T018): All 8 template files can be created in parallel
- **US3 tasks** (T021-T025): All overflow strategies can be implemented in parallel
- **US4 tasks** (T027-T032): All logging triggers can be implemented in parallel
- **Polish tasks** (T033, T034): Can run in parallel
- **All user stories (US1-US4)** can be worked on in parallel by different team members after Foundational phase

---

## Parallel Example: User Story 2 (Workflow Templates)

```bash
# Launch all 8 workflow template creation tasks in parallel:
Task: "Create quick_question.yaml in .specify/templates/workflows/"
Task: "Create quick_fix.yaml in .specify/templates/workflows/"
Task: "Create small_feature.yaml in .specify/templates/workflows/"
Task: "Create feature_full_lifecycle.yaml in .specify/templates/workflows/"
Task: "Create debug_and_fix.yaml in .specify/templates/workflows/"
Task: "Create performance_optimization.yaml in .specify/templates/workflows/"
Task: "Create pr_review_comprehensive.yaml in .specify/templates/workflows/"
Task: "Create multi_project_investigation.yaml in .specify/templates/workflows/"

# After all complete, validate against schema:
Task: "Validate all templates against workflow-template-schema.yaml"
```

---

## Parallel Example: User Story 3 (Context Budget)

```bash
# After base tracking model complete (T020), launch all overflow strategies in parallel:
Task: "Implement overflow strategy 1 (80%): Prioritize recent files"
Task: "Implement overflow strategy 2 (85%): Prefer usage docs"
Task: "Implement overflow strategy 3 (90%): Summarize large files"
Task: "Implement overflow strategy 4 (95%): Ask user to narrow scope"
Task: "Add context usage logging to context-usage.json"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T007)
3. Complete Phase 3: User Story 1 (T008-T010)
4. **STOP and VALIDATE**: Test US1 acceptance criteria independently
5. Verify quick fixes route to developer without PM overhead
6. Verify medium features route to PM with full lifecycle
7. Deploy/demo if ready

**MVP Deliverable**: Intelligent intent routing that reduces simple request time by 60%

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → **MVP deployed!**
3. Add User Story 2 → Test independently → Templates reduce orchestration complexity 40%
4. Add User Story 3 → Test independently → Context overflow protection prevents failures
5. Add User Story 4 → Test independently → Execution logging foundation for Phase 3 learning
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup (Phase 1) together
2. Team completes Foundational (Phase 2) together
3. Once Foundational is done (T005-T007 complete):
   - **Developer A**: User Story 1 (Intent Routing) - T008-T010
   - **Developer B**: User Story 2 (Workflow Templates) - T011-T019
   - **Developer C**: User Story 3 (Context Budget) - T020-T025
   - **Developer D**: User Story 4 (Execution Logging) - T026-T032
4. Stories complete and integrate independently
5. All team members converge on Phase 7 (Polish) together

**Note**: This feature is optimized for parallel execution - all 4 user stories are independent after Foundational phase.

---

## Task Summary

**Total Tasks**: 37

**By Phase**:
- Phase 1 (Setup): 4 tasks
- Phase 2 (Foundational): 3 tasks
- Phase 3 (US1 - Intent Routing): 3 tasks
- Phase 4 (US2 - Workflow Templates): 9 tasks
- Phase 5 (US3 - Context Budget): 6 tasks
- Phase 6 (US4 - Execution Logging): 7 tasks
- Phase 7 (Polish): 5 tasks

**By User Story**:
- US1 (Intent Routing): 3 tasks
- US2 (Workflow Templates): 9 tasks
- US3 (Context Budget): 6 tasks
- US4 (Execution Logging): 7 tasks
- Infrastructure (Setup + Foundational + Polish): 12 tasks

**Parallel Opportunities**:
- Setup phase: 3 tasks can run in parallel (T002, T003, T004)
- US1: 2 tasks can run in parallel (T008, T009)
- US2: 8 tasks can run in parallel (T011-T018 - all template files)
- US3: 5 tasks can run in parallel (T021-T025 after T020)
- US4: 6 tasks can run in parallel (T027-T032 after T026)
- Polish phase: 2 tasks can run in parallel (T033, T034)
- **Cross-story parallelism**: All 4 user stories (25 tasks total) can run in parallel after Foundational

**MVP Scope** (Recommended for initial delivery):
- Phase 1: Setup (4 tasks)
- Phase 2: Foundational (3 tasks)
- Phase 3: User Story 1 - Intent Routing (3 tasks)
- **Total MVP**: 10 tasks

**Estimated Effort** (from EXEC_PLAN.md):
- Phase 1 (Foundation): 1-2 weeks
- Includes: Intent sub-classification, workflow templates, context budget, execution logging
- MVP (US1 only): 3-5 days
- Full feature (US1-US4 + Polish): 1-2 weeks

---

## Notes

- [P] tasks = different files or independent sections, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All tasks follow strict checklist format: `- [ ] [ID] [P?] [Story] Description`
- CLAUDE.md modifications are surgical (4 specific insertion points, not complete rewrites)
- Workflow templates conform to `contracts/workflow-template-schema.yaml`
- Execution logs use NDJSON format for O(1) appends
- Context budget uses `chars / 4` heuristic for token estimation
- All infrastructure files are git-tracked except logs (execution-history.json, context-usage.json)
