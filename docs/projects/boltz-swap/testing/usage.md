# Arkade Boltz Swap — Usage Guide

## Installation

```bash
npm install @arkade-os/sdk @arkade-os/boltz-swap
```

**Requirements**:
- Node.js 22+
- TypeScript 5.9+ (recommended)
- pnpm 10.25.0 (for development)

---

## Quick Start

### Basic Setup

```typescript
import { Wallet, SingleKey } from '@arkade-os/sdk';
import { ArkadeLightning, BoltzSwapProvider } from '@arkade-os/boltz-swap';

// Create wallet identity
const identity = SingleKey.fromHex('your_private_key_hex');
// Or generate new: const identity = SingleKey.fromRandomBytes();

// Initialize Arkade wallet
const wallet = await Wallet.create({
  identity,
  arkServerUrl: 'https://mutinynet.arkade.sh',
});

// Initialize Boltz swap provider
const swapProvider = new BoltzSwapProvider({
  apiUrl: 'https://api.boltz.mutinynet.arkade.sh',
  network: 'mutinynet',
  referralId: 'arkade', // optional
});

// Create ArkadeLightning instance with SwapManager enabled
const arkadeLightning = new ArkadeLightning({
  wallet,
  swapProvider,
  swapManager: true, // Enable automatic monitoring
});
```

---

## Receiving Lightning Payments

### Create Invoice (with SwapManager)
```typescript
// Create Lightning invoice
const result = await arkadeLightning.createLightningInvoice({
  amount: 50000, // 50,000 sats
  description: 'Payment to Arkade wallet',
});

console.log('Invoice:', result.invoice);
console.log('Amount:', result.amount);
console.log('Expiry:', result.expiry);

// Share invoice with payer
// SwapManager automatically monitors and claims when paid
```

### Subscribe to Payment Status
```typescript
const manager = arkadeLightning.getSwapManager();

manager.onSwapUpdate((swap, oldStatus) => {
  console.log(`${swap.id}: ${oldStatus} → ${swap.status}`);

  if (swap.status === 'invoice.settled') {
    console.log('Lightning payment received!');
  }
});

manager.onSwapCompleted((swap) => {
  console.log('Payment claimed successfully:', swap.txid);
});
```

---

## Sending Lightning Payments

### Pay Invoice (with SwapManager)
```typescript
import { decodeInvoice } from '@arkade-os/boltz-swap';

// Validate invoice first
const invoice = 'lnbc500u1pj...';
const details = decodeInvoice(invoice);
console.log('Amount:', details.amountSats, 'sats');

// Send payment
const result = await arkadeLightning.sendLightningPayment({ invoice });

console.log('Payment initiated:', result.txid);
// SwapManager handles monitoring and refunds if payment fails
```

---

## Manual Swap Monitoring (without SwapManager)

If SwapManager is disabled, you must manually monitor swaps:

```typescript
const arkadeLightning = new ArkadeLightning({
  wallet,
  swapProvider,
  // swapManager: false (default)
});

// Create invoice
const result = await arkadeLightning.createLightningInvoice({ amount: 50000 });

// MUST manually wait for payment - blocks until complete
try {
  const { txid } = await arkadeLightning.waitAndClaim(result.pendingSwap);
  console.log('Payment received:', txid);
} catch (error) {
  console.error('Payment failed:', error);

  // Manual refund on failure
  if (error.isRefundable && error.pendingSwap) {
    await arkadeLightning.refundVHTLC(error.pendingSwap);
  }
}
```

---

## Checking Swap Limits

```typescript
const limits = await arkadeLightning.getLimits();

if (limits) {
  console.log('Min swap amount:', limits.min, 'sats');
  console.log('Max swap amount:', limits.max, 'sats');

  // Validate amount before creating swap
  const amount = 50000;
  if (amount < limits.min || amount > limits.max) {
    console.error('Amount outside valid range');
  }
}
```

---

## Calculating Swap Fees

