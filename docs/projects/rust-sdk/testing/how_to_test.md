# How to Test Arkade Rust SDK

## Testing Strategy

- **Unit Tests**: Per-crate logic tests (no external dependencies)
- **E2E Tests**: Full protocol tests against live arkd + Bitcoin regtest
- **WASM Tests**: Browser-based tests for WASM-compatible crates

## Running Unit Tests

```bash
just test
# Or directly:
cargo test -- --nocapture
```

Run tests for a specific crate:

```bash
cargo test -p ark-core -- --nocapture
cargo test -p ark-client -- --nocapture
cargo test -p ark-grpc -- --nocapture
```

## Running E2E Tests

E2E tests require a running arkd instance with Nigiri (Bitcoin regtest).

### Quick Start

```bash
just e2e-full    # Wipes, starts everything, runs all E2E tests
```

### Manual Setup

```bash
nigiri start
just arkd-setup
just e2e-tests
```

### Run Specific E2E Test

```bash
cargo test -p e2e-tests --test e2e_two_party -- --ignored --nocapture
cargo test -p e2e-tests --test e2e_concurrent_settlement -- --ignored --nocapture
```

### Available E2E Tests

| Test | Description |
|------|-------------|
| `e2e_two_party` | Two-party VTXO transfer |
| `e2e_concurrent_settlement` | Concurrent round settlement |
| `e2e_send_onchain_boarding_output` | Send via boarding output |
| `e2e_send_onchain_vtxo_and_boarding_output` | Mixed VTXO + boarding send |
| `e2e_sub_dust` | Sub-dust amount handling |
| `e2e_arknote` | Ark note creation and redemption |
| `e2e_continue_pending_tx` | Continue interrupted transactions |
| `e2e_continue_pending_tx_multi_input` | Multi-input pending tx recovery |
| `e2e_delegate` | VTXO delegation |
| `e2e_multisig_delegate` | Multi-signature delegation |
| `e2e_dlc` | Discreet Log Contract |
| `e2e_dlc_refund` | DLC refund path |
| `e2e_key_discovery` | Key discovery protocol |
| `e2e_rest_client_get_info` | REST client server info |
| `boltz_submarine` | Boltz submarine swap |
| `boltz_reverse` | Boltz reverse submarine swap |

## WASM Tests

Requires `wasm-pack` and a running arkd server:

```bash
just wasm-test
# Runs: wasm-pack test --headless --firefox -- --test wasm
```

## MSRV Verification

Check that all crates compile with the minimum supported Rust version:

```bash
just msrv-check    # Checks ark-core, ark-grpc, ark-rest, ark-client, ark-bdk-wallet, ark-rs
```

## Code Quality

```bash
just fmt           # Format with dprint
just clippy        # Lint: cargo clippy --all-targets --all-features -- -D warnings
```

## Test Patterns

### Swap Storage Testing

ark-client supports two swap storage backends:
- `InMemorySwapStorage`: Default, for tests and simple applications
- SQLite storage: Enable with `sqlite` feature flag, uses sqlx

### Test Utilities

Enable `test-utils` feature for helper functions:

```toml
[dev-dependencies]
ark-client = { version = "0.8", features = ["test-utils"] }
```
