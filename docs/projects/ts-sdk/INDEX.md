---
project_id: ts-sdk
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "testing/how_to_run.md"]
  debug:      ["testing/troubleshooting.md"]
  monitoring: ["testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md"]
scripts:
  build: "pnpm build"                          # root: pnpm -r build (both packages)
  build_ts_sdk: "pnpm -C packages/ts-sdk build"
  typecheck: "pnpm -C packages/ts-sdk typecheck"
  smoke_dist: "pnpm -C packages/ts-sdk smoke:dist"
  test: "pnpm test"                            # root: unit + integration, both packages
  test_unit: "pnpm test:unit"                  # root: pnpm -r test:unit
  test_unit_ts_sdk: "pnpm -C packages/ts-sdk test:unit"
  test_integration: "pnpm test:integration"    # root: ts-sdk cycle + boltz-swap cycle
  test_integration_ts_sdk: "pnpm test:integration:ts-sdk"
  format: "pnpm -C packages/ts-sdk format"
  lint: "pnpm lint"                            # root: pnpm -r lint
  regtest_up_ts_sdk: "pnpm regtest:up:ts-sdk"
  regtest_setup_ts_sdk: "pnpm regtest:setup:ts-sdk"
  regtest_down_ts_sdk: "pnpm regtest:down:ts-sdk"
  docs_build: "pnpm -C packages/ts-sdk docs:build"
  release_sdk: "pnpm run release -- sdk patch"          # SDK + mirrored boltz-swap patch
  release_boltz: "pnpm run release -- boltz-swap patch" # boltz-swap only
  release_all: "pnpm run release -- all patch"          # bump both
  release_dry_run: "pnpm release:dry-run"
---

# Ark TypeScript SDK — Project Index

**ts-sdk** is the official TypeScript SDK (`@arkade-os/sdk`) for the Ark protocol. It provides a complete client library for building Bitcoin wallets with Taproot and Ark virtual UTXO (VTXO) support. The SDK runs in browsers, Node.js, React Native/Expo, and service workers with pluggable storage adapters.

Since 2026-05-22 the repository is a **pnpm workspace monorepo** that vendors two published packages:

| Workspace path | npm package | Version | Purpose |
|----------------|-------------|---------|---------|
| `packages/ts-sdk/` | `@arkade-os/sdk` | `0.4.27` | This SDK (wallet, providers, crypto, repositories) — npm-published path inside the tarball is unchanged |
| `packages/boltz-swap/` | `@arkade-os/boltz-swap` | `0.3.32` | Sibling Boltz Lightning/chain-swap library (docs under `docs/projects/boltz-swap/`) |

