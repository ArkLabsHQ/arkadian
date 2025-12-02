# Claude Code Configuration Guide

**Comprehensive Reference for Configuring Claude Code**

*Last Updated: 2025-11-27*

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Configuration Files](#configuration-files)
4. [CLAUDE.md Memory Files](#claudemd-memory-files)
5. [Settings (settings.json)](#settings-settingsjson)
6. [Hooks](#hooks)
7. [Slash Commands](#slash-commands)
8. [Skills](#skills)
9. [Subagents](#subagents)
10. [MCP Servers](#mcp-servers)
11. [Permissions](#permissions)
12. [Environment Variables](#environment-variables)
13. [CLI Reference](#cli-reference)
14. [Available Tools](#available-tools)
15. [Best Practices](#best-practices)

---

## Overview

Claude Code is Anthropic's official agentic coding tool that operates within your terminal. It functions as a developer assistant that can:

- **Develop features**: Describe functionality in natural language, Claude creates plans and code
- **Debug**: Analyze codebases, identify root causes, implement fixes
- **Navigate codebases**: Answer questions about code organization
- **Automate tasks**: Linting, merge conflicts, release notes, CI/CD

**Key Architectural Strengths:**
- Terminal-native (integrates into existing workflows)
- Direct action capability (edit files, execute commands, create commits)
- Unix composability (supports piping and scripting)
- Enterprise-ready (Claude API, AWS Bedrock, GCP Vertex)

---

## Installation

```bash
# macOS/Linux
curl -fsSL https://claude.ai/install.sh | sh

# Homebrew
brew install claude-code

# Windows PowerShell
irm https://claude.ai/install.ps1 | iex

# NPM (requires Node.js 18+)
npm install -g @anthropic-ai/claude-code
```

---

## Configuration Files

### File Hierarchy (Precedence: Highest to Lowest)

| Priority | File | Purpose |
|----------|------|---------|
| 1 | `managed-settings.json` | Enterprise policies (cannot override) |
| 2 | CLI arguments | Temporary session overrides |
| 3 | `.claude/settings.local.json` | Personal project settings (gitignored) |
| 4 | `.claude/settings.json` | Team-shared project settings |
| 5 | `~/.claude/settings.json` | User global defaults |

### File Locations

| Type | Path |
|------|------|
| User Settings | `~/.claude/settings.json` |
| User Memory | `~/.claude/CLAUDE.md` |
| User Agents | `~/.claude/agents/` |
| User Commands | `~/.claude/commands/` |
| User Skills | `~/.claude/skills/` |
| Project Settings | `.claude/settings.json` |
| Project Memory | `./CLAUDE.md` or `.claude/CLAUDE.md` |
| Project Agents | `.claude/agents/` |
| Project Commands | `.claude/commands/` |

### Enterprise Policy Locations

| OS | Path |
|----|------|
| macOS | `/Library/Application Support/ClaudeCode/managed-settings.json` |
| Linux/WSL | `/etc/claude-code/managed-settings.json` |
| Windows | `C:\ProgramData\ClaudeCode\managed-settings.json` |

---

## CLAUDE.md Memory Files

CLAUDE.md files are automatically loaded into Claude's context when the tool launches. They establish a foundation of remembered instructions.

### Memory Hierarchy

| Level | Location | Scope |
|-------|----------|-------|
| Enterprise | System directories | Organization-wide |
| Project | `./CLAUDE.md` or `.claude/CLAUDE.md` | Team-shared |
| User | `~/.claude/CLAUDE.md` | Personal global |
| Local | `./CLAUDE.local.md` | Personal project (deprecated) |

### Key Features

**File Imports**: Use `@path/to/import` syntax to include other files
```markdown
# CLAUDE.md
@./docs/coding-standards.md
@./docs/architecture.md
```

**Recursive Imports**: Up to 5 levels deep

**Quick Addition**: Use `#` shortcut at prompt start to add memories

**Commands**:
- `/memory` - Edit files in system editor
- `/init` - Bootstrap new CLAUDE.md

### Best Practices

- Be specific: "Use 2-space indentation" > "Format code nicely"
- Use markdown structure with headings and bullets
- Include frequently-used commands
- Document project-specific patterns
- Periodically review and update

### Example CLAUDE.md

```markdown
# Project Instructions

## Code Style
- Use TypeScript strict mode
- 2-space indentation
- Single quotes for strings
- No semicolons

## Architecture
- Hexagonal architecture pattern
- Domain layer has no external dependencies
- All database access through repositories

## Commands
- `npm run dev` - Start development server
- `npm test` - Run tests
- `npm run build` - Production build

## Important Files
- `src/domain/` - Business logic
- `src/infrastructure/` - External integrations
- `src/api/` - HTTP handlers
```

---

## Settings (settings.json)

### Core Options

```json
{
  "model": "claude-sonnet-4-5-20250929",
  "env": {
    "MY_VAR": "value",
    "ARKADIAN_DIR": "/path/to/arkadian"
  },
  "cleanupPeriodDays": 30,
  "includeCoAuthoredBy": true,
  "outputStyle": "Explanatory",
  "disableAllHooks": false
}
```

| Setting | Purpose | Example |
|---------|---------|---------|
| `model` | Override default model | `"claude-sonnet-4-5-20250929"` |
| `apiKeyHelper` | Script for auth token | `/bin/generate_api_key.sh` |
| `env` | Environment variables | `{"FOO": "bar"}` |
| `cleanupPeriodDays` | Transcript retention | `30` |
| `includeCoAuthoredBy` | Add Claude attribution to commits | `true` |
| `statusLine` | Custom status display | `{"type": "command", "command": "..."}` |
| `outputStyle` | Response style | `"Explanatory"` |
| `disableAllHooks` | Disable all hooks | `false` |

### Permissions Structure

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run lint)",
      "Read(~/.zshrc)"
    ],
    "ask": [
      "Bash(git push:*)"
    ],
    "deny": [
      "Bash(curl:*)",
      "Read(./.env)"
    ],
    "additionalDirectories": ["/path/to/other/project"],
    "defaultMode": "acceptEdits"
  }
}
```

| Key | Purpose |
|-----|---------|
| `allow` | Auto-approve specific tools |
| `ask` | Prompt for confirmation |
| `deny` | Block tool access |
| `additionalDirectories` | Grant filesystem access beyond project |
| `defaultMode` | Initial permission mode |

### Sandbox Configuration (macOS/Linux only)

```json
{
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true,
    "excludedCommands": ["git", "docker"],
    "network": {
      "allowUnixSockets": ["~/.ssh/agent-socket"],
      "allowLocalBinding": true
    }
  }
}
```

---

## Hooks

Hooks are user-defined commands that execute at various points in Claude Code's lifecycle.

### Available Hook Events

| Event | When Triggered |
|-------|----------------|
| `SessionStart` | Session initialization or resumption |
| `SessionEnd` | Session terminates |
| `UserPromptSubmit` | Before Claude processes user prompt |
| `PreToolUse` | After tool params created, before execution |
| `PostToolUse` | After tool completes successfully |
| `PermissionRequest` | When permission dialog appears |
| `PreCompact` | Before context compression |
| `Stop` | Main agent finishes responding |
| `SubagentStop` | Subagent completes |
| `Notification` | Claude Code sends notification |

### Configuration Format

```json
{
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "your-command-here"
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "validate-write.sh"
          }
        ]
      }
    ]
  }
}
```

### Matcher Patterns

- **Exact match**: `Write` matches only Write tool
- **Regex**: `Edit|Write` or `Notebook.*`
- **Wildcard**: `*` or empty string matches all tools
- **MCP tools**: `mcp__<server>__<tool>` pattern

### Hook Input (JSON via stdin)

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/current/directory",
  "permission_mode": "normal",
  "hook_event_name": "PreToolUse",
  "tool_name": "Write",
  "tool_input": { ... }
}
```

### Hook Output (Exit Codes)

| Exit Code | Meaning |
|-----------|---------|
| 0 | Success (stdout shown for UserPromptSubmit/SessionStart adds context) |
| 2 | Blocking error (tool call blocked, stderr shown) |
| Other | Non-blocking error (stderr shown in verbose mode) |

### JSON Output (Exit 0)

```json
{
  "continue": true,
  "stopReason": "string",
  "suppressOutput": true,
  "systemMessage": "Context to add"
}
```

### Environment Variables in Hooks

- `$CLAUDE_PROJECT_DIR` - Project root directory
- `$CLAUDE_CODE_REMOTE` - "true" if remote environment
- `$CLAUDE_ENV_FILE` - Persist variables across bash commands

### Security Best Practices

- Validate and sanitize all inputs
- Quote shell variables: `"$VAR"` not `$VAR`
- Block path traversal attacks (check for `..`)
- Use absolute paths
- Skip sensitive files (`.env`, `.git/`, credentials)
- Set appropriate timeouts

---

## Slash Commands

Slash commands are custom prompts invoked with `/command-name`.

### File Locations

| Type | Location | Indicator |
|------|----------|-----------|
| Project | `.claude/commands/` | "(project)" |
| User | `~/.claude/commands/` | "(user)" |

### Command Naming

- Filename without `.md` = command name
- `optimize.md` → `/optimize`
- Subdirectories for namespacing: `.claude/commands/frontend/component.md` → `/component (project:frontend)`

### Argument Handling

**All arguments:**
```markdown
Query: $ARGUMENTS
```

**Positional arguments:**
```markdown
PR Number: $1
Priority: $2
Reviewer: $3
```

### Frontmatter Configuration

```yaml
---
description: Brief description for /help
argument-hint: <pr-number> [priority]
allowed-tools: Read, Grep, Bash(git log:*)
model: sonnet
disable-model-invocation: false
---
```

| Field | Purpose |
|-------|---------|
| `description` | Shown in `/help` |
| `argument-hint` | Autocomplete hint |
| `allowed-tools` | Restrict available tools |
| `model` | Specific model for command |
| `disable-model-invocation` | Prevent SlashCommand tool from invoking |

### Bash Execution in Commands

Prefix with `!` to execute bash before command runs:

```markdown
---
allowed-tools: Bash(git status:*), Bash(git log:*)
---

- Current status: !`git status`
- Recent commits: !`git log --oneline -10`
```

### File References

Use `@` prefix to include file contents:
```markdown
Review the implementation in @src/utils/helpers.js
```

### Example Command: Review PR

```markdown
---
description: Review a pull request
argument-hint: <pr-number>
allowed-tools: Read, Grep, Bash(git:*)
---

# Review PR #$1

## Get PR Info
!`gh pr view $1 --json title,body,files`

## Review Checklist
- [ ] Code style consistent
- [ ] No security issues
- [ ] Tests included
- [ ] Documentation updated
```

---

## Skills

Skills are modular capabilities that extend Claude's functionality. Unlike slash commands (user-invoked), skills are **model-invoked**—Claude autonomously decides when to use them based on context.

### Key Difference: Skills vs. Slash Commands

| Aspect | Slash Commands | Skills |
|--------|----------------|--------|
| **Invocation** | User types `/command` | Claude decides automatically |
| **Structure** | Single `.md` file | Folder with multiple files |
| **Discovery** | Listed in `/help` | Based on description match |
| **Use Case** | Quick, repeated tasks | Complex workflows |

### File Locations

| Type | Location | Scope |
|------|----------|-------|
| Personal | `~/.claude/skills/` | All projects |
| Project | `.claude/skills/` | Current project (git-tracked) |
| Plugin | Plugin's `agents/` | Via installed plugins |

### Skill Structure

```
skill-name/
├── SKILL.md          # Required: main instructions
├── supporting-docs.md # Optional: additional context
├── scripts/          # Optional: helper scripts
└── templates/        # Optional: file templates
```

### SKILL.md Format

```yaml
---
name: my-skill
description: What it does AND when to use it. Include trigger words.
allowed-tools: Read, Grep, Glob
---

# My Skill

## Instructions
Step-by-step guidance for Claude

## Examples
Concrete usage examples
```

### Frontmatter Fields

| Field | Required | Purpose |
|-------|----------|---------|
| `name` | Yes | Lowercase letters, numbers, hyphens (max 64 chars) |
| `description` | Yes | When to use + what it does (max 1024 chars) |
| `allowed-tools` | No | Restrict available tools |

### Example: PDF Processing Skill

```
pdf-processor/
├── SKILL.md
├── FORMS.md
├── REFERENCE.md
└── scripts/
    ├── fill_form.py
    └── validate.py
```

**SKILL.md:**
```yaml
---
name: pdf-processor
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or mentions of PDFs, forms, or document extraction.
allowed-tools: Read, Bash, Write
---

# PDF Processing Skill

## Capabilities
- Extract text from PDFs
- Fill PDF forms
- Merge multiple PDFs
- Validate form data

## Instructions
1. Identify the PDF operation needed
2. Use appropriate script from scripts/
3. Validate output before returning

## Dependencies
- poppler-utils (pdftotext)
- PyPDF2 (pip install pypdf2)
```

### Example: Commit Message Skill

```yaml
---
name: commit-generator
description: Generate conventional commit messages from git diffs. Use when user asks for commit message or after code changes.
allowed-tools: Bash(git diff:*), Bash(git status:*)
---

# Commit Message Generator

## Format
Use conventional commits: `type(scope): description`

## Types
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Adding tests
- chore: Maintenance

## Process
1. Run `git diff --cached` to see staged changes
2. Analyze the nature of changes
3. Generate appropriate commit message
4. Present to user for approval
```

### Best Practices

1. **Specific descriptions**: "Extract text from PDFs" > "Helps with documents"
   - Include trigger words users would mention
   - State both WHAT it does and WHEN to use it

2. **Single responsibility**: One skill = one capability
   - Split broad categories into separate skills

3. **Clear instructions**: Step-by-step with examples
   - Show typical usage patterns

4. **List dependencies**: Document required packages
   - Claude will request permission to install

5. **Version control**: Track changes for team awareness

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Skill not activating | Make description more specific with trigger terms |
| YAML errors | Check `---` delimiters, use spaces not tabs |
| Path issues | Use forward slashes, reference `$CLAUDE_PROJECT_DIR` |
| Conflicting skills | Use distinct terminology in descriptions |

### Skill vs. Subagent Decision

| Use Skill When | Use Subagent When |
|----------------|-------------------|
| Need bundled resources (scripts, templates) | Need separate context window |
| Auto-discovery based on context | Need specific tool restrictions |
| Reusable across multiple prompts | Complex multi-step workflows |
| Team standardization | Need different model (Haiku/Opus) |

---

## Subagents

Subagents are specialized AI assistants that operate with their own context window.

### File Locations

| Type | Location | Scope |
|------|----------|-------|
| Project | `.claude/agents/` | Current project |
| User | `~/.claude/agents/` | All projects |

### YAML Frontmatter

```yaml
---
name: code-reviewer
description: Expert code review specialist. Use after writing code.
tools: Read, Grep, Glob, Bash
model: inherit
permissionMode: default
skills: skill1, skill2
---
```

| Field | Purpose |
|-------|---------|
| `name` | Required: lowercase with hyphens |
| `description` | Required: when to invoke |
| `tools` | Optional: comma-separated (inherits all if omitted) |
| `model` | Optional: sonnet/opus/haiku/inherit |
| `permissionMode` | Optional: default/acceptEdits/bypassPermissions/plan |
| `skills` | Optional: auto-load skills |

### Built-in Subagents

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
| `general-purpose` | Sonnet | All | Multi-step research and modifications |
| `Explore` | Haiku | Glob, Grep, Read, Bash (read-only) | Fast codebase searching |
| `Plan` | Sonnet | Read, Glob, Grep, Bash | Gather context for planning |

### Example: Code Reviewer

```markdown
---
name: code-reviewer
description: Expert code review specialist. Use immediately after writing code.
tools: Read, Grep, Glob, Bash
model: inherit
---

You are a senior code reviewer ensuring quality and security standards.

## Review Checklist
- Code readability and naming
- No code duplication
- Proper error handling
- No exposed secrets
- Input validation
- Test coverage
- Performance considerations

## Output Format
Organize feedback by priority:
1. **Critical** - Must fix
2. **Warnings** - Should fix
3. **Suggestions** - Nice to have
```

### Invocation

**Explicit:**
```
Use the code-reviewer subagent to examine these changes
```

**Automatic:** Claude invokes based on task description matching subagent description

---

## MCP Servers

MCP (Model Context Protocol) enables Claude to access external tools and data sources.

### Adding MCP Servers

```bash
# HTTP (recommended)
claude mcp add --transport http notion https://mcp.notion.com/mcp

# Stdio (local)
claude mcp add --transport stdio airtable --env AIRTABLE_API_KEY=KEY -- npx airtable-mcp-server
```

### Configuration Scopes

| Scope | Storage | Use Case |
|-------|---------|----------|
| Local | `.mcp.json` (gitignored) | Personal, private credentials |
| Project | `.mcp.json` (committed) | Team-shared |
| User | `~/.claude/mcp.json` | Available to all projects |

### .mcp.json Format

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {}
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

### Management Commands

```bash
claude mcp list              # List all servers
claude mcp get <name>        # Server details
claude mcp remove <name>     # Remove server
/mcp                         # Check status in Claude Code
```

### Settings for MCP

```json
{
  "enableAllProjectMcpServers": true,
  "enabledMcpjsonServers": ["memory", "github"],
  "disabledMcpjsonServers": ["filesystem"]
}
```

### Security Considerations

- Trust MCP servers before installation
- Servers fetching untrusted content risk prompt injection
- Project-scoped servers require approval
- Reset approvals: `claude mcp reset-project-choices`

---

## Permissions

### Permission Modes

| Mode | Description |
|------|-------------|
| `default` | Ask for most operations |
| `acceptEdits` | Auto-approve file edits |
| `bypassPermissions` | Skip all permission checks |
| `plan` | Read-only planning mode |

### Tool Permissions

```json
{
  "permissions": {
    "allow": [
      "Read(*)",
      "Bash(npm run:*)",
      "Bash(git status)"
    ],
    "deny": [
      "Bash(rm -rf:*)",
      "Read(.env)"
    ]
  }
}
```

### Sensitive File Protection

```json
{
  "permissions": {
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Read(./config/credentials.json)"
    ]
  }
}
```

---

## Environment Variables

### Authentication

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | API key for Claude SDK |
| `ANTHROPIC_AUTH_TOKEN` | Custom Authorization header |
| `AWS_BEARER_TOKEN_BEDROCK` | Bedrock API key |

### Model Configuration

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_MODEL` | Model setting name |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Sonnet model override |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Haiku model override |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Opus model override |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | Max output tokens |
| `MAX_THINKING_TOKENS` | Extended thinking budget |

### Bash Execution

| Variable | Purpose | Default |
|----------|---------|---------|
| `BASH_DEFAULT_TIMEOUT_MS` | Default timeout | 120000 |
| `BASH_MAX_TIMEOUT_MS` | Maximum timeout | 600000 |
| `BASH_MAX_OUTPUT_LENGTH` | Max output chars | 30000 |

### MCP & Tools

| Variable | Purpose | Default |
|----------|---------|---------|
| `MCP_TIMEOUT` | Server startup timeout | 10000 |
| `MCP_TOOL_TIMEOUT` | Tool execution timeout | 60000 |
| `MAX_MCP_OUTPUT_TOKENS` | Max tokens in MCP responses | 25000 |

### Cloud Providers

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_USE_BEDROCK` | Enable AWS Bedrock |
| `CLAUDE_CODE_USE_VERTEX` | Enable Google Vertex |
| `CLAUDE_CODE_USE_FOUNDRY` | Enable Microsoft Foundry |

### Telemetry & Privacy

| Variable | Purpose |
|----------|---------|
| `DISABLE_TELEMETRY` | Opt out of telemetry |
| `DISABLE_ERROR_REPORTING` | Opt out of error reporting |
| `DISABLE_AUTOUPDATER` | Disable auto-updates |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | Disable all non-essential network |

---

## CLI Reference

### Basic Commands

```bash
claude                        # Start interactive mode
claude "initial prompt"       # Start with prompt
claude -p "query"             # Print mode (execute and exit)
claude -c                     # Continue last session
claude -r "session-id"        # Resume specific session
```

### Essential Flags

| Flag | Purpose |
|------|---------|
| `-p, --print` | Execute query and exit |
| `-c, --continue` | Load most recent conversation |
| `-r, --resume` | Resume specific session |
| `--verbose` | Enable verbose logging |
| `--max-turns` | Limit agentic turns |
| `--model` | Specify model |

### System Prompt Options

| Flag | Purpose |
|------|---------|
| `--system-prompt` | Replace default instructions |
| `--system-prompt-file` | Load prompt from file |
| `--append-system-prompt` | Add to default (recommended) |

### Tool Control

```bash
claude --allowedTools "Read,Grep,Glob" -p "Search for TODO"
claude --disallowedTools "Bash,Write" -p "Review code"
```

### Output Formats

```bash
claude --output-format text -p "Query"
claude --output-format json -p "Query"
claude --output-format stream-json -p "Query"
```

### Permission Modes

```bash
claude --permission-mode acceptEdits
claude --dangerously-skip-permissions
```

### Piping

```bash
cat file.py | claude -p "Review this code"
git diff | claude -p "Summarize changes"
tail -f app.log | claude -p "Alert on errors"
```

---

## Available Tools

| Tool | Purpose | Permission Required |
|------|---------|:------------------:|
| **Read** | View file contents | No |
| **Write** | Create/overwrite files | Yes |
| **Edit** | Targeted file modifications | Yes |
| **Bash** | Execute shell commands | Yes |
| **Glob** | Pattern-based file discovery | No |
| **Grep** | Search file contents | No |
| **WebFetch** | Retrieve URL content | Yes |
| **WebSearch** | Web searches | Yes |
| **Task** | Delegate to subagent | No |
| **TodoWrite** | Manage task lists | No |
| **AskUserQuestion** | Prompt user | No |
| **NotebookEdit** | Edit Jupyter notebooks | Yes |
| **Skill** | Execute skill | Yes |
| **SlashCommand** | Run slash command | Yes |

---

## Best Practices

### Project Setup

1. Create `CLAUDE.md` in project root with:
   - Code style guidelines
   - Architecture patterns
   - Common commands
   - Important file locations

2. Create `.claude/settings.json` for team with:
   - Shared permissions
   - Environment variables
   - MCP servers

3. Use `.claude/settings.local.json` for personal:
   - API keys
   - Personal preferences
   - Gitignored by default

### Security

1. **Deny sensitive files:**
   ```json
   {"permissions": {"deny": ["Read(.env)", "Read(./secrets/*)"]}}
   ```

2. **Use sandbox** when available (macOS/Linux)

3. **Review MCP servers** before installation

4. **Don't commit credentials** - use env vars

### Performance

1. Use specific CLAUDE.md instructions
2. Keep context focused (don't load unnecessary files)
3. Use subagents for specialized tasks
4. Use Haiku for simple/fast operations

### Workflow

1. Create slash commands for repeated tasks
2. Create subagents for specialized roles
3. Use hooks for automation (linting, validation)
4. Leverage MCP for external integrations

---

## Quick Reference

### Minimum Configuration (settings.json)

```json
{
  "env": {
    "PROJECT_ROOT": "/path/to/project"
  }
}
```

### Recommended Configuration

```json
{
  "env": {
    "PROJECT_ROOT": "/path/to/project",
    "NODE_ENV": "development"
  },
  "permissions": {
    "allow": [
      "Read(*)",
      "Bash(npm run:*)",
      "Bash(git:*)"
    ],
    "deny": [
      "Read(.env)",
      "Bash(rm -rf:*)"
    ]
  }
}
```

### Full Configuration Example

```json
{
  "model": "claude-sonnet-4-5-20250929",
  "env": {
    "ARKADIAN_DIR": "/Users/me/code/arkadian",
    "ARKD_REPO": "/Users/me/code/ark"
  },
  "permissions": {
    "allow": [
      "Read(*)",
      "Bash(npm:*)",
      "Bash(git:*)"
    ],
    "deny": [
      "Read(.env)",
      "Bash(rm -rf:*)"
    ]
  },
  "hooks": {
    "PreCompact": [
      {
        "type": "command",
        "command": "echo 'Context compression triggered'"
      }
    ]
  }
}
```

---

## Implications for Arkadian

Based on this research, Arkadian's hook architecture should be simplified:

### What Claude Code Does Automatically

1. **Loads CLAUDE.md** - No hook needed
2. **Resolves `${VAR}` in settings.json env** - No hook needed

### What Hooks Are Actually For

1. **PreToolUse/PostToolUse** - Validate/modify tool calls
2. **PreCompact** - Warn about context compression
3. **SessionStart/SessionEnd** - Setup/cleanup (but not for loading CLAUDE.md)
4. **UserPromptSubmit** - Pre-process prompts (but not for injecting static instructions)

### Arkadian Simplified Architecture

```
~/.claude/settings.json
├── env: { ARKADIAN_DIR: "...", ARKD_REPO: "...", ... }
└── (no hooks needed for core functionality)

/path/to/arkadian/CLAUDE.md
└── Contains all orchestrator instructions (auto-loaded)
```

**Result**: Zero required hooks. All Arkadian hooks are optional UX enhancements.

---

*Sources: code.claude.com/docs/en/*
