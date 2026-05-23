# Architecture — Arkade Compiler

## High-Level Architecture

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  .ark Source │──▶│  PEG Parser  │──▶│  AST + Valid │──▶│  Compile +   │──▶│  JSON Output │
│  (Arkade)    │   │  (pest)      │   │  (validator) │   │  Output Valid│   │  (Contract)  │
└──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
     Input            Stage 1             Stage 2            Stage 3            Stage 4
                   Tokenize+Parse     AST + validate_ast  Codegen + validate_output
```

## Four-Stage Pipeline

### Stage 1: Parsing (`src/parser/`)

The parser uses [pest](https://pest.rs/), a PEG (Parsing Expression Grammar) parser generator for Rust. The grammar is defined in `grammar.pest` (559 lines) and covers:

- Contract structure: `options {}`, `contract Name(params) { functions }`
- Statements: `require`, `let`, `if/else`, `for`, variable assignments
- Expressions: signatures, hashes, comparisons, introspection, asset lookups, arithmetic
- Terminals: identifiers, number literals, string literals

**Key design**: Ordered choice in PEG ensures unambiguous parsing. Longer alternatives (e.g., `bytes32` before `bytes`) are ordered first to prevent partial matches.

### Stage 2: AST (`src/models/`)

The AST is a fully typed Rust representation:

| Type | Purpose |
|------|---------|
| `Contract` | Top-level: name, params, server key, timelocks, functions |
| `Function` | Name, params, statements, `is_internal` flag |
| `Statement` | Enum: Require, LetBinding, VarAssign, IfElse, ForIn |
| `Expression` | 30+ variants: Variable, Literal, BinaryOp, AssetLookup, GroupFind, CurrentInput, introspection, crypto ops, `Concat { left, right, coerce_left, coerce_right }`, one-shot `Sha256 { data }` |
| `Requirement` | CheckSig, CheckSigFromStack, CheckMultisig, After, HashEqual, Comparison |

### Stage 2.5: AST Validation (`src/validator/`)

Before compilation, `validate_ast()` runs over the parsed `Contract`:
- Non-empty contract name; at least one non-internal function.
- Unique function names; unique constructor and per-function parameter names.
- `options.exit` is required whenever `options.server` is set.
- Literal timelock values must be positive (warning for `renew`, error for `exit`); identifier-valued timelocks are deferred to deploy-time resolution.
- **Require-guard warning** (CashScript-style): a non-internal function with no `require()` statements (directly or inside `if/else`/`for` branches) would trivially succeed for any spend — emits a warning.

Issues are collected as `Vec<ValidationIssue>`; `has_errors()` decides whether compilation halts.

### Stage 3: Compilation (`src/compiler/`)

Transforms AST to `ContractJson` (the output ABI):

1. **Parse source** → AST via `parser::parse()`
2. **Collect asset IDs** used in lookups for constructor param decomposition
3. **Decompose parameters**: `bytes32` asset IDs → `_txid` + `_gidx` pairs; array types → flattened `_0`, `_1`, `_2`
4. **Bytes-aware `+` rewrite pass**: walk each function bottom-up with a `Scope` and rewrite every `BinaryOp { op: "+" }` whose left or right operand resolves to a bytes-like type into `Expression::Concat`, recording per-side `coerce_left` / `coerce_right` flags so int operands get `OP_SCRIPTNUMTOLE64` before `OP_CAT`. Pure `int + int` stays as `OP_ADD64`. The rewrite uses `typechecker::infer_type()` (and the public `Scope` / `build_scope`) so emission can keep its lowering logic uniform.
5. **For each non-internal function**, generate two `AbiFunction` variants:
   - **Cooperative**: Original ASM + `<SERVER_KEY> <serverSig> OP_CHECKSIG`
   - **Exit**: Original ASM + timelock OR N-of-N CHECKSIG chain (if introspection detected)
6. **Serialize** to JSON with contract metadata

### Stage 4: Output Validation (`src/validator/`)

After compilation, `validate_output()` runs structural invariant checks on the emitted `ContractJson`:
- `contractName` non-empty; `functions` array non-empty.
- Every function variant has non-empty `asm` and `witnessSchema`.
- Every function name has both `serverVariant=true` and `serverVariant=false` entries.
- **BSST-style ASM structure**: `OP_IF`/`OP_ELSE`/`OP_ENDIF` balance, syntactically well-formed `<placeholder>` tokens, no empty instructions.
- **Placeholder consistency** (CashScript-style): every `<name>` in ASM resolves to a `witnessSchema` element or a `constructorInputs` entry — otherwise reported as a compiler bug.

## Key Design Decisions

### Dual Variant Generation
Every spending function produces two script variants. The introspection detection system (`function_uses_introspection`) recursively walks the AST to determine if any statement uses opcodes like `OP_INSPECT*`, `OP_FINDASSETGROUP*`, or `OP_TXHASH`. Functions with introspection get N-of-N multisig exit paths instead of simple timelocks.

### Tx-Signing vs Data-Signing Pubkey Classification
The N-of-N exit signature chain only lists pubkeys that actually co-sign the spending transaction. Helpers `collect_pubkey_usage_in_{expr,req,stmts}` walk the AST per function and split every `pubkey` identifier into two sets: **tx-signing** (appears in `checkSig` / `checkMultisig`) and **data-signing** (appears only in `checkSigFromStack` / `checkSigFromStackVerify`). `collect_data_only_pubkeys` then computes the per-contract data-only set and `collect_all_pubkeys` filters it out of the exit-leaf pubkey list. This is what makes oracle-using contracts unilaterally exitable — Stork-style oracles sign byte strings, not L1 transactions, so demanding `<oraclePk> <oraclePkSig> OP_CHECKSIG` in the exit script would render the exit path unreachable.

### Compile-Time Loop Unrolling
`for` loops are unrolled at compile time (default 3 iterations). The `substitute_loop_body` function replaces loop variables with concrete indices, transforming `group.sumOutputs` into `GroupSum { index: k }`.

### 64-bit Arithmetic
The compiler distinguishes between CScriptNum (standard Bitcoin) and u64le (64-bit) values. Asset lookups and group sums produce u64le; witness inputs arrive as CScriptNum. The `needs_u64_conversion` function determines when `OP_SCRIPTNUMTOLE64` conversion is needed.

### Asset ID Decomposition
Constructor parameters used in `AssetLookup` expressions are automatically decomposed from a single `bytes32` into `_txid` (bytes32) + `_gidx` (int) pairs, matching the on-chain asset ID format.

### Direct-Emission Properties
Most `tx.*` / `this.*` properties compile to `<placeholder>` tokens resolved at deploy time. Two exceptions:
- `this.activeInputIndex` → `OP_PUSHCURRENTINPUTINDEX` (no placeholder). This lets exit tapleaves enforce self-vs-sibling input checks on chain — required for the `StabilityVault.merge` consolidation flow.
- `tx.offchainTime` → runtime placeholder `<tx.offchainTime>`, distinct from `<tx.time>`; the introspector binds it to the TEE wallclock in unix seconds.

## Source Structure

```
src/
├── main.rs              # CLI: parse args, read .ark, compile, write JSON
├── lib.rs               # Public API: compile(source_code) → Result<ContractJson>
├── parser/
│   ├── mod.rs           # build_ast(), parse_contract(), parse_function(),
│   │                    # parse_complex_expression() + 50+ parse_* functions
│   ├── grammar.pest     # PEG grammar: 559 lines, ~60 rules
│   └── debug.rs         # Debug print utilities
├── models/
│   └── mod.rs           # AST types: Contract, Function, Statement (4 variants),
│                        # Expression (30+ variants), Requirement (6 variants),
│                        # ContractJson, AbiFunction
├── compiler/
│   └── mod.rs           # compile(), generate_function(), generate_asm_from_statements(),
│                        # emit_*_asm() functions, loop unrolling, introspection detection
├── validator/
│   └── mod.rs           # validate_ast() + validate_output(); BSST-style ASM analysis;
│                        # CashScript-style placeholder consistency check
├── typechecker/
│   └── mod.rs           # ArkType-based expression typing
└── opcodes/
    └── mod.rs           # OP_* opcode constants (extracted from compiler)
```

## Testing Architecture

25 dedicated integration test files cover individual contract types, language features, and compiler self-checks:
- **Contract compilation**: `bare_vtxo_test`, `htlc_test`, `fuji_safe_test`, `beacon_test`, `controlled_mint_test`, `fee_adapter_test`, `stability_vault_test` (oracle-signed settlement, no-oracle invariants on `transfer`/`split`, OP_CAT + OP_SHA256 message reconstruction), `covered_call_test` / `cash_secured_put_test` (Rysk-faithful single-locked options: exercise/reclaim CLTV windows, transfer pre-expiry guard, exit-leaf pubkey filtering)
- **Introspection**: `asset_introspection_test`, `tx_introspection_test`, `io_introspection_test`
- **New opcodes**: `new_opcodes_test`, `concat_op_test` (type-dispatched `+`: bytes-vs-int dispatch, OP_SCRIPTNUMTOLE64 coercion, pure int+int stays OP_ADD64)
- **Asset groups**: `group_properties_test`
- **Complex contracts**: `arkade_kitties_test`, `token_vault_test`, `threshold_oracle_test`, `threshold_multisig_test`, `epoch_limiter_test`
- **Validation & structure**: `asm_structural_test` (BSST-style ASM checks), `validation_error_test` (AST/output validator errors), `type_system_test` (typechecker behaviour), `compilation_roundtrip_test` (compile-then-re-parse round-trip), `contract_import_instantiation_test` (cross-contract imports)
