# Documentation Sync History - Arkade Rust SDK

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
