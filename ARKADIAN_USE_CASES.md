# Arkadian Use Cases & Team Roles

## Executive Summary

**Arkadian** is an AI-powered assistant system designed for the Ark protocol ecosystem development. It provides specialized agents for different team roles, from developers writing code to stakeholders tracking progress across 12+ repositories.

**Core Value Proposition**: Intelligent context-aware assistance across the entire software development lifecycle for multi-repository Bitcoin protocol development.

---

## Architecture Overview

### Orchestration Layer
- **Environment Validation**: Automatic verification of 12 repo paths + GitHub URLs
- **Dynamic Context Loading**: Loads only relevant project documentation per request
- **Agent Routing**: Intent detection → specialized agent selection
- **Workflow Templates**: Reusable patterns for complex multi-step tasks

### Agent Layer (8 Specialized Agents)
Each agent is optimized for specific roles and workflows:
1. **ark-guru** - Knowledge & Q&A
2. **ark-project-manager** - Feature planning & specifications
3. **ark-developer** - Code implementation
4. **ark-env-tester** - Testing & validation
5. **ark-pr-reviewer** - Code review (technical)
6. **ark-progress-tracker** - Progress reporting (business)
7. **ark-researcher** - Research & analysis
8. **claude-search-agent** - Web research worker

---

## Use Cases by Team Role

### 1. **Software Developer** (Senior/Mid/Junior)

#### Primary Use Cases

**A. Feature Implementation**
- **Agent**: `ark-developer`
- **Workflow**: Quick Fix → Small Feature → Large Feature
- **Examples**:
  - "Add GetRoundStatus gRPC endpoint to arkd"
  - "Implement multi-database support for arkd"
  - "Fix race condition in round finalization"
  - "Add Prometheus metrics for VTXO creation rates"
- **Value**: Follows project architecture (hexagonal), coding standards, generates tests
- **Time Saved**: 30-50% faster implementation with built-in best practices

**B. Bug Fixing**
- **Agent**: `ark-developer` + `ark-env-tester`
- **Workflow**: Debug → Fix → Test → Verify
- **Examples**:
  - "Latest migration failing when adding rounds table"
  - "VTXO not found errors in production logs"
  - "Settlement timing out under load"
- **Value**: Systematic debugging with knowledge of all 12 projects
- **Time Saved**: 40-60% faster root cause identification

**C. Code Understanding**
- **Agent**: `ark-guru`
- **Examples**:
  - "How does VTXO expiry work in arkd?"
  - "Explain the round settlement flow"
  - "What's the difference between covenant and covenantless Ark?"
- **Value**: Deep protocol knowledge + code implementation context
- **Time Saved**: Instant answers vs hours of code reading

**D. Testing**
- **Agent**: `ark-env-tester`
- **Examples**:
  - "Run integration tests for arkd with PostgreSQL"
  - "Start local arkd stack and validate health"
  - "Run ark-simulator with 50 concurrent clients"
- **Value**: Automated test orchestration, environment setup, validation
- **Time Saved**: 70% faster test execution vs manual setup

---

### 2. **Technical Lead / Architect**

#### Primary Use Cases

**A. Code Review**
- **Agent**: `ark-pr-reviewer`
- **Workflow**: PR Analysis → Risk Assessment → Architecture Compliance
- **Examples**:
  - "Review arkd PR #234 for breaking changes"
  - "Analyze last week's merged PRs for security issues"
  - "Check if PR #156 violates hexagonal architecture"
- **Value**:
  - Architecture compliance verification
  - Cross-project impact detection (proto changes → SDK → wallet)
  - Security and performance review
- **Time Saved**: 50% faster reviews with comprehensive analysis

**B. Architecture Guidance**
- **Agent**: `ark-guru`
- **Examples**:
  - "How should I structure the new notification service?"
  - "Best practices for adding database migrations?"
  - "How to maintain hexagonal architecture with new payment provider?"
- **Value**: Consistent architecture decisions across 12 projects
- **Time Saved**: Instant guidance vs waiting for architecture meetings

