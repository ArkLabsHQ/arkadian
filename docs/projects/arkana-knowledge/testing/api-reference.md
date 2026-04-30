# Arkana Knowledge — API Reference

Reference for the network-exposed surfaces of the Arkana stack.

## MCP Server (port 3458)

The MCP server speaks the Model Context Protocol over HTTP/WebSocket. External AI tools (Claude Desktop, Cursor, etc.) connect to it to query Arkana's knowledge.

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness probe |
| ANY | `/mcp` | MCP protocol endpoint (JSON-RPC over HTTP/WS) |

Public URL: `https://arkana.arkade.sh/mcp`

### Health Check

```bash
curl -fs http://localhost:3458/health
# 200 OK on healthy
```

### MCP Capabilities Exposed

Defined in `mcp-server/src/server.ts`. Built on `@anthropic-ai/claude-agent-sdk` v0.2.92.

The server exposes Arkana's semantic knowledge base + selected tools. Capabilities are subject to change as the runtime is configured by code, not by static manifest in this repo. To see live capabilities:

```bash
# MCP capability discovery (initialize handshake)
# Use an MCP client library; raw curl is not idiomatic
```

### Information Classification Filter

**All MCP responses are filtered to PUBLIC information.** Never includes:
- Linear ticket details
- Slack conversation contents
- Internal team dynamics
- Unreleased plans
- Security findings

This is enforced in the runtime by the prompts loaded from `SOUL.md` and `security/INFORMATION-CLASSIFICATION.md`.

## Webhook Relay (port 3456)

Receives GitHub webhooks for both ArkLabsHQ and arkade-os organizations.

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/github` | GitHub webhook delivery target |
| GET | `/health` | Liveness probe |

Implementation: `enhanced-github-relay.js` (Node.js).

### Supported Events

- `pull_request` (opened, synchronize, ready_for_review, closed) → triggers `pr-lifecycle`
- `issues` (opened, edited) → triggers `issue-triage`
- `push` (to default branch) → may trigger `cross-repo-impact` for API changes
- `release` (published) → triggers `release-coordinator`
- `issue_comment`, `pull_request_review_comment` → triggers `slack-monitor` analog
- `security_advisory`, `repository_vulnerability_alert` → triggers `security-triage`

The relay also forwards selected events to `#github-bot` via Slack.

### Security

- Validates `X-Hub-Signature-256` HMAC against the App webhook secret
- Drops events from unknown repos
- Rate-limited per-repo to prevent floods

## claude-mem Worker (port 37777)

Persistent memory worker exposed at `https://arkana.arkade.sh/mem/`.

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness probe |
| POST | `/observations` | Append a new observation to memory |
| GET | `/search` | Semantic search across stored memory |
| GET | `/observations/recent` | Recent memory entries |

Auth-gated — only callable from the VPS itself or via authenticated reverse-proxy.

## Slack Bot (no HTTP endpoint)

The Slack bot is a Slack app that uses the Events API and Socket Mode (or Web API). It does not expose an HTTP listener of its own — events flow through Slack's infrastructure.

### Behavior Surface

| Trigger | Behavior |
|---------|----------|
| `@arkanaai <message>` in any allowlisted channel | Bot replies in thread |
| DM to `@arkanaai` | Bot replies in DM (responsive, thorough) |
| Mention in `#dev` (forbidden channel) | Bot does NOT respond |

### Rate Limits (self-imposed)

- Max 50 messages/hour total
- Max 5 DMs/hour to any one person
- Quiet hours 22:00-07:00 user TZ unless urgent

## Helper Scripts (CLI, not network-exposed)

These live in `bin/` (or `/root/arkana/bin/` in production) and are documented here because they are part of the agent-facing API.

### `gh-token <org>`

```
Usage: gh-token <arklabshq | arkade-os>
```

Issues a fresh installation access token for the given org's GitHub App. Token TTL ~10 minutes. Stores it where `gh` CLI will pick it up.

### `slack-post <channel-id> <message>`

```
Usage: slack-post <channel-id> "<message>"
```

Posts a message to the given Slack channel via bot token. Channel ID must be in the allowlist; posts to forbidden channels are rejected.

### `slack-read <channel-id> [hours-ago]`

```
Usage: slack-read <channel-id> [hours-ago=24]
```

Reads recent messages from a channel.

### `protocol-tools/noa <subcommand>`

Ark protocol debugging binary. See `protocol-tools/README.md` for full docs. Subcommands: `address`, `script`, `note`, `taptree`, `psbt`.

## Configuration Files (consumed by services)

These are not APIs in the network sense, but services treat them as input contracts.

| File | Consumed By | Format |
|------|-------------|--------|
| `agent-configs/<name>.md` | Paperclip + Claude Agent SDK runtime | Markdown system prompt |
| `SOUL.md`, `AGENTS.md`, `CLAUDE.md` | Claude Agent SDK runtime (every session) | Markdown |
| `memory/MEMORY.md` | All agents (read on session start) | Markdown |
| `memory/executive-digest-queue.json` | daily-briefing, executive-digest | JSON array |
| `memory/ci-state.json` | release-coordinator, pr-lifecycle | JSON object |
| `memory/pr-review-state.json` | pr-lifecycle | JSON object |
| `memory/heartbeat-state.json` | slack-monitor | JSON object |
| `systemd/*.service` | systemd | systemd unit format |
| `infrastructure/nginx-arkana.conf` | nginx | nginx config |

### executive-digest-queue.json schema

```json
[
  {
    "agent": "<agent-name>",
    "emoji": "<single emoji>",
    "title": "<short title>",
    "summary": "<one-paragraph summary>",
    "urls": ["https://...", "https://..."],
    "timestamp": "<ISO 8601>"
  }
]
```

Most agents append to this queue rather than posting to Slack directly. The queue is flushed by `daily-briefing` and `executive-digest`.

## What Is NOT Exposed

- The agents themselves are not network-callable — Paperclip invokes them in-process
- The SQLite KB is not directly queryable — go through MCP or claude-mem
- GitHub App credentials are never exposed via any API
- `memory/` is read-only to external clients (agents write directly via git)
