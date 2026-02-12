---
name: ark-musig2-signing
description: MuSig2 distributed signing protocol for Ark transaction trees - nonce generation, aggregation, partial signatures
---

# MuSig2 Signing for Ark

## When to Use

Use this skill when:
- Implementing distributed signing for VTXO trees
- Working with nonce generation and aggregation
- Creating partial signatures for tree transactions
- Coordinating multi-party signing sessions
- Validating tree signatures
- Understanding the signer/coordinator session pattern

## Key Concepts

### 1. MuSig2 Protocol Overview

MuSig2 is a multi-signature scheme for Schnorr signatures. In Ark:
- Multiple parties (users + ASP) collaboratively sign transaction trees
- Each party generates nonces, aggregates them, then produces partial signatures
- Partial signatures are combined into a single valid Schnorr signature

### 2. Two-Round Protocol

**Round 1 - Nonce Exchange:**
1. Each signer generates secret nonces (never shared)
2. Each signer shares public nonces
3. Coordinator aggregates all public nonces

**Round 2 - Signing:**
1. Each signer uses aggregated nonce + secret nonce to create partial signature
2. Coordinator collects and combines partial signatures
3. Result: single valid Schnorr signature

### 3. Session Types

- **SignerSession**: Used by individual signers (users)
- **CoordinatorSession**: Used by the aggregator (ASP)

### 4. Tree-Wide Signing

In Ark, entire transaction trees are signed at once:
- Each transaction in the tree gets its own set of nonces
- `TreeNonces`: map of txid → public nonce
- `TreePartialSigs`: map of txid → partial signature

## Code Patterns

### Pattern 1: Nonce Structure

```go
type Musig2Nonce struct {
    PubNonce [66]byte  // Two compressed points (33 bytes each)
}

// TreeNonces maps txid to public nonce for each tree transaction
type TreeNonces map[string]*Musig2Nonce

// TreePartialSigs maps txid to partial signature
type TreePartialSigs map[string]*musig2.PartialSignature
```
**Source**: `arkd/pkg/ark-lib/tree/musig2.go:26-98`

### Pattern 2: SignerSession Interface

```go
type SignerSession interface {
    // Initialize with batch output info and vtxo tree
    Init(batchOutSweepClosure []byte, batchOutAmount int64, vtxoTree *TxTree) error

    // Get this signer's public key
    GetPublicKey() string

    // Generate and return public nonces for all tree transactions
    GetNonces() (TreeNonces, error)

    // Set the aggregated nonces from coordinator
    SetAggregatedNonces(TreeNonces)

    // Alternative: aggregate nonces incrementally per-txid
    AggregateNonces(txid string, pubkeyNonces map[string]*Musig2Nonce) (hasAllNonces bool, err error)

    // Generate partial signatures for all transactions
    Sign() (TreePartialSigs, error)
}
```
**Source**: `arkd/pkg/ark-lib/tree/musig2.go:167-175`

### Pattern 3: CoordinatorSession Interface

```go
type CoordinatorSession interface {
    // Add a signer's public nonces
    AddNonce(*btcec.PublicKey, TreeNonces)

    // Add and validate a signer's partial signatures
    // Returns shouldBan=true if signature is invalid (malicious signer)
    AddSignatures(*btcec.PublicKey, TreePartialSigs) (shouldBan bool, err error)

    // Aggregate all collected nonces
    AggregateNonces() (TreeNonces, error)

    // Get all public nonces by pubkey
    GetPublicNonces() map[string]TreeNonces

    // Combine all partial signatures into final tree
    SignTree() (*TxTree, error)
}
```
**Source**: `arkd/pkg/ark-lib/tree/musig2.go:177-184`

### Pattern 4: Creating a Signer Session

```go
// In client code (go-sdk):
func (w *bitcoinWallet) NewVtxoTreeSigner(
    ctx context.Context, derivationPath string,
) (tree.SignerSession, error) {
    // Derive signing key from wallet
    derivedPrivKey, _ := btcec.PrivKeyFromBytes(currentKey.Key)
    return tree.NewTreeSignerSession(derivedPrivKey), nil
}

// Initialize the session with tree data
session := tree.NewTreeSignerSession(privateKey)
err := session.Init(batchOutSweepClosure, batchOutAmount, vtxoTree)

// Generate nonces
nonces, err := session.GetNonces()

// After receiving aggregated nonces from coordinator
session.SetAggregatedNonces(aggregatedNonces)

// Sign
partialSigs, err := session.Sign()
```
**Source**: `go-sdk/wallet/singlekey/bitcoin_wallet.go:385-430`

### Pattern 5: Creating a Coordinator Session

```go
coordinator, err := tree.NewTreeCoordinatorSession(
    batchOutSweepClosure, batchOutAmount, vtxoTree,
)

// Collect nonces from all signers
for pubkey, nonces := range signerNonces {
    coordinator.AddNonce(pubkey, nonces)
}

// Aggregate nonces
aggregatedNonces, err := coordinator.AggregateNonces()

// Collect signatures from all signers
for pubkey, sigs := range signerSigs {
    shouldBan, err := coordinator.AddSignatures(pubkey, sigs)
    if shouldBan {
        // Malicious signer detected
    }
}

// Combine into final signed tree
signedTree, err := coordinator.SignTree()
```
**Source**: `arkd/pkg/ark-lib/tree/musig2.go:484-615`

