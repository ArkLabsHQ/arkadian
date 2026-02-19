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
1. Indexes checkpoint transactions by txid
2. For each input in the Ark transaction:
   - Reads Arkade Script from custom PSBT field
   - Executes the script against the transaction
   - Signs input with tweaked key on success
   - Finds and signs the matching checkpoint transaction
3. Returns all signed PSBTs

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
}
```
