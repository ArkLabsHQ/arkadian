# Documentation Sync History - Go SDK

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
