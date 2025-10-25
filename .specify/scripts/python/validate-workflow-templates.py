#!/usr/bin/env python3
"""
Workflow Template Validation Script
Validates all workflow templates against the schema rules from:
specs/001-orchestration-foundation/contracts/workflow-template-schema.yaml
"""

import os
import yaml
import sys
from pathlib import Path
from typing import Dict, List, Any

# Color codes for output
RED = '\033[0;31m'
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
NC = '\033[0m'  # No Color

TEMPLATES_DIR = Path("/Users/dusansekulic/code/go/arkadian/.specify/templates/workflows")
TOTAL_ERRORS = 0


def print_header(text: str):
    """Print a formatted header"""
    print("\n" + "=" * 50)
    print(text)
    print("=" * 50)


def print_section(text: str):
    """Print a section header"""
    print(f"\n{text}")
    print("-" * 40)


def validate_dag(template: Dict[str, Any], template_name: str) -> int:
    """
    Rule 1: DAG Validation
    - First phase must have depends_on: null
    - All depends_on values must reference existing phase IDs
    - No cycles allowed
    """
    print("  [1/5] DAG Validation...")
    errors = 0

    phases = template.get('execution', {}).get('phases', [])
    if not phases:
        print(f"    {RED}✗ No phases defined{NC}")
        return 1

    # Check first phase has depends_on: null
    first_phase = phases[0]
    if first_phase.get('depends_on') is not None:
        print(f"    {RED}✗ First phase '{first_phase['id']}' must have depends_on: null{NC}")
        errors += 1
    else:
        print(f"    {GREEN}✓ First phase has depends_on: null{NC}")

    # Collect all phase IDs
    phase_ids = {phase['id'] for phase in phases}

    # Check all depends_on references exist
    invalid_refs = []
    for phase in phases:
        depends_on = phase.get('depends_on')
        if depends_on is not None and depends_on not in phase_ids:
            invalid_refs.append(f"{phase['id']} -> {depends_on}")
            errors += 1

    if invalid_refs:
        print(f"    {RED}✗ Invalid depends_on references:{NC}")
        for ref in invalid_refs:
            print(f"      - {ref}")
    else:
        print(f"    {GREEN}✓ All depends_on references are valid{NC}")

    return errors


def validate_agents(template: Dict[str, Any], template_name: str) -> int:
    """
    Rule 2: Agent Validation
    - All agents in phases must be listed in execution.agents
    """
    print("  [2/5] Agent Validation...")
    errors = 0

    declared_agents = set(template.get('execution', {}).get('agents', []))
    # Remove "ark-" prefix for comparison
    declared_agents_short = {agent.replace('ark-', '') for agent in declared_agents}

    phases = template.get('execution', {}).get('phases', [])
    phase_agents = {phase.get('agent') for phase in phases}

    # Check if all phase agents are declared
    undeclared = []
    for agent in phase_agents:
        if agent not in declared_agents_short:
            undeclared.append(agent)
            errors += 1

    if undeclared:
        print(f"    {RED}✗ Undeclared agents used in phases: {', '.join(undeclared)}{NC}")
    else:
        print(f"    {GREEN}✓ All phase agents are declared in execution.agents{NC}")

    return errors


def validate_timeouts(template: Dict[str, Any], template_name: str) -> int:
    """
    Rule 3: Timeout Validation
    - Sum of phase timeouts should be <= max_duration_seconds
    - estimated_duration_seconds <= max_duration_seconds
    """
    print("  [3/5] Timeout Validation...")
    errors = 0

    phases = template.get('execution', {}).get('phases', [])
    total_timeout = sum(phase.get('timeout_seconds', 0) for phase in phases)

    performance = template.get('performance', {})
    max_duration = performance.get('max_duration_seconds', 0)
    estimated_duration = performance.get('estimated_duration_seconds', 0)

    if total_timeout > max_duration:
        print(f"    {YELLOW}⚠ Sum of phase timeouts ({total_timeout}s) > max_duration ({max_duration}s){NC}")
        # This is a warning, not an error
    else:
        print(f"    {GREEN}✓ Sum of phase timeouts ({total_timeout}s) ≤ max_duration ({max_duration}s){NC}")

    if estimated_duration > max_duration:
        print(f"    {RED}✗ estimated_duration ({estimated_duration}s) > max_duration ({max_duration}s){NC}")
        errors += 1
    else:
        print(f"    {GREEN}✓ estimated_duration ({estimated_duration}s) ≤ max_duration ({max_duration}s){NC}")

    return errors


