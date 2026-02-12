---
name: ark-sdk-settlement
description: Settlement and exit operations - Settle, CollaborativeExit, Unroll, fee estimation
---

# SDK Settlement for Ark

## When to Use

Use this skill when:
- Implementing VTXO refresh via Settle
- Withdrawing to on-chain via CollaborativeExit
- Performing unilateral exit via Unroll
- Understanding fee estimation for settlement operations
- Working with expiry thresholds and VTXO selection
- Handling boarding UTXOs in settlements

## Key Concepts

### 1. Settlement Types

| Operation | Purpose | Speed | Requires ASP |
|-----------|---------|-------|--------------|
| `Settle` | Refresh VTXOs in new round | Fast | Yes |
| `CollaborativeExit` | Off-chain → On-chain | Fast | Yes |
| `Unroll` | Unilateral exit (no ASP) | Slow | No |

### 2. Settle vs CollaborativeExit

- **Settle**: Moves VTXOs to new round with fresh expiration. Stays off-chain.
- **CollaborativeExit**: Creates on-chain UTXO from VTXOs. Goes on-chain but fast.

### 3. Unilateral Exit (Unroll)

When ASP is unresponsive or malicious:
1. Publish commitment transaction
2. Wait for CSV delay
3. Spend via exit path (owner after delay)

### 4. Expiry Threshold

Default: VTXOs expiring within 24 hours are selected for settlement.
```go
const defaultExpiryThreshold = 24 * 60 * 60 // 24 hours in seconds
```

## Code Patterns

### Pattern 1: Basic Settle (Refresh All Expiring VTXOs)

```go
func refreshVtxos(client arksdk.ArkClient) (string, error) {
    ctx := context.Background()

    // Settle all VTXOs expiring within default threshold (24h)
    txid, err := client.Settle(ctx)
    if err != nil {
        return "", err
    }

    return txid, nil
}
```

### Pattern 2: Settle with Custom Expiry Threshold

```go
// Refresh VTXOs expiring within 48 hours
txid, err := client.Settle(ctx,
    arksdk.WithExpiryThreshold(48 * 60 * 60),  // 48 hours
)

// Include recoverable (swept) VTXOs
txid, err := client.Settle(ctx,
    arksdk.WithRecoverableVtxos(),
)
```

### Pattern 3: Settle Implementation

```go
func (a *arkClient) Settle(ctx context.Context, opts ...Option) (string, error) {
    if err := a.safeCheck(); err != nil {
        return "", err
    }

    // Settle with no receivers = pure refresh
    return a.settle(ctx, nil, opts...)
}

func (a *arkClient) settle(
    ctx context.Context, receivers []types.Receiver, settleOpts ...Option,
) (string, error) {
    options := newDefaultSettleOptions()
    for _, opt := range settleOpts {
        opt(options)
    }
    if options.expiryThreshold <= 0 {
        options.expiryThreshold = defaultExpiryThreshold
    }

    // Get fee estimator from server
    info, _ := a.client.GetInfo(ctx)
    feeEstimator, _ := arkfee.New(info.Fees.IntentFees)

    // Select funds (VTXOs + boarding UTXOs)
    boardingUtxos, vtxos, outputs, err := a.selectFunds(
        ctx, receivers, feeEstimator,
        CoinSelectOptions{
            WithRecoverableVtxos: options.withRecoverableVtxos,
            ExpiryThreshold:      options.expiryThreshold,
        },
    )
    if err != nil {
        return "", err
    }

    // Join the next batch/round
    return a.joinBatchWithRetry(ctx, nil, outputs, *options, vtxos, boardingUtxos)
}
```
**Source**: `go-sdk/client.go:760-766, 2063-2127`

### Pattern 4: CollaborativeExit (Off-chain to On-chain)

```go
func withdrawToOnchain(client arksdk.ArkClient, btcAddr string, amount uint64) (string, error) {
    ctx := context.Background()

    // Withdraw to Bitcoin address
    txid, err := client.CollaborativeExit(ctx, btcAddr, amount)
    if err != nil {
        return "", err
    }

    return txid, nil
}
```

### Pattern 5: CollaborativeExit Implementation

