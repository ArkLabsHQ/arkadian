#!/usr/bin/env bash
# Arkadian Quality Test Runner
# Usage: ./tests/run_quality_tests.sh [--level N] [--test ID] [--verbose]
# Requires: bash 4+ (for associative arrays)

# Use homebrew bash on macOS if available
if [[ "$OSTYPE" == "darwin"* ]] && [[ -x /opt/homebrew/bin/bash ]]; then
    if [[ "${BASH_VERSION%%.*}" -lt 4 ]]; then
        exec /opt/homebrew/bin/bash "$0" "$@"
    fi
elif [[ "$OSTYPE" == "darwin"* ]] && [[ -x /usr/local/bin/bash ]]; then
    if [[ "${BASH_VERSION%%.*}" -lt 4 ]]; then
        exec /usr/local/bin/bash "$0" "$@"
    fi
fi

# Check bash version
if [[ "${BASH_VERSION%%.*}" -lt 4 ]]; then
    echo "Error: This script requires bash 4.0 or later"
    echo "Current version: $BASH_VERSION"
    echo ""
    echo "On macOS, install with: brew install bash"
    echo "Then run: /opt/homebrew/bin/bash $0 $@"
    exit 1
fi

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARKADIAN_DIR="$(dirname "$SCRIPT_DIR")"
RESULTS_DIR="$SCRIPT_DIR/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_FILE="$RESULTS_DIR/quality_test_$TIMESTAMP.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
LEVEL=""
TEST_ID=""
VERBOSE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --level) LEVEL="$2"; shift 2 ;;
        --test) TEST_ID="$2"; shift 2 ;;
        --verbose) VERBOSE=true; shift ;;
        --dry-run) DRY_RUN=true; shift ;;
        --help)
            echo "Arkadian Quality Test Runner"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --level N     Run only tests at level N (1-5)"
            echo "  --test ID     Run only test with specific ID (e.g., T1.1)"
            echo "  --verbose     Show detailed output"
            echo "  --dry-run     Show what would be tested without running"
            echo "  --help        Show this help"
            exit 0
            ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

mkdir -p "$RESULTS_DIR"

# Test definitions using indexed arrays (bash 3 compatible approach)
TESTS_IDS=(
    "T1.1" "T1.2" "T1.3" "T1.4" "T1.5" "T1.6" "T1.7"
    "T2.1" "T2.2" "T2.3"
    "T3.1" "T3.2" "T3.3"
    "T4.1" "T4.2" "T4.3" "T4.4"
    "T5.1" "T5.2" "T5.3"
)

# Associative arrays (bash 4+)
declare -A TESTS
declare -A TEST_AGENTS
declare -A TEST_WEIGHTS

# Level 1: Smoke Tests
TESTS["T1.1"]="How does VTXO expiry work in arkd?"
TEST_AGENTS["T1.1"]="ark-guru"
TEST_WEIGHTS["T1.1"]=10

TESTS["T1.2"]="Add a simple health check endpoint to arkd that returns the server version"
TEST_AGENTS["T1.2"]="ark-developer"
TEST_WEIGHTS["T1.2"]=10

TESTS["T1.3"]="What did the team do this week in arkd?"
TEST_AGENTS["T1.3"]="ark-progress-tracker"
TEST_WEIGHTS["T1.3"]=10

TESTS["T1.4"]="Review the latest merged PR in arkd for quality and risks"
TEST_AGENTS["T1.4"]="ark-pr-reviewer"
TEST_WEIGHTS["T1.4"]=10

TESTS["T1.5"]="Run the unit tests for go-sdk and report results"
TEST_AGENTS["T1.5"]="ark-developer"
TEST_WEIGHTS["T1.5"]=10

TESTS["T1.6"]="Create a specification for adding rate limiting to arkd gRPC endpoints"
TEST_AGENTS["T1.6"]="ark-project-manager"
TEST_WEIGHTS["T1.6"]=10

TESTS["T1.7"]="Research how Lightning Network handles channel capacity limitations compared to Ark"
TEST_AGENTS["T1.7"]="ark-researcher"
TEST_WEIGHTS["T1.7"]=10

# Level 2: Cross-Project
TESTS["T2.1"]="Show me all work this week affecting arkd, go-sdk, and wallet"
TEST_AGENTS["T2.1"]="ark-progress-tracker"
TEST_WEIGHTS["T2.1"]=15

TESTS["T2.2"]="Are there any proto changes in arkd this week that would affect go-sdk or wallet?"
TEST_AGENTS["T2.2"]="ark-pr-reviewer"
TEST_WEIGHTS["T2.2"]=15

TESTS["T2.3"]="Track the status of Lightning integration across all Ark projects"
TEST_AGENTS["T2.3"]="ark-progress-tracker"
TEST_WEIGHTS["T2.3"]=15

# Level 3: Workflows
TESTS["T3.1"]="Plan a comprehensive fraud detection alert system for arkd"
TEST_AGENTS["T3.1"]="ark-project-manager"
TEST_WEIGHTS["T3.1"]=20

TESTS["T3.2"]="Users are seeing VTXO not found errors. Help me understand the VTXO lookup mechanism and find recent changes."
TEST_AGENTS["T3.2"]="ark-guru"
TEST_WEIGHTS["T3.2"]=20

TESTS["T3.3"]="Investigate high error rate on arkd - correlate recent deployments and PRs from last 48 hours"
TEST_AGENTS["T3.3"]="ark-progress-tracker"
TEST_WEIGHTS["T3.3"]=20

# Level 4: Edge Cases
TESTS["T4.1"]="How do wallets work?"
TEST_AGENTS["T4.1"]="orchestrator"
TEST_WEIGHTS["T4.1"]=10

