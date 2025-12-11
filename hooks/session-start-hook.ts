#!/usr/bin/env bun

/**
 * Arkadian Session Start Hook
 *
 * Triggered on SessionStart event. Creates session folder structure and
 * registers orchestrator sessions with per-session state files.
 *
 * State Management:
 * - Orchestrator: Creates {DATA_DIR}/{session_id}_state.txt
 * - Sub-agents: Do NOT trigger SessionStart (only SubagentStop exists)
 * - Logs: Creates {DATA_DIR}/{session_id}_log.txt
 *
 * State File Format (orchestrator):
 * ```
 * type: orchestrator
 * started: 2025-12-11T10:00:00.000Z
 * pid: 12345
 * ```
 *
 * This approach:
 * - Isolates each session's state (no race conditions)
 * - Preserves logs for debugging
 * - Supports multiple concurrent orchestrator sessions
 */

import { appendFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

const ARKADIAN_DIR = process.env.ARKADIAN_DIR || process.env.HOME + '/code/go/arkadian';
const SESSIONS_DIR = join(ARKADIAN_DIR, 'sessions');

// Use ARKADIAN_DATA_DIR for runtime state (OS-specific data directory)
// macOS: ~/Library/Application Support/Arkadian
// Linux: ~/.arkadian
// Falls back to ARKADIAN_DIR/log for backward compatibility
const ARKADIAN_DATA_DIR = process.env.ARKADIAN_DATA_DIR || join(ARKADIAN_DIR, 'log');

// Only register as orchestrator in orchestrator mode
const ORCHESTRATOR_MODE = process.env.ARKADIAN_ORCHESTRATOR_MODE === '1';

interface HookInput {
    session_id: string;
    transcript_path: string;
    cwd: string;
    hook_event_name: string;
    source?: string;
}

interface SessionState {
    type: 'orchestrator' | 'subagent';
    started: string;
    pid?: number;
    parent_session_id?: string;
    agent_type?: string;
}

// Helper function for per-session logging
function log(sessionId: string, label: string, data: any) {
    const timestamp = new Date().toISOString();
    const logFile = join(ARKADIAN_DATA_DIR, `${sessionId}_log.txt`);

    let output = `[${timestamp}] [session-start] ${label}: `;
    if (typeof data === 'object') {
        output += JSON.stringify(data);
    } else {
        output += data;
    }
    output += '\n';

    try {
        appendFileSync(logFile, output);
    } catch (e) {
        // Ignore logging errors
    }
}

function getReadableTimestamp(): string {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Check if a process ID is still running
 */
function isPidRunning(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Clean up stale state files from crashed sessions.
 * Called on each SessionStart to prevent accumulation.
 */
function cleanupStaleStateFfiles(currentSessionId: string): void {
    try {
        const files = readdirSync(ARKADIAN_DATA_DIR).filter(f => f.endsWith('_state.txt'));

        for (const file of files) {
            const filePath = join(ARKADIAN_DATA_DIR, file);
            try {
                const content = readFileSync(filePath, 'utf-8');
                const state = parseState(content);

                // Only clean up orchestrator state files with dead PIDs
                if (state.type === 'orchestrator' && state.pid) {
                    if (!isPidRunning(state.pid)) {
                        unlinkSync(filePath);
                        log(currentSessionId, 'cleanup', `Removed stale state file: ${file} (PID ${state.pid} not running)`);
                    }
                }
            } catch (e) {
                // If we can't read/parse the file, skip it
            }
        }
    } catch (e) {
        // Ignore cleanup errors
    }
}

/**
 * Parse state file content
 */
function parseState(content: string): SessionState {
    const state: SessionState = { type: 'orchestrator', started: '' };

    for (const line of content.split('\n')) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();

        if (key === 'type') state.type = value as 'orchestrator' | 'subagent';
        if (key === 'started') state.started = value;
        if (key === 'pid') state.pid = parseInt(value, 10);
        if (key === 'parent_session_id') state.parent_session_id = value;
        if (key === 'agent_type') state.agent_type = value;
    }

    return state;
}

/**
 * Register this session as the orchestrator session.
 * Creates per-session state and log files.
 */
function registerOrchestratorSession(sessionId: string): void {
    if (!ORCHESTRATOR_MODE) {
        log(sessionId, 'skip-registration', 'ORCHESTRATOR_MODE not set');
        return;
    }

    // Clean up stale state files from crashed sessions
    cleanupStaleStateFfiles(sessionId);

    // Create state file for this orchestrator session
    const stateFile = join(ARKADIAN_DATA_DIR, `${sessionId}_state.txt`);
    const stateContent = `type: orchestrator
started: ${new Date().toISOString()}
pid: ${process.ppid}
`;

    writeFileSync(stateFile, stateContent);
    log(sessionId, 'registered', { type: 'orchestrator', pid: process.ppid });
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

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
    if (!existsSync(ARKADIAN_DATA_DIR)) {
        mkdirSync(ARKADIAN_DATA_DIR, { recursive: true });
    }
}

async function main() {
    try {
        const input = await Bun.stdin.text();
        const hookInput: HookInput = JSON.parse(input);

        // Ensure data directory exists
        ensureDataDir();

        // Initialize log file with session start marker
        const logFile = join(ARKADIAN_DATA_DIR, `${hookInput.session_id}_log.txt`);
        writeFileSync(logFile, `=== Session Start: ${new Date().toISOString()} ===\n`);

        log(hookInput.session_id, 'input', hookInput);

        const cwd = hookInput.cwd || process.cwd();
        const normalizedCwd = resolve(cwd);
        const normalizedArkadianDir = resolve(ARKADIAN_DIR);

        log(hookInput.session_id, 'paths', { normalizedCwd, normalizedArkadianDir });

        // Check for dev mode FIRST - before any orchestrator registration
        if (normalizedCwd === normalizedArkadianDir || normalizedCwd.startsWith(normalizedArkadianDir + '/')) {
            log(hookInput.session_id, 'mode', 'Development mode - orchestrator NOT registered');
            // Create session folder even in dev mode
            createSessionFolder(hookInput);
            const output = {
                systemMessage: `ARKADIAN DEV MODE`,
            };
            console.log(JSON.stringify(output));
            process.exit(0);
        }

        // Create session folder (for orchestrator mode)
        const sessionDir = createSessionFolder(hookInput);

        // Register this session as orchestrator (only in orchestrator mode, NOT in dev mode)
        registerOrchestratorSession(hookInput.session_id);

        const quickCommands = `
I am Arkadian, your Ark Digital Assistant. I provide intelligent, context-aware assistance across the entire Ark protocol ecosystem (12+ repositories).

Here's what I can help you with:

Understanding & Research
- "How does VTXO expiry work?" - Deep protocol & code explanations
- "Research Bitcoin covenant proposals" - Multi-source research with confidence levels
- "Compare Ark to Lightning" - Protocol comparisons and analysis

Development & Implementation
- "Add GetRoundStatus endpoint to arkd" - Full feature implementation with tests
- "Fix race condition in round finalization" - Bug fixes following project patterns
- "Document the new API endpoint" - Documentation updates

Testing & Validation
- "Run integration tests for arkd" - Automated test execution
- "Start local arkd stack" - Environment setup with health checks
- "Execute load test with 50 clients" - Performance testing via ark-simulator

Code Review & Quality
- "Review arkd PR #234" - Architecture compliance, security, cross-project impact
- "Check hexagonal architecture compliance" - Quality and pattern verification

Project Management & Reporting
- "Plan fraud detection feature" - Specs, plans, and task breakdown
- "Weekly progress report" - Stakeholder-friendly summaries across all repos
- "Track Nostr integration status" - Feature progress across projects

Observability & Troubleshooting
- "Investigate high CPU on arkd" - Prometheus, Loki, Jaeger analysis
- "Check production logs for errors" - Log queries and root cause identification
- "AlertManager firing ErrorRateHigh" - Incident investigation with traces

Just describe what you need - I'll route to the right specialist automatically.`;

        // Session context to inject into orchestrator
        const sessionContext = `
# Session Context (Auto-Injected)

**Session ID:** ${hookInput.session_id}
**Session Directory:** ${sessionDir}
**Artifacts Directory:** ${join(sessionDir, 'artifacts')}
**Specs Directory:** ${join(sessionDir, 'specs')}

All agent outputs MUST be written to the session directory above.
`;

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
        // Try to log error if we have session_id
        try {
            const input = await Bun.stdin.text();
            const hookInput = JSON.parse(input);
            log(hookInput.session_id, 'error', error instanceof Error ? error.message : error);
        } catch (e) {
            // Ignore
        }
        console.error('Error loading Arkadian orchestrator:', error);
        process.exit(1);
    }
}

main();
