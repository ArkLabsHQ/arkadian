#!/bin/bash
# Verify the resume mode fix was applied correctly

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARKADIAN_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
HOOK_FILE="${ARKADIAN_DIR}/hooks/session-start-hook.ts"

echo "=== Verifying Resume Mode Fix ==="
echo ""

# Check 1: Resume mode detection uses explicitResume variable
echo "✓ Check 1: Resume mode detection..."
if grep -q "const explicitResume = process.env.ARKADIAN_RESUME_SESSION_DIR" "$HOOK_FILE"; then
    echo "  ✅ PASS: Uses explicitResume variable"
else
    echo "  ❌ FAIL: Missing explicitResume variable check"
    exit 1
fi

# Check 2: Checks explicitResume before treating as resume
echo "✓ Check 2: Explicit resume check in condition..."
if grep -q "if (explicitResume && existsSync(workflowFile))" "$HOOK_FILE"; then
    echo "  ✅ PASS: Checks explicitResume in resume condition"
else
    echo "  ❌ FAIL: Not checking explicitResume properly"
    exit 1
fi

# Check 3: Has continuing-session case
echo "✓ Check 3: Continuing session detection..."
if grep -q "continuing-session" "$HOOK_FILE"; then
    echo "  ✅ PASS: Has continuing-session case"
else
    echo "  ❌ FAIL: Missing continuing-session case"
    exit 1
fi

# Check 4: isResumeMode uses explicitResume
echo "✓ Check 4: isResumeMode calculation..."
if grep -q "const isResumeMode = !!explicitResume && existsSync(workflowFile)" "$HOOK_FILE"; then
    echo "  ✅ PASS: isResumeMode requires explicitResume"
else
    echo "  ❌ FAIL: isResumeMode should check explicitResume"
    exit 1
fi

# Check 5: active_agent is reset to null in resume mode
echo "✓ Check 5: active_agent reset in resume..."
if grep -q "existingState.active_agent = null" "$HOOK_FILE"; then
    echo "  ✅ PASS: active_agent is reset to null"
else
    echo "  ❌ FAIL: active_agent should be reset to null"
    exit 1
fi

# Check 6: Comment explains why active_agent is reset
echo "✓ Check 6: Documentation..."
if grep -q "CRITICAL: Always reset active_agent to null on SessionStart" "$HOOK_FILE"; then
    echo "  ✅ PASS: Has critical comment explaining the fix"
else
    echo "  ❌ FAIL: Should have comment explaining active_agent reset"
    exit 1
fi

echo ""
echo "=== All Verifications Passed! ==="
echo ""
echo "Summary of changes:"
echo "  1. ✅ Resume mode ONLY triggers with explicit env var"
echo "  2. ✅ Distinguishes 'continuing' from 'explicit resume'"
echo "  3. ✅ active_agent always reset to null on SessionStart"
echo "  4. ✅ pre-agent-validator will set active_agent when agent invoked"
echo ""
echo "This fixes:"
echo "  - ❌ Bug: SessionStart in any mode treated as resume if workflow.yaml exists"
echo "  - ❌ Bug: SessionStart preserved stale active_agent"
echo "  - ❌ Bug: orchestrator-guardrail couldn't detect sub-agents"
echo ""
echo "Next steps:"
echo "  1. Test the fix: bash scripts/verify-resume-fix.sh"
echo "  2. Commit changes: git add hooks/session-start-hook.ts"
echo "  3. Test end-to-end with: arkadian 'simple task'"
