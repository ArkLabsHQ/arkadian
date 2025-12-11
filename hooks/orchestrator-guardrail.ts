#!/usr/bin/env bun

/**
 * Orchestrator Guardrail Hook
 *
 * PreToolUse hook that enforces orchestrator boundaries using per-session state files.
 *
 * Detection Strategy:
 * - Orchestrator sessions have {session_id}_state.txt created by SessionStart
 * - Sub-agents do NOT have state files (they don't trigger SessionStart)
 * - Sub-agents are connected to parents via pending-spawns.json
 *
 * State Files:
 * - {DATA_DIR}/{session_id}_state.txt - Session state (type, parent, etc.)
 * - {DATA_DIR}/{session_id}_log.txt - Per-session log file
 * - {DATA_DIR}/pending-spawns.json - Maps pending spawns to parents
 *
 * Rules:
 * 1. Orchestrator can use: Task, Read, Write, Edit (ONLY within ARKADIAN_DIR)
 * 2. ALL paths outside ARKADIAN_DIR are blocked for orchestrator
 * 3. Sub-agents have full tool access (no restrictions)
 * 4. Blocks Bash commands for orchestrator
 *
 * Exit codes:
 * - 0: Allow tool call
 * - 2: Block tool call with error message
 */

import { appendFileSync, readFileSync, existsSync, realpathSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

// Only enforce guardrails in orchestrator mode
const ORCHESTRATOR_MODE = process.env.ARKADIAN_ORCHESTRATOR_MODE === '1';

const ARKADIAN_DIR = process.env.ARKADIAN_DIR || process.env.HOME + '/code/go/arkadian';

// Use ARKADIAN_DATA_DIR for runtime state (OS-specific data directory)
const ARKADIAN_DATA_DIR = process.env.ARKADIAN_DATA_DIR || join(ARKADIAN_DIR, 'log');

const PENDING_SPAWNS_FILE = join(ARKADIAN_DATA_DIR, 'pending-spawns.json');

// Tools the orchestrator is ALLOWED to use (some restricted to ARKADIAN_DIR)
const ALLOWED_TOOLS = [
    'Task',           // Delegate to agents
    'Read',           // Read docs (restricted to ARKADIAN_DIR)
    'Write',          // Write files (restricted to ARKADIAN_DIR)
    'Edit',           // Edit files (restricted to ARKADIAN_DIR)
    'Glob',           // Find files (restricted to ARKADIAN_DIR)
    'Grep',           // Search content (restricted to ARKADIAN_DIR)
    'TodoWrite',      // Track workflow state
    'AskUserQuestion' // Clarify requirements
];

// Tools that require path checking (restricted to ARKADIAN_DIR)
const PATH_RESTRICTED_TOOLS = ['Read', 'Write', 'Edit', 'Glob', 'Grep'];

// Tools that are BLOCKED for orchestrator (always blocked)
const BLOCKED_TOOLS = [
    'Bash',           // Orchestrator doesn't run commands
    'NotebookEdit',   // Orchestrator doesn't edit notebooks
    'MultiEdit'       // Orchestrator doesn't multi-edit code
];

// Allowed sub-agent types for Task tool
const ALLOWED_SUBAGENT_TYPES = [
    // Arkadian specialist agents
    'ark-guru',              // Q&A, explanations
    'ark-developer',         // Code changes, implementation
    'ark-env-tester',        // Testing, QA
    'ark-project-manager',   // Specs, planning, task breakdown
    'ark-pr-reviewer',       // PR analysis, code review
    'ark-observer',          // Telemetry, debugging
    'ark-researcher',        // Bitcoin/L2 research
    'ark-progress-tracker',  // Progress reports
    // Utility agents
    'claude-code-guide',     // Claude Code documentation queries
    'claude-search-agent',   // Web research worker
];

// Default Claude agents that are BLOCKED for orchestrator
const BLOCKED_SUBAGENT_TYPES = [
    'Explore',         // Use ark-guru instead
    'Plan',            // Use ark-project-manager instead
    'general-purpose', // Use specific Arkadian agent instead
];

// Project repo environment variables (orchestrator should NOT access these directly)
const REPO_ENV_VARS = [
    'ARKD_REPO',
    'GO_SDK_REPO',
    'WALLET_REPO',
    'ARK_FAUCET_REPO',
    'ARK_SIMULATOR_REPO',
    'ARK_TELEMETRY_REPO',
    'ARK_INFRA_REPO',
    'KMS_UNLOCKER_REPO',
    'FULMINE_REPO',
    'FULMINE_SIMULATOR_REPO',
    'ARK_DOCS_REPO',
    'ARKADE_ESCROW_REPO',
    'ARKADE_EXPLORER_REPO',
    'BOLTZ_BACKEND_REPO'
];

// Resolve repo paths from env vars
const BLOCKED_PATHS: string[] = [];
for (const envVar of REPO_ENV_VARS) {
    const path = process.env[envVar];
    if (path) {
        BLOCKED_PATHS.push(path);
    }
}

interface HookInput {
    session_id: string;
    tool_name: string;
    tool_input: Record<string, any>;
    hook_event_name: string;
}

interface SessionState {
    type: 'orchestrator' | 'subagent';
    started: string;
    pid?: number;
    parent_session_id?: string;
    agent_type?: string;
}

interface PendingSpawn {
    parent_session_id: string;
    agent_type: string;
    timestamp: string;
}

interface PendingSpawns {
    entries: PendingSpawn[];
}

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
    if (!existsSync(ARKADIAN_DATA_DIR)) {
        mkdirSync(ARKADIAN_DATA_DIR, { recursive: true });
    }
}

