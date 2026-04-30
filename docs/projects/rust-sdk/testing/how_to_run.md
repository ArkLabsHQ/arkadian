# How to Run Arkade Rust SDK

## Prerequisites

- **Rust**: 1.86+ (`rustup update stable`)
- **just**: Task runner (`cargo install just`)
- **protoc**: Protocol buffer compiler (for gRPC code generation)
- **Nigiri**: Local Bitcoin regtest (`curl https://getnigiri.vulpem.com | bash`)
- **Go**: Required for building arkd from source

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

### 1. Start Nigiri (Bitcoin regtest)

```bash
nigiri start
```

### 2. Checkout and Build arkd

```bash
# Checkout arkd source (requires Go installed)
just arkd-checkout master

# Optional: increase round interval to 30s for easier testing
just arkd-patch-makefile

# Build arkd
just arkd-build
```

### 3. Start arkd

```bash
just arkd-setup    # Starts arkd-wallet, arkd, and funds wallet
```

This runs:
- Docker containers (pgnbxplorer, nbxplorer)
- arkd-wallet on port 6060
- arkd on port 7070 (gRPC) / 7071 (admin)

### 4. Run E2E Tests

```bash
just e2e-tests     # Run all E2E tests
```

E2E suites of note:
- `e2e_assets` — asset issuance / transfer / burn / reissue
- `e2e_delegate`, `e2e_multisig_delegate` — delegated settlement
- `fulmine_delegator_smoke` — full VtxoWatcher loop against a fulmine delegator (skipped in CI; runs locally with the fulmine stack on `http://localhost:7004`)

### Full E2E Cycle (Clean Start)

```bash
just e2e-full      # Wipes everything, starts fresh, runs all E2E tests
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ARKD_DIR` | Path to local arkd source | (required for E2E) |
| `ARK_GO_DIR` | Parent directory for arkd checkout | (required for checkout) |

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
just arkd-kill                 # Stop arkd
just arkd-wallet-kill          # Stop arkd-wallet
just docker-wipe               # Stop Docker containers
nigiri stop --delete           # Stop and wipe Nigiri
```
