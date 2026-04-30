# Arkana Knowledge — Usage

Quick start guide for working with `arkana-knowledge` locally and on the production VPS.

## Prerequisites

- **Node.js 18+** and **pnpm** for `mcp-server/` and `slack-bot/`
- **Git** with SSH access to `github.com:ArkLabsHQ/arkana-knowledge.git`
- **systemd** (production) — services run as systemd units
- For agent execution: access to Anthropic Claude API or OpenRouter API key
- Slack bot token (production) at `/root/arkana/secrets/slack.env`
- GitHub App private key (production) for the two App tokens

## Clone the Repository

```bash
git clone git@github.com:ArkLabsHQ/arkana-knowledge.git
cd arkana-knowledge
```

## Reading Agent Configs

Agent prompts live in `agent-configs/` as plain markdown. To inspect what an agent does, just read the file:

```bash
cat agent-configs/pr-lifecycle.md
cat agent-configs/security-triage.md
```

There is **no automated test framework** for prompts — they are reviewed by humans before merge.

## Running the MCP Server (development)

```bash
cd mcp-server
pnpm install
pnpm run dev          # tsx src/server.ts (hot reload via tsx)
```

Server listens on the port configured in `src/server.ts` (default `3458` in production).

To build and run the production bundle:

```bash
pnpm run build        # tsc → dist/
pnpm run start        # node dist/server.js
```

## Running the Slack Bot (development)

```bash
cd slack-bot
pnpm install
pnpm run dev          # or pnpm run start depending on script
```

Requires `SLACK_BOT_TOKEN` (xoxb-…) in env. In production this is sourced from `/root/arkana/secrets/slack.env`.

## Helper Scripts (`bin/`)

```bash
# Refresh GitHub App token for the ArkLabsHQ org
./bin/gh-token arklabshq

# Refresh GitHub App token for the arkade-os org
./bin/gh-token arkade-os

# Post a message to a Slack channel
./bin/slack-post C0AGK2BGY5A "Test message"

# Read recent Slack messages from a channel (default: last 24h)
./bin/slack-read C0AG924QGN7 [hours-ago]
```

Tokens are valid ~10 minutes. Re-run `gh-token` when switching orgs.

## Operational Scripts

```bash
# Drift detection across repos
./scripts/drift-check.sh

# Force-sync of repos and memory now
./sync-now

# Fix nginx config and reload
./fix-nginx.sh
```

## Working on Agent Prompts

```bash
# Always work on a branch
git checkout -b agent/pr-lifecycle/$(date +%Y-%m-%d)-tweak-tone

# Edit
$EDITOR agent-configs/pr-lifecycle.md

# Review the diff
git diff agent-configs/pr-lifecycle.md

# Commit and open PR — never push to main
git add agent-configs/pr-lifecycle.md
git commit -m "[Agent: pr-lifecycle] Tone tweak: less corporate"
git push -u origin HEAD
gh pr create
```

The branch+PR flow is **mandatory**. The only exception is writes to `memory/` by agents themselves.

## Inspecting Memory

```bash
# Curated long-term knowledge
cat memory/MEMORY.md

# Yesterday's daily log
cat memory/$(date -u -d 'yesterday' +%Y-%m-%d).md

# Pending executive digest items
jq . memory/executive-digest-queue.json

# Last CI state snapshot
jq . memory/ci-state.json

# PR review state
jq . memory/pr-review-state.json
```

**Never store secrets in memory files.** Tokens, keys, and passwords are forbidden. Daily logs may summarize topics from DMs but must not quote message bodies.

## Querying the Knowledge Base (via MCP)

External tools can connect to the production MCP endpoint:

```
https://arkana.arkade.sh/mcp
```

Or, on the VPS itself:

```bash
curl -s http://localhost:3458/health
```

Knowledge served by MCP is filtered to the **PUBLIC** classification — never internal context.

## Stopping/Restarting Services (production VPS)

```bash
sudo systemctl status paperclip
sudo systemctl restart arkana-mcp
sudo systemctl restart arkana-slack
sudo systemctl restart arkana-webhook-relay
sudo journalctl -u paperclip -n 200 --no-pager
```

Service unit files live in `systemd/` (canonical) and `system-services/` (mirror).

## Common Tasks

| I want to… | Do this |
|------------|---------|
| Tweak how an agent responds | Edit `agent-configs/<name>.md` on a branch, open PR |
| Add a new scheduled agent | Add config in `agent-configs/`, register in Paperclip schedule, open PR |
| Change Slack channel rules | Edit `CLAUDE.md` and `AGENTS.md`, open PR |
| Audit what an agent did | Read `memory/agent-logs/<name>/YYYY-MM-DD.md` |
| Add a webhook-triggered behavior | Edit `enhanced-github-relay.js`, restart relay |
| Update arkwiki for a repo | Edit `arkwiki/repos/<repo>.md`, open PR |
| Rotate GitHub App tokens | Run `bin/gh-token <org>` (cron does this every ~50min) |
