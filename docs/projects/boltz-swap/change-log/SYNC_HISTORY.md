# Boltz Swap Documentation Sync History

## 2026-05-20 — Sync 0.3.31 → 0.3.32

**From**: `67683b13a44bb58f605a824836883aa1f6eab962` (release 0.3.31)
**To**: `57ac89165bfb4680efad6706f1e8783b56f32733` (release 0.3.32)
**Commits Analyzed**: 6 (non-merge)
**Status**: ✓ Complete

### Commits Analyzed
- `57ac891` chore: release 0.3.32
- `983cf62` Fix VtxoManager-enabled receive test for gocron scheduler
- `499c4a0` Update .env based on wallet
- `5f4eed1` Pin fulmine to 0.3.15 (removes prior 0.3.15 pin block; reintroduced as v0.3.23 in 499c4a0)
- `ad4d175` Update regtest submodule (`3ac33b6` → `dc23da2`)
- `e0837db` Upgrade ts-sdk 0.4.27

### Notable Changes

**Versions**
- `@arkade-os/boltz-swap`: 0.3.31 → 0.3.32
- `@arkade-os/sdk`: 0.4.26 → 0.4.27
- Release 0.3.32 is the SDK upgrade cut — no `src/` changes.

**Regtest harness realigned to wallet's arkd config** (commits `499c4a0` + `983cf62`)
- Image pins moved forward: `arkd` / `arkd-wallet` `v0.9.1 → v0.9.5`, `fulmine` `v0.3.15 → v0.3.23`, new explicit `BOLTZ_IMAGE=boltz/boltz:latest`.
- Scheduler switched `ARKD_SCHEDULER_TYPE=block` → `ARKD_SCHEDULER_TYPE=gocron`; the `ARKD_ALLOW_CSV_BLOCK_TYPE=true` override is dropped.
- CSV delays restored to **seconds-typed** values: `ARKD_VTXO_TREE_EXPIRY=200 → 5120`, `ARKD_BOARDING_EXIT_DELAY=1024 → 7200`. Under gocron, mixing block-typed and seconds-typed CSV delays is rejected without `ARKD_ALLOW_CSV_BLOCK_TYPE=true`; reverting to seconds matches the wallet's existing arkd config and lets arkd v0.9.5 accept the values cleanly.
- New keys: `ARKD_SESSION_DURATION=10`, `ARKD_LOG_LEVEL=6`. `BITCOIN_LOW_FEE` flipped `false → true` (start-env.sh's nbxplorer guard now handles the missing-container case gracefully, so the prior Bitcoin-Core-restart workaround is no longer needed).
- `regtest` git submodule pointer bumped `3ac33b6` → `dc23da2`.

**VtxoManager-enabled receive test stabilised for gocron** (commit `983cf62`)
- With the gocron scheduler, settlement rounds tick on a timer and can consume / re-register a just-claimed VTXO before an immediate `getBalance()` snapshot.
- `test/e2e/arkade-swaps.test.ts` (~11 added lines) replaces the single-snapshot assertion `expect(balance.available).toBeGreaterThan(0)` with `await waitForBalance(() => defaultWallet.getBalance(), 1, 10_000)` — the polling helper already used elsewhere in the suite.

### Documentation Files Updated
- `docs/projects/boltz-swap/system/project_overview.md` — bumped version to 0.3.32, SDK to 0.4.27; new "Recent Improvements (0.3.31 → 0.3.32)" block covering the SDK upgrade, regtest harness realignment (arkd v0.9.5 / fulmine v0.3.23 / gocron scheduler / seconds-typed CSV delays / new env vars), and the `waitForBalance` test stabilisation
- `docs/projects/boltz-swap/testing/how_to_run.md` — refreshed "Services" pinned versions (arkd / arkd-wallet v0.9.5, fulmine v0.3.23, Boltz `boltz/boltz:latest`) and the "Configuration (`.env.regtest`)" bullets (gocron scheduler, seconds-typed `ARKD_VTXO_TREE_EXPIRY=5120` / `ARKD_BOARDING_EXIT_DELAY=7200`, new `ARKD_SESSION_DURATION=10` / `ARKD_LOG_LEVEL=6` / `BITCOIN_LOW_FEE=true` notes)
- `docs/INDEX.md` — bumped boltz-swap status row to v0.3.32 + SDK 0.4.27 with regtest harness realignment summary (image pins, scheduler switch, seconds-typed CSV delays, new env vars, regtest submodule bump) and the `waitForBalance` test note; updated boltz-swap **Dependencies** line to SDK 0.4.27; bumped registry **Last Updated** to 2026-05-20 and **Version** to 1.6.2
- `docs/projects/boltz-swap/change-log/last-sync.txt` — updated to `57ac8916`

---

## 2026-05-14 — Sync (post-0.3.30) → 0.3.31

**From**: `d244bc195a842a46280895d2724d879ae3b3884b`
**To**: `67683b13a44bb58f605a824836883aa1f6eab962` (release 0.3.31)
**Commits Analyzed**: 4 (non-merge)
**Status**: ✓ Complete

### Commits Analyzed
- `67683b1` chore: release 0.3.31
- `d1ff808` Update lockfile
- `fd75612` chore: declare optional Expo peers and test removed-field guard
- `3039456` fix: isolate expo-task-manager/expo-background-task to /expo/background

### Notable Changes

**Versions**
- `@arkade-os/boltz-swap`: 0.3.30 → 0.3.31
- `@arkade-os/sdk`: unchanged at 0.4.26
- `pnpm-lock.yaml` regenerated (~4.7k-line churn)

**Expo background-task subpath isolation** (commit `3039456`, fix for [#136](https://github.com/arkade-os/boltz-swap/issues/136)) — **breaking for Expo callers**
- Lazy `require()` inside `/expo` was invisible to Metro's static dependency collector, so `expo-task-manager` / `expo-background-task` never entered the bundle graph and resolution failed at runtime.
- The OS-task helpers (`defineExpoSwapBackgroundTask`, `registerExpoSwapBackgroundTask`, `unregisterExpoSwapBackgroundTask`) moved from `@arkade-os/boltz-swap/expo` to a new dedicated subpath `@arkade-os/boltz-swap/expo/background`, with static imports.
- `@arkade-os/boltz-swap/expo/background` is the **only** module that pulls in `expo-task-manager` / `expo-background-task` — keeping it isolated lets react-native-web and Node consumers use `/expo` without those native packages.
- `ExpoArkadeSwaps.setup()` no longer registers the OS task itself. Callers must invoke `await registerExpoSwapBackgroundTask(taskName, { minimumInterval })` explicitly, and `await unregisterExpoSwapBackgroundTask(taskName)` on teardown (`dispose()` no longer does this).
- The `background` config dropped `taskName` and `minimumBackgroundInterval`. TS callers get a compile error on the removed fields; JS callers get a runtime warning via `warnOnRemovedBackgroundFields` (otherwise the fields are silently ignored and the OS task never runs).
- New package export entry `./expo/background` (ESM + CJS, with `.d.ts`); `build` script now bundles `src/expo/background.ts` as a fourth entry alongside `src/expo/index.ts`.
- README gained a "Change since 0.3.30" warning block with a before/after migration table and a new "Important" callout explaining the subpath isolation.

**Optional Expo peerDependencies** (commit `fd75612`)
- `expo-task-manager` (`>=3.0.0`) and `expo-background-task` (`>=0.1.0`) are now declared as **optional** `peerDependencies` with `peerDependenciesMeta.*.optional = true`, so package managers warn consumers when missing and `tsup` externalises them via the standard route (drops the explicit `--external` flags from the build script).
- New unit tests in `test/expo/arkade-lightning.test.ts` (~62 added lines) cover `warnOnRemovedBackgroundFields` for both removed fields (`taskName`, `minimumBackgroundInterval`), the combined case, and null / non-object inputs.

**ServiceWorker half-initialized handler recovery** (carried forward from the post-0.3.30 sync — now shipping in 0.3.31)
- Handler throws a typed `HandlerNotInitializedError` (`HANDLER_NOT_INITIALIZED` = `"ArkadeSwaps handler not initialized"`) when `handler.handler || wallet` is missing.
- Runtime's reinit-retry path treats it as recoverable alongside `MESSAGE_BUS_NOT_INITIALIZED` — re-sends the cached `INIT_ARKADE_SWAPS` payload and retries the original request transparently.

### Documentation Files Updated
- `docs/projects/boltz-swap/system/project_overview.md` — bumped version to 0.3.31; replaced the "Recent Improvements (post-0.3.30, unreleased)" block with a unified "Recent Improvements (0.3.30 → 0.3.31)" entry covering Expo subpath isolation, optional Expo peer-deps + removed-field guard, and the now-shipped SW handler recovery
- `docs/INDEX.md` — bumped boltz-swap status row to v0.3.31; added Expo subpath isolation, optional peer-deps, and breaking-change details; added Expo capability bullet to **Key Capabilities**; added `expo`, `react-native`, `background-task` tags; added `expo background task` / `defineExpoSwapBackgroundTask` / `registerExpoSwapBackgroundTask` ask_question triggers; added `expo background swap` / `react native swap` develop triggers; added `expo background task not running` / `metro static dependency` / `expo-task-manager missing` / `#136` debug triggers; bumped Last Updated to 2026-05-14, registry version to 1.5.10
- `docs/projects/boltz-swap/change-log/last-sync.txt` — updated to `67683b13`

---

## 2026-05-09 — Sync 0.3.29 → 0.3.30

**From**: `13cffc1133365a3594fb1d56a25bb20b984070f3`
**To**: `e019ba06e7aadf63767bed124a159d5f505e27a5`
**Version**: 0.3.30
**Status**: ✓ Complete

### Commits Analyzed
- `e019ba0` chore: release 0.3.30
- `3e0cef7` Upgrade ts-sdk 0.4.26
- `7bb75da` Add default referral ID if not included

### Changes Documented
- `BoltzSwapProvider` constructor now defaults `referralId` to `"arkade-ts-sdk"` when caller omits it (`src/boltz-swap-provider.ts:1038`); affects every submarine, reverse, and chain swap request unless explicitly overridden.
- Dependency bump: `@arkade-os/sdk` 0.4.25 → 0.4.26.
- Version bump: 0.3.29 → 0.3.30.

### Files Updated
- `docs/projects/boltz-swap/system/project_overview.md` — version, SDK dep version, BoltzSwapProvider referralId default note, Recent Improvements 0.3.29 → 0.3.30 entry
- `docs/projects/boltz-swap/testing/api-reference.md` — `BoltzSwapProvider` config `referralId?` default annotation
- `docs/INDEX.md` — version, SDK dep, status table row
- `docs/projects/boltz-swap/change-log/last-sync.txt` — new commit hash

---

## 2026-01-23 — Initial Documentation Sync

**Commit**: `7ba64dd758d341e473e46dc88d51808397d13429`
**Version**: 0.2.16
**Status**: ✓ Complete

### Actions Taken
- Created complete documentation structure
- Generated project INDEX.md
- Created system documentation (project_overview.md, architecture.md)
- Created testing documentation (usage.md, how_to_run.md, how_to_test.md, troubleshooting.md)
- Created SOP (development-workflow.md)
- Updated master INDEX.md registry
- Initialized change-log tracking

### Documentation Files Created
- `docs/projects/boltz-swap/INDEX.md` — Project index with YAML frontmatter
- `docs/projects/boltz-swap/system/project_overview.md` — Project overview (148 lines)
- `docs/projects/boltz-swap/system/architecture.md` — Architecture documentation (686 words)
- `docs/projects/boltz-swap/testing/usage.md` — Usage guide (119 lines)
- `docs/projects/boltz-swap/testing/how_to_run.md` — Running instructions (115 lines)
- `docs/projects/boltz-swap/testing/how_to_test.md` — Testing guide (118 lines)
- `docs/projects/boltz-swap/testing/troubleshooting.md` — Troubleshooting (98 lines)
- `docs/projects/boltz-swap/sop/development-workflow.md` — Development workflow (118 lines)
- `docs/projects/boltz-swap/change-log/last-sync.txt` — Sync tracking
- `docs/projects/boltz-swap/change-log/SYNC_HISTORY.md` — This file

### Next Sync
Run `arkadian sync-project boltz-swap` to sync with latest repository changes.

---

**Baseline Commit**: 7ba64dd758d341e473e46dc88d51808397d13429
**Next Sync**: On repository changes or manual trigger

---

## 2026-04-29 — Sync 0.3.13 → 0.3.22

**From**: `50eff5092900dcc1a15ff4992561dcea906bd7ad` (release 0.3.13)
**To**: `81ce8c3de344fa709527006f5fb708ab9c8d63ff` (release 0.3.22)
**Commits Analyzed**: 48 (non-merge)
**Status**: ✓ Complete

### Notable Changes

**Versions**
- `@arkade-os/boltz-swap`: 0.3.13 → 0.3.22 (9 patch releases)
- `@arkade-os/sdk`: 0.4.14 → 0.4.21 (8 SDK upgrades)

**Submarine refund hardening**
- Select correct lockup VTXO for submarine swap refunds (#104)
- Include recoverable VTXOs in submarine refunds
- Skip pre-CLTV recoverable VTXOs instead of aborting refund loop
- Only mark swap as refunded when all VTXOs were processed
- Fall back to `refundWithoutReceiver` when Boltz rejects submarine refund
- Specify swap ID in refund errors

**Reliability**
- Retry claim when indexer returns no VTXOs
- Refresh VTXOs when using `VtxoManager`
- Robust signature validation (#99)
- Service Worker retry/init logic with recovery tests
- Stop swap polling on wallet reset; deduplicate concurrent GETs in `BoltzSwapProvider`
- Don't fetch preimage data for historical swaps

**API surface**
- Renamed `Pending-` swap interfaces to `Boltz-` (with backwards-compat aliases — non-breaking)
- Schema alignment with Boltz swagger: `Tree`, `SwapStatus`, swap response, restore endpoints
- Default description `"send to Arkade address"` for reverse swaps
- Added `invoice.expired` to reverse-swap final statuses

**Test infrastructure**
- Replaced bundled `test.docker-compose.yml` (-286 lines) and `cors.nginx.conf` with `arkade-regtest` git submodule
- New `.env.regtest` overrides pinning arkd/arkd-wallet to `v0.9.1`, fulmine to `v0.3.15`, with arkd block scheduler + zero Ark fees
- Reworked pnpm scripts: `regtest:up/down/setup` → `regtest:start/stop` + `test:setup-docker`; new `regtest:clean`
- Improved integration test harness to prevent wallet bleed between tests

### Documentation Files Updated
- `docs/projects/boltz-swap/INDEX.md` — refreshed `scripts` section to match new pnpm scripts
- `docs/projects/boltz-swap/system/project_overview.md` — bumped version to 0.3.22, SDK dep to 0.4.21, added "Recent Improvements" subsection
- `docs/projects/boltz-swap/testing/how_to_run.md` — switched regtest workflow to arkade-regtest submodule, updated commands and `.env.regtest` notes
- `docs/INDEX.md` — bumped boltz-swap status (Alpha → ✓ Beta), added version + SDK note
- `docs/projects/boltz-swap/change-log/last-sync.txt` — updated to `81ce8c3d`

---

## 2026-05-01 — Sync 0.3.22 → 0.3.24

**From**: `81ce8c3de344fa709527006f5fb708ab9c8d63ff` (release 0.3.22)
**To**: `737c08b954369f3a4d4ab15e2e06d891c5e453d5` (release 0.3.24)
**Commits Analyzed**: 10 (non-merge)
**Status**: ✓ Complete

### Notable Changes

**Versions**
- `@arkade-os/boltz-swap`: 0.3.22 → 0.3.24 (releases 0.3.23 and 0.3.24)
- `@arkade-os/sdk`: 0.4.21 → 0.4.22

**New: User-initiated submarine VHTLC recovery API** (PR `3124698`)
- Lets a user inspect and refund funds stranded at submarine swap lockup addresses — both successful swaps with extra deposits and failed swaps that never refunded. Recovery is explicit; nothing scans on startup or in the background.
- `inspectSubmarineRecovery(swap)` / `scanRecoverableSubmarineSwaps()` return `SubmarineRecoveryInfo` with status `recoverable` / `pre_cltv` / `none` / `already_spent` / `invalid_swap`. No side effects.
- Inspection is Boltz-amnesia-tolerant: queries only the local repo and the Ark indexer.
- `recoverSubmarineFunds(swap)` wraps `refundVHTLC`; `recoverAllSubmarineFunds(swaps)` runs sequentially with per-swap `SubmarineRecoveryResult` so one failure never aborts the batch.
- Post-CLTV recovery uses `refundWithoutReceiver`, so funds remain reachable even if Boltz purges the swap from its DB.
- Wired through `IArkadeSwaps`, `ExpoArkadeSwaps`, ServiceWorker message handler + runtime; new types exported from `src/index.ts`.

**API change**
- `refundVHTLC()` now returns `SubmarineRefundOutcome` (`{ swept, skipped }`) instead of `void` — distinguishes a real sweep from a no-op skip path. `transaction.claimed` swaps skip the refundable/refunded flag write to avoid muddling history when sweeping stranded extras.

**Refund readiness simplification**
- Drop chain-height path from submarine VHTLC refund readiness — Boltz Ark VHTLCs encode `refund` as an absolute Unix timestamp (CLTV semantics, BIP65 ≥ 500_000_000) and the unilateral fields as BIP68 relative delays (seconds when ≥ 512). The block-height locktime branch was dead in practice; the `getChainHeight()` round-trip was unnecessary.
- Centralised BIP68 relative-timelock conversion (`toBip68RelativeTimelock`) in both `utils/scripts.ts` and `utils/vhtlc.ts`, with a shared `VhtlcTimeouts` typedef.

**Recoverability classification**
- Classify Boltz 3-of-3 refundable swaps as recoverable (not `pre_cltv`) so users can sweep funds even before the absolute refund timestamp elapses, when a normal spendable VTXO is present. Swept/recoverable VTXOs still wait for `refundWithoutReceiver` post-CLTV.

**ServiceWorker timeout exemptions** (mirrors arkade-os/ts-sdk#446)
- Long-running messages (Lightning send, claim/refund VHTLC, recovery APIs, wait-and-claim variants, restore swaps) skip the bus message timeout — flows that surrender control to remote peers (Boltz, Ark server, batch participants) can sit idle longer than the bus deadline. Liveness still covered by the existing PING / `MESSAGE_BUS_NOT_INITIALIZED` path on concurrent short requests.

**Tests**
- New unit + e2e test coverage for recovery flows: dedicated e2e happy path (`test/e2e/arkade-swaps.test.ts`), dispatch tests in `test/serviceWorker/arkade-swaps-message-handler.test.ts`, runtime wiring in `test/serviceWorker/arkade-swaps-runtime.test.ts`, and ~830 added lines in the unit suite.

**Misc**
- Improved typings around VHTLC context (internal `SubmarineVHTLCContext`, `SubmarineVHTLCLookup`, `SubmarineScanPrepared`).
- Add `agents/` to `.gitignore`.
- README: new "Submarine Fund Recovery" section.

### Documentation Files Updated
- `docs/projects/boltz-swap/system/project_overview.md` — bump version to 0.3.24, SDK to 0.4.22; new "User-Initiated Submarine Recovery" capability bullet; replaced "Recent Improvements" with 0.3.22 → 0.3.24 highlights
- `docs/projects/boltz-swap/testing/api-reference.md` — added recovery methods to ArkadeLightning method table; new "Submarine Recovery Types" section documenting `SubmarineRecoveryStatus`, `SubmarineRecoveryInfo`, `SubmarineRefundOutcome`, `SubmarineRecoveryResult`; documented `refundVHTLC` return-type change
- `docs/projects/boltz-swap/testing/usage.md` — added "Recovering Stranded Submarine Funds" section with scan/inspect/recover examples
- `docs/INDEX.md` — bumped boltz-swap status row to v0.3.24 + SDK 0.4.22; added submarine recovery to capabilities, tags, triggers; SDK dep version updated
- `docs/projects/boltz-swap/change-log/last-sync.txt` — updated to `737c08b9`

---

## 2026-05-05 — Sync 0.3.24 → 0.3.26

**From**: `737c08b954369f3a4d4ab15e2e06d891c5e453d5` (release 0.3.24)
**To**: `0ada9496fcdd956029ca521bc0387f3fd9816125` (release 0.3.26)
**Commits Analyzed**: 7 (non-merge)
**Status**: ✓ Complete

### Notable Changes

**Versions**
- `@arkade-os/boltz-swap`: 0.3.24 → 0.3.26 (releases 0.3.25 and 0.3.26)
- `@arkade-os/sdk`: 0.4.22 → 0.4.23

**SwapManager unknown-to-provider safety net** (commits `2893b2a`, `a3c4a0f`)
- Stops polling and transitions a swap to terminal `swap.expired` after `SwapManager.NOT_FOUND_THRESHOLD = 10` consecutive Boltz 404s — roughly a 5-minute grace at the default 30s poll cadence. Long enough to ride out a transient Boltz blip, short enough that a real "swap unknown to this provider" surfaces quickly.
- Per-swap counter (`notFoundCounts: Map<string, number>`) is incremented on `SwapNotFoundError` and cleared on any successful poll, successful WS update, swap removal, or stop.
- New private helpers: `pollSingleSwap`, `handleSwapNotFound`, `markSwapAsUnknownToProvider`. Trip path persists the swap with `status = "swap.expired"`, removes it from `monitoredSwaps`, clears any retry timer, and reports via `onSwapFailed(swap, SwapNotFoundError)`. Bypasses `handleSwapStatusUpdate` on purpose to skip the auto-claim/refund branch — there's nothing to claim or refund against an instance that has no record of the swap.
- 429 retry path also recognises `SwapNotFoundError` so a rate-limited retry can trip the safety net just like a normal poll.
- **Subscriber notification (follow-up `a3c4a0f`)**: when the safety net trips, `swapUpdateListeners` and per-swap `swapSubscriptions` are now invoked with `(swap, oldStatus)` mirroring `handleSwapStatusUpdate`'s emission shape, so `waitForSwapCompletion` and UI subscribers see the `swap.expired` resolution. Subscriptions are cleared *after* notification, not before.

**New `SwapNotFoundError`** (extends `NetworkError`, statusCode 404, exported from `src/index.ts`)
- Thrown by `BoltzSwapProvider.getSwapStatus` when Boltz returns a 404 with body matching the "could not find swap" pattern (matched defensively against either parsed `errorData.error` JSON field or the raw message text).
- Distinct from a generic 404 (route change, proxy misconfig) so only the canonical "swap unknown to this Boltz instance" body drives the SwapManager counter.
- Exposes `swapId: string`. Test coverage: 7 new tests in `boltz-swap-provider.test.ts`, ~131 lines of safety-net coverage in `swap-manager.test.ts` (counter accumulation, reset on success, threshold trip with subscriber notification, 429 retry path).

**Production endpoint switch** (commit `2893b2a`)
- `BASE_URLS.bitcoin` changed from `https://api.ark.boltz.exchange` to `https://api.boltz.exchange` (canonical Boltz mainnet endpoint). Existing swap IDs created against the previous endpoint will now naturally trip the safety net instead of hanging in monitoring forever.

**Misc**
- `Format` commits cover prettier-only churn in `swap-manager.ts`, `boltz-swap-provider.test.ts`, `swap-manager.test.ts` (no behaviour change).

### Documentation Files Updated
- `docs/projects/boltz-swap/system/project_overview.md` — bump version to 0.3.26, SDK to 0.4.23; new "Unknown-to-Provider Safety Net" bullet under Error Handling; replaced "Recent Improvements" with 0.3.24 → 0.3.26 highlights
- `docs/projects/boltz-swap/testing/api-reference.md` — added `SwapNotFoundError` row to Error Types table
- `docs/INDEX.md` — bumped boltz-swap status row to v0.3.26 + SDK 0.4.23; added 404 safety net to capabilities; added `swap-not-found` tag; added new ask_question / debug triggers
- `docs/projects/boltz-swap/change-log/last-sync.txt` — updated to `0ada9496`

---

## 2026-05-07 — Sync 0.3.26 → 0.3.28

**From**: `0ada9496fcdd956029ca521bc0387f3fd9816125` (release 0.3.26)
**To**: `4c32983560415c0bfa892533c2d5ac88f3cc6a8b` (release 0.3.28)
**Commits Analyzed**: 4 (non-merge)
**Status**: ✓ Complete

### Notable Changes

**Versions**
- `@arkade-os/boltz-swap`: 0.3.26 → 0.3.28 (releases 0.3.27 and 0.3.28)
- `@arkade-os/sdk`: 0.4.23 → 0.4.24

**ServiceWorker `referralId` propagation** (commit `3ba60f7`)
- The existing `BoltzSwapProvider` `referralId` option is now plumbed through the service worker layer end-to-end so SW-hosted callers can attribute swaps to a referral the same way direct-instantiation callers already could.
- `SvcWrkArkadeSwapsConfig` (`src/serviceWorker/arkade-swaps-runtime.ts`) gained an optional `referralId?: string` alongside `arkServerUrl` / `network`.
- `RequestInitArkSwaps` payload (`src/serviceWorker/arkade-swaps-message-handler.ts`) gained the same optional field. `ServiceWorkerArkadeSwaps` forwards `config.referralId` into the `INIT_ARK_SWAPS` message envelope; the handler instantiates `BoltzSwapProvider` with `{ apiUrl, network, referralId }`.
- Non-breaking: existing SW callers that omit the field continue to work.
- Bundled `regtest` submodule pointer also bumped in this commit.

**Misc**
- `chore: release 0.3.27` (`9dd28cb`) and `chore: release 0.3.28` (`4c32983`) are pure version bumps in `package.json`. The 0.3.27 cut released the SDK 0.4.24 upgrade, 0.3.28 cut released the SW `referralId` plumbing.

### Documentation Files Updated
- `docs/projects/boltz-swap/system/project_overview.md` — bump version to 0.3.28, SDK to 0.4.24; replaced "Recent Improvements" with 0.3.26 → 0.3.28 highlights (SW `referralId`)
- `docs/INDEX.md` — bumped boltz-swap status row to v0.3.28 + SDK 0.4.24 with new SW `referralId` note; updated boltz-swap **Dependencies** line to SDK 0.4.24
- `docs/projects/boltz-swap/change-log/last-sync.txt` — updated to `4c329835`

---

## 2026-05-13 — Sync (post-0.3.30, SW handler recovery)

**From**: `e019ba06e7aadf63767bed124a159d5f505e27a5` (release 0.3.30)
**To**: `d244bc195a842a46280895d2724d879ae3b3884b`
**Commits Analyzed**: 1 (non-merge)
**Status**: ✓ Complete

### Notable Changes

**Versions**
- No version bump — still `@arkade-os/boltz-swap@0.3.30`, `@arkade-os/sdk@0.4.26`.

**ServiceWorker half-initialized handler recovery** (commit `2234ab3` — "Recover from half-initialized ArkadeSwaps handler after SW restart")
- Closes a gap exposed by the wallet's restart-recovery path: after a SW restart the message bus can be re-initialized (so PING/PONG works and routing happens) before the page-side `ArkadeSwaps` init payload is re-sent, leaving `handler.handler` undefined. Any non-`INIT` request in that window previously surfaced an opaque generic `Error("handler not initialized")` to callers.
- `src/serviceWorker/arkade-swaps-message-handler.ts`: exports `HANDLER_NOT_INITIALIZED` constant (`"ArkadeSwaps handler not initialized"`) and `HandlerNotInitializedError` class (extends `Error`, `name = "HandlerNotInitializedError"`). The handler now throws the typed error instead of a generic one when `this.handler || this.wallet` is missing.
- `src/serviceWorker/arkade-swaps-runtime.ts`: new `isHandlerNotInitializedError` predicate (structured-clone-safe — matches by message string). The retry loop in `sendMessage` treats `MESSAGE_BUS_NOT_INITIALIZED` and `HANDLER_NOT_INITIALIZED` as a single `recoverable` class, and the existing reinit-and-retry path re-sends the cached `INIT_ARKADE_SWAPS` payload before retrying the original request. Transparent to callers.
- Test coverage: new `arkade-swaps-runtime.test.ts` case "retries after re-initializing when SW returns 'ArkadeSwaps handler not initialized'" — simulates the gap (INIT_ARKADE_SWAPS succeeds, all other requests return the typed error until init is replayed), asserts the runtime re-sends INIT and the original `GET_FEES` request was posted twice.

### Documentation Files Updated
- `docs/projects/boltz-swap/system/project_overview.md` — added "Recent Improvements (post-0.3.30, unreleased)" entry above the 0.3.29 → 0.3.30 block describing the SW handler-recovery fix
- `docs/INDEX.md` — appended SW handler recovery note to the boltz-swap status table row; added matching capability bullet to the boltz-swap **Key Capabilities** list; added `service-worker` / `sw-recovery` tags; added `handler not initialized` / `service worker restart` / `INIT_ARKADE_SWAPS lost` debug triggers
- `docs/projects/boltz-swap/change-log/last-sync.txt` — updated to `d244bc19`

---

## 2026-05-08 — Sync 0.3.28 → 0.3.29

**From**: `4c32983560415c0bfa892533c2d5ac88f3cc6a8b` (release 0.3.28)
**To**: `13cffc1133365a3594fb1d56a25bb20b984070f3` (release 0.3.29)
**Commits Analyzed**: 2 (non-merge)
**Status**: ✓ Complete

### Notable Changes

**Versions**
- `@arkade-os/boltz-swap`: 0.3.28 → 0.3.29
- `@arkade-os/sdk`: 0.4.24 → 0.4.25

**SDK upgrade** (`a3aabf4` — "Upgrade ts-sdk 0.4.25")
- Single-line dependency bump in `package.json` from `0.4.24` → `0.4.25`, plus regenerated `pnpm-lock.yaml`. No source changes in `src/`, no test changes, no API surface changes.

**Misc**
- `chore: release 0.3.29` (`13cffc1`) is a pure version bump in `package.json`. The 0.3.29 cut released the SDK 0.4.25 upgrade.

### Documentation Files Updated
- `docs/projects/boltz-swap/system/project_overview.md` — bumped version to 0.3.29, SDK to 0.4.25; replaced "Recent Improvements" block with 0.3.28 → 0.3.29 (SDK upgrade only)
- `docs/INDEX.md` — bumped boltz-swap status row to v0.3.29 + SDK 0.4.25 (release-only cut on top of 0.3.28); updated boltz-swap **Dependencies** line to SDK 0.4.25
- `docs/projects/boltz-swap/change-log/last-sync.txt` — updated to `13cffc11`
