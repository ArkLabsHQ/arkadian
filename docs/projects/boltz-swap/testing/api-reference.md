# boltz-swap -- API Reference

## ArkadeLightning

### Constructor

```typescript
new ArkadeLightning(config: ArkadeLightningConfig)
```

**Config**:
- `wallet`: Wallet | ServiceWorkerWallet (required)
- `swapProvider`: BoltzSwapProvider (required)
- `arkProvider?`: ArkProvider (falls back to wallet.arkProvider)
- `indexerProvider?`: IndexerProvider (falls back to wallet.indexerProvider)
- `swapManager?`: boolean | SwapManagerConfig -- enable background monitoring

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `sendLightningPayment(args)` | `SendLightningPaymentResponse` | Pay a Lightning invoice |
| `createLightningInvoice(args)` | `CreateLightningInvoiceResponse` | Create a Lightning invoice |
| `waitAndClaim(swap)` | `{ txid: string }` | Wait for reverse swap completion |
| `createSubmarineSwap(args)` | `PendingSubmarineSwap` | Create submarine swap (low-level) |
| `createReverseSwap(args)` | `PendingReverseSwap` | Create reverse swap (low-level) |
| `claimVHTLC(swap)` | `void` | Claim VHTLC for reverse swap |
| `refundVHTLC(swap)` | `void` | Refund VHTLC for submarine swap |
| `restoreSwaps(fees?)` | `{ reverseSwaps, submarineSwaps }` | Restore swaps from Boltz |
| `enrichReverseSwapPreimage(swap, preimage)` | `PendingReverseSwap` | Add preimage to restored swap |
| `enrichSubmarineSwapInvoice(swap, invoice)` | `PendingSubmarineSwap` | Add invoice to restored swap |
| `getFees()` | `FeesResponse` | Get swap fees |
| `getLimits()` | `LimitsResponse` | Get swap limits |
| `getSwapStatus(id)` | `GetSwapStatusResponse` | Get swap status |
| `getPendingSubmarineSwaps()` | `PendingSubmarineSwap[]` | Get active submarine swaps |
| `getPendingReverseSwaps()` | `PendingReverseSwap[]` | Get active reverse swaps |
| `getSwapHistory()` | `PendingSwap[]` | Get all swaps (sorted by date) |
| `refreshSwapsStatus()` | `void` | Refresh status of all pending swaps |
| `startSwapManager()` | `void` | Start background swap manager |
| `stopSwapManager()` | `void` | Stop background swap manager |
| `dispose()` | `void` | Cleanup resources |

## ArkadeChainSwap

### Constructor

```typescript
new ArkadeChainSwap(config: ArkadeChainSwapConfig)
```

Same config structure as ArkadeLightning.

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `arkToBtc(args)` | `ArkToBtcResponse` | Create ARK->BTC chain swap |
| `btcToArk(args)` | `BtcToArkResponse` | Create BTC->ARK chain swap |
| `waitAndClaim(swap)` | `{ txid: string }` | Wait and claim (auto-detect direction) |
| `waitAndClaimBtc(swap)` | `{ txid: string }` | Wait and claim BTC |
| `waitAndClaimArk(swap)` | `{ txid: string }` | Wait and claim ARK |
| `claimBtc(swap)` | `void` | Claim BTC with MuSig signing |
| `claimArk(swap)` | `void` | Claim ARK VHTLC |
| `refundArk(swap)` | `void` | Refund failed ARK->BTC swap |
| `getFees(from, to)` | `ChainFeesResponse` | Get chain swap fees |
| `getLimits(from, to)` | `LimitsResponse` | Get chain swap limits |
| `getPendingChainSwaps()` | `PendingChainSwap[]` | Get active chain swaps |
| `getSwapHistory()` | `PendingChainSwap[]` | Get all chain swaps |

## BoltzSwapProvider

### Constructor

```typescript
new BoltzSwapProvider(config: SwapProviderConfig)
```

**Config**:
- `network`: "bitcoin" | "mutinynet" | "regtest" (required)
- `apiUrl?`: Override Boltz API URL
- `referralId?`: Referral ID for tracking

### Key Methods

| Method | Description |
|--------|-------------|
| `createSubmarineSwap(req)` | Create submarine swap on Boltz |
| `createReverseSwap(req)` | Create reverse swap on Boltz |
| `createChainSwap(req)` | Create chain swap on Boltz |
| `monitorSwap(id, callback)` | Monitor swap via WebSocket |
| `getSwapStatus(id)` | Get current swap status |
| `getFees()` / `getChainFees(from, to)` | Get fee info |
| `getLimits()` / `getChainLimits(from, to)` | Get limits |
| `restoreSwaps(publicKey)` | Restore swaps by public key |
| `refundSubmarineSwap(id, tx, checkpoint)` | Refund submarine swap |
| `refundChainSwap(id, tx, checkpoint)` | Refund chain swap |

## SwapManager

### Constructor

```typescript
new SwapManager(swapProvider: BoltzSwapProvider, config?: SwapManagerConfig)
```

**Config**:
- `enableAutoActions?`: Auto claim/refund (default: true)
- `pollInterval?`: Polling interval in ms (default: 30000)
- `reconnectDelayMs?`: Initial WS reconnect delay (default: 1000)
- `maxReconnectDelayMs?`: Max WS reconnect delay (default: 60000)
- `events?`: SwapManagerEvents callbacks

### Event Methods (on/off pattern)

| Method | Description |
|--------|-------------|
| `onSwapUpdate(listener)` | Subscribe to status changes (returns unsubscribe fn) |
| `onSwapCompleted(listener)` | Subscribe to completions |
| `onSwapFailed(listener)` | Subscribe to failures |
| `onActionExecuted(listener)` | Subscribe to auto-actions |
| `onWebSocketConnected(listener)` | Subscribe to WS connect |
| `onWebSocketDisconnected(listener)` | Subscribe to WS disconnect |

## Error Types

| Error | Description |
|-------|-------------|
| `SwapError` | Base swap error (has isClaimable, isRefundable, pendingSwap) |
| `InvoiceExpiredError` | Lightning invoice expired |
| `InvoiceFailedToPayError` | Boltz failed to pay invoice |
| `SwapExpiredError` | Swap timed out |
| `TransactionFailedError` | Transaction failed |
| `TransactionLockupFailedError` | Lockup failed |
| `TransactionRefundedError` | Already refunded |
| `InsufficientFundsError` | Not enough funds |
| `NetworkError` | HTTP/WebSocket error (has statusCode, errorData) |
| `SchemaError` | Invalid API response format |

## Status Helpers

```typescript
// Submarine swap status checks
isSubmarinePendingStatus(status)
isSubmarineFinalStatus(status)
isSubmarineRefundableStatus(status)
isSubmarineSuccessStatus(status)

// Reverse swap status checks
isReversePendingStatus(status)
isReverseFinalStatus(status)
isReverseClaimableStatus(status)
isReverseSuccessStatus(status)

// Chain swap status checks
isChainPendingStatus(status)
isChainFinalStatus(status)
isChainClaimableStatus(status)
isChainRefundableStatus(status)
isChainSuccessStatus(status)

// Type guards
isPendingReverseSwap(swap)
isPendingSubmarineSwap(swap)
isPendingChainSwap(swap)
isSubmarineSwapRefundable(swap)
isChainSwapRefundable(swap)
isReverseSwapClaimable(swap)
isChainSwapClaimable(swap)
```
