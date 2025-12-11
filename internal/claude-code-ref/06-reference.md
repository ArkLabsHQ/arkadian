# Claude Code - Reference

> Source: https://code.claude.com/docs/en/cli-reference

---

## CLI Reference

### CLI Commands

| Command | Description | Example |
|---------|-------------|---------|
| `claude` | Launch interactive REPL | `claude` |
| `claude "query"` | Start REPL with initial prompt | `claude "explain this project"` |
| `claude -p "query"` | Query via SDK, then exit | `claude -p "explain this function"` |
| `cat file \| claude -p "query"` | Process piped content | `cat logs.txt \| claude -p "explain"` |
| `claude -c` | Continue most recent conversation | `claude -c` |
| `claude -c -p "query"` | Continue via SDK | `claude -c -p "Check for type errors"` |
| `claude -r "<session-id>" "query"` | Resume specific session | `claude -r "abc123" "Finish this PR"` |
| `claude update` | Update to latest version | `claude update` |
| `claude mcp` | Configure MCP servers | See MCP documentation |

### Key CLI Flags

**Session Management:**
- `--continue, -c` — Load most recent conversation
- `--resume, -r` — Resume specific session by ID
- `--fork-session` — Create new session ID when resuming
- `--session-id` — Use specific UUID

**Model & Output:**
- `--model` — Set model (aliases: "sonnet", "opus", or full name)
- `--output-format` — Format: text, json, stream-json
- `--print, -p` — Print response without interactive mode
- `--fallback-model` — Auto-fallback when overloaded

**System Prompt:**
- `--system-prompt` — Replace entire default prompt
- `--system-prompt-file` — Load prompt from file (print mode)
- `--append-system-prompt` — Add to default prompt (recommended)

**Tools & Permissions:**
- `--tools` — Specify available tools or "default"
- `--allowedTools` — Allow specific tools without prompting
- `--disallowedTools` — Block specific tools
- `--dangerously-skip-permissions` — Skip permission prompts

**Working Directory:**
- `--add-dir` — Add additional directories

**Configuration:**
- `--settings` — Load settings from JSON file or string
- `--agents` — Define custom subagents via JSON
- `--agent` — Specify agent for session
- `--permission-mode` — Begin in specific mode

**Advanced Options:**
- `--debug` — Enable debug mode
- `--verbose` — Full turn-by-turn output
- `--version, -v` — Display version
- `--max-turns` — Limit agentic turns (non-interactive)
- `--betas` — Include beta API headers
- `--mcp-config` — Load MCP servers from JSON
- `--strict-mcp-config` — Only use specified MCP configs
- `--plugin-dir` — Load plugins from directory
- `--permission-prompt-tool` — MCP tool for permissions
- `--json-schema` — Validate JSON output against schema

### Agents Flag Format

```json
{
  "agent-name": {
    "description": "When to invoke this agent",
    "prompt": "System prompt guiding behavior",
    "tools": ["Read", "Edit", "Bash"],
    "model": "sonnet"
  }
}
```

### System Prompt Customization

| Flag | Behavior | Modes |
|------|----------|-------|
| `--system-prompt` | Replaces entire prompt | Interactive + Print |
| `--system-prompt-file` | Replaces with file contents | Print only |
| `--append-system-prompt` | Adds to default | Interactive + Print |

---

## Interactive Mode

### Keyboard Shortcuts

**General Controls:**
- `Ctrl+C`: Cancel current input/generation
- `Ctrl+D`: Exit Claude Code
- `Ctrl+L`: Clear terminal (preserves conversation)
- `Ctrl+O`: Toggle verbose output
- `Ctrl+R`: Reverse search history
- `Ctrl+V` (macOS/Linux) or `Alt+V` (Windows): Paste images
- `Up/Down`: Navigate command history
- `Esc` + `Esc`: Rewind code/conversation
- `Tab`: Toggle extended thinking
- `Shift+Tab` or `Alt+M`: Toggle permission modes