```typescript
const fees = await arkadeLightning.getFees();

if (fees) {
  // Calculate submarine swap fee (Lightning → Arkade)
  const submarineFee = (amount) => {
    const { percentage, minerFees } = fees.submarine;
    return Math.ceil((amount * percentage) / 100 + minerFees);
  };

  // Calculate reverse swap fee (Arkade → Lightning)
  const reverseFee = (amount) => {
    const { percentage, minerFees } = fees.reverse;
    return Math.ceil((amount * percentage) / 100 + minerFees.claim + minerFees.lockup);
  };

  console.log('Fee for 50k sats:', submarineFee(50000), 'sats');
}
```

---

## Querying Swap History

```typescript
// Get all pending submarine swaps (waiting for payment)
const pendingReceives = await arkadeLightning.getPendingSubmarineSwaps();

// Get all pending reverse swaps (waiting for claim)
const pendingSends = await arkadeLightning.getPendingReverseSwaps();

// Get complete swap history
const history = await arkadeLightning.getSwapHistory();

history.forEach(swap => {
  console.log(`${swap.id}: ${swap.status}`);
  console.log(`Amount: ${swap.amount} sats`);
  console.log(`Type: ${swap.type}`);
});
```

---

## Advanced: SwapManager Configuration

```typescript
const arkadeLightning = new ArkadeLightning({
  wallet,
  swapProvider,
  swapManager: {
    enableAutoActions: true,        // Auto claim/refund (default: true)
    autoStart: true,                // Start on init (default: true)
    pollInterval: 30000,            // Failsafe poll every 30s
    reconnectDelayMs: 1000,         // Initial WS reconnect delay
    maxReconnectDelayMs: 60000,     // Max WS reconnect delay
    pollRetryDelayMs: 5000,         // Initial fallback poll delay
    maxPollRetryDelayMs: 300000,    // Max fallback poll delay

    // Event listeners (can also use on/off methods)
    events: {
      onSwapUpdate: (swap, oldStatus) => {
        console.log(`${swap.id}: ${oldStatus} → ${swap.status}`);
      },
      onSwapCompleted: (swap) => {
        console.log('Swap completed:', swap.id);
      },
      onSwapFailed: (swap, error) => {
        console.error('Swap failed:', swap.id, error);
      },
      onActionExecuted: (swap, action) => {
        console.log(`Executed ${action} for ${swap.id}`);
      },
    },
  },
});
```

---

## Cleanup

```typescript
// Manual cleanup
await arkadeLightning.dispose();

// Automatic cleanup (TypeScript 5.2+)
{
  await using arkadeLightning = new ArkadeLightning({ wallet, swapProvider });
  // Use arkadeLightning...
} // Automatically disposed when scope exits
```

---

## Common Workflows

### Workflow 1: Deposit Lightning to Arkade
```typescript
// 1. Create invoice
const result = await arkadeLightning.createLightningInvoice({ amount: 50000 });

// 2. Display invoice to user
console.log('Pay this invoice:', result.invoice);

// 3. Monitor for payment (automatic with SwapManager)
manager.onSwapCompleted((swap) => {
  if (swap.id === result.pendingSwap.id) {
    console.log('Deposit received!');
  }
});
```

### Workflow 2: Send Lightning Payment from Arkade
```typescript
// 1. Decode and validate invoice
const invoice = 'lnbc500u1pj...';
const details = decodeInvoice(invoice);

// 2. Check limits
const limits = await arkadeLightning.getLimits();
if (details.amountSats < limits.min || details.amountSats > limits.max) {
  throw new Error('Amount outside valid range');
}

// 3. Send payment
const result = await arkadeLightning.sendLightningPayment({ invoice });
console.log('Payment sent:', result.txid);
```

### Workflow 3: Handle Swap Failures
```typescript
manager.onSwapFailed(async (swap, error) => {
  console.error('Swap failed:', swap.id, error.message);

  // Refunds are automatic with SwapManager
  // This is just for logging/notifications
  if (error.isRefundable) {
    console.log('Refund will be executed automatically');
  }
});
```
