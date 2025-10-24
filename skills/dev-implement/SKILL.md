---
name: dev-implement
description: "RESTRICTED to ark-developer. Execute the implementation plan by processing and completing all tasks."
allowed-tools: [Read, Write, Edit, Bash, Task, SlashCommand]
---

# Developer Implementation Skill

**⚠️ ROLE RESTRICTION: ark-developer ONLY**

This skill is ONLY available to the ark-developer agent.
- ark-project-manager → Delegate to ark-developer, do NOT use this skill
- Other agents → This skill is not available to you

---

**When to use:**
- You are the ark-developer agent
- You received a task plan from ark-project-manager
- Ready to execute implementation

**What it does:**
Invokes the /speckit.implement command to execute all tasks.

**Execution:**
```
/speckit.implement
```

**IMPORTANT:** This is the ONLY skill that writes production code. All other skills are for planning and analysis.
