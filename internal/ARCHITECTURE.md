# Arkadian Architecture

This document explains how Arkadian works internally.

## Overview

Arkadian is a Claude Code plugin that provides three operating modes:

### Mode 1: Orchestrator Mode (`arkadian` command)
- **Use case:** Working on the Ark ecosystem (arkd, wallet, simulator, etc.)
- **Behavior:** Strict delegation - can only read documentation and spawn specialized agents
- **Guardrails:** Cannot directly edit code, run bash, or access project repos
- The orchestrator **never touches code directly** - it analyzes requests, selects projects, and delegates to specialized agents

### Mode 2: Development Mode (`claude` in arkadian directory)
- **Use case:** Working on Arkadian itself
- **Behavior:** Full access to all tools, agents available but not required
- **Guardrails:** None - direct development workflow

### Mode 3: Plain Claude (`make uninstall`)
- **Use case:** Using Claude Code without Arkadian context
- **How to achieve:** Run `make uninstall` to remove all Arkadian configuration
- **Result:** Clean Claude Code with no agents, skills, or hooks

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     User runs: arkadian                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  scripts/arkadian                                            │
│  - Sets ARKADIAN_ORCHESTRATOR_MODE=1                        │
│  - Loads ORCHESTRATOR.md via --append-system-prompt         │
│  - Launches claude                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Claude Code Session (Orchestrator)                          │
│  - session_id: ABC-123                                       │
│  - Registers as orchestrator in log/orchestrator-session.txt │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
┌───────────────────┐ ┌───────────────┐ ┌───────────────────┐
│ PreToolUse Hooks  │ │ UserPrompt    │ │ SessionEnd Hook   │
│                   │ │ Submit Hook   │ │                   │
│ - guardrail.ts    │ │               │ │ - Cleanup session │
│ - validate-*.ts   │ │ - Load context│ │ - Summarize       │
└───────────────────┘ └───────────────┘ └───────────────────┘
```

## Hooks

### 1. UserPromptSubmit Hook (`load-arkadian-context.ts`)

Runs on every user message. Injects orchestrator compliance reminder.

```
User types message
    │
    ▼
Hook fires
    │
    ▼
Returns reminder about:
- Tiered context policy
- 9-step workflow
- Approval gates
```

### 2. PreToolUse Hook: Orchestrator Guardrail (`orchestrator-guardrail.ts`)

**Only active when `ARKADIAN_ORCHESTRATOR_MODE=1`**

Enforces boundaries on the orchestrator:

| Tool | Orchestrator | Sub-Agent |
|------|--------------|-----------|
| Task | ✅ Allowed | ✅ Allowed |
| Read (ARKADIAN_DIR) | ✅ Allowed | ✅ Allowed |
| Read (project repos) | ❌ Blocked | ✅ Allowed |
| Write (ARKADIAN_DIR) | ✅ Allowed | ✅ Allowed |
| Write (project repos) | ❌ Blocked | ✅ Allowed |
| Edit (ARKADIAN_DIR) | ✅ Allowed | ✅ Allowed |
| Edit (project repos) | ❌ Blocked | ✅ Allowed |
| Bash | ❌ Blocked | ✅ Allowed |
| Glob, Grep (ARKADIAN_DIR) | ✅ Allowed | ✅ Allowed |

**Orchestrator ARKADIAN_DIR Privileges:**
- Can read/write/edit files in `${ARKADIAN_DIR}/docs/`
- Can read/write/edit files in `${ARKADIAN_DIR}/sessions/`
- Can read/write/edit files in `${ARKADIAN_DIR}/templates/`
- Cannot access project repositories (ARKD_REPO, GO_SDK_REPO, etc.)

**How it distinguishes orchestrator from sub-agents:**

```
First tool call in session:
  → Write session_id to log/orchestrator-session.txt
  → This is the orchestrator

Subsequent calls:
  → Read log/orchestrator-session.txt
  → If session_id matches → orchestrator (enforce rules)
  → If session_id differs → sub-agent (allow everything)
```

### 3. PreToolUse Hook: Agent Input Validator (`validate-agent-input.ts`)

Validates Task tool calls to ensure proper Execution Specification format.

Only runs when `tool_name === "Task"` and `subagent_type` is an Arkadian agent.

### 4. SessionEnd Hook (`session-stop-hook.ts`)

- Cleans up `log/orchestrator-session.txt` if session matches
- Spawns background worker for transcript summarization
- Renames session folder with meaningful title

## Orchestrator Flow

When you run `arkadian`, the orchestrator follows a strict 9-step workflow:

```
Step 1: Load Master Registry
        └── Read ${ARKADIAN_DIR}/docs/INDEX.md

Step 2: Intent Classification
        └── Classify request (ask_question, develop, test_or_run, etc.)

Step 3: Project Selection
        └── Score all projects, select top 2-3

Step 4: Load Project Indexes
        └── Read ${ARKADIAN_DIR}/docs/projects/<id>/INDEX.md

Step 5: Derive Doc Sections
        └── Map intent → doc sections for agents

Step 6: Prepare Repo Hints
        └── Provide ${PROJECT_REPO} paths to agents

Step 7: Workflow Selection
        └── Match intent → workflow template

Step 8: Expand to Steps
        └── 1 phase → 1 Execution Specification

