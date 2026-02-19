# Arkade Rust SDK — Architecture

## High-Level Architecture

ark-rs is a Cargo workspace containing 9 crates organized in a layered architecture. The crates are designed for modularity — applications can depend on individual crates or use the umbrella `ark-rs` re-export.

```
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│   (Your wallet / service / WASM app)                        │
├──────────────────────┬──────────────────────────────────────┤
│  ark-rs (re-export)  │  ark-client-sample (example)         │
├──────────────────────┴──────────────────────────────────────┤
│                   Client Layer                               │
│   ark-client                                                 │
│   - OfflineClient / Client lifecycle                        │
│   - send_vtxo, settle, balance, history                     │
│   - Boltz swap orchestration                                │
│   - Coin selection                                          │
│   - Fee estimation (via ark-fees)                           │
├─────────────────┬───────────────────────────────────────────┤
│  Transport      │  Wallet Integration                        │
│  ┌────────────┐ │  ┌───────────────┐                        │
│  │ ark-grpc   │ │  │ ark-bdk-wallet│                        │
│  │ (tonic)    │ │  │ (BDK)         │                        │
│  ├────────────┤ │  └───────────────┘                        │
│  │ ark-rest   │ │                                           │
│  │ (reqwest)  │ │                                           │
│  └────────────┘ │                                           │
├─────────────────┴───────────────────────────────────────────┤
│                   Core Layer                                 │
│   ark-core                                                   │
│   - ArkAddress, Vtxo, BoardingOutput, ArkNote               │
│   - MuSig2 nonce generation and signing                     │
│   - Round protocol (RoundInput, RoundOutput, RoundEvent)    │
│   - Forfeit transaction construction                        │
│   - Coin selection algorithms                               │
│   - Unilateral exit logic                                   │
│   - vHTLC (Virtual Hash Time-Locked Contracts)              │
├─────────────────────────────────────────────────────────────┤
│                   External Dependencies                      │
│   bitcoin (0.32), musig/secp256k1, tonic, prost, reqwest   │
└─────────────────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
    arkd Server         Bitcoin Network
    (gRPC/REST)         (via Esplora/BDK)
```

## Crate Dependency Graph

```
ark-rs ──► ark-client ──► ark-core
                     ├──► ark-fees
                     ├──► ark-grpc ──► ark-core (native only)
                     └──► ark-rest ──► ark-core (WASM-compatible)

ark-bdk-wallet ──► ark-core

e2e-tests ──► ark-client + ark-core + ark-bdk-wallet
```

## Key Design Decisions

### Transport Abstraction
`ark-client` abstracts over transport — gRPC (native) or REST (WASM). The `NetworkClient` trait allows swapping transport without changing application code. gRPC is the default for native builds; REST enables browser/WASM support.

### OfflineClient → Client Pattern
Clients start as `OfflineClient` (configured but not connected), then call `.connect()` to create a `Client` with server info. This separates configuration from network operations.

### Modular Crate Design
Each crate has a focused responsibility. Applications needing only address encoding can depend on `ark-core` alone. Full wallet applications use `ark-client` which pulls in everything needed.

### WASM Compatibility
`ark-core` and `ark-rest` compile to `wasm32-unknown-unknown`. Conditional compilation (`cfg(target_arch = "wasm32")`) swaps in WASM-compatible alternatives for random number generation, timers, and HTTP.

### MuSig2 Signing
Round participation requires MuSig2 cooperative signing between the client and arkd. The `ark-core` crate implements nonce generation, aggregation, and partial signature creation using the `musig` (secp256k1) crate.

## Source Structure

```
rust-sdk/
├── Cargo.toml              # Workspace definition
├── justfile                 # Task runner (build, test, lint)
├── ark-core/src/            # Core types and protocol logic
│   ├── ark_address.rs       # Address encoding/decoding
│   ├── vtxo.rs              # VTXO types and operations
│   ├── boarding_output.rs   # Boarding address generation
│   ├── arknote.rs           # Ark notes (payment proofs)
│   ├── coin_select.rs       # Coin selection algorithms
│   ├── intent.rs            # Payment intents
│   ├── vhtlc.rs             # Virtual HTLCs
│   ├── unilateral_exit.rs   # Exit without server
│   └── server.rs            # Round protocol types
├── ark-client/src/          # Client library
│   ├── lib.rs               # Client, OfflineClient
│   ├── batch.rs             # Round batching
│   ├── send_vtxo.rs         # VTXO send logic
│   ├── boltz.rs             # Boltz swap integration
│   ├── coin_select.rs       # Client-level coin selection
│   ├── fee_estimation.rs    # Fee estimation
│   ├── wallet.rs            # Wallet trait
│   └── swap_storage/        # In-memory or SQLite swap storage
├── ark-grpc/src/            # gRPC transport
├── ark-rest/src/            # REST transport (WASM-compatible)
├── ark-bdk-wallet/src/      # BDK wallet integration
├── ark-fees/src/            # Fee estimation
├── ark-rs/src/              # Umbrella re-export
├── ark-client-sample/       # Example application
└── e2e-tests/tests/         # E2E tests against live arkd
```

## Testing Architecture

- **Unit tests**: Per-crate via `cargo test` / `just test`
- **E2E tests**: In `e2e-tests/` crate, run against live arkd + Nigiri (Bitcoin regtest)
- **WASM tests**: Via `wasm-pack test` for `ark-rest`
- **MSRV check**: Via `cargo msrv verify` per crate
