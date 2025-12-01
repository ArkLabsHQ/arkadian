# Arkadian Manual Test Checklist

Quick manual verification of Arkadian quality. Run in a fresh Claude Code session.

## Instructions

1. Start a new Claude Code session: `claude`
2. Run each test prompt below
3. Check the validation criteria
4. Score: ✅ Pass | ⚠️ Partial | ❌ Fail
5. Calculate total score at the end

---

## Level 1: Agent Routing (70 points)

### T1.1 - ark-guru Q&A (10 pts)
**Prompt:**
```
How does VTXO expiry work in arkd?
```
**Validation:**
- [ ] Routes to ark-guru (uses Task tool with ark-guru)
- [ ] Loads arkd project context
- [ ] Explains VTXO lifecycle (creation → expiry → sweep)
- [ ] Mentions timelock mechanism
- [ ] Does NOT attempt to write code

**Score:** ___ / 10

---

### T1.2 - ark-developer Implementation (10 pts)
**Prompt:**
```
Add a simple health check endpoint to arkd that returns the server version
```
**Validation:**
- [ ] Routes to ark-developer
- [ ] Follows hexagonal architecture
- [ ] Creates/modifies proto file
- [ ] Implements Go handler
- [ ] Includes basic test

**Score:** ___ / 10

---

### T1.3 - ark-progress-tracker (10 pts)
**Prompt:**
```
What did the team do this week in arkd?
```
**Validation:**
- [ ] Routes to ark-progress-tracker
- [ ] Uses git log / gh CLI
- [ ] Shows commits/PRs from last 7 days
- [ ] Lists authors with contributions
- [ ] Business-friendly summary

**Score:** ___ / 10

---

### T1.4 - ark-pr-reviewer (10 pts)
**Prompt:**
```
Review the latest merged PR in arkd
```
**Validation:**
- [ ] Routes to ark-pr-reviewer
- [ ] Finds PR via gh CLI
- [ ] Analyzes code changes
- [ ] Identifies risks/impacts
- [ ] Architecture compliance check

**Score:** ___ / 10

---

### T1.5 - ark-env-tester (10 pts)
**Prompt:**
```
Run the unit tests for go-sdk
```
**Validation:**
- [ ] Routes to ark-env-tester
- [ ] Executes `go test` or make target
- [ ] Reports test results
- [ ] Summarizes pass/fail counts
- [ ] Mentions any failures

**Score:** ___ / 10

---

### T1.6 - ark-project-manager (10 pts)
**Prompt:**
```
Create a specification for adding rate limiting to arkd gRPC endpoints
```
**Validation:**
- [ ] Routes to ark-project-manager
- [ ] Creates structured spec document
- [ ] Includes problem statement
- [ ] Defines user stories
- [ ] Lists acceptance criteria

**Score:** ___ / 10

---

### T1.7 - ark-researcher (10 pts)
**Prompt:**
```
Research how Lightning Network handles channel capacity compared to Ark
```
**Validation:**
- [ ] Routes to ark-researcher
- [ ] Performs web search
- [ ] Multiple sources cited
- [ ] Compares both approaches
- [ ] Technical accuracy

**Score:** ___ / 10

---

## Level 2: Cross-Project (45 points)

### T2.1 - Multi-Repo Analysis (15 pts)
**Prompt:**
```
Show me all work this week affecting arkd, go-sdk, and wallet
```
**Validation:**
- [ ] Analyzes all 3 repositories
- [ ] Shows per-repo breakdown
- [ ] Identifies cross-project dependencies
- [ ] Highlights coordination points
- [ ] Business-friendly format

**Score:** ___ / 15

---

### T2.2 - Breaking Change Detection (15 pts)
**Prompt:**
```
Are there any proto changes in arkd this week that would affect go-sdk?
```
**Validation:**
- [ ] Searches for .proto file changes
- [ ] Checks arkd server/proto/ directory
- [ ] Identifies breaking vs non-breaking
- [ ] Lists affected downstream projects
- [ ] Suggests coordination steps

**Score:** ___ / 15

---

### T2.3 - Feature Tracking (15 pts)
**Prompt:**
```
Track Lightning integration progress across all Ark projects
```
**Validation:**
- [ ] Searches multiple repos for Lightning-related work
- [ ] Shows status per project
- [ ] Identifies blockers
- [ ] Provides timeline estimate
- [ ] Lists relevant PRs/commits

**Score:** ___ / 15

---

## Level 3: Edge Cases (30 points)

### T3.1 - Ambiguous Query (10 pts)
**Prompt:**
```
How do wallets work?
```
**Validation:**
- [ ] Asks for clarification OR
- [ ] Loads multiple wallet contexts (wallet PWA, go-sdk, arkd-wallet)
- [ ] Explains different wallet types in Ark
- [ ] Doesn't assume single project

**Score:** ___ / 10

---

### T3.2 - Non-Existent Feature (10 pts)
**Prompt:**
```
Show me the Ethereum bridge implementation in arkd
```
**Validation:**
- [ ] Correctly reports feature doesn't exist
- [ ] Does NOT hallucinate code or file paths
- [ ] May suggest related features (Lightning, Liquid)
- [ ] Explains what Ark actually supports

**Score:** ___ / 10

---

### T3.3 - Dormant Project (10 pts)
**Prompt:**
```
What happened this week in kms-unlocker?
```
**Validation:**
- [ ] Correctly reports no recent activity
- [ ] Provides historical context
- [ ] Explains project status (stable/complete)
- [ ] Doesn't invent fake commits

**Score:** ___ / 10

---

## Level 4: Role-Specific Quality (30 points)

### T4.1 - Executive Language (15 pts)
**Prompt:**
```
Generate a weekly progress summary for the executive team - no technical jargon
```
**Validation:**
- [ ] NO technical terms (gRPC, proto, VTXO, mutex)
- [ ] Business metrics (features delivered, timeline)
- [ ] Risk assessment
- [ ] Revenue/customer impact mentioned
- [ ] Actionable insights

**Score:** ___ / 15

---

### T4.2 - Developer Technical Depth (15 pts)
**Prompt:**
```
Explain the round settlement consensus mechanism in arkd with code references
```
**Validation:**
- [ ] Technical accuracy
- [ ] Code file references (path:line)
- [ ] Implementation details
- [ ] Edge cases mentioned
- [ ] Links domain concepts to code

**Score:** ___ / 15

---

## Scoring Summary

| Level | Max | Your Score |
|-------|-----|------------|
| Level 1: Agent Routing | 70 | ___ |
| Level 2: Cross-Project | 45 | ___ |
| Level 3: Edge Cases | 30 | ___ |
| Level 4: Role Quality | 30 | ___ |
| **TOTAL** | **175** | ___ |

## Quality Rating

| Score | Rating | Status |
|-------|--------|--------|
| 158+ (90%) | Production Ready | ✅ Ship it |
| 131-157 (75-89%) | Beta | ⚠️ Minor issues |
| 105-130 (60-74%) | Alpha | ⚠️ Needs work |
| <105 (<60%) | Development | ❌ Major issues |

---

## Quick Smoke Test (5 minutes)

If short on time, run these 3 tests:

1. **T1.1** - Basic Q&A routing
2. **T1.3** - Progress tracking
3. **T3.2** - Hallucination check

Passing all 3 = basic quality assured.

---

## Notes

_Record observations, bugs, or suggestions here:_

```
Date: ___________
Tester: ___________

Observations:




Bugs Found:




Suggestions:




```
