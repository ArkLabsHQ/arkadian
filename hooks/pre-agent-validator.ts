#!/usr/bin/env bun

/**
 * Arkadian Pre-Agent Validator Hook
 *
 * PreToolUse hook that validates Task tool inputs and prepares for agent invocation.
 *
 * Responsibilities:
 * 1. Validate Execution Specification format (YAML markers, required fields)
 * 2. Check workflow.yaml exists in session folder (orchestrator must create it first)
 * 3. Set active_agent in session state (enables sub-agent guardrail routing)
 * 4. Save spec to sessions/{session_id}/specs/{step_id}.yaml
 *
 * State Interaction:
 * - Reads: {DATA_DIR}/{session_id}_state.json
 * - Writes: active_agent field in state.json
 * - Creates: {SESSIONS_DIR}/{session_id}/specs/{step_id}.yaml
 *
 * Specification format defined in: templates/sub_agent_input_spec.md
 *
 * Exit codes:
 * - 0: Valid input, continue
 * - 2: Invalid input, block the tool call (error shown to orchestrator)
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const ARKADIAN_DIR = process.env.ARKADIAN_DIR || process.env.HOME + '/code/go/arkadian';
const SESSIONS_DIR = join(ARKADIAN_DIR, 'sessions');

// Use ARKADIAN_DATA_DIR for runtime state (OS-specific data directory)
const ARKADIAN_DATA_DIR = process.env.ARKADIAN_DATA_DIR || join(ARKADIAN_DIR, 'log');

// Only enforce in orchestrator mode
const ORCHESTRATOR_MODE = process.env.ARKADIAN_ORCHESTRATOR_MODE === '1';

// List of Arkadian agents that require validated input
const ARKADIAN_AGENTS = [
    'ark-guru',
    'ark-developer',
    'ark-project-manager',
    'ark-pr-reviewer',
    'ark-progress-tracker',
    'ark-researcher',
    'ark-observer'
];

// Required fields in the execution specification
const REQUIRED_FIELDS = [
    'step_id',
    'agent',
    'objective',
    'user_request',
    'context_intent',
    'parent_session_id',
    'session_context',
    'projects'
];

// Valid context intents
const VALID_INTENTS = [
    'qna',
    'dev',
    'qa',
    'debug',
    'monitoring',
    'pr_review',
    'research',
    'progress_tracking'
];

// Agent-specific allowed tools (for sub-agent guardrail)
const AGENT_ALLOWED_TOOLS: Record<string, string[]> = {
    'ark-guru': ['Read', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'Write', 'TodoWrite'],
    'ark-developer': ['Read', 'Write', 'Edit', 'MultiEdit', 'Glob', 'Grep', 'Bash', 'TodoWrite', 'Task'],
    'ark-project-manager': ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'TodoWrite', 'AskUserQuestion', 'Skill'],
    'ark-pr-reviewer': ['Read', 'Glob', 'Grep', 'Bash', 'WebFetch', 'Write', 'TodoWrite'],
    'ark-progress-tracker': ['Read', 'Glob', 'Grep', 'Bash', 'WebFetch', 'Write', 'TodoWrite'],
    'ark-researcher': ['Read', 'WebFetch', 'WebSearch', 'Write', 'TodoWrite', 'Task'],
    'ark-observer': ['Read', 'Glob', 'Grep', 'Bash', 'WebFetch', 'Write', 'TodoWrite']
};

interface HookInput {
    session_id: string;
    tool_name: string;
    tool_input: {
        subagent_type?: string;
        prompt?: string;
        description?: string;
    };
    hook_event_name: string;
}

interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    spec?: Record<string, any>;
}

interface ActiveAgent {
    agent_type: string;
    spec_id: string;
    invoked_at: string;
    expected_artifacts: Array<string | { path: string; description?: string }>;
    allowed_tools: string[];
    allowed_paths: string[];
    blocked_paths: string[];
    context_intent?: string;
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

    let output = `[${timestamp}] [pre-agent-validator] ${label}: `;
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
 * Update session state
 */