TESTS["T4.2"]="Show me the Ethereum bridge implementation in arkd"
TEST_AGENTS["T4.2"]="ark-guru"
TEST_WEIGHTS["T4.2"]=10

TESTS["T4.3"]="OP_CTV in Ark"
TEST_AGENTS["T4.3"]="orchestrator"
TEST_WEIGHTS["T4.3"]=10

TESTS["T4.4"]="What happened this week in kms-unlocker?"
TEST_AGENTS["T4.4"]="ark-progress-tracker"
TEST_WEIGHTS["T4.4"]=10

# Level 5: Role Quality
TESTS["T5.1"]="Generate a weekly progress summary for the executive team"
TEST_AGENTS["T5.1"]="ark-progress-tracker"
TEST_WEIGHTS["T5.1"]=15

TESTS["T5.2"]="Explain the round settlement consensus mechanism in arkd with code references"
TEST_AGENTS["T5.2"]="ark-guru"
TEST_WEIGHTS["T5.2"]=15

TESTS["T5.3"]="What tests should I run before the arkd v0.9.0 release?"
TEST_AGENTS["T5.3"]="ark-developer"
TEST_WEIGHTS["T5.3"]=15

get_level() {
    echo "${1:1:1}"
}

run_test() {
    local test_id=$1
    local prompt="${TESTS[$test_id]}"
    local expected_agent="${TEST_AGENTS[$test_id]}"
    local weight="${TEST_WEIGHTS[$test_id]}"
    local level=$(get_level "$test_id")

    echo -e "${BLUE}[$test_id]${NC} Level $level | Weight: $weight"
    echo -e "  Prompt: ${YELLOW}${prompt:0:60}...${NC}"
    echo -e "  Expected: ${expected_agent}"

    if $DRY_RUN; then
        echo -e "  ${YELLOW}[DRY RUN]${NC}"
        echo ""
        return 0
    fi

    local output_file=$(mktemp)
    local start_time=$(date +%s)

    $VERBOSE && echo -e "  ${BLUE}Executing...${NC}"

    set +e
    timeout 180 claude -p "$prompt" > "$output_file" 2>&1
    local exit_code=$?
    set -e

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local output=$(cat "$output_file")
    local output_length=${#output}

    # Basic scoring
    local score=0
    local notes=""

    # Check for task/agent invocation
    if echo "$output" | grep -qi "Task tool\|subagent\|ark-"; then
        score=$((score + weight / 3))
        notes="Agent invoked. "
    fi

    # Check for substantial output
    if [[ $output_length -gt 500 ]]; then
        score=$((score + weight / 3))
        notes="${notes}Substantial response. "
    fi

    # Check for no errors
    if ! echo "$output" | grep -qi "error:\|failed:\|exception:"; then
        score=$((score + weight / 3))
        notes="${notes}No errors. "
    fi

    # Result
    if [[ $score -ge $((weight * 6 / 10)) ]]; then
        echo -e "  ${GREEN}PASSED${NC} ($score/$weight pts, ${duration}s)"
    else
        echo -e "  ${RED}FAILED${NC} ($score/$weight pts, ${duration}s)"
    fi

    $VERBOSE && echo -e "  Notes: $notes"
    $VERBOSE && echo -e "  Output: ${output:0:150}..."

    # Save result
    cat > "$RESULTS_DIR/${test_id}_$TIMESTAMP.json" <<EOF
{"test_id":"$test_id","score":$score,"weight":$weight,"duration":$duration,"output_length":$output_length}
EOF

    rm -f "$output_file"
    echo ""
    echo "$score"
}

main() {
    echo "=========================================="
    echo "  Arkadian Quality Test Runner"
    echo "=========================================="
    echo "Timestamp: $TIMESTAMP"
    [[ -n "$LEVEL" ]] && echo "Level filter: $LEVEL"
    [[ -n "$TEST_ID" ]] && echo "Test filter: $TEST_ID"
    $DRY_RUN && echo -e "${YELLOW}Mode: DRY RUN${NC}"
    echo ""

    local total_score=0
    local max_score=0
    local tests_run=0

    for test_id in "${TESTS_IDS[@]}"; do
        local test_level=$(get_level "$test_id")

        # Filter
        [[ -n "$LEVEL" && "$test_level" != "$LEVEL" ]] && continue
        [[ -n "$TEST_ID" && "$test_id" != "$TEST_ID" ]] && continue

        max_score=$((max_score + TEST_WEIGHTS[$test_id]))
        tests_run=$((tests_run + 1))

        if $DRY_RUN; then
            run_test "$test_id"
        else
            score=$(run_test "$test_id" | tail -1)
            [[ "$score" =~ ^[0-9]+$ ]] && total_score=$((total_score + score))
        fi
    done

    echo "=========================================="
    echo "  Summary"
    echo "=========================================="
    echo "Tests: $tests_run"

    if ! $DRY_RUN && [[ $max_score -gt 0 ]]; then
        local pct=$((total_score * 100 / max_score))
        echo -e "Score: ${BLUE}$total_score / $max_score${NC} ($pct%)"

        if [[ $pct -ge 90 ]]; then
            echo -e "Rating: ${GREEN}PRODUCTION READY${NC}"
        elif [[ $pct -ge 75 ]]; then
            echo -e "Rating: ${YELLOW}BETA${NC}"
        elif [[ $pct -ge 60 ]]; then
            echo -e "Rating: ${YELLOW}ALPHA${NC}"
        else
            echo -e "Rating: ${RED}NEEDS WORK${NC}"
        fi

        cat > "$RESULTS_FILE" <<EOF
{"timestamp":"$TIMESTAMP","tests":$tests_run,"score":$total_score,"max":$max_score,"pct":$pct}
EOF
        echo "Results: $RESULTS_FILE"
    fi
}

main
