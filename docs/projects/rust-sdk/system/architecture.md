# Arkade Rust SDK — Architecture

## High-Level Architecture

ark-rs is a Cargo workspace containing 12 crates organized in a layered architecture. The crates are designed for modularity — applications can depend on individual crates or use the umbrella `ark-rs` re-export.

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
│   - send_vtxo, settle / settle_all, balance, history        │
│   - ContractManager + ContractStore (memory / SQLite)       │
│   - list_contracts / restore_contracts (annotated VTXOs)    │
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
│   - Contract model (ContractType, spend selections)         │
│   - Delegator (3-of-3) VTXO scripts and intents             │
│   - Split forfeit / unilateral-exit keys on Vtxo            │
│   - MuSig2 nonce generation and signing                     │
│   - Round protocol (RoundInput, RoundOutput, RoundEvent)    │
│   - Forfeit transaction construction                        │
│   - Coin selection (incl. asset-aware)                      │
│   - Asset module: AssetId, Packet, issue/reissue/burn       │
│   - Introspector::packet + extension fields                 │
│   - Unilateral exit logic                                   │
│   - vHTLC (Virtual Hash Time-Locked Contracts)              │
├─────────────────────────────────────────────────────────────┤
│              Arkade Scripting (standalone)                   │
│   ark-script                  ark-introspector-client       │
│   - Extension opcodes         - HTTP client for the         │
│   - ASM helpers                 Go introspector co-signer   │
│   - Script key tweaking       - Preserves error bodies      │
│   - ArkadeTapscript           - Per-request timeout         │
│   - ArkadeVtxoScript                                        │
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

ark-script (standalone — arkade extension opcodes, tapscript, vtxo script)
ark-introspector-client (standalone — HTTP client for the introspector service)

e2e-tests ──► ark-client + ark-core + ark-bdk-wallet
              (+ ark-delegator for fulmine_delegator_smoke,
               + ark-introspector-client for e2e_arkade_script)
```

## Key Design Decisions

### Transport Abstraction
`ark-client` abstracts over transport — gRPC (native) or REST (WASM). The `NetworkClient` trait allows swapping transport without changing application code. gRPC is the default for native builds; REST enables browser/WASM support.

`ark-grpc::Client::connect` builds the `tonic::transport::Endpoint` manually and, when compiled with `tls-webpki-roots` or `tls-native-roots`, attaches a `ClientTlsConfig` (`with_webpki_roots()` / `with_native_roots()`) to it before connecting. Without this explicit `tls_config(...)`, tonic 0.14 will not infer TLS from the URL scheme, so TLS-enabled `arkd` endpoints would fail at connect time.

### OfflineClient → Client Pattern
Clients start as `OfflineClient` (configured but not connected), then call `.connect()` to create a `Client` with server info. This separates configuration from network operations. Construction is driven by an `OfflineClientConfig` struct (`#[derive(Default)]`, mainnet defaults) rather than long positional argument lists: callers fill the fields they need (`ark_server_url`, `boltz_url`, `timeout`, `server_info_ttl`, `boltz_referral_id`, `delegator_pk`, `historical_delegator_pks`) and pass it to `OfflineClient::with_keypair`, `with_bip32`, or `with_key_provider`. The key provider is stored as `Arc<dyn KeyProvider>`, so `OfflineClient` / `Client` no longer carry a `K` type parameter (now `OfflineClient<B, W, S>` / `Client<B, W, S>`), and the old `name` identifier was dropped. Default URLs/timeouts are exposed as public constants (`ARKADE_MAINNET_URL`, `ARKADE_MUTINYNET_URL`, `BOLTZ_MAINNET_URL`, `BOLTZ_MUTINYNET_URL`, `DEFAULT_TIMEOUT`, `DEFAULT_SERVER_INFO_TTL`).

