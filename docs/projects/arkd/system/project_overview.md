# arkd - Project Overview

## What is arkd?

`arkd` is the server implementation of an Arkade instance that builds on top of the Ark protocol, a Bitcoin scaling solution that enables fast, low-cost off-chain transactions while maintaining Bitcoin's security guarantees.

### Role as Arkade Operator

As an Arkade Operator, arkd performs three core responsibilities:

1. **Creates and manages Batch Outputs** through on-chain Bitcoin transactions
2. **Facilitates off-chain transactions** between users via VTXOs
3. **Provides liquidity** for commitment transactions (on-chain settlements finalizing each batch)

The Operator's role is designed with strict boundaries ensuring users always maintain control over their funds. This architecture allows for efficient transaction batching while preserving the trustless nature of Bitcoin.

## Key Concepts

### VTXOs (Virtual Transaction Outputs)
Off-chain UTXOs managed by the Ark protocol. VTXOs represent user balances and can be transferred off-chain or redeemed on-chain.

**Key Properties:**
- Binary tree structure (radix=2) for optimal proof sizes
- Time-locked with expiry (default: 7 days)
- Can be swept on-chain unilaterally by users
- Support for CSV and CLTV closure types
- Can carry Arkade Assets (fungible and non-fungible tokens)

### Rounds
Batch settlement cycles that process multiple transactions together. Rounds aggregate user intents into a single on-chain transaction.

**Round Lifecycle:**
1. **Registration** - Users register payment intents
2. **Confirmation** - Participants confirm and submit forfeit proofs
3. **Finalization** - Server builds and signs transaction tree
4. **Broadcasting** - Commitment transaction published on-chain

**Configuration (DB-persisted settings, seeded from env on first boot only):**
- `session_duration`: Session duration (default: 30s)
- `round_min_participants_count`: Minimum participants (default: 1)
- `round_max_participants_count`: Maximum participants (default: 128)

### Covenantless Architecture
Transaction builder implementation that doesn't require Bitcoin covenants, making it compatible with current Bitcoin consensus rules.

**Key Features:**
- MuSig2 key aggregation with Taproot
- Forfeit transactions for security
- Binary VTXO trees and quaternary connector trees
- 5 closure types: Multisig, CSV, CLTV, ConditionMultisig, ConditionCSV

### Arkade Assets
UTXO-native asset protocol for creating, transferring, and managing digital assets (fungible and non-fungible) both on-chain and off-chain. Features teleport transfers for asset continuity across batch swaps, control assets for reissuance, and metadata management with Merkle-based verification.

**Key Components:**
- Asset packets with TLV-encoded OP_RETURN data
- Teleport transfers for seamless asset movement across Ark batches
- Control assets for token reissuance and metadata updates
- Immutable and mutable metadata support
- Asset validation in transaction building and intent processing

## Architecture Philosophy

arkd follows **Hexagonal Architecture** (Ports and Adapters pattern) with strict layering:

```
internal/
  core/
    domain/         # Business entities, events, validation (no dependencies)
    application/    # Use case orchestration (depends on domain & ports)
    ports/          # Interface contracts for external services
  infrastructure/   # Implements ports (DB, wallet, signer, cache)
  interface/        # External APIs (gRPC, REST)
```

**Critical Dependency Rule:** Dependencies point **inward only**. Core never imports infrastructure.

## Supported Networks

- **regtest** - Local development
- **testnet3** - Bitcoin testnet
- **signet** - Signet network
- **mutinynet** - Mutiny signet
- **mainnet** - Bitcoin mainnet (ALPHA - DO NOT USE IN PRODUCTION)

## Technology Stack

### Core Technologies
- **Go 1.26.3+** - Primary language
- **Protocol Buffers** - API definition and serialization
- **gRPC** - Inter-service communication
- **Taproot / MuSig2** - Bitcoin transaction signing

