# Research Findings: Orchestration Foundation (Phase 1)

**Feature**: 001-orchestration-foundation
**Date**: 2025-10-25
**Phase**: 0 (Research)

## Overview

This document resolves technical unknowns identified in the planning phase and documents design decisions with rationales.

---

## Research Item 1: YAML Template Best Practices

**Question**: What is the best structure and format for workflow template YAML files?

**Decision**: Use human-readable YAML with explicit structure, type annotations via comments, and clear separation of metadata vs execution logic.

**Rationale**:
- YAML is already used in agent INPUT CONTRACTs, so consistency with existing patterns
- YAML supports comments, making templates self-documenting
- Easier for humans to read and modify than JSON
- Industry standard for configuration management (Kubernetes, GitHub Actions, etc.)

**Template Structure**:
```yaml
# Workflow metadata
name: "feature_full_lifecycle"
description: "Medium to large feature with full planning cycle"
version: "1.0.0"

# Intent matching criteria
applies_to:
  primary_intent: "develop"
  sub_intent: ["medium_feature", "large_feature"]
  complexity: ["medium", "complex"]
  urgency: ["low", "normal", "high"]  # Excludes critical

# Execution specification
agents: ["ark-project-manager", "ark-developer", "ark-tester"]

phases:
  - id: "specify"
    agent: "project-manager"
    approval_required: true
    actions: ["use pm-spec skill", "create spec.md"]
    checkpoint: "specs/{feature-id}/spec.md"

  - id: "plan"
    agent: "project-manager"
    depends_on: "specify"
    approval_required: true
    actions: ["use pm-plan skill", "create plan.md"]
    checkpoint: "specs/{feature-id}/plan.md"

  # ... more phases

# Validation
success_criteria:
  - "spec.md exists and passes validation"
  - "plan.md contains architecture decisions"
  - "All tests pass"

# Performance
estimated_duration_seconds: 2700  # 45 minutes
max_duration_seconds: 5400  # 90 minutes timeout
```

**Alternatives Considered**:
- **JSON**: More strict schema validation, but less human-readable
- **TOML**: Good readability, but less familiar in ecosystem
- **Custom DSL**: Maximum flexibility, but adds learning curve

**Rejected Because**: YAML provides the best balance of readability, ecosystem familiarity, and tooling support.

**References**:
- GitHub Actions workflow syntax (industry standard)
- Kubernetes manifests (proven at scale)
- Existing agent INPUT CONTRACT format in Arkadian

---

## Research Item 2: Token Estimation Algorithms

**Question**: Should we use `chars / 4` heuristic or integrate `tiktoken` library for accurate token counting?

**Decision**: Use `chars / 4` heuristic for Phase 1, plan to integrate `tiktoken` in Phase 3 if accuracy becomes an issue.

**Rationale**:
- **Simplicity**: `chars / 4` requires no external dependencies
- **Conservative bias**: `chars / 4` tends to overestimate, providing safety margin
- **Good enough**: For context budget protection, approximate estimation is sufficient (we have 4 overflow strategies as fallbacks)
- **Performance**: No API calls to tokenization library (faster loading)

**Accuracy Analysis**:
```
For typical Markdown documentation:
- chars / 4: ~25% overestimate (safe)
- tiktoken (cl100k_base): accurate but requires import

Example:
- File: 8000 characters
- chars / 4: 2000 tokens (estimated)
- tiktoken: ~1600 tokens (actual)
- Difference: +400 tokens (20% overestimate)

Context budget impact:
- If we load 10 files at 8000 chars each
- chars / 4: 20,000 tokens estimated
- tiktoken: ~16,000 tokens actual
- Wasted budget: 4,000 tokens (2% of 200K limit)
```

**Alternatives Considered**:
- **tiktoken library**: Accurate, but adds dependency and computational overhead
- **chars / 3**: Closer to accurate, but underestimates for some files (risky)
- **chars / 5**: Safer margin, but wastes too much budget

**Rejected Because**: `tiktoken` adds complexity for marginal benefit in Phase 1. The 20% overestimate from `chars / 4` is acceptable given our overflow strategies activate at 80%, 85%, 90%, 95% thresholds.

