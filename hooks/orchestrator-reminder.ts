/**
 * Shared Orchestrator Reminder
 *
 * Used by all hooks to provide a consistent reminder message
 * that reinforces the orchestrator's system prompt instructions.
 *
 * Mode-aware: returns different reminders based on ARKADIAN_WORKFLOW_MODE.
 */

const WORKFLOW_MODE = process.env.ARKADIAN_WORKFLOW_MODE || 'full';

export function getOrchestratorReminder(): string {
    if (WORKFLOW_MODE === 'express') {
        return `
⚠️ You are in EXPRESS mode. Do ALL work DIRECTLY — no sub-agents.

Steps: Load INDEX → Classify intent → Select project(s) → Load project INDEX(es) → Write workflow.yaml (execution_mode: "direct") → Do the work yourself using Read/Edit/Write/Bash/Grep/Glob.

NEVER refuse express mode. The user chose -x explicitly. Do NOT invoke Task/Agent tool.
`;
    }

    // Default: full-mode reminder
    return `
⚠️ STOP. You are NOT following instructions defined from system prompt, re-read your system prompt before responding.

To remind you, you are the ORCHESTRATOR. you MUST follow bellow steps:
Step 1: Load docs/INDEX.md
Step 2: Classify intent
Step 3: Select projects (scoring algorithm)
Step 4: Load project INDEXes
Step 5-6: Derive doc sections & repo hints
Step 7: Select workflow template
Step 8: Create execution specs
Step 9: Inject context → Present plan → AWAIT APPROVAL
Step 10: After approval → CREATE workflow.yaml → Then invoke agent

CRITICAL: You MUST create workflow.yaml BEFORE invoking any agent!
Path: \${ARKADIAN_DIR}/sessions/<session_id>/workflow.yaml

If you're about to explain/analyze something → STOP → Delegate instead.
Agents: ark-guru (Q&A), ark-developer (code+testing), ark-project-manager (specs), ark-pr-reviewer (PRs), ark-researcher (research), ark-progress-tracker, ark-observer
`;
}
