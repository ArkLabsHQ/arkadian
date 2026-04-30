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
| `service.go` | `Service` interface, constructor, GetInfo, embedded `arkd` gRPC client + cached `arkd` signer pubkey |
| `tx.go` | `SubmitTx` — executes Arkade Scripts on off-chain Ark transactions; when this introspector is the last non-`arkd` signer for all matched inputs, forwards the set to `arkd`, merges its sigs and finalizes |
| `intent.go` | `SubmitIntent` — validates and signs intent proofs before registration |
| `finalization.go` | `SubmitFinalization` — signs forfeits and commitment after prior validation |
| `onchain.go` | `SubmitOnchainTx` — signs plain Bitcoin PSBTs whose tapscript contains the introspector's tweaked key; rejects inputs whose tapscript closure also contains the `arkd` signer pubkey |
| `prevout.go` | Prevout fetcher implementations for Ark transactions and onchain PSBTs (used by introspection opcodes that reference previous outputs) |
| `signer.go` | Schnorr/Taproot signing with Arkade Script key tweaking; tapscript signature verification delegated to `ark-lib` |

### Arkade Script Engine (`pkg/arkade/`)

The core script VM extending Bitcoin Script. Key files:

| File | Purpose |
|------|---------|
| `engine.go` | Script execution engine, stack machine |
| `opcode.go` | Core opcode implementations (50+ opcodes) |
| `asset_opcodes.go` | Arkade Asset V1 introspection opcodes (group lookups, sums, cross-input/output) |
| `bignum.go` | Sign-magnitude little-endian BigNum arithmetic with int64 fast path; powers all VM arithmetic and CLTV/CSV |
| `introspector_packet.go` | Encode/decode + `Validate()` for the per-input script + witness Introspector Packet (TLV inside ARK extension OP_RETURN) |
| `psbt_fields.go` | Custom PSBT field definitions (e.g. `prevouttx` for `SubmitOnchainTx` introspection) |
| `script.go` | High-level Arkade script wrapper (closure pubkeys, hash, execute) |
| `stack.go` | Stack data structure and `PushBigNum` / `PopBigNum` / `PeekBigNum` helpers |
| `tokenizer.go` | Script tokenization and parsing |
| `tweak.go` | Key tweaking for Arkade Script signing (`introspector_key + tagged_hash("ArkScriptHash", script)`) |
| `*_fuzz_test.go` | Fuzz harnesses for tokenizer, opcodes, and engine |

### Client Library (`pkg/client/`)

- **transport_client.go**: `TransportClient` interface + gRPC implementation

### Configuration (`internal/config/`)

- **config.go**: Viper-based config loading from `INTROSPECTOR_*` environment variables

## Data Flow

### SubmitTx Flow
```
1. Client sends ArkTx PSBT + Checkpoint PSBTs
2. Find Introspector Packet (ARK extension, type 0x01) in ArkTx OP_RETURN
3. Index checkpoints by txid
4. For each entry in the Introspector Packet:
   a. Read Arkade Script + witness from packet entry; verify input has tweaked pubkey
   b. Execute script against transaction
   c. If valid: sign input with tweaked key
   d. Find matching checkpoint, sign it too
5. If this introspector is the last required non-arkd signer for ALL matched inputs:
   a. Submit signed ArkTx + Checkpoints to arkd via embedded gRPC client
   b. Merge arkd's checkpoint signatures, finalize the ArkTx
   c. Return finalized ArkTx + updated Checkpoint PSBTs
   Otherwise: return only this introspector's added signatures.
```

### SubmitOnchainTx Flow
```
1. Client sends a plain Bitcoin PSBT
2. Build prevout fetcher (uses optional `prevouttx` PSBT unknown when present)
3. Find Introspector Packet in the OP_RETURN
4. For each entry:
   a. Read Arkade Script from packet; ensure the input tapscript carries the introspector's tweaked key
   b. Reject if the same tapscript closure also contains the arkd signer pubkey
   c. Execute script against transaction
   d. Sign input with tweaked key
5. Return signed PSBT
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
