---
name: pm-analyze
description: "RESTRICTED to ark-project-manager. Perform cross-artifact consistency and quality analysis."
allowed-tools: [Read, Write, Edit, Bash, Grep, SlashCommand]
---

# Project Analysis Skill

**⚠️ ROLE RESTRICTION: ark-project-manager ONLY**

This skill is ONLY available to the ark-project-manager agent.

---

**When to use:**
- You are the ark-project-manager agent
- Tasks have been generated
- Ready to validate consistency across spec/plan/tasks

**What it does:**
Invokes the /speckit.analyze command.

**Execution:**
```
/speckit.analyze
```
