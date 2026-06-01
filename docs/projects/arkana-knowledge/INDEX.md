---
project_id: arkana-knowledge
version: 1.0.0
last_sync_commit: 091b85059b5dd1b969b8cfbe47427ecb8fc1171b
last_sync_date: 2026-06-01T03:30:04Z
repository_path: ${ARKANA_KNOWLEDGE_REPO}
documentation_path: ${ARKADIAN_DOCS}/projects/arkana-knowledge
commits_behind_upstream: 0
uncommitted_changes: false
default_sections_by_intent:
  qna:        ["system/project_overview.md", "system/architecture.md"]
  qa:         ["testing/usage.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "sop/development-workflow.md"]
  debug:      ["testing/troubleshooting.md", "system/architecture.md"]
  monitoring: ["testing/troubleshooting.md", "sop/development-workflow.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  agents: ["system/architecture.md", "system/project_overview.md"]
  deployment: ["testing/how_to_run.md", "sop/development-workflow.md"]
  security: ["system/project_overview.md", "testing/troubleshooting.md"]
scripts:
  mcp_build: "cd mcp-server && pnpm install && pnpm run build"
  mcp_dev: "cd mcp-server && pnpm run dev"
  mcp_start: "cd mcp-server && pnpm run start"
  slack_build: "cd slack-bot && pnpm install && pnpm run build"
  drift_check: "./scripts/drift-check.sh"
  fix_nginx: "./fix-nginx.sh"
  sync_now: "./sync-now"
---

# Arkana Knowledge — Project Index

**arkana-knowledge** is the configuration, knowledge base, and audit trail for **Arkana**, Ark Labs' always-on AI assistant. It contains 17 agent configurations, the deep arkwiki knowledge base, the MCP server, the Slack bot, GitHub webhook integration, infrastructure configs, and shared agent memory. Arkana runs on a private Hetzner VPS, is orchestrated by Paperclip on the Claude Agent SDK, and monitors repos across the [ArkLabsHQ](https://github.com/ArkLabsHQ) and [arkade-os](https://github.com/arkade-os) GitHub organizations.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/arkana-knowledge/system/` — System Architecture & Components
Core documentation about Arkana's architecture and design:

- **${ARKADIAN_DIR}/docs/projects/arkana-knowledge/system/project_overview.md** — What arkana-knowledge is, repo layout, agents, deployment
- **${ARKADIAN_DIR}/docs/projects/arkana-knowledge/system/architecture.md** — System architecture, data flow, agent orchestration

### `${ARKADIAN_DIR}/docs/projects/arkana-knowledge/testing/` — Usage & Operations
Practical guides for using and operating the Arkana system:

- **${ARKADIAN_DIR}/docs/projects/arkana-knowledge/testing/usage.md** — Quick start (running MCP server, slack-bot, scripts)
- **${ARKADIAN_DIR}/docs/projects/arkana-knowledge/testing/how_to_run.md** — Deployment, systemd services, environment variables
- **${ARKADIAN_DIR}/docs/projects/arkana-knowledge/testing/how_to_test.md** — Validating agent configs, testing webhooks
- **${ARKADIAN_DIR}/docs/projects/arkana-knowledge/testing/troubleshooting.md** — Common issues and debugging
- **${ARKADIAN_DIR}/docs/projects/arkana-knowledge/testing/api-reference.md** — MCP server endpoints, slack-bot APIs

### `${ARKADIAN_DIR}/docs/projects/arkana-knowledge/sop/` — Standard Operating Procedures
Step-by-step guides for operations:

- **${ARKADIAN_DIR}/docs/projects/arkana-knowledge/sop/development-workflow.md** — Editing agent configs, branch+PR rules, deployment

### `${ARKADIAN_DIR}/docs/projects/arkana-knowledge/tasks/` — Product Requirements & Plans
Feature specifications and implementation tracking.

### `${ARKADIAN_DIR}/docs/projects/arkana-knowledge/change-log/` — Recent Changes
Curated summaries of significant changes.

### `${ARKADIAN_DIR}/docs/projects/arkana-knowledge/pr-report/` — Pull Request Summaries
Analysis and summaries of pull requests.

---

## Key Concepts

### Arkana Identity
- **Name**: Arkana — keeper of arcane knowledge, the oracle of Ark Labs
- **Runtime**: Claude Agent SDK (Arkana v2) — migrated from OpenClaw 2026-04-07
- **Orchestrator**: Paperclip (schedules 16+ cron agents)
- **GitHub identity**: `arkanaai[bot]` (App ID 2923031)
- **Slack handle**: `@arkanaai`

### Agent Catalog (17 active)
Stored in `agent-configs/`, each as a markdown system prompt:

| Agent | Schedule | Purpose |
|-------|----------|---------|
| daily-briefing | 08:00 UTC | Morning engineering summary to #arkana-executive |
| executive-digest | 16:00 UTC | Afternoon digest, flushes executive-digest-queue |
| repo-sync | 01:00 UTC | Sync all repos, detect drift |
| repo-detector | 02:30 UTC | Discover and index new repos |
| sdk-parity | 10:00 UTC | Track feature parity across Go/TS/Rust/.NET SDKs |
| security-triage | every 2h | Surface security-relevant changes and CVEs |
| pr-lifecycle | every 30m | Review open PRs, post structured feedback |
| issue-triage | every 30m | Triage and expand new issues |
| issue-staleness | Mon 09:00 UTC | Weekly sweep of stale/outdated open issues; flags for human review (never closes) |
| release-coordinator | every 4h | Track release readiness across repos |
| research-monitor | Mon/Wed/Fri 14:00 | Deep research on protocol questions |
| onboarding-buddy | 09:00 UTC | Help new contributors get oriented |
| team-pulse-weekly | Fri 14:00 UTC | Weekly team health report |
| self-improver | Sun 09:00 UTC | Review own performance, propose improvements |
| docs-auditor | 03:00 UTC | Audit and update documentation |
| linear-sync | every 2h | Sync Linear issues with GitHub |
| slack-monitor | continuous | Monitor Slack mentions and DMs |

### Executive Digest Queue
Most agents do NOT post to Slack directly. They append to `memory/executive-digest-queue.json`. The `executive-digest` and `daily-briefing` agents flush the queue to `#arkana-executive`. Direct posting is reserved for: daily-briefing, executive-digest, security-triage (critical only), Slack bot responses, and webhook relay.

### Memory System
- `memory/MEMORY.md` — curated long-term company knowledge
- `memory/agent-logs/` — per-agent run logs
- `memory/ci-state.json` — last known CI state across repos
- `memory/executive-digest-queue.json` — pending digest items
- `memory/pr-review-state.json` — PR review state tracking
- `memory/heartbeat-state.json` — heartbeat poll cycle state
- Memory is written directly to `main` by agents (exception to the branch+PR rule)

### Two-Org GitHub Integration
- `ArkLabsHQ/*` repos → `gh-token arklabshq`
- `arkade-os/*` repos → `gh-token arkade-os`
- Tokens valid for ~10 minutes; re-run when switching orgs
- Wrappers in `bin/` enforce org selection before any `gh` call

### MCP Server (`mcp-server/`)
- TypeScript + Express service exposing Arkana via Model Context Protocol
- Endpoint: `https://arkana.arkade.sh/mcp` (port 3458)
- Built on `@anthropic-ai/claude-agent-sdk`
- Used by external AI tools to query Arkana's knowledge

### Slack Bot (`slack-bot/`)
- TypeScript service responding to mentions and DMs as `@arkanaai`
- Authenticated via bot token in `/root/arkana/secrets/slack.env`
- Channel allowlist enforced (no posts to `#dev`)

### Webhook Relay (`enhanced-github-relay.js`)
- Node.js service on port 3456
- Receives GitHub webhooks → posts to `#github-bot` + triggers agents

### Branch + PR Flow (Non-Negotiable)
- **Never** push to `main` on any external repo
- Branch naming: `agent/{agent-name}/{YYYY-MM-DD}-{short-description}`
- PR title: `[Agent: {name}] {description}`
- Only exception: writing to agent-owned knowledge repos (e.g., `arkana-knowledge/memory/`)

### Information Classification
- **PUBLIC** (GitHub, Chatwoot, MCP external): Only public information
- **INTERNAL** (Slack, Linear, internal wiki): Internal context permitted
- **CONFIDENTIAL** (security vulns, employee data): DMs to authorized individuals only
- Violations are treated as security incidents

### Protocol-Critical Code Boundary
Code touching VTXOs, transaction signing, forfeit paths, round lifecycle, connector trees, or exit paths MUST be flagged for human review. Arkana does not approve protocol-critical PRs without explicit human sign-off.

---

## Quick Reference

### Repository Layout
```
arkana-knowledge/
├── agent-configs/         # System prompts for the 16 active agents
├── arkwiki/               # Deep knowledge base — repos, architecture, protocols
│   ├── repos/             # Per-repo wiki pages (arkd, ts-sdk, fulmine, etc.)
│   ├── architecture/      # System architecture, cross-repo deps, protocol docs
│   ├── diagrams/          # VTXO flow, round lifecycle, SDK data flow
│   └── sdks/              # SDK comparison, patterns
├── arklabs-bootstrap/     # Legacy deployment scripts and runbooks
├── ark-docs/              # Drift report on ark-docs
├── arkade-docs/           # Drift report on arkade-docs
├── bin/                   # Helper scripts (gh-token, slack-post, etc.)
├── boltz-swap-check/      # Boltz swap monitoring
├── chunks/                # AST chunks for embeddings
├── claude-mem/            # Memory worker integration
├── github-integration/    # GitHub App configs and helpers
├── infrastructure/        # Nginx configs, service definitions
├── mcp-server/            # MCP server (TypeScript, Express)
├── memory/                # Shared agent memory (state, digests, logs)
├── policies/              # Internal policy docs
├── protocol-tools/        # Noa binary for Ark protocol debugging
├── scripts/               # Operational scripts
├── security/              # Security policy, privileges, deployment rules
├── slack-bot/             # Slack bot (TypeScript)
├── slides/                # Presentation materials
├── system-services/       # systemd unit files (mirrored)
├── systemd/               # systemd unit files (canonical)
├── templates/             # Reusable prompt and output templates

SOUL.md         # Arkana's character and operating principles
AGENTS.md       # Workspace conventions and escalation policy
CLAUDE.md       # Global rules (auth, branch policy, Slack channels)
HEARTBEAT.md    # Active monitoring checklist
COMPONENTS.md   # Infrastructure component inventory
TOOLS.md        # Available tools and scripts
USER.md         # User context (kukks, timezone, preferences)
README.md       # Repository overview
```

### Slack Channels

| Channel ID | Name | Purpose |
|------------|------|---------|
| `C0AG924QGN7` | `#arkana-ai` | Agent chatter, non-executive |
| `C0AGK2BGY5A` | `#arkana-executive` | Executive digest, important alerts |
| `C07QPCK1UJD` | `#github-bot` | GitHub notifications |
| `C07NCLU403B` | `#dev` | NEVER post here — agents forbidden |
| `C095LGXKYNA` | `#alerts-prod` | CI failures |

### Production Endpoints

| Service | URL / Port |
|---------|-----------|
| MCP server | https://arkana.arkade.sh/mcp (port 3458) |
| Memory worker (claude-mem) | https://arkana.arkade.sh/mem/ (port 37777) |
| Webhook relay | port 3456 |
| Slack bot | bidirectional via Slack API |

### Working with Agent Configs
```bash
# Edit an agent prompt
$EDITOR agent-configs/pr-lifecycle.md

# Validate it parses cleanly (no automated test — read it carefully)
# Then commit on a branch and open a PR — never push to main
```

### MCP Server Development
```bash
cd mcp-server
pnpm install
pnpm run dev           # tsx src/server.ts (hot reload)
pnpm run build         # tsc → dist/
pnpm run start         # node dist/server.js
```

---

## Documentation Size Guidelines

To keep context lean for Claude agents:

- **usage/how-to**: ≤ 100-120 lines
- **architecture**: 400-700 words
- **API reference**: 600-1000 words
- **SOP procedures**: ≤ 120 lines

Keep files focused and cross-reference when needed.
