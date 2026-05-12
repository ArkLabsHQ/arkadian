# Documentation Sync History — Arkade WDK (@arkade-os/wdk)

## 2026-05-12 — v0.1.2: README reframe (BIP-86 leaves, not roles), release flow uses `--no-git-tag-version`
**Previous Commit**: `cbd56b57c0f035e3813d31a374288b934bee8db5`
**Current Commit**: `519d9097d3692a23b04d51ed568e653c3832f124`
**Synced By**: /update-project arkade-wdk
**Status**: Updated

**Commits Analyzed** (4):
- `95d9b48` docs: refresh README to match current code — major doc reframe: (a) removed the `Utility Exports` section (BIP21/LNURL/BOLT11/fees/format helpers are **not** re-exported from `src/index.js` — only `WalletManagerArkade`, `WalletAccountArkade`, `WalletAccountReadOnlyArkade` are public); (b) reframed the Account Model — indices are BIP-86 path leaves (`m/86'/<coin>/0'/0/<index>`), not role identifiers; every account exposes Ark address, boarding address, and Lightning invoice creation from the same wallet, gated only by `swapProviderUrl`; (c) refreshed submodule pinning table (`pear-wrk-wdk` at one before `v2.0.0-beta.1` / `ed8cd00`, `wdk-react-native-provider` at one past `v1.0.0-beta.3` / `79462d4`, `wdk-starter-react-native` on `develop` / `f010fda`); (d) rewrote Releasing to use `scripts/release.js` via `npm run release` with `--no-git-tag-version` so the script can manage the tag without colliding; (e) added a CI section documenting `.github/workflows/ci.yml` and the Node 22 lint+test job; (f) added `path` and `index` to the `WalletAccountArkade` API reference and expanded Configuration with `arkProvider`, `storage`, `swapRepository` plus the construction-time `getInfo` retry / 30s wallet-create timeout behaviour; (g) trimmed Current Status
- `3e35622` Minor amendments — small README polish
- `542aaa8` Remove duplicated getTransactionHistory — README dedup
- `519d909` Version v0.1.2 — `package.json#version` bump `0.1.1` → `0.1.2`

**Changes**:
- Bumped documented version `0.1.1` → `0.1.2` in `INDEX.md` (Quick Reference), `system/project_overview.md`, `testing/api-reference.md`, and `sop/development-workflow.md` (Release Cadence)
- **Reframe — Account Model**: indices are BIP-86 path leaves, not roles. Every account exposes Ark address / boarding address / Lightning invoice creation (the last gated on `swapProviderUrl`). Updated:
  - `INDEX.md`: replaced the "Account Index Model" block in the architecture diagram and the "Account index" bullet in Key Concepts
  - `system/project_overview.md`: rewrote the Account Model section to describe surfaces instead of per-index roles; rephrased the Core Features capability ("Three Account Indices" → "Per-Index BIP-86 Wallets")
  - `testing/api-reference.md`: replaced the `getAccount(index)` role-table with a BIP-86 path explanation; replaced the `getAddress()` per-index table with "always returns the Ark address"
  - `testing/usage.md`: replaced the "Account Indices" role-table with an "Accounts and Receive Surfaces" section; rewrote the Lightning Invoices example to use a generic `account` (no dedicated "lightning" index) and updated the Lightning Lifecycle snippet to match
- **Release flow**: `sop/development-workflow.md` Quick path now shows `npm version --no-git-tag-version patch` followed by an explicit `git commit -am "Bump version"` + `git push`, plus a note in the Manual path warning that plain `npm version` collides with `scripts/release.js` (which creates the tag itself)
- Master `docs/INDEX.md`:
  - Updated arkade-wdk Description (version `0.1.2`; reframed three-account model wording to "per-index BIP-86 wallets, every account exposes Ark / boarding / Lightning surfaces")
  - Refreshed Key Capabilities: "Three-account model (boarding/offchain/lightning)" → "Per-index BIP-86 wallets … every account exposes `getAddress()` (Ark address — always), `getBoardingAddress()`, and `createLightningInvoice()` (gated on `swapProviderUrl`)"; also added `getFeeRates` to the `WalletManagerArkade` capability bullet

