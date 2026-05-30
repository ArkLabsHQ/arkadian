# Documentation Sync History - Arkade Regtest

## 2026-05-30 - Sync update
**From**: `dc23da2ce658ac3483fa191282f71982f2ffe239`
**To**: `cd473132e0fcdf82bc709534784abc94d3002163`
**Synced By**: /update-project skill
**Commits Analyzed**: 6

**Upstream commits**:
- `428b4a4` make emulator default-on, opt-out via EMULATOR_IMAGE=
- `f5d8e2d` feat: opt-in emulator overlay for arkade-script
- `d2d307c` show all images in final report
- `0b076bd` makes boltz rescan interval 30 seconds instead of default 300
- `eaea8c0` fix(start-env): always fund ark CLI client wallet via redeem-notes
- `65d6a2d` fix: remove env vars not recognized by arkd

**Changes**:
- `INDEX.md` (project) — Updated intro to mention the arkade-script emulator; added the Emulator row to the Bundled Services table (port `7073`, default-on, opt-out via `EMULATOR_IMAGE=`).
- `system/project_overview.md` — Added emulator to the bundled-services intro, the Self-Contained Stack feature, and the Relationship-to-Other-Ark-Projects list; added a new "Default-On Emulator Overlay" feature subsection; added `docker/docker-compose.emulator.yml` to the repository layout table.
- `system/architecture.md` — Extended the launcher steps to cover the emulator startup (step 10) and the new client-wallet redeem-notes funding (step 9); added a Compose Layer subsection describing the emulator overlay (default-on, ordering after arkd, tmpfs storage); added the Emulator row to the Networking ports table.
- `system/configuration.md` — Removed `ARKD_SCHEDULER_TYPE`, `ARKD_ALLOW_CSV_BLOCK_TYPE`, and `ARKD_ROUND_INTERVAL` from the arkd configuration table (no longer recognized by arkd) with an explanatory note; added a new "Emulator (arkade-script signing service, default-on)" section covering `EMULATOR_IMAGE`, `EMULATOR_PORT`, `EMULATOR_SECRET_KEY`, `EMULATOR_ARKD_URL`, `EMULATOR_LOG_LEVEL`.
- `testing/usage.md` — Added the Emulator endpoint row to the Service Endpoints table; updated the start-flow sequence to reflect the new client-wallet faucet step and the emulator readiness gate.
- `docs/INDEX.md` (master) — Updated description to mention the emulator; added three new key-capability bullets (default-on emulator overlay, CLI client wallet auto-funding via redeem-notes, Boltz `rescanInterval = 30`); added `emulator` and `arkade-script` tags; added emulator-related trigger keywords (`ask_question`, `develop`, `debug`); added `arkade-os/emulator` to the Dependencies list.

**Notes**:
- The emulator overlay is now part of the default stack — downstream projects that don't use arkade-script must explicitly set `EMULATOR_IMAGE=` in their override to keep boot time and surface area unchanged. The change is opt-out, not opt-in, so existing consumers that pull this version get the new service by default (≈5s slower boot, new host port 7073).
- arkd configuration variables `ARKD_SCHEDULER_TYPE`, `ARKD_ALLOW_CSV_BLOCK_TYPE`, and `ARKD_ROUND_INTERVAL` were dropped from `.env.defaults` because current arkd builds no longer recognize them; consumer overrides that still set these are now silently ignored.
- The CLI client wallet is now always funded with 100M sats offchain via `arkd note` / `ark redeem-notes` on the happy path; previously it was only funded in the fallback branch. Falls back to a `WARNING:` log on older arkd versions that don't support `redeem-notes`.
- Boltz `rescanInterval` is now `30` seconds (down from default 300) to make swap pickup snappier in tests; defined inline in `docker/docker-compose.ark.yml` (not configurable via env).
- Cosmetic: `start-env.sh` now prints every image (Boltz, Nginx, LNURL, Wallet, Fulmine, Boltz LND, Emulator) in the final startup banner.

---

## 2026-05-14 - Sync update
**From**: `6333e4b889edad99e3651e62c25875d009adc854`
**To**: `dc23da2ce658ac3483fa191282f71982f2ffe239`
**Synced By**: /update-project skill
**Commits Analyzed**: 1

**Upstream commits**:
- `0e99ff7` update default fulmine image

**Changes**:
- `system/configuration.md` — Bumped `FULMINE_IMAGE` default from `ghcr.io/arklabshq/fulmine:v0.3.21` to `ghcr.io/arklabshq/fulmine:v0.3.23` in the Pinned Image Versions table.
- `INDEX.md` (project) — Bumped Fulmine image tag in the Services / Default Ports table to `v0.3.23`.

