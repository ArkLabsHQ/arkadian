# Hardened Worktree Creation Protocol

## Overview

Enhanced worktree creation logic for ark-developer agent with robust handling of forked repositories, upstream synchronization, and collision detection.

## Changes from Previous Version

### Path Structure

**Before:**
```
{PROJECT_REPO}/.worktrees/arkadian/2025-12-19-task-name
```

**After:**
```
{PROJECT_REPO}/.worktree/arkadian/2025-12-19-task-name
```

**Benefits:**
- Singular `.worktree` matches Git convention
- Consistent `arkadian/` namespace for all Arkadian-created branches
- Cleaner separation from manual worktrees

### Branch Naming

**Before:**
```
arkadian/2025-12-19-task-name
```

**After:**
```
2025-12-19-task-name
```

**Rationale:**
- Simpler branch names (no `arkadian/` prefix in branch name)
- The `arkadian/` directory already provides namespace
- Easier to type and reference

## New Features

### 1. Upstream/Origin Detection and Sync

```bash
# Automatically detects if repo is forked
if git remote | grep -q "^upstream$"; then
    git fetch upstream "${DEFAULT_BRANCH}"
    BASE_REF="upstream/${DEFAULT_BRANCH}"
else
    git fetch origin "${DEFAULT_BRANCH}"
    BASE_REF="origin/${DEFAULT_BRANCH}"
fi
```

**Handles:**
- ✅ Forked repos (ark, fulmine, boltz-backend from public repos)
- ✅ Direct repos (arkd, wallet, ark-faucet, etc.)
- ✅ Fallback to origin if upstream fetch fails

### 2. Default Branch Detection

```bash
# Auto-detects main vs master
DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')

# Fallback if not set
if [ -z "$DEFAULT_BRANCH" ]; then
    if git show-ref --verify --quiet refs/remotes/origin/main; then
        DEFAULT_BRANCH="main"
    else
        DEFAULT_BRANCH="master"
    fi
fi
```

**Handles:**
- ✅ Repos using `main` (modern convention)
- ✅ Repos using `master` (older convention)
- ✅ Repos where HEAD pointer isn't set

### 3. Branch Collision Detection

```bash
# Check if branch exists
if git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
    # Add timestamp suffix
    BRANCH_NAME="${BRANCH_NAME}-$(date +%H%M%S)"
fi
```

**Prevents:**
- ❌ Overwriting existing branches
- ❌ Conflicts from repeated runs
- ❌ Lost work from branch name reuse

### 4. Stale Worktree Cleanup

```bash
# Remove stale worktree if directory exists
if [ -d "${WORKTREE_DIR}" ]; then
    git worktree remove "${WORKTREE_DIR}" --force 2>/dev/null || rm -rf "${WORKTREE_DIR}"
fi
```

**Handles:**
- ✅ Orphaned worktree directories
- ✅ Git lock file conflicts
- ✅ Interrupted previous runs

### 5. Worktree Verification

```bash
cd "${WORKTREE_DIR}"
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Worktree not clean after creation"
    git status --short
fi
```

**Detects:**
- ⚠️ Untracked files in new worktree
- ⚠️ Unexpected modifications
- ⚠️ Checkout issues

## Complete Workflow

### Step-by-Step Execution

```bash
# 1. Navigate to project repo
cd /Users/dusansekulic/code/go/ark

# 2. Prepare branch name
TASK_SLUG="add-round-metrics-rpc"
DATE="2026-02-11"
BRANCH_NAME="${DATE}-${TASK_SLUG}"

# 3. Create arkadian directory (if missing)
mkdir -p .worktree/arkadian

# 4. Detect default branch
DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')
# Result: "master" (for arkd)

# 5. Check for upstream remote
git remote | grep upstream
# Result: (none for arkd, "upstream" for forked repos)

# 6. Fetch latest
git fetch origin master
# Updates origin/master to latest

# 7. Create worktree from origin/master
git worktree add .worktree/arkadian/2026-02-11-add-round-metrics-rpc \
    -b 2026-02-11-add-round-metrics-rpc \
    origin/master

# 8. Update .gitignore
echo ".worktree/" >> .gitignore  # (if not present)

# 9. Verify clean state
cd .worktree/arkadian/2026-02-11-add-round-metrics-rpc
git status --porcelain
# Result: (empty - clean worktree)
```

## Repository Type Examples

### Example 1: Direct Repo (arkd)

```bash
# arkd is not forked, works directly on origin
Repo: /Users/dusansekulic/code/go/ark
Remotes: origin
Branch: origin/master

Execution:
→ Fetching from origin...
→ git fetch origin master
→ git worktree add .worktree/arkadian/2026-02-11-task -b 2026-02-11-task origin/master
✅ Worktree created: .worktree/arkadian/2026-02-11-task
   Branch: 2026-02-11-task
   Base: origin/master
```

### Example 2: Forked Repo (boltz-backend)

```bash
# boltz-backend is forked from public BoltzExchange/boltz-backend
Repo: /Users/dusansekulic/code/go/boltz-backend
Remotes: origin, upstream
Branch: upstream/master

Execution:
→ Fetching from upstream (forked repo detected)...
→ git fetch upstream master
→ git worktree add .worktree/arkadian/2026-02-11-task -b 2026-02-11-task upstream/master
✅ Worktree created: .worktree/arkadian/2026-02-11-task
   Branch: 2026-02-11-task
   Base: upstream/master
```

