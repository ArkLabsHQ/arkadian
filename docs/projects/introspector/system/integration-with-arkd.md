# Introspector — Integration with arkd

## Overview

Introspector is a co-signing service that participates in the Ark round lifecycle. It runs alongside arkd and validates Ark transactions containing Arkade Script programs before signing them.

## Integration Points

### 1. Off-chain Transaction Signing (SubmitTx)

When arkd processes off-chain Ark transactions that contain Arkade Script conditions:

1. arkd constructs the Ark transaction and checkpoint transactions as PSBTs
2. arkd sends these to Introspector via `SubmitTx`
3. Introspector executes the Arkade Script on each relevant input
4. If scripts pass, Introspector signs both the Ark transaction and checkpoints
5. arkd receives the signed PSBTs and continues processing

### 2. Intent Registration (SubmitIntent)

Before registering an intent in an Ark round:

1. arkd constructs an unsigned intent proof PSBT
2. arkd sends it to Introspector via `SubmitIntent`
3. Introspector executes Arkade Scripts on the intent (skipping the message input at index 0)
4. If valid, Introspector signs the intent proof inputs
5. arkd uses the signed intent for round registration

### 3. Batch Finalization (SubmitFinalization)

During round finalization:

1. arkd sends the signed intent, forfeit PSBTs, connector tree, and commitment transaction
2. Introspector verifies it previously signed the intent (checks for its own signature)
3. Introspector validates each forfeit's connector against the tree
4. Signs forfeits and commitment transactions
5. arkd uses the signed transactions to complete the round

## Deployment Configuration

Introspector runs as a sidecar service to arkd:

```yaml
# docker-compose example
services:
  introspector:
    image: introspector:latest
    ports:
      - "7073:7073"
    environment:
      - INTROSPECTOR_SECRET_KEY=<hex_encoded_private_key>
      - INTROSPECTOR_NO_TLS=true  # For internal communication
    depends_on:
      - arkd
```

## Dependencies on arkd Packages

Introspector imports these arkd packages:

| Package | Usage |
|---------|-------|
| `arkd/pkg/ark-lib/intent` | Intent proof and register message types |
| `arkd/pkg/ark-lib/tree` | Transaction tree types (TxTree, FlatTxTree) |
| `arkd/pkg/ark-lib/script` | MultisigClosure decoding |
| `arkd/pkg/ark-lib/txutils` | PSBT field extraction, anchor script detection |
| `arkd/pkg/errors` | Error types |
| `arkd/pkg/macaroons` | Authentication (if enabled) |

## Network Configuration

In the regtest test environment, Introspector connects to:
- **arkd**: Port 7070/7071 (gRPC + REST)
- **arkd-wallet**: Port 6060 (wallet service)
- **Bitcoin (via nigiri)**: Regtest network

All services share the `nigiri` Docker network.
