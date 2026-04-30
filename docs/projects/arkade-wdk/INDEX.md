---
project_id: arkade-wdk
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "testing/api-reference.md", "testing/how_to_run.md"]
  debug:      ["testing/troubleshooting.md"]
  monitoring: ["testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md"]
  api: ["testing/api-reference.md"]
scripts:
  install: "npm install"
  build: "npm run build"
  dev: "npm run dev"
  test: "npm test"
  test_watch: "npm run test:watch"
  lint: "npm run lint"
  lint_fix: "npm run lint:fix"
  format: "npm run format"
  clean: "npm run clean"
  setup_dev: "npm run setup:dev"
  apply_patches: "node scripts/apply-patches.js"
  generate_patches: "node scripts/generate-patches.js"
  submodules_init: "git submodule update --init --recursive"
---

# Arkade WDK — Project Index

**arkade-wdk** is a WDK (Wallet Development Kit) compatible Bitcoin wallet manager/account adapter built on top of `@arkade-os/sdk`, with optional Lightning support through `@arkade-os/boltz-swap`. It plugs into Tether's `@tetherto/wdk` to expose Ark protocol wallets through the standard WDK `WalletManager`/`WalletAccount` interfaces, enabling React Native and other WDK-based apps to use Ark as their Bitcoin backend.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/arkade-wdk/system/` — System Architecture & Components
Core documentation about the adapter's design and runtime layout:

- **system/project_overview.md** — What it is, features, account model, technology stack
- **system/architecture.md** — Adapter classes, account indices, submodule layout, dependency flow
- **system/integration-with-arkd.md** — How the adapter reaches arkd (via `@arkade-os/sdk`) and Boltz

### `${ARKADIAN_DIR}/docs/projects/arkade-wdk/testing/` — Usage & Operations
Practical guides for using and operating the adapter:

- **testing/usage.md** — Quick start, `WdkManager` registration, account types, send/receive
- **testing/how_to_run.md** — Local dev setup, submodule workflow, RN example app
- **testing/how_to_test.md** — Jest configuration, known test gaps, manual verification
- **testing/troubleshooting.md** — Esplora workaround, patch management, submodule issues
- **testing/api-reference.md** — `WalletManagerArkade`, `WalletAccountArkade`, utility exports

### `${ARKADIAN_DIR}/docs/projects/arkade-wdk/sop/` — Standard Operating Procedures
Step-by-step guides for operations:

- **sop/development-workflow.md** — Build, lint, format, submodule and patch workflow

### `${ARKADIAN_DIR}/docs/projects/arkade-wdk/tasks/` — Product Requirements & Plans
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
| Package | `@arkade-os/wdk` |
| Version | `0.1.0` |
| Language | TypeScript (Node ESM, ES2022) |
| Runtime | Node.js >= 18, React Native (via `bare-node-runtime`) |
| Package Manager | npm (root); submodules use their own |
| Test Framework | Jest (ESM) |
| Build Output | `dist/` (ESM + type declarations) |
| GitHub | `ArkLabsHQ/arkade-wdk` |
| License | MIT |

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    @arkade-os/wdk                             │
├──────────────────────────────────────────────────────────────┤
│  WDK Adapter Layer                                           │
│  ├── WalletManagerArkade           (extends WDK WalletManager)│
│  ├── WalletAccountArkade           (signing account)          │
│  └── WalletAccountArkadeReadOnly   (watch-only account)       │
├──────────────────────────────────────────────────────────────┤
│  Account Index Model                                         │
│  ├── Index 0: boarding             (on-chain BTC deposit)     │
│  ├── Index 1: offchain             (Ark VTXO transfers)       │
│  └── Index 2: lightning            (Boltz swaps, no address)  │
├──────────────────────────────────────────────────────────────┤
│  Utility Layer (src/lib/)                                    │
│  ├── address.ts        (decodeArkAddress, isArkAddress, …)   │
│  ├── bip21.ts          (decode/encode BIP21 URIs)             │
│  ├── bolt11.ts         (decode/validate BOLT11 invoices)      │
│  ├── lnurl.ts          (LNURL/Lightning-address resolution)   │
│  ├── send.ts           (auto-detect destination type, route)  │
│  ├── fees.ts           (offchain/onchain/lightning fees)      │
│  └── format.ts         (sat formatting helpers)               │
├──────────────────────────────────────────────────────────────┤
│  Submodules (packages/, examples/)                           │
│  ├── packages/pear-wrk-wdk            (bare-kit worklet)      │
│  ├── packages/wdk-react-native-provider (RN provider, HRPC)   │
│  └── examples/wdk-starter-react-native  (Expo demo app)       │
├──────────────────────────────────────────────────────────────┤
│  Underlying Dependencies                                     │
│  ├── @arkade-os/sdk                (Ark protocol wallet)      │
│  ├── @arkade-os/boltz-swap         (optional Lightning)       │
│  ├── @tetherto/wdk-wallet          (WDK base classes)         │
│  └── @scure/bip32, @scure/base, light-bolt11-decoder          │
└──────────────────────────────────────────────────────────────┘
```

## Key Concepts

- **WDK (Wallet Development Kit)**: Tether's framework defining a uniform `WalletManager`/`WalletAccount` API across chains. `arkade-wdk` is the Ark plugin for that framework.
- **Account index**: A small integer that selects one of the three operational modes (boarding/offchain/lightning), all backed by a single underlying SDK wallet.
- **Destination auto-detection**: `sendTransaction()` inspects the `to` field and routes Ark addresses, BTC addresses, and BOLT11 invoices to the correct path.
- **HRPC bridge**: React Native provider talks to a bare-kit worklet (`pear-wrk-wdk`) over HRPC, which in turn calls `@arkade-os/sdk`.
- **Esplora workaround**: Arkade balances are currently fetched directly from the Ark indexer + Esplora REST APIs from the RN side, bypassing the worklet — until the SDK's Esplora URL becomes configurable.
- **Patch-based submodule overlay**: Local changes to `packages/*` and `examples/*` are tracked as patch files under `./patches/`, applied via `scripts/apply-patches.js`.
