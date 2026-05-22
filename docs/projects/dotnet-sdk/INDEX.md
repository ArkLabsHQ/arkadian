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
- **ArkPayment / ArkPaymentRequest** — Outbound payment + inbound payment-request domain models tracked by `PaymentTrackingService` (now an `IHostedService`; supports asset tracking via `ArkPayment.Assets` / `ArkPaymentRequest.ExpectedAsset` + `ReceivedAssets`; explicit `Cancelled` status distinct from `Failed`)
- **ArkBip21** — Builder + parser for BIP21 URIs covering Ark addresses, BOLT11 invoices, LNURL, and Bitcoin addresses into a unified `Bip21PaymentInfo` with `PreferredMethod` routing (`ArkSend` / `SubmarineSwap` / `ChainSwap`); `Parse` (lenient) and `ParseStrict` modes
- **BatchSession** — Participates in arkd batch rounds: nonce exchange, tree signing (MuSig2), forfeit tx signing
- **TreeSignerSession** — MuSig2 nonce and partial signature session for VTXO trees
- **SpendingService** — Builds and submits Ark transactions with automatic coin selection, change handling, server-driven amount bounds + OP_RETURN limits
- **VtxoSynchronizationService** — Stream + 5 s routine poll with `after`-window filtering for resilient VTXO sync. Each stream push enqueues a **single immediate poll** (the prior 750 ms / 3 s / 8 s retry fan-out was dropped in PR #99 — the 5 s routine poll already sweeps every active script using the same `after`-windowed semantics, so the retry schedule was dead weight on current arkd builds and added 750 ms of detection latency to the happy path). Persists a per-wallet `vtxo.lastFullPollAt` cursor (via `ArkWalletEntity.Metadata`) to bound cold-start catch-up; gated so a failed catch-up + successful routine poll cannot advance past the gap
- **ArkWalletEntity.Metadata** — Generic JSON-serialized `Dictionary<string,string>?` column for per-wallet bookkeeping (sync cursors, recovery state, etc.) — provider-agnostic (`jsonb` / `TEXT` / `nvarchar(max)`); written through `IWalletStorage.SetMetadataValue` (sparse-key, concurrent-writer-safe; `value=null` removes)
- **SweeperService** — Monitors and redeems expired/swept VTXOs on-chain
- **PendingArkTransactionRecoveryService** — Reconciles Arkade off-chain txs stranded between `SubmitTx` (server locked inputs as in-flight) and `FinalizeTx` (crashed before sending). Runs on host startup via `ArkHostedLifecycle` (after VtxoSync) across every wallet; also exposes `FinalizePendingArkTransactionsAsync(walletId)` for on-demand per-wallet recovery. Builds BIP-322 ownership proofs anchored on each batch's first VTXO (including spent VTXOs for proof material), calls the new `GetPendingTxAsync` transport endpoint, signs the returned checkpoint PSBTs, and finalizes them. Per-tx failures raise `RecoveryFailed` (`PendingTxRecoveryFailureEventArgs`) without blocking the loop
- **SwapsManagementService** — Provider-agnostic router over `IEnumerable<ISwapProvider>`. Orchestrates submarine (Ark→Lightning), reverse (Lightning→Ark), and ARK<->BTC chain swaps; exposes `InspectSwapRecoveryAsync` / `ScanRecoverableSwapsAsync` for read-only recovery-state diagnostics across all four swap types. Existing public Initiate* / PayExisting* / Restore* methods remain as backward-compatible wrappers that delegate to the resolved `BoltzSwapProvider`. Stamps `BoltzClientOptions.ReferralId` (default `"arkade-dotnet-sdk"`) on every swap-create request
- **ISwapProvider** — Pluggable swap-provider interface (`ProviderId`, `DisplayName`, `SupportsRoute`, `GetAvailableRoutesAsync`, `StartAsync`/`StopAsync`, `GetLimitsAsync`, `GetQuoteAsync`, `SwapStatusChanged` event, default no-op `NotifyVtxoChanged`/`NotifySwapChanged` hooks). Capability discovery via `SwapRoute`/`SwapAsset`/`SwapNetwork`/`SwapQuote`/`SwapLimits` models lets the router pick a provider for a given route
- **BoltzSwapProvider** — Boltz-specific `ISwapProvider` implementation: WebSocket monitoring, status polling, cooperative refunds (submarine + ARK→BTC + BTC→ARK chain), MuSig2 claiming, chain-swap renegotiation on `transaction.lockupFailed`, 10-consecutive-404 unknown-to-provider safety net, single long-lived Boltz websocket with subscribe/unsubscribe ops keyed by swap id
- **PaymentTrackingService** — `IHostedService` (lifecycle: subscribe in `StartAsync`, unsubscribe in `StopAsync`) that auto-updates payment statuses from VTXO/intent/swap events; serialises `OnVtxoChanged` via `SemaphoreSlim` so concurrent VTXOs at the same payment request don't race read-compute-write on `ReceivedAmount`; accumulates per-asset amounts via `MergeAssets`
- **OutputDescriptor / SigningRepository** — Vendored NBitcoin.Scripting (parser combinators, descriptor model) in `NArk.Abstractions/Scripting/`
- **HdWalletRecoveryService** — Gap-limit scanner that rebuilds local contract state after HD wallet re-import by sweeping derivation indices and querying registered `IContractDiscoveryProvider`s (OR semantics). Ships indexer, boarding-UTXO, and Boltz-swap providers; custom sources plug in via DI.
- **ArkApplicationBuilder** — Fluent builder for configuring all NArk services via IHostBuilder; `WithBlockchain<T>()` registers the unified `IBitcoinBlockchain` impl (replaces the prior `WithTimeProvider<T>()`)
- **ArkNetworkConfig** — Pre-configured per-network record (Mainnet / Mutinynet / Regtest) carrying `ArkUri`, `ArkadeWalletUri`, `BoltzUri`, `ExplorerUri`, plus nullable defaults `EsploraUri`, `ElectrumWsUri`, `ElectrumTcpUri` (`tcp://host:port`). Values mirror the canonical Arkade ts-sdk defaults so apps that need an `IBitcoinBlockchain` (Esplora flavor) can wire it without their own NBXplorer / bitcoind: `services.AddEsploraBlockchain(new Uri(ArkNetworkConfig.Mainnet.EsploraUri!))`. Electrum ports verified against public Fulcrum hosts (only `:50001` plain-TCP is exposed on Mainnet / Mutinynet; TLS goes via the WSS endpoint at `:443`); Regtest uses `:50000` (nigiri's electrs binary port; `:30000` on the same container is the HTTP REST endpoint, a different protocol). New fields are additive nullable defaults — existing named-args callers are untouched
- **IBitcoinBlockchain** — Unified blockchain interface (6 members: `GetChainTime`, `GetUtxosAsync`, `BroadcastAsync`, `BroadcastPackageAsync`, `GetTxStatusAsync`, `EstimateFeeRateAsync`). Collapses the previous split `IBoardingUtxoProvider` / `IChainTimeProvider` / `IOnchainBroadcaster` trio. Three concrete impls under `NArk.Core/Blockchain/`: `NBXplorerBlockchain`, `EsploraBlockchain`, `RpcBlockchain` (RPC throws `NotSupportedException` on `GetUtxosAsync` — no native address index). DI helpers `AddNBXplorerBlockchain` / `AddEsploraBlockchain` / `AddRpcBlockchain` register the right slot; last-registration-wins lets a custom impl override
- **UnilateralExitService** — Orchestrates the unilateral-exit state machine (`Broadcasting` → `AwaitingCsvDelay` → `Claimable` → `Claiming` → `Completed`). Stateful flow via `StartExitAsync(walletId, vtxoOutpoint, claimAddress)` + `ProgressExitsAsync()` (idempotent re-invocation, watchtower visibility, `MaxBroadcastRetries=10` cap). Also exposes a stateless one-shot API: `BroadcastExitChainAsync` returns an `ExitPlan` (wallet id, vtxo outpoint, claim address, leaf txid, CSV delay) the caller persists in whatever form they want; `ClaimMaturedExitAsync(ExitPlan)` returns the claim txid (or `null` if CSV hasn't matured). Wired via `AddUnilateralExit()`. CPFP via `BroadcastWithCpfpAsync` activates when an `IFeeWallet` is registered (gracefully falls back to direct broadcast otherwise). Skips on-chain `Commitment` rows in the broadcast loop
- **VirtualTxService** — Fetches and stores virtual tx branches from arkd via `GetVtxoChainAsync` + `GetVirtualTxsAsync`. Two modes via `VirtualTxOptions.DefaultMode`: **Lite** (default — stores txids + expiry only, defers hex fetch to `StartExitAsync`'s `EnsureHexPopulatedAsync`) and **Full** (stores raw tx hex at every VTXO arrival, two arkd round-trips per VTXO scaling with chain depth). Persists the **whole chain** (including the on-chain `Commitment` root, hex-null since arkd's `GetVirtualTxs` doesn't carry it) tagged with `ChainedTxType` (`Unspecified` / `Commitment` / `Ark` / `Tree` / `Checkpoint`). Upserts only overwrite the type when upgrading from `Unspecified` (preserves provenance). `ParseVirtualTx` branches on chained type: Tree txs lift `PSBT_IN_TAP_KEY_SIG` and assemble `WitScript([sig])` directly (PSBTs from arkd don't carry `witness_utxo` so `PSBT.Finalize()` doesn't work); Ark / Checkpoint try `Finalize+ExtractTransaction`, falling back to lifting `FinalScriptWitness` on `PSBTException`
- **ExitWatchtowerService** + **ExitWatchtowerBackgroundService** — Detect partial tree broadcasts and auto-start unilateral exits on owned VTXOs whose ancestors hit the chain (derives a boarding-contract claim address via `IContractService`). Skips VTXOs without stored branches before making RPC calls
- **VtxoChainAutoFetchService** — Opt-in hosted service (`AddVirtualTxAutoFetch()`) that listens to `IVtxoStorage.VtxosChanged` and queues a chain fetch for every new VTXO above the configured worth-threshold (`VirtualTxOptions.MinFetchAmount`). `HasBranchAsync` short-circuit makes duplicate events cheap. Replaces the batch-only `PostBatchVirtualTxFetchHandler` so VTXOs arriving from spend-change / payment / swap-claim / sweep paths also get their chains pre-stored
- **PostSpendVirtualTxPruneHandler** — Auto-wired prune-on-spend handler (serializable transaction to fix a concurrency race in `PruneForSpentVtxoAsync`). Safe regardless of whether auto-fetch is on
- **P2ACpfpBuilder** — Builds v3 CPFP children for 1p1c package relay of TRUC tree txs. Two-stage fee-rate adjustment (signs twice if vsize estimate was off). `IFeeWallet.SelectFeeUtxoAsync` returns `ICoin?` (NBitcoin standard, no parallel `FeeUtxo` type); signing is delegated via `IFeeWallet.SignFeeUtxoAsync(outpoint, sighash, sighashType)` — the SDK never holds raw key material, so hardware wallets / HSMs / remote signers / BTCPay's internal signer can plug in
- **IExitSessionStorage** / **IVirtualTxStorage** — Exit-pipeline persistence. Three storage options: EF Core (opt-in via `ConfigureArkExitEntities()` — adds `ExitSessionEntity` / `VirtualTxEntity` / `VtxoBranchEntity` to the model; per-tx model deduplicates shared tree nodes across sibling VTXOs), in-memory (`InMemoryExitSessionStorage` + `InMemoryVirtualTxStorage` backed by `ConcurrentDictionary`, wired via `AddInMemoryExitStorage()` — same code paths as EF, no schema), or no storage at all via the stateless `ExitPlan` API
- **AssetPacketBuilder** — Builds the OP_RETURN "asset packet" payload for Arkade asset transfers (`NArk.Core/Assets/`). `Build` emits `AssetGroup` entries in deterministic `(AssetId, GroupIndex)` ordinal-hex order — independent of input order or internal `HashSet` enumeration, and matching rust-sdk's `(txid, groupIndex)` sort. Guarantees byte-exact reproducibility across runs and cross-SDK fixture parity with ts-sdk / rust-sdk. Pinned by `NArk.Tests/AssetPacketBuilderTests.cs` (order-independence) and the fixture-driven suite under `NArk.Tests/Assets/` (ts-sdk-sourced `asset_ref` / `asset_input` / `asset_output` / `metadata` JSON, including `MetadataList` Merkle-hash vectors)

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
