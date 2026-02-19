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
- Defines: `ArkVtxo`, `ArkIntent`, `ArkCoin`, `ArkContract`, `ArkAddress`, `ArkTxOut`
- Interfaces: `IVtxoStorage`, `IContractStorage`, `IIntentStorage`, `IWalletStorage`, `IWalletProvider`, `ISafetyService`, `IChainTimeProvider`, `IFeeEstimator`, `IActiveScriptsProvider`, `IIntentScheduler`

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
- `BoltzSwapsService` -- orchestrates ARK<->BTC chain swaps
- `BoltzClient` (HTTP) -- REST API client for Boltz exchange
- `BoltzWebsocketClient` -- WebSocket for real-time swap status
- `ChainSwapMusigSession` -- MuSig2 session for cooperative chain swap claiming
- `BtcHtlcScripts` / `BtcTransactionBuilder` -- BTC-side HTLC and transaction construction
- `BoltzLimitsValidator` -- validates swap amounts against Boltz limits

### NArk.Storage.EfCore (depends on Core + Swaps)
- EF Core implementations of all storage interfaces
- Entities: `VtxoEntity`, `ArkWalletContractEntity`, `ArkIntentEntity`, `ArkSwapEntity`, `ArkWalletEntity`
- `ModelBuilderExtensions` for schema configuration
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

## gRPC Transport

Proto definitions in `NArk.Core/Transport/GrpcClient/Protos/ark/v1/`:
- `service.proto` -- Ark service API (intents, batches, transactions)
- `types.proto` -- Shared type definitions
- `indexer.proto` -- VTXO indexer API

The `GrpcClientTransport` is wrapped by `CachingClientTransport` to cache server info responses.

## E2E Test Infrastructure (Aspire AppHost)

`NArk.AppHost` uses .NET Aspire to orchestrate a full local environment:
- **Bitcoin Core** (regtest) -- blockchain
- **Electrs** + **Esplora** -- block explorer
- **Chopsticks** -- faucet and mining
- **PostgreSQL** -- databases for arkd, NBXplorer, Boltz
- **NBXplorer** -- chain tracking
- **arkd** + **ark-wallet** -- Ark Service Provider
- **Boltz** + **Boltz-LND** + **LND** + **Boltz-Fulmine** -- swap infrastructure

Automatic setup: wallet creation, funding via faucet, LND channel opening, fulmine funding.

## Network Configurations

Pre-configured networks via `ArkNetworkConfig`:
- **Mainnet**: `arkade.computer` / `arkade.money` / `api.ark.boltz.exchange`
- **Mutinynet**: `mutinynet.arkade.sh` / `mutinynet.arkade.money`
- **Regtest**: `localhost:7070` / `localhost:3002` / `localhost:9069`
