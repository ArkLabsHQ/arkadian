# Arkadian Deep Dive

> Companion document to the Arkadian team presentation.
> Share this on Slack alongside the HTML/PDF export for those who want the full picture.

---

## Table of Contents

1. [What Is Arkadian?](#what-is-arkadian)
2. [Problem 1: The Multi-Repo Reality](#problem-1-the-multi-repo-reality)
3. [Problem 2: Context Engineering](#problem-2-context-engineering)
4. [Problem 3: AI Doesn't Follow Workflows](#problem-3-ai-doesnt-follow-workflows)
5. [The Four-Phase Pipeline](#the-four-phase-pipeline)
6. [Hook Architecture](#hook-architecture)
7. [Agent Tool Matrix](#agent-tool-matrix)
8. [Complete Skill List](#complete-skill-list)
9. [Workflow Templates](#workflow-templates)
10. [Execution Specification Format](#execution-specification-format)
11. [Session Storage & Resume](#session-storage--resume)
12. [Detached Mode](#detached-mode)
13. [Project Registry](#project-registry)
14. [Commands & Slash Commands](#commands--slash-commands)
15. [FAQ](#faq)

---

## What Is Arkadian?

Arkadian is a **Claude Code plugin** that turns Claude into a multi-agent AI orchestrator for the Ark protocol ecosystem. It wraps Claude Code with:

- A **1,620-line behavioral specification** (`ORCHESTRATOR.md`) loaded into the system prompt
- **11 TypeScript hooks** (~4,730 LOC) that enforce pipeline integrity at the OS level
- **8 specialist agents** with fixed tool allowlists and path restrictions
- **33 domain skills** covering Bitcoin primitives, Ark protocol, SDK patterns, and more
- **20 registered projects** with machine-readable metadata for automatic routing
- **12 workflow templates** for different task types
- **13 slash commands** for project management and specification workflows

### Two Operating Modes

| | Orchestrator Mode | Development Mode |
|---|---|---|
| **Command** | `arkadian "task"` | `claude` (in arkadian dir) |
| **System prompt** | ORCHESTRATOR.md | CLAUDE.md |
| **Tool access** | Restricted (no Bash, no code repos) | Full access |
| **Guardrails** | Hook-enforced pipeline | None |
| **Use case** | Team workflow on Ark projects | Developing Arkadian itself |

---

## Problem 1: The Multi-Repo Reality

### 20 Repositories, 5 Languages, 1 Protocol

Our ecosystem isn't one repo. It's 20 interconnected projects spanning Go, TypeScript, Rust, C#, and configuration languages:

```
arkd (core server)                    Go
├── go-sdk, ts-sdk, rust-sdk,        Go, TS, Rust, C#
│   dotnet-sdk (4 client SDKs)
├── wallet (PWA)                      TypeScript/React
├── fulmine (Lightning wallet)        Go
├── ark-faucet, ark-simulator         Go
├── arkade-escrow                     TypeScript/NestJS
├── arkade-explorer                   TypeScript/React
├── arkade-assets (asset protocol)    TypeScript
├── compiler + introspector           Rust + Go
├── boltz-backend, boltz-swap         TypeScript/Rust
├── ark-telemetry, ark-infra          YAML/HCL
└── ark-docs                          MDX
```

A single feature can touch 3-5 repos. For example, Lightning swap integration touches `fulmine` + `boltz-backend` + `boltz-swap` + `wallet` + `ts-sdk`.

### The Documentation Registry: A Map of Everything

We built `docs/INDEX.md` — a machine-readable map of the entire ecosystem. Each project entry contains:

| Field | Purpose |
|-------|---------|
| `ID` | Unique identifier for routing |
| `Type` | Core Infrastructure, Client Library, Service, etc. |
| `Language` | Primary language(s) |
| `Tags` | Keywords for fuzzy matching |
| `Synonyms` | Alternative names people might use |
| `Triggers` | Intent-specific keywords (per intent type) |
| `Capabilities` | What the project can do |
| `Dependencies` | What it depends on |
| `Depended On By` | What depends on it |

Each project also has a per-project `INDEX.md` with architecture docs, folder structure, testing guides, default doc sections per intent type, and available scripts.

**The registry is the foundation everything else builds on.** When you say "fix the swap in fulmine," the orchestrator scores every project against your words and picks the right ones automatically.

### Project Selection Algorithm

```
score = 0.35 x intent_match        (does the intent align with project triggers?)
      + 0.25 x tag_synonym_overlap  (do keywords match project tags?)
      + 0.20 x trigger_overlap      (do action words match project triggers?)
      + 0.10 x capability_match     (can the project do what's being asked?)
      + 0.40 x user_explicit        (did the user name this project? 1.0 or 0.0)
```

Top-N projects selected based on intent. Dependencies auto-included. Hard cap: 5 projects.

---

## Problem 2: Context Engineering

### What Is Context Engineering?

From Anthropic's ["Effective Context Engineering for AI Agents"](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents):

> *"The art of curating all tokens available to an LLM — system instructions, tools, external data, message history — to maximize the likelihood of a desired outcome."*

It's not just prompt engineering. It's about **what information enters the model's limited attention budget at each step.** Every token depletes a finite resource. More context doesn't mean better results — it means more noise.

### The Problem: Context Windows Fill Up

A single exploration of `arkd` can read 10+ files. By the time you get to implementation, the model has forgotten the plan. The system prompt alone (`ORCHESTRATOR.md`) is 1,620 lines. Add conversation history, tool results from previous steps, and code files — the room left for actual thinking shrinks rapidly.

### Our Solution: Sub-Agents With Isolated Context

Each agent gets a **clean context window** focused on its task:

```
  ORCHESTRATOR (parent)
    Context: workflow state, project registry,
             approval history, artifact paths

    Spawns:
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ ark-guru │ │ ark-pm   │ │ ark-dev  │
    │          │ │          │ │          │
    │ Context: │ │ Context: │ │ Context: │
    │ code +   │ │ spec +   │ │ plan +   │
    │ docs +   │ │ assess-  │ │ tasks +  │
    │ patterns │ │ ment     │ │ code     │
    │          │ │          │ │          │
    │ Returns: │ │ Returns: │ │ Returns: │
    │ assess-  │ │ spec +   │ │ code +   │
    │ ment.yaml│ │ plan +   │ │ tests +  │
    │ (compact)│ │ tasks    │ │ report   │
    └──────────┘ └──────────┘ └──────────┘
```

Sub-agents explore **extensively** but return **condensed summaries** (structured YAML artifacts). The orchestrator stays lean — it synthesizes, never reads code directly.

### Tiered Context Loading

Not everything gets loaded at once. Context flows in 4 strict tiers:

| Tier | Who Loads | What | When |
|------|-----------|------|------|
| **1** | Orchestrator | Master `INDEX.md` (project registry) | Always, first action |
| **2** | Orchestrator | Per-project `INDEX.md` | After project selection |
| **3** | Agents | Doc sections (architecture, testing) | Via execution spec |
| **4** | Agents | Actual code files | As needed during task |

**Key insight:** The orchestrator **never reads code**. Only agents do. This keeps the orchestrator's context clean for workflow decisions.

### Artifacts: The Handoff Protocol

Since agents are **stateless** (they don't remember previous phases), artifacts are how context flows between steps:

```
artifacts/explore/
  assessment.yaml          <- complexity, affected files, risks
  _result.json             <- machine-readable phase completion

specs/fulmine/001-feature/
  spec.md                  <- requirements, user stories
  plan.md                  <- architecture decisions, approach
  tasks.md                 <- dependency-ordered breakdown
  _result.json             <- phase completion proof

artifacts/implement/
  detailed_report.md       <- what was built and why
  test-evidence.md         <- test commands + raw output
  changes.yaml             <- branch, commits, files changed
  _result.json             <- phase completion proof
```

Every `_result.json` is validated by post-agent hooks. Missing artifacts = **hard gate failure** = retry or escalate.

---

## Problem 3: AI Doesn't Follow Workflows

### The Discipline Problem

Ask an LLM to follow a 4-step process. What actually happens:

```
Intended:   explore -> plan -> implement -> test -> review

Reality:    "Let me just quickly fix this..."
            *skips exploration*
            *skips planning*
            *writes code on main branch*
            *forgets to test*
            "Done!"
```

LLMs are **eager to help** and **terrible at self-discipline**. They optimize for appearing helpful, not for following process. Telling the model "always follow the pipeline" in the prompt is not enough. It will comply 80% of the time. The other 20% is where bugs ship.

### Solution: OS-Level Hook Enforcement

We don't ask. We **enforce**. Hooks intercept every tool call at the OS level:

```
  Claude wants to call Task(ark-developer, ...)
                      |
            ┌─────────┴──────────┐
            │  PreToolUse hooks   │  <-- TypeScript, runs via Bun
            │  (11 files, ~4,730  │      exit 0 = allow
            │   lines of code)    │      exit 2 = BLOCK
            └─────────┬──────────┘
                      |
            Does assessment.yaml exist?
            Does specs/ have plan.md?
            Is workflow.yaml created?
                      |
                 ┌────┴────┐
                 |         |
               YES        NO
                 |         |
            agent runs  BLOCKED
                        "Missing: artifacts/explore/
                         assessment.yaml"
```

**The LLM literally cannot skip a phase.** It's enforced at the OS level, not in the prompt. The hooks run *outside* the model's control.

### Real Error When Skipping Steps

This is from `pre-agent-validator.ts` — a **real error**, not a warning:

```
PIPELINE PREREQUISITE FAILURE

  - ark-developer requires guru exploration first.
    Missing: artifacts/explore/assessment.yaml.
    Invoke ark-guru with context_intent: dev before
    ark-developer.

  - Planning phase required but no PM specs found
    for fulmine.
    Mandatory pipeline: ark-guru -> ark-project-manager
    -> ark-developer.

The mandatory pipeline is:
  ark-guru (explore) -> ark-project-manager (plan)
  -> ark-developer (implement).
Each phase must complete and produce its artifacts
before the next can start.
```

---

## The Four-Phase Pipeline

### Overview (development_unified.yaml v5.0.0)

All development tasks follow the same mandatory pipeline — no conditional skipping:

```
Phase 1: EXPLORE (ark-guru)
  -> Produces: artifacts/explore/assessment.yaml
  -> Hook enforced: HG-PIPE-GURU-01

Phase 2: PLAN (ark-project-manager)
  -> Receives: S1 assessment
  -> Produces: specs/{project}/{feature}/spec.md, plan.md, tasks.md
  -> Hook enforced: Pre-agent blocks without assessment.yaml

Phase 3: IMPLEMENT + TEST (ark-developer)
  -> Receives: S1 assessment + S2 spec/plan/tasks
  -> Produces: artifacts/implement/detailed_report.md, test-evidence.md, changes.yaml
  -> Hook enforced: Pre-agent blocks without assessment.yaml + specs/
  -> Auto-retry: up to 3 attempts

Phase 4: REVIEW (ark-pr-reviewer)
  -> Receives: ALL prior artifacts
  -> Produces: artifacts/review/review_report.md, _result.json
  -> Recommendation: approve / request_changes / reject
```

### Artifact Chain

Each phase feeds into the next. Crucially, later phases get ALL prior artifacts, not just the immediate predecessor:

| Phase | Receives | Produces |
|-------|----------|----------|
| S1 (explore) | nothing | assessment.yaml |
| S2 (plan) | S1 assessment | spec.md, plan.md, tasks.md |
| S3 (implement) | S1 assessment + S2 spec/plan/tasks | code, tests, report, changes.yaml |
| S4 (review) | S1 + S2 + S3 (complete picture) | review report, approve/reject |

### 3 Approval Gates

The orchestrator operates in strict approval-gated mode:

1. **Gate 1: Plan Approval** — Full plan presented, user must type "APPROVED"
2. **Gate 2: Execution Spec Approval** — Complete YAML spec shown before each agent invocation
3. **Gate 3: Subsequent Call Verification** — Every step after the first gets its own approval

**"APPROVED ALL"** skips remaining gates (opt-in convenience).

### Assessment Schema

The guru's `assessment.yaml` is a structured report:

```yaml
confidence: 0.85
rationale: "Analyzed fulmine gRPC service layer..."

input_critical_analysis:
  scope_verified: true
  files_checked: [...]
  assumptions_challenged: [...]

affected_scope:
  files_estimated: 4
  files_identified:
    - path: "internal/core/application/service.go"
      change_type: "modified"
      reason: "Add GetSwapEvents method"
  components: ["gRPC service", "application layer"]

testing_recommendation:
  strategy: "integration_tests"
  infra_required: true
  infra_complexity: "light"

risks:
  - "gRPC streaming requires careful error handling"
  - "May need database migration for event storage"
```

### Retry & Failure Recovery

When an agent fails, post-agent validation catches it with structured hard gate codes:

```
================================================================
AGENT_VALIDATION: ark-developer (S3)
OUTCOME: failed
RETRY_ELIGIBLE: true (attempt 1 of 3)

HARD GATE FAILURES (2):
  [HG-IMPL-DEV-01] Missing detailed_report.md
  [HG-IMPL-DEV-03] Missing changes.yaml

RETRY GUIDANCE:
  Complete implementation and produce all 3 required
  artifacts before exiting.
================================================================
```

- Up to **3 retries** with structured feedback from the hook
- Retry context injected into next attempt (agent knows what failed)
- After 3 failures: **escalate to human** (never auto-retry forever)
- `_result.json` tracks attempt count for resume awareness

---

## Hook Architecture

### Hook Files (11 total, ~4,730 LOC)

| Hook | Event | File | Purpose |
|------|-------|------|---------|
| Orchestrator Guardrail | PreToolUse | `orchestrator-guardrail.ts` | Block orchestrator from accessing repos, restrict tools |
| Pre-Agent Validator | PreToolUse | `pre-agent-validator.ts` | Validate execution specs, check pipeline prerequisites |
| Sub-Agent Guardrail | PreToolUse | `subagent-guardrail.ts` | Enforce per-agent tool/path restrictions, worktree mode |
| User Submit Reminder | UserPromptSubmit | `user-submit-reminder.ts` | Inject compliance reminder into orchestrator context |
| Session Start | SessionStart | `session-start-hook.ts` | Create session folder, state file, handle resume mode |
| Session Stop | SessionEnd | `session-stop-hook.ts` | Cleanup, summarization |
| Post-Agent Validator | PostToolUse | `post-agent-validator.ts` | Validate agent outputs, check hard gates |
| Orchestrator Reminder | (helper) | `orchestrator-reminder.ts` | Generate reminder messages for blocked tools |
| Validation Contracts | (helper) | `validation-contracts.ts` | Shared validation types and contracts |
| Env Check | PreToolUse | `arkadian-env-check-hook.js` | Verify environment variables |
| Session Summarize | (worker) | `session-summarize-worker.ts` | Background session summarization |

### Hook Flow for a Typical Agent Invocation

```
Orchestrator calls Task(ark-developer, spec)
    |
    |-> orchestrator-guardrail.ts
    |   |-- Is this an orchestrator call? Yes
    |   |-- Tool = Task? Yes -> validate subagent_type
    |   |-- ark-developer in ALLOWED_SUBAGENT_TYPES? Yes
    |   |-- exit 0 (ALLOW)
    |
    |-> pre-agent-validator.ts
    |   |-- Extract YAML from prompt (BEGIN/END markers)
    |   |-- Validate required fields (step_id, agent, objective, ...)
    |   |-- Validate parent_session_id matches session
    |   |-- Check workflow.yaml exists
    |   |-- PIPELINE CHECK: assessment.yaml exists? (BLOCKS if not)
    |   |-- PIPELINE CHECK: specs/ non-empty? (BLOCKS if not)
    |   |-- Set active_agent in state file
    |   |-- Compute allowed_paths and blocked_paths
    |   |-- Save spec to sessions/{id}/specs/S3.yaml
    |   |-- exit 0 (ALLOW)
    |
    v
Agent (ark-developer) starts executing
    |
    |-> subagent-guardrail.ts (on EVERY tool call)
    |   |-- Read active_agent from state file
    |   |-- Tool in allowed_tools? (BLOCKS if not)
    |   |-- Path in allowed_paths? (BLOCKS if not)
    |   |-- WORKTREE CHECK: Write to main repo? (BLOCKS)
    |   |-- WORKTREE CHECK: Write to .worktrees/? (ALLOWS)
    |   |-- exit 0 or 2
    |
    v
Agent completes
    |
    |-> post-agent-validator.ts
    |   |-- Check expected_outputs exist
    |   |-- Validate _result.json format
    |   |-- Check hard gates (HG-IMPL-DEV-01, etc.)
    |   |-- Determine outcome: passed/partial/failed/crash
    |   |-- Output structured validation to stderr
    |
    v
Orchestrator reads validation, proceeds or retries
```

### Exit Code Convention

| Exit Code | Meaning | Hook Action |
|-----------|---------|-------------|
| 0 | Allow | Tool call proceeds normally |
| 2 | Block | Tool call rejected, error shown to caller |

### Pre-Agent Validation Rules (Pipeline Enforcement)

| Agent Being Invoked | Required Prerequisites |
|---------------------|----------------------|
| ark-project-manager (dev intent) | `artifacts/explore/assessment.yaml` must exist |
| ark-developer (dev intent) | `artifacts/explore/assessment.yaml` must exist AND `specs/{project}/` must contain spec.md, plan.md, tasks.md |

If prerequisites are missing, the hook returns exit code 2 and outputs the pipeline error message.

---

## Agent Tool Matrix

Each agent has a fixed set of allowed tools, enforced by `pre-agent-validator.ts`:

| Tool | ark-guru | ark-pm | ark-dev | ark-pr | ark-obs | ark-res | ark-prog | search |
|------|:--------:|:------:|:-------:|:------:|:-------:|:-------:|:--------:|:------:|
| Read | Y | Y | Y | Y | Y | Y | Y | - |
| Write | Y | Y | Y | Y | Y | Y | Y | - |
| Edit | - | Y | Y | - | - | - | - | - |
| MultiEdit | - | - | Y | - | - | - | - | - |
| Glob | Y | Y | Y | Y | Y | - | Y | - |
| Grep | Y | Y | Y | Y | Y | - | Y | - |
| Bash | - | - | Y | Y | Y | - | Y | - |
| Task | - | - | Y | - | - | Y | - | - |
| WebFetch | Y | Y | - | Y | Y | Y | Y | Y |
| WebSearch | Y | Y | - | - | - | Y | - | Y |
| TodoWrite | Y | Y | Y | Y | Y | Y | Y | Y |
| AskUserQuestion | - | Y | - | - | - | - | - | - |
| Skill | - | Y | - | - | - | - | - | - |

**Key restrictions:**
- **ark-guru** cannot run Bash — it explores and analyzes, never executes
- **ark-developer** cannot use WebSearch — it implements, doesn't research
- **ark-project-manager** is the only agent with AskUserQuestion and Skill tools
- The **orchestrator** itself is the most restricted: only Task, Read, Write, Edit, Glob, Grep, TodoWrite, AskUserQuestion — and path-restricted to `${ARKADIAN_DIR}` only

### Path Restrictions

Beyond tool allowlists, agents have path-based restrictions:

| Context | Allowed Paths | Blocked Paths (WRITE) |
|---------|---------------|----------------------|
| Orchestrator | `${ARKADIAN_DIR}/*` only | All project repos |
| ark-guru | Session dir, `${ARKADIAN_DIR}/docs`, project repos (READ) | N/A (no write tools) |
| ark-developer (worktree) | Session dir, docs, repo (READ), worktree (READ+WRITE) | Main repo (WRITE blocked) |
| ark-developer (direct) | Session dir, docs, repo (READ+WRITE) | None |

### Worktree Isolation

All code changes from `ark-developer` go to `.worktrees/<branch>` inside the repo — **never the main branch**. The `subagent-guardrail.ts` hook blocks writes to main repo paths when worktree mode is enabled.

Branch naming convention: `{task-slug}`

---

## Complete Skill List

### Protocol & Bitcoin (3 skills)

| Skill | Description |
|-------|-------------|
| `ark-bitcoin-primitives` | Core Bitcoin/Taproot knowledge — scripts, closures, PSBTs, Schnorr signatures |
| `ark-musig2-signing` | MuSig2 distributed signing — nonce generation, aggregation, partial signatures |
| `ark-vtxo-model` | VTXO lifecycle, domain model, states, expiration, tree construction |

### SDK Client (4 skills)

| Skill | Description |
|-------|-------------|
| `ark-sdk-client-init` | Client initialization — client types, wallet types, stores, connection setup |
| `ark-sdk-payments` | Off-chain payments — SendOffChain, coin selection, receivers, change handling |
| `ark-sdk-settlement` | Settlement and exits — Settle, CollaborativeExit, Unroll, fee estimation |
| `ark-sdk-batch-session` | Batch session events — joining rounds, signing trees, processing events |

### Arkd Server (4 skills)

| Skill | Description |
|-------|-------------|
| `arkd-round-lifecycle` | Round lifecycle management — stages, events, state machine, finalization |
| `arkd-tree-construction` | VTXO and connector trees — building batch outputs, forfeit transactions |
| `arkd-offchain-tx` | Off-chain transaction processing — Ark TX and checkpoint TX construction |
| `arkd-grpc-api` | gRPC API and protobuf — service endpoints, message types, streaming |

### Fulmine (6 skills)

| Skill | Description |
|-------|-------------|
| `fulmine-dev-loop` | Fast iteration loop — Docker stack, local fulmine, e2e testing |
| `fulmine-vhtlc` | Virtual HTLC operations for Ark-Lightning bridge |
| `fulmine-submarine-swap` | Onchain to Lightning swap implementation |
| `fulmine-reverse-swap` | Lightning to onchain reverse swaps |
| `fulmine-chain-swap` | Chain-to-chain swap operations |
| `fulmine-batch-settlement` | Batch settlement for swap operations |

### Project Management (7 skills)

| Skill | Description |
|-------|-------------|
| `pm-spec` | Create feature specifications from natural language |
| `pm-plan` | Generate implementation plans with architecture decisions |
| `pm-tasks` | Break down into dependency-ordered task lists |
| `pm-analyze` | Cross-artifact consistency and quality analysis |
| `pm-clarify` | Identify underspecified areas, ask targeted questions |
| `pm-checklist` | Generate custom quality checklists |
| `pm-constitution` | Create/update project principles and guidelines |

### DevOps & Testing (5 skills)

| Skill | Description |
|-------|-------------|
| `arkd-dev-loop` | Fast arkd iteration — Docker deps, local server, single e2e tests |
| `ark-ops` | Operational hub — routes to ark-developer for env/testing/debugging |
| `ark-testing-patterns` | Testing patterns and conventions across Ark projects |
| `ark-repository-patterns` | Repository structure and conventions |
| `ark-wallet-dev` | Wallet development patterns and utilities |

### Research & Meta (3 skills)

| Skill | Description |
|-------|-------------|
| `bitcoin-l2-research` | Bitcoin/L2 research with parallel Claude agents (Quick/Standard/Deep) |
| `browser-testing` | Browser automation and visual testing with Playwright MCP |
| `ark-progress-tracking` | Progress tracking across 20 Ark projects for stakeholder visibility |

### Implementation (1 skill)

| Skill | Description |
|-------|-------------|
| `dev-implement` | RESTRICTED to ark-developer. Execute implementation plan, process all tasks |

---

## Workflow Templates

12 templates in `templates/workflows/`:

| Template | Intent | Phases | Description |
|----------|--------|--------|-------------|
| `development_unified.yaml` | develop | explore -> plan -> implement -> review | Main dev pipeline. v5.0.0. All phases always execute. |
| `quick_question.yaml` | ask_question | guru only | Single-agent Q&A for simple questions |
| `multi_project_investigation.yaml` | ask_question (multi) | guru (parallel) | Cross-project analysis |
| `debug_and_fix.yaml` | debug | explore -> implement | Debug workflow without formal planning |
| `pr_review_comprehensive.yaml` | analyze_pr | pr-reviewer | PR analysis and code review |
| `stack_bootstrap.yaml` | test_or_run | developer | Environment setup and stack bootstrapping |
| `docs_website_research.yaml` | research (docs) | researcher | Documentation scraping and analysis |
| `github_project_research.yaml` | research (github) | researcher | GitHub project analysis |
| `monitoring_on_existing_service.yaml` | monitor_or_alert | observer | Service health monitoring |
| `performance_optimization.yaml` | performance | explore -> implement | Performance analysis and optimization |
| `greenfield_on_ark.yaml` | greenfield | investigate -> develop | New project on Ark protocol |
| `ad_hoc_minimal.yaml` | fallback | 2-5 steps | Minimal template for uncategorized tasks |

### Intent Classification

The orchestrator classifies every user request into one intent using the registry:

| Intent | Example | Workflow |
|--------|---------|----------|
| `ask_question` | "How does round finalization work?" | quick_question or multi_project_investigation |
| `develop` | "Add GetSwapEvents RPC to fulmine" | development_unified |
| `debug` | "Fix the VTXO expiry bug" | debug_and_fix |
| `analyze_pr_or_commits` | "Review PR #42 on arkd" | pr_review_comprehensive |
| `progress_tracking` | "What shipped this week?" | ark-progress-tracker agent |
| `research` | "Compare Ark to Lightning" | docs/github research |
| `monitor_or_alert` | "Check arkd metrics" | monitoring_on_existing_service |
| `test_or_run` | "Start the local dev stack" | stack_bootstrap |
| `performance_analysis` | "Why is round settlement slow?" | performance_optimization |
| `greenfield` | "Build a new escrow service on Ark" | greenfield_on_ark |

---

## Execution Specification Format

Every agent invocation requires a validated execution specification in YAML format:

```yaml
# --- BEGIN AGENT INPUT ---
step_id: "S3"
agent: "ark-developer"
objective: "Implement GetSwapEvents streaming RPC endpoint"
user_request: "Add event streaming to fulmine"
context_intent: "dev"
parent_session_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

session_context:
  session_dir: "${ARKADIAN_DIR}/sessions/a1b2c3d4-..."
  artifacts_dir: "${ARKADIAN_DIR}/sessions/a1b2c3d4-.../artifacts/implement"
  specs_dir: "${ARKADIAN_DIR}/sessions/a1b2c3d4-.../specs"

projects:
  - id: "fulmine"
    doc_source:
      arkadian_root: "${ARKADIAN_DIR}/docs"
      project_index: "${ARKADIAN_DIR}/docs/projects/fulmine/INDEX.md"
      sections:
        - "system/architecture.md"
        - "testing/how_to_test.md"
    repo_source:
      repo_root: "${FULMINE_REPO}"
      preferred_paths:
        - "internal/core/application/service.go"

artifacts_in:
  - path: "artifacts/explore/assessment.yaml"
    from_step: "S1"
    description: "Guru exploration findings"
  - path: "specs/fulmine/001-getswapevents/spec.md"
    from_step: "S2"
    description: "Feature specification"
  - path: "specs/fulmine/001-getswapevents/plan.md"
    from_step: "S2"
    description: "Implementation plan"
  - path: "specs/fulmine/001-getswapevents/tasks.md"
    from_step: "S2"
    description: "Task breakdown"

expected_outputs:
  - path: "artifacts/implement/detailed_report.md"
    description: "Implementation details"
  - path: "artifacts/implement/test-evidence.md"
    description: "Test commands and output"
  - path: "artifacts/implement/changes.yaml"
    description: "Changes summary"

worktree_config:
  enabled: true

depends_on: ["S2"]
# --- END AGENT INPUT ---
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `step_id` | string | Phase identifier (S1, S2, S3, QA-1, etc.) |
| `agent` | string | Agent name (must be in ARKADIAN_AGENTS list) |
| `objective` | string | 1-2 sentences describing the task |
| `user_request` | string | Original user request |
| `context_intent` | string | One of: qna, dev, qa, debug, monitoring, pr_review, research |
| `parent_session_id` | string | Must match current session ID |
| `session_context` | object | Session directory paths |
| `projects` | array | Projects with doc_source and repo_source |

### Validation

`pre-agent-validator.ts` validates every field before allowing the agent to start. Invalid specs are rejected with exit code 2 and a detailed error message.

---

## Session Storage & Resume

### Session Structure

Every task creates a named, traceable session:

```
sessions/fulmine/
  2026-02-16-implement-getswapevents-streaming-grpc-rpc/
  |-- metadata.json           # who, when, what
  |-- workflow.yaml            # approved plan (YAML)
  |-- specs/
  |   |-- S1.yaml              # exploration spec
  |   |-- S2.yaml              # planning spec
  |   |-- S3.yaml              # implementation spec
  |   |-- fulmine/001-feature/
  |       |-- spec.md plan.md tasks.md
  |       |-- _result.json
  |-- artifacts/
      |-- explore/   assessment.yaml  _result.json
      |-- implement/ detailed_report.md  test-evidence.md
                     changes.yaml  _result.json
```

Sessions are **named after completion** (UUID -> friendly name). Browse, diff, or resume any session at any time.

### How Resume Works

1. User runs `arkadian --resume <session_id>`
2. Script validates session exists and has `workflow.yaml`
3. Script checks `_result.json` files to show phase completion status
4. Script sets environment variables:
   - `ARKADIAN_RESUME_SESSION_DIR` -> path to old session
   - `ARKADIAN_RESUME_SESSION` -> session name
5. Claude starts a fresh session
6. `session-start-hook.ts` detects resume mode:
   - Creates new session directory
   - Copies all files from old session to new session
   - Updates `workflow_id` references
7. Orchestrator reads `workflow.yaml` to determine pipeline
8. Orchestrator checks each phase's `_result.json` for completion
9. First incomplete phase is identified as resume point
10. Orchestrator creates/loads execution spec and presents for approval

### Resume by Friendly Name

Sessions get renamed after completion. The script searches for sessions by:

1. Direct directory name match
2. Prefix match in nested project directories
3. UUID match in `workflow.yaml` files (via `workflow_id` field)

### Phase Completion Detection

| Phase | Location of _result.json |
|-------|-------------------------|
| explore | `artifacts/explore/_result.json` |
| plan | `specs/{project}/{feature}/_result.json` |
| implement | `artifacts/implement/_result.json` |
| review | `artifacts/review/_result.json` |

---

## Detached Mode

### What It Does

Runs the entire pipeline without human interaction. All approval gates are auto-approved.

```bash
arkadian -d "Add GetRoundMetrics RPC endpoint to arkd"
```

### How It Works

1. Sets `ARKADIAN_DETACHED=1` environment variable
2. Injects a "Detached Mode" prompt that overrides approval gates
3. Launches Claude with `--dangerously-skip-permissions` and `-p` (pipe mode)
4. Captures all output to `sessions/{id}/output.log`
5. The orchestrator auto-approves plans and specs
6. Agent decisions are auto-resolved using agent's stated preference
7. All artifacts are still produced identically to interactive mode
8. Hook enforcement remains active (worktree, pipeline, etc.)
9. Up to 3 retries on agent failure

### Monitoring Detached Sessions

```bash
# List active sessions
arkadian status

# Detailed status for a session
arkadian status <session_id>

# Follow live output
arkadian logs <session_id>
```

### Combining Resume + Detached

```bash
# Resume a failed session and let it run to completion
arkadian --resume 2026-02-16-implement-getswapevents -d
```

---

## Project Registry

### 20 Registered Projects

| ID | Type | Language | Description |
|----|------|----------|-------------|
| `arkd` | Core Infrastructure | Go | Ark protocol server — VTXOs, rounds, settlement |
| `go-sdk` | Client Library | Go | Go SDK for building Ark wallets |
| `ts-sdk` | Client Library | TypeScript | TypeScript SDK (@arkade-os/sdk) for browser/Node/React Native |
| `rust-sdk` | Client Library | Rust | Rust crates (ark-rs) for Ark wallets, WASM-compatible |
| `dotnet-sdk` | Client Library | C# / .NET 8+ | NArk — .NET SDK with EF Core storage, Aspire E2E |
| `wallet` | End-User App | TypeScript/React | Self-custodial PWA wallet |
| `fulmine` | Wallet Service | Go | Bitcoin wallet with Lightning swaps via Boltz |
| `ark-faucet` | Service | Go | Testnet coin distribution |
| `ark-simulator` | Testing Tool | Go | Load testing and simulation |
| `arkade-escrow` | Application | TypeScript/NestJS | 3-party escrow with Virtual Escrow Contracts |
| `arkade-explorer` | Web App | TypeScript/React | Blockchain explorer with VTXO tracking |
| `arkade-assets` | Protocol Spec | TypeScript | UTXO-native asset system with teleport transfers |
| `compiler` | Tool/Compiler | Rust | Arkade Script compiler (.ark -> Taproot ASM) |
| `introspector` | Service/Co-Signer | Go | Arkade Script engine (50+ opcodes) + transaction signing |
| `boltz-backend` | Swap Infrastructure | TypeScript/Rust | Non-custodial atomic swaps (Boltz Exchange) |
| `boltz-swap` | Library | TypeScript | Boltz swap client library for Arkade wallets |
| `ark-telemetry` | Observability | Go + YAML | Prometheus, Grafana, Loki, Tempo |
| `ark-infra` | IaC | HCL + YAML | OpenTofu/Terraform + Docker Compose |
| `kms-unlocker` | Security Tool | Go | AWS KMS wallet unlock automation |
| `ark-docs` | Documentation | MDX | Official Ark protocol documentation |

### Dependency Graph

```
arkd (core)
   go-sdk (Go client library)
      ark-faucet (uses go-sdk)
      ark-simulator (uses go-sdk)
   ts-sdk (TypeScript client - @arkade-os/sdk)
      wallet (uses ts-sdk)
      arkade-escrow (uses ts-sdk)
   rust-sdk (Rust client - ark-rs, gRPC/REST to arkd)
   dotnet-sdk (.NET client - NArk, gRPC to arkd)
   ark-faucet (uses arkd APIs)
   kms-unlocker (unlocks arkd-wallet)
   fulmine (independent, can integrate via delegator)
   ark-telemetry (monitors arkd)
   introspector (Arkade Script co-signer)
   compiler (Arkade Script compiler -> contract artifacts)
   ark-infra (deploys arkd + dependencies)
   ark-docs (documents arkd)

boltz-backend (external swap provider)
   fulmine (uses Boltz for Lightning swaps)
   boltz-swap (client library for Boltz API)

wallet / @arkade-os/sdk
   boltz-swap (Lightning integration for Arkade wallets)
   arkade-escrow (uses @arkade-os/sdk for VEC escrow)

compiler -> introspector (compiler produces, introspector executes)
```

### Technology Groupings

| Language | Projects |
|----------|----------|
| **Go** | arkd, go-sdk, ark-faucet, ark-simulator, kms-unlocker, fulmine, introspector |
| **Rust** | rust-sdk, compiler |
| **C# / .NET** | dotnet-sdk |
| **TypeScript** | ts-sdk, wallet, arkade-assets, arkade-explorer, arkade-escrow, boltz-swap, boltz-backend |
| **Infrastructure** | ark-infra (HCL), ark-telemetry (YAML) |
| **Documentation** | ark-docs (MDX) |

---

## Commands & Slash Commands

### 13 Available Commands

| Command | Category | Description |
|---------|----------|-------------|
| `/add-project` | Registry | Analyze a repo and add it to the Arkadian registry |
| `/update-project` | Registry | Update project docs from new commits |
| `/remove-project` | Registry | Remove project from registry and delete docs |
| `/speckit.specify` | SpecKit | Create or update a feature specification |
| `/speckit.plan` | SpecKit | Generate an implementation plan |
| `/speckit.tasks` | SpecKit | Break spec into dependency-ordered tasks |
| `/speckit.implement` | SpecKit | Execute the implementation plan |
| `/speckit.analyze` | SpecKit | Cross-artifact consistency analysis |
| `/speckit.clarify` | SpecKit | Ask clarifying questions about underspecified areas |
| `/speckit.checklist` | SpecKit | Generate quality gate checklists |
| `/speckit.constitution` | SpecKit | Create/update project principles |
| `/analyse-arkadian-session` | Meta | Analyze a past session for insights |
| `/create-operational-sop` | Meta | Generate validated SOPs for Ark projects |

### Registry Management Workflow

```bash
# 1. Point Arkadian at a new repo
/add-project
# -> Reads the repo, generates tags/triggers/capabilities
# -> Creates INDEX.md and doc structure
# -> Adds to master registry

# 2. After new commits land
/update-project
# -> Detects changes, updates docs accordingly

# 3. When a project is retired
/remove-project
# -> Removes from registry, deletes doc folder
```

---

## FAQ

### Q: Does Arkadian require any changes to the Ark codebase?

**No.** Arkadian is a Claude Code plugin that wraps around the existing repos. It reads code, creates worktrees for changes, and produces artifacts. The Ark repositories don't need any modifications.

### Q: Can I use it for non-Ark projects?

In theory, yes — you'd need to register the project in `docs/INDEX.md`, create a project INDEX with doc sections, and set up the repo environment variable. The orchestration engine is project-agnostic; only the skills and docs are Ark-specific.

### Q: What if an agent makes a mistake?

Four layers of protection:

1. **Worktree isolation** — changes are in a separate worktree, not your main branch
2. **Assumption challenging** — agents are instructed to push back on incorrect requests
3. **Post-agent validation** — hooks check that required artifacts exist and are valid
4. **Retry protocol** — up to 3 automatic retries with structured feedback, then human escalation

### Q: How much does it cost per session?

Cost depends on task complexity and model used. A typical 4-phase development session (explore + plan + implement + review) uses the `sonnet` model for agents. The orchestrator itself runs on whatever model Claude Code is configured with. Expect roughly 100K-500K tokens per full pipeline run.

### Q: Can I skip the planning phase for quick fixes?

**No.** As of v5.0.0, all development tasks follow the full pipeline: explore -> plan -> implement -> review. The planning phase was made mandatory because even "quick fixes" benefit from explicit scope definition and task breakdown. The hooks enforce this — you literally cannot invoke ark-developer without the planning artifacts existing.

### Q: How do I add a new project?

Use the `/add-project` slash command. This analyzes the repository, generates metadata (tags, triggers, capabilities), creates the INDEX.md and documentation structure, and registers it in the master registry.

### Q: Can multiple people use Arkadian simultaneously?

Yes. Each person runs their own Claude Code session with its own session ID. Sessions are isolated — different session directories, different state files, different worktrees. The only shared resource is the `docs/` directory (read-only for agents) and the `sessions/` directory (each session has its own subdirectory).

### Q: What about secrets and credentials?

The orchestrator and agents are instructed to never echo secrets or tokens. The guardrail hooks block access to paths outside the allowed scope. Environment variables containing credentials should use standard practices (`.env` files excluded from git, AWS Secrets Manager for production).

### Q: How do I debug a failed session?

```bash
# Check session status
arkadian status <session_id>

# View hook logs
arkadian logs <session_id>

# Read the post-agent validation output
cat sessions/<id>/artifacts/<phase>/_result.json

# Analyze with the built-in command
/analyse-arkadian-session
```

### Q: What's the difference between skills and agents?

- **Agents** are autonomous workers invoked via the Task tool. They receive an execution specification and produce artifacts. They run as Claude sub-processes with their own context window.
- **Skills** are structured prompts that agents can invoke to get domain-specific knowledge. They're like reference manuals that get loaded into the agent's context when needed.

An agent might invoke the `arkd-dev-loop` skill to know how to set up the local development environment, or the `pm-spec` skill to follow the specification writing process.

### Q: Can I customize the pipeline?

The workflow templates in `templates/workflows/` define the pipeline structure. You can create custom workflows, but the development pipeline hooks enforce the guru -> PM -> developer -> reviewer sequence for all `dev` intent tasks. For non-dev tasks (questions, research, monitoring), different pipelines apply automatically.

### Q: What is "context engineering" and why does it matter?

Context engineering (coined by Anthropic) is the practice of curating what tokens enter an LLM's attention window. Arkadian applies this by:

1. **Tiered loading** — only loading what's needed at each stage
2. **Sub-agent isolation** — each agent gets a clean context window for its specific task
3. **Structured artifacts** — compact YAML summaries instead of raw code dumps between phases
4. **Registry-driven routing** — only relevant project docs enter the pipeline

Without context engineering, a multi-repo task would dump thousands of lines of irrelevant code into the model's window, degrading performance on the actual task.

### Q: How does assumption challenging work?

Every agent (especially ark-developer) is instructed to **push back** on requests that seem wrong. For example:

```
Assumption Challenge

  Assumption: "Add a gRPC endpoint to delete all VTXOs"

  Why this may be incorrect:
  - VTXOs represent user funds - deletion violates
    Ark's security model
  - VTXOs should only be removed through:
    1. User-initiated exit flows
    2. Natural expiry after timeout

  Evidence: internal/core/domain/vtxo.go:85-120

  Recommended alternative:
  - Add a "mark expired" endpoint that transitions
    state without deleting the record
```

This comes from the actual ark-developer agent prompt, not a demo. Agents are expected to be domain-aware, not just code generators.

---

## Numbers at a Glance

| Metric | Count |
|--------|-------|
| Projects in registry | 20 |
| Programming languages | 5 (Go, TypeScript, Rust, C#, MDX/HCL) |
| Specialist agents | 8 |
| Domain skills | 33 |
| Workflow templates | 12 |
| Slash commands | 13 |
| TypeScript hooks | 11 |
| Lines of hook code | ~4,730 |
| Orchestrator spec lines | 1,620 |
| Approval gates | 3 |
| Max auto-retries | 3 |
