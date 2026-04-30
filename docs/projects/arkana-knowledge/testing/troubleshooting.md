# Arkana Knowledge — Troubleshooting

Common issues encountered when operating Arkana, with diagnostic steps and fixes.

## Service Won't Start

### Symptom
```
sudo systemctl status arkana-mcp
... Active: failed (Result: exit-code) ...
```

### Diagnostic
```bash
sudo journalctl -u arkana-mcp -n 200 --no-pager
```

### Common Causes
- **Port already in use** → `ss -lntp | grep 3458` to identify
- **Missing secret** → check `/root/arkana/secrets/*.env` is present and readable
- **Bad TypeScript build** → `cd /root/arkana-knowledge/mcp-server && pnpm run build`
- **Node version mismatch** → check `node --version` against `mcp-server/package.json` engines

## GitHub Token Auth Fails

### Symptom
Agents log `Bad credentials` or `404 Not Found` when calling `gh`.

### Diagnostic
```bash
# Check current token
gh auth status

# Try refresh
/root/arkana/bin/gh-token arklabshq
gh auth status
```

### Common Causes
- **Token expired** (10-min TTL) → re-run `gh-token`
- **Wrong org** → `arkade-os/*` repos need `gh-token arkade-os`, not `arklabshq`
- **App private key missing** → check `/root/arkana/secrets/github-app.pem`
- **App removed from repo** → re-install `arkanaai[bot]` on the affected repo

## Webhook Relay Stops Receiving

### Symptom
No new entries in `#github-bot`, no webhook-triggered agent runs.

### Diagnostic
```bash
sudo systemctl status arkana-webhook-relay
sudo journalctl -u arkana-webhook-relay -n 200 --no-pager
ss -lntp | grep 3456
curl -fs http://localhost:3456/health
```

### Common Causes
- **Process crashed** → watchdog should restart within 5 min; restart manually otherwise
- **GitHub webhook delivery failing** → check repo Settings → Webhooks → Recent Deliveries
- **Nginx misrouted** → verify `infrastructure/nginx-arkana.conf` proxies to `:3456`
- **Firewall blocked** → UFW may have closed the port

### Fix
```bash
sudo systemctl restart arkana-webhook-relay
# If that fails, run from repo
cd /root/arkana-knowledge && node enhanced-github-relay.js
```

## Slack Bot Silent

### Symptom
`@arkanaai` mentions in `#arkana-ai` go unanswered.

### Diagnostic
```bash
sudo systemctl status arkana-slack
sudo journalctl -u arkana-slack -n 100 --no-pager
```

### Common Causes
- **Token revoked** → check Slack workspace admin, regenerate `xoxb-…` if needed
- **Bot removed from channel** → `/invite @arkanaai` in the channel
- **Rate-limited by Slack** → check logs for 429 errors
- **Quiet hours active** — by config, no posts 22:00-07:00 user TZ unless urgent (this is intentional, not a bug)

## Agent Posts to Wrong Channel

### Symptom
Daily briefing appears in `#arkana-ai` instead of `#arkana-executive`, or worse, in `#dev`.

### Action
1. **Stop the affected agent immediately** if it could continue posting
2. Inspect the agent config for hard-coded channel IDs:
   ```bash
   grep -rn 'C0[A-Z0-9]\+' agent-configs/
   ```
3. Cross-check against the canonical channel table in `CLAUDE.md`
4. Open an emergency PR fixing the channel ID
5. **#dev posts are a security incident** — DM kukks immediately

## MCP Returns Stale or Missing Knowledge

### Symptom
External MCP queries return outdated info or "no results."

### Diagnostic
```bash
# Verify MCP responding
curl -fs https://arkana.arkade.sh/mcp -H 'Accept: application/json'

# Check claude-mem worker
curl -fs http://localhost:37777/health

# Look for last embedding refresh
ls -lt memory/sdk-parity-*.md | head -5
```

### Common Causes
- **`config-sync` agent skipped a run** → check `memory/agent-logs/config-sync/`
- **SQLite DB lock** → `lsof main.sqlite` to find the holder
- **New repos not indexed** → run `repo-detector` and `repo-indexer` manually
- **Embedding API rate limit** → check Gemini API quota

## Memory File Conflicts on Push

### Symptom
Agent reports a Git push failure on memory writes.

### Background
Memory writes are the **only** path that pushes directly to `main`. If two agents write simultaneously, the second push fails.

### Fix
Agents should:
1. `git pull --rebase origin main`
2. Re-apply memory write
3. `git push origin main`

If conflict resolution is needed, the agent should log the conflict and skip — a human can reconcile from `memory/agent-logs/`.

## Cron Agent Skipping Runs

### Symptom
A scheduled agent (e.g., `daily-briefing`) didn't fire on schedule.

### Diagnostic
```bash
# Paperclip logs
sudo journalctl -u paperclip -n 500 --no-pager | grep -i daily-briefing

# Heartbeat state
jq . memory/heartbeat-state.json
```

### Common Causes
- **Paperclip stopped** → `sudo systemctl status paperclip`
- **Agent prompt has a parse error** → review markdown for malformed code blocks or YAML
- **Anthropic API down or quota hit** → check OpenRouter fallback, then Claude API status
- **Long-running prior invocation** → previous run still in flight; kill if stuck (look in process table for `claude-agent-sdk`)

## Token Refresh Cron Down

### Symptom
All `gh` calls fail across all agents (cascade).

### Diagnostic
```bash
# Test fresh token
/root/arkana/bin/gh-token arklabshq

# Check cron
crontab -l | grep gh-token
```

### Fix
- Re-add the cron entry if missing
- Verify `/root/arkana/secrets/github-app.pem` exists and has correct perms (`chmod 600`)
- Check App ID matches `2923031` in the script

## SSL / Nginx Issues

### Symptom
`https://arkana.arkade.sh/mcp` returns 502 or certificate error.

### Diagnostic
```bash
sudo nginx -t
sudo systemctl status nginx
sudo certbot certificates
```

### Fix
```bash
# Force cert renewal if expired
sudo certbot renew

# Restore working config
cd /root/arkana-knowledge && ./fix-nginx.sh
```

## Lost SQLite Knowledge Base

### Symptom
`main.sqlite` is missing, corrupted, or rolled back to zero size.

### Recovery
1. Stop services that read it: `sudo systemctl stop arkana-mcp`
2. Restore latest snapshot from S3 (path managed externally)
3. Verify integrity: `sqlite3 main.sqlite 'pragma integrity_check;'`
4. Restart services
5. Trigger `code-refresh` and `repo-indexer` to catch up since snapshot

## Emergency: Suspected Security Incident

If you suspect a leak or compromise:

1. **DM kukks immediately** — do NOT post in public channels
2. If a token may be exposed: regenerate it AND rotate downstream secrets
3. Stop the offending service if active: `sudo systemctl stop <service>`
4. Capture evidence: `sudo journalctl -u <service> --since "1 hour ago" > /tmp/incident.log`
5. Open a private GitHub issue tagged `security`
6. Do not delete logs — preserve for post-mortem

See `security/SECURITY.md` for the full incident response playbook.

## When Things Are Going Right

Quick health check across the stack:

```bash
sudo systemctl is-active paperclip arkana-mcp arkana-slack arkana-webhook-relay
curl -fs http://localhost:3458/health
curl -fs http://localhost:3456/health
curl -fs http://localhost:37777/health
ls -t memory/$(date +%Y)*.md | head -1
./bin/slack-read C0AGK2BGY5A 24 | head -20
```

If all four services are `active`, all three health endpoints respond, today's daily log exists, and the executive channel has recent activity — Arkana is healthy.
