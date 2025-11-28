---
description: Update project documentation based on new commits and changes in the repository.
---

## User Input

```text
$ARGUMENTS
```

Parse the arguments to determine:
- **project**: Required. Either an absolute path to a project repository OR a project ID from the registry
- **--dry-run**: Optional. Analyze changes without modifying files or creating commits

Examples:
- `/update-project arkd` - Update arkd documentation
- `/update-project /Users/name/code/fulmine` - Update by path
- `/update-project boltz-backend --dry-run` - Preview changes only

## Outline

This command analyzes new commits in a project repository and updates the documentation accordingly, keeping the Arkadian registry up-to-date with project changes.

### 1. Validate Input and Locate Project

**Step 1.1: Parse Input**

If input is a path (starts with `/` or `~`):
- Use the provided path as project repository location
- Derive project-id from directory name (lowercase, hyphenated)

If input is a project-id:
- Load master INDEX.md from `${ARKADIAN_DIR}/docs/INDEX.md`
- Find project entry with matching ID
- Extract repository path from project metadata

**Step 1.2: Validate Project Exists in Registry**

Check that:
- Project exists in documentation registry (`docs/projects/<project-id>/`)
- Required files exist (see Required Files section below)
- Repository path exists and is accessible
- Repository has `.git` directory (is a git repository)

If validation fails, provide helpful error message with suggestions.

**Step 1.3: Check for Dry-Run Mode**

If `--dry-run` flag is present:
- Set `DRY_RUN=true`
- All analysis steps will execute
- No files will be modified
- No branches or commits will be created

### 2. Analyze Changes Since Last Sync

**Step 2.1: Get Last Sync Commit**

Read the last synced commit from the dedicated tracking file:

```bash
LAST_SYNC_FILE="${ARKADIAN_DIR}/docs/projects/<project-id>/change-log/last-sync.txt"

if [ -f "$LAST_SYNC_FILE" ] && [ -s "$LAST_SYNC_FILE" ]; then
  LAST_SYNC_COMMIT=$(cat "$LAST_SYNC_FILE" | tr -d '[:space:]')
  echo "Last sync commit: $LAST_SYNC_COMMIT"
else
  LAST_SYNC_COMMIT=""
  echo "No previous sync found - will analyze recent commits"
fi
```

**Step 2.2: Analyze Project Repository Changes**

Navigate to project repository and get commits since last sync:

```bash
cd <project-repo-path>

if [ -n "$LAST_SYNC_COMMIT" ]; then
  # Get commits since last sync
  git log ${LAST_SYNC_COMMIT}..HEAD --oneline --no-merges

  # Get detailed changes
  git log ${LAST_SYNC_COMMIT}..HEAD --stat --no-merges

  # Get changed files summary
  git diff ${LAST_SYNC_COMMIT}..HEAD --name-only

  # Count commits
  COMMIT_COUNT=$(git rev-list ${LAST_SYNC_COMMIT}..HEAD --count)
else
  # No previous sync - analyze last 50 commits or 30 days
  git log --since="30 days ago" --oneline --no-merges | head -50
  COMMIT_COUNT=$(git log --since="30 days ago" --oneline --no-merges | wc -l)
fi

# Get current HEAD for later
CURRENT_COMMIT=$(git rev-parse HEAD)
```

**Step 2.3: Check Documentation Freshness**

Report sync status:

```markdown
## Sync Status

**Last Sync**: <commit-hash> (<date>)
**Current HEAD**: <current-hash> (<date>)
**Commits Behind**: <N> commits
**Days Since Sync**: <D> days

⚠️  Warning: Documentation is significantly outdated (>50 commits behind)
```

**Step 2.4: Categorize Changes**

Group changes by type:

- **Features Added**: New capabilities, endpoints, commands
- **Features Modified**: Changed behavior, updated APIs
- **Features Removed**: Deprecated/removed functionality
- **Configuration Changes**: New environment variables, config options
- **Dependencies**: Added/updated/removed dependencies
- **Architecture Changes**: Major refactoring, new components
- **Bug Fixes**: Notable fixes that affect usage
- **Documentation**: README updates, inline doc changes

