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
# All tests (whole workspace, matching CI)
cargo test --workspace

# Specific test binary
cargo test --test examples
cargo test --test features

# Specific module / test by name
cargo test --test features bare_vtxo
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

1. Create `examples/my_contract/my_contract.ark` (each standalone example lives in its own dir; group interdependent contracts like `bonds/`, `stability/`)
2. Add a test module `tests/examples/my_contract.rs` and register it in `tests/examples.rs` (`#[path = "examples/my_contract.rs"] mod my_contract;`)
3. Compile to inspect output: `cargo run -- examples/my_contract/my_contract.ark` (compiled JSON is generated on demand, not committed)
4. Verify: `cargo test --test examples my_contract`

## Adding a New Language Feature

1. **Update grammar**: Edit `src/parser/grammar.pest` to add new rules
2. **Update models**: Add new variants to `Expression` or `Statement` in `src/models/mod.rs`
3. **Update parser**: Add parse logic in the relevant `src/parser/` submodule (`expr`, `comparison`, `checksig`, `crypto`, `asset`, `introspection`, `tapscript`)
4. **Update compiler**: Add code generation in the relevant `src/compiler/` submodule (`expr`, `comparison`, `concat`, `loops`, `asset`, `introspection`, `tapscript`)
5. **Add tests**: Add a `tests/features/` module verifying correct ASM output
6. **Update README**: Document the new syntax

## PR Checklist

- [ ] `cargo build --workspace` succeeds
- [ ] `cargo test --workspace` passes (both `examples` + `features` binaries and `arkade-bindgen`)
- [ ] `cargo clippy --workspace` clean (no warnings)
- [ ] `cargo fmt` applied
- [ ] New features have test coverage
- [ ] Example contracts updated if syntax changed
- [ ] README updated with new syntax documentation
