# Arkade Boltz Swap — Troubleshooting

## Common Issues

### Issue: Invoice Expired
**Error**: `InvoiceExpiredError: The invoice has expired`

**Cause**: Lightning invoice expiry exceeded (default: 1 hour)

**Solution**:
```typescript
// Check invoice details before paying
import { decodeInvoice } from '@arkade-os/boltz-swap';

const details = decodeInvoice(invoice);
console.log('Expiry:', details.expiry, 'seconds');

// Create invoice with longer expiry
const result = await arkadeLightning.createLightningInvoice({
  amount: 50000,
  // Note: expiry controlled by Boltz, typically 1 hour
});
```

---

### Issue: Swap Timeout
**Error**: `SwapExpiredError: The swap has expired`

**Cause**: Swap timelock expired before claim

**Solution**:
```typescript
// With SwapManager enabled, refunds are automatic
manager.onSwapFailed(async (swap, error) => {
  if (error instanceof SwapExpiredError) {
    console.log('Swap expired, refund executed automatically');
  }
});

// Without SwapManager, manual refund required
try {
  await arkadeLightning.sendLightningPayment({ invoice });
} catch (error) {
  if (error.isRefundable && error.pendingSwap) {
    await arkadeLightning.refundVHTLC(error.pendingSwap);
  }
}
```

---

### Issue: Insufficient Funds
**Error**: `InsufficientFundsError: Not enough funds available`

**Cause**: Wallet balance too low for swap + fees

**Solution**:
```typescript
// Check balance before swap
const balance = await wallet.getBalance();
console.log('Available balance:', balance.total);

// Calculate total cost including fees
const fees = await arkadeLightning.getFees();
const amount = 50000;
const swapFee = Math.ceil((amount * fees.reverse.percentage) / 100 + fees.reverse.minerFees.claim + fees.reverse.minerFees.lockup);
const totalCost = amount + swapFee;

if (balance.total < totalCost) {
  console.error(`Insufficient funds: need ${totalCost}, have ${balance.total}`);
}
```

---

### Issue: WebSocket Disconnection
**Symptom**: Swaps not updating in real-time

**Cause**: WebSocket connection lost

**Solution**:
```typescript
// Monitor WebSocket status
const manager = arkadeLightning.getSwapManager();

manager.onWebSocketConnected(() => {
  console.log('WebSocket connected - real-time updates active');
});

manager.onWebSocketDisconnected((error) => {
  console.log('WebSocket disconnected - using fallback polling');
  // SwapManager automatically falls back to polling
});

// Check manager stats
const stats = manager.getStats();
console.log('WebSocket connected:', stats.websocketConnected);
console.log('Monitored swaps:', stats.monitoredSwaps);
```

**SwapManager handles reconnection automatically** with exponential backoff (1s → 60s).

---

### Issue: Invoice Failed to Pay
**Error**: `InvoiceFailedToPayError: The provider failed to pay the invoice`

**Cause**: Boltz unable to route Lightning payment

**Solution**:
```typescript
// Check invoice is valid and routable
const details = decodeInvoice(invoice);
console.log('Amount:', details.amountSats);
console.log('Payment hash:', details.paymentHash);

// Verify amount is within limits
const limits = await arkadeLightning.getLimits();
if (details.amountSats < limits.min || details.amountSats > limits.max) {
  throw new Error('Amount outside swap limits');
}

// If payment fails, refund is automatic with SwapManager
```

---

### Issue: Transaction Failed
**Error**: `TransactionFailedError: Transaction failed`

**Cause**: Blockchain transaction rejected (insufficient fees, double-spend, etc.)

**Solution**:
```typescript
// Retry with higher fee (if supported)
// Or wait and let SwapManager retry automatically

manager.onActionExecuted((swap, action) => {
  console.log(`${action} executed for ${swap.id}`);
  if (action === 'refund') {
    console.log('Transaction failed, refund executed');
  }
});
```

---

### Issue: Swap Status Stuck
**Symptom**: Swap status not updating

