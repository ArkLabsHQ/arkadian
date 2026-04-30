#!/usr/bin/env bash
# arkadian-daily-update.sh
#
# Daily Arkadian sync job. Designed to run from cron on a server (e.g. Hetzner)
# where the arkadian repo is checked out and `claude` is installed.
#
# 1. Sources $ARKADIAN_DIR/.env to load *_REPO paths.
# 2. For each repo: skip-if-dirty, fetch, fast-forward.
# 3. For each repo that received new commits AND has a docs/projects/<id>/
#    directory in Arkadian: invoke Claude Code non-interactively with the
#    update-project skill (so docs + INDEX.md + change-log/SYNC_HISTORY.md
#    get refreshed).
# 4. Write a single aggregate changelog at
#    $ARKADIAN_DIR/docs/daily-changelogs/YYYY-MM-DD.md.
#
# Run via cron in DEVELOPMENT mode (plain `claude`), NOT via the arkadian
# wrapper script — the orchestrator guardrail blocks Bash and would break
# the per-project skill invocation.

set -u

# ---- config ---------------------------------------------------------------
# Auto-derive ARKADIAN_DIR from this script's location (scripts/<this>) when
# not explicitly set. This means: clone arkadian anywhere on Hetzner and the
# script just works without editing.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARKADIAN_DIR="${ARKADIAN_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
ENV_FILE="$ARKADIAN_DIR/.env"
LOG_DIR="${LOG_DIR:-$ARKADIAN_DIR/log/daily-update}"
DATE="$(date +%Y-%m-%d)"
LOG_FILE="$LOG_DIR/run-$DATE.log"
SUMMARY_DIR="$ARKADIAN_DIR/docs/daily-changelogs"
SUMMARY_FILE="$SUMMARY_DIR/$DATE.md"
GIT_TIMEOUT="${GIT_TIMEOUT:-180}"
CLAUDE_BIN="${CLAUDE_BIN:-$(command -v claude || echo /usr/local/bin/claude)}"
CLAUDE_TOOLS="${CLAUDE_TOOLS:-Bash,Read,Write,Edit,Glob,Grep}"
# Priority repos — get a curated "Highlights" section at the top of the
# changelog when they receive new commits. Comma-separate via env var to
# override (e.g. PRIORITY_REPOS="arkd,go-sdk,fulmine,introspector,wallet").
PRIORITY_REPOS_DEFAULT="arkd,go-sdk,fulmine,introspector"
IFS=',' read -ra PRIORITY_REPOS <<< "${PRIORITY_REPOS:-$PRIORITY_REPOS_DEFAULT}"
# ---------------------------------------------------------------------------

mkdir -p "$LOG_DIR" "$SUMMARY_DIR"

log() { printf '[%s] %s\n' "$(date '+%F %T')" "$*" | tee -a "$LOG_FILE"; }

if [ ! -f "$ENV_FILE" ]; then
  log "ERROR: $ENV_FILE not found. Run \`make generate-env\` in $ARKADIAN_DIR first."
  exit 1
fi

# Load .env (only the *_REPO and ARKADIAN_DIR keys).
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

if ! command -v "$CLAUDE_BIN" >/dev/null 2>&1; then
  log "ERROR: claude CLI not found at '$CLAUDE_BIN'. Set CLAUDE_BIN env var."
  exit 1
fi

log "==== Arkadian daily update for $DATE ===="
log "ARKADIAN_DIR=$ARKADIAN_DIR"

# Map a *_REPO env var name to a project-id (the directory name in
# docs/projects/). Convention: ARKD_REPO -> arkd, GO_SDK_REPO -> go-sdk, etc.
var_to_project_id() {
  local v="$1"
  v="${v%_REPO}"
  v="${v,,}"           # lowercase
  v="${v//_/-}"        # underscores -> hyphens
  echo "$v"
}

# Collect all *_REPO vars currently set.
mapfile -t REPO_VARS < <(compgen -A variable | grep -E '_REPO$' | sort)

total=0; pulled=0; uptodate=0; skipped=0; failed=0; updated_docs=0
PER_REPO_SECTIONS=()   # accumulated markdown for the daily summary
PRIORITY_DATA=()       # tuples "<pid>|<path>|<OLD>|<NEW>|<branch>" for priority repos that pulled

