---
name: arkd-tree-construction
description: VTXO and connector tree construction - building batch outputs, tree structures, forfeit transactions
---

# Tree Construction for arkd

## When to Use

Use this skill when:
- Building VTXO trees for settlement rounds
- Constructing connector trees for forfeit transactions
- Understanding the tree structure and traversal
- Working with batch outputs and commitments
- Building forfeit transactions
- Serializing/deserializing tree structures for storage

## Key Concepts

### 1. Tree Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMMITMENT TRANSACTION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Input: ASP Funding ───┬──► Output 0: Batch Output (VTXO Tree)  │
│                        │                                         │
│                        ├──► Output 1: Connector Output           │
│                        │                                         │
│                        └──► Output 2: Change (optional)          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         VTXO TREE                                │
│                       (Binary Radix 2)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                        [Root Node]                               │
│                       /           \                              │
│               [Branch]            [Branch]                       │
│              /       \           /       \                       │
│         [Leaf]     [Leaf]   [Leaf]     [Leaf]                   │
│            │          │        │          │                      │
│          VTXO₁      VTXO₂    VTXO₃      VTXO₄                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Tree Types

| Tree Type | Radix | Purpose |
|-----------|-------|---------|
| VTXO Tree | 2 (binary) | Creates user VTXOs from batch output |
| Connector Tree | 4 | Creates connectors for forfeit transactions |

### 3. Key Components

- **Leaf**: Represents a VTXO output with amount, script, and cosigners
- **Branch**: Internal node with children and aggregated cosigners
- **TxTree**: Recursive tree of PSBT transactions
- **FlatTxTree**: Serializable flat representation for storage

## Code Patterns

### Pattern 1: Leaf Structure

```go
// Leaf represents the output of a leaf transaction (a VTXO).
type Leaf struct {
    Script              string   // Output script (hex)
    Amount              uint64   // Satoshi amount
    CosignersPublicKeys []string // Pubkeys that must sign tree
}
```
**Source**: `arkd/pkg/ark-lib/tree/tx_tree.go:11-15`

### Pattern 2: TxTree Structure (Recursive)

```go
// TxTree is the recursive representation of tree of transactions.
type TxTree struct {
    Root     *psbt.Packet         // The PSBT for this node
    Children map[uint32]*TxTree   // output index -> child sub-tree
}
```
**Source**: `arkd/pkg/ark-lib/tree/tx_tree.go:19-22`

### Pattern 3: FlatTxTree for Storage

```go
// TxTreeNode is a flat representation of a node of tx tree.
type TxTreeNode struct {
    Txid     string              // Transaction ID
    Tx       string              // Base64 encoded PSBT
    Children map[uint32]string   // output index -> child txid
}

// FlatTxTree is the flat representation of a tx tree.
type FlatTxTree []TxTreeNode

func (c FlatTxTree) RootTxid() string {
    if len(c) == 1 {
        return c[0].Txid
    }

    // The root is the node not being a child of another one
    allchildren := make(map[string]struct{})
    for _, node := range c {
        for _, child := range node.Children {
            allchildren[child] = struct{}{}
        }
    }

    for _, node := range c {
        if _, ok := allchildren[node.Txid]; !ok {
            return node.Txid
        }
    }

    return ""
}

func (c FlatTxTree) Leaves() []TxTreeNode {
    leaves := make([]TxTreeNode, 0)
    for _, child := range c {
        if len(child.Children) == 0 {
            leaves = append(leaves, child)
        }
    }
    return leaves
}
```
**Source**: `arkd/pkg/ark-lib/tree/tx_tree.go:24-68`

### Pattern 4: Building VTXO Tree

```go
// BuildVtxoTree creates the vtxo tree from batch output to VTXO leaves.
// Radix is hardcoded to 2 (binary tree).
func BuildVtxoTree(
    rootInput *wire.OutPoint,      // Batch output being spent
    receivers []Leaf,              // VTXO outputs to create
    sweepTapTreeRoot []byte,       // Taproot tweak for sweep path
    vtxoTreeExpiry arklib.RelativeLocktime,  // When tree expires
) (*TxTree, error) {
    // Create internal tree structure from leaves
    root, err := createTxTree(receivers, sweepTapTreeRoot, vtxoTreeRadix)
    if err != nil {
        return nil, err
    }

    // Convert to TxTree with PSBT transactions
    return root.tree(rootInput, &vtxoTreeExpiry)
}
```
**Source**: `arkd/pkg/ark-lib/tree/builder.go:48-58`

