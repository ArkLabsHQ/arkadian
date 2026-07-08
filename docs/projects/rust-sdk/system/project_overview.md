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

- **Contract Manager — unified typed-contract model for all spendable outputs (0.10.0 / 0.10.1)** — the SDK now tracks every spendable output (default VTXOs, delegate VTXOs, boarding outputs, vHTLCs) as a typed, persisted *contract* through a single component, replacing the ad-hoc boarding/VTXO bookkeeping and the standalone `BoardingWallet` (removed). **`ark-core::contract`** defines the shared model: a `ContractType` newtype with builtins (`default` / `delegate` / `boarding` / `vhtlc`), the `ContractSpec` trait, `StoredContract`, prefixed vHTLC spend-path kinds, and centralized **contract spend selections** — `SpendSelection` / `SpendPathKind` values that each carry the required spend control block, so `send`/exit code passes spend selections into spend inputs instead of doing raw script-spend-info lookups (`vtxo_list` shares the resolved status predicates). **`ark-client::contract`** adds the client machinery: a `ContractManager` over a pluggable `ContractStore` trait — `MemoryContractStore` or the SQLite-backed `SqliteContractStore` (`new(db_path)` / `new_default()`, with migrations) — a `ContractRegistry` of registered builtins (`register_builtins`), and annotation types `AnnotatedVtxo` / `AnnotatedBoardingOutput` / `AnnotatedVtxoList` that pair each output with its stored contract and expose resolved `spend_selections()`, `tapscripts()`, `server_pk()`, `owner_pk()`, and `exit_delay()`. Boarding outputs now live inside the contract manager (boarding + default contracts are coalesced), and the `VtxoWatcher`, offchain-send, and settlement flows all operate on annotated contract VTXOs. New public `Client` APIs: `list_contracts() -> Vec<ContractInfo>` (wallet-facing view with derived `address` + `ContractAddressKind`, decoded `server_pk`, and per-contract `ServerSignerStatus`) and `restore_contracts(gap_limit) -> ContractRestoreReport` (contract-centric HD restore — scans derived keys up to the gap limit, reports scanned/discovered key indexes, per-key offchain VTXO and boarding activity via `ContractRestoreEntry` / `ContractRestoreDiscovery`, counts of inserted-vs-known contracts, and the suggested next receive index). On connect the client hydrates HD keys from persisted contracts via `hydrate_persisted_contract_keys()` **without advancing the receive index**, using the newly split-out `DiscoverableKeyProvider` trait (`OfflineClient::with_discoverable_key_provider`); malformed builtin contract rows are surfaced as errors rather than silently dropped. The `ark-client-sample` gains `list-contracts` and `restore-contracts` commands plus a configurable memory-or-SQLite contract-store backend (SQLite by default). Ships across the **0.10.0** release, with **0.10.1** adding a watcher fix that renews server-recoverable VTXOs and constraining vHTLC spend selections in `ark-core`.
- **`OfflineClientConfig` builder + TTL-based server-info refresh (BREAKING)** — client construction was reworked around a single `OfflineClientConfig` struct, replacing the long positional constructors. `OfflineClient::new` / `new_with_keypair` / `new_with_bip32` are gone; the new entry points are `OfflineClient::with_key_provider(config, key_provider, blockchain, wallet, swap_storage)`, `with_keypair(config, kp, …)`, and `with_bip32(config, xpriv, path, …)`. `OfflineClientConfig` (`#[derive(Default)]`, defaults targeting mainnet) carries `ark_server_url`, `boltz_url`, `timeout`, `server_info_ttl`, `boltz_referral_id`, `delegator_pk`, and `historical_delegator_pks`, so callers set only the fields they care about via `..Default::default()`. The `K` key-provider generic was dropped — `OfflineClient<B, W, S, K>` / `Client<B, W, S, K>` are now `OfflineClient<B, W, S>` / `Client<B, W, S>` (the key provider is stored as `Arc<dyn KeyProvider>`), and the `name` field/identifier argument was removed. The Boltz referral ID is now a `BoltzReferralId` enum (`Default` / `Disabled` / `Custom(String)`) on the config instead of an `Option<String>` argument + `with_boltz_referral_id` builder; `boltz_url` is normalized (trailing `/` trimmed) at construction. New public constants: `ARKADE_MAINNET_URL` (`https://arkade.computer`), `ARKADE_MUTINYNET_URL`, `BOLTZ_MAINNET_URL` (`https://api.boltz.exchange`), `BOLTZ_MUTINYNET_URL`, `DEFAULT_TIMEOUT` (30s), `DEFAULT_SERVER_INFO_TTL` (15 min). Alongside the config, `Client::server_info()` is now **async** and refreshes the cached `/info` snapshot once `server_info_ttl` elapses (single-flight behind an async mutex with a lock-free fast path; set `server_info_ttl` to `Duration::ZERO` to refresh on every access) — the previous hard-coded `SERVER_INFO_TTL` const is gone. Follow-up fixes keep the batch loop's server-info snapshot consistent across a round and reuse the cached info in the exit-delay check. **Breaking** for all direct constructor callers (the sample app and e2e harness were migrated to the new builders).
- **Arkade server signer key rotation (0.9.3)** — the SDK now handles Arkade server signer-key rotation end-to-end. When `arkd` advertises a *deprecated* signer alongside a cooperative-sign cutoff date, holders of VTXOs/boarding outputs minted under the old key can migrate off it (settle into the current signer) while cooperation is still available. `ark-core::server` adds two status models: `DeprecatedSignerStatus` — `Migratable` (`cutoff_date > now`), `DueNow` (`cutoff_date == 0`, rotate immediately but the operator still co-signs), `Expired` (cutoff passed) — with `from_cutoff`, `seconds_until_cutoff`, and `is_cooperatively_migratable`; and `ServerSignerStatus` — `Current` / `Deprecated(DeprecatedSignerStatus)` / `Unknown` — with `requires_recovery` (deprecated **and** cooperative window closed) and `is_pre_cutoff_deprecated`. `Info` gains `all_server_keys()`, `signer_status_at(pk, now)`, `deprecated_signer_status_at(..)`, `signer_requires_recovery_at(..)`, and `is_signer_past_cutoff_at(..)`. A new `ark-client::migration` module exposes `Client::migrate_deprecated_signer_vtxos(blockchain)`, which runs **two symmetric, independent legs** — a VTXO leg and a boarding leg, never combined into one intent. Each leg owns its own sizing pipeline: inputs above the server's per-output ceiling (`vtxo_max_amount`) are split out as `oversized` (must exit unilaterally), the remainder is selected highest-value-first bounded by `MAX_VTXOS_PER_SETTLEMENT = 50` and a running aggregate within the ceiling (overflow → `deferred` for a later cycle), and a below-dust selection is `skipped` (`MigrationSkipReason::BelowDust` / `OversizedOnly` / `NothingMigratable`). A leg failure backs off and never suppresses the other leg; results come back as `DeprecatedSignerMigrationReport { vtxo, boarding }` with `failed()`, `rotated()`, and `settle_txids()` helpers (per-leg `MigrationLegReport` carries `settle_txid`, `migrated`, `deferred`, `oversized`, `skipped`, `error`). Companion read APIs: `Client::deprecated_signer_status()` returns per-signer `DeprecatedSignerReport` (status, cutoff, `seconds_until_cutoff`, spendable `vtxo_count` and total amount), and new `Client::pending_recovery()` / `Client::refresh_server_info()`. Supporting fixes in the release: signer cutoff is enforced when selecting VTXOs for ordinary settles, Unix-time retrieval is now fallible and tolerates negative timestamps, and time/exit-delay helpers were extracted into `ark-client::utils`. New `e2e_signer_rotation` integration test. Ships as the **0.9.3** release across all publishable crates.
- **Guarded gRPC/REST clients + digest-mismatch refresh + new request headers** — both transports now route every non-`GetInfo` RPC through a guard that handles a stale `/info` digest: run the RPC, and if `arkd` rejects it because the cached digest is stale (`DIGEST_MISMATCH` / `invalid digest header`), fetch fresh `/info`, run a refresh hook to update the higher-level client state, commit the new digest header, and return `Error::server_info_changed` **without** retrying the original operation. In `ark-grpc` this is implemented with wrapper newtypes `guarded::Ark` / `guarded::Indexer` that keep the raw generated tonic clients private and expose a single `request(...)` escape hatch, so new RPCs can't accidentally skip the guard (`GetInfo` bootstrap/refresh is the only unguarded path; see `docs/guarded-grpc-client-design.md` in the repo). `ark-rest` mirrors the same digest-mismatch behaviour (`fix(rest): add guarded digest-mismatch parity`). Both `ark_grpc::Error` and `ark_rest::Error` gain a public `is_server_info_changed()` helper. Requests now also carry compatibility/digest/SDK headers: `x-digest` (current `/info` digest), `x-sdk-version` (`SDK_VERSION` = `"rust-sdk/<CARGO_PKG_VERSION>"`), alongside the existing `x-build-version`. `ark-core::server` adds `TARGET_ARKD_VERSION = "0.9.9"` and `SDK_VERSION` constants.
- **`settle()` narrowed to expired/recoverable VTXOs + boarding outputs; full renewal renamed to `settle_all()`** — the previous full-renewal settle is now `Client::settle_all()` (rolls _all_ prior VTXOs and boarding outputs into the next batch). The new `Client::settle()` only renews VTXOs in the server's recoverable bucket plus any confirmed/pre-confirmed VTXOs the client sees as expired, and always pulls in confirmed boarding outputs so freshly funded coins enter the Ark. Healthy (unexpired) VTXOs are left untouched, keeping periodic renewals cheap. **Sub-dust limitation:** isolated sub-dust recoverable VTXOs can only be rescued when their combined value clears the server's dust threshold; otherwise the batch is rejected with `cannot settle into sub-dust VTXO`. Callers holding isolated sub-dust amounts should fall back to `settle_all()`, which can roll them in alongside a healthy VTXO acting as carrier value.
- **E2E suite migrated off Nigiri to the in-house arkade-regtest stack** — the e2e setup no longer builds `arkd` from Go source against Nigiri. It now uses the `arkade-regtest` Docker Compose stack (Bitcoin Core + Fulcrum + mempool/esplora + arkd + emulator), added as a git submodule at `regtest/` and driven by its zero-dependency Node CLI `regtest.mjs` (matching ts-sdk / dotnet-sdk). New `justfile` recipes replace the old arkd-build machinery: `regtest-init` (submodule), `regtest-start` (`regtest.mjs start --profile emulator`), `regtest-stop`, `regtest-clean`, `faucet`, `mine`; `e2e-full` now runs `regtest-clean` + `regtest-start` + `e2e-tests`. The stack bundles and self-funds arkd from `ARKD_IMAGE` and provides the introspector as the emulator profile (port 7073). On-chain state is resolved via Bitcoin Core (`gettxout` / `getrawtransaction`, `txindex=1`) rather than the esplora indexer, which lagged the chain on regtest and broke multi-settlement flows. `setup_arkd.sh` and the Go-source build/fund recipes were removed.
- **Reverse-swap to another Arkade user + restored `finalize_pending_offchain_tx` API** — `ark-client`'s reverse-swap path now supports invoicing into a recipient Arkade address rather than always claiming into a fresh local address. `ReverseSwapData` gains a new `claim_address: Option<ArkAddress>` field (persisted via the SQLite swap-storage row) and a new public API `Client::get_ln_invoice_for_address(amount, recipient_address, expiry_secs, description)` constructs a reverse swap whose claim TX pays `recipient_address`. Before persisting the swap, the client validates that the recipient address's encoded server pubkey matches `self.server_info.signer_pk` (so callers can't accidentally invoice into an address on a different arkd); when `claim_address` is `None`, the existing behaviour of claiming into a fresh `get_offchain_address()` output is preserved. `ark-core::ArkAddress` exposes the new `server() -> XOnlyPublicKey` accessor used by that check. Internally, both `get_ln_invoice*` variants now route through a private `create_reverse_swap_invoice_with_new_preimage` helper, threading the optional recipient through to Boltz. On the offchain-tx side, `ark-client::Client::submit_offchain_tx` is no longer gated behind a feature flag (so consumers can drive the submit / finalize boundary themselves), `finalize_offchain_tx` is now `pub`, and a new `finalize_pending_offchain_tx(ark_txid: Txid)` public API restores the ability to finalize one specific pending tx by ID — it re-fetches the pending list, finds the matching `PendingOffchainTx`, and signs/finalizes it (returns `Error::ad_hoc` if no match). The `ark-client-sample` reverse-swap command is wired through the new path.
- **0.9.2 release + `ark-grpc` TLS fix + crates release CI** — every publishable crate (`ark-rs`, `ark-core`, `ark-client`, `ark-grpc`, `ark-rest`, `ark-bdk-wallet`, `ark-fees`, `ark-delegator`, `ark-script`, `ark-introspector-client`) bumped from `0.9.1` → `0.9.2`; intra-workspace `path = "..", version = "0.9.1"` pins updated to `0.9.2`; root and per-crate `README.md` install snippets refreshed. The patch release ships **one functional fix** in `ark-grpc::Client::connect`: when either `tls-webpki-roots` or `tls-native-roots` is enabled, the manually constructed `tonic::transport::Endpoint` now has `ClientTlsConfig` applied (`with_webpki_roots()` / `with_native_roots()`) before `.connect()`. Previously, `tls-config` was only attached via the URL scheme inference that `tonic` 0.14 no longer performs unconditionally, so connecting to a TLS-enabled `arkd` from manually built endpoints could fail with a transport error. New CI: `.github/workflows/draft_release_crates.yml` opens a release PR (and `create_release_crates.yml` publishes + tags on merge from `release/crates-<version>` branches); the latter is idempotent — it skips `cargo publish` for any crate already on crates.io at the target version and tolerates an existing git tag, so a partially failed release can be safely re-run.
- **0.9.1 release + introspector emulator env fix** — every publishable crate (`ark-rs`, `ark-core`, `ark-client`, `ark-grpc`, `ark-rest`, `ark-bdk-wallet`, `ark-fees`, `ark-delegator`, `ark-script`, `ark-introspector-client`) bumped from `0.9.0` → `0.9.1`; all intra-workspace `path = "..", version = "0.9.0"` dependency pins updated to `0.9.1`; root and per-crate `README.md` install-snippets refreshed accordingly. No API or behavior changes. The `justfile` `introspector-docker-run` recipe now also exports the four `EMULATOR_*` env vars (`EMULATOR_SECRET_KEY`, `EMULATOR_NO_TLS=true`, `EMULATOR_ARKD_URL=host.docker.internal:7070`, `EMULATOR_LOG_LEVEL=6`) alongside the existing `INTROSPECTOR_*` ones, so the dockerized introspector emulator picks up the local arkd in `nigiri` for `e2e_arkade_script` runs without manual env tweaks.
- **Batch event waits honour the client timeout** — `ark-client::batch` now wraps `stream.next()` in `timeout_op(self.inner.timeout, …)` on both the settlement and delegate-settlement loops. Previously a stalled `arkd` round stream could hang the client indefinitely; the call now returns `Error::transaction` with context `"timed out waiting for batch event"` after the configured timeout, so callers can surface the failure and retry.
- **SDK build-version handshake (BREAKING for `ark-rest::Client::new`)** — every gRPC and REST request now carries an `x-build-version` header set to `env!("CARGO_PKG_VERSION")` of the calling crate. In `ark-grpc`, this is injected by a `VersionInterceptor` wrapping the `tonic::transport::Channel` (so both `ArkServiceClient` and `IndexerServiceClient` carry the header); in `ark-rest`, the header is plumbed in as a `reqwest::Client` default header. Servers reject too-old SDKs by returning gRPC `FailedPrecondition` with message `BUILD_VERSION_TOO_OLD` (REST surfaces the same marker in the error body). Both crates expose a new `Error::is_version_mismatch()` helper so callers can detect the rejection without string-matching the source error. `ark_rest::Client::new(url)` now returns `Result<Self, Error>` (the wrapped `reqwest::Client::builder().build()` is fallible) — direct callers must `?` the result. Resolves #195.
- **Optional BOLT11 invoice description on reverse swaps** — `ark-client`'s `get_ln_invoice(amount, expiry_secs, description)` and `get_ln_invoice_with_preimage_hash(amount, expiry_secs, preimage_hash_sha256, description)` gained a trailing `description: Option<String>` argument. The value is validated against `MAX_BOLT11_DESCRIPTION_BYTES = 639` (BOLT11 tagged-field cap of `floor(1023 * 5 / 8)`) and forwarded as the `description` field on `POST /v2/swap/reverse` (skipped when `None`). It ends up in the BOLT11 `d` field, visible to the payer. **Breaking** for direct callers — the sample app threads `None` to take the default.
- **Boltz `referralId` on swap creation (BREAKING)** — `OfflineClient::new` (and `OfflineClient::with_kind` / `with_keypair`) gained a `boltz_referral_id: Option<String>` argument. When `None`, the constructor substitutes `DEFAULT_BOLTZ_REFERRAL_ID` (`"arkade-rs-SDK"`); call `OfflineClient::with_boltz_referral_id(None)` to opt out entirely. The value is sent as `referralId` on `POST /v2/swap/submarine`, `/v2/swap/reverse`, and `/v2/swap/chain` requests (skipped when `None`). New getter `boltz_referral_id()` on both `OfflineClient` and `Client`. The constructor signature is breaking — all callers must thread a new positional argument (the sample app and e2e harness pass `None` to take the default).
- **0.9.0 release-prep** — workspace metadata aligned for crates.io publish: workspace `keywords = ["ark", "arkade", "bitcoin", "wallet"]` and `categories = ["cryptography::cryptocurrencies"]`; every publishable crate now inherits these and ships its own `README.md` (`ark-rs`, `ark-core`, `ark-client`, `ark-grpc`, `ark-rest`, `ark-bdk-wallet`, `ark-fees`, `ark-delegator`, `ark-script`, `ark-introspector-client`). All publishable crates bumped to **v0.9.0** (including `ark-script` and `ark-introspector-client`, which jumped from `0.1.0`); root `README.md` simplified to a crate index.
- **`ark-script` crate** — Arkade scripting extension. Defines the 47 Arkade extension opcodes (aliasing the `OP_NOP4`/`OP_RETURN_196..=243` slots so they round-trip through `bitcoin::script::Builder`), arkade-aware ASM helpers (`to_asm`/`from_asm` tolerant of unknown opcodes), `ArkadeScriptHash` / `ArkadeWitnessHash` BIP-340 tagged hashes, `compute_arkade_script_public_key` (`P' = P + H(script)*G`, even-Y enforced to match the Go introspector), and `ArkadeTapscript` / `ArkadeVtxoScript` encoders for the `Multisig` / `CsvMultisig` leaves used by arkade flows. Encodings are byte-for-byte verified against ts-sdk vectors. Lives outside `ark-core` so non-arkade consumers don't pay for its dependencies.
- **`ark-introspector-client` crate** — HTTP client for the Go introspector co-signer service. Preserves error response bodies and applies a per-request timeout.
- **`ark-core::introspector::packet`** — introspector packet builder/parser with strict validation: rejects empty asset packets, trailing witness bytes, oversized payloads, and invalid script lengths.
- **`ark-core::extension`** — Ark extension field handling; introspector packets are appended to Ark extensions instead of being mixed into asset packets.
- **Split forfeit / unilateral-exit keys** — `Vtxo` now permits the forfeit key and the unilateral-exit key to differ, enabling delegation/HSM patterns where the exit key stays cold.
- **Reverse-swap persistence (BREAKING)** — `ReverseSwapData` gained a required `bolt11: String` and an `invoice_expiry: Option<u64>` so callers can list, display, and monitor pending reverse swaps across restarts. `SwapStatus` is re-exported at the `ark-client` crate root. Direct constructors of `ReverseSwapData` must populate the new fields.
- **Time-based timelocks for arkd dev/CI** — block-based delays were regtest-only and ambiguous; `justfile` and DLC e2e tests now use seconds-based delays (matching production Arkade), and `run-wallet`/`run-light` correctly forward env vars.
- **Dockerized introspector e2e** — `e2e_arkade_script` runs against an introspector image built from source; CI plumbs through a dockerized introspector for end-to-end arkade-script coverage.
- **Unilateral exit: generic finalization + topological branch ordering** — `ark-core::unilateral_exit` now exposes two new public helpers, `finalize_virtual_tx_input(psbt, input_index, witness_utxo)` and `finalize_taproot_script_spend_witness(input)`, that materialize a satisfiable witness for historical virtual transactions in an exit branch using only the authorization data already present in the PSBT. The script-spend finalizer picks the first tapleaf whose `CHECKSIG`/`CHECKSIGVERIFY` pubkeys all have signatures (pushed in reverse script order), then appends any condition witness elements (e.g. VHTLC preimages) decoded from the `VTXO_CONDITION_KEY` unknown input field. The condition-witness decoder now applies strict length-prefix and overflow validation. `build_unilateral_exit_tree_txids` was rewritten to return a topologically sorted ancestor sub-DAG (each virtual TX visited once) instead of enumerating every root-to-leaf path, which avoided exponential blow-up on merged ancestors. The legacy `sign_unilateral_exit_tree` symbol is retained as a `#[deprecated]` alias for `finalize_unilateral_exit_tree`.
- **Batch-tree terminology refactor** — round-streaming code, errors, and tracing in `ark-client::batch` and `ark-core::batch` consistently use "batch-tree" (`vtxo_batch_tree_graph`, "batch-tree signing started", "batch-tree signature without transaction graph") instead of the older "VTXO graph" / "batch tree" mix. Internal-only — no public API rename.

### Carried over from prior sync
- **`ark-delegator` crate** — REST client for Ark delegator services (e.g. fulmine).
- **VTXO watcher** in `ark-client` — auto-delegates and auto-renews VTXOs in the background.
- **Arkade Asset V1** — full issue / transfer / burn / reissue support (asset packets in OP_RETURN, asset preservation during settlement).
- **Chain swaps** — ARK ↔ on-chain BTC via Boltz (new `chain_swaps` SQL migration, claim/refund flows).
- **Delegate-aware client** — `OfflineClient` accepts `delegator_pk` + `historical_delegator_pks`; address generation produces 3-leaf delegated VTXOs.
- **arkd protocol bump to 0.9.2** — gRPC/REST schemas regenerated; REST SSE stream now strips `data: ` prefix and handles `heartbeat`/`stream_started` events.

## Workspace Crates

### ark-core (v0.10.1)
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
- **Contract model** (`contract`): `ContractType` (`default` / `delegate` / `boarding` / `vhtlc`), `ContractSpec` trait, `StoredContract`, prefixed vHTLC spend-path kinds, and centralized **contract spend selections** (`SpendSelection` / `SpendPathKind`, each with its required spend control block) shared by send/exit code and the `vtxo_list` status predicates
- **Server signer rotation models** (`server`): `DeprecatedSignerStatus` / `ServerSignerStatus` enums and `Info` accessors (`all_server_keys`, `signer_status_at`, `deprecated_signer_status_at`, `signer_requires_recovery_at`, `is_signer_past_cutoff_at`) for classifying server signer keys against their advertised cooperative-sign cutoff

### ark-client (v0.10.1)
High-level client API:
- `OfflineClient` → `Client` connection lifecycle, constructed from an `OfflineClientConfig` via `with_keypair` / `with_bip32` / `with_key_provider` / `with_discoverable_key_provider` (server/Boltz URLs, timeout, `server_info_ttl`, `BoltzReferralId`, delegator pubkey + historical pubkeys all configured on the config)
- **Contract manager** (`contract` module): `ContractManager` over a pluggable `ContractStore` (`MemoryContractStore` / `SqliteContractStore`), `ContractRegistry` builtins, and `AnnotatedVtxo` / `AnnotatedBoardingOutput` / `AnnotatedVtxoList` (stored contract + resolved spend selections/tapscripts/keys). Boarding outputs live here (`BoardingWallet` removed)
- `list_contracts()`: wallet-facing `Vec<ContractInfo>` (derived address, decoded `server_pk`, per-contract signer-rotation status); `restore_contracts(gap_limit)`: contract-centric HD restore returning a `ContractRestoreReport`; HD keys hydrate from persisted contracts on connect without advancing the receive index
- `send_vtxo()`: Send off-chain payments (now backed by a generic offchain transaction builder shared with asset sends)
- `submit_offchain_tx()` / `finalize_offchain_tx()` / `finalize_pending_offchain_tx(ark_txid)`: granular control over the submit-then-finalize lifecycle (resume one specific pending tx by `Txid`, useful when an external DB tracks individual pending funding attempts)
- `offchain_balance()`: Query balances
- `spendable_vtxos()`: List spendable VTXOs
- `get_boarding_address()`: Generate boarding addresses
- `get_offchain_address()`: Returns delegated (3-leaf) addresses when a delegator is configured
- `transaction_history()`: Query transaction history
- `settle()`: renew only expired/recoverable VTXOs plus confirmed boarding outputs (cheap periodic renewal; healthy VTXOs untouched; now also enforces the server signer cutoff when selecting inputs)
- `settle_all()`: full renewal — roll _all_ prior VTXOs and boarding outputs into the next batch (use when rescuing isolated sub-dust amounts)
- `migrate_deprecated_signer_vtxos()` / `deprecated_signer_status()`: migrate VTXOs/boarding outputs off a deprecated server signer before its cooperative-sign cutoff (two independent legs, sizing-bounded; see `ark-client::migration`) and inspect per-signer rotation status
- `pending_recovery()`: total value of outputs awaiting recovery; `refresh_server_info()`: force re-fetch and commit `/info`; `server_info()`: now async, returns the cached `/info` and transparently refreshes it once `server_info_ttl` expires
- Round participation and settlement (with asset preservation)
- `generate_delegate()`: prepare delegate forfeit PSBTs for a third-party delegator
- `start_vtxo_watcher()`: launch background `VtxoWatcher` that auto-delegates new VTXOs and self-renews near-expiry VTXOs (safety net)
- **Asset operations**: `issue_asset()`, asset transfer/burn/reissue via shared offchain send path
- **Chain swaps** (ARK ↔ on-chain BTC via Boltz): `create_chain_swap()`, `wait_for_chain_swap_server_lockup()`, `claim_chain_swap()` / `claim_chain_swap_btc()`, `refund_chain_swap()` / `refund_chain_swap_btc()`
- Boltz submarine and reverse submarine swaps — incl. `get_ln_invoice_for_address(amount, recipient_address, expiry_secs, description)` to receive Lightning into another Arkade user's address (recipient validated to share the same arkd signer via `ArkAddress::server()`)
- Swap storage (in-memory or SQLite) — `chain_swaps` table; `reverse_swaps` row now persists optional `claim_address`

### ark-grpc (v0.10.1)
gRPC transport layer (default):
- tonic-based gRPC client
- Protobuf message types (prost)
- Native TLS support
- Test utilities
- **Guarded RPC wrappers** (`guarded::Ark` / `guarded::Indexer`): every non-`GetInfo` RPC goes through a digest-mismatch guard; raw generated clients stay private. `Error::is_server_info_changed()` signals a digest refresh occurred

### ark-rest (v0.10.1)
REST transport layer:
- reqwest-based HTTP client
- WASM-compatible (browser builds)
- OpenAPI-generated client types
- Digest-mismatch parity with `ark-grpc`; `Error::is_server_info_changed()` helper

### ark-bdk-wallet (v0.10.1)
Bitcoin Development Kit integration:
- On-chain wallet operations
- BDK wallet wrapper for Ark boarding/exit

### ark-fees (v0.10.1)
Fee estimation for Ark transactions.

### ark-delegator (v0.10.1)
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

Active development, version 0.10.1 across all publishable crates (0.10.x release line, crates.io metadata aligned). Automated crates.io release pipeline via GitHub Actions (`draft_release_crates.yml` + `create_release_crates.yml`). MIT licensed.

**Repository**: https://github.com/arkade-os/rust-sdk
**MSRV**: Rust 1.86
**License**: MIT
