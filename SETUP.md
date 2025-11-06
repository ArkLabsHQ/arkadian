# Arkadian Setup Guide

**Arkadian** is an AI digital assistant that orchestrates specialized agents across the Ark protocol ecosystem (12 projects). This guide covers complete installation and configuration.

## Quick Start

```bash
cd /path/to/arkadian
make install
```

Restart your terminal and Claude Code. Done!

---

## What Gets Installed

The installation process automatically:

1. ✅ Checks prerequisites (bun, git)
2. ✅ Prompts for repository paths → generates `.env`
3. ✅ Generates `~/.claude/settings.json` with environment variables
4. ✅ Installs 7 agents to `~/.claude/agents/`
5. ✅ Installs 8 skills to `~/.claude/skills/`
6. ✅ Installs 10 commands to `~/.claude/commands/`
7. ✅ Exports `ARKADIAN_DIR` to your shell config
8. ✅ Makes hooks executable
9. ✅ Verifies installation

**Activation:** Global - works from any directory in Claude Code.

---

## Prerequisites

- **Bun** - JavaScript/TypeScript runtime ([install](https://bun.sh))
- **Git** - Version control
- **Claude Code** - Anthropic's CLI tool

Install bun:
```bash
brew install oven-sh/bun/bun
```

---

## How It Works

### Two-Hook System

Arkadian uses intelligent context loading through two hooks:

#### 1. SessionStart Hook
**Runs once when Claude Code starts**
- Loads orchestrator (`CLAUDE.md`)
- Establishes role and capabilities
- Sets up environment variables

#### 2. UserPromptSubmit Hook
**Runs on every user prompt**
- Analyzes user intent semantically
- Loads master registry (`docs/INDEX.md`)
- Scores and selects relevant projects (2-3 avg)
- Loads only necessary project INDEX.md files
- **Result:** 94% context reduction vs loading all projects

### Semantic Project Selection

**How it works:**

```
User: "How do I test arkd with multiple wallets?"
    ↓
Intent Analysis: test_or_run
    ↓
Project Scoring:
  - arkd: 0.95 (server under test)
  - ark-simulator: 0.90 (multi-wallet testing)
  - go-sdk: 0.75 (wallet library)
    ↓
Loads: 3 project INDEX files (~3k tokens)
    vs. all 12 projects + docs (~50k+ tokens)
```

**Scoring Algorithm:**
```
score = 0.35 * intent_match
      + 0.25 * tag_synonym_overlap
      + 0.20 * trigger_overlap
      + 0.10 * capability_match
      + 0.40 * user_explicit
```

### Environment Variable Strategy

**Problem:** Developers have projects in different locations.

**Solution:** Local `.env` file (gitignored) → global `settings.json`

**Flow:**
```
.env (your local paths, gitignored)
    ↓
~/.claude/settings.json (generated with all env vars)
    ↓
Claude Code loads on startup
    ↓
Variables available as ${VAR_NAME} in prompts
```

**Usage in CLAUDE.md:**
```markdown
Load: ${ARKD_REPO}/server/pkg/handlers/vtxo.go
```

**Claude Code expands automatically:**
```
/Users/you/code/go/ark/server/pkg/handlers/vtxo.go
```

---

## Installation Steps

### Step 1: Clone Repository

```bash
git clone <arkadian-repo-url>
cd arkadian
```

### Step 2: Run Installer

```bash
make install
```

The installer will:
1. Check prerequisites
2. Prompt for repository paths (or use `.env` if exists)
3. Generate `~/.claude/settings.json` with all environment variables
4. Install agents, skills, commands
5. Export `ARKADIAN_DIR` to shell config
6. Verify installation

**Interactive prompts:**
```
Enter path to ARKD_REPO: /Users/you/code/go/ark
Enter path to GO_SDK_REPO: /Users/you/code/go/ark-sdk
Enter path to WALLET_REPO: /Users/you/code/ts/wallet
...
```

### Step 3: Post-Installation

**Required:**
```bash
# Restart terminal (or source shell config)
source ~/.zshrc  # or ~/.bashrc

# Restart Claude Code
# (Settings are loaded on startup)
```

**Verify:**
```bash
# Check environment variable
echo $ARKADIAN_DIR
# Should print: /path/to/arkadian

# Check settings file
cat ~/.claude/settings.json | jq '.env.ARKADIAN_DIR'

# Test hook
make test-hook
```

---

## Environment Variables

### Required Variables (13 total)

**Core:**
- `ARKADIAN_DIR` - This repository

**Projects (12):**
- `ARKD_REPO` - Core daemon
- `GO_SDK_REPO` - Go client SDK
- `WALLET_REPO` - Reference wallet
- `ARK_FAUCET_REPO` - Testnet faucet
- `ARK_SIMULATOR_REPO` - Load simulator
- `ARK_TELEMETRY_REPO` - Monitoring stack
- `ARK_INFRA_REPO` - Infrastructure as code
- `KMS_UNLOCKER_REPO` - Key management
- `FULMINE_REPO` - Lightning integration
- `BOLTZ_BACKEND_REPO` - Submarine swaps
- `ARK_DOCS_REPO` - Protocol docs
- `ARKADE_ESCROW_REPO` - Escrow prototype

### Configuration Files

| File | Purpose | Git Tracked? |
|------|---------|--------------|
| `.env.example` | Template | ✅ Yes |
| `.env` | Your paths | ❌ No (gitignored) |
| `.claude-settings.template.json` | Settings template | ✅ Yes |
| `~/.claude/settings.json` | Generated settings | ❌ No (home dir) |

### How Settings Are Generated

```bash
# Manual generation (if needed)
make copy-settings-with-env
```

**What happens:**
1. Reads `.env` file
2. Substitutes all `${VAR}` placeholders in template
3. Writes to `~/.claude/settings.json`
4. Claude Code loads on next startup

**Generated settings.json structure:**
```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "env": {
    "ARKADIAN_DIR": "/Users/you/code/go/arkadian",
    "ARKD_REPO": "/Users/you/code/go/ark",
    "GO_SDK_REPO": "/Users/you/code/go/ark-sdk",
    ...
  },
  "hooks": {
    "SessionStart": [{
      "type": "command",
      "command": "bun ${ARKADIAN_DIR}/hooks/session-start-hook.ts"
    }],
    "UserPromptSubmit": [{
      "type": "command",
      "command": "bun ${ARKADIAN_DIR}/hooks/load-arkadian-context.ts"
    }]
  }
}
```

---

## Project Structure

```
arkadian/
├── CLAUDE.md                    # Orchestrator (loaded at SessionStart)
├── SETUP.md                     # This guide
├── PRD.md                       # Implementation reference
├── Makefile                     # One-liner installer
├── .env                         # Your paths (gitignored)
├── .env.example                 # Template
│
├── agents/                      # 7 specialized agents
│   ├── ark-guru.md              # Q&A specialist
│   ├── ark-developer.md         # Development
│   ├── ark-env-tester.md        # Testing/QA
│   ├── ark-project-manager.md   # Project orchestration
│   ├── ark-pr-reviewer.md       # PR analysis
│   ├── ark-debugger.md          # Debugging (stub)
│   └── ark-researcher.md        # Research (stub)
│
├── skills/                      # 8 skills (role-restricted)
│   ├── pm-spec/                 # Specification
│   ├── pm-plan/                 # Planning
│   ├── pm-tasks/                # Task breakdown
│   ├── pm-analyze/              # Analysis
│   ├── pm-clarify/              # Clarification
│   ├── pm-checklist/            # Validation
│   ├── pm-constitution/         # Constitution
│   └── dev-implement/           # Code writing (ONLY skill that writes)
│
├── commands/                    # 10 slash commands
│   ├── add-project.md
│   ├── update-project.md
│   └── speckit/                 # 8 speckit commands
│
├── hooks/
│   ├── session-start-hook.ts           # Load orchestrator once
│   └── load-arkadian-context.ts        # Dynamic context per prompt
│
├── docs/
│   ├── INDEX.md                 # Master project registry (12 projects)
│   └── projects/
│       ├── arkd/INDEX.md        # Project-specific docs
│       ├── go-sdk/INDEX.md
│       ├── wallet/INDEX.md
│       └── [9 more projects...]
│
└── scripts/
    ├── generate-env.sh
    ├── generate-claude-settings.sh
    ├── install-agents.sh
    ├── install-skills.sh
    └── install-commands.sh
```

---

## Available Commands

```bash
make install      # Complete installation
make status       # Check installation status
make verify       # Verify correctness
make test-hook    # Test context loading hook
make uninstall    # Remove installation
make clean        # Clean backup files
make help         # Show all commands
```

---

## Troubleshooting

### Hook Not Running

**Problem:** Arkadian doesn't load context

**Solutions:**
1. Check hooks are executable:
   ```bash
   ls -la hooks/
   # Should show: -rwxr-xr-x
   ```

2. Verify settings exist:
   ```bash
   cat ~/.claude/settings.json
   ```

3. Check `ARKADIAN_DIR`:
   ```bash
   echo $ARKADIAN_DIR
   # Should output: /path/to/arkadian
   ```

4. Restart Claude Code completely

### Environment Variable Not Set

**Problem:** `$ARKADIAN_DIR` is empty

**Solutions:**
1. Source shell config:
   ```bash
   source ~/.zshrc  # or ~/.bashrc
   ```

2. Check shell config:
   ```bash
   grep ARKADIAN_DIR ~/.zshrc
   ```

3. Restart terminal

### Settings Not Applied

**Problem:** Changes don't take effect

**Solutions:**
1. Restart Claude Code (settings loaded on startup)
2. Check JSON syntax:
   ```bash
   cat ~/.claude/settings.json | jq '.'
   ```

### Variable Expansion Fails

**Problem:** Claude shows literal `${ARKD_REPO}` instead of path

**Solutions:**
1. Check `.env` exists: `cat .env`
2. Regenerate settings: `make copy-settings-with-env`
3. Restart Claude Code
4. Verify: `cat ~/.claude/settings.json | jq '.env.ARKD_REPO'`

### Directory Not Found

**Problem:** Error loading files from `${ARKD_REPO}`

**Solutions:**
1. Verify path exists: `ls ${ARKD_REPO}`
2. Check `.env` has correct paths: `cat .env`
3. Update `.env` and regenerate: `make copy-settings-with-env`
4. Restart Claude Code

### Missing Repositories

**Problem:** Some `${PROJECT_REPO}` variables undefined

**Solutions:**
1. List defined variables: `cat .env`
2. Add missing repos to `.env`:
   ```bash
   echo "ARK_SIMULATOR_REPO=/path/to/ark-simulator" >> .env
   ```
3. Regenerate: `make copy-settings-with-env`
4. Restart Claude Code

---

## Architecture Details

### Context Loading Flow

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
Score all 12 projects
    ↓
Load top-K project INDEX.md files
    ↓
Claude processes with full context
```

### Tiered Context Loading

**Tier 1 (Always):**
- Master registry: `${ARKADIAN_DIR}/docs/INDEX.md`

**Tier 2 (Selected projects):**
- Project INDEX: `${ARKADIAN_DIR}/docs/projects/<project>/INDEX.md`

**Tier 3 (Intent-based):**
- Deep docs based on `default_sections_by_intent`:
  - `qna`: project_overview.md, testing/usage.md
  - `dev`: architecture.md, folder_structure.md, testing/how_to_run.md
  - `qa`: testing/usage.md, how_to_run.md, how_to_test.md
  - `debug`: troubleshooting.md, integration_points.md

**Tier 4 (Code files):**
- Actual source code from `${PROJECT_REPO}`
- Loaded only when documentation insufficient

**Efficiency:**
- Average request: 2-3 project INDEX files (~3k tokens)
- Without optimization: All 12 projects + docs (~50k+ tokens)
- **Savings: 94% reduction**

### Dependency Awareness

Example: User asks about `ark-simulator`

**Selected projects:**
1. `ark-simulator` (explicitly mentioned)
2. `arkd` (dependency via `depends_on`)
3. `go-sdk` (dependency of arkd)

**Auto-loaded:** All dependencies transitively.

---

## Updating Arkadian

When pulling updates:

```bash
cd /path/to/arkadian
git pull
make install  # Reinstalls with new changes
```

Installer backs up existing settings to `settings.json.backup`.

---

## Uninstalling

```bash
make uninstall
```

This will:
- Backup settings.json to `settings.json.pre-uninstall`
- Remove `~/.claude/agents/`
- Remove `~/.claude/skills/`
- Remove `~/.claude/commands/`
- Remove ARKADIAN_DIR from shell config

Restart terminal after uninstalling.

---

## Advanced Topics

### Manual Installation

If you prefer manual setup:

```bash
# 1. Generate .env
bash scripts/generate-env.sh

# 2. Generate settings
bash scripts/generate-claude-settings.sh

# 3. Install agents/skills/commands
bash scripts/install-agents.sh
bash scripts/install-skills.sh
bash scripts/install-commands.sh

# 4. Export environment variable
echo 'export ARKADIAN_DIR="/full/path/to/arkadian"' >> ~/.zshrc
source ~/.zshrc

# 5. Make hooks executable
chmod +x hooks/*.ts

# 6. Restart Claude Code
```

### CI/CD Setup

For automated environments:

```yaml
# .github/workflows/arkadian-test.yml
env:
  ARKADIAN_DIR: ${{ github.workspace }}/arkadian
  ARKD_REPO: ${{ github.workspace }}/ark
  GO_SDK_REPO: ${{ github.workspace }}/ark-sdk
  # ... other repos

steps:
  - name: Configure Arkadian
    run: |
      cd arkadian
      make copy-settings-with-env
```

### Custom Project Paths

If your repos are in non-standard locations:

```bash
# Edit .env
vim .env

# Example custom layout:
ARKADIAN_DIR=/opt/ai-systems/arkadian
ARKD_REPO=/srv/ark-projects/core-daemon
GO_SDK_REPO=/srv/ark-projects/go-client
WALLET_REPO=/home/builder/ts-projects/wallet

# Regenerate settings
make copy-settings-with-env

# Restart Claude Code
```

---

## Usage Examples

After installation, try these:

### Q&A
```
Ask: "How does arkd handle VTXOs?"
→ Loads: arkd project
→ Agent: ark-guru
```

### Testing
```
Ask: "How do I run the ark-simulator?"
→ Loads: ark-simulator, arkd, go-sdk
→ Agent: ark-env-tester
```

### Development
```
Ask: "Add unilateral exit support to wallet"
→ Loads: wallet, go-sdk, arkd
→ Agents: ark-project-manager → ark-developer → ark-env-tester
→ Creates: feature branch, tests, PR
```

### Analysis
```
Ask: "Analyze recent PRs in arkd for breaking changes"
→ Loads: arkd
→ Agent: ark-pr-reviewer
```

---

## Security Notes

**Safe by default:**
- ✅ Local-only operation (no external API calls)
- ✅ No API keys in configuration
- ✅ Safe tool permissions (Read, Write, Edit, Bash)
- ✅ Dangerous commands blocked (fork bombs, `rm -rf /`)
- ✅ Prod guard: requires `I ACKNOWLEDGE PROD`
- ✅ Secret redaction in all outputs

**Your additions:**
- Add MCP servers if needed
- Add custom permissions in settings.json
- Use `.env` for sensitive paths (never commit!)

---

## Support

**Check status:**
```bash
make status
```

**Test hooks:**
```bash
make test-hook
```

**Verify settings:**
```bash
cat ~/.claude/settings.json | jq '.hooks'
```

**Check logs:**
Claude Code outputs hook errors to stderr.

**Common issues:** See Troubleshooting section above.

---

## What Next?

1. ✅ Installation complete
2. ✅ Restart terminal + Claude Code
3. ✅ Ask Arkadian anything about Ark ecosystem
4. ✅ Let semantic project selection handle context loading
5. ✅ Update `.env` as your repos move/change

**Welcome to Arkadian!** 🚀
