# Fulmine VHTLC (Virtual Hash Time-Locked Contract)

## Overview

VHTLCs are the building block for Lightning-Ark atomic swaps in Fulmine. They enable trustless swaps between Lightning Network and Ark by creating virtual UTXOs with hash-locked and time-locked spending conditions.

## Key Files

| File | Purpose |
|------|---------|
| `pkg/vhtlc/vhtlc.go` | Core VHTLC script construction |
| `pkg/vhtlc/opts.go` | VHTLC options and closure builders |
| `pkg/vhtlc/utils.go` | Script parsing and validation utilities |
| `internal/core/domain/vhtlc.go` | Domain model and repository interface |
| `pkg/swap/swap.go` | SwapHandler that uses VHTLCs |

## VHTLC Architecture

### Participants

```
Sender   - Party sending funds (locks in VHTLC)
Receiver - Party receiving funds (claims with preimage)
Server   - ASP that co-signs collaborative paths
```

### VHTLCScript Structure

```go
// pkg/vhtlc/vhtlc.go:22-36
type VHTLCScript struct {
    script.TapscriptsVtxoScript

    Sender                                 *btcec.PublicKey
    Receiver                               *btcec.PublicKey
    Server                                 *btcec.PublicKey

    // Collaborative paths (require server signature)
    ClaimClosure                           *script.ConditionMultisigClosure
    RefundClosure                          *script.MultisigClosure
    RefundWithoutReceiverClosure           *script.CLTVMultisigClosure

    // Unilateral exit paths (no server required after timelock)
    UnilateralClaimClosure                 *script.ConditionCSVMultisigClosure
    UnilateralRefundClosure                *script.CSVMultisigClosure
    UnilateralRefundWithoutReceiverClosure *script.CSVMultisigClosure

    preimageConditionScript []byte
}
```

### Opts Configuration

```go
// pkg/vhtlc/opts.go:11-20
type Opts struct {
    Sender                               *btcec.PublicKey
    Receiver                             *btcec.PublicKey
    Server                               *btcec.PublicKey
    PreimageHash                         []byte  // Hash160 of preimage
    RefundLocktime                       arklib.AbsoluteLocktime  // CLTV
    UnilateralClaimDelay                 arklib.RelativeLocktime  // CSV
    UnilateralRefundDelay                arklib.RelativeLocktime  // CSV
    UnilateralRefundWithoutReceiverDelay arklib.RelativeLocktime  // CSV
}
```

## Six Spending Paths

### Collaborative Paths (Off-chain)

| Path | Keys Required | Condition |
|------|---------------|-----------|
| **Claim** | Receiver + Server + Preimage | Immediate |
| **Refund** | Sender + Receiver + Server | Immediate |
| **RefundWithoutReceiver** | Sender + Server | After CLTV |

### Unilateral Exit Paths (On-chain)

| Path | Keys Required | Condition |
|------|---------------|-----------|
| **UnilateralClaim** | Receiver + Preimage | After CSV delay |
| **UnilateralRefund** | Sender + Receiver | After CSV delay |
| **UnilateralRefundWithoutReceiver** | Sender only | After longest CSV delay |

## Creating VHTLCs

### From Options

```go
// Create VHTLC from parameters
opts := vhtlc.Opts{
    Sender:                               senderPubkey,
    Receiver:                             receiverPubkey,
    Server:                               h.config.SignerPubKey,
    PreimageHash:                         preimageHash,  // Must be 20 bytes (hash160)
    RefundLocktime:                       arklib.AbsoluteLocktime(blockHeight),
    UnilateralClaimDelay:                 parseLocktime(512),  // Seconds
    UnilateralRefundDelay:                parseLocktime(1024),
    UnilateralRefundWithoutReceiverDelay: parseLocktime(2048),
}

vhtlcScript, err := vhtlc.NewVHTLCScriptFromOpts(opts)
if err != nil {
    return err
}

// Get the Ark address for this VHTLC
address, err := vhtlcScript.Address(h.config.Network.Addr)
```

### From Existing Tapscripts

```go
// Reconstruct VHTLC from revealed tapscript leaves
vhtlcScript, err := vhtlc.NewVhtlcScript(
    preimageHash,
    claimLeafHex,
    refundLeafHex,
    refundWithoutReceiverLeafHex,
    unilateralClaimLeafHex,
    unilateralRefundLeafHex,
    unilateralRefundWithoutReceiverLeafHex,
)
```

## Closure Builders

### Collaborative Closures

