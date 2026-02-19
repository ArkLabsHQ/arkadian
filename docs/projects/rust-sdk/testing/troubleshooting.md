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

### arkd Not Running
```
connection refused (os error 61)
```
Start the full environment: `just arkd-setup` (requires Nigiri running first)

### Nigiri Not Running
```
Error: bitcoind is not reachable
```
Start Nigiri: `nigiri start`

### arkd Wallet Not Initialized
```
Error: wallet not initialized
```
Run: `just arkd-init` to create and unlock the wallet

### Port Already In Use
```
error: address already in use (port 7070)
```
Kill existing processes:
```bash
just arkd-kill
just arkd-wallet-kill
```

### E2E Tests Timeout
Round interval may be too fast. Patch it:
```bash
just arkd-patch-makefile    # Sets round interval to 30s
just arkd-kill && just arkd-run
```

### Docker Container Issues
```bash
just docker-wipe                    # Stop arkd Docker containers
docker compose -f $ARKD_DIR/docker-compose.regtest.yml down -v
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
