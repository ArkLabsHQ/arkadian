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
- gRPC transport (`GrpcClientTransport` → `IClientTransport`); `IClientTransport.GetPendingTxAsync` surfaces server-side pending Arkade txs gated by a BIP-322 ownership proof. New chain-introspection methods `GetVtxoChainAsync`, `GetVirtualTxsAsync`, `GetVtxoTreeAsync` (and their REST equivalents in `RestClient/RestClientTransport.Exit.cs`) power the unilateral-exit pipeline
- Caching decorator (`CachingClientTransport`)
- Services: `SpendingService`, `CoinService`, `ContractService`, `SweeperService`, `OnchainService`, `IntentGenerationService`, `IntentSynchronizationService`, `VtxoSynchronizationService`, `BatchManagementService`, `PendingArkTransactionRecoveryService`, `UnilateralExitService`, `VirtualTxService`, `ExitWatchtowerService` (+ `ExitWatchtowerBackgroundService`), `VtxoChainAutoFetchService`
- Blockchain (`NArk.Core/Blockchain/`): `NBXplorerBlockchain`, `EsploraBlockchain`, `RpcBlockchain` — concrete `IBitcoinBlockchain` impls that collapsed the previous split `IBoardingUtxoProvider` + `IChainTimeProvider` + `IOnchainBroadcaster` trio. RPC impl throws `NotSupportedException` on `GetUtxosAsync` (no native address index — pair with NBX/Esplora for boarding-UTXO discovery)
- Exit pipeline (`NArk.Core/Exit/`, `NArk.Core/VirtualTxs/`): `P2ACpfpBuilder` (v3 1p1c CPFP children for TRUC tree-tx relay; takes `IFeeWallet` for sighash-callback signing — never holds raw keys); `InMemoryExitSessionStorage` + `InMemoryVirtualTxStorage` (`ConcurrentDictionary`-backed alternatives to the EF Core storages, wired via `AddInMemoryExitStorage()`)
- Events: `PostSpendVirtualTxPruneHandler` (auto-wired prune-on-spend, serializable transaction for `PruneForSpentVtxoAsync` race)
- Batch: `BatchSession`, `TreeSignerSession`, `TreeValidator`, `TxTree`
- Wallet: `DefaultWalletProvider`, `HierarchicalDeterministicAddressProvider` (canonical HD derivation via `GetDescriptorFromIndex`), `HierarchicalDeterministicWalletSigner`, `NSecWalletSigner`, `SingleKeyAddressProvider`, `WalletFactory`
- Recovery: `HdWalletRecoveryService` (sweeps derivation indices, dedupes by script, persists with `Source=recovery:<provider>`, monotonically bumps `wallet.LastUsedIndex`, probes providers in parallel per index via `Task.WhenAll`, treats throwing providers as not-found), `IndexerVtxoDiscoveryProvider` (arkd indexer probe on `ArkPaymentContract`), `BoardingUtxoDiscoveryProvider` (NBXplorer/Esplora probe on `ArkBoardingContract` on-chain address; conditional registration), `NullContractDiscoveryProvider` (no-op fallback filtered out by orchestrator)
- Scripts: `CollaborativePathArkTapScript`, `UnilateralPathArkTapScript`, `NofNMultisigTapScript`, `HashLockTapScript`, `LockTimeTapScript`
- Assets (`NArk.Core/Assets/`): `AssetPacketBuilder.Build` emits `AssetGroup` entries in a deterministic order by `AssetId` (ordinal hex sort over the 34-byte `txid ‖ groupIndex_LE` serialization — same ordering as rust-sdk's `(txid, groupIndex)` sort), so the same logical transfer always serializes to identical OP_RETURN bytes regardless of input order or `HashSet` enumeration. Required for cross-SDK fixture stability against ts-sdk / rust-sdk and for reproducible packets across runs
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
- Entities: `VtxoEntity`, `ArkWalletContractEntity`, `ArkIntentEntity`, `ArkSwapEntity`, `ArkWalletEntity` (carries a JSON-serialized `Metadata: Dictionary<string,string>?` column, provider-agnostic — Postgres `jsonb` / SQLite `TEXT` / SQL Server `nvarchar(max)` via a value-converter + custom `ValueComparer` so EF tracks dictionary mutations), `ArkPaymentEntity` (adds JSONB `AssetsJson` column), `ArkPaymentRequestEntity` (adds JSONB `ExpectedAssetJson` + `ReceivedAssetsJson` columns), `ExitSessionEntity`, `VirtualTxEntity` (carries `Type` column mapped from `ChainedTxType` with default `Unspecified` for back-compat — partial Lite-mode rows can be upgraded later without clobbering provenance), `VtxoBranchEntity`
- `ModelBuilderExtensions.ConfigureArkEntities()` for core schema; opt-in `ConfigureArkPaymentEntities()` for payment tables; opt-in `ConfigureArkExitEntities()` for the three exit tables (only EF consumers that drive a unilateral exit pay the schema cost — matches the pattern set by `ConfigureArkPaymentEntities()`)
- `EfCorePaymentStorage` / `EfCorePaymentRequestStorage` for the payment tracking surface; `EfCoreExitSessionStorage` / `EfCoreVirtualTxStorage` for the exit surface
- `ArkStorageOptions.StoreDateTimeOffsetAsTicks` (default off) opts every Ark `DateTimeOffset` column into a `ValueConverter<DateTimeOffset, long>` so SQLite consumers can `ORDER BY` / filter on those columns (the native EF Core SQLite mapping rejects `ORDER BY DateTimeOffset`). Storage becomes BIGINT / INTEGER on disk (Postgres / MSSQL keep native `timestamptz` / `datetimeoffset` when the flag is off). Scoped to an explicit `ArkOwnedEntityTypes` set so consumer-owned entities in the same `DbContext` are not silently rewritten; guarded against double-application across `ConfigureArkEntities` + `ConfigureArkPaymentEntities`. Trade-off: opt-in is a schema change and the offset is stripped on read-back (round-trip is UTC, offset zero) — documented in `docs/articles/storage.md`
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
- `AddBoltzProvider()` -- registers the typed `BoltzClient` HttpClient (idempotent — re-registering elsewhere is a no-op), `CachedBoltzClient`, and `BoltzSwapProvider` as `ISwapProvider`. Self-contained: direct-DI consumers (no `ArkApplicationBuilder`) get `BoltzSwapProvider` resolvable from this single call. Split out of `AddArkSwapServices` so non-Boltz providers can opt in without dragging in the Boltz client.
- `AddUnilateralExit()` -- registers `UnilateralExitService`, `ExitWatchtowerService` + its `BackgroundService`, `VirtualTxService`, `P2ACpfpBuilder`, and `PostSpendVirtualTxPruneHandler`. Caller still picks a storage backend (`ConfigureArkExitEntities()` on the EF `DbContext`, or `AddInMemoryExitStorage()` for the `ConcurrentDictionary` backed alternative). Without either, the stateless `BroadcastExitChainAsync` / `ClaimMaturedExitAsync` API still works (caller owns persistence of the returned `ExitPlan`).
- `AddVirtualTxAutoFetch()` -- registers `VtxoChainAutoFetchService` (hosted) that listens to `IVtxoStorage.VtxosChanged` and pre-stores virtual-tx chains for every new VTXO above the configured worth-threshold. Not pulled in by `AddUnilateralExit`: hosts that want chains pre-stored ahead of any potential exit opt in additionally; otherwise the on-demand `EnsureHexPopulatedAsync` path at `StartExitAsync` time is used. `VirtualTxOptions.DefaultMode` defaults to `Lite` (txids + expiry only, hex fetched on demand) — set to `Full` for strict offline-exit guarantees.
- `AddInMemoryExitStorage()` -- registers `InMemoryExitSessionStorage` + `InMemoryVirtualTxStorage` as the exit-pipeline storage. Same code paths as the EF Core flow (idempotent re-invocation, watchtower visibility) but state is lost on process restart. Right for recovery-tooling CLIs, plugins, ephemeral wallets, sample apps that just want exit primitives without DB schema.
- `AddNBXplorerBlockchain` / `AddEsploraBlockchain` / `AddRpcBlockchain` -- one DI helper per blockchain backend that registers every `IBitcoinBlockchain` member that backend supports against a single backend client (replaces three separate `AddSingleton` lines wrapping the same `ExplorerClient`). Composites don't clobber prior registrations — last-wins semantics let consumers swap one slot of the trio per backend after the bulk call.

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

## Unilateral Exit Pipeline

`UnilateralExitService` (in `NArk.Core/Services/`) drives the full exit flow when arkd is unavailable or uncooperative. State machine: `Broadcasting` → `AwaitingCsvDelay` → `Claimable` → `Claiming` → `Completed` (or `Failed` with `FailReason` if a step exceeds `MaxBroadcastRetries=10`).

**Two operating shapes**:

- **Stateful (`StartExitAsync` + `ProgressExitsAsync`)** — idempotent re-invocation for the same outpoint (returns the existing session, no duplicates). Watchtower can observe sessions via `GetActiveSessionsAsync` / `GetByVtxoAsync`. Requires either `ConfigureArkExitEntities()` (EF Core, persistent) or `AddInMemoryExitStorage()` (`ConcurrentDictionary`, lost on restart).
- **Stateless (`BroadcastExitChainAsync` + `ClaimMaturedExitAsync`)** — pure pass-through with zero exit-specific persistence. `BroadcastExitChainAsync(walletId, vtxoOutpoint, claimAddress)` fetches the chain fresh from arkd, broadcasts every off-chain row that isn't already on-chain, and returns an `ExitPlan` record (wallet id, vtxo outpoint, claim address, leaf txid, CSV delay). Caller persists `ExitPlan` in whatever form they want (JSON blob, settings entry, file on disk), and feeds it back to `ClaimMaturedExitAsync` once they think the CSV timelock has matured. Returns the claim txid on success, `null` when CSV hasn't matured (caller polls again later), or throws when the leaf-tx hasn't even confirmed yet. Trade-off vs. stateful path: no idempotency (re-broadcasts if called twice), no automatic watchtower progression — gain is zero exit-specific schema or DI footprint.

**Backing services**:

- `VirtualTxService` — Fetches and stores virtual-tx branches via `IClientTransport.GetVtxoChainAsync` + `GetVirtualTxsAsync`. `VirtualTxOptions.DefaultMode` defaults to `Lite` (txids + expiry only — most VTXOs settle into the next batch or get spent off-chain, so the hex fetch is deferred to `StartExitAsync`'s `EnsureHexPopulatedAsync`). `Full` mode stores raw tx hex at every VTXO arrival (two arkd round-trips per VTXO, scaling with chain depth) — opt in for strict offline-exit requirements. Stores the **whole chain** including the on-chain `Commitment` root tagged with `ChainedTxType` (`Unspecified` / `Commitment` / `Ark` / `Tree` / `Checkpoint`); `Commitment` rows have null hex since arkd's `GetVirtualTxs` doesn't carry on-chain hex (the tx is already on-chain). `EnsureHexPopulatedAsync` ignores `Commitment` when deciding whether a branch is fully populated; `ProgressBroadcastingAsync` skips `Commitment` rows in its broadcast loop. Per-tx model deduplicates shared tree nodes across sibling VTXOs.
- `ParseVirtualTx` — Branches on `ChainedTxType`: **Tree** txs lift `PSBT_IN_TAP_KEY_SIG` (NBitcoin's `psbtInput.TaprootKeySignature`) and assemble `WitScript(new[] { sig.ToBytes() }, true)` directly — tree txs are MuSig2-cosigned via the taproot key-path and arkd's PSBT omits `witness_utxo` / `non_witness_utxo` (which `PSBT.Finalize` would require). **Ark / Checkpoint / Unspecified** try `Finalize+ExtractTransaction`, falling back to lifting `FinalScriptWitness` on `PSBTException`. **Commitment** is filtered out one layer up (already on-chain).
- `P2ACpfpBuilder` — Builds v3 CPFP children for 1p1c package relay so the v3 (TRUC) tree txs can ride out Bitcoin Core's TRUC-violation check (the parent has only a 0-sat P2A anchor). Two-stage fee-rate adjustment (signs twice if vsize estimate was off). Takes an `IFeeWallet` for the sighash-callback signing path — the SDK computes the sighash and asks the wallet for a `SecpSchnorrSignature` via `SignFeeUtxoAsync(outpoint, sighash, sighashType)`, so the wallet can produce it however it likes (in-memory `Key`, hardware device, HSM, remote signer, BTCPay's internal signer). `IFeeWallet.SelectFeeUtxoAsync` returns `ICoin?` (NBitcoin standard; no parallel `FeeUtxo` type). `UnilateralExitService.BroadcastWithCpfpAsync` activates the CPFP path when an `IFeeWallet` is registered; gracefully falls back to direct broadcast when not (regtest `minrelaytxfee=0` makes that acceptable for tree txs, downstream consumers wanting CPFP supply the fee wallet).
- `ExitWatchtowerService` + `ExitWatchtowerBackgroundService` — Detect partial tree broadcasts (someone else started unrolling a tree branch) and auto-start exits on owned VTXOs whose ancestors hit the chain. Derives a boarding-contract claim address via `IContractService`. Skips VTXOs without stored branches before making RPC calls.
- `VtxoChainAutoFetchService` — Opt-in (`AddVirtualTxAutoFetch()`) hosted service that listens to `IVtxoStorage.VtxosChanged` and queues a chain fetch for every new VTXO above the configured worth-threshold. Replaces the batch-only `PostBatchVirtualTxFetchHandler` — VTXOs arrive from many sources (batch, change from a spend, incoming payment, swap claim, sweep), all of which can later need a unilateral exit. `FetchAndStoreBranchAsync`'s `HasBranchAsync` short-circuit makes duplicate events cheap. `PostSpendVirtualTxPruneHandler` stays auto-wired (cleanup is safe regardless of whether auto-fetch is on).

**Storage shape**:

- `IExitSessionStorage` — Tracks per-exit sessions with `RetryCount`, `FailReason`, state filters (`GetActiveSessionsAsync` skips `Failed`/`Completed`; `GetByVtxoAsync` returns sessions in any state so callers can see why a Failed session went bad).
- `IVirtualTxStorage` — Per-tx model with shared-node deduplication across sibling VTXOs; orphan cleanup on prune respects shared chain nodes (won't drop a tx still referenced by another live VTXO).

## Network Configurations

Pre-configured networks via `ArkNetworkConfig`:
- **Mainnet**: `arkade.computer` / `arkade.money` / `api.boltz.exchange` (the `ark.` subdomain was dropped in PR #82; mutinynet and regtest endpoints unchanged)
- **Mutinynet**: `mutinynet.arkade.sh` / `mutinynet.arkade.money`
- **Regtest**: `localhost:7070` / `localhost:3002` / `localhost:9069`
