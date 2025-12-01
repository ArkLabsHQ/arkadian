# Arkadian Development Context

You are working **inside the Arkadian repository itself**. Arkadian is an AI assistant system for the Ark protocol ecosystem.

## Project Familiarization

Before making changes, familiarize yourself with:

- **@README.md** - Project overview, what Arkadian does, architecture highlights
- **@SETUP.md** - Installation guide, how the hook system works, environment variables
- **@Makefile** - Build targets, installation process
- **@ORCHESTRATOR.md** - The global orchestrator prompt (gets installed to ~/.claude/CLAUDE.md)
- **@CONFIGURATION_GUIDE.md** - How Claude Code configuration works as arkadian basically overrides default behaviour

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `agents/` | Specialist agent definitions (ark-guru, ark-developer, etc.) |
| `skills/` | Model-invoked skills (pm-spec, pm-plan, dev-implement, etc.) |
| `commands/` | Slash commands (/add-project, /update-project, /speckit.*) |
| `hooks/` | Claude Code hooks (session-start, context-loading) |
| `docs/` | Project documentation registry (INDEX.md + per-project docs) |
| `workflows/` | Workflow templates (quick_fix.yaml, feature_full_lifecycle.yaml) |
| `specs/` | Feature specifications (speckit output) |
| `.specify/` | Speckit templates and scripts |
| `scripts/` | Installation and utility scripts |

## Development Guidelines

When working on Arkadian itself (not using it as an orchestrator):

- Use direct tools (Read, Edit, Write, Bash) instead of delegating to agents
- Make changes directly without the orchestration protocol
- Focus on improving the orchestrator system, not using it

## Important Notes

- This context is for **developing Arkadian**, not **using Arkadian as an orchestrator**
- When testing orchestrator functionality, use a separate Claude session outside this project directory
