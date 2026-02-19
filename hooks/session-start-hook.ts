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

import { appendFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync, readFileSync, cpSync, rmSync } from 'fs';
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
    session_id: string;
    type: 'orchestrator';
    started_at: string;
    pid: number;
    transcript_path: string;
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
 * Clean up stale state files and active pointers from crashed sessions.
 * Called on each SessionStart to prevent accumulation.
 */
function cleanupStaleFiles(currentSessionId: string): void {
    try {
        const allFiles = readdirSync(ARKADIAN_DATA_DIR);

        // Clean up old .txt state files (migration)
        const txtStateFiles = allFiles.filter(f => f.endsWith('_state.txt'));
        for (const file of txtStateFiles) {
            try {
                unlinkSync(join(ARKADIAN_DATA_DIR, file));
                log(currentSessionId, 'cleanup', `Removed old txt state file: ${file}`);
            } catch (e) {
                // Ignore
            }
        }

        // Clean up stale .json state files (dead PIDs)
        const jsonStateFiles = allFiles.filter(f => f.endsWith('_state.json'));
        for (const file of jsonStateFiles) {
            const filePath = join(ARKADIAN_DATA_DIR, file);
            try {
                const content = readFileSync(filePath, 'utf-8');
                const state: SessionState = JSON.parse(content);

                if (state.type === 'orchestrator' && state.pid) {
                    if (!isPidRunning(state.pid)) {
                        unlinkSync(filePath);
                        log(currentSessionId, 'cleanup', `Removed stale state file: ${file} (PID ${state.pid} not running)`);

                        // Also clean up matching active pointer
                        const activeFile = file.replace('_state.json', '_active.txt');
                        const activePath = join(ARKADIAN_DATA_DIR, activeFile);
                        if (existsSync(activePath)) {
                            unlinkSync(activePath);
                            log(currentSessionId, 'cleanup', `Removed stale active pointer: ${activeFile}`);
                        }
                    }
                }
            } catch (e) {
                // If we can't read/parse the file, skip it
            }
        }

        // Clean up orphaned _active.txt files (no matching state file or log activity in 24h)
        const activeFiles = allFiles.filter(f => f.endsWith('_active.txt'));
        for (const file of activeFiles) {
            const sessionId = file.replace('_active.txt', '');
            if (sessionId === currentSessionId) continue; // Don't clean current session

            const stateFile = join(ARKADIAN_DATA_DIR, `${sessionId}_state.json`);
            const hasState = existsSync(stateFile);

            if (!hasState) {
                // No state file means session ended (stop hook cleans state but may miss active pointer)
                // or was never an orchestrator session — either way, safe to clean
                try {
                    unlinkSync(join(ARKADIAN_DATA_DIR, file));
                    log(currentSessionId, 'cleanup', `Removed orphaned active pointer: ${file}`);
                } catch (e) {
                    // Ignore
                }
            }
        }
    } catch (e) {
        // Ignore cleanup errors
    }
}

/**
 * Create initial state for orchestrator session.
 */
function createInitialState(sessionId: string, transcriptPath: string): SessionState {
    return {
        session_id: sessionId,
        type: 'orchestrator',
        started_at: new Date().toISOString(),
        pid: process.ppid,
        transcript_path: transcriptPath,
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
    };
}

/**
 * Register this session as the orchestrator session.
 * Creates per-session state and log files.
 *
 * State preservation rules (3 cases):
 *
 * 1. NEW SESSION (no state file):
 *    Create fresh state with active_agent: null.
 *
 * 2. EXPLICIT RESUME (--resume, isResume=true, state file exists):
 *    Preserve workflow/phases/approvals but RESET active_agent to null.
 *    The old agent is dead (session ended/crashed), keeping a stale
 *    active_agent would let orchestrator calls bypass the guardrail.
 *
 * 3. CONTEXT COMPRESSION (same session continuing, isResume=false, state file exists):
 *    Preserve EVERYTHING including active_agent.
 *    A sub-agent may still be running. Resetting active_agent here would
 *    cause orchestrator-guardrail to block the sub-agent's tool calls.
 *    This was the root cause of the S3 guardrail bug.
 */
