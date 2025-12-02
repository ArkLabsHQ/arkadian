# PAI (Personal AI Infrastructure) Analysis

Analysis of patterns from `/Users/dusansekulic/code/go/Personal_AI_Infrastructure` that could enhance Arkadian.

## Overview

PAI is a mature Claude Code extension system with ~50 skills organized across domains. It emphasizes:
- CLI-first architecture with AI orchestration layer
- Progressive disclosure (3-tier context loading)
- Structured output with consistent formatting
- Voice integration for completion notifications
- Comprehensive history and learning capture

## Key Architectural Patterns

### 1. Progressive Disclosure (3-Tier Context)

PAI loads context in tiers to minimize token usage:

| Tier | Content | When Loaded |
|------|---------|-------------|
| **Tier 1** | System prompt only | Always (minimal) |
| **Tier 2** | Skill prompt (SKILL.md) | On skill activation |
| **Tier 3** | Reference files | On-demand during execution |

**Arkadian Equivalent**: We have tiered context in ORCHESTRATOR.md but could formalize this more:
- Tier 1: ORCHESTRATOR.md base
- Tier 2: Agent prompt + skill prompts
- Tier 3: Project docs from docs/projects/

**Recommendation**: Add explicit tier annotations to docs/INDEX.md and enforce in context loading hook.

---

### 2. CLI-First Architecture

PAI's core philosophy: **Build deterministic CLI tools first, then wrap with AI orchestration**.

```
┌─────────────────────────────────────┐
│          AI Orchestration           │  ← Natural language interface
├─────────────────────────────────────┤
│        TypeScript Wrappers          │  ← Error handling, formatting
├─────────────────────────────────────┤
│          CLI Tools (pai-*)          │  ← Deterministic, testable
├─────────────────────────────────────┤
│         External Services           │  ← APIs, databases, etc.
└─────────────────────────────────────┘
```

**PAI Examples**:
- `pai-cal` - Calendar operations (deterministic CLI)
- `pai-notes` - Note management (deterministic CLI)
- `pai-voice` - Voice synthesis (deterministic CLI)

**Arkadian Opportunity**: Create `ark-*` CLI tools for:
- `ark-doc-sync` - Sync project documentation
- `ark-session` - Session management
- `ark-workflow` - Workflow execution
- `ark-health` - Environment health checks

**Benefits**:
- Testable independently of AI
- Cacheable results
- Composable in pipelines
- Reproducible behavior

---

### 3. Skill Structure Pattern

PAI skills are self-contained directories with consistent structure:

```
skills/
├── CORE/                          # Always loaded
│   ├── CONSTITUTION.md            # Principles & architecture
│   ├── SKILL-STRUCTURE-AND-ROUTING.md
│   └── hook-system.md
│
├── domain/skill-name/
│   ├── SKILL.md                   # Main prompt (Tier 2)
│   ├── ref/                       # Reference files (Tier 3)
│   │   ├── api-examples.md
│   │   └── error-codes.md
│   └── tools/                     # Skill-specific CLIs
│       └── helper.ts
```

**Key Elements of SKILL.md**:
```markdown
---
name: skill-name
description: One-line description
triggers: ["keyword1", "keyword2"]
model: sonnet|opus|haiku
dependencies: ["other-skill"]
---

## Purpose
What this skill does

## Capabilities
- Capability 1
- Capability 2

## Workflow
1. Step 1
2. Step 2

## Output Format
Expected output structure

## Delegation Rules
When to hand off to other skills
```

**Arkadian Comparison**:

