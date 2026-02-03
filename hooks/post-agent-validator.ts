#!/usr/bin/env bun

/**
 * Arkadian Post-Agent Validator Hook
 *
 * SubagentStop hook that validates agent output after completion.
 *
 * Responsibilities:
 * 1. Check expected artifacts were created (from active_agent.expected_artifacts)
 * 2. Update phase status in session state
 * 3. Clear active_agent from session state
 * 4. Output structured result for orchestrator
 *
 * State Interaction:
 * - Reads: {DATA_DIR}/{session_id}_state.json → active_agent
 * - Writes: phases[spec_id].validation, active_agent = null
 *
 * Hook Input (SubagentStop):
 * - session_id: string
 * - transcript_path: string
 * - permission_mode: string
 * - hook_event_name: "SubagentStop"
 * - stop_hook_active: boolean
 *
 * Output (to stderr, for orchestrator visibility):
 * - Structured completion message with status
 *
 * Exit codes:
 * - 0: Always (SubagentStop cannot block, only log)
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  convertTasksMdToBeads,
  createFeatureEpic,
  logBeadsOperation
} from './beads-bridge';

const ARKADIAN_DIR = process.env.ARKADIAN_DIR || process.env.HOME + '/code/go/arkadian';
const SESSIONS_DIR = join(ARKADIAN_DIR, 'sessions');

// Use ARKADIAN_DATA_DIR for runtime state (OS-specific data directory)
const ARKADIAN_DATA_DIR = process.env.ARKADIAN_DATA_DIR || join(ARKADIAN_DIR, 'log');

// Only process in orchestrator mode
const ORCHESTRATOR_MODE = process.env.ARKADIAN_ORCHESTRATOR_MODE === '1';

interface HookInput {
    session_id: string;
    transcript_path: string;
    permission_mode: string;
    hook_event_name: string;
    stop_hook_active: boolean;
}

interface ActiveAgent {
    agent_type: string;
    spec_id: string;
    invoked_at: string;
    expected_artifacts: Array<string | { path: string; description?: string }>;
    allowed_tools: string[];
    allowed_paths: string[];
    blocked_paths: string[];
}

interface PhaseValidation {
    passed: boolean;
    missing: string[];
    found: string[];
    validated_at: string;
}

interface PhaseState {
    status: 'pending' | 'awaiting_spec_approval' | 'in_progress' | 'completed' | 'failed' | 'skipped';
    agent: string;
    started_at?: string;
    completed_at?: string;
    artifacts_expected?: string[];
    artifacts_created?: string[];
    validation?: PhaseValidation;
    skip_reason?: string;
    beads_issues?: Record<string, string>;  // task_id -> beads_id
    beads_feature_epic_id?: string;
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
    phases: Record<string, PhaseState>;
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

    let output = `[${timestamp}] [post-agent-validator] ${label}: `;
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
function updateSessionState(sessionId: string, state: SessionState): boolean {
    const stateFile = join(ARKADIAN_DATA_DIR, `${sessionId}_state.json`);

    try {
        writeFileSync(stateFile, JSON.stringify(state, null, 2));
        log(sessionId, 'state-updated', 'Success');
        return true;
    } catch (e: any) {
        log(sessionId, 'state-update-error', e.message);
        return false;
    }
}

/**
 * Resolve artifact path relative to session directory
 */
function resolveArtifactPath(sessionId: string, artifactPath: string): string {
    // If already absolute, use as-is
    if (artifactPath.startsWith('/')) {
        return artifactPath;
    }

    // If starts with session-relative markers, resolve
    if (artifactPath.startsWith('artifacts/')) {
        return join(SESSIONS_DIR, sessionId, artifactPath);
    }
    if (artifactPath.startsWith('specs/')) {
        return join(SESSIONS_DIR, sessionId, artifactPath);
    }

    // Default: assume relative to session artifacts
    return join(SESSIONS_DIR, sessionId, 'artifacts', artifactPath);
}

/**
 * Expected artifact can be either a string path or an object with path and description
 */
type ExpectedArtifact = string | { path: string; description?: string };

/**
 * Extract the path from an expected artifact (handles both string and object formats)
 */
