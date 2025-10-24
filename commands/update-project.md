---
description: Update project documentation based on new commits and changes in the repository.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding. The argument should be either:
- An absolute path to a project repository
- A project ID from the existing documentation registry

## Outline

This command analyzes new commits in a project repository and updates the documentation accordingly, keeping the Arkadian registry up-to-date with project changes.

Given a project path or ID, do this:

### 1. Validate Input and Locate Project

**Step 1.1: Parse Input**

If input is a path (starts with `/` or `~`):
- Use the provided path as project repository location
- Derive project-id from directory name

If input is a project-id:
- Load master INDEX.md
- Find project entry with matching ID
- Extract repository path from project metadata

**Step 1.2: Validate Project**

Check that:
- Project exists in documentation registry (`docs/projects/<project-id>/`)
- Repository path exists and is accessible
- Repository has `.git` directory (is a git repository)

If validation fails, provide helpful error message.

### 2. Analyze Changes Since Last Documentation Update

**Step 2.1: Get Last Documentation Commit**

```bash
# Find last commit that touched this project's documentation
git log -1 --format="%H %ai" -- docs/projects/<project-id>/
```

Extract:
- Commit hash
- Timestamp

**Step 2.2: Analyze Project Repository Changes**

Navigate to project repository and get commits since last doc update:

```bash
cd <project-repo-path>

# Get commits since the documentation timestamp
git log --since="<last-doc-timestamp>" --oneline --no-merges

# Get detailed changes
git log --since="<last-doc-timestamp>" --stat --no-merges

# Get changed files summary
git diff <old-commit>..HEAD --name-only
```

**Step 2.3: Categorize Changes**

Group changes by type:

- **Features Added**: New capabilities, endpoints, commands
- **Features Modified**: Changed behavior, updated APIs
- **Features Removed**: Deprecated/removed functionality
- **Configuration Changes**: New environment variables, config options
- **Dependencies**: Added/updated/removed dependencies
- **Architecture Changes**: Major refactoring, new components
- **Bug Fixes**: Notable fixes that affect usage
- **Documentation**: README updates, inline doc changes

**Step 2.4: Extract Key Information**

From commit messages and diffs, identify:
- New features to document
- Changed APIs to update
- Deprecated features to mark
- New configuration options
- Updated dependencies
- Architecture changes

### 3. Determine What Needs Updating

Based on change analysis, decide which documentation files need updates:

**Project Metadata Changes** → Update `docs/INDEX.md`:
- New capabilities added → Update "Key Capabilities"
- Dependencies changed → Update "Dependencies" section
- New tags/keywords → Update "Tags" and "Triggers"

**Feature Changes** → Update `system/project_overview.md`:
- New features → Add to features list
- Removed features → Remove from features list
- Changed use cases → Update use cases section

**API Changes** → Update `testing/api-reference.md`:
- New endpoints → Document new APIs
- Changed endpoints → Update existing API docs
- Deprecated endpoints → Mark as deprecated
- Changed request/response formats → Update schemas

**Configuration Changes** → Update `testing/usage.md`:
- New environment variables → Add to configuration section
- Changed setup steps → Update installation/setup
- New deployment options → Document new approaches

**Architecture Changes** → Update `system/architecture.md`:
- New components → Add to architecture diagram
- Refactored structure → Update component descriptions
- Technology changes → Update tech stack section

**Integration Changes** → Update `system/integration-with-arkd.md` (if exists):
- New integration points → Document new patterns
- Changed APIs → Update integration examples
- New use cases → Add integration scenarios

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

**Step 4.4: Preserve Structure**

Maintain:
- Section order
- Markdown formatting
- Code block syntax
- Link references
- Documentation style (concise, focused)

**Step 4.5: Write Updated File**

Save updated documentation with changes.

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

### 6. Create Change Summary

Generate a summary of what was updated:

```markdown
## Documentation Updates for <project-name>

**Project**: <project-id>
**Repository**: <project-path>
**Commits Analyzed**: <N> commits since <last-update-date>

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

- ℹ️  docs/projects/<project-id>/system/architecture.md
  - No changes needed (architecture unchanged)
```

### 7. Commit Documentation Updates

**Step 7.1: Create Branch**

```bash
git checkout -b docs/update-<project-id>-<YYYYMMDD>
```

**Step 7.2: Stage Changes**

```bash
git add docs/INDEX.md docs/projects/<project-id>/
```

**Step 7.3: Create Commit**

