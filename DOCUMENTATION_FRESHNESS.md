# Documentation Freshness Tracking System

**Status**: Phase 2 Complete ✅
**Last Updated**: 2025-10-16

## Overview

The Arkadian documentation freshness tracking system ensures that documentation stays synchronized with repository changes across all 11 projects. It provides visibility into which documentation is stale and tools to refresh it.

## System Components

### 1. Metadata in INDEX.md

Each project's `INDEX.md` contains sync metadata in the YAML frontmatter:

```yaml
---
project_id: arkd
version: 1.0.0
last_sync_commit: e16538b52131080ef247f6fed176db0d15a378bc
last_sync_date: 2025-10-16T12:00:00Z
repository_path: ${ARKD_REPO}
documentation_path: ${ARKADIAN_DOCS}/projects/arkd
commits_behind_upstream: 0
uncommitted_changes: false
---
```

**Fields**:
- `last_sync_commit` - Git commit hash when docs were last synced
- `last_sync_date` - ISO timestamp of last sync
- `repository_path` - Environment variable pointing to source repo
- `documentation_path` - Environment variable pointing to docs
- `commits_behind_upstream` - Number of commits since last sync
- `uncommitted_changes` - Whether repo has uncommitted changes

### 2. Change-Log Directory Structure

Each project has a `change-log/` directory:

```
docs/projects/arkd/change-log/
├── SYNC_HISTORY.md      # Human-readable sync log
└── last-sync.txt        # Machine-readable commit marker
```

**SYNC_HISTORY.md** tracks all documentation syncs:
```markdown
## 2025-10-16 12:00:00 - Documentation Refresh
**Commit**: `7dc82328`
**Commits Analyzed**: 3 commits (7e998d70 → 7dc82328)
**Agent**: Ark Documenter
**Changes**:
- 7dc82328: option to run admin rpcs on separate port
- 7e998d70: arkd-wallet: Prevent Unlock to panic (#724)

**Documentation Updated**:
- system/configuration.md: Added ARKD_ADMIN_PORT documentation
```

**last-sync.txt** contains just the commit hash:
```
e16538b52131080ef247f6fed176db0d15a378bc
```

### 3. Initialization Scripts

**`scripts/arkadian-init-metadata.sh`**
- Reads current commit from each repository
- Adds/updates metadata in all INDEX.md files
- Requires environment variables to be set