### Data Persistence
- **PostgreSQL** - Production database (primary, supports auto-creation)
- **SQLite** - Development/embedded database
- **Badger** - Key-value store option

### Caching & State
- **Redis** - Distributed cache with optimistic locking
- **In-memory** - Local cache for development

### Infrastructure
- **NBXplorer** - Bitcoin wallet indexer
- **Docker Compose** - Local development environment
- **Nigiri** - Bitcoin regtest environment

### Observability
- **OpenTelemetry** - Traces, metrics, logs
- **Prometheus** - Metrics collection
- **Jaeger** - Distributed tracing
- **Grafana** - Dashboards
- **Loki** - Log aggregation
- **Pyroscope** - Continuous profiling (CPU, memory, goroutines, mutex, block)
- **AlertManager** - Alerts integration for batch lifecycle events
- **pprof** - On-demand profiling via admin interface
- **gRPC channelz** - Optional gRPC connection/channel introspection on the admin port (`ARKD_ENABLE_CHANNELZ`)

## Related Components

### arkd-wallet
On-chain wallet service based on NBXplorer, used as liquidity provider and optional signer.

**Key Features:**
- NBXplorer WebSocket integration for real-time events
- Dual accounts: main (liquidity) + connector (specialized UTXOs)
- AES-GCM encryption with PBKDF2 for seed storage
- Optional signer functionality with forfeit key

### ark-lib
Shared utilities and data structures reusable by arkd and SDK.

