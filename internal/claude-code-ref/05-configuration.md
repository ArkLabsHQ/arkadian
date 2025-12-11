# Claude Code - Configuration

> Source: https://code.claude.com/docs/en/settings

---

## Settings

### Settings Files Structure

Settings are organized in a precedence hierarchy:

1. **Enterprise managed policies** (`managed-settings.json`) - highest priority
2. **Command line arguments**
3. **Local project settings** (`.claude/settings.local.json`)
4. **Shared project settings** (`.claude/settings.json`)
5. **User settings** (`~/.claude/settings.json`) - lowest priority

**File locations:**
- User: `~/.claude/settings.json`
- Project: `.claude/settings.json` and `.claude/settings.local.json`
- Enterprise (macOS): `/Library/Application Support/ClaudeCode/managed-settings.json`
- Enterprise (Linux/WSL): `/etc/claude-code/managed-settings.json`
- Enterprise (Windows): `C:\Program Files\ClaudeCode\managed-settings.json`

### Key Configuration Options

| Setting | Purpose | Example |
|---------|---------|---------|
| `permissions` | Control tool access | `{"allow": ["Bash(npm run:*)"], "deny": ["Read(.env)"]}` |
| `env` | Environment variables | `{"FOO": "bar"}` |
| `model` | Override default model | `"claude-sonnet-4-5-20250929"` |
| `attribution` | Git commit/PR attribution | `{"commit": "...", "pr": "..."}` |
| `sandbox` | Sandboxing configuration | `{"enabled": true}` |
| `hooks` | Custom commands for events | See hooks documentation |
| `statusLine` | Custom status line display | `{"type": "command"}` |
| `companyAnnouncements` | Startup announcements | Array of strings |

### Permission Settings

```json
{
  "permissions": {
    "allow": ["Bash(git diff:*)", "Read(~/docs)"],
    "deny": ["Bash(curl:*)", "Read(.env)", "Read(./secrets/**)", "WebFetch"],
    "additionalDirectories": ["../docs/"]
  }
}
```

### Excluding Sensitive Files

```json
{
  "permissions": {
    "deny": [
      "Read(.env)",
      "Read(.env.*)",
      "Read(./secrets/**)",
      "Read(./config/credentials.json)",
      "Read(./build)"
    ]
  }
}
```

### Sandbox Settings

```json
{
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true,
    "excludedCommands": ["docker"],
    "network": {
      "allowUnixSockets": ["/var/run/docker.sock"],
      "allowLocalBinding": true
    }
  }
}
```

### Attribution Settings

```json
{
  "attribution": {
    "commit": "Generated with Claude Code\n\nCo-Authored-By: Claude <[email protected]>",
    "pr": "Generated with Claude Code"
  }
}
```

### Environment Variables

Key variables:
- `ANTHROPIC_API_KEY`: API authentication
- `ANTHROPIC_AUTH_TOKEN`: Custom authorization header
- `ANTHROPIC_MODEL`: Override model selection
- `CLAUDE_CODE_USE_BEDROCK`: Enable AWS Bedrock
- `CLAUDE_CODE_USE_FOUNDRY`: Enable Microsoft Foundry
- `CLAUDE_CODE_USE_VERTEX`: Enable Google Vertex AI
- `DISABLE_TELEMETRY`: Opt out of analytics
- `DISABLE_ERROR_REPORTING`: Disable Sentry
- `DISABLE_AUTOUPDATER`: Prevent automatic updates
- `MAX_THINKING_TOKENS`: Enable extended thinking
- `BASH_DEFAULT_TIMEOUT_MS`: Set command timeout
- `HTTP_PROXY` / `HTTPS_PROXY`: Configure proxy servers

### Available Tools

- **Bash**: Execute shell commands
- **Read**: View file contents
- **Edit**: Modify files
- **Write**: Create/overwrite files
- **Glob**: Find files by pattern
- **Grep**: Search file contents
- **WebFetch**: Retrieve URL content
- **WebSearch**: Internet searches
- **NotebookEdit**: Modify Jupyter notebooks
- **AskUserQuestion**: Request user input
- **SlashCommand**: Execute custom commands
- **Task**: Run sub-agents
- **Skill**: Execute skills
- **TodoWrite**: Manage task lists

### Bash Tool Behavior

- Working directory persists with `cd`
- Environment variables do NOT persist between commands

**Solutions:**
1. Activate environment before launching
2. Set `CLAUDE_ENV_FILE` to setup script
3. Use SessionStart hooks

---

## Terminal Configuration

### Theme and Appearance

Use `/config` to match Claude Code interface with terminal appearance. Customize via custom status line settings.

### Line Break Input Methods

