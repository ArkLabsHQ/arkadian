# Intent Classification

## Valid Intents

| Intent | Description |
|--------|-------------|
| `ask_question` | User wants information or explanation |
| `develop` | User wants code changes, features, or fixes |
| `debug` | User reports a problem or error |
| `test_or_run` | User wants to run tests or bring up environments |
| `analyze_pr_or_commits` | User wants PR/commit review |
| `progress_tracking` | User wants status reports or PR tracking |
| `monitor_or_alert` | User wants monitoring, alerts, or observability |
| `research` | User wants external research or comparisons |
| `greenfield` | User wants to build something new |
| `unknown` | Cannot classify with confidence |

## Sub-Intents

| Parent Intent | Sub-Intent | Description |
|---------------|------------|-------------|
| `develop` | `quick_fix` | Simple bug fix, typo, small change |
| `develop` | `small_feature` | Small feature, 1-2 files |
| `develop` | `medium_feature` | Medium feature, multiple files |
| `develop` | `large_feature` | Large feature, cross-cutting |
| `research` | `bitcoin_l2` | Bitcoin/L2 protocol research |
| `research` | `docs_scraping` | Documentation/website research |
| `research` | `offline_docs` | Offline documentation analysis |
| `research` | `github_analysis` | GitHub project analysis |
| `research` | `competitor_analysis` | Competitor analysis |
| `monitor_or_alert` | `existing_service` | Monitoring existing service |
| `test_or_run` | `stack_setup` | Stack/environment setup |
| `test_or_run` | `bootstrap` | Bootstrap new environment |

## Intent Classification Format

```yaml
intent_classification:
  primary: "<intent>"
  sub_intent: "<refinement>"  # e.g. "quick_fix", "small_feature", "medium_feature"
  complexity: "<low|medium|high>"
  urgency: "<normal|high|critical>"
  confidence: <0.00-1.00>
```

## Confidence Thresholds

| Confidence | Action |
|------------|--------|
| ≥ 0.8 (High) | Proceed with full context loading |
| 0.6-0.79 (Medium) | Load partial context, use fallbacks |
| < 0.6 (Low) | Ask clarifying question, do NOT load project docs |

## Projects Selected Format

```yaml
projects_selected:
  - id: "<project_id>"
    index_path: "${ARKADIAN_DIR}/docs/projects/<project_id>/INDEX.md"
    repo_path: "${<PROJECT_REPO_ENV>}"
    github_url: "<org/repo>"
    score: <0.00-1.00>
    reason: "<why selected>"
    depends_on: [...]
```

## Project Selection Limits

| Intent | Max Projects (N) |
|--------|------------------|
| `ask_question` | 1-2 |
| `analyze_pr_or_commits` | 1-2 |
| `develop` | 2-3 |
| `debug` | 2-3 |
| `test_or_run` | 2-3 |
| `greenfield` or multi-project | 3-5 |

**Hard cap**: Total selected projects (including dependencies) MUST NOT exceed 5.
