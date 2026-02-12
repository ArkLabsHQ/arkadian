---
name: arkd-grpc-api
description: arkd gRPC API and protobuf definitions - service endpoints, message types, streaming events
---

# arkd gRPC API

## When to Use

Use this skill when:
- Implementing or debugging gRPC client integrations
- Understanding the API for batch processing (settlement rounds)
- Working with off-chain transaction APIs (SubmitTx, FinalizeTx)
- Handling streaming events from the server
- Understanding protobuf message structures
- Building custom clients for arkd

## Key Concepts

### 1. API Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     arkd gRPC API                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Server Info                                                     │
│  ────────────                                                    │
│  • GetInfo ─────────────────────────► Server config & params     │
│                                                                  │
│  Settlement (Batch Processing)                                   │
│  ─────────────────────────────                                   │
│  • RegisterIntent ──────────────────► Register for settlement    │
│  • DeleteIntent ────────────────────► Remove registration        │
│  • ConfirmRegistration ─────────────► Confirm selection          │
│  • SubmitTreeNonces ────────────────► MuSig2 nonces              │
│  • SubmitTreeSignatures ────────────► MuSig2 signatures          │
│  • SubmitSignedForfeitTxs ──────────► Forfeit transactions       │
│  • GetEventStream ──────────────────► Real-time batch events     │
│                                                                  │
│  Off-chain Transactions                                          │
│  ──────────────────────                                          │
│  • SubmitTx ────────────────────────► Submit off-chain tx        │
│  • FinalizeTx ──────────────────────► Finalize off-chain tx      │
│  • GetPendingTx ────────────────────► Get pending txs            │
│  • GetTransactionsStream ───────────► Real-time tx notifications │
│                                                                  │
│  Utilities                                                       │
│  ─────────                                                       │
│  • EstimateIntentFee ───────────────► Fee estimation             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Service Endpoint Categories

| Category | Endpoints | Purpose |
|----------|-----------|---------|
| **Info** | `GetInfo` | Server configuration and parameters |
| **Settlement** | `RegisterIntent`, `ConfirmRegistration`, etc. | Batch round participation |
| **Off-chain TX** | `SubmitTx`, `FinalizeTx` | Direct VTXO spending |
| **Streaming** | `GetEventStream`, `GetTransactionsStream` | Real-time notifications |

### 3. HTTP REST Mapping

All endpoints have REST equivalents via meshapi gateway annotations.

## Code Patterns

### Pattern 1: ArkService Definition

```protobuf
service ArkService {
  // Server information
  rpc GetInfo(GetInfoRequest) returns (GetInfoResponse) {
    option (meshapi.gateway.http) = {
      get: "/v1/info"
    };
  }

  // Settlement endpoints
  rpc RegisterIntent(RegisterIntentRequest) returns (RegisterIntentResponse) {
    option (meshapi.gateway.http) = {
      post: "/v1/batch/registerIntent"
      body: "*"
    };
  }

  rpc EstimateIntentFee(EstimateIntentFeeRequest) returns (EstimateIntentFeeResponse) {
    option (meshapi.gateway.http) = {
      post: "/v1/batch/estimateFee"
      body: "*"
    };
  }

  rpc DeleteIntent(DeleteIntentRequest) returns (DeleteIntentResponse) {
    option (meshapi.gateway.http) = {
      post: "/v1/batch/deleteIntent"
      body: "*"
    };
  }

  rpc ConfirmRegistration(ConfirmRegistrationRequest) returns (ConfirmRegistrationResponse) {
    option (meshapi.gateway.http) = {
      post: "/v1/batch/ack"
      body: "*"
    };
  }

  // MuSig2 tree signing
  rpc SubmitTreeNonces(SubmitTreeNoncesRequest) returns (SubmitTreeNoncesResponse) {
    option (meshapi.gateway.http) = {
      post: "/v1/batch/tree/submitNonces"
      body: "*"
    };
  }

  rpc SubmitTreeSignatures(SubmitTreeSignaturesRequest) returns (SubmitTreeSignaturesResponse) {
    option (meshapi.gateway.http) = {
      post: "/v1/batch/tree/submitSignatures"
      body: "*"
    };
  }

  rpc SubmitSignedForfeitTxs(SubmitSignedForfeitTxsRequest) returns (SubmitSignedForfeitTxsResponse) {
    option (meshapi.gateway.http) = {
      post: "/v1/batch/submitForfeitTxs"
      body: "*"
    };
  }

  // Streaming events
  rpc GetEventStream(GetEventStreamRequest) returns (stream GetEventStreamResponse) {
    option (meshapi.gateway.http) = {
      get: "/v1/batch/events"
    };
  }

  // Off-chain transactions
  rpc SubmitTx(SubmitTxRequest) returns (SubmitTxResponse) {
    option (meshapi.gateway.http) = {
      post: "/v1/tx/submit"
      body: "*"
    };
  }

  rpc FinalizeTx(FinalizeTxRequest) returns (FinalizeTxResponse) {
    option (meshapi.gateway.http) = {
      post: "/v1/tx/finalize"
      body: "*"
    };
  }

  rpc GetPendingTx(GetPendingTxRequest) returns (GetPendingTxResponse) {
    option (meshapi.gateway.http) = {
      post: "/v1/tx/pending"
      body: "*"
    };
  }

  rpc GetTransactionsStream(GetTransactionsStreamRequest) returns (stream GetTransactionsStreamResponse) {
    option (meshapi.gateway.http) = {
      get: "/v1/txs"
    };
  }
}
```
**Source**: `arkd/api-spec/protobuf/ark/v1/service.proto:8-152`