**Future Work**: If context budget logs show consistent wasted capacity, integrate `tiktoken` in Phase 3 learning system.

---

## Research Item 3: JSON Schema Validation Approaches

**Question**: How should we validate execution-history.json structure to ensure data quality for Phase 3 learning?

**Decision**: Use inline JSON schema validation in execution logger, with graceful degradation if validation fails.

**Rationale**:
- **Data quality**: Schema validation ensures consistent structure for future learning system
- **Early error detection**: Invalid logs are caught immediately, not discovered later
- **Documentation**: JSON schema serves as executable documentation
- **Graceful degradation**: If validation fails, log warning but don't block workflow

**Schema Validation Strategy**:
```python
# Option 1: Inline schema (no dependencies)
EXECUTION_RECORD_SCHEMA = {
    "required": ["execution_id", "timestamp", "user_request", "intent", "workflow"],
    "properties": {
        "execution_id": {"type": "string", "pattern": "^[a-f0-9-]{36}$"},
        "timestamp": {"type": "string", "format": "date-time"},
        "user_request": {"type": "string", "minLength": 1},
        "intent": {
            "type": "object",
            "required": ["primary"],
            "properties": {
                "primary": {"type": "string", "enum": ["ask_question", "develop", "debug", ...]},
                "sub_intent": {"type": "string"},
                "complexity": {"type": "string", "enum": ["simple", "medium", "complex"]},
                "urgency": {"type": "string", "enum": ["low", "normal", "high", "critical"]}
            }
        },
        # ... more fields
    }
}

def validate_execution_record(record):
    try:
        # Simple validation: check required fields exist
        for field in EXECUTION_RECORD_SCHEMA["required"]:
            if field not in record:
                raise ValueError(f"Missing required field: {field}")
        return True
    except Exception as e:
        print(f"WARNING: Execution record validation failed: {e}")
        return False  # Don't block logging on validation failure
```

**Alternatives Considered**:
- **jsonschema library**: Full JSON Schema Draft 7 support, but adds dependency
- **No validation**: Simpler, but risks corrupted data for learning system
- **TypeScript/Zod**: Strong typing, but requires Node.js runtime

**Rejected Because**: `jsonschema` library is overkill for our simple schema. Inline validation provides sufficient data quality without dependencies.

**Implementation**: Validation logic will be embedded in execution logger utility or CLAUDE.md instructions.

---

## Research Item 4: Newline-Delimited JSON vs JSON Array

**Question**: Should execution-history.json use newline-delimited JSON (NDJSON) or a JSON array?

**Decision**: Use newline-delimited JSON (NDJSON) format.

**Rationale**:
- **Append-only**: NDJSON allows O(1) appends (just write new line), whereas JSON array requires parsing entire file, adding element, re-serializing
- **Streaming**: NDJSON can be processed line-by-line (memory-efficient for large files)
- **Fault tolerance**: Corrupted line doesn't invalidate entire file
- **Simplicity**: `echo '{"execution_id": "..."}' >> execution-history.json` works perfectly
- **Industry standard**: Used by Elasticsearch, Hadoop, etc. for event logs

**Format**:
```json
{"execution_id":"uuid-1","timestamp":"2025-10-25T10:00:00Z","user_request":"fix typo","intent":{"primary":"develop","sub_intent":"quick_fix"},"workflow":"quick_fix","duration_seconds":120,"success":true}
{"execution_id":"uuid-2","timestamp":"2025-10-25T11:00:00Z","user_request":"add alerts","intent":{"primary":"develop","sub_intent":"medium_feature"},"workflow":"feature_full_lifecycle","duration_seconds":2700,"success":true}
{"execution_id":"uuid-3","timestamp":"2025-10-25T12:00:00Z","user_request":"debug prod issue","intent":{"primary":"debug","urgency":"critical"},"workflow":"debug_and_fix","duration_seconds":600,"success":true}
```

**Reading NDJSON** (for Phase 3 learning):
```python
def read_execution_history(file_path):
    records = []
    with open(file_path, 'r') as f:
        for line in f:
            if line.strip():  # Skip empty lines
                records.append(json.loads(line))
    return records
```

