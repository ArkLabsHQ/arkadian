# Orchestrator Response Formats

This document defines the exact response formats the orchestrator must use at each stage.

## For Initial Request

```
<scratchpad>
[Internal reasoning - intent, scoring, template selection]
</scratchpad>

<session_status>
Session ID: ${SESSION_ID}
Workflow State: PLAN_PENDING | AWAITING_APPROVAL | EXECUTING_STEP_N | COMPLETED
Current Gate: GATE_1_PLAN | GATE_2_SPEC_SN | GATE_3_CONTINUE
</session_status>

<intent_summary>
[One line: action + target]
Confidence: <0.00-1.00>
</intent_summary>

<projects_selected>
- <project_id>: <index_path>
  repo_path: <env_var>
  github_url: <org/repo>
  score: <0.00-1.00>
  reason: <why selected>
  depends_on: [...]
</projects_selected>

<plan>
[Human-readable plan with steps, agents, dependencies, parallel groups]
</plan>

<safety_notes>
- [Any production gates, destructive patterns, missing context, timeboxing]
</safety_notes>

<doc_updates>
- [Any missing repo_paths, documentation gaps, registry issues]
</doc_updates>

⏸️ AWAITING PLAN APPROVAL
Reply "APPROVED" to see Execution Specifications, or provide feedback to revise.
```

**STOP HERE. Do not output execution specs until approved.**

## After Plan Approval (Present First Spec)

```
<session_status>
Session ID: ${SESSION_ID}
Workflow State: AWAITING_SPEC_APPROVAL
Current Gate: GATE_2_SPEC_S1
</session_status>

<execution_specification step="S1">
[Full YAML spec for Step 1 - this is the INPUT for the sub-agent]
</execution_specification>

<agent_invocation_preview>
Agent: <agent_name>
Will receive: Above specification
Expected outputs: [list]
Estimated duration: <time>
</agent_invocation_preview>

⏸️ AWAITING SPEC APPROVAL FOR S1
Reply "APPROVED" to invoke <agent_name>, "APPROVED ALL" to approve remaining steps, or provide feedback.
```

**STOP HERE. Do not invoke agent until approved.**

## After Spec Approval (Invoke Agent)

```
<session_status>
Session ID: ${SESSION_ID}
Workflow State: EXECUTING_S1
Current Gate: AGENT_RUNNING
</session_status>

✅ SPEC APPROVED - Invoking ${AGENT_NAME}

Passing specification: ${SESSION_ID}-S1
Spec saved to: ${ARKADIAN_DIR}/sessions/${SESSION_ID}/specs/S1.yaml

Invoking agent...
```

Then invoke the agent with the specification.

## For Subsequent Calls (After Each Step Completes)

```
<session_status>
Session ID: ${SESSION_ID}
Workflow State: STEP_COMPLETE
Previous Step: S(N-1) - COMPLETED
Current Gate: GATE_3_CONTINUE
</session_status>

<previous_step_result>
Agent: <agent_name>
Status: COMPLETED | FAILED | PARTIAL
Artifacts produced: [list with paths]
Summary: [2-3 sentences]
</previous_step_result>

<execution_specification step="SN">
[Full YAML spec for next step]
</execution_specification>

<agent_invocation_preview>
Agent: <agent_name>
Will receive: Above specification
Expected outputs: [list]
Estimated duration: <time>
</agent_invocation_preview>

⏸️ AWAITING SPEC APPROVAL FOR SN
Reply "APPROVED" to continue, "APPROVED ALL" to approve remaining steps, or provide feedback.
```

**STOP HERE. Do not invoke next agent until approved.**

## After All Steps Complete

```
<session_status>
Session ID: ${SESSION_ID}
Workflow State: COMPLETED
Current Gate: NONE
</session_status>

<final_results>
[Summary of all completed steps and their outcomes]
</final_results>

<artifacts_produced>
[List all artifacts with full paths]
</artifacts_produced>

<results_and_next>
- [What the user should do next, if anything]
</results_and_next>

🎯 COMPLETED: <4-6 word summary>
```
