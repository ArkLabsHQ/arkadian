---
name: ark-sdk-batch-session
description: Batch session event handling and round participation - joining rounds, signing trees, processing events
---

# SDK Batch Session for Ark

## When to Use

Use this skill when:
- Implementing round participation for Settle operations
- Handling batch session events (tree signing, nonces, finalization)
- Understanding the client-side round lifecycle
- Processing streaming events from the ASP
- Implementing custom batch event handlers
- Debugging round participation issues

## Key Concepts

### 1. Batch Session Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    BATCH SESSION FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. JoinBatchSession(intent) ──► Connects to ASP stream          │
│                          │                                       │
│                          ▼                                       │
│  2. BatchStarted ──► Receive batch parameters (round ID, etc.)  │
│                          │                                       │
│                          ▼                                       │
│  3. TreeSigningStarted ──► Receive unsigned VTXO tree           │
│                          │                                       │
│                          ▼                                       │
│  4. Create tree signer, generate nonces, send to server         │
│                          │                                       │
│                          ▼                                       │
│  5. TreeNoncesAggregated ──► Receive aggregated nonces          │
│                          │                                       │
│                          ▼                                       │
│  6. Sign tree with aggregated nonces, send partial sigs         │
│                          │                                       │
│                          ▼                                       │
│  7. BatchFinalization ──► Round is being finalized              │
│                          │                                       │
│                          ▼                                       │
│  8. BatchFinalized ──► Round complete, VTXOs created            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Batch States

| State | Description |
|-------|-------------|
| `start` | Initial state, waiting for batch to begin |
| `batchStarted` | Batch parameters received |
| `treeSigningStarted` | Tree received, ready for nonce generation |
| `treeNoncesAggregated` | Aggregated nonces received, ready for signing |
| `batchFinalization` | Signing complete, finalization in progress |

### 3. Event Types

| Event | Purpose |
|-------|---------|
| `BatchStarted` | Round initiated, contains batch ID and parameters |
| `TreeSigningStarted` | VTXO tree ready for signing |
| `TreeNonces` | Individual signer's nonces (for debugging) |
| `TreeNoncesAggregated` | Combined nonces from all signers |
| `BatchFinalization` | Round being committed on-chain |
| `BatchFinalized` | Round complete, commitment confirmed |

## Code Patterns

### Pattern 1: BatchEventsHandler Interface

```go
type BatchEventsHandler interface {
    // Called when batch starts - receive round parameters
    HandleBatchStarted(
        roundID string,
        unsignedVtxoTree *tree.TxTree,
        batchOutSweepTapscript []byte,
    ) error

    // Called when tree is ready for signing
    HandleTreeSigningStarted(
        cosigners []*btcec.PublicKey,
        unsignedVtxoTree *tree.TxTree,
    ) (nonces tree.TreeNonces, err error)

    // Called when all nonces are aggregated
    HandleTreeNoncesAggregated(
        aggregatedNonces tree.TreeNonces,
    ) (sigs tree.TreePartialSigs, err error)

    // Called during finalization
    HandleBatchFinalization(
        signedVtxoTree *tree.TxTree,
        connectorTxs []*wire.MsgTx,
        roundTx string,
    ) error

    // Called when batch is fully finalized
    HandleBatchFinalized(
        roundTxid string,
    ) error
}
```
**Source**: `go-sdk/batch_session.go:26-53`

### Pattern 2: JoinBatchSession Function

```go
func JoinBatchSession(
    ctx context.Context,
    arkClient client.TransportClient,  // gRPC/REST client
    handler BatchEventsHandler,         // Event handler
    intent client.Intent,               // User's settlement intent
) error {
    // Create batch event stream from server
    eventCh, err := arkClient.JoinBatchSession(ctx, intent)
    if err != nil {
        return err
    }

    // Current state in the state machine
    currentState := start

    // Process events from stream
    for event := range eventCh {
        if event.Err != nil {
            return event.Err
        }

        switch e := event.Event.(type) {
        case client.BatchStarted:
            // Handle batch start...
        case client.TreeSigningStarted:
            // Handle tree signing...
        // ... other events
        }
    }

    return nil
}
```
**Source**: `go-sdk/batch_session.go:55-166`

### Pattern 3: State Machine Transitions

