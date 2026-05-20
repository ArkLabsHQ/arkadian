# Ark TypeScript SDK — Architecture

## Module Structure

```
src/
├── index.ts                 # Main exports (~400 lines of re-exports)
├── networks.ts              # Network definitions (mainnet, testnet, regtest, mutinynet)
├── forfeit.ts               # Forfeit transaction construction
│
├── wallet/                  # Wallet implementations
│   ├── wallet.ts            # Wallet, ReadonlyWallet, waitForIncomingFunds; per-script persistence in updateDbAfterOffchainTx / updateDbAfterSettle (rows grouped by owning script, routed to each contract's address); fail-fast on undecodable wallet address in getVtxosFromRepo; `extractArkProviderUrl(provider)` structurally reads `serverUrl` off the injected ArkProvider so the indexer is built from the same host as a custom arkProvider (no longer silently paired with the public arkade.computer default). `WalletConfig.walletMode` (auto|static|hd|DescriptorProvider) drives receive-rotation wiring through WalletReceiveRotator. `offchainTapscript` exposed as a getter over a `protected` backing field; the only sanctioned write is `setOffchainTapscriptForRotation` (@internal, on the RotatableWallet surface). `updateDbAfterOffchainTx` / `_sendImpl` / `sendBitcoin` snapshot `offchainTapscript` synchronously at `_txLock` entry so a concurrent `rotate()` cannot stamp the change VTXO with mixed scripts. `signInputsByOwner` removed in favour of the InputSignerRouter; signing entry points hand the router explicit InputSigningJob[] derived from the source VTXO script. `getVtxoManager` caches the manager only AFTER `_receiveRotator.install` resolves (failing install leaves the cache untouched). `dispose` wraps rotator teardown in try/catch and rethrows after manager + super disposal so a rotator failure can't leak the contract watcher
│   ├── onchain.ts           # OnchainWallet (on-chain fee payment, anchor bumping)
│   ├── ramps.ts             # Ramps (onboard/offboard)
│   ├── batch.ts             # Batch session (round participation, tree signing)
│   ├── vtxo-manager.ts      # VtxoManager (renewal, recovery, expiry monitoring); revalidateBeforeSettle pre-flight + maybeRefreshAfterVtxoSpent reactive recovery on VTXO_ALREADY_SPENT (surgical refreshOutpoints, falls back to refreshVtxos when no outpoint metadata)
│   ├── delegator.ts         # DelegatorManager (VTXO delegation to third-party); `delegate` filter uses an `isAnnotated` type guard narrowing `ContractVtxo` to `ContractVtxo & ExtendedVirtualCoin` (checks `tapTree`, `forfeitTapLeafScript`, `intentTapLeafScript`) instead of an unsafe `as ExtendedVirtualCoin` cast
│   ├── asset-manager.ts     # AssetManager (issue, reissue, burn)
│   ├── asset.ts             # Asset types and helpers
│   ├── unroll.ts            # Unroll (unilateral exit) — prepareUnrollTransaction (build + sign) split from completeUnroll (broadcast); completeUnroll passes wallet.network to addOutputAddress for regtest bech32 support; Math.ceil(feeRate) before BigInt() to tolerate fractional sat/vB
│   ├── utils.ts             # Wallet utilities
│   ├── hdDescriptorProvider.ts # HDDescriptorProvider — allocator (getNextSigningDescriptor) + ReceiveRotatorFactory (createReceiveRotator delegates to WalletReceiveRotator.defaultBoot); getCurrentSigningDescriptor re-derives last-used index without advancing for stable boot replay
│   ├── walletReceiveRotator.ts # WalletReceiveRotator — owns DescriptorProvider + vtxo_received subscription + rotation chain + boot pubkey lookup (pickActiveReceive) + contract registration on rotate. WALLET_RECEIVE_SOURCE = 'wallet-receive' tag on the active display contract. ReceiveRotatorFactory / ReceiveRotatorBoot / ReceiveRotatorBootOpts interfaces; hasReceiveRotatorFactory duck-typed guard. resolveDescriptorProvider TODO(hd-maturation) keeps 'auto' === 'static' until soak time builds. Exponential backoff (1s → 60s cap) on consecutive rotate() failures. Pluggable Logger interface. NonRangeableDescriptorError typed error replaces the prior wildcard-descriptor string match
│   ├── inputSignerRouter.ts # InputSignerRouter — per-input signer dispatch. InputSigningJob { index; lookupScript }. Routes default/delegate contracts with non-baseline owner → DescriptorProvider.signWithDescriptor (uses metadata.signingDescriptor); everything else → Identity; unmatched inputs skipped silently
│   ├── signingErrors.ts     # DescriptorSigningProviderMissingError, MissingSigningDescriptorError — both re-exported from src/index.ts
│   ├── expo/                # Expo / React Native wallet
│   │   ├── index.ts         # Foreground entrypoint — re-exports ExpoWallet, ExpoWalletConfig, ExpoBackgroundConfig only (no background helpers — these moved to /wallet/expo/background in #487)
│   │   ├── wallet.ts        # ExpoWallet (foreground polling, AsyncStorage-persisted config for background rehydration); setup() no longer registers the OS scheduler; dispose() no longer unregisters it (caller responsibility)
│   │   ├── background.ts    # /wallet/expo/background subpath — defineExpoBackgroundTask / registerExpoBackgroundTask / unregisterExpoBackgroundTask, DefineBackgroundTaskOptions / PersistedBackgroundConfig; uses static `import * from "expo-task-manager"` / `"expo-background-task"` so Metro sees them in the static dependency graph (lazy require() in the previous shape was invisible to the collector, #486). Only module in the package that imports the two expo-* optional peer deps
│   │   └── expo-modules.d.ts # Ambient declarations for expo-task-manager + expo-background-task (the subset of APIs background.ts uses) so tsc type-checks without pulling the optional peer packages into the build
│   └── serviceWorker/       # Service worker wallet
│       ├── wallet.ts        # ServiceWorkerWallet, ServiceWorkerReadonlyWallet
│       ├── worker.ts        # Worker (runs in service worker context)
│       ├── request.ts       # Request serialization
│       ├── response.ts      # Response serialization
│       ├── wallet-message-handler.ts # Service-worker proxy handlers (incl. REFRESH_OUTPOINTS message for surgical VTXO_ALREADY_SPENT recovery)
│       └── utils.ts         # Service worker registration helpers
│
├── identity/                # Key management
│   ├── index.ts             # Identity, ReadonlyIdentity, BatchSignableIdentity interfaces
│   ├── singleKey.ts         # SingleKey (raw private key), ReadonlySingleKey
│   ├── seedIdentity.ts      # SeedIdentity, MnemonicIdentity, ReadonlyDescriptorIdentity
│   ├── hdCapableIdentity.ts # HDCapableIdentity / ReadonlyHDCapableIdentity (capability markers); isHDCapableIdentity(value) structural type guard checks descriptor + isOurs + signWithDescriptor + signMessageWithDescriptor. The four descriptor-aware methods on identity (isOurs, signWithDescriptor, signMessageWithDescriptor) are now @deprecated on both interface and SeedIdentity/ReadonlyDescriptorIdentity — kept only as backing for DescriptorProvider implementations; callers should go through DescriptorProvider
│   ├── descriptor.ts        # Shared descriptor helpers (isMainnetDescriptor, descriptorIsOurs, parseHDDescriptor)
│   ├── descriptorProvider.ts # DescriptorProvider interface (getNextSigningDescriptor, isOurs, signWithDescriptor)
│   ├── staticDescriptorProvider.ts # StaticDescriptorProvider (single-key wrapper)
│   └── serialize.ts         # Identity serialize/hydrate (envelope.descriptor stores wildcard template)
│
├── providers/               # External service communication
│   ├── ark.ts               # RestArkProvider (arkd REST + SSE)
│   ├── indexer.ts           # RestIndexerProvider (indexer REST + streaming)
│   ├── onchain.ts           # EsploraProvider + ESPLORA_URL defaults (Ark Labs mempool deployments)
│   ├── electrum.ts          # ElectrumOnchainProvider (WebSocket Electrum) + ELECTRUM_WS_URL / ELECTRUM_TCP_HOST defaults
│   ├── delegator.ts         # RestDelegatorProvider (delegator REST)
│   ├── expoArk.ts           # ExpoArkProvider (React Native SSE)
│   ├── expoIndexer.ts       # ExpoIndexerProvider (React Native streaming)
│   ├── expoUtils.ts         # Expo streaming utilities
│   ├── errors.ts            # ArkError, error handling
│   └── utils.ts             # Provider utilities
│
├── script/                  # Bitcoin script construction
│   ├── base.ts              # VtxoScript, TapLeafScript, TapTreeCoder, getSequence; VtxoScript.exitPaths now compares isScriptValid === true (prior truthy check routed ConditionCSV leaves to CSV's decode)
│   ├── address.ts           # ArkAddress encoding/decoding
│   ├── default.ts           # DefaultVtxo script
│   ├── delegate.ts          # Delegation script
│   ├── tapscript.ts         # Tapscript types (CSV, CLTV, Condition multisig variants); per-namespace isScriptValid helpers returning true | Error, shared getVerifyIndex between condition tapscripts
│   └── vhtlc.ts             # VHTLC (Virtual Hash Time-Locked Contract)
│
├── contracts/               # Contract orchestration
│   ├── types.ts             # ContractVtxo (raw-from-indexer, `Partial<TapLeaves & EncodedVtxoScript>`) and ExtendedContractVtxo (annotated, ExtendedVirtualCoin & { contractScript }) — the latter is the post-`annotateVtxos` shape used at save and forfeit-construction sites; both ContractWithVtxos and the ContractManager internal bulk-fetch helpers now return ExtendedContractVtxo. Public export added in this cycle
│   ├── contractManager.ts   # IContractManager + impl; refreshOutpoints(outpoints) for surgical indexer-by-outpoint upserts at the contract address. Internal `getVtxosForContracts` / `fetchContractVtxosBulk` / `fetchContractVxosFromIndexer` typed `ExtendedContractVtxo[]` (dropped the unsafe `as ContractVtxo` casts)
│   ├── contractWatcher.ts   # SSE-driven watcher; seedLastKnownVtxos baseline now script-gated (legacy wrong-script rows no longer seed phantom vtxo_spent events); extend-vtxo accumulator typed `ContractVtxo[]` (compile-time drift catch), extend-failure log now includes `txid:vout` + caught error for production grep-ability
│   └── vtxoOwnership.ts     # Ownership-gating helpers — applied at every contract-scoped read/write site so legacy address buckets cannot leak wrong-script rows or win txid:vout dedup; throw on user paths, warn-and-skip on background sync. Since 0.4.25 (Tier 2 of #480): `getVtxosForContract` / `saveVtxosForContract` dispatch helpers route to optional `getVtxosForScript` / `saveVtxosForScript` when the repo backend implements them, otherwise fall back to Tier 1 address-bucket read + `filterVtxosForScript` (with `validateVtxosForScript` on the save fallback). Used by `wallet.ts` (`updateDbAfterOffchainTx` / `updateDbAfterSettle`), `contractManager.ts` (`fetchContractVtxos`, `reconcilePendingFrontier`, `fetchContractVxosFromIndexer`, `getContractVtxos`), and `contractWatcher.ts` (`seedLastKnownVtxos` baseline)
│
├── musig2/                  # MuSig2 distributed signing
│   ├── index.ts             # MuSig2 module exports
│   ├── keys.ts              # Key aggregation
│   ├── nonces.ts            # Nonce generation and aggregation
│   └── sign.ts              # Partial signature creation
│
├── tree/                    # Transaction tree construction
│   ├── txTree.ts            # TxTree, TxTreeNode
│   ├── signingSession.ts    # SignerSession, TreeNonces, TreePartialSigs
│   └── validation.ts        # validateVtxoTxGraph, validateConnectorsTxGraph
│
├── intent/                  # Intent proof generation
│   └── index.ts             # Intent class
│
├── arknote/                 # ArkNote serialization
│   └── index.ts             # ArkNote class
│
├── arkfee/                  # Ark fee calculation
│   └── ...
│
├── asset/                   # Asset module
│   └── ...
│
├── repositories/            # Data access layer
│   ├── index.ts             # Repository interfaces
│   ├── walletRepository.ts  # WalletRepository interface — Tier 2 script-scoped methods (`getVtxosForScript` / `saveVtxosForScript` / `deleteVtxosForScript`) marked optional + `VtxoRepositoryKey = { script; address? }` since 0.4.25; backends (`inMemory/`, `indexedDB/`, `realm/`, `sqlite/`) all implement the optional methods natively (IndexedDB uses the `script` index + outpoint dedup with `shouldReplaceVtxo` tiebreaker; SQL uses `WHERE script = ?`; Realm uses `filtered("script == $0", ...)`). DB errors in `getVtxosForScript` are re-thrown rather than swallowed to `[]`
│   ├── contractRepository.ts # ContractRepositoryImpl (contract data, collections)
│   └── serialization.ts     # SerializedAsset / serializeAssets / deserializeAssets (bigint→decimal-string round-trip; legacy number/string accepted on read)
│
├── storage/                 # Storage adapter interface
│   └── ...
│
├── adapters/                # Platform-specific storage
│   ├── localStorage.ts      # Browser localStorage
│   ├── indexedDB.ts          # Browser/SW IndexedDB
│   ├── fileSystem.ts         # Node.js file system
│   ├── asyncStorage.ts       # React Native AsyncStorage
│   └── expo.ts              # Expo adapter re-exports
│
├── types/                   # Shared type definitions
│   └── ...
│
└── utils/                   # Utility functions
    ├── transaction.ts       # Transaction construction
    ├── arkTransaction.ts    # Off-chain tx building, tapscript signature verification
    ├── unknownFields.ts     # PSBT custom fields (VtxoTaprootTree, CosignerPublicKey, etc.)
    ├── anchor.ts            # P2A (Pay-to-Anchor) and AnchorBumper
    ├── timelock.ts          # Centralized BIP68 helpers — `timelockToSequence` / `sequenceToTimelock` (RelativeTimelock ↔ sequence number); single `bip68` import site, consumed by `script/base.ts`, `script/tapscript.ts`, `utils/unknownFields.ts`, `wallet/wallet.ts`, `wallet/unroll.ts`, and re-exported from the package root since 0.4.23
    └── txSizeEstimator.ts   # TxWeightEstimator + VSize type (fee estimation, re-exported from package root since 0.4.23)
```

