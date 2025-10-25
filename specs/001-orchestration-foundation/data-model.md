# Data Model: Orchestration Foundation (Phase 1)

**Feature**: 001-orchestration-foundation
**Date**: 2025-10-25
**Phase**: 1 (Design & Contracts)

## Overview

This document defines the data structures and schemas for the four core components of the orchestration foundation:

1. **Intent Classification** - Hierarchical intent representation
2. **Workflow Template** - Predefined execution patterns
3. **Context Budget** - Token tracking and overflow management
4. **Execution Record** - Workflow history for learning

All schemas use YAML for templates/configuration and JSON for runtime data/logs.

---

## Entity 1: Intent Classification

**Purpose**: Represents the parsed understanding of a user request with hierarchical classification.

**Location**: Runtime object in orchestrator (not persisted), but recorded in execution logs.

**Schema** (YAML representation):
```yaml
intent_classification:
  primary: "develop"                    # Required: One of 7 types
  sub_intent: "medium_feature"          # Optional: Type-specific sub-classification
  complexity: "medium"                  # Required: simple | medium | complex
  urgency: "normal"                     # Required: low | normal | high | critical
  confidence: 0.85                      # Optional: 0.0-1.0 confidence score
  keywords: ["alerts", "fraud", "detection"]  # Optional: Matched keywords
  multi_project: false                  # Required: Single or multi-project
  projects: ["arkd"]                    # Required: Selected project IDs
```

**Field Definitions**:

| Field | Type | Required | Values | Description |
|-------|------|----------|--------|-------------|
| `primary` | string | Yes | ask_question, develop, test_or_run, analyze_pr_or_commits, debug, monitor_or_alert, research, performance_analysis | Primary intent type (7 base types + performance) |
| `sub_intent` | string | No | quick_fix, small_feature, medium_feature, large_feature (for develop); critical, high, medium, low (for debug) | Type-specific sub-classification |
| `complexity` | string | Yes | simple, medium, complex | Routing complexity (determines agent selection) |
| `urgency` | string | Yes | low, normal, high, critical | Timeline urgency (affects approval requirements) |
| `confidence` | float | No | 0.0 - 1.0 | Classifier confidence (future: ask user if <0.7) |
| `keywords` | array[string] | No | - | Keywords that matched classification rules |
| `multi_project` | boolean | Yes | true, false | Whether request spans multiple projects |
| `projects` | array[string] | Yes | - | Selected project IDs (from dynamic project selection) |

**Classification Rules**:

### Primary Intent
```
ask_question: ["how", "what", "why", "explain", "tell me about"]
develop: ["add", "create", "build", "implement", "fix", "update"]
debug: ["error", "bug", "broken", "failing", "not working"]
test_or_run: ["test", "run", "validate", "simulate"]
analyze_pr_or_commits: ["review", "PR", "pull request", "commit"]
monitor_or_alert: ["metrics", "logs", "grafana", "loki"]
research: ["compare", "alternatives", "best practices", "research"]
performance_analysis: ["slow", "latency", "bottleneck", "optimize"]
```

### Sub-Intent (develop)
```
quick_fix: ≤3 files, <100 lines, keywords: ["typo", "doc", "comment", "README"]
small_feature: ≤10 files, <500 lines, keywords: ["endpoint", "component", "simple"]
medium_feature: ≤30 files, <1000 lines, keywords: ["feature", "add", "integrate"]
large_feature: >30 files or >1000 lines, keywords: ["rewrite", "redesign", "major"]
```

### Complexity
```
simple: Single-agent, no planning (ask_question, quick_fix, test_or_run)
medium: Multi-agent, standard planning (small_feature, medium_feature, debug)
complex: Multi-agent, planning + research (large_feature, multi_project, performance)
```

### Urgency
```
critical: keywords: ["prod down", "emergency", "urgent", "asap", "critical"]
high: keywords: ["soon", "important", "priority"]
normal: default (no urgency keywords)
low: keywords: ["when you can", "eventually", "nice to have"]
```

**Example Usage**:
```yaml
# User request: "fix typo in README"
intent_classification:
  primary: "develop"
  sub_intent: "quick_fix"
  complexity: "simple"
  urgency: "normal"
  confidence: 0.95
  keywords: ["fix", "typo", "README"]
  multi_project: false
  projects: ["arkadian"]

# User request: "add fraud detection alerts to arkd with Prometheus integration"
intent_classification:
  primary: "develop"
  sub_intent: "medium_feature"
  complexity: "medium"
  urgency: "normal"
  confidence: 0.88
  keywords: ["add", "alerts", "fraud", "detection"]
  multi_project: false
  projects: ["arkd"]

# User request: "arkd is down in production, fix immediately"
intent_classification:
  primary: "debug"
  sub_intent: "critical"
  complexity: "simple"
  urgency: "critical"
  confidence: 0.92
  keywords: ["down", "production", "immediately", "fix"]
  multi_project: false
  projects: ["arkd"]
```

