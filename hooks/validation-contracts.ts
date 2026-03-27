/**
 * Arkadian Agent Validation Contracts
 *
 * Defines per-agent validation gates (hard gates + warnings) and
 * provides functions to validate agent _result.json outputs.
 *
 * Used by post-agent-validator.ts (SubagentStop hook).
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

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
        { id: 'HG-DEV-04-NEW', field: 'agent_specific.new_test_created', severity: 'hard',
          description: 'Must create a NEW test function, not re-run existing tests',
          remediation: 'Write a new test function. Set new_test_created=true only if the function in integration_test_name did not exist before. Running pre-existing tests does not satisfy this gate.' },
    ],
    warnings: [
        { id: 'W-DEV-01', field: 'agent_specific.tests.skipped', severity: 'warn', description: 'Skipped tests detected', remediation: 'Review whether skipped tests are intentional' },
        { id: 'W-DEV-02', field: 'confidence', severity: 'warn', description: 'Low confidence flagged', remediation: 'Review agent output for uncertainty' },
        { id: 'W-DEV-03', field: 'agent_specific.integration_test_file', severity: 'warn', description: 'Integration test file should be in e2e/integration directory', remediation: 'Write tests in internal/test/e2e/ not internal/core/' },
    ],
};

const GURU_CONTRACT: AgentContract = {
    agentType: 'ark-guru',
    requiredArtifacts: [
        { path: 'qna/response.md', minBytes: 200 },
    ],
    hardGates: [
        { id: 'HG-GURU-01', field: 'status', severity: 'hard', description: 'Must produce an answer (status != failure)', remediation: 'Re-invoke with clearer question or broader docs scope' },
        { id: 'HG-GURU-02', field: 'agent_specific.exploration.requirements_coverage_complete', severity: 'hard', description: 'When issue_context present, guru must verify all source requirements are covered in assessment', remediation: 'Re-invoke ark-guru. Assessment must include requirements_from_source with coverage_complete: true. Each requirement from issue_context must have addressed_in_assessment: true.' },
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

// CI contract: used when ark-developer runs with context_intent === 'ci'
// Different from DEV_CONTRACT — no manual_test_passed or integration_test_written required
const CI_CONTRACT: AgentContract = {
    agentType: 'ark-developer',  // Same agent, different context
    requiredArtifacts: [
        { path: 'ci-evidence.md', minBytes: 100, requiredHeadings: ['CI Evidence', 'Check Results'] },
    ],
    hardGates: [
        { id: 'HG-CI-01', field: 'agent_specific.lint_passed', severity: 'hard', description: 'Lint must pass', remediation: 'Run make lint to auto-fix, then re-check. Fix remaining issues manually.' },
        { id: 'HG-CI-02', field: 'agent_specific.build_passed', severity: 'hard', description: 'Build must pass', remediation: 'Fix compilation errors in the worktree.' },
        { id: 'HG-CI-03', field: 'agent_specific.unit_tests_passed', severity: 'hard', description: 'Unit tests must pass', remediation: 'Fix failing unit tests or the code under test.' },
        { id: 'HG-CI-04', field: 'agent_specific.integration_tests_skipped', severity: 'hard', description: 'Integration tests must NOT be skipped — they are the most critical CI check', remediation: 'Integration tests are MANDATORY in CI. If infrastructure is not running, start it with make build-test-env && make setup-test-env, then run make integrationtest. Never skip integration tests.' },
        { id: 'HG-CI-05', field: 'agent_specific.integration_tests_passed', severity: 'hard', description: 'Integration tests must pass', remediation: 'Fix failing integration tests. Debug test failures, check service logs, and iterate until all tests pass.' },
    ],
    warnings: [
        { id: 'W-CI-01', field: 'agent_specific.vet_passed', severity: 'warn', description: 'Go vet warnings detected', remediation: 'Fix vet warnings (unused vars, shadowed vars, wrong types)' },
        { id: 'W-CI-03', field: 'agent_specific.proto_lint_skipped', severity: 'warn', description: 'Proto lint was skipped', remediation: 'No proto files changed — skipping is expected' },
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
// CONTEXT-INTENT ARTIFACT OVERRIDES
// ========================================
// Some agents produce different artifacts depending on the context_intent.
// For example, ark-guru in "dev" mode produces assessment.yaml (in explore/),
// while in "qna" mode it produces qna/response.md.

const ARTIFACT_OVERRIDES: Record<string, Record<string, ArtifactRequirement[]>> = {
    'ark-guru': {
        'dev': [
            { path: 'explore/assessment.yaml', minBytes: 100 },
            { path: 'explore/response.md', minBytes: 200 },
        ],
        // QA mode: don't require fixed artifact path — QA responses use dynamic names
        // (QA-1-response.md, QA-2-response.md) specified in the execution spec's expected_artifacts.
        // The Tier 1 file existence check (validateArtifacts) already validates those.
        'qna': [],
    },
    'ark-developer': {
        // CI mode: use CI_CONTRACT instead of DEV_CONTRACT
        'ci': [
            { path: 'ci-evidence.md', minBytes: 100, requiredHeadings: ['CI Evidence', 'Check Results'] },
        ],
    },
};

// CONTRACT OVERRIDES by context_intent
// When context_intent matches, use this contract instead of the default agent contract
const CONTRACT_OVERRIDES: Record<string, Record<string, AgentContract>> = {
    'ark-developer': {
        'ci': CI_CONTRACT,
    },
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
            // manual_test_passed must be true — NO partial bypass
            // Setting status=partial does NOT exempt from manual testing.
            // The agent must actually start infrastructure and test the feature.
            if (value !== true) {
                return { check, actual: value, message: `${check.field} = ${JSON.stringify(value)} (expected true — must manually test the feature via CLI/API/curl. Setting status=partial does not bypass this gate.)` };
            }
            break;

        case 'HG-DEV-04':
            // integration_test_written must be true — NO partial bypass
            // Setting status=partial does NOT exempt from writing integration tests.
            // The agent must follow the dev-loop skill to set up infrastructure and run tests.
            if (value !== true) {
                return { check, actual: value, message: `${check.field} = ${JSON.stringify(value)} (expected true — must write and run at least one integration test. Setting status=partial does not bypass this gate.)` };
            }
            break;

        case 'HG-DEV-04-NEW':
            // new_test_created must be true — but ONLY for primary implement phases (S3).
            // Fix/review-fix phases (S5, S7, etc.) may modify existing tests, not create new ones.
            // The stepId is passed via the extra context parameter on the check object.
            if (value !== true) {
                return { check, actual: value,
                  message: `new_test_created = ${JSON.stringify(value)} (expected true — must write a NEW test function. Re-running TestSweep/TestBatchSession/etc does not count.)` };
            }
            break;

        case 'HG-GURU-01':
            // status must not be 'failure'
            if (value === 'failure') {
                return { check, actual: value, message: `status = failure (agent could not produce answer)` };
            }
            break;

        case 'HG-GURU-02':
            // requirements_coverage_complete: only FAIL when explicitly false
            // Missing field (no issue_context → no requirements tracking) passes — backward compatible
            if (value === false) {
                return { check, actual: value, message: `requirements_coverage_complete = false (guru did not cover all requirements from source issue). Re-invoke with instructions to enumerate ALL requirements from issue_context.` };
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

        // CI gates
        case 'HG-CI-01':
        case 'HG-CI-02':
        case 'HG-CI-03':
        case 'HG-CI-05':
            // These must be true (lint_passed, build_passed, unit_tests_passed, integration_tests_passed)
            if (value !== true) {
                return { check, actual: value, message: `${check.field} = ${JSON.stringify(value)} (expected true)` };
            }
            break;

        case 'HG-CI-04':
            // integration_tests_skipped must be FALSE (inverted logic — skipping is the failure)
            if (value === true) {
                return { check, actual: value, message: `${check.field} = true (integration tests were skipped — they are MANDATORY and must NOT be skipped)` };
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

        case 'W-CI-01':
            // vet_passed should be true
            if (value !== true) {
                return { check, actual: value, message: `Go vet warnings detected (vet_passed = ${JSON.stringify(value)})` };
            }
            break;

        case 'W-CI-03':
            // proto_lint_skipped — informational only
            if (value === true) {
                return { check, actual: value, message: `Proto lint was skipped (no proto changes detected)` };
            }
            break;

        case 'W-DEV-03':
            // integration_test_file should be in e2e directory
            if (value && typeof value === 'string' && !value.includes('e2e')) {
                return { check, actual: value, message: `Integration test file not in e2e directory: ${value}` };
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
 * Patterns in test-evidence.md that indicate tests were NOT actually run.
 * If an agent claims integration_test_written=true or manual_test_passed=true
 * but test-evidence.md contains these patterns, the claim is fraudulent.
 */
