# Ark Repository Patterns

## Overview

This skill covers the repository and data store patterns used across the Ark ecosystem: hexagonal architecture ports/adapters, RepoManager aggregators, multi-backend support (badger, sqlite, postgres), live stores for ephemeral state, and event channels for reactive updates.

## Key Files

| Repository | File | Purpose |
|------------|------|---------|
| arkd | `internal/core/ports/repo_manager.go` | RepoManager port interface |
| arkd | `internal/core/ports/live_store.go` | LiveStore for ephemeral state |
| arkd | `internal/core/domain/vtxo_repo.go` | VtxoRepository interface |
| arkd | `internal/core/domain/round_repo.go` | RoundRepository interface |
| arkd | `internal/infrastructure/db/service.go` | Multi-backend DB service |
| arkd | `internal/infrastructure/live-store/inmemory/store.go` | In-memory LiveStore |
| go-sdk | `types/interfaces.go` | Store interfaces (Config, Vtxo, Utxo, Transaction) |
| go-sdk | `store/service.go` | Store service factory |
| go-sdk | `store/kv/vtxo_repository.go` | BadgerHold VtxoStore |
| fulmine | `internal/core/ports/repo_manager.go` | Fulmine RepoManager |
| fulmine | `internal/infrastructure/db/service.go` | Fulmine DB service |
| fulmine | `internal/core/domain/swap.go` | SwapRepository interface |

## Architecture Pattern: Hexagonal (Ports & Adapters)

All three repositories follow hexagonal architecture:

```
internal/
├── core/
│   ├── domain/         # Domain entities + repository interfaces
│   ├── ports/          # Port interfaces (RepoManager, LiveStore)
│   └── application/    # Business logic (uses ports)
└── infrastructure/
    └── db/             # Adapters implementing repository interfaces
        ├── badger/     # BadgerDB implementation
        ├── sqlite/     # SQLite implementation
        └── postgres/   # PostgreSQL implementation
```

## arkd RepoManager Pattern

### Port Interface

```go
// internal/core/ports/repo_manager.go
type RepoManager interface {
    Events() domain.EventRepository
    Rounds() domain.RoundRepository
    Vtxos() domain.VtxoRepository
    ScheduledSession() domain.ScheduledSessionRepo
    OffchainTxs() domain.OffchainTxRepository
    Convictions() domain.ConvictionRepository
    Fees() domain.FeeRepository
    Close()
}
```

### Domain Repository Interfaces

```go
// internal/core/domain/vtxo_repo.go
type VtxoRepository interface {
    AddVtxos(ctx context.Context, vtxos []Vtxo) error
    SettleVtxos(ctx context.Context, spentVtxos map[Outpoint]string, commitmentTxid string) error
    SpendVtxos(ctx context.Context, spentVtxos map[Outpoint]string, arkTxid string) error
    UnrollVtxos(ctx context.Context, outpoints []Outpoint) error
    SweepVtxos(ctx context.Context, outpoints []Outpoint) (int, error)
    GetVtxos(ctx context.Context, outpoints []Outpoint) ([]Vtxo, error)
    GetAllNonUnrolledVtxos(ctx context.Context, pubkey string) ([]Vtxo, []Vtxo, error)
    GetAllSweepableUnrolledVtxos(ctx context.Context) ([]Vtxo, error)
    GetAllVtxos(ctx context.Context) ([]Vtxo, error)
    GetAllVtxosWithPubKeys(ctx context.Context, pubkeys []string) ([]Vtxo, error)
    GetExpiringLiquidity(ctx context.Context, after, before int64) (uint64, error)
    GetRecoverableLiquidity(ctx context.Context) (uint64, error)
    UpdateVtxosExpiration(ctx context.Context, outpoints []Outpoint, expiresAt int64) error
    GetLeafVtxosForBatch(ctx context.Context, txid string) ([]Vtxo, error)
    GetSweepableVtxosByCommitmentTxid(ctx context.Context, commitmentTxid string) ([]Outpoint, error)
    GetAllChildrenVtxos(ctx context.Context, txid string) ([]Outpoint, error)
    GetVtxoPubKeysByCommitmentTxid(ctx context.Context, commitmentTxid string, withMinimumAmount uint64) ([]string, error)
    GetPendingSpentVtxosWithPubKeys(ctx context.Context, pubkeys []string) ([]Vtxo, error)
    GetPendingSpentVtxosWithOutpoints(ctx context.Context, outpoints []Outpoint) ([]Vtxo, error)
    Close()
}
```

