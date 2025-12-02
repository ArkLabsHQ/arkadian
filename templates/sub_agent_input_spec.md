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

artifacts_in: []
artifacts_out: []
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
| `artifacts_in` | Input artifacts from previous steps |
| `artifacts_out` | Output artifacts to produce |

## Runtime Configuration

```yaml
runtime:
  resolve_envs: true    # Resolve environment variables in paths
  allow_external: false # Allow external network access
```

## Validation

The `validate-agent-input.ts` hook validates all Task tool calls against this specification before agent invocation. Validation failures block the tool call and return an error to the orchestrator.

### Validation Rules

1. **Markers Required**: Must contain `# --- BEGIN AGENT INPUT ---` and `# --- END AGENT INPUT ---`
2. **Required Fields**: All fields in the Required Fields table must be present
3. **Valid Agent**: Agent name must be one of the valid agents
4. **Valid Intent**: Context intent must be one of the valid intents
5. **Session Context**: `session_context.session_dir` must be present
6. **Step ID Format**: Should follow pattern `S1`, `S2`, `S3`, etc.

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
