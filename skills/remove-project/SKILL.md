---
name: remove-project
description: "Remove a project from the Arkadian documentation registry and delete all associated documentation files. Use when: user wants to deregister a project."
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# Remove Project from Arkadian Registry

**When to use:**
- User wants to remove a project from the documentation registry
- User provides a project ID

**User input:** A project ID (e.g., `boltz-backend`).

**WARNING**: This is a destructive operation. Deleted documentation cannot be recovered unless committed to git.

## Outline

### 1. Validate Input

- Parse project-id (lowercase, hyphenated)
- Load `docs/INDEX.md` and verify project exists
- Verify `docs/projects/<project-id>/` directory exists

If not found: show error with list of available projects.

### 2. Analyze Impact

**Collect project information** from `docs/INDEX.md`:
- Project Name, Repository path, Description
- Dependencies (what this project depends on)
- Depended On By (what depends on this project)

**List files to delete** in `docs/projects/<project-id>/`.

**Check for dependents** — if other projects depend on this one, warn prominently.

### 3. Present Removal Plan

Show exactly what will happen:
- Files to delete (with count)
- INDEX.md updates (entry removal, dependency graph, correlation matrix, technology groupings)
- Dependencies affected (orphaned references)

**Require explicit confirmation:** User must type "CONFIRM REMOVAL" to proceed.

### 4. Execute Removal (After Confirmation)

Only proceed if user explicitly confirms.

**Step 4.1: Update Master INDEX.md**
1. Delete project entry section
2. Remove from Dependency Graph
3. Remove from Correlation Matrix
4. Remove from Technology Groupings
5. Update related projects (remove references)

**Step 4.2: Delete Documentation Directory**

Delete entire `docs/projects/<project-id>/` directory.

### 5. Validation

Verify:
- [ ] Project entry removed from INDEX.md
- [ ] Not in Dependency Graph, Correlation Matrix, Technology Groupings
- [ ] Directory deleted
- [ ] No orphaned references remain

### 6. Report

Show: files deleted, INDEX.md changes, related projects updated, and next steps (review with `git status`, restore with `git checkout -- docs/` if mistake).

## Safety Features

1. **Explicit Confirmation**: Requires typing "CONFIRM REMOVAL"
2. **Impact Preview**: Shows all files and references before deletion
3. **Dependent Warning**: Highlights if other projects depend on this one
4. **Reversible**: User can use git to restore
