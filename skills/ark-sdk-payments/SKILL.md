---
name: ark-sdk-payments
description: Off-chain payment operations with go-sdk - SendOffChain, coin selection, receivers, change handling
---

# SDK Payments for Ark

## When to Use

Use this skill when:
- Implementing off-chain payments (SendOffChain)
- Understanding coin selection strategies
- Handling payment receivers and validation
- Managing change outputs
- Working with notes (direct VTXOs)
- Understanding Ark transaction construction

## Key Concepts

### 1. SendOffChain Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SENDOFFCHAIN FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Validate receivers (all must be off-chain Ark addresses)     │
│                          │                                       │
│                          ▼                                       │
│  2. Get spendable VTXOs from wallet                             │
│                          │                                       │
│                          ▼                                       │
│  3. Coin selection (select enough VTXOs to cover amount + dust) │
│                          │                                       │
│                          ▼                                       │
│  4. Calculate change (if any) and add change output             │
│                          │                                       │
│                          ▼                                       │
│  5. Build Ark TX + Checkpoint TXs                               │
│                          │                                       │
│                          ▼                                       │
│  6. Sign locally (wallet signs forfeit path)                    │
│                          │                                       │
│                          ▼                                       │
│  7. Submit to server (SubmitTx) for co-signing                  │
│                          │                                       │
│                          ▼                                       │
│  8. Verify server signatures                                     │
│                          │                                       │
│                          ▼                                       │
│  9. Finalize TX (sign checkpoints, submit FinalizeTx)           │
│                          │                                       │
│                          ▼                                       │
│  10. Update local DB (mark spent, add change VTXO)              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Receiver Structure

```go
type Receiver struct {
    To     string  // Ark address (bech32m) or BTC address
    Amount uint64  // Amount in satoshis
}
```

### 3. Off-chain vs On-chain Addresses

- **Off-chain (Ark)**: `ark1...` - instant, free, within Ark network
- **On-chain (BTC)**: `bc1...` - requires CollaborativeExit, costs fees

### 4. Coin Selection

SDK automatically selects VTXOs to cover payment amount:
- By default, sorts by expiry (oldest first) to maximize VTXO lifetime
- Can disable expiry sorting for different selection strategy
- Skips recoverable (swept but unspent) VTXOs for normal payments

## Code Patterns

### Pattern 1: Basic SendOffChain

```go
func sendPayment(client arksdk.ArkClient, toAddr string, amount uint64) (string, error) {
    ctx := context.Background()

    receivers := []types.Receiver{
        {To: toAddr, Amount: amount},
    }

    // Returns Ark TX ID on success
    txid, err := client.SendOffChain(ctx, receivers)
    if err != nil {
        return "", err
    }

    return txid, nil
}
```

### Pattern 2: SendOffChain with Options

```go
// Disable expiry-based sorting (random selection)
txid, err := client.SendOffChain(ctx, receivers,
    arksdk.WithoutExpirySorting(),
)

// Select from specific outpoints only
txid, err := client.SendOffChain(ctx, receivers,
    arksdk.WithOutpointsFilter([]types.Outpoint{
        {Txid: "abc123...", VOut: 0},
        {Txid: "def456...", VOut: 1},
    }),
)
```

### Pattern 3: Multiple Receivers (Batch Payment)

```go
receivers := []types.Receiver{
    {To: "ark1alice...", Amount: 10000},
    {To: "ark1bob...",   Amount: 20000},
    {To: "ark1carol...", Amount: 15000},
}

txid, err := client.SendOffChain(ctx, receivers)
// Single TX pays all receivers
```

### Pattern 4: Receiver Validation

```go
func (a *arkClient) SendOffChain(ctx context.Context, receivers []types.Receiver, opts ...Option) (string, error) {
    // All receivers must be off-chain addresses
    for _, receiver := range receivers {
        if receiver.IsOnchain() {
            return "", fmt.Errorf("all receiver addresses must be offchain addresses")
        }

        // Validate it's a valid Ark address
        addr, err := arklib.DecodeAddressV0(receiver.To)
        if err != nil {
            return "", fmt.Errorf("invalid receiver address: %s", err)
        }

        // Verify signer matches our server's signer
        rcvSignerPubkey := schnorr.SerializePubKey(addr.Signer)
        if !bytes.Equal(expectedSignerPubkey, rcvSignerPubkey) {
            return "", fmt.Errorf(
                "invalid receiver address '%s': expected signer pubkey %x, got %x",
                receiver.To, expectedSignerPubkey, rcvSignerPubkey,
            )
        }
    }
    // ...
}
```
**Source**: `go-sdk/client.go:270-289`

