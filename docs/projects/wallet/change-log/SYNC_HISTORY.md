# Documentation Sync History - Wallet

## 2026-05-16 - Documentation Sync
**Commit**: `1cfdb1661f57e1852c828038303d0ee5234457d3`
**Previous Sync**: `f2cfa798d49522bf9e843357bade7d1ec711f011`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 5 non-merge commits
- `0d98677c` Upgrade boltz-swap 0.3.31 (#615)
- `e84af680` Fix qrcode copy button (#617) — copy button copies the unified BIP21 URI immediately
- `9a3a0b08` Add contracts view (#618) — `DevModeProvider`, dev-mode gated `Contracts` screen under Settings → Advanced
- `787bf2e2` fix: extract LNURL session into app-level provider with reusable sessions (#559) — new `LnurlProvider`, HMAC-SHA256 credential derivation, `useLnurlSession` hook removed
- `1cfdb166` Fix assets values (#611) — BIP21 asset-amount validation, bigint hardening, asset-decimals fixes

**Features Added / Modified**:
- **LNURL provider lifecycle (PR #559)** — `src/providers/lnurl.tsx` (new, ~242 lines) owns the SSE session at the app level so the LNURL remains active across navigation. Credentials are derived deterministically via `HMAC-SHA256(privateKey, "lnurl-session")`; only `token` is sent to lnurl-server, which computes `sessionId = SHA-256(token).slice(0, 32)`. Provider self-manages start/stop based on identity + Boltz swaps readiness and handles invoice flows internally (create reverse swap → return invoice → claim in background → notify). Receive screen (`QrCode.tsx`) now reads `lnurl/active/error` from context. `src/hooks/useLnurlSession.ts` deleted (190 lines removed).
- **Dev mode + Contracts view (PR #618)** — new `src/providers/devMode.tsx` exposes a global dev-mode flag persisted in `localStorage`; triple-tapping `LoadingLogo` toggles it. New `src/screens/Settings/Contracts.tsx` renders `ContractManager` contracts (active-first) with type/state/shortened address+script and copy. `Advanced.tsx` shows the Contracts row only when dev mode is on. Tap logic lifted out of `LoadingLogo` into `DevModeProvider` so all loading logos share state. Test coverage added for `DevModeProvider`, `Advanced`, and `Contracts`.
- **QR code copy button (PR #617)** — `src/screens/Wallet/Receive/QrCode.tsx` copy button now immediately copies the unified BIP21 URI (no submenu); new component test.
- **Asset values + BIP21 hardening (PR #611)** — `src/lib/assets.ts`, `src/lib/bip21.ts`, `src/lib/format.ts`, `src/providers/limits.tsx`, `src/providers/fiat.tsx`, Asset Burn/Mint/Reissue, Receive QrCode/Success, Send Details/Form, and shared inputs (`InputAmount`, `Keyboard`, `Input`, `Balance`, `TransactionsList`) updated. Fixes: stale closure in fiat provider, BIP21 asset-amount validation, missing asset decimals on `encodeBip21Asset`, `unitsToCents` crash on empty string, missing radix on `parseInt`, guard against fractional millisatoshis, default decimals = 0, `-0` rendering in `prettyAssetNumber`. Type cleanup in `src/lib/types.ts`. Extensive new/expanded e2e tests (`asset.test.ts`, new `bip21.test.ts`, `keyboard.test.ts`, `receive.test.ts`, `send.test.ts`, `utils.ts`) and unit tests (`asset.test.ts`).
- **Dependency bump (PR #615)** — `@arkade-os/boltz-swap` 0.3.30 → 0.3.31; large `pnpm-lock.yaml` churn (PR #611).

**Files Touched in Repo** (49 files, +3369 / −2077):
- `package.json`, `pnpm-lock.yaml`, `regtest`
- `src/components/{Balance,Content,Input,InputAmount,Keyboard,LoadingLogo,TransactionsList}.tsx`
- `src/hooks/useLnurlSession.ts` (deleted)
- `src/index.tsx`
- `src/lib/{asp,assets,bip21,format,lnurl,types}.ts`
- `src/providers/{devMode,fees,fiat,flow,limits,lnurl,options,swaps}.tsx`
- `src/screens/Apps/Assets/{Burn,Mint,Reissue}.tsx`
- `src/screens/Apps/Boltz/Swap.tsx`
- `src/screens/Settings/{Advanced,Contracts,Delegates,Index}.tsx`
- `src/screens/Wallet/Receive/{QrCode,Success}.tsx`
- `src/screens/Wallet/Send/{Details,Form}.tsx`
- `src/test/e2e/{asset,bip21 (new),keyboard,receive,send,utils}.test.ts`
- `src/test/lib/asset.test.ts`
- `src/test/providers/devMode.test.tsx`, `src/test/screens/settings/{advanced,contracts}.test.tsx`
- `src/test/screens/wallet/receive-qrcode.test.tsx`
- `src/test/screens/mocks.ts`

**Dependency Updates**:
- `@arkade-os/boltz-swap`: 0.3.30 → 0.3.31

**Files Updated**:
- `docs/INDEX.md` (wallet — LNURL session capability rewritten; new dev-mode + Contracts capability; BIP21 unified copy + asset-amount validation note; `@arkade-os/boltz-swap` 0.3.30 → 0.3.31 in Key Capabilities + Dependencies)
- `docs/projects/wallet/INDEX.md` (frontmatter version 1.2.7 → 1.2.8 + `last_sync_commit`; LNURL section rewritten with `LnurlProvider` + HMAC-SHA256 derivation details; new "Developer / Diagnostics" Features subsection; `@arkade-os/boltz-swap` 0.3.30 → 0.3.31)
- `docs/projects/wallet/system/project_overview.md` (LNURL receive entry rewritten with `LnurlProvider` lifecycle; new "Developer / Diagnostics" subsection; BIP21 asset-amount validation entry under Asset Amount Precision; boltz-swap version bumped in Tech Stack + Dependencies footer)
- `docs/projects/wallet/system/architecture.md` (added `LnurlProvider` and `DevModeProvider` entries under State Management Layer; added `Advanced.tsx` + `Contracts.tsx` under Settings Screens)
- `docs/projects/wallet/change-log/last-sync.txt` → `1cfdb1661f57e1852c828038303d0ee5234457d3`
- `docs/projects/wallet/change-log/SYNC_HISTORY.md` (this entry)

---

## 2026-05-14 - Documentation Sync
**Commit**: `f2cfa798d49522bf9e843357bade7d1ec711f011`
**Previous Sync**: `e96024dfdf5e90323a6e0673c9a92106f9f9574d`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 non-merge commits
- `f2cfa798` fix support (#616) — minor fixes in `src/screens/Settings/Support.tsx`
- `29b140b3` fix(transaction): non-blocking boarding settlement UX (#556)

**Features Modified**:
- **Non-blocking boarding settlement UX (PR #556, commit 29b140b3)** — removes the full-screen `WaitingForRound` overlay (1+ minute interaction block) and replaces it with inline non-blocking UI across three call sites:
  - `src/screens/Wallet/Transaction.tsx`: inline purple `Info` banner with `LoadingIcon` ("Processing your boarding transaction…") while settlement runs; guards added to prevent simultaneous settled + pending banners; stale `setTxInfo` callback removed.
  - `src/screens/Settings/Vtxos.tsx` (Coin Control): inline "Renewing" `Info` banner during rollover instead of full-screen overlay.
  - `src/screens/Wallet/Send/Details.tsx`: `LoadingLogo` used for mainnet payments, matching Lightning/Ark payment patterns.
  - `src/icons/Loading.tsx`: `LoadingIcon` `small` size reduced 32px → 20px to align with other inline icons.
  - Settling text contrast improved.
- **Support fixes (PR #616, commit f2cfa798)** — `src/screens/Settings/Support.tsx` minor UX fixes (+16/-5).

**Files Removed**:
- `src/components/WaitingForRound.tsx` — component deleted after all three usages were migrated to inline banners.

**Configuration / Tooling Updates**:
- `.env.regtest`: image versions bumped — `arkd` v0.9.4 → v0.9.5, `arkd-wallet` v0.9.4 → v0.9.5, `fulmine` v0.3.21 → v0.3.23; added `BOLTZ_IMAGE=boltz/boltz:latest`.
- `regtest` submodule: bumped `3ac33b66` → `6333e4b8` (regtest link/image refresh).

**Files Touched in Repo**:
- `.env.regtest`
- `regtest` (submodule pointer)
- `src/components/WaitingForRound.tsx` (deleted)
- `src/icons/Loading.tsx`
- `src/screens/Settings/Support.tsx`
- `src/screens/Settings/Vtxos.tsx`
- `src/screens/Wallet/Send/Details.tsx`
- `src/screens/Wallet/Transaction.tsx`

**Dependency Updates**: None (package.json/pnpm-lock.yaml unchanged).

**Files Updated**:
- docs/INDEX.md (wallet Key Capabilities: non-blocking boarding settlement entry)
- docs/projects/wallet/INDEX.md (frontmatter version 1.2.7 + last_sync_commit; Lightning Network Swaps section: non-blocking boarding settlement entry)
- docs/projects/wallet/system/project_overview.md (UI/UX Refresh: non-blocking boarding settlement entry detailing Transaction/Vtxos/Send/Details changes and LoadingIcon resize)
- docs/projects/wallet/change-log/last-sync.txt → `f2cfa798d49522bf9e843357bade7d1ec711f011`
- docs/projects/wallet/change-log/SYNC_HISTORY.md (this entry)

---

## 2026-05-13 - Documentation Sync
**Commit**: `e96024dfdf5e90323a6e0673c9a92106f9f9574d`
**Previous Sync**: `982c8bc3e82d9cb7f6af3efc9921964363963040`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 2 non-merge commits

**Features Added**:
- **shadcn/ui primitives (PR #590, commit 30bdae17)** — 55 shadcn/ui components under `src/components/ui/` using `base-nova` style + `lucide` icons; supporting setup:
  - `components.json` shadcn CLI config (CLI moved to devDependencies)
  - `@/*` path alias in `tsconfig.json` and `vite.config.ts` `resolve.alias`
  - shadcn theme tokens appended to `src/app.css`
  - `src/hooks/use-mobile.ts` responsive helper
  - `src/components/ui/sonner.tsx` patched to read theme from `ConfigContext` (replaces `next-themes`)
  - Dark mode selector remains `html.palette-dark`
  - **No existing code modified** — primitives available for future component migrations
- New deps: implicitly via shadcn — `lucide-react`, `recharts ^3.8.0`, plus the existing tailwind/clsx/cva/tailwind-merge stack already added in PRs #582/#589

**Internal Refactors (non-breaking)**:
- **Service worker init AbortController refactor (PR #613, commit e96024df)** — `src/providers/wallet.tsx`:
  - Replaces the previous generation-counter with `initAbortRef: AbortController` per init session
  - `startInitSession()` aborts the prior session with reason `'init'` ("abandon, don't clear"); `abortInitSession()` aborts the current with `'lock-reset'`; `clearIfLockReset(svcWallet, signal)` decides whether to tear down the SW
  - `runInitAttempt` extracted so retries inherit the same signal
  - `initSvcWorkerWallet` signature now accepts `InitSvcWorkerWalletParams` with `identity?: SingleKey` (preferred) and legacy `privateKey?: string`; returns `Promise<boolean>`; adds `skipMigration?: boolean` (used by `restartWallet`)
  - `reinitSvcWalletRef` assignment moved out of render body into a `useEffect`

**Files Touched in Repo (PR #590 + PR #613)**:
- `components.json` (new)
- `package.json`, `pnpm-lock.yaml`
- `src/app.css` (+ shadcn theme tokens)
- `src/components/ui/*.tsx` (55 new files: accordion, alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb, button-group, button, calendar, card, carousel, chart, checkbox, collapsible, combobox, command, context-menu, dialog, direction, drawer, dropdown-menu, empty, field, hover-card, input-group, input-otp, input, item, kbd, label, menubar, native-select, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, spinner, switch, table, tabs, textarea, toggle-group, toggle, tooltip)
- `src/hooks/use-mobile.ts` (new)
- `src/lib/utils.ts` (minor update)
- `src/providers/wallet.tsx` (+162 / -53 — AbortController refactor)
- `tsconfig.json`, `vite.config.ts` (`@/*` path alias)

**Features Added/Modified/Removed**: 55 shadcn/ui primitives added; service-worker init refactored. No public/UI behavior changes.
**Configuration Changes**: `@/*` path alias added in `tsconfig.json` and `vite.config.ts`.
**Dependency Updates**: shadcn/ui CLI moved to devDependencies; `lucide-react` and `recharts ^3.8.0` added; `next-themes` not added (avoided in favor of `ConfigContext`).

**Files Updated**:
- docs/INDEX.md (wallet Key Capabilities + Tags)
- docs/projects/wallet/INDEX.md (frontmatter version 1.2.6 + last_sync_commit; Technology Stack: shadcn entry)
- docs/projects/wallet/system/project_overview.md (Design System & Styling: PR #590)
- docs/projects/wallet/system/components.md (directory tree adds `src/components/ui/`, `use-mobile.ts`; shadcn section appended)
- docs/projects/wallet/system/architecture.md (WalletProvider AbortController init session model)
- docs/projects/wallet/change-log/last-sync.txt
- docs/projects/wallet/change-log/SYNC_HISTORY.md

---

## 2026-05-12 - Documentation Sync
**Commit**: `982c8bc3e82d9cb7f6af3efc9921964363963040`
**Previous Sync**: `582320bdd54fcac021125146556b090484237bb6`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 non-merge commit

**Features Renamed**:
- Lendaswap → Satora app (PR #612, commit 982c8bc3)
  - `src/screens/Apps/Lendaswap/` → `src/screens/Apps/Satora/`
  - `LendaswapIcon.tsx` → `SatoraIcon.tsx` (replaced with new icon)
  - Env var: `VITE_LENDASWAP_IFRAME_URL` → `VITE_SATORA_IFRAME_URL`
  - Updated references in providers (announcements, navigation, wallet), Apps Index, Announcement component, Support screen, Dockerfile, docker-entrypoint.sh, README.md

**Files Touched in Repo**:
- Dockerfile, docker-entrypoint.sh, README.md
- src/components/Announcement.tsx
- src/providers/{announcements,navigation,wallet}.tsx
- src/screens/Apps/Index.tsx
- src/screens/Apps/Lendaswap/LendaswapIcon.tsx (removed)
- src/screens/Apps/Satora/{Index.tsx,SatoraIcon.tsx} (added/moved)
- src/screens/Settings/Support.tsx

**Features Added/Modified/Removed**: Rename only — no new functionality, no removals
**Configuration Changes**: `VITE_LENDASWAP_IFRAME_URL` env var renamed to `VITE_SATORA_IFRAME_URL`
**Dependency Updates**: None

**Files Updated**:
- docs/INDEX.md — checked; no wallet section changes needed (no Lendaswap references in master registry)
- docs/projects/wallet/INDEX.md (frontmatter version 1.2.5 + last_sync_commit; Apps screens list; DeFi integration entry)
- docs/projects/wallet/system/project_overview.md (DeFi User use case)
- docs/projects/wallet/system/components.md (directory tree + Apps Screens section)
- docs/projects/wallet/change-log/last-sync.txt
- docs/projects/wallet/change-log/SYNC_HISTORY.md

---

## 2026-05-09 - Documentation Sync
**Commit**: `582320bdd54fcac021125146556b090484237bb6`
**Previous Sync**: `7066839d412a1a06df6880ab225ea72d03a3f1db`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 1 non-merge commit

**Dependency Updates**:
- @arkade-os/sdk: 0.4.25 → 0.4.26 (PR #610)
- @arkade-os/boltz-swap: 0.3.29 → 0.3.30 (PR #610)

**Features Added/Modified/Removed**: None
**Configuration Changes**: None — `package.json` dependency-version bumps only; `pnpm-lock.yaml` regenerated.

**Files Updated**:
- docs/INDEX.md (wallet dependency versions: sdk 0.4.26, boltz-swap 0.3.30)
- docs/projects/wallet/INDEX.md (frontmatter version 1.2.4 + last_sync_commit; Arkade Integration sdk/boltz-swap versions)
- docs/projects/wallet/system/project_overview.md (sdk/boltz-swap versions in Technology Stack and Dependencies summary)
- docs/projects/wallet/system/tech-stack.md (sdk/boltz-swap section headings updated to new versions)
- docs/projects/wallet/change-log/last-sync.txt
- docs/projects/wallet/change-log/SYNC_HISTORY.md

---

## 2026-05-08 - Documentation Sync
**Commit**: `7066839d412a1a06df6880ab225ea72d03a3f1db`
**Previous Sync**: `0b51d64fd09c052e6983c5d0f675adae24f80e81`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 3 non-merge commits

**Features Added**:
- Design token system + Tailwind CSS v4 integration (PR #582)
  - New `src/tokens.css` — single source of truth for color ramps (50–950 across `purple`/`green`/`red`/`orange`/`yellow`/`neutral`), typography, and shadow elevation. Neutral ramp uses `color-mix(in oklab)` for automatic light/dark adaptation under `html.palette-dark`.
  - New `src/app.css` — Tailwind v4 `@theme` block mapping tokens to utilities; `@tailwindcss/vite` plugin wired in `vite.config.ts`.
  - New `src/lib/utils.ts` `cn()` helper combining `clsx` + `tailwind-merge`.
  - All `--darkXX` opacity tokens migrated to solid `--neutral-XXX` colors across 50+ component files; semantic aliases now reference ramps; legacy aliases (`--background-color`, `--heading-font`) preserved.

**Features Modified**:
- Toast migration to sonner (PR #589)
  - `src/components/Toast.tsx` shrank from ~97 to 35 lines; wraps `<Toaster>` with project defaults (`top-center`, `richColors`, content-hugging styling).
  - `useToast()` hook still returns `{ toast }` for backward compatibility; `toast` re-exported directly.
  - New scoped `src/components/Toast.css` centers Sonner toasts so short copy confirmations hug their content (instead of the default fixed-width left-aligned layout).
  - `src/providers/config.tsx` now keeps the configured Arkade server even when stale localhost localStorage is present, as long as `VITE_DEV_NSEC` and `VITE_ARK_SERVER` env are set (for funded local dev wallets).
  - `src/screens/Settings/Backup.tsx` no longer reads `VITE_DEV_NSEC` directly — private-key display continues to require the normal password verification path (security regression fix during PR #589 review).

**Dependency Updates**:
- @arkade-os/sdk: 0.4.24 → 0.4.25 (PR #4720cfdc)
- @arkade-os/boltz-swap: 0.3.28 → 0.3.29 (PR #4720cfdc)
- Added `tailwindcss@^4.2.2`, `@tailwindcss/vite@^4.2.2`
- Added `clsx@^2.1.1`, `tailwind-merge@^3.5.0`, `class-variance-authority@^0.7.1`
- Added `sonner@^2.0.7`

**Configuration Changes**:
- `vite.config.ts`: registered `@tailwindcss/vite` plugin
- `src/index.tsx`: imports new design system entry points

**Files Updated**:
- docs/INDEX.md (wallet capabilities, tags, dependencies — sdk/boltz-swap versions, tailwind/sonner/design-tokens)
- docs/projects/wallet/INDEX.md (version 1.2.3, last_sync_commit, Core Framework section: Tailwind v4, design tokens, sonner; sdk/boltz-swap versions)
- docs/projects/wallet/system/project_overview.md (UI/UX section adds Design System & Styling subsection; Technology Stack list updated; sdk/boltz-swap versions)
- docs/projects/wallet/system/tech-stack.md (new sections for Tailwind v4, clsx + tailwind-merge, class-variance-authority, sonner; sdk/boltz-swap versions)
- docs/projects/wallet/system/components.md (Toast component now sonner-backed; `tokens.css`, `app.css`, `lib/utils.ts` added to directory listing)
- docs/projects/wallet/change-log/last-sync.txt
- docs/projects/wallet/change-log/SYNC_HISTORY.md

---

## 2026-05-07 - Documentation Sync
**Commit**: `0b51d64fd09c052e6983c5d0f675adae24f80e81`
**Previous Sync**: `7192bdf948d7922dc244abaf928d5496743fd367`
**Synced By**: /update-project skill
**Status**: Completed

**Commits Analyzed**: 6 non-merge commits

**Features Added**:
- Boltz `referralId: 'arkade-money'` propagated to `BoltzSwapProvider` and service-worker arkadeSwaps for swap attribution (PR #606)
- Mainnet Boltz endpoint defaults to `https://api.boltz.exchange`; env-unset fallback now defers to SDK defaults instead of a hard-coded `api.ark.boltz.exchange` URL (PRs #599, #606); README docker examples updated

**Features Modified**:
- Asset amount math migrated to `bigint`: `unitsToCents`/`centsToUnits` operate on `bigint`, `AssetOption.balance` and tx-asset `amount` are `bigint`, asset metadata `supply` is `bigint` (serialised via `JSON.stringify` replacer in `lib/storage.ts`) (PR #599)
- New `prettyAssetAmount(amount, decimals, useGrouping?)` formatter in `src/lib/assets.ts` splits whole/fractional via BigInt arithmetic to fix truncation of fractional units (e.g. `1.5 USDT`); companion helpers `prettyAssetNumber`, `prettyAssetAmountHide`, `isValidDecimals` (allows `0..MAX_DECIMALS=8`) (PR #599)
- Non-negative integer clamp on Burn / Mint / Reissue / Send / Receive QrCode / `InputAmount` so `BigInt(1.5)` no longer throws RangeError (PR #599)
- Mainnet `explorers.bitcoin.api` removed — `getRestApiExplorerURL` returns `string | undefined`; callers fall back to SDK defaults (PR #599)
- `formatAssetAmount` now takes `bigint` and routes through `prettyAssetNumber` (PR #599)

**Bug Fixes**:
- PWA safe-area handling restored — page top safe-area offset (`top: env(safe-area-inset-top)`) re-added so installed iOS PWAs no longer render beneath the status bar; pill-navbar clearance and scroll-fade applied to plain `.content` instead of legacy `::part(scroll)`; `--pill-navbar-spacer` CSS var removed (PR #600)
- Scrollbar hidden cross-browser on `.content` directly, off the legacy Ionic `::part(scroll)` shadow part (PR #608)
- Scanner button positioning fixed via new `.label.has-buttons` layout in `src/index.css` and applied to `InputWithScanner` (PR #603)

**Dependency Updates**:
- @arkade-os/sdk: 0.4.22 → 0.4.24 (PRs #599, #605)
- @arkade-os/boltz-swap: 0.3.24 → 0.3.28 (PRs #599, #605, #606) — adds `referralId` constructor option

**Configuration Changes**:
- `package.json` `start:mainnet` script: `VITE_BOLTZ_URL=https://api.ark.boltz.exchange` → `https://api.boltz.exchange`
- `swaps.tsx` `BASE_URLS.bitcoin`: hard-coded `api.ark.boltz.exchange` fallback → `null` (defer to SDK defaults)

**Files Updated**:
- docs/INDEX.md (wallet capabilities, dependency versions)
- docs/projects/wallet/INDEX.md (version 1.2.2, last_sync_commit, sdk/boltz-swap versions, referralId note)
- docs/projects/wallet/system/project_overview.md (sdk/boltz-swap versions, referralId, mainnet endpoint, asset bigint refactor, PWA safe-area, scanner)
- docs/projects/wallet/system/tech-stack.md (sdk/boltz-swap versions, referralId option)
- docs/projects/wallet/change-log/last-sync.txt
- docs/projects/wallet/change-log/SYNC_HISTORY.md

---

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
