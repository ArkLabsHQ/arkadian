# Virtual HTLC (VHTLC) in Fulmine

Virtual HTLCs (VHTLCs) enable Lightning-style Hash Time-Locked Contracts within the Ark protocol, making atomic swaps between Ark VTXOs and Lightning channels possible. This document explains VHTLC mechanics, implementation, and usage.

## What is a VHTLC?

A **VHTLC (Virtual Hash Time-Locked Contract)** is a specialized VTXO (Virtual Transaction Output) in the Ark protocol that implements HTLC semantics:

- **Hash-locked**: Funds can be claimed by revealing a preimage for a given hash
- **Time-locked**: Funds can be refunded after a timeout period
- **Atomic**: Either the claim succeeds or the refund succeeds - never both
- **Virtual**: Exists off-chain in Ark's VTXO tree structure

VHTLCs bridge Ark and Lightning by providing HTLC-style conditional payments within Ark's off-chain environment.

## Purpose and Use Case

VHTLCs solve a critical problem: **How do you perform atomic swaps between Ark VTXOs and Lightning payments?**

Traditional HTLCs work on-chain or in Lightning channels, but not in Ark's VTXO tree. VHTLCs extend the HTLC pattern to Ark, enabling:

1. **Submarine swaps**: Lock Ark funds with a hash; Boltz pays Lightning invoice and reveals preimage to claim
2. **Reverse submarine swaps**: Boltz locks Ark funds with a hash; user reveals preimage to claim after paying Lightning invoice
3. **Ark-to-Ark conditional payments**: Future use case for conditional transfers within Ark

## VHTLC Structure

A VHTLC is a taproot output with multiple spending paths (tapscript leaves):

### Collaborative Paths (With Ark Server Cooperation)

1. **Claim** (Receiver + Server + Preimage):
   ```
   <preimage> HASH160 <hash> EQUAL
   <receiver_pubkey> CHECKSIG <server_pubkey> CHECKSIGADD 2 EQUAL
   ```
   Requires preimage + signatures from receiver and Ark server.

2. **Refund with Receiver** (Sender + Receiver + Server):
   ```
   <sender_pubkey> CHECKSIG <receiver_pubkey> CHECKSIGADD <server_pubkey> CHECKSIGADD 3 EQUAL
   ```
   Requires signatures from all three parties (cooperative refund).

3. **Refund without Receiver** (Sender + Server + CLTV):
   ```
   <refund_locktime> CHECKLOCKTIMEVERIFY DROP
   <sender_pubkey> CHECKSIG <server_pubkey> CHECKSIGADD 2 EQUAL
   ```
   Requires absolute locktime to pass, then sender + server signatures.

### Unilateral Paths (Without Ark Server Cooperation)

4. **Unilateral Claim** (Receiver + Preimage + CSV):
   ```
   <unilateral_claim_delay> CHECKSEQUENCEVERIFY DROP
   <preimage> HASH160 <hash> EQUAL
   <receiver_pubkey> CHECKSIG
   ```
   Requires relative locktime to pass, then preimage + receiver signature.

5. **Unilateral Refund with Receiver** (Sender + Receiver + CSV):
   ```
   <unilateral_refund_delay> CHECKSEQUENCEVERIFY DROP
   <sender_pubkey> CHECKSIG <receiver_pubkey> CHECKSIGADD 2 EQUAL
   ```
   Requires longer relative locktime, then sender + receiver signatures.

6. **Unilateral Refund without Receiver** (Sender + CSV):
   ```
   <unilateral_refund_without_receiver_delay> CHECKSEQUENCEVERIFY DROP
   <sender_pubkey> CHECKSIG
   ```
   Requires longest relative locktime, then only sender signature.

### Delay Hierarchy

Delays ensure the correct spending path is always economically rational:

```
UnilateralClaimDelay < UnilateralRefundDelay < UnilateralRefundWithoutReceiverDelay
```

Typical values:
- Unilateral claim delay: 512 seconds (≈8.5 minutes)
- Unilateral refund delay: 1024 seconds (≈17 minutes)
- Unilateral refund without receiver delay: 2048 seconds (≈34 minutes)

## Implementation

### VHTLC Package (`pkg/vhtlc/`)

The VHTLC implementation is in `pkg/vhtlc/vhtlc.go`:

#### Opts Structure