```go
// pkg/vhtlc/opts.go:59-83

// Claim: Preimage + (Receiver + Server) multisig
func (o Opts) claimClosure(preimageCondition []byte) *script.ConditionMultisigClosure {
    return &script.ConditionMultisigClosure{
        Condition: preimageCondition,  // OP_HASH160 <hash> OP_EQUAL
        MultisigClosure: script.MultisigClosure{
            PubKeys: []*btcec.PublicKey{o.Receiver, o.Server},
        },
    }
}

// Refund: (Sender + Receiver + Server) 3-of-3 multisig
func (o Opts) refundClosure() *script.MultisigClosure {
    return &script.MultisigClosure{
        PubKeys: []*btcec.PublicKey{o.Sender, o.Receiver, o.Server},
    }
}

// RefundWithoutReceiver: (Sender + Server) after CLTV
func (o Opts) refundWithoutReceiverClosure() *script.CLTVMultisigClosure {
    return &script.CLTVMultisigClosure{
        MultisigClosure: script.MultisigClosure{
            PubKeys: []*btcec.PublicKey{o.Sender, o.Server},
        },
        Locktime: o.RefundLocktime,
    }
}
```

### Unilateral Exit Closures

```go
// pkg/vhtlc/opts.go:85-119

// UnilateralClaim: Preimage + Receiver after CSV
func (o Opts) unilateralClaimClosure(preimageCondition []byte) *script.ConditionCSVMultisigClosure {
    return &script.ConditionCSVMultisigClosure{
        CSVMultisigClosure: script.CSVMultisigClosure{
            MultisigClosure: script.MultisigClosure{
                PubKeys: []*btcec.PublicKey{o.Receiver},
            },
            Locktime: o.UnilateralClaimDelay,
        },
        Condition: preimageCondition,
    }
}

// UnilateralRefund: (Sender + Receiver) after CSV
func (o Opts) unilateralRefundClosure() *script.CSVMultisigClosure {
    return &script.CSVMultisigClosure{
        MultisigClosure: script.MultisigClosure{
            PubKeys: []*btcec.PublicKey{o.Sender, o.Receiver},
        },
        Locktime: o.UnilateralRefundDelay,
    }
}

// UnilateralRefundWithoutReceiver: Sender only after longest CSV
func (o Opts) unilateralRefundWithoutReceiverClosure() *script.CSVMultisigClosure {
    return &script.CSVMultisigClosure{
        MultisigClosure: script.MultisigClosure{
            PubKeys: []*btcec.PublicKey{o.Sender},
        },
        Locktime: o.UnilateralRefundWithoutReceiverDelay,
    }
}
```

## Getting Tapscripts for Spending

### Claim Path Tapscript

```go
// pkg/vhtlc/vhtlc.go:216-244
func (v *VHTLCScript) ClaimTapscript() (*waddrmgr.Tapscript, error) {
    claimScript, err := v.ClaimClosure.Script()
    if err != nil {
        return nil, err
    }

    _, tapTree, err := v.TapTree()
    if err != nil {
        return nil, err
    }

    leafProof, err := tapTree.GetTaprootMerkleProof(
        txscript.NewBaseTapLeaf(claimScript).TapHash(),
    )
    if err != nil {
        return nil, err
    }

    ctrlBlock, err := txscript.ParseControlBlock(leafProof.ControlBlock)
    if err != nil {
        return nil, err
    }

    return &waddrmgr.Tapscript{
        RevealedScript: leafProof.Script,
        ControlBlock:   ctrlBlock,
    }, nil
}
```

### Refund Path Tapscript

```go
// pkg/vhtlc/vhtlc.go:246-280
func (v *VHTLCScript) RefundTapscript(withReceiver bool) (*waddrmgr.Tapscript, error) {
    var refundClosure script.Closure
    refundClosure = v.RefundWithoutReceiverClosure
    if withReceiver {
        refundClosure = v.RefundClosure
    }

    refundScript, err := refundClosure.Script()
    // ... build merkle proof and control block
}
```

## Preimage Condition Script

```go
// pkg/vhtlc/utils.go:144-150
func makePreimageConditionScript(preimageHash []byte) ([]byte, error) {
    return txscript.NewScriptBuilder().
        AddOp(txscript.OP_HASH160).
        AddData(preimageHash).
        AddOp(txscript.OP_EQUAL).
        Script()
}
```

**Result**: `OP_HASH160 <20-byte-hash> OP_EQUAL`

## Domain Model

```go
// internal/core/domain/vhtlc.go:11-22
type Vhtlc struct {
    vhtlc.Opts
    Id string  // SHA256(preimageHash || sender || receiver)
}

type VHTLCRepository interface {
    GetAll(ctx context.Context) ([]Vhtlc, error)
    Get(ctx context.Context, id string) (*Vhtlc, error)
    Add(ctx context.Context, vhtlc Vhtlc) error
    Close()
}

// ID generation
func GetVhtlcId(preimageHash, sender, receiver []byte) string {
    id := make([]byte, 0, len(preimageHash)+len(sender)+len(receiver))
    id = append(id, preimageHash...)
    id = append(id, sender...)
    id = append(id, receiver...)
    id_hash := sha256.Sum256(id)
    return hex.EncodeToString(id_hash[:])
}
```

