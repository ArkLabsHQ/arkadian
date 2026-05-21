# NArk -- Troubleshooting Guide

## Build Issues

### "TargetFramework net10.0 not found"

**Symptom**: Build fails for `NArk.AppHost` or `NArk.Tests.End2End` projects.

**Solution**: Install .NET 10 SDK. Core library projects target net8.0, but AppHost and E2E tests require net10.0.

```bash
dotnet --list-sdks  # Check installed SDKs
```

### NuGet Restore Fails

**Symptom**: `dotnet restore` fails with package resolution errors.

**Solution**:
```bash
dotnet nuget locals all --clear
dotnet restore
```

## gRPC Connection Issues

### "Failed to connect to arkd"

**Symptom**: `RpcException` with `StatusCode.Unavailable`.

**Solutions**:
1. Verify arkd is running:
   ```bash
   curl http://localhost:7070/v1/info
   ```

2. Check URL scheme -- use `http://` for local regtest (no TLS), `https://` for mainnet/mutinynet.

3. For Docker environments, use container hostname (`ark:7070`), not `localhost`.

### "Deadline exceeded"

**Symptom**: gRPC calls timeout with `StatusCode.DeadlineExceeded`.

**Solution**: The `DeadlineInterceptor` sets default timeouts. For long-running operations (batch sessions), ensure the cancellation token has sufficient timeout.

## Batch Session Issues

### "TreeValidator: validation failed"

**Symptom**: Batch session fails during tree nonce/signature exchange.

**Solutions**:
1. Ensure MuSig2 key ordering matches server expectations
2. Verify forfeit pubkey matches `ServerInfo.ForfeitPubKey`
3. Check that VTXO tree structure matches server's expected format

### "Intent registration failed"

**Symptom**: `RegisterIntent` returns error.

**Solutions**:
1. Verify intent signature is valid
2. Check that input VTXOs haven't been spent
3. Ensure intent outputs meet dust threshold (`ServerInfo.Dust`)

## Swap Issues

### "Boltz limits exceeded"

**Symptom**: `BoltzLimitsValidator` rejects swap.

**Solution**: Check Boltz pair limits:
```csharp
var limits = await boltzClient.GetPairsAsync();
// Verify swap amount is within min/max range
```

### "MuSig2 key aggregation mismatch"

**Symptom**: Chain swap cooperative claim fails with signature error.

**Solution**: Boltz uses BIP327 KeySort ordering. Keys must be sorted: `[boltzKey, userKey]`. The `ChainSwapMusigSession` handles this -- ensure you're using it rather than manual aggregation.

### Swap stuck Pending after Boltz endpoint change

**Symptom**: A previously-Pending swap stays Pending forever; logs show repeated `BoltzSwapNotFoundException` (HTTP 404 from `/v2/swap/{id}` with body `could not find swap`) every minute. Typically happens after the configured Boltz endpoint changes (operator switches the default URL) so in-flight swaps from the old instance are unknown to the new one.

**Solution**: `SwapsManagementService.PollSwapState` tracks a per-swap consecutive-unknown counter and, after 10 consecutive `BoltzSwapNotFoundException`s (~10 minutes at the 1-min cadence), marks the swap **Failed** with a `FailReason` describing the on-chain script-path recovery, sets `Metadata["unknownToProvider"] = "true"`, removes it from polling, and lets `NotifySwapChanged` evict it via `SaveSwap`. Any successful poll resets the counter, so transient 404s recover. Other 404s (renamed routes, proxy misconfig) still propagate as `HttpRequestException` and don't trip the safety net.

This bounds the noise but does **not** recover funds — the user must spend the contract via the script-path after CSV expiry. Surface `Metadata["unknownToProvider"]` in your UI so users get a "refund manually after CSV expiry" hint.

### Arkade off-chain spend stuck — server holds inputs hostage

**Symptom**: After a process crash mid-spend, subsequent attempts to spend the affected VTXOs fail with the server reporting the inputs as in-flight. Manually re-submitting the same intent doesn't help — the server only accepts the original pending tx.

