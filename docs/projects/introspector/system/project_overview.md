# Introspector — Project Overview

## What is Introspector?

Introspector is an **Arkade Script execution and signing microservice** for the Ark protocol. It acts as a co-signer that validates Ark transactions by executing custom Arkade Script programs before signing them with Schnorr/Taproot signatures.

Arkade Script extends Bitcoin Script with **transaction introspection opcodes** — enabling scripts to inspect their own transaction's inputs, outputs, values, and structure at execution time. This allows programmable conditions (covenants) to be enforced on Ark off-chain transactions without requiring Bitcoin consensus changes.

## Core Features

- **Arkade Script Engine**: Custom script VM with 50+ opcodes extending Bitcoin Script
  - Transaction introspection (inspect inputs, outputs, values, scripts)
  - Data manipulation (CAT, SUBSTR, LEFT, RIGHT)
  - Bitwise logic (AND, OR, XOR, INVERT)
  - 64-bit arithmetic with overflow checking
  - Elliptic curve operations (ECMULSCALARVERIFY, TWEAKVERIFY)
  - SHA256 streaming (initialize, update, finalize)
  - Stack-based signature verification (CHECKSIGFROMSTACK)
- **Off-chain Transaction Signing**: Validates and signs Ark transactions and checkpoint transactions
- **Intent Proof Signing**: Validates and signs intent proofs before round registration
- **Batch Finalization Signing**: Signs forfeit and commitment transactions after verifying the signer's prior participation
- **gRPC + REST API**: Dual interface via meshapi gateway on port 7073
- **Go Client Library**: `pkg/client` provides a ready-to-use gRPC transport client
- **TLS Support**: Auto-generated TLS certificates with configurable extra IPs/domains

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Language | Go 1.25+ |
| Transport | gRPC with REST gateway (meshapi) |
| Protobuf | Buf CLI for generation and linting |
| Crypto | btcec/v2 (secp256k1), Schnorr signatures, Taproot |
| PSBT | btcutil/psbt for transaction handling |
| Config | Viper (environment variables) |
| Logging | Logrus |
| Tracing | OpenTelemetry |
| Containerization | Docker (Alpine-based) |

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
- **Depends on ark-lib**: Uses intent, tree, script, and txutils packages from arkd
- **Depends on go-sdk**: References go-sdk types for protocol compatibility
- **Standalone service**: Runs as an independent microservice alongside arkd