### Pattern 5: Coin Selection

```go
// Get spendable VTXOs
spendableVtxos, err := a.getVtxos(ctx, &CoinSelectOptions{
    WithoutExpirySorting: options.withoutExpirySorting,
})

// Filter VTXOs that belong to our addresses
vtxos := make([]client.TapscriptsVtxo, 0)
for _, offchainAddr := range offchainAddrs {
    for _, v := range spendableVtxos {
        if v.IsRecoverable() {
            continue  // Skip swept VTXOs
        }
        vtxoAddr, _ := v.Address(a.SignerPubKey, a.Network)
        if vtxoAddr == offchainAddr.Address {
            vtxos = append(vtxos, client.TapscriptsVtxo{
                Vtxo:       v,
                Tapscripts: offchainAddr.Tapscripts,
            })
        }
    }
}

// Select coins for payment
_, selectedCoins, changeAmount, err := utils.CoinSelect(
    nil,                           // No boarding UTXOs for off-chain
    vtxos,                         // Available VTXOs
    receivers,                     // Payment receivers
    a.Dust,                        // Dust threshold
    options.withoutExpirySorting,  // Sorting preference
    nil,                           // No extra filter
)
```
**Source**: `go-sdk/client.go:301-335`

### Pattern 6: Change Handling

```go
// If there's change, add a change output back to ourselves
if changeAmount > 0 {
    receivers = append(receivers, types.Receiver{
        To:     offchainAddrs[0].Address,  // Our first address
        Amount: changeAmount,
    })
}
```
**Source**: `go-sdk/client.go:337-341`

### Pattern 7: Building the Ark Transaction

```go
// For each selected VTXO, get the forfeit closure
inputs := make([]arkTxInput, 0, len(selectedCoins))
for _, coin := range selectedCoins {
    vtxoScript, _ := script.ParseVtxoScript(coin.Tapscripts)
    forfeitClosure := vtxoScript.ForfeitClosures()[0]
    forfeitScript, _ := forfeitClosure.Script()
    forfeitLeaf := txscript.NewBaseTapLeaf(forfeitScript)

    inputs = append(inputs, arkTxInput{
        coin,
        forfeitLeaf.TapHash(),
    })
}

// Build the off-chain TX
arkTx, checkpointTxs, err := buildOffchainTx(
    inputs,
    receivers,
    a.CheckpointExitPath(),
    a.Dust,
)
```
**Source**: `go-sdk/client.go:343-369`

### Pattern 8: Sign and Submit

```go
// Sign with wallet (forfeit path signature)
signedArkTx, err := a.wallet.SignTransaction(ctx, a.explorer, arkTx)

// Submit to server for co-signing
arkTxid, signedArkTx, signedCheckpointTxs, err := a.client.SubmitTx(
    ctx, signedArkTx, checkpointTxs,
)

// Verify server signatures are valid
if err := verifySignedArk(arkTx, signedArkTx, a.SignerPubKey); err != nil {
    return "", err
}

if err := verifySignedCheckpoints(checkpointTxs, signedCheckpointTxs, a.SignerPubKey); err != nil {
    return "", err
}
```
**Source**: `go-sdk/client.go:371-390`

### Pattern 9: Finalize Transaction

```go
// Finalize = sign checkpoints and notify server
txid, err := a.finalizeTx(ctx, client.AcceptedOffchainTx{
    Txid:                arkTxid,
    FinalArkTx:          signedArkTx,
    SignedCheckpointTxs: signedCheckpointTxs,
})
```
**Source**: `go-sdk/client.go:392-399`

### Pattern 10: Update Local State

```go
// Mark spent VTXOs
spentVtxos := make([]types.Vtxo, 0, len(selectedCoins))
for i, vtxo := range selectedCoins {
    checkpointTx, _ := psbt.NewFromRawBytes(strings.NewReader(signedCheckpointTxs[i]), true)

    vtxo.Spent = true
    vtxo.ArkTxid = arkTxid
    vtxo.SpentBy = checkpointTx.UnsignedTx.TxID()
    spentVtxos = append(spentVtxos, vtxo.Vtxo)
}

a.store.VtxoStore().UpdateVtxos(ctx, spentVtxos)

// Add change VTXO if any
if changeAmount > 0 {
    a.store.VtxoStore().AddVtxos(ctx, []types.Vtxo{
        {
            Outpoint: types.Outpoint{Txid: arkTxid, VOut: uint32(len(receivers) - 1)},
            Amount:   changeAmount,
            Script:   hex.EncodeToString(changeScript),
            // Inherit expiration from inputs
            ExpiresAt: smallestExpiration,
        },
    })
}

// Record transaction
a.store.TransactionStore().AddTransactions(ctx, []types.Transaction{
    {
        TransactionKey: types.TransactionKey{ArkTxid: arkTxid},
        Amount:         spentAmount,
        Type:           types.TxSent,
        CreatedAt:      time.Now(),
    },
})
```
**Source**: `go-sdk/client.go:405-521`

