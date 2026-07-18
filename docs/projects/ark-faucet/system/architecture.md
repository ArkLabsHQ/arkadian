# Architecture: ARK Faucet

## Service Architecture

ARK Faucet follows a simple three-layer architecture optimized for a single-purpose service:

### Layer Breakdown

**HTTP Server Layer**
The service runs an HTTP server on a configurable port (default 9999) that exposes REST endpoints. The router is built by `NewHandler` in `pkg/handler.go` (extracted from `cmd/main.go` so the HTTP API is importable and unit-testable). All routes are wrapped with panic recovery and a CORS middleware (allows any origin, handles `OPTIONS` preflight); basic-auth middleware protects the admin endpoints while `/faucet`, `/address` and `/healthcheck` stay public. A `loggingMiddleware` wraps the whole mux and logs one line per request (method, path, status, latency), and every error response goes through a `writeError` helper that logs the reason server-side (5xx at error level, 4xx at warn) so failures are visible in the logs instead of only being returned to the caller.

**Service Layer**
The main service implementation in `pkg/service.go` provides the core business logic. It manages the Ark SDK client lifecycle, handles wallet operations, and implements the faucet distribution logic. This layer translates HTTP requests into SDK operations.

**SDK Integration Layer**
The Ark SDK (`arkade-os/go-sdk` v0.10) handles all wallet operations including key management, transaction creation, VTXO management, and server communication. The faucet uses the `sdk.Wallet` API (loaded via `sdk.LoadWallet` / created via `sdk.NewWallet`), an HD wallet with a BIP-39 mnemonic identity, over a gRPC client. The SDK also handles signer-rotation, auto-migration, and auto-settle internally.

## Components

### Main Service (pkg/service.go)

The service struct maintains:
- Ark SDK `sdk.Wallet` instance
- Configuration (datadir, server URL, passwords)
- Optional notes for initialization
- Arkd datadir path for macaroon access

Key responsibilities:
- Initialize and manage the SDK wallet lifecycle
- Handle wallet unlock/lock operations
- Refresh the cached checkpoint tapscript on startup (see below)
- Coordinate refill operations via admin API
- (VTXO rollover is delegated to the SDK's auto-settle; no in-service loop)

### HTTP Handlers

Endpoints handle different operations:
- Healthcheck handler: Public liveness ping
- Faucet handler: Validates requests (rejects empty address / zero amount with 400) and sends coins
- Address handler: Returns service addresses
- Balance handler: Queries current balance (requires auth)
- Refill handler: Mints and redeems notes automatically (requires auth); rejects amounts above `uint32` max with 400
- Refill-with-notes handler: Redeems provided notes (requires auth)

All success responses return `{"txid": "<id>"}`.

### Ark SDK Client

The service configures the SDK with:
- `sdk.Wallet` HD wallet (BIP-39 mnemonic identity)
- gRPC client type for server communication
- An empty seed at `Init`, so the SDK generates a fresh mnemonic (the old hex-seed identity is rejected as an "invalid mnemonic" by the v0.10 SDK)
- Explorer URL for onchain operations

### Note Redemption Logic

Notes can be provided in two ways:
1. At startup via `ARK_FAUCET_NOTES` environment variable
2. Through the refill-with-notes endpoint

The service redeems notes by calling `arkSdk.RedeemNotes()`, which handles the full redemption flow including server communication and VTXO creation.

### VTXO Rollover (SDK auto-settle)

VTXO rollover is handled by the go-sdk's built-in auto-settle, scheduled when the wallet unlocks. The faucet's own 5-minute rollover goroutine was retired to avoid double-settling; expiring VTXOs are refreshed by the SDK.

### Checkpoint Tapscript Refresh

arkd rebuilds every offchain send's checkpoint transactions from its own checkpoint tapscript (derived from the operator's forfeit key and checkpoint exit delay) and rejects a mismatch with `CHECKPOINT_MISMATCH`. The wallet caches that tapscript once at init and the SDK never refreshes it (its signer-rotation handler refreshes the signer key but not the checkpoint tapscript), so an operator-side key rotation leaves the faucet unable to send offchain.

On every `Start` — before the wallet loads its config — the service calls `refreshCheckpointTapscript`: it opens the config store, fetches the operator's current checkpoint tapscript via `GetInfo`, and overwrites the cached copy in place when it differs (leaving the wallet key untouched). It no-ops when the wallet isn't initialized yet and treats an unreachable arkd as a non-fatal warning, so a transient outage doesn't block startup. A redeploy is therefore enough to recover from a rotation.

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
2. Service resolves the admin URL (`ARK_FAUCET_SERVER_ADMIN_URL`, falling back to `ARK_FAUCET_SERVER_URL`)
3. If an arkd datadir is set, the service reads `admin.macaroon`; otherwise the macaroon header is skipped (NO_MACAROONS arkd)
4. TLS is configured only when the admin URL is `https://` and a cert is present
5. Service sends POST to the admin API's `/v1/admin/note` endpoint to mint notes
6. Service receives notes in response (note values are not logged)
7. Service redeems the notes through the intent-fee-zeroing wrapper (see below)
8. SDK completes redemption round with server
9. New VTXOs added to wallet balance
10. Transaction ID returned to admin

All admin-API calls (note minting, intent-fee read/write) go through a shared `adminDo` helper in `pkg/service.go` that handles the macaroon header, TLS config, request build, and response read for any method/path against the admin URL.

### Manual Note Redemption Flow

1. Admin sends POST to `/refill-with-notes` with notes array and basic auth
2. Service validates notes array is not empty
3. Service redeems the notes through the intent-fee-zeroing wrapper (see below)
4. SDK creates redemption transaction and submits to server
5. Server includes redemption in next round
6. VTXOs added to wallet after round confirmation
7. Transaction ID returned to admin

### Intent-Fee Management Around Redeems

A note redeem registers an intent that pays no fee, which arkd rejects with `INTENT_INSUFFICIENT_FEE` when intent fees are enabled — leaving the wallet unfunded and `/faucet` failing with "missing vtxos". To fund the faucet regardless of fee config, both refill paths wrap the `RedeemNotes()` call in `withZeroIntentFees`:

1. Acquire a process-wide mutex (`feeMu`) so concurrent refills can't restore each other's zeroed fees
2. Read the current intent fees via `GET /v1/admin/intentFees`
3. Set all fees to `"0.0"` (arkd evaluates fee fields as doubles, so the literal must be `"0.0"`, not `"0"`) via `POST /v1/admin/intentFees`
4. Run the redeem
5. Restore the saved fees afterward (even on failure)

If the intent-fee endpoint can't be read or set (older arkd without it, or no admin access), the redeem runs unguarded so fee-free setups still work.

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
When arkd is configured with macaroons, the automatic refill feature reads the admin macaroon from the arkd datadir to authorize note minting. The macaroon is optional: against a NO_MACAROONS arkd (e.g. arkade-regtest) the refill still works without it.

## Dual Mode Support

### Covenantless Mode (Bitcoin)
When `ARK_FAUCET_IS_COVENANT=false`, the service operates on Bitcoin using covenant-free transactions. This is the default mode.

### Covenant Mode (Liquid)
When `ARK_FAUCET_IS_COVENANT=true`, the service operates on Liquid using covenant-based transactions. The SDK handles the transaction building differences transparently.

The mode must match the arkd server configuration. Mismatched modes will cause transaction failures.