function updateSessionState(sessionId: string, updates: Partial<SessionState>): boolean {
    const stateFile = join(ARKADIAN_DATA_DIR, `${sessionId}_state.json`);
    const state = getSessionState(sessionId);

    if (!state) {
        log(sessionId, 'state-not-found', 'Cannot update - no state file');
        return false;
    }

    try {
        const updatedState = { ...state, ...updates };
        writeFileSync(stateFile, JSON.stringify(updatedState, null, 2));
        log(sessionId, 'state-updated', { updates: Object.keys(updates) });
        return true;
    } catch (e: any) {
        log(sessionId, 'state-update-error', e.message);
        return false;
    }
}

/**
 * Check if workflow.yaml exists in session folder
 */
function checkWorkflowExists(sessionId: string): { exists: boolean; path: string } {
    const workflowPath = join(SESSIONS_DIR, sessionId, 'workflow.yaml');
    return {
        exists: existsSync(workflowPath),
        path: workflowPath
    };
}

/**
 * Resolve environment variable references like ${VAR} or $VAR
 */
function resolveEnvVar(value: string): string {
    if (!value || typeof value !== 'string') return value;

    // Replace ${VAR} format
    let resolved = value.replace(/\$\{(\w+)\}/g, (_, varName) => {
        return process.env[varName] || '';
    });

    // Replace $VAR format (only at word boundaries)
    resolved = resolved.replace(/\$(\w+)/g, (_, varName) => {
        return process.env[varName] || '';
    });

    return resolved;
}

/**
 * Set active_agent in session state before agent invocation
 */
function setActiveAgent(sessionId: string, spec: Record<string, any>, agentType: string): boolean {
    // Build allowed paths from spec
    const allowedPaths: string[] = [];
    const blockedPaths: string[] = [];

    // Add session directory to allowed paths
    const sessionDir = spec.session_context?.session_dir;
    if (sessionDir) {
        allowedPaths.push(resolveEnvVar(sessionDir));
    }

    // Add ARKADIAN_DIR/docs to allowed paths
    allowedPaths.push(join(ARKADIAN_DIR, 'docs'));

    // Check if worktree mode is enabled (default: true for ark-developer)
    const worktreeEnabled = spec.worktree_config?.enabled !== false;
    const isCodeAgent = agentType === 'ark-developer';

    // Add project repo paths from projects array
    if (spec.projects && Array.isArray(spec.projects)) {
        for (const project of spec.projects) {
            if (project.repo_source?.repo_root) {
                const repoPath = resolveEnvVar(project.repo_source.repo_root);
                if (!repoPath) continue;

                if (worktreeEnabled && isCodeAgent) {
                    // WORKTREE MODE:
                    // - READ allowed from main repo (agent needs to read code to understand it)
                    // - WRITE blocked to main repo (must use worktree)
                    // - blocked_paths is checked by subagent-guardrail for WRITE operations only
                    //
                    // Calculate expected worktree path (inside repo)
                    const taskSlug = (spec.objective || 'task')
                        .toLowerCase()
                        .replace(/[^a-z0-9 ]/g, '')
                        .replace(/ /g, '-')
                        .slice(0, 30);
                    const date = new Date().toISOString().slice(0, 10);
                    const branchName = `arkadian/${date}-${taskSlug}`;
                    const worktreePath = join(repoPath, '.worktrees', branchName);

                    // Allow READ from main repo + worktree
                    allowedPaths.push(repoPath);
                    allowedPaths.push(worktreePath);

                    // Block WRITE to main repo (enforced by subagent-guardrail)
                    blockedPaths.push(repoPath);

                    log(sessionId, 'worktree-enforcement', {
                        project: project.id,
                        mainRepo: repoPath,
                        worktreePath: worktreePath,
                        action: 'READ allowed from main repo, WRITE blocked (must use worktree)'
                    });
                } else {
                    // DIRECT MODE: Allow full access to main repo
                    allowedPaths.push(repoPath);
                }
            }
        }
    }

    // Also check for repo_source at top level (backward compatibility)
    if (spec.repo_source?.repo_root) {
        const repoPath = resolveEnvVar(spec.repo_source.repo_root);
        if (repoPath) {
            if (worktreeEnabled && isCodeAgent) {
                // Same worktree logic for top-level repo_source
                const taskSlug = (spec.objective || 'task')
                    .toLowerCase()
                    .replace(/[^a-z0-9 ]/g, '')
                    .replace(/ /g, '-')
                    .slice(0, 30);
                const date = new Date().toISOString().slice(0, 10);
                const branchName = `arkadian/${date}-${taskSlug}`;
                const worktreePath = join(repoPath, '.worktrees', branchName);

                // Allow READ from main repo + worktree
                allowedPaths.push(repoPath);
                allowedPaths.push(worktreePath);
                // Block WRITE to main repo
                blockedPaths.push(repoPath);
            } else {
                allowedPaths.push(repoPath);
            }
        }
    }

    // Log the allowed/blocked paths for debugging
    log(sessionId, 'paths-computed', {
        allowedPaths,
        blockedPaths,
        worktreeEnabled,
        isCodeAgent,
        projectsType: Array.isArray(spec.projects) ? 'array' : typeof spec.projects
    });

    // Extract expected artifacts
    const expectedArtifacts: string[] = [];
    if (spec.expected_outputs && Array.isArray(spec.expected_outputs)) {
        expectedArtifacts.push(...spec.expected_outputs);
    }
    if (spec.artifacts_out && Array.isArray(spec.artifacts_out)) {
        expectedArtifacts.push(...spec.artifacts_out);
    }

    const activeAgent: ActiveAgent = {
        agent_type: agentType,
        spec_id: spec.step_id || 'unknown',
        invoked_at: new Date().toISOString(),
        expected_artifacts: expectedArtifacts,
        allowed_tools: AGENT_ALLOWED_TOOLS[agentType] || [],
        allowed_paths: allowedPaths,
        blocked_paths: blockedPaths,
        context_intent: spec.context_intent || undefined,
    };

    return updateSessionState(sessionId, { active_agent: activeAgent });
}

