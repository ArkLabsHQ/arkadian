# Arkana Knowledge — Project Overview

## What is arkana-knowledge?

`arkana-knowledge` is the configuration, knowledge base, and audit trail for **Arkana**, the always-on AI assistant deployed by Ark Labs on a private VPS. The repository contains everything needed to operate Arkana: agent system prompts, the deep arkwiki knowledge base, the MCP server, the Slack bot, GitHub webhook integration, infrastructure configs, security policies, and shared agent memory.

Arkana monitors repos across [ArkLabsHQ](https://github.com/ArkLabsHQ) and [arkade-os](https://github.com/arkade-os), reviews PRs, triages issues, surfaces security findings, and runs 16 scheduled agents that keep the engineering org healthy. She runs on the [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk), orchestrated by Paperclip.

## Key Features

### Agent Orchestration
- **16 specialized AI agents** with markdown system prompts in `agent-configs/`
- Schedules range from continuous (slack-monitor) to weekly (team-pulse-weekly)
- Agents communicate via the **executive-digest-queue** to avoid Slack noise

### Multi-Channel Integrations
- **Slack** — bot identity `@arkanaai`, channel allowlist enforced
- **GitHub** — App identity `arkanaai[bot]`, dual-org auth (ArkLabsHQ + arkade-os)
- **Linear** — read access for cross-referencing tickets, write limited to issue-expander agent
- **MCP** — Model Context Protocol server for external AI tool integration

### Knowledge Base
- **arkwiki/** — deep per-repo wiki pages, cross-repo architecture, diagrams, SDK comparisons
- **memory/MEMORY.md** — curated long-term company knowledge
- **memory/agent-logs/** — per-agent run logs
- **chunks/** — AST chunks supporting semantic search via Gemini embeddings

### Security & Safety
- **Information Classification** policy (PUBLIC / INTERNAL / CONFIDENTIAL)
- **Branch + PR flow** mandatory for all external repo writes
- **Protocol-critical code** (VTXOs, signing, forfeit paths) always flagged for human review
- Per-agent privileges tracked in `security/PRIVILEGES.md`

### Production Infrastructure
- Hetzner CPX32 VPS at `arkana.arkade.sh`
- systemd-managed services: paperclip, MCP server, slack-bot, webhook-relay
- Nginx reverse proxy with Let's Encrypt SSL
- Auto-renewing GitHub App tokens (every ~50 minutes)
- Webhook watchdog every 5 minutes

## Tech Stack

- **Markdown** — agent system prompts, policies, knowledge base
- **TypeScript** — MCP server (`mcp-server/`), Slack bot (`slack-bot/`)
- **Node.js** — webhook relay (`enhanced-github-relay.js`)
- **Bash** — operational scripts (`scripts/`, `bin/`, `sync-now`, `fix-nginx.sh`)
- **systemd** — service management (`systemd/`, `system-services/`)
- **Nginx** — reverse proxy and SSL termination (`infrastructure/`)
- **SQLite** — semantic knowledge base (676MB `main.sqlite`)
- **Gemini API** — embeddings for semantic search
- **OpenRouter / Anthropic** — primary (GLM-5) and fallback (Claude) LLM providers
- **Go** — `protocol-tools/noa` binary for Ark protocol debugging

## Use Cases

### Engineering Operations
- Daily executive briefings to `#arkana-executive`
- Real-time PR reviews on PRs across all monitored repos
- Issue triage and expansion (stub issues → fully-described)
- Cross-repo impact analysis when APIs change

### Knowledge Access
- MCP server lets external tools query Arkana's semantic KB
- 59+ repositories indexed, 6,422+ AST chunks
- ~1.6s average query time with temporal decay

### Team Productivity
- Onboarding-buddy welcomes new contributors
- Nudge-bot pokes stale PRs/issues
- Team pulse reports (daily activity + Friday velocity)
- Self-improver retrospective every Sunday

### SDK Parity Tracking
- `sdk-parity` agent compares feature coverage across Go, TS, Rust, .NET SDKs
- Daily reports surface gaps in `memory/sdk-parity-YYYY-MM-DD.md`

### Security & Compliance
- security-triage agent monitors security-relevant changes every 2h
- Critical findings escalated directly to `#arkana-executive`
- All agent activity audited via `memory/agent-logs/`

## Repository Structure (high-level)

```
arkana-knowledge/
├── agent-configs/         # 16 agent system prompts (markdown)
├── arkwiki/               # Deep knowledge base
├── bin/                   # Helper scripts (gh-token, slack-post, slack-read)
├── infrastructure/        # Nginx configs, openclaw permissions
├── mcp-server/            # TypeScript MCP server (port 3458)
├── memory/                # Shared agent memory and state
├── policies/              # Internal policy docs
├── protocol-tools/        # noa binary for Ark protocol debugging
├── scripts/               # Operational scripts
├── security/              # SECURITY.md, INFORMATION-CLASSIFICATION.md, PRIVILEGES.md
├── slack-bot/             # TypeScript Slack bot
├── system-services/       # systemd unit files (mirrored)
├── systemd/               # systemd unit files (canonical)
└── templates/             # Reusable prompt + output templates
```

## Top-Level Docs

| File | Purpose |
|------|---------|
| `SOUL.md` | Arkana's character and operating principles |
| `AGENTS.md` | Workspace conventions and escalation policy |
| `CLAUDE.md` | Global rules (auth, branch policy, Slack channels) |
| `HEARTBEAT.md` | Active monitoring checklist |
| `COMPONENTS.md` | Infrastructure component inventory |
| `TOOLS.md` | Available tools and scripts |
| `USER.md` | User context (preferences, timezone) |
| `BOOTSTRAP.md` | First-run identity bootstrap |

## Repository Status

- **Repository**: `github.com/ArkLabsHQ/arkana-knowledge`
- **Status**: Production
- **Visibility**: Private
- **Active Agents**: 16
- **Knowledge Base Size**: 676MB SQLite, 59+ repos indexed, 6,422+ AST chunks
- **Deployment**: Hetzner CPX32 VPS at `arkana.arkade.sh`
- **Runtime**: Claude Agent SDK (Arkana v2), orchestrated by Paperclip
