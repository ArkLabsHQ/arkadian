---
description: Analyze a project and add it to the Arkadian documentation registry with standardized structure.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding. The argument should be an absolute path to a project repository.

## Outline

This command automates the process of analyzing a project and adding comprehensive documentation to the Arkadian registry, following the same pattern used for existing projects like `boltz-backend`, `fulmine`, and `arkd`.

Given a project path, do this:

### 1. Validate Input

Check that the provided path:
- Is an absolute path
- Exists on the filesystem
- Contains recognizable project files (README, package.json, Cargo.toml, go.mod, etc.)

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

### 3. Generate Short Name

Create a concise project ID (2-4 words, hyphenated):
- Use repository directory name as base
- Convert to lowercase
- Replace underscores/spaces with hyphens
- Remove special characters

Examples:
- `/path/to/boltz-backend` → `boltz-backend`
- `/path/to/MyAwesomeProject` → `my-awesome-project`

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

Write `docs/projects/<project-id>/INDEX.md` with:

```yaml
---
project_id: <project-id>
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "testing/how_to_run.md"]
  debug:      ["testing/troubleshooting.md"]
  monitoring: ["testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md"]
scripts:
  # Derived from package.json, Makefile, or common patterns
  # Example: test: "npm test" or "make test"
---

# <Project Name> — Project Index

**<project-id>** is [description from analysis]

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/<project-id>/system/` — System Architecture & Components
Core documentation about <project-name> architecture and design:

- **system/project_overview.md** — What <project-name> is, features, and use cases
- **system/architecture.md** — Architecture overview and components
- **system/integration-with-arkd.md** — Integration with Ark ecosystem (if applicable)

### `${ARKADIAN_DIR}/docs/projects/<project-id>/testing/` — Usage & Operations
Practical guides for using and operating <project-name>:

- **testing/usage.md** — Quick start guide
- **testing/api-reference.md** — API documentation (if applicable)
- **testing/how_to_run.md** — Running the project
- **testing/how_to_test.md** — Testing guide

### `${ARKADIAN_DIR}/docs/projects/<project-id>/sop/` — Standard Operating Procedures
Step-by-step guides for operations.

### `${ARKADIAN_DIR}/docs/projects/<project-id>/tasks/` — Product Requirements & Plans
Feature specifications and implementation tracking.

### `change-log/` — Recent Changes
Curated summaries of significant changes.

### `pr-report/` — Pull Request Summaries
Analysis and summaries of pull requests.

---

[Include Quick Reference, Configuration, Architecture Overview sections based on project type]
```

**Step 4.4: Create Core Documentation Files**

Create these files with content derived from project analysis:

**a) `system/project_overview.md`**
- What is this project?
- Core features (from README and analysis)
- Technology stack
- Use cases
- Integration points (if Ark-related)

**b) `system/architecture.md`**
- High-level architecture diagram (ASCII art)
- Component breakdown
- Technology choices
- Data flow (if applicable)
- Security considerations

**c) `system/integration-with-arkd.md`** (if relevant to Ark ecosystem)
- How this project integrates with Ark
- Use cases for Ark users
- Configuration examples
- API integration patterns

**d) `testing/usage.md`**
- Quick start instructions
- Installation steps (from README)
- Configuration examples
- Docker deployment (if applicable)
- Common operations

**e) `testing/api-reference.md`** (if project has API)
- REST/gRPC endpoints
- Request/response formats
- Code examples
- Authentication

### 5. Update Master INDEX.md

**Step 5.1: Add Project Entry**

Insert new project entry in `docs/INDEX.md` in alphabetical order:

```markdown
### <project-id>
**ID**: `<project-id>`
**Name**: <Project Name>
**Type**: <Service|Library|Tool|etc>
**Language**: <Primary Languages>
**Index**: `${ARKADIAN_DIR}/docs/projects/<project-id>/INDEX.md`
**Repository**: <absolute-project-path>

**Description**:
[2-3 sentence description from analysis]

**Key Capabilities**:
- [Feature 1]
- [Feature 2]
...

**Tags**: `tag1`, `tag2`, ...

**Synonyms**: `synonym1`, `synonym2`, ...

**Triggers**:
- **ask_question**: `keyword1`, `keyword2`, ...
- **develop**: `keyword1`, `keyword2`, ...
- **test_or_run**: `keyword1`, `keyword2`, ...
- **debug**: `keyword1`, `keyword2`, ...

**Dependencies**: <What it depends on>
**Depended On By**: <What depends on it>