### Pattern 2: GetInfo Response

```protobuf
message GetInfoRequest {}

message GetInfoResponse {
  string version = 1;              // Server version
  string signer_pubkey = 2;        // ASP's signing pubkey (hex)
  string forfeit_pubkey = 3;       // Forfeit pubkey (hex)
  string forfeit_address = 4;      // Forfeit address
  string checkpoint_tapscript = 5; // Checkpoint exit tapscript (hex)
  string network = 6;              // "bitcoin", "testnet", "signet", "regtest"
  int64 session_duration = 7;      // Round duration in seconds
  int64 unilateral_exit_delay = 8; // Exit delay (blocks or seconds)
  int64 boarding_exit_delay = 9;   // Boarding exit delay
  int64 utxo_min_amount = 10;      // Min boarding UTXO (sats)
  int64 utxo_max_amount = 11;      // Max boarding UTXO (-1 = no limit)
  int64 vtxo_min_amount = 12;      // Min VTXO amount (sats)
  int64 vtxo_max_amount = 13;      // Max VTXO amount (-1 = no limit)
  int64 dust = 14;                 // Dust threshold (sats)
  FeeInfo fees = 15;               // Fee information
  ScheduledSession scheduled_session = 16;
  repeated DeprecatedSigner deprecated_signers = 17;
  map<string, string> service_status = 18;
  string digest = 19;              // Config digest for change detection
}
```
**Source**: `arkd/api-spec/protobuf/ark/v1/service.proto:154-175`

### Pattern 3: Intent Message

```protobuf
// Intent encapsulates the proof and message for settlement registration
message Intent {
  string proof = 1;    // BIP-322 signature proof (PSBT)
  string message = 2;  // Signed message containing intent details
}

// Used for registration
message RegisterIntentRequest {
  Intent intent = 1;
}

message RegisterIntentResponse {
  string intent_id = 1;  // UUID assigned to the intent
}

// Used for fee estimation
message EstimateIntentFeeRequest {
  Intent intent = 1;
}

message EstimateIntentFeeResponse {
  int64 fee = 1;  // Estimated fee in satoshis
}

// Used for deletion
message DeleteIntentRequest {
  Intent intent = 1;  // Must include proof of ownership of inputs
}

message DeleteIntentResponse {}
```
**Source**: `arkd/api-spec/protobuf/ark/v1/types.proto:51-54`, `arkd/api-spec/protobuf/ark/v1/service.proto:177-198`

### Pattern 4: MuSig2 Tree Signing

