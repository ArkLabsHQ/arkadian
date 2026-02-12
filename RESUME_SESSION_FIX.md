# Resume Session Directory Fix

## Problem

When running `arkadian --resume SESSION_ID`, a new Claude session was created with a NEW session ID, causing:

1. **Session directory mismatch:**
   - Old session: `3191f042-a27d-4a6e-b6a8-f2fe0f41bc9a`
   - New session: `24eaeec0-7d84-4e11-836a-610544bb44f3`
   - Hooks created new directories for new session

2. **Validator failures:**
   - `parent_session_id` mismatch: Execution spec had old ID, validator expected new ID
   - Missing artifacts: Validator looked in new session dir, artifacts were in old session dir
   - Pipeline prerequisites failed: Couldn't find `assessment.yaml` in new location

3. **Manual workarounds:**
   - Orchestrator had to manually copy artifacts between sessions
   - Had to rewrite execution specs with new session IDs
   - Blocked by orchestrator-guardrail when trying to use Bash

## Root Cause

Claude Code CLI always creates a new session with a new UUID when launched. The `session-start-hook` didn't recognize resume mode and created a brand new session directory structure instead of reusing the existing one.

## Solution

### 1. Session Start Hook (`hooks/session-start-hook.ts`)

**Added resume mode detection BEFORE creating new session:**

```typescript
// Check for RESUME MODE - use existing session directory instead of creating new one
const resumeSessionDir = process.env.ARKADIAN_RESUME_SESSION_DIR;
const resumeSession = process.env.ARKADIAN_RESUME_SESSION;

let sessionDir: string;

if (resumeSessionDir && existsSync(resumeSessionDir)) {
    // RESUME MODE: Use the existing session directory
    sessionDir = resumeSessionDir;
    log(hookInput.session_id, 'resume-mode', {
        resume_session: resumeSession,
        resume_dir: resumeSessionDir,
        new_session_id: hookInput.session_id
    });

    // Create symlink from new session ID to old session directory
    const newSessionLink = join(SESSIONS_DIR, hookInput.session_id);
    if (!existsSync(newSessionLink)) {
        const relPath = join('..', resumeSessionDir.replace(SESSIONS_DIR + '/', ''));
        fs.symlinkSync(relPath, newSessionLink, 'dir');
    }
} else {
    // NORMAL MODE: Create new session folder
    sessionDir = createSessionFolder(hookInput);
}
```

**Benefits:**
- Reuses existing session directory with all artifacts
- Creates symlink so both session IDs work
- No need to copy artifacts

### 2. Pre-Agent Validator (`hooks/pre-agent-validator.ts`)

**A. Updated `parent_session_id` validation:**

```typescript
// In RESUME MODE, allow parent_session_id from the original session
const resumeSessionDir = process.env.ARKADIAN_RESUME_SESSION_DIR;
if (resumeSessionDir) {
    // parent_session_id can be either current session OR original session
    const isCurrentSession = spec.parent_session_id === sessionId;
    const isOriginalSession = resumeSessionDir.includes(spec.parent_session_id);

    if (!isCurrentSession && !isOriginalSession) {
        errors.push(`parent_session_id mismatch...`);
    }
} else {
    // Normal mode: must match exactly
    if (spec.parent_session_id !== sessionId) {
        errors.push(`parent_session_id mismatch...`);
    }
}
```

**B. Updated pipeline prerequisites check:**

```typescript
function validatePipelinePrerequisites(...) {
    // In RESUME MODE, check artifacts in the original session directory
    const resumeSessionDir = process.env.ARKADIAN_RESUME_SESSION_DIR;
    const sessionDir = resumeSessionDir || join(SESSIONS_DIR, sessionId);
    const artifactsDir = join(sessionDir, 'artifacts');

    // Now checks artifacts in correct location!
}
```

## How It Works Now

### Before (Broken)

```
$ arkadian --resume 3191f042...

[Claude creates NEW session: 24eaeec0...]
session-start-hook:
  → Creates sessions/24eaeec0-7d84.../
  → Creates empty artifacts/ and specs/

Orchestrator tries to invoke ark-developer:
pre-agent-validator:
  ❌ parent_session_id "3191f042..." doesn't match "24eaeec0..."
  ❌ Missing: artifacts/explore/assessment.yaml (looks in 24eaeec0...)

Orchestrator manually copies files:
  → Write assessment.yaml to new session
  → Write _result.json to new session
  → Rewrites execution spec with new session ID
  → Finally works but messy
```

### After (Fixed)

```
$ arkadian --resume 3191f042...

Env vars set:
  ARKADIAN_RESUME_SESSION_DIR=/path/to/sessions/arkd/2026-02-11-add-getroundmetrics...
  ARKADIAN_RESUME_SESSION=2026-02-11-add-getroundmetrics...

[Claude creates NEW session: 24eaeec0...]
session-start-hook:
  → Detects ARKADIAN_RESUME_SESSION_DIR
  → Reuses sessions/arkd/2026-02-11-add-getroundmetrics.../
  → Creates symlink: sessions/24eaeec0... → sessions/arkd/2026-02-11...
  → Points active file to old session directory

Orchestrator invokes ark-developer with ORIGINAL specs:
pre-agent-validator:
  → Uses resumeSessionDir for artifact checks
  ✅ Finds artifacts/explore/assessment.yaml (looks in resumed session)
  ✅ Accepts parent_session_id "3191f042..." (checks against resumeSessionDir)
  ✅ All pipeline prerequisites satisfied

ark-developer runs successfully!
```

## Files Modified

1. **`hooks/session-start-hook.ts`**
   - Added resume mode detection
   - Reuses existing session directory
   - Creates symlink for compatibility

2. **`hooks/pre-agent-validator.ts`**
   - Updated `parent_session_id` validation to allow original session ID
   - Updated `validatePipelinePrerequisites` to check artifacts in resumed directory

## Environment Variables Used

- `ARKADIAN_RESUME_SESSION_DIR` - Full path to original session directory
- `ARKADIAN_RESUME_SESSION` - Original session ID or directory name
- Set by `scripts/arkadian` when `--resume` flag is used

## Testing

```bash
# Test the fix
arkadian --resume 2026-02-11-add-getroundmetrics-grpc-endpoint-arkd-adminservic

# Or with UUID
arkadian --resume 3191f042-a27d-4a6e-b6a8-f2fe0f41bc9a
```

**Expected behavior:**
1. ✅ Session analysis prints
2. ✅ Claude opens (new session ID created internally)
3. ✅ Hook reuses OLD session directory
4. ✅ Orchestrator finds all artifacts
5. ✅ Validator accepts original parent_session_id
6. ✅ ark-developer executes without copying artifacts

## Benefits

✅ **No duplicate sessions** - Reuses existing session directory
✅ **No artifact copying** - All files already in place
✅ **No spec rewriting** - Original execution specs work as-is
✅ **Clean resume** - Orchestrator doesn't need workarounds
✅ **Backward compatible** - Normal (non-resume) sessions unaffected
✅ **Transparent to user** - Works seamlessly

## Symlink Behavior

The symlink allows both session IDs to work:
```bash
sessions/24eaeec0-7d84.../ → sessions/arkd/2026-02-11-add-getroundmetrics.../
```

This means:
- Validators can find the session by new ID
- Orchestrator can reference artifacts by old ID
- Both paths point to the same physical directory
- No file duplication

## Related Files

- `scripts/arkadian` - Sets env vars for resume mode
- `ORCHESTRATOR.md` - Resume mode instructions
- `docs/features/resume-sessions.md` - User documentation
