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

**Solution**: Use `ModelBuilderExtensions.ApplyArkModel()` in your DbContext:
```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.ApplyArkModel();
}
```

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
