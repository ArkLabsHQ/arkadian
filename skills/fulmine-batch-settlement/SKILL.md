# Fulmine Batch Settlement for VHTLCs

## Overview

Batch settlement allows Fulmine to settle VHTLCs (claim or refund) by participating in an ASP round rather than submitting individual off-chain transactions. This is more efficient when VTXOs are "recoverable" (about to expire).

## When to Use Batch Settlement

```go
// pkg/swap/swap.go:186-193
// If VTXO is recoverable (can be swept by ASP), use batch settlement
if vtxo.IsRecoverable() && vtxo.Amount >= h.config.Dust {
    txid, err := h.SettleVHTLCWithClaimPath(ctx, vhtlcOpts, preimage)
    log.Infof("recoverable vhtlc settled with claim path: %s", txid)
    return txid, nil
}
```

A VTXO is "recoverable" when it's close to expiring and can be swept by the ASP.

## Key Files

| File | Purpose |
|------|---------|
| `pkg/swap/batch_handler.go` | Batch session handlers |
| `pkg/swap/swap.go` | Settlement entry points |

## Three Handler Types

| Handler | Purpose | Signing Path |
|---------|---------|--------------|
| `claimBatchSessionHandler` | Claim with preimage | ClaimClosure |
| `refundBatchSessionHandler` | Refund without Boltz | RefundWithoutReceiverClosure |
| `collabRefundBatchSessionHandler` | Refund with Boltz | RefundClosure |

## Common Session Args

```go
// pkg/swap/batch_handler.go:31-37
type batchSessionArgs struct {
    vhtlcScript     *vhtlc.VHTLCScript
    totalAmount     uint64
    destinationAddr string
    signerSession   tree.SignerSession  // Ephemeral key for tree signing
    vtxos           []client.TapscriptsVtxo
}
```

## Preparing Session Args

```go
// pkg/swap/swap.go:1116-1169
func (h *SwapHandler) getBatchSessionArgs(
    ctx context.Context, vhtlcOpts vhtlc.Opts, signerSession *tree.SignerSession,
) (*batchSessionArgs, error) {
    vhtlcScript, err := vhtlc.NewVHTLCScriptFromOpts(vhtlcOpts)

    vhtlcs := []*vhtlc.VHTLCScript{vhtlcScript}
    vtxos, err := h.getVHTLCFunds(ctx, vhtlcs)
    if len(vtxos) == 0 {
        return nil, ErrorNoVtxosFound
    }

    // Calculate total from all VTXOs
    var totalAmount uint64
    for _, vtxo := range vtxos {
        totalAmount += vtxo.Amount
    }

    // Destination: user's own offchain address
    myAddr, err := h.arkClient.NewOffchainAddress(ctx)

    // Create ephemeral signer session if not provided
    if signerSession == nil {
        ephemeralKey, err := btcec.NewPrivateKey()
        ephemeralSignerSession := tree.NewTreeSignerSession(ephemeralKey)
        signerSession = &ephemeralSignerSession
    }

    vtxoTapscripts := []client.TapscriptsVtxo{{
        Vtxo:       vtxos[0],
        Tapscripts: vhtlcScript.GetRevealedTapscripts(),
    }}

    return &batchSessionArgs{
        vhtlcScript:     vhtlcScript,
        totalAmount:     totalAmount,
        destinationAddr: myAddr,
        signerSession:   *signerSession,
        vtxos:           vtxoTapscripts,
    }, nil
}
```

---

## Batch Session Handler Base

```go
// pkg/swap/batch_handler.go:39-53
type batchSessionHandler struct {
    arkClient       arksdk.ArkClient
    transportClient client.TransportClient

    intentId       string
    vtxos          []client.TapscriptsVtxo
    vtxosToForfeit []client.TapscriptsVtxo  // Non-recoverable VTXOs need forfeit
    receivers      []types.Receiver
    vhtlcScripts   map[string]*vhtlc.VHTLCScript
    config         types.Config
    signerSession  tree.SignerSession

    batchSessionId string
    batchExpiry    arklib.RelativeLocktime
}
```

