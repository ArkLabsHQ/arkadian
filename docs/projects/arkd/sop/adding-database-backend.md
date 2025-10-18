# SOP: Adding a New Database Backend

Step-by-step procedure for implementing a new database backend (e.g., MongoDB, Neo4j).

## Prerequisites

- Understand repository interfaces (`internal/core/domain/*_repo.go`)
- Understand RepoManager interface (`internal/core/ports/repo_manager.go`)
- Familiarity with target database technology

## Existing Backends

- PostgreSQL (`internal/infrastructure/db/postgres/`)
- SQLite (`internal/infrastructure/db/sqlite/`)
- Badger (`internal/infrastructure/db/badger/`)

## Procedure

### 1. Create Directory Structure

```bash
mkdir -p internal/infrastructure/db/<backend>
cd internal/infrastructure/db/<backend>
```

Create files:
```
repo_manager.go         # RepoManager implementation
round_repo.go           # Round repository
vtxo_repo.go            # VTXO repository
intent_repo.go          # Intent repository
receiver_repo.go        # Receiver repository
offchain_tx_repo.go     # OffchainTx repository
testing.go              # Test helpers
```

### 2. Implement RepoManager

**File**: `repo_manager.go`

```go
package <backend>

import (
    "github.com/arkade-os/arkd/internal/core/domain"
    "github.com/arkade-os/arkd/internal/core/ports"
)

type repoManager struct {
    client interface{}  // Database client

    // Repositories
    roundRepo      domain.RoundRepository
    vtxoRepo       domain.VtxoRepository
    intentRepo     domain.IntentRepository
    receiverRepo   domain.ReceiverRepository
    offchainTxRepo domain.OffchainTxRepository
}

var _ ports.RepoManager = (*repoManager)(nil)

func NewRepoManager(connectionString string) (ports.RepoManager, error) {
    // 1. Connect to database
    client, err := connect(connectionString)
    if err != nil {
        return nil, err
    }

    // 2. Create indexes/constraints
    if err := createIndexes(client); err != nil {
        return nil, err
    }

    // 3. Initialize repositories
    return &repoManager{
        client:         client,
        roundRepo:      NewRoundRepository(client),
        vtxoRepo:       NewVtxoRepository(client),
        intentRepo:     NewIntentRepository(client),
        receiverRepo:   NewReceiverRepository(client),
        offchainTxRepo: NewOffchainTxRepository(client),
    }, nil
}

func (r *repoManager) RoundRepository() domain.RoundRepository {
    return r.roundRepo
}

// ... implement other accessors

func (r *repoManager) Close() {
    // Cleanup
}
```

### 3. Implement Repository Interfaces

**File**: `round_repo.go`

```go
type roundRepo struct {
    client interface{}
}

var _ domain.RoundRepository = (*roundRepo)(nil)

func NewRoundRepository(client interface{}) domain.RoundRepository {
    return &roundRepo{client: client}
}

func (r *roundRepo) AddRound(ctx context.Context, round *domain.Round) error {
    // Convert domain → database document/record
    doc := toDatabaseRound(round)

    // Insert
    return r.client.Insert(doc)
}

func (r *roundRepo) GetRound(ctx context.Context, id string) (*domain.Round, error) {
    // Query
    doc, err := r.client.FindByID(id)
    if err != nil {
        // Convert database error → domain error
        if isNotFoundError(err) {
            return nil, domain.ErrRoundNotFound
        }
        return nil, err
    }

    // Convert database document → domain
    return toDomainRound(doc), nil
}

// Implement all other repository methods...

// Type conversions
func toDatabaseRound(round *domain.Round) interface{} {
    // Convert domain.Round → database document/record
}

func toDomainRound(doc interface{}) *domain.Round {
    // Convert database document → domain.Round
}
```

Repeat for all repositories:
- `vtxo_repo.go`
- `intent_repo.go`
- `receiver_repo.go`
- `offchain_tx_repo.go`

### 4. Add Configuration

**File**: `internal/config/config.go`

```go
type Config struct {
    DatabaseType   string  // "postgres", "sqlite", "badger", "<new>"

    PostgresConfig PostgresConfig
    <New>Config    <New>Config  // Add new config
}

type <New>Config struct {
    ConnectionString string
    // Additional config fields
}
```

### 5. Update Factory

