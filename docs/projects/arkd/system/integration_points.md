# Integration Points

## Overview

This document describes how components communicate and integrate across the arkd architecture, following the Ports and Adapters (Hexagonal Architecture) pattern with strict dependency rules.

## Architecture Layers

```
External Clients (ark CLI, SDK, Web Wallets)
           ì gRPC/REST
Interface Layer (gRPC handlers, interceptors, type conversions)
           ì Application Service Interface
Application Layer (use case orchestration)
           ì Domain Types & Port Interfaces
Domain Layer (entities, business logic, events)
           ë implements
Ports Layer (interface contracts)
           ë implements
Infrastructure Layer (databases, wallet, signer, cache, scheduler)
           ì gRPC, HTTP, TCP
External Services (arkd-wallet, Bitcoin Network, Redis, PostgreSQL)
```

### Critical Dependency Rule
Dependencies flow **inward only**. Core never imports infrastructure.
-  Interface í Application í Domain í Ports ê Infrastructure
- L Domain must NEVER import Infrastructure or Application
- L Application must NEVER import Infrastructure directly

## Vertical Integration (Layer-to-Layer)

### Interface í Application
**Integration Point:** gRPC handlers to application services via dependency injection.

**Type Conversion:** Handlers convert proto types to domain types at the boundary:
- `arkv1.Intent` í `domain.Intent`
- `arkv1.Receiver` í `domain.Receiver`
- `arkv1.Vtxo` í `domain.Vtxo`
- `arkv1.Round` í `domain.Round`

**Error Mapping:** Domain errors are converted to gRPC status codes at the handler level.

### Application í Domain
**Integration Point:** Use case orchestration with domain logic through method calls and state machines.

The application layer coordinates domain entities, validates business rules, and persists state changes via repository interfaces.

### Application í Ports í Infrastructure
**Integration Point:** Port interfaces implemented by infrastructure adapters.

Services are injected at construction:
- `RepoManager` - Database access
- `WalletService` - Bitcoin wallet operations
- `SignerService` - Transaction signing
- `TxBuilder` - Transaction construction
- `BlockchainScanner` - Blockchain monitoring
- `SchedulerService` - Task scheduling
- `LiveStore` - Cache operations

## Horizontal Integration (Component-to-Component)

### Application Services Communication
Services share dependencies but don't call each other directly:
- Main Service - Round orchestration
- Admin Service - Operator functions
- Indexer Service - Query operations
- Sweeper Service - Automated cleanup
- Fraud Service - Security monitoring

**Communication Pattern:** Services communicate via shared state (repositories) and events (event broker).

### Infrastructure Component Integration

**Database + Event Store:**
- Event sourcing with immutable events
- CQRS with read-optimized projections
- Automatic projection updates via event handlers

**Live Store + Persistent Store:**
- Cache-aside pattern with ephemeral state
- Fast access for current round data
- Durable storage for historical data

**TX Builder + Wallet:**
- Transaction construction creates unsigned PSBTs
- Wallet signs transactions
- Integrated flow for commitment and forfeit transactions

**Scheduler + Scanner:**
- Task scheduling at specific times/heights
- Blockchain monitoring for watched scripts
- Coordinated expiry and fraud detection

## External Service Integration

### arkd î arkd-wallet
**Communication:** gRPC (port 6060 by default)

**Services:**
- Lifecycle (GenSeed, Create, Unlock, Lock)
- Operations (SelectUtxos, SignTransaction, BroadcastTransaction)
- Queries (Balance, GetTransaction)
- Signer (GetPubkey, SignTransaction, SignTransactionTapscript)

### arkd-wallet î NBXplorer
**Communication:** HTTP REST + WebSocket (port 32838)

**Usage:**
- Get UTXOs
- Track addresses
- Get transactions
- Broadcast transactions
- Real-time WebSocket notifications

### arkd î Bitcoin Network
**Via Esplora API:**
- Fee estimation
- Broadcast transactions
- Get block tip height
- Get transaction details

### arkd î Redis
**Communication:** TCP (port 6379)

**Pattern:** Optimistic locking with WATCH/MULTI for cache operations.

### arkd î Nostr Relays
**Communication:** WebSocket (wss://)

**Usage:** Encrypted direct messages (NIP-04) for user notifications.

## Event-Driven Integration

### Event Flow Architecture
Domain entities raise events í Event Broker (in-memory) í Subscribers (Application Services)

**Event Types:**
- RoundStarted, RoundFinalized, RoundFailed
- IntentsRegistered, OffchainTxFinalized
- VtxoCreated, VtxoSwept

**Subscribers:**
- Sweeper schedules tasks on RoundFinalized
- Fraud service monitors on VtxoCreated
- Indexer updates projections on all events

## Data Flow Patterns

### Payment Registration Flow
1. User sends RegisterIntent RPC
2. gRPC Handler validates and converts proto í domain
3. Application Service orchestrates validation and persistence
4. Domain Layer validates business rules
5. Repository persists intent
6. Event published to subscribers

### Round Finalization Flow
1. Scheduler triggers finalization
2. Application loads round state
3. Domain transitions round state machine
4. TX Builder constructs commitment transaction
5. Wallet signs and broadcasts
6. Repository persists final state
7. Events trigger background tasks (sweeper, fraud detection, indexer)

### VTXO Sweep Flow
1. Scheduler triggers sweep task at expiry
2. Sweeper verifies conditions
3. Application coordinates sweep
4. TX Builder constructs sweep transaction
5. Wallet signs and broadcasts
6. Repository marks VTXOs as swept
7. Scanner confirms sweep

### Fraud Detection Flow
1. Unauthorized VTXO spend detected by scanner
2. Scanner notifies fraud service
3. Fraud Service loads VTXO and round data
4. Application handles fraud response
5. TX Builder constructs forfeit/checkpoint transaction
6. Wallet broadcasts punishment transaction

## Service Initialization Order

1. Load Configuration
2. Initialize Infrastructure (database, Redis, wallet connection)
3. Initialize Core Components (repos, TX builder, scanner)
4. Initialize Application Services (main, admin, indexer, sweeper, fraud)
5. Initialize Interface Layer (gRPC server, handlers, interceptors)
6. Start Background Services (scheduler, sweeper, fraud detector, indexer)
7. Start Servers (gRPC main port, admin port, REST gateway)
8. Setup Graceful Shutdown

## Best Practices

### Port Interface Design
- Define interfaces in `internal/core/ports/`
- Return domain types from port methods
- Keep interfaces focused (single responsibility)
- Use context for cancellation
- Document expected behavior

### Type Conversion
- Convert at boundaries (handler, repository)
- Create dedicated converter functions
- Validate after conversion
- Handle all fields explicitly

### Event Publishing
- Publish events after successful persistence
- Use domain events for business events
- Keep events immutable
- Include all relevant data in event

### Error Propagation
- Wrap errors with context
- Convert to domain errors at boundaries
- Log errors at appropriate level
- Return structured errors to clients

## Cross-References

- [Architecture Overview](./architecture.md) - Hexagonal architecture details
- [Application Core](./application_core.md) - Application service details
- [RepoManager](./repo_manager.md) - Repository patterns
- [Configuration](./configuration.md) - Service configuration
