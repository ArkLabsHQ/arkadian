# Sub-Agent Input Specification

This document defines the required format for invoking Arkadian sub-agents via the Task tool.

## Overview

All Arkadian agents must receive a structured Execution Specification as input. This ensures:
- Consistent context across all agent invocations
- Proper session tracking and artifact management
- Traceability of orchestrator decisions

## Specification Format

```yaml
# ═══════════════════════════════════════════════════════════
# EXECUTION SPECIFICATION - ${STEP_ID}
# This YAML will be passed verbatim to: ${AGENT_NAME}
# ═══════════════════════════════════════════════════════════

spec_id: "${SESSION_ID}-${STEP_ID}"
generated_at: "<ISO timestamp>"
orchestrator_version: "1.0"

# --- BEGIN AGENT INPUT ---
step_id: "<S1, S2, S3, etc.>"
agent: "<agent_name>"
objective: "<1-2 sentences, action-focused>"
user_request: "<original or narrowed user message>"
context_intent: "<intent_type>"
parent_session_id: "<orchestrator_session_id>"  # REQUIRED for sub-agent tracking

session_context:
  session_dir: "<absolute path to session directory>"
  artifacts_dir: "<session_dir>/artifacts/<phase>"  # Phase-specific: explore, plan, implement, qna, review, etc.
  specs_dir: "<session_dir>/specs"

projects:
  - id: "<project_id>"
    doc_source:
      arkadian_root: "${ARKADIAN_DIR}/docs"
      project_index: "${ARKADIAN_DIR}/docs/projects/<project_id>/INDEX.md"
      sections:
        - "<relative_doc_path_1.md>"
        - "<relative_doc_path_2.md>"
    repo_source:
      repo_root: "${<PROJECT_REPO_ENV>}"
      preferred_paths: []
    scripts_hint: []

docs_hint:
  project_index_path: "${ARKADIAN_DIR}/docs/INDEX.md"

# Reference documentation for clarifying Ark concepts
# - For protocol concepts (VTXOs, rounds, connectors, ASP): check arkd docs
# - For client-side wallet development patterns: check go-sdk docs
reference_docs:
  ark_protocol: "${ARKADIAN_DIR}/docs/projects/arkd/INDEX.md"
  wallet_client: "${ARKADIAN_DIR}/docs/projects/go-sdk/INDEX.md"

problem_context: {}
repo_navigation_hint: {}
success_criteria: []
available_artifacts: []
assumptions: []
non_goals: []
fallbacks: []
constraints: []
expected_outputs: []
depends_on: []

runtime:
  resolve_envs: true
  allow_external: false

# Worktree configuration (ark-developer only)
# Instructs ark-developer to create an isolated git worktree before editing files
# Worktrees are created INSIDE the repo at ${repo_root}/.worktrees/<branch>
worktree_config:
  enabled: true  # Default: true for ark-developer

artifacts_in: []
artifacts_out: []

# Retry context (optional - added by orchestrator on retry)
# retry_context:
#   attempt_number: 2
#   max_attempts: 3
#   previous_failures:
#     - attempt: 1
#       outcome: "failed"
#       hard_gate_failures:
#         - "tests.failed = 3 (expected 0)"
#       guidance: "Fix the 3 failing tests before proceeding"

# --- END AGENT INPUT ---
```

## Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `step_id` | string | Step identifier (S1, S2, S3, etc.) |
| `agent` | string | Target agent name |
| `objective` | string | 1-2 action-focused sentences |
| `user_request` | string | Original or narrowed user message |
| `context_intent` | string | Intent classification |
| `parent_session_id` | string | Orchestrator session ID (for sub-agent tracking) |
| `session_context` | object | Session directory paths |
| `projects` | array | List of relevant projects |

## Valid Agents

