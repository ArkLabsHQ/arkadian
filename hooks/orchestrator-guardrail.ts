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
 * 1. Orchestrator can use: Task, Read, Write, Edit (within ARKADIAN_DIR + ~/.claude)
 * 2. Paths outside ARKADIAN_DIR and ~/.claude are blocked for orchestrator
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

// Express mode: orchestrator implements directly, no sub-agents
const WORKFLOW_MODE = process.env.ARKADIAN_WORKFLOW_MODE || 'full';

const ARKADIAN_DIR = process.env.ARKADIAN_DIR || process.env.HOME + '/code/go/arkadian';
const SESSIONS_DIR = join(ARKADIAN_DIR, 'sessions');

// Use ARKADIAN_DATA_DIR for runtime state (OS-specific data directory)
const ARKADIAN_DATA_DIR = process.env.ARKADIAN_DATA_DIR || join(ARKADIAN_DIR, 'log');

// Tools the orchestrator is ALLOWED to use (some restricted to ARKADIAN_DIR + ~/.claude)
// Note: Claude Code renamed Task → Agent in newer versions; accept both
const ALLOWED_TOOLS = [
    'Task',           // Delegate to agents (legacy name)
    'Agent',          // Delegate to agents (new name since Claude Code ~2.2)
    'Read',           // Read docs (restricted to ARKADIAN_DIR + ~/.claude)
    'Write',          // Write files (restricted to ARKADIAN_DIR + ~/.claude)
    'Edit',           // Edit files (restricted to ARKADIAN_DIR + ~/.claude)
    'Glob',           // Find files (restricted to ARKADIAN_DIR + ~/.claude)
    'Grep',           // Search content (restricted to ARKADIAN_DIR + ~/.claude)
    'TodoWrite',      // Track workflow state
    'AskUserQuestion', // Clarify requirements
    'ToolSearch',     // Meta-tool for loading deferred tools (always allowed)
    'EnterPlanMode',  // Claude Code plan mode (always allowed)
    'ExitPlanMode',   // Claude Code plan mode (always allowed)
    'EnterWorktree',  // Claude Code worktree (always allowed)
    'Skill',          // Invoke skills (always allowed)
];

// Tools that require path checking (restricted to ARKADIAN_DIR)
const PATH_RESTRICTED_TOOLS = ['Read', 'Write', 'Edit', 'Glob', 'Grep'];

// Tools that are BLOCKED for orchestrator (always blocked)
const BLOCKED_TOOLS = [
    'Bash',           // Orchestrator doesn't run commands (except allowlisted gh commands)
    'NotebookEdit',   // Orchestrator doesn't edit notebooks
    'MultiEdit'       // Orchestrator doesn't multi-edit code
];

// Allowlisted read-only `gh` subcommands for the orchestrator.
// These let the orchestrator fetch GitHub issue/PR context without full Bash access.
const GH_ALLOWED_SUBCOMMANDS = ['issue', 'pr', 'api', 'release', 'repo'];

// Destructive gh action subcommands that are NEVER allowed for the orchestrator.
// These appear as the action word after `gh <resource>` (e.g., `gh issue close`, `gh pr merge`).
const GH_BLOCKED_ACTIONS = [
    'close', 'edit', 'delete', 'merge', 'reopen', 'create',
    'comment', 'review', 'ready', 'lock', 'unlock', 'transfer',
    'pin', 'unpin', 'develop', 'label',
];

// Destructive gh flags that are NEVER allowed for the orchestrator.
const GH_BLOCKED_FLAGS = [
    '--delete', '--edit', '--close', '--merge', '--reopen',
    '--approve', '--request-changes', '--comment',
    '-d',  // short for --delete in some contexts
];

/**
 * Check if a Bash command is an allowlisted read-only `gh` command.
 * Returns true if the command should be ALLOWED through the Bash block.
 */
