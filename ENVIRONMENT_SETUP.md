# Arkadian Environment Setup Guide

## Overview

The Arkadian orchestration system uses environment variables to locate all 12 Ark project repositories. This guide explains how the environment system works and how to set it up.

## How Environment Variables Work in Claude Code

### 1. Variable Definition Flow

```
.env (local, gitignored)
    ↓
~/.claude/settings.json (generated)
    ↓
Claude Code loads on startup
    ↓
Variables available as ${VAR_NAME} in CLAUDE.md
```

### 2. Why This Architecture?

**Problem**: Different developers have projects in different locations:
- Developer A: `/Users/alice/projects/ark`
- Developer B: `/home/bob/code/go/ark`
- CI Server: `/opt/ark-repos/ark`

**Solution**: Use environment variables that are:
1. **Local** - Each developer configures their own paths
2. **Gitignored** - No hardcoded paths in version control
3. **Automatic** - Loaded by Claude Code on startup

### 3. Variable Usage in CLAUDE.md

When CLAUDE.md contains:

```markdown
**Tier 4 - Get the Code:**
- Load only the specific files needed (e.g., `${ARKD_REPO}/server/pkg/handlers/vtxo.go`)
```

Claude Code **automatically expands** `${ARKD_REPO}` to your configured path:

```
${ARKD_REPO}/server/pkg/handlers/vtxo.go
    ↓ (expanded by Claude Code)
/Users/dusansekulic/code/go/ark/server/pkg/handlers/vtxo.go
```

## Setup Instructions

### Quick Start (Automated)

```bash
# Clone arkadian repository
cd ~/code/go/arkadian

# Run installation (prompts for paths)
make install

# Restart Claude Code
```

### Manual Setup

If you prefer manual configuration:

#### Step 1: Create .env file

```bash
cp .env.example .env
vim .env
```

#### Step 2: Configure paths

Edit `.env` with your actual repository locations:

```bash
# Core Arkadian directory (this repository)
ARKADIAN_DIR=/Users/dusansekulic/code/go/arkadian

# Project repositories (12 total)
ARKD_REPO=/Users/dusansekulic/code/go/ark
GO_SDK_REPO=/Users/dusansekulic/code/go/ark-sdk
WALLET_REPO=/Users/dusansekulic/code/ts/wallet
ARK_FAUCET_REPO=/Users/dusansekulic/code/go/ark-faucet
ARK_SIMULATOR_REPO=/Users/dusansekulic/code/go/ark-simulator
ARK_TELEMETRY_REPO=/Users/dusansekulic/code/go/ark-telemetry
ARK_INFRA_REPO=/Users/dusansekulic/code/infra/ark-infra
KMS_UNLOCKER_REPO=/Users/dusansekulic/code/go/kms-unlocker
FULMINE_REPO=/Users/dusansekulic/code/ts/fulmine
BOLTZ_BACKEND_REPO=/Users/dusansekulic/code/ts/boltz-backend
ARK_DOCS_REPO=/Users/dusansekulic/code/docs/ark-docs
ARKADE_ESCROW_REPO=/Users/dusansekulic/code/go/arkade-escrow
```

#### Step 3: Generate settings

```bash
make copy-settings-with-env
```

This generates `~/.claude/settings.json`:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "env": {
    "ARKADIAN_DIR": "/Users/dusansekulic/code/go/arkadian",
    "ARKD_REPO": "/Users/dusansekulic/code/go/ark",
    "GO_SDK_REPO": "/Users/dusansekulic/code/go/ark-sdk",
    "WALLET_REPO": "/Users/dusansekulic/code/ts/wallet",
    "ARK_FAUCET_REPO": "/Users/dusansekulic/code/go/ark-faucet",
    "ARK_SIMULATOR_REPO": "/Users/dusansekulic/code/go/ark-simulator",
    "ARK_TELEMETRY_REPO": "/Users/dusansekulic/code/go/ark-telemetry",
    "ARK_INFRA_REPO": "/Users/dusansekulic/code/infra/ark-infra",
    "KMS_UNLOCKER_REPO": "/Users/dusansekulic/code/go/kms-unlocker",
    "FULMINE_REPO": "/Users/dusansekulic/code/ts/fulmine",
    "BOLTZ_BACKEND_REPO": "/Users/dusansekulic/code/ts/boltz-backend",
    "ARK_DOCS_REPO": "/Users/dusansekulic/code/docs/ark-docs",
    "ARKADE_ESCROW_REPO": "/Users/dusansekulic/code/go/arkade-escrow"
  },
  "hooks": { ... }
}
```

#### Step 4: Restart Claude Code

Environment variables are loaded on startup.

## Usage in Orchestration

### Example: Loading Code (Tier 4)

When the orchestrator needs to load source code:

**CLAUDE.md instructions**:
```markdown
1. First, load `${ARKADIAN_DIR}/docs/projects/arkd/system/folder_structure.md`
2. This document explains where components live
3. Load specific files: `${ARKD_REPO}/server/pkg/handlers/vtxo.go`
```

**What Claude Code sees**:
```
1. First, load /Users/dusansekulic/code/go/arkadian/docs/projects/arkd/system/folder_structure.md
2. This document explains where components live
3. Load specific files: /Users/dusansekulic/code/go/ark/server/pkg/handlers/vtxo.go
```

### Example: Agent INPUT CONTRACT

When spawning ark-developer agent:

```yaml
objective: "Add unilateral exit support to wallet"
repos: ["wallet", "go-sdk"]
docs_hint:
  sections:
    - "system/architecture.md"
    - "system/folder_structure.md"
