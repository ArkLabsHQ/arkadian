# Arkadian New Features & Enhancements

This document outlines planned enhancements to the Arkadian AI assistant system, including automated validation loops, extended research capabilities, and a new telemetry analysis agent.

---

## Feature 1: Automated Validation Loop for ark-developer

**Priority**: High | **Effort**: Medium | **Status**: Planned

### Problem
Currently, `ark-developer` creates code implementations and hands off to `ark-env-tester` for validation, but does not automatically retry if tests fail. This requires manual intervention and multiple orchestration cycles.

### Solution
Modify `ark-developer` to automatically spawn `ark-env-tester` after implementation and retry up to 10 times on test failures.

### Implementation Details

**Changes to**: `agents/ark-developer.md`

**New Section**: "AUTOMATED VALIDATION PROTOCOL"

**Validation Loop Flow**:
```yaml
validation_loop:
  trigger: After code implementation complete

  steps:
    1. Generate code changes (diffs)
    2. Spawn ark-env-tester via Task tool
    3. Wait for test results
    4. If PASS: proceed to final output
    5. If FAIL:
       - Parse test failures
       - Analyze root cause
       - Apply fix to code
       - Increment retry counter
       - Go to step 2 (max 10 attempts)

  constraints:
    - max_attempts: 10
    - timebox_per_attempt: 5 minutes
    - total_max_time: 50 minutes
    - give_up_after: 10 consecutive failures

  output:
    - validation_summary: "passed after N attempts" | "failed after 10 attempts"
    - attempt_history: [attempt1, attempt2, ...]
    - final_test_results: from ark-env-tester
```

**Key Implementation Points**:
1. Use **Task tool** (not bash) to spawn ark-env-tester
2. Parse test output for specific failures
3. On failure: Read error messages, identify root cause, generate fix
4. Track attempt count (1-10)
5. Include validation history in final output

**Example Workflow**:
```
Attempt 1: Implement feature → Test → FAIL (missing import)
Attempt 2: Fix import → Test → FAIL (wrong function signature)
Attempt 3: Fix signature → Test → PASS
Result: "Validation passed after 3 attempts"
```

**Success Criteria**:
- ✅ New section added to ark-developer.md
- ✅ Retry logic documented (max 10 attempts)
- ✅ Failure analysis and fix logic described
- ✅ Task tool usage for spawning ark-env-tester
- ✅ Timebox per attempt: 5 minutes
- ✅ Examples of failure → fix → retry cycle

---

## Feature 2: GitHub Project Research Workflow

**Priority**: High | **Effort**: Medium | **Status**: Planned

### Problem
`ark-researcher` currently only handles Bitcoin/L2 web research. There's no workflow for analyzing external GitHub projects to understand their architecture, usage, and potential integration with Ark.

### Solution
Create a new workflow that enables `ark-researcher` to clone GitHub repositories, analyze their structure and code, and generate comprehensive research reports.

### Implementation Details

**New File**: `workflows/github_project_research.yaml`

**Workflow Phases**:
```yaml
phases:
  1. clone:
     - Clone GitHub repository to temporary location
     - Verify clone successful
     - Record metadata (stars, forks, last update, language)

  2. analyze_structure:
     - Analyze directory structure
     - Identify tech stack (languages, frameworks, build tools)
     - Find documentation (README, CONTRIBUTING, docs/)
     - Identify entry points (main.go, index.ts, package.json)

  3. understand_purpose:
     - Read README.md and core documentation
     - Parse package manifests (go.mod, package.json, requirements.txt)
     - Extract: project description, goals, key features

  4. code_analysis:
     - Analyze key source files (≤ 10 most important files)
     - Identify core abstractions, patterns, architecture
     - Find API surface (exported functions, REST endpoints, CLI commands)
     - Detect dependencies and integration points

  5. usage_guide:
     - Extract installation/setup steps
     - Find usage examples from README or examples/
     - Document CLI commands or API endpoints
     - Identify configuration options

  6. generate_report:
     - Create comprehensive research report
     - Format: Markdown with sections below
     - Save to: artifacts/research/github/<project-name>.md
```

**Report Template**:
```markdown
# GitHub Project Research: [Project Name]

**Repository**: github.com/org/repo
**Stars**: [count] | **Forks**: [count] | **Last Update**: [date]
**Language**: [primary] | **License**: [license]

## Executive Summary
[1-2 paragraph overview]

## Project Purpose
- **What it does**: [description]
- **Problem it solves**: [problem statement]
- **Target users**: [audience]

## Architecture
- **Tech Stack**: [languages, frameworks, databases]
- **Key Components**: [main components]
- **Design Patterns**: [identified patterns]

## Key Features
1. Feature 1
2. Feature 2
3. Feature 3

## How It Works
[High-level workflow description]

## Installation & Setup
[Setup commands]

## Usage Examples
[Code examples or CLI commands]

## API Reference
[Key functions/endpoints]

## Integration Guide for Ark
- Integration point 1
- Integration point 2

## Dependencies
[Key dependencies and purposes]

## Comparison to Ark Projects
[Similarities/differences with ark-* projects]

## Potential Use Cases for Ark
1. Use case 1
2. Use case 2

## Unknowns & Follow-up Questions
- Question 1
- Question 2

---
**Research Date**: [date]
**Cloned to**: [temp path]
```

