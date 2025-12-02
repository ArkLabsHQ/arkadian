#!/usr/bin/env bun

/**
 * Orchestrator Guardrail Hook
 *
 * PreToolUse hook that enforces orchestrator boundaries:
 * 1. Orchestrator can use: Task, Read, Write, Edit (within ARKADIAN_DIR only)
 * 2. Blocks direct repo access - must delegate to agents
 * 3. Blocks Bash commands - orchestrator doesn't run code
 *
 * ARKADIAN_DIR PRIVILEGES:
 * Orchestrator CAN read/write/edit files within ARKADIAN_DIR for:
 * - Updating docs in ${ARKADIAN_DIR}/docs/
 * - Creating session artifacts in ${ARKADIAN_DIR}/sessions/
 * - Managing templates, workflows, etc.
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

import { appendFileSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Only enforce guardrails in orchestrator mode
const ORCHESTRATOR_MODE = process.env.ARKADIAN_ORCHESTRATOR_MODE === '1';

const ARKADIAN_DIR = process.env.ARKADIAN_DIR || process.env.HOME + '/code/go/arkadian';
const LOG_FILE = join(ARKADIAN_DIR, 'log/orchestrator-guardrail.txt');
const ORCHESTRATOR_SESSION_FILE = join(ARKADIAN_DIR, 'log/orchestrator-session.txt');

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
    'ARK_DOCS_REPO',
    'ARKADE_ESCROW_REPO',
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
 * Check if the current session is the orchestrator session.
 * First call registers the session as orchestrator; subsequent calls check against it.
 */
function isOrchestratorSession(sessionId: string): boolean {
    try {
        if (existsSync(ORCHESTRATOR_SESSION_FILE)) {
            const storedSessionId = readFileSync(ORCHESTRATOR_SESSION_FILE, 'utf-8').trim();
            // If stored session matches, this IS the orchestrator
            // If different, this is a sub-agent - allow everything
            return storedSessionId === sessionId;
        } else {
            // First call - register this as the orchestrator session
            writeFileSync(ORCHESTRATOR_SESSION_FILE, sessionId);
            return true;
        }
    } catch (e) {
        // On error, be permissive
        return false;
    }
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

function isPathInArkadian(filePath: string): boolean {
    if (!filePath) return true; // No path = allow (defensive)

    // Expand tilde and normalize paths
    const normalizedPath = expandTilde(filePath).replace(/\/+/g, '/');
    const normalizedArkadian = expandTilde(ARKADIAN_DIR).replace(/\/+/g, '/');

    return normalizedPath.startsWith(normalizedArkadian);
}

function isPathInBlockedRepo(filePath: string): { blocked: boolean; repo?: string } {
    if (!filePath) return { blocked: false };

    // Expand tilde and normalize paths
    const normalizedPath = expandTilde(filePath).replace(/\/+/g, '/');
    const normalizedArkadian = expandTilde(ARKADIAN_DIR).replace(/\/+/g, '/');

    // If path is within ARKADIAN_DIR, it's never blocked
    if (normalizedPath.startsWith(normalizedArkadian + '/') || normalizedPath === normalizedArkadian) {
        return { blocked: false };
    }

    for (let i = 0; i < BLOCKED_PATHS.length; i++) {
        const repoPath = expandTilde(BLOCKED_PATHS[i]).replace(/\/+/g, '/');
        // Check if path starts with repo path (with trailing slash to avoid partial matches)
        if (normalizedPath.startsWith(repoPath + '/') || normalizedPath === repoPath) {
            return { blocked: true, repo: REPO_ENV_VARS[i] };
        }
    }

    return { blocked: false };
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
        // Skip guardrails if not in orchestrator mode
        if (!ORCHESTRATOR_MODE) {
            process.exit(0);
        }

        const input = await Bun.stdin.text();
        const hookInput: HookInput = JSON.parse(input);

        const sessionId = hookInput.session_id;
        const toolName = hookInput.tool_name;
        const toolInput = hookInput.tool_input || {};

        // Check if this is the orchestrator session or a sub-agent
        // Sub-agents have different session IDs and should not be restricted
        if (!isOrchestratorSession(sessionId)) {
            log('Sub-agent detected', { sessionId, tool: toolName });
            process.exit(0); // Allow sub-agents full access
        }

        log('Orchestrator tool call', { sessionId, tool: toolName, input: toolInput });

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
        if (PATH_RESTRICTED_TOOLS.includes(toolName)) {
            const filePath = toolInput.file_path || toolInput.path || '';

            // Check if trying to access a project repo
            const repoCheck = isPathInBlockedRepo(filePath);
            if (repoCheck.blocked) {
                const errorMessage = `
❌ BLOCKED: Cannot access project repository directly

Attempted path: ${filePath}
Repository: ${repoCheck.repo}
Tool: ${toolName}

${getOrchestratorReminder()}

**Instead, delegate to an agent:**
- ark-guru for questions about how code works
- ark-developer for code analysis or changes
- ark-env-tester for testing questions
`;
                console.error(errorMessage);
                process.exit(2);
            }

            // Check if path is within ARKADIAN_DIR
            if (filePath && !isPathInArkadian(filePath)) {
                const errorMessage = `
❌ BLOCKED: Path outside ARKADIAN_DIR

Attempted path: ${filePath}
Allowed root: ${ARKADIAN_DIR}
Tool: ${toolName}

Orchestrator can only access files within ARKADIAN_DIR:
- ${ARKADIAN_DIR}/docs/ (project documentation)
- ${ARKADIAN_DIR}/sessions/ (session artifacts)
- ${ARKADIAN_DIR}/templates/ (workflow templates)
- ${ARKADIAN_DIR}/ORCHESTRATOR.md (your instructions)

${getOrchestratorReminder()}
`;
                console.error(errorMessage);
                process.exit(2);
            }
        }

        // Task tool is always allowed (delegation)
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
