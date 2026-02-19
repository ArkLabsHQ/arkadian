# Testing Guide — Arkade Compiler

## Test Strategy

The compiler uses Rust's built-in test framework. Tests are organized as integration tests in the `tests/` directory, each covering a specific contract type or language feature.

## Running Tests

```bash
# Run all tests
cargo test

# Run with output
cargo test -- --nocapture

# Run specific test file
cargo test --test bare_vtxo_test
cargo test --test htlc_test
cargo test --test fuji_safe_test

# Run specific test by name
cargo test bare_vtxo
cargo test htlc_claim

# Run tests matching pattern
cargo test asset_introspection
```

## Test Files (15 total)

### Contract Compilation Tests
| Test File | Covers |
|-----------|--------|
| `bare_vtxo_test.rs` | Basic single-signature VTXO contract |
| `htlc_test.rs` | Hash Time-Locked Contract (together, refund, claim paths) |
| `fuji_safe_test.rs` | DeFi lending with oracle, liquidation, renewal, introspection exit paths |
| `beacon_test.rs` | Beacon contract compilation |
| `arkade_kitties_test.rs` | CryptoKitties-style collectibles with asset groups |
| `token_vault_test.rs` | Token vault with group sum validation |
| `controlled_mint_test.rs` | Controlled asset minting |
| `fee_adapter_test.rs` | Fee adapter with value introspection |
| `threshold_oracle_test.rs` | Multi-oracle threshold signing with for loops |

### Feature Tests
| Test File | Covers |
|-----------|--------|
| `asset_introspection_test.rs` | Asset lookup, count, and indexed access opcodes |
| `tx_introspection_test.rs` | Transaction-level introspection (version, locktime, etc.) |
| `io_introspection_test.rs` | Input/output introspection (value, scriptPubKey, etc.) |
| `new_opcodes_test.rs` | New opcodes: streaming SHA256, neg64, le64/le32 conversion, ecMulScalarVerify, tweakVerify |
| `group_properties_test.rs` | Asset group properties, sums, delta, control, isFresh |
| `epoch_limiter_test.rs` | Epoch-based contract limiting |

## What Tests Verify

Each test typically:
1. Defines an `.ark` source string inline
2. Calls `arkade_compiler::compile(source)`
3. Asserts compilation succeeds
4. Verifies contract name, parameters, function count
5. Checks generated ASM instructions contain expected opcodes
6. Validates `serverVariant` true/false variants
7. For introspection contracts: verifies N-of-N exit path fallback

## Writing New Tests

```rust
use arkade_compiler::compile;

#[test]
fn test_my_contract() {
    let source = r#"
    options { server = server; exit = 144; }
    contract MyContract(pubkey user, pubkey server) {
        function spend(signature userSig) {
            require(checkSig(userSig, user));
        }
    }
    "#;

    let result = compile(source);
    assert!(result.is_ok(), "Compilation failed: {:?}", result.err());

    let contract = result.unwrap();
    assert_eq!(contract.name, "MyContract");
    assert_eq!(contract.functions.len(), 2); // cooperative + exit

    // Check cooperative variant
    let coop = &contract.functions[0];
    assert!(coop.server_variant);
    assert!(coop.asm.contains(&"OP_CHECKSIG".to_string()));

    // Check exit variant
    let exit = &contract.functions[1];
    assert!(!exit.server_variant);
    assert!(exit.asm.contains(&"OP_CHECKSEQUENCEVERIFY".to_string()));
}
```

## Test Coverage

Run with coverage (requires `cargo-llvm-cov`):
```bash
cargo install cargo-llvm-cov
cargo llvm-cov --html
open target/llvm-cov/html/index.html
```
