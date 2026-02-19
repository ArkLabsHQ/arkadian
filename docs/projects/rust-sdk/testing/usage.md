# Arkade Rust SDK — Usage Guide

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
ark-client = "0.8"
ark-core = "0.8"
```

For on-chain wallet operations:
```toml
ark-bdk-wallet = "0.8"
```

For SQLite swap storage:
```toml
ark-client = { version = "0.8", features = ["sqlite"] }
```

## Client Initialization

```rust
use ark_client::OfflineClient;
use bitcoin::key::Keypair;

// Create offline client with configuration
let offline_client = OfflineClient::new(
    "my-wallet".to_string(),
    keypair,
    blockchain,            // Esplora backend
    wallet,                // BDK wallet
    "https://ark-server.example.com".to_string(),
    swap_storage,          // InMemorySwapStorage or SQLite
    "https://boltz.example.com".to_string(),
    timeout,
);

// Connect to arkd server
let client = offline_client.connect().await?;
```

## Common Operations

### Get Addresses
```rust
let (ark_address, _) = client.get_offchain_address();
let boarding_address = client.get_boarding_address()?;
```

### Check Balance
```rust
let balance = client.offchain_balance().await?;
println!("Total: {} sats", balance.total());
```

### Send VTXOs
```rust
use ark_core::ArkAddress;
use bitcoin::Amount;

let address = ArkAddress::decode("ark1...")?;
let psbt = client.send_vtxo(address, Amount::from_sat(10_000)).await?;
```

### Transaction History
```rust
let history = client.transaction_history().await?;
for tx in history {
    println!("{}: {} sats", tx.tx_type(), tx.amount());
}
```

### Settlement (Round Participation)
```rust
let spendable = client.spendable_vtxos().await?;
let boarding = client.get_boarding_outputs().await?;
// Register inputs, participate in round, sign tree
```

## Feature Flags

| Flag | Description |
|------|-------------|
| `tls-native-roots` | Use OS native TLS certificates (default) |
| `tls-webpki-roots` | Use bundled webpki certificates |
| `sqlite` | Enable SQLite-backed swap storage |
| `test-utils` | Enable test helper functions |

## WASM Usage

For browser/WASM applications, use `ark-core` and `ark-rest` directly:

```toml
[dependencies]
ark-core = "0.8"
ark-rest = "0.8"
```

Build with:
```bash
cargo build --target wasm32-unknown-unknown
```

## Examples

See `ark-client-sample/src/main.rs` for a complete example client, and `e2e-tests/tests/` for protocol interaction patterns.
