# Arkadian

**An intelligent AI assistant for the Ark protocol ecosystem**

Arkadian orchestrates specialized agents across 12 Ark repositories, providing context-aware assistance with semantic project selection, role-based skills, and intelligent documentation loading.

---

## What Is Arkadian?

Arkadian is a **developer-grade digital assistant** built as a Claude Code plugin that:

- 🧠 **Understands 12 Ark projects** - arkd, go-sdk, wallet, fulmine, boltz-backend, and more
- 🤖 **Delegates to 7 specialized agents** - Q&A, development, testing, PR review, project management, debugging, research
- 📚 **Loads context intelligently** - 94% reduction through semantic project selection (2-3 projects per request vs all 12)
- 🎯 **Works globally** - Available in any directory when using Claude Code
- 🔧 **Enforces quality** - Architecture compliance, test coverage, conventional commits, prod guards

**Key Innovation:** Instead of loading all project documentation for every request, Arkadian scores and selects only the relevant projects based on semantic analysis of your intent.

---

## How It Works

### 1. Semantic Project Selection

When you ask a question, Arkadian:

1. **Analyzes your intent** (ask_question, develop, test_or_run, debug, etc.)
2. **Scores all 12 projects** based on:
   - Keyword overlap with tags/synonyms/triggers
   - Semantic match to project descriptions
   - Capability alignment with your intent
   - Explicit project mentions (highest weight)
3. **Loads only relevant projects** (typically 2-3 vs all 12)
4. **Includes dependencies automatically** (e.g., go-sdk when you ask about wallet)

**Example:**

```
You: "How do I test arkd with multiple wallets?"

Arkadian analyzes:
  - Intent: test_or_run
  - Keywords: "test", "arkd", "multiple wallets"

Scores projects:
  - arkd: 0.95 (server under test)
  - ark-simulator: 0.90 (multi-wallet testing)
  - go-sdk: 0.75 (wallet client)

Loads: 3 project indexes (~3k tokens)
vs. all 12 projects (~50k+ tokens)

Result: 94% context reduction
```

### 2. Tiered Context Loading

Arkadian loads documentation in layers:

- **Tier 1 (Always):** Master registry with all 12 projects metadata
- **Tier 2 (Selected):** Project INDEX.md files for relevant projects
- **Tier 3 (Intent-based):** Deep docs based on your task:
  - Q&A: project_overview.md, usage.md
  - Development: architecture.md, folder_structure.md, testing/how_to_run.md
  - Testing: testing/usage.md, how_to_test.md, troubleshooting.md
- **Tier 4 (Code):** Actual source files from repositories (only when docs insufficient)

### 3. Specialized Agents

Arkadian delegates work to specialist agents:

| Agent | Purpose | Tools |
|-------|---------|-------|
| **ark-guru** | Q&A, explanations, concepts | Read, Grep, Glob |
| **ark-developer** | Code changes, fixes, features | Read, Write, Edit, Bash |
| **ark-env-tester** | Testing, QA, simulations, stacks | Bash, Read, Grep |
| **ark-project-manager** | Specs, planning, task breakdown | 7 PM skills |
| **ark-pr-reviewer** | PR analysis, risk assessment | Bash (git), Read, Grep |
| **ark-debugger** | Fault isolation, root cause | ⏸️ Stub |
| **ark-researcher** | Research, alternatives | ⏸️ Stub |

### 4. Skills & Commands

**8 Skills (Role-Restricted):**
- 7 PM skills: spec, plan, tasks, analyze, clarify, checklist, constitution
- 1 Dev skill: `dev-implement` (ONLY skill that writes code)

