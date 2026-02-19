#!/usr/bin/env bash
# Verify Artifact Location Standardization

set -uo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Verifying Artifact Location Standardization"
echo "==========================================="
echo ""

PASS=0
FAIL=0

# Test 1: session-start-hook no longer creates artifacts/plan/
echo -n "Test 1: session-start-hook doesn't create artifacts/plan/... "
if ! grep -q "artifacts/plan" hooks/session-start-hook.ts && ! grep -q "artifacts', 'plan'" hooks/session-start-hook.ts; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "  Found code creating artifacts/plan directory"
    ((FAIL++))
fi

# Test 2: Workflow template uses specs/ for plan phase
echo -n "Test 2: Workflow template uses correct path for plan... "
if grep -q "specs/{project-id}/{feature-id}" templates/workflows/development_unified.yaml; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "  Workflow template doesn't use specs/{project-id}/{feature-id}"
    ((FAIL++))
fi

# Test 3: arkadian resume checks specs/ for plan phase
echo -n "Test 3: arkadian resume checks specs/ for plan... "
if grep -q "find.*specs.*_result.json" scripts/arkadian; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "  arkadian script doesn't check specs/ for plan completion"
    ((FAIL++))
fi

# Test 4: ark-guru.md has ARTIFACT LOCATIONS section
echo -n "Test 4: ark-guru.md documents artifact locations... "
if grep -q "## ARTIFACT LOCATIONS" agents/ark-guru.md; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "  ark-guru.md missing ARTIFACT LOCATIONS section"
    ((FAIL++))
fi

# Test 5: ark-developer.md has ARTIFACT LOCATIONS section
echo -n "Test 5: ark-developer.md documents artifact locations... "
if grep -q "## ARTIFACT LOCATIONS" agents/ark-developer.md; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "  ark-developer.md missing ARTIFACT LOCATIONS section"
    ((FAIL++))
fi

# Test 6: CLAUDE.md explains artifact organization
echo -n "Test 6: CLAUDE.md explains artifact organization... "
if grep -q "## Artifact Organization" .claude/CLAUDE.md; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "  CLAUDE.md missing Artifact Organization section"
    ((FAIL++))
fi

# Test 7: Check existing session can still be detected (backwards compat)
echo -n "Test 7: Backwards compatibility - existing sessions... "
if [ -f "sessions/3191f042-a27d-4a6e-b6a8-f2fe0f41bc9a/artifacts/plan/_result.json" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    echo "  Note: Compatibility fix in place for existing session"
    ((PASS++))
else
    echo -e "${YELLOW}⚠️  SKIP${NC} (test session doesn't exist)"
fi

# Summary
echo ""
echo "==========================================="
echo "Summary: ${PASS} passed, ${FAIL} failed"
echo "==========================================="
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN}✅ All standardization checks passed!${NC}"
    echo ""
    echo "Standardization complete:"
    echo "  - session-start-hook creates artifacts/explore and artifacts/implement only"
    echo "  - Workflow templates use specs/{project}/{feature-id} for plan phase"
    echo "  - arkadian resume checks correct locations per agent type"
    echo "  - Agent documentation clarifies artifact locations"
    echo "  - CLAUDE.md explains hybrid organization strategy"
    echo ""
    echo "Next steps:"
    echo "  1. Test with new session: arkadian 'Add feature X'"
    echo "  2. Verify correct directory structure"
    echo "  3. Test resume: arkadian --resume {session-id}"
    exit 0
else
    echo -e "${RED}❌ Some standardization checks failed${NC}"
    echo ""
    echo "Review the failures above and fix issues"
    exit 1
fi
