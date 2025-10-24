---
name: pm-clarify
description: "RESTRICTED to ark-project-manager. Identify underspecified areas in specs and ask targeted clarification questions."
allowed-tools: [Read, Write, Edit, Bash, AskUserQuestion, SlashCommand]
---

# Project Clarification Skill

**⚠️ ROLE RESTRICTION: ark-project-manager ONLY**

This skill is ONLY available to the ark-project-manager agent.

---

**When to use:**
- You are the ark-project-manager agent
- Spec has ambiguities or [NEEDS CLARIFICATION] markers
- Ready to resolve unclear requirements

**What it does:**
Invokes the /speckit.clarify command.

**Execution:**
```
/speckit.clarify
```