**Use Cases**:
- Research competitor protocols (e.g., Mercury Layer, Fedimint)
- Analyze Bitcoin libraries (e.g., btcd, bitcoin-core)
- Understand potential dependencies before integration
- Learn from similar projects' architectures

**Success Criteria**:
- ✅ New workflow file created
- ✅ 6-phase workflow implemented
- ✅ Clones to temporary location (not polluting workspace)
- ✅ Report saved to artifacts/research/github/
- ✅ Handles multiple languages (Go, TypeScript, Python, Rust)
- ✅ Respects large repositories (analyzes ≤ 10 key files)

---

## Feature 3: Documentation Website Scraping Workflow

**Priority**: High | **Effort**: Medium | **Status**: Planned

### Problem
`ark-researcher` cannot save external documentation websites for offline access. Developers often need local copies of documentation (e.g., Claude Code docs, Bitcoin Core docs) for faster research and offline development.

### Solution
Create a workflow that scrapes documentation websites, saves them locally as markdown, and generates an index for easy navigation.

### Implementation Details

**New File**: `workflows/docs_website_research.yaml`

**Workflow Phases**:
```yaml
phases:
  1. discover:
     - Fetch main documentation URL
     - Identify documentation structure (sitemap.xml, navigation menu)
     - Detect framework (Mintlify, Docusaurus, MkDocs, GitBook, etc.)
     - Extract list of all documentation pages

  2. scrape:
     - Fetch all documentation pages via WebFetch tool
     - Extract markdown or HTML content
     - Download images and assets
     - Respect rate limits: 1 page per second
     - Max pages: 100 per session
     - Timebox: 10 minutes

  3. save_locally:
     - Create artifacts/docs/<site-name>/ directory
     - Save each page as markdown file
     - Preserve directory structure from website
     - Download and save images to assets/
     - Convert HTML to markdown where needed

  4. create_index:
     - Generate INDEX.md with complete site map
     - Create search index (keyword → file mapping)
     - Generate hierarchical table of contents
     - Add metadata: scrape date, total pages, size

  5. usage_guide:
     - Create USAGE.md with quick start guide
     - Document how to search local docs
     - List key topics and file locations
     - Add tips for navigating documentation
```

**Local Documentation Structure**:
```
artifacts/docs/<site-name>/
├── INDEX.md              # Site map and metadata
├── USAGE.md              # How to use these docs
├── search-index.json     # Keyword search index
├── pages/
│   ├── getting-started.md
│   ├── api-reference.md
│   ├── guides/
│   │   ├── tutorial-1.md
│   │   └── tutorial-2.md
│   └── reference/
│       └── functions.md
└── assets/
    ├── images/
    └── diagrams/
```

**Example: Claude Code Documentation**:
```bash
User request: "scrape Claude Code documentation and save locally"

Result:
  Location: artifacts/docs/claude-code/
  Pages saved: 47
  Total size: 2.3 MB
  Scrape date: 2025-01-06

  Key sections:
    - Installation & Setup
    - Writing Agents
    - Tool Usage
    - Best Practices
    - API Reference
```

**Constraints**:
- Rate limit: 1 request per second (respect servers)
- Max pages: 100 per session (prevents runaway scraping)
- Timebox: 10 minutes max
- Respect robots.txt
- Use WebFetch tool (not curl/wget)

**Use Cases**:
- Save Claude Code documentation locally
- Archive Bitcoin documentation (bitcoincore.org, developer.bitcoin.org)
- Keep Lightning Network specs (BOLTs) offline
- Store framework docs (Go, TypeScript, React) for quick reference

**Success Criteria**:
- ✅ New workflow file created
- ✅ 5-phase workflow implemented
- ✅ Saves to artifacts/docs/<site-name>/
- ✅ Generates INDEX.md and USAGE.md
- ✅ Respects rate limits and timeboxes
- ✅ Converts HTML to markdown
- ✅ Downloads images and assets
- ✅ Creates searchable keyword index

---

## Feature 4: ark-observer Agent (Telemetry Analysis)

**Priority**: High | **Effort**: High | **Status**: Planned

### Problem
No specialized agent for analyzing telemetry data from ark-telemetry stack (Prometheus, Loki, Jaeger, AlertManager). Developers manually query these systems during incidents, leading to slower root cause analysis.

