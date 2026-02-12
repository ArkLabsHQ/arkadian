# Session Resume Feature

## Overview

The `--resume` flag allows you to continue an interrupted or incomplete Arkadian orchestrator session from its last completed phase.

## Usage

```bash
arkadian --resume <session_id>
```

The session ID can be:
- **Original UUID** (works even after rename): `3191f042-a27d-4a6e-b6a8-f2fe0f41bc9a`
- **Renamed directory name**: `2026-02-11-add-getroundmetrics-grpc-endpoint-arkd-adminservic`
- **Partial match** (if unambiguous): `2026-02-11-add`

**Important:** When a session ends, it gets renamed from UUID to a human-readable name. The resume feature supports BOTH:
- If you have the original UUID from logs/status, you can use it
- If you only know the directory name, you can use that
- The script searches `workflow.yaml` files to find sessions by their original UUID

## How It Works

### 1. Session State Detection

When you resume a session, arkadian:
1. Finds the session directory in `sessions/` (supports nested project directories)
2. Reads `workflow.yaml` to understand the workflow structure
3. Checks each phase directory for `_result.json` to determine completion status
4. Identifies the first incomplete phase

### 2. Phase Completion Check

Phases are considered complete if:
- `artifacts/{phase_id}/_result.json` exists AND
- `status` field = `"success"` or `"complete"`

Example completion markers:
- `artifacts/explore/_result.json` → S1 explore phase complete
- `specs/arkd/001-round-metrics/_result.json` → S2 plan phase complete (PM artifacts)
- `artifacts/implement/_result.json` → S3 implement phase complete

### 3. Resume Point

The orchestrator:
1. Shows you which phases are complete
2. Identifies the next pending phase
3. Reads the execution spec for that phase (e.g., `specs/S3.yaml`)
4. Presents the spec for approval
5. After approval, invokes the appropriate agent with full context

## Example: Resuming GetRoundMetrics Implementation

### Session Status Before Resume

```
Session: 2026-02-11-add-getroundmetrics-grpc-endpoint-arkd-adminservic

✅ S1 (explore): Complete - ark-guru
✅ S2 (plan): Complete - ark-project-manager
⏸️  S3 (implement): PENDING - ark-developer
```

### Resume Command

```bash
arkadian --resume 2026-02-11-add-getroundmetrics-grpc-endpoint-arkd-adminservic
```

### What Happens

1. **Session analysis output:**
   ```
   Resuming session: 2026-02-11-add-getroundmetrics-grpc-endpoint-arkd-adminservic
     Directory: /Users/.../sessions/arkd/2026-02-11-...

   Session state analysis:

     ✅ explore: COMPLETE (ark-guru)
     ✅ specs/arkd/001-round-metrics: COMPLETE (ark-project-manager)
     ⏸️  implement: IN PROGRESS or FAILED (no _result.json)

   Next phase to execute: S3.yaml
     Spec: /Users/.../sessions/.../specs/S3.yaml
   ```

2. **Orchestrator loads S3 execution spec** containing:
   - All input artifacts from S1 (explore reports)
   - All planning artifacts from S2 (spec.md, plan.md, tasks.md)
   - Complete implementation instructions
   - Branch name: `feature/round-metrics-rpc`

3. **You approve** the S3 spec

4. **ark-developer executes** implementation phase with worktree, tests, etc.

## When to Use Resume

### Perfect Use Cases

✅ **Session interrupted** - Connection dropped, computer restarted, etc.

✅ **Agent failed** - S1/S2 succeeded but S3 failed, want to retry S3

✅ **Manual testing** - Want to complete phases incrementally with manual validation

✅ **Agent timeout** - Long-running implementation hit timeout, want to continue

### Not Suitable For

❌ **Changing requirements** - If the spec needs changes, start a new session

❌ **Different approach** - Resume uses existing plan, can't change strategy mid-flight

❌ **Completed sessions** - If all phases show `_result.json`, there's nothing to resume

## Troubleshooting

### "No workflow.yaml found"

This session was likely created before the orchestration workflow started. The orchestrator must complete step 1 (create workflow.yaml) before a session is resumable.

**Solution:** Start a new session with the same request.

### "All phases appear complete"

All phases have `_result.json` with status=complete.

**Check:** Run `arkadian status <session_id>` to see detailed phase status

**Solution:** If truly complete, no need to resume. If a phase failed but shows complete, manually delete its `_result.json` and retry resume.

### "Multiple sessions match"

Multiple sessions start with the same prefix.

**Solution:** Provide a more specific session ID or use the full session ID from `arkadian status`.

## Technical Details

### UUID Lookup Mechanism

**Problem:** Sessions get renamed after completion:
- During: `sessions/3191f042-a27d-4a6e-b6a8-f2fe0f41bc9a/`
- After: `sessions/arkd/2026-02-11-add-getroundmetrics-grpc-endpoint-arkd-adminservic/`

**Solution:** The `workflow.yaml` file in each session preserves the original UUID:
```yaml
workflow_id: 3191f042-a27d-4a6e-b6a8-f2fe0f41bc9a
```

When you resume with a UUID, the script:
1. First tries direct directory match
2. Then searches all `workflow.yaml` files for matching `workflow_id`
3. Uses the directory containing the matching workflow file

This means `arkadian --resume 3191f042-a27d-4a6e-b6a8-f2fe0f41bc9a` works even though the directory was renamed!

### Environment Variables Set

When resuming, these are exported:
- `ARKADIAN_RESUME_SESSION` - Session ID (may be UUID or renamed directory)
- `ARKADIAN_RESUME_SESSION_DIR` - Full path to actual session directory
- `ARKADIAN_ORCHESTRATOR_MODE=1` - Standard orchestrator mode

### Orchestrator Resume Instructions

The orchestrator receives special resume mode instructions appended to ORCHESTRATOR.md via:
```bash
--append-system-prompt "$RESUME_PROMPT"
```

These instructions tell the orchestrator to:
1. Skip completed phases
2. Load the next pending phase's execution spec
3. Present it for approval
4. Continue with standard workflow after resume

### Hook Behavior

All hooks function normally in resume mode:
- `orchestrator-guardrail.ts` - Enforces orchestrator restrictions
- `pre-agent-validator.ts` - Validates execution specs
- `post-agent-validator.ts` - Validates agent outputs
- `session-start-hook.ts` - Uses existing session directory

## See Also

- [Session Management](./session-management.md)
- [Workflow Structure](../ORCHESTRATOR.md#workflow-structure)
- [Execution Specifications](../templates/sub_agent_input_spec.md)
