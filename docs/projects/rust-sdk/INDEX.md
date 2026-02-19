---
project_id: rust-sdk
version: 1.0.0
last_sync_commit: efa10e23ff5a540f16adff08f7d8856e2cc293e1
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
- **ark-core** (v0.8.0): Core types — ArkAddress, VTXO, boarding outputs, coin selection, MuSig2, vHTLC, unilateral exit
- **ark-client** (v0.8.0): High-level client — connect to arkd, send VTXOs, settle rounds, transaction history, Boltz swaps
- **ark-grpc** (v0.8.0): gRPC transport for arkd communication (tonic-based)
- **ark-rest** (v0.8.0): REST transport for arkd (reqwest-based, WASM-compatible)
- **ark-bdk-wallet** (v0.8.0): BDK integration for on-chain wallet operations
- **ark-fees** (v0.8.0): Fee estimation utilities
- **ark-rs**: Umbrella re-export crate
- **ark-client-sample**: Example client application
- **e2e-tests**: End-to-end test suite against live arkd

### Protocol Features
- Off-chain VTXO payments (send, receive, settle)
- On-chain boarding and unilateral exit
- Round participation with MuSig2 signing
- Ark notes (transferable payment proofs)
- DLC (Discreet Log Contracts) support
- Boltz submarine and reverse submarine swaps
- Delegation (VTXO refresh by third party)
- Sub-dust amounts
- Key discovery

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
        ├── ark-core (types, crypto, protocol logic)
        ├── ark-fees (fee estimation)
        ├── ark-grpc (gRPC transport) ──── ark-core
        └── ark-rest (REST transport) ──── ark-core
  └── ark-bdk-wallet (BDK on-chain wallet)
        └── ark-core

e2e-tests (integration tests)
  ├── ark-client
  ├── ark-core
  └── ark-bdk-wallet
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
- **Swap storage**: In-memory or SQLite-backed

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
