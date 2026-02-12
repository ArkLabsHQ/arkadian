/**
 * Arkadian Agent Validation Contracts
 *
 * Defines per-agent validation gates (hard gates + warnings) and
 * provides functions to validate agent _result.json outputs.
 *
 * Used by post-agent-validator.ts (SubagentStop hook).
 */

import { existsSync, readFileSync, statSync } from 'fs';

// ========================================
// INTERFACES
// ========================================

export interface ValidationCheck {
    id: string;
    field: string;
    severity: 'hard' | 'warn';
    description: string;
    remediation: string;
}

export interface ValidationFailure {
    check: ValidationCheck;
    actual: any;
    message: string;
}

export interface ArtifactRequirement {
    path: string;
    minBytes: number;
    requiredHeadings?: string[];
}

export interface AgentContract {
    agentType: string;
    requiredArtifacts: ArtifactRequirement[];
    hardGates: ValidationCheck[];
    warnings: ValidationCheck[];
}

export interface ResultJson {
    schema_version: string;
    agent: string;
    step_id: string;
    status: 'success' | 'failure' | 'partial';
    completed_at: string;
    confidence: 'high' | 'medium' | 'low';
    summary: string;
    artifacts_produced: Array<{ path: string; type: string }>;
    success_criteria_met: Array<{ id: string; description: string; satisfied: boolean }>;
    issues_encountered: any[];
    handover: { needed: boolean; to: string; reason: string };
    agent_specific: Record<string, any>;
}

export type ValidationOutcome = 'passed' | 'partial' | 'failed' | 'crash';

export interface ExtendedValidationResult {
    outcome: ValidationOutcome;
    hard_gate_failures: ValidationFailure[];
    warnings: ValidationFailure[];
    artifact_checks: Array<{ path: string; found: boolean; size: number | null; heading_ok: boolean | null }>;
    retry_eligible: boolean;
    retry_attempt: number;
    retry_guidance: string;
    result_json_found: boolean;
    agent_status: string | null;
    agent_confidence: string | null;
}

// ========================================
// PER-AGENT CONTRACTS
// ========================================

const DEV_CONTRACT: AgentContract = {
    agentType: 'ark-developer',
    requiredArtifacts: [
        { path: 'detailed_report.md', minBytes: 200, requiredHeadings: ['Implementation Report', 'Changes Made'] },
        { path: 'test-evidence.md', minBytes: 200, requiredHeadings: ['Test Evidence', 'Manual Testing'] },
    ],
    hardGates: [
        { id: 'HG-DEV-01', field: 'agent_specific.build_passed', severity: 'hard', description: 'Build must pass', remediation: 'Fix compilation errors before reporting success' },
        { id: 'HG-DEV-02', field: 'agent_specific.tests.failed', severity: 'hard', description: 'Zero test failures expected', remediation: 'Fix failing tests or set status=partial with justification' },
        { id: 'HG-DEV-03', field: 'agent_specific.manual_test_passed', severity: 'hard', description: 'Must manually test the feature', remediation: 'Run manual tests via CLI/API/curl, capture output in test-evidence.md, set manual_test_passed=true' },
        { id: 'HG-DEV-04', field: 'agent_specific.integration_test_written', severity: 'hard', description: 'Must write at least one integration test with happy path', remediation: 'Write and run at least one integration test covering the happy path, set integration_test_written=true' },
    ],
    warnings: [
        { id: 'W-DEV-01', field: 'agent_specific.tests.skipped', severity: 'warn', description: 'Skipped tests detected', remediation: 'Review whether skipped tests are intentional' },
        { id: 'W-DEV-02', field: 'confidence', severity: 'warn', description: 'Low confidence flagged', remediation: 'Review agent output for uncertainty' },
    ],
};

