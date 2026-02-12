---
name: arkd-offchain-tx
description: Off-chain transaction processing in arkd - Ark TX and checkpoint TX construction, submission, and finalization
---

# Off-chain Transaction Processing for arkd

## When to Use

Use this skill when:
- Understanding how off-chain transactions (SendOffChain) are processed
- Working with Ark TX and checkpoint TX construction
- Implementing or debugging the SubmitOffchainTx flow
- Understanding the offchain tx state machine
- Working with VTXO spending paths and forfeit closures
- Handling checkpoint transaction finalization

## Key Concepts

### 1. Off-chain Transaction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                OFF-CHAIN TRANSACTION FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Client                           Server (arkd)                  │
│  ──────                           ─────────────                  │
│                                                                  │
│  1. Build Ark TX + Checkpoint TXs                               │
│        │                                                         │
│        ▼                                                         │
│  2. Sign Ark TX (forfeit path)                                  │
│        │                                                         │
│        └──────────────────────────────► SubmitOffchainTx()      │
│                                              │                   │
│                                              ▼                   │
│                                         3. Validate inputs      │
│                                         4. Co-sign Ark TX       │
│                                         5. Sign Checkpoint TXs  │
│        ◄─────────────────────────────────────┘                  │
│        │                                                         │
│        ▼                                                         │
│  6. Verify server signatures                                    │
│  7. Sign checkpoint TXs (user side)                             │
│        │                                                         │
│        └──────────────────────────────► FinalizeOffchainTx()    │
│                                              │                   │
│                                              ▼                   │
│                                         8. Store final TXs      │
│                                         9. Update VTXO state    │
│        ◄─────────────────────────────────────┘                  │
│        │                                                         │
│        ▼                                                         │
│  10. Update local VTXO state                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Transaction Types

| Transaction | Purpose | Description |
|-------------|---------|-------------|
| **Ark TX** | Off-chain payment | Spends checkpoint outputs to new VTXOs |
| **Checkpoint TX** | Intermediate step | Spends VTXO using forfeit path to checkpoint output |

### 3. Off-chain TX Stages

| Stage | Code | Description |
|-------|------|-------------|
| `OffchainTxUndefinedStage` | 0 | Initial state |
| `OffchainTxRequestedStage` | 1 | Client submitted, awaiting co-sign |
| `OffchainTxAcceptedStage` | 2 | Server co-signed, awaiting finalization |
| `OffchainTxFinalizedStage` | 3 | Fully signed and stored |

## Code Patterns

### Pattern 1: VtxoInput Structure

```go
type VtxoInput struct {
    Outpoint *wire.OutPoint
    Amount   int64

    // Tapscript is the path used to spend the VTXO (forfeit closure)
    Tapscript *waddrmgr.Tapscript

    // RevealedTapscripts is the whole taproot tree of the VTXO
    // Must be revealed to ASP to verify spend paths are valid
    RevealedTapscripts []string
}
```
**Source**: `arkd/pkg/ark-lib/offchain/tx.go:20-28`

### Pattern 2: Building Ark TX and Checkpoint TXs

```go
// BuildTxs builds the ark and checkpoint txs for given inputs and outputs.
func BuildTxs(
    vtxos []VtxoInput,           // VTXOs to spend
    outputs []*wire.TxOut,       // New VTXO outputs
    signerUnrollScript []byte,   // ASP's unroll script
) (*psbt.Packet, []*psbt.Packet, error) {
    checkpointInputs := make([]VtxoInput, 0, len(vtxos))
    checkpointTxs := make([]*psbt.Packet, 0, len(vtxos))
    inputAmount := int64(0)

    // Decode the signer unroll script
    signerUnrollScriptClosure := &script.CSVMultisigClosure{}
    valid, err := signerUnrollScriptClosure.Decode(signerUnrollScript)
    if err != nil || !valid {
        return nil, nil, fmt.Errorf("invalid signer unroll script")
    }

    // Build checkpoint tx for each VTXO
    for _, vtxo := range vtxos {
        checkpointPtx, checkpointInput, err := buildCheckpointTx(
            vtxo, signerUnrollScriptClosure,
        )
        if err != nil {
            return nil, nil, err
        }

        checkpointInputs = append(checkpointInputs, *checkpointInput)
        checkpointTxs = append(checkpointTxs, checkpointPtx)
        inputAmount += vtxo.Amount
    }

    // Verify input/output balance
    outputAmount := int64(0)
    for _, output := range outputs {
        outputAmount += output.Value
    }
    if inputAmount != outputAmount {
        return nil, nil, fmt.Errorf("input amount is not equal to output amount")
    }

    // Build the Ark TX spending checkpoint outputs
    arkTx, err := buildArkTx(checkpointInputs, outputs)
    if err != nil {
        return nil, nil, err
    }

    return arkTx, checkpointTxs, nil
}
```
**Source**: `arkd/pkg/ark-lib/offchain/tx.go:31-73`

