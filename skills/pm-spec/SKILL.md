---
name: pm-spec
description: "RESTRICTED to ark-project-manager. Create or update feature specifications from natural language descriptions."
allowed-tools: [Read, Write, Edit, Bash, SlashCommand]
---

# Project Specification Skill

**⚠️ ROLE RESTRICTION: ark-project-manager ONLY**

This skill is ONLY available to the ark-project-manager agent.
- If you are ark-project-manager → Use this skill to create specifications
- If you are any other agent → This skill is not available to you

---

**When to use:**
- You are the ark-project-manager agent
- User wants to specify a new feature
- User describes a feature idea and needs it formalized

**What it does:**
Invokes the /speckit.specify command to create a structured specification document.

**Execution:**
```
/speckit.specify <user's feature description>
```

**Example triggers:**
- "Create a spec for authentication"
- "Specify fraud detection alerts"
