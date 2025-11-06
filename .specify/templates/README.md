# Speckit Templates

This directory contains template files used by the Speckit workflow system for structured feature development in the Arkadian project.

## Purpose

Speckit provides a systematic approach to feature development through structured documents:
- **Specifications** define what to build (user stories, requirements, success criteria)
- **Plans** define how to build it (tech stack, architecture, implementation phases)
- **Tasks** break down the work (dependency-ordered, user story mapped)
- **Checklists** validate quality (acceptance criteria, test coverage)

These templates ensure consistency across features and enable AI agents (particularly `ark-project-manager`) to generate well-structured documentation.

---

## Active Templates

### 1. `spec-template.md` (3.9 KB)

**Purpose**: Feature specification template
**Used by**: `/speckit.specify` command
**Output location**: `/specs/<###-feature-name>/spec.md`

**Structure**:
- Prioritized user stories (P1, P2, P3) with independent test scenarios
- Functional requirements (FR-001, FR-002, ...)
- Key entities and relationships
- Success criteria (measurable outcomes)
- Edge cases and constraints

**Example usage**:
```bash
/speckit.specify Add OAuth2 authentication for API endpoints
```

**What it generates**:
- `/specs/042-oauth2-auth/spec.md` with user stories like:
  - "As an API consumer, I want to authenticate via OAuth2..."
  - Functional requirements: "System MUST validate JWT tokens"
  - Success criteria: "95% of auth attempts succeed in <200ms"

---

### 2. `plan-template.md` (3.7 KB)

**Purpose**: Implementation planning template
**Used by**: `/speckit.plan` command
**Output location**: `/specs/<###-feature-name>/plan.md`

**Structure**:
- Technical context (language, dependencies, storage, testing)
- Constitution checks (project principles validation)
- Project structure (documentation, source code layout)
- Implementation phases (Phase 0: Research → Phase 1: Design → Phase 2: Build → Phase 3: Test)
- File-level breakdown (which files to create/modify)

**Example usage**:
```bash
/speckit.plan
```
(Reads from `spec.md` in current feature directory)

**What it generates**:
- `/specs/042-oauth2-auth/plan.md` with:
  - Tech stack: Go, `golang.org/x/oauth2`, PostgreSQL
  - Files to create: `internal/auth/oauth2.go`, tests, migrations
  - Phase breakdown with acceptance gates

---

### 3. `tasks-template.md` (9.2 KB)

**Purpose**: Task generation template
**Used by**: `/speckit.tasks` command
**Output location**: `/specs/<###-feature-name>/tasks.md`

**Structure**:
- Tasks organized by user story
- Dependency graph (which user stories must complete first)
- Task IDs with priorities and types (DEV, TEST, DOCS)
- Parallel execution examples
- Acceptance criteria per task

**Example usage**:
```bash
/speckit.tasks
```
(Reads from `spec.md` and `plan.md` in current feature directory)

**What it generates**:
- `/specs/042-oauth2-auth/tasks.md` with:
  - Task groups: Setup, US1-Auth-Flow, US2-Token-Refresh, Testing
  - Dependencies: US1 → US2 (token refresh requires auth flow)
  - Parallel tasks: DEV-001, DEV-002 can run together

---

### 4. `checklist-template.md` (1.3 KB)

**Purpose**: Quality validation checklist
**Used by**: `/speckit.checklist` command
**Output location**: `/specs/<###-feature-name>/checklist.md`

**Structure**:
- Categories: Requirements, Testing, Documentation, Security, Performance
- Checklist items with unique IDs (CHK001, CHK002, ...)
- Checkbox format for tracking completion

**Example usage**:
```bash
/speckit.checklist
```

**What it generates**:
- `/specs/042-oauth2-auth/checklist.md` with:
  - `- [ ] CHK001 All user stories implemented`
  - `- [ ] CHK015 Security audit completed`
  - `- [ ] CHK023 API documentation updated`

---

### 5. `agent-file-template.md` (464 bytes)

**Purpose**: Template for creating new agent definition files
**Status**: Reserved for future use
**Not currently referenced by any commands**

Structure for agent metadata (name, description, model, capabilities).

---

## Deprecated Templates

### `workflows/` directory

**Status**: ⚠️ Superseded
**Reason**: Workflow templates migrated to `/workflows/` (project root)
**Action**: Can be archived or removed

The orchestrator now loads workflows from `/workflows/` instead of `.specify/templates/workflows/`.

---

## Template Usage Workflow