function registerOrchestratorSession(sessionId: string, transcriptPath: string, isResume: boolean): void {
    if (!ORCHESTRATOR_MODE) {
        log(sessionId, 'skip-registration', 'ORCHESTRATOR_MODE not set');
        return;
    }

    const stateFile = join(ARKADIAN_DATA_DIR, `${sessionId}_state.json`);

    // State file exists — either resume or context compression
    if (existsSync(stateFile)) {
        try {
            const existingState = JSON.parse(readFileSync(stateFile, 'utf-8'));

            // Always update process-level fields
            existingState.pid = process.ppid;
            existingState.transcript_path = transcriptPath;

            if (isResume) {
                // EXPLICIT RESUME: Old agent is dead → reset active_agent
                // pre-agent-validator will set it when Task tool is invoked
                existingState.active_agent = null;
                log(sessionId, 'resumed-state', {
                    active_agent: null,
                    workflow_status: existingState.workflow?.status,
                    current_phase: existingState.workflow?.current_phase
                });
            } else {
                // CONTEXT COMPRESSION / CONTINUATION: Agent may be alive → preserve
                log(sessionId, 'preserved-state', {
                    active_agent: existingState.active_agent?.agent_type || null,
                    spec_id: existingState.active_agent?.spec_id || null,
                    workflow_status: existingState.workflow?.status,
                    current_phase: existingState.workflow?.current_phase
                });
            }

            writeFileSync(stateFile, JSON.stringify(existingState, null, 2));
            return;
        } catch (e: any) {
            log(sessionId, 'state-preserve-error', `Failed to preserve state: ${e.message}`);
            // Fall through to create fresh state (better than crashing)
        }
    }

    // No existing state file — truly new session, create fresh
    const state = createInitialState(sessionId, transcriptPath);
    writeFileSync(stateFile, JSON.stringify(state, null, 2));
    log(sessionId, 'registered', { type: 'orchestrator', pid: process.ppid, mode: 'new' });
}

