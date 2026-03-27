#!/usr/bin/env bun

/**
 * Arkadian Auto-Improve: Eval Engine
 *
 * Deterministic scoring of an arkadian session against eval-criteria.yaml.
 * Reads session artifacts (_result.json, test-evidence.md, assessment.yaml, etc.)
 * and scores each agent on its criteria.
 *
 * Usage:
 *   bun benchmarks/eval-engine.ts --session-dir <path-to-session-dir>
 *
 * Output: JSON to stdout with per-agent scores and overall pass/fail.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

// ── Types ──────────────────────────────────────────────────────────

interface CriterionDef {
    description: string;
    type: 'artifact' | 'log' | 'transcript';
    check: string;
    weight: number;
    max_duration_minutes?: number;
}

interface AgentDef {
    phase: string;
    description: string;
    artifacts: Record<string, string>;
    criteria: Record<string, CriterionDef>;
}

interface EvalCriteria {
    version: string;
    pass_threshold: number;
    agents: Record<string, AgentDef>;
    all_agents: {
        description: string;
        criteria: Record<string, CriterionDef>;
    };
}

interface CriterionResult {
    id: string;
    description: string;
    passed: boolean;
    weight: number;
    type: string;
    detail: string;
}

interface AgentResult {
    agent: string;
    phase: string;
    score: number;
    max_score: number;
    percentage: number;
    criteria: CriterionResult[];
}

interface EvalResult {
    session_dir: string;
    timestamp: string;
    pass: boolean;
    pass_threshold: number;
    overall_score: number;
    overall_max: number;
    overall_percentage: number;
    agents: AgentResult[];
    failures: string[];
}

// ── Helpers ────────────────────────────────────────────────────────

function readJson(path: string): any {
    try {
        return JSON.parse(readFileSync(path, 'utf-8'));
    } catch {
        return null;
    }
}

function readYaml(path: string): any {
    // Minimal YAML parser for flat/simple structures we need
    // For _result.json fields we use JSON. For assessment.yaml we check field presence.
    try {
        return readFileSync(path, 'utf-8');
    } catch {
        return null;
    }
}

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
 * Find a file in the session dir, searching common locations.
 */
function findArtifact(sessionDir: string, relativePath: string): string | null {
    // Direct path
    const direct = join(sessionDir, relativePath);
    if (existsSync(direct)) return direct;

    // Try with glob-like patterns for {project}/{feature}
    if (relativePath.includes('{')) {
        // Search specs/ or artifacts/ for matching files
        const parts = relativePath.split('/');
        const filename = parts[parts.length - 1];
        const baseDir = join(sessionDir, parts[0]);
        if (existsSync(baseDir)) {
            const found = findFileRecursive(baseDir, filename);
            if (found) return found;
        }
    }

    return null;
}

function findFileRecursive(dir: string, filename: string): string | null {
    try {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            if (entry.isFile() && entry.name === filename) return fullPath;
            if (entry.isDirectory()) {
                const found = findFileRecursive(fullPath, filename);
                if (found) return found;
            }
        }
    } catch { /* ignore */ }
    return null;
}

/**
 * Parse phase durations from hook log.
 * Returns map of phase → duration in minutes.
 */
