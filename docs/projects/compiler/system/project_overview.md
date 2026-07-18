# Project Overview — Arkade Compiler

## What is the Arkade Compiler?

The Arkade Compiler (`arkadec`) is a Rust-based compiler that transforms Arkade Language source code (`.ark` files) into JSON artifacts containing Bitcoin Taproot script assembly. It enables developers to write expressive smart contracts in a high-level, Ivy-like syntax that compiles to scripts executable by the Arkade Virtual Machine.

The compiler is a critical piece of the Arkade OS stack: contracts written in Arkade Language are verified and executed inside Trusted Execution Environments (TEEs) and signed by the Arkade Signer, ensuring verifiable and tamper-proof execution.

## Core Features

### Language Features
- **Ivy-like syntax** for intuitive Bitcoin contract development
- **8 data types**: `pubkey`, `signature`, `bytes`, `bytes20`, `bytes32`, `int`, `bool`, `asset`
- **Covenant functions + `tapscript` leaves**: unmodified `function`s emit arkade covenant ASM; `tapscript` functions define L1 taproot leaves for cooperative signing, hashlocks, and unilateral exit (the legacy `options {}` block has been **removed**)
- **Internal functions**: Helper functions that don't create spending paths
- **Custom error messages** in `require()` statements
- **Control flow**: `if/else` conditionals and `for` loops (compile-time unrolled)
- **Array types**: `pubkey[]`, `signature[]` with automatic flattening

### Cryptographic Primitives
- `checkSig` / `checkMultisig` (2-arg N-of-N or 3-arg `checkMultisig(keys, sigs, threshold)`) / `checkSigFromStack` / `checkSigFromStackVerify`
- One-shot `sha256(data)` (compiles to `OP_SHA256`) and streaming SHA256 (`sha256Initialize`, `sha256Update`, `sha256Finalize`). Accepts concatenated arguments — e.g. `sha256(ticker + price + time)` — so an oracle message can be reconstructed in a single hash step.
- Tapscript condition hashlocks (`hashFn(preimage) == hash`) support `sha256`, `hash160` (`OP_HASH160`), `hash256` (`OP_HASH256`), and `ripemd160` (`OP_RIPEMD160`)
- `ecMulScalarVerify` (EC scalar multiplication)
- `tweakVerify` (Taproot key tweaking)

### Byte-string Operations
- **Type-dispatched `+`**: when at least one operand resolves to a bytes-like type (`bytes`, `bytes20`, `bytes32`), `+` compiles to `OP_CAT` (concatenation) instead of `OP_ADD64`. An `int` operand on either side is auto-coerced with `OP_SCRIPTNUMTOLE64` so on-chain and off-chain hashing remain byte-identical. Pure `int + int` keeps the existing arithmetic semantics. Implemented via a bottom-up rewrite pass over the AST that calls `typechecker::infer_type()` before emission.
- **Byte-slicing / conversion primitives** (canonical introspector opcode set, now emitted natively rather than delegated to the runtime): `substr(data, offset, size)` → `OP_SUBSTR`, `cat(a, b)` → `OP_CAT`, `bin2num(bytes)` → `OP_BIN2NUM`, `num2bin(num, size)` → `OP_NUM2BIN`, `size(bytes)` → `OP_SIZE OP_NIP`, and inline `sha256(data)` (`Expression::Sha256` → `<data> OP_SHA256`). A new `byte_expr_comparison` grammar shape lets these terms flow into comparisons and small byte-arith expressions (e.g. `bin2num(substr(state, 167, 8)) + 1 == bin2num(substr(recv, 69, 8))`), and they are accepted on the RHS of asset-lookup, group-property, and input/output introspection comparisons.

