# Agent INPUT CONTRACT Analysis

**Date:** 2025-10-18
**Purpose:** Document the standardized INPUT CONTRACT that the main orchestrator (CLAUDE.md) should pass to each sub-agent.

---

## Executive Summary

All 6 specialized agents (`ark-guru`, `ark-developer`, `ark-tester`, `ark-debugger`, `ark-pr-reviewer`, `ark-researcher`) follow a consistent INPUT CONTRACT pattern with standard fields and agent-specific variations.

**Agent Status:**
- ✅ **Fully Implemented:** ark-guru, ark-developer, ark-tester, ark-pr-reviewer
- ⏸️ **V1 Stub (Planned):** ark-debugger, ark-researcher

---

## Standard INPUT CONTRACT (All Agents)

Every agent expects these core fields:

```yaml
objective: "<clear, concise task description>"
repos: ["<project_id_1>", "<project_id_2>"]
docs_hint:
  project_index_path: "${ARKADIAN_DIR}/docs/INDEX.md"
  project:
    id: "<project_id>"
    index_path: "${ARKADIAN_DIR}/docs/projects/<project_id>/INDEX.md"
  sections:
    - "<doc_file_1.md>"
    - "<doc_file_2.md>"
constraints:
  - <agent-specific constraints>
expected_outputs:
  - <agent-specific outputs>
```

---

## Agent-Specific INPUT CONTRACTs

### 1. ark-guru (Q&A Specialist) [✅ Full]

**Purpose:** Answer questions by searching documentation and code
**Tools:** Read, Grep, Glob (read-only)

**INPUT CONTRACT:**
```yaml
objective: "<one-line question>"
repos: ["arkd", "go-sdk"]
docs_hint:
  project_index_path: "${ARKADIAN_DIR}/docs/INDEX.md"
  project:
    id: "arkd"
    index_path: "${ARKADIAN_DIR}/docs/projects/arkd/INDEX.md"
  sections:
    - "system/project_overview.md"
    - "testing/usage.md"
constraints:
  - read_only: true
  - prefer_docs_over_code: true
expected_outputs:
  - answer: "concise explanation with file:line references"
  - confidence: "high|medium|low"
```

**Sections to Load (from INDEX.md):**
Use `default_sections_by_intent.qna`

---

### 2. ark-developer (Development Specialist) [✅ Full]

**Purpose:** Implement features, fix bugs, write tests
**Tools:** Read, Write, Edit, Bash, Grep, Glob

**INPUT CONTRACT:**
```yaml
objective: "<what to implement/fix>"
repos: ["arkd"]
docs_hint:
  project:
    id: "arkd"
    index_path: "${ARKADIAN_DIR}/docs/projects/arkd/INDEX.md"
  sections:
    - "sop/making-changes.md"
    - "system/architecture.md"
    - "testing/how_to_test.md"
constraints:
  - branch: "feat/<area>-<slug>" or "fix/<area>-<slug>"
  - conventional_commits: true
  - tests_required: true
  - max_files_changed: 10
expected_outputs:
  - branch_name: "<created branch>"
  - files_changed: ["list"]
  - tests_added: ["list"]
  - pr_body: "<PR description>"
```

**Sections to Load (from INDEX.md):**
Use `default_sections_by_intent.dev`

**Critical Constraints:**
- Must create feature/fix branch before any edits
- Must run tests after code changes
- Must use conventional commit messages

---

### 3. ark-tester (Testing/QA Specialist) [✅ Full]

**Purpose:** Run tests, validate changes, bring up stacks, run simulations
**Tools:** Bash, Read, Grep (no Write/Edit)

**INPUT CONTRACT:**
```yaml
objective: "<what to validate>"
repos: ["arkd"]
docs_hint:
  project:
    id: "arkd"
    index_path: "${ARKADIAN_DIR}/docs/projects/arkd/INDEX.md"
  sections:
    - "testing/how_to_test.md"
    - "testing/how_to_run.md"
    - "testing/troubleshooting.md"
constraints:
  - time_limit: "10m"
  - docker_required: true
  - no_modifications: true
expected_outputs:
  - validation_result: "pass|fail|partial"
  - test_summary: "<counts and evidence>"
  - issues_found: ["list"]
  - recommendations: ["list"]
```

**Sections to Load (from INDEX.md):**
Use `default_sections_by_intent.qa`

**Critical Constraints:**
- Read-only (no code modifications)
- Time limit: default 10 minutes (unless user approves longer)
- Must provide evidence (test counts, logs, screenshots)

---

### 4. ark-debugger (Debugging Specialist) [⏸️ Stub]

**Purpose:** Isolate faults, create reproduction cases, propose fixes
**Tools:** Bash, Read, Grep, Glob, Write (for repro scripts only)