### Solution
Create `ark-observer` agent that can query telemetry systems, correlate data across metrics/logs/traces, analyze code to find hot paths, and generate comprehensive investigation reports.

### Implementation Details

**New File**: `agents/ark-observer.md`

**Agent Capabilities**:
```yaml
name: ark-observer
role: Telemetry Analysis & Observability Agent

telemetry_providers:
  prometheus:
    endpoint: http://localhost:9090
    query_language: PromQL
    use_cases:
      - CPU/memory usage analysis
      - Request rate and throughput
      - Error rate monitoring
      - Latency percentiles (p50, p90, p99)
    common_queries:
      - CPU: rate(process_cpu_seconds_total[5m])
      - Memory: process_resident_memory_bytes
      - Requests: rate(http_requests_total[1m])
      - Errors: rate(http_requests_total{status=~"5.."}[5m])

  loki:
    endpoint: http://localhost:3100
    query_language: LogQL
    use_cases:
      - Error log investigation
      - Pattern detection in logs
      - Trace log correlation
    common_queries:
      - Errors: {job="arkd"} |= "error"
      - Pattern: {job="arkd"} |~ "VTXO.*not found"
      - Time range: {job="arkd"} [1h]

  jaeger:
    endpoint: http://localhost:16686
    interface: Web UI + API
    use_cases:
      - Request flow visualization
      - Bottleneck detection
      - Service dependency mapping
      - Latency breakdown by span

  alertmanager:
    endpoint: http://localhost:9093
    operations:
      - List active alerts
      - Alert history
      - Silence management
      - Alert correlation

  pyroscope:
    status: NOT IN CURRENT ARK-TELEMETRY STACK
    note: User mentioned, but not yet implemented
    future: Can be added to ark-telemetry

code_correlation:
  - Read arkd code at ${ARKD_REPO}
  - Read arkd-wallet code at ${ARKD_REPO}/internal/wallet/
  - Correlate telemetry spans with code functions
  - Identify hot paths causing performance issues
  - Suggest code optimizations

environments:
  local:
    description: Local ark-telemetry stack
    endpoints: Default localhost ports

  production:
    description: Port-forwarded production stack
    setup: |
      kubectl port-forward svc/prometheus 9090:9090 -n ark-telemetry
      kubectl port-forward svc/loki 3100:3100 -n ark-telemetry
      kubectl port-forward svc/jaeger-query 16686:16686 -n ark-telemetry
      kubectl port-forward svc/alertmanager 9093:9093 -n ark-telemetry
```

**Investigation Workflows**:

### Workflow 1: High CPU Investigation
```yaml
trigger: User reports "high CPU in last hour"

steps:
  1. Query Prometheus for CPU usage:
     - rate(process_cpu_seconds_total{job="arkd"}[1h])
     - Identify spike time and duration

  2. Check Logs during spike window:
     - {job="arkd"} [spike_start:spike_end]
     - Look for errors, warnings, unusual patterns

  3. Analyze Traces (if high request volume):
     - Find slowest traces during spike
     - Identify bottleneck spans (DB queries, RPC calls)

  4. Code Correlation:
     - Read arkd hot paths based on trace data
     - Identify inefficient algorithms or queries
     - Check for N+1 queries, missing indexes

  5. Generate Report:
     - Timeline visualization
     - Root cause analysis
     - Code suggestions
     - Preventive measures (alerts, optimizations)
```

### Workflow 2: Error Rate Spike
```yaml
trigger: AlertManager fires "ErrorRateHigh" alert

steps:
  1. Check Alert Details:
     - Query AlertManager for alert metadata
     - Identify affected service and time range

  2. Query Error Metrics:
     - Prometheus: Error rate over time
     - Identify error types (4xx vs 5xx)

  3. Extract Error Logs:
     - Loki query for error messages
     - Extract stack traces and error details

  4. Trace Failed Requests:
     - Jaeger search for traces with error status
     - Analyze request flow leading to error

  5. Code Analysis:
     - Locate error-throwing code paths
     - Check for missing error handling
     - Identify edge cases

  6. Report:
     - Root cause explanation
     - Fix suggestions
     - Test recommendations
```

### Workflow 3: Latency Degradation
```yaml
trigger: User reports "slow response times"

steps:
  1. Query Latency Metrics:
     - Prometheus p50/p90/p99 latencies
     - Compare to historical baseline

  2. Find Slow Traces:
     - Jaeger: traces with duration > 1s
     - Identify which endpoints are slow

  3. Identify Bottleneck:
     - Analyze spans: DB, RPC, computation
     - Find which span contributes most to latency

  4. Code Review:
     - Read code for slow spans
     - Check for blocking operations
     - Identify missing indexes or inefficient queries

  5. Suggest Optimizations:
     - Caching strategies
     - Database indexing
     - Async operations
     - Query optimization
```

