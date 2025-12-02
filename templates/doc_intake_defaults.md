# Documentation Intake Defaults

When `sections` is empty in the execution specification, auto-fill based on `context_intent`.

## Default Sections by Intent

### dev (Development)
```yaml
sections:
  - "system/project_overview.md"
  - "system/architecture.md"
  - "system/folder_structure.md"
  - "system/configuration.md"
  - "sop/development-workflow.md"
  - "sop/making-changes.md"
  - "testing/how_to_run.md"
  - "testing/how_to_test.md"
```

**Frontend add-ons** (if project is frontend or has `package.json`):
- Prepend: `system/tech-stack.md`, `system/components.md`

### qa (Quality Assurance)
```yaml
sections:
  - "testing/how_to_run.md"
  - "testing/usage.md"
  - "testing/how_to_test.md"
  - "testing/troubleshooting.md"
  - "system/architecture.md"
```

### debug (Debugging)
```yaml
sections:
  - "testing/troubleshooting.md"
  - "system/integration_points.md"
  - "system/architecture.md"
  - "system/configuration.md"
```

### qna (Questions & Answers)
```yaml
sections:
  - "system/project_overview.md"
  - "system/architecture.md"
  - "testing/usage.md"
```

### pr_review (Pull Request Review)
```yaml
sections:
  - "system/architecture.md"
  - "system/folder_structure.md"
  - "sop/development-workflow.md"
```

### research (Research)
```yaml
sections:
  - "system/project_overview.md"
  - "system/architecture.md"
  - "system/tech_stack.md"
```

### progress_tracking (Progress Tracking)
```yaml
sections:
  - "system/project_overview.md"
  - "system/architecture.md"
  - "testing/usage.md"
  - "sop/development-workflow.md"
```

## Selection Rules

1. **Keep order** - sections should be loaded in the order specified
2. **Include only existing files** - check before adding
3. **De-duplicate** - don't repeat sections across projects
4. **Cap at 8 sections per project** - to keep context lean

## Priority Order

1. Use `default_sections_by_intent` from project's INDEX.md if present
2. Otherwise, use the defaults above

**Injection note**: During step expansion, if a project's `INDEX.md` exposes its own `default_sections_by_intent`, prefer that list; otherwise apply these defaults.
