# Arkadian Quick Reference

## Who Should Use What?

### 👨‍💻 **Developer**
**Primary Agents**: `ark-developer`, `ark-guru`, `ark-developer`

**Common Commands**:
- "Add GetRoundStatus endpoint to arkd" → Implementation
- "How does VTXO expiry work?" → Understanding
- "Run integration tests for arkd" → Testing
- "Fix race condition in round finalization" → Bug fixing

**Time Saved**: 30-60% on implementation and debugging

---

### 🎯 **Product Manager**
**Primary Agents**: `ark-project-manager`, `ark-progress-tracker`

**Common Commands**:
- "Plan fraud detection feature" → Feature planning
- "Weekly progress report" → Status tracking
- "Track Nostr integration" → Feature status
- "Are we on track for December release?" → Timeline check

**Time Saved**: 60-90% on planning and reporting

---

### 👔 **Technical Lead / Architect**
**Primary Agents**: `ark-pr-reviewer`, `ark-guru`

**Common Commands**:
- "Review arkd PR #234" → Code review
- "Architecture guidance for notification service" → Design help
- "Show API changes affecting wallet" → Impact analysis
- "Check hexagonal architecture compliance" → Quality check

**Time Saved**: 40-50% on reviews and architecture decisions

---

### 🧪 **QA Engineer**
**Primary Agents**: `ark-developer`

**Common Commands**:
- "Run E2E tests for arkd" → Test execution
- "Start local arkd stack" → Environment setup
- "Execute load test with 50 clients" → Performance testing
- "Validate staging deployment health" → Health checks

**Time Saved**: 70-80% on testing and environment setup

---

### ⚙️ **DevOps / SRE**
**Primary Agents**: `ark-developer`, `ark-developer`, `ark-guru`

**Common Commands**:
- "Deploy arkd to staging" → Deployment
- "Add Prometheus alert for round failures" → Monitoring
- "Check production logs for VTXO errors" → Troubleshooting
- "Update Grafana dashboard" → Observability

**Time Saved**: 40-60% on operations and troubleshooting

---

### 📊 **Engineering Manager**
**Primary Agents**: `ark-progress-tracker`, `ark-pr-reviewer`

**Common Commands**:
- "Generate weekly progress report" → Team reporting
- "Show work affecting arkd, SDK, wallet" → Coordination
- "Team velocity last 30 days" → Metrics
- "Review last week's PRs for quality" → Oversight

**Time Saved**: 70-95% on reporting and coordination

---

### 🔬 **Protocol Researcher**
**Primary Agents**: `ark-researcher`, `ark-guru`

**Common Commands**:
- "Research Bitcoin covenant proposals" → Protocol research
- "Compare Ark to Lightning liquidity" → Comparative analysis
- "Deep dive on VTXO Taproot construction" → Technical details
- "Explain Ark's covenantless architecture" → Understanding

**Time Saved**: 70-80% on research and analysis

---

### 📝 **Technical Writer**
**Primary Agents**: `ark-developer`, `ark-guru`

**Common Commands**:
- "Document GetVtxoDetails API" → Documentation
- "Explain VTXO lifecycle for user docs" → Understanding
- "Create migration guide for proto changes" → Guides
- "Update arkd deployment documentation" → Updates

**Time Saved**: 50-60% on documentation

---

### 👥 **Executive / Stakeholder**
**Primary Agents**: `ark-progress-tracker`

**Common Commands**:
- "Weekly progress summary" → High-level visibility
- "Feature completion status Q4" → Roadmap tracking
- "Timeline risk for December release" → Risk assessment
- "Business value of Lightning integration" → Impact understanding

**Time Saved**: 90%+ on status gathering

---

## Agent Cheat Sheet

| Agent | Purpose | Used By | Example |
|-------|---------|---------|---------|
| **ark-guru** | Q&A, understanding | All roles | "How does round settlement work?" |
| **ark-developer** | Implementation | Developers, DevOps | "Add gRPC endpoint to arkd" |
| **ark-developer** | Testing, environments | Developers, QA, DevOps | "Run integration tests" |
| **ark-pr-reviewer** | Code review | Tech Leads, Managers | "Review arkd PR #234" |
| **ark-progress-tracker** | Progress reporting | PMs, Managers, Execs | "Weekly progress report" |
| **ark-project-manager** | Feature planning | PMs, Tech Leads | "Plan fraud detection feature" |
| **ark-researcher** | Research | Researchers, Developers | "Research covenant proposals" |

---

## Workflow Quick Start

### Feature Development (Full Lifecycle)
```
1. PM: "Plan fraud detection feature" → ark-project-manager
2. Dev: "Implement fraud detection" → ark-developer
3. QA: "Test fraud detection" → ark-developer
4. Lead: "Review fraud detection PR" → ark-pr-reviewer
5. Manager: "Include in weekly report" → ark-progress-tracker
```

