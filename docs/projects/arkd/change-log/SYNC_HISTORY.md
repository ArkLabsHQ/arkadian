# Documentation Sync History - Arkd

## 2026-07-21 - Documentation Update
**Commit**: `f444de6c` (arkd repository)
**Previous Sync**: `eb75b6ba`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit
- `f444de6c` Propagate sweep tx event on checkpoint sweep (#1155)

**Feature (PR #1155 — checkpoint sweep tx event propagation)**:
- The sweeper (`internal/core/application/sweeper.go`) gains an `onSweepCheckpoint func(TransactionEvent)` callback, wired to `service.propagateTransactionEvent` in `NewService` (`service.go`).
- When `createCheckpointSweepTask` builds and broadcasts a checkpoint sweep tx it now captures the `sweepTxid` and emits a `TransactionEvent{Type: SweepTxType, TxData: {Tx, Txid}, SweptVtxos: childrenVtxos}` to clients subscribed via `GetTxEventsChannel` and to the indexer — previously only round-level sweeps emitted sweep events, so checkpoint sweeps were silent to subscribers.
- E2E coverage added in `internal/test/e2e/e2e_test.go`.

**Surface Changes**: None — no proto / gRPC method / env-var / migration surface changed (internal wiring only).

**Breaking Changes**: None.

**Files Updated**:
- docs/INDEX.md (arkd Key Capabilities + tags)
- docs/projects/arkd/INDEX.md (version bump 1.4.0 → 1.4.1, sync commit + date)
- docs/projects/arkd/system/application_core.md (Sweeper Service — checkpoint sweep event propagation)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-07-14 - Documentation Update
**Commit**: `eb75b6ba` (arkd repository)
**Previous Sync**: `557f7c5c`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 5 commits
- `eb75b6ba` Scale the DAG (#908)
- `f8344a56` Fix stream log interceptor (#1153)
- `695cb53a` indexer: Add renewableOnly filter to GetVtxos (#1149)
- `37faa97e` DFS-depth taptree encode (#1150)
- `c17eab0f` Bump go@1.26.5 (#1151)

**Major Feature (PR #908 — VTXO marker DAG)**:
- The VTXO chain is now indexed by a **marker DAG** so the server can traverse and sweep deep chains in near-constant depth instead of walking every VTXO.
- New `domain.Marker` (`{ID, Depth, ParentMarkerIDs}`) checkpoints are created at regular depth intervals (`MarkerInterval = 100`); an append-only `SweptMarker` (`{MarkerID, SweptAt}`) records sweeps.
- New `MarkerRepository` added to `RepoManager` as `Markers()` (badger/postgres/sqlite impls): `AddMarker`, `GetMarker`, `GetMarkersByDepthRange`, `GetMarkersByIds`, `BulkSweepMarkers`, `IsMarkerSwept`, `GetSweptMarkers`, `UpdateVtxoMarkers`, `GetVtxosByMarker`, `CreateRootMarkersForVtxos`, `SweepVtxoOutpoints`, `GetVtxosByDepthRange`, `GetVtxosByArkTxid`, `GetVtxoChainByMarkers`.
- Postgres uses a **recursive CTE** for descendant markers; sweeper restore prefetches VTXOs by marker (`prefetchVtxosByMarkers` / `getVtxosFromCacheOrDB`).
- **Schema:** the `vtxo.swept` boolean column was **removed** (sweep state now derives from markers), `marker_ids` becomes JSONB/TEXT holding ≥1 marker per VTXO, and `IndexerVtxo` exposes each VTXO's `depth` (proto field 15). Migration `20260701000000_add_vtxo_marker_dag` (sqlite + postgres) plus a `markerbackfill` package guaranteeing every existing VTXO has ≥1 marker; dust VTXOs bulk-swept on migration. Validated with chains up to 20k depth.
- **Interface change:** `RepoManager` gains `Markers()` — external implementers must add it.

**API Feature (PR #1149 — renewableOnly filter)**:
- `GetVtxosRequest` gains a `renewable_only` filter (proto field 10) returning the union of spendable + recoverable VTXOs; mutually exclusive with the other filters and applied only when querying by `scripts`.
- `IndexerVtxo` now carries the VTXO `depth` (field 15).

**Library Change (PR #1150 — DFS-depth taptree encode)**:
- `txutils.TapTree.Encode` now writes each leaf's depth as a DFS-ordered left caterpillar (`depth = min(i+1, size-1)`) so the encoded sequence forms a valid binary tree, replacing the hardcoded depth-`1`-per-leaf encoding.

**Toolchain (PR #1151 — Go 1.26.5)**:
- Go toolchain bumped 1.26.4 → 1.26.5 across all modules and Dockerfiles.

**Bug Fix (PR #1153 — stream log interceptor)**:
- Corrects the gRPC stream logging interceptor (`internal/interface/grpc/interceptors/logger.go`). Internal-only.

**Surface Changes**: `RepoManager.Markers()` interface addition; `vtxo.swept` column removed + new `add_vtxo_marker_dag` migration; new indexer `renewable_only` filter + `IndexerVtxo.depth` proto field.

**Breaking Changes**: `RepoManager` interface gains `Markers()` (external implementers must add it).

**Files Updated**:
- docs/INDEX.md (Go version 1.26.4 → 1.26.5, marker-DAG / renewableOnly / DFS-taptree / stream-log recent-changes bullets, tags, ask_question/develop triggers)
- docs/projects/arkd/INDEX.md (version bump 1.3.23 → 1.4.0, sync commit/date)
- docs/projects/arkd/system/project_overview.md (Go 1.26.3+ → 1.26.5+, marker-DAG + renewableOnly Major Features)
- docs/projects/arkd/system/tech_stack.md (Go 1.26.4 → 1.26.5)
- docs/projects/arkd/system/repo_manager.md (Markers() in RepoManager, new MarkerRepository section, vtxo.swept removal note, latest-migration note)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-07-11 - Documentation Update
**Commit**: `557f7c5c` (arkd repository)
**Previous Sync**: `ac3b5634`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit
- `557f7c5c` Fix retry accepting an already requested but failed offchain tx (#1147)

**Bug Fix (PR #1147 — offchain-tx retry-after-fail replay)**:
- `OffchainTx.on` (`internal/core/domain/offchain_tx.go`) dropped a replayed `OffchainTxRequested` event when the aggregate was past the undefined stage **or** in any failed state (`s.Stage.Code != OffchainTxUndefinedStage || s.Stage.Failed`), so a tx that failed while still in the `Requested` stage could never be re-requested and retried to finalization.
- The guard is now `s.Stage.Code != OffchainTxUndefinedStage && !canRetry`, where `canRetry = s.Stage.Failed && s.Stage.Code == OffchainTxRequestedStage`. On a valid retry it resets `Stage.Failed = false` and `FailReason = ""` before re-entering the requested stage.
- An `Accepted` tx that later failed already spent its input VTXOs and is deliberately left untouched — a new request must never reset it.
- Covered by two new `offchain_tx` replay unit tests ("request retry after fail" finalizes; "request retry after accepted tx failed" is a no-op leaving the tx at `Accepted`/`Failed` with the original `FailReason`) plus a new e2e post-state assertion in `TestSendToCLTVMultisigClosure`.

**Surface Change**: None — internal-only domain state-machine fix. No proto / gRPC method / env-var / migration change.

**Breaking Changes**: None.

**Files Updated**:
- docs/INDEX.md (recent-changes bullet, tags, develop/debug triggers)
- docs/projects/arkd/INDEX.md (version bump 1.3.22 → 1.3.23, sync commit/date)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-07-10 - Documentation Update
**Commit**: `ac3b5634` (arkd repository)
**Previous Sync**: `0cb5f8e9`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit
- `ac3b5634` indexer: Snapshot listener topics in dispatch loop to avoid map race (#1144)

**Bug Fix (PR #1144 — indexer dispatch-loop map race)**:
- `listenToTxEvents` (`internal/interface/grpc/handlers/indexer.go`) ranged `l.topics` directly without the listener lock while the `Subscribe`/`Update`/`Unsubscribe` RPCs mutate it under the lock via `addTopics`/`removeTopics`/`overwriteTopics`. A concurrent map iteration and write is a fatal, unrecoverable Go runtime error that crashes the whole process.
- The dispatch loop now iterates a locked snapshot from `l.getTopics()`, which copies the map keys under the lock (the same pattern `matchesTx` already uses for filters).
- A new `-race` regression test drives the dispatch loop against concurrent topic updates.

**Surface Change**: None — internal-only fix. No proto / gRPC method / env-var / migration change.

**Breaking Changes**: None.

**Files Updated**:
- docs/INDEX.md (recent-changes bullet, tags, debug triggers)
- docs/projects/arkd/INDEX.md (version bump 1.3.21 → 1.3.22, sync commit/date)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-07-09 - Documentation Update
**Commit**: `0cb5f8e9` (arkd repository)
**Previous Sync**: `db93f3d6`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 4 commits
- `0cb5f8e9` Add structured TX_FILTERS_LIMIT_EXCEEDED and INVALID_TX_FILTER errors (#1141)
- `89ddbf61` Hotfix: pass vtxoTreeExpiry in txbuilder.BuildCommitmentTx instead of constructor (#1145)
- `b2647c02` Drop unused report service (#1137)
- `5c56d54c` indexer: handle subscription displacement, add keepAlive gRPC option

**gRPC Surface Change (PR #1141 — structured tx-filter errors)**:
- Added two structured error `Code`s in `pkg/errors/errors.go` (both gRPC `InvalidArgument`): `TX_FILTERS_LIMIT_EXCEEDED` (code 51, `TxFiltersLimitMetadata{subscription_id, max_tx_filters, got_tx_filters}`) and `INVALID_TX_FILTER` (code 52, `TxFilterMetadata{expression}`).
- Threaded through the broker/indexer handlers so an over-cap CEL `expressions` list or an un-parseable tx-filter expression surfaces a structured code/name in `ErrorDetails` instead of an opaque error.

**Refactor (PR #1145 — vtxoTreeExpiry per-call)**:
- `ports.TxBuilder.BuildCommitmentTx` now takes a trailing `vtxoTreeExpiry arklib.RelativeLocktime` argument; `txbuilder.NewTxBuilder(wallet, signer, network)` drops the `vtxoTreeExpiry` / `boardingExitDelay` constructor args. The commitment-tx build now reads the current (DB-persisted, admin-updatable) expiry per call instead of a value captured at construction. **Interface change** for external `TxBuilder` implementers/callers.

**Removal (PR #1137 — drop unused round-report service)**:
- Removed `RoundReportService`, the `RoundReportServiceEnabled` config field / `ARKD_ROUND_REPORT_ENABLED` env var / `defaultRoundReportServiceEnabled`, the `RoundReportLogExporter` OTel wiring (`InitOtelSDK` no longer takes an `application.RoundReportService`), and the `internal/core/application/round_report.go` + `internal/telemetry/round_stats.go` sources plus related smoke-test helpers.
- No replacement — round telemetry continues via standard OTel metrics/traces and the AlertManager batch-stats pipeline. Only externally-visible change: removed `ARKD_ROUND_REPORT_ENABLED` (default was `false`).

**Behavior Change (commit #5c56d54c — subscription displacement + gRPC keepalive)**:
- Each `GetSubscription` stream is now the listener's sole consumer via a new broker `attach()`/`release()` pair (and `attachment` type): attaching cancels any pending removal timeout and closes the previously attached stream's `displaced` channel, forcing the old stream to exit so it cannot consume events meant for its replacement. `release()` keeps the listener for the reconnect window only if scripts or tx filters remain; inline/new subscriptions attach with a zero reconnect window. The dispatch loop uses two intentional selects (non-blocking then blocking) so a pending exit is handled before draining `listener.ch`.
- The gRPC server now sets `keepalive.ServerParameters{Time: 30s, Timeout: 20s}` to ping idle clients and reap dead connections.

**Breaking Changes**: `ports.TxBuilder.BuildCommitmentTx` / `NewTxBuilder` signatures (PR #1145); removed `ARKD_ROUND_REPORT_ENABLED` env var (PR #1137).

**Files Updated**:
- docs/INDEX.md (4 new Key Capability bullets; new tags; develop/debug triggers)
- docs/projects/arkd/system/application_core.md (subscription displacement; structured tx-filter errors)
- docs/projects/arkd/system/configuration.md (ARKD_ROUND_REPORT_ENABLED removed; gRPC server keepalive)
- docs/projects/arkd/system/project_overview.md (indexer subscription displacement / keepalive / tx-filter errors)
- docs/projects/arkd/INDEX.md (version 1.3.20 → 1.3.21, sync commit/date)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-07-08 - Documentation Update
**Commit**: `db93f3d6` (arkd repository)
**Previous Sync**: `0718d54b`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit
- `db93f3d6` indexer: Restore not-found message and add SUBSCRIPTION_NOT_FOUND code (#1140)

**gRPC Surface Change (PR #1140 — structured indexer not-found error)**:
- Added a structured `SUBSCRIPTION_NOT_FOUND` error `Code` (`pkg/errors/errors.go`, gRPC `NotFound`) carrying `SubscriptionMetadata{subscription_id}`, letting clients detect a stale subscription via the `ErrorDetails` code/name instead of parsing the error message.
- Every indexer subscription path (`GetSubscription`, `UpdateSubscription`, `SubscribeForScripts` reconnect, `UnsubscribeForScripts`) is now routed through a single `subscriptionErr(id, err)` mapper in `internal/interface/grpc/handlers/indexer.go`; the previously-unclassified `SubscribeForScripts` reconnect path (which returned `codes.Internal` with no structured code) is now included.
- The not-found message is restored to the legacy `subscription <id> not found` phrasing — PR #1074 had changed it to `subscription not found: <id>`, breaking SDKs that string-match the message (see ts-sdk#600). Any non-not-found broker error still maps to `Internal`.

**Files Updated**:
- docs/INDEX.md (Key Capabilities entry, Tags, debug triggers)
- docs/projects/arkd/system/application_core.md (subscription not-found handling)
- docs/projects/arkd/INDEX.md (version bump, sync commit/date)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-07-06 - Documentation Update
**Commit**: `0718d54b` (arkd repository)
**Previous Sync**: `ae56672f`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit
- `0718d54b` arkd-wallet: Use `minRelayTxFee` as fallback for fee estimation (#1089)

**Bug Fix (PR #1089 — nbxplorer fee-estimation fallback)**:
- The nbxplorer adapter's `EstimateFeeRate` (`pkg/arkd-wallet/core/infrastructure/nbxplorer/service.go`) now appends a `fallbackFeeRate` query parameter — set to `minRelayTxFee / 1000` — to the `/v1/cryptos/{cryptoCode}/fees/{blockCount}` request. When nbxplorer cannot produce a fee estimate it now returns the min-relay fee rate instead of erroring, avoiding a failure from `nbxplorer`.
- Internal-only change: no proto / gRPC method / env-var / config / migration surface changed.

**Breaking Changes**: None.

**Files Updated**:
- docs/INDEX.md (new Key Capability bullet for PR #1089; new tags `fee-estimation`, `min-relay-fee`, `nbxplorer-fallback`; new debug triggers)
- docs/projects/arkd/INDEX.md (version 1.3.18 → 1.3.19, sync commit/date)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-07-04 - Documentation Update
**Commit**: `ae56672f` (arkd repository)
**Previous Sync**: `af56a868`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 commits
- `ae56672f` Add CEL-based batch_trigger gate for round start (#1046)
- `fc7f23ec` Update BIP-322 intent: Encode message as PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE - 0x09 (unknown) field (#1132)

**Feature (PR #1046 — CEL-based batch_trigger gate)**:
- New optional `ARKD_BATCH_TRIGGER` CEL formula gates whether the server starts a new batch round; unset (default) preserves the legacy "start every session" behaviour.
- Stored as a new `batch_trigger` field on the unified `domain.Settings` row (proto `Settings` field 26; new `add_batch_trigger` sqlite + postgres migrations). Seeded from the env var on **first boot only**; thereafter admin-updatable at runtime via `UpdateSettings` (`POST /v1/admin/settings`) and reported by `GetSettings`. Also settable via the new `--batch-trigger` CLI flag.
- Evaluated at the top of `startRound()` against `intents_count`, `current_feerate` (sat/kvbyte), `time_since_last_batch`, `boarding_inputs_count`, `total_boarding_amount`, `total_intent_fees` (all `double`) plus a `now()` helper; the program must return `bool`. The compiled trigger is cached and recompiled only when the text changes, so an update takes effect on the next round without a restart. On `false` the server waits one sixth of `ARKD_SESSION_DURATION` and re-checks.
- Backed by a new `internal/core/domain/batchtrigger` package (mirrors `arkfee`'s compile-once/reuse design). Validated at startup (`Validate()`) and on every `UpdateSettings`; round-time evaluation **fails open** (a broken program allows the round and logs a warning) so a buggy formula can never wedge the scheduler. `envs/arkd.dev.env` and `envs/arkd.light.env` document the (empty) default.

**Feature (PR #1132 — BIP-322 intent proof `0x09` field)**:
- `intent.New` (`pkg/ark-lib/intent/proof.go`) now appends the BIP-322 `PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE` (`0x09`) global Unknown (key `0x09`, value = UTF-8 message bytes) to the toSign PSBT, so a co-signer can recompute the `to_spend` commitment from PSBT-internal data alone and distinguish a genuine ownership proof from an ordinary fund-moving spend before contributing a partial signature.
- Proof fixtures updated to the new wire format with a `BIP-322_global_0x09_field` sub-test asserting the field is present and equal to the message across all valid fixtures. Added docstrings to `Fees`, `IntentOutpoint`, `FinalizeAndExtract`, and the exported `Test*` helpers.

**Breaking Changes**: None to the public gRPC surface — the `batch_trigger` field is an additive optional proto field. `intent.New` now emits an extra PSBT global field, changing the intent-proof wire bytes (fixtures updated accordingly).

**Files Updated**:
- docs/INDEX.md (two new Key Capabilities bullets for PR #1046 and #1132; new tags `batch-trigger`, `round-gate`, `bip322`, `intent-proof`; new ask_question/develop triggers)
- docs/projects/arkd/INDEX.md (version 1.3.17 → 1.3.18, sync commit/date)
- docs/projects/arkd/system/configuration.md (new `ARKD_BATCH_TRIGGER` operational setting + Batch Trigger Gate section)
- docs/projects/arkd/system/project_overview.md (new batch-trigger Major Feature; BIP-322 0x09 note in ark-lib section)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-07-03 - Documentation Update
**Commit**: `af56a868` (arkd repository)
**Previous Sync**: `b33f7edf`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 commits
- `af56a868` fix: CSVMultisigClosure small int decoding logic (#1135)
- `61976b61` client-lib: Fix send on closed replay channel & Update explorer.GetFeeRate endpoint (#1134)

**Fix (PR #1134 — replay-channel panic + mempool fee-rate endpoint)**:
- `JoinBatchSession` (`pkg/client-lib/batch_session_handler.go`) now forwards notify events to the caller's `replayEventsCh` with an inline non-blocking `select` instead of a detached goroutine. The caller owns and closes that channel once `JoinBatchSession` returns, so a goroutine outliving the return raced the close and panicked (`send on closed channel`). The inline send guarantees every send happens-before the return; a slow/unread consumer simply drops the event.
- The mempool explorer's `GetFeeRate` (`pkg/client-lib/explorer/mempool/explorer.go`) now queries `v1/fees/recommended` and returns its `fastestFee`, falling back to the legacy (deprecated) `fee-estimates` endpoint only on HTTP 404 for backward compatibility with older mempool backends (e.g. `mempool.mutinynet.arkade.sh` no longer serves `fee-estimates`).
- Both paths route through a new shared `explorerSvc.get(path, target)` helper that reads the body and checks the HTTP status **before** JSON-decoding, so a non-JSON error body surfaces the real status instead of a misleading parse error.
- Covered by `pkg/client-lib/batch_session_handler_test.go` and `pkg/client-lib/explorer/service_test.go` additions.

**Fix (PR #1135 — CSV small-int sequence decoding)**:
- `CSVMultisigClosure.Decode` (`pkg/ark-lib/script/closure.go`) now decodes a small-int (OP_1..OP_16) locktime sequence back to its numeric value (`opcode − (OP_1 − 1)`) instead of storing the raw opcode byte, matching Bitcoin's minimal scriptnum encoding. `OP_0` still decodes to an empty byte slice; values > 16 remain pushdata byte slices.
- The paired change removes the now-redundant OP_1..OP_16 → number remapping from `BIP68DecodeSequenceFromBytes` (`pkg/ark-lib/locktime.go`), which previously compensated for the raw-opcode storage — leaving it in place would have double-shifted the corrected value.
- Prevents mis-decoding of CSV relative-locktimes in the 1–16 range. Covered by new `pkg/ark-lib/script/script_test.go` and `pkg/ark-lib/locktime_test.go` cases.

**Breaking Changes**: None. Both are bug fixes internal to `pkg/client-lib` and `pkg/ark-lib`; no proto / gRPC method / env-var / config / migration surface changed.

**Files Updated**:
- docs/INDEX.md (two new Key Capabilities bullets for PR #1134 and #1135; new tags `replay-channel`, `batch-session`, `fee-rate`, `mempool-explorer`, `csv-closure`, `script-decoding`, `bip68`; new debug triggers)
- docs/projects/arkd/INDEX.md (version 1.3.16 → 1.3.17, sync commit/date)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-07-02 - Documentation Update
**Commit**: `b33f7edf` (arkd repository)
**Previous Sync**: `278bde6b`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit
- `b33f7edf` Whitelist `channelz` endpoints in permissions (#1133)

**Feature (PR #1133 — channelz permission whitelist)**:
- The seven gRPC channelz RPCs (`GetTopChannels`, `GetServers`, `GetServer`, `GetServerSockets`, `GetChannel`, `GetSubchannel`, `GetSocket`) are added to `permissions.Whitelist()` (`internal/interface/grpc/permissions/permissions.go`) under a new `EntityChannelz = "channelz"` entity. Because the auth interceptor (`internal/interface/grpc/interceptors/auth.go`) allows any method present in `Whitelist()` without checking a macaroon, the channelz introspection RPCs are now reachable auth-free — they are already restricted to the admin port, so no additional guard is needed.
- Complements PR #1127 (`ARKD_ENABLE_CHANNELZ`), which registers the channelz service on the admin port; before this change the service was registered but its RPCs would fail macaroon auth.
- Covered by `permissions_test.go` updates.

**Breaking Changes**: None. Internal-only, additive to the permission whitelist; no proto / gRPC method / env-var / config / migration surface changed.

**Files Updated**:
- docs/INDEX.md (new Key Capabilities bullet for the channelz whitelist; new tag `permissions-whitelist`)
- docs/projects/arkd/INDEX.md (version 1.3.15 → 1.3.16, sync commit/date)
- docs/projects/arkd/system/configuration.md (channelz whitelist note on `ARKD_ENABLE_CHANNELZ`)

---

## 2026-07-01 - Documentation Update
**Commit**: `278bde6b` (arkd repository)
**Previous Sync**: `e6217887`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 commits
- `278bde6b` Add cursor-based pagination for GetVtxoChain rpc (#1092)
- `01570cf0` Watch checkpoint scripts (#1129)

**Feature (PR #1092 — GetVtxoChain cursor pagination)**:
- `GetVtxoChainRequest` gains an opaque `page_token` (proto field 5) and `GetVtxoChainResponse` gains `next_page_token` (`api-spec/protobuf/ark/v1/indexer.proto`, regenerated `indexer.pb.go` + `indexer.openapi.json`). When `page_token` is set the response resumes from where the prior page ended; an empty `next_page_token` signals no more pages.
- The cursor path (`internal/core/application/indexer.go`, `types.go`) is decoupled from the legacy `IndexerPageResponse page` struct — it uses a fixed max page size and ignores the page struct. An invalid/undecodable `page_token` maps to gRPC `InvalidArgument` (`internal/interface/grpc/handlers/indexer.go`); combining `intent` + `page_token` is rejected. The auth-token TTL stays a hard ceiling (no pagination-session keepalive).
- Hardens indexer signer-key handling: `NewIndexerService` fails fast when a withheld/private exposure mode is configured without a privkey (auth-token paths require it) instead of panicking later; `allSignerPubkeys` skips nil pubkeys so `stripSignerSignatures` never calls `schnorr.SerializePubKey` on nil.
- New tests: `internal/core/application/indexer_pagination_test.go`; updated `indexer_test.go`.

**Feature (PR #1129 — checkpoint-script watching)**:
- On each new offchain tx, `service.registerEventHandlers` (`internal/core/application/service.go`) now collects each checkpoint tx's first output pkscript and registers them with the chain `scanner` via `scanner.WatchScripts` (in a soft-fail goroutine), so an onchain broadcast of a finalized checkpoint is detected.
- New domain method `VtxoRepository.GetCheckpointTxsByVtxoPubKeys(ctx, pubkeys []string) ([]Tx, error)` (`internal/core/domain/vtxo_repo.go`) with postgres (`sqlc` `query.sql`), sqlite (`sqlc` `query.sql`), and badger implementations.
- Restart recovery: `restoreWatchingVtxos` fetches finalized checkpoint txs for the sweepable rounds' vtxo pubkeys and re-watches their output scripts via the new helper `checkpointOutputScripts`; `stopWatchingVtxos` unwatches them symmetrically. Fetch/parse failures soft-fail (DB error or corrupted PSBT is logged/skipped) so a single bad row cannot abort startup or shutdown.
- New tests: `internal/core/application/script_watch_test.go`, `mocks_test.go`, `db/service_test.go` additions.

**Breaking Changes**: None on the wire (PR #1092 is an additive proto change). **Interface note:** PR #1129 adds `GetCheckpointTxsByVtxoPubKeys` to the `VtxoRepository` domain interface — any external implementer of that interface must add the method.

**Files Updated**:
- docs/INDEX.md (two Key Capabilities bullets; new tags `cursor-pagination`, `getvtxochain`, `page-token`, `checkpoint-watching`, `script-watching`; new develop/debug triggers)
- docs/projects/arkd/INDEX.md (version 1.3.14 → 1.3.15, sync commit/date)
- docs/projects/arkd/system/integration_points.md (checkpoint-script watching note in Scheduler + Scanner section)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-06-30 - Documentation Update
**Commit**: `e6217887` (arkd repository)
**Previous Sync**: `5fae2026`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 commits
- `e6217887` Fix: reconnect arkd-wallet scanner to NBXplorer with backoff (#1130)
- `ab51920d` Fix: cap metadata of interest values size in logging interceptor (#1131)

**Fixes (PR #1130 — scanner runtime reconnect)**:
- The blockchain `scanner` (`pkg/arkd-wallet/core/application/scanner/service.go`) now survives runtime nbxplorer WebSocket drops. The notification goroutine detects a **closed** notification channel (`utxos, ok := <-notificationCh; !ok`) and, instead of exiting, warn-logs `nbxplorer disconnected`, waits with exponential backoff (`defaultInitialBackoff = 1 * time.Second`, doubling up to `defaultMaxBackoff = 30 * time.Second`), then re-calls `s.nbxplorer.GetAddressNotifications(ctx)`. On success it logs `reconnected to nbxplorer`, resets the backoff, swaps in the new channel and resumes; on failure it doubles the backoff (capped) and retries. The backoff durations are struct fields (`initialBackoff`/`maxBackoff`) seeded from the defaults in `New`, so tests can inject shorter values. Backoff/`ctx.Done()` waits use a stoppable `time.Timer`.
- The nbxplorer adapter `GetAddressNotifications` (`pkg/arkd-wallet/core/infrastructure/nbxplorer/service.go`) now opens the WebSocket **synchronously** and returns `failed to connect to WebSocket: …` on dial failure, instead of dialing inside the goroutine and silently closing the channel. A subsequent `ReadMessage` error now logs `failed to read WebSocket message` and **closes** the channel (letting the scanner reconnect) rather than re-dialing in place.
- Runtime counterpart to the startup-retry of PR #1083. New tests: `scanner/service_test.go`.

**Fixes (PR #1131 — logger metadata capping)**:
- `sanitizeMetadata` (`internal/interface/grpc/interceptors/logger.go`) now bounds each logged "metadata of interest" value to `maxMetadataValueSizeBytes = 100`. Oversized values are warn-logged (`metadata of interest value too large` with `{key, len}`) and replaced with the sentinel `invalidMetadataValue = "arklabs/invalid"` before being attached to the log entry, preventing oversized client-supplied metadata from bloating logs. Single-element selections stay scalar; multi-element selections remain slices. New tests: `logger_test.go`.

**Breaking Changes**: None. Both PRs are internal resilience/logging-hygiene fixes — no proto / gRPC method / env var / config / migration surface changed.

**Files Updated**:
- docs/INDEX.md (two recent-change bullets; new tags `nbxplorer-reconnect`, `scanner-backoff`, `runtime-resilience`, `metadata-capping`; new debug triggers)
- docs/projects/arkd/INDEX.md (version 1.3.13 → 1.3.14, sync commit/date)
- docs/projects/arkd/system/integration_points.md (arkd-wallet→NBXplorer runtime-resilience note; logger metadata-capping note in interceptor section)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-06-27 - Documentation Update
**Commit**: `5fae2026` (arkd repository)
**Previous Sync**: `67332efb`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit
- `5fae2026` Expose gRPC channelz introspection on the admin port via env var (#1127)

**Features (PR #1127)**:
- New `ARKD_ENABLE_CHANNELZ` env var (default `false`) registers the gRPC channelz service on the admin port, letting operators inspect live channel/connection/socket state via `grpc_cli`. Threaded through `internal/config` (`EnableChannelz`) and the grpc-interface `Config`; `envs/arkd.dev.env` enables it for dev. Off by default; no proto / gRPC method / migration surface changed.

**Files Updated**:
- docs/INDEX.md (key capability, tags, monitor trigger)
- docs/projects/arkd/system/configuration.md (new env var)
- docs/projects/arkd/system/project_overview.md (observability section)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-06-26 - Documentation Update
**Commit**: `67332efb` (arkd repository)
**Previous Sync**: `3e11a6fc`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit
- `67332efb` Fix interceptors order & Prevent digest interceptor to cause panic (#1125)

**Fixes (PR #1125)**:
- **gRPC interceptor order (`internal/interface/grpc/interceptors/interceptor.go`)**: the readiness interceptor (`unaryReadinessHandler`/`streamReadinessHandler`) was moved from **last** to **third** in both the unary and stream chains — now running immediately after the logger and **ahead** of the version-guard, digest, and macaroon-auth interceptors. Because chained interceptors execute outside-in, an un-ready server now short-circuits with a readiness error **before** those guards run, in particular before the digest guard attempts to compute the settings digest on a not-yet-initialized server.
- **Digest panic prevention (`internal/core/ports/live_store.go`)**: `Settings.Digest()` now guards `if s.SignerPubkey == nil || s.ForfeitPubkey == nil { return "", fmt.Errorf("settings not initialized") }` at the top, returning an error instead of dereferencing nil pubkeys and panicking when the settings cache has not been populated yet (e.g. before the wallet/signer is unlocked). The `fmt` import is added.
- **Digest handler logging (`internal/interface/grpc/interceptors/digest.go`)**: both `unaryDigestHandler` and `streamDigestHandler` now `log.WithError(err).Warn("failed to get digest")` (logrus) on a digest-retrieval failure before returning the existing `INTERNAL_ERROR` "failed to verify digest header, retry later" — so the previously-opaque internal error is now traceable in the server logs.

**Breaking Changes**:
- None. Internal-only change: no proto / gRPC method / env var / config / migration surface changed. Behavior change is limited to interceptor ordering (readiness now short-circuits earlier) and a panic-to-error conversion in the digest path.

**Files Updated**:
- docs/INDEX.md (arkd entry: new capability bullet for the interceptor-order fix + digest panic guard; new tags `interceptor-order`, `readiness`, `digest-guard`; new debug triggers `digest interceptor panic`, `settings not initialized`, `failed to verify digest header`)
- docs/projects/arkd/INDEX.md (sync commit + date, version 1.3.12 → 1.3.13)
- docs/projects/arkd/system/integration_points.md (Error Mapping: reordered the downstream-interceptor list to readiness-first; new "Interceptor order (PR #1125)" note covering the readiness move, the `Settings.Digest()` nil guard, and the digest-handler warn log)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-06-25 - Documentation Update
**Commit**: `3e11a6fc` (arkd repository)
**Previous Sync**: `51384c05`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit
- `3e11a6fc` bump golang/crypto and golang/net libs (#1126)

**Dependencies / Internal Refactor (PR #1126)**:
- **Dependency bump**: `golang.org/x/crypto` 0.49.0 → 0.52.0 and `golang.org/x/net` 0.52.0 → 0.55.0, plus transitive bumps `golang.org/x/sys` 0.42.0 → 0.45.0, `golang.org/x/text` 0.35.0 → 0.37.0, `golang.org/x/term` 0.41.0 → 0.43.0, `golang.org/x/mod` 0.33.0 → 0.35.0, `golang.org/x/tools` 0.42.0 → 0.44.0. Reflected across all module `go.mod`/`go.sum` (`go.mod`, `api-spec/go.mod`, `pkg/ark-cli/go.mod`, `pkg/ark-lib/go.mod`, `pkg/arkd-wallet/go.mod`, `pkg/client-lib/go.mod`, `pkg/errors/go.mod`, `pkg/kvdb/go.mod`, `pkg/macaroons/go.mod`).
- **Stdlib HTTP/2 server migration (`internal/interface/grpc/service.go`)**: the public and admin HTTP servers no longer import `golang.org/x/net/http2` or `golang.org/x/net/http2/h2c`. The manually-constructed `http2.Server{MaxConcurrentStreams}` + conditional `h2c.NewHandler` wrapping + `http2.ConfigureServer` is replaced by the Go stdlib `http.Protocols` / `http.HTTP2Config` API: `protocols.SetHTTP1(true)` always; `protocols.SetUnencryptedHTTP2(true)` when `s.config.insecure()` else `protocols.SetHTTP2(true)`; and `http.Server{Protocols: protocols, HTTP2: &http.HTTP2Config{MaxConcurrentStreams: int(s.config.MaxConcurrentStreams)}}`. The admin server reuses the same `protocols`. The mux handler is now assigned directly (no h2c wrapper).

**Breaking Changes**:
- None. Behavior is preserved end-to-end: HTTP/1 + h2c in insecure mode, HTTP/1 + TLS HTTP/2 otherwise, and the `ARKD_MAX_CONCURRENT_STREAMS` budget still applied (now via `http.HTTP2Config.MaxConcurrentStreams`). No proto / gRPC method / env var / config / migration surface changed.

**Files Updated**:
- docs/INDEX.md (arkd entry: new capability bullet for the golang/crypto+golang/net bump and the stdlib `http.Protocols`/`http.HTTP2Config` migration; new tags `dependency-bump`, `http2`)
- docs/projects/arkd/INDEX.md (sync commit + date, version 1.3.11 → 1.3.12)
- docs/projects/arkd/system/tech_stack.md (Communication & APIs: note that the public/admin HTTP servers configure HTTP/2 via stdlib `http.Protocols`/`http.HTTP2Config`, replacing the prior `x/net/http2` + `h2c` wiring)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-06-23 - Documentation Update
**Commit**: `51384c05` (arkd repository)
**Previous Sync**: `ccda5c50`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit
- `51384c05` fix: Return accepted or finalized tx in indexer.GetVirtualTx and service.GetPendingTx (#1123)

**Fixes**:
- **`SelectOffchainTx` returns only accepted/finalized txs (PR #1123)**: the offchain-tx repository query that backs `indexer.GetVirtualTx` and `service.GetPendingTx` now filters `SELECT sqlc.embed(offchain_tx_vw) FROM offchain_tx_vw WHERE txid = @txid AND (stage_code = 2 OR stage_code = 3)` on both postgres (`internal/infrastructure/db/postgres/sqlc/query.sql`) and sqlite (`internal/infrastructure/db/sqlite/sqlc/query.sql`), with the sqlc-generated `query.sql.go` regenerated to match. This replaces the prior `AND COALESCE(fail_reason, '') = ''` predicate, which returned any non-failed row — including a still-`requested` (stage 1) tx. Stage codes are `OffchainTxRequestedStage = 1`, `OffchainTxAcceptedStage = 2`, `OffchainTxFinalizedStage = 3` (`internal/core/domain/offchain_tx.go`). The fix resolves a concurrency hazard surfaced by concurrent `SubmitTx` calls, where an offchain tx not yet accepted (no `fail_reason` set) could be returned by `GetVirtualTx`/`GetPendingTx`. Covered by expanded `internal/infrastructure/db/service_test.go` cases.

**Breaking Changes**:
- None. Internal-only change: no proto / gRPC method / env var / config / migration surface changed. Only the row-selection predicate of an existing repository query was tightened.

**Files Updated**:
- docs/INDEX.md (arkd entry: new capability bullet for the accepted/finalized `SelectOffchainTx` filter; new tag `offchain-tx-query`; new debug triggers `pending tx not returned`, `concurrent submittx`, `getvirtualtx empty`)
- docs/projects/arkd/INDEX.md (sync commit + date, version 1.3.10 → 1.3.11)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-06-19 - Documentation Update
**Commit**: `ccda5c50` (arkd repository)
**Previous Sync**: `268d19d9`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 commits
- `ccda5c50` arkd-wallet: Retry connecting to `nbxplorer` at startup (#1083)
- `0bae0249` fix: convert guard errors to gRPC status before they reach the client (#1108)

**Fixes**:
- **Guard-interceptor errors converted to gRPC status (PR #1108)**: the server's `errorConverter` interceptor was moved to the **front** of the unary chain, and a new `streamErrorConverter` was added to the stream chain (`internal/interface/grpc/interceptors/{interceptor,error_converter}.go`). Because chained interceptors execute outside-in, placing the converter first means structured `arkerrors.Error` values returned by the downstream version-guard, digest, macaroon-auth, and readiness interceptors are now wrapped as `gRPCError` (carrying `arkv1.ErrorDetails`) before reaching the client. Previously the converter sat **last** in the unary chain and there was no stream converter at all, so guard/auth/readiness errors leaked to clients as raw/unstructured errors. On the client side, `pkg/client-lib`'s `isDigestMismatch` (`pkg/client-lib/client/grpc/digest_header.go`) now decodes the structured `arkv1.ErrorDetails` from the gRPC status details (via `status.FromError` + `st.Details()`, matching `errors.DIGEST_MISMATCH.Name`) instead of `strings.Contains`-matching the error message — completing the end-to-end DIGEST_MISMATCH detect-and-refresh path the prior `TODO` had deferred. Covered by new `interceptor_test.go` and `digest_header_test.go`.
- **arkd-wallet retries nbxplorer at startup (PR #1083)**: the nbxplorer adapter constructor (`pkg/arkd-wallet/core/infrastructure/nbxplorer/service.go`) now wraps its initial `GetBitcoinStatus` probe in a retry loop — `nbxplorerMaxRetries = 30` attempts at `nbxplorerRetryInterval = 5 * time.Second` (≈2.5 min total), warn-logging each failed attempt with `{attempt, error}` — and only returns `failed to connect to nbxplorer after 30 attempts` once the budget is exhausted. This avoids an `arkd-wallet` crash when nbxplorer is not yet ready to serve RPCs at boot, leaving the orchestrator to restart the container only after the retry window closes.

**Breaking Changes**:
- None. Both changes are internal: no proto / gRPC method / env var / config / migration surface changed. The error-conversion change only affects the *encoding* of errors clients already received (now structured gRPC status instead of raw error), and the nbxplorer retry uses hardcoded constants (no new env var).

**Files Updated**:
- docs/INDEX.md (arkd entry: two new capability bullets — guard-interceptor gRPC-status conversion, nbxplorer startup retry; new tags `error-converter`, `grpc-status`, `nbxplorer-retry`, `startup-resilience`; new ask_question/develop/debug triggers)
- docs/projects/arkd/INDEX.md (sync commit + date, version 1.3.9 → 1.3.10)
- docs/projects/arkd/system/integration_points.md (Interface→Application error mapping now notes the front-of-chain `errorConverter`/`streamErrorConverter` and structured `arkv1.ErrorDetails`; arkd-wallet→NBXplorer section gains a startup-resilience note on the 30×/5s retry)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-06-18 - Documentation Update
**Commit**: `268d19d9` (arkd repository)
**Previous Sync**: `11cf2ba8`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit
- `268d19d9` client-lib: support deprecated signer verification (#1117)

**Features Added**:
- **Client-side deprecated-signer verification (PR #1117)**: the embedded `pkg/client-lib` SDK now verifies server signatures on ark/checkpoint txs against the set of valid signer keys (current + deprecated) — the client counterpart to server-side signer rotation (PR #1097). `types.Config` gains `DeprecatedSigners []DeprecatedSigner` (`{PubKey *btcec.PublicKey, CutoffDate time.Time}`) and `Config.AllSigners() map[string]*btcec.PublicKey` (keyed by x-only hex pubkey). `verifySignedArk`/`verifySignedCheckpoints`/`verifyOffchainPsbt` (`utils.go`) now take `signers map[string]*btcec.PublicKey` instead of a single pubkey, matching each signed input's `TaprootScriptSpendSig.XOnlyPubKey` against the set and verifying with the matched key. Callers `SendOffChain` (`send.go`) and `IssueAsset`/`ReissueAsset`/`BurnAsset` (`asset.go`) fetch `GetConfigData(ctx)` and pass `cfgData.AllSigners()`. The file store persists a `deprecated_signers` JSON array (`{pubkey, cutoff_date}`, compressed-hex pubkey + RFC3339 cutoff) in `storeData`, round-tripped in `config_store.go`/`store/file/types.go` and surfaced in `asMap()`. Covered by new `types_test.go` and `store/service_test.go` cases.

**Breaking Changes**:
- None (internal helper signatures only; public `types.Config` is additive).

**Files Updated**:
- docs/INDEX.md (arkd entry: client-side deprecated-signer-verification capability bullet; new tag + triggers)
- docs/projects/arkd/system/project_overview.md (new Major Feature: client-side deprecated-signer verification)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-06-16 - Documentation Update
**Commit**: `11cf2ba8` (arkd repository)
**Previous Sync**: `7591e53f`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 5 commits
- `11cf2ba8` Minor fixes on interceptors and client headers (#1114)
- `2bd1202d` Fix sweep connectors admin endpoint (#1105)
- `76ebb425` client-lib: Add optional x-sdk-version header to arkade grpc client (#1113)
- `505c6018` Fix: discard interrupted SQLite connections and make asset reads stable under churn (#1043)
- `57c72343` Support for signer keys deprecation (#1097)

**Features Added**:
- **Signer-key deprecation / rotation (PR #1097)**: `arkd-wallet` accepts a new comma-separated `DEPRECATED_SIGNER_KEYS` env var (`<hexkey>[:<unix-cutoff>]` entries; cutoff = time after which the key is no longer accepted, `0`/unset = never). `parseDeprecatedSignerKeys` validates 32-byte hex keys, and startup fails if a deprecated key matches the current `SIGNER_KEY`. New `wallet.DeprecatedSignerKey{Key, CutoffDate}` plumbed into `WalletOptions`. The signer proto gains `repeated DeprecatedSigner deprecated_signers` (`{pubkey, cutoff_date}`) on `GetPubkeyResponse`, exposed via `signer.GetDeprecatedPubkeys` and `ports.DeprecatedSignerPubkey`. `NewIndexerService` now takes `deprecatedSignerPubkeys`; indexer/application verify intents and strip signer signatures against `allSignerPubkeys()` (current + deprecated).
- **Optional `x-sdk-version` client header (PR #1113)**: `pkg/client-lib` stamps each unary/stream RPC with an `x-sdk-version` gRPC metadata header via the new `WithClientVersion(version)` ServiceOption (threaded `service.clientVersion` → `grpcclient.NewClient`); only attached when non-empty. New `client_version_header.go` interceptors.
- **Interceptor / version-guard tightening (PR #1114)**: the server `x-build-version` `VersionGuard` now always compares a present, parseable client version to the server minimum even when the header is not required; only missing/empty/unparseable headers pass through in non-required mode. Logger/digest interceptor cleanups.

**Fixes**:
- **Sweep connectors admin endpoint (PR #1105)**: corrected the sweep-connectors flow and truncates sweep inputs when necessary (`internal/core/application/admin.go`, `bitcoin_wallet` proto/openapi, `ports/wallet.go`).
- **SQLite stability under churn (PR #1043)**: discard interrupted SQLite connections and make asset reads stable under concurrent churn (`db/sqlite/*` repos, `utils.go`, query.sql regeneration).

**Breaking Changes**:
- ⚠️ `grpcclient.NewClient` signature changed to `(serverUrl, clientVersion string)`.
- ⚠️ `NewIndexerService` now requires a `deprecatedSignerPubkeys []ports.DeprecatedSignerPubkey` argument.

**Files Updated**:
- docs/INDEX.md (arkd entry: signer-key-deprecation + x-sdk-version capability bullets; new tags; new triggers)
- docs/projects/arkd/system/project_overview.md (two new Major Features: signer-key deprecation, x-sdk-version header)
- docs/projects/arkd/system/configuration.md (new arkd-wallet signer keys section with `DEPRECATED_SIGNER_KEYS`)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-06-12 - Documentation Update
**Commit**: `33342793` (arkd repository)
**Previous Sync**: `d5a32a25`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit
- `33342793` add Settings domain with DB persistence and admin CRUD API (#939)

**Features Added (PR #939 — DB-persisted Settings domain + admin CRUD API)**:
- New `domain.Settings` aggregate (`internal/core/domain/settings.go`) holding all operational settings in a single DB row: `SessionDuration`, `UnrolledVtxoMinExpiryMargin`, `BanThreshold`, `BanDuration`, `UnilateralExitDelay`, `PublicUnilateralExitDelay`, `CheckpointExitDelay`, `BoardingExitDelay`, `VtxoTreeExpiry` (all locktimes as `arklib.RelativeLocktime`), `RoundMin/MaxParticipantsCount`, `Vtxo/UtxoMin/MaxAmount`, `SettlementMinExpiryGap`, `VtxoNoCsvValidationCutoffDate`, `MaxTxWeight`, `MaxOpReturnOutputs`, `AssetTxMaxWeightRatio`, `NoteUriPrefix`, `ScheduledSession *ScheduledSession`, `BatchFees`, `UpdatedAt`. Extensive validation in the domain constructor/update paths.
- New `domain.SettingsRepository` interface (`Get`, `Upsert(ctx, settings, changelog)`, `RegisterUpdatesHandler(func(Settings, []string))`, `Close`) with sqlite, postgres, and badger implementations. Migrations: `20260609120123_add_settings` (sqlite), `20260609120126_add_settings` (postgres). Badger `Upsert` honors ctx cancellation in its retry loop.
- **First-boot seeding** (`settings_seed.go` per backend, with tests): when the settings table is empty, the row is seeded from `ARKD_*` env vars (or defaults), validated before persisting, and the latest legacy `intent_fees` / `scheduled_session` rows are carried over; the legacy tables are then emptied (to be dropped later). On every later boot the seed is skipped and the settings env vars are **ignored** — the stored row wins.
- `ports.RepoManager` **breaking change**: `ScheduledSession() domain.ScheduledSessionRepo` and `Fees() domain.FeeRepository` removed; `Settings() domain.SettingsRepository` and `RegisterSettingsUpdateHandler(...)` added. Legacy `intent_fees_repo.go` / `scheduled_session_repo.go` deleted across badger/sqlite/postgres. `domain/fee.go` replaced by `domain/fees.go` (`BatchFees`).
- New live-store `SettingsStore` cache (`ports.LiveStore.Settings()`; inmemory + redis impls): caches `ports.Settings` = `domain.Settings` + runtime enrichment (`Network`, `DustAmount`, `SignerPubkey`, `ForfeitPubkey`, `ForfeitAddress`, `CheckpointTapscript`) with a `Digest()` for GetInfo. Effective dust-resolved min amounts live only in this cache, never written back to the DB.
- New admin RPCs (`api-spec/protobuf/ark/v1/admin.proto` + regenerated gen/openapi): `AdminService.GetSettings` (`GET /v1/admin/settings`, macaroon `manager:read`) and `AdminService.UpdateSettings` (`POST /v1/admin/settings`, macaroon `manager:write`). `UpdateSettings` performs **partial updates** (only provided fields change) and returns `repeated string change_log`. New `Settings` proto message with all-optional fields.
- Admin write flows (`UpdateSettings` + scheduled-session/batch-fee mutators) are serialized under a mutex with synchronous cache refresh, so concurrent updates can't lose each other or leave the cache stale. Validation tightened: uint32 overflow guards, vtxo/utxo max >= min, satoshi upper bound on amounts, `BanThreshold`, `MaxTxWeight`, `CheckpointExitDelay`, `max_op_return_outputs > 0`; all setting changes warn-logged.
- Config refactor (`internal/config/config.go`, ~420 lines net removed): settings env vars are now seed-only; **removed** `ARKD_SCHEDULER_TYPE` (scheduler derived from `vtxo_tree_expiry` locktime type: seconds → gocron, blocks → block scheduler), `ARKD_ALLOW_CSV_BLOCK_TYPE`, `ARKD_ROUND_INTERVAL`.
- ark-lib: new `MinAllowedSequence = 512` constant and `ParseRelativeLocktime(value uint32) (RelativeLocktime, bool)` helper (`pkg/ark-lib/locktime.go`) deduplicating the seconds-vs-blocks discrimination logic; new `locktime_test.go`.
- New repo doc `docs/settings.md` (lifecycle diagram, full seed-variable table with units/defaults, runtime-management endpoints); README config section split into Environment Variables vs Admin Settings.

**Breaking Changes**:
- ⚠️ After the first boot, changing `ARKD_*` settings env vars has **no effect** — operators must use `POST /v1/admin/settings`. To re-seed from env, start against an empty settings table.
- ⚠️ `RepoManager.Fees()` / `RepoManager.ScheduledSession()` removed (absorbed into `Settings()`); external domain consumers must update.
- ⚠️ `ARKD_SCHEDULER_TYPE`, `ARKD_ALLOW_CSV_BLOCK_TYPE`, `ARKD_ROUND_INTERVAL` env vars removed.

**Files Updated**:
- docs/INDEX.md (arkd entry: new Settings-domain capability bullet; new tags `settings`, `first-boot-seed`; new ask_question/develop triggers)
- docs/projects/arkd/INDEX.md (sync commit + date, version 1.3.8 → 1.3.9)
- docs/projects/arkd/system/configuration.md (two-tier config model; settings vars marked first-boot-seed-only; removed vars marked; admin settings API section; examples and validation rules updated)
- docs/projects/arkd/system/application_core.md (Admin Service: GetSettings/UpdateSettings; LiveStore SettingsStore cache; RepoManager port list)
- docs/projects/arkd/system/repo_manager.md (RepoManager interface updated; SettingsRepository section replacing stale MarketHourRepo; migration notes)
- docs/projects/arkd/system/project_overview.md (DB-Persisted Settings major feature; round configuration bullets)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

---

## 2026-06-11 - Documentation Update
**Commit**: `d5a32a25` (arkd repository)
**Previous Sync**: `75066cc2`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 commits
- `d5a32a25` Admin api to list expired batches (#1095)
- `9d1c7ce5` arkd-wallet: Improve Withdraw RPC + add GetMainAccountUtxos (#1094)

**Features Added (PR #1095 — `AdminService.GetExpiredRounds`)**:
- New domain type `domain.ExpiredRound { RoundId string; CommitmentTxid string; ExpiredAt int64 }` and a new method on the domain interface (`internal/core/domain/round_repo.go`): `RoundRepository.GetExpiredRounds(ctx, expiredBefore int64) ([]ExpiredRound, error)`. Returns the sweepable rounds (those with a vtxo tree, `swept = false`, `ended = true`, `failed = false`) whose `ending_timestamp + vtxo_tree_expiration < expiredBefore`. `ExpiredAt` is `ending_timestamp + vtxo_tree_expiration` (Unix seconds).
- SQL implementations use a new sqlc query `SelectExpiredRounds` (`internal/infrastructure/db/{postgres,sqlite}/sqlc/query.sql`): `SELECT r.id, r.txid, CAST(r.ending_timestamp + r.vtxo_tree_expiration AS BIGINT) AS expired_at FROM round_with_commitment_tx_vw r WHERE r.swept = false AND r.ended = true AND r.failed = false AND (r.ending_timestamp + r.vtxo_tree_expiration) < @now AND EXISTS (SELECT 1 FROM tx tree_tx WHERE tree_tx.round_id = r.id AND tree_tx.type = 'tree')` — the same predicate as `SelectSweepableRounds` plus the expiry-before-now clause. Badger iterates rounds in-memory and applies the same filter (`internal/infrastructure/db/badger/ark_repo.go`).
- New `AdminService.GetExpiredRounds(ctx) ([]domain.ExpiredRound, error)` (`internal/core/application/admin.go`) that calls `repoManager.Rounds().GetExpiredRounds(ctx, time.Now().Unix())`.
- New gRPC handler `adminHandler.GetExpiredRounds` (`internal/interface/grpc/handlers/adminservice.go`) that maps repo failures to `codes.Internal`. Macaroon permission `manager:read` added to `AllPermissionsByMethod` for the new method (`internal/interface/grpc/permissions/permissions.go`).
- New proto messages `GetExpiredRoundsRequest`, `GetExpiredRoundsResponse { repeated ExpiredRound rounds = 1 }`, and `ExpiredRound { string round_id = 1; string commitment_txid = 2; int64 expired_at = 3 }` plus the `AdminService.GetExpiredRounds` RPC bound to `GET /v1/admin/rounds/expired` (`api-spec/protobuf/ark/v1/admin.proto` + regenerated `gen/...` + `api-spec/openapi/swagger/ark/v1/admin.openapi.json`).
- New CLI subcommand `arkd expired-rounds` (`cmd/arkd/commands.go`, `cmd/arkd/main.go`) that GETs `/v1/admin/rounds/expired` and pretty-prints the `rounds` array.

**Features Added (PR #1094 — `AdminService.GetMainAccountUtxos` + Withdraw selector rewrite)**:
- New `ports.WalletService.GetMainAccountUtxos(ctx) ([]WalletUtxo, error)` on the wallet port (`internal/core/ports/wallet.go`) and new type `ports.WalletUtxo { Txid string; Vout uint32; Value uint64; Script string (hex); Address string; Confirmations uint32; Locked bool }`. Returns the whole UTXO set of the main account, including unconfirmed and locked UTXOs, each flagged accordingly.
- New `AdminService.GetMainAccountUtxos(ctx) ([]ports.WalletUtxo, error)` (`internal/core/application/admin.go`) — pure delegation to `walletSvc.GetMainAccountUtxos`. New gRPC handler `adminHandler.GetMainAccountUtxos` mapping the slice to `arkv1.WalletUtxo`. Macaroon permission `manager:read` added for the new method.
- arkd-side proto: new messages `GetMainAccountUtxosRequest`, `GetMainAccountUtxosResponse { repeated WalletUtxo utxos = 1 }`, and `WalletUtxo { string txid = 1; uint32 vout = 2; uint64 value = 3; string script = 4; string address = 5; uint32 confirmations = 6; bool locked = 7 }` plus the `AdminService.GetMainAccountUtxos` RPC bound to `GET /v1/admin/wallet/utxos`.
- arkd-wallet-side proto: matching `GetMainAccountUtxosRequest`/`GetMainAccountUtxosResponse`/`WalletUtxo` messages and a new `WalletService.GetMainAccountUtxos` RPC bound to `GET /v1/wallet/main-account-utxos` (`api-spec/protobuf/arkwallet/v1/bitcoin_wallet.proto`). Implementation in `pkg/arkd-wallet/core/application/wallet/service.go` and the gRPC handler in `pkg/arkd-wallet/interface/grpc/handlers/wallet_handler.go`. Locked status comes from a `locker.get(ctx)` snapshot.
- New CLI subcommand `arkd wallet-utxos` (`cmd/arkd/commands.go`, `cmd/arkd/main.go`) that GETs `/v1/admin/wallet/utxos` and pretty-prints the `utxos` array.
- Withdraw RPC coin-selection rewrite (`pkg/arkd-wallet/core/application/wallet/{coinselect,service}.go`):
  - Replaces the package-level `var coinSelector = MinNumberCoinSelector{50, 800}` with a `newCoinSelector(minChangeAmount btcutil.Amount)` constructor and two named constants: `maxSelectionInputs = 50`, `defaultMinChangeAmount = 330` (down from 800; aligned with the P2TR/P2WSH dust limit).
  - New `effectiveValueCoin` wraps a `coin` and overrides `Value()` to return `realValue − perInputFee`, so the selector ranks and accumulates by effective value while transaction building still uses the real outpoint/script/value.
  - New `selectCoinsForWithdraw(amount, feeRate, destPkScript)` builds `perInputFee = fee(2 inputs) − fee(1 input)` and `baseFee = fee(1 input) − perInputFee` from the weight estimator, filters out UTXOs with `value <= perInputFee` (uneconomical to spend), wraps the rest as `effectiveValueCoin`, and runs `newCoinSelector(0).CoinSelect(amount + baseFee, ...)`. The chosen UTXOs always cover `amount` plus the fee for their **actual** input count — eliminating the prior re-selection loop that pre-estimated for a "typical 2-input" withdraw and could under-/over-fund.
  - `SelectUtxos` is refactored onto a shared `selectCoins(amount, confirmedOnly, minChangeAmount)` helper and now uses `defaultMinChangeAmount`. Locking is split out into a new `lockUtxos(ctx, utxos)` (and lockless `selectCoins` no longer locks).
  - New `unlockUtxos(ctx, utxos)` plus a new `outpointLocker.unlock(ctx, outpoints...)` method (`pkg/arkd-wallet/core/application/wallet/outpoint_locker.go`) that deletes outpoints from the in-memory `lockedOutpoints` map.
  - `Withdraw` (`pkg/arkd-wallet/core/application/wallet/service.go`) installs a `defer` that, if `broadcasted` is still `false`, unlocks every `ptx.UnsignedTx.TxIn.PreviousOutPoint`. So a signing or broadcasting failure releases the per-withdraw locks immediately instead of waiting for the lock expiry. (withdrawAll inputs aren't locked, so this is a no-op for that path.)
- New `pkg/arkd-wallet/core/application/types.go::MainAccountUtxo` type carrying the same shape as `ports.WalletUtxo` to keep the cross-process boundary clean.

**Files Updated**:
- docs/INDEX.md (arkd entry: three new capability bullets — `GetExpiredRounds` admin endpoint, `GetMainAccountUtxos` admin endpoint, Withdraw effective-value coin selection; new tags `expired-rounds`, `wallet-utxos`, `effective-value-selection`; new `ask_question` triggers `expired rounds`/`wallet utxos`; new `develop` triggers `expired rounds endpoint`/`wallet utxos endpoint`/`withdraw coin selection`)
- docs/projects/arkd/INDEX.md (sync commit + date, version 1.3.7 → 1.3.8)
- docs/projects/arkd/system/application_core.md (Admin Service method list expanded with `GetExpiredRounds` and `GetMainAccountUtxos`)
- docs/projects/arkd/system/repo_manager.md (RoundRepository: added `GetExpiredRounds` with the SQL/badger predicate and `ExpiredRound` shape)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

**Note**: Both PRs are **additive and non-breaking** at every API surface: new RPCs, new proto messages, new macaroon entries, new CLI subcommands, new domain types, and a new port method. The only behavior change to an existing flow is `Withdraw`'s coin selection — it now selects by **effective value** against `amount + baseFee` (so the input count and fee are jointly consistent) rather than pre-estimating fees for "typical 2 inputs" and re-selecting on shortfall. The dust threshold for the general-purpose `SelectUtxos` path is also lowered from 800 sats to 330 sats, which means some previously-rejected selections (those that would leave 330–799 sats of change) are now accepted; the Withdraw path passes `MinChangeAmount: 0` so sub-dust change there is folded into the fee instead of becoming a change output. The `outpointLocker.unlock` method is a pure addition. The new admin endpoints require `manager:read` macaroons, matching the rest of the read-only admin surface.

---

## 2026-06-09 - Documentation Update
**Commit**: `75066cc2` (arkd repository)
**Previous Sync**: `6db7a6b7`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 commits
- `75066cc2` Bump golangk@v1.26.4 (#1091)
- `afd23262` ark-lib: add unit tests to script

**Changes**:
- **ark-lib safety hardening (`pkg/ark-lib/script/closure.go`)**: `DecodeClosure` now calls `txscript.ScriptHasOpSuccess(script)` immediately after the empty-script guard and returns `"script contains forbidden OP_SUCCESS opcode"` if any BIP-342 OP_SUCCESS opcode is present, before attempting closure-type matching. Without this check, a tapscript leaf containing an OP_SUCCESS opcode (e.g., `OP_CAT` = `0x7e`) would succeed unconditionally under BIP-342, letting anyone spend a VTXO without satisfying the intended closure — so the constructor of `ConditionMultisigClosure` (whose `Condition` is operator-supplied script bytes) was the realistic attack surface. The fix is minimal (4 lines) and additive: only the public `DecodeClosure` entrypoint is affected; the `Script()` builders are unchanged.
- **ark-lib test coverage (`pkg/ark-lib/script/script_test.go`, +75 lines)**: Two new entries in `invalidDecodeClosureVectors()` (`"condition multisig closure with OP_SUCCESS opcode"` and `"condition csv multisig closure with OP_SUCCESS opcode"`) wire the existing `TestDecodeClosure` table into the new check. A new helper `opSuccessOpcodes()` returns every BIP-342 OP_SUCCESS byte (`80`, `98`, `126–134`, `137–138`, `141–142`, `149–153`, and `187–254`), and `TestDecodeClosureRejectsOpSuccess` iterates that list, constructs a `ConditionMultisigClosure` with each opcode in the `Condition` field, calls `closure.Script()` then `script.DecodeClosure(...)`, and asserts both that `DecodeClosure` errors and that the returned closure is `nil`. `executeBoolScriptFixtures` gains an `"invalid OP_SUCCESS"` row (`script: []byte{txscript.OP_CAT}`, empty witness, `expectErr: true`) to cover the standalone-script execution path.
- **Go toolchain bump 1.26.3 → 1.26.4 (PR #1091)**: bumps all 9 module `go` directives (`go.mod`, `api-spec/go.mod`, `pkg/ark-cli/go.mod`, `pkg/ark-lib/go.mod`, `pkg/arkd-wallet/go.mod`, `pkg/client-lib/go.mod`, `pkg/errors/go.mod`, `pkg/kvdb/go.mod`, `pkg/macaroons/go.mod`), the four CI workflows (`.github/workflows/unit.yaml` — both `unit-tests` and `lint` jobs, plus `integration.yaml`, `artifacts.yaml`, `release.yaml`), and all three production Dockerfiles (`Dockerfile`, `arkdwallet.Dockerfile`, `arkdwallet.btcwallet.Dockerfile`). Pure version-string change with no code, no dependency, and no build-flag changes; nothing on the runtime side breaks because Go's 1.x compatibility promise covers patch releases.

**Files Updated**:
- docs/INDEX.md (new "ark-lib closure decoding rejects BIP-342 OP_SUCCESS opcodes" capability bullet on the arkd entry; new "Go toolchain pinned to **1.26.4**" capability bullet; `op-success-rejection` and `go-1.26.4` tags added)
- docs/projects/arkd/INDEX.md (sync commit + date, version 1.3.6 → 1.3.7)
- docs/projects/arkd/system/ark_lib.md (new "OP_SUCCESS Rejection (Safety Property)" subsection under Script Package documenting the DecodeClosure guard, the BIP-342 byte set, and the standalone-script ExecuteBoolScript behavior)
- docs/projects/arkd/system/tech_stack.md (Go 1.26.3+ → 1.26.4+ in overview and Programming Language section; added per-file inventory of where the version is pinned)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

**Note**: Both commits are non-breaking and additive at the API surface. The OP_SUCCESS check tightens a previously implicit assumption (that closure scripts contain only standard opcodes) and is most relevant to callers that construct `ConditionMultisigClosure` with operator-supplied conditions — any existing closure script produced by the in-tree `Script()` builders is unaffected, since none of them emit OP_SUCCESS opcodes. The Go bump is a patch-level toolchain refresh with no source-level impact; downstream consumers using `go 1.26.3` toolchains will still build the modules because `go 1.26.4` in `go.mod` is a minimum, not a pin.

---

## 2026-06-05 - Documentation Update
**Commit**: `6db7a6b7` (arkd repository)
**Previous Sync**: `ab8e64ef`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit
- `6db7a6b7` Persist batch collected fees (#933)

**Features Added (collected-fees persistence + admin aggregate-fee endpoint)**:
- New domain field `Round.CollectedFees uint64` (`internal/core/domain/round.go`) and new event field `RoundFinalized.Fees uint64` (`internal/core/domain/round_event.go`). The `on(RoundFinalized)` projection lifts the event field into the round, so the value is reconstructed correctly under both direct read and event replay.
- **Breaking domain signature change**: `Round.EndFinalization(forfeitTxs, finalCommitmentTx)` now takes a third `collectedFees uint64` argument. `service.finalizeRound` populates it from the new `calculateCollectedFees(round, boardingInputAmount)` helper (`internal/core/application/utils.go`) where `boardingInputAmount` comes from `calculateBoardingInputAmount(psbt)`, which scans the signed commitment PSBT and sums witness-utxo values of inputs detected by `isBoardingInput` (a non-nil `WitnessUtxo` with at least one `TaprootLeafScript`). The fee formula is `max(0, totalIn − totalOut)` over `boardingInputAmount + Σ intent.TotalInputAmount` and `Σ intent.TotalOutputAmount`.
- `getBatchStats` (AlertManager batch-stats pipeline, `internal/core/application/alert.go`) now uses `calculateCollectedFees` instead of summing `intent.TotalInputAmount + a.BoardingInputAmount − intent.TotalOutputAmount` inside a `for _, intent := range round.Intents` loop — the previous loop added `BoardingInputAmount` once per intent, double-counting it for any round with multiple intents. The boarding-input detection inside `getBatchStats` also moves from a bare `len(input.TaprootLeafScript) > 0` check to the shared `isBoardingInput(input)` helper.
- New `RoundRepository.PatchCollectedFees(ctx, feesByRoundId map[string]uint64) error` on the domain interface (`internal/core/domain/round_repo.go`) and on all three backends (`internal/infrastructure/db/{badger,postgres,sqlite}/...`). Used to lazily backfill rounds that were finalized before fee persistence existed. Implementations: sqlite/postgres iterate the map under a single transaction issuing parameterized `UPDATE round SET collected_fees = ? WHERE id = ?`; badger reads each round, sets the field, and re-saves.
- `AdminService.GetCollectedFees(ctx, after, before) (uint64, error)` (`internal/core/application/admin.go`) sums `round.CollectedFees` across **completed (non-failed)** rounds in the `(after, before]` Unix-seconds window (using the existing `GetRoundIds(... onlyFailed=false, onlyCompleted=true)` repo predicate). For rounds whose stored `CollectedFees == 0` (finalized before the migration ran), the value is recomputed on the fly by `recomputeCollectedFees` → `boardingInputAmount`: the finalized commitment tx is deserialized, each input's witness is inspected by `isBoardingWitness` (a taproot script-path control block on the last witness element — `(33 + 32m)` bytes, leaf-version byte `0xc0` after masking the parity bit), and each boarding prevout amount is looked up via `walletSvc.GetTransaction(prevTxid)` since a raw tx carries no input amounts. `recomputeCollectedFees` returns a `complete` flag; **only complete recomputations are persisted** via `PatchCollectedFees` in a background goroutine that uses `context.WithoutCancel(ctx)` plus a `30s` timeout (so the originating request's cancellation cannot abort the patch; the `WithoutCancel` wrap is what addresses the gosec G118 patch-goroutine context issue called out in the PR). Incomplete recomputations are still summed into the response but never written, so a later call can retry. `AdminService.GetRoundDetails` now sets `FeesAmount` from `round.CollectedFees` (previously hard-coded to `0`).
- New gRPC handler `adminHandler.GetCollectedFees` (`internal/interface/grpc/handlers/adminservice.go`) with explicit range validation: `after < 0`, `before < 0`, or `before > 0 && after >= before` map to `InvalidArgument`; repo failures map to `Internal`.
- New macaroon permission entry: `AdminService/GetCollectedFees` requires `manager:read` (`internal/interface/grpc/permissions/permissions.go`).

**Proto / REST API (additive, non-breaking)**:
- New proto messages `GetCollectedFeesRequest { int64 after = 1; int64 before = 2; }` and `GetCollectedFeesResponse { uint64 collected_fees = 1; }`, and new RPC `AdminService.GetCollectedFees` bound to `GET /v1/admin/fees/collected` (`api-spec/protobuf/ark/v1/admin.proto` + regenerated `gen/...` + `api-spec/openapi/swagger/ark/v1/admin.openapi.json`). `after`/`before` are Unix seconds (UTC, **exclusive**, `0 = unbounded`).

**Database Migrations**:
- `internal/infrastructure/db/sqlite/migration/20260603111517_add_collected_fees.{up,down}.sql`
- `internal/infrastructure/db/postgres/migration/20260603111520_add_collected_fees.{up,down}.sql`
- Both are additive (`ALTER TABLE round ADD COLUMN collected_fees INTEGER NOT NULL DEFAULT 0`); pre-existing rows therefore default to `0` and are eligible for lazy backfill via `GetCollectedFees`.

**Files Updated**:
- docs/INDEX.md (new "Persisted per-round collected fees + admin aggregate-fee endpoint" capability bullet on the arkd entry; `admin-api` tag added; `collected fees` / `admin fee report` develop triggers added)
- docs/projects/arkd/INDEX.md (sync commit + date, version 1.3.5 → 1.3.6)
- docs/projects/arkd/system/application_core.md (AdminService method list expanded with `GetExpiringLiquidity`/`GetRecoverableLiquidity`/`GetCollectedFees`, full semantics of `GetCollectedFees` including the lazy-recompute and lazy-persist paths, and a paragraph on the `RoundFinalized.Fees` field and the unified `calculateCollectedFees` helper that fixes the alert-pipeline double-count)
- docs/projects/arkd/system/repo_manager.md (RoundRepository: added `PatchCollectedFees`, noted `AddOrUpdateRound` now persists `CollectedFees`; Schema: documented the new `collected_fees` column + the two `add_collected_fees` migrations + the event-replay correctness via `on(RoundFinalized)`)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

**Note**: The only **breaking** signature change is the new third argument on `Round.EndFinalization(forfeitTxs, finalCommitmentTx, collectedFees)` — any external implementor of the domain `Round` API (in practice: none outside arkd) must update its call site. Everything else is additive: the migrations default to `0`, the new RPC and macaroon permission are net-new, and the lazy backfill path means upgraded operators get correct fee totals over their historical rounds **without** a one-shot batch job — the values just settle into storage as `GetCollectedFees` is called. The `isBoardingInput` / `isBoardingWitness` helpers are deliberately conservative: both carry an in-file `TODO` noting they assume only boarding inputs carry a `TaprootLeafScript` (PSBT-side) / are spent via taproot script path (raw-tx side), and would misclassify if `arkd-wallet` ever started populating `TaprootLeafScript` for other input types or if a future non-boarding input type used script-path spends in a commitment tx.

---

## 2026-06-04 - Documentation Update
**Commit**: `ab8e64ef` (arkd repository)
**Previous Sync**: `c4f16324`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit
- `ab8e64ef` Bulk vtxo pubkey lookup + optimize WatchScripts on startup (#1084)

**Features Added (sweeper startup, `internal/core/application/service.go` + repo layer)**:
- New `VtxoRepository.GetVtxoPubKeysByCommitmentTxids(ctx, commitmentTxids, withMinimumAmount)` bulk method on the domain interface (`internal/core/domain/vtxo_repo.go`) and on all three backends. Returns the deduped union of pubkeys whose VTXO row references any of the supplied commitment txids and whose amount is `>= withMinimumAmount` (inclusive predicate, locked by an explicit `amount == min_amount` row in test).
  - **sqlite** (`internal/infrastructure/db/sqlite/{sqlc/query.sql,vtxo_repo.go,sqlite/sqlc/queries/query.sql.go}`): new query uses `sqlc.slice` twice (the generator only rewrites the first occurrence per query, so both `vtxo_commitment_txid` and `vtxo_vw.commitments LIKE …` membership scans had to be sliced explicitly). The Go wrapper batches at SQLite's parameter limit and unions per-batch results. New `internal/infrastructure/db/sqlite/vtxo_repo_batching_test.go` covers the multi-batch path; `export_test.go` exposes the param-limit knob.
  - **postgres** (`internal/infrastructure/db/postgres/{sqlc/query.sql,sqlc/queries/query.sql.go,vtxo_repo.go}`): new query uses `ANY($1::text[])` and joins against the new `vtxo_commitment_txid` index.
  - **badger** (`internal/infrastructure/db/badger/vtxo_repo.go`): scans VTXOs once, filters with an in-memory commitment-txid set; review feedback fixed an off-by-one in the `>=` amount predicate.
- `internal/core/application/service.go` rewires both the boot path (`restoreWatchingVtxos`) and the shutdown path (`Stop()`) from per-round `GetVtxoPubKeysByCommitmentTxid` loops to a single bulk call. DB calls drop from `1+N` to `2` regardless of round count. `restoreWatchingVtxos` also adds defensive `hex.DecodeString` + 32-byte length validation on each pubkey row before lifting to a taproot script, so a corrupted DB row cannot poison the entire boot-time `WatchScripts` payload. Explicit log lines were added on Stop/restoreWatching failure paths.
- **Benchmarks** (added by the PR, `internal/infrastructure/db/vtxo_repo_bench_test.go`): on sqlite + badger localhost, per-txid `45.46s` vs bulk `35.1ms` at 1000 rounds (≈1297× faster), `266ms` bulk at 5000 rounds; the per-txid path did not complete in 3 minutes at 10000 rounds.
- New migration `20260527150000_vtxo_commitment_txid_index.{up,down}.sql` on both sqlite and postgres adds a btree index on `vtxo_commitment_txid(commitment_txid)` so the bulk join scales linearly with result size, not with total round count.

**Features Added (wallet client, `internal/infrastructure/wallet/wallet_client.go`)**:
- New `chunkStrings(in, size)` helper + `defaultWatchScriptsChunkSize = 2000` package constant. `WatchScripts` and `UnwatchScripts` now split the scripts list into chunks of `effectiveChunkSize()` (`chunkSize` field can be overridden by tests via the new test seam; production callers always get the default) and issue one gRPC call per chunk. At ~75 bytes per encoded taproot script + protobuf overhead, 2000 scripts ≈ 150 KiB per call — well under the default 4 MiB gRPC max-message cap that the original single-call path was hitting at 100k+ scripts during boot-time restore.
- `chunkStrings` panics on `size <= 0` (deliberate: silently returning a single full chunk would defeat the purpose). Returned sub-slices share backing storage with the input.
- New `internal/infrastructure/wallet/wallet_client_test.go` covers `TestChunkStrings`, `TestWalletClientWatchScriptsChunking`, and `TestWalletClientUnwatchScriptsChunking` (chunk boundaries, large inputs, mid-chunk error short-circuit).

**Files Updated**:
- docs/INDEX.md (new arkd capability bullet for the bulk sweeper-restore path + `WatchScripts`/`UnwatchScripts` chunking; added `sweeper`, `startup-performance` tags)
- docs/projects/arkd/INDEX.md (sync commit + date, version bump)
- docs/projects/arkd/system/repo_manager.md (added the bulk `GetVtxoPubKeysByCommitmentTxids` method to the VtxoRepository section, with backend-specific notes; called out the new `20260527150000_vtxo_commitment_txid_index` migration in the PostgreSQL implementation notes)
- docs/projects/arkd/system/application_core.md (new "Startup / Shutdown Watch Restore" sub-section under Sweeper Service documenting the bulk lookup, hex validation, and the chunked `WatchScripts`/`UnwatchScripts` path)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

**Note**: Performance / scalability fix on the sweeper boot path. The new domain method is additive (the per-txid `GetVtxoPubKeysByCommitmentTxid` is still on the interface), so external implementors of `VtxoRepository` must add `GetVtxoPubKeysByCommitmentTxids` to compile against the new interface — this is the only API-shape change in this sync. No proto / gRPC / config surface changed. The migration is forward-only safe (additive index).

---

## 2026-05-27 - Documentation Update
**Commit**: `c4f16324` (arkd repository)
**Previous Sync**: `299b7ad6`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 commits
- `c4f16324` Add tx filters to indexer.GetSubscription (#1074)
- `4473e23c` client-lib: Fix indexer auto-pagination and chunk large vtxo filters (#1081)

**Features Added (indexer subscriptions, CEL tx filters)**:
- New internal package `internal/interface/grpc/handlers/txfilter/` providing CEL (Common Expression Language) based filters that the indexer evaluates against each parsed tx to decide whether a subscription receives an event. A `Filter` is a compiled CEL program that must return `bool`. The CEL environment exposes a single variable `tx` of type `txfilter.Tx`, whose `tx.extension` field is a `map<int, string>` of ARK OP_RETURN extension packet types to hex-encoded payloads (only set when the tx carries an ARK OP_RETURN extension; `has(tx.extension)` is the presence guard). A `hasPacket(extension, packetType) -> bool` helper is provided in addition to the CEL standard library. `event.Tx` is parsed as PSBT base64 with hex fallback. Includes `README.md` and table-driven tests with testdata fixtures.
- `indexer.GetSubscription` / `UpdateSubscription` now accept CEL tx filter expressions. At runtime a tx event is dispatched to a subscription when **any** of its CEL expressions evaluates `true`, **or** when the event carries a VTXO whose script is in the subscription's script set. CEL evaluation is cost-limited per call, tx filters are capped per listener, and a listener is kept alive on disconnect when only tx filters are set. `UnsubscribeForScripts` with an empty scripts list now only tears down the listener when no tx filters remain, so tx-only subscriptions are not silently dropped. `UnsubscribeForScripts` not-found now maps to gRPC `NotFound`.

**Breaking Changes (indexer proto API — `api-spec/protobuf/ark/v1/indexer.proto`)**:
- ⚠️ `SubscriptionFilter` was **flattened and redesigned**. The previous `oneof filter { ScriptsFilter scripts }` (with nested `ScriptsFilter`/`ModifyScripts`/`OverwriteScripts` and mutually-exclusive `modify`/`overwrite`) is **removed**. It is replaced by two independent, combinable fields: `repeated string expressions` (CEL, OR-combined) and `ScriptFilter scripts` (new message with `repeated string add` / `repeated string remove`).
- ⚠️ `UpdateSubscriptionResponse` is now **empty** — the `oneof result { ScriptsFilterResult scripts }` and the `ScriptsFilterResult` message (`added`/`removed`/`all`) were removed (no result echo).
- `UpdateSubscription` semantics: `subscription_id` must be non-empty and `filter` present (else `InvalidArgument`). `expressions` is always overwritten as a whole (empty list clears them), deduplicated, and bounded by a per-subscription cap. `scripts` unset = untouched; set with both lists empty = clear all; `add`/`remove` combinable with `remove` taking precedence on overlap; operations are idempotent. Validation is atomic (all inputs validated before any mutation), so `InvalidArgument` guarantees the subscription is unchanged. On initial `GetSubscription` creation, `scripts.remove` and the clear-all behavior are no-ops.
- These regenerated `api-spec/protobuf/gen/...` Go bindings and `api-spec/openapi/swagger/.../indexer.openapi.json` accordingly. The redesigned subscription API was only just introduced (PR #951, 2026-05-22) and remains pre-stable.

**Bug Fixes (client-lib, `pkg/client-lib/indexer/grpc`)**:
- Fixed indexer auto-pagination in `paginatedFetch`: page index now starts at `1` (was `0`) and the loop termination check uses `page.GetCurrent() >= page.GetTotal()` (was `page.GetNext() >= page.GetTotal()`), so paginated indexer queries no longer stop short / off-by-one.
- `paginatedGetVtxos` now chunks large `Scripts` and `Outpoints` filter lists into `maxPageSize`-sized batches (fetched and concatenated) to avoid oversized requests; added `formatOutpoints` helper.

**Files Updated**:
- docs/INDEX.md (added CEL-based indexer subscription filter capability to the arkd entry; added `indexer`, `subscription` tags)
- docs/projects/arkd/INDEX.md (sync commit + date, version bump)
- docs/projects/arkd/system/application_core.md (rewrote Indexer subscription methods to reflect flattened `SubscriptionFilter`, CEL `expressions` + `ScriptFilter` add/remove, combinable filters, atomicity/error semantics, and the `txfilter` package)
- docs/projects/arkd/system/project_overview.md (new "CEL-Based Indexer Subscription Filters" recent-feature entry)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

**Note**: The `SubscriptionFilter` / `UpdateSubscription` proto reshaping is a **breaking change** to the indexer streaming API, but it revises an API surface that landed only days earlier (#951) and is still pre-stable. The CEL tx-filter capability is additive. The client-lib pagination changes are internal bug fixes with no API-surface impact.

---

## 2026-05-23 - Documentation Update
**Commit**: `299b7ad6` (arkd repository)
**Previous Sync**: `700026fe`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 commits
- `299b7ad6` client-lib: Add `WithTxOutsTaprootTree` SendOption (#1068)
- `f2fa2963` Connection pooling for gateway stream connections (#1073)

**Features Added (client-lib SDK, `pkg/client-lib`)**:
- New `WithTxOutsTaprootTree(tapTrees map[string][]byte) SendOption` in `pkg/client-lib/send_opts.go`. Callers pass BIP-371-encoded tap tree bytes (produced via `txutils.TapTree(scripts).Encode()`) keyed by the hex-encoded `pkScript` of each ark-tx output. The option validates input up front: empty map / empty value returns `missing taproot trees` / `receiver tap tree must not be empty`, and each value is round-tripped through `txutils.DecodeTapTree` before being defensively copied into `sendOptions.outputsTapTree`. The new private helper `applyOutputTapTrees` in `send.go` writes each matching tree into `ptx.Outputs[i].TaprootTapTree` after the ark PSBT is built, and **returns an error if any pkScript key fails to match an output** — this is deliberate to avoid the silent footgun of a PSBT going out without the tap tree on the wire in a VTXO-spending path. Test coverage in `send_opts_test.go` expanded by ~243 lines (validation, copy-on-write isolation, decode failures, mismatch behavior).

**Features Added (gRPC gateway, server-side scalability)**:
- New connection pooling for gateway streaming RPCs in `internal/interface/grpc/service.go`. `service.streamConn *grpc.ClientConn` is replaced by `streamConns []*grpc.ClientConn`; `newServer` now allocates a pool of `StreamConnPoolSize` connections to the gateway address (cleaning up partials on failure) and `stop()` closes all of them. Each pooled connection carries an independent HTTP/2 `MAX_CONCURRENT_STREAMS` budget, so a pool of N multiplies the effective concurrent-stream capacity by N.
- `splitConn` (the meshapi gateway's `grpc.ClientConnInterface` adapter) now holds `streamPool []grpc.ClientConnInterface` and a `streamIndex atomic.Uint64`; `NewStream` atomically increments and wraps `streamIndex % len(streamPool)` to round-robin streams across the pool. `Invoke` continues to use the dedicated unary connection unchanged.
- Startup log line added: `stream connection pool size: N`.
- Test coverage in `internal/interface/grpc/service_test.go` expanded by ~131 lines covering the new pool init / shutdown / round-robin paths.

**Configuration Changes**:
- New env var `ARKD_STREAM_CONN_POOL_SIZE` (`internal/config/config.go`, `internal/interface/grpc/config.go`, `cmd/arkd/main.go`). Default `4`, hard-capped to `[1, 64]` at load time (`min(maxStreamConnPoolSize, max(1, viper.GetUint32(...)))`) to prevent misconfiguration. A value of `1` preserves the previous single-connection behavior.

**Files Updated**:
- docs/INDEX.md (added `WithTxOutsTaprootTree` SendOption and `ARKD_STREAM_CONN_POOL_SIZE` pooling capability to the arkd entry)
- docs/projects/arkd/INDEX.md (sync commit + date)
- docs/projects/arkd/system/configuration.md (new "gRPC Gateway / Streaming" section documenting `ARKD_MAX_CONCURRENT_STREAMS` and `ARKD_STREAM_CONN_POOL_SIZE` with the multiplicative-capacity rationale)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

**Note**: Both changes are additive and non-breaking. The pool size defaults to `4`, so existing deployments will see a 4× lift in effective concurrent-stream capacity on the gateway after upgrade without any config change; set `ARKD_STREAM_CONN_POOL_SIZE=1` to restore prior behavior. `WithTxOutsTaprootTree` is purely opt-in on the client-lib call site. No tag / dependency / API-surface entries in master INDEX changed.

---

## 2026-05-22 - Documentation Update
**Commit**: `700026fe` (arkd repository)
**Previous Sync**: `2c9612a0`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 3 commits
- `700026fe` Non-breaking single-connection GetSubscription rpc (#951)
- `2336e19e` client-lib: Fix explorer polling fallback panic when poll interval is unset (#1076)
- `a6f1b71f` Upgrade `nbxplorer` to 2.6.7 (#1077)

**Features Added (Indexer gRPC API, additive & non-breaking)**:
- New single-connection `GetSubscription` flow in `internal/interface/grpc/handlers/indexer.go`: when `subscription_id` is empty the server creates the subscription inline (UUID), optionally applies an initial `SubscriptionFilter`, and emits a `SubscriptionStartedEvent` carrying the generated id as the first stream message. When `subscription_id` is set, the previous attach-to-existing-listener behavior is preserved (now returns `codes.NotFound` instead of silently allowing on missing listener).
- New `UpdateSubscription` RPC for atomic, in-place subscription mutation. Generic `SubscriptionFilter` is mutually exclusive between filter types (currently only `ScriptsFilter`, with future packet-type filters planned). `ScriptsFilter` supports two modes:
  - `Modify { add_scripts, remove_scripts }` — incremental add/remove
  - `Overwrite { scripts }` — full replacement
  Returns `ScriptsFilterResult { added, removed, all }`. All scripts are parsed/validated up-front so partial mutations are not possible on invalid input.
- New proto messages in `api-spec/protobuf/ark/v1/indexer.proto`: `SubscriptionStartedEvent`, `SubscriptionFilter`, `ScriptsFilter`, `ModifyScripts`, `OverwriteScripts`, `UpdateSubscriptionRequest`, `UpdateSubscriptionResponse`, `ScriptsFilterResult`; `GetSubscriptionRequest` gains an optional `SubscriptionFilter filter` field; `GetSubscriptionResponse` gains a `SubscriptionStartedEvent subscription_started` oneof variant.
- New REST bindings: `GET /v1/indexer/subscription` (single-connection server-sent stream, alongside the existing `/v1/indexer/script/subscription/{subscription_id}`) and `POST /v1/indexer/subscription/update`.
- New macaroon permission entry in `internal/interface/grpc/permissions/permissions.go`: `IndexerService/UpdateSubscription` requires `indexer:write`.
- Indexer handler test suite expanded by ~968 lines (`internal/interface/grpc/handlers/indexer_test.go`) covering single-connection start, filter validation, atomic modify/overwrite semantics, error mapping, and listener cleanup.

**Bug Fixes (client-lib SDK, `pkg/client-lib`)**:
- `mempool.NewExplorer` (`pkg/client-lib/explorer/mempool/explorer.go`): polling fallback path no longer panics when `pollInterval` is unset — constructor now seeds `defaultPollInterval = 10 * time.Second` and validates `pollInterval > 0`, returning an error instead.
- Default explorer URLs updated to Arkade-operated mempool mirrors:
  - Bitcoin: `https://mempool.space/api` → `https://mempool.arkade.sh/api`
  - Signet:  `https://mempool.space/signet/api` → `https://mempool.signet.arkade.sh/api`
  - MutinyNet: `https://mutinynet.com/api` → `https://mempool.mutinynet.arkade.sh/api`
  - Testnet and Regtest defaults unchanged.

**Dependency Bumps**:
- `docker-compose.regtest.yml`: `nicolasdorier/nbxplorer:2.5.30` → `2.6.7`.

**Files Updated**:
- docs/projects/arkd/INDEX.md (sync commit + date)
- docs/projects/arkd/system/application_core.md (Indexer Service: documented `GetSubscription` single-connection flow, `UpdateSubscription` RPC, and existing `SubscribeForScripts`/`UnsubscribeForScripts` — previously this section listed only query methods)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

**Note**: Master `docs/INDEX.md` arkd entry already lists gRPC/REST API interfaces at a high level; the new RPC + flow is additive and non-breaking, no capability/tag/dependency change at master-INDEX granularity (consistent with how prior similarly-scoped syncs like 2026-05-20/2026-05-09 were handled). `tech_stack.md` mentions NBXplorer generically without a pinned version, so the 2.6.7 image bump needs no doc edit there.

---

## 2026-05-20 - Documentation Update
**Commit**: `2c9612a0` (arkd repository)
**Previous Sync**: `f8aefab4`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit
- `2c9612a0` Bump golang@1.26.3 (#1070)

**Go Version**:
- Updated from Go 1.26.2 to Go 1.26.3 (build toolchain only; patch-level update).
- Touched `go.mod` files across the repo: root, `api-spec`, `pkg/ark-cli`, `pkg/ark-lib`, `pkg/arkd-wallet`, `pkg/client-lib`, `pkg/errors`, `pkg/kvdb`, `pkg/macaroons`.
- CI workflows bumped to `go-version: 1.26.3`: `.github/workflows/{artifacts,integration,release,unit}.yaml`.
- Builder images bumped to `golang:1.26.3`: `Dockerfile`, `arkdwallet.Dockerfile`, `arkdwallet.btcwallet.Dockerfile`.

**Files Updated**:
- docs/projects/arkd/INDEX.md (sync commit + date)
- docs/projects/arkd/system/tech_stack.md (Go version: 1.24.6+ → 1.26.3+, two references)
- docs/projects/arkd/system/project_overview.md (Go version: 1.25.7+ → 1.26.3+)
- docs/projects/arkd/sop/development-workflow.md (Go prerequisite: 1.24.6 → 1.26.3)
- docs/projects/arkd/testing/how_to_run.md (Go prerequisite: 1.24.6 → 1.26.3)
- docs/projects/arkd/testing/arkd-environment-and-testing-guide.md (Go prerequisite: 1.25.7 → 1.26.3)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

**Note**: Build-toolchain bump only — no API, capability, dependency, or configuration changes. Master `docs/INDEX.md` does not track Go version for arkd, so no update there. Also aligned previously-inconsistent Go version references across the docs to the new value.

---

## 2026-05-12 - Documentation Update
**Commit**: `f8aefab4` (arkd repository)
**Previous Sync**: `42f58837`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 commits
- `f8aefab4` ci: Remove empty codeql workflow file (#1054)
- `89d93031` Client-lib: renaming of packages and components (#1064)

**Breaking Changes (client-lib SDK, `pkg/client-lib`)**:
- Top-level Go package renamed from `arksdk` to `wallet` (all files in `pkg/client-lib/` now declare `package wallet`).
- `ArkClient` interface renamed to `Wallet`; the entrypoint file moved from `pkg/client-lib/ark_sdk.go` to `pkg/client-lib/wallet.go`. The `Wallet()` accessor on the old interface is now `Identity() identity.Identity`.
- Sub-package `pkg/client-lib/wallet/` renamed to `pkg/client-lib/identity/`:
  - `wallet.WalletService` interface → `identity.Identity`
  - Constant `wallet.SingleKeyWallet` → `identity.SingleKeyIdentity`
  - `pkg/client-lib/wallet/singlekey/wallet.go` → `pkg/client-lib/identity/singlekey/identity.go`
  - `pkg/client-lib/wallet/singlekey/store/{store.go,inmemory/store.go,file/store.go}` → `pkg/client-lib/identity/singlekey/store/...`
- `ServiceOption` rename: `WithWallet(wallet.WalletService)` → `WithIdentity(identity.Identity)` (in `pkg/client-lib/service_opts.go`).
- Internal `service` struct field `c.wallet` renamed to `c.identity`; all call sites in `service.go`, `funding.go`, `send.go`, `batch_session.go`, `unroll.go`, `init.go`, `utils.go`, `asset.go`, `batch_session_handler.go`, `funding_opts*.go`, `send_opts*.go`, `receiver_opts*.go`, `types.go`, `vtxos_opts.go` updated accordingly.
- E2E test suite (`internal/test/e2e/*.go`) and example apps (`pkg/client-lib/example/alice_to_bob`, `pkg/client-lib/example/multi_connection_demo`) and `pkg/ark-cli/main.go` updated to import `identity` and call `WithIdentity` / `Identity()`.

**CI**:
- Removed empty `.github/workflows/codeql.yml` workflow file (single-line cleanup, no behavioural change).

**Files Updated**:
- docs/INDEX.md (arkd entry: `WithWallet` → `WithIdentity`, clarified `Wallet`/`Identity` SDK shape)
- docs/projects/arkd/INDEX.md (sync commit + date)
- docs/projects/arkd/system/folder_structure.md (client-lib section: package rename, `ArkClient` → `Wallet`, `wallet/` → `identity/`)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

**Note**: Pure rename/refactor of the embedded client SDK. No new capabilities, no protocol/gRPC/REST/admin surface changes, no env-var / configuration / build-test workflow changes — `testing/`, `sop/`, and other `system/` docs need no updates. Internal arkd uses of `ports.WalletService` (in `internal/core/ports/`) are unrelated to this client-lib rename and remain untouched.

---

## 2026-05-09 - Documentation Update
**Commit**: `42f58837` (arkd repository)
**Previous Sync**: `2999d666`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 commit
- `42f58837` Hotfix: prevent failure on SubmitTx to affect finalization of pending tx (#1063)

**Bug Fixes**:
- `service.SubmitOffchainTx` (`internal/core/application/service.go`): the `defer` that emits a `Fail` event and persists changes via `repoManager.Events().Save(...)` is now registered **after** the initial `OffchainTxRequested` event is appended to `changes`, instead of at function entry. Previously, an error during input validation / `offchain.NewTransaction(...)` could fire the deferred handler and persist a `Fail` event for an offchain-tx aggregate that had no preceding `Requested` event, corrupting the event stream and blocking finalization of subsequent pending txs sharing the same txid space.
- e2e test (`internal/test/e2e/e2e_test.go`) extended to cover the SubmitTx-failure-during-pending-finalization scenario.

**Files Updated**:
- docs/projects/arkd/INDEX.md (version 1.3.2 → 1.3.3, sync commit + date)
- docs/projects/arkd/change-log/last-sync.txt
- docs/projects/arkd/change-log/SYNC_HISTORY.md

**Note**: Pure internal bug fix. No changes to capabilities, tags, triggers, dependencies, configuration, env vars, gRPC/REST API surface, build/test workflow, or architecture — `docs/INDEX.md` and the `system/`, `testing/`, `sop/` doc files require no updates.

---

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