/**
 * Save spec to session specs folder
 */
function saveSpec(sessionId: string, stepId: string, yamlContent: string): boolean {
    const specsDir = join(SESSIONS_DIR, sessionId, 'specs');

    try {
        if (!existsSync(specsDir)) {
            mkdirSync(specsDir, { recursive: true });
        }

        const specPath = join(specsDir, `${stepId}.yaml`);
        writeFileSync(specPath, yamlContent);
        log(sessionId, 'spec-saved', { path: specPath });
        return true;
    } catch (e: any) {
        log(sessionId, 'spec-save-error', e.message);
        return false;
    }
}

function extractYamlFromPrompt(prompt: string): string | null {
    // Look for YAML block between markers
    const beginMarker = /# --- BEGIN AGENT INPUT ---/;
    const endMarker = /# --- END AGENT INPUT ---/;

    const beginMatch = prompt.match(beginMarker);
    const endMatch = prompt.match(endMarker);

    if (beginMatch && endMatch) {
        const beginIndex = prompt.indexOf(beginMatch[0]);
        const endIndex = prompt.indexOf(endMatch[0]);
        if (beginIndex < endIndex) {
            return prompt.substring(beginIndex, endIndex + endMatch[0].length);
        }
    }

    // Check for spec header
    const specHeader = /# ═+\s*\n# EXECUTION SPECIFICATION/;
    if (specHeader.test(prompt)) {
        return prompt;
    }

    return null;
}

