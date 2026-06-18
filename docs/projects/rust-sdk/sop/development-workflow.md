# Development Workflow — Arkade Rust SDK

## Prerequisites

1. **Rust** 1.86+ via rustup
2. **just** task runner: `cargo install just`
3. **dprint** formatter: `cargo install dprint`
4. **protoc** (for gRPC code gen): `brew install protobuf` / `apt install protobuf-compiler`
5. **Docker** + **Node** (for the `arkade-regtest` e2e stack; init the submodule with `just regtest-init`)

## Building

```bash
cargo build                    # Build all crates
cargo build -p ark-core        # Build single crate
cargo build --release          # Release build
just build-wasm                # WASM targets
```

## Running Tests

```bash
# Unit tests
just test

# E2E tests (requires the arkade-regtest stack running — `just regtest-start`)
just e2e-tests

# Full cycle (regtest-clean + regtest-start + test)
just e2e-full

# Specific E2E test
cargo test -p e2e-tests --test e2e_two_party -- --ignored --nocapture

# Asset / delegate suites
cargo test -p e2e-tests --test e2e_assets -- --ignored --nocapture
cargo test -p e2e-tests --test e2e_delegate -- --ignored --nocapture

# Fulmine delegator smoke (requires local fulmine stack at http://localhost:7004)
cargo test -p e2e-tests --test fulmine_delegator_smoke -- --ignored --nocapture

# WASM tests
just wasm-test
```

## Code Quality

```bash
# Format
just fmt

# Lint
just clippy

# MSRV check
just msrv-check
```

## Git Workflow

1. **Create feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes and test**
   ```bash
   cargo build
   just test
   just clippy
   just fmt
   ```

3. **Run E2E tests** (for protocol changes)
   ```bash
   just e2e-full    # Or: just e2e-tests if env already running
   ```

4. **Commit**
   ```bash
   git add .
   git commit -m "feat: description of changes"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/my-feature
   ```

## gRPC Code Generation

When proto files change:

```bash
just gen-grpc
# Or: RUSTFLAGS="--cfg genproto" cargo build -p ark-grpc
```

## PR Checklist

- [ ] `cargo build` succeeds
- [ ] `just test` passes
- [ ] `just clippy` clean (no warnings)
- [ ] `just fmt` applied
- [ ] E2E tests pass (if protocol changes)
- [ ] WASM build works (if touching ark-core or ark-rest)
- [ ] MSRV check passes
- [ ] Documentation updated