Step 9: Context Injection
        └── Add session paths, projects, docs to each spec
```

## Approval Gates

The orchestrator has 3 mandatory approval gates:

### Gate 1: Plan Approval
```
Orchestrator presents plan
    ↓
"⏸️ AWAITING PLAN APPROVAL"
    ↓
User: "APPROVED" → proceed
User: anything else → revise
```

### Gate 2: Execution Spec Approval
```
Orchestrator shows full spec for step S1
    ↓
"⏸️ AWAITING SPEC APPROVAL FOR S1"
    ↓
User: "APPROVED" → invoke agent
User: "APPROVED ALL" → skip remaining gates
```

### Gate 3: Subsequent Call Verification
```
Agent completes
    ↓
Orchestrator reports result
    ↓
Shows next spec (S2)
    ↓
"⏸️ AWAITING SPEC APPROVAL FOR S2"
```

## Semantic Project Selection

### Scoring Algorithm

```
score = 0.35 × intent_match
      + 0.25 × tag_synonym_overlap
      + 0.20 × trigger_overlap
      + 0.10 × capability_match
      + 0.40 × user_explicit
```

- `user_explicit = 1.0` if user named the project
- All other components: 0.0 to 1.0
- Projects with score ≥ 0.3 are selected
- Dependencies auto-included

### Example

```
User: "How do I test arkd with multiple wallets?"

Scores:
  arkd: 0.95         (test trigger, explicit mention)
  ark-simulator: 0.90 (multi-wallet testing capability)
  go-sdk: 0.75       (wallet library)
  wallet: 0.45       (wallet keyword)

Selected: arkd, ark-simulator, go-sdk (top 3)
Tokens: ~3k (vs ~50k for all 12 projects)
```

## Agent Catalog

| Agent | Purpose | Doc Intent |
|-------|---------|------------|
| ark-guru | Q&A, explanations | qna |
| ark-developer | Code changes | dev |
| ark-env-tester | Testing, QA | qa |
| ark-project-manager | Specs, planning | dev |
| ark-pr-reviewer | PR analysis | pr_review |
| ark-observer | Telemetry debugging | debug |
| ark-researcher | Research | research |
| ark-progress-tracker | Progress reports | qna |

## File Locations

### Installed Files

```
~/.claude/
├── settings.json          # Hooks + env vars
├── agents/                # Agent definitions
│   ├── ark-guru.md
│   ├── ark-developer.md
│   └── ...
├── skills/                # Skill prompts
│   ├── pm-spec/
│   ├── pm-plan/
│   └── ...
└── commands/              # Slash commands
    ├── add-project.md
    └── ...

~/bin/
└── arkadian               # Launch script
```

### Source Files

```
arkadian/
├── ORCHESTRATOR.md        # Main orchestrator prompt
├── scripts/
│   └── arkadian           # Launch script source
├── hooks/
│   ├── orchestrator-guardrail.ts
│   ├── validate-agent-input.ts
│   ├── load-arkadian-context.ts
│   ├── session-start-hook.ts
│   └── session-stop-hook.ts
├── agents/                # Agent sources
├── skills/                # Skill sources
├── commands/              # Command sources
├── docs/
│   ├── INDEX.md           # Master project registry
│   └── projects/          # Per-project docs
└── templates/             # Workflow templates
```

## Environment Variables

```bash
# Core
ARKADIAN_DIR=/path/to/arkadian
ARKADIAN_ORCHESTRATOR_MODE=1  # Set by arkadian script

# Project Repos (12)
ARKD_REPO=/path/to/ark
GO_SDK_REPO=/path/to/go-sdk
WALLET_REPO=/path/to/wallet
ARK_FAUCET_REPO=/path/to/ark-faucet
ARK_SIMULATOR_REPO=/path/to/ark-simulator
ARK_TELEMETRY_REPO=/path/to/ark-telemetry
ARK_INFRA_REPO=/path/to/ark-infra
KMS_UNLOCKER_REPO=/path/to/kms-unlocker
FULMINE_REPO=/path/to/fulmine
BOLTZ_BACKEND_REPO=/path/to/boltz-backend
ARK_DOCS_REPO=/path/to/docs
ARKADE_ESCROW_REPO=/path/to/arkade-escrow
```

## Safety Guardrails

### Production Guard
Requests touching production require: `I ACKNOWLEDGE PROD`

### Destructive Pattern Detection
Detects and blocks: `DROP`, `DELETE`, `TRUNCATE`, `rm -rf`, irreversible infra changes

### Secret Redaction
All outputs sanitized - no tokens/keys echoed

### Timeboxing
Tests/simulations default to ≤5 minutes unless explicitly approved

## Debugging

### Check orchestrator session
```bash
cat $ARKADIAN_DIR/log/orchestrator-session.txt
```

### Check guardrail log
```bash
tail -50 $ARKADIAN_DIR/log/orchestrator-guardrail.txt
```

### Test hook manually
```bash
echo '{"session_id":"test","tool_name":"Edit","tool_input":{},"hook_event_name":"PreToolUse"}' | \
  ARKADIAN_ORCHESTRATOR_MODE=1 bun hooks/orchestrator-guardrail.ts
```

### Verify installation
```bash
make verify
make status
```
