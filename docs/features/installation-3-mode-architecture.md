# Installation 3-Mode Architecture

## Problem Statement

Current arkadian installation **modifies global `~/.claude/settings.json`**, which affects ALL Claude Code usage:

### Current Issues

| Component | Current Behavior | Problem |
|-----------|------------------|---------|
| **settings.json** | Replaces global file with arkadian config | Regular `claude` gets arkadian hooks |
| **Hooks** | Registered globally | Orchestrator-guardrail runs on every Claude session |
| **Agents** | Installed to `~/.claude/agents/` | All agents visible in regular Claude |
| **Skills** | Installed to `~/.claude/skills/` | All skills visible in regular Claude |
| **Env Vars** | Added to global settings | All repos visible in regular Claude |

### What User Wants

**3 distinct modes:**
1. **Regular Claude CLI** - No arkadian context, hooks, agents, or env vars
2. **Arkadian Dev Mode** - Work on arkadian repository itself (full access)
3. **Arkadian Orchestrator Mode** - Work on Ark projects (strict delegation)

## Current Installation Flow

```bash
make install
├── check-prereqs (bun, git, claude)
├── setup-dirs (sessions/, log/)
├── copy-settings-with-env
│   ├── Reads .env file with all repo paths
│   ├── Generates ~/.claude/settings.json from template
│   └── OVERWRITES global settings.json ❌
├── export-env (adds ARKADIAN_DIR to shell config)
├── make-executable (chmod +x hooks/*.ts)
├── install-arkadian-cmd (copies scripts/arkadian to ~/bin/)
├── install-agents (copies agents/*.md to ~/.claude/agents/)
├── install-skills (copies skills/*/ to ~/.claude/skills/)
└── install-commands (copies commands/*.md to ~/.claude/commands/)
```

**Result:** Global Claude Code is now configured for arkadian

## Proposed Solution

### Settings File Separation

Create separate settings files for each mode:

```
~/.claude/
├── settings.json              (DEFAULT - vanilla Claude, NO arkadian)
├── settings-arkadian.json     (Arkadian orchestrator mode)
└── settings-arkadian-dev.json (Optional - arkadian dev mode)
```

### Mode Configuration

#### Mode 1: Regular Claude CLI

**Command:** `claude`

**Settings:** `~/.claude/settings.json` (default)

**Configuration:**
```json
{
  "env": {},
  "permissions": { "allow": [...], "deny": [...] },
  "hooks": {}  // NO arkadian hooks
}
```

**Characteristics:**
- ✅ No arkadian hooks running
- ✅ No Ark repo env vars
- ✅ Agents/skills/commands still available (user can manually select)
- ✅ Clean vanilla Claude experience

---

#### Mode 2: Arkadian Dev Mode

**Command:** `claude` (when in arkadian directory)

**Settings:** `~/.claude/settings.json` (default)

**Context:** `.claude/CLAUDE.md` (local to arkadian repo)

**Configuration:**
```markdown
# .claude/CLAUDE.md
You are working inside the Arkadian repository itself.
This is development mode - you have full tool access.
...
```

**Characteristics:**
- ✅ Full access to all tools (Read, Write, Edit, Bash, etc.)
- ✅ No orchestrator-mode restrictions
- ✅ Local CLAUDE.md provides context
- ✅ No special settings needed

---

#### Mode 3: Arkadian Orchestrator Mode

**Command:** `arkadian` (uses custom settings)

**Settings:** `~/.claude/settings-arkadian.json` (via `--settings` flag)

**System Prompt:** `ORCHESTRATOR.md` (via `--append-system-prompt`)

