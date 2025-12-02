# Spec-Kit Integration in Arkadian

This document describes how Arkadian integrates GitHub's [spec-kit](https://github.com/github/spec-kit) for specification-driven development across the Ark ecosystem.

## Current State & Future Direction

> **Status**: Formalized Fork (Option 3)
> **Upstream**: https://github.com/github/spec-kit
> **Decision Date**: 2024-12-02

### The Problem

We want to use spec-kit for specification-driven development but need:
- Centralized specs in Arkadian sessions (not scattered across project repos)
- Project-scoped organization (`sessions/<id>/specs/arkd/`, `sessions/<id>/specs/wallet/`)
- Integration with our multi-project orchestration system

### Options Evaluated

| Option | Description | Verdict |
|--------|-------------|---------|
| **1. Use spec-kit CLI** | Install globally, call with custom paths | ❌ Spec-kit doesn't support `--output-dir` |
| **2. Wrapper script** | Run spec-kit, move output | ❌ Hacky, loses context between calls |
| **3. Formalized fork** | Maintain our own version | ✅ **CHOSEN** - Best fit for our needs |
| **4. Contribute upstream** | Add features, use standard | ⏳ Long-term goal |

### Why Formalized Fork?

1. **Spec-kit is young** - May not accept our use case PRs quickly
2. **Our needs are specific** - Multi-project orchestration isn't spec-kit's focus
3. **Already working** - Just needs cleanup, not rebuild
4. **Clear upgrade path** - Can migrate back if upstream adds `--output-dir`

### Current Architecture Problems

```
Current chain (too many layers):
  pm-spec skill → /speckit.specify command → bash script → template

Should be:
  pm-spec skill → bash script directly
```

**TODO: Simplify this chain**

### Upstream Tracking

```
Forked from: github/spec-kit (no specific version tag)
Last sync check: 2024-12-02
Customizations:
  - Added --project flag for project-scoped specs
  - Added --session-dir flag for Arkadian session integration
  - Modified output paths to sessions/<id>/specs/<project>/
  - Removed git branch creation (orchestrator handles this separately)
```

### Future Work

- [ ] Simplify skill → command → script chain
- [ ] Fill constitution with Ark ecosystem principles
- [ ] Add UPSTREAM_VERSION file for tracking
- [ ] Document all customizations vs upstream
- [ ] Consider contributing `--output-dir` to upstream
- [ ] Periodic upstream review for template improvements

## Architecture Overview

Arkadian uses a **centralized spec management** approach where all specifications for the Ark ecosystem are stored in Arkadian sessions, not scattered across individual project repos.

```
┌─────────────────────────────────────────────────────────────────────┐
│                           ARKADIAN                                  │
│                                                                     │
│  ┌──────────────────┐      ┌─────────────────────────────────────┐ │
│  │ ark-project-mgr  │──────│ /speckit.specify --project arkd     │ │
│  │                  │      │ /speckit.plan                       │ │
│  │                  │      │ /speckit.tasks                      │ │
│  └──────────────────┘      └─────────────────────────────────────┘ │
│           │                                                         │
│           ▼                                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ sessions/<SESSION_ID>/specs/                                 │   │
│  │ ├── arkd/                     # Specs FOR arkd project      │   │
│  │ │   ├── 001-fraud-alerts/                                   │   │
│  │ │   │   ├── spec.md                                         │   │
│  │ │   │   ├── plan.md                                         │   │
│  │ │   │   └── tasks.md                                        │   │
│  │ │   └── 002-vtxo-expiry/                                    │   │
│  │ ├── wallet/                   # Specs FOR wallet project    │   │
│  │ │   └── 003-offline-mode/                                   │   │
│  │ └── cross-project/            # Multi-project features      │   │
│  │     └── 004-sdk-wallet-sync/                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ .specify/                     # Spec-kit integration        │   │
│  │ ├── templates/                # Spec templates              │   │
│  │ │   ├── spec-template.md                                    │   │
│  │ │   ├── plan-template.md                                    │   │
│  │ │   └── tasks-template.md                                   │   │
│  │ ├── scripts/bash/             # Helper scripts              │   │
│  │ │   └── create-new-feature.sh                               │   │
│  │ └── memory/                   # Project-wide memory         │   │
│  │     └── constitution.md       # Ark ecosystem principles    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Handoff to ark-developer
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TARGET PROJECT REPOS                             │
│                                                                     │
│  arkd/          wallet/         go-sdk/        ark-telemetry/      │
│  fulmine/       boltz-backend/  ark-infra/     ark-docs/           │
│                                                                     │
│  (Code changes happen here, specs stay in Arkadian)                │
└─────────────────────────────────────────────────────────────────────┘
```

