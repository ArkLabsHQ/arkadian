# Ark TypeScript SDK — Project Overview

## What is ts-sdk?

The Ark TypeScript SDK (`@arkade-os/sdk`) is the official client library for building Bitcoin wallets with Ark protocol support. It enables applications to create, manage, and transact with virtual UTXOs (VTXOs) — off-chain Bitcoin outputs that settle on-chain through Ark's batched round mechanism.

The SDK is designed to run across all JavaScript environments: browsers, Node.js, React Native/Expo, and service workers.

## Monorepo Layout

Since 2026-05-22 the `arkade-os/ts-sdk` repository is a **pnpm workspace monorepo** (`pnpm-workspace.yaml`) that ships two published packages:

| Workspace path | Published as | Version (at HEAD) | Role |
|----------------|--------------|-------------------|------|
| `packages/ts-sdk/` | `@arkade-os/sdk` | `0.4.27` | This SDK — what the rest of this doc describes |
| `packages/boltz-swap/` | `@arkade-os/boltz-swap` | `0.3.32` | Sibling Boltz Lightning/chain-swap library; depends on `@arkade-os/sdk` via `workspace:*` (see `docs/projects/boltz-swap/`) |

- **devDeps hoisted to root**: `tsup`, `vitest`, `typescript`, `prettier`, `husky`, `@types/node`, `fake-indexeddb`, `eventsource`. Per-package `package.json` keeps only package-unique deps.
- **Shared base configs**: root `tsconfig.base.json`, root prettier config, root `tsup` base extended per-package.
- **Single regtest driver**: `scripts/regtest.sh <ts-sdk|boltz-swap> <up|setup|test|down|reset|cycle>` from the repo root. Each package supplies its own `.env.regtest`.
- **Package-scoped releases**: `pnpm run release -- sdk patch` (SDK + dependent boltz-swap patch), `pnpm run release -- boltz-swap patch` (Boltz-only bugfix), `pnpm run release -- sdk prepatch --preid beta` (mirrors prerelease into boltz-swap), `pnpm run release -- all patch` (bump both). Driver: `scripts/release.sh` → `scripts/release.mjs`; gated on `pnpm test:unit` (monorepo-wide) before publish.
- **Single `bip68` ambient declaration** hoisted to the monorepo root (was duplicated per-package).
- **No published API impact**: the npm-published `@arkade-os/sdk` tarball path is unchanged; downstream consumers installing from npm are unaffected by the workspace shape.

## Package

- **npm**: `@arkade-os/sdk`
- **Workspace path**: `packages/ts-sdk/`
- **Version**: 0.4.27
- **License**: MIT

## Core Features

