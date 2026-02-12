# Fulmine Reverse Swap (Lightning → ARK)

## Overview

A reverse swap allows users to receive Lightning payments into their ARK wallet. Boltz locks funds in a VHTLC that Fulmine can claim by revealing the preimage after the Lightning invoice is paid.

## Flow Diagram

```
1. User wants to receive Lightning payment
2. Fulmine generates preimage (keeps secret)
3. Fulmine creates reverse swap with Boltz (provides preimage hash)
4. Boltz returns Lightning invoice + VHTLC address
5. User shares invoice with payer
6. Payer pays Lightning invoice → Boltz receives
7. Boltz funds VHTLC with ARK
8. Fulmine claims VHTLC by revealing preimage

If invoice not paid:
9. Boltz refunds itself after timelock
```

## Key Files

| File | Purpose |
|------|---------|
| `pkg/swap/swap.go` | GetInvoice(), reverseSwap(), ClaimVHTLC(), waitAndClaim() |
| `pkg/boltz/boltz.go` | CreateReverseSwap(), RevealPreimage() |
| `pkg/boltz/types.go` | CreateReverseSwapRequest/Response |
| `pkg/boltz/ws.go` | Websocket for swap updates |

## GetInvoice Entry Point

```go
// pkg/swap/swap.go:141-150
func (h *SwapHandler) GetInvoice(
    ctx context.Context, amount uint64, postProcess func(swap Swap) error,
) (Swap, error) {
    // Generate random preimage (Fulmine keeps this secret)
    preimage := make([]byte, 32)
    if _, err := rand.Read(preimage); err != nil {
        return Swap{}, fmt.Errorf("failed to generate preimage: %w", err)
    }

    return h.reverseSwap(ctx, amount, preimage, postProcess)
}
```

## Reverse Swap Implementation

### Step 1: Hash the Preimage

```go
// pkg/swap/swap.go:848-853
func (h *SwapHandler) reverseSwap(
    ctx context.Context, amount uint64, preimage []byte, postProcess func(swap Swap) error,
) (Swap, error) {
    // Hash: RIPEMD160(SHA256(preimage))
    var preimageHash []byte
    buf := sha256.Sum256(preimage)
    preimageHash = input.Ripemd160H(buf[:])
```

### Step 2: Create Reverse Swap with Boltz

```go
    // pkg/swap/swap.go:855-864
    swap, err := h.boltzSvc.CreateReverseSwap(boltz.CreateReverseSwapRequest{
        From:           boltz.CurrencyBtc,     // Boltz pays Lightning
        To:             boltz.CurrencyArk,     // Fulmine receives ARK
        InvoiceAmount:  amount,
        ClaimPublicKey: hex.EncodeToString(h.publicKey.SerializeCompressed()),
        PreimageHash:   hex.EncodeToString(buf[:]),  // SHA256 hash
    })
```

### Boltz API Request/Response

```go
// pkg/boltz/types.go:50-69
type CreateReverseSwapRequest struct {
    From           Currency `json:"from"`           // "BTC"
    To             Currency `json:"to"`             // "ARK"
    ClaimPublicKey string   `json:"claimPublicKey"` // Fulmine's key
    InvoiceAmount  uint64   `json:"invoiceAmount,omitempty"`
    OnchainAmount  uint64   `json:"onchainAmount,omitempty"`
    PreimageHash   string   `json:"preimageHash,omitempty"` // SHA256 hash
}

type CreateReverseSwapResponse struct {
    Id                  string              `json:"id"`
    LockupAddress       string              `json:"lockupAddress"`   // VHTLC address
    RefundPublicKey     string              `json:"refundPublicKey"` // Boltz's key
    TimeoutBlockHeights TimeoutBlockHeights `json:"timeoutBlockHeights"`
    Invoice             string              `json:"invoice"`         // LN invoice for payer
    InvoiceAmount       uint64              `json:"invoiceAmount,omitempty"`
    OnchainAmount       uint64              `json:"onchainAmount"`   // Amount after fees
    Error               string              `json:"error"`
}
```

### Step 3: Verify VHTLC Parameters