**Step 2.5: Extract Key Information**

From commit messages and diffs, identify:
- New features to document
- Changed APIs to update
- Deprecated features to mark
- New configuration options
- Updated dependencies
- Architecture changes
- Breaking changes (mark with ⚠️)

### 3. Determine What Needs Updating

Based on change analysis, decide which documentation files need updates:

| Change Type | Target File(s) |
|-------------|----------------|
| New capabilities | `docs/INDEX.md`, `system/project_overview.md` |
| Dependencies changed | `docs/INDEX.md` |
| New tags/keywords | `docs/INDEX.md` |
| New features | `system/project_overview.md` |
| Removed features | `system/project_overview.md` (mark [DEPRECATED]) |
| New API endpoints | `testing/api-reference.md` |
| Changed endpoints | `testing/api-reference.md` |
| Deprecated endpoints | `testing/api-reference.md` (mark [DEPRECATED]) |
| New env variables | `testing/usage.md`, `testing/how_to_run.md` |
| Setup changes | `testing/usage.md`, `testing/how_to_run.md` |
| New components | `system/architecture.md` |
| Tech stack changes | `system/architecture.md` |
| Integration changes | `system/integration-with-arkd.md` (if exists) |
| Build/test changes | `sop/development-workflow.md` |

### 4. Update Documentation Files

For each file that needs updating:

**Step 4.1: Read Current Content**

Load existing documentation file.

**Step 4.2: Identify Update Locations**

Find sections that need updates:
- Features list
- API endpoints
- Configuration options
- Architecture diagrams
- Code examples

**Step 4.3: Generate Updated Content**

Based on commit analysis:
- Add new features/capabilities
- Update changed APIs with new signatures
- Mark deprecated items with **[DEPRECATED]** prefix
- Update version numbers if present
- Refresh code examples with new syntax

**Step 4.4: Preserve Structure and Size Limits**

Maintain:
- Section order
- Markdown formatting
- Code block syntax
- Link references
- Documentation style (concise, focused)

**Size Limits** (same as /add-project):
- `usage.md`: ≤ 120 lines
- `architecture.md`: ≤ 700 words
- `api-reference.md`: ≤ 200 lines per endpoint group
- `project_overview.md`: ≤ 150 lines

**Step 4.5: Write Updated File**

If NOT dry-run mode, save updated documentation with changes.

### 5. Update Master INDEX.md

**Step 5.1: Update Project Entry**

Modify the project section in `docs/INDEX.md`:

- **Key Capabilities**: Add new features, remove deprecated ones
- **Tags**: Add new relevant tags based on features
- **Dependencies**: Update if dependencies changed
- **Depended On By**: Update if new projects depend on this one

**Step 5.2: Update Dependency Graph**

If dependencies changed:
- Add new dependency relationships
- Remove obsolete dependencies
- Update dependency tree

**Step 5.3: Update Correlation Matrix**

If integration points changed:
- Add new project relationships
- Update relationship types
- Remove obsolete relationships

### 6. Validation

Verify update completeness:

- [ ] All detected changes reflected in documentation
- [ ] Breaking changes clearly marked with ⚠️
- [ ] Deprecated items marked with **[DEPRECATED]**
- [ ] No placeholder text remains ([TODO], [FIXME])
- [ ] File size limits respected
- [ ] Master INDEX.md updated if capabilities/deps changed
- [ ] Documentation style consistent with existing content

### 7. Update Sync Tracking

**Step 7.1: Update last-sync.txt**

Record the current commit as the new sync point:

```bash
cd <project-repo-path>
CURRENT_COMMIT=$(git rev-parse HEAD)

# Write current commit to sync tracking file
echo "$CURRENT_COMMIT" > ${ARKADIAN_DIR}/docs/projects/<project-id>/change-log/last-sync.txt
```

**Step 7.2: Update SYNC_HISTORY.md**

Append entry to sync history:

