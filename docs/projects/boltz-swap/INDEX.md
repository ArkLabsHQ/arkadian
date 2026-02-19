---
project_id: boltz-swap
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "testing/how_to_run.md", "testing/api-reference.md"]
  debug:      ["testing/troubleshooting.md", "system/architecture.md"]
  monitoring: ["testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md"]
scripts:
  build: "pnpm run build"
  test: "pnpm test"
  test_unit: "pnpm test:unit"
  test_integration: "pnpm test:integration"
  format: "pnpm run format"
  lint: "pnpm run lint"
  regtest: "pnpm regtest"
  regtest_up: "pnpm regtest:up"
  regtest_down: "pnpm regtest:down"
---

# boltz-swap -- Project Index

**boltz-swap** is a production-ready TypeScript library (`@arkade-os/boltz-swap`) that brings Boltz submarine swaps to Arkade wallets. It enables Lightning payments (send and receive) and BTC<->ARK chain swaps through the Boltz exchange protocol, using Virtual HTLCs (VHTLCs) on the Ark protocol.

## Quick Reference

| Property | Value |
|----------|-------|
| Package | `@arkade-os/boltz-swap` |
| Version | 0.2.20 |
| Language | TypeScript (ES2022) |
| Runtime | Node.js >= 22 |
| Package Manager | pnpm 10.25.0 |
| Build Tool | tsup (ESM + CJS) |
| Test Framework | vitest |
| License | MIT |

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/boltz-swap/system/` -- System Architecture & Components
Core documentation about boltz-swap architecture and design:

- **system/project_overview.md** -- What boltz-swap is, features, and use cases
- **system/architecture.md** -- Architecture overview, component breakdown, data flows
- **system/integration-with-arkd.md** -- Integration with Ark ecosystem via @arkade-os/sdk

### `${ARKADIAN_DIR}/docs/projects/boltz-swap/testing/` -- Usage & Operations
Practical guides for using and operating boltz-swap:

- **testing/usage.md** -- Quick start guide, installation, basic examples
- **testing/api-reference.md** -- API documentation for all classes and methods
- **testing/how_to_run.md** -- Running the project (build, dev, regtest)
- **testing/how_to_test.md** -- Testing guide (unit, integration, e2e)
- **testing/troubleshooting.md** -- Common issues and debugging

### `${ARKADIAN_DIR}/docs/projects/boltz-swap/sop/` -- Standard Operating Procedures
Step-by-step guides for operations:

- **sop/development-workflow.md** -- Build, test, and PR workflow

### `${ARKADIAN_DIR}/docs/projects/boltz-swap/tasks/` -- Product Requirements & Plans
Feature specifications and implementation tracking.

### `change-log/` -- Sync Tracking & History
Documentation sync tracking and change history:

- **change-log/last-sync.txt** -- Last synced commit hash
- **change-log/SYNC_HISTORY.md** -- History of documentation syncs

### `pr-report/` -- Pull Request Summaries
Analysis and summaries of pull requests.

## Key Classes

| Class | Purpose |
|-------|---------|
| `ArkadeLightning` | Lightning swaps (send/receive via submarine + reverse swaps) |
| `ArkadeChainSwap` | BTC<->ARK chain swaps (on-chain Bitcoin to/from Ark) |
| `BoltzSwapProvider` | HTTP/WebSocket client for Boltz API v2 |
| `SwapManager` | Background swap monitoring with WebSocket + polling fallback |

## Swap Types

| Type | Direction | Mechanism | Class |
|------|-----------|-----------|-------|
| Submarine | ARK -> Lightning | User locks VHTLC, Boltz pays invoice | `ArkadeLightning.sendLightningPayment()` |
| Reverse | Lightning -> ARK | Boltz creates invoice, user claims VHTLC | `ArkadeLightning.createLightningInvoice()` |
| Chain (ARK->BTC) | ARK -> BTC | User locks VHTLC, receives BTC on-chain | `ArkadeChainSwap.arkToBtc()` |
| Chain (BTC->ARK) | BTC -> ARK | User sends BTC, claims VHTLC | `ArkadeChainSwap.btcToArk()` |
