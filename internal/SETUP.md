# Arkadian Setup Guide

**Arkadian** is an AI assistant that orchestrates specialized agents across the Ark protocol ecosystem.

## Quick Start

```bash
cd /path/to/arkadian
make install
source ~/.zshrc   # or open a new terminal
```

## What `make install` Does

The installer runs these steps in order:

1. **check-prereqs** - Verifies `bun` and `git` are installed
2. **setup-dirs** - Creates `~/.claude/` directory
3. **generate-env** - Prompts for repository paths, generates `.env` (skips if exists)
4. **copy-settings-with-env** - Generates `~/.claude/settings.json` from `.env`
5. **export-env** - Adds `ARKADIAN_DIR` to your shell config (~/.zshrc)
6. **make-executable** - Makes hooks executable (`chmod +x hooks/*.ts`)
7. **install-arkadian-cmd** - Copies `arkadian` script to `~/bin/`, adds `~/bin` to PATH
8. **install-agents** - Copies agents to `~/.claude/agents/`
9. **install-skills** - Copies skills to `~/.claude/skills/`
10. **install-commands** - Copies commands to `~/.claude/commands/`
11. **verify** - Checks all components are installed correctly

### Files Created

| Location | Purpose |
|----------|---------|
| `~/.claude/settings.json` | Hook configuration + env vars |
| `~/.claude/agents/*.md` | Agent definitions |
| `~/.claude/skills/*/` | Skill prompts |
| `~/.claude/commands/*.md` | Slash commands |
| `~/bin/arkadian` | Launch script |
| `~/.zshrc` additions | `ARKADIAN_DIR` export + PATH |

## What `make uninstall` Does

1. Backs up `~/.claude/settings.json` to `settings.json.pre-uninstall`
2. Removes `~/.claude/settings.json`
3. Removes `~/.claude/CLAUDE.md` (if it's from Arkadian)
4. Removes `~/.claude/agents/`
5. Removes `~/.claude/skills/`
6. Removes `~/.claude/commands/`
7. Removes `~/bin/arkadian`
8. Removes `ARKADIAN_DIR` export from shell config

**Note:** The `PATH="$HOME/bin:$PATH"` line is left in place as other tools may use `~/bin`.

## Why `source ~/.zshrc`?

Your shell only reads `~/.zshrc` once at startup. The installer adds:

```bash
export ARKADIAN_DIR="/path/to/arkadian"
export PATH="$HOME/bin:$PATH"
```

Without sourcing, these aren't loaded in your current terminal:

```bash
make install      # adds to .zshrc
arkadian          # ERROR: command not found
source ~/.zshrc   # loads new config
arkadian          # works!
```

**Alternative:** Just open a new terminal window.

## Usage

After installation:

```bash
# Launch with orchestrator (recommended)
arkadian

# Or standard claude (less strict instruction following)
claude
```

The `arkadian` command uses `--append-system-prompt` to inject ORCHESTRATOR.md into the system prompt, ensuring strict instruction following.

## Prerequisites

- **bun** - JavaScript runtime (https://bun.sh)
- **git** - Version control
- **Claude Code** - Anthropic's CLI

## Available Make Targets

```bash
make install      # Complete installation
make uninstall    # Remove installation
make verify       # Check installation
make status       # Show installation status
make test-hook    # Test context loading hook
make clean        # Remove backup files
make help         # Show all targets
```

## Configuration Files

| File | Purpose | Tracked? |
|------|---------|----------|
| `.env.example` | Template for env vars | Yes |
| `.env` | Your local paths | No (gitignored) |
| `.claude-settings.template.json` | Settings template | Yes |

## Troubleshooting

### `arkadian: command not found`

```bash
# Check if installed
ls -la ~/bin/arkadian

# Check PATH
echo $PATH | grep -o "$HOME/bin"

# Fix: source shell config or open new terminal
source ~/.zshrc
```

### `ARKADIAN_DIR not set`

```bash
# Check value
echo $ARKADIAN_DIR

# Fix: source shell config
source ~/.zshrc
```

### Hook not running

```bash
# Check hooks are executable
ls -la hooks/*.ts

# Check settings.json exists
cat ~/.claude/settings.json | jq '.hooks'

# Test hook manually
make test-hook
```

### Settings not applied

Restart Claude Code - settings are loaded once at startup.

## Updating

```bash
cd /path/to/arkadian
git pull
make install   # Re-runs installation
```

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `scripts/arkadian` | Launch script (copies to ~/bin) |
| `scripts/generate-env.sh` | Interactive .env generator |
| `scripts/generate-claude-settings.sh` | Generates settings.json |
| `scripts/install-agents.sh` | Installs agents |
| `scripts/install-skills.sh` | Installs skills |
| `scripts/install-commands.sh` | Installs commands |
| `scripts/arkadian-refresh-docs.js` | Regenerates project docs |
| `scripts/arkadian-check-freshness.js` | Checks docs are up-to-date |
