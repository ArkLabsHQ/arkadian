# Arkadian Development Context

You are working **inside the Arkadian repository itself**. This is development mode - you have full tool access and should work directly without delegation.

## What is Arkadian?

Arkadian is a **Claude Code plugin** that provides an AI orchestration system for the Ark protocol ecosystem. It has two operating modes:

1. **Orchestrator Mode** (`arkadian` command) - Strict delegation to agents, no direct code access
2. **Development Mode** (`claude` in this directory) - Full access, what you're using now

## Quick Reference

| What | Where |
|------|-------|
| Main orchestrator prompt | `ORCHESTRATOR.md` |
| Installation/uninstallation | `Makefile` |
| Hook implementations | `hooks/` |
| Agent definitions | `agents/` |
| Skills (model-invoked) | `skills/` |
| Slash commands | `commands/` |
| Project documentation | `docs/` |
| Workflow templates | `templates/` |
| Session artifacts | `sessions/` |
| Installation scripts | `scripts/` |
| Claude Code reference docs | `internal/claude-code-ref/INDEX.md` |

## Architecture Overview

```
User runs "arkadian"
         │
         ▼
scripts/arkadian
├── Sets ARKADIAN_ORCHESTRATOR_MODE=1
├── Loads ORCHESTRATOR.md via --append-system-prompt
└── Launches claude
         │
         ▼
Claude Code Session (Orchestrator)
├── Registers session in log/orchestrator-session.txt
├── PreToolUse hooks enforce guardrails
├── UserPromptSubmit hook injects context
└── SessionEnd hook cleans up
```

## Hooks (hooks/)

| Hook | File | Purpose |
|------|------|---------|
| PreToolUse | `orchestrator-guardrail.ts` | Blocks orchestrator from accessing project repos |
| PreToolUse | `validate-agent-input.ts` | Validates Task tool Execution Specifications |
| UserPromptSubmit | `user-submit-reminder.ts` | Injects orchestrator compliance reminder |
| SessionStart | `session-start-hook.ts` | Creates session folder structure |
| SessionEnd | `session-stop-hook.ts` | Cleanup, summarization |

### Guardrail Logic (`orchestrator-guardrail.ts`)

The guardrail distinguishes orchestrator from sub-agents by session ID:

```typescript
// First tool call: write session_id to log/orchestrator-session.txt
// Subsequent calls: if session_id matches → enforce rules, else → sub-agent (allow all)

ALLOWED_TOOLS = ['Task', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'TodoWrite', 'AskUserQuestion']
PATH_RESTRICTED = ['Read', 'Write', 'Edit', 'Glob', 'Grep']  // Must be within ARKADIAN_DIR
BLOCKED_TOOLS = ['Bash', 'NotebookEdit', 'MultiEdit']
```

## Agents (agents/)

| Agent | Purpose | Output |
|-------|---------|--------|
| `ark-guru` | Q&A, explanations | Report in `artifacts/` |
| `ark-developer` | Code changes + testing | `detailed_report.md` + code |
| `ark-project-manager` | Specs, planning | `spec.md`, `plan.md`, `tasks.md` |
| `ark-pr-reviewer` | PR analysis | `review_report.md` |
| `ark-observer` | Telemetry debugging | `investigation_report.md` |
| `ark-researcher` | Research | `research_report.md` |
| `ark-progress-tracker` | Progress reports | `progress_report.md` |

Agent files have YAML frontmatter:
```yaml
---
name: ark-developer
description: ...
model: sonnet
skills: dev-implement
---
```

## Skills (skills/)

Skills are model-invoked prompts. Each is a directory with `prompt.md`:

| Skill | Purpose |
|-------|---------|
| `pm-spec` | Create feature specifications |
| `pm-plan` | Generate implementation plans |
| `pm-tasks` | Break down into tasks |
| `pm-analyze` | Cross-artifact consistency |
| `pm-clarify` | Ask clarifying questions |
| `pm-checklist` | Generate quality checklists |
| `pm-constitution` | Project principles |
| `dev-implement` | Execute implementation |
| `bitcoin-l2-research` | Bitcoin/L2 research |
| `ark-progress-tracking` | Progress tracking |
| `browser-testing` | Playwright testing |

## Commands (commands/)

Slash commands are markdown files with embedded prompts:

| Command | Purpose |
|---------|---------|
| `/add-project` | Add project to registry |
| `/update-project` | Update project docs |
| `/remove-project` | Remove from registry |
| `/speckit.*` | Specification workflow |
| `/create-operational-sop` | Generate SOPs |

## Templates (templates/)

| Template | Purpose |
|----------|---------|
| `agent_catalog.md` | Agent → doc intent mapping |
| `doc_intake_defaults.md` | Default doc sections by intent |
| `intent_classification.md` | Valid intents/sub-intents |
| `response_formats.md` | Required response structure |
| `sub_agent_input_spec.md` | Execution Specification format |
| `workflows/` | Workflow templates (YAML) |

## Key Files to Know

### ORCHESTRATOR.md
The main prompt loaded when running `arkadian`. Defines:
- 9-step workflow
- 3 approval gates
- Project selection algorithm
- Tiered context policy

### .claude-settings.template.json
Template for `~/.claude/settings.json`. Contains:
- Hook configurations
- Permission rules
- Environment variable placeholders