## BatchEventsHandler Interface Implementation

### OnBatchStarted

```go
// pkg/swap/batch_handler.go:108-127
func (h *batchSessionHandler) OnBatchStarted(
    ctx context.Context, event client.BatchStartedEvent,
) (bool, error) {
    // Hash our intent ID to find it in the batch
    buf := sha256.Sum256([]byte(h.intentId))
    hashedIntentId := hex.EncodeToString(buf[:])

    // Check if our intent is in this batch
    for _, id := range event.HashedIntentIds {
        if id == hashedIntentId {
            // Confirm our participation
            if err := h.transportClient.ConfirmRegistration(ctx, h.intentId); err != nil {
                return false, err
            }
            h.batchSessionId = event.Id
            h.batchExpiry = parseLocktime(uint32(event.BatchExpiry))
            log.Debugf("batch %s started with our intent %s", event.Id, h.intentId)
            return false, nil  // Don't skip this batch
        }
    }
    log.Debug("intent id not found in batch proposal, waiting for next one...")
    return true, nil  // Skip this batch, wait for next
}
```

### OnTreeSigningStarted

```go
// pkg/swap/batch_handler.go:156-204
func (h *batchSessionHandler) OnTreeSigningStarted(
    ctx context.Context, event client.TreeSigningStartedEvent, vtxoTree *tree.TxTree,
) (bool, error) {
    signerPubKey := h.signerSession.GetPublicKey()
    if !slices.Contains(event.CosignersPubkeys, signerPubKey) {
        return true, nil  // Not a cosigner, skip
    }

    // Build sweep closure with batch expiry
    sweepClosure := script.CSVMultisigClosure{
        MultisigClosure: script.MultisigClosure{
            PubKeys: []*btcec.PublicKey{h.config.ForfeitPubKey},
        },
        Locktime: h.batchExpiry,
    }

    script, err := sweepClosure.Script()
    sweepTapLeaf := txscript.NewBaseTapLeaf(script)
    sweepTapTree := txscript.AssembleTaprootScriptTree(sweepTapLeaf)
    root := sweepTapTree.RootNode.TapHash()

    // Parse commitment tx to get batch output
    commitmentTx, err := psbt.NewFromRawBytes(strings.NewReader(event.UnsignedCommitmentTx), true)
    batchOutput := commitmentTx.UnsignedTx.TxOut[0]

    // Initialize signer session and send nonces
    if err := h.signerSession.Init(root.CloneBytes(), batchOutput.Value, vtxoTree); err != nil {
        return false, err
    }

    nonces, err := h.signerSession.GetNonces()
    return false, h.transportClient.SubmitTreeNonces(ctx, event.Id, h.signerSession.GetPublicKey(), nonces)
}
```

### OnTreeNonces

```go
// pkg/swap/batch_handler.go:206-234
func (h *batchSessionHandler) OnTreeNonces(
    ctx context.Context, event client.TreeNoncesEvent,
) (bool, error) {
    // Aggregate nonces from all cosigners
    hasAllNonces, err := h.signerSession.AggregateNonces(event.Txid, event.Nonces)
    if err != nil {
        return false, err
    }

    if !hasAllNonces {
        return false, nil  // Wait for more nonces
    }

    // All nonces received, sign the tree
    sigs, err := h.signerSession.Sign()
    if err != nil {
        return false, err
    }

    // Submit signatures to ASP
    err = h.transportClient.SubmitTreeSignatures(ctx, event.Id, h.signerSession.GetPublicKey(), sigs)
    return true, err  // Done with nonce aggregation
}
```

---

## Claim Batch Session Handler