### Pattern 5: Building Batch Output

```go
// BuildBatchOutput returns the taproot script and amount for commitment tx.
func BuildBatchOutput(receivers []Leaf, sweepTapTreeRoot []byte) ([]byte, int64, error) {
    root, err := createTxTree(receivers, sweepTapTreeRoot, vtxoTreeRadix)
    if err != nil {
        return nil, 0, err
    }

    // Total amount = sum of all receivers + anchor outputs
    amount := root.getAmount() + txutils.ANCHOR_VALUE

    // Aggregate all cosigner keys with sweep taproot tweak
    aggregatedKey, err := AggregateKeys(root.getCosigners(), sweepTapTreeRoot)
    if err != nil {
        return nil, 0, fmt.Errorf("failed to aggregate keys: %w", err)
    }

    // Create P2TR script for the batch output
    scriptPubkey, err := script.P2TRScript(aggregatedKey.FinalKey)
    if err != nil {
        return nil, 0, fmt.Errorf("failed to create script pubkey: %w", err)
    }

    return scriptPubkey, amount, nil
}
```
**Source**: `arkd/pkg/ark-lib/tree/builder.go:24-43`

### Pattern 6: Building Connector Tree

```go
// BuildConnectorTree creates the connector tree for forfeit transactions.
// Radix is hardcoded to 4.
func BuildConnectorTree(rootInput *wire.OutPoint, receivers []Leaf) (*TxTree, error) {
    root, err := createTxTree(receivers, nil, connectorsTreeRadix)
    if err != nil {
        return nil, err
    }

    return root.tree(rootInput, nil)
}

// BuildConnectorOutput returns the taproot script and amount for connector output.
func BuildConnectorOutput(receivers []Leaf) ([]byte, int64, error) {
    root, err := createTxTree(receivers, nil, connectorsTreeRadix)
    if err != nil {
        return nil, 0, err
    }

    amount := root.getAmount() + txutils.ANCHOR_VALUE

    aggregatedKey, err := AggregateKeys(root.getCosigners(), nil)
    if err != nil {
        return nil, 0, fmt.Errorf("failed to aggregate keys: %w", err)
    }

    scriptPubkey, err := script.P2TRScript(aggregatedKey.FinalKey)
    if err != nil {
        return nil, 0, fmt.Errorf("failed to create script pubkey: %w", err)
    }

    return scriptPubkey, amount, nil
}
```
**Source**: `arkd/pkg/ark-lib/tree/builder.go:60-94`

### Pattern 7: Internal Node Types

```go
type node interface {
    getAmount() int64                                              // Input amount
    getOutputs() ([]*wire.TxOut, error)                           // Outputs for this node
    getChildren() []node                                           // Child nodes
    getCosigners() []*btcec.PublicKey                             // Cosigner keys
    getInputScript() []byte                                        // Input script
    tree(input *wire.OutPoint, expiry *arklib.RelativeLocktime) (*TxTree, error)
}

// leaf is a terminal node (creates VTXO)
type leaf struct {
    output      *wire.TxOut
    inputScript []byte
    cosigners   []*btcec.PublicKey
}

func (l *leaf) getAmount() int64 {
    return l.output.Value
}

func (l *leaf) getOutputs() ([]*wire.TxOut, error) {
    return []*wire.TxOut{l.output, txutils.AnchorOutput()}, nil
}

// branch is an internal node with children
type branch struct {
    inputScript []byte
    cosigners   []*btcec.PublicKey
    children    []node
}

func (b *branch) getAmount() int64 {
    amount := int64(0)
    for _, child := range b.children {
        amount += child.getAmount()
        amount += txutils.ANCHOR_VALUE  // Each child gets an anchor
    }
    return amount
}

func (b *branch) getOutputs() ([]*wire.TxOut, error) {
    outputs := make([]*wire.TxOut, 0)
    for _, child := range b.children {
        outputs = append(outputs, &wire.TxOut{
            Value:    child.getAmount(),
            PkScript: child.getInputScript(),
        })
    }
    return append(outputs, txutils.AnchorOutput()), nil
}
```
**Source**: `arkd/pkg/ark-lib/tree/builder.go:96-181`

### Pattern 8: Tree Construction Algorithm

