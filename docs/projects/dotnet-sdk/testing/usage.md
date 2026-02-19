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
```

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

For EF Core implementations, use `NArk.Storage.EfCore`:

```csharp
services.AddArkEfCoreStorage<MyDbContext>();
```

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
| Mainnet | `arkade.computer` | `api.ark.boltz.exchange` | `arkade.space` |
| Mutinynet | `mutinynet.arkade.sh` | `api.boltz.mutinynet.arkade.sh` | `explorer.mutinynet.arkade.sh` |
| Regtest | `localhost:7070` | `localhost:9069` | N/A |
