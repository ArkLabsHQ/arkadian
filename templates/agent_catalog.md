# Agent Catalog & Routing Rules

## Available Agents

| Agent | Purpose |
|-------|---------|
| `ark-guru` | Q&A, concepts, internal docs, explanations |
| `ark-project-manager` | specs, scoping, task trees, multi-agent workflows, acceptance criteria |
| `ark-developer` | code changes, fixes, implementation, unit/integration tests, SOP creation |
| `ark-env-tester` | environment setup, Docker Compose, simulations, integration/E2E/regression tests, smoke checks |
| `ark-researcher` | external research, prior art, API/library evaluation (fallback: ark-guru) |
| `ark-pr-reviewer` | PR/commit/diff analysis, architecture consistency, test coverage, risk notes |
| `ark-progress-tracker` | progress reports across 12 Ark projects, PR tracking via GitHub CLI, business value translation, cross-project coordination (has 4 modes: weekly, project-specific, feature, cross-project) |
| `ark-observer` | telemetry analysis, observability investigation, anomaly detection (queries Prometheus, Loki, Jaeger, AlertManager, Pyroscope; correlates data; identifies hot paths) |

## Agent Name Mapping

When workflow templates use short names, map to full agent names:

| Short Name | Full Agent Name |
|------------|-----------------|
| `guru` | `ark-guru` |
| `developer` | `ark-developer` |
| `tester` | `ark-env-tester` |
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
| `ark-developer` | `dev` | - |
| `ark-env-tester` | `qa` | - |
| `ark-project-manager` | `dev` | - |
| `ark-pr-reviewer` | `pr_review` | `dev` |
| `ark-researcher` | `research` | - |
| `ark-progress-tracker` | `progress_tracking` | `qna` |
| `ark-observer` | `debug` | - |

Use this mapping to select doc sections from `@templates/doc_intake_defaults.md` or from the project's `default_sections_by_intent` in its INDEX.md.

## Special Routing Rules

| Condition | Action |
|-----------|--------|
| Environment setup, cross-stack validation, simulations | Include `ark-env-tester` |
| Monitor/alert requests | Include `ark-telemetry` project, route execution to `ark-env-tester` |
| Telemetry investigation, anomaly detection, performance troubleshooting | Route to `ark-observer` |
| High CPU/memory, error spikes, latency issues | `ark-observer` for investigation, `ark-developer` for fixes |
| Progress tracking, weekly reports, PR activity | Route to `ark-progress-tracker` |
| Large/critical PR analysis | `ark-pr-reviewer` + `ark-progress-tracker` in parallel |
| `monitor_or_alert` intent | Always add `ark-telemetry` project |
| `develop` on infra/deploy | Always add `ark-infra` project |
| `greenfield` | Consider: `arkd`, `go-sdk`, `ark-infra`, `ark-telemetry` + user-named projects |

## Backward Compatibility

| Legacy Name | Maps To |
|-------------|---------|
| `ark-runner` | `ark-env-tester` |
| `ark-tester` | `ark-env-tester` |