devDeps, prettier config, `tsup` base config, and the `scripts/regtest.sh` regtest driver are hoisted to the repo root. Releases are package-scoped via `pnpm run release -- {sdk|boltz-swap|all} <bump>`.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/ts-sdk/system/` — System Architecture & Components
Core documentation about the TypeScript SDK architecture and design:

- **system/project_overview.md** — What the SDK is, features, supported platforms, and use cases
- **system/architecture.md** — Module structure, provider pattern, identity system, and crypto stack
- **system/integration-with-arkd.md** — How the SDK communicates with arkd via REST/SSE

### `${ARKADIAN_DIR}/docs/projects/ts-sdk/testing/` — Usage & Operations
Practical guides for using and operating the SDK:

- **testing/usage.md** — Quick start, wallet creation, sending/receiving, storage adapters
- **testing/how_to_run.md** — Running examples, regtest environment, docker-compose
- **testing/how_to_test.md** — Unit tests, integration tests, vitest configuration
- **testing/troubleshooting.md** — Common issues with crypto polyfills, SSE, service workers

### `${ARKADIAN_DIR}/docs/projects/ts-sdk/sop/` — Standard Operating Procedures
Step-by-step guides for operations:

- **sop/development-workflow.md** — Build, test, release, and PR workflow

### `${ARKADIAN_DIR}/docs/projects/ts-sdk/tasks/` — Product Requirements & Plans
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
| Package | `@arkade-os/sdk` |
| Version | `0.4.27` |
| Repo Layout | pnpm workspace monorepo — `packages/ts-sdk/` + `packages/boltz-swap/` (since 2026-05-22) |
| Language | TypeScript |
| Runtime | Browser, Node.js, React Native, Service Worker |
| Package Manager | pnpm 10.25.0 (workspace; root `engines.pnpm` `>=10.25.0 <11`) |
| Test Framework | Vitest |
| Build Tool | tsup ^8.5.0 (single step, dual ESM+CJS, per-entry `.d.ts` + `.d.cts`, target `es2022`; hoisted to root devDeps) |
| Build Output | Flat `packages/ts-sdk/dist/` — per-entry `.js` (ESM) + `.cjs` (CJS) + `.d.ts` (ESM types) + `.d.cts` (CJS types) + source maps |
| Release CLI | `pnpm run release -- {sdk\|boltz-swap\|all} <bump>` (driver: `scripts/release.sh` → `scripts/release.mjs`; gated on `pnpm test:unit`) |
| GitHub | `arkade-os/ts-sdk` |

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    @arkade-os/sdk                             │
├──────────────────────────────────────────────────────────────┤
│  Wallet Layer                                                │
│  ├── Wallet / ReadonlyWallet     (full + watch-only)         │
│  ├── ServiceWorkerWallet         (background operation)      │
│  ├── OnchainWallet               (on-chain fee payment)      │
│  ├── Ramps                       (onboard / offboard)        │
│  ├── VtxoManager                 (renewal / recovery)        │
│  ├── DelegatorManager            (VTXO delegation)           │
│  └── AssetManager                (issue / reissue / burn)    │
├──────────────────────────────────────────────────────────────┤
│  Identity Layer                                              │
│  ├── SingleKey                   (raw private key)           │
│  ├── SeedIdentity                (HD from seed; HDCapable)   │
│  ├── MnemonicIdentity            (HD from BIP39 mnemonic)    │
│  └── ReadonlyDescriptorIdentity  (xpub template, HD-aware)   │
├──────────────────────────────────────────────────────────────┤
│  Descriptor Providers                                        │
│  ├── DescriptorProvider          (allocator interface)       │
│  ├── StaticDescriptorProvider    (single-key wrapper)        │
│  ├── HDDescriptorProvider        (HD allocator + receive    │
│  │                                  rotator factory)         │
│  ├── WalletReceiveRotator        (boot lookup, rotation     │
│  │                                  chain, contract tagging) │
│  └── InputSignerRouter           (per-input signer dispatch) │
├──────────────────────────────────────────────────────────────┤
│  Provider Layer                                              │
│  ├── RestArkProvider             (arkd REST + SSE)           │
│  ├── RestIndexerProvider         (indexer REST + streaming)   │
│  ├── EsploraProvider             (HTTP block explorer)       │
│  ├── ElectrumOnchainProvider     (WebSocket Electrum)        │
│  ├── RestDelegatorProvider       (delegator REST)            │
│  └── Expo variants               (React Native adapters)     │
├──────────────────────────────────────────────────────────────┤
│  Crypto Layer                                                │
│  ├── MuSig2 (nonces, signing)                                │
│  ├── Tapscript (VTXO scripts, VHTLC, CSV/CLTV multisig)     │
│  ├── TxTree (tree construction, signing sessions)            │
│  └── Intent (proof generation)                               │
├──────────────────────────────────────────────────────────────┤
│  Storage Adapters                                            │
│  ├── InMemoryStorageAdapter      (default, ephemeral)        │
│  ├── LocalStorageAdapter         (browser)                   │
│  ├── IndexedDBStorageAdapter     (browser / service worker)  │
│  ├── FileSystemStorageAdapter    (Node.js)                   │
│  └── AsyncStorageAdapter         (React Native)              │
└──────────────────────────────────────────────────────────────┘
```

## Key Concepts

