# Implementation Plan: Orchestration Foundation (Phase 1)

**Branch**: `001-orchestration-foundation` | **Date**: 2025-10-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-orchestration-foundation/spec.md`

## Summary

Phase 1 Foundation improvements for the Arkadian orchestration system, implementing four core capabilities that enable intelligent agent routing and prevent context overflow failures:

1. **Intent Sub-Classification** - Extend intent analysis from 7 flat types to hierarchical classification (primary + sub-intent + complexity + urgency), enabling the orchestrator to distinguish between "fix typo" (5 min) vs "rewrite payment system" (days)

2. **Workflow Templates** - Create 8 predefined workflow patterns (quick_question, quick_fix, small_feature, feature_full_lifecycle, debug_and_fix, performance_optimization, pr_review_comprehensive, multi_project_investigation) to standardize execution and reduce orchestration overhead by 40%

3. **Context Budget Management** - Implement token tracking across 4-tier context loading with overflow protection strategies to prevent failures when approaching the 200K token limit

4. **Execution Logging** - Build historical dataset of workflow executions to enable future learning capabilities (Phase 3)

**Technical Approach**: This is a metadata and orchestration enhancement that modifies CLAUDE.md's decision logic and adds supporting infrastructure files. No new code execution capabilities are added - this purely improves routing intelligence and adds guardrails.

## Technical Context

**Language/Version**: YAML (workflow templates), Markdown (CLAUDE.md orchestrator prompt), JSON (logging/tracking data)
**Primary Dependencies**: Claude Code platform (existing), CLAUDE.md orchestrator (existing), .specify/ infrastructure (existing)
**Storage**: File-based (workflow templates in .specify/templates/workflows/, execution logs in .specify/memory/, context usage logs in .specify/logs/)
**Testing**: Manual validation through test scenarios (submit various request types and verify routing), execution log validation (JSON schema checks)
**Target Platform**: Claude Code CLI environment (darwin/linux)
**Project Type**: Orchestration system enhancement (modifies existing CLAUDE.md prompt + adds supporting files)
**Performance Goals**: 60% reduction in simple request completion time, 40% reduction in orchestration complexity, zero context overflow failures
**Constraints**: Must integrate seamlessly with existing CLAUDE.md without breaking current functionality, must work with existing agent contracts, no breaking changes to agent APIs
**Scale/Scope**: Small enhancement (8 template files + CLAUDE.md modifications + 2 utility modules for budget tracking and logging)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: N/A - Constitution file is currently a template and has not been populated for the arkadian project. No constitution principles are defined yet, so no violations can occur.

**Recommendation**: Consider populating the constitution with arkadian-specific principles during or after this feature implementation. Suggested principles for orchestration system:
- **Principle: No Breaking Changes** - All orchestration improvements must maintain backward compatibility with existing agent contracts
- **Principle: Fail-Safe Defaults** - Orchestrator must always fall back to safe behavior if classification or routing fails
- **Principle: Observable Execution** - All routing decisions and resource usage must be logged for transparency
- **Principle: User Control** - User approval gates must be preserved; automation should enhance not replace human oversight

## Architecture Integration

### How This Integrates with CLAUDE.md

**Current CLAUDE.md Architecture** (simplified):
```
User Request
  ↓
Intent Classification (7 types) ← ENHANCED IN THIS FEATURE
  ↓
Dynamic Project Selection (scoring)
  ↓
Context Loading (4 tiers) ← PROTECTED IN THIS FEATURE
  ↓
Plan Creation (ad-hoc DAG) ← REPLACED WITH TEMPLATES IN THIS FEATURE
  ↓
User Approval
  ↓
Agent Spawning (parallel)
  ↓
Execution Logging ← ADDED IN THIS FEATURE
```

**Modified Architecture** (after Phase 1):
```
User Request
  ↓
Enhanced Intent Classification
  ├─ Primary intent (ask_question, develop, debug, etc.)
  ├─ Sub-intent (quick_fix, small_feature, medium_feature, large_feature)
  ├─ Complexity (simple, medium, complex)
  └─ Urgency (low, normal, high, critical)
  ↓
Workflow Template Selection ← NEW
  └─ Match intent → template (8 predefined patterns)
  ↓
Dynamic Project Selection (unchanged)
  ↓