```bash
git commit -m "$(cat <<'EOF'
docs(<project-id>): update documentation for recent changes

Analyzed <N> commits since <last-update-date> and updated documentation:

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

Files Updated:
- docs/INDEX.md (capabilities, dependencies)
- docs/projects/<project-id>/system/project_overview.md
- docs/projects/<project-id>/testing/api-reference.md
- docs/projects/<project-id>/testing/usage.md

Repository: <project-path>
Commits: <commit-range>
EOF
)"
```

### 8. Report Completion

Provide detailed summary:

```markdown
## Documentation Updated Successfully

**Project**: <project-id> (<Project Name>)
**Branch**: docs/update-<project-id>-<YYYYMMDD>
**Repository**: <project-path>

### Commit Analysis:
- **Commits Analyzed**: <N> commits
- **Date Range**: <start-date> to <end-date>
- **Files Changed**: <M> files in project repository

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

### Breaking Changes Detected:
⚠️  **API Breaking Change**: /api/v1/users response format changed
⚠️  **Config Breaking Change**: Default port changed 8080 → 9000

### Next Steps:
1. Review the updated documentation
2. Verify breaking changes are clearly documented
3. Push branch: `git push origin docs/update-<project-id>-<YYYYMMDD>`
4. Create pull request (optional)

### Usage Example:
AI agents will now have up-to-date information about:
- New features and capabilities
- Updated API endpoints
- Current configuration options
- Latest dependencies
```

## Advanced Features

### Smart Update Detection

**Skip Unnecessary Updates**:
- If no relevant commits found, report "No documentation updates needed"
- If only internal changes (tests, CI), skip doc updates
- If only minor fixes, provide summary but don't create commit

**Detect Breaking Changes**:
- Major version bumps in dependencies
- Removed/changed API endpoints
- Changed configuration options
- Clearly mark breaking changes in documentation with ⚠️

**Track Documentation Freshness**:
- Show how many days/commits behind documentation is
- Warn if documentation is significantly outdated (>50 commits behind)

### Incremental Updates

For large changesets, offer to update in phases:
1. Critical updates (breaking changes, new features)
2. API documentation updates
3. Configuration and usage updates
4. Architecture and design updates

### Change Log Integration

Optionally update `docs/projects/<project-id>/change-log/` with:
- Summary of changes from commits
- Links to relevant commits
- Migration guide for breaking changes

## Usage Examples

### Update by Project ID

```bash
# Update boltz-backend documentation
/update-project boltz-backend

# Update arkd documentation
/update-project arkd
```

### Update by Path

```bash
# Update using absolute path
/update-project /Users/dusansekulic/code/go/boltz-backend

# Update another project
/update-project /path/to/another/project
```

### Check for Updates Without Committing

```bash
# Dry run mode (analyze only, no changes)
/update-project boltz-backend --dry-run
```

## Error Handling

**Project Not Found**:
- Error: "Project '<project-id>' not found in documentation registry"
- Suggestion: "Use `/add-project` to add this project first"

**Repository Not Accessible**:
- Error: "Cannot access repository at <path>"
- Suggestion: "Verify path is correct and repository exists"

**No Changes Detected**:
- Info: "No documentation updates needed"
- Detail: "Project repository has no new commits since last update"

**Git Not Available**:
- Error: "Project at <path> is not a git repository"
- Suggestion: "Ensure project has .git directory"

## Guidelines

### Documentation Update Principles

1. **Preserve Manual Edits**: Don't overwrite custom documentation
2. **Incremental Updates**: Add to existing content, don't replace entirely
3. **Mark Deprecations**: Clearly mark deprecated features as **[DEPRECATED]**
4. **Version Aware**: Note version numbers when documenting changes
5. **Breaking Changes**: Highlight breaking changes prominently

### Commit Analysis Best Practices

- **Look at commit messages**: Extract feature descriptions
- **Analyze diffs**: Understand actual code changes
- **Check README updates**: Often indicates user-facing changes
- **Review package.json/Cargo.toml**: Dependency and version changes
- **Examine API files**: Detect endpoint additions/changes

### Documentation Quality

- **Accurate**: Base updates on actual code changes
- **Concise**: Keep documentation lean (same size limits as /add-project)
- **Consistent**: Maintain existing documentation style
- **Complete**: Don't leave outdated information

## Integration with /add-project

These commands work together:

```bash
# First time: Add project to registry
/add-project /path/to/new/project

# Later: Keep documentation up-to-date
/update-project new-project

# Much later: Update again
/update-project new-project
```

## Future Enhancements

Potential additions:
- **Auto-update mode**: Run on schedule (daily/weekly)
- **Webhook integration**: Trigger on git push
- **Diff preview**: Show what will change before committing
- **Interactive mode**: Ask user to confirm each update
- **Change log generation**: Auto-generate CHANGELOG.md entries
- **Version tagging**: Track which project version docs correspond to