- **Mainnet Defaults**: `Wallet.create` / `ReadonlyWallet.create` / `ServiceWorkerWallet.create` default `arkServerUrl` to `DEFAULT_ARKADE_SERVER_URL` (`https://arkade.computer`); `OnchainWallet.create` defaults `networkName` to `DEFAULT_NETWORK_NAME` (`bitcoin`); `ArkAddress` and `contractFromArkContractWithAddress` default HRP to `DEFAULT_ARKADE_HRP` (`ark`). The `getArkadeServerUrl({ arkServerUrl })` helper resolves the URL with the same fallback
- **Wallet**: Full signing wallet (`Wallet`) or watch-only (`ReadonlyWallet`)
- **Identity**: Key management abstraction — SingleKey, SeedIdentity (HD), MnemonicIdentity. Seed-backed and watch-only identities take a wildcard descriptor template (`tr(.../0/*)`) and expose it as `identity.descriptor`
- **Descriptor Provider**: Pure rotating allocator (`getNextSigningDescriptor`) — `StaticDescriptorProvider` for single-key, `HDDescriptorProvider` for HD receive rotation. HD-capable providers can opt into the wallet's receive lifecycle by implementing `ReceiveRotatorFactory` (`createReceiveRotator` extension); the core `DescriptorProvider` contract stays free of wallet concerns so HSM-backed and other minimal providers don't have to know about rotation
- **HD Receive Rotation** *(post-0.4.26, re-merged in #489 after #488 revert)*: `WalletReceiveRotator` (`src/wallet/walletReceiveRotator.ts`) owns the `DescriptorProvider`, the `vtxo_received` subscription, the rotation chain mutex, the boot pubkey lookup, and the contract registration on rotate. Boot path: look up the active default/delegate contract tagged `metadata.source === 'wallet-receive'` matching the current `serverPubKey`; if found, reuse its pubkey (no provider call); else allocate index 0 via `provider.getNextSigningDescriptor()`. Rotation path: on each `vtxo_received` for the currently-tagged display contract, allocate next descriptor → rebuild `offchainTapscript` → register new tagged contract (`type: 'default'` or `'delegate'` matching the wallet's tapscript shape) → mark the prior tagged display `inactive` (the watcher keeps watching it while `lastKnownVtxos.size > 0` so funds in flight at the old address aren't lost). Rotations are serialized by an internal `_hdRotationChain` mutex; consecutive `rotate()` failures gate future attempts behind exponential backoff (1s → 2s → … → 60s cap, resets on success). Baseline multi-timelock matrix (default + delegate × every `walletContractTimelocks` entry) stays anchored to `identity.xOnlyPublicKey()` (index 0) on every boot — never re-registered at the rotated pubkey
- **WalletMode**: `WalletConfig.walletMode: 'auto' | 'static' | 'hd' | DescriptorProvider`. `'static'` skips HD wiring; `'hd'` requires an HD-capable identity with a rangeable descriptor (throws at `Wallet.create` otherwise — no silent fallback); passing a `DescriptorProvider` instance drives rotation through it (caller responsible for the identity matching). `'auto'` (default) is **explicitly short-term identical to `'static'`** until HD rotation has more soak time — flip-back criteria recorded under `TODO(hd-maturation)` in `resolveDescriptorProvider`. `ServiceWorkerWallet` only accepts the string forms (`ServiceWorkerWalletMode`) since the object form can't cross postMessage
- **Signing Router**: `InputSignerRouter` (`src/wallet/inputSignerRouter.ts`) dispatches per-input signing by looking up each input's owning contract. Rotated `default`/`delegate` contracts with a non-baseline owner are routed to `DescriptorProvider.signWithDescriptor` (using `metadata.signingDescriptor` persisted at rotation time); everything else (baseline owners, non-default/non-delegate contracts, the boarding script) goes to `Identity`. Inputs with no match are skipped silently. Throws `DescriptorSigningProviderMissingError` (no provider wired) or `MissingSigningDescriptorError` (rotated contract missing its persisted descriptor — wallet rotated on an earlier build). arkTx signing takes a per-input source-script override because checkpoint witnessUtxo scripts don't match the source VTXO's contract
- **VTXOs**: Virtual transaction outputs managed off-chain via Ark protocol. Cache reconciliation is surgical: `IContractManager.refreshOutpoints(outpoints)` queries the indexer by outpoint, annotates with the owning contract's tapscripts, and upserts at the contract address (no cursor change, no full re-scan). `VtxoManager.revalidateBeforeSettle` pre-flights candidates against the indexer before submitting `renewVtxos` / `runPeriodicSettle` so stale-cache VTXOs are dropped silently rather than driving 60-second `VTXO_ALREADY_SPENT` retry loops. Persisted VTXOs are gated by owning script via `src/contracts/vtxoOwnership.ts` so legacy address buckets cannot leak wrong-script rows or win txid:vout dedup
- **Ownership Gating**: `vtxoOwnership` helpers run at every contract-scoped read/write site; background sync writers warn-and-skip on unowned scripts, user-initiated wallet write paths throw. `updateDbAfterOffchainTx` / `updateDbAfterSettle` now group spent rows by owning script and route each bucket to its contract's address (multi-contract spends no longer collapse into the primary bucket); `getVtxosFromRepo` fails fast on undecodable wallet addresses (was silently zeroing balance). Since 0.4.25 (Tier 2 of #480), `WalletRepository` exposes optional script-scoped methods (`getVtxosForScript` / `saveVtxosForScript` / `deleteVtxosForScript`) implemented natively by all SDK backends (InMemory, IndexedDB, Realm, SQLite); `getVtxosForContract` / `saveVtxosForContract` dispatch helpers in `vtxoOwnership.ts` route to them when present and fall back to Tier 1 address-bucket + filter for custom backends. `VtxoRepositoryKey = { script; address? }` carries both keys (address still required by current backends)
- **Boarding**: Converting on-chain BTC to off-chain VTXOs
- **Settlement / Batch**: Participating in Ark rounds to settle VTXOs
- **Ramps**: Onboard (BTC→VTXO) and offboard (VTXO→BTC) operations
- **Delegation**: Outsourcing VTXO renewal to a third-party delegator service
- **Unilateral Exit**: Withdrawing funds without server cooperation via unroll + timelock. Since 0.4.24 the unroll flow splits `prepareUnrollTransaction` (build + sign, no broadcast) from `completeUnroll` (broadcast); `completeUnroll` passes `wallet.network` to `tx.addOutputAddress` so regtest bech32 (`bcrt1...`) addresses no longer fall through to mainnet base58 decoding. Tapscript validation centralised under per-namespace `isScriptValid` helpers returning `true | Error`; `VtxoScript.exitPaths` now checks `=== true` (truthy `Error` objects no longer route ConditionCSV scripts to CSV's decode)
- **Assets**: Issuing, reissuing, burning, and transferring assets on Ark. `Asset.amount`, `AssetDetails.supply`, and the `IssuanceParams` / `ReissuanceParams` / `BurnParams` `amount` fields are typed as `bigint` (since 0.4.23, breaking) so values above `Number.MAX_SAFE_INTEGER` round-trip without truncation; persistence goes through `serializeAssets` / `deserializeAssets` (decimal-string on-disk form, accepts legacy number/string/bigint inputs)
- **ArkNote**: Serializable representation of Ark payment data
- **Anchor / Sequence Helpers**: `TxWeightEstimator` and `VSize` (fee/weight estimation), `timelockToSequence` / `sequenceToTimelock` (BIP68 sequence ↔ `RelativeTimelock`) re-exported from the package root since 0.4.23
- **Expo Subpath Split** *(post-0.4.27, #487)*: Background-task helpers (`defineExpoBackgroundTask`, `registerExpoBackgroundTask`, `unregisterExpoBackgroundTask`, plus `DefineBackgroundTaskOptions` / `PersistedBackgroundConfig`) moved from `@arkade-os/sdk/wallet/expo` to a new `@arkade-os/sdk/wallet/expo/background` subpath. **Breaking for Expo callers**: previously these were re-exported from `/wallet/expo` and OS-task registration was performed by `ExpoWallet.setup()`; now `/wallet/expo` exposes only foreground APIs (`ExpoWallet`, `ExpoWalletConfig`, `ExpoBackgroundConfig`), `background` config no longer accepts `taskName` or `minimumBackgroundInterval`, and callers must invoke `registerExpoBackgroundTask(taskName, { minimumInterval })` after `setup()` and `unregisterExpoBackgroundTask(taskName)` before `dispose()`. The split exists because `expo-task-manager` / `expo-background-task` were lazy-`require()`-d before and Metro's static dependency collector never pulled them into the bundle graph; the new subpath uses static imports so Metro sees them — but isolates the imports to the only module that needs them, so react-native-web and Node consumers using `/wallet/expo` don't drag the two native peer deps into their bundles. Ambient declarations for the subset of `expo-task-manager` / `expo-background-task` APIs that `background.ts` uses live in `src/wallet/expo/expo-modules.d.ts` so `tsc` type-checks without pulling the optional peer deps into the build
- **Node Engines** *(post-0.4.27, #495)*: Repo bumped to Node 24 LTS — `.nvmrc` pins `24.15.0` and CI runs on Node 24. `engines.node` widened to `>=22.12.0 <25` (was `>=22.12.0 <23`) so downstream consumers still on Node 22.x are not broken
- **Build (tsup)** *(post-0.4.27, #496)*: Single-step build via `tsup` (`pnpm build`) replaces the prior `tsc + post-processors` chain (6 `tsc` invocations + `add-extensions` / `generate-package-files` / `build-browser` scripts, plus `tsconfig.cjs.json` / `tsconfig.esm.json` / `tsconfig.expo.json`). Output dist layout flattened: `./dist/<entry>.js` (ESM), `./dist/<entry>.cjs` (CJS), `./dist/<entry>.d.ts` (ESM types), `./dist/<entry>.d.cts` (CJS types), plus source maps. `package.json` `main` → `./dist/index.cjs`, `module` → `./dist/index.js`, `types` → `./dist/index.d.ts`; every `exports` subpath now has separate `import` / `require` conditions each pointing at the matching `.d.ts` / `.d.cts` and `.js` / `.cjs` pair. `tsup` is configured with `splitting: true` + `treeshake: true` (load-bearing: keeps `contractHandlers` a single runtime instance across entries — the smoke test asserts singleton identity) and `external` for the optional Expo + AsyncStorage peers. `tsconfig.json` repurposed as typecheck-only (`noEmit: true`, target `es2022`, `moduleResolution: bundler`); separate `pnpm typecheck` script (`tsc --noEmit`) runs in CI before `pnpm build`. New `scripts/smoke-dist.mjs` runs post-build (locally: `pnpm smoke:dist`; CI: after `pnpm build`) and asserts (a) every `package.json` `exports` target plus `main`/`module`/`types` exists on disk, (b) every relative import in `dist/**/*.d.{ts,cts}` resolves, (c) CJS + ESM `contractHandlers` singleton identity holds across the root entry and the `contracts/handlers` entry with registered types exactly `{default, delegate, vhtlc}`, (d) each Node-safe public subpath resolves via `@arkade-os/sdk`'s `exports` through a symlinked consumer, (e) `wallet/expo/background` stays structural-only (would eagerly require optional Expo peers at module init otherwise). CI also runs `npm pack --dry-run --ignore-scripts` to verify publish shape without re-running `prepack`. `src/index.ts` bypasses the `contracts/index.ts` and `repositories/index.ts` barrels (imports directly from defining modules) to suppress Rollup chunk-circularity warnings in tsup's dts emit with splitting on; a bare side-effect `import "./contracts/handlers"` is added so handler registration survives tree-shaking (and the src + dist paths are listed in `package.json` `sideEffects`). `src/wallet/expo/expo-modules.d.ts` extended to cover `expo-sqlite` alongside `expo-task-manager` / `expo-background-task` (the `boltz-swap` ambient-`.d.ts` pattern for soft-optional Expo peers); the prior `tsconfig` `exclude` of `src/repositories/indexedDB/websqlAdapter.ts` is consequently dropped — build is unconditional (no more `build:expo:check`). Dropped devDeps: `esbuild`, `glob`, `rimraf` (tsup brings its own); added devDep `tsup ^8.5.0`. No public TypeScript API changes; downstream consumers using documented `exports` subpaths are unaffected — only consumers reaching into the old `dist/esm/` / `dist/cjs/` / `dist/types/` subdirectories directly need to update their paths
