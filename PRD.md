Below is a **detailed PRD** you can hand to an AI code agent to implement the **Ark Assistant** (Claude Code plugin + centralized docs). It is explicit about files, schemas, logic, and acceptance criteria.

---

# PRD — Ark Assistant (Claude Code Plugin + Centralized Context)

## 1) Overview

**Goal:** Build a **developer-grade digital assistant** (Ark Assistant) that:

* Understands multiple Ark repositories (public + private).
* Answers questions, runs/testing stacks, develops features/fixes/tests, analyzes PRs/commits.
* **Plans work as a DAG**, invokes **specialized sub-agents per step**, runs **independent steps in parallel**, and **inserts QA after each DEV** step.
* **Keeps context lean** by loading a master **project registry** and per-project **INDEX.md**, then only minimal section files when needed.
* **Writes back** doc updates to keep project state current.

**Primary interface:** Claude Code CLI plugin running in a dev container with all repos cloned locally.

---

## 2) In-Scope Repositories (initial set)

* `arkd` — core daemon (Ark protocol server).
* `go-sdk` — Go client SDK (wallets/apps).
* `ark-simulator` — multi-user/load simulation.
* `ark-telemetry` — Loki/Grafana/Alertmanager/OTel.
* `ark-infra` — OpenTofu/AWS (referenced for local compose conventions).
* `ark-docs` — protocol documentation pointers (from `docs` repo or a section of it).
* `fulmine`
* `kms-unlocker`
* `fulmine`

Bot/service account has read/write where required.

---

## 3) Repository Layout (new repo)

Create a new repo `ark-assistant/`:

```
ark-assistant/
  CLAUDE.md                 # orchestrator prompt (entry point)
  agents/
    ark-guru.md               # Q&A
    ark-developer.md          # DEV
    ark-tester.md             # QA
    ark-pr-reviewer.md        # PR/commits analysis
    ark-debugger.md           # optional (v1: stub)
    ark-researcher.md         # optional (v1: stub)
  commands/                   # optional convenience
  hooks/
  scripts/
  docs/
    docs/
      project/
        INDEX.md      # **master registry** (YAML + prose)
      projects/
        project_index/
          arkd/
            INDEX.md
            sop/ ...
            tasks/ ...
            system/ ...
            change-log/ ...
            testing/ ...
          go-sdk/
            INDEX.md
            ...
          ark-simulator/
            INDEX.md
            ...
          ark-telemetry/
            INDEX.md
            ...
          ark-infra/
            INDEX.md
            ...
          protocol-docs/
            INDEX.md
            ...
```

---

## 4) Orchestrator Behavior (`context/CLAUDE.md`)

**Purpose:** Serve as the **entry point** and **orchestrator**.

**Responsibilities:**

1. **Load** master registry `${ARKADIAN_DIR}/docs/INDEX.md`.
2. **Infer intent** and **select projects dynamically** (no hardcoded maps):
    * Score projects against request using metadata in the master index (tags, synonyms, triggers, capabilities, description).
    * Select top-K + add `depends_on`.
3. **Load only** each selected project’s `INDEX.md` (not deep sections yet).
4. **Plan a DAG** (parallel independent steps; sequence dependent steps).
5. For **each step**, **invoke sub-agent** with a **handoff contract**:

    * objective, repos scope, doc hints (index path + minimal sections), constraints, expected outputs.
6. **Insert QA** step **after each DEV** step to validate changes.
7. **Write back** doc updates to relevant project docs on success (branch + conventional commit).

> A ready-to-paste `CLAUDE.md` was drafted in prior messages; reuse that as the orchestrator text.

---

## 5) Master Index Schema (`/context/docs/project/PROJECT_INDEX.md`)

File contains prose + a **single fenced YAML** block:

````md
# Project Registry

Intro prose (optional)...

