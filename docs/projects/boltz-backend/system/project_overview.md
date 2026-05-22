# Boltz Backend — Project Overview

## What is Boltz Backend?

Boltz Backend is the server infrastructure powering [Boltz Exchange](https://boltz.exchange/), a non-custodial swap service for Bitcoin and related layers. It enables trustless atomic swaps between Bitcoin mainchain, Lightning Network, Liquid sidechain, and EVM-compatible chains without requiring users to trust a third party with their funds.

The backend exposes a RESTful HTTP API that clients use to create and monitor swaps. All swaps are atomic, meaning they either complete successfully for both parties or safely refund without loss of funds.

## Core Features

### Non-Custodial Architecture
- Users retain full control of their funds at all times
- No deposits, no accounts, no KYC
- Atomic swaps ensure trustless execution
- Refunds are always possible if swaps fail or expire

### Three Swap Types

**1. Submarine Swaps** (Chain → Lightning)
- Convert on-chain Bitcoin to Lightning capacity
- User sends on-chain transaction
- Boltz sends Lightning payment
- Useful for adding Lightning liquidity

**2. Reverse Submarine Swaps** (Lightning → Chain)
- Convert Lightning balance to on-chain Bitcoin
- User pays Lightning invoice
- Boltz sends on-chain transaction
- Useful for draining Lightning channels or cashing out

**3. Chain Swaps** (Chain → Chain)
- Move Bitcoin between different blockchains
- Supported: Bitcoin mainchain, Liquid sidechain, EVM chains
- Enables cross-chain liquidity without bridges or wrapped tokens
- 0-amount **and underpaid** EVM commitments accepted for chain swaps — the commitment is recorded, the lockup transitions to `transaction.lockup.failed` via the normal nursery path, and the swap moves into the same renegotiation flow used by UTXO lockups (Submarine Swaps still reject underpaid commitments)

### Advanced Features

**Taproot Integration**
- Cooperative key path spends for privacy
- Fallback to script path if cooperation fails
- Reduced on-chain footprint and fees

**0-Confirmation Support**
- Certain swap amounts accepted without confirmation
- Faster user experience for small swaps
- Risk managed through amount limits

**BOLT12 Offers**
- Support for Lightning offers and blinded paths
- Enhanced privacy for Lightning payments
- Future-proof Lightning integration

**Magic Routing Hints**
- Automatic Lightning routing optimization
- Improved payment success rates
- Better user experience

**Claim Transaction Tracking**
- Persists claim transaction IDs for reverse and chain swaps in a dedicated `claim_transactions` table
- PostgreSQL trigger enforces that each claim transaction's `swap_id` references an existing reverse or chain swap
- Cooperative claims on UTXO-based chains are intentionally not stored (preimage already obtained from cooperative signing)

**Robust Swap Lifecycle**
- Tolerates positive slippage on commitment swaps and chain-swap renegotiation (single shared `OverpaymentProtector`)
- Recomputes zero-conf decisions on chain-swap renegotiation
- Excludes paid swaps from invoice expiry; expiry never overwrites paid swaps
- Bounded swap-restore pagination during recovery

**gRPC JWT Authentication**
- The `boltzrpc.Boltz` gRPC service now authenticates every call via a JWT interceptor (PR #1415). On first start a bootstrap admin token is written to `<certificates>/admin.jwt` (`0600`); tokens are persisted in a new `jwt_tokens` table
- New RPCs `IssueJwt` / `RevokeJwt` / `ListJwts` / `ListMethods` plus `boltzr-cli jwt …` commands let operators mint scoped tokens (per-token `allowed_methods` with exact paths or `*` / `<service>/*` wildcards, optional `expires_in_seconds` TTL) and inspect the methods/wildcards the allowlist accepts
- Configurable via `[grpc.jwt]` in `boltz.conf` (`disable`, `secretFile`, `adminTokenFile` — defaults: `<certificates>/jwt.key`, `<certificates>/admin.jwt`)

**Operational Signer Control**
- Persisted gRPC surface (`DisableSigners` / `EnableSigners` / `GetDisabledSigners`) and `boltzr-cli signer …` commands let operators disable individual cooperative/lockup signer paths (submarine-refund, reverse-claim, chain-refund, chain-claim, deferred-claim, EVM-refund, EVM-commitment-refund, reverse-lockup, chain-lockup, submarine-invoice-payment) at runtime
- State lives in the `disabled_signers` table and is enforced by an in-process `SignerControlRegistry`; the legacy dev-only `DevDisableCooperative` toggle has been removed

**Liquid 0-Conf Observation API**
- Optional `[liquid.chain.zeroConfTool]` configuration enables an external bridge-observation quorum for Liquid 0-conf safety; transport (`http(s)` polling vs `ws(s)` push) is selected by URL scheme, with separate tunables per transport (`interval` / `max_retries` for HTTP, `deadline_secs` and the new `rotation_interval_secs` for WS — preemptive reconnects before the server-side TTL drops the WebSocket; default `3300` seconds, `0` disables)
- Removes the legacy `[liquid.chain.lowball]` backup-node configuration and the in-process `ElementsWrapper` dual-Elements-node failover (PR #1417); `liquid.chain` now configures a single Elements RPC endpoint

## Technology Stack

### TypeScript/Node.js
- Primary backend implementation (TypeScript **v6**)
- Express for REST API (build via `tsconfig.build.json`)
- Sequelize ORM for database
- gRPC clients for Lightning integration

### Rust
- High-performance components (boltzr, boltz-core)
- CLN integration via boltzr sidecar
- Cryptographic operations and Taproot logic

### Databases
- PostgreSQL for production
- SQLite for development and testing
- Redis for caching and rate limiting

### Observability
- Prometheus metrics
- OpenTelemetry distributed tracing
- Loki log aggregation

## Use Cases

### For Lightning Users
- Add liquidity to Lightning channels without on-chain transaction delays
- Drain Lightning channels to on-chain for savings or cold storage
- Rebalance channel liquidity

### For Ark Users (via Fulmine)
- Convert Ark VTXOs to Lightning for broader payment acceptance
- Exit Ark to on-chain Bitcoin through Lightning intermediary
- Access Lightning Network from Ark protocol

### For Exchange Integrators
- Provide Lightning on/off-ramps for users
- Enable cross-chain swaps without wrapped tokens
- Offer non-custodial swap services

### For Privacy-Conscious Users
- Swap between chains without KYC or accounts
- Taproot swaps for on-chain privacy
- BOLT12 for Lightning privacy

## Architecture Highlights

### Modular Design
- Clean separation between chain layer, Lightning layer, and API layer
- Pluggable wallet backends
- Multiple Lightning implementations supported (LND, CLN)

### State Machine
- Well-defined swap states (created → pending → claimed/refunded)
- Automatic state transitions
- Monitoring and webhook notifications

### Security
- Timelock-based refunds prevent fund loss
- HTLC preimage reveals are atomic
- No hot wallet exposure (swaps are self-contained)

See `architecture.md` for detailed technical architecture.

## Integration with Ark Ecosystem

Boltz Backend integrates with the Ark protocol ecosystem through **Fulmine**, a Bitcoin wallet that combines Ark VTXOs with Lightning Network swaps.

**Integration Flow**:
1. Fulmine users hold Ark VTXOs (off-chain Bitcoin)
2. To access Lightning, users initiate submarine swap via fulmine
3. Fulmine calls Boltz Backend API to create swap
4. User's Ark VTXOs are converted to on-chain Bitcoin
5. Boltz converts on-chain Bitcoin to Lightning
6. User receives Lightning capacity

**Benefits for Ark Users**:
- Access Lightning Network from Ark without direct channel management
- Liquidity flexibility across Ark, Lightning, and on-chain
- Non-custodial swaps with no trust required

See `integration-with-arkd.md` for detailed integration patterns and examples.

## Resources

- **Official Docs**: https://docs.boltz.exchange/
- **API Docs**: https://docs.boltz.exchange/v/api
- **GitHub**: https://github.com/BoltzExchange/boltz-backend
- **Discord**: https://discord.gg/QBvZGcW
- **Blog**: https://blog.boltz.exchange/
