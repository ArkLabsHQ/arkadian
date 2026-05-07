---
project_id: dotnet-sdk
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "testing/how_to_run.md", "testing/how_to_test.md"]
  debug:      ["testing/troubleshooting.md"]
  monitoring: ["testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md"]
scripts:
  build: "dotnet build"
  test: "dotnet test --filter \"FullyQualifiedName~NArk.Tests\""
  test_e2e: "dotnet test --filter \"FullyQualifiedName~NArk.Tests.End2End\""
  pack: "dotnet pack -c Release -o dist/"
  restore: "dotnet restore"
  apphost: "dotnet run --project NArk.AppHost"
---

# NArk (.NET Ark SDK) -- Project Index

**dotnet-sdk** is a .NET SDK (C#) for building Ark protocol wallets and applications. It provides a complete client-side implementation including VTXO management, batch session participation (MuSig2 tree signing), intent-based transaction construction, coin selection, sweeping, on-chain operations, and Boltz atomic swap integration. Published as NuGet packages.

## Quick Reference

| Item | Detail |
|------|--------|
| **Language** | C# / .NET 8+ (net8.0, net10.0 for E2E) |
| **Solution** | `NArk.sln` (9 projects + Blazor WASM sample) |
| **Core Package** | `NArk.Core` |
| **Abstractions** | `NArk.Abstractions` (now ships vendored NBitcoin.Scripting) |
| **Swap Package** | `NArk.Swaps` (incl. `PaymentTrackingService`) |
| **Storage Package** | `NArk.Storage.EfCore` (VTXOs, contracts, intents, wallets, swaps, payments) |
| **Meta Package** | `NArk` (aggregates Core + Swaps) |
| **Sample Wallet** | `samples/NArk.Wallet/` (Blazor WASM, deployed to GitHub Pages) |
| **Docs Site** | DocFX → `https://arkade-os.github.io/dotnet-sdk/` |
| **Test Framework** | NUnit 4 + NSubstitute |
| **E2E Infrastructure** | `regtest/` git submodule (`arkade-os/arkade-regtest`) + .NET Aspire `NArk.AppHost` |
| **CI** | GitHub Actions: build, test, pack, push to NuGet; docs.yml deploys DocFX + WASM wallet |
| **Transport** | gRPC (Grpc.Net.Client) **or** REST + SSE to arkd |
| **Version** | `1.0-beta` (Nerdbank.GitVersioning) |
| **License** | MIT |
| **Repository** | `${DOTNET_SDK_REPO}` |
| **GitHub** | `arkade-os/dotnet-sdk` |

## Architecture Overview

```
NArk.Abstractions           (interfaces, models, no dependencies)
    |
NArk.Core                   (services, transport, batch sessions, scripts)
    |           \
NArk.Swaps      NArk.Storage.EfCore
    |                        |
    NArk (meta-package: Core + Swaps)
    |
NArk.AppHost                (Aspire test orchestrator: bitcoin, arkd, boltz, LND)
NArk.Tests                  (unit tests, NSubstitute mocks)
NArk.Tests.End2End          (integration tests via Aspire)
NArk.Transport.GrpcClient.Tests
NArk.Scratchpad             (dev scratch area)
```

## Key Concepts

- **ArkContract** — Abstract Taproot contract: ArkPaymentContract, ArkNoteContract, HashLockedArkPaymentContract, VHTLCContract
- **ArkIntent** — Signed transaction intent registered with arkd for batch inclusion
- **ArkVtxo** — Virtual Transaction Output with expiry, sweep, and spend tracking
- **ArkCoin** — VTXO paired with its contract for spending
- **ArkPayment / ArkPaymentRequest** — Outbound payment + inbound payment-request domain models tracked by `PaymentTrackingService`
- **BatchSession** — Participates in arkd batch rounds: nonce exchange, tree signing (MuSig2), forfeit tx signing
- **TreeSignerSession** — MuSig2 nonce and partial signature session for VTXO trees
- **SpendingService** — Builds and submits Ark transactions with automatic coin selection, change handling, server-driven amount bounds + OP_RETURN limits
- **VtxoSynchronizationService** — Stream + 5 s routine poll + 750 ms / 3 s / 8 s retry schedule with `after`-window filtering for resilient VTXO sync. Persists a per-wallet `vtxo.lastFullPollAt` cursor (via `ArkWalletEntity.Metadata`) to bound cold-start catch-up; gated so a failed catch-up + successful routine poll cannot advance past the gap
- **ArkWalletEntity.Metadata** — Generic JSON-serialized `Dictionary<string,string>?` column for per-wallet bookkeeping (sync cursors, recovery state, etc.) — provider-agnostic (`jsonb` / `TEXT` / `nvarchar(max)`); written through `IWalletStorage.SetMetadataValue` (sparse-key, concurrent-writer-safe; `value=null` removes)
- **SweeperService** — Monitors and redeems expired/swept VTXOs on-chain
- **SwapsManagementService** — Submarine (Ark→Lightning), reverse (Lightning→Ark), and ARK<->BTC chain swaps via Boltz (MuSig2 cross-signatures, VHTLC scripts). Holds a single long-lived Boltz websocket with subscribe / unsubscribe ops keyed by swap id; stamps `BoltzClientOptions.ReferralId` (default `"arkade-dotnet-sdk"`) on every swap-create request for Boltz attribution
- **PaymentTrackingService** — Background service auto-updating payment statuses from VTXO/intent/swap events
- **OutputDescriptor / SigningRepository** — Vendored NBitcoin.Scripting (parser combinators, descriptor model) in `NArk.Abstractions/Scripting/`
- **HdWalletRecoveryService** — Gap-limit scanner that rebuilds local contract state after HD wallet re-import by sweeping derivation indices and querying registered `IContractDiscoveryProvider`s (OR semantics). Ships indexer, boarding-UTXO, and Boltz-swap providers; custom sources plug in via DI.
- **ArkApplicationBuilder** — Fluent builder for configuring all NArk services via IHostBuilder

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/dotnet-sdk/system/` -- System Architecture & Components

- **system/project_overview.md** -- What NArk is, NuGet packages, features, and use cases
- **system/architecture.md** -- Solution structure, dependency graph, service architecture
- **system/integration-with-arkd.md** -- gRPC transport, proto files, batch event stream

### `${ARKADIAN_DIR}/docs/projects/dotnet-sdk/testing/` -- Usage & Operations

- **testing/usage.md** -- Quick start, DI setup, builder pattern, network configuration
- **testing/how_to_run.md** -- Building, running AppHost, environment setup
- **testing/how_to_test.md** -- Unit tests, E2E tests with Aspire, coverage
- **testing/troubleshooting.md** -- Common issues, debugging tips

### `${ARKADIAN_DIR}/docs/projects/dotnet-sdk/sop/` -- Standard Operating Procedures

- **sop/development-workflow.md** -- Build, test, pack, publish workflow

### `${ARKADIAN_DIR}/docs/projects/dotnet-sdk/tasks/` -- Product Requirements & Plans

### `change-log/` -- Sync Tracking & History

- **change-log/last-sync.txt** -- Last synced commit hash
- **change-log/SYNC_HISTORY.md** -- History of documentation syncs

### `pr-report/` -- Pull Request Summaries