```bash
cat >> ${ARKADIAN_DIR}/docs/projects/<project-id>/change-log/SYNC_HISTORY.md << EOF

## $(date '+%Y-%m-%d %H:%M:%S') - Documentation Update
**Commit**: \`${CURRENT_COMMIT}\`
**Previous Sync**: \`${LAST_SYNC_COMMIT:-"initial"}\`
**Synced By**: /update-project command
**Status**: Completed

**Commits Analyzed**: ${COMMIT_COUNT} commits

**Changes**:
- [List documentation files updated]
- [Features added/modified/removed]
- [Breaking changes if any]

**Files Updated**:
- docs/INDEX.md
- docs/projects/<project-id>/[list of files]
EOF
```

### 8. Create Change Summary

Generate a summary of what was updated:

```markdown
## Documentation Updates for <project-name>

**Project**: <project-id>
**Repository**: <project-path>
**Commits Analyzed**: <N> commits (<last-sync-commit>..<current-commit>)
**Sync Status**: <last-sync-date> → <now>

### Changes Detected:

#### Features Added:
- New feature 1 (commit abc123)
- New feature 2 (commit def456)

#### Features Modified:
- Updated API endpoint X (commit ghi789)
- Changed configuration option Y (commit jkl012)

#### Features Removed:
- Deprecated legacy feature Z (commit mno345)

#### Configuration Changes:
- Added ENV_VAR_NEW environment variable
- Updated default port from 8080 to 9000

#### Dependencies:
- Added: dependency-x@2.0.0
- Updated: dependency-y@1.0.0 → 2.0.0
- Removed: legacy-dep@0.5.0

#### Breaking Changes:
⚠️  API endpoint /api/v1/users response format changed
⚠️  Default port changed 8080 → 9000

### Documentation Files Updated:

- ✅ docs/INDEX.md
  - Updated Key Capabilities (added 2 features)
  - Updated Dependencies (added 1, removed 1)

- ✅ docs/projects/<project-id>/system/project_overview.md
  - Added new features to feature list
  - Updated use cases section

- ✅ docs/projects/<project-id>/testing/api-reference.md
  - Documented new /api/v2/endpoint
  - Updated /api/v1/users endpoint (breaking change)
  - Marked /api/legacy as [DEPRECATED]

- ✅ docs/projects/<project-id>/testing/usage.md
  - Added new configuration options
  - Updated Docker deployment section

- ✅ docs/projects/<project-id>/change-log/last-sync.txt
  - Updated to current commit

- ✅ docs/projects/<project-id>/change-log/SYNC_HISTORY.md
  - Added sync entry

- ℹ️  docs/projects/<project-id>/system/architecture.md
  - No changes needed (architecture unchanged)
```

### 9. Commit Documentation Updates

**Skip this step if `--dry-run` mode is active.**

**Step 9.1: Create Branch**

```bash
git checkout -b feat/docs-update-<project-id>
```

**Step 9.2: Stage Changes**

```bash
git add docs/INDEX.md docs/projects/<project-id>/
```

**Step 9.3: Create Commit**

```bash
git commit -m "$(cat <<'EOF'
docs(<project-id>): update documentation for recent changes

Analyzed <N> commits since <last-sync-commit> and updated documentation:

Features Added:
- New feature 1 (abc123)
- New feature 2 (def456)

Features Modified:
- Updated API endpoint X (ghi789)

Configuration Changes:
- Added ENV_VAR_NEW environment variable

Dependencies:
- Added: dependency-x@2.0.0
- Updated: dependency-y@1.0.0 → 2.0.0

Breaking Changes:
- ⚠️  /api/v1/users response format changed

Files Updated:
- docs/INDEX.md (capabilities, dependencies)
- docs/projects/<project-id>/system/project_overview.md
- docs/projects/<project-id>/testing/api-reference.md
- docs/projects/<project-id>/testing/usage.md
- docs/projects/<project-id>/change-log/last-sync.txt
- docs/projects/<project-id>/change-log/SYNC_HISTORY.md

Repository: <project-path>
Commits: <last-sync-commit>..<current-commit>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### 10. Report Completion

**For Normal Mode:**

```markdown
## Documentation Updated Successfully

