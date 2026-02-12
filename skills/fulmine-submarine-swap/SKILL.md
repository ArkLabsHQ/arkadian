# Fulmine Submarine Swap (ARK → Lightning)

## Overview

A submarine swap allows Fulmine users to send payments to Lightning Network invoices using their ARK funds. The user locks funds in a VHTLC that Boltz can claim once the Lightning invoice is paid.

## Flow Diagram

```
1. User has Lightning invoice to pay
2. Fulmine creates submarine swap with Boltz
3. Boltz provides VHTLC parameters and address
4. Fulmine funds VHTLC with ARK VTXOs
5. Boltz detects funding, pays Lightning invoice
6. Boltz claims VHTLC with preimage from paid invoice

If payment fails:
7. Boltz co-signs refund (collaborative) OR
8. User waits for timelock and refunds unilaterally
```

## Key Files

| File | Purpose |
|------|---------|
| `pkg/swap/swap.go` | Main SwapHandler, submarineSwap() |
| `pkg/boltz/boltz.go` | Boltz API client |
| `pkg/boltz/types.go` | API request/response types |
| `pkg/boltz/ws.go` | Websocket for swap updates |
| `pkg/boltz/status.go` | Swap status event types |
| `internal/core/domain/swap.go` | Domain model |

## PayInvoice Entry Point

```go
// pkg/swap/swap.go:97-105
func (h *SwapHandler) PayInvoice(
    ctx context.Context, invoice string, unilateralRefund func(swap Swap) error,
) (*Swap, error) {
    if len(invoice) <= 0 {
        return nil, fmt.Errorf("missing invoice")
    }

    return h.submarineSwap(ctx, invoice, unilateralRefund)
}
```

## PayOffer for BOLT12

```go
// pkg/swap/swap.go:107-139
func (h *SwapHandler) PayOffer(
    ctx context.Context, offer string, lightningUrl string, unilateralRefund func(swap Swap) error,
) (*Swap, error) {
    // Decode the offer to get the amount
    decodedOffer, err := DecodeBolt12Offer(offer)
    amountInSats := decodedOffer.AmountInSats
    if amountInSats == 0 {
        return nil, fmt.Errorf("offer amount must be greater than 0")
    }

    // Fetch invoice from offer
    boltzApi := h.boltzSvc
    if lightningUrl != "" {
        boltzApi = &boltz.Api{URL: lightningUrl}
    }

    response, err := boltzApi.FetchBolt12Invoice(boltz.FetchBolt12InvoiceRequest{
        Offer:  offer,
        Amount: amountInSats,
        Note:   decodedOffer.DescriptionStr,
    })

    return h.submarineSwap(ctx, response.Invoice, unilateralRefund)
}
```

## Submarine Swap Implementation

### Step 1: Decode Invoice & Get Preimage Hash

```go
// pkg/swap/swap.go:692-718
func (h *SwapHandler) submarineSwap(
    ctx context.Context, invoice string, unilateralRefund func(swap Swap) error,
) (*Swap, error) {
    var preimageHash []byte

    // Handle BOLT12 vs BOLT11
    if IsBolt12Invoice(invoice) {
        decodedInvoice, err := DecodeBolt12Invoice(invoice)
        preimageHash = decodedInvoice.PaymentHash160
    } else {
        _, hash, err := decodeInvoice(invoice)
        preimageHash = hash
    }
```

### Step 2: Create Swap with Boltz

```go
    // pkg/swap/swap.go:720-729
    swap, err := h.boltzSvc.CreateSwap(boltz.CreateSwapRequest{
        From:            boltz.CurrencyArk,
        To:              boltz.CurrencyBtc,
        Invoice:         invoice,
        RefundPublicKey: hex.EncodeToString(h.publicKey.SerializeCompressed()),
        PaymentTimeout:  h.timeout,
    })
```

### Boltz API Request/Response

