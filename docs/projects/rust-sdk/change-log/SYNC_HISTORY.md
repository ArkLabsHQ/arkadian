# Documentation Sync History - Arkade Rust SDK

## 2026-05-25 - x-build-version handshake, BOLT11 description, unilateral-exit DAG rewrite
**From**: `0444708fc20a79f551b1a01d2b6ae2d74515a7a8`
**To**: `241e2291dc615dcfe7a276a976f8d3a9f13eab75`
**Synced By**: update-project skill
**Commits analyzed**: 13 (no merges)

**Summary**: Two new user-facing features plus a deep refactor/fix pass on the unilateral-exit finalizer. `ark-grpc` and `ark-rest` now send `x-build-version` (`CARGO_PKG_VERSION`) on every request so servers can reject too-old SDKs; `ark_rest::Client::new` is now fallible. `ark-client::get_ln_invoice` and `get_ln_invoice_with_preimage_hash` gained a trailing `description: Option<String>` arg that ends up in the BOLT11 `d` field. `ark-core::unilateral_exit` was rewritten to traverse the ancestor sub-DAG topologically (avoiding exponential path enumeration) and to finalize each virtual transaction generically from PSBT data via new public `finalize_virtual_tx_input` / `finalize_taproot_script_spend_witness` helpers; the condition-witness decoder gained strict length-prefix validation, and `sign_unilateral_exit_tree` is preserved as a `#[deprecated]` alias. Round-streaming code in `ark-client::batch` consistently uses "batch-tree" terminology.

