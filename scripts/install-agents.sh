#!/usr/bin/env bash

#
# Install Arkadian agents to ~/.claude/agents
#
# This script copies agent markdown files from ${ARKADIAN_DIR}/agents
# to ${HOME}/.claude/agents so Claude Code can discover and use them.
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

printf "${YELLOW}Installing Arkadian agents...${NC}\n"

# Get ARKADIAN_DIR from environment or use default
ARKADIAN_DIR="${ARKADIAN_DIR:-$(pwd)}"
AGENTS_SOURCE="${ARKADIAN_DIR}/agents"
AGENTS_DEST="${HOME}/.claude/agents"

# Verify source directory exists
if [ ! -d "$AGENTS_SOURCE" ]; then
    printf "${RED}Error: Agents source directory not found: $AGENTS_SOURCE${NC}\n"
    exit 1
fi

# Create destination directory
mkdir -p "$AGENTS_DEST"
printf "${GREEN}Created $AGENTS_DEST${NC}\n"

# Copy agent files
printf "${YELLOW}Copying agent files...${NC}\n"
cp -v "$AGENTS_SOURCE"/*.md "$AGENTS_DEST/"

# Count installed agents
AGENT_COUNT=$(ls -1 "$AGENTS_DEST"/*.md 2>/dev/null | wc -l | tr -d ' ')

echo ""
printf "${GREEN}========================================${NC}\n"
printf "${GREEN}Installed $AGENT_COUNT agents to ~/.claude/agents${NC}\n"
printf "${GREEN}========================================${NC}\n"
echo ""
printf "${YELLOW}Available agents:${NC}\n"
ls -1 "$AGENTS_DEST"/*.md | xargs -n 1 basename | sed 's/\.md$//' | sed 's/^/  - /'
echo ""
printf "${YELLOW}Agents are now available for Claude Code to use.${NC}\n"
