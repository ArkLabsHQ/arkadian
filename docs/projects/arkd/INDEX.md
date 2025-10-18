---
project_id: arkd
version: 1.0.0
last_sync_commit: e16538b52131080ef247f6fed176db0d15a378bc
last_sync_date: 2025-10-16T12:00:00Z
repository_path: ${ARKD_REPO}
documentation_path: ${ARKADIAN_DOCS}/projects/arkd
commits_behind_upstream: 0
uncommitted_changes: false
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_run.md", "testing/how_to_test.md"]
  dev:        ["testing/how_to_run.md", "system/architecture.md", "system/folder_structure.md"]
  monitoring: ["testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md", "testing/how_to_run.md"]
  test: ["testing/how_to_test.md", "testing/usage.md"]
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

### `system/`  System Architecture & Design
Core technical documentation about how arkd is structured and operates:

- **project_overview.md**  High-level introduction to arkd, its purpose, and key concepts
- **architecture.md**  Hexagonal architecture pattern, dependency rules, and layer responsibilities
- **folder_structure.md**  Repository organization and where to find components
- **tech_stack.md**  Technologies, frameworks, and libraries used
- **integration_points.md**  How components communicate across layers and with external services
- **configuration.md**  Environment variables and configuration options
- **application_core.md**  Core application service orchestration and use cases
- **repo_manager.md**  Repository interfaces and data persistence patterns
- **ark_lib.md**  Shared utilities and data structures

### `testing/`  Usage, Testing & Troubleshooting
Practical guides for running, testing, and debugging arkd:

- **usage.md**  Quick start guide and common usage patterns
- **how_to_run.md**  Development environment setup and running arkd locally
- **how_to_test.md**  Running unit tests, integration tests, and simulations
- **troubleshooting.md**  Common issues and solutions

### `sop/`  Standard Operating Procedures
Step-by-step guides for common development tasks:

- Procedures for adding features, fixing bugs, and making changes
- Workflow guides and best practices
- Lessons learned from development

### `tasks/`  Product Requirements & Implementation Plans
PRDs, feature specifications, and implementation tracking:

- Feature proposals and requirements
- Implementation plans and status
- Technical decisions and trade-offs

### `change-log/`  Recent Changes
Curated summaries of significant changes:

- Recent feature additions
- Bug fixes and improvements
- Breaking changes and migrations

### `pr-report/`  Pull Request Summaries
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
