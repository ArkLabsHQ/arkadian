---
name: beads-query
description: "Query the project task backlog using beads. Available to all agents for task visibility."
allowed-tools: [Bash, Read]
---

# Beads Query Skill

**Purpose:** Query and inspect beads issues for task backlog visibility.

**When to use:**
- Check what tasks are ready to work on
- Inspect task dependencies
- Review task status and history
- Find tasks by project, story, or label
- Get task details with Arkadian metadata

## Available Commands

### List Ready Tasks
```bash
bd ready --json
```
Returns tasks with no open blockers. These are tasks you can start working on immediately.

**Example output:**
```json
[
  {
    "id": "bd-a1b2c3",
    "title": "T012: Create User model",
    "status": "open",
    "type": "task",
    "priority": 2,
    "labels": ["arkadian", "implementation", "story:US1"]
  }
]
```

### Show Task Details
```bash
bd show <issue-id> --json
```
Get full details including dependencies and metadata.

**Example:**
```bash
bd show bd-a1b2c3 --json | jq .
```

**Example output:**
```json
{
  "id": "bd-a1b2c3",
  "title": "T012: Create User model",
  "description": "",
  "status": "open",
  "type": "task",
  "priority": 2,
  "labels": ["arkadian", "implementation", "story:US1", "parallel"],
  "metadata": {
    "arkadian": {
      "session_id": "20260202-add-skills-to-developer",
      "feature_id": "001-beads-integration",
      "project_id": "arkadian",
      "task_id": "T012",
      "file_paths": ["hooks/beads-bridge.ts"],
      "story_id": "US1",
      "phase": "phase_2",
      "parallel": true
    }
  },
  "dependencies": ["bd-parent1"],
  "created_at": "2026-02-02T10:00:00Z",
  "updated_at": "2026-02-02T10:00:00Z"
}
```

### List All Open Tasks
```bash
bd list --status open --json
```

### Filter by Project
```bash
bd list --label "project:arkd" --status open --json
```

Find all open tasks for the arkd project.

### Filter by User Story
```bash
bd list --label "story:US1" --json
```

Find all tasks associated with User Story 1.

### Filter by Label
```bash
bd list --label "parallel" --json
```

Find all tasks marked as parallelizable.

### Check Dependencies
```bash
bd show <issue-id> --json | jq '.dependencies'
```

See what tasks are blocking this task.

### Count Tasks by Status
```bash
bd list --status open --json | jq 'length'
bd list --status completed --json | jq 'length'
```

## Output Format

All commands with `--json` return structured data. The metadata field contains Arkadian-specific context:

```json
{
  "id": "bd-a1b2c3",
  "title": "T012: Create User model",
  "status": "open",
  "type": "task",
  "priority": 2,
  "labels": ["arkadian", "story:US1"],
  "metadata": {
    "arkadian": {
      "task_id": "T012",           // Original task ID from tasks.md
      "file_paths": ["src/models/user.py"],  // Files this task affects
      "parallel": true,             // Can run in parallel with other tasks
      "session_id": "...",          // Originating session
      "feature_id": "...",          // Feature this task belongs to
      "project_id": "...",          // Ark project (arkd, fulmine, etc.)
      "story_id": "US1",            // User story (if applicable)
      "phase": "user_story_1"       // Phase in implementation plan
    }
  }
}
```

## Example Usage in Agent Context

### Check Ready Tasks (TypeScript)
```typescript
// In ark-developer agent
const result = await Bash({ command: 'bd ready --json' });
const readyTasks = JSON.parse(result.stdout);

// Filter for current project
const projectTasks = readyTasks.filter(t =>
  t.labels.includes('project:arkd')
);

console.log(`Found ${projectTasks.length} ready tasks for arkd`);
```

### Get Task Details
```typescript
const taskId = 'bd-a1b2c3';
const result = await Bash({ command: `bd show ${taskId} --json` });
const task = JSON.parse(result.stdout);

// Access Arkadian metadata
const metadata = task.metadata?.arkadian;
if (metadata) {
  console.log(`Task ${metadata.task_id} affects files: ${metadata.file_paths.join(', ')}`);
}
```

### Find Tasks for User Story
```typescript
const storyId = 'US1';
const result = await Bash({ command: `bd list --label "story:${storyId}" --json` });
const storyTasks = JSON.parse(result.stdout);

console.log(`User Story ${storyId} has ${storyTasks.length} tasks`);
```

## Common Workflows

### 1. Start Implementation Work
```bash
# Find ready tasks for my project
bd ready --json | jq '.[] | select(.labels | contains(["project:arkd"]))'

# Pick a task and get details
bd show bd-xyz123 --json

# Check dependencies
bd show bd-xyz123 --json | jq '.dependencies'
```

### 2. Check Progress on User Story
```bash
# Count total tasks
bd list --label "story:US1" --json | jq 'length'

# Count completed tasks
bd list --label "story:US1" --status completed --json | jq 'length'

# List remaining tasks
bd list --label "story:US1" --status open --json | jq '.[] | .title'
```

### 3. Find Parallel Tasks
```bash
# Get all parallel tasks that are ready
bd ready --json | jq '.[] | select(.labels | contains(["parallel"]))'
```

## Integration with Arkadian Workflow

When **ark-project-manager** creates a tasks.md file, Arkadian automatically:
1. Creates a feature epic in beads
2. Converts all tasks to beads issues
3. Preserves hierarchy (epic → user stories → tasks)
4. Sets up dependencies based on phase order
5. Stores mapping in session state

**After conversion, you can:**
- Query ready tasks with `bd ready`
- Filter by project, story, or label
- See exact file paths and metadata
- Track dependencies automatically

## Notes
- Always parse JSON output for programmatic use
- Use `jq` for filtering and formatting
- Task IDs (bd-xxx) are stable across sessions
- Metadata contains Arkadian-specific context
- This skill is read-only (agents don't modify tasks directly in Phase 1)

## Future Enhancements (Phase 2+)
- Update task status from agents
- Create new tasks during development
- Add comments and time tracking
- Automatic status sync