function parsePhaseDurations(logFile: string): Record<string, number> {
    const durations: Record<string, number> = {};
    if (!existsSync(logFile)) return durations;

    try {
        const content = readFileSync(logFile, 'utf-8');
        const lines = content.split('\n');

        const phaseStarts: Record<string, number> = {};
        for (const line of lines) {
            const tsMatch = line.match(/^\[(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)\]/);
            if (!tsMatch) continue;
            const ts = new Date(tsMatch[1]).getTime();

            // Detect phase start: pre-agent-validator sets active_agent
            const agentStartMatch = line.match(/\[pre-agent-validator\].*agent.*["']?(ark-\w+)["']?/i);
            if (agentStartMatch) {
                phaseStarts[agentStartMatch[1]] = ts;
            }

            // Detect phase end: post-agent-validator clears active_agent
            const agentEndMatch = line.match(/\[post-agent-validator\].*agent.*["']?(ark-\w+)["']?/i);
            if (agentEndMatch && phaseStarts[agentEndMatch[1]]) {
                const durationMs = ts - phaseStarts[agentEndMatch[1]];
                durations[agentEndMatch[1]] = durationMs / 60000; // convert to minutes
            }
        }
    } catch { /* ignore */ }

    return durations;
}

// ── Per-Criterion Evaluation ───────────────────────────────────────

function evalArkGuru(sessionDir: string, criterion: CriterionDef, criterionId: string): CriterionResult {
    const base: CriterionResult = {
        id: criterionId,
        description: criterion.description,
        passed: false,
        weight: criterion.weight,
        type: criterion.type,
        detail: '',
    };

    const assessmentPath = findArtifact(sessionDir, 'artifacts/explore/assessment.yaml');
    const resultPath = findArtifact(sessionDir, 'artifacts/explore/_result.json');

    switch (criterionId) {
        case 'context_quality': {
            if (!assessmentPath) {
                base.detail = 'assessment.yaml not found';
                return base;
            }
            const content = readFileSync(assessmentPath, 'utf-8');
            // Check files_identified has entries
            const filesMatch = content.match(/files_identified:/);
            if (!filesMatch) {
                base.detail = 'files_identified section missing';
                return base;
            }
            // Count indented items after files_identified
            const afterFiles = content.split('files_identified:')[1] || '';
            const fileEntries = afterFiles.split('\n').filter(l => l.match(/^\s+-\s/));
            if (fileEntries.length < 3) {
                base.detail = `Only ${fileEntries.length} files identified (need 3+)`;
                return base;
            }
            base.passed = true;
            base.detail = `${fileEntries.length} files identified`;
            return base;
        }

        case 'analysis_depth': {
            if (!assessmentPath) {
                base.detail = 'assessment.yaml not found';
                return base;
            }
            const content = readFileSync(assessmentPath, 'utf-8');
            const hasComplexity = /complexity:/i.test(content);
            const hasApproach = /fix_approach:|implementation_approach:/i.test(content);
            const hasScope = /affected_scope:/i.test(content);
            if (!hasComplexity || !hasApproach || !hasScope) {
                const missing = [];
                if (!hasComplexity) missing.push('complexity');
                if (!hasApproach) missing.push('fix/implementation_approach');
                if (!hasScope) missing.push('affected_scope');
                base.detail = `Missing sections: ${missing.join(', ')}`;
                return base;
            }
            base.passed = true;
            base.detail = 'All required sections present';
            return base;
        }

        case 'requirements_coverage': {
            if (!assessmentPath) {
                base.detail = 'assessment.yaml not found';
                return base;
            }
            const content = readFileSync(assessmentPath, 'utf-8');
            if (!content.includes('requirements_from_source')) {
                // No requirements tracking — might be a non-issue task
                const resultJson = resultPath ? readJson(resultPath) : null;
                if (resultJson?.agent_specific?.exploration?.requirements_coverage_complete === true) {
                    base.passed = true;
                    base.detail = 'Requirements coverage confirmed via _result.json';
                    return base;
                }
                base.detail = 'requirements_from_source section not found in assessment.yaml';
                return base;
            }
            // Check for any addressed_in_assessment: false
            if (content.includes('addressed_in_assessment: false')) {
                base.detail = 'Some requirements not addressed';
                return base;
            }
            base.passed = true;
            base.detail = 'All requirements addressed';
            return base;
        }

        case 'no_hallucinated_files': {
            if (!assessmentPath) {
                base.detail = 'assessment.yaml not found';
                return base;
            }
            // This is a transcript-level check in production, but we can do basic validation:
            // Check that _result.json didn't flag hallucination
            const resultJson = resultPath ? readJson(resultPath) : null;
            if (resultJson?.status === 'failure') {
                base.detail = 'Guru status is failure';
                return base;
            }
            // Basic pass — full Glob verification requires repo access (done by skill, not engine)
            base.passed = true;
            base.detail = 'No hallucination detected (basic check — full Glob verify done by skill)';
            return base;
        }

        default:
            base.detail = `Unknown criterion: ${criterionId}`;
            return base;
    }
}

function evalArkPM(sessionDir: string, criterion: CriterionDef, criterionId: string): CriterionResult {
    const base: CriterionResult = {
        id: criterionId,
        description: criterion.description,
        passed: false,
        weight: criterion.weight,
        type: criterion.type,
        detail: '',
    };

    switch (criterionId) {
        case 'artifacts_produced': {
            const specPath = findFileRecursive(join(sessionDir, 'specs'), 'spec.md');
            const planPath = findFileRecursive(join(sessionDir, 'specs'), 'plan.md');
            const tasksPath = findFileRecursive(join(sessionDir, 'specs'), 'tasks.md');

            const missing = [];
            for (const [name, path] of [['spec.md', specPath], ['plan.md', planPath], ['tasks.md', tasksPath]]) {
                if (!path) {
                    missing.push(name);
                } else {
                    try {
                        const stat = statSync(path as string);
                        if (stat.size < 200) missing.push(`${name} (${stat.size}b < 200b)`);
                    } catch {
                        missing.push(name);
                    }
                }
            }

            if (missing.length > 0) {
                base.detail = `Missing or too small: ${missing.join(', ')}`;
                return base;
            }
            base.passed = true;
            base.detail = 'All 3 artifacts produced with sufficient size';
            return base;
        }

        case 'tasks_actionable': {
            const tasksPath = findFileRecursive(join(sessionDir, 'specs'), 'tasks.md');
            if (!tasksPath) {
                base.detail = 'tasks.md not found';
                return base;
            }
            const content = readFileSync(tasksPath, 'utf-8');
            // Count task entries (lines starting with ## or ### that look like tasks, or numbered items)
            const taskLines = content.split('\n').filter(l =>
                l.match(/^#{2,3}\s+(Task|T\d|US-|Story)/) || l.match(/^\d+\.\s+\*\*/)
            );
            // Check for file path references
            const hasFilePaths = /\.(go|ts|md|yaml|proto|sql)\b/.test(content);
            if (taskLines.length < 2) {
                base.detail = `Only ${taskLines.length} tasks found (need 2+)`;
                return base;
            }
            if (!hasFilePaths) {
                base.detail = 'No file paths referenced in tasks';
                return base;
            }
            base.passed = true;
            base.detail = `${taskLines.length} tasks with file path references`;
            return base;
        }

        case 'requirements_mapped': {
            // Check if tasks reference requirements from issue
            const tasksPath = findFileRecursive(join(sessionDir, 'specs'), 'tasks.md');
            const resultPath = findFileRecursive(join(sessionDir, 'specs'), '_result.json');

            if (!tasksPath) {
                base.detail = 'tasks.md not found';
                return base;
            }

            const resultJson = resultPath ? readJson(resultPath) : null;
            if (resultJson?.agent_specific?.phase_completed) {
                base.passed = true;
                base.detail = 'PM phase completed successfully';
                return base;
            }

            // Basic: just check tasks.md has content
            const content = readFileSync(tasksPath, 'utf-8');
            if (content.length > 500) {
                base.passed = true;
                base.detail = 'Tasks file has substantial content';
                return base;
            }
            base.detail = 'Tasks file is thin — may not cover all requirements';
            return base;
        }

        default:
            base.detail = `Unknown criterion: ${criterionId}`;
            return base;
    }
}

function evalArkDeveloper(sessionDir: string, criterion: CriterionDef, criterionId: string): CriterionResult {
    const base: CriterionResult = {
        id: criterionId,
        description: criterion.description,
        passed: false,
        weight: criterion.weight,
        type: criterion.type,
        detail: '',
    };

    const resultPath = findArtifact(sessionDir, 'artifacts/implement/_result.json');
    const resultJson = resultPath ? readJson(resultPath) : null;
    const evidencePath = findArtifact(sessionDir, 'artifacts/implement/test-evidence.md');
    const changesPath = findArtifact(sessionDir, 'artifacts/implement/changes.yaml');

    switch (criterionId) {
        case 'builds': {
            if (!resultJson) {
                base.detail = 'implement/_result.json not found';
                return base;
            }
            const buildPassed = resolveField(resultJson, 'agent_specific.build_passed');
            if (buildPassed !== true) {
                base.detail = `build_passed = ${JSON.stringify(buildPassed)}`;
                return base;
            }
            base.passed = true;
            base.detail = 'Build passed';
            return base;
        }

        case 'implemented_correctly': {
            if (!resultJson) {
                base.detail = 'implement/_result.json not found';
                return base;
            }
            if (resultJson.status === 'failure') {
                base.detail = `Status is failure: ${resultJson.summary || 'no summary'}`;
                return base;
            }
            // Check changes.yaml exists and lists files
            if (!changesPath) {
                base.detail = 'changes.yaml not found — no evidence of code changes';
                return base;
            }
            const changesContent = readFileSync(changesPath, 'utf-8');
            if (!changesContent.includes('files_modified') && !changesContent.includes('files_changed')) {
                base.detail = 'changes.yaml has no files_modified section';
                return base;
            }
            base.passed = true;
            base.detail = 'Implementation completed with code changes';
            return base;
        }

        case 'e2e_test_written': {
            if (!resultJson) {
                base.detail = 'implement/_result.json not found';
                return base;
            }
            const itw = resolveField(resultJson, 'agent_specific.integration_test_written');
            const ntc = resolveField(resultJson, 'agent_specific.new_test_created');
            if (itw !== true) {
                base.detail = `integration_test_written = ${JSON.stringify(itw)}`;
                return base;
            }
            if (ntc !== true) {
                base.detail = `new_test_created = ${JSON.stringify(ntc)} (agent may have reused existing test)`;
                return base;
            }
            base.passed = true;
            base.detail = 'New integration test written';
            return base;
        }

        case 'e2e_test_passes': {
            if (!evidencePath) {
                base.detail = 'test-evidence.md not found';
                return base;
            }
            const content = readFileSync(evidencePath, 'utf-8');
            // Look for "--- PASS" which Go test outputs on success
            if (!content.includes('--- PASS')) {
                // Also accept "PASS" at line start (go test summary)
                if (!content.match(/^PASS$/m) && !content.match(/^ok\s+/m)) {
                    base.detail = 'No "--- PASS" or "PASS" found in test-evidence.md';
                    return base;
                }
            }
            // Cross-validate: check for NOT RUN patterns
            const notRunPatterns = [/\bNOT RUN\b/i, /\bNOT EXECUTED\b/i, /\bSKIPPED.*requires infrastructure\b/i];
            for (const p of notRunPatterns) {
                if (p.test(content)) {
                    base.detail = `test-evidence.md contains "${content.match(p)?.[0]}" — tests may not have actually run`;
                    return base;
                }
            }
            base.passed = true;
            base.detail = 'Test pass evidence found in test-evidence.md';
            return base;
        }

        case 'manual_test_done': {
            if (!resultJson) {
                base.detail = 'implement/_result.json not found';
                return base;
            }
            const mtp = resolveField(resultJson, 'agent_specific.manual_test_passed');
            if (mtp !== true) {
                base.detail = `manual_test_passed = ${JSON.stringify(mtp)}`;
                return base;
            }
            if (!evidencePath) {
                base.detail = 'manual_test_passed=true but test-evidence.md not found';
                return base;
            }
            const content = readFileSync(evidencePath, 'utf-8');
            // Must have actual API/CLI output, not just build/vet
            const hasRealOutput = /curl|grpcurl|http|response|status.*200|"result"|"data"/i.test(content);
            if (!hasRealOutput) {
                base.detail = 'test-evidence.md lacks curl/grpcurl/API output — may not be real manual test';
                return base;
            }
            base.passed = true;
            base.detail = 'Manual test passed with real API/CLI evidence';
            return base;
        }

        case 'infra_setup':
        case 'performance':
            // These are transcript/log-based — always pass in deterministic eval
            // The skill handles transcript-based evaluation separately
            base.passed = true;
            base.detail = 'Transcript/log-based check — evaluated by skill, not engine';
            return base;

        default:
            base.detail = `Unknown criterion: ${criterionId}`;
            return base;
    }
}

function evalArkDeveloperCI(sessionDir: string, criterion: CriterionDef, criterionId: string): CriterionResult {
    const base: CriterionResult = {
        id: criterionId,
        description: criterion.description,
        passed: false,
        weight: criterion.weight,
        type: criterion.type,
        detail: '',
    };

    const resultPath = findArtifact(sessionDir, 'artifacts/ci/_result.json');
    const resultJson = resultPath ? readJson(resultPath) : null;

    if (!resultJson) {
        base.detail = 'ci/_result.json not found';
        return base;
    }

    const fieldMap: Record<string, string> = {
        'lint_passes': 'agent_specific.lint_passed',
        'build_passes': 'agent_specific.build_passed',
        'unit_tests_pass': 'agent_specific.unit_tests_passed',
        'integration_tests_pass': 'agent_specific.integration_tests_passed',
    };

    if (criterionId === 'integration_tests_run') {
        const skipped = resolveField(resultJson, 'agent_specific.integration_tests_skipped');
        if (skipped === true) {
            base.detail = 'Integration tests were SKIPPED';
            return base;
        }
        base.passed = true;
        base.detail = 'Integration tests were not skipped';
        return base;
    }

    const field = fieldMap[criterionId];
    if (field) {
        const value = resolveField(resultJson, field);
        if (value !== true) {
            base.detail = `${field} = ${JSON.stringify(value)}`;
            return base;
        }
        base.passed = true;
        base.detail = `${field} = true`;
        return base;
    }

    base.detail = `Unknown criterion: ${criterionId}`;
    return base;
}

function evalArkPRReviewer(sessionDir: string, criterion: CriterionDef, criterionId: string): CriterionResult {
    const base: CriterionResult = {
        id: criterionId,
        description: criterion.description,
        passed: false,
        weight: criterion.weight,
        type: criterion.type,
        detail: '',
    };

    const resultPath = findArtifact(sessionDir, 'artifacts/review/_result.json');
    const resultJson = resultPath ? readJson(resultPath) : null;

    if (!resultJson) {
        base.detail = 'review/_result.json not found';
        return base;
    }

    switch (criterionId) {
        case 'risk_assessed': {
            const rl = resolveField(resultJson, 'agent_specific.risk_level');
            if (!rl || (typeof rl === 'string' && rl.trim() === '')) {
                base.detail = 'risk_level is missing or empty';
                return base;
            }
            base.passed = true;
            base.detail = `risk_level = ${rl}`;
            return base;
        }

        case 'attention_areas': {
            const count = resolveField(resultJson, 'agent_specific.attention_areas_count');
            if (typeof count !== 'number' || count <= 0) {
                base.detail = `attention_areas_count = ${JSON.stringify(count)}`;
                return base;
            }
            base.passed = true;
            base.detail = `${count} attention areas identified`;
            return base;
        }

        default:
            base.detail = `Unknown criterion: ${criterionId}`;
            return base;
    }
}

// ── Main Evaluation ────────────────────────────────────────────────

function evaluateSession(sessionDir: string): EvalResult {
    const ARKADIAN_DIR = process.env.ARKADIAN_DIR || resolve(join(import.meta.dir, '..'));
    const criteriaPath = join(ARKADIAN_DIR, 'benchmarks', 'eval-criteria.yaml');

    if (!existsSync(criteriaPath)) {
        throw new Error(`eval-criteria.yaml not found at ${criteriaPath}`);
    }

    // Parse eval-criteria.yaml (simple field extraction, not full YAML parser)
    const criteriaContent = readFileSync(criteriaPath, 'utf-8');
    const passThresholdMatch = criteriaContent.match(/pass_threshold:\s*([\d.]+)/);
    const passThreshold = passThresholdMatch ? parseFloat(passThresholdMatch[1]) : 0.85;

    const agentResults: AgentResult[] = [];
    const allFailures: string[] = [];

    // Evaluate each agent using the appropriate evaluator
    const evaluators: Record<string, (sessionDir: string, criterion: CriterionDef, criterionId: string) => CriterionResult> = {
        'ark-guru': evalArkGuru,
        'ark-project-manager': evalArkPM,
        'ark-developer': evalArkDeveloper,
        'ark-developer-ci': evalArkDeveloperCI,
        'ark-pr-reviewer': evalArkPRReviewer,
    };

    // Agent criteria definitions (hardcoded to match eval-criteria.yaml structure)
    const agentCriteria: Record<string, Record<string, CriterionDef>> = {
        'ark-guru': {
            context_quality: { description: 'Context quality', type: 'artifact', check: '', weight: 2 },
            analysis_depth: { description: 'Analysis depth', type: 'artifact', check: '', weight: 1 },
            requirements_coverage: { description: 'Requirements coverage', type: 'artifact', check: '', weight: 2 },
            no_hallucinated_files: { description: 'No hallucinated files', type: 'artifact', check: '', weight: 2 },
            performance: { description: 'Performance', type: 'log', check: '', weight: 1, max_duration_minutes: 15 },
        },
        'ark-project-manager': {
            artifacts_produced: { description: 'Artifacts produced', type: 'artifact', check: '', weight: 2 },
            tasks_actionable: { description: 'Tasks actionable', type: 'artifact', check: '', weight: 1 },
            requirements_mapped: { description: 'Requirements mapped', type: 'artifact', check: '', weight: 2 },
            performance: { description: 'Performance', type: 'log', check: '', weight: 1, max_duration_minutes: 20 },
        },
        'ark-developer': {
            builds: { description: 'Builds', type: 'artifact', check: '', weight: 2 },
            implemented_correctly: { description: 'Implemented correctly', type: 'artifact', check: '', weight: 2 },
            e2e_test_written: { description: 'E2E test written', type: 'artifact', check: '', weight: 3 },
            e2e_test_passes: { description: 'E2E test passes', type: 'artifact', check: '', weight: 3 },
            manual_test_done: { description: 'Manual test done', type: 'artifact', check: '', weight: 3 },
            infra_setup: { description: 'Infra setup', type: 'transcript', check: '', weight: 1 },
            performance: { description: 'Performance', type: 'log', check: '', weight: 1, max_duration_minutes: 60 },
        },
        'ark-developer-ci': {
            lint_passes: { description: 'Lint passes', type: 'artifact', check: '', weight: 1 },
            build_passes: { description: 'Build passes', type: 'artifact', check: '', weight: 1 },
            unit_tests_pass: { description: 'Unit tests pass', type: 'artifact', check: '', weight: 1 },
            integration_tests_run: { description: 'Integration tests run', type: 'artifact', check: '', weight: 2 },
            integration_tests_pass: { description: 'Integration tests pass', type: 'artifact', check: '', weight: 2 },
        },
        'ark-pr-reviewer': {
            risk_assessed: { description: 'Risk assessed', type: 'artifact', check: '', weight: 1 },
            attention_areas: { description: 'Attention areas', type: 'artifact', check: '', weight: 1 },
        },
    };

    const phaseMap: Record<string, string> = {
        'ark-guru': 'explore',
        'ark-project-manager': 'plan',
        'ark-developer': 'implement',
        'ark-developer-ci': 'ci',
        'ark-pr-reviewer': 'review',
    };

    for (const [agentName, criteria] of Object.entries(agentCriteria)) {
        const evaluator = evaluators[agentName];
        if (!evaluator) continue;

        const criteriaResults: CriterionResult[] = [];
        let score = 0;
        let maxScore = 0;

        for (const [criterionId, criterionDef] of Object.entries(criteria)) {
            // Skip transcript/log-based checks in deterministic engine
            if (criterionDef.type === 'transcript' || criterionDef.type === 'log') {
                criteriaResults.push({
                    id: criterionId,
                    description: criterionDef.description,
                    passed: true,
                    weight: criterionDef.weight,
                    type: criterionDef.type,
                    detail: 'Transcript/log check — evaluated by skill',
                });
                score += criterionDef.weight;
                maxScore += criterionDef.weight;
                continue;
            }

            const result = evaluator(sessionDir, criterionDef, criterionId);
            criteriaResults.push(result);
            maxScore += result.weight;
            if (result.passed) {
                score += result.weight;
            } else {
                allFailures.push(`[${agentName}] ${criterionId}: ${result.detail}`);
            }
        }

        agentResults.push({
            agent: agentName,
            phase: phaseMap[agentName] || 'unknown',
            score,
            max_score: maxScore,
            percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
            criteria: criteriaResults,
        });
    }

    const overallScore = agentResults.reduce((s, a) => s + a.score, 0);
    const overallMax = agentResults.reduce((s, a) => s + a.max_score, 0);
    const overallPercentage = overallMax > 0 ? overallScore / overallMax : 0;

    return {
        session_dir: sessionDir,
        timestamp: new Date().toISOString(),
        pass: overallPercentage >= passThreshold,
        pass_threshold: passThreshold,
        overall_score: overallScore,
        overall_max: overallMax,
        overall_percentage: Math.round(overallPercentage * 100),
        agents: agentResults,
        failures: allFailures,
    };
}

// ── CLI ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let sessionDir = '';

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--session-dir' && args[i + 1]) {
        sessionDir = resolve(args[i + 1]);
        i++;
    } else if (args[i] === '--help') {
        console.log(`Usage: bun benchmarks/eval-engine.ts --session-dir <path>

Evaluates an arkadian session against eval-criteria.yaml.
Outputs JSON with per-agent scores and overall pass/fail.

Example:
  bun benchmarks/eval-engine.ts --session-dir sessions/arkd/2026-03-02-bitcoin-mtp-expiry`);
        process.exit(0);
    }
}

if (!sessionDir) {
    console.error('Error: --session-dir is required');
    console.error('Usage: bun benchmarks/eval-engine.ts --session-dir <path>');
    process.exit(1);
}

if (!existsSync(sessionDir)) {
    console.error(`Error: Session directory not found: ${sessionDir}`);
    process.exit(1);
}

try {
    const result = evaluateSession(sessionDir);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.pass ? 0 : 1);
} catch (e: any) {
    console.error(`Error: ${e.message}`);
    process.exit(2);
}
