# Documentation Sync History - bluewallet

## 2026-05-06 - RN 0.85 New Architecture migration + SDK bumps
**Commit**: `f1b13271` (BlueWallet repository)
**Previous Sync**: `cce2f216`
**Synced By**: /update-project skill
**Status**: Documentation refreshed

**Commits Analyzed**: 45 commits across `cce2f216..f1b13271`

**Key Changes Captured**:
- **Runtime upgrade**: React Native 0.83 → **0.85.2** (two-step: RN 84 then RN 85), React pinned to **19.2.3**, codebase migrated to the **New Architecture** (Fabric + TurboModules)
- **Custom Fabric `SegmentedControl`**: in-house TurboModule under `ios/Components/SegmentedControl/` and `android/.../components/segmentedcontrol/`, with codegen spec `codegen/SegmentedControlNativeComponent.ts`, replacing the deprecated upstream module
- **Ark stack bumped**: `@arkade-os/sdk` 0.4.16 → **0.4.23**, `@arkade-os/boltz-swap` 0.3.17 → **0.3.26** (initial 0.4.18/0.3.19 bump shipped with a Realm migration and removal of the obsolete `_contractsLoaded` background init)
- **Ark integration refactor**: removed `blue_modules/arkade-adapters/realm/index.ts` re-export shim — `LightningArkWallet` now imports `RealmWalletRepository`/`RealmContractRepository`/`RealmSwapRepository` directly from the SDK packages; new `static onBeforeDelete()` cleanup hook + `deleteArkadeRealm()` helper; Realm files moved to `DocumentDirectoryPath`
- **Self-test fix**: self-test no longer stops the swap poller
- **Android 16kb page-size support** (Android 15 readiness)
- **Camera stack**: `react-native-camera-kit` switched from npm to a pinned GitHub commit
- **QR pipeline**: dropped `rn-qr-generator` dependency, refreshed QR rendering and app icons
- **UX polish**: header status pills, redesigned receive screen layout, cleaner transaction list, send-screen scroll/fee modal fixes, tooltip refactors, animation regressions fixed
- **Other dep bumps**: `react-native-svg` → 15.15.4, `react-native-gesture-handler` → 2.31.1
- **GHA**: bumped `actions/cache` digest

**Files Updated**:
- `docs/projects/bluewallet/INDEX.md` (frontmatter sync hash, SDK/Boltz versions, RN runtime note)
- `docs/projects/bluewallet/system/project_overview.md` (tech stack table: RN 0.85, SDK versions)
- `docs/projects/bluewallet/system/integration-with-arkd.md` (SDK versions, direct repo imports, `onBeforeDelete`/`deleteArkadeRealm`)
- `docs/projects/bluewallet/system/architecture.md` (custom SegmentedControl, 16kb page size, camerakit GitHub pin, New Architecture)
- `docs/INDEX.md` (master entry: description, tags, dependencies, correlation matrix, status table)
- `docs/projects/bluewallet/change-log/last-sync.txt`
- `docs/projects/bluewallet/change-log/SYNC_HISTORY.md`

**Notes**:
- No new top-level wallet types or API endpoints — changes are infrastructure-level (RN runtime, SDK bumps, native module modernization)
- No breaking changes to public wallet API surface; SDK bump migration is internal
- Detox/Jest test layouts unchanged

---

## 2026-04-30 - Initial Documentation Setup
**Commit**: `cce2f216` (BlueWallet repository)
**Previous Sync**: `(none - initial sync)`
**Synced By**: /add-project skill
**Status**: Baseline established

**Initial Files Created**:
- `docs/projects/bluewallet/INDEX.md`
- `docs/projects/bluewallet/system/project_overview.md`
- `docs/projects/bluewallet/system/architecture.md`
- `docs/projects/bluewallet/system/integration-with-arkd.md`
- `docs/projects/bluewallet/testing/usage.md`
- `docs/projects/bluewallet/testing/how_to_run.md`
- `docs/projects/bluewallet/testing/how_to_test.md`
- `docs/projects/bluewallet/testing/troubleshooting.md`
- `docs/projects/bluewallet/sop/development-workflow.md`
- `docs/projects/bluewallet/change-log/last-sync.txt`
- `docs/projects/bluewallet/change-log/SYNC_HISTORY.md`

**Master INDEX Updates**:
- Added `bluewallet` entry after `rust-sdk` in the Project Registry
- Updated Dependency Graph to include bluewallet under "Downstream consumers of @arkade-os/sdk"
- Added entry to Technology Groupings (Mobile / React Native + Bitcoin Wallet Apps)

**Notes**:
- BlueWallet is a popular open-source Bitcoin & Lightning wallet for iOS, Android, and macOS (via Mac Catalyst)
- Built with React Native and Electrum; package version 8.0.0; Node >= 20
- **Significant Ark integration**: dedicated `LightningArkWallet` class extending `LightningCustodianWallet`
- Uses `@arkade-os/sdk` 0.4.16 (with Expo adapters) and `@arkade-os/boltz-swap` 0.3.17
- Realm-backed repositories for Ark wallet, contract, and swap state
- Background swap reconciliation via custom queue + foreground polling fallback
- Default endpoints: `arkade.computer` (arkd), `delegate.arkade.money` (delegator), `api.ark.boltz.exchange` (Boltz)
- Repository env var: `${BLUEWALLET_REPO}` — not yet defined; recommend adding to local `.env`
- GitHub: `BlueWallet/BlueWallet`; Website: `bluewallet.io`; License: MIT
