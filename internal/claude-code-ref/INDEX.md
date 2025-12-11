# Claude Code Reference — Document Index & Registry

This is the **master index** for Claude Code reference documentation. It provides a machine-readable registry with document metadata, topics, and routing hints for AI agents.

> **Source**: https://code.claude.com/docs/en/overview
> **Downloaded**: December 2025
> **Purpose**: Offline reference for Arkadian development and Claude Code usage

---

## Document Registry

### 01-getting-started
**ID**: `getting-started`
**Name**: Getting Started Guide
**Type**: Onboarding/Setup
**Path**: `${ARKADIAN_DIR}/internal/claude-code-ref/01-getting-started.md`
**Source**: https://code.claude.com/docs/en/overview

**Description**:
Comprehensive onboarding guide for Claude Code covering installation, authentication, and initial setup. Includes platform-specific instructions (macOS, Linux, Windows), authentication methods (Claude.ai, Anthropic Console, Enterprise SSO), common workflows, IDE integrations, and CI/CD configuration.

**Key Topics**:
- Installation methods (curl, Homebrew, PowerShell, NPM)
- Authentication setup (API keys, OAuth, SSO)
- Core workflows (code analysis, bug fixing, refactoring, test generation)
- IDE integrations (VS Code extension, JetBrains plugin)
- CI/CD integration (GitHub Actions, GitLab CI/CD)
- Cloud execution (Claude Code on the web)
- First-time configuration and onboarding

**Tags**: `installation`, `setup`, `quickstart`, `authentication`, `ide`, `vscode`, `jetbrains`, `ci-cd`, `github-actions`, `gitlab`, `onboarding`

**Synonyms**: `setup-guide`, `installation-guide`, `quickstart`, `onboarding`

**Triggers**:
- **ask_question**: `how to install claude code`, `authentication setup`, `ide integration`, `ci/cd setup`, `getting started`
- **develop**: `setup new project`, `configure ci/cd`, `add ide extension`

**Dependencies**: None (entry point)
**Depended On By**: All other documents (foundational knowledge)

---

### 02-build-with-claude-code
**ID**: `build`
**Name**: Build with Claude Code
**Type**: Development/Extensibility
**Path**: `${ARKADIAN_DIR}/internal/claude-code-ref/02-build-with-claude-code.md`
**Source**: https://code.claude.com/docs/en/sub-agents

**Description**:
Developer guide for extending Claude Code functionality. Covers subagents for specialized tasks, plugins architecture (commands, agents, hooks, skills, MCP servers), headless mode for automation, and Model Context Protocol (MCP) for external tool integration. Essential for building Claude Code plugins like Arkadian.

**Key Topics**:
- Subagents (specialized AI assistants with isolated contexts)
- Task tool for launching subagents
- Plugins architecture (5 components: commands, agents, hooks, skills, MCP)
- Custom slash commands (`.md` files in `.claude/commands/`)
- Custom agents (YAML frontmatter + markdown prompts)
- Hooks (lifecycle event handlers: PreToolUse, PostToolUse, SessionStart, etc.)
- Skills (model-invoked prompts, `prompt.md` pattern)
- Headless mode (`-p` flag, `--output-format json`)
- MCP (Model Context Protocol) server integration
- SDK migration (Claude Code SDK → Claude Agent SDK)

**Tags**: `subagents`, `plugins`, `hooks`, `skills`, `mcp`, `headless`, `automation`, `extensibility`, `commands`, `agents`, `sdk`, `task-tool`

**Synonyms**: `extensibility`, `plugin-development`, `customization`, `automation`

**Triggers**:
- **ask_question**: `how to create subagent`, `write hook`, `create skill`, `mcp server`, `headless mode`, `custom command`
- **develop**: `add plugin`, `create agent`, `implement hook`, `build skill`, `mcp integration`

**Dependencies**: `getting-started` (basic Claude Code usage)
**Depended On By**: Arkadian plugin development, custom tooling

---

### 03-deployment
**ID**: `deployment`
**Name**: Deployment Guide
**Type**: Infrastructure/Enterprise
**Path**: `${ARKADIAN_DIR}/internal/claude-code-ref/03-deployment.md`
**Source**: https://code.claude.com/docs/en/third-party-integrations

**Description**:
Enterprise deployment guide covering cloud provider integrations, network configuration, and security sandboxing. Includes detailed setup for AWS Bedrock, Google Vertex AI, and Microsoft Foundry. Covers proxy configuration, SSL certificates, LLM gateways, and container-based deployments.

**Key Topics**:
- Enterprise deployment overview
- AWS Bedrock integration (`CLAUDE_CODE_USE_BEDROCK=1`)
- Google Vertex AI integration (`CLAUDE_CODE_USE_VERTEX=1`)
- Microsoft Foundry integration (`CLAUDE_CODE_USE_FOUNDRY=1`)
- Network configuration (HTTP/HTTPS proxies, custom certificates)
- LLM Gateway configuration (custom base URLs)
- Development containers (devcontainers, Codespaces, Gitpod)
- Sandboxing (Docker, macOS sandbox, Linux containers)
- Air-gapped deployments

