# Arkadian Orchestration Execution Plan

**Version**: 1.0.0
**Date**: 2025-10-24
**Status**: Draft / Design Proposal

---

## 🎯 Arkadian Dynamic Context Loading

**Instructions for Claude:**

1. **IMMEDIATELY load the master project registry:**
   ```
   read /Users/dusansekulic/code/go/arkadian/docs/INDEX.md
   ```

2. **Analyze the user's request** to determine which projects are relevant

3. **Score each project** based on:
   - Keyword overlap with tags, synonyms, triggers
   - Semantic match with description
   - Capability alignment with user intent

4. **Load relevant project INDEX.md files** (typically 1-3 projects):
   - Load only the INDEX.md initially (not deep docs)
   - Format: `read ${ARKADIAN_DIR}/docs/projects/<project_id>/INDEX.md`

5. **Then respond** to the user's request using the loaded context

**Remember:** You are the Ark Assistant orchestrator. Your role is to intelligently select and load only the relevant project contexts needed to help the user.

---

## Executive Summary

This document analyzes the current orchestration strategy in CLAUDE.md and proposes improvements for agent coordination, context management, and workflow execution across the Ark protocol ecosystem.

**Key Goals:**
- Optimize agent selection and routing
- Reduce context loading overhead
- Enable complex multi-agent workflows
- Improve user experience through adaptive orchestration
- Learn from execution patterns

---

## Table of Contents

