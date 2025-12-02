# Documentation Sync History - Wallet

## 2025-12-02 12:00:00 - Documentation Update
**Commit**: `a1c45ff0` (wallet repository)
**Previous Sync**: `(none - initial sync)`
**Synced By**: /update-project command
**Status**: Completed

**Commits Analyzed**: 41 commits (last 60 days)

**Features Added**:
- LendaSat integration - Bitcoin lending/borrowing with on-chain and Arkade collateral
- Soft settle - optimized settlement with database caching
- VTXO Manager - advanced VTXO lifecycle management
- New QR scanner implementation
- Subdust coin display
- Server key mismatch error display
- Alerts system restoration

**Bug Fixes**:
- Fixed send details display
- Fixed flickering UI (div/p nesting)
- Fixed icon colors to reflect theme
- Fixed wallet balance in fiat
- Fixed wallet restore balance
- Fixed navigation between tabs
- Fixed Boltz URL configuration
- Fixed VTXO reload after settle in coin control
- Fixed Mutinynet API URL
- Fixed objects in logs

**Security Improvements**:
- Added `sendDefaultPii: false` to Sentry configuration
- Conditional Sentry initialization (production only)

**Dependency Updates**:
- SDK bumped to 0.3.0
- Multiple dependency updates

**Files Updated**:
- docs/projects/wallet/INDEX.md (added sync metadata, new features, new env vars)
- docs/projects/wallet/change-log/last-sync.txt
- docs/projects/wallet/change-log/SYNC_HISTORY.md

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
- Use `arkadian-refresh-docs wallet` to update after new commits
