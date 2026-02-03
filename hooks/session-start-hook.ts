#!/usr/bin/env bun

/**
 * Arkadian Session Start Hook
 *
 * Triggered on SessionStart event. Creates session folder structure and
 * registers orchestrator sessions with per-session state files.
 *
 * State Management:
 * - Orchestrator: Creates {DATA_DIR}/{session_id}_state.json
 * - Sub-agents: Do NOT trigger SessionStart (only SubagentStop exists)
 * - Logs: Creates {DATA_DIR}/{session_id}_log.txt
 *
 * State File Format (JSON):
 * ```json
 * {
 *   "session_id": "abc-123",
 *   "type": "orchestrator",
 *   "started_at": "2025-12-14T10:00:00.000Z",
 *   "pid": 12345,
 *   "workflow": { "id": null, "status": "initializing", ... },
 *   "phases": {},
 *   "active_agent": null,
 *   "approvals": {}
 * }
 * ```
 *
 * This approach:
 * - Isolates each session's state (no race conditions)
 * - Preserves logs for debugging
 * - Supports multiple concurrent orchestrator sessions
 * - Tracks workflow state and active sub-agents
 */

import { appendFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { createSessionEpic, isBeadsAvailable, logBeadsOperation } from './beads-bridge';

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
    session_id: string;
    type: 'orchestrator';
    started_at: string;
    pid: number;
    workflow: {
        id: string | null;
        status: 'initializing' | 'awaiting_plan_approval' | 'executing' | 'completed';
        current_phase: string | null;
        file: string;
        file_created: boolean;
        plan_approved: boolean;
        plan_approved_at: string | null;
    };
    phases: Record<string, PhaseState>;
    active_agent: ActiveAgent | null;
    approvals: Record<string, ApprovalRecord>;
    beads?: {
        session_epic_id: string | null;
        feature_epics: Record<string, string>;  // feature_id -> epic_id
        enabled: boolean;
    };
}

interface PhaseState {
    status: 'pending' | 'awaiting_spec_approval' | 'in_progress' | 'completed' | 'failed' | 'skipped';
    agent: string;
    started_at?: string;
    completed_at?: string;
    artifacts_expected?: string[];
    artifacts_created?: string[];
    validation?: {
        passed: boolean;
        missing: string[];
    };
    skip_reason?: string;
}

interface ActiveAgent {
    agent_type: string;
    spec_id: string;
    invoked_at: string;
    expected_artifacts: string[];
    allowed_tools: string[];
    allowed_paths: string[];
    blocked_paths: string[];
}

interface ApprovalRecord {
    approved: boolean;
    at: string;
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
function cleanupStaleStateFiles(currentSessionId: string): void {
    try {
        // Clean up both old .txt and new .json state files
        const txtFiles = readdirSync(ARKADIAN_DATA_DIR).filter(f => f.endsWith('_state.txt'));
        const jsonFiles = readdirSync(ARKADIAN_DATA_DIR).filter(f => f.endsWith('_state.json'));

        // Remove old .txt files (migration)
        for (const file of txtFiles) {
            const filePath = join(ARKADIAN_DATA_DIR, file);
            try {
                unlinkSync(filePath);
                log(currentSessionId, 'cleanup', `Removed old txt state file: ${file}`);
            } catch (e) {
                // Ignore
            }
        }

        // Clean up stale .json files
        for (const file of jsonFiles) {
            const filePath = join(ARKADIAN_DATA_DIR, file);
            try {
                const content = readFileSync(filePath, 'utf-8');
                const state: SessionState = JSON.parse(content);

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
 * Create initial state for orchestrator session.
 */
function createInitialState(sessionId: string, sessionEpicId: string | null): SessionState {
    return {
        session_id: sessionId,
        type: 'orchestrator',
        started_at: new Date().toISOString(),
        pid: process.ppid,
        workflow: {
            id: null,
            status: 'initializing',
            current_phase: null,
            file: 'workflow.yaml',
            file_created: false,
            plan_approved: false,
            plan_approved_at: null
        },
        phases: {},
        active_agent: null,
        approvals: {},
        beads: {
            session_epic_id: sessionEpicId,
            feature_epics: {},
            enabled: sessionEpicId !== null
        }
    };
}

/**
 * Register this session as the orchestrator session.
 * Creates per-session state and log files.
 */
function registerOrchestratorSession(sessionId: string, sessionEpicId: string | null): void {
    if (!ORCHESTRATOR_MODE) {
        log(sessionId, 'skip-registration', 'ORCHESTRATOR_MODE not set');
        return;
    }

    // Clean up stale state files from crashed sessions
    cleanupStaleStateFiles(sessionId);

    // Create state file for this orchestrator session
    const stateFile = join(ARKADIAN_DATA_DIR, `${sessionId}_state.json`);
    const state = createInitialState(sessionId, sessionEpicId);

    writeFileSync(stateFile, JSON.stringify(state, null, 2));
    log(sessionId, 'registered', { type: 'orchestrator', pid: process.ppid, beads_enabled: sessionEpicId !== null });
}

function createSessionFolder(hookInput: HookInput): string {
    const sessionId = hookInput.session_id;
    const sessionDir = join(SESSIONS_DIR, sessionId);

    // Create session directory structure
    if (!existsSync(sessionDir)) {
        mkdirSync(sessionDir, { recursive: true });
        mkdirSync(join(sessionDir, 'artifacts'), { recursive: true });
        mkdirSync(join(sessionDir, 'specs'), { recursive: true });

        // Create common artifact subdirectories for workflows
        mkdirSync(join(sessionDir, 'artifacts', 'explore'), { recursive: true });
        mkdirSync(join(sessionDir, 'artifacts', 'plan'), { recursive: true });
        mkdirSync(join(sessionDir, 'artifacts', 'implement'), { recursive: true });
        mkdirSync(join(sessionDir, 'artifacts', 'test'), { recursive: true });
        mkdirSync(join(sessionDir, 'artifacts', 'qna'), { recursive: true });  // For ark-guru Q&A

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

        log(hookInput.session_id, 'session-start input:', hookInput);

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

        // Create beads session epic if beads is enabled
        let sessionEpicId: string | null = null;
        if (ORCHESTRATOR_MODE && isBeadsAvailable()) {
            try {
                sessionEpicId = await createSessionEpic(hookInput.session_id);
                if (sessionEpicId) {
                    log(hookInput.session_id, 'beads-session-epic-created', {
                        epic_id: sessionEpicId
                    });
                }
            } catch (error: any) {
                log(hookInput.session_id, 'beads-session-epic-error', error.message);
                // Don't fail session start on beads error
            }
        }

        // Register this session as orchestrator (only in orchestrator mode, NOT in dev mode)
        registerOrchestratorSession(hookInput.session_id, sessionEpicId);

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
            systemMessage: quickCommands + '\n\n' + sessionContext,
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
