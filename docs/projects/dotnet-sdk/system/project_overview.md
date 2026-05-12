# NArk (.NET Ark SDK) -- Project Overview

## What is NArk?

NArk is a .NET SDK for building Ark protocol wallets and applications. It provides the complete client-side stack for interacting with an Ark Service Provider (arkd) -- including VTXO lifecycle management, batch round participation with MuSig2 tree signing, intent-based off-chain transactions, coin selection, on-chain sweeping/recovery, and Boltz atomic swaps (ARK<->BTC).

The SDK is published as NuGet packages and designed to integrate into any .NET application via dependency injection and the `IHostBuilder` pattern.

## NuGet Packages

| Package | Purpose |
|---------|---------|
| **NArk.Abstractions** | Interfaces, models, contracts, vendored NBitcoin.Scripting (OutputDescriptor, parser, SigningRepository), `ArkBip21` builder + parser |
| **NArk.Core** | All services, gRPC + REST transport, batch sessions, scripts, wallet, coin selection, pending-tx recovery |
| **NArk.Swaps** | Multi-provider swap architecture (`ISwapProvider` abstraction + `BoltzSwapProvider`), VHTLC, MuSig2 cross-signatures, PaymentTrackingService (`IHostedService`) |
| **NArk.Storage.EfCore** | Entity Framework Core storage (VTXOs, contracts, intents, wallets, swaps, payments, payment requests) |
| **NArk** | Meta-package aggregating Core + Swaps |

## Core Features