const NOT_RUN_PATTERNS = [
    /\bNOT RUN\b/i,
    /\bNOT EXECUTED\b/i,
    /\bSKIPPED.*requires infrastructure\b/i,
    /\bStatus:\s*NOT RUN\b/i,
    /\bnot available in this environment\b/i,
    /\brequires running (?:arkd|infrastructure|nigiri)\b/i,
];

/**
 * Cross-validate _result.json boolean claims against actual test-evidence.md content.
 *
 * Detects when an agent sets integration_test_written=true or manual_test_passed=true
 * in _result.json, but test-evidence.md reveals the tests were never actually run.
 */
function crossValidateTestEvidence(
    artifactsDir: string,
    result: ResultJson
): ValidationFailure[] {
    const failures: ValidationFailure[] = [];

    // Only applies to ark-developer
    if (result.agent !== 'ark-developer') return failures;

    // Find test-evidence.md
    const evidencePaths = [
        join(artifactsDir, 'implement', 'test-evidence.md'),
        join(artifactsDir, 'test-evidence.md'),
    ];
    let evidenceContent: string | null = null;
    for (const p of evidencePaths) {
        if (existsSync(p)) {
            try {
                evidenceContent = readFileSync(p, 'utf-8');
                break;
            } catch { /* ignore read errors */ }
        }
    }

    if (!evidenceContent) return failures; // No evidence file to cross-validate

    // Extract Integration Test and Manual Testing sections for targeted scanning
    const integrationSection = extractSection(evidenceContent, 'Integration Test');
    const manualSection = extractSection(evidenceContent, 'Manual Test');

    // Cross-validate integration_test_written
    const claimsIntegration = result.agent_specific?.integration_test_written === true;
    if (claimsIntegration && integrationSection) {
        for (const pattern of NOT_RUN_PATTERNS) {
            if (pattern.test(integrationSection)) {
                failures.push({
                    check: {
                        id: 'HG-DEV-04-XVAL',
                        field: 'agent_specific.integration_test_written',
                        severity: 'hard',
                        description: 'Integration test claim contradicts test-evidence.md content',
                        remediation: 'Agent claimed integration_test_written=true but test-evidence.md shows integration tests were NOT RUN. Must actually run integration tests and capture real output.',
                    },
                    actual: `_result.json says true, but test-evidence.md says: "${integrationSection.substring(0, 200).trim()}"`,
                    message: 'Cross-validation FAILED: integration_test_written=true in _result.json but test-evidence.md contains "NOT RUN" or equivalent for integration tests',
                });
                break; // One failure is enough
            }
        }
    }

    // Cross-validate manual_test_passed
    const claimsManual = result.agent_specific?.manual_test_passed === true;
    if (claimsManual && manualSection) {
        for (const pattern of NOT_RUN_PATTERNS) {
            if (pattern.test(manualSection)) {
                failures.push({
                    check: {
                        id: 'HG-DEV-03-XVAL',
                        field: 'agent_specific.manual_test_passed',
                        severity: 'hard',
                        description: 'Manual test claim contradicts test-evidence.md content',
                        remediation: 'Agent claimed manual_test_passed=true but test-evidence.md shows manual tests were NOT RUN. Must actually test the feature via CLI/API/curl and capture real output.',
                    },
                    actual: `_result.json says true, but test-evidence.md says: "${manualSection.substring(0, 200).trim()}"`,
                    message: 'Cross-validation FAILED: manual_test_passed=true in _result.json but test-evidence.md contains "NOT RUN" or equivalent for manual tests',
                });
                break;
            }
        }
    }

    return failures;
}