```go
// internal/core/domain/round_repo.go
type RoundRepository interface {
    AddOrUpdateRound(ctx context.Context, round Round) error
    GetRoundWithId(ctx context.Context, id string) (*Round, error)
    GetRoundWithCommitmentTxid(ctx context.Context, txid string) (*Round, error)
    GetRoundStats(ctx context.Context, commitmentTxid string) (*RoundStats, error)
    GetRoundForfeitTxs(ctx context.Context, commitmentTxid string) ([]ForfeitTx, error)
    GetRoundConnectorTree(ctx context.Context, commitmentTxid string) (tree.FlatTxTree, error)
    GetRoundVtxoTree(ctx context.Context, txid string) (tree.FlatTxTree, error)
    GetSweepableRounds(ctx context.Context) ([]string, error)
    GetRoundIds(ctx context.Context, startedAfter, startedBefore int64, withFailed, withCompleted bool) ([]string, error)
    GetSweptRoundsConnectorAddress(ctx context.Context) ([]string, error)
    GetTxsWithTxids(ctx context.Context, txids []string) ([]string, error)
    GetRoundsWithCommitmentTxids(ctx context.Context, txids []string) (map[string]any, error)
    Close()
}

type RoundStats struct {
    Swept              bool
    TotalForfeitAmount uint64
    TotalInputVtxos    int32
    TotalBatchAmount   uint64
    TotalOutputVtxos   int32
    ExpiresAt          int64
    Started            int64
    Ended              int64
}
```

### Multi-Backend Factory Pattern

```go
// internal/infrastructure/db/service.go
var (
    eventStoreTypes = map[string]func(...interface{}) (domain.EventRepository, error){
        "badger":   badgerdb.NewEventRepository,
        "postgres": pgdb.NewEventRepository,
    }
    roundStoreTypes = map[string]func(...interface{}) (domain.RoundRepository, error){
        "badger":   newBadgerRoundRepository,
        "sqlite":   sqlitedb.NewRoundRepository,
        "postgres": pgdb.NewRoundRepository,
    }
    vtxoStoreTypes = map[string]func(...interface{}) (domain.VtxoRepository, error){
        "badger":   badgerdb.NewVtxoRepository,
        "sqlite":   sqlitedb.NewVtxoRepository,
        "postgres": pgdb.NewVtxoRepository,
    }
    // ... more store types
)

type ServiceConfig struct {
    EventStoreType string
    DataStoreType  string
    EventStoreConfig []interface{}
    DataStoreConfig  []interface{}
}

func NewService(config ServiceConfig, txDecoder ports.TxDecoder) (ports.RepoManager, error) {
    eventStoreFactory, ok := eventStoreTypes[config.EventStoreType]
    if !ok {
        return nil, fmt.Errorf("event store type not supported")
    }

    // Create stores based on type
    switch config.DataStoreType {
    case "badger":
        roundStore, err = roundStoreFactory(config.DataStoreConfig...)
        vtxoStore, err = vtxoStoreFactory(config.DataStoreConfig...)
        // ...
    case "postgres":
        // Open postgres connection, then create stores
        db, err := pgdb.OpenDb(dsn, autoCreate)
        roundStore, err = roundStoreFactory(db)
        // ...
    case "sqlite":
        // Open sqlite, run migrations, then create stores
        dbFile := filepath.Join(baseDir, sqliteDbFile)
        db, err := sqlitedb.OpenDb(dbFile)
        // Run migrations
        roundStore = sqlitedb.NewRoundRepository(db)
        // ...
    }

    return &service{
        eventStore:            eventStore,
        roundStore:            roundStore,
        vtxoStore:             vtxoStore,
        // ...
    }, nil
}
```

## arkd LiveStore Pattern (Ephemeral State)

LiveStore holds temporary, in-memory state during round execution:

```go
// internal/core/ports/live_store.go
type LiveStore interface {
    Intents() IntentStore
    ForfeitTxs() ForfeitTxsStore
    OffchainTxs() OffChainTxStore
    CurrentRound() CurrentRoundStore
    ConfirmationSessions() ConfirmationSessionsStore
    TreeSigingSessions() TreeSigningSessionsStore
    BoardingInputs() BoardingInputsStore
}

type IntentStore interface {
    Len(ctx context.Context) (int64, error)
    Push(ctx context.Context, intent domain.Intent, boardingInputs []BoardingInput, cosignersPublicKeys []string) error
    Pop(ctx context.Context, num int64) ([]TimedIntent, error)
    GetSelectedIntents(ctx context.Context) ([]TimedIntent, error)
    Delete(ctx context.Context, ids []string) error
    DeleteAll(ctx context.Context) error
    DeleteVtxos(ctx context.Context) error
    ViewAll(ctx context.Context, ids []string) ([]TimedIntent, error)
    IncludesAny(ctx context.Context, outpoints []domain.Outpoint) (bool, string)
}

type CurrentRoundStore interface {
    Upsert(ctx context.Context, fn func(m *domain.Round) *domain.Round) error
    Get(ctx context.Context) (*domain.Round, error)
}

type TreeSigningSessionsStore interface {
    New(ctx context.Context, roundId string, uniqueSignersPubKeys map[string]struct{}) error
    Get(ctx context.Context, roundId string) (*MusigSigningSession, error)
    Delete(ctx context.Context, roundId string) error
    AddNonces(ctx context.Context, roundId string, pubkey string, nonces tree.TreeNonces) error
    AddSignatures(ctx context.Context, roundId, pubkey string, nonces tree.TreePartialSigs) error
    NoncesCollected(roundId string) <-chan struct{}        // Event channel!
    SignaturesCollected(roundId string) <-chan struct{}   // Event channel!
}
```

### In-Memory LiveStore Implementation

```go
// internal/infrastructure/live-store/inmemory/store.go
type inMemoryLiveStore struct {
    intentStore               ports.IntentStore
    forfeitTxsStore           ports.ForfeitTxsStore
    offChainTxStore           ports.OffChainTxStore
    currentRoundStore         ports.CurrentRoundStore
    confirmationSessionsStore ports.ConfirmationSessionsStore
    treeSigningSessions       ports.TreeSigningSessionsStore
    boardingInputsStore       ports.BoardingInputsStore
}

func NewLiveStore(txBuilder ports.TxBuilder) ports.LiveStore {
    return &inMemoryLiveStore{
        intentStore:               NewIntentStore(),
        forfeitTxsStore:           NewForfeitTxsStore(txBuilder),
        offChainTxStore:           NewOffChainTxStore(),
        currentRoundStore:         NewCurrentRoundStore(),
        confirmationSessionsStore: NewConfirmationSessionsStore(),
        treeSigningSessions:       NewTreeSigningSessionsStore(),
        boardingInputsStore:       NewBoardingInputsStore(),
    }
}

func (s *inMemoryLiveStore) Intents() ports.IntentStore {
    return s.intentStore
}
// ... accessor methods for each store
```

## go-sdk Store Pattern

### Store Interface Hierarchy

```go
// types/interfaces.go
type Store interface {
    ConfigStore() ConfigStore
    TransactionStore() TransactionStore
    UtxoStore() UtxoStore
    VtxoStore() VtxoStore
    Clean(ctx context.Context)
    Close()
}

type ConfigStore interface {
    GetType() string
    GetDatadir() string
    AddData(ctx context.Context, data Config) error
    GetData(ctx context.Context) (*Config, error)
    CleanData(ctx context.Context) error
    Close()
}

type TransactionStore interface {
    AddTransactions(ctx context.Context, txs []Transaction) (int, error)
    SettleTransactions(ctx context.Context, txids []string, settledBy string) (int, error)
    ConfirmTransactions(ctx context.Context, txids []string, timestamp time.Time) (int, error)
    RbfTransactions(ctx context.Context, rbfTxs map[string]string) (int, error)
    GetAllTransactions(ctx context.Context) ([]Transaction, error)
    GetTransactions(ctx context.Context, txids []string) ([]Transaction, error)
    UpdateTransactions(ctx context.Context, txs []Transaction) (int, error)
    Clean(ctx context.Context) error
    GetEventChannel() <-chan TransactionEvent
    Close()
}

type VtxoStore interface {
    AddVtxos(ctx context.Context, vtxos []Vtxo) (int, error)
    SpendVtxos(ctx context.Context, spentVtxos map[Outpoint]string, arkTxid string) (int, error)
    SettleVtxos(ctx context.Context, spentVtxos map[Outpoint]string, settledBy string) (int, error)
    UpdateVtxos(ctx context.Context, vtxos []Vtxo) (int, error)
    GetAllVtxos(ctx context.Context) (spendable, spent []Vtxo, err error)
    GetSpendableVtxos(ctx context.Context) ([]Vtxo, error)
    GetVtxos(ctx context.Context, keys []Outpoint) ([]Vtxo, error)
    Clean(ctx context.Context) error
    GetEventChannel() <-chan VtxoEvent
    Close()
}
```

