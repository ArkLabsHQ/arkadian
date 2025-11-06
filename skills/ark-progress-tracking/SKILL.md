---
description: Progress tracking and reporting across Ark ecosystem (12 projects) for stakeholder visibility
---

# Ark Progress Tracking Skill

## Purpose
Enable comprehensive progress tracking across the entire Ark ecosystem (12 projects) to provide stakeholder-friendly reports for people not directly involved in day-to-day development.

## When to Use

### Use Progress Tracking When:
- **Weekly Reports**: "Summarize last week's progress"
- **Project Health**: "What's happening with arkd?"
- **Feature Tracking**: "Track Nostr integration status"
- **Cross-Project Analysis**: "Show me API changes affecting wallet and SDK"
- **Stakeholder Updates**: Non-technical audience needs progress visibility
- **Timeline Questions**: "Are we on track for December release?"

### Don't Use When:
- **Technical PR Review**: Use ark-pr-reviewer instead (code quality, architecture compliance)
- **Implementation Work**: Use ark-developer instead
- **Debugging**: Use ark-debugger instead
- **Q&A**: Use ark-guru instead

## Tracking Modes

### Quick Mode (Weekly Summary)
**Trigger**: "last week's progress" or "weekly report"
**Scope**: All 12 Ark repos, last 7 days
**Output**: Executive-friendly weekly progress report
**Time**: ~2-3 minutes

**Example**:
```
User: "Summarize last week's Ark progress"
→ Fetches merged PRs from all repos (7 days)
→ Categorizes by type (features/bugs/infra)
→ Maps to business value
→ Identifies blockers and risks
→ Generates stakeholder-friendly report
```

### Project-Specific Mode
**Trigger**: "arkd progress" or "what's happening with wallet?"
**Scope**: Single project, last 30 days
**Output**: Project health report with velocity metrics
**Time**: ~1-2 minutes

**Example**:
```
User: "What's the current status of arkd?"
→ Fetches arkd PRs (30 days)
→ Analyzes velocity trends
→ Checks for blockers
→ Identifies dependencies on other projects
→ Generates project health report
```

### Feature Tracking Mode
**Trigger**: "track [feature name]" or "status of [feature]"
**Scope**: All repos, feature-specific PRs
**Output**: Feature progress report with completion percentage
**Time**: ~1-2 minutes

**Example**:
```
User: "Track Nostr integration progress"
→ Searches for "nostr" PRs across all repos
→ Groups by status (merged/in-review/draft)
→ Maps dependencies (arkd → wallet)
→ Calculates completion (90%)
→ Estimates ETA
```

### Cross-Project Analysis Mode
**Trigger**: "API changes" or "changes affecting [project1] and [project2]"
**Scope**: Multiple projects, coordination analysis
**Output**: Cross-project coordination report with timeline
**Time**: ~2-3 minutes

**Example**:
```
User: "Show me API changes affecting wallet and SDK"
→ Detects proto changes in arkd
→ Checks SDK update status
→ Verifies wallet waiting on SDK
→ Maps coordination timeline
→ Identifies action items
```

## Integration with Orchestrator

### Standalone Usage
```
User request: "Summarize last week's progress"
→ Orchestrator routes directly to ark-progress-tracker
→ Mode: weekly_summary
→ Output: Stakeholder report
```

### Combined with PR Review
```
User request: "Comprehensive analysis of arkd PR #234"
→ Orchestrator uses pr-comprehensive-analysis.md workflow
→ Step 1: ark-pr-reviewer (technical analysis)
→ Step 2: ark-progress-tracker (business context)
→ Step 3: Synthesis (combined report)
```

## Capabilities

### Data Collection
- Fetch PRs from all 12 Ark repositories via GitHub CLI
- Filter by date ranges (7 days, 30 days, custom)
- Search for feature keywords across repos
- Get commit activity and contributor stats

### Categorization
- By type: features, improvements, bug fixes, infrastructure, documentation
- By priority: critical, high, medium, low
- By status: merged, in-review, draft, blocked
- By project: all 12 Ark repos

### Business Value Translation
- Maps technical changes to stakeholder language
- Examples:
  - "gRPC endpoint" → "New API capability for integrations"
  - "Race condition fix" → "Critical reliability improvement"
  - "Database migration" → "Scalability improvement"
  - "UI redesign" → "User experience enhancement"

