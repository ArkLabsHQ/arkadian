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

## Recent Additions

- **`ark-script` crate** — Arkade scripting extension. Defines the 47 Arkade extension opcodes (aliasing the `OP_NOP4`/`OP_RETURN_196..=243` slots so they round-trip through `bitcoin::script::Builder`), arkade-aware ASM helpers (`to_asm`/`from_asm` tolerant of unknown opcodes), `ArkadeScriptHash` / `ArkadeWitnessHash` BIP-340 tagged hashes, `compute_arkade_script_public_key` (`P' = P + H(script)*G`, even-Y enforced to match the Go introspector), and `ArkadeTapscript` / `ArkadeVtxoScript` encoders for the `Multisig` / `CsvMultisig` leaves used by arkade flows. Encodings are byte-for-byte verified against ts-sdk vectors. Lives outside `ark-core` so non-arkade consumers don't pay for its dependencies.
- **`ark-introspector-client` crate** — HTTP client for the Go introspector co-signer service. Preserves error response bodies and applies a per-request timeout.
- **`ark-core::introspector::packet`** — introspector packet builder/parser with strict validation: rejects empty asset packets, trailing witness bytes, oversized payloads, and invalid script lengths.
- **`ark-core::extension`** — Ark extension field handling; introspector packets are appended to Ark extensions instead of being mixed into asset packets.
- **Split forfeit / unilateral-exit keys** — `Vtxo` now permits the forfeit key and the unilateral-exit key to differ, enabling delegation/HSM patterns where the exit key stays cold.
- **Reverse-swap persistence (BREAKING)** — `ReverseSwapData` gained a required `bolt11: String` and an `invoice_expiry: Option<u64>` so callers can list, display, and monitor pending reverse swaps across restarts. `SwapStatus` is re-exported at the `ark-client` crate root. Direct constructors of `ReverseSwapData` must populate the new fields.
- **Time-based timelocks for arkd dev/CI** — block-based delays were regtest-only and ambiguous; `justfile` and DLC e2e tests now use seconds-based delays (matching production Arkade), and `run-wallet`/`run-light` correctly forward env vars.
- **Dockerized introspector e2e** — `e2e_arkade_script` runs against an introspector image built from source; CI plumbs through a dockerized introspector for end-to-end arkade-script coverage.

### Carried over from prior sync
- **`ark-delegator` crate** — REST client for Ark delegator services (e.g. fulmine).
- **VTXO watcher** in `ark-client` — auto-delegates and auto-renews VTXOs in the background.
- **Arkade Asset V1** — full issue / transfer / burn / reissue support (asset packets in OP_RETURN, asset preservation during settlement).
- **Chain swaps** — ARK ↔ on-chain BTC via Boltz (new `chain_swaps` SQL migration, claim/refund flows).
- **Delegate-aware client** — `OfflineClient` accepts `delegator_pk` + `historical_delegator_pks`; address generation produces 3-leaf delegated VTXOs.
- **arkd protocol bump to 0.9.2** — gRPC/REST schemas regenerated; REST SSE stream now strips `data: ` prefix and handles `heartbeat`/`stream_started` events.

## Workspace Crates

### ark-core (v0.8.0)
Core types and protocol primitives:
- `ArkAddress`: Ark address encoding/decoding (bech32)
- `Vtxo`, `VtxoList`: Virtual transaction output management — including delegator (3-of-3) VTXOs and split forfeit / unilateral-exit keys
- `BoardingOutput`: On-chain boarding address generation
- `ArkNote`: Transferable payment proofs
- `CoinSelect`: VTXO coin selection algorithms (incl. asset-aware selection)
- `Intent`: Payment intent construction (incl. delegate intents)
- MuSig2 integration for round signing
- vHTLC: Virtual Hash Time-Locked Contracts
- Unilateral exit logic
- Transaction graph construction
- **Asset support** (Arkade Asset V1): `AssetId`, `Packet`/`AssetGroup` OP_RETURN encoding, asset issuance / reissuance / burn transaction builders, settlement asset preservation
- **Introspector packet builder** (`introspector::packet`): strict-validating packet construction for the introspector co-signer; appended via the new `extension` module as Ark extensions

### ark-client (v0.8.0)
High-level client API:
- `OfflineClient` → `Client` connection lifecycle (delegator pubkey + historical pubkeys configured at OfflineClient layer)
- `send_vtxo()`: Send off-chain payments (now backed by a generic offchain transaction builder shared with asset sends)
- `offchain_balance()`: Query balances
- `spendable_vtxos()`: List spendable VTXOs
- `get_boarding_address()`: Generate boarding addresses
- `get_offchain_address()`: Returns delegated (3-leaf) addresses when a delegator is configured
- `transaction_history()`: Query transaction history
- Round participation and settlement (with asset preservation)
- `generate_delegate()`: prepare delegate forfeit PSBTs for a third-party delegator
- `start_vtxo_watcher()`: launch background `VtxoWatcher` that auto-delegates new VTXOs and self-renews near-expiry VTXOs (safety net)
- **Asset operations**: `issue_asset()`, asset transfer/burn/reissue via shared offchain send path
- **Chain swaps** (ARK ↔ on-chain BTC via Boltz): `create_chain_swap()`, `wait_for_chain_swap_server_lockup()`, `claim_chain_swap()` / `claim_chain_swap_btc()`, `refund_chain_swap()` / `refund_chain_swap_btc()`
- Boltz submarine and reverse submarine swaps
- Swap storage (in-memory or SQLite, with new `chain_swaps` table)

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

### ark-delegator (v0.8.0)
REST client for Ark delegator services. A delegator is a third-party service (e.g. fulmine) that automatically renews VTXOs before they expire, allowing wallets to stay offline without losing funds.
- `DelegatorClient::info()` — fetch delegator pubkey, fee, on-chain address (`GET /v1/delegator/info`)
- `DelegatorClient::delegate()` — submit signed intent + forfeit PSBTs (`POST /v1/delegate`)
- Per-request HTTP timeouts and rustls TLS backend

### ark-script — *new*
Standalone crate for the Arkade scripting extension (kept out of `ark-core`):
- 47 Arkade extension `Opcode` constants aliasing `OP_NOP4` / `OP_RETURN_196..=243`
- Arkade-aware opcode name lookup, plus `to_asm` / `from_asm` helpers tolerant of unknown opcodes
- BIP-340 tagged hashes (`ArkadeScriptHash`, `ArkadeWitnessHash`) and `compute_arkade_script_public_key` (`P' = P + H(script)*G`, even-Y enforced)
- `ArkadeTapscript` encoder for `Multisig` / `CsvMultisig` leaf shapes (the subset arkade flows use)
- `ArkadeVtxoScript::new` mixing plain taproot leaves with `ArkadeLeaf`s, deriving tweaked introspector keys, and emitting a flat script list ready for `TaprootBuilder` plus a leaf-index → arkade-script map for downstream PSBT signing
- Encodings byte-for-byte verified against ts-sdk vectors

### ark-introspector-client — *new*
HTTP client for the Go introspector co-signer service:
- Preserves error response bodies (so callers can surface introspector-side validation errors)
- Configurable per-request timeout

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