code_files:
  - "${GO_SDK_REPO}/client/unilateral.go"
  - "${WALLET_REPO}/src/wallet.ts"
```

Agent receives expanded paths:
```yaml
code_files:
  - "/Users/dusansekulic/code/go/ark-sdk/client/unilateral.go"
  - "/Users/dusansekulic/code/ts/wallet/src/wallet.ts"
```

## Verification

### Check Environment is Loaded

```bash
# In Claude Code, run:
echo $ARKADIAN_DIR
# Should print: /Users/dusansekulic/code/go/arkadian

# Check all variables:
env | grep -E "(ARKADIAN|ARKD|FULMINE|BOLTZ)"
```

### Verify Settings File

```bash
cat ~/.claude/settings.json | jq '.env'
```

Should show all 13 environment variables.

### Test with Orchestrator

Open Claude Code and ask:
```
Show me the folder structure of arkd
```

The orchestrator should:
1. Load `${ARKADIAN_DIR}/docs/projects/arkd/system/folder_structure.md` (Tier 3)
2. If needed, load code from `${ARKD_REPO}/...` (Tier 4)

## Troubleshooting

### Issue: `${ARKD_REPO}` Not Expanding

**Symptoms**: Claude Code shows literal `${ARKD_REPO}` instead of path

**Solution**:
1. Check `.env` exists: `cat .env`
2. Regenerate settings: `make copy-settings-with-env`
3. Restart Claude Code
4. Verify: `cat ~/.claude/settings.json | jq '.env.ARKD_REPO'`

### Issue: Directory Not Found

**Symptoms**: Error loading files from `${ARKD_REPO}`

**Solution**:
1. Verify path exists: `ls ${ARKD_REPO}`
2. Check `.env` has correct paths: `cat .env`
3. Update `.env` and regenerate: `make copy-settings-with-env`
4. Restart Claude Code

### Issue: Some Variables Missing

**Symptoms**: Some `${PROJECT_REPO}` variables work, others don't

**Solution**:
1. Check which variables are defined: `cat .env`
2. Add missing repositories to `.env`
3. Regenerate settings: `make copy-settings-with-env`
4. Restart Claude Code

## Files Reference

| File | Purpose | Tracked in Git? |
|------|---------|-----------------|
| `.env.example` | Template with placeholders | Yes |
| `.env` | Your actual paths | No (gitignored) |
| `.claude-settings.template.json` | Template for Claude settings | Yes |
| `~/.claude/settings.json` | Generated settings with env vars | No (in home dir) |
| `scripts/generate-env.sh` | Prompts for paths | Yes |
| `scripts/generate-claude-settings.sh` | Generates settings from .env | Yes |

## Environment Variables List

All 13 variables used by Arkadian:

| Variable | Description | Required? |
|----------|-------------|-----------|
| `ARKADIAN_DIR` | Arkadian repository (this repo) | Yes |
| `ARKD_REPO` | Core daemon repository | Yes |
| `GO_SDK_REPO` | Go client SDK | Yes |
| `WALLET_REPO` | Reference wallet | Yes |
| `ARK_FAUCET_REPO` | Testnet faucet | Optional |
| `ARK_SIMULATOR_REPO` | Load simulation tool | Optional |
| `ARK_TELEMETRY_REPO` | Monitoring stack | Optional |
| `ARK_INFRA_REPO` | Infrastructure as code | Optional |
| `KMS_UNLOCKER_REPO` | Key management | Optional |
| `FULMINE_REPO` | Lightning integration | Optional |
| `BOLTZ_BACKEND_REPO` | Submarine swaps | Optional |
| `ARK_DOCS_REPO` | Protocol documentation | Optional |
| `ARKADE_ESCROW_REPO` | Escrow prototype | Optional |

## Advanced: CI/CD Setup

For CI/CD environments (GitHub Actions, GitLab CI, etc.):

```yaml
# .github/workflows/arkadian-test.yml
env:
  ARKADIAN_DIR: ${{ github.workspace }}/arkadian
  ARKD_REPO: ${{ github.workspace }}/ark
  GO_SDK_REPO: ${{ github.workspace }}/ark-sdk
  # ... other repos
```

Then generate settings:
```bash
make copy-settings-with-env
```

## Next Steps

1. ✅ Install: `make install`
2. ✅ Verify: `cat ~/.claude/settings.json`
3. ✅ Restart Claude Code
4. ✅ Test: Ask orchestrator to load code from a repository
5. ✅ Iterate: Update `.env` paths as needed

## Questions?

- **Where do I put my project paths?** → In `.env` (gitignored)
- **How does Claude Code know about them?** → Loaded from `~/.claude/settings.json`
- **When are they expanded?** → Automatically by Claude Code when reading CLAUDE.md
- **What if I move repositories?** → Update `.env`, run `make copy-settings-with-env`, restart Claude Code
- **Can I use relative paths?** → Yes, but absolute paths are recommended for reliability