**C. Cross-Project Coordination**
- **Agent**: `ark-progress-tracker` + `ark-pr-reviewer`
- **Workflow**: Comprehensive PR analysis (technical + business)
- **Examples**:
  - "Analyze arkd proto changes affecting wallet and SDK"
  - "Show me all PRs affecting Lightning integration"
- **Value**: Visibility into cascading changes across ecosystem
- **Time Saved**: Automatic detection vs manual coordination

---

### 3. **QA Engineer / Test Engineer**

#### Primary Use Cases

**A. Test Execution & Validation**
- **Agent**: `ark-env-tester`
- **Examples**:
  - "Run E2E tests for arkd → wallet integration"
  - "Execute ark-simulator load test with 100 clients"
  - "Validate health of staging deployment"
- **Value**:
  - Automated test orchestration
  - Environment validation
  - Test result collection and reporting
- **Time Saved**: 80% faster test execution vs manual steps

**B. Test Environment Setup**
- **Agent**: `ark-env-tester`
- **Examples**:
  - "Bring up local arkd stack with PostgreSQL + Redis"
  - "Start regtest Bitcoin network for testing"
  - "Deploy arkd staging environment"
- **Value**: Docker Compose orchestration, health checks, dependency validation
- **Time Saved**: 70% faster environment setup

**C. Test Gap Analysis**
- **Agent**: `ark-pr-reviewer`
- **Examples**:
  - "Check test coverage for arkd payment handlers"
  - "Find untested code paths in new PR"
- **Value**: Automated coverage analysis, test recommendations
- **Time Saved**: Instant analysis vs manual coverage review

---

### 4. **Product Manager**

#### Primary Use Cases

**A. Feature Planning**
- **Agent**: `ark-project-manager`
- **Workflow**: Concept → Spec → Plan → Tasks
- **Examples**:
  - "Plan fraud detection alerts feature for arkd"
  - "Create specification for multi-factor authentication"
  - "Break down notification system into implementation tasks"
- **Value**:
  - Structured specifications (spec.md)
  - Implementation plans with technical design
  - Dependency-ordered task lists
- **Time Saved**: 60% faster feature planning with templates

**B. Progress Tracking**
- **Agent**: `ark-progress-tracker`
- **Workflow**: Weekly Summary → Project Health → Feature Tracking
- **Examples**:
  - "Summarize last week's progress across all Ark projects"
  - "Track Nostr integration progress"
  - "Show me API changes affecting wallet"
- **Value**:
  - Stakeholder-friendly language
  - Business value translation
  - Timeline and blocker visibility
- **Time Saved**: 90% faster progress reports vs manual PR review

**C. Feature Status**
- **Agent**: `ark-progress-tracker`
- **Examples**:
  - "What's the status of multi-database support?"
  - "Are we on track for December release?"
  - "Which teams are waiting on arkd PR #234?"
- **Value**: Cross-project coordination visibility
- **Time Saved**: Instant answers vs status meetings

---

### 5. **DevOps / SRE Engineer**

#### Primary Use Cases

**A. Infrastructure Deployment**
- **Agent**: `ark-developer` + `ark-env-tester`
- **Examples**:
  - "Deploy arkd to staging with Terraform"
  - "Update ark-infra Docker Compose stack"
  - "Add new Grafana dashboard for round latency"
- **Value**: Infrastructure-as-code updates with validation
- **Time Saved**: 50% faster with SOP guidance

**B. Monitoring & Alerting**
- **Agent**: `ark-developer` (for ark-telemetry)
- **Examples**:
  - "Add Prometheus alert for VTXO expiry"
  - "Create Loki query for failed settlements"
  - "Update Grafana dashboard with new metrics"
- **Value**: Consistent monitoring patterns across services
- **Time Saved**: 60% faster with templates

**C. Troubleshooting**
- **Agent**: `ark-guru` + `ark-env-tester`
- **Examples**:
  - "Check arkd logs for round failures"
  - "Validate health of production deployment"
  - "Diagnose database connection issues"