**Solution**: `PendingArkTransactionRecoveryService` is registered by `AddArkCoreServices()` and runs automatically on host startup via `ArkHostedLifecycle` (after `VtxoSync`) across every wallet known to `IWalletStorage`. For on-demand recovery (e.g. immediately after user unlock), call `FinalizePendingArkTransactionsAsync(walletId, ct)`. Per-tx failures raise `RecoveryFailed` (`PendingTxRecoveryFailureEventArgs`) without blocking the loop — subscribe to surface a banner / telemetry. The next host start retries any unfinalized leftovers.

If `FinalizePendingArkTransactionsAsync` returns 0 in the same process that just crashed mid-`SubmitTx`, retry for ~1 s — arkd's in-flight projection is async and the same-process E2E reproducer can race it. Production startup never sees this.

### Chain swap funded with wrong amount — stuck Pending

**Symptom**: A BTC→ARK chain swap was funded with an amount that doesn't match the original Boltz quote (over- or under-funded) and the swap sits Pending indefinitely.

**Solution**: `BoltzSwapProvider.PollSwapState` now handles `transaction.lockupFailed` by asking Boltz for a new quote (`GET → POST /v2/swap/chain/{id}/quote`). If Boltz accepts, the swap continues with the renegotiated `ExpectedAmount`. If Boltz refuses (amount outside chain-swap limits, etc.) or the renegotiation fails, the cooperative refund branch runs and spends the user's BTC lockup back to their original BTC refund destination via MuSig2 (`CoopRefundBtcToArkChainSwap`). Symmetric ARK→BTC refund via `CoopRefundArkToBtcChainSwap` for the other direction.

If `swap.expired` fires with no funds locked at the contract, the swap is now marked `Failed` (rather than retrying refund forever) — the lockup never arrived so there is nothing to recover.

### `SwapStatusResponse.FailureDetails` JsonException

**Symptom**: Status polling on a failed swap throws `JsonException` parsing `failureDetails`.

**Solution**: The field is now `JsonElement?` (Boltz returns `{"actual": ..., "expected": ...}` on `transaction.lockupFailed`, not a string). Upgrade past the latest sync — without it, `BoltzSwapProvider.PollSwapState` can't read `transaction.lockupFailed` at all and chain-swap renegotiation never fires.

### Multi-provider swap migration — `AddArkSwaps` renamed

**Symptom**: After upgrading, `services.AddArkSwaps()` no longer exists.

**Solution**: The DI helper was renamed to `services.AddArkSwapServices()` (the multi-provider router registration). It internally calls `AddBoltzProvider()` for backward compatibility, so all existing Boltz-only consumers continue to work. Direct callers of `SwapsManagementService` are unchanged — the public API surface (Initiate* / PayExisting* / Restore*) is preserved by router-→-`BoltzSwapProvider` delegation. Non-Boltz providers can register their own implementation as `ISwapProvider` and the router will dispatch routes accordingly.

## E2E Test Issues

### "Aspire host failed to start"

**Symptom**: E2E tests fail with container startup errors.

**Solutions**:
1. Ensure Docker is running
2. Clean up stale volumes:
   ```bash
   docker volume rm nark-bitcoind nark-ark nark-postgres nark-electrs nark-nbxplorer
   ```
3. Check port conflicts (7070, 18443, 3000, etc.)

### "Faucet funding failed"

**Symptom**: Test wallet has zero balance.

**Solution**: The AppHost automatically funds wallets. If manual funding is needed:
```bash
curl -X POST http://localhost:3000/faucet -H "Content-Type: application/json" \
  -d '{"amount": 1, "address": "YOUR_ADDRESS"}'
```

### Plugin disabled by host on transient Bitcoin Core RPC failure

