# Documentation Sync History — Arkade WDK (@arkade-os/wdk)

## 2026-05-09 — v0.1.1: LNURL/Lightning-address routing, prod Boltz API, CI, npm release flow
**Previous Commit**: `c5f4bd978b6243eb0653d0c1aa8addda91db5923`
**Current Commit**: `b2c9f16edbe1f9321ae1286744f80c1c9648d5a7`
**Synced By**: /update-project arkade-wdk
**Status**: Updated

**Commits Analyzed** (7):
- `9203da1` fix: use prod Boltz API and code — switches default `swapProviderUrl` examples to `https://api.ark.boltz.exchange`, refactors test/patches to match
- `3cfd4f3` Update readme and test, obsolete LN code — clarifies that `getAddress()` returns the Ark address for **all** indices (including lightning) and that `swapProviderUrl` is optional; cleans stale README claims about shared SDK wallets
- `8125479` Version 0.1.1 — `package.json#version` bump
- `be36e9f` Add release instructions to README — manual `npm version` → `git push --tags` → `npm publish` flow
- `d8df95b` Implement LNURL payment routing — `TransactionType.EMAIL` is now wired through: `resolveDestination` consumes `decoded.lnurl` from BIP21, `detectTransactionType` recognises Lightning addresses and LNURLs, and `quoteSend` / `send` try `fetchArkAddress` for an Ark fast path before falling back to `fetchInvoice` + `arkadeSwaps.sendLightningPayment`
- `aeb8be6` Implement CI — replaces the previous stub `.github/workflows/ci.yml` with the real lint+test pipeline
- `3c47021` Address review — adds `EMAIL`-routing test cases in `phase-0.test.js` and tightens error wording in `send.js`

**Changes**:
- Bumped documented version `0.1.0` → `0.1.1` in `INDEX.md` (Quick Reference), `system/project_overview.md`, `testing/api-reference.md`, and `sop/development-workflow.md` (Release Cadence)
- **Feature**: documented LNURL / Lightning-address routing in `sendTransaction` / `quoteSendTransaction`:
  - Updated send-routing tables in `system/architecture.md`, `testing/api-reference.md` to describe the `EMAIL` path (LNURL `fetchArkAddress` fast path → BOLT11 fallback via `fetchInvoice` + `arkadeSwaps.sendLightningPayment`, requires positive amount, throws on amount mismatch)
  - Added LNURL/Lightning-address example to `testing/usage.md` "Pay BOLT11 / BIP21 / Lightning Address / LNURL"
  - Updated `system/project_overview.md` Core Features (`Destination Auto-Detection`, `LNURL / Lightning Address`) and Current Implementation Notes
  - Documented BIP21 LNURL fallback (`?lnurl=` parameter) and updated resolution priority to `lightning > ark > lnurl > bitcoin` in `system/architecture.md`, `system/project_overview.md`, `testing/usage.md`, `testing/api-reference.md`
  - Removed `TransactionType.EMAIL` from "Not Implemented" list in `testing/api-reference.md` and "Known Caveats" in `testing/usage.md`
- **Behaviour change**: documented that `getAddress()` now returns the Ark address for **all** indices including Lightning (was previously documented as `''`):
  - Updated Account Indices tables in `system/project_overview.md`, `testing/usage.md`, `testing/api-reference.md`
  - Updated `WalletAccountReadOnlyArkade` JSDoc/typed signature comment in `testing/api-reference.md`
- Master `docs/INDEX.md`:
  - Updated arkade-wdk Description (per-path BIP-86 SDK wallets instead of "single underlying SDK wallet")
  - Refreshed Key Capabilities to mention LNURL routing in `sendTransaction()` and replace the obsolete "single SDK wallet" note
  - Updated Triggers (added `lightning address routing`, `lnurl payment`, `lnurl routing`, `arkadeSwaps null`, `lnurl payment fails`, `amount mismatch lnurl`; dropped the obsolete `jest setup missing` and `arkadeLightning null` entries)
  - Removed `npm run build` from test_or_run triggers (no build step) and `apply-patches` (which is not the script name — it's `setup-dev.js`)
  - Corrected the patch-script reference (`scripts/setup-dev.js` applies; `scripts/generate-patches.js` regenerates)
- `sop/development-workflow.md`: rewrote "Release Cadence" with the now-documented manual flow (`npm version` → `git push --tags` → `npm publish`, `prepublishOnly` → `npm run build:types`, tarball contains `src/` + `types/` only)

**Notes**:
- The send pipeline's `EMAIL` path requires `swapProviderUrl` (otherwise `arkadeSwaps` is `null` and `_requireSwaps()` throws). It also requires a positive `value` — the helper `assertPositiveAmount` throws `Amount required for LNURL payment`.
- New unit tests in `src/__tests__/phase-0.test.js` cover: detect-type for LN addresses, BIP21 with `?lnurl=`, EMAIL routing through `fetchArkAddress` → SDK send, EMAIL routing through `fetchInvoice` → submarine swap, and amount-mismatch with the LNURL invoice.
- The `pear-wrk-wdk` submodule pin label was corrected (README shows it pinned at "one commit past `v1.0.0-beta.2`" at `ef7a951`, not `1.0.0-beta.4`); local docs already only reference the SHA `ef7a951` in `system/project_overview.md`, so no change was needed there.
- `--base HEAD` is no longer required when running `node scripts/generate-patches.js` — the script defaults to the parent's pinned SHA. `sop/development-workflow.md` already shows the bare invocation; no change required.
- CI is now a real workflow (`.github/workflows/ci.yml` carries lint + test only). No new doc surface is needed for CI in this sync — the SOP "Daily Loop" already lists `npm run lint` / `npm test` as the local equivalent.

---

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