**Tags**: `deployment`, `enterprise`, `aws`, `bedrock`, `vertex-ai`, `gcp`, `foundry`, `azure`, `proxy`, `ssl`, `sandbox`, `docker`, `devcontainer`, `security`

**Synonyms**: `enterprise-setup`, `cloud-deployment`, `infrastructure`, `production`

**Triggers**:
- **ask_question**: `deploy to aws`, `bedrock setup`, `vertex ai`, `proxy configuration`, `sandbox mode`
- **develop**: `configure bedrock`, `setup vertex`, `docker deployment`, `enterprise config`
- **test_or_run**: `sandbox testing`, `container deployment`

**Dependencies**: `getting-started` (basic setup), `configuration` (settings)
**Depended On By**: Production deployments, enterprise installations

---

### 04-administration
**ID**: `administration`
**Name**: Administration Guide
**Type**: Operations/Security
**Path**: `${ARKADIAN_DIR}/internal/claude-code-ref/04-administration.md`
**Source**: https://code.claude.com/docs/en/setup

**Description**:
Administrative guide for managing Claude Code installations, security, monitoring, and costs. Covers IAM integration, security architecture, data usage policies, OpenTelemetry monitoring, cost management, and analytics. Essential for IT administrators and security teams.

**Key Topics**:
- Advanced installation options (silent install, managed deployment)
- Identity and Access Management (SSO, SCIM, role-based access)
- Security architecture (tool approval, permission boundaries)
- Data usage and retention policies
- OpenTelemetry monitoring integration
- Cost management and token budgets
- Analytics dashboard and usage metrics
- Plugin marketplaces and approval workflows
- Audit logging and compliance

**Tags**: `administration`, `security`, `iam`, `sso`, `monitoring`, `telemetry`, `costs`, `analytics`, `compliance`, `audit`, `permissions`, `data-privacy`

**Synonyms**: `admin-guide`, `security-guide`, `operations`, `management`

**Triggers**:
- **ask_question**: `security setup`, `iam configuration`, `cost tracking`, `monitoring setup`, `data privacy`
- **monitor_or_alert**: `usage metrics`, `cost alerts`, `audit logs`
- **develop**: `telemetry integration`, `permission configuration`

**Dependencies**: `getting-started` (installation), `deployment` (enterprise setup)
**Depended On By**: Enterprise operations, security compliance

---

### 05-configuration
**ID**: `configuration`
**Name**: Configuration Reference
**Type**: Settings/Customization
**Path**: `${ARKADIAN_DIR}/internal/claude-code-ref/05-configuration.md`
**Source**: https://code.claude.com/docs/en/settings

**Description**:
Complete configuration reference for Claude Code settings, permissions, and customization. Covers settings hierarchy (enterprise → user → project), permission rules, terminal configuration, model selection, memory management (CLAUDE.md files), and status line customization.

**Key Topics**:
- Settings hierarchy (enterprise.json → settings.json → project settings)
- Permission rules (`allowedTools`, `blockedTools`, `pathPatterns`)
- Sandbox configuration (`sandbox: docker`, `sandbox: macos`)
- Terminal configuration (shell, environment variables)
- Model selection and aliases (`sonnet`, `opus`, `haiku`, `opusplan`)
- Memory management (CLAUDE.md files, rules directory)
- Status line customization
- Environment variable configuration

**Tags**: `configuration`, `settings`, `permissions`, `sandbox`, `terminal`, `model`, `memory`, `claude-md`, `rules`, `customization`

**Synonyms**: `settings`, `config-reference`, `customization`, `preferences`

**Triggers**:
- **ask_question**: `how to configure`, `permission rules`, `model selection`, `memory files`, `CLAUDE.md`
- **develop**: `add permission`, `configure sandbox`, `custom settings`

**Dependencies**: `getting-started` (basic concepts)
**Depended On By**: All advanced usage, plugin development

---

### 06-reference
**ID**: `reference`
**Name**: CLI & API Reference
**Type**: Reference/Documentation
**Path**: `${ARKADIAN_DIR}/internal/claude-code-ref/06-reference.md`
**Source**: https://code.claude.com/docs/en/cli-reference

**Description**:
Complete reference documentation for Claude Code CLI commands, interactive mode, slash commands, and plugin APIs. Includes all CLI flags, keyboard shortcuts, built-in slash commands, checkpointing system, hooks API, and plugins specification.

**Key Topics**:
- CLI commands and flags (`claude`, `claude -p`, `claude -c`, `claude --resume`)
- Interactive mode shortcuts (Escape for interrupt, Tab for autocomplete)
- Built-in slash commands (`/help`, `/config`, `/model`, `/permissions`, `/compact`, `/clear`)
- Custom slash commands (file format, arguments, variables)
- Checkpointing system (automatic saves, manual checkpoints)
- Hooks reference (event types, input/output schemas, return values)
- Plugins reference (manifest format, component types, installation)
- Tool schemas and capabilities

**Tags**: `cli`, `reference`, `commands`, `slash-commands`, `hooks`, `plugins`, `api`, `shortcuts`, `checkpoints`, `tools`

