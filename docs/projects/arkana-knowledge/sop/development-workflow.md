# Arkana Knowledge — Development Workflow

How to safely make changes to `arkana-knowledge`.

## Golden Rules

1. **Never push to `main` on this repo** (exception: agent memory writes only)
2. **Never commit secrets** — tokens, keys, passwords are forbidden
3. **Branch + PR + human review** for everything else
4. **Re-read `SOUL.md`, `AGENTS.md`, `CLAUDE.md`** before changing agent behavior
5. **Information classification**: don't add anything to PUBLIC surfaces that includes internal context

## Branch Naming

For human contributors:

```
feat/<short-description>
fix/<short-description>
docs/<short-description>
```

For agent-authored PRs:

```
agent/{agent-name}/{YYYY-MM-DD}-{short-description}
```

PR title for agent-authored PRs: `[Agent: {name}] {description}`

## Workflow

### 1. Sync

```bash
cd /root/arkana-knowledge   # production
# or wherever your dev clone lives
git checkout main
git pull origin main
```

### 2. Branch

```bash
git checkout -b feat/tweak-pr-lifecycle-tone
```

### 3. Edit

Common change types and where they live:

| Change | Location |
|--------|----------|
| Tweak agent behavior | `agent-configs/<name>.md` |
| Add a new agent | `agent-configs/<name>.md` + Paperclip schedule (external) |
| Update global rules | `CLAUDE.md`, `AGENTS.md`, `SOUL.md` |
| Add/edit channel | `CLAUDE.md` (Slack channels table) |
| MCP server feature | `mcp-server/src/...` |
| Slack bot feature | `slack-bot/src/...` |
| Webhook handling | `enhanced-github-relay.js` |
| Helper script | `bin/<name>` |
| Operational script | `scripts/<name>.sh` |
| Knowledge base entry | `arkwiki/<area>/<page>.md` |
| Security policy | `security/<doc>.md` |
| Internal policy | `policies/<doc>.md` |
| Service definition | `systemd/<unit>.service` (also mirror to `system-services/`) |
| Nginx config | `infrastructure/nginx-arkana.conf` |

### 4. Validate Locally

```bash
# Did you accidentally include a secret?
git diff --cached | grep -iE 'password|secret|api[_-]?key|token|xoxb-|ghp_|sk-' && echo "REVIEW!" || echo "Clean"

# TypeScript changes type-check?
[ -d mcp-server ] && (cd mcp-server && pnpm install && pnpm run build)
[ -d slack-bot  ] && (cd slack-bot  && pnpm install && pnpm run build)

# Markdown looks right?
grep -L '^#' agent-configs/*.md && echo "Some files lack a heading"
```

### 5. Commit

Conventional commit format:

```
<type>(<scope>): <description>
```

Examples:

```
feat(agents): add weekly contributor highlight to team-pulse-weekly
fix(mcp): handle empty query gracefully
docs(agents): clarify escalation rule for security-triage
chore(systemd): bump arkana-mcp restart limit
```

### 6. Open PR

```bash
git push -u origin HEAD
gh pr create --base main
```

PR description should include:

- **What changed**
- **Why** (link to issue, conversation, observation)
- **Trigger source** if agent-authored
- **Risk assessment** if behavior-changing
- **Manual test plan** (since most things lack automated tests)

### 7. Review

Self-review checklist:

- [ ] No secrets in diff
- [ ] No `#dev` channel ID added anywhere
- [ ] No agent-config change that could leak internal info to public surfaces
- [ ] No bypass of branch+PR rule
- [ ] No protocol-critical code being approved automatically
- [ ] systemd unit changes mirrored to both `systemd/` and `system-services/`

Request review from kukks or the relevant domain owner.

### 8. Merge & Deploy

After approval:

```bash
gh pr merge --squash --delete-branch
```

Production deploy on the VPS:

```bash
ssh arkana.arkade.sh
cd /root/arkana-knowledge
git pull origin main

# If systemd units changed
sudo cp systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl restart <affected-services>

# If TypeScript changed
cd mcp-server && pnpm install && pnpm run build
cd ../slack-bot && pnpm install && pnpm run build
sudo systemctl restart arkana-mcp arkana-slack

# If nginx config changed
sudo nginx -t && sudo systemctl reload nginx
# or
./fix-nginx.sh
```

### 9. Verify

```bash
sudo systemctl is-active paperclip arkana-mcp arkana-slack arkana-webhook-relay
curl -fs http://localhost:3458/health && echo MCP OK
sudo journalctl -u <changed-service> -n 50 --no-pager
```

## Special Cases

### Memory Writes (agents only)

Agents writing to `memory/` push directly to `main`. This is the **only** exception to the branch+PR rule. Agents must:

- Tag entries with source: `[from: <agent-name>]`
- Never include secrets
- Summarize private content rather than quoting
- `git pull --rebase` before push to avoid conflicts

### Agent Config Changes

Before merging:

1. Walk through 3 scenarios mentally (happy / edge / adversarial)
2. Check that the agent still respects:
   - Branch+PR flow
   - Information classification
   - Channel allowlist
   - "Never approve protocol-critical PRs" rule
3. If it changes when/how the agent posts, sanity-check rate limits

### Protocol-Critical Changes

Code in any external repo that touches **VTXOs, transaction signing, forfeit paths, round lifecycle, connector trees, or exit paths** is protocol-critical. Agents reviewing such PRs must always flag for human review and never approve.

This rule lives in `SOUL.md`. Don't water it down without explicit kukks sign-off.

### Adding a New Slack Channel

To allow agents to post in a new channel:

1. Add the channel ID + name + purpose to the table in `CLAUDE.md`
2. If forbidden, also add it to the explicit forbidden list (currently `#dev`)
3. Update `agent-configs/` for any agent that will post there
4. Open a PR — explain why this channel is needed

### Rotating GitHub App Credentials

```bash
# Generate new private key in GitHub App settings
# Replace /root/arkana/secrets/github-app.pem with new key
# Restart token cron immediately (or wait ~50min for next refresh)
/root/arkana/bin/gh-token arklabshq && gh auth status
/root/arkana/bin/gh-token arkade-os  && gh auth status
```

Old key remains valid until removed in GitHub settings — leave a 24h overlap to prevent agent outages.

### Production Hotfix

When prod is broken and waiting on PR review is infeasible:

1. DM kukks for explicit override
2. Make the smallest possible change on a branch
3. Open the PR
4. Merge with kukks's verbal/typed approval
5. Document the override in `memory/MEMORY.md`

This is rare — ~1-2 times per year. The branch+PR rule is not optional in the normal case.

## Reference

- `SOUL.md` — Arkana's identity and operating principles
- `AGENTS.md` — Workspace conventions and escalation policy
- `CLAUDE.md` — Global rules (auth, branch policy, Slack channels)
- `security/SECURITY.md` — Security enforcement details
- `security/INFORMATION-CLASSIFICATION.md` — What goes where
- `security/PRIVILEGES.md` — Per-agent access levels
