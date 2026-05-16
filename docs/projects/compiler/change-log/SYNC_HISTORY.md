# Documentation Sync History - Arkade Compiler

## 2026-05-16 - Validation Layer, Generalised Testing & StabilityVault Contracts
**Commit Range**: `c6ab1589` → `b479765b`
**Synced By**: /update-project compiler
**Status**: Major feature additions

**Commits Analyzed** (2):
- `b479765` feat: add compiler validation layer and generalized testing (#25)
- `43d9036` Add StabilityVault contract and comprehensive PRD (#28)

**Changes**:

**PR #25 — Validation Layer**
- New `src/validator/mod.rs` (~645 lines) with two passes:
  - `validate_ast()`: pre-compilation semantic checks (duplicate function/parameter names, empty contract name, missing `options.exit` when `options.server` is set, non-positive literal timelocks, CashScript-style require-guard warning).
  - `validate_output()`: post-compilation structural checks (non-empty `contractName`/`functions`, non-empty `asm`/`witnessSchema`, both `serverVariant` variants present, BSST-style `OP_IF`/`OP_ELSE`/`OP_ENDIF` balance, well-formed `<placeholder>` tokens, no empty instructions, placeholder consistency against `witnessSchema` + `constructorInputs`).
- Issues exposed as `Vec<ValidationIssue>` with `Severity::{Error,Warning}` and a `has_errors()` helper.
- New integration tests: `asm_structural_test.rs`, `compilation_roundtrip_test.rs`, `type_system_test.rs`, `validation_error_test.rs`.
- New `src/typechecker/` and `src/opcodes/` modules (referenced by compiler).

**PR #28 — StabilityVault contract suite**
- New examples folder `examples/stability/` with `price_beacon.ark`, `stability_vault.ark`, `stability_offer.ark` (BTC-collateralised USD position system).
- Deleted: `examples/beacon.ark`, `examples/stable_position.ark`, `examples/price_beacon.ark` (top-level — superseded by `examples/stability/`).
- `PriceBeacon` redesigned: dual-asset (`ticker` + `clock`), monotonic block-height clock (`>=` allows sub-block oracle cadence), 24h staleness window (144 blocks).
- Project-wide convention enforcement (now codified in repo `CLAUDE.md`):
  - Taproot dust = 330 sats (was 546).
  - `options { server = server; exit = exit; }` mandatory; `int exit` constructor parameter.
  - Server key never appears in constructor — injected via `<SERVER_KEY>`.
  - "ASP"/"ARK" → "Arkade" throughout.
  - `tx.time` and beacon `clock` interpreted as Bitcoin block height (not unix seconds).
- Parser/compiler/models: `exit_timelock` and `renewal_timelock` changed from `Option<u64>` to `Option<String>`; parser accepts identifiers as well as integer literals; compiler emits `<exit>` placeholder for identifier-valued timelocks, integer literal otherwise.
- Playground updates: `generate_contracts.sh` now scans `examples/` recursively; Monaco snippet uses `exit = exit`; `main.js` references the new `stability/*` contracts.
- New PRD added in repo: `docs/stability-vault-prd.md` (out-of-scope for Arkadian docs registry).

**Documentation Updates**:
- `system/project_overview.md` — added Semantic Validation section, updated project structure to include `validator/`, `typechecker/`, `opcodes/`, and `examples/stability/`; raised test count to 21.
- `system/architecture.md` — pipeline diagram updated to four stages (parser → AST + `validate_ast` → compile → `validate_output`); added Stage 2.5 and Stage 4 sections; expanded testing architecture list.
- `testing/how_to_test.md` — added Validation & Structural tests group; updated test count to 21; canonical convention applied to the writing-new-tests example (`server = server; exit = exit;` with `int exit` constructor param).
- `INDEX.md` — example contracts table updated (`bare.ark` → `single_sig.ark`, removed `beacon.ark`, added `payment_auth.ark`, `threshold_multisig_htlc.ark`, and the three `stability/` contracts); architecture description reflects four-stage pipeline.
- Master `docs/INDEX.md` — compiler entry: description and Key Capabilities updated for the validation layer and identifier-valued timelocks; added `validator` and `typechecker` tags; added `stability vault`, `validator rule`, `validation error`, `validation warning` triggers.

**Notes**:
- ABI shape unchanged for existing contracts; identifier-valued timelocks emit a new `<exit>` placeholder consumers must resolve.
- Validation warnings are non-fatal; errors halt compilation.

---

## 2026-04-29 - PR Preview Workflow & Deployment Pipeline Simplification
**Commit Range**: `cdd36252` → `c6ab1589`
**Synced By**: /update-project compiler
**Status**: CI/CD workflow update

**Commits Analyzed** (1):
- `c6ab158` Add PR preview workflow and simplify deployment pipeline (#27)

**Changes**:
- `.github/workflows/deploy-playground.yml` — switched master deploy from the GitHub Pages API to `JamesIves/github-pages-deploy-action@v4` targeting the `gh-pages` branch root, with `clean-exclude: pr-previews/` to preserve open PR previews. Added a step to delete `playground/.gitignore` before deploy so generated `pkg/` and `contracts.js` are included (fixes 404s caused by `git add --all` silently skipping ignored files).
- `.github/workflows/pr-preview.yml` (new) — builds the playground on each PR push (`opened`, `synchronize`, `reopened`) and deploys to `pr-previews/pr-{number}/` on `gh-pages`. Posts/updates a bot comment with the preview URL `https://arkade-os.github.io/compiler/pr-previews/pr-{number}/`. On PR close, removes the preview subdirectory from `gh-pages`.

**Documentation Updates**:
- `sop/development-workflow.md` — documented PR preview behaviour and the master deploy pipeline under the Git workflow section.

**Notes**:
- No source, grammar, compiler, or test changes — CI/CD only.
- No impact on language semantics, ABI, or `arkadec` CLI behaviour.
- Master `docs/INDEX.md` compiler entry unchanged (no capability changes).

---

## 2026-02-19 - Initial Documentation Setup
**Commit**: `3afdd1bf296f0e253900fa9dd2df5575007b0701`
**Synced By**: /add-project command
**Status**: Baseline established

**Changes**:
- Created project documentation structure
- Added system/project_overview.md
- Added system/architecture.md
- Added testing/usage.md
- Added testing/how_to_run.md
- Added testing/how_to_test.md
- Added testing/troubleshooting.md
- Added sop/development-workflow.md
- Established sync tracking baseline

**Notes**:
- This is the initial documentation sync point
- Future syncs will track commits since this baseline
- Use `/update-project compiler` to sync after new commits