```go
const (
    start                 = "start"
    batchStarted          = "batchStarted"
    treeSigningStarted    = "treeSigningStarted"
    treeNoncesAggregated  = "treeNoncesAggregated"
    batchFinalization     = "batchFinalization"
)

// Valid state transitions
switch currentState {
case start:
    // Can transition to: batchStarted
    if event is BatchStarted {
        currentState = batchStarted
    }

case batchStarted:
    // Can transition to: treeSigningStarted
    if event is TreeSigningStarted {
        currentState = treeSigningStarted
    }

case treeSigningStarted:
    // Can transition to: treeNoncesAggregated
    if event is TreeNoncesAggregated {
        currentState = treeNoncesAggregated
    }

case treeNoncesAggregated:
    // Can transition to: batchFinalization
    if event is BatchFinalization {
        currentState = batchFinalization
    }

case batchFinalization:
    // Terminal state - BatchFinalized ends the loop
}
```
**Source**: `go-sdk/batch_session.go:57-165`

### Pattern 4: Handling BatchStarted Event

```go
case client.BatchStarted:
    if currentState != start {
        return fmt.Errorf(
            "invalid state transition: %s -> batchStarted",
            currentState,
        )
    }

    // Parse the unsigned VTXO tree
    unsignedVtxoTree, err := tree.FromFlatTxTree(e.UnsignedVtxoTree)
    if err != nil {
        return err
    }

    // Notify handler
    if err := handler.HandleBatchStarted(
        e.RoundID,
        unsignedVtxoTree,
        e.BatchOutSweepTapscript,
    ); err != nil {
        return err
    }

    currentState = batchStarted
```
**Source**: `go-sdk/batch_session.go:72-96`

### Pattern 5: Handling TreeSigningStarted Event

```go
case client.TreeSigningStarted:
    if currentState != batchStarted {
        return fmt.Errorf(
            "invalid state transition: %s -> treeSigningStarted",
            currentState,
        )
    }

    // Parse cosigner public keys
    cosigners := make([]*btcec.PublicKey, 0, len(e.Cosigners))
    for _, c := range e.Cosigners {
        pubkeyBytes, _ := hex.DecodeString(c)
        pubkey, _ := schnorr.ParsePubKey(pubkeyBytes)
        cosigners = append(cosigners, pubkey)
    }

    // Parse unsigned tree
    unsignedVtxoTree, _ := tree.FromFlatTxTree(e.UnsignedVtxoTree)

    // Handler generates nonces
    nonces, err := handler.HandleTreeSigningStarted(cosigners, unsignedVtxoTree)
    if err != nil {
        return err
    }

    // Send nonces to server
    serializedNonces := serializeNonces(nonces)
    if err := arkClient.SendTreeNonces(ctx, e.RoundID, serializedNonces); err != nil {
        return err
    }

    currentState = treeSigningStarted
```
**Source**: `go-sdk/batch_session.go:98-131`

### Pattern 6: Handling TreeNoncesAggregated Event

```go
case client.TreeNoncesAggregated:
    if currentState != treeSigningStarted {
        return fmt.Errorf(
            "invalid state transition: %s -> treeNoncesAggregated",
            currentState,
        )
    }

    // Parse aggregated nonces
    aggregatedNonces := deserializeNonces(e.AggregatedNonces)

    // Handler signs the tree
    sigs, err := handler.HandleTreeNoncesAggregated(aggregatedNonces)
    if err != nil {
        return err
    }

    // Send partial signatures to server
    serializedSigs := serializeSigs(sigs)
    if err := arkClient.SendTreeSigs(ctx, e.RoundID, serializedSigs); err != nil {
        return err
    }

    currentState = treeNoncesAggregated
```
**Source**: `go-sdk/batch_session.go:133-158`

### Pattern 7: Default Batch Events Handler

```go
type defaultBatchEventsHandler struct {
    wallet              wallet.WalletService
    explorer            explorer.Explorer
    signerSession       tree.SignerSession
    batchOutSweepClosure []byte
    cosigners           []*btcec.PublicKey
    unsignedVtxoTree    *tree.TxTree
    signedVtxoTree      *tree.TxTree
    connectorTxs        []*wire.MsgTx
    roundTx             string
    roundTxid           string
}

func NewDefaultBatchEventsHandler(
    wallet wallet.WalletService,
    explorer explorer.Explorer,
) BatchEventsHandler {
    return &defaultBatchEventsHandler{
        wallet:   wallet,
        explorer: explorer,
    }
}
```
**Source**: `go-sdk/batch_session.go:168-190`

### Pattern 8: Default Handler - BatchStarted

```go
func (h *defaultBatchEventsHandler) HandleBatchStarted(
    roundID string,
    unsignedVtxoTree *tree.TxTree,
    batchOutSweepTapscript []byte,
) error {
    h.unsignedVtxoTree = unsignedVtxoTree
    h.batchOutSweepClosure = batchOutSweepTapscript
    return nil
}
```
**Source**: `go-sdk/batch_session.go:192-200`

### Pattern 9: Default Handler - TreeSigningStarted