### Pattern 3: Building Checkpoint TX

```go
// buildCheckpointTx creates a virtual tx sending to a "checkpoint" VTXO script.
// Checkpoint = signer unroll script + owner's collaborative closure
func buildCheckpointTx(
    vtxo VtxoInput, signerUnrollScript *script.CSVMultisigClosure,
) (*psbt.Packet, *VtxoInput, error) {
    // Get owner's collaborative closure from the VTXO tapscript
    collaborativeClosure, err := script.DecodeClosure(vtxo.Tapscript.RevealedScript)
    if err != nil {
        return nil, nil, err
    }

    // Create checkpoint VTXO script: [signer unroll, owner collaborative]
    checkpointVtxoScript := script.TapscriptsVtxoScript{
        Closures: []script.Closure{signerUnrollScript, collaborativeClosure},
    }

    tapKey, tapTree, err := checkpointVtxoScript.TapTree()
    if err != nil {
        return nil, nil, err
    }

    checkpointPkScript, err := script.P2TRScript(tapKey)
    if err != nil {
        return nil, nil, err
    }

    // Build the checkpoint virtual tx
    checkpointPtx, err := buildArkTx(
        []VtxoInput{vtxo},
        []*wire.TxOut{{Value: vtxo.Amount, PkScript: checkpointPkScript}},
    )
    if err != nil {
        return nil, nil, err
    }

    // Create input for Ark TX that spends this checkpoint output
    tapLeafHash := txscript.NewBaseTapLeaf(vtxo.Tapscript.RevealedScript).TapHash()
    collaborativeLeafProof, _ := tapTree.GetTaprootMerkleProof(tapLeafHash)
    ctrlBlock, _ := txscript.ParseControlBlock(collaborativeLeafProof.ControlBlock)

    revealedTapscripts, _ := checkpointVtxoScript.Encode()

    checkpointInput := &VtxoInput{
        Outpoint: &wire.OutPoint{
            Hash:  checkpointPtx.UnsignedTx.TxHash(),
            Index: 0,
        },
        Amount: vtxo.Amount,
        Tapscript: &waddrmgr.Tapscript{
            ControlBlock:   ctrlBlock,
            RevealedScript: collaborativeLeafProof.Script,
        },
        RevealedTapscripts: revealedTapscripts,
    }

    return checkpointPtx, checkpointInput, nil
}
```
**Source**: `arkd/pkg/ark-lib/offchain/tx.go:173-239`

### Pattern 4: Building Ark TX

