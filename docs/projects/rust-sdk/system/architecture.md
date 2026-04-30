# Arkade Rust SDK — Architecture

## High-Level Architecture

ark-rs is a Cargo workspace containing 10 crates organized in a layered architecture. The crates are designed for modularity — applications can depend on individual crates or use the umbrella `ark-rs` re-export.

```
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│   (Your wallet / service / WASM app)                        │
├──────────────────────┬──────────────────────────────────────┤
│  ark-rs (re-export)  │  ark-client-sample (example)         │
├──────────────────────┴──────────────────────────────────────┤
│                   Client Layer                               │
│   ark-client                                                 │
│   - OfflineClient / Client lifecycle (delegator-aware)      │
│   - send_vtxo, settle, balance, history                     │
│   - Asset issue / transfer / burn / reissue                 │
│   - Boltz swap orchestration (incl. chain swaps)            │
│   - VtxoWatcher (auto-delegate + auto-renew)                │
│   - Coin selection                                          │
│   - Fee estimation (via ark-fees)                           │
├─────────────────┬─────────────────────┬─────────────────────┤
│  Transport      │  Wallet Integration │  Delegation         │
│  ┌────────────┐ │  ┌───────────────┐  │ ┌────────────────┐  │
│  │ ark-grpc   │ │  │ ark-bdk-wallet│  │ │ ark-delegator  │  │
│  │ (tonic)    │ │  │ (BDK)         │  │ │ (REST)         │  │
│  ├────────────┤ │  └───────────────┘  │ └────────────────┘  │
│  │ ark-rest   │ │                     │                     │
│  │ (reqwest)  │ │                     │                     │
│  └────────────┘ │                     │                     │
├─────────────────┴─────────────────────┴─────────────────────┤
│                   Core Layer                                 │
│   ark-core                                                   │
│   - ArkAddress, Vtxo, BoardingOutput, ArkNote               │
│   - Delegator (3-of-3) VTXO scripts and intents             │
│   - MuSig2 nonce generation and signing                     │
│   - Round protocol (RoundInput, RoundOutput, RoundEvent)    │
│   - Forfeit transaction construction                        │
│   - Coin selection (incl. asset-aware)                      │
│   - Asset module: AssetId, Packet, issue/reissue/burn       │
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
                     ├──► ark-rest ──► ark-core (WASM-compatible)
                     └──► ark-delegator ──► ark-core (optional, for VtxoWatcher)

ark-bdk-wallet ──► ark-core

e2e-tests ──► ark-client + ark-core + ark-bdk-wallet (+ ark-delegator)
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

### Delegator Integration
A "delegator" is a third-party service that holds a fee-paid co-signing key and refreshes a wallet's VTXOs before they expire. ark-rs supports delegators in three layers:

- **`ark-core`** — `multisig_3_of_3_script` and delegate-intent encoding (`expire_at=0`, on-chain output indexes encoded in delegate intent message).
- **`ark-client`** — `OfflineClient` is configured with `delegator_pk` + `historical_delegator_pks`; address generation produces 3-leaf delegated outputs; `generate_delegate()` builds signed intent + forfeit PSBTs; `VtxoWatcher` runs in the background to auto-submit them.
- **`ark-delegator`** — REST client for the delegator HTTP API.

### Asset Support (Arkade Asset V1)
Asset packet types and issuance/reissuance/burn transaction builders live in `ark-core::asset` and `ark-core::send`. `ark-client::asset` exposes user-facing helpers (`issue_asset`, transfer/burn/reissue) and shares the same generic offchain-send builder as VTXO sends. Settlement preserves asset balances across rounds.

### Chain Swaps
ARK ↔ on-chain BTC swaps via Boltz are persisted in a new `chain_swaps` SQLite table (migration `002_chain_swaps.sql`). The flow is `create_chain_swap` → `wait_for_chain_swap_server_lockup` → `claim_chain_swap{,_btc}` (or `refund_chain_swap{,_btc}` on failure).

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
├── ark-delegator/src/       # REST client for delegator services
├── ark-rs/src/              # Umbrella re-export
├── ark-client-sample/       # Example application (incl. watch-delegated)
└── e2e-tests/tests/         # E2E tests against live arkd
    ├── e2e_assets.rs                    # Asset issue/transfer/burn/reissue
    ├── e2e_delegate.rs                  # Delegate settlement
    └── fulmine_delegator_smoke.rs       # VtxoWatcher + fulmine delegator
```

## Testing Architecture

- **Unit tests**: Per-crate via `cargo test` / `just test`
- **E2E tests**: In `e2e-tests/` crate, run against live arkd + Nigiri (Bitcoin regtest)
- **WASM tests**: Via `wasm-pack test` for `ark-rest`
- **MSRV check**: Via `cargo msrv verify` per crate
