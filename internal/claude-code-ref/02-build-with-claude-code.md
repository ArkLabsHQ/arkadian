# Claude Code - Build with Claude Code

> Source: https://code.claude.com/docs/en/sub-agents

---

## Subagents

### Overview

Subagents are specialized AI assistants that Claude Code can delegate tasks to. Each operates with its own context window, custom system prompt, and configurable tool access.

### Key Benefits

- **Context preservation**: Subagents maintain isolated contexts
- **Specialized expertise**: Fine-tuned instructions for specific domains
- **Reusability**: Once created, subagents work across projects
- **Flexible permissions**: Granular tool access control per subagent

### Quick Start

1. Run `/agents` command
2. Select 'Create New Agent'
3. Choose project or user-level scope
4. Define subagent with Claude assistance or custom configuration
5. Select tools or inherit all available tools
6. Save and use

### File Locations

| Type | Location | Scope | Priority |
|------|----------|-------|----------|
| Project | `.claude/agents/` | Current project | Highest |
| User | `~/.claude/agents/` | All projects | Lower |
| CLI-defined | Command-line flag | Session-specific | Medium |

### File Format

```yaml
---
name: agent-name
description: When to invoke this agent
tools: tool1, tool2, tool3
model: sonnet
permissionMode: default
skills: skill1, skill2
---

Your system prompt here. Define role, capabilities,
constraints, and problem-solving approach.
```

### Configuration Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Lowercase, hyphenated identifier |
| `description` | Yes | Natural language purpose description |
| `tools` | No | Comma-separated list; inherits all if omitted |
| `model` | No | Model alias or 'inherit' |
| `permissionMode` | No | default, acceptEdits, bypassPermissions, plan, ignore |
| `skills` | No | Comma-separated skill names to auto-load |

### Built-in Subagents

- **General-purpose Subagent**: Model Sonnet, all tools, complex multi-step tasks
- **Plan Subagent**: Model Sonnet, Read/Glob/Grep/Bash, research and context gathering
- **Explore Subagent**: Model Haiku, read-only mode, fast codebase searching

### Resumable Subagents

Subagents can resume previous conversations:
- Each execution receives unique `agentId`
- Transcripts stored as `agent-{agentId}.jsonl`
- Resume with `resume` parameter

---

## Plugins

### Overview
Plugins extend Claude Code with custom functionality including commands, agents, hooks, Skills, and MCP servers.

### Creating Your First Plugin

**Step 1: Set up structure**
```bash
mkdir test-marketplace
cd test-marketplace
mkdir my-first-plugin
cd my-first-plugin
```

**Step 2: Create plugin manifest** (`.claude-plugin/plugin.json`)
```json
{
  "name": "my-first-plugin",
  "description": "A simple greeting plugin",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  }
}
```

**Step 3: Add custom command** (`commands/hello.md`)
```markdown
---
description: Greet the user with a personalized message
---

# Hello Command

Greet the user warmly and ask how you can help them today.
```

### Plugin Structure

```
plugin-name/
├── .claude-plugin/plugin.json
├── commands/
├── agents/
├── skills/
└── hooks/
```

### Installing and Managing Plugins

```bash
/plugin marketplace add your-org/claude-plugins
/plugin install formatter@your-org
/plugin enable plugin-name@marketplace-name
/plugin uninstall plugin-name@marketplace-name
```

---

## Agent Skills

### Overview

Agent Skills extend Claude's capabilities through modular, organized folders. Unlike slash commands (user-invoked), skills are model-invoked—Claude autonomously decides when to use them.

### Creating Skills

A basic skill requires a `SKILL.md` file with YAML frontmatter:

```yaml
---
name: your-skill-name
description: Brief description of what this Skill does and when to use it
---

# Your Skill Name

## Instructions
Provide clear, step-by-step guidance for Claude.
```

**Field Requirements:**
- `name`: lowercase letters, numbers, hyphens only (max 64 characters)
- `description`: explains what the skill does and when to use it (max 1024 characters)

