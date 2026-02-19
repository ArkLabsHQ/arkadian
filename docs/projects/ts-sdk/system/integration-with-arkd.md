# Ark TypeScript SDK — Integration with arkd

## Communication Protocol

The TypeScript SDK communicates with arkd via REST API and Server-Sent Events (SSE). Unlike the Go SDK which uses gRPC, the TS SDK uses HTTP-based transport exclusively.

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
  delegatorProvider: new RestDelegatorProvider(url), // optional: delegation
})
```

## Key Differences from Go SDK

| Aspect | TypeScript SDK | Go SDK |
|--------|---------------|--------|
| Transport | REST + SSE | gRPC |
| Identity | SingleKey, SeedIdentity, MnemonicIdentity | In-memory client |
| Storage | Pluggable adapters (5 options) | BadgerDB, SQLite |
| Platforms | Browser, Node.js, React Native, SW | Server-side only |
| Delegation | Built-in DelegatorManager | N/A |
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