---

## Entity 2: Workflow Template

**Purpose**: Defines a predefined execution pattern with phases, agents, approvals, and checkpoints.

**Location**: `.specify/templates/workflows/{template_name}.yaml`

**Schema** (YAML):
```yaml
# Metadata
name: "feature_full_lifecycle"
description: "Medium to large feature with full planning cycle"
version: "1.0.0"
author: "arkadian-system"
created: "2025-10-25"
last_modified: "2025-10-25"

# Applicability (intent matching)
applies_to:
  primary_intent: "develop"
  sub_intent: ["medium_feature", "large_feature"]
  complexity: ["medium", "complex"]
  urgency: ["low", "normal", "high"]  # Excludes critical (use emergency workflow)
  multi_project: false  # Single project

# Execution specification
agents:
  - "ark-project-manager"
  - "ark-developer"
  - "ark-tester"

phases:
  - id: "specify"
    name: "Create Specification"
    agent: "project-manager"
    depends_on: null  # First phase
    approval_required: true
    approval_message: "Specification complete. Proceed to planning?"
    actions:
      - "Use pm-spec skill to create specification"
      - "Generate spec.md with user stories, requirements, success criteria"
    checkpoint:
      path: "specs/{feature-id}/spec.md"
      required_for_next_phase: true
    timeout_seconds: 900  # 15 minutes
    parallel_with: null

  - id: "clarify"
    name: "Clarify Ambiguities"
    agent: "project-manager"
    depends_on: "specify"
    condition: "if [NEEDS CLARIFICATION] markers exist in spec.md"
    approval_required: false
    actions:
      - "Use pm-clarify skill to resolve ambiguities"
      - "Update spec.md with clarified requirements"
    checkpoint:
      path: "specs/{feature-id}/spec.md"
      required_for_next_phase: true
    timeout_seconds: 600  # 10 minutes

  - id: "plan"
    name: "Create Implementation Plan"
    agent: "project-manager"
    depends_on: "clarify"
    approval_required: true
    approval_message: "Plan complete. Proceed to task breakdown?"
    actions:
      - "Use pm-plan skill to create implementation plan"
      - "Generate plan.md, research.md, data-model.md, contracts/"
    checkpoint:
      path: "specs/{feature-id}/plan.md"
      required_for_next_phase: true
    timeout_seconds: 1200  # 20 minutes

  - id: "tasks"
    name: "Break Down into Tasks"
    agent: "project-manager"
    depends_on: "plan"
    approval_required: true
    approval_message: "Task breakdown complete. Hand off to developer?"
    actions:
      - "Use pm-tasks skill to generate task list"
      - "Generate tasks.md with dependency-ordered tasks"
    checkpoint:
      path: "specs/{feature-id}/tasks.md"
      required_for_next_phase: true
    timeout_seconds: 900  # 15 minutes

  - id: "analyze"
    name: "Validate Consistency"
    agent: "project-manager"
    depends_on: "tasks"
    approval_required: false
    actions:
      - "Use pm-analyze skill to validate cross-artifact consistency"
      - "Auto-fix minor inconsistencies if possible"
    auto_fix: true
    timeout_seconds: 300  # 5 minutes

  - id: "implement"
    name: "Implement Feature"
    agent: "developer"
    depends_on: "analyze"
    approval_required: false
    actions:
      - "Use dev-implement skill to execute tasks.md"
      - "Create branch, write code, run tests, commit changes"
    checkpoint:
      path: "git commit SHA"
      required_for_next_phase: true
    timeout_seconds: 3600  # 60 minutes

  - id: "test"
    name: "Validate Implementation"
    agent: "tester"
    depends_on: "implement"
    approval_required: false
    actions:
      - "Run test suite (unit + integration)"
      - "Validate deployment health"
      - "Check success criteria from spec.md"
    auto_retry: true
    max_retries: 2
    timeout_seconds: 900  # 15 minutes

  - id: "pr"
    name: "Create Pull Request"
    agent: "developer"
    depends_on: "test"
    approval_required: true
    approval_message: "Tests pass. Create pull request and push?"
    actions:
      - "Create PR with summary, test plan, breaking changes"
      - "Push branch to remote"
    checkpoint:
      path: "PR URL"
      required_for_next_phase: false
    timeout_seconds: 300  # 5 minutes

# Success criteria (validation)
success_criteria:
  - "spec.md exists and passes quality checklist"
  - "plan.md contains architecture decisions and risk analysis"
  - "tasks.md has dependency-ordered tasks with acceptance criteria"
  - "All tests pass (unit + integration)"
  - "PR created with complete description"

# Performance estimates
estimated_duration_seconds: 2700  # 45 minutes
max_duration_seconds: 5400  # 90 minutes (timeout)

# Recovery strategy
recovery:
  on_phase_failure: "retry_phase"  # vs "abort_workflow" or "skip_phase"
  checkpoint_frequency: "per_phase"
  resume_from: "last_checkpoint"
```

