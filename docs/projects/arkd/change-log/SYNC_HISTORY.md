# Documentation Sync History - Arkd

## 2026-05-08 - Documentation Update
**Commit**: `2999d666` (arkd repository)
**Previous Sync**: `216951ee`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit
- `2999d666` client-lib: Add WithReceiver option & Update explorer and wallet interfaces (#1058)

**Breaking Changes (client-lib SDK, `pkg/client-lib`)**:
- `wallet.WalletService.NextIndex(ctx)` removed; replaced by two id-keyed methods:
  - `NextKeyId(ctx, id) (string, error)` — returns the next key id for a given account/wallet id
  - `GetKeyIndex(ctx, id) (uint32, error)` — returns the BIP32-style index for a stored key id
  - Single-key wallet returns `"m"` and `0` respectively, ignoring the id argument
- `explorer.Explorer.GetUtxos(addr string)` → `GetUtxos(addresses []string)` — accepts multiple addresses; mempool implementation throttles (1s sleep every 20 addresses) to avoid rate limiting
- Internal `service.getAddresses` now returns `onchainAddrs []types.Address` (with `KeyID` populated) instead of `[]string`; `service.bumpAnchorTx` no longer takes a `keys` parameter — it derives signing keys from the address `KeyID` itself

**Features Added**:
- New `ReceiverOption` interface (intersection of `SendOption`, `BatchSessionOption`, `UnrollOption`) defined once in `pkg/client-lib/receiver_opts.go`
- New `WithReceiver(addr)` option overrides the destination/change address that would otherwise be freshly derived via `wallet.NewKey`. Wired into `Settle`, `CollaborativeExit`, `RedeemNotes`, `SendOffChain` (change), `IssueAsset`, `ReissueAsset`, `BurnAsset`, `OnboardAgainAllExpiredBoardings`, and `Unroll`-family ops
- New address validators in `receiver_opts.go`: `validateOffchainAddress`, `validateOnchainAddress(network)`, `validateOffchainOrOnchainAddress(network)` — methods enforce which kind they accept (e.g. `OnboardAgainAllExpiredBoardings` requires onchain; `Settle`/`CollaborativeExit` accept either)
- Internal `service.getReceiver(ctx, optReceiver)` and `service.getBoardingReceiver(ctx, optReceiver)` helpers fall back to `wallet.NewKey`-derived addresses when the option is unset
- `signingRequired` flag threaded through `makeRegisterIntent`/`makeDeleteIntent`/`makeGetPendingTxIntent`/`makeIntent`: when no boarding utxos and no vtxos are present, the unsigned proof PSBT is returned without invoking `wallet.SignTransaction` (avoids a wallet round-trip for note-only flows)
- `service.FinalizePendingTxs` now accepts caller-supplied `vtxosWithTapscripts` via the existing `WithVtxos` option (previously always re-fetched + populated internally)

**Bug Fixes / Refactors (client-lib SDK)**:
- `service.Balance` rewritten: replaces `nbWorkers × len(offchainAddrs)` goroutine fan-out + channel coalescing with four discrete goroutines (offchain, onchain, boarding, redeem), aggregating into typed locals — clearer error propagation, correct boarding+redeem locked-balance accumulation, no double-count of offchain balance across addresses
- `service.CollaborativeExit` no longer fetches & sums `spendableVtxos` for an upfront balance check — the downstream `getFundsToSettle` call already enforces sufficient funds, eliminating duplicate explorer calls
- Mempool explorer `SubscribeForAddresses` now decodes the address script once at subscription time and stores it in `addressData.script` for reuse on every poll, instead of re-decoding inside `getUtxos` each cycle
- `getMatureUtxos` and `getClaimableBoardingUtxos` consolidated to single batched `GetUtxos([...])` calls (was per-address loop)
- Single-key wallet `GetKey` / `NewKey` no longer error on `"wallet is locked"` — locked-state sub-tests removed; key derivation is permitted while locked because no signing is required
- Removed dead `balanceRes` struct from `pkg/client-lib/types.go`

**Files Updated**:
- docs/INDEX.md (capability — add `WithReceiver` to embedded SDK summary)
- docs/projects/arkd/INDEX.md (version 1.3.1 → 1.3.2, sync commit + date)
- docs/projects/arkd/system/folder_structure.md (added `receiver_opts.go`; updated `WalletService` method list to `NextKeyId`/`GetKeyIndex`; noted batched `GetUtxos` in mempool explorer)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-05-06 - Documentation Update
**Commit**: `216951ee` (arkd repository)
**Previous Sync**: `9246f043`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 6 commits
- `216951ee` Add tests for unrolled vtxo rejoining batch (#1055)
- `1815bb99` fix (singlekey wallet `NextIndex` returns 1 once initialized)
- `fd062bb9` Upgrade to Postgres 17.8 (#1057)
- `0eb3ac4d` Fix: print repo-root-relative path after build-cli completes (#1059)
- `2444c613` client-lib: Fix single-key wallet empty KeyID (#1060)
- `701a100d` docs: add missing breaking changes documentation (#1007)

**Features Added**:
- `pkg/client-lib/types.Utxo.Assets` field — boarding UTXOs now carry Arkade Asset balances forward through batch sessions
- `batch_session.getFundsToSettle` aggregates asset balances from boarding UTXOs in addition to VTXOs
- `toIntentInputs` now records boarding-UTXO assets in the proof PSBT (`assetInputs[len(vtxos)+boardingIndex+1]`)
- New e2e tests covering unrolled VTXO rejoining a batch (success path and invalid case)
- New `api-spec/BREAKING_CHANGES.md` documenting the Protobuf/OpenAPI breaking-change policy and resolution framework (revert / add new field / reserve / document); verified via `./scripts/check-proto-breaking master`

**Bug Fixes (client-lib SDK, `pkg/client-lib`)**:
- Single-key wallet `NewKey` / `GetKey` now return a non-empty `KeyRef.Id` (`"m"`) — previously the `Id` field was empty, causing key lookups to fail
- Single-key wallet `NextIndex` returns `1` once `walletData` is initialized (was always returning `0`)

**Configuration Changes**:
- `ARKD_SESSION_DURATION` added to `envs/arkd.dev.env` (set to `10` for fast regtest cycles); env var was already supported in `internal/config/config.go` (default `30`)
- `docker-compose.regtest.yml` upgraded `postgres:16` → `postgres:17.8`

**Tooling**:
- `pkg/ark-cli/scripts/build` now prints the repo-root-relative output path after a successful build (uses `git rev-parse --show-toplevel`)

**Files Updated**:
- docs/projects/arkd/INDEX.md (version 1.3.0 → 1.3.1, sync commit + date)
- docs/projects/arkd/system/configuration.md (added `ARKD_SESSION_DURATION`)
- docs/projects/arkd/system/tech_stack.md (Postgres 17.8 in regtest compose)
- docs/projects/arkd/system/folder_structure.md (referenced `api-spec/BREAKING_CHANGES.md`)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-05-01 - Documentation Update
**Commit**: `9246f043` (arkd repository)
**Previous Sync**: `8e005262`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit (`[client-lib] Update wallet interface (#1008)`)

**Breaking Changes (client-lib SDK, `pkg/client-lib`)**:
- `wallet.WalletService` interface restructured: address-returning methods (`GetAddresses`, `NewAddress`, `NewAddresses`) replaced by key-returning methods (`NewKey`, `GetKey`, `ListKeys`, `NextIndex`); addresses now derived by `client-lib` from `KeyRef`
- `WalletService.Create` now takes a `chaincfg.Params` network argument
- `WalletService.SignTransaction` no longer takes an `Explorer`; takes `keys map[string]string` (key IDs by prevout script) instead
- `WalletService.NewVtxoTreeSigner` no longer takes a derivation path
- `ArkClient.InitWithWallet` removed; wallet is now injected via `WithWallet` ServiceOption on `NewArkClient`. `NewArkClient` falls back to a default single-key wallet if no `WithWallet` option is provided. `LoadArkClientWithWallet` removed.
- `Config.WalletType` removed from stored client config
- `ArkClient.GetAddresses` now returns `[]types.Address` (not `[]string`) for offchain/boarding/redemption sets, exposing `KeyID` and `Tapscripts`
- `ArkClient.SignTransaction`, `RegisterIntent`, `DeleteIntent`, `FinalizePendingTxs`, `CompleteUnroll`, `OnboardAgainAllExpiredBoardings`, `WithdrawFromAllExpiredBoardings` now accept variadic options for passing signing keys

**Features Added**:
- New `wallet.KeyRef` type (`Id`, `PubKey`) for referencing wallet keys
- New `types.Address.KeyID` field linking addresses back to their producing key
- New `SignOption` interface family with `WithKeys(map[string]string)` usable across `SendOption`, `BatchSessionOption`, and `UnrollOption`
- New `pkg/client-lib/sign_opts.go` and `pkg/client-lib/vtxos_opts.go`

**Files Updated**:
- docs/INDEX.md (capability + tags for arkd embedded client SDK)
- docs/projects/arkd/INDEX.md (version 1.2.0 → 1.3.0, sync commit)
- docs/projects/arkd/system/folder_structure.md (added `pkg/client-lib` package section)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-02-19 - Documentation Update
**Commit**: `74a173c6` (ark repository)
**Previous Sync**: `a337c9ce`
**Synced By**: /update-project command
**Status**: Completed

**Commits Analyzed**: 28 commits

**Features Added**:
- Arkade Assets: Full UTXO-native asset protocol implementation (encoding/decoding, teleport transfers, control assets, metadata, minting/burning, storage across all DB backends)
- CEL-based fee system: Programmable fee management with CEL formula engine, admin APIs for fee programs, client-facing EstimateIntentFee RPC
- Admin liquidity RPCs: GetExpiringLiquidity, GetRecoverableLiquidity, manual Sweep
- UpdateStreamTopics RPC: Client-managed event stream topic subscriptions
- GetIntentByTxid / GetIntent RPC: Intent lookup by transaction ID
- GetVtxos time range filter: Filter VTXOs by update timestamp (after/before)
- PostgreSQL auto-creation: Automatic database provisioning (`ARKD_PG_DB_AUTOCREATE`)
- GetAsset indexer RPC: Asset information and metadata retrieval
- EstimateIntentFee RPC: Client-facing fee estimation for intents

**Configuration Changes**:
- `ARKD_PG_DB_AUTOCREATE` (new) - Auto-create PostgreSQL databases
- `ARKD_ONCHAIN_OUTPUT_FEE` **[DEPRECATED]** - Replaced by dynamic CEL fee system
- New admin CLI flags: `--with-connectors`, `--commitment-txids`, `--onchain-input`, `--offchain-input`, `--onchain-output`, `--offchain-output`, `--clear`

**Bug Fixes**:
- Fixed auth service at restart (#874)
- Fixed stopping sweep operations at shutdown (#839)
- Fixed gosec G704 security issue (#910)
- Dropped IsAccepted check hotfix (#898)
- Sanity checks on offchain tx flow (#845)
- Ensured connector out is at index 1
- Wait for confirmation before scheduling sweep task (#838)
- Dropped connectors from commitment tx coin selection (#867)
- Optimized scheduleBatchSweepTask function (#850)
- Restored original fees after TestFee execution (#893)

**Go Version**:
- Updated from Go 1.24.6 to Go 1.25.7

**Database Migrations Added**:
- `20251215000000_add_intent_fees` (Postgres + SQLite)
- `20260106000000_add_vtxo_updated_at` (Postgres + SQLite)
- `20260114000000_add_intent_txid` (Postgres + SQLite)
- `20260130193058_add_asset` (Postgres + SQLite)

**Files Updated**:
- docs/INDEX.md (capabilities, tags, triggers)
- docs/projects/arkd/INDEX.md (version bump, sync commit)
- docs/projects/arkd/system/project_overview.md (assets, fees, liquidity sections)
- docs/projects/arkd/system/architecture.md (new domain entities, interface handlers)
- docs/projects/arkd/system/configuration.md (fee deprecation, PG autocreate)
- docs/projects/arkd/system/folder_structure.md (asset/fee packages, new files)
- docs/projects/arkd/testing/arkd-development-reference.md (Go version)
- docs/projects/arkd/testing/arkd-environment-and-testing-guide.md (Go version)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2025-12-02 12:00:00 - Documentation Update
**Commit**: `a337c9ce` (ark repository)
**Previous Sync**: `e16538b5`
**Synced By**: /update-project command
**Status**: Completed

**Commits Analyzed**: 58 commits

**Features Added**:
- Pyroscope continuous profiling support (CPU, memory, goroutines, mutex, block)
- AlertManager integration for batch lifecycle alerts
- pprof profiling endpoint on admin interface
- GetPendingTx RPC by intent
- Admin RPC to clear scheduled sessions
- Support for pending spent VTXOs filtering by pubkeys/outpoints
- `start` sub-command for CLI
- Proto breaking changes detection in CI

**Configuration Changes**:
- `ARKD_PUBLIC_UNILATERAL_EXIT_DELAY` - Public unilateral exit delay
- `ARKD_VTXO_NO_CSV_VALIDATION_CUTOFF_DATE` - Skip CSV validation for old VTXOs
- `ARKD_SETTLEMENT_MIN_EXPIRY_GAP` - Minimum settlement expiry gap
- `ARKD_ONCHAIN_OUTPUT_FEE` - Collaborative exit fees
- `ARKD_PYROSCOPE_SERVER_URL` - Pyroscope profiling server
- `ARKD_ALERT_MANAGER_URL` - AlertManager URL
- `ARKD_ENABLE_PPROF` - Enable pprof endpoint

**Bug Fixes**:
- Fixed concurrent Redis channel usage
- Fixed batch sweeping logic
- Fixed sweeper scheduling after restart
- Fixed Redis current round implementation
- Fixed error handling in OffchainTx defer functions
- Fixed VTXO min amount in GetInfo
- Fixed sub-dust VTXO extraction from checkpoints

**Files Updated**:
- docs/projects/arkd/INDEX.md (version bump, sync commit)
- docs/projects/arkd/system/project_overview.md (observability section)
- docs/projects/arkd/system/configuration.md (new env vars)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2025-10-16 12:00:00 - Initial Metadata Setup
**Commit**: `e16538b` (ark repository)
**Synced By**: Manual setup
**Status**: Baseline established

**Changes**:
- Added sync metadata to INDEX.md
- Created SYNC_HISTORY.md structure
- Established documentation freshness tracking system

**Notes**:
- This is the initial sync point
- Future syncs will track commits since this baseline
- Use `arkadian-refresh-docs arkd` to update after new commits
