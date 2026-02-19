#!/bin/bash
# migrate-old-sessions.sh
# Creates symlinks for all renamed sessions that don't have them yet

set -euo pipefail

ARKADIAN_DIR="${ARKADIAN_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
SESSIONS_DIR="${ARKADIAN_DIR}/sessions"

echo "🔍 Scanning for renamed sessions without symlinks..."
echo "  Sessions directory: $SESSIONS_DIR"
echo ""

FIXED_COUNT=0
SKIPPED_COUNT=0
ERROR_COUNT=0

# Find all workflow.yaml files not at root level (indicating renamed sessions)
find "$SESSIONS_DIR" -mindepth 2 -maxdepth 3 -name "workflow.yaml" | while read wf; do
    SESSION_DIR=$(dirname "$wf")
    SESSION_NAME=$(basename "$SESSION_DIR")

    # Extract workflow_id from workflow.yaml
    WORKFLOW_ID=$(grep -m1 "^workflow_id:" "$wf" | awk '{print $2}' | tr -d '"' || true)

    if [ -z "$WORKFLOW_ID" ]; then
        # Fallback: try session_id (old format)
        WORKFLOW_ID=$(grep -m1 "^session_id:" "$wf" | awk '{print $2}' | tr -d '"' || true)
    fi

    if [ -z "$WORKFLOW_ID" ]; then
        # Fallback: try metadata.session_id (nested format)
        WORKFLOW_ID=$(grep -A5 "^metadata:" "$wf" | grep "session_id:" | head -1 | awk '{print $2}' | tr -d '"' || true)
    fi

    if [ -z "$WORKFLOW_ID" ]; then
        echo "⚠️  Skipping $SESSION_NAME (no workflow_id/session_id found)"
        ((SKIPPED_COUNT++))
        continue
    fi

    UUID_PATH="${SESSIONS_DIR}/${WORKFLOW_ID}"

    # Calculate relative path from SESSIONS_DIR to SESSION_DIR
    # This works on macOS without GNU coreutils
    RELATIVE_PATH="${SESSION_DIR#${SESSIONS_DIR}/}"

    # Check if symlink already exists
    if [ -L "$UUID_PATH" ]; then
        CURRENT_TARGET=$(readlink "$UUID_PATH")

        if [ "$CURRENT_TARGET" = "$RELATIVE_PATH" ]; then
            echo "✅ $WORKFLOW_ID → Already correct"
            ((SKIPPED_COUNT++))
        else
            echo "⚠️  $WORKFLOW_ID → Incorrect symlink (fixing)"
            rm "$UUID_PATH"
            ln -s "$RELATIVE_PATH" "$UUID_PATH"
            echo "   Fixed: $WORKFLOW_ID → $RELATIVE_PATH"
            ((FIXED_COUNT++))
        fi
        continue
    fi

    # Check if UUID path exists as a directory (shouldn't happen but check anyway)
    if [ -d "$UUID_PATH" ]; then
        echo "⚠️  $WORKFLOW_ID → UUID directory exists (not a symlink)"
        echo "   Manual intervention needed: $UUID_PATH"
        ((ERROR_COUNT++))
        continue
    fi

    if ln -s "$RELATIVE_PATH" "$UUID_PATH" 2>/dev/null; then
        echo "✅ Created: $WORKFLOW_ID → $RELATIVE_PATH"
        ((FIXED_COUNT++))
    else
        echo "❌ Failed: $WORKFLOW_ID → $RELATIVE_PATH"
        ((ERROR_COUNT++))
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Migration Summary:"
echo "  ✅ Fixed: $FIXED_COUNT"
echo "  ⏭️  Skipped: $SKIPPED_COUNT"
echo "  ❌ Errors: $ERROR_COUNT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERROR_COUNT -gt 0 ]; then
    echo ""
    echo "⚠️  Some sessions had errors. Review the output above for details."
    exit 1
fi

echo ""
echo "✅ Migration complete! All sessions are now resumable by UUID or friendly name."
