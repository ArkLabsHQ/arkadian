# Claude Code - Getting Started

> Source: https://code.claude.com/docs/en/overview

---

## Overview

### Get Started in 30 Seconds

**Prerequisites:**
- A Claude.ai (recommended) or Claude Console account

**Installation options:**

macOS/Linux via curl:
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

macOS via Homebrew:
```bash
brew install --cask claude-code
```

Windows via PowerShell:
```powershell
irm https://claude.ai/install.ps1 | iex
```

NPM (requires Node.js 18+):
```bash
npm install -g @anthropic-ai/claude-code
```

**Start using:**
```bash
cd your-project
claude
```

Login occurs on first use. The tool auto-updates automatically.

### What Claude Code Does for You

- **Build features from descriptions**: Provide plain English descriptions of desired functionality, and Claude creates a plan, writes code, and validates it works
- **Debug and fix issues**: Submit bug descriptions or error messages; Claude analyzes the codebase and implements fixes
- **Navigate any codebase**: Ask questions about team codebases and receive thoughtful answers
- **Automate tedious tasks**: Address lint issues, resolve merge conflicts, write release notes

### Why Developers Love Claude Code

- **Works in your terminal**: Integrates directly where developers already work
- **Takes action**: Can directly edit files, execute commands, create commits
- **Unix philosophy**: Composable and scriptable
- **Enterprise-ready**: Claude API usage available, deployable on AWS or GCP

---

## Quickstart Guide

### Prerequisites
- Terminal or command prompt access
- Existing code project
- Claude.ai account (recommended) or Claude Console account

### Authentication
Launch an interactive session with:
```bash
claude
```

When prompted, use `/login` to authenticate via Claude.ai or Claude Console.

### Core Features

**Code Analysis:**
Request codebase understanding through natural language prompts:
- Project functionality assessment
- Technology stack identification
- Main entry point location
- Folder structure explanation

**Making Changes:**
Claude Code always asks for permission before modifying files.

**Git Integration:**
- Changed file review
- Commit message generation
- Branch creation
- Merge conflict resolution

### Essential Commands

| Command | Function |
|---------|----------|
| `claude` | Interactive mode |
| `claude "task"` | One-time task execution |
| `claude -p "query"` | Query with immediate exit |
| `claude -c` | Resume recent conversation |
| `/clear` | Clear conversation history |
| `/help` | Display available commands |

### Recommended Practices

- **Specificity:** Replace vague requests with detailed descriptions
- **Iterative Approach:** Break complex tasks into sequential steps
- **Exploration First:** Allow Claude to analyze code before requesting modifications
- **Keyboard Shortcuts:** Press `?` for available shortcuts

---

## Common Workflows

### Understanding New Codebases

Navigate to project root and start Claude Code with `claude`. Ask for:
- High-level summaries
- Architecture patterns
- Data models
- Authentication mechanisms

Start with broad questions, then narrow down to specific areas.

### Bug Fixing and Refactoring

Share error messages with Claude, request fix recommendations, and apply solutions. Include reproduction steps and error context for better results.

### Specialized Capabilities

**Subagents:** View available subagents with `/agents`. Claude automatically delegates tasks to specialized agents.

**Plan Mode:** Enables safe code analysis through read-only operations. Activate with `Shift+Tab` or `--permission-mode plan`.

### Working with Images

Add images via drag-and-drop, paste (Ctrl+V), or file paths for:
- UI element analysis
- Error screenshots
- Diagrams and design mockups

### File References

Use `@filename` to include files without waiting for analysis.

### Extended Thinking

Enable with `Tab` or prompts like "think" or "think hard." Configure persistence via `MAX_THINKING_TOKENS` environment variable.

### Resuming Sessions

- `claude --continue`: Resume most recent conversation
- `claude --resume`: Display conversation picker

### Git Worktrees

Create isolated working directories for parallel Claude sessions:
```bash
git worktree add ../project-feature-a -b feature-a
cd ../project-feature-a
claude
```

### Unix-Style Utilities

```bash
cat file.txt | claude -p 'summarize this' > output.txt
```

Supports `--output-format` options: text, json, stream-json.

### Custom Commands

**Project Commands:** Create reusable commands in `.claude/commands/` directory.
**Personal Commands:** Store in `~/.claude/commands/` for cross-project use.

---

## Claude Code on the Web

### Overview
Claude Code on the web enables developers to initiate Claude Code tasks asynchronously from the Claude app, running on secure cloud infrastructure.

### Key Capabilities
- Code Architecture Questions
- Bug Fixes & Routine Tasks
- Parallel Work execution
- Remote Repositories access
- Backend Development

### Availability
Currently in research preview for:
- Pro users
- Max users
- Team premium seat users
- Enterprise premium seat users

### Getting Started
1. Navigate to claude.ai/code
2. Connect GitHub account
3. Install Claude GitHub app in repositories
4. Select default environment
5. Submit coding task
6. Review changes and create pull request

### Cloud Environment

**Pre-installed Tools:**
- Popular programming languages and runtimes
- Common build tools and package managers
- Testing frameworks and linters

**Language Support:**
- Python 3.x with pip, poetry, scientific libraries
- Node.js: Latest LTS with npm, yarn, pnpm, bun
- Ruby: 3.1.6, 3.2.6, 3.3.6 (default: 3.3.6)
- PHP: 8.4.14
- Java: OpenJDK with Maven and Gradle
- Go: Latest stable with module support
- Rust: Full toolchain with cargo
- C++: GCC and Clang compilers

**Database Support:**
- PostgreSQL version 16
- Redis version 7.0

### Network Access

