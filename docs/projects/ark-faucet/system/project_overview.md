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
- **Automatic Refill**: Mint and redeem notes via the arkd admin API (admin macaroon optional)
- **Manual Refill**: Redeem notes directly to add funds
- **Healthcheck & CORS**: Public liveness probe and permissive CORS for browser clients

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
- **Persistent Wallet**: Wallet state maintained across restarts
- **Note Initialization**: Bootstrap wallet with pre-generated notes
- **Automatic VTXO Rollover**: Background service refreshes expiring coins

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

ARK Faucet integrates with the Ark ecosystem through the go-sdk:
- Uses `arksdk.ArkClient` for all wallet operations
- Connects to arkd server via gRPC (through SDK)
- Leverages SDK's single-key wallet implementation
- Utilizes SDK's automatic transaction building

## Technology Stack

- **Language**: Go
- **HTTP Framework**: Standard library net/http
- **Wallet SDK**: arkade-os/go-sdk
- **Storage**: File-based (via SDK store package)
- **Deployment**: Docker-ready with volume mounts
