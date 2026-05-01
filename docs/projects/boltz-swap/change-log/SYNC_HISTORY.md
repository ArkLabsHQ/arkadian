# Boltz Swap Documentation Sync History

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
