# Documentation Sync History - Arkade Compiler

## 2026-05-20 — Oracle-Signed Price Witness, OP_CAT, One-Shot SHA256
**Commit Range**: `b479765b` → `86d9b047`
**Synced By**: /update-project compiler
**Status**: Language feature + StabilityVault redesign

**Commits Analyzed** (1, squash-merge of PR #31):
- `86d9b04` feat(stability): replace on-chain beacon with oracle-signed price witness (#31)

**Changes**:

**PR #31 — Oracle-signed price witness + type-dispatched `+`**
- **Language: `OP_CAT` via type-dispatched `+`**
  - `src/opcodes/mod.rs`: added `OP_CAT` constant.
  - `src/models/mod.rs`: new `Expression::Concat { left, right, coerce_left, coerce_right }` and `Expression::Sha256 { data }` variants. The `coerce_*` flags tell the emitter to insert `OP_SCRIPTNUMTOLE64` on a side that is an integer, so mixed `bytes + int` writes the int as fixed 8-byte LE before `OP_CAT` (on-chain and off-chain hashing remain byte-identical).
  - `src/parser/grammar.pest`: `sha256_func` now accepts `additive_expr` so concatenation chains parse inside the one-shot hash form (`sha256(a + b + c)`).
  - `src/parser/mod.rs`: `Rule::sha256_func` in expression context now produces a real `Expression::Sha256 { data }` (was a placeholder `Expression::Property`).
  - `src/compiler/mod.rs`: bottom-up AST rewrite pass walks each function with a `Scope`, converting `BinaryOp { op: "+" }` into `Concat` whenever either operand resolves to bytes-like. Pure `int + int` stays as `OP_ADD64`.
  - `src/typechecker/mod.rs`: `Scope` and `build_scope` promoted to `pub`. `infer_type` recognises `Concat`/`Sha256` and the bytes-aware `+` rule. New `is_bytes_like` and `needs_scriptnum_to_le64` helpers.
- **Contracts: PriceBeacon UTXO retired**
  - `examples/stability/price_beacon.ark` and `price_beacon.json` **deleted**.
  - `stability_vault.ark` and `stability_offer.ark` rewritten to consume an **oracle-signed price witness** at settlement time. Oracle signs `sha256(ticker || price || timestamp)` (price/time as 8-byte LE unsigned ints); contract verifies with `checkSigFromStack(oracleSig, oraclePk, sha256(ticker + oraclePrice + oracleTime))` — reconstructed on-stack via the new bytes-aware `+`.
  - Freshness: `tx.time - oracleTime <= 144` blocks (≈24 h) **and** `oracleTime - tx.time <= 0` (rejects future-dated signatures) — added in `seekerExit`, `providerExit`, and `StabilityOffer.take`.
  - StabilityVault function renames: `seekerRedeem` → `seekerExit` (parity with `providerExit`).
  - `transfer` and `split` confirmed pure key-swaps (no oracle call); `test_vault_transfer_is_pure_keyswap` and `test_vault_split_is_pure_keyswap` guard the invariant.
- **Docs in repo**
  - `docs/stability-vault-prd.md` **deleted**; replaced by `docs/stability.md` (concise "How It Works" with oracle model section).
  - `CLAUDE.md`: 2026-05-19 decisions added — oracle-signed price witness pattern, type-dispatched `+` semantics, and the directive not to restore `price_beacon.ark`.
- **CI**
  - `.github/workflows/deploy-playground.yml`, `pr-preview.yml`: switched from `cargo install wasm-pack` (compiles from source, >1 min) to `jetli/wasm-pack-action` (prebuilt binary, seconds).
- **Tests**
  - New `tests/concat_op_test.rs`: bytes-vs-int dispatch, `OP_SCRIPTNUMTOLE64` coercion, pure `int + int` stays `OP_ADD64`.
  - New `tests/stability_vault_test.rs`: asserts `OP_CAT` + `OP_SHA256` instead of streaming opcodes; covers settlement paths and the no-oracle invariant for `transfer`/`split`.
  - `tests/compilation_roundtrip_test.rs` updated for the new contract shapes.

**Documentation Updates**:
- `system/project_overview.md` — added a **Byte-string Operations** section; rewrote SHA256 entry to highlight one-shot `sha256(data) → OP_SHA256` accepting concatenation chains; removed `stability/price_beacon.ark` from project structure; test count 21 → 23; doc folder note updated (`stability.md` replaces `stability-vault-prd.md`).
- `system/architecture.md` — AST table now lists `Concat` and one-shot `Sha256` variants; added a new pipeline step "Bytes-aware `+` rewrite pass" before code generation, describing the bottom-up walk with `Scope` and the per-side `coerce_left`/`coerce_right` flags; testing architecture updated with `concat_op_test` and `stability_vault_test`; total test count 21 → 23.
- `testing/how_to_test.md` — total count 21 → 23; added `concat_op_test.rs` and `stability_vault_test.rs` rows; `beacon_test.rs` description trimmed (no longer references the deleted production `PriceBeacon` file).
- `sop/development-workflow.md` — stale PR checklist count corrected from 15 → 23.
- `docs/projects/compiler/INDEX.md` — Supported Operations now lists one-shot `sha256(...)` with concat support and a new **Byte-string ops** entry for the type-dispatched `+`; example contracts table drops `stability/price_beacon.ark`; `stability_vault.ark` and `stability_offer.ark` rows updated to mention the oracle-signed witness model and `seekerExit`/`providerExit` naming.
- Master `docs/INDEX.md` — compiler entry: description expanded to mention the bytes-aware `+` rewrite pass and oracle-signed witness use case; added Key Capabilities rows for type-dispatched `+` and one-shot `sha256`; tags add `op-cat`, `byte-concat`, `oracle-witness`; new triggers (`op_cat`, `byte concatenation`, `oracle signed`, `oracle witness`, `concat`).

**Notes**:
- Existing `int + int` arithmetic semantics unchanged. Compilation is backward-compatible for contracts that never mix bytes with `+`.
- StabilityVault ABI changed: `seekerRedeem` is gone (renamed to `seekerExit`). Consumers of the compiled JSON must update by function name.
- The on-chain PriceBeacon UTXO is no longer required for stability flows — operators do not need to maintain or pass through a beacon output.
- `playground/contracts.js` is regenerated from `examples/**/*.ark` via `./playground/generate_contracts.sh`; the playground build now uses the prebuilt `wasm-pack` action.

---

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