## Claiming VHTLCs

### Off-chain Claim via Ark TX

```go
// pkg/swap/swap.go:167-307 (ClaimVHTLC)
func (h *SwapHandler) ClaimVHTLC(ctx context.Context, preimage []byte, vhtlcOpts vhtlc.Opts) (string, error) {
    vHTLC, err := vhtlc.NewVHTLCScriptFromOpts(vhtlcOpts)

    // Get VHTLC funds from indexer
    vtxos, err := h.getVHTLCFunds(ctx, []*vhtlc.VHTLCScript{vHTLC})

    // If recoverable, use batch settlement instead
    if vtxo.IsRecoverable() && vtxo.Amount >= h.config.Dust {
        return h.SettleVHTLCWithClaimPath(ctx, vhtlcOpts, preimage)
    }

    // Build off-chain claim transaction
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

    // Sign with preimage in witness
    signTransaction := func(tx *psbt.Packet) (string, error) {
        // Add preimage to checkpoint input
        if err := txutils.SetArkPsbtField(
            tx, 0, txutils.ConditionWitnessField, wire.TxWitness{preimage},
        ); err != nil {
            return "", err
        }
        return h.arkClient.SignTransaction(ctx, encoded)
    }

    // Submit and finalize
    arkTxid, finalArkTx, signedCheckpoints, err := h.transportClient.SubmitTx(ctx, signedArkTx, checkpointTxs)
    err = h.transportClient.FinalizeTx(ctx, arkTxid, finalCheckpoints)

    return arkTxid, nil
}
```

### Batch Settlement Claim

```go
// pkg/swap/swap.go:521-578 (SettleVHTLCWithClaimPath)
func (h *SwapHandler) SettleVHTLCWithClaimPath(ctx context.Context, vhtlcOpts vhtlc.Opts, preimage []byte) (string, error) {
    // Validate preimage matches hash
    if err := validatePreimage(preimage, vhtlcOpts.PreimageHash); err != nil {
        return "", err
    }

    session, err := h.getBatchSessionArgs(ctx, vhtlcOpts, nil)

    // Build claim intent with preimage
    proof, message, err := getClaimIntent(session, preimage)
    signedProof, err := h.arkClient.SignTransaction(ctx, proof)

    // Register intent with ASP
    intentID, err := h.transportClient.RegisterIntent(ctx, signedProof, message)

    // Create batch session handler
    claimHandler, err := newClaimBatchSessionHandler(
        h.arkClient, h.transportClient,
        intentID, session.vtxos,
        []types.Receiver{{To: session.destinationAddr, Amount: session.totalAmount}},
        preimage,
        map[string]*vhtlc.VHTLCScript{session.vtxos[0].Script: session.vhtlcScript},
        h.config, session.signerSession,
    )

    // Join batch session (round)
    txid, err := arksdk.JoinBatchSession(ctx, eventsCh, claimHandler)
    return txid, nil
}
```

## Refunding VHTLCs

### Off-chain Refund

```go
// pkg/swap/swap.go:309-519 (RefundSwap)
func (h *SwapHandler) RefundSwap(ctx context.Context, swapType, swapId string, withReceiver bool, vhtlcOpts vhtlc.Opts) (string, error) {
    // Get refund tapscript (with or without receiver)
    refundTapscript, err := vhtlcScript.RefundTapscript(withReceiver)

    // Build refund transaction
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

    // If withReceiver, get Boltz to co-sign
    if withReceiver {
        boltzSignedRefundPtx, boltzSignedCheckpointPtx, err := h.collaborativeRefund(
            swapType, swapId, unsignedRefundTx, unsignedCheckpointTx)
        // Merge signatures
    }

    // Submit and finalize with ASP
    arkTxid, finalRefundTx, serverSignedCheckpoints, err := h.transportClient.SubmitTx(ctx, signedRefund, checkpoints)
    err = h.transportClient.FinalizeTx(ctx, arkTxid, finalCheckpoints)

    return arkTxid, nil
}
```

### Batch Settlement Refund

