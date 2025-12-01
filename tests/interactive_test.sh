#!/bin/bash
# Arkadian Interactive Test Runner
# Runs tests one at a time with manual validation
# Usage: ./tests/interactive_test.sh [--level N]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="$SCRIPT_DIR/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

mkdir -p "$RESULTS_DIR"

# Test definitions with validation criteria
declare -A TESTS
declare -A EXPECTED_AGENTS
declare -A VALIDATIONS
declare -A WEIGHTS

# Level 1 Tests
TESTS["T1.1"]="How does VTXO expiry work in arkd?"
EXPECTED_AGENTS["T1.1"]="ark-guru"
VALIDATIONS["T1.1"]="1. Routed to ark-guru (not ark-developer)
2. Loaded arkd context
3. Explains VTXO lifecycle
4. Mentions timelock/expiry mechanism
5. No code generation (Q&A only)"
WEIGHTS["T1.1"]=10

TESTS["T1.3"]="What did the team do this week in arkd?"
EXPECTED_AGENTS["T1.3"]="ark-progress-tracker"
VALIDATIONS["T1.3"]="1. Routed to ark-progress-tracker
2. Shows commits/PRs from last 7 days
3. Lists authors with contributions
4. Business-friendly summary
5. Impact assessment included"
WEIGHTS["T1.3"]=10

TESTS["T1.4"]="Review the latest merged PR in arkd"
EXPECTED_AGENTS["T1.4"]="ark-pr-reviewer"
VALIDATIONS["T1.4"]="1. Routed to ark-pr-reviewer
2. Used gh CLI to find PR
3. Analyzed code changes
4. Identified risks/impacts
5. Architecture compliance check"
WEIGHTS["T1.4"]=10

TESTS["T2.1"]="Show me all work this week affecting arkd, go-sdk, and wallet"
EXPECTED_AGENTS["T2.1"]="ark-progress-tracker"
VALIDATIONS["T2.1"]="1. Analyzed all 3 repos
2. Cross-project dependencies identified
3. Coordination points highlighted
4. Blocking items called out
5. Business-friendly format"
WEIGHTS["T2.1"]=15

TESTS["T4.2"]="Show me the Ethereum bridge implementation in arkd"
EXPECTED_AGENTS["T4.2"]="ark-guru"
VALIDATIONS["T4.2"]="1. Correctly reports feature doesn't exist
2. No hallucinated code
3. May suggest related features
4. Doesn't make up file paths"
WEIGHTS["T4.2"]=10

TESTS["T5.1"]="Generate a weekly progress summary for the executive team"
EXPECTED_AGENTS["T5.1"]="ark-progress-tracker"
VALIDATIONS["T5.1"]="1. NO technical jargon (gRPC, proto, VTXO)
2. Business metrics (features, timeline)
3. Risk assessment included
4. Actionable insights
5. Executive-appropriate length"
WEIGHTS["T5.1"]=15

# Parse arguments
LEVEL=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --level)
            LEVEL="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# Get level from test ID
get_level() {
    echo "${1:1:1}"
}

# Filter tests
get_tests() {
    local result=()
    for id in "${!TESTS[@]}"; do
        if [[ -z "$LEVEL" ]] || [[ "$(get_level $id)" == "$LEVEL" ]]; then
            result+=("$id")
        fi
    done
    IFS=$'\n' sorted=($(sort <<<"${result[*]}")); unset IFS
    echo "${sorted[@]}"
}

