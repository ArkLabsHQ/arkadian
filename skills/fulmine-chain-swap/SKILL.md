# Fulmine Chain Swap (ARK ↔ BTC On-Chain)

## Overview

Chain swaps enable atomic swaps between ARK VTXOs and on-chain Bitcoin UTXOs. Unlike submarine swaps (which use Lightning), chain swaps work directly between ARK and Bitcoin mainnet.

## Two Directions

| Direction | User Sends | User Receives | Entry Point |
|-----------|------------|---------------|-------------|
| ARK → BTC | ARK VTXO (via VHTLC) | BTC UTXO | `ChainSwapArkToBtc()` |
| BTC → ARK | BTC UTXO | ARK VTXO (from VHTLC) | `ChainSwapBtcToArk()` |

## Key Files

| File | Purpose |
|------|---------|
| `pkg/swap/chainswap.go` | ChainSwap model, state machine, entry points |
| `pkg/swap/chainswap_arkt_btc_handler.go` | ARK→BTC handler (claims BTC) |
| `pkg/swap/chainswap_btc_ark_handler.go` | BTC→ARK handler (claims ARK) |
| `pkg/swap/chainswap_monitor.go` | Websocket event monitor |
| `pkg/swap/chainswap_validate.go` | Validation for BTC HTLC and VHTLC |
| `internal/core/domain/chainswap.go` | Domain model |

## ChainSwap Model

```go
// pkg/swap/chainswap.go:38-59
type ChainSwap struct {
    Id       string
    Amount   uint64
    Preimage []byte

    UserBtcLockupAddress string  // For BTC→ARK: where user sends BTC

    VhtlcOpts vhtlc.Opts

    UserLockTxid   string  // Transaction where user locked funds
    ServerLockTxid string  // Transaction where Boltz locked funds
    ClaimTxid      string  // Transaction claiming the swap
    RefundTxid     string  // Transaction refunding failed swap

    Timestamp int64
    Status    ChainSwapStatus
    Error     string

    onEvent ChainSwapEventCallback  // Event handler
}
```

## Status State Machine

```go
// pkg/swap/chainswap.go:20-36
type ChainSwapStatus int

const (
    // Pending states
    ChainSwapPending ChainSwapStatus = iota  // Created
    ChainSwapUserLocked                       // User locked funds
    ChainSwapServerLocked                     // Boltz locked funds

    // Success states
    ChainSwapClaimed                          // Successfully claimed

    // Failed states
    ChainSwapUserLockedFailed                 // User lockup failed
    ChainSwapFailed                           // General failure
    ChainSwapRefundFailed                     // Refund failed
    ChainSwapRefunded                         // Successfully refunded
)
```

## Domain Events

```go
// pkg/swap/chainswap.go:180-240

type ChainSwapEvent interface {
    isChainSwapEvent()
}

type UserLockEvent struct {
    SwapID string
    TxID   string
}

type ServerLockEvent struct {
    SwapID string
    TxID   string
}

type ClaimEvent struct {
    SwapID string
    TxID   string
}

type RefundEvent struct {
    SwapID string
    TxID   string
}

type FailEvent struct {
    SwapID string
    Error  string
}

type ChainSwapEventCallback func(event ChainSwapEvent)
```

---

## ARK → BTC Chain Swap

### Flow

```
1. Generate preimage
2. Create swap with Boltz (ARK→BTC)
3. Validate BTC claim script
4. Validate VHTLC address
5. Fund VHTLC with ARK (user lock)
6. Wait for Boltz to lock BTC
7. Claim BTC (cooperative MuSig2 or script-path)
```

### Entry Point

```go
// pkg/swap/chainswap.go:301-394
func (h *SwapHandler) ChainSwapArkToBtc(
    ctx context.Context,
    amount uint64,
    btcDestinationAddress string,
    network *chaincfg.Params,
    eventCallback ChainSwapEventCallback,
    unilateralRefundCallback func(swapId string, opts vhtlc.Opts) error,
) (*ChainSwap, error) {
    var (
        arkToBtc           = true
        btcClaimPrivKey    = h.privateKey      // User claims BTC with this
        vhtlcRefundPrivKey = h.privateKey      // User refunds VHTLC with this
    )

    // Generate preimage (user knows this)
    preimage, preimageHashSHA256, preimageHashHASH160, err := genPreimageInfo()
```