Default is limited to allowlisted domains including:
- Anthropic Services
- Version Control (GitHub, GitLab, Bitbucket)
- Container Registries (Docker, GCR, GHCR)
- Cloud Platforms (Google Cloud, Azure, Oracle)
- Package Managers (NPM, PyPI, RubyGems, crates.io, etc.)

---

## Claude Code on Desktop

### Key Features

- **Parallel local sessions with Git worktrees**: Run multiple Claude Code sessions simultaneously
- **Include files listed in `.gitignore`**: Automatically copy files matching `.gitignore` patterns using `.worktreeinclude`
- **Launch Claude Code on the web**: Kick off secure cloud sessions directly

### Installation

Download and install the Claude Desktop app from claude.ai/download

**Note**: Local sessions are not available on Windows arm64 architectures.

### Using Git Worktrees

Each session gets its own isolated worktree. Default location: `~/.claude-worktrees`

### Copying Files Ignored with `.gitignore`

Create a `.worktreeinclude` file in your repository root:
```
.env
.env.local
.env.*
**/.claude/settings.local.json
```

---

## Visual Studio Code Extension (Beta)

### Key Features

- Native IDE integration via Spark icon
- Plan review and editing
- Auto-accept mode
- Extended thinking toggle
- File operations with system file picker
- MCP server support
- Conversation access
- Concurrent sessions
- Most CLI shortcuts and slash commands

### System Requirements

VS Code version 1.98.0 or higher

### Operational Flow

1. Click Spark icon in editor sidebar
2. Input prompts using terminal-style syntax
3. Observe Claude analyzing code
4. Review and approve edits directly in interface

### Security Considerations

Auto-edit mode may permit modification of IDE configuration files. Recommendations:
- Enable VS Code Restricted Mode for untrusted projects
- Use manual approval mode
- Ensure Claude receives trusted input only

---

## JetBrains IDEs Integration

### Supported IDEs
- IntelliJ IDEA
- PyCharm
- Android Studio
- WebStorm
- PhpStorm
- GoLand

### Key Features
- **Quick launch**: `Cmd+Esc` (Mac) or `Ctrl+Esc` (Windows/Linux)
- **Diff viewing**: Code changes display in IDE diff viewer
- **Selection context**: Current selection/tab automatically shared
- **File reference shortcuts**: `Cmd+Option+K` (Mac) or `Alt+Ctrl+K` (Linux/Windows)
- **Diagnostic sharing**: Lint and syntax errors automatically shared

### Installation
Install from JetBrains marketplace and restart IDE.

### Configuration

**Claude Code Settings:**
1. Run `claude`
2. Enter `/config`
3. Set diff tool to `auto`

**Plugin Settings:** Configure via Settings → Tools → Claude Code [Beta]

**WSL users**: Set `wsl -d Ubuntu -- bash -lic "claude"` as your Claude command

---

## GitHub Actions

### Why Use Claude Code GitHub Actions?

- Instant PR creation
- Automated implementation
- Standards compliance via `CLAUDE.md`
- Quick setup
- Secure operation on GitHub runners

### Setup Options

**Quick Setup:** Run `/install-github-app` in Claude's terminal

**Manual Setup:**
1. Install the Claude GitHub app at github.com/apps/claude
2. Add `ANTHROPIC_API_KEY` to repository secrets
3. Copy workflow file to `.github/workflows/`

### Example Workflows

Responds to `@claude` mentions in comments. Supports:
- Slash commands like `/review`
- Custom automation with scheduled tasks

### Best Practices

- Define coding standards in `CLAUDE.md`
- Use GitHub Secrets for API keys
- Configure appropriate `--max-turns` limits

---

## GitLab CI/CD Integration

### Key Features

- Instant MR Creation
- Automated Implementation
- Project-Aware (follows `CLAUDE.md`)
- Enterprise-Ready (Claude API, AWS Bedrock, or Google Vertex AI)
- Runs in isolated runners

### Quick Setup

**Step 1**: Add masked CI/CD variable `ANTHROPIC_API_KEY`

**Step 2**: Add Claude job to `.gitlab-ci.yml`:

```yaml
stages:
  - ai

claude:
  stage: ai
  image: node:24-alpine3.21
  rules:
    - if: '$CI_PIPELINE_SOURCE == "web"'
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
  variables:
    GIT_STRATEGY: fetch
  before_script:
    - apk update
    - apk add --no-cache git curl bash
    - npm install -g @anthropic-ai/claude-code
  script:
    - /bin/gitlab-mcp-server || true
    - >
      claude
      -p "${AI_FLOW_INPUT:-'Review this MR'}"
      --permission-mode acceptEdits
      --allowedTools "Bash(*) Read(*) Edit(*) Write(*) mcp__gitlab"
      --debug
```

---

## Claude Code in Slack

### Overview
Claude Code in Slack enables users to delegate coding tasks directly from their Slack workspace.

### Prerequisites

| Requirement | Details |
|---|---|
| Claude Plan | Pro, Max, Team, or Enterprise with Claude Code access |
| Claude Code on the web | Must be enabled |
| GitHub Account | Connected to Claude Code |
| Slack Authentication | Account linked to Claude via the app |

### Setup Instructions

1. Install the Claude App from Slack App Marketplace
2. Connect Claude Account via App Home tab
3. Configure Claude Code at claude.ai/code
4. Choose Routing Mode (Code only or Code + Chat)

### How It Works

Claude analyzes messages for coding intent. Works in channels (public/private), not direct messages.

### User Interface Elements

- **View Session**: Opens full Claude Code session in browser
- **Create PR**: Creates pull request from session changes
- **Retry as Code**: Converts Chat response to Code session
- **Change Repo**: Selects different repository

### Current Limitations
- GitHub only (no other platforms)
- One PR per session maximum
- Rate limits apply per user plan