```go
// buildArkTx builds an ark tx spending VTXOs via collaborative taproot path.
func buildArkTx(vtxos []VtxoInput, outputs []*wire.TxOut) (*psbt.Packet, error) {
    if len(vtxos) <= 0 {
        return nil, fmt.Errorf("missing vtxos")
    }

    ins := make([]*wire.OutPoint, 0, len(vtxos))
    sequences := make([]uint32, 0, len(vtxos))
    witnessUtxos := make(map[int]*wire.TxOut)
    signingTapLeaves := make(map[int]*psbt.TaprootTapLeafScript)
    tapscripts := make(map[int][]string)
    txLocktime := common.AbsoluteLocktime(0)

    for index, vtxo := range vtxos {
        tapscripts[index] = vtxo.RevealedTapscripts

        // Compute the VTXO output script
        rootHash := vtxo.Tapscript.ControlBlock.RootHash(vtxo.Tapscript.RevealedScript)
        taprootKey := txscript.ComputeTaprootOutputKey(script.UnspendableKey(), rootHash)
        vtxoOutputScript, _ := script.P2TRScript(taprootKey)

        witnessUtxos[index] = &wire.TxOut{
            Value:    vtxo.Amount,
            PkScript: vtxoOutputScript,
        }

        ctrlBlockBytes, _ := vtxo.Tapscript.ControlBlock.ToBytes()
        signingTapLeaves[index] = &psbt.TaprootTapLeafScript{
            ControlBlock: ctrlBlockBytes,
            Script:       vtxo.Tapscript.RevealedScript,
            LeafVersion:  txscript.BaseLeafVersion,
        }

        // Handle CLTV multisig closure (updates tx locktime)
        closure, _ := script.DecodeClosure(vtxo.Tapscript.RevealedScript)
        if cltv, ok := closure.(*script.CLTVMultisigClosure); ok {
            if cltv.Locktime > txLocktime {
                txLocktime = cltv.Locktime
            }
            sequences = append(sequences, cltvSequence)
        } else {
            sequences = append(sequences, wire.MaxTxInSequenceNum)
        }

        ins = append(ins, vtxo.Outpoint)
    }

    // Create PSBT with anchor output
    arkTx, _ := psbt.New(
        ins, append(outputs, txutils.AnchorOutput()), 3, uint32(txLocktime), sequences,
    )

    // Set input fields
    for i := range arkTx.Inputs {
        arkTx.Inputs[i].WitnessUtxo = witnessUtxos[i]
        arkTx.Inputs[i].TaprootLeafScript = []*psbt.TaprootTapLeafScript{
            signingTapLeaves[i],
        }
        txutils.SetArkPsbtField(arkTx, i, txutils.VtxoTaprootTreeField, tapscripts[i])
    }

    return arkTx, nil
}
```
**Source**: `arkd/pkg/ark-lib/offchain/tx.go:75-171`

### Pattern 5: OffchainTx Domain Model

```go
type OffchainTx struct {
    Stage              Stage             // Current stage
    StartingTimestamp  int64             // When tx was submitted
    EndingTimestamp    int64             // When tx was finalized
    ArkTxid            string            // Ark TX ID
    ArkTx              string            // Ark TX (PSBT)
    CheckpointTxs      map[string]string // txid -> checkpoint tx
    CommitmentTxids    map[string]string // checkpoint txid -> commitment txid
    RootCommitmentTxId string            // Root commitment txid
    ExpiryTimestamp    int64             // When VTXOs expire
    FailReason         string            // Failure reason
    Version            uint              // Event version
    changes            []Event           // Domain events
}
```
**Source**: `arkd/internal/core/domain/offchain_tx.go:35-48`

### Pattern 6: Requesting Off-chain TX

```go
func (s *OffchainTx) Request(
    arkTxid, arkTx string, unsignedCheckpointTxs map[string]string,
) (Event, error) {
    if s.IsFailed() || s.Stage.Code != int(OffchainTxUndefinedStage) {
        return nil, fmt.Errorf("not in a valid stage to request offchain tx")
    }
    if arkTxid == "" || arkTx == "" {
        return nil, fmt.Errorf("missing ark tx")
    }
    if len(unsignedCheckpointTxs) == 0 {
        return nil, fmt.Errorf("missing unsigned checkpoint txs")
    }

    event := OffchainTxRequested{
        OffchainTxEvent: OffchainTxEvent{
            Id:   arkTxid,
            Type: EventTypeOffchainTxRequested,
        },
        ArkTx:                 arkTx,
        UnsignedCheckpointTxs: unsignedCheckpointTxs,
        StartingTimestamp:     time.Now().Unix(),
    }
    s.raise(event)
    return event, nil
}
```
**Source**: `arkd/internal/core/domain/offchain_tx.go:68-95`

### Pattern 7: Accepting Off-chain TX (Server Co-sign)

```go
func (s *OffchainTx) Accept(
    finalArkTx string, signedCheckpointTxs map[string]string,
    commitmentTxsByCheckpointTxid map[string]string,
    rootCommitmentTx string, expiryTimestamp int64,
) (Event, error) {
    if finalArkTx == "" {
        return nil, fmt.Errorf("missing final ark tx")
    }
    if len(signedCheckpointTxs) != len(s.CheckpointTxs) {
        return nil, fmt.Errorf("invalid number of signed checkpoint txs")
    }
    if !s.IsRequested() {
        return nil, fmt.Errorf("not in a valid stage to accept offchain tx")
    }

    event := OffchainTxAccepted{
        OffchainTxEvent: OffchainTxEvent{
            Id:   s.ArkTxid,
            Type: EventTypeOffchainTxAccepted,
        },
        FinalArkTx:          finalArkTx,
        SignedCheckpointTxs: signedCheckpointTxs,
        CommitmentTxids:     commitmentTxsByCheckpointTxid,
        RootCommitmentTxid:  rootCommitmentTx,
        ExpiryTimestamp:     expiryTimestamp,
    }
    s.raise(event)
    return event, nil
}
```
**Source**: `arkd/internal/core/domain/offchain_tx.go:97-138`