### Create Swap Request

```go
    createReq := boltz.CreateChainSwapRequest{
        From:            boltz.CurrencyArk,
        To:              boltz.CurrencyBtc,
        PreimageHash:    hex.EncodeToString(preimageHashSHA256[:]),
        ClaimPublicKey:  hex.EncodeToString(btcClaimPubKey.SerializeCompressed()),
        RefundPublicKey: hex.EncodeToString(vhtlcRefundPubKey.SerializeCompressed()),
        UserLockAmount:  amount,
    }

    swapResp, err := h.boltzSvc.CreateChainSwap(createReq)
```

### Response Structure

```go
// pkg/boltz/types.go:182-187
type CreateChainSwapResponse struct {
    Id            string  `json:"id"`
    ClaimDetails  SwapLeg `json:"claimDetails"`   // BTC lockup (user claims)
    LockupDetails SwapLeg `json:"lockupDetails"`  // ARK VHTLC (user funds)
    Error         string  `json:"error,omitempty"`
}

type SwapLeg struct {
    ServerPublicKey    string       `json:"serverPublicKey"`
    Amount             int          `json:"amount"`
    LockupAddress      string       `json:"lockupAddress"`
    TimeoutBlockHeight int          `json:"timeoutBlockHeight"`
    SwapTree           *SwapTree    `json:"swapTree,omitempty"`     // BTC-specific
    Timeouts           *ArkTimeouts `json:"timeouts,omitempty"`     // ARK-specific
}
```

### Validation Steps

```go
    // 1. Validate BTC claim script
    if err := validateBtcClaimOrRefundPossible(
        swapResp.GetSwapTree(arkToBtc),
        arkToBtc,
        swapResp.ClaimDetails.ServerPublicKey,
        btcClaimPubKey,
        preimageHashHASH160,
        nil, 0,
    ); err != nil {
        return nil, fmt.Errorf("invalid HTLC: %w", err)
    }

    // 2. Validate VHTLC address
    vhtlcOpts, err := validateVHTLC(ctx, h, arkToBtc, swapResp, preimageHashHASH160)

    // 3. Validate BTC lockup address
    if err := validateBtcLockupAddress(
        network,
        swapResp.ClaimDetails.LockupAddress,
        swapResp.ClaimDetails.ServerPublicKey,
        btcClaimPrivKey.PubKey(),
        swapResp.GetSwapTree(arkToBtc),
    ); err != nil {
        return nil, fmt.Errorf("BTC lockup address validation failed: %w", err)
    }
```

### ARK→BTC Event Handling

```go
// pkg/swap/chainswap_arkt_btc_handler.go:58-93

// On swap created → Fund VHTLC immediately
func (h *arkToBtcHandler) handleArkToBtcSwapCreated(ctx context.Context, _ boltz.SwapUpdate) error {
    receivers := []types.Receiver{{
        To:     h.swapResp.LockupDetails.LockupAddress,
        Amount: h.chainSwapState.Swap.Amount,
    }}

    txId, err := h.swapHandler.arkClient.SendOffChain(ctx, receivers)
    h.userLockupTxid = txId
    return nil
}

// On server locked (confirmed) → Claim BTC
func (h *arkToBtcHandler) handleArkToBtcServerLocked(ctx context.Context, update boltz.SwapUpdate) error {
    if status == boltz.TransactionServerMempoool {
        h.chainSwapState.Swap.ServerLock(update.Transaction.Id)
        return nil  // Wait for confirmation
    }

    // Boltz locked BTC, claim it
    claimTxid, err := h.claimBtcLockup(
        ctx, h.chainSwapState.SwapID, h.preimage, h.btcClaimPrivKey,
        h.btcDestinationAddress, h.network, h.swapTree, h.boltzClaimPubKey,
        serverLockupTxHex,
    )

    h.chainSwapState.Swap.Claim(claimTxid)
    return nil
}
```

### Claiming BTC Lockup