### Pattern 6: Key Aggregation with Taproot Tweak

```go
// AggregateKeys combines multiple pubkeys into one aggregate key
// The tweak is applied for Taproot key-path spending
func AggregateKeys(pubkeys []*btcec.PublicKey, tweak []byte) (*musig2.AggregateKey, error) {
    if len(pubkeys) == 0 {
        return nil, errors.New("no pubkeys")
    }

    // Single key: just apply tweak
    if len(pubkeys) == 1 {
        res := &musig2.AggregateKey{PreTweakedKey: pubkeys[0]}
        if len(tweak) > 0 {
            res.FinalKey = txscript.ComputeTaprootOutputKey(pubkeys[0], tweak)
        } else {
            res.FinalKey = pubkeys[0]
        }
        return res, nil
    }

    // Multiple keys: use MuSig2 aggregation
    opts := make([]musig2.KeyAggOption, 0)
    if len(tweak) > 0 {
        opts = append(opts, musig2.WithTaprootKeyTweak(tweak))
    }

    key, _, _, err := musig2.AggregateKeys(pubkeys, true, opts...)
    return key, err
}
```
**Source**: `arkd/pkg/ark-lib/tree/musig2.go:186-225`

### Pattern 7: Generating Nonces

```go
func generateNonces(signerPubKey *btcec.PublicKey) func(*psbt.Packet) (*musig2.Nonces, error) {
    serializedSignerPubKey := schnorr.SerializePubKey(signerPubKey)

    return func(ptx *psbt.Packet) (*musig2.Nonces, error) {
        // Check if this signer needs to sign this transaction
        mustGenerateNonce, _, err := getCosignersPublicKeys(serializedSignerPubKey, ptx)
        if err != nil {
            return nil, err
        }

        if !mustGenerateNonce {
            return nil, nil  // Skip - not a cosigner for this tx
        }

        // Generate MuSig2 nonces
        nonce, err := musig2.GenNonces(
            musig2.WithPublicKey(signerPubKey),
        )
        return nonce, err
    }
}
```
**Source**: `arkd/pkg/ark-lib/tree/musig2.go:846-871`

### Pattern 8: Signing with Taproot Tweak

```go
func sign(
    signer *btcec.PrivateKey, batchOutSweepClosure []byte,
) func(musigParams) (*musig2.PartialSignature, error) {
    return func(params musigParams) (*musig2.PartialSignature, error) {
        // Calculate sighash
        message, err := txscript.CalcTaprootSignatureHash(
            txscript.NewTxSigHashes(params.tx.UnsignedTx, params.prevoutFetcher),
            txscript.SigHashDefault, params.tx.UnsignedTx, 0, params.prevoutFetcher,
        )
        if err != nil {
            return nil, err
        }

        // Create partial signature with Taproot tweak
        return musig2.Sign(
            params.secretNonce,      // Secret nonce from round 1
            signer,                  // Signing private key
            params.combinedNonce,    // Aggregated public nonce
            params.cosigners,        // All cosigner public keys
            [32]byte(message),       // Message to sign
            musig2.WithSortedKeys(),                      // Deterministic key ordering
            musig2.WithTaprootSignTweak(batchOutSweepClosure), // Taproot tweak
            musig2.WithFastSign(),                         // Performance optimization
        )
    }
}
```
**Source**: `arkd/pkg/ark-lib/tree/musig2.go:882-903`

### Pattern 9: Combining Partial Signatures

```go
func combineSigs(
    batchOutSweepClosure []byte, allSigs map[string]TreePartialSigs,
) func(combineSigsParams) (*schnorr.Signature, error) {
    return func(params combineSigsParams) (*schnorr.Signature, error) {
        // Get cosigner keys for this transaction
        keys, err := txutils.ParseCosignerKeysFromArkPsbt(params.tx, 0)

        // Collect partial signatures from all signers
        var combinedNonce *btcec.PublicKey
        sigs := make([]*musig2.PartialSignature, 0, len(keys))

        for _, key := range keys {
            keySigs := allSigs[hex.EncodeToString(schnorr.SerializePubKey(key))]
            s := keySigs[params.tx.UnsignedTx.TxID()]

            if s.R != nil {
                combinedNonce = s.R
            }
            sigs = append(sigs, s)
        }

        // Calculate message for verification
        message, _ := txscript.CalcTaprootSignatureHash(...)

        // Combine all partial signatures
        combineOpts := []musig2.CombineOption{
            musig2.WithTaprootTweakedCombine(
                [32]byte(message), keys, batchOutSweepClosure, true,
            ),
        }

        combinedSig := musig2.CombineSigs(combinedNonce, sigs, combineOpts...)
        return combinedSig, nil
    }
}
```
**Source**: `arkd/pkg/ark-lib/tree/musig2.go:926-1010`

### Pattern 10: Validating Tree Signatures

