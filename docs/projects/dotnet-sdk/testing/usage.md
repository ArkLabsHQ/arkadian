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
services.AddArkSwapServices();      // SwapsManagementService router (internally calls AddBoltzProvider for backward compat)
// services.AddBoltzProvider();     // explicit Boltz registration (split out so non-Boltz providers can opt in alone)
```

For EF Core consumers, payment tracking and unilateral exit each have their own opt-in entity bundles so consumers that don't use them carry no schema cost:

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.ConfigureArkEntities();          // VTXOs, contracts, intents, wallets, swaps
    modelBuilder.ConfigureArkPaymentEntities();   // ArkPayment + ArkPaymentRequest (opt-in)
    modelBuilder.ConfigureArkExitEntities();      // ExitSession + VirtualTx + VtxoBranch (opt-in)
}
```

SQLite consumers who need `ORDER BY DateTimeOffset` (every paged storage query in the SDK orders by a timestamp column) opt into the ticks converter via `ArkStorageOptions`:

```csharp
modelBuilder.ConfigureArkEntities(new ArkStorageOptions { StoreDateTimeOffsetAsTicks = true });
modelBuilder.ConfigureArkPaymentEntities(new ArkStorageOptions { StoreDateTimeOffsetAsTicks = true });
```

Postgres / MSSQL consumers don't need this — their native `timestamptz` / `datetimeoffset` types sort fine. The flag scopes the converter to Ark-owned entity types only so it can't bleed into the consumer's own `DateTimeOffset` columns; round-trip is UTC (the offset is stripped). See `docs/articles/storage.md` in the repo for migration paths.

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

## Wallet Types (HD / SingleKey × Local / Watch-Only / Remote-Signed)

