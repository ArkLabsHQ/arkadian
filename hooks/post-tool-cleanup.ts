#!/usr/bin/env bun

/**
 * Arkadian Post-Tool Cleanup Hook
 *
 * PostToolUse hook that cleans up session state when Agent/Task tool calls fail.
 *
 * Problem this solves:
 * The pre-agent-validator sets active_agent(s) in session state BEFORE the Agent
 * tool actually runs. If the Agent tool fails (e.g., "Agent type not found" because
 * the agent file isn't installed), the state is left stale and the orchestrator
 * gets locked into sub-agent mode (deadlock).
 *
 * Solution:
 * This PostToolUse hook fires after the Agent/Task tool completes. If the result
 * is an error, it clears the corresponding active_agents entry using the tool_use_id
 * for correlation.
 *
 * State Interaction:
 * - Reads: {DATA_DIR}/{session_id}_state.json → active_agents
 * - Writes: Removes failed agent entry from active_agents, updates active_agent
 *
 * Exit codes:
 * - 0: Always (PostToolUse should not block)
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ARKADIAN_DIR = process.env.ARKADIAN_DIR || process.env.HOME + '/code/go/arkadian';
const ARKADIAN_DATA_DIR = process.env.ARKADIAN_DATA_DIR || join(ARKADIAN_DIR, 'log');
const ORCHESTRATOR_MODE = process.env.ARKADIAN_ORCHESTRATOR_MODE === '1';

interface HookInput {
    session_id: string;
    tool_name: string;
    tool_input: Record<string, any>;
    tool_use_id?: string;
    hook_event_name: string;
    // PostToolUse may include result info — structure varies
    [key: string]: any;
}

interface ActiveAgent {
    agent_type: string;
    spec_id: string;
    invoked_at: string;
    tool_use_id?: string;
    expected_artifacts: any[];
    allowed_tools: string[];
    allowed_paths: string[];
    blocked_paths: string[];
    context_intent?: string;
}

interface SessionState {
    session_id: string;
    type: string;
    active_agent: ActiveAgent | null;
    active_agents: Record<string, ActiveAgent>;
    [key: string]: any;
}

function ensureDataDir(): void {
    if (!existsSync(ARKADIAN_DATA_DIR)) {
        mkdirSync(ARKADIAN_DATA_DIR, { recursive: true });
    }
}

function log(sessionId: string, label: string, data: any) {
    const timestamp = new Date().toISOString();
    const logFile = join(ARKADIAN_DATA_DIR, `${sessionId}_log.txt`);

    let output = `[${timestamp}] [post-tool-cleanup] ${label}: `;
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
        // Ignore
    }
}

function getSessionState(sessionId: string): SessionState | null {
    const stateFile = join(ARKADIAN_DATA_DIR, `${sessionId}_state.json`);
    if (!existsSync(stateFile)) return null;
    try {
        return JSON.parse(readFileSync(stateFile, 'utf-8'));
    } catch {
        return null;
    }
}

function writeSessionState(sessionId: string, state: SessionState): void {
    const stateFile = join(ARKADIAN_DATA_DIR, `${sessionId}_state.json`);
    writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

async function main() {
    try {
        const input = await Bun.stdin.text();
        const hookInput: HookInput = JSON.parse(input);

        // Only process in orchestrator mode
        if (!ORCHESTRATOR_MODE) {
            process.exit(0);
        }

        // Only process Agent/Task tool completions
        if (hookInput.tool_name !== 'Agent' && hookInput.tool_name !== 'Task') {
            process.exit(0);
        }

        // Diagnostic: log ALL fields so we can see what PostToolUse actually provides
        log(hookInput.session_id, 'post-tool-cleanup-input', {
            tool: hookInput.tool_name,
            tool_use_id: hookInput.tool_use_id,
            keys: Object.keys(hookInput),
            has_is_error: 'is_error' in hookInput,
            has_tool_result: 'tool_result' in hookInput,
            has_tool_result_is_error: 'tool_result_is_error' in hookInput,
            has_content: 'content' in hookInput,
            has_output: 'output' in hookInput,
            is_error_value: hookInput.is_error,
            tool_result_preview: typeof hookInput.tool_result === 'string' ? hookInput.tool_result.slice(0, 200) : typeof hookInput.tool_result,
        });

        // Detect errors — check all possible fields Claude Code may provide
        const isError = hookInput.is_error === true ||
                        hookInput.tool_result_is_error === true ||
                        (typeof hookInput.tool_result === 'string' && (
                            hookInput.tool_result.includes('not found') ||
                            hookInput.tool_result.includes('EACCES')
                        )) ||
                        (typeof (hookInput as any).content === 'string' && (
                            (hookInput as any).content.includes('not found') ||
                            (hookInput as any).content.includes('EACCES')
                        )) ||
                        (typeof (hookInput as any).output === 'string' && (
                            (hookInput as any).output.includes('not found') ||
                            (hookInput as any).output.includes('EACCES')
                        ));

        if (!isError) {
            // Not an error — SubagentStop hook will handle cleanup
            log(hookInput.session_id, 'post-tool-cleanup-no-error', 'isError=false, exiting');
            process.exit(0);
        }

        log(hookInput.session_id, 'agent-tool-failed', {
            tool: hookInput.tool_name,
            tool_use_id: hookInput.tool_use_id,
            is_error: true,
        });

        const state = getSessionState(hookInput.session_id);
        if (!state) {
            process.exit(0);
        }

        const activeAgents = state.active_agents || {};
        const toolUseId = hookInput.tool_use_id;
        let cleared = false;

        // Try to find the failed agent by tool_use_id correlation
        if (toolUseId) {
            for (const [specId, agent] of Object.entries(activeAgents)) {
                if (agent.tool_use_id === toolUseId) {
                    log(hookInput.session_id, 'clearing-failed-agent', {
                        spec_id: specId,
                        agent: agent.agent_type,
                        tool_use_id: toolUseId,
                        reason: 'Agent tool returned error',
                    });
                    delete activeAgents[specId];
                    cleared = true;
                    break;
                }
            }
        }

        // Fallback: if we couldn't match by tool_use_id, check description match
        if (!cleared && hookInput.tool_input?.description) {
            const desc = hookInput.tool_input.description;
            for (const [specId, agent] of Object.entries(activeAgents)) {
                if (desc.includes(specId)) {
                    log(hookInput.session_id, 'clearing-failed-agent-by-desc', {
                        spec_id: specId,
                        agent: agent.agent_type,
                        description: desc,
                        reason: 'Agent tool returned error (matched by description)',
                    });
                    delete activeAgents[specId];
                    cleared = true;
                    break;
                }
            }
        }

        if (cleared) {
            state.active_agents = activeAgents;

            // Derive active_agent from remaining entries
            const remaining = Object.values(activeAgents);
            state.active_agent = remaining.length > 0 ? remaining[remaining.length - 1] : null;

            writeSessionState(hookInput.session_id, state);
            log(hookInput.session_id, 'state-cleaned', {
                remaining_agents: Object.keys(activeAgents),
                active_agent: state.active_agent?.spec_id || null,
            });
        } else {
            log(hookInput.session_id, 'no-match-found', {
                tool_use_id: toolUseId,
                active_agents: Object.keys(activeAgents),
                action: 'Could not correlate failed Agent call to active_agents entry',
            });
        }

        process.exit(0);
    } catch (error: any) {
        // Never block on PostToolUse errors
        try {
            const input = await Bun.stdin.text();
            const hookInput = JSON.parse(input);
            log(hookInput.session_id, 'error', { message: error.message });
        } catch {
            // Ignore
        }
        process.exit(0);
    }
}

main();