```go
    // pkg/swap/swap.go:866-888
    senderPubkey, err := parsePubkey(swap.RefundPublicKey)  // Boltz as sender

    // Verify the invoice amount and preimage hash match
    invoiceAmount, gotPreimageHash, err := decodeInvoice(swap.Invoice)

    if !bytes.Equal(preimageHash, gotPreimageHash) {
        return Swap{}, fmt.Errorf(
            "invalid preimage hash: expected %x, got %x", preimageHash, gotPreimageHash)
    }
    if invoiceAmount != amount {
        return Swap{}, fmt.Errorf(
            "invalid invoice amount: expected %d, got %d", amount, invoiceAmount)
    }

    // Build VHTLC to verify address
    vhtlcAddress, _, vhtlcOpts, err := h.getVHTLC(
        ctx,
        nil,               // Fulmine as receiver (derived from h.publicKey)
        senderPubkey,      // Boltz as sender
        gotPreimageHash,
        arklib.AbsoluteLocktime(swap.TimeoutBlockHeights.RefundLocktime),
        parseLocktime(swap.TimeoutBlockHeights.UnilateralClaim),
        parseLocktime(swap.TimeoutBlockHeights.UnilateralRefund),
        parseLocktime(swap.TimeoutBlockHeights.UnilateralRefundWithoutReceiver),
    )

    // Verify Boltz provided correct address
    if swap.LockupAddress != vhtlcAddress {
        return Swap{}, fmt.Errorf("boltz is trying to scam us, vHTLCs do not match")
    }
```

### Step 4: Start Background Claim Process

```go
    // pkg/swap/swap.go:918-938
    // Decode invoice for expiry time
    inv, err := decodepay.Decodepay(swap.Invoice)

    // Return swap details immediately, claim in background
    go func(swapDetails Swap) {
        if reedeemTxId, err := h.waitAndClaim(
            inv.Expiry, swapDetails.Id, preimage, vhtlcOpts,
        ); err != nil {
            swapDetails.Status = SwapFailed
            log.WithError(err).Error("failed to claim VHTLC")
        } else {
            swapDetails.RedeemTxid = reedeemTxId
            swapDetails.Status = SwapSuccess
        }

        // Callback to update persistent storage
        if err := postProcess(swapDetails); err != nil {
            log.WithError(err).Error("failed to post process swap")
        }
    }(swapDetails)

    return swapDetails, nil  // Return with pending status
```

## Wait and Claim Process

```go
// pkg/swap/swap.go:1012-1076
func (h *SwapHandler) waitAndClaim(
    invoiceExpiry int, swapId string, preimage []byte, vhtlcOpts *vhtlc.Opts,
) (string, error) {
    // Set timeout to 2x invoice expiry
    expiryDuration := time.Duration(invoiceExpiry) * time.Second
    ctx, cancel := context.WithTimeout(context.Background(), expiryDuration*2)
    defer cancel()

    // Subscribe to swap updates
    ws := h.boltzSvc.NewWebsocket()
    defer ws.Close()
    err := ws.ConnectAndSubscribe(ctx, []string{swapId}, 5*time.Second)

    var txid string
    for {
        select {
        case update, ok := <-ws.Updates:
            if !ok {
                // Reconnect on disconnect
                nextWs := h.boltzSvc.NewWebsocket()
                nextWs.ConnectAndSubscribe(ctx, []string{swapId}, 5*time.Second)
                ws = nextWs
                continue
            }

            parsedStatus := boltz.ParseEvent(update.Status)

            switch parsedStatus {
            case boltz.TransactionMempool:
                // Boltz funded VHTLC - time to claim!
                interval := 200 * time.Millisecond
                log.Debug("claiming VHTLC with preimage...")

                // Retry claiming until VTXO appears
                if err := retry(ctx, interval, func(ctx context.Context) (bool, error) {
                    txid, err = h.ClaimVHTLC(ctx, preimage, *vhtlcOpts)
                    if err != nil {
                        if errors.Is(err, ErrorNoVtxosFound) {
                            return false, nil  // VTXO not visible yet, retry
                        }
                        return false, err
                    }
                    return true, nil
                }); err != nil {
                    return "", err
                }
                log.Debugf("successfully claimed VHTLC with tx: %s", txid)
                return txid, nil

            case boltz.InvoiceFailedToPay, boltz.TransactionFailed, boltz.TransactionLockupFailed:
                // Invoice wasn't paid - nothing to claim
                return "", fmt.Errorf("failed to receive payment: %s", update.Status)
            }

        case <-ctx.Done():
            return "", fmt.Errorf("timed out waiting for boltz to detect payment")
        }
    }
}
```