## Design Patterns

### Provider Pattern

All external communication is abstracted behind provider interfaces:

- `ArkProvider` — arkd server (settlement events, transaction submission, info)
- `IndexerProvider` — Indexer (address subscriptions, VTXO updates, tx history)
- `OnchainProvider` — Block explorer (UTXOs, transactions, broadcasting)
- `DelegatorProvider` — Delegator service (VTXO renewal delegation)

Each provider has a REST implementation (`RestArkProvider`, etc.) and Expo-compatible variants for React Native.

### Identity Abstraction

The `Identity` interface decouples key management from wallet logic:

- `SingleKey` — Raw private key (simplest, for testing/prototyping)
- `SeedIdentity` — HD wallet from raw seed bytes with BIP86 derivation; `implements HDCapableIdentity`
- `MnemonicIdentity` — HD wallet from BIP39 mnemonic phrase (extends `SeedIdentity`)
- `ReadonlyDescriptorIdentity` — Watch-only from xpub-derived account descriptor template; `implements ReadonlyHDCapableIdentity`

Derivation path: `m/86'/{coinType}'/0'/0/*` (BIP86 Taproot, wildcard template).

Seed-backed and watch-only identities are now conceptually HD wallets and consume a wildcard-suffixed account descriptor template (e.g. `tr([fp/86'/0'/0']xpub/0/*)`). The public `descriptor` field carries that template; consumers materialize a concrete descriptor at index N via the descriptor library (`expand({ descriptor, network, index }).canonicalExpression`). The wire format (`SerializedSigningIdentity.descriptor` / `SerializedReadonlyIdentity.descriptor`) also stores the template; older envelopes carrying concrete `/N)` descriptors continue to deserialize via `templateOf` chop.

