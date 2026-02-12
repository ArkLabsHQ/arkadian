#!/usr/bin/env bun

/**
 * Arkadian Post-Agent Validator Hook
 *
 * SubagentStop hook that validates agent output after completion.
 *
 * Responsibilities:
 * 1. Check expected artifacts were created (from active_agent.expected_artifacts)
 * 2. Load and validate _result.json (agent result manifest)
 * 3. Run per-agent contract validation (hard gates + warnings)
 * 4. Inspect artifact content (size, headings)
 * 5. Compute outcome (passed/partial/failed/crash)
 * 6. Track retry eligibility
 * 7. Update phase status in session state
 * 8. Clear active_agent from session state
 * 9. Output structured result for orchestrator
 *
 * State Interaction:
 * - Reads: {DATA_DIR}/{session_id}_state.json → active_agent
 * - Writes: phases[spec_id].validation (extended), active_agent = null
 *
 * Hook Input (SubagentStop):
 * - session_id: string
 * - transcript_path: string
 * - permission_mode: string
 * - hook_event_name: "SubagentStop"
 * - stop_hook_active: boolean
 *
 * Output (to stderr, for orchestrator visibility):
 * - Structured validation message with outcome, failures, warnings, retry guidance
 *
 * Exit codes:
 * - 0: Always (SubagentStop cannot block, only log)
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  AGENT_CONTRACTS,
  validateAgentResult,
  computeRetryGuidance,
  formatSize,
  type ResultJson,
  type ExtendedValidationResult,
  type ValidationOutcome,
} from './validation-contracts';

const ARKADIAN_DIR = process.env.ARKADIAN_DIR || process.env.HOME + '/code/go/arkadian';
const SESSIONS_DIR = join(ARKADIAN_DIR, 'sessions');

// Use ARKADIAN_DATA_DIR for runtime state (OS-specific data directory)
const ARKADIAN_DATA_DIR = process.env.ARKADIAN_DATA_DIR || join(ARKADIAN_DIR, 'log');

// Only process in orchestrator mode
const ORCHESTRATOR_MODE = process.env.ARKADIAN_ORCHESTRATOR_MODE === '1';

const MAX_RETRY_ATTEMPTS = 3;

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
    context_intent?: string;
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
    extended_validation?: ExtendedValidationResult;
    retry_count?: number;
    skip_reason?: string;
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
 * Check if expected artifacts exist (Tier 1 - file existence)
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

/**
 * Load _result.json from the session artifacts directory.
 * Searches multiple locations: artifacts root, per-step subfolder, and direct paths.
 */
function loadResultJson(sessionId: string, specId: string): ResultJson | null {
    const artifactsDir = join(SESSIONS_DIR, sessionId, 'artifacts');

    // Search locations for _result.json
    const searchPaths = [
        join(artifactsDir, '_result.json'),
        join(artifactsDir, specId.toLowerCase(), '_result.json'),
        join(artifactsDir, 'implement', '_result.json'),
        join(artifactsDir, 'explore', '_result.json'),
        join(artifactsDir, 'qna', '_result.json'),
        join(artifactsDir, 'review', '_result.json'),
        join(artifactsDir, 'research', '_result.json'),
        join(artifactsDir, 'investigate', '_result.json'),
        join(artifactsDir, 'progress', '_result.json'),
    ];

    for (const searchPath of searchPaths) {
        if (existsSync(searchPath)) {
            try {
                const content = readFileSync(searchPath, 'utf-8');
                const parsed = JSON.parse(content);
                log(sessionId, 'result-json-found', { path: searchPath });
                return parsed as ResultJson;
            } catch (e: any) {
                log(sessionId, 'result-json-parse-error', { path: searchPath, error: e.message });
            }
        }
    }

    log(sessionId, 'result-json-not-found', { searched: searchPaths.length });
    return null;
}

/**
 * Build the structured stderr message for the orchestrator.
 */