- **Value**: Systematic troubleshooting with project knowledge
- **Time Saved**: 40% faster issue resolution

---

### 6. **Engineering Manager**

#### Primary Use Cases

**A. Team Coordination**
- **Agent**: `ark-progress-tracker`
- **Workflow**: Cross-project coordination analysis
- **Examples**:
  - "Show me all work affecting arkd, SDK, and wallet"
  - "Which features are blocked waiting on other teams?"
  - "API changes requiring coordination this week"
- **Value**: Coordination timeline visibility
- **Time Saved**: Real-time coordination status vs daily standups

**B. Weekly Reports**
- **Agent**: `ark-progress-tracker`
- **Examples**:
  - "Generate weekly progress report for executives"
  - "Team velocity metrics for last 30 days"
  - "Top contributors this week"
- **Value**: Automated stakeholder reporting
- **Time Saved**: 95% faster than manual report creation

**C. Technical Oversight**
- **Agent**: `ark-pr-reviewer`
- **Examples**:
  - "Review last week's merged PRs for quality issues"
  - "Check architecture compliance across projects"
  - "Security review of authentication changes"
- **Value**: High-level technical health monitoring
- **Time Saved**: 70% faster oversight vs manual reviews

---

### 7. **Protocol Researcher / Bitcoin Developer**

#### Primary Use Cases

**A. Protocol Research**
- **Agent**: `ark-researcher`
- **Modes**: Quick (3 agents, 2min) → Standard (9 agents, 3min) → Deep (12 agents, 10min)
- **Examples**:
  - "Research Bitcoin covenant proposals"
  - "Compare Ark to Lightning Network liquidity management"
  - "Deep dive on VTXO construction using Taproot"
  - "Analyze state chains vs Ark settlement"
- **Value**:
  - Parallel research with multi-source validation
  - Bitcoin/Layer-2 topic taxonomy
  - Confidence levels (HIGH: 3+ sources agree)
- **Time Saved**: 80% faster research with parallel agents

**B. Protocol Understanding**
- **Agent**: `ark-guru`
- **Examples**:
  - "Explain Ark's covenantless architecture"
  - "How does Ark achieve unilateral exit?"
  - "What are the trust assumptions in Ark?"
- **Value**: Deep protocol knowledge + implementation details
- **Time Saved**: Expert-level answers without reading whitepapers

**C. Comparative Analysis**
- **Agent**: `ark-researcher`
- **Examples**:
  - "Compare Ark, Lightning, and Liquid for payment scalability"
  - "Analyze Ark vs state chains trade-offs"
  - "Research atomic swap implementations across L2s"
- **Value**: Structured comparison with sources
- **Time Saved**: 70% faster than manual research

---

### 8. **Technical Writer / Documentation**

#### Primary Use Cases

**A. Documentation Updates**
- **Agent**: `ark-developer`
- **Examples**:
  - "Document new GetVtxoDetails API endpoint"
  - "Update arkd deployment guide with new steps"
  - "Create migration guide for proto breaking changes"
- **Value**: Documentation follows project standards
- **Time Saved**: 50% faster with templates

**B. Understanding for Documentation**
- **Agent**: `ark-guru`
- **Examples**:
  - "Explain VTXO lifecycle for user documentation"
  - "How should I document the round settlement process?"
  - "What are the key concepts for wallet developer guide?"
- **Value**: Accurate technical content
- **Time Saved**: 60% faster research vs reading code

---

### 9. **Executive / Stakeholder**

#### Primary Use Cases

**A. High-Level Progress**
- **Agent**: `ark-progress-tracker`
- **Examples**:
  - "Weekly progress summary for executive team"
  - "Feature completion status for Q4 roadmap"
  - "Timeline risk assessment for December release"
- **Value**: Business-friendly language, timeline transparency
- **Time Saved**: Instant visibility without engineering meetings

**B. Business Impact**
- **Agent**: `ark-progress-tracker`
- **Examples**:
  - "Business value of arkd PR #234"
  - "Customer impact of Lightning integration"
  - "Enterprise value of new operator dashboard"
