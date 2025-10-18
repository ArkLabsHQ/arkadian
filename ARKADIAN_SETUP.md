# Arkadian Global Setup Guide

This guide explains how to use Arkadian globally across all your projects with Claude Code.

## What Was Configured

Arkadian is now set up to work **globally** - it will be available in any directory when you start Claude Code.

### Files Created/Modified:

1. **`~/.arkadian-env.sh`** - Environment variables for all Arkadian projects
2. **`~/.claude/settings.json`** - Global Claude Code settings with Arkadian hook
3. **`~/.arkadian-claude`** - Launcher script (optional convenience)
4. **`.claude/hooks/`** - Arkadian hooks moved here

## Usage

### Just Use Claude Normally!

Arkadian is now **globally configured** in `~/.claude/settings.json`. You can use it from any directory:

```bash
cd ~/any-project
claude
```

That's it! The SessionStart hook runs automatically.

### Using Arkadian Scripts from Command Line

If you want to use Arkadian's scripts (`arkadian-check-freshness`, `arkadian-refresh-docs`) from the command line, load the environment:

```bash
# Option 1: Load once per session
source ~/.arkadian-env.sh

# Then run scripts
arkadian-check-freshness
arkadian-refresh-docs arkd

# Option 2: Always available (add to ~/.zshrc)
source ~/.arkadian-env.sh

# Option 3: Use full paths
node ${ARKADIAN_DIR}/.claude/scripts/arkadian-check-freshness.js
```

## What Happens on Session Start

When you start Claude Code (from any directory), Arkadian's SessionStart hook runs:

1. ✅ Validates all 12 environment variables are set
2. ✅ Checks documentation freshness for all 11 projects
3. ✅ Shows warnings if any docs are stale
4. ✅ Non-blocking (never prevents Claude from starting)

### Example Output

**All fresh:**
```
✅ Arkadian environment: 12/12 variables configured
✅ Documentation freshness: 11/11 projects in sync
```

**Some stale:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 DOCUMENTATION FRESHNESS STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   ✅ arkd              FRESH (in sync with 7dc8232)
   ⚠️  go-sdk            3 commits ahead (last sync: 945cb4b)
   ⚠️  wallet            DIRTY (uncommitted changes)
   ...

📊 Summary: 9/11 fresh, 2 behind, 1 dirty
💡 To refresh stale docs: arkadian-refresh-docs go-sdk wallet
```

## Available Scripts (Global)

Since Arkadian is now global, these scripts work from anywhere:

```bash
# Check documentation freshness
node ${ARKADIAN_ROOT}/scripts/arkadian-check-freshness.js

# Check specific projects
node ${ARKADIAN_ROOT}/scripts/arkadian-check-freshness.js arkd go-sdk

# Refresh stale documentation
node ${ARKADIAN_ROOT}/scripts/arkadian-refresh-docs.js arkd

# Refresh all stale projects
node ${ARKADIAN_ROOT}/scripts/arkadian-refresh-docs.js --all
```

**Pro tip**: Create aliases for these in your `~/.zshrc`:

```bash
alias arkadian-check='node ${ARKADIAN_ROOT}/scripts/arkadian-check-freshness.js'
alias arkadian-refresh='node ${ARKADIAN_ROOT}/scripts/arkadian-refresh-docs.js'
```

## Customizing Paths

If your repositories are in different locations, edit `~/.arkadian-env.sh`:

```bash
vim ~/.arkadian-env.sh

# Change paths to match your setup:
export ARKD_REPO="/your/path/to/ark"
export GO_SDK_REPO="/your/path/to/go-sdk"
# etc...
```

Then reload:
```bash
source ~/.arkadian-env.sh
```

## Verifying Setup

Test that everything works:

```bash
# 1. Load environment
source ~/.arkadian-env.sh

# 2. Verify repos are found
verify_arkadian_repos

# 3. Test freshness check manually
node ${ARKADIAN_ROOT}/.claude/hooks/arkadian-env-check-hook.js << EOF
{"source":"startup","session_id":"test"}
EOF
```

## Troubleshooting

### "ARKADIAN_ROOT not found"

The global settings.json has `ARKADIAN_ROOT` hardcoded. If you move Arkadian:

```bash
# Update global settings
vim ~/.claude/settings.json
# Change: "ARKADIAN_ROOT": "/new/path/to/arkadian"
```

### "Missing environment variables"

The hook detected missing vars. To fix:

```bash
# 1. Edit your env file
vim ~/.arkadian-env.sh

# 2. Fix the paths
# 3. Reload
source ~/.arkadian-env.sh
```

### Hook doesn't run

Check global settings:

```bash
cat ~/.claude/settings.json
# Should have:
# "hooks": {
#   "SessionStart": [...]
# }
```

## Architecture

```
~/.claude/settings.json (GLOBAL)
    ├── ARKADIAN_ROOT env var
    └── SessionStart hook
           │
           ↓
    ${ARKADIAN_ROOT}/.claude/hooks/arkadian-env-check-hook.js
           │
           ↓ reads environment variables
           │
    ~/.arkadian-env.sh (sourced by user)
           └── All 12 project paths
```

## Benefits of This Setup

✅ **Works everywhere** - Start Claude in any directory, Arkadian is available
✅ **Non-invasive** - Doesn't modify your shell RC files (optional)
✅ **Portable** - Change paths in one file (~/.arkadian-env.sh)
✅ **Visibility** - SessionStart hook warns about stale docs
✅ **Flexible** - Can disable by not sourcing env file

## Comparison with PAI

| Feature | PAI | Arkadian |
|---------|-----|----------|
| **Structure** | `PAI_DIRECTORY/` with all configs | `.claude/` in arkadian repo |
| **Activation** | Global by default | Load env file first |
| **Context** | Full AI infrastructure | Documentation management |
| **Hooks** | Multiple (stop, submit, etc.) | SessionStart only |
| **Commands** | 60+ custom commands | Freshness scripts |
| **Agents** | Multiple specialized agents | (Phase 3 - planned) |

Both use the same Claude Code `.claude/settings.json` mechanism!

---

**Questions?** See `docs/DOCUMENTATION_FRESHNESS.md` for the full freshness system documentation.