const GURU_CONTRACT: AgentContract = {
    agentType: 'ark-guru',
    requiredArtifacts: [
        { path: 'qna/response.md', minBytes: 200 },
    ],
    hardGates: [
        { id: 'HG-GURU-01', field: 'status', severity: 'hard', description: 'Must produce an answer (status != failure)', remediation: 'Re-invoke with clearer question or broader docs scope' },
    ],
    warnings: [
        { id: 'W-GURU-01', field: 'agent_specific.files_referenced', severity: 'warn', description: 'Protocol answers should cite code files', remediation: 'Consider re-running with code access' },
        { id: 'W-GURU-02', field: 'confidence', severity: 'warn', description: 'Low confidence flagged', remediation: 'Review answer quality, may need researcher backup' },
    ],
};

const PR_REVIEWER_CONTRACT: AgentContract = {
    agentType: 'ark-pr-reviewer',
    requiredArtifacts: [
        { path: 'review_report.md', minBytes: 200, requiredHeadings: ['Review Summary', 'How to Review This PR', 'Reviewer Attention Map'] },
    ],
    hardGates: [
        { id: 'HG-PR-02', field: 'agent_specific.risk_level', severity: 'hard', description: 'Must assess risk level', remediation: 'Ensure review includes risk assessment (low/medium/high)' },
        { id: 'HG-PR-03', field: 'agent_specific.attention_areas_count', severity: 'hard', description: 'Must surface attention areas for the reviewer', remediation: 'Produce a ranked attention map with at least one area needing review' },
    ],
    warnings: [
        { id: 'W-PR-01', field: 'agent_specific.recommendations_count', severity: 'warn', description: 'No recommendations produced', remediation: 'Review may be too superficial' },
        { id: 'W-PR-02', field: 'agent_specific.draft_comments_count', severity: 'warn', description: 'No draft review comments prepared', remediation: 'Should prepare draft inline comments for the reviewer to use' },
    ],
};

const PM_CONTRACT: AgentContract = {
    agentType: 'ark-project-manager',
    requiredArtifacts: [],  // Dynamic: depends on phase_completed
    hardGates: [
        { id: 'HG-PM-01', field: 'agent_specific.phase_completed', severity: 'hard', description: 'Must complete the expected phase', remediation: 'Re-invoke to complete the correct phase' },
    ],
    warnings: [
        { id: 'W-PM-01', field: 'agent_specific.cross_artifact_consistency', severity: 'warn', description: 'Cross-artifact consistency issues', remediation: 'Run pm-analyze to resolve inconsistencies' },
    ],
};

const RESEARCHER_CONTRACT: AgentContract = {
    agentType: 'ark-researcher',
    requiredArtifacts: [
        { path: 'research_report.md', minBytes: 200, requiredHeadings: ['Research Report', 'Key Findings'] },
    ],
    hardGates: [
        { id: 'HG-RES-01', field: 'agent_specific.sources_count', severity: 'hard', description: 'Must cite sources', remediation: 'Re-invoke with broader search scope' },
    ],
    warnings: [
        { id: 'W-RES-01', field: 'agent_specific.confidence_overall', severity: 'warn', description: 'Very low confidence (< 30)', remediation: 'Results may be unreliable, consider deep research mode' },
    ],
};

const OBSERVER_CONTRACT: AgentContract = {
    agentType: 'ark-observer',
    requiredArtifacts: [
        { path: 'investigation_report.md', minBytes: 200, requiredHeadings: ['Investigation Report', 'Root Cause'] },
    ],
    hardGates: [
        { id: 'HG-OBS-01', field: 'agent_specific.telemetry_sources_queried', severity: 'hard', description: 'Must query telemetry sources', remediation: 'Ensure telemetry stack is accessible and re-invoke' },
    ],
    warnings: [
        { id: 'W-OBS-01', field: 'agent_specific.severity', severity: 'warn', description: 'High severity finding', remediation: 'Escalate urgently to user' },
    ],
};

const PROGRESS_CONTRACT: AgentContract = {
    agentType: 'ark-progress-tracker',
    requiredArtifacts: [
        { path: 'progress_report.md', minBytes: 200 },
    ],
    hardGates: [
        { id: 'HG-PROG-01', field: 'agent_specific.projects_analyzed', severity: 'hard', description: 'Must analyze at least one project', remediation: 'Check GitHub access and re-invoke' },
    ],
    warnings: [
        { id: 'W-PROG-01', field: 'agent_specific.prs_analyzed', severity: 'warn', description: 'No PRs analyzed', remediation: 'May indicate GitHub access issues or quiet period' },
    ],
};

