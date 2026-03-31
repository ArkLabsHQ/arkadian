---
name: create-operational-sop
description: "Generate validated operational SOPs for Ark ecosystem projects by testing commands before documenting them. Use when: user wants to create or audit SOPs for a project."
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# Create Operational SOPs

**When to use:**
- User wants to generate operational documentation for a project
- User wants to audit existing SOPs for completeness

**User input:** A project ID and optionally an SOP type (`development-workflow`, `deployment-guide`, `all`, `audit`).

Examples:
- `arkd` — Audit and generate all missing SOPs
- `wallet development-workflow` — Generate development workflow only
- `fulmine audit` — Only audit, don't generate

## Outline

This skill generates validated operational documentation by **actually testing commands** before documenting them.

### 1. Validate Project

- Load `${ARKADIAN_DIR}/docs/INDEX.md` and find project entry
- Resolve `docs_path` and `repo_path`
- Verify repository access

### 2. Detect Project Type

| Type | Indicators | Common Commands |
|------|-----------|----------------|
| Go Backend | `go.mod`, `Makefile` | `make build`, `make test`, `go run` |
| TypeScript Frontend | `package.json` + React/Vite | `pnpm install`, `pnpm run start` |
| TypeScript Backend | `package.json` + Node.js | `pnpm install`, `pnpm run dev` |
| Infrastructure | `*.tf` files | `tofu init`, `tofu plan` |
| Telemetry | `docker-compose.yml` + Prometheus | `docker compose up` |

### 3. Audit Existing Documentation

Check required files:
```
sop/development-workflow.md     # REQUIRED
testing/usage.md                # REQUIRED
testing/how_to_run.md           # REQUIRED
testing/how_to_test.md          # REQUIRED
testing/troubleshooting.md      # REQUIRED
```

Optional (by type): `sop/deployment-guide.md`, `testing/api-reference.md`

Report audit results. If `audit` mode, stop here.

### 4. Generate Missing SOPs

For each missing file, follow the **validation-first approach**:

1. **Discovery Phase** (read, don't execute): Check for build system, config files, scripts
2. **Validation Phase** (test commands): Test ONE command per category to validate
3. **Generate Content**: Only document commands that succeed or fail gracefully

#### Files to generate:

**`sop/development-workflow.md`**: Prerequisites, Setup, Building, Running, Testing, Quality Checks, PR Checklist

**`testing/how_to_run.md`**: Prerequisites, Quick Start, Docker Deployment, Local Development, Configuration, Verification

**`testing/how_to_test.md`**: Unit Tests, Integration Tests, Running Specific Tests, Test Coverage, CI/CD

**`testing/troubleshooting.md`**: Common Issues (Build Failures, Runtime Errors, Test Failures), Debugging (Logs, Docker Logs, Environment)

### 5. Validation Report

```markdown
## Generation Report for <project-id>

### Commands Validated:
- `make build` - SUCCESS
- `make test` - SUCCESS (23 tests passed)

### Commands Not Validated (require manual verification):
- `make integrationtest` - Requires external dependencies
```

## Safety Notes

- **Never run destructive commands** during validation
- **Use dry-run flags** when available
- **Timebox validation** — each command should timeout after 60 seconds
- **Don't auto-commit** — let the user review generated content first