---
```

**Step 5.2: Update Dependency Graph**

Add project to the dependency graph section if it has dependencies or dependents.

**Step 5.3: Update Correlation Matrix**

Add relationships to the correlation matrix if the project integrates with other projects.

**Step 5.4: Update Technology Groupings**

Add project to the appropriate technology grouping (Go Projects, TypeScript Projects, etc.).

### 6. Validation

Verify documentation completeness:

- [ ] Project INDEX.md exists with YAML frontmatter
- [ ] All mandatory documentation files created (project_overview.md, architecture.md, usage.md)
- [ ] Master INDEX.md updated with complete metadata
- [ ] Dependency relationships documented
- [ ] Technology groupings updated
- [ ] No placeholder text remains (all [TODO] or [FIXME] removed)
- [ ] File paths use environment variables (`${ARKADIAN_DIR}`, `${PROJECT_REPO}`)

### 7. Commit Changes

Create conventional commit with detailed message:

```bash
git add docs/
git commit -m "$(cat <<'EOF'
docs(<project-id>): add project to documentation registry

Add comprehensive documentation for <project-id> project:
- Project INDEX.md with YAML frontmatter and default sections
- system/project_overview.md: Project overview, features, and use cases
- system/architecture.md: Architecture details and components
- testing/usage.md: Quick start, configuration, and deployment guide
[Add other files created]

Update master INDEX.md:
- Add <project-id> entry with full metadata
- Update dependency graph and correlation matrix
- Add to technology groupings

Repository location: <absolute-project-path>
EOF
)"
```

### 8. Report Completion

Provide summary:

```markdown
## Documentation Created Successfully

**Project**: <project-id> (<Project Name>)
**Branch**: feat/docs-add-<project-id>
**Repository**: <absolute-project-path>

### Files Created:
- docs/projects/<project-id>/INDEX.md
- docs/projects/<project-id>/system/project_overview.md
- docs/projects/<project-id>/system/architecture.md
[List all files]

### Master INDEX Updated:
- Project entry added
- Dependencies documented
- Integration points mapped

### Next Steps:
1. Review the generated documentation
2. Push branch: `git push origin feat/docs-add-<project-id>`
3. Create pull request (optional)
4. Test with AI agents to verify discoverability

### Usage Example:
Now you can ask AI agents about this project, and they will automatically load the documentation:
- "How does <project-name> work?"
- "What are the main features of <project-id>?"
- "How do I integrate <project-name> with arkd?"
```

## Guidelines

### Documentation Quality

- **Concise**: Keep each file focused (usage.md ≤ 120 lines, architecture.md ≤ 700 words)
- **Accurate**: Base all content on actual project files, not assumptions
- **Complete**: Fill all mandatory sections, remove inapplicable optional sections
- **Consistent**: Follow patterns from existing projects (boltz-backend, fulmine, arkd)
- **Machine-readable**: Use proper YAML frontmatter, environment variables

### Project Analysis Tips

- **Prioritize README**: Most accurate source for project description
- **Check package.json/Cargo.toml**: Definitive source for dependencies
- **Look for docs/**: Existing documentation to incorporate
- **Examine scripts**: package.json scripts, Makefile targets for common operations
- **Infer from structure**: lib/src/cmd directories reveal architecture

### Integration with Ark Ecosystem

If the project integrates with Ark (connects to arkd, uses VTXOs, etc.):
- **Create integration-with-arkd.md**: Explain how Ark users benefit
- **Document use cases**: Specific examples (like boltz-backend + fulmine)
- **Show configuration**: Environment variables, API endpoints
- **Provide examples**: Code snippets, API calls

If NOT Ark-related:
- Skip integration-with-arkd.md
- Mark as "External Service" or appropriate category
- Document as reference/dependency only

### Common Project Types

**External Service** (like boltz-backend):
- Focus on API integration
- Document how Ark projects use it
- Include self-hosting instructions

**Ark Core** (like arkd):
- Deep architecture documentation
- API reference critical
- Integration patterns with other projects

**Tool/CLI** (like ark-simulator):
- Usage-focused documentation
- Command reference
- Configuration options

**Library/SDK** (like go-sdk):
- API documentation
- Integration examples
- Code samples

## Error Handling

If analysis fails:
- **Missing README**: Extract description from code comments or ask user
- **Unknown tech stack**: Check for common files (.rb, .java, .cs, etc.)
- **No clear features**: List capabilities from code structure (has API, CLI, web UI, etc.)
- **Ambiguous dependencies**: Ask user to clarify

If project path is invalid:
- Error message with example: "/add-project /absolute/path/to/project"
- Suggest using tab completion or `pwd` output

## Example Usage

```bash
# Add boltz-backend project
/add-project /Users/dusansekulic/code/go/boltz-backend

# Add another project
/add-project /Users/username/projects/my-awesome-tool
```

## Notes

- **Run from arkadian repository root**: Ensures docs/ path is correct
- **Analyze before creating**: Complete all analysis before writing files
- **Follow existing patterns**: Use boltz-backend documentation as reference
- **Validate thoroughly**: Check all created files for completeness
- **Commit atomically**: Single commit with all changes