| Agent | Purpose |
|-------|---------|
| `ark-guru` | Q&A, concepts, internal docs, explanations |
| `ark-project-manager` | Specs, scoping, task trees, acceptance criteria |
| `ark-developer` | Code changes, fixes, implementation, testing, environment setup |
| `ark-researcher` | External research, prior art, API evaluation |
| `ark-pr-reviewer` | PR review assistant: analysis, attention ranking, draft comments, risk assessment |
| `ark-progress-tracker` | Progress reports, PR tracking, cross-project coordination |
| `ark-observer` | Telemetry analysis, observability, anomaly detection |

## Valid Context Intents

| Intent | Description |
|--------|-------------|
| `qna` | Question and answer, understanding |
| `dev` | Development, implementation |
| `qa` | Quality assurance, testing |
| `debug` | Debugging, troubleshooting |
| `monitoring` | Observability, alerting |
| `pr_review` | Pull request review |
| `research` | Research, analysis |
| `progress_tracking` | Progress reports, status updates |

## Parent Session ID

The `parent_session_id` field is **required** for sub-agent tracking. It must contain the orchestrator's session ID, which connects sub-agents to their parent orchestrator for:

- **Logging**: Sub-agent logs are written to the parent's log file
- **State tracking**: Sub-agents are registered with their parent for lifecycle management
- **Artifact tracing**: Outputs can be traced back to the originating session

```yaml
parent_session_id: "abc123-def456-789"  # Your orchestrator session ID
```

**Important**: This is the session ID from the auto-injected Session Context, NOT a generated value.

## Session Context

The `session_context` object must contain paths from the auto-injected Session Context.

**IMPORTANT:** `artifacts_dir` MUST be phase-specific. The orchestrator sets this to the phase subdirectory so agents write all outputs (including `_result.json`) into the correct location.

```yaml
# Phase mapping: explore → artifacts/explore/, plan → artifacts/plan/, implement → artifacts/implement/
session_context:
  session_dir: "/path/to/arkadian/sessions/<session_id>"
  artifacts_dir: "/path/to/arkadian/sessions/<session_id>/artifacts/<phase>"
  specs_dir: "/path/to/arkadian/sessions/<session_id>/specs"
```

Valid phase directories: `explore`, `plan`, `implement`, `qna`, `review`, `research`, `investigate`, `progress`

## Projects Array

Each project in the `projects` array should include:

```yaml
projects:
  - id: "arkd"
    doc_source:
      arkadian_root: "${ARKADIAN_DIR}/docs"
      project_index: "${ARKADIAN_DIR}/docs/projects/arkd/INDEX.md"
      sections:
        - "system/architecture.md"
        - "system/folder_structure.md"
    repo_source:
      repo_root: "${ARKD_REPO}"
      preferred_paths:
        - "internal/core/domain"
        - "pkg/ark-lib"
    scripts_hint:
      - "make test"
      - "make build"
```

## Optional Fields

These fields provide additional context but are not strictly required:

| Field | Purpose |
|-------|---------|
| `problem_context` | Additional context about the problem |
| `repo_navigation_hint` | Hints for navigating the codebase |
| `success_criteria` | Conditions for successful completion |
| `available_artifacts` | Artifacts from previous steps |
| `assumptions` | Assumptions made by the orchestrator |
| `non_goals` | What is explicitly out of scope |
| `fallbacks` | Fallback actions if primary fails |
| `constraints` | Limitations or restrictions |
| `expected_outputs` | Expected artifacts/outputs |
| `depends_on` | Dependencies on other steps |
| `artifacts_in` | Input artifacts from previous steps (IMPORTANT - see below) |
| `artifacts_out` | Output artifacts to produce |
| `worktree_config` | Worktree isolation settings (ark-developer only) |
| `retry_context` | Retry information when re-invoking after validation failure (attempt_number, max_attempts, previous_failures) |

## Artifact Passing (CRITICAL for Multi-Step Workflows)

When steps depend on previous steps, the orchestrator MUST pass artifact paths so agents can read them:

```yaml
# S3 depends on S1 - pass S1's output artifact
artifacts_in:
  - path: "artifacts/explore/assessment.yaml"
    from_step: "S1"
    description: "Exploration findings with complexity, affected files, fix approach"

# S4 depends on S1 and S3 - pass ALL prior artifacts
artifacts_in:
  - path: "artifacts/explore/assessment.yaml"
    from_step: "S1"
    description: "Exploration findings"
  - path: "artifacts/implement/changes.yaml"
    from_step: "S3"
    description: "Implementation changes with files modified, branch, commits"
```

