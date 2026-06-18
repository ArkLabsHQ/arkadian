# How to Run Arkade Rust SDK

## Prerequisites

- **Rust**: 1.86+ (`rustup update stable`)
- **just**: Task runner (`cargo install just`)
- **protoc**: Protocol buffer compiler (for gRPC code generation)
- **Docker** + **Node**: Required for the `arkade-regtest` e2e stack (`regtest.mjs` is a zero-dependency Node CLI)

> The e2e suite no longer uses Nigiri or builds `arkd` from Go source. It uses the in-house **arkade-regtest** Docker Compose stack, vendored as a git submodule at `regtest/` and pinned via `ARKD_IMAGE` in `.env.regtest`.

## Clone and Build

```bash
git clone https://github.com/arkade-os/rust-sdk.git
cd rust-sdk
cargo build
```

## Build for WASM

```bash
just build-wasm    # Builds ark-core and ark-rest for wasm32-unknown-unknown
```

## Development Environment (E2E Tests)

### 1. Initialize the arkade-regtest submodule (once)

```bash
just regtest-init    # git submodule update --init --recursive regtest
```

### 2. Start the arkade-regtest stack

```bash
just regtest-start   # regtest.mjs start --env .env.regtest --profile emulator
```

This brings up the Docker Compose stack defined by the submodule:
- Bitcoin Core (regtest, `txindex=1`, mines a block every 2s)
- Fulcrum + mempool/esplora (block explorer API at `:3000/api`)
- arkd on port 7070 (gRPC) — image pinned via `ARKD_IMAGE`, self-funded by the stack
- emulator profile provides the introspector on port 7073

`.env.regtest` ports the exit-delay config the suite relies on and zeroes intent fees so exact-balance assertions hold.

### 3. Run E2E Tests

```bash
just e2e-tests     # Run all E2E tests (stack must be running)
```

Faucet / mine helpers (for manual flows):

```bash
just faucet <address> <amount>   # regtest.mjs faucet … --confirm
just mine [n]                    # regtest.mjs mine n
```

E2E suites of note:
- `e2e_assets` — asset issuance / transfer / burn / reissue
- `e2e_delegate`, `e2e_multisig_delegate` — delegated settlement
- `e2e_arkade_script` — arkade-script flow against a dockerized introspector (image built from source by `justfile` / CI)
- `fulmine_delegator_smoke` — full VtxoWatcher loop against a fulmine delegator (skipped in CI; runs locally with the fulmine stack on `http://localhost:7004`)

> **arkd timelocks**: the local dev/CI setup uses **seconds-based** delays (matching production Arkade); block-based delays are regtest-only and were dropped from the DLC e2e tests. Exit-delay and related config are pinned in `.env.regtest`.

### Full E2E Cycle (Clean Start)

```bash
just e2e-full      # regtest-clean + regtest-start + run all E2E tests
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ARKD_IMAGE` | arkd container image used by the regtest stack | (set in `.env.regtest`) |

The stack reads `.env.regtest`; see `.env.sample` for the documented set of overrides.

## Generate gRPC Code

When proto files change:

```bash
# Requires protoc installed
RUSTFLAGS="--cfg genproto" cargo build
# Or use just:
just gen-grpc
```

## Common Commands

```bash
cargo build                    # Build all crates
cargo build -p ark-core        # Build single crate
just test                      # Run unit tests
just e2e-tests                 # Run E2E tests
just fmt                       # Format code (dprint)
just clippy                    # Lint (clippy)
just wasm-test                 # WASM tests (requires wasm-pack)
just msrv-check                # Check minimum supported Rust version
```

## Stopping Services

```bash
just regtest-stop              # Stop the stack (preserves data/volumes)
just regtest-clean             # Remove the stack's containers and volumes
```
