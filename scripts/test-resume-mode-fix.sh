#!/bin/bash
# Test script to verify the resume mode fix
# This tests that SessionStart hook correctly distinguishes between:
# 1. New session (no workflow.yaml)
# 2. Continuing session (workflow.yaml exists, but not explicit resume)
# 3. Explicit resume (workflow.yaml exists AND ARKADIAN_RESUME_SESSION set)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARKADIAN_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DATA_DIR="${ARKADIAN_DIR}/log"
SESSIONS_DIR="${ARKADIAN_DIR}/sessions"

echo "=== Testing Resume Mode Detection Fix ==="
echo ""

# Create a test session directory
TEST_SESSION_ID="test-$(date +%s)"
TEST_SESSION_DIR="${SESSIONS_DIR}/${TEST_SESSION_ID}"
TEST_LOG="${DATA_DIR}/${TEST_SESSION_ID}_log.txt"

cleanup() {
    echo ""
    echo "Cleaning up test session..."
    rm -rf "$TEST_SESSION_DIR"
    rm -f "$TEST_LOG"
    rm -f "${DATA_DIR}/${TEST_SESSION_ID}_state.json"
    rm -f "${DATA_DIR}/${TEST_SESSION_ID}_active.txt"
}

trap cleanup EXIT

# Test 1: New session (no workflow.yaml)
echo "Test 1: New session (no workflow.yaml)"
echo "========================================"
mkdir -p "$TEST_SESSION_DIR"

INPUT_JSON=$(cat <<EOF
{
    "session_id": "${TEST_SESSION_ID}",
    "transcript_path": "/tmp/test.jsonl",
    "cwd": "${ARKADIAN_DIR}",
    "hook_event_name": "SessionStart",
    "source": "compact",
    "model": "test"
}
EOF
)

export ARKADIAN_ORCHESTRATOR_MODE=1
export ARKADIAN_DIR="${ARKADIAN_DIR}"

echo "$INPUT_JSON" | bun "${ARKADIAN_DIR}/hooks/session-start-hook.ts" 2>&1 | grep -i "session-start" || true

if grep -q "new-session" "$TEST_LOG"; then
    echo "✅ PASS: Detected as new session"
else
    echo "❌ FAIL: Should be detected as new session"
    cat "$TEST_LOG"
    exit 1
fi

echo ""

# Test 2: Continuing session (workflow.yaml exists, no explicit resume)
echo "Test 2: Continuing session (workflow.yaml exists, no env var)"
echo "=============================================================="

# Create workflow.yaml to simulate orchestrator creating it
cat > "${TEST_SESSION_DIR}/workflow.yaml" <<EOF
workflow_id: "${TEST_SESSION_ID}"
name: "test-workflow"
execution:
  phases:
    - id: "S1"
      name: "test"
EOF

# Clear the log
> "$TEST_LOG"

# Run hook again WITHOUT explicit resume env var
unset ARKADIAN_RESUME_SESSION
unset ARKADIAN_RESUME_SESSION_DIR

echo "$INPUT_JSON" | bun "${ARKADIAN_DIR}/hooks/session-start-hook.ts" 2>&1 | grep -i "session-start" || true

if grep -q "continuing-session" "$TEST_LOG"; then
    echo "✅ PASS: Detected as continuing session (not explicit resume)"

    # Check that isResumeMode was FALSE (should NOT preserve active_agent)
    if ! grep -q "resumed-state" "$TEST_LOG"; then
        echo "✅ PASS: Did NOT enter resume preservation logic"
    else
        echo "❌ FAIL: Should NOT preserve state in continuing mode"
        cat "$TEST_LOG"
        exit 1
    fi
else
    echo "❌ FAIL: Should be detected as continuing session"
    cat "$TEST_LOG"
    exit 1
fi

echo ""

# Test 3: Explicit resume (workflow.yaml exists AND env var set)
echo "Test 3: Explicit resume (workflow.yaml + ARKADIAN_RESUME_SESSION)"
echo "=================================================================="

# Create state file to simulate existing state
cat > "${DATA_DIR}/${TEST_SESSION_ID}_state.json" <<EOF
{
    "session_id": "${TEST_SESSION_ID}",
    "type": "orchestrator",
    "pid": 12345,
    "transcript_path": "/tmp/old.jsonl",
    "workflow": {
        "status": "executing",
        "current_phase": "S2"
    },
    "phases": {
        "S1": {
            "status": "complete"
        }
    },
    "active_agent": {
        "agent_type": "ark-guru",
        "spec_id": "S1"
    },
    "approvals": {}
}
EOF

# Clear the log
> "$TEST_LOG"

# Set explicit resume env var
export ARKADIAN_RESUME_SESSION="${TEST_SESSION_ID}"
export ARKADIAN_RESUME_SESSION_DIR="${TEST_SESSION_DIR}"

echo "$INPUT_JSON" | bun "${ARKADIAN_DIR}/hooks/session-start-hook.ts" 2>&1 | grep -i "session-start" || true

if grep -q "resume-mode" "$TEST_LOG"; then
    echo "✅ PASS: Detected as explicit resume"

    # Check that state was preserved (but active_agent reset to null)
    if grep -q "resumed-state" "$TEST_LOG"; then
        echo "✅ PASS: Entered resume preservation logic"

        # Verify active_agent was reset to null
        UPDATED_STATE=$(cat "${DATA_DIR}/${TEST_SESSION_ID}_state.json")
        if echo "$UPDATED_STATE" | grep -q '"active_agent": null'; then
            echo "✅ PASS: active_agent was reset to null (will be set by pre-agent-validator)"
        else
            echo "❌ FAIL: active_agent should be null after SessionStart"
            echo "$UPDATED_STATE"
            exit 1
        fi

        # Verify workflow and phases were preserved
        if echo "$UPDATED_STATE" | grep -q '"current_phase": "S2"'; then
            echo "✅ PASS: Workflow state preserved"
        else
            echo "❌ FAIL: Workflow state should be preserved"
            exit 1
        fi

        if echo "$UPDATED_STATE" | grep -q '"S1"'; then
            echo "✅ PASS: Phase history preserved"
        else
            echo "❌ FAIL: Phase history should be preserved"
            exit 1
        fi
    else
        echo "❌ FAIL: Should enter resume preservation logic"
        cat "$TEST_LOG"
        exit 1
    fi
else
    echo "❌ FAIL: Should be detected as explicit resume"
    cat "$TEST_LOG"
    exit 1
fi

echo ""
echo "=== All Tests Passed! ==="
echo ""
echo "Summary:"
echo "  ✅ New session: Creates fresh state"
echo "  ✅ Continuing session: Reuses directory but doesn't preserve state"
echo "  ✅ Explicit resume: Preserves workflow/phases but resets active_agent"
echo ""
echo "The fix ensures:"
echo "  - pre-agent-validator can always set active_agent when invoking agents"
echo "  - orchestrator-guardrail can correctly detect sub-agents"
echo "  - Resume mode only activates when explicitly requested"
