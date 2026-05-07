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
- gRPC transport (`GrpcClientTransport` → `IClientTransport`)
- Caching decorator (`CachingClientTransport`)
- Services: `SpendingService`, `CoinService`, `ContractService`, `SweeperService`, `OnchainService`, `IntentGenerationService`, `IntentSynchronizationService`, `VtxoSynchronizationService`, `BatchManagementService`
- Batch: `BatchSession`, `TreeSignerSession`, `TreeValidator`, `TxTree`
- Wallet: `DefaultWalletProvider`, `HierarchicalDeterministicAddressProvider` (canonical HD derivation via `GetDescriptorFromIndex`), `HierarchicalDeterministicWalletSigner`, `NSecWalletSigner`, `SingleKeyAddressProvider`, `WalletFactory`
- Recovery: `HdWalletRecoveryService` (sweeps derivation indices, dedupes by script, persists with `Source=recovery:<provider>`, monotonically bumps `wallet.LastUsedIndex`, probes providers in parallel per index via `Task.WhenAll`, treats throwing providers as not-found), `IndexerVtxoDiscoveryProvider` (arkd indexer probe on `ArkPaymentContract`), `BoardingUtxoDiscoveryProvider` (NBXplorer/Esplora probe on `ArkBoardingContract` on-chain address; conditional registration), `NullContractDiscoveryProvider` (no-op fallback filtered out by orchestrator)
- Scripts: `CollaborativePathArkTapScript`, `UnilateralPathArkTapScript`, `NofNMultisigTapScript`, `HashLockTapScript`, `LockTimeTapScript`
- Events: `PostBatchSessionEvent`, `PostCoinSpendEvent`, `PostSweepActionEvent`, `PostIntentSubmissionEvent`
- Hosting: `ArkApplicationBuilder`, `ServiceCollectionExtensions`

### NArk.Swaps (depends on Core)
- `SwapsManagementService` -- orchestrates submarine (Ark→Lightning), reverse (Lightning→Ark), and chain (ARK<->BTC) swaps. Holds a single long-lived Boltz websocket (`_websocket` guarded by `_websocketLock`, reconnect with 5 s backoff, re-subscribes from `_swapsIdToWatch`); `DoUpdateStorage` and `PollSwapState` use `SubscribeOnWebsocketAsync` / `UnsubscribeOnWebsocketAsync` instead of tearing down the connection per swap-set change.
- `BoltzClient` / `CachedBoltzClient` -- REST API client for Boltz exchange. Stamps `BoltzClient.ReferralId` (configured via `BoltzClientOptions.ReferralId`, defaults to `BoltzClientOptions.DefaultReferralId = "arkade-dotnet-sdk"`) on every Submarine / Reverse / Chain swap-create request so Boltz can attribute traffic to the originating integration. `Configure<BoltzClientOptions>` overrides win over the default; setting it to `null` opts out (the field stays null-suppressed on the wire).
- `BoltzWebsocketClient` -- WebSocket for real-time swap status
- `ChainSwapMusigSession` -- MuSig2 session for cooperative chain swap claiming
- `BtcHtlcScripts` / `BtcTransactionBuilder` -- BTC-side HTLC and transaction construction
- `BoltzLimitsValidator` -- validates swap amounts against Boltz limits
- `PaymentTrackingService` -- background service that auto-updates `IPaymentStorage` / `IPaymentRequestStorage` rows from VTXO, intent, and swap state changes
- `BoltzSwapDiscoveryProvider` -- HD recovery provider that delegates to `SwapsManagementService.RestoreSwaps()`; imports VHTLC contracts itself with canonical `Source=swap:<id>` metadata + swap rows (the documented storage-mutation exception to `IContractDiscoveryProvider`'s contract-list contract)

### NArk.Storage.EfCore (depends on Core + Swaps)
- EF Core implementations of all storage interfaces
- Entities: `VtxoEntity`, `ArkWalletContractEntity`, `ArkIntentEntity`, `ArkSwapEntity`, `ArkWalletEntity` (now carries a JSON-serialized `Metadata: Dictionary<string,string>?` column, provider-agnostic — Postgres `jsonb` / SQLite `TEXT` / SQL Server `nvarchar(max)` via a value-converter + custom `ValueComparer` so EF tracks dictionary mutations), `ArkPaymentEntity`, `ArkPaymentRequestEntity`
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
- `AddArkSwaps()` -- registers `SwapsManagementService` + Boltz clients. `StartAsync` defers `GetServerInfoAsync` to a background retry so host startup does not fail when arkd or Boltz is briefly unreachable.

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

## Network Configurations

Pre-configured networks via `ArkNetworkConfig`:
- **Mainnet**: `arkade.computer` / `arkade.money` / `api.boltz.exchange` (the `ark.` subdomain was dropped in PR #82; mutinynet and regtest endpoints unchanged)
- **Mutinynet**: `mutinynet.arkade.sh` / `mutinynet.arkade.money`
- **Regtest**: `localhost:7070` / `localhost:3002` / `localhost:9069`
