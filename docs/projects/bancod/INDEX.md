---
project_id: bancod
version: 1.0.0
last_sync_commit: 2827a305a0b6561730abaef78ca40cd158d142f8
last_sync_date: 2026-05-16T00:00:00Z
repository_path: ${BANCOD_REPO}
documentation_path: ${ARKADIAN_DOCS}/projects/bancod
commits_behind_upstream: 0
uncommitted_changes: false
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "sop/development-workflow.md"]
  debug:      ["testing/troubleshooting.md", "testing/usage.md"]
  monitoring: ["testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md", "testing/api-reference.md"]
  swap: ["system/swap-protocol.md"]
  preimage: ["system/preimage-protocol.md"]
scripts:
  build: "make build"
  test: "make test"
  integration: "make integrationtest"
  lint: "make lint"
  proto: "make proto"
  sqlc: "make sqlc"
  docker: "make docker"
  setup_test_env: "make setup-test-env"
  teardown_test_env: "make teardown-test-env"
---

# Bancod — Project Index

**bancod** is a Go implementation of a banco solver bot for the Arkade virtual mempool. A maker posts a swap offer as a VTXO on an Ark network; the solver bot watches the arkd transaction stream, finds offers matching configured pairs and price ranges, and fulfills them atomically via an introspector-signed Ark transaction. Also supports a stateless preimage-claim plugin.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/bancod/system/` — System Architecture & Components
Core documentation about bancod architecture and design:

- **${ARKADIAN_DIR}/docs/projects/bancod/system/project_overview.md** — What bancod is, features, and use cases
- **${ARKADIAN_DIR}/docs/projects/bancod/system/architecture.md** — Plugin-based solver architecture, data flow, components
- **${ARKADIAN_DIR}/docs/projects/bancod/system/swap-protocol.md** — Banco swap protocol: offers, fulfillment, TLV encoding
- **${ARKADIAN_DIR}/docs/projects/bancod/system/preimage-protocol.md** — Preimage-gated VTXO claims, ECIES encryption, stateless design
- **${ARKADIAN_DIR}/docs/projects/bancod/system/configuration.md** — Environment variables and configuration options

### `${ARKADIAN_DIR}/docs/projects/bancod/testing/` — Usage & Operations
Practical guides for using and operating bancod:

- **${ARKADIAN_DIR}/docs/projects/bancod/testing/usage.md** — Quick start guide (binary and Docker)
- **${ARKADIAN_DIR}/docs/projects/bancod/testing/api-reference.md** — gRPC/REST API and CLI reference
- **${ARKADIAN_DIR}/docs/projects/bancod/testing/how_to_run.md** — Development and production deployment
- **${ARKADIAN_DIR}/docs/projects/bancod/testing/how_to_test.md** — Unit tests, integration tests, E2E tests
- **${ARKADIAN_DIR}/docs/projects/bancod/testing/troubleshooting.md** — Common issues and debugging

### `${ARKADIAN_DIR}/docs/projects/bancod/sop/` — Standard Operating Procedures
Step-by-step guides for operations:

- **${ARKADIAN_DIR}/docs/projects/bancod/sop/development-workflow.md** — Development setup and workflow