```go
// pkg/swap/swap.go:580-637 (SettleVhtlcWithRefundPath)
func (h *SwapHandler) SettleVhtlcWithRefundPath(ctx context.Context, vhtlcOpts vhtlc.Opts) (string, error) {
    session, err := h.getBatchSessionArgs(ctx, vhtlcOpts, nil)

    // Build refund intent (no preimage needed)
    proof, message, err := getRefundIntent(session)
    signedProof, err := h.arkClient.SignTransaction(ctx, proof)

    intentID, err := h.transportClient.RegisterIntent(ctx, signedProof, message)

    withReceiver := true
    withoutReceiver := !withReceiver
    refundHandler, err := newRefundBatchSessionHandler(
        h.arkClient, h.transportClient,
        intentID, session.vtxos,
        []types.Receiver{{To: session.destinationAddr, Amount: session.totalAmount}},
        withoutReceiver,  // Usually false = with receiver
        map[string]*vhtlc.VHTLCScript{...},
        h.config, h.publicKey, session.signerSession,
    )

    txid, err := arksdk.JoinBatchSession(ctx, eventsCh, refundHandler)
    return txid, nil
}
```

## Validation Rules

### Preimage Hash

```go
// Must be 20 bytes (RIPEMD160(SHA256(preimage)))
const hash160Len = 20

if len(o.PreimageHash) != hash160Len {
    return fmt.Errorf("preimage hash must be %d bytes", hash160Len)
}

// Converting from SHA256 to hash160
if len(decodedPreimageHash) == sha256Len {
    decodedPreimageHash = input.Ripemd160H(decodedPreimageHash)
}
```

### Timelock Constraints

```go
// pkg/vhtlc/utils.go:152-165
const (
    minSecondsTimelock      = 512
    secondsTimelockMultiple = 512
)

func validateTimelock(locktime arklib.RelativeLocktime) error {
    if locktime.Value == 0 {
        return fmt.Errorf("value must be greater than 0")
    }
    if locktime.Type == arklib.LocktimeTypeSecond {
        if locktime.Value < minSecondsTimelock {
            return fmt.Errorf("value in seconds must be at least %d", minSecondsTimelock)
        }
        if locktime.Value%secondsTimelockMultiple != 0 {
            return fmt.Errorf("value in seconds must be a multiple of %d", secondsTimelockMultiple)
        }
    }
    return nil
}
```

## Closure Parsing

### Expected Key Counts

| Closure | Expected Keys |
|---------|--------------|
| ClaimClosure | 2 (Receiver + Server) |
| RefundClosure | 3 (Sender + Receiver + Server) |
| RefundWithoutReceiverClosure | 2 (Sender + Server) |
| UnilateralClaimClosure | 1 (Receiver) |
| UnilateralRefundClosure | 2 (Sender + Receiver) |
| UnilateralRefundWithoutReceiverClosure | 1 (Sender) |

```go
// pkg/vhtlc/utils.go:12-31
func parseClaimClosure(leaf string) (*script.ConditionMultisigClosure, error) {
    buf, err := hex.DecodeString(leaf)
    closure := script.ConditionMultisigClosure{}
    ok, err := closure.Decode(buf)
    if !ok {
        return nil, fmt.Errorf("invalid claim closure %s", leaf)
    }
    if len(closure.PubKeys) != 2 {
        return nil, fmt.Errorf("expected 2 pubkeys, got %d", len(closure.PubKeys))
    }
    return &closure, nil
}
```

## Security Considerations

1. **Preimage Protection**: Never reveal preimage until funds are secured
2. **Timelock Ordering**: UnilateralRefundWithoutReceiver must have longest delay
3. **Hash Type**: Use RIPEMD160(SHA256(preimage)) for compatibility with Lightning
4. **Server Trust**: Collaborative paths require trusting the ASP for liveness

## Common Patterns

### VHTLC for Submarine Swap (Send to Lightning)

```go
// Fulmine is SENDER, Boltz is RECEIVER
opts := vhtlc.Opts{
    Sender:       fulminePubkey,      // Fulmine locks funds
    Receiver:     boltzClaimPubkey,   // Boltz claims with preimage
    Server:       aspPubkey,
    PreimageHash: invoicePaymentHash,
    // ... timelocks from Boltz
}
```

### VHTLC for Reverse Swap (Receive from Lightning)

```go
// Boltz is SENDER, Fulmine is RECEIVER
opts := vhtlc.Opts{
    Sender:       boltzRefundPubkey,  // Boltz can refund
    Receiver:     fulminePubkey,      // Fulmine claims with preimage
    Server:       aspPubkey,
    PreimageHash: preimageHash,       // Fulmine knows preimage
    // ... timelocks from Boltz
}
```

## Related Skills

- `fulmine-submarine-swap` - Uses VHTLCs for ARK→Lightning swaps
- `fulmine-reverse-swap` - Uses VHTLCs for Lightning→ARK swaps
- `ark-sdk-batch-session` - Batch settlement for VHTLC claims/refunds
- `arkd-offchain-tx` - Off-chain transaction building
