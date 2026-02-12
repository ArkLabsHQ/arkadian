# Worktree Creation Enhancement Summary

## ✅ What Changed

### File Modified
- **`agents/ark-developer.md`** - Worktree creation protocol (lines 344-410)

### Key Improvements

| Feature | Before | After |
|---------|--------|-------|
| **Path** | `.worktrees/arkadian/{date}-{task}` | `.worktree/arkadian/{date}-{task}` |
| **Branch Name** | `arkadian/{date}-{task}` | `{date}-{task}` |
| **Base Ref** | Current HEAD | Latest upstream/origin master/main |
| **Forked Repos** | ❌ Not supported | ✅ Auto-detects upstream |
| **Branch Collision** | ❌ Fails | ✅ Adds timestamp suffix |
| **Stale Worktrees** | ❌ Fails | ✅ Auto-cleans |
| **Default Branch** | Hardcoded master | ✅ Detects main/master |

## 🎯 New Capabilities

### 1. Upstream Sync (Forked Repos)
```bash
# Automatically detects and uses upstream
git fetch upstream master  # For forked repos
git fetch origin master    # For direct repos
```

### 2. Smart Branch Naming
```bash
# Old: arkadian/2026-02-11-add-metrics
# New: 2026-02-11-add-metrics

# Collision handling:
# First run: 2026-02-11-add-metrics
# Second run: 2026-02-11-add-metrics-164523  # HH:MM:SS suffix
```

### 3. Robust Directory Management
```bash
# Always creates: .worktree/arkadian/
# Cleans stale directories automatically
# Adds to .gitignore if missing
```

## 🧪 How to Test

### Test 1: Basic Worktree Creation (arkd)

```bash
# In arkadian repo
cd /Users/dusansekulic/code/go/ark

# Manually run the new script
TASK_SLUG="test-enhancement"
DATE=$(date +%Y-%m-%d)
BRANCH_NAME="${DATE}-${TASK_SLUG}"
WORKTREE_BASE="${PWD}/.worktree/arkadian"
mkdir -p "${WORKTREE_BASE}"

# Detect default branch
DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
[ -z "$DEFAULT_BRANCH" ] && DEFAULT_BRANCH="master"

# Fetch latest
git fetch origin "${DEFAULT_BRANCH}"

# Create worktree
WORKTREE_DIR="${WORKTREE_BASE}/${BRANCH_NAME}"
git worktree add "${WORKTREE_DIR}" -b "${BRANCH_NAME}" "origin/${DEFAULT_BRANCH}"

# Verify
ls -la .worktree/arkadian/
git worktree list
```

**Expected Output:**
```
✅ Worktree created: .worktree/arkadian/2026-02-11-test-enhancement
   Branch: 2026-02-11-test-enhancement
   Base: origin/master
```

### Test 2: Forked Repo with Upstream (boltz-backend)

**Setup:**
```bash
cd /Users/dusansekulic/code/go/boltz-backend

# Add upstream if not present
git remote | grep upstream || \
  git remote add upstream https://github.com/BoltzExchange/boltz-backend.git
```

**Test:**
```bash
# Check remotes
git remote -v

# Fetch should use upstream
git fetch upstream master

# Verify it fetches from upstream
git log -1 upstream/master
```

### Test 3: Via ark-developer Agent

Create a test execution spec:

```yaml
# test-worktree.yaml
step_id: "TEST"
agent: "ark-developer"
objective: "Test worktree creation with enhancement"
user_request: "Test worktree creation"
context_intent: "dev"
parent_session_id: "test-123"

projects:
  - id: "arkd"
    repo_source:
      repo_root: "/Users/dusansekulic/code/go/ark"

runtime:
  resolve_envs: true
  allow_external: true

worktree_config:
  enabled: true
```

Then invoke:
```bash
# In a Claude session
cd /Users/dusansekulic/code/go/ark
# Read the test spec and ask ark-developer to create worktree
```

## 🔧 Repos Needing Upstream Setup

Check these repos and add `upstream` remote if forked from public sources:

### Forked Repos (Need Upstream)
```bash
# boltz-backend (forked from BoltzExchange)
cd /Users/dusansekulic/code/go/boltz-backend
git remote add upstream https://github.com/BoltzExchange/boltz-backend.git

# Check if any others are forked
cd /Users/dusansekulic/code/go
for repo in */; do
  (cd "$repo" && git remote -v | grep -q "upstream" && echo "$repo: Has upstream" || echo "$repo: No upstream")
done
```

### Direct Repos (No Upstream Needed)
- arkd (ark-labs/arkd)
- go-sdk (ark-labs/go-sdk)
- wallet (ark-labs/wallet)
- ark-faucet (ark-labs/ark-faucet)
- ark-simulator (ark-labs/ark-simulator)
- ark-telemetry (ark-labs/ark-telemetry)
- fulmine (ark-labs/fulmine)
- kms-unlocker (ark-labs/kms-unlocker)

## 📝 Migration Notes

### Existing Worktrees
Old worktrees in `.worktrees/` are unaffected:
```
.worktrees/           ← Old (still work)
.worktree/            ← New (enhanced)
```

### Cleanup Old Worktrees
```bash
# List all
git worktree list

# Remove old format
git worktree remove .worktrees/arkadian/old-branch

# Remove entire old directory (after cleaning all worktrees)
rm -rf .worktrees
```

### Update .gitignore
If your repos have `.worktrees/` in .gitignore, add `.worktree/` too:
```bash
# Add both (for transition period)
echo ".worktree/" >> .gitignore

# Or search/replace
sed -i '' 's/\.worktrees\//\.worktree\//' .gitignore
```

## 🐛 Troubleshooting

### Issue: "Branch already exists"
**Solution:** Script auto-adds timestamp suffix, no action needed

### Issue: "Upstream fetch failed"
**Solution:** Script falls back to origin automatically

### Issue: "Directory not empty"
**Solution:** Script force-removes stale directory

### Issue: "Not a valid object name"
**Solution:** Check if `git fetch` succeeded and branch exists

## 🚀 Next Steps

1. **Test with arkd:** Run basic worktree creation
2. **Setup upstream remotes:** For any forked repos
3. **Try with ark-developer:** Create a real feature branch
4. **Monitor first few runs:** Check for any issues
5. **Clean old worktrees:** Gradually migrate to new format

## 📚 Documentation

- Full details: `docs/features/worktree-hardening.md`
- Agent implementation: `agents/ark-developer.md` (lines 344-410)
