#!/usr/bin/env bun

/**
 * Arkadian Orchestrator Reminder Hook
 *
 * Triggered on UserPromptSubmit to remind Claude to follow the orchestrator rules.
 * Uses the shared reminder from orchestrator-reminder.ts.
 *
 * IMPORTANT: Only outputs the reminder when ARKADIAN_ORCHESTRATOR_MODE=1.
 * In development mode (running `claude` directly in arkadian dir), this hook
 * should NOT inject orchestrator reminders.
 */

import { getOrchestratorReminder } from './orchestrator-reminder';

// Only enforce in orchestrator mode
const ORCHESTRATOR_MODE = process.env.ARKADIAN_ORCHESTRATOR_MODE === '1';

async function main() {
    // Skip reminder if not in orchestrator mode
    if (!ORCHESTRATOR_MODE) {
        process.exit(0);
    }

    console.log(getOrchestratorReminder());
    process.exit(0);
}

main();
