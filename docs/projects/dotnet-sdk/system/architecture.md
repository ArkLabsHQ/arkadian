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
- Defines: `ArkVtxo`, `ArkIntent`, `ArkCoin`, `ArkContract`, `ArkAddress`, `ArkTxOut`, `ArkPayment`, `ArkPaymentRequest`
- Interfaces: `IVtxoStorage`, `IContractStorage`, `IIntentStorage`, `IWalletStorage`, `IWalletProvider`, `ISafetyService`, `IChainTimeProvider`, `IFeeEstimator`, `IActiveScriptsProvider`, `IIntentScheduler`, `IPaymentStorage`, `IPaymentRequestStorage`
- Vendored `Scripting/` namespace: `OutputDescriptor`, `OutputDescriptorParser`, `PubKeyProvider`, `SigningRepository`, parser combinators, `NBitcoinCompat` shim (replaces removed NBitcoin 10 helpers; HAS_SPAN gated)

### NArk.Core (depends on Abstractions)
- gRPC transport (`GrpcClientTransport` → `IClientTransport`)
- Caching decorator (`CachingClientTransport`)
- Services: `SpendingService`, `CoinService`, `ContractService`, `SweeperService`, `OnchainService`, `IntentGenerationService`, `IntentSynchronizationService`, `VtxoSynchronizationService`, `BatchManagementService`
- Batch: `BatchSession`, `TreeSignerSession`, `TreeValidator`, `TxTree`
- Wallet: `DefaultWalletProvider`, `HierarchicalDeterministicAddressProvider`, `HierarchicalDeterministicWalletSigner`, `NSecWalletSigner`, `SingleKeyAddressProvider`, `WalletFactory`
- Scripts: `CollaborativePathArkTapScript`, `UnilateralPathArkTapScript`, `NofNMultisigTapScript`, `HashLockTapScript`, `LockTimeTapScript`
- Events: `PostBatchSessionEvent`, `PostCoinSpendEvent`, `PostSweepActionEvent`, `PostIntentSubmissionEvent`
- Hosting: `ArkApplicationBuilder`, `ServiceCollectionExtensions`

### NArk.Swaps (depends on Core)
- `SwapsManagementService` -- orchestrates submarine (Ark→Lightning), reverse (Lightning→Ark), and chain (ARK<->BTC) swaps
- `BoltzClient` / `CachedBoltzClient` -- REST API client for Boltz exchange
- `BoltzWebsocketClient` -- WebSocket for real-time swap status
- `ChainSwapMusigSession` -- MuSig2 session for cooperative chain swap claiming
- `BtcHtlcScripts` / `BtcTransactionBuilder` -- BTC-side HTLC and transaction construction
- `BoltzLimitsValidator` -- validates swap amounts against Boltz limits
- `PaymentTrackingService` -- background service that auto-updates `IPaymentStorage` / `IPaymentRequestStorage` rows from VTXO, intent, and swap state changes

### NArk.Storage.EfCore (depends on Core + Swaps)
- EF Core implementations of all storage interfaces
- Entities: `VtxoEntity`, `ArkWalletContractEntity`, `ArkIntentEntity`, `ArkSwapEntity`, `ArkWalletEntity`, `ArkPaymentEntity`, `ArkPaymentRequestEntity`
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

## Network Configurations

Pre-configured networks via `ArkNetworkConfig`:
- **Mainnet**: `arkade.computer` / `arkade.money` / `api.ark.boltz.exchange`
- **Mutinynet**: `mutinynet.arkade.sh` / `mutinynet.arkade.money`
- **Regtest**: `localhost:7070` / `localhost:3002` / `localhost:9069`
