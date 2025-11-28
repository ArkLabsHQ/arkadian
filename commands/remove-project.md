---
description: Remove a project from the Arkadian documentation registry and delete its documentation.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding. The argument should be a project ID from the existing documentation registry.

## Outline

This command removes a project from the Arkadian documentation registry, cleaning up all associated documentation files and references.

**WARNING**: This is a destructive operation. Deleted documentation cannot be recovered unless committed to git.

Given a project-id, do this:

### 1. Validate Input

**Step 1.1: Parse Project ID**

The input should be a valid project-id (lowercase, hyphenated):
- `arkd`
- `go-sdk`
- `boltz-backend`

If input looks like a path, extract the project-id from the directory name.

**Step 1.2: Verify Project Exists**

Check that the project exists in the documentation registry:

1. Load `docs/INDEX.md`
2. Search for project entry with matching ID
3. Verify `docs/projects/<project-id>/` directory exists

If project not found:
- Error: "Project '<project-id>' not found in documentation registry"
- Suggestion: "Available projects: arkd, go-sdk, wallet, ..."
- List available project IDs from INDEX.md

### 2. Analyze Impact

Before removing, gather information about what will be affected:

**Step 2.1: Collect Project Information**

From `docs/INDEX.md`, extract:
- Project Name
- Repository path
- Description (first line)
- Dependencies (what this project depends on)
- Depended On By (what depends on this project)

**Step 2.2: List Files to Delete**

List all documentation files for this project in `docs/projects/<project-id>/`.

**Step 2.3: Check for Dependents**

**CRITICAL**: If other projects depend on this project, warn the user:

```markdown
WARNING: The following projects depend on <project-id>:
- arkd (Server-Client relationship)
- wallet (uses as library)

Removing this project may leave orphaned references in documentation.
```

### 3. Present Removal Plan

Show the user exactly what will happen:

```markdown
## Removal Plan for <project-id>

**Project**: <project-id> (<Project Name>)
**Repository**: <repository-path>

### Files to Delete:
- docs/projects/<project-id>/INDEX.md
- docs/projects/<project-id>/system/project_overview.md
- docs/projects/<project-id>/system/architecture.md
- docs/projects/<project-id>/testing/usage.md
[... list all files ...]

**Total**: <N> files in <M> directories

### INDEX.md Updates:
- Remove project entry section (~30 lines)
- Remove from Dependency Graph
- Remove from Correlation Matrix
- Remove from Technology Groupings
- Update "Depended On By" in related projects

### Dependencies Affected:
- <dependent-project-1>: Will have orphaned "Depended On By" reference
- <dependent-project-2>: Will have orphaned "Dependencies" reference

---
This action cannot be undone (unless you have uncommitted changes).

Type "CONFIRM REMOVAL" to proceed, or "cancel" to abort.
```

### 4. Execute Removal (After Confirmation)

Only proceed if user explicitly confirms with "CONFIRM REMOVAL".

**Step 4.1: Update Master INDEX.md**

Remove the following from `docs/INDEX.md`:

1. **Project Entry Section**: Delete entire block from `### <project-id>` to next `---`

2. **Dependency Graph**: Remove project from the ASCII tree and any references

3. **Correlation Matrix**: Remove all rows mentioning this project

4. **Technology Groupings**: Remove from the appropriate language group

5. **Update Related Projects**:
   - Find projects that list this project in "Dependencies"
   - Find projects that list this project in "Depended On By"
   - Remove references (or leave comment noting removal)

**Step 4.2: Delete Documentation Directory**

Delete the entire `docs/projects/<project-id>/` directory and all its contents.

**Step 4.3: Update Project Status Summary**

Remove the project row from the status table in INDEX.md.

### 5. Validation

Verify removal was complete:

- [ ] Project entry removed from INDEX.md
- [ ] Project not found in Dependency Graph
- [ ] Project not found in Correlation Matrix
- [ ] Project removed from Technology Groupings
- [ ] Project removed from Status Summary table
- [ ] `docs/projects/<project-id>/` directory deleted
- [ ] No orphaned references remain (or are documented)

### 6. Report Completion

```markdown
## Project Removed Successfully

**Project**: <project-id> (<Project Name>)

### Removed:
- **Documentation Directory**: docs/projects/<project-id>/ (<N> files)
- **INDEX.md Entry**: ~<M> lines removed
- **Dependency References**: Updated <X> related projects

### Files Deleted:
1. docs/projects/<project-id>/INDEX.md
2. docs/projects/<project-id>/system/project_overview.md
[... list all ...]

### Related Projects Updated:
- <related-project>: Removed from "Depended On By"

### Next Steps:
1. Review the changes with `git status` and `git diff`
2. Create a branch, commit, and push when ready
3. If removal was a mistake, use `git checkout -- docs/` to restore
```

## Error Handling

**Project Not Found**:
- Error: "Project '<project-id>' not found in documentation registry"
- Show list of available projects

**User Cancels**:
- Message: "Removal cancelled. No changes made."
- Exit gracefully

**Permission Denied**:
- Error: "Cannot delete docs/projects/<project-id>/"
- Check file permissions

## Safety Features

1. **Explicit Confirmation**: Requires typing "CONFIRM REMOVAL"
2. **Impact Preview**: Shows all files and references before deletion
3. **Dependent Warning**: Highlights if other projects depend on this one
4. **Reversible**: User can use git to restore if needed

## Usage Examples

```bash
# Remove a project by ID
/remove-project boltz-backend

# Remove after confirming the project name
/remove-project arkade-explorer
```

## Integration with Other Commands

- `/add-project` - Adds projects (opposite operation)
- `/update-project` - Updates existing projects
- `/remove-project` - Removes projects (this command)

Complete lifecycle:
```bash
/add-project /path/to/project    # Add to registry
/update-project my-project       # Keep up-to-date
/remove-project my-project       # Remove when no longer needed
```
