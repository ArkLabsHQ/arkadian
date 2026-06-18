# Documentation Sync History - Arkade Rust SDK

## 2026-06-18 - Guarded RPC clients + digest-mismatch refresh, smart settle(), and arkade-regtest e2e migration
**From**: `6d33b088ead85f75e12bf069d4596b2f8add2fa2`
**To**: `de2f2cf32329ebb9dd9d4391d79cd3df53d2a243`
**Synced By**: update-project skill
**Commits analyzed**: 8 (no merges)

**Note**: The repo was reported fast-forwarded from `4f5c2590…` → `de2f2cf…`, but `last-sync.txt` was still at `6d33b088…`, leaving a 2-commit gap (`2fdcb1e`, `00f13d8`) undocumented. This sync covers the full `6d33b088..de2f2cf` range so nothing is silently skipped; the doc updates concentrate on the substantive changes below.

**Summary**: Three SDK-consumer-facing themes. (1) Both transports now guard every non-`GetInfo` RPC against a stale `/info` digest: on a `DIGEST_MISMATCH`, fetch fresh `/info`, run a refresh hook to update higher-level client state, commit the new digest header, and return `Error::server_info_changed` without auto-retrying. `ark-grpc` enforces this with private `guarded::Ark` / `guarded::Indexer` wrapper newtypes (raw tonic clients are no longer reachable in normal method bodies), and `ark-rest` mirrors the behaviour for parity. Requests also gained `x-digest` and `x-sdk-version` headers (`SDK_VERSION = "rust-sdk/<version>"`), and `ark-core::server` added `TARGET_ARKD_VERSION = "0.9.9"`. (2) `Client::settle()` was narrowed to renew only expired/recoverable VTXOs plus confirmed boarding outputs (the prior full-renewal path is now `settle_all()`), with a documented sub-dust limitation. (3) The e2e suite was migrated off Nigiri (+ Go-source arkd build) to the in-house `arkade-regtest` Docker Compose stack, added as a `regtest/` git submodule and driven by `regtest.mjs`.

**Changes**:
- `feat(ark-client): narrow settle() to expired/recoverable VTXOs` (`c33a567`) — renames the full-renewal settle to `settle_all()` and introduces a new `settle()` that renews only the server's recoverable bucket plus client-observed expired confirmed/pre-confirmed VTXOs, leaving healthy VTXOs and boarding outputs untouched for cheap periodic renewals (`ark-client/src/batch.rs`).
- `feat(ark-client): include boarding outputs in settle()` (`42fad99`) — `settle()` always pulls confirmed boarding outputs into the smart settle alongside expired/recoverable VTXOs, so freshly funded coins enter the Ark without falling back to `settle_all`.
- `fix(ark-client): sub-dust limitation on settle()` (`a1b586a`) — documents that isolated sub-dust recoverable VTXOs can only be rescued when their combined value clears the server dust threshold; otherwise the batch rejects with `cannot settle into sub-dust VTXO` and callers must use `settle_all()` (a healthy VTXO acts as carrier value).
- `fix(headers): send compatibility, digest, and SDK headers` (`5175a41`) — `ark-grpc`/`ark-rest` now send `x-digest` and `x-sdk-version` headers; `ark-core/src/server.rs` adds `TARGET_ARKD_VERSION = "0.9.9"` and `SDK_VERSION = concat!("rust-sdk/", env!("CARGO_PKG_VERSION"))`.
- `feat(client,grpc): refresh server info through guarded RPC wrappers` (`8d8819d`) — introduces `guarded::Ark` / `guarded::Indexer` wrapper newtypes around the generated tonic clients with a single `request(...)` escape hatch; shared guard state handles digest-mismatch refresh via an info-refresh hook that updates the higher-level client state, committing the new digest header only after the hook succeeds. Adds `Error::server_info_changed` / public `is_server_info_changed()` / internal `is_digest_mismatch()` to `ark-grpc/src/error.rs`. Design captured in the repo's new `docs/guarded-grpc-client-design.md` (260 lines).
- `fix(rest): add guarded digest-mismatch parity` (`97b371f`) — `ark-rest` mirrors the digest-mismatch behaviour (`source_contains_any(["DIGEST_MISMATCH", "invalid digest header"])`), with matching `server_info_changed` / `is_server_info_changed()` / `is_digest_mismatch()` in `ark-rest/src/error.rs`.
- `Migrate regtest e2e off nigiri to the arkade-regtest stack` (`00f13d8`, gap commit) — replaces the Nigiri-based setup with the `arkade-regtest` Docker Compose stack (Bitcoin Core + Fulcrum + mempool/esplora + arkd + emulator), added as a submodule at `regtest/` and driven by `regtest.mjs`. New justfile recipes (`regtest-init`, `regtest-start`, `regtest-stop`, `regtest-clean`, `faucet`, `mine`); `e2e-full` now runs `regtest-clean` + `regtest-start` + tests. Drops the Go-source arkd build/fund machinery, the bespoke introspector recipes, and `setup_arkd.sh`; arkd runs from `ARKD_IMAGE` and the introspector is the emulator profile (port 7073). `.env.regtest` pins images, exit-delay config, 2s block mining, and zero intent fees.
- `Address review on the Bitcoin Core lookups` (`2fdcb1e`, gap commit) — the e2e helper resolves on-chain state via Bitcoin Core (`gettxout` for spend detection, `getrawtransaction` with `txindex=1`) rather than the esplora indexer, which lagged the chain on regtest and broke multi-settlement flows (spent boarding outputs read as unspent; freshly-mined commitment TXs not found).

