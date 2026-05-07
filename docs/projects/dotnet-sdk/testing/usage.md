# NArk -- Usage Guide

## Quick Start

### 1. Install NuGet Package

```bash
dotnet add package NArk
# Or individual packages:
dotnet add package NArk.Core
dotnet add package NArk.Swaps
dotnet add package NArk.Storage.EfCore
```

### 2. Configure via Builder Pattern

```csharp
using NArk.Hosting;

var host = Host.CreateDefaultBuilder()
    .AddArk()
        .OnMainnet()  // or .OnRegtest(), .OnMutinynet(), .OnCustomGrpcArk("url")
        .WithWalletProvider<MyWalletProvider>()
        .WithVtxoStorage<MyVtxoStorage>()
        .WithContractStorage<MyContractStorage>()
        .WithIntentStorage<MyIntentStorage>()
        .WithSafetyService<MySafetyService>()
        .WithTimeProvider<MyTimeProvider>()
    .Build();

await host.RunAsync();
```

### 3. Or Use ServiceCollection Directly

```csharp
services.AddArkCoreServices();
services.AddArkMainnet();
// Register your storage implementations...

// Opt-in features (none of these are pulled in by AddArkCoreServices):
services.AddArkDelegation();        // DelegationService + IDelegationTransformer
services.AddArkPaymentTracking();   // PaymentTrackingService (pair with payment storage)
services.AddArkSwaps();             // SwapsManagementService + Boltz clients
```

For EF Core consumers, payment tracking also requires the payment tables:

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.ConfigureArkEntities();          // VTXOs, contracts, intents, wallets, swaps
    modelBuilder.ConfigureArkPaymentEntities();   // ArkPayment + ArkPaymentRequest (opt-in)
}
```

### 4. Custom Signets / Mutinynet

arkd reports its network as raw strings (`mutinynet`, `signet`, etc.). Use the helper in transports rather than calling `Network.GetNetwork()` directly — it maps the known custom names onto the correct NBitcoin `Network`:

```csharp
var network = NetworkExtensions.ResolveArkNetwork("mutinynet");
```

This is what `GrpcClientTransport` and `RestClientTransport` use internally when parsing `GetInfo`.

## Required Implementations

You must provide implementations for these interfaces:

| Interface | Purpose |
|-----------|---------|
| `IVtxoStorage` | Persist and query VTXOs |
| `IContractStorage` | Persist and query Taproot contracts |
| `IIntentStorage` | Persist and query transaction intents |
| `IWalletStorage` | Persist wallet metadata |
| `IWalletProvider` | Provide wallet signer and address provider |
| `ISafetyService` | Ensure no double-spend of VTXOs |
| `IChainTimeProvider` | Current block height and timestamp |

Optional, only when `AddArkPaymentTracking()` is registered:

| Interface | Purpose |
|-----------|---------|
| `IPaymentStorage` | Persist outbound `ArkPayment` records |
| `IPaymentRequestStorage` | Persist inbound `ArkPaymentRequest` records |

For EF Core implementations, use `NArk.Storage.EfCore`:

```csharp
services.AddArkEfCoreStorage<MyDbContext>();
```

## HD Wallet Recovery

After re-importing an HD wallet from its mnemonic, rebuild local contract state by running the gap-limit scanner. `AddArkCoreServices()` registers `HdWalletRecoveryService`, the indexer probe, and (when an `IBoardingUtxoProvider` is also registered) the boarding probe; `AddArkSwapServices()` adds the Boltz probe. Custom probes implement `IContractDiscoveryProvider` and are picked up via DI automatically.

```csharp
var recovery = sp.GetRequiredService<HdWalletRecoveryService>();
var report = await recovery.ScanAsync(walletId);                                  // gap=20, max=10000
var deep   = await recovery.ScanAsync(walletId, new RecoveryOptions(GapLimit: 50));
var resume = await recovery.ScanAsync(walletId, new RecoveryOptions(StartIndex: 200));
// report.HighestUsedIndex, report.ProviderHits, report.DiscoveredContracts
```

Single-key wallets throw (no notion of indexing). The orchestrator dedupes contracts by script and never lowers `wallet.LastUsedIndex`. See `docs/articles/recovery.md` in the repo for full provider semantics and tuning.

## Spending VTXOs

```csharp
// Inject ISpendingService
var txId = await spendingService.Spend(
    walletId: "my-wallet",
    outputs: [new ArkTxOut(ArkTxOutType.Vtxo, Money.Satoshis(50000), recipientAddress)],
    cancellationToken);

// Or with manual coin selection:
var coins = await spendingService.GetAvailableCoins("my-wallet");
var txId = await spendingService.Spend("my-wallet", selectedCoins, outputs);
```

## Network Configurations

| Network | Ark Server | Boltz | Explorer |
|---------|------------|-------|----------|
| Mainnet | `arkade.computer` | `api.boltz.exchange` | `arkade.space` |
| Mutinynet | `mutinynet.arkade.sh` | `api.boltz.mutinynet.arkade.sh` | `explorer.mutinynet.arkade.sh` |
| Regtest | `localhost:7070` | `localhost:9069` | N/A |

## Boltz Referral Attribution

Every Submarine / Reverse / Chain swap-create request the SDK sends carries a Boltz `referralId`. By default it is `BoltzClientOptions.DefaultReferralId` (`"arkade-dotnet-sdk"`), so consumers who don't configure one show up to Boltz as `arkade-dotnet-sdk` instead of anonymous traffic. Override per-integration:

```csharp
services.Configure<BoltzClientOptions>(o => o.ReferralId = "btcpay-arkade");
// or opt out entirely:
services.Configure<BoltzClientOptions>(o => o.ReferralId = null);
```

`Configure` delegates run after the property initializer, so the override wins. A `null` value omits the field from the wire (`JsonIgnoreCondition.WhenWritingNull`).

## Live Sample Wallet

A complete Blazor WebAssembly wallet using NArk lives at `samples/NArk.Wallet/NArk.Wallet.Client/`. It is published to GitHub Pages at `https://arkade-os.github.io/dotnet-sdk/wallet/` alongside the DocFX site. Useful as a reference for: real QR rendering (QRCoder), Lightning receive via Boltz reverse swap, BTC-on-chain receive via chain swap, smart Send (Ark / on-chain / BOLT11 / BIP21 / LNURL / Lightning Address), dedicated `Contracts` / `Vtxos` / `Swaps` / `Intents` list+detail pages, mnemonic / nsec backup, and Bit.Besql for SQLite-on-WASM without COOP/COEP.

## Reference Documentation

The full DocFX site (API reference + conceptual articles) is published to GitHub Pages on every push to `master`. Build locally with `docfx docfx.json --serve`.