**Symptom**: A controller-bound consumer (e.g. BTCPay's plugin manager) catches an unhandled exception from `GetChainTime` and disables / unloads the SDK-hosting plugin, requiring a manual re-enable. Logs typically show a single 5xx from `getblockchaininfo` during reindex / IBD / heavy load.

**Solution**: `NBXplorerBlockchain` (the impl that absorbed the prior `RPCChainTimeProvider` / `ChainTimeProvider` wrappers when the blockchain interfaces were unified into `IBitcoinBlockchain`) caches `(Timestamp, Height)` on every successful call and falls back to the cache with a Warning log on subsequent transient failures. Cold-start failures (no cache yet) still throw — there is no chain time to report at that point. Wire an `ILogger<NBXplorerBlockchain>` to surface the fallback warning in your own diagnostics.

### `WithTimeProvider<T>()` builder method missing

**Symptom**: After upgrading, `ArkApplicationBuilder.WithTimeProvider<T>()` no longer exists.

**Solution**: Renamed to `WithBlockchain<T>()` to reflect the unified `IBitcoinBlockchain` interface (six members: `GetChainTime`, `GetUtxosAsync`, `BroadcastAsync`, `BroadcastPackageAsync`, `GetTxStatusAsync`, `EstimateFeeRateAsync`) that replaced the prior `IChainTimeProvider` / `IBoardingUtxoProvider` / `IOnchainBroadcaster` trio. Ship three concrete impls under `NArk.Core/Blockchain/`: `NBXplorerBlockchain`, `EsploraBlockchain`, `RpcBlockchain`. DI helpers `AddNBXplorerBlockchain` / `AddEsploraBlockchain` / `AddRpcBlockchain` register the right impls in one call (replacing three separate `AddSingleton` lines wrapping the same backend client).

### Unilateral exit session goes `Failed` immediately after `StartExitAsync`

**Symptom**: The session enters `Failed` state with `FailReason="Invalid Hex String"`, `FailReason="No more byte to read"`, or `FailReason="mempool-script-verify-flag-failed (Witness program was passed an empty witness)"`.

**Solution**: Upgrade past `a89d47a`. arkd's `GetVirtualTxs` indexer returns tree txs as **PSBT-encoded** strings (not raw consensus), and tree-tx PSBTs from arkd omit `witness_utxo` / `non_witness_utxo` (which `PSBT.Finalize` would require — they'd be redundant since the receiver always has the parent tx). The fixed `ParseVirtualTx` branches on `ChainedTxType`: **Tree** txs lift `PSBT_IN_TAP_KEY_SIG` (NBitcoin's `psbtInput.TaprootKeySignature`) and assemble `WitScript(new[] { sig.ToBytes() }, true)` — the `true` flag tells NBitcoin these are stack pushes (not a pre-serialized witness — `new WitScript(sig.ToBytes())` would try to read varint-N stack elements out of the 64-byte Schnorr sig). **Ark / Checkpoint** try `Finalize+ExtractTransaction`, falling back to lifting `FinalScriptWitness` on `PSBTException`. **Commitment** rows are filtered out one layer up (they're already on-chain; hex is intentionally null).

### Unilateral exit broadcast keeps failing with `TRUC-violation`

**Symptom**: Repeated `Exceeded 10 broadcast retries` with the underlying RPC error showing `TRUC-violation` from Bitcoin Core.

**Solution**: Tree txs are v3 (TRUC) but their direct parent on-chain may be non-v3, so Bitcoin Core rejects direct broadcast — TRUC-relay assumes parent-and-children are all v3 or all non-v3 in a 1p1c package. Register an `IFeeWallet` so `UnilateralExitService.BroadcastWithCpfpAsync` activates the v3 CPFP child path via `submitpackage` (NBXplorer / RPC) or sequential broadcast (Esplora — no `txs/package` endpoint). On regtest, `minrelaytxfee=0` makes direct broadcast acceptable; on mainnet/signet the CPFP path is required.

### EF Core migration needed for unilateral-exit tables

**Symptom**: After bumping the SDK pointer and calling `AddUnilateralExit()`, queries against `ExitSessionEntity` / `VirtualTxEntity` / `VtxoBranchEntity` fail because the tables are missing.

**Solution**: Exit entities are deliberately opt-in (consumers that don't call `AddUnilateralExit()` shouldn't pay the schema cost). Add `ConfigureArkExitEntities()` to your `DbContext.OnModelCreating` and ship a new EF migration:

```csharp
protected override void OnModelCreating(ModelBuilder mb)
{
    mb.ConfigureArkEntities();
    mb.ConfigureArkExitEntities();   // new
}
```

```bash
dotnet ef migrations add AddUnilateralExitTables
dotnet ef database update
```

