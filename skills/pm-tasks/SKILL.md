---
name: pm-tasks
description: "RESTRICTED to ark-project-manager. Generate actionable, dependency-ordered task lists organized by user story, and optionally create beads issues."
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
1. Invokes the /speckit.tasks command to generate tasks organized by user story
2. Optionally creates beads issues if beads is enabled for the session

**Execution:**

### Step 1: Generate tasks.md
```bash
/speckit.tasks
```

### Step 2: Check if beads is enabled
```bash
# Read session state
SESSION_ID="<from context>"
cat ${ARKADIAN_DIR}/log/${SESSION_ID}_state.json | jq '.beads.enabled'
```

### Step 3: If beads enabled, create issues
If `beads.enabled` is true:

```bash
# Get session epic ID
SESSION_EPIC_ID=$(cat ${ARKADIAN_DIR}/log/${SESSION_ID}_state.json | jq -r '.beads.session_epic_id')

# Create feature epic
FEATURE_EPIC_ID=$(bd create "{project_id}: {feature_name}" \
  --type epic \
  --parent ${SESSION_EPIC_ID} \
  --label "arkadian,feature,project:${PROJECT_ID}" \
  --json | jq -r '.id')

# Parse tasks.md and create task issues (see example below)
# Store mappings to beads_mapping.json
```

**Example task creation:**
```bash
# For each task line in tasks.md:
# - [ ] T001 [P] Create User model (src/models/user.py)

TASK_ID=$(bd create "T001: Create User model" \
  --type task \
  --parent ${FEATURE_EPIC_ID} \
  --priority 2 \
  --label "arkadian,implementation,parallel,project:${PROJECT_ID}" \
  --metadata '{"arkadian":{"task_id":"T001","file_paths":["src/models/user.py"],"parallel":true}}' \
  --json | jq -r '.id')

# Store mapping: T001 -> ${TASK_ID}
```

**Beads Mapping Format:**
```json
{
  "feature_epic_id": "bd-xyz123",
  "tasks": {
    "T001": "bd-abc123",
    "T002": "bd-def456"
  }
}
```

**If beads not enabled:**
- Skip Step 3
- Continue with standard task generation only
