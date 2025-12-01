# Arkadian Comprehensive Test Checklist

**78 Test Cases** covering all aspects of Arkadian quality.

## Instructions

1. Start fresh Claude Code session: `claude`
2. Run each test prompt
3. Score based on validation criteria
4. Record pass (✅), partial (⚠️), or fail (❌)

---

## Level 1: Agent Routing (70 points)

### L1.01 - ark-guru: Protocol concept (5 pts)
```
How does VTXO expiry work in arkd?
```
- [ ] Routes to ark-guru
- [ ] Does NOT write code
- [ ] Provides citations/file references
- [ ] Loads arkd project context
**Score:** ___ / 5

### L1.02 - ark-guru: Architecture (5 pts)
```
Explain the hexagonal architecture in arkd
```
- [ ] Routes to ark-guru
- [ ] Mentions: domain, application, infrastructure, ports, adapters
**Score:** ___ / 5

### L1.03 - ark-developer: Add endpoint (5 pts)
```
Add a GetServerInfo gRPC endpoint to arkd
```
- [ ] Routes to ark-developer
- [ ] Generates code
- [ ] Modifies *.proto and *.go files
**Score:** ___ / 5

### L1.04 - ark-developer: Bug fix (5 pts)
```
Fix the race condition in arkd round finalization
```
- [ ] Routes to ark-developer
- [ ] Loads arkd project
**Score:** ___ / 5

### L1.05 - ark-progress-tracker: Weekly (5 pts)
```
What did the team do this week in arkd?
```
- [ ] Routes to ark-progress-tracker
- [ ] Uses git commands
- [ ] Lists commits/PRs
- [ ] Business-friendly language
**Score:** ___ / 5

### L1.06 - ark-progress-tracker: Multi-project (5 pts)
```
Show progress across arkd, go-sdk, and wallet this week
```
- [ ] Routes to ark-progress-tracker
- [ ] Analyzes all 3 repos
**Score:** ___ / 5

### L1.07 - ark-pr-reviewer: PR analysis (5 pts)
```
Review the latest merged PR in arkd
```
- [ ] Routes to ark-pr-reviewer
- [ ] Uses gh CLI
- [ ] Provides risk assessment
**Score:** ___ / 5

### L1.08 - ark-pr-reviewer: Commits (5 pts)
```
Analyze the last 5 commits in go-sdk for breaking changes
```
- [ ] Routes to ark-pr-reviewer
- [ ] Checks breaking changes
**Score:** ___ / 5

### L1.09 - ark-env-tester: Run tests (5 pts)
```
Run unit tests for arkd
```
- [ ] Routes to ark-env-tester
- [ ] Executes tests
- [ ] Reports results
**Score:** ___ / 5

### L1.10 - ark-env-tester: Start stack (5 pts)
```
Start local arkd development stack
```
- [ ] Routes to ark-env-tester
- [ ] Uses Docker
**Score:** ___ / 5

### L1.11 - ark-project-manager: Spec (5 pts)
```
Create a specification for fraud detection alerts in arkd
```
- [ ] Routes to ark-project-manager
- [ ] Creates spec artifact
- [ ] Includes user stories
**Score:** ___ / 5

### L1.12 - ark-project-manager: Tasks (5 pts)
```
Break down the notification system feature into tasks
```
- [ ] Routes to ark-project-manager
- [ ] Creates tasks
- [ ] Dependency ordered
**Score:** ___ / 5

### L1.13 - ark-researcher: Comparison (5 pts)
```
Compare Ark to Lightning Network for payment scalability
```
- [ ] Routes to ark-researcher
- [ ] Uses web search
- [ ] Cites sources
**Score:** ___ / 5

### L1.14 - ark-researcher: Bitcoin (5 pts)
```
Research OP_CTV covenant proposal and its implications for Ark
```
- [ ] Routes to ark-researcher
- [ ] Provides confidence levels
**Score:** ___ / 5

**Level 1 Total:** ___ / 70

---

## Level 2: Project Path Verification (36 points)