## Why Centralized Specs?

| Benefit | Explanation |
|---------|-------------|
| **Single source of truth** | All ecosystem specs in one place |
| **Session isolation** | Specs tied to orchestrator sessions for tracking |
| **Cross-project support** | Features spanning multiple repos supported natively |
| **Easy handoff** | ark-developer gets full context from one location |
| **No repo pollution** | Target project repos stay clean |

## Integration vs. Fork

Arkadian **customizes** spec-kit rather than using it as an upstream dependency:

### What We Kept from Spec-Kit
- Template structure (spec.md, plan.md, tasks.md)
- Workflow philosophy (specify → plan → tasks → implement)
- Constitution concept
- Slash command patterns

### What We Customized
- **Output location**: `sessions/<id>/specs/<project>/` instead of `.specify/specs/`
- **Project scoping**: `--project` flag to organize specs by target project
- **Ecosystem awareness**: Integration with Arkadian's project registry
- **Session integration**: Specs tied to orchestrator session lifecycle

### Why Not Use Upstream Directly?
1. Spec-kit is designed for single-project use; we manage 12+ projects
2. We need session-based isolation for orchestrator tracking
3. Cross-project features require central coordination
4. Our agents need structured context from a known location

## Directory Structure

```
arkadian/
├── .specify/                        # Spec-kit integration
│   ├── templates/                   # Specification templates
│   │   ├── spec-template.md         # Feature specification structure
│   │   ├── plan-template.md         # Implementation plan structure
│   │   ├── tasks-template.md        # Task breakdown structure
│   │   └── checklist-template.md    # Quality checklist structure
│   │
│   ├── scripts/bash/                # Helper scripts
│   │   ├── create-new-feature.sh    # Branch + spec initialization
│   │   ├── setup-plan.sh            # Plan phase setup
│   │   └── common.sh                # Shared utilities
│   │
│   └── memory/                      # Persistent memory
│       └── constitution.md          # Ark ecosystem principles
│
├── commands/                        # Slash commands
│   ├── speckit.specify.md           # Create specifications
│   ├── speckit.plan.md              # Generate implementation plans
│   ├── speckit.tasks.md             # Break down into tasks
│   ├── speckit.implement.md         # Execute implementation
│   ├── speckit.clarify.md           # Resolve ambiguities
│   ├── speckit.analyze.md           # Cross-artifact validation
│   ├── speckit.checklist.md         # Quality checklists
│   └── speckit.constitution.md      # Update principles
│
├── skills/                          # Agent skills
│   ├── pm-spec/SKILL.md             # Wraps /speckit.specify
│   ├── pm-plan/SKILL.md             # Wraps /speckit.plan
│   ├── pm-tasks/SKILL.md            # Wraps /speckit.tasks
│   ├── pm-clarify/SKILL.md          # Wraps /speckit.clarify
│   ├── pm-analyze/SKILL.md          # Wraps /speckit.analyze
│   ├── pm-checklist/SKILL.md        # Wraps /speckit.checklist
│   └── pm-constitution/SKILL.md     # Wraps /speckit.constitution
│
└── sessions/<SESSION_ID>/specs/     # Output location
    ├── arkd/                        # Specs for arkd
    ├── wallet/                      # Specs for wallet
    └── cross-project/               # Multi-project specs
```

## Workflow

### 1. Project Selection

Before creating any spec, ark-project-manager determines the target project:

```
User: "Add fraud detection alerts"
       ↓
ark-project-manager: Infers "fraud", "alerts" → arkd
       ↓
Target Project: arkd
Target Repo: ${ARKD_REPO}
```

**Selection Rules:**
| Domain Keywords | Target Project |
|----------------|----------------|
| VTXO, round, covenant, ASP | arkd |
| UI, React, component, screen | wallet |
| SDK, client library, API | go-sdk |
| Metrics, Prometheus, Grafana | ark-telemetry |
| Lightning, swap, submarine | fulmine, boltz-backend |
| Documentation, MDX | ark-docs |
| Multiple projects | cross-project |

### 2. Specification Creation

```bash
# ark-project-manager invokes:
${ARKADIAN_DIR}/.specify/scripts/bash/create-new-feature.sh \
  --json \
  --project arkd \
  --session-dir "${SESSION_DIR}" \
  --short-name "fraud-alerts" \
  "Add fraud detection alerts to arkd"
```

**Output:**
```json
{
  "BRANCH_NAME": "001-fraud-alerts",
  "SPEC_FILE": "/path/to/sessions/<id>/specs/arkd/001-fraud-alerts/spec.md",
  "TARGET_PROJECT": "arkd",
  "TARGET_REPO": "/Users/.../arkd"
}
```

