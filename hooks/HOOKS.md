# Arkadian Hooks System

**Last Updated**: 2025-10-16

## Overview

Arkadian uses Claude Code hooks to provide automatic validation and setup verification. Hooks are user-defined shell commands that execute at various points in Claude Code's lifecycle.

## Installed Hooks

### SessionStart: Environment Validation Hook

**File**: `hooks/arkadian-env-check-hook.js`
**Trigger**: When Claude Code session starts (startup only, not resume/compact)
**Purpose**: Validate all required Arkadian environment variables are configured
**Behavior**: Non-blocking (warnings only, never blocks Claude Code)

#### What It Checks

The hook validates that all 12 required environment variables are:
1. **Set** (not undefined)
2. **Valid** (directories actually exist at the specified paths)

**Required Variables:**
- `ARKADIAN_DOCS` - Arkadian documentation root
- `ARKD_REPO` - arkd server repository
- `GO_SDK_REPO` - Go SDK repository
- `WALLET_REPO` - Wallet (React PWA) repository
- `ARK_FAUCET_REPO` - Ark Faucet repository
- `ARK_SIMULATOR_REPO` - Ark Simulator repository
- `ARK_TELEMETRY_REPO` - Ark Telemetry repository
- `ARK_INFRA_REPO` - Ark Infrastructure repository
- `KMS_UNLOCKER_REPO` - KMS Unlocker repository
- `FULMINE_REPO` - Fulmine (Lightning) repository
- `ARK_DOCS_REPO` - Ark Documentation repository
- `ARKADE_ESCROW_REPO` - Arkade Escrow repository

#### Hook Output

**When all variables are configured correctly:**
```
✅ Arkadian environment: 12/12 variables configured
```

**When variables are missing or invalid:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  ARKADIAN ENVIRONMENT CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Status: 10/12 variables configured correctly

❌ Missing environment variables (2):
   - ARKD_REPO
     arkd server repository
   - GO_SDK_REPO
     Go SDK repository

📋 Setup Instructions:
   1. Copy template: cp scripts/env-setup-template.sh ~/.arkadian-env.sh
   2. Edit with your actual paths: vim ~/.arkadian-env.sh
   3. Source in your shell RC file: echo 'source ~/.arkadian-env.sh' >> ~/.zshrc
   4. Reload your shell: source ~/.zshrc
   5. Verify setup: verify_arkadian_repos

💡 Note: These variables enable ${VAR} path resolution in documentation.
⚠️  Some Arkadian features may not work correctly without these variables.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Hook Configuration

Hooks are registered in `hooks/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "hooks/arkadian-env-check-hook.js"
      }
    ]
  }
}
```

**Note**: Copy `hooks/settings.json` to your Claude Code settings location (`.claude/settings.json` in your working directory or user settings).

## Environment Setup

### Quick Start

1. **Copy the environment template:**
   ```bash
   cp scripts/env-setup-template.sh ~/.arkadian-env.sh
   ```

2. **Edit with your actual repository paths:**
   ```bash
   vim ~/.arkadian-env.sh
   ```

3. **Source in your shell RC file:**
   ```bash
   echo 'source ~/.arkadian-env.sh' >> ~/.zshrc
   source ~/.zshrc
   ```

4. **Verify setup:**
   ```bash
   verify_arkadian_repos
   ```

### Example Configuration

```bash
# ~/.arkadian-env.sh
export ARKADIAN_DOCS="$${ARKADIAN_DIR}/code/go/arkadian/docs"
export ARKD_REPO="$${ARKADIAN_DIR}/code/go/ark"
export GO_SDK_REPO="$${ARKADIAN_DIR}/code/go/go-sdk"
export WALLET_REPO="$${ARKADIAN_DIR}/code/fe/wallet"
# ... etc for all 12 variables
```

## Why Environment Variables?

Arkadian uses environment variables following the PAI (Personal AI Infrastructure) pattern:

1. **Portable Documentation** - Same docs work on all machines
2. **Machine-Independent** - No hardcoded paths in git
3. **Runtime Resolution** - Variables resolved when scripts/tools run
4. **Convention-Based** - AI agents understand `${VAR}` notation

### How It Works

**In Documentation:**
```markdown
Repository: ${ARKD_REPO}
```

**In Scripts (TypeScript):**
```typescript
const arkdRepo = process.env.ARKD_REPO;
```

**In Scripts (Go):**
```go
arkdRepo := os.Getenv("ARKD_REPO")
```

**In Scripts (Shell):**
```bash
cd ${ARKD_REPO}
```

The AI agent sees `${ARKD_REPO}` in documentation and knows it's an environment variable. When tools execute, the shell/runtime expands the variable to the actual path.

## Troubleshooting

### Hook Not Running

1. **Check hook is executable:**
   ```bash
   chmod +x hooks/arkadian-env-check-hook.js
   ```

2. **Verify settings.json is copied to .claude directory:**
   ```bash
   cp hooks/settings.json .claude/settings.json
   cat .claude/settings.json
   ```

3. **Check Node.js is available:**
   ```bash
   which node && node --version
   ```

### Variables Not Being Detected

1. **Check environment variables are exported:**
   ```bash
   env | grep -E 'ARKD_REPO|GO_SDK_REPO|ARKADIAN_DOCS'
   ```

2. **Ensure shell RC file sources the config:**
   ```bash
   grep arkadian-env ~/.zshrc
   ```

3. **Reload your shell:**
   ```bash
   source ~/.zshrc
   ```

### Testing the Hook Manually

```bash
# Test with current environment
echo '{"session_id":"test","transcript_path":"/tmp/test","hook_event_name":"SessionStart","source":"startup"}' | hooks/arkadian-env-check-hook.js

# Test with specific variables unset
unset ARKD_REPO && echo '{"session_id":"test","transcript_path":"/tmp/test","hook_event_name":"SessionStart","source":"startup"}' | hooks/arkadian-env-check-hook.js
```

## Hook Design Principles

### Non-Blocking
- Hook always exits with code 0 (success)
- Shows warnings but never prevents Claude Code from starting
- User can continue working even with missing variables

### Silent When OK
- If all variables are configured, shows minimal success message
- Only shows detailed output when there are issues
- Reduces noise for properly configured systems

### Actionable Feedback
- Clear error messages explaining what's wrong
- Step-by-step setup instructions
- Points to relevant documentation and scripts

### Efficient
- Only runs on actual startup (not resume/compact)
- Fast validation (checks directory existence only)
- Minimal impact on session start time

## Future Enhancements

Potential future hooks to implement:

- **PreToolUse Hook**: Warn when trying to use `${VAR}` paths without variables set
- **PostToolUse Hook**: Validate git operations don't commit sensitive data
- **UserPromptSubmit Hook**: Load relevant project context dynamically based on user intent
- **Stop Hook**: Save session metadata for documentation sync tracking

## Related Documentation

- **Environment Setup**: `scripts/env-setup-template.sh`
- **PAI Pattern Analysis**: `docs/PAI_PATH_RESOLUTION_ACTUAL.md`
- **Claude Code Hooks**: https://docs.claude.com/en/docs/claude-code/hooks
- **TODO**: `TODO.md` - Implementation roadmap

---

**Note**: This hook system is inspired by PAI (Personal AI Infrastructure) by Daniel Miessler. The pattern of using environment variables with `${VAR}` notation in documentation while resolving them at runtime is a key architectural decision for portability.
