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

## Test Files (27 total)

Shared helpers (`asm_of`, `asm_variant`, `witness_names`, `opcode_count`, `user_signatures`) live in `tests/common/mod.rs` and are pulled into each test binary via `mod common; use common::*`.

### Contract Compilation Tests
| Test File | Covers |
|-----------|--------|
| `bare_vtxo_test.rs` | Basic single-signature VTXO contract |
| `htlc_test.rs` | Hash Time-Locked Contract (together, refund, claim paths) |
| `fuji_safe_test.rs` | DeFi lending with oracle, liquidation, renewal, introspection exit paths |
| `beacon_test.rs` | Beacon contract compilation (loop fixture + production 4-param design) |
| `stability_vault_test.rs` | StabilityVault settlement paths (`seekerExit`, `providerExit`) with oracle-signed price witness and per-second funding via `tx.offchainTime`; asserts `OP_CAT` + `OP_SHA256` reconstruction of `sha256(ticker + price + time)`; covers the no-oracle vs oracle-required boundary on `settleAndUpdateFunding`, `addCapital`, `removeCapital`; regression guards `test_vault_transfer_is_pure_keyswap` and `test_vault_split_is_pure_keyswap` for no-oracle paths; `merge` consolidation emits `OP_PUSHCURRENTINPUTINDEX` for self-vs-sibling identification |
| `covered_call_test.rs` | Single-locked physical CoveredCall: 9 tests covering compile shape (4 functions × cooperative+exit = 8 variants), `exercise(buyerSig)` uses only buyer signature and asset/value output checks (no oracle), `reclaim(sellerSig)` uses only seller signature with `expiryHeight + graceBlocks` CLTV, pre-expiry guard `require(tx.time < expiryHeight)` on both transfer functions, and exit-leaf pubkey filtering — no introspection / N-of-N appears in exit variants of `exercise`/`reclaim`/`transferSeller`/`transferBuyer`. Includes `test_asset_id_decomposes_to_txid_and_gidx`, `test_settle_binds_oracle_time_to_expiry`, `test_exit_leaf_excludes_oracle_pubkey`, `test_transfers_guarded_by_expiry` regressions covering compiler-side invariants. |
| `cash_secured_put_test.rs` | Mirror of `covered_call_test.rs` (9 tests). Same shape and same four regression tests, against the cash-secured-put contract that locks `stableAmount` stablecoin instead of BTC. |
| `repayment_pool_test.rs` | Fixed-maturity bond pool ASM tests: phased-lifecycle time gates per function (`issue`, `acceptRepayment`, `rollOut`, `rollIn`, `liquidate`, `acceptAuction`, `redeem`); strict-equality debit/credit burn invariants (`test_all_burn_checks_are_strict_equality` source-greps both contracts); deployment-invariant guards (`test_issue_enforces_deployment_invariants`, `test_roll_pair_enforces_all_deployment_invariants`) cover `initRatioBps > liqThresholdBps`, `liqThresholdBps > 0`, `auctionWindow > 0`, and targeted 3-token-window assertions on the `auctionDiscountBps ∈ [0, 10000)` guard; `test_issue_uses_ceiling_division_on_required_collateral` asserts the literal `9999` token in the origination ASM to prevent dust-mint regression; `test_roll_out_extinguishes_old_obligation_at_witness_index` regression-guards the borrower-signature defence against the `vault.liquidate × pool.rollOut` force-liquidation pairing; `test_redeem_is_pro_rata_post_window`. |
| `bond_mint_test.rs` | Per-issuance bond vault ASM tests: 4-function compile shape (`repay`, `liquidate`, `auction`, `roll`), borrower-signature and time-gate placement, strict-equality debit burn on every settlement path, output-pin conflicts that block wrong-pair co-spends. |
| `arkade_kitties_test.rs` | CryptoKitties-style collectibles with asset groups |
| `token_vault_test.rs` | Token vault with group sum validation |
| `controlled_mint_test.rs` | Controlled asset minting |
| `fee_adapter_test.rs` | Fee adapter with value introspection |
| `threshold_oracle_test.rs` | Multi-oracle threshold signing with for loops |
| `threshold_multisig_test.rs` | Threshold multisig HTLC contracts |

### Feature Tests
| Test File | Covers |
|-----------|--------|
| `asset_introspection_test.rs` | Asset lookup, count, and indexed access opcodes |
| `tx_introspection_test.rs` | Transaction-level introspection (version, locktime, etc.) |
| `io_introspection_test.rs` | Input/output introspection (value, scriptPubKey, etc.) |
| `new_opcodes_test.rs` | New opcodes: streaming SHA256, neg64, le64/le32 conversion, ecMulScalarVerify, tweakVerify |
| `concat_op_test.rs` | Type-dispatched `+`: bytes + bytes → `OP_CAT`; `bytes + int` and `int + bytes` insert `OP_SCRIPTNUMTOLE64` on the int side; pure `int + int` stays `OP_ADD64`; one-shot `sha256(a + b + c)` lowers to chained `OP_CAT` then a single `OP_SHA256` |
| `group_properties_test.rs` | Asset group properties, sums, delta, control, isFresh |
| `epoch_limiter_test.rs` | Epoch-based contract limiting |
| `contract_import_instantiation_test.rs` | Cross-contract imports and `new Contract(...)` instantiation |

### Validation & Structural Tests
| Test File | Covers |
|-----------|--------|
| `asm_structural_test.rs` | BSST-style structural checks: balanced `OP_IF`/`OP_ELSE`/`OP_ENDIF`, well-formed `<placeholder>` tokens, no empty instructions |
| `validation_error_test.rs` | AST validator errors and warnings (duplicate names, missing `options.exit`, require-guard warning) |
| `type_system_test.rs` | Typechecker behaviour and `ArkType` resolution |
| `compilation_roundtrip_test.rs` | Compile-then-re-parse round-trip parity across example contracts (refreshed to include the `bonds/` examples) |

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
    options { server = server; exit = exit; }
    contract MyContract(pubkey user, pubkey server, int exit) {
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
