---
project_id: compiler
version: "1.0.0"
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_test.md"]
  dev:        ["system/architecture.md", "testing/how_to_run.md"]
  debug:      ["testing/troubleshooting.md"]
  monitoring: ["testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md"]
  language: ["system/project_overview.md"]
scripts:
  build: "cargo build"
  test: "cargo test"
  clippy: "cargo clippy"
  fmt: "cargo fmt"
  run: "cargo run -- <file.ark>"
---

# Arkade Compiler — Project Index

**compiler** is the Arkade Language compiler that transforms high-level smart contract source code (`.ark` files) into JSON artifacts containing Bitcoin Taproot script assembly. It enables developers to write expressive, stateful contracts in an Ivy-like syntax that compile to scripts executable by the Arkade Virtual Machine inside TEEs.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/compiler/system/` — System Architecture & Components
Core documentation about the Arkade Compiler architecture and design:

- **system/project_overview.md** — What the compiler is, language features, contract types, and use cases
- **system/architecture.md** — Four-stage pipeline (Parser → AST + `validate_ast` → Compile → `validate_output`), PEG grammar, code generation, validator and typechecker modules

### `${ARKADIAN_DIR}/docs/projects/compiler/testing/` — Usage & Operations
Practical guides for using and operating the compiler:

- **testing/usage.md** — Quick start, CLI options, language syntax reference
- **testing/how_to_run.md** — Building from source, running the compiler
- **testing/how_to_test.md** — Test suite overview, running specific tests
- **testing/troubleshooting.md** — Common build and compilation issues

### `${ARKADIAN_DIR}/docs/projects/compiler/sop/` — Standard Operating Procedures
Step-by-step guides for operations:

- **sop/development-workflow.md** — Build, test, and PR workflow

### `${ARKADIAN_DIR}/docs/projects/compiler/tasks/` — Product Requirements & Plans
Feature specifications and implementation tracking.

### `change-log/` — Sync Tracking & History
Documentation sync tracking and change history:

- **change-log/last-sync.txt** — Last synced commit hash
- **change-log/SYNC_HISTORY.md** — History of documentation syncs

### `pr-report/` — Pull Request Summaries
Analysis and summaries of pull requests.

---

## Quick Reference

| Item | Details |
|------|---------|
| **Binary** | `arkadec` |
| **Library** | `arkade_compiler` (Rust crate) |
| **Version** | 0.1.0 |
| **Rust Edition** | 2021 |
| **License** | MIT |
| **Author** | tiero |
| **Input** | `.ark` files (Arkade Language) |
| **Output** | JSON artifact with contract ABI and Taproot script assembly |

## Key Concepts

### Arkade Language
A domain-specific language for Bitcoin Taproot contracts with Ivy-like syntax. A contract compiles to a unified `functions[]` ABI of **spend groups**, each carrying an optional emulator-run `arkade` covenant plus one or more L1 `leaves` (taproot tapleaves):
- **Covenant** (unmodified `function`): emits the arkade ASM executed inside the TEE emulator.
- **Tapleaves** (`tapscript` functions): pure L1 taproot leaves for cooperative signing, hashlocks, and unilateral exit. A covenant function with no matching `tapscript` receives a synthesized default collaborative leaf `checkMultisig([server, tweak(emulator, fn)], [serverSig, emulatorSig], 2)`.

The `options {}` block has been **removed** from the language — cooperative signing, exit, and renewal are expressed via tapscript leaves and `int` constructor params (referenced by `older(...)` / `after(...)` / `tx.time >= ...`).

### Contract Structure
```
contract Name(pubkey user, int exit) {
    // Arkade covenant (cooperative signing = synthesized default leaf).
    function spend(signature userSig) {
        require(checkSig(userSig, user));
    }
    // Unilateral L1 CSV exit leaf.
    function unilateral(signature userSig) tapscript {
        require(older(exit));
        require(checkSig(userSig, user));
    }
}
```

### Tapscript Closures
Each `tapscript` leaf must assemble to one of arkd's 5 closure shapes, with source order `condition? · timelock? · multisig`:
`Multisig`, `CsvMultisig`, `CltvMultisig`, `ConditionMultisig`, `ConditionCsvMultisig`. Multisig is always N-of-N. Reserved key roles `server` → `<SERVER_KEY>` (arkd operator) and `emulator` → `<EMULATOR_KEY:fn>` (emulator key tweaked by `fn`'s covenant hash) may appear only as key operands inside a tapscript; covenant bodies use only the contract's own pubkeys.

### Data Types
`pubkey`, `signature`, `bytes`, `bytes20`, `bytes32`, `int`, `bool`, `asset`

### Supported Operations
- **Signature verification**: `checkSig`, `checkMultisig` (2-arg N-of-N or 3-arg `checkMultisig(keys, sigs, threshold)`), `checkSigFromStack`, `checkSigFromStackVerify`
- **Hash functions**: one-shot `sha256(data)` (compiles to `OP_SHA256`, accepts concatenation chains like `sha256(a + b + c)`) and streaming SHA256 (`sha256Initialize`, `sha256Update`, `sha256Finalize`); tapscript condition hashlocks additionally support `hash160` (`OP_HASH160`), `hash256` (`OP_HASH256`), and `ripemd160` (`OP_RIPEMD160`)
- **Byte-string ops**: type-dispatched `+` — `OP_CAT` when either operand is bytes-like (`bytes`, `bytes20`, `bytes32`), `OP_ADD64` for pure `int + int`. Int operands on a bytes-mixed `+` are auto-coerced to 8-byte LE via `OP_SCRIPTNUMTOLE64`.
- **Byte-slicing / conversion primitives**: `substr(data, offset, size)` (`OP_SUBSTR`), `cat(a, b)` (`OP_CAT`), `bin2num(bytes)` (`OP_BIN2NUM`), `num2bin(num, size)` (`OP_NUM2BIN`), `size(bytes)` (`OP_SIZE OP_NIP`), inline `sha256(data)` — combinable in the `byte_expr_comparison` shape and accepted on the RHS of asset/group/introspection comparisons
- **Packet introspection**: `tx.packet(t)` (`OP_INSPECTPACKET`), `tx.inputs[i].packet(t)` (`OP_INSPECTINPUTPACKET`), `tx.inputs[i].arkadeScriptHash` / `arkadeWitnessHash` (`OP_INSPECTINPUTARKADESCRIPTHASH`), `this.activeBytecode` (`OP_INPUTBYTECODE`)
- **Timelocks**: `tx.time >= value` / `after(value)` (absolute, CLTV); `older(value)` (relative, CSV) for unilateral exit leaves referencing constructor `int` params (no more `options`)
- **Transaction introspection**: `tx.inputs[i]`, `tx.outputs[o]`, `tx.version`, `tx.locktime`, `tx.time` (Bitcoin nLockTime block height), `tx.offchainTime` (TEE wallclock unix seconds, distinct from `tx.time`), `tx.input.current`, `this.activeInputIndex` (emits `OP_PUSHCURRENTINPUTINDEX` directly so on-chain self-vs-sibling checks work in exit tapleaves)
- **Asset introspection**: `tx.inputs[i].assets.lookup(txid, gidx)` (asserts present, returns amount), `.has(txid, gidx)` (Bool presence), `.length`, `[t].assetId`, `[t].amount` — Asset IDs are explicit canonical `(txid, gidx)` pairs with compile-time operand-type/range validation
- **Asset groups**: `tx.assetGroups.find(txid, gidx)`, `.has(txid, gidx)`, `.length`, `[k].sumInputs`, `.sumOutputs`, `.delta`, `.metadataHash`, `.isFresh`; control via `[k].hasControl` (Bool) and `group.controlIs(txid, gidx)` (Bool) — replacing the old `.control ==` struct access
- **Cryptographic primitives**: `ecMulScalarVerify`, `tweakVerify`
- **Conversion**: `neg64`, `le64ToScriptNum`, `le32ToLe64`
- **Control flow**: `if/else`, `for` loops (compile-time unrolled)
- **P2TR constructor**: `new P2TR(internalKey, commitHash)`

### Example Contracts
| Contract | Description |
|----------|-------------|
| `single_sig.ark` | Basic single-signature VTXO |
| `htlc.ark` | Hash Time-Locked Contract |
| `fuji_safe.ark` | DeFi lending with oracle, liquidation, and renewal |
| `nft_mint.ark` | NFT minting with asset introspection |
| `token_vault.ark` | Token vault with asset group validation |
| `fee_adapter.ark` | Fee adapter with value introspection |
| `controlled_mint.ark` | Controlled asset minting |
| `non_interactive_swap.ark` | Non-interactive atomic swap |
| `payment_auth.ark` | Authenticated payment authorisation |
| `arkade_kitties.ark` | CryptoKitties-style collectibles |
| `threshold_oracle.ark` | Multi-oracle threshold signing |
| `threshold_multisig_htlc.ark` | Threshold multisig HTLC |
| `stability/stability_vault.ark` | BTC-collateralised USD position with USD-compound funding (8 functions: transfer, split, merge, settleAndUpdateFunding, addCapital, removeCapital, seekerExit, providerExit — 16 vault tapleaves). Funding accrues as `rate × targetUSD × elapsed / 1e12` per second using `tx.offchainTime`; provider can mutate `fundingRatePerSec` (≥ 0) and capital via signed updates; basis-point `seekerExitFee` carved from payout. Settlement consumes an oracle-signed price witness — `sha256(ticker + price + time)` verified via `checkSigFromStack`. `merge` combines two seeker-owned vaults using `max(rate)` and `max(exitFee)`, identifying self-vs-sibling via `this.activeInputIndex`. |
| `stability/stability_offer.ark` | Non-interactive StabilityVault offer with configurable `collateralRatioPct`, basis-point `takeFee` (sats-routed-to-provider, or rolled into vault.value when dust ≤ 330 sats) and `seekerExitFee` (propagated into every opened vault); `take()` opens a vault at the oracle-signed price with bounds-checked fees (0–10000 bp) |
| `options/covered_call.ark` | Bitcoin-native, single-locked, physically-settled European covered call (Rysk Finance v12 mechanics). Seller locks `btcSats` BTC; buyer pays `strikeAmount` of `stableAssetId` only at exercise time. 4 functions × 2 variants → 8 tapleaves: `exercise(buyerSig)` valid in `[expiryHeight, expiryHeight + graceBlocks)` with asset/value introspection on outputs; `reclaim(sellerSig)` at `expiryHeight + graceBlocks`; `transferSeller`/`transferBuyer` are pre-expiry key-swaps guarded by `require(tx.time < expiryHeight)`. No oracle — buyer's voluntary exercise is the settlement signal |
| `options/cash_secured_put.ark` | Mirror of CoveredCall with sides reversed. Seller locks `stableAmount` of `stableAssetId`; buyer delivers `btcSats` BTC at exercise. Same 4-function/8-tapleaf shape and same exercise/reclaim time windows |
| `bonds/repayment_pool.ark` | Fixed-maturity bond market per-maturity singleton (7 covenant functions, each with a synthesized or explicit tapleaf): `issue`, `acceptRepayment`, `rollOut`, `rollIn`, `liquidate` (pre-maturity margin call), `acceptAuction` (post-maturity default), `redeem` (pro-rata after auction window). 1:1 credit + debit mint against collateral; oracle-priced settlement with `auctionDiscountBps` spread. Four deployment invariants on `issue`/`rollIn` (`initRatioBps > liqThresholdBps`, `liqThresholdBps > 0`, `auctionWindow > 0`, `auctionDiscountBps ∈ [0, 10000)`). Strict-burn equality on every settlement path; ceiling-division collateral floor (`required = (amount × initRatioBps + 9999) / 10000`) prevents dust-mint at the unit boundary. Per-function output-pin conflicts + pool-side borrower signature on `rollOut` block force-liquidation co-spend pairings. |
| `bonds/bond_mint.ark` | Fixed-maturity per-issuance bond vault (4 covenant functions, each with a synthesized or explicit tapleaf): `repay` (pre-maturity, borrower-signed), `liquidate` (pre-maturity, permissionless margin call), `auction` (post-maturity, permissionless), `roll` (pre-maturity, borrower-signed authorisation that burns the old debit and releases collateral for a same-tx `rollIn`). Phase-gated time windows match the pool side; strict-equality debit burn. |
| `layerzero/endpoint.ark` | LayerZero Endpoint state with `receive()` + `send()` transitions. Verifies 2-of-2 DVN attestation (`checkSigFromStackVerify` over the canonical receive hash), checks packet version/size/route fields via `substr(tx.packet(t), …)`, binds the DVN attested hash to `sha256(substr(LzReceive, …))`, mints/burns receive & send markers. Packet-native — expresses the full `builders.go` Go-script semantics on chain. |
| `layerzero/oapp.ark` | USDT0 OApp state with `receive()` + `send()` transitions. Reads `LzReceive` from `tx.inputs[0].packet(...)`, pins the recipient output's scriptPubKey to a `CreditMessage` byte slice, credits/burns USDT0 by `bin2num(substr(packet, …))`, and consumes/emits markers. |
| `layerzero/receive_marker.ark` / `layerzero/send_marker.ark` | Endpoint↔OApp invocation markers: pin `this.activeInputIndex` and `tx.inputs[i].arkadeScriptHash` to the consuming contract, with control-asset singleton defense-in-depth. |

## Technology Stack

- **Language**: Rust 2021 edition
- **Parser**: [pest](https://pest.rs/) PEG parser generator
- **Serialization**: serde + serde_json
- **CLI**: clap (derive)
- **Timestamps**: chrono

## Architecture Overview

```
┌─────────────────┐
│  .ark Source     │  Arkade Language source file
└────────┬────────┘
         │ parse()
         ▼
┌─────────────────┐
│  PEG Grammar     │  grammar.pest (752 lines)
│  (pest parser)   │
└────────┬────────┘
         │ build_ast()
         ▼
┌─────────────────┐
│  AST             │  Contract, Function, Statement, Expression, Requirement
│  (models/)       │
└────────┬────────┘
         │ compile()
         ▼
┌─────────────────┐
│  ContractJson    │  functions[] spend groups: { name, arkade?, leaves[] }
│  (compiler/)     │  Covenant ASM + L1 tapleaves (compiler/tapscript.rs)
└────────┬────────┘
         │ serde_json
         ▼
┌─────────────────┐
│  JSON Output     │  Ready for Bitcoin Taproot libraries
└─────────────────┘
```

## Integration Points

- **arkd**: The Arkade server uses compiled contract artifacts to build VTXO Taproot trees
- **introspector**: Validates and co-signs contracts with Arkade Script opcodes inside TEEs
- **rust-sdk**: Can load compiled JSON artifacts for client-side contract interaction
- **wallet**: Presents contract parameters to users for signing
