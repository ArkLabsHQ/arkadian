# Documentation Sync History - Ark TypeScript SDK (@arkade-os/sdk)

## 2026-05-27 - Delegator → Delegate rename (#519) + AssetManager export + 0.4.29 release
**From**: `d682eac52d1fc7e92662a859cd69db5bd8bff156`
**To**: `45d639c820ae0cfb81bf25d70bea0cbaa1221e00`
**Synced By**: update-project skill
**Status**: Released cut — `@arkade-os/sdk` bumps `0.4.28 → 0.4.29` and `@arkade-os/boltz-swap` `0.3.33 → 0.3.34` (`pnpm run release -- all patch`). Headline ts-sdk change is the **delegator → delegate public-surface rename** (PR #519), shipped non-breaking via `@deprecated` aliases. Two small additive exports also landed: `AssetManager` / `ReadonlyAssetManager` from the SDK root, and `InMemorySwapRepository` from the boltz-swap root (the latter tracked under `docs/projects/boltz-swap/`).

**Commits analyzed** (8 non-merge commits):

*ts-sdk — additive root exports:*
- `33e23b3e` feat: export AssetManager — `AssetManager` + `ReadonlyAssetManager` (and the `IAssetManager` / `IReadonlyAssetManager` types) now re-exported from `src/index.ts`.

*ts-sdk — delegator → delegate rename (#519):*
- `4538f7fe` chore: rename delegator -> delegate — renames the public delegation surface across providers, wallet, service worker, and message bus. Files `src/providers/delegator.ts` → `delegate.ts` and `src/wallet/delegator.ts` → `delegate.ts`. New canonical exports `DelegateProvider`, `RestDelegateProvider`, `DelegateManagerImpl`, `IDelegateManager`, `DelegateNotConfiguredError`; the prior `Delegator*` names kept as `@deprecated` aliases. `IWallet.getDelegateManager()` + `BaseWalletConfig.delegateProvider` are canonical (`getDelegatorManager()` / `delegatorProvider` deprecated aliases). README + tests renamed to match.
- `ec48a8da` fix: coderabbit feedback on PR #519.
- `d3e7bce1` chore: follow-up cleanups for delegator -> delegate rename — makes the deprecated `DelegateInfo.delegatorAddress` optional; normalizes `delegateAddress` at the single `getDelegateInfo()` boundary so `delegate()` reads `delegateInfo.delegateAddress` directly; documents why both `delegateUrl` and `delegatorUrl` are still posted to the worker (pre-#519 service-worker compat); renames `delegator*.test.ts` → `delegate*.test.ts`.
- `dd9b58e6` fix: make isDelegateInfo consistent with optional delegatorAddress — the guard accepts the payload when either `delegateAddress` or `delegatorAddress` is a non-empty string (each validated only when present), keeping current Fulmine (`delegatorAddress`-only) responses valid and forward-compatible with the server switching to `delegateAddress`.
- `1250ee12` fix: normalize delegateAddress by type, not truthiness — selects the returned `delegateAddress` by explicit string type check so it is always a string even when the preferred source field is a non-string value; adds `RestDelegateProvider.getDelegateInfo` unit tests for the non-string case + the guard rejection path.

*boltz-swap (carried in the same range — tracked under `docs/projects/boltz-swap/`):*
- `3a45d57a` feat: export InMemorySwapRepository — re-exports `InMemorySwapRepository` from `@arkade-os/boltz-swap`'s root.

*Release:*
- `45d639c8` chore: release @arkade-os/sdk@0.4.29, @arkade-os/boltz-swap@0.3.34 — package.json version bumps.

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — workspace table + Quick Reference Version bumped (`0.4.28 → 0.4.29`, `0.3.33 → 0.3.34`); architecture diagram `DelegatorManager → DelegateManager` and `RestDelegatorProvider → RestDelegateProvider`; "Delegation" key concept rewritten and two new key concepts added ("Delegator → Delegate Rename" with the full canonical/alias mapping + `DelegateInfo` semantics; "AssetManager Export").
- `docs/projects/ts-sdk/system/project_overview.md` — workspace table + Version bumped; URL Config Deprecation row notes `delegatorProvider` is itself a deprecated alias; Asset Management row gained the root-export note; VTXO Delegation row rewritten with the rename + `DelegateInfo` details; Integration Points "Delegator" → "Delegate" (`RestDelegateProvider`).
- `docs/projects/ts-sdk/system/architecture.md` — `wallet/delegator.ts` → `delegate.ts` (DelegateManager + alias note); `providers/delegator.ts` → `delegate.ts` (RestDelegateProvider + `DelegateInfo` normalization); `asset-manager.ts` entry notes the root export; provider list `DelegatorProvider` → `DelegateProvider`.
- `docs/projects/ts-sdk/system/integration-with-arkd.md` — wallet config example uses `delegateProvider: new RestDelegateProvider(url)`; "Built-in DelegatorManager" → "DelegateManager".
- `docs/INDEX.md` — ts-sdk Key Capabilities: asset bullet gained the root-export note; VTXO delegation bullet rewritten with the full rename + `DelegateInfo` semantics; stale "version still 0.4.27" note corrected to "current published version 0.4.29". Tags add `delegate-manager`, `delegator-delegate-rename`, `asset-manager-export`.

**Notes**:
- **No breaking changes for typical consumers**: the delegator → delegate rename ships entirely via `@deprecated` aliases — every old name (`DelegatorProvider`, `RestDelegatorProvider`, `DelegatorManagerImpl`, `IDelegatorManager`, `DelegatorNotConfiguredError`, `getDelegatorManager()`, `delegatorProvider`) still resolves at runtime. `AssetManager` / `ReadonlyAssetManager` exports are purely additive.
- `DelegateInfo.delegatorAddress` becoming optional is non-breaking for readers (it was already populated by Fulmine); writers/implementers gain the option to populate `delegateAddress` instead.
- The boltz-swap `InMemorySwapRepository` export in this range is tracked under `docs/projects/boltz-swap/`; this sync touches only ts-sdk + master registry docs.

---

## 2026-05-26 - Provider mainnet defaults + URL-config deprecation + DustChangeError + ServiceWorkerWallet.restore()
**From**: `0fa19be5f59d50435d19806ba182754b3689a80f`
**To**: `d682eac52d1fc7e92662a859cd69db5bd8bff156`
**Synced By**: update-project skill
**Status**: Post-release polish batch on top of the `0.4.28` cut — no version bump (`packages/ts-sdk/package.json` still `0.4.28`, `packages/boltz-swap/package.json` still `0.3.33`). Four user-visible ts-sdk changes: (1) every default provider constructor now defaults its URL to the Ark Labs mainnet endpoint, (2) URL-string fields on `BaseWalletConfig` / `ServiceWorkerWalletOptions` are JSDoc-deprecated in favour of provider instances, (3) `Ramps` partial-offboard throws a typed `DustChangeError` before forwarding the intent so wallet UIs can recover gracefully, (4) `ServiceWorkerWallet.restore()` mirrors `Wallet.restore` with a worker-side scan + explicit `AggregateError` round-trip across postMessage. Several boltz-swap commits are also in this range; they are tracked under `docs/projects/boltz-swap/`.

**Commits analyzed** (17 non-merge commits across both packages):

*ts-sdk — mainnet defaults extended to providers:*
- `c87bc3da` refactor: move mainnet default constants into networks — extracts `DEFAULT_ARKADE_SERVER_URL`, `DEFAULT_NETWORK`, `DEFAULT_NETWORK_NAME` to `src/networks.ts` so `script/base.ts` and the provider modules can import them without dragging in `wallet/index.ts` (breaks a future cycle once the providers start defaulting).
- `cdeb6bb8` feat: default address + onchainAddress network to mainnet — `VtxoScript.address(prefix?)` defaults `prefix` to `DEFAULT_NETWORK.hrp`; `VtxoScript.onchainAddress(network?)` defaults to `DEFAULT_NETWORK`.
- `5d7eded9` feat: default provider URLs to mainnet — `RestArkProvider.constructor(serverUrl = DEFAULT_ARKADE_SERVER_URL)`, `RestIndexerProvider.constructor(serverUrl = DEFAULT_ARKADE_SERVER_URL)`, `ExpoArkProvider`, `ExpoIndexerProvider` same shape. `EsploraProvider.constructor(baseUrl = ESPLORA_URL[DEFAULT_NETWORK_NAME])` defaults to the Ark Labs mempool deployment for bitcoin. `vtxo-manager.ts` example JSDocs rewritten to drop the now-redundant URL args; `DEFAULT_THRESHOLD_SECONDS` rewritten as numeric literal `259_200` (semantically identical).

*ts-sdk — URL string config deprecated:*
- `919d1fff` chore: deprecate string arguments when creating wallet — `BaseWalletConfig`'s JSDoc rewritten as `@deprecated`; the `ReadonlyWallet.create` / `Wallet.create` / `ExpoWallet.setup` `@example` blocks dropped the URL-based forms. `ReadonlyWallet.create` switched the provider resolution from `config.arkProvider ?? new RestArkProvider(arkadeServerUrl)` to `||` so an explicitly-passed `undefined` (e.g. via TypeScript narrowing) falls through to the default constructor.
- `779dbb4f` chore: deprecate URL string args in wallet config (refs #466) — adds `@deprecated` JSDoc to `BaseWalletConfig.arkServerUrl` / `indexerUrl` / `esploraUrl` and `ServiceWorkerWalletOptions.arkServerUrl` / `indexerUrl` / `esploraUrl` / `delegatorUrl`. Runtime behaviour unchanged.

*ts-sdk — DustChangeError on partial offboard:*
- `f6769128` fix(ramps): reject sub-dust change on partial offboard (closes #458) — partial collab exits leaving a change VTXO below the wallet's dust threshold were forwarded to arkd, which rejected the intent and surfaced a raw dust error. `Ramps` now pre-checks the change against the wallet's `dustAmount` (with `FALLBACK_DUST_AMOUNT = 330n` for wallets that don't expose it) and throws a typed `DustChangeError(change, dustAmount)` locally. `DustChangeError` exported from the package root.
- `c8d97ebb` Extract shared wallet dust amount helper — moves `getDustAmount(wallet): bigint` + `FALLBACK_WALLET_DUST_AMOUNT = 330n` to `src/wallet/utils.ts`; `ramps.ts` and `vtxo-manager.ts` share the helper (was duplicated inline).

*ts-sdk — ServiceWorkerWallet.restore():*
- `d19ed384` feat(sw): ServiceWorkerWallet.restore() with AggregateError round-trip — adds `ServiceWorkerWallet.restore({ gapLimit })` (signing-only — readonly rejects). New `RequestRestoreWallet` / `ResponseRestoreWallet` types + `RESTORE_WALLET` / `RESTORE_WALLET_SUCCESS` case; the message uses the streaming `sendMessageWithEvents` path and is added to `isLongRunningRequest()` alongside `SETTLE` / `RECOVER_VTXOS` / `RENEW_VTXOS` so the bus deadline never races a multi-minute indexer scan (liveness still covered by PING). `AggregateError` is not structured-clone-portable across browsers, so the worker explicitly serializes it (`SerializedAggregateError` wire envelope: `{ name: 'AggregateError', message, errors: { name; message }[] }`) and the page reconstructs via `deserializeAggregateError` so callers can inspect `.errors`. Helpers + `isSerializedAggregateError` guard live in `wallet-message-handler.ts`.

*boltz-swap (carried in the same range — tracked under `docs/projects/boltz-swap/`):*
- `4c92e4a8` Iterate all VTXOs in claimVHTLC and refundArk — `claimVHTLC` processes every unspent VTXO at the reverse-swap lockup script (recoverable→joinBatch, non-recoverable→offchain claim); `refundArk` processes every unspent VTXO at the chain-swap lockup, gates path by CLTV, returns `{ swept, skipped }`, propagated through `IArkadeSwaps`, `SwapManagerCallbacks`, Expo + service-worker wrappers. `SwapManager` keeps chain swaps monitored when `refundArk` reports partial outcomes or throws, schedules a 60s retry, finalizes once the local sweep completes. Fix Boltz throttle in `refundVHTLC` / `refundArk` to count attempts so the 2s gap also applies after a `BoltzRefundError`.
- `a53ad526` claimVHTLC: aggregate per-VTXO errors instead of short-circuit — wrap each VTXO claim attempt in try/catch so an early failure doesn't strand later VTXOs at the lockup; throw a single aggregate after the loop.
- `ad32ba6f` Address PR review on refundArk loop — re-check CLTV per-iteration; add `removeSwap()` test for refund-retry timer clearing.
- `a10a2766` swap-manager.test: isolate chain-refund retry suite with a global.fetch stub.
- `2bc185f9` Fix formatting (boltz-swap).
- `b9b4e0a3` Guard claimVHTLC retries and refund-retry swaps — `claimVHTLC` retries until an unspent VTXO appears instead of breaking on any result; exclude swaps with a pending refund retry from polling and the not-found path so a 404 can't clear `refundRetryTimers`.
- `5c36b5a5` test(boltz-swap): drive autopilot wrap via lockupFailed status.
- `0789d942` fix(boltz-swap): reject non-safe-integer quote amounts.
- `36937074` fix(boltz-swap): reject slippage that collapses quote floor to 0.

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — Mainnet Defaults key concept extended to cover provider constructor defaults + `VtxoScript.address`/`onchainAddress` defaults + the `DEFAULT_*` constants' move into `src/networks.ts`. Three new key concepts added: "Wallet Config URL Deprecation" (all URL fields `@deprecated`, provider-based config is the recommended path, refs #466); "Dust Change Guard / DustChangeError" (`Ramps` pre-check + typed error + shared `getDustAmount` helper, closes #458); "ServiceWorkerWallet.restore()" (worker-side scan + long-running message + explicit `AggregateError` round-trip).
- `docs/projects/ts-sdk/system/project_overview.md` — Mainnet Defaults row in Core Features amended with the provider/`VtxoScript` defaults paragraph. New "URL Config Deprecation" row added. Boarding/Offboarding row gained the DustChangeError + `getDustAmount` + `FALLBACK_WALLET_DUST_AMOUNT` paragraph. Service Worker row gained the `ServiceWorkerWallet.restore({ gapLimit })` paragraph (long-running message + `SerializedAggregateError` envelope + readonly rejection).
- `docs/projects/ts-sdk/system/architecture.md` — `networks.ts` entry now documents the `DEFAULT_ARKADE_SERVER_URL` / `DEFAULT_NETWORK` / `DEFAULT_NETWORK_NAME` declarations + rationale for the move. `script/base.ts` entry covers the `address(prefix?)` / `onchainAddress(network?)` defaults. `providers/{ark,indexer,onchain,expoArk,expoIndexer}.ts` entries each note the new default-URL constructor arg. `wallet/ramps.ts` entry covers the DustChangeError pre-check; `wallet/utils.ts` entry now hosts `getDustAmount` + `FALLBACK_WALLET_DUST_AMOUNT`. `wallet/serviceWorker/wallet.ts` + `wallet-message-handler.ts` entries document the `restore()` flow, `RESTORE_WALLET` message + long-running marking, and the `SerializedAggregateError` envelope + helpers.
- `docs/INDEX.md` — ts-sdk Key Capabilities: Mainnet defaults bullet amended with the provider/`VtxoScript` defaults; three new bullets added (URL config deprecation, DustChangeError, ServiceWorkerWallet.restore). Tags add `provider-default-urls`, `url-config-deprecated`, `dust-change-error`, `service-worker-restore`.

**Notes**:
- **No version cut**: `packages/ts-sdk/package.json` still reads `"0.4.28"`, `packages/boltz-swap/package.json` still `"0.3.33"`. The next published release will carry these changes.
- **No breaking changes for typical consumers**: provider-default URLs and `VtxoScript` argument defaults are *additive* (existing call sites passing explicit args keep working unchanged). URL-string deprecations are JSDoc-only — runtime still accepts them. `DustChangeError` is a new typed error class thrown from a previously-failing path (callers ignoring it get the same fail behaviour they had before, just with a structured error instead of arkd's raw dust message). `ServiceWorkerWallet.restore()` is a new method (additive).
- The `||` operator (not `??`) is now used in `ReadonlyWallet.create` to resolve `arkProvider` so an explicitly-`undefined` `arkProvider` field falls through to the constructor's mainnet default — a deliberate tightening over the prior nullish-coalescing form.
- The boltz-swap changes in this range (`claimVHTLC` aggregate-throw + per-VTXO retry, `refundArk` iterate-all + `{swept,skipped}` outcome + 60s SwapManager retry, quote-amount + slippage validations) substantially expand the public callback shape of `IArkadeSwaps` / `SwapManagerCallbacks` and the Expo / service-worker wrappers around them — full coverage lives under `docs/projects/boltz-swap/`.

---

## 2026-05-23 - Wallet.restore() gap-scan recovery + Discoverable handlers (0.4.28, #492)
**From**: `2fc8a3ff5adb14c87cf57586bddcf287ce4bfff6`
**To**: `0fa19be5f59d50435d19806ba182754b3689a80f`
**Synced By**: update-project skill
**Status**: First post-monorepo release cycle for both packages: `@arkade-os/sdk` cuts `0.4.28` and `@arkade-os/boltz-swap` cuts `0.3.33`. Headline ts-sdk change is **explicit gap-scan recovery** — a new `Wallet.restore({ gapLimit })` API plus the `Discoverable` capability + `ContractManager.scanContracts` plumbing that backs it (PR #492). The Boltz quoteSwap guard against adversarial renegotiations is tracked under the `boltz-swap` project. One transitive security override: `@ungap/structured-clone >=1.3.1` (CWE-502, pulled in via expo, closes #497).

**Commits analyzed** (26 non-merge commits across both packages):

*ts-sdk: Wallet.restore() gap-scan recovery (#492):*
- `6e08283c` feat(contracts): add Discoverable capability + DiscoveryDeps/DiscoveredContract — new contract-handler capability `discoverAt(descriptor, deps): Promise<DiscoveredContract[]>`; structural `isDiscoverable` guard; types in `src/contracts/types.ts`.
- `f52403e0` feat(contracts): DefaultContractHandler implements discoverAt — probes every csvTimelock in the baseline matrix at the given descriptor's leaf pubkey; index 0 produces an untagged hit, index > 0 tags with `metadata.source = WALLET_RECEIVE_SOURCE` + `metadata.signingDescriptor`.
- `ba99adfe` feat(contracts): DelegateContractHandler implements discoverAt — same shape for delegated `default + delegate` contracts; multi-timelock coverage with each entry's `params.csvTimelock` round-tripping its own `timelockToSequence`.
- `3d3e0e1f` refactor(contracts): extract WALLET_RECEIVE_SOURCE to break contracts→wallet cycle — source-of-truth declaration moved to dependency-free leaf `src/contracts/metadata.ts`; `wallet/walletReceiveRotator.ts` re-exports for backward compatibility.
- `a2f452e4` feat(wallet): public materializeDescriptorAt + monotonic advanceLastIndexUsed on HDDescriptorProvider — exposes descriptor materialization at arbitrary HD indexes (used by scanContracts) and a monotonic cursor-advance helper (used by restore to fast-forward past discovered hits).
- `7c2de20e` refactor: extract deriveDescriptorLeafPubKey into identity/descriptor — shared between WalletReceiveRotator and the contract-handler discoverAt paths.
- `b217fbb7` refactor: simplify deriveLeafPubkey wrapper message; add HD-descriptor test.
- `859ff01c` test(contracts): multi-timelock discoverAt coverage; drop redundant casts — exported `ContractHandler<...> & Discoverable` typing makes `as any` casts unnecessary at use sites.
- `95b4d1ba` feat(contracts): ContractManager.scanContracts gap-limit discovery loop — `scanContracts({ deps, hd, gapLimit }): Promise<ScanResult>` iterates each Discoverable handler probing successive indexes until `gapLimit` consecutive misses; `hd: false` short-circuits to a single static pass at index 0; returns `{ lastIndexUsed, handlerErrors }`.
- `49a4f187` refactor(contracts): scanContracts naming/typing polish; drop dead test import — local rename `lastUsedIdx → lastIndexUsed`; tightened `let found: DiscoveredContract[];` typing.
- `d257984c` fix(wallet): deterministic pickActiveReceive tiebreak on HD index — when multiple `metadata.source === 'wallet-receive'` contracts coexist (restore can create several), parse trailing `/N)` from each `metadata.signingDescriptor` and prefer the highest index.
- `ec78c094` feat(wallet): explicit Wallet.restore() gap-scan recovery — public `restore({ gapLimit })` entry point; HD branch drives `scanContracts({ hd: true })`, non-HD branch does a single static pass; trailing `refreshVtxos({ includeInactive: true })` bulk-loads VTXOs for all discovered scripts in one indexer call.
- `84155f75` fix(wallet): drain in-flight restore on dispose; lazy static descriptor — `dispose()` now awaits `_restoreInFlight?.catch(() => undefined)` before tearing down the contract/vtxo managers; staticDescriptor computed lazily (HD branch never touches `xOnlyPublicKey()`); JSDoc notes coalesce-on-concurrent behaviour.
- `27e90585` feat: export restore/discovery public types — `Discoverable`, `DiscoveryDeps`, `DiscoveredContract`, `isDiscoverable`, `ScanResult`, `ScanContractsOptions`, `HandlerError` surfaced from the package root following the existing curated import/export pattern.
- `0900d3e6` test(e2e): restore recovers balance on a fresh repo from the same seed — end-to-end coverage of the full restore loop.
- `ab65a01c` test(e2e): make restore test HD-mode and load-bearing — restore e2e now exercises the actual HD path.
- `400829f8` fix: address CodeRabbit review (HD capability check, watermark guard, test robustness).
- `d0839d24` fix(restore): bound HD scan with SCAN_MAX_INDEX; use instanceof for HD check — HD scan capped at `SCAN_MAX_INDEX = 10_000` (was `POSITIVE_INFINITY`) so a buggy/malicious Discoverable handler can't hang the wallet, and silently truncating a fund-recovery scan can't mask the failure (hitting the cap **throws**); `_runRestore` detects HD via `instanceof HDDescriptorProvider` rather than duck-typing the new method names.
- `3d15d5e3` perf(scan): avoid N per-contract indexer pulls during scanContracts — factor `upsertContract` + new lighter `persistAndWatchContract` that omits the per-contract `fetchContractVxosFromIndexer` pull (trailing `refreshVtxos` covers the same scripts in one batched call); `createContract` keeps the fetch for standalone callers.
- `fb8cfabc` fix(restore): coalesce concurrent calls before validating gapLimit — `_restoreInFlight` check moved BEFORE `gapLimit` validation so a coalescing caller with an invalid `gapLimit` joins the running scan instead of throwing (matches the documented JSDoc).

*ts-sdk: Release:*
- `b32735b7` chore: release @arkade-os/sdk@0.4.28, @arkade-os/boltz-swap@0.3.33 — package.json version bumps via `pnpm run release -- all patch`.
- `057886d2` Update docs — AGENTS.md + README.md narrative tweaks for the restore feature.
- `2d823ef2` chore: override @ungap/structured-clone to >=1.3.1 — flags CWE-502 (deserialization of untrusted data); 1.3.0 was pulled in transitively via expo. Override added to root `pnpm-workspace.yaml` (closes #497). No `@arkade-os/sdk` source change.

*boltz-swap (carried in the same range — tracked under `docs/projects/boltz-swap/`):*
- `3df53118` Guard quoteSwap against adversarial Boltz quotes — typed `QuoteRejectedError` with reason codes, `getSwapQuote` / `acceptSwapQuote` inspection helpers, `minAcceptableAmount` + basis-point slippage support.
- `db39c2d8` Address review on quoteSwap guard — `claimDetails` guards for restored swaps; preserve native `QuoteRejectedError` across SW boundary; discriminated `QuoteRejectedOptions` union.
- `0dec8b37` Address PR review on quoteSwap guard — reject `minAcceptableAmount = 0`, rewrite slippage math as subtract-then-floor so it stays correct above `MAX_SAFE_INTEGER / 10000`; thread `cause` through autopilot wrap.

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — `Version` row bumped `0.4.27 → 0.4.28`; Monorepo workspace table now lists `@arkade-os/sdk 0.4.28` + `@arkade-os/boltz-swap 0.3.33`; new "Wallet Restore / Discovery" entry in Key Concepts covering the full `Wallet.restore` flow (HD detection via `instanceof HDDescriptorProvider`, `scanContracts` gap-limit loop, `SCAN_MAX_INDEX = 10_000` cap, lighter `persistAndWatchContract` perf path, monotonic `advanceLastIndexUsed`, coalesce-before-validate semantics, `dispose()` draining `_restoreInFlight`, `pickActiveReceive` HD-index tiebreak), and the `WALLET_RECEIVE_SOURCE` extraction + new public exports (`Discoverable`, `DiscoveryDeps`, `DiscoveredContract`, `isDiscoverable`, `ScanResult`, `ScanContractsOptions`, `HandlerError`).
- `docs/projects/ts-sdk/system/project_overview.md` — Package row Version `0.4.27 → 0.4.28`; Monorepo Layout table versions updated; Core Features table adds a "Wallet Restore / Discovery" row summarising the new public API.
- `docs/projects/ts-sdk/system/architecture.md` — Module Structure entries updated: `wallet.ts` (adds `restore()` flow + dispose drain + instanceof HD detection + lazy static descriptor); `walletReceiveRotator.ts` (`pickActiveReceive` HD-index tiebreak + `WALLET_RECEIVE_SOURCE` re-export note + `deriveDescriptorLeafPubKey` extraction); `hdDescriptorProvider.ts` (public `materializeDescriptorAt` + monotonic `advanceLastIndexUsed`); `identity/descriptor.ts` (now hosts `deriveDescriptorLeafPubKey`); `contracts/types.ts` (adds `Discoverable` + `DiscoveryDeps` + `DiscoveredContract` + `isDiscoverable`); new `contracts/metadata.ts` entry (dependency-free leaf for `WALLET_RECEIVE_SOURCE`); `contracts/contractManager.ts` (`scanContracts` gap-limit loop, `SCAN_MAX_INDEX` cap, `persistAndWatchContract` perf path); new `contracts/handlers/default.ts` + `contracts/handlers/delegate.ts` entries documenting `discoverAt` implementations.
- `docs/INDEX.md` — ts-sdk Key Capabilities adds the Wallet Restore / Discovery bullet (full feature paragraph); Tags add `wallet-restore`, `gap-limit-discovery`, `discoverable-handler`, `scan-contracts`.

**Notes**:
- **No public API breaking changes** for existing consumers — `Wallet.restore()` is a new, opt-in method; `DescriptorProvider` interface itself is unchanged (`materializeDescriptorAt` / `advanceLastIndexUsed` live on the concrete `HDDescriptorProvider` class, not the interface).
- Restore is **explicit, never automatic** — `Wallet.create()` does not call `restore()`; callers wanting gap-scan recovery must invoke it deliberately. This matches the dotnet-sdk's `Restore()` design.
- `SCAN_MAX_INDEX = 10_000` is intentionally a hard ceiling rather than a configurable parameter: it bounds a buggy/malicious Discoverable handler returning unconditional hits (would otherwise hang the wallet) and refuses to silently truncate a fund-recovery scan.
- `restore()` is **safe to call from multiple sites** — concurrent callers coalesce on `_restoreInFlight`; second caller's `gapLimit` is silently ignored (documented behaviour, validated by the in-flight-coalesce regression test).
- `@arkade-os/boltz-swap` cuts `0.3.33` in the same release because `pnpm run release -- all patch` was used. The boltz-swap quoteSwap guard is the boltz-swap-side highlight; ts-sdk consumers of boltz-swap (Lightning swap, chain swap) automatically get the new typed `QuoteRejectedError` + slippage controls once they bump.
- `@ungap/structured-clone >=1.3.1` override is a transitive-only fix (no SDK source change); the upstream advisory is CWE-502 on 1.3.0, pulled in via expo. Override is at the workspace-root `pnpm-workspace.yaml` `overrides` block so both packages pick it up uniformly.

---

## 2026-05-22 - Monorepo restructure: ts-sdk + boltz-swap unified under `packages/*`
**From**: `029a988d0cae1ba9e35a3a10d7f0b0cc37cce26b`
**To**: `2fc8a3ff5adb14c87cf57586bddcf287ce4bfff6`
**Synced By**: update-project skill
**Status**: The single-package `@arkade-os/sdk` repository has been re-shaped into a **pnpm workspace monorepo** that vendors `@arkade-os/boltz-swap` as a sibling package. The two packages keep independent `package.json` `version`s (`@arkade-os/sdk` `0.4.27`, `@arkade-os/boltz-swap` `0.3.32`) but share devDependencies, prettier config, tsup config, regtest harness, and a coordinated `scripts/release.sh` driver. **No public TypeScript API changes for `@arkade-os/sdk` consumers** — only repo-local tooling, file paths, and CI scripts moved. Downstream apps installing `@arkade-os/sdk` from npm are unaffected.

**Commits analyzed** (high signal — the full range carries ~280 non-merge commits because the boltz-swap history was grafted in; ~30 commits below are the load-bearing structural ones):

*Monorepo scaffolding & migration:*
- `90e5de32` Add monorepo scaffolding (workspace, root configs, CI) — `pnpm-workspace.yaml`, root `package.json` with `pnpm -r` aggregate scripts, root `prettier`/`tsconfig` bases.
- `d74cc004` Move `@arkade-os/sdk` under `packages/ts-sdk/` for monorepo layout — all `src/`, `test/`, `tsup.config.ts`, `vitest.config.ts`, `scripts/smoke-dist.mjs`, `package.json`, `tsconfig.json`, `CHANGELOG.md`, etc. relocated; npm-published path inside the tarball unchanged.
- `d1b4070a` Adapt boltz-swap for monorepo (hoist per-package files, workspace dep) — boltz-swap's git history rewritten in; `packages/boltz-swap/package.json` declares `@arkade-os/sdk: workspace:*`.

*Shared config + devDep hoisting:*
- `bf5a5137` refactor: dedupe boltz-swap against ts-sdk — boltz-swap reuses ts-sdk's tsup base, `tsconfig` base, and prettier config; eliminates duplicated build scaffolding.
- `1900c8b6` refactor(config): wire shared base configs — root `tsconfig.base.json` + `prettier` config + tsup shared base. Per-package configs extend the root.
- `e7835101` chore: hoist tsup; add boltz-swap typecheck — `tsup` moved to root devDeps; boltz-swap gets a `pnpm typecheck` step matching ts-sdk's, gated in CI.
- `42f5133a` chore: hoist shared devdeps and drop per-package leftovers — `vitest`, `@types/node`, `husky`, `prettier`, `typescript`, `tsup`, `fake-indexeddb`, `eventsource` all hoisted to root; per-package `node_modules` keep only package-unique deps.
- `26f1cb29` style: apply root prettier config across packages — single repo-wide format pass.
- `919d0d1d` chore: move pnpm settings to pnpm-workspace.yaml — `onlyBuiltDependencies` (`better-sqlite3`, `canvas`, `sqlite3`, `@arkade-os/sdk`), `ignoredBuiltDependencies`, and `overrides` (`esbuild >=0.25.0`, `brace-expansion`, `minimatch`) consolidated.
- `8c3283ef` refactor(types): single bip68 ambient declaration — `bip68.d.ts` hoisted to a single root-level declaration consumed by both packages (was duplicated per-package).
- `615d128d` chore: hygiene pass on repo root — removes orphaned files left over from the single-package layout.

*Release flow:*
- `843502e1` chore(release): unify versions and release both packages in lockstep — first attempt at coordinated releases; both packages get the same version bump.
- `cd29cda3` chore: package-scoped releases — supersedes lockstep with **package-scoped release CLI**: `pnpm run release -- sdk patch` (SDK + dependent boltz-swap patch), `pnpm run release -- boltz-swap patch` (Boltz-only bugfix), `pnpm run release -- sdk prepatch --preid beta` (mirrors prerelease into boltz-swap), `pnpm run release -- all patch` (bump both). Driver is `scripts/release.sh` → `scripts/release.mjs`.
- `15ee8c63` chore(release): run pnpm test:unit before publish — release script gates publish on `pnpm test:unit` (monorepo-wide).
- `7eb819d7` Address review comments 1,2,5 — release-flow polish.

*Node + CI:*
- `2ca08e3f` Bump Node to 24.15.0 LTS, add `.nvmrc` — root `engines.node` = `>=24.15.0 <25` (publishable `@arkade-os/sdk` still ships with the widened `>=22.12.0 <25` consumer range from #495).
- `7bf8d386` Update CI jobs to use new scripts — CI invokes root-level `pnpm build` / `pnpm test:unit` / `pnpm test:integration` (which fan out to both packages via `pnpm -r`).
- `3555a9a4` ci: smoke boltz-swap dist; restore next, engines, regtest cache key — boltz-swap now runs its own `pnpm smoke:dist` post-build (mirrors ts-sdk's #496 smoke step); cache key includes the regtest submodule pin.
- `fdf5c04e` ci: run boltz-swap typecheck after build — `pnpm typecheck` per package, gated before tests.
- `80c75eee` Fix e2e tests — alignment fixes for the new monorepo path layout.

*Boltz-swap upgrades carried in (no `@arkade-os/sdk` impact):*
- `e0837dbf` Upgrade ts-sdk 0.4.27 (inside boltz-swap), `57ac8916` release 0.3.32, `67683b13` release 0.3.31, `e019ba06` release 0.3.30, plus older 0.3.x releases grafted from boltz-swap's prior history.
- `4a680abd` fix(boltz-swap): poll swap status when WebSocket fails, `1e53b733` test(boltz-swap): isolate swap repo and extend slow timeouts, `2234ab30` Recover from half-initialized ArkadeSwaps handler after SW restart, `30394562` fix: isolate expo-task-manager/expo-background-task to `/expo/background`, `fd756129` chore: declare optional Expo peers and test removed-field guard.

*Documentation:*
- `a434417b` docs: clarify authoritative ai guidance, `c284c6fc` docs(sdk): add worker README index, `5fb76c0f` docs: align typedoc output with monorepo layout, `68b353e1` docs(boltz-swap): fix expo setup and swap migration guidance, `ae5be443` docs(sdk): update examples for bigint assets and current repositories, `100c257a` docs: replace stale package-local development instructions, `9785f9e7` docs: fix monorepo command and architecture guidance — `AGENTS.md` / `CLAUDE.md` / `FOUNDATION.md` rewritten as monorepo-aware guides (Commands section now monorepo-wide + per-package `pnpm -C packages/<pkg>`).

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — Quick Reference adds `Repo Layout` row (pnpm workspace monorepo, `packages/ts-sdk/` + `packages/boltz-swap/`); `Package Manager` row updated to `pnpm 10.25.0` (was `10.29.2`); `scripts` frontmatter rewritten to be monorepo-aware (root `pnpm build` / `pnpm test:unit` / `pnpm lint` fan out via `pnpm -r`; package-scoped commands documented via `pnpm -C packages/ts-sdk <script>`; `release` entry shows the new package-scoped CLI form); new "Monorepo Layout" section near the top.
- `docs/projects/ts-sdk/system/project_overview.md` — Adds **Monorepo Layout** section at the top noting the workspace shape and the boltz-swap sibling; Package row clarifies the npm-published artifact is `packages/ts-sdk/` (publish path unchanged); Technology Stack `Package Manager` row updated to `pnpm 10.25.0` workspace (was `10.29.2`); release section notes the package-scoped CLI.
- `docs/projects/ts-sdk/system/architecture.md` — Module Structure header prefixed with `packages/ts-sdk/` (was top-level `src/`); new **Repo Layout** section at the top showing `packages/ts-sdk/`, `packages/boltz-swap/`, root `scripts/regtest.sh`, hoisted devDeps, shared `tsconfig.base.json` / `prettier` / `tsup` base.
- `docs/projects/ts-sdk/sop/development-workflow.md` — Prerequisites bumps pnpm to `>=10.25.0 <11`; Setup section notes `pnpm install` at the repo root installs both packages; Building section adds per-package syntax (`pnpm -C packages/ts-sdk build`) alongside the root aggregate; Testing section adds `pnpm -C packages/ts-sdk test:unit` and the root `pnpm test:integration:ts-sdk` / `pnpm test:integration:boltz-swap`; Releasing section rewritten for the package-scoped CLI (`pnpm run release -- sdk patch` / `boltz-swap patch` / `all patch`, `--preid beta` for prereleases, gated on `pnpm test:unit`).
- `docs/projects/ts-sdk/testing/how_to_run.md` — Install notes `pnpm install` at the repo root; Build section adds per-package alternative (`pnpm -C packages/ts-sdk build`); Regtest section replaces the deprecated `pnpm test:up-docker` / `pnpm test:down-docker` script names with the root-level `pnpm regtest:up:ts-sdk` / `pnpm regtest:setup:ts-sdk` / `pnpm regtest:down:ts-sdk` (and `pnpm test:integration:ts-sdk` for the full `cycle`); package-local script names (`pnpm -C packages/ts-sdk regtest:start` / `regtest:stop` / `regtest:clean` / `regtest`) noted for in-package invocation.
- `docs/projects/ts-sdk/testing/how_to_test.md` — Running Tests section adds per-package syntax (`pnpm -C packages/ts-sdk test:unit`); Integration Tests rewrites `pnpm test:up-docker` → root `pnpm regtest:up:ts-sdk` (and per-package `pnpm -C packages/ts-sdk regtest:start`); notes the unified `scripts/regtest.sh <pkg> <action>` driver.
- `docs/INDEX.md` — ts-sdk Active Dev row prefixes the existing changelog narrative with the monorepo restructure (workspace shape, package-scoped release CLI, hoisted devDeps, shared configs); Tags add `monorepo`, `pnpm-workspace`, `boltz-swap-sibling`.

**Notes**:
- **No published `@arkade-os/sdk` source changes.** Every `src/` modification in `packages/ts-sdk/src/` already shipped in the 0.4.27 cut (or the post-0.4.27 unreleased changes documented in earlier sync entries: #487 Expo subpath split, #495 Node 24, #496 tsup migration, etc.). The structural changes in this sync are repo tooling only.
- The `package.json` `version` of `@arkade-os/sdk` remains `0.4.27`; no new release cut.
- The `package.json` `version` of `@arkade-os/boltz-swap` reads `0.3.32` — the most recent release at HEAD inside the monorepo.
- Root `engines.node` is intentionally narrower (`>=24.15.0 <25`) than the published `@arkade-os/sdk` `engines.node` (`>=22.12.0 <25`) so contributors develop on Node 24 while downstream consumers on Node 22.x remain supported.
- The `pnpm-workspace.yaml` `overrides` (`esbuild >=0.25.0`, `brace-expansion ^2.0.2`, `minimatch 9.0.3`) close known transitive vulnerability advisories without forcing direct devDep churn in either package.
- Pre-monorepo boltz-swap history (~150 commits, `0.1.x` through `0.3.31`) is grafted into the unified history; releases prior to `0.3.30` predate the monorepo and are documented under the `boltz-swap` project for context.

---

## 2026-05-21 - Build migration to tsup (#496)
**From**: `c0442fbf3aaafba226400981d15bbb14c658622e`
**To**: `029a988d0cae1ba9e35a3a10d7f0b0cc37cce26b`
**Synced By**: update-project skill
**Status**: One build-system PR landed on `main` after the post-0.4.27 batch. Replaces the multi-step `tsc + post-processors` build chain with a single `tsup` invocation. Output dist layout changed (flat `dist/*.js|*.cjs|*.d.ts|*.d.cts` instead of `dist/{esm,cjs,types}/` subdirectories); `package.json` `main` / `module` / `types` / `exports` updated accordingly. No `version` cut — `package.json` still reads `"0.4.27"`. No public TypeScript API changes; downstream consumers using documented `exports` paths are unaffected.

**Commits analyzed** (1 non-merge commit):
- `029a988` Migrate from tsc + post-processors to tsup (#496) — replaces 6 `tsc` invocations (`build:esm`, `build:cjs`, `build:types`, `build:expo:esm`, `build:expo:cjs`, `build:expo:types`) plus `scripts/add-extensions.js` + `scripts/generate-package-files.js` + `scripts/build-browser.js` with a single `pnpm build → tsup` step (dual ESM+CJS, per-entry `.d.ts` / `.d.cts`, source maps, `splitting: true`, `treeshake: true`, target `es2022`). Drops devDeps `esbuild`, `glob`, `rimraf` (tsup brings them); adds `tsup ^8.5.0`. New `pnpm typecheck` script (`tsc --noEmit`) wired into CI before build. New `scripts/smoke-dist.mjs` post-build verification asserts: every `package.json` `exports` target (and `main`/`module`/`types`) exists on disk, every relative import in `dist/**/*.d.{ts,cts}` resolves, CJS + ESM `contractHandlers` singleton identity holds across the root entry and the `contracts/handlers` entry with registered types exactly `{default, delegate, vhtlc}`, each Node-safe public subpath resolves via `@arkade-os/sdk`'s exports through a symlinked consumer, and `wallet/expo/background` stays structural-only (would eagerly require optional Expo peers at module init otherwise). Smoke step wired into CI as `pnpm run smoke:dist` after `pnpm build`, plus `npm pack --dry-run --ignore-scripts` to verify publish shape without re-running prepack. `tsconfig.json` bumped target `es2020 → es2022`, `moduleResolution: node → bundler`, set `noEmit: true` (now used only for typecheck) — `tsconfig.cjs.json` / `tsconfig.esm.json` / `tsconfig.expo.json` deleted, so the previous conditional Expo build (`build:expo:check`) is gone; build is unconditional. `src/index.ts` bypasses the `contracts/index.ts` and `repositories/index.ts` barrels (imports directly from the defining modules) to suppress Rollup chunk-circularity warnings in tsup's dts emit when `splitting: true` is on; adds a bare side-effect import `import "./contracts/handlers"` so handler registration survives tree-shaking. `sideEffects` array expanded to include both `src/` and the new flat `dist/` paths (`.js` + `.cjs`). `src/wallet/expo/expo-modules.d.ts` extended to cover `expo-sqlite` (boltz-swap's ambient `.d.ts` pattern, now covering all three soft-optional Expo peers); the prior tsconfig `exclude` of `src/repositories/indexedDB/websqlAdapter.ts` consequently dropped.

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — Quick Reference `Build Output` row clarified to flat `dist/` layout (per-entry `.js` / `.cjs` + `.d.ts` / `.d.cts`); `scripts` frontmatter adds `typecheck: "pnpm typecheck"` and `smoke_dist: "pnpm smoke:dist"`; Key Concepts gain a "Build (tsup)" entry
- `docs/projects/ts-sdk/system/project_overview.md` — Technology Stack `Build` row rewritten (tsup single-step, dual ESM+CJS, per-entry typings, `es2022`); `Bundler` row added pointing at `tsup ^8.5.0` (devDep)
- `docs/projects/ts-sdk/system/architecture.md` — Build Configuration block updated: target `es2020 → es2022`; output layout flat `dist/` (was `dist/esm/`, `dist/cjs/`, `dist/types/`); `tsup` entry list documented; `splitting: true` + `treeshake: true` rationale noted; post-build `smoke-dist.mjs` verification step added; `expo-modules.d.ts` line gains `expo-sqlite` ambient declaration
- `docs/projects/ts-sdk/sop/development-workflow.md` — Building section: single `pnpm build` (tsup) replaces the multi-step chain; Pre-commit Checklist gains `pnpm typecheck` (now CI-gated before build); Releasing notes that CI runs `smoke:dist` + `npm pack --dry-run` to verify publish shape
- `docs/projects/ts-sdk/testing/how_to_run.md` — Build section output paths updated (flat `dist/`); typecheck + smoke:dist scripts added
- `docs/projects/ts-sdk/testing/troubleshooting.md` — Build Issues: `rm -rf dist/` → `pnpm build` (tsup handles `clean: true` automatically); add a note that smoke:dist failures indicate dist shape regression (run locally with `pnpm smoke:dist`)
- `docs/INDEX.md` — ts-sdk Active Dev row gains a `tsup`-migration paragraph (single-step build, per-entry `.d.cts`, post-build `smoke-dist.mjs` + `npm pack --dry-run` CI gates, dropped `esbuild`/`glob`/`rimraf` devDeps); Tags add `tsup`, `dist-smoke-test`

**Notes**:
- No new `version` cut — `package.json` still reads `"0.4.27"`. The next published version will carry the build-system migration.
- No public TypeScript API changes — downstream consumers using documented `exports` subpaths are unaffected. The dist layout change only matters to consumers reaching into `dist/` directly (which they shouldn't).
- `pnpm-lock.yaml` was touched (devDep churn): `tsup` + transitive deps in, `esbuild` / `glob` / `rimraf` out.
- The `splitting: true` + `treeshake: true` config is load-bearing: it keeps `contractHandlers` a single runtime instance across all entries — the smoke test asserts singleton identity across both formats.

---

## 2026-05-20 - Post-0.4.27: Expo background-task subpath split (#487) + Node 24 LTS (#495)
**From**: `07785478edf31f2d0683f5664c1b5aa002d9eb6e`
**To**: `c0442fbf3aaafba226400981d15bbb14c658622e`
**Synced By**: update-project skill
**Status**: Two PRs landed on `main` after the 0.4.27 release tag; `package.json` `version` still reads `0.4.27` (no new version cut yet). Both changes are user-visible — one is breaking for Expo callers, the other widens supported Node range.

**Commits analyzed** (2 non-merge commits):
- `97d64ef` chore: upgrade to Node 24 LTS (#495) — adds `.nvmrc` pinned to `24.15.0`; CI workflows (`.github/workflows/ci.yml`, `tsdoc.yml`) bumped to Node 24; `engines.node` widened from `>=22.12.0 <23` to `>=22.12.0 <25` so downstream consumers still on Node 22.x are not broken (the PR explicitly widened the range as a follow-up fix in the same merge).
- `c0442fb` fix(wallet/expo): isolate expo-task-manager/expo-background-task to /wallet/expo/background (#487) — fixes #486. Splits background-task helpers out of `/wallet/expo` into a new `@arkade-os/sdk/wallet/expo/background` subpath (new `package.json` `exports` entry). The previous shape lazy-`require()`-d `expo-task-manager` / `expo-background-task` from inside `/wallet/expo` so they were invisible to Metro's static dependency collector and never entered the bundle graph. The new subpath uses static imports (Metro sees them) and isolates the imports to the only module that needs them so react-native-web and Node consumers using `/wallet/expo` don't pull the two native peer deps. **Breaking for Expo callers**: `defineExpoBackgroundTask` / `registerExpoBackgroundTask` / `unregisterExpoBackgroundTask` and `DefineBackgroundTaskOptions` / `PersistedBackgroundConfig` are no longer re-exported from `/wallet/expo`; `ExpoWallet.setup()` no longer registers the OS scheduler, and `dispose()` no longer unregisters it — consumer must call `registerExpoBackgroundTask(taskName, { minimumInterval })` after `setup()` and `unregisterExpoBackgroundTask(taskName)` before `dispose()`. `background` config dropped `taskName` + `minimumBackgroundInterval` (TS compile error on removed fields; JS callers must update manually — fields are silently ignored and the OS task never runs). New `src/wallet/expo/expo-modules.d.ts` carries ambient declarations for the subset of `expo-task-manager` / `expo-background-task` APIs `background.ts` actually uses, so `tsc` type-checks without pulling the optional peer deps into the build. `src/worker/expo/README.md` rewritten with the new usage shape and a Before/After table.

**Documentation Updates**:
- `docs/projects/ts-sdk/INDEX.md` — Key Concepts gain "Expo Subpath Split" and "Node Engines" entries; existing concepts untouched
- `docs/projects/ts-sdk/system/project_overview.md` — Core Features `Expo/React Native` row rewritten with the breaking-change details; Technology Stack adds a `Node` row (Node 24 LTS + widened `engines.node`); Export Paths table adds `/wallet/expo` and the new `/wallet/expo/background`
- `docs/projects/ts-sdk/system/architecture.md` — module tree gains `wallet/expo/{index,wallet,background,expo-modules.d.ts}.ts` subtree with annotation; Build Configuration adds bullets for the Expo subpath split and the Node engine bump
- `docs/projects/ts-sdk/sop/development-workflow.md` — Prerequisites Node version 18+ → Node 24 LTS (`.nvmrc` → `24.15.0`)
- `docs/projects/ts-sdk/testing/how_to_run.md` — Prerequisites Node version 18+ → Node 24 LTS
- `docs/INDEX.md` — ts-sdk Active Dev row prefixes the existing 0.4.27 release paragraph with the two post-release changes (Expo subpath split + Node 24); Tags add `expo-background-task`, `metro-bundler`, `node-24`

**Notes**:
- No new `version` cut — `package.json` still reads `"0.4.27"`. The next published version will carry both changes.
- `pnpm-lock.yaml` was not touched by either commit.
- Breaking change is **Expo callers only**; non-Expo consumers (Node, browser, RN-web, service worker) keep working unchanged on `/wallet/expo`.
- The `engines.node` widening (`<25`) is intentional — pinning to Node 24 only would break downstream apps that still run Node 22.x; the SDK itself develops on 24 (via `.nvmrc`) but ships compatible with both.

---

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

