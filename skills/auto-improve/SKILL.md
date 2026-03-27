---
name: auto-improve
description: "Self-improvement loop for arkadian. Launches arkadian -d with a GitHub issue, polls until done, evaluates per-agent criteria, reads transcripts on failure, improves prompts, deletes worktree, and relaunches. Loops until passing or max iterations."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, TodoWrite
---

# Arkadian Auto-Improve Skill

You are running the **auto-improvement loop** for Arkadian. Your job is to make Arkadian's development pipeline reliable by iteratively running real tasks and fixing the prompts/skills/hooks that cause failures.

## Input

You receive a GitHub issue URL (e.g. `https://github.com/ark-network/ark/issues/909`).

## Environment

- `ARKADIAN_DIR` — path to the arkadian repo (where you're running)
- `ARKADIAN_DATA_DIR` — runtime data directory (session state, logs)
- You have full tool access: Bash, Read, Write, Edit, Glob, Grep

## The Loop

Execute this loop. Do NOT skip steps. Do NOT proceed to improvement without reading artifacts first.

```
FOR iteration = 1 to 8:
  1. LAUNCH: arkadian -d "<issue_url>"
  2. POLL: wait for session to complete (2h max)
  3. FIND: locate session directory
  4. EVALUATE: run eval-engine.ts + check artifacts
  5. IF PASS → DONE (keep worktree, generate report)
  6. ANALYSE: read hook log + transcript for failing agents
  7. IMPROVE: edit max 2 files (agents, skills, orchestrator, hooks, templates)
  8. CLEAN: delete worktree from failed run
  9. CHECK: if 3 consecutive no-improvement → STOP
  10. LOOP
```

---

## Step 1: Launch arkadian -d

```bash
arkadian -d "<ISSUE_URL>"
```

This command outputs lines like:
```
Arkadian detached (PID 12345)
  /path/to/sessions/<session-id>
```

**Capture:**
- `PID` — the process ID
- `SESSION_DIR` — the session directory path (second line, trimmed)

If only a log path is shown (no session dir), wait 10s and check `${ARKADIAN_DATA_DIR}` for the newest `*_active.txt` file to find the session dir.

---

## Step 2: Poll until completion

Run this polling loop:

```bash
# Find the session ID from the active files
ACTIVE_FILE=$(ls -t ${ARKADIAN_DATA_DIR}/*_active.txt 2>/dev/null | head -1)
SESSION_ID=$(basename "$ACTIVE_FILE" | sed 's/_active.txt//')

# Poll every 30 seconds, max 2 hours (240 iterations)
for i in $(seq 1 240); do
  if [ ! -f "${ARKADIAN_DATA_DIR}/${SESSION_ID}_active.txt" ]; then
    echo "Session completed"
    break
  fi
  sleep 30
done
```

The session is done when `_active.txt` disappears (deleted by session-stop-hook).

**If timeout (2h)**: Report timeout, check if process is still alive (`kill -0 $PID`). If zombie, kill it. Move to evaluation with whatever artifacts exist.

---

## Step 3: Find session directory

After completion, the session folder gets renamed by the summarize worker. Find it:

1. Read `${ARKADIAN_DIR}/sessions/.index/manifest.json`
2. Take the **first entry** (newest) — this is the just-completed session
3. Use its `session_dir` field

If manifest hasn't been updated yet (worker still running), wait 15s and retry. If still not found, search `${ARKADIAN_DIR}/sessions/` for the most recently modified directory.

Store `SESSION_DIR` for subsequent steps.

---

## Step 4: Evaluate

### 4a. Run the eval engine (deterministic artifact checks)

```bash
bun ${ARKADIAN_DIR}/benchmarks/eval-engine.ts --session-dir "${SESSION_DIR}"
```

This outputs JSON with per-agent scores. Parse the output.

### 4b. Read the eval results

The JSON structure:
```json
{
  "pass": true/false,
  "overall_percentage": 85,
  "agents": [
    {
      "agent": "ark-developer",
      "score": 11,
      "max_score": 15,
      "percentage": 73,
      "criteria": [
        {"id": "e2e_test_written", "passed": false, "detail": "..."},
        ...
      ]
    },
    ...
  ],
  "failures": ["[ark-developer] e2e_test_written: integration_test_written = false", ...]
}
```

### 4c. Check critical artifacts manually

Even if eval-engine says pass, manually verify these (the engine can't catch everything):

1. **Read `test-evidence.md`** — is there REAL test output? Not just "go vet" or "go build"?
2. **Read `assessment.yaml`** — does the guru's analysis make sense for this issue?
3. **Read `changes.yaml`** — is the worktree path present? Were files actually changed?

---

## Step 5: Pass → Done

If `pass: true` in eval results AND manual artifact check looks good:

1. **DO NOT delete the worktree** — the user wants to inspect the code
2. Read `changes.yaml` to get the `worktree_path`
3. Generate a report:

```markdown
# Auto-Improve: PASS

**Issue**: <url>
**Iteration**: N of 8
**Session**: <session_dir>
**Worktree**: <worktree_path> (preserved for inspection)

## Per-Agent Scores
| Agent | Score | Status |
|-------|-------|--------|
| ark-guru | 8/8 (100%) | PASS |
| ark-project-manager | 6/6 (100%) | PASS |
| ark-developer | 13/15 (87%) | PASS |
| ark-developer-ci | 7/7 (100%) | PASS |
| ark-pr-reviewer | 2/2 (100%) | PASS |

## Improvements Made (across iterations)
- Iter 1: Edited agents/ark-developer.md — added constraint about Skill invocation
- Iter 2: Edited skills/arkd-dev-loop/SKILL.md — fixed infra health check

## Prompt Changes (review with `git diff agents/ skills/ ORCHESTRATOR.md templates/ hooks/`)
<list accumulated changes>
```

Save report to `${ARKADIAN_DIR}/benchmarks/runs/<issue-slug>/report.md`.

**STOP HERE. Do not continue the loop.**

---

## Step 6: Analyse failures (transcripts + logs)

For each **failing agent** (percentage below pass threshold or critical criteria failed):

### 6a. Read hook log

```bash
# Find the log file
LOG_FILE=$(ls -t ${ARKADIAN_DATA_DIR}/*_log.txt 2>/dev/null | head -1)
```

Read the log file. Look for:
- Phase durations (how long each agent took)
- Validation failures (post-agent-validator output)
- Retries and blocks
- Error messages

### 6b. Read transcript (chunked — it's large)

Locate the transcript:
1. Grep line 1 of log file for `transcript_path`
2. Or derive: `~/.claude/projects/-Users-*/${SESSION_UUID}.jsonl`

Read in chunks (use `Read` with `offset` and `limit`). Focus on the **failing agent's phase**:

- Search for the agent name in the transcript
- Read the assistant messages during that phase
- Look for these patterns:

| Pattern in transcript | What it means |
|----------------------|---------------|
| Agent never called `Skill("arkd-dev-loop")` | Skill dispatch not happening |
| Agent said "I'll skip..." or "Since infrastructure isn't..." | Agent found escape hatch |
| Agent looped on infra setup (repeated "docker", "nigiri", "connect" failures) | Skill procedure broken |
| Agent ran out of context ("I need to summarize...") | Prompt too large |
| Agent produced output that contradicts spec | Didn't read/follow PM artifacts |
| Agent didn't read upstream artifacts at all | Artifact passing or spec issue |
| Orchestrator spec was missing fields | Orchestrator template problem |

### 6c. Identify root cause

Combine eval failures + log analysis + transcript reading to identify:
1. **Which criteria failed** (from eval results)
2. **Why they failed** (from transcript)
3. **Which file is responsible** (from the pattern analysis)
4. **What specific change would fix it** (the improvement)

---

## Step 7: Improve

Make **at most 2 edits** per iteration. Each edit targets the root cause from Step 6.

### Tunable files (anything is fair game)

| Layer | Files |
|-------|-------|
| Agent prompts | `agents/ark-guru.md`, `agents/ark-developer.md`, `agents/ark-project-manager.md`, `agents/ark-pr-reviewer.md` |
| Skills | `skills/arkd-dev-loop/SKILL.md`, `skills/arkd-gha/SKILL.md`, `skills/fulmine-dev-loop/SKILL.md`, `skills/dev-implement/prompt.md`, `skills/pm-spec/prompt.md`, `skills/pm-plan/prompt.md`, `skills/pm-tasks/prompt.md` |
| Orchestrator | `ORCHESTRATOR.md` |
| Templates | `templates/sub_agent_input_spec.md`, `templates/workflows/development_unified.yaml`, `templates/agent_catalog.md` |
| Hooks | `hooks/validation-contracts.ts`, `hooks/post-agent-validator.ts`, `hooks/pre-agent-validator.ts` |

### Edit types

- **add_constraint**: Add an explicit rule to prevent the observed bad behavior
- **add_example**: Show the agent what correct behavior looks like
- **refine_wording**: Make an ambiguous instruction unambiguous
- **reorder_section**: Move critical instructions higher in the prompt
- **remove_instruction**: Remove an instruction that causes more harm than good
- **fix_procedure**: Fix a broken procedure in a skill (e.g. missing health check step)
- **trim_bloat**: Remove unnecessary content to avoid context exhaustion

### Edit rules

1. **Read the target file first** — understand the current state before editing
2. **Make the smallest change that fixes the root cause** — don't refactor
3. **Explain each edit** — log what you changed and why in campaign.yaml
4. **Do NOT commit** — changes accumulate as dirty working tree
5. After editing agent/skill files, they take effect on next `arkadian -d` launch (skills need `make install-skills` first if in `skills/`, but agent files are loaded directly)

### Re-install skills if changed

If you edited any file in `skills/`:
```bash
cd ${ARKADIAN_DIR} && make install-skills
```

This copies the updated skill to `~/.claude/commands/` where Claude Code can find it.

---

## Step 8: Clean up failed worktree

**Only on failure** (not on pass — see Step 5).

Read `changes.yaml` from the session to find the worktree path:

```bash
# Extract worktree_path from changes.yaml
WORKTREE=$(grep 'worktree_path:' "${SESSION_DIR}/artifacts/implement/changes.yaml" | awk '{print $2}' | tr -d '"')

if [ -n "$WORKTREE" ] && [ -d "$WORKTREE" ]; then
  rm -rf "$WORKTREE"
  # Get the repo root from the worktree path (parent of .worktrees/)
  REPO_ROOT=$(echo "$WORKTREE" | sed 's|/.worktrees/.*||')
  git -C "$REPO_ROOT" worktree prune 2>/dev/null
fi
```

If `changes.yaml` doesn't exist (crash before implement phase), skip this step.

---

## Step 9: Check stopping criteria

Track across iterations:
- `scores`: array of overall_percentage per iteration
- `improvements_made`: count of edits per iteration

**Stop conditions:**
- **3 consecutive no-improvement**: if `scores[i] <= scores[i-1]` for 3 iterations in a row, stop and report. The prompt changes aren't helping — need human intervention.
- **Max 8 iterations**: hard cap. Report best score achieved.

On stop:
```markdown
# Auto-Improve: STOPPED

**Reason**: <3 consecutive no-improvement | max iterations>
**Best score**: <N>% (iteration <M>)
**Issue**: <url>

## Score Progression
| Iter | Score | Improvements |
|------|-------|-------------|
| 1 | 45% | agents/ark-developer.md (add_constraint) |
| 2 | 60% | skills/arkd-dev-loop/SKILL.md (fix_procedure) |
| 3 | 60% | agents/ark-guru.md (refine_wording) |
| 4 | 60% | STOPPED — no improvement in 3 iterations |

## Remaining Failures
<list from last eval>

## Recommendation
<what a human should look at>
```

---

## Campaign Tracking

Maintain state in `${ARKADIAN_DIR}/benchmarks/runs/<issue-slug>/campaign.yaml`:

```yaml
issue_url: "https://github.com/ark-network/ark/issues/909"
issue_slug: "ark-909"
started_at: "2026-03-28T10:00:00Z"
status: "in_progress"  # in_progress | passed | stopped
iterations:
  - iteration: 1
    session_dir: "/path/to/session"
    score: 45
    max_score: 100
    improvements:
      - file: "agents/ark-developer.md"
        type: "add_constraint"
        description: "Added explicit Skill invocation requirement"
    worktree_deleted: true
  - iteration: 2
    session_dir: "/path/to/session"
    score: 85
    max_score: 100
    improvements: []
    worktree_deleted: false  # kept on pass
best_score: 85
best_iteration: 2
```

Update this file after each iteration.

---

## Critical Rules

1. **NEVER skip the eval step** — always run eval-engine.ts before deciding pass/fail
2. **NEVER delete worktree on pass** — user wants to inspect the code
3. **ALWAYS delete worktree on failure** — clean slate for next run
4. **ALWAYS read the transcript** when there are failures — artifacts alone don't explain WHY
5. **MAX 2 edits per iteration** — keep changes traceable
6. **Re-install skills** after editing them (`make install-skills`)
7. **Do NOT git commit improvements** — let them accumulate for user review
8. **Check all layers** — the problem might be in orchestrator/skills/hooks, not just agent prompts
