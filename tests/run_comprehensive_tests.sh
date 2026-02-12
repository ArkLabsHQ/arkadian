#!/usr/bin/env bash
# Arkadian Comprehensive Test Runner
# Runs 78 tests across 7 categories
#
# Usage:
#   ./run_comprehensive_tests.sh                  # Run all tests
#   ./run_comprehensive_tests.sh --quick          # Run 8 quick tests
#   ./run_comprehensive_tests.sh --smoke          # Run 3 smoke tests
#   ./run_comprehensive_tests.sh --level L1       # Run Level 1 only
#   ./run_comprehensive_tests.sh --test L1.01     # Run specific test
#   ./run_comprehensive_tests.sh --dry-run        # Show tests without running

set -e

# Use bash 4+ on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    for bash_path in /opt/homebrew/bin/bash /usr/local/bin/bash; do
        if [[ -x "$bash_path" && "${BASH_VERSION%%.*}" -lt 4 ]]; then
            exec "$bash_path" "$0" "$@"
        fi
    done
fi

if [[ "${BASH_VERSION%%.*}" -lt 4 ]]; then
    echo "Error: Requires bash 4+. Install with: brew install bash"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARKADIAN_DIR="$(dirname "$SCRIPT_DIR")"
RESULTS_DIR="$SCRIPT_DIR/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Parse arguments
LEVEL_FILTER=""
TEST_FILTER=""
DRY_RUN=false
QUICK_MODE=false
SMOKE_MODE=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --level) LEVEL_FILTER="$2"; shift 2 ;;
        --test) TEST_FILTER="$2"; shift 2 ;;
        --dry-run) DRY_RUN=true; shift ;;
        --quick) QUICK_MODE=true; shift ;;
        --smoke) SMOKE_MODE=true; shift ;;
        --verbose) VERBOSE=true; shift ;;
        --help)
            cat <<EOF
Arkadian Comprehensive Test Runner

Usage: $0 [options]

Options:
  --level LEVEL   Run only tests at level (L1-L7)
  --test ID       Run only specific test (e.g., L1.01)
  --quick         Run 8 quick tests (~10 min)
  --smoke         Run 3 smoke tests (~3 min)
  --dry-run       Show tests without running
  --verbose       Show detailed output
  --help          Show this help

Test Levels:
  L1: Agent Routing (14 tests)
  L2: Project Paths (12 tests)
  L3: Agent Contracts (12 tests)
  L4: Cross-Project (10 tests)
  L5: Workflow Compliance (10 tests)
  L6: Edge Cases (10 tests)
  L7: Role Quality (10 tests)

Examples:
  $0                      # All 78 tests
  $0 --smoke              # 3 tests, quick validation
  $0 --quick              # 8 tests, moderate validation
  $0 --level L1           # Agent routing tests only
  $0 --test L3.07         # Single test
EOF
            exit 0
            ;;
        *) echo "Unknown: $1"; exit 1 ;;
    esac
done

mkdir -p "$RESULTS_DIR"

# Quick test IDs
QUICK_TESTS=("L1.01" "L1.05" "L2.01" "L3.01" "L4.01" "L5.01" "L6.02" "L7.02")
SMOKE_TESTS=("L1.01" "L1.05" "L6.02")

# Test definitions
declare -A TESTS
declare -A WEIGHTS
declare -A CATEGORIES

# Level 1: Agent Routing
TESTS["L1.01"]="How does VTXO expiry work in arkd?"
TESTS["L1.02"]="Explain the hexagonal architecture in arkd"
TESTS["L1.03"]="Add a GetServerInfo gRPC endpoint to arkd"
TESTS["L1.04"]="Fix the race condition in arkd round finalization"
TESTS["L1.05"]="What did the team do this week in arkd?"
TESTS["L1.06"]="Show progress across arkd, go-sdk, and wallet this week"
TESTS["L1.07"]="Review the latest merged PR in arkd"
TESTS["L1.08"]="Analyze the last 5 commits in go-sdk for breaking changes"
TESTS["L1.09"]="Run unit tests for arkd"
TESTS["L1.10"]="Start local arkd development stack"
TESTS["L1.11"]="Create a specification for fraud detection alerts in arkd"
TESTS["L1.12"]="Break down the notification system feature into tasks"
TESTS["L1.13"]="Compare Ark to Lightning Network for payment scalability"
TESTS["L1.14"]="Research OP_CTV covenant proposal and its implications for Ark"

