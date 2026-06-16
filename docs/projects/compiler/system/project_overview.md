# Project Overview — Arkade Compiler

## What is the Arkade Compiler?

The Arkade Compiler (`arkadec`) is a Rust-based compiler that transforms Arkade Language source code (`.ark` files) into JSON artifacts containing Bitcoin Taproot script assembly. It enables developers to write expressive smart contracts in a high-level, Ivy-like syntax that compiles to scripts executable by the Arkade Virtual Machine.

The compiler is a critical piece of the Arkade OS stack: contracts written in Arkade Language are verified and executed inside Trusted Execution Environments (TEEs) and signed by the Arkade Signer, ensuring verifiable and tamper-proof execution.

## Core Features

### Language Features
- **Ivy-like syntax** for intuitive Bitcoin contract development
- **8 data types**: `pubkey`, `signature`, `bytes`, `bytes20`, `bytes32`, `int`, `bool`, `asset`
- **Options block**: Configure server key, exit timelock, renewal timelock per contract
- **Internal functions**: Helper functions that don't create spending paths
- **Custom error messages** in `require()` statements
- **Control flow**: `if/else` conditionals and `for` loops (compile-time unrolled)
- **Array types**: `pubkey[]`, `signature[]` with automatic flattening

### Cryptographic Primitives
- `checkSig` / `checkMultisig` / `checkSigFromStack` / `checkSigFromStackVerify`
- One-shot `sha256(data)` (compiles to `OP_SHA256`) and streaming SHA256 (`sha256Initialize`, `sha256Update`, `sha256Finalize`). Accepts concatenated arguments — e.g. `sha256(ticker + price + time)` — so an oracle message can be reconstructed in a single hash step.
- `ecMulScalarVerify` (EC scalar multiplication)
- `tweakVerify` (Taproot key tweaking)

### Byte-string Operations
- **Type-dispatched `+`**: when at least one operand resolves to a bytes-like type (`bytes`, `bytes20`, `bytes32`), `+` compiles to `OP_CAT` (concatenation) instead of `OP_ADD64`. An `int` operand on either side is auto-coerced with `OP_SCRIPTNUMTOLE64` so on-chain and off-chain hashing remain byte-identical. Pure `int + int` keeps the existing arithmetic semantics. Implemented via a bottom-up rewrite pass over the AST that calls `typechecker::infer_type()` before emission.

### Transaction Introspection
- Input/output value, scriptPubKey, sequence, outpoint, nonce, issuance
- Transaction-level: version, locktime, numInputs, numOutputs, weight
- Two clocks: `tx.time` (Bitcoin nLockTime block height) and `tx.offchainTime` (TEE wallclock unix seconds) — emitted as runtime placeholders. `tx.offchainTime` enables per-second funding accrual and freshness windows independent of block cadence.
- Current input: `tx.input.current.value`, `.scriptPubKey`, `.sequence`, `.outpoint`
- `this.activeInputIndex`: compiles directly to `OP_PUSHCURRENTINPUTINDEX` (not a placeholder), so exit tapleaves can enforce self-vs-sibling input identification on chain (used by `StabilityVault.merge` to distinguish the two vaults being consolidated).

### Asset Introspection
- Per-input/output asset lookup, count, and indexed access (assetId, amount)
- Asset groups: find, length, sumInputs, sumOutputs, delta, control, metadataHash, isFresh
- Per-group IO access with numInputs/numOutputs

### Compilation Model
Each non-internal function compiles to **two variants**:
1. **Cooperative path** (`serverVariant: true`): Original script + server signature check
2. **Exit path** (`serverVariant: false`): Original script + timelock OR N-of-N multisig (when introspection opcodes are used)

The N-of-N exit list is built by walking each function's AST and classifying every `pubkey` identifier as **tx-signing** (used inside `checkSig` / `checkMultisig`) or **data-signing** (used only inside `checkSigFromStack` / `checkSigFromStackVerify`). Data-only pubkeys — typically oracle keys like Stork — are **excluded** from the exit-leaf signature chain, because oracles publish signatures over byte strings and do not co-sign L1 transactions. This keeps oracle-using contracts (e.g. `StabilityVault`) exitable via pre-signed unwind templates with just the human counterparties' signatures.

### Semantic Validation
A dedicated `validator` module runs two passes around compilation, producing `ValidationIssue` entries with `Error` / `Warning` severity:

1. **AST validation** (`validate_ast`, pre-compilation): catches semantic errors the PEG grammar cannot express — duplicate function/parameter names, empty contract name, missing `options.exit` when `options.server` is set, non-positive literal timelocks, and a CashScript-style **require-guard warning** when a non-internal function contains no `require()` statements. Three further binding-hygiene checks run here:
   - **Immutable constructor parameters** (`check_ctor_assignment`): rejects any `name = expr;` reassignment where `name` is a constructor parameter (recurses into `if/else` and `for` bodies). Constructor parameters are read-only.
   - **Scope shadowing** (`check_shadowing` / `walk_scope`): rejects a function parameter that shadows a constructor parameter, a `let` binding or loop variable that shadows any name still live in an enclosing lexical scope, and a `for (x, x)` loop whose index and value variables are identical. Sibling `if`/`else`/`for` blocks each push their own frame, so they don't conflict with one another.
   - **Emitted-namespace collisions** (`check_expanded_namespace`): for every non-internal function, the names that constructor and function parameters contribute to the *emitted* placeholder namespace — after array flattening (`name_0`, `name_1`, …), asset-ID decomposition (`_txid` + `_gidx`), and the unconditionally-appended `serverSig` — must be unique. Distinct source names can still collide here (e.g. `int[] xs` vs `int xs_0`, or a parameter literally named `serverSig` when a server key is set). The N-of-N exit `{pubkey}Sig` names are intentionally *not* reserved, since the emitter deduplicates them by name against existing signature parameters. Reuses `collect_lookup_asset_ids` / `decompose_constructor_params` from the compiler (now `pub(crate)`) so the check mirrors the emitter exactly.
2. **Output validation** (`validate_output`, post-compilation): asserts compiler-output invariants — non-empty `contractName`, every function variant has non-empty `asm` and `witnessSchema`, both `serverVariant=true` and `serverVariant=false` exist per function, BSST-style ASM structure analysis (balanced `OP_IF`/`OP_ELSE`/`OP_ENDIF`, well-formed `<placeholder>` tokens, no empty instructions), and CashScript-style placeholder consistency (every `<name>` resolves against `witnessSchema` or `constructorInputs`).

Timelocks (`exit`, `renew`) accept both integer literals (`exit = 144`) and constructor parameter identifiers (`exit = exit`); the latter emits a `<exit>` placeholder resolved at deploy time.

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Language | Rust (edition 2021) |
| Parser | pest PEG parser generator |
| Serialization | serde + serde_json |
| CLI | clap (derive) |
| Timestamps | chrono |
| Testing | Rust std tests + tempfile + assert_fs + predicates |

## Use Cases

1. **VTXO Smart Contracts**: Define custom spending conditions for Virtual Transaction Outputs
2. **DeFi Protocols**: Build lending (Fuji Safe), swaps, and vault contracts on Ark
3. **NFT/Token Minting**: Create asset-aware contracts with introspection
4. **Multi-party Contracts**: HTLC, threshold oracles, multi-signature schemes
5. **Protocol Development**: Design and test new Arkade Script opcodes and patterns

## Project Structure

```
compiler/
├── Cargo.toml                  # Package manifest (v0.1.0)
├── README.md                   # Language reference and examples
├── src/
│   ├── main.rs                 # CLI entry point (arkadec)
│   ├── lib.rs                  # Library entry point (compile fn)
│   ├── parser/
│   │   ├── mod.rs              # AST builder from pest pairs
│   │   ├── grammar.pest        # PEG grammar (559 lines)
│   │   └── debug.rs            # Debug utilities
│   ├── models/
│   │   └── mod.rs              # AST types (Contract, Function, Statement, Expression)
│   └── compiler/
│       └── mod.rs              # AST → JSON compilation (1859 lines)
├── validator/
│   └── mod.rs              # AST + output validation passes (ValidationIssue, Severity)
├── typechecker/            # Type system for AST expressions (ArkType)
├── opcodes/                # Opcode constants module
├── examples/               # 12+ .ark contract examples with compiled JSON
│   ├── stability/          # BTC-collateralised USD position contracts (oracle-signed witness)
│   │   ├── stability_vault.ark
│   │   └── stability_offer.ark
│   ├── options/            # Rysk-faithful single-locked physical options (no oracle)
│   │   ├── covered_call.ark
│   │   └── cash_secured_put.ark
│   └── bonds/              # Fixed-maturity bond market with margin call + phased lifecycle
│       ├── repayment_pool.ark
│       └── bond_mint.ark
├── tests/                  # 28 integration test files (shared helpers in tests/common/mod.rs)
└── docs/                   # Internal documentation (specs, opcodes, stability.md, options.md, bonds.md design docs)
```

## Security Model

- Contracts execute inside TEEs (Trusted Execution Environments)
- Server signature required for cooperative spending (prevents unauthorized exits)
- Exit paths provide unilateral on-chain exit guarantees with timelocks
- Introspection-using functions get N-of-N fallback exit path (pure Bitcoin, no TEE dependency)
- Asset ID decomposition prevents ID spoofing (txid + gidx separation)
