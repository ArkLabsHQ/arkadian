# Ark TypeScript SDK — Architecture

## Module Structure

```
src/
├── index.ts                 # Main exports (~400 lines of re-exports)
├── networks.ts              # Network definitions (mainnet, testnet, regtest, mutinynet)
├── forfeit.ts               # Forfeit transaction construction
│
├── wallet/                  # Wallet implementations
│   ├── wallet.ts            # Wallet, ReadonlyWallet, waitForIncomingFunds
│   ├── onchain.ts           # OnchainWallet (on-chain fee payment, anchor bumping)
│   ├── ramps.ts             # Ramps (onboard/offboard)
│   ├── batch.ts             # Batch session (round participation, tree signing)
│   ├── vtxo-manager.ts      # VtxoManager (renewal, recovery, expiry monitoring)
│   ├── delegator.ts         # DelegatorManager (VTXO delegation to third-party)
│   ├── asset-manager.ts     # AssetManager (issue, reissue, burn)
│   ├── asset.ts             # Asset types and helpers
│   ├── unroll.ts            # Unroll (unilateral exit)
│   ├── utils.ts             # Wallet utilities
│   └── serviceWorker/       # Service worker wallet
│       ├── wallet.ts        # ServiceWorkerWallet, ServiceWorkerReadonlyWallet
│       ├── worker.ts        # Worker (runs in service worker context)
│       ├── request.ts       # Request serialization
│       ├── response.ts      # Response serialization
│       └── utils.ts         # Service worker registration helpers
│
├── identity/                # Key management
│   ├── index.ts             # Identity and ReadonlyIdentity interfaces
│   ├── singleKey.ts         # SingleKey (raw private key), ReadonlySingleKey
│   └── seedIdentity.ts      # SeedIdentity, MnemonicIdentity, ReadonlyDescriptorIdentity
│
├── providers/               # External service communication
│   ├── ark.ts               # RestArkProvider (arkd REST + SSE)
│   ├── indexer.ts           # RestIndexerProvider (indexer REST + streaming)
│   ├── onchain.ts           # EsploraProvider (on-chain block explorer)
│   ├── delegator.ts         # RestDelegatorProvider (delegator REST)
│   ├── expoArk.ts           # ExpoArkProvider (React Native SSE)
│   ├── expoIndexer.ts       # ExpoIndexerProvider (React Native streaming)
│   ├── expoUtils.ts         # Expo streaming utilities
│   ├── errors.ts            # ArkError, error handling
│   └── utils.ts             # Provider utilities
│
├── script/                  # Bitcoin script construction
│   ├── base.ts              # VtxoScript, TapLeafScript, TapTreeCoder, getSequence
│   ├── address.ts           # ArkAddress encoding/decoding
│   ├── default.ts           # DefaultVtxo script
│   ├── delegate.ts          # Delegation script
│   ├── tapscript.ts         # Tapscript types (CSV, CLTV, Condition multisig variants)
│   └── vhtlc.ts             # VHTLC (Virtual Hash Time-Locked Contract)
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
│   ├── walletRepository.ts  # WalletRepositoryImpl (VTXO caching)
│   └── contractRepository.ts # ContractRepositoryImpl (contract data, collections)
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
    └── anchor.ts            # P2A (Pay-to-Anchor) and AnchorBumper
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
- `SeedIdentity` — HD wallet from raw seed bytes with BIP86 derivation
- `MnemonicIdentity` — HD wallet from BIP39 mnemonic phrase
- `ReadonlyDescriptorIdentity` — Watch-only from output descriptor

Derivation path: `m/86'/{coinType}'/0'/0/0` (BIP86 Taproot)

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
| `bip68` | Relative timelock encoding (CSV) |

## Build Configuration

- **Target**: ES2020
- **Module**: ESNext (ESM) + CommonJS (CJS)
- **Strict mode**: Enabled
- **Output**: `dist/esm/`, `dist/cjs/`, `dist/types/`
- **Separate adapter entry points**: Each adapter in `adapters/` has its own export path