### L2.01 - arkd (3 pts)
```
Show me the main.go file in arkd
```
- [ ] Uses correct path (${ARKD_REPO})
- [ ] File exists: cmd/arkd/main.go
**Score:** ___ / 3

### L2.02 - go-sdk (3 pts)
```
Show the client interface in go-sdk
```
- [ ] Uses correct path (${GO_SDK_REPO})
**Score:** ___ / 3

### L2.03 - wallet (3 pts)
```
Show the App.tsx component in wallet
```
- [ ] Uses correct path (${WALLET_REPO})
**Score:** ___ / 3

### L2.04 - ark-faucet (3 pts)
```
Show the main handler in ark-faucet
```
- [ ] Uses correct path (${ARK_FAUCET_REPO})
**Score:** ___ / 3

### L2.05 - ark-simulator (3 pts)
```
How does ark-simulator create test clients?
```
- [ ] Uses correct path (${ARK_SIMULATOR_REPO})
**Score:** ___ / 3

### L2.06 - ark-telemetry (3 pts)
```
Show the Prometheus alert rules in ark-telemetry
```
- [ ] Uses correct path (${ARK_TELEMETRY_REPO})
**Score:** ___ / 3

### L2.07 - ark-infra (3 pts)
```
Show the Docker Compose configuration in ark-infra
```
- [ ] Uses correct path (${ARK_INFRA_REPO})
**Score:** ___ / 3

### L2.08 - kms-unlocker (3 pts)
```
How does kms-unlocker integrate with AWS?
```
- [ ] Uses correct path (${KMS_UNLOCKER_REPO})
**Score:** ___ / 3

### L2.09 - fulmine (3 pts)
```
Show the swap service in fulmine
```
- [ ] Uses correct path (${FULMINE_REPO})
**Score:** ___ / 3

### L2.10 - boltz-backend (3 pts)
```
Explain the swap API in boltz-backend
```
- [ ] Uses correct path (${BOLTZ_BACKEND_REPO})
**Score:** ___ / 3

### L2.11 - ark-docs (3 pts)
```
Show the VTXO documentation from ark-docs
```
- [ ] Uses correct path (${ARK_DOCS_REPO})
**Score:** ___ / 3

### L2.12 - arkade-escrow (3 pts)
```
Explain the escrow contract in arkade-escrow
```
- [ ] Uses correct path (${ARKADE_ESCROW_REPO})
**Score:** ___ / 3

**Level 2 Total:** ___ / 36

---

## Level 3: Agent Contract Compliance (96 points)

### L3.01 - ark-guru answer block (8 pts)
```
What is a VTXO in Ark protocol?
```
- [ ] Output contains `<answer>` section
- [ ] Output contains `<summary>`
- [ ] Output contains `<confidence>`
- [ ] Provides file references
**Score:** ___ / 8

### L3.02 - ark-developer changes block (8 pts)
```
Add a comment to the main.go file in arkd explaining what it does
```
- [ ] Output contains `<changes>` section
- [ ] Output contains `<summary>`
- [ ] Changes list files modified
**Score:** ___ / 8

### L3.03 - ark-env-tester test results (8 pts)
```
Run go test for the domain package in arkd
```
- [ ] Output contains `<tests>` section
- [ ] Reports pass/fail count
- [ ] Includes coverage
**Score:** ___ / 8

### L3.04 - ark-pr-reviewer review block (8 pts)
```
Review arkd PR #832
```
- [ ] Output contains `<review>` section
- [ ] Output contains `<risk_assessment>`
- [ ] Provides verdict (approve/request changes)
**Score:** ___ / 8

### L3.05 - ark-progress-tracker metrics (8 pts)
```
Generate weekly progress report for arkd with metrics
```
- [ ] Includes commit count
- [ ] Includes PR count
- [ ] Includes contributor list
- [ ] Business impact section
**Score:** ___ / 8

### L3.06 - ark-project-manager spec (8 pts)
```
Create a specification for adding rate limiting to arkd
```
- [ ] Creates spec file
- [ ] Spec has user stories
- [ ] Spec has acceptance criteria
- [ ] Spec has success criteria
**Score:** ___ / 8