```go
// pkg/swap/batch_handler.go:321-352
type claimBatchSessionHandler struct {
    batchSessionHandler
    preimage []byte
}

func newClaimBatchSessionHandler(
    arkClient arksdk.ArkClient,
    transportClient client.TransportClient,
    intentId string,
    vtxos []client.TapscriptsVtxo,
    receivers []types.Receiver,
    preimage []byte,
    vhtlcScripts map[string]*vhtlc.VHTLCScript,
    config types.Config,
    signerSession tree.SignerSession,
) (*claimBatchSessionHandler, error) {
    if len(preimage) <= 0 {
        return nil, fmt.Errorf("missing preimage")
    }
    handler, err := newBatchSessionHandler(...)
    return &claimBatchSessionHandler{
        batchSessionHandler: *handler,
        preimage:            preimage,
    }, nil
}
```

### OnBatchFinalization (Claim)

```go
// pkg/swap/batch_handler.go:354-378
func (h *claimBatchSessionHandler) OnBatchFinalization(
    ctx context.Context, event client.BatchFinalizationEvent,
    vtxoTree, connectorTree *tree.TxTree,
) error {
    if connectorTree == nil {
        if len(h.vtxosToForfeit) > 0 {
            return fmt.Errorf("connector tree is nil")
        }
        return nil  // All VTXOs expired, nothing to do
    }

    // Build and sign forfeit transactions with preimage
    builder := &claimForfeitTxBuilder{preimage: h.preimage}
    forfeits, err := h.createAndSignForfeits(ctx, connectorTree.Leaves(), builder)

    if len(forfeits) > 0 {
        if err := h.transportClient.SubmitSignedForfeitTxs(ctx, forfeits, ""); err != nil {
            return fmt.Errorf("failed to submit signed forfeits: %w", err)
        }
    }

    return nil
}
```

---

## Refund Batch Session Handler

```go
// pkg/swap/batch_handler.go:380-415
type refundBatchSessionHandler struct {
    batchSessionHandler
    withReceiver bool      // true = 3-of-3, false = 2-of-2 after CLTV
    publicKey    *btcec.PublicKey
}

func newRefundBatchSessionHandler(
    arkClient arksdk.ArkClient,
    transportClient client.TransportClient,
    intentId string,
    vtxos []client.TapscriptsVtxo,
    receivers []types.Receiver,
    withReceiver bool,
    vhtlcScripts map[string]*vhtlc.VHTLCScript,
    config types.Config,
    publicKey *btcec.PublicKey,
    signerSession tree.SignerSession,
) (*refundBatchSessionHandler, error)
```

### OnBatchFinalization (Refund)

```go
// pkg/swap/batch_handler.go:417-441
func (h *refundBatchSessionHandler) OnBatchFinalization(
    ctx context.Context, event client.BatchFinalizationEvent,
    vtxoTree, connectorTree *tree.TxTree,
) error {
    if connectorTree == nil {
        if len(h.vtxosToForfeit) > 0 {
            return fmt.Errorf("connector tree is nil")
        }
        return nil  // VHTLC expired, nothing to do
    }

    // Build forfeits using appropriate refund closure
    builder := &refundForfeitTxBuilder{withReceiver: h.withReceiver}
    forfeits, err := h.createAndSignForfeits(ctx, connectorTree.Leaves(), builder)

    if len(forfeits) > 0 {
        err = h.transportClient.SubmitSignedForfeitTxs(ctx, forfeits, "")
    }

    return nil
}
```

---

## Collaborative Refund Handler

Used when Boltz provides a partial forfeit signature (delegates approach):

```go
// pkg/swap/batch_handler.go:443-478
type collabRefundBatchSessionHandler struct {
    refundBatchSessionHandler
    partialForfeitTx string  // Pre-signed by Boltz
}

func newCollabRefundBatchSessionHandler(
    arkClient arksdk.ArkClient,
    transportClient client.TransportClient,
    intentId string,
    vtxos []client.TapscriptsVtxo,
    receivers []types.Receiver,
    withReceiver bool,
    vhtlcScripts map[string]*vhtlc.VHTLCScript,
    config types.Config,
    signerSession tree.SignerSession,
    partialForfeitTx string,
) (*collabRefundBatchSessionHandler, error)
```