```go
func (h *defaultBatchEventsHandler) HandleTreeSigningStarted(
    cosigners []*btcec.PublicKey,
    unsignedVtxoTree *tree.TxTree,
) (tree.TreeNonces, error) {
    ctx := context.Background()
    h.cosigners = cosigners
    h.unsignedVtxoTree = unsignedVtxoTree

    // Create a new tree signer session using the wallet
    signerSession, err := h.wallet.NewVtxoTreeSigner(ctx, "")
    if err != nil {
        return nil, err
    }
    h.signerSession = signerSession

    // Calculate batch output amount from tree root
    batchOutAmount := h.unsignedVtxoTree.Root.Outputs[0].Value

    // Initialize the signer session
    if err := signerSession.Init(
        h.batchOutSweepClosure,
        batchOutAmount,
        h.unsignedVtxoTree,
    ); err != nil {
        return nil, err
    }

    // Generate and return nonces
    return signerSession.GetNonces()
}
```
**Source**: `go-sdk/batch_session.go:202-232`

### Pattern 10: Default Handler - TreeNoncesAggregated

```go
func (h *defaultBatchEventsHandler) HandleTreeNoncesAggregated(
    aggregatedNonces tree.TreeNonces,
) (tree.TreePartialSigs, error) {
    // Set the aggregated nonces on the signer session
    h.signerSession.SetAggregatedNonces(aggregatedNonces)

    // Generate partial signatures for all tree transactions
    return h.signerSession.Sign()
}
```
**Source**: `go-sdk/batch_session.go:234-243`

### Pattern 11: Default Handler - BatchFinalization

```go
func (h *defaultBatchEventsHandler) HandleBatchFinalization(
    signedVtxoTree *tree.TxTree,
    connectorTxs []*wire.MsgTx,
    roundTx string,
) error {
    h.signedVtxoTree = signedVtxoTree
    h.connectorTxs = connectorTxs
    h.roundTx = roundTx
    return nil
}
```
**Source**: `go-sdk/batch_session.go:245-255`

### Pattern 12: Default Handler - BatchFinalized

```go
func (h *defaultBatchEventsHandler) HandleBatchFinalized(
    roundTxid string,
) error {
    h.roundTxid = roundTxid
    return nil
}

// Getter methods for results
func (h *defaultBatchEventsHandler) SignedVtxoTree() *tree.TxTree {
    return h.signedVtxoTree
}

func (h *defaultBatchEventsHandler) ConnectorTxs() []*wire.MsgTx {
    return h.connectorTxs
}

func (h *defaultBatchEventsHandler) RoundTx() string {
    return h.roundTx
}

func (h *defaultBatchEventsHandler) RoundTxid() string {
    return h.roundTxid
}
```
**Source**: `go-sdk/batch_session.go:257-280`

### Pattern 13: Nonce Serialization

```go
func serializeNonces(nonces tree.TreeNonces) map[string]string {
    result := make(map[string]string, len(nonces))
    for txid, nonce := range nonces {
        result[txid] = hex.EncodeToString(nonce.PubNonce[:])
    }
    return result
}

func deserializeNonces(serialized map[string]string) tree.TreeNonces {
    result := make(tree.TreeNonces, len(serialized))
    for txid, nonceHex := range serialized {
        nonceBytes, _ := hex.DecodeString(nonceHex)
        nonce := &tree.Musig2Nonce{}
        copy(nonce.PubNonce[:], nonceBytes)
        result[txid] = nonce
    }
    return result
}
```
**Source**: `go-sdk/batch_session.go:282-310`

### Pattern 14: Signature Serialization

```go
func serializeSigs(sigs tree.TreePartialSigs) map[string]string {
    result := make(map[string]string, len(sigs))
    for txid, sig := range sigs {
        result[txid] = hex.EncodeToString(sig.S[:])
    }
    return result
}
```
**Source**: `go-sdk/batch_session.go:312-330`

### Pattern 15: Using Batch Session in Settle

```go
// Inside arkClient.Settle():
func (a *arkClient) Settle(ctx context.Context, opts ...Option) (string, error) {
    // Create settlement intent
    intent := client.Intent{
        Inputs:  selectedCoins,
        Outputs: receivers,
    }

    // Create event handler
    handler := NewDefaultBatchEventsHandler(a.wallet, a.explorer)

    // Join the batch session and process all events
    if err := JoinBatchSession(ctx, a.client, handler, intent); err != nil {
        return "", err
    }

    // Get results from handler
    roundTxid := handler.RoundTxid()
    signedTree := handler.SignedVtxoTree()

    // Update local state with new VTXOs...

    return roundTxid, nil
}
```
**Source**: `go-sdk/client.go:523-600` (conceptual - actual implementation in Settle)

## File References

