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

## Storage Issues

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

**Symptom**: EF Core LINQ queries that order by or filter on a `DateTimeOffset` column fail on SQLite.

**Solution**: Apply `DateTimeOffsetToBinaryConverter` via `ConfigureConventions` so EF Core stores the value as `long` (sortable) instead of text. This is what the WASM sample wallet does — see `samples/NArk.Wallet/NArk.Wallet.Client/Services/WalletDbContext.cs`.

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