## Claiming the VHTLC

### Off-chain Claim (via Ark TX)

```go
// pkg/swap/swap.go:167-307 (ClaimVHTLC)
func (h *SwapHandler) ClaimVHTLC(
    ctx context.Context, preimage []byte, vhtlcOpts vhtlc.Opts,
) (string, error) {
    vHTLC, err := vhtlc.NewVHTLCScriptFromOpts(vhtlcOpts)

    // Query VHTLC VTXOs from indexer
    vtxos, err := h.getVHTLCFunds(ctx, []*vhtlc.VHTLCScript{vHTLC})
    if len(vtxos) == 0 {
        return "", ErrorNoVtxosFound
    }

    vtxo := &vtxos[0]

    // If VTXO is recoverable (can be swept), use batch settlement
    if vtxo.IsRecoverable() && vtxo.Amount >= h.config.Dust {
        txid, err := h.SettleVHTLCWithClaimPath(ctx, vhtlcOpts, preimage)
        log.Infof("recoverable vhtlc settled with claim path: %s", txid)
        return txid, nil
    }

    // Build claim transaction
    myAddr, err := h.arkClient.NewOffchainAddress(ctx)
    decodedAddr, err := arklib.DecodeAddressV0(myAddr)
    pkScript, err := script.P2TRScript(decodedAddr.VtxoTapKey)

    claimTapscript, err := vHTLC.ClaimTapscript()

    arkTx, checkpoints, err := offchain.BuildTxs(
        []offchain.VtxoInput{{
            RevealedTapscripts: vHTLC.GetRevealedTapscripts(),
            Outpoint:           vtxoOutpoint,
            Amount:             amount,
            Tapscript:          claimTapscript,
        }},
        []*wire.TxOut{{Value: amount, PkScript: pkScript}},
        checkpointExitScript(h.config),
    )

    // Sign transaction with preimage in witness
    signTransaction := func(tx *psbt.Packet) (string, error) {
        // Add the preimage to the checkpoint input
        if err := txutils.SetArkPsbtField(
            tx, 0, txutils.ConditionWitnessField, wire.TxWitness{preimage},
        ); err != nil {
            return "", err
        }
        return h.arkClient.SignTransaction(ctx, encoded)
    }

    signedArkTx, err := signTransaction(arkTx)

    // Submit to ASP
    arkTxid, finalArkTx, signedCheckpoints, err := h.transportClient.SubmitTx(
        ctx, signedArkTx, checkpointTxs)

    // Verify ASP signature
    if err := verifyFinalArkTx(
        finalArkTx, h.config.SignerPubKey, getInputTapLeaves(arkTx),
    ); err != nil {
        return "", err
    }

    // Finalize
    err = h.transportClient.FinalizeTx(ctx, arkTxid, finalCheckpoints)
    return arkTxid, nil
}
```

### Batch Settlement Claim

```go
// pkg/swap/swap.go:521-578 (SettleVHTLCWithClaimPath)
func (h *SwapHandler) SettleVHTLCWithClaimPath(
    ctx context.Context, vhtlcOpts vhtlc.Opts, preimage []byte,
) (string, error) {
    // Validate preimage
    if err := validatePreimage(preimage, vhtlcOpts.PreimageHash); err != nil {
        return "", err
    }

    session, err := h.getBatchSessionArgs(ctx, vhtlcOpts, nil)

    // Build claim intent
    proof, message, err := getClaimIntent(session, preimage)
    signedProof, err := h.arkClient.SignTransaction(ctx, proof)

    // Register intent with ASP
    intentID, err := h.transportClient.RegisterIntent(ctx, signedProof, message)

    // Setup batch session handler
    topics := getEventTopics(session.vtxos, session.signerSession.GetPublicKey())
    eventsCh, cancel, err := h.transportClient.GetEventStream(ctx, topics)
    defer cancel()

    claimHandler, err := newClaimBatchSessionHandler(
        h.arkClient, h.transportClient,
        intentID, session.vtxos,
        []types.Receiver{{To: session.destinationAddr, Amount: session.totalAmount}},
        preimage,
        map[string]*vhtlc.VHTLCScript{session.vtxos[0].Script: session.vhtlcScript},
        h.config, session.signerSession,
    )

    // Join batch session (participate in round)
    txid, err := arksdk.JoinBatchSession(ctx, eventsCh, claimHandler)
    log.Debugf("successfully claimed VHTLC in round %s", txid)
    return txid, nil
}
```