function buildValidationMessage(
    agentType: string,
    specId: string,
    extResult: ExtendedValidationResult,
    artifactValidation: PhaseValidation
): string {
    const lines: string[] = [];
    lines.push('================================================================');
    lines.push(`AGENT_VALIDATION: ${agentType} (${specId})`);
    lines.push(`OUTCOME: ${extResult.outcome}`);

    if (extResult.retry_eligible) {
        lines.push(`RETRY_ELIGIBLE: true (attempt ${extResult.retry_attempt} of ${MAX_RETRY_ATTEMPTS})`);
    } else if (extResult.outcome === 'failed' || extResult.outcome === 'crash') {
        lines.push(`RETRY_ELIGIBLE: false (attempt ${extResult.retry_attempt} of ${MAX_RETRY_ATTEMPTS})`);
    }

    if (extResult.agent_status) {
        lines.push(`AGENT_STATUS: ${extResult.agent_status}`);
    }
    if (extResult.agent_confidence) {
        lines.push(`AGENT_CONFIDENCE: ${extResult.agent_confidence}`);
    }

    // Hard gate failures
    if (extResult.hard_gate_failures.length > 0) {
        lines.push('');
        lines.push(`HARD GATE FAILURES (${extResult.hard_gate_failures.length}):`);
        for (const f of extResult.hard_gate_failures) {
            lines.push(`  [${f.check.id}] ${f.message}`);
            lines.push(`              -> ${f.check.remediation}`);
        }
    }

    // Warnings
    if (extResult.warnings.length > 0) {
        lines.push('');
        lines.push(`WARNINGS (${extResult.warnings.length}):`);
        for (const w of extResult.warnings) {
            lines.push(`  [${w.check.id}] ${w.message}`);
        }
    }

    // Artifact summary
    const totalExpected = artifactValidation.found.length + artifactValidation.missing.length;
    lines.push('');
    lines.push(`ARTIFACTS: ${artifactValidation.found.length} of ${totalExpected} expected found`);
    for (const f of artifactValidation.found) {
        const resolved = resolveArtifactPath('', f);  // Just for size display
        let sizeStr = '';
        try {
            const fullPath = join(SESSIONS_DIR, '', f);
            // Best effort size
        } catch {}
        lines.push(`  [OK] ${f}`);
    }
    for (const m of artifactValidation.missing) {
        lines.push(`  [MISSING] ${m}`);
    }

    // Contract artifact checks
    for (const ac of extResult.artifact_checks) {
        if (!ac.found) {
            lines.push(`  [MISSING] ${ac.path} (contract-required)`);
        } else {
            const sizeStr = ac.size !== null ? ` (${formatSize(ac.size)})` : '';
            const headingStr = ac.heading_ok === false ? ' [HEADINGS MISSING]' : '';
            lines.push(`  [OK] ${ac.path}${sizeStr}${headingStr}`);
        }
    }

    // Retry guidance
    if (extResult.retry_guidance) {
        lines.push('');
        lines.push('RETRY GUIDANCE:');
        for (const line of extResult.retry_guidance.split('\n')) {
            lines.push(`  ${line}`);
        }
    }

    lines.push('================================================================');
    return '\n' + lines.join('\n') + '\n';
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

        // ═══════════════════════════════════════════════
        // TIER 1: File existence check (existing logic)
        // ═══════════════════════════════════════════════
        const validation = validateArtifacts(hookInput.session_id, activeAgent.expected_artifacts);

        // ═══════════════════════════════════════════════
        // TIER 2: Load _result.json
        // ═══════════════════════════════════════════════
        const resultJson = loadResultJson(hookInput.session_id, specId);

        // Get retry count from previous phase state
        const previousRetryCount = state.phases[specId]?.retry_count || 0;
        const currentAttempt = previousRetryCount + 1;

        // ═══════════════════════════════════════════════
        // TIER 3 & 4: Contract validation + content inspection
        // ═══════════════════════════════════════════════
        let extResult: ExtendedValidationResult;

        if (!resultJson) {
            // CRASH: Agent didn't write _result.json
            log(hookInput.session_id, 'result-json-missing', { agent: activeAgent.agent_type });

            extResult = {
                outcome: 'crash',
                hard_gate_failures: [],
                warnings: [],
                artifact_checks: [],
                retry_eligible: currentAttempt < MAX_RETRY_ATTEMPTS,
                retry_attempt: currentAttempt,
                retry_guidance: `Agent ${activeAgent.agent_type} did not write _result.json. Re-invoke and ensure agent writes _result.json as its last action.`,
                result_json_found: false,
                agent_status: null,
                agent_confidence: null,
            };
        } else {
            // Run contract-driven validation
            const artifactsDir = join(SESSIONS_DIR, hookInput.session_id, 'artifacts');
            const contractResult = validateAgentResult(activeAgent.agent_type, resultJson, artifactsDir);

            // Compute outcome
            let outcome: ValidationOutcome;
            if (contractResult.failures.length > 0) {
                outcome = 'failed';
            } else if (resultJson.status === 'partial') {
                outcome = 'partial';
            } else {
                outcome = 'passed';
            }

            const retryEligible = (outcome === 'failed' || outcome === 'crash') && currentAttempt < MAX_RETRY_ATTEMPTS;
            const retryGuidance = retryEligible ? computeRetryGuidance(contractResult.failures, activeAgent.agent_type) : '';

            extResult = {
                outcome,
                hard_gate_failures: contractResult.failures,
                warnings: contractResult.warnings,
                artifact_checks: contractResult.artifactChecks,
                retry_eligible: retryEligible,
                retry_attempt: currentAttempt,
                retry_guidance: retryGuidance,
                result_json_found: true,
                agent_status: resultJson.status,
                agent_confidence: resultJson.confidence,
            };

            log(hookInput.session_id, 'contract-validation', {
                agent: activeAgent.agent_type,
                outcome,
                hard_gate_failures: contractResult.failures.length,
                warnings: contractResult.warnings.length,
                artifact_checks: contractResult.artifactChecks.length,
            });
        }

        // ═══════════════════════════════════════════════
        // PIPELINE OUTPUT ENFORCEMENT
        // ═══════════════════════════════════════════════
        if (activeAgent.agent_type === 'ark-guru' && activeAgent.context_intent === 'dev') {
            // Guru MUST produce assessment.yaml in dev mode
            const assessmentPath = join(SESSIONS_DIR, hookInput.session_id, 'artifacts', 'explore', 'assessment.yaml');
            if (!existsSync(assessmentPath)) {
                extResult.hard_gate_failures.push({
                    check: {
                        id: 'HG-PIPE-GURU-01',
                        field: 'assessment.yaml',
                        severity: 'hard',
                        description: 'Guru must produce assessment.yaml in dev mode',
                        remediation: 'Re-invoke ark-guru with context_intent: dev. Agent must write artifacts/explore/assessment.yaml with complexity, affected_scope, testing_recommendation, and planning_needed fields.'
                    },
                    actual: 'missing',
                    message: 'artifacts/explore/assessment.yaml not found. Guru must write structured assessment in dev mode.'
                });
                if (extResult.outcome === 'passed') extResult.outcome = 'failed';
            }
        }

        log(hookInput.session_id, 'pipeline-output-checks', {
            agent: activeAgent.agent_type,
            context_intent: activeAgent.context_intent,
            pipeline_failures: extResult.hard_gate_failures.filter(f => f.check.id.startsWith('HG-PIPE')).length
        });

        // ═══════════════════════════════════════════════
        // Update phase state with extended validation
        // ═══════════════════════════════════════════════
        if (!state.phases[specId]) {
            state.phases[specId] = {
                status: 'in_progress',
                agent: activeAgent.agent_type,
                started_at: activeAgent.invoked_at
            };
        }

        state.phases[specId].validation = validation;
        state.phases[specId].extended_validation = extResult;
        state.phases[specId].completed_at = new Date().toISOString();
        state.phases[specId].artifacts_expected = activeAgent.expected_artifacts;
        state.phases[specId].artifacts_created = validation.found;
        state.phases[specId].retry_count = currentAttempt;

        // Set phase status based on extended validation outcome
        switch (extResult.outcome) {
            case 'passed':
                state.phases[specId].status = 'completed';
                log(hookInput.session_id, 'phase-completed', {
                    spec_id: specId,
                    agent: activeAgent.agent_type,
                    artifacts: validation.found
                });
                break;
            case 'partial':
                state.phases[specId].status = 'completed';  // Partial is still completed
                log(hookInput.session_id, 'phase-partial', {
                    spec_id: specId,
                    agent: activeAgent.agent_type,
                    warnings: extResult.warnings.length
                });
                break;
            case 'failed':
            case 'crash':
                state.phases[specId].status = 'failed';
                log(hookInput.session_id, 'phase-failed', {
                    spec_id: specId,
                    agent: activeAgent.agent_type,
                    outcome: extResult.outcome,
                    failures: extResult.hard_gate_failures.length,
                    retry_eligible: extResult.retry_eligible
                });
                break;
        }

        // Clear active_agent (sub-agent is done)
        state.active_agent = null;

        // Save updated state
        updateSessionState(hookInput.session_id, state);

        // ═══════════════════════════════════════════════
        // Output structured validation message
        // ═══════════════════════════════════════════════
        const resultMessage = buildValidationMessage(
            activeAgent.agent_type,
            specId,
            extResult,
            validation
        );

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