- **Value**: Technical → business value translation
- **Time Saved**: Immediate context for decision-making

---

## Use Case Matrix

| Role | Primary Agents | Top Use Cases | Time Saved |
|------|----------------|---------------|------------|
| **Developer** | ark-developer, ark-guru, ark-env-tester | Feature implementation, bug fixing, testing | 30-60% |
| **Tech Lead** | ark-pr-reviewer, ark-guru | Code review, architecture guidance | 40-50% |
| **QA Engineer** | ark-env-tester | Test execution, environment setup | 70-80% |
| **Product Manager** | ark-project-manager, ark-progress-tracker | Feature planning, progress tracking | 60-90% |
| **DevOps/SRE** | ark-developer, ark-env-tester | Deployment, monitoring, troubleshooting | 40-60% |
| **Engineering Manager** | ark-progress-tracker, ark-pr-reviewer | Team coordination, reporting, oversight | 70-95% |
| **Protocol Researcher** | ark-researcher, ark-guru | Protocol research, comparative analysis | 70-80% |
| **Technical Writer** | ark-developer, ark-guru | Documentation, technical understanding | 50-60% |
| **Executive/Stakeholder** | ark-progress-tracker | Progress visibility, business impact | 90%+ |

---

## Workflow Examples

### Workflow 1: Feature Development (End-to-End)

**Roles**: Product Manager → Tech Lead → Developer → QA → Manager

1. **PM**: "I want to add fraud detection alerts to arkd"
   - **Agent**: `ark-project-manager`
   - **Output**: spec.md, plan.md, tasks.md

2. **Tech Lead**: "Review the fraud detection specification"
   - **Agent**: `ark-guru` (architecture review)
   - **Output**: Architecture approval, design suggestions

3. **Developer**: "Implement fraud detection alerts"
   - **Agent**: `ark-developer`
   - **Output**: Code implementation, tests, documentation

4. **Developer**: "Create PR for fraud detection"
   - **Agent**: `ark-pr-reviewer`
   - **Output**: PR analysis, risk assessment, blockers

5. **QA**: "Test fraud detection feature"
   - **Agent**: `ark-env-tester`
   - **Output**: Test results, coverage report

6. **Manager**: "Include fraud detection in weekly report"
   - **Agent**: `ark-progress-tracker`
   - **Output**: Stakeholder-friendly progress update

**Total Time**: ~3 days (vs ~5 days manual)
**Efficiency Gain**: 40%

---

### Workflow 2: Bug Investigation (Critical)

**Roles**: Developer → Tech Lead → DevOps

1. **Developer**: "Users reporting VTXO not found errors"
   - **Agent**: `ark-guru` (understand VTXO lookup)
   - **Output**: VTXO lifecycle explanation, potential causes

2. **Tech Lead**: "Review recent VTXO-related PRs"
   - **Agent**: `ark-pr-reviewer`
   - **Output**: Last week's PRs affecting VTXO logic

3. **Developer**: "Debug VTXO lookup in production logs"
   - **Agent**: `ark-guru` (query patterns)
   - **Output**: Loki query to find errors

4. **Developer**: "Fix VTXO lookup race condition"
   - **Agent**: `ark-developer`
   - **Output**: Fix implementation + tests

5. **DevOps**: "Deploy hotfix to production"
   - **Agent**: `ark-env-tester` (staging validation)
   - **Output**: Validated deployment

**Total Time**: ~4 hours (vs ~8 hours manual)
**Efficiency Gain**: 50%

---

### Workflow 3: Weekly Progress Report

**Roles**: Manager → Executives

1. **Manager**: "Generate weekly progress report"
   - **Agent**: `ark-progress-tracker`
   - **Mode**: Weekly Summary (all 12 repos, 7 days)
   - **Output**: Executive summary with:
     - 23 PRs merged, 18 opened
     - Feature progress (Nostr: 90%, Multi-DB: 100%)
     - Blockers (Boltz API rate limit)
     - Next week priorities

**Total Time**: 5 minutes (vs 2 hours manual)
**Efficiency Gain**: 96%