**INPUT CONTRACT:**
```yaml
objective: "<debug issue description>"
repos: ["arkd"]
docs_hint:
  project:
    id: "arkd"
    index_path: "${ARKADIAN_DIR}/docs/projects/arkd/INDEX.md"
  sections:
    - "testing/troubleshooting.md"
    - "testing/how_to_run.md"
    - "system/integration_points.md"
context:
  error_message: "<actual error>"
  logs: ["<log snippets>"]
  steps_to_reproduce: ["<if available>"]
constraints:
  - read_mostly: true
  - create_repro_case: true
expected_outputs:
  - root_cause: "<diagnosis>"
  - reproduction_steps: ["<minimal repro>"]
  - proposed_fix: "<what to change>"
  - test_case: "<regression test>"
```

**Sections to Load (from INDEX.md):**
Use `default_sections_by_intent.debug`

**Special Fields:**
- **context.error_message:** The actual error message from the failure
- **context.logs:** Relevant log snippets showing the issue
- **context.steps_to_reproduce:** If the user provided steps

**Note:** This agent is a V1 stub. Currently, debugging tasks are handled by Developer or Tester agents.

---

### 5. ark-pr-reviewer (PR Analysis Specialist) [✅ Full]

**Purpose:** Analyze PRs and commits for quality, risks, breaking changes
**Tools:** Bash (git commands), Read, Grep (read-only)

**INPUT CONTRACT:**
```yaml
objective: "<analyze PR #123>" or "<summarize last week's commits>"
repos: ["arkd"]
docs_hint:
  project:
    id: "arkd"
    index_path: "${ARKADIAN_DIR}/docs/projects/arkd/INDEX.md"
  sections:
    - "system/architecture.md"
    - "sop/development-workflow.md"
constraints:
  - read_only: true
  - max_commits: 50
  - include_authors: true
expected_outputs:
  - summary: "<what changed>"
  - risk_assessment: "low|medium|high"
  - breaking_changes: ["list"]
  - recommendations: ["feedback items"]
```

**Sections to Load (from INDEX.md):**
Use `default_sections_by_intent.pr_review` if available, else `dev`

**Critical Constraints:**
- Read-only (no code modifications)
- Check architecture compliance (hexagonal architecture rules)
- Flag security concerns
- Identify breaking changes (proto, database, API)

---

### 6. ark-researcher (Research Specialist) [⏸️ Stub]

**Purpose:** Research technologies, compare alternatives, investigate concepts
**Tools:** Read, Grep, Glob, WebSearch, WebFetch (no Write/Edit)

**INPUT CONTRACT:**
```yaml
objective: "<research question or topic>"
repos: ["arkd", "go-sdk"]
docs_hint:
  project:
    id: "arkd"
    index_path: "${ARKADIAN_DIR}/docs/projects/arkd/INDEX.md"
  sections:
    - "system/architecture.md"
    - "system/tech_stack.md"
context:
  scope: "internal|external|both"
  question_type: "comparison|feasibility|best_practice|specification"
constraints:
  - prefer_internal_first: true
  - cite_sources: true
  - max_external_searches: 5
expected_outputs:
  - findings: "<research results>"
  - comparison_matrix: "<if applicable>"
  - recommendation: "<if asked>"
  - sources: ["<citations>"]
```

**Sections to Load (from INDEX.md):**
Use `default_sections_by_intent.research` if available, else `dev` or `qna`

**Special Fields:**
- **context.scope:** Whether to search internal docs, external resources, or both
- **context.question_type:** Type of research (comparison, feasibility, best practice, specification)

**Critical Constraints:**
- Always check internal documentation first before external research
- Cite all sources (file:line or URL)
- Provide trade-off analysis, not just recommendations

**Note:** This agent is a V1 stub. Currently, research tasks are handled by Guru or Developer agents.

---

## How Orchestrator Should Populate INPUT CONTRACT

### Step 1: Determine Intent and Select Agent

Map user request to intent and agent:

| User Intent | Agent | Intent Key |
|-------------|-------|------------|
| Ask question / Q&A | ark-guru | `qna` |
| Develop / fix bug / add feature | ark-developer | `dev` |
| Test / run / validate / simulate | ark-tester | `qa` |
| Debug / isolate fault / repro | ark-debugger | `debug` |
| Review PR / analyze commits | ark-pr-reviewer | `pr_review` |
| Research / compare / investigate | ark-researcher | `research` |

### Step 2: Load Project INDEX.md

Load `${ARKADIAN_DIR}/docs/projects/<project_id>/INDEX.md` to get:
- `default_sections_by_intent` mapping

### Step 3: Populate `sections` Field

```yaml
# Example for ark-tester with qa intent:
docs_hint:
  sections:
    - "testing/how_to_test.md"      # From default_sections_by_intent.qa
    - "testing/how_to_run.md"       # From default_sections_by_intent.qa
    - "testing/troubleshooting.md"  # From default_sections_by_intent.qa
```

### Step 4: Add Agent-Specific Fields

- For **ark-debugger:** Add `context.error_message`, `context.logs`, `context.steps_to_reproduce`
- For **ark-researcher:** Add `context.scope`, `context.question_type`
- For other agents: No additional context fields needed

### Step 5: Set Constraints

Use the agent-specific constraints from the INPUT CONTRACT templates above.

### Step 6: Define Expected Outputs

