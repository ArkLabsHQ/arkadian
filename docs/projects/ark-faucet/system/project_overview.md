# Project Overview: ARK Faucet

## What is ARK Faucet?

ARK Faucet is an offchain-only wallet service designed for distributing Ark coins through a simple HTTP API. It provides an automated faucet system for development, testing, and coin distribution purposes.

## Purpose

The service enables programmatic distribution of Ark coins to both onchain and offchain addresses without requiring manual wallet operations. It serves as a self-service faucet for developers and users who need testnet or development coins.

## Key Features

### Core Functionality
- **Coin Distribution**: Send coins to any valid address via HTTP POST request (rejects empty address / zero amount)
- **Address Management**: Retrieve service addresses (both onchain and offchain)
- **Balance Checking**: Query current service balance
- **Automatic Refill**: Mint and redeem notes via the arkd admin API (admin macaroon optional); auto-manages arkd intent fees so refill works whether or not fees are enabled
- **Manual Refill**: Redeem notes directly to add funds
- **Healthcheck & CORS**: Public liveness probe and permissive CORS for browser clients
- **Server-Side Logging**: One log line per request (method, path, status, latency) and every error logged server-side (5xx error, 4xx warn)

### Network Support
- **Dual Mode**: Supports both Bitcoin (covenantless) and Liquid (covenant) networks
- **Configurable**: Switch between networks via environment variable
- **Network Detection**: Automatically routes to correct transaction type

### Security
- **Public Faucet Endpoint**: Open access for coin requests
- **Protected Admin Endpoints**: Basic authentication for balance, refill operations
- **Wallet Encryption**: Password-protected wallet storage
- **Configurable Credentials**: Customizable admin username/password

### Storage and Persistence
- **Persistent Wallet**: HD (BIP-39 mnemonic) wallet state maintained across restarts
- **Note Initialization**: Bootstrap wallet with pre-generated notes
- **Automatic VTXO Rollover**: Handled by the go-sdk's built-in auto-settle (scheduled on unlock); the faucet no longer runs its own rollover loop
- **Checkpoint-Rotation Recovery**: On startup the faucet refreshes its cached checkpoint tapscript from arkd's `GetInfo`, so it recovers from an operator signer/forfeit-key rotation (which otherwise fails offchain sends with `CHECKPOINT_MISMATCH`) on the next redeploy

## Use Cases

1. **Development Faucets**: Provide coins for local development environments
2. **Testnet Distribution**: Public faucet for testnet users
3. **Internal Testing**: Automated coin distribution for integration tests
4. **Demo Environments**: Enable users to try Ark without acquiring coins

## Architecture

```
HTTP API (Port 9999)
      |
      v
Service Layer (pkg/service.go)
      |
      v
Ark SDK (go-sdk)
      |
      v
Ark Server (arkd)
```

### Component Overview
- **HTTP Server**: `NewHandler` (`pkg/handler.go`) wires routes with CORS, basic-auth, and panic-recovery middleware; exposes a public `/healthcheck`
- **Service Layer**: Business logic for faucet operations and note minting (`pkg/service.go`)
- **Ark SDK Integration**: Wallet management and transaction creation
- **Storage**: File-based wallet data persistence

The HTTP API is decoupled from `main` so it can be imported and exercised by unit tests (`pkg/handler_test.go`) and an end-to-end suite (`e2e/`) that runs against the vendored arkade-regtest stack.

## Integration

ARK Faucet integrates with the Ark ecosystem through the go-sdk (v0.10):
- Uses the `sdk.Wallet` API for all wallet operations (migrated from the retired `sdk.ArkClient`)
- Connects to arkd server via gRPC (through SDK)
- Leverages SDK's HD wallet with a BIP-39 mnemonic identity (replaced the old single-key/hex-seed wallet)
- Utilizes SDK's automatic transaction building, signer-rotation handling, and auto-settle

## Technology Stack

- **Language**: Go
- **HTTP Framework**: Standard library net/http
- **Wallet SDK**: arkade-os/go-sdk (v0.10, `sdk.Wallet` HD wallet API)
- **Storage**: File-based (via SDK store package)
- **Deployment**: Docker-ready with volume mounts
