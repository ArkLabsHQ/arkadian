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
- `sha256` and streaming SHA256 (`sha256Initialize`, `sha256Update`, `sha256Finalize`)
- `ecMulScalarVerify` (EC scalar multiplication)
- `tweakVerify` (Taproot key tweaking)

### Transaction Introspection
- Input/output value, scriptPubKey, sequence, outpoint, nonce, issuance
- Transaction-level: version, locktime, numInputs, numOutputs, weight
- Current input: `tx.input.current.value`, `.scriptPubKey`, `.sequence`, `.outpoint`

### Asset Introspection
- Per-input/output asset lookup, count, and indexed access (assetId, amount)
- Asset groups: find, length, sumInputs, sumOutputs, delta, control, metadataHash, isFresh
- Per-group IO access with numInputs/numOutputs

### Compilation Model
Each non-internal function compiles to **two variants**:
1. **Cooperative path** (`serverVariant: true`): Original script + server signature check
2. **Exit path** (`serverVariant: false`): Original script + timelock OR N-of-N multisig (when introspection opcodes are used)

### Semantic Validation
A dedicated `validator` module runs two passes around compilation, producing `ValidationIssue` entries with `Error` / `Warning` severity:

1. **AST validation** (`validate_ast`, pre-compilation): catches semantic errors the PEG grammar cannot express — duplicate function/parameter names, empty contract name, missing `options.exit` when `options.server` is set, non-positive literal timelocks, and a CashScript-style **require-guard warning** when a non-internal function contains no `require()` statements.
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
│   └── stability/          # BTC-collateralised USD position contracts
│       ├── price_beacon.ark
│       ├── stability_vault.ark
│       └── stability_offer.ark
├── tests/                  # 21 integration test files
└── docs/                   # Internal documentation (specs, opcodes, stability-vault-prd.md)
```

## Security Model

- Contracts execute inside TEEs (Trusted Execution Environments)
- Server signature required for cooperative spending (prevents unauthorized exits)
- Exit paths provide unilateral on-chain exit guarantees with timelocks
- Introspection-using functions get N-of-N fallback exit path (pure Bitcoin, no TEE dependency)
- Asset ID decomposition prevents ID spoofing (txid + gidx separation)