### OnBatchFinalization (Collaborative)

```go
// pkg/swap/batch_handler.go:480-555
func (h *collabRefundBatchSessionHandler) OnBatchFinalization(
    ctx context.Context, event client.BatchFinalizationEvent,
    vtxoTree, connectorTree *tree.TxTree,
) error {
    // Parse the partial forfeit tx (already signed by Boltz)
    forfeitPtx, err := psbt.NewFromRawBytes(strings.NewReader(h.partialForfeitTx), true)

    updater, err := psbt.NewUpdater(forfeitPtx)

    // Get connector from tree
    connectors := connectorTree.Leaves()
    connector := connectors[0]

    // Find connector output (not anchor)
    var connectorOut *wire.TxOut
    var connectorIndex uint32
    for outIndex, output := range connector.UnsignedTx.TxOut {
        if bytes.Equal(txutils.ANCHOR_PKSCRIPT, output.PkScript) {
            continue
        }
        connectorOut = output
        connectorIndex = uint32(outIndex)
        break
    }

    // Add connector input to forfeit tx
    updater.Upsbt.UnsignedTx.TxIn = append(updater.Upsbt.UnsignedTx.TxIn, &wire.TxIn{
        PreviousOutPoint: wire.OutPoint{
            Hash:  connector.UnsignedTx.TxHash(),
            Index: connectorIndex,
        },
        Sequence: wire.MaxTxInSequenceNum,
    })
    updater.Upsbt.Inputs = append(updater.Upsbt.Inputs, psbt.PInput{
        WitnessUtxo: &wire.TxOut{
            Value:    connectorOut.Value,
            PkScript: connectorOut.PkScript,
        },
    })

    // Sign and submit
    encodedForfeitTx, err := updater.Upsbt.B64Encode()
    signedForfeitTx, err := h.arkClient.SignTransaction(ctx, encodedForfeitTx)
    err = h.transportClient.SubmitSignedForfeitTxs(ctx, []string{signedForfeitTx}, "")

    return nil
}
```

---

## Forfeit Transaction Building

### Builder Interface

```go
// pkg/swap/batch_handler.go:557-565
type forfeitTxBuilder interface {
    buildTx(
        vtxo client.TapscriptsVtxo, signingPath *psbt.TaprootTapLeafScript,
        connector *wire.TxOut, connectorOutpoint *wire.OutPoint,
        vtxoLocktime arklib.AbsoluteLocktime, vtxoSequence uint32,
        forfeitPkScript []byte,
    ) (string, error)
    getSigningClosure(vhtlcScript *vhtlc.VHTLCScript) script.Closure
}
```

### Claim Forfeit Builder

```go
// pkg/swap/batch_handler.go:567-599
type claimForfeitTxBuilder struct {
    preimage []byte
}

func (b *claimForfeitTxBuilder) buildTx(...) (string, error) {
    tx, err := buildForfeitTx(...)

    // Inject preimage into witness
    if err := txutils.SetArkPsbtField(
        tx, 0, txutils.ConditionWitnessField, wire.TxWitness{b.preimage},
    ); err != nil {
        return "", fmt.Errorf("failed to inject preimage: %w", err)
    }

    return tx.B64Encode()
}

func (b *claimForfeitTxBuilder) getSigningClosure(vhtlcScript *vhtlc.VHTLCScript) script.Closure {
    return vhtlcScript.ClaimClosure
}
```

### Refund Forfeit Builder

```go
// pkg/swap/batch_handler.go:601-631
type refundForfeitTxBuilder struct {
    withReceiver bool
}

func (b *refundForfeitTxBuilder) buildTx(...) (string, error) {
    tx, err := buildForfeitTx(...)
    return tx.B64Encode()
}

func (b *refundForfeitTxBuilder) getSigningClosure(vhtlcScript *vhtlc.VHTLCScript) script.Closure {
    if b.withReceiver {
        return vhtlcScript.RefundClosure  // 3-of-3
    }
    return vhtlcScript.RefundWithoutReceiverClosure  // 2-of-2 after CLTV
}
```

