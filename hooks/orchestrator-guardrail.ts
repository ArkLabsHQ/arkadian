#!/usr/bin/env bun

/**
 * Orchestrator Guardrail Hook
 *
 * PreToolUse hook that enforces orchestrator boundaries using per-session state files.
 *
 * Detection Strategy:
 * - Orchestrator sessions have {session_id}_state.json created by SessionStart
 * - Sub-agents are detected via active_agent field in state file
 * - Sub-agents share same session_id as parent (Claude Code behavior)
 *
 * State Files:
 * - {DATA_DIR}/{session_id}_state.json - Session state (type, workflow, active_agent, etc.)
 * - {DATA_DIR}/{session_id}_log.txt - Per-session log file
 *
 * Rules:
 * 1. Orchestrator can use: Task, Read, Write, Edit (ONLY within ARKADIAN_DIR)
 * 2. ALL paths outside ARKADIAN_DIR are blocked for orchestrator
 * 3. Sub-agents: Delegate to subagent-guardrail.ts for per-agent rules
 * 4. Blocks Bash commands for orchestrator
 *
 * Exit codes:
 * - 0: Allow tool call
 * - 2: Block tool call with error message
 */

import { appendFileSync, readFileSync, existsSync, realpathSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { getOrchestratorReminder } from './orchestrator-reminder';

// Only enforce guardrails in orchestrator mode
const ORCHESTRATOR_MODE = process.env.ARKADIAN_ORCHESTRATOR_MODE === '1';

const ARKADIAN_DIR = process.env.ARKADIAN_DIR || process.env.HOME + '/code/go/arkadian';

// Use ARKADIAN_DATA_DIR for runtime state (OS-specific data directory)
const ARKADIAN_DATA_DIR = process.env.ARKADIAN_DATA_DIR || join(ARKADIAN_DIR, 'log');

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
    'ark-scout',             // Gather relevant context from prev sessions
    'ark-guru',              // Q&A, explanations
    'ark-developer',         // Code changes, implementation

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
    session_id: string;
    type: 'orchestrator';
    started_at: string;
    pid: number;
    workflow: {
        id: string | null;
        status: string;
        current_phase: string | null;
        file: string;
        file_created: boolean;
        plan_approved: boolean;
        plan_approved_at: string | null;
    };
    phases: Record<string, any>;
    active_agent: ActiveAgent | null;
    approvals: Record<string, any>;
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
        const logFile = join(ARKADIAN_DATA_DIR, `${sessionId}_log.txt`);
        appendFileSync(logFile, output);
    } catch (e) {
        // Ignore logging errors
    }
}

/**
 * Get session state from JSON state file
 */
function getSessionState(sessionId: string): SessionState | null {
    const stateFile = join(ARKADIAN_DATA_DIR, `${sessionId}_state.json`);

    if (!existsSync(stateFile)) {
        return null;
    }

    try {
        const content = readFileSync(stateFile, 'utf-8');
        return JSON.parse(content);
    } catch (e) {
        return null;
    }
}

/**
 * Check if the current session is an orchestrator making a direct call.
 *
 * Detection:
 * 1. If state file exists and type=orchestrator
 * 2. If active_agent is set, this call is from a sub-agent (allow)
 * 3. If active_agent is null, this call is from orchestrator (restrict)
 */
function isOrchestratorCall(sessionId: string): { isOrchestrator: boolean; activeAgent: ActiveAgent | null } {
    const state = getSessionState(sessionId);

    if (!state) {
        // No state file - unknown session, allow
        log(sessionId, 'unknown-session', 'No state file found - allowing');
        return { isOrchestrator: false, activeAgent: null };
    }

    if (state.type !== 'orchestrator') {
        // Not an orchestrator session
        return { isOrchestrator: false, activeAgent: null };
    }

    // It's an orchestrator session
    if (state.active_agent) {
        // Sub-agent is active - this call is from sub-agent
        log(sessionId, 'subagent-active', { agent: state.active_agent.agent_type, spec: state.active_agent.spec_id });
        return { isOrchestrator: false, activeAgent: state.active_agent };
    }

    // No active agent - this is orchestrator's own call
    return { isOrchestrator: true, activeAgent: null };
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

// getOrchestratorReminder is now imported from ./orchestrator-reminder

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
        const { isOrchestrator, activeAgent } = isOrchestratorCall(sessionId);

        log(sessionId, 'session-check', { isOrchestrator, hasActiveAgent: !!activeAgent });

        if (!isOrchestrator) {
            // Sub-agent call - delegate to subagent-guardrail.ts
            // For now, just allow (subagent-guardrail.ts will handle restrictions)
            log(sessionId, 'allowing-subagent', { tool: toolName, agent: activeAgent?.agent_type });
            process.exit(0);
        }

        log(sessionId, 'enforcing-orchestrator-restrictions', { tool: toolName });

        // Check if tool is explicitly blocked
        if (BLOCKED_TOOLS.includes(toolName)) {
            log(sessionId, 'blocked-tool', toolName);
            console.error(getOrchestratorReminder());
            process.exit(2);
        }

        // Check if tool is allowed - BLOCK unknown tools (fail-closed)
        if (!ALLOWED_TOOLS.includes(toolName)) {
            log(sessionId, 'blocked-unknown-tool', toolName);
            console.error(getOrchestratorReminder());
            process.exit(2);
        }

        // For path-restricted tools - check path restrictions
        if (PATH_RESTRICTED_TOOLS.includes(toolName)) {
            const filePath = toolInput.file_path || toolInput.path || '';
            const pathCheck = isPathAllowed(filePath);

            log(sessionId, 'path-check', { tool: toolName, path: filePath, result: pathCheck });

            if (!pathCheck.allowed) {
                log(sessionId, 'blocked-path', { tool: toolName, path: filePath, reason: pathCheck.reason });
                console.error(getOrchestratorReminder());
                process.exit(2);
            }
        }

        // Task tool - validate sub-agent type
        if (toolName === 'Task') {
            const subagentType = toolInput.subagent_type || '';

            // Check if using a blocked default agent
            if (BLOCKED_SUBAGENT_TYPES.includes(subagentType)) {
                log(sessionId, 'blocked-default-agent', subagentType);
                console.error(getOrchestratorReminder());
                process.exit(2);
            }

            // Check if using an allowed agent type
            if (!ALLOWED_SUBAGENT_TYPES.includes(subagentType)) {
                log(sessionId, 'blocked-unknown-agent', subagentType);
                console.error(getOrchestratorReminder());
                process.exit(2);
            }

            log(sessionId, 'task-agent-validated', { subagentType });
            // Note: active_agent will be set by pre-agent-validator.ts
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
