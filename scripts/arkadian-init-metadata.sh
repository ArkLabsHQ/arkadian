#!/usr/bin/env bash
# Arkadian Metadata Initialization Script
#
# This script initializes sync metadata for all project INDEX.md files
# by reading the current commit hash from each repository.
#
# Usage: ./scripts/arkadian-init-metadata.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARKADIAN_ROOT="$(dirname "$SCRIPT_DIR")"
DOCS_DIR="${ARKADIAN_ROOT}/docs"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Project list with their repo environment variables
declare -A PROJECTS=(
  ["arkd"]="ARKD_REPO"
  ["go-sdk"]="GO_SDK_REPO"
  ["wallet"]="WALLET_REPO"
  ["ark-faucet"]="ARK_FAUCET_REPO"
  ["ark-simulator"]="ARK_SIMULATOR_REPO"
  ["ark-telemetry"]="ARK_TELEMETRY_REPO"
  ["ark-infra"]="ARK_INFRA_REPO"
  ["kms-unlocker"]="KMS_UNLOCKER_REPO"
  ["fulmine"]="FULMINE_REPO"
  ["ark-docs"]="ARK_DOCS_REPO"
  ["arkade-escrow"]="ARKADE_ESCROW_REPO"
)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Arkadian Metadata Initialization"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

# Check if required environment variables are set
echo "📋 Checking environment variables..."
MISSING_VARS=()
for project in "${!PROJECTS[@]}"; do
  repo_var="${PROJECTS[$project]}"
  if [ -z "${!repo_var}" ]; then
    MISSING_VARS+=("$repo_var")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo -e "${RED}❌ Missing environment variables:${NC}"
  for var in "${MISSING_VARS[@]}"; do
    echo "   - $var"
  done
  echo
  echo "Please set up your environment variables first:"
  echo "   source ~/.arkadian-env.sh"
  exit 1
fi

echo -e "${GREEN}✅ All environment variables set${NC}"
echo

# Initialize metadata for each project
SUCCESS_COUNT=0
FAIL_COUNT=0

for project in "${!PROJECTS[@]}"; do
  repo_var="${PROJECTS[$project]}"
  repo_path="${!repo_var}"
  index_file="${DOCS_DIR}/projects/${project}/INDEX.md"

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 Processing: ${project}"
  echo "   Repository: ${repo_path}"

  # Check if repository exists
  if [ ! -d "$repo_path" ]; then
    echo -e "${YELLOW}⚠️  Repository not found, skipping${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    continue
  fi

  # Check if it's a git repository
  if [ ! -d "$repo_path/.git" ]; then
    echo -e "${YELLOW}⚠️  Not a git repository, skipping${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    continue
  fi

  # Get current commit hash
  current_commit=$(git -C "$repo_path" rev-parse HEAD 2>/dev/null || echo "unknown")

  if [ "$current_commit" = "unknown" ]; then
    echo -e "${RED}❌ Failed to get commit hash${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    continue
  fi

  echo "   Current commit: ${current_commit:0:7}"

  # Check if INDEX.md exists
  if [ ! -f "$index_file" ]; then
    echo -e "${RED}❌ INDEX.md not found at ${index_file}${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    continue
  fi

  # Get current timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Check if metadata already exists
  if grep -q "last_sync_commit:" "$index_file"; then
    echo "   ℹ️  Metadata already exists, updating..."

    # Update existing metadata (using sed for in-place editing)
    sed -i.bak \
      -e "s/^last_sync_commit:.*/last_sync_commit: $current_commit/" \
      -e "s/^last_sync_date:.*/last_sync_date: $timestamp/" \
      -e "s/^commits_behind_upstream:.*/commits_behind_upstream: 0/" \
      -e "s/^uncommitted_changes:.*/uncommitted_changes: false/" \
      "$index_file"

    rm "${index_file}.bak"
    echo -e "${GREEN}✅ Metadata updated${NC}"
  else
    echo "   ℹ️  No metadata found, adding..."

    # Read the existing frontmatter and add metadata after project_id
    awk -v commit="$current_commit" -v ts="$timestamp" '
    BEGIN { in_frontmatter=0; metadata_added=0; }
    /^---$/ {
      if (in_frontmatter == 0) {
        in_frontmatter = 1;
        print;
        next;
      } else {
        in_frontmatter = 0;
        print;
        next;
      }
    }
    in_frontmatter == 1 && /^project_id:/ {
      print;
      if (metadata_added == 0) {
        print "version: 1.0.0";
        print "last_sync_commit: " commit;
        print "last_sync_date: " ts;
        print "repository_path: ${" toupper(gensub(/-/, "_", "g", ENVIRON["PROJECT"])) "_REPO}";
        print "documentation_path: ${ARKADIAN_DOCS}/projects/" ENVIRON["PROJECT"];
        print "commits_behind_upstream: 0";
        print "uncommitted_changes: false";
        metadata_added = 1;
      }
      next;
    }
    { print; }
    ' PROJECT="$project" "$index_file" > "$index_file.tmp" && mv "$index_file.tmp" "$index_file"

    echo -e "${GREEN}✅ Metadata added${NC}"
  fi

  SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
done

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Success: $SUCCESS_COUNT projects${NC}"
if [ $FAIL_COUNT -gt 0 ]; then
  echo -e "${RED}❌ Failed: $FAIL_COUNT projects${NC}"
fi
echo
echo "Next steps:"
echo "  1. Review changes: git diff docs/projects/*/INDEX.md"
echo "  2. Create change-log files: ./scripts/arkadian-init-changelogs.sh"
echo "  3. Test freshness check: node hooks/arkadian-env-check-hook.js"
echo