**Multiline Input:**
- `\` + `Enter`: Quick escape (all terminals)
- `Option+Enter`: Default on macOS
- `Shift+Enter`: After `/terminal-setup`
- `Ctrl+J`: Line feed character

**Quick Commands:**
- `#` at start: Memory shortcut
- `/` at start: Slash command access
- `!` at start: Bash mode (direct execution)
- `@`: File path mention trigger

### Vim Editor Mode

Enable with `/vim` or `/config`.

**Mode Switching:**
- `Esc`: Enter NORMAL mode
- `i`/`I`: Insert before cursor/line beginning
- `a`/`A`: Insert after cursor/line end
- `o`/`O`: Open new lines below/above

**Navigation (NORMAL):**
- `h`/`j`/`k`/`l`: Left/down/up/right
- `w`/`e`/`b`: Next word, end of word, previous word
- `0`/`$`: Beginning/end of line
- `^`: First non-blank character
- `gg`/`G`: Beginning/end of input

**Editing (NORMAL):**
- `x`: Delete character
- `dd`/`D`: Delete line or to end
- `dw`/`de`/`db`: Delete word variations
- `cc`/`C`: Change line or to end
- `cw`/`ce`/`cb`: Change word variations
- `.`: Repeat last change

### Command History

History tracks per working directory. Press `Ctrl+R` to search:
1. Type query to search
2. `Ctrl+R` to cycle through matches
3. `Tab` or `Esc` to accept
4. `Enter` to execute
5. `Ctrl+C` to cancel

### Background Bash Commands

Run commands asynchronously:
- Prompt Claude Code to run in background
- Press `Ctrl+B` during bash invocation (Tmux: press twice)

### Bash Mode with ! Prefix

```bash
! npm test
! git status
! ls -la
```

---

## Slash Commands

### Built-in Slash Commands

- `/add-dir` - Add working directories
- `/agents` - Manage AI subagents
- `/bashes` - List background tasks
- `/clear` - Clear conversation history
- `/compact [instructions]` - Compact conversation
- `/config` - Open Settings
- `/context` - Visualize context usage
- `/cost` - Show token usage
- `/doctor` - Check installation health
- `/exit` - Exit REPL
- `/export [filename]` - Export conversation
- `/help` - Get usage help
- `/hooks` - Manage hooks
- `/mcp` - Manage MCP connections
- `/memory` - Edit memory files
- `/model` - Change AI model
- `/permissions` - View/update permissions
- `/plugin` - Manage plugins
- `/privacy-settings` - Update privacy
- `/status` - Show version/connectivity
- `/vim` - Enter vim mode

### Custom Slash Commands

**Project commands:** `.claude/commands/` (shared)
**Personal commands:** `~/.claude/commands/` (cross-project)

### Frontmatter Options

```yaml
allowed-tools: Tool(permission:*)
argument-hint: [param1] [param2]
description: Brief description
model: specific-model-name
disable-model-invocation: false
```

### Arguments

Use `$ARGUMENTS` for all or `$1`, `$2` for positional:

```markdown
---
argument-hint: [issue-number] [priority]
---
Fix issue #$1 with priority $2
```

### Bash Execution

```markdown
---
allowed-tools: Bash(git add:*), Bash(git status:*)
---
Current status: !`git status`
```

### MCP Slash Commands

Format: `/mcp__<server-name>__<prompt-name> [arguments]`

### Skills vs Slash Commands

- **Slash commands**: Quick, frequently used prompts; simple templates
- **Skills**: Complex workflows; multi-file capabilities; team standardization

---

## Checkpointing

### Overview

Automatic checkpointing captures file states before each edit, enabling quick undo.

### Automatic Tracking

- Per-prompt checkpoints with each user message
- Session persistence across resumptions
- Automatic cleanup after 30 days (configurable)

### Rewinding Changes

Press `Esc` twice or enter `/rewind`:

1. **Conversation only** - Restore to message while preserving code
2. **Code only** - Revert files while maintaining conversation
3. **Both** - Restore both to earlier point

### Limitations

- **Bash Command Changes**: Modifications via bash commands cannot be tracked
- **External Modifications**: Only files edited within session are captured
- **Not a VCS Replacement**: Use Git for permanent history