### Descriptor Provider Pattern

`DescriptorProvider` is a pure rotating allocator decoupled from "current state":

- `getNextSigningDescriptor()` — allocates and returns a fresh signing descriptor on each call (HD rotates the index, single-key returns the same descriptor)
- `isOurs(descriptor)` — descriptor-membership predicate
- `signWithDescriptor(requests)` / `signMessageWithDescriptor(...)` — descriptor-keyed signing

Implementations:

- `StaticDescriptorProvider` — wraps a legacy `Identity` with a single fixed descriptor.
- `HDDescriptorProvider` (`src/wallet/`) — backed by `HDCapableIdentity`; persists `{ descriptor, lastIndexUsed }` under `WalletState.settings.hd`. Read-modify-write of the index runs inside the per-repo `updateWalletState` mutex, serializing allocation across multiple provider instances on the same repo. First allocation returns index 0; the descriptor-mismatch guard refuses to reuse HD state written by a different seed. Also implements `ReceiveRotatorFactory.createReceiveRotator` (delegates to `WalletReceiveRotator.defaultBoot`), and exposes `getCurrentSigningDescriptor()` for stable boot replay (re-derives at `lastIndexUsed` without advancing).

The provider has no read-side accessor for "current rotation state" — "what addresses am I bound to right now?" is answered by querying the contract repository for active contracts tagged `metadata.source === 'wallet-receive'`, mirroring the dotnet SDK's `IArkadeAddressProvider` design.