## Key Participants in Reverse Swap

| Role | Who | Keys |
|------|-----|------|
| Sender | Boltz | `swap.RefundPublicKey` |
| Receiver | Fulmine user | `h.publicKey` |
| Server | ASP | `h.config.SignerPubKey` |

## Preimage Handling

### Generation

```go
// Fulmine generates random 32-byte preimage
preimage := make([]byte, 32)
rand.Read(preimage)
```

### Hashing

```go
// For Boltz API: provide SHA256 hash
buf := sha256.Sum256(preimage)
preimageHashSHA256 := hex.EncodeToString(buf[:])

// For VHTLC: use RIPEMD160(SHA256(preimage))
preimageHash160 := input.Ripemd160H(buf[:])
```

### Revealing

The preimage is revealed when claiming:

```go
// In the witness stack
txutils.SetArkPsbtField(tx, 0, txutils.ConditionWitnessField, wire.TxWitness{preimage})
```

## Status Events for Reverse Swap

| Event | Meaning | Action |
|-------|---------|--------|
| `TransactionMempool` | Boltz funded VHTLC | Claim with preimage |
| `InvoiceFailedToPay` | Invoice not paid | Nothing to claim |
| `TransactionFailed` | Boltz couldn't fund | Nothing to claim |
| `TransactionClaimed` | Fulmine claimed | Success |

## Error Handling

### VTXO Not Yet Visible

```go
// Retry claiming until indexer sees the VTXO
if err := retry(ctx, 200*time.Millisecond, func(ctx context.Context) (bool, error) {
    txid, err = h.ClaimVHTLC(ctx, preimage, *vhtlcOpts)
    if errors.Is(err, ErrorNoVtxosFound) {
        return false, nil  // Retry
    }
    return true, nil
}); err != nil {
    return "", err
}
```

### Timeout Waiting for Payment

```go
case <-ctx.Done():
    return "", fmt.Errorf("timed out waiting for boltz to detect payment")
```

## Limits Checking

```go
// pkg/boltz/boltz.go:20-29
func (boltz *Api) CreateReverseSwap(request CreateReverseSwapRequest) (*CreateReverseSwapResponse, error) {
    // Check swap limits before creating
    limits, err := sendGetRequest[GetSwapLimitsResponse](boltz, "/swap/submarine")

    if limits.Ark.Btc.Limits.Minimal > int(request.InvoiceAmount) ||
       limits.Ark.Btc.Limits.Maximal < int(request.InvoiceAmount) {
        return nil, fmt.Errorf("out of limits: invoice amount %d must be between %d and %d",
            request.InvoiceAmount, limits.Ark.Btc.Limits.Minimal, limits.Ark.Btc.Limits.Maximal)
    }

    resp, err := sendPostRequest[CreateReverseSwapResponse](boltz, "/swap/reverse", request)
    return resp, nil
}
```

## Success Path

1. Fulmine generates preimage
2. Create reverse swap with Boltz → get invoice
3. Payer pays Lightning invoice
4. Boltz receives Lightning payment
5. Boltz funds VHTLC with ARK
6. Status: `TransactionMempool`
7. Fulmine claims VHTLC with preimage
8. Status: `SwapSuccess`

## Failure Paths

### Invoice Not Paid
1. Invoice expires
2. Status: `InvoiceFailedToPay`
3. Return `SwapFailed` - nothing to refund (Boltz never funded)

### Boltz Funding Fails
1. Status: `TransactionFailed` or `TransactionLockupFailed`
2. Return error - nothing to claim

### Claim Timeout
1. Context deadline exceeded
2. VHTLC may still be claimable later (if funded)
3. Return `SwapFailed` with timeout error

## Differences from Submarine Swap

| Aspect | Submarine | Reverse |
|--------|-----------|---------|
| Direction | ARK → Lightning | Lightning → ARK |
| Who knows preimage | Payer (external) | Fulmine |
| Who funds VHTLC | Fulmine | Boltz |
| Who claims VHTLC | Boltz | Fulmine |
| Refund on failure | Fulmine refunds | Boltz refunds (no action needed) |

## Related Skills

- `fulmine-vhtlc` - VHTLC construction
- `fulmine-submarine-swap` - ARK → Lightning swaps
- `ark-sdk-batch-session` - Batch settlement for claims