// ========================================
// PIPELINE ENFORCEMENT GATES
// ========================================
// These gates are checked directly by hooks (pre-agent-validator and post-agent-validator),
// not through agent contracts. They enforce the mandatory guru → PM → developer pipeline.
//
// Pre-Agent (BLOCKING - exit code 2):
//   - PM requires guru assessment.yaml first (checked in pre-agent-validator)
//   - Developer requires guru assessment.yaml (checked in pre-agent-validator)
//   - Developer requires PM specs when assessment says planning needed (checked in pre-agent-validator)
//
// Post-Agent (REPORTING - outcome = failed):
//   HG-PIPE-GURU-01: Guru must produce artifacts/explore/assessment.yaml in dev mode
//   HG-PIPE-DEV-01:  (reserved) Developer must reference guru assessment in detailed_report.md

export const AGENT_CONTRACTS: Record<string, AgentContract> = {
    'ark-developer': DEV_CONTRACT,
    'ark-guru': GURU_CONTRACT,
    'ark-pr-reviewer': PR_REVIEWER_CONTRACT,
    'ark-project-manager': PM_CONTRACT,
    'ark-researcher': RESEARCHER_CONTRACT,
    'ark-observer': OBSERVER_CONTRACT,
    'ark-progress-tracker': PROGRESS_CONTRACT,
};

// ========================================
// VALIDATION FUNCTIONS
// ========================================

/**
 * Resolve a nested field path like "agent_specific.tests.failed" from an object.
 */
function resolveField(obj: any, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let current = obj;
    for (const part of parts) {
        if (current == null || typeof current !== 'object') return undefined;
        current = current[part];
    }
    return current;
}

/**
 * Check a single hard gate against the result JSON.
 */
function checkHardGate(check: ValidationCheck, result: ResultJson): ValidationFailure | null {
    const value = resolveField(result, check.field);

    switch (check.id) {
        case 'HG-DEV-01':
            // build_passed must be true
            if (value !== true) {
                return { check, actual: value, message: `${check.field} = ${JSON.stringify(value)} (expected true)` };
            }
            break;

        case 'HG-DEV-02':
            // tests.failed must be 0
            if (typeof value === 'number' && value > 0) {
                // Allow if status=partial (agent acknowledged failures)
                if (result.status !== 'partial') {
                    return { check, actual: value, message: `${check.field} = ${value} (expected 0)` };
                }
            }
            break;

        case 'HG-DEV-03':
            // manual_test_passed must be true
            if (value !== true) {
                // Allow if status=partial (agent acknowledged it couldn't test)
                if (result.status !== 'partial') {
                    return { check, actual: value, message: `${check.field} = ${JSON.stringify(value)} (expected true — must manually test the feature)` };
                }
            }
            break;

        case 'HG-DEV-04':
            // integration_test_written must be true
            if (value !== true) {
                // Allow if status=partial (agent acknowledged it couldn't write tests)
                if (result.status !== 'partial') {
                    return { check, actual: value, message: `${check.field} = ${JSON.stringify(value)} (expected true — must write at least one integration test)` };
                }
            }
            break;

        case 'HG-GURU-01':
            // status must not be 'failure'
            if (value === 'failure') {
                return { check, actual: value, message: `status = failure (agent could not produce answer)` };
            }
            break;

        case 'HG-PR-02':
            // risk_level must be present
            if (!value || (typeof value === 'string' && value.trim() === '')) {
                return { check, actual: value, message: `risk_level is missing or empty` };
            }
            break;

        case 'HG-PR-03':
            // attention_areas_count must be > 0
            if (typeof value !== 'number' || value <= 0) {
                return { check, actual: value, message: `attention_areas_count = ${JSON.stringify(value)} (expected > 0)` };
            }
            break;

        case 'HG-PM-01':
            // phase_completed must be present (dynamic check done by caller)
            if (!value || (typeof value === 'string' && value.trim() === '')) {
                return { check, actual: value, message: `phase_completed is missing or empty` };
            }
            break;

        case 'HG-RES-01':
            // sources_count must be > 0
            if (typeof value !== 'number' || value <= 0) {
                return { check, actual: value, message: `sources_count = ${JSON.stringify(value)} (expected > 0)` };
            }
            break;

        case 'HG-OBS-01':
            // telemetry_sources_queried must be non-empty
            if (!value || (Array.isArray(value) && value.length === 0)) {
                return { check, actual: value, message: `telemetry_sources_queried is empty` };
            }
            break;

        case 'HG-PROG-01':
            // projects_analyzed must be > 0
            if (typeof value !== 'number' || value <= 0) {
                return { check, actual: value, message: `projects_analyzed = ${JSON.stringify(value)} (expected > 0)` };
            }
            break;

        // Pipeline enforcement gates (handled directly by hooks, pass through here)
        case 'HG-PIPE-GURU-01':
        case 'HG-PIPE-DEV-01':
            // These are injected by hooks with pre-computed failures
            // If they reach here, the failure was already determined
            return { check, actual: value, message: check.description };

        default:
            // Generic: field must be truthy
            if (!value) {
                return { check, actual: value, message: `${check.field} is falsy: ${JSON.stringify(value)}` };
            }
            break;
    }

    return null;
}