**Alternatives Considered**:
- **JSON array**: `[{...}, {...}]` - Requires full file parse on each append
- **JSON Lines with pretty print**: Readable but larger file size
- **CSV**: Simple but can't represent nested intent/context_usage objects

**Rejected Because**: JSON array has O(n) append cost, CSV can't represent complex nested structures, pretty-printed JSON wastes disk space.

---

## Research Item 5: Context Budget Tracking Implementation

**Question**: Should context budget tracking be implemented as a Python utility script or inline pseudo-code in CLAUDE.md?

**Decision**: Implement as inline instructions in CLAUDE.md (pseudo-code), with optional Python utility for complex operations.

**Rationale**:
- **CLAUDE.md is a prompt file**: It instructs the Claude Code AI on how to behave; budget tracking is a conceptual guideline more than executable code
- **Portability**: Inline instructions work regardless of whether Python is available
- **Simplicity**: The orchestrator (Claude AI) can track budget conceptually without needing external scripts
- **Flexibility**: Claude AI can adapt tracking logic to specific situations

**Inline Approach** (in CLAUDE.md):
```markdown
### Context Budget Tracking

**Conceptual Model**: Maintain running budget as you load files.

**Before loading any file**:
1. Estimate tokens: file_size_chars / 4
2. Check: current_usage + estimate <= tier_limit AND current_usage + estimate <= 200000
3. If exceeded: Apply overflow strategy
4. Load file
5. Update: current_usage += estimate, tier_usage[tier] += estimate

**Overflow Strategies** (apply progressively):
- At 80% (160K tokens): Remove oldest files from tier 3
- At 85% (170K tokens): Remove architecture docs, keep usage/testing
- At 90% (180K tokens): Summarize files >5000 tokens
- At 95% (190K tokens): Ask user to narrow scope
```

**Optional Python Utility** (if needed):
```python
# .specify/utils/context_budget.py
class ContextBudget:
    def __init__(self):
        self.total = 200000
        self.used = 0
        self.tiers = {"tier1": 0, "tier2": 0, "tier3": 0, "tier4": 0}

    def can_load(self, chars, tier):
        tokens = chars // 4
        return (self.used + tokens) <= self.total

    def load(self, chars, tier):
        tokens = chars // 4
        self.used += tokens
        self.tiers[tier] += tokens

    def usage_pct(self):
        return self.used / self.total
```

**Alternatives Considered**:
- **Pure Python implementation**: More precise, but Claude AI would need to invoke script via Bash
- **No tracking**: Simpler, but defeats purpose of context budget protection

**Rejected Because**: Pure Python adds indirection (Claude AI → Bash → Python → return), whereas conceptual tracking in CLAUDE.md is more natural for an AI orchestrator.

**Implementation**: Primary tracking via CLAUDE.md instructions, with Python utility available for validation/debugging.

---

## Research Item 6: Workflow Template Storage Location

**Question**: Where should workflow templates be stored, and how should they be versioned?

**Decision**: Store templates in `.specify/templates/workflows/` with version field in YAML, no git tagging yet.

**Rationale**:
- **Discoverability**: `.specify/templates/workflows/` is a natural location that mirrors existing `.specify/` structure
- **Gitignored vs tracked**: Templates should be tracked in git (unlike `.specify/memory/` which is gitignored) so they're versioned with code
- **Versioning**: Include `version: "1.0.0"` field in YAML for template evolution
- **No complex versioning yet**: Phase 1 doesn't need semver, git tags, or migration scripts

**Directory Structure**:
```
.specify/
├── templates/
│   ├── workflows/           # Workflow templates (git-tracked)
│   │   ├── quick_question.yaml
│   │   ├── quick_fix.yaml
│   │   ├── small_feature.yaml
│   │   ├── feature_full_lifecycle.yaml
│   │   ├── debug_and_fix.yaml
│   │   ├── performance_optimization.yaml
│   │   ├── pr_review_comprehensive.yaml
│   │   └── multi_project_investigation.yaml
│   └── commands/            # Existing slash command templates
├── memory/                  # Gitignored - execution state
│   ├── constitution.md
│   └── execution-history.json
└── logs/                    # Gitignored - ephemeral logs
    └── context-usage.json
```

