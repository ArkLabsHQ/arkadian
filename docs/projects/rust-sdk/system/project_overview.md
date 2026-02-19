# Arkade Rust SDK (ark-rs) — Project Overview

**ark-rs** is a collection of Rust crates for building Bitcoin wallets with support for both on-chain and off-chain transactions via the Ark protocol. It is the Rust counterpart to the Go SDK (`go-sdk`), TypeScript SDK (`ts-sdk`), and .NET SDK (`dotnet-sdk`).

## What is ark-rs?

ark-rs provides everything needed to build an Ark-compatible wallet in Rust:
- Core protocol types and cryptographic operations
- Client library for connecting to arkd servers
- gRPC and REST transport layers
- BDK integration for on-chain wallet management
- Fee estimation utilities
- Boltz swap integration (Lightning Network)

## Workspace Crates

### ark-core (v0.8.0)
Core types and protocol primitives:
- `ArkAddress`: Ark address encoding/decoding (bech32)
- `Vtxo`, `VtxoList`: Virtual transaction output management
- `BoardingOutput`: On-chain boarding address generation
- `ArkNote`: Transferable payment proofs
- `CoinSelect`: VTXO coin selection algorithms
- `Intent`: Payment intent construction
- MuSig2 integration for round signing
- vHTLC: Virtual Hash Time-Locked Contracts
- Unilateral exit logic
- Transaction graph construction

### ark-client (v0.8.0)
High-level client API:
- `OfflineClient` → `Client` connection lifecycle
- `send_vtxo()`: Send off-chain payments
- `offchain_balance()`: Query balances
- `spendable_vtxos()`: List spendable VTXOs
- `get_boarding_address()`: Generate boarding addresses
- `get_offchain_address()`: Get Ark receiving address
- `transaction_history()`: Query transaction history
- Round participation and settlement
- Boltz submarine and reverse submarine swaps
- Swap storage (in-memory or SQLite)

### ark-grpc (v0.8.0)
gRPC transport layer (default):
- tonic-based gRPC client
- Protobuf message types (prost)
- Native TLS support
- Test utilities

### ark-rest (v0.8.0)
REST transport layer:
- reqwest-based HTTP client
- WASM-compatible (browser builds)
- OpenAPI-generated client types

### ark-bdk-wallet (v0.8.0)
Bitcoin Development Kit integration:
- On-chain wallet operations
- BDK wallet wrapper for Ark boarding/exit

### ark-fees (v0.8.0)
Fee estimation for Ark transactions.

## Technology Stack

- **Rust** edition 2021, MSRV 1.86
- **bitcoin** v0.32.7 for Bitcoin primitives
- **musig/secp256k1** v0.32.0-beta.2 for MuSig2 signing
- **tonic** v0.14 / **prost** v0.13 for gRPC
- **reqwest** v0.12 for REST
- **sqlx** v0.8 for optional SQLite swap storage
- **tokio** for async runtime
- **just** for task automation
- **dprint** for code formatting

## Use Cases

### Rust Wallet Application
Build a native Ark wallet with full protocol support — VTXOs, boarding, settlement, swaps.

### Backend Service
Integrate Ark payments into Rust backend services (e.g., payment processing, automated settlement).

### WASM/Browser Integration
Use `ark-core` and `ark-rest` in browser applications via WASM compilation.

### Embedded/IoT
Rust's zero-cost abstractions make ark-rs suitable for resource-constrained environments.

### Ark Protocol Developer
Reference implementation for understanding Ark protocol internals (round signing, tree construction, forfeit transactions).

## Security Model

- **Client-side key management**: Private keys never leave the client
- **MuSig2 signing**: Cooperative signing with arkd for round participation
- **Unilateral exit**: Users can exit without server cooperation
- **No eval/dynamic code**: Rust's type system prevents injection attacks
- **Constant-time crypto**: Via secp256k1 library

## Project Status

Active development, version 0.8.0 across all crates. MIT licensed.

**Repository**: https://github.com/arkade-os/rust-sdk
**MSRV**: Rust 1.86
**License**: MIT