### Server-Info TTL Refresh
`Client::server_info()` is async and serves a cached `/info` snapshot, refreshing it from the server once `server_info_ttl` (from the config, default 15 min) has elapsed. A lock-free fast path returns the cached value while it is still fresh; on expiry, a single task refreshes behind an async mutex (re-checking after acquiring the lock) so concurrent callers don't stampede the server. Setting `server_info_ttl` to `Duration::ZERO` forces a refresh on every access. `ServerState` tracks `server_info_refreshed_at` (an `Instant`) for the TTL check, and the batch round loop snapshots server info once so it stays consistent for the duration of a round.

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
ARK ↔ on-chain BTC swaps via Boltz are persisted in a new `chain_swaps` SQLite table (migration `002_chain_swaps.sql`). The flow is `create_chain_swap` → `wait_for_chain_swap_server_lockup` → `claim_chain_swap{,_btc}` (or `refund_chain_swap{,_btc}` on failure). Reverse-swap rows now persist the BOLT11 invoice and `invoice_expiry` so consumers can list/display pending reverse swaps without an external metadata store (**breaking** for direct constructors of `ReverseSwapData`). Reverse-swap creation also accepts an optional `description: Option<String>` (validated against `MAX_BOLT11_DESCRIPTION_BYTES = 639`) that is plumbed through to Boltz and ends up as the BOLT11 `d` field on the issued invoice — **breaking** for direct callers of `get_ln_invoice` / `get_ln_invoice_with_preimage_hash`.

### SDK Version Handshake
Every request from `ark-grpc` and `ark-rest` carries an `x-build-version` header set to the calling crate's `CARGO_PKG_VERSION`. In gRPC this is enforced by a `VersionInterceptor` wrapping the shared `tonic::transport::Channel` so both `ArkServiceClient` and `IndexerServiceClient` carry the header; in REST the header is plumbed in as a `reqwest::Client` default header (which makes `ark_rest::Client::new` fallible — it now returns `Result<Self, Error>`). Servers may reject too-old SDKs by returning gRPC `FailedPrecondition: BUILD_VERSION_TOO_OLD` (or surfacing the same marker in REST error bodies); both crates expose `Error::is_version_mismatch()` so callers can branch on it without parsing source strings. Requests additionally carry `x-digest` (the current `/info` digest, used by the guard below) and `x-sdk-version` (`SDK_VERSION` = `"rust-sdk/<CARGO_PKG_VERSION>"`). `ark-core::server` defines `TARGET_ARKD_VERSION = "0.9.9"` and `SDK_VERSION`.

### Guarded RPC Clients & Digest-Mismatch Refresh
`arkd` rejects RPCs whose cached `/info` digest is stale. Both transports wrap every non-`GetInfo` RPC in a guard that, on a digest mismatch (`DIGEST_MISMATCH` / `invalid digest header`), fetches fresh `/info`, runs a refresh hook to update the higher-level client state, commits the new digest header **only after** the hook succeeds, and returns `Error::server_info_changed` — the original operation is **not** retried automatically. In `ark-grpc` this is realized with wrapper newtypes `guarded::Ark` and `guarded::Indexer` that keep the raw generated tonic clients private and expose a single `request(...)` escape hatch routing through shared guard state; `GetInfo` bootstrap/refresh is the only unguarded path. This makes it hard to add a new RPC that accidentally skips the guard. `ark-rest` mirrors the same behaviour. (The in-repo `docs/guarded-grpc-client-design.md` design note was removed in the 0.10.x cleanup along with the contract-manager design sketches.) Both `ark_grpc::Error` and `ark_rest::Error` expose a public `is_server_info_changed()` (with an internal `is_digest_mismatch()` driving the guard).

### settle vs settle_all
`Client::settle()` renews only the VTXOs the server reports as recoverable plus any confirmed/pre-confirmed VTXOs the client sees as expired, and always includes confirmed boarding outputs so freshly funded coins enter the Ark. Healthy (unexpired) VTXOs are left untouched, keeping periodic renewals cheap. `Client::settle_all()` is the renamed full-renewal path (rolls _all_ prior VTXOs and boarding outputs into the next batch). Isolated sub-dust recoverable VTXOs cannot be rescued by `settle()` unless their combined value clears the server dust threshold (otherwise the batch rejects with `cannot settle into sub-dust VTXO`); callers should fall back to `settle_all()` to roll them in alongside a healthy carrier VTXO.