function parseSimpleYaml(yamlContent: string): Record<string, any> {
    /**
     * Enhanced YAML parser that handles:
     * - Top-level key: value pairs
     * - Nested objects (2-space indent)
     * - Arrays of objects with nested properties
     * - Multi-line strings (| and >)
     * - Environment variable references (${VAR})
     */
    const result: Record<string, any> = {};
    const lines = yamlContent.split('\n');

    // Stack to track nesting: [{key, obj, indent, isArray}]
    const stack: { key: string; obj: any; indent: number; isArray: boolean }[] = [
        { key: 'root', obj: result, indent: -2, isArray: false }
    ];

    let inMultilineString = false;
    let multilineKey = '';
    let multilineIndent = 0;
    let multilineValue = '';

    const getIndent = (line: string): number => {
        const match = line.match(/^(\s*)/);
        return match ? match[1].length : 0;
    };

    const parseValue = (val: string): any => {
        val = val.trim();
        // Remove surrounding quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            return val.slice(1, -1);
        }
        // Boolean
        if (val === 'true') return true;
        if (val === 'false') return false;
        // Null
        if (val === 'null' || val === '~') return null;
        // Number
        if (/^-?\d+(\.\d+)?$/.test(val)) return parseFloat(val);
        // Empty array
        if (val === '[]') return [];
        // Empty object
        if (val === '{}') return {};
        return val;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (trimmed === '' || trimmed.startsWith('#')) continue;

        const indent = getIndent(line);

        // Handle multi-line strings
        if (inMultilineString) {
            if (indent > multilineIndent || trimmed === '') {
                multilineValue += (multilineValue ? '\n' : '') + line.slice(multilineIndent + 2);
                continue;
            } else {
                // End of multiline - save it
                const parent = stack[stack.length - 1].obj;
                if (parent && multilineKey) {
                    parent[multilineKey] = multilineValue.trimEnd();
                }
                inMultilineString = false;
                multilineKey = '';
                multilineValue = '';
            }
        }

        // Pop stack for dedented lines
        while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
            stack.pop();
        }

        const current = stack[stack.length - 1];

        // Array item: "  - value" or "  - key: value"
        const arrayMatch = line.match(/^(\s*)-\s*(.*)$/);
        if (arrayMatch) {
            const [, arrayIndentStr, rest] = arrayMatch;
            const arrayIndent = arrayIndentStr.length;

            // Find or create the array
            let targetArray: any[] | null = null;

            if (current.isArray && Array.isArray(current.obj)) {
                targetArray = current.obj;
            } else if (Array.isArray(current.obj[current.key])) {
                targetArray = current.obj[current.key];
            }

            if (!targetArray) {
                // The parent should have declared an array
                continue;
            }

            // Check if it's "- key: value" (object in array)
            const objMatch = rest.match(/^(\w+):\s*(.*)$/);
            if (objMatch) {
                const [, key, value] = objMatch;
                const newObj: Record<string, any> = {};
                if (value.trim()) {
                    newObj[key] = parseValue(value);
                } else {
                    newObj[key] = {};
                }
                targetArray.push(newObj);
                stack.push({ key: key, obj: newObj, indent: arrayIndent, isArray: false });
            } else if (rest.trim()) {
                // Simple array value
                targetArray.push(parseValue(rest));
            }
            continue;
        }

        // Key: value pair
        const kvMatch = line.match(/^(\s*)(\w+):\s*(.*)$/);
        if (kvMatch) {
            const [, , key, value] = kvMatch;
            const parent = current.obj;

            if (!parent || typeof parent !== 'object') continue;

            // Multi-line string start
            if (value === '|' || value === '>') {
                inMultilineString = true;
                multilineKey = key;
                multilineIndent = indent;
                multilineValue = '';
                continue;
            }

            if (value.trim()) {
                // Direct value
                parent[key] = parseValue(value);
            } else {
                // Could be object or array - check next line
                const nextLine = lines[i + 1];
                if (nextLine && nextLine.trim().startsWith('-')) {
                    // It's an array
                    parent[key] = [];
                    stack.push({ key: key, obj: parent[key], indent: indent, isArray: true });
                } else {
                    // It's an object
                    parent[key] = {};
                    stack.push({ key: key, obj: parent[key], indent: indent, isArray: false });
                }
            }
        }
    }

    // Handle any remaining multiline string
    if (inMultilineString && multilineKey) {
        const parent = stack[stack.length - 1].obj;
        if (parent) {
            parent[multilineKey] = multilineValue.trimEnd();
        }
    }

    return result;
}

