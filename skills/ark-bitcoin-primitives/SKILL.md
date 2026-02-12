---
name: ark-bitcoin-primitives
description: Core Bitcoin/Taproot knowledge for Ark context - scripts, closures, PSBTs, Schnorr signatures
---

# Bitcoin Primitives for Ark

## When to Use

Use this skill when:
- Creating or modifying Taproot scripts for Ark transactions
- Working with script closures (MultisigClosure, CSVMultisigClosure, etc.)
- Handling PSBTs (creation, signing, finalization)
- Implementing Schnorr signature logic
- Building tapscript trees or control blocks
- Understanding VTXO script structure

## Key Concepts

### 1. Taproot Script Structure

Ark uses Taproot (P2TR) outputs extensively. A Taproot output commits to:
- **Internal key**: Usually an unspendable key for script-only paths
- **Tapscript tree**: Merkle tree of spending conditions (closures)

### 2. Unspendable Key

For script-only Taproot outputs, Ark uses NUMS (Nothing-Up-My-Sleeve) point:
```go
// H = sha256("arkd")
// UnspendableKey = G + H*G (provably no known private key)
var unspendableKeyBytes, _ = hex.DecodeString(
    "0250929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0",
)
```

### 3. Script Closures

Closures are reusable spending conditions. Each closure implements:
```go
type Closure interface {
    Leaf() (*txscript.TapLeaf, error)  // Generate tapscript leaf
    Decode(script []byte) (bool, error) // Parse from script bytes
    WitnessSize() int                   // Witness size for fee estimation
}
```

### 4. XOnly Public Keys

Taproot uses 32-byte x-only pubkeys (no parity byte):
```go
pubkey, _ := schnorr.ParsePubKey(xonlyBytes)  // 32 bytes
fullPubkey := pubkey.SerializeCompressed()     // 33 bytes with prefix
```

## Code Patterns

### Pattern 1: Creating a P2TR Script Address

```go
func P2TRScript(taprootKey *secp256k1.PublicKey) ([]byte, error) {
    return txscript.NewScriptBuilder().
        AddOp(txscript.OP_1).
        AddData(schnorr.SerializePubKey(taprootKey)).
        Script()
}
```
**Source**: `arkd/pkg/ark-lib/script/script.go:16-21`

### Pattern 2: MultisigClosure (N-of-N)

The simplest closure - requires all parties to sign:
```go
type MultisigClosure struct {
    Pubkeys []*secp256k1.PublicKey
}

func (c *MultisigClosure) Leaf() (*txscript.TapLeaf, error) {
    script, err := c.Script()
    if err != nil {
        return nil, err
    }
    leaf := txscript.NewBaseTapLeaf(script)
    return &leaf, nil
}

func (c *MultisigClosure) Script() ([]byte, error) {
    builder := txscript.NewScriptBuilder()
    for i, key := range c.Pubkeys {
        builder.AddData(schnorr.SerializePubKey(key))
        if i == 0 {
            builder.AddOp(txscript.OP_CHECKSIG)
        } else {
            builder.AddOp(txscript.OP_CHECKSIGADD)
        }
    }
    return builder.AddInt64(int64(len(c.Pubkeys))).
        AddOp(txscript.OP_NUMEQUAL).
        Script()
}
```
**Source**: `arkd/pkg/ark-lib/script/closure.go:16-76`

### Pattern 3: CSVMultisigClosure (Timelock with Multisig)

Multisig with relative timelock (OP_CHECKSEQUENCEVERIFY):
```go
type CSVMultisigClosure struct {
    MultisigClosure
    Locktime common.RelativeLocktime
}

func (c *CSVMultisigClosure) Script() ([]byte, error) {
    sequence, err := c.Locktime.Sequence()
    if err != nil {
        return nil, err
    }
    builder := txscript.NewScriptBuilder().
        AddInt64(int64(sequence)).
        AddOp(txscript.OP_CHECKSEQUENCEVERIFY).
        AddOp(txscript.OP_DROP)
    // ... then add multisig script
}
```
**Source**: `arkd/pkg/ark-lib/script/closure.go:78-133`