### Pattern 8: Finalizing Off-chain TX

```go
func (s *OffchainTx) Finalize(finalCheckpointTxs map[string]string) (Event, error) {
    if len(finalCheckpointTxs) != len(s.CheckpointTxs) {
        return nil, fmt.Errorf("invalid number of final checkpoint txs")
    }

    // Verify all checkpoint txs are present
    for txid := range s.CheckpointTxs {
        if _, ok := finalCheckpointTxs[txid]; !ok {
            return nil, fmt.Errorf("checkpoint tx %s not found", txid)
        }
    }

    if !s.IsAccepted() {
        return nil, fmt.Errorf("not in a valid stage to finalize offchain tx")
    }

    event := OffchainTxFinalized{
        OffchainTxEvent: OffchainTxEvent{
            Id:   s.ArkTxid,
            Type: EventTypeOffchainTxFinalized,
        },
        FinalCheckpointTxs: finalCheckpointTxs,
        Timestamp:          time.Now().Unix(),
    }
    s.raise(event)
    return event, nil
}
```
**Source**: `arkd/internal/core/domain/offchain_tx.go:140-172`

### Pattern 9: Service Layer - SubmitOffchainTx

```go
func (s *service) SubmitOffchainTx(
    ctx context.Context, unsignedCheckpointTxs []string, signedArkTx string,
) (acceptedTx *AcceptedOffchainTx, structErr errors.Error) {
    arkPtx, _ := psbt.NewFromRawBytes(strings.NewReader(signedArkTx), true)
    txid := arkPtx.UnsignedTx.TxID()

    offchainTx := domain.NewOffchainTx()
    var changes []domain.Event

    defer func() {
        if structErr != nil {
            change := offchainTx.Fail(structErr)
            changes = append(changes, change)
        }
        // Save events
        s.repoManager.Events().Save(ctx, domain.OffchainTxTopic, txid, changes)
    }()

    // Validate and process each input VTXO
    ins := make([]offchain.VtxoInput, 0)
    for i, input := range arkPtx.UnsignedTx.TxIn {
        vtxoOutpoint := domain.Outpoint{
            Txid: input.PreviousOutPoint.Hash.String(),
            VOut: input.PreviousOutPoint.Index,
        }

        // Look up VTXO commitment chain
        vtxosResult, _ := s.repoManager.Vtxos().GetVtxos(ctx, []domain.Outpoint{vtxoOutpoint})
        vtxo := vtxosResult[0]

        // Verify VTXO is spendable
        if vtxo.Spent {
            return nil, errors.VTXO_ALREADY_SPENT.New("vtxo %s already spent", vtxoOutpoint)
        }

        // Build VtxoInput for validation
        ins = append(ins, buildVtxoInput(vtxo, arkPtx.Inputs[i]))
    }

    // Validate checkpoint txs match the inputs
    // ...

    // Co-sign the Ark TX
    signedArkTx, _ := s.signer.SignArkTx(ctx, signedArkTx)

    // Sign checkpoint txs
    signedCheckpointTxs := make(map[string]string)
    for _, checkpointTx := range unsignedCheckpointTxs {
        signed, _ := s.signer.SignCheckpointTx(ctx, checkpointTx)
        signedCheckpointTxs[signed.TxID()] = signed
    }

    // Accept the offchain tx
    event, _ := offchainTx.Accept(
        signedArkTx, signedCheckpointTxs,
        commitmentTxids, rootCommitmentTxid, expiryTimestamp,
    )
    changes = append(changes, event)

    // Store in cache for finalization
    s.cache.OffchainTxs().Add(ctx, offchainTx)

    return &AcceptedOffchainTx{
        Txid:                txid,
        FinalArkTx:          signedArkTx,
        SignedCheckpointTxs: signedCheckpointTxs,
    }, nil
}
```
**Source**: `arkd/internal/core/application/service.go:412-1114` (simplified)

