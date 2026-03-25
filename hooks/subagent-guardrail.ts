#!/usr/bin/env bun

/**
 * Arkadian Sub-Agent Guardrail Hook
 *
 * PreToolUse hook that enforces restrictions for sub-agent tool calls.
 * This hook is invoked when active_agent is set in session state.
 *
 * WORKTREE ENFORCEMENT (Critical for ark-developer):
 * - READ operations: Allowed from main repo (agents need to read code)
 * - WRITE operations: Blocked on main repo when worktree mode enabled
 * - The agent MUST create worktree first, then write to worktree path
 *
 * Enforcement:
 * 1. Tool restrictions - agents can only use tools in their allowed_tools list
 * 2. Path restrictions - READ allowed from allowed_paths, WRITE only to non-blocked
 * 3. Blocked paths - WRITE operations blocked, READ operations allowed
 *
 * State Interaction:
 * - Reads: {DATA_DIR}/{session_id}_state.json → active_agent
 * - Uses: allowed_tools, allowed_paths, blocked_paths from active_agent
 *
 * Exit codes:
 * - 0: Allow tool call
 * - 2: Block tool call with error message
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync } from 'fs';
import { join, resolve } from 'path';

const ARKADIAN_DIR = process.env.ARKADIAN_DIR || process.env.HOME + '/code/go/arkadian';

// Use ARKADIAN_DATA_DIR for runtime state (OS-specific data directory)
const ARKADIAN_DATA_DIR = process.env.ARKADIAN_DATA_DIR || join(ARKADIAN_DIR, 'log');

// Only enforce in orchestrator mode
const ORCHESTRATOR_MODE = process.env.ARKADIAN_ORCHESTRATOR_MODE === '1';

interface HookInput {
    session_id: string;
    tool_name: string;
    tool_input: Record<string, any>;
    hook_event_name: string;
}

interface ActiveAgent {
    agent_type: string;
    spec_id: string;
    invoked_at: string;
    expected_artifacts: string[];
    allowed_tools: string[];
    allowed_paths: string[];
    blocked_paths: string[];  // For worktree mode: main repo paths that are READ-OK but WRITE-blocked
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

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
    if (!existsSync(ARKADIAN_DATA_DIR)) {
        mkdirSync(ARKADIAN_DATA_DIR, { recursive: true });
    }
}

/**
 * Log to per-session log file
 */
