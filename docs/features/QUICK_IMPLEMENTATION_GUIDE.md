# Quick Implementation Guide - 3-Mode Architecture

## ✅ Verified: Claude Code Supports --settings Flag

```bash
$ claude --help | grep settings
--settings <file-or-json>     Path to a settings JSON file or JSON string to load additional settings
```

This makes the implementation straightforward!

## Implementation Checklist

### Phase 1: Settings Generation (30 mins)

**File:** `scripts/generate-claude-settings.sh`

```bash
# Current behavior: Generates ~/.claude/settings.json (OVERWRITES)
# New behavior: Generates ~/.claude/settings-arkadian.json (SEPARATE)

# Changes needed:
# 1. Change SETTINGS_FILE variable
SETTINGS_FILE="$HOME/.claude/settings-arkadian.json"  # Was: ~/.claude/settings.json

# 2. Add backup warning
if [ -f "$HOME/.claude/settings.json" ]; then
  echo "ℹ️  Your vanilla Claude settings.json will NOT be modified"
  echo "ℹ️  Arkadian will use settings-arkadian.json"
fi

# 3. Update success message
echo "✅ Generated $SETTINGS_FILE"
echo "   Regular Claude: claude (uses ~/.claude/settings.json)"
echo "   Arkadian:       arkadian (uses ~/.claude/settings-arkadian.json)"
```

**Test:**
```bash
./scripts/generate-claude-settings.sh
ls ~/.claude/settings*.json
# Expected: settings.json (unchanged), settings-arkadian.json (new)
```

---

### Phase 2: Arkadian Command (10 mins)

**File:** `scripts/arkadian`

```bash
# Line ~583 (where CLAUDE_ARGS is built)

# Current:
CLAUDE_ARGS=(--append-system-prompt "$ORCHESTRATOR_CONTENT")

# New:
ARKADIAN_SETTINGS="$HOME/.claude/settings-arkadian.json"
CLAUDE_ARGS=(
  --settings "$ARKADIAN_SETTINGS"
  --append-system-prompt "$ORCHESTRATOR_CONTENT"
)
```

**Test:**
```bash
# Quick test
arkadian status  # Should work as before
```

---

### Phase 3: Makefile Update (20 mins)

**File:** `Makefile`

```makefile
# Line ~24 (help text)
## Installation targets:
##   install              - Full installation (3-mode setup)
##   uninstall            - Remove arkadian (preserves vanilla Claude)

# Line ~100-110 (copy-settings-with-env target)
copy-settings-with-env: ## Generate arkadian settings (does not modify vanilla Claude)
	@echo "$(YELLOW)Generating arkadian settings...$(NC)"
	@./scripts/generate-claude-settings.sh
	@echo "$(GREEN)✓ Generated ~/.claude/settings-arkadian.json$(NC)"
	@echo ""
	@echo "$(YELLOW)Three modes configured:$(NC)"
	@echo "  1. claude          → Vanilla Claude (uses ~/.claude/settings.json)"
	@echo "  2. claude (in arkadian dir) → Dev mode (uses .claude/CLAUDE.md)"
	@echo "  3. arkadian        → Orchestrator mode (uses ~/.claude/settings-arkadian.json)"
```

**Test:**
```bash
make install
# Check output messages are correct
```

---

### Phase 4: Verification (30 mins)

**Test 1: Vanilla Claude Unaffected**
```bash
# Run regular Claude
claude "hello"

# Check if arkadian hooks ran
tail -50 ~/.claude/logs/*/session*.log | grep orchestrator-guardrail
# Expected: NO matches (hooks should not run)
```

**Test 2: Arkadian Orchestrator Mode**
```bash
# Run arkadian
arkadian status

# Check if settings-arkadian.json is loaded
# (hooks should run)
cat /path/to/arkadian/log/orchestrator-guardrail.txt
# Expected: Recent entries showing hook ran
```

**Test 3: Arkadian Dev Mode**
```bash
# In arkadian directory
cd /path/to/arkadian
claude

# Check CLAUDE.md is loaded
# Expected: Context about "You are working inside Arkadian repository"
```

