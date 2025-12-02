# Arkadian

**An intelligent AI assistant for the Ark protocol ecosystem**

Arkadian orchestrates specialized agents across 12+ Ark repositories, providing context-aware assistance for development, testing, debugging, and documentation.

## Features

- **Semantic Project Selection** - Loads only relevant projects (2-3 per request vs all 12)
- **7 Specialized Agents** - Q&A, development, testing, PR review, project management, debugging, research
- **8 Skills + 10 Commands** - Specification, planning, implementation workflows
- **Orchestrator Guardrails** - Ensures delegation to agents, blocks direct code access
- **Global Activation** - Works from any directory

## Quick Start

```bash
git clone <arkadian-repo-url>
cd arkadian
make install
source ~/.zshrc   # or open new terminal
```

## Usage

```bash
# Launch with orchestrator (recommended)
arkadian

# Standard claude (less strict)
claude
```

The `arkadian` command enforces orchestrator boundaries - it can only read documentation and delegate to agents. Direct code access is blocked.

## What Gets Installed

| Location | Content |
|----------|---------|
| `~/.claude/settings.json` | Hooks + environment variables |
| `~/.claude/agents/` | 7 agent definitions |
| `~/.claude/skills/` | 8 PM/dev skills |
| `~/.claude/commands/` | 10 slash commands |
| `~/bin/arkadian` | Launch script |

## Documentation

| Document | Purpose |
|----------|---------|
| [SETUP.md](internal/SETUP.md) | Installation details, troubleshooting |
| [ARCHITECTURE.md](internal/ARCHITECTURE.md) | How Arkadian works internally |
| [QUICK_REFERENCE.md](internal/QUICK_REFERENCE.md) | Cheat sheet |
| [ARKADIAN_USE_CASES.md](internal/ARKADIAN_USE_CASES.md) | Usage examples |

## Make Targets

```bash
make install      # Complete installation
make uninstall    # Remove installation
make verify       # Check installation
make status       # Show status
make help         # All commands
```

## Project Coverage

**Core:** arkd, go-sdk, wallet, ark-faucet, ark-simulator, ark-telemetry
**Infrastructure:** ark-infra, kms-unlocker, ark-docs
**Lightning:** fulmine, boltz-backend
**Experimental:** arkade-escrow

## License

[Your License Here]