### Supporting Files

```
my-skill/
├── SKILL.md (required)
├── reference.md
├── examples.md
├── scripts/
└── templates/
```

### Tool Restrictions

```yaml
---
name: safe-file-reader
description: Read files without making changes
allowed-tools: Read, Grep, Glob
---
```

### Management

- **View Available Skills:** Ask Claude: "What Skills are available?"
- **Update a Skill:** Edit SKILL.md; changes take effect on restart
- **Share with Team:** Store in `.claude/skills/`, commit to git

---

## Output Styles

### Built-in Output Styles

1. **Default** - Standard system prompt for software engineering
2. **Explanatory** - Educational insights between coding tasks
3. **Learning** - Collaborative mode with `TODO(human)` markers

### Changing Your Output Style

```bash
/output-style              # Interactive menu
/output-style explanatory  # Direct selection
```

### Creating Custom Output Styles

```markdown
---
name: My Custom Style
description: Brief description for UI display
keep-coding-instructions: false
---

# Custom Instructions

Your custom style instructions here...
```

Save files at `~/.claude/output-styles` (user level) or `.claude/output-styles` (project level).

---

## Hooks

### Overview

Hooks are user-defined shell commands that execute at specific points in Claude Code's lifecycle.

**Key Use Cases:**
- Notifications for input requests
- Automatic code formatting
- Compliance logging
- Automated codebase convention feedback
- Production file protection

### Hook Events

- **PreToolUse**: Before tool calls (can block them)
- **PermissionRequest**: When permission dialogs appear
- **PostToolUse**: After tool completion
- **UserPromptSubmit**: Before Claude processes user input
- **Notification**: When notifications are sent
- **Stop**: When Claude finishes responding
- **SubagentStop**: When subagent tasks complete
- **PreCompact**: Before compact operations
- **SessionStart**: At session beginning/resumption
- **SessionEnd**: At session termination

### Quick Start: Logging Bash Commands

1. Open hooks configuration: Run `/hooks` and select `PreToolUse`
2. Add matcher: Select `+ Add new matcher…`, enter `Bash`
3. Add hook command:
```bash
jq -r '"\(.tool_input.command) - \(.tool_input.description // "No description")"' >> ~/.claude/bash-command-log.txt
```
4. Save: Choose "User settings" for all-project application

### Security Considerations

Hooks execute automatically with your environment's credentials. Always review implementations before registration.

---

## Headless Mode

### Overview

Headless mode allows running Claude Code programmatically without interactive UI.

### Basic Usage

```bash
claude -p "Stage my changes and write commits" \
  --allowedTools "Bash,Read" \
  --permission-mode acceptEdits
```

### Configuration Options

| Flag | Description |
|------|-------------|
| `--print`, `-p` | Non-interactive mode |
| `--output-format` | text, json, stream-json |
| `--resume`, `-r` | Resume by session ID |
| `--continue`, `-c` | Continue most recent |
| `--verbose` | Enable verbose logging |
| `--append-system-prompt` | Append to system prompt |
| `--allowedTools` | Allowed tools list |
| `--disallowedTools` | Denied tools list |
| `--mcp-config` | Load MCP servers from JSON |

### Multi-turn Conversations

```bash
# Continue most recent
claude --continue "Now refactor for better performance"

# Resume specific session
claude --resume 550e8400-e29b-41d4-a716-446655440000 "Update the tests"
```

### Output Formats

**JSON Output:**
```bash
claude -p "How does the data layer work?" --output-format json
```

**Streaming JSON:**
```bash
claude -p "Build an application" --output-format stream-json
```

### Agent Integration Examples

**SRE Incident Response:**
```bash
claude -p "Incident: $incident_description" \
  --append-system-prompt "You are an SRE expert." \
  --output-format json \
  --allowedTools "Bash,Read,WebSearch,mcp__datadog"
```

