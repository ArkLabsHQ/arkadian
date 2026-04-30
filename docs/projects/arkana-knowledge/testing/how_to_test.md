# Arkana Knowledge — How to Test

This repo is **mostly configuration and prompts**, not application code, so traditional unit/integration tests apply only to `mcp-server/` and `slack-bot/`. The rest is validated by review and live operation.

## What's Testable Here

| Component | Testability | How |
|-----------|------------|-----|
| Agent prompts (`agent-configs/*.md`) | Manual review | Read the markdown, run through scenarios mentally |
| MCP server (`mcp-server/`) | Unit + smoke | TypeScript tests if present, `curl` smoke tests |
| Slack bot (`slack-bot/`) | Unit + smoke | TypeScript tests if present, send test mention |
| Webhook relay (`enhanced-github-relay.js`) | Smoke | Replay a real GitHub webhook payload |
| Helper scripts (`bin/`) | Smoke | Run with test inputs, inspect output |
| Knowledge base | Query smoke | MCP query → check result quality |
| Memory writes | Manual diff | Read updated daily log, verify format |

## MCP Server Tests

```bash
cd mcp-server
pnpm install

# If a test script exists in package.json
pnpm test

# Build to catch type errors
pnpm run build
```

The published `package.json` ships `build` / `start` / `dev` scripts only — there is no test target by default. Type-checking via `tsc` is the closest thing to a unit test.

### MCP Smoke Test

```bash
# Start dev server
pnpm run dev &

# Hit the health endpoint
curl -s http://localhost:3458/health

# Probe a tool / capability if exposed (depends on src/server.ts)
# Inspect server logs for errors
```

## Slack Bot Tests

```bash
cd slack-bot
pnpm install
pnpm run build       # type check
```

To smoke-test live:

1. Set `SLACK_BOT_TOKEN` in env
2. Run `pnpm run dev`
3. Send `@arkanaai ping` in `#arkana-ai`
4. Verify response

## Webhook Relay Smoke Test

```bash
# Run locally
SLACK_BOT_TOKEN=xoxb-... node enhanced-github-relay.js

# In another shell, replay a webhook
curl -X POST http://localhost:3456/github \
  -H 'Content-Type: application/json' \
  -H 'X-GitHub-Event: pull_request' \
  -d @test-fixtures/pr-opened.json
```

Test fixtures are not committed — capture real webhooks from a test repo with a temporary forwarding tunnel (e.g., smee.io).

## Validating Agent Prompts (Manual)

Before opening a PR that changes an agent prompt:

1. **Re-read `SOUL.md`** — does the change conflict with Arkana's identity?
2. **Re-read `AGENTS.md`** — does it respect escalation policy?
3. **Re-read `CLAUDE.md`** — does it respect branch+PR rules and channel allowlist?
4. **Re-read `security/INFORMATION-CLASSIFICATION.md`** — does any new behavior risk leaking internal info?
5. **Walk through 3 scenarios** the agent will encounter:
   - Happy path
   - Edge case (e.g., webhook with missing fields)
   - Adversarial case (e.g., someone in Slack asks for a forbidden action)

There is no automated harness for this — judgment + review only.

## Helper Script Smoke Tests

```bash
# Token issuance (will fail without GitHub App private key)
./bin/gh-token arklabshq && echo OK

# Slack post (sends a real message — use a test channel!)
./bin/slack-post C0AG924QGN7 "smoke-test $(date +%s)"

# Slack read (read-only)
./bin/slack-read C0AG924QGN7 1
```

## Drift Check

```bash
./scripts/drift-check.sh
```

This compares the in-repo arkwiki/ark-docs/arkade-docs snapshots against upstream and reports drift in `<area>/drift-report.md`. Run before merging significant doc updates.

## Pre-Commit Validation

Before opening a PR:

```bash
# 1. Ensure no secrets snuck in
git diff --cached | grep -iE 'password|secret|api[_-]?key|token|xoxb-|ghp_|sk-' && echo "POTENTIAL SECRET — REVIEW!" || echo "Clean"

# 2. Ensure you're on a branch (never on main)
[ "$(git symbolic-ref --short HEAD)" = "main" ] && echo "ON MAIN — STOP" || echo "On branch: $(git symbolic-ref --short HEAD)"

# 3. Type-check TS code if you changed it
[ -d mcp-server ] && (cd mcp-server && pnpm run build)
[ -d slack-bot ]  && (cd slack-bot  && pnpm run build)
```

## Memory File Format Validation

Daily logs (`memory/YYYY-MM-DD.md`) and the long-term `memory/MEMORY.md` are free-form markdown but must:

- Tag entries with source: `[from: daily-briefing]`, `[from: slack-dm]`, `[from: pr-review]`
- Never contain secrets (tokens, keys, passwords)
- Never quote private DM content (summarize topic only)

Spot-check with:

```bash
# Find any entries missing a source tag
grep -L '\[from:' memory/$(date +%Y-%m-%d).md && echo "Missing source tag"

# Check for accidental secret-like patterns
grep -iE 'xoxb-|ghp_|sk-[a-zA-Z0-9]{20,}|password\s*:|secret\s*:' memory/*.md
```

## Production Health Verification

After a deploy, verify the live stack:

```bash
# Service status
sudo systemctl is-active paperclip arkana-mcp arkana-slack arkana-webhook-relay

# Health endpoints
curl -fs http://localhost:3458/health && echo "MCP OK"
curl -fs http://localhost:3456/health && echo "Webhook relay OK"
curl -fs http://localhost:37777/health && echo "claude-mem OK"

# Recent agent activity
ls -t memory/agent-logs/*/$(date +%Y-%m-%d).md | head

# Recent daily-briefing post
./bin/slack-read C0AGK2BGY5A 12 | head -50
```

## What's NOT Tested Automatically

- Agent reasoning quality (manual review during prompt updates)
- Schedule timing (Paperclip cron correctness — observed via run logs)
- Knowledge base relevance (judged via MCP query results)
- Information classification adherence (audited by sampling agent outputs)

Treat these as **operational quality** concerns: monitor agent-logs and Slack outputs, catch regressions by observation.
