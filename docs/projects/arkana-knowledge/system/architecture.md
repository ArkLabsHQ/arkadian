# Arkana Knowledge — Architecture

## Overview

`arkana-knowledge` is the configuration + knowledge layer for the Arkana AI assistant. It is a **monorepo of declarative configs and lightweight services** rather than a single application: agent prompts, knowledge base, MCP server, Slack bot, webhook relay, and shared memory. Services are coordinated by **Paperclip** (the cron-style agent scheduler) and authenticated via two GitHub App tokens (one per org).

## High-Level Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                       External Surfaces                           │
│  GitHub (App: arkanaai[bot])    Slack (@arkanaai)    Linear     │
│  ▲              ▲                       ▲              ▲          │
│  │              │                       │              │          │
│  ▼              ▼                       ▼              ▼          │
│ ┌────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │
│ │ webhook    │ │ slack-bot    │ │ MCP server   │ │ linear API │  │
│ │ relay :3456│ │ (TypeScript) │ │ :3458        │ │ (REST)     │  │
│ │ (Node.js)  │ │              │ │ (TypeScript) │ │            │  │
│ └─────┬──────┘ └──────┬───────┘ └──────┬───────┘ └─────┬──────┘  │
│       │                │                │                │         │
└───────┼────────────────┼────────────────┼────────────────┼────────┘
        │                │                │                │
        └────────┬───────┴────────┬───────┴────────────────┘
                 │                │
                 ▼                ▼
         ┌───────────────────────────────┐
         │  Paperclip (orchestrator)     │
         │  - 16 cron-scheduled agents   │
         │  - Heartbeat polling          │
         │  - Webhook-triggered runs     │
         └──────────────┬────────────────┘
                        │ spawns
                        ▼
         ┌───────────────────────────────┐
         │  Claude Agent SDK runtime     │
         │  (Arkana v2)                  │
         │  - Loads SOUL.md, AGENTS.md   │
         │  - Loads agent-configs/<n>.md │
         │  - Reads memory/, arkwiki/    │
         └──────────────┬────────────────┘
                        │ reads/writes
                        ▼
         ┌───────────────────────────────┐
         │  Shared State                 │
         │  - memory/MEMORY.md           │
         │  - memory/executive-digest-   │
         │    queue.json                 │
         │  - memory/ci-state.json       │
         │  - memory/pr-review-state.json│
         │  - SQLite KB (676MB)          │
         └───────────────────────────────┘
```

## Components

### Paperclip Orchestrator
Cron-style scheduler that spawns agents on schedule or via webhook trigger. Each scheduled agent loads its system prompt from `agent-configs/<name>.md` plus the global rules in `SOUL.md`, `AGENTS.md`, and `CLAUDE.md`. Defined in `systemd/paperclip.service`.

### MCP Server (`mcp-server/`)
- TypeScript + Express service, port `3458`
- Built on `@anthropic-ai/claude-agent-sdk` (`^0.2.92`)
- Exposed as `https://arkana.arkade.sh/mcp`
- Lets external AI tools (Claude Desktop, Cursor, etc.) query Arkana's knowledge
- systemd unit: `arkana-mcp.service`

### Slack Bot (`slack-bot/`)
- TypeScript service responding to mentions and DMs as `@arkanaai`
- Bot token from `/root/arkana/secrets/slack.env`
- Channel allowlist enforced (no posts to `#dev`)
- systemd unit: `arkana-slack.service`

### Webhook Relay (`enhanced-github-relay.js`)
- Node.js service on port `3456`
- Receives GitHub webhooks from both ArkLabsHQ and arkade-os orgs
- Posts notifications to `#github-bot`
- Triggers webhook-driven agents (PR review, issue expansion, cross-repo impact)
- systemd unit: `arkana-webhook-relay.service`
- Watchdog process every 5 minutes

