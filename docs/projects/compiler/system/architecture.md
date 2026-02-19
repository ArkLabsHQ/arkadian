# Architecture — Arkade Compiler

## High-Level Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  .ark Source     │────▶│  PEG Parser      │────▶│  AST             │────▶│  JSON Output     │
│  (Arkade Lang)   │     │  (pest grammar)  │     │  (models/)       │     │  (ContractJson)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
     Input                   Stage 1                 Stage 2                  Stage 3
                          Tokenize+Parse          Type-safe AST           Code Generation
```

## Three-Stage Pipeline

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
| `Expression` | 30+ variants: Variable, Literal, BinaryOp, AssetLookup, GroupFind, CurrentInput, introspection, crypto ops |
| `Requirement` | CheckSig, CheckSigFromStack, CheckMultisig, After, HashEqual, Comparison |

### Stage 3: Compilation (`src/compiler/`)

Transforms AST to `ContractJson` (the output ABI):

1. **Parse source** → AST via `parser::parse()`
2. **Collect asset IDs** used in lookups for constructor param decomposition
3. **Decompose parameters**: `bytes32` asset IDs → `_txid` + `_gidx` pairs; array types → flattened `_0`, `_1`, `_2`
4. **For each non-internal function**, generate two `AbiFunction` variants:
   - **Cooperative**: Original ASM + `<SERVER_KEY> <serverSig> OP_CHECKSIG`
   - **Exit**: Original ASM + timelock OR N-of-N CHECKSIG chain (if introspection detected)
5. **Serialize** to JSON with contract metadata

## Key Design Decisions

### Dual Variant Generation
Every spending function produces two script variants. The introspection detection system (`function_uses_introspection`) recursively walks the AST to determine if any statement uses opcodes like `OP_INSPECT*`, `OP_FINDASSETGROUP*`, or `OP_TXHASH`. Functions with introspection get N-of-N multisig exit paths instead of simple timelocks.

### Compile-Time Loop Unrolling
`for` loops are unrolled at compile time (default 3 iterations). The `substitute_loop_body` function replaces loop variables with concrete indices, transforming `group.sumOutputs` into `GroupSum { index: k }`.

### 64-bit Arithmetic
The compiler distinguishes between CScriptNum (standard Bitcoin) and u64le (64-bit) values. Asset lookups and group sums produce u64le; witness inputs arrive as CScriptNum. The `needs_u64_conversion` function determines when `OP_SCRIPTNUMTOLE64` conversion is needed.

### Asset ID Decomposition
Constructor parameters used in `AssetLookup` expressions are automatically decomposed from a single `bytes32` into `_txid` (bytes32) + `_gidx` (int) pairs, matching the on-chain asset ID format.

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
└── compiler/
    └── mod.rs           # compile(), generate_function(), generate_asm_from_statements(),
                         # emit_*_asm() functions, loop unrolling, introspection detection
                         # (1859 lines)
```

## Testing Architecture

15 dedicated test files cover individual contract types and language features:
- Contract compilation: `bare_vtxo_test`, `htlc_test`, `fuji_safe_test`
- Introspection: `asset_introspection_test`, `tx_introspection_test`, `io_introspection_test`
- New opcodes: `new_opcodes_test`
- Asset groups: `group_properties_test`
- Complex contracts: `arkade_kitties_test`, `token_vault_test`, `threshold_oracle_test`
