# Architecture: ARK Faucet

## Service Architecture

ARK Faucet follows a simple three-layer architecture optimized for a single-purpose service:

### Layer Breakdown

**HTTP Server Layer**
The service runs an HTTP server on a configurable port (default 9999) that exposes REST endpoints. It includes a basic authentication middleware that protects admin endpoints while keeping the faucet endpoint public.

**Service Layer**
The main service implementation in `pkg/service.go` provides the core business logic. It manages the Ark SDK client lifecycle, handles wallet operations, and implements the faucet distribution logic. This layer translates HTTP requests into SDK operations.

**SDK Integration Layer**
The Ark SDK (`arkade-os/go-sdk`) handles all wallet operations including key management, transaction creation, VTXO management, and server communication. The faucet service uses a single-key wallet type with gRPC client for server connectivity.

## Components

### Main Service (pkg/service.go)

The service struct maintains:
- Ark SDK client instance
- Configuration (datadir, server URL, passwords)
- Optional notes for initialization
- Arkd datadir path for macaroon access

Key responsibilities:
- Initialize and manage SDK client lifecycle
- Handle wallet unlock/lock operations
- Coordinate refill operations via admin API
- Run background VTXO rollover service

### HTTP Handlers

Five primary endpoints handle different operations:
- Faucet handler: Validates requests and sends coins
- Address handler: Returns service addresses
- Balance handler: Queries current balance (requires auth)
- Refill handler: Mints and redeems notes automatically (requires auth)
- Refill-with-notes handler: Redeems provided notes (requires auth)

### Ark SDK Client

The service configures the SDK with:
- Single-key wallet type for simplicity
- gRPC client type for server communication
- Optional transaction feed disabled (offchain-only)
- Explorer URL for onchain operations

### Note Redemption Logic

Notes can be provided in two ways:
1. At startup via `ARK_FAUCET_NOTES` environment variable
2. Through the refill-with-notes endpoint

The service redeems notes by calling `arkSdk.RedeemNotes()`, which handles the full redemption flow including server communication and VTXO creation.

### VTXO Rollover Service

A background goroutine runs every 5 minutes to check for expiring VTXOs. If any VTXO expires within 5 minutes, the service automatically calls `arkSdk.Settle()` to roll over all coins into a new round, preventing expiration.

## Data Flow

### Faucet Request Flow

1. Client sends POST to `/faucet` with address and amount
2. Handler validates request parameters
3. Service creates receiver type with address and amount
4. SDK determines if address is onchain or offchain
5. For offchain: SDK calls `SendOffChain()` to create VTXO transfer
6. For onchain: SDK calls `CollaborativeExit()` to create onchain withdrawal
7. SDK communicates with arkd server to complete transaction
8. Transaction ID returned to client

### Automatic Refill Flow

1. Admin sends POST to `/refill?amount=X` with basic auth
2. Service reads admin.macaroon from arkd datadir
3. Service loads TLS certificate if HTTPS is used
4. Service sends POST to arkd's `/v1/admin/note` endpoint
5. Arkd validates macaroon and mints notes
6. Service receives notes in response
7. Service calls `RedeemNotes()` to convert notes to VTXOs
8. SDK completes redemption round with server
9. New VTXOs added to wallet balance
10. Transaction ID returned to admin

### Manual Note Redemption Flow

1. Admin sends POST to `/refill-with-notes` with notes array and basic auth
2. Service validates notes array is not empty
3. Service calls SDK's `RedeemNotes()` method
4. SDK creates redemption transaction and submits to server
5. Server includes redemption in next round
6. VTXOs added to wallet after round confirmation
7. Transaction ID returned to admin

## Storage

### Wallet Data
All wallet data is stored in the directory specified by `ARK_FAUCET_DATADIR`. The SDK manages two storage types:
- Config store: Wallet configuration (file-based)
- AppData store: VTXOs and transaction data (KV store)

### No Transaction History
The faucet does not maintain a history of distributions. It only tracks current balance and active VTXOs through the SDK.

### Persistent State
The SDK's store ensures wallet state persists across restarts. On startup, the service loads the existing wallet if available, or initializes a new one if not.

## Security Model

### Public Access
The `/faucet` endpoint is intentionally public to allow anyone to request coins. Rate limiting should be implemented externally if needed.

### Protected Endpoints
Balance, refill, and refill-with-notes endpoints require basic authentication. Credentials are configurable via environment variables and default to `admin:admin`.

### Wallet Encryption
The SDK wallet is encrypted with a password. The service must have the password to unlock the wallet on startup. The password is never exposed through the API.

### Macaroon-Based Admin Access
The automatic refill feature requires access to arkd's admin macaroon. This provides cryptographic proof of authorization to mint notes. The macaroon must be available in the arkd datadir.

## Dual Mode Support

### Covenantless Mode (Bitcoin)
When `ARK_FAUCET_IS_COVENANT=false`, the service operates on Bitcoin using covenant-free transactions. This is the default mode.

### Covenant Mode (Liquid)
When `ARK_FAUCET_IS_COVENANT=true`, the service operates on Liquid using covenant-based transactions. The SDK handles the transaction building differences transparently.

The mode must match the arkd server configuration. Mismatched modes will cause transaction failures.