---

## Key Differentiators

### 1. **Multi-Repository Intelligence**
- Tracks 12+ Ark ecosystem repositories simultaneously
- Understands cross-project dependencies (arkd → SDK → wallet)
- Detects cascading impacts (proto changes → breaking changes)

### 2. **Role-Based Agents**
- Specialized agents per role (developer, PM, QA, stakeholder)
- Context-aware responses (technical vs business language)
- Workflow-specific behaviors

### 3. **Environment-Aware**
- Validates 12 repo paths + GitHub URLs automatically
- Loads only relevant project documentation
- Checks documentation freshness

### 4. **Bitcoin/L2 Domain Expertise**
- Deep Ark protocol knowledge
- Bitcoin core concepts
- Layer-2 solutions comparative analysis
- Parallel research with multi-source validation

### 5. **Progress Visibility**
- GitHub CLI integration for PR tracking
- Business value translation (technical → stakeholder)
- Cross-project coordination tracking
- Timeline and blocker identification

---

## ROI Estimate (per role)

Based on time saved percentages:

| Role | Tasks/Week | Hours Saved/Week | Annual Savings (at $100/hr) |
|------|------------|------------------|----------------------------|
| Senior Developer | 40 | 16 (40%) | $83,200 |
| Tech Lead | 25 | 10 (40%) | $52,000 |
| QA Engineer | 35 | 24 (70%) | $124,800 |
| Product Manager | 20 | 14 (70%) | $72,800 |
| DevOps/SRE | 30 | 15 (50%) | $78,000 |
| Engineering Manager | 15 | 12 (80%) | $62,400 |
| **Total (6 roles)** | | **91 hours/week** | **$473,200/year** |

---

## Getting Started by Role

### Developers
```
"How does VTXO expiry work?"              → ark-guru
"Add GetRoundStatus endpoint to arkd"     → ark-developer
"Run integration tests for arkd"          → ark-env-tester
```

### Product Managers
```
"Plan fraud detection feature"            → ark-project-manager
"Weekly progress report"                  → ark-progress-tracker
"Track Nostr integration status"          → ark-progress-tracker
```

### Tech Leads
```
"Review arkd PR #234"                     → ark-pr-reviewer
"Architecture guidance for new service"   → ark-guru
"Cross-project impact of proto changes"   → ark-progress-tracker
```

### QA Engineers
```
"Run E2E tests for arkd"                  → ark-env-tester
"Start local arkd stack"                  → ark-env-tester
"Execute load test with 50 clients"       → ark-env-tester
```

### DevOps/SRE
```
"Deploy arkd to staging"                  → ark-developer
"Add Prometheus alert for rounds"         → ark-developer
"Check production logs for errors"        → ark-guru
```

---

## Supported Workflows

1. **Feature Development**: Concept → Spec → Plan → Implement → Test → Review → Report
2. **Bug Fixing**: Report → Investigate → Fix → Test → Deploy
3. **Code Review**: PR → Technical Analysis → Business Context → Combined Report
4. **Progress Tracking**: Weekly → Project-Specific → Feature → Cross-Project
5. **Research**: Quick → Standard → Deep (Bitcoin/L2 topics)
6. **Testing**: Environment Setup → Test Execution → Validation → Reporting
7. **Documentation**: Understanding → Writing → Review → Update

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Arkadian Orchestrator                     │
│  - Intent detection                                          │
│  - Agent routing                                             │
│  - Context loading (12 repos)                                │
│  - Workflow templates                                        │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Knowledge   │      │ Development  │      │   Business   │
├──────────────┤      ├──────────────┤      ├──────────────┤
│ ark-guru     │      │ ark-developer│      │ark-progress  │
│ ark-researcher│      │ ark-env-tester│     │  -tracker    │
│              │      │ark-pr-reviewer│     │ark-project   │
│              │      │              │      │  -manager    │
└──────────────┘      └──────────────┘      └──────────────┘
```

---

**Last Updated**: 2025-11-06
**Version**: 1.0
**Maintained By**: Arkadian Documentation Team