**Project**: <project-id> (<Project Name>)
**Branch**: feat/docs-update-<project-id>
**Repository**: <project-path>

### Sync Summary:
- **Previous Sync**: <last-sync-commit> (<date>)
- **Current Sync**: <current-commit> (<date>)
- **Commits Analyzed**: <N> commits
- **Days Covered**: <D> days

### Documentation Updates:
- **Files Modified**: <X> documentation files
- **Features Added**: <Y> new features documented
- **API Changes**: <Z> endpoints updated
- **Breaking Changes**: <N> breaking changes documented

### Files Updated:
1. docs/INDEX.md
   - Updated Key Capabilities (+2, -1)
   - Updated Dependencies (+1, -1)

2. docs/projects/<project-id>/system/project_overview.md
   - Added 2 new features
   - Updated use cases

3. docs/projects/<project-id>/testing/api-reference.md
   - Added new endpoint: POST /api/v2/resource
   - Updated endpoint: GET /api/v1/users (breaking change)
   - Deprecated: GET /api/legacy (marked for removal)

4. docs/projects/<project-id>/testing/usage.md
   - Added new environment variables
   - Updated Docker configuration

5. docs/projects/<project-id>/change-log/last-sync.txt
   - Updated to: <current-commit>

6. docs/projects/<project-id>/change-log/SYNC_HISTORY.md
   - Added sync entry for this update

### Breaking Changes Detected:
⚠️  **API Breaking Change**: /api/v1/users response format changed
⚠️  **Config Breaking Change**: Default port changed 8080 → 9000

### Next Steps:
1. Review the updated documentation
2. Verify breaking changes are clearly documented
3. Push branch: `git push origin feat/docs-update-<project-id>`
4. Create pull request (optional)

### Usage Example:
AI agents will now have up-to-date information about:
- New features and capabilities
- Updated API endpoints
- Current configuration options
- Latest dependencies
```

**For Dry-Run Mode:**

```markdown
## Dry Run: Documentation Updates for <project-id>

**Mode**: Preview only (no changes made)
**Project**: <project-id> (<Project Name>)
**Repository**: <project-path>

### Sync Status:
- **Last Sync**: <last-sync-commit> (<date>)
- **Current HEAD**: <current-commit> (<date>)
- **Commits Behind**: <N> commits

### Changes Detected:
[Same change summary as normal mode]

### Files That Would Be Updated:
- docs/INDEX.md (+5 lines, -2 lines)
- docs/projects/<project-id>/system/project_overview.md (+12 lines)
- docs/projects/<project-id>/testing/api-reference.md (+25 lines, -3 lines)
- docs/projects/<project-id>/testing/usage.md (+8 lines)
- docs/projects/<project-id>/change-log/last-sync.txt (overwrite)
- docs/projects/<project-id>/change-log/SYNC_HISTORY.md (+15 lines)

### Breaking Changes That Would Be Documented:
⚠️  API endpoint /api/v1/users response format changed
⚠️  Default port changed 8080 → 9000

---
**No changes were made (dry-run mode)**
Run without `--dry-run` to apply these updates.
```

## Required Files Reference

These files MUST exist for a project (create if missing during update):

```
docs/projects/<project-id>/
├── INDEX.md                          # REQUIRED - Project index with YAML frontmatter
├── system/
│   ├── project_overview.md           # REQUIRED - Features, use cases
│   └── architecture.md               # REQUIRED - Architecture, components
├── testing/
│   ├── usage.md                      # REQUIRED - Quick start, configuration
│   ├── how_to_run.md                 # REQUIRED - Running the project
│   ├── how_to_test.md                # REQUIRED - Testing guide
│   └── troubleshooting.md            # REQUIRED - Common issues
├── sop/
│   └── development-workflow.md       # REQUIRED - Build, test, PR workflow
└── change-log/
    ├── last-sync.txt                 # REQUIRED - Last synced commit hash
    └── SYNC_HISTORY.md               # REQUIRED - Sync history log