for id in L1.{01..14}; do WEIGHTS["$id"]=5; CATEGORIES["$id"]="agent_routing"; done

# Level 2: Project Paths
TESTS["L2.01"]="Show me the main.go file in arkd"
TESTS["L2.02"]="Show the client interface in go-sdk"
TESTS["L2.03"]="Show the App.tsx component in wallet"
TESTS["L2.04"]="Show the main handler in ark-faucet"
TESTS["L2.05"]="How does ark-simulator create test clients?"
TESTS["L2.06"]="Show the Prometheus alert rules in ark-telemetry"
TESTS["L2.07"]="Show the Docker Compose configuration in ark-infra"
TESTS["L2.08"]="How does kms-unlocker integrate with AWS?"
TESTS["L2.09"]="Show the swap service in fulmine"
TESTS["L2.10"]="Explain the swap API in boltz-backend"
TESTS["L2.11"]="Show the VTXO documentation from ark-docs"
TESTS["L2.12"]="Explain the escrow contract in arkade-escrow"

for id in L2.{01..12}; do WEIGHTS["$id"]=3; CATEGORIES["$id"]="project_paths"; done

# Level 3: Agent Contracts
TESTS["L3.01"]="What is a VTXO in Ark protocol?"
TESTS["L3.02"]="Add a comment to the main.go file in arkd explaining what it does"
TESTS["L3.03"]="Run go test for the domain package in arkd"
TESTS["L3.04"]="Review arkd PR #832"
TESTS["L3.05"]="Generate weekly progress report for arkd with metrics"
TESTS["L3.06"]="Create a specification for adding rate limiting to arkd"
TESTS["L3.07"]="Implement GetHealth endpoint in arkd and run integration tests"
TESTS["L3.08"]="Run tests for nonexistent package xyz in arkd"
TESTS["L3.09"]="Add logging to arkd service.go and verify it works"
TESTS["L3.10"]="Create a patch file for arkd changes"
TESTS["L3.11"]="Research state channels vs Ark protocol"
TESTS["L3.12"]="Try to add a feature but make tests fail"

for id in L3.{01..12}; do WEIGHTS["$id"]=8; CATEGORIES["$id"]="agent_contracts"; done

# Level 4: Cross-Project
TESTS["L4.01"]="Show how go-sdk uses arkd APIs"
TESTS["L4.02"]="If I change arkd proto files, what other projects are affected?"
TESTS["L4.03"]="How does wallet use fulmine for Lightning swaps?"
TESTS["L4.04"]="How does ark-telemetry monitor arkd metrics?"
TESTS["L4.05"]="What services does ark-infra deploy for a full stack?"
TESTS["L4.06"]="Summarize all activity this week across all Ark projects"
TESTS["L4.07"]="What happens if I change the VTXO struct in arkd?"
TESTS["L4.08"]="Which projects have the lowest test coverage?"
TESTS["L4.09"]="Is ark-docs in sync with arkd's current API?"
TESTS["L4.10"]="Track Lightning integration progress across all projects"

for id in L4.{01..10}; do WEIGHTS["$id"]=10; CATEGORIES["$id"]="cross_project"; done

# Level 5: Workflow Compliance
TESTS["L5.01"]="What is round settlement in Ark?"
TESTS["L5.02"]="Fix the typo in arkd README.md"
TESTS["L5.03"]="Add a GetVersion endpoint to arkd"
TESTS["L5.04"]="Plan and implement a notification system for arkd"
TESTS["L5.05"]="Do a comprehensive review of arkd PR #845"
TESTS["L5.06"]="Create a specification for multi-database support"
TESTS["L5.07"]="Run a very long operation that might timeout"
TESTS["L5.08"]="Implement feature but have tests fail, then recover"
TESTS["L5.09"]="Implement GetStatus endpoint and validate with integration tests"
TESTS["L5.10"]="Add endpoint with criteria: tests pass, coverage 80%+"