**Breaking changes**: `Client::settle()` semantics changed — callers relying on it to renew _all_ VTXOs must switch to `Client::settle_all()`. Local e2e workflows must use the new `regtest-*` justfile recipes (Nigiri / `arkd-setup` / Go-source build recipes were removed). No change to indirect REST/gRPC API request signatures (`server_info_changed` is an additive error variant).

**Docs files updated**:
- `docs/projects/rust-sdk/INDEX.md` (frontmatter `last_sync_commit` + `version`; scripts block; new Transport Options + Protocol Features bullets for guarded clients and smart settle; Prerequisites / Build / Test / Technology Stack / Integration Points updated for arkade-regtest)
- `docs/projects/rust-sdk/system/project_overview.md` (three new Recent Additions entries; `ark-client` settle/settle_all; `ark-grpc` / `ark-rest` guarded-RPC notes)
- `docs/projects/rust-sdk/system/architecture.md` (client-layer box; new "Guarded RPC Clients & Digest-Mismatch Refresh" and "settle vs settle_all" design sections; SDK Version Handshake header note; Testing Architecture rewritten for arkade-regtest)
- `docs/projects/rust-sdk/testing/how_to_run.md`, `testing/how_to_test.md`, `testing/troubleshooting.md`, `sop/development-workflow.md` (Nigiri / arkd-setup workflow replaced with the arkade-regtest `regtest.mjs` flow)
- `docs/projects/rust-sdk/testing/usage.md` (Settlement example shows `settle()` vs `settle_all()`)
- `docs/INDEX.md` (rust-sdk Key Capabilities — guarded RPC + smart settle bullets; test_or_run / debug triggers; Dependencies updated to arkade-regtest)
- `docs/projects/rust-sdk/change-log/last-sync.txt`

---

## 2026-06-10 - Reverse-swap to another Arkade user + restored finalize-pending-offchain-tx API
**From**: `8c0e8e3d91ab80e8107415072cf6351573eac19f`
**To**: `6d33b088ead85f75e12bf069d4596b2f8add2fa2`
**Synced By**: update-project skill
**Commits analyzed**: 4 (no merges)

