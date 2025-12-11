# Claude Code - Administration

> Source: https://code.claude.com/docs/en/setup

---

## Advanced Installation

### System Requirements

- **Operating Systems**: macOS 10.15+, Ubuntu 20.04+/Debian 10+, or Windows 10+ (WSL 1/2 or Git Bash)
- **Hardware**: 4 GB+ RAM minimum
- **Software**: Node.js 18+ (NPM installation only)
- **Network**: Internet connection
- **Shell**: Bash, Zsh, or Fish recommended

### Installation Methods

**Native Installation (Recommended):**

```bash
# Homebrew (macOS/Linux)
brew install --cask claude-code

# macOS, Linux, WSL
curl -fsSL https://claude.ai/install.sh | bash

# Windows PowerShell
irm https://claude.ai/install.ps1 | iex

# Windows CMD
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
```

**NPM Installation:**
```bash
npm install -g @anthropic-ai/claude-code
```

### Authentication Options

1. **Claude Console**: Default method with OAuth
2. **Claude App**: Available with Pro/Max subscription
3. **Enterprise Platforms**: Amazon Bedrock, Google Vertex AI, or Microsoft Foundry

### Updates

**Automatic Updates:** Auto-updates on startup. Disable with:
```bash
export DISABLE_AUTOUPDATER=1
```

**Manual Update:**
```bash
claude update
```

### Uninstallation

**Native Installation (macOS/Linux/WSL):**
```bash
rm -f ~/.local/bin/claude
rm -rf ~/.claude-code
```

**Windows PowerShell:**
```powershell
Remove-Item -Path "$env:LOCALAPPDATA\Programs\claude-code" -Recurse -Force
Remove-Item -Path "$env:LOCALAPPDATA\Microsoft\WindowsApps\claude.exe" -Force
```

**Clean Configuration:**
```bash
rm -rf ~/.claude
rm ~/.claude.json
rm -rf .claude
rm -f .mcp.json
```

### Diagnostic Command

```bash
claude doctor
```

---

## Identity and Access Management

### Authentication Methods

- Claude API via Claude Console
- Amazon Bedrock
- Microsoft Foundry
- Google Vertex AI

### Claude API Authentication Setup

1. Use existing Claude Console account or create new one
2. Add users through bulk invitations or SSO
3. Assign appropriate roles:
   - "Claude Code" role: users can create only Claude Code API keys
   - "Developer" role: users can create any API key type
4. Each user must accept invite, verify requirements, install Claude Code, and login

### Permission System

| Tool Type | Example | Approval Required |
|-----------|---------|-------------------|
| Read-only | File reads, LS, Grep | No |
| Bash Commands | Shell execution | Yes |
| File Modification | Edit/write files | Yes |

### Configuring Permissions

Use `/permissions` to manage tool permissions.

**Rule Types:**
- "Allow" rules permit tool use without manual approval
- "Ask" rules request user confirmation
- "Deny" rules prevent tool use (highest precedence)

### Permission Modes

| Mode | Description |
|------|-------------|
| `default` | Prompts on first tool use |
| `acceptEdits` | Auto-accepts file edit permissions |
| `plan` | Plan Mode—analysis only |
| `bypassPermissions` | Skips all prompts (safe environment required) |

### Working Directories

Extend access through:
- Startup: `--add-dir <path>`
- During session: `/add-dir`
- Persistent: `additionalDirectories` in settings files

### Tool-Specific Permission Rules

**Bash:**
- `Bash(npm run build)` — exact command match
- `Bash(npm run test:*)` — prefix match

**Read & Edit:**
| Pattern | Meaning |
|---------|---------|
| `//path` | Absolute filesystem path |
| `~/path` | Home directory path |
| `/path` | Relative to settings file |
| `path` | Relative to current directory |

**WebFetch:**
- `WebFetch(domain:example.com)`

**MCP:**
- `mcp__puppeteer` — all tools from server
- `mcp__puppeteer__puppeteer_navigate` — specific tool

### Enterprise Managed Policy Settings

**Settings Precedence:**
1. Enterprise policies (highest)
2. Command line arguments
3. Local project settings
4. Shared project settings
5. User settings (lowest)

### Credential Management

- **macOS**: Encrypted Keychain storage
- **Custom scripts**: Configure `apiKeyHelper` setting
- **Refresh**: Default 5 minutes or on HTTP 401

---

## Security

### Permission-Based Model

Claude Code operates on strict read-only permissions by default.

### Key Built-in Protections

- **Sandboxed Bash Environment**: Isolated containers with restrictions
- **Write Access Restrictions**: Only within starting directory
- **Prompt Fatigue Mitigation**: Allowlisting frequently used safe commands
- **Accept Edits Mode**: Batch-approve multiple edits

### Prompt Injection Defenses

- Permission requirements for sensitive operations
- Context-aware analysis
- Input sanitization
- Command blocklists

### Cloud Execution Security

- Isolated virtual machines per session
- Network access controls
- Credential protection through secure proxy
- Branch restrictions
- Audit logging
- Automatic cleanup

### Best Practices

**Sensitive Code:**
- Review all suggested changes
- Use project-specific permission settings
- Consider development containers
- Regularly audit with `/permissions`

**Team Security:**
- Deploy enterprise managed policies
- Share permission configurations via version control
- Train team members on security practices
- Monitor usage through OpenTelemetry metrics

### Reporting Vulnerabilities