for id in L5.{01..10}; do WEIGHTS["$id"]=12; CATEGORIES["$id"]="workflow"; done

# Level 6: Edge Cases
TESTS["L6.01"]="How do wallets work?"
TESTS["L6.02"]="Show me the Ethereum bridge in arkd"
TESTS["L6.03"]="What happened this week in kms-unlocker?"
TESTS["L6.04"]="Review arkd PR #999999"
TESTS["L6.05"]="Tell me about Bitcoin"
TESTS["L6.06"]="Explain VTXOs and then add a new VTXO type"
TESTS["L6.07"]="Run Docker tests in ark-docs"
TESTS["L6.08"]="Make arkd work without Bitcoin"
TESTS["L6.09"]="Show progress in a brand new empty repository"
TESTS["L6.10"]="Add a feature but don't write any code"

for id in L6.{01..10}; do WEIGHTS["$id"]=6; CATEGORIES["$id"]="edge_cases"; done

# Level 7: Role Quality
TESTS["L7.01"]="Explain arkd's round consensus with code references"
TESTS["L7.02"]="Weekly progress summary for the board"
TESTS["L7.03"]="What tests should I run before arkd release?"
TESTS["L7.04"]="Plan the fraud detection feature"
TESTS["L7.05"]="How do I deploy arkd to staging?"
TESTS["L7.06"]="Review arkd architecture compliance"
TESTS["L7.07"]="Compare Ark cryptographic assumptions to Lightning"
TESTS["L7.08"]="Cross-team dependencies for next sprint"
TESTS["L7.09"]="Document the GetVtxo API endpoint"
TESTS["L7.10"]="Explain how to add a new gRPC endpoint to arkd step by step"

for id in L7.{01..10}; do WEIGHTS["$id"]=10; CATEGORIES["$id"]="role_quality"; done

# Get tests to run
get_tests_to_run() {
    local result=()

    if $SMOKE_MODE; then
        result=("${SMOKE_TESTS[@]}")
    elif $QUICK_MODE; then
        result=("${QUICK_TESTS[@]}")
    else
        for id in "${!TESTS[@]}"; do
            # Level filter
            if [[ -n "$LEVEL_FILTER" ]]; then
                local test_level="${id%%.*}"
                [[ "$test_level" != "$LEVEL_FILTER" ]] && continue
            fi

            # Test filter
            [[ -n "$TEST_FILTER" && "$id" != "$TEST_FILTER" ]] && continue

            result+=("$id")
        done
    fi

    # Sort
    IFS=$'\n' sorted=($(sort <<<"${result[*]}")); unset IFS
    echo "${sorted[@]}"
}

# Run single test
run_test() {
    local id=$1
    local prompt="${TESTS[$id]}"
    local weight="${WEIGHTS[$id]}"
    local category="${CATEGORIES[$id]}"
    local level="${id%%.*}"

    echo -e "${CYAN}[$id]${NC} $category | Weight: $weight"
    echo -e "  ${YELLOW}${prompt:0:70}${NC}"

    if $DRY_RUN; then
        echo -e "  ${YELLOW}[DRY RUN]${NC}"
        echo ""
        return 0
    fi

    local output_file=$(mktemp)
    local start=$(date +%s)

    # Run test
    timeout 180 claude -p "$prompt" > "$output_file" 2>&1 || true

    local end=$(date +%s)
    local duration=$((end - start))
    local output=$(cat "$output_file")
    local len=${#output}

    # Score (basic heuristics)
    local score=0

    # Check for agent invocation
    if echo "$output" | grep -qi "Task tool\|subagent\|ark-guru\|ark-developer\|ark-progress\|ark-pr-reviewer\|ark-project-manager\|ark-researcher"; then
        score=$((score + weight / 3))
    fi

    # Check for substantial output
    if [[ $len -gt 500 ]]; then
        score=$((score + weight / 3))
    fi

    # Check for no critical errors
    if ! echo "$output" | grep -qi "error:\s*\|exception:\s*\|crash"; then
        score=$((score + weight / 3))
    fi

    # Additional checks per category
    case $category in
        agent_contracts)
            if echo "$output" | grep -qi "<status>\|<summary>\|<answer>\|<changes>\|<tests>"; then
                score=$((score + 1))
            fi
            ;;
        cross_project)
            if echo "$output" | grep -qi "arkd\|go-sdk\|wallet" | head -1 && \
               echo "$output" | grep -qi "multiple\|cross\|depend"; then
                score=$((score + 1))
            fi
            ;;
    esac

    # Cap at weight
    [[ $score -gt $weight ]] && score=$weight

    # Result
    local pct=$((score * 100 / weight))
    if [[ $pct -ge 60 ]]; then
        echo -e "  ${GREEN}PASSED${NC} ($score/$weight, ${duration}s)"
    else
        echo -e "  ${RED}FAILED${NC} ($score/$weight, ${duration}s)"
    fi

    $VERBOSE && echo -e "  Output: ${output:0:150}..."

    # Save result
    cat > "$RESULTS_DIR/${id}_$TIMESTAMP.json" <<EOF
{"id":"$id","score":$score,"weight":$weight,"duration":$duration,"len":$len,"category":"$category"}
EOF

    rm -f "$output_file"
    echo ""
    echo "$score"
}

