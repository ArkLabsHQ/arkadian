# Boltz Backend — Architecture

## Overview

Boltz Backend uses a hybrid TypeScript + Rust architecture to combine developer productivity with high performance. The TypeScript layer handles API, orchestration, and database, while Rust components provide performance-critical operations like Lightning integration and cryptographic primitives.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Boltz Backend                          │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │         REST API (Express)                      │   │
│  │  GET /getpairs, POST /createswap, etc.          │   │
│  └─────────────────┬───────────────────────────────┘   │
│                    │                                     │
│  ┌─────────────────▼───────────────────────────────┐   │
│  │         Swap Service (Orchestration)            │   │
│  │  - State machine                                │   │
│  │  - Swap lifecycle management                    │   │
│  │  - Webhook notifications                        │   │
│  └─────┬───────────┬───────────────┬───────────────┘   │
│        │           │               │                     │
│  ┌─────▼─────┐ ┌──▼──────────┐ ┌──▼──────────┐        │
│  │  Chain    │ │  Lightning  │ │   Wallet    │        │
│  │  Layer    │ │  Integration│ │   Manager   │        │
│  │ (Bitcoin, │ │  (LND, CLN) │ │   (UTXO)    │        │
│  │  Liquid,  │ │             │ │             │        │
│  │  EVM)     │ │             │ │             │        │
│  └───────┬───┘ └──┬──────────┘ └──┬──────────┘        │
│          │        │               │                     │
│  ┌───────▼────────▼───────────────▼──────────┐        │
│  │         Database (PostgreSQL/SQLite)       │        │
│  │  - Swap records                            │        │
│  │  - Transaction history                     │        │
│  │  - Wallet state                            │        │
│  └────────────────────────────────────────────┘        │
│                                                           │
└─────────────────────────────────────────────────────────┘
        │               │                  │
        ▼               ▼                  ▼
  Bitcoin Node    Lightning Node      Redis Cache
 (bitcoind/btcd)   (LND/CLN)         (optional)