### Core Forfeit TX Building

```go
// pkg/swap/batch_handler.go:648-681
func buildForfeitTx(
    vtxo client.TapscriptsVtxo, signingPath *psbt.TaprootTapLeafScript,
    connector *wire.TxOut, connectorOutpoint *wire.OutPoint,
    vtxoLocktime arklib.AbsoluteLocktime, vtxoSequence uint32,
    outScript []byte,
) (*psbt.Packet, error) {
    vtxoOutputScript, err := hex.DecodeString(vtxo.Script)

    vtxoTxHash, err := chainhash.NewHashFromStr(vtxo.Txid)

    inputs := []*wire.OutPoint{
        {Hash: *vtxoTxHash, Index: vtxo.VOut},
        connectorOutpoint,
    }
    sequences := []uint32{vtxoSequence, wire.MaxTxInSequenceNum}
    prevouts := []*wire.TxOut{
        {Value: int64(vtxo.Amount), PkScript: vtxoOutputScript},
        connector,
    }

    tx, err := tree.BuildForfeitTx(inputs, sequences, prevouts, outScript, uint32(vtxoLocktime))

    // Attach signing path
    tx.Inputs[0].TaprootLeafScript = []*psbt.TaprootTapLeafScript{signingPath}
    return tx, nil
}
```

---

## Creating and Signing Forfeits

```go
// pkg/swap/batch_handler.go:242-319
func (h *batchSessionHandler) createAndSignForfeits(
    ctx context.Context, connectorsLeaves []*psbt.Packet, builder forfeitTxBuilder,
) ([]string, error) {
    // Get forfeit destination
    parsedForfeitAddr, err := btcutil.DecodeAddress(h.config.ForfeitAddress, nil)
    forfeitPkScript, err := txscript.PayToAddrScript(parsedForfeitAddr)

    // Need one connector per VTXO
    if len(connectorsLeaves) != len(h.vtxosToForfeit) {
        return nil, fmt.Errorf("insufficient connectors: got %d, need %d", ...)
    }

    signedForfeitTxs := make([]string, 0, len(h.vtxosToForfeit))
    for i, vtxo := range h.vtxosToForfeit {
        connectorTx := connectorsLeaves[i]

        // Extract connector output
        connector, connectorOutpoint, err := extractConnector(connectorTx)

        // Get VHTLC script and signing closure
        vhtlcScript := h.vhtlcScripts[vtxo.Script]
        signingClosure := builder.getSigningClosure(vhtlcScript)

        // Get taproot merkle proof
        signingScript, err := signingClosure.Script()
        signingLeaf := txscript.NewBaseTapLeaf(signingScript)
        _, vtxoTapTree, err := vtxoScript.TapTree()
        proof, err := vtxoTapTree.GetTaprootMerkleProof(signingLeaf.TapHash())

        tapscript := &psbt.TaprootTapLeafScript{
            ControlBlock: proof.ControlBlock,
            Script:       proof.Script,
            LeafVersion:  txscript.BaseLeafVersion,
        }

        // Build forfeit transaction
        vtxoLocktime, vtxoSequence := extractLocktimeAndSequence(signingClosure)

        forfeitTx, err := builder.buildTx(
            vtxo, tapscript, connector, connectorOutpoint,
            vtxoLocktime, vtxoSequence, forfeitPkScript,
        )

        // Sign with ark client
        signedForfeitTx, err := h.arkClient.SignTransaction(ctx, forfeitTx)
        signedForfeitTxs = append(signedForfeitTxs, signedForfeitTx)
    }

    return signedForfeitTxs, nil
}
```

---

## Settlement Entry Points

### SettleVHTLCWithClaimPath

