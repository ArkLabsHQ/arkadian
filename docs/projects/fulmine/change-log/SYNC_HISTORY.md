# Documentation Sync History - Fulmine

## 2025-12-02 12:00:00 - Documentation Update
**Commit**: `98632b68` (fulmine repository)
**Previous Sync**: `(none - initial sync)`
**Synced By**: /update-project command
**Status**: Completed

**Commits Analyzed**: 27 commits (last 60 days)

**Features Added**:
- pprof profiling endpoint support (`FULMINE_ENABLE_PPROF`)
- Periodic database refresh option (`FULMINE_ENABLE_PERIODIC_REFRESH`)
- Resume scheduled unilateral refunds at wallet unlock

**Bug Fixes**:
- Fixed boarding UTXO expiry handling
- Fixed VTXO proto mapping
- Fixed SendOffchain endpoint (VTXO sorting)
- Fixed submarine swap flow
- Fixed compute next expiry & settlement
- Fixed swap storage and migration in SQLite
- Fixed reverse swap amount persistence
- Fixed sdk.Receive usage
- Fixed sentry enabled log
- Fixed lnurl config with predefined port
- Refactored vHTLC handling and database schema

**Dependency Updates**:
- Multiple go-sdk version bumps
- ark-lib updates in pkg/vhtlc
- gRPC package updates with proper health handler implementation

**Files Updated**:
- docs/projects/fulmine/INDEX.md (added sync metadata)
- docs/projects/fulmine/system/configuration.md (new env vars)
- docs/projects/fulmine/change-log/last-sync.txt
- docs/projects/fulmine/change-log/SYNC_HISTORY.md

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
- Use `arkadian-refresh-docs fulmine` to update after new commits
