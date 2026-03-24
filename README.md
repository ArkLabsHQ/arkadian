# Arkadian

**Multi-agent AI orchestration for the Ark protocol ecosystem.**

Arkadian is a [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugin that turns Claude into a strict, hook-enforced orchestrator across 20 Ark repositories. It delegates work to specialist agents, enforces a mandatory pipeline at the OS level, and produces traceable, resumable session artifacts.

```
  User ──► arkadian "Fix VTXO expiry in fulmine"
                │
     ┌──────────┼──────────────────────┐
     │          ▼                      │
     │   ┌─────────────┐              │
     │   │ Orchestrator │──► hooks     │
     │   └──────┬──────┘   enforce    │
     │          │          every step  │
     │   ┌──────┼──────┐              │
     │   ▼      ▼      ▼              │
     │  guru   PM    developer        │
     │   │      │      │              │
     │   ▼      ▼      ▼              │
     │  assess plan  implement        │
     └────────────────────────────────┘
```

## At a Glance

| Metric | Count |
|--------|-------|
| Projects in registry | 20 |
| Languages covered | 5 (Go, TypeScript, Rust, C#, MDX/HCL) |
| Specialist agents | 8 |
| Domain skills | 33 |
| Workflow templates | 12 |
| Slash commands | 13 |
| TypeScript hooks | 11 (~4,730 LOC) |
| Orchestrator spec | 1,620 lines |
| Approval gates | 3 (plan, spec, subsequent) |

## Prerequisites

Before installing Arkadian, you need:

1. **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** — installed and authenticated (`claude` command available)
2. **[Bun](https://bun.sh)** — runtime for TypeScript hooks (`curl -fsSL https://bun.sh/install | bash`)
3. **[Git](https://git-scm.com/)**
4. **At least 3 Ark repositories cloned locally** (see next section)

## Installation

### Step 1: Clone the Ark repositories

Arkadian orchestrates work across Ark codebases, so it needs local access to the repos you want to work with. **At minimum**, you need these 3 core repos:

```bash
# Create a workspace (use any directory structure you prefer)
mkdir -p ~/code/ark && cd ~/code/ark

# Required: Core repos
git clone git@github.com:arkade-os/arkd.git        # arkd - protocol server
git clone git@github.com:arkade-os/go-sdk.git      # Go client SDK
git clone git@github.com:arkade-os/wallet.git       # PWA wallet
```

**Optional repos** — clone any you plan to work with:

```bash
# SDKs
git clone git@github.com:arkade-os/ts-sdk.git       # TypeScript SDK
git clone git@github.com:arkade-os/rust-sdk.git      # Rust SDK
git clone git@github.com:arkade-os/dotnet-sdk.git    # .NET SDK

# Services
git clone git@github.com:ArkLabsHQ/fulmine.git       # Lightning wallet + swaps
git clone git@github.com:ArkLabsHQ/ark-faucet.git    # Testnet faucet

# Swap infrastructure
git clone git@github.com:BoltzExchange/boltz-backend.git  # Atomic swaps
git clone git@github.com:arkade-os/boltz-swap.git         # Swap client library

# Smart contracts
git clone git@github.com:ArkLabsHQ/compiler.git      # Arkade Script compiler
git clone git@github.com:ArkLabsHQ/introspector.git   # Script engine

# Applications
git clone git@github.com:ArkLabsHQ/arkade-escrow.git    # 3-party escrow
git clone git@github.com:ArkLabsHQ/arkade-explorer.git  # Block explorer
git clone git@github.com:ArkLabsHQ/arkade-assets.git    # Asset protocol

# Testing & ops
git clone git@github.com:ArkLabsHQ/ark-simulator.git    # Load testing
git clone git@github.com:ArkLabsHQ/ark-telemetry.git    # Monitoring stack
git clone git@github.com:ArkLabsHQ/ark-infra.git        # IaC (Terraform/Docker)
git clone git@github.com:ArkLabsHQ/kms-unlocker.git     # AWS KMS wallet unlock
git clone git@github.com:arkade-os/docs.git              # Protocol docs
```

You can always add more repos later (see [Adding a new repository](#adding-a-new-repository)).

### Step 2: Clone and install Arkadian

```bash
git clone <arkadian-repo-url>
cd arkadian
make install
```

During installation, `make install` will:

1. **Check prerequisites** — verifies `claude`, `bun`, and `git` are installed
2. **Prompt for repo paths** — asks where you cloned each repo (press Enter to skip optional ones)
3. **Generate settings** — creates `~/.claude/settings-arkadian.json` with hooks and env vars
4. **Install components** — agents, skills, commands, and the `arkadian` CLI

The interactive prompt looks like this:

```
Step 1: Core Repositories (required)
───────────────────────────────────────
  arkd (protocol server): ~/code/ark/ark
  go-sdk (Go client SDK): ~/code/ark/go-sdk
  wallet (PWA wallet): ~/code/ark/wallet

Step 2: Optional Repositories
───────────────────────────────────────
Press Enter to skip any repo you haven't cloned.
  fulmine (Lightning wallet + swaps): ~/code/ark/fulmine
  ts-sdk (TypeScript SDK): ⏎  (skipped)
  ...

Step 3: GitHub URLs
───────────────────────────────────────
Accept all defaults? (Y/n): Y
```

### Step 3: Reload your shell

```bash
source ~/.zshrc   # or open a new terminal
```

### Step 4: Verify

```bash
make verify
```

Expected output:

```
✓ Arkadian settings file exists (settings-arkadian.json)
✓ ARKADIAN_DIR configured correctly
✓ 'arkadian' command installed (uses --append-system-prompt)
✓ User submit reminder hook is executable
✓ 8 agents installed in ~/.claude/agents
✓ 33 skills installed in ~/.claude/skills
✓ 13 commands installed in ~/.claude/commands
✓ ARKADIAN_DIR in ~/.zshrc
✓ ARKADIAN_DATA_DIR in ~/.zshrc
✓ Data directory exists
```

### Updating repo paths later

```bash
# Edit directly
vim .env

# Or regenerate from scratch
rm .env && make generate-env

# Then regenerate settings
make copy-settings-with-env
```

See [`.env.example`](.env.example) for all available variables.

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `ARKADIAN_DIR` | Path to this repository (auto-set by installer) |
| `ARKADIAN_DATA_DIR` | Runtime data directory (auto-set by installer) |

### Repository Paths (in `.env`)

Only `ARKD_REPO`, `GO_SDK_REPO`, and `WALLET_REPO` are required. All others are optional — skip repos you don't have cloned locally.

| Variable | Project | Language |
|----------|---------|----------|
| `ARKD_REPO` | arkd (core server) | Go |
| `GO_SDK_REPO` | go-sdk (Go SDK) | Go |
| `WALLET_REPO` | wallet (PWA) | TypeScript |
| `TS_SDK_REPO` | ts-sdk (@arkade-os/sdk) | TypeScript |
| `RUST_SDK_REPO` | rust-sdk (ark-rs) | Rust |
| `DOTNET_SDK_REPO` | dotnet-sdk (NArk) | C# |
| `FULMINE_REPO` | fulmine (Lightning wallet) | Go |
| `ARK_FAUCET_REPO` | ark-faucet (testnet faucet) | Go |
| `BOLTZ_BACKEND_REPO` | boltz-backend (atomic swaps) | TypeScript/Rust |
| `BOLTZ_SWAP_REPO` | boltz-swap (swap library) | TypeScript |
| `COMPILER_REPO` | compiler (Arkade Script) | Rust |
| `INTROSPECTOR_REPO` | introspector (script engine) | Go |
| `ARKADE_ESCROW_REPO` | arkade-escrow (3-party escrow) | TypeScript |
| `ARKADE_EXPLORER_REPO` | arkade-explorer (block explorer) | TypeScript |
| `ARKADE_ASSETS_REPO` | arkade-assets (asset protocol) | TypeScript |
| `ARK_SIMULATOR_REPO` | ark-simulator (load testing) | Go |
| `ARK_TELEMETRY_REPO` | ark-telemetry (monitoring) | YAML |
| `ARK_INFRA_REPO` | ark-infra (IaC) | HCL |
| `KMS_UNLOCKER_REPO` | kms-unlocker (wallet unlock) | Go |
| `ARK_DOCS_REPO` | ark-docs (documentation) | MDX |

Each repo also has a `_GITHUB` counterpart (e.g., `ARKD_GITHUB=arkade-os/ark`) used by the progress tracker for PR fetching.

## Usage

### Three Modes

| Command | Mode | What it does |
|---------|------|-------------|
| `arkadian "task"` | Orchestrator | Strict delegation to agents, hook-enforced pipeline |
| `arkadian -d "task"` | Detached | Same pipeline, fully automated (no approval prompts) |
| `claude` (in arkadian dir) | Development | Full tool access for working on Arkadian itself |

### Orchestrator Mode (primary)

```bash
# Ask a question (routes to ark-guru)
arkadian "How does round finalization work in arkd?"

# Fix a bug (full 4-phase pipeline: explore -> plan -> implement -> review)
arkadian "Fix the VTXO expiry handling in fulmine"

# Add a feature
arkadian "Add GetRoundMetrics RPC endpoint to arkd"

# Research
arkadian "Compare Ark's exit mechanism to Lightning force-closes"
```

The orchestrator:
1. Classifies your intent (question, develop, debug, research, etc.)
2. Selects relevant projects from the 20-project registry
3. Picks a workflow template
4. Presents a plan and waits for your approval (`APPROVED`)
5. Shows each execution spec and waits for approval
6. Invokes specialist agents one at a time
7. Validates outputs with post-agent hooks

### Detached Mode (fire and forget)

```bash
# Run the full pipeline without interaction
arkadian -d "Add GetRoundMetrics RPC endpoint to arkd"

# Monitor progress
arkadian status              # List active sessions
arkadian status <session_id> # Detailed status
arkadian logs <session_id>   # Follow live output
```

All 3 approval gates are auto-approved. Hook enforcement remains active.

### Session Resume

```bash
# Resume by friendly name
arkadian --resume 2026-02-16-implement-getswapevents-streaming-grpc-rpc

# Resume by UUID
arkadian --resume a1b2c3d4-e5f6-7890-abcd-ef1234567890

# Resume in detached mode
arkadian --resume 2026-02-16-implement-getswapevents -d
```

Sessions are stored in `sessions/` with full artifacts. `_result.json` files track which phases completed — resume picks up from the first incomplete phase.

### Slash Commands

Use these inside a Claude Code session:

| Command | Description |
|---------|-------------|
| `/add-project` | Analyze a repo and register it in the Arkadian docs |
| `/update-project` | Update project docs from new commits |
| `/remove-project` | Remove a project from the registry |
| `/speckit.specify` | Create a feature specification |
| `/speckit.plan` | Generate an implementation plan |
| `/speckit.tasks` | Break down into dependency-ordered tasks |
| `/speckit.implement` | Execute the implementation plan |
| `/speckit.analyze` | Cross-artifact consistency check |
| `/speckit.clarify` | Ask clarifying questions about underspecified areas |
| `/speckit.checklist` | Generate quality gate checklists |
| `/speckit.constitution` | Create/update project principles |
| `/analyse-arkadian-session` | Analyze a past session for insights |
| `/create-operational-sop` | Generate validated operational SOPs |

## Architecture

### The Four-Phase Pipeline

Every development task follows the same mandatory pipeline (v5.0.0):

```
  EXPLORE          PLAN           IMPLEMENT        REVIEW
  ark-guru    ark-project-mgr    ark-developer   ark-pr-reviewer
     │              │                 │                │
     ▼              ▼                 ▼                ▼
  assessment     spec.md          code changes     review report
    .yaml        plan.md          test-evidence    approve/reject
                 tasks.md         changes.yaml
```

- **No phase can be skipped.** Hooks enforce prerequisites at the OS level.
- Each phase receives **all prior artifacts** (not just the immediate predecessor).
- Up to **3 retries** on failure with structured feedback, then escalation to human.

### Hook Enforcement

11 TypeScript hooks (~4,730 LOC) run via Bun, intercepting every tool call:

| Hook | Event | Purpose |
|------|-------|---------|
| `orchestrator-guardrail.ts` | PreToolUse | Blocks orchestrator from accessing project repos |
| `pre-agent-validator.ts` | PreToolUse | Validates execution specs, checks pipeline prerequisites |
| `subagent-guardrail.ts` | PreToolUse | Per-agent tool/path restrictions, worktree enforcement |
| `post-agent-validator.ts` | PostToolUse | Validates agent outputs, checks hard gates |
| `user-submit-reminder.ts` | UserPromptSubmit | Injects compliance reminder |
| `session-start-hook.ts` | SessionStart | Creates session folder, handles resume |
| `session-stop-hook.ts` | SessionEnd | Cleanup, summarization |

Exit code 0 = allow, exit code 2 = **block**. The LLM cannot bypass hooks.

### 8 Specialist Agents

| Agent | Role | Key Constraint |
|-------|------|----------------|
| `ark-guru` | Explore, analyze, Q&A | Cannot run Bash |
| `ark-project-manager` | Spec, plan, task breakdown | Only agent with Skill tool |
| `ark-developer` | Implement + test | Cannot WebSearch; writes to worktree only |
| `ark-pr-reviewer` | Code review | Read-only analysis |
| `ark-observer` | Telemetry debugging | Observability stack access |
| `ark-researcher` | Bitcoin/L2 research | Web search + parallel sub-agents |
| `ark-progress-tracker` | Progress reports | GitHub PR tracking |
| `claude-search-agent` | Web research worker | WebSearch + WebFetch only |

### Session Structure

```
sessions/<project>/
  <friendly-name>/
  ├── metadata.json          # who, when, what
  ├── workflow.yaml           # approved plan
  ├── specs/
  │   ├── S1.yaml S2.yaml S3.yaml
  │   └── <project>/<feature>/
  │       ├── spec.md plan.md tasks.md
  │       └── _result.json
  └── artifacts/
      ├── explore/  assessment.yaml  _result.json
      └── implement/  detailed_report.md  test-evidence.md
                      changes.yaml  _result.json
```

### Worktree Isolation

`ark-developer` never writes to your main branch. All code changes go to:

```
<repo>/.worktrees/arkadian/<date>-<task-slug>/
```

The `subagent-guardrail.ts` hook blocks writes to the main repo path when worktree mode is enabled.

## What Gets Installed

| Location | Content |
|----------|---------|
| `~/.claude/settings-arkadian.json` | Hooks, env vars, permissions (orchestrator mode) |
| `~/.claude/settings.json` | Vanilla Claude settings (preserved, not overwritten) |
| `~/.claude/agents/` | 8 agent definitions |
| `~/.claude/skills/` | 33 domain skills |
| `~/.claude/commands/` | 13 slash commands |
| `~/bin/arkadian` | Launch script (orchestrator + detached + resume) |
| `~/.zshrc` (or equivalent) | `ARKADIAN_DIR` and `ARKADIAN_DATA_DIR` exports |

## Make Targets

```bash
make install            # Complete installation (interactive)
make uninstall          # Remove everything (preserves vanilla Claude settings)
make verify             # Check all components are installed correctly
make status             # Show installation status and environment
make help               # List all available targets

# Partial installs (after changing specific components)
make install-agents     # Reinstall agents only
make install-skills     # Reinstall skills only
make install-commands   # Reinstall commands only

# Environment management
make generate-env       # Interactive .env generation (20 repos)
make copy-settings-with-env  # Regenerate settings from .env
make export-env         # Re-export ARKADIAN_DIR to shell config

# Utilities
make test-hook          # Test hook execution
make clean              # Remove backup files
```

## Project Coverage

### Core

| Project | Language | Description |
|---------|----------|-------------|
| arkd | Go | Ark protocol server — VTXOs, rounds, settlement |
| go-sdk | Go | Go client SDK for building wallets |
| ts-sdk | TypeScript | TypeScript SDK (@arkade-os/sdk) — browser, Node, React Native |
| rust-sdk | Rust | Rust crates (ark-rs) — WASM-compatible |
| dotnet-sdk | C# | .NET SDK (NArk) — EF Core, Aspire E2E |
| wallet | TypeScript | Self-custodial PWA wallet |

### Services & Infrastructure

| Project | Language | Description |
|---------|----------|-------------|
| fulmine | Go | Bitcoin wallet with Lightning swaps via Boltz |
| ark-faucet | Go | Testnet coin distribution |
| boltz-backend | TS/Rust | Non-custodial atomic swaps (Boltz Exchange) |
| boltz-swap | TypeScript | Boltz swap client library |
| compiler | Rust | Arkade Script compiler (.ark -> Taproot ASM) |
| introspector | Go | Script engine (50+ opcodes) + transaction signing |

### Applications & Tools

| Project | Language | Description |
|---------|----------|-------------|
| arkade-escrow | TypeScript | 3-party escrow with Virtual Escrow Contracts |
| arkade-explorer | TypeScript | Block explorer with VTXO tracking |
| arkade-assets | TypeScript | UTXO-native asset protocol with teleport transfers |
| ark-simulator | Go | Load testing and simulation |
| ark-telemetry | YAML | Prometheus, Grafana, Loki, Tempo stack |
| ark-infra | HCL | OpenTofu/Terraform + Docker Compose |
| kms-unlocker | Go | AWS KMS wallet unlock automation |
| ark-docs | MDX | Official Ark protocol documentation |

## Server / EC2 Deployment

For headless environments (EC2, CI, remote servers), use the bootstrap script instead of `make install`:

### Quick start

```bash
# 1. Clone Arkadian (git is the only thing you need upfront)
sudo apt-get install -y git   # or: sudo dnf install -y git
git clone <arkadian-repo-url> ~/arkadian
cd ~/arkadian

# 2. Run the bootstrap script (installs Node.js, Bun, Claude Code CLI, gh, etc.)
bash scripts/ec2-bootstrap.sh

# 3. Clone the Ark repos you'll work with
git clone git@github.com:arkade-os/arkd.git ~/ark/ark          # required
git clone git@github.com:arkade-os/go-sdk.git ~/ark/go-sdk    # required
git clone git@github.com:arkade-os/wallet.git ~/ark/wallet     # required

# 4. Run the normal Arkadian installer (prompts for repo paths)
export ANTHROPIC_API_KEY="sk-ant-..."
make install

# 5. Reload shell and run
source ~/.bashrc
arkadian -d "Add GetRoundMetrics RPC to arkd"
```

### What the bootstrap script installs

| What | How |
|------|-----|
| `git`, `curl`, `unzip`, `make`, `jq` | apt/dnf/yum |
| Node.js LTS | nvm |
| Bun | bun.sh installer |
| GitHub CLI (`gh`) | OS package |
| Claude Code CLI (`claude`) | npm global |

After the bootstrap, `make install` works exactly like on a local machine — it prompts for repo paths, generates settings, installs agents/skills/commands.

### EC2 instance recommendations

- **Instance type**: `t3.medium` or larger (Claude Code + Bun need ~2GB RAM)
- **Storage**: 20GB+ (repos + session artifacts)
- **OS**: Ubuntu 22.04 LTS or Amazon Linux 2023
- **Security group**: Outbound HTTPS (port 443) for Anthropic API and GitHub

## Troubleshooting

### `arkadian: command not found`

```bash
# Check if ~/bin is in PATH
echo $PATH | tr ':' '\n' | grep bin

# If not, source your shell config
source ~/.zshrc

# Or manually add
export PATH="$HOME/bin:$PATH"
```

### Hooks failing with permission errors

```bash
make make-executable    # chmod +x on all hooks
```

### Agent blocked by pipeline prerequisite

This is expected behavior. The error tells you exactly what's missing:

```
PIPELINE PREREQUISITE FAILURE
  - ark-developer requires guru exploration first.
    Missing: artifacts/explore/assessment.yaml.
```

The orchestrator handles this automatically. If you see this in logs, it means the pipeline is working correctly.

### Environment variables not loading

```bash
# Check current state
make status

# Regenerate settings from .env
make copy-settings-with-env

# Reload shell
source ~/.zshrc
```

### Adding a new repository

```bash
# 1. Clone the repo
git clone <repo-url> /path/to/repo

# 2. Add to .env
echo "NEW_REPO=/path/to/repo" >> .env

# 3. Regenerate settings
make copy-settings-with-env

# 4. Register in Arkadian (inside a claude session in arkadian dir)
/add-project
```

## Updating

After pulling new changes:

```bash
git pull
make install-agents     # If agents changed
make install-skills     # If skills changed
make install-commands   # If commands changed
```

Hooks don't need reinstalling — they run from the repo directly.

## Uninstalling

```bash
make uninstall
```

This removes:
- `~/.claude/settings-arkadian.json` (backup saved)
- `~/.claude/agents/`, `~/.claude/skills/`, `~/.claude/commands/`
- `ARKADIAN_DIR` and `ARKADIAN_DATA_DIR` from shell config
- `~/bin/arkadian`

Preserved:
- `~/.claude/settings.json` (vanilla Claude settings)
- Data directory (may contain session artifacts)
- Your `.env` file

## Further Reading

| Document | Purpose |
|----------|---------|
| [Slides](docs/presentations/arkadian-intro/slides.md) | Team presentation (Marp format) |
| [Deep Dive](docs/presentations/arkadian-intro/DEEP_DIVE.md) | Technical companion doc |
| [SETUP.md](internal/SETUP.md) | Detailed installation guide |
| [ARCHITECTURE.md](internal/ARCHITECTURE.md) | Internal architecture |
| [QUICK_REFERENCE.md](internal/QUICK_REFERENCE.md) | Cheat sheet |
| [Use Cases](internal/ARKADIAN_USE_CASES.md) | Usage examples |
