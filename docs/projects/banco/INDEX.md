---
project_id: banco
version: 1.0.0
last_sync_commit: aab5d0e5f3da17b4f7efecc3c00d3044b51bc360
last_sync_date: 2026-05-09T12:00:00Z
repository_path: ${BANCO_REPO}
documentation_path: ${ARKADIAN_DOCS}/projects/banco
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
  usage: ["testing/usage.md"]
  swap: ["system/swap-protocol.md"]
scripts:
  build: "pnpm build"
  test: "pnpm test"
  test_e2e: "pnpm test:e2e"
  lint: "pnpm lint"
  format: "pnpm format"
  regtest_start: "pnpm regtest:start"
  regtest_stop: "pnpm regtest:stop"
  regtest_clean: "pnpm regtest:clean"
---

# Banco — Project Index

**banco** (`@arkade-os/banco`) is a TypeScript library implementing the non-interactive banco swap protocol for Ark. It enables trustless atomic swaps between BTC and assets (or asset-to-asset) on the Ark network without requiring both parties to be online simultaneously, using covenant-based VTXO scripts with introspection opcodes.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/banco/system/` — System Architecture & Components
Core documentation about banco architecture and design:

- **${ARKADIAN_DIR}/docs/projects/banco/system/project_overview.md** — What banco is, features, and use cases
- **${ARKADIAN_DIR}/docs/projects/banco/system/architecture.md** — Maker/Taker architecture, offer lifecycle, TLV encoding
- **${ARKADIAN_DIR}/docs/projects/banco/system/swap-protocol.md** — Covenant scripts, taptree construction, partial fills

### `${ARKADIAN_DIR}/docs/projects/banco/testing/` — Usage & Operations
Practical guides for using and operating banco:

- **${ARKADIAN_DIR}/docs/projects/banco/testing/usage.md** — Quick start, installation, API examples
- **${ARKADIAN_DIR}/docs/projects/banco/testing/how_to_run.md** — Development setup, regtest environment
- **${ARKADIAN_DIR}/docs/projects/banco/testing/how_to_test.md** — Unit tests, E2E tests, coverage
- **${ARKADIAN_DIR}/docs/projects/banco/testing/troubleshooting.md** — Common issues and debugging

### `${ARKADIAN_DIR}/docs/projects/banco/sop/` — Standard Operating Procedures
Step-by-step guides for operations:

- **${ARKADIAN_DIR}/docs/projects/banco/sop/development-workflow.md** — Development setup and workflow
