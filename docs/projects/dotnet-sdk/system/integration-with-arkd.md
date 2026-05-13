# NArk -- Integration with arkd

## Connection

NArk connects to arkd via either gRPC (`GrpcClientTransport`) or REST + Server-Sent Events (`RestClientTransport`). Both implement `IClientTransport`. Proto definitions are in `NArk.Core/Transport/GrpcClient/Protos/ark/v1/`.

### REST Transport Quirks

Because arkd's gRPC-gateway and SSE encoders normalize protobuf differently, `RestClientTransport` handles both shapes:

- **camelCase + snake_case** property names — `/v1/info` and SSE events use `signerPubkey` / `batchExpiry`, while the gRPC-gateway uses `signer_pubkey` / `batch_expiry`. The parser tries both.
- **proto3 string-encoded int64** — fields like `batchExpiry: "7775744"` are decoded with a `GetInt64Flexible` helper that accepts both string and number JSON forms.
- **SSE handshake** — the REST transport sends `Accept: text/event-stream` (arkd returns 501 without it) and parses the `data:` prefix.
- **Custom signets** — `NetworkExtensions.ResolveArkNetwork()` maps arkd's raw network strings (e.g. `mutinynet`) onto the correct NBitcoin `Network` instance.

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
| `GetServerInfoAsync` | Server configuration, dust threshold, forfeit pubkey, vtxo/utxo amount bounds, `MaxTxWeight`, `MaxOpReturnOutputs` |
| `GetVtxoByScriptsAsSnapshot` | Fetch VTXOs matching output scripts (supports optional `after`/`before` time-window filter) |
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
| `GetPendingTxAsync` | Surfaces server-side pending Arkade txs gated by a BIP-322 ownership proof (consumed by `PendingArkTransactionRecoveryService`) |
| `GetVtxoChainAsync` | Indexer endpoint — returns the ancestry chain of a VTXO (outpoint → list of `(txid, expiry, type)` rows tagged with `ChainedTxType` of `Commitment` / `Ark` / `Tree` / `Checkpoint`). Consumed by `VirtualTxService` for the unilateral-exit pipeline; gRPC + REST implementations live in `GrpcClient/GrpcClientTransport.Exit.cs` / `RestClient/RestClientTransport.Exit.cs` |
| `GetVirtualTxsAsync` | Indexer endpoint — returns raw tx hex (as PSBT) for off-chain virtual txs by txid. `Commitment` txs are not included (they're on-chain — fetch from the explorer if needed) |
| `GetVtxoTreeAsync` | Indexer endpoint — returns the full VTXO tree for a batch; consumed by `ExitWatchtowerService` for partial-tree-broadcast detection |

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

## VTXO Polling and Sync Resilience

After batch completion or transaction broadcast, automatic VTXO polling refreshes local state:
- `PostBatchVtxoPollingHandler` -- polls after successful batch (passes `UtcNow - 5 min` as the lower bound)
- `PostSpendVtxoPollingHandler` -- polls after spend transactions (same time-window filter)

`VtxoSynchronizationService` is the central orchestrator and is hardened against several arkd-side race conditions:

- **Routine safety-net poll** every 5 seconds across `_lastViewOfScripts` with `after = UtcNow - 2 min`. Catches VTXOs that arkd's script subscription silently misses; cheap because it only fetches recent changes.
- **Stream-push retry schedule** — when the subscription stream pushes an event the service enqueues three follow-up polls at 750 ms / 3 s / 8 s to cover arkd's indexer commit lag (observed up to ~28 s). Uses the `after` filter so repeated fetches of unchanged state are no-ops on the upsert side.
- **Time-window filter** — `PollScriptsForVtxos(scripts, after, ct)` forwards `after` to `GetVtxosRequest.After` so wallets with long history don't refetch every VTXO on every event.
- **Graceful stream end recovery** — if arkd closes the gRPC stream without throwing, the service triggers `UpdateScriptsView` and re-subscribes instead of silently terminating.
- **Per-iteration try/catch** in `StartQueryLogic` so a transient transport or storage exception logs as Warning instead of permanently killing the polling task.
- **Unbounded channel** between stream events and the poll consumer (was `Bounded(5)`); the consumer is sequential so queued polls just execute in order.

In `SwapsManagementService`, `_scriptToSwapId` is seeded from storage in `StartAsync` and updated synchronously on every `OnSwapsChanged` event so VTXOs landing on a swap contract immediately after creation are not lost. Each non-terminal `PollSwapState` iteration also re-fetches the swap's contract VTXOs from arkd as a belt-and-braces fallback.

## Pagination

`GetVtxos` paginates against arkd's 1-based `paginate()`. Both `GrpcClientTransport.Vtxo.cs` and `RestClientTransport.Vtxo.cs` use `current < total` as the continuation condition (an earlier `next != total` form silently dropped the final page, capping wallet imports at exactly 11 000 VTXOs).

## Server-Driven Limits

`ArkServerInfo` exposes the values arkd advertises in `GetInfo` and the SDK enforces them client-side:

- `VtxoMinAmount` / `VtxoMaxAmount` — `SpendingService` rejects outputs outside the bounds.
- `UtxoMinAmount` / `UtxoMaxAmount` / `BoardingAllowed` — `BoardingUtxoSyncService` skips out-of-range UTXOs and the `BoardingAllowed` flag (false when `utxo_max_amount == 0`) gates the boarding flow entirely. `BoardingAllowed` defaults to `true` when `UtxoMaxAmount` is null.
- `MaxTxWeight` — used in transaction builder size checks (replaces a hardcoded constant).
- `MaxOpReturnOutputs` — threaded through `ArkServerInfo` → `SpendingService` → `DefaultCoinSelector` → `ArkTransactionBuilder` (default 3, was a mutable static `TransactionHelpers.MaxOpReturnOutputs`).

## Proto Files

- `ark/v1/service.proto` -- Main Ark service (intents, batches, transactions)
- `ark/v1/types.proto` -- Shared types (VTXOs, scripts, addresses)
- `ark/v1/indexer.proto` -- VTXO indexer service
