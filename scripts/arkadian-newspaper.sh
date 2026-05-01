#!/usr/bin/env bash
# arkadian-newspaper.sh
#
# Generate the morning newspaper for dusan and (optionally) post it to
# Slack as a DM. Reads:
#   - today's daily-changelog (produced by arkadian-daily-update.sh)
#   - arkana-knowledge memory (slack-log, research-monitor, sdk-parity)
#   - last-24h commits in priority repos via the Bash tool
#
# Writes:
#   $ARKADIAN_DIR/docs/daily-newspaper/<DATE>.md
#
# Slack delivery happens *inside* the Claude invocation via the managed
# Slack connector (already authenticated at the claude.ai account level
# — no per-machine token needed). The prompt instructs Claude to call
# slack_send_message after writing the file. If Slack is unreachable
# the file on disk is still the source of truth.
#
# Run via cron in DEVELOPMENT mode (plain claude), NOT via the arkadian
# wrapper — guardrails would block Bash.

set -u

# ---- config ---------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARKADIAN_DIR="${ARKADIAN_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
ENV_FILE="$ARKADIAN_DIR/.env"
LOG_DIR="${LOG_DIR:-$ARKADIAN_DIR/log/newspaper}"
DATE="$(date +%Y-%m-%d)"
LOG_FILE="$LOG_DIR/run-$DATE.log"
NEWS_DIR="$ARKADIAN_DIR/docs/daily-newspaper"
NEWS_FILE="$NEWS_DIR/$DATE.md"
PROMPT_FILE="$SCRIPT_DIR/arkadian-newspaper.prompt"
CLAUDE_BIN="${CLAUDE_BIN:-$(command -v claude || echo /usr/local/bin/claude)}"
# Allow the managed Slack connector tools alongside the usual filesystem
# and shell tools. The mcp__* wildcard catches any managed-connector
# tools registered at the claude.ai account level (Slack lives there).
CLAUDE_TOOLS="${CLAUDE_TOOLS:-Bash,Read,Write,Edit,Glob,Grep,Skill,mcp__*}"
GIT_TIMEOUT="${GIT_TIMEOUT:-120}"
# ---------------------------------------------------------------------------

mkdir -p "$LOG_DIR" "$NEWS_DIR"

log() { printf '[%s] %s\n' "$(date '+%F %T')" "$*" | tee -a "$LOG_FILE"; }

# ---- preflight ------------------------------------------------------------
if [ ! -f "$ENV_FILE" ]; then
  log "ERROR: $ENV_FILE not found. Run \`make generate-env\` in $ARKADIAN_DIR first."
  exit 1
fi
if [ ! -f "$PROMPT_FILE" ]; then
  log "ERROR: prompt file missing: $PROMPT_FILE"
  exit 1
fi

# Load .env so the prompt can see *_REPO paths.
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

# Resolve arkana-knowledge path: prefer ARKANA_KNOWLEDGE_REPO from .env
# (written by generate-env.sh's auto-detect/clone), fall back to a
# legacy ARKANA_KNOWLEDGE_DIR if someone set it in env or .env directly.
# If both are unset, we just don't refresh arkana memory — Claude can
# still pull live Slack via the managed connector.
ARKANA_KNOWLEDGE_DIR="${ARKANA_KNOWLEDGE_REPO:-${ARKANA_KNOWLEDGE_DIR:-}}"
export ARKADIAN_DIR ARKANA_KNOWLEDGE_DIR

if ! command -v "$CLAUDE_BIN" >/dev/null 2>&1; then
  log "ERROR: claude CLI not found at '$CLAUDE_BIN'. Set CLAUDE_BIN env var."
  exit 1
fi

log "==== Newspaper for $DATE ===="
log "ARKADIAN_DIR=$ARKADIAN_DIR"
log "ARKANA_KNOWLEDGE_DIR=$ARKANA_KNOWLEDGE_DIR"

# ---- Step 1: refresh arkana-knowledge so memory is current ----------------
if [ -z "$ARKANA_KNOWLEDGE_DIR" ]; then
  log "INFO: ARKANA_KNOWLEDGE_REPO not set in .env — skipping memory refresh."
  log "      Run \`make generate-env\` (or rm .env && make generate-env) to auto-detect."
  log "      Newspaper will rely on the live Slack connector for Slack content."
elif [ -d "$ARKANA_KNOWLEDGE_DIR/.git" ]; then
  if ! pull_out=$(timeout "$GIT_TIMEOUT" git -C "$ARKANA_KNOWLEDGE_DIR" pull --ff-only --quiet 2>&1); then
    log "WARN: arkana-knowledge pull failed (continuing with stale memory)"
    printf '%s\n' "$pull_out" | sed 's/^/      /' | tee -a "$LOG_FILE" >/dev/null
  fi
else
  log "WARN: $ARKANA_KNOWLEDGE_DIR is not a git repo — using whatever's on disk"
fi

# ---- Step 2: invoke Claude with the newspaper prompt ----------------------
log "Invoking Claude (this can take 1-3 minutes)..."

prompt_text="$(cat "$PROMPT_FILE")"

if ! claude_out=$(cd "$ARKADIAN_DIR" && timeout 600 "$CLAUDE_BIN" \
       -p "$prompt_text" \
       --allowedTools "$CLAUDE_TOOLS" \
       2>&1); then
  log "ERROR: claude invocation failed:"
  printf '%s\n' "$claude_out" | sed 's/^/      /' | tee -a "$LOG_FILE" >/dev/null
  exit 1
fi

# Capture full Claude output to log for debug.
printf '%s\n' "$claude_out" >> "$LOG_FILE"

if [ ! -f "$NEWS_FILE" ]; then
  log "ERROR: newspaper file not found at $NEWS_FILE"
  log "Last line of Claude output: $(printf '%s' "$claude_out" | tail -1)"
  exit 2
fi

word_count="$(wc -w < "$NEWS_FILE" | tr -d ' ')"
log "Newspaper written: $NEWS_FILE (${word_count} words)"

# Slack delivery already happened inside the Claude call (see prompt).
# The prompt instructs Claude to emit a deterministic marker line
# `SLACK_OK <ref>` on success or `SLACK_FAILED <reason>` on failure.
slack_marker="$(printf '%s\n' "$claude_out" | grep -E '^SLACK_(OK|FAILED) ' | tail -1)"
case "$slack_marker" in
  "SLACK_OK "*)
    log "Slack delivery confirmed: ${slack_marker#SLACK_OK }"
    ;;
  "SLACK_FAILED "*)
    log "WARN: Slack delivery FAILED: ${slack_marker#SLACK_FAILED }"
    ;;
  *)
    # Fallback: try to spot a permalink anyway.
    if printf '%s' "$claude_out" | grep -qiE 'slack\.com/archives/'; then
      log "Slack delivery likely succeeded (no marker line, but a slack.com permalink appeared in output)."
    else
      log "WARN: no SLACK_OK/SLACK_FAILED marker found. Inspect the log to see what Claude did."
    fi
    ;;
esac

log "==== Done. ===="
echo "$NEWS_FILE"
