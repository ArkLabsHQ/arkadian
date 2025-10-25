# User Story 1 Validation: Intent Classification Test Cases

**Feature**: 001-orchestration-foundation
**User Story**: US1 - Intelligent Intent Routing
**Date**: 2025-10-25

## Test Cases (from spec.md)

### Test Case 1: Quick Fix
**User Request**: "fix typo in README"
**Expected Classification**:
```yaml
intent_classification:
  primary: "develop"
  sub_intent: "quick_fix"
  complexity: "simple"
  urgency: "normal"
```
**Expected Workflow**: quick_fix.yaml
**Expected Routing**: Directly to ark-developer (no PM)
**Status**: ⏳ Pending validation (requires Phase 4 templates)

---

### Test Case 2: Medium Feature
**User Request**: "add fraud detection alerts to arkd"
**Expected Classification**:
```yaml
intent_classification:
  primary: "develop"
  sub_intent: "medium_feature"
  complexity: "medium"
  urgency: "normal"
```
**Expected Workflow**: feature_full_lifecycle.yaml
**Expected Routing**: ark-project-manager for full lifecycle
**Status**: ⏳ Pending validation (requires Phase 4 templates)

---

### Test Case 3: Large Feature with Research
**User Request**: "rewrite the entire payment processing system"
**Expected Classification**:
```yaml
intent_classification:
  primary: "develop"
  sub_intent: "large_feature"
  complexity: "complex"
  urgency: "normal"
```
**Expected Workflow**: feature_full_lifecycle.yaml (with research phase)
**Expected Routing**: ark-project-manager with research phase included
**Status**: ⏳ Pending validation (requires Phase 4 templates)

---

### Test Case 4: Production Outage (Critical Urgency)
**User Request**: "arkd is down in production, fix immediately"
**Expected Classification**:
```yaml
intent_classification:
  primary: "debug"
  sub_intent: "critical"
  complexity: "simple"
  urgency: "critical"
```
**Expected Workflow**: debug_and_fix.yaml with urgency:critical variant
**Expected Routing**: ark-debugger → ark-developer with approval skipping enabled
**Status**: ⏳ Pending validation (requires Phase 4 templates)

---

### Test Case 5: Simple Question
**User Request**: "how do VTXOs work?"
**Expected Classification**:
```yaml
intent_classification:
  primary: "ask_question"
  sub_intent: null
  complexity: "simple"
  urgency: "normal"
```
**Expected Workflow**: quick_question.yaml
**Expected Routing**: ark-guru (single agent, no approvals)
**Status**: ⏳ Pending validation (requires Phase 4 templates)

---

## Validation Checklist

- [ ] Test Case 1: Quick fix routes correctly
- [ ] Test Case 2: Medium feature uses full lifecycle
- [ ] Test Case 3: Large feature includes research phase
- [ ] Test Case 4: Critical urgency skips approvals
- [ ] Test Case 5: Simple question routes to guru only

## Validation Notes

All test cases require workflow templates from Phase 4 to be implemented before full end-to-end validation can occur. The intent classification logic (Phase 2) and workflow selection logic (Phase 3) are now in place in CLAUDE.md.

**Next Step**: Implement Phase 4 (workflow templates) to enable full validation of routing behavior.