---

## Quick Start Commands

```bash
# 1. Modify settings generation
vim scripts/generate-claude-settings.sh
# Change SETTINGS_FILE to settings-arkadian.json

# 2. Modify arkadian command
vim scripts/arkadian
# Add --settings flag to CLAUDE_ARGS

# 3. Update Makefile
vim Makefile
# Update messages in copy-settings-with-env

# 4. Test installation
make uninstall
make install

# 5. Verify modes
claude "test"              # Should NOT have arkadian context
arkadian status            # Should work with arkadian settings
cd /path/to/arkadian && claude  # Should load CLAUDE.md
```

---

## Files to Modify

1. ✅ `scripts/generate-claude-settings.sh` - Change output file to settings-arkadian.json
2. ✅ `scripts/arkadian` - Add --settings flag
3. ✅ `Makefile` - Update install messages
4. ✅ `README.md` - Document 3 modes (optional, can do later)

---

## Expected Behavior After Implementation

### Before Installation
```
~/.claude/
├── settings.json (user's existing settings)
```

### After Installation
```
~/.claude/
├── settings.json (UNCHANGED - vanilla Claude)
├── settings-arkadian.json (NEW - orchestrator mode)
├── agents/ (shared by both modes)
├── skills/ (shared by both modes)
└── commands/ (shared by both modes)
```

### Command Behavior
```bash
# Regular Claude (no arkadian)
claude "Help me debug this code"
→ Uses settings.json
→ No arkadian hooks
→ No Ark repo env vars
→ Can still use agents/skills/commands if user selects them

# Arkadian Dev Mode (local context)
cd /path/to/arkadian
claude "Update the orchestrator-guardrail hook"
→ Uses settings.json
→ Loads .claude/CLAUDE.md for context
→ Full tool access

# Arkadian Orchestrator Mode (strict delegation)
arkadian "Add GetRoundMetrics RPC to arkd"
→ Uses settings-arkadian.json
→ Loads ORCHESTRATOR.md
→ Arkadian hooks active
→ All Ark repo env vars present
→ Strict delegation rules enforced
```

---

## Rollback Plan

If issues arise:
```bash
# Option 1: Restore backup
cp ~/.claude/settings.json.backup ~/.claude/settings.json

# Option 2: Full uninstall
make uninstall
rm ~/bin/arkadian

# Option 3: Keep arkadian, remove settings
rm ~/.claude/settings-arkadian.json
# (arkadian command will fail, but vanilla Claude unaffected)
```

---

## Migration for Existing Users

For users who already have arkadian installed:

```bash
# Step 1: Backup current global settings
cp ~/.claude/settings.json ~/.claude/settings.json.backup

# Step 2: Reinstall
cd /path/to/arkadian
git pull  # Get latest changes
make uninstall
make install

# Step 3: Restore vanilla settings
# If you had custom settings before arkadian:
cp ~/.claude/settings.json.pre-arkadian ~/.claude/settings.json
# Otherwise, recreate vanilla settings:
cat > ~/.claude/settings.json <<EOF
{
  "permissions": {
    "allow": ["Bash", "Read(*)", "Write(*)", "Edit(*)", "Glob(*)", "Grep(*)"],
    "deny": []
  }
}
EOF

# Step 4: Verify
claude --version        # Should work without arkadian
arkadian status         # Should work with arkadian
```

---

## Total Implementation Time

| Phase | Time | Difficulty |
|-------|------|------------|
| Settings generation | 30 mins | Easy |
| Arkadian command | 10 mins | Easy |
| Makefile update | 20 mins | Easy |
| Verification | 30 mins | Easy |
| Documentation | 30 mins | Easy |
| **Total** | **2 hours** | **Easy** |

---

## Next Steps

1. **Implement changes** (2 hours)
2. **Test all 3 modes** (30 mins)
3. **Update documentation** (30 mins)
4. **Create PR** with changes
5. **Announce to team** with migration guide

Ready to implement? Let me know if you want me to make these changes!
