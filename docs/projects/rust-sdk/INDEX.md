---
project_id: rust-sdk
version: 1.4.4
last_sync_commit: d8feefa6621c748839f20820406a913d7a97d2df
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
  e2e_full: "just e2e-full"
  regtest_start: "just regtest-start"
  regtest_clean: "just regtest-clean"
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
All publishable crates aligned at **v0.10.1** with crates.io metadata (`keywords = ["ark", "arkade", "bitcoin", "wallet"]`, `categories = ["cryptography::cryptocurrencies"]`) and per-crate `README.md` ready for publish. A pair of GitHub Actions workflows now drives the crates.io release flow (`draft_release_crates.yml` → `create_release_crates.yml`, the latter idempotent against already-published versions). The 0.10.x line lands the **Contract Manager** (see Protocol Features) and removes the in-repo design docs (`docs/guarded-grpc-client-design.md` and the contract-manager design sketches).

- **ark-core** (v0.10.1): Core types — ArkAddress, VTXO, boarding outputs, coin selection, MuSig2, vHTLC, unilateral exit; adds the `contract` module (`ContractType`, `ContractSpec`, contract spend selections `SpendSelection` / `SpendPathKind`, prefixed vHTLC spend-path kinds)
- **ark-client** (v0.10.1): High-level client — connect to arkd, send VTXOs, settle rounds, transaction history, Boltz swaps; adds the `contract` module (`ContractManager`, `ContractStore` / `MemoryContractStore` / `SqliteContractStore`, `AnnotatedVtxo` / `AnnotatedBoardingOutput` / `AnnotatedVtxoList`) and `list_contracts` / `restore_contracts` APIs (boarding outputs live in the contract manager; `BoardingWallet` removed)
- **ark-grpc** (v0.10.1): gRPC transport for arkd communication (tonic-based); `Client::connect` now applies the workspace `ClientTlsConfig` (webpki or native roots, per feature flag) to the manually constructed `Endpoint` so TLS-enabled URLs work without relying on tonic's pre-`0.14` automatic TLS inference
- **ark-rest** (v0.10.1): REST transport for arkd (reqwest-based, WASM-compatible)
- **ark-bdk-wallet** (v0.10.1): BDK integration for on-chain wallet operations; `Wallet::new_from_xpriv` derives **BIP86 Taproot** (P2TR, `bc1p…`) external/change descriptors (was BIP84 native SegWit)
- **ark-fees** (v0.10.1): Fee estimation utilities
- **ark-delegator** (v0.10.1): REST client for Ark delegator services (auto-renewal of VTXOs)
- **ark-script** (v0.10.1): Arkade scripting extension — extension opcodes, ASM helpers, script key tweaking, `ArkadeTapscript` / `ArkadeVtxoScript` for Multisig / CsvMultisig leaves (kept out of `ark-core` so non-arkade consumers don't pay the cost)
- **ark-introspector-client** (v0.10.1): HTTP client for the Go introspector co-signer service (preserves error response bodies, per-request timeout)
- **ark-rs** (v0.10.1): Umbrella re-export crate (single dependency for SDK consumers; feature flags `client`, `grpc`, `sqlite`, `tls-native-roots`, `tls-webpki-roots`)
- **ark-client-sample**: Example client application (with `watch-delegated` command) — not published
- **e2e-tests**: End-to-end test suite against live arkd (incl. `e2e_arkade_script` against a dockerized introspector) — not published

### Protocol Features
- **Contract Manager** (0.10.x): every spendable output is modelled as a typed, persisted *contract* rather than being tracked ad hoc. `ark-core::contract` defines the shared model — `ContractType` (`default` / `delegate` / `boarding` / `vhtlc`), the `ContractSpec` trait, `StoredContract`, prefixed vHTLC spend-path kinds, and **contract spend selections** (`SpendSelection` / `SpendPathKind`, each carrying the required spend control block so spend inputs no longer need raw script-spend-info lookups). `ark-client::contract` adds the client-side machinery: `ContractManager` over a pluggable `ContractStore` trait (`MemoryContractStore` or SQLite-backed `SqliteContractStore` with `new_default()` + migrations), a `ContractRegistry` of registered builtins (`register_builtins`), and annotation types (`AnnotatedVtxo`, `AnnotatedBoardingOutput`, `AnnotatedVtxoList`) that pair a VTXO/boarding output with its stored contract and expose resolved spend selections, tapscripts, `server_pk`, `owner_pk`, and `exit_delay`. **Boarding outputs were moved into the contract manager and the standalone `BoardingWallet` was removed**; the `VtxoWatcher` and offchain-send flows now operate on annotated contract VTXOs, and boarding + default contracts are coalesced. New client APIs: `Client::list_contracts() -> Vec<ContractInfo>` (wallet-facing views with derived `address` + `address_kind`, decoded `server_pk`, and per-contract `signer_status`) and `Client::restore_contracts(gap_limit) -> ContractRestoreReport` (contract-centric HD restore that scans derived keys up to the gap limit, records discovered/inserted/known contracts and per-key VTXO/boarding activity, and suggests the next receive index). Persisted contracts hydrate HD keys on connect via `hydrate_persisted_contract_keys` (without advancing the receive index) through the split-out `DiscoverableKeyProvider` (`OfflineClient::with_discoverable_key_provider`); malformed builtin contract rows are surfaced as errors instead of being silently dropped. The `ark-client-sample` gains `list-contracts` / `restore-contracts` commands and a configurable memory-or-SQLite contract-store backend (SQLite by default)
- **Config-driven client construction** (**breaking**): build clients from an `OfflineClientConfig` struct via `OfflineClient::with_keypair` / `with_bip32` / `with_key_provider` (replaces positional `new` / `new_with_keypair` / `new_with_bip32`; drops the `K` key-provider generic and `name` field). `BoltzReferralId` enum replaces the old `Option<String>` + `with_boltz_referral_id`. `Client::server_info()` is async and refreshes the cached `/info` once the configurable `server_info_ttl` (default 15 min) expires
- Off-chain VTXO payments (send, receive, settle) — unified offchain-send builder for VTXO and asset sends
- **Smart settlement**: `settle()` renews only expired/recoverable VTXOs plus confirmed boarding outputs (healthy VTXOs untouched, cheap periodic renewal); full-renewal path renamed to `settle_all()`. Isolated sub-dust recoverable VTXOs need `settle_all()` (carrier value) since the batch rejects sub-dust-only settlements below the server dust threshold
- On-chain boarding and unilateral exit
- VTXOs with **distinct forfeit and unilateral-exit keys** (split-key model)
- Round participation with MuSig2 signing — asset-preserving settlement
- Ark notes (transferable payment proofs)
- DLC (Discreet Log Contracts) support — time-based timelocks (block-based dropped to match production Arkade)
- Boltz submarine, reverse submarine, **and chain swaps** (ARK ↔ on-chain BTC); reverse-swap persistence now includes BOLT11 invoice + expiry (**breaking** for direct `ReverseSwapData` constructors) plus an optional `claim_address: Option<ArkAddress>` so a reverse-swap invoice can credit another Arkade user's address (new `Client::get_ln_invoice_for_address(amount, recipient_address, expiry_secs, description)`; recipient is validated to share the same arkd signer via new `ArkAddress::server()` accessor; existing flows still claim into a fresh local address when no recipient is set); swap creation requests carry a `referralId` (default `arkade-rs-SDK`, configured via the `BoltzReferralId` enum on `OfflineClientConfig`); reverse-swap creation accepts an optional BOLT11 invoice `description` (max 639 bytes) — `get_ln_invoice` / `get_ln_invoice_with_preimage_hash` gain a `description: Option<String>` parameter (**breaking**)
- Granular offchain-tx control: `Client::submit_offchain_tx` is now always exposed (previously behind a feature flag), `finalize_offchain_tx` is `pub`, and `finalize_pending_offchain_tx(ark_txid)` lets callers finalize one specific pending tx by `Txid` (useful when an external database tracks individual pending funding attempts)
- **Server signer key rotation** (0.9.3): when arkd advertises a deprecated signer with a cooperative-sign cutoff, clients migrate VTXOs/boarding outputs off the old key before that cutoff. `ark-core::server` models rotation status — `DeprecatedSignerStatus` (`Migratable` / `DueNow` / `Expired`, with `from_cutoff` / `seconds_until_cutoff` / `is_cooperatively_migratable`) and `ServerSignerStatus` (`Current` / `Deprecated(..)` / `Unknown`, with `requires_recovery` / `is_pre_cutoff_deprecated`); `Info` gains `all_server_keys()`, `signer_status_at()`, `deprecated_signer_status_at()`, `signer_requires_recovery_at()`, `is_signer_past_cutoff_at()`. New `ark-client::migration` module + `Client` APIs: `migrate_deprecated_signer_vtxos()` (two independent legs — VTXO + boarding — each with its own oversized / deferred / dust sizing pipeline, bounded by `MAX_VTXOS_PER_SETTLEMENT = 50`, backing off on per-leg failure; returns `DeprecatedSignerMigrationReport`), `deprecated_signer_status()` (per-signer `DeprecatedSignerReport`), plus `pending_recovery()` and `refresh_server_info()`. Unix-time retrieval is now fallible and tolerates negative timestamps. New `e2e_signer_rotation` test
- **Delegation**: 3-of-3 delegated VTXOs, third-party delegator service, background `VtxoWatcher` for auto-renewal
- **Arkade Asset V1**: issue, transfer, burn, reissue (rejects empty asset packets)
- **Arkade Script** (introspector flow): extension opcodes, key-tweaked introspector pubkeys, `ArkadeVtxoScript` taproot encoding, PSBT-driven introspector packet insertion
- Sub-dust amounts
- Key discovery (now probes delegate addresses too)
- arkd protocol 0.9.2 (gRPC + REST)
- **SDK build-version handshake** — both `ark-grpc` and `ark-rest` clients send `x-build-version` (= `CARGO_PKG_VERSION`) on every request. Servers can reject too-old SDKs; callers detect this via the new `Error::is_version_mismatch()` helper on both `ark_grpc::Error` and `ark_rest::Error`. `ark_rest::Client::new(url)` now returns `Result<Self, Error>` (**breaking**).

### Transport Options
- **gRPC** (default): Via `ark-grpc` with tonic, native TLS
- **REST**: Via `ark-rest` with reqwest, WASM-compatible
- WASM build support for `ark-core` and `ark-rest`
- **Guarded RPC + digest-mismatch refresh**: both transports route every non-`GetInfo` RPC through a guard that, on a stale `/info` digest, refetches `/info`, runs a refresh hook, commits the new digest, and returns `Error::server_info_changed` (no auto-retry). `ark-grpc` uses private `guarded::Ark` / `guarded::Indexer` wrappers so new RPCs can't skip the guard (design: repo `docs/guarded-grpc-client-design.md`); `ark-rest` mirrors the behaviour. Requests carry `x-digest`, `x-sdk-version` (`rust-sdk/<version>`), and `x-build-version`; `ark-core::server` defines `TARGET_ARKD_VERSION = "0.9.9"` and `SDK_VERSION`. New public `Error::is_server_info_changed()` on both transport error types

---

## Quick Reference

### Prerequisites
- Rust 1.86+ (MSRV)
- `just` command runner (`cargo install just`)
- protoc (for gRPC code generation)
- Docker + Node (for the `arkade-regtest` e2e stack; init with `just regtest-init`)

### Build
```bash
cargo build
```

### Test
```bash
just test            # Unit tests
just regtest-init    # Init the arkade-regtest submodule (once)
just regtest-start   # Bring up the arkade-regtest stack (emulator profile)
just e2e-tests       # E2E tests (requires the regtest stack running)
just e2e-full        # Full E2E: regtest-clean + regtest-start + run tests
just regtest-clean   # Tear down the stack (containers + volumes)
just wasm-test       # WASM tests (requires wasm-pack + running arkd)
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
| `sqlite` | ark-client | SQLite-backed swap storage and contract store (`SqliteContractStore`) |
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
- **arkade-regtest**: In-house Docker Compose regtest stack (Bitcoin Core + Fulcrum + mempool/esplora + arkd + emulator), git submodule at `regtest/`, driven by `regtest.mjs` (replaces Nigiri)
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
- **Background watcher**: `client.start_vtxo_watcher(delegator)` — auto-delegates new VTXOs and self-renews near-expiry ones (also renews server-recoverable VTXOs; operates on annotated contract VTXOs and preserves the swept flag for delegated VTXOs)

### Introspector Service
- **HTTP client**: `ark-introspector-client` (preserves error response bodies, configurable per-request timeout)
- **Local dev / CI**: dockerized introspector image built from source by `justfile` and CI; `e2e_arkade_script` exercises arkade-script flows end-to-end
- **Packet builder**: `ark-core::introspector::packet` constructs introspector PSBT inputs with strict length / trailing-byte validation; `ark-core::extension` appends introspector packets as Ark extension fields

### Bitcoin Network
- **Esplora**: Block explorer backend for chain queries
- **BDK**: On-chain wallet operations via `ark-bdk-wallet`
- **arkade-regtest**: Local regtest stack for e2e (Bitcoin Core + Fulcrum + mempool/esplora + arkd + emulator); e2e helper resolves on-chain state via Bitcoin Core (`gettxout` / `getrawtransaction`), not the esplora indexer

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