**Investigation Report Format**:
```markdown
# Telemetry Investigation: [Issue Title]

**Time Range**: [start] - [end]
**Services Affected**: [arkd, arkd-wallet, etc.]
**Severity**: [P0-Critical / P1-High / P2-Medium / P3-Low]

## Executive Summary
[1-2 sentence summary of issue and root cause]

## Timeline
- [timestamp]: Incident start
- [timestamp]: First alert fired
- [timestamp]: Peak impact
- [timestamp]: Root cause identified
- [timestamp]: Issue resolved

## Metrics Analysis (Prometheus)
[PromQL queries and results]
[Data visualization or tables]

## Log Analysis (Loki)
[LogQL queries]
[Relevant log excerpts with timestamps]

## Trace Analysis (Jaeger)
[Slow traces identified]
[Bottleneck spans highlighted]
[Service dependency diagram]

## Alerts (AlertManager)
[Active alerts during incident]
[Alert firing timeline]

## Code Correlation
**Files Reviewed**:
- internal/core/service.go:123-145
- internal/infrastructure/db.go:67-89

**Hot Paths Identified**:
- Function X called 10,000 times during spike
- Missing database index on table Y

**Issues Found**:
- N+1 query in list operation
- Inefficient loop with nested DB calls

## Root Cause
[Detailed explanation with evidence from metrics, logs, traces]

## Impact
- CPU usage: 30% → 95% (+217%)
- Error rate: 0.1% → 5% (+4900%)
- p99 latency: 500ms → 3s (+500%)
- Requests affected: ~2,500

## Recommendations

### Immediate (< 1 hour)
1. Add database index on table Y, column Z
2. Restart service to clear memory leak

### Short-term (< 1 week)
1. Refactor list operation to use batch query
2. Add caching layer for frequently accessed data
3. Implement circuit breaker for external calls

### Long-term (architectural)
1. Migrate to async processing for heavy operations
2. Add read replicas for database
3. Implement request rate limiting

## Code Changes Suggested
```diff
# file: internal/core/service.go
- for _, item := range items {
-     db.Query("SELECT * FROM table WHERE id = ?", item.ID)
- }
+ ids := extractIDs(items)
+ results := db.Query("SELECT * FROM table WHERE id IN (?)", ids)
```

## Preventive Measures
**New Alert Rules**:
- Alert on p99 latency > 1s for 2 minutes
- Alert on CPU > 80% for 5 minutes

**Monitoring Improvements**:
- Add dashboard for list operation latency
- Track database query counts per endpoint

**Tests to Add**:
- Load test for list endpoint with 1000+ items
- Integration test for batch query logic

---
**Investigation Date**: 2025-01-06
**Investigator**: ark-observer
**Telemetry Stack**: local / production (port-forwarded)
```

**Success Criteria**:
- ✅ New agent file created: agents/ark-observer.md
- ✅ Can query Prometheus (PromQL)
- ✅ Can query Loki (LogQL)
- ✅ Can analyze Jaeger traces
- ✅ Can check AlertManager alerts
- ✅ 3 investigation workflows documented: High CPU, Error Spike, Latency
- ✅ Code correlation with arkd/arkd-wallet
- ✅ Port-forwarding instructions for prod access
- ✅ Structured investigation report template
- ✅ NOTE documented: Pyroscope not in current ark-telemetry stack

---

## Implementation Priority

### Immediate (Week 1)
1. **Feature 1**: Automated Validation Loop (High ROI, unblocks developer workflow)
2. **Feature 4**: ark-observer Agent (Critical for production monitoring)

### Short-term (Week 2)
3. **Feature 2**: GitHub Project Research (Useful for competitive analysis)
4. **Feature 3**: Docs Scraping Workflow (Nice-to-have, low urgency)

### Success Metrics

**Feature 1 - Validation Loop**:
- Developer time saved: 30-40% (fewer manual retry cycles)
- Test pass rate on first orchestration: Target 80%+

**Feature 2 - GitHub Research**:
- Research reports generated per week: Track usage
- Time to analyze external project: Target < 10 minutes

**Feature 3 - Docs Scraping**:
- Documentation sites saved: Track count
- Developer satisfaction with offline docs: Survey

**Feature 4 - ark-observer**:
- Mean time to root cause (MTTRC): Target < 15 minutes
- Incidents with actionable reports: Target 100%
- Code optimization suggestions implemented: Track %

---

## Related Documentation

- **CLAUDE.md**: Main orchestrator instructions
- **ROADMAP.md**: Long-term Arkadian vision
- **agents/**: Existing agent specifications
- **workflows/**: Existing workflow templates
- **docs/INDEX.md**: Project registry

---

**Document Version**: 1.0.0
**Created**: 2025-01-06
**Status**: All features planned, awaiting implementation
**Maintainer**: Arkadian Team