### Cross-Project Impact Detection
- Proto changes affecting SDK and wallet
- API breaking changes requiring coordination
- Infrastructure updates affecting deployments
- Database migrations requiring maintenance windows

### Report Generation
- Executive summaries (non-technical audience)
- Weekly progress reports (comprehensive)
- Project health reports (velocity, trends)
- Feature progress reports (completion, ETA)
- Cross-project coordination reports (dependencies, timeline)

## Ark Ecosystem Projects

The skill tracks these 12 projects:

**Core Infrastructure**:
- arkd (server)
- go-sdk (client library)

**Applications & Services**:
- wallet (PWA)
- ark-faucet (testnet faucet)
- ark-simulator (load testing)
- arkade-escrow (escrow service)
- fulmine (Lightning wallet)
- boltz-backend (swap infrastructure)

**Infrastructure & Operations**:
- ark-infra (IaC deployment)
- ark-telemetry (monitoring)
- kms-unlocker (wallet automation)

**Documentation**:
- ark-docs (official docs)

**Key Dependencies**:
```
arkd → go-sdk → (ark-faucet, ark-simulator, kms-unlocker)
arkd → wallet, arkade-escrow (via @arkade-os/sdk)
wallet → fulmine (Lightning integration)
fulmine → boltz-backend (Swap provider)
```

## Configuration Files

### report-templates.yaml
Defines report format templates for:
- Weekly progress summaries
- Project health reports
- Feature progress reports
- Cross-project coordination reports

### project-mapping.yaml
Maps Ark projects to:
- Business areas (payments, swaps, infrastructure, etc.)
- Stakeholder groups (product, ops, BD)
- Priority levels
- Coordination patterns

## Usage Examples

### Example 1: Weekly Report
```
User: "Give me last week's Ark progress"

Orchestrator invokes:
agent: ark-progress-tracker
mode: weekly_summary
time_period: last_7_days
projects: all

Output: Weekly progress report with:
- Executive summary
- Feature progress by project
- Critical fixes
- Infrastructure updates
- Blockers and risks
- Next week priorities
```

### Example 2: Feature Tracking
```
User: "Track multi-database support progress"

Orchestrator invokes:
agent: ark-progress-tracker
mode: feature_tracking
feature_name: "multi-database"
projects: all

Output: Feature progress report with:
- Feature status: 100% complete
- arkd: ✅ Merged
- go-sdk: ✅ Updated
- wallet: ✅ Compatible
- Timeline: Shipped on time
```

### Example 3: Cross-Project Analysis
```
User: "Show proto changes affecting other projects"

Orchestrator invokes:
agent: ark-progress-tracker
mode: cross_project_analysis
focus: "proto_changes"
projects: [arkd, go-sdk, wallet]

Output: Coordination report with:
- Proto change in arkd (merged Dec 12)
- SDK update required (PR #79 in progress)
- Wallet blocked until SDK v0.3.2
- Coordination timeline: 2-3 days
- Action items for each team
```

## Success Criteria

**Good Progress Report**:
- Non-technical language (stakeholder-friendly)
- Clear business value for each change
- Honest assessment of risks and blockers
- Actionable next steps
- Timeline transparency
- Celebrates wins and acknowledges challenges

**Bad Progress Report**:
- Too technical (jargon-heavy)
- Missing "why this matters"
- Ignores blockers or sugarcoats issues
- No clear next steps
- Vague timelines
- Only reports activity, not value

## Limitations

- **Read-only**: Does not modify code or create PRs
- **GitHub-based**: Requires GitHub CLI (gh) and access to ark-network repos
- **English-only**: Reports generated in English
- **7-30 day window**: Best for recent activity; older history may be incomplete
- **Requires labels**: Categorization accuracy depends on PR labels and keywords

## Related Agents

- **ark-pr-reviewer**: Technical code review (architecture, security, quality)
- **ark-guru**: Q&A and conceptual explanations
- **ark-developer**: Implementation work
- **ark-project-manager**: Scoping and task planning

## Related Workflows

- **track-ark-progress.md**: Core workflow for progress tracking
- **pr-comprehensive-analysis.md**: Combines technical review + business context

---

**Skill Owner**: Arkadian Orchestrator
**Agent**: ark-progress-tracker
**Last Updated**: 2025-11-05