```go
// createTxTree builds tree from leaves up to root
func createTxTree(receivers []Leaf, tapTreeRoot []byte, radix int) (root node, err error) {
    if len(receivers) == 0 {
        return nil, fmt.Errorf("no receivers provided")
    }

    // Convert receivers to leaf nodes
    nodes := make([]node, 0, len(receivers))
    for _, r := range receivers {
        pkScript, _ := hex.DecodeString(r.Script)

        // Parse cosigner public keys
        cosigners := make([]*btcec.PublicKey, 0)
        for _, cosigner := range r.CosignersPublicKeys {
            pubkeyBytes, _ := hex.DecodeString(cosigner)
            pubkey, _ := btcec.ParsePubKey(pubkeyBytes)
            cosigners = append(cosigners, pubkey)
        }
        cosigners = uniqueCosigners(cosigners)

        // Create aggregated key for input script
        aggregatedKey, _ := AggregateKeys(cosigners, tapTreeRoot)
        inputScript, _ := script.P2TRScript(aggregatedKey.FinalKey)

        leafNode := &leaf{
            output:      &wire.TxOut{Value: int64(r.Amount), PkScript: pkScript},
            inputScript: inputScript,
            cosigners:   cosigners,
        }
        nodes = append(nodes, leafNode)
    }

    // Build tree bottom-up until single root
    for len(nodes) > 1 {
        nodes, err = createUpperLevel(nodes, tapTreeRoot, radix)
        if err != nil {
            return nil, fmt.Errorf("failed to create tx tree: %w", err)
        }
    }

    return nodes[0], nil
}
```
**Source**: `arkd/pkg/ark-lib/tree/builder.go:250-311`

### Pattern 9: Creating Upper Levels

```go
func createUpperLevel(nodes []node, tapTreeRoot []byte, radix int) ([]node, error) {
    if len(nodes) <= 1 {
        return nodes, nil
    }

    // If fewer nodes than radix, reduce radix
    if len(nodes) < radix {
        return createUpperLevel(nodes, tapTreeRoot, len(nodes))
    }

    // Handle remainder nodes that don't form complete group
    remainder := len(nodes) % radix
    if remainder != 0 {
        last := nodes[len(nodes)-remainder:]
        groups, err := createUpperLevel(nodes[:len(nodes)-remainder], tapTreeRoot, radix)
        if err != nil {
            return nil, err
        }
        return append(groups, last...), nil
    }

    // Group nodes into branches
    groups := make([]node, 0, len(nodes)/radix)
    for i := 0; i < len(nodes); i += radix {
        children := nodes[i : i+radix]

        // Collect all cosigners from children
        var cosigners []*btcec.PublicKey
        for _, child := range children {
            cosigners = append(cosigners, child.getCosigners()...)
        }
        cosigners = uniqueCosigners(cosigners)

        // Create aggregated key for input script
        aggregatedKey, _ := AggregateKeys(cosigners, tapTreeRoot)
        inputPkScript, _ := script.P2TRScript(aggregatedKey.FinalKey)

        branchNode := &branch{
            inputScript: inputPkScript,
            cosigners:   cosigners,
            children:    children,
        }

        groups = append(groups, branchNode)
    }
    return groups, nil
}
```
**Source**: `arkd/pkg/ark-lib/tree/builder.go:313-363`

### Pattern 10: Converting Node to TxTree

```go
func (b *branch) tree(
    initialInput *wire.OutPoint, expiry *arklib.RelativeLocktime,
) (*TxTree, error) {
    // Create PSBT for this branch
    tx, err := getTx(b, initialInput, expiry)
    if err != nil {
        return nil, err
    }

    txTree := &TxTree{
        Root:     tx,
        Children: make(map[uint32]*TxTree),
    }

    // Recursively build children
    children := b.getChildren()
    for i, child := range children {
        subTree, err := child.tree(&wire.OutPoint{
            Hash:  tx.UnsignedTx.TxHash(),
            Index: uint32(i),
        }, expiry)
        if err != nil {
            return nil, err
        }
        txTree.Children[uint32(i)] = subTree
    }

    return txTree, nil
}

func getTx(n node, input *wire.OutPoint, expiry *arklib.RelativeLocktime) (*psbt.Packet, error) {
    outputs, _ := n.getOutputs()

    // Create PSBT with version 3
    tx, _ := psbt.New([]*wire.OutPoint{input}, outputs, 3, 0, []uint32{wire.MaxTxInSequenceNum})

    updater, _ := psbt.NewUpdater(tx)
    updater.AddInSighashType(0, int(txscript.SigHashDefault))

    // Store cosigner pubkeys in PSBT custom fields
    for cosignerIndex, cosigner := range n.getCosigners() {
        txutils.SetArkPsbtField(tx, 0, txutils.CosignerPublicKeyField, txutils.IndexedCosignerPublicKey{
            Index:     cosignerIndex,
            PublicKey: cosigner,
        })
    }

    // Store expiry if provided
    if expiry != nil {
        txutils.SetArkPsbtField(tx, 0, txutils.VtxoTreeExpiryField, *expiry)
    }

    return tx, nil
}
```
**Source**: `arkd/pkg/ark-lib/tree/builder.go:183-248`

