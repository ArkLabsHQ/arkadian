#!/usr/bin/env bun

import { appendFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const ARKADIAN_DIR = process.env.ARKADIAN_DIR || process.env.HOME + '/code/go/arkadian';
const SESSIONS_DIR = join(ARKADIAN_DIR, 'sessions');

// Use ARKADIAN_DATA_DIR for runtime state (OS-specific data directory)
// macOS: ~/Library/Application Support/Arkadian
// Linux: ~/.arkadian
// Falls back to ARKADIAN_DIR/log for backward compatibility
const ARKADIAN_DATA_DIR = process.env.ARKADIAN_DATA_DIR || join(ARKADIAN_DIR, 'log');

const LOG_FILE = join(ARKADIAN_DATA_DIR, 'session-start.txt');
const ORCHESTRATOR_SESSION_FILE = join(ARKADIAN_DATA_DIR, 'orchestrator-session.txt');
const TASK_DEPTH_FILE = join(ARKADIAN_DATA_DIR, 'task-depth.txt');

// Only register as orchestrator in orchestrator mode
const ORCHESTRATOR_MODE = process.env.ARKADIAN_ORCHESTRATOR_MODE === '1';

interface HookInput {
    session_id: string;
    transcript_path: string;
    cwd: string;
    hook_event_name: string;
    source?: string;
}

// Helper function for logging
function log(label: string, data: any) {
    const timestamp = new Date().toISOString();
    let output = `\n[${timestamp}] ${label}:\n`;

    if (typeof data === 'object') {
        output += JSON.stringify(data, null, 2);
    } else {
        output += data;
    }
    output += '\n';

    appendFileSync(LOG_FILE, output);
}

function getReadableTimestamp(): string {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Register this session as the orchestrator session.
 * This MUST be done in session-start, not in the guardrail hook,
 * to ensure the correct session ID is registered before any tool calls.
 */
function registerOrchestratorSession(sessionId: string): void {
    if (!ORCHESTRATOR_MODE) {
        log('Not registering orchestrator session', 'ORCHESTRATOR_MODE not set');
        return;
    }

    // Always overwrite - this is a new orchestrator session
    writeFileSync(ORCHESTRATOR_SESSION_FILE, sessionId);
    log('Registered orchestrator session', sessionId);

    // Reset task depth to 0 for new orchestrator session
    // This ensures sub-agent detection works correctly
    writeFileSync(TASK_DEPTH_FILE, '0');
    log('Reset task depth to 0', sessionId);
}

function createSessionFolder(hookInput: HookInput): string {
    const sessionId = hookInput.session_id;
    const sessionDir = join(SESSIONS_DIR, sessionId);

    // Create session directory structure
    if (!existsSync(sessionDir)) {
        mkdirSync(sessionDir, { recursive: true });
        mkdirSync(join(sessionDir, 'artifacts'), { recursive: true });
        mkdirSync(join(sessionDir, 'specs'), { recursive: true });

        // Create session.md with minimal info (summary added on session end)
        const sessionMd = `# Session

**Started:** ${getReadableTimestamp()}
**Directory:** ${hookInput.cwd}

---

_Summary will be generated when session ends._
`;
        writeFileSync(join(sessionDir, 'session.md'), sessionMd);
    }

    return sessionDir;
}

async function main() {
    try {
        writeFileSync(LOG_FILE, `=== New Session ${new Date().toISOString()} ===\n`);

        const input = await Bun.stdin.text();
        log('Raw input', input);

        const hookInput: HookInput = JSON.parse(input);
        log('Parsed hookInput', hookInput);

        const cwd = hookInput.cwd || process.cwd();
        const normalizedCwd = resolve(cwd);
        const normalizedArkadianDir = resolve(ARKADIAN_DIR);

        log('Paths', { normalizedCwd, normalizedArkadianDir });

        // Create session folder (for both dev and normal mode)
        const sessionDir = createSessionFolder(hookInput);

        // Register this session as orchestrator (only in orchestrator mode)
        // This MUST happen here, not in the guardrail, to avoid race conditions
        registerOrchestratorSession(hookInput.session_id);

        const quickCommands = `
I am Arkadian, your Ark Digital Assistant. I provide intelligent, context-aware assistance across the entire Ark protocol ecosystem (12+ repositories).

Here's what I can help you with:

Understanding & Research
• "How does VTXO expiry work?" → Deep protocol & code explanations
• "Research Bitcoin covenant proposals" → Multi-source research with confidence levels
• "Compare Ark to Lightning" → Protocol comparisons and analysis

Development & Implementation
• "Add GetRoundStatus endpoint to arkd" → Full feature implementation with tests
• "Fix race condition in round finalization" → Bug fixes following project patterns
• "Document the new API endpoint" → Documentation updates

Testing & Validation
• "Run integration tests for arkd" → Automated test execution
• "Start local arkd stack" → Environment setup with health checks
• "Execute load test with 50 clients" → Performance testing via ark-simulator

Code Review & Quality
• "Review arkd PR #234" → Architecture compliance, security, cross-project impact
• "Check hexagonal architecture compliance" → Quality and pattern verification

Project Management & Reporting
• "Plan fraud detection feature" → Specs, plans, and task breakdown
• "Weekly progress report" → Stakeholder-friendly summaries across all repos
• "Track Nostr integration status" → Feature progress across projects

Observability & Troubleshooting
• "Investigate high CPU on arkd" → Prometheus, Loki, Jaeger analysis
• "Check production logs for errors" → Log queries and root cause identification
• "AlertManager firing ErrorRateHigh" → Incident investigation with traces

Just describe what you need - I'll route to the right specialist automatically. 🚀`;

        // Session context to inject into orchestrator
        const sessionContext = `
# Session Context (Auto-Injected)

**Session ID:** ${hookInput.session_id}
**Session Directory:** ${sessionDir}
**Artifacts Directory:** ${join(sessionDir, 'artifacts')}
**Specs Directory:** ${join(sessionDir, 'specs')}

All agent outputs MUST be written to the session directory above.
`;

        if (normalizedCwd === normalizedArkadianDir || normalizedCwd.startsWith(normalizedArkadianDir + '/')) {
            log('Mode', 'Development mode - orchestrator skipped');
            const output = {
                systemMessage: `ARKADIAN DEV MODE`,
            };
            console.log(JSON.stringify(output));
            process.exit(0);
        }

        // ORCHESTRATOR.md is now symlinked to ~/.claude/CLAUDE.md
        // This gives it higher authority than hook-injected context
        // We only need to inject the session-specific context here
        const output = {
            systemMessage: `${quickCommands}`,
            hookSpecificOutput: {
                hookEventName: "SessionStart",
                additionalContext: sessionContext
            }
        };
        console.log(JSON.stringify(output));
        process.exit(0);
    } catch (error) {
        log('Error', error instanceof Error ? error.message : error);
        console.error('Error loading Arkadian orchestrator:', error);
        process.exit(1);
    }
}

main();