/**
 * Extract a markdown section by heading name (case-insensitive).
 * Returns content from the heading to the next heading of same or higher level, or end of string.
 */
function extractSection(content: string, headingName: string): string | null {
    const headingPattern = new RegExp(`^(#{1,3})\\s+.*${escapeRegex(headingName)}.*$`, 'mi');
    const match = headingPattern.exec(content);
    if (!match) return null;

    const headingLevel = match[1].length;
    const startIdx = match.index + match[0].length;

    // Find next heading of same or higher level
    const nextHeadingPattern = new RegExp(`^#{1,${headingLevel}}\\s+`, 'm');
    const remaining = content.substring(startIdx);
    const nextMatch = nextHeadingPattern.exec(remaining);
    const endIdx = nextMatch ? startIdx + nextMatch.index : content.length;

    return content.substring(startIdx, endIdx).trim();
}

/**
 * Cross-validate that the claimed integration_test_name actually appears
 * in test-evidence.md and shows a PASS result.
 * This catches the exploit where agents re-run pre-existing tests and
 * claim credit for "writing" them.
 */
function crossValidateNewTestFunction(
    artifactsDir: string,
    result: ResultJson
): ValidationFailure[] {
    const failures: ValidationFailure[] = [];
    if (result.agent !== 'ark-developer') return failures;

    const testName = result.agent_specific?.integration_test_name;
    if (!testName || typeof testName !== 'string') return failures;

    // Find test-evidence.md
    const paths = [
        join(artifactsDir, 'implement', 'test-evidence.md'),
        join(artifactsDir, 'test-evidence.md'),
    ];
    let content: string | null = null;
    for (const p of paths) {
        if (existsSync(p)) {
            try { content = readFileSync(p, 'utf-8'); break; } catch {}
        }
    }
    if (!content) return failures;

    // Search ALL test-related sections, not just "Integration Test"
    // The test may appear in "Unit Test", "Test Results", "Integration Test", etc.
    const testSectionNames = ['Integration Test', 'Unit Test', 'Test Results', 'Test Evidence', 'E2E Test'];
    let combinedSections = '';
    for (const sectionName of testSectionNames) {
        const section = extractSection(content, sectionName);
        if (section) combinedSections += '\n' + section;
    }
    // Fallback: if no sections matched, search the entire file
    if (!combinedSections.trim()) combinedSections = content;

    // Check: Does the specific function name appear in any test section?
    if (!combinedSections.includes(testName)) {
        failures.push({
            check: {
                id: 'HG-DEV-04-SPEC', field: 'agent_specific.integration_test_name',
                severity: 'hard',
                description: 'Test evidence must show the specific test function ran',
                remediation: `test-evidence.md must contain "${testName}" in a test section. Write and run that specific function.`,
            },
            actual: `"${testName}" not found in test-evidence.md`,
            message: `Cross-validation FAILED: "${testName}" not found in any test section`,
        });
    }

    // Check: Does the test show PASS?
    const passPattern = new RegExp(`---\\s+PASS:\\s+${escapeRegex(testName)}`, 'i');
    if (!passPattern.test(combinedSections)) {
        failures.push({
            check: {
                id: 'HG-DEV-04-PASS', field: 'agent_specific.integration_test_name',
                severity: 'hard',
                description: 'Test function must show PASS in output',
                remediation: `Run the test and capture "--- PASS: ${testName}" in test-evidence.md`,
            },
            actual: `"--- PASS: ${testName}" not found`,
            message: `Cross-validation FAILED: No PASS for "${testName}"`,
        });
    }

    return failures;
}

