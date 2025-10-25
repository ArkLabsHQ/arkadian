#!/usr/bin/env bash
# Orchestration Foundation Validation Script
# Tests all 4 user stories' acceptance criteria
# Feature: 001-orchestration-foundation

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ARKADIAN_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "==================================================================="
echo "Orchestration Foundation Validation"
echo "Feature: 001-orchestration-foundation"
echo "==================================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass_count=0
fail_count=0

function test_pass() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
  ((pass_count++))
}

function test_fail() {
  echo -e "${RED}✗ FAIL${NC}: $1"
  ((fail_count++))
}

function test_info() {
  echo -e "${YELLOW}ℹ INFO${NC}: $1"
}

# =================================================================
# Test Scenario 1: Intent Classification (US1)
# =================================================================
echo "Test Scenario 1: Intent Classification"
echo "---------------------------------------"

# Check CLAUDE.md has Enhanced Intent Classification section
if grep -q "### Enhanced Intent Classification" "$ARKADIAN_DIR/CLAUDE.md"; then
  test_pass "Enhanced Intent Classification section exists in CLAUDE.md"
else
  test_fail "Enhanced Intent Classification section missing from CLAUDE.md"
fi

# Check for sub-classification types
if grep -q "quick_fix" "$ARKADIAN_DIR/CLAUDE.md" && \
   grep -q "small_feature" "$ARKADIAN_DIR/CLAUDE.md" && \
   grep -q "medium_feature" "$ARKADIAN_DIR/CLAUDE.md" && \
   grep -q "large_feature" "$ARKADIAN_DIR/CLAUDE.md"; then
  test_pass "All develop sub-intents defined (quick_fix, small_feature, medium_feature, large_feature)"
else
  test_fail "Missing develop sub-intent definitions"
fi

# Check for complexity classification
if grep -q "simple: Single-agent" "$ARKADIAN_DIR/CLAUDE.md" && \
   grep -q "medium: Multi-agent, standard planning" "$ARKADIAN_DIR/CLAUDE.md" && \
   grep -q "complex: Multi-agent, planning + research" "$ARKADIAN_DIR/CLAUDE.md"; then
  test_pass "Complexity classification defined (simple, medium, complex)"
else
  test_fail "Missing complexity classification"
fi

# Check for urgency classification
if grep -q "critical:" "$ARKADIAN_DIR/CLAUDE.md" && \
   grep -q "high:" "$ARKADIAN_DIR/CLAUDE.md" && \
   grep -q "normal:" "$ARKADIAN_DIR/CLAUDE.md" && \
   grep -q "low:" "$ARKADIAN_DIR/CLAUDE.md"; then
  test_pass "Urgency classification defined (critical, high, normal, low)"
else
  test_fail "Missing urgency classification"
fi

echo ""

# =================================================================
# Test Scenario 2: Workflow Templates (US2)
# =================================================================
echo "Test Scenario 2: Workflow Templates"
echo "------------------------------------"

template_dir="$ARKADIAN_DIR/.specify/templates/workflows"
if [[ -d "$template_dir" ]]; then
  test_pass "Workflow templates directory exists"
else
  test_fail "Workflow templates directory missing"
fi

# Check all 8 templates exist
templates=(
  "quick_question.yaml"
  "quick_fix.yaml"
  "small_feature.yaml"
  "feature_full_lifecycle.yaml"
  "debug_and_fix.yaml"
  "performance_optimization.yaml"
  "pr_review_comprehensive.yaml"
  "multi_project_investigation.yaml"
)

for template in "${templates[@]}"; do
  if [[ -f "$template_dir/$template" ]]; then
    test_pass "Template exists: $template"
  else
    test_fail "Template missing: $template"
  fi
done

# Check CLAUDE.md has workflow selection logic
if grep -q "### Select Workflow Template" "$ARKADIAN_DIR/CLAUDE.md"; then
  test_pass "Workflow template selection logic in CLAUDE.md"
else
  test_fail "Workflow template selection logic missing from CLAUDE.md"
