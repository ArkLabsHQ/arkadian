# Documentation Sync History — Arkade WDK (@arkade-os/wdk)

## 2026-05-08 — SDK 0.4.25 / boltz-swap 0.3.29, private SDK wallet, RN balance refactor, Boltz referralId
**Previous Commit**: `c5b9236ab8692f5c3de620e559913ba0e0776216`
**Current Commit**: `c5f4bd978b6243eb0653d0c1aa8addda91db5923`
**Synced By**: /update-project arkade-wdk
**Status**: Updated

**Commits Analyzed** (3):
- `6922e1b` Upgrade ts-sdk 0.4.24 - boltz-swap 0.3.28 *(actually pinned `@arkade-os/sdk@0.4.25` and `@arkade-os/boltz-swap@0.3.29` after the patch landed)*
- `b9ddce2` fix: balance and transactions retrieval — drops the public `account.wallet` field and adds `subscribeToIncomingFunds`; refactors RN provider to call `WalletAccountArkade.getBalance()` instead of the inline indexer/Esplora workaround
- `c5f4bd9` Add referralId — `BoltzSwapProvider` constructor now receives `referralId: 'arkade-wdk-sdk'`

**Changes**:
- Bumped `@arkade-os/sdk` from `0.4.23` → `0.4.25` and `@arkade-os/boltz-swap` from `0.3.25` → `0.3.29` in `INDEX.md` architecture diagram and `system/project_overview.md` runtime dependency table; reflected version pins in master `docs/INDEX.md` arkade-wdk dependency line
- **Breaking**: documented removal of `WalletAccountArkade.wallet` (the underlying SDK wallet is now private) in `testing/api-reference.md` (added "Removed / No Longer Public" section) and `system/project_overview.md` (Current Implementation Notes)
- Added `subscribeToIncomingFunds(callback)` method to `testing/api-reference.md` (`WalletAccountArkade` signature + dedicated section) and to `system/architecture.md` (`WalletAccountArkade` bullet list)
- Added a "Watch Incoming Funds" section to `testing/usage.md` showing the new subscription API
- Rewrote the RN balance section in `system/architecture.md` ("RN Balance Path") and the corresponding bullet in `INDEX.md` to describe the new RN-side wallet path: offchain/Lightning balance via `WalletAccountArkade.getBalance()`, boarding still via Esplora REST, indexer workaround retired
- Updated `testing/troubleshooting.md` "Balance is always zero on a real Android device" entry to reflect the new RN path (config focus on `arkServerUrl` / `esploraUrl` and the `subscribeToIncomingFunds` hook)
- Documented Boltz `referralId: 'arkade-wdk-sdk'` in `system/architecture.md` (`BoltzSwapProvider` constructor) and `system/project_overview.md` integration points
- Updated `Key Capabilities` block in master `docs/INDEX.md` for arkade-wdk: replaced the "Direct Ark-indexer + Esplora REST workaround" bullet with the new RN-side `getBalance()` + `subscribeToIncomingFunds` bullets and the Boltz `referralId` capability

**Notes**:
- `getTransactionReceipt` / `getTransactionHistory` paths were unaffected by this sync (they already routed through SDK methods, not the now-private `wallet` field).
- New unit test `subscribeToIncomingFunds delegates to wallet notifyIncomingFunds` in `src/__tests__/wdk.test.js`; existing test inventory in `system/architecture.md` Testing Posture section already says "node:test specs in `src/__tests__/`", so no per-file change needed there.
- The `bech32m.js` cross-checked decoder in `src/lib/` is still shipped, but is no longer load-bearing for the RN provider's balance path.

---

## 2026-05-05 — Dependency bump (ts-sdk 0.4.23, boltz-swap 0.3.25)
**Previous Commit**: `f95443f9d3c30436ee9dce98e42f16c992304982`
**Current Commit**: `c5b9236ab8692f5c3de620e559913ba0e0776216`
**Synced By**: /update-project arkade-wdk
**Status**: Updated

**Commits Analyzed** (2):
- `9c5c427` Upgrade ts-sdk 0.4.23 - boltz-swap 0.3.25
- `6c5bfbc` Update README

**Changes**:
- Bumped `@arkade-os/sdk` pin from `0.4.21` → `0.4.23` in `INDEX.md` architecture diagram and `system/project_overview.md` runtime dependency table
- Bumped `@arkade-os/boltz-swap` pin from `0.3.22` → `0.3.25` in the same locations
- Upstream README cleanup (removed already-shipped TODOs, corrected source file extensions to `.js`, renamed `WalletAccountArkadeReadOnly` → `WalletAccountReadOnlyArkade`, dropped stale `npm run build` / `npm run dev` from Quick Start) — already reflected in existing local docs; no further changes required

**Notes**:
- Master `docs/INDEX.md` lists arkade-wdk dependencies without version pins, so no update there
- No public API surface or build/test workflow changes in this sync

---

## 2026-04-30 — Initial Documentation Setup
**Commit**: `07b6a7504d9cba4ecc0032f3c1eae5efb6919e1d`
**Synced By**: /add-project command
**Status**: Baseline established

**Changes**:
- Created project documentation structure under `docs/projects/arkade-wdk/`
- Added `INDEX.md` with YAML frontmatter, scripts, aliases, and intent-based section defaults
- Added `system/project_overview.md` with package metadata, account model, technology stack, current gaps
- Added `system/architecture.md` with adapter classes, account index model, submodule layout, send routing, Esplora workaround
- Added `system/integration-with-arkd.md` covering protocol traffic via SDK, RN balance workaround, Lightning path
- Added `testing/usage.md` with quick start, account indices, Lightning, utility imports
- Added `testing/how_to_run.md` with submodule clone, patches, RN example caveats
- Added `testing/how_to_test.md` documenting Jest setup, the missing `setup.ts` issue, recommended manual loop
- Added `testing/troubleshooting.md` covering placeholder fees, BIP21 routing, patch drift, balance-on-Android workaround
- Added `testing/api-reference.md` with WalletManagerArkade / WalletAccountArkade(ReadOnly) signatures and utility exports
- Added `sop/development-workflow.md` with branching, daily loop, submodule + patch workflow, PR hygiene
- Established sync tracking baseline (`change-log/last-sync.txt`, `change-log/SYNC_HISTORY.md`)

**Notes**:
- Package version `0.1.0`, MIT, Node ESM (ES2022)
- Repo: `ArkLabsHQ/arkade-wdk`
- Three submodules tracked via patches: `pear-wrk-wdk`, `wdk-react-native-provider`, `wdk-starter-react-native`
- Dependencies: `@arkade-os/sdk` (^0.4.8), `@arkade-os/boltz-swap` (^0.3.6), `@tetherto/wdk-wallet` (^1.0.0-beta.5)
- Known issues at baseline:
  - `jest.config.js` references missing `src/__tests__/setup.ts` — `npm test` fails on config validation
  - `getFeeRates()` returns placeholder `0n`/`0n`
  - Lightning lifecycle helpers (waitForLightningPayment, getPendingLightning*, getSwapHistory, getLightning{Limits,Fees}) not implemented
  - `TransactionType.EMAIL` enum value present but not implemented
  - `sendTransaction` does not accept BIP21 URIs directly
  - `WalletAccountArkade.initialize()` is a no-op
  - Expo example does not yet route Bitcoin through `@arkade-os/wdk` by default
- Use `/update-project arkade-wdk` to sync after new commits
