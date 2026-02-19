# How to Run — Arkade Compiler

## Prerequisites

1. **Rust** (stable, any recent version — edition 2021)
   ```bash
   rustup update stable
   ```

## Building

```bash
# Debug build
cargo build

# Release build (optimized)
cargo build --release

# Install binary to ~/.cargo/bin/
cargo install --path .
```

## Running the Compiler

### CLI Mode

```bash
# Compile a contract
arkadec examples/bare.ark

# Specify output path
arkadec --output output.json examples/htlc.ark

# Using cargo run (development)
cargo run -- examples/bare.ark
cargo run -- --output output.json examples/fuji_safe.ark
```

### Library Mode

Add to your `Cargo.toml`:
```toml
[dependencies]
arkade_compiler = { path = "../compiler" }
```

Use in Rust code:
```rust
use arkade_compiler::compile;

let source = std::fs::read_to_string("contract.ark").unwrap();
let result = compile(&source).unwrap();
```

## Compiling Example Contracts

The `examples/` directory contains reference contracts:

```bash
# Compile all examples
cargo run -- examples/bare.ark
cargo run -- examples/htlc.ark
cargo run -- examples/fuji_safe.ark
cargo run -- examples/nft_mint.ark
cargo run -- examples/token_vault.ark
cargo run -- examples/fee_adapter.ark
cargo run -- examples/beacon.ark
cargo run -- examples/controlled_mint.ark
cargo run -- examples/non_interactive_swap.ark
cargo run -- examples/arkade_kitties.ark
cargo run -- examples/threshold_oracle.ark
```

There's also a batch compile example:
```bash
cargo run --example compile_all
```

## Environment Variables

No environment variables are required. The compiler is fully self-contained.

## Common Commands

```bash
# Build
cargo build

# Run tests
cargo test

# Run specific test
cargo test bare_vtxo

# Check formatting
cargo fmt --check

# Run linter
cargo clippy

# Generate documentation
cargo doc --open
```
