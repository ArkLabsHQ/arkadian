#!/usr/bin/env bash

#
# Install Arkadian skills to ~/.claude/skills
#
# This script copies skill directories from ${ARKADIAN_DIR}/skills
# to ${HOME}/.claude/skills so Claude Code can discover and use them.
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

printf "${YELLOW}Installing Arkadian skills...${NC}\n"

# Get ARKADIAN_DIR from environment or use default
ARKADIAN_DIR="${ARKADIAN_DIR:-$(pwd)}"
SKILLS_SOURCE="${ARKADIAN_DIR}/skills"
SKILLS_DEST="${HOME}/.claude/skills"

# Verify source directory exists
if [ ! -d "$SKILLS_SOURCE" ]; then
    printf "${RED}Error: Skills source directory not found: $SKILLS_SOURCE${NC}\n"
    exit 1
fi

# Create destination directory
mkdir -p "$SKILLS_DEST"
printf "${GREEN}Created $SKILLS_DEST${NC}\n"

# Copy skill directories
printf "${YELLOW}Copying skill directories...${NC}\n"
for skill_dir in "$SKILLS_SOURCE"/*; do
    if [ -d "$skill_dir" ]; then
        skill_name=$(basename "$skill_dir")
        printf "  Copying $skill_name...\n"
        cp -r "$skill_dir" "$SKILLS_DEST/"
    fi
done

# Count installed skills
SKILL_COUNT=$(ls -1d "$SKILLS_DEST"/*/ 2>/dev/null | wc -l | tr -d ' ')

echo ""
printf "${GREEN}========================================${NC}\n"
printf "${GREEN}Installed $SKILL_COUNT skills to ~/.claude/skills${NC}\n"
printf "${GREEN}========================================${NC}\n"
echo ""
printf "${YELLOW}Available skills:${NC}\n"
ls -1d "$SKILLS_DEST"/*/ 2>/dev/null | xargs -n 1 basename | sed 's/^/  - /'
echo ""
printf "${YELLOW}Skills are now available for Claude Code agents to use.${NC}\n"