### 3. Plan & Tasks

Plans and tasks are created in the same project-scoped directory:

```
sessions/<SESSION_ID>/specs/arkd/001-fraud-alerts/
├── spec.md           # Created by /speckit.specify
├── plan.md           # Created by /speckit.plan
├── tasks.md          # Created by /speckit.tasks
├── research.md       # Background research
├── data-model.md     # Entity definitions
├── contracts/        # API contracts
└── quickstart.md     # Developer onboarding
```

### 4. Handoff to ark-developer

ark-project-manager emits a structured handoff:

```xml
<project_management_complete>true</project_management_complete>
<branch_name>001-fraud-alerts</branch_name>
<target_project>arkd</target_project>
<target_repo>/Users/.../arkd</target_repo>
<artifacts_ready>
- sessions/.../specs/arkd/001-fraud-alerts/spec.md
- sessions/.../specs/arkd/001-fraud-alerts/plan.md
- sessions/.../specs/arkd/001-fraud-alerts/tasks.md
</artifacts_ready>
<next_step>
Delegate to ark-developer with target project arkd
</next_step>
```

## Cross-Project Features

For features spanning multiple repos (e.g., wallet ↔ go-sdk sync):

```
sessions/<SESSION_ID>/specs/cross-project/001-vtxo-sync/
├── spec.md           # Lists all affected projects
│   └── Affected: arkd, wallet, go-sdk
├── plan.md           # Per-project implementation details
│   ├── arkd: API changes
│   ├── wallet: UI changes
│   └── go-sdk: Client changes
└── tasks.md          # Tasks grouped by project
    ├── [arkd] Task 1...
    ├── [wallet] Task 2...
    └── [go-sdk] Task 3...
```

## Constitution

The constitution at `.specify/memory/constitution.md` should contain Ark ecosystem principles:

```markdown
# Ark Protocol Ecosystem Constitution

## Core Principles

### I. Protocol Integrity First
All features must preserve Bitcoin UTXO model semantics and Ark protocol guarantees.

### II. Offline-First Design
Wallet and client features must function during ASP unavailability.

### III. Test-Driven for Protocol Code
TDD mandatory for: transaction building, signature verification, VTXO lifecycle.

### IV. Observability
All services expose Prometheus metrics and structured logging.

### V. Cross-Project Consistency
Go services follow arkd patterns; TypeScript follows wallet patterns.

## Technology Standards
- Go services: Clean architecture, internal/core separation
- TypeScript: React + TanStack for wallets
- Testing: Unit → Integration → E2E pipeline
- Database: SQLite (local), PostgreSQL (server)

**Version**: 1.0.0 | **Ratified**: 2024-12-02
```

## Upstream Sync Strategy

Since we've forked/customized spec-kit, manual sync is needed:

1. **Monitor upstream**: Watch https://github.com/github/spec-kit for updates
2. **Review changes**: Focus on template improvements, new commands
3. **Cherry-pick**: Apply relevant changes to our templates/scripts
4. **Document**: Track applied changes in `.specify/UPSTREAM_CHANGELOG.md`

```bash
# Example sync check
git clone --depth 1 https://github.com/github/spec-kit /tmp/spec-kit
diff -r /tmp/spec-kit/src/specify_cli/templates .specify/templates
```

## Usage Examples

### Create a spec for arkd

```
User: Create a spec for fraud detection alerts in arkd
ark-project-manager: Using pm-spec skill...
  → /speckit.specify --project arkd "fraud detection alerts"
  → Output: sessions/.../specs/arkd/001-fraud-alerts/spec.md
```

### Create a cross-project spec

```
User: Plan the wallet-SDK sync feature
ark-project-manager: This spans wallet and go-sdk...
  → /speckit.specify --project cross-project "wallet-SDK sync"
  → Output: sessions/.../specs/cross-project/001-wallet-sdk-sync/spec.md
```

### Full workflow

```
1. /speckit.specify Add offline VTXO refresh for wallet
   → sessions/.../specs/wallet/001-offline-vtxo-refresh/spec.md

2. /speckit.plan
   → plan.md, research.md, data-model.md

3. /speckit.tasks
   → tasks.md (dependency-ordered)

4. Handoff to ark-developer
   → Implementation in ${WALLET_REPO}
```

## Related Documentation

- [Spec-Kit GitHub](https://github.com/github/spec-kit) - Upstream project
- [ark-project-manager](../agents/ark-project-manager.md) - Agent using this integration
- [pm-spec skill](../skills/pm-spec/SKILL.md) - Specification skill
- [Orchestrator](../ORCHESTRATOR.md) - How orchestrator delegates to ark-project-manager