# Run interactive test
run_interactive_test() {
    local test_id=$1
    local prompt="${TESTS[$test_id]}"
    local expected="${EXPECTED_AGENTS[$test_id]}"
    local validation="${VALIDATIONS[$test_id]}"
    local weight="${WEIGHTS[$test_id]}"

    clear
    echo "=========================================="
    echo -e "  ${CYAN}Test: $test_id${NC}"
    echo "=========================================="
    echo ""
    echo -e "${BLUE}Prompt:${NC}"
    echo "$prompt"
    echo ""
    echo -e "${BLUE}Expected Agent:${NC} $expected"
    echo ""
    echo -e "${BLUE}Validation Criteria:${NC}"
    echo "$validation"
    echo ""
    echo -e "${YELLOW}Weight: $weight points${NC}"
    echo ""
    echo "=========================================="
    echo ""
    echo "This test will open a new Claude Code session."
    echo "Copy the prompt above and paste it into Claude Code."
    echo ""
    read -p "Press ENTER to open Claude Code (or 'skip' to skip): " action

    if [[ "$action" == "skip" ]]; then
        echo "Skipped"
        return 2
    fi

    # Open Claude Code in a new terminal (macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        osascript -e "tell application \"Terminal\" to do script \"cd $ARKADIAN_DIR && claude\""
    else
        # Linux - try to open new terminal
        if command -v gnome-terminal &> /dev/null; then
            gnome-terminal -- bash -c "cd $ARKADIAN_DIR && claude; exec bash"
        elif command -v xterm &> /dev/null; then
            xterm -e "cd $ARKADIAN_DIR && claude" &
        else
            echo "Please manually run: cd $ARKADIAN_DIR && claude"
        fi
    fi

    echo ""
    echo "=========================================="
    echo "After testing, rate the result:"
    echo "=========================================="
    echo ""

    # Collect scores for each criterion
    local total_score=0
    local max_criteria=5

    echo "Rate each criterion (0-2 points each):"
    echo "  0 = Failed"
    echo "  1 = Partial"
    echo "  2 = Passed"
    echo ""

    IFS=$'\n'
    local criteria_num=1
    for line in $validation; do
        if [[ -n "$line" ]]; then
            read -p "$line [0-2]: " score
            if [[ "$score" =~ ^[0-2]$ ]]; then
                total_score=$((total_score + score))
            fi
            criteria_num=$((criteria_num + 1))
        fi
    done
    unset IFS

    # Calculate final score
    local max_raw=$((max_criteria * 2))
    local final_score=$((total_score * weight / max_raw))

    echo ""
    echo -e "Raw score: $total_score / $max_raw"
    echo -e "Final score: ${BLUE}$final_score / $weight${NC}"

    # Save result
    local result_file="$RESULTS_DIR/${test_id}_interactive_$TIMESTAMP.json"
    cat > "$result_file" <<EOF
{
  "test_id": "$test_id",
  "prompt": "$prompt",
  "expected_agent": "$expected",
  "weight": $weight,
  "raw_score": $total_score,
  "max_raw": $max_raw,
  "final_score": $final_score,
  "timestamp": "$TIMESTAMP"
}
EOF

    echo ""
    read -p "Press ENTER to continue to next test..."

    return 0
}

# Main
main() {
    echo "=========================================="
    echo "  Arkadian Interactive Test Runner"
    echo "=========================================="
    echo ""
    echo "This tool guides you through manual quality testing."
    echo "Each test opens Claude Code for you to run the prompt."
    echo ""

    local tests=($(get_tests))
    local total=${#tests[@]}
    local current=0
    local total_score=0
    local max_score=0

    echo "Tests to run: $total"
    if [[ -n "$LEVEL" ]]; then
        echo "Level filter: $LEVEL"
    fi
    echo ""
    read -p "Press ENTER to begin..."

    for test_id in "${tests[@]}"; do
        current=$((current + 1))
        max_score=$((max_score + WEIGHTS[$test_id]))

        echo ""
        echo "[$current/$total] Running $test_id..."

        if run_interactive_test "$test_id"; then
            # Get score from result file
            local result_file="$RESULTS_DIR/${test_id}_interactive_$TIMESTAMP.json"
            if [[ -f "$result_file" ]]; then
                local score=$(grep -o '"final_score": [0-9]*' "$result_file" | grep -o '[0-9]*')
                total_score=$((total_score + score))
            fi
        fi
    done

    # Final summary
    clear
    echo "=========================================="
    echo "  Test Summary"
    echo "=========================================="
    echo ""
    echo "Tests completed: $current"
    echo -e "Total score: ${BLUE}$total_score / $max_score${NC}"

    local percentage=$((total_score * 100 / max_score))
    echo ""
    if [[ $percentage -ge 90 ]]; then
        echo -e "Quality: ${GREEN}PRODUCTION READY${NC} ($percentage%)"
    elif [[ $percentage -ge 75 ]]; then
        echo -e "Quality: ${YELLOW}BETA${NC} ($percentage%)"
    elif [[ $percentage -ge 60 ]]; then
        echo -e "Quality: ${YELLOW}ALPHA${NC} ($percentage%)"
    else
        echo -e "Quality: ${RED}NEEDS WORK${NC} ($percentage%)"
    fi

    echo ""
    echo "Results saved to: $RESULTS_DIR"

    # Create summary
    cat > "$RESULTS_DIR/summary_interactive_$TIMESTAMP.json" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "total_tests": $current,
  "total_score": $total_score,
  "max_score": $max_score,
  "percentage": $percentage
}
EOF
}

ARKADIAN_DIR="$(dirname "$SCRIPT_DIR")"
main