**File**: `cmd/arkd/main.go` or factory

```go
func newRepoManager(cfg config.Config) (ports.RepoManager, error) {
    switch cfg.DatabaseType {
    case "postgres":
        return postgres.NewRepoManager(cfg.PostgresConfig.ConnString)
    case "<new>":
        return <new>.NewRepoManager(cfg.<New>Config.ConnectionString)
    default:
        return nil, fmt.Errorf("unknown database type: %s", cfg.DatabaseType)
    }
}
```

### 6. Create Test Helpers

**File**: `testing.go`

```go
func SetupTestDB(t *testing.T) ports.RepoManager {
    // Setup test database
    manager, err := NewRepoManager("test-connection")
    require.NoError(t, err)

    t.Cleanup(func() {
        manager.Close()
    })

    return manager
}
```

### 7. Write Tests

**File**: `round_repo_test.go`

```go
func TestRoundRepo_AddRound(t *testing.T) {
    repo := SetupTestDB(t).RoundRepository()

    round := &domain.Round{
        ID:    "test-round",
        Ended: false,
    }

    err := repo.AddRound(context.Background(), round)
    assert.NoError(t, err)

    retrieved, err := repo.GetRound(context.Background(), "test-round")
    assert.NoError(t, err)
    assert.Equal(t, round.ID, retrieved.ID)
}
```

### 8. Integration Testing

```bash
# Run with new backend
ARKD_DB_TYPE=<new> make integrationtest
```

## Implementation Checklist

- [ ] Directory structure created
- [ ] RepoManager interface implemented
- [ ] All repository interfaces implemented:
  - [ ] RoundRepository
  - [ ] VtxoRepository
  - [ ] IntentRepository
  - [ ] ReceiverRepository
  - [ ] OffchainTxRepository
- [ ] Type conversion functions (DB ↔ Domain)
- [ ] Error conversion (DB errors → Domain errors)
- [ ] Indexes/constraints for common queries
- [ ] Connection/transaction management
- [ ] Test helpers
- [ ] Unit tests for each repository
- [ ] Integration tests
- [ ] Configuration support
- [ ] Factory integration
- [ ] Documentation

## Key Principles

1. **Core never changes** - Business logic remains unchanged
2. **Type conversion at boundaries** - Convert DB types ↔ Domain types in repositories
3. **Error conversion** - Map database errors to domain errors
4. **No infrastructure leakage** - Never expose database types outside repositories

## Performance Considerations

### Indexes

Create indexes for frequently queried columns:

```sql
-- Example: PostgreSQL
CREATE INDEX idx_vtxo_pubkey ON vtxo(pubkey) WHERE spent = false;

-- Example: MongoDB
db.vtxos.createIndex({ "pubkey": 1, "spent": 1 })

-- Example: Neo4j
CREATE INDEX vtxo_pubkey FOR (v:Vtxo) ON (v.pubkey)
```

### Connection Pooling

Implement connection pooling for production use:

```go
func NewRepoManager(uri string) (ports.RepoManager, error) {
    client, err := connectWithPool(uri, PoolConfig{
        MaxConnections: 25,
        MaxIdleTime:    5 * time.Minute,
    })
    // ...
}
```

## Common Pitfalls

### ❌ Exposing Database Types

```go
// Bad - Returns database type
func (r *repo) GetRound(...) (*DatabaseRound, error)
```

### ✅ Correct Approach

```go
// Good - Returns domain type
func (r *repo) GetRound(...) (*domain.Round, error) {
    dbRound, err := r.client.Find(...)
    return toDomainRound(dbRound), nil
}
```

### ❌ Not Converting Errors

```go
// Bad - Leaks database error
func (r *repo) GetRound(...) (*domain.Round, error) {
    return r.client.Find(...)
}
```

### ✅ Correct Error Handling

```go
// Good - Converts to domain error
func (r *repo) GetRound(...) (*domain.Round, error) {
    row, err := r.client.Find(...)
    if err != nil {
        if isNotFoundError(err) {
            return nil, domain.ErrRoundNotFound
        }
        return nil, err
    }
    return toDomainRound(row), nil
}
```

## See Also

- `system/architecture/hexagonal-architecture.md` - Architecture patterns
- `system/repository-pattern.md` - Repository pattern details
- `database-workflows.md` - Database operations