### Unilateral Exit Finalization
`ark-core::unilateral_exit` builds an exit branch from a `VtxoChains` ancestor sub-DAG and finalizes each virtual transaction in order. `build_unilateral_exit_tree_txids` returns a topologically sorted branch covering every ancestor virtual TX exactly once (rather than enumerating root-to-leaf paths, which is exponential on merged DAGs). The new generic `finalize_virtual_tx_input(psbt, input_index, witness_utxo)` materializes either a taproot key-spend witness (when `tap_key_sig` is present) or a taproot script-spend witness via `finalize_taproot_script_spend_witness`, which selects the first tapleaf with signatures for every `CHECKSIG`/`CHECKSIGVERIFY` pubkey and appends any condition witness elements (e.g. VHTLC preimages) decoded from the `VTXO_CONDITION_KEY` unknown PSBT field. The condition-witness decoder is strict about length-prefix overflow and trailing bytes. `sign_unilateral_exit_tree` is kept as a `#[deprecated]` alias for `finalize_unilateral_exit_tree`.

### Boltz Referral ID
The Boltz referral ID is configured via the `BoltzReferralId` enum on `OfflineClientConfig` (`Default` → `DEFAULT_BOLTZ_REFERRAL_ID` = `"arkade-rs-SDK"`, `Disabled` → no `referralId` field sent, `Custom(String)` → a caller-supplied value). The resolved value is serialized as `referralId` on submarine, reverse, and chain swap creation requests (omitted when `Disabled`). This replaces the previous `boltz_referral_id: Option<String>` constructor argument and the `OfflineClient::with_boltz_referral_id` builder.

### Contract Manager
The 0.10.x line introduces a **Contract Manager** that unifies how the client tracks every spendable output. Rather than special-casing VTXOs vs boarding outputs (the standalone `BoardingWallet` was removed), each output is modelled as a typed *contract*. `ark-core::contract` holds the transport-agnostic model — `ContractType` (`default` / `delegate` / `boarding` / `vhtlc`), the `ContractSpec` trait, `StoredContract`, prefixed vHTLC spend-path kinds, and **contract spend selections** (`SpendSelection` / `SpendPathKind`, each bundling the spend control block). Centralizing spend selections lets `send`/unilateral-exit code pass a resolved selection into spend inputs instead of re-deriving script-spend info, and `vtxo_list` reuses the same status predicates.

`ark-client::contract` layers the client machinery on top: `ContractManager` wraps a pluggable `ContractStore` trait — `MemoryContractStore` for ephemeral use or `SqliteContractStore` (with migrations, `new_default()`) for persistence — and a `ContractRegistry` of registered builtins (`register_builtins`). It exposes annotation helpers (`annotate_vtxos`, `annotated_boarding_outputs`, `spendable_selections`) that produce `AnnotatedVtxo` / `AnnotatedBoardingOutput` / `AnnotatedVtxoList`, each pairing an output with its stored contract and its resolved spend selections, tapscripts, `server_pk`, `owner_pk`, and `exit_delay`. Boarding and default contracts are coalesced, and the `VtxoWatcher`, offchain-send, and settlement paths all operate on annotated contract VTXOs.

Two public `Client` APIs sit on the manager: `list_contracts() -> Vec<ContractInfo>` returns wallet-facing views (derived `address` + `ContractAddressKind`, decoded `server_pk`, per-contract `ServerSignerStatus`), and `restore_contracts(gap_limit) -> ContractRestoreReport` runs a contract-centric HD restore — scanning derived key indexes up to the gap limit, recording per-key offchain-VTXO and boarding activity, counting inserted-vs-known contracts, and suggesting the next receive index. On `connect()`, `hydrate_persisted_contract_keys()` reloads HD keys from persisted contracts **without advancing the receive index**, using the split-out `DiscoverableKeyProvider` trait (`OfflineClient::with_discoverable_key_provider`). Malformed builtin contract rows surface as errors instead of being silently dropped.