### L3.07 - Handover protocol (8 pts)
```
Implement GetHealth endpoint in arkd and run integration tests
```
- [ ] Handover block present
- [ ] Handover to ark-env-tester
- [ ] Handover has context
**Score:** ___ / 8

### L3.08 - Error handling format (8 pts)
```
Run tests for nonexistent package xyz in arkd
```
- [ ] Status indicates failure
- [ ] Error block present
- [ ] Recovery suggestion
**Score:** ___ / 8

### L3.09 - Verification against criteria (8 pts)
```
Add logging to arkd service.go and verify it works
```
- [ ] Verification block present
- [ ] Criteria marked satisfied/unsatisfied
**Score:** ___ / 8

### L3.10 - Artifact paths use env vars (8 pts)
```
Create a patch file for arkd changes
```
- [ ] Artifact paths use ${ARTIFACTS_DIR}
- [ ] No hardcoded absolute paths
**Score:** ___ / 8

### L3.11 - ark-researcher sources (8 pts)
```
Research state channels vs Ark protocol
```
- [ ] Cites multiple sources
- [ ] Provides confidence levels
- [ ] Distinguishes HIGH/MEDIUM/LOW confidence
**Score:** ___ / 8

### L3.12 - Status enum values (8 pts)
```
Try to add a feature but make tests fail
```
- [ ] Status is valid: success, failure, or partial
**Score:** ___ / 8

**Level 3 Total:** ___ / 96

---

## Level 4: Cross-Project Intelligence (100 points)

### L4.01 - arkd + go-sdk dependency (10 pts)
```
Show how go-sdk uses arkd APIs
```
- [ ] Loads both projects
- [ ] Identifies API contract
**Score:** ___ / 10

### L4.02 - Proto changes impact (10 pts)
```
If I change arkd proto files, what other projects are affected?
```
- [ ] Identifies downstream: go-sdk, wallet
- [ ] Explains impact
**Score:** ___ / 10

### L4.03 - wallet + fulmine (10 pts)
```
How does wallet use fulmine for Lightning swaps?
```
- [ ] Loads both projects
- [ ] Explains integration
**Score:** ___ / 10

### L4.04 - telemetry + arkd (10 pts)
```
How does ark-telemetry monitor arkd metrics?
```
- [ ] Loads both projects
- [ ] Identifies metrics
**Score:** ___ / 10

### L4.05 - infra deployment (10 pts)
```
What services does ark-infra deploy for a full stack?
```
- [ ] Lists deployed services
- [ ] References other projects
**Score:** ___ / 10

### L4.06 - Ecosystem progress (10 pts)
```
Summarize all activity this week across all Ark projects
```
- [ ] Analyzes all repos
- [ ] Aggregates metrics
- [ ] Identifies coordination
**Score:** ___ / 10

### L4.07 - Breaking change cascade (10 pts)
```
What happens if I change the VTXO struct in arkd?
```
- [ ] Identifies cascade: arkd → go-sdk → ark-faucet → ark-simulator
- [ ] Explains migration
**Score:** ___ / 10

### L4.08 - Test coverage ecosystem (10 pts)
```
Which projects have the lowest test coverage?
```
- [ ] Analyzes multiple repos
- [ ] Provides coverage comparison
**Score:** ___ / 10

### L4.09 - Documentation sync (10 pts)
```
Is ark-docs in sync with arkd's current API?
```
- [ ] Compares projects
- [ ] Identifies gaps
**Score:** ___ / 10

### L4.10 - Feature tracking (10 pts)
```
Track Lightning integration progress across all projects
```
- [ ] Searches all repos
- [ ] Per-project status
- [ ] Identifies blockers
**Score:** ___ / 10

**Level 4 Total:** ___ / 100

---

## Level 5: Workflow Compliance (120 points)

### L5.01 - quick_question workflow (12 pts)
```
What is round settlement in Ark?
```
- [ ] Follows quick_question workflow
- [ ] Single phase: answer
- [ ] No code changes
- [ ] Provides citations
**Score:** ___ / 12

