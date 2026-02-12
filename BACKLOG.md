# Arkadian Feature Backlog

Features that were started but are postponed for later completion.

## Postponed Features

### 1. Session Resume (Priority: Medium)

**Status**: Removed in v1.x
**Reason**: Session detection and resume logic not working correctly

**What was implemented**:
- `findResumableSessions()` in session-start-hook.ts
- `scripts/list-sessions.ts` for CLI listing
- Resume commands in `scripts/arkadian`
- ORCHESTRATOR.md sections for resume detection

**To complete later**:
- [ ] Fix session state persistence across restarts
- [ ] Test resume from specific phases (S1, S2, S3, S4)
- [ ] Handle cross-session artifact paths correctly
- [ ] Add session cleanup for old incomplete sessions

---

### 2. ark-scout Agent (Priority: Low)

**Status**: Removed in v1.x
**Reason**: Session index infrastructure not built

**What was implemented**:
- `agents/ark-scout.md` agent definition
- Phase 0 "scout" in development_unified.yaml

**To complete later**:
- [ ] Build session index at `sessions/.index/manifest.json`
- [ ] Implement session summarization on completion
- [ ] Add relevance scoring algorithm
- [ ] Test context bundle generation

---

### 3. Development Loop / Auto-Retry (Priority: Medium)

**Status**: Removed in v1.x
**Reason**: Retry logic causing infinite loops, state management issues

**What was implemented**:
- WORKFLOW_COMPLETE signals in post-agent-validator.ts
- Retry context format in ORCHESTRATOR.md
- Loop iteration tracking

**To complete later**:
- [ ] Fix max iteration enforcement
- [ ] Implement proper test failure detection
- [ ] Add escape hatch for stuck loops
- [ ] Test with real failing tests

---

### 4. Headless Mode (Priority: Low)

**Status**: Removed in v1.x
**Reason**: Depends on session resume; also needs testing

**What was implemented**:
- `--headless` flag in scripts/arkadian
- Auto-approval logic in ORCHESTRATOR.md

**To complete later**:
- [ ] Re-add after session resume is fixed
- [ ] Add timeout handling for headless runs
- [ ] Implement notification on completion
- [ ] Test with CI integration

---

## Completed Improvements

### Worktree Enforcement (2026-01-21)

**Problem**: ark-developer created worktrees but wrote changes to main repo instead.

**Solution**:
1. Updated `pre-agent-validator.ts` to block main repo paths when `worktree_config.enabled: true`
2. Updated `ark-developer.md` to create worktrees INSIDE repo at `${repo_root}/.worktrees/<branch>`
3. Added .gitignore entry for `.worktrees/`
4. Simplified worktree_config (removed `base_dir` - now always inside repo)

**Files changed**:
- `hooks/pre-agent-validator.ts` - Added worktree path enforcement via `blockedPaths`
- `agents/ark-developer.md` - Updated worktree protocol
- `ORCHESTRATOR.md` - Simplified worktree_config documentation
- `templates/sub_agent_input_spec.md` - Removed base_dir from spec format
