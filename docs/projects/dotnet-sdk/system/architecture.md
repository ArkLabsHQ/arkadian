# NArk (.NET Ark SDK) -- Architecture

## Solution Structure

The solution (`NArk.sln`) contains 9 projects organized in a layered architecture:

```
NArk.Abstractions  ← Interfaces, models, zero service logic
       ↑
NArk.Core          ← Services, transport, batch sessions, wallet, scripts
       ↑                    ↑
NArk.Swaps         NArk.Storage.EfCore
       ↑
NArk               ← Meta-package (bundles Core + Swaps for consumers)

NArk.AppHost              ← .NET Aspire orchestrator for E2E test infrastructure
NArk.Tests                ← Unit tests (NUnit + NSubstitute)
NArk.Tests.End2End        ← Integration tests using Aspire-hosted services
NArk.Transport.GrpcClient.Tests ← Transport-specific tests
NArk.Scratchpad           ← Development scratch area
```

## Dependency Graph

### NArk.Abstractions (leaf -- no project dependencies)
- `NBitcoin`, `NBitcoin.Secp256k1`
- Defines: `ArkVtxo`, `ArkIntent`, `ArkCoin`, `ArkContract`, `ArkAddress`, `ArkTxOut`, `ArkPayment`, `ArkPaymentRequest`, `ArkWalletInfo` (now includes a generic `Metadata: IReadOnlyDictionary<string,string>?` for per-wallet bookkeeping)
- Interfaces: `IVtxoStorage`, `IContractStorage`, `IIntentStorage`, `IWalletStorage` (now exposes `SetMetadataValue(walletId, key, value, ct)` for sparse-key updates; `value=null` removes the key, concurrent writers on different keys don't clobber each other), `IWalletProvider`, `ISafetyService`, `IChainTimeProvider`, `IFeeEstimator`, `IActiveScriptsProvider`, `IIntentScheduler`, `IPaymentStorage`, `IPaymentRequestStorage`
- Vendored `Scripting/` namespace: `OutputDescriptor`, `OutputDescriptorParser`, `PubKeyProvider`, `SigningRepository`, parser combinators, `NBitcoinCompat` shim (replaces removed NBitcoin 10 helpers; HAS_SPAN gated)
- `Recovery/` namespace: `IContractDiscoveryProvider` (per-index probe interface), `DiscoveryResult` (`Used`, `Contracts`), `RecoveryOptions` (`GapLimit` / `MaxIndex` / `StartIndex`, with `Validate()` guard clauses), `RecoveryReport` (`HighestUsedIndex`, per-provider hit counts, reconstructed contracts)

### NArk.Core (depends on Abstractions)
- gRPC transport (`GrpcClientTransport` → `IClientTransport`); `IClientTransport.GetPendingTxAsync` now surfaces server-side pending Arkade txs gated by a BIP-322 ownership proof
- Caching decorator (`CachingClientTransport`)
- Services: `SpendingService`, `CoinService`, `ContractService`, `SweeperService`, `OnchainService`, `IntentGenerationService`, `IntentSynchronizationService`, `VtxoSynchronizationService`, `BatchManagementService`, `PendingArkTransactionRecoveryService`
- Batch: `BatchSession`, `TreeSignerSession`, `TreeValidator`, `TxTree`
- Wallet: `DefaultWalletProvider`, `HierarchicalDeterministicAddressProvider` (canonical HD derivation via `GetDescriptorFromIndex`), `HierarchicalDeterministicWalletSigner`, `NSecWalletSigner`, `SingleKeyAddressProvider`, `WalletFactory`
- Recovery: `HdWalletRecoveryService` (sweeps derivation indices, dedupes by script, persists with `Source=recovery:<provider>`, monotonically bumps `wallet.LastUsedIndex`, probes providers in parallel per index via `Task.WhenAll`, treats throwing providers as not-found), `IndexerVtxoDiscoveryProvider` (arkd indexer probe on `ArkPaymentContract`), `BoardingUtxoDiscoveryProvider` (NBXplorer/Esplora probe on `ArkBoardingContract` on-chain address; conditional registration), `NullContractDiscoveryProvider` (no-op fallback filtered out by orchestrator)
- Scripts: `CollaborativePathArkTapScript`, `UnilateralPathArkTapScript`, `NofNMultisigTapScript`, `HashLockTapScript`, `LockTimeTapScript`
- Events: `PostBatchSessionEvent`, `PostCoinSpendEvent`, `PostSweepActionEvent`, `PostIntentSubmissionEvent`
- Hosting: `ArkApplicationBuilder`, `ServiceCollectionExtensions`

### NArk.Swaps (depends on Core)
- `Abstractions/ISwapProvider` -- Pluggable swap-provider interface (`ProviderId`, `DisplayName`, `SupportsRoute`, `GetAvailableRoutesAsync`, `StartAsync`/`StopAsync`, `GetLimitsAsync`, `GetQuoteAsync`, `SwapStatusChanged`, default no-op `NotifyVtxoChanged`/`NotifySwapChanged` hooks). Drives the multi-provider router; new providers participate by overriding only the hooks they care about.
- `Abstractions/SwapRoute` + `SwapAsset` + `SwapNetwork` + `SwapQuote` + `SwapLimits` + `SwapStatusChangedEvent` -- Capability-discovery models. `SwapAsset` covers BTC across Arkade / Lightning / on-chain (EVM scaffolding stripped from this PR — reserved for a follow-up LendaSwap provider).
- `SwapsManagementService` -- Provider-agnostic router over `IEnumerable<ISwapProvider>`. The existing public API (Initiate* / PayExisting* / Restore*) remains as backward-compatible wrappers that delegate to the resolved `BoltzSwapProvider`. Adds `InspectSwapRecoveryAsync` (per-swap) and `ScanRecoverableSwapsAsync` (bulk) for read-only `SwapRecoveryInfo` diagnostics across all swap types — recovery itself still runs inside `BoltzSwapProvider.PollSwapState`. `DisposeAsync` now unsubscribes both `SwapsChanged` and `VtxosChanged` from storage. `ArkSwap.Route` + `ArkSwap.ProviderId` round-trip through the existing jsonb `Metadata` column under five constants (`ProviderId`, `RouteSource{Network,AssetId}`, `RouteDestination{Network,AssetId}`) — no schema migration; a dedicated column + migration is a follow-up.
- `Boltz/BoltzSwapProvider` -- Boltz-specific `ISwapProvider`. All Boltz protocol logic (status polling, persistent websocket monitoring, cooperative refunds, MuSig2 claiming, cross-signing, 10-consecutive-404 unknown-to-provider safety net, per-wallet `BeginScope(("WalletId", id))` at all entry points) lives here. New: chain-swap renegotiation on `transaction.lockupFailed` (`TryRenegotiateChainSwap` calls `GET → POST /v2/swap/chain/{id}/quote`, guarded by `BoltzLimitsValidator` + a status-probe race-tolerant disambiguation); cooperative BTC-side refund (`CoopRefundBtcToArkChainSwap`) and ARK-side refund (`CoopRefundArkToBtcChainSwap`) for chain swaps in both directions; `swap.expired` + no-funds-locked → `Failed` guard; `SwapStatusChanged` raised on every persisted status transition (subscriber exceptions caught + logged); `StartAsync`'s linked CTS stored in `_linkedStartCts` and disposed in `ShutdownAsync`; `StopAsync` is no longer a no-op (`ShutdownAsync` factored out, guarded by an `Interlocked` sentinel); `_swapsIdToWatch` is now `ConcurrentDictionary<string, byte>` instead of a reassigned `HashSet<string>`; single long-lived Boltz websocket (`_websocket` guarded by `_websocketLock`, `RunWebsocketLoop`, 5 s reconnect backoff, re-subscribes from `_swapsIdToWatch`).
- `BoltzClient` / `CachedBoltzClient` -- REST API client for Boltz exchange. Stamps `BoltzClient.ReferralId` (configured via `BoltzClientOptions.ReferralId`, defaults to `BoltzClientOptions.DefaultReferralId = "arkade-dotnet-sdk"`) on every Submarine / Reverse / Chain swap-create request so Boltz can attribute traffic to the originating integration. `Configure<BoltzClientOptions>` overrides win over the default; setting it to `null` opts out (the field stays null-suppressed on the wire). `SwapStatusResponse.FailureDetails` is now `JsonElement?` (Boltz returns a structured object like `{"actual":51353,"expected":50353}` on `transaction.lockupFailed`, not a string).
- `BoltzWebsocketClient` -- WebSocket for real-time swap status
- `ChainSwapMusigSession` -- MuSig2 session for cooperative chain swap claiming
- `BtcHtlcScripts` / `BtcTransactionBuilder` -- BTC-side HTLC and transaction construction
- `BoltzLimitsValidator` -- validates swap amounts against Boltz limits (`BoltzLimits.FeePercentage` normalised to a fraction at construction, not the wire percent value)
- `Models/SwapRecoveryInfo` + `SwapRecoveryStatus` -- Read-only recovery snapshot consumed by `InspectSwapRecoveryAsync` / `ScanRecoverableSwapsAsync`.
- `PaymentTrackingService` -- `IHostedService` (subscribe in `StartAsync`, unsubscribe in `StopAsync`; `Dispose`/`StopAsync` drift fixed via shared `Unsubscribe()`). Auto-updates `IPaymentStorage` / `IPaymentRequestStorage` rows from VTXO, intent, and swap state changes. Asset tracking accumulates `ReceivedAssets` in `OnVtxoChanged` via `MergeAssets` (sums by `AssetId`; iterative dict build handles duplicate keys gracefully). `Cancelled` is now a distinct terminal status (intent `Cancelled` no longer maps to `Failed`). `SemaphoreSlim` serialises `OnVtxoChanged` so concurrent VTXOs at the same payment request don't race read-compute-write on `ReceivedAmount`. Registered by `AddArkPaymentTracking()`; not pulled in by `AddArkCoreServices`.
- `BoltzSwapDiscoveryProvider` -- HD recovery provider that delegates to `SwapsManagementService.RestoreSwaps()`; imports VHTLC contracts itself with canonical `Source=swap:<id>` metadata + swap rows (the documented storage-mutation exception to `IContractDiscoveryProvider`'s contract-list contract)

### NArk.Storage.EfCore (depends on Core + Swaps)
- EF Core implementations of all storage interfaces
- Entities: `VtxoEntity`, `ArkWalletContractEntity`, `ArkIntentEntity`, `ArkSwapEntity`, `ArkWalletEntity` (now carries a JSON-serialized `Metadata: Dictionary<string,string>?` column, provider-agnostic — Postgres `jsonb` / SQLite `TEXT` / SQL Server `nvarchar(max)` via a value-converter + custom `ValueComparer` so EF tracks dictionary mutations), `ArkPaymentEntity` (adds JSONB `AssetsJson` column), `ArkPaymentRequestEntity` (adds JSONB `ExpectedAssetJson` + `ReceivedAssetsJson` columns)
- `ModelBuilderExtensions.ConfigureArkEntities()` for core schema; opt-in `ConfigureArkPaymentEntities()` for payment tables
- `EfCorePaymentStorage` / `EfCorePaymentRequestStorage` for the payment tracking surface
- A `DateTimeOffsetToBinaryConverter` is wired via `ConfigureConventions` so SQLite can sort/filter `DateTimeOffset` columns
- Pluggable via `IArkDbContextFactory`

## Service Registration (DI)

The builder pattern provides fluent configuration:

```csharp
Host.CreateDefaultBuilder()
    .AddArk()
        .OnMainnet()                           // or .OnRegtest(), .OnMutinynet()
        .WithWalletProvider<MyWalletProvider>()
        .WithVtxoStorage<MyVtxoStorage>()
        .WithContractStorage<MyContractStorage>()
        .WithIntentStorage<MyIntentStorage>()
        .WithSafetyService<MySafetyService>()
        .WithTimeProvider<MyTimeProvider>()
    .Build()
    .Run();
```

Core services are auto-registered via `AddArkCoreServices()`:
- `ICoinService`, `ISpendingService`, `IContractService`, `IOnchainService`
- `VtxoSynchronizationService`, `IntentGenerationService`, `IntentSynchronizationService`
- `BatchManagementService`, `SweeperService`
- VTXO polling event handlers
- `ArkHostedLifecycle` (background service)
- `HdWalletRecoveryService` + `IndexerVtxoDiscoveryProvider`; `BoardingUtxoDiscoveryProvider` registers automatically when an `IBoardingUtxoProvider` is also resolvable, otherwise a `NullContractDiscoveryProvider` is used (and filtered out by the orchestrator)
- `AddArkSwapServices()` additionally registers `BoltzSwapDiscoveryProvider` so HD recovery picks up VHTLC contracts

### Opt-in Feature Wiring

Some features are deliberately not part of `AddArkCoreServices()` so consumers that don't need them carry no extra schema or services:

- `AddArkDelegation()` -- registers `DelegationService` and `IDelegationTransformer`. Plugins without a Fulmine-style delegator skip this and avoid unresolved-`IDelegatorProvider` failures at startup.
- `AddArkPaymentTracking()` -- registers `PaymentTrackingService`. Pair with `ConfigureArkPaymentEntities()` on the EF Core `DbContext` to add the `ArkPayment` / `ArkPaymentRequest` tables.
- `AddArkSwapServices()` -- registers the multi-provider router (`SwapsManagementService`) and core swap services; internally calls `AddBoltzProvider()` for backward compatibility. `StartAsync` defers `GetServerInfoAsync` to a background retry so host startup does not fail when arkd or Boltz is briefly unreachable.
- `AddBoltzProvider()` -- registers `BoltzClient` / `CachedBoltzClient` / `BoltzSwapProvider` as `ISwapProvider`. Split out of `AddArkSwapServices` so non-Boltz providers can opt in without dragging in the Boltz client.

## gRPC Transport

Proto definitions in `NArk.Core/Transport/GrpcClient/Protos/ark/v1/`:
- `service.proto` -- Ark service API (intents, batches, transactions)
- `types.proto` -- Shared type definitions
- `indexer.proto` -- VTXO indexer API

The `GrpcClientTransport` is wrapped by `CachingClientTransport` to cache server info responses.

## E2E Test Infrastructure

E2E tests use the shared **`arkade-regtest`** environment, vendored at `regtest/` as a git submodule. The previous bespoke `NArk.Tests.End2End/Infrastructure/` (compose file + start scripts) has been removed in favour of the submodule.

```bash
git submodule update --init --recursive
cd regtest && ./start-env.sh
```

The submodule provides Bitcoin Core (regtest), Electrs/Esplora, Chopsticks faucet, PostgreSQL, NBXplorer, arkd + ark-wallet, Boltz + Boltz-LND + LND + Boltz-Fulmine, and an LNURL server. CI (`.github/workflows/build.yml`) initializes the submodule before running the E2E test job.

`NArk.AppHost` (Aspire) is still used as the developer-facing orchestrator on top of the same containers; it handles wallet creation, faucet funding, LND channel opening, and fulmine funding automatically.

## Sample Wallet & Docs Site

`samples/NArk.Wallet/NArk.Wallet.Client/` is a Blazor WASM reference wallet exercising the SDK in a browser-only environment (Bit.Besql for SQLite, manual `BoltzClient` / `IIntentScheduler` DI, real QR codes, LNURL helper, dedicated Contracts/Vtxos/Swaps/Intents pages, mnemonic backup, smart Send). It is published to GitHub Pages at `/dotnet-sdk/wallet/` alongside the DocFX docs site (`docfx.json` + `.github/workflows/docs.yml`, ~538 pages: API reference + 11 conceptual articles).

## VTXO Sync Cursor (per-wallet metadata)

`VtxoSynchronizationService` persists a cold-start catch-up cursor through the generic wallet metadata API instead of a dedicated table:

- Constant `VtxoSynchronizationService.LastFullPollAtMetadataKey = "vtxo.lastFullPollAt"`.
- Cold-start: reads `MIN(per-wallet vtxo.lastFullPollAt)` across `IWalletStorage.LoadAllWallets()` and uses it as the `after` filter on the first `UpdateScriptsView`. If any wallet has no cursor (or an unparseable value), the MIN bails to `null` so a fresh wallet's first-time scripts aren't skipped via someone else's cursor.
- Routine-poll success (`PollRequest.IsFullSetSnapshot=true`): writes the poll's `StartedAt` to every wallet's `vtxo.lastFullPollAt`. Stream-driven and newly-added-script polls do NOT advance the cursor — they cover only a subset.
- A `_coldStartCatchupComplete` gate (volatile bool) blocks all cursor writes until the first cold-start catch-up succeeds, so a failed catch-up followed by a successful routine poll cannot advance the cursor past the gap. The cold-start catch-up itself is marked `IsFullSetSnapshot=true`, so success advances the cursor immediately.
- The service takes `IWalletStorage` as an *optional* constructor parameter — when absent, the gate defaults to `true` and the service falls back to `null`-after on cold start (current behaviour, opt-out preserved).

This design replaces an earlier dedicated `ISyncStateStorage` / `ArkSyncStateEntity` in PR #78. Storage footprint now: one JSON column on an existing entity, written via `IWalletStorage.SetMetadataValue` — no new table, interface, or downstream migration.

## Chain-Time Cache & Fallback

`RPCChainTimeProvider.GetChainTime` caches `(Timestamp, Height)` on every successful Bitcoin Core RPC call. If a subsequent call fails (transient 5xx during reindex / IBD / heavy load) AND a cached value exists, it returns the cache and logs a warning. Cold-start failures (no cache yet) still throw. Prevents a single transient `getblockchaininfo` 500 from forcing controller-bound consumers (e.g. BTCPay's plugin manager) to disable the plugin. `ChainTimeProvider` (NBXplorer wrapper) accepts an optional `ILogger<RPCChainTimeProvider>` so consumers can surface the fallback warning; default-null keeps the change non-breaking.

## Per-Wallet Log Scopes

Per-wallet entry points in `SwapsManagementService` (Initiate*, Pay*, Restore, `PollSwapState` iteration body), `BatchManagementService` (`RouteToBatchSessionsAsync`, `HandleBatchStartedForAllIntentsAsync` per-intent loops), `OnchainService.InitiateCollaborativeExit` (both overloads), `IntentGenerationService` (`GenerateManualIntent` + periodic per-wallet loop), `SpendingService` (`Spend` overloads + `GetAvailableCoins`), `AssetManager.{Issue,Reissue,Burn}Async`, `HdWalletRecoveryService.ScanAsync`, `DelegationMonitorService.ProcessVtxoAsync`, and `SweeperService.Sweep` (per-coin loop) all open `using (logger.BeginScope(("WalletId", id)))` so downstream sinks can route every transitively-emitted log line to the right wallet — including ones whose templates don't already carry `{WalletId}`. `VtxoSynchronizationService` is intentionally *not* scoped: its streams/polls span all active wallets at once.

## Multi-Provider Swap Architecture

Replaces the previous monolithic `SwapsManagementService`-owns-Boltz design (PR #79):

- `ISwapProvider` is the contract every provider implements. Methods declared on the interface that are inherently provider-specific (`CreateSwapAsync`, `RefundSwapAsync`) were removed during the refactor — providers expose creation through their own typed APIs and refund logic lives inside the provider's poll loop. Notification hooks (`NotifyVtxoChanged`, `NotifySwapChanged`) ship default no-ops so the router doesn't have to type-check.
- `SwapsManagementService` is now the router. It owns `IEnumerable<ISwapProvider>`, subscribes once to storage events, and dispatches notifications to every provider via the default-no-op hooks. Public methods (Initiate* / PayExisting* / Restore*) resolve the registered `BoltzSwapProvider` and delegate, preserving the existing API surface for consumers.
- Per-swap routing metadata (`ArkSwap.Route`, `ArkSwap.ProviderId`) round-trips through the existing jsonb `Metadata` column via five constants (`ProviderId`, `RouteSource{Network,AssetId}`, `RouteDestination{Network,AssetId}`). Legacy rows yield `(null, null)` on read so the default-provider fallback kicks in. A follow-up that adds dedicated columns + a migration can drop these constants.
- `BoltzSwapProvider` carries all Boltz state — websocket, _swapsIdToWatch (`ConcurrentDictionary<string, byte>`), per-swap consecutive-404 counter, persistent websocket lifecycle, MuSig2 session caches — and observes wallet-context via `BeginScope(("WalletId", id))` at all per-wallet entry points. `StartAsync`'s linked CTS is stored on `_linkedStartCts` and disposed in `ShutdownAsync` to avoid leaking the `CancellationTokenRegistration`. `StopAsync` is no longer a no-op (`ShutdownAsync` factored out, guarded by an `Interlocked` sentinel so `StopAsync` + `DisposeAsync` compose without double-await).
- Chain-swap unhappy-path recovery is implemented inside `BoltzSwapProvider.PollSwapState`:
  - **Renegotiation** on `transaction.lockupFailed` via `TryRenegotiateChainSwap` (`GET → POST /v2/swap/chain/{id}/quote`). Guarded by `BoltzLimitsValidator` (rejects amounts ≤ 0 or outside Boltz's chain-swap limits). Race-tolerant: on POST 4xx the provider probes Boltz's current status — if it has moved past `transaction.lockupFailed` (concurrent tick already accepted) the renegotiation is treated as successful.
  - **Cooperative BTC refund** (`CoopRefundBtcToArkChainSwap`): for refundable BTC→ARK chain swaps, build the refund tx via `BtcTransactionBuilder.BuildKeyPathClaimTx`, sign via `ChainSwapMusigSession.CooperativeRefundAsync`, broadcast via Boltz, mark `Refunded`.
  - **Cooperative ARK refund** (`CoopRefundArkToBtcChainSwap`): for refundable ARK→BTC chain swaps, snapshot-poll arkd for VHTLC VTXOs, derive a fresh refund destination (persisted as `SwapMetadata.RefundDestination` on first attempt and reused on retries so each tick doesn't leak an orphan contract row), build the Ark refund tx, ask Boltz to co-sign via `RefundChainSwapArkAsync`, merge Boltz's signed PSBTs, submit via `SubmitArkTransaction`, mark `Refunded`. Picks the canonical VTXO (`vtxos.FirstOrDefault(v => v.Amount == swap.ExpectedAmount)`) on double-funded scripts — extras are left to `SweeperService`.
  - **`swap.expired` with no funds locked** → `Failed` with explanation (otherwise the refund branch keeps retrying forever for swaps that have nothing to recover).

## Pending Arkade Transaction Recovery

`PendingArkTransactionRecoveryService` (in `NArk.Core/Services/`) reconciles off-chain txs stranded between `SubmitTx` (server locked the inputs as in-flight) and `FinalizeTx` (crashed before sending the final checkpoint signatures). Without this recovery the server holds the inputs hostage and the user's coins are stuck.

- Runs on host startup via `ArkHostedLifecycle` (after `VtxoSync` so the local VTXO state reflects the in-flight projection).
- Sweeps every wallet known to `IWalletStorage`. For each wallet:
  1. Loads VTXOs from local storage with `includeSpent: true` — the in-flight projection marks the input VTXO as `IsSpent=true`, but BIP-322 only signs an identity message so spent VTXOs are valid proof material.
  2. Batches inputs by 20 (`MaxInputsPerProof` — matches the go-sdk and ts-sdk batching shape and the server's hard cap).
  3. Builds a BIP-322 ownership proof anchored on each batch's first VTXO (`SignBip322Proof` now returns the signed PSBT so callers see the leaf script — a latent bug that arkd's strict `GetPendingTx` path uncovered).
  4. Calls `IClientTransport.GetPendingTxAsync(proof, batch)` — the new transport endpoint.
  5. For every pending tx the server returns, signs the checkpoint PSBTs with the wallet's signer and calls `IClientTransport.FinalizeTx`.
- Per-tx failures raise `RecoveryFailed` (`PendingTxRecoveryFailureEventArgs`) and are skipped — one bad tx never blocks the wallet from booting. The next host start retries any unfinalized leftovers. Subscriber exceptions are caught and logged but never propagate.
- `RecoverAllWalletsAsync` catches general exceptions (not just `OperationCanceledException`) so DB timeouts / connection errors / corrupted state can't kill host startup — the sweep is genuinely best-effort.
- `FinalizePendingArkTransactionsAsync(walletId)` is the on-demand surface (e.g. immediately after a user unlock). **Timing note**: arkd's in-flight projection is async, so the same-process E2E reproducer can race the projection within ~1 s of `SubmitTx`. Production never hits this — recovery runs at host startup, well after any crash. Callers invoking recovery in the same process that just crashed should retry briefly.

## Network Configurations

Pre-configured networks via `ArkNetworkConfig`:
- **Mainnet**: `arkade.computer` / `arkade.money` / `api.boltz.exchange` (the `ark.` subdomain was dropped in PR #82; mutinynet and regtest endpoints unchanged)
- **Mutinynet**: `mutinynet.arkade.sh` / `mutinynet.arkade.money`
- **Regtest**: `localhost:7070` / `localhost:3002` / `localhost:9069`
