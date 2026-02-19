# NArk -- Integration with arkd

## Connection

NArk connects to arkd via gRPC using the `GrpcClientTransport` implementation of `IClientTransport`. The proto definitions are in `NArk.Core/Transport/GrpcClient/Protos/ark/v1/`.

### Configuration

```csharp
// Pre-configured networks
services.AddArkMainnet();    // arkade.computer:443
services.AddArkMutinynet();  // mutinynet.arkade.sh:443
services.AddArkRegtest();    // localhost:7070

// Custom endpoint
services.AddArkNetwork(new ArkNetworkConfig("https://my-ark-server.com"));
```

### Transport Interface

`IClientTransport` provides:

| Method | Purpose |
|--------|---------|
| `GetServerInfoAsync` | Server configuration, dust threshold, forfeit pubkey |
| `GetVtxoByScriptsAsSnapshot` | Fetch VTXOs matching output scripts |
| `GetVtxoToPollAsStream` | Server-streaming VTXO change notifications |
| `RegisterIntent` | Register a signed intent for batch inclusion |
| `DeleteIntent` | Cancel a registered intent |
| `SubmitTx` | Submit signed Ark transaction + checkpoints |
| `FinalizeTx` | Finalize transaction with final checkpoint signatures |
| `GetEventStreamAsync` | Stream batch round events (nonces, tree txs, signing, finalization) |
| `SubmitTreeNoncesAsync` | Submit MuSig2 nonces for tree signing |
| `SubmitTreeSignaturesRequest` | Submit partial MuSig2 signatures |
| `SubmitSignedForfeitTxsAsync` | Submit signed forfeit transactions |
| `ConfirmRegistrationAsync` | Confirm intent registration in a batch |

## Batch Round Participation

The `BatchSession` class manages participation in arkd batch rounds:

1. **Registration** -- Intent is registered with arkd via `RegisterIntent`
2. **Batch Started** -- Server sends `BatchStartedEvent` with batch ID and expiry
3. **Tree Nonces** -- Exchange MuSig2 nonces via `TreeNoncesEvent` / `SubmitTreeNoncesAsync`
4. **Tree Signing** -- Receive aggregated nonces, compute and submit partial signatures
5. **Forfeit Txs** -- Sign and submit forfeit transactions for input VTXOs
6. **Finalization** -- Batch completes, VTXOs are confirmed

## Intent System

Intents are the mechanism for requesting Ark transactions:

- `IntentGenerationService` -- creates intents from spending requests
- `IntentSynchronizationService` -- keeps local intent state in sync with server
- `SimpleIntentScheduler` -- schedules intent submission to match batch timing

## VTXO Polling

After batch completion or transaction broadcast, automatic VTXO polling refreshes local state:
- `PostBatchVtxoPollingHandler` -- polls after successful batch
- `PostSpendVtxoPollingHandler` -- polls after spend transactions

## Proto Files

- `ark/v1/service.proto` -- Main Ark service (intents, batches, transactions)
- `ark/v1/types.proto` -- Shared types (VTXOs, scripts, addresses)
- `ark/v1/indexer.proto` -- VTXO indexer service
