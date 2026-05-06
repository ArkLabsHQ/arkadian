# Documentation Sync History - Simple Enclave

## 2026-05-06 - Release v0.0.75 + migration outcome + CLI hardening
**From**: `3ec84838b683c1ebb9da4bac942ba1736db1b8c6`
**To**: `a008c3fc89f27e9821e5c7bb4f49ee947b2c59dd`
**Synced By**: /update-project enclave
**Status**: Documentation updated — runtime API, migration model, CLI flags, build targets

**Commits Analyzed** (8):
- `a008c3f` release v0.0.75 (bumps `cli/runtime-hashes.json` to v0.0.75)
- `04b0816` refactor(docs): operations guide + README verification process; tofu staging migration-proof SSM params
- `393895a` refactor(migration): explicit commit/abort outcome via `/v1/enclave-info` (`migration.{state,reason}`); supervisor polls `/v1/enclave-info` instead of SSM; `handleMigrate` decomposed into focused step helpers; rollback test uses wrong target PCR0 instead of wrong baked previous_pcr0; 503 body drops `init_failed`
- `7ad959b` fix(runtime): improve `/v1/enclave-info` handling during initialization
- `a38e526` refactor(cli): tofu `eif_etag` triggers use `data.local_file.X.content_md5` (apply-time)
- `841a58d` refactor: drop `previous_pcr0` variable + wiring from enclave tofu module
- `08bf164` refactor(migration): stage chain proof in SSM (`/Migration/PreviousPCR0[Attestation]`); rename `/v1/export-key` → `/v1/start-migration`; runtime classifies role and runs `PromoteToPrimary`/`AbortOrphaned`; typed `ParamPrefix` replaces magic-string SSM prefixes; drop runtime baked-`previous_pcr0` validation
- `89b5c23` fix: harden CLI for cross-repo use (`verify`/`log`/`trace`/`metrics` take `--base-url`/`--instance-id`/`--region` directly, no `enclave.yaml` lookup); 79-byte UserData parser for nitriding v1.4.2; bare `<root>/enclave.yaml` layout; tofu hardening (`ignore_changes=[ami]`, content_md5 etags, expected_pcr0 from pcr.json)

**Documentation Updates**:
- `system/architecture.md` — locked-key migration steps rewritten to reflect staging chain proof, `PromoteToPrimary`/`AbortOrphaned`, supervisor polling `/v1/enclave-info` for terminal state; PCR0 chain section notes `"genesis"` default and runtime no longer enforcing baked previous_pcr0; file map note on typed `ParamPrefix`
- `system/project_overview.md` — locked-key migration capability rewritten; PCR0 chain capability updated for `"genesis"` and dropped runtime validation
- `testing/api-reference.md` — `/v1/enclave-info` now lists `migration: {state, reason}` and `previous_pcr0` `"genesis"` default; new section describing the `migration` field; 503 body documented; `/v1/export-key` row renamed to `/v1/start-migration` with staging-paths description
- `testing/usage.md` — bare `<root>/enclave.yaml` layout note
- `testing/how_to_run.md` — new "Read-only CLI commands (cross-repo)" section covering flag-driven `verify`/`log`/`trace`/`metrics`
- `testing/troubleshooting.md` — new entry for `migration.state == "aborted"` outcome
- `sop/development-workflow.md` — `make test-rebuild` target documented; clarified `make test-run` no longer rebuilds image
- `INDEX.md` (project) — Architecture diagram bullet updated to `/v1/start-migration`
- `INDEX.md` (master) — enclave entry's locked-key migration + PCR0 chain capabilities updated

## 2026-05-02 - Release v0.0.74
**From**: `efb54d63cdd906785e8956dfc5277ac76ae56510`
**To**: `3ec84838b683c1ebb9da4bac942ba1736db1b8c6`
**Synced By**: /update-project enclave
**Status**: Sync tracking updated; no documentation changes required

**Commits Analyzed** (1):
- `3ec8483` release v0.0.74

**Changes**:
- `cli/runtime-hashes.json`: bumped pinned SDK rev `v0.0.73` → `v0.0.74` and refreshed `hash` (vendor_hash unchanged)

**Documentation Updates**: none
- Release-only commit (no source, architecture, API, or build changes)
- No version pin tracked in docs to bump
- Master `docs/INDEX.md` enclave entry already current

## 2026-04-30 - Initial Documentation Setup
**Commit**: `efb54d63cdd906785e8956dfc5277ac76ae56510`
**Synced By**: /add-project enclave
**Status**: Baseline established

**Changes**:
- Created project documentation structure
- Added system/project_overview.md
- Added system/architecture.md
- Added testing/usage.md
- Added testing/api-reference.md
- Added testing/how_to_run.md
- Added testing/how_to_test.md
- Added testing/troubleshooting.md
- Added sop/development-workflow.md
- Established sync tracking baseline
- Added project entry to docs/INDEX.md (registry, dependency graph, correlation matrix, technology groupings)

**Notes**:
- This is the initial documentation sync point
- Future syncs will track commits since this baseline
- Use `/update-project enclave` to sync after new commits
- Repository: ArkLabsHQ/enclave (Go module path: github.com/ArkLabsHQ/introspector-enclave)