is_priority() {
  local pid="$1"
  local p
  for p in "${PRIORITY_REPOS[@]}"; do
    [ "$p" = "$pid" ] && return 0
  done
  return 1
}

for var in "${REPO_VARS[@]}"; do
  path="${!var}"
  [ -n "$path" ] || continue
  [ -d "$path/.git" ] || { log "SKIP  $var=$path — not a git repo"; continue; }
  total=$((total + 1))

  pid="$(var_to_project_id "$var")"
  log "---- $pid  ($path) ----"

  # 1. Dirty?
  if [ -n "$(timeout "$GIT_TIMEOUT" git -C "$path" status --porcelain 2>/dev/null)" ]; then
    log "SKIP  $pid — uncommitted local changes"
    PER_REPO_SECTIONS+=("### $pid"$'\n'"SKIPPED: uncommitted local changes"$'\n')
    skipped=$((skipped + 1))
    continue
  fi

  branch="$(timeout "$GIT_TIMEOUT" git -C "$path" rev-parse --abbrev-ref HEAD 2>/dev/null)"
  if [ "$branch" = "HEAD" ] || [ -z "$branch" ]; then
    log "SKIP  $pid — detached HEAD"
    PER_REPO_SECTIONS+=("### $pid"$'\n'"SKIPPED: detached HEAD"$'\n')
    skipped=$((skipped + 1))
    continue
  fi

  if ! timeout "$GIT_TIMEOUT" git -C "$path" rev-parse --abbrev-ref --symbolic-full-name "@{u}" >/dev/null 2>&1; then
    log "SKIP  $pid — '$branch' has no upstream"
    PER_REPO_SECTIONS+=("### $pid ($branch)"$'\n'"SKIPPED: no upstream"$'\n')
    skipped=$((skipped + 1))
    continue
  fi

  OLD="$(git -C "$path" rev-parse HEAD)"

  # 2. Fetch.
  if ! fetch_out=$(timeout "$GIT_TIMEOUT" git -C "$path" fetch --all --prune --tags 2>&1); then
    log "FAIL  $pid — fetch failed: $fetch_out"
    PER_REPO_SECTIONS+=("### $pid ($branch)"$'\n'"FAILED: fetch — ${fetch_out//$'\n'/ }"$'\n')
    failed=$((failed + 1))
    continue
  fi

  # 3. Fast-forward.
  L="$(git -C "$path" rev-parse @)"
  R="$(git -C "$path" rev-parse @{u})"
  B="$(git -C "$path" merge-base @ @{u})"

  if [ "$L" = "$R" ]; then
    log "OK    $pid ($branch) — already up to date"
    PER_REPO_SECTIONS+=("### $pid ($branch)"$'\n'"Up to date."$'\n')
    uptodate=$((uptodate + 1))
    continue
  elif [ "$L" = "$B" ]; then
    if ! merge_out=$(timeout "$GIT_TIMEOUT" git -C "$path" merge --ff-only "@{u}" 2>&1); then
      log "FAIL  $pid — fast-forward failed: $merge_out"
      PER_REPO_SECTIONS+=("### $pid ($branch)"$'\n'"FAILED: ff-only — ${merge_out//$'\n'/ }"$'\n')
      failed=$((failed + 1))
      continue
    fi
  elif [ "$R" = "$B" ]; then
    log "SKIP  $pid — local ahead of upstream (unpushed commits)"
    PER_REPO_SECTIONS+=("### $pid ($branch)"$'\n'"SKIPPED: local ahead of upstream"$'\n')
    skipped=$((skipped + 1))
    continue
  else
    log "SKIP  $pid — diverged from upstream"
    PER_REPO_SECTIONS+=("### $pid ($branch)"$'\n'"SKIPPED: diverged from upstream"$'\n')
    skipped=$((skipped + 1))
    continue
  fi

  NEW="$(git -C "$path" rev-parse HEAD)"
  pulled=$((pulled + 1))
  log "PULL  $pid ($branch) — ${OLD:0:7} → ${NEW:0:7}"

  commits="$(git -C "$path" log "$OLD..$NEW" --pretty=format:'- %h %s (%an)')"

  # Capture priority repo data for the Highlights section.
  if is_priority "$pid"; then
    PRIORITY_DATA+=("$pid|$path|$OLD|$NEW|$branch")
  fi

  # 4. If this project has an Arkadian docs structure, run update-project.
  if [ -d "$ARKADIAN_DIR/docs/projects/$pid" ]; then
    log "DOCS  $pid — invoking update-project skill"
    prompt="Use the update-project skill to update documentation for project '$pid' (repository at $path). The repo has just been fast-forwarded from $OLD to $NEW. Update docs/projects/$pid/, the master docs/INDEX.md, and write the new commit hash to docs/projects/$pid/change-log/last-sync.txt. Do not commit or create branches. Report only the list of files you changed."
    if skill_out=$(cd "$ARKADIAN_DIR" && timeout 600 "$CLAUDE_BIN" -p "$prompt" --allowedTools "$CLAUDE_TOOLS" 2>&1); then
      log "DOCS  $pid — update-project completed"
      updated_docs=$((updated_docs + 1))
      PER_REPO_SECTIONS+=("### $pid ($branch) — ${OLD:0:7} → ${NEW:0:7}"$'\n'"$commits"$'\n\n'"_Docs refreshed via update-project skill._"$'\n')
    else
      log "WARN  $pid — update-project skill exited non-zero (continuing)"
      PER_REPO_SECTIONS+=("### $pid ($branch) — ${OLD:0:7} → ${NEW:0:7}"$'\n'"$commits"$'\n\n'"_Docs update FAILED — see $LOG_FILE._"$'\n')
    fi
  else
    log "DOCS  $pid — no docs/projects/$pid/, pull only"
    PER_REPO_SECTIONS+=("### $pid ($branch) — ${OLD:0:7} → ${NEW:0:7}"$'\n'"$commits"$'\n\n'"_No Arkadian docs entry; pulled only._"$'\n')
  fi