```go
// pkg/boltz/types.go:31-48
type CreateSwapRequest struct {
    From            Currency `json:"from"`      // "ARK"
    To              Currency `json:"to"`        // "BTC"
    RefundPublicKey string   `json:"refundPublicKey"`
    Invoice         string   `json:"invoice,omitempty"`
    PaymentTimeout  uint32   `json:"paymentTimeout,omitempty"`
}

type CreateSwapResponse struct {
    Id                  string              `json:"id"`
    Address             string              `json:"address"`      // VHTLC address
    AcceptZeroConf      bool                `json:"acceptZeroConf"`
    ExpectedAmount      uint64              `json:"expectedAmount"`
    ClaimPublicKey      string              `json:"claimPublicKey"`  // Boltz's key
    TimeoutBlockHeights TimeoutBlockHeights `json:"timeoutBlockHeights"`
    Error               string              `json:"error"`
}

type TimeoutBlockHeights struct {
    RefundLocktime                  uint32 `json:"refund"`
    UnilateralClaim                 uint32 `json:"unilateralClaim"`
    UnilateralRefund                uint32 `json:"unilateralRefund"`
    UnilateralRefundWithoutReceiver uint32 `json:"unilateralRefundWithoutReceiver"`
}
```

### Step 3: Build and Verify VHTLC

```go
    // pkg/swap/swap.go:731-751
    receiverPubkey, err := parsePubkey(swap.ClaimPublicKey)

    // Build VHTLC to verify Boltz isn't cheating
    vhtlcAddress, _, vhtlcOpts, err := h.getVHTLC(
        ctx,
        receiverPubkey,    // Boltz as receiver (will claim)
        nil,               // Fulmine as sender (derived from h.publicKey)
        preimageHash,
        arklib.AbsoluteLocktime(swap.TimeoutBlockHeights.RefundLocktime),
        parseLocktime(swap.TimeoutBlockHeights.UnilateralClaim),
        parseLocktime(swap.TimeoutBlockHeights.UnilateralRefund),
        parseLocktime(swap.TimeoutBlockHeights.UnilateralRefundWithoutReceiver),
    )

    // Verify address matches what Boltz provided
    if swap.Address != vhtlcAddress {
        return nil, fmt.Errorf("boltz is trying to scam us, vHTLCs do not match")
    }
```

### Step 4: Subscribe to Swap Updates

```go
    // pkg/swap/swap.go:753-757
    ws := h.boltzSvc.NewWebsocket()
    if err := ws.ConnectAndSubscribe(ctx, []string{swap.Id}, 5*time.Second); err != nil {
        return nil, err
    }
```

### Step 5: Fund the VHTLC

```go
    // pkg/swap/swap.go:758-774
    receivers := []types.Receiver{{To: swap.Address, Amount: swap.ExpectedAmount}}
    var txid string
    for range 3 {  // Retry up to 3 times
        txid, err = h.arkClient.SendOffChain(ctx, receivers)
        if err != nil {
            if strings.Contains(strings.ToLower(err.Error()), "vtxo_already_spent") {
                continue  // Retry on VTXO conflict
            }
            return nil, fmt.Errorf("failed to pay to vHTLC address: %v", err)
        }
        break
    }
```

### Step 6: Wait for Swap Status Updates

```go
    // pkg/swap/swap.go:793-843
    for {
        select {
        case update, ok := <-ws.Updates:
            if !ok {
                // Reconnect websocket on disconnect
                nextWs := h.boltzSvc.NewWebsocket()
                nextWs.ConnectAndSubscribe(ctx, []string{swap.Id}, 5*time.Second)
                ws = nextWs
                continue
            }

            switch boltz.ParseEvent(update.Status) {
            case boltz.TransactionLockupFailed, boltz.InvoiceFailedToPay:
                // Payment failed - refund
                swapDetails.Status = SwapFailed
                withReceiver := true

                txid, err := h.RefundSwap(context.Background(),
                    SwapTypeSubmarine, swap.Id, withReceiver, *vhtlcOpts)
                if err != nil {
                    // Collaborative refund failed - schedule unilateral
                    go func() {
                        if err := unilateralRefund(*swapDetails); err != nil {
                            log.WithError(err).Errorf(
                                "failed to refund swap %s unilaterally", swap.Id)
                        }
                    }()
                }
                swapDetails.RedeemTxid = txid
                return swapDetails, nil

            case boltz.TransactionClaimed, boltz.InvoiceSettled:
                // Success! Boltz claimed with preimage
                swapDetails.Status = SwapSuccess
                return swapDetails, nil
            }

        case <-ctx.Done():
            // Timeout - trigger unilateral refund
            swapDetails.Status = SwapFailed
            go func() {
                if err := unilateralRefund(*swapDetails); err != nil {
                    log.WithError(err).Errorf("failed to refund swap %s", swap.Id)
                }
            }()
            return swapDetails, nil
        }
    }
```