function validateExecutionSpec(sessionId: string, prompt: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Extract YAML content
    const yamlContent = extractYamlFromPrompt(prompt);

    if (!yamlContent) {
        errors.push('Missing Execution Specification format. Expected YAML with "# --- BEGIN AGENT INPUT ---" markers.');
        return { valid: false, errors, warnings };
    }

    // Parse the YAML
    const spec = parseSimpleYaml(yamlContent);

    // Check required fields
    for (const field of REQUIRED_FIELDS) {
        if (!spec[field] && spec[field] !== '') {
            errors.push(`Missing required field: ${field}`);
        }
    }

    // Validate agent name
    if (spec.agent && !ARKADIAN_AGENTS.includes(spec.agent)) {
        errors.push(`Invalid agent: "${spec.agent}". Must be one of: ${ARKADIAN_AGENTS.join(', ')}`);
    }

    // Validate context_intent
    if (spec.context_intent && !VALID_INTENTS.includes(spec.context_intent)) {
        warnings.push(`Unknown context_intent: "${spec.context_intent}". Expected one of: ${VALID_INTENTS.join(', ')}`);
    }

    // Validate parent_session_id format (should be a UUID-like string)
    if (spec.parent_session_id) {
        if (spec.parent_session_id.length < 8) {
            errors.push('parent_session_id appears invalid (too short). Must be the orchestrator session ID.');
        }
        // Check it matches current session
        // In RESUME MODE, allow parent_session_id from the original session
        const resumeSessionDir = process.env.ARKADIAN_RESUME_SESSION_DIR;
        if (resumeSessionDir) {
            // In resume mode, parent_session_id can be either:
            // - The current session ID (new session created by Claude)
            // - The original session ID from workflow.yaml
            const isCurrentSession = spec.parent_session_id === sessionId;
            const isOriginalSession = resumeSessionDir.includes(spec.parent_session_id);

            if (!isCurrentSession && !isOriginalSession) {
                errors.push(`parent_session_id "${spec.parent_session_id}" doesn't match current session "${sessionId}" or resumed session directory "${resumeSessionDir}"`);
            }
        } else {
            // Normal mode: must match exactly
            if (spec.parent_session_id !== sessionId) {
                errors.push(`parent_session_id "${spec.parent_session_id}" doesn't match current session "${sessionId}"`);
            }
        }
    }

    // Validate session_context
    if (spec.session_context) {
        if (!spec.session_context.session_dir) {
            errors.push('Missing session_context.session_dir');
        }
    }

    // Validate projects array
    if (spec.projects) {
        if (!Array.isArray(spec.projects) && typeof spec.projects === 'object') {
            // It's an object, check for id
            if (!spec.projects.id) {
                warnings.push('projects should be an array with at least one project containing an "id" field');
            }
        }
    }

    // Check for step_id format
    if (spec.step_id && !spec.step_id.match(/^S\d+$/)) {
        warnings.push(`step_id "${spec.step_id}" doesn't follow expected format (S1, S2, etc.)`);
    }

    // Check objective is not empty
    if (spec.objective && spec.objective.length < 10) {
        warnings.push('objective seems too short. Should be 1-2 action-focused sentences.');
    }

    // CRITICAL: Check artifacts_in when depends_on is specified
    // Steps that depend on previous steps MUST include artifacts_in
    const dependsOn = spec.depends_on;
    const artifactsIn = spec.artifacts_in;

    if (dependsOn && Array.isArray(dependsOn) && dependsOn.length > 0) {
        // This step has dependencies - artifacts_in is REQUIRED
        if (!artifactsIn || !Array.isArray(artifactsIn) || artifactsIn.length === 0) {
            errors.push(
                `Step "${spec.step_id}" depends on [${dependsOn.join(', ')}] but has no artifacts_in. ` +
                `You MUST pass artifact paths from prior steps so the agent can read them. ` +
                `Example:\n` +
                `artifacts_in:\n` +
                `  - path: "artifacts/explore/assessment.yaml"\n` +
                `    from_step: "S1"\n` +
                `    description: "Exploration findings"`
            );
        } else {
            // Check that artifacts_in references the dependent steps
            const artifactSteps = artifactsIn
                .map((a: any) => typeof a === 'object' ? a.from_step : null)
                .filter(Boolean);

            for (const dep of dependsOn) {
                // Check if any artifact is from this exact dependency
                // We require at least one artifact from the direct dependency
                const hasArtifactFromDep = artifactSteps.includes(dep);
                if (!hasArtifactFromDep) {
                    warnings.push(
                        `Step depends on "${dep}" but no artifact in artifacts_in has from_step: "${dep}". ` +
                        `Add the artifact output from ${dep} to artifacts_in.`
                    );
                }
            }
        }
    } else if (spec.step_id && spec.step_id !== 'S1' && !spec.step_id.startsWith('QA-')) {
        // Not the first step and not a Q&A step, but no depends_on specified
        // Check if artifacts_in is provided anyway (good practice)
        if (!artifactsIn || !Array.isArray(artifactsIn) || artifactsIn.length === 0) {
            warnings.push(
                `Step "${spec.step_id}" is not S1 but has no depends_on or artifacts_in. ` +
                `If this step should use outputs from previous steps, add artifacts_in.`
            );
        }
    }

    // Validate resume_context if present
    if (spec.resume_context) {
        const resumeCtx = spec.resume_context;

        if (resumeCtx.parent_session_dir) {
            const resolvedDir = resolveEnvVar(resumeCtx.parent_session_dir);
            if (!existsSync(resolvedDir)) {
                warnings.push(
                    `Resume parent session directory not found: ${resolvedDir}. ` +
                    `Artifacts from previous session may not be accessible.`
                );
            }
        }

        if (!resumeCtx.parent_session_id) {
            warnings.push('resume_context is present but missing parent_session_id');
        }

        log(sessionId, 'resume-context', resumeCtx);
    }

    // Validate artifacts_in with from_session field (cross-session artifacts)
    if (artifactsIn && Array.isArray(artifactsIn)) {
        for (const artifact of artifactsIn) {
            if (typeof artifact === 'object' && artifact.from_session) {
                // This is from a previous session - should be absolute path
                const artifactPath = artifact.path;
                if (artifactPath && !artifactPath.startsWith('/') && !artifactPath.startsWith('${')) {
                    errors.push(
                        `Artifact from previous session "${artifact.from_session}" must use ` +
                        `absolute path. Got: ${artifactPath}`
                    );
                } else if (artifactPath) {
                    const resolvedPath = resolveEnvVar(artifactPath);
                    if (!existsSync(resolvedPath)) {
                        warnings.push(
                            `Artifact from previous session not found: ${resolvedPath}. ` +
                            `The agent may not have access to this context.`
                        );
                    }
                }
            }
        }
    }

    // Allow QA-N step_id format for ad-hoc questions
    if (spec.step_id && spec.step_id.startsWith('QA-')) {
        // Q&A steps should have artifacts_in from current session for context
        if (!artifactsIn || !Array.isArray(artifactsIn) || artifactsIn.length === 0) {
            warnings.push(
                `Q&A step "${spec.step_id}" has no artifacts_in. ` +
                `Include current session artifacts for context.`
            );
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        spec
    };
}

/**
 * Validate pipeline prerequisites before agent invocation.
 * Enforces the mandatory guru → PM → developer pipeline for dev workflows.
 *
 * This is the PRIMARY enforcement mechanism — hooks BLOCK if prerequisites are missing.
 */
function validatePipelinePrerequisites(
    sessionId: string,
    spec: Record<string, any>,
    state: SessionState
): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const agent = spec.agent;
    const intent = spec.context_intent;

    // In RESUME MODE, check artifacts in the original session directory
    const resumeSessionDir = process.env.ARKADIAN_RESUME_SESSION_DIR;
    const sessionDir = resumeSessionDir || join(SESSIONS_DIR, sessionId);
    const artifactsDir = join(sessionDir, 'artifacts');

    // ═══════════════════════════════════════════
    // RULE 1: PM requires guru assessment first
    // ═══════════════════════════════════════════
    if (agent === 'ark-project-manager' && intent === 'dev') {
        const assessmentPath = join(artifactsDir, 'explore', 'assessment.yaml');
        if (!existsSync(assessmentPath)) {
            errors.push(
                'ark-project-manager requires guru exploration first. ' +
                'Missing: artifacts/explore/assessment.yaml. ' +
                'Invoke ark-guru with context_intent: dev before ark-project-manager.'
            );
        }
    }

    // ═══════════════════════════════════════════
    // RULE 2: Developer requires both guru + PM artifacts
    // ═══════════════════════════════════════════
    if (agent === 'ark-developer' && intent === 'dev') {
        // Must have guru assessment
        const assessmentPath = join(artifactsDir, 'explore', 'assessment.yaml');
        if (!existsSync(assessmentPath)) {
            errors.push(
                'ark-developer requires guru exploration first. ' +
                'Missing: artifacts/explore/assessment.yaml.'
            );
        }

        // Check if plan phase was required (read assessment to check)
        // If assessment exists and says planning_needed, check for plan artifacts
        if (existsSync(assessmentPath)) {
            try {
                const assessment = readFileSync(assessmentPath, 'utf-8');
                const needsPlan = assessment.includes('requires_spec: true') ||
                    assessment.includes("complexity: 'medium_feature'") ||
                    assessment.includes("complexity: 'large_feature'") ||
                    assessment.includes('complexity: "medium_feature"') ||
                    assessment.includes('complexity: "large_feature"');
                if (needsPlan) {
                    // Check that plan artifacts exist (specs dir should have something)
                    const specsDir = join(sessionDir, 'specs');
                    const hasSpecs = existsSync(specsDir) &&
                        readdirSync(specsDir).length > 0;
                    if (!hasSpecs) {
                        errors.push(
                            'Guru assessment indicates planning is needed but no specs found. ' +
                            'Invoke ark-project-manager before ark-developer.'
                        );
                    }
                }
            } catch (e) {
                warnings.push('Could not read assessment.yaml to check planning requirements.');
            }
        }

    }

    return { errors, warnings };
}