**Version Evolution Strategy**:
```yaml
# v1.0.0 - Initial template
name: "quick_fix"
version: "1.0.0"
phases: [...]

# v1.1.0 - Add validation phase
name: "quick_fix"
version: "1.1.0"
phases: [..., {id: "validate", ...}]

# v2.0.0 - Breaking change (rename agent)
name: "quick_fix"
version: "2.0.0"
phases: [{agent: "developer" ...}]  # Was "ark-developer" in v1.x
```

**Alternatives Considered**:
- **Store in `~/.claude/templates/`**: Global templates across all projects, but reduces per-project customization
- **Store in `specs/` directory**: Co-locate with feature specs, but templates are not feature-specific
- **No versioning**: Simpler, but can't track template evolution

**Rejected Because**: `~/.claude/templates/` is too global (Arkadian templates may not fit other projects), `specs/` is for features not templates, and no versioning makes debugging harder.

---

## Research Item 7: Agent Contract Compatibility

**Question**: Do workflow templates require changes to agent INPUT CONTRACT format?

**Decision**: No changes to agent INPUT CONTRACT format required.

**Rationale**:
- **Templates are orchestrator-level**: They guide how the orchestrator sequences agents, not how agents execute
- **Agents remain unchanged**: Each agent still receives same YAML INPUT CONTRACT as before
- **Orchestrator responsibility**: Template selection, phase execution, approval gates are all orchestrator concerns

**Agent INPUT CONTRACT** (unchanged):
```yaml
objective: "Create feature specification for fraud detection alerts"
repos: ["arkd"]
docs_hint:
  project_index_path: "${ARKADIAN_DIR}/docs/INDEX.md"
  project:
    id: "arkd"
    index_path: "${ARKADIAN_DIR}/docs/projects/arkd/INDEX.md"
  sections:
    - "system/architecture.md"
    - "testing/usage.md"
constraints:
  - constitution_compliance: true
expected_outputs:
  - "specs/001-fraud-detection-alerts/spec.md"
```

**How Templates Use Agents**:
```yaml
# Template phase
- id: "specify"
  agent: "project-manager"
  actions: ["use pm-spec skill", "create spec.md"]

# Orchestrator constructs INPUT CONTRACT for agent
objective: "Create feature specification for fraud detection alerts"
repos: ["arkd"]
docs_hint: { ... }  # Orchestrator populates from project selection
constraints: [ ... ]  # Orchestrator adds from template
expected_outputs: ["specs/001-.../spec.md"]  # Orchestrator infers from phase
```

**Backward Compatibility**: Existing agents work with templates without modification because orchestrator adapts template phases into agent INPUT CONTRACTs.

---

## Summary of Decisions

| Research Item | Decision | Rationale |
|---------------|----------|-----------|
| **YAML Template Structure** | Human-readable YAML with metadata + execution sections | Consistency with agent contracts, industry standard |
| **Token Estimation** | Use `chars / 4` heuristic | Simple, conservative, good enough for Phase 1 |
| **JSON Validation** | Inline schema validation with graceful degradation | Data quality without dependencies |
| **Log Format** | Newline-delimited JSON (NDJSON) | O(1) appends, streaming, fault-tolerant |
| **Budget Tracking** | Inline instructions in CLAUDE.md + optional Python utility | Natural for AI orchestrator, flexible |
| **Template Storage** | `.specify/templates/workflows/` with version field | Discoverable, git-tracked, versioned |
| **Agent Contracts** | No changes required | Templates are orchestrator-level, agents unchanged |

---

## Next Steps

Proceed to Phase 1 (Design & Contracts) to create:
1. `data-model.md` - Complete entity schemas
2. `contracts/workflow-template-schema.yaml` - Template structure definition
3. `quickstart.md` - Developer guide for using this system

---

**Status**: Research Complete
**Date**: 2025-10-25
**Next Phase**: Phase 1 (Design & Contracts)
