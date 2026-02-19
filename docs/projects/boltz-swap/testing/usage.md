# boltz-swap -- Usage Guide

## Installation

```bash
pnpm add @arkade-os/boltz-swap
```

## Quick Start

### 1. Initialize Providers

```typescript
import { BoltzSwapProvider, ArkadeLightning, ArkadeChainSwap } from "@arkade-os/boltz-swap";

const swapProvider = new BoltzSwapProvider({
  network: "mutinynet",  // "bitcoin" | "mutinynet" | "regtest"
});

// Lightning swaps
const lightning = new ArkadeLightning({
  wallet,        // @arkade-os/sdk Wallet instance
  swapProvider,
  swapManager: true,  // Enable background monitoring
});

// Chain swaps
const chainSwap = new ArkadeChainSwap({
  wallet,
  swapProvider,
  swapManager: true,
});
```

### 2. Send Lightning Payment

```typescript
const result = await lightning.sendLightningPayment({
  invoice: "lnbc100n1p...",
});
console.log("Paid!", result.preimage, result.txid);
```

### 3. Receive Lightning Payment

```typescript
const invoice = await lightning.createLightningInvoice({
  amount: 10000,  // sats
  description: "Payment for coffee",
});
console.log("Pay this invoice:", invoice.invoice);

// Wait for payment and claim
const { txid } = await lightning.waitAndClaim(invoice.pendingSwap);
```

### 4. ARK to BTC Chain Swap

```typescript
const swap = await chainSwap.arkToBtc({
  btcAddress: "bc1q...",
  senderLockAmount: 50000,  // sats to send
});
console.log("Send ARK to:", swap.arkAddress, "Amount:", swap.amountToPay);

// Pay the ARK address, then claim BTC
const { txid } = await chainSwap.waitAndClaimBtc(swap.pendingSwap);
```

### 5. BTC to ARK Chain Swap

```typescript
const swap = await chainSwap.btcToArk({
  senderLockAmount: 50000,
});
console.log("Send BTC to:", swap.btcAddress, "Amount:", swap.amountToPay);

// Pay the BTC address, then claim ARK
const { txid } = await chainSwap.waitAndClaimArk(swap.pendingSwap);
```

### 6. SwapManager Events

```typescript
const lightning = new ArkadeLightning({
  wallet,
  swapProvider,
  swapManager: {
    enableAutoActions: true,
    pollInterval: 30000,
    events: {
      onSwapUpdate: (swap, oldStatus) => {
        console.log(`Swap ${swap.id}: ${oldStatus} -> ${swap.status}`);
      },
      onSwapCompleted: (swap) => {
        console.log(`Swap ${swap.id} completed!`);
      },
      onSwapFailed: (swap, error) => {
        console.error(`Swap ${swap.id} failed:`, error);
      },
    },
  },
});
```

### 7. Query Fees and Limits

```typescript
const fees = await lightning.getFees();
const limits = await lightning.getLimits();
console.log("Submarine fee:", fees.submarine.percentage, "%");
console.log("Limits:", limits.min, "-", limits.max, "sats");
```

### 8. Restore Swaps

```typescript
const { reverseSwaps, submarineSwaps } = await lightning.restoreSwaps();
// Restored swaps may need enrichment before claim/refund:
// lightning.enrichReverseSwapPreimage(swap, preimage);
// lightning.enrichSubmarineSwapInvoice(swap, invoice);
```

### 9. Custom Logger

```typescript
import { setLogger } from "@arkade-os/boltz-swap";

setLogger({
  log: (...args) => myLogger.info(...args),
  warn: (...args) => myLogger.warn(...args),
  error: (...args) => myLogger.error(...args),
});
```

## Cleanup

```typescript
// Manual cleanup
await lightning.dispose();

// Or with TypeScript 5.2+ auto-dispose
await using lightning = new ArkadeLightning({ ... });
// Automatically cleaned up when scope exits
```