```go
type Opts struct {
    Sender                               *btcec.PublicKey
    Receiver                             *btcec.PublicKey
    Server                               *btcec.PublicKey
    PreimageHash                         []byte  // 20-byte RIPEMD160(SHA256(preimage))
    RefundLocktime                       arklib.AbsoluteLocktime
    UnilateralClaimDelay                 arklib.RelativeLocktime
    UnilateralRefundDelay                arklib.RelativeLocktime
    UnilateralRefundWithoutReceiverDelay arklib.RelativeLocktime
}
```

#### VHTLCScript Structure

```go
type VHTLCScript struct {
    script.TapscriptsVtxoScript

    Sender                                 *btcec.PublicKey
    Receiver                               *btcec.PublicKey
    Server                                 *btcec.PublicKey
    ClaimClosure                           *script.ConditionMultisigClosure
    RefundClosure                          *script.MultisigClosure
    RefundWithoutReceiverClosure           *script.CLTVMultisigClosure
    UnilateralClaimClosure                 *script.ConditionCSVMultisigClosure
    UnilateralRefundClosure                *script.CSVMultisigClosure
    UnilateralRefundWithoutReceiverClosure *script.CSVMultisigClosure

    preimageConditionScript []byte
}
```

#### Key Methods

**NewVHTLCScript**: Creates VHTLC script from options
```go
func NewVHTLCScript(opts Opts) (*VHTLCScript, error)
```

**Address**: Computes Ark address for the VHTLC
```go
func (v *VHTLCScript) Address(hrp string, serverPubkey *btcec.PublicKey) (string, error)
```

**ClaimTapscript**: Returns tapscript and control block for claiming with preimage
```go
func (v *VHTLCScript) ClaimTapscript() (*waddrmgr.Tapscript, error)
```

**RefundTapscript**: Returns tapscript and control block for refunding (with or without receiver)
```go
func (v *VHTLCScript) RefundTapscript(withReceiver bool) (*waddrmgr.Tapscript, error)
```

### Validation

VHTLC creation validates all parameters:
- Sender, receiver, and server public keys are provided
- Preimage hash is exactly 20 bytes (RIPEMD160 output size)
- All locktime values are non-zero
- Seconds-based locktimes are ≥512 and multiples of 512 (Bitcoin consensus rules)

## VHTLC Lifecycle

### Creation (Submarine Swap Example)

1. **User wants to pay Lightning invoice**
2. **Extract payment hash** from invoice (RIPEMD160 of preimage)
3. **Create VHTLC** with:
   - Sender: User's public key
   - Receiver: Boltz's public key
   - Server: Ark server's public key
   - PreimageHash: From invoice
   - Timeouts: Provided by Boltz
4. **Compute VHTLC address** using taproot key
5. **Send funds to VHTLC address** on Ark
6. **Boltz pays Lightning invoice** and learns preimage
7. **Boltz claims VHTLC** by revealing preimage

### Claim Flow

**Collaborative claim** (normal case):
1. Receiver (Boltz) creates claim transaction
2. Receiver adds preimage to witness
3. Receiver signs transaction
4. Ark server cosigns transaction
5. Transaction submitted to Ark
6. Funds transferred to receiver's wallet

**Unilateral claim** (if Ark server is unavailable):
1. Wait for UnilateralClaimDelay to pass
2. Receiver creates claim transaction with CSV timelock
3. Receiver adds preimage to witness
4. Receiver signs transaction
5. Transaction submitted to Ark without server signature
6. Funds transferred after CSV delay

### Refund Flow

**Cooperative refund** (preferred):
1. Sender detects swap failure
2. Sender creates refund transaction
3. Sender signs transaction
4. Receiver (Boltz) cosigns via API
5. Ark server cosigns transaction
6. Transaction submitted to Ark
7. Funds returned to sender

**Refund without receiver cooperation**:
1. Wait for RefundLocktime (absolute) to pass
2. Sender creates refund transaction with CLTV
3. Sender signs transaction
4. Ark server cosigns transaction
5. Transaction submitted to Ark
6. Funds returned to sender

**Unilateral refund without receiver**:
1. Wait for UnilateralRefundWithoutReceiverDelay to pass
2. Sender creates refund transaction with CSV
3. Sender signs transaction (no cosigners needed)
4. Transaction submitted to Ark
5. Funds returned to sender after CSV delay

## API Endpoint: Refund Without Receiver

Fulmine exposes a REST endpoint for unilateral refunds:

```bash
POST /api/v1/vhtlc/refundWithoutReceiver
Content-Type: application/json

{
  "preimage_hash": "abc123..."
}
```