If you don't want to add schema, use `AddInMemoryExitStorage()` instead (same code paths, `ConcurrentDictionary`-backed, lost on restart) or skip both and use the stateless `BroadcastExitChainAsync` / `ClaimMaturedExitAsync` API (caller owns persistence of the returned `ExitPlan`).

`VirtualTxEntity.Type` defaults to `Unspecified` (0) so existing rows from any prior SDK pointer are valid without backfill; downstream consumers (BTCPay plugin) only need the additive `Type` column migration when they bump.

## Storage Issues

### EF Core migration needed for `ArkWalletEntity.Metadata` JSON column

**Symptom**: After bumping the SDK pointer, EF queries against `ArkWalletEntity` fail because the new `Metadata` JSON column is missing from the database.

**Solution**: `ArkWalletEntity` gained a generic `Metadata: Dictionary<string,string>?` column in PR #78 (used by `VtxoSynchronizationService` for the `vtxo.lastFullPollAt` cursor and available for any consumer that wants per-wallet bookkeeping). It's added by `ConfigureArkEntities` so consumer apps need a new EF migration:

```bash
dotnet ef migrations add AddWalletMetadata
dotnet ef database update
```

Provider mapping: Postgres `jsonb`, SQLite `TEXT`, SQL Server `nvarchar(max)` — handled transparently via the value converter.

### EF Core Migration Errors

**Symptom**: Database schema mismatch errors.

