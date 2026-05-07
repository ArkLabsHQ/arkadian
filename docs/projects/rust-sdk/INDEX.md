---
project_id: rust-sdk
version: 1.3.0
last_sync_commit: 887cb4a1c87124594c13b4d2a1ffc1c7d89934fc
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "sop/development-workflow.md"]
  debug:      ["testing/troubleshooting.md"]
  monitoring: ["testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md"]
  dev: ["sop/development-workflow.md"]
scripts:
  build: "cargo build"
  test: "just test"
  e2e: "just e2e-tests"
  fmt: "just fmt"
  clippy: "just clippy"
---

# Arkade Rust SDK (ark-rs) — Project Index

**rust-sdk** is a collection of Rust crates designed to simplify building Bitcoin wallets with seamless support for both on-chain and off-chain transactions via the Ark protocol. It provides core types, client libraries, gRPC/REST transport, BDK wallet integration, and fee estimation.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/rust-sdk/system/` — System Architecture & Components
Core documentation about the Rust SDK architecture and design:

- **system/project_overview.md** — What ark-rs is, crates, features, and use cases
- **system/architecture.md** — Workspace structure, crate dependencies, and data flow

### `${ARKADIAN_DIR}/docs/projects/rust-sdk/testing/` — Usage & Operations
Practical guides for using and developing:

- **testing/usage.md** — Quick start guide, installation, and examples
- **testing/how_to_run.md** — Building, running, and development setup
- **testing/how_to_test.md** — Unit tests, E2E tests, WASM tests
- **testing/troubleshooting.md** — Common issues and debugging

### `${ARKADIAN_DIR}/docs/projects/rust-sdk/sop/` — Standard Operating Procedures

- **sop/development-workflow.md** — Build, test, lint, and PR workflow

### `${ARKADIAN_DIR}/docs/projects/rust-sdk/tasks/` — Product Requirements & Plans
Feature specifications and implementation tracking.

### `change-log/` — Sync Tracking & History

- **change-log/last-sync.txt** — Last synced commit hash
- **change-log/SYNC_HISTORY.md** — History of documentation syncs

### `pr-report/` — Pull Request Summaries

---

## Key Concepts

### Workspace Crates
All publishable crates aligned at **v0.9.0** with crates.io metadata (`keywords = ["ark", "arkade", "bitcoin", "wallet"]`, `categories = ["cryptography::cryptocurrencies"]`) and per-crate `README.md` ready for publish.

- **ark-core** (v0.9.0): Core types — ArkAddress, VTXO, boarding outputs, coin selection, MuSig2, vHTLC, unilateral exit
- **ark-client** (v0.9.0): High-level client — connect to arkd, send VTXOs, settle rounds, transaction history, Boltz swaps
- **ark-grpc** (v0.9.0): gRPC transport for arkd communication (tonic-based)
- **ark-rest** (v0.9.0): REST transport for arkd (reqwest-based, WASM-compatible)
- **ark-bdk-wallet** (v0.9.0): BDK integration for on-chain wallet operations
- **ark-fees** (v0.9.0): Fee estimation utilities
- **ark-delegator** (v0.9.0): REST client for Ark delegator services (auto-renewal of VTXOs)
- **ark-script** (v0.9.0): Arkade scripting extension — extension opcodes, ASM helpers, script key tweaking, `ArkadeTapscript` / `ArkadeVtxoScript` for Multisig / CsvMultisig leaves (kept out of `ark-core` so non-arkade consumers don't pay the cost)
- **ark-introspector-client** (v0.9.0): HTTP client for the Go introspector co-signer service (preserves error response bodies, per-request timeout)
- **ark-rs** (v0.9.0): Umbrella re-export crate (single dependency for SDK consumers; feature flags `client`, `grpc`, `sqlite`, `tls-native-roots`, `tls-webpki-roots`)
- **ark-client-sample**: Example client application (with `watch-delegated` command) — not published
- **e2e-tests**: End-to-end test suite against live arkd (incl. `e2e_arkade_script` against a dockerized introspector) — not published

### Protocol Features
- Off-chain VTXO payments (send, receive, settle) — unified offchain-send builder for VTXO and asset sends
- On-chain boarding and unilateral exit
- VTXOs with **distinct forfeit and unilateral-exit keys** (split-key model)
- Round participation with MuSig2 signing — asset-preserving settlement
- Ark notes (transferable payment proofs)
- DLC (Discreet Log Contracts) support — time-based timelocks (block-based dropped to match production Arkade)
- Boltz submarine, reverse submarine, **and chain swaps** (ARK ↔ on-chain BTC); reverse-swap persistence now includes BOLT11 invoice + expiry (**breaking** for direct `ReverseSwapData` constructors)
- **Delegation**: 3-of-3 delegated VTXOs, third-party delegator service, background `VtxoWatcher` for auto-renewal
- **Arkade Asset V1**: issue, transfer, burn, reissue (rejects empty asset packets)
- **Arkade Script** (introspector flow): extension opcodes, key-tweaked introspector pubkeys, `ArkadeVtxoScript` taproot encoding, PSBT-driven introspector packet insertion
- Sub-dust amounts
- Key discovery (now probes delegate addresses too)
- arkd protocol 0.9.2 (gRPC + REST)

### Transport Options
- **gRPC** (default): Via `ark-grpc` with tonic, native TLS
- **REST**: Via `ark-rest` with reqwest, WASM-compatible
- WASM build support for `ark-core` and `ark-rest`

---

## Quick Reference

### Prerequisites
- Rust 1.86+ (MSRV)
- `just` command runner (`cargo install just`)
- protoc (for gRPC code generation)

### Build
```bash
cargo build
```

### Test
```bash
just test          # Unit tests
just e2e-tests     # E2E tests (requires arkd running)
just e2e-full      # Full E2E: start nigiri + arkd + run tests
just wasm-test     # WASM tests (requires wasm-pack + arkd)
```

### Code Quality
```bash
just fmt           # Format with dprint
just clippy        # Lint with clippy
```

---

## Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ARKD_DIR` | Path to local arkd source checkout | `/home/user/arkd` |
| `ARK_GO_DIR` | Parent directory for arkd checkout | `/home/user/go` |