done

# ---- Generate Highlights section for priority repos ----------------------
HIGHLIGHTS=""
if [ "${#PRIORITY_DATA[@]}" -gt 0 ]; then
  log "Generating Highlights for ${#PRIORITY_DATA[@]} priority repo(s)..."

  # Build the prompt: tell Claude exactly which repos and ranges to look at.
  hl_input=""
  for entry in "${PRIORITY_DATA[@]}"; do
    IFS='|' read -r p_pid p_path p_old p_new p_branch <<< "$entry"
    hl_input+="- ${p_pid} (branch ${p_branch}): ${p_path} from ${p_old} to ${p_new}"$'\n'
  done

  hl_prompt="You are running non-interactively. Produce a tightly-focused 'Highlights' section for dusan, who maintains fulmine + go-sdk + introspector and depends on arkd's client surface.

PRIORITY REPOS THAT JUST PULLED:
${hl_input}

For each priority repo above, run via the Bash tool:
  git -C <path> log <OLD>..<NEW> --no-merges --pretty=format:'%h %s (%an)'
  git -C <path> log <OLD>..<NEW> --no-merges --stat | head -120
  git -C <path> diff <OLD>..<NEW> --name-only

Categorise commits and surface only what's noteworthy:
- API / public-surface changes (signatures, gRPC/REST endpoints, exported symbols)
- Breaking changes (removed/renamed exports, schema migrations)
- VTXO / round / forfeit / connector-tree / signing logic
- Dependency bumps that affect downstream (e.g. arkd → go-sdk)
- Security-sensitive changes
- New features worth knowing about

Skip routine work (test fixes, lint, doc typos, formatting) unless that's all there is.

OUTPUT — markdown only, no preamble, no closing remarks. Use exactly this shape:

## Highlights for your stack