**Cause**: WebSocket disconnected or polling paused

**Solution**:
```bash
# Check Boltz API is reachable
curl https://api.boltz.mutinynet.arkade.sh/v1/info

# Manually poll swap status
const status = await arkadeLightning.getSwapStatus(swapId);
console.log('Current status:', status.status);

# Restart SwapManager if needed
await arkadeLightning.stopSwapManager();
await arkadeLightning.startSwapManager();
```

---

### Issue: VHTLC Creation Failed
**Cause**: Arkade wallet unable to create VHTLC contract

**Solution**:
```typescript
// Check wallet is unlocked
await wallet.unlock('password');

// Verify wallet is synced
const info = await wallet.getInfo();
console.log('Synced:', info.synced);

// Check available VTXOs
const vtxos = await wallet.getVtxos();
console.log('Available VTXOs:', vtxos.length);

// Ensure sufficient balance
const balance = await wallet.getBalance();
console.log('Balance:', balance.total);
```

---

### Issue: Network Error
**Error**: `NetworkError: Network issue`

**Cause**: API endpoint unreachable or timeout

**Solution**:
```typescript
// Verify API endpoint
const swapProvider = new BoltzSwapProvider({
  apiUrl: 'https://api.boltz.mutinynet.arkade.sh',
  network: 'mutinynet',
});

// Test connectivity
try {
  const limits = await swapProvider.getSwapLimits();
  console.log('API reachable, limits:', limits);
} catch (error) {
  console.error('API unreachable:', error.message);
}

// Check DNS and network
// curl https://api.boltz.mutinynet.arkade.sh/v1/info
```

---

## Debugging Tips

### Enable Verbose Logging
```typescript
// Set environment variable
process.env.DEBUG = 'boltz-swap:*';

// Or use custom logger
import { setLogger } from '@arkade-os/boltz-swap';

setLogger({
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
});
```

### Check Swap History
```typescript
const history = await arkadeLightning.getSwapHistory();

history.forEach(swap => {
  console.log(`${swap.id}: ${swap.status}`);
  console.log(`Type: ${swap.type}`);
  console.log(`Amount: ${swap.amount}`);
  console.log(`Created: ${swap.createdAt}`);
  console.log(`Updated: ${swap.updatedAt}`);
});
```

### Inspect Pending Swaps
```typescript
const pendingSends = await arkadeLightning.getPendingReverseSwaps();
const pendingReceives = await arkadeLightning.getPendingSubmarineSwaps();

console.log('Pending sends:', pendingSends.length);
console.log('Pending receives:', pendingReceives.length);
```

### Monitor Events
```typescript
const manager = arkadeLightning.getSwapManager();

manager.onSwapUpdate((swap, oldStatus) => {
  console.log(`[UPDATE] ${swap.id}: ${oldStatus} → ${swap.status}`);
});

manager.onActionExecuted((swap, action) => {
  console.log(`[ACTION] ${action} executed for ${swap.id}`);
});

manager.onSwapFailed((swap, error) => {
  console.error(`[FAILED] ${swap.id}:`, error.message);
});
```

---

## Service Health Checks

### Check Boltz API
```bash
curl https://api.boltz.mutinynet.arkade.sh/v1/info
# Should return: {"version":"..."}
```

### Check Arkade Server
```bash
curl http://localhost:7070/v1/info
# Should return arkd info with pubkey
```

### Check Arkade Wallet
```bash
curl http://localhost:6060/v1/wallet/status
# Should return: {"initialized":true,"synced":true}
```

---

## Getting Help

If issues persist:

1. **Check GitHub Issues**: https://github.com/arkade-os/boltz-swap/issues
2. **Review Documentation**: See `testing/usage.md` and `system/architecture.md`
3. **Enable Debug Logging**: Set `DEBUG=boltz-swap:*`
4. **Collect Logs**: Service logs, swap history, error messages
5. **Open Issue**: Provide reproduction steps and logs
