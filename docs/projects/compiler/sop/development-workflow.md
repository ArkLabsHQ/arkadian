# Development Workflow — Arkade Compiler

## Prerequisites

1. **Rust** (stable) via rustup
2. Optionally: `cargo-llvm-cov` for test coverage

## Building

```bash
cargo build                    # Debug build
cargo build --release          # Release build
cargo install --path .         # Install arkadec binary
```

## Running Tests

```bash
# All tests
cargo test

# Specific test file
cargo test --test bare_vtxo_test
cargo test --test htlc_test
cargo test --test fuji_safe_test

# Specific test by name
cargo test bare_vtxo

# With output
cargo test -- --nocapture
```

## Code Quality

```bash
# Format
cargo fmt

# Check formatting
cargo fmt --check

# Lint
cargo clippy

# Documentation
cargo doc --open
```

## Git Workflow

1. **Create feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes and test**
   ```bash
   cargo build
   cargo test
   cargo clippy
   cargo fmt
   ```

3. **Commit**
   ```bash
   git add .
   git commit -m "feat: description of changes"
   ```

4. **Push and create PR**
   ```bash
   git push origin feature/my-feature
   ```

   On PR open/push, the `pr-preview.yml` workflow builds the playground (WASM + `contracts.js`) and deploys it to `pr-previews/pr-{number}/` on the `gh-pages` branch. A bot comment posts the preview URL (`https://arkade-os.github.io/compiler/pr-previews/pr-{number}/`) and is updated on subsequent pushes. The subdirectory is removed when the PR is closed.

   On merge to `master`, `deploy-playground.yml` deploys the playground to the root of `gh-pages` via `JamesIves/github-pages-deploy-action`, with `clean-exclude: pr-previews/` to preserve open PR previews. The workflow deletes `playground/.gitignore` before deploy so generated `pkg/` and `contracts.js` are included.

## Adding a New Contract Example

1. Create `examples/my_contract.ark` with the contract source
2. Create `tests/my_contract_test.rs` with compilation tests
3. Compile and save expected output: `cargo run -- examples/my_contract.ark`
4. Verify: `cargo test --test my_contract_test`

## Adding a New Language Feature

1. **Update grammar**: Edit `src/parser/grammar.pest` to add new rules
2. **Update models**: Add new variants to `Expression` or `Statement` in `src/models/mod.rs`
3. **Update parser**: Add parse functions in `src/parser/mod.rs`
4. **Update compiler**: Add code generation in `src/compiler/mod.rs`
5. **Add tests**: Create test cases verifying correct ASM output
6. **Update README**: Document the new syntax

## PR Checklist

- [ ] `cargo build` succeeds
- [ ] `cargo test` passes (all 15 test files)
- [ ] `cargo clippy` clean (no warnings)
- [ ] `cargo fmt` applied
- [ ] New features have test coverage
- [ ] Example contracts updated if syntax changed
- [ ] README updated with new syntax documentation