```protobuf
// Submit nonces for tree signing
message SubmitTreeNoncesRequest {
  string batch_id = 1;              // Round ID
  string pubkey = 2;                // Cosigner pubkey (hex)
  map<string, string> tree_nonces = 3;  // txid -> public nonce (hex)
}

message SubmitTreeNoncesResponse {}

// Submit signatures for tree signing
message SubmitTreeSignaturesRequest {
  string batch_id = 1;                     // Round ID
  string pubkey = 2;                       // Cosigner pubkey (hex)
  map<string, string> tree_signatures = 3; // txid -> partial sig (hex)
}

message SubmitTreeSignaturesResponse {}
```
**Source**: `arkd/api-spec/protobuf/ark/v1/service.proto:205-217`

### Pattern 5: Forfeit Transaction Submission

```protobuf
message SubmitSignedForfeitTxsRequest {
  // Forfeit txs signed by the user
  repeated string signed_forfeit_txs = 1;
  // Signed commitment tx (required if registering boarding UTXO)
  string signed_commitment_tx = 2;
}

message SubmitSignedForfeitTxsResponse {}
```
**Source**: `arkd/api-spec/protobuf/ark/v1/service.proto:219-225`

### Pattern 6: Event Stream

```protobuf
message GetEventStreamRequest {
  repeated string topics = 1;  // Filter by topics (optional)
}

message GetEventStreamResponse {
  oneof event {
    BatchStartedEvent batch_started = 1;
    BatchFinalizationEvent batch_finalization = 2;
    BatchFinalizedEvent batch_finalized = 3;
    BatchFailedEvent batch_failed = 4;
    TreeSigningStartedEvent tree_signing_started = 5;
    TreeNoncesAggregatedEvent tree_nonces_aggregated = 6;
    TreeTxEvent tree_tx = 7;
    TreeSignatureEvent tree_signature = 8;
    TreeNoncesEvent tree_nonces = 9;
    Heartbeat heartbeat = 10;
  }
}
```
**Source**: `arkd/api-spec/protobuf/ark/v1/service.proto:227-243`

### Pattern 7: Batch Events

```protobuf
// Sent when a new batch round starts
message BatchStartedEvent {
  string id = 1;                          // Round ID
  repeated string intent_id_hashes = 2;   // Hashes of selected intents
  int64 batch_expiry = 3;                 // VTXO expiry timestamp
}

// Sent when tree signing should begin
message TreeSigningStartedEvent {
  string id = 1;                          // Round ID
  repeated string cosigners_pubkeys = 2;  // All cosigner pubkeys
  string unsigned_commitment_tx = 3;      // Unsigned commitment tx (PSBT)
}

// Sent after all nonces are aggregated
message TreeNoncesAggregatedEvent {
  string id = 1;                          // Round ID
  map<string,string> tree_nonces = 2;     // txid -> aggregated nonce
}

// Sent when batch enters finalization
message BatchFinalizationEvent {
  string id = 1;                          // Round ID
  string commitment_tx = 2;               // Commitment tx for signing
}

// Sent when batch is fully finalized
message BatchFinalizedEvent {
  string id = 1;                          // Round ID
  string commitment_txid = 2;             // Confirmed commitment txid
}

// Sent if batch fails
message BatchFailedEvent {
  string id = 1;
  string reason = 2;
}
```
**Source**: `arkd/api-spec/protobuf/ark/v1/types.proto:89-108`

### Pattern 8: Tree Events (for debugging/monitoring)

```protobuf
// Individual tree transaction event
message TreeTxEvent {
  string id = 1;                         // Round ID
  repeated string topic = 2;             // Event topics
  int32 batch_index = 3;                 // Position in batch
  string txid = 4;                       // Transaction ID
  string tx = 5;                         // Transaction (PSBT)
  map<uint32, string> children = 6;      // output index -> child txid
}

// Individual nonces event (per signer)
message TreeNoncesEvent {
  string id = 1;
  repeated string topic = 2;
  string txid = 3;
  map<string, string> nonces = 4;        // pubkey -> musig2 public nonce
}

// Individual signature event
message TreeSignatureEvent {
  string id = 1;
  repeated string topic = 2;
  int32 batch_index = 3;
  string txid = 4;
  string signature = 5;                  // Final Schnorr signature
}
```
**Source**: `arkd/api-spec/protobuf/ark/v1/types.proto:121-143`

### Pattern 9: Off-chain Transaction API