---

## Hooks Reference

### Configuration Structure

Hooks configured in:
- `~/.claude/settings.json` (user-level)
- `.claude/settings.json` (project-level)
- `.claude/settings.local.json` (local, not committed)

### Hook Events

- **PreToolUse**: Before tool execution (can block)
- **PermissionRequest**: When permission dialogs appear
- **PostToolUse**: After successful tool completion
- **Notification**: For various notifications
- **UserPromptSubmit**: When users submit prompts
- **Stop**: When main agent finishes
- **SubagentStop**: When subagents complete
- **SessionStart**: At session initialization
- **SessionEnd**: On session termination
- **PreCompact**: Before compaction operations

### Hook Types

- **Command hooks** (`type: "command"`): Execute bash scripts
- **Prompt hooks** (`type: "prompt"`): Send evaluation tasks to LLM

### Hook Input/Output

Input as JSON via stdin: session_id, transcript_path, cwd, permission_mode, hook_event_name

Output exit codes:
- **Exit 0**: Success
- **Exit 2**: Blocking error
- **Other**: Non-blocking errors

### Decision Control

- **PreToolUse**: `allow`, `deny`, `ask` with optional `updatedInput`
- **PermissionRequest**: Approve/deny with input modification
- **PostToolUse**: Block with automated feedback
- **UserPromptSubmit**: Block prompts or add context

### Environment Variables

- `CLAUDE_PROJECT_DIR` - Project root directory
- `CLAUDE_ENV_FILE` - For persisting environment variables
- `CLAUDE_CODE_REMOTE` - Indicates remote vs. local

### Execution Details

- Default 60-second timeout (configurable)
- All matching hooks run in parallel
- Identical hooks deduplicated

---

## Plugins Reference

### Plugin Components

- **Commands**: Custom slash commands (`commands/`)
- **Agents**: Specialized subagents (`agents/`)
- **Skills**: Agent Skills (`skills/`)
- **Hooks**: Event handlers (`hooks/hooks.json`)
- **MCP Servers**: Model Context Protocol servers (`.mcp.json`)

### Plugin Manifest Schema

**Required Fields:**
- `name`: Unique identifier in kebab-case

**Metadata Fields:**
- `version`: Semantic versioning
- `description`: Brief purpose
- `author`: Object with name, email, URL
- `homepage`: Documentation URL
- `repository`: Source code URL
- `license`: License identifier
- `keywords`: Discovery tags array

**Component Path Fields:**
- `commands`: Additional command files/directories
- `agents`: Additional agent files
- `hooks`: Hook config path or inline
- `mcpServers`: MCP config path or inline

### Plugin Directory Structure

```
enterprise-plugin/
├── .claude-plugin/
│   └── plugin.json
├── commands/
├── agents/
├── skills/
├── hooks/
├── .mcp.json
├── scripts/
├── LICENSE
└── CHANGELOG.md
```

### File Locations Reference

| Component | Default Location | Purpose |
|-----------|------------------|---------|
| Manifest | `.claude-plugin/plugin.json` | Required metadata |
| Commands | `commands/` | Slash command markdown |
| Agents | `agents/` | Subagent markdown |
| Skills | `skills/` | Agent Skills with SKILL.md |
| Hooks | `hooks/hooks.json` | Hook configuration |
| MCP servers | `.mcp.json` | MCP definitions |

### Environment Variables

`${CLAUDE_PLUGIN_ROOT}` contains the absolute plugin directory path.

### Debug Command

```bash
claude --debug
```

Shows plugin loading details, manifest validation errors, command/agent/hook registration, and MCP server initialization.

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Plugin not loading | Invalid JSON | Validate plugin.json |
| Commands not appearing | Wrong directory | Ensure `commands/` at root |
| Hooks not firing | Script not executable | Run `chmod +x script.sh` |
| MCP server fails | Missing variable | Use `${CLAUDE_PLUGIN_ROOT}` |
| Path errors | Absolute paths used | Use relative paths with `./` |