### Memory Subsystem (`memory/`)
Shared, append-mostly state across agents:
- `MEMORY.md` — curated long-term company knowledge
- `agent-logs/<agent>/<date>.md` — per-agent run logs
- `executive-digest-queue.json` — pending digest items (flushed by daily-briefing/executive-digest)
- `ci-state.json` — last known CI state across repos
- `pr-review-state.json` — PR review state tracking
- `heartbeat-state.json` — heartbeat poll cycle
- Daily logs `YYYY-MM-DD.md` for raw events

Memory is the **only** path that bypasses the branch+PR rule (agents may push directly to `main` for memory writes only).

### Knowledge Base (`arkwiki/` + `chunks/` + SQLite)
- **arkwiki/** — markdown wiki: per-repo pages, architecture, diagrams, SDK comparisons
- **chunks/** — AST chunks for embedding indexing
- **claude-mem/** worker — port 37777, exposed at `https://arkana.arkade.sh/mem/`
- 676MB SQLite database (`main.sqlite`) backed by Gemini embeddings
- ~1.6s average query time with temporal decay

### GitHub Integration (`bin/gh-token`, `github-integration/`)
- Two GitHub Apps, one per org:
  - ArkLabsHQ → `bin/gh-token arklabshq`
  - arkade-os → `bin/gh-token arkade-os`
- Token TTL ~10 minutes; agents re-auth on org switch
- App ID `2923031` (`arkanaai[bot]`)

### Protocol Tools (`protocol-tools/noa`)
- 6.8MB Go binary for Ark protocol debugging
- Capabilities: address decoding, PSBT analysis, asset packets, taptrees
- Used by agents reviewing protocol-critical code

### Infrastructure (`infrastructure/`)
- Nginx reverse proxy with Let's Encrypt SSL (`nginx-arkana.conf`)
- Permissions and process isolation rules (`openclaw-permissions`)
- UFW firewall (managed externally on the VPS)

## Data Flow Examples

### PR Review (webhook-triggered)
1. PR opened on `arkade-os/arkd` → GitHub sends webhook to relay (port 3456)
2. Relay posts to `#github-bot`, signals Paperclip to spawn `pr-lifecycle` agent
3. Agent loads `agent-configs/pr-lifecycle.md` + `SOUL.md` + `CLAUDE.md`
4. Calls `bin/gh-token arkade-os` to refresh token
5. Reads PR diff, fetches related code via `noa` if protocol-critical
6. Posts structured review comment to PR (no approval — humans only)
7. Appends entry to `memory/pr-review-state.json`

### Daily Briefing
1. Paperclip cron fires `daily-briefing` at 08:00 UTC
2. Agent loads its prompt + reads `memory/executive-digest-queue.json`
3. Synthesizes overnight events from queue + recent memory entries
4. Posts to `#arkana-executive` via `bin/slack-post`
5. Truncates the queue, archives flushed items

### MCP Query (external client)
1. External client (e.g., Claude Desktop) connects to `https://arkana.arkade.sh/mcp`
2. MCP server receives query, calls Claude Agent SDK runtime
3. Runtime queries SQLite KB (semantic search via Gemini embeddings)
4. Response is filtered by **PUBLIC information classification** (no internal context)
5. Result returned via MCP protocol

## Security Boundaries

- **Branch + PR flow** is enforced as a security rule, not a convention
- **Information classification** prevents leakage from internal → public surfaces
- **Token isolation** — each org has its own GitHub App; tokens don't cross orgs
- **Channel allowlist** — agents can only post to whitelisted Slack channels
- **Protocol-critical PRs** require explicit human sign-off; no agent approval
- **Secrets** never enter `memory/` or any committed file

## Reliability

- All systemd services configured for auto-restart
- GitHub token auto-refresh every ~50 minutes
- Webhook watchdog every 5 minutes
- Health checks per service (status endpoints where applicable)

## File Conventions

- Agent prompts: `agent-configs/<name>.md` — markdown with no YAML frontmatter
- Memory daily logs: `memory/YYYY-MM-DD.md`
- Drift reports: `<area>/drift-report.md` (e.g., `ark-docs/drift-report.md`)
- systemd units mirrored in `system-services/` and `systemd/` for redundancy