/**
 * Check a single warning against the result JSON.
 */
function checkWarning(check: ValidationCheck, result: ResultJson): ValidationFailure | null {
    const value = resolveField(result, check.field);

    switch (check.id) {
        case 'W-DEV-01':
            // tests.skipped > 0
            if (typeof value === 'number' && value > 0) {
                return { check, actual: value, message: `${value} tests skipped` };
            }
            break;

        case 'W-DEV-02':
        case 'W-GURU-02':
            // confidence == 'low'
            if (value === 'low') {
                return { check, actual: value, message: `Agent reported low confidence` };
            }
            break;

        case 'W-GURU-01':
            // files_referenced should be non-empty for protocol answers
            if (!value || (Array.isArray(value) && value.length === 0)) {
                return { check, actual: value, message: `No code files referenced` };
            }
            break;

        case 'W-PR-01':
            // recommendations_count == 0
            if (value === 0 || value === undefined || value === null) {
                return { check, actual: value, message: `No recommendations produced` };
            }
            break;

        case 'W-PR-02':
            // draft_comments_count == 0
            if (value === 0 || value === undefined || value === null) {
                return { check, actual: value, message: `No draft review comments prepared` };
            }
            break;

        case 'W-PM-01':
            // cross_artifact_consistency == 'failed'
            if (value === 'failed') {
                return { check, actual: value, message: `Cross-artifact consistency check failed` };
            }
            break;

        case 'W-RES-01':
            // confidence_overall < 30
            if (typeof value === 'number' && value < 30) {
                return { check, actual: value, message: `Overall confidence is very low: ${value}%` };
            }
            break;

        case 'W-OBS-01':
            // severity == 'high'
            if (value === 'high') {
                return { check, actual: value, message: `High severity finding - requires urgent attention` };
            }
            break;

        case 'W-PROG-01':
            // prs_analyzed == 0
            if (value === 0 || value === undefined || value === null) {
                return { check, actual: value, message: `No PRs analyzed - may indicate access issues` };
            }
            break;

        default:
            break;
    }

    return null;
}

/**
 * Validate artifact content: check size and required markdown headings.
 */
