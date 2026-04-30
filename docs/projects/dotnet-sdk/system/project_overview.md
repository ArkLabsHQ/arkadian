# NArk (.NET Ark SDK) -- Project Overview

## What is NArk?

NArk is a .NET SDK for building Ark protocol wallets and applications. It provides the complete client-side stack for interacting with an Ark Service Provider (arkd) -- including VTXO lifecycle management, batch round participation with MuSig2 tree signing, intent-based off-chain transactions, coin selection, on-chain sweeping/recovery, and Boltz atomic swaps (ARK<->BTC).

The SDK is published as NuGet packages and designed to integrate into any .NET application via dependency injection and the `IHostBuilder` pattern.

## NuGet Packages

| Package | Purpose |
|---------|---------|
| **NArk.Abstractions** | Interfaces, models, contracts, vendored NBitcoin.Scripting (OutputDescriptor, parser, SigningRepository) |
| **NArk.Core** | All services, gRPC + REST transport, batch sessions, scripts, wallet, coin selection |
| **NArk.Swaps** | Boltz chain swap integration (ARK<->BTC), VHTLC, MuSig2 cross-signatures, PaymentTrackingService |
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
8. **Boltz Swaps** -- ARK-to-BTC and BTC-to-ARK chain swaps via Boltz exchange with MuSig2 cooperative claiming
9. **HD Wallets** -- Hierarchical deterministic address derivation with descriptor recycling
10. **Caching Transport** -- gRPC + REST clients with response caching for server info
11. **Payment Tracking** -- ArkPayment / ArkPaymentRequest domain models with PaymentTrackingService that auto-updates statuses from VTXO/intent/swap events (opt-in via `AddArkPaymentTracking()`)
12. **Output Descriptor Support** -- Vendored NBitcoin.Scripting (OutputDescriptor, PubKeyProvider, parser combinators, SigningRepository) shipped in `NArk.Abstractions/Scripting/` for descriptor-based wallet integrations
13. **Server-driven Limits** -- VTXO/UTXO amount bounds, `max_tx_weight`, and `max_op_return_outputs` are read from `GetInfo` and enforced client-side in `SpendingService`, `BoardingUtxoSyncService`, and `DefaultCoinSelector`
14. **Resilient VTXO Sync** -- `VtxoSynchronizationService` combines arkd subscription streams with a 5-second routine safety-net poll, time-window filtering (`after` timestamp), and a stream-push retry schedule (750 ms / 3 s / 8 s) to recover from missed or delayed indexer events

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
