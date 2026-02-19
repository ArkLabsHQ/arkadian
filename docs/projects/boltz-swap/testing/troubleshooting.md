# boltz-swap -- Troubleshooting

## Common Issues

### "WebSocket connection timeout"
- **Cause**: Cannot connect to Boltz WebSocket endpoint
- **Fix**: Check network connectivity. For regtest, ensure Docker services are running (`pnpm regtest:up`). The WS URL is derived from the API URL (port 9004 for regtest).

### "No spendable virtual coins found"
- **Cause**: VHTLC has not been funded yet, or the VTXO is already spent
- **Fix**: Wait for the Boltz lockup transaction to confirm. Check the swap status via `getSwapStatus()`.

### "Boltz is trying to scam us"
- **Cause**: The VHTLC address derived from local script construction doesn't match Boltz's lockup address
- **Fix**: This is a security check. If it fires, the Boltz server may be malicious or there's a key mismatch. Do not proceed. Report to Boltz.

### "Preimage is required to claim VHTLC"
- **Cause**: Attempting to claim a restored swap that doesn't have a preimage
- **Fix**: Use `enrichReverseSwapPreimage(swap, preimage)` before calling `claimVHTLC()`.

### "claimPublicKey must be a compressed public key"
- **Cause**: Public key is not in compressed format (must be 33 bytes / 66 hex chars)
- **Fix**: Ensure wallet identity returns compressed public keys. The SDK's `compressedPublicKey()` method should be used.

### "VHTLC is already spent"
- **Cause**: The VHTLC has already been claimed or refunded
- **Fix**: Check swap status. The swap may have been auto-claimed by SwapManager.

### "SwapManager is not enabled"
- **Cause**: Calling `startSwapManager()` without configuring it in constructor
- **Fix**: Pass `swapManager: true` or `swapManager: { ... }` in the config.

### NetworkError with status 400/500
- **Cause**: Boltz API rejected the request
- **Fix**: Check `error.errorData` for details. Common causes: invalid invoice, amount below minimum, amount above maximum.

### "Invalid API response" (SchemaError)
- **Cause**: Boltz API returned data that doesn't match expected schema
- **Fix**: Check if Boltz API version is compatible. The library validates all responses with runtime type guards.

## Debugging Tips

### Enable Verbose Logging

```typescript
import { setLogger } from "@arkade-os/boltz-swap";

setLogger({
  log: (...args) => console.log("[boltz-swap]", ...args),
  warn: (...args) => console.warn("[boltz-swap]", ...args),
  error: (...args) => console.error("[boltz-swap]", ...args),
});
```

### Check SwapManager Stats

```typescript
const stats = lightning.getSwapManager()?.getStats();
console.log(stats);
// { isRunning, monitoredSwaps, websocketConnected, usePollingFallback, ... }
```

### Monitor Swap Status Changes

```typescript
const manager = lightning.getSwapManager();
manager?.onSwapUpdate((swap, oldStatus) => {
  console.log(`[${swap.id}] ${oldStatus} -> ${swap.status}`);
});
```

### Check Pending Swaps

```typescript
const pending = await lightning.getPendingReverseSwaps();
const submarine = await lightning.getPendingSubmarineSwaps();
const history = await lightning.getSwapHistory();
```

## Regtest Issues

### Docker services not starting
```bash
pnpm regtest:down   # Clean up
pnpm regtest        # Full rebuild and restart
```

### E2E tests failing with connection errors
```bash
# Ensure regtest setup completed
pnpm regtest:setup  # Re-run setup script
```