1. **Quick Escape**: `\` + Enter
2. **Shift+Enter**: Run `/terminal-setup` for automatic configuration
3. **Option+Enter**:
   - Mac Terminal.app: Settings → Profiles → Keyboard, enable "Use Option as Meta Key"
   - iTerm2/VS Code: Settings → Profiles → Keys, set Option key to "Esc+"

### Notification Configuration

**iTerm 2:**
- Preferences → Profiles → Terminal
- Enable "Silence bell" and Filter Alerts

### Vim Mode Support

Enable via `/vim` or `/config`:
- Mode switching: Esc, i/I, a/A, o/O
- Navigation: h/j/k/l, w/e/b, 0/$, ^, gg/G
- Editing: x, dw/de/db/dd/D, cw/ce/cb/cc/C, dot repeat

---

## Model Configuration

### Available Models

| Alias | Purpose |
|-------|---------|
| `default` | Recommended based on account type |
| `sonnet` | Latest Sonnet (currently 4.5) for daily coding |
| `opus` | Opus (currently 4.5) for complex reasoning |
| `haiku` | Fast, efficient for simple tasks |
| `sonnet[1m]` | Sonnet with 1 million token context |
| `opusplan` | Opus in plan mode, Sonnet for execution |

### Setting Your Model

Configuration priority (highest to lowest):
1. During session: `/model <alias|name>`
2. At startup: `claude --model <alias|name>`
3. Environment variable: `ANTHROPIC_MODEL=<alias|name>`
4. Settings file: `model` field

### Settings File Example

```json
{
    "permissions": { ... },
    "model": "opus"
}
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Maps `opus` alias |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Maps `sonnet` alias |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Maps `haiku` alias |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Model for subagents |

### Prompt Caching Configuration

| Variable | Function |
|----------|----------|
| `DISABLE_PROMPT_CACHING` | Disables all caching |
| `DISABLE_PROMPT_CACHING_HAIKU` | Haiku only |
| `DISABLE_PROMPT_CACHING_SONNET` | Sonnet only |
| `DISABLE_PROMPT_CACHING_OPUS` | Opus only |

---

## Memory Management

### Memory Types & Hierarchy

1. **Enterprise Policy** (Organization-wide)
   - macOS: `/Library/Application Support/ClaudeCode/CLAUDE.md`
   - Linux: `/etc/claude-code/CLAUDE.md`
   - Windows: `C:\Program Files\ClaudeCode\CLAUDE.md`

2. **Project Memory** (Team-shared)
   - Location: `./CLAUDE.md` or `./.claude/CLAUDE.md`

3. **Project Rules** (Modular)
   - Location: `./.claude/rules/*.md`

4. **User Memory** (Personal)
   - Location: `~/.claude/CLAUDE.md`

5. **Project Memory (Local)**
   - Location: `./CLAUDE.local.md`

### CLAUDE.md Imports

```
See @README for project overview and @package.json for available npm commands.

# Additional Instructions
- git workflow @docs/git-instructions.md
```

Features:
- Relative and absolute paths supported
- Home directory imports: `@~/.claude/my-project-instructions.md`
- Recursive imports (max 5 hops)

### Quick Memory Addition: # Shortcut

```
# Always use descriptive variable names
```

Claude will prompt you to select which memory file to store this in.

### Direct Memory Editing: /memory Command

Opens memory file in system editor.

### Modular Rules with .claude/rules/

```
your-project/
├── .claude/
│   ├── CLAUDE.md
│   └── rules/
│       ├── code-style.md
│       ├── testing.md
│       └── security.md
```

### Path-Specific Rules

```yaml
---
paths: src/api/**/*.ts
---

# API Development Rules

- All API endpoints must include input validation
```

### Glob Pattern Examples

| Pattern | Matches |
|---------|---------|
| `**/*.ts` | All TypeScript files |
| `src/**/*` | All files under `src/` |
| `*.md` | Markdown in project root |
| `src/components/*.tsx` | React components in directory |

### Best Practices

- Be specific
- Use structure with bullet points and headings
- Review periodically
- Keep rules focused (one topic per file)
- Use descriptive filenames

---

## Status Line Configuration

### Setup Methods

1. **Interactive**: `/statusline` command
2. **Direct Configuration**:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh",
    "padding": 0
  }
}
```

### JSON Input Schema

Your script receives:
- `hook_event_name`: Event type
- `session_id`: Unique session reference
- `transcript_path`: Path to transcript
- `cwd`: Current working directory
- `model`: Object with `id` and `display_name`
- `workspace`: Object with `current_dir` and `project_dir`
- `version`: Claude Code version
- `cost`: Usage metrics

### Example Implementation (Bash)

```bash
#!/bin/bash
input=$(cat)
MODEL_DISPLAY=$(echo "$input" | jq -r '.model.display_name')
CURRENT_DIR=$(echo "$input" | jq -r '.workspace.current_dir')
echo "[$MODEL_DISPLAY] ${CURRENT_DIR##*/}"
```

### Best Practices

- Keep output concise
- Use emojis and colors strategically
- Use `jq` for JSON parsing
- Test with mock JSON
- Cache expensive operations
