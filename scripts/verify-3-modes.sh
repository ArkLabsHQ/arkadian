#!/usr/bin/env bash
# Verify 3-Mode Architecture Installation

set -uo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Verifying 3-Mode Architecture"
echo "=============================="
echo ""

PASS=0
FAIL=0

# Test 1: Check vanilla settings.json exists
echo -n "Test 1: Vanilla settings.json exists... "
if [ -f "$HOME/.claude/settings.json" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "  Missing: ~/.claude/settings.json"
    ((FAIL++))
fi

# Test 2: Check arkadian settings.json exists
echo -n "Test 2: Arkadian settings.json exists... "
if [ -f "$HOME/.claude/settings-arkadian.json" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "  Missing: ~/.claude/settings-arkadian.json"
    echo "  Run: ./scripts/generate-claude-settings.sh"
    ((FAIL++))
fi

# Test 3: Vanilla settings should NOT have ARKADIAN_DIR
echo -n "Test 3: Vanilla settings has no ARKADIAN_DIR... "
if [ -f "$HOME/.claude/settings.json" ]; then
    if ! grep -q "ARKADIAN_DIR" "$HOME/.claude/settings.json" 2>/dev/null; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠️  WARNING${NC}"
        echo "  Vanilla settings.json contains ARKADIAN_DIR"
        echo "  This means vanilla Claude will have arkadian context"
        echo "  To fix: cp .claude-settings-vanilla.template.json ~/.claude/settings.json"
        ((FAIL++))
    fi
else
    echo -e "${YELLOW}⚠️  SKIP${NC} (file missing)"
fi

# Test 4: Vanilla settings should NOT have orchestrator-guardrail hook
echo -n "Test 4: Vanilla settings has no arkadian hooks... "
if [ -f "$HOME/.claude/settings.json" ]; then
    if ! grep -q "orchestrator-guardrail" "$HOME/.claude/settings.json" 2>/dev/null; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠️  WARNING${NC}"
        echo "  Vanilla settings.json contains arkadian hooks"
        echo "  To fix: cp .claude-settings-vanilla.template.json ~/.claude/settings.json"
        ((FAIL++))
    fi
else
    echo -e "${YELLOW}⚠️  SKIP${NC} (file missing)"
fi

# Test 5: Arkadian settings SHOULD have ARKADIAN_DIR
echo -n "Test 5: Arkadian settings has ARKADIAN_DIR... "
if [ -f "$HOME/.claude/settings-arkadian.json" ]; then
    if grep -q "ARKADIAN_DIR" "$HOME/.claude/settings-arkadian.json" 2>/dev/null; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASS++))
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "  Arkadian settings missing ARKADIAN_DIR"
        echo "  Run: ./scripts/generate-claude-settings.sh"
        ((FAIL++))
    fi
else
    echo -e "${YELLOW}⚠️  SKIP${NC} (file missing)"
fi

# Test 6: Arkadian settings SHOULD have orchestrator-guardrail hook
echo -n "Test 6: Arkadian settings has hooks... "
if [ -f "$HOME/.claude/settings-arkadian.json" ]; then
    if grep -q "orchestrator-guardrail" "$HOME/.claude/settings-arkadian.json" 2>/dev/null; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASS++))
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "  Arkadian settings missing hooks"
        echo "  Run: ./scripts/generate-claude-settings.sh"
        ((FAIL++))
    fi
else
    echo -e "${YELLOW}⚠️  SKIP${NC} (file missing)"
fi

# Test 7: Check arkadian command exists
echo -n "Test 7: arkadian command installed... "
if [ -x "$HOME/bin/arkadian" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "  Missing: ~/bin/arkadian"
    echo "  Run: make install-arkadian-cmd"
    ((FAIL++))
fi

# Test 8: Check arkadian script uses --settings flag
echo -n "Test 8: arkadian script uses --settings flag... "
if [ -f "$HOME/bin/arkadian" ]; then
    if grep -q "settings-arkadian.json" "$HOME/bin/arkadian" && grep -q "\-\-settings" "$HOME/bin/arkadian"; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASS++))
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "  arkadian script missing --settings flag or settings-arkadian.json"
        echo "  Run: make install-arkadian-cmd"
        ((FAIL++))
    fi
else
    echo -e "${YELLOW}⚠️  SKIP${NC} (file missing)"
fi

# Test 9: Check CLAUDE.md exists for dev mode
echo -n "Test 9: .claude/CLAUDE.md exists for dev mode... "
ARKADIAN_DIR="${ARKADIAN_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
if [ -f "$ARKADIAN_DIR/.claude/CLAUDE.md" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "  Missing: .claude/CLAUDE.md"
    ((FAIL++))
fi

# Test 10: Check agents installed
echo -n "Test 10: Agents installed... "
if [ -d "$HOME/.claude/agents" ] && [ "$(ls -1 "$HOME/.claude/agents"/*.md 2>/dev/null | wc -l | tr -d ' ')" -gt 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "  Run: make install-agents"
    ((FAIL++))
fi

# Test 11: Check skills installed
echo -n "Test 11: Skills installed... "
if [ -d "$HOME/.claude/skills" ] && [ "$(ls -1d "$HOME/.claude/skills"/*/ 2>/dev/null | wc -l | tr -d ' ')" -gt 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "  Run: make install-skills"
    ((FAIL++))
fi

# Summary
echo ""
echo "=============================="
echo "Summary: ${PASS} passed, ${FAIL} failed"
echo "=============================="
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "Three modes configured:"
    echo "  1. claude          → Vanilla Claude"
    echo "  2. claude (in arkadian dir) → Dev mode"
    echo "  3. arkadian        → Orchestrator mode"
    echo ""
    echo "Next steps:"
    echo "  - Test vanilla Claude: claude 'hello'"
    echo "  - Test arkadian mode: arkadian status"
    echo "  - Test dev mode: cd $ARKADIAN_DIR && claude"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "To fix issues, try:"
    echo "  make install"
    exit 1
fi