**Notes**:
- Single-line `.env.defaults` bump of the default `FULMINE_IMAGE` from `v0.3.21` to `v0.3.23`. Non-breaking image version refresh.
- Master `docs/INDEX.md` not updated — no new capabilities, services, ports, or dependencies; the master entry does not reference specific Fulmine image tags.

---

## 2026-05-08 - Sync update
**From**: `1a10171ead42248d8e8183244ea398e78c47f940`
**To**: `6333e4b889edad99e3651e62c25875d009adc854`
**Synced By**: /update-project skill
**Commits Analyzed**: 1

**Upstream commits**:
- `6333e4b` chore: pin lnurl-server to versioned image 0.1.0

**Changes**:
- `system/configuration.md` — Updated `LNURL_IMAGE` default from `ghcr.io/arklabshq/lnurl-server:main` to `ghcr.io/arklabshq/lnurl-server:0.1.0` in the Pinned Image Versions table.
- `INDEX.md` (project) — Updated the LNURL Server image row in the Services / Default Ports table to the pinned `:0.1.0` tag.

**Notes**:
- Single-line `.env.defaults` change pinning the LNURL server image to a versioned tag (`0.1.0`) instead of the floating `main` tag. Non-breaking; reproducibility improvement.
- Master `docs/INDEX.md` not updated — no new capabilities, services, ports, or images; the master entry does not reference specific image tags for LNURL.

---

## 2026-05-07 - Sync update
**From**: `ed8bf9079bf182bdbc854022e2cd8b35334f97a7`
**To**: `1a10171ead42248d8e8183244ea398e78c47f940`
**Synced By**: /update-project skill
**Commits Analyzed**: 1

**Upstream commits**:
- `cb874ac` clean.sh: also remove dangling docker volumes when --prune is used

**Changes**:
- `testing/troubleshooting.md` — Documented the expanded `clean-env.sh --prune` behavior (now also runs `docker volume prune -f` in addition to `docker image prune -f`) under the Disk space exhaustion section.

**Notes**:
- Single-line change to `clean-env.sh`: when `--prune` is passed, dangling Docker volumes are now removed alongside dangling images. Non-breaking.
- The `--prune` and `--build` flags of `clean-env.sh` remain otherwise undocumented in the project overview / SOPs; left as-is to keep this sync minimal.
- Master `docs/INDEX.md` not updated — no new capabilities, services, ports, or images.

---

## 2026-05-02 - Sync update
**From**: `3ac33b66daf03f8641c11da375e477a8a369b83f`
**To**: `ed8bf9079bf182bdbc854022e2cd8b35334f97a7`
**Synced By**: /update-project skill
**Commits Analyzed**: 3

**Upstream commits**:
- `15b5f17` fix: centralize ark container name via ARK_CONTAINER variable
- `fcef203` fix: align built-in nigiri path with admin API wallet setup
- `179a239` fix: add wallet sync wait to built-in path, document ARK_CONTAINER

**Changes**:
- `system/configuration.md` — Added `ARK_CONTAINER` row to the arkd Image Override table (auto-derived; overridable).
- `system/architecture.md` — Documented `ARK_CONTAINER` derivation in the Environment Layer and noted the unified admin-API wallet setup with 60-attempt sync wait shared by built-in and override paths.
- `testing/troubleshooting.md` — Updated `docker logs` / `docker compose logs` snippets to use `$ARK_CONTAINER` (mode-aware); expanded the zero-balance guidance to mention the new sync-wait loop.
- `docs/INDEX.md` (master) — Added two key-capability bullets: unified wallet setup and centralized `ARK_CONTAINER` override.

**Notes**:
- All three commits are non-breaking refactors / fixes. No new services, ports, or images.
- SDK consumers that previously hard-coded `docker exec ark ...` or `docker exec arkd ...` should consider switching to `$ARK_CONTAINER` for portability across both modes.

---

## 2026-04-30 - Initial Documentation
**Commit**: `3ac33b66daf03f8641c11da375e477a8a369b83f`
**Synced By**: /add-project skill
**Status**: Initial registry entry

**Changes**:
- Added project to Arkadian documentation registry
- Created INDEX.md with default_sections_by_intent and aliases
- Authored system/project_overview.md, system/architecture.md, system/configuration.md
- Authored testing/usage.md, testing/how_to_run.md, testing/how_to_test.md, testing/troubleshooting.md
- Authored sop/development-workflow.md
- Established sync tracking baseline

**Notes**:
- This is the initial sync point
- Future syncs will track commits since this baseline
- Run `arkadian-refresh-docs arkade-regtest` to update after upstream commits
