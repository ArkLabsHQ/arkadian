---
project_id: arkd
version: 1.3.2
last_sync_commit: 2999d6663b1547fa0dbaff20e7ea7bb3eaf23e95
last_sync_date: 2026-05-08T00:00:00Z
repository_path: ${ARKD_REPO}
documentation_path: ${ARKADIAN_DOCS}/projects/arkd
commits_behind_upstream: 0
uncommitted_changes: false
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/arkd-environment-and-testing-guide.md"]
  qa:         ["testing/arkd-environment-and-testing-guide.md"]
  dev:        ["testing/arkd-development-reference.md", "system/architecture.md", "system/folder_structure.md"]
  monitoring: ["testing/arkd-environment-and-testing-guide.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/arkd-environment-and-testing-guide.md"]
  test: ["testing/arkd-environment-and-testing-guide.md"]
  development: ["testing/arkd-development-reference.md"]
scripts:
  compose_up: "make docker-run"
  smoke: "docker ps | grep arkd | grep -v Exited"
  health: "arkd wallet balance"
  test_unit: "make test"
  test_integration: "make integrationtest"
---

# ArkD  Project Index

**arkd** is the server implementation of an Arkade instance that builds on top of the Ark protocol, a Bitcoin scaling solution enabling fast, low-cost off-chain transactions while maintaining Bitcoin's security guarantees.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/arkd/system/`  System Architecture & Design
Core technical documentation about how arkd is structured and operates:

- **${ARKADIAN_DIR}/docs/projects/arkd/system/project_overview.md** —  High-level introduction to arkd, its purpose, and key concepts
- **${ARKADIAN_DIR}/docs/projects/arkd/system/architecture.md** —  Hexagonal architecture pattern, dependency rules, and layer responsibilities
- **${ARKADIAN_DIR}/docs/projects/arkd/system/folder_structure.md** —  Repository organization and where to find components
- **${ARKADIAN_DIR}/docs/projects/arkd/system/tech_stack.md** —  Technologies, frameworks, and libraries used
- **${ARKADIAN_DIR}/docs/projects/arkd/system/integration_points.md** —  How components communicate across layers and with external services
- **${ARKADIAN_DIR}/docs/projects/arkd/system/configuration.md** —  Environment variables and configuration options
- **${ARKADIAN_DIR}/docs/projects/arkd/system/application_core.md** —  Core application service orchestration and use cases
- **${ARKADIAN_DIR}/docs/projects/arkd/system/repo_manager.md** —  Repository interfaces and data persistence patterns
- **${ARKADIAN_DIR}/docs/projects/arkd/system/ark_lib.md** —  Shared utilities and data structures

### `${ARKADIAN_DIR}/docs/projects/arkd/testing/`  Usage, Testing & Troubleshooting
Practical guides for running, testing, and debugging arkd:

- **${ARKADIAN_DIR}/docs/projects/arkd/testing/arkd-development-reference.md** —  Development guide for ark-developer (architecture, code patterns, building)
- **${ARKADIAN_DIR}/docs/projects/arkd/testing/arkd-environment-and-testing-guide.md** —  Complete guide for environment setup, running, testing, debugging

### `${ARKADIAN_DIR}/docs/projects/arkd/sop/`  Standard Operating Procedures
Step-by-step guides for common development tasks:

- Procedures for adding features, fixing bugs, and making changes
- Workflow guides and best practices
- Lessons learned from development

### `${ARKADIAN_DIR}/docs/projects/arkd/tasks/`  Product Requirements & Implementation Plans
PRDs, feature specifications, and implementation tracking:

- Feature proposals and requirements
- Implementation plans and status
- Technical decisions and trade-offs

### `${ARKADIAN_DIR}/docs/projects/arkd/change-log/`  Recent Changes
Curated summaries of significant changes:

- Recent feature additions
- Bug fixes and improvements
- Breaking changes and migrations

### `${ARKADIAN_DIR}/docs/projects/arkd/pr-report/`  Pull Request Summaries
Analysis and summaries of pull requests:

- PR reviews and analysis
- Risk assessments
- Breaking change highlights

---

## Key Concepts

- **VTXOs (Virtual Transaction Outputs)**: Off-chain UTXOs managed by the Ark protocol
- **Rounds**: Batch settlement cycles that process multiple transactions together
- **Covenantless Architecture**: Transaction builder that doesn't require Bitcoin covenants
- **Hexagonal Architecture**: Ports and adapters pattern with strict dependency rules
- **Event Sourcing + CQRS**: Immutable event store with read model projections

---

## Quick Reference

### Development
```bash
make build              # Build arkd binary
make run                # Run with PostgreSQL + Redis
make run-light          # Run with SQLite + in-memory cache
make test               # Run unit tests
make integrationtest    # Run e2e tests (requires docker-run first)
```

### Testing
```bash
nigiri start            # Start local Bitcoin regtest
make run-wallet         # Start arkd-wallet with signer
make docker-run         # Start full Docker environment
make docker-stop        # Tear down Docker environment
```

### Database
```bash
make pg                 # Start PostgreSQL container
make pgmigrate FILE=name  # Create new migration
make pgsqlc             # Generate code from SQL queries
```

---

## Documentation Size Guidelines

To keep context lean for Claude agents:

- **usage/how-to**: d 100-120 lines
- **architecture**: 400-700 words
- **api reference**: 400-800 words
- **code-map**: d 120 lines
- **system overview**: 600-1000 words

Keep files focused and cross-reference when needed.
