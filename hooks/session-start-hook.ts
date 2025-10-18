#!/usr/bin/env bun

/**
 * Arkadian Session Start Hook
 *
 * Triggered once when Claude Code session starts.
 * Loads the orchestrator CLAUDE.md to establish Arkadian's role and capabilities.
 *
 * Hook Protocol:
 * - Input: JSON via stdin with { session_id, hook_event_name }
 * - Output: Markdown to stdout for Claude to process
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const ARKADIAN_DIR = process.env.ARKADIAN_DIR || process.env.HOME + '/code/go/arkadian';

async function main() {
    try {
        // Read hook input from stdin (required by protocol, even if unused)
        await Bun.stdin.text();

        // Load the orchestrator context
        const orchestratorPath = join(ARKADIAN_DIR, 'CLAUDE.md');
        const orchestratorContent = readFileSync(orchestratorPath, 'utf-8');

        // Remove the {{USER_REQUEST}} placeholder for session start
        // (it will be filled in by UserPromptSubmit hook)
        const sessionContext = orchestratorContent.replace(
            '{{USER_REQUEST}}',
            'Session started - awaiting user request'
        );

        // Output the orchestrator markdown
        console.log(sessionContext);

        process.exit(0);
    } catch (error) {
        console.error('Error loading Arkadian orchestrator:', error);
        process.exit(1);
    }
}

main();