**Configuration:**
```json
{
  "env": {
    "ARKADIAN_DIR": "/path/to/arkadian",
    "ARKD_REPO": "/path/to/ark",
    "GO_SDK_REPO": "/path/to/go-sdk",
    ...
  },
  "hooks": {
    "PreToolUse": [
      { "hooks": [{ "command": "bun ${ARKADIAN_DIR}/hooks/orchestrator-guardrail.ts" }] },
      { "hooks": [{ "command": "bun ${ARKADIAN_DIR}/hooks/pre-agent-validator.ts" }] },
      { "hooks": [{ "command": "bun ${ARKADIAN_DIR}/hooks/subagent-guardrail.ts" }] }
    ],
    "UserPromptSubmit": [...],
    "SessionStart": [...],
    "SessionEnd": [...],
    "SubagentStop": [...]
  },
  "permissions": { ... }
}
```

**Characteristics:**
- ✅ All arkadian hooks active
- ✅ All Ark repo paths in env
- ✅ Orchestrator workflow enforced
- ✅ Strict delegation rules

## Implementation Plan

### Step 1: Modify Settings Generation

**File:** `scripts/generate-claude-settings.sh`

**Changes:**
1. Generate TWO files instead of one:
   - `~/.claude/settings-arkadian.json` (full arkadian config)
   - `~/.claude/settings-arkadian-dev.json` (optional dev mode)
2. DO NOT modify `~/.claude/settings.json` (preserve vanilla Claude)
3. Backup existing settings.json only if user explicitly wants to migrate

**Code:**
```bash
# Generate arkadian-specific settings
ARKADIAN_SETTINGS_FILE="$HOME/.claude/settings-arkadian.json"
DEV_SETTINGS_FILE="$HOME/.claude/settings-arkadian-dev.json"

# Backup existing settings if this is first install
if [ ! -f "$ARKADIAN_SETTINGS_FILE" ] && [ -f "$HOME/.claude/settings.json" ]; then
  cp "$HOME/.claude/settings.json" "$HOME/.claude/settings.json.pre-arkadian"
  echo "✓ Backed up existing settings to settings.json.pre-arkadian"
fi

# Generate arkadian orchestrator settings (full config)
echo "$updated_content" > "$ARKADIAN_SETTINGS_FILE"
echo "✅ Generated $ARKADIAN_SETTINGS_FILE"

# Generate arkadian dev settings (minimal config, no hooks)
cat > "$DEV_SETTINGS_FILE" <<EOF
{
  "env": {
    "ARKADIAN_DIR": "$ARKADIAN_DIR",
    "ARKADIAN_DATA_DIR": "$ARKADIAN_DATA_DIR"
  },
  "permissions": {
    "allow": ["Bash", "Read(*)", "Write(*)", "Edit(*)", ...],
    "deny": [...]
  },
  "hooks": {}
}
EOF
echo "✅ Generated $DEV_SETTINGS_FILE"

# DO NOT modify ~/.claude/settings.json
echo "ℹ️  Regular Claude CLI (claude) uses default ~/.claude/settings.json"
echo "ℹ️  Arkadian orchestrator (arkadian) uses ~/.claude/settings-arkadian.json"
```

---

### Step 2: Modify arkadian Command

**File:** `scripts/arkadian`

**Changes:**
Add `--settings` flag to specify custom settings file

**Code:**
```bash
# Line ~650 (after CLAUDE_ARGS array creation)

# Build claude command args
CLAUDE_ARGS=(
  --settings "$HOME/.claude/settings-arkadian.json"
  --append-system-prompt "$ORCHESTRATOR_CONTENT"
)
```

**Full command:**
```bash
claude --settings ~/.claude/settings-arkadian.json \
       --append-system-prompt /path/to/ORCHESTRATOR.md \
       "$@"
```

---

### Step 3: Update Makefile Install Target

**File:** `Makefile`

**Changes:**
1. Modify `copy-settings-with-env` to generate arkadian-specific settings
2. DO NOT overwrite default settings.json
3. Update messages to explain the 3 modes