### <repo-name> (<N> commits)
- **<category>**: short description (\`<short-sha>\` by <author>)
- ...

### Cross-cutting
- arkd → go-sdk: <if any arkd commits touched pkg/client/, api/, proto/, internal/interface/grpc/, note the impact in one line>
- <other notable cross-repo signals if any>

If a priority repo has only routine changes, write under it: 'Routine maintenance only.' If NOTHING across all priority repos is noteworthy, output exactly:

## Highlights for your stack

Routine maintenance only across your priority repos.

Be concise. Bullets only, no paragraphs."

  if hl_out=$(timeout 300 "$CLAUDE_BIN" -p "$hl_prompt" --allowedTools "Bash,Read,Glob,Grep" 2>&1); then
    HIGHLIGHTS="$hl_out"
    log "Highlights generated (${#HIGHLIGHTS} chars)"
  else
    log "WARN: Highlights generation failed — skipping section"
    printf '%s\n' "$hl_out" | sed 's/^/      /' | tee -a "$LOG_FILE" >/dev/null
  fi
fi

# ---- Write aggregate daily changelog --------------------------------------
{
  printf '# Arkadian daily update — %s\n\n' "$DATE"
  printf '## Summary\n'
  printf -- '- Repos checked: %d\n' "$total"
  printf -- '- Pulled new commits: %d\n' "$pulled"
  printf -- '- Already up to date: %d\n' "$uptodate"
  printf -- '- Skipped: %d\n' "$skipped"
  printf -- '- Failed: %d\n' "$failed"
  printf -- '- Doc updates run: %d\n\n' "$updated_docs"
  if [ -n "$HIGHLIGHTS" ]; then
    printf '%s\n\n' "$HIGHLIGHTS"
  fi
  printf '## Per-repo detail\n\n'
  for s in "${PER_REPO_SECTIONS[@]}"; do printf '%s\n' "$s"; done
} > "$SUMMARY_FILE"

log "Daily changelog written: $SUMMARY_FILE"

# ---- Auto-commit + push docs changes -------------------------------------
# Set AUTO_PUSH=0 to disable. Set ARKADIAN_BOT_NAME / ARKADIAN_BOT_EMAIL
# to override the git identity used for the daily commit.
AUTO_PUSH="${AUTO_PUSH:-1}"
pushed_status="skipped"
if [ "$AUTO_PUSH" = "1" ]; then
  cd "$ARKADIAN_DIR"

  # Set a bot identity if none is configured (cron user might be `root`).
  if [ -z "$(git config user.name 2>/dev/null)" ]; then
    git config user.name "${ARKADIAN_BOT_NAME:-arkadian-bot}"
    git config user.email "${ARKADIAN_BOT_EMAIL:-arkadian-bot@local}"
    log "Set local git identity: $(git config user.name) <$(git config user.email)>"
  fi

  # Rebase against remote so we don't conflict with manual pushes.
  if ! pull_out=$(timeout "$GIT_TIMEOUT" git pull --rebase --autostash origin main 2>&1); then
    log "WARN: arkadian rebase-pull failed (skipping push):"
    printf '%s\n' "$pull_out" | sed 's/^/      /' | tee -a "$LOG_FILE" >/dev/null
    pushed_status="rebase-failed"
  else
    git add docs/
    if git diff --cached --quiet; then
      log "No doc changes to commit."
      pushed_status="nothing-to-commit"
    else
      msg="docs: daily sync $DATE — $updated_docs project(s) refreshed, $pulled repo(s) pulled"
      if commit_out=$(git commit -m "$msg" 2>&1); then
        log "Committed docs changes."
        if push_out=$(timeout "$GIT_TIMEOUT" git push origin main 2>&1); then
          log "Pushed to origin/main."
          pushed_status="pushed"
        else
          log "WARN: push failed (commit kept locally — fix manually):"
          printf '%s\n' "$push_out" | sed 's/^/      /' | tee -a "$LOG_FILE" >/dev/null
          pushed_status="push-failed"
        fi
      else
        log "WARN: commit failed:"
        printf '%s\n' "$commit_out" | sed 's/^/      /' | tee -a "$LOG_FILE" >/dev/null
        pushed_status="commit-failed"
      fi
    fi
  fi
fi

log "==== Done. checked=$total pulled=$pulled uptodate=$uptodate skipped=$skipped failed=$failed docs=$updated_docs auto_push=$pushed_status ===="

echo "$SUMMARY_FILE"