async function main() {
    try {
        const input = await Bun.stdin.text();
        const hookInput: HookInput = JSON.parse(input);

        log(hookInput.session_id, "pre-agent-validator input:", hookInput);

        // Skip if not in orchestrator mode
        if (!ORCHESTRATOR_MODE) {
            log(hookInput.session_id, 'skipping', 'Not in orchestrator mode');
            process.exit(0);
        }

        // Only validate Task tool calls
        if (hookInput.tool_name !== 'Task') {
            process.exit(0);
        }

        const subagentType = hookInput.tool_input?.subagent_type || '';
        const prompt = hookInput.tool_input?.prompt || '';

        log(hookInput.session_id, 'validating', { subagentType, promptLength: prompt.length });

        // Only validate for Arkadian agents
        if (!ARKADIAN_AGENTS.includes(subagentType)) {
            log(hookInput.session_id, 'skipping', `Agent "${subagentType}" is not an Arkadian agent`);
            process.exit(0);
        }

        // Check if session state exists (should be created by session-start-hook)
        const state = getSessionState(hookInput.session_id);
        if (!state) {
            log(hookInput.session_id, 'no-state', 'No session state file found');
            // Don't block - might be a non-orchestrator session
            process.exit(0);
        }

        // Check if workflow.yaml exists in session folder
        const workflowCheck = checkWorkflowExists(hookInput.session_id);
        if (!workflowCheck.exists) {
            const errorMessage = `
❌ WORKFLOW FILE MISSING

Before invoking any agent, you MUST create the workflow file:
  ${workflowCheck.path}

The workflow.yaml file should follow the format in:
  ${ARKADIAN_DIR}/templates/workflows/

Example workflow.yaml structure:
\`\`\`yaml
name: "<workflow_name>"
description: "<what this workflow accomplishes>"
version: "1.0.0"

applies_to:
  primary_intent: "<intent>"
  sub_intent: ["<sub_intent>"]

execution:
  agents: ["<agent1>", "<agent2>"]
  phases:
    - id: "S1"
      name: "<phase name>"
      agent: "<agent>"
      depends_on: null
      approval_required: true
      actions:
        - "<action 1>"
        - "<action 2>"
      timeout_seconds: 900
\`\`\`

Create this file with your approved plan before invoking agents.
`;
            console.error(errorMessage);
            process.exit(2);
        }

        // Validate the execution specification
        const result = validateExecutionSpec(hookInput.session_id, prompt);

        log(hookInput.session_id, 'validation-result', result);

        if (!result.valid) {
            // Block the tool call with error message
            const specTemplatePath = join(ARKADIAN_DIR, 'templates/sub_agent_input_spec.md');

            const errorMessage = `
❌ EXECUTION SPECIFICATION VALIDATION FAILED

Agent: ${subagentType}

Errors:
${result.errors.map(e => `  • ${e}`).join('\n')}

${result.warnings.length > 0 ? `Warnings:\n${result.warnings.map(w => `  ⚠️ ${w}`).join('\n')}` : ''}

📄 See specification format: ${specTemplatePath}

Required format summary:

\`\`\`yaml
# --- BEGIN AGENT INPUT ---
step_id: "S1"
agent: "${subagentType}"
objective: "<1-2 action-focused sentences>"
user_request: "<original request>"
context_intent: "<qna|dev|qa|debug|monitoring|pr_review|research|progress_tracking>"
parent_session_id: "${hookInput.session_id}"  # ◄── MUST match this session

session_context:
  session_dir: "${join(SESSIONS_DIR, hookInput.session_id)}"
  artifacts_dir: "${join(SESSIONS_DIR, hookInput.session_id, 'artifacts')}"
  specs_dir: "${join(SESSIONS_DIR, hookInput.session_id, 'specs')}"

projects:
  - id: "<project_id>"
    doc_source:
      arkadian_root: "\${ARKADIAN_DIR}/docs"
      project_index: "\${ARKADIAN_DIR}/docs/projects/<project_id>/INDEX.md"
      sections: []
    repo_source:
      repo_root: "\${PROJECT_REPO}"
      preferred_paths: []
    scripts_hint: []

docs_hint:
  project_index_path: "\${ARKADIAN_DIR}/docs/INDEX.md"

problem_context: {}
success_criteria: []
expected_outputs: []
depends_on: []

runtime:
  resolve_envs: true
  allow_external: false

artifacts_in: []
artifacts_out: []
# --- END AGENT INPUT ---
\`\`\`
`;
            console.error(errorMessage);
            process.exit(2);
        }

        // ═══════════════════════════════════════════
        // Pipeline prerequisite validation
        // ═══════════════════════════════════════════
        if (result.spec) {
            const pipelineResult = validatePipelinePrerequisites(hookInput.session_id, result.spec, state);
            if (pipelineResult.errors.length > 0) {
                const pipelineErrorMessage = `
❌ PIPELINE PREREQUISITE FAILURE

${pipelineResult.errors.map(e => `  • ${e}`).join('\n')}

${pipelineResult.warnings.length > 0 ? `Warnings:\n${pipelineResult.warnings.map(w => `  ⚠️ ${w}`).join('\n')}` : ''}

The mandatory pipeline is: ark-guru (explore) → ark-project-manager (plan) → ark-developer (implement).
Each phase must complete and produce its artifacts before the next can start.
`;
                console.error(pipelineErrorMessage);
                log(hookInput.session_id, 'pipeline-prerequisite-failure', pipelineResult.errors);
                process.exit(2);
            }
            // Merge pipeline warnings into result warnings
            if (pipelineResult.warnings.length > 0) {
                result.warnings.push(...pipelineResult.warnings);
            }
        }

        // Valid specification - proceed with agent setup

        // 1. Set active_agent in state (for sub-agent guardrail routing)
        if (result.spec) {
            const agentSet = setActiveAgent(hookInput.session_id, result.spec, subagentType);
            if (!agentSet) {
                log(hookInput.session_id, 'warning', 'Failed to set active_agent in state');
            }

            // 2. Save spec to session specs folder
            const yamlContent = extractYamlFromPrompt(prompt);
            if (yamlContent && result.spec.step_id) {
                saveSpec(hookInput.session_id, result.spec.step_id, yamlContent);
            }
        }

        // Log warnings if any
        if (result.warnings.length > 0) {
            log(hookInput.session_id, 'validation-warnings', result.warnings);
        }

        log(hookInput.session_id, 'agent-invocation-approved', { agent: subagentType, step_id: result.spec?.step_id });
        process.exit(0);
    } catch (error: any) {
        // Try to log error
        try {
            const input = await Bun.stdin.text();
            const hookInput = JSON.parse(input);
            log(hookInput.session_id, 'error', { message: error.message, stack: error.stack });
        } catch (e) {
            // Ignore
        }
        // Don't block on hook errors - let the tool call proceed
        process.exit(0);
    }
}

main();
