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

**Configuration:**
- `ARKD_ROUND_INTERVAL`: Time between rounds (default: 30s)
- `ARKD_ROUND_MIN_PARTICIPANTS_COUNT`: Minimum participants (default: 1)
- `ARKD_ROUND_MAX_PARTICIPANTS_COUNT`: Maximum participants (default: 128)

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
- BIP322-inspired proof-of-ownership
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

### Fee System (CEL-Based)
Programmable fee management using CEL (Common Expression Language) formulas. Supports per-intent-type fees (onchain input, offchain input, onchain output, offchain output) with admin APIs for managing fee programs and a client-facing fee estimation RPC.

### Liquidity Management
Admin RPCs for analyzing expiring and recoverable liquidity, plus manual sweep capabilities for targeted UTXO cleanup.

### PostgreSQL Auto-Creation
Automatic database creation when using PostgreSQL backend, eliminating manual DB provisioning steps.

## Current Status

**ALPHA SOFTWARE**

arkd is currently in alpha stage. This software is experimental and under active development.

**DO NOT ATTEMPT TO USE IN PRODUCTION**. Use at your own risk.

## Quick Links

- **Architecture Details**: `system/architecture.md`
- **Getting Started**: `testing/how_to_run.md`
- **Configuration**: `system/configuration.md`
- **Integration Points**: `system/integration_points.md`