```

## TypeScript Components

### API Layer (`lib/api/`)
- **Express Server**: RESTful HTTP endpoints
- **Swagger**: OpenAPI specification and documentation
- **Rate Limiting**: Request throttling and abuse prevention
- **CORS**: Cross-origin request handling

Key endpoints:
- `GET /getpairs`: List supported swap pairs
- `POST /createswap`: Create new swap
- `GET /swapstatus`: Query swap state
- `POST /setinvoice`: Set invoice for submarine swap (if not provided at creation)

### gRPC Server (`lib/grpc/`)
- **GrpcServer**: hosts the `boltzrpc.Boltz` service used by `boltzr-cli` and internal operator tooling
- **AuthInterceptor + JwtSigner** (PR #1415): validate every call against a JWT issued by the server. Tokens are persisted in the `jwt_tokens` table and carry an `allowed_methods` allowlist (exact paths or `*` / `<service>/*` wildcards) plus optional TTL. Bootstrap admin token is written to `<certificates>/admin.jwt` on first start (`0600`); auth is configured via `[grpc.jwt]` in `boltz.conf` (`disable`, `secretFile`, `adminTokenFile`)
- **LoggingInterceptor**: structured request/response logging (renamed from the previous inline interceptor when the JWT auth interceptor was added)
- **MethodRegistry**: enumerates exact gRPC method paths and wildcard entries returned by the new `ListMethods` RPC; the same registry is consulted by the auth interceptor to validate `allowed_methods`
- **JWT management RPCs**: `IssueJwt`, `RevokeJwt`, `ListJwts`, `ListMethods` — exposed end-to-end by `boltzr-cli jwt …`

### Service Layer (`lib/service/`)
- **SwapManager**: Orchestrates swap lifecycle
- **RateProvider**: Fetches exchange rates
- **FeeCalculator**: Computes swap fees
- **NotificationManager**: Sends webhooks and notifications

### Swap Logic (`lib/swap/`)
- **SwapRepository**: Database access for swaps
- **SwapNursery**: Monitors pending swaps
- **ChannelNursery**: Monitors Lightning channels
- **State Machine**: Manages swap state transitions

Swap states:
- `swap.created` → `transaction.mempool` → `transaction.confirmed` → `invoice.paid` → `transaction.claimed`

### Chain Integration (`lib/chain/`)
- **ChainClient**: Bitcoin/Liquid blockchain interface
- **ChainTipRepository**: Track chain state
- **UTXOManager**: Manage unspent outputs
- **FeeEstimator**: Estimate on-chain fees (Bitcoin estimations rounded to one decimal for stability)
- **MempoolClient**: Hardened mempool.space integration with deduplicated instances
- **ElementsClient**: single-node Elements RPC (the `ElementsWrapper` dual-node/lowball failover was removed in PR #1417)

Supports:
- Bitcoin Core **v31.0** (bitcoind)
- btcd
- Liquid daemon (elementsd **v23.3.3**)

### Lightning Integration (`lib/lightning/`)
- **LndClient**: gRPC client for LND
- **ClnClient**: gRPC client for Core Lightning (via boltzr) — CLN **v26.04.1**
- **EclairClient**: pinned Eclair Docker image **v0.14.0** (bumped from `v0.13.1`)
- **InvoiceManager**: Create and monitor invoices
- **PaymentManager**: Execute Lightning payments

Features:
- BOLT11 invoice support
- BOLT12 offers (CLN) — hardened offer handling
- Routing hints
- Multi-path payments

### Database (`lib/db/`)
- **Sequelize ORM**: Database abstraction
- **Models**: Swap, ReverseSwap, ChainSwap, Transaction, ClaimTransaction, etc.
- **Migrations**: Schema versioning (Sequelize + diesel for `boltzr`)
- **Claim transactions table** (`claim_transactions`): records broadcast claim TXIDs for reverse/chain swaps, with a Postgres trigger enforcing `swap_id ∈ reverseSwaps ∪ chainSwaps`. Cooperative claims on UTXO chains are not stored.
- **JWT tokens table** (`jwt_tokens`): persists gRPC auth tokens issued by `IssueJwt` (id, label, allowed methods, issued/expires/revoked-at), consulted by the `AuthInterceptor` on every gRPC call.
- **Swap metadata table** (`swap_metadata`, PR #1423): opaque client-supplied routing/context blob attached to a swap at creation (`swap_id` PK → `BYTEA` data, max **1024 bytes**, `created_at` timestamp). Written by the TS `SwapMetadataRepository` from `SwapRouter` after each submarine/reverse/chain swap is created; read by the Rust `SwapMetadataHelper` and surfaced as HEX on `/v2/swap/restore` via `SwapRescue::attach_metadata`.

Supported databases:
- PostgreSQL (production)
- SQLite (development/testing)

### Wallet (`lib/wallet/`)
- **WalletManager**: HD wallet management
- **KeyRepository**: Key derivation and storage
- **CoinSelector**: UTXO selection algorithms

Key management:
- BIP39 seed phrases
- BIP32 hierarchical derivation
- Segregated witness (SegWit)
- Taproot

## Rust Components

### boltzr
High-performance Lightning sidecar written in Rust. Provides:
- gRPC server for CLN integration
- Swap coordination with Core Lightning
- Performance-critical swap operations

**Why Rust?**
- CLN plugins require native code
- Lower latency for swap operations
- Better resource efficiency

### boltz-core
Core cryptographic library shared between TypeScript and Rust:
- HTLC script generation
- Taproot key aggregation
- Preimage/hash operations
- Transaction signing

### boltzr-cli
Command-line interface for boltzr operations:
- Manage boltzr sidecar
- Query swap status
- Debug Lightning integration

## Data Flow

### Submarine Swap (Chain → Lightning)

```
1. Client: POST /createswap
   ↓
2. Service: Create swap record in DB
   ↓
3. Service: Generate lockup address (HTLC)
   ↓
4. Service: Return address to client
   ↓
5. Client: Send Bitcoin to lockup address
   ↓
6. Chain: Detect transaction (mempool/confirmed)
   ↓
7. Service: Set invoice (if not provided)
   ↓
8. Lightning: Pay invoice
   ↓
9. Lightning: Preimage revealed
   ↓
10. Service: Claim lockup transaction
    ↓
11. Chain: Broadcast claim transaction
    ↓
12. Service: Update swap state to 'claimed'
```

### Reverse Submarine Swap (Lightning → Chain)

```
1. Client: POST /createswap (with preimageHash)
   ↓
2. Service: Create swap record in DB
   ↓
3. Service: Generate hold invoice
   ↓
4. Service: Return invoice to client
   ↓
5. Client: Pay hold invoice
   ↓
6. Service: Lockup Bitcoin on-chain
   ↓
7. Chain: Broadcast lockup transaction
   ↓
8. Client: Claim on-chain Bitcoin (reveals preimage)
   ↓
9. Service: Extract preimage
   ↓
10. Lightning: Settle hold invoice
    ↓
11. Service: Update swap state to 'invoice.settled'
```

## Security Architecture

### HTLC Protection
- Timelocks prevent indefinite fund locking
- Refund paths always available after timeout
- Preimage reveals are atomic

### Key Management
- Hot wallet only holds swap amounts
- No long-term fund storage
- Regular sweeps to cold storage

### Rate Limiting
- Per-IP request limits
- Amount limits for 0-conf swaps
- Swap creation throttling

### Monitoring
- Prometheus metrics for all operations
- OpenTelemetry tracing
- Automated alerts for anomalies

## Scalability

### Horizontal Scaling
- Stateless API servers (multiple instances)
- Shared PostgreSQL database
- Redis for distributed locks

### Performance Optimizations
- Connection pooling (database, gRPC)
- UTXO caching
- Batch transaction processing
- Rust for performance-critical paths

### Resource Management
- Automatic UTXO consolidation
- Channel rebalancing
- Fee optimization

## Configuration

Key configuration areas:
- **Chains**: Bitcoin, Liquid, EVM RPC endpoints
- **Lightning**: LND/CLN connection details
- **Database**: PostgreSQL/SQLite connection strings
- **API**: Port, CORS, rate limits
- **Fees**: Base fee, percentage fee
- **Limits**: Min/max swap amounts

See `/Users/dusansekulic/code/go/boltz-backend/lib/Config.ts` for full configuration schema.
