# Introspector — API Reference

## Transport

- **gRPC**: Native gRPC on port 7073
- **REST**: HTTP gateway via meshapi on the same port
- **TLS**: Enabled by default (disable with `INTROSPECTOR_NO_TLS=true`)

## Protobuf Definition

Source: `api-spec/protobuf/introspector/v1/service.proto`

## Endpoints

### GetInfo

Returns service version and signer public key.

| Field | Value |
|-------|-------|
| gRPC | `IntrospectorService/GetInfo` |
| REST | `GET /v1/info` |

**Request**: Empty

**Response**:
```json
{
  "version": "v0.0.1",
  "signer_pubkey": "02abc123..."
}
```

### SubmitTx

Submits an Ark transaction and its associated checkpoint transactions for Arkade Script validation and signing.

| Field | Value |
|-------|-------|
| gRPC | `IntrospectorService/SubmitTx` |
| REST | `POST /v1/tx` |

**Request**:
```json
{
  "ark_tx": "<base64_encoded_psbt>",
  "checkpoint_txs": ["<base64_encoded_psbt>", "..."]
}
```

**Response**:
```json
{
  "signed_ark_tx": "<base64_encoded_signed_psbt>",
  "signed_checkpoint_txs": ["<base64_encoded_signed_psbt>", "..."]
}
```

**Behavior**:
1. Locates the **Introspector Packet** (ARK extension, packet type `0x01`) in an OP_RETURN output of the Ark transaction
2. Indexes checkpoint transactions by txid
3. For each entry in the Introspector Packet:
   - Verifies the targeted input's tapscript carries the introspector's tweaked key
   - Executes the entry's Arkade Script (with its witness) against the transaction
   - Signs the input with the tweaked key on success
   - Finds and signs the matching checkpoint transaction
4. **Last non-arkd signer path**: if this introspector is the last required non-`arkd` signer for **all** matched inputs, every checkpoint PSBT must already include any other required non-`arkd` signatures (otherwise the call fails). The service then forwards the signed set to the configured `arkd` (`INTROSPECTOR_ARKD_URL`), merges `arkd`'s checkpoint signatures, finalizes the Ark transaction, and returns the finalized PSBT plus updated checkpoint PSBTs.
5. Otherwise, returns only the signatures this introspector added (`signed_ark_tx` is partially signed).

### SubmitIntent

Submits an unsigned intent proof for Arkade Script validation and signing. Must be called before intent registration in a round.

| Field | Value |
|-------|-------|
| gRPC | `IntrospectorService/SubmitIntent` |
| REST | `POST /v1/intent` |

**Request**:
```json
{
  "intent": {
    "proof": "<base64_encoded_psbt>",
    "message": "<base64_encoded_register_message>"
  }
}
```

**Response**:
```json
{
  "signed_proof": "<base64_encoded_signed_psbt>"
}
```

**Behavior**:
1. Validates the register message (checks expiry/validity timestamps)
2. Skips input index 0 (message input)
3. For each remaining input with Arkade Script:
   - Executes the script
   - Signs the input on success
   - If input index 1: also signs the message input (index 0)
4. Returns signed proof

### SubmitFinalization

Submits a batch finalization for signing. Signs forfeit and commitment transactions if the intent was previously signed by this service.

| Field | Value |
|-------|-------|
| gRPC | `IntrospectorService/SubmitFinalization` |
| REST | `POST /v1/finalization` |

**Request**:
```json
{
  "signed_intent": {
    "proof": "<base64_encoded_signed_psbt>",
    "message": "<base64_encoded_register_message>"
  },
  "forfeits": ["<base64_encoded_psbt>", "..."],
  "connector_tree": [
    {
      "txid": "<transaction_id>",
      "tx": "<base64_encoded_transaction>",
      "children": {"0": "<child_txid>", "1": "<child_txid>"}
    }
  ],
  "commitment_tx": "<base64_encoded_psbt>"
}
```

**Response**:
```json
{
  "signed_forfeits": ["<base64_encoded_signed_psbt>", "..."],
  "signed_commitment_tx": "<base64_encoded_signed_psbt>"
}
```