Budget-Aware Context Loading ← NEW
  ├─ Track tokens per tier
  ├─ Enforce 200K limit
  └─ Apply overflow strategies at 80%, 85%, 90%, 95%
  ↓
Template Execution (replaces ad-hoc planning) ← NEW
  └─ Follow template phases, approvals, checkpoints
  ↓
User Approval (unchanged)
  ↓
Agent Spawning (unchanged)
  ↓
Execution Logging ← NEW
  └─ Record to .specify/memory/execution-history.json
```

### Integration Points

1. **CLAUDE.md modifications** (3 sections):
   - **Section 1**: "INTENT ANALYSIS" - Add sub-classification logic after line 52
   - **Section 2**: "PLAN & EXECUTE" → "WORKFLOW SELECTION & EXECUTE" - Replace ad-hoc planning with template selection after line 153
   - **Section 3**: "CONTEXT LOADING POLICY" - Add budget tracking hooks after line 81

2. **New infrastructure files**:
   - `.specify/templates/workflows/*.yaml` - 8 template files
   - `.specify/utils/context_budget.py` - Budget tracking utility (or inline in CLAUDE.md if Python not available)
   - `.specify/utils/execution_logger.py` - Logging utility (or inline in CLAUDE.md if Python not available)
   - `.specify/memory/execution-history.json` - Execution log storage
   - `.specify/logs/context-usage.json` - Context budget logs

3. **Agent contract compatibility**:
   - No changes to agent INPUT CONTRACT format
   - No changes to agent capabilities
   - Agents receive same YAML contracts as before
   - Only orchestrator routing logic changes

## Project Structure

### Documentation (this feature)

```text
specs/001-orchestration-foundation/
├── spec.md              # Feature specification (already exists)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
└── contracts/           # Phase 1 output (workflow template schemas)
    └── workflow-template-schema.yaml
```

### Source Code (repository root)

This feature does NOT create new source code in traditional sense. Instead, it modifies configuration and creates infrastructure files:

```text
arkadian/
├── CLAUDE.md                          # MODIFIED - Add intent sub-classification, workflow selection, budget hooks
├── .specify/
│   ├── templates/
│   │   └── workflows/                 # NEW - 8 workflow template files
│   │       ├── quick_question.yaml
│   │       ├── quick_fix.yaml
│   │       ├── small_feature.yaml
│   │       ├── feature_full_lifecycle.yaml
│   │       ├── debug_and_fix.yaml
│   │       ├── performance_optimization.yaml
│   │       ├── pr_review_comprehensive.yaml
│   │       └── multi_project_investigation.yaml
│   ├── utils/                         # NEW (if utilities are external to CLAUDE.md)
│   │   ├── context_budget.py          # Budget tracking (or inline in CLAUDE.md)
│   │   └── execution_logger.py        # Execution logging (or inline in CLAUDE.md)
│   ├── memory/
│   │   └── execution-history.json     # NEW - Execution log storage
│   └── logs/
│       └── context-usage.json         # NEW - Context budget logs
└── specs/001-orchestration-foundation/ # Feature documentation (above)
```

**Structure Decision**: This feature primarily modifies existing CLAUDE.md prompt instructions and creates supporting YAML template files. The "code" is mostly declarative configuration (YAML templates) and procedural instructions (enhanced CLAUDE.md sections). If Python utilities are needed for budget tracking or logging, they will be simple standalone scripts that CLAUDE.md can invoke via Bash tool.

**Implementation Strategy**: Since CLAUDE.md is a Markdown prompt file (not executable code), the "implementation" involves:
1. Adding new instructional sections to CLAUDE.md (intent sub-classification logic, workflow template selection logic, budget tracking pseudo-code)
2. Creating YAML workflow template files that CLAUDE.md references
3. Optionally creating Python utility scripts if budget tracking or logging logic is too complex for inline pseudo-code

## Data Models

See [data-model.md](./data-model.md) for detailed entity schemas.

**Key Entities**:
- **Intent Classification** - Hierarchical intent structure (primary, sub, complexity, urgency)
- **Workflow Template** - Predefined execution patterns with phases, approvals, checkpoints
- **Context Budget** - Token tracking across 4 tiers with overflow strategies
- **Execution Record** - Workflow execution history for learning

## Workflow Templates Design

See [contracts/workflow-template-schema.yaml](./contracts/workflow-template-schema.yaml) for template schema.

**Template Selection Logic**:
```
if intent.primary == "ask_question" AND intent.complexity == "simple":
    use quick_question.yaml

elif intent.primary == "develop":
    if intent.sub_intent == "quick_fix":
        use quick_fix.yaml
    elif intent.sub_intent == "small_feature":
        use small_feature.yaml
    elif intent.sub_intent in ["medium_feature", "large_feature"]:
        use feature_full_lifecycle.yaml

elif intent.primary == "debug":
    use debug_and_fix.yaml (severity routing internal to template)

elif intent.primary == "performance_analysis":
    use performance_optimization.yaml

elif intent.primary == "analyze_pr_or_commits":
    use pr_review_comprehensive.yaml

elif intent.multi_project AND len(projects) >= 2:
    use multi_project_investigation.yaml

else:
    fallback to ad-hoc planning (preserve existing behavior)
```

## Context Budget Design

**Budget Allocation** (200K total):
- Response buffer: 20K (reserved for agent output)
- Tier 1 (master index): 5K
- Tier 2 (project indexes): 10K
- Tier 3 (deep docs): 50K
- Tier 4 (code files): 100K
- Agent scratch space: 15K

**Overflow Strategies** (applied progressively):
1. **At 80% usage** (160K/200K) → Prioritize recent files, remove old documentation
2. **At 85% usage** (170K/200K) → Prefer usage/testing docs over architecture docs
3. **At 90% usage** (180K/200K) → Summarize files >5000 tokens instead of full load
4. **At 95% usage** (190K/200K) → Ask user to narrow scope with specific options

**Tracking Mechanism**:
- Before loading each file: estimate tokens using heuristic (chars / 4)
- After loading: update budget.used and budget.breakdown[tier]
- If can_load() returns false: apply overflow strategy and retry
- Log all overflow events to .specify/logs/context-usage.json

## Execution Logging Design

**Log Schema** (see data-model.md for full schema):
```json
{
  "execution_id": "uuid-v4",
  "timestamp": "ISO 8601",
  "user_request": "original request text",
  "intent": {
    "primary": "develop",
    "sub_intent": "medium_feature",
    "complexity": "medium",
    "urgency": "normal"
  },
  "workflow": "feature_full_lifecycle",
  "agents": ["ark-project-manager", "ark-developer"],
  "duration_seconds": 2700,
  "success": true,
  "user_satisfaction": "approved",
  "artifacts": ["spec.md", "plan.md", "tasks.md", "commit SHA"],
  "context_usage": {
    "total_tokens": 95000,
    "tier1": 4500,
    "tier2": 8200,
    "tier3": 42000,
    "tier4": 40300
  }
}
```

**Logging Triggers**:
- Workflow start: Create log entry with execution_id, timestamp, user_request, intent
- Workflow end: Update log entry with duration, success, user_satisfaction, artifacts, context_usage
- Failure: Update log entry with success:false and error details
- Append-only writes to execution-history.json (newline-delimited JSON for easy parsing)

## CLAUDE.md Modification Strategy

**Approach**: Surgical modifications to existing sections rather than complete rewrite.

### Modification 1: Intent Classification Enhancement

**Location**: After line 52 in "INTENT ANALYSIS" section

**Addition**:
```markdown
### Enhanced Intent Classification

After identifying primary intent, perform sub-classification:

**For intent=develop**:
- quick_fix: ≤3 files, <100 lines, typos/docs/simple bugs
- small_feature: ≤10 files, <500 lines, single endpoint/component
- medium_feature: ≤30 files, <1000 lines, requires planning
- large_feature: >30 files or >1000 lines, requires research

**Complexity classification**:
- simple: Single-agent, no planning needed
- medium: Multi-agent, standard planning
- complex: Multi-agent, planning + research required

**Urgency classification** (based on keywords):
- critical: "prod down", "urgent", "asap", "emergency" → skip approvals
- high: "soon", "important" → standard approvals
- normal: default
- low: "when you can", "eventually"

**Output**:
```yaml
intent_classification:
  primary: "develop"
  sub_intent: "medium_feature"
  complexity: "medium"
  urgency: "normal"
```
```

### Modification 2: Workflow Template Selection

**Location**: Replace "Create Plan (DAG)" subsection in "PLAN & EXECUTE" (line 153)

**Replacement**:
```markdown
### Select Workflow Template

Instead of ad-hoc planning, select from predefined templates:

1. Load template based on intent classification (see .specify/templates/workflows/)
2. Template defines: agents, phases, approvals, checkpoints, duration
3. If no template matches: fall back to ad-hoc planning

**Template Matching**:
- ask_question + simple → quick_question.yaml
- develop:quick_fix → quick_fix.yaml
- develop:small_feature → small_feature.yaml
- develop:medium_feature or large_feature → feature_full_lifecycle.yaml
- debug → debug_and_fix.yaml
- performance_analysis → performance_optimization.yaml
- analyze_pr → pr_review_comprehensive.yaml
- multi_project (≥2 projects) → multi_project_investigation.yaml

### Execute Workflow Template

Follow template phases exactly:
1. For each phase in template.phases:
   - Check if approval needed (template.approval_points)
   - Spawn agents as defined (parallel if template.parallel)
   - Create checkpoints as defined (template.checkpoints)
   - Validate success criteria (template.success_criteria)
```

### Modification 3: Budget-Aware Context Loading

**Location**: After line 81 in "CONTEXT LOADING POLICY" section

**Addition**:
```markdown
### Context Budget Tracking

Before loading any file, check budget:

**Budget Limits**:
- Total: 200K tokens
- Reserved response: 20K
- Available context: 180K
- Tier 1: 5K, Tier 2: 10K, Tier 3: 50K, Tier 4: 100K

**Before each load**:
1. Estimate tokens: file_size_chars / 4
2. Check: budget.used + estimate <= budget.available
3. If exceeds tier limit or total limit: apply overflow strategy
4. Load file and update budget.used, budget.breakdown[tier]

**Overflow Strategies**:
- 80% usage → Remove old files (sort by mtime, keep recent 70%)
- 85% usage → Remove architecture docs (keep testing/usage)
- 90% usage → Summarize large files (>5000 tokens)
- 95% usage → Ask user to narrow scope

**Logging**: Track all usage to .specify/logs/context-usage.json
```

### Modification 4: Execution Logging

**Location**: After "STATE UPDATES" section (line 261)

**Addition**:
```markdown
## EXECUTION LOGGING

After each workflow:

1. Create log entry in .specify/memory/execution-history.json
2. Schema: execution_id, timestamp, user_request, intent, workflow, agents, duration, success, user_satisfaction, artifacts, context_usage
3. Append-only (newline-delimited JSON)
4. Log failures with error details
5. Use for Phase 3 learning system
```

## Testing Strategy

**Manual Validation Scenarios** (from spec.md User Stories):

1. **Intent Classification Tests**:
   - Submit "fix typo in README" → verify routes to ark-developer (quick_fix)
   - Submit "add fraud detection alerts" → verify routes to ark-project-manager (medium_feature)
   - Submit "rewrite payment system" → verify routes to ark-project-manager with research (large_feature)
   - Submit "arkd is down, fix now" → verify urgency:critical, emergency mode

2. **Workflow Template Tests**:
   - Verify each of 8 templates loads correctly
   - Verify template phases execute in order
   - Verify approval points trigger user prompts
   - Verify checkpoints save artifacts

3. **Context Budget Tests**:
   - Load context until 80% → verify "prioritize recent" strategy applied
   - Load context until 85% → verify "prefer usage docs" strategy applied
   - Load context until 90% → verify "summarize large files" strategy applied
   - Load context until 95% → verify user asked to narrow scope

4. **Execution Logging Tests**:
   - Run workflow → verify execution-history.json has entry
   - Verify JSON schema valid
   - Verify all required fields present
   - Verify append-only (previous entries preserved)

**Success Criteria** (from spec.md):
- SC-001: Simple requests 60% faster (measured via execution logs)
- SC-002: Orchestration complexity reduces 40% (measured by template usage rate)
- SC-003: Zero context overflow failures (measured by overflow event logs)
- SC-009: Overflow strategies applied before hitting 200K in 100% of cases

## Implementation Phases

**Phase 0: Research** (see research.md)
- Research: YAML template best practices
- Research: Token estimation algorithms (chars/4 vs tiktoken)
- Research: JSON schema validation approaches
- Research: Newline-delimited JSON vs JSON array for logs

**Phase 1: Design & Contracts** (this phase)
- Create data-model.md with entity schemas
- Create workflow-template-schema.yaml in contracts/
- Create quickstart.md with developer guide

**Phase 2: Implementation** (handled by /speckit.tasks and ark-developer)
- Create 8 workflow template YAML files
- Modify CLAUDE.md with 4 surgical changes
- Create budget tracking utility (if needed)
- Create execution logging utility (if needed)
- Create initial empty execution-history.json and context-usage.json

**Phase 3: Validation** (handled by ark-tester)
- Run manual test scenarios
- Verify intent classification correctness
- Verify template selection logic
- Verify budget enforcement
- Verify execution logging completeness

## Risk Analysis

**Risk 1: Intent Misclassification**
- **Impact**: User gets wrong workflow (e.g., large feature routed as quick fix)
- **Mitigation**: Use conservative classification (when ambiguous, use more thorough workflow)
- **Fallback**: User can reject plan and request re-classification

**Risk 2: Template Doesn't Match Edge Cases**
- **Impact**: No template matches unusual request, system doesn't know how to proceed
- **Mitigation**: Preserve ad-hoc planning as fallback for unmatched intents
- **Fallback**: Orchestrator creates custom plan like current system

**Risk 3: Token Estimation Inaccurate**
- **Impact**: Budget tracking thinks context is within limits but actually exceeds 200K
- **Mitigation**: Use conservative estimation (chars/4 overestimates slightly)
- **Fallback**: If overflow occurs, system already at 95% strategy (user narrows scope)

**Risk 4: Execution Logging Failure**
- **Impact**: Logs don't capture workflow data, Phase 3 learning system has no data
- **Mitigation**: Use try-catch around logging (don't block workflow on log failure)
- **Fallback**: Missing log entries are acceptable; system continues to function

**Risk 5: CLAUDE.md Modifications Break Existing Behavior**
- **Impact**: Current working workflows fail after modifications
- **Mitigation**: Surgical modifications with clear boundaries; preserve fallback to current behavior
- **Validation**: Test with existing known-good requests before considering complete

## Dependencies

**External**:
- None (all modifications use existing Claude Code platform capabilities)

**Internal**:
- CLAUDE.md (existing orchestrator prompt)
- .specify/ directory structure (existing)
- Agent definitions in ~/.claude/agents/ (existing, unchanged)

**Optional**:
- Python 3.x (if budget tracking or logging utilities are external scripts)
- Alternative: Inline pseudo-code in CLAUDE.md if Python not available

## Performance Estimates

**Based on EXEC_PLAN.md analysis**:

- **Simple request time reduction**: 60% (from eliminating unnecessary PM involvement for quick fixes)
  - Current: 5min (orchestrator plans → spawns PM → PM creates spec → PM hands to developer → developer fixes)
  - New: 2min (orchestrator routes directly to developer → developer fixes)

- **Orchestration complexity reduction**: 40% (from using templates instead of ad-hoc planning)
  - Current: Orchestrator creates custom 5-7 step DAG plan for every request
  - New: Orchestrator selects 1 of 8 templates and follows predefined phases

- **Context loading time**: 0% change in Phase 1 (budget tracking adds overhead ~1-2 seconds)
  - Note: Phase 2 (agent handoff) will reduce context loading by 50%, but that's future work

- **User satisfaction improvement**: Expected 30% increase in approval rate
  - Reason: Better intent matching means users get appropriate workflow for their request size

## Next Steps

After this plan is approved:

1. Generate `research.md` (Phase 0) to resolve any NEEDS CLARIFICATION items
2. Generate `data-model.md` (Phase 1) with complete entity schemas
3. Generate `contracts/workflow-template-schema.yaml` (Phase 1) with template schema
4. Generate `quickstart.md` (Phase 1) with developer guide for using this system
5. Invoke `/speckit.tasks` to break down implementation into actionable tasks
6. Hand off to `ark-developer` for implementation via `dev-implement` skill

## Complexity Tracking

**No Constitution Violations** - Constitution is currently a template and not populated. Once arkadian constitution is defined, this section should be revisited to ensure compliance.

---

**Status**: Plan Complete - Ready for Phase 0 (Research)
**Next Command**: Continue with research.md generation in Phase 0
