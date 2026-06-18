# Troubleshooting Arkade Rust SDK

## Build Issues

### Rust Version Too Old
```
error: package `ark-core v0.8.0` cannot be built because it requires rustc 1.86
```
Update Rust: `rustup update stable` (requires 1.86+)

### protoc Not Found
```
error: failed to run custom build command for `ark-grpc`
```
Install protoc: See https://grpc.io/docs/protoc-installation/
- macOS: `brew install protobuf`
- Linux: `apt install protobuf-compiler`

### MSRV Build Failures
Use the minimal lock file:
```bash
cp Cargo-minimal.lock Cargo.lock
cargo build
```

### dprint Not Found
Install: `cargo install dprint` or see https://dprint.dev/install/

## E2E Test Issues

### Regtest Stack / arkd Not Running
```
connection refused (os error 61)
```
Bring up the arkade-regtest stack: `just regtest-start` (init the submodule first with `just regtest-init` if you haven't).

### Submodule Not Initialized
```
node: cannot find module '.../regtest/regtest.mjs'
```
The `regtest/` submodule is missing. Run: `just regtest-init` (`git submodule update --init --recursive regtest`).

### Stale State / Tests Failing After a Prior Run
Tear down and recreate the stack:
```bash
just regtest-clean    # removes containers + volumes
just regtest-start
```
Or run the full clean cycle: `just e2e-full`.

### On-Chain State Out of Sync
The e2e helper reads on-chain state from Bitcoin Core (`gettxout` / `getrawtransaction`), not the esplora indexer, because mempool's esplora API can lag the chain on regtest. If you see spent boarding outputs read as unspent or freshly-mined commitment TXs not found, ensure you are on the current e2e helper (post arkade-regtest migration) and that Bitcoin Core is reachable.

### Docker Issues
```bash
just regtest-clean    # remove the stack's containers and volumes, then re-start
```

## WASM Issues

### wasm-pack Not Found
Install: `cargo install wasm-pack`

### WASM Build Fails for ark-client
`ark-client` defaults to gRPC which is not WASM-compatible. For WASM, use `ark-core` + `ark-rest` directly.

### getrandom Error in WASM
Ensure `getrandom` has the `wasm-bindgen` feature enabled (already configured in Cargo.toml).

## Dependency Issues

### Cargo Lock Conflicts
```bash
cargo update                  # Regenerate lock file
```

### Feature Flag Conflicts
Check that TLS features don't conflict:
```toml
# Use ONE of these, not both:
ark-client = { version = "0.8", features = ["tls-native-roots"] }  # OR
ark-client = { version = "0.8", features = ["tls-webpki-roots"] }
```

## Debugging

### Enable Logging
The SDK uses `tracing`. Add a subscriber:
```rust
tracing_subscriber::fmt::init();
```

Set log level:
```bash
RUST_LOG=ark_client=debug cargo test
```

### Check arkd Logs
```bash
cat arkd.log            # arkd server logs
cat arkd-wallet.log     # arkd wallet logs
```

### Check arkd Status
```bash
curl http://localhost:7071/v1/admin/wallet/status
```

## Getting Help

- GitHub Issues: https://github.com/arkade-os/rust-sdk/issues
- Ark Documentation: https://arkade.dev
