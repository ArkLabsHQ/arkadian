---
name: pm-tasks
description: "RESTRICTED to ark-project-manager. Generate actionable, dependency-ordered task lists organized by user story."
allowed-tools: [Read, Write, Edit, Bash, SlashCommand]
---

# Project Tasks Skill

**⚠️ ROLE RESTRICTION: ark-project-manager ONLY**

This skill is ONLY available to the ark-project-manager agent.

---

**When to use:**
- You are the ark-project-manager agent
- Implementation plan is complete
- Ready to break down work into executable tasks

**What it does:**
Invokes the /speckit.tasks command to generate tasks organized by user story.

**Execution:**

```bash
/speckit.tasks
```
