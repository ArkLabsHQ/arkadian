# Orchestrator Fix Summary

**Date:** 2025-11-28
**Issue:** Orchestrator not following delegation protocol - answering questions directly instead of presenting plan and delegating to agents

## Root Cause Analysis

The orchestrator was **NOT** following the protocol due to a **PROJECT-LEVEL CLAUDE.md override**.

### Claude Code's CLAUDE.md Hierarchy

According to Claude Code documentation:

```
Priority (Highest to Lowest):
1. Enterprise CLAUDE.md (system-wide)
2. Project CLAUDE.md (./CLAUDE.md or .claude/CLAUDE.md)  <-- OVERRIDES
3. User CLAUDE.md (~/.claude/CLAUDE.md)                  <-- THIS
```

**Project-level CLAUDE.md ALWAYS overrides user-level CLAUDE.md.**

### The Problem

File: `.claude/CLAUDE.md` (project-level, 1661 bytes)

```markdown
## Important Notes

- You must follow project level instructions from @CLAUDE.md and ignore user level instructions in @CLAUDE.md ~/claude/CLAUDE.md
- You must always use default agents when doing changes
  - You must never use user level agents when doing changes in this repo
```

This told Claude to **IGNORE** the orchestrator instructions in `~/.claude/CLAUDE.md`, which is why:
- ✗ No `<intent_summary>` section
- ✗ No `<projects_selected>` section
- ✗ No `<plan>` section
- ✗ No approval request
- ✗ Orchestrator answered directly like ark-guru

## The Fix

### Updated `.claude/CLAUDE.md`

Changed the project-level CLAUDE.md from "ignore orchestrator" to "clarify purpose":

```markdown
## Development Guidelines

When working on Arkadian itself (not using it as an orchestrator):

- Use direct tools (Read, Edit, Write, Bash) instead of delegating to agents
- Make changes directly without the orchestration protocol
- Focus on improving the orchestrator system, not using it

## Important Notes

- This context is for **developing Arkadian**, not **using Arkadian as an orchestrator**
- When testing orchestrator functionality, use a separate Claude session outside this project directory
```

### Why This Works

**Before:**
- Project CLAUDE.md explicitly told Claude to ignore user CLAUDE.md
- Orchestrator instructions in `~/.claude/CLAUDE.md` were never loaded
- Claude behaved like a direct executor, not an orchestrator

**After:**
- Project CLAUDE.md clarifies its purpose (Arkadian development)
- Orchestrator instructions in `~/.claude/CLAUDE.md` are respected
- When working IN arkadian directory: development mode (direct edits)
- When working OUTSIDE arkadian directory: orchestrator mode (delegation)

## Test Results

### Before Fix (from /Users/dusansekulic/code/go/arkadian)

```bash
$ claude -p "What is arkd and what does it do?"

## arkd Overview

**arkd** is the server implementation of an Ark Service Provider...
[Direct answer without delegation]

=== Test Output Analysis ===
✗ Missing <intent_summary> section
✗ Missing <projects_selected> section
✗ Missing <plan> section
✗ Missing approval request
✓ Internal steps are hidden (correct)
✓ Proper workflow (plan shown before completion)
```

### Expected Behavior After Fix

When running from a non-Arkadian directory, orchestrator should:

1. Load master registry: `/Users/dusansekulic/code/go/arkadian/docs/INDEX.md`
2. Classify intent as `ask_question`
3. Select project `arkd` with score and reason
4. Present plan in this format:

```
<intent_summary>
Answer question about arkd functionality
</intent_summary>

<projects_selected>
- arkd: /Users/dusansekulic/code/go/arkadian/docs/projects/arkd/INDEX.md
  - score: 0.95, reason: matched tags: arkd, ark; direct mention
  - depends_on: []
</projects_selected>

<plan>
- group_id: G1
  steps:
    - step_id: S1
      agent: ark-guru
      objective: "Explain what arkd is and what it does"
      repos: ["arkd"]
      docs_hint:
        project_index_path: "/Users/dusansekulic/code/go/arkadian/docs/INDEX.md"
        project:
          id: "arkd"
          index_path: "/Users/dusansekulic/code/go/arkadian/docs/projects/arkd/INDEX.md"
        sections: ["system/project_overview.md", "testing/usage.md"]
      expected_outputs:
        - "Clear explanation of arkd's purpose and functionality"
</plan>

<safety_notes>
- No code changes
- Read-only operation
</safety_notes>

<doc_updates>
None
</doc_updates>

<results_and_next>
Does this plan look good? Should I proceed?
</results_and_next>
```

5. Wait for user approval
6. Spawn ark-guru agent after approval
7. Present ark-guru's results

## Files Modified

### `.claude/CLAUDE.md`

```diff
## Development Guidelines
-## Important Notes

-- You must follow project level instructions from @CLAUDE.md and ignore user level instructions in @CLAUDE.md ~/claude/CLAUDE.md
-- You must always use default agents when doing changes
-  - You must never use user level agents when doing changes in this repo
+
+When working on Arkadian itself (not using it as an orchestrator):
+
+- Use direct tools (Read, Edit, Write, Bash) instead of delegating to agents
+- Make changes directly without the orchestration protocol
+- Focus on improving the orchestrator system, not using it
+
+## Important Notes
+
+- This context is for **developing Arkadian**, not **using Arkadian as an orchestrator**
+- When testing orchestrator functionality, use a separate Claude session outside this project directory
```

## Verification Steps

To verify the fix works:

1. **From OUTSIDE arkadian directory** (e.g., `/tmp`):
   ```bash
   cd /tmp
   claude -p "What is arkd?"
   ```
   Expected: Orchestrator protocol with plan presentation and delegation

2. **From INSIDE arkadian directory**:
   ```bash
   cd /Users/dusansekulic/code/go/arkadian
   claude -p "Add a comment to README.md"
   ```
   Expected: Direct edit mode (no orchestration)

## Key Learnings

1. **Project CLAUDE.md ALWAYS wins** - It overrides user CLAUDE.md
2. **Be explicit about context** - Clarify when each mode applies
3. **Don't fight the hierarchy** - Work with Claude Code's precedence rules
4. **Test from the right location** - Project context changes behavior

## Related Files

- `ORCHESTRATOR.md` - Source of truth (gets installed to `~/.claude/CLAUDE.md`)
- `.claude/CLAUDE.md` - Project-specific context (Arkadian development mode)
- `~/.claude/CLAUDE.md` - Installed orchestrator instructions (user-level)
- `hooks/load-arkadian-context.ts` - Reminder hook on UserPromptSubmit

## Next Steps

1. Test orchestrator from a non-Arkadian directory
2. Verify orchestrator follows complete protocol:
   - Loads registry
   - Classifies intent
   - Selects projects with scoring
   - Presents structured plan
   - Waits for approval
   - Delegates to appropriate agent
3. Document the "two modes" clearly:
   - **Orchestrator mode**: When Claude is launched outside Arkadian
   - **Development mode**: When Claude is launched inside Arkadian
