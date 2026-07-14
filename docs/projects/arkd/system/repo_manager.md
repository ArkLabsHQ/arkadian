# Repository Manager

## Overview

The RepoManager provides a unified interface for accessing all data repositories in arkd. It follows the Repository Pattern to abstract persistence concerns from business logic, supporting multiple database backends (PostgreSQL, SQLite, BadgerDB).

## RepoManager Interface

```go
type RepoManager interface {
    Events() domain.EventRepository
    Rounds() domain.RoundRepository
    Vtxos() domain.VtxoRepository
    Markers() domain.MarkerRepository
    OffchainTxs() domain.OffchainTxRepository
    Convictions() domain.ConvictionRepository
    Assets() domain.AssetRepository
    Settings() domain.SettingsRepository
    RegisterBatchUpdateHandler(handler func(data domain.Round))
    RegisterOffchainTxUpdateHandler(handler func(data domain.OffchainTx))
    RegisterSettingsUpdateHandler(handler func(data domain.Settings, changelog []string))
    Close()
}
```

> **PR #939:** `ScheduledSession() domain.ScheduledSessionRepo` and `Fees() domain.FeeRepository` were **removed** — both are absorbed into the unified `Settings()` repository. The legacy `intent_fees` and `scheduled_session` tables are migrated into the settings row on first boot, then emptied (to be dropped in a future release).

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
- `GetExpiredRounds(ctx, expiredBefore int64) ([]ExpiredRound, error)` - Returns sweepable rounds whose `ending_timestamp + vtxo_tree_expiration < expiredBefore` (Unix-seconds), i.e., rounds with a vtxo tree whose batch outputs have already expired but have not been swept. Each `ExpiredRound` carries `{RoundId, CommitmentTxid, ExpiredAt}`. SQL backends use a new sqlc-generated `SelectExpiredRounds` query joining the `round_with_commitment_tx_vw` view against the `tx` table to require a `type = 'tree'` row, with `swept = false AND ended = true AND failed = false` and a `CAST(ending_timestamp + vtxo_tree_expiration AS BIGINT) AS expired_at` projection; badger iterates rounds in-memory applying the same predicate. Surfaces rounds whose sweep should have happened but likely failed (typically uneconomical fee conditions). Used by `AdminService.GetExpiredRounds` (PR #1095).
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

> **PR #908:** the `vtxo` table's `swept` boolean column was **removed** — sweep state is now derived from the marker DAG (see `MarkerRepository`). The `marker_ids` column is JSONB/TEXT holding ≥1 marker per VTXO, and each VTXO exposes its chain `depth` (surfaced on the indexer `IndexerVtxo`, proto field 15).

### MarkerRepository (PR #908)
Manages the **VTXO marker DAG** — traversal checkpoints created at regular depth intervals (`domain.MarkerInterval = 100`) that let the server traverse and sweep deep VTXO chains in near-constant depth instead of walking every VTXO. A `Marker` carries `{ID, Depth, ParentMarkerIDs}`; a `SweptMarker` (append-only) records `{MarkerID, SweptAt}`.

**Key Methods:**
- `AddMarker(ctx, marker)` / `GetMarker(ctx, id)` - Create/update and fetch a single marker
- `GetMarkersByDepthRange(ctx, minDepth, maxDepth)` / `GetMarkersByIds(ctx, ids)` - Range/bulk marker lookups
- `BulkSweepMarkers(ctx, markerIDs, sweptAt)` - Marks many markers swept in one operation (append-only `SweptMarker`)
- `IsMarkerSwept(ctx, markerID)` / `GetSweptMarkers(ctx, markerIDs)` - Sweep-state queries
- `UpdateVtxoMarkers(ctx, outpoint, markerIDs)` / `GetVtxosByMarker(ctx, markerID)` - VTXO ↔ marker association
- `CreateRootMarkersForVtxos(ctx, vtxos)` - Creates root markers for batch VTXOs (marker ID = VTXO outpoint) in a single transaction
- `SweepVtxoOutpoints(ctx, outpoints, sweptAt)` - Sweeps specific outpoints via the `swept_vtxo` table; used by checkpoint sweeps where marker-based sweeping would over-reach across independent subtrees sharing inherited markers
- `GetVtxosByDepthRange` / `GetVtxosByArkTxid` / `GetVtxoChainByMarkers` - Chain-traversal methods backing the `GetVtxoChain` indexer optimization
- `Close()` - Cleanup

**Schema:** New `marker` + `swept_marker` tables and a JSONB/TEXT `marker_ids` column on `vtxo`, added by migration `20260701000000_add_vtxo_marker_dag` (sqlite + postgres). PostgreSQL uses a **recursive CTE** to fetch descendant markers; badger iterates in-memory. A `markerbackfill` package guarantees every pre-existing VTXO has at least one marker on migration. Validated with chains up to 20k depth.

### OffchainTxRepository
Manages offchain (collaborative) transactions and checkpoint transactions.

**Key Methods:**
- `AddOrUpdateOffchainTx(ctx, offchainTx)` - Creates or updates offchain transaction
- `GetOffchainTx(ctx, txid)` - Retrieves with all checkpoint transactions
- `GetAllOffchainTxs(ctx)` - Lists all offchain transactions

**Schema:** Stores offchain transactions with stage progression and checkpoint transaction tree.

### SettingsRepository (PR #939)
Manages the unified operational settings row — single source of truth for exit delays, amount limits, round participants, ban config, tx weight limits, batch fees (`BatchFees`), and the scheduled session.

**Key Methods:**
- `Get(ctx) (*domain.Settings, error)` - Retrieves the settings row
- `Upsert(ctx, settings, changelog []string)` - Creates or updates the row; the changelog describes what changed
- `RegisterUpdatesHandler(handler func(Settings, []string))` - Subscribes to settings changes (used to refresh the live-store settings cache)
- `Close()` - Cleanup

**Schema:** A single row holding all `domain.Settings` fields plus `updated_at`. Migrations: `20260609120123_add_settings` (sqlite), `20260609120126_add_settings` (postgres); badger has a dedicated `settings_repo.go` (with ctx-cancellation-aware retry in `Upsert`). First-boot seeding (`settings_seed.go` per backend) populates the row from `ARKD_*` env vars / defaults, validating before persisting, and carries over the latest legacy `intent_fees` / `scheduled_session` rows.

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
- golang-migrate for schema migrations (latest: `20260701000000_add_vtxo_marker_dag` adds the marker DAG tables and drops the `vtxo.swept` column; before that `20260609120126_add_settings` creates the unified settings table, and `20260527150000_vtxo_commitment_txid_index` adds a btree index on `vtxo_commitment_txid(commitment_txid)` so the bulk-pubkey join used by sweeper restore stays fast as the sweepable-round set grows)
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
