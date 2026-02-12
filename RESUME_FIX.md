# Resume Mode Auto-Start Fix

## Problem

When running `arkadian --resume SESSION_ID`, the orchestrator would:
1. ✅ Show session analysis correctly
2. ✅ Launch Claude Code
3. ❌ NOT start working - just sit at "Welcome back!" screen
4. ❌ Require user to manually type a message to trigger workflow

## Root Cause

The `arkadian` script was:
- Setting up resume mode environment variables ✅
- Appending ORCHESTRATOR.md and RESUME_PROMPT ✅
- Launching Claude ✅
- **BUT:** Not providing an initial user message to trigger the orchestrator

Without an initial message, Claude just waits in interactive mode.

## Solution

### 1. Auto-Inject Initial Message (`scripts/arkadian`)

```bash
# When resume mode is active, inject this message:
RESUME_INITIAL_MESSAGE="RESUME MODE DETECTED. Execute the Resume Mode Workflow:
1. Read workflow.yaml to understand phase structure
2. Check phase completion via _result.json files
3. Identify the next pending phase
4. Present the resume state summary
5. Load and show the execution spec for approval

Session directory: ${SESSION_DIR}

Begin now."

# Pass it to Claude
exec claude "${CLAUDE_ARGS[@]}" "$RESUME_INITIAL_MESSAGE"
```

### 2. Explicit Orchestrator Instructions (`ORCHESTRATOR.md`)

**Added to Resume Mode Workflow:**
```markdown
**CRITICAL:** When resume mode environment variables are present, you MUST
immediately begin the resume workflow upon receiving the user's first message.
Do not wait for further instructions.
```

**Added to preUserSubmit Checklist:**
```yaml
# Resume Mode Check (check BEFORE anything else)
- rule: "Is ARKADIAN_RESUME_SESSION environment variable set?"
  action: "If yes, immediately execute Resume Mode Workflow. Do not wait."
```

## What Happens Now

### Before (Old Behavior)
```
$ arkadian --resume 2026-02-11-add-getroundmetrics...

Resuming session: 2026-02-11-add-getroundmetrics...
Session state analysis:
  ✅ explore: COMPLETE (ark-guru)
  ⏸️  implement: IN PROGRESS or FAILED

Starting orchestrator in resume mode...

[Claude opens]
Welcome back!
No recent activity

[User has to type: "continue with the resume"]
```

### After (New Behavior)
```
$ arkadian --resume 2026-02-11-add-getroundmetrics...

Resuming session: 2026-02-11-add-getroundmetrics...
Session state analysis:
  ✅ explore: COMPLETE (ark-guru)
  ⏸️  implement: IN PROGRESS or FAILED

Starting orchestrator in resume mode...

[Claude opens and IMMEDIATELY starts working]

# Resuming Session: 2026-02-11-add-getroundmetrics...

## Completed Phases
- ✅ S1 (explore): Complete - ark-guru
- ✅ S2 (plan): Complete - ark-project-manager

## Next Phase
- ⏸️ S3 (implement): PENDING - ark-developer

## Execution Spec
[Shows full specs/S3.yaml content]

⏸️ AWAITING RESUME APPROVAL - Reply "APPROVED" to continue with S3
```

## Files Changed

1. **`scripts/arkadian`**
   - Added `RESUME_INITIAL_MESSAGE` construction
   - Inject message when launching Claude in resume mode

2. **`ORCHESTRATOR.md`**
   - Added "CRITICAL" note in Resume Mode Workflow section
   - Added resume mode check to preUserSubmit checklist

## Testing

```bash
# Try it now!
arkadian --resume 2026-02-11-add-getroundmetrics-grpc-endpoint-arkd-adminservic

# OR with original UUID
arkadian --resume 3191f042-a27d-4a6e-b6a8-f2fe0f41bc9a
```

**Expected behavior:**
1. Session analysis printed to terminal ✅
2. Claude opens ✅
3. **Orchestrator immediately starts reading workflow files** ✅
4. Shows you: S1 ✅, S2 ✅, S3 ⏸️ ✅
5. Presents S3 execution spec ✅
6. Waits for your "APPROVED" ✅

## Additional Notes

The initial message explicitly:
- States "RESUME MODE DETECTED"
- Lists the exact steps to execute
- Provides the session directory path
- Ends with "Begin now."

This removes any ambiguity and ensures the orchestrator starts working immediately.