### Pattern 4: CLTVMultisigClosure (Absolute Timelock)

Multisig with absolute timelock (OP_CHECKLOCKTIMEVERIFY):
```go
type CLTVMultisigClosure struct {
    MultisigClosure
    Locktime common.AbsoluteLocktime
}

func (c *CLTVMultisigClosure) Script() ([]byte, error) {
    locktime, err := c.Locktime.Locktime()
    if err != nil {
        return nil, err
    }
    builder := txscript.NewScriptBuilder().
        AddInt64(int64(locktime)).
        AddOp(txscript.OP_CHECKLOCKTIMEVERIFY).
        AddOp(txscript.OP_DROP)
    // ... then add multisig script
}
```
**Source**: `arkd/pkg/ark-lib/script/closure.go:135-190`

### Pattern 5: ConditionMultisigClosure (Conditional with Preimage)

Hash-locked multisig (for HTLCs/VHTLCs):
```go
type ConditionMultisigClosure struct {
    MultisigClosure
    Condition Condition
}

type Condition struct {
    Type  ConditionType // SHA256 or HASH160
    Value []byte        // Hash value to match
}

func (c *ConditionMultisigClosure) Script() ([]byte, error) {
    builder := txscript.NewScriptBuilder()
    switch c.Condition.Type {
    case ConditionTypeSha256:
        builder.AddOp(txscript.OP_SHA256)
    case ConditionTypeHash160:
        builder.AddOp(txscript.OP_HASH160)
    }
    builder.AddData(c.Condition.Value).
        AddOp(txscript.OP_EQUALVERIFY)
    // ... then add multisig script
}
```
**Source**: `arkd/pkg/ark-lib/script/closure.go:193-287`

### Pattern 6: Building a VTXO TapTree

Standard VTXO script: `Owner + ASP | Owner after Timeout`
```go
func NewDefaultVtxoScript(
    owner, asp *secp256k1.PublicKey,
    exitDelay common.RelativeLocktime,
) VtxoScript {
    return &DefaultVtxoScript{
        Owner:     owner,
        Asp:       asp,
        ExitDelay: exitDelay,
    }
}

func (v *DefaultVtxoScript) TapTree() *txscript.IndexedTapScriptTree {
    // Leaf 0: Forfeit path - Owner + ASP sign together
    forfeitClosure := &MultisigClosure{
        Pubkeys: []*secp256k1.PublicKey{v.Owner, v.Asp},
    }
    forfeitLeaf, _ := forfeitClosure.Leaf()

    // Leaf 1: Unilateral exit - Owner after delay
    exitClosure := &CSVMultisigClosure{
        MultisigClosure: MultisigClosure{
            Pubkeys: []*secp256k1.PublicKey{v.Owner},
        },
        Locktime: v.ExitDelay,
    }
    exitLeaf, _ := exitClosure.Leaf()

    return txscript.AssembleTaprootScriptTree(*forfeitLeaf, *exitLeaf)
}
```
**Source**: `arkd/pkg/ark-lib/script/vtxo_script.go:18-86`

### Pattern 7: Computing Taproot Output Key

```go
func (v *DefaultVtxoScript) TaprootKey() (*secp256k1.PublicKey, error) {
    tapTree := v.TapTree()
    root := tapTree.RootNode.TapHash()

    taprootKey := txscript.ComputeTaprootOutputKey(
        UnspendableKey(),  // Internal key (NUMS point)
        root[:],           // Merkle root
    )
    return taprootKey, nil
}
```
**Source**: `arkd/pkg/ark-lib/script/vtxo_script.go:88-100`

### Pattern 8: Encoding/Decoding Taproot Signatures