```go
func (a *arkClient) CollaborativeExit(
    ctx context.Context, addr string, amount uint64, opts ...Option,
) (string, error) {
    if err := a.safeCheck(); err != nil {
        return "", err
    }

    // Server must allow on-chain outputs
    if a.UtxoMaxAmount == 0 {
        return "", fmt.Errorf("operation not allowed by the server")
    }

    options := newDefaultSettleOptions()
    for _, opt := range opts {
        opt(options)
    }
    if options.expiryThreshold <= 0 {
        options.expiryThreshold = defaultExpiryThreshold
    }

    // Validate it's a valid Bitcoin address
    netParams := utils.ToBitcoinNetwork(a.Network)
    if _, err := btcutil.DecodeAddress(addr, &netParams); err != nil {
        return "", fmt.Errorf("invalid onchain address")
    }

    // Check balance
    spendableVtxos, _ := a.getVtxos(ctx, &CoinSelectOptions{
        WithRecoverableVtxos: options.withRecoverableVtxos,
    })
    balance := uint64(0)
    for _, vtxo := range spendableVtxos {
        balance += vtxo.Amount
    }
    if balance < amount {
        return "", fmt.Errorf("not enough funds to cover amount %d", amount)
    }

    // Get fee estimator
    info, _ := a.client.GetInfo(ctx)
    feeEstimator, _ := arkfee.New(info.Fees.IntentFees)

    // Create receiver for on-chain address
    receivers := []types.Receiver{{To: addr, Amount: amount}}

    // Select funds
    boardingUtxos, vtxos, outputs, err := a.selectFunds(
        ctx, receivers, feeEstimator,
        CoinSelectOptions{
            WithRecoverableVtxos: options.withRecoverableVtxos,
            ExpiryThreshold:      options.expiryThreshold,
        },
    )

    // Join batch
    return a.joinBatchWithRetry(ctx, nil, outputs, *options, vtxos, boardingUtxos)
}
```
**Source**: `go-sdk/client.go:690-758`

### Pattern 6: Unroll (Unilateral Exit)

```go
func unilateralExit(client arksdk.ArkClient) error {
    ctx := context.Background()

    // Step 1: Start unroll (publishes tree transactions)
    if err := client.Unroll(ctx); err != nil {
        return err
    }

    // Step 2: Wait for CSV delay to pass...
    // (typically days/weeks depending on config)

    // Step 3: Complete unroll to destination address
    btcAddr := "bc1q..."
    txid, err := client.CompleteUnroll(ctx, btcAddr)
    if err != nil {
        return err
    }

    fmt.Printf("Funds withdrawn to %s in tx %s\n", btcAddr, txid)
    return nil
}
```

### Pattern 7: Unroll Implementation

```go
func (a *arkClient) Unroll(ctx context.Context) error {
    if err := a.safeCheck(); err != nil {
        return err
    }

    vtxos, err := a.getVtxos(ctx, nil)
    if err != nil {
        return err
    }

    if len(vtxos) == 0 {
        return fmt.Errorf("no vtxos to unroll")
    }

    // Get redeem branches for each VTXO
    redeemBranches, err := a.getRedeemBranches(ctx, vtxos)
    if err != nil {
        return err
    }

    transactions := make([]string, 0)
    isWaitingForConfirmation := false

    for _, branch := range redeemBranches {
        // Get next transaction to publish in the branch
        nextTx, err := branch.NextRedeemTx()
        if err != nil {
            if err, ok := err.(redemption.ErrPendingConfirmation); ok {
                // Branch tx in mempool, wait for confirmation
                log.Debug(err.Error())
                isWaitingForConfirmation = true
                continue
            }
            return err
        }

        transactions = append(transactions, nextTx)
    }

    // Broadcast all transactions
    for _, tx := range transactions {
        if _, err := a.explorer.Broadcast(tx); err != nil {
            log.WithError(err).Warn("failed to broadcast transaction")
        }
    }

    if isWaitingForConfirmation {
        return fmt.Errorf("waiting for confirmation of some transactions")
    }
    return nil
}
```
**Source**: `go-sdk/client.go:566-660`

### Pattern 8: Complete Unroll

