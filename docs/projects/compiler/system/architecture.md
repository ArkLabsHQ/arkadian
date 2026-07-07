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

The parser uses [pest](https://pest.rs/), a PEG (Parsing Expression Grammar) parser generator for Rust. The grammar is defined in `grammar.pest` (752 lines) and covers:

- Contract structure: `import`s, `contract Name(params) { functions }`, and `function … tapscript { }` L1 leaf declarations (the `options {}` block was removed)
- Statements: `require`, `let`, `if/else`, `for`, variable assignments
- Expressions: signatures, hashes, comparisons, introspection, asset lookups, arithmetic, byte-slicing (`substr`/`cat`/`bin2num`/`num2bin`/`size`), and packet introspection (`tx.packet(...)`, `tx.inputs[i].packet(...)`)
- Terminals: identifiers, number literals, string literals

**Key design**: Ordered choice in PEG ensures unambiguous parsing. Longer alternatives (e.g., `bytes32` before `bytes`) are ordered first to prevent partial matches.

### Stage 2: AST (`src/models/`)

The AST is a fully typed Rust representation:

| Type | Purpose |
|------|---------|
| `Contract` | Top-level: name, params, functions, `tapscripts`, imports |
| `Function` | Name, params, statements, `is_internal` flag |
| `NamedTapscript` | A `tapscript` leaf declaration: name, witness `inputs`, ordered `items` (`TapItem`: `Hash`, `Older`, `After`, `Sig`) |
| `KeyExpr` / `HashFn` | Tapscript key operand (`Ident` role or `Tweak { func }`) and condition hash (`Sha256`/`Hash160`/`Hash256`/`Ripemd160`) |
| `Statement` | Enum: Require, LetBinding, VarAssign, IfElse, ForIn |
| `Expression` | 30+ variants: Variable, Literal, BinaryOp, AssetLookup, AssetHas, GroupFind, GroupHas, GroupControlIs, CurrentInput, introspection, crypto ops, `Concat { left, right, coerce_left, coerce_right }`, one-shot `Sha256 { data }`. Byte/packet primitives: `Substr`, `Cat`, `Bin2Num`, `Num2Bin`, `SizeOf` (→ `OP_SUBSTR`/`OP_CAT`/`OP_BIN2NUM`/`OP_NUM2BIN`/`OP_SIZE OP_NIP`), and packet introspection `PacketInspect`/`InputPacketInspect` (→ `OP_INSPECTPACKET`/`OP_INSPECTINPUTPACKET`). Asset ID constructs (`AssetLookup`/`AssetHas`/`GroupFind`/`GroupHas`/`GroupControlIs`) carry `asset_txid` + `asset_gidx` boxed sub-expressions (canonical `(txid, gidx)` pair) |
| `Requirement` | CheckSig, CheckSigFromStack, CheckMultisig (with `threshold`), After, HashEqual (with `HashFn`), Comparison |
| `AbiFunctionGroup` | Output ABI spend group: `name`, optional `arkade: ArkadeCovenant { inputs, asm }`, `leaves: Vec<AbiLeaf { name, witness, asm }>` |

### Stage 2.5: AST Validation (`src/validator/`)

Before compilation, `validate_ast()` runs over the parsed `Contract`:
- Non-empty contract name; at least one non-internal function **or** tapscript.
- Unique function names; unique tapscript names; unique constructor and per-function parameter names.
- Reserved key roles (`server`, `emulator`) may not be used as constructor parameters or tapscript input names; no duplicate inputs within a tapscript.
- **Require-guard warning** (CashScript-style): a non-internal function with no `require()` statements (directly or inside `if/else`/`for` branches) would trivially succeed for any spend — emits a warning.
- **Immutable constructor params** (`check_ctor_assignment`): a `name = expr;` reassignment of a constructor parameter is rejected (constructor parameters are read-only); recurses into `if/else` and `for` bodies.
- **Scope shadowing** (`check_shadowing` + `walk_scope`): a lexical-scope stack rejects function parameters shadowing constructor parameters, `let`/loop bindings shadowing any name live in an enclosing scope, and `for (x, x)` loops with identical index/value variable names. Each `if`/`else`/`for` block pushes its own frame so sibling blocks don't collide.
- **Emitted-namespace collisions** (`check_expanded_namespace`): per non-internal function, the names parameters contribute to the emitted placeholder namespace — after array flattening and asset-ID decomposition — must be unique, catching collisions distinct source names can't reveal (e.g. `int[] xs` vs `int xs_0`). Reuses the compiler's `collect_lookup_asset_ids` / `decompose_constructor_params` (now `pub(crate)`) so the simulated namespace matches the emitter.
- Tapscript closure-shape validation (opcode safety, key/binding resolution, arkd 5-closure conformance) lives in `compiler::tapscript::validate_arkd_rules`, run alongside compilation.
- **Asset ID operands** (`check_asset_id_operands`, fatal): for every `lookup`/`has`/`find`/`controlIs` operand, `asset_txid` must resolve to `Bytes32` and `asset_gidx` to `Int` (a numeric literal must be in `0..=65535`), rejecting malformed/swapped operands at compile time instead of relying on the emulator's runtime `popAssetID` check. Scope-aware (seeds constructor + function params, infers `let`/assignment types, binds `for` index as `Int`); traversal recurses through every nesting sub-expression via an exhaustive `child_exprs` match so no future `Expression` variant can silently bypass it.

Issues are collected as `Vec<ValidationIssue>`; `has_errors()` decides whether compilation halts.

### Stage 3: Compilation (`src/compiler/`)

Transforms AST to `ContractJson` (the output ABI):

1. **Parse source** → AST via `parser::parse()`
2. **Collect asset IDs** used in lookups for constructor param decomposition
3. **Decompose parameters**: `bytes32` asset IDs → `_txid` + `_gidx` pairs; array types → flattened `_0`, `_1`, `_2`
4. **Bytes-aware `+` rewrite pass**: walk each function bottom-up with a `Scope` and rewrite every `BinaryOp { op: "+" }` whose left or right operand resolves to a bytes-like type into `Expression::Concat`, recording per-side `coerce_left` / `coerce_right` flags so int operands get `OP_SCRIPTNUMTOLE64` before `OP_CAT`. Pure `int + int` stays as `OP_ADD64`. The rewrite uses `typechecker::infer_type()` (and the public `Scope` / `build_scope`) so emission can keep its lowering logic uniform.
5. **For each non-internal function**, build an `AbiFunctionGroup`:
   - Emit the covenant body into `arkade: { inputs, asm }` (contract pubkeys only; no server/emulator sigs).
   - Attach `leaves[]`: the matching author-written `tapscript`, or a synthesized default collaborative leaf `checkMultisig([server, tweak(emulator, fn)], [serverSig, emulatorSig], 2)`. Standalone `tapscript`s (e.g. a unilateral CSV exit) form their own groups.
6. **Serialize** to JSON with contract metadata

### Stage 4: Output Validation (`src/validator/`)

After compilation, `validate_output()` runs structural invariant checks on the emitted `ContractJson`:
- `functions` array non-empty.
- Every spend group has at least one leaf (`leaves` non-empty).
- Every present `arkade` covenant has non-empty `asm`.
- Every leaf has non-empty `asm`, and no leaf `asm` carries a signature placeholder (`…Sig>`, matched case-insensitively so lowercase leaks like `<ownersig>` are also caught) — signatures must live in the leaf `witness`.

## Key Design Decisions

### Unified Spend-Group ABI
The output is a single `functions[]` of `AbiFunctionGroup`s. The legacy two-variant (`serverVariant=true/false`) shape, `witnessSchema`, automatic N-of-N exit generation, `function_uses_introspection`, and the tx-signing/data-signing pubkey classification have all been **removed**. Cooperative signing, exit, and renewal are now expressed through tapleaves and constructor params, not synthesized variants.

### Tapscript Closures (`src/compiler/tapscript.rs`)
Each `tapscript` leaf assembles to one of arkd's 5 closure shapes — `Multisig`, `CsvMultisig`, `CltvMultisig`, `ConditionMultisig`, `ConditionCsvMultisig` — with source order `condition? · timelock? · multisig`. Multisig is always N-of-N. Forfeit closures (`Multisig`/`CltvMultisig`/`ConditionMultisig`) must include the `server` role; exit closures use CSV (`older(...)`). `ClosureClass::is_forfeit` / `is_exit` classify the shape. Reserved roles lower to `<SERVER_KEY>` and `<EMULATOR_KEY:fn>`; signatures are emitted into the leaf witness, keeping leaf ASM signature-free.

### Compile-Time Loop Unrolling
`for` loops are unrolled at compile time (default 3 iterations). The `substitute_loop_body` function replaces loop variables with concrete indices, transforming `group.sumOutputs` into `GroupSum { index: k }`.

### 64-bit Arithmetic
The compiler distinguishes between CScriptNum (standard Bitcoin) and u64le (64-bit) values. Asset lookups and group sums produce u64le; witness inputs arrive as CScriptNum. The `needs_u64_conversion` function determines when `OP_SCRIPTNUMTOLE64` conversion is needed.

### Asset ID Decomposition
Canonical Asset IDs are expressed in source as explicit `(txid, gidx)` pairs — `lookup(txid, gidx)`, `has(txid, gidx)`, `assetGroups.find(txid, gidx)`, `assetGroups.has(txid, gidx)`, and `group.controlIs(txid, gidx)` — where `txid` is a `bytes32` reference and `gidx` is an int reference or a `0..65535` literal, matching the on-chain asset ID format. Constructor `bytes32` parameters used as a `txid` operand are still decomposed into the emitter's `_txid` + `_gidx` placeholder pairs via `collect_lookup_asset_ids` / `decompose_constructor_params`.

### Direct-Emission Properties
Most `tx.*` / `this.*` properties compile to `<placeholder>` tokens resolved at deploy time. Two exceptions:
- `this.activeInputIndex` → `OP_PUSHCURRENTINPUTINDEX` (no placeholder). This lets exit tapleaves enforce self-vs-sibling input checks on chain — required for the `StabilityVault.merge` consolidation flow.
- `this.activeBytecode` → `OP_INPUTBYTECODE` (was a placeholder before) exposes the current input's script.
- `tx.packet(t)` / `tx.inputs[i].packet(t)` → `OP_INSPECTPACKET` / `OP_INSPECTINPUTPACKET`, and `tx.inputs[i].arkadeScriptHash` / `arkadeWitnessHash` → `OP_INSPECTINPUTARKADESCRIPTHASH` — the packet-native introspection set used by the LayerZero / USDT0 contracts.
- `tx.offchainTime` → runtime placeholder `<tx.offchainTime>`, distinct from `<tx.time>`; the introspector binds it to the TEE wallclock in unix seconds.

## Source Structure

```
src/
├── main.rs              # CLI: parse args, read .ark, compile, write JSON
├── lib.rs               # Public API: compile(source_code) → Result<ContractJson>
├── parser/
│   ├── mod.rs           # build_ast(), parse_contract(), parse_function(),
│   │                    # tapscript parsing, parse_complex_expression() + parse_* functions
│   ├── grammar.pest     # PEG grammar: 752 lines
│   └── debug.rs         # Debug print utilities
├── models/
│   └── mod.rs           # AST types: Contract (+ tapscripts), Function, Statement,
│                        # Expression (30+ variants), Requirement, NamedTapscript,
│                        # TapItem, KeyExpr, HashFn; unified ABI: ContractJson,
│                        # AbiFunctionGroup, ArkadeCovenant, AbiLeaf, WitnessElement
├── compiler/
│   ├── mod.rs           # compile(), covenant emission, loop unrolling, bytes-aware `+` rewrite
│   └── tapscript.rs     # L1 tapleaf closure assembly (ClosureClass), validate_arkd_rules,
│                        # ASM emission + witness derivation, default-leaf synthesis
├── validator/
│   └── mod.rs           # validate_ast() + validate_output(); binding-hygiene checks
│                        # (immutable ctor params, scope shadowing, emitted-namespace
│                        # collisions, asset-ID operands, reserved-role misuse);
│                        # unified-ABI output invariants (leaf/covenant asm, witness-only sigs)
├── typechecker/
│   └── mod.rs           # ArkType-based expression typing
└── opcodes/
    └── mod.rs           # OP_* opcode constants (extracted from compiler)
```

## Testing Architecture

35 dedicated integration test files cover individual contract types, language features, tapscript leaves, and compiler self-checks (full suite: 138 tests). Shared helpers (`asm_of`, `witness_names`, `opcode_count`, …) live in `tests/common/mod.rs` and are pulled into each test binary via `mod common; use common::*` (the suite was migrated from the old two-variant helpers to the unified group/leaf ABI).

- **Contract compilation**: `bare_vtxo_test`, `htlc_test`, `fuji_safe_test`, `beacon_test`, `controlled_mint_test`, `fee_adapter_test`, `stability_vault_test` (oracle-signed settlement, no-oracle invariants on `transfer`/`split`, OP_CAT + OP_SHA256 message reconstruction), `covered_call_test` / `cash_secured_put_test` (Rysk-faithful single-locked options: exercise/reclaim CLTV windows, transfer pre-expiry guard), `repayment_pool_test` / `bond_mint_test` (fixed-maturity bond market: phased-lifecycle time gates, strict-burn equality, deployment-invariant assertions, ceiling-division origination floor, force-liquidation co-spend regression guards)
- **Tapscript leaves**: `tapscript_parse_test` (parsing `function … tapscript {}` into `NamedTapscript`), `tapscript_validation_test` (closure-shape / arkd-rule enforcement), `tapscript_abi_test` (unified group/leaf ABI shape, default-leaf synthesis), `tapscript_golden_test` (golden parity of HTLC leaves against arkd closures)
- **Introspection**: `asset_introspection_test`, `tx_introspection_test`, `io_introspection_test`, `packet_primitives_test` (byte-slicing `substr`/`cat`/`bin2num`/`num2bin`/`size`, packet introspection, `byte_expr_comparison`)
- **Cross-chain**: `layerzero_test` (LayerZero / USDT0 suite: 2-of-2 DVN attestation via `OP_CHECKSIGFROMSTACKVERIFY`, packet-native receive/send, marker mint/burn via group sums, `arkadeScriptHash` input pinning)
- **New opcodes**: `new_opcodes_test`, `concat_op_test` (type-dispatched `+`: bytes-vs-int dispatch, OP_SCRIPTNUMTOLE64 coercion, pure int+int stays OP_ADD64)
- **Asset groups**: `group_properties_test` (`controlIs`/`hasControl` predicates)
- **Asset IDs**: `asset_id_explicit_test` (explicit `(txid, gidx)` operands; compile-time operand-type/range validation)
- **Complex contracts**: `arkade_kitties_test`, `token_vault_test`, `threshold_oracle_test`, `threshold_multisig_test`, `epoch_limiter_test`
- **Validation & structure**: `asm_structural_test`, `validation_error_test` (AST/output validator errors), `no_shadowing_test` (immutable-ctor-param assignment rejection, scope-shadowing and `for (x, x)` detection, emitted-namespace collisions), `type_system_test` (typechecker behaviour), `compilation_roundtrip_test` (compile-then-re-parse round-trip), `contract_import_instantiation_test` (cross-contract imports)