### Packet Introspection (LayerZero / cross-chain)
- `tx.packet(packetType)` → `OP_INSPECTPACKET` and `tx.inputs[i].packet(packetType)` → `OP_INSPECTINPUTPACKET` read attested packet bytes (asserting presence via the opcode's bool flag), enabling on-chain checks of packet version, size, and per-field slices.
- `tx.inputs[i].arkadeScriptHash` / `arkadeWitnessHash` → `OP_INSPECTINPUTARKADESCRIPTHASH` pins a consumed input to an expected contract, and `this.activeBytecode` → `OP_INPUTBYTECODE` (was a placeholder before) exposes the current input's script.

### Transaction Introspection
- Input/output value, scriptPubKey, sequence, outpoint, nonce, issuance
- Transaction-level: version, locktime, numInputs, numOutputs, weight
- Two clocks: `tx.time` (Bitcoin nLockTime block height) and `tx.offchainTime` (TEE wallclock unix seconds) — emitted as runtime placeholders. `tx.offchainTime` enables per-second funding accrual and freshness windows independent of block cadence.
- Current input: `tx.input.current.value`, `.scriptPubKey`, `.sequence`, `.outpoint`
- `this.activeInputIndex`: compiles directly to `OP_PUSHCURRENTINPUTINDEX` (not a placeholder), so exit tapleaves can enforce self-vs-sibling input identification on chain (used by `StabilityVault.merge` to distinguish the two vaults being consolidated).

### Asset Introspection
- Canonical Asset IDs are explicit `(txid, gidx)` pairs (`txid` is `bytes32`, `gidx` is an int identifier or a `0..65535` literal)
- Per-input/output asset access: `assets.lookup(txid, gidx)` (asserts present, returns amount), `assets.has(txid, gidx)` (Bool presence), count (`.length`), and indexed access (assetId, amount)
- Asset groups: `find(txid, gidx)`, `has(txid, gidx)`, length, sumInputs, sumOutputs, delta, metadataHash, isFresh
- Group control predicates: `group.hasControl` (Bool presence) and `group.controlIs(txid, gidx)` (Bool full canonical control equality) — replace the old struct-style `.control ==`
- Per-group IO access with numInputs/numOutputs
- Compile-time Asset ID operand validation rejects malformed `txid`/`gidx` operands (wrong type, or out-of-range `gidx` literal) before reaching the emulator's runtime check

### Compilation Model — Unified `functions[]` ABI
The output ABI is a single `functions[]` array of **spend groups**. Each group is `{ name, arkade?, leaves[] }`:
1. **`arkade`** (optional `{ inputs, asm }`): the emulator-run covenant emitted by an unmodified `function` body. Covenant ASM carries only the contract's own pubkeys — no server/emulator signatures.
2. **`leaves[]`** (`{ name, witness, asm }`): one or more L1 taproot tapleaves. Signatures live in `witness` (with `injected: true` for infrastructure-supplied fields such as `serverSig` / `emulatorSig`), never in leaf `asm`.

The legacy two-variant (`serverVariant: true/false`), `witnessSchema`, automatic N-of-N exit generation, and the tx-signing/data-signing pubkey classification have all been **removed**.

**Tapleaf sourcing:**
- An author-written `function <name>(...) tapscript { ... }` compiles to an explicit leaf. It must assemble to one of arkd's 5 closures (`Multisig`, `CsvMultisig`, `CltvMultisig`, `ConditionMultisig`, `ConditionCsvMultisig`) with source order `condition? · timelock? · multisig`; multisig is always N-of-N.
- A covenant `function` with no matching `tapscript` receives a **synthesized default collaborative leaf** `checkMultisig([server, tweak(emulator, fn)], [serverSig, emulatorSig], 2)`.
- Reserved key roles resolve only inside tapscript key operands: `server` → `<SERVER_KEY>` (arkd operator), `emulator` → `<EMULATOR_KEY:fn>` (emulator key tweaked by `fn`'s covenant hash), and `tweak(emulator, fn)` for explicit tweaks.
- Unilateral exit is expressed explicitly as a standalone CSV `tapscript` (`older(exit)` over a constructor `int` param); a contract with no exit leaf is valid.

### Semantic Validation
A dedicated `validator` module runs two passes around compilation, producing `ValidationIssue` entries with `Error` / `Warning` severity:

1. **AST validation** (`validate_ast`, pre-compilation): catches semantic errors the PEG grammar cannot express — empty contract name, at least one non-internal function **or** tapscript, duplicate function/tapscript/parameter names, reserved key roles (`server`, `emulator`) misused as constructor or tapscript input names, duplicate tapscript inputs, and a CashScript-style **require-guard warning** when a non-internal function contains no `require()` statements. Three further binding-hygiene checks run here:
   - **Immutable constructor parameters** (`check_ctor_assignment`): rejects any `name = expr;` reassignment where `name` is a constructor parameter (recurses into `if/else` and `for` bodies). Constructor parameters are read-only.
   - **Scope shadowing** (`check_shadowing` / `walk_scope`): rejects a function parameter that shadows a constructor parameter, a `let` binding or loop variable that shadows any name still live in an enclosing lexical scope, and a `for (x, x)` loop whose index and value variables are identical. Sibling `if`/`else`/`for` blocks each push their own frame, so they don't conflict with one another.
   - **Emitted-namespace collisions** (`check_expanded_namespace`): for every non-internal function, the names that constructor and function parameters contribute to the *emitted* placeholder namespace — after array flattening (`name_0`, `name_1`, …) and asset-ID decomposition (`_txid` + `_gidx`) — must be unique. Distinct source names can still collide here (e.g. `int[] xs` vs `int xs_0`). Reuses `collect_lookup_asset_ids` / `decompose_constructor_params` from the compiler (now `pub(crate)`) so the check mirrors the emitter exactly.
   - **Asset ID operands** (`check_asset_id_operands`, fatal): `asset_txid` must resolve to `Bytes32` and `asset_gidx` to `Int` (literal in `0..=65535`), rejecting malformed operands before the emulator's runtime check.
   - Tapscript closure-shape rules (opcode safety, key resolution, arkd 5-closure conformance) run in `compiler::tapscript::validate_arkd_rules`.
2. **Output validation** (`validate_output`, post-compilation): asserts compiler-output invariants on the unified ABI — non-empty `functions`, every spend group has at least one leaf, every present `arkade` covenant and every leaf has non-empty `asm`, and no leaf `asm` carries a signature placeholder (signatures must be witness-only).

Exit/renewal timelocks are ordinary `int` constructor parameters referenced by `older(...)` / `after(...)` / `tx.time >= ...`; identifier operands emit a `<name>` placeholder resolved at deploy time.

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
5. **Cross-chain Messaging**: LayerZero / USDT0-style contracts that verify DVN-attested packets on chain via packet introspection
6. **Protocol Development**: Design and test new Arkade Script opcodes and patterns

## Project Structure

The repository is a Cargo **workspace** with two members: the compiler (root) and `arkade-bindgen` (a Go/TypeScript client-binding generator). Since the 2026-07 refactor, `parser/` and `compiler/` are split into per-concern submodules, the pipeline modules are crate-internal, each standalone example lives in its own directory, integration tests are grouped under `tests/examples/` and `tests/features/`, and the old top-level `docs/` design folder was removed (per-contract design notes now sit beside their examples).

```
compiler/
├── Cargo.toml                  # Workspace + root package (v0.1.0); members = [".", "arkade-bindgen"]
├── README.md                   # Language reference and examples
├── src/
│   ├── main.rs                 # CLI entry point (arkadec)
│   ├── lib.rs                  # Library entry point (compile fn); re-exports models + opcodes
│   ├── wasm.rs                 # WASM bindings for the web playground (`wasm` feature)
│   ├── parser/                 # PEG → AST, split by concern: mod, grammar.pest, expr,
│   │                          # comparison, checksig, crypto, asset, introspection, tapscript
│   ├── models/
│   │   └── mod.rs              # AST + unified ABI types (Contract.tapscripts,
│   │                          # NamedTapscript, TapItem, KeyExpr, HashFn,
│   │                          # AbiFunctionGroup, ArkadeCovenant, AbiLeaf)
│   ├── compiler/               # AST → unified ABI, split by concern: mod, expr, comparison,
│   │                          # concat, loops, asset, introspection, tapscript
│   ├── validator/              # AST + output validation passes (ValidationIssue, Severity)
│   ├── typechecker/            # Type system for AST expressions (ArkType, Scope)
│   └── opcodes/                # Opcode constants module
├── examples/                   # Each standalone contract in its own dir; systems grouped
│   ├── single_sig/single_sig.ark, htlc/htlc.ark, fuji_safe/fuji_safe.ark,
│   ├── nft_mint/, controlled_mint/, fee_adapter/, non_interactive_swap/,
│   ├── payment_auth/, token_vault/, threshold_oracle/, threshold_multisig_htlc/,
│   ├── arkade_kitties/         # arkade_kitties.ark + ArkadeKitties.md design note
│   ├── stability/              # stability_vault.ark, stability_offer.ark + stability.md
│   ├── options/                # covered_call.ark, cash_secured_put.ark + options.md
│   ├── bonds/                  # repayment_pool.ark, bond_mint.ark + bonds.md
│   └── layerzero/              # endpoint.ark, oapp.ark, receive_marker.ark, send_marker.ark
│                              # (compiled JSON artifacts are generated on demand, not committed)
├── tests/                      # Two aggregator binaries pulling in per-topic modules:
│   ├── common/mod.rs          # shared helpers (asm_of, witness_names, opcode_count, …)
│   ├── examples.rs + examples/ # contract-compilation tests (htlc, fuji_safe, options, bonds, …)
│   └── features.rs + features/ # language/compiler behaviour tests (tapscript_abi, concat_op, …)
└── arkade-bindgen/             # Workspace member: Go/TS binding generator over the
                                # spend-groups/leaves ABI (ir.rs, targets/{go,typescript}.rs)
```

## Security Model

- Contracts execute inside TEEs (Trusted Execution Environments); the `arkade` covenant is the emulator-run logic
- Cooperative spending goes through a collaborative tapleaf co-signed by the `server` (arkd operator) and tweaked `emulator` keys — `checkMultisig([server, tweak(emulator, fn)], …, 2)`
- Unilateral exit is an explicit CSV `tapscript` leaf (`older(exit)`) providing an on-chain exit guarantee independent of the TEE
- Tapscript leaves must conform to arkd's 5 closure shapes and carry signatures only in the witness (never in leaf ASM), enforced by `validate_output`
- Asset ID decomposition prevents ID spoofing (txid + gidx separation)
