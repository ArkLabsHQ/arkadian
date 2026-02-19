# Documentation Sync History - Wallet

## 2026-02-19 - Full Documentation Sync
**Commit**: `556735acb0fbdff1a4b382089850cb8a096e3005`
**Previous Sync**: `a1c45ff0ac7230ca1f39cc365edd82fc9e44c7c7`
**Synced By**: /update-project command
**Status**: Completed

**Commits Analyzed**: 95 commits

**Features Added**:
- Announcements system — in-app notification banners with AnnouncementsProvider
- Lendaswap integration — new app screen for Lendaswap service
- Chatwoot integration — live customer support chat widget + Support settings page
- Nostr backups — encrypted chunked wallet backup to Nostr relays
- E2E testing with Playwright — full test suite (init, backup, restore, send, receive, swap, keyboard, nostr, pwa)
- URL hash deep-linking for wallet actions
- JS/JIT capability detection with informative error screens for restricted environments
- Keyboard navigation via Focusable component
- Fees provider for on-chain and collaborative exit fee estimation
- Currency toggle (CHF added) with fiat/sats toggle on amount inputs
- Modal component for reusable modal dialogs
- Swap restoration from Boltz endpoint
- Blurred modal backgrounds
- Improved onboard images (simplified SVGs)
- Log management with configurable size limits
- Indexer API client (src/lib/indexer.ts)
- MIT License added
- Nak Dockerfile for Nostr relay (E2E testing)
- Component tests for settings screens and wallet send
- Unit tests for utxo, jsCapabilities, fiat

**Features Modified**:
- SwapManager refactoring — major swap system rewrite using SwapManager pattern
- Fees system — collaborative exit with fees, dedicated FeesProvider
- Lightning provider — major refactoring of providers/lightning.tsx
- Keyboard component — currency toggle, decimal validation
- Backup system — refactored from nsec to chunked Nostr backup
- VTXO management — expiry threshold fixes, coin control improvements
- Scanner component — significant rewrite
- Navigation provider — browser back button handling
- Wallet provider — settlement and fee handling changes
- Send form — major rewrite with fiat/sats toggle
- Receive amount — fiat toggle support

**Features Removed**:
- src/lib/alerts.ts (removed)
- src/lib/lightning.ts (moved to providers/lightning.tsx)
- src/screens/Settings/Nostr.tsx (replaced by Backup.tsx)
- scripts/setupRegtestEnv.sh (removed)
- Some apps removed (PR #206)

**Dependency Updates**:
- @arkade-os/sdk: 0.3.1-alpha.4 → 0.3.12
- @arkade-os/boltz-swap: 0.2.1-alpha.4 → 0.2.19
- pnpm: → 10.25.0
- Playwright: added (new dependency)
- vitest: 3.2.4

**Files Updated**:
- docs/INDEX.md (wallet capabilities, tags, triggers, dependencies)
- docs/projects/wallet/INDEX.md (version, providers, features, testing)
- docs/projects/wallet/system/project_overview.md (new features, dependencies, use cases)
- docs/projects/wallet/system/architecture.md (providers list, testing architecture)
- docs/projects/wallet/system/components.md (directory structure, screens, providers, libs)
- docs/projects/wallet/testing/how_to_test.md (E2E tests, Playwright, test structure)
- docs/projects/wallet/testing/how_to_run.md (pnpm version, E2E environment)
- docs/projects/wallet/testing/usage.md (Nostr backup, settings updates)
- docs/projects/wallet/sop/development-workflow.md (E2E test workflow)
- docs/projects/wallet/change-log/last-sync.txt
- docs/projects/wallet/change-log/SYNC_HISTORY.md

---

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