### Pattern 10: Service Layer - FinalizeOffchainTx

```go
func (s *service) FinalizeOffchainTx(
    ctx context.Context, txid string, finalCheckpointTxs []string,
) (structErr errors.Error) {
    var changes []domain.Event

    // Get offchain tx from cache or repo
    offchainTx, err := s.cache.OffchainTxs().Get(ctx, txid)
    if err != nil || offchainTx == nil {
        offchainTx, _ = s.repoManager.OffchainTxs().GetOffchainTx(ctx, txid)
    }

    defer func() {
        if structErr != nil {
            change := offchainTx.Fail(structErr)
            changes = append(changes, change)
        }
        s.cache.OffchainTxs().Remove(ctx, txid)
        s.repoManager.Events().Save(ctx, domain.OffchainTxTopic, txid, changes)
    }()

    // Build map of final checkpoint txs
    finalCheckpointTxsMap := make(map[string]string)
    for _, tx := range finalCheckpointTxs {
        ptx, _ := psbt.NewFromRawBytes(strings.NewReader(tx), true)
        finalCheckpointTxsMap[ptx.UnsignedTx.TxID()] = tx
    }

    // Verify all checkpoint signatures are valid
    for _, tx := range finalCheckpointTxs {
        if err := verifyCheckpointSignature(tx); err != nil {
            return errors.INVALID_SIGNATURE.New("invalid checkpoint signature")
        }
    }

    // Finalize the offchain tx
    event, _ := offchainTx.Finalize(finalCheckpointTxsMap)
    changes = append(changes, event)

    // Mark input VTXOs as spent
    for _, vtxo := range getInputVtxos(offchainTx) {
        vtxo.Spent = true
        vtxo.ArkTxid = offchainTx.ArkTxid
        s.repoManager.Vtxos().UpdateVtxos(ctx, []domain.Vtxo{vtxo})
    }

    // Create new VTXOs from outputs
    newVtxos := extractOutputVtxos(offchainTx)
    s.repoManager.Vtxos().AddVtxos(ctx, newVtxos)

    return nil
}
```
**Source**: `arkd/internal/core/application/service.go:1116-1258` (simplified)

### Pattern 11: Event Types

```go
type OffchainTxRequested struct {
    OffchainTxEvent
    ArkTx                 string            // Unsigned ark tx
    UnsignedCheckpointTxs map[string]string // txid -> unsigned checkpoint
    StartingTimestamp     int64
}

type OffchainTxAccepted struct {
    OffchainTxEvent
    CommitmentTxids     map[string]string // checkpoint txid -> commitment txid
    RootCommitmentTxid  string            // Root commitment txid
    FinalArkTx          string            // Co-signed ark tx
    SignedCheckpointTxs map[string]string // txid -> server-signed checkpoint
    ExpiryTimestamp     int64
}

type OffchainTxFinalized struct {
    OffchainTxEvent
    FinalCheckpointTxs map[string]string // txid -> fully signed checkpoint
    Timestamp          int64
}

type OffchainTxFailed struct {
    OffchainTxEvent
    Reason    string
    Timestamp int64
}
```
**Source**: `arkd/internal/core/domain/offchain_tx_event.go:13-39`

### Pattern 12: State Machine Transitions

```go
func (s *OffchainTx) on(event Event, replayed bool) {
    switch e := event.(type) {
    case OffchainTxRequested:
        if s.Stage.Code != int(OffchainTxUndefinedStage) || s.Stage.Failed {
            return
        }
        s.Stage.Code = int(OffchainTxRequestedStage)
        s.ArkTxid = e.Id
        s.ArkTx = e.ArkTx
        s.CheckpointTxs = e.UnsignedCheckpointTxs
        s.StartingTimestamp = e.StartingTimestamp

    case OffchainTxAccepted:
        if s.Stage.Code != int(OffchainTxRequestedStage) || s.Stage.Failed {
            return
        }
        s.Stage.Code = int(OffchainTxAcceptedStage)
        s.ArkTx = e.FinalArkTx
        s.CheckpointTxs = e.SignedCheckpointTxs
        s.CommitmentTxids = e.CommitmentTxids
        s.RootCommitmentTxId = e.RootCommitmentTxid
        s.ExpiryTimestamp = e.ExpiryTimestamp

    case OffchainTxFinalized:
        if s.Stage.Code != int(OffchainTxAcceptedStage) {
            return
        }
        s.Stage.Code = int(OffchainTxFinalizedStage)
        s.Stage.Ended = true
        s.CheckpointTxs = e.FinalCheckpointTxs
        s.EndingTimestamp = e.Timestamp

    case OffchainTxFailed:
        if s.Stage.Code == int(OffchainTxFinalizedStage) || s.Stage.Failed {
            return
        }
        s.Stage.Failed = true
        s.FailReason = e.Reason
    }

    if replayed {
        s.Version++
    }
}
```
**Source**: `arkd/internal/core/domain/offchain_tx.go:227-269`