1. **VTXO Management** -- Track, poll, and synchronize VTXOs across wallets with active script monitoring
2. **Batch Session Participation** -- Join arkd batch rounds: register intents, exchange MuSig2 nonces, sign VTXO trees, submit forfeit transactions
3. **Intent System** -- Create, register, synchronize, and schedule Ark intents for off-chain transactions
4. **Coin Selection** -- Automatic coin selection with dust threshold handling and sub-dust OP_RETURN support
5. **Taproot Contracts** -- Payment contracts, note contracts, hash-locked contracts, VHTLC contracts with Tapscript leaf trees
6. **On-Chain Operations** -- Boarding (on-chain to off-chain), settlement, and collaborative exit
7. **Sweeping** -- Automated recovery of expired and swept VTXOs on-chain
8. **Multi-Provider Swaps** -- ARK-to-BTC and BTC-to-ARK chain swaps, submarine, and reverse swaps via a pluggable `ISwapProvider` interface. `SwapsManagementService` is a provider-agnostic router; `BoltzSwapProvider` is the shipped Boltz implementation (websocket monitoring, status polling, cooperative refunds for submarine + both chain-swap directions, MuSig2 claiming, chain-swap renegotiation on `transaction.lockupFailed`, 10-consecutive-404 safety net). Providers expose capability metadata via `SwapRoute` / `SwapAsset` / `SwapNetwork` / `SwapQuote` / `SwapLimits` and raise `SwapStatusChanged` for status transitions
9. **HD Wallets** -- Hierarchical deterministic address derivation with descriptor recycling, plus gap-limit recovery (`HdWalletRecoveryService`) that rebuilds local contract state after mnemonic re-import via pluggable `IContractDiscoveryProvider`s (indexer-VTXO, boarding-UTXO, Boltz-swap, plus custom sources)
10. **Caching Transport** -- gRPC + REST clients with response caching for server info
11. **Payment Tracking** -- ArkPayment / ArkPaymentRequest domain models with `PaymentTrackingService` (`IHostedService` lifecycle, subscribe in `StartAsync` / unsubscribe in `StopAsync`) that auto-updates statuses from VTXO/intent/swap events. Asset tracking via `ArkPayment.Assets` and `ArkPaymentRequest.ExpectedAsset` / `ReceivedAssets` (JSONB-persisted, accumulated via `MergeAssets`). Explicit `Cancelled` status distinct from `Failed`. `SemaphoreSlim` serialises `OnVtxoChanged` so concurrent VTXOs at the same payment request don't race read-compute-write on `ReceivedAmount`. Opt-in via `AddArkPaymentTracking()`
12. **Output Descriptor Support** -- Vendored NBitcoin.Scripting (OutputDescriptor, PubKeyProvider, parser combinators, SigningRepository) shipped in `NArk.Abstractions/Scripting/` for descriptor-based wallet integrations
13. **Server-driven Limits** -- VTXO/UTXO amount bounds, `max_tx_weight`, and `max_op_return_outputs` are read from `GetInfo` and enforced client-side in `SpendingService`, `BoardingUtxoSyncService`, and `DefaultCoinSelector`
14. **Resilient VTXO Sync** -- `VtxoSynchronizationService` combines arkd subscription streams with a 5-second routine safety-net poll, time-window filtering (`after` timestamp), and a stream-push retry schedule (750 ms / 3 s / 8 s) to recover from missed or delayed indexer events. A persistent **per-wallet `vtxo.lastFullPollAt` cursor** (stored via `ArkWalletEntity.Metadata` JSON column) bounds the cold-start catch-up window so process restarts no longer re-fetch the full historical VTXO set per wallet. A gate flag prevents a failed catch-up + successful routine poll from advancing the cursor past the gap.
15. **Per-wallet Wallet Metadata** -- `ArkWalletInfo.Metadata` (JSON-serialized dictionary on `ArkWalletEntity`) lets the SDK accumulate per-wallet bookkeeping (sync cursors, recovery state, etc.) without per-concern column-add migrations. `IWalletStorage.SetMetadataValue(walletId, key, value, ct)` performs sparse-key updates (`value=null` removes; concurrent writers on different keys don't clobber each other)
16. **Boltz Referral Attribution** -- `BoltzClientOptions.ReferralId` (default `"arkade-dotnet-sdk"`, exposed as `BoltzClientOptions.DefaultReferralId`) is stamped on every Submarine / Reverse / Chain swap-create request so Boltz can attribute swaps to the originating integration. Consumer apps with their own referrals (BTCPay's `"btcpay-arkade"`, wallet's `"arkade-money"`) override via `services.Configure<BoltzClientOptions>`; setting it to `null` opts out
17. **Persistent Boltz Websocket** -- `SwapsManagementService` now keeps a single long-lived Boltz websocket connection (5 s reconnect backoff, re-subscribes from the watch set) and uses subscribe / unsubscribe ops keyed by swap id, matching the documented Boltz API model. Replaces the per-swap-set-change reconnect that violated the websocket protocol
18. **Chain-Time Cache & Fallback** -- `RPCChainTimeProvider` caches `(Timestamp, Height)` on every successful call and falls back to the cache (with a Warning log) on transient Bitcoin Core RPC failures, so a single 500 from `getblockchaininfo` no longer forces controller-bound consumers (e.g. BTCPay's plugin manager) to disable the plugin. Cold-start failures still throw
19. **Per-wallet Log Scopes** -- Public per-wallet entry points across Swaps, Batch, Onchain, Intent, Spending, Asset, Recovery, Delegation, and Sweeper services open `BeginScope(("WalletId", id))` so downstream sinks can route every transitively-emitted log line to the right wallet
20. **Pending Arkade Transaction Recovery** -- `PendingArkTransactionRecoveryService` reconciles off-chain txs stranded between `SubmitTx` and `FinalizeTx` (process crashed after the server locked the inputs in-flight). Runs on host startup via `ArkHostedLifecycle` across every wallet, plus on-demand `FinalizePendingArkTransactionsAsync(walletId)` for per-wallet recovery (e.g. immediately after user unlock). Builds a BIP-322 ownership proof anchored on each batch's first VTXO (uses spent VTXOs as proof material too), calls the new `IClientTransport.GetPendingTxAsync` endpoint, signs the returned checkpoint PSBTs, and finalizes them. Per-tx failures raise `RecoveryFailed` (`PendingTxRecoveryFailureEventArgs`) without blocking the loop; the next host start retries any unfinalized leftovers. Mirrors the recovery loop pattern in go-sdk and ts-sdk
21. **BIP21 / Payment-string Parser** -- `ArkBip21` builder + parser handles BIP21 URIs, Ark addresses, BOLT11 invoices, LNURL, and Bitcoin addresses into a unified `Bip21PaymentInfo` with `PreferredMethod` routing (`ArkSend` / `SubmarineSwap` / `ChainSwap`). Uses `System.Uri` + `HttpUtility.ParseQueryString`; amounts stored as decimal BTC with `AmountSats` derivation; `Parse` (lenient) vs `ParseStrict` modes. Builder supports `WithAssetId()` and `WithCustomParameter()`
22. **Swap Recovery Inspection** -- `InspectSwapRecoveryAsync(walletId, swapId)` returns a read-only `SwapRecoveryInfo` snapshot (refreshes the local VTXO cache from arkd for the swap's contract script before reporting) with `SwapRecoveryStatus` of `Recoverable` / `NoFunds` / `AlreadyRefunded` / `AlreadySettled` / `StillPending` / `SwapNotFound` / `InspectionError`. `ScanRecoverableSwapsAsync(walletId)` is the bulk version (O(N) sequential arkd round-trip — not for hot UI paths). Side-effect-free: recovery itself happens inside `BoltzSwapProvider.PollSwapState` on the next routine poll once a swap reaches a refundable Boltz status — these are purely for UI/audit reporting

## Technology Stack

| Component | Technology |
|-----------|------------|
| Language | C# 12, .NET 8 / .NET 10 |
| Bitcoin | NBitcoin 9.0.4, NBitcoin.Secp256k1 3.2.0 |
| Transport | Grpc.Net.Client 2.76.0, Google.Api.CommonProtos |
| DI Framework | Microsoft.Extensions.Hosting, DependencyInjection |
| Storage | Entity Framework Core 8.0 (pluggable DB provider) |
| Swap Client | Custom Boltz HTTP + WebSocket client |
| Chain Monitoring | NBXplorer.Client 5.0.5, Esplora |
| Concurrency | AsyncKeyedLock 8.0.1 |
| Expression Engine | Cel 0.3.2 (fee program evaluation) |
| Versioning | Nerdbank.GitVersioning 3.9.50 |
| Testing | NUnit 4.4, NSubstitute 5.3, .NET Aspire 13.1 |
| CI/CD | GitHub Actions (build, test, pack, push to NuGet) |

## Relationship to Other Ark Projects

- **arkd** -- NArk connects to arkd via gRPC (or REST + SSE) as its Ark Service Provider (uses ark/v1 proto definitions)
- **go-sdk** -- Go equivalent of this SDK; NArk implements the same protocol concepts (intents, batch sessions, VTXOs)
- **fulmine** -- NArk's E2E stack uses fulmine as the Boltz-side Ark wallet for swap testing
- **Boltz** -- NArk.Swaps integrates with Boltz for atomic ARK<->BTC chain swaps and BOLT11 submarine / reverse swaps
- **wallet** -- Browser wallet; NArk serves the same purpose for .NET applications, plus a Blazor WASM sample wallet at `samples/NArk.Wallet/` published to GitHub Pages alongside the DocFX docs site
- **arkade-regtest** -- Shared regtest environment (added as a `regtest/` git submodule) replaces the previous bespoke `NArk.Tests.End2End/Infrastructure/` for E2E and local development