## Swap Status Events

```go
// pkg/boltz/status.go:3-30
type SwapUpdateEvent int

const (
    SwapCreated SwapUpdateEvent = iota
    SwapExpired
    InvoiceSet
    InvoicePaid
    InvoicePending
    InvoiceSettled         // Success - invoice paid
    InvoiceFailedToPay     // Failure - need refund
    TransactionFailed
    TransactionMempool
    TransactionClaimed     // Success - Boltz claimed VHTLC
    TransactionRefunded
    TransactionConfirmed
    TransactionLockupFailed // Failure - need refund
    TransactionClaimPending
    // ...
)

var swapUpdateEventStrings = map[string]SwapUpdateEvent{
    "invoice.settled":          InvoiceSettled,
    "invoice.failedToPay":      InvoiceFailedToPay,
    "transaction.claimed":      TransactionClaimed,
    "transaction.lockupFailed": TransactionLockupFailed,
    // ...
}
```

## Refunding Failed Swaps

### Collaborative Refund (with Boltz)

```go
// pkg/swap/swap.go:309-519 (RefundSwap)
func (h *SwapHandler) RefundSwap(
    ctx context.Context, swapType, swapId string, withReceiver bool, vhtlcOpts vhtlc.Opts,
) (string, error) {
    vhtlcScript, err := vhtlc.NewVHTLCScriptFromOpts(vhtlcOpts)

    vtxos, err := h.getVHTLCFunds(ctx, []*vhtlc.VHTLCScript{vhtlcScript})

    // If VTXO is recoverable, use batch settlement
    if vtxo.IsRecoverable() && vtxo.Amount >= h.config.Dust {
        return h.SettleVhtlcWithRefundPath(ctx, vhtlcOpts)
    }

    // Build refund transaction
    refundTapscript, err := vhtlcScript.RefundTapscript(withReceiver)

    refundTx, checkpointPtxs, err := offchain.BuildTxs(
        []offchain.VtxoInput{{
            RevealedTapscripts: vhtlcScript.GetRevealedTapscripts(),
            Outpoint:           vtxoOutpoint,
            Amount:             amount,
            Tapscript:          refundTapscript,
        }},
        []*wire.TxOut{{Value: amount, PkScript: dest}},
        checkpointExitScript(h.config),
    )

    // User signs
    signedRefundTx, err := signTransaction(refundTx)
    signedCheckpointTx, err := signTransaction(checkpointPtxs[0])

    // If withReceiver, get Boltz to co-sign
    if withReceiver {
        boltzSignedRefundPtx, boltzSignedCheckpointPtx, err := h.collaborativeRefund(
            swapType, swapId, unsignedRefundTx, unsignedCheckpointTx)
        // Merge Boltz signatures into PSBTs
    }

    // Submit to ASP
    arkTxid, finalRefundTx, serverSignedCheckpoints, err := h.transportClient.SubmitTx(
        ctx, signedRefund, []string{unsignedCheckpointTx})

    err = h.transportClient.FinalizeTx(ctx, arkTxid, finalCheckpoints)
    return arkTxid, nil
}
```

### Boltz Refund API

```go
// pkg/boltz/boltz.go:79-90
func (boltz *Api) RefundSubmarine(swapId string, request RefundSwapRequest) (*RefundSwapResponse, error) {
    url := fmt.Sprintf("/swap/submarine/%s/refund/ark", swapId)
    resp, err := sendPostRequest[RefundSwapResponse](boltz, url, request)
    return resp, nil
}

// pkg/boltz/types.go:94-103
type RefundSwapRequest struct {
    Transaction string `json:"transaction"`  // Unsigned refund PSBT
    Checkpoint  string `json:"checkpoint"`   // Unsigned checkpoint PSBT
}

type RefundSwapResponse struct {
    Transaction string `json:"transaction"`  // Boltz-signed refund PSBT
    Checkpoint  string `json:"checkpoint"`   // Boltz-signed checkpoint PSBT
    Error       string `json:"error"`
}
```