```go
// pkg/swap/swap.go:521-578
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

    // Get event stream
    topics := getEventTopics(session.vtxos, session.signerSession.GetPublicKey())
    eventsCh, cancel, err := h.transportClient.GetEventStream(ctx, topics)
    defer cancel()

    // Create claim handler
    claimHandler, err := newClaimBatchSessionHandler(
        h.arkClient, h.transportClient,
        intentID, session.vtxos,
        []types.Receiver{{To: session.destinationAddr, Amount: session.totalAmount}},
        preimage,
        map[string]*vhtlc.VHTLCScript{session.vtxos[0].Script: session.vhtlcScript},
        h.config, session.signerSession,
    )

    // Join batch session
    txid, err := arksdk.JoinBatchSession(ctx, eventsCh, claimHandler)
    return txid, nil
}
```

### SettleVhtlcWithRefundPath

```go
// pkg/swap/swap.go:580-637
func (h *SwapHandler) SettleVhtlcWithRefundPath(
    ctx context.Context, vhtlcOpts vhtlc.Opts,
) (string, error) {
    session, err := h.getBatchSessionArgs(ctx, vhtlcOpts, nil)

    // Build refund intent (no preimage)
    proof, message, err := getRefundIntent(session)
    signedProof, err := h.arkClient.SignTransaction(ctx, proof)

    intentID, err := h.transportClient.RegisterIntent(ctx, signedProof, message)

    topics := getEventTopics(session.vtxos, session.signerSession.GetPublicKey())
    eventsCh, cancel, err := h.transportClient.GetEventStream(ctx, topics)
    defer cancel()

    withReceiver := true
    withoutReceiver := !withReceiver
    refundHandler, err := newRefundBatchSessionHandler(
        h.arkClient, h.transportClient,
        intentID, session.vtxos,
        []types.Receiver{{To: session.destinationAddr, Amount: session.totalAmount}},
        withoutReceiver,
        map[string]*vhtlc.VHTLCScript{...},
        h.config, h.publicKey, session.signerSession,
    )

    txid, err := arksdk.JoinBatchSession(ctx, eventsCh, refundHandler)
    return txid, nil
}
```

### SettleVHTLCWithCollaborativeRefundPath

```go
// pkg/swap/swap.go:639-690
func (h *SwapHandler) SettleVHTLCWithCollaborativeRefundPath(
    ctx context.Context, vhtlcOpts vhtlc.Opts,
    partialForfeitTx, proof, message string, signerSession tree.SignerSession,
) (string, error) {
    session, err := h.getBatchSessionArgs(ctx, vhtlcOpts, &signerSession)

    // Cosign the proof (already signed by Boltz)
    signedProof, err := h.arkClient.SignTransaction(ctx, proof)

    intentId, err := h.transportClient.RegisterIntent(ctx, signedProof, message)

    withReceiver := true
    handler, err := newCollabRefundBatchSessionHandler(
        h.arkClient, h.transportClient,
        intentId, session.vtxos,
        []types.Receiver{{To: session.destinationAddr, Amount: session.totalAmount}},
        withReceiver,
        map[string]*vhtlc.VHTLCScript{...},
        h.config, session.signerSession,
        partialForfeitTx,  // Pre-signed by Boltz
    )

    topics := getEventTopics(session.vtxos, session.signerSession.GetPublicKey())
    eventsCh, cancel, err := h.transportClient.GetEventStream(ctx, topics)
    defer cancel()

    txid, err := arksdk.JoinBatchSession(ctx, eventsCh, handler)
    return txid, nil
}
```

---

## Event Flow Summary

```
1. RegisterIntent → Get intentID
2. GetEventStream → Subscribe to events
3. OnBatchStarted → Confirm registration if our intent included
4. OnTreeSigningStarted → Send nonces
5. OnTreeNonces → Aggregate nonces, sign tree
6. OnBatchFinalization → Create and submit forfeits
7. OnBatchFinalized → Done
```

## Related Skills

- `ark-sdk-batch-session` - Base JoinBatchSession() API
- `fulmine-vhtlc` - VHTLC closures used for signing paths
- `arkd-tree-construction` - Tree signing protocol