```protobuf
// Submit an off-chain transaction
message SubmitTxRequest {
  string signed_ark_tx = 1;      // User-signed Ark TX (PSBT)
  repeated string checkpoint_txs = 2;  // Unsigned checkpoint TXs
}

message SubmitTxResponse {
  string ark_txid = 1;                     // Ark TX ID
  string final_ark_tx = 2;                 // Co-signed Ark TX
  repeated string signed_checkpoint_txs = 3;  // Server-signed checkpoints
}

// Finalize an off-chain transaction
message FinalizeTxRequest {
  string ark_txid = 1;                     // Ark TX ID
  repeated string final_checkpoint_txs = 2; // Fully signed checkpoints
}

message FinalizeTxResponse {}

// Get pending transactions
message GetPendingTxRequest {
  oneof identifier {
    Intent intent = 1;  // Proof of ownership of inputs
  }
}

message GetPendingTxResponse {
  repeated PendingTx pending_txs = 1;
}

message PendingTx {
  string ark_txid = 1;
  string final_ark_tx = 2;
  repeated string signed_checkpoint_txs = 3;
}
```
**Source**: `arkd/api-spec/protobuf/ark/v1/service.proto:245-268`, `arkd/api-spec/protobuf/ark/v1/types.proto:76-80`

### Pattern 10: Transaction Stream

```protobuf
message GetTransactionsStreamRequest {}

message GetTransactionsStreamResponse {
  oneof data {
    TxNotification commitment_tx = 1;  // Commitment tx event
    TxNotification ark_tx = 2;         // Off-chain tx event
    Heartbeat heartbeat = 3;           // Keep-alive
  }
}

message TxNotification {
  string txid = 1;
  string tx = 2;
  repeated Vtxo spent_vtxos = 3;       // VTXOs consumed
  repeated Vtxo spendable_vtxos = 4;   // New VTXOs created
  map<string, TxData> checkpoint_txs = 5;  // For off-chain tx only
}
```
**Source**: `arkd/api-spec/protobuf/ark/v1/service.proto:270-277`, `arkd/api-spec/protobuf/ark/v1/types.proto:38-45`

### Pattern 11: Core Types

```protobuf
message Outpoint {
  string txid = 1;
  uint32 vout = 2;
}

message Input {
  Outpoint outpoint = 1;
  Tapscripts taproot_tree = 2;
}

message Tapscripts {
  repeated string scripts = 1;  // Hex-encoded tapscripts
}

message Vtxo {
  Outpoint outpoint = 1;
  uint64 amount = 2;
  string script = 3;               // Output script (hex)
  int64 created_at = 4;            // Unix timestamp
  int64 expires_at = 5;            // Unix timestamp
  repeated string commitment_txids = 6;  // Commitment chain
  bool is_preconfirmed = 7;
  bool is_swept = 8;
  bool is_unrolled = 9;
  bool is_spent = 10;
  string spent_by = 11;            // Spending tx ID
  string settled_by = 12;          // Settlement commitment txid
  string ark_txid = 13;            // Off-chain tx ID
}
```
**Source**: `arkd/api-spec/protobuf/ark/v1/types.proto:7-31`

### Pattern 12: Fee Information

```protobuf
message FeeInfo {
  IntentFeeInfo intent_fee = 1;  // Per-intent fees
  string tx_fee_rate = 2;        // Transaction fee rate (sat/vB)
}

message IntentFeeInfo {
  string offchain_input = 1;     // Fee per off-chain input (sats)
  string offchain_output = 2;    // Fee per off-chain output (sats)
  string onchain_input = 3;      // Fee per on-chain input (sats)
  string onchain_output = 4;     // Fee per on-chain output (sats)
}

message ScheduledSession {
  int64 next_start_time = 1;     // Unix timestamp
  int64 next_end_time = 2;       // Unix timestamp
  int64 period = 3;              // Period in seconds
  int64 duration = 4;            // Duration in seconds
  FeeInfo fees = 5;              // Session-specific fees
}
```
**Source**: `arkd/api-spec/protobuf/ark/v1/types.proto:56-74`

### Pattern 13: Error Handling

```protobuf
message ErrorDetails {
  int32 code = 1;                  // Error code
  string name = 2;                 // Error name
  string message = 3;              // Human-readable message
  map<string, string> metadata = 4; // Additional context
}
```
**Source**: `arkd/api-spec/protobuf/ark/v1/types.proto:148-153`

