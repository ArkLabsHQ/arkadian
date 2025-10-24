#!/bin/bash

#
# Install Arkadian commands to ~/.claude/commands
#
# This script copies command markdown files from ${ARKADIAN_DIR}/commands
# to ${HOME}/.claude/commands so Claude Code can discover and use them.
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Installing Arkadian commands...${NC}"

# Get ARKADIAN_DIR from environment or use default
ARKADIAN_DIR="${ARKADIAN_DIR:-$(pwd)}"
COMMANDS_SOURCE="${ARKADIAN_DIR}/commands"
COMMANDS_DEST="${HOME}/.claude/commands"

# Verify source directory exists
if [ ! -d "$COMMANDS_SOURCE" ]; then
    echo -e "${RED}❌ Error: Commands source directory not found: $COMMANDS_SOURCE${NC}"
    exit 1
fi

# Create destination directory
mkdir -p "$COMMANDS_DEST"
echo -e "${GREEN}✓ Created $COMMANDS_DEST${NC}"

# Copy command files
echo -e "${YELLOW}Copying command files...${NC}"
cp -v "$COMMANDS_SOURCE"/*.md "$COMMANDS_DEST/"

# Count installed commands
COMMAND_COUNT=$(ls -1 "$COMMANDS_DEST"/*.md 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Installed $COMMAND_COUNT commands to ~/.claude/commands${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Available commands:${NC}"
ls -1 "$COMMANDS_DEST"/*.md | xargs -n 1 basename | sed 's/\.md$//' | sed 's/^/  - /'
echo ""
echo -e "${YELLOW}Commands are now available for manual invocation (e.g., /speckit.specify).${NC}"