### Store Factory with Migrations

```go
// store/service.go
//go:embed sql/migration/*
var migrations embed.FS

type Config struct {
    ConfigStoreType  string
    AppDataStoreType string
    BaseDir          string
}

func NewStore(storeConfig Config) (types.Store, error) {
    var (
        configStore types.ConfigStore
        vtxoStore   types.VtxoStore
        txStore     types.TransactionStore
        utxoStore   types.UtxoStore
    )

    // Config store selection
    switch storeConfig.ConfigStoreType {
    case types.InMemoryStore:
        configStore, _ = inmemorystore.NewConfigStore()
    case types.FileStore:
        configStore, _ = filestore.NewConfigStore(dir)
    }

    // Data store selection
    switch storeConfig.AppDataStoreType {
    case types.KVStore:
        utxoStore, _ = kvstore.NewUtxoStore(dir, nil)
        vtxoStore, _ = kvstore.NewVtxoStore(dir, nil)
        txStore, _ = kvstore.NewTransactionStore(dir, nil)
    case types.SQLStore:
        dbFile := filepath.Join(dir, sqliteDbFile)
        db, _ := sqlstore.OpenDb(dbFile)

        // Run migrations
        driver, _ := sqlitemigrate.WithInstance(db, &sqlitemigrate.Config{})
        source, _ := iofs.New(migrations, "sql/migration")
        m, _ := migrate.NewWithInstance("iofs", source, "arkdb", driver)
        m.Up()

        utxoStore = sqlstore.NewUtxoStore(db)
        vtxoStore = sqlstore.NewVtxoStore(db)
        txStore = sqlstore.NewTransactionStore(db)
    }

    return &service{configStore, utxoStore, vtxoStore, txStore}, nil
}
```

### Event Channel Pattern (Reactive Updates)

```go
// store/kv/vtxo_repository.go
type vtxoStore struct {
    db      *badgerhold.Store
    lock    *sync.Mutex
    eventCh chan types.VtxoEvent
}

func NewVtxoStore(dir string, logger badger.Logger) (types.VtxoStore, error) {
    badgerDb, err := createDB(dir, logger)
    return &vtxoStore{
        db:      badgerDb,
        lock:    &sync.Mutex{},
        eventCh: make(chan types.VtxoEvent, 100),  // Buffered channel
    }, nil
}

func (s *vtxoStore) AddVtxos(_ context.Context, vtxos []types.Vtxo) (int, error) {
    addedVtxos := make([]types.Vtxo, 0, len(vtxos))
    for _, vtxo := range vtxos {
        if err := s.db.Insert(vtxo.Outpoint.String(), &vtxo); err != nil {
            if errors.Is(err, badgerhold.ErrKeyExists) {
                continue
            }
            return -1, err
        }
        addedVtxos = append(addedVtxos, vtxo)
    }

    // Emit event asynchronously
    if len(addedVtxos) > 0 {
        go s.sendEvent(types.VtxoEvent{Type: types.VtxosAdded, Vtxos: addedVtxos})
    }

    return len(addedVtxos), nil
}

func (s *vtxoStore) GetEventChannel() <-chan types.VtxoEvent {
    return s.eventCh
}

func (s *vtxoStore) sendEvent(event types.VtxoEvent) {
    select {
    case s.eventCh <- event:
    default:
        // Channel full, event dropped (non-blocking)
    }
}
```

## fulmine RepoManager Pattern

### Simplified Port Interface

```go
// internal/core/ports/repo_manager.go
type RepoManager interface {
    Settings() domain.SettingsRepository
    VHTLC() domain.VHTLCRepository
    VtxoRollover() domain.VtxoRolloverRepository
    Swap() domain.SwapRepository
    SubscribedScript() domain.SubscribedScriptRepository
    ChainSwaps() domain.ChainSwapRepository
    Close()
}
```

### Domain Repository Example

