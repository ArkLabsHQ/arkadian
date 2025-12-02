#!/usr/bin/env bun

/**
 * Arkadian Agent Input Validator Hook
 *
 * PreToolUse hook that validates Task tool inputs to ensure they follow
 * the Execution Specification format before invoking any agent.
 *
 * Specification format defined in: templates/sub_agent_input_spec.md
 *
 * Exit codes:
 * - 0: Valid input, continue
 * - 2: Invalid input, block the tool call (error shown to orchestrator)
 */

import { appendFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ARKADIAN_DIR = process.env.ARKADIAN_DIR || process.env.HOME + '/code/go/arkadian';
const LOG_FILE = join(ARKADIAN_DIR, 'log/test.txt');

// List of Arkadian agents that require validated input
const ARKADIAN_AGENTS = [
    'ark-guru',
    'ark-developer',
    'ark-env-tester',
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
}

function log(label: string, data: any) {
    const timestamp = new Date().toISOString();
    let output = `\n[${timestamp}] [validate-agent] ${label}:\n`;

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
    // Simple YAML parser for our specific format
    const result: Record<string, any> = {};
    const lines = yamlContent.split('\n');

    let currentKey = '';
    let inArray = false;
    let arrayKey = '';

    for (const line of lines) {
        // Skip comments and empty lines
        if (line.trim().startsWith('#') || line.trim() === '') continue;

        // Check for array item
        if (line.match(/^\s+-\s/)) {
            if (arrayKey) {
                if (!result[arrayKey]) result[arrayKey] = [];
                result[arrayKey].push(line.replace(/^\s+-\s/, '').trim());
            }
            continue;
        }

        // Check for key: value
        const kvMatch = line.match(/^(\s*)(\w+):\s*(.*)$/);
        if (kvMatch) {
            const [, indent, key, value] = kvMatch;
            const indentLevel = indent.length;

            if (indentLevel === 0) {
                currentKey = key;
                if (value.trim()) {
                    result[key] = value.trim().replace(/^["']|["']$/g, '');
                } else {
                    // Could be object or array
                    result[key] = {};
                }
                arrayKey = '';
                inArray = false;
            } else if (indentLevel === 2 && currentKey) {
                if (typeof result[currentKey] !== 'object') {
                    result[currentKey] = {};
                }
                if (value.trim()) {
                    result[currentKey][key] = value.trim().replace(/^["']|["']$/g, '');
                } else {
                    result[currentKey][key] = [];
                    arrayKey = key;
                }
            }
        }
    }

    return result;
}

function validateExecutionSpec(prompt: string): ValidationResult {
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

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

async function main() {
    try {
        const input = await Bun.stdin.text();
        const hookInput: HookInput = JSON.parse(input);

        // Only validate Task tool calls
        if (hookInput.tool_name !== 'Task') {
            process.exit(0);
        }

        const subagentType = hookInput.tool_input?.subagent_type || '';
        const prompt = hookInput.tool_input?.prompt || '';

        log('Validating agent input', { subagentType, promptLength: prompt.length });

        // Only validate for Arkadian agents
        if (!ARKADIAN_AGENTS.includes(subagentType)) {
            log('Skipping validation', `Agent "${subagentType}" is not an Arkadian agent`);
            process.exit(0);
        }

        // Validate the execution specification
        const result = validateExecutionSpec(prompt);

        log('Validation result', result);

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

session_context:
  session_dir: "<from auto-injected Session Context>"
  artifacts_dir: "<session_dir>/artifacts"
  specs_dir: "<session_dir>/specs"

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
            process.exit(2); // Exit code 2 = block tool call
        }

        // Valid - log warnings if any
        if (result.warnings.length > 0) {
            log('Validation warnings', result.warnings);
        }

        process.exit(0);
    } catch (error: any) {
        log('Validation error', { message: error.message, stack: error.stack });
        // Don't block on hook errors - let the tool call proceed
        process.exit(0);
    }
}

main();
