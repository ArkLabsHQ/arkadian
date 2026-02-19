# Documentation Sync History - Ark Docs

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
- Use `/update-project ark-docs` to update after new commits

## 2026-02-19 - Full Documentation Sync
**Commit**: `a46ca41bf5934dcb0f318dcf70cfa51f77824e79`
**Previous Sync**: (none - initial baseline had no commit)
**Synced By**: /update-project command
**Status**: Completed

**Commits Analyzed**: 146 total commits (full repo history)

**Structural Changes**:
- NEW: `experimental/` directory (Arkade language reference moved from contracts/)
- NEW: `arkd/components/arkade-psbt.mdx` (Arkade-specific PSBT format)
- NEW: `arkd/components/scheduled-session.mdx` (Scheduled session mechanism)
- NEW: `contracts/spilman-channels.mdx` (Spilman payment channels)
- NEW: `wallets/v0.3/` directory (versioned wallet docs for SDK v0.3)
- NEW: `wallets/v0.3/vtxo-management.mdx`, `storage-adapters.mdx`, `service-worker.mdx`, `expo-react-native.mdx`
- NEW: `primer.mdx`, `roadmap.mdx`, `index.mdx` (top-level docs)
- MOVED: 9 files from `contracts/` to `experimental/` (arkade-script, syntax, types, functions, compiler, AMMs, non-interactive-swaps, prediction-market, synthetic-assets)
- REMOVED: `contracts/channels.mdx` (replaced by spilman-channels.mdx)
- REMOVED: `learn/faq/how-do-i-get-started-with-arkade.mdx`
- REMOVED: `learn/unused-content/intents.mdx`
- REMOVED: Old unversioned `wallets/*.mdx` files (replaced by wallets/v0.3/)

**Files Updated**:
- docs/projects/ark-docs/INDEX.md (updated directory structure and file listings)
- docs/INDEX.md (updated ark-docs capabilities)
- docs/projects/ark-docs/change-log/last-sync.txt
- docs/projects/ark-docs/change-log/SYNC_HISTORY.md
- 21 files removed, 29 files added, 57 files unchanged