function getArtifactPath(artifact: ExpectedArtifact): string {
    if (typeof artifact === 'string') {
        return artifact;
    }
    return artifact.path || '';
}

/**
 * Extract feature ID from spec ID
 * Example: "S3" or "pm-phase-3" -> "003"
 */
function extractFeatureId(specId: string): string {
    // For ark-project-manager, feature ID is in specs path
    // Default: use spec ID or extract from session context
    return specId.replace(/^S/, '').padStart(3, '0');  // S3 -> "003"
}

/**
 * Extract project ID from session directory structure
 * Look for specs/<project_id>/<feature_id>/ pattern
 */
function extractProjectId(sessionDir: string, featureId: string): string {
    const specsDir = join(sessionDir, 'specs');
    if (existsSync(specsDir)) {
        const projects = readdirSync(specsDir);
        for (const project of projects) {
            const featureDir = join(specsDir, project, featureId);
            if (existsSync(featureDir)) {
                return project;
            }
        }
    }
    return 'misc';  // Fallback
}

/**
 * Extract feature name from tasks.md title
 * Read first line: "# Tasks: Feature Name" -> "Feature Name"
 */
function extractFeatureName(tasksMdPath: string): string {
    try {
        const content = readFileSync(tasksMdPath, 'utf-8');
        const match = content.match(/^#\s*Tasks:\s*(.+)$/m);
        if (match) {
            return match[1].trim();
        }
    } catch (e) {
        // Ignore
    }
    return 'Unnamed Feature';
}

/**
 * Check if expected artifacts exist
 */
function validateArtifacts(sessionId: string, expectedArtifacts: ExpectedArtifact[]): PhaseValidation {
    const missing: string[] = [];
    const found: string[] = [];

    for (const artifact of expectedArtifacts) {
        const artifactPath = getArtifactPath(artifact);
        if (!artifactPath) {
            log(sessionId, 'artifact-invalid', { artifact, reason: 'No path found' });
            continue;
        }

        const resolvedPath = resolveArtifactPath(sessionId, artifactPath);

        if (existsSync(resolvedPath)) {
            found.push(artifactPath);
            log(sessionId, 'artifact-found', { artifact: artifactPath, path: resolvedPath });
        } else {
            missing.push(artifactPath);
            log(sessionId, 'artifact-missing', { artifact: artifactPath, expected_path: resolvedPath });
        }
    }

    return {
        passed: missing.length === 0,
        missing,
        found,
        validated_at: new Date().toISOString()
    };
}

async function main() {
    try {
        const input = await Bun.stdin.text();
        const hookInput: HookInput = JSON.parse(input);

        log(hookInput.session_id, 'post-agent-validator input:', hookInput);

        // Skip if not in orchestrator mode
        if (!ORCHESTRATOR_MODE) {
            log(hookInput.session_id, 'skipping', 'Not in orchestrator mode');
            process.exit(0);
        }

        // Only process SubagentStop events
        if (hookInput.hook_event_name !== 'SubagentStop') {
            log(hookInput.session_id, 'skipping', `Not SubagentStop: ${hookInput.hook_event_name}`);
            process.exit(0);
        }

        // Get session state
        const state = getSessionState(hookInput.session_id);
        if (!state) {
            log(hookInput.session_id, 'no-state', 'No session state file found');
            process.exit(0);
        }

        // Check if there was an active agent
        if (!state.active_agent) {
            log(hookInput.session_id, 'no-active-agent', 'No active agent recorded - skipping validation');
            process.exit(0);
        }

        const activeAgent = state.active_agent;
        const specId = activeAgent.spec_id;

        log(hookInput.session_id, 'validating-agent-output', {
            agent: activeAgent.agent_type,
            spec_id: specId,
            expected_artifacts: activeAgent.expected_artifacts
        });

        // Validate artifacts
        const validation = validateArtifacts(hookInput.session_id, activeAgent.expected_artifacts);

        // Detect tasks.md creation (ark-project-manager Phase 3 completion)
        let beadsConversionResult: any = null;
        const tasksMdArtifact = validation.found.find(a => a.endsWith('tasks.md'));

        if (tasksMdArtifact && state.beads?.enabled) {
            try {
                log(hookInput.session_id, 'tasks-md-detected', { artifact: tasksMdArtifact });

                // Extract feature context
                const sessionDir = join(SESSIONS_DIR, hookInput.session_id);
                const featureId = extractFeatureId(specId);  // e.g., "001"
                const projectId = extractProjectId(sessionDir, featureId);  // e.g., "arkadian"

                // Get or create feature epic
                let featureEpicId = state.beads.feature_epics[featureId];
                if (!featureEpicId && state.beads.session_epic_id) {
                    const tasksMdPath = resolveArtifactPath(hookInput.session_id, tasksMdArtifact);
                    const featureName = extractFeatureName(tasksMdPath);
                    featureEpicId = await createFeatureEpic(
                        hookInput.session_id,
                        projectId,
                        featureId,
                        featureName,
                        state.beads.session_epic_id
                    );

                    if (featureEpicId) {
                        state.beads.feature_epics[featureId] = featureEpicId;
                        log(hookInput.session_id, 'beads-feature-epic-created', {
                            feature_id: featureId,
                            epic_id: featureEpicId
                        });
                    }
                }

                // Convert tasks.md to beads issues
                if (featureEpicId) {
                    const tasksMdPath = resolveArtifactPath(hookInput.session_id, tasksMdArtifact);
                    beadsConversionResult = await convertTasksMdToBeads(
                        tasksMdPath,
                        featureEpicId,
                        hookInput.session_id,
                        projectId,
                        featureId
                    );

                    log(hookInput.session_id, 'beads-conversion-result', beadsConversionResult);

                    // Store task mappings in phase state
                    if (beadsConversionResult.success) {
                        if (!state.phases[specId]) {
                            state.phases[specId] = {
                                status: 'in_progress',
                                agent: activeAgent.agent_type,
                                started_at: activeAgent.invoked_at
                            };
                        }
                        state.phases[specId].beads_issues = beadsConversionResult.issues;
                        state.phases[specId].beads_feature_epic_id = featureEpicId;
                    }
                }
            } catch (error: any) {
                log(hookInput.session_id, 'beads-conversion-error', {
                    error: error.message,
                    stack: error.stack
                });
                // Don't fail validation on beads errors
            }
        }

        // Update phase state
        if (!state.phases[specId]) {
            state.phases[specId] = {
                status: 'in_progress',
                agent: activeAgent.agent_type,
                started_at: activeAgent.invoked_at
            };
        }

        state.phases[specId].validation = validation;
        state.phases[specId].completed_at = new Date().toISOString();
        state.phases[specId].artifacts_expected = activeAgent.expected_artifacts;
        state.phases[specId].artifacts_created = validation.found;

        if (validation.passed) {
            state.phases[specId].status = 'completed';
            log(hookInput.session_id, 'phase-completed', {
                spec_id: specId,
                agent: activeAgent.agent_type,
                artifacts: validation.found
            });
        } else {
            state.phases[specId].status = 'failed';
            log(hookInput.session_id, 'phase-failed', {
                spec_id: specId,
                agent: activeAgent.agent_type,
                missing: validation.missing
            });
        }

        // Clear active_agent (sub-agent is done)
        state.active_agent = null;

        // Save updated state
        updateSessionState(hookInput.session_id, state);

        // Output structured completion message for orchestrator
        const resultMessage = validation.passed
            ? `
═══════════════════════════════════════════════════════════════════
AGENT_COMPLETE: ${activeAgent.agent_type} (${specId})
ARTIFACTS_VALID: true
STATUS: Phase completed successfully
ARTIFACTS: ${validation.found.join(', ')}
═══════════════════════════════════════════════════════════════════
`
            : `
═══════════════════════════════════════════════════════════════════
AGENT_COMPLETE: ${activeAgent.agent_type} (${specId})
ARTIFACTS_VALID: false
STATUS: Missing expected artifacts
MISSING: ${validation.missing.join(', ')}
═══════════════════════════════════════════════════════════════════
→ Orchestrator: Investigate missing artifacts
`;

        console.error(resultMessage);

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
        // SubagentStop cannot block
        process.exit(0);
    }
}

main();
