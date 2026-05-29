# Documentation Sync History - Arkade Compiler

## 2026-05-29 — Terminology cleanup (Ark → Arkade)
**Commit Range**: `63dc58e4` → `4dcfdc3f`
**Synced By**: /update-project compiler
**Status**: No-op for Arkadian registry — in-repo cosmetic change only

**Commits Analyzed** (1):
- `4dcfdc3` docs: use Arkade terminology, remove stray "Ark" protocol references (#36)

**Changes**:
- PR #36 replaces stray "Ark" references with "Arkade" across in-repo files: `README.md` (last paragraph on `<VTXO:...>` placeholder resolution), `docs/ArkadeKitties.md` (title + intro), `docs/arkade-primitives-spec.md` (one comment in StabilityVault ASM), `examples/htlc.ark` / `single_sig.ark` / `threshold_multisig_htlc.ark` (header comments), `playground/codegen.js` (3 user-facing strings), `src/validator/mod.rs` (2 doc-comment lines), `tests/asm_structural_test.rs` (1 string assertion), and the `arkade-bindgen` crate (`ir.rs`, `targets/go.rs`, `targets/typescript.rs`, plus matching test fixtures in `tests/go_test.rs` / `tests/typescript_test.rs` — emitted Go/TS code comments now read "Arkade server" / "Arkade contract instance").
- No grammar, parser, AST, codegen, or validator behaviour changes. No new opcodes, no new contract examples, no new tests.
- Net diff: 14 files, +23/-20 lines.

**Documentation Updates**:
- None. The Arkadian-side compiler docs (`INDEX.md`, `system/project_overview.md`, `system/architecture.md`, `testing/*.md`, `sop/*.md`) already use "Arkade" terminology throughout — no stray "Ark protocol/server/node/runtime/VTXO/contract" references exist to be rewritten.
- Master `docs/INDEX.md` compiler entry is already aligned (description uses "Arkade Script", "Arkade Operator", etc.) — no edits needed.

**Notes**:
- This is the exact case the skill's "Smart Update Detection" rule calls out: an in-repo cosmetic refactor with zero observable impact on the registry. Sync tracking files are updated so the next run starts from `4dcfdc3f`; no Arkadian content files were modified.

---

## 2026-05-23 — Options Contracts (CoveredCall, CashSecuredPut) + Exit-Leaf Pubkey Filtering
**Commit Range**: `d42674e0` → `63dc58e4`
**Synced By**: /update-project compiler
**Status**: New example contracts + new compiler classifier

**Commits Analyzed** (3):
- `501193a` Add CoveredCall and CashSecuredPut option contracts with tests (#33)
- `fc9d168` refactor(options): Rysk-faithful single-locked physical settlement (#35)
- `63dc58e` docs(skills): add writing-arkade-contracts skill for contract authors (#34)

**Changes**:

**PR #33 → PR #35 — Options contracts (net state after refactor)**

The PR #33 initial design (dual-locked, oracle-triggered) was superseded by PR #35 (single-locked, no oracle) after quant clarification of Rysk's actual mechanics. The final state in the tree is the PR #35 form.

- **New example folder `examples/options/`** containing `covered_call.ark`/`.json` and `cash_secured_put.ark`/`.json`. Both contracts faithful to Rysk Finance v12: only the seller's collateral is escrowed at trade execution; the buyer brings the strike payment AT exercise time, IF they choose to exercise.
- **Function shape (4 per contract → 8 tapleaves each)**:
  - `exercise(buyerSig)` — valid in `[expiryHeight, expiryHeight + graceBlocks)`. Buyer-only signature + asset/value checks on outputs. No oracle. CoveredCall: vault holds `btcSats` BTC only; buyer brings `stableAmount` stablecoin inputs. CashSecuredPut: vault holds `stableAmount` stable only; buyer brings BTC inputs.
  - `reclaim(sellerSig)` — valid from `expiryHeight + graceBlocks`. Seller's path when the buyer didn't exercise.
  - `transferSeller(sellerSig, newSellerPk)` / `transferBuyer(buyerSig, newBuyerPk)` — pure key swaps, guarded by `require(tx.time < expiryHeight)` (M8 audit fix).
- **What this gains**: capital efficiency for the MM (no pre-locked strike), no oracle dependency, simpler ASM (no ITM/OTM branching, no oracle message reconstruction).
- **What this trades away**: buyer-liveness requirement (must exercise within grace window or forfeit ITM gain + premium); Operator-down asymmetry mitigated via pre-signed exit templates per `docs/options.md`.
- **In-repo `docs/options.md`** rewritten end-to-end to document the design switch, quant's worked example (including the seller's "Christmas morning" case), funding-buffer guidance, and operator-down risk disclosure.

**PR #33 — Compiler change that persisted into the final state**

- **`src/compiler/mod.rs`: tx-signing vs data-signing pubkey classification.** New helpers `collect_pubkey_usage_in_expr`, `collect_pubkey_usage_in_req`, `collect_pubkey_usage_in_stmts` walk every function's AST and split each `pubkey` identifier into two sets:
  - **tx-signing**: appears in `checkSig` / `checkMultisig` (the pubkey actually co-signs the spending transaction).
  - **data-signing**: appears only in `checkSigFromStack` / `checkSigFromStackVerify` (the pubkey signs a byte-string message, e.g. Stork oracle prices).
- `collect_data_only_pubkeys` computes the per-contract data-only set; `collect_all_pubkeys` filters it out of the exit-leaf pubkey chain.
- **Why**: data-only pubkeys (Stork-style oracles) only publish signatures over byte strings — they don't co-sign L1 transactions on demand, so the conservative "include every pubkey-typed param in the N-of-N exit" rule made the exit path unreachable for any oracle-using contract. Pre-signed unwind templates were therefore unimplementable. Now `StabilityVault` and any other contract that consumes oracle signatures only via `checkSigFromStack` correctly emits an exit leaf containing only the human counterparties' pubkeys.
- Regression test `test_exit_leaf_excludes_oracle_pubkey` (mirrored in `covered_call_test.rs` and `cash_secured_put_test.rs`) locks in the filtering behaviour.

**Tests added**
- `tests/covered_call_test.rs` — 9 tests (compile shape, exercise/reclaim/transfer signature shapes, CLTV bounds, exit-leaf filtering, asset-id decomposition).
- `tests/cash_secured_put_test.rs` — 9 tests, direct mirror of the call.
- Total integration test file count: 23 → 25.

**Playground**
- `playground/main.js`: added an `options` project entry. Auto-generated `playground/contracts.js` already exposed the contracts, but the UI's hard-coded project list needed an explicit entry.

**In-repo skill (PR #34)**
- `.codex/skills/writing-arkade-contracts.md` — guidance for contract authors covering the two-tapleaf model, state-bearing UTXOs via constructor recursion, output layout idioms, witness/introspection patterns, fixed-point arithmetic, grammar gotchas, style conventions, and an authoring-workflow checklist. Registered in `.codex/skills/_index.md` and `CLAUDE.md`. (In-repo author guidance — not surfaced in the Arkadian registry beyond this note.)

**Documentation Updates**:
- `docs/projects/compiler/INDEX.md` — example contracts table now lists `options/covered_call.ark` and `options/cash_secured_put.ark` with the 4-function/8-tapleaf shape and the no-oracle, voluntary-exercise model.
- `system/project_overview.md` — Compilation Model paragraph extended with the tx-signing vs data-signing pubkey-classification rule explaining the new exit-leaf filter. Project structure adds `examples/options/`; test count 23 → 25; in-repo docs note updated to include `options.md`.
- `system/architecture.md` — new "Tx-Signing vs Data-Signing Pubkey Classification" subsection under Key Design Decisions; Testing Architecture entry adds `covered_call_test`/`cash_secured_put_test`; test count 23 → 25.
- `testing/how_to_test.md` — total count 23 → 25; added rows for both new test files; covered_call/cash_secured_put rows describe the 9-test shape (compile shape, CLTV windows, transfer expiry guard, exit-leaf pubkey filter, asset-id decomposition).
- Master `docs/INDEX.md` — compiler entry: new Key Capabilities row for exit-leaf pubkey filtering; new options-primitives row pointing at the Rysk-faithful contracts; tags add `options`, `covered-call`, `cash-secured-put`, `rysk`, `physical-settlement`, `exit-leaf-filter`, `tx-signing-pubkey`; ask_question triggers add `covered call`, `cash secured put`, `options contract`, `rysk`, `physical settlement`, `exercise window`, `reclaim`, `exit leaf pubkey`, `oracle pubkey exit`, `n-of-n exit`; develop triggers add `exit leaf filter`, `pubkey classification`.

**Notes**:
- The options contracts went through several mid-PR design changes (oracle-triggered dual-locked → physical single-locked → back to oracle-triggered → back to single-locked). Only the final form lives in the tree; SYNC_HISTORY captures the net state, not the intermediate forms.
- The PR #33 inverse-oracle `RyskCall` (oracle-settled, BTC-collateralised cash-settled-in-BTC) and the dual-locked oracle-triggered design were both removed before merge of #35. Don't restore them.
- The pubkey-classification compiler change is contract-agnostic; it benefits every oracle-using contract going forward (currently `StabilityVault` and the prior intermediate oracle-driven options form). After PR #35 stripped oracles from the options contracts, they no longer exercise the classifier on `oraclePk` — but the four mirrored regression tests in `covered_call_test.rs` / `cash_secured_put_test.rs` keep the invariant locked in, and `stability_vault` continues to depend on it.
- No grammar, parser, or AST type changes — only `src/compiler/mod.rs` grew the classifier helpers (~200 net added in `mod.rs`). 12 files changed across the three commits (3 in PR #34, 3 + skill index in PR #33, the rest in PR #35), net +3,000 / -1,000 weighted toward the options contract rewrite.

---

## 2026-05-22 — Mutable Funding Rate, Capital Ops, Proportional Fees, `tx.offchainTime`, `merge`
**Commit Range**: `86d9b047` → `d42674e0`
**Synced By**: /update-project compiler
**Status**: StabilityVault redesign + new compiler emission rules

**Commits Analyzed** (1, squash-merge of PR #32):
- `d42674e` feat(stability): mutable funding rate, capital ops, proportional fees (#32)

**Changes**:

**PR #32 — StabilityVault: USD-compound funding, capital management, basis-point fees, merge**

- **Funding model rewrite (sat-additive → USD-compound)**
  - Removed `fundingSatPerBlock` (absolute sat amount, inflated effective APY on partial fills).
  - Intermediate stop: `fundingRatePerBlock` as a signed fixed-point fraction at scale 1e10.
  - Final form: `fundingRatePerSec` at scale 1e12, accrued per second using a new `tx.offchainTime` introspector property.
  - Settlement algebra unified everywhere: `newTargetUSD = targetUSD × (1 + rate × elapsed / 1e12)`. The `/1e12` is interleaved as two `/1e6` steps to keep the intermediate product inside int64 across realistic position sizes.
  - `openHeight` → `openTime` → mutable `lastUpdate` (advances on every funding settle).
  - Freshness window: ≤ 144 blocks (≈24h) → ≤ 600 seconds (10 min).

- **New vault functions** (vault tapleaf count: 12 → 14 → 16 → 20 including merge)
  - `settleAndUpdateFunding(providerSig, newFundingRatePerSec)`: rolls accrued funding into `targetUSD` and sets a new rate. Enforces `newFundingRatePerSec >= 0` (negative would let provider unilaterally drain). Anti-grief guard: when `rate > 0` the call must produce a nonzero delta (prevents sub-truncation-interval ratcheting of `lastUpdate`).
  - `addCapital(providerSig, amount)`: provider tops up collateral. No oracle needed (more collateral is strictly better for the seeker).
  - `removeCapital(providerSig, amount, oraclePrice, oracleTime, oracleSig)`: provider reclaims excess; remaining balance must cover seeker claim at the offer's collateral ratio.
  - `merge(seekerSig, otherIdx, …)`: seeker consolidates two of their own StabilityVaults. Both vaults must agree on seekerPk/providerPk/oraclePk/ticker/collateralRatioPct/exit. Merged vault: `targetUSD = accruedA + accruedB`, `totalCollateral = sum`, `fundingRatePerSec = max(rateA, rateB)`, `seekerExitFee = max(exitFeeA, exitFeeB)`, `lastUpdate = tx.offchainTime`. Position-agnostic — both vaults run their merge tapleaf in the same tx; `this.activeInputIndex` identifies self, witness `otherIdx` points to sibling.

- **Compiler: new direct-emission property**
  - `src/compiler/mod.rs`: `Expression::Property("this.activeInputIndex")` now emits `OP_PUSHCURRENTINPUTINDEX` directly in both `generate_expression_asm` and `emit_expression_asm` paths, instead of an unresolved `<this.activeInputIndex>` placeholder. This lets exit tapleaves enforce self-vs-sibling input identification on chain.
  - All other `tx.*` / `this.*` properties continue to emit `<placeholder>` tokens.

- **Fees: flat sats → basis points (scale 1e4)**
  - `takeFee` (offer-level): `takeFeeSats = userBTC × takeFee / 1e4`. Bounds-checked at `take()` time: `0 <= takeFee <= 10000`.
  - `seekerExitFee` (offer-level, propagated into every opened vault): applied in USD denomination at exit — `seekerRaw = newTargetUSD × (1 − seekerExitFee/1e4) × 1e8 / P`. Bounds-checked: `0 <= seekerExitFee <= 10000` (prevents `(10000 − fee) < 0` from routing all collateral to provider).
  - Dust-fee routing: when `takeFeeSats > 330` the take fee sits at `outputs[1]` and remaining offer at `outputs[2]`; when `takeFeeSats <= 330` (Taproot dust) the fee is rolled into `vault.value` and remaining offer slides to `outputs[1]`. The vault value check becomes `>= totalCollateral + takeFeeSats` on the dust branch.

- **Security guards added in PR review pass**
  - Clock-regression guard `require(tx.offchainTime >= lastUpdate)` in every function computing `elapsed` (`settleAndUpdateFunding`, `seekerExit`, `providerExit`, `removeCapital`) — without it a backward-drifting TEE clock could reverse funding accrual.
  - Fee-bound checks at `take()` time so they propagate into every vault opened from the offer.
  - Stale "144-block freshness check" comment in offer header replaced with current basis-point fee descriptions.

**Documentation Updates**:
- `docs/projects/compiler/INDEX.md` — Supported Operations: added `tx.time` / `tx.offchainTime` distinction and `this.activeInputIndex` (direct `OP_PUSHCURRENTINPUTINDEX` emission); stability_vault row rewritten to enumerate the 8 vault functions, USD-compound funding model, basis-point exit fee, and `merge` semantics; stability_offer row updated for basis-point `takeFee` with dust-routing branch.
- `system/project_overview.md` — Transaction Introspection section: added `tx.offchainTime` (TEE wallclock unix seconds, distinct from block-height `tx.time`) and `this.activeInputIndex` direct emission.
- `system/architecture.md` — new "Direct-Emission Properties" subsection under Key Design Decisions, documenting both the `OP_PUSHCURRENTINPUTINDEX` shortcut and the `tx.offchainTime` runtime-placeholder.
- `testing/how_to_test.md` — stability_vault_test row expanded to mention per-second funding via `tx.offchainTime`, the no-oracle vs oracle-required boundary tests for `settleAndUpdateFunding` / `addCapital` / `removeCapital`, and the `merge` self-vs-sibling check.
- Master `docs/INDEX.md` — compiler entry: introspection bullet now lists both clocks and `this.activeInputIndex`; new tags `offchain-time`, `active-input-index`, `funding-rate`; ask_question triggers add `tx.offchainTime`, `offchain time`, `activeInputIndex`, `merge vault`, `funding rate`, `take fee`, `seeker exit fee`, `basis points`.

**Notes**:
- ABI shape change: StabilityVault adds four new functions (`merge`, `settleAndUpdateFunding`, `addCapital`, `removeCapital`) and the offer / vault constructor parameter lists changed (e.g. `fundingRatePerSec`, `lastUpdate`, `seekerExitFee` on the vault; `takeFee` and `seekerExitFee` on the offer). Consumers of the compiled JSON must update.
- `tx.offchainTime` requires an introspector property the runtime hasn't shipped yet — emission is in the compiler but full exit-tapleaf semantics are out of scope for this PR.
- Test file count unchanged (23); three new tests added inside the existing `stability_vault_test.rs` covering the no-oracle vs oracle-required boundary on the new functions.
- No grammar or parser changes in `grammar.pest` / `parser/mod.rs` — only `src/compiler/mod.rs` gained the `this.activeInputIndex` direct emission. Total diff: 7 files, +2094 / -276.

---

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
