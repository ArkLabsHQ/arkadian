---
name: update-project
description: "Update project documentation based on new commits and changes in the repository. Use when: user wants to sync docs after project changes."
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# Update Project Documentation

**When to use:**
- User wants to update documentation for a project after new commits
- User provides a project ID or path, optionally with `--dry-run`

**User input:** A project ID (e.g., `arkd`) or absolute path, optionally followed by `--dry-run`.

## Outline

This skill analyzes new commits in a project repository and updates the documentation accordingly, keeping the Arkadian registry up-to-date.

### 1. Validate Input and Locate Project

**Parse input:**
- If path (starts with `/` or `~`): use as repo location, derive project-id from directory name
- If project-id: load `${ARKADIAN_DIR}/docs/INDEX.md`, find matching entry, extract repo path
- If `--dry-run` flag: analyze but don't modify files

**Validate:**
- Project exists in registry (`docs/projects/<project-id>/`)
- Required files exist
- Repository path exists and is a git repository

### 2. Analyze Changes Since Last Sync

**Step 2.1: Get Last Sync Commit**

```bash
LAST_SYNC_FILE="${ARKADIAN_DIR}/docs/projects/<project-id>/change-log/last-sync.txt"
LAST_SYNC_COMMIT=$(cat "$LAST_SYNC_FILE" | tr -d '[:space:]')
```

**Step 2.2: Analyze Repository Changes**

```bash
cd <project-repo-path>
git log ${LAST_SYNC_COMMIT}..HEAD --oneline --no-merges
git log ${LAST_SYNC_COMMIT}..HEAD --stat --no-merges
git diff ${LAST_SYNC_COMMIT}..HEAD --name-only
CURRENT_COMMIT=$(git rev-parse HEAD)
```

**Step 2.3: Categorize Changes**

Group by: Features Added/Modified/Removed, Configuration Changes, Dependencies, Architecture Changes, Bug Fixes, Documentation.

### 3. Determine What Needs Updating

| Change Type | Target File(s) |
|-------------|----------------|
| New capabilities | `docs/INDEX.md`, `system/project_overview.md` |
| Dependencies changed | `docs/INDEX.md` |
| New features | `system/project_overview.md` |
| New API endpoints | `testing/api-reference.md` |
| New env variables | `testing/usage.md`, `testing/how_to_run.md` |
| New components | `system/architecture.md` |
| Build/test changes | `sop/development-workflow.md` |

### 4. Update Documentation Files

For each file needing updates:
1. Read current content
2. Identify sections needing updates
3. Generate updated content (add new, update changed, mark deprecated with **[DEPRECATED]**)
4. Preserve structure and size limits
5. Write updated file (skip if dry-run)

**Size Limits:** `usage.md` 120 lines, `architecture.md` 700 words, `api-reference.md` 200 lines/group, `project_overview.md` 150 lines.

### 5. Update Master INDEX.md

Update: Key Capabilities, Tags, Dependencies, Depended On By, Dependency Graph, Correlation Matrix.

### 6. Update Sync Tracking

```bash
echo "$CURRENT_COMMIT" > ${ARKADIAN_DIR}/docs/projects/<project-id>/change-log/last-sync.txt
```

Append entry to `change-log/SYNC_HISTORY.md` with date, commits analyzed, changes made.

### 7. Commit (if not dry-run)

```bash
git checkout -b feat/docs-update-<project-id>
git add docs/INDEX.md docs/projects/<project-id>/
git commit -m "docs(<project-id>): update documentation for recent changes"
```

### 8. Report

Show: sync summary (previous/current commit, commits analyzed), documentation updates (files modified, features added, breaking changes), and next steps.

For dry-run: show what WOULD change without modifying anything.

## Smart Update Detection

- No relevant commits → "No documentation updates needed"
- Only internal changes (tests, CI, formatting) → summary only, skip doc updates
- Breaking changes → prominently mark with warning

## Documentation Update Principles

1. **Preserve Manual Edits**: Don't overwrite custom sections
2. **Incremental Updates**: Add to existing content, don't replace entirely
3. **Mark Deprecations**: Use **[DEPRECATED]** prefix
4. **Breaking Changes**: Highlight with warning markers
5. **Maintain Style**: Keep documentation concise and consistent