## File References

| Purpose | File | Key Types |
|---------|------|-----------|
| Service definition | `arkd/api-spec/protobuf/ark/v1/service.proto` | `ArkService` |
| Core types | `arkd/api-spec/protobuf/ark/v1/types.proto` | `Vtxo`, `Intent`, `Outpoint`, events |
| Admin API | `arkd/api-spec/protobuf/ark/v1/admin.proto` | Admin operations |
| Wallet API | `arkd/api-spec/protobuf/ark/v1/wallet.proto` | Wallet operations |
| Indexer API | `arkd/api-spec/protobuf/ark/v1/indexer.proto` | Indexer operations |
| gRPC handler | `arkd/internal/interface/grpc/service.go` | Server implementation |

## Common Operations

### Operation 1: Get Server Info (Go SDK)

```go
info, err := client.GetInfo(ctx)
if err != nil {
    return err
}

fmt.Printf("Network: %s\n", info.Network)
fmt.Printf("Signer: %s\n", info.SignerPubkey)
fmt.Printf("Session Duration: %d seconds\n", info.SessionDuration)
```

### Operation 2: Register Intent for Settlement

```go
// Build BIP-322 proof
proof, message := buildIntentProof(vtxos, receivers)

resp, err := client.RegisterIntent(ctx, &arkv1.RegisterIntentRequest{
    Intent: &arkv1.Intent{
        Proof:   proof,
        Message: message,
    },
})
if err != nil {
    return err
}

intentId := resp.IntentId
```

### Operation 3: Listen to Event Stream

```go
stream, err := client.GetEventStream(ctx, &arkv1.GetEventStreamRequest{})
if err != nil {
    return err
}

for {
    event, err := stream.Recv()
    if err != nil {
        return err
    }

    switch e := event.Event.(type) {
    case *arkv1.GetEventStreamResponse_BatchStarted:
        fmt.Printf("Batch started: %s\n", e.BatchStarted.Id)
    case *arkv1.GetEventStreamResponse_TreeSigningStarted:
        handleTreeSigning(e.TreeSigningStarted)
    case *arkv1.GetEventStreamResponse_TreeNoncesAggregated:
        handleNoncesAggregated(e.TreeNoncesAggregated)
    case *arkv1.GetEventStreamResponse_BatchFinalized:
        fmt.Printf("Batch finalized: %s\n", e.BatchFinalized.CommitmentTxid)
    }
}
```

### Operation 4: Submit Off-chain Transaction

```go
// Submit transaction
submitResp, err := client.SubmitTx(ctx, &arkv1.SubmitTxRequest{
    SignedArkTx:   signedArkTx,
    CheckpointTxs: checkpointTxs,
})
if err != nil {
    return err
}

// Finalize transaction
_, err = client.FinalizeTx(ctx, &arkv1.FinalizeTxRequest{
    ArkTxid:            submitResp.ArkTxid,
    FinalCheckpointTxs: finalCheckpointTxs,
})
```

## Gotchas & Edge Cases

1. **Intent Proof Format**: The proof is a BIP-322 signed PSBT. The message contains serialized intent data. Both must be valid.

2. **Event Ordering**: Events in `GetEventStream` arrive in sequence. Handle each event type and respond appropriately before the next phase timeout.

3. **Heartbeats**: Streams include periodic heartbeat messages. Use these to detect connection health.

4. **Topic Filtering**: `GetEventStreamRequest.topics` allows filtering. Leave empty to receive all events.

5. **Concurrent Streams**: Multiple clients can open event streams. Each receives the same events.

6. **REST vs gRPC**: REST endpoints are auto-generated from gRPC. Streaming endpoints use SSE for REST.

7. **Error Details**: gRPC errors include `ErrorDetails` in trailer metadata. Parse for detailed error info.

8. **Commitment Chain**: `Vtxo.commitment_txids` is the chain from leaf to root. Order matters for validation.

9. **Fee Estimation**: `EstimateIntentFee` returns fees without actually registering. Use for UI previews.

10. **Pending TX Cleanup**: Pending transactions expire if not finalized. Track `ark_txid` for retry logic.

---
**Skill Owner**: ark-developer
**Repos**: arkd