### L5.02 - quick_fix workflow (12 pts)
```
Fix the typo in arkd README.md
```
- [ ] Follows quick_fix workflow
- [ ] Phases: fix → auto_test
- [ ] Changes under 100 lines
- [ ] Changes under 3 files
**Score:** ___ / 12

### L5.03 - small_feature workflow (12 pts)
```
Add a GetVersion endpoint to arkd
```
- [ ] Follows small_feature workflow
- [ ] Creates branch
- [ ] Runs tests
**Score:** ___ / 12

### L5.04 - feature_full_lifecycle workflow (12 pts)
```
Plan and implement a notification system for arkd
```
- [ ] Phases: specify → clarify → plan → tasks → analyze → implement → test → pr
- [ ] Creates spec.md
- [ ] Creates plan.md
- [ ] Creates tasks.md
- [ ] Approval required at: specify, plan, tasks, pr
**Score:** ___ / 12

### L5.05 - pr_review_comprehensive workflow (12 pts)
```
Do a comprehensive review of arkd PR #845
```
- [ ] Phases: review → test → aggregate
- [ ] Parallel: review & test
**Score:** ___ / 12

### L5.06 - Approval checkpoint (12 pts)
```
Create a specification for multi-database support
```
- [ ] Requests approval
- [ ] Approval message present
- [ ] Checkpoint created
**Score:** ___ / 12

### L5.07 - Timeout handling (12 pts)
```
Run a very long operation that might timeout
```
- [ ] Respects timeout
- [ ] Timeout seconds defined
**Score:** ___ / 12

### L5.08 - Recovery on failure (12 pts)
```
Implement feature but have tests fail, then recover
```
- [ ] Retries on failure
- [ ] Checkpoint preserved
- [ ] Can resume from checkpoint
**Score:** ___ / 12

### L5.09 - Multi-agent handoff (12 pts)
```
Implement GetStatus endpoint and validate with integration tests
```
- [ ] Uses: ark-developer, ark-env-tester
- [ ] Proper handover
- [ ] Context preserved
**Score:** ___ / 12

### L5.10 - Success criteria verification (12 pts)
```
Add endpoint with criteria: tests pass, coverage 80%+
```
- [ ] Verifies all criteria
- [ ] Reports criteria status
**Score:** ___ / 12

**Level 5 Total:** ___ / 120

---

## Level 6: Edge Cases (60 points)

### L6.01 - Ambiguous project (6 pts)
```
How do wallets work?
```
- [ ] Asks clarification OR loads multiple contexts
**Score:** ___ / 6

### L6.02 - Non-existent feature (6 pts)
```
Show me the Ethereum bridge in arkd
```
- [ ] Reports not found
- [ ] No hallucination
- [ ] Suggests alternatives
**Score:** ___ / 6

### L6.03 - Dormant project (6 pts)
```
What happened this week in kms-unlocker?
```
- [ ] Reports no activity
- [ ] Provides historical context
- [ ] No invented commits
**Score:** ___ / 6

### L6.04 - Invalid PR number (6 pts)
```
Review arkd PR #999999
```
- [ ] Reports not found
- [ ] Graceful error
**Score:** ___ / 6

### L6.05 - Vague research (6 pts)
```
Tell me about Bitcoin
```
- [ ] Asks clarification
- [ ] Narrows scope
**Score:** ___ / 6

### L6.06 - Mixed intent (6 pts)
```
Explain VTXOs and then add a new VTXO type
```
- [ ] Handles both intents OR asks clarification
**Score:** ___ / 6

### L6.07 - Wrong project for task (6 pts)
```
Run Docker tests in ark-docs
```
- [ ] Identifies mismatch
- [ ] Suggests correct project
**Score:** ___ / 6

### L6.08 - Impossible request (6 pts)
```
Make arkd work without Bitcoin
```
- [ ] Explains impossibility
- [ ] Provides alternatives
**Score:** ___ / 6

### L6.09 - Empty repository (6 pts)
```
Show progress in a brand new empty repository
```
- [ ] Handles gracefully
- [ ] No crash
**Score:** ___ / 6

