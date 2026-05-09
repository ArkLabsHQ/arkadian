# Ark TypeScript SDK — Project Overview

## What is ts-sdk?

The Ark TypeScript SDK (`@arkade-os/sdk`) is the official client library for building Bitcoin wallets with Ark protocol support. It enables applications to create, manage, and transact with virtual UTXOs (VTXOs) — off-chain Bitcoin outputs that settle on-chain through Ark's batched round mechanism.

The SDK is designed to run across all JavaScript environments: browsers, Node.js, React Native/Expo, and service workers.

## Package

- **npm**: `@arkade-os/sdk`
- **Version**: 0.4.26
- **License**: MIT

## Core Features

| Feature | Description |
|---------|-------------|
| Wallet Management | Full signing (`Wallet`) and watch-only (`ReadonlyWallet`) wallets |
| Mainnet Defaults | `arkServerUrl` defaults to `DEFAULT_ARKADE_SERVER_URL` (`https://arkade.computer`); `OnchainWallet.create` defaults to `DEFAULT_NETWORK_NAME` (`bitcoin`); `ArkAddress` and `contractFromArkContractWithAddress` default HRP to `DEFAULT_ARKADE_HRP` (`ark`). `getArkadeServerUrl({ arkServerUrl })` helper resolves the value. |
| HD Identity | BIP39 mnemonics, BIP86 Taproot derivation paths; identities consume wildcard descriptor templates (`tr(.../0/*)`) |
| Descriptor Providers | `DescriptorProvider` allocator interface — `StaticDescriptorProvider` (single-key) and `HDDescriptorProvider` (HD receive rotation) |
| HD Receive Rotation | `HDDescriptorProvider.getNextSigningDescriptor()` allocates fresh descriptors via wallet-repo-persisted index, with cross-instance serialization through the shared `updateWalletState` mutex |
| VTXO Operations | Get balance, send, receive, settle, renew, recover VTXOs. Surgical cache reconciliation via `IContractManager.refreshOutpoints(outpoints)` (indexer-by-outpoint upserts, no full re-scan) — wired into `VTXO_ALREADY_SPENT` recovery on both renewal and periodic-settle paths, plus the service-worker `REFRESH_OUTPOINTS` proxy. `VtxoManager.revalidateBeforeSettle` pre-flights settle candidates so stale-cache rows are dropped before the intent flies (closes the 60-second `?after=created_at` blind-spot loop) |
| VTXO Ownership Gating | `src/contracts/vtxoOwnership.ts` helpers gate every contract-scoped read/write site so legacy address buckets cannot leak wrong-script rows. Background sync writers warn-and-skip; user-initiated wallet write paths throw. `updateDbAfterOffchainTx` / `updateDbAfterSettle` group spent rows by owning script and route each bucket to its contract's address (multi-contract spends no longer collapse into the primary bucket). `getVtxosFromRepo` fails fast on undecodable wallet addresses (was silently zeroing balance). Since 0.4.25 (Tier 2 of #480): `WalletRepository` exposes optional script-scoped methods (`getVtxosForScript` / `saveVtxosForScript` / `deleteVtxosForScript`) implemented by all SDK backends (InMemory, IndexedDB, Realm, SQLite); `getVtxosForContract` / `saveVtxosForContract` dispatch helpers in `vtxoOwnership.ts` route to them when present and fall back to Tier 1 address-bucket + filter for custom backends. `VtxoRepositoryKey = { script; address? }` carries both keys |
| Boarding/Offboarding | On-chain ↔ off-chain fund conversion via `Ramps` |
| Batch Settlement | Participate in Ark rounds with MuSig2 tree signing |
| Asset Management | Issue, reissue, burn, and transfer assets on Ark. **Breaking (0.4.23)**: `Asset.amount`, `AssetDetails.supply`, and `IssuanceParams` / `ReissuanceParams` / `BurnParams` `amount` are now `bigint` (was `number`) — supplies routinely exceed `Number.MAX_SAFE_INTEGER`. Persistence layer (`serializeAssets` / `deserializeAssets`) writes amounts as decimal strings while still accepting legacy `number` / `string` / `bigint` reads |
| Anchor / Sequence Helpers | `TxWeightEstimator` + `VSize` (fee/weight estimation), `timelockToSequence` / `sequenceToTimelock` (BIP68 sequence ↔ custom `RelativeTimelock`) re-exported from the package root since 0.4.23 |
| VTXO Delegation | Outsource renewal to delegator services |
| Unilateral Exit | Exit without server cooperation (unroll + timelock). Since 0.4.24 split into `prepareUnrollTransaction` (build + sign) and `completeUnroll` (broadcast); regtest-aware `tx.addOutputAddress(..., wallet.network)` so `bcrt1...` outputs no longer fail base58 decode. Centralised per-namespace `isScriptValid` helpers (return `true | Error`); `VtxoScript.exitPaths` correctly compares `=== true` so non-CSV leaves (e.g. ConditionCSVMultisig) route to ConditionCSV's decode rather than throwing in CSV's branch |
| Service Worker | Background wallet operation via `ServiceWorkerWallet` |
| Storage Adapters | InMemory, localStorage, IndexedDB, FileSystem, AsyncStorage |
| Expo/React Native | Dedicated providers for React Native streaming (SSE); peer ranges accept Expo SDK 55 unified majors |
| ArkNote | Serializable payment data format |
| Repository Pattern | Low-level VTXO and contract data access |

## Technology Stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript (ES2020 target) |
| Build | Dual ESM + CJS output with type declarations |
| Crypto | @noble/curves, @noble/secp256k1, @scure/bip32, @scure/bip39, @scure/btc-signer |
| Descriptors | @kukks/bitcoin-descriptors |
| Expression | @marcbachmann/cel-js (Common Expression Language) |
| Timelocks | bip68 (relative timelocks) |
| Testing | Vitest with v8 coverage |
| Formatting | Prettier |
| Package Manager | pnpm 10.29.2 (workspace) |
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