```go
// Parse 64 or 65 byte Schnorr signature
func ParseTaprootSignature(sig []byte) (*schnorr.Signature, txscript.SigHashType, error) {
    switch len(sig) {
    case 64:
        // Default SIGHASH_DEFAULT
        parsed, err := schnorr.ParseSignature(sig)
        return parsed, txscript.SigHashDefault, err
    case 65:
        // Custom sighash type in last byte
        hashType := txscript.SigHashType(sig[64])
        parsed, err := schnorr.ParseSignature(sig[:64])
        return parsed, hashType, err
    }
    return nil, 0, fmt.Errorf("invalid signature length")
}

// Encode signature with optional sighash byte
func EncodeTaprootSignature(sig *schnorr.Signature, hashType txscript.SigHashType) []byte {
    sigBytes := sig.Serialize()
    if hashType == txscript.SigHashDefault {
        return sigBytes  // 64 bytes
    }
    return append(sigBytes, byte(hashType))  // 65 bytes
}
```
**Source**: `arkd/pkg/ark-lib/script/script.go:27-53`

## File References

| Purpose | File | Key Functions/Types |
|---------|------|---------------------|
| P2TR scripts | `arkd/pkg/ark-lib/script/script.go` | `P2TRScript`, `ParseTaprootSignature`, `EncodeTaprootSignature`, `UnspendableKey` |
| Closure interface | `arkd/pkg/ark-lib/script/closure.go` | `Closure`, `MultisigClosure`, `CSVMultisigClosure`, `CLTVMultisigClosure`, `ConditionMultisigClosure` |
| VTXO scripts | `arkd/pkg/ark-lib/script/vtxo_script.go` | `VtxoScript`, `DefaultVtxoScript`, `TapTree`, `TaprootKey` |
| Common types | `arkd/pkg/ark-lib/common/locktime.go` | `RelativeLocktime`, `AbsoluteLocktime` |
| Tree building | `arkd/pkg/ark-lib/tree/builder.go` | `BuildTxTree`, `BuildConnectorTree` |

## Common Operations

### Operation 1: Create a VTXO Taproot Address

1. Get owner pubkey and ASP pubkey
2. Define exit delay (e.g., 512 blocks)
3. Create DefaultVtxoScript
4. Call TaprootKey() to get output key
5. Use P2TRScript() to get the scriptPubKey

```go
vtxoScript := script.NewDefaultVtxoScript(ownerPubkey, aspPubkey, exitDelay)
taprootKey, _ := vtxoScript.TaprootKey()
scriptPubKey, _ := script.P2TRScript(taprootKey)
```

### Operation 2: Spend via Forfeit Path (Collaborative)

1. Both Owner and ASP must sign
2. Get forfeit closure and its leaf
3. Compute control block with merkle proof
4. Witness: `[asp_sig] [owner_sig] [forfeit_script] [control_block]`

### Operation 3: Spend via Exit Path (Unilateral)

1. Wait for CSV delay to expire
2. Only Owner signs
3. Set input sequence to satisfy CSV
4. Witness: `[owner_sig] [exit_script] [control_block]`

### Operation 4: Parse Existing VTXO Script

```go
vtxoScript := &script.DefaultVtxoScript{}
err := vtxoScript.Decode(existingScriptBytes)
// Now vtxoScript.Owner, vtxoScript.Asp, vtxoScript.ExitDelay are populated
```

## Gotchas & Edge Cases

1. **XOnly vs Compressed Keys**: Taproot uses 32-byte x-only keys. When converting, remember the parity is lost and must be derived from the full key when needed.

2. **Signature Length**: Taproot signatures are 64 bytes (SIGHASH_DEFAULT) or 65 bytes (custom sighash). Always use `ParseTaprootSignature` to handle both.

3. **Control Block Construction**: The control block includes internal key parity, leaf version, and merkle proof. Use `txscript.ComputeControlBlock` correctly.

4. **CSV vs CLTV**:
   - CSV (OP_CHECKSEQUENCEVERIFY) = relative timelock, uses input's `nSequence`
   - CLTV (OP_CHECKLOCKTIMEVERIFY) = absolute timelock, uses transaction's `nLockTime`

5. **Witness Order**: For multisig closures, signatures must be in the same order as pubkeys in the script.

6. **Unspendable Key**: Always use `UnspendableKey()` for script-only Taproot. Never use a known key as internal key if you want pure script paths.

7. **Leaf Version**: Tapscript uses leaf version `0xc0`. This is handled automatically by `txscript.NewBaseTapLeaf`.

---
**Skill Owner**: ark-developer
**Repos**: arkd
