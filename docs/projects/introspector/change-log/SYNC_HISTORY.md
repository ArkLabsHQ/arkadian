# Documentation Sync History - Introspector

## 2026-02-19 12:33:51 - Initial Documentation Setup
**Commit**: `b3a2d9e61f911e3a117b223cc1c101a9bb4969cd`
**Synced By**: /add-project command
**Status**: Baseline established

**Changes**:
- Created project documentation structure
- Added system/project_overview.md
- Added system/architecture.md
- Added system/integration-with-arkd.md
- Added testing/usage.md
- Added testing/api-reference.md
- Added testing/how_to_run.md
- Added testing/how_to_test.md
- Added testing/troubleshooting.md
- Added sop/development-workflow.md
- Established sync tracking baseline

**Notes**:
- This is the initial documentation sync point
- Future syncs will track commits since this baseline
- Use `/update-project introspector` to sync after new commits

---

## 2026-04-29 - Sync from cc962540 to b60e40ad
**Commit**: `b60e40adcde19ddb23221fbf9bb55c0d02e4bfd9`
**Previous**: `cc96254098bbc5119379796227cb957057fb6f82`
**Synced By**: /update-project introspector
**Status**: Updated

**Changes Analyzed** (21 commits):
- New RPC `SubmitOnchainTx` (`POST /v1/onchain-tx`) for signing plain Bitcoin PSBTs whose tapscript carries the introspector's tweaked key; rejects inputs whose closure also contains the `arkd` signer pubkey (`internal/application/onchain.go`).
- Last non-arkd signer flow: in `SubmitTx`, when this introspector is the last required non-`arkd` signer for all matched inputs, it forwards to `arkd`, merges signatures and returns a finalized PSBT (`internal/application/tx.go`, requires `INTROSPECTOR_ARKD_URL`).
- New required env var `INTROSPECTOR_ARKD_URL`; service now embeds a `go-sdk/client/grpc` `arkd` client and caches the arkd signer pubkey at startup (`internal/config/config.go`, `internal/application/service.go`).
- New opcodes `OP_INSPECTPACKET` (`0xf4`) and `OP_INSPECTINPUTPACKET` (`0xf5`) — read raw ARK-extension packet bytes for the current tx or a previous Ark tx (#55, #64).
- New `Introspector Packet` (TLV, type `0x01` inside ARK extension OP_RETURN) defines per-input script + witness payload; with limits (≤1000 entries, script ≤10_000 bytes, witness ≤1_000_000 bytes) (`pkg/arkade/introspector_packet.go`).
- Unified BigNum arithmetic: sign-magnitude LE encoding replaces legacy LE64 arithmetic; new `OP_NUM2BIN` (`0xd7`) / `OP_BIN2NUM` (`0xd8`); CLTV/CSV accept BigNum; `pkg/arkade/bignum.go` + `bignum_test.go` added (#69).
- Asset introspection now pushes amounts as LE64 BigNums with consistent missing-value handling and presence flag on top of stack (#49).
- Negative-index rejection in input/output introspection opcode handlers (panics fixed with explicit checks).
- Hotfix: secret-key negate logic for tweaking with odd-Y pubkeys (`pkg/arkade/tweak.go`); plus odd/even-key roundtrip tests (#46, #48).
- `OP_INSPECTINPUTSCRIPTPUBKEY` now pushes the ArkTx prevout script instead of the checkpoint (#63).
- Tapscript signature verification delegated to `ark-lib` (replaces ~140 lines of local verification in `internal/application/tx.go`) (#73).
- Bumped Go to 1.26.2 (CI, Dockerfile, all `go.mod`s) and `arkd` regtest compose to 0.9.3 (#62, #70).
- New fuzz harnesses: `tokenizer_fuzz_test.go`, `opcode_fuzz_test.go`, `engine_fuzz_test.go` with seed corpora under `pkg/arkade/testdata/fuzz/` (#43).
- New e2e tests: contract identity, batch continuation placeholder, non-interactive HTLC (`test/htlc_test.go`), non-interactive delegate (`test/delegate_test.go`), counter contract (#66, #72, #74).
- Prevout fetcher refactor: unified interface with implementations in `internal/application/prevout.go` for both Ark txs and onchain PSBTs (`PrevoutTxField` PSBT unknown key `"prevouttx"`).
- README rewrite with full opcode tables and Introspector Packet wire-format documentation.

**Files Updated**:
- `docs/INDEX.md` — refreshed introspector description, key capabilities, tags, triggers, dependencies (added go-sdk + ARKD_URL note)
- `docs/projects/introspector/INDEX.md` — Go 1.26+, BigNum, RPC list, `INTROSPECTOR_ARKD_URL`
- `docs/projects/introspector/system/project_overview.md` — packet introspection, BigNum, SubmitOnchainTx, last-signer flow, fuzz tests, ark-lib tapscript verify, `INTROSPECTOR_ARKD_URL`
- `docs/projects/introspector/system/architecture.md` — new application files (onchain.go, prevout.go), refreshed pkg/arkade file list, SubmitTx last-signer flow, SubmitOnchainTx flow
- `docs/projects/introspector/testing/api-reference.md` — SubmitTx last-signer behavior, SubmitOnchainTx endpoint, Introspector Packet wire-format section, Go client `SubmitOnchainTx`
- `docs/projects/introspector/testing/usage.md` — Go 1.26+, required `INTROSPECTOR_ARKD_URL`
- `docs/projects/introspector/sop/development-workflow.md` — Go 1.26+, fuzz test commands

---

## 2026-05-02 - Sync from b60e40ad to 697f94f4
**Commit**: `697f94f40245fc8a4b564f85de1712b531fe662b`
**Previous**: `b60e40adcde19ddb23221fbf9bb55c0d02e4bfd9`
**Synced By**: /update-project introspector
**Status**: Sync tracking only — no documentation updates required

**Changes Analyzed** (1 commit):
- `test: htlc script v2` (#76) — refresh of `test/htlc_test.go` only; no production code touched.
  - `enforcePayTo` arkade script no longer hardcodes the contract amount or requires a witness-supplied output index. The script now reads the index via `OP_PUSHCURRENTINPUTINDEX` and asserts `output[i].value >= input[i].value` with `OP_GREATERTHANOREQUAL` instead of `OP_EQUAL` against a fixed amount.
  - Arkade witness is now empty (`wire.TxWitness{}`); claim/refund condition witnesses unchanged.
  - New `claim_multiple` subtest exercises a single taker batch-claiming `numHTLCs=3` HTLCs in one ark tx, with inputs and outputs paired by index.

**Files Updated**:
- `docs/projects/introspector/change-log/last-sync.txt` — bumped to `697f94f4`
- `docs/projects/introspector/change-log/SYNC_HISTORY.md` — this entry

**Notes**:
- No production behavior or API surface changed; per smart-update detection (test-only commit) no project_overview / architecture / api-reference / INDEX updates were required.
- `docs/projects/introspector/testing/how_to_test.md` test list remains stale (does not enumerate `htlc_test.go`, `delegate_test.go`, `counter_contract_test.go`, etc.) — pre-existing drift outside the scope of this sync.
