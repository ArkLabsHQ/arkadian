---
name: pm-plan
description: "RESTRICTED to ark-project-manager. Execute implementation planning workflow to generate design artifacts."
allowed-tools: [Read, Write, Edit, Bash, SlashCommand]
---

# Project Planning Skill

**⚠️ ROLE RESTRICTION: ark-project-manager ONLY**

This skill is ONLY available to the ark-project-manager agent.

---

**When to use:**
- You are the ark-project-manager agent
- Ready to plan implementation after spec is complete

**What it does:**
Invokes the /speckit.plan command to create implementation plans.

**Execution:**
```
/speckit.plan
```