function isAllowlistedGhCommand(command: string): boolean {
    const trimmed = command.trim();

    // Must start with "gh "
    if (!trimmed.startsWith('gh ')) return false;

    // Extract the subcommand (first word after "gh")
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) return false;

    const subcommand = parts[1];
    if (!GH_ALLOWED_SUBCOMMANDS.includes(subcommand)) return false;

    // Check the action word (third token, e.g., "close" in "gh issue close 942")
    // For `gh api` the action word is the URL path, so skip this check for `api`
    if (subcommand !== 'api' && parts.length >= 3) {
        const action = parts[2];
        if (GH_BLOCKED_ACTIONS.includes(action)) return false;
    }

    // Block any destructive flags anywhere in the command
    for (const flag of GH_BLOCKED_FLAGS) {
        if (trimmed.includes(flag)) return false;
    }

    // Block piping to other commands (prevents `gh ... | bash` etc.)
    // Allow piping to jq/head/tail/grep for output formatting
    if (trimmed.includes('|')) {
        const pipeParts = trimmed.split('|').slice(1);
        const SAFE_PIPE_TARGETS = ['jq', 'head', 'tail', 'grep', 'wc', 'sort', 'uniq', 'cut'];
        for (const pipePart of pipeParts) {
            const pipeCmd = pipePart.trim().split(/\s+/)[0];
            if (!SAFE_PIPE_TARGETS.includes(pipeCmd)) return false;
        }
    }

    // Block command chaining (&&, ;, ||) that could run arbitrary commands
    if (/[;&]|(\|\|)/.test(trimmed.replace(/\|(?!\|)/g, ''))) return false;

    return true;
}

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

// Directories within session artifacts that ONLY sub-agents should write to.
// The orchestrator can READ from these, but writing would mean it's self-implementing
// instead of delegating to an agent (which violates its role).
const AGENT_ONLY_ARTIFACT_DIRS = ['/artifacts/implement/', '/artifacts/test/'];

// Write-capable tools (subset of PATH_RESTRICTED_TOOLS that modify files)
const WRITE_TOOLS = ['Write', 'Edit'];

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
    active_agents: Record<string, ActiveAgent>;
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
 * Expand environment variables in a string.
 * Handles ${VAR} and $VAR formats.
 */
function expandEnvVars(str: string): string {
    if (!str) return str;

    // Replace ${VAR} format
    let result = str.replace(/\$\{(\w+)\}/g, (_, varName) => {
        return process.env[varName] || '';
    });

    // Replace $VAR format (word boundary)
    result = result.replace(/\$(\w+)/g, (match, varName) => {
        return process.env[varName] || match;
    });

    return result;
}

/**
 * Reconstruct allowed_paths and blocked_paths from the execution spec YAML.
 * Used during context compaction recovery to avoid empty-paths bypass.
 *
 * Mirrors the path construction logic in pre-agent-validator.ts:setActiveAgent()
 */
