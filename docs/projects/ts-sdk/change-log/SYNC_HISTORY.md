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

---

## 2026-05-01 - Release 0.4.22 + regtest image bump
**Previous Commit**: `273496c2870312ca57339a665c12577a227c99b2`
**Current Commit**: `476421605df8bb8f2b4dbc7a61c37941e32947ac`
**Synced By**: /update-project ts-sdk
**Status**: Documentation refreshed for 0.4.22 release

**Commits Analyzed**:
- `4764216` update regtest image (#465)
- `2f8bcf8` chore: release 0.4.22

**Documentation Changes**:
- Bumped SDK version 0.4.21 → 0.4.22 in `INDEX.md`, `system/project_overview.md`, master `docs/INDEX.md`

**Notable Source Changes (no architectural redesign)**:
- `package.json` version 0.4.21 → 0.4.22 (release commit only)
- `regtest` submodule pointer updated to `arkade-regtest` master (`3ac33b6`)
- `.env.regtest` overrides realigned for newer arkd 0.9.4 image:
  - `ARKD_IMAGE` / `ARKD_WALLET_IMAGE` → `v0.9.4` (was `v0.9.1`)
  - Removed `ARKD_ALLOW_CSV_BLOCK_TYPE`, `ARKD_BOARDING_EXIT_DELAY=1024`, `ARKD_ROUND_INTERVAL=3`
  - Added `ARKD_BOARDING_EXIT_DELAY=40`, `ARKD_CHECKPOINT_EXIT_DELAY=20`, `ARKD_UNILATERAL_EXIT_DELAY=20`, `ARKD_PUBLIC_UNILATERAL_EXIT_DELAY=20`, `ARKD_VTXO_MIN_AMOUNT=1`

**Notes**:
- No SDK source code changes — release-only commit plus regtest harness alignment
- No public API, architecture, or feature changes; storage/provider/identity layers untouched
- Existing usage, testing, and how-to-run docs remain accurate (regtest stack still launches via `nigiri start --ark` / docker-compose)

---

## 2026-05-02 - HD descriptor provider stack + Electrum onchain provider hardening
**Previous Commit**: `476421605df8bb8f2b4dbc7a61c37941e32947ac`
**Current Commit**: `a0fab06e39245e511dc0cccfeb3ea9c35bf024e8`
**Synced By**: /update-project ts-sdk
**Status**: Documentation refreshed for HD descriptor provider work and Electrum provider hardening (no version bump — package.json still 0.4.22)

**Commits Analyzed**:
- `a0fab06` feat(wallet): HDDescriptorProvider (Phase C1) (#440)
- `f705353` test(e2e): integration tests for ElectrumOnchainProvider over regtest (#461)
- `37d03e0` feat(identity): HD wallet primitives on SeedIdentity (#439)

**Documentation Changes**:
- `system/architecture.md`: added `wallet/hdDescriptorProvider.ts` and the new `identity/` files (`hdCapableIdentity.ts`, `descriptor.ts`, `descriptorProvider.ts`, `staticDescriptorProvider.ts`, `serialize.ts`); added `providers/electrum.ts`; rewrote the Identity Abstraction section to explain wildcard-template inputs and added a new Descriptor Provider Pattern section; added `@bitcoinerlab/descriptors-scure` and `ws-electrumx-client` to the crypto/dep table
- `system/project_overview.md`: extended Core Features with descriptor providers and HD receive rotation; added Electrum integration point and noted default URL maps for Esplora and Electrum
- `INDEX.md`: added Descriptor Providers tier in the architecture diagram; added `ElectrumOnchainProvider` next to `EsploraProvider`; updated Key Concepts to mention template-based identities and the descriptor provider allocator
- `testing/usage.md`: added HD Receive Rotation example using `HDDescriptorProvider.create` and an Onchain Providers section showing `EsploraProvider` vs `ElectrumOnchainProvider` with default URL constants
- `testing/how_to_test.md`: noted the new `e2e/electrum.test.ts` alongside `e2e/onchain.test.ts`
- Master `docs/INDEX.md`: expanded ts-sdk capabilities (template-based HD identity, DescriptorProvider allocator with HD/static implementations, ElectrumOnchainProvider with broadcast_package/electrs notes, default endpoint maps); added tags `hd-wallet`, `descriptor-provider`, `electrum`, `esplora`

**Notable Source Changes**:
- `DescriptorProvider` (in `src/identity/descriptorProvider.ts`) is now a pure allocator: `getNextSigningDescriptor(): Promise<string>` plus `isOurs` / `signWithDescriptor` / `signMessageWithDescriptor`. No "current" read accessor — that lives on the contract repository
- `StaticDescriptorProvider` wraps a legacy `Identity` for single-key flows; `HDDescriptorProvider` (in `src/wallet/hdDescriptorProvider.ts`) handles HD receive rotation. State is `{ descriptor, lastIndexUsed }` under `WalletState.settings.hd`; index allocation happens inside the per-repo `updateWalletState` mutex so two provider instances on the same repo never observe the same index. First allocation returns index 0; descriptor-mismatch guard refuses HD state written by a different seed
- New `HDCapableIdentity` / `ReadonlyHDCapableIdentity` capability markers (`src/identity/hdCapableIdentity.ts`); `SeedIdentity` `implements HDCapableIdentity` and no longer `implements DescriptorProvider`. `MnemonicIdentity` extends `SeedIdentity`; `ReadonlyDescriptorIdentity` `implements ReadonlyHDCapableIdentity`
- **Public surface change**: identities now consume a wildcard descriptor template (`tr(.../0/*)`); `identity.descriptor` returns the template (was the index-0 materialization). The wire format also stores the template, but `hydrateIdentity` chops back via `templateOf` so older envelopes carrying concrete `/N)` descriptors still deserialize. Constructors validate the template and reject non-wildcard inputs
- Shared descriptor helpers in `src/identity/descriptor.ts` (`isMainnetDescriptor`, `descriptorIsOurs`, `parseHDDescriptor`, etc.) — most thin wrappers were eventually inlined onto `expand()` / `canonicalExpression` / `isRanged` from `@bitcoinerlab/descriptors-scure`, which now does wildcard substitution, BIP86 template construction (`scriptExpressions.trBIP32`), and ranged/non-ranged classification natively
- `ElectrumOnchainProvider` (`src/providers/electrum.ts`) hardened for cross-server compatibility: dropped `verbose` `transaction.get` (electrs unsupported), uses raw-tx parsing for exact sat outputs, adopts `WsElectrumChainSource.safeBatchRequest` everywhere to avoid the orphan-rejection leak in `ws-electrumx-client.batchRequest`, and tolerates electrs's "missingheight" index-lag race in `historyToExplorerTxs`, `getTxStatus`, and `fetchTxMerkle` (block_time degrades to 0 in that window; confirmation status is still authoritative)
- New default URL maps exported from the SDK barrel: `ESPLORA_URL` (Ark Labs mempool: `mempool.arkade.sh`, `mempool.signet.arkade.sh`, `mempool.mutinynet.arkade.sh`), `ELECTRUM_WS_URL` (Ark Labs Fulcrum 2.1 with `broadcast_package` support for bitcoin/signet/mutinynet; testnet → Blockstream; regtest → `ws://localhost:50003`), `ELECTRUM_TCP_HOST` (informational, ports 50001/50002/50003)
- New `test/e2e/electrum.test.ts` covers every method on `OnchainProvider` against nigiri's electrum-ws bridge (port 50003); regtest submodule pin temporarily points at `arkade-regtest#12` (NIGIRI_BRANCH=electrum-ws-bridge) until that PR merges; unit suite up to 1024 passing with 49 electrum tests

**Notes**:
- No package version bump (still `0.4.22`); no public-facing rename of identity options — `DescriptorOptions` and `ReadonlyDescriptorIdentity.fromDescriptor` retained their pre-existing names
- The semantic shift (identities now hold a *template*, not a concrete descriptor) is a breaking constructor-input change but the field name stayed the same

---

## 2026-05-04 - Default to bitcoin mainnet + arkade.computer
**Previous Commit**: `a0fab06e39245e511dc0cccfeb3ea9c35bf024e8`
**Current Commit**: `0b45841414d8ef8c969af34523ca20365b77ee83`
**Synced By**: /update-project ts-sdk
**Status**: Documentation refreshed for mainnet-default UX change (no version bump — still 0.4.22)

**Commits Analyzed**:
- `0b45841` feat: default to bitcoin mainnet + arkade.computer (#460)

**Documentation Changes**:
- `system/project_overview.md`: added a "Mainnet Defaults" row to the Core Features table covering `DEFAULT_ARKADE_SERVER_URL`, `DEFAULT_ARKADE_HRP`, `DEFAULT_NETWORK_NAME`, and the `getArkadeServerUrl` helper
- `INDEX.md`: added a Key Concepts entry describing the mainnet-default behavior across `Wallet.create`, `ReadonlyWallet.create`, `ServiceWorkerWallet.create`, `OnchainWallet.create`, `ArkAddress`, and `contractFromArkContractWithAddress`
- `testing/usage.md`: simplified the basic Quick Start, Watch-Only, and Service Worker examples to omit `arkServerUrl` (mainnet default); added an `OnchainWallet (Mainnet Default)` snippet showing the optional `networkName`; kept an explicit mutinynet override example
- Master `docs/INDEX.md`: added Mainnet Defaults capability bullet and `mainnet-default` tag for `ts-sdk`

**Notable Source Changes**:
- New constants exported from `src/wallet/index.ts`: `DEFAULT_ARKADE_SERVER_URL = "https://arkade.computer"`, `DEFAULT_ARKADE_HRP = "ark"`, `DEFAULT_NETWORK_NAME = "bitcoin"`
- New helper `getArkadeServerUrl({ arkServerUrl })` exported from `src/wallet/wallet.ts` — returns `arkServerUrl || DEFAULT_ARKADE_SERVER_URL`
- `Wallet.create` / `ReadonlyWallet.create`: dropped the `"Either arkProvider or arkServerUrl must be provided"` throw; `RestArkProvider` now constructs from `getArkadeServerUrl(config)` when no provider/url is supplied
- `ServiceWorkerWallet.create` / `ServiceWorkerReadonlyWallet.create`: `arkServerUrl` parameter is now optional; both `INIT_WALLET` and `INITIALIZE_MESSAGE_BUS` payloads are routed through `getArkadeServerUrl(options)`
- `OnchainWallet.create(identity, networkName?)`: `networkName` now defaults to `DEFAULT_NETWORK_NAME` (`"bitcoin"`)
- `ArkAddress` constructor: `hrp` parameter defaulted to `DEFAULT_ARKADE_HRP` (`"ark"`)
- `contractFromArkContractWithAddress(encoded, serverPubKey, addressPrefix?)`: `addressPrefix` defaulted to `DEFAULT_ARKADE_HRP`
- New tests assert mainnet defaults for `ArkAddress`, `contractFromArkContractWithAddress`, `ReadonlyWallet.create`, `OnchainWallet.create`, `ServiceWorkerWallet.create`, and `ServiceWorkerReadonlyWallet.create`

**Notes**:
- Backwards compatible: explicit `arkServerUrl` / `networkName` / `hrp` arguments still work as before
- Architecture, module layout, provider/identity/storage patterns, and crypto stack are unchanged
- No package.json version bump; release-tagged 0.4.22 still applies

