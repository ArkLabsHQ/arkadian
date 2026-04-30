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