function reconstructPathsFromSpec(
    sessionId: string,
    sessionDir: string,
    specId: string
): { allowedPaths: string[]; blockedPaths: string[] } {
    // Conservative fallback: limit to session dir + docs only
    // This ensures allowed_paths.length > 0, triggering path checks in subagent-guardrail
    const fallbackPaths = {
        allowedPaths: [sessionDir, join(ARKADIAN_DIR, 'docs')],
        blockedPaths: [] as string[]
    };

    const specFile = join(sessionDir, 'specs', `${specId}.yaml`);
    if (!existsSync(specFile)) {
        log(sessionId, 'recovery-spec-missing', { specFile, using: 'fallback paths' });
        return fallbackPaths;
    }

    try {
        const specContent = readFileSync(specFile, 'utf-8');

        const allowedPaths: string[] = [];
        const blockedPaths: string[] = [];

        // Always allow session dir and docs
        allowedPaths.push(sessionDir);
        allowedPaths.push(join(ARKADIAN_DIR, 'docs'));

        // Extract session_dir from spec (may differ from sessionDir if renamed)
        const sessionDirMatch = specContent.match(/session_dir:\s*["']?([^\s"'#]+)/);
        if (sessionDirMatch) {
            const specSessionDir = expandEnvVars(sessionDirMatch[1]);
            if (specSessionDir && !allowedPaths.includes(specSessionDir)) {
                allowedPaths.push(specSessionDir);
            }
        }

        // Extract repo_root values from projects array and top-level repo_source
        const repoRootRegex = /repo_root:\s*["']?([^\s"'#]+)/g;
        let match;
        const repoRoots: string[] = [];
        while ((match = repoRootRegex.exec(specContent)) !== null) {
            const expanded = expandEnvVars(match[1]);
            if (expanded && !repoRoots.includes(expanded)) {
                repoRoots.push(expanded);
            }
        }

        // Check if worktree mode is enabled (default: true)
        const worktreeMatch = specContent.match(/worktree_config:\s*\n\s*enabled:\s*(true|false)/);
        const worktreeEnabled = !worktreeMatch || worktreeMatch[1] !== 'false';

        for (const repoPath of repoRoots) {
            // Allow READ from main repo
            allowedPaths.push(repoPath);

            if (worktreeEnabled) {
                // Block WRITE to main repo (must use worktree)
                blockedPaths.push(repoPath);

                // Also allow worktree paths (any .worktrees/ subdir of this repo)
                // We can't know the exact branch name, so we allow the .worktrees parent
                allowedPaths.push(join(repoPath, '.worktrees'));
            }
        }

        log(sessionId, 'recovery-paths-reconstructed', {
            specFile,
            allowedPaths,
            blockedPaths,
            repoRoots,
            worktreeEnabled
        });

        // If we couldn't extract any repo paths, return at least the fallback
        if (allowedPaths.length === 0) {
            return fallbackPaths;
        }

        return { allowedPaths, blockedPaths };
    } catch (e: any) {
        log(sessionId, 'recovery-spec-parse-error', { specFile, error: e.message });
        return fallbackPaths;
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

    // It's an orchestrator session — check active_agents map first, fall back to active_agent
    const activeAgentsMap = state.active_agents || {};
    const activeAgentEntries = Object.values(activeAgentsMap);

    if (activeAgentEntries.length > 0) {
        // At least one sub-agent is active — use the most recent one for backward compat
        const latestAgent = activeAgentEntries[activeAgentEntries.length - 1];
        log(sessionId, 'subagent-active', {
            agent: latestAgent.agent_type,
            spec: latestAgent.spec_id,
            parallel_count: activeAgentEntries.length,
        });
        return { isOrchestrator: false, activeAgent: latestAgent };
    }

    if (state.active_agent) {
        // Backward compat: active_agents map empty but active_agent set (old state format)
        log(sessionId, 'subagent-active', { agent: state.active_agent.agent_type, spec: state.active_agent.spec_id });
        return { isOrchestrator: false, activeAgent: state.active_agent };
    }

    // Recovery: After context compaction, a sub-agent session may continue
    // with active_agent cleared unexpectedly. Check if there's a phase that
    // is CURRENTLY in_progress — this indicates a sub-agent was running when
    // context compaction happened and its state was lost.
    //
    // IMPORTANT: Only recover when a phase is in_progress, NOT when phases
    // are merely completed. Completed phases mean the sub-agent finished and
    // the orchestrator is doing between-phase work (loading specs, presenting
    // plans, etc.) — recovery in that state incorrectly restricts the
    // orchestrator's own tool calls to sub-agent paths.
    const sessionDir = join(SESSIONS_DIR, sessionId);
    const workflowFile = join(sessionDir, 'workflow.yaml');
    const inProgressPhase = state.phases && Object.entries(state.phases).find(
        ([_, p]: [string, any]) => p.status === 'in_progress'
    );
    if (existsSync(workflowFile) && inProgressPhase) {
        const specId = inProgressPhase[0] || state.workflow.current_phase || 'S3';

        // Reconstruct paths from the execution spec to avoid empty allowed_paths bypass
        const { allowedPaths, blockedPaths } = reconstructPathsFromSpec(sessionId, sessionDir, specId);

        const recoveredAgent: ActiveAgent = {
            agent_type: 'ark-developer',
            spec_id: specId,
            invoked_at: new Date().toISOString(),
            expected_artifacts: ['detailed_report.md', 'test-evidence.md', '_result.json'],
            allowed_tools: ['Read', 'Write', 'Edit', 'MultiEdit', 'Glob', 'Grep', 'Bash', 'TodoWrite', 'Task', 'Agent', 'Skill'],
            allowed_paths: allowedPaths,
            blocked_paths: blockedPaths
        };

        // Persist the recovery to state file
        try {
            state.active_agent = recoveredAgent;
            const stateFile = join(ARKADIAN_DATA_DIR, `${sessionId}_state.json`);
            writeFileSync(stateFile, JSON.stringify(state, null, 2));
            log(sessionId, 'subagent-recovered', {
                reason: 'Context compaction recovery - phase in_progress',
                agent: recoveredAgent.agent_type,
                in_progress_phase: inProgressPhase[0],
                workflow_current_phase: state.workflow.current_phase,
                workflow_status: state.workflow.status,
                allowed_paths: allowedPaths,
                blocked_paths: blockedPaths
            });
        } catch (e: any) {
            log(sessionId, 'recovery-write-error', e.message);
        }

        return { isOrchestrator: false, activeAgent: recoveredAgent };
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
 *
 * In direct mode (express workflow), project repo paths are also allowed.
 */
function isPathAllowed(filePath: string, directMode: boolean = false): { allowed: boolean; reason: string } {
    if (!filePath) {
        return { allowed: false, reason: 'Empty path not allowed' };
    }

    const absolutePath = resolveToAbsolute(filePath);
    const arkadianDir = resolveToAbsolute(ARKADIAN_DIR);

    if (absolutePath === arkadianDir || absolutePath.startsWith(arkadianDir + '/')) {
        return { allowed: true, reason: 'Within ARKADIAN_DIR' };
    }

    // Allow full access to ~/.claude (Claude Code settings, plans, memory, etc.)
    const claudeDir = resolveToAbsolute(join(process.env.HOME || '', '.claude'));
    if (absolutePath === claudeDir || absolutePath.startsWith(claudeDir + '/')) {
        return { allowed: true, reason: 'Within ~/.claude' };
    }

    for (let i = 0; i < BLOCKED_PATHS.length; i++) {
        const repoPath = resolveToAbsolute(BLOCKED_PATHS[i]);
        if (absolutePath === repoPath || absolutePath.startsWith(repoPath + '/')) {
            // In direct mode, allow access to project repos
            if (directMode) {
                return { allowed: true, reason: `Express direct mode: ${REPO_ENV_VARS[i]} access allowed` };
            }
            return {
                allowed: false,
                reason: `Accessing project repository ${REPO_ENV_VARS[i]} - delegate to agent instead`
            };
        }
    }

    // In direct mode, allow any path (orchestrator is acting as developer)
    if (directMode) {
        return { allowed: true, reason: 'Express direct mode: general path access allowed' };
    }

    return {
        allowed: false,
        reason: `Path outside ARKADIAN_DIR: ${absolutePath}`
    };
}

// getOrchestratorReminder is now imported from ./orchestrator-reminder

/**
 * Check if direct execution mode is unlocked for the orchestrator.
 *
 * Direct mode requires BOTH:
 * 1. ARKADIAN_WORKFLOW_MODE=express env var (set by scripts/arkadian -x flag)
 * 2. workflow.yaml exists in session dir with execution_mode: "direct"
 *
 * This double-lock prevents:
 * - Full-mode orchestrator from writing direct workflow.yaml to bypass guards
 * - Express mode from working before workflow.yaml is created
 */
function isDirectModeUnlocked(sessionId: string): boolean {
    // Must be in express workflow mode (env var set by launcher)
    if (WORKFLOW_MODE !== 'express') return false;

    // Find session dir — check state file for active pointer, fall back to SESSIONS_DIR
    const activeFile = join(ARKADIAN_DATA_DIR, `${sessionId}_active.txt`);
    let sessionDir: string;

    if (existsSync(activeFile)) {
        try {
            sessionDir = readFileSync(activeFile, 'utf-8').trim();
        } catch {
            sessionDir = join(SESSIONS_DIR, sessionId);
        }
    } else {
        sessionDir = join(SESSIONS_DIR, sessionId);
    }

    const workflowPath = join(sessionDir, 'workflow.yaml');

    if (!existsSync(workflowPath)) return false;

    try {
        const content = readFileSync(workflowPath, 'utf-8');
        return /execution_mode:\s*["']?direct/.test(content);
    } catch {
        return false;
    }
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
        const { isOrchestrator, activeAgent } = isOrchestratorCall(sessionId);

        log(sessionId, 'session-check', { isOrchestrator, hasActiveAgent: !!activeAgent });

        if (!isOrchestrator) {
            // Sub-agent call - delegate to subagent-guardrail.ts
            // For now, just allow (subagent-guardrail.ts will handle restrictions)
            log(sessionId, 'allowing-subagent', { tool: toolName, agent: activeAgent?.agent_type });
            process.exit(0);
        }

        log(sessionId, 'enforcing-orchestrator-restrictions', { tool: toolName });

        // Check if direct execution mode is unlocked (express workflow)
        const directMode = isDirectModeUnlocked(sessionId);
        log(sessionId, 'direct-mode-check', { directMode, workflowMode: WORKFLOW_MODE });

        // Check if tool is explicitly blocked
        if (BLOCKED_TOOLS.includes(toolName)) {
            // In direct mode, allow Bash and MultiEdit (orchestrator acts as developer)
            if (directMode) {
                log(sessionId, 'express-direct-allowed', { tool: toolName });
                process.exit(0);
            }

            // Special case: allow read-only `gh` commands through the Bash block
            if (toolName === 'Bash') {
                const cmd = (toolInput.command || '').trim();
                if (isAllowlistedGhCommand(cmd)) {
                    log(sessionId, 'allowed-gh-command', { command: cmd });
                    process.exit(0);
                }

                log(sessionId, 'blocked-tool', toolName);
                if (cmd.startsWith('mkdir')) {
                    console.error(
                        '❌ Bash is blocked for the orchestrator. You do NOT need mkdir — ' +
                        'the Write tool automatically creates parent directories. ' +
                        'Just use Write to create the file directly.'
                    );
                } else {
                    console.error(
                        '❌ Bash is blocked for the orchestrator. ' +
                        'Use Write/Edit for files, Task for delegating to agents. ' +
                        'If you need shell commands, delegate to ark-developer. ' +
                        'Exception: read-only `gh` commands are allowed (e.g., gh issue view, gh pr view).'
                    );
                }
            } else {
                log(sessionId, 'blocked-tool', toolName);
                console.error(getOrchestratorReminder());
            }
            process.exit(2);
        }

        // Check if tool is allowed - BLOCK unknown tools (fail-closed)
        // In direct mode, allow all tools (orchestrator acts as developer)
        if (!ALLOWED_TOOLS.includes(toolName)) {
            if (directMode) {
                log(sessionId, 'express-direct-allowed-unknown', { tool: toolName });
                process.exit(0);
            }
            log(sessionId, 'blocked-unknown-tool', toolName);
            console.error(getOrchestratorReminder());
            process.exit(2);
        }

        // For path-restricted tools - check path restrictions
        if (PATH_RESTRICTED_TOOLS.includes(toolName)) {
            const filePath = toolInput.file_path || toolInput.path || '';
            const pathCheck = isPathAllowed(filePath, directMode);

            log(sessionId, 'path-check', { tool: toolName, path: filePath, result: pathCheck, directMode });

            if (!pathCheck.allowed) {
                log(sessionId, 'blocked-path', { tool: toolName, path: filePath, reason: pathCheck.reason });
                console.error(getOrchestratorReminder());
                process.exit(2);
            }

            // Block orchestrator from WRITING to agent-only artifact directories.
            // In direct mode, the orchestrator IS the implementer, so allow these writes.
            if (!directMode && WRITE_TOOLS.includes(toolName)) {
                const normalizedPath = resolveToAbsolute(filePath);
                const isAgentOnlyDir = AGENT_ONLY_ARTIFACT_DIRS.some(
                    dir => normalizedPath.includes(dir)
                );
                if (isAgentOnlyDir) {
                    const reason = 'Implementation artifacts can only be written by sub-agents. Retry via a new agent invocation instead of self-implementing.';
                    log(sessionId, 'blocked-agent-only-path', { tool: toolName, path: filePath, reason });
                    console.error(`❌ ${reason}`);
                    process.exit(2);
                }
            }
        }

        // Task/Agent tool - validate sub-agent type
        // (Claude Code renamed Task → Agent in newer versions)
        if (toolName === 'Task' || toolName === 'Agent') {
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
