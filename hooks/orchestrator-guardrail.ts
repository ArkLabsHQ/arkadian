#!/usr/bin/env bun

/**
 * Orchestrator Guardrail Hook
 *
 * PreToolUse hook that enforces orchestrator boundaries using DEFAULT DENY:
 * 1. Orchestrator can use: Task, Read, Write, Edit (ONLY within ARKADIAN_DIR)
 * 2. ALL paths outside ARKADIAN_DIR are blocked - no exceptions
 * 3. Relative paths are resolved to absolute before checking
 * 4. Blocks Bash commands - orchestrator doesn't run code
 *
 * PATH RESOLUTION:
 * - Tilde paths (~/...) are expanded to $HOME
 * - Relative paths (pkg/..., ./...) are resolved against CWD
 * - Symlinks are resolved to real paths
 * - This prevents bypassing via relative or symlinked paths
 *
 * ARKADIAN_DIR PRIVILEGES (the ONLY allowed locations):
 * - ${ARKADIAN_DIR}/docs/ (project documentation)
 * - ${ARKADIAN_DIR}/sessions/ (session artifacts)
 * - ${ARKADIAN_DIR}/templates/ (workflow templates)
 * - ${ARKADIAN_DIR}/ORCHESTRATOR.md (instructions)
 *
 * IMPORTANT: Only active when ARKADIAN_ORCHESTRATOR_MODE=1
 * This is set by the `arkadian` launcher script.
 * Regular `claude` sessions are not affected.
 *
 * SUB-AGENT HANDLING:
 * Sub-agents spawned via Task tool inherit env vars but have different session IDs.
 * We track the orchestrator's session ID in a file and only enforce guardrails
 * for that specific session. Sub-agents are free to use any tools.
 *
 * Exit codes:
 * - 0: Allow tool call
 * - 2: Block tool call with error message
 */

