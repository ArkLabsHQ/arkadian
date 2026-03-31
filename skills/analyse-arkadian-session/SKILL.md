---
name: analyse-arkadian-session
description: "Analyse an Arkadian orchestrator session - read transcripts, logs, and artifacts to understand what happened and suggest improvements. Use when: user wants to debug or review a past session."
allowed-tools: [Read, Glob, Grep, Bash]
---

# Analyse Arkadian Session

**When to use:**
- User wants to analyze a past or active orchestrator session
- User wants to understand why a phase failed
- User wants improvement suggestions for prompts, hooks, or workflows

**User input:** A session identifier and an optional question.

Examples:
- `latest`
- `abc123-def456`
- `2026-02-11-add-grpc-endpoint-arkd Why did the implement phase fail?`
- `latest What agents were used?`

## Outline

### 1. Locate Session

Parse arguments: everything before the first question word ("why", "what", "how", "which", "did", "was", "is", "show", "list") that doesn't look like a session ID becomes the question.

**Resolution order:**

1. **`latest`** — Read `${ARKADIAN_DIR}/sessions/.index/manifest.json`, pick the first entry (newest).
2. **UUID / session ID** — Look for:
   - `${ARKADIAN_DATA_DIR}/<id>_log.txt` (active or ended)
   - `${ARKADIAN_DATA_DIR}/<id>_state.json` (active only)
   - `${ARKADIAN_DIR}/sessions/.index/manifest.json` entry where `session_id` contains `<id>`
3. **Folder name** (e.g. `2026-02-11-add-grpc-endpoint-arkd`) — Search manifest.json for matching entry or scan `sessions/`.
4. **Partial match** — Search manifest entries and log files for partial matches.

If not found, list available sessions.

Set: `SESSION_ID`, `LOG_FILE`, `STATE_FILE`, `SESSION_DIR`, `TRANSCRIPT_PATH`, `QUESTION`.

### 2. Read Hook Log

Read `${LOG_FILE}` (`<id>_log.txt` in DATA_DIR). Build a timeline:

- Session lifecycle: start time, end markers, cleanup events
- Guardrail events: tool blocks, path restrictions, allowed/denied
- Pre-agent validations: spec checks, missing fields
- Post-agent validations: artifact checks, missing deliverables
- Phase transitions: explore, plan, implement, test
- Retries and failures

### 3. Read Session Artifacts

Read from `${SESSION_DIR}`:

**Always read (if exists):**
- `session.md` — Session summary
- `workflow.yaml` — Workflow definition

**Read based on existence:**
- `specs/*.yaml` — Execution specifications
- `artifacts/explore/assessment.yaml` — Exploration assessment
- `artifacts/implement/detailed_report.md` — Implementation report
- `artifacts/implement/test-evidence.md` — Test results
- `artifacts/*/_result.json` — Agent result manifests

### 4. Read Transcript (if needed)

Only for deep analysis questions. The transcript can be very large.

**Locate:** Check state file `transcript_path`, grep log line 1, or derive from `~/.claude/projects/<slug>/<id>.jsonl`.

**Strategy:** Read in chunks with `limit` parameter. Focus on assistant messages and tool calls.

### 5. Analyse and Respond

**If question provided:** Answer specifically using gathered data.

**If no question:** Produce comprehensive analysis:

#### Session Overview
- Task, Project, Duration, Outcome, Session directory

#### Phase Timeline
- Phase name, agent, duration, status, key artifacts

#### Guardrail Events
- Blocked tool calls and reasons
- Path restriction violations

#### Agent Performance
- Spec completeness, validation results, retries, artifact delivery

#### Issues Found
- Failures with root cause analysis
- Inefficiencies, missing artifacts

#### Improvement Suggestions
- Orchestrator prompts, Agent prompts, Hook logic, Workflow design, Execution specs

## Data Locations Reference

| Source | Path Pattern | Active | Ended |
|--------|-------------|--------|-------|
| State file | `${ARKADIAN_DATA_DIR}/<id>_state.json` | YES | DELETED |
| Hook log | `${ARKADIAN_DATA_DIR}/<id>_log.txt` | YES | PRESERVED |
| Session folder | `sessions/<id>/` or renamed | YES | PRESERVED |
| Manifest | `sessions/.index/manifest.json` | N/A | PRESERVED |
| Transcript | `~/.claude/projects/<slug>/<id>.jsonl` | YES | PRESERVED |