Wallets have two orthogonal axes (PR #107). `WalletType { HD, SingleKey }` is the key-derivation shape; signing capability is decided at `IWalletProvider.GetSignerAsync` time, not by a flag on `ArkWalletInfo`.

```csharp
// Local HD wallet (Secret = mnemonic).
var hd = await WalletFactory.CreateWallet(mnemonic, destination: null, serverInfo, ct);
await walletStorage.SaveWallet(hd, ct);

// Local SingleKey wallet (Secret = nsec).
var sk = await WalletFactory.CreateWallet("nsec1...", destination: null, serverInfo, ct);
await walletStorage.SaveWallet(sk, ct);

// Watch-only OR remote-signed: Secret = null on the record. WalletType is inferred
// from the descriptor's wildcard (* → HD, bare pubkey → SingleKey) at creation time.
var nonLocal = await WalletFactory.CreateWatchOnlyWallet(
    accountDescriptor: "tr([abcd1234/86'/1'/0']tpub.../0/*)",
    destination: null,
    serverInfo, ct);
await walletStorage.SaveWallet(nonLocal, ct);
```

Which one of "watch-only" vs "remote-signed" a null-Secret wallet ends up as is decided by whether you register an `IRemoteSignerTransport` whose `KnowsWalletAsync(walletId)` returns `true`:

```csharp
public class HardwareSignerTransport : IRemoteSignerTransport
{
    public Task<bool> KnowsWalletAsync(string walletId, CancellationToken ct)
        => _bridge.IsPairedAsync(walletId, ct);

    // GenerateNoncesAsync returns MusigPubNonce only — the secret half stays
    // server-side. SignMusigAsync looks the secret nonce up by (walletId, sessionId).
    public Task<MusigPubNonce> GenerateNoncesAsync(string walletId, OutputDescriptor descriptor,
        MusigContext context, string sessionId, CancellationToken ct)
        => _bridge.GenerateNoncesAsync(walletId, descriptor.ToString(), context, sessionId, ct);

    public Task<MusigPartialSignature> SignMusigAsync(string walletId, OutputDescriptor descriptor,
        MusigContext context, string sessionId, CancellationToken ct)
        => _bridge.SignMusigAsync(walletId, descriptor.ToString(), context, sessionId, ct);

    public Task<ECPubKey> GetPubKeyAsync(string walletId, OutputDescriptor descriptor, CancellationToken ct)
        => _bridge.GetPubKeyAsync(walletId, descriptor.ToString(), ct);

    public Task<(ECXOnlyPubKey, SecpSchnorrSignature)> SignAsync(string walletId, OutputDescriptor descriptor,
        uint256 hash, CancellationToken ct)
        => _bridge.SignAsync(walletId, descriptor.ToString(), hash, ct);
}

services.AddSingleton<IRemoteSignerTransport, HardwareSignerTransport>();
```

`DefaultWalletProvider.GetSignerAsync` returns a `CompositeArkadeWalletSigner` wrapping `RemoteTransportSigningSource` when the transport claims the wallet, and `null` for true watch-only. The `IRemoteSignerTransport` dependency is **optional** on `DefaultWalletProvider` — apps that don't need remote signing don't have to register one. Long-lived transports should add an eviction policy (TTL or bounded count) for abandoned nonces; in-process signing sources rely on remove-on-consume because their lifetime is the batch session.

`TreeSignerSession` and `TransactionHelpers` hoist the null-signer check above their per-VTXO loops so watch-only wallets surface a clear `InvalidOperationException` before any signing work starts (the forfeit-sign path specifically calls out that watch-only wallets can't participate in batches that demand a forfeit).

To plug in something the SDK doesn't ship (HWI, threshold key share, in-browser session signer): implement `IDescriptorSigningSource` and either compose with `DefaultWalletProvider` (when follow-up enriches the wiring) or replace `DefaultWalletProvider` outright with one that builds the composite however you want. The sources `Bip39SigningSource` / `NsecSigningSource` / `RemoteTransportSigningSource` are reference implementations.

## Wallet Recovery

After re-importing a wallet into empty storage, rebuild its local state — contracts (including legacy script variants under deprecated server signers), the HD derivation index, funds (VTXOs), and boltz swap data — via the unified, wallet-type-agnostic `IWalletRecoveryService` (PR #104). `AddArkSwapServices()` registers it alongside `HdWalletRecoveryService`, the indexer / boarding / Boltz discovery probes, and the pending-tx recovery service. Custom probes implement `IContractDiscoveryProvider` and are picked up via DI automatically.

```csharp
var recovery = sp.GetRequiredService<IWalletRecoveryService>();
var report   = await recovery.RecoverAsync(walletId);
// report.WalletType         — HD or SingleKey
// report.HdScan             — RecoveryReport for HD wallets (null for SingleKey)
// report.ContractsRecovered — contracts newly persisted by THIS run (delta, not total)
// report.RestoredSwaps      — SingleKey direct-restore results (HD swaps land in SwapAudit)
// report.SwapAudit          — post-recovery SwapRecoveryInfo for every known swap
// report.FinalizedPendingTxIds — in-flight Arkade txs finalized during recovery
// report.FundsScriptsSynced — VTXOs synced from the indexer for recovered offchain scripts
```

The facade dispatches by wallet type: **HD** wallets get a gap-limit index scan that discovers contracts across **every server signer** (current + each deprecated signer arkd reports — server-key rotation leaves earlier funds under a different script) and restores boltz swaps in-line via the discovery provider; **SingleKey** wallets re-derive their one deterministic default contract (if storage is empty) and restore swaps directly for the wallet's `AccountDescriptor` (throws if it's null). Both paths then finalize any in-flight Arkade transactions and resync funds from the indexer.

To also probe **delegate** (auto-renewal) scripts during recovery — funds locked under an `ArkDelegateContract` derived from a delegation pubkey rather than the default `ArkPaymentContract` — register a `RecoveryDelegateConfig` with the delegate descriptors:

```csharp
services.AddSingleton(new RecoveryDelegateConfig
{
    Delegates = new[] { OutputDescriptor.Parse("...", network) }
});
```

On **mainnet**, recovery also pairs each signer with the historical 7-day unilateral-exit delay (`MAINNET_UNILATERAL_EXIT_DELAY = 605184s`) alongside the arkd-advertised one — arkd only advertises the CURRENT delay, so wallets that minted VTXOs while mainnet still ran the original delay would otherwise silently fail discovery after the operator shortened it.

Tuning via `RecoveryOptions`:

```csharp
var deep   = await recovery.RecoverAsync(walletId, new RecoveryOptions(GapLimit: 50));
var resume = await recovery.RecoverAsync(walletId, new RecoveryOptions(StartIndex: 200));
```

`RecoveryOptions` is HD-only — it's ignored for SingleKey wallets. The lower-level `HdWalletRecoveryService.ScanAsync` is still resolvable from DI for HD-specific callers that don't want the unified pre/post steps. See `docs/articles/recovery.md` in the repo for full provider semantics and tuning.

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

| Network | Ark Server | Boltz | Explorer | Esplora | Electrum WS | Electrum TCP |
|---------|------------|-------|----------|---------|-------------|--------------|
| Mainnet | `arkade.computer` | `api.boltz.exchange` | `arkade.space` | `mempool.arkade.sh/api` | `wss://electrum.arkade.sh` | `electrum.arkade.sh:50001` |
| Mutinynet | `mutinynet.arkade.sh` | `api.boltz.mutinynet.arkade.sh` | `explorer.mutinynet.arkade.sh` | `mempool.mutinynet.arkade.sh/api` | `wss://electrum.mutinynet.arkade.sh` | `electrum.mutinynet.arkade.sh:50001` |
| Regtest | `localhost:7070` | `localhost:9069` | N/A | `localhost:3000` | `ws://localhost:50003` | `localhost:50000` |

`EsploraUri` / `ElectrumWsUri` / `ElectrumTcpUri` are nullable — apps that don't need a chain source can ignore them. Use them straight off the preset to skip running your own NBXplorer / bitcoind:

```csharp
services.AddEsploraBlockchain(new Uri(ArkNetworkConfig.Mainnet.EsploraUri!));
```

## Boltz Referral Attribution

Every Submarine / Reverse / Chain swap-create request the SDK sends carries a Boltz `referralId`. By default it is `BoltzClientOptions.DefaultReferralId` (`"arkade-dotnet-sdk"`), so consumers who don't configure one show up to Boltz as `arkade-dotnet-sdk` instead of anonymous traffic. Override per-integration:

```csharp
services.Configure<BoltzClientOptions>(o => o.ReferralId = "btcpay-arkade");
// or opt out entirely:
services.Configure<BoltzClientOptions>(o => o.ReferralId = null);
```

`Configure` delegates run after the property initializer, so the override wins. A `null` value omits the field from the wire (`JsonIgnoreCondition.WhenWritingNull`).

## Pending Arkade Transaction Recovery

Arkade off-chain transactions are a 2-phase Submit → Finalize flow. If the process crashes between phases, the server holds the inputs in-flight and only allows the original pending tx to be finalized.

`PendingArkTransactionRecoveryService` reconciles this automatically. It runs on host startup via `ArkHostedLifecycle` (after `VtxoSync`) across every wallet. For deterministic per-wallet recovery (e.g. immediately after a user unlock), call:

```csharp
var recovery = sp.GetRequiredService<PendingArkTransactionRecoveryService>();
var finalized = await recovery.FinalizePendingArkTransactionsAsync(walletId, ct);
// finalized: count + ark txids of pending txs that were finalized
```

Subscribe to per-tx failures (UI banner / telemetry) without blocking the loop:

```csharp
recovery.RecoveryFailed += (sender, args) =>
{
    // args.WalletId, args.ArkTxId, args.Exception
    _logger.LogWarning(args.Exception, "Pending tx {ArkTxId} failed to recover", args.ArkTxId);
};
```

Timing: the Arkade server marks input VTXOs as pending-spent via an async projection that runs after `SubmitTx` returns. Calling recovery in the same process that just crashed mid-Submit may briefly observe an empty pending list — retry for ~1 s. Production startup never races this.

## BIP21 / Payment-string Parsing

`ArkBip21.Parse` unifies BIP21 URIs, Ark addresses, BOLT11 invoices, LNURL, and Bitcoin addresses into a single `Bip21PaymentInfo`:

```csharp
var info = ArkBip21.Parse("bitcoin:bc1q...?ark=ark1q...&amount=0.001&lightning=lnbc...");
// info.PreferredMethod -> ArkSend / SubmarineSwap / ChainSwap based on which fields are present
// info.AmountSats (derived from info.Amount, decimal BTC, AwayFromZero rounding)
// info.OnchainAddress / info.ArkAddress / info.Lightning / info.AssetId
```

Lenient `Parse` accepts raw strings; `ParseStrict` enforces a valid BIP21 URI. The sample wallet's Send page consumes this directly (`samples/NArk.Wallet/NArk.Wallet.Client/Pages/Send.razor`) — LNURL is still resolved via `LnurlHelper` (`ArkBip21` deliberately doesn't fan out to LNURL endpoints).

Build URIs via the fluent builder:

```csharp
var uri = new ArkBip21Builder(onchainAddress: "bc1q...")
    .WithArkAddress("ark1q...")
    .WithAmount(0.001m)
    .WithAssetId("aaa...")
    .WithCustomParameter("label", "Coffee")
    .Build();
```

## Swap Recovery Diagnostics

`InspectSwapRecoveryAsync` returns a read-only snapshot of one swap's recovery state. Recovery itself runs automatically inside `BoltzSwapProvider.PollSwapState` — these helpers are purely for UI/audit reporting:

```csharp
var info = await swaps.InspectSwapRecoveryAsync(walletId, swapId, ct);
// info.Status: Recoverable | NoFunds | AlreadyRefunded | AlreadySettled | StillPending | SwapNotFound | InspectionError
// info.VtxoCount, info.AmountSats

// Bulk version (O(N) sequential arkd round-trip — not for hot UI paths):
var allRecoverable = await swaps.ScanRecoverableSwapsAsync(walletId, ct);
```

## Unilateral Exit

When arkd is unavailable or uncooperative, `UnilateralExitService` drives the full exit pipeline (broadcast tree chain → wait for CSV → claim the leaf). Three operating shapes for different consumer profiles:

### Option A — Stateful with EF Core persistence

```csharp
services.AddArkCoreServices();
services.AddNBXplorerBlockchain(explorerClient);   // or AddEsploraBlockchain / AddRpcBlockchain
services.AddUnilateralExit();
services.AddVirtualTxAutoFetch();                  // optional: pre-store chains on every new VTXO

// EF DbContext: opt into the three new tables
protected override void OnModelCreating(ModelBuilder mb)
{
    mb.ConfigureArkEntities();
    mb.ConfigureArkExitEntities();                 // ExitSession + VirtualTx + VtxoBranch
}

// At exit time:
var exits = sp.GetRequiredService<UnilateralExitService>();
await exits.StartExitAsync(walletId, vtxoOutpoint, claimAddress, ct);
// Drive the state machine on a timer (or rely on ExitWatchtowerBackgroundService):
await exits.ProgressExitsAsync(ct);
```

`StartExitAsync` is idempotent — calling it twice for the same outpoint returns the existing session, no duplicates. Sessions in any state (including `Failed` with `FailReason`) are visible via `GetByVtxoAsync`. `VirtualTxOptions.DefaultMode` defaults to `Lite` (txids + expiry stored at every VTXO arrival, hex fetched on demand at `StartExitAsync`); set to `Full` for strict offline-exit requirements.

### Option B — Stateful with in-memory storage (no schema)

```csharp
services.AddUnilateralExit();
services.AddInMemoryExitStorage();                  // ConcurrentDictionary-backed, lost on restart
// Skip ConfigureArkExitEntities() — no tables registered
```

Same code paths as Option A; right for recovery-tooling CLIs, plugins, sample apps, ephemeral wallets.

### Option C — Stateless one-shot API (caller owns persistence)

```csharp
services.AddUnilateralExit();
// No storage registrations — neither ConfigureArkExitEntities nor AddInMemoryExitStorage

var exits = sp.GetRequiredService<UnilateralExitService>();
ExitPlan plan = await exits.BroadcastExitChainAsync(walletId, vtxoOutpoint, claimAddress, ct);
// Persist `plan` in whatever form fits your app (JSON blob, settings entry, file on disk).

// Later, after the CSV timelock should have matured:
string? claimTxid = await exits.ClaimMaturedExitAsync(plan, ct);
// claimTxid: the broadcast txid on success
// null: CSV hasn't matured yet — caller polls again later
// throws: the leaf-tx hasn't even confirmed yet
```

Trade-off vs. stateful path: no idempotency (re-broadcasts if called twice), no automatic watchtower progression — the SDK is pure pass-through, caller owns time-keeping. Gain: zero exit-specific persistence cost, no schema, no extra DI registrations.

### CPFP (optional)

Tree txs are v3 (TRUC); Bitcoin Core rejects them on direct broadcast unless their parent is also v3 or they ride a 1p1c CPFP package. Provide an `IFeeWallet` to enable CPFP:

```csharp
services.AddSingleton<IFeeWallet, MyFeeWallet>();
```

`UnilateralExitService.BroadcastWithCpfpAsync` activates the CPFP path when an `IFeeWallet` is registered; gracefully falls back to direct broadcast when not (regtest `minrelaytxfee=0` makes that acceptable for tree txs).

`IFeeWallet.SignFeeUtxoAsync(outpoint, sighash, sighashType)` is a sighash-callback signing API — the SDK never holds raw key material, so hardware wallets / HSMs / remote signers / BTCPay's internal signer can plug in. `SelectFeeUtxoAsync` returns `ICoin?` (NBitcoin standard).

## Live Sample Wallet

A complete Blazor WebAssembly wallet using NArk lives at `samples/NArk.Wallet/NArk.Wallet.Client/`. It is published to GitHub Pages at `https://arkade-os.github.io/dotnet-sdk/wallet/` alongside the DocFX site. Useful as a reference for: real QR rendering (QRCoder), Lightning receive via Boltz reverse swap, BTC-on-chain receive via chain swap, smart Send (Ark / on-chain / BOLT11 / BIP21 / LNURL / Lightning Address), dedicated `Contracts` / `Vtxos` / `Swaps` / `Intents` list+detail pages, mnemonic / nsec backup, and Bit.Besql for SQLite-on-WASM without COOP/COEP.

## Reference Documentation

The full DocFX site (API reference + conceptual articles) is published to GitHub Pages on every push to `master`. Build locally with `docfx docfx.json --serve`.
