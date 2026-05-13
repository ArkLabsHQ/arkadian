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
    None,                  // boltz_referral_id (None → DEFAULT_BOLTZ_REFERRAL_ID = "arkade-rs-SDK")
    timeout,
    None,                  // delegator_pk
    vec![],                // historical_delegator_pks
);

// Optionally opt out of the default Boltz referral ID:
// let offline_client = offline_client.with_boltz_referral_id(None);

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

## Delegated Watcher (auto-renewal)

Configure a delegator pubkey on the `OfflineClient` to make addresses use the 3-of-3 delegate script, then start the background watcher to auto-delegate new VTXOs to a delegator service (e.g. fulmine):

```rust
use ark_delegator::DelegatorClient;
use std::sync::Arc;

let delegator = Arc::new(DelegatorClient::new("https://delegator.example.com".into()));
let info = delegator.info().await?;
let delegator_pk: bitcoin::XOnlyPublicKey = info.pubkey.parse::<bitcoin::PublicKey>()?.into();

// Pass delegator_pk + historical_delegator_pks when constructing OfflineClient.
// After connect():
let _watcher = client.start_vtxo_watcher(delegator);  // background task; drop or `.stop()` to terminate
```

In `ark-client-sample`, set `delegator_pubkey` (and optionally `historical_delegator_pubkeys`) in `ark.config.toml`, then run:

```bash
ark-client-sample watch-delegated --delegator-url http://localhost:7004
```

## Asset Operations (Arkade Asset V1)

```rust
use ark_core::asset::ControlAssetConfig;
use std::num::NonZeroU64;

// Issue a new asset (1000 units, with a re-issuable control asset).
let result = client.issue_asset(
    1_000,
    Some(ControlAssetConfig::New { amount: NonZeroU64::new(1).unwrap() }),
    None, // optional metadata: Vec<(String, String)>
).await?;
```

Asset transfer/burn/reissue go through the same generic offchain-send path as VTXO sends.

## Chain Swaps (ARK ↔ on-chain BTC)

```rust
let swap_id = client.create_chain_swap(/* … */).await?;
client.wait_for_chain_swap_server_lockup(&swap_id).await?;
let txid = client.claim_chain_swap(&swap_id).await?;     // ARK side
// or: client.claim_chain_swap_btc(&swap_id, ...).await?;  // BTC side
```

Use `refund_chain_swap` / `refund_chain_swap_btc` if Boltz fails to lock up. Persisted in the `chain_swaps` SQLite table.

## Examples

See `ark-client-sample/src/main.rs` for a complete example client, and `e2e-tests/tests/` for protocol interaction patterns (incl. `e2e_assets`, `e2e_delegate`, `fulmine_delegator_smoke`).
