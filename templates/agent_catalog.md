# Agent Catalog & Routing Rules

## Available Agents

| Agent | Purpose |
|-------|---------|
| `ark-guru` | Q&A, concepts, internal docs, explanations |
| `ark-project-manager` | specs, scoping, task trees, multi-agent workflows, acceptance criteria |
| `ark-developer` | **Full-stack implementation agent**: code changes, fixes, debugging, implementation, AND testing. Uses `arkd-dev-loop` and `fulmine-dev-loop` skills for testing — the orchestrator specifies which skill and mode via `testing` field in the execution spec. Runs tests internally with retry loop (up to 10 attempts). |
| `ark-researcher` | external research, prior art, API/library evaluation (fallback: ark-guru) |
| `ark-pr-reviewer` | Reviewer's assistant: PR analysis, attention ranking, draft review comments, Ark-specific context, risk assessment. Prepares briefings for human reviewers. |
| `ark-progress-tracker` | progress reports across 12 Ark projects, PR tracking via GitHub CLI, business value translation, cross-project coordination (has 4 modes: weekly, project-specific, feature, cross-project) |
| `ark-observer` | telemetry analysis, observability investigation, anomaly detection (queries Prometheus, Loki, Jaeger, AlertManager, Pyroscope; correlates data; identifies hot paths) |

## Agent Name Mapping

When workflow templates use short names, map to full agent names:

| Short Name | Full Agent Name |
|------------|-----------------|
| `guru` | `ark-guru` |
| `developer` | `ark-developer` |
| `tester` | `ark-developer` |
| `project-manager` | `ark-project-manager` |
| `researcher` | `ark-researcher` |
| `pr-reviewer` | `ark-pr-reviewer` |
| `progress-tracker` | `ark-progress-tracker` |
| `observer` | `ark-observer` |

## Step → Doc-Intent Mapping

When determining which documentation sections to include:

| Agent | Doc Intent | Fallback |
|-------|------------|----------|
| `ark-guru` | `qna` | - |
| `ark-developer` | `dev` | `qa` |
| `ark-project-manager` | `dev` | - |
| `ark-pr-reviewer` | `pr_review` | `dev` |
| `ark-researcher` | `research` | - |
| `ark-progress-tracker` | `progress_tracking` | `qna` |
| `ark-observer` | `debug` | - |

Use this mapping to select doc sections from `@templates/doc_intake_defaults.md` or from the project's `default_sections_by_intent` in its INDEX.md.

## Special Routing Rules

| Condition | Action |
|-----------|--------|
| **Development workflows** (code changes, fixes, features) | Route to `ark-developer` - it handles implement+test internally |
| **Testing requests** (run tests, test a feature, validate) | Route to `ark-developer` - it handles testing with dev-loop skills |
| **Environment setup** (start stack, run simulation) | Route to `ark-developer` - it knows how via dev-loop skills |
| Telemetry investigation, anomaly detection, performance troubleshooting | Route to `ark-observer` |
| High CPU/memory, error spikes, latency issues | `ark-observer` for investigation, `ark-developer` for fixes |
| Progress tracking, weekly reports, PR activity | Route to `ark-progress-tracker` |
| Large/critical PR analysis | `ark-pr-reviewer` (review briefing) + `ark-progress-tracker` (business context) in parallel |
| `monitor_or_alert` intent | Always add `ark-telemetry` project |
| `develop` on infra/deploy | Always add `ark-infra` project |
| `greenfield` | Consider: `arkd`, `go-sdk`, `ark-infra`, `ark-telemetry` + user-named projects |

## When to Use Each Agent

### Use `ark-developer` for:
- Implementing features (handles testing internally)
- Fixing bugs (handles testing internally)
- Code changes of any kind
- Debugging + fixing in single pass
- Running tests (uses arkd-dev-loop / fulmine-dev-loop skills)
- Setting up test environments
- Running simulations

## Backward Compatibility

| Legacy Name | Maps To |
|-------------|---------|
| `ark-runner` | `ark-developer` |
| `ark-tester` | `ark-developer` |
| `ark-env-tester` | `ark-developer` |
| `ark-debugger` | `ark-developer` |