**Behavior**:
1. Verifies the intent proof contains this signer's signature
2. For each forfeit (must have exactly 2 inputs):
   - Matches input outpoints to signed intent outpoints
   - Validates the connector input is part of the connector tree
   - Signs the forfeit with the tweaked key
3. If unmatched inputs remain (boarding): signs the commitment transaction
4. Returns signed forfeits and optionally signed commitment

### SubmitOnchainTx

Validates and signs the inputs of a plain Bitcoin transaction whose tapscripts contain the introspector's tweaked key (e.g. a VTXO unrolled onchain). Inputs whose tapscript closure also carries the `arkd` signer pubkey are rejected — those must go through `SubmitTx` so checkpoint and forfeit checks are enforced.

| Field | Value |
|-------|-------|
| gRPC | `IntrospectorService/SubmitOnchainTx` |
| REST | `POST /v1/onchain-tx` |

**Request**:
```json
{
  "tx": "<base64_encoded_psbt>"
}
```

**Response**:
```json
{
  "signed_tx": "<base64_encoded_signed_psbt>"
}
```

Each input may carry an optional `PrevoutTxField` PSBT unknown field (key `"prevouttx"`) holding the raw previous transaction. It is only required by Arkade opcodes that introspect the previous transaction.

**Behavior**:
1. Builds a prevout fetcher from the PSBT (using optional `prevouttx` fields)
2. Locates the Introspector Packet in the transaction
3. For each entry: verifies the input is owned by the introspector's tweaked key, rejects closures containing `arkd`'s signer pubkey, executes the script, and signs the input
4. Fails if no valid input/entry pairs are found

## Introspector Packet (Wire Format)

`SubmitTx`, `SubmitIntent`, and `SubmitOnchainTx` consume an **Introspector Packet** embedded in an OP_RETURN output.

- The OP_RETURN payload is an **ARK extension**: magic `ARK` (`0x41 0x52 0x4b`) followed by a sequence of `(type, length, value)` packets.
- The Introspector Packet has type byte `0x01` and shares the envelope with other ARK packets (e.g. asset packet, type `0x00`).

Packet content layout (`varint` = Bitcoin compact size):

| Field | Type | Notes |
|-------|------|-------|
| `entry_count` | varint | Number of entries. `1 <= entry_count <= 1000`. |
| `entry[..]` | per-entry block | Repeated `entry_count` times. |

Entry block:

| Field | Type | Notes |
|-------|------|-------|
| `vin` | u16 LE | Input index. Must be unique across the packet. |
| `script_len` | varint | `1 <= script_len <= 10_000`. |
| `script` | bytes | Arkade Script bytecode. |
| `witness_len` | varint | `<= 1_000_000`. |
| `witness` | bytes | `psbt.WriteTxWitness` encoding (`varint(num_items)` + `varint(item_len) + item` per item). |

`OP_INSPECTPACKET` (`0xf4`) and `OP_INSPECTINPUTPACKET` (`0xf5`) read the raw packet bytes for a given type, so the wire format is part of the consensus surface for any Arkade script using those opcodes.

## Error Handling

All endpoints return gRPC status codes. Common errors:

| Code | Description |
|------|-------------|
| `INVALID_ARGUMENT` | Malformed PSBT, missing fields |
| `FAILED_PRECONDITION` | Arkade Script execution failed |
| `INTERNAL` | Signing error, prevout fetcher failure |

## Go Client

```go
import "github.com/ArkLabsHQ/introspector/pkg/client"

type TransportClient interface {
    GetInfo(ctx context.Context) (*Info, error)
    SubmitTx(ctx context.Context, tx string, checkpoints []string) (
        signedTx string, signedCheckpoints []string, err error,
    )
    SubmitIntent(ctx context.Context, intent Intent) (signedProof string, err error)
    SubmitFinalization(
        ctx context.Context,
        intent Intent,
        forfeits []string,
        connectorTree tree.FlatTxTree,
        commitmentTx string,
    ) (signedForfeits []string, signedCommitmentTx string, err error)
    SubmitOnchainTx(ctx context.Context, tx string) (signedTx string, err error)
}
```
