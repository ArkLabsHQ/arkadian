---
project_id: bluewallet
last_sync_commit: cce2f216f1a11a030ddde3e028c226d90a27cd80
default_sections_by_intent:
  qna:        ["system/project_overview.md", "system/integration-with-arkd.md"]
  qa:         ["testing/usage.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "system/integration-with-arkd.md", "sop/development-workflow.md"]
  debug:      ["testing/troubleshooting.md"]
  monitoring: ["testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md"]
  ark: ["system/integration-with-arkd.md"]
  dev: ["sop/development-workflow.md"]
scripts:
  install: "npm install"
  start: "npm start"
  ios: "npm run ios"
  android: "npm run android"
  test: "npm test"
  unit: "npm run unit"
  integration: "npm run integration"
  lint: "npm run lint"
  lint_fix: "npm run lint:fix"
  e2e_debug: "npm run e2e:debug"
  e2e_release: "npm run e2e:release-test"
  clean: "npm run clean"
  clean_ios: "npm run clean:ios"
---

# BlueWallet — Project Index

**BlueWallet** is a thin Bitcoin & Lightning Network wallet built with React Native and Electrum, distributed natively on iOS, Android, and macOS (via Catalyst). It is one of the most popular open-source Bitcoin wallets in the ecosystem and integrates the **Ark protocol** as a first-class wallet type via `@arkade-os/sdk` and `@arkade-os/boltz-swap`, enabling users to hold and transact VTXOs alongside legacy/SegWit/Taproot/HD/Lightning wallets in a single mobile app.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/bluewallet/system/` — System Architecture & Design
Core documentation about the wallet application:

- **system/project_overview.md** — What BlueWallet is, features, wallet types, and Ark integration scope
- **system/architecture.md** — React Native architecture, navigation, state management, wallet class hierarchy
- **system/integration-with-arkd.md** — How BlueWallet integrates the Ark SDK (LightningArkWallet, ArkadeSwaps, Realm repos, Expo adapters, background tasks)

### `${ARKADIAN_DIR}/docs/projects/bluewallet/testing/` — Usage & Operations
Practical guides for using and developing:

- **testing/usage.md** — Quick start, building/running on iOS/Android/macOS, creating an Ark wallet
- **testing/how_to_run.md** — Prerequisites, environment setup, RN dev server, native builds
- **testing/how_to_test.md** — Lint, unit, integration, and Detox E2E test workflows
- **testing/troubleshooting.md** — Common build issues, Metro cache, Pods, Detox, Ark connectivity

### `${ARKADIAN_DIR}/docs/projects/bluewallet/sop/` — Standard Operating Procedures
Step-by-step guides for development:

- **sop/development-workflow.md** — Branch flow, commit prefixes (REL/FIX/ADD/REF/TST/OPS/DOC), lint/test gate, PR conventions

### `${ARKADIAN_DIR}/docs/projects/bluewallet/tasks/` — Product Requirements & Plans
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
| Package | `bluewallet` |
| Version | `8.0.0` |
| Language | TypeScript / React Native |
| Runtime | iOS, Android, macOS (Catalyst); Node >= 20 for tooling |
| Package Manager | npm |
| Test Frameworks | Jest (unit, integration), Detox (E2E) |
| Lint | ESLint + Prettier + tsc + custom unused-loc-keys check |
| Ark SDK | `@arkade-os/sdk` 0.4.16 |
| Ark Boltz | `@arkade-os/boltz-swap` 0.3.17 |
| Default Ark Server | `https://arkade.computer` |
| Default Delegator | `https://delegate.arkade.money` |
| Default Boltz API | `https://api.ark.boltz.exchange` |
| Storage | Realm DB, AsyncStorage, Keychain |
| License | MIT |
| GitHub | `BlueWallet/BlueWallet` |
| Website | bluewallet.io |

---

## Key Concepts

### Multi-Wallet Architecture
BlueWallet ships **15+ wallet types** in `class/wallets/`:
- Legacy P2PKH, SegWit P2SH, SegWit Bech32, Taproot
- HD variants (BIP44/49/84/86), HD Aezeed, Electrum HD seeds, SLIP-39
- Lightning Custodian (LndHub), **Lightning Ark (`LightningArkWallet`)**
- Multisig HD, Watch-only

Each wallet type extends `AbstractWallet` (or `AbstractHDWallet`) and exposes a unified API for send/receive/balance/transactions.

### Ark Protocol Integration
The `LightningArkWallet` class (`class/wallets/lightning-ark-wallet.ts`, ~845 LOC) extends `LightningCustodianWallet` and uses:
- **`@arkade-os/sdk`**: `Wallet`, `Ramps`, `MnemonicIdentity`, `SingleKey`, `RestDelegatorProvider`, `ExpoArkProvider`, `ExpoIndexerProvider`
- **`@arkade-os/boltz-swap`**: `ArkadeSwaps`, `BoltzSwapProvider` for submarine/reverse swaps
- **Realm repositories**: `RealmWalletRepository`, `RealmContractRepository`, `RealmSwapRepository` (re-exported from SDK)
- **Background tasks**: `blue_modules/arkade-adapters/background/` — swap-queue, swap-processor, task-scheduler, foreground-poller

### React Native Foundations
- **Navigation**: React Navigation 7.x (native stack, drawer)
- **State**: Context providers (SettingsProvider, StorageProvider) + custom hooks (useStorage, useSettings, useBiometrics)
- **Persistence**: Realm (Ark contracts/swaps), AsyncStorage (settings), Keychain (secrets)
- **Localization**: `loc/en.json` source + 55+ Transifex-managed translations
- **Crypto**: `bitcoinjs-lib`, `@noble/secp256k1`, `bip32`/`bip39`, custom `react-native-blue-crypto`
- **Network**: Custom Electrum client (`rn-electrum-client`)

### Code Conventions
- All new files **must be TypeScript** (strict mode enabled)
- Components in `components/` (not legacy `BlueComponents.js/.tsx`)
- Commit prefixes: `REL`, `FIX`, `ADD`, `REF`, `TST`, `OPS`, `DOC`
- No inline styles in React Native (`react-native/no-inline-styles: error`)
- Prettier: single quotes, 140-char width, trailing commas
- Avoid adding new dependencies without strong justification

---

## When to Consult This Project

- **Q&A**: How does BlueWallet implement Ark? How does the Realm-backed Ark wallet differ from the PWA `wallet`?
- **Dev**: Bumping `@arkade-os/sdk`/`@arkade-os/boltz-swap`, debugging Ark wallet flows in RN, adding Ark-related screens
- **Test**: Running unit (`npm run unit`) or integration (`npm run integration`) tests for the Ark wallet
- **Debug**: Build errors (Metro/Pods/Gradle), Realm migrations, Ark server connectivity, Boltz swap reconciliation
- **Compare**: When comparing the BlueWallet RN wallet vs the Arkade PWA `wallet` for protocol coverage or UX patterns

---

## Cross-Project Relationships

| Related Project | Relationship |
|-----------------|--------------|
| `ts-sdk` | Source of `@arkade-os/sdk` consumed by BlueWallet |
| `boltz-swap` | Source of `@arkade-os/boltz-swap` consumed by BlueWallet |
| `boltz-backend` | Backend that BlueWallet swaps against (`api.ark.boltz.exchange`) |
| `arkd` | Server BlueWallet's Ark wallet talks to (`arkade.computer` default) |
| `wallet` | Sister Arkade end-user wallet (PWA equivalent) |
| `arkade-wdk` | Alternative WDK-style adapter for similar RN Ark integration |
