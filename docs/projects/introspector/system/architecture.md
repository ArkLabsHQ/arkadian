# Introspector — Architecture

## High-Level Architecture

Introspector follows a clean layered architecture with three main layers:

```
┌─────────────────────────────────────────┐
│           Interface Layer               │
│  internal/interface/grpc/               │
│  - gRPC service handlers                │
│  - REST gateway (meshapi)               │
│  - TLS configuration                    │
│  - Request/response marshaling          │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│          Application Layer              │
│  internal/application/                  │
│  - Service interface (SubmitTx,         │
│    SubmitIntent, SubmitFinalization)     │
│  - Arkade Script reading & execution    │
│  - Signer (Schnorr/Taproot signing)     │
│  - Transaction validation               │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│           Package Layer                 │
│  pkg/arkade/ - Script engine (50+ ops)  │
│  pkg/client/ - Go gRPC client library   │
└─────────────────────────────────────────┘
```

## Component Breakdown

### Interface Layer (`internal/interface/grpc/`)

- **service.go**: gRPC server setup with meshapi REST gateway, OpenTelemetry instrumentation
- **handlers/**: Request handlers that convert protobuf messages to application types
- **interceptors/**: gRPC interceptors (logging, tracing)
- **config.go**: Server configuration (port, TLS settings)
- **tls.go**: Auto-generated TLS certificate management

### Application Layer (`internal/application/`)

| File | Responsibility |
|------|---------------|
| `service.go` | Service interface definition, constructor, GetInfo, prevout fetcher |
| `tx.go` | SubmitTx — executes Arkade Scripts on off-chain Ark transactions |
| `intent.go` | SubmitIntent — validates and signs intent proofs before registration |
| `finalization.go` | SubmitFinalization — signs forfeits and commitment after prior validation |
| `signer.go` | Schnorr/Taproot signing with Arkade Script key tweaking |
| `utils.go` | Arkade Script reading from PSBTs, script execution wrapper |

### Arkade Script Engine (`pkg/arkade/`)

The core script VM extending Bitcoin Script. Key files:

| File | Size | Purpose |
|------|------|---------|
| `engine.go` | ~51KB | Script execution engine, stack machine |
| `opcode.go` | ~114KB | All opcode implementations (50+ opcodes) |
| `sigvalidate.go` | ~15KB | Signature validation helpers |
| `stack.go` | ~9KB | Stack data structure and operations |
| `scriptnum.go` | ~8KB | Script number encoding/decoding |
| `tokenizer.go` | ~7KB | Script tokenization and parsing |
| `psbt_field.go` | ~2KB | Custom PSBT field definitions |
| `tweak.go` | ~2KB | Key tweaking for Arkade Script signing |

### Client Library (`pkg/client/`)

- **transport_client.go**: `TransportClient` interface + gRPC implementation

### Configuration (`internal/config/`)

- **config.go**: Viper-based config loading from `INTROSPECTOR_*` environment variables

## Data Flow

### SubmitTx Flow
```
1. Client sends ArkTx PSBT + Checkpoint PSBTs
2. Index checkpoints by txid
3. For each input in ArkTx:
   a. Read Arkade Script from PSBT field
   b. Execute script against transaction
   c. If valid: sign input with tweaked key
   d. Find matching checkpoint, sign it too
4. Return signed ArkTx + signed Checkpoints
```

### SubmitIntent Flow
```
1. Client sends unsigned intent proof + register message
2. Validate register message (expiry, validity)
3. For each input (skip index 0 = message input):
   a. Read Arkade Script from PSBT field
   b. Execute script
   c. If valid: sign input
   d. If index 1: also sign message input (index 0)
4. Return signed proof
```

### SubmitFinalization Flow
```
1. Client sends signed intent + forfeits + connector tree + commitment tx
2. Verify intent has signer's signature (proof of prior execution)
3. For each forfeit:
   a. Match input to signed intent outpoints
   b. Validate connector is in the tree
   c. Sign forfeit with tweaked key
4. If boarding inputs remain: sign commitment tx
5. Return signed forfeits + signed commitment
```

## Security Model

- **Key Derivation**: Signer key is tweaked per-script using `ComputeArkadeScriptPrivateKey(secretKey, scriptHash)`, preventing key reuse across different scripts
- **Script Validation**: Transactions are only signed after successful Arkade Script execution
- **Connector Tree Validation**: Forfeits are validated against the connector tree structure
- **Intent Verification**: Finalization requires proof that intent was previously signed
- **TLS**: Auto-generated TLS certificates (can be disabled for development)