**Field Definitions**:

| Section | Field | Type | Required | Description |
|---------|-------|------|----------|-------------|
| **Metadata** | name | string | Yes | Unique template identifier (kebab-case) |
| | description | string | Yes | Human-readable summary |
| | version | string | Yes | Semver (1.0.0) |
| **Applies To** | primary_intent | string | Yes | Intent type this template handles |
| | sub_intent | array[string] | No | Applicable sub-intents |
| | complexity | array[string] | Yes | Applicable complexity levels |
| | urgency | array[string] | Yes | Applicable urgency levels |
| **Execution** | agents | array[string] | Yes | Agents used in workflow |
| | phases | array[Phase] | Yes | Ordered execution phases |
| **Phase** | id | string | Yes | Unique phase identifier |
| | agent | string | Yes | Agent name (without ark- prefix) |
| | depends_on | string | No | Phase ID this depends on (null for first) |
| | approval_required | boolean | Yes | User approval gate |
| | actions | array[string] | Yes | Steps to execute |
| | checkpoint | object | No | Artifact to save |
| | timeout_seconds | int | Yes | Phase timeout |

**Template Matching Logic**:
```python
def select_template(intent: IntentClassification) -> WorkflowTemplate:
    templates = load_all_templates(".specify/templates/workflows/")

    for template in templates:
        if (
            intent.primary == template.applies_to.primary_intent
            and (not template.applies_to.sub_intent or intent.sub_intent in template.applies_to.sub_intent)
            and intent.complexity in template.applies_to.complexity
            and intent.urgency in template.applies_to.urgency
            and intent.multi_project == template.applies_to.multi_project
        ):
            return template

    # No match: fall back to ad-hoc planning
    return None  # Orchestrator creates custom plan
```

---

## Entity 3: Context Budget

**Purpose**: Tracks token usage across 4-tier context loading with overflow protection.

**Location**: Runtime object in orchestrator (conceptual tracking), logged to `.specify/logs/context-usage.json`

**Schema** (JSON for runtime tracking):
```json
{
  "total_limit": 200000,
  "reserved_response": 20000,
  "available_context": 180000,
  "used_tokens": 95000,
  "usage_percentage": 0.475,
  "tier_budgets": {
    "tier1_master_index": 5000,
    "tier2_project_indexes": 10000,
    "tier3_deep_docs": 50000,
    "tier4_code": 100000,
    "agent_scratch": 15000
  },
  "tier_usage": {
    "tier1": 4500,
    "tier2": 8200,
    "tier3": 42000,
    "tier4": 40300,
    "agent": 0
  },
  "overflow_events": [
    {
      "timestamp": "2025-10-25T10:15:30Z",
      "trigger_percentage": 0.80,
      "strategy_applied": "prioritize_recent_files",
      "files_removed": 3,
      "tokens_freed": 8000
    },
    {
      "timestamp": "2025-10-25T10:18:45Z",
      "trigger_percentage": 0.85,
      "strategy_applied": "prefer_usage_docs",
      "files_removed": 2,
      "tokens_freed": 12000
    }
  ],
  "loaded_files": [
    {
      "path": "/Users/.../docs/INDEX.md",
      "tier": "tier1",
      "chars": 18000,
      "estimated_tokens": 4500,
      "loaded_at": "2025-10-25T10:10:00Z"
    },
    {
      "path": "/Users/.../docs/projects/arkd/INDEX.md",
      "tier": "tier2",
      "chars": 32800,
      "estimated_tokens": 8200,
      "loaded_at": "2025-10-25T10:11:00Z"
    }
  ]
}
```

**Field Definitions**:

| Field | Type | Description |
|-------|------|-------------|
| `total_limit` | int | Hard limit (200K tokens) |
| `reserved_response` | int | Buffer for agent output (20K) |
| `available_context` | int | Max for context loading (180K) |
| `used_tokens` | int | Current usage across all tiers |
| `usage_percentage` | float | used / total (0.0-1.0) |
| `tier_budgets` | object | Budget allocation per tier |
| `tier_usage` | object | Current usage per tier |
| `overflow_events` | array[OverflowEvent] | Log of overflow strategies applied |
| `loaded_files` | array[LoadedFile] | History of files loaded |

**Overflow Strategies** (by threshold):

```python
def apply_overflow_strategy(budget: ContextBudget) -> bool:
    usage_pct = budget.usage_percentage

    if usage_pct >= 0.95:
        # Strategy 4: Ask user to narrow scope
        user_choice = ask_user(
            "Context budget at 95%. Focus on:",
            options=["Primary project only", "Reduce doc loading", "Abort request"]
        )
        if user_choice == "Abort request":
            return False
        # Apply user choice...
        return True

    elif usage_pct >= 0.90:
        # Strategy 3: Summarize large files
        for file in budget.loaded_files:
            if file.estimated_tokens > 5000:
                summary = summarize_file(file.path)
                replace_in_context(file.path, summary)
                tokens_freed = file.estimated_tokens - len(summary) // 4
                budget.used_tokens -= tokens_freed
        return True

    elif usage_pct >= 0.85:
        # Strategy 2: Prefer usage docs over architecture
        architecture_files = [f for f in budget.loaded_files if "architecture" in f.path or "system/" in f.path]
        for file in architecture_files:
            remove_from_context(file.path)
            budget.used_tokens -= file.estimated_tokens
            budget.tier_usage[file.tier] -= file.estimated_tokens
        return True

    elif usage_pct >= 0.80:
        # Strategy 1: Prioritize recent files
        old_files = sorted(budget.loaded_files, key=lambda f: f.loaded_at)[:int(len(budget.loaded_files) * 0.3)]
        for file in old_files:
            remove_from_context(file.path)
            budget.used_tokens -= file.estimated_tokens
        return True

    return True  # Below 80%, no action needed
```

**Logging Format** (`.specify/logs/context-usage.json`):
```json
{
  "timestamp": "2025-10-25T10:20:00Z",
  "execution_id": "uuid-linked-to-execution-history",
  "final_usage": {
    "total_tokens": 95000,
    "tier1": 4500,
    "tier2": 8200,
    "tier3": 42000,
    "tier4": 40300
  },
  "overflow_events": 2,
  "strategies_applied": ["prioritize_recent_files", "prefer_usage_docs"],
  "files_loaded_count": 15,
  "peak_usage_percentage": 0.87
}
```

---

## Entity 4: Execution Record

**Purpose**: Logs workflow execution history for Phase 3 learning system.

**Location**: `.specify/memory/execution-history.json` (newline-delimited JSON)

**Schema** (JSON, one record per line):
```json
{
  "execution_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-10-25T10:00:00Z",
  "user_request": "add fraud detection alerts to arkd",
  "intent": {
    "primary": "develop",
    "sub_intent": "medium_feature",
    "complexity": "medium",
    "urgency": "normal",
    "confidence": 0.88,
    "multi_project": false,
    "projects": ["arkd"]
  },
  "workflow": {
    "template_name": "feature_full_lifecycle",
    "template_version": "1.0.0",
    "fallback_to_adhoc": false
  },
  "agents": [
    {
      "type": "ark-project-manager",
      "phases": ["specify", "clarify", "plan", "tasks", "analyze"],
      "duration_seconds": 1800
    },
    {
      "type": "ark-developer",
      "phases": ["implement", "pr"],
      "duration_seconds": 900
    }
  ],
  "duration_seconds": 2700,
  "success": true,
  "user_satisfaction": "approved",
  "artifacts": [
    "specs/001-fraud-detection-alerts/spec.md",
    "specs/001-fraud-detection-alerts/plan.md",
    "specs/001-fraud-detection-alerts/tasks.md",
    "commit:abc123def456"
  ],
  "context_usage": {
    "total_tokens": 95000,
    "tier1": 4500,
    "tier2": 8200,
    "tier3": 42000,
    "tier4": 40300,
    "overflow_events": 2,
    "strategies_applied": ["prioritize_recent_files", "prefer_usage_docs"]
  },
  "phases_executed": [
    {
      "id": "specify",
      "duration_seconds": 600,
      "success": true,
      "approval_granted": true
    },
    {
      "id": "plan",
      "duration_seconds": 900,
      "success": true,
      "approval_granted": true
    },
    {
      "id": "implement",
      "duration_seconds": 1200,
      "success": true,
      "approval_granted": false
    }
  ],
  "errors": []
}
```