**Synonyms**: `cli-reference`, `api-docs`, `command-reference`, `technical-reference`

**Triggers**:
- **ask_question**: `cli command`, `slash command`, `hook api`, `plugin format`, `keyboard shortcut`
- **develop**: `implement hook`, `create command`, `plugin manifest`

**Dependencies**: `getting-started` (basic usage), `build` (extensibility concepts)
**Depended On By**: Plugin developers, power users

---

## Document Relationships

### Dependency Graph

```
01-getting-started (foundation)
├── 02-build-with-claude-code (extends)
│   └── Arkadian plugin development
├── 03-deployment (scales)
│   └── Enterprise/cloud deployments
├── 04-administration (manages)
│   └── Security, monitoring, costs
├── 05-configuration (customizes)
│   └── Settings, permissions, memory
└── 06-reference (documents)
    └── CLI, APIs, specifications
```

### Topic Cross-Reference

| Topic | Primary Doc | Related Docs |
|-------|-------------|--------------|
| Installation | getting-started | deployment, administration |
| Subagents | build | reference |
| Hooks | build | reference, configuration |
| Skills | build | reference |
| MCP | build | reference |
| Permissions | configuration | administration, reference |
| CLAUDE.md | configuration | build |
| Sandbox | configuration | deployment |
| Enterprise | deployment | administration |
| Monitoring | administration | deployment |
| CLI Commands | reference | getting-started |
| Slash Commands | reference | build |

---

## Quick Reference

### Installation

```bash
# macOS/Linux
curl -fsSL https://claude.ai/install.sh | bash

# Homebrew
brew install --cask claude-code

# Windows PowerShell
irm https://claude.ai/install.ps1 | iex

# NPM (Node.js 18+)
npm install -g @anthropic-ai/claude-code
```

### Essential CLI Commands

| Command | Purpose |
|---------|---------|
| `claude` | Start interactive session |
| `claude "query"` | Start with initial prompt |
| `claude -p "query"` | Print mode (non-interactive) |
| `claude -c` | Continue last conversation |
| `claude --resume <id>` | Resume specific session |
| `claude update` | Update to latest version |
| `claude doctor` | Check installation health |

### Key Slash Commands

| Command | Purpose |
|---------|---------|
| `/help` | Get usage help |
| `/config` | Open settings |
| `/model` | Change AI model |
| `/permissions` | View/update permissions |
| `/compact` | Compact conversation |
| `/clear` | Clear history |
| `/agents` | Manage subagents |
| `/mcp` | Manage MCP connections |
| `/memory` | Edit memory files |
| `/cost` | Show token usage |

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | API authentication |
| `ANTHROPIC_MODEL` | Override default model |
| `CLAUDE_CODE_USE_BEDROCK` | Enable AWS Bedrock |
| `CLAUDE_CODE_USE_VERTEX` | Enable Google Vertex AI |
| `CLAUDE_CODE_USE_FOUNDRY` | Enable Microsoft Foundry |
| `MAX_THINKING_TOKENS` | Extended thinking budget |
| `DISABLE_TELEMETRY` | Opt out of analytics |

### Memory Files

| Location | Scope |
|----------|-------|
| `~/.claude/CLAUDE.md` | User (all projects) |
| `./CLAUDE.md` | Project (team-shared) |
| `./CLAUDE.local.md` | Project (personal) |
| `./.claude/rules/*.md` | Modular project rules |

### Model Aliases

| Alias | Description |
|-------|-------------|
| `sonnet` | Latest Sonnet for daily coding |
| `opus` | Opus for complex reasoning |
| `haiku` | Fast, efficient for simple tasks |
| `opusplan` | Opus for planning, Sonnet for execution |

---

## Agent Routing Guidelines

### Intent-Based Document Selection

**Q&A / How-To Questions**:
- Getting started → `getting-started`
- Hooks, skills, plugins → `build`
- Enterprise, cloud → `deployment`
- Security, costs → `administration`
- Settings, CLAUDE.md → `configuration`
- CLI flags, commands → `reference`

**Development Tasks**:
- Create hook → `build`, `reference`
- Create skill → `build`, `reference`
- Create command → `build`, `reference`
- Configure permissions → `configuration`, `reference`
- Setup MCP → `build`

**Arkadian Development**:
- Understanding hooks → `build` (hooks section), `reference` (hooks API)
- Creating agents → `build` (agents section)
- Skills pattern → `build` (skills section)
- Settings template → `configuration`, `reference`

### Multi-Document Queries

When a question spans multiple topics, load context from all relevant documents:

**Example**: "How do I create a hook that validates tool inputs?"
- Load: `build` (hooks concept), `reference` (hooks API), `configuration` (permissions)

**Example**: "Set up Claude Code for enterprise with monitoring"
- Load: `deployment` (enterprise setup), `administration` (monitoring), `configuration` (settings)

---

## Versioning & Updates

This index should be updated when:
- Claude Code releases new features
- Documentation structure changes
- New configuration options are added
- API changes occur

**Source URL**: https://code.claude.com/docs/en/overview
**Last Updated**: 2025-12-11
**Version**: 1.0.0
**Maintained By**: Arkadian Documentation Team