fi

# Check CLAUDE.md has execution logic
if grep -q "### Execute Workflow Template" "$ARKADIAN_DIR/CLAUDE.md"; then
  test_pass "Workflow template execution logic in CLAUDE.md"
else
  test_fail "Workflow template execution logic missing from CLAUDE.md"
fi

echo ""

# =================================================================
# Test Scenario 3: Context Budget Protection (US3)
# =================================================================
echo "Test Scenario 3: Context Budget Protection"
echo "-------------------------------------------"

# Check context budget tracking section
if grep -q "### Context Budget Tracking" "$ARKADIAN_DIR/CLAUDE.md"; then
  test_pass "Context Budget Tracking section exists in CLAUDE.md"
else
  test_fail "Context Budget Tracking section missing from CLAUDE.md"
fi

# Check overflow strategies
if grep -q "80% threshold" "$ARKADIAN_DIR/CLAUDE.md" && \
   grep -q "85% threshold" "$ARKADIAN_DIR/CLAUDE.md" && \
   grep -q "90% threshold" "$ARKADIAN_DIR/CLAUDE.md" && \
   grep -q "95% threshold" "$ARKADIAN_DIR/CLAUDE.md"; then
  test_pass "All 4 overflow strategies defined (80%, 85%, 90%, 95%)"
else
  test_fail "Missing overflow strategy definitions"
fi

# Check for context usage logging
log_dir="$ARKADIAN_DIR/.specify/logs"
if [[ -d "$log_dir" ]]; then
  test_pass "Context usage log directory exists (.specify/logs/)"
else
  test_fail "Context usage log directory missing"
fi

if [[ -f "$log_dir/context-usage.json" ]]; then
  test_pass "Context usage log file initialized"
else
  test_fail "Context usage log file missing"
fi

echo ""

# =================================================================
# Test Scenario 4: Execution Logging (US4)
# =================================================================
echo "Test Scenario 4: Execution Logging"
echo "-----------------------------------"

# Check execution logging section
if grep -q "## EXECUTION LOGGING" "$ARKADIAN_DIR/CLAUDE.md"; then
  test_pass "EXECUTION LOGGING section exists in CLAUDE.md"
else
  test_fail "EXECUTION LOGGING section missing from CLAUDE.md"
fi

# Check for all 4 logging triggers
if grep -q "Trigger 1: Workflow Start" "$ARKADIAN_DIR/CLAUDE.md" && \
   grep -q "Trigger 2: Workflow End" "$ARKADIAN_DIR/CLAUDE.md" && \
   grep -q "Trigger 3: User Approval/Rejection" "$ARKADIAN_DIR/CLAUDE.md" && \
   grep -q "Trigger 4: Workflow Failure" "$ARKADIAN_DIR/CLAUDE.md"; then
  test_pass "All 4 logging triggers documented"
else
  test_fail "Missing logging trigger documentation"
fi

# Check execution history file
memory_dir="$ARKADIAN_DIR/.specify/memory"
if [[ -d "$memory_dir" ]]; then
  test_pass "Execution history directory exists (.specify/memory/)"
else
  test_fail "Execution history directory missing"
fi

if [[ -f "$memory_dir/execution-history.json" ]]; then
  test_pass "Execution history file initialized"
else
  test_fail "Execution history file missing"
fi

# Check graceful failure handling
if grep -q "Graceful Failure Handling" "$ARKADIAN_DIR/CLAUDE.md"; then
  test_pass "Graceful failure handling documented"
else
  test_fail "Graceful failure handling missing"
fi

echo ""

# =================================================================
# Summary
# =================================================================
echo "==================================================================="
echo "Validation Summary"
echo "==================================================================="
echo -e "${GREEN}Passed:${NC} $pass_count"
echo -e "${RED}Failed:${NC} $fail_count"
echo ""

if [[ $fail_count -eq 0 ]]; then
  echo -e "${GREEN}✓ All validation tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some validation tests failed. Review above output.${NC}"
  exit 1
fi