/**
 * Cross-validate that manual testing actually involved real API/service interaction.
 * Build, vet, and lint commands alone do NOT qualify as manual testing.
 * Manual test = testing the feature via its API (curl, grpcurl, HTTP client) against a running instance.
 */
function crossValidateManualTestContent(
    artifactsDir: string,
): ValidationFailure[] {
    const failures: ValidationFailure[] = [];

    const evidencePaths = [
        join(artifactsDir, 'implement', 'test-evidence.md'),
        join(artifactsDir, 'test-evidence.md'),
    ];
    let evidenceContent: string | null = null;
    for (const p of evidencePaths) {
        if (existsSync(p)) {
            try { evidenceContent = readFileSync(p, 'utf-8'); break; } catch {}
        }
    }

    if (!evidenceContent) return failures;

    const manualSection = extractSection(evidenceContent, 'Manual Test');
    if (!manualSection) return failures;

    // Real API interaction patterns — at least one must be present
    const apiPatterns = [
        /\bcurl\s/i,
        /\bgrpcurl\s/i,
        /\blocalhost:\d+/i,
        /\b127\.0\.0\.1:\d+/i,
        /\/api\/v\d+\//i,
        /\/v\d+\//i,
        /\bhttp:\/\//i,
        /\bgrpc:\/\//i,
        /\bHTTP\s+\d{3}\b/i,
    ];

    const hasRealApiCall = apiPatterns.some(p => p.test(manualSection));

    if (!hasRealApiCall) {
        // Check if it's just build/vet/lint commands
        const buildOnlyPatterns = [
            /\bgo build\b/i,
            /\bgo vet\b/i,
            /\bbuf lint\b/i,
            /\bmake build\b/i,
            /\bmake lint\b/i,
            /\bmake vet\b/i,
        ];
        const allBuildOnly = manualSection.split('\n')
            .filter(l => l.includes('**Command:**') || l.includes('```'))
            .every(l => buildOnlyPatterns.some(p => p.test(l)) || !l.includes('**Command:**'));

        if (allBuildOnly) {
            failures.push({
                check: {
                    id: 'HG-DEV-03-MANUAL',
                    field: 'agent_specific.manual_test_passed',
                    severity: 'hard',
                    description: 'Manual test must involve real API interaction, not just build/vet/lint',
                    remediation: 'Manual test = test the feature via curl/grpcurl/HTTP against a running instance. go build/go vet/buf lint are NOT manual tests.',
                },
                actual: 'Manual Testing section contains only build/vet/lint commands',
                message: 'Cross-validation FAILED: manual_test_passed=true but Manual Testing section has no API calls (only build/vet/lint)',
            });
        }
    }

    return failures;
}