### Example 3: Repo Using `main` (wallet)

```bash
# wallet uses 'main' not 'master'
Repo: /Users/dusansekulic/code/fe/wallet
Remotes: origin
Branch: origin/main

Execution:
→ Detecting default branch: main
→ Fetching from origin...
→ git fetch origin main
→ git worktree add .worktree/arkadian/2026-02-11-task -b 2026-02-11-task origin/main
✅ Worktree created: .worktree/arkadian/2026-02-11-task
   Branch: 2026-02-11-task
   Base: origin/main
```

## Error Handling

### Scenario 1: Upstream Fetch Fails

```bash
→ Fetching from upstream (forked repo detected)...
⚠️  Upstream fetch failed, falling back to origin
→ git fetch origin master
✅ Continue with origin/master
```

**Recovery:** Falls back to origin automatically

### Scenario 2: Branch Already Exists

```bash
⚠️  Branch 2026-02-11-add-metrics already exists locally
→ Using: 2026-02-11-add-metrics-164523
✅ Created with timestamp suffix
```

**Recovery:** Appends HH:MM:SS timestamp to make unique

### Scenario 3: Stale Worktree Directory

```bash
→ Removing stale worktree at .worktree/arkadian/2026-02-11-task
✅ Stale directory cleaned, proceeding with fresh worktree
```

**Recovery:** Force removes old directory, creates fresh

### Scenario 4: Worktree Creation Fails

```bash
❌ Worktree creation failed
Exit code: 1
```

**Recovery:** Fails fast, doesn't proceed with broken state

## .gitignore Update

The script automatically ensures `.worktree/` is ignored:

```bash
grep -q "^\.worktree/$" .gitignore 2>/dev/null || echo ".worktree/" >> .gitignore
```

**Safe for:**
- ✅ Multiple runs (idempotent)
- ✅ Already-present entries (checks first)
- ✅ Missing .gitignore file (creates entry)

## Benefits

### Robustness
1. ✅ Always works from latest upstream/origin
2. ✅ Never overwrites existing branches
3. ✅ Cleans up stale worktrees automatically
4. ✅ Handles both main and master default branches
5. ✅ Graceful fallback if upstream unavailable

### Forked Repo Support
1. ✅ Detects `upstream` remote automatically
2. ✅ Fetches from correct remote
3. ✅ Creates branch from upstream (not stale fork)
4. ✅ Falls back to origin if upstream fails

### Developer Experience
1. ✅ Clear progress messages
2. ✅ Predictable directory structure
3. ✅ No manual intervention needed
4. ✅ Self-healing (removes stale worktrees)
5. ✅ Collision-free branch names

## Cleanup Process

After work is complete and merged:

```bash
# Navigate to original repo
cd /Users/dusansekulic/code/go/ark

# Remove worktree
git worktree remove .worktree/arkadian/2026-02-11-add-metrics

# Delete branch (if merged)
git branch -D 2026-02-11-add-metrics

# If not merged yet
git branch -d 2026-02-11-add-metrics  # safe delete (warns if not merged)
```

## Configuration

### Required Git Setup for Forked Repos

For repositories forked from public sources:

```bash
# Add upstream remote (one-time setup)
cd /Users/dusansekulic/code/go/boltz-backend
git remote add upstream https://github.com/BoltzExchange/boltz-backend.git

# Verify
git remote -v
# origin    git@github.com:your-org/boltz-backend.git (fetch)
# upstream  https://github.com/BoltzExchange/boltz-backend.git (fetch)
```

### Repos Requiring Upstream Setup

Check these repositories and add upstream if forked:
- `boltz-backend` - Forked from BoltzExchange/boltz-backend
- Any other repos cloned from public sources

**How to check:**
```bash
cd /path/to/repo
git remote -v | grep upstream
# If empty, add upstream
```

## Testing the Enhancement

### Test 1: Direct Repo (arkd)
```bash
cd /Users/dusansekulic/code/go/ark
# Run enhanced worktree creation
# Expected: Fetches from origin/master, creates .worktree/arkadian/{branch}
```

### Test 2: Forked Repo (boltz-backend)
```bash
cd /Users/dusansekulic/code/go/boltz-backend
git remote add upstream https://github.com/BoltzExchange/boltz-backend.git
# Run enhanced worktree creation
# Expected: Fetches from upstream/master, creates .worktree/arkadian/{branch}
```

### Test 3: Branch Collision
```bash
# Create same branch twice
# Expected: Second run adds timestamp suffix
```

### Test 4: Stale Worktree
```bash
# Create worktree directory manually
mkdir -p .worktree/arkadian/test-branch
# Run enhanced worktree creation with same name
# Expected: Removes stale directory, creates fresh
```

## Migration from Old Format

Existing worktrees in `.worktrees/` are unaffected. They can coexist:

```
.worktrees/           # Old worktrees (still work)
  arkadian/
    2025-12-01-old-task/
.worktree/            # New worktrees (enhanced)
  arkadian/
    2026-02-11-new-task/
```

Recommended: Clean up old worktrees over time:
```bash
# List all worktrees
git worktree list

# Remove old ones after review
git worktree remove .worktrees/arkadian/old-task
```

## See Also

- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- [ark-developer Agent](../../agents/ark-developer.md)
- [Subagent Guardrail Hook](../../hooks/subagent-guardrail.ts)
