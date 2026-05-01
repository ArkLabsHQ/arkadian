---
project_id: ts-sdk
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "testing/how_to_run.md"]
  debug:      ["testing/troubleshooting.md"]
  monitoring: ["testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md"]
scripts:
  build: "pnpm build"
  test: "pnpm test"
  test_unit: "pnpm test:unit"
  test_integration: "pnpm test:integration"
  format: "pnpm format"
  lint: "pnpm lint"
  regtest_up: "nigiri start --ark"
  regtest_down: "nigiri stop --delete"
  docs_build: "pnpm docs:build"
  release: "pnpm release"
---

# Ark TypeScript SDK — Project Index

**ts-sdk** is the official TypeScript SDK (`@arkade-os/sdk`) for the Ark protocol. It provides a complete client library for building Bitcoin wallets with Taproot and Ark virtual UTXO (VTXO) support. The SDK runs in browsers, Node.js, React Native/Expo, and service workers with pluggable storage adapters.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/ts-sdk/system/` — System Architecture & Components
Core documentation about the TypeScript SDK architecture and design:

- **system/project_overview.md** — What the SDK is, features, supported platforms, and use cases
- **system/architecture.md** — Module structure, provider pattern, identity system, and crypto stack
- **system/integration-with-arkd.md** — How the SDK communicates with arkd via REST/SSE

### `${ARKADIAN_DIR}/docs/projects/ts-sdk/testing/` — Usage & Operations
Practical guides for using and operating the SDK:

- **testing/usage.md** — Quick start, wallet creation, sending/receiving, storage adapters
- **testing/how_to_run.md** — Running examples, regtest environment, docker-compose
- **testing/how_to_test.md** — Unit tests, integration tests, vitest configuration
- **testing/troubleshooting.md** — Common issues with crypto polyfills, SSE, service workers

### `${ARKADIAN_DIR}/docs/projects/ts-sdk/sop/` — Standard Operating Procedures
Step-by-step guides for operations:

- **sop/development-workflow.md** — Build, test, release, and PR workflow

### `${ARKADIAN_DIR}/docs/projects/ts-sdk/tasks/` — Product Requirements & Plans
Feature specifications and implementation tracking.

### `change-log/` — Sync Tracking & History
Documentation sync tracking and change history:

- **change-log/last-sync.txt** — Last synced commit hash
- **change-log/SYNC_HISTORY.md** — History of documentation syncs

### `pr-report/` — Pull Request Summaries
Analysis and summaries of pull requests.

---

## Quick Reference

| Item | Value |
|------|-------|
| Package | `@arkade-os/sdk` |
| Version | `0.4.22` |
| Language | TypeScript |
| Runtime | Browser, Node.js, React Native, Service Worker |
| Package Manager | pnpm 10.29.2 |
| Test Framework | Vitest |
| Build Output | ESM + CJS + types |
| GitHub | `arkade-os/ts-sdk` |

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    @arkade-os/sdk                             │
├──────────────────────────────────────────────────────────────┤
│  Wallet Layer                                                │
│  ├── Wallet / ReadonlyWallet     (full + watch-only)         │
│  ├── ServiceWorkerWallet         (background operation)      │
│  ├── OnchainWallet               (on-chain fee payment)      │
│  ├── Ramps                       (onboard / offboard)        │
│  ├── VtxoManager                 (renewal / recovery)        │
│  ├── DelegatorManager            (VTXO delegation)           │
│  └── AssetManager                (issue / reissue / burn)    │
├──────────────────────────────────────────────────────────────┤
│  Identity Layer                                              │
│  ├── SingleKey                   (raw private key)           │
│  ├── SeedIdentity                (HD from seed bytes)        │
│  ├── MnemonicIdentity            (HD from BIP39 mnemonic)    │
│  └── ReadonlyDescriptorIdentity  (watch-only descriptor)     │
├──────────────────────────────────────────────────────────────┤
│  Provider Layer                                              │
│  ├── RestArkProvider             (arkd REST + SSE)           │
│  ├── RestIndexerProvider         (indexer REST + streaming)   │
│  ├── EsploraProvider             (on-chain block explorer)   │
│  ├── RestDelegatorProvider       (delegator REST)            │
│  └── Expo variants               (React Native adapters)     │
├──────────────────────────────────────────────────────────────┤
│  Crypto Layer                                                │
│  ├── MuSig2 (nonces, signing)                                │
│  ├── Tapscript (VTXO scripts, VHTLC, CSV/CLTV multisig)     │
│  ├── TxTree (tree construction, signing sessions)            │
│  └── Intent (proof generation)                               │
├──────────────────────────────────────────────────────────────┤
│  Storage Adapters                                            │
│  ├── InMemoryStorageAdapter      (default, ephemeral)        │
│  ├── LocalStorageAdapter         (browser)                   │
│  ├── IndexedDBStorageAdapter     (browser / service worker)  │
│  ├── FileSystemStorageAdapter    (Node.js)                   │
│  └── AsyncStorageAdapter         (React Native)              │
└──────────────────────────────────────────────────────────────┘
```

## Key Concepts

- **Wallet**: Full signing wallet (`Wallet`) or watch-only (`ReadonlyWallet`)
- **Identity**: Key management abstraction — SingleKey, SeedIdentity (HD), MnemonicIdentity
- **VTXOs**: Virtual transaction outputs managed off-chain via Ark protocol
- **Boarding**: Converting on-chain BTC to off-chain VTXOs
- **Settlement / Batch**: Participating in Ark rounds to settle VTXOs
- **Ramps**: Onboard (BTC→VTXO) and offboard (VTXO→BTC) operations
- **Delegation**: Outsourcing VTXO renewal to a third-party delegator service
- **Unilateral Exit**: Withdrawing funds without server cooperation via unroll + timelock
- **Assets**: Issuing, reissuing, burning, and transferring assets on Ark
- **ArkNote**: Serializable representation of Ark payment data