```go
// pkg/swap/chainswap_arkt_btc_handler.go:214-256

func (h *arkToBtcHandler) claimBtcLockup(...) (string, error) {
    // Try cooperative MuSig2 claim first (smaller witness)
    txid, err := h.claimBtcLockupCooperative(...)
    if err != nil {
        // Fall back to script-path claim (with preimage)
        return h.claimBtcLockupScriptPath(...)
    }
    return txid, nil
}
```

### Cooperative BTC Claim (MuSig2)

```go
// pkg/swap/chainswap_arkt_btc_handler.go:258-366

func (h *arkToBtcHandler) claimBtcLockupCooperative(...) (string, error) {
    // 1. Prepare claim transaction
    setup, err := h.prepareClaimTransaction(...)

    // 2. Create MuSig2 context
    musigCtx, err := NewMuSigContext(claimKey, serverPubKey)
    ourNonce, err := musigCtx.GenerateNonce()

    // 3. Send claim request to Boltz (with preimage and our nonce)
    boltzSigResp, err := h.swapHandler.boltzSvc.SubmitChainSwapClaim(swapId, boltz.ChainSwapClaimRequest{
        Preimage: hex.EncodeToString(preimage),
        ToSign: boltz.ToSign{
            Nonce:   SerializePubNonce(ourNonce),
            ClaimTx: claimTxHex,
            Index:   0,
        },
    })

    // 4. Combine nonces and create partial signature
    boltzNonce, err := ParsePubNonce(boltzSigResp.PubNonce)
    combinedNonce, err := musigCtx.AggregateNonces(boltzNonce)
    ourPartial, err := musigCtx.OurPartialSign(combinedNonce, keys, msg, merkleRoot)

    // 5. Combine partial signatures
    boltzPartial, err := ParsePartialSignatureScalar32(boltzSigResp.PartialSignature)
    finalSig, err := CombineFinalSig(ourPartial.R, []*musig2.PartialSignature{ourPartial, boltzPartial}, ...)

    // 6. Set witness and broadcast
    setup.claimTx.TxIn[0].Witness = [][]byte{finalSig.Serialize()}
    return h.swapHandler.explorerClient.BroadcastTransaction(setup.claimTx)
}
```

### Script-Path BTC Claim (Fallback)

```go
// pkg/swap/chainswap_arkt_btc_handler.go:368-468

func (h *arkToBtcHandler) claimBtcLockupScriptPath(...) (string, error) {
    // 1. Prepare transaction
    setup, err := h.prepareClaimTransaction(...)

    // 2. Create Schnorr signature for script-path
    sigHash, err := txscript.CalcTapscriptSignaturehash(...)
    signature, err := schnorr.Sign(claimKey, sigHash[:])

    // 3. Build witness with preimage
    // Witness format: [signature, preimage, claimScript, controlBlock]
    witness := wire.TxWitness{
        signature.Serialize(),
        preimage,
        claimScript,
        controlBlock,
    }

    setup.claimTx.TxIn[0].Witness = witness
    return h.swapHandler.explorerClient.BroadcastTransaction(setup.claimTx)
}
```

---

## BTC → ARK Chain Swap

### Flow

```
1. Generate preimage
2. Create swap with Boltz (BTC→ARK)
3. Validate BTC refund script
4. Validate VHTLC address
5. Return BTC lockup address to user
6. User sends BTC to lockup address
7. Boltz detects, funds VHTLC
8. Claim VHTLC with preimage
9. Cooperatively sign for Boltz to claim BTC
```

### Entry Point