function log(sessionId: string, label: string, data: any) {
    const timestamp = new Date().toISOString();
    const logFile = join(ARKADIAN_DATA_DIR, `${sessionId}_log.txt`);

    let output = `[${timestamp}] [subagent-guardrail] ${label}: `;
    if (typeof data === 'object') {
        output += JSON.stringify(data);
    } else {
        output += data;
    }
    output += '\n';

    try {
        ensureDataDir();
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
 * Expand tilde in path
 */
function expandTilde(filePath: string): string {
    if (filePath.startsWith('~/')) {
        return (process.env.HOME || '') + filePath.slice(1);
    }
    return filePath;
}

/**
 * Expand environment variables in a string
 * Handles ${VAR} and $VAR formats
 */
function expandEnvVars(str: string): string {
    if (!str) return str;

    // Replace ${VAR} format
    let result = str.replace(/\$\{(\w+)\}/g, (_, varName) => {
        return process.env[varName] || '';
    });

    // Replace $VAR format (word boundary)
    result = result.replace(/\$(\w+)/g, (match, varName) => {
        // Don't replace if it looks like it was already replaced or is escaped
        return process.env[varName] || match;
    });

    return result;
}

/**
 * Resolve a path to absolute, handling tilde, env vars, relative paths, and symlinks
 */
function resolveToAbsolute(filePath: string): string {
    if (!filePath) return '';

    // First expand env vars
    let resolved = expandEnvVars(filePath);

    // Then expand tilde
    resolved = expandTilde(resolved);

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
 * Check if a path is within any of the allowed paths
 */
function isPathInAllowedList(filePath: string, allowedPaths: string[]): boolean {
    const absolutePath = resolveToAbsolute(filePath);

    for (const allowed of allowedPaths) {
        const resolvedAllowed = resolveToAbsolute(allowed);
        if (absolutePath === resolvedAllowed || absolutePath.startsWith(resolvedAllowed + '/')) {
            return true;
        }
    }

    return false;
}

/**
 * Check if a path is in the blocked list
 */
function isPathBlocked(filePath: string, blockedPaths: string[]): boolean {
    if (blockedPaths.length === 0) return false;

    const absolutePath = resolveToAbsolute(filePath);

    for (const blocked of blockedPaths) {
        const resolvedBlocked = resolveToAbsolute(blocked);
        if (absolutePath === resolvedBlocked || absolutePath.startsWith(resolvedBlocked + '/')) {
            return true;
        }
    }

    return false;
}

/**
 * System paths that are always allowed for safe operations
 */
const ALWAYS_ALLOWED_PATHS = [
    '/dev/null',
    '/dev/stdout',
    '/dev/stderr',
    '/tmp',
    '/var/tmp',
];

/**
 * Infrastructure paths that NO sub-agent can ever WRITE to.
 * These protect the orchestrator's own hooks, agents, scripts, and runtime state.
 * READ access remains allowed (agents legitimately read docs and reference files).
 */
const INFRASTRUCTURE_WRITE_BLOCKED_PATHS = [
    join(ARKADIAN_DIR, 'hooks'),
    join(ARKADIAN_DIR, 'scripts'),
    join(ARKADIAN_DIR, 'agents'),
    join(ARKADIAN_DIR, 'skills'),
    join(ARKADIAN_DIR, 'commands'),
    join(ARKADIAN_DIR, 'templates'),
    join(ARKADIAN_DIR, 'ORCHESTRATOR.md'),
    join(ARKADIAN_DIR, '.claude'),
    ARKADIAN_DATA_DIR,
];

/**
 * Check if a write to this path should be blocked by infrastructure protection.
 * Returns true if the path is within any INFRASTRUCTURE_WRITE_BLOCKED_PATHS.
 */
function isInfrastructureWriteBlocked(filePath: string): boolean {
    const absolutePath = resolveToAbsolute(filePath);
    for (const infraPath of INFRASTRUCTURE_WRITE_BLOCKED_PATHS) {
        const resolved = resolveToAbsolute(infraPath);
        if (absolutePath === resolved || absolutePath.startsWith(resolved + '/')) {
            return true;
        }
    }
    return false;
}

/**
 * Check if a path is in the always-allowed system paths
 */
function isSystemSafePath(filePath: string): boolean {
    const absolutePath = resolveToAbsolute(filePath);

    for (const safePath of ALWAYS_ALLOWED_PATHS) {
        if (absolutePath === safePath || absolutePath.startsWith(safePath + '/')) {
            return true;
        }
    }

    return false;
}

/**
 * READ-ONLY tools - these can access blocked paths (main repo) for reading
 */
const READ_ONLY_TOOLS = ['Read', 'Glob', 'Grep'];

/**
 * WRITE tools - these are blocked from writing to blocked_paths (main repo in worktree mode)
 */
const WRITE_TOOLS = ['Write', 'Edit', 'MultiEdit'];

/**
 * Tools that have path parameters to check
 */
const PATH_TOOLS: Record<string, string[]> = {
    'Read': ['file_path'],
    'Write': ['file_path'],
    'Edit': ['file_path'],
    'MultiEdit': ['file_path'],
    'Glob': ['path'],
    'Grep': ['path'],
    'Bash': ['command']
};

/**
 * Extract paths from Bash command with env var expansion
 */
function extractPathsFromBashCommand(command: string): { path: string; isWrite: boolean }[] {
    const results: { path: string; isWrite: boolean }[] = [];

    // First expand env vars in the command
    const expandedCommand = expandEnvVars(command);

    // Safe commands that are read-equivalent even when run from main repo
    // These produce build artifacts / test output but don't modify source files
    const safeCommandPatterns = [
        /\bmake\s+(test|build|proto|sqlc|lint|vet|check|fmt|generate|integrationtest|build-test-env|setup-test-env|up-test-env|down-test-env)\b/,
        /\bgo\s+(test|build|vet|generate|mod)\b/,
        /\bnpm\s+(test|run\s+test|run\s+build|run\s+lint)\b/,
        /\bbun\s+(test|build)\b/,
        /\bcargo\s+(test|build|check|clippy)\b/,
        /\bdocker\s+compose\b/,
        /\bsqlc\s+generate\b/,
        /\bbuf\s+generate\b/,
        /\bprotoc\b/,
    ];

    const isSafeCommand = safeCommandPatterns.some(pattern => pattern.test(expandedCommand));

    // Write-indicating commands/patterns
    const writePatterns = [
        /\b(echo|printf|cat)\s+.*[^&]>\s*/,  // Redirections (but not 2>&1)
        /[^2&]>\s*[^\s&]/,                    // Output redirection to file (not 2>&1 or &>)
        /\btee\s+[^\s|]/,                     // tee to a file (not tee piped)
        /\bmv\b/,                              // move
        /\bcp\b/,                              // copy (creates files)
        /\brm\b/,                              // remove
        /\bmkdir\b/,                           // make directory
        /\btouch\b/,                           // touch
        /\bchmod\b/,                           // chmod
        /\bchown\b/,                           // chown
        /\bgit\s+(add|commit|push|checkout|branch|worktree)/,  // git write operations
    ];

    const isWriteCommand = !isSafeCommand && writePatterns.some(pattern => pattern.test(expandedCommand));

    // Match absolute paths in expanded command
    const absolutePathRegex = /(?:^|\s)(\/[^\s;|&<>'"]+)/g;
    let match;
    while ((match = absolutePathRegex.exec(expandedCommand)) !== null) {
        results.push({ path: match[1], isWrite: isWriteCommand });
    }

    // Match tilde paths
    const tildePathRegex = /(?:^|\s)(~\/[^\s;|&<>'"]+)/g;
    while ((match = tildePathRegex.exec(expandedCommand)) !== null) {
        results.push({ path: match[1], isWrite: isWriteCommand });
    }

    // Also extract from original command (before expansion) for logging
    const origAbsoluteRegex = /(?:^|\s)(\/[^\s;|&<>'"]+)/g;
    while ((match = origAbsoluteRegex.exec(command)) !== null) {
        if (!results.some(r => r.path === match[1])) {
            results.push({ path: match[1], isWrite: isWriteCommand });
        }
    }

    return results;
}

/**
 * Check if a path is within a worktree (inside .worktrees/ directory)
 */
function isWorktreePath(filePath: string): boolean {
    const absolutePath = resolveToAbsolute(filePath);
    return absolutePath.includes('/.worktrees/');
}

/**
 * Validate sub-agent tool call against restrictions
 *
 * WORKTREE ENFORCEMENT LOGIC:
 * - blocked_paths contains main repo paths (when worktree mode enabled)
 * - READ operations (Read, Glob, Grep) are ALLOWED from blocked_paths
 * - WRITE operations (Write, Edit, MultiEdit) are BLOCKED to blocked_paths
 * - Bash commands are analyzed for write patterns
 */
function validateSubagentCall(
    sessionId: string,
    toolName: string,
    toolInput: Record<string, any>,
    activeAgent: ActiveAgent
): { allowed: boolean; reason: string } {
    // Check tool restrictions
    if (!activeAgent.allowed_tools.includes(toolName)) {
        return {
            allowed: false,
            reason: `Tool "${toolName}" not allowed for ${activeAgent.agent_type}. Allowed: ${activeAgent.allowed_tools.join(', ')}`
        };
    }

    const isReadOnlyTool = READ_ONLY_TOOLS.includes(toolName);
    const isWriteTool = WRITE_TOOLS.includes(toolName);

    // For Bash, we need special handling
    if (toolName === 'Bash') {
        const command = toolInput.command || '';

        // ABSOLUTE BLOCK: git push, git tag, gh mutations — regardless of agent or path
        const absolutelyBlockedPatterns: Array<{ pattern: RegExp; label: string }> = [
            { pattern: /\bgit\s+push\b/, label: 'git push' },
            { pattern: /\bgit\s+tag\b/, label: 'git tag' },
            { pattern: /\bgh\s+pr\s+(create|merge|close|edit|comment|review)\b/, label: 'gh pr mutation' },
            { pattern: /\bgh\s+issue\s+(create|close|edit|comment)\b/, label: 'gh issue mutation' },
        ];

        // git commit is blocked for all agents EXCEPT ark-developer
        if (activeAgent.agent_type !== 'ark-developer') {
            absolutelyBlockedPatterns.push({ pattern: /\bgit\s+commit\b/, label: 'git commit' });
        }

        const expandedForCheck = expandEnvVars(command);
        for (const { pattern, label } of absolutelyBlockedPatterns) {
            if (pattern.test(expandedForCheck)) {
                return {
                    allowed: false,
                    reason: `BLOCKED: "${label}" is never allowed for sub-agents. ` +
                        `Leave changes uncommitted — the user reviews and decides whether to commit/push.`
                };
            }
        }

        const pathResults = extractPathsFromBashCommand(command);

        log(sessionId, 'bash-paths-extracted', { command: command.substring(0, 100), paths: pathResults });

        for (const { path, isWrite } of pathResults) {
            if (isSystemSafePath(path)) continue;

            const absolutePath = resolveToAbsolute(path);

            // Infrastructure protection: block writes to hooks, scripts, agents, etc.
            if (isWrite && isInfrastructureWriteBlocked(path)) {
                return {
                    allowed: false,
                    reason: `INFRASTRUCTURE PROTECTION: Cannot write to "${path}". ` +
                        `This path is part of the Arkadian orchestrator infrastructure (hooks, scripts, agents, templates, or runtime state). ` +
                        `Sub-agents must never modify orchestrator infrastructure. ` +
                        `If you encountered an error with hooks, write your _result.json with status: "partial" and describe the issue.`
                };
            }

            // Check if path is in blocked_paths (main repo in worktree mode)
            if (isPathBlocked(path, activeAgent.blocked_paths)) {
                if (isWrite) {
                    // Check if it's actually going to a worktree
                    if (isWorktreePath(absolutePath)) {
                        log(sessionId, 'worktree-write-allowed', { path: absolutePath });
                        continue;  // Allow writes to worktree
                    }

                    return {
                        allowed: false,
                        reason: `WORKTREE ENFORCEMENT: Cannot write to main repo path "${path}". ` +
                            `You must create a worktree first using 'git worktree add' and write to the worktree path instead. ` +
                            `Worktrees should be at: ${activeAgent.blocked_paths[0]}/.worktrees/<branch>`
                    };
                }
                // Read operations from blocked paths are OK
                log(sessionId, 'read-from-blocked-allowed', { path, tool: toolName });
            }
        }

        return { allowed: true, reason: 'Bash command passed checks' };
    }

    // For path-based tools
    if (PATH_TOOLS[toolName]) {
        const pathFields = PATH_TOOLS[toolName] || [];
        for (const field of pathFields) {
            const path = toolInput[field];
            if (!path) continue;

            if (isSystemSafePath(path)) continue;

            const absolutePath = resolveToAbsolute(path);

            // Infrastructure protection: block writes to hooks, scripts, agents, etc.
            if (isWriteTool && isInfrastructureWriteBlocked(path)) {
                return {
                    allowed: false,
                    reason: `INFRASTRUCTURE PROTECTION: Cannot ${toolName} to "${path}". ` +
                        `This path is part of the Arkadian orchestrator infrastructure (hooks, scripts, agents, templates, or runtime state). ` +
                        `Sub-agents must never modify orchestrator infrastructure. ` +
                        `If you encountered an error with hooks, write your _result.json with status: "partial" and describe the issue.`
                };
            }

            // Check blocked paths (main repo in worktree mode)
            if (isPathBlocked(path, activeAgent.blocked_paths)) {
                if (isWriteTool) {
                    // Check if it's a worktree path (should be allowed)
                    if (isWorktreePath(absolutePath)) {
                        log(sessionId, 'worktree-write-allowed', { path: absolutePath, tool: toolName });
                        continue;
                    }

                    return {
                        allowed: false,
                        reason: `WORKTREE ENFORCEMENT: Cannot ${toolName} to main repo path "${path}". ` +
                            `Create a worktree first with 'git worktree add', then use the worktree path. ` +
                            `Expected worktree location: ${activeAgent.blocked_paths[0]}/.worktrees/<branch>`
                    };
                }
                // Read operations from blocked paths are OK
                log(sessionId, 'read-from-blocked-allowed', { path, tool: toolName });
                continue;
            }

            // Check allowed paths (if list is not empty)
            if (activeAgent.allowed_paths.length > 0) {
                if (!isPathInAllowedList(path, activeAgent.allowed_paths)) {
                    // For read operations, also allow from blocked_paths (they're read-ok)
                    if (isReadOnlyTool && isPathBlocked(path, activeAgent.blocked_paths)) {
                        continue;  // Read from main repo is OK
                    }
                    return {
                        allowed: false,
                        reason: `Path "${path}" not in allowed paths for ${activeAgent.agent_type}. Allowed: ${activeAgent.allowed_paths.join(', ')}`
                    };
                }
            }
        }
    }

    return { allowed: true, reason: 'Passed all checks' };
}

async function main() {
    try {
        const input = await Bun.stdin.text();
        const hookInput: HookInput = JSON.parse(input);

        log(hookInput.session_id, 'subagent-guardrail input:', hookInput);

        // Skip if not in orchestrator mode
        if (!ORCHESTRATOR_MODE) {
            log(hookInput.session_id, 'skipping', 'Not in orchestrator mode');
            process.exit(0);
        }

        // Get session state
        const state = getSessionState(hookInput.session_id);
        if (!state) {
            log(hookInput.session_id, 'no-state', 'No session state file found');
            process.exit(0);
        }

        // Check if there's an active agent
        if (!state.active_agent) {
            log(hookInput.session_id, 'no-active-agent', 'No active agent - not a sub-agent call');
            process.exit(0);
        }

        const activeAgent = state.active_agent;

        // Staleness check: if active_agent was set more than 60 minutes ago,
        // it's likely stale from a crashed/interrupted agent. Allow the call
        // rather than enforcing stale restrictions from a different phase.
        if (activeAgent.invoked_at) {
            const invokedAt = new Date(activeAgent.invoked_at).getTime();
            const now = Date.now();
            const ageMinutes = (now - invokedAt) / (1000 * 60);
            if (ageMinutes > 60) {
                log(hookInput.session_id, 'stale-active-agent', {
                    agent: activeAgent.agent_type,
                    spec_id: activeAgent.spec_id,
                    invoked_at: activeAgent.invoked_at,
                    age_minutes: Math.round(ageMinutes),
                    action: 'Allowing call — active_agent is stale (>60 min old)'
                });
                process.exit(0);
            }
        }

        log(hookInput.session_id, 'validating-subagent', {
            agent: activeAgent.agent_type,
            spec_id: activeAgent.spec_id,
            tool: hookInput.tool_name,
            blocked_paths: activeAgent.blocked_paths,
            allowed_paths: activeAgent.allowed_paths
        });

        // Special case: Task/Agent tool invocations need special handling
        // (Claude Code renamed Task → Agent in newer versions)
        if (hookInput.tool_name === 'Task' || hookInput.tool_name === 'Agent') {
            const prompt = hookInput.tool_input.prompt || '';
            const stepIdMatch = prompt.match(/step_id:\s*["']?(\S+)["']?/);
            const newStepId = stepIdMatch ? stepIdMatch[1] : null;

            if (newStepId) {
                if (newStepId !== activeAgent.spec_id) {
                    log(hookInput.session_id, 'orchestrator-new-agent-invocation', {
                        current_active: activeAgent.spec_id,
                        new_step: newStepId,
                        action: 'allowing orchestrator to invoke new agent'
                    });
                    process.exit(0);
                }

                if (newStepId === activeAgent.spec_id) {
                    const errorMessage = `
❌ SUB-AGENT SELF-INVOCATION BLOCKED

Agent: ${activeAgent.agent_type}
Spec: ${activeAgent.spec_id}

An agent cannot invoke itself with the same spec_id.
This would create an infinite loop.

If you need to spawn a sub-task, use a different step_id.
`;
                    console.error(errorMessage);
                    log(hookInput.session_id, 'blocked-self-invocation', {
                        agent: activeAgent.agent_type,
                        spec_id: activeAgent.spec_id
                    });
                    process.exit(2);
                }
            }
        }

        // Validate the tool call
        const result = validateSubagentCall(hookInput.session_id, hookInput.tool_name, hookInput.tool_input, activeAgent);

        log(hookInput.session_id, 'validation-result', result);

        if (!result.allowed) {
            const errorMessage = `
❌ SUB-AGENT TOOL RESTRICTION

Agent: ${activeAgent.agent_type}
Spec: ${activeAgent.spec_id}
Tool: ${hookInput.tool_name}

${result.reason}

This sub-agent is operating under restricted permissions set by the orchestrator.
`;
            console.error(errorMessage);
            process.exit(2);
        }

        log(hookInput.session_id, 'subagent-allowed', { tool: hookInput.tool_name });
        process.exit(0);
    } catch (error: any) {
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