**Solution**: Call the schema extensions in your DbContext (the helper was renamed to `ConfigureArkEntities`; payment tables are opt-in):

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.ConfigureArkEntities();          // VTXOs, contracts, intents, wallets, swaps
    modelBuilder.ConfigureArkPaymentEntities();   // optional: ArkPayment + ArkPaymentRequest
}
```

### "DateTimeOffset cannot be sorted/filtered" on SQLite

**Symptom**: EF Core LINQ queries that order by or filter on a `DateTimeOffset` column fail on SQLite with: `SQLite does not support expressions of type 'DateTimeOffset' in ORDER BY clauses`. This breaks every paged storage query in the SDK (`GetVtxos`, `GetContracts`, `GetIntents`, `GetPayments`, `GetPaymentRequests`, `GetSwaps`).

**Solution**: Opt into `ArkStorageOptions.StoreDateTimeOffsetAsTicks` when calling `ConfigureArkEntities` / `ConfigureArkPaymentEntities`. Applies a `ValueConverter<DateTimeOffset, long>` to every Ark `DateTimeOffset` column so storage becomes BIGINT (Postgres / MSSQL) or INTEGER (SQLite), both natively sortable.

```csharp
var opts = new ArkStorageOptions { StoreDateTimeOffsetAsTicks = true };
modelBuilder.ConfigureArkEntities(opts);
modelBuilder.ConfigureArkPaymentEntities(opts);
```

The WASM sample wallet's `WalletDbContext` dogfoods this. Scoped to an explicit `ArkOwnedEntityTypes` set so the converter cannot bleed into consumer-owned entities sharing the same `DbContext` (this is a behaviour change vs. the prior `ConfigureConventions` workaround). Guarded against double-application across `ConfigureArkEntities` + `ConfigureArkPaymentEntities`.

**Trade-offs**:
- Default is **off** — existing Postgres / MSSQL consumers (native `timestamptz` / `datetimeoffset`) and SQLite consumers willing to live without `ORDER BY` see no behaviour change.
- Opt-in is a **schema change**: stored values switch from TEXT / `timestamptz` to BIGINT, and round-trip strips the original offset (read-back is always UTC, offset zero). For existing SQLite databases: drop the DB file (fine for local caches), or run a one-off `julianday` SQL migration before enabling the flag (needs SQLite ≥ 3.38.0 for proper timezone handling on TEXT input; see `docs/articles/storage.md` in the repo).

## WASM / GitHub Pages Sample Wallet

### Blazor boot fails on GitHub Pages

**Symptom**: WASM wallet 404s its assets or fails to register a service worker on a Pages subdirectory.

**Solutions**:
- Set `<base href="/dotnet-sdk/wallet/">` in `wwwroot/index.html` so relative asset paths resolve under the subdirectory.
- Use **Bit.Besql** for SQLite, not `SqliteWasmBlazor` — Pages can't serve the COOP/COEP headers needed for SharedArrayBuffer/OPFS.
- Ship a `wwwroot/404.html` SPA fallback that stores the requested path and reload restores it from `index.html`.

### NavLink / back-button to `/`

**Symptom**: Sub-page navigation jumps to the GitHub Pages site root instead of the wallet base path.

**Solution**: Use relative hrefs (`./`, `send`, `receive`) so they resolve against `<base href>`. Avoid leading `/`.

### `IIntentScheduler` not registered in WASM

**Symptom**: `StartArkServicesAsync` crashes resolving `IntentGenerationService` because `IIntentScheduler` is missing.

**Solution**: `AddArkCoreServices` does not register a scheduler — register `SimpleIntentScheduler` (or your own) explicitly. The sample wallet's `Program.cs` shows the minimal WASM DI wiring (`BoltzClient`, `CachedBoltzClient`, `IIntentScheduler`).

## Network / arkd

### "Network 'mutinynet' not recognized"

**Symptom**: `Network.GetNetwork(serverInfo.Network)` returns null when arkd reports a custom signet name like `mutinynet`.

**Solution**: Use `NetworkExtensions.ResolveArkNetwork(serverInfo.Network)` from `NArk.Core/Transport/Extensions/` — it maps the known custom names onto the right NBitcoin `Network`. Both gRPC and REST transports already do this internally.

### REST `/v1/info` parser throws `KeyNotFoundException`

**Symptom**: Calling `GetServerInfoAsync` against a REST/gateway arkd fails with a missing-property exception.

**Solution**: This was the case-sensitive parser (`signer_pubkey` vs `signerPubkey`) and proto3 string-encoded int64s in the SSE / REST encoders. Make sure you are on a build that includes the camelCase + `GetInt64Flexible` fixes in `RestClientTransport.Info.cs` / `RestClientTransport.Batch.cs`.

### "Wallet locked or syncing" on `BatchManagementService` startup

**Symptom**: A loud `RpcException(FailedPrecondition)` stack trace at host startup.

**Solution**: Expected during arkd boot. `BatchManagementService` now downgrades this to a single-line Warning and retries; nothing to do unless it persists.

### Imports stall at exactly 11 000 VTXOs

**Symptom**: Restoring a long-history wallet stops paginating after 11 k entries.

**Solution**: An off-by-one in `GetVtxos` pagination (both gRPC and REST) was capping imports at exactly `total - 1` pages. Upgrade past commit `25ec2a2` (gRPC) / `7411330` (REST). Also confirm `EfCoreVtxoStorage.UpsertVtxo` no longer fires `ActiveScriptsChanged` per row — that previously caused quadratic-time stalls on large imports.

## Debugging Tips

### Enable Detailed Logging

```csharp
builder.ConfigureLogging(logging =>
{
    logging.SetMinimumLevel(LogLevel.Debug);
    logging.AddFilter("NArk", LogLevel.Trace);
});
```

### `VtxoSynchronizationService` is quiet at Info level

The 5-second safety-net poll runs constantly, but `StartQueryLogic` only emits Info-level lines when a poll actually produced a VTXO (the productive case — a payment landed) or during the one-off cold-start catch-up. Routine ticks that return 0 VTXOs across N scripts drop to Debug (PR #95). To see every poll iteration, lower the log level to Debug for `NArk.Core.Services.VtxoSynchronizationService` — at Info the absence of those lines on an idle wallet is correct, not a misconfigured service.

### Inspect gRPC Traffic

Use `GRPC_TRACE=all` environment variable for detailed gRPC logging.

### Check VTXO State

```csharp
var vtxos = await vtxoStorage.GetVtxos(walletIds: ["my-wallet"]);
foreach (var vtxo in vtxos)
{
    Console.WriteLine($"VTXO {vtxo.TransactionId}:{vtxo.TransactionOutputIndex} " +
                      $"Amount={vtxo.Amount} Spent={vtxo.IsSpent()} " +
                      $"Expires={vtxo.ExpiresAt}");
}
```
