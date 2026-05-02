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
  test: "npm test"
  test_watch: "npm run test:watch"
  typecheck: "npm run typecheck"
  build_types: "npm run build:types"
  lint: "npm run lint"
  lint_fix: "npm run lint:fix"
  format: "npm run format"
  setup_dev: "npm run setup:dev"
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
| Language | JavaScript with JSDoc types (Node ESM, ES2022) |
| Runtime | Node.js >= 18, React Native (via bare-kit worklet `pear-wrk-wdk`) |
| Package Manager | npm (root); submodules use their own |
| Test Framework | `node --test` (Node built-in test runner) |
| Type Output | `types/` (declaration files emitted by `tsc -p tsconfig.json`) |
| Source Layout | Ships `src/*.js` directly — no compile step for runtime code |
| GitHub | `ArkLabsHQ/arkade-wdk` |
| License | MIT |

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    @arkade-os/wdk                             │
├──────────────────────────────────────────────────────────────┤
│  WDK Adapter Layer                                           │
│  ├── WalletManagerArkade           (extends WDK WalletManager)│
│  ├── WalletAccountReadOnlyArkade   (extends WDK ReadOnly)     │
│  └── WalletAccountArkade           (extends ReadOnlyArkade)   │
├──────────────────────────────────────────────────────────────┤
│  Account Index Model                                         │
│  ├── Index 0: boarding             (on-chain BTC deposit)     │
│  ├── Index 1: offchain             (Ark VTXO transfers)       │
│  └── Index 2: lightning            (Boltz swaps, no address)  │
├──────────────────────────────────────────────────────────────┤
│  Internal Helper Layer (src/lib/, NOT re-exported)           │
│  ├── address.js        (Ark/BTC/BOLT11 detection)             │
│  ├── bech32m.js        (arkAddressToPkScript for indexer)     │
│  ├── bip21.js          (decode/encode BIP21 URIs)             │
│  ├── bolt11.js         (decode/validate BOLT11 invoices)      │
│  ├── lnurl.js          (LNURL / Lightning-address resolution) │
│  ├── send.js           (BIP21 + auto-detect routing)          │
│  ├── fees.js           (parseFeeRate + offchain/onchain/LN)   │
│  └── format.js         (sat formatting helpers)               │
├──────────────────────────────────────────────────────────────┤
│  Submodules (packages/, examples/)                           │
│  ├── packages/pear-wrk-wdk            (bare-kit worklet)      │
│  ├── packages/wdk-react-native-provider (RN provider, HRPC)   │
│  └── examples/wdk-starter-react-native  (Expo demo app)       │
├──────────────────────────────────────────────────────────────┤
│  Underlying Dependencies                                     │
│  ├── @arkade-os/sdk          0.4.21  (Ark protocol wallet)    │
│  ├── @arkade-os/boltz-swap   0.3.22  (optional Lightning)     │
│  ├── @tetherto/wdk-wallet    1.0.0-beta.5 (WDK base classes)  │
│  ├── sodium-universal        ^5.0.1  (sodium_memzero)         │
│  └── @scure/bip32, @scure/base, light-bolt11-decoder          │
└──────────────────────────────────────────────────────────────┘
```

## Key Concepts

- **WDK (Wallet Development Kit)**: Tether's framework defining a uniform `WalletManager`/`WalletAccount` API across chains. `arkade-wdk` is the Ark plugin for that framework.
- **Account index**: A small integer that selects one of the three operational modes (boarding/offchain/lightning), all backed by a per-derivation-path SDK wallet (each call to `getAccount(index)` resolves a distinct BIP-86 derivation path).
- **Destination auto-detection**: `sendTransaction()` inspects the `to` field and routes Ark addresses, BTC addresses, BOLT11 invoices, and BIP21 URIs (which are resolved internally) to the correct path.
- **HRPC bridge**: React Native provider talks to a bare-kit worklet (`pear-wrk-wdk`) over HRPC, which in turn calls `@arkade-os/sdk`.
- **Direct indexer / Esplora**: For arkade networks the RN provider hits the Ark indexer (`/v1/indexer/vtxos`) and Esplora REST directly to compute balances and watch incoming funds — this is the in-the-default RN pipeline, not a transient workaround.
- **Secure key erasure**: Private key material is wiped via `sodium_memzero` on `dispose()`, and the master HDKey is wiped immediately after derivation.
- **Patch-based submodule overlay**: Local changes to `packages/*` and `examples/*` are tracked as patch files under `./patches/`, applied by `scripts/setup-dev.js`.
