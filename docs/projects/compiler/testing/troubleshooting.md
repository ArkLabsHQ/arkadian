# Troubleshooting — Arkade Compiler

## Build Issues

### Rust Version

The project uses Rust edition 2021. Any recent stable Rust should work.

```bash
rustup update stable
rustc --version
```

### pest Grammar Compilation

If grammar changes cause build failures:
```
error[E0433]: failed to resolve: use of undeclared type `Rule`
```
Ensure `grammar.pest` is syntactically valid PEG. The pest parser generator runs at compile time via the `#[derive(Parser)]` macro.

### Dependency Conflicts

```bash
cargo update    # Regenerate lock file
cargo build     # Retry
```

## Compilation Errors (Contract Compilation)

### Parse Error: Invalid Syntax

```
Compilation error: Parse error: ...
```
- Check your `.ark` file follows the syntax: optional `import`s, then `contract Name(params) { functions }` — the `options {}` block was removed and is now a parse error
- For an L1 leaf, use the `function <name>(...) tapscript { ... }` form (source order `condition? · timelock? · multisig`)
- Ensure all statements end with `;`
- Verify `require()` wraps a valid expression
- Check that data types are valid: `pubkey`, `signature`, `bytes`, `bytes20`, `bytes32`, `int`, `bool`, `asset`

### File Must Have .ark Extension

```
Input file must have .ark extension
```
Rename your file to use the `.ark` extension.

### Missing Contract Structure

```
Parse error: Missing contract name
```
Ensure your file has a `contract Name(params) { ... }` declaration.

### Unexpected Rule in Expression

```
Unexpected rule in complex expression: SomeRule
```
The expression inside `require()` uses unsupported syntax. Check the supported expression types in the README.

## Runtime Issues

### Output File Write Failure

```
Error: Permission denied
```
Check write permissions for the output directory. By default, output goes to the current directory with the same name as the source file but with `.json` extension.

### JSON Output Validation

If the output JSON seems incorrect (unified `functions[]` spend-group ABI: `{ name, arkade?, leaves[] }`):
1. Check the `arkade.asm` covenant carries only the contract's own pubkeys (no `<SERVER_KEY>` / signatures)
2. Check each `leaves[].asm` is signature-free — signatures belong in `leaves[].witness` (`injected: true` for `serverSig` / `emulatorSig`)
3. A covenant with no matching `tapscript` should show a synthesized default leaf `<SERVER_KEY> OP_CHECKSIGVERIFY <EMULATOR_KEY:fn> OP_CHECKSIG`
4. Verify `constructorInputs` match your contract parameters
5. Asset ID parameters should be decomposed into `_txid` + `_gidx` pairs

## Common Patterns

### Unilateral Exit Leaves

There is no automatic exit variant anymore. To give a contract an on-chain exit, add an explicit CSV `tapscript` — `require(older(exit)); require(checkSig(ownerSig, owner));` — referencing an `int exit` constructor param. A contract with no exit leaf is valid (it simply has no unilateral exit). Covenant bodies that use introspection (`tx.inputs`, `tx.outputs`, `tx.input.current`) run inside the TEE emulator; they no longer generate an N-of-N exit chain.

### Array Type Flattening

Array parameters (`pubkey[]`, `signature[]`) are flattened to 3 elements by default:
- `pubkey[] oracles` → `oracles_0`, `oracles_1`, `oracles_2`

This is compile-time behavior and cannot currently be configured.

### For Loop Unrolling

`for` loops are unrolled to 3 iterations by default (the `DEFAULT_ARRAY_LENGTH` constant). If you need more iterations, the constant must be changed in the compiler source.

## Debugging

### Verbose Output

Run tests with output to see compilation details:
```bash
cargo test -- --nocapture
```

### Inspecting AST

The `debug.rs` module provides utilities for printing the parsed AST. Use during development:
```rust
// In a test
let contract = parser::parse(source).unwrap();
println!("{:#?}", contract);
```

### Comparing Expected vs Actual JSON

```bash
# Compile and save
arkadec examples/bare.ark

# Compare with expected
diff bare.json examples/bare.json
```

## Getting Help

- GitHub Issues: https://github.com/arkade-os/compiler/issues
- README: Contains full language reference and examples
- `docs/` directory: Internal specs for Arkade Script and opcodes
