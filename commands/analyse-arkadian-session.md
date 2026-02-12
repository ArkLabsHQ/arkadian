---
description: Analyse an Arkadian orchestrator session - read transcripts, logs, and artifacts to understand what happened and suggest improvements.
argument-hint: <session_id_or_folder> [question]
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding. The argument should be a session identifier and an optional question.

Examples:
- `/analyse-arkadian-session latest`
- `/analyse-arkadian-session abc123-def456`
- `/analyse-arkadian-session 2026-02-11-add-grpc-endpoint-arkd Why did the implement phase fail?`
- `/analyse-arkadian-session latest What agents were used?`

## Outline

This command analyses a past or active Arkadian orchestrator session by reading its hook log, artifacts, and optionally the conversation transcript.

### 1. Locate Session

Parse arguments: everything before the first `?` or a recognised question word ("why", "what", "how", "which", "did", "was", "is", "show", "list") that doesn't look like a session ID becomes the question.

**Resolution order:**

1. **`latest`** — Read `${ARKADIAN_DIR}/sessions/.index/manifest.json`, pick the first entry (newest).
2. **UUID / session ID** — Look for:
   - `${ARKADIAN_DATA_DIR}/<id>_log.txt` (active or ended)
   - `${ARKADIAN_DATA_DIR}/<id>_state.json` (active only)
   - `${ARKADIAN_DIR}/sessions/.index/manifest.json` entry where `session_id` contains `<id>`
3. **Folder name** (e.g. `2026-02-11-add-grpc-endpoint-arkd`) — Search manifest.json for matching `session_id` or scan `sessions/` recursively.
4. **Partial match** — If no exact match, search manifest entries and log files for partial matches.

If the session cannot be found, list available sessions and ask the user to pick one.

Set these variables for subsequent steps:
- `SESSION_ID` — The session's UUID or renamed folder name
- `LOG_FILE` — Path to `<id>_log.txt` in DATA_DIR
- `STATE_FILE` — Path to `<id>_state.json` (if active)
- `SESSION_DIR` — Path to session folder (from `_active.txt`, manifest, or `sessions/<id>`)
- `TRANSCRIPT_PATH` — From state file's `transcript_path` field, or from line 1 of log file, or derive from `~/.claude/projects/` pattern
- `QUESTION` — The user's question (may be empty)

### 2. Read Hook Log

Read `${LOG_FILE}` (the `<id>_log.txt` file in DATA_DIR). Build a timeline:

- **Session lifecycle**: start time, end markers, cleanup events
- **Guardrail events**: tool blocks, path restrictions, allowed/denied decisions
- **Pre-agent validations**: execution spec checks, missing fields
- **Post-agent validations**: artifact checks, missing deliverables
- **Phase transitions**: explore → plan → implement → test
- **Retries and failures**: agent failures, retry attempts
- **Workflow state changes**: initializing → executing → completed

### 3. Read Session Artifacts

Read available files from `${SESSION_DIR}`:

**Always read (if they exist):**
- `session.md` — Session summary (auto-generated on end)
- `workflow.yaml` — Orchestrator workflow definition

**Read based on what exists:**
- `specs/*.yaml` — Execution specifications sent to agents
- `artifacts/explore/assessment.yaml` — Exploration assessment
- `artifacts/explore/response.md` — Guru response
- `artifacts/plan/` — Planning artifacts
- `artifacts/implement/detailed_report.md` — Implementation report
- `artifacts/implement/test-evidence.md` — Test results
- `artifacts/*/_result.json` — Agent result manifests

### 4. Read Transcript (if needed)

Only read the transcript for deep analysis questions that can't be answered from logs and artifacts alone. The transcript can be very large.

**Locate transcript:**
1. Check `STATE_FILE` for `transcript_path` field (active sessions)
2. Grep line 1 of log file for `transcript_path` in the session-start input JSON
3. Derive: `~/.claude/projects/-{cwd-slug}/{session_id}.jsonl`

**Reading strategy:**
- Use `Read` with `limit` parameter to read in chunks (the file is JSONL, potentially very large)
- Focus on assistant messages and tool calls for understanding what happened
- Look for error messages, retries, and decision points

### 5. Analyse and Respond

**If a question was provided**, answer it specifically using the gathered data.

**If no question was provided**, produce a comprehensive analysis:

#### Session Overview
- **Task**: What was requested
- **Project**: Which Ark project was targeted
- **Duration**: Start to end time
- **Outcome**: success / failed / partial / unknown
- **Session directory**: Path to artifacts

#### Phase Timeline
For each phase that ran:
- Phase name and agent used
- Duration
- Status (completed / failed / skipped)
- Key artifacts produced

#### Guardrail Events
- How many tool calls were blocked and why
- Any path restriction violations
- Sub-agent vs orchestrator decisions

#### Agent Performance
- Execution specs: were they complete and valid?
- Validation results: what passed, what failed
- Retries: how many, what triggered them
- Artifact delivery: expected vs actual

#### Issues Found
- Failures with root cause analysis
- Inefficiencies (unnecessary retries, redundant operations)
- Missing artifacts or incomplete phases

#### Improvement Suggestions
Actionable recommendations for:
- **Orchestrator prompts**: If the orchestrator made poor decisions
- **Agent prompts**: If agents produced suboptimal output
- **Hook logic**: If guardrails were too strict or too permissive
- **Workflow design**: If the phase sequence could be improved
- **Execution specs**: If spec templates need enhancement

## Data Locations Reference

| Source | Path Pattern | Active | Ended |
|--------|-------------|--------|-------|
| State file | `${ARKADIAN_DATA_DIR}/<id>_state.json` | YES | DELETED |
| Hook log | `${ARKADIAN_DATA_DIR}/<id>_log.txt` | YES | PRESERVED |
| Active pointer | `${ARKADIAN_DATA_DIR}/<id>_active.txt` | YES | DELETED |
| Detached output | `${ARKADIAN_DATA_DIR}/arkadian_<PID>.log` | YES | PRESERVED |
| Session folder | `sessions/<id>/` or renamed | YES | PRESERVED (renamed) |
| Manifest | `sessions/.index/manifest.json` | N/A | PRESERVED |
| Transcript | `~/.claude/projects/<slug>/<id>.jsonl` | YES | PRESERVED |

## Environment Variables

- `ARKADIAN_DIR` — Arkadian repository root
- `ARKADIAN_DATA_DIR` — Runtime data directory (default: `${ARKADIAN_DIR}/log`)

## Notes

- Hook logs are the most reliable source — they capture every hook event with timestamps
- Transcripts are large and should be read selectively
- Active sessions have state files; ended sessions only have logs + artifacts
- The manifest.json is updated by the summarize worker after session end — it may not exist for sessions that ended abnormally
- Session folders get renamed from UUID to `YYYY-MM-DD-<title>` by the summarize worker