**Key Components:**
- Tree structures (binary VTXOs, quaternary connectors)
- MuSig2 protocol implementation
- PSBT extensions and utilities
- BIP322-inspired proof-of-ownership (intent-proof PSBTs now set the BIP-322 `PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE` `0x09` global field carrying the signed message, so a co-signer can recompute the `to_spend` commitment from PSBT-internal data alone — PR #1132)
- Arkade Assets codec (encoding/decoding asset packets, IDs, metadata)
- Fee estimation via CEL formula engine (`arkfee/`)

### go-sdk
Client SDK for building wallets and applications in Go.

**Capabilities:**
- Onboarding (Bitcoin to Ark)
- Off-chain payments
- Collaborative exits
- Unilateral redemptions

## Major Features (Recent)

### DB-Persisted Settings with Admin CRUD API (PR #939)
Operational settings (exit delays, amount limits, round participants, ban config, tx weight limits, fees, scheduled session) now live in a single database row (`domain.Settings`) — the source of truth at runtime. `ARKD_*` settings env vars are used **only on the first boot** to seed the row; afterwards they are ignored and settings are managed via `GET`/`POST /v1/admin/settings` (partial updates with server-side validation and a returned change log). Legacy `intent_fees`/`scheduled_session` table contents are migrated into the settings row on first boot. `ARKD_SCHEDULER_TYPE` and `ARKD_ALLOW_CSV_BLOCK_TYPE` were removed; the scheduler is derived from the `vtxo_tree_expiry` locktime type.

### Signer-Key Deprecation / Rotation (PR #1097)
The operator can rotate the server signing key without invalidating VTXOs that were signed by an older key. `arkd-wallet` accepts a comma-separated `DEPRECATED_SIGNER_KEYS` env var (each entry `<hexkey>[:<unix-cutoff>]`, the cutoff being the time after which the key is no longer accepted, `0`/unset = never); startup rejects a deprecated key that matches the current `SIGNER_KEY`. The signer gRPC `GetPubkeyResponse` now returns the deprecated keys (`DeprecatedSigner{pubkey, cutoff_date}`), and the indexer/application layers verify intents and strip signer signatures against the union of the current and all deprecated signer pubkeys.

### Optional `x-sdk-version` Client Header (PR #1113)
`pkg/client-lib` can attach its build version to every gRPC call via the new `WithClientVersion(version)` ServiceOption, sent as the `x-sdk-version` metadata header (only when set). The server's existing `x-build-version` `VersionGuard` interceptor was tightened so a present, parseable client version is always compared to the server minimum, regardless of whether the header is required. **Breaking:** `grpcclient.NewClient` now takes `(serverUrl, clientVersion)`.

### Client-Side Deprecated-Signer Verification (PR #1117)
The embedded `pkg/client-lib` SDK now verifies the server's signatures on ark and checkpoint transactions against the **set** of valid signer keys (current + deprecated) — the client-side counterpart to the server-side signer-key rotation (PR #1097). `types.Config` gains a `DeprecatedSigners []DeprecatedSigner` field (each `{PubKey, CutoffDate}`) and a `Config.AllSigners()` helper returning a `map[string]*btcec.PublicKey` keyed by x-only hex pubkey. The verification helpers (`verifySignedArk` / `verifySignedCheckpoints` / `verifyOffchainPsbt`) now take that signer map instead of a single pubkey, match each signed input's `TaprootScriptSpendSig.XOnlyPubKey` against any key in the set, and verify with the matched key. `SendOffChain`, `IssueAsset`, `ReissueAsset`, and `BurnAsset` load the config via `GetConfigData` and pass `AllSigners()`. The file store persists deprecated signers as a `deprecated_signers` JSON array (`{pubkey, cutoff_date}`, compressed-hex pubkey + RFC3339 cutoff).

### CEL-Based Batch Trigger Gate (PR #1046)
An optional `ARKD_BATCH_TRIGGER` CEL formula (stored as the `batch_trigger` setting) decides whether the server starts a new batch round. When unset (default), the legacy "always start a round" behaviour is preserved. The program is evaluated at the top of `startRound()` against `intents_count`, `current_feerate`, `time_since_last_batch`, `boarding_inputs_count`, `total_boarding_amount`, `total_intent_fees` and a `now()` helper; it must return `bool`. Seeded from the env var on first boot, it is admin-updatable at runtime via `UpdateSettings` (the compiled program is cached and recompiled only on text change). Validated at startup and on every update; round-time evaluation **fails open** so a buggy formula never halts rounds. Backed by a new `internal/core/domain/batchtrigger` package and `add_batch_trigger` migrations (sqlite + postgres).

### Fee System (CEL-Based)
Programmable fee management using CEL (Common Expression Language) formulas. Supports per-intent-type fees (onchain input, offchain input, onchain output, offchain output) with admin APIs for managing fee programs and a client-facing fee estimation RPC.

### Liquidity Management
Admin RPCs for analyzing expiring and recoverable liquidity, plus manual sweep capabilities for targeted UTXO cleanup.

### PostgreSQL Auto-Creation
Automatic database creation when using PostgreSQL backend, eliminating manual DB provisioning steps.

### CEL-Based Indexer Subscription Filters
The indexer's `GetSubscription` / `UpdateSubscription` streaming APIs now accept CEL (Common Expression Language) tx filter expressions alongside script filters. A subscription receives a tx event when any of its CEL expressions matches the transaction (e.g. on its ARK OP_RETURN extension packets) or when the event carries a watched script. The redesigned `SubscriptionFilter` combines both filter types in a single call instead of being mutually exclusive. Each subscription stream is now the listener's **sole consumer** — a new stream displaces (force-closes) any prior stream on the same `subscription_id` so events are never split across two connections (commit #5c56d54c), and a gRPC server keepalive (30s ping / 20s timeout) reaps dead client connections. Invalid or over-cap tx filters return structured `INVALID_TX_FILTER` / `TX_FILTERS_LIMIT_EXCEEDED` errors (PR #1141).

## Current Status

**ALPHA SOFTWARE**

arkd is currently in alpha stage. This software is experimental and under active development.

**DO NOT ATTEMPT TO USE IN PRODUCTION**. Use at your own risk.

## Quick Links

- **Architecture Details**: `system/architecture.md`
- **Getting Started**: `testing/how_to_run.md`
- **Configuration**: `system/configuration.md`
- **Integration Points**: `system/integration_points.md`
