# Documentation Sync History - Arkade Regtest

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