/**
 * Log to per-session log file.
 * If session has a parent, also log to parent's file.
 */
function log(sessionId: string, label: string, data: any) {
    const timestamp = new Date().toISOString();

    let output = `[${timestamp}] [guardrail] ${label}: `;
    if (typeof data === 'object') {
        output += JSON.stringify(data);
    } else {
        output += data;
    }
    output += '\n';

    try {
        ensureDataDir();

        // Log to this session's file
        const logFile = join(ARKADIAN_DATA_DIR, `${sessionId}_log.txt`);
        appendFileSync(logFile, output);

        // If this is a sub-agent, also log to parent's file
        const state = getSessionState(sessionId);
        if (state?.parent_session_id) {
            const parentLogFile = join(ARKADIAN_DATA_DIR, `${state.parent_session_id}_log.txt`);
            const parentOutput = `[${timestamp}] [guardrail] [subagent:${sessionId}] ${label}: ${typeof data === 'object' ? JSON.stringify(data) : data}\n`;
            appendFileSync(parentLogFile, parentOutput);
        }
    } catch (e) {
        // Ignore logging errors
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
 * Get session state from state file
 */
function getSessionState(sessionId: string): SessionState | null {
    const stateFile = join(ARKADIAN_DATA_DIR, `${sessionId}_state.txt`);

    if (!existsSync(stateFile)) {
        return null;
    }

    try {
        const content = readFileSync(stateFile, 'utf-8');
        return parseState(content);
    } catch (e) {
        return null;
    }
}

/**
 * Load pending spawns
 */
function loadPendingSpawns(): PendingSpawns {
    try {
        if (existsSync(PENDING_SPAWNS_FILE)) {
            const content = readFileSync(PENDING_SPAWNS_FILE, 'utf-8');
            return JSON.parse(content);
        }
    } catch (e) {
        // Ignore errors
    }
    return { entries: [] };
}

/**
 * Save pending spawns
 */
function savePendingSpawns(spawns: PendingSpawns): void {
    try {
        ensureDataDir();
        writeFileSync(PENDING_SPAWNS_FILE, JSON.stringify(spawns, null, 2));
    } catch (e) {
        // Ignore errors
    }
}

/**
 * Add a pending spawn entry (called when orchestrator invokes Task)
 */
function addPendingSpawn(parentSessionId: string, agentType: string): void {
    const spawns = loadPendingSpawns();

    // Clean up old entries (> 10 minutes)
    // Matches the detection window in hasPendingSpawnsForSession
    const now = Date.now();
    spawns.entries = spawns.entries.filter(e => {
        const age = now - new Date(e.timestamp).getTime();
        return age < 600000; // Keep entries less than 10 minutes old
    });

    // Add new entry
    spawns.entries.push({
        parent_session_id: parentSessionId,
        agent_type: agentType,
        timestamp: new Date().toISOString()
    });

    savePendingSpawns(spawns);
    log(parentSessionId, 'pending-spawn-added', { agentType });
}

/**
 * Try to match this session to a pending spawn.
 * Returns the parent session ID if matched, null otherwise.
 */
function tryMatchPendingSpawn(sessionId: string): PendingSpawn | null {
    const spawns = loadPendingSpawns();
    const now = Date.now();

    // Find the most recent pending spawn (within 30 seconds)
    for (const entry of spawns.entries.reverse()) {
        const age = now - new Date(entry.timestamp).getTime();
        if (age < 30000) { // Within 30 seconds
            // Remove this entry (consumed)
            spawns.entries = spawns.entries.filter(e => e !== entry);
            savePendingSpawns(spawns);
            return entry;
        }
    }

    return null;
}

/**
 * Register a sub-agent session with its parent
 */
function registerSubagent(sessionId: string, parentSessionId: string, agentType: string): void {
    const stateFile = join(ARKADIAN_DATA_DIR, `${sessionId}_state.txt`);
    const stateContent = `type: subagent
started: ${new Date().toISOString()}
parent_session_id: ${parentSessionId}
agent_type: ${agentType}
`;

    ensureDataDir();
    writeFileSync(stateFile, stateContent);
    log(sessionId, 'registered-subagent', { parentSessionId, agentType });
}

/**
 * Check if there are any pending spawns for this session (as parent).
 * If there are pending spawns, a sub-agent might be active.
 *
 * Uses a 10-minute window to allow for long-running sub-agent tasks.
 */
function hasPendingSpawnsForSession(sessionId: string): boolean {
    const spawns = loadPendingSpawns();
    const now = Date.now();

    // Check if any pending spawn has this session as parent and is recent (within 10 minutes)
    // 10 minutes allows for most sub-agent tasks to complete
    for (const entry of spawns.entries) {
        if (entry.parent_session_id === sessionId) {
            const age = now - new Date(entry.timestamp).getTime();
            if (age < 600000) { // Within 10 minutes
                return true;
            }
        }
    }
    return false;
}

/**
 * Check if the current session is an orchestrator.
 *
 * Detection:
 * 1. If state file exists → check its type
 * 2. IMPORTANT: If type=orchestrator but there are pending spawns, a sub-agent
 *    may be running with the SAME session_id (Claude Code behavior).
 *    In this case, we ALLOW the call since it's likely from the sub-agent.
 * 3. If no state file → try to match pending spawn (sub-agent)
 * 4. If no match → unknown session (allow, might be regular Claude session)
 */
function isOrchestratorCall(sessionId: string): boolean {
    // Check if this session already has a state file
    const state = getSessionState(sessionId);

    if (state) {
        // State file exists - check its type
        if (state.type === 'orchestrator') {
            // CRITICAL FIX: Claude Code sub-agents share the same session_id as parent!
            // If there are pending spawns for this orchestrator, a sub-agent might be active.
            // We must allow these calls through since they're likely from the sub-agent.
            if (hasPendingSpawnsForSession(sessionId)) {
                log(sessionId, 'subagent-same-session', 'Orchestrator session but has pending spawns - allowing (sub-agent active)');
                return false; // Allow - sub-agent is active
            }
            return true;
        } else {
            // It's a registered sub-agent
            return false;
        }
    }

    // No state file - this could be:
    // 1. A new sub-agent (spawned by Task tool)
    // 2. A regular Claude session (not arkadian)

    // Try to match to a pending spawn
    const pendingSpawn = tryMatchPendingSpawn(sessionId);

    if (pendingSpawn) {
        // This is a sub-agent! Register it.
        registerSubagent(sessionId, pendingSpawn.parent_session_id, pendingSpawn.agent_type);
        log(sessionId, 'matched-pending-spawn', pendingSpawn);
        return false; // Sub-agent - no restrictions
    }

    // No state, no pending spawn match
    // This is likely a regular Claude session (not started via arkadian)
    // Or a sub-agent that didn't match timing (edge case)
    // Be permissive: allow it
    log(sessionId, 'unknown-session', 'No state file, no pending spawn match - allowing');
    return false;
}

function expandTilde(filePath: string): string {
    if (filePath.startsWith('~/')) {
        return (process.env.HOME || '') + filePath.slice(1);
    }
    return filePath;
}

/**
 * Resolve a path to absolute, handling tilde, relative paths, and symlinks
 */
function resolveToAbsolute(filePath: string): string {
    if (!filePath) return '';

    let resolved = expandTilde(filePath);

    if (!resolved.startsWith('/')) {
        resolved = resolve(process.cwd(), resolved);
    }

    resolved = resolved.replace(/\/+/g, '/');

    try {
        if (existsSync(resolved)) {
            resolved = realpathSync(resolved);
        }
    } catch (e) {
        // Path doesn't exist - use as-is
    }

    return resolved;
}

/**
 * Check if a path is allowed for orchestrator access.
 */
function isPathAllowed(filePath: string): { allowed: boolean; reason: string } {
    if (!filePath) {
        return { allowed: false, reason: 'Empty path not allowed' };
    }

    const absolutePath = resolveToAbsolute(filePath);
    const arkadianDir = resolveToAbsolute(ARKADIAN_DIR);

    if (absolutePath === arkadianDir || absolutePath.startsWith(arkadianDir + '/')) {
        return { allowed: true, reason: 'Within ARKADIAN_DIR' };
    }

    for (let i = 0; i < BLOCKED_PATHS.length; i++) {
        const repoPath = resolveToAbsolute(BLOCKED_PATHS[i]);
        if (absolutePath === repoPath || absolutePath.startsWith(repoPath + '/')) {
            return {
                allowed: false,
                reason: `Accessing project repository ${REPO_ENV_VARS[i]} - delegate to agent instead`
            };
        }
    }

    return {
        allowed: false,
        reason: `Path outside ARKADIAN_DIR: ${absolutePath}`
    };
}

function getOrchestratorReminder(): string {
    return `
⚠️ ORCHESTRATOR BOUNDARY VIOLATION

You are the **Arkadian Orchestrator**. Your role is to:
- Understand user requests
- Load docs from \${ARKADIAN_DIR}/docs/
- Select relevant projects
- Delegate work to specialist agents via Task tool
- Update docs and create artifacts within ARKADIAN_DIR

**You CAN (within ARKADIAN_DIR only):**
- Read/Write/Edit files in \${ARKADIAN_DIR}/docs/
- Read/Write/Edit files in \${ARKADIAN_DIR}/sessions/
- Read/Write/Edit files in \${ARKADIAN_DIR}/templates/

**You NEVER:**
- Access project repositories directly (${REPO_ENV_VARS.join(', ')})
- Run bash commands
- Implement code solutions yourself

**To answer questions about code:**
1. Select the relevant project(s)
2. Build an Execution Specification
3. Delegate to the appropriate agent (ark-guru for Q&A, ark-developer for code)

📄 Review your instructions: \${ARKADIAN_DIR}/ORCHESTRATOR.md
`;
}

async function main() {
    try {
        ensureDataDir();

        // Skip guardrails if not in orchestrator mode
        if (!ORCHESTRATOR_MODE) {
            process.exit(0);
        }

        const input = await Bun.stdin.text();
        const hookInput: HookInput = JSON.parse(input);

        const sessionId = hookInput.session_id;
        const toolName = hookInput.tool_name;
        const toolInput = hookInput.tool_input || {};

        log(sessionId, 'hook-invoked', { tool: toolName, ORCHESTRATOR_MODE });

        // Check if this is the orchestrator or a sub-agent
        const isOrchestrator = isOrchestratorCall(sessionId);

        log(sessionId, 'session-check', { isOrchestrator });

        if (!isOrchestrator) {
            log(sessionId, 'allowing-subagent', { tool: toolName });
            process.exit(0); // Allow sub-agents full access
        }

        log(sessionId, 'enforcing-restrictions', { tool: toolName, input: toolInput });

        // Check if tool is explicitly blocked
        if (BLOCKED_TOOLS.includes(toolName)) {
            const errorMessage = `
❌ BLOCKED: Orchestrator cannot use "${toolName}"
${getOrchestratorReminder()}
`;
            console.error(errorMessage);
            process.exit(2);
        }

        // Check if tool is allowed
        if (!ALLOWED_TOOLS.includes(toolName)) {
            log(sessionId, 'unknown-tool-allowing', toolName);
            process.exit(0);
        }

        // For path-restricted tools - check path restrictions
        if (PATH_RESTRICTED_TOOLS.includes(toolName)) {
            const filePath = toolInput.file_path || toolInput.path || '';
            const pathCheck = isPathAllowed(filePath);

            log(sessionId, 'path-check', { tool: toolName, path: filePath, result: pathCheck });

            if (!pathCheck.allowed) {
                const resolvedPath = resolveToAbsolute(filePath);
                const errorMessage = `
❌ BLOCKED: ${pathCheck.reason}

Attempted path: ${filePath}
Resolved to: ${resolvedPath}
Tool: ${toolName}

Orchestrator can ONLY access files within ARKADIAN_DIR:
- ${ARKADIAN_DIR}/docs/
- ${ARKADIAN_DIR}/sessions/
- ${ARKADIAN_DIR}/templates/
- ${ARKADIAN_DIR}/ORCHESTRATOR.md

${getOrchestratorReminder()}

**Instead, delegate to an agent:**
- ark-guru for questions about how code works
- ark-developer for code analysis or changes
- ark-env-tester for testing questions
`;
                console.error(errorMessage);
                process.exit(2);
            }
        }

        // Task tool - validate sub-agent type and add pending spawn
        if (toolName === 'Task') {
            const subagentType = toolInput.subagent_type || '';

            // Check if using a blocked default agent
            if (BLOCKED_SUBAGENT_TYPES.includes(subagentType)) {
                const errorMessage = `
❌ BLOCKED: Cannot use default Claude agent "${subagentType}"

Orchestrator must use Arkadian specialist agents instead:
- ark-guru: For Q&A, explanations, code understanding
- ark-developer: For code changes, implementation
- ark-env-tester: For testing, QA
- ark-project-manager: For specs, planning, task breakdown
- ark-pr-reviewer: For PR analysis, code review
- ark-observer: For telemetry, debugging
- ark-researcher: For Bitcoin/L2 research
- ark-progress-tracker: For progress reports

${getOrchestratorReminder()}
`;
                console.error(errorMessage);
                process.exit(2);
            }

            // Check if using an allowed agent type
            if (!ALLOWED_SUBAGENT_TYPES.includes(subagentType)) {
                const errorMessage = `
❌ BLOCKED: Unknown sub-agent type "${subagentType}"

Allowed sub-agent types:
${ALLOWED_SUBAGENT_TYPES.map(t => `- ${t}`).join('\n')}

${getOrchestratorReminder()}
`;
                console.error(errorMessage);
                process.exit(2);
            }

            // Valid agent type - add pending spawn for sub-agent detection
            log(sessionId, 'task-agent-validated', { subagentType });
            addPendingSpawn(sessionId, subagentType);
        }

        log(sessionId, 'allowed', { tool: toolName });
        process.exit(0);

    } catch (error: any) {
        // Try to log the error
        try {
            const input = await Bun.stdin.text();
            const hookInput = JSON.parse(input);
            log(hookInput.session_id, 'error', { message: error.message, stack: error.stack });
        } catch (e) {
            // Ignore
        }
        // Don't block on hook errors
        process.exit(0);
    }
}

main();
