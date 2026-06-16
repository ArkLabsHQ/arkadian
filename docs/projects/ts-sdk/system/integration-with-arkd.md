# Ark TypeScript SDK — Integration with arkd

## Communication Protocol

The TypeScript SDK communicates with arkd via REST API and Server-Sent Events (SSE). Unlike the Go SDK which uses gRPC, the TS SDK uses HTTP-based transport exclusively.

### Request Headers (arkd-only)

Since 0.4.35, every **arkd** request carries two custom headers (set by the `fetch` wrapper in `src/utils/fetch.ts`; the `RestArkProvider` and the Expo `getExpoFetch` streaming path use it):

- `X-Build-Version` — the arkd/Arkana server build the SDK targets (`buildVersion`, currently `"0.9.9"`). arkd's compatibility guard reads it; a mismatch surfaces a server-signer/build change (see below).
- `X-SDK-VERSION` — this package's own version, formatted `ts-sdk/<version>` (`sdkVersion`, sourced from `package.json`), so the operator can distinguish client builds.

These headers are **deliberately NOT sent** to the Indexer, Delegate, or Esplora origins — those CORS preflights reject unknown custom headers, so `RestIndexerProvider` / `RestDelegateProvider` / `EsploraProvider` use the header-free `baseFetch` wrapper instead.

### Server-Signer Rotation (0.4.35, #554)

The SDK supports *planned* arkd server-signer rotation. arkd advertises its active signer plus any `deprecatedSigners` (each `{ pubkey, cutoffDate }`; `cutoffDate === 0n` means "due now") and a `digest` on `ArkInfo`. When arkd's `X-Build-Version`/digest guard reports a change, `RestArkProvider` refreshes `ArkInfo`, fires its `onServerInfoChanged(cb)` event stream, and then throws `DigestMismatchError` — the SDK never silently retries. A wallet subscribed to `onServerInfoChanged` (auto-wired at boot) responds by calling `Wallet.rotateServerSigner(newServerPubKey, checkpointTapscript)`, which re-derives its offchain + boarding + checkpoint tapscripts mid-session.

A wallet holding VTXOs minted under a now-deprecated signer migrates them with `VtxoManager.migrateDeprecatedSignerVtxos()` (a **fee-exempt, two-leg** operation — the VTXO leg uses the Ark send path, the boarding leg a separate settle) and inspects state with `getDeprecatedSignerStatus()`. Contracts whose signer cutoff has already passed are `EXPIRED` and **recover-on-sweep**: they keep their batch expiry, the server sweeps them, and the normal recovery settle re-mints them under the active signer — unilateral exit is not required. Classification is never persisted; it is always derived at read time from each contract's `params.serverPubKey` plus a fresh `ArkInfo` snapshot via `src/wallet/signerRotation.ts`.

## Provider Layer

### RestArkProvider

Handles all communication with the arkd server:

- **Info**: `GET /v1/info` — Server configuration, network, pubkey, fees
- **Boarding Address**: `POST /v1/boarding` — Generate boarding address for on-chain deposits
- **Register Intent**: `POST /v1/intent` — Register spending intent for a round
- **Settlement Events**: SSE stream — Real-time round lifecycle events
- **Transaction Notification**: Submit signed transactions

### RestIndexerProvider

Handles address and VTXO tracking:

- **Address Subscription**: SSE stream for incoming funds notification
- **VTXO Queries**: Get VTXOs by address, outpoint, or status
- **Transaction History**: Paginated transaction history
- **Batch Info**: Round/batch details

### EsploraProvider

On-chain block explorer for UTXO management:

- **UTXO Lookup**: Get UTXOs for an address
- **Transaction Broadcast**: Submit raw transactions
- **Fee Estimation**: Get current fee rates
- **Transaction Status**: Confirmation status

## Settlement Flow (Batch Participation)

The SDK participates in Ark rounds through the `Batch` class:

1. **Register Intent**: Submit spending intent (inputs + outputs) to arkd
2. **Receive Tree**: Server constructs VTXO tree and sends via SSE
3. **Generate Nonces**: Create MuSig2 nonces for tree signing
4. **Submit Nonces**: Send nonces to server
5. **Receive Aggregated Nonces**: Server aggregates all participants' nonces
6. **Create Partial Signatures**: Sign tree transactions with partial MuSig2 sigs
7. **Submit Signatures**: Send partial signatures to server
8. **Batch Finalized**: Server broadcasts connector transaction, VTXOs are settled

Event types in the settlement stream:
- `BatchStartedEvent` — Round begins, participants can register
- `TreeSigningStartedEvent` — Tree constructed, signing begins
- `TreeNoncesEvent` — Aggregated nonces available
- `TreeTxEvent` — Tree transactions available for signing
- `TreeSignatureEvent` — Signature aggregation complete
- `BatchFinalizedEvent` — Round complete, VTXOs settled
- `BatchFailedEvent` — Round failed

## Wallet Configuration

```typescript
const wallet = await Wallet.create({
  identity: SingleKey.fromHex(privateKey),
  arkServerUrl: 'https://mutinynet.arkade.sh',  // arkd REST endpoint
  esploraUrl: 'https://mutinynet.com/api',       // optional: custom esplora
  storage: new LocalStorageAdapter(),             // optional: persistence
  delegateProvider: new RestDelegateProvider(url), // optional: delegation (was delegatorProvider / RestDelegatorProvider, deprecated aliases since 0.4.29 #519)
})
```

## Key Differences from Go SDK

| Aspect | TypeScript SDK | Go SDK |
|--------|---------------|--------|
| Transport | REST + SSE | gRPC |
| Identity | SingleKey, SeedIdentity, MnemonicIdentity | In-memory client |
| Storage | Pluggable adapters (5 options) | BadgerDB, SQLite |
| Platforms | Browser, Node.js, React Native, SW | Server-side only |
| Delegation | Built-in DelegateManager | N/A |
| Assets | AssetManager (issue/reissue/burn) | N/A |
| Service Worker | ServiceWorkerWallet | N/A |

## Docker-Compose Test Stack

The SDK includes a `docker-compose.yml` for integration testing that provisions:

- **arkd** — Ark server (regtest, block scheduler, 10s rounds)
- **arkd-wallet** — Wallet service with NBXplorer
- **nbxplorer** — Bitcoin block indexer
- **pgnbxplorer** — PostgreSQL for NBXplorer
- **fulmine** — Fulmine swap service with delegator enabled

Requires nigiri network (`nigiri start` first for bitcoin + electrs + chopsticks).