### Pattern 11: Tree Serialization

```go
// Serialize converts the tx tree into a flat list of nodes.
func (t *TxTree) Serialize() (FlatTxTree, error) {
    if t == nil {
        return make(FlatTxTree, 0), nil
    }

    nodes := make(FlatTxTree, 0)

    // Recursively serialize children first
    for _, child := range t.Children {
        childrenNodes, err := child.Serialize()
        if err != nil {
            return nil, err
        }
        nodes = append(nodes, childrenNodes...)
    }

    // Serialize this node
    node, err := t.SerializeNode()
    if err != nil {
        return nil, err
    }

    nodes = append(nodes, *node)
    return nodes, nil
}

// SerializeNode converts a single node to flat representation.
func (t *TxTree) SerializeNode() (*TxTreeNode, error) {
    if t == nil {
        return nil, fmt.Errorf("missing tx tree node")
    }

    serializedTx, _ := t.Root.B64Encode()

    // Create map of child txids
    childTxids := make(map[uint32]string)
    for outputIndex, child := range t.Children {
        childTxids[outputIndex] = child.Root.UnsignedTx.TxID()
    }

    return &TxTreeNode{
        Txid:     t.Root.UnsignedTx.TxID(),
        Tx:       serializedTx,
        Children: childTxids,
    }, nil
}
```
**Source**: `arkd/pkg/ark-lib/tree/tx_tree.go:146-191`

### Pattern 12: Tree Deserialization

```go
// NewTxTree converts a flat list of nodes to a tree of transactions.
func NewTxTree(flatTxTree FlatTxTree) (*TxTree, error) {
    if len(flatTxTree) == 0 {
        return nil, fmt.Errorf("missing serialized tx tree")
    }

    // Create map of all nodes by txid
    nodesByTxid := make(map[string]decodedTxTreeNode)
    for _, node := range flatTxTree {
        packet, _ := psbt.NewFromRawBytes(strings.NewReader(node.Tx), true)
        txid := packet.UnsignedTx.TxID()
        nodesByTxid[txid] = decodedTxTreeNode{
            Tx:       packet,
            Children: node.Children,
        }
    }

    // Find the root (node not being a child of another)
    rootTxids := make([]string, 0)
    for txid := range nodesByTxid {
        isChild := false
        for nodeTxid, node := range nodesByTxid {
            if nodeTxid == txid {
                continue
            }
            isChild = node.hasChild(txid)
            if isChild {
                break
            }
        }
        if !isChild {
            rootTxids = append(rootTxids, txid)
        }
    }

    if len(rootTxids) != 1 {
        return nil, fmt.Errorf("expected 1 root, found %d", len(rootTxids))
    }

    // Recursively build tree from root
    txTree := buildTree(rootTxids[0], nodesByTxid)

    // Verify node count matches
    if txTree.countNodes() != len(flatTxTree) {
        return nil, fmt.Errorf("node count mismatch")
    }

    return txTree, nil
}
```
**Source**: `arkd/pkg/ark-lib/tree/tx_tree.go:70-135`

### Pattern 13: Tree Traversal and Query

