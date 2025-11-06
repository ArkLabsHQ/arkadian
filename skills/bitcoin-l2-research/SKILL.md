---
name: bitcoin-l2-research
description: Comprehensive Bitcoin and Layer-2 protocol research using parallel Claude agents. Specialized for Bitcoin Core, Lightning, Ark, and L2 scaling solutions. Three modes (Quick/Standard/Deep) with timeout management and multi-source validation.
---

# Bitcoin/L2 Research Skill

## When to Use
This skill activates when the user requests research on:
- Bitcoin protocol, BIPs, consensus rules
- Layer-2 scaling solutions (Lightning, Ark, Liquid, Rollups)
- Protocol comparisons (e.g., "Compare Lightning vs Ark")
- External documentation analysis (whitepapers, specifications)
- Bitcoin ecosystem developments

**Trigger Phrases:**
- "Research [Bitcoin/L2 topic]"
- "Compare [Protocol A] vs [Protocol B]"
- "Analyze [whitepaper/specification]"
- "What's new in Bitcoin Core [version]"
- "How does [L2 protocol] work"

## Research Modes

**Quick Research (3 agents, 2min timeout)**
- User says: "quick research" or simple query
- Best for: Simple questions, fact-checking

**Standard Research (9 agents, 3min timeout)**
- Default mode
- Best for: Comprehensive analysis, protocol comparisons

**Deep Research (12 agents, 10min timeout)**
- User says: "deep research" or "comprehensive research"
- Best for: Multi-protocol analysis, whitepaper deep-dives

## How It Works

1. **Intent Detection**: User request triggers research mode
2. **Context Loading**: Load ark-docs for Ark protocol context
3. **Query Decomposition**: Break query into 3-12 focused sub-questions
4. **Parallel Execution**: Launch Claude agents in single batch
5. **Timeout Management**: Proceed with partial results after timeout
6. **Synthesis**: Combine findings with confidence levels
7. **Report Generation**: Structured markdown report

## Integration

**Orchestrator**: Routes research requests to ark-researcher agent
**Agent**: ark-researcher coordinates parallel claude-search-agents
**Workflow**: Uses workflows/research-bitcoin-l2.md patterns
**Knowledge Base**: Integrates with ark-docs for Ark context

## Expected Outputs

- Comprehensive research report
- Confidence levels (High/Medium/Low)
- Source citations (URLs)
- Comparative analysis (if applicable)
- Trade-offs and recommendations
- Follow-up questions identified

## Configuration Files

- **bitcoin-topics.yaml**: Topic taxonomy for Bitcoin/L2 domains
- **external-docs.yaml**: Known Bitcoin/L2 documentation sources

## Example Usage

**User**: "Research how Taproot enables Ark protocol"

**System**:
1. Detects: Bitcoin Core + Ark-specific research
2. Mode: Standard (9 agents, 3 min)
3. Decomposes: 9 sub-questions about Taproot + Ark
4. Launches: 9 Claude agents in parallel
5. Synthesizes: Cross-validates findings
6. Returns: Comprehensive report in ~60-90 seconds

---

**Skill Owner**: ark-researcher agent
**Last Updated**: 2025-11-05