Use the agent-specific expected_outputs from the INPUT CONTRACT templates above.

---

## Example Agent Invocations

### Example 1: Ask Question (ark-guru)

```
Task(
  subagent_type="ark-guru",
  description="Explain VTXO lifecycle",
  prompt="""
objective: "Explain the VTXO lifecycle in arkd from creation to redemption"
repos: ["arkd"]
docs_hint:
  project_index_path: "${ARKADIAN_DIR}/docs/INDEX.md"
  project:
    id: "arkd"
    index_path: "${ARKADIAN_DIR}/docs/projects/arkd/INDEX.md"
  sections:
    - "system/project_overview.md"
    - "testing/usage.md"
constraints:
  - read_only: true
  - prefer_docs_over_code: true
expected_outputs:
  - answer: "concise explanation with file:line references"
  - confidence: "high|medium|low"
"""
)
```

### Example 2: Run Tests (ark-tester)

```
Task(
  subagent_type="ark-tester",
  description="Run arkd integration tests",
  prompt="""
objective: "Run integration tests for arkd and report results with evidence"
repos: ["arkd"]
docs_hint:
  project:
    id: "arkd"
    index_path: "${ARKADIAN_DIR}/docs/projects/arkd/INDEX.md"
  sections:
    - "testing/how_to_test.md"
    - "testing/how_to_run.md"
    - "testing/troubleshooting.md"
constraints:
  - time_limit: "10m"
  - docker_required: true
  - no_modifications: true
expected_outputs:
  - validation_result: "pass|fail|partial"
  - test_summary: "counts and evidence"
  - issues_found: ["list"]
  - recommendations: ["list"]
"""
)
```

### Example 3: Implement Feature (ark-developer)

```
Task(
  subagent_type="ark-developer",
  description="Add VTXO filtering API",
  prompt="""
objective: "Add gRPC endpoint for filtering VTXOs by status and owner"
repos: ["arkd"]
docs_hint:
  project:
    id: "arkd"
    index_path: "${ARKADIAN_DIR}/docs/projects/arkd/INDEX.md"
  sections:
    - "sop/making-changes.md"
    - "system/architecture.md"
    - "testing/how_to_test.md"
    - "system/folder_structure.md"
constraints:
  - branch: "feat/vtxo-filter-api"
  - conventional_commits: true
  - tests_required: true
  - max_files_changed: 10
expected_outputs:
  - branch_name: "created branch"
  - files_changed: ["list"]
  - tests_added: ["list"]
  - pr_body: "PR description"
"""
)
```

### Example 4: Debug Issue (ark-debugger) [STUB]

```
Task(
  subagent_type="ark-debugger",
  description="Debug round finalization stuck",
  prompt="""
objective: "Debug why rounds are stuck in Registration stage"
repos: ["arkd"]
docs_hint:
  project:
    id: "arkd"
    index_path: "${ARKADIAN_DIR}/docs/projects/arkd/INDEX.md"
  sections:
    - "testing/troubleshooting.md"
    - "testing/how_to_run.md"
    - "system/integration_points.md"
context:
  error_message: "Round 123 stuck in Registration for 10 minutes"
  logs:
    - "scheduler: waiting for block event"
    - "round_service: no new registrations for round 123"
  steps_to_reproduce:
    - "Start arkd with ARKD_SCHEDULER_TYPE=block"
    - "Stop Bitcoin block production"
    - "Register payment intent"
    - "Observe round never finalizes"
constraints:
  - read_mostly: true
  - create_repro_case: true
expected_outputs:
  - root_cause: "diagnosis"
  - reproduction_steps: ["minimal repro"]
  - proposed_fix: "what to change"
  - test_case: "regression test"
"""
)
```

---

## Changes Made to CLAUDE.md

**File:** `/Users/dusansekulic/code/go/arkadian/CLAUDE.md`

**Section Updated:** `## SUB-AGENT ROLES`

**Changes:**
1. Added agent status indicators (✅ Full / ⏸️ Stub)
2. Added comprehensive `### Agent INPUT CONTRACT Guide` subsection with:
   - Standard fields explanation
   - How to populate `sections` from `default_sections_by_intent`
   - Complete INPUT CONTRACT templates for all 6 agents
   - Special notes for agents with additional `context` fields (ark-debugger, ark-researcher)

**Why:**
- Provides clear, copy-paste-ready INPUT CONTRACT templates for orchestrator
- Ensures consistency across all agent invocations
- Documents which agents are fully implemented vs stubs
- Explains how to dynamically load documentation sections based on intent

---

## Summary

The orchestrator (CLAUDE.md) now has comprehensive guidance on:

1. **What information to pass** to each sub-agent
2. **How to populate** the `sections` field dynamically from project INDEX.md files
3. **Which agents are ready** to use (4 fully implemented, 2 stubs)
4. **Special context fields** needed for debugging and research tasks

This standardization ensures:
- ✅ Consistent agent invocations across all tasks
- ✅ Agents receive exactly the context they need
- ✅ Documentation loading is intent-driven and efficient
- ✅ Clear separation between orchestrator planning and agent execution