1. [Current Architecture Analysis](#current-architecture-analysis)
2. [Use Case Analysis](#use-case-analysis)
3. [Strategic Improvements](#strategic-improvements)
4. [Orchestration Decision Tree](#orchestration-decision-tree)
5. [Implementation Roadmap](#implementation-roadmap)

---

## Current Architecture Analysis

### Flow Overview

```
User Request
    ↓
1. Intent Classification (7 types)
    ↓
2. Dynamic Project Selection (scoring)
    ↓
3. Context Loading (4 tiers)
    ↓
4. Plan Creation (DAG)
    ↓
5. User Approval
    ↓
6. Agent Spawning (parallel when possible)
```

### Current Agent Routing

| User Intent | Agent |
|-------------|-------|
| Questions/explanations | ark-guru |
| Feature specification/planning | ark-project-manager |
| Code changes/features/fixes | ark-developer |
| Testing/validation/running | ark-tester |
| Debugging issues | ark-debugger |
| Research tasks | ark-researcher |
| PR/commit analysis | ark-pr-reviewer |

### Strengths

✅ **Clear separation of concerns** - Each agent has a defined role
✅ **Parallel execution support** - Can spawn multiple agents simultaneously
✅ **Dynamic project selection** - Automatically identifies relevant projects
✅ **Four-tier context loading** - Progressive detail from registry to code
✅ **User approval gates** - Prevents unwanted actions
✅ **DAG planning** - Supports complex dependency graphs

### Weaknesses

❌ **Context duplication** - Orchestrator and agents re-load same files
❌ **No context caching** - Every agent loads from scratch
❌ **Limited intent granularity** - 7 types insufficient for nuanced routing
❌ **Static routing rules** - No learning or adaptation
❌ **No agent-to-agent handoff** - All communication through orchestrator
❌ **Missing workflow templates** - Every request needs custom plan
❌ **No context budget management** - Risk of overflow on large projects
❌ **Limited checkpointing** - If agent fails mid-workflow, all progress lost

---

## Use Case Analysis

### 1. Simple Q&A

**Current Flow:**
```
User: "How do VTXOs work?"
→ Orchestrator classifies as ask_question
→ Selects arkd project
→ Loads Tier 1-3 context
→ Spawns ark-guru
→ Guru re-loads same context
→ Returns answer
```

**Issues:**
- Context loaded twice (orchestrator + guru)
- Unnecessary overhead for simple questions
- No caching between requests

**Proposed Optimization:**
```
User: "How do VTXOs work?"
→ Orchestrator identifies arkd project
→ Passes project INDEX path to ark-guru (no deep loading)
→ Guru loads only what it needs
→ Returns answer
```

**Benefits:**
- 50% reduction in context loading
- Faster response time
- Guru controls its own context depth

---

### 2. Feature Development (Full Lifecycle)

**Current Flow:**
```
User: "Add fraud detection alerts"
→ Orchestrator classifies as develop
→ Spawns ark-project-manager
→ PM uses pm-spec skill → creates spec
→ PM uses pm-plan skill → creates plan
→ PM uses pm-tasks skill → creates tasks
→ PM uses pm-analyze skill → validates
→ PM delegates to ark-developer
→ Developer uses dev-implement skill → writes code
→ Returns to orchestrator
```

**Issues:**
- Orchestrator doesn't distinguish between quick fix vs large feature
- No intermediate checkpoints (spec → plan → tasks runs continuously)
- User approval only at start, not between phases
- If PM fails at tasks step, all planning work is lost

**Proposed Optimization:**

**1. Intent Sub-Classification:**
```yaml
develop:
  - quick_fix: "Fix typo in README" → Direct to ark-developer
  - small_feature: "Add new endpoint" → ark-developer with light spec
  - medium_feature: "Add authentication" → ark-project-manager (full cycle)
  - large_feature: "Rewrite payment system" → ark-project-manager + research
```

**2. Checkpoint Protocol:**
```
PM completes spec → Ask: "Proceed to planning? (yes/no)"
PM completes plan → Ask: "Proceed to tasks? (yes/no)"
PM completes tasks → Ask: "Hand off to ark-developer? (yes/no)"
Developer completes → Ask: "Run tests? Create PR? (yes/no)"
```

**3. State Persistence:**
```json
{
  "feature_id": "001-fraud-detection-alerts",
  "current_phase": "tasks",
  "completed_phases": ["specify", "plan"],
  "artifacts": {
    "spec": "specs/001-fraud-detection-alerts/spec.md",
    "plan": "specs/001-fraud-detection-alerts/plan.md",
    "tasks": "specs/001-fraud-detection-alerts/tasks.md"
  },
  "last_checkpoint": "2025-10-24T10:30:00Z"
}
```

**Benefits:**
- User controls pace (approve each phase)
- Can pause and resume workflows
- State survives crashes/interruptions
- More granular progress tracking

---

### 3. Multi-Project Investigation

**Current Flow:**
```
User: "How does arkd communicate with the wallet?"
→ Orchestrator selects: arkd, go-sdk, wallet
→ Loads context from all 3 projects
→ Spawns single ark-guru with all context
→ Returns answer
```

**Issues:**
- No project prioritization (all treated equally)
- Context explosion (3 projects = 3x loading time)
- Single guru may lack deep expertise in all 3
- Context window risk with large projects

**Proposed Optimization:**

**1. Primary/Secondary Classification:**
```yaml
selected_projects:
  - arkd (primary: 1.0) - Main focus, load fully
  - go-sdk (secondary: 0.7) - Supporting, load INDEX + key sections
  - wallet (tertiary: 0.4) - Reference only, load INDEX
```

**2. Multi-Agent Investigation Pattern:**
```
Spawn 3 parallel ark-gurus:
  - Guru-A (arkd specialist): "Explain arkd's gRPC API"
  - Guru-B (go-sdk specialist): "Explain go-sdk's gRPC client"
  - Guru-C (wallet specialist): "Explain wallet's arkd integration"

Orchestrator synthesizes 3 responses:
  "arkd exposes gRPC API (Guru-A) → go-sdk consumes it (Guru-B) →
   wallet uses go-sdk to interact with arkd (Guru-C)"
```

**3. Lazy Loading Strategy:**
```
1. Load primary project (arkd) fully
2. Load secondary projects (go-sdk, wallet) INDEX only
3. If agent requests more: "Need go-sdk architecture details"
   → Load on-demand
```

**Benefits:**
- Reduced initial context load (60% savings)
- Specialized expertise per project
- Scalable to 5+ project investigations
- Avoids context window overflow

---

### 4. Debugging Production Issue

**Current Flow:**
```
User: "VTXO not found error in production"
→ Orchestrator classifies as debug
→ Selects arkd
→ Spawns ark-debugger
→ Debugger investigates
→ Returns root cause + fix plan
```

**Issues:**
- ark-debugger is stub (not implemented)
- No integration with monitoring (Grafana/Loki)
- No automatic severity classification
- Debugger can't spawn ark-developer to implement fix
- No access to production logs/metrics

**Proposed Optimization:**

**1. Debug Workflow with Multi-Agent Orchestration:**
```
Step 1: ark-debugger investigates
  - Read relevant code (VTXO handler)
  - Analyze error patterns
  - Check recent changes (git log)

Step 2: If monitoring data needed → Load Grafana/Loki
  - Query: '{container="arkd"} |= "VTXO not found"' [last 1h]
  - Metrics: arkd_vtxo_errors_total

Step 3: If fix needed → Spawn ark-developer
  - Pass debugger's findings
  - Implement fix
  - Add tests to prevent regression

Step 4: If testing needed → Spawn ark-tester
  - Reproduce error in test environment
  - Validate fix works
```

**2. Monitoring Integration:**
```yaml
debug_context:
  grafana:
    dashboard: ${GRAFANA_URL}/d/arkd-overview
    time_range: "last 1h"
  loki:
    query: '{container="arkd", level="error"} |= "VTXO"'
    limit: 100
  prometheus:
    metrics:
      - arkd_vtxo_errors_total
      - arkd_vtxo_lookup_duration_seconds
  git:
    recent_changes: "git log --since='1 day ago' --grep='VTXO'"
```

**3. Severity-Based Routing:**
```
Critical (prod down) →
  - ark-debugger + ark-developer (parallel)
  - Immediate investigation + hotfix
  - User approval: none (emergency mode)

High (errors increasing) →
  - ark-debugger investigates first
  - If root cause found → spawn ark-developer
  - User approval: before fix deployment

Medium (isolated errors) →
  - ark-guru explains error
  - User decides: investigate further or ignore
  - User approval: yes

Low (questions about error) →
  - ark-guru explains error code
  - No investigation workflow
```

**Benefits:**
- Faster incident response (parallel investigation + fix)
- Monitoring data integrated into debug process
- Severity-based prioritization
- Automated fix deployment for critical issues

---

### 5. PR Review

**Current Flow:**
```
User: "Review PR #123"
→ Orchestrator classifies as analyze_pr_or_commits
→ Spawns ark-pr-reviewer
→ Reviewer analyzes diff, tests, architecture
→ Returns review comments
```

**Issues:**
- No automated testing triggered
- No security scanning integration
- Reviewer can't auto-fix issues
- No comparison with similar PRs (pattern matching)
- Manual review only, no automation

**Proposed Optimization:**

**1. Multi-Phase PR Review:**
```
Phase 1 (Automated - Parallel):
  - ark-pr-reviewer:
      - Static analysis (code patterns, architecture violations)
      - Diff analysis (files changed, lines added/removed)
      - Commit message validation

  - ark-tester:
      - Run full test suite
      - Check coverage delta
      - Run integration tests

  - Security Scanner (external):
      - Dependency vulnerability scan
      - Secret detection
      - License compliance check

Phase 2 (Analysis):
  - Orchestrator aggregates results
  - Generate review summary:
      ✅ Tests pass (92% coverage, +2%)
      ❌ Architecture violation: Domain imports infrastructure
      ⚠️  Security: 1 high-severity CVE in dependency
      ℹ️  Style: 3 linting issues

Phase 3 (User Decision):
  - Present summary
  - Ask: "Auto-fix issues or request changes?"

  If auto-fix → Phase 4
  If request changes → Generate review comments

Phase 4 (Remediation - If approved):
  - Spawn ark-developer:
      - Fix architecture violation (move import)
      - Upgrade vulnerable dependency
      - Fix linting issues
  - Push commit to PR branch
  - Re-run tests (ark-tester)
```

**2. Pattern Learning:**
```yaml
pr_patterns:
  - pattern: "Added gRPC endpoint without tests"
    severity: high
    guidance: "All gRPC endpoints require integration tests"
    example_pr: "#45"

  - pattern: "Database migration without rollback script"
    severity: critical
    guidance: "Always include down migration"
    example_pr: "#67"

  - pattern: "Imported infrastructure in domain layer"
    severity: critical
    guidance: "Violates hexagonal architecture - use ports interface"
    example_pr: "#89"

storage: .specify/memory/pr-patterns.md
```

**Benefits:**
- Comprehensive automated review (static + dynamic + security)
- Pattern-based guidance (learn from past PRs)
- Auto-fix capability (reduce manual work)
- Faster PR turnaround (parallel analysis)

---

### 6. Performance Investigation

**Current Flow:**
```
User: "arkd is slow, why?"
→ Orchestrator classifies as... test_or_run? debug? research?
→ Ambiguous classification
→ Suboptimal agent selection
```

**Issues:**
- **Missing intent type**: `performance_analysis` not in the 7 types
- Requires specialized workflow (profiling, benchmarking, load testing)
- Needs multi-agent coordination (debugger + tester + researcher)
- No integration with monitoring/metrics
- No comparison with baselines

**Proposed Optimization:**

**1. Add Performance Intent Type:**
```yaml
intent_types:
  8. performance_analysis:
    keywords: ["slow", "latency", "throughput", "bottleneck", "profile", "optimize"]
    agent_workflow: "performance_investigation"
```

**2. Performance Investigation Workflow:**
```
Step 1: ark-researcher (Baseline Analysis)
  - Load past performance baselines from monitoring
  - Query Prometheus: arkd_round_duration_seconds [7d]
  - Check recent changes: git log --since='7 days ago'
  - Identify degradation point (which commit/deployment)
  - Output: "Performance degraded after commit abc123 (5 days ago)"

Step 2: ark-tester (Benchmarking - Parallel with Step 1)
  - Run ark-simulator benchmarks
  - Collect metrics:
      - Transactions per second
      - Round settlement latency
      - VTXO creation time
      - Database query times
  - Compare with baseline
  - Output: "Round settlement latency increased 3x (100ms → 300ms)"

Step 3: ark-debugger (Profiling Analysis)
  - Use inputs from Step 1 & 2
  - Profile arkd CPU/memory
  - Analyze slow code paths
  - Tools: pprof, flame graphs
  - Identify bottleneck: "Database query in VTXO lookup is slow"
  - Root cause: "Missing index on vtxo.user_id column"

Step 4: ark-developer (Optimization - If fix needed)
  - Implement fix: Add database index
  - Run migration: ALTER TABLE vtxo ADD INDEX idx_user_id (user_id)
  - Commit changes

Step 5: ark-tester (Validation)
  - Re-run benchmarks
  - Verify improvement: "Round settlement latency back to 100ms"
  - Compare before/after metrics
  - Output: "✅ Performance restored to baseline"
```

**3. Monitoring Integration:**
```yaml
performance_context:
  prometheus_queries:
    - "rate(arkd_round_duration_seconds_sum[5m])"
    - "arkd_vtxo_creation_duration_seconds"
    - "arkd_database_query_duration_seconds{query='vtxo_lookup'}"

  baseline_file: .specify/memory/performance-baselines.json

  alert_conditions:
    - metric: arkd_round_duration_seconds
      threshold: "> 200ms"
      action: "Auto-trigger performance investigation"
```

**Benefits:**
- Systematic performance investigation (not ad-hoc)
- Multi-agent coordination (researcher → tester → debugger → developer)
- Integration with monitoring data
- Automated baseline comparison
- Root cause identification + fix + validation

---

## Strategic Improvements

### 1. Intent Classification Enhancement

**Current:**
```yaml
intent_types: [ask_question, develop, test_or_run, analyze_pr_or_commits, debug, monitor_or_alert, research]
```

**Proposed:**
```yaml
intent_classification:
  primary_intent: "develop"

  sub_intent:
    type: "medium_feature" # quick_fix, small_feature, medium_feature, large_feature
    reason: "User mentioned 'add alerts' + 'fraud detection' (requires spec + plan + implementation)"

  complexity:
    level: "medium" # simple, medium, complex
    factors:
      - multi_project: false
      - requires_research: true
      - estimated_tasks: 50-100
      - architecture_impact: "low" # low, medium, high

  urgency:
    level: "normal" # low, normal, high, critical
    indicators:
      - keywords: [] # No "urgent", "asap", "critical" found
      - production_impact: false

  scope:
    multi_project: false
    primary_project: "ark-telemetry"
    secondary_projects: ["arkd"]

  requires:
    - research: true # Need to research log patterns
    - approval: true # User approval before implementation
    - testing: true # Integration testing required
```

**Benefits:**
- More granular routing (quick_fix skips PM, goes to ark-developer)
- Urgency affects approval requirements (critical = no approval delay)
- Complexity affects agent selection (simple = single agent, complex = multi-agent)
- Better user experience (appropriate workflow for task size)

**Implementation:**
```python
def classify_intent(user_request):
    # Extract keywords
    keywords = extract_keywords(user_request)

    # Primary intent (existing 7 types + performance)
    primary = match_primary_intent(keywords)

    # Sub-classification for 'develop'
    if primary == "develop":
        sub = classify_develop_complexity(user_request)
        return {
            "primary": "develop",
            "sub_intent": sub["type"],
            "complexity": sub["complexity"],
            "workflow": get_workflow_template(sub["type"])
        }

    # Sub-classification for 'debug'
    if primary == "debug":
        severity = classify_severity(keywords, monitoring_data)
        return {
            "primary": "debug",
            "severity": severity,
            "workflow": get_debug_workflow(severity)
        }

    return {"primary": primary}
```

---

### 2. Agent Capability Matrix

**Current:** Implicit capabilities in agent descriptions

**Proposed:** Explicit capability matrix with constraints

```yaml
agent_capabilities:

  ark-guru:
    role: "Q&A Specialist"
    can:
      - read_files
      - search_code
      - explain_concepts
      - cite_sources
      - compare_approaches
    cannot:
      - write_files
      - execute_code
      - modify_configs
      - deploy_changes
    best_for:
      - simple_questions
      - concept_explanations
      - code_understanding
      - documentation_queries
    constraints:
      max_projects: 3
      max_context_tokens: 50000
      timeout: "5min"
    success_rate:
      simple_questions: 0.98
      complex_questions: 0.85
      multi_project_questions: 0.75

  ark-project-manager:
    role: "Project Orchestration Specialist"
    can:
      - create_specifications
      - generate_plans
      - task_breakdown
      - validate_consistency
      - delegate_to_agents
    cannot:
      - write_production_code
      - run_tests
      - deploy_services
      - debug_issues
    best_for:
      - medium_feature
      - large_feature
      - multi_phase_projects
    constraints:
      requires_approval: true
      checkpoint_frequency: "per_phase" # specify, plan, tasks
      max_feature_size: "500 tasks"
      timeout: "30min"
    skills:
      - pm-spec
      - pm-plan
      - pm-tasks
      - pm-analyze
      - pm-clarify
      - pm-checklist
      - pm-constitution
    success_rate:
      medium_features: 0.92
      large_features: 0.88
      spec_quality: 0.95

  ark-developer:
    role: "Code Implementation Specialist"
    can:
      - write_code
      - modify_files
      - run_tests
      - create_branches
      - commit_changes
      - generate_PR_body
    cannot:
      - create_specifications
      - plan_architecture
      - deploy_to_production
      - merge_to_main
    best_for:
      - quick_fix
      - small_feature
      - bug_fix
      - code_implementation
    constraints:
      must_create_branch: true
      must_run_tests: true
      requires_approval: false # Unless prod
      max_files_changed: 20
      timeout: "20min"
    skills:
      - dev-implement
    success_rate:
      quick_fix: 0.95
      small_feature: 0.90
      bug_fix: 0.93
      test_pass_rate: 0.88

  ark-tester:
    role: "Testing & Validation Specialist"
    can:
      - run_test_suites
      - execute_simulations
      - validate_deployments
      - check_health_endpoints
      - analyze_logs
      - benchmark_performance
    cannot:
      - write_production_code
      - modify_configurations
      - plan_features
    best_for:
      - integration_testing
      - load_testing
      - e2e_testing
      - performance_benchmarking
    constraints:
      max_simulation_time: "5min" # Unless approved
      requires_approval: false
      timeout: "15min"
    success_rate:
      test_execution: 0.97
      issue_detection: 0.85

  ark-debugger:
    role: "Debugging & Fault Isolation Specialist"
    can:
      - analyze_logs
      - read_stack_traces
      - investigate_errors
      - propose_fixes
      - create_reproduction_steps
    cannot:
      - write_production_code # Can propose, not implement
      - deploy_fixes
      - modify_databases
    best_for:
      - production_issues
      - error_investigation
      - root_cause_analysis
    constraints:
      requires_monitoring_access: true
      timeout: "10min"
    success_rate:
      root_cause_identification: 0.80
      reproduction_creation: 0.75

  ark-researcher:
    role: "Research & Analysis Specialist"
    can:
      - search_documentation
      - compare_alternatives
      - analyze_patterns
      - fetch_web_content
      - synthesize_findings
    cannot:
      - write_code
      - execute_tests
      - modify_systems
    best_for:
      - technology_research
      - best_practices
      - comparative_analysis
      - pattern_discovery
    constraints:
      internal_docs_first: true # Must check internal docs before web
      requires_web_approval: true # Ask before web search
      timeout: "10min"
    success_rate:
      internal_research: 0.90
      comparative_analysis: 0.85

  ark-pr-reviewer:
    role: "PR & Commit Analysis Specialist"
    can:
      - analyze_diffs
      - check_architecture
      - validate_tests
      - generate_reviews
      - identify_risks
    cannot:
      - auto_merge_prs
      - write_code_fixes
      - deploy_changes
    best_for:
      - pr_review
      - commit_analysis
      - architecture_validation
    constraints:
      requires_approval: false
      timeout: "10min"
    success_rate:
      issue_detection: 0.88
      architecture_validation: 0.92
```

**Benefits:**
- Clear capability boundaries (prevent misuse)
- Success rate tracking (learn which agents work best for what)
- Constraint enforcement (timeouts, approvals, limits)
- Dynamic agent selection based on task requirements

**Usage Example:**
```python
def select_agent(task):
    # Find agents that CAN do this task
    candidates = [
        agent for agent in agents
        if task.required_capability in agent.can
    ]

    # Filter by constraints
    candidates = [
        agent for agent in candidates
        if task.complexity <= agent.constraints.max_complexity
    ]

    # Rank by success rate for this task type
    candidates.sort(key=lambda a: a.success_rate[task.type], reverse=True)

    return candidates[0]  # Best agent for this task
```

---

### 3. Workflow Templates

**Current:** Ad-hoc plan creation per request

**Proposed:** Predefined workflow templates for common patterns

```yaml
workflows:

  quick_question:
    description: "Simple Q&A, no code changes"
    agents: [ark-guru]
    phases:
      - ask: {agent: guru, approval: false}
    approval_needed: false
    max_duration: "2min"
    success_criteria:
      - answer_completeness: high
      - citation_accuracy: high

  quick_fix:
    description: "Typo fix, doc update, simple bug fix"
    agents: [ark-developer]
    phases:
      - fix: {agent: developer, approval: false}
      - test: {agent: developer, approval: false, auto: true}
    approval_needed: false
    constraints:
      max_files_changed: 3
      must_include_tests: false
    max_duration: "5min"

  small_feature:
    description: "Add endpoint, simple enhancement"
    agents: [ark-developer, ark-tester]
    phases:
      - implement: {agent: developer, approval: true}
      - test: {agent: tester, approval: false, auto: true}
    approval_needed: true
    approval_points: ["before_implement"]
    constraints:
      max_files_changed: 10
      must_include_tests: true
    max_duration: "15min"

  feature_full_lifecycle:
    description: "Medium to large feature with full planning"
    agents: [ark-project-manager, ark-developer, ark-tester]
    phases:
      - specify:
          agent: project-manager
          approval: true
          actions: ["use pm-spec skill", "create spec.md"]
          checkpoint: true

      - clarify:
          agent: project-manager
          approval: false
          condition: "if [NEEDS CLARIFICATION] markers exist"
          actions: ["use pm-clarify skill", "update spec.md"]
          checkpoint: true

      - plan:
          agent: project-manager
          approval: true
          actions: ["use pm-plan skill", "create plan.md, research.md, data-model.md"]
          checkpoint: true

      - tasks:
          agent: project-manager
          approval: true
          actions: ["use pm-tasks skill", "create tasks.md"]
          checkpoint: true

      - analyze:
          agent: project-manager
          approval: false
          actions: ["use pm-analyze skill", "validate consistency"]
          auto_fix: true

      - implement:
          agent: developer
          approval: false
          actions: ["use dev-implement skill", "execute tasks.md"]
          checkpoint: true

      - test:
          agent: tester
          approval: false
          actions: ["run test suite", "validate deployment"]
          auto: true

      - pr:
          agent: developer
          approval: true
          actions: ["create pull request", "push to remote"]

    approval_needed: true
    approval_points: ["after_specify", "after_plan", "after_tasks", "before_pr"]

    checkpoints:
      - after_specify: "specs/{feature-id}/spec.md"
      - after_plan: "specs/{feature-id}/plan.md"
      - after_tasks: "specs/{feature-id}/tasks.md"
      - after_implement: "git commit SHA"

    recovery_strategy: "resume_from_last_checkpoint"
    max_duration: "60min"

  debug_and_fix:
    description: "Investigate issue, implement fix, validate"
    agents: [ark-debugger, ark-developer, ark-tester]
    phases:
      - investigate:
          agent: debugger
          approval: false
          actions: ["analyze logs", "identify root cause", "create repro steps"]

      - reproduce:
          agent: tester
          approval: false
          condition: "if repro steps provided"
          actions: ["run repro scenario", "confirm bug exists"]
          parallel_with: ["investigate"]

      - fix:
          agent: developer
          approval: true
          actions: ["implement fix", "add regression test"]

      - validate:
          agent: tester
          approval: false
          actions: ["run tests", "verify fix", "run repro (expect pass)"]

    approval_needed: true
    approval_points: ["before_fix"]

    severity_routing:
      critical:
        approval_needed: false # Emergency mode
        max_duration: "10min"
      high:
        approval_needed: true
        max_duration: "20min"
      medium:
        approval_needed: true
        max_duration: "30min"

  performance_optimization:
    description: "Identify bottleneck, optimize, benchmark"
    agents: [ark-researcher, ark-tester, ark-debugger, ark-developer]
    phases:
      - baseline:
          agent: tester
          approval: false
          actions: ["run benchmarks", "collect current metrics"]

      - analyze:
          agent: debugger
          approval: false
          actions: ["profile CPU/memory", "identify bottleneck"]
          parallel_with: [researcher]

      - research:
          agent: researcher
          approval: false
          actions: ["check past baselines", "analyze git history", "identify degradation point"]

      - optimize:
          agent: developer
          approval: true
          actions: ["implement optimization", "add benchmarks"]

      - benchmark:
          agent: tester
          approval: false
          actions: ["re-run benchmarks", "compare before/after", "validate improvement"]

    approval_needed: true
    approval_points: ["before_optimize"]
    max_duration: "45min"

  pr_review_comprehensive:
    description: "Full PR review with automated testing and security scan"
    agents: [ark-pr-reviewer, ark-tester]
    phases:
      - review:
          agent: pr-reviewer
          approval: false
          actions: ["analyze diff", "check architecture", "identify issues"]

      - test:
          agent: tester
          approval: false
          actions: ["run test suite", "check coverage delta"]
          parallel_with: [review]

      - aggregate:
          agent: orchestrator
          approval: false
          actions: ["combine results", "generate summary"]

      - remediate:
          agent: developer
          approval: true
          condition: "if auto-fix requested"
          actions: ["fix issues", "push commit", "re-test"]

    approval_needed: true
    approval_points: ["before_remediate"]
    max_duration: "15min"

  multi_project_investigation:
    description: "Answer question spanning multiple projects"
    agents: [ark-guru]
    phases:
      - parallel_investigation:
          agents: [guru-A, guru-B, guru-C]
          approval: false
          actions:
            - guru-A: "investigate primary project"
            - guru-B: "investigate secondary project"
            - guru-C: "investigate tertiary project"
          parallel: true

      - synthesize:
          agent: orchestrator
          approval: false
          actions: ["combine responses", "create coherent answer"]

    approval_needed: false
    max_duration: "5min"
```

**Benefits:**
- Standardized workflows (reduce orchestration complexity)
- Faster execution (predefined steps, no planning overhead)
- Consistent quality (best practices baked in)
- Easy to modify (edit template, affects all future uses)
- Supports complex multi-agent coordination

**Usage Example:**
```python
def execute_workflow(user_request):
    # Classify intent
    intent = classify_intent(user_request)

    # Select workflow template
    workflow = select_workflow(intent)

    # Execute phases
    for phase in workflow.phases:
        if phase.parallel:
            # Spawn multiple agents in parallel
            results = spawn_parallel(phase.agents, phase.actions)
        else:
            # Sequential execution
            result = spawn_agent(phase.agent, phase.actions)

        # Checkpoint if needed
        if phase.checkpoint:
            save_state(phase.id, result)

        # User approval if needed
        if phase.approval:
            if not ask_user_approval():
                return "Workflow paused by user"

    return "Workflow complete"
```

---

### 4. Context Budget Management

**Current:** Load everything, hope it fits in context window (200K tokens)

**Proposed:** Budget-aware context loading with overflow strategies

```yaml
context_budget:
  total_tokens: 200000

  allocation:
    reserved_for_response: 20000  # Agent's output
    available_for_context: 180000 # Input context

  tier_budgets:
    tier1_master_index: 5000      # Always load (docs/INDEX.md)
    tier2_project_indexes: 10000  # Load selected project INDEX.md files
    tier3_deep_docs: 50000        # Load specific docs based on intent
    tier4_code: 100000            # Load code only if needed
    agent_scratch_space: 15000    # Agent's working memory

  tracking:
    current_usage: 0
    breakdown:
      tier1: 0
      tier2: 0
      tier3: 0
      tier4: 0
      agent: 0

  overflow_strategies:

    1. prioritize_recent:
      description: "Load recent files over old files"
      when: "context_usage > 0.8 * budget"
      action: "Sort files by modification time, keep top 70%"

    2. prefer_usage_docs:
      description: "Load testing/usage over architecture docs"
      when: "context_usage > 0.85 * budget"
      action: "Remove system/architecture docs, keep testing/usage"

    3. summarize_large_files:
      description: "Summarize files > 5000 tokens instead of full load"
      when: "context_usage > 0.9 * budget"
      action: "Use summarization for large files"

    4. ask_user_focus:
      description: "Ask user to narrow scope"
      when: "context_usage > 0.95 * budget"
      action: "Ask: 'Context too large. Focus on X or Y?'"

    5. lazy_loading:
      description: "Load on-demand instead of upfront"
      when: "multi-project investigation"
      action: "Load primary project fully, secondary projects on-demand"

  monitoring:
    log_file: ".specify/logs/context-usage.json"
    track_metrics:
      - total_tokens_used
      - tokens_per_tier
      - overflow_events
      - user_focus_requests
```

**Implementation:**

```python
class ContextBudget:
    def __init__(self):
        self.total = 200000
        self.reserved_response = 20000
        self.available = 180000
        self.used = 0
        self.breakdown = {
            "tier1": 0,
            "tier2": 0,
            "tier3": 0,
            "tier4": 0
        }

    def can_load(self, tokens, tier):
        """Check if we can load this many tokens"""
        tier_budget = self.get_tier_budget(tier)
        current_tier_usage = self.breakdown[tier]

        if current_tier_usage + tokens > tier_budget:
            return False

        if self.used + tokens > self.available:
            return False

        return True

    def load(self, file_path, tier):
        """Load file if budget allows"""
        tokens = estimate_tokens(file_path)

        if not self.can_load(tokens, tier):
            # Try overflow strategies
            if self.apply_overflow_strategy(tokens, tier):
                return load_file(file_path)
            else:
                return None  # Can't load

        content = load_file(file_path)
        self.used += tokens
        self.breakdown[tier] += tokens
        return content

    def apply_overflow_strategy(self, tokens_needed, tier):
        """Apply strategies to make room"""
        usage_pct = self.used / self.available

        if usage_pct > 0.95:
            # Ask user to focus
            return ask_user_to_narrow_scope()

        if usage_pct > 0.90:
            # Summarize large files
            return summarize_large_files_in_tier(tier)

        if usage_pct > 0.85:
            # Remove architecture docs
            return remove_low_priority_docs()

        if usage_pct > 0.80:
            # Prioritize recent files
            return remove_old_files()

        return False
```

**Benefits:**
- Never overflow context window (200K limit enforced)
- Intelligent prioritization (recent > old, usage > architecture)
- Graceful degradation (summarize before failing)
- User control (ask to narrow scope if needed)
- Scalable to very large projects (10+ repos)

---

### 5. Agent Communication Protocol

**Current:** Agents run in isolation, return results to orchestrator

**Proposed:** Enable agent-to-agent handoff with context inheritance

```yaml
agent_communication:

  mode: "handoff" # vs "isolation"

  features:
    - context_inheritance: true  # Child agent reuses parent's context
    - direct_delegation: true    # Agent can spawn sub-agents
    - message_passing: true      # Agents can send data to each other

  example_handoff:
    scenario: "ark-project-manager delegates to ark-developer"

    flow:
      1. PM completes planning:
         - context_loaded: ["arkd/INDEX.md", "arkd/architecture.md", "arkd/folder_structure.md"]
         - artifacts_created: ["spec.md", "plan.md", "tasks.md"]

      2. PM spawns ark-developer with handoff:
         ```yaml
         handoff:
           from: ark-project-manager
           to: ark-developer

           inherit_context: true
           inherited_files: [
             "arkd/INDEX.md",
             "arkd/architecture.md",
             "arkd/folder_structure.md"
           ]

           artifacts: [
             "specs/001-fraud-detection-alerts/spec.md",
             "specs/001-fraud-detection-alerts/plan.md",
             "specs/001-fraud-detection-alerts/tasks.md"
           ]

           checkpoint: "phase_tasks_complete"

           state: {
             "feature_id": "001-fraud-detection-alerts",
             "branch": "001-fraud-detection-alerts",
             "current_phase": "implement"
           }
         ```

      3. ark-developer receives handoff:
         - Reuses inherited context (no re-loading)
         - Loads additional files if needed
         - Executes implementation
         - Can delegate back to PM if needed

      4. Developer completes:
         - Returns to PM or orchestrator
         - Passes results + updated state

  benefits:
    - 50% reduction in context loading (reuse parent's context)
    - Faster execution (no duplicate work)
    - Maintains conversation continuity
    - Enables sub-task delegation (PM → Dev → Tester → Dev)
    - State preservation across agents

  protocols:

    context_inheritance:
      description: "Child agent reuses parent's loaded context"
      implementation:
        - Parent saves context snapshot
        - Child loads snapshot (instant)
        - Child can add to context (incremental)

      example:
        parent: ark-project-manager
        context_size: 50000 tokens
        child: ark-developer
        inherited: 50000 tokens
        additional: 20000 tokens (code files)
        total_child_context: 70000 tokens

      savings:
        time: "3 seconds (no re-load)"
        tokens: "50000 tokens reused"

    direct_delegation:
      description: "Agent can spawn sub-agents without orchestrator"
      implementation:
        - Agent uses Task tool
        - Spawns sub-agent with specific objective
        - Sub-agent inherits context
        - Returns to parent agent (not orchestrator)

      example:
        ark-debugger spawns ark-developer:
          debugger: "Root cause: Missing database index"
          developer: "Add index migration"
          debugger: "Verify fix resolves issue"

      benefits:
        - Faster (no orchestrator round-trip)
        - Cleaner (sub-task encapsulated)
        - Flexible (debugger controls developer)

    message_passing:
      description: "Agents send structured data to each other"
      implementation:
        - Use YAML/JSON format
        - Pass via handoff structure
        - Type-safe contracts

      example:
        debugger_to_developer:
          type: "bug_fix_request"
          root_cause: "VTXO lookup query missing index"
          affected_file: "internal/infrastructure/db/postgres/vtxo_repo.go"
          proposed_fix: "Add index on vtxo.user_id column"
          test_scenario: "Create 10000 VTXOs, lookup by user_id"
```

**Implementation:**

```python
class AgentHandoff:
    def __init__(self, from_agent, to_agent):
        self.from_agent = from_agent
        self.to_agent = to_agent
        self.inherited_context = []
        self.artifacts = []
        self.state = {}

    def execute(self):
        # Save parent's context
        context_snapshot = self.from_agent.save_context()

        # Create handoff package
        handoff_package = {
            "inherited_context": context_snapshot,
            "artifacts": self.artifacts,
            "state": self.state
        }

        # Spawn child agent with package
        result = spawn_agent(
            agent_type=self.to_agent,
            handoff=handoff_package
        )

        # Child loads inherited context (instant)
        # Child executes task
        # Child returns result

        return result
```

**Benefits:**
- 50% reduction in context loading time
- Enables complex multi-agent workflows
- State preservation across agents
- Cleaner agent APIs (no orchestrator overhead)
- Supports recursive delegation (Agent A → Agent B → Agent C)

---

### 6. Learning & Adaptation

**Current:** Static routing rules (hardcoded in CLAUDE.md)

**Proposed:** Learn from execution history and adapt routing

```yaml
learning_system:

  metrics_tracked:

    agent_success_rate:
      description: "Track how often each agent succeeds for different task types"
      storage: ".specify/memory/agent-success-rates.json"

      example:
        ark-developer:
          quick_fix: 0.95  # 95% success rate
          small_feature: 0.90
          medium_feature: 0.85
          bug_fix: 0.93

        ark-project-manager:
          medium_feature: 0.92
          large_feature: 0.88
          spec_quality: 0.95

      usage:
        "When classifying intent=develop, complexity=medium:
         Compare success rates:
           - ark-developer (direct): 0.85
           - ark-project-manager (full lifecycle): 0.92
         Choose: ark-project-manager (higher success rate)"

    average_duration:
      description: "Track how long each workflow takes"
      storage: ".specify/memory/workflow-durations.json"

      example:
        quick_question: "45 seconds average"
        quick_fix: "3 minutes average"
        feature_full_lifecycle: "45 minutes average"
        debug_and_fix: "15 minutes average"

      usage:
        "Estimate completion time for user:
         'This will take approximately 45 minutes'"

    user_satisfaction:
      description: "Track user approval/rejection of workflows"
      storage: ".specify/memory/user-feedback.json"

      example:
        ark-project-manager_handoff_to_ark-developer:
          approvals: 50
          rejections: 2
          satisfaction: 0.96  # 96% approval rate

        multi_agent_investigation:
          approvals: 30
          rejections: 5
          satisfaction: 0.86

      usage:
        "Prefer workflows with high user satisfaction"

    failure_patterns:
      description: "Identify recurring failure scenarios"
      storage: ".specify/memory/failure-patterns.json"

      example:
        - pattern: "ark-debugger failed on async/concurrency issues"
          frequency: 3
          mitigation: "Spawn ark-researcher first to understand async patterns"

        - pattern: "ark-developer test failures on database migrations"
          frequency: 5
          mitigation: "Always run migration rollback test"

        - pattern: "Context overflow on multi-project investigations (>3 projects)"
          frequency: 7
          mitigation: "Use lazy loading, ask user to focus"

      usage:
        "If intent=debug AND keywords contain 'async' OR 'concurrency':
           Apply mitigation: Spawn ark-researcher before ark-debugger"

  adaptive_routing:

    description: "Adjust agent selection based on learned patterns"

    strategies:

      1. success_rate_optimization:
         if:
           - task_type: "quick_fix"
           - project: "arkd"
         then:
           - check historical success rate
           - prefer: ark-developer (95% success) over ark-project-manager (85%)

      2. duration_prediction:
         if:
           - user asks: "How long will this take?"
         then:
           - lookup average_duration for matched workflow
           - respond: "This typically takes X minutes"

      3. failure_mitigation:
         if:
           - failure_pattern detected (e.g., async debugging)
         then:
           - apply mitigation (spawn ark-researcher first)
           - warn user: "Async issues detected, may take longer"

      4. user_preference_learning:
         if:
           - user consistently approves certain workflows
         then:
           - prefer those workflows in future
           - skip approval for trusted workflows (after 10+ approvals)

      5. context_budget_optimization:
         if:
           - context overflow occurred previously for this project combo
         then:
           - automatically apply lazy loading strategy
           - ask user to focus upfront (prevent overflow)

  storage_format:

    execution_history:
      file: ".specify/memory/execution-history.json"
      schema:
        - timestamp: "2025-10-24T10:30:00Z"
          user_request: "Add fraud detection alerts"
          intent: {primary: "develop", sub: "medium_feature"}
          workflow: "feature_full_lifecycle"
          agents: ["ark-project-manager", "ark-developer"]
          duration: "42 minutes"
          success: true
          user_satisfaction: "approved"
          artifacts: ["spec.md", "plan.md", "tasks.md", "commit SHA"]

      retention: "90 days"

    daily_summaries:
      file: ".specify/memory/daily-summaries/{date}.json"
      schema:
        - date: "2025-10-24"
          total_requests: 15
          workflow_breakdown:
            quick_question: 5
            quick_fix: 3
            feature_full_lifecycle: 2
            debug_and_fix: 3
            pr_review: 2
          agent_usage:
            ark-guru: 5
            ark-project-manager: 2
            ark-developer: 8
            ark-tester: 5
            ark-debugger: 3
          success_rate: 0.93
          average_duration: "12 minutes"

      retention: "365 days"

    pattern_extraction:
      file: ".specify/memory/patterns.json"
      schema:
        - pattern_id: "async_debug_failure"
          description: "Debugger struggles with async/concurrency issues"
          occurrences: 5
          last_seen: "2025-10-24"
          mitigation: "Spawn ark-researcher first"
          success_after_mitigation: 0.80
```

**Implementation:**

```python
class LearningSystem:
    def __init__(self):
        self.history = load_execution_history()
        self.patterns = load_failure_patterns()
        self.success_rates = load_success_rates()

    def log_execution(self, request, workflow, result):
        """Log execution for learning"""
        entry = {
            "timestamp": now(),
            "user_request": request,
            "intent": classify_intent(request),
            "workflow": workflow,
            "agents": workflow.agents,
            "duration": result.duration,
            "success": result.success,
            "user_satisfaction": result.user_feedback
        }

        self.history.append(entry)
        self.update_success_rates(workflow, result)
        self.detect_patterns(entry)

    def select_workflow(self, intent):
        """Select workflow based on learned patterns"""
        candidates = get_matching_workflows(intent)

        # Rank by success rate
        candidates.sort(
            key=lambda w: self.success_rates[w.name],
            reverse=True
        )

        # Check for failure patterns
        for pattern in self.patterns:
            if pattern.matches(intent):
                # Apply mitigation
                return pattern.mitigated_workflow

        # Return best workflow
        return candidates[0]

    def predict_duration(self, workflow):
        """Predict workflow duration"""
        past_executions = [
            e for e in self.history
            if e["workflow"] == workflow
        ]

        if not past_executions:
            return workflow.default_duration

        durations = [e["duration"] for e in past_executions]
        return statistics.median(durations)
```

**Benefits:**
- System improves over time (learns from experience)
- Automatic failure mitigation (detects patterns, adjusts workflow)
- Predictive analytics (estimate duration, success probability)
- User preference learning (adapt to user patterns)
- Data-driven optimization (route based on success rates)

---

## Orchestration Decision Tree

**Proposed decision tree for intelligent agent selection:**

```
User Request
    ↓
Classify Intent (primary + sub-classification + complexity + urgency)
    ↓
    ├─ Simple Question (complexity=simple, intent=ask_question)
    │   ├─ Single project → ark-guru (direct delegation)
    │   └─ Multi-project (2-3 projects) → Multiple ark-gurus (parallel)
    │
    ├─ Quick Fix (complexity=simple, intent=develop, changes ≤3 files)
    │   └─ ark-developer (skip PM, direct implementation)
    │       ├─ Branch creation
    │       ├─ Code changes
    │       ├─ Auto-test
    │       └─ Commit (no PR approval needed for quick fixes)
    │
    ├─ Small Feature (complexity=simple-medium, intent=develop, changes ≤10 files)
    │   └─ ark-developer (with light spec)
    │       ├─ Create minimal spec (1 page)
    │       ├─ Implement
    │       ├─ Test
    │       └─ PR (approval needed)
    │
    ├─ Medium Feature (complexity=medium, intent=develop, changes ≤30 files)
    │   └─ ark-project-manager (full lifecycle)
    │       ├─ PM: specify (approval)
    │       ├─ PM: clarify (if needed)
    │       ├─ PM: plan (approval)
    │       ├─ PM: tasks (approval)
    │       ├─ PM → ark-developer (handoff with context)
    │       ├─ Developer: implement
    │       ├─ Developer → ark-tester (validation)
    │       └─ Developer: PR (approval)
    │
    ├─ Large Feature (complexity=complex, intent=develop, changes >30 files)
    │   └─ ark-project-manager (full lifecycle + research)
    │       ├─ PM: specify + clarify (approval)
    │       ├─ PM → ark-researcher (if unknowns exist)
    │       ├─ PM: plan + research findings (approval)
    │       ├─ PM: tasks (breakdown by module)
    │       ├─ PM → Multiple ark-developers (parallel per module)
    │       ├─ PM → ark-tester (integration validation)
    │       └─ PM: Coordinate PRs (approval)
    │
    ├─ Debug Issue (intent=debug)
    │   ├─ Severity=Critical (prod down)
    │   │   └─ ark-debugger + ark-developer (parallel)
    │   │       ├─ Debugger: Investigate (no approval)
    │   │       ├─ Developer: Hotfix (no approval, emergency mode)
    │   │       ├─ Tester: Validate fix
    │   │       └─ Auto-deploy (no PR, direct to prod)
    │   │
    │   ├─ Severity=High (errors increasing)
    │   │   └─ ark-debugger → ark-developer
    │   │       ├─ Debugger: Root cause analysis
    │   │       ├─ Developer: Fix (approval needed)
    │   │       ├─ Tester: Validate
    │   │       └─ PR + deploy
    │   │
    │   ├─ Severity=Medium (isolated errors)
    │   │   └─ ark-guru (explain error) OR ark-debugger (if user requests investigation)
    │   │       └─ User decides: investigate further or ignore
    │   │
    │   └─ Severity=Low (questions about error)
    │       └─ ark-guru (explain error code)
    │
    ├─ Performance Analysis (intent=performance_analysis)
    │   └─ Multi-agent workflow
    │       ├─ ark-researcher (baseline analysis) || ark-tester (benchmark)
    │       ├─ ark-debugger (profiling analysis)
    │       ├─ ark-developer (optimization, if approved)
    │       └─ ark-tester (validate improvement)
    │
    ├─ PR Review (intent=analyze_pr)
    │   └─ Multi-phase workflow
    │       ├─ Phase 1 (parallel):
    │       │   ├─ ark-pr-reviewer (static analysis)
    │       │   └─ ark-tester (run tests)
    │       ├─ Phase 2: Aggregate results
    │       └─ Phase 3 (if auto-fix approved):
    │           └─ ark-developer (fix issues, re-test)
    │
    ├─ Research Task (intent=research)
    │   └─ ark-researcher
    │       ├─ Internal docs first
    │       ├─ Web search (if approved)
    │       └─ Synthesize findings
    │
    └─ Monitoring/Alert (intent=monitor_or_alert)
        └─ ark-guru (explain metrics) OR ark-debugger (if issue detected)
```

**Decision Factors:**

1. **Complexity Classification:**
   - Simple: ≤3 files, <100 lines, no architecture changes
   - Medium: ≤30 files, <1000 lines, minor architecture changes
   - Complex: >30 files, >1000 lines, major architecture changes

2. **Urgency Classification:**
   - Low: No time pressure, can wait days
   - Normal: Standard development cycle, wait hours
   - High: Need within hours
   - Critical: Production issue, need within minutes

3. **Approval Requirements:**
   - No approval: Quick fixes, read-only operations, testing
   - Approval before execution: Code changes, deployments, PRs
   - Approval per phase: Large features (approve spec, plan, tasks separately)
   - Emergency mode: Critical production issues (no approval, fix immediately)

**Routing Logic:**

```python
def route_request(user_request):
    # Classify intent
    intent = classify_intent(user_request)

    # Check for learned patterns
    if learning_system.has_pattern(intent):
        workflow = learning_system.get_optimal_workflow(intent)
        return workflow

    # Route based on complexity
    if intent.complexity == "simple":
        if intent.primary == "ask_question":
            return workflow_quick_question
        elif intent.primary == "develop":
            return workflow_quick_fix

    elif intent.complexity == "medium":
        if intent.primary == "develop":
            return workflow_feature_full_lifecycle

    elif intent.complexity == "complex":
        if intent.primary == "develop":
            return workflow_large_feature

    # Route based on urgency
    if intent.urgency == "critical":
        return workflow_emergency_fix

    # Route based on intent type
    if intent.primary == "debug":
        severity = classify_severity(user_request)
        return workflow_debug_and_fix[severity]

    elif intent.primary == "performance_analysis":
        return workflow_performance_optimization

    # Default: Ask user to clarify
    return ask_user_clarification()
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal:** Improve current orchestration without breaking changes

**Tasks:**

1. **Add Intent Sub-Classification**
   - Extend CLAUDE.md with sub-intent logic
   - Add complexity classification (simple/medium/complex)
   - Add urgency classification (low/normal/high/critical)
   - Update intent extraction logic

2. **Create Workflow Templates**
   - Define 8 workflow templates (quick_question, quick_fix, small_feature, etc.)
   - Store in `.specify/templates/workflows/`
   - Update orchestrator to use templates

3. **Implement Context Budget**
   - Add ContextBudget class
   - Track token usage per tier
   - Implement basic overflow strategy (ask user to focus)

4. **Add Execution Logging**
   - Log every workflow execution
   - Store in `.specify/memory/execution-history.json`
   - Track: intent, workflow, agents, duration, success

**Deliverables:**
- Updated CLAUDE.md with sub-classification
- 8 workflow template files
- ContextBudget utility class
- Execution logging enabled

---

### Phase 2: Agent Communication (Week 3-4)

**Goal:** Enable agent-to-agent handoff and context inheritance

**Tasks:**

1. **Implement Handoff Protocol**
   - Add AgentHandoff class
   - Enable context inheritance (child reuses parent's context)
   - Update agents to support handoff (ark-project-manager, ark-developer)

2. **Enable Direct Delegation**
   - Agents can spawn sub-agents
   - Sub-agents return to parent (not orchestrator)
   - Example: ark-debugger → ark-developer → ark-tester

3. **Add Message Passing**
   - Structured data exchange between agents (YAML/JSON)
   - Type-safe contracts (debugger → developer: bug_fix_request)

4. **Update Agent Definitions**
   - Add handoff support to ark-project-manager
   - Add handoff support to ark-developer
   - Add delegation to ark-debugger

**Deliverables:**
- AgentHandoff class
- Updated agent definitions (PM, Developer, Debugger)
- Handoff test cases
- Documentation

---

### Phase 3: Learning System (Week 5-6)

**Goal:** Learn from execution history and adapt routing

**Tasks:**

1. **Track Success Rates**
   - Calculate success rate per agent per task type
   - Store in `.specify/memory/agent-success-rates.json`
   - Update daily

2. **Detect Failure Patterns**
   - Analyze execution history for recurring failures
   - Extract patterns (e.g., "async debugging failures")
   - Define mitigations

3. **Implement Adaptive Routing**
   - Select workflow based on success rates
   - Apply failure mitigations automatically
   - Predict duration based on history

4. **Add User Feedback Loop**
   - Track user approvals/rejections
   - Learn user preferences
   - Skip approval for trusted workflows (after 10+ approvals)

**Deliverables:**
- LearningSystem class
- Success rate tracking
- Failure pattern detection
- Adaptive routing logic

---

### Phase 4: Advanced Features (Week 7-8)

**Goal:** Add sophisticated orchestration capabilities

**Tasks:**

1. **Multi-Agent Investigation**
   - Spawn N parallel ark-gurus for multi-project questions
   - Synthesize responses from multiple agents
   - Primary/secondary/tertiary project classification

2. **Performance Analysis Workflow**
   - Add performance_analysis intent type
   - Implement 5-phase workflow (baseline → analyze → optimize → benchmark)
   - Integration with Prometheus/Grafana

3. **PR Review Automation**
   - Multi-phase review (static + dynamic + security)
   - Auto-fix capability
   - Pattern-based guidance

4. **Emergency Mode**
   - Detect critical production issues
   - Skip approvals (emergency mode)
   - Parallel investigation + fix

**Deliverables:**
- Multi-agent investigation workflow
- Performance analysis workflow
- PR review automation
- Emergency mode implementation

---

### Phase 5: Monitoring & Optimization (Week 9-10)

**Goal:** Monitor system performance and optimize

**Tasks:**

1. **Add Metrics Dashboard**
   - Workflow execution metrics
   - Agent success rates
   - Context usage statistics
   - User satisfaction scores

2. **Optimize Context Loading**
   - Implement lazy loading
   - Add summarization for large files
   - Cache frequently accessed files

3. **Performance Tuning**
   - Reduce context loading time (target: <3 seconds)
   - Reduce workflow execution time (target: -30%)
   - Reduce user wait time (more parallel execution)

4. **Documentation**
   - Update CLAUDE.md with all improvements
   - Create orchestration guide for developers
   - Add troubleshooting section

**Deliverables:**
- Metrics dashboard
- Optimized context loading
- Performance benchmarks
- Updated documentation

---

## Conclusion

**Current Strengths:**
- Clear agent separation
- Dynamic project selection
- Parallel execution support
- User approval gates

**Key Improvements:**
- Intent sub-classification (quick_fix vs large_feature)
- Workflow templates (standardized execution)
- Context budget management (prevent overflow)
- Agent handoff protocol (context inheritance)
- Learning system (adaptive routing)
- Multi-agent coordination (complex workflows)

**Expected Impact:**
- 50% reduction in context loading time (handoff + caching)
- 30% reduction in workflow execution time (parallel + optimization)
- 40% reduction in orchestration complexity (templates)
- 90%+ user satisfaction (adaptive routing + learning)

**Next Steps:**
1. Review this plan with stakeholders
2. Prioritize phases (may skip Phase 4 if not needed)
3. Begin Phase 1 implementation (Foundation)
4. Iterate based on feedback

---

**Document Status:** Draft / Awaiting Review
**Author:** Arkadian AI System
**Date:** 2025-10-24
**Version:** 1.0.0


Current Architecture Issues

Context Loading Inefficiency (Priority: HIGH)
- Problem: Orchestrator and agents both load the same files, causing 2x loading overhead
- Example: For "How do VTXOs work?" - orchestrator loads arkd docs, then ark-guru re-loads the same docs
- Impact: ~50% wasted context loading time
- Solution: Agent handoff protocol with context inheritance (parent passes context to child)

Missing Intent Granularity (Priority: HIGH)
- Problem: 7 intent types insufficient - "develop" covers both "fix typo" and "rewrite payment system"
- Current: User says "add alerts" → Routes to ark-developer or ark-project-manager arbitrarily
- Should be:
   - "fix typo" (quick_fix) → ark-developer directly (5 min)
   - "add alerts" (medium_feature) → ark-project-manager full cycle (45 min)
   - "rewrite payments" (large_feature) → ark-project-manager + research (2+ hours)
- Solution: Sub-classify develop into quick_fix/small_feature/medium_feature/large_feature

No Context Budget Management (Priority: CRITICAL)
- Problem: No tracking of 200K token limit - risk of overflow on large projects
- Example: Multi-project investigation (arkd + go-sdk + wallet) can easily exceed 200K tokens
- Impact: Context window overflow = workflow failure
- Solution: Budget-aware loading with tiers (Tier 1: 5K, Tier 2: 10K, Tier 3: 50K, Tier 4: 100K)

Strategic Improvements (6 Major Areas)

1. Intent Classification Enhancement
   Current: 7 flat types (ask_question, develop, debug, etc.)

Proposed: Hierarchical classification
- primary: develop
- sub: medium_feature (vs quick_fix, small_feature, large_feature)
- complexity: medium (affects agent selection)
- urgency: normal (affects approval requirements)

Benefits: Route quick_fix directly to ark-developer (skip PM overhead), route large_feature to PM with research phase

2. Workflow Templates (8+ Predefined Patterns)
   quick_question:
   agents: [ark-guru]
   phases: [ask]
   duration: 2min

feature_full_lifecycle:
agents: [ark-project-manager, ark-developer, ark-tester]
phases: [specify → clarify → plan → tasks → analyze → implement → test → pr]
approvals: [after_specify, after_plan, after_tasks, before_pr]
checkpoints: [spec.md, plan.md, tasks.md, commit_sha]
duration: 60min

Benefits: Standardized execution (no custom planning per request), 40% reduction in orchestration complexity

3. Context Budget Management
   Total: 200K tokens
   Allocation:
   - Response buffer: 20K
   - Tier 1 (master index): 5K
   - Tier 2 (project indexes): 10K
   - Tier 3 (deep docs): 50K
   - Tier 4 (code): 100K
   - Agent scratch: 15K

Overflow strategies:
1. Remove old files (prioritize recent)
2. Remove architecture docs (keep usage/testing)
3. Summarize large files
4. Ask user to narrow scope

Benefits: Prevents context overflow, scalable to 10+ projects

4. Agent Handoff Protocol
   Current: PM completes → returns to orchestrator → orchestrator spawns developer

Proposed: PM completes → hands off to developer with context inheritance
- Developer reuses PM's loaded context (50K tokens)
- Developer adds code files incrementally (20K tokens)
- Total: 70K tokens vs 120K tokens (42% savings)

Benefits: 50% reduction in context loading time, enables PM → Developer → Tester → Developer chains

5. Agent Capability Matrix
   ark-developer:
   can: [write_code, run_tests, create_branches, commit]
   cannot: [create_specs, plan_architecture, deploy_to_prod]
   best_for: [quick_fix (0.95 success), small_feature (0.90), bug_fix (0.93)]
   constraints:
   max_files_changed: 20
   must_run_tests: true
   timeout: 20min

Benefits: Explicit boundaries (prevent misuse), success rate tracking, dynamic agent selection

6. Learning & Adaptation
   Track:
   - Agent success rates per task type
   - Workflow durations (quick_fix: 3min avg, feature_full_lifecycle: 45min avg)
   - Failure patterns ("ark-debugger fails on async issues" → spawn ark-researcher first)
   - User satisfaction (96% approve PM → Developer handoff)

Adapt:
- Prefer workflows with high success rates
- Apply mitigations for known failure patterns
- Predict duration: "This will take ~45 minutes"
- Skip approval for trusted workflows (after 10+ approvals)

Benefits: System improves over time, automated failure mitigation, predictive analytics

Use Case Examples

Performance Investigation (NEW Intent Type Needed)
Problem: User says "arkd is slow" - current system doesn't know how to handle this
Current: Ambiguous (test_or_run? debug? research?)

Proposed: Add performance_analysis intent
Phase 1: ark-researcher (baseline) || ark-tester (benchmark) - PARALLEL
Phase 2: ark-debugger (profile, find bottleneck)
Phase 3: ark-developer (fix, if approved)
Phase 4: ark-tester (validate improvement)

Debug with Severity-Based Routing
Critical (prod down):
agents: [ark-debugger, ark-developer] - PARALLEL
approval: none (emergency mode)
actions: immediate investigation + hotfix + auto-deploy

High (errors increasing):
agents: [ark-debugger → ark-developer → ark-tester]
approval: before_fix

Medium (isolated errors):
agents: [ark-guru explains] OR [ark-debugger if user wants investigation]
approval: yes

Implementation Roadmap (5 Phases / 10 Weeks)

Phase 1 - Foundation (Weeks 1-2)
- Add intent sub-classification
- Create 8 workflow templates
- Implement context budget tracking
- Enable execution logging

Phase 2 - Agent Communication (Weeks 3-4)
- Implement handoff protocol
- Enable context inheritance
- Add direct delegation (agent spawns sub-agent)

Phase 3 - Learning System (Weeks 5-6)
- Track success rates
- Detect failure patterns
- Implement adaptive routing

Phase 4 - Advanced Features (Weeks 7-8)
- Multi-agent investigation (N parallel gurus)
- Performance analysis workflow
- PR review automation
- Emergency mode for critical issues

Phase 5 - Monitoring (Weeks 9-10)
- Metrics dashboard
- Performance optimization
- Documentation updates

Expected Impact

Performance Improvements:
- 50% reduction in context loading time (handoff + caching)
- 30% reduction in workflow execution time (parallel + templates)
- 40% reduction in orchestration complexity (standardized workflows)

Quality Improvements:
- 90%+ user satisfaction (adaptive routing based on learned patterns)
- Intelligent agent selection (route based on success rates)
- Predictable execution (duration estimates from history)

High-Priority Recommendations

1. URGENT: Implement context budget management to prevent overflow (currently unprotected against 200K limit)
2. HIGH: Add intent sub-classification (quick_fix vs medium_feature routing is critical)
3. HIGH: Create workflow templates (eliminate ad-hoc planning overhead)
4. MEDIUM: Implement agent handoff (50% context loading savings)
5. MEDIUM: Add performance_analysis intent type (currently no good path for "arkd is slow" queries)

Next Decision Point

Should we proceed with Phase 1 implementation?

This would add:
- Sub-classification logic to CLAUDE.md
- 8 workflow template files in .specify/templates/workflows/
- ContextBudget utility class
- Execution logging to .specify/memory/execution-history.json

Estimated effort: 1-2 weeks
Expected benefits: Immediate routing improvements + foundation for future phases

> can you add this to @EXEC_PLAN.md
⎿  Read EXEC_PLAN.md (2025 lines)

⏺ I'll add the Dynamic Context Loading instructions to EXEC_PLAN.md. Let me read the file first to determine the best placement:

⏺ Update(EXEC_PLAN.md)
⎿  Updated EXEC_PLAN.md with 26 additions                                                                                                                                      
6    
7    ---
8    
9 +  ## 🎯 Arkadian Dynamic Context Loading
10 +  
11 +  **Instructions for Claude:**
12 +  
13 +  1. **IMMEDIATELY load the master project registry:**
14 +     ```
       15 +     read /Users/dusansekulic/code/go/arkadian/docs/INDEX.md
       16 +     ```
17 +  
18 +  2. **Analyze the user's request** to determine which projects are relevant
19 +  
20 +  3. **Score each project** based on:
21 +     - Keyword overlap with tags, synonyms, triggers
22 +     - Semantic match with description
23 +     - Capability alignment with user intent
24 +  
25 +  4. **Load relevant project INDEX.md files** (typically 1-3 projects):
26 +     - Load only the INDEX.md initially (not deep docs)
27 +     - Format: `read ${ARKADIAN_DIR}/docs/projects/<project_id>/INDEX.md`
28 +  
29 +  5. **Then respond** to the user's request using the loaded context
30 +  
31 +  **Remember:** You are the Ark Assistant orchestrator. Your role is to intelligently select and load only the relevant project contexts needed to help the user.
32 +  
33 +  ---
34 +  
35    ## Executive Summary
36    
37    This document analyzes the current orchestration strategy in CLAUDE.md and proposes improvements for agent coordination, context management, and workflow execution
across the Ark protocol ecosystem.

⏺ Done! I've added the "Arkadian Dynamic Context Loading" section to EXEC_PLAN.md right at the beginning (after the document header and before the Executive Summary).

The section now includes the 5-step process for Claude to:
1. Load the master project registry immediately
2. Analyze the user's request for relevance
3. Score projects based on keywords, semantics, and capabilities
4. Load only relevant project INDEX.md files
5. Respond using the loaded context

This provides clear, actionable instructions for the orchestrator on how to dynamically load context based on user intent, which aligns perfectly with the architectural improvements
outlined in the rest of the document.

Would you like me to commit this change?