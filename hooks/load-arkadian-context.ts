#!/usr/bin/env bun

/**
 * Arkadian Orchestrator Reminder Hook
 *
 * Triggered on UserPromptSubmit to remind Claude to follow the orchestrator rules.
 * This is a lightweight hook that just outputs a reminder message.
 */

async function main() {
    const reminder = `
⚠️ **ORCHESTRATOR COMPLIANCE REMINDER**

## Tiered Context Policy (Mandatory)

| Tier | Who Loads | What | When |
|------|-----------|------|------|
| Tier 1 | Orchestrator (ALWAYS) | docs/INDEX.md | Step 1 - before any decision |
| Tier 2 | Orchestrator (per project) | docs/projects/<id>/INDEX.md | Step 4 - after project selection |
| Tier 3 | Agents (instructed) | Doc sections from default_sections_by_intent | Via execution spec |
| Tier 4 | Agents (instructed) | Code files from repo_source.repo_root | Via execution spec |

## Request Handling Workflow (9 Steps)

1. **Step 1**: Load Master Registry (Tier 1) - load \`docs/INDEX.md\` FIRST
2. **Step 2**: Intent Classification - classify using registry context
3. **Step 3**: Dynamic Project Selection - score and select projects
4. **Step 4**: Load Project Indexes (Tier 2) - load each selected project's INDEX.md
5. **Step 5**: Derive Doc Sections (Tier 3) - determine sections for agents
6. **Step 6**: Prepare Repo Hints (Tier 4) - provide repo paths to agents
7. **Step 7**: Workflow Template Selection - match intent to template
8. **Step 8**: Phase → Step Expansion - create execution specs
9. **Step 9**: Context Injection - inject all context into each step

## Critical Rules

- NEVER skip approval gates (Gate 1: Plan, Gate 2: Spec, Gate 3: Continue)
- NEVER invoke agents without showing the full spec first
- ALWAYS load Tier 1 before intent classification
- ALWAYS load Tier 2 before building execution specs
- ALL doc sections MUST be passed to agents in the execution specification

**Follow the instructions loaded into your memory strictly.**
`;

    console.log(reminder);
    process.exit(0);
}

main();
