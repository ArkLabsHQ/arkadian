# Arkana Knowledge — How to Run

Production deployment and runtime configuration for Arkana.

## Production Environment

- **Host**: Hetzner CPX32 VPS at `arkana.arkade.sh`
- **Working tree**: `/root/arkana-knowledge/` (separate from cloned arkadian dev location)
- **Repo bin**: `/root/arkana/bin/` (canonical helper script location on prod)
- **Runtime**: Claude Agent SDK (Arkana v2), migrated from OpenClaw on 2026-04-07
- **Process supervisor**: systemd

## systemd Services

All units in `systemd/` (canonical) and `system-services/` (mirror).

| Unit | Purpose | Port |
|------|---------|------|
| `paperclip.service` | Cron-style agent orchestrator | n/a |
| `arkana-mcp.service` | MCP server (TypeScript) | 3458 |
| `arkana-slack.service` | Slack bot (TypeScript) | n/a |
| `arkana-webhook-relay.service` | GitHub webhook receiver (Node.js) | 3456 |

### Install / Upgrade

```bash
# After repo update
cd /root/arkana-knowledge

# Pull latest
git pull origin main

# Sync systemd units
sudo cp systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload

# Restart affected services
sudo systemctl restart paperclip arkana-mcp arkana-slack arkana-webhook-relay
```

### Service Status

```bash
sudo systemctl status paperclip
sudo systemctl status arkana-mcp
sudo systemctl status arkana-slack
sudo systemctl status arkana-webhook-relay

# Last 200 log lines
sudo journalctl -u paperclip -n 200 --no-pager
sudo journalctl -u arkana-mcp -n 200 --no-pager
```

### Auto-Restart

All services are configured with `Restart=on-failure`. They survive reboots and recover automatically from transient crashes.

## Secrets

Loaded by services from `/root/arkana/secrets/`. Never committed to the repo.

| File | Used By |
|------|---------|
| `/root/arkana/secrets/slack.env` | Slack bot, helper scripts |
| `/root/arkana/secrets/github-app.pem` | `bin/gh-token` (signs JWT for App auth) |
| `/root/arkana/secrets/anthropic.env` or OpenRouter equivalent | Claude Agent SDK runtime |
| `/root/arkana/secrets/gemini.env` | Embeddings worker for SQLite KB |
| `/root/arkana/secrets/linear.env` | Linear API access |

Refer to `systemd/secrets.env.example` for the full template.

## Environment Variables (Agent Runtime)

Agents inherit these from systemd unit files:

| Variable | Description | Default |
|----------|-------------|---------|
| `ARKANA_HOME` | Path to arkana-knowledge checkout | `/root/arkana-knowledge` |
| `ARKANA_BIN` | Path to helper bin/ | `/root/arkana/bin` |
| `ARKANA_SECRETS` | Path to secrets dir | `/root/arkana/secrets` |
| `ANTHROPIC_API_KEY` | Claude API key | (from secrets) |
| `OPENROUTER_API_KEY` | OpenRouter primary provider | (from secrets) |
| `SLACK_BOT_TOKEN` | Slack bot xoxb token | (from slack.env) |
| `GITHUB_APP_ID` | App ID for `arkanaai[bot]` | `2923031` |
| `GITHUB_APP_PRIVATE_KEY` | App private key | (from github-app.pem) |
| `LINEAR_API_KEY` | Linear API key | (from secrets) |
| `GEMINI_API_KEY` | Gemini embeddings key | (from secrets) |
| `MCP_PORT` | MCP server port | `3458` |
| `WEBHOOK_RELAY_PORT` | Webhook relay port | `3456` |
| `CLAUDE_MEM_PORT` | claude-mem worker port | `37777` |

## Nginx Configuration

`infrastructure/nginx-arkana.conf` defines:

- TLS termination (Let's Encrypt certificates auto-renewed)
- Reverse proxy: `arkana.arkade.sh/mcp` → `localhost:3458`
- Reverse proxy: `arkana.arkade.sh/mem/` → `localhost:37777`
- WebSocket support for streaming MCP responses

To apply config changes:

```bash
sudo cp infrastructure/nginx-arkana.conf /etc/nginx/sites-available/arkana
sudo nginx -t           # syntax check
sudo systemctl reload nginx
```

The `fix-nginx.sh` script automates the apply+reload flow.

## Cron / Scheduling

Paperclip is the primary scheduler — most agents run on its schedule, not crontab.

OS-level cron jobs (defined externally, not in this repo):

| Schedule | Command | Purpose |
|----------|---------|---------|
| every ~50 min | `bin/gh-token arklabshq && bin/gh-token arkade-os` | Token refresh |
| every 5 min | `pgrep -f enhanced-github-relay.js \|\| systemctl restart arkana-webhook-relay` | Webhook watchdog |
| daily | `./sync-now` | Force-sync of repos and KB |

Inspect with `crontab -l` on the VPS.

## Local Development Mode

For dev, you don't need the full production stack — just the service you're working on.

```bash
# Just the MCP server
cd mcp-server && pnpm install && pnpm run dev

# Just the Slack bot (requires SLACK_BOT_TOKEN env)
cd slack-bot && pnpm install && pnpm run dev

# Webhook relay locally (smoke test)
SLACK_BOT_TOKEN=xoxb-... node enhanced-github-relay.js
```

For agent prompt development, you don't run anything — just edit the markdown and review via PR.

## Operational Endpoints

Once services are running:

```bash
# MCP health
curl -s http://localhost:3458/health

# claude-mem worker health
curl -s http://localhost:37777/health

# Webhook relay health
curl -s http://localhost:3456/health
```

External:

- `https://arkana.arkade.sh/mcp` — MCP server (public)
- `https://arkana.arkade.sh/mem/` — claude-mem worker (auth-gated)

## Backup Strategy

- **Repo**: Backed by GitHub remote (`ArkLabsHQ/arkana-knowledge`)
- **Memory**: Pushed to `main` automatically by agents (durable)
- **SQLite KB**: Snapshotted to S3 nightly (configured externally)
- **Secrets**: Stored in 1Password vault, restored on VPS rebuild

## Disaster Recovery

If the VPS is lost:

1. Provision new Hetzner CPX32 + DNS
2. `git clone git@github.com:ArkLabsHQ/arkana-knowledge.git /root/arkana-knowledge`
3. Restore secrets to `/root/arkana/secrets/` from 1Password
4. Restore SQLite KB from latest S3 snapshot to where claude-mem expects it
5. `sudo cp systemd/*.service /etc/systemd/system/ && systemctl daemon-reload`
6. Apply nginx config: `./fix-nginx.sh`
7. Start services: `sudo systemctl start paperclip arkana-mcp arkana-slack arkana-webhook-relay`
8. Verify health endpoints