## Domain Model

```go
// internal/core/domain/swap.go:9-36
type SwapStatus int

const (
    SwapPending SwapStatus = iota
    SwapFailed
    SwapSuccess
)

type SwapType int

const (
    SwapRegular SwapType = iota  // Submarine swap
    SwapPayment                   // Direct payment
)

type Swap struct {
    Id          string
    Amount      uint64
    Timestamp   int64
    To          boltz.Currency  // "BTC" for submarine
    From        boltz.Currency  // "ARK" for submarine
    Status      SwapStatus
    Type        SwapType
    Invoice     string
    Vhtlc       Vhtlc
    FundingTxId string  // Txid that funded VHTLC
    RedeemTxId  string  // Txid of claim or refund
}
```

## Websocket Connection

```go
// pkg/boltz/ws.go:56-70
func (boltz *Api) NewWebsocket() *Websocket {
    httpTransport, ok := boltz.Client.Transport.(*http.Transport)

    dialer := *websocket.DefaultDialer
    if ok {
        dialer.Proxy = httpTransport.Proxy
    }

    return &Websocket{
        apiUrl:        boltz.WSURL,
        subscriptions: make(chan bool),
        dialer:        &dialer,
        Updates:       make(chan SwapUpdate),
    }
}

// pkg/boltz/ws.go:233-259
func (boltz *Websocket) ConnectAndSubscribe(
    ctx context.Context, swapIds []string, retryInterval time.Duration,
) error {
    // Connect with retry
    err := Retry(ctx, retryInterval, func(ctx context.Context) (bool, error) {
        err := boltz.Connect()
        return err == nil, nil
    })

    // Subscribe with retry
    err = Retry(ctx, retryInterval, func(ctx context.Context) (bool, error) {
        err = boltz.Subscribe(swapIds)
        return err == nil, nil
    })

    return nil
}
```

## Error Handling

### VTXO Already Spent

```go
// Retry funding if VTXO spent (race condition)
for range 3 {
    txid, err = h.arkClient.SendOffChain(ctx, receivers)
    if strings.Contains(strings.ToLower(err.Error()), "vtxo_already_spent") {
        continue
    }
    break
}
```

### Websocket Reconnection

```go
case update, ok := <-ws.Updates:
    if !ok {
        // Channel closed - reconnect
        oldWs := ws
        nextWs := h.boltzSvc.NewWebsocket()
        nextWs.ConnectAndSubscribe(ctx, []string{swap.Id}, 5*time.Second)
        _ = oldWs.Close()
        ws = nextWs
        continue
    }
```

### Refund Fallback

```go
// Try collaborative first
txid, err := h.RefundSwap(context.Background(), SwapTypeSubmarine, swap.Id, withReceiver, *vhtlcOpts)
if err != nil {
    // Collaborative failed - schedule unilateral (async)
    go func() {
        if err := unilateralRefund(*swapDetails); err != nil {
            log.WithError(err).Errorf("failed to refund swap %s unilaterally", swap.Id)
        }
    }()
}
```

## Key Participants in Submarine Swap

| Role | Who | Keys |
|------|-----|------|
| Sender | Fulmine user | `h.publicKey` |
| Receiver | Boltz | `swap.ClaimPublicKey` |
| Server | ASP | `h.config.SignerPubKey` |

## Success Path

1. Invoice decoded → preimage hash extracted
2. Swap created with Boltz → get VHTLC address
3. VHTLC verified → addresses match
4. VHTLC funded via `SendOffChain()`
5. Boltz detects funding → pays Lightning invoice
6. Boltz receives preimage → claims VHTLC
7. Status: `TransactionClaimed` or `InvoiceSettled`

## Failure Paths

### Invoice Payment Fails
1. Status: `InvoiceFailedToPay` or `TransactionLockupFailed`
2. Try collaborative refund (Boltz co-signs)
3. If fails → schedule unilateral refund (wait for timelock)

### Timeout
1. Context deadline exceeded
2. Schedule unilateral refund callback
3. Return with `SwapFailed` status

## Related Skills

- `fulmine-vhtlc` - VHTLC construction for swaps
- `fulmine-reverse-swap` - Lightning → ARK swaps
- `ark-sdk-payments` - SendOffChain() for funding