```go
// pkg/swap/chainswap.go:432-520
func (h *SwapHandler) ChainSwapBtcToArk(
    _ context.Context,
    amount uint64,
    network *chaincfg.Params,
    eventCallback ChainSwapEventCallback,
) (*ChainSwap, error) {
    var (
        arkToBtc    = false
        claimPubKey = h.privateKey.PubKey()  // User claims VHTLC
        refundKey   = h.privateKey           // User refunds BTC if needed
    )

    preimage, preimageHashSHA256, preimageHashHASH160, err := genPreimageInfo()

    createReq := boltz.CreateChainSwapRequest{
        From:            boltz.CurrencyBtc,
        To:              boltz.CurrencyArk,
        PreimageHash:    hex.EncodeToString(preimageHashSHA256[:]),
        ClaimPublicKey:  hex.EncodeToString(claimPubKey.SerializeCompressed()),
        RefundPublicKey: hex.EncodeToString(refundKey.PubKey().SerializeCompressed()),
        UserLockAmount:  amount,
    }

    swapResp, err := h.boltzSvc.CreateChainSwap(createReq)

    // Validate BTC refund possible
    if err := validateBtcClaimOrRefundPossible(
        swapResp.GetSwapTree(arkToBtc),
        arkToBtc, "", nil, nil,
        refundKey.PubKey(),
        uint32(swapResp.LockupDetails.TimeoutBlockHeight),
    ); err != nil {
        return nil, fmt.Errorf("invalid BTC HTLC refund path: %w", err)
    }

    // Return BTC lockup address for user to fund
    chainSwap.UserBtcLockupAddress = swapResp.LockupDetails.LockupAddress
    log.Infof("Please send %d sats to: %s", swapResp.LockupDetails.Amount, chainSwap.UserBtcLockupAddress)
```

### BTC→ARK Event Handling

```go
// pkg/swap/chainswap_btc_ark_handler.go:43-138

// On swap created → Log and wait for user to fund
func (b *btcToArkHandler) handleBtcToArkSwapCreated(_ context.Context, _ boltz.SwapUpdate) error {
    log.Infof("Swap %s created, waiting for user to lock BTC", b.chainSwapState.SwapID)
    return nil
}

// On user locked → Update state
func (b *btcToArkHandler) handleBtcToArkUserLocked(_ context.Context, update boltz.SwapUpdate) error {
    b.chainSwapState.Swap.UserLock(update.Transaction.Id)
    return nil
}

// On server locked (mempool) → Claim VHTLC immediately
func (b *btcToArkHandler) handleBtcToArkServerLocked(ctx context.Context, update boltz.SwapUpdate) error {
    b.chainSwapState.Swap.ServerLock(serverLockupTxID)

    // Claim Ark VTXOs
    claimTxid, err := b.swapHandler.ClaimVHTLC(ctx, b.preimage, b.chainSwapState.Swap.VhtlcOpts)

    b.chainSwapState.Swap.Claim(claimTxid)

    // Cooperatively sign for Boltz to claim user's BTC lockup
    time.Sleep(5 * time.Second)
    if err := b.signBoltzBtcClaim(ctx, b.chainSwapState.SwapID, b.refundKey, b.swapResp); err != nil {
        log.WithError(err).Warnf("Failed to provide cooperative signature (non-critical)")
    }

    return nil
}
```

### Cooperative Signing for Boltz

```go
// pkg/swap/chainswap_btc_ark_handler.go:175-252

func (b *btcToArkHandler) signBoltzBtcClaim(ctx context.Context, swapId string, refundKey *btcec.PrivateKey, swapResp *boltz.CreateChainSwapResponse) error {
    // Get Boltz's claim details
    claimDetails, err := b.swapHandler.boltzSvc.GetChainSwapClaimDetails(swapId)

    // Create MuSig2 context
    boltzPubKey, err := btcec.ParsePubKey(boltzPubKeyBytes)
    musigCtx, err := NewMuSigContext(refundKey, boltzPubKey)
    ourNonce, err := musigCtx.GenerateNonce()

    // Aggregate nonces
    boltzNonce, err := ParsePubNonce(claimDetails.PubNonce)
    combinedNonce, err := musigCtx.AggregateNonces(boltzNonce)

    // Sign
    merkleRoot, err := computeSwapTreeMerkleRoot(swapResp.GetSwapTree(false))
    partialSig, err := musigCtx.OurPartialSign(combinedNonce, keys, msg, merkleRoot)

    // Submit to Boltz
    _, err = b.swapHandler.boltzSvc.SubmitChainSwapClaim(swapId, boltz.ChainSwapClaimRequest{
        Signature: boltz.CrossSignSignature{
            PubNonce:         SerializePubNonce(ourNonce),
            PartialSignature: hex.EncodeToString(partialSig.Encode()),
        },
    })

    return nil
}
```

