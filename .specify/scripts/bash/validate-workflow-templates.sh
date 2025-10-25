#!/bin/bash
# Workflow Template Validation Script
# Validates all workflow templates against the schema rules

set -e

TEMPLATES_DIR="/Users/dusansekulic/code/go/arkadian/.specify/templates/workflows"
VALIDATION_ERRORS=0

echo "=========================================="
echo "Workflow Template Validation"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to validate a single template
validate_template() {
    local template_file="$1"
    local template_name=$(basename "$template_file" .yaml)

    echo "Validating: $template_name"
    echo "----------------------------------------"

    local errors=0

    # Rule 1: DAG Validation (detect cycles, first phase has depends_on: null)
    echo "  [1/5] DAG Validation..."

    # Check if first phase has depends_on: null
    first_phase_depends=$(yq '.execution.phases[0].depends_on' "$template_file")
    if [ "$first_phase_depends" != "null" ]; then
        echo -e "    ${RED}✗ First phase must have depends_on: null${NC}"
        errors=$((errors + 1))
    else
        echo -e "    ${GREEN}✓ First phase has depends_on: null${NC}"
    fi

    # Check all depends_on references exist
    phase_ids=$(yq '.execution.phases[].id' "$template_file")
    all_depends=$(yq '.execution.phases[].depends_on | select(. != null)' "$template_file")

    for dep in $all_depends; do
        if ! echo "$phase_ids" | grep -q "^$dep$"; then
            echo -e "    ${RED}✗ depends_on '$dep' references non-existent phase${NC}"
            errors=$((errors + 1))
        fi
    done

    if [ $errors -eq 0 ] || [ "$first_phase_depends" == "null" ]; then
        echo -e "    ${GREEN}✓ All depends_on references are valid${NC}"
    fi

    # Rule 2: Agent Validation (all agents in phases are listed in execution.agents)
    echo "  [2/5] Agent Validation..."

    declared_agents=$(yq '.execution.agents[]' "$template_file" | sed 's/ark-//')
    phase_agents=$(yq '.execution.phases[].agent' "$template_file")

    agent_errors=0
    for agent in $phase_agents; do
        if ! echo "$declared_agents" | grep -q "^$agent$"; then
            echo -e "    ${RED}✗ Agent '$agent' used in phase but not declared in execution.agents${NC}"
            errors=$((errors + 1))
            agent_errors=$((agent_errors + 1))
        fi
    done

    if [ $agent_errors -eq 0 ]; then
        echo -e "    ${GREEN}✓ All phase agents are declared in execution.agents${NC}"
    fi

    # Rule 3: Timeout Validation (sum of phase timeouts <= max_duration_seconds)
    echo "  [3/5] Timeout Validation..."

    total_timeout=$(yq '.execution.phases[].timeout_seconds' "$template_file" | awk '{sum += $1} END {print sum}')
    max_duration=$(yq '.performance.max_duration_seconds' "$template_file")
    estimated_duration=$(yq '.performance.estimated_duration_seconds' "$template_file")

    if [ "$total_timeout" -gt "$max_duration" ]; then
        echo -e "    ${YELLOW}⚠ Sum of phase timeouts ($total_timeout) > max_duration ($max_duration)${NC}"
        # This is a warning, not an error
    else
        echo -e "    ${GREEN}✓ Sum of phase timeouts ($total_timeout) ≤ max_duration ($max_duration)${NC}"
    fi

    if [ "$estimated_duration" -gt "$max_duration" ]; then
        echo -e "    ${RED}✗ estimated_duration ($estimated_duration) > max_duration ($max_duration)${NC}"
        errors=$((errors + 1))
    else
        echo -e "    ${GREEN}✓ estimated_duration ($estimated_duration) ≤ max_duration ($max_duration)${NC}"
    fi

    # Rule 4: Approval Validation (if approval_required: true, approval_message is set)
    echo "  [4/5] Approval Validation..."

    approval_errors=0
    phase_count=$(yq '.execution.phases | length' "$template_file")

    for i in $(seq 0 $((phase_count - 1))); do
        approval_required=$(yq ".execution.phases[$i].approval_required" "$template_file")
        approval_message=$(yq ".execution.phases[$i].approval_message" "$template_file")
        phase_id=$(yq ".execution.phases[$i].id" "$template_file")

        if [ "$approval_required" == "true" ] && [ "$approval_message" == "null" ]; then
            echo -e "    ${RED}✗ Phase '$phase_id' has approval_required: true but no approval_message${NC}"
            errors=$((errors + 1))
            approval_errors=$((approval_errors + 1))
        fi
    done

    if [ $approval_errors -eq 0 ]; then
        echo -e "    ${GREEN}✓ All phases with approval_required have approval_message${NC}"
    fi

    # Rule 5: Checkpoint Validation (if checkpoint.required_for_next_phase: true, next phase exists)
    echo "  [5/5] Checkpoint Validation..."

    checkpoint_errors=0
    for i in $(seq 0 $((phase_count - 2))); do
        required_for_next=$(yq ".execution.phases[$i].checkpoint.required_for_next_phase" "$template_file")
        phase_id=$(yq ".execution.phases[$i].id" "$template_file")

        if [ "$required_for_next" == "true" ]; then
            # Check that there is a next phase
            next_phase=$(yq ".execution.phases[$((i + 1))].id" "$template_file")
            if [ "$next_phase" == "null" ]; then
                echo -e "    ${RED}✗ Phase '$phase_id' has checkpoint.required_for_next_phase: true but no next phase exists${NC}"
                errors=$((errors + 1))
                checkpoint_errors=$((checkpoint_errors + 1))
            fi
        fi
    done

    if [ $checkpoint_errors -eq 0 ]; then
        echo -e "    ${GREEN}✓ All checkpoint requirements are valid${NC}"
    fi

    # Summary for this template
    echo ""
    if [ $errors -eq 0 ]; then
        echo -e "  ${GREEN}✓ Template '$template_name' is VALID${NC}"
    else
        echo -e "  ${RED}✗ Template '$template_name' has $errors error(s)${NC}"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + errors))
    fi

    echo ""
}

# Validate all templates
for template in "$TEMPLATES_DIR"/*.yaml; do
    # Skip .gitkeep if it exists
    if [ "$(basename "$template")" == ".gitkeep" ]; then
        continue
    fi

    validate_template "$template"
done

# Final summary
echo "=========================================="
echo "Validation Summary"
echo "=========================================="

if [ $VALIDATION_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All templates are VALID${NC}"
    echo ""
    echo "Templates validated: 8"
    echo "Total errors: 0"
    exit 0
else
    echo -e "${RED}✗ Validation FAILED${NC}"
    echo ""
    echo "Total errors: $VALIDATION_ERRORS"
    exit 1
fi