**Changes**:
- `feat: Send x-build-version header for every request` (`b7dcf8c`, resolves #195) — `ark-grpc::Client` switches to a shared `tonic::transport::Channel` wrapped by `VersionInterceptor` (both `ArkServiceClient` and `IndexerServiceClient` carry the header); `ark-rest::Client::new` builds a `reqwest::Client` with `X-Build-Version` as a default header. Servers signal too-old SDKs via gRPC `FailedPrecondition: BUILD_VERSION_TOO_OLD` (REST surfaces the same marker in the error body). Both crates gain `Error::is_version_mismatch()` with unit tests. **Breaking**: `ark_rest::Client::new(url)` returns `Result<Self, Error>` instead of `Self`; the wasm test harness and `e2e_rest_client_get_info` updated. `ark-grpc::Client` now derives `Clone` and gets a hand-rolled `Debug`.
- `feat(boltz): pass invoice description through to reverse swaps` (`09c2cc1`) — adds `MAX_BOLT11_DESCRIPTION_BYTES = 639` constant + `validate_invoice_description` helper in `ark-client/src/boltz.rs`; `CreateReverseSwapRequest` gains `description: Option<String>` (skip-serialize-if-none); `get_ln_invoice` / `get_ln_invoice_with_preimage_hash` gain a trailing `description: Option<String>` argument; `boltz_reverse.rs` e2e uses it; sample app threads `None`. **Breaking** for direct callers.
- `fix: avoid exponential unilateral exit paths` (`da69cf2`) — replaces the recursive `find_paths_to_commitment` (which produced one entry per root-to-leaf path) with `visit_virtual_ancestors`, a DFS that visits each ancestor virtual TX once and emits a topologically sorted branch. Drops the 1000-depth safety net (cycles are now detected via a `visiting`/`visited` set pair).
- `fix: finalize unilateral exit branches generically` (`258006d`) — adds public `finalize_virtual_tx_input(psbt, input_index, witness_utxo)` and `finalize_taproot_script_spend_witness(input)` helpers. Script-spend finalizer picks the first tapleaf whose `CHECKSIG`/`CHECKSIGVERIFY` pubkeys (extracted via `script::extract_checksig_pubkeys`) all have `tap_script_sigs`, pushes signatures in reverse script order, then appends elements decoded from the `VTXO_CONDITION_KEY` (type 222) unknown PSBT field.
- `fix: validate condition witness decoding` (`97f856e`) — strict `usize::try_from` + checked arithmetic when reading the condition witness count and per-element lengths; rejects counts that can't fit in the remaining buffer, length-prefix overflow, and trailing bytes.
- `fix: Do not expect in unilateral_exit.rs` (`3cb0951`) — replaces an `.expect(...)` in the condition-witness path with a returned `Error::transaction`.
- `chore: keep unilateral exit finalizer alias` (`d07f10f`) — keeps `sign_unilateral_exit_tree` as a `#[deprecated(note = "use finalize_unilateral_exit_tree")]` wrapper.
- `refactor: clarify batch-tree exit terminology` (`b2e2f04`) — `vtxo_graph` / `vtxo_graph_chunks` → `vtxo_batch_tree_graph(_chunks)` in `ark-client::batch` round-event handling; user-facing error strings standardised on "batch-tree" wording. Internal-only rename across `ark-client/src/{batch,unilateral_exit}.rs` and `ark-core/src/{batch,send,server,tree_tx_output_script,unilateral_exit}.rs`.
- `docs: document condition witness stack invariant` (`c5cdf1e`) — code comments documenting the `VTXO_CONDITION_KEY` payload layout.
- Tests: `5304b64` (VHTLC ancestor unilateral exit e2e), `b0f7557` (fail fast on reverse swap payment issues), `5644e1e` (DAG ordering unit test), `6d2df3e` (condition witness decoding unit test).

**Breaking changes**:
- `ark_rest::Client::new(url) -> Result<Self, Error>` (was `Self`) — direct callers must `?` the result.
- `ark-client::get_ln_invoice` / `get_ln_invoice_with_preimage_hash` gain a trailing `description: Option<String>` parameter — pass `None` to take the default.

**Docs files updated**:
- `docs/projects/rust-sdk/INDEX.md` (frontmatter `last_sync_commit`, Boltz capability line, new build-version handshake bullet)
- `docs/projects/rust-sdk/system/project_overview.md` (two new top entries under Recent Additions for x-build-version and BOLT11 description; new bullet on unilateral exit + batch-tree terminology)
- `docs/projects/rust-sdk/system/architecture.md` (new "SDK Version Handshake" and "Unilateral Exit Finalization" sub-sections; reverse-swap chain-swap section now mentions BOLT11 `description` arg)
- `docs/INDEX.md` (rust-sdk Key Capabilities — appended BOLT11 description, build-version handshake, unilateral-exit rewrite)
- `docs/projects/rust-sdk/change-log/last-sync.txt`

---

## 2026-05-13 - Boltz referralId on swap creation
**From**: `887cb4a1c87124594c13b4d2a1ffc1c7d89934fc`
**To**: `0444708fc20a79f551b1a01d2b6ae2d74515a7a8`
**Synced By**: update-project skill
**Commits analyzed**: 1 (no merges)

**Summary**: `OfflineClient` now carries a `boltz_referral_id: Option<String>` and injects it as the `referralId` field on Boltz submarine, reverse, and chain swap creation requests. Defaults to `DEFAULT_BOLTZ_REFERRAL_ID` (`"arkade-rs-SDK"`) when the constructor is called with `None`; callers can opt out via `OfflineClient::with_boltz_referral_id(None)`.

**Changes**:
- `feat(boltz): send referralId on swap requests` (`256b964`) — closes #221. Adds `DEFAULT_BOLTZ_REFERRAL_ID` constant in `ark-client/src/lib.rs`. Adds `boltz_referral_id: Option<String>` positional parameter to `OfflineClient::new`, `OfflineClient::with_kind`, and `OfflineClient::with_keypair`; constructor substitutes the default when `None`. New `with_boltz_referral_id(Option<String>) -> Self` builder method and `boltz_referral_id() -> Option<&str>` getter on both `OfflineClient` and `Client`. `CreateSubmarineSwapRequest` / `CreateReverseSwapRequest` / `CreateChainSwapRequest` gain a `referral_id: Option<String>` field serialized as `referralId` with `skip_serializing_if = "Option::is_none"`. Six new serialization tests cover set/unset cases for each request type. Sample app and e2e harness updated to pass `None`.

**Breaking changes**: `OfflineClient::new` / `with_kind` / `with_keypair` constructors gain a positional `boltz_referral_id: Option<String>` argument — direct callers must thread it through (pass `None` for default behaviour).

**Docs files updated**:
- `docs/projects/rust-sdk/INDEX.md` (frontmatter `last_sync_commit`, Boltz swap capability line)
- `docs/projects/rust-sdk/system/project_overview.md` (new top entry under Recent Additions)
- `docs/projects/rust-sdk/system/architecture.md` (new "Boltz Referral ID" sub-section under Key Design Decisions)
- `docs/projects/rust-sdk/testing/usage.md` (client init example threads the new positional arg)
- `docs/INDEX.md` (rust-sdk Key Capabilities — appended referralId note)
- `docs/projects/rust-sdk/change-log/last-sync.txt`

---

## 2026-05-07 - 0.9.0 Release-Prep Metadata
**From**: `f12ef0a7494a99f40076ec3ceb3bce9e7737d144`
**To**: `887cb4a1c87124594c13b4d2a1ffc1c7d89934fc`
**Synced By**: update-project skill
**Commits analyzed**: 2 (no merges)

**Summary**: Release-prep sync — no behavior or API changes. Workspace prepared for crates.io publish.

**Changes**:
- `chore: prepare crate metadata for 0.9.0` (`12e9c11`) — bumps every publishable crate to **v0.9.0** (`ark-rs`, `ark-core`, `ark-client`, `ark-grpc`, `ark-rest`, `ark-bdk-wallet`, `ark-fees`, `ark-delegator`); `ark-script` and `ark-introspector-client` jump from `0.1.0` → `0.9.0` to align the workspace. Workspace `Cargo.toml` adds `keywords = ["ark", "arkade", "bitcoin", "wallet"]` and `categories = ["cryptography::cryptocurrencies"]`, inherited by all publishable crates. Adds (or rewrites) `README.md` for each publishable crate (`ark-rs`, `ark-core`, `ark-client`, `ark-grpc`, `ark-rest`, `ark-bdk-wallet`, `ark-fees`, `ark-delegator`, `ark-script`, `ark-introspector-client`) — `ark-rest` README trimmed dramatically, others added fresh.
- `docs: simplify root readme` (`65e0931`) — root `README.md` rewritten as a concise crate index pointing at per-crate docs and `docs.rs`; removed legacy installation/usage walkthrough (now lives in `ark-rs` / `ark-client` READMEs and on `docs.rs`).

**Breaking changes**: None.

**Docs files updated**:
- `docs/projects/rust-sdk/INDEX.md` (frontmatter `last_sync_commit` + `version`, workspace crates bumped to v0.9.0, added crates.io metadata note)
- `docs/projects/rust-sdk/system/project_overview.md` (added 0.9.0 release-prep entry, all `(v0.8.0)` → `(v0.9.0)`, project status line)
- `docs/INDEX.md` (rust-sdk description — appended v0.9.0 alignment note)
- `docs/projects/rust-sdk/change-log/last-sync.txt`

---

## 2026-05-06 - Arkade Script, Introspector Client & Reverse-Swap Metadata
**From**: `3abb5df17848079c72d01ba8f2569ef7fa8f85a8`
**To**: `f12ef0a7494a99f40076ec3ceb3bce9e7737d144`
**Synced By**: update-project skill
**Commits analyzed**: 26 (no merges)

**Major additions**:
- New `ark-script` crate — Arkade scripting extension (47 extension opcodes aliasing `OP_NOP4` / `OP_RETURN_196..=243`, ASM helpers, BIP-340 tagged hashes, `compute_arkade_script_public_key`, `ArkadeTapscript`, `ArkadeVtxoScript`); byte-for-byte verified against ts-sdk vectors
- New `ark-introspector-client` crate — HTTP client for the Go introspector co-signer (preserves error response bodies, configurable per-request timeout)
- New `ark-core::introspector::packet` module — strict-validating packet builder/parser (rejects empty packets, oversized payloads, trailing witness bytes, invalid script lengths)
- New `ark-core::extension` module — appends introspector packets as Ark extension fields rather than mixing them into asset packets
- `Vtxo` now permits forfeit and unilateral-exit keys to differ
- New `e2e_arkade_script` E2E suite running against a dockerized introspector image built from source
- CI plumbs through a dockerized introspector for arkade-script coverage (`e2e-core.yml`, `ci.yml`, `justfile`)

**Breaking changes**:
- `ReverseSwapData` gained a required `bolt11: String` and an `invoice_expiry: Option<u64>` field (commit `950c3e1`, `feat!: expose invoice metadata on ReverseSwapData`). Callers constructing the struct directly must populate both. `SwapStatus` is also re-exported at the `ark-client` crate root.

**Refactors / fixes** (selection):
- Switch arkd dev/CI to **seconds-based** delays; block-based delays were regtest-only and ambiguous; DLC e2e tests stop using block-based timelocks
- Reject empty asset packets; reject trailing witness bytes; validate introspector payload length / script length
- Parse unknown ASM opcodes; align Arkade opcode table
- Set introspector client timeout; preserve introspector error response bodies
- `justfile` correctly forwards env vars through `run-wallet` / `run-light`

**Docs files updated**:
- `docs/projects/rust-sdk/INDEX.md` (frontmatter version + last_sync_commit, workspace crates, capabilities, dep graph, integration points)
- `docs/projects/rust-sdk/system/project_overview.md` (recent additions + new crate sections)
- `docs/projects/rust-sdk/system/architecture.md` (12 crates total, new arkade-scripting layer, dependency graph, source structure)
- `docs/projects/rust-sdk/testing/how_to_run.md` (e2e_arkade_script, seconds-based delays note)
- `docs/INDEX.md` (master — rust-sdk description/capabilities/tags/triggers, introspector dependency, correlation matrix entry)
- `docs/projects/rust-sdk/change-log/last-sync.txt`

---

## 2026-04-29 - Delegator, Assets & Chain Swaps
**From**: `07a8bca8cb123beec3130bc63ef233c2694a146c`
**To**: `3abb5df17848079c72d01ba8f2569ef7fa8f85a8`
**Synced By**: update-project skill
**Commits analyzed**: ~95 (no merges)
**Files changed in repo**: 81 (+8,788 / -615 lines)

**Major additions**:
- New `ark-delegator` crate — REST client for Ark delegator services (`info`, `delegate`)
- `ark-client` `VtxoWatcher` — background task that auto-delegates new VTXOs and self-renews near-expiry VTXOs
- Delegator-aware `OfflineClient` — `delegator_pk` + `historical_delegator_pks`; 3-leaf delegated address generation; key discovery now probes delegate addresses too
- Arkade Asset V1 in `ark-core` — `AssetId`, `Packet`/`AssetGroup` (OP_RETURN), issue / reissue / burn transaction builders; asset-preserving settlement
- `ark-client` asset operations — `issue_asset` and shared offchain-send path used by transfer/burn/reissue
- Chain swaps via Boltz (ARK ↔ on-chain BTC) — `create_chain_swap`, `wait_for_chain_swap_server_lockup`, `claim_chain_swap{,_btc}`, `refund_chain_swap{,_btc}`; new `chain_swaps` SQL migration
- `ark-client-sample` `watch-delegated` command and `delegator_pubkey` config
- `e2e_assets`, `fulmine_delegator_smoke` test suites
- arkd protocol bump to 0.9.2 (gRPC + REST schemas regenerated)
- REST SSE client now strips `data: ` prefix and handles `heartbeat` / `stream_started` events

**Refactors / fixes** (selection):
- Generic offchain send entrypoints unified (asset + VTXO sends share builder)
- Asset reissuance / issuance packet handling moved into `ark-core`
- VtxoWatcher: serialize event handling, settle_vtxos, valid_at uses full vtxo lifetime, configured-dust-aware `valid_at` recoverable check, day-grouping tests
- Delegator REST client gets per-request timeouts and rustls TLS backend
- Reject 0-amount control assets, 0-amount asset entries from REST, asset-supply overflow checks
- TX stream parses transaction as `Transaction` or `PSBT`
- Various ErrorContext / error-source preservation improvements

**Docs files updated**:
- `docs/projects/rust-sdk/INDEX.md` (version bump, new crate, capabilities, dep graph)
- `docs/projects/rust-sdk/system/project_overview.md`
- `docs/projects/rust-sdk/system/architecture.md`
- `docs/projects/rust-sdk/testing/usage.md`
- `docs/projects/rust-sdk/testing/how_to_run.md`
- `docs/projects/rust-sdk/sop/development-workflow.md`
- `docs/INDEX.md` (master — rust-sdk entry, correlation matrix)
- `docs/projects/rust-sdk/change-log/last-sync.txt`

---

## 2026-02-19 - Initial Documentation Setup
**Commit**: `efa10e23ff5a540f16adff08f7d8856e2cc293e1`
**Synced By**: /add-project command
**Status**: Baseline established

**Changes**:
- Created project documentation structure
- Added system/project_overview.md
- Added system/architecture.md
- Added testing/usage.md
- Added testing/how_to_run.md
- Added testing/how_to_test.md
- Added testing/troubleshooting.md
- Added sop/development-workflow.md
- Established sync tracking baseline

**Notes**:
- This is the initial documentation sync point
- Future syncs will track commits since this baseline
- Use `/update-project rust-sdk` to sync after new commits
