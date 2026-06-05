# Repository Manager

## Overview

The RepoManager provides a unified interface for accessing all data repositories in arkd. It follows the Repository Pattern to abstract persistence concerns from business logic, supporting multiple database backends (PostgreSQL, SQLite, BadgerDB).

## RepoManager Interface

```go
type RepoManager interface {
    Events() EventRepository
    Rounds() RoundRepository
    Vtxos() VtxoRepository
    MarketHourRepo() MarketHourRepo
    OffchainTxs() OffchainTxRepository
    Close()
}
```

## Repository Interfaces

### EventRepository
Manages immutable event streams for event sourcing.

**Key Methods:**
- `Save(ctx, topic, id, events)` - Persists events
- `RegisterEventsHandler(topic, handler)` - Subscribes to event stream
- `ClearRegisteredHandlers(topics...)` - Removes subscriptions
- `Close()` - Cleanup

**Implementations:** BadgerDB (in-memory pub/sub), PostgreSQL (Watermill SQL)

### RoundRepository
Manages round lifecycle and related data (intents, transactions, receivers).

**Key Methods:**
- `AddOrUpdateRound(ctx, round)` - Creates or updates complete round state (now also persists `round.CollectedFees`)
- `GetRoundWithId(ctx, id)` - Fetches round with all related data
- `GetRoundWithCommitmentTxid(ctx, txid)` - Queries by commitment transaction
- `GetSweepableRounds(ctx)` - Returns rounds ready for sweeping
- `GetRoundVtxoTree(ctx, txid)` - Retrieves VTXO tree structure
- `PatchCollectedFees(ctx, feesByRoundId map[string]uint64)` - Bulk-sets the `collected_fees` column for the given round ids. Used by `AdminService.GetCollectedFees` to lazily backfill rounds that were finalized before fee persistence existed (PR #933). Implementations: sqlite/postgres iterate the map under a single transaction issuing parameterized `UPDATE round SET collected_fees = ? WHERE id = ?`; badger reads each round, sets the field, and re-saves.

**Schema:** Stores rounds, intents, receivers, transactions (commitment, forfeit, connectors, tree) with complex joins. The `round` row now carries a `collected_fees` column (added by migration `20260603111520_add_collected_fees` on postgres / `20260603111517_add_collected_fees` on sqlite — additive nullable-defaulting-to-zero INTEGER). Domain `Round.CollectedFees uint64` is set inside the `on(RoundFinalized)` event projection from the new `RoundFinalized.Fees` event field, so it is reconstructed correctly under event replay as well as direct read.

### VtxoRepository
Manages Virtual Transaction Outputs and their lifecycle.

**Key Methods:**
- `AddVtxos(ctx, vtxos)` - Creates new VTXOs
- `GetAllNonUnrolledVtxos(ctx, pubkey)` - Returns spendable and spent VTXOs for a user
- `SettleVtxos(ctx, vtxos, settledBy)` - Marks VTXOs as spent in a commitment tx
- `SpendVtxos(ctx, vtxos, arkTxid)` - Marks VTXOs as spent offchain
- `SweepVtxos(ctx, vtxos)` - Marks VTXOs as swept
- `UnrollVtxos(ctx, vtxos)` - Marks VTXOs as force-closed
- `GetVtxoPubKeysByCommitmentTxid(ctx, commitmentTxid, withMinimumAmount)` - Returns distinct VTXO pubkeys for one commitment tx (legacy per-txid path)
- `GetVtxoPubKeysByCommitmentTxids(ctx, commitmentTxids, withMinimumAmount)` - **Bulk** variant: returns the deduped union of pubkeys across all supplied commitment txids in a single roundtrip. Implemented across all three backends (sqlite uses `sqlc.slice` with internal param-limit batching; postgres uses `ANY($1::text[])`; badger iterates). Used by sweeper restore/stop paths to collapse the previous N+1 loop into a constant 2 DB calls regardless of the number of sweepable rounds (benchmarked >1000× faster at 1000 rounds on sqlite). The `withMinimumAmount` predicate is inclusive (`>= min_amount`).

**State Transitions:** Created � Spent (SettleVtxos or SpendVtxos) � Swept, or Created � Unrolled

### OffchainTxRepository
Manages offchain (collaborative) transactions and checkpoint transactions.

**Key Methods:**
- `AddOrUpdateOffchainTx(ctx, offchainTx)` - Creates or updates offchain transaction
- `GetOffchainTx(ctx, txid)` - Retrieves with all checkpoint transactions
- `GetAllOffchainTxs(ctx)` - Lists all offchain transactions

**Schema:** Stores offchain transactions with stage progression and checkpoint transaction tree.

### MarketHourRepo
Manages market operating hours configuration.

**Key Methods:**
- `Get(ctx)` - Retrieves current configuration
- `Upsert(ctx, marketHour)` - Creates or updates configuration

**Schema:** Stores start time, end time, period, and round interval for market hours.

## Event Sourcing + CQRS

### Architecture
- **Event Store:** Immutable event streams (BadgerDB or PostgreSQL)
- **Projections:** Read-optimized views (Rounds, VTXOs, OffchainTxs)
- **Event Handlers:** Automatically update projections when events are persisted

### Event Flow
1. Domain logic generates events
2. Events persisted to EventRepository
3. Event handlers triggered automatically
4. Handlers update projection repositories (Rounds, VTXOs)
5. Application queries projections for read operations

### Benefits
- Complete audit trail
- Time travel debugging (reconstruct state from events)
- Event replay for testing
- Separation of write and read models

## Database Factory Pattern

### Service Configuration
```go
type ServiceConfig struct {
    EventStoreType   string          // "badger" | "postgres"
    DataStoreType    string          // "badger" | "sqlite" | "postgres"
    EventStoreConfig []interface{}   // DB-specific config
    DataStoreConfig  []interface{}   // DB-specific config
}
```

### Database Selection
Repositories are instantiated at runtime based on configuration:
- **Development:** SQLite + BadgerDB for zero external dependencies
- **Production:** PostgreSQL + PostgreSQL for reliability and performance

### Projection Updates
The database service acts as an event-driven projection manager, automatically updating read models when domain events are saved.

## Type Conversions

Repositories handle conversion between domain types and database types:
- **Domain Types:** Business logic representation (e.g., `domain.Vtxo`)
- **Database Types:** Storage representation (e.g., `queries.VtxoVw`)

**Conversion Patterns:**
- Numeric conversions: int64 � uint64, int32 � uint32
- Nullable fields: sql.NullString � string
- Arrays: comma-separated strings � []string
- JSONB: map[uint32]string for tree children

## Best Practices

### Transaction Management
Always use transactions for multi-step operations with automatic rollback on error.

### Conflict Handling
Retry on conflicts (important for BadgerDB and SQLite) with exponential backoff.

### Null Handling
Use sql.NullString for nullable fields, converting empty strings to NULL when writing.

### View-Based Queries
Prefer querying views over manual joins for complex aggregations (e.g., vtxo_vw aggregates commitment txids).

### Context Propagation
Always propagate context for cancellation and timeout support.

### Error Handling
Distinguish between "not found" and actual errors - not found should return nil, not an error.

## Implementation Details

### PostgreSQL
- Uses sqlc for type-safe query generation
- Complex views with string_agg for aggregations
- JSONB for tree structures
- golang-migrate for schema migrations (latest: `20260527150000_vtxo_commitment_txid_index` adds a btree index on `vtxo_commitment_txid(commitment_txid)` so the bulk-pubkey join used by sweeper restore stays fast as the sweepable-round set grows)
- Watermill for event streaming

### SQLite
- Uses sqlc with compatible query syntax
- group_concat instead of string_agg
- TEXT for JSON storage
- Single-writer model (SetMaxOpenConns(1))
- golang-migrate for migrations

### BadgerDB
- LSM tree-based key-value store
- Badgerhold wrapper for query support
- Direct Go struct serialization
- No schema migrations needed
- In-memory pub/sub for events

## Cross-References

- [Architecture Overview](./architecture.md) - Hexagonal architecture
- [Integration Points](./integration_points.md) - Component communication
- [Application Core](./application_core.md) - Service usage patterns
- [Configuration](./configuration.md) - Database configuration