### Pattern 11: Redeeming Notes

```go
func (a *arkClient) RedeemNotes(ctx context.Context, notes []string, opts ...Option) (string, error) {
    // Notes are pre-funded VTXOs that can be redeemed
    for _, noteStr := range notes {
        v, err := note.NewNoteFromString(noteStr)
        if err != nil {
            return "", err
        }
        // Process note...
    }
    // Similar flow to SendOffChain but using notes as inputs
}
```
**Source**: `go-sdk/client.go:526-548`

### Pattern 12: CoinSelectOptions

```go
type CoinSelectOptions struct {
    // Don't sort by expiry (default: sorts oldest first)
    WithoutExpirySorting bool

    // Only select from these specific outpoints
    OutpointsFilter []types.Outpoint

    // Include swept but unspent VTXOs
    WithRecoverableVtxos bool

    // Only VTXOs expiring before this threshold (seconds)
    ExpiryThreshold int64

    // Recompute expiration from ancestor leaves
    RecomputeExpiry bool
}
```
**Source**: `go-sdk/types.go:134-145`

## File References

| Purpose | File | Key Functions |
|---------|------|---------------|
| SendOffChain | `go-sdk/client.go` | `SendOffChain`, `RedeemNotes` |
| Coin selection | `go-sdk/internal/utils/coinselect.go` | `CoinSelect` |
| Ark TX building | `go-sdk/client.go` | `buildOffchainTx` |
| Options | `go-sdk/options.go` | `WithoutExpirySorting`, etc. |
| Types | `go-sdk/types/types.go` | `Receiver`, `Vtxo`, `Transaction` |

## Common Operations

### Operation 1: Simple Payment

```go
txid, err := client.SendOffChain(ctx, []types.Receiver{
    {To: recipientArkAddr, Amount: 10000},
})
```

### Operation 2: Payment with Change Inspection

```go
// Before payment
balance1, _ := client.Balance(ctx)
fmt.Printf("Before: %d sats\n", balance1.OffchainBalance.Total)

// Send payment
txid, _ := client.SendOffChain(ctx, []types.Receiver{
    {To: recipientAddr, Amount: 5000},
})

// After payment (change is automatically handled)
balance2, _ := client.Balance(ctx)
fmt.Printf("After: %d sats\n", balance2.OffchainBalance.Total)
```

### Operation 3: Max Send (Sweep All)

```go
balance, _ := client.Balance(ctx)
total := balance.OffchainBalance.Total

// Send everything (no change)
txid, err := client.SendOffChain(ctx, []types.Receiver{
    {To: recipientAddr, Amount: total},
})
```

### Operation 4: Check If Address Is Valid

```go
func isValidArkAddress(addr string, expectedSigner *btcec.PublicKey) bool {
    decoded, err := arklib.DecodeAddressV0(addr)
    if err != nil {
        return false  // Invalid format
    }

    // Check signer matches expected server
    return bytes.Equal(
        schnorr.SerializePubKey(decoded.Signer),
        schnorr.SerializePubKey(expectedSigner),
    )
}
```

## Gotchas & Edge Cases

1. **Off-chain Only**: `SendOffChain` only supports Ark addresses. Use `CollaborativeExit` for on-chain withdrawals.

2. **Signer Validation**: Receiver addresses must have the same signer as your server. Cross-server payments fail.

3. **Dust Threshold**: Amounts below dust threshold are handled specially (sub-dust outputs marked as recoverable).

4. **Change Expiration**: Change VTXOs inherit the earliest expiration from input VTXOs. Plan refreshes accordingly.

5. **Server Co-sign**: Payment requires server to co-sign. If server is down, payment fails.

6. **DB Mutex**: SendOffChain holds a DB lock. Don't call other methods that acquire DB lock during the call.

7. **Transaction Feed**: If `WithTransactionFeed: true`, local state is updated. Otherwise, no local state change.

8. **Recoverable VTXOs**: Normal payments skip swept-but-unspent VTXOs. Use `WithRecoverableVtxos` to include them.

9. **Verify Signatures**: SDK verifies server signatures before finalization. Don't skip this verification.

10. **Batch Payments**: Multiple receivers in one TX is more efficient than multiple single-receiver TXs.

---
**Skill Owner**: ark-developer
**Repos**: go-sdk