### Arkade Script & Introspector
`ark-script` lives outside `ark-core` so non-arkade consumers don't pay for its dependencies. It defines the 47 Arkade extension opcodes (aliasing the `OP_NOP4` / `OP_RETURN_196..=243` slots so they round-trip through `bitcoin::script::Builder`), arkade-aware ASM helpers, BIP-340 tagged hashes (`ArkadeScriptHash` / `ArkadeWitnessHash`) and `compute_arkade_script_public_key` (`P' = P + H(script)*G`, even-Y enforced to match the Go introspector). `ArkadeTapscript` encodes the `Multisig` / `CsvMultisig` leaves used by arkade flows, and `ArkadeVtxoScript::new` mixes plain taproot leaves with `ArkadeLeaf`s, derives tweaked introspector keys, and emits a flat script list ready for `TaprootBuilder` plus a leaf-index → arkade-script map for downstream PSBT signing.

`ark-introspector-client` is a thin HTTP client for the Go introspector co-signer (preserves error-response bodies, configurable per-request timeout). `ark-core::introspector::packet` builds introspector packets with strict validation (rejects empty packets, oversize / underflowing payloads, trailing witness bytes, invalid script lengths) and `ark-core::extension` appends them as Ark extension fields rather than mixing them into asset packets. The dockerized introspector image is built from source by `justfile` and CI; `e2e_arkade_script` exercises end-to-end arkade-script flows against it.

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
│   ├── contract.rs          # Contract model, spend selections
│   ├── unilateral_exit.rs   # Exit without server
│   └── server.rs            # Round protocol types
├── ark-client/src/          # Client library
│   ├── lib.rs               # Client, OfflineClient, list/restore contracts
│   ├── contract.rs          # ContractManager, ContractStore, AnnotatedVtxo
│   ├── key_provider.rs      # KeyProvider / DiscoverableKeyProvider
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
├── ark-script/src/          # Arkade scripting extension (standalone)
│   ├── lib.rs               # Crate root
│   ├── opcodes.rs           # Arkade extension Opcode constants + name lookup
│   ├── script.rs            # to_asm / from_asm helpers
│   ├── tweak.rs             # ArkadeScriptHash / WitnessHash, key tweaking
│   ├── tapscript.rs         # ArkadeTapscript encoder (Multisig, CsvMultisig)
│   └── vtxo_script.rs       # ArkadeVtxoScript builder
├── ark-introspector-client/src/  # HTTP client for the Go introspector
├── ark-rs/src/              # Umbrella re-export
├── ark-client-sample/       # Example application (incl. watch-delegated)
└── e2e-tests/tests/         # E2E tests against live arkd
    ├── e2e_assets.rs                    # Asset issue/transfer/burn/reissue
    ├── e2e_delegate.rs                  # Delegate settlement
    ├── e2e_arkade_script.rs             # Arkade script flow vs dockerized introspector
    └── fulmine_delegator_smoke.rs       # VtxoWatcher + fulmine delegator
```

## Testing Architecture

- **Unit tests**: Per-crate via `cargo test` / `just test`
- **E2E tests**: In `e2e-tests/` crate, run against the **arkade-regtest** Docker Compose stack (Bitcoin Core + Fulcrum + mempool/esplora + arkd + emulator), a git submodule at `regtest/` driven by `regtest.mjs`. Replaces the former Nigiri + Go-source-arkd setup; the stack bundles and self-funds arkd from `ARKD_IMAGE` and exposes the introspector via the emulator profile (port 7073). The e2e helper resolves on-chain state through Bitcoin Core (`gettxout` / `getrawtransaction`), not the esplora indexer
- **WASM tests**: Via `wasm-pack test` for `ark-rest`
- **MSRV check**: Via `cargo msrv verify` per crate