```go
func ValidateTreeSigs(
    batchOutSweepClosure []byte, batchOutAmount int64, vtxoTree *TxTree,
) error {
    // For each transaction in the tree
    for _, ptx := range treeToIndexedTxs(vtxoTree) {
        sig := ptx.Inputs[0].TaprootKeySpendSig
        schnorrSig, _ := schnorr.ParseSignature(sig)

        // Get aggregated key from cosigners
        cosignerPubkeys, _ := txutils.ParseCosignerKeysFromArkPsbt(ptx, 0)
        aggregateKey, _ := AggregateKeys(cosignerPubkeys, batchOutSweepClosure)

        // Calculate message
        message, _ := txscript.CalcTaprootSignatureHash(...)

        // Verify signature
        if !schnorrSig.Verify(message, aggregateKey.FinalKey) {
            return fmt.Errorf("invalid signature for txid %s", ptx.UnsignedTx.TxID())
        }
    }
    return nil
}
```
**Source**: `arkd/pkg/ark-lib/tree/musig2.go:227-292`

## File References

| Purpose | File | Key Functions/Types |
|---------|------|---------------------|
| MuSig2 session management | `arkd/pkg/ark-lib/tree/musig2.go` | `SignerSession`, `CoordinatorSession`, `TreeNonces`, `TreePartialSigs` |
| Key aggregation | `arkd/pkg/ark-lib/tree/musig2.go` | `AggregateKeys`, `ValidateTreeSigs` |
| Signer session impl | `arkd/pkg/ark-lib/tree/musig2.go` | `treeSignerSession`, `NewTreeSignerSession` |
| Coordinator session impl | `arkd/pkg/ark-lib/tree/musig2.go` | `treeCoordinatorSession`, `NewTreeCoordinatorSession` |
| Client wallet signing | `go-sdk/wallet/singlekey/bitcoin_wallet.go` | `NewVtxoTreeSigner` |
| PSBT cosigner utils | `arkd/pkg/ark-lib/txutils/psbt.go` | `ParseCosignerKeysFromArkPsbt`, `GetArkPsbtFields` |

## Common Operations

### Operation 1: Full Signing Flow (Client Side)

1. Receive vtxo tree from ASP
2. Create signer session: `tree.NewTreeSignerSession(privKey)`
3. Initialize: `session.Init(batchOutSweepClosure, batchOutAmount, vtxoTree)`
4. Generate nonces: `nonces, _ := session.GetNonces()`
5. Send nonces to ASP
6. Receive aggregated nonces from ASP
7. Set aggregated nonces: `session.SetAggregatedNonces(aggNonces)`
8. Sign: `partialSigs, _ := session.Sign()`
9. Send partial signatures to ASP

### Operation 2: Full Signing Flow (ASP/Coordinator Side)

1. Build vtxo tree
2. Create coordinator: `NewTreeCoordinatorSession(closure, amount, tree)`
3. Collect nonces from all signers: `coordinator.AddNonce(pubkey, nonces)`
4. Aggregate nonces: `aggNonces, _ := coordinator.AggregateNonces()`
5. Send aggregated nonces to all signers
6. Collect signatures: `coordinator.AddSignatures(pubkey, sigs)`
7. Combine into final tree: `signedTree, _ := coordinator.SignTree()`
8. Validate: `ValidateTreeSigs(closure, amount, signedTree)`

### Operation 3: Incremental Nonce Aggregation

For streaming/real-time scenarios, use `AggregateNonces` per-txid:
```go
for txid, pubkeyNonces := range receivedNonces {
    complete, err := session.AggregateNonces(txid, pubkeyNonces)
    if complete {
        // All nonces received, ready to sign
    }
}
```

## Gotchas & Edge Cases

1. **Secret Nonce Security**: Secret nonces (`SecNonce`) must NEVER be reused or shared. Reusing a nonce leaks the private key.

2. **Nonce Size**: Public nonces are 66 bytes (two 33-byte compressed points). Always validate length.

3. **Cosigner Verification**: Before signing, verify your pubkey is in the cosigners list for each transaction. The session handles this via `getCosignersPublicKeys`.

4. **Signature Order**: When combining signatures, the order must match the cosigner pubkey order. Use `musig2.WithSortedKeys()` for deterministic ordering.

5. **Taproot Tweak**: Always apply the taproot tweak (`batchOutSweepClosure`) when signing and combining. Without it, signatures won't verify.

6. **Malicious Signer Detection**: `AddSignatures` returns `shouldBan=true` if a signer provides invalid signatures. Ban these signers immediately.

7. **Parallel Processing**: The implementation uses `workPoolMap` for parallel signature generation. This is important for large trees.

8. **Single Key Fallback**: `AggregateKeys` handles the single-key case specially - no MuSig2 aggregation needed, just apply tweak.

9. **Derivation Path**: When creating tree signers, use the correct derivation path. Wrong path = wrong key = invalid signatures.

10. **Session State**: Signer sessions are stateful. Don't reuse a session across different trees. Create a new session for each round.

---
**Skill Owner**: ark-developer
**Repos**: arkd, go-sdk