```yaml
projects:
  - id: arkd
    name: Ark daemon
    index_path: "${ARKADIAN_DIR}/docs/projects/arkd/INDEX.md"
    description: "Core Ark node/service; runs the protocol server and exposes RPC/HTTP."
    tags: [server, core, node, rpc, grpc, settlement, logs]
    synonyms: [daemon, ark node]
    triggers:
      any:    [arkd, node, daemon]
      qna:    [explain, how, concept, overview]
      qa:     [test, qa, integration, simulate, load, throughput, smoke]
      dev:    [feature, bug, refactor, unit test, integration test]
      monitor:[log, logs, telemetry, loki, alertmanager, alert, regex]
    capabilities: [qna, qa, dev]
    depends_on: []

  - id: go-sdk
    name: Ark Go SDK
    index_path: "${ARKADIAN_DIR}/docs/projects/go-sdk/INDEX.md"
    description: "Client SDK for building wallets and apps in Go."
    tags: [wallet, client, sdk, examples, api]
    synonyms: [go client, wallet sdk]
    triggers:
      any:    [go-sdk, wallet, client]
      qna:    [example, usage, docs]
      qa:     [test, integration]
      dev:    [implement, feature, bugfix, example app]
    capabilities: [qna, qa, dev]
    depends_on: [arkd]

  - id: ark-telemetry
    name: Telemetry Stack
    index_path: "${ARKADIAN_DIR}/docs/projects/ark-telemetry/INDEX.md"
    description: "Grafana, Loki, Alertmanager, OTel collector; alerts and dashboards."
    tags: [telemetry, loki, alertmanager, grafana, alerts, logs]
    synonyms: [monitoring, observability]
    triggers:
      any:    [telemetry, monitoring, alerts]
      qna:    [how to alert, regex]
      qa:     [compose up telemetry, query logs]
      dev:    [add alert rule, add route]
    capabilities: [qna, qa, dev]
    depends_on: [arkd]

  - id: ark-simulator
    name: Simulator
    index_path: "${ARKADIAN_DIR}/docs/projects/ark-simulator/INDEX.md"
    description: "Generates realistic multi-user load against arkd."
    tags: [simulate, load, performance, users, traffic]
    synonyms: [stress, load test]
    triggers:
      any:    [simulate, load, performance]
      qna:    [how to simulate]
      qa:     [run sim, recipes]
      dev:    []
    capabilities: [qna, qa]
    depends_on: [arkd]
````

````

**Routing algorithm (high level):**
- Parse YAML.
- For each project, compute score:
  - token overlap with `tags + synonyms + triggers.any + triggers.[intent]`.
  - cosine-ish semantic match to `description` (LLM judgment).
  - capability alignment with INTENT-ACTION.
- Keep top-K with score ≥ threshold (e.g., 0.3). Add `depends_on`.
- Load those projects’ `index_path` files.

---

## 6) Per-Project `INDEX.md` Schema

Each `INDEX.md` begins with YAML front-matter + human prose:

```md
---
project_id: arkd
default_sections_by_intent:
  qna:        ["system/overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "sop/how-to-run.md"]
  dev:        ["sop/how-to-run.md", "testing/usage.md"]
  monitoring: ["sop/alerts.md", "testing/usage.md"]
aliases:
  usage: ["testing/usage.md", "howto-run.md"]
scripts:
  compose_up: "./scripts/compose-up.sh arkd"
  smoke:      "docker ps | grep arkd | grep healthy"
  health:     "curl http://localhost:<port>/healthz"
---

# ArkD — Project Index

- **sop/** — procedures/how-to/lessons/workflow  
- **tasks/** — PRDs & implementation plans  
- **system/** — overview/architecture/folder_structure/tech_stack/integration points  
- **change-log/** — curated recent changes  
- **testing/** — usage/troubleshooting/how to test/how to run
````

> Keep section files **short** (usage/how-to ≤100–120 lines; architecture 400–700 words; api 400–800 words; code-map ≤120 lines).

---

## 7) Agents (files in `agents/`)

### 7.1 `ark-guru.md` (Q&A)

* Tools: Read, Grep, Glob.
* Behavior: answer with references to imported files; prefer usage/how-to; if ambiguous, ask one clear question.

### 7.2 `ark-tester.md` (QA)

* Tools: Bash, Read, Grep.
* Behavior: start stacks with compose; run sims; run health checks; summarize pass/fail with evidence.

### 7.3 `ark-developer.md` (DEV)

* Tools: Read, Write, Edit, Bash.
* Behavior: **branch first**, minimal diffs, add tests, run tests, summarize changes, prepare PR text.

### 7.4 `ark-pr-reviewer.md` (PR/Commits)

* Tools: Bash (git), Read.
* Behavior: summarize changes, risks, authors (if locally present), highlight breakages.

*(Optional)* `ark-debugger.md`, `ark-researcher.md` (stubs v1).

```

* Router prints a **hint block** with selected projects + index paths + suggested agent.
* Formatter runs after writes/edits.
* Tests run after DEV agent stops.

---

## 9) Plugin Manifest (`.claude-plugin/plugin.json`)

```json
{
  "name": "ark-assistant",
  "version": "1.0.0",
  "description": "Ark Assistant for multi-repo Q&A, testing, development, and PR analysis.",
  "agentsDir": "./agents",
  "commandsDir": "./commands",
  "hooks": "./hooks/hooks.json"
}
```

(Adjust fields to the exact schema supported by your Claude Code build.)

## 12) Safety & Policies

* **Prod guard:** never touch prod unless user types exactly `I ACKNOWLEDGE PROD`.
* **Branch first:** `feat/<area>-<slug>` or `fix/<area>-<slug>`.
* **Conventional commits** for code and doc changes.
* **Tests required** after edits; block on failures.
* **Sim TTL ≤ 5 minutes** without approval.
* **Redact secrets** in logs/output.

---

## 13) Execution Workflows (Acceptance Scenarios) examples:

### A) Test `arkd`

* **Given** the user: “How can I test arkd quickly?”
* **Then** orchestrator selects `arkd` (maybe `ark-simulator` if “many users” appears).
* **Loads** `arkd` `INDEX.md`; minimal sections: `testing/usage.md`, `sop/how-to-run.md`.
* **Plan**: QA compose up → smoke → optional sim → summarize.
* **Success**: health checks pass; sim shows `errors=0`; concise summary returned.

### B) Add alert on regex in logs

* **Given** the user: “Alert when ‘X’ appears in logs.”
* **Then** select `ark-telemetry`, `arkd`, `ark-simulator`.
* **Load** telemetry and arkd `INDEX.md`; minimal: telemetry `sop/alerts.md`, `testing/usage.md`; arkd `sop/how-to-run.md`.
* **Plan**: QA (telemetry up) + QA (sim run) in parallel → DEV (add Loki/Alertmanager rule, branch) → QA (reload, re-sim, confirm firing).
* **Success**: alert firing confirmed; change on branch; summary returned.

### C) Develop wallet using `go-sdk`

* **Given** “Develop wallet using go-sdk.”
* **Then** select `go-sdk` (+ `arkd`).
* **Load** `go-sdk` `INDEX.md`; minimal: `sop/how-to-dev.md`, `testing/usage.md`; `arkd` `sop/how-to-run.md`.
* **Plan**: DEV (branch, add example, run) → QA (tests, optional sim traffic) → summarize & PR body.
* **Success**: example runs, tests green; branch/PR text produced.

---