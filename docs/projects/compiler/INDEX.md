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
A domain-specific language for Bitcoin Taproot contracts with Ivy-like syntax. Contracts define spending paths that compile to two variants per function:
- **Cooperative path** (`serverVariant: true`): user signature + server signature
- **Exit path** (`serverVariant: false`): user signature + timelock (or N-of-N for introspection)

### Contract Structure
```
options { server = key; exit = 144; }
contract Name(pubkey user) {
    function spend(signature userSig) {
        require(checkSig(userSig, user));
    }
}
```

### Data Types
`pubkey`, `signature`, `bytes`, `bytes20`, `bytes32`, `int`, `bool`, `asset`

### Supported Operations
- **Signature verification**: `checkSig`, `checkMultisig`, `checkSigFromStack`, `checkSigFromStackVerify`
- **Hash functions**: one-shot `sha256(data)` (compiles to `OP_SHA256`, accepts concatenation chains like `sha256(a + b + c)`) and streaming SHA256 (`sha256Initialize`, `sha256Update`, `sha256Finalize`)
- **Byte-string ops**: type-dispatched `+` — `OP_CAT` when either operand is bytes-like (`bytes`, `bytes20`, `bytes32`), `OP_ADD64` for pure `int + int`. Int operands on a bytes-mixed `+` are auto-coerced to 8-byte LE via `OP_SCRIPTNUMTOLE64`.
- **Timelocks**: `tx.time >= value`, exit timelock via options
- **Transaction introspection**: `tx.inputs[i]`, `tx.outputs[o]`, `tx.version`, `tx.locktime`, `tx.time` (Bitcoin nLockTime block height), `tx.offchainTime` (TEE wallclock unix seconds, distinct from `tx.time`), `tx.input.current`, `this.activeInputIndex` (emits `OP_PUSHCURRENTINPUTINDEX` directly so on-chain self-vs-sibling checks work in exit tapleaves)
- **Asset introspection**: `tx.inputs[i].assets.lookup()`, `.length`, `[t].assetId`, `[t].amount`
- **Asset groups**: `tx.assetGroups.find()`, `.length`, `[k].sumInputs`, `.sumOutputs`, `.delta`, `.control`, `.isFresh`
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
│  PEG Grammar     │  grammar.pest (559 rules)
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
│  ContractJson    │  ABI functions with asm[], requirements, metadata
│  (compiler/)     │  Each function → cooperative + exit variant
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
