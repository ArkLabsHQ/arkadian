#!/usr/bin/env bash
# Arkadian Change-Log Initialization Script
#
# Creates SYNC_HISTORY.md and last-sync.txt for all projects
#
# Usage: ./scripts/arkadian-init-changelogs.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARKADIAN_ROOT="$(dirname "$SCRIPT_DIR")"
DOCS_DIR="${ARKADIAN_ROOT}/docs"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Project list
PROJECTS=(
  "arkd"
  "go-sdk"
  "wallet"
  "ark-faucet"
  "ark-simulator"
  "ark-telemetry"
  "ark-infra"
  "kms-unlocker"
  "fulmine"
  "ark-docs"
  "arkade-escrow"
)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Arkadian Change-Log Initialization"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

SUCCESS_COUNT=0

for project in "${PROJECTS[@]}"; do
  project_dir="${DOCS_DIR}/projects/${project}"
  changelog_dir="${project_dir}/change-log"

  echo "📦 Processing: ${project}"

  if [ ! -d "$project_dir" ]; then
    echo -e "${YELLOW}⚠️  Project directory not found, skipping${NC}"
    continue
  fi

  # Create change-log directory if it doesn't exist
  mkdir -p "$changelog_dir"

  # Read last_sync_commit from INDEX.md if it exists
  index_file="${project_dir}/INDEX.md"
  commit_hash="unknown"

  if [ -f "$index_file" ]; then
    commit_hash=$(grep "^last_sync_commit:" "$index_file" | awk '{print $2}' || echo "unknown")
  fi

  # Get project name (capitalize first letter)
  project_name=$(echo "$project" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2));}1')

  # Create SYNC_HISTORY.md if it doesn't exist
  sync_history="${changelog_dir}/SYNC_HISTORY.md"

  if [ ! -f "$sync_history" ]; then
    cat > "$sync_history" <<EOF
# Documentation Sync History - ${project_name}

## 2025-10-16 12:00:00 - Initial Metadata Setup
**Commit**: \`${commit_hash:0:7}\`
**Synced By**: Manual setup
**Status**: Baseline established

**Changes**:
- Added sync metadata to INDEX.md
- Created SYNC_HISTORY.md structure
- Established documentation freshness tracking system

**Notes**:
- This is the initial sync point
- Future syncs will track commits since this baseline
- Use \`arkadian-refresh-docs ${project}\` to update after new commits
EOF
    echo "   ✅ Created SYNC_HISTORY.md"
  else
    echo "   ℹ️  SYNC_HISTORY.md already exists"
  fi

  # Create last-sync.txt if it doesn't exist
  last_sync="${changelog_dir}/last-sync.txt"

  if [ ! -f "$last_sync" ]; then
    echo "$commit_hash" > "$last_sync"
    echo "   ✅ Created last-sync.txt"
  else
    echo "   ℹ️  last-sync.txt already exists"
  fi

  SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  echo
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Processed: $SUCCESS_COUNT projects${NC}"
echo
echo "Next steps:"
echo "  1. Review created files: ls -la docs/projects/*/change-log/"
echo "  2. Initialize metadata: ./scripts/arkadian-init-metadata.sh"
echo "  3. Test system: node hooks/arkadian-env-check-hook.js"
echo