```go
// Leaves returns all leaf nodes (no children).
func (t *TxTree) Leaves() []*psbt.Packet {
    if len(t.Children) == 0 {
        return []*psbt.Packet{t.Root}
    }

    leaves := make([]*psbt.Packet, 0)
    for _, child := range t.Children {
        leaves = append(leaves, child.Leaves()...)
    }
    return leaves
}

// Find returns the tx in the tree matching the txid.
func (t *TxTree) Find(txid string) *TxTree {
    if t.Root.UnsignedTx.TxID() == txid {
        return t
    }

    for _, child := range t.Children {
        if f := child.Find(txid); f != nil {
            return f
        }
    }
    return nil
}

// FindInput returns the subtree spending the given outpoint.
func (t *TxTree) FindInput(txid string, vout uint32) *TxTree {
    rootInput := t.Root.UnsignedTx.TxIn[0]
    if rootInput.PreviousOutPoint.Hash.String() == txid &&
       rootInput.PreviousOutPoint.Index == vout {
        return t
    }

    for _, child := range t.Children {
        if f := child.FindInput(txid, vout); f != nil {
            return f
        }
    }
    return nil
}

// Apply executes function on all nodes in tree.
func (t *TxTree) Apply(fn func(tx *TxTree) (bool, error)) error {
    shouldContinue, err := fn(t)
    if err != nil {
        return err
    }

    if !shouldContinue {
        return nil
    }

    for _, child := range t.Children {
        if err := child.Apply(fn); err != nil {
            return err
        }
    }
    return nil
}
```
**Source**: `arkd/pkg/ark-lib/tree/tx_tree.go:262-327`

### Pattern 14: Tree Validation

```go
// Validate verifies the validity of the tx tree.
func (t *TxTree) Validate() error {
    if t.Root == nil {
        return fmt.Errorf("unexpected nil root")
    }

    // Must be version 3 transaction
    if t.Root.UnsignedTx.Version != 3 {
        return fmt.Errorf("unexpected version: %d, expected 3", t.Root.UnsignedTx.Version)
    }

    nbOfOutputs := uint32(len(t.Root.UnsignedTx.TxOut))
    nbOfInputs := uint32(len(t.Root.UnsignedTx.TxIn))

    // Each node must have exactly one input
    if nbOfInputs != 1 {
        return fmt.Errorf("unexpected number of inputs: %d, expected 1", nbOfInputs)
    }

    // Children can't exceed outputs (minus anchor)
    if len(t.Children) > int(nbOfOutputs-1) {
        return fmt.Errorf("too many children: %d, max %d", len(t.Children), nbOfOutputs-1)
    }

    for outputIndex, child := range t.Children {
        if outputIndex >= nbOfOutputs {
            return fmt.Errorf("output index %d out of bounds", outputIndex)
        }

        // Validate child recursively
        if err := child.Validate(); err != nil {
            return err
        }

        // Verify child input matches parent output
        childPrevOutpoint := child.Root.UnsignedTx.TxIn[0].PreviousOutPoint
        if childPrevOutpoint.Hash.String() != t.Root.UnsignedTx.TxID() ||
           childPrevOutpoint.Index != outputIndex {
            return fmt.Errorf("child input doesn't match parent output")
        }

        // Verify sum of child outputs equals parent output value
        childOutputsSum := int64(0)
        for _, output := range child.Root.UnsignedTx.TxOut {
            childOutputsSum += output.Value
        }

        if childOutputsSum != t.Root.UnsignedTx.TxOut[outputIndex].Value {
            return fmt.Errorf("child outputs sum mismatch: %d != %d",
                childOutputsSum, t.Root.UnsignedTx.TxOut[outputIndex].Value)
        }
    }

    return nil
}
```
**Source**: `arkd/pkg/ark-lib/tree/tx_tree.go:193-260`

### Pattern 15: Building Forfeit Transactions

```go
func BuildForfeitTx(
    inputs []*wire.OutPoint,     // VTXO + connector inputs
    sequences []uint32,          // Input sequences
    prevouts []*wire.TxOut,      // Previous outputs
    signerScript []byte,         // ASP's pubkey script
    txLocktime uint32,           // Transaction locktime
) (*psbt.Packet, error) {
    // Calculate output amount (sum of inputs minus anchor)
    sumPrevout := int64(0)
    for _, prevout := range prevouts {
        sumPrevout += prevout.Value
    }
    sumPrevout -= txutils.ANCHOR_VALUE

    forfeitOut := wire.NewTxOut(sumPrevout, signerScript)
    return BuildForfeitTxWithOutput(inputs, sequences, prevouts, forfeitOut, txLocktime)
}

func BuildForfeitTxWithOutput(
    inputs []*wire.OutPoint, sequences []uint32, prevouts []*wire.TxOut,
    forfeitOutput *wire.TxOut, txLocktime uint32,
) (*psbt.Packet, error) {
    version := int32(3)
    outs := []*wire.TxOut{forfeitOutput, txutils.AnchorOutput()}

    partialTx, _ := psbt.New(inputs, outs, version, txLocktime, sequences)

    updater, _ := psbt.NewUpdater(partialTx)
    for i, prevout := range prevouts {
        updater.AddInWitnessUtxo(prevout, i)
    }

    return partialTx, nil
}
```
**Source**: `arkd/pkg/ark-lib/tree/forfeit_tx.go:9-55`

