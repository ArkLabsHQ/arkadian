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

async function main() {
    try {
        // Read hook input from stdin
        const input = await Bun.stdin.text();
        const hookData = JSON.parse(input);

        const userPrompt = hookData.prompt || '';
        const masterIndexPath = join(ARKADIAN_DIR, 'docs/INDEX.md');

        // Generate dynamic loading instructions for Claude
        const instructions = `
# 🎯 Arkadian Dynamic Context Loading

**User Request:** ${userPrompt}

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
   - Format: \`read \${ARKADIAN_DIR}/docs/projects/<project_id>/INDEX.md\`

5. **Then respond** to the user's request using the loaded context

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