```
┌─────────────────────┐
│  User Request       │
│  "Add OAuth2 auth"  │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────────────┐
│  /speckit.specify           │
│  (slash command)            │
└──────────┬──────────────────┘
           │
           ↓
┌─────────────────────────────┐
│  Load spec-template.md      │
│  from .specify/templates/   │
└──────────┬──────────────────┘
           │
           ↓
┌─────────────────────────────┐
│  Fill template with         │
│  feature-specific content   │
└──────────┬──────────────────┘
           │
           ↓
┌─────────────────────────────┐
│  Write to                   │
│  /specs/042-oauth2-auth/    │
│  spec.md                    │
└─────────────────────────────┘
```

Then repeat for `plan.md`, `tasks.md`, `checklist.md`.

---

## Integration with Arkadian Agents

### Primary User: `ark-project-manager`

The `ark-project-manager` agent uses Speckit commands (which load these templates) to:
1. **Scope features** from natural language descriptions
2. **Generate implementation plans** with tech stack and architecture
3. **Break down work** into actionable, dependency-ordered tasks
4. **Validate quality** with checklists

### Slash Commands

Located in `/commands/`:
- `speckit.specify.md` - Create specifications
- `speckit.plan.md` - Generate implementation plans
- `speckit.tasks.md` - Generate task lists
- `speckit.checklist.md` - Generate quality checklists
- `speckit.constitution.md` - Validate template consistency

### Skills

Located in `/skills/`:
- `pm-spec/` - Wraps `/speckit.specify` for ark-project-manager
- `pm-plan/` - Wraps `/speckit.plan`
- `pm-tasks/` - Wraps `/speckit.tasks`
- `pm-checklist/` - Wraps `/speckit.checklist`

---

## Output Structure

All generated files go to: `/specs/<###-feature-name>/`

Example feature directory:
```
/specs/042-oauth2-auth/
├── spec.md          ← From spec-template.md
├── plan.md          ← From plan-template.md
├── tasks.md         ← From tasks-template.md
├── checklist.md     ← From checklist-template.md
├── research.md      ← (optional, generated by plan phase)
├── data-model.md    ← (optional, if feature has entities)
└── contracts/       ← (optional, API endpoints)
```

---

## Template Maintenance

### When to Update Templates

1. **New project principles** - Update constitution checks in `plan-template.md`
2. **New requirement types** - Add to `spec-template.md` structure
3. **New task categories** - Add to `tasks-template.md` taxonomy
4. **New quality gates** - Add to `checklist-template.md` categories

### Validation

After updating templates, run:
```bash
/speckit.constitution
```

This ensures all templates are consistent with project principles.

---

## Template Design Principles

1. **Structured but flexible** - Consistent sections, but content adapts to feature
2. **Technology-agnostic** - Specs describe *what*, not *how*
3. **Independently testable** - Each user story can be tested standalone
4. **Dependency-explicit** - Tasks/stories clearly state prerequisites
5. **Measurable outcomes** - Success criteria are quantifiable

---

## Examples

### Simple Feature: "Add Health Check Endpoint"
- **spec.md**: 1 user story (P1: API returns 200 OK)
- **plan.md**: Minimal (add 1 route, 1 test)
- **tasks.md**: 3 tasks (implement, test, document)

### Complex Feature: "Multi-Database Support"
- **spec.md**: 4 user stories (P1: SQLite, P2: PostgreSQL, P3: Badger, P4: Migration)
- **plan.md**: Research phase for abstraction layer, 4 implementation phases
- **tasks.md**: 30+ tasks, dependency graph, parallel execution groups

---

## Frequently Asked Questions

### Q: Can I modify templates?
**A**: Yes, but validate with `/speckit.constitution` after changes.

### Q: Why separate spec from plan?
**A**: Specs are *what* (requirements, user stories) - technology-agnostic.
Plans are *how* (tech stack, architecture) - implementation-specific.
This separation allows multiple implementation approaches for the same spec.

### Q: What's the difference between tasks.md and GitHub issues?
**A**: `tasks.md` is implementation-focused, dependency-ordered, and mapped to user stories.
GitHub issues are tracking-focused, may include bugs/enhancements/discussions.
You can create GitHub issues *from* tasks.md.

### Q: Do I need all 4 documents for every feature?
**A**: Minimum: `spec.md` (requirements). Others optional but recommended for complex features.

---

## Related Documentation

- `/commands/` - Slash commands that use these templates
- `/agents/ark-project-manager.md` - Agent that orchestrates Speckit workflow
- `/specs/` - Output directory for generated documents
- `/workflows/` - Workflow templates for orchestrator (separate from Speckit)

---

**Last Updated**: 2025-11-06
**Maintained By**: Arkadian Core Team
**Status**: Active - Core Infrastructure