**10 Commands:**
- `/add-project` - Automated project documentation
- `/update-project` - Sync docs from repositories
- 8 speckit commands: `/specify`, `/plan`, `/tasks`, `/analyze`, `/clarify`, `/checklist`, `/constitution`, `/implement`

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) - JavaScript/TypeScript runtime
- [Claude Code](https://claude.com/claude-code) - Anthropic's CLI
- Git

### Installation

```bash
# Clone repository
git clone <arkadian-repo-url>
cd arkadian

# One-liner installation
make install

# Restart terminal and Claude Code
source ~/.zshrc  # or ~/.bashrc
```

**What gets installed:**
- ✅ 7 agents → `~/.claude/agents/`
- ✅ 8 skills → `~/.claude/skills/`
- ✅ 10 commands → `~/.claude/commands/`
- ✅ Environment variables → `~/.claude/settings.json`
- ✅ Global activation (works from any directory)

See [SETUP.md](./SETUP.md) for detailed installation instructions and troubleshooting.

---

## Usage Examples

### Q&A

```
You: "How does arkd handle VTXOs?"

Arkadian:
  ✓ Loads: arkd project
  ✓ Agent: ark-guru
  ✓ Responds with citations to source documentation
```

### Testing

```
You: "How do I test arkd with multiple users?"

Arkadian:
  ✓ Loads: arkd, ark-simulator, go-sdk
  ✓ Agent: ark-env-tester
  ✓ Brings up docker compose stack
  ✓ Runs simulations, shows results
```

### Development

```
You: "Add unilateral exit support to wallet"

Arkadian:
  ✓ Loads: wallet, go-sdk, arkd
  ✓ Agents: ark-project-manager → ark-developer → ark-env-tester
  ✓ Creates feature branch
  ✓ Implements with tests
  ✓ Validates architecture compliance
  ✓ Generates PR text
```

### PR Analysis

```
You: "Analyze recent PRs for breaking changes"

Arkadian:
  ✓ Loads: relevant project
  ✓ Agent: ark-pr-reviewer
  ✓ Shows breaking changes, risk assessment, test coverage
```

---

## Architecture Highlights

### Environment Variables

Arkadian uses 13 environment variables to locate repositories:

```bash
ARKADIAN_DIR=/path/to/arkadian
ARKD_REPO=/path/to/ark
GO_SDK_REPO=/path/to/ark-sdk
WALLET_REPO=/path/to/wallet
# ... 9 more projects
```

**Flow:**
```
.env (your paths, gitignored)
  ↓
~/.claude/settings.json (generated)
  ↓
Claude Code loads on startup
  ↓
Variables available as ${VAR_NAME}
```

### Two-Hook System

**SessionStart Hook:**
- Runs once when Claude Code starts
- Loads orchestrator (CLAUDE.md)
- Establishes capabilities

**UserPromptSubmit Hook:**
- Runs on every prompt
- Performs semantic project selection
- Loads relevant context dynamically

### Scoring Algorithm

```
score = 0.35 * intent_match
      + 0.25 * tag_synonym_overlap
      + 0.20 * trigger_overlap
      + 0.10 * capability_match
      + 0.40 * user_explicit
```

Projects with score ≥0.3 are selected (plus their dependencies).

---

## Project Coverage

Arkadian knows about 12 Ark projects:

**Core Protocol (6):**
- arkd - Core daemon
- go-sdk - Go client SDK
- wallet - Reference wallet
- ark-faucet - Testnet faucet
- ark-simulator - Load simulator
- ark-telemetry - Monitoring stack

**Infrastructure (3):**
- ark-infra - OpenTofu/AWS infrastructure
- kms-unlocker - Key management
- ark-docs - Protocol documentation

**Lightning (2):**
- fulmine - Lightning integration
- boltz-backend - Submarine swaps

**Experimental (1):**
- arkade-escrow - Escrow prototype

---

## Safety & Quality

**Built-in guardrails:**
- ✅ **Prod guard:** Requires `I ACKNOWLEDGE PROD` for production changes
- ✅ **Branch-first:** Enforces `feat/*` or `fix/*` branch naming
- ✅ **Conventional commits:** Enforced across all agents
- ✅ **Architecture compliance:** Validates hexagonal architecture boundaries
- ✅ **Test requirements:** Must pass before commit
- ✅ **Coverage thresholds:** Domain >85%, Application >75%, Infrastructure >60%, Interface >70%
- ✅ **Secret redaction:** All outputs sanitized

---

## Documentation

- **[SETUP.md](./SETUP.md)** - Complete installation and configuration guide
- **[PRD.md](./PRD.md)** - Implementation reference (85% complete, 5/7 agents)
- **[CLAUDE.md](./CLAUDE.md)** - Orchestrator prompt (loaded at SessionStart)
- **[Makefile](./Makefile)** - Automation commands

---

## Project Status

**Implementation:** 85% complete

| Category | Planned | Implemented | Status |
|----------|---------|-------------|--------|
| Agents (Full) | 5 | 5 | ✅ 100% |
| Agents (Stub) | 2 | 2 | ⏸️ Spec complete |
| Projects | 6 | 12 | ✅ 200% |
| Commands | 0 | 10 | ✅ Beyond PRD |
| Skills | 0 | 8 | ✅ Beyond PRD |
| Hooks | 0 | 2 | ✅ Beyond PRD |

**Code Volume:**
- 4,695 lines of agent code (excluding stubs)
- 156+ documentation files across 12 projects
- ~500 lines of configuration (commands, skills, hooks)

**Context Efficiency:**
- Projects per request: 2-3 average (vs 12 total)
- Context reduction: 94%
- Semantic scoring accuracy: High

---

## Commands

```bash
make install      # Complete installation
make status       # Check installation status
make verify       # Verify correctness
make test-hook    # Test context loading
make uninstall    # Remove installation
make clean        # Clean backups
make help         # Show all commands
```

---

## Contributing

Arkadian is designed to be extended:

1. **Add projects:** Use `/add-project` command
2. **Update docs:** Use `/update-project` command
3. **Add agents:** Create `.md` files in `agents/`
4. **Add skills:** Create directories in `skills/`
5. **Add commands:** Create `.md` files in `commands/`

All projects must be registered in `docs/INDEX.md` with:
- `project_id`, `description`, `tags`, `synonyms`, `triggers`, `capabilities`, `depends_on`

---

## License

[Your License Here]

---

## Support

**Installation issues:** See [SETUP.md](./SETUP.md) Troubleshooting section

**Check status:**
```bash
make status
```

**Test installation:**
```bash
make test-hook
```

**Verify configuration:**
```bash
cat ~/.claude/settings.json | jq '.env'
```

---

Built with ❤️ for the Ark protocol ecosystem
