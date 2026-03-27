---
description: Run the arkadian auto-improvement loop. Launches arkadian -d with a GitHub issue, evaluates the result, improves prompts, and reruns until passing.
argument-hint: <github-issue-url>
---

## User Input

```text
$ARGUMENTS
```

## What This Does

Runs a tight improvement loop:
1. Launch `arkadian -d` with the given GitHub issue URL
2. Poll until the session completes (up to 2 hours)
3. Evaluate the session against `benchmarks/eval-criteria.yaml`
4. If passing → done (worktree preserved for inspection)
5. If failing → read transcripts/logs, identify root cause, improve prompts/skills/hooks, delete worktree, rerun
6. Loop until passing or max 8 iterations

## Prerequisites

- `arkadian` command must be on PATH
- Infrastructure running if the issue requires it (nigiri, docker)
- `bun` installed for eval-engine.ts

## Execution

Parse the GitHub issue URL from `$ARGUMENTS`. If no URL provided, ask the user.

Validate the URL looks like a GitHub issue: `https://github.com/<org>/<repo>/issues/<number>`

Create a slug from the URL for tracking: e.g. `ark-909` from `https://github.com/ark-network/ark/issues/909`

Create the runs directory:
```
${ARKADIAN_DIR}/benchmarks/runs/<slug>/
```

Then invoke `Skill("auto-improve")` with the issue URL to start the loop.
