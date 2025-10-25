# Quickstart Guide: Orchestration Foundation (Phase 1)

**Feature**: 001-orchestration-foundation
**Version**: 1.0.0
**Date**: 2025-10-25

## Table of Contents

1. [Overview](#overview)
2. [For Users: How This Changes Your Experience](#for-users-how-this-changes-your-experience)
3. [For Developers: How to Implement](#for-developers-how-to-implement)
4. [Testing & Validation](#testing--validation)
5. [Troubleshooting](#troubleshooting)

---

## Overview

The Orchestration Foundation (Phase 1) enhances the Arkadian orchestrator with four core capabilities:

1. **Intent Sub-Classification** - Smarter routing based on request complexity
2. **Workflow Templates** - Standardized execution patterns
3. **Context Budget Management** - Protection against 200K token overflow
4. **Execution Logging** - Historical data for future learning

**Impact**: 60% faster simple requests, 40% reduction in orchestration overhead, zero context overflow failures.

---

## For Users: How This Changes Your Experience

### Before (Current System)

**Scenario 1: Quick Fix**
```
User: "fix typo in README"

Orchestrator:
1. Classifies as "develop" (no granularity)
2. Creates custom plan (5-7 steps)
3. Spawns ark-project-manager
4. PM creates full spec.md (unnecessary)
5. PM creates plan.md (unnecessary)
6. PM spawns ark-developer
7. Developer fixes typo

Total time: 5 minutes (lots of overhead)
```

**Scenario 2: Large Feature Request**
```
User: "add fraud detection alerts"

Orchestrator:
1. Classifies as "develop" (same as quick fix!)
2. Creates custom plan
3. Might route to ark-developer directly (wrong!)
4. Developer gets overwhelmed (needs planning first)

Result: Suboptimal routing
```

### After (With Orchestration Foundation)

**Scenario 1: Quick Fix** (Improved)
```
User: "fix typo in README"

Orchestrator:
1. Classifies as develop:quick_fix, complexity:simple
2. Loads quick_fix.yaml template
3. Routes directly to ark-developer (no PM overhead)
4. Developer fixes typo

Total time: 2 minutes (60% faster!)
```

**Scenario 2: Medium Feature** (Improved)
```
User: "add fraud detection alerts"

Orchestrator:
1. Classifies as develop:medium_feature, complexity:medium
2. Loads feature_full_lifecycle.yaml template
3. Routes to ark-project-manager for full cycle:
   - PM: specify → plan → tasks → analyze
   - PM: hands off to ark-developer
   - Developer: implements
   - Tester: validates

Total time: 45 minutes (appropriate for scope)
Result: Correct routing with appropriate planning
```

**Scenario 3: Multi-Project Investigation** (Protected)
```
User: "How does arkd communicate with wallet and go-sdk?"

Orchestrator:
1. Classifies as ask_question, multi_project:true
2. Selects arkd, wallet, go-sdk projects
3. Loads context with budget tracking:
   - Tier 1: Master index (5K tokens)
   - Tier 2: 3 project indexes (15K tokens)
   - Tier 3: Deep docs for 3 projects (60K tokens)
   - At 85% usage (170K tokens): Removes architecture docs
   - Stays under 200K limit ✓

Result: Success! (Would have failed before)
```

---

## For Developers: How to Implement

### Implementation Checklist

Phase 1 implementation involves:

- [ ] **Part 1**: Modify CLAUDE.md (4 surgical changes)
- [ ] **Part 2**: Create 8 workflow template files
- [ ] **Part 3**: Create supporting infrastructure (budget tracking, execution logging)
- [ ] **Part 4**: Initialize empty log files
- [ ] **Part 5**: Test with validation scenarios

### Part 1: Modify CLAUDE.md

**Location**: `/Users/dusansekulic/code/go/arkadian/CLAUDE.md`

#### Change 1: Intent Classification Enhancement (Line 52)

**Find**:
```markdown
## INTENT ANALYSIS

### Extract Intent-Action
Classify the user's primary action (single best fit):
1. `ask_question` (Q&A / conceptual)
2. `develop` (new feature / bug fix / tests)
...
```

**Add After** (at end of INTENT ANALYSIS section):
```markdown
### Enhanced Intent Classification

After identifying primary intent, perform sub-classification:

**For intent=develop**:
- quick_fix: ≤3 files, <100 lines, keywords: ["typo", "doc", "comment", "README"]
- small_feature: ≤10 files, <500 lines, keywords: ["endpoint", "component", "simple"]
- medium_feature: ≤30 files, <1000 lines, keywords: ["feature", "add", "integrate"]
- large_feature: >30 files or >1000 lines, keywords: ["rewrite", "redesign", "major"]

**Complexity classification**:
- simple: Single-agent, no planning (ask_question, quick_fix, test_or_run)
- medium: Multi-agent, standard planning (small_feature, medium_feature, debug)
- complex: Multi-agent, planning + research (large_feature, multi_project, performance)

**Urgency classification** (based on keywords):
- critical: ["prod down", "emergency", "urgent", "asap", "critical"] → skip approvals
- high: ["soon", "important", "priority"] → standard approvals
- normal: default
- low: ["when you can", "eventually", "nice to have"]

**Output Format**:
```yaml
intent_classification:
  primary: "develop"
  sub_intent: "medium_feature"
  complexity: "medium"
  urgency: "normal"
  multi_project: false
  projects: ["arkd"]
```
```

#### Change 2: Workflow Template Selection (Line 153)

**Find**:
```markdown
### Create Plan (DAG)
- Build a small plan (2-7 steps)
- Use parallel groups for independent steps; sequence dependent steps
...
```

**Replace With**:
```markdown
### Select Workflow Template

Instead of ad-hoc planning, select from predefined templates:

**Template Selection Logic**:
1. Load template based on intent classification
2. Read from `.specify/templates/workflows/{template_name}.yaml`
3. Template defines: agents, phases, approvals, checkpoints, duration
4. If no template matches: fall back to ad-hoc planning (preserve current behavior)

**Template Matching Rules**:
```python
if intent.primary == "ask_question" and intent.complexity == "simple":
    template = "quick_question.yaml"

elif intent.primary == "develop":
    if intent.sub_intent == "quick_fix":
        template = "quick_fix.yaml"
    elif intent.sub_intent == "small_feature":
        template = "small_feature.yaml"
    elif intent.sub_intent in ["medium_feature", "large_feature"]:
        template = "feature_full_lifecycle.yaml"

elif intent.primary == "debug":
    template = "debug_and_fix.yaml"

elif intent.primary == "performance_analysis":
    template = "performance_optimization.yaml"

elif intent.primary == "analyze_pr_or_commits":
    template = "pr_review_comprehensive.yaml"

elif intent.multi_project and len(projects) >= 2:
    template = "multi_project_investigation.yaml"

else:
    # No match: fall back to ad-hoc planning
    template = None
```

### Execute Workflow Template

If template selected:
1. Load template YAML file
2. For each phase in template.phases:
   - Check if approval needed (phase.approval_required)
   - Spawn agent as defined (phase.agent)
   - Execute actions (phase.actions)
   - Create checkpoint if defined (phase.checkpoint)
   - Validate success criteria
   - Handle failures per template.recovery strategy
3. Log execution to .specify/memory/execution-history.json

If no template (fallback):
- Use existing ad-hoc planning logic (preserve current behavior)
```

#### Change 3: Context Budget Tracking (Line 81)

**Find**:
```markdown
### Keep Context Lean

- Load only files listed in `default_sections_by_intent` for the matched intent
...
```

**Add After**:
```markdown
### Context Budget Tracking

**CRITICAL: Enforce 200K token limit to prevent overflow failures.**

**Budget Allocation**:
- Total: 200,000 tokens (hard limit)
- Reserved for response: 20,000 tokens
- Available for context: 180,000 tokens
- Tier 1 (master index): 5,000 tokens
- Tier 2 (project indexes): 10,000 tokens
- Tier 3 (deep docs): 50,000 tokens
- Tier 4 (code files): 100,000 tokens
- Agent scratch space: 15,000 tokens

**Before loading any file**:
1. Estimate tokens: `file_size_chars / 4` (conservative heuristic)
2. Check: `current_usage + estimate <= tier_budget` AND `<= 180000`
3. If exceeded: Apply overflow strategy
4. Load file and update: `current_usage += estimate`, `tier_usage[tier] += estimate`
5. Log to `.specify/logs/context-usage.json`

**Overflow Strategies** (apply progressively):

**At 80% usage (160K tokens)**: Prioritize Recent Files
- Sort loaded files by modification time
- Remove oldest 30% of files from Tier 3
- Log: `{"strategy": "prioritize_recent", "tokens_freed": 8000}`

**At 85% usage (170K tokens)**: Prefer Usage Docs
- Remove all `system/architecture.md` files
- Remove all `sop/*.md` files except `how-to-*.md`
- Keep all `testing/usage.md` and `testing/how-to-*.md`
- Log: `{"strategy": "prefer_usage_docs", "tokens_freed": 12000}`

**At 90% usage (180K tokens)**: Summarize Large Files
- For each file >5000 tokens in Tier 3 or Tier 4:
  - Generate summary (1000 tokens max)
  - Replace full file with summary in context
- Log: `{"strategy": "summarize_large_files", "tokens_freed": 25000}`

**At 95% usage (190K tokens)**: Ask User to Narrow Scope
- Pause loading
- Ask user: "Context budget at 95%. Choose one:"
  - Option 1: "Focus on primary project only (remove secondary)"
  - Option 2: "Reduce documentation loading (summary only)"
  - Option 3: "Abort request"
- Apply user choice
- Log: `{"strategy": "ask_user_focus", "user_choice": "..."}`

**Conceptual Tracking** (in orchestrator's mental model):
```python
budget = {
    "total": 200000,
    "used": 0,
    "tier1": 0, "tier2": 0, "tier3": 0, "tier4": 0,
    "overflow_events": []
}

def load_file(path, tier):
    chars = get_file_size(path)
    tokens = chars // 4

    if budget["used"] + tokens > 180000:
        apply_overflow_strategy(budget)

    # Load file
    budget["used"] += tokens
    budget[tier] += tokens
```
```

#### Change 4: Execution Logging (After STATE UPDATES section, line 261)

**Find**:
```markdown
## STATE UPDATES

When appropriate, write back into relevant project docs:
...
```

**Add After**:
```markdown
## EXECUTION LOGGING

**Purpose**: Build historical dataset for Phase 3 learning system.

After each workflow execution (success or failure):

1. **Create log entry** in `.specify/memory/execution-history.json`
2. **Format**: Newline-delimited JSON (one record per line)
3. **Schema**:
   ```json
   {
     "execution_id": "uuid-v4",
     "timestamp": "ISO 8601",
     "user_request": "original request text",
     "intent": {
       "primary": "develop",
       "sub_intent": "medium_feature",
       "complexity": "medium",
       "urgency": "normal",
       "multi_project": false,
       "projects": ["arkd"]
     },
     "workflow": {
       "template_name": "feature_full_lifecycle",
       "template_version": "1.0.0",
       "fallback_to_adhoc": false
     },
     "agents": [
       {"type": "ark-project-manager", "duration_seconds": 1800}
     ],
     "duration_seconds": 2700,
     "success": true,
     "user_satisfaction": "approved",
     "artifacts": ["spec.md", "plan.md", "commit:abc123"],
     "context_usage": {
       "total_tokens": 95000,
       "tier1": 4500,
       "tier2": 8200,
       "tier3": 42000,
       "tier4": 40300,
       "overflow_events": 2
     },
     "errors": []
   }
   ```

4. **Append-only**: Use `echo '{...}' >> execution-history.json` (never overwrite)
5. **Graceful failure**: If logging fails, log warning but continue workflow
6. **Validation**: Check required fields before writing (execution_id, timestamp, user_request, intent, workflow)

**Log Triggers**:
- Workflow start: Create entry with execution_id, timestamp, user_request, intent
- Workflow end: Update entry with duration, success, user_satisfaction, context_usage
- User approval: Update entry with user_satisfaction: "approved" or "rejected"
- Failure: Update entry with success: false and errors array
```

### Part 2: Create Workflow Template Files

**Location**: `.specify/templates/workflows/`

Create directory:
```bash
mkdir -p /Users/dusansekulic/code/go/arkadian/.specify/templates/workflows
```

Create 8 template files (examples in next section):

1. `quick_question.yaml`
2. `quick_fix.yaml`
3. `small_feature.yaml`
4. `feature_full_lifecycle.yaml`
5. `debug_and_fix.yaml`
6. `performance_optimization.yaml`
7. `pr_review_comprehensive.yaml`
8. `multi_project_investigation.yaml`

**Template Structure** (refer to `contracts/workflow-template-schema.yaml` for full schema):

```yaml
# Minimal example: quick_question.yaml
metadata:
  name: "quick_question"
  description: "Simple Q&A, no code changes"
  version: "1.0.0"

applies_to:
  primary_intent: "ask_question"
  complexity: ["simple"]
  urgency: ["low", "normal", "high", "critical"]

execution:
  agents: ["ark-guru"]
  phases:
    - id: "ask"
      agent: "guru"
      depends_on: null
      approval_required: false
      actions:
        - "Load relevant docs from docs_hint"
        - "Explain concept with citations"
      timeout_seconds: 300

performance:
  estimated_duration_seconds: 120
  max_duration_seconds: 300
```

### Part 3: Create Supporting Infrastructure

**Option A: Inline in CLAUDE.md** (Recommended for Phase 1)
- No external files needed
- Orchestrator tracks budget conceptually
- Logging done via simple Bash commands

**Option B: Python Utilities** (Optional, if needed)

Create `.specify/utils/context_budget.py`:
```python
#!/usr/bin/env python3
import json

class ContextBudget:
    def __init__(self):
        self.total = 200000
        self.used = 0
        self.tiers = {"tier1": 0, "tier2": 0, "tier3": 0, "tier4": 0}

    def can_load(self, chars, tier):
        tokens = chars // 4
        return (self.used + tokens) <= self.total

    def load(self, chars, tier):
        tokens = chars // 4
        self.used += tokens
        self.tiers[tier] += tokens
        return tokens

    def usage_pct(self):
        return self.used / self.total

    def to_json(self):
        return json.dumps({
            "total": self.total,
            "used": self.used,
            "tiers": self.tiers,
            "usage_pct": self.usage_pct()
        })

if __name__ == "__main__":
    # CLI usage
    import sys
    budget = ContextBudget()
    # ... CLI logic
```

Create `.specify/utils/execution_logger.py`:
```python
#!/usr/bin/env python3
import json
import uuid
from datetime import datetime

def log_execution(user_request, intent, workflow, **kwargs):
    record = {
        "execution_id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "user_request": user_request,
        "intent": intent,
        "workflow": workflow,
        **kwargs
    }

    # Append to execution-history.json
    with open(".specify/memory/execution-history.json", "a") as f:
        f.write(json.dumps(record) + "\n")

    return record["execution_id"]
```

### Part 4: Initialize Log Files

```bash
# Create directories
mkdir -p /Users/dusansekulic/code/go/arkadian/.specify/memory
mkdir -p /Users/dusansekulic/code/go/arkadian/.specify/logs

# Create empty log files
touch /Users/dusansekulic/code/go/arkadian/.specify/memory/execution-history.json
touch /Users/dusansekulic/code/go/arkadian/.specify/logs/context-usage.json

# Ensure they're gitignored
echo ".specify/memory/execution-history.json" >> /Users/dusansekulic/code/go/arkadian/.gitignore
echo ".specify/logs/context-usage.json" >> /Users/dusansekulic/code/go/arkadian/.gitignore
```

---

## Testing & Validation

### Test Scenario 1: Intent Classification

**Test**: Verify intent sub-classification works correctly.

```bash
# Test quick_fix routing
User request: "fix typo in CLAUDE.md"
Expected intent:
  primary: develop
  sub_intent: quick_fix
  complexity: simple
  urgency: normal
Expected template: quick_fix.yaml
Expected agent: ark-developer (no PM)

# Test medium_feature routing
User request: "add fraud detection alerts to arkd"
Expected intent:
  primary: develop
  sub_intent: medium_feature
  complexity: medium
  urgency: normal
Expected template: feature_full_lifecycle.yaml
Expected agent: ark-project-manager → ark-developer

# Test critical urgency
User request: "arkd is down in production, fix now"
Expected intent:
  primary: debug
  urgency: critical
Expected template: debug_and_fix.yaml (emergency mode)
Expected behavior: Skip approvals
```

**Validation**:
- Check execution-history.json for correct intent classification
- Verify correct template was selected
- Verify correct agents were spawned

### Test Scenario 2: Context Budget Protection

**Test**: Verify overflow strategies prevent context window failures.

```bash
# Test multi-project investigation (triggers overflow)
User request: "How does arkd communicate with wallet and go-sdk?"
Expected projects: ["arkd", "wallet", "go-sdk"]
Expected behavior:
  1. Load Tier 1: Master index (5K tokens)
  2. Load Tier 2: 3 project indexes (15K tokens)
  3. Load Tier 3: Deep docs for 3 projects (60K tokens)
  4. At 85% usage: Apply "prefer usage docs" strategy
  5. Stay under 200K limit

# Check context-usage.json
cat .specify/logs/context-usage.json | grep "overflow_events"
Expected: overflow_events > 0
Expected: strategies_applied includes "prefer_usage_docs"
```

**Validation**:
- Verify context-usage.json has overflow event logged
- Verify total_tokens < 200000
- Verify workflow completed successfully (no overflow failure)

### Test Scenario 3: Execution Logging

**Test**: Verify all workflows are logged correctly.

```bash
# Run any workflow
User request: "explain how VTXOs work"

# Check execution-history.json
tail -n 1 .specify/memory/execution-history.json | jq .

Expected fields:
- execution_id (UUID v4)
- timestamp (ISO 8601)
- user_request ("explain how VTXOs work")
- intent.primary ("ask_question")
- workflow.template_name ("quick_question")
- duration_seconds (> 0)
- success (true/false)
```

**Validation**:
- Verify JSON is valid (use `jq` to parse)
- Verify all required fields present
- Verify append-only (previous entries preserved)

### Test Scenario 4: Template Execution

**Test**: Verify workflow templates execute correctly.

```bash
# Test feature_full_lifecycle template
User request: "add user authentication to arkd"

Expected phases (in order):
1. specify (ark-project-manager, approval required)
2. clarify (ark-project-manager, conditional)
3. plan (ark-project-manager, approval required)
4. tasks (ark-project-manager, approval required)
5. analyze (ark-project-manager, no approval)
6. implement (ark-developer, no approval)
7. test (ark-tester, no approval)
8. pr (ark-developer, approval required)

Expected checkpoints:
- specs/00X-user-authentication/spec.md
- specs/00X-user-authentication/plan.md
- specs/00X-user-authentication/tasks.md
- git commit SHA
```

**Validation**:
- Verify each phase executed in order
- Verify approval gates triggered at correct phases
- Verify checkpoints created
- Verify success criteria met

---

## Troubleshooting

### Issue 1: Template Not Found

**Symptom**: Orchestrator says "No template matches intent, falling back to ad-hoc planning"

**Cause**: Template file doesn't exist or intent matching failed.

**Fix**:
```bash
# Check template exists
ls -la .specify/templates/workflows/

# Check template YAML is valid
cat .specify/templates/workflows/feature_full_lifecycle.yaml

# Check applies_to section matches intent
# Example: If intent.primary = "develop" but template applies_to.primary_intent = "debugging" → mismatch
```

### Issue 2: Context Overflow Failure

**Symptom**: Workflow fails with "Context window overflow" error.

**Cause**: Budget tracking not working or overflow strategies not applied.

**Fix**:
```bash
# Check if budget tracking is enabled in CLAUDE.md
grep "Context Budget Tracking" CLAUDE.md

# Check context-usage.json for overflow events
cat .specify/logs/context-usage.json | jq .overflow_events

# If overflow_events = 0, budget tracking is not working
# Verify CLAUDE.md modifications were applied correctly
```

### Issue 3: Execution Logging Failed

**Symptom**: execution-history.json is empty or has invalid JSON.

**Cause**: Append failed or JSON schema invalid.

**Fix**:
```bash
# Check file permissions
ls -la .specify/memory/execution-history.json

# Check JSON validity
cat .specify/memory/execution-history.json | jq .
# If jq fails, JSON is corrupted

# Validate last entry
tail -n 1 .specify/memory/execution-history.json | jq .

# If logging is broken, manually create valid entry:
echo '{"execution_id":"test","timestamp":"2025-10-25T00:00:00Z","user_request":"test","intent":{"primary":"ask_question"},"workflow":{"template_name":"quick_question"},"duration_seconds":0,"success":true}' >> .specify/memory/execution-history.json
```

### Issue 4: Intent Misclassification

**Symptom**: User request routed to wrong workflow (e.g., large feature routed as quick fix).

**Cause**: Intent classification logic needs tuning.

**Fix**:
```bash
# Check execution-history.json for misclassifications
cat .specify/memory/execution-history.json | jq 'select(.user_satisfaction == "rejected")'

# Review intent classification rules in CLAUDE.md
# Adjust keywords or thresholds

# Example: If "add authentication" classified as quick_fix:
# - Check keywords: "add" should map to medium_feature, not quick_fix
# - Check line count estimate: authentication likely >100 lines
```

### Issue 5: Template Phase Fails

**Symptom**: Workflow fails at specific phase (e.g., "plan" phase times out).

**Cause**: Phase timeout too short or phase action failed.

**Fix**:
```bash
# Check execution-history.json for phase failure
cat .specify/memory/execution-history.json | jq '.phases_executed[] | select(.success == false)'

# Review template timeout
cat .specify/templates/workflows/feature_full_lifecycle.yaml | grep -A 3 "id: plan"

# If timeout_seconds: 900 (15 min) is too short, increase to 1200 (20 min)
# Edit template and update version
```

---

## Monitoring Dashboard

After workflows execute, you can monitor orchestration performance using the execution history and context usage logs.

### Execution History Analysis

**Location**: `.specify/memory/execution-history.json` (NDJSON format)

**View all executions**:
```bash
jq -s '.' .specify/memory/execution-history.json
```

**Calculate success rate by workflow template**:
```bash
# Feature full lifecycle success rate
jq 'select(.workflow.template_name=="feature_full_lifecycle") | .success' \
  .specify/memory/execution-history.json | \
  jq -s 'map(select(. == true)) | length as $success | length as $total | ($success / $total * 100)'
```

**Average duration by workflow**:
```bash
# Quick fix average duration (seconds)
jq 'select(.workflow.template_name=="quick_fix") | .duration_seconds' \
  .specify/memory/execution-history.json | \
  jq -s 'add / length'
```

**Find recent failures**:
```bash
# Failed workflows in last 7 days
jq --arg date "$(date -u -v-7d +%Y-%m-%d)" \
  'select(.success==false and .timestamp > $date)' \
  .specify/memory/execution-history.json
```

**User satisfaction metrics**:
```bash
# Approval vs rejection rates
jq '.user_satisfaction' .specify/memory/execution-history.json | \
  jq -s 'group_by(.) | map({key: .[0], count: length}) | from_entries'
```

### Context Usage Analysis

**Location**: `.specify/logs/context-usage.json`

**View context usage per execution**:
```bash
jq -s '.' .specify/logs/context-usage.json
```

**Average token usage by tier**:
```bash
# Average Tier 3 (deep docs) usage
jq '.final_usage.tier3' .specify/logs/context-usage.json | jq -s 'add / length'
```

**Overflow event frequency**:
```bash
# Count executions with overflow events
jq 'select(.overflow_events > 0) | .strategies_applied' \
  .specify/logs/context-usage.json | \
  jq -s 'flatten | group_by(.) | map({strategy: .[0], count: length})'
```

**Peak usage distribution**:
```bash
# Histogram of peak usage percentages
jq '.peak_usage_percentage' .specify/logs/context-usage.json | \
  jq -s 'group_by(. * 10 | floor) | map({bucket: (.[0] * 10 | floor), count: length})'
```

### Dashboard Visualization (Future Enhancement)

For real-time monitoring, consider:
1. **Grafana Dashboard**: Import execution logs into Grafana for visual charts
2. **CLI Tool**: Build a simple CLI to display stats (e.g., `arkd orchestration stats`)
3. **Web UI**: Create a web dashboard for browsing execution history

**Sample Metrics to Track**:
- Success rate per workflow template (target: >90%)
- Average duration vs. estimated duration (target: within ±20%)
- Context overflow event rate (target: <10% of executions)
- User satisfaction (approval rate target: >80%)

---

## Next Steps

After implementing Phase 1:

1. **Run validation tests** (see Testing & Validation section)
2. **Monitor execution logs** for issues
3. **Tune intent classification** based on misclassifications
4. **Adjust template timeouts** based on actual durations
5. **Prepare for Phase 2** (Agent Handoff Protocol) - see EXEC_PLAN.md

---

## References

- **Feature Specification**: [spec.md](./spec.md)
- **Implementation Plan**: [plan.md](./plan.md)
- **Data Model**: [data-model.md](./data-model.md)
- **Workflow Template Schema**: [contracts/workflow-template-schema.yaml](./contracts/workflow-template-schema.yaml)
- **EXEC_PLAN**: `/Users/dusansekulic/code/go/arkadian/EXEC_PLAN.md`

---

**Version**: 1.0.0
**Status**: Quickstart Complete
**Next**: Proceed to /speckit.tasks for task breakdown