```

If any required file is missing, create it with appropriate content based on project analysis.

## Smart Update Detection

### Skip Unnecessary Updates

- If no relevant commits found → Report "No documentation updates needed"
- If only internal changes (tests, CI, formatting) → Report summary but skip doc updates
- If only minor fixes → Provide summary, optionally skip commit

### Detect Breaking Changes

Automatically detect and prominently mark:
- Major version bumps in dependencies
- Removed/changed API endpoints
- Changed configuration options
- Renamed environment variables
- Changed default values

Mark all breaking changes with ⚠️ in documentation.

### Track Documentation Freshness

```markdown
## Documentation Freshness Report

| Metric | Value | Status |
|--------|-------|--------|
| Commits behind | 12 | ✅ OK |
| Days since sync | 5 | ✅ OK |
| Breaking changes | 2 | ⚠️ Review |

Thresholds:
- ⚠️ Warning: >50 commits or >30 days behind
- ❌ Critical: >100 commits or >60 days behind
```

## Error Handling

**Project Not Found**:
```
Error: Project 'unknown-project' not found in documentation registry.

Available projects:
- arkd, go-sdk, wallet, fulmine, ark-faucet, ...

Suggestion: Use `/add-project <path>` to add this project first.
```

**Repository Not Accessible**:
```
Error: Cannot access repository at '/path/to/repo'

Possible causes:
- Path does not exist
- Environment variable not set (check ${PROJECT_REPO})
- Permission denied

Suggestion: Verify the path and check repository access.
```

**No Changes Detected**:
```
Info: No documentation updates needed for <project-id>

Details:
- Last sync: <commit> (<date>)
- Current HEAD: <commit> (same)
- Commits analyzed: 0

The documentation is already up-to-date.
```

**Missing Sync Tracking Files**:
```
Warning: Sync tracking files not found for <project-id>

Creating:
- change-log/last-sync.txt
- change-log/SYNC_HISTORY.md

This update will establish the initial sync baseline.
```

**Git Not Available**:
```
Error: Project at '/path/to/repo' is not a git repository.

Suggestion: Ensure the project has a .git directory.
```

## Guidelines

### Documentation Update Principles

1. **Preserve Manual Edits**: Don't overwrite custom documentation sections
2. **Incremental Updates**: Add to existing content, don't replace entirely
3. **Mark Deprecations**: Clearly mark deprecated features as **[DEPRECATED]**
4. **Version Aware**: Note version numbers when documenting changes
5. **Breaking Changes**: Highlight breaking changes prominently with ⚠️
6. **Maintain Style**: Keep documentation concise and consistent

### Commit Analysis Best Practices

- **Look at commit messages**: Extract feature descriptions
- **Analyze diffs**: Understand actual code changes
- **Check README updates**: Often indicates user-facing changes
- **Review package.json/go.mod/Cargo.toml**: Dependency and version changes
- **Examine API files**: Detect endpoint additions/changes
- **Check for BREAKING CHANGE**: In commit messages (conventional commits)

### Documentation Quality

- **Accurate**: Base updates on actual code changes
- **Concise**: Respect size limits (≤120 lines for usage.md, etc.)
- **Consistent**: Maintain existing documentation style
- **Complete**: Don't leave outdated information
- **Traceable**: Link changes to commits when relevant

## Integration with Other Commands

```bash
# First time: Add project to registry
/add-project /path/to/new/project

# Later: Keep documentation up-to-date
/update-project new-project

# Preview changes before applying
/update-project new-project --dry-run

# Generate operational SOPs if missing
/create-operational-sop new-project

# Remove project from registry
/remove-project new-project
```

## Usage Examples

### Update by Project ID

```bash
# Update arkd documentation
/update-project arkd

# Update fulmine documentation
/update-project fulmine

# Update with dry-run preview
/update-project boltz-backend --dry-run
```

### Update by Path

```bash
# Update using absolute path
/update-project /Users/dusansekulic/code/go/fulmine

# Update another project
/update-project /path/to/another/project
```

### Batch Updates (Manual)

```bash
# Update multiple projects sequentially
/update-project arkd
/update-project go-sdk
/update-project fulmine
```