### Receive Rotation Pattern

`WalletReceiveRotator` orchestrates the wallet-side receive lifecycle around a `DescriptorProvider`:

- **Boot** — If the provider implements `ReceiveRotatorFactory`, the wallet calls `createReceiveRotator(opts)`; otherwise falls back to `WalletReceiveRotator.defaultBoot(provider, opts)`. The default boot looks up the active default/delegate contract tagged `metadata.source = 'wallet-receive'` matching the current `serverPubKey`; if found, reuses its pubkey (no provider call); else allocates index 0 via `getNextSigningDescriptor()`.
- **Rotation** — Subscribes to `vtxo_received`. When the event fires for the currently-tagged display contract, the rotator (serialized by an internal `_hdRotationChain` mutex) allocates the next descriptor, rebuilds `offchainTapscript`, registers the new tagged contract, and marks the prior display `inactive` (the watcher's `state === 'active' || lastKnownVtxos.size > 0` filter keeps watching it until its funds clear). The first rotation does NOT deactivate the baseline.
- **Baseline anchoring** — The multi-timelock baseline matrix (default + delegate × every `walletContractTimelocks` entry) is bound to `identity.xOnlyPublicKey()` (index 0) on every boot, NEVER to the rotated pubkey. Rotated display contracts are intentionally single-timelock-single-pubkey at the current arkd delay.
- **Failure handling** — Consecutive `rotate()` failures gate future attempts behind exponential backoff (1s → 2s → … → 60s cap, resets on success). Pluggable `Logger` interface (defaults to `console`). `NonRangeableDescriptorError` is the typed signal for the silent-fallback path (replaces a prior string match on `err.message`).
- **WalletMode** (`'auto' | 'static' | 'hd' | DescriptorProvider`) drives the wiring decision. `'auto'` currently behaves like `'static'` until HD rotation matures — see `TODO(hd-maturation)` in `resolveDescriptorProvider`.

### Per-Input Signing Dispatch

`InputSignerRouter` decouples PSBT signing from the assumption of a single key:

- Callers (`Wallet._sendImpl`, settlement paths, intent proof paths) hand the router explicit `InputSigningJob[]` with `lookupScript` derived from the source VTXO script (not the witnessUtxo — checkpoint scripts in arkTx don't match the source contract).
- The router groups inputs by owning contract: rotated `default`/`delegate` contracts with a non-baseline owner route to `DescriptorProvider.signWithDescriptor` using `metadata.signingDescriptor` persisted at rotation time; baseline-owned contracts, other contract types, and the boarding script route to `Identity`.
- Throws `DescriptorSigningProviderMissingError` (no provider wired) or `MissingSigningDescriptorError` (rotated contract on an older build without `metadata.signingDescriptor`). Both are exported from the package root.

### Storage Adapter Pattern

The `StorageAdapter` interface provides platform-agnostic persistence:

```typescript
interface StorageAdapter {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}
```

### Service Worker Architecture

`ServiceWorkerWallet` bridges main thread and service worker via message passing:

1. Main thread creates `ServiceWorkerWallet.setup()` with identity and server URL
2. Identity is serialized and sent to service worker via postMessage
3. Worker instantiates `Wallet` inside service worker context
4. All wallet method calls are proxied through Request/Response serialization
5. Service worker persists using IndexedDB

## Crypto Dependencies

| Library | Purpose |
|---------|---------|
| `@noble/curves` | Elliptic curve operations (secp256k1) |
| `@noble/secp256k1` | Schnorr signatures |
| `@scure/bip32` | HD key derivation (BIP32) |
| `@scure/bip39` | Mnemonic generation/validation (BIP39) |
| `@scure/btc-signer` | Bitcoin transaction signing, Taproot |
| `@kukks/bitcoin-descriptors` | Output descriptor parsing |
| `@bitcoinerlab/descriptors-scure` | Ranged descriptor expansion (`expand`, `canonicalExpression`, `isRanged`, `scriptExpressions.trBIP32`) used by HD identities and descriptor helpers |
| `ws-electrumx-client` | WebSocket Electrum transport (used by `ElectrumOnchainProvider` via `WsElectrumChainSource.safeBatchRequest`) |
| `bip68` | Relative timelock encoding (CSV) |

## Build Configuration

- **Target**: ES2020
- **Module**: ESNext (ESM) + CommonJS (CJS)
- **Strict mode**: Enabled
- **Output**: `dist/esm/`, `dist/cjs/`, `dist/types/`
- **Separate adapter entry points**: Each adapter in `adapters/` has its own export path
- **Expo subpath split**: `/wallet/expo` (foreground) and `/wallet/expo/background` (OS-task helpers) are separate export entries; only the `/background` subpath imports `expo-task-manager` / `expo-background-task`, keeping them invisible to Metro's static dependency collector on the foreground subpath (#487)
- **Node engines**: `engines.node` = `>=22.12.0 <25`; `.nvmrc` pins development to Node `24.15.0` (CI runs Node 24, #495)
