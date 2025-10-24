#!/bin/bash

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

echo -e "${YELLOW}Installing Arkadian skills...${NC}"

# Get ARKADIAN_DIR from environment or use default
ARKADIAN_DIR="${ARKADIAN_DIR:-$(pwd)}"
SKILLS_SOURCE="${ARKADIAN_DIR}/skills"
SKILLS_DEST="${HOME}/.claude/skills"

# Verify source directory exists
if [ ! -d "$SKILLS_SOURCE" ]; then
    echo -e "${RED}❌ Error: Skills source directory not found: $SKILLS_SOURCE${NC}"
    exit 1
fi

# Create destination directory
mkdir -p "$SKILLS_DEST"
echo -e "${GREEN}✓ Created $SKILLS_DEST${NC}"

# Copy skill directories
echo -e "${YELLOW}Copying skill directories...${NC}"
for skill_dir in "$SKILLS_SOURCE"/*; do
    if [ -d "$skill_dir" ]; then
        skill_name=$(basename "$skill_dir")
        echo -e "  Copying $skill_name..."
        cp -r "$skill_dir" "$SKILLS_DEST/"
    fi
done

# Count installed skills
SKILL_COUNT=$(ls -1d "$SKILLS_DEST"/*/ 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Installed $SKILL_COUNT skills to ~/.claude/skills${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Available skills:${NC}"
ls -1d "$SKILLS_DEST"/*/ 2>/dev/null | xargs -n 1 basename | sed 's/^/  - /'
echo ""
echo -e "${YELLOW}Skills are now available for Claude Code agents to use.${NC}"
