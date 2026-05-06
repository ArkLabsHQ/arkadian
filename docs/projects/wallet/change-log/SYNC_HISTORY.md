# Documentation Sync History - Wallet

## 2026-05-06 - Documentation Sync
**Commit**: `7192bdf948d7922dc244abaf928d5496743fd367`
**Previous Sync**: `047419382c723629a1eb89c674d5b7349fd55d81`
**Synced By**: /update-project skill
**Status**: Completed (tracking-only — no doc content changes)

**Commits Analyzed**: 2 non-merge commits

**Bug Fixes**:
- Fix layout issues (PR #601) — `src/index.css` only (3 lines)
- Fix fiat amount precision (PR #602) — `prettyFiatAmount` in `src/lib/format.ts` now pads to each currency's `fiatDecimalsFor()` minor units, so USD/EUR show two decimals while JPY remains zero-decimal; `src/test/lib/format.test.ts` extended with whole-and-fractional regression coverage for every supported fiat

**Features Added/Modified/Removed**: None
**Dependency Updates**: None
**Configuration Changes**: None

**Rationale for no doc updates**: Both commits are user-visible bug fixes that do not change any documented capability, tag, dependency, env var, API surface, build/test workflow, or architecture. The master `docs/INDEX.md` "Fiat currency symbol-prefix display" capability line and the project-level `system/` docs all remain accurate.

**Files Updated**:
- docs/projects/wallet/INDEX.md (frontmatter `last_sync_commit` only)
- docs/projects/wallet/change-log/last-sync.txt
- docs/projects/wallet/change-log/SYNC_HISTORY.md

---

## 2026-05-01 - Documentation Sync
**Commit**: `047419382c723629a1eb89c674d5b7349fd55d81`
**Previous Sync**: `c0c70aafdcd1cfa04d5d515773862fe9bef26378`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 13 non-merge commits

**Features Added**:
- Boltz bulk recovery — new "Recover funds" section in `Apps → Boltz → Settings` (PR #581) using `arkadeSwaps.scanRecoverableSubmarineSwaps()` and `recoverSubmarineFunds()`; categorises swaps as `recoverable` / `pre_cltv` / `invalid_swap`, shows per-row buttons with deferred-locktime guidance, and refreshes the scan after a successful sweep
- Lightning invoice limit validation in Send form (PR #567) — invoice amount checked against `minSwapAllowed()` / `maxSwapAllowed()` from `LimitsContext`; rejects below-min / above-max with explicit sats error; guards against unloaded zero limits
- Virtualized swaps list — `SwapsList` uses `@tanstack/react-virtual` `useVirtualizer` for performant scrolling (PR #585)

**Features Modified**:
- Crash fix on swap detail for restored chain swaps (PR #575) — added regression test `boltz-swap.test.tsx`
- UI polish: header height, transaction list resize, fancy button (PR #586); transactions list "history" label removed; lighter dividers (dark10), no border on first row, leading asset icon, regular weight asset text, "haptic feedback" typo fix
- E2E swap test fix (PR #576) and added invoice-validation test (PR #567)

**Features Removed**:
- `bun.lock` removed (PR #583) — pnpm-only

**Dependency Updates**:
- @arkade-os/sdk: 0.4.21 → 0.4.22
- @arkade-os/boltz-swap: 0.3.22 → 0.3.24 (adds `scanRecoverableSubmarineSwaps`, `recoverSubmarineFunds`, `BoltzSubmarineSwap`, `SubmarineRecoveryInfo` types)

**Regtest / Infra**:
- `.env.regtest` bumped to `arkd:v0.9.4` and `fulmine:v0.3.21` (PR #572)
- `regtest` submodule pointer updated (PRs #583, #587)

**Files Updated**:
- docs/INDEX.md (wallet capabilities, dependency versions)
- docs/projects/wallet/INDEX.md (version, last_sync_commit, sdk/boltz-swap versions, capabilities)
- docs/projects/wallet/system/project_overview.md (bulk recovery, invoice validation, sdk/boltz-swap versions)
- docs/projects/wallet/system/tech-stack.md (sdk/boltz-swap versions, @tanstack/react-virtual)
- docs/projects/wallet/system/components.md (bulk recovery section in Boltz Settings, SwapsList virtualization)
- docs/projects/wallet/change-log/last-sync.txt
- docs/projects/wallet/change-log/SYNC_HISTORY.md

---

## 2026-04-29 - Documentation Sync
**Commit**: `c0c70aafdcd1cfa04d5d515773862fe9bef26378`
**Previous Sync**: `7e24d4d244264675545eba31d70bcf345b224351`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 46 non-merge commits

**Features Added**:
- LNURL receive support — amountless Lightning receives via `useLnurlSession` hook + lnurl-server SSE bridge (PR #482)
- Receive v2 — redesigned receive flow with styled QR, tap-to-copy QR, share button, safe-area padding (PRs #512, #533, #528, #552)
- Send form redesign — pill Paste/Scan QR buttons, Max-tap confirmation modal, animated Scanner/Keyboard overlays, prefers-reduced-motion support (PR #485)
- Pill navbar overlay restricted to root pages (Wallet/Apps/Settings) with Framer Motion spring animation (PR #474)
- Fiat amount currency-symbol prefix — `$100.00`, `€50.00`, `¥1,000`; CHF/CNY keep trailing-code form (PR #535)
- Bootstrap status easter egg (PR #500)
- Multi-arch Docker build for amd64 + arm64 in `docker-publish.yml` (PR #516)
- arkade-regtest submodule replaces custom test infrastructure (PR #492); new `regtest:start/stop/clean` scripts and `nak.Dockerfile`/`docker-compose.nak.yml` for the Nostr relay
- Git commit added to Chatwoot custom attributes (PR #563)
- New e2e tests: `lnurl.test.ts`, expanded asset/delegate/receive/send/swap tests (PRs #564, #548)
- New Toast component (`components/Toast.tsx`) replacing previous `lib/toast.ts`
- ErrorBoundary component refactor

**Features Modified**:
- Receive QR code reliability fix — hardcoded dark-on-white colors for scanner reliability (PR #527)
- Receive amount fiat value fix (PR #508)
- VTXO double-funding check now queries indexer directly (PR #524)
- VTXO lookback window aligned with SW timeout for swaps (PR #523)
- 60s timeout for SETTLE/SEND messages (PR #522)
- Asset burn max fix; error update on asset change; reload page uses app components (PRs #507, #506, #503)
- Tx history rows top-aligned when assets are present; max 2 coins on right side (PRs #537, #550)
- Logs CSV export now reverse-ordered (PR #546)
- Prevent swap-after-receival flow (PR #547)
- Delegate card now shows address, pubkey, and fee (PR #515)
- Sentry errors affecting clients fixed (PR #496)

**Features Removed**:
- `@ionic/react` and `@ionic/normalize` dependencies removed; replaced by in-tree custom components (PR #534)
- `ion-button`, `ion-refresher` removed
- `src/lib/toast.ts` removed (logic moved into `components/Toast.tsx`)
- `src/components/Clipboard.tsx` reduced

**Dependency Updates**:
- @arkade-os/sdk: 0.4.14 → 0.4.21
- @arkade-os/boltz-swap: 0.3.13 → 0.3.22
- Added: react-spring-bottom-sheet ^3.4.1
- Removed: @ionic/react

**Files Updated**:
- docs/INDEX.md (description, capabilities, tags, triggers)
- docs/projects/wallet/INDEX.md (version 1.2.0, last_sync_commit, tech stack, testing)
- docs/projects/wallet/system/project_overview.md (UI/UX refresh, LNURL, dependencies)
- docs/projects/wallet/system/tech-stack.md (SDK/boltz versions, Ionic removal, react-spring-bottom-sheet, regtest scripts)
- docs/projects/wallet/system/components.md (custom component library, hooks/, removed Ionic section)
- docs/projects/wallet/sop/development-workflow.md (arkade-regtest workflow)
- docs/projects/wallet/testing/how_to_run.md (arkade-regtest workflow)
- docs/projects/wallet/change-log/last-sync.txt
- docs/projects/wallet/change-log/SYNC_HISTORY.md

---

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
