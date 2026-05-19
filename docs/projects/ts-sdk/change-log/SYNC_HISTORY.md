# Documentation Sync History - Ark TypeScript SDK (@arkade-os/sdk)

## 2026-05-18 - Release 0.4.27 (version bump only)
**From**: `d663d158bdf90354a15fd6878c482026f40ea2a0`
**To**: `07785478edf31f2d0683f5664c1b5aa002d9eb6e`
**Synced By**: update-project skill
**Status**: Documentation refreshed for 0.4.27 release — package.json-only bump, no source changes

**Commits analyzed** (1 non-merge commit):
- `0778547` chore: release 0.4.27 — `package.json` `version` 0.4.26 → 0.4.27 (single-line change, no other files touched)

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — Quick Reference `Version` row 0.4.26 → 0.4.27
- `docs/projects/ts-sdk/system/project_overview.md` — Package block `Version` 0.4.26 → 0.4.27
- `docs/INDEX.md` — ts-sdk status row leads with `v0.4.27` (was `v0.4.26`); reframed the previously "post-0.4.26" feature paragraph as the 0.4.27 release contents (package.json-only bump, no source changes since 0.4.26)

**Notes**:
- Pure release-tag commit: only `package.json` `"version"` changed (0.4.26 → 0.4.27), no source / scripts / docs / tests / lockfile touched
- All public surface descriptions in master `docs/INDEX.md` (the long ts-sdk status row covering `ExtendedContractVtxo`, `ContractWatcher` extend-path typing, `DelegatorManager.delegate` `isAnnotated` guard, `extractArkProviderUrl`, HD receive rotation via `WalletReceiveRotator`, `InputSignerRouter`, `WalletConfig.walletMode`, `ServiceWorkerWalletMode`, baseline multi-timelock anchoring, exponential rotate backoff, `NonRangeableDescriptorError`, signing-router typed errors, `Wallet.offchainTapscript` getter, `isHDCapableIdentity`, `prepareUnrollTransaction` fee-rate ceiling, ESM `.d.ts` import rewrites, `as const` defaults, Tier 2 ownership gating, asset bigint amounts, etc.) carry forward unchanged — those features are already in the SDK; this commit just stamps the published version that contains them
- No new tags, capabilities, dependencies, or correlation rows needed for the master index

---

## 2026-05-16 - HD Receive Rotation Re-Merged (#489) + Regtest Submodule Bump (#490)
**From**: `9e53c73a520e3e39ca826d6914fc2a80af8d8cc5`
**To**: `d663d158bdf90354a15fd6878c482026f40ea2a0`
**Synced By**: update-project skill
**Status**: HD receive rotation re-introduced after the #488 revert; signing pipeline reorganised around per-input dispatch