| Feature | Description |
|---------|-------------|
| Wallet Management | Full signing (`Wallet`) and watch-only (`ReadonlyWallet`) wallets |
| Mainnet Defaults | `arkServerUrl` defaults to `DEFAULT_ARKADE_SERVER_URL` (`https://arkade.computer`); `OnchainWallet.create` defaults to `DEFAULT_NETWORK_NAME` (`bitcoin`); `ArkAddress` and `contractFromArkContractWithAddress` default HRP to `DEFAULT_ARKADE_HRP` (`ark`). `getArkadeServerUrl({ arkServerUrl })` helper resolves the value. |
| HD Identity | BIP39 mnemonics, BIP86 Taproot derivation paths; identities consume wildcard descriptor templates (`tr(.../0/*)`); structural type guard `isHDCapableIdentity()` for capability-based branching without coupling to a concrete identity class |
| Descriptor Providers | `DescriptorProvider` allocator interface — `StaticDescriptorProvider` (single-key) and `HDDescriptorProvider` (HD receive rotation). Opt-in `ReceiveRotatorFactory` extension lets providers participate in the wallet's receive lifecycle; the core contract stays minimal so HSM-backed and other minimal providers don't have to know about rotation |
| HD Receive Rotation | `HDDescriptorProvider.getNextSigningDescriptor()` allocates fresh descriptors via wallet-repo-persisted index (cross-instance serialized through the shared `updateWalletState` mutex); `getCurrentSigningDescriptor()` re-derives at the last-used index without advancing for stable boot replay. `WalletReceiveRotator` (`src/wallet/walletReceiveRotator.ts`) owns the receive lifecycle: subscribes to `vtxo_received`, serializes rotations through an internal mutex, tags the active display contract `metadata.source = 'wallet-receive'`, marks the prior display `inactive` on rotation (watcher keeps it while `lastKnownVtxos.size > 0`), and registers fresh `default`/`delegate` contracts matching the wallet's tapscript shape. Boot baseline matrix is anchored to `identity.xOnlyPublicKey()` (index 0) regardless of rotation state. Failed rotations gate retries behind exponential backoff (1s → 60s cap) and surface a typed `NonRangeableDescriptorError` for the silent-fallback path |
| Wallet Mode | `WalletConfig.walletMode: 'auto' \| 'static' \| 'hd' \| DescriptorProvider`. `'auto'` (default) **currently behaves like `'static'`** — HD rotation is opt-in until it has more soak time (`TODO(hd-maturation)` flip-back criteria recorded in `resolveDescriptorProvider`). `'hd'` requires an HD-capable identity with a rangeable descriptor (no silent fallback). Object form forwards rotation through a custom provider; the polymorphic type makes contradictory `static + provider` combos structurally unrepresentable. `ServiceWorkerWalletMode = 'auto' \| 'static' \| 'hd'` (string-only because the provider object can't cross postMessage) |
| Per-Input Signing Router | `InputSignerRouter` (`src/wallet/inputSignerRouter.ts`) dispatches each PSBT input to the correct signer by looking up its owning contract. Rotated `default`/`delegate` contracts with a non-baseline owner route to `DescriptorProvider.signWithDescriptor` (using `metadata.signingDescriptor` persisted at rotation time); everything else routes to `Identity`. Throws `DescriptorSigningProviderMissingError` / `MissingSigningDescriptorError` (both exported from the package root) on misconfiguration |
| VTXO Operations | Get balance, send, receive, settle, renew, recover VTXOs. Surgical cache reconciliation via `IContractManager.refreshOutpoints(outpoints)` (indexer-by-outpoint upserts, no full re-scan) — wired into `VTXO_ALREADY_SPENT` recovery on both renewal and periodic-settle paths, plus the service-worker `REFRESH_OUTPOINTS` proxy. `VtxoManager.revalidateBeforeSettle` pre-flights settle candidates so stale-cache rows are dropped before the intent flies (closes the 60-second `?after=created_at` blind-spot loop) |
| VTXO Ownership Gating | `src/contracts/vtxoOwnership.ts` helpers gate every contract-scoped read/write site so legacy address buckets cannot leak wrong-script rows. Background sync writers warn-and-skip; user-initiated wallet write paths throw. `updateDbAfterOffchainTx` / `updateDbAfterSettle` group spent rows by owning script and route each bucket to its contract's address (multi-contract spends no longer collapse into the primary bucket). `getVtxosFromRepo` fails fast on undecodable wallet addresses (was silently zeroing balance). Since 0.4.25 (Tier 2 of #480): `WalletRepository` exposes optional script-scoped methods (`getVtxosForScript` / `saveVtxosForScript` / `deleteVtxosForScript`) implemented by all SDK backends (InMemory, IndexedDB, Realm, SQLite); `getVtxosForContract` / `saveVtxosForContract` dispatch helpers in `vtxoOwnership.ts` route to them when present and fall back to Tier 1 address-bucket + filter for custom backends. `VtxoRepositoryKey = { script; address? }` carries both keys |
| Boarding/Offboarding | On-chain ↔ off-chain fund conversion via `Ramps` |
| Batch Settlement | Participate in Ark rounds with MuSig2 tree signing |
| Asset Management | Issue, reissue, burn, and transfer assets on Ark. **Breaking (0.4.23)**: `Asset.amount`, `AssetDetails.supply`, and `IssuanceParams` / `ReissuanceParams` / `BurnParams` `amount` are now `bigint` (was `number`) — supplies routinely exceed `Number.MAX_SAFE_INTEGER`. Persistence layer (`serializeAssets` / `deserializeAssets`) writes amounts as decimal strings while still accepting legacy `number` / `string` / `bigint` reads |
| Anchor / Sequence Helpers | `TxWeightEstimator` + `VSize` (fee/weight estimation), `timelockToSequence` / `sequenceToTimelock` (BIP68 sequence ↔ custom `RelativeTimelock`) re-exported from the package root since 0.4.23 |
| VTXO Delegation | Outsource renewal to delegator services |
| Unilateral Exit | Exit without server cooperation (unroll + timelock). Since 0.4.24 split into `prepareUnrollTransaction` (build + sign) and `completeUnroll` (broadcast); regtest-aware `tx.addOutputAddress(..., wallet.network)` so `bcrt1...` outputs no longer fail base58 decode. Centralised per-namespace `isScriptValid` helpers (return `true | Error`); `VtxoScript.exitPaths` correctly compares `=== true` so non-CSV leaves (e.g. ConditionCSVMultisig) route to ConditionCSV's decode rather than throwing in CSV's branch. `prepareUnrollTransaction` `Math.ceil`s the fee rate before `BigInt(...)` so fractional sat/vB rates returned by Esplora/bitcoind regtest no longer throw `RangeError` |
| Service Worker | Background wallet operation via `ServiceWorkerWallet` |
| Storage Adapters | InMemory, localStorage, IndexedDB, FileSystem, AsyncStorage |
| Expo/React Native | Dedicated providers for React Native streaming (SSE); peer ranges accept Expo SDK 55 unified majors. Background-task helpers live on a separate `/wallet/expo/background` subpath (post-0.4.27, #487) — static imports keep `expo-task-manager` / `expo-background-task` invisible to Metro's static dependency collector only on the subpath that needs them. **Breaking for Expo callers**: `defineExpoBackgroundTask` / `registerExpoBackgroundTask` / `unregisterExpoBackgroundTask` and `DefineBackgroundTaskOptions` / `PersistedBackgroundConfig` are re-exported only from `@arkade-os/sdk/wallet/expo/background`; `ExpoWallet.setup()` no longer registers the OS scheduler (consumer must call `registerExpoBackgroundTask(taskName, { minimumInterval })` explicitly); `dispose()` no longer unregisters (consumer calls `unregisterExpoBackgroundTask(taskName)`); `background` config dropped `taskName` + `minimumBackgroundInterval` (TS compile error; JS callers must update manually — fields are silently ignored and the OS task never runs). Ambient declarations for the two `expo-*` modules live in `src/wallet/expo/expo-modules.d.ts` so the optional peer deps can be type-checked without entering the build |
| ArkNote | Serializable payment data format |
| Repository Pattern | Low-level VTXO and contract data access |

## Technology Stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript (ES2022 target since #496; was ES2020 under the prior `tsc` build) |
| Build | `tsup` ^8.5.0 — single-step dual ESM+CJS, per-entry `.d.ts` (ESM types) + `.d.cts` (CJS types), source maps, `splitting: true` + `treeshake: true`. Replaces the prior 6-step `tsc` chain + `add-extensions` / `generate-package-files` post-processors (#496). Output flattened to `dist/<entry>.{js,cjs,d.ts,d.cts}` (was `dist/{esm,cjs,types}/`). Post-build `scripts/smoke-dist.mjs` + `npm pack --dry-run` gate publish shape in CI. Type-check is a separate `pnpm typecheck` (`tsc --noEmit`) wired into CI before build |
| Crypto | @noble/curves, @noble/secp256k1, @scure/bip32, @scure/bip39, @scure/btc-signer |
| Descriptors | @kukks/bitcoin-descriptors |
| Expression | @marcbachmann/cel-js (Common Expression Language) |
| Timelocks | bip68 (relative timelocks) |
| Testing | Vitest with v8 coverage |
| Formatting | Prettier |
| Package Manager | pnpm 10.25.0 (workspace; root `engines.pnpm` `>=10.25.0 <11`) |
| Node | Node 24 LTS pinned via `.nvmrc` (`24.15.0`); `engines.node` widened to `>=22.12.0 <25` so downstream consumers on Node 22.x are not broken (#495) |
| Documentation | TypeDoc |
| Versioning | Manual with `pnpm release` |

## Supported Platforms

| Platform | Storage Adapter | Notes |
|----------|----------------|-------|
| Browser / PWA | LocalStorageAdapter, IndexedDBStorageAdapter | Standard fetch/EventSource |
| Node.js | FileSystemStorageAdapter | File-based persistence |
| React Native / Expo | AsyncStorageAdapter | Requires expo-crypto polyfill, ExpoArkProvider/ExpoIndexerProvider for SSE |
| Service Worker | IndexedDBStorageAdapter | `ServiceWorkerWallet` with message-based communication |

## Export Paths

The SDK provides multiple entry points:

| Path | Purpose |
|------|---------|
| `@arkade-os/sdk` | Main SDK — wallets, providers, crypto, types |
| `@arkade-os/sdk/adapters/localStorage` | Browser localStorage adapter |
| `@arkade-os/sdk/adapters/indexedDB` | IndexedDB adapter (browser + service worker) |
| `@arkade-os/sdk/adapters/fileSystem` | Node.js file system adapter |
| `@arkade-os/sdk/adapters/asyncStorage` | React Native AsyncStorage adapter |
| `@arkade-os/sdk/adapters/expo` | Expo-compatible providers (ExpoArkProvider, ExpoIndexerProvider) |
| `@arkade-os/sdk/wallet/expo` | Foreground Expo wallet (`ExpoWallet`, `ExpoWalletConfig`, `ExpoBackgroundConfig`) |
| `@arkade-os/sdk/wallet/expo/background` | OS-task helpers (`defineExpoBackgroundTask`, `registerExpoBackgroundTask`, `unregisterExpoBackgroundTask`) — split out post-0.4.27 (#487) so non-Expo consumers don't pull `expo-task-manager` / `expo-background-task` into their bundle graph |

## Use Cases

1. **Web Wallet** — Browser-based Bitcoin + Ark wallet with localStorage/IndexedDB
2. **Mobile Wallet** — React Native/Expo app with AsyncStorage and expo-crypto
3. **Background Wallet** — Service worker for persistent background operation
4. **Watch-Only** — Monitor balances without signing capability
5. **SDK Integration** — Embed Ark payments into existing applications
6. **Asset Issuance** — Create and manage custom assets on the Ark protocol

## Integration Points

- **arkd**: REST API + SSE for settlement events, transaction submission, and info queries
- **Indexer**: REST + streaming for address subscriptions, VTXO updates, transaction history
- **Esplora**: On-chain block explorer for UTXO lookups and transaction broadcasting (default `ESPLORA_URL` map points at Ark Labs–operated mempool deployments for bitcoin/signet/mutinynet)
- **Electrum**: WebSocket Electrum (`ElectrumOnchainProvider`) as an alternative onchain provider; `ELECTRUM_WS_URL` defaults to Ark Labs Fulcrum 2.1 endpoints (which support `broadcast_package` for atomic 1P1C TRUC relay), with electrs-compatible fallbacks (no `verbose` transaction.get usage); `ELECTRUM_TCP_HOST` provided for Node-side TCP transports
- **Delegator**: REST API for VTXO delegation (renewal outsourcing)
- **Nigiri**: Local Bitcoin regtest environment for integration testing (electrum-ws bridge on port 50003)