# Main
main() {
    echo "=========================================="
    echo "  Arkadian Comprehensive Test Runner"
    echo "=========================================="
    echo "Timestamp: $TIMESTAMP"

    local mode="Full"
    $SMOKE_MODE && mode="Smoke (3 tests)"
    $QUICK_MODE && mode="Quick (8 tests)"
    [[ -n "$LEVEL_FILTER" ]] && mode="Level $LEVEL_FILTER"
    [[ -n "$TEST_FILTER" ]] && mode="Test $TEST_FILTER"
    $DRY_RUN && mode="$mode [DRY RUN]"

    echo "Mode: $mode"
    echo ""

    local tests_to_run=($(get_tests_to_run))
    local total=${#tests_to_run[@]}

    if [[ $total -eq 0 ]]; then
        echo -e "${RED}No tests match criteria${NC}"
        exit 1
    fi

    echo "Tests: $total"
    echo "------------------------------------------"
    echo ""

    local total_score=0
    local max_score=0
    local passed=0
    local failed=0

    for id in "${tests_to_run[@]}"; do
        max_score=$((max_score + WEIGHTS[$id]))

        if $DRY_RUN; then
            run_test "$id"
        else
            score=$(run_test "$id" | tail -1)
            if [[ "$score" =~ ^[0-9]+$ ]]; then
                total_score=$((total_score + score))
                local pct=$((score * 100 / WEIGHTS[$id]))
                if [[ $pct -ge 60 ]]; then
                    passed=$((passed + 1))
                else
                    failed=$((failed + 1))
                fi
            fi
        fi
    done

    # Summary
    echo "=========================================="
    echo "  Summary"
    echo "=========================================="
    echo "Tests run: $total"

    if ! $DRY_RUN; then
        echo -e "Passed: ${GREEN}$passed${NC}"
        echo -e "Failed: ${RED}$failed${NC}"

        local pct=0
        [[ $max_score -gt 0 ]] && pct=$((total_score * 100 / max_score))

        echo -e "Score: ${BLUE}$total_score / $max_score${NC} ($pct%)"
        echo ""

        if [[ $pct -ge 90 ]]; then
            echo -e "Rating: ${GREEN}🟢 PRODUCTION READY${NC}"
        elif [[ $pct -ge 75 ]]; then
            echo -e "Rating: ${YELLOW}🟡 BETA${NC}"
        elif [[ $pct -ge 60 ]]; then
            echo -e "Rating: ${YELLOW}🟠 ALPHA${NC}"
        else
            echo -e "Rating: ${RED}🔴 NEEDS WORK${NC}"
        fi

        # Save summary
        cat > "$RESULTS_DIR/summary_$TIMESTAMP.json" <<EOF
{"timestamp":"$TIMESTAMP","mode":"$mode","total":$total,"passed":$passed,"failed":$failed,"score":$total_score,"max":$max_score,"pct":$pct}
EOF

        echo ""
        echo "Results: $RESULTS_DIR/summary_$TIMESTAMP.json"
    fi
}

main