## File References

| Purpose | File | Key Types/Functions |
|---------|------|---------------------|
| Tree structures | `arkd/pkg/ark-lib/tree/tx_tree.go` | `TxTree`, `FlatTxTree`, `TxTreeNode`, `Leaf` |
| Tree building | `arkd/pkg/ark-lib/tree/builder.go` | `BuildVtxoTree`, `BuildBatchOutput`, `BuildConnectorTree` |
| Forfeit transactions | `arkd/pkg/ark-lib/tree/forfeit_tx.go` | `BuildForfeitTx`, `BuildForfeitTxWithOutput` |
| Tree validation | `arkd/pkg/ark-lib/tree/validation.go` | Additional validation helpers |
| MuSig2 signing | `arkd/pkg/ark-lib/tree/musig2.go` | `AggregateKeys`, tree signing |

## Common Operations

### Operation 1: Build VTXO Tree for Round

```go
// During round finalization
receivers := make([]tree.Leaf, 0)
for _, intent := range intents {
    for _, r := range intent.Receivers {
        receivers = append(receivers, tree.Leaf{
            Script:              r.PubKey,
            Amount:              r.Amount,
            CosignersPublicKeys: cosignerPubkeys,
        })
    }
}

vtxoTree, err := tree.BuildVtxoTree(
    &wire.OutPoint{Hash: commitmentTxHash, Index: 0},
    receivers,
    sweepTapTreeRoot,
    vtxoTreeExpiry,
)
```

### Operation 2: Extract VTXOs from Tree

```go
func extractVtxos(vtxoTree *tree.TxTree, roundId string) []domain.Vtxo {
    vtxos := make([]domain.Vtxo, 0)

    for _, leaf := range vtxoTree.Leaves() {
        for vout, output := range leaf.UnsignedTx.TxOut {
            // Skip anchor outputs
            if output.Value == txutils.ANCHOR_VALUE {
                continue
            }

            vtxos = append(vtxos, domain.Vtxo{
                Outpoint: domain.Outpoint{
                    Txid: leaf.UnsignedTx.TxID(),
                    VOut: uint32(vout),
                },
                Amount:             uint64(output.Value),
                PubKey:             hex.EncodeToString(output.PkScript[2:]),
                RootCommitmentTxid: roundId,
            })
        }
    }
    return vtxos
}
```

### Operation 3: Serialize Tree for Storage

```go
// Serialize for database storage
flatTree, err := vtxoTree.Serialize()
if err != nil {
    return err
}

// Store flat tree
round.VtxoTree = flatTree
```

### Operation 4: Restore Tree from Storage

```go
// Restore from database
vtxoTree, err := tree.NewTxTree(round.VtxoTree)
if err != nil {
    return err
}

// Now can traverse and query
leaves := vtxoTree.Leaves()
```

## Gotchas & Edge Cases

1. **Radix Values**: VTXO tree uses radix 2 (binary), connector tree uses radix 4. These are hardcoded constants.

2. **Anchor Outputs**: Every transaction in the tree includes an anchor output (`txutils.ANCHOR_VALUE`). Don't count these as VTXOs.

3. **Cosigner Aggregation**: Branch nodes aggregate cosigners from all children. The root has ALL cosigners for the entire tree.

4. **Version 3 Transactions**: All tree transactions MUST be version 3 (required for TRUC/v3 relay policy).

5. **Single Input Rule**: Each tree transaction has exactly ONE input (the parent output or batch output for root).

6. **Sum Conservation**: Sum of child outputs MUST equal parent's output value (no fees within tree).

7. **Taproot Tweak**: The sweep tap tree root is used as the taproot tweak for key aggregation. Without it, signatures won't verify.

8. **Root Finding**: When deserializing, find root by finding the node that isn't a child of any other node.

9. **Partial Trees**: SubTree method creates a partial tree containing only paths to specific txids. Useful for sweep operations.

10. **Expiry Storage**: VTXO tree expiry is stored in PSBT custom fields (`VtxoTreeExpiryField`) for later extraction.

---
**Skill Owner**: ark-developer
**Repos**: arkd
