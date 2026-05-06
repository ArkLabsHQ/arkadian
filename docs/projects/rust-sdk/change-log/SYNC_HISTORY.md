# Documentation Sync History - Arkade Rust SDK

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