function createSessionFolder(hookInput: HookInput): string {
    const sessionId = hookInput.session_id;
    const sessionDir = join(SESSIONS_DIR, sessionId);

    // Create session directory structure
    if (!existsSync(sessionDir)) {
        mkdirSync(sessionDir, { recursive: true });
        mkdirSync(join(sessionDir, 'artifacts'), { recursive: true });
        mkdirSync(join(sessionDir, 'specs'), { recursive: true });

        // Create artifact subdirectories for execution phases (session-scoped)
        // Planning artifacts go to specs/{project}/{feature-id}/ (project-scoped)
        mkdirSync(join(sessionDir, 'artifacts', 'explore'), { recursive: true });
        mkdirSync(join(sessionDir, 'artifacts', 'implement'), { recursive: true });

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
 * Copy files from a previous session into a new session folder.
 * Updates workflow_id and session paths in copied files.
 * Deletes the old session folder after copying.
 */
function copyPreviousSession(oldSessionDir: string, newSessionDir: string, newSessionId: string, logSessionId: string): void {
    // Copy all files from old session (overwrite the empty structure)
    cpSync(oldSessionDir, newSessionDir, { recursive: true, force: true });

    // Extract old workflow_id before replacing
    const workflowPath = join(newSessionDir, 'workflow.yaml');
    let oldWorkflowId = '';
    if (existsSync(workflowPath)) {
        const content = readFileSync(workflowPath, 'utf-8');
        const match = content.match(/^workflow_id:\s*"?([^"\n]+)"?/m);
        if (match) oldWorkflowId = match[1].trim();

        // Update workflow_id
        const updated = content.replace(/^workflow_id:.*$/m, `workflow_id: "${newSessionId}"`);
        writeFileSync(workflowPath, updated);
    }

    // Update parent_session_id and session dir paths in spec files
    const specsDir = join(newSessionDir, 'specs');
    if (existsSync(specsDir)) {
        for (const file of readdirSync(specsDir)) {
            if (!file.endsWith('.yaml')) continue;
            const specPath = join(specsDir, file);
            let content = readFileSync(specPath, 'utf-8');

            // Replace parent_session_id
            if (oldWorkflowId) {
                content = content.replaceAll(oldWorkflowId, newSessionId);
            }
            // Replace old session dir paths with new
            content = content.replaceAll(oldSessionDir, newSessionDir);
            writeFileSync(specPath, content);
        }
    }

    // Delete old session folder
    rmSync(oldSessionDir, { recursive: true, force: true });

    log(logSessionId, 'resume-copy', {
        from: oldSessionDir,
        to: newSessionDir,
        old_workflow_id: oldWorkflowId,
        new_session_id: newSessionId,
        old_deleted: true
    });
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

        // Clean up stale files from crashed sessions (runs for ALL sessions, not just orchestrator)
        cleanupStaleFiles(hookInput.session_id);

        // Append session start marker to log file (preserve previous entries)
        const logFile = join(ARKADIAN_DATA_DIR, `${hookInput.session_id}_log.txt`);
        appendFileSync(logFile, `=== Session Start: ${new Date().toISOString()} ===\n`);

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

        // Check for RESUME MODE
        // CRITICAL: Only treat as resume if EXPLICITLY requested via environment variable
        // Don't assume resume just because workflow.yaml exists (could be same session continuing)
        const explicitResume = process.env.ARKADIAN_RESUME_SESSION_DIR || process.env.ARKADIAN_RESUME_SESSION;
        const oldSessionDir = process.env.ARKADIAN_RESUME_SESSION_DIR;

        let sessionDir: string;
        let isResumeMode = false;
        const potentialSessionDir = join(SESSIONS_DIR, hookInput.session_id);
        const workflowFile = join(potentialSessionDir, 'workflow.yaml');

        if (!explicitResume && existsSync(workflowFile)) {
            // SAME SESSION CONTINUING: workflow.yaml exists but not explicit resume
            // This happens when SessionStart hook runs multiple times in same session
            sessionDir = potentialSessionDir;
            log(hookInput.session_id, 'continuing-session', {
                session_id: hookInput.session_id,
                session_dir: sessionDir,
                workflow_exists: true,
                explicit: false
            });
            console.error(`[session-start] Continuing existing session ${hookInput.session_id}`);
        } else {
            // NEW SESSION or RESUME: Always create fresh session folder
            sessionDir = createSessionFolder(hookInput);
            log(hookInput.session_id, 'new-session', {
                session_id: hookInput.session_id,
                session_dir: sessionDir
            });
        }

        // If resuming, copy files from old session into the new folder
        if (explicitResume && oldSessionDir && existsSync(oldSessionDir)) {
            try {
                copyPreviousSession(oldSessionDir, sessionDir, hookInput.session_id, hookInput.session_id);
                isResumeMode = true;
                console.error(`[session-start] Resume: copied ${oldSessionDir} → ${sessionDir}, old deleted`);
            } catch (e: any) {
                log(hookInput.session_id, 'resume-copy-error', e.message);
                console.error(`[session-start] Resume copy failed: ${e.message}`);
            }
        }

        // Write active session pointer to data dir (parallel-safe: one file per session)
        writeFileSync(join(ARKADIAN_DATA_DIR, `${hookInput.session_id}_active.txt`), `${sessionDir}\n`);

        // Register this session as orchestrator
        // Resume: reset active_agent (old agent is dead)
        // Context compression: preserve active_agent (agent may be running)
        registerOrchestratorSession(hookInput.session_id, hookInput.transcript_path, isResumeMode);

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
**Artifacts Directory (execution):** ${join(sessionDir, 'artifacts')}/<phase>
**Specs Directory (planning):** ${join(sessionDir, 'specs')}/<project>/<feature-id>

IMPORTANT: When generating execution specs, use the correct artifact location per agent:
- ark-guru (explore): artifacts_dir = ${join(sessionDir, 'artifacts')}/explore
- ark-project-manager (plan): artifacts_dir = ${join(sessionDir, 'specs')}  (writes to specs/{project}/{feature-id}/)
- ark-developer (implement): artifacts_dir = ${join(sessionDir, 'artifacts')}/implement
- ark-guru (qna): artifacts_dir = ${join(sessionDir, 'artifacts')}/qna

Execution artifacts (explore, implement) go to artifacts/{phase}/.
Planning artifacts (spec, plan, tasks) go to specs/{project}/{feature-id}/.
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
