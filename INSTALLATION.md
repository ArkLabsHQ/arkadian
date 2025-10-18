# Arkadian Assistant Installation Guide

The Arkadian Assistant is an intelligent orchestrator for the Ark protocol ecosystem that provides context-aware assistance across all 11 Ark projects.

## Quick Start (One-Liner)

```bash
cd /path/to/arkadian && make install
```

That's it! The Makefile handles everything automatically.

## What Gets Installed

The installation process:

1. ✅ Checks prerequisites (bun, git)
2. ✅ Creates `~/.claude/` directory
3. ✅ Installs `settings.json` to `~/.claude/settings.json` (global activation)
4. ✅ Exports `ARKADIAN_DIR` environment variable to your shell config
5. ✅ Makes hooks executable
6. ✅ Verifies installation correctness

## Prerequisites

- **Bun** - JavaScript/TypeScript runtime (install from https://bun.sh)
- **Git** - Version control
- **Claude Code** - Anthropic's CLI tool

Install bun if you don't have it:
```bash
brew install oven-sh/bun/bun
```

## Post-Installation

After running `make install`:

1. **Restart your terminal** (or run `source ~/.zshrc` / `source ~/.bashrc`)
2. **Restart Claude Code** to activate the hooks
3. **Test it!** Ask Claude about any Ark project

## How It Works

### Two-Hook System

Arkadian uses two hooks for intelligent context loading:

#### 1. SessionStart Hook
**Runs once when Claude Code starts**
- Loads the orchestrator (`CLAUDE.md`)
- Establishes Arkadian's role and capabilities
- Sets up the assistant's context awareness

#### 2. UserPromptSubmit Hook
**Runs on every user prompt**
- Analyzes user intent semantically
- Loads the master project registry (`docs/INDEX.md`)
- Instructs Claude to score and select relevant projects
- Loads only the necessary project INDEX.md files

### Semantic Project Selection

Instead of hardcoded keyword matching, Arkadian uses intelligent scoring:

**User asks:** "How do I test arkd with multiple wallets?"

**Arkadian analyzes:**
- **Intent:** `test_or_run` (testing/QA)
- **Keywords:** "test", "arkd", "multiple wallets"
- **Relevant projects:**
  - `arkd` (server under test) - Score: 0.95
  - `ark-simulator` (multi-wallet testing) - Score: 0.90
  - `go-sdk` (wallet client library) - Score: 0.75

**Loads:**
```
${ARKADIAN_DIR}/docs/projects/arkd/INDEX.md
${ARKADIAN_DIR}/docs/projects/ark-simulator/INDEX.md
${ARKADIAN_DIR}/docs/projects/go-sdk/INDEX.md
```

### Environment Variable Strategy

All paths use `${ARKADIAN_DIR}` for portability:

```json
{
  "env": {
    "ARKADIAN_DIR": "/Users/you/code/go/arkadian"
  },
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "bun ${ARKADIAN_DIR}/hooks/session-start-hook.ts"
      }]
    }]
  }
}
```

Claude Code automatically substitutes `${ARKADIAN_DIR}` at runtime.

## Available Commands

```bash
make install      # Complete installation (one-liner)
make status       # Check installation status
make test-hook    # Test the context loading hook
make verify       # Verify installation correctness
make uninstall    # Remove installation
make clean        # Clean backup files
make help         # Show all commands
```

## Project Structure

```
arkadian/
├── CLAUDE.md                           # Orchestrator (loaded at SessionStart)
├── docs/
│   ├── INDEX.md                        # Master project registry
│   └── projects/
│       ├── arkd/INDEX.md               # Project-specific docs
│       ├── go-sdk/INDEX.md
│       ├── wallet/INDEX.md
│       ├── ark-simulator/INDEX.md
│       ├── ark-telemetry/INDEX.md
│       ├── ark-infra/INDEX.md
│       ├── kms-unlocker/INDEX.md
│       ├── fulmine/INDEX.md
│       ├── ark-docs/INDEX.md
│       ├── ark-faucet/INDEX.md
│       └── arkade-escrow/INDEX.md
├── hooks/
│   ├── session-start-hook.ts           # Loads orchestrator once
│   └── load-arkadian-context.ts        # Dynamic context loading
├── .claude-settings.template.json      # Settings template
└── Makefile                            # One-liner installer
```

## Settings File Location

**Global Installation (Recommended):**
- Settings: `~/.claude/settings.json`
- Activates Arkadian for **all** Claude Code sessions
- Works from any directory

**Project-Local Installation (Not Used):**
- Settings: `/path/to/project/.claude/settings.json`
- Only activates when in that specific project
- Arkadian uses global installation

## Troubleshooting

### Hook Not Running

**Problem:** Arkadian doesn't seem to be loading context

**Solutions:**
1. Check if hooks are executable:
   ```bash
   ls -la hooks/
   ```
   Should show `-rwxr-xr-x` permissions

2. Verify settings.json exists:
   ```bash
   cat ~/.claude/settings.json
   ```

3. Check ARKADIAN_DIR is set:
   ```bash
   echo $ARKADIAN_DIR
   ```
   Should output: `/Users/you/code/go/arkadian`

4. Restart Claude Code completely

### Environment Variable Not Set

**Problem:** `$ARKADIAN_DIR` is empty

**Solutions:**
1. Source your shell config:
   ```bash
   source ~/.zshrc  # or ~/.bashrc
   ```

2. Check if it's in your shell config:
   ```bash
   grep ARKADIAN_DIR ~/.zshrc
   ```

3. Restart your terminal

### Settings Not Applied

**Problem:** Changes to settings.json don't take effect

**Solutions:**
1. Restart Claude Code (settings are read at startup)
2. Check for JSON syntax errors:
   ```bash
   cat ~/.claude/settings.json | jq '.'
   ```

## Updating Arkadian

When you pull updates from the repository:

```bash
cd /path/to/arkadian
git pull
make install  # Reinstalls with new changes
```

The installer backs up your existing settings to `settings.json.backup`.

## Uninstalling

```bash
make uninstall
```

This will:
- Backup settings.json to `settings.json.pre-uninstall`
- Remove ARKADIAN_DIR from shell config
- Clean up installation

You'll need to restart your terminal after uninstalling.

## Advanced: Manual Installation

If you prefer manual installation:

1. **Copy settings template:**
   ```bash
   sed "s|ARKADIAN_DIR_PLACEHOLDER|$(pwd)|g" .claude-settings.template.json > ~/.claude/settings.json
   ```

2. **Export environment variable:**
   ```bash
   echo 'export ARKADIAN_DIR="/full/path/to/arkadian"' >> ~/.zshrc
   source ~/.zshrc
   ```

3. **Make hooks executable:**
   ```bash
   chmod +x hooks/*.ts
   ```

## Architecture Details

### Hook Execution Flow

```
Claude Code Start
    ↓
SessionStart Hook Fires
    ↓
Load CLAUDE.md (Orchestrator)
    ↓
Arkadian Ready
    ↓
User enters prompt
    ↓
UserPromptSubmit Hook Fires
    ↓
Analyze user intent
    ↓
Load master INDEX.md
    ↓
Score all 11 projects
    ↓
Load top-K project INDEX.md files
    ↓
Claude processes with full context
```

### Context Loading Strategy

**Lazy Loading:**
- Only load what's needed for each request
- Start with project INDEX.md (summary)
- Load deeper docs (sop/, testing/, system/) only if necessary

**Dependency Awareness:**
- If user asks about `ark-simulator`, also load `arkd` and `go-sdk`
- Respects `depends_on` relationships in project registry

**Token Efficiency:**
- Average request: 2-3 project INDEX files (~3k tokens)
- Without optimization: All 11 projects + docs (~50k+ tokens)
- **Savings: ~94% reduction in context usage**

## File Format: INDEX.md

Each project's INDEX.md includes:

```markdown
---
project_id: arkd
default_sections_by_intent:
  qna:        ["system/overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "sop/how-to-run.md"]
  dev:        ["sop/how-to-run.md", "testing/usage.md"]
  monitoring: ["sop/alerts.md", "testing/usage.md"]
---

# Project Name

- **sop/** — Standard Operating Procedures
- **tasks/** — PRDs & implementation plans
- **system/** — Architecture & design
- **change-log/** — Recent changes
- **testing/** — How to test and run
```

## Security Notes

**This is a public repository.** The default installation includes:
- ✅ Safe tool permissions (Read, Write, Edit, Bash, etc.)
- ✅ Blocked dangerous commands (`rm -rf /`, fork bombs, etc.)
- ✅ No API keys or secrets in configuration
- ✅ Local-only operation (no external API calls)

**Add your own:**
- MCP servers if needed
- Custom permissions
- API keys in `.env` files (never commit these!)

## Support

If you encounter issues:

1. Check installation status: `make status`
2. Test hooks manually: `make test-hook`
3. Verify settings: `cat ~/.claude/settings.json | jq '.hooks'`
4. Check logs: Claude Code outputs hook errors to stderr

## Next Steps

After installation:

1. **Ask questions:** "How does arkd handle VTXOs?"
2. **Test projects:** "How do I run the ark-simulator?"
3. **Develop features:** "Add logging to the round settlement process"
4. **Analyze code:** "Explain the wallet boarding flow"

Arkadian will intelligently load the right context for each task! 🚀