| PAI | Arkadian | Gap |
|-----|----------|-----|
| SKILL.md | skills/*/prompt.md | Similar |
| ref/ directory | docs/projects/ | Different location |
| triggers in frontmatter | description in frontmatter | Less explicit routing |
| tools/ directory | No equivalent | Missing |
| CORE/ always loaded | ORCHESTRATOR.md | Similar concept |

**Recommendation**: Add `triggers` field to skill frontmatter for automatic routing.

---

### 4. System Prompt Routing

PAI uses a 4-level routing hierarchy:

```
Level 1: Domain Keywords     → "calendar", "notes", "voice"
Level 2: Action Verbs        → "create", "list", "sync"
Level 3: Context Patterns    → File extensions, project names
Level 4: Explicit Commands   → /skill-name
```

**Example Routing Table** (from PAI):
```yaml
calendar:
  triggers: ["calendar", "meeting", "schedule", "appointment"]
  action_verbs: ["add", "list", "cancel", "reschedule"]
  skill: pai-calendar

development:
  triggers: ["code", "implement", "fix", "debug"]
  sub_routing:
    - pattern: "*.go"
      skill: go-dev
    - pattern: "*.ts"
      skill: ts-dev
```

**Arkadian Opportunity**: Add routing table to ORCHESTRATOR.md:
```yaml
ark_routing:
  research:
    triggers: ["explain", "what is", "how does", "research"]
    agent: ark-guru

  implementation:
    triggers: ["implement", "add", "create", "fix"]
    sub_routing:
      - context: "specification"
        agent: ark-project-manager
      - context: "code"
        agent: ark-developer

  testing:
    triggers: ["test", "verify", "check", "run tests"]
    agent: ark-env-tester
```

---

### 5. Unified Output Capture System (UOCS)

PAI standardizes all outputs with emoji-prefixed sections:

```markdown
## Output Structure

### Status Indicators
- ✅ Success
- ❌ Failure
- ⚠️ Warning/Partial
- 🔄 In Progress
- 📋 Info/Summary

### Standard Sections
📋 **Summary**: One-line result
📊 **Details**: Structured data
📁 **Artifacts**: File paths
🔗 **References**: Related items
⏭️ **Next Steps**: Suggested actions
```

**Arkadian Current State**: Agents have `<agent_result>` XML format but inconsistent across agents.

**Recommendation**: Standardize all agent outputs:

```xml
<agent_result>
  <status>success|failure|partial</status>
  <summary>📋 One-line summary</summary>

  <details>
    📊 Structured details here
  </details>

  <artifacts>
    📁 /path/to/artifact1.md
    📁 /path/to/artifact2.json
  </artifacts>

  <next_steps>
    ⏭️ Suggested action 1
    ⏭️ Suggested action 2
  </next_steps>

  <handover>
    <needed>true|false</needed>
    <to>agent-name</to>
    <reason>Why handover needed</reason>
  </handover>
</agent_result>
```

---

### 6. Voice Integration

PAI uses ElevenLabs for completion notifications:

```typescript
// pai-voice CLI
pai voice say "Task completed successfully"
pai voice say --voice "Rachel" "Build passed with 47 tests"

// Automatic completion hooks
SessionEnd → pai voice say "Session complete. ${summary}"
LongTaskComplete → pai voice say "Finished: ${task_name}"
```

**Configuration**:
```json
{
  "voice": {
    "enabled": true,
    "provider": "elevenlabs",
    "voice_id": "rachel",
    "notify_on": ["session_end", "task_complete", "error"]
  }
}
```

**Arkadian Opportunity**: Add optional voice notifications:
- Session complete summaries
- Long-running task completion (tests, builds)
- Error alerts
- Handover announcements

---

### 7. History System

PAI automatically captures learning and context:

```
.pai/
├── history/
│   ├── sessions/           # Session transcripts
│   │   └── 2024-12-02-arkd-feature.md
│   ├── learnings/          # Extracted insights
│   │   └── arkd-patterns.md
│   ├── decisions/          # Decision records
│   │   └── 2024-12-02-api-design.md
│   └── research/           # Research findings
│       └── vtxo-lifecycle.md
```

**Auto-capture Rules**:
1. On session end → Extract key learnings
2. On error resolution → Document solution
3. On architecture decision → Create ADR
4. On research completion → Save findings

**Arkadian Opportunity**: Enhance session management:
```
sessions/<SESSION_ID>/
├── metadata.json
├── transcript.md          # NEW: Session transcript
├── learnings.md           # NEW: Extracted insights
├── artifacts/
└── specs/
```

---

### 8. Two-Tier MCP Strategy

PAI organizes MCP servers in two tiers:

**Tier 1: Discovery (Legacy MCPs)**
- Generic capabilities
- Broad functionality
- Used for exploration

**Tier 2: Production (TypeScript Wrappers)**
- Specific, tested flows
- Error handling
- Structured outputs
- Preferred for execution

```typescript
// Example: Calendar integration
// Tier 1: mcp__google-calendar (generic MCP)
// Tier 2: pai-cal (TypeScript wrapper)

// Wrapper provides:
// - Input validation
// - Error handling
// - Consistent output format
// - Caching
// - Logging
```

**Arkadian Opportunity**: Create TypeScript wrappers for common operations:
- `ark-nigiri` - Wrap nigiri CLI with better output
- `ark-arkd-client` - Wrap arkd gRPC calls
- `ark-docker` - Wrap docker-compose operations

---

### 9. Cross-Skill Delegation

PAI has explicit delegation patterns:

```markdown
## Delegation Rules

### When to Delegate
- Task outside skill scope → Delegate to appropriate skill
- Multi-domain task → Orchestrate multiple skills
- Specialized knowledge needed → Delegate to domain expert

### Delegation Format
<delegate>
  <to>skill-name</to>
  <reason>Why delegating</reason>
  <context>Relevant context for receiving skill</context>
  <expected_output>What to return</expected_output>
</delegate>

### Return Protocol
- Always return to delegating skill
- Include all artifacts
- Summarize what was done
```

**Arkadian Comparison**: We have handover blocks but could be more explicit about:
- When to delegate vs continue
- Context to pass
- Expected return format

---

### 10. Hook System Patterns

PAI uses hooks extensively:

| Hook | Purpose | PAI Usage |
|------|---------|-----------|
| `PreToolUse` | Validation | Tool restrictions, path checks |
| `PostToolUse` | Capture | Result logging, metrics |
| `SessionStart` | Setup | Context loading, history |
| `SessionEnd` | Cleanup | Summary, voice notification |
| `UserPromptSubmit` | Routing | Skill selection, context injection |
| `Stop` | Graceful exit | Save state, cleanup |

**PAI Hook Patterns**:
```typescript
// Chained hooks
hooks: [
  "log-tool-use",      // Log all tool calls
  "check-permissions", // Validate permissions
  "inject-context",    // Add relevant context
]

// Conditional hooks
{
  "event": "PreToolUse",
  "tools": ["Write", "Edit"],
  "command": "validate-write.ts"
}
```

**Arkadian Current Hooks**:
- `orchestrator-guardrail.ts` - PreToolUse
- `load-arkadian-context.ts` - UserPromptSubmit
- `session-start-hook.ts` - SessionStart
- `session-stop-hook.ts` - SessionEnd

**Gaps**:
- No PostToolUse logging
- No metrics capture
- No conditional hook execution

---

## Comparison Matrix

| Feature | PAI | Arkadian | Priority |
|---------|-----|----------|----------|
| Progressive Disclosure | 3-tier explicit | 2-tier implicit | HIGH |
| CLI-First Tools | Yes (pai-*) | No | MEDIUM |
| Skill Triggers | Frontmatter + routing table | Description only | HIGH |
| Structured Output | UOCS standard | XML inconsistent | HIGH |
| Voice Integration | ElevenLabs | None | LOW |
| History System | Auto-capture | Manual | MEDIUM |
| MCP Wrappers | TypeScript tier | Direct MCP | MEDIUM |
| Delegation Protocol | Explicit rules | Handover blocks | MEDIUM |
| Hook Logging | PostToolUse | None | LOW |

---

## Adoption Roadmap

### Phase 1: Quick Wins (Low Effort, High Impact)

1. **Add triggers to skill frontmatter**
   ```yaml
   ---
   name: pm-spec
   triggers: ["specification", "spec", "requirements", "user stories"]
   ---
   ```

2. **Standardize agent output format**
   - Add emoji headers to all agent outputs
   - Consistent `<agent_result>` structure across all agents

3. **Create routing table in ORCHESTRATOR.md**
   - Map keywords to agents
   - Add action verb routing

### Phase 2: Infrastructure (Medium Effort)

4. **Enhance session management**
   - Add transcript capture
   - Auto-extract learnings on session end
   - Store decision records

5. **Add PostToolUse logging hook**
   - Log all tool calls to session
   - Capture timing metrics
   - Enable debugging

6. **Create ark-* CLI tools**
   - Start with `ark-doc-sync`
   - Add `ark-session` management
   - Build `ark-health` checker

### Phase 3: Advanced Features (Higher Effort)

7. **TypeScript MCP wrappers**
   - Wrap nigiri operations
   - Wrap docker-compose
   - Add error handling layer

8. **Voice integration** (optional)
   - Add ElevenLabs support
   - Session completion notifications
   - Error alerts

9. **History auto-capture**
   - Extract learnings from sessions
   - Build searchable knowledge base
   - ADR generation

---

## Implementation Notes

### Triggers Implementation

Add to skills frontmatter parsing in context-loading:

```typescript
interface SkillFrontmatter {
  name: string;
  description: string;
  triggers?: string[];  // NEW
  model?: string;
}

function routeToSkill(prompt: string, skills: Skill[]): Skill | null {
  const lowerPrompt = prompt.toLowerCase();

  for (const skill of skills) {
    if (skill.triggers?.some(t => lowerPrompt.includes(t))) {
      return skill;
    }
  }

  return null;
}
```

### UOCS Output Standard

Create template for all agents:

```markdown
## Agent Output Template

📋 **Summary**: ${one_line_summary}

📊 **Results**:
${structured_results}

📁 **Artifacts**:
${artifact_list}

⏭️ **Next Steps**:
${recommended_actions}

🔄 **Handover**: ${handover_if_needed}
```

### Session Enhancement

Modify `session-stop-hook.ts`:

```typescript
async function extractLearnings(sessionDir: string): Promise<void> {
  // Read session transcript
  // Use Claude to extract key learnings
  // Save to learnings.md
}

async function onSessionEnd(sessionId: string): Promise<void> {
  await extractLearnings(sessionDir);
  await generateSummary(sessionDir);
  // Optional: voice notification
}
```

---

## Discussion Points

1. **CLI-First Priority**: Should we invest in `ark-*` CLI tools or focus on agent improvements?

2. **Voice Integration**: Is audio feedback valuable for long sessions, or is it noise?

3. **History Depth**: How much auto-capture is useful vs. creates clutter?

4. **Trigger Routing**: Should routing be in ORCHESTRATOR.md or distributed in skill files?

5. **MCP Wrapper Layer**: Worth the investment for better error handling?

---

## References

- PAI CONSTITUTION.md: Core principles and architecture
- PAI SKILL-STRUCTURE-AND-ROUTING.md: Skill system details
- PAI hook-system.md: Hook patterns and configuration
- Arkadian ORCHESTRATOR.md: Current orchestration approach
- Arkadian agents/: Current agent definitions