import { appendFileSync, readFileSync, existsSync, realpathSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

// Only enforce guardrails in orchestrator mode
const ORCHESTRATOR_MODE = process.env.ARKADIAN_ORCHESTRATOR_MODE === '1';

const ARKADIAN_DIR = process.env.ARKADIAN_DIR || process.env.HOME + '/code/go/arkadian';

// Use ARKADIAN_DATA_DIR for runtime state (OS-specific data directory)
// macOS: ~/Library/Application Support/Arkadian
// Linux: ~/.arkadian
// Falls back to ARKADIAN_DIR/log for backward compatibility
const ARKADIAN_DATA_DIR = process.env.ARKADIAN_DATA_DIR || join(ARKADIAN_DIR, 'log');

const LOG_FILE = join(ARKADIAN_DATA_DIR, 'orchestrator-guardrail.txt');
const ORCHESTRATOR_SESSION_FILE = join(ARKADIAN_DATA_DIR, 'orchestrator-session.txt');
const TASK_DEPTH_FILE = join(ARKADIAN_DATA_DIR, 'task-depth.txt');

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
// Orchestrator MUST use Arkadian agents, not default Claude agents
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
// These bypass Arkadian workflow and should not be used
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

/**
 * Get the current task depth (how many Task calls deep we are).
 * depth=0 means we're at the orchestrator level.
 * depth>=1 means we're inside a sub-agent.
 */
function getTaskDepth(): number {
    try {
        if (existsSync(TASK_DEPTH_FILE)) {
            const content = readFileSync(TASK_DEPTH_FILE, 'utf-8').trim();
            const depth = parseInt(content, 10);
            return isNaN(depth) ? 0 : depth;
        }
    } catch (e) {
        // Ignore
    }
    return 0;
}

/**
 * Increment task depth when orchestrator calls Task.
 */
function incrementTaskDepth(): void {
    const current = getTaskDepth();
    writeFileSync(TASK_DEPTH_FILE, String(current + 1));
    log('Task depth incremented', { from: current, to: current + 1 });
}

/**
 * Check if the current invocation is from the orchestrator (vs a sub-agent).
 *
 * Detection strategy:
 * We use a "task depth" counter:
 * - depth=0: We're at the orchestrator level → enforce restrictions
 * - depth>=1: We're inside a Task call (sub-agent) → allow everything
 *
 * The depth is incremented when the orchestrator calls Task,
 * and sub-agents inherit this incremented depth.
 *
 * NOTE: We don't decrement because sub-agents run in parallel and
 * we can't reliably track when they complete. Instead, the session-start
 * hook resets depth to 0 at the beginning of each orchestrator session.
 */
function isOrchestratorCall(): boolean {
    const depth = getTaskDepth();

    if (depth > 0) {
        log('Sub-agent detected', `Task depth = ${depth}`);
        return false;
    }

    // depth=0 means we're at orchestrator level
    return true;
}

function log(label: string, data: any) {
    const timestamp = new Date().toISOString();
    let output = `\n[${timestamp}] [orchestrator-guardrail] ${label}:\n`;

    if (typeof data === 'object') {
        output += JSON.stringify(data, null, 2);
    } else {
        output += data;
    }
    output += '\n';

    try {
        appendFileSync(LOG_FILE, output);
    } catch (e) {
        // Ignore logging errors
    }
}

function expandTilde(filePath: string): string {
    if (filePath.startsWith('~/')) {
        return (process.env.HOME || '') + filePath.slice(1);
    }
    return filePath;
}

/**
 * Resolve a path to absolute, handling:
 * - Tilde expansion (~/)
 * - Relative paths (resolved against CWD)
 * - Symlinks (resolved to real path)
 */
function resolveToAbsolute(filePath: string): string {
    if (!filePath) return '';

    // Step 1: Expand tilde
    let resolved = expandTilde(filePath);

    // Step 2: If not absolute, resolve against CWD
    if (!resolved.startsWith('/')) {
        resolved = resolve(process.cwd(), resolved);
    }

    // Step 3: Normalize multiple slashes
    resolved = resolved.replace(/\/+/g, '/');

    // Step 4: Try to resolve symlinks (but don't fail if path doesn't exist yet)
    try {
        if (existsSync(resolved)) {
            resolved = realpathSync(resolved);
        }
    } catch (e) {
        // Path doesn't exist or can't be resolved - use as-is
    }

    return resolved;
}

/**
 * Check if a path is allowed for orchestrator access.
 * DEFAULT DENY: Only explicitly allowed paths within ARKADIAN_DIR pass.
 */
function isPathAllowed(filePath: string): { allowed: boolean; reason: string } {
    // Empty/missing path = DENY (not allow!)
    if (!filePath) {
        return { allowed: false, reason: 'Empty path not allowed - orchestrator must specify explicit paths' };
    }

    const absolutePath = resolveToAbsolute(filePath);
    const arkadianDir = resolveToAbsolute(ARKADIAN_DIR);

    // Check if path is within ARKADIAN_DIR
    if (absolutePath === arkadianDir || absolutePath.startsWith(arkadianDir + '/')) {
        return { allowed: true, reason: 'Within ARKADIAN_DIR' };
    }

    // Check against known repo paths for better error messages
    for (let i = 0; i < BLOCKED_PATHS.length; i++) {
        const repoPath = resolveToAbsolute(BLOCKED_PATHS[i]);
        if (absolutePath === repoPath || absolutePath.startsWith(repoPath + '/')) {
            return {
                allowed: false,
                reason: `Accessing project repository ${REPO_ENV_VARS[i]} - delegate to agent instead`
            };
        }
    }

    // Default: DENY anything outside ARKADIAN_DIR
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

The agent will read the code and provide the answer.

📄 Review your instructions: \${ARKADIAN_DIR}/ORCHESTRATOR.md
`;
}

async function main() {
    try {
        // Always log for debugging
        log('Hook invoked', {
            ORCHESTRATOR_MODE,
            ARKADIAN_DIR,
            cwd: process.cwd(),
            env_ARKADIAN_ORCHESTRATOR_MODE: process.env.ARKADIAN_ORCHESTRATOR_MODE
        });

        // Skip guardrails if not in orchestrator mode
        if (!ORCHESTRATOR_MODE) {
            log('Skipping guardrails', 'ARKADIAN_ORCHESTRATOR_MODE not set to 1');
            process.exit(0);
        }

        const input = await Bun.stdin.text();
        const hookInput: HookInput = JSON.parse(input);

        const sessionId = hookInput.session_id;
        const toolName = hookInput.tool_name;
        const toolInput = hookInput.tool_input || {};

        // Check if this is the orchestrator or a sub-agent using task depth
        const isOrchestrator = isOrchestratorCall();
        const currentDepth = getTaskDepth();

        log('Orchestrator check', {
            sessionId,
            isOrchestrator,
            taskDepth: currentDepth,
            tool: toolName
        });

        if (!isOrchestrator) {
            log('Sub-agent detected - allowing full access', { sessionId, tool: toolName, taskDepth: currentDepth });
            process.exit(0); // Allow sub-agents full access
        }

        log('Orchestrator tool call - enforcing restrictions', { sessionId, tool: toolName, input: toolInput });

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
            // Unknown tool - allow but warn
            log('Unknown tool', `Tool "${toolName}" not in allow/block list, allowing`);
            process.exit(0);
        }

        // For path-restricted tools (Read, Write, Edit, Glob, Grep) - check path restrictions
        // Using DEFAULT DENY: only explicitly allowed paths pass
        if (PATH_RESTRICTED_TOOLS.includes(toolName)) {
            const filePath = toolInput.file_path || toolInput.path || '';
            const resolvedPath = resolveToAbsolute(filePath);

            log('Path check', {
                tool: toolName,
                originalPath: filePath,
                resolvedPath,
                arkadianDir: resolveToAbsolute(ARKADIAN_DIR),
                cwd: process.cwd()
            });

            // Use the new strict path checking (default deny)
            const pathCheck = isPathAllowed(filePath);
            log('isPathAllowed result', pathCheck);

            if (!pathCheck.allowed) {
                const resolvedPath = resolveToAbsolute(filePath);
                const errorMessage = `
❌ BLOCKED: ${pathCheck.reason}

Attempted path: ${filePath}
Resolved to: ${resolvedPath}
Tool: ${toolName}

Orchestrator can ONLY access files within ARKADIAN_DIR:
- ${ARKADIAN_DIR}/docs/ (project documentation indexes)
- ${ARKADIAN_DIR}/sessions/ (session artifacts)
- ${ARKADIAN_DIR}/templates/ (workflow templates)
- ${ARKADIAN_DIR}/ORCHESTRATOR.md (your instructions)

${getOrchestratorReminder()}

**Instead, delegate to an agent:**
- ark-guru for questions about how code works
- ark-developer for code analysis or changes
- ark-env-tester for testing questions
`;
                console.error(errorMessage);
                process.exit(2);
            }

            log('Path allowed', { path: filePath, reason: pathCheck.reason });
        }

        // Task tool - validate sub-agent type
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

**Suggested replacement for "${subagentType}":**
${subagentType === 'Explore' ? '→ Use "ark-guru" for codebase exploration and Q&A' : ''}
${subagentType === 'Plan' ? '→ Use "ark-project-manager" for planning and specs' : ''}
${subagentType === 'general-purpose' ? '→ Choose a specific Arkadian agent based on the task' : ''}

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

            // Valid agent type - increment depth for sub-agent detection
            log('Task agent validated', { subagentType });
            incrementTaskDepth();
        }

        // TodoWrite is always allowed (state tracking)
        // AskUserQuestion is always allowed (clarification)

        log('Allowed', { tool: toolName });
        process.exit(0);

    } catch (error: any) {
        log('Hook error', { message: error.message, stack: error.stack });
        // Don't block on hook errors
        process.exit(0);
    }
}

main();