| Purpose | File | Key Types/Functions |
|---------|------|---------------------|
| Batch session | `go-sdk/batch_session.go` | `JoinBatchSession`, `BatchEventsHandler` |
| Default handler | `go-sdk/batch_session.go` | `defaultBatchEventsHandler`, `NewDefaultBatchEventsHandler` |
| Transport client | `go-sdk/client/interface.go` | `TransportClient`, `Intent` |
| Event types | `go-sdk/client/types.go` | `BatchStarted`, `TreeSigningStarted`, etc. |
| Tree nonces | `arkd/pkg/ark-lib/tree/musig2.go` | `TreeNonces`, `TreePartialSigs` |
| Signer session | `arkd/pkg/ark-lib/tree/musig2.go` | `SignerSession` |
| Wallet service | `go-sdk/wallet/wallet.go` | `WalletService`, `NewVtxoTreeSigner` |

## Common Operations

### Operation 1: Basic Settlement with Batch Session

```go
// The Settle function internally uses JoinBatchSession
txid, err := client.Settle(ctx)
if err != nil {
    return err
}
fmt.Printf("Settled in round: %s\n", txid)
```

### Operation 2: Custom Batch Events Handler

```go
type myHandler struct {
    *defaultBatchEventsHandler
    onProgress func(state string)
}

func (h *myHandler) HandleBatchStarted(
    roundID string,
    unsignedVtxoTree *tree.TxTree,
    batchOutSweepTapscript []byte,
) error {
    h.onProgress("batch_started")
    return h.defaultBatchEventsHandler.HandleBatchStarted(
        roundID, unsignedVtxoTree, batchOutSweepTapscript,
    )
}

// Use custom handler
handler := &myHandler{
    defaultBatchEventsHandler: NewDefaultBatchEventsHandler(wallet, explorer),
    onProgress: func(state string) {
        log.Printf("Progress: %s", state)
    },
}
```

### Operation 3: Monitoring Batch Progress

```go
type progressHandler struct {
    BatchEventsHandler
    states []string
}

func (h *progressHandler) HandleBatchStarted(...) error {
    h.states = append(h.states, "started")
    return h.BatchEventsHandler.HandleBatchStarted(...)
}

func (h *progressHandler) HandleTreeSigningStarted(...) (tree.TreeNonces, error) {
    h.states = append(h.states, "signing")
    return h.BatchEventsHandler.HandleTreeSigningStarted(...)
}

// After JoinBatchSession completes:
fmt.Printf("States traversed: %v\n", handler.states)
```

### Operation 4: Error Handling in Batch Session

```go
err := JoinBatchSession(ctx, arkClient, handler, intent)
if err != nil {
    switch {
    case strings.Contains(err.Error(), "invalid state transition"):
        // Server sent events out of order - bug or network issue
        log.Error("Protocol violation - out of order events")
    case strings.Contains(err.Error(), "context canceled"):
        // Client canceled the operation
        log.Info("Batch session canceled by user")
    case strings.Contains(err.Error(), "round failed"):
        // Round was aborted by server
        log.Warn("Round failed - will retry in next round")
    default:
        log.Errorf("Batch session error: %v", err)
    }
}
```

## Gotchas & Edge Cases

1. **State Machine Ordering**: Events MUST arrive in order: BatchStarted → TreeSigningStarted → TreeNoncesAggregated → BatchFinalization → BatchFinalized. Out-of-order events cause errors.

2. **Single Round Per Session**: Each `JoinBatchSession` call participates in exactly ONE round. For multiple rounds, call it multiple times.

3. **Nonce Security**: Nonces generated in `HandleTreeSigningStarted` contain secret data. The signer session manages this internally - don't expose the secret nonce.

4. **Aggregated Nonces Required**: You CANNOT sign until you receive `TreeNoncesAggregated`. Attempting to sign earlier will fail.

5. **Handler Reuse**: Don't reuse a `defaultBatchEventsHandler` across multiple rounds. Create a fresh handler for each round.

6. **Context Cancellation**: If the context is canceled mid-session, the round continues server-side. Your VTXOs may still be locked in that round.

7. **Tree Validation**: The signed tree in `BatchFinalization` should be validated before storing. Use `tree.ValidateTreeSigs()`.

8. **Connector Transactions**: `connectorTxs` in BatchFinalization are used for connector tree spending. Store them if you need to trace fund flow.

9. **Round Failures**: If any signer fails to respond, the round may be aborted. Handle `round failed` errors gracefully.

10. **Concurrent Settling**: Don't call `Settle` concurrently from the same wallet. The wallet's signer session is not thread-safe for concurrent rounds.

---
**Skill Owner**: ark-developer
**Repos**: go-sdk