```go
func (a *arkClient) CompleteUnroll(ctx context.Context, to string) (string, error) {
    if err := a.safeCheck(); err != nil {
        return "", err
    }

    // Get redemption addresses (where unrolled funds land)
    _, _, _, redemptionAddrs, _ := a.wallet.GetAddresses(ctx)

    // Build transaction spending all redemption outputs to destination
    // ... (handles CSV delays, fee calculation, etc.)

    return txid, nil
}
```
**Source**: `go-sdk/client.go:662-688`

### Pattern 9: Fee Estimation for Settlement

```go
// Server provides fee config
info, _ := client.GetInfo(ctx)
feeEstimator, _ := arkfee.New(info.Fees.IntentFees)

// Estimate fee for specific inputs/outputs
inputs := []arkfee.OnchainInput{{Amount: 10000}}
outputs := []arkfee.Output{{Amount: 5000, Script: "..."}}
fee := feeEstimator.Estimate(inputs, outputs)
```

### Pattern 10: Boarding UTXOs in Settlement

```go
// Boarding UTXOs are on-chain UTXOs waiting to be "boarded" into Ark
// They can be included in settle operations alongside VTXOs

func (a *arkClient) selectFunds(
    ctx context.Context,
    receivers []types.Receiver,
    feeEstimator arkfee.Estimator,
    opts CoinSelectOptions,
) ([]types.Utxo, []client.TapscriptsVtxo, []types.Receiver, error) {
    // Get spendable VTXOs
    spendableVtxos, _ := a.getVtxos(ctx, &opts)

    // Get boarding UTXOs (on-chain, pending boarding)
    boardingUtxos, _ := a.getBoardingUtxos(ctx)

    // Coin selection considers both
    selectedBoardingUtxos, selectedVtxos, outputs := utils.CoinSelect(
        boardingUtxos, vtxos, receivers, a.Dust, ...
    )

    return selectedBoardingUtxos, selectedVtxos, outputs, nil
}
```

### Pattern 11: Register Intent (Low-Level)

```go
// RegisterIntent is the low-level API for joining rounds
func (a *arkClient) RegisterIntent(
    ctx context.Context,
    vtxos []types.Vtxo,
    boardingUtxos []types.Utxo,
    notes []string,
    outputs []types.Receiver,
    cosignersPublicKeys []string,
) (string, error) {
    // Convert to intent inputs with tapscripts
    vtxosWithTapscripts, _ := a.populateVtxosWithTapscripts(ctx, vtxos)
    inputs, tapLeaves, arkFields, _ := toIntentInputs(boardingUtxos, vtxosWithTapscripts, notes)

    // Build signed proof transaction
    proofTx, message, _ := a.makeRegisterIntent(inputs, tapLeaves, outputs, cosignersPublicKeys, arkFields)

    // Register with server
    return a.client.RegisterIntent(ctx, proofTx, message)
}
```
**Source**: `go-sdk/client.go:787-815`

### Pattern 12: Delete Intent

```go
// Cancel a registered intent before round finalization
func (a *arkClient) DeleteIntent(
    ctx context.Context,
    vtxos []types.Vtxo,
    boardingUtxos []types.Utxo,
    notes []string,
) error {
    vtxosWithTapscripts, _ := a.populateVtxosWithTapscripts(ctx, vtxos)
    inputs, exitLeaves, arkFields, _ := toIntentInputs(boardingUtxos, vtxosWithTapscripts, notes)
    proofTx, message, _ := a.makeDeleteIntent(inputs, exitLeaves, arkFields)

    return a.client.DeleteIntent(ctx, proofTx, message)
}
```
**Source**: `go-sdk/client.go:817-842`

## File References

| Purpose | File | Key Functions |
|---------|------|---------------|
| Settle/Exit | `go-sdk/client.go` | `Settle`, `CollaborativeExit`, `settle` |
| Unroll | `go-sdk/client.go` | `Unroll`, `CompleteUnroll` |
| Intent registration | `go-sdk/client.go` | `RegisterIntent`, `DeleteIntent` |
| Batch joining | `go-sdk/batch_session.go` | `joinBatchWithRetry` |
| Fee estimation | `arkd/pkg/ark-lib/arkfee/` | `Estimator`, `New` |
| Redemption | `go-sdk/redemption/redeem.go` | `RedeemBranch`, `NextRedeemTx` |

## Common Operations

### Operation 1: Check If Settlement Needed