### L6.10 - Conflicting instructions (6 pts)
```
Add a feature but don't write any code
```
- [ ] Identifies conflict
- [ ] Asks clarification
**Score:** ___ / 6

**Level 6 Total:** ___ / 60

---

## Level 7: Role-Specific Quality (100 points)

### L7.01 - Developer: technical depth (10 pts)
```
Explain arkd's round consensus with code references
```
- [ ] Includes code paths (file:line)
- [ ] Technical terminology
- [ ] File/line references
**Score:** ___ / 10

### L7.02 - Executive: no jargon (10 pts)
```
Weekly progress summary for the board
```
- [ ] NO: gRPC, proto, VTXO, mutex, goroutine, hexagonal
- [ ] Business metrics included
- [ ] Timeline/risk assessment
**Score:** ___ / 10

### L7.03 - QA Engineer: test focus (10 pts)
```
What tests should I run before arkd release?
```
- [ ] Lists: unit, integration, e2e
- [ ] Environment requirements
- [ ] Pass criteria
- [ ] Test commands
**Score:** ___ / 10

### L7.04 - Product Manager: planning (10 pts)
```
Plan the fraud detection feature
```
- [ ] Structured spec
- [ ] User stories
- [ ] Acceptance criteria
- [ ] NOT implementation details
**Score:** ___ / 10

### L7.05 - DevOps: operational (10 pts)
```
How do I deploy arkd to staging?
```
- [ ] Deployment steps
- [ ] Infrastructure references
- [ ] Monitoring mentioned
**Score:** ___ / 10

### L7.06 - Tech Lead: architecture (10 pts)
```
Review arkd architecture compliance
```
- [ ] Architecture analysis
- [ ] Pattern compliance
- [ ] Recommendations
**Score:** ___ / 10

### L7.07 - Researcher: academic (10 pts)
```
Compare Ark cryptographic assumptions to Lightning
```
- [ ] Academic tone
- [ ] Citations
- [ ] Confidence levels
- [ ] Multiple sources
**Score:** ___ / 10

### L7.08 - Engineering Manager: coordination (10 pts)
```
Cross-team dependencies for next sprint
```
- [ ] Team coordination
- [ ] Dependency graph
- [ ] Blockers identified
- [ ] Actionable
**Score:** ___ / 10

### L7.09 - Technical Writer: docs (10 pts)
```
Document the GetVtxo API endpoint
```
- [ ] Documentation format
- [ ] Examples included
- [ ] Clear language
**Score:** ___ / 10

### L7.10 - Junior Developer: explanatory (10 pts)
```
Explain how to add a new gRPC endpoint to arkd step by step
```
- [ ] Step-by-step
- [ ] Beginner friendly
- [ ] Explains why
- [ ] No assumed knowledge
**Score:** ___ / 10

**Level 7 Total:** ___ / 100

---

## Final Scoring

| Level | Category | Max | Score |
|-------|----------|-----|-------|
| L1 | Agent Routing | 70 | ___ |
| L2 | Project Paths | 36 | ___ |
| L3 | Agent Contracts | 96 | ___ |
| L4 | Cross-Project | 100 | ___ |
| L5 | Workflow Compliance | 120 | ___ |
| L6 | Edge Cases | 60 | ___ |
| L7 | Role Quality | 100 | ___ |
| **TOTAL** | | **582** | ___ |

## Quality Rating

| Score | Percentage | Rating |
|-------|------------|--------|
| 525+ | 90%+ | 🟢 **PRODUCTION READY** |
| 437-524 | 75-89% | 🟡 **BETA** |
| 349-436 | 60-74% | 🟠 **ALPHA** |
| <349 | <60% | 🔴 **NEEDS WORK** |

---

## Quick Test (8 tests, 10 min)

For fast validation, run only:
- L1.01, L1.05, L2.01, L3.01, L4.01, L5.01, L6.02, L7.02

## Smoke Test (3 tests, 3 min)

Minimal validation:
- L1.01: Basic Q&A routing
- L1.05: Progress tracking
- L6.02: No hallucination

---

## Notes

```
Date: ___________
Tester: ___________
Version: ___________

Issues Found:




Recommendations:




```