---

## Quote Mechanism

When user locks different amount than announced:

```go
// pkg/swap/chainswap_btc_ark_handler.go:140-173

func (b *btcToArkHandler) handleBtcToArkFailure(ctx context.Context, update boltz.SwapUpdate, reason string) error {
    if reason == "get_quote" {
        // Fetch updated quote
        quote, err := b.swapHandler.boltzSvc.GetChainSwapQuote(b.chainSwapState.SwapID)

        log.Infof("Quote: amount=%d, onchainAmount=%d", quote.Amount, quote.OnchainAmount)

        // Accept quote to continue swap
        if err := b.swapHandler.boltzSvc.AcceptChainSwapQuote(b.chainSwapState.SwapID, *quote); err != nil {
            b.chainSwapState.Swap.UserLockedFailed(...)
            return err
        }

        return nil  // Wait for Boltz to continue
    }

    // Other failure - attempt refund
    b.chainSwapState.Swap.Fail(reason)
    return nil
}
```

---

## Preimage Generation

```go
// pkg/swap/chainswap.go:522-534
func genPreimageInfo() (preimage []byte, preimageHashSHA256, preimageHashHASH160 []byte, err error) {
    preimage = make([]byte, 32)
    rand.Read(preimage)

    // SHA256 hash (for Boltz API)
    sha := sha256.Sum256(preimage)
    preimageHashSHA256 = sha[:]

    // HASH160 (for VHTLC)
    preimageHashHASH160 = input.Ripemd160H(preimageHashSHA256)

    return
}
```

---

## BTC HTLC Structure

Boltz uses a simple HTLC with two leaves:

```go
// pkg/boltz/types.go:165-173
type SwapTree struct {
    ClaimLeaf  SwapTreeLeaf `json:"claimLeaf"`   // Hash + claim key
    RefundLeaf SwapTreeLeaf `json:"refundLeaf"`  // Timelock + refund key
}

type SwapTreeLeaf struct {
    Version uint8  `json:"version"`  // Tapscript version (0xC0)
    Output  string `json:"output"`   // Hex-encoded script
}
```

**Claim script**: `OP_HASH160 <hash> OP_EQUALVERIFY <claimKey> OP_CHECKSIG`
**Refund script**: `<refundKey> OP_CHECKSIGVERIFY <locktime> OP_CHECKLOCKTIMEVERIFY`

---

## Key Participants

### ARK → BTC

| Role | Who | Purpose |
|------|-----|---------|
| User | Fulmine | Funds VHTLC, claims BTC |
| Boltz | Swap provider | Claims VHTLC, funds BTC |
| ASP | Server | Co-signs VHTLC |

### BTC → ARK

| Role | Who | Purpose |
|------|-----|---------|
| User | Fulmine | Funds BTC, claims VHTLC |
| Boltz | Swap provider | Funds VHTLC, claims BTC |
| ASP | Server | Co-signs VHTLC |

---

## Error Handling

### ARK→BTC Failure

```go
// pkg/swap/chainswap_arkt_btc_handler.go:176-210

func (h *arkToBtcHandler) handleArkToBtcFailure(ctx context.Context, update boltz.SwapUpdate, reason string) error {
    // Try collaborative refund first
    refundTxid, err := h.swapHandler.RefundSwap(
        context.Background(), SwapTypeChain, h.chainSwapState.SwapID, true, h.chainSwapState.Swap.VhtlcOpts,
    )
    if err != nil {
        // Schedule unilateral refund
        if callbackErr := h.chainSwapState.UnilateralRefundCallback(
            h.chainSwapState.SwapID, h.chainSwapState.Swap.VhtlcOpts,
        ); callbackErr != nil {
            h.chainSwapState.Swap.RefundFailed(...)
        }
        return nil
    }

    h.chainSwapState.Swap.Refund(refundTxid)
    return nil
}
```

---

## Related Skills

- `fulmine-vhtlc` - VHTLC construction for chain swaps
- `fulmine-submarine-swap` - Lightning swaps (alternative)
- `ark-musig2-signing` - MuSig2 for BTC claims
- `ark-bitcoin-primitives` - Taproot scripts for BTC HTLCs