**Code:**
```makefile
copy-settings-with-env: ## Generate arkadian settings files (does not modify default settings.json)
	@echo "$(YELLOW)Generating arkadian settings...$(NC)"
	@./scripts/generate-claude-settings.sh
	@echo "$(GREEN)✓ Generated ~/.claude/settings-arkadian.json$(NC)"
	@echo "$(GREEN)✓ Generated ~/.claude/settings-arkadian-dev.json$(NC)"
	@echo ""
	@echo "$(YELLOW)Mode Configuration:$(NC)"
	@echo "  1. Regular Claude:     claude (uses ~/.claude/settings.json)"
	@echo "  2. Arkadian Dev:       claude (in arkadian dir, uses .claude/CLAUDE.md)"
	@echo "  3. Arkadian Orchestr:  arkadian (uses ~/.claude/settings-arkadian.json)"
```

---

### Step 4: Verify Settings Flag Support

Before implementing, verify Claude Code supports `--settings` flag:

```bash
# Test if --settings flag is supported
claude --help | grep -A2 settings

# Test with custom settings file
echo '{}' > /tmp/test-settings.json
claude --settings /tmp/test-settings.json
```

**Alternative if --settings not supported:**
- Use environment variable approach: `CLAUDE_SETTINGS_FILE`
- Or use symlink approach: temporarily symlink settings.json during arkadian session
- Or fork Claude Code to add this feature

---

## Migration Path

### For Existing Installations

```bash
# Step 1: Backup current global settings
cp ~/.claude/settings.json ~/.claude/settings.json.backup

# Step 2: Reinstall with new approach
cd /path/to/arkadian
make uninstall
make install

# Step 3: Restore vanilla settings (if you had custom ones)
cp ~/.claude/settings.json.pre-arkadian ~/.claude/settings.json

# Step 4: Verify modes
claude --version          # Should NOT have arkadian hooks
arkadian status           # Should work with arkadian settings
```

### For New Installations

```bash
# Single command install
cd /path/to/arkadian
make install

# Done! Three modes ready:
# 1. claude          → vanilla
# 2. claude (in arkadian dir) → dev mode
# 3. arkadian        → orchestrator mode
```

---

## Benefits

### Clear Separation of Concerns

| Mode | Settings File | Hooks | Env Vars | Use Case |
|------|--------------|-------|----------|----------|
| **Regular** | `settings.json` | ❌ None | ❌ None | General coding |
| **Dev** | `settings.json` | ❌ None | ✅ Local (ARKADIAN_DIR) | Work on arkadian |
| **Orchestrator** | `settings-arkadian.json` | ✅ All | ✅ All repos | Work on Ark projects |

### Team Onboarding

**Before (current):**
```bash
# Team member installs arkadian
make install
# Now ALL their Claude usage has arkadian hooks
# Regular coding is affected
```

**After (proposed):**
```bash
# Team member installs arkadian
make install
# Regular Claude is unchanged
# They use 'arkadian' command only for Ark work
```

### Debugging

**Before:**
- Hard to tell if you're in orchestrator mode or regular mode
- Hooks run on all sessions
- Settings are globally modified

**After:**
- `claude` = vanilla (no arkadian)
- `arkadian` = orchestrator (explicit)
- Clear separation, easy debugging

---

## Cross-Platform Compatibility

### Shell Support

Works on all platforms:
- ✅ macOS (bash, zsh, fish)
- ✅ Linux (bash, zsh, fish)
- ✅ Windows (WSL - bash, zsh, fish)

### Settings File Paths

Platform-specific settings paths:
```bash
# macOS/Linux
~/.claude/settings.json
~/.claude/settings-arkadian.json

# Windows (WSL)
/mnt/c/Users/{user}/.claude/settings.json
/mnt/c/Users/{user}/.claude/settings-arkadian.json
```

### Installation Command

**Simple one-liner (all platforms):**
```bash
cd /path/to/arkadian && make install
```

**Or with curl (future):**
```bash
curl -fsSL https://raw.githubusercontent.com/ark-labs/arkadian/main/install.sh | bash
```

