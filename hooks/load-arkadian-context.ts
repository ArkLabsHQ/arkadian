#!/usr/bin/env bun

/**
 * Arkadian Dynamic Context Loading Hook
 *
 * Triggered on UserPromptSubmit to intelligently load relevant project contexts
 * based on semantic analysis of the user's prompt.
 *
 * Hook Protocol:
 * - Input: JSON via stdin with { session_id, prompt, transcript_path, hook_event_name }
 * - Output: Markdown instructions to stdout for Claude to process
 *
 * Strategy:
 * - Instructs Claude to load the master INDEX.md
 * - Provides the user's prompt for semantic analysis
 * - Claude will then decide which project contexts to load
 */

import { join } from 'path';

const ARKADIAN_DIR = process.env.ARKADIAN_DIR || process.env.HOME + '/code/go/arkadian';

// Read environment variables that subagents will need
const ENV_VARS = {
    ARKADIAN_DIR,
    ARKD_REPO: process.env.ARKD_REPO || '',
    GO_SDK_REPO: process.env.GO_SDK_REPO || '',
    WALLET_REPO: process.env.WALLET_REPO || '',
    ARK_FAUCET_REPO: process.env.ARK_FAUCET_REPO || '',
    ARK_SIMULATOR_REPO: process.env.ARK_SIMULATOR_REPO || '',
    ARK_TELEMETRY_REPO: process.env.ARK_TELEMETRY_REPO || '',
    ARK_INFRA_REPO: process.env.ARK_INFRA_REPO || '',
    KMS_UNLOCKER_REPO: process.env.KMS_UNLOCKER_REPO || '',
    FULMINE_REPO: process.env.FULMINE_REPO || '',
    FULMINE_SIMULATOR_REPO: process.env.FULMINE_SIMULATOR_REPO || '',
    BOLTZ_BACKEND_REPO: process.env.BOLTZ_BACKEND_REPO || '',
    ARK_DOCS_REPO: process.env.ARK_DOCS_REPO || '',
    ARKADE_ESCROW_REPO: process.env.ARKADE_ESCROW_REPO || '',
    ARKADE_EXPLORER_REPO: process.env.ARKADE_EXPLORER_REPO || '',
};

async function main() {
    try {
        // Read hook input from stdin
        const input = await Bun.stdin.text();
        const hookData = JSON.parse(input);

        const userPrompt = hookData.prompt || '';
        const masterIndexPath = join(ARKADIAN_DIR, 'docs/INDEX.md');
        const projectsDocsPath = join(ARKADIAN_DIR, 'docs/projects');

        // Generate dynamic loading instructions for Claude
        // IMPORTANT: Use fully resolved absolute paths, NOT ${VAR} syntax
        // Subagents do NOT have access to env vars from settings.json
        const instructions = `
# 🎯 Arkadian Dynamic Context Loading

**User Request:** ${userPrompt}

## Resolved Environment Paths (for subagents)
\`\`\`
ARKADIAN_DIR=${ARKADIAN_DIR}
ARKD_REPO=${ENV_VARS.ARKD_REPO}
GO_SDK_REPO=${ENV_VARS.GO_SDK_REPO}
WALLET_REPO=${ENV_VARS.WALLET_REPO}
ARK_FAUCET_REPO=${ENV_VARS.ARK_FAUCET_REPO}
ARK_SIMULATOR_REPO=${ENV_VARS.ARK_SIMULATOR_REPO}
ARK_TELEMETRY_REPO=${ENV_VARS.ARK_TELEMETRY_REPO}
ARK_INFRA_REPO=${ENV_VARS.ARK_INFRA_REPO}
KMS_UNLOCKER_REPO=${ENV_VARS.KMS_UNLOCKER_REPO}
FULMINE_REPO=${ENV_VARS.FULMINE_REPO}
FULMINE_SIMULATOR_REPO=${ENV_VARS.FULMINE_SIMULATOR_REPO}
BOLTZ_BACKEND_REPO=${ENV_VARS.BOLTZ_BACKEND_REPO}
ARK_DOCS_REPO=${ENV_VARS.ARK_DOCS_REPO}
ARKADE_ESCROW_REPO=${ENV_VARS.ARKADE_ESCROW_REPO}
ARKADE_EXPLORER_REPO=${ENV_VARS.ARKADE_EXPLORER_REPO}
\`\`\`

## Instructions for Claude:

1. **IMMEDIATELY load the master project registry:**
   \`\`\`
   read ${masterIndexPath}
   \`\`\`

2. **Analyze the user's request** to determine which projects are relevant

3. **Score each project** based on:
   - Keyword overlap with tags, synonyms, triggers
   - Semantic match with description
   - Capability alignment with user intent

4. **Load relevant project INDEX.md files** (typically 1-3 projects):
   - Load only the INDEX.md initially (not deep docs)
   - Use absolute paths: \`read ${projectsDocsPath}/<project_id>/INDEX.md\`

5. **Then respond** to the user's request using the loaded context

**CRITICAL**: When delegating to subagents, ALWAYS include the resolved paths above in the execution spec. Subagents do NOT have access to environment variables - they need absolute paths.

**Remember:** You are the Ark Assistant orchestrator. Your role is to intelligently select and load only the relevant project contexts needed to help the user.
`;

        console.log(instructions);
        process.exit(0);
    } catch (error) {
        console.error('Error in Arkadian context loading:', error);
        process.exit(1);
    }
}

main();
