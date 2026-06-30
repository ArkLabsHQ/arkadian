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
| `OpenSubscriptionStreamAsync(initialScripts, existingSubscriptionId)` | Opens the long-lived server stream over arkd's unified `GetSubscription` RPC. Yields `VtxoSubscriptionEvent`s: the first event on a new subscription is always `VtxoSubscriptionStarted(SubscriptionId)` carrying the server-assigned id, followed by `VtxoScriptsChanged(Scripts)` on each push. Pass `existingSubscriptionId == null` to create a fresh subscription (with `initialScripts` registered in the stream-open filter, honoured only on new subscriptions); pass an id to reconnect — a `NotFound` error means arkd GC'd it, so reopen with a null id (PR #148, replacing PR #103's separate `SubscribeForScriptsAsync` / `GetVtxoSubscriptionStreamAsync` primitives) |
| `UpdateSubscriptionScriptsAsync(subscriptionId, add, remove)` | Mutates an existing subscription's script set **in place** over arkd's `UpdateSubscription` RPC without tearing the stream down. Both `add` and `remove` are optional; when both are null/empty the call is a no-op. Throws `NotFound` when the subscription was GC'd (PR #148, replacing `UnsubscribeForScriptsAsync`) |
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

## Version Headers

`ArkdVersion` (`NArk.Core/Transport/ArkdVersion.cs`) injects two version headers on **every** outgoing gRPC and REST request — via `InjectHeader` on the `HttpClient` default headers (REST) and on the gRPC `Metadata`:

- **`X-Build-Version`** — the Arkade server (arkd) build this SDK targets (`ArkdVersion.TargetBuild`, currently `0.9.9`). When arkd rejects a request with a `BUILD_VERSION_TOO_OLD` error detail, `ThrowIfVersionRejected` raises `IncompatibleSdkVersionException` (it propagates to the caller; the SDK does not catch it).
- **`X-SDK-VERSION`** — the NArk SDK's own version, sent as a `name/version` product token, e.g. `dotnet-sdk/1.0.327-beta` (PR #139). The name (`dotnet-sdk`) lets arkd distinguish the .NET SDK from other SDKs (e.g. the TypeScript SDK) on the same wire. The value is `ArkdVersion.SdkVersion` — derived from `Nerdbank.GitVersioning` (`ThisAssembly.AssemblyInformationalVersion`) with the SemVer build-metadata suffix (the `+commit` part) stripped via `StripBuildMetadata`. Pinned by `NArk.Tests/BuildVersionHeaderTests.cs`.

Both headers are added idempotently (REST checks `Contains` before adding). Note the distinction: `X-Build-Version` reports the *server build the SDK was written against*, while `X-SDK-VERSION` reports the *version of the SDK itself*.

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

- **In-place script-set updates** (PR #103, retargeted to arkd's unified subscription API in PR #148) — the service keeps one long-lived `GetSubscription` stream open through a supervisor loop (`RunStreamSupervisorAsync`) and mutates the watched set by issuing `UpdateSubscriptionScriptsAsync(_subscriptionId, add, remove)` deltas rather than tearing the stream down and recreating it on every change. arkd routes the added/removed scripts onto the already-open stream, so the teardown/recreate window (where a pushed event could slip through) is gone. The supervisor opens the stream via `OpenSubscriptionStreamAsync(initialScripts, existingSubscriptionId)`; the first yielded event on a new subscription is `VtxoSubscriptionStarted`, whose server-assigned id is stored in `_subscriptionId` so later in-place updates can address it. The supervisor reconnects on the same `_subscriptionId` if the stream drops; if arkd returns "subscription not found" (TTL-GC'd the listener after a longer disconnect, surfaced as a `NotFound` error), the service clears `_subscriptionId`, signals the supervisor via `SignalStreamGenerationChange`, and the next loop reopens fresh (null id, `_subscribedScripts` passed as the initial filter) with a full-history catch-up poll. An empty active set disconnects the stream and the supervisor goes idle on `_streamWakeup` until scripts return. `StreamReconnectDelay = 1s` backoff between transient stream faults; the stream supervisor logs `Warning` on a drop and reconnects.
- **Fresh-derive routine safety-net poll** (PR #102) every 5 seconds. `RoutinePoll` no longer reads a cached view — it calls `GatherActiveScriptsAsync(ct)` (provider-agnostic union of every `IActiveScriptsProvider`) on **every** tick and polls that set with `after = UtcNow - 2 min`. If the freshly-derived set differs from `_subscribedScripts`, the service calls `UpdateScriptsView` to reconcile the subscription. This eliminates the prior cache (`_lastViewOfScripts`, only refreshed reactively on `ActiveScriptsChanged`) that could silently desync when the event was lost or `UpdateScriptsView` aborted mid-flight (e.g. during a swap's rapid contract-creation + stream restarts) — and that desync meant a payment to a freshly-derived receive contract was undetected until manual sync. A single per-tick derivation is cheap: the historical 11k-VTXO blow-up came from firing the change event per upsert, not from one periodic query. `_lastViewOfScripts` was renamed `_subscribedScripts` and demoted to pure stream-subscription bookkeeping.
- **Per-provider isolation** in `GatherActiveScriptsAsync` — a throwing provider is logged and skipped rather than aborting the whole refresh, so one storage hiccup can't blank the set and tear the subscription down. `EfCoreVtxoStorage.GetActiveScripts` overrides the default (which would materialise every unspent VTXO row) with a `DISTINCT script` projection, keeping the per-tick derive cheap even for wallets with thousands of unspent VTXOs.
- **Stream-push immediate poll** — when the subscription stream pushes an event the service enqueues a **single immediate poll** (PR #99). The prior 750 ms / 3 s / 8 s retry fan-out was tuned for arkd v0.9.0-rc.1 indexer commit lag that could span ~28 s; on current arkd builds (v0.9.5+) plus the 5-second routine safety-net poll it was dead weight — the happy path ate 750 ms of detection latency before the first poll fired, and the +3 s / +8 s retries upserted unchanged state. Removed: `StreamPushPollSchedule[]` (the `[750ms, 3s, 8s]` array) and the per-push `FirePollSchedule` fan-out method.
- **Time-window filter** — `PollScriptsForVtxos(scripts, after, ct)` forwards `after` to `GetVtxosRequest.After` so wallets with long history don't refetch every VTXO on every event.
- **Subscription-unsupported fallback** (PR #152) — if the subscription open fails with HTTP `501 Not Implemented` (the server, e.g. a REST-only deployment, doesn't implement the subscription endpoint at all), `IsNonRetryableSubscriptionError` classifies it as permanent: the supervisor logs a single `Information` line and returns, leaving the 5-second routine safety-net poll as the sole detection path rather than reconnecting in a tight loop and spamming logs.
- **Graceful stream end recovery** — if arkd closes the stream without throwing, the supervisor logs a warning, calls `ReassertSubscriptionAsync` (recreates the listener if it was GC'd), and reconnects on the same id.
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
- `ark/v1/types.proto` -- Shared types (VTXOs, scripts, addresses). `TxNotification` gained a `swept_vtxos` field in PR #148's resync to arkd master
- `ark/v1/indexer.proto` -- VTXO indexer service. PR #148 resynced these to arkd master: the indexer now exposes a unified `GetSubscription` (optional `SubscriptionFilter` on stream creation, emits a `SubscriptionStartedEvent` carrying the server-assigned id) plus an `UpdateSubscription` RPC (`SubscriptionFilter` with `ScriptFilter { add, remove }`), replacing the previous separate `SubscribeForScripts` / `UnsubscribeForScripts` RPCs

These files are kept byte-for-byte in sync with `arkade-os/arkd` master — the `proto-sync-check.yml` CI workflow (PR #148) diffs them against arkd master on every PR and fails if they drift.