**Use case**: Receiver (Boltz) is offline or uncooperative, and RefundLocktime has passed. This endpoint allows the sender to reclaim funds without receiver participation.

**Requirements**:
- RefundLocktime must have passed
- Sender must know the preimage hash
- Transaction will be signed by sender + Ark server only

**Response**:
```json
{
  "redeem_txid": "def456..."
}
```

## Security Considerations

### Preimage Generation

Preimages must be cryptographically random:
```go
preimage := make([]byte, 32)
if _, err := rand.Read(preimage); err != nil {
    return err
}
```

Never use predictable preimages - this allows attackers to claim VHTLCs before the intended recipient.

### Hash Function

VHTLCs use **RIPEMD160(SHA256(preimage))** for the hash function:
1. SHA256 provides 256-bit security
2. RIPEMD160 reduces to 160 bits for script size efficiency
3. Matches Lightning Network invoice hash format

### Timeout Configuration

Timeouts must be carefully chosen:
- **Too short**: Legitimate claims may fail due to network delays
- **Too long**: Funds locked for extended periods on failure

Boltz typically sets:
- Refund locktime: 144 blocks (≈24 hours)
- Unilateral delays: 512-2048 seconds

### Verification Before Funding

**Always verify VHTLC parameters** before sending funds:
1. Compute expected VHTLC address from parameters
2. Compare with address provided by counterparty (Boltz)
3. If mismatch, abort - possible scam attempt

Fulmine performs this verification automatically in the swap handler.

## Refund Mechanisms Comparison

| Refund Type | Cooperative | Timeout | Signers | Use Case |
|-------------|-------------|---------|---------|----------|
| Cooperative refund | Yes | None | Sender + Receiver + Server | Normal swap failure |
| Refund without receiver | Partly | Absolute (CLTV) | Sender + Server | Receiver offline |
| Unilateral refund with receiver | No | Relative (CSV) | Sender + Receiver | Server offline |
| Unilateral refund without receiver | No | Relative (CSV) | Sender only | Receiver + Server offline |

**Priority**: Always attempt cooperative refund first. Use unilateral methods only when necessary.

## Troubleshooting

### VHTLC Not Detected

**Problem**: Boltz claims VHTLC not funded.

**Solutions**:
- Verify transaction submitted to Ark successfully
- Check VHTLC address matches expected address
- Confirm Ark round has finalized
- Query Ark indexer for VTXO by script

### Claim Fails

**Problem**: Preimage revealed but claim transaction rejected.

**Solutions**:
- Verify preimage hash matches VHTLC parameter
- Check Ark server is online and responding
- Ensure no CSV delay required (collaborative path)
- Try unilateral claim if collaborative fails

### Refund Times Out

**Problem**: Refund locktime passed but transaction rejected.

**Solutions**:
- Confirm locktime has truly passed (check block height)
- Use correct refund path (with/without receiver)
- Verify signatures are valid
- Try unilateral refund if cooperative fails

### Invalid Timelock Values

**Problem**: VHTLC creation fails with timelock validation error.

**Solutions**:
- Ensure seconds-based timelocks are ≥512 and multiples of 512
- Verify delay hierarchy: claim < refund < refund_without_receiver
- Use block-based timelocks if seconds-based don't apply

## Performance Characteristics

### VHTLC Size

A VHTLC taproot output is:
- **Output size**: 43 bytes (standard P2TR)
- **Script tree**: 6 leaves (6 spending paths)
- **Witness size**: Varies by path (150-300 bytes)

### Claim Speed

- **Collaborative claim**: Instant (one Ark round)
- **Unilateral claim**: Delayed by UnilateralClaimDelay (typically 8-17 minutes)

### Refund Speed

- **Cooperative refund**: Instant (one Ark round)
- **Refund without receiver**: Delayed by RefundLocktime (typically 24 hours)
- **Unilateral refund**: Delayed by UnilateralRefundWithoutReceiverDelay (typically 34 minutes)

## Future Enhancements

Potential improvements to VHTLC implementation:
- **Multi-hop VHTLCs**: Chain multiple VHTLCs for routing
- **Partial claims**: Claim only part of VHTLC amount
- **VHTLC forwarding**: Forward VHTLCs within Ark (like Lightning routing)
- **Adaptor signatures**: Scriptless VHTLCs using signature adapters

VHTLCs are a foundational primitive enabling Ark-Lightning interoperability. Understanding their mechanics is essential for working with Fulmine's swap system.

For practical usage of VHTLCs in swaps, see [swap-system.md](./swap-system.md).