```go
func needsSettlement(client arksdk.ArkClient, thresholdHours int) (bool, error) {
    ctx := context.Background()

    balance, err := client.Balance(ctx)
    if err != nil {
        return false, err
    }

    // Check if any VTXOs expire within threshold
    threshold := time.Now().Add(time.Duration(thresholdHours) * time.Hour)

    for _, detail := range balance.OffchainBalance.Details {
        expiry, _ := time.Parse(time.RFC3339, detail.ExpiryTime)
        if expiry.Before(threshold) {
            return true, nil
        }
    }

    return false, nil
}
```

### Operation 2: Max Withdrawal

```go
// Withdraw entire balance to on-chain
func withdrawAll(client arksdk.ArkClient, btcAddr string) (string, error) {
    ctx := context.Background()

    balance, _ := client.Balance(ctx)
    total := balance.OffchainBalance.Total

    return client.CollaborativeExit(ctx, btcAddr, total)
}
```

### Operation 3: Periodic Refresh Cron

```go
func startRefreshCron(client arksdk.ArkClient) {
    ticker := time.NewTicker(12 * time.Hour)
    defer ticker.Stop()

    for range ticker.C {
        ctx := context.Background()

        // Refresh VTXOs expiring in next 24 hours
        _, err := client.Settle(ctx, arksdk.WithExpiryThreshold(24*60*60))
        if err != nil {
            log.Printf("Settlement failed: %v", err)
        }
    }
}
```

### Operation 4: Emergency Unroll

```go
func emergencyExit(client arksdk.ArkClient, btcAddr string) error {
    ctx := context.Background()

    // Try collaborative exit first (faster)
    balance, _ := client.Balance(ctx)
    _, err := client.CollaborativeExit(ctx, btcAddr, balance.OffchainBalance.Total)
    if err == nil {
        return nil
    }

    // ASP unresponsive - use unilateral exit
    log.Println("Collaborative exit failed, starting unilateral exit...")

    if err := client.Unroll(ctx); err != nil {
        return fmt.Errorf("unroll failed: %w", err)
    }

    // User must wait for CSV delay then call CompleteUnroll
    return nil
}
```

## Settlement Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    SETTLEMENT FLOW                              │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User calls Settle()                                            │
│          │                                                      │
│          ▼                                                      │
│  1. Get fee estimator from server                              │
│          │                                                      │
│          ▼                                                      │
│  2. Select VTXOs (by expiry threshold)                         │
│     + boarding UTXOs if any                                     │
│          │                                                      │
│          ▼                                                      │
│  3. Calculate outputs (receivers + change)                     │
│          │                                                      │
│          ▼                                                      │
│  4. Join batch round (joinBatchWithRetry)                      │
│     ├─ Register intent                                         │
│     ├─ Subscribe to events                                     │
│     ├─ Submit nonces                                           │
│     ├─ Submit signatures                                       │
│     └─ Wait for finalization                                   │
│          │                                                      │
│          ▼                                                      │
│  5. Return commitment txid                                     │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

## Gotchas & Edge Cases

1. **Server Must Allow On-chain**: `CollaborativeExit` fails if `UtxoMaxAmount == 0`. Server controls this.

2. **Expiry Threshold**: Default is 24 hours. VTXOs NOT expiring within threshold are NOT settled.

3. **Recoverable VTXOs**: By default, swept-but-unspent VTXOs are excluded. Use `WithRecoverableVtxos()` to include.

4. **Unroll is Multi-Step**: `Unroll()` starts the process, `CompleteUnroll()` finishes after CSV delay.

5. **CSV Delay**: Unilateral exit requires waiting for the configured delay (e.g., 512 blocks). Plan accordingly.

6. **Fee Estimation**: Fees are estimated by server based on intent fees config. Actual fees may vary.

7. **Boarding UTXOs**: On-chain funds waiting to board can be included in settlement for efficiency.

8. **Intent Deletion**: Can cancel a registered intent before round finalizes via `DeleteIntent()`.

9. **Retry Logic**: `joinBatchWithRetry` handles transient failures. Don't retry externally immediately.

10. **All-or-Nothing**: If settlement fails mid-way, VTXOs remain in original state. Safe to retry.

---
**Skill Owner**: ark-developer
**Repos**: go-sdk
