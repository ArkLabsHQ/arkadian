# Artifact Output Policy

This document defines where agents should write generated artifacts (reports, analysis, logs) that are not code or documentation updates.

## Core Rule

**All session artifacts MUST be written to:**
```
${ARKADIAN_DIR}/artifacts/<SESSION_ID>/
```

Where `SESSION_ID` is the date-time when the session started: `YYYYMMDD-HHMMSS`

Example: `${ARKADIAN_DIR}/artifacts/20251127-143052/`

## What Goes to Artifacts Folder

These file types MUST go to the session artifacts folder:

- **Investigation reports**: `cpu_analysis.md`, `incident_report.md`, `latency_investigation.md`
- **Progress reports**: `weekly_summary.md`, `feature_tracking.md`, `project_health.md`
- **PR review reports**: `pr_123_review.md`, `weekly_commits.md`
- **Research reports**: `taproot_research.md`, `lightning_comparison.md`
- **Test reports**: `test_results.md`, `coverage_report.md`, `e2e_results.md`
- **Environment reports**: `health_matrix.md`, `stack_status.md`
- **Any generated analysis**: Anything not updating docs or code

## What Does NOT Go to Artifacts Folder

These have their own designated locations:

| Type | Correct Location | Example |
|------|------------------|---------|
| Code changes | Project repos | `${ARKD_REPO}/internal/...` |
| Documentation updates | Arkadian docs | `${ARKADIAN_DIR}/docs/projects/arkd/...` |
| Spec/plan files | Specs folder | `${ARKADIAN_DIR}/specs/<feature>/spec.md` |
| SOPs | Project SOP folder | `${ARKADIAN_DIR}/docs/projects/arkd/sop/...` |
| Constitution | Memory folder | `${ARKADIAN_DIR}/.specify/memory/constitution.md` |

## Creating Session Folder

Before writing any artifact, ensure the session folder exists:

```bash
# Get or create session ID (use existing if set, or create new)
SESSION_ID="${SESSION_ID:-$(date +%Y%m%d-%H%M%S)}"
ARTIFACT_DIR="${ARKADIAN_DIR}/artifacts/${SESSION_ID}"
mkdir -p "$ARTIFACT_DIR"
```

## Artifact Naming Convention

Use descriptive, consistent names:

```
<type>_<subject>_<optional-detail>.md
```

Examples:
- `cpu_analysis_arkd_36h.md`
- `pr_review_arkd_123.md`
- `weekly_progress_2024w47.md`
- `research_taproot_ark.md`
- `test_results_integration.md`
- `incident_report_error_spike.md`

## Agent-Specific Guidelines

### ark-observer
```
${ARKADIAN_DIR}/artifacts/<SESSION_ID>/
├── cpu_analysis_<service>_<duration>.md
├── error_investigation_<date>.md
├── latency_report_<service>.md
└── incident_report_<incident_id>.md
```

### ark-progress-tracker
```
${ARKADIAN_DIR}/artifacts/<SESSION_ID>/
├── weekly_progress_<week>.md
├── project_health_<project>.md
├── feature_tracking_<feature>.md
└── cross_project_coordination.md
```

### ark-pr-reviewer
```
${ARKADIAN_DIR}/artifacts/<SESSION_ID>/
├── pr_review_<repo>_<number>.md
├── weekly_commits_<week>.md
└── breaking_changes_analysis.md
```

### ark-researcher
```
${ARKADIAN_DIR}/artifacts/<SESSION_ID>/
├── research_<topic>.md
├── comparison_<protocol_a>_vs_<protocol_b>.md
└── bip_analysis_<bip_number>.md
```

### ark-env-tester
```
${ARKADIAN_DIR}/artifacts/<SESSION_ID>/
├── test_results_<project>_<tier>.md
├── coverage_report_<project>.md
├── health_matrix_<stack>.md
└── environment_validation.md
```

### ark-developer
```
${ARKADIAN_DIR}/artifacts/<SESSION_ID>/
├── <project>_doc_gist.md
├── implementation_summary.md
└── validation_results.md
```

## Implementation in Agents

Each agent that generates artifacts should include this section:

```markdown
## ARTIFACT OUTPUT RULES

Before writing ANY artifact file:

1. **Determine if it's an artifact**: Reports, analysis, logs = artifact. Code, docs = not artifact.

2. **Create session folder** (if not exists):
   ```bash
   SESSION_ID="${SESSION_ID:-$(date +%Y%m%d-%H%M%S)}"
   mkdir -p "${ARKADIAN_DIR}/artifacts/${SESSION_ID}"
   ```

3. **Write to session folder**:
   ```bash
   # CORRECT
   ${ARKADIAN_DIR}/artifacts/${SESSION_ID}/cpu_analysis_arkd.md

   # WRONG - never do these
   ${ARKADIAN_DIR}/cpu_analysis_arkd.md
   ${ARKD_REPO}/cpu_analysis_arkd.md
   ./artifacts/cpu_analysis_arkd.md
   ```

4. **Exceptions** (allowed elsewhere):
   - Code → project repos
   - Docs → `${ARKADIAN_DIR}/docs/`
   - Specs → `${ARKADIAN_DIR}/specs/`
```

## Cleanup

Session folders are not auto-deleted. User can clean up old sessions:

```bash
# List all sessions
ls -la ${ARKADIAN_DIR}/artifacts/

# Remove sessions older than 30 days
find ${ARKADIAN_DIR}/artifacts/ -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;
```