export function validateArtifactContent(
    filePath: string,
    minBytes: number,
    requiredHeadings?: string[]
): { found: boolean; size: number | null; heading_ok: boolean | null } {
    if (!existsSync(filePath)) {
        return { found: false, size: null, heading_ok: null };
    }

    let size: number;
    try {
        const stat = statSync(filePath);
        size = stat.size;
    } catch {
        return { found: true, size: null, heading_ok: null };
    }

    if (size < minBytes) {
        return { found: true, size, heading_ok: null };
    }

    if (!requiredHeadings || requiredHeadings.length === 0) {
        return { found: true, size, heading_ok: true };
    }

    try {
        const content = readFileSync(filePath, 'utf-8');
        const headingOk = requiredHeadings.every(heading => {
            const pattern = new RegExp(`^#{1,3}\\s+.*${escapeRegex(heading)}`, 'mi');
            return pattern.test(content);
        });
        return { found: true, size, heading_ok: headingOk };
    } catch {
        return { found: true, size, heading_ok: null };
    }
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Run the full agent contract validation against a _result.json.
 */
export function validateAgentResult(
    agentType: string,
    result: ResultJson,
    artifactsDir: string
): { failures: ValidationFailure[]; warnings: ValidationFailure[]; artifactChecks: ExtendedValidationResult['artifact_checks'] } {
    const contract = AGENT_CONTRACTS[agentType];
    const failures: ValidationFailure[] = [];
    const warnings: ValidationFailure[] = [];
    const artifactChecks: ExtendedValidationResult['artifact_checks'] = [];

    if (!contract) {
        return { failures, warnings, artifactChecks };
    }

    // Check hard gates
    for (const gate of contract.hardGates) {
        const failure = checkHardGate(gate, result);
        if (failure) failures.push(failure);
    }

    // Check warnings
    for (const warn of contract.warnings) {
        const warning = checkWarning(warn, result);
        if (warning) warnings.push(warning);
    }

    // Check required artifacts with content inspection
    for (const artifact of contract.requiredArtifacts) {
        const resolvedPath = artifact.path.startsWith('/')
            ? artifact.path
            : `${artifactsDir}/${artifact.path}`;
        const check = validateArtifactContent(resolvedPath, artifact.minBytes, artifact.requiredHeadings);
        artifactChecks.push({ path: artifact.path, ...check });

        if (!check.found) {
            failures.push({
                check: { id: `HG-ART-${artifact.path}`, field: artifact.path, severity: 'hard', description: `Required artifact missing: ${artifact.path}`, remediation: `Agent must produce ${artifact.path}` },
                actual: null,
                message: `Required artifact not found: ${artifact.path}`,
            });
        } else if (check.size !== null && check.size < artifact.minBytes) {
            failures.push({
                check: { id: `HG-ART-SIZE-${artifact.path}`, field: artifact.path, severity: 'hard', description: `Artifact too small: ${artifact.path}`, remediation: `Artifact must be >${artifact.minBytes} bytes (got ${check.size})` },
                actual: check.size,
                message: `Artifact ${artifact.path} is only ${check.size} bytes (min: ${artifact.minBytes})`,
            });
        }
    }

    // Dynamic PM artifact checks based on phase_completed
    if (agentType === 'ark-project-manager' && result.agent_specific?.phase_completed) {
        const phase = result.agent_specific.phase_completed;
        const pmArtifacts: Record<string, string[]> = {
            'specification': ['spec.md'],
            'planning': ['plan.md'],
            'task_breakdown': ['tasks.md'],
        };
        const expected = pmArtifacts[phase];
        if (expected) {
            for (const art of expected) {
                // PM artifacts are in specs dir, not artifacts dir - check both
                const found = result.artifacts_produced?.some(a => a.path.endsWith(art));
                artifactChecks.push({
                    path: art,
                    found: !!found,
                    size: null,
                    heading_ok: null,
                });
                if (!found) {
                    failures.push({
                        check: { id: `HG-PM-ART-${art}`, field: art, severity: 'hard', description: `Phase artifact missing: ${art}`, remediation: `ark-project-manager must produce ${art} for phase '${phase}'` },
                        actual: null,
                        message: `Phase artifact not found in artifacts_produced: ${art}`,
                    });
                }
            }
        }
    }

    return { failures, warnings, artifactChecks };
}

/**
 * Compute actionable retry guidance from failures.
 */
export function computeRetryGuidance(failures: ValidationFailure[], agentType: string): string {
    if (failures.length === 0) return '';

    const lines: string[] = [];
    lines.push(`Re-invoke ${agentType} with retry_context. Agent must:`);

    for (const f of failures) {
        lines.push(`  - ${f.check.remediation}`);
    }

    return lines.join('\n');
}

/**
 * Format the file size for display.
 */
export function formatSize(bytes: number | null): string {
    if (bytes === null) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
}
