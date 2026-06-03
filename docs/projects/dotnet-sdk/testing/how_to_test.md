# NArk -- How to Test

## Test Projects

| Project | Type | Framework | Target |
|---------|------|-----------|--------|
| `NArk.Tests` | Unit tests | NUnit 4 + NSubstitute | net10.0 |
| `NArk.Tests.End2End` | Integration tests | NUnit 4 + Aspire | net10.0 |
| `NArk.Transport.GrpcClient.Tests` | Transport tests | NUnit 4 | net10.0 |

## Unit Tests

```bash
# Run all unit tests
dotnet test --filter "FullyQualifiedName~NArk.Tests" --no-build --verbosity normal

# Run specific test class
dotnet test --filter "FullyQualifiedName~ContractServiceTests"

# Run with coverage
dotnet test --filter "FullyQualifiedName~NArk.Tests" --collect:"XPlat Code Coverage"
```

### Unit Test Files

- `ArkAddressTests.cs` -- Ark address encoding/decoding
- `ArkBip21Tests.cs` -- BIP21 URI parser + builder (parse / build / roundtrip / rejection / PreferredMethod routing). PR #109 widened the builder precondition — renamed `Build_NoAddress_Throws` → `Build_NothingSet_Throws` and added `Build_LightningOnly_EmitsEmptyAddressForm`, `Build_LightningPlusAmountAndLabel_NoAddress_Works`, and `Build_AssetOnly_Works` pinning the new `bitcoin:?lightning=…` / `bitcoin:?asset=…` empty-address-form paths
- `LnurlHelperTests.cs` -- `NArk.Core.Payments.LnurlHelper` (PR #106) — pins detection rules (`lnurl1` bech32, `lightning:` scheme prefix, Lightning Address `user@domain`, rejection of plain on-chain strings + leading `@`), `DecodeLnurl` round-trips a canonical LUD-01 example to a valid URI, and `FetchInvoiceAsync`'s wire format (millisat conversion, `?`/`&` separator handling, `error` field surfaced as exception)
- `AssetPacketBuilderTests.cs` -- Asset packet construction (includes the new order-independence test pinning the deterministic `(AssetId, GroupIndex)` group ordering that survived `HashSet` enumeration randomization)
- `Assets/FixtureTests.cs` -- Cross-SDK conformance vectors imported verbatim from `arkade-os/ts-sdk@master` (`asset_ref` / `asset_input` / `asset_output` / `metadata` JSON fixtures under `Assets/Fixtures/`). Valid vectors assert byte-exact serialization against the canonical fixture; invalid vectors assert rejection (not exact error message — that's per-SDK impl detail). Includes the `MetadataList` Merkle-hash vectors — the strongest cross-SDK check
- `BoltzLimitsValidatorTests.cs` -- Swap limit validation
- `CachingClientTransportTests.cs` -- Transport caching behavior
- `CheckpointTapScriptTests.cs` -- Tapscript construction
- `BlockchainServiceCollectionExtensionsTests.cs` -- DI helpers for `AddNBXplorerBlockchain` / `AddEsploraBlockchain` / `AddRpcBlockchain` (each registers the right `IBitcoinBlockchain` impls, RPC omits UTXO-discovery, mixed-backend composition resolves cleanly)
- `ContractServiceTests.cs` -- Contract derivation and management
- `DefaultCoinSelectorTests.cs` -- Coin selection algorithm
- `EfCoreSqliteOrderByTests.cs` -- `StoreDateTimeOffsetAsTicks` opt-in (proves SQLite `ORDER BY DateTimeOffset` works with the flag on, default mapping still works with the flag off, ticks converter is scoped to Ark-owned entities and doesn't bleed into consumer entities, documented round-trip-strips-offset trade-off)
- `Exit/InMemoryExitStorageTests.cs` -- `InMemoryExitSessionStorage` + `InMemoryVirtualTxStorage` (upsert / state filter / wallet filter / Lite→Full hex merge / orphan cleanup with shared chain nodes)
- `IntentGenerationServiceTests.cs` -- Intent creation logic
- `IntentSynchronizationServiceTests.cs` -- Intent sync with server
- `MergeAssetsTests.cs` -- Asset-amount merger (null / disjoint / sum / duplicate keys)
- `P2ACpfpBuilderTests.cs` -- v3 CPFP builder (vsize estimate accuracy, two-stage fee-rate adjustment, `IFeeWallet`'s `SignFeeUtxoAsync` callback signing path, wallet rejects signing for an outpoint it didn't issue — defense-in-depth)
- `PendingArkTransactionRecoveryServiceTests.cs` -- Pending-tx recovery loop (per-wallet sweep, BIP-322 proof building, `RecoveryFailed` event, best-effort error handling, single-input checkpoint invariant)
- `VirtualTxServiceTests.cs` -- `FetchAndStoreBranchAsync` (whole-chain storage incl. `Commitment` root with hex-null; `ChainedTxType` round-trips; type-overwrite guard for partial-Lite upgrade), `EnsureHexPopulatedAsync` (ignores `Commitment` when deciding fully-populated; on-demand Lite→Full hex fetch)
- `Recovery/IndexerVtxoDiscoveryProviderTests.cs` -- PR #104 legacy-signer probe (4 tests). Pins the cross-product candidate-script derivation `{ current signer ∪ DeprecatedSigners } × { current exit delay ∪ mainnet-legacy 7-day delay (mainnet-only) }` × `{ default ∪ delegate-per-`RecoveryDelegateConfig` }`, including the mainnet wallet whose VTXO was minted under the original 7-day delay while arkd now reports a shorter one (recovery still finds it). Covers the server-info caching reshape (transient failure on first probe doesn't poison later probes into silent empty results — the `Lazy<Task>`-based shape would have)
- `SweeperServiceTests.cs` -- VTXO sweep/recovery
- `SwapRecoveryTests.cs` -- `InspectSwapRecoveryAsync` + `ScanRecoverableSwapsAsync` (each `SwapRecoveryStatus` branch, bulk skip-Pending, chain-swap renegotiation guard)
- `SwapRouteTests.cs` / `SwapRoutingTests.cs` -- Multi-provider routing + `SwapRoute` / `SwapAsset` model coverage
- `VHtlcContractTests.cs` -- VHTLC contract construction
- `VtxoPollingHandlerTests.cs` -- VTXO polling after events

## End-to-End Tests

E2E tests require Docker (uses .NET Aspire to start the full infrastructure):

```bash
# Run E2E tests (starts all Docker containers automatically)
dotnet test --filter "FullyQualifiedName~NArk.Tests.End2End"

# Run specific E2E test
dotnet test --filter "FullyQualifiedName~BatchSessionTests"
```

### E2E Test Files

- `BatchSessionTests.cs` -- Batch round participation
- `BuilderStyleTests.cs` -- Builder pattern integration
- `ChainSwapTests.cs` -- ARK<->BTC chain swaps via Boltz
- `IntentSchedulerTests.cs` -- Intent scheduling and submission
- `NoteTests.cs` -- Note contract operations
- `OnchainTests.cs` -- On-chain boarding and settlement
- `SwapManagementServiceTests.cs` -- Full swap lifecycle. PR #118 added a shared `SemaphoreSlim` gating only the `InitiateSubmarineSwap` call in `ConcurrentSubmarineSwapsBothComplete`'s two parallel runners — Boltz serializes swap creation through Postgres under `SERIALIZABLE` isolation, so two concurrent `POST /v2/swap/submarine` calls aborted one another with SQLSTATE `40001` ("could not serialize access due to read/write dependencies among transactions"), surfaced as `HttpRequestException` and failing the test on master. Both swaps still poll and settle concurrently after the gate
- `UnilateralExitTests.cs` -- E2E coverage of the unilateral-exit pipeline. Mirrors `arkade-os/go-sdk` and `arkade-os/ts-sdk` (`should unroll`, `should reject complete-unroll before unilateral exit delay matures`, `should complete unroll after unilateral exit delay`). Tests: `CanStartUnilateralExitForSettledVtxo` (smoke — `StartExitAsync` creates a `Broadcasting` session with the chain fetched in `Full` mode), `StartExit_IsIdempotentForSameVtxo`, `ProgressExits_AdvancesFromBroadcastingToAwaitingCsvDelay` (drives state machine via `ProgressExitsAsync` + `MineBlocks(1)` within a 30-step budget), `AwaitingCsvDelay_DoesNotAdvanceUntilDelayMatures` (mines `unilateralExit + 2` blocks and asserts advancement only then). Wires `TestFeeWallet` so broadcast uses the 1p1c CPFP package path. Time-based CSV (BIP68 bit 22) is detected and the test exits after the don't-advance-early half — needs `setmocktime` + MTP plumbing that's separate work
- `VtxoSynchronizationTests.cs` -- VTXO sync with server
- `WalletRecoveryTests.cs` -- PR #104 E2E for the unified `IWalletRecoveryService`. `FullRecovery_RestoresContracts_Index_AndFunds` builds the production wallet stack via the host builder (EFCore InMemory + `DefaultWalletProvider` — the latter is required after master added `PaymentContractTransformer` which depends on `IWalletProvider`), funds an HD wallet via the arkd-note path (`DockerHelper.CreateArkNote` + `IContractService.ImportContract`, redeemed by `IntentGenerationService` into a spendable VTXO at an `ArkPaymentContract` script — same script `IndexerVtxoDiscoveryProvider` rediscovers on recovery), re-imports the same mnemonic into a fresh wiped host, and asserts `RecoverAsync` rebuilds contracts, the derivation index, and funds. Uses a CI-realistic `RecoveryOptions(GapLimit: 3)` + 5-minute timeout — recovery walks indices sequentially with a Boltz `/v2/swap/restore` round-trip per index, and CI's boltzr sidecar is slow enough that the default `GapLimit: 5` (~6 indices) blew past a 2-minute bound. The earlier draft also asserted a boltz reverse-swap leg + `SwapAudit`; both were dropped after CI infrastructure (nginx 504 from boltz under fixture load) made them flaky — swap-side coverage stays in the BTCPay plugin E2E (ArkLabsHQ/btcpay-arkade#70). Includes the canonical fix for an async `TaskCompletionSource` deadlock: the batch-success TCS is created with `TaskCreationOptions.RunContinuationsAsynchronously` so `TrySetResult` resumes on the thread pool, freeing the event-stream thread (without it, `SaveIntent` → `IntentChanged` → inline test continuation → `host.StopAsync()` → awaits the very stream task currently executing the continuation, a self-join deadlock that hung CI at 15/30 min on both nigiri and denigiri)

### E2E Test Infrastructure

- `SharedArkInfrastructure.cs` / `SharedDelegationInfrastructure.cs` -- bring up the regtest stack via the `regtest/` git submodule (replaces the deprecated `NArk.Tests.End2End/Infrastructure/` compose files). PR #104 migrated the submodule from **nigiri** (Go binary + shell scripts + chopsticks/esplora) to **denigiri** (zero-dependency Node orchestrator + mempool as the Esplora source); `ChopsticksEndpoint` now points at `http://localhost:3000/api/` (trailing slash required so `HttpClient` base-address resolution keeps the `/api` prefix when `EsploraBlockchain` appends relative paths)
- `Common/DockerHelper.cs` -- Central wrapper for every `docker exec` call the E2E suite makes (PR #108). Public surface: `SendArkdNoteTo(arkAddress, amountSats, ct)` — issues a Fulmine offchain send via `POST http://localhost:7003/api/v1/send/offchain` after calling `FulmineLiquidityHelper.EnsureArkLiquidity(minBalance, maxAttempts: 5)` first (replaces the prior `docker exec ark ark send` CLI call that broke against newer arkd images that don't carry the embedded `ark` wallet binary); `PayLndInvoice(bolt11, ct)` — `docker exec lnd lncli --network=regtest payinvoice --force`; `BitcoinSendToAddress(address, btcAmount, ct)` and `BitcoinGetNewAddress(ct)` — route through a new `BitcoinCli(args, ct)` helper that prepends denigiri's btcpayserver-image connection flags `-regtest -rpcuser=admin1 -rpcpassword=123` (PR #104 — without them `bitcoin-cli` defaults to mainnet `127.0.0.1:8332` under `.env.regtest`'s container override and fails to connect, breaking every test that needs an on-chain faucet/mine: boarding, unilateral exit, chain swaps; 8 failures). `DockerHelper.CreateArkNote` execs into the `arkd` container (denigiri renamed it from `ark`). Tests that previously inlined `CliWrap.Cli.Wrap("docker")` now call these helpers (`BuilderStyleTests`, `ChainSwapTests`, `FundedWalletHelper`, `OnchainTests`, `SwapManagementServiceTests`, `VtxoSynchronizationTests`)
- `Common/FundedWalletHelper.cs` -- Helper for creating and funding test wallets
- `Common/FulmineLiquidityHelper.cs` -- `EnsureArkLiquidity(minBalance, maxAttempts)` + `RetryWithSettle(action)` — guard rails for tests that need the Fulmine faucet to have at least N sats of ARK liquidity before issuing an offchain send (consulted by `DockerHelper.SendArkdNoteTo` and by every chain-/submarine-/reverse-swap test under `ChainSwapTests` / `SwapManagementServiceTests`). PR #108 switched the swap suite to consult this helper rather than overriding `.env` to bump Fulmine's seed amount
- `Common/TestFeeWallet.cs` -- Self-funding `IFeeWallet` for CPFP exit tests (funds via `bitcoin-cli sendtoaddress` against a BIP86 P2TR address, parses `getrawtransaction` to resolve the funding vout, mines 1 block to confirm; validates the requested outpoint belongs to this wallet before signing)
- `Wallets/SimpleSeedWallet.cs` -- Simple deterministic wallet for tests
- `TestPersistance/InMemory*.cs` -- In-memory storage implementations for testing
- `TestPersistance/TestDbContext.cs` -- now opts into `ConfigureArkExitEntities()` so `UnilateralExitTests` see the exit tables

> Initialize the submodule before running E2E:
> ```bash
> git submodule update --init --recursive
> ```

## CI Pipeline

GitHub Actions (`build.yml`):
1. `dotnet restore`
2. `dotnet build --no-restore`
3. `dotnet test --no-build --verbosity normal`
4. `dotnet pack -c Release -o dist/`
5. Push to NuGet (on master/tags only)