**Why this is critical:**
- Agents are stateless and cannot access previous agent outputs automatically
- The orchestrator must explicitly tell each agent which artifacts to read
- Without `artifacts_in`, agents lose context from previous phases
- Do NOT manually summarize artifacts in the spec - pass the path and let agents read the full file

## Resume Context (Optional)

When continuing from a previous session, include the `resume_context` field to provide context about the previous work:

```yaml
resume_context:
  parent_session_id: "<session_id of resumed session>"
  parent_session_dir: "<absolute path to previous session folder>"
  resume_reason: "<explanation of why resuming>"
  previous_iteration: <number>  # How many times this task has been attempted
```

### When to Use Resume Context

Use `resume_context` when:
- Resuming a session where tests failed and user wants to continue
- Continuing work from a previous day's session
- Re-attempting a task with learnings from previous attempt

### Artifacts from Previous Sessions

When including artifacts from a previous session (cross-session resume):
1. Use **absolute paths** (not session-relative)
2. Include the `from_session` field to distinguish from current session artifacts

```yaml
artifacts_in:
  # From previous session - absolute path + from_session field
  - path: "/Users/.../sessions/2025-12-16-.../artifacts/explore/assessment.yaml"
    from_session: "2025-12-16-fix-fulmine-expired-vtxo-settlement-bug"
    from_step: "S1"
    description: "Exploration assessment from previous attempt"

  # From current session - relative path (no from_session)
  - path: "artifacts/plan/implementation_plan.yaml"
    from_step: "S2"
    description: "Current session's plan"
```

### Agent Behavior with Resume Context

When `resume_context` is present, agents should:
1. Read ALL artifacts in `artifacts_in`, including those from previous sessions
2. Understand what was tried before and why it may have failed
3. Build upon previous work rather than starting from scratch
4. If previous implementation exists, analyze it before making changes
5. Reference previous attempts in output artifacts

## Runtime Configuration

```yaml
runtime:
  resolve_envs: true    # Resolve environment variables in paths
  allow_external: false # Allow external network access
```

## Worktree Configuration (ark-developer only)

When invoking `ark-developer` for code changes, include worktree configuration to isolate edits:

```yaml
worktree_config:
  enabled: true  # Worktrees created at ${repo_root}/.worktrees/<branch>
```

This instructs the agent to:
1. Create a new git worktree INSIDE the repo at `.worktrees/<branch>`
2. Work in the isolated worktree (not the main repo)
3. Create branch: `arkadian/{date}-{task-slug}`
4. The sub-agent guardrail ENFORCES this - writes to main repo are blocked

Set `enabled: false` only if you explicitly want changes made directly to the main repo.

## Result Manifest (`_result.json`)

Every agent MUST write a `_result.json` file as its **absolute last action**. This file is validated by the `post-agent-validator.ts` hook and determines whether the agent's work is accepted, retried, or escalated.

**Path:** `${ARTIFACTS_DIR}/_result.json`

**Universal schema:**

```json
{
  "schema_version": "1.0",
  "agent": "<agent_name>",
  "step_id": "<from execution spec>",
  "status": "success | failure | partial",
  "completed_at": "<ISO timestamp>",
  "confidence": "high | medium | low",
  "summary": "1-2 sentence summary",
  "artifacts_produced": [
    { "path": "<filename>", "type": "report | patch | spec | plan | tasks" }
  ],
  "success_criteria_met": [
    { "id": "1", "description": "...", "satisfied": true }
  ],
  "issues_encountered": [],
  "handover": { "needed": false, "to": "none", "reason": "" },
  "agent_specific": {}
}
```

The `agent_specific` field contains agent-type-specific data. See each agent's RESULT MANIFEST section for the expected fields.