**Summary**: Two SDK-consumer-facing additions on top of `0.9.2`. (1) `ark-client`'s reverse-swap flow can now invoice into another Arkade user's address: `ReverseSwapData` gains an optional `claim_address: Option<ArkAddress>` (persisted by the SQLite row), `ArkAddress` gets a `server() -> XOnlyPublicKey` accessor, and a new public `Client::get_ln_invoice_for_address(amount, recipient_address, expiry_secs, description)` creates the swap — the recipient address is validated to share the same arkd signer before persisting; existing `get_ln_invoice*` paths continue to claim into a fresh local address. (2) The submit-then-finalize offchain-tx API is opened up: `submit_offchain_tx` is no longer gated behind a feature flag (it's useful for consumers controlling work between submit and finalize), `finalize_offchain_tx` is now `pub`, and a new `finalize_pending_offchain_tx(ark_txid: Txid)` finalizes a single pending tx by `Txid` (re-fetches the pending list, finds the match, signs+finalizes; ad-hoc error if no match).

**Changes**:
- `Receive Lightning for another Arkade user` (`55d6ef0`) — `ark-client/src/boltz.rs` is restructured around a shared `create_reverse_swap_invoice` helper that takes an optional `recipient_address: Option<ArkAddress>`. New public API: `Client::get_ln_invoice_for_address(amount, recipient_address, expiry_secs, description)`. New private helpers `validate_reverse_recipient_address` (checks `recipient_address.server() == self.server_info.signer_pk`, otherwise returns `Error::consumer("recipient Arkade address belongs to a different server: …")`) and `reverse_claim_address` (returns the stored `claim_address` if set, else falls back to `get_offchain_address()`). `ReverseSwapData` gains `claim_address: Option<ArkAddress>` (persisted in the SQLite swap row — test fixture in `swap_storage/sqlite.rs` updated to default to `None`). `ark-core::ArkAddress` gains `pub fn server(&self) -> XOnlyPublicKey` to expose the encoded server signer key for the cross-server check. `ark-client-sample/src/main.rs` reverse-swap command is wired through the new path. **Behaviour-preserving** for callers who still use `get_ln_invoice*` without a recipient.
- `chore(ark-client): Do not put submit_offchain_tx behind feature flag` (`7292c42`) — drops the `#[cfg(...)]` gating on `Client::submit_offchain_tx`. Motivation in the commit body: *"It can actually be useful for consumers to control what happens between submit and finalize."*
- `chore(ark-client): Make finalize_offchain_tx public` (`d3adc0b`) — changes `finalize_offchain_tx` from crate-private to `pub`.
- `fix(client): restore finalize pending offchain tx API` (`af1490a`) — re-adds `pub async fn finalize_pending_offchain_tx(&self, ark_txid: Txid) -> Result<(), Error>` on `Client`. Implementation: `fetch_pending_offchain_txs().await?`, `find` the entry with matching `ark_txid` (else `Error::ad_hoc("no pending transaction found for ark txid {ark_txid}")`), then `sign_and_finalize_pending_tx(pending_tx).await`. Companion `e2e-tests/tests/e2e_finalize_pending_tx.rs` (120 lines) covers the new API end-to-end.

**Breaking changes**: None for indirect SDK consumers. Direct constructors of `ReverseSwapData` need to populate the new `claim_address: Option<ArkAddress>` field (mirrors the earlier `bolt11` / `invoice_expiry` additions); fixture-style callers can pass `None` to keep prior behaviour.

**Docs files updated**:
- `docs/projects/rust-sdk/INDEX.md` (frontmatter `last_sync_commit`; Protocol Features Boltz bullet expanded with `get_ln_invoice_for_address` + `claim_address`; new Protocol Features bullet on granular offchain-tx control)
- `docs/projects/rust-sdk/system/project_overview.md` (new top entry under Recent Additions; `ark-client` API list extended with the submit/finalize/finalize-pending trio and `get_ln_invoice_for_address`; swap-storage line annotated)
- `docs/INDEX.md` (rust-sdk Key Capabilities — Boltz bullet expanded with the recipient-address flow + new offchain-tx control bullet)
- `docs/projects/rust-sdk/change-log/last-sync.txt`

---

## 2026-05-31 - 0.9.2 release + ark-grpc TLS fix + crates release CI
**From**: `70eaa75ad5a910e4b35a7002137cc769e9973268`
**To**: `8c0e8e3d91ab80e8107415072cf6351573eac19f`
**Synced By**: update-project skill
**Commits analyzed**: 5 (no merges)

**Summary**: Patch release `0.9.2` with one real code fix in `ark-grpc` (manually built `Endpoint` now applies `ClientTlsConfig`, so TLS `arkd` URLs connect under tonic 0.14), plus new GitHub Actions release plumbing for crates.io. No public API change beyond the version bump.

**Changes**:
- `fix(grpc): set tls_config on manual endpoint connect` (`100c53a`) — `ark-grpc/src/client.rs::Client::connect` no longer chains `.connect()` directly off `Endpoint::from_shared(...)`. Under `cfg(any(feature = "tls-webpki-roots", feature = "tls-native-roots"))` it now constructs a `tonic::transport::ClientTlsConfig`, adds `with_webpki_roots()` and/or `with_native_roots()` per feature flag, and calls `endpoint.tls_config(tls)?` before `.connect()`. Required because tonic 0.14 no longer infers TLS purely from the URL scheme on a manually built `Endpoint`; without this, connecting to an `https://...` `arkd` from `ark-grpc` (when used outside of the URL helper path) would fail with a transport error.
- `fix formatting` (`2e9bbb3`) — cosmetic 2-line whitespace fix in the new TLS branch.
- `ci: add crates release workflows` (`9190d0d`) — adds two workflows:
  - `.github/workflows/draft_release_crates.yml` (161 lines): manual `workflow_dispatch` with a `version` input, sets up Rust toolchain (1.86 + nightly fmt), runs `cargo fmt`, validates SemVer, bumps every publishable crate's `version` and intra-workspace `path = "..", version = "..."` pins to the requested version via `cargo set-version`, refreshes the per-crate `README.md` install snippets and the root `README.md` crate index, then opens a `release/crates-<version>` PR.
  - `.github/workflows/create_release_crates.yml` (174 lines): triggers on merged PRs whose head ref starts with `release/crates-`. Extracts the version from the branch name, requires `CARGO_REGISTRY_TOKEN`, verifies every publishable crate matches that version via `cargo metadata`, runs `cargo test --workspace --all-features`, then `cargo publish` for each crate in topological dependency order and finally `git tag v<version>`.
- `chore: prepare 0.9.2 release` (`4608a06`, github-actions bot via the new draft workflow) — bumps `version` from `0.9.1` → `0.9.2` for `ark-rs`, `ark-core`, `ark-client`, `ark-grpc`, `ark-rest`, `ark-bdk-wallet`, `ark-fees`, `ark-delegator`, `ark-script`, `ark-introspector-client`; updates intra-workspace path-dep pins to match; refreshes the version strings in the per-crate `README.md` install snippets and the root `README.md` crate index. `ark-client-sample` workspace member also bumped. No code changes.
- `ci: fix crates release recovery` (`e535af3`) — makes `create_release_crates.yml` re-runnable after a partial failure: the publish step probes `https://crates.io/api/v1/crates/<crate>/<version>` and skips `cargo publish` for any crate already on crates.io at that version, and the tagging step tolerates an existing `v<version>` tag. Lets a re-merge or manual re-run safely resume past whichever crate failed previously.

**Breaking changes**: None.

**Docs files updated**:
- `docs/projects/rust-sdk/INDEX.md` (frontmatter `last_sync_commit`; Workspace Crates header bumped to v0.9.2 with note on release CI; per-crate version tags `(v0.9.1) → (v0.9.2)`; `ark-grpc` entry annotated with the TLS-config fix)
- `docs/projects/rust-sdk/system/project_overview.md` (new top entry under Recent Additions for the 0.9.2 release + ark-grpc TLS fix + release CI; all `(v0.9.1) → (v0.9.2)`; project status line bumped + note on automated release pipeline)
- `docs/projects/rust-sdk/system/architecture.md` (Transport Abstraction section: added paragraph on the explicit `tls_config(...)` requirement under tonic 0.14)
- `docs/INDEX.md` (rust-sdk description — v0.9.2 alignment + release-CI mention; Key Capabilities gRPC bullet annotated with the TLS-config fix)
- `docs/projects/rust-sdk/change-log/last-sync.txt`

---

## 2026-05-29 - 0.9.1 release + introspector emulator env fix
**From**: `1d778429e7fc281bb05a68a5264011e740a2a001`
**To**: `70eaa75ad5a910e4b35a7002137cc769e9973268`
**Synced By**: update-project skill
**Commits analyzed**: 2 (no merges)

**Summary**: Patch release sync — no API or behavior changes. Every publishable crate bumped from `0.9.0` to `0.9.1` (incl. all intra-workspace `path = "..", version = "..."` pins and the install snippets in per-crate READMEs and the root README). Operational fix to the `justfile` `introspector-docker-run` recipe: it now also exports the four `EMULATOR_*` env vars (mirroring the existing `INTROSPECTOR_*` ones) so the dockerized introspector emulator can find the local arkd via `host.docker.internal` for `e2e_arkade_script` runs.

**Changes**:
- `chore: prepare 0.9.1 release` (`739c6aa`) — bumps `version` from `0.9.0` → `0.9.1` for `ark-rs`, `ark-core`, `ark-client`, `ark-grpc`, `ark-rest`, `ark-bdk-wallet`, `ark-fees`, `ark-delegator`, `ark-script`, `ark-introspector-client`; updates intra-workspace path-dep pins to match; refreshes the version strings in the per-crate `README.md` install snippets and the root `README.md` crate index. `ark-client-sample` workspace member also bumped. No code changes.
- `fix: set emulator env for introspector` (`62eee99`) — `justfile`: `introspector-docker-run` target additionally passes `-e EMULATOR_SECRET_KEY=...`, `-e EMULATOR_NO_TLS=true`, `-e EMULATOR_ARKD_URL=host.docker.internal:7070`, `-e EMULATOR_LOG_LEVEL=6` to the dockerized introspector container alongside the existing `INTROSPECTOR_*` vars. Required by the current introspector image, which reads the emulator-prefixed names; without this, the e2e arkade-script suite couldn't reach the regtest arkd from inside the container.

**Breaking changes**: None.

**Docs files updated**:
- `docs/projects/rust-sdk/INDEX.md` (frontmatter `last_sync_commit`, workspace crates bumped to v0.9.1, opening Key Concepts note)
- `docs/projects/rust-sdk/system/project_overview.md` (new top entry under Recent Additions for the 0.9.1 release + emulator env fix; all `(v0.9.0)` → `(v0.9.1)`; project status line)
- `docs/INDEX.md` (rust-sdk description — v0.9.0 → v0.9.1 alignment note)
- `docs/projects/rust-sdk/change-log/last-sync.txt`

---

## 2026-05-26 - Batch event waits honour client timeout
**From**: `241e2291dc615dcfe7a276a976f8d3a9f13eab75`
**To**: `1d778429e7fc281bb05a68a5264011e740a2a001`
**Synced By**: update-project skill
**Commits analyzed**: 2 (no merges)

**Summary**: Robustness fix for the round-streaming code paths in `ark-client::batch`. Both the regular settlement loop and the delegate-settlement loop now wrap `stream.next()` in `timeout_op(self.inner.timeout, …)`, so a stalled arkd round stream surfaces a timed-out `Error::transaction` instead of hanging the client forever. The companion test commit adds a `nigiri.mine(1)` after `alice.settle(...)` in `e2e_assets` to confirm the asset settlement is actually spendable on-chain.

**Changes**:
- `fix: timeout batch event waits` (`6a28c20`) — `ark-client/src/batch.rs`: both `match stream.next().await` sites (the main settlement loop at ~L646 and the delegate-settlement loop at ~L1389) now go through `timeout_op(self.inner.timeout, stream.next()).await.context("timed out waiting for batch event")?`. No public API change.
- `test: confirm asset settlement spend` (`c6ca550`) — `e2e-tests/tests/e2e_assets.rs`: inserts `nigiri.mine(1).await;` after `alice.settle(&mut rng).await.unwrap();` so the post-settlement `offchain_balance()` reflects the confirmed asset VTXO.

**Breaking changes**: None.

**Docs files updated**:
- `docs/projects/rust-sdk/INDEX.md` (frontmatter `last_sync_commit`)
- `docs/projects/rust-sdk/system/project_overview.md` (new top entry under Recent Additions for the batch-event timeout fix)
- `docs/INDEX.md` (rust-sdk Key Capabilities — appended note that batch event waits honour the client timeout)
- `docs/projects/rust-sdk/change-log/last-sync.txt`

---

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