**Notes**:
- Only `README.md` and `package.json` / `package-lock.json` changed in the working tree. The source code under `src/` was unchanged in this window — the README reframe was a documentation correction, not a behaviour change. Local docs that previously echoed the old README's role-based account model (boarding/offchain/lightning) were stale and have been corrected.
- The `lib/*` helpers were already documented as internal in `system/architecture.md`, `system/project_overview.md`, `testing/api-reference.md`, and `testing/usage.md` (the previous sync had already moved them to the "internal" surface) — no further changes needed for the README's `Utility Exports` removal.
- Submodule pin SHAs (`ed8cd00`, `79462d4`, `f010fda`) are documented only in the upstream `README.md`. Local docs (`system/project_overview.md` Submodules table, `system/architecture.md` Repository Layout) reference the submodule paths without specific SHAs, so no change was required there — run `git submodule status` to confirm pins.
- Dependency pins (`@arkade-os/sdk@0.4.25`, `@arkade-os/boltz-swap@0.3.29`, `@tetherto/wdk-wallet ^1.0.0-beta.5`) are unchanged in this window.

---

## 2026-05-11 — `npm run release` script, RN-side `swapProviderUrl` wiring, upstream Boltz URL alignment
**Previous Commit**: `b2c9f16edbe1f9321ae1286744f80c1c9648d5a7`
**Current Commit**: `cbd56b57c0f035e3813d31a374288b934bee8db5`
**Synced By**: /update-project arkade-wdk
**Status**: Updated

**Commits Analyzed** (4):
- `25ac39a` Add release script — adds `scripts/release.js` and the `npm run release` script; reads `package.json#version`, refuses to proceed if `v${version}` already exists, then runs `git tag v${version}` → `npm publish` → `git push origin v${version}` and rolls back the local tag on publish failure
- `775c92b` Upgrade ts-sdk 0.4.26 - boltz-swap 0.3.30 — bumped `@arkade-os/sdk` and `@arkade-os/boltz-swap` pins
- `2d7263d` Rollback upgrade - lint issues — reverted the bump back to `@arkade-os/sdk@0.4.25` / `@arkade-os/boltz-swap@0.3.29`. Net: no dependency change in this sync window
- `7eb1607` Add swapProviderUrl to arkade config for Lightning support — adds `swapProviderUrl?: string` to `BitcoinArkadeChainConfig` in the `wdk-react-native-provider` patch, adds `EXPO_PUBLIC_BOLTZ_SWAP_URL` to the starter app's `.env.example` and wires it into `get-chains-config.ts`, deletes the obsolete `patches/pear-wrk-wdk.patch` (588 lines, no longer needed), and switches the README `swapProviderUrl` example from `https://api.ark.boltz.exchange` to `https://api.boltz.exchange`

**Changes**:
- `sop/development-workflow.md`: rewrote "Release Cadence" to document the new `scripts/release.js` quick path (`npm run release` performs tag → `npm publish` → push tag, with tag cleanup on `npm publish` failure) and kept the manual `npm version` flow as the equivalent path
- `INDEX.md` (project): added `release: "npm run release"` to the scripts block
- `testing/usage.md` and `system/architecture.md`: updated `swapProviderUrl` example URL from `https://api.ark.boltz.exchange` → `https://api.boltz.exchange` to match the upstream Boltz prod API the README now points at (both the quick-start `WdkManager.registerWallet` snippet and the `ArkadeWalletConfig` example)
- Master `docs/INDEX.md`:
  - Refreshed Key Capabilities to (a) call out the canonical Boltz API URL `https://api.boltz.exchange` alongside the `referralId`, (b) mention the new RN provider `BitcoinArkadeChainConfig.swapProviderUrl?` + `EXPO_PUBLIC_BOLTZ_SWAP_URL` env var, and (c) add a bullet for the `npm run release` script
  - Extended `test_or_run` triggers with `npm run release`, `release script`, and `EXPO_PUBLIC_BOLTZ_SWAP_URL`

**Notes**:
- The reverted dependency bump means `@arkade-os/sdk@0.4.25` and `@arkade-os/boltz-swap@0.3.29` remain the live pins. No doc surface needed updating for that — the rollback restored the previously documented state.
- `patches/pear-wrk-wdk.patch` was deleted in `7eb1607`. The `system/project_overview.md` Submodules table still lists `packages/pear-wrk-wdk` (the submodule itself remains in the tree); only the local patch overlay is gone. The two remaining patches (`wdk-react-native-provider.patch`, `wdk-starter-react-native.patch`) are the only ones `scripts/setup-dev.js` applies now.
- The new RN provider `BitcoinArkadeChainConfig.swapProviderUrl?` field's doc-comment notes that when omitted, Lightning transactions throw `Lightning support not configured` — consistent with the adapter's existing `_requireSwaps()` behaviour already documented in `system/architecture.md` and `testing/api-reference.md`.
- The release script does **not** bump `package.json#version` — operators are still expected to run `npm version <bump>` (or edit manually + commit) before invoking `npm run release`.

---

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
