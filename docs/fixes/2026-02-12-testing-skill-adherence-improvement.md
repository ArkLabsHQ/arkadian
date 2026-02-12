# Testing Skill Adherence Improvement

**Date**: 2026-02-12
**Session**: a3e28991-9c32-4f2c-a956-95be9ea20151
**Issue**: ark-developer agent did not follow arkd-dev-loop skill instructions during test execution

---

## Problem Summary

During session a3e28991 (implementing Bitcoin median time for VTXO expiry), ark-developer failed to follow the documented arkd-dev-loop skill when running integration tests. This resulted in:
- **22 minutes of wasted time** (2 failed test attempts, each timing out after 11 minutes)
- **Incomplete test validation** (test never actually executed)
- **User intervention required** to identify root cause

### Root Cause

The arkd-dev-loop skill documents a **critical prerequisite** in Step 5: wallet initialization (check status → create wallet → unlock → fund). ark-developer skipped this step entirely, causing the test to hang indefinitely in `TestMain.setupServerWalletAndCLI()` which polls for wallet initialization.

### Evidence

**What the skill says** (arkd-dev-loop/SKILL.md, lines 132-191):
```markdown
## Step 5: arkd Wallet Operations
### Check wallet status (do this first to decide what's needed)
curl -s http://localhost:7071/v1/admin/wallet/status | jq .

### If NOT initialized — create wallet:
SEED=$(curl -s http://localhost:7071/v1/admin/wallet/seed | jq -r '.seed')
curl -X POST http://localhost:7071/v1/admin/wallet/create ...
```

**What ark-developer did**:
```bash
# 1. Started infrastructure
nigiri start
docker compose up -d

# 2. ❌ SKIPPED wallet initialization entirely

# 3. Ran test (hung for 11 minutes)
go test -v -count=1 -run TestMedianTimeForVTXOSweeping -timeout 600s ./test/e2e
```

**Result**: Test hung at line 2164 in `e2e_test.go:setupServerWalletAndCLI()` waiting for wallet to become initialized.

---

## Impact Analysis

### Time Wasted
- S6 Attempt 1: 11 minutes (timeout)
- S6 Attempt 2: 11 minutes (timeout after clean restart)
- Total: **22 minutes** of avoidable failures

### Test Quality
Despite the execution failure, the test code itself was **excellent**:
- ✅ Comprehensive (4 verification steps)
- ✅ Well-documented
- ✅ Proper assertions
- ✅ Good test design

**The issue was purely operational** - not following documented procedures.

### User Experience
- User had to manually diagnose the issue
- Session marked as "partial" instead of "success"
- Lost confidence in agent's ability to execute tests independently

---

## Improvements Implemented

### 1. Enhanced ark-developer.md Agent Prompt

**Location**: `/agents/ark-developer.md` (TESTING POLICY section)

**Added**:
- ⚠️ CRITICAL warning to consult dev-loop skill BEFORE running tests
- Explicit callout of Step 5 (wallet initialization) as the "Most common failure point"
- Side-by-side comparison of ❌ WRONG vs ✅ CORRECT execution patterns
- Skill adherence checklist for test execution

**Key addition**:
```markdown
**⚠️ CRITICAL**: You MUST consult and follow the relevant dev-loop skill BEFORE running tests.

- **For arkd**: Use the `arkd-dev-loop` skill. Follow Steps 0-7 IN ORDER:
  - Step 5: Wallet initialization (CHECK STATUS → initialize → unlock → fund) **[CRITICAL]**
```

### 2. Updated development_unified.yaml Workflow Template

**Location**: `/templates/workflows/development_unified.yaml`

**Added to implement phase actions**:
```yaml
- "CRITICAL: Follow dev-loop skill for integration tests (arkd-dev-loop or fulmine-dev-loop)"
- "For arkd: Follow arkd-dev-loop Steps 0-7 IN ORDER (especially Step 5: wallet init)"
- "Document which dev-loop skill was followed in test-evidence.md"
```

**Enhanced test-evidence.md requirements**:
```yaml
MUST include:
- Which dev-loop skill was followed
- Steps executed from the skill
- Wallet initialization status (for arkd: initialized/unlocked/funded)
- Any deviations from the skill's documented procedure
```

### 3. Created This Findings Document

**Purpose**: Preserve the analysis for future reference and pattern recognition.

---

## Recommendations for Future Prevention

### For Orchestrator
- Execution specs should explicitly reference which skill to follow
- Example S6.yaml improvement:
  ```yaml
  objective: |
    Run TestMedianTimeForVTXOSweeping following arkd-dev-loop skill Steps 0-7.
    CRITICAL: Must initialize wallet (Step 5) before running test (Step 7).
  ```

### For Post-Agent Validator Hook
Consider adding validation for test-evidence.md:
- Check for "Skill followed: arkd-dev-loop" section
- Flag as warning if test execution phase doesn't cite skill
- Validate wallet status was checked (for arkd tests)

### For Agent Training
Pattern to recognize: **If objective contains "run test" → identify skill → read skill BEFORE starting**

---

## Efficiency Metrics

### Before Improvements
- Average test setup time: 22+ minutes (including failures)
- Success rate: 0% (2/2 attempts failed)
- Root cause identification time: ~2 minutes post-failure

### Expected After Improvements
- Average test setup time: ~5 minutes (following skill steps correctly)
- Success rate: >90% (with explicit skill reference in prompts)
- Prevention of repeat failures: ✅ (skill adherence enforced in workflow)

---

## Related Files

- Session artifacts: `/sessions/a3e28991-9c32-4f2c-a956-95be9ea20151/`
- arkd-dev-loop skill: `/skills/arkd-dev-loop/SKILL.md`
- ark-developer agent: `/agents/ark-developer.md`
- Workflow template: `/templates/workflows/development_unified.yaml`

---

## Takeaway

**Key Lesson**: Skills exist to codify operational knowledge that's easy to forget. When agents skip documented procedures, they waste time rediscovering information that was already captured.

**Solution**: Make skill adherence **explicit and mandatory** at multiple levels:
1. Agent prompt (CRITICAL warnings)
2. Workflow templates (step-by-step references)
3. Execution specs (direct citations)
4. Validation hooks (enforce documentation of skill usage)

**Impact**: This single improvement is expected to prevent **90%+ of similar test execution failures** in future development workflows.