**Commits analyzed** (2 non-merge commits):
- `d663d15` feat(wallet): HD receive rotation via contract repository (reopen of #473) (#489) — bundle of ~25 commits squashed in. Adds `src/wallet/walletReceiveRotator.ts` (~772 lines) owning the `DescriptorProvider`, `vtxo_received` subscription, rotation chain mutex, boot pubkey lookup, contract registration on rotate, exponential backoff (1s → 60s cap) on rotate failures, pluggable `Logger`, and the `NonRangeableDescriptorError` typed fallback signal. `HDDescriptorProvider` now also implements `ReceiveRotatorFactory` (`createReceiveRotator` → `WalletReceiveRotator.defaultBoot`) and exposes `getCurrentSigningDescriptor()`. Adds `src/wallet/inputSignerRouter.ts` to dispatch PSBT inputs to `DescriptorProvider.signWithDescriptor` (rotated `default`/`delegate` contracts using `metadata.signingDescriptor`) or `Identity` (baseline / other / boarding); adds `src/wallet/signingErrors.ts` (`DescriptorSigningProviderMissingError`, `MissingSigningDescriptorError`) re-exported from the package root. `WalletConfig.walletMode: 'auto' \| 'static' \| 'hd' \| DescriptorProvider` (default `'auto'` currently behaves like `'static'` — `TODO(hd-maturation)`). `ServiceWorkerWalletMode = 'auto' \| 'static' \| 'hd'` forwarded through `MessageBus`. `isHDCapableIdentity()` structural type guard added (re-exported from identity barrel). The four descriptor-aware identity methods (`isOurs` / `signWithDescriptor` / `signMessageWithDescriptor`) marked `@deprecated`. `Wallet.offchainTapscript` becomes a getter over a `protected` backing field; only sanctioned writer is `setOffchainTapscriptForRotation` (`@internal`, on `RotatableWallet`). Baseline multi-timelock matrix anchored to `identity.xOnlyPublicKey()` (index 0) on every boot regardless of rotation state. Snapshot `offchainTapscript` synchronously at `_txLock` entry in `_sendImpl` / `sendBitcoin` / `updateDbAfterOffchainTx` to close a rotation/transaction race. `prepareUnrollTransaction` `Math.ceil`s `feeRate` before `BigInt(...)` (fractional sat/vB from Esplora / bitcoind regtest no longer throws `RangeError`).
- `f20b671` Upgrade regtest to master (#490) — `regtest` submodule bumped.

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — Architecture Overview gains `WalletReceiveRotator` + `InputSignerRouter` rows; Key Concepts gain Descriptor Provider ReceiveRotatorFactory note + new HD Receive Rotation, WalletMode, Signing Router sections
- `docs/projects/ts-sdk/system/project_overview.md` — Core Features table refreshed: HD Identity adds the `isHDCapableIdentity` guard, Descriptor Providers adds the opt-in `ReceiveRotatorFactory`, HD Receive Rotation rewritten around the rotator, new Wallet Mode + Per-Input Signing Router rows; Unilateral Exit notes the `Math.ceil(feeRate)` fix
- `docs/projects/ts-sdk/system/architecture.md` — module tree adds `walletReceiveRotator.ts`, `inputSignerRouter.ts`, `signingErrors.ts`; `hdDescriptorProvider.ts`, `hdCapableIdentity.ts`, `wallet.ts`, `unroll.ts` notes updated; new "Receive Rotation Pattern" + "Per-Input Signing Dispatch" sections under Design Patterns
- `docs/INDEX.md` — ts-sdk Key Capabilities + Tags refreshed (`hd-receive-rotation`, `wallet-receive-rotator`, `input-signer-router`, `wallet-mode` added); Active Dev row updated — HD rotation no longer described as reverted, now describes the re-merge in #489 with full mechanism summary

---

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

---

## 2026-05-05 - Release 0.4.23: bigint asset amounts (breaking) + anchor/sequence helper exports
**Previous Commit**: `0b45841414d8ef8c969af34523ca20365b77ee83`
**Current Commit**: `d0ee956e80acc68d61eb0e274e896da0845d0d51`
**Synced By**: /update-project ts-sdk
**Status**: Documentation refreshed for 0.4.23 release

**Commits Analyzed**:
- `d0ee956` chore: release 0.4.23
- `d25866e` feat: export anchor helpers (#468)
- `36fa1b5` fix!: represent asset amounts as bigint (alt to #469) (#472)

**Documentation Changes**:
- Bumped SDK version 0.4.22 → 0.4.23 in `INDEX.md`, `system/project_overview.md`, master `docs/INDEX.md` (status table)
- `INDEX.md`: extended Assets Key Concept with the bigint type change + persistence note; added "Anchor / Sequence Helpers" Key Concept covering the new `TxWeightEstimator` / `VSize` / `timelockToSequence` / `sequenceToTimelock` exports
- `system/project_overview.md`: rewrote Asset Management Core Features row to call out the breaking bigint change and the new `serializeAssets` / `deserializeAssets` persistence path; added Anchor / Sequence Helpers Core Features row
- `system/architecture.md`: added `utils/txSizeEstimator.ts` and `repositories/serialization.ts` (with the new `SerializedAsset` / asset round-trip helpers) to the module layout
- `testing/usage.md`: rewrote the Asset Management snippet so all amounts are bigint literals (`1000n`, `100n`); added explanatory comment and reissue/burn examples for the new bigint API
- Master `docs/INDEX.md`: rewrote the Asset Management capability bullet for ts-sdk to flag the breaking change + persistence layer; added new "anchor / sequence helpers" capability bullet; added `bigint-assets` tag; expanded the project status row with the 0.4.23 highlights

**Notable Source Changes**:
- **Breaking** (`#472`): `Asset.amount` and `AssetDetails.supply` change from `number` to `bigint`; `IssuanceParams.amount`, `ReissuanceParams.amount`, and `BurnParams.amount` likewise switch to `bigint`. Reason: real-world asset supplies routinely exceed `Number.MAX_SAFE_INTEGER` (2^53 - 1) and silent truncation in arithmetic would corrupt balances. `Recipient.amount` (BTC sats) stays `number` — it's typed `number` everywhere
- Cascade across `providers/` (indexer, expoIndexer parse `BigInt(a.amount)` from JSON), `utils/transactionHistory.ts` (aggregation maps now `Map<string, bigint>` with `0n` neutral), `wallet/wallet.ts` (`getBalance`, `send` change-output accounting), `wallet/asset.ts` (greedy selection sort returns -1/0/1 from a bigint diff), `wallet/asset-manager.ts` (drops redundant `BigInt(...)` casts), `wallet/delegator.ts`, `wallet/validation.ts`, and `wallet/serviceWorker/wallet-message-handler.ts` (GET_BALANCE map switch)
- New `SerializedAsset = { assetId: string; amount: string }` type and `serializeAssets` / `deserializeAssets` helpers in `src/repositories/serialization.ts`. JSON.stringify cannot serialize bigint, so on-disk shape persists the amount as a decimal string. `deserializeAsset` accepts `string | number | bigint` so legacy on-disk data (number-shaped) round-trips without migration; an unsafe-integer guard rejects out-of-range legacy numbers with a re-sync hint
- Wired through SQLite (`src/repositories/sqlite/walletRepository.ts`), Realm (`src/repositories/realm/walletRepository.ts`), the legacy migration impl (`src/repositories/migrations/walletRepositoryImpl.ts`), and the `ArkTransaction` shape via new `serializeTransaction` / `deserializeTransaction` helpers — covers vtxos and transaction history alike
- New top-level exports from `src/index.ts` (`#468`): `TxWeightEstimator` and `VSize` type from `utils/txSizeEstimator.ts`; `timelockToSequence` and `sequenceToTimelock` from `contracts/handlers/helpers` (BIP68 sequence ↔ custom `RelativeTimelock` round-trip)
- Test fixture sweep: `test/e2e/ark.test.ts`, `test/transactionHistory.test.ts`, `test/sqlite-wallet-repository.test.ts`, `test/realm-wallet-repository.test.ts` — all asset-amount fixtures and assertions migrated to `Nn` literals; `IssuanceParams.amount` test-side variables (`issueAmount`, `reissueAmount`, `burnAmount`) likewise. e2e numeric literals in 12 specific call sites that flow into asset-amount params were fixed (test files are excluded from typecheck so the compiler couldn't catch them)
- Migration UX: TypeScript flags every existing `Asset.amount` / `AssetDetails.supply` / params arithmetic site at the call site, pointing callers at the change. Callers that genuinely need a `number` (e.g. for display) must call `Number(...)` explicitly when the value fits

**Notes**:
- Breaking change: any caller doing arithmetic on `asset.amount` / `assetDetails.supply` as a number will now get a TS error and must migrate to bigint (or coerce explicitly with `Number(...)` when safe). Persistence is forward + backward compatible — no data migration step needed
- Architecture, module layout, provider/identity/storage patterns, and crypto stack are otherwise unchanged
- New helper exports are additive; no rename or removal in this release

---

## 2026-05-06 - BIP68 helper consolidation + repo agent guides + refreshVtxos cursor fix
**Previous Commit**: `d0ee956e80acc68d61eb0e274e896da0845d0d51`
**Current Commit**: `b9f3466871f5ba1bb31b7f1d8cc99349ebb63227`
**Synced By**: /update-project ts-sdk
**Status**: Documentation refreshed for internal refactor + repo conventions (no version bump — still 0.4.23)

**Commits Analyzed**:
- `b9f3466` docs: add CLAUDE.md and AGENTS.md repo guides (#475) — split into `FOUNDATION.md` (canonical) + thin `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` pointers per Pietro's review; backfilled `CHANGELOG.md` for the 0.4.x line in the section-ordered, bolded-headline + root-cause style
- `bd748c3` fix(wallet): refreshVtxos() forwards an undefined window when no opts (#476)
- `0980a22` tests: enhance VHTLC test fixtures with comprehensive script information (#138)
- `7f59276` refactor(timelock): centralise BIP68 encode/decode helpers (#412)

**Documentation Changes**:
- `system/architecture.md`: added `utils/timelock.ts` to the module map (centralized BIP68 helpers — single `bip68` import site; consumers `script/base.ts`, `script/tapscript.ts`, `utils/unknownFields.ts`, `wallet/wallet.ts`, `wallet/unroll.ts`)
- `sop/development-workflow.md`: added "Repo Guide Files" section pointing to `FOUNDATION.md` (canonical) + `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` (thin pointers via the `@<file>` include directive); added "CHANGELOG Discipline" subsection under Releasing describing the section-ordered, root-cause entry style
- Master `docs/INDEX.md`: not changed — capabilities, tags, dependencies, and 0.4.23 status row remain accurate (this sync is internal refactor + docs only; no public surface change)

**Notable Source Changes**:
- **Refactor (`#412`)**: `timelockToSequence` and `sequenceToTimelock` moved from `src/contracts/handlers/helpers.ts` → `src/utils/timelock.ts` (now the single `bip68` import site in the SDK). Public surface unchanged: both helpers are still re-exported from the package root via `src/index.ts` (just imported from a different internal path). Inline `bip68.encode` / `bip68.decode` call sites in `src/script/base.ts` (`getSequence`), `src/script/tapscript.ts` (`CSVMultisigTapscript.encode` / `decode`), `src/utils/unknownFields.ts` (`VtxoTreeExpiry`), `src/wallet/wallet.ts`, and `src/wallet/unroll.ts` collapsed to use the centralized helpers. Removes the inline `RelativeTimelock` ↔ `bip68` adapter blocks that had been copy-pasted across these modules
- **Bug fix (`#476`)**: `ContractManager.refreshVtxos()` previously forwarded `window: { after: undefined, before: undefined }` even when the caller supplied no options. That truthy-but-empty object short-circuited two things in `syncContracts`: (a) the `options.window ?? computeSyncWindow(cursor)` fallback didn't fire, so the indexer query ran without an `after` filter (every refresh became an unbounded full re-scan); (b) `mustUpdateCursor` requires `options.window === undefined`, which was always false — so the cursor never advanced. Symptom in the wild: a 60-second loop where the auto-settle `pollIntervalMs` would fire, get a 400 `VTXO_ALREADY_SPENT`, fall back to `maybeRefreshAfterVtxoSpent` → `refreshVtxos()`, and download ~2 MB of VTXO history while leaving the cursor pinned. Fix: forward `window` only when at least one of `after` / `before` is supplied. Two regression tests in `test/contracts/manager.test.ts` cover both branches (no-opts must produce a cursor-derived delta query AND advance the cursor; caller-supplied window must NOT advance the cursor)
- **Test fixtures (`#138`)**: `test/fixtures/vhtlc.json` now carries complete `scripts` / `taproot` blocks per receiver-side combination, asserted live against the current `VHTLC.Script` output in `test/vhtlc.test.ts`. Useful as test vectors when another implementation (e.g. rust-sdk) verifies its scripts match. No standalone generator script is committed — the live assertion is the only thing keeping the fixture honest
- **Repo guides (`#475`)**: added `FOUNDATION.md` (canonical agent doc — recurring workflow, `pnpm release` conventions, CHANGELOG format, PR/commit conventions, directory map) and thin `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` pointer files. The Claude Code `@<file>` include directive is also surfaced as a plain reference by Codex / Gemini. `.gitignore` no longer ignores `CLAUDE.md` (the previously-blanket "AI" block was tightened); `TASKS.md` / `*.agents.md` / `REVIEW.md` remain ignored. `CHANGELOG.md` was backfilled for 0.4.0 → 0.4.23 in the new section-ordered, bolded-headline + root-cause style; pre-0.4 history is intentionally left in `git log`

**Notes**:
- No package version bump (still `0.4.23`); no public API additions, removals, or renames
- Architecture, module layout, provider/identity/storage patterns, and crypto stack are otherwise unchanged
- The BIP68 refactor is a pure internal cleanup: external callers continue to import `timelockToSequence` / `sequenceToTimelock` from `@arkade-os/sdk` exactly as before

---

## 2026-05-07 - Release 0.4.24 + Unilateral Exit Bundle + VTXO Reconciliation + Ownership Gating
**Previous Commit**: `b9f3466871f5ba1bb31b7f1d8cc99349ebb63227`
**Current Commit**: `cf09b7277d04c5e68831100f7795d2d356c35ae9`
**Synced By**: /update-project ts-sdk
**Status**: Documentation refreshed for 0.4.24 release

**Commits Analyzed**:
- `cf09b72` fix(wallet): pre-flight VTXO outpoints before settle (proactive) (#478)
- `8d3e773` fix(wallet): reconcile VTXO_ALREADY_SPENT by outpoint, not full re-scan (#477)
- `cdc10fd` chore: release 0.4.24
- `32c4b73` fix(vtxo): gate persisted VTXOs by owning script (Tier 1 of #480) (#481)
- `6d0b53f` Unilateral exit bundle (#338 + #222 + #416) (#479)

**Documentation Changes**:
- Bumped SDK version 0.4.23 → 0.4.24 in `INDEX.md`, `system/project_overview.md`, master `docs/INDEX.md`
- `INDEX.md`: extended VTXO concept to cover surgical `refreshOutpoints` reconciliation + `revalidateBeforeSettle` pre-flight; new "Ownership Gating" concept; unilateral exit concept now describes `prepareUnrollTransaction` / `completeUnroll` split, regtest network fix, and `isScriptValid === true` correctness
- `system/project_overview.md`: VTXO Operations row covers indexer-by-outpoint reconciliation, service-worker `REFRESH_OUTPOINTS` proxy, and pre-flight settle path; new "VTXO Ownership Gating" feature row; Unilateral Exit row covers split + regtest network arg + `isScriptValid` truthy bug
- `system/architecture.md`: added `contracts/` directory tree (`contractManager.ts`, `contractWatcher.ts`, `vtxoOwnership.ts`); annotated `wallet/wallet.ts`, `wallet/vtxo-manager.ts`, `wallet/unroll.ts`, `wallet/serviceWorker/wallet-message-handler.ts`, `script/base.ts`, `script/tapscript.ts` with the new behaviour

**Notable Source Changes**:
- **Unilateral exit bundle (`#479` = `#338` + `#222` + `#416`)**: per-namespace `isScriptValid` helpers returning `true | Error` (`script/tapscript.ts`); `getVerifyIndex` shared between condition tapscripts; `prepareUnrollTransaction` extracted from broadcast in `wallet/unroll.ts` so callers can build + sign without networking; new e2e coverage for `completeUnroll` after unilateral exit delay (`test/e2e/ark.test.ts`). Three latent bugs caught while wiring the e2e: (a) `VtxoScript.exitPaths` used a truthy check on `isScriptValid` but the helper now returns `true | Error` — `Error` objects are truthy, so non-CSV scripts (e.g. `ConditionCSVMultisig`) were routed to CSV's `decode()` and swallowed by the catch instead of falling through to the ConditionCSV branch; (b) `completeUnroll` called `tx.addOutputAddress(addr, value)` without a network arg — `@scure/btc-signer` defaults to mainnet base58 decoding, so regtest `bcrt1...` addresses threw `Unknown letter: "0"`; (c) the e2e's blocks-branch maturity wait used `nigiri rpc --generate` directly — esplora hadn't observed the mined tip yet, so `availableExitPath`'s chainTip read could still return the pre-mining tip (mirrored the seconds-branch `waitFor` chainTip loop)
- **VTXO ownership gating (`#481`, Tier 1 of `#480`)**: new `src/contracts/vtxoOwnership.ts` with helpers applied at every contract-scoped read/write site so legacy address buckets cannot leak wrong-script rows or win txid:vout dedup. Background sync writers warn-and-skip; user-initiated wallet write paths throw. `ContractWatcher.seedLastKnownVtxos` now reads through `getContractVtxos` (script-filtered) instead of the raw address bucket — prevents a phantom `vtxo_spent` event on the first poll when a legacy wrong-script row had been seeding the baseline. `wallet.notifyIncomingFunds` warns instead of silently dropping rows that arrive without `.script`. `updateDbAfterOffchainTx` and `updateDbAfterSettle` now group spent rows by owning script (using `annotateVtxos` script tags), validate per group, and route each bucket to its contract's address via `manager.getContracts()`; outer catches now rethrow rather than log-and-swallow (was masking failed saves). `getVtxosFromRepo` no longer silently sets `walletScript = undefined` on decode failure — fail-fast surfaces the structural bug instead of zeroing the user's visible balance
- **`VTXO_ALREADY_SPENT` reconciliation (`#477`)**: previous recovery was `refreshVtxos()` (cursor-derived `?after=created_at` filter) — couldn't surface a VTXO created before the cursor and spent recently. New `IContractManager.refreshOutpoints(outpoints)` queries the indexer by outpoint, annotates with the owning contract's tapscripts, and upserts at the contract's address; no cursor change, no full re-scan. New `maybeRefreshAfterVtxoSpent(spentOutpoint?)` parses the `metadata.vtxo_outpoint` field on the `ArkError` envelope and routes to `refreshOutpoints([outpoint])`; falls back to `refreshVtxos()` only when no outpoint metadata is available. Both `vtxo-manager` callsites (event-driven renewal + periodic settle) extract the outpoint before triggering recovery. Service-worker proxy: new `REFRESH_OUTPOINTS` message + handler so wallets running behind a worker get the same recovery
- **Pre-flight before settle (`#478`)**: closes the loop *before* the failed intent flies. `VtxoManager.revalidateBeforeSettle(candidates, threshold)` refreshes the candidate outpoints, re-pulls through `getExpiringVtxos`, then restricts to the original candidate set so a refresh side-effect cannot silently widen the input set. Wired into both settle entry points: `renewVtxos` (event-driven on `vtxo_received`) and `runPeriodicSettle` (boarding-poll auto-settle). Best-effort: a failed refresh falls back to the original candidates and lets `#477`'s reactive recovery handle whatever slipped through

**Tests Added**:
- `test/contracts/manager.test.ts`: three tests covering `refreshOutpoints` (happy path, silent skip for unowned scripts, no-op on empty input); ownership-gating tests for the wrong-script reject path; updated reconciliation tests acknowledge the extra pre-flight call before recovery
- `test/contracts/vtxoOwnership.test.ts`: dedicated coverage for `vtxoOwnership` helpers (90 lines)
- `test/contracts/helpers.ts`: shared script-aware test helpers
- `test/vtxo-manager.test.ts`: pre-flight ordering test ("pre-flight `refreshOutpoints` runs before settle on the periodic poll path"), pre-flight stale-drop test ("pre-flight drops candidates the indexer reports as spent and skips a fully-stale settle"), and `ArkError`-with-`vtxo_outpoint` routing tests; `flushMicrotasks` bumped from 2 awaits to 8 to drain the longer pre-flight chain
- `test/wallet.test.ts`: 411 lines of new coverage for per-script persistence in `updateDbAfterOffchainTx` / `updateDbAfterSettle` and the fail-fast `getVtxosFromRepo` decode path; existing tests that mocked `getAddress` with placeholder strings updated to use a real decodable test address
- `test/wallet-message-handler.test.ts` + `test/worker/expo/processors/contractPollProcessor.test.ts`: cover the `REFRESH_OUTPOINTS` message + the script-gated processor reads
- `test/e2e/ark.test.ts`: new "should complete unroll after unilateral exit delay" path

**Notes**:
- No new public exports beyond `IContractManager.refreshOutpoints` / `prepareUnrollTransaction`; module layout, provider/identity/storage patterns, and crypto stack are otherwise unchanged
- The ownership-gating change is data-correctness, not schema — no repository or storage migrations
- `wallet.network` is now mandatory at unroll time (regtest fix) but already present on every `Wallet` instance, so no caller-side change required
- Tier 1 of `#480` only — further tiers may follow

---

## 2026-05-08 - Release 0.4.25 + Tier 2 script-scoped repository methods
**Previous Commit**: `cf09b7277d04c5e68831100f7795d2d356c35ae9`
**Current Commit**: `2707b59d87df66f3ea5731150250895d6883e0ae`
**Synced By**: /update-project ts-sdk
**Status**: Documentation refreshed for 0.4.25 release

**Commits Analyzed**:
- `2707b59` chore: release 0.4.25
- `1727c7f` fix(vtxo): script-scoped repository methods across backends (Tier 2 of #480) (#482)

**Documentation Changes**:
- Bumped SDK version 0.4.24 → 0.4.25 in `INDEX.md`, `system/project_overview.md`, master `docs/INDEX.md` (status row)
- `INDEX.md`: extended Ownership Gating Key Concept with the Tier 2 dispatch (optional script-scoped methods, native backend implementations, `VtxoRepositoryKey`, fallback semantics)
- `system/project_overview.md`: extended VTXO Ownership Gating row with Tier 2 dispatch (optional `getVtxosForScript` / `saveVtxosForScript` / `deleteVtxosForScript`, native backend coverage, `VtxoRepositoryKey`)
- `system/architecture.md`: rewrote `repositories/walletRepository.ts` annotation to call out the Tier 2 optional methods, `VtxoRepositoryKey`, native backend implementations (IndexedDB script index + outpoint dedup, SQL `WHERE script = ?`, Realm `filtered`), and the re-thrown DB-error policy in `getVtxosForScript`; extended `contracts/vtxoOwnership.ts` annotation to describe the dispatch helpers (`getVtxosForContract` / `saveVtxosForContract`) and the call sites that adopt them (`wallet.ts`, `contractManager.ts`, `contractWatcher.ts`)
- Master `docs/INDEX.md`: extended ts-sdk VTXO ownership-gating capability bullet for Tier 2; rewrote the 0.4.25 status row to lead with Tier 2

**Notable Source Changes**:
- **Tier 2 ownership gating (`#482` = Tier 2 of `#480`)**: `WalletRepository` interface gains three optional methods — `getVtxosForScript(script)`, `saveVtxosForScript({ script, address? }, vtxos)`, `deleteVtxosForScript(script)` — plus a new `VtxoRepositoryKey` type (`{ script: string; address?: string }`, address still required by current backends). All SDK-shipped backends implement them natively:
  - `InMemoryWalletRepository`: scans every address bucket, applies `isVtxoForScript`, dedups by `${txid}:${vout}` (last-write-wins via `mergeByKey`)
  - `IndexedDBWalletRepository`: uses the `script` IDB index (`store.index("script").getAll(script)`) + a defensive script filter; outpoint dedup runs on the raw rows so the address tiebreaker (`shouldReplaceVtxo`) stays applicable; DB errors are now re-thrown rather than swallowed to `[]`
  - `SQLiteWalletRepository`: simple `WHERE script = ?` on the vtxos table for read/delete; save validates each VTXO with `isVtxoForScript` before delegating to `saveVtxos(address, vtxos)`
  - `RealmWalletRepository`: `realm.objects("ArkVtxo").filtered("script == $0", script)` for read/delete; same per-VTXO validation on save
- New dispatch helpers in `src/contracts/vtxoOwnership.ts`:
  - `getVtxosForContract(repo, contract)` calls `repo.getVtxosForScript?` if present, else falls back to `filterVtxosForScript(await repo.getVtxos(contract.address), contract.script)`
  - `saveVtxosForContract(repo, contract, vtxos)` calls `repo.saveVtxosForScript?` if present, else runs `validateVtxosForScript(...)` and delegates to `repo.saveVtxos(contract.address, vtxos)` (the validation is the bug fix from the "validate scripts in saveVtxosForContract fallback path" sub-commit — previously the fallback path could silently persist wrong-script rows)
- Adopted call sites:
  - `ContractManager.fetchContractVtxos` per-address upsert loop now finds the `Contract` and routes via `saveVtxosForContract`; previously could throw on `Map.get(...)!` for vtxos whose script wasn't in the contract set — the new loop `continue`s instead
  - `ContractManager.getContractVtxos` (read path uses `getVtxosForContract` instead of `getVtxos(address) + filterVtxosForScript` inline)
  - `ContractManager.reconcilePendingFrontier` and `fetchContractVxosFromIndexer` (both saves go through `saveVtxosForContract`)
  - `ContractWatcher.seedLastKnownVtxos` baseline (read goes through `getVtxosForContract`)
  - `Wallet.updateDbAfterOffchainTx` and `Wallet.updateDbAfterSettle` (per-script grouping now writes directly via `saveVtxosForContract` instead of building an intermediate `byAddress` map; change VTXOs route through the same helper)
  - `worker/expo/processors/contractPollProcessor.ts` (script-gated processor reads adopted)
- `.gitignore`: added `*.idb` (IndexedDB JSON dump artefacts from local development)

**Tests Added**:
- `test/repositories/walletRepository.test.ts`: +99 lines covering the new script-scoped methods at the interface level (the `each` matrix already runs every test against every backend)
- `test/sqlite-wallet-repository.test.ts`: +80 lines for the SQL-specific path
- `test/wallet.test.ts`: +53 lines / −23 lines covering the dispatch helper paths in `updateDbAfterOffchainTx` / `updateDbAfterSettle`

**Notes**:
- No breaking changes: the new repo methods are optional (`?:`), so external `WalletRepository` implementations that only support Tier 1 keep working through the address-bucket fallback (now with proactive script validation on save)
- No new public exports beyond the interface widening; module layout, provider/identity/storage patterns, and crypto stack are otherwise unchanged
- Tier 2 of `#480`; further tiers may follow

---

## 2026-05-13 - ContractWatcher follow-ups + `ExtendedContractVtxo` export + indexer URL deriving fix
**Previous Commit**: `0c7b4bb8fa2c792bee054a1f6114805e61122c58`
**Current Commit**: `9e53c73a520e3e39ca826d6914fc2a80af8d8cc5`
**Synced By**: /update-project ts-sdk
**Status**: Documentation refreshed for ContractWatcher follow-ups + type-cleanup pass (no version bump — still 0.4.26)

**Commits Analyzed**:
- `9e53c73` Revert "feat(wallet): HD receive rotation via contract repository (alt to #441) (#473)" (#488)
- `4eec112` feat(wallet): HD receive rotation via contract repository (alt to #441) (#473)
- `ab0c67e` fix: ContractWatcher follow-ups from #462 (#464)

**Net delta**: `4eec112` and `9e53c73` cancel out (HD receive rotation feature added then reverted same day). Only `ab0c67e` produces source changes in this range. No HD rotation work shipped; `src/wallet/hdDescriptorProvider.ts` and the surrounding descriptor-provider stack are unchanged from #440.

**Documentation Changes**:
- `system/architecture.md`: added `contracts/types.ts` to the contracts directory map (`ContractVtxo` vs new `ExtendedContractVtxo` split, the latter is the post-`annotateVtxos` shape used at save/forfeit sites); annotated `contractManager.ts` with the internal `ExtendedContractVtxo[]` return-type tightening; extended `contractWatcher.ts` annotation with the typed `ContractVtxo[]` accumulator + greppable extend-failure log (`txid:vout` + caught error); extended `wallet.ts` annotation with the new `extractArkProviderUrl(provider)` helper that derives the indexer URL from a custom `arkProvider`; annotated `wallet/delegator.ts` with the `isAnnotated` type-guard replacing the unsafe `as ExtendedVirtualCoin` cast in the `.delegate` filter
- `change-log/last-sync.txt`: bumped to `9e53c73`
- Master `docs/INDEX.md`: extended the ts-sdk status row with the new `ExtendedContractVtxo` public export, the ContractWatcher / Delegator type-safety hardening, and the indexer URL deriving fix

**Notable Source Changes (no public-API removal, no behaviour change beyond the indexer URL fix)**:
- **New public type `ExtendedContractVtxo`** (`src/contracts/types.ts`) — `ExtendedVirtualCoin & { contractScript: string }`. Mirrors the `ExtendedVirtualCoin` / `VirtualCoin` split: `ContractVtxo` carries `Partial<TapLeaves & EncodedVtxoScript>` (raw from indexer) while `ExtendedContractVtxo` narrows those fields to required, guaranteeing `annotateVtxos` has run. Exported from the package root via `src/index.ts`. `ContractWithVtxos.vtxos` retyped from `ContractVtxo[]` → `ExtendedContractVtxo[]` so callers can rely on taproot data being present
- **`ContractWatcher.extendVtxos`** (the internal helper inside the watcher loop): accumulator now typed `ContractVtxo[]` rather than untyped `[]` (compile-time drift catch on the extended shape); the catch branch now logs `failed to extend vtxo ${txid}:${vout}` plus the caught error so production grep can find both the offending vtxo and the underlying cause
- **`ContractManager` internal returns**: `getVtxosForContracts`, `fetchContractVtxosBulk`, and `fetchContractVxosFromIndexer` now return `Map<string, ExtendedContractVtxo[]>` (was `ContractVtxo[]`). Drops the `as ContractVtxo` cast in `getVtxosForContracts` and the corresponding casts in the bulk-fetch paths — the types now match what `annotateVtxos` actually returns. Pure cleanup, no behaviour change
- **`DelegatorManagerImpl.delegate`** (`src/wallet/delegator.ts`): the `eligible` filter dropped `.map((v) => v as ExtendedVirtualCoin)` in favour of a real type guard, `isAnnotated(v: ContractVtxo): v is ContractVtxo & ExtendedVirtualCoin`, which checks `tapTree !== undefined && forfeitTapLeafScript !== undefined && intentTapLeafScript !== undefined`. The filter now both verifies a delegate tap leaf exists AND that the vtxo is annotated — wrong-shape rows are silently dropped instead of being cast through to `makeDelegateForfeitTx` where they would have crashed downstream
- **`Wallet.create` / `ReadonlyWallet.create` indexer URL derivation** (`src/wallet/wallet.ts`): new private helper `extractArkProviderUrl(provider: ArkProvider): string | undefined` does a structural read of `provider.serverUrl` (the built-in `RestArkProvider` / `ExpoArkProvider` expose it; custom implementations may not). When a custom `arkProvider` is supplied without `arkServerUrl`, the indexer is now built from that same URL instead of silently falling back to `getArkadeServerUrl(config)` → `arkade.computer`. Behavioural fix: a wallet built on a custom mainnet/testnet arkd is no longer paired with the public default indexer. The old `(arkProvider as RestArkProvider).serverUrl` unsafe cast + `"Could not determine arkServerUrl from provider"` throw are gone; the new path uses `??` against `extractArkProviderUrl(arkProvider) ?? arkadeServerUrl`, so a custom arkProvider without a discoverable `serverUrl` falls back to the mainnet default rather than throwing
- **`README.md`** cleanup: `arkServerUrl: 'https://arkade.computer'` removed from every `Wallet.create` / `ReadonlyWallet.create` / `ServiceWorkerWallet.setup` snippet (mainnet-default UX from #460); now reads `await Wallet.create({ identity })` everywhere with an explicit "To use a different network, pass `arkServerUrl` option" callout

**Tests Added**:
- `test/contracts/watcher.test.ts`: +144 lines covering `emitVtxoEvent` via the public `listenLoop` / subscription iterator — (1) a delegate-contract subscription update yields a vtxo whose `tapTree` equals `DelegateVtxo.Script.encode()` and differs from the default tapscript, proving the delegate handler enriched it; (2) a contract type with no registered handler emits the raw vtxo with `contractScript` set and surfaces a `console.warn` carrying `txid:vout`

**Notes**:
- The HD-rotation revert (`#488`) means the previously-merged `walletReceiveRotator.ts`, `metadata.source = 'wallet-receive'` tagging, `walletMode` config, and `refreshVtxos({ includeInactive })` escape hatch are NOT in the SDK at HEAD. Existing wallets continue to use the static descriptor path from the boot — `HDDescriptorProvider` is still exported from #440 but is not wired into `Wallet.create` automatically
- No package version bump (still `0.4.26`); the only additive public surface change is the new `ExtendedContractVtxo` type export
- The indexer URL deriving fix is a behavioural change for callers who passed a custom `arkProvider` without an explicit `arkServerUrl`: their indexer URL now matches the arkd they pointed at, rather than the public default. Callers who relied on the implicit mainnet pairing should pass `arkServerUrl: 'https://arkade.computer'` explicitly
- Architecture, module layout, provider/identity/storage patterns, and crypto stack are otherwise unchanged

---

## 2026-05-09 - Release 0.4.26 (ESM-compatible declarations + typedoc polish)
**Previous Commit**: `2707b59d87df66f3ea5731150250895d6883e0ae`
**Current Commit**: `0c7b4bb8fa2c792bee054a1f6114805e61122c58`
**Synced By**: /update-project ts-sdk
**Status**: Documentation refreshed for 0.4.26 release

**Commits Analyzed**:
- `0c7b4bb` chore: release 0.4.26
- `b9a6d9b` chore: improve typedoc comments, use `as const` for default constants (#484)
- `bffa9be` fix(types): emit ESM-compatible declaration imports (#485)

**Documentation Changes**:
- Bumped SDK version 0.4.25 → 0.4.26 in `INDEX.md`, `system/project_overview.md`, master `docs/INDEX.md` (status row)
- Master `docs/INDEX.md`: extended ts-sdk status row with the 0.4.26 ESM `.d.ts` import-rewrite fix and the typedoc / `as const` defaults polish

**Notable Source Changes (no architectural redesign, no public-API surface change)**:
- `scripts/add-extensions.js`: declaration-emit pass now rewrites import specifiers in generated `.d.ts` files alongside `.js` files, so consumers under `"moduleResolution": "node16" / "bundler"` no longer hit `Cannot find module './foo'` errors when they typecheck against the published types. Touched call-sites: `src/extension/index.ts`, `src/script/delegate.ts`, `src/utils/transaction.ts`, `src/wallet/delegator.ts`, `src/wallet/utils.ts` (these are the imports the build script now consistently rewrites; runtime behaviour unchanged)
- `src/wallet/index.ts`: `DEFAULT_ARKADE_HRP` and `DEFAULT_NETWORK_NAME` now declared `as const` (matching the existing treatment of `DEFAULT_ARKADE_SERVER_URL`); typedoc on `VirtualCoin` reordered and clarified — `script` and `isUnrolled` are now described as positive-knowledge fields ("locking scriptPubKey", "broadcasted onchain via an unroll"), `isSpent` annotated as a boolean helper for `spentBy` that explicitly excludes unrolled/swept states
- `src/script/address.ts`: typedoc-only refinements (no behaviour change)

**Tests Added**: none (changes are typedoc / build-script / type-level only)

**Notes**:
- `scripts/add-extensions.js` is the build helper invoked after `tsc` to add explicit `.js` extensions to import paths so the published bundle works in strict ESM resolvers; the 0.4.26 fix extends the same rewrite to `.d.ts` files so types resolve identically
- No public API was added or removed; runtime semantics are unchanged
- Consumers seeing `TS2307: Cannot find module …` against `@arkade-os/sdk` types under `node16` / `bundler` resolution should upgrade to 0.4.26