---

## Testing Plan

### Test 1: Vanilla Claude Unaffected

```bash
# After installation
claude "Hello"
# Expected: No arkadian hooks in output
# Expected: No ARKD_REPO env var

# Check session log
cat ~/.claude/logs/latest_session.log
# Should NOT contain: [orchestrator-guardrail]
```

### Test 2: Arkadian Dev Mode

```bash
# In arkadian directory
cd /path/to/arkadian
claude

# Expected: CLAUDE.md loaded
# Expected: Full tool access
# Expected: No orchestrator restrictions
```

### Test 3: Arkadian Orchestrator Mode

```bash
# Anywhere
arkadian "Add GetRoundMetrics RPC to arkd"

# Expected: ORCHESTRATOR.md loaded
# Expected: orchestrator-guardrail active
# Expected: All Ark repos in env
# Expected: Strict delegation rules enforced
```

### Test 4: Settings Isolation

```bash
# Check settings files
ls -la ~/.claude/settings*.json

# Expected files:
# settings.json (unchanged from install)
# settings-arkadian.json (full config)
# settings-arkadian-dev.json (minimal config)

# Verify content
cat ~/.claude/settings.json | jq '.hooks'
# Expected: {} or user's custom hooks, NOT arkadian hooks

cat ~/.claude/settings-arkadian.json | jq '.hooks'
# Expected: All arkadian hooks registered
```

---

## Rollback Plan

If issues arise, easy rollback:

```bash
# Restore vanilla Claude
cp ~/.claude/settings.json.backup ~/.claude/settings.json

# Or fully uninstall
make uninstall

# Remove arkadian command
rm ~/bin/arkadian
```

---

## Future Enhancements

### 1. Settings File Auto-Detection

```bash
# Detect mode based on current directory
if [ "$(pwd)" = "$ARKADIAN_DIR" ]; then
  SETTINGS="settings-arkadian-dev.json"
else
  SETTINGS="settings-arkadian.json"
fi
```

### 2. Profile System

```bash
# Support multiple profiles
arkadian --profile team-alpha "Add feature"
arkadian --profile personal "Fix bug"

# Settings:
# ~/.claude/settings-arkadian-team-alpha.json
# ~/.claude/settings-arkadian-personal.json
```

### 3. Quick Mode Switch

```bash
# Add to arkadian command
arkadian --vanilla "Regular coding task"
# Temporarily uses settings.json instead of settings-arkadian.json
```

---

## Documentation Updates

After implementation, update:

1. **README.md** - Add 3-mode explanation
2. **INSTALLATION.md** - New installation instructions
3. **.claude/CLAUDE.md** - Update development mode notes
4. **ORCHESTRATOR.md** - Note that it only applies to arkadian command
5. **Makefile help** - Update target descriptions

---

## Summary

### Key Changes

1. **Generate separate settings files** instead of modifying global
2. **Use `--settings` flag** in arkadian command
3. **Preserve vanilla Claude** for regular coding
4. **Clear mode separation** for team clarity

### Implementation Effort

- **Scripts:** 2 hours (modify generate-claude-settings.sh, arkadian)
- **Makefile:** 1 hour (update install targets, messages)
- **Testing:** 2 hours (verify all 3 modes work)
- **Documentation:** 1 hour (update guides)

**Total:** ~6 hours

### Risk Assessment

**Low Risk:**
- ✅ Non-breaking for existing users (backup created)
- ✅ Rollback is simple (restore settings.json)
- ✅ No changes to core arkadian logic
- ✅ Only affects installation and command invocation

### Next Steps

1. Verify `--settings` flag support in Claude Code
2. If supported → implement changes above
3. If not supported → propose alternative (env var or symlink approach)
4. Test on all platforms (macOS, Linux, Windows WSL)
5. Update documentation
6. Create migration guide for existing users