## File References

| Purpose | File | Key Types/Functions |
|---------|------|---------------------|
| Off-chain tx building | `arkd/pkg/ark-lib/offchain/tx.go` | `BuildTxs`, `VtxoInput`, `buildArkTx`, `buildCheckpointTx` |
| Domain model | `arkd/internal/core/domain/offchain_tx.go` | `OffchainTx`, `Request`, `Accept`, `Finalize` |
| Domain events | `arkd/internal/core/domain/offchain_tx_event.go` | `OffchainTxRequested`, `OffchainTxAccepted`, etc. |
| Service layer | `arkd/internal/core/application/service.go` | `SubmitOffchainTx`, `FinalizeOffchainTx` |
| Repository | `arkd/internal/core/domain/offchain_tx_repo.go` | `OffchainTxRepository` interface |

## Common Operations

### Operation 1: Client-side Ark TX Construction

```go
// In go-sdk client.go (SendOffChain)
func buildOffchainTx(inputs []coin, receivers []Receiver, checkpointExitPath []byte) (*psbt.Packet, []*psbt.Packet, error) {
    vtxos := make([]offchain.VtxoInput, 0)
    for _, in := range inputs {
        vtxos = append(vtxos, offchain.VtxoInput{
            Outpoint:           in.Outpoint,
            Amount:             int64(in.Amount),
            Tapscript:          in.Tapscript,
            RevealedTapscripts: in.RevealedTapscripts,
        })
    }

    outputs := make([]*wire.TxOut, 0)
    for _, r := range receivers {
        outputs = append(outputs, &wire.TxOut{
            Value:    int64(r.Amount),
            PkScript: r.Script,
        })
    }

    return offchain.BuildTxs(vtxos, outputs, checkpointExitPath)
}
```

### Operation 2: Check if Off-chain TX is pending

```go
func isPending(offchainTx *OffchainTx) bool {
    return offchainTx.IsRequested() || offchainTx.IsAccepted()
}
```

### Operation 3: Get commitment chain for off-chain TX outputs

```go
func getCommitmentChain(offchainTx *OffchainTx, checkpointTxid string) []string {
    commitmentTxid := offchainTx.CommitmentTxids[checkpointTxid]
    return []string{offchainTx.RootCommitmentTxId, commitmentTxid}
}
```

## Gotchas & Edge Cases

1. **Checkpoint TX Purpose**: Checkpoint TXs add an intermediate step that allows the ASP to unroll if the user misbehaves. They're virtual transactions (never broadcast).

2. **Input/Output Balance**: The sum of inputs MUST equal sum of outputs (no fees within Ark TX, fees handled by anchors).

3. **CLTV Handling**: If any input uses CLTV closure, the tx locktime must be set appropriately and sequence must be `cltvSequence`.

4. **Revealed Tapscripts**: The full taproot tree must be revealed to the ASP for validation. Don't skip this.

5. **Concurrent Spending**: Check `s.cache.OffchainTxs().Includes()` before accepting to prevent double-spending.

6. **Expiry Inheritance**: New VTXOs inherit the earliest expiry from input VTXOs (or input commitment chain).

7. **Event Sourcing**: OffchainTx is event-sourced. All state changes through events, replay reconstructs state.

8. **Version 3 Transactions**: All Ark and checkpoint transactions must be version 3 for TRUC/v3 relay.

9. **Server Co-signing**: The ASP signs AFTER the user. Verify user signatures before co-signing.

10. **Finalization Window**: Off-chain TXs should be finalized promptly. The cache holds pending TXs temporarily.

---
**Skill Owner**: ark-developer
**Repos**: arkd, go-sdk
