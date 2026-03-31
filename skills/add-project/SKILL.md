---
name: add-project
description: "Analyze a project repository and add it to the Arkadian documentation registry with standardized structure. Use when: user provides a path to a new project to onboard."
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# Add Project to Arkadian Registry

**When to use:**
- User wants to add a new project to the Arkadian documentation registry
- User provides an absolute path to a project repository

**User input:** An absolute path to a project repository (e.g., `/Users/name/code/my-project`).

## Outline

This skill automates the process of analyzing a project and adding comprehensive documentation to the Arkadian registry, following the same pattern used for existing projects like `boltz-backend`, `fulmine`, and `arkd`.

Given a project path, do this:

### 1. Validate Input

Check that the provided path:
- Is an absolute path (starts with `/` or `~`)
- Exists on the filesystem
- Contains recognizable project files (README, package.json, Cargo.toml, go.mod, etc.)
- Has a `.git` directory (is a git repository)

If validation fails, ask the user to provide a valid project path.

### 2. Analyze Project Repository

Perform comprehensive project analysis by reading key files:

**Step 2.1: Read Basic Project Information**
- `README.md` or `README` - Project description and features
- `.git/config` - Git repository information (if available)

**Step 2.2: Identify Technology Stack**

Read configuration files to determine languages and frameworks:
- `package.json` - Node.js/TypeScript projects
- `Cargo.toml` - Rust projects
- `go.mod` - Go projects
- `requirements.txt` or `pyproject.toml` - Python projects
- `pom.xml` or `build.gradle` - Java projects
- `Gemfile` - Ruby projects

**Step 2.3: Explore Project Structure**

- List directories in project root
- Identify key directories (lib/, src/, cmd/, bin/, docs/, test/, etc.)
- Check for documentation directory (docs/, documentation/, etc.)
- Look for existing documentation files

**Step 2.4: Extract Project Metadata**

From the analysis, determine:
- **Project ID**: Derived from repository directory name (lowercase, hyphenated)
- **Project Name**: Human-readable name (from README or package.json)
- **Type**: Core Infrastructure, Service, Library, Tool, Documentation, etc.
- **Language(s)**: Primary programming languages
- **Description**: 2-3 sentence summary from README
- **Key Capabilities**: List of 6-10 main features
- **Tags**: 8-12 relevant tags for discovery (derived from tech stack, features)
- **Synonyms**: 3-5 alternative names users might use
- **Triggers**: Keywords for different intent types:
  - `ask_question`: Conceptual keywords
  - `develop`: Development task keywords
  - `test_or_run`: Testing/execution keywords
  - `debug`: Error/troubleshooting keywords
- **Dependencies**: What the project depends on
- **Depended On By**: What projects use this one

**Step 2.5: Get Current Commit for Sync Tracking**

```bash
cd <project-path>
INITIAL_COMMIT=$(git rev-parse HEAD)
INITIAL_DATE=$(date '+%Y-%m-%d %H:%M:%S')
```

### 3. Generate Short Name

Create a concise project ID (2-4 words, hyphenated):
- Use repository directory name as base
- Convert to lowercase
- Replace underscores/spaces with hyphens
- Remove special characters

### 4. Create Documentation Structure

**Step 4.1: Create Branch**

```bash
git checkout -b feat/docs-add-<project-id>
```

**Step 4.2: Create Directory Structure**

```bash
mkdir -p docs/projects/<project-id>/{system,testing,sop,tasks,change-log,pr-report}
```

**Step 4.3: Create Project INDEX.md**

Write `docs/projects/<project-id>/INDEX.md` with YAML frontmatter including:
- `project_id`
- `default_sections_by_intent` (qna, qa, dev, debug, monitoring)
- `aliases`
- `scripts` (derived from package.json, Makefile, etc.)

**Step 4.4: Create Core Documentation Files**

Create these files with content derived from project analysis:

| File | Size Limit | Content |
|------|-----------|---------|
| `system/project_overview.md` | 150 lines | What, features, tech stack, use cases |
| `system/architecture.md` | 700 words | Architecture diagram, components, data flow |
| `system/integration-with-arkd.md` | (if Ark-related) | Integration patterns |
| `testing/usage.md` | 120 lines | Quick start, config, Docker |
| `testing/how_to_run.md` | - | Prerequisites, deployment, env vars |
| `testing/how_to_test.md` | - | Unit/integration tests, coverage |
| `testing/troubleshooting.md` | - | Common issues, debugging |
| `testing/api-reference.md` | 200 lines/group | (if project has API) |
| `sop/development-workflow.md` | - | Build, test, PR workflow |

**Step 4.5: Create Sync Tracking Files**

- `change-log/last-sync.txt` — Initial commit hash
- `change-log/SYNC_HISTORY.md` — Initial sync entry

### 5. Update Master INDEX.md

Insert new project entry in `docs/INDEX.md` in alphabetical order with complete metadata (description, capabilities, tags, synonyms, triggers, dependencies).

Also update:
- Dependency Graph
- Correlation Matrix
- Technology Groupings

### 6. Validation

Verify:
- [ ] Project INDEX.md exists with YAML frontmatter
- [ ] All mandatory documentation files created
- [ ] Sync tracking files created
- [ ] Master INDEX.md updated with complete metadata
- [ ] No placeholder text remains
- [ ] File paths use environment variables
- [ ] File size limits respected

### 7. Commit Changes

Create conventional commit: `docs(<project-id>): add project to documentation registry`

### 8. Report Completion

Provide summary with files created, INDEX.md updates, sync tracking status, and next steps.

## Project Type Reference

| Type | Indicators | Key Commands |
|------|-----------|-------------|
| Go Backend | `go.mod`, `Makefile` | `make build`, `make test` |
| TypeScript Frontend | `package.json` + React/Vite | `pnpm install`, `pnpm run dev` |
| TypeScript Backend | `package.json` + Node.js | `pnpm install`, `pnpm run start:dev` |
| Infrastructure | `*.tf` files | `tofu init`, `tofu plan` |
| External Service | API-focused | Document integration |
| Library/SDK | API docs | Code samples |

## Guidelines

- **Concise**: Respect file size limits
- **Accurate**: Base content on actual project files, not assumptions
- **Complete**: Fill all mandatory sections
- **Consistent**: Follow patterns from existing projects (boltz-backend, fulmine, arkd)
- **Machine-readable**: Use proper YAML frontmatter, environment variables