### Feature Flags

| Feature | Crate | Description |
|---------|-------|-------------|
| `tls-native-roots` | ark-client | Use native TLS roots (default) |
| `tls-webpki-roots` | ark-client | Use webpki TLS roots |
| `sqlite` | ark-client | SQLite-backed swap storage |
| `test-utils` | ark-client | Test utility functions |

---

## Technology Stack

### Core
- **Rust** (edition 2021, MSRV 1.86)
- **bitcoin** (v0.32.7): Bitcoin primitives, PSBT, Schnorr
- **musig/secp256k1** (v0.32.0-beta.2): MuSig2 signing
- **bech32**: Address encoding

### Transport
- **tonic** (v0.14): gRPC client
- **prost** (v0.13): Protobuf serialization
- **reqwest** (v0.12): HTTP client for REST

### Wallet
- **bdk**: Bitcoin Development Kit integration
- **sqlx** (v0.8): SQLite for swap storage (optional)

### Testing & Dev
- **just**: Task runner (justfile)
- **dprint**: Code formatter
- **clippy**: Rust linter
- **Nigiri**: Local Bitcoin regtest environment
- **wasm-pack**: WASM testing

---

## Architecture Overview

### Crate Dependency Graph
```
ark-rs (umbrella re-export)
  └── ark-client (high-level API)
        ├── ark-core (types, crypto, protocol logic, introspector packet builder)
        ├── ark-fees (fee estimation)
        ├── ark-grpc (gRPC transport) ──── ark-core
        ├── ark-rest (REST transport) ──── ark-core
        └── ark-delegator (REST delegator client) ──── ark-core
  └── ark-bdk-wallet (BDK on-chain wallet)
        └── ark-core

ark-script (arkade scripting extension — standalone, not pulled by ark-core)
ark-introspector-client (HTTP client for the introspector service — standalone)

e2e-tests (integration tests)
  ├── ark-client
  ├── ark-core
  ├── ark-bdk-wallet
  ├── ark-delegator (fulmine_delegator_smoke)
  └── ark-introspector-client (e2e_arkade_script against dockerized introspector)
```

### Data Flow
```
Application
    │
    ▼
ark-client (Client / OfflineClient)
    ├── ark-core (types, signing, coin selection)
    ├── ark-fees (fee estimation)
    └── ark-grpc / ark-rest (transport)
            │
            ▼
        arkd Server
            │
            ▼
      Bitcoin Network
```

---

## Integration Points

### arkd Server
- **gRPC**: Default transport via `ark-grpc` (port 7070)
- **REST**: Alternative via `ark-rest` (WASM-compatible)
- **Operations**: Register inputs/outputs, participate in rounds, get VTXOs

### Boltz Swap Provider
- **Submarine swaps**: On-chain → Lightning
- **Reverse submarine swaps**: Lightning → On-chain
- **Chain swaps**: ARK ↔ on-chain BTC (`create_chain_swap` / `claim_chain_swap` / `refund_chain_swap`)
- **Swap storage**: In-memory or SQLite-backed (with new `chain_swaps` table — migration `002_chain_swaps.sql`)

### Delegator Service
- **REST API**: `GET /v1/delegator/info`, `POST /v1/delegate`
- **Reference implementation**: fulmine
- **Client**: `ark-delegator` crate
- **Background watcher**: `client.start_vtxo_watcher(delegator)` — auto-delegates new VTXOs and self-renews near-expiry ones

### Introspector Service
- **HTTP client**: `ark-introspector-client` (preserves error response bodies, configurable per-request timeout)
- **Local dev / CI**: dockerized introspector image built from source by `justfile` and CI; `e2e_arkade_script` exercises arkade-script flows end-to-end
- **Packet builder**: `ark-core::introspector::packet` constructs introspector PSBT inputs with strict length / trailing-byte validation; `ark-core::extension` appends introspector packets as Ark extension fields

### Bitcoin Network
- **Esplora**: Block explorer backend for chain queries
- **BDK**: On-chain wallet operations via `ark-bdk-wallet`
- **Nigiri**: Local regtest environment for development

---

## Browser/WASM Compatibility

### WASM Support
- `ark-core`: Full WASM support
- `ark-rest`: Full WASM support (browser-compatible HTTP)
- `ark-client`: Partial (gRPC default not WASM-compatible, REST path in progress)
- `ark-grpc`: Not WASM-compatible (tonic requires native runtime)

### Build for WASM
```bash
just build-wasm    # Builds ark-core and ark-rest for wasm32-unknown-unknown
```
