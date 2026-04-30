# Introspector — Project Overview

## What is Introspector?

Introspector is an **Arkade Script execution and signing microservice** for the Ark protocol. It acts as a co-signer that validates Ark transactions by executing custom Arkade Script programs before signing them with Schnorr/Taproot signatures.

Arkade Script extends Bitcoin Script with **transaction introspection opcodes** — enabling scripts to inspect their own transaction's inputs, outputs, values, and structure at execution time. This allows programmable conditions (covenants) to be enforced on Ark off-chain transactions without requiring Bitcoin consensus changes.

## Core Features

- **Arkade Script Engine**: Custom script VM with 50+ opcodes extending Bitcoin Script
  - Transaction introspection (inspect inputs, outputs, values, scripts)
  - Packet introspection (`OP_INSPECTPACKET`, `OP_INSPECTINPUTPACKET`) — read raw ARK extension packets from the current tx or a previous Ark tx
  - Data manipulation (CAT, SUBSTR, LEFT, RIGHT)
  - Bitwise logic (AND, OR, XOR, INVERT)
  - Unified BigNum arithmetic (sign-magnitude little-endian) with `OP_NUM2BIN` / `OP_BIN2NUM` bridges to fixed-width byte strings — replaces legacy LE64 arithmetic
  - Elliptic curve operations (ECMULSCALARVERIFY, TWEAKVERIFY)
  - SHA256 streaming (initialize, update, finalize)
  - Asset introspection opcodes (Arkade Asset V1 packets)
  - Stack-based signature verification (CHECKSIGFROMSTACK)
- **Off-chain Transaction Signing**: Validates and signs Ark transactions and their checkpoint transactions; if this introspector is the last non-`arkd` signer for all matched inputs, it forwards the set to `arkd`, merges its signatures, finalizes and returns the finalized PSBTs
- **Onchain Transaction Signing** (`SubmitOnchainTx`): Validates and signs plain Bitcoin PSBTs whose tapscript closure contains the introspector's tweaked key (e.g. unrolled VTXOs); rejects inputs whose closure also includes the `arkd` signer pubkey to prevent bypassing offchain checks
- **Intent Proof Signing**: Validates and signs intent proofs before round registration
- **Batch Finalization Signing**: Signs forfeit and commitment transactions after verifying the signer's prior participation
- **Introspector Packet (TLV)**: Per-input script + witness payload embedded inside an ARK extension OP_RETURN output (packet type `0x01`); identifies which inputs the introspector must validate and what bytecode/witness to feed the engine
- **gRPC + REST API**: Dual interface via meshapi gateway on port 7073 — five RPCs: `GetInfo`, `SubmitTx`, `SubmitIntent`, `SubmitFinalization`, `SubmitOnchainTx`
- **Fuzz-tested**: Tokenizer, opcodes, and engine fuzz harnesses (`go test ... -fuzz=Fuzz...` in `pkg/arkade/`)
- **Go Client Library**: `pkg/client` provides a ready-to-use gRPC transport client
- **TLS Support**: Auto-generated TLS certificates with configurable extra IPs/domains

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Language | Go 1.26+ |
| Transport | gRPC with REST gateway (meshapi) |
| Protobuf | Buf CLI for generation and linting |
| Crypto | btcec/v2 (secp256k1), Schnorr signatures, Taproot; tapscript signature verification delegated to `ark-lib` |
| PSBT | btcutil/psbt for transaction handling |
| Config | Viper (environment variables) |
| Logging | Logrus |
| Tracing | OpenTelemetry |
| Containerization | Docker (Alpine-based) |
| Upstream `arkd` | 0.9.3 (regtest dev compose) |

## Use Cases

1. **Programmable Ark Transactions**: Enforce custom spending conditions on VTXOs via Arkade Script
2. **Co-signing Service**: Acts as a co-signer in multisig Taproot spending paths
3. **Smart Contract Validation**: Execute and validate Arkade Script programs before signing
4. **Round Participation**: Participates in the Ark round lifecycle (intent → finalization)

## How It Works

1. A client submits a PSBT containing Arkade Script in a custom PSBT field
2. Introspector reads the script from the PSBT, along with any witness data
3. The Arkade Script engine executes the script against the transaction
4. If execution succeeds, the signer produces a Schnorr/Taproot signature
5. The signed PSBT is returned to the client

The signer key is tweaked per-script using the Arkade Script hash, ensuring each script gets a unique derived signing key.

## Relationship to Ark Ecosystem

- **Used by arkd**: arkd submits transactions for Arkade Script validation and signing
- **Calls back to arkd**: Connects to `arkd` via gRPC at startup (`INTROSPECTOR_ARKD_URL` is required); fetches its signer pubkey and submits last-signer finalization sets in `SubmitTx`
- **Depends on ark-lib**: Uses intent, tree, script, txutils, and tapscript signature verification packages from arkd
- **Depends on go-sdk**: gRPC client (`go-sdk/client/grpc`) is the transport for the embedded `arkd` client
- **Standalone service**: Runs as an independent microservice alongside arkd