```go
// internal/core/domain/swap.go
type SwapRepository interface {
    GetAll(ctx context.Context) ([]Swap, error)
    Get(ctx context.Context, swapId string) (*Swap, error)
    Add(ctx context.Context, swaps []Swap) (int, error)
    Update(ctx context.Context, swap Swap) error
    Close()
}
```

### Multi-Backend DB Service

```go
// internal/infrastructure/db/service.go
//go:embed sqlite/migration/*
var migrations embed.FS

type ServiceConfig struct {
    DbType   string
    DbConfig []any
}

func NewService(config ServiceConfig) (ports.RepoManager, error) {
    switch config.DbType {
    case "badger":
        baseDir := config.DbConfig[0].(string)
        logger := config.DbConfig[1].(badger.Logger)

        settingsRepo, _ = badgerdb.NewSettingsRepository(baseDir, logger)
        vhtlcRepo, _ = badgerdb.NewVHTLCRepository(baseDir, logger)
        swapRepo, _ = badgerdb.NewSwapRepository(baseDir, logger)
        // ...

    case "sqlite":
        baseDir := config.DbConfig[0].(string)
        dbFile := filepath.Join(baseDir, sqliteDbFile)
        db, _ := sqlitedb.OpenDb(dbFile)

        // Run migrations with stepwise handling
        driver, _ := sqlitemigrate.WithInstance(db, &sqlitemigrate.Config{})
        source, _ := iofs.New(migrations, "sqlite/migration")
        m, _ := migrate.NewWithInstance("iofs", source, "fulminedb", driver)

        // Handle migration checkpoints for data backfill
        version, dirty, _ := m.Version()
        if version < vhtlcMigrationBegin {
            m.Migrate(vhtlcMigrationBegin)
            sqlitedb.BackfillVhtlc(context.Background(), db)
        }
        m.Up()

        settingsRepo, _ = sqlitedb.NewSettingsRepository(db)
        vhtlcRepo, _ = sqlitedb.NewVHTLCRepository(db)
        // ...
    }

    return &service{settingsRepo, vhtlcRepo, ...}, nil
}
```

## Common Patterns Summary

### 1. Repository Interface in Domain Layer
```go
// Define interfaces in internal/core/domain/
type XxxRepository interface {
    Add(ctx context.Context, items []Xxx) error
    Get(ctx context.Context, id string) (*Xxx, error)
    GetAll(ctx context.Context) ([]Xxx, error)
    Update(ctx context.Context, item Xxx) error
    Delete(ctx context.Context, id string) error
    Close()
}
```

### 2. RepoManager Aggregator
```go
// Define in internal/core/ports/
type RepoManager interface {
    EntityA() domain.EntityARepository
    EntityB() domain.EntityBRepository
    // ...
    Close()
}
```

### 3. Multi-Backend Factory
```go
// Implement in internal/infrastructure/db/
var storeTypes = map[string]func(...interface{}) (Repository, error){
    "badger": badgerdb.NewRepository,
    "sqlite": sqlitedb.NewRepository,
    "postgres": pgdb.NewRepository,
}

func NewService(config Config) (ports.RepoManager, error) {
    factory := storeTypes[config.DbType]
    repo, err := factory(config.DbConfig...)
    return &service{repo: repo}, nil
}
```

### 4. Event Channels for Reactivity
```go
// In store implementation
type store struct {
    eventCh chan Event
}

func (s *store) Add(ctx context.Context, items []Item) error {
    // Insert items
    go s.sendEvent(Event{Type: ItemsAdded, Items: items})
    return nil
}

func (s *store) GetEventChannel() <-chan Event {
    return s.eventCh
}
```

### 5. Migration Embedding
```go
//go:embed migration/*
var migrations embed.FS

func runMigrations(db *sql.DB) error {
    source, _ := iofs.New(migrations, "migration")
    m, _ := migrate.NewWithInstance("iofs", source, "dbname", driver)
    return m.Up()
}
```

## Store Types Summary

| Store Type | Backend | Use Case |
|------------|---------|----------|
| `badger` | BadgerDB (KV) | Embedded, fast, default |
| `sqlite` | SQLite | Embedded, SQL queries |
| `postgres` | PostgreSQL | Production, distributed |
| `inmemory` | RAM | Tests, ephemeral |
| `file` | Filesystem | Config persistence |

## Related Skills

- `arkd-round-lifecycle` - Uses RepoManager for round persistence
- `ark-sdk-client-init` - Uses Store for client state
- `fulmine-batch-settlement` - Uses SwapRepository for swap state