Report through Anthropic's HackerOne program.

---

## Data Usage

### Data Training Policy

**Consumer Users (Free, Pro, Max):**
- Opt-in for data usage starting August 28, 2025
- Deadline to choose: October 8, 2025

**Commercial Users (Team, Enterprise, API):**
- Anthropic does not train on commercial data by default

### Data Retention Periods

| Account Type | Retention |
|--------------|-----------|
| Consumer (opt-in) | 5 years |
| Consumer (opt-out) | 30 days |
| Commercial | 30 days |
| Zero retention | Available with configured API keys |

### Telemetry Services

**Statsig (Metrics):**
- Logs operational metrics (latency, reliability, usage)
- Opt-out: `DISABLE_TELEMETRY=1`

**Sentry (Error Logging):**
- Encrypted in transit and at rest
- Opt-out: `DISABLE_ERROR_REPORTING=1`

**Bug Reporting:**
- `/bug` command sends conversation history
- Opt-out: `DISABLE_BUG_COMMAND=1`

### API Provider Defaults

| Service | Claude API | Vertex API | Bedrock API |
|---------|-----------|-----------|-----------|
| Statsig | On | Off | Off |
| Sentry | On | Off | Off |
| Bug Reports | On | Off | Off |

---

## Monitoring

### Quick Start Configuration

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer your-token"
export OTEL_METRIC_EXPORT_INTERVAL=10000
export OTEL_LOGS_EXPORT_INTERVAL=5000
```

### Available Metrics

- `claude_code.session.count` - CLI sessions initiated
- `claude_code.lines_of_code.count` - Code modifications
- `claude_code.pull_request.count` - Created PRs
- `claude_code.commit.count` - Git commits
- `claude_code.cost.usage` - Session cost in USD
- `claude_code.token.usage` - Tokens consumed
- `claude_code.code_edit_tool.decision` - Tool permission decisions
- `claude_code.active_time.total` - Active usage time

### Available Events

- `claude_code.user_prompt` - User prompt submissions
- `claude_code.tool_result` - Tool execution outcomes
- `claude_code.api_request` - Claude API interactions
- `claude_code.api_error` - Failed API requests
- `claude_code.tool_decision` - Permission decisions

### Multi-Team Organization Support

```bash
export OTEL_RESOURCE_ATTRIBUTES="department=engineering,team.id=platform"
```

---

## Costs

### Overview

Average costs: ~$6 per developer daily, 90% under $12 daily. API usage: $100-200 per developer monthly with Sonnet 4.5.

### Using the `/cost` Command

```
Total cost:            $0.55
Total duration (API):  6m 19.7s
Total duration (wall): 6h 33m 10.2s
Total code changes:    0 lines added, 0 lines removed
```

### Rate Limit Recommendations

| Team Size | TPM per user | RPM per user |
|-----------|-------------|------------|
| 1-5 users | 200k-300k | 5-7 |
| 5-20 users | 100k-150k | 2.5-3.5 |
| 20-50 users | 50k-75k | 1.25-1.75 |
| 50-100 users | 25k-35k | 0.62-0.87 |
| 100-500 users | 15k-20k | 0.37-0.47 |
| 500+ users | 10k-15k | 0.25-0.35 |

### Reduce Token Usage

- **Compact Conversations**: `/compact` or auto-compact at 95% capacity
- Use specific, detailed queries
- Segment large tasks
- Clear history with `/clear`

---

## Analytics

### Available Metrics

- **Lines of Code Accepted**: Total lines written by Claude and accepted
- **Suggestion Accept Rate**: Percentage of accepted code editing tool usage
- **Activity**: Users and sessions per day
- **Spend**: Users and dollars per day
- **Team Insights**: Per-user spending and lines of code

### Required Roles for Access

- Primary Owner
- Owner
- Billing
- Admin
- Developer

Users with User, Claude Code User, or Membership Admin roles cannot access analytics.

---

## Plugin Marketplaces

### Overview

JSON-based catalogs for plugin discovery, installation, and management.

### Adding Marketplaces

```bash
/plugin marketplace add owner/repo
/plugin marketplace add https://gitlab.com/company/plugins.git
/plugin marketplace add ./my-marketplace
```

### Creating Your Own Marketplace

Create `.claude-plugin/marketplace.json`:

```json
{
  "name": "company-tools",
  "owner": {
    "name": "DevTools Team",
    "email": "[email protected]"
  },
  "plugins": [
    {
      "name": "code-formatter",
      "source": "./plugins/formatter",
      "description": "Automatic code formatting",
      "version": "2.1.0"
    }
  ]
}
```

### Plugin Source Types

**Relative paths:**
```json
{"name": "my-plugin", "source": "./plugins/my-plugin"}
```

**GitHub repositories:**
```json
{"name": "github-plugin", "source": {"source": "github", "repo": "owner/plugin-repo"}}
```

**Git repositories:**
```json
{"name": "git-plugin", "source": {"source": "url", "url": "https://gitlab.com/team/plugin.git"}}
```

### Team Configuration

In `.claude/settings.json`:
```json
{
  "extraKnownMarketplaces": {
    "team-tools": {
      "source": {"source": "github", "repo": "your-org/claude-plugins"}
    }
  }
}
```

### Marketplace Operations

```bash
/plugin marketplace list
/plugin marketplace update marketplace-name
/plugin marketplace remove marketplace-name
```
