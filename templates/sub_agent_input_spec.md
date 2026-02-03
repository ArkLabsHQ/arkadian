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
  artifacts_dir: "<session_dir>/artifacts"
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

# Beads configuration (optional - only when beads enabled)
# Provides beads context to agents for task querying and status updates
beads_config:
  enabled: true  # Whether beads is enabled for this session
  storage_path: "${ARKADIAN_DIR}/.beads"  # Path to beads repository
  session_epic_id: "bd-xyz123"  # Session epic ID (null if not created yet)
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
| `ark-developer` | Code changes, fixes, implementation, tests |
| `ark-env-tester` | Environment setup, testing, validation |
| `ark-researcher` | External research, prior art, API evaluation |
| `ark-pr-reviewer` | PR/commit analysis, architecture consistency |
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

The `session_context` object must contain paths from the auto-injected Session Context:

```yaml
session_context:
  session_dir: "/path/to/arkadian/sessions/<session_id>"
  artifacts_dir: "/path/to/arkadian/sessions/<session_id>/artifacts"
  specs_dir: "/path/to/arkadian/sessions/<session_id>/specs"
```

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
| `beads_config` | Beads task management context (enabled, storage_path, session_epic_id) |

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

## Beads Configuration (Optional)

When beads task management is enabled for the session, include beads configuration:

```yaml
beads_config:
  enabled: true
  storage_path: "${ARKADIAN_DIR}/.beads"
  session_epic_id: "bd-abc123"  # Session epic ID from session state
```

This provides agents with:
- **enabled**: Whether beads is available for task querying
- **storage_path**: Location of beads repository (agents use this as cwd for bd commands)
- **session_epic_id**: Parent epic for creating feature epics and tasks

**When to include:**
- Only when `session_state.beads.enabled` is true
- Orchestrator reads session state to populate session_epic_id
- Agents use this to query ready tasks, check dependencies, update status

**When to omit:**
- If beads is not enabled (session_state.beads.enabled is false or undefined)
- For sessions created before beads integration

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
  artifacts_dir: "/Users/user/code/arkadian/sessions/abc123/artifacts"
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