**Automated Security Review:**
```bash
gh pr diff "$pr_number" | claude -p \
  --append-system-prompt "Review this PR for vulnerabilities." \
  --output-format json \
  --allowedTools "Read,Grep,WebSearch"
```

---

## Model Context Protocol (MCP)

### Overview

Claude Code integrates with hundreds of external tools through MCP, an open standard for AI-tool integrations.

### Installation Methods

**HTTP Servers (Recommended):**
```bash
claude mcp add --transport http <name> <url>
```

**SSE Servers (Deprecated):**
```bash
claude mcp add --transport sse <name> <url>
```

**Stdio Servers (Local):**
```bash
claude mcp add --transport stdio <name> -- <command>
```

### Management Commands

```bash
claude mcp list              # View all servers
claude mcp get <name>        # Details for specific server
claude mcp remove <name>     # Delete configuration
/mcp                        # Check status in Claude Code
```

### Configuration Scopes

| Scope | Location | Use Case |
|-------|----------|----------|
| Local | `~/.claude.json` | Personal, project-specific |
| Project | `.mcp.json` | Team-shared |
| User | `~/.claude.json` | Cross-project personal |

### OAuth Authentication

1. Add the server
2. Authenticate via `/mcp`
3. Follow browser login flow

### Using Claude Code as MCP Server

```bash
claude mcp serve
```

### Resource and Prompt Features

- Type `@` to list available MCP resources
- Type `/` to discover MCP prompts
- Format: `/mcp__servername__promptname`

---

## Claude Agent SDK Migration Guide

### Package Name Changes

| Component | Previous | Current |
|-----------|----------|---------|
| TypeScript/JavaScript | `@anthropic-ai/claude-code` | `@anthropic-ai/claude-agent-sdk` |
| Python | `claude-code-sdk` | `claude-agent-sdk` |

### TypeScript/JavaScript Migration

```bash
npm uninstall @anthropic-ai/claude-code
npm install @anthropic-ai/claude-agent-sdk
```

### Python Migration

```bash
pip uninstall claude-code-sdk
pip install claude-agent-sdk
```

Update imports from `claude_code_sdk` to `claude_agent_sdk`.

### Breaking Changes

**Type Renaming:** `ClaudeCodeOptions` → `ClaudeAgentOptions`

**System Prompt Default:** SDK no longer applies Claude Code's default system prompt:
```typescript
const result = query({
  prompt: "Hello",
  options: {
    systemPrompt: { type: "preset", preset: "claude_code" }
  }
});
```

**Settings Sources:** No longer loaded automatically:
```typescript
const result = query({
  prompt: "Hello",
  options: {
    settingSources: ["user", "project", "local"]
  }
});
```

---

## Troubleshooting

### Windows WSL Installation

**OS/Platform Detection Issues:**
```bash
npm config set os linux
npm install -g @anthropic-ai/claude-code --force --no-os-check
```

**Node Not Found:** Verify with `which npm` and `which node`—output should reference Linux paths.

### Linux and macOS Permission Issues

**Native Installation (Beta):**
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

### Authentication Issues

1. Run `/logout`
2. Close Claude Code
3. Restart with `claude`

For persistent issues: `rm -rf ~/.config/claude-code/auth.json`

### Configuration File Locations

| File | Purpose |
|------|---------|
| `~/.claude/settings.json` | User settings |
| `.claude/settings.json` | Project settings |
| `.claude/settings.local.json` | Local project settings |
| `~/.claude.json` | Global state |
| `.mcp.json` | Project MCP servers |

### Resetting Configuration

```bash
rm ~/.claude.json
rm -rf ~/.claude/
rm -rf .claude/
rm .mcp.json
```

### High CPU/Memory Usage

- Use `/compact` regularly
- Close and restart between major tasks
- Add large build directories to `.gitignore`

### Search Issues

Install system `ripgrep`:
```bash
# macOS
brew install ripgrep

# Ubuntu/Debian
sudo apt install ripgrep
```

Set `USE_BUILTIN_RIPGREP=0` in environment variables.
