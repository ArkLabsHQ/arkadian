# Documentation Sync History - Ark TypeScript SDK (@arkade-os/sdk)

## 2026-02-19 - Initial Documentation Setup
**Commit**: `539cc3490729ba2194672595fe0ef577dc730782`
**Synced By**: /add-project command
**Status**: Baseline established

**Changes**:
- Created project documentation structure
- Added system/project_overview.md with features, platforms, export paths
- Added system/architecture.md with module structure, design patterns, crypto deps
- Added system/integration-with-arkd.md documenting REST/SSE transport and settlement flow
- Added testing/usage.md with wallet creation, operations, storage adapters, service worker
- Added testing/how_to_run.md with nigiri/docker-compose setup, examples
- Added testing/how_to_test.md with vitest configuration, test structure, coverage
- Added testing/troubleshooting.md with crypto polyfill, SSE, service worker, VTXO issues
- Added sop/development-workflow.md with build, test, release workflow
- Established sync tracking baseline

**Notes**:
- SDK version 0.3.13 with dual ESM/CJS output
- 5 storage adapters (InMemory, localStorage, IndexedDB, FileSystem, AsyncStorage)
- Expo/React Native support with dedicated providers
- Service worker wallet for background operation
- Asset management (issue, reissue, burn, send)
- VTXO delegation to third-party delegator services
- Use `/update-project ts-sdk` to sync after new commits

---

## 2026-04-29 - Contract Watcher & SSE Refactor (v0.4.21)
**Previous Commit**: `e5e1bd996edb818116949f52fd70fcaedbe26bdf`
**Current Commit**: `273496c2870312ca57339a665c12577a227c99b2`
**Synced By**: /update-project ts-sdk
**Status**: Documentation refreshed to reflect 0.4.21 release

**Commits Analyzed**:
- `273496c` fix: ContractWatcher vtxo event + ContractVtxo type (#462)
- `a5dc8c4` fix: accept Expo SDK 55 unified versions in peer ranges (#463)
- `97cc402` chore: release 0.4.21
- `3661e7e` fix: share single SSE subscription between wallet and ContractWatcher (#457)
- `a86d2d0` Support hardcoded exit delay and arkd info when they differ (#456)
- `bb2bee8` fix(wallet): always init contract manager in script accessors (#459)

**Documentation Changes**:
- Bumped SDK version 0.3.13 → 0.4.21 in `INDEX.md`, `system/project_overview.md`, master `docs/INDEX.md`
- Noted Expo SDK 55 unified-major peer support in `system/project_overview.md`

**Notable Source Changes (no architectural redesign)**:
- `ContractVtxo` redefined as `VirtualCoin & Partial<TapLeaves & EncodedVtxoScript>` with `extraWitness` and `contractScript` — no longer extends `ExtendedVirtualCoin`
- `ContractWatcher` now extends raw VTXOs into contract-aware shape via `extendVirtualCoinForContract` before emitting `vtxo_received` / `vtxo_spent`
- Cold-start kick added in `tryUpdateSubscription` so the SSE listener opens promptly when the first contract is added after a zero-script `startWatching`
- `wallet.notifyIncomingFunds` no longer opens its own indexer subscription — piggybacks on the shared `ContractManager` event bus
- `DelegatorManager.delegate` filters out vtxos that don't have a delegate-type tap leaf (cannot be co-signed by the delegator) silently
- `getWalletScripts` / `getScriptMap` always go through `getContractManager` (drops fragile init-state guards), exposing historical default/delegate VTXOs to subscriptions and pending-tx flows on fresh wallets
- Wallet supports hardcoded exit delay and tolerates arkd info divergence

**Notes**:
- No new public APIs; all changes are internal refinements and bug fixes
- Architecture documentation unchanged (module structure, provider/identity/storage patterns are stable)