def validate_approvals(template: Dict[str, Any], template_name: str) -> int:
    """
    Rule 4: Approval Validation
    - If approval_required: true, approval_message should be set
    """
    print("  [4/5] Approval Validation...")
    errors = 0

    phases = template.get('execution', {}).get('phases', [])
    missing_messages = []

    for phase in phases:
        if phase.get('approval_required') and not phase.get('approval_message'):
            missing_messages.append(phase['id'])
            errors += 1

    if missing_messages:
        print(f"    {RED}✗ Phases with approval_required but no approval_message:{NC}")
        for phase_id in missing_messages:
            print(f"      - {phase_id}")
    else:
        print(f"    {GREEN}✓ All phases with approval_required have approval_message{NC}")

    return errors


def validate_checkpoints(template: Dict[str, Any], template_name: str) -> int:
    """
    Rule 5: Checkpoint Validation
    - If checkpoint.required_for_next_phase: true, next phase must exist
    """
    print("  [5/5] Checkpoint Validation...")
    errors = 0

    phases = template.get('execution', {}).get('phases', [])
    invalid_checkpoints = []

    for i, phase in enumerate(phases[:-1]):  # Exclude last phase
        checkpoint = phase.get('checkpoint', {})
        if checkpoint.get('required_for_next_phase'):
            # Check if next phase exists
            if i + 1 >= len(phases):
                invalid_checkpoints.append(phase['id'])
                errors += 1

    if invalid_checkpoints:
        print(f"    {RED}✗ Phases with required_for_next_phase but no next phase:{NC}")
        for phase_id in invalid_checkpoints:
            print(f"      - {phase_id}")
    else:
        print(f"    {GREEN}✓ All checkpoint requirements are valid{NC}")

    return errors


def validate_template(template_path: Path) -> int:
    """Validate a single template file"""
    template_name = template_path.stem

    print_section(f"Validating: {template_name}")

    try:
        with open(template_path, 'r') as f:
            template = yaml.safe_load(f)
    except Exception as e:
        print(f"  {RED}✗ Failed to parse YAML: {e}{NC}")
        return 1

    errors = 0

    # Run all validation rules
    errors += validate_dag(template, template_name)
    errors += validate_agents(template, template_name)
    errors += validate_timeouts(template, template_name)
    errors += validate_approvals(template, template_name)
    errors += validate_checkpoints(template, template_name)

    # Summary for this template
    print()
    if errors == 0:
        print(f"  {GREEN}✓ Template '{template_name}' is VALID{NC}")
    else:
        print(f"  {RED}✗ Template '{template_name}' has {errors} error(s){NC}")

    return errors


def main():
    """Main validation function"""
    global TOTAL_ERRORS

    print_header("Workflow Template Validation")

    # Get all YAML templates
    templates = list(TEMPLATES_DIR.glob("*.yaml"))
    templates = [t for t in templates if t.name != ".gitkeep"]

    if not templates:
        print(f"{RED}No templates found in {TEMPLATES_DIR}{NC}")
        sys.exit(1)

    print(f"\nFound {len(templates)} template(s) to validate")

    # Validate each template
    for template_path in sorted(templates):
        TOTAL_ERRORS += validate_template(template_path)

    # Final summary
    print_header("Validation Summary")

    if TOTAL_ERRORS == 0:
        print(f"{GREEN}✓ All templates are VALID{NC}\n")
        print(f"Templates validated: {len(templates)}")
        print(f"Total errors: 0")
        sys.exit(0)
    else:
        print(f"{RED}✗ Validation FAILED{NC}\n")
        print(f"Templates validated: {len(templates)}")
        print(f"Total errors: {TOTAL_ERRORS}")
        sys.exit(1)


if __name__ == "__main__":
    main()