### Makefile
Key targets:
```bash
make install          # Full installation
make uninstall        # Remove everything
make verify           # Check installation
make install-agents   # Just agents
make install-skills   # Just skills
make install-commands # Just commands
make test-hook        # Test hooks
```

## Environment Variables

```bash
ARKADIAN_DIR              # Path to this repo
ARKADIAN_ORCHESTRATOR_MODE # "1" when in orchestrator mode

# Project repos (12)
ARKD_REPO, GO_SDK_REPO, WALLET_REPO, ARK_FAUCET_REPO,
ARK_SIMULATOR_REPO, ARK_TELEMETRY_REPO, ARK_INFRA_REPO,
KMS_UNLOCKER_REPO, FULMINE_REPO, BOLTZ_BACKEND_REPO,
ARK_DOCS_REPO, ARKADE_ESCROW_REPO
```

## Documentation Registry (docs/)

```
docs/
├── INDEX.md              # Master registry (project_id, tags, triggers, etc.)
└── projects/
    ├── arkd/
    │   ├── INDEX.md      # Project-specific index
    │   ├── system/       # Architecture, folder structure, etc.
    │   ├── testing/      # How to test, troubleshooting
    │   └── sop/          # Development workflows
    ├── go-sdk/
    ├── wallet/
    └── ... (12 projects)
```

## Session Structure

Sessions are created in `sessions/<SESSION_ID>/`:
```
sessions/<SESSION_ID>/
├── metadata.json         # Session info
├── artifacts/            # Execution artifacts (session-scoped)
│   ├── explore/          # ark-guru analysis
│   │   ├── assessment.yaml
│   │   ├── *_patterns.md
│   │   └── _result.json
│   └── implement/        # ark-developer code changes
│       ├── detailed_report.md
│       ├── test-evidence.md
│       └── _result.json
└── specs/                # Planning artifacts (project-scoped)
    ├── S1.yaml           # Execution spec for explore
    ├── S2.yaml           # Execution spec for plan
    ├── S3.yaml           # Execution spec for implement
    └── {project}/        # Planning by project
        └── {feature-id}/
            ├── spec.md
            ├── plan.md
            ├── tasks.md
            └── _result.json
```

## Artifact Organization

Arkadian uses a **hybrid artifact organization** strategy:

### Planning Artifacts → `specs/{project}/{feature-id}/`
- **Who:** ark-project-manager
- **What:** spec.md, plan.md, tasks.md, _result.json
- **Why:** Project-scoped, reusable across sessions
- **Example:** `specs/arkd/001-round-metrics/`

### Execution Artifacts → `artifacts/{phase}/`
- **Who:** ark-guru, ark-developer
- **What:** Analysis reports, code diffs, test results, _result.json
- **Why:** Session-scoped, disposable after completion
- **Example:** `artifacts/explore/`, `artifacts/implement/`

**Resume Detection:** Orchestrator checks both locations:
- Explore phase: `artifacts/explore/_result.json`
- Plan phase: `specs/{project}/*/_result.json`
- Implement phase: `artifacts/implement/_result.json`

## Development Guidelines

When working on Arkadian itself:

1. **Use direct tools** - Don't delegate to agents, work directly
2. **Test hooks manually**:
   ```bash
   echo '{"session_id":"test","tool_name":"Edit","tool_input":{}}' | \
     ARKADIAN_ORCHESTRATOR_MODE=1 bun hooks/orchestrator-guardrail.ts
   ```
3. **Check logs**:
   ```bash
   tail -50 log/orchestrator-guardrail.txt
   cat log/orchestrator-session.txt
   ```
4. **Reinstall after changes**:
   ```bash
   make install-agents   # If you changed agents/
   make install-skills   # If you changed skills/
   make install-commands # If you changed commands/
   ```

## Common Tasks

### Adding a new agent
1. Create `agents/<agent-name>.md` with frontmatter
2. Add to `templates/agent_catalog.md`
3. Run `make install-agents`

### Adding a new skill
1. Create `skills/<skill-name>/prompt.md`
2. Run `make install-skills`

### Adding a new command
1. Create `commands/<command-name>.md`
2. Run `make install-commands`

### Modifying guardrails
1. Edit `hooks/orchestrator-guardrail.ts`
2. Test: `echo '{"session_id":"test",...}' | bun hooks/orchestrator-guardrail.ts`
3. Settings are auto-loaded (no reinstall needed for hooks)

### Testing orchestrator mode
Run in a **different terminal** (not this development session):
```bash
arkadian  # Then test orchestrator behavior
```

## Debugging

```bash
# Check installation
make verify
make status

# Check guardrail decisions
tail -f log/orchestrator-guardrail.txt

# Check current orchestrator session
cat log/orchestrator-session.txt

# Test hook in isolation
echo '{"session_id":"test","tool_name":"Bash","tool_input":{},"hook_event_name":"PreToolUse"}' | \
  ARKADIAN_ORCHESTRATOR_MODE=1 bun hooks/orchestrator-guardrail.ts
```

## Important Notes

- This CLAUDE.md is for **developing Arkadian**, not using it as orchestrator
- The orchestrator (when running `arkadian`) uses `ORCHESTRATOR.md` instead
- Hooks run via `bun` - ensure bun is installed
- Changes to hooks take effect immediately (no reinstall needed)
- Changes to agents/skills/commands require `make install-*`