**Validation outcomes:**
- `passed` — all hard gates pass, orchestrator proceeds
- `partial` — agent reported partial completion, no hard gate failures
- `failed` — one or more hard gate failures, orchestrator retries (up to 3x)
- `crash` — no `_result.json` found, orchestrator retries (up to 3x)

## Retry Context (Optional)

When the orchestrator retries an agent after validation failure, it includes `retry_context`:

```yaml
retry_context:
  attempt_number: 2
  max_attempts: 3
  previous_failures:
    - attempt: 1
      outcome: "failed"
      hard_gate_failures:
        - "tests.failed = 3 (expected 0)"
      guidance: "Fix the 3 failing tests before proceeding"
```

When `retry_context` is present, agents should:
1. Read the previous failure details
2. Focus on resolving the specific hard gate failures
3. Not start from scratch — build on previous work
4. Still write `_result.json` as last action

## Validation

The `validate-agent-input.ts` hook validates all Task tool calls against this specification before agent invocation. Validation failures block the tool call and return an error to the orchestrator.

### Validation Rules

1. **Markers Required**: Must contain `# --- BEGIN AGENT INPUT ---` and `# --- END AGENT INPUT ---`
2. **Required Fields**: All fields in the Required Fields table must be present
3. **Valid Agent**: Agent name must be one of the valid agents
4. **Valid Intent**: Context intent must be one of the valid intents
5. **Parent Session ID**: `parent_session_id` must be present and at least 8 characters
6. **Session Context**: `session_context.session_dir` must be present
7. **Step ID Format**: Should follow pattern `S1`, `S2`, `S3`, etc. (or `QA-1`, `QA-2` for ad-hoc questions)
8. **Resume Context Validation**: If `resume_context` is present, `parent_session_dir` must exist
9. **Cross-Session Artifacts**: If `artifacts_in[].from_session` is present, the path must be absolute

## Example

```yaml
# ═══════════════════════════════════════════════════════════
# EXECUTION SPECIFICATION - S1
# This YAML will be passed verbatim to: ark-guru
# ═══════════════════════════════════════════════════════════

spec_id: "abc123-S1"
generated_at: "2025-12-02T10:30:00Z"
orchestrator_version: "1.0"

# --- BEGIN AGENT INPUT ---
step_id: "S1"
agent: "ark-guru"
objective: "Explain how VTXO expiry works in the Ark protocol"
user_request: "How does VTXO expiry work?"
context_intent: "qna"
parent_session_id: "abc123"

session_context:
  session_dir: "/Users/user/code/arkadian/sessions/abc123"
  artifacts_dir: "/Users/user/code/arkadian/sessions/abc123/artifacts/qna"  # Phase-specific
  specs_dir: "/Users/user/code/arkadian/sessions/abc123/specs"

projects:
  - id: "arkd"
    doc_source:
      arkadian_root: "${ARKADIAN_DIR}/docs"
      project_index: "${ARKADIAN_DIR}/docs/projects/arkd/INDEX.md"
      sections:
        - "system/architecture.md"
        - "testing/usage.md"
    repo_source:
      repo_root: "${ARKD_REPO}"
      preferred_paths: []
    scripts_hint: []

docs_hint:
  project_index_path: "${ARKADIAN_DIR}/docs/INDEX.md"

# Reference documentation for clarifying Ark concepts
# - For protocol concepts (VTXOs, rounds, connectors, ASP): check arkd docs
# - For client-side wallet development patterns: check go-sdk docs
reference_docs:
  ark_protocol: "${ARKADIAN_DIR}/docs/projects/arkd/INDEX.md"
  wallet_client: "${ARKADIAN_DIR}/docs/projects/go-sdk/INDEX.md"

problem_context: {}
repo_navigation_hint: {}
success_criteria:
  - "User understands VTXO lifecycle"
  - "Technical accuracy verified"
available_artifacts: []
assumptions: []
non_goals: []
fallbacks: []
constraints: []
expected_outputs:
  - "Explanation in markdown format"
depends_on: []

runtime:
  resolve_envs: true
  allow_external: false

artifacts_in: []
artifacts_out: []
# --- END AGENT INPUT ---
```