**Field Definitions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `execution_id` | UUID string | Yes | Unique execution identifier |
| `timestamp` | ISO 8601 string | Yes | Workflow start time |
| `user_request` | string | Yes | Original user request text |
| `intent` | IntentClassification | Yes | Parsed intent (see Entity 1) |
| `workflow` | object | Yes | Template used + fallback flag |
| `agents` | array[AgentExecution] | Yes | Agents spawned with durations |
| `duration_seconds` | int | Yes | Total workflow execution time |
| `success` | boolean | Yes | Workflow completed successfully |
| `user_satisfaction` | string | No | approved, rejected, unknown |
| `artifacts` | array[string] | No | Files/commits created |
| `context_usage` | ContextUsageSummary | Yes | Token usage (see Entity 3) |
| `phases_executed` | array[PhaseExecution] | No | Per-phase metrics |
| `errors` | array[Error] | No | Error details if success=false |

**Error Schema** (if success=false):
```json
{
  "errors": [
    {
      "phase": "implement",
      "timestamp": "2025-10-25T10:45:30Z",
      "error_type": "test_failure",
      "message": "Integration tests failed: 3 failures in vtxo_handler_test.go",
      "stack_trace": "...",
      "recovery_attempted": true,
      "recovery_success": false
    }
  ]
}
```

**Reading Execution History** (for Phase 3 learning):
```python
def load_execution_history(file_path):
    """Load all execution records from NDJSON file"""
    records = []
    with open(file_path, 'r') as f:
        for line in f:
            if line.strip():
                records.append(json.loads(line))
    return records

def get_success_rate(workflow_name):
    """Calculate success rate for a workflow template"""
    records = load_execution_history(".specify/memory/execution-history.json")
    workflow_records = [r for r in records if r["workflow"]["template_name"] == workflow_name]

    if not workflow_records:
        return None

    successes = sum(1 for r in workflow_records if r["success"])
    return successes / len(workflow_records)

def get_average_duration(workflow_name):
    """Get average duration for a workflow template"""
    records = load_execution_history(".specify/memory/execution-history.json")
    workflow_records = [r for r in records if r["workflow"]["template_name"] == workflow_name]

    if not workflow_records:
        return None

    durations = [r["duration_seconds"] for r in workflow_records]
    return statistics.mean(durations)
```

---

## Relationships Between Entities

```
User Request
    ↓
    ↓ (Classification)
    ↓
Intent Classification ─────┐
    ↓                       │
    ↓ (Template Selection)  │
    ↓                       │
Workflow Template           │
    ↓                       │
    ↓ (Execution)           │
    ↓                       │ (Tracking)
    ↓                       │
Context Budget ←────────────┤
    ↓                       │
    ↓ (Completion)          │
    ↓                       │
Execution Record ←──────────┘
```

**Lifecycle**:
1. User submits request → **Intent Classification** created
2. Orchestrator selects **Workflow Template** based on intent
3. Orchestrator tracks **Context Budget** during context loading
4. Workflow executes phases from template
5. **Execution Record** created with intent + workflow + context usage

---

## Validation Rules

### Intent Classification
- `primary` must be one of 8 valid types
- `complexity` and `urgency` are required
- If `multi_project = true`, `projects` must have ≥2 elements

### Workflow Template
- `phases` must form a valid DAG (no cycles in `depends_on`)
- First phase must have `depends_on: null`
- All `agent` values must reference known agents
- `timeout_seconds` must be positive

### Context Budget
- `used_tokens` must never exceed `total_limit`
- Sum of `tier_usage` must equal `used_tokens`
- Overflow events must have `trigger_percentage` ≥ 0.80

### Execution Record
- `execution_id` must be valid UUID v4
- `timestamp` must be valid ISO 8601
- If `success = false`, `errors` array must not be empty
- `duration_seconds` must match sum of `agents[].duration_seconds`

---

## Future Extensions (Phase 2+)

**Context Budget**:
- Add `cached_files` for context reuse across workflows
- Add `tiktoken_actual_tokens` to compare with `chars / 4` estimates

**Execution Record**:
- Add `user_feedback` object with rating (1-5 stars) and comments
- Add `context_inheritance` to track handoffs between agents

**Workflow Template**:
- Add `conditional_phases` for dynamic workflow branching
- Add `parallel_phases` for concurrent agent execution

---

**Status**: Data Model Complete
**Next**: Create contract schemas and quickstart guide
