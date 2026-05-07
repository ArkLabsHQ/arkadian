# Documentation Sync History - NArk (.NET Ark SDK)

## 2026-05-07 - Per-wallet sync cursor + wallet-metadata JSON column, persistent Boltz websocket, Boltz referralId, RPC chain-time cache, WalletId log scopes, mainnet Boltz URL
**From**: `269b877ff04806c64226f94fad842a693581891e`
**To**: `e024b160efb0ebaf407bdbca76e9004ef9a3a301`
**Synced By**: update-project skill
**Status**: Updated

**Commits Analysed**: 7 squash-merge commits (PRs #78, #82, #83, #84, #85, #86, #87).

**Highlights**:
- **Per-wallet VTXO sync cursor in wallet metadata (PR #78)** — `VtxoSynchronizationService` now persists a `vtxo.lastFullPollAt` cursor through a new generic `ArkWalletEntity.Metadata` JSON column (provider-agnostic — Postgres `jsonb` / SQLite `TEXT` / SQL Server `nvarchar(max)`) so process restarts no longer re-fetch the full historical VTXO set per wallet. `ArkWalletInfo` exposes `Metadata: IReadOnlyDictionary<string,string>?`; `IWalletStorage.SetMetadataValue(walletId, key, value, ct)` performs sparse-key updates (concurrent writers on different keys don't clobber each other; `value=null` removes). Cold-start uses `MIN(vtxo.lastFullPollAt)` across all wallets — any missing cursor → `null`-after (fresh-wallet safety). A `_coldStartCatchupComplete` gate flag prevents a failed catch-up + successful routine poll from advancing the cursor past the gap. The cold-start catch-up is itself marked `IsFullSetSnapshot=true` so success advances the cursor immediately. Replaces an earlier dedicated `ISyncStateStorage` / `ArkSyncStateEntity` design — net schema delta is one JSON column on an existing entity, no new table or interface.
- **Single persistent Boltz websocket (PR #83)** — `SwapsManagementService` now keeps one long-lived websocket (`_websocket` guarded by `_websocketLock` semaphore, `RunWebsocketLoop` task, 5 s reconnect backoff that re-subscribes from `_swapsIdToWatch`) and uses `SubscribeOnWebsocketAsync` / `UnsubscribeOnWebsocketAsync` keyed by swap id. `DoUpdateStorage` diffs added/removed swaps and calls Sub/Unsub instead of cancelling the connection; `PollSwapState` unsubscribes on terminal states. Replaces the per-swap-set-change reconnect that violated the documented Boltz websocket protocol.
- **Optional Boltz `referralId` on every swap-create (PRs #86, #87)** — `BoltzClientOptions.ReferralId` (mirrored via `BoltzClient.ReferralId`) is stamped on Submarine, Reverse, and BTC<->ARK Chain swap-create requests. `SubmarineRequest` gained a `ReferralId` field (Reverse + Chain already had one — JSON shape is now consistent across all three). Default is `BoltzClientOptions.DefaultReferralId = "arkade-dotnet-sdk"` so un-customised SDK consumers no longer show up to Boltz as anonymous traffic. Consumer apps with their own referral (BTCPay's `"btcpay-arkade"`, wallet's `"arkade-money"`) override via `services.Configure<BoltzClientOptions>` (delegates run after the property initializer, so the override wins). Setting it to `null` opts out (`JsonIgnoreCondition.WhenWritingNull` keeps the field off the wire).
- **Mainnet Boltz URL drops `ark.` subdomain (PR #82)** — `ArkNetworkConfig.Mainnet.BoltzUri` switched from `https://api.ark.boltz.exchange/` to `https://api.boltz.exchange/`. Mutinynet (`api.boltz.mutinynet.arkade.sh`) and regtest (localhost) unchanged. In-flight swaps created against the old endpoint return 404 from the new one — already covered by PR #80's 10-strikes safety net (transitions stuck swaps to **Failed** with `Metadata["unknownToProvider"]="true"`).
- **Resilient `RPCChainTimeProvider` (PR #85)** — `GetChainTime` now caches `(Timestamp, Height)` on every successful Bitcoin Core RPC call. If a subsequent call fails AND a cached value exists, it returns the cache and logs a warning instead of throwing. Cold-start failures (no cache yet) still throw. Fix for production incident: a single 500 from `getblockchaininfo` during reindex / IBD took the BTCPay Arkade plugin down because the plugin manager catches unhandled exceptions and disables the offending plugin. `ChainTimeProvider` (NBXplorer wrapper) ctors gain an optional `ILogger<RPCChainTimeProvider>` so consumers can surface the fallback warning; default-null keeps the change non-breaking.
- **Per-wallet `WalletId` log scopes (PR #84)** — Public per-wallet entry points across `SwapsManagementService` (Initiate*, Pay*, Restore, `PollSwapState` iteration), `BatchManagementService` (per-intent loops in `RouteToBatchSessionsAsync` and `HandleBatchStartedForAllIntentsAsync`), `OnchainService.InitiateCollaborativeExit` (both overloads — the `ArkCoin[]` overload derives the wallet from `inputs[0]` and opens the scope before validations so rejection logs carry it too), `IntentGenerationService` (`GenerateManualIntent` + periodic per-wallet loop), `SpendingService` (`Spend` overloads + `GetAvailableCoins`), `AssetManager.{Issue,Reissue,Burn}Async`, `HdWalletRecoveryService.ScanAsync`, `DelegationMonitorService.ProcessVtxoAsync`, and `SweeperService.Sweep` per-coin loop now open `using (logger.BeginScope(("WalletId", id)))` so downstream sinks (e.g. BTCPay plugin's per-wallet diagnostic log) can route every transitively-emitted log line to the right wallet — including ones whose templates don't already carry `{WalletId}`. `VtxoSynchronizationService` is *intentionally not* scoped: its streams/polls span all active wallets at once.
- **Tests** — `EfCoreWalletStorageTests` adds 6 cases covering the new `SetMetadataValue` contract (add to empty, preserve unrelated keys across writers, overwrite, `value=null` removes, removing the last key sets `Metadata` back to `null`, throws on unknown wallet — 10 total). `VtxoSynchronizationServiceSyncStateTests` rewritten for the IWalletStorage shape (cold-start MIN-cursor, missing-cursor → `null`-after, zero wallets → `null`-after, opt-out path with `walletStorage=null`, successful catch-up writes cursor to every wallet, failed catch-up never writes). 269/269 unit-test suite green locally per PR #78.

**Files Updated**:
- `docs/INDEX.md` — dotnet-sdk Key Capabilities (sync cursor, wallet metadata, persistent Boltz websocket, Boltz `referralId`, chain-time cache + fallback, per-wallet log scopes), Tags (`referral-id`, `wallet-metadata`, `sync-cursor`, `chain-time-cache`, `wallet-scoped-logs`), Triggers (new ask/develop/debug terms), status table line.
- `docs/projects/dotnet-sdk/INDEX.md` — Key Concepts: `VtxoSynchronizationService` cursor + gate, new `ArkWalletEntity.Metadata` entry, `SwapsManagementService` persistent websocket + referralId stamping.
- `docs/projects/dotnet-sdk/system/project_overview.md` — Resilient VTXO Sync now mentions the cursor; new feature entries for wallet metadata, Boltz referral attribution, persistent Boltz websocket, chain-time cache, per-wallet log scopes.
- `docs/projects/dotnet-sdk/system/architecture.md` — `ArkWalletInfo.Metadata` + `IWalletStorage.SetMetadataValue`; `ArkWalletEntity.Metadata` JSON column with value-converter + `ValueComparer`; `SwapsManagementService` persistent websocket details; `BoltzClient` referral stamping + override semantics; new "VTXO Sync Cursor", "Chain-Time Cache & Fallback", and "Per-Wallet Log Scopes" sections; mainnet URL updated to `api.boltz.exchange`.
- `docs/projects/dotnet-sdk/testing/usage.md` — mainnet Boltz URL fixed; new "Boltz Referral Attribution" section showing `services.Configure<BoltzClientOptions>` override and opt-out.
- `docs/projects/dotnet-sdk/testing/troubleshooting.md` — new "Plugin disabled by host on transient Bitcoin Core RPC failure" entry; new "EF Core migration needed for `ArkWalletEntity.Metadata` JSON column" entry with `dotnet ef migrations add` command.
- `docs/projects/dotnet-sdk/change-log/last-sync.txt` — bumped to `e024b160efb0ebaf407bdbca76e9004ef9a3a301`.
- `docs/projects/dotnet-sdk/change-log/SYNC_HISTORY.md` — this entry.

**Not Updated** (intentional):
- `docs/projects/dotnet-sdk/system/integration-with-arkd.md` — VTXO sync resilience section already covers the relevant streams/poll behaviour; the new cursor is wallet-storage-scoped, covered in `architecture.md`.
- `docs/projects/dotnet-sdk/sop/development-workflow.md` — no workflow / build / publish change.
- `docs/projects/dotnet-sdk/testing/how_to_run.md`, `how_to_test.md` — no run / test command change (the new EF migration is documented under troubleshooting where consumers will hit the symptom).

## 2026-05-04 - Bounded safety net for swaps stuck on missing Boltz endpoint
**From**: `9dd4764b89e2d0068531d1412f562dad984e0a7c`
**To**: `269b877ff04806c64226f94fad842a693581891e`
**Synced By**: update-project skill
**Status**: Updated

**Commits Analysed**: 1 commit (PR #80, `fix: mark swaps Failed after 10 consecutive Boltz 404s`).

**Highlights**:
- New `BoltzSwapNotFoundException` thrown by `BoltzClient.GetSwapStatusAsync` when Boltz responds with 404 + a "could not find swap" body. Other 404s (renamed routes, proxy misconfig) still propagate as plain `HttpRequestException`, so the safety net only fires on the genuine "this swap is unknown to this provider" case.
- `SwapsManagementService.PollSwapState` now tracks a per-swap consecutive-unknown counter, reset on any successful response. After 10 consecutive unknowns (~10 minutes at the 1-min poll cadence) the swap is marked **Failed** with a `FailReason` explaining the on-chain script-path recovery path, plus `Metadata["unknownToProvider"] = "true"` so consumer UIs can surface a "refund manually after CSV expiry" hint. The swap is removed from `_swapsIdToWatch`, the counter cleared, and `NotifySwapChanged` evicts `_scriptToSwapId` via the `SaveSwap` event so polling actually stops.
- Funds are **not** automatically recovered — the user must spend the contract via the script-path after CSV expiry. The change just bounds the noise (no more 404 spam every minute) and gives operators something actionable in their dashboard.
- `NArk.Tests/BoltzClientNotFoundTests.cs` covers the 404-with-body / 404-other / non-404 / counter-reset / 10-consecutive-fail paths.

**Files Updated**:
- `docs/projects/dotnet-sdk/testing/troubleshooting.md` — new "Swap stuck Pending after Boltz endpoint change" entry under Swap Issues describing the symptom, the 10-strike safety net, and the manual script-path recovery requirement.
- `docs/projects/dotnet-sdk/change-log/last-sync.txt` — bumped to `269b877ff04806c64226f94fad842a693581891e`.
- `docs/projects/dotnet-sdk/change-log/SYNC_HISTORY.md` — this entry.

**Not Updated** (intentional):
- `docs/INDEX.md` — bug fix, no new capability/tag/dependency.
- `docs/projects/dotnet-sdk/INDEX.md` — same, no public-API surface change worth surfacing in Key Concepts.
- `system/architecture.md` — `SwapsManagementService` already listed; the consecutive-unknown counter is internal polling logic, not architecture.

## 2026-05-01 - HD Wallet Gap-Limit Recovery via Modular Discovery Providers
**From**: `1020e221ebee6f7ba325029d93d00aafef9ab1e1`
**To**: `9dd4764b89e2d0068531d1412f562dad984e0a7c`
**Synced By**: update-project skill
**Status**: Updated

**Commits Analysed**: 1 squash-merge commit (PR #77).

**Highlights**:
- **HD wallet recovery** — new `HdWalletRecoveryService` rebuilds local contract state after re-importing an HD wallet from its mnemonic. Sweeps derivation indices from `StartIndex` (default 0), and at each index queries every registered `IContractDiscoveryProvider` in parallel (`Task.WhenAll`); a hit from any provider counts (OR semantics), the gap counter resets, and reconstructed contracts are persisted via `IContractStorage` (deduped by script, `Source=recovery:<provider>` metadata). The scan stops after `GapLimit` consecutive unused indices (default 20) or `MaxIndex` (default 10 000). `wallet.LastUsedIndex` is monotonically bumped to `HighestUsedIndex + 1` and never lowered.
- **New abstractions** in `NArk.Abstractions/Recovery/`: `IContractDiscoveryProvider` (per-index probe), `DiscoveryResult` (`Used`, `Contracts`), `RecoveryOptions` (`GapLimit` / `MaxIndex` / `StartIndex`, with a `Validate()` guard), `RecoveryReport` (`HighestUsedIndex`, per-provider `ProviderHits`, reconstructed contracts).
- **Three providers shipped**:
  - `IndexerVtxoDiscoveryProvider` (`NArk.Core`, registered by `AddArkCoreServices`) — asks arkd's indexer for VTXOs at the index's `ArkPaymentContract` script.
  - `BoardingUtxoDiscoveryProvider` (`NArk.Core`, registered by `AddArkCoreServices` only when an `IBoardingUtxoProvider` is also resolvable; otherwise a `NullContractDiscoveryProvider` is used and filtered out by the orchestrator) — historical UTXO probe at the index's `ArkBoardingContract` on-chain address.
  - `BoltzSwapDiscoveryProvider` (`NArk.Swaps`, registered by `AddArkSwapServices`) — delegates to `SwapsManagementService.RestoreSwaps()` so VHTLC contracts are imported with canonical `Source=swap:<id>` metadata + swap rows. Documented as the storage-mutation exception to the provider contract.
- **Robustness** — providers throwing during a probe are logged and treated as not-found so a single bad provider can't kill the scan. `ArkServerInfo` is cached per-provider via `Lazy<Task<>>` to avoid repeated `GetInfo` round-trips. HD derivation goes through `HierarchicalDeterministicAddressProvider.GetDescriptorFromIndex` (single canonical path).
- **Validation** — `RecoveryOptions.Validate()` rejects negative or implausible values up-front. Single-key wallets and unknown wallet IDs throw on entry.
- **Sample wallet** — `samples/NArk.Wallet/` injects `HdWalletRecoveryService` into `ArkWalletService`, exposes `Ark.RestoreWallet()`, and surfaces a "Restore from mnemonic / nsec" panel on the home page that runs the gap-limit scan and shows the discovered-contract count.
- **DI** — `AddArkCoreServices` now registers the orchestrator, the indexer probe, and the conditional boarding probe. `AddArkSwapServices` adds the Boltz probe.
- **Docs** — README "HD Wallet Recovery" section + new `docs/articles/recovery.md` (with TOC entry) covering setup, usage, custom providers, and tuning.
- **Tests** — `NArk.Tests/Recovery/HdWalletRecoveryServiceTests.cs` adds 12 cases: no usage stops at gap, usage at index 0, interleaved usage `[0,3,7]`, OR semantics across providers, throwing provider tolerated, cross-provider script dedupe, `StartIndex` / `MaxIndex` honoured, single-key throws, unknown wallet throws, `NullContractDiscoveryProvider` filtered, existing higher `LastUsedIndex` never lowered. Bonus: stale `VtxoPollingHandlerTests` repaired against v2.1.5's `GetVtxoByScriptsAsSnapshot(after, before)` signature and the b014d1f one-by-one polling removal.
- **CI** — `regtest` submodule pinned to `cca4fba` (known-working with PR #79's E2E).

**Files Updated**:
- `docs/INDEX.md` — dotnet-sdk Key Capabilities (HD recovery + discovery providers), Tags (`hd-recovery`, `gap-limit`, `discovery-provider`), Triggers (recovery-related question/dev/debug terms), status table line.
- `docs/projects/dotnet-sdk/INDEX.md` — Key Concepts entry for `HdWalletRecoveryService`.
- `docs/projects/dotnet-sdk/system/project_overview.md` — HD wallets feature now mentions `HdWalletRecoveryService` + the three default providers.
- `docs/projects/dotnet-sdk/system/architecture.md` — Abstractions `Recovery/` namespace, Core Recovery components, Swaps `BoltzSwapDiscoveryProvider`, DI registration line under `AddArkCoreServices` / `AddArkSwapServices`.
- `docs/projects/dotnet-sdk/testing/usage.md` — new "HD Wallet Recovery" section with the typical `ScanAsync` calls.
- `docs/projects/dotnet-sdk/change-log/last-sync.txt` — bumped to `9dd4764b89e2d0068531d1412f562dad984e0a7c`.
- `docs/projects/dotnet-sdk/change-log/SYNC_HISTORY.md` — this entry.

## 2026-04-29 - Doc + DocFX Site, Sample WASM Wallet, Payment Tracking, Sync Hardening
**From**: `ab79ffa7e907cb406b75ede5b2bb5b18c163bb59`
**To**: `1020e221ebee6f7ba325029d93d00aafef9ab1e1`
**Synced By**: update-project skill
**Status**: Updated

**Commits Analysed**: 41 commits (no merges) covering features, bug fixes, infra, and documentation.

**Highlights**:
- **Payment tracking** — new `ArkPayment` / `ArkPaymentRequest` domain models, `IPaymentStorage` / `IPaymentRequestStorage` interfaces, `EfCorePaymentStorage` / `EfCorePaymentRequestStorage`, and `PaymentTrackingService` (auto-updates statuses from VTXO/intent/swap events). Opt-in via `AddArkPaymentTracking()` + `ConfigureArkPaymentEntities()`.
- **Vendored NBitcoin.Scripting** in `NArk.Abstractions/Scripting/` (`OutputDescriptor`, `OutputDescriptorParser`, `PubKeyProvider`, `SigningRepository`, parser combinators, `NBitcoinCompat` shim) — replaces removed NBitcoin 10 helpers, HAS_SPAN gated.
- **Opt-in DI** — `AddArkDelegation()` (formerly bundled in `AddArkCoreServices`), `AddArkPaymentTracking()`, plus `SwapsManagementService.StartAsync` defers `GetServerInfoAsync` to a background retry so host startup survives transient arkd outages.
- **Server-driven limits** — `ArkServerInfo` now exposes `VtxoMin/MaxAmount`, `UtxoMin/MaxAmount`, `BoardingAllowed`, `MaxTxWeight`, `MaxOpReturnOutputs`. `SpendingService`, `BoardingUtxoSyncService`, and `DefaultCoinSelector` enforce them client-side. The mutable static `TransactionHelpers.MaxOpReturnOutputs` was removed.
- **VTXO sync hardening** — 5 s routine safety-net poll, 750 ms / 3 s / 8 s stream-push retry schedule, time-window `after` filter on `PollScriptsForVtxos`, graceful stream-end recovery, per-iteration try/catch in `StartQueryLogic`, unbounded channel between stream and poll consumer. Verbose Info-level diagnostics across the upsert/dispatch path.
- **Swap reliability** — `_scriptToSwapId` seeded from storage in `StartAsync` and updated synchronously in `OnSwapsChanged`; every non-terminal `PollSwapState` iteration polls arkd for the swap's contract VTXOs as a belt-and-braces fallback.
- **Pagination off-by-one fix** — `GetVtxos` paginating against arkd's 1-based `paginate()` capped imports at exactly 11 000 VTXOs; both `GrpcClientTransport.Vtxo.cs` and `RestClientTransport.Vtxo.cs` now use `current < total`. Also: `EfCoreVtxoStorage.UpsertVtxo` no longer fires `ActiveScriptsChanged` per row (was quadratic on imports).
- **REST + SSE hardening** — `Accept: text/event-stream` header, `data:` prefix parsing, dual camelCase / snake_case property handling, `GetInt64Flexible` for proto3 string-encoded int64s, `RestClientTransport.Vtxo.cs` pagination fix.
- **Custom signets** — `NetworkExtensions.ResolveArkNetwork()` maps arkd's raw network strings (e.g. `mutinynet`) onto the right NBitcoin `Network` instance. Both transports use it.
- **Arkade-regtest submodule** — replaced `NArk.Tests.End2End/Infrastructure/` (compose + scripts) with `regtest/` git submodule pointing at `arkade-os/arkade-regtest`. CI initializes the submodule before E2E.
- **DocFX docs site** — `docfx.json` + `docs/articles/` + `.github/workflows/docs.yml` deploy ~538 pages (API reference + 11 conceptual articles) to GitHub Pages on every push to `master`.
- **Blazor WASM sample wallet** at `samples/NArk.Wallet/NArk.Wallet.Client/`, deployed to `/dotnet-sdk/wallet/` on the same Pages site. Bit.Besql for SQLite (no COOP/COEP needed), real QR codes via QRCoder, Lightning receive (reverse swap), BTC chain swap, smart Send (Ark / on-chain / BOLT11 / BIP21 / LNURL / Lightning Address), `LnurlHelper`, dedicated `Contracts` / `Vtxos` / `Swaps` / `Intents` list+detail pages, mnemonic / nsec backup, `DateTimeOffsetToBinaryConverter` for SQLite. Manual DI for `BoltzClient`, `CachedBoltzClient`, `IIntentScheduler` because WASM does not use `IHttpClientFactory`.
- **GitHub Pages routing** — relative hrefs across pages, `<base href="/dotnet-sdk/wallet/">`, `wwwroot/404.html` SPA fallback, route restoration in `index.html`.
- **Bug fixes** — `Bech32Encoder.SquashBytes=true` in `GenerateNsec` (was throwing `IndexOutOfRangeException`); `IIntentScheduler` now registered explicitly in WASM DI; `BatchManagementService` downgrades arkd "wallet locked or syncing" to a single-line Warning.
- **Documentation rules** — `CLAUDE.md` + `.github/agents.md` codify "keep XML docs / README / `docs/articles/` / sample wallet in sync with public-API changes" and standardise on **Arkade** (not "Ark") in user-facing prose; code identifiers (`NArk`, `AddArk`, …) unchanged. Docs articles rewritten to reflect real APIs (`SwapsManagementService.InitiateXxx` instead of fictional `CreateSwap`, `ConfigureArkEntities` / `ConfigureArkPaymentEntities`, `WalletFactory.CreateWallet`, `IAssetManager.IssueAsync` / `ReissueAsync`).
- **Submarine vs reverse** swap directions corrected in docs: submarine = Ark→Lightning (paying a BOLT11 invoice), reverse = Lightning→Ark (receiving a payment as a VTXO).

**Files Updated**:
- `docs/INDEX.md` — capabilities, tags, triggers, dependencies (adds REST/SSE, payment tracking, output-descriptor, blazor/wasm, docfx, regtest-submodule); status table refreshed; correlation matrix updated; version bumped to 1.5.3.
- `docs/projects/dotnet-sdk/INDEX.md` — Quick Reference (sample wallet, docs site, regtest submodule, REST/SSE), Key Concepts (payments, sync resilience, swaps, output descriptors).
- `docs/projects/dotnet-sdk/system/project_overview.md` — NuGet package descriptions, expanded feature list, sample wallet + regtest pointers.
- `docs/projects/dotnet-sdk/system/architecture.md` — payment + scripting types in Abstractions, opt-in DI section, payment storage in EfCore, regtest submodule + sample wallet + DocFX subsections.
- `docs/projects/dotnet-sdk/system/integration-with-arkd.md` — REST quirks, server-driven limits, VTXO sync resilience, pagination fix.
- `docs/projects/dotnet-sdk/testing/usage.md` — opt-in DI, custom signet helper, payment storage interfaces, sample wallet + DocFX.
- `docs/projects/dotnet-sdk/testing/how_to_run.md` — submodule init, sample wallet run, regtest stack.
- `docs/projects/dotnet-sdk/testing/how_to_test.md` — E2E now uses `regtest/` submodule (compose path retired).
- `docs/projects/dotnet-sdk/testing/troubleshooting.md` — `ConfigureArkEntities`, SQLite `DateTimeOffset`, WASM/Pages, custom networks, REST parser, "wallet locked or syncing", 11 k VTXO cap.
- `docs/projects/dotnet-sdk/sop/development-workflow.md` — CLAUDE.md / agents.md doc rules + Arkade branding rule.
- `docs/projects/dotnet-sdk/change-log/last-sync.txt` — bumped to `1020e221`.
- `docs/projects/dotnet-sdk/change-log/SYNC_HISTORY.md` — this entry.

## 2026-02-19 - Initial Documentation Setup
**Commit**: `c6c01794016bf7969b29c5cc32923cdc27eb0857`
**Synced By**: /add-project command
**Status**: Baseline established

**Changes**:
- Created project documentation structure
- Added system/project_overview.md with NuGet packages, features, technology stack
- Added system/architecture.md with solution structure, dependency graph, DI pattern
- Added system/integration-with-arkd.md documenting gRPC transport and batch sessions
- Added testing/usage.md with builder pattern and network configuration
- Added testing/how_to_run.md with AppHost orchestration and Docker setup
- Added testing/how_to_test.md with unit, E2E (Aspire), and CI testing
- Added testing/troubleshooting.md with build, gRPC, swap, and test issues
- Added sop/development-workflow.md with build, test, pack, PR workflow
- Established sync tracking baseline

**Notes**:
- Project is in 1.0-beta stage with Nerdbank.GitVersioning
- Heavy focus on Boltz chain swap integration (ARK<->BTC)
- AppHost uses .NET Aspire for comprehensive E2E test infrastructure
- Use `/update-project dotnet-sdk` to sync after new commits