/**
 * Run the full agent contract validation against a _result.json.
 *
 * @param agentType - The agent type (e.g. 'ark-developer')
 * @param result - The parsed _result.json
 * @param artifactsDir - Base artifacts directory (e.g. sessions/<id>/artifacts/)
 * @param contextIntent - Optional context_intent for resolving artifact subfolders
 */
export function validateAgentResult(
    agentType: string,
    result: ResultJson,
    artifactsDir: string,
    contextIntent?: string,
    stepId?: string
): { failures: ValidationFailure[]; warnings: ValidationFailure[]; artifactChecks: ExtendedValidationResult['artifact_checks'] } {
    const baseContract = AGENT_CONTRACTS[agentType];
    const failures: ValidationFailure[] = [];
    const warnings: ValidationFailure[] = [];
    const artifactChecks: ExtendedValidationResult['artifact_checks'] = [];

    if (!baseContract) {
        return { failures, warnings, artifactChecks };
    }

    // Check for full contract override based on context_intent (e.g., CI mode uses CI_CONTRACT)
    const contractOverride = contextIntent ? CONTRACT_OVERRIDES[agentType]?.[contextIntent] : undefined;
    if (contractOverride) {
        // Use the override contract entirely (different gates, different artifacts)
        const overrideArtifacts = ARTIFACT_OVERRIDES[agentType]?.[contextIntent];
        const contract = overrideArtifacts
            ? { ...contractOverride, requiredArtifacts: overrideArtifacts }
            : contractOverride;

        // Check hard gates from override contract
        for (const gate of contract.hardGates) {
            const failure = checkHardGate(gate, result);
            if (failure) failures.push(failure);
        }
        // Check warnings from override contract
        for (const warn of contract.warnings) {
            const warning = checkWarning(warn, result);
            if (warning) warnings.push(warning);
        }
        // Check required artifacts
        for (const artifact of contract.requiredArtifacts) {
            const resolvedPath = artifact.path.includes('/')
                ? join(artifactsDir, artifact.path)
                : join(artifactsDir, 'ci', artifact.path);
            const artCheck = validateArtifactContent(resolvedPath, artifact);
            artifactChecks.push(artCheck);
            if (!artCheck.found || (artifact.requiredHeadings && !artCheck.heading_ok)) {
                failures.push({
                    check: { id: `HG-ART-${artifact.path}`, field: artifact.path, severity: 'hard', description: `Required artifact missing: ${artifact.path}`, remediation: `Agent must produce ${artifact.path}` },
                    actual: artCheck.found ? 'found but incomplete' : 'missing',
                    message: `Artifact ${artifact.path}: found=${artCheck.found}, size=${artCheck.size}, headings=${artCheck.heading_ok}`,
                });
            }
        }
        return { failures, warnings, artifactChecks };
    }

    // Apply context-intent artifact overrides if available (default path)
    const overrides = contextIntent ? ARTIFACT_OVERRIDES[agentType]?.[contextIntent] : undefined;
    const contract: AgentContract = overrides
        ? { ...baseContract, requiredArtifacts: overrides }
        : baseContract;

    // Check hard gates
    for (const gate of contract.hardGates) {
        // Skip HG-DEV-04-NEW for non-primary implement phases (S5, S7, etc.)
        // Fix phases modify existing tests, not create new ones.
        if (gate.id === 'HG-DEV-04-NEW' && stepId && stepId !== 'S3') {
            continue;
        }
        const failure = checkHardGate(gate, result);
        if (failure) failures.push(failure);
    }

    // Cross-validate test evidence content against _result.json claims
    // This catches agents that set integration_test_written=true / manual_test_passed=true
    // while test-evidence.md reveals the tests were never actually run.
    const xvalFailures = crossValidateTestEvidence(artifactsDir, result);
    failures.push(...xvalFailures);

    // Cross-validate that the named test function appears in test-evidence.md with PASS
    const newTestFailures = crossValidateNewTestFunction(artifactsDir, result);
    failures.push(...newTestFailures);

    // Validate integration_test_file is in an e2e/integration directory, not internal/core/
    const integTestFile = result.agent_specific?.integration_test_file;
    if (integTestFile && typeof integTestFile === 'string') {
        const isE2E = /\/(test\/e2e|test\/integration|e2e_test|integration_test)\//i.test(integTestFile);
        if (!isE2E) {
            warnings.push({
                check: {
                    id: 'W-DEV-03', field: 'agent_specific.integration_test_file',
                    severity: 'warn',
                    description: 'Integration test file should be in e2e/integration directory',
                    remediation: `File "${integTestFile}" looks like a unit test path. Integration tests should be in internal/test/e2e/ or similar.`,
                },
                actual: integTestFile,
                message: `Integration test file "${integTestFile}" is not in a recognized e2e/integration directory`,
            });
        }
    }

    // Cross-validate manual_test_passed: test-evidence.md must contain real API calls
    // Build/vet/lint alone do NOT count as manual testing
    if (result.agent_specific?.manual_test_passed === true && agentType === 'ark-developer') {
        const manualFailures = crossValidateManualTestContent(artifactsDir);
        failures.push(...manualFailures);
    }

    // Check warnings
    for (const warn of contract.warnings) {
        const warning = checkWarning(warn, result);
        if (warning) warnings.push(warning);
    }

    // Check required artifacts with content inspection
    // Resolve paths using context_intent subfolder, with fallback search
    const INTENT_SUBFOLDER: Record<string, string> = {
        'dev': 'implement', 'implement': 'implement',
        'ci': 'ci',
        'qna': 'explore', 'explore': 'explore',
        'debug': 'investigate', 'monitoring': 'investigate',
        'pr_review': 'review', 'research': 'research', 'progress': 'progress',
    };
    const knownSubfolders = ['implement', 'explore', 'qna', 'review', 'research', 'investigate', 'progress', 'ci'];

    for (const artifact of contract.requiredArtifacts) {
        let resolvedPath: string;
        if (artifact.path.startsWith('/')) {
            resolvedPath = artifact.path;
        } else {
            // Check if the path already includes a subfolder (e.g., "explore/assessment.yaml")
            const hasSubfolder = artifact.path.includes('/');

            if (hasSubfolder) {
                // Path already includes subfolder — resolve directly from artifactsDir
                resolvedPath = join(artifactsDir, artifact.path);
            } else {
                // Bare filename — use context_intent subfolder
                const subfolder = contextIntent ? INTENT_SUBFOLDER[contextIntent] : undefined;
                if (subfolder) {
                    resolvedPath = join(artifactsDir, subfolder, artifact.path);
                } else {
                    resolvedPath = join(artifactsDir, artifact.path);
                }
            }
            // If not found, search known subfolders (only for bare filenames)
            if (!existsSync(resolvedPath) && !hasSubfolder) {
                for (const sub of knownSubfolders) {
                    const candidate = join(artifactsDir, sub, artifact.path);
                    if (existsSync(candidate)) {
                        resolvedPath = candidate;
                        break;
                    }
                }
            }
        }
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
