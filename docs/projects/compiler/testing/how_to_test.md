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

## Test Files (32 total)

Shared helpers (`asm_of`, `asm_variant`, `witness_names`, `opcode_count`, `user_signatures`) live in `tests/common/mod.rs` and are pulled into each test binary via `mod common; use common::*`.

### Contract Compilation Tests
| Test File | Covers |
|-----------|--------|
| `bare_vtxo_test.rs` | Basic single-signature VTXO contract |
| `htlc_test.rs` | Hash Time-Locked Contract (together, refund, claim paths) |
| `fuji_safe_test.rs` | DeFi lending with oracle, liquidation, renewal, output introspection covenants |
| `beacon_test.rs` | Beacon contract compilation (loop fixture + production 4-param design) |
| `stability_vault_test.rs` | StabilityVault settlement paths (`seekerExit`, `providerExit`) with oracle-signed price witness and per-second funding via `tx.offchainTime`; asserts `OP_CAT` + `OP_SHA256` reconstruction of `sha256(ticker + price + time)`; covers the no-oracle vs oracle-required boundary on `settleAndUpdateFunding`, `addCapital`, `removeCapital`; regression guards `test_vault_transfer_is_pure_keyswap` and `test_vault_split_is_pure_keyswap` for no-oracle paths; `merge` consolidation emits `OP_PUSHCURRENTINPUTINDEX` for self-vs-sibling identification |
| `covered_call_test.rs` | Single-locked physical CoveredCall (migrated to the unified group/leaf ABI): `exercise` uses only buyer signature and asset/value output checks (no oracle), `reclaim` uses only seller signature with `expiryHeight + graceBlocks` CLTV, pre-expiry guard `require(tx.time < expiryHeight)` on both transfer functions. Includes `test_asset_id_decomposes_to_txid_and_gidx`, `test_settle_binds_oracle_time_to_expiry`, `test_transfers_guarded_by_expiry` regressions covering compiler-side invariants. |
| `cash_secured_put_test.rs` | Mirror of `covered_call_test.rs`. Same shape and regression tests, against the cash-secured-put contract that locks `stableAmount` stablecoin instead of BTC. |
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

### Tapscript Leaf Tests
| Test File | Covers |
|-----------|--------|
| `tapscript_parse_test.rs` | Parsing `function … tapscript {}` into `NamedTapscript` (items, key roles, hash fns, thresholds) |
| `tapscript_validation_test.rs` | Closure-shape rules and arkd 5-closure conformance (opcode safety, key/binding resolution, source ordering) |
| `tapscript_abi_test.rs` | Unified group/leaf ABI shape, default collaborative-leaf synthesis for covenants without a matching tapscript, witness-only signatures |
| `tapscript_golden_test.rs` | Golden parity of HTLC leaves against arkd closures |

### Validation & Structural Tests
| Test File | Covers |
|-----------|--------|
| `asm_structural_test.rs` | BSST-style structural checks: balanced `OP_IF`/`OP_ELSE`/`OP_ENDIF`, well-formed `<placeholder>` tokens, no empty instructions |
| `validation_error_test.rs` | AST validator errors and warnings (duplicate names, reserved-role misuse, require-guard warning) and unified-ABI output invariants (non-empty leaf/covenant asm, witness-only signatures) |
| `no_shadowing_test.rs` | Binding-hygiene `validate_ast` checks: rejects assignment to immutable constructor parameters, function params / `let` bindings / loop variables that shadow an in-scope name, and `for (x, x)` identical loop variables; asserts emitted-namespace collisions after array flattening / asset decomposition (e.g. `int[] xs` vs `int xs_0`) |
| `type_system_test.rs` | Typechecker behaviour and `ArkType` resolution |
| `compilation_roundtrip_test.rs` | Compile-then-re-parse round-trip parity across example contracts (refreshed to include the `bonds/` examples) |

## What Tests Verify

Each test typically:
1. Defines an `.ark` source string inline
2. Calls `arkade_compiler::compile(source)`
3. Asserts compilation succeeds
4. Verifies contract name, parameters, spend-group count
5. Checks the covenant `arkade.asm` and/or tapleaf `leaves[].asm` contain expected opcodes
6. Asserts signatures appear in each leaf's `witness`, never in leaf `asm`
7. For a covenant without a matching tapscript: verifies the synthesized default collaborative leaf

## Writing New Tests

```rust
use arkade_compiler::compile;

#[test]
fn test_my_contract() {
    let source = r#"
    contract MyContract(pubkey user, int exit) {
        function spend(signature userSig) {
            require(checkSig(userSig, user));
        }
        function unilateral(signature userSig) tapscript {
            require(older(exit));
            require(checkSig(userSig, user));
        }
    }
    "#;

    let result = compile(source);
    assert!(result.is_ok(), "Compilation failed: {:?}", result.err());

    let contract = result.unwrap();
    assert_eq!(contract.name, "MyContract");

    // `spend` group: emulator covenant + a synthesized default collaborative leaf.
    let spend = &contract.functions[0];
    let coven = spend.arkade.as_ref().expect("covenant");
    assert!(coven.asm.contains(&"OP_CHECKSIG".to_string()));
    assert!(!spend.leaves.is_empty());

    // `unilateral` standalone CSV exit leaf.
    let exit = contract.functions.iter().find(|g| g.name == "unilateral").unwrap();
    assert!(exit.leaves[0].asm.contains(&"OP_CHECKSEQUENCEVERIFY".to_string()));
}
```

> Field names above (`arkade`, `leaves`, `witness`) mirror the JSON ABI; check the current `AbiFunctionGroup` in `src/models/mod.rs` for exact Rust accessors.

## Test Coverage

Run with coverage (requires `cargo-llvm-cov`):
```bash
cargo install cargo-llvm-cov
cargo llvm-cov --html
open target/llvm-cov/html/index.html
```