**`scripts/arkadian-init-changelogs.sh`**
- Creates SYNC_HISTORY.md in all projects
- Creates last-sync.txt markers
- Safe to run multiple times (won't overwrite)

### 4. SessionStart Hook Enhancement

The environment validation hook (`hooks/arkadian-env-check-hook.js`) will be enhanced to show documentation freshness status on session start.

## Getting Started

### Step 1: Set Up Environment Variables

If not already done, configure your environment:

```bash
# Copy template
cp scripts/env-setup-template.sh ~/.arkadian-env.sh

# Edit with your actual paths
vim ~/.arkadian-env.sh

# Source in your shell
echo 'source ~/.arkadian-env.sh' >> ~/.zshrc
source ~/.zshrc
```

### Step 2: Initialize Change-Logs

Create the change-log structure for all projects:

```bash
cd /path/to/arkadian
./scripts/arkadian-init-changelogs.sh
```

This creates `SYNC_HISTORY.md` and `last-sync.txt` in all 11 projects.

### Step 3: Initialize Metadata

Update INDEX.md files with current commit hashes:

```bash
./scripts/arkadian-init-metadata.sh
```

This reads the current commit from each repository and updates the metadata.

**Requirements**:
- All environment variables must be set
- All repositories must exist and be git repositories

### Step 4: Commit Initial State

```bash
git add docs/projects/*/INDEX.md
git add docs/projects/*/change-log/
git commit -m "docs: initialize freshness tracking system"
```

## Usage

### Checking Freshness Status

**On Session Start** (automatic):
```
Starting Claude Code session...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 DOCUMENTATION FRESHNESS STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ arkd: FRESH (in sync with 7dc8232)
⚠️  go-sdk: 3 commits ahead (last sync: 945cb4b)
⚠️  wallet: DIRTY (uncommitted changes)
✅ ark-faucet: FRESH (in sync with 1a2b3c4)
...

📊 Summary: 8/11 fresh, 2 behind, 1 dirty
💡 To refresh stale docs: arkadian-refresh-docs go-sdk wallet
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Manual Check**:
```bash
arkadian-check-freshness              # Check all projects
arkadian-check-freshness arkd go-sdk  # Check specific projects
arkadian-check-freshness --verbose    # Show commit messages
arkadian-check-freshness --json       # JSON output
```

### Refreshing Documentation

**Manual Refresh**:
```bash
arkadian-refresh-docs go-sdk          # Refresh single project
arkadian-refresh-docs go-sdk wallet   # Refresh multiple projects
arkadian-refresh-docs --all           # Refresh all stale projects
arkadian-refresh-docs --dry-run arkd  # Preview what would be updated
```

This command:
1. Analyzes commits since last sync (categorizes by type)
2. Assesses documentation impact (high/medium/low)
3. Updates change-log/last-sync.txt marker
4. Appends entry to SYNC_HISTORY.md
5. **Phase 3**: Will call Ark Documenter agent to update actual doc files

## File Locations

```
arkadian/
├── scripts/
│   ├── arkadian-init-metadata.sh       # Initialize INDEX.md metadata
│   ├── arkadian-init-changelogs.sh     # Initialize change-log files
│   ├── arkadian-check-freshness.js     # ✅ Check staleness
│   └── arkadian-refresh-docs.js        # ✅ Refresh documentation
├── agents/
│   └── ark-documenter.md               # (Phase 3) Doc update agent
├── hooks/
│   ├── arkadian-env-check-hook.js      # ✅ Shows freshness on startup
│   └── settings.json
└── docs/
    ├── DOCUMENTATION_FRESHNESS.md      # This file
    └── projects/
        └── {project}/
            ├── INDEX.md                 # With sync metadata
            └── change-log/
                ├── SYNC_HISTORY.md      # Sync history log
                └── last-sync.txt        # Commit marker
```

## Implementation Status

### Phase 1: Foundation ✅ COMPLETE

- ✅ Metadata schema defined
- ✅ Added metadata to arkd INDEX.md (template)
- ✅ Created initialization scripts
- ✅ Created change-log structure in all 11 projects
- ✅ Created SYNC_HISTORY.md in all projects
- ✅ Created last-sync.txt markers

**Deliverables**:
- `scripts/arkadian-init-metadata.sh` - Initialize metadata from repos
- `scripts/arkadian-init-changelogs.sh` - Create change-log files
- All 11 projects have change-log structure
- Documentation of the system (this file)

### Phase 2: Automation ✅ COMPLETE

- ✅ Enhanced SessionStart hook to display freshness
- ✅ Created `arkadian-check-freshness.js` script
- ✅ Created `arkadian-refresh-docs.js` script
- ✅ Tested all scripts

**Deliverables**:
- `hooks/arkadian-env-check-hook.js` - Enhanced with freshness checking
- `scripts/arkadian-check-freshness.js` - Standalone freshness checker
- `scripts/arkadian-refresh-docs.js` - Documentation refresh workflow
- Full documentation of Phase 2 features

### Phase 3: Agent Integration ⏸️ PLANNED

Tasks:
- [ ] Create `agents/ark-documenter.md` agent definition
- [ ] Integrate agent into refresh script
- [ ] Test end-to-end workflow
- [ ] User documentation

## Phase 2 Features

### 1. Enhanced SessionStart Hook

The `hooks/arkadian-env-check-hook.js` now checks documentation freshness on every Claude Code session start.

**Behavior**:
- Validates environment variables (as before)
- Checks all 11 projects for staleness
- Shows compact message if all fresh
- Shows detailed status if any project is stale
- Non-blocking (warnings only)

**Example output** (all fresh):
```
✅ Arkadian environment: 12/12 variables configured
✅ Documentation freshness: 11/11 projects in sync
```

**Example output** (some stale):
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 DOCUMENTATION FRESHNESS STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   ✅ arkd              FRESH (in sync with 7dc8232)
   ⚠️  go-sdk            3 commits ahead (last sync: 945cb4b)
   ⚠️  wallet            DIRTY (uncommitted changes at e5a3b91)
   ✅ ark-faucet        FRESH (in sync with 1a2b3c4)
   ...

📊 Summary: 9/11 fresh
   2 behind upstream
   1 with uncommitted changes

💡 To refresh stale docs: arkadian-refresh-docs go-sdk wallet
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. Standalone Freshness Checker

The `scripts/arkadian-check-freshness.js` script provides detailed freshness checking.

**Features**:
- Check all projects or specific ones
- Verbose mode shows recent commit messages
- JSON output for automation
- Exit codes: 0 (fresh), 1 (stale), 2 (error)

**Usage examples**:
```bash
# Check all projects
arkadian-check-freshness

# Check specific projects
arkadian-check-freshness arkd go-sdk

# Verbose mode (shows commits)
arkadian-check-freshness --verbose arkd

# JSON output (for CI/CD)
arkadian-check-freshness --json
```

**Verbose output includes**:
```
   ⚠️  go-sdk            3 commits ahead (last sync: 945cb4b)
      Recent commits:
        a1b2c3d Add wallet initialization method
                 by Alice, 2 hours ago
        e4f5g6h Fix VTXO expiry calculation
                 by Bob, 5 hours ago
        i7j8k9l Update documentation
                 by Charlie, 1 day ago
```

### 3. Documentation Refresh Script

The `scripts/arkadian-refresh-docs.js` script analyzes commits and updates sync markers.

**Features**:
- Analyzes commits since last sync
- Categorizes by type (feat, fix, docs, etc.)
- Assesses documentation impact (high/medium/low)
- Dry-run mode for previewing changes
- Updates sync markers and history
- Handles uncommitted changes and diverged history

**Usage examples**:
```bash
# Refresh single project
arkadian-refresh-docs arkd

# Refresh multiple projects
arkadian-refresh-docs arkd go-sdk wallet

# Refresh all stale projects
arkadian-refresh-docs --all

# Preview without making changes
arkadian-refresh-docs --dry-run arkd
```

**Output includes**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 Refreshing documentation: arkd
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Analysis:
   Total commits: 5
   Documentation impact:
     🔴 High:   2 commits
     🟡 Medium: 2 commits
     🟢 Low:    1 commit

📝 Commits by Category:

   ✨ Features (2):
      7dc8232 option to run admin rpcs on separate port
               by Developer, 2 days ago
      7e998d7 arkd-wallet: Prevent Unlock to panic (#724)
               by Developer, 3 days ago

   🐛 Bug Fixes (1):
      ...

✍️  Updating sync markers...
   ✅ Updated last-sync.txt: 7dc8232
   ✅ Appended to SYNC_HISTORY.md

✅ Documentation refresh complete for arkd
```

**Commit categories tracked**:
- ✨ Features (high impact)
- 🐛 Bug Fixes (medium impact)
- 📝 Documentation (low impact)
- ♻️ Refactoring (medium impact)
- ⚡ Performance (medium impact)
- ✅ Tests (low impact)
- 🔧 Build System (low impact)
- 👷 CI/CD (low impact)
- 🔨 Chores (low impact)
- 💄 Code Style (low impact)
- ⏪ Reverts (medium impact)

## Maintenance

### After New Commits

When you commit to any repository:

1. **Documentation becomes stale** - `commits_behind_upstream` increases
2. **SessionStart hook warns** - Shows which projects need refresh
3. **Manual refresh** - Run `arkadian-refresh-docs {project}` when ready
4. **Review and commit** - Check changes and commit to arkadian repo

### Weekly Workflow

```bash
# 1. Check all projects
arkadian-check-freshness --verbose

# 2. Refresh stale projects
arkadian-refresh-docs --all

# 3. Review changes
git diff docs/projects/

# 4. Commit updates
git add docs/projects/
git commit -m "docs: weekly refresh across all projects"
```

### Before Major Releases

```bash
# Ensure all docs are fresh
arkadian-refresh-docs --all

# Verify freshness
arkadian-check-freshness

# Should show: "11/11 fresh"
```

## Troubleshooting

### "Missing environment variables"

**Problem**: Init script reports missing env vars

**Solution**:
```bash
# Verify variables are set
env | grep -E 'ARKD_REPO|GO_SDK_REPO|ARKADIAN_DOCS'

# If missing, source your config
source ~/.arkadian-env.sh

# Verify again
env | grep ARKD_REPO
```

### "Repository not found"

**Problem**: Init script can't find repository

**Solution**:
```bash
# Check the path
echo $ARKD_REPO
ls -la $ARKD_REPO

# Update path in ~/.arkadian-env.sh if incorrect
vim ~/.arkadian-env.sh
source ~/.arkadian-env.sh
```

### "Not a git repository"

**Problem**: Directory exists but isn't a git repo

**Solution**:
```bash
# Check if .git exists
ls -la $ARKD_REPO/.git

# If missing, check you have the right path
# The path should point to the repository root, not a subdirectory
```

### Metadata already exists but commit is wrong

**Solution**:
```bash
# Re-run the init script to update
./scripts/arkadian-init-metadata.sh

# It will update existing metadata with current commits
```

## Design Decisions

### Why per-project tracking?
- Simpler to implement and understand
- Each project can be refreshed independently
- No cascading dependencies to manage
- Clear ownership and responsibility

### Why two files (INDEX.md + last-sync.txt)?
- INDEX.md: Human-readable, part of documentation
- last-sync.txt: Fast machine-readable marker for scripts
- Slight duplication but worth the simplicity

### Why no automatic git hooks?
- Gives user control over when to refresh
- Avoids automatic commits to arkadian repo
- Allows batching of updates (weekly vs per-commit)
- User can review AI-generated changes before committing

### Why manual refresh command?
- User decides when documentation needs updating
- Not all commits require doc updates
- AI-assisted updates should be reviewed
- Prevents documentation churn

## Future Enhancements

Potential improvements (not currently planned):

- **Per-file tracking**: Track freshness for individual doc files
- **Automatic refresh CI/CD**: GitHub Actions to auto-update docs
- **Dependency tracking**: If arkd changes, mark go-sdk docs as stale
- **Smart commit analysis**: Use AI to determine if commit affects docs
- **Dashboard**: Web UI showing freshness status
- **Notifications**: Slack/Discord alerts for stale docs

## Related Documentation

- **Environment Setup**: `scripts/env-setup-template.sh`
- **Hooks System**: `hooks/HOOKS.md`
- **PAI Analysis**: `PAI_ANALYSIS.md`
- **TODO**: `TODO.md` - Full implementation roadmap

---

**Questions or issues?** Check the troubleshooting section or review the TODO.md for the full implementation plan.