### Bug Investigation
```
1. Dev: "Users seeing VTXO not found" → ark-guru (understand)
2. Dev: "Debug VTXO lookup" → ark-guru (query patterns)
3. Dev: "Fix VTXO race condition" → ark-developer (implement)
4. QA: "Test VTXO fix" → ark-developer (validate)
```

### Weekly Reporting
```
Manager: "Generate weekly report" → ark-progress-tracker
Output: 5 minutes vs 2 hours manual (96% time saved)
```

---

## Pro Tips

### For Developers
- Use `ark-guru` before implementing to understand context
- Use `ark-developer` for quick validation before PR
- Ask for "architecture compliance" in reviews

### For Product Managers
- Use "weekly progress" every Monday for status
- Track features across repos with "track [feature]"
- Request "business value" translations for stakeholders

### For Tech Leads
- Use "comprehensive analysis" for critical PRs (technical + business)
- Check "cross-project impact" for API changes
- Review "architecture compliance" regularly

### For QA Engineers
- Use `ark-developer` for all environment setup
- Request "test coverage analysis" for new features
- Automate regression testing with saved workflows

### For Managers
- Schedule "weekly progress report" automation
- Use "team velocity" for sprint planning
- Track "blockers" proactively

---

## Common Patterns

### Pattern: Multi-Project Feature
```
1. "Show me Nostr work across arkd, wallet, ark-docs"
   → ark-progress-tracker (cross-project analysis)

2. "Implement Nostr in arkd"
   → ark-developer

3. "Test Nostr integration"
   → ark-developer

4. "Track Nostr completion"
   → ark-progress-tracker (feature tracking)
```

### Pattern: Breaking Change Management
```
1. "Review proto changes in arkd PR #230"
   → ark-pr-reviewer (detect breaking changes)

2. "Show cross-project impact of proto changes"
   → ark-progress-tracker (affected projects)

3. "Update SDK for proto changes"
   → ark-developer (implement updates)

4. "Coordinate SDK, wallet updates"
   → ark-progress-tracker (coordination timeline)
```

### Pattern: Production Issue
```
1. "Production VTXO errors in Loki logs"
   → ark-guru (explain + query patterns)

2. "Review recent VTXO PRs"
   → ark-pr-reviewer (recent changes)

3. "Fix VTXO race condition"
   → ark-developer (hotfix)

4. "Deploy hotfix to staging"
   → ark-developer (validate before prod)
```

---

## Research Modes

### Quick Research (3 agents, 2 minutes)
- Simple fact-checking
- Protocol comparisons
- "Compare Ark to Lightning"

### Standard Research (9 agents, 3 minutes)
- Default mode
- Comprehensive coverage
- "Research covenant proposals"

### Deep Research (12 agents, 10 minutes)
- Multi-protocol analysis
- Whitepaper deep-dives
- "Deep analysis of Ark vs state chains"

---

## Progress Tracking Modes

### Weekly Summary (All repos, 7 days)
- Executive reporting
- "Summarize last week's progress"

### Project-Specific (Single repo, 30 days)
- Project health
- "What's happening with arkd?"

### Feature Tracking (All repos, feature lifetime)
- Feature status
- "Track Nostr integration progress"

### Cross-Project Analysis (Multiple repos, 14 days)
- Coordination needs
- "API changes affecting wallet and SDK"

---

## Environment Variables

Arkadian uses environment variables for repo paths and GitHub URLs:

**Repo Paths**:
- `$ARKD_REPO` → `/path/to/arkd`
- `$GO_SDK_REPO` → `/path/to/go-sdk`
- ...and 10 more

**GitHub URLs** (for progress tracking):
- `$ARKD_GITHUB` → `arkade-os/ark`
- `$ARK_FAUCET_GITHUB` → `ArkLabsHQ/ark-faucet`
- ...and 10 more

**Setup**: `make generate-env` → `make install` → Restart Claude Code

---

## Support Matrix

| Use Case | Agent | Time Saved | Confidence |
|----------|-------|------------|------------|
| Feature Implementation | ark-developer | 30-50% | High |
| Bug Fixing | ark-developer | 40-60% | High |
| Code Understanding | ark-guru | 80%+ | High |
| Testing | ark-developer | 70-80% | High |
| Code Review | ark-pr-reviewer | 50% | High |
| Feature Planning | ark-project-manager | 60% | Medium |
| Progress Tracking | ark-progress-tracker | 90%+ | High |
| Protocol Research | ark-researcher | 70-80% | Medium |

---

**Last Updated**: 2025-11-06
**Full Documentation**: [ARKADIAN_USE_CASES.md](ARKADIAN_USE_CASES.md)
