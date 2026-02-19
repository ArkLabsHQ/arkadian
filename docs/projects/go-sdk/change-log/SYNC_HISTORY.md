# Documentation Sync History - Go SDK

## 2026-02-19 - Documentation Update
**Commit**: `3cc35f9c` (go-sdk repository)
**Previous Sync**: `3fea8eb1`
**Synced By**: /update-project command
**Status**: Completed

**Commits Analyzed**: 23 commits

**Features Added**:
- Intent fee estimation (`EstimateIntentFee` API) with automatic fee handling in coin selection
- `FinalizePendingTxs` method and auto-finalization of pending transactions
- `UpdateStreamTopics` RPC support for client-managed event stream subscriptions
- Expiry threshold option for `Settle` and `CollaborativeExit` (`WithExpiryThreshold`)
- `OptOutExpirySorting` option for coin selection
- Heartbeat event handling in `GetEventStream`
- Context parameter added to `OnStreamStarted` handler
- WebSocket reconnection logic for event tracking

**Breaking Changes**:
- REST TransportClient implementation REMOVED (#92) - gRPC is now the only supported transport
- `tx.Settled` field deprecated (#78)

**Bug Fixes**:
- Fixed refresh DB logic (#80)
- Fixed check for spent vtxos in vtxosToTxs (#79)
- Fixed tx history: show collaborative exits properly (#77)
- Fixed balance API hotfix
- Fixed gRPC client opts with grpc-go v1.77.0 bump (#72)

**Go Version**:
- Updated from Go 1.25.3 to Go 1.25.7

**Files Updated**:
- docs/INDEX.md (capabilities, tags)
- docs/projects/go-sdk/INDEX.md (version bump, sync commit)
- docs/projects/go-sdk/system/project_overview.md (REST removal, new features)
- docs/projects/go-sdk/system/architecture.md (gRPC-only transport, new APIs)
- docs/projects/go-sdk/system/api-reference.md (new methods, options, deprecations)
- docs/projects/go-sdk/change-log/last-sync.txt
- docs/projects/go-sdk/change-log/SYNC_HISTORY.md

---

## 2025-12-02 12:00:00 - Documentation Update
**Commit**: `3fea8eb1` (go-sdk repository)
**Previous Sync**: `(none - initial sync)`
**Synced By**: /update-project command
**Status**: Completed

**Commits Analyzed**: 36 commits (last 60 days)

**Features Added**:
- `ListSpendableVtxos()` - More efficient method to list only spendable VTXOs
- Collaborative exit output fee support
- Periodic database refresh option
- Offchain transaction signature validation
- Multiple DB event listeners support
- New addresses APIs
- Synced update and refactored explorer
- Intent signing with collaborative path

**Bug Fixes**:
- Fixed receiver amount to include fees
- Fixed send-all collaborative exit
- Fixed gRPC reconnection logic
- Fixed explorer WebSocket address subscription
- Fixed empty listeners handling
- Fixed subdust handling
- Fixed ark PSBT field encoding

**Breaking Changes**:
- Proto renamings (may require client updates)
- Revert history API changes

**Dependency Updates**:
- Bumped ark-lib@v0.8.0
- Go version upgraded to v1.25.3
- Multiple arkd protocol updates

**Files Updated**:
- docs/projects/go-sdk/INDEX.md (added sync metadata)
- docs/projects/go-sdk/system/api-reference.md (ListSpendableVtxos)
- docs/projects/go-sdk/change-log/last-sync.txt
- docs/projects/go-sdk/change-log/SYNC_HISTORY.md

---

## 2025-10-16 12:00:00 - Initial Metadata Setup
**Commit**: ``
**Synced By**: Manual setup
**Status**: Baseline established

**Changes**:
- Added sync metadata to INDEX.md
- Created SYNC_HISTORY.md structure
- Established documentation freshness tracking system

**Notes**:
- This is the initial sync point
- Future syncs will track commits since this baseline
- Use `arkadian-refresh-docs go-sdk` to update after new commits
