# Go SDK - Storage Backends

## Overview

The go-sdk provides a flexible storage abstraction that separates configuration data from application data. This allows developers to choose appropriate storage backends for different deployment scenarios.

## Storage Architecture

The SDK uses four distinct stores, each serving a specific purpose:

```go
type Store interface {
    ConfigStore() ConfigStore           // Wallet seed and settings
    UtxoStore() UtxoStore               // Onchain UTXOs
    VtxoStore() VtxoStore               // Offchain VTXOs
    TransactionStore() TransactionStore // Transaction history
}
```

Configuration is controlled via the `store.Config` struct:

```go
type Config struct {
    ConfigStoreType  string // "inmemory" or "file"
    AppDataStoreType string // "kv" or "sql"
    BaseDir          string // Directory for persistent storage
}
```

## In-Memory Store

### Purpose

The in-memory store is designed exclusively for testing and development. It provides fast, ephemeral storage with no persistence guarantees.

### Configuration

```go
store.NewStore(store.Config{
    ConfigStoreType:  types.InMemoryStore,
    AppDataStoreType: types.KVStore,  // Still uses in-memory
})
```

### Characteristics

- **Persistence**: None - all data lost on process exit
- **Performance**: Fastest option, no I/O overhead
- **Concurrency**: Safe for concurrent access
- **Use cases**: Unit tests, integration tests, ephemeral demos

### Warning

Never use in-memory store for production applications. Wallet seeds and transaction history will be lost when the application terminates.

### Example

```go
// Testing only - wallet lost on restart
testStore, err := store.NewStore(store.Config{
    ConfigStoreType: types.InMemoryStore,
})
client, _ := arksdk.NewArkClient(testStore)
client.Init(ctx, arksdk.InitArgs{
    WalletType: arksdk.SingleKeyWallet,
    ClientType: arksdk.GrpcClient,
    ServerUrl:  "localhost:7070",
    Password:   "test",
})
```

## File Store

### Purpose

The file store provides production-ready persistence using directory-based storage. Recommended for most applications.

### Configuration

```go
store.NewStore(store.Config{
    ConfigStoreType:  types.FileStore,
    AppDataStoreType: types.KVStore,  // or types.SQLStore
    BaseDir:          "/path/to/wallet/data",
})
```

### Directory Structure

```
BaseDir/
├── config.json         # Encrypted wallet configuration
├── utxos/              # Onchain UTXO data (if KVStore)
├── vtxos/              # Offchain VTXO data (if KVStore)
└── transactions/       # Transaction history (if KVStore)
```

Or with SQL backend:

```
BaseDir/
├── config.json         # Encrypted wallet configuration
└── sqlite.db           # SQLite database (if SQLStore)
```

### Characteristics

- **Persistence**: Durable across restarts
- **Performance**: Good for most workloads
- **Encryption**: Config file encrypted with password
- **Portability**: Easy to backup/restore (copy directory)
- **Use cases**: Desktop wallets, mobile apps, services

### Example

```go
homeDir, _ := os.UserHomeDir()
dataDir := filepath.Join(homeDir, ".arkwallet")

store, err := store.NewStore(store.Config{
    ConfigStoreType:  types.FileStore,
    AppDataStoreType: types.SQLStore,
    BaseDir:          dataDir,
})

client, _ := arksdk.NewArkClient(store)
client.Init(ctx, arksdk.InitArgs{
    WalletType: arksdk.SingleKeyWallet,
    ServerUrl:  "localhost:7070",
    Password:   "secure_password",
})
```

## SQL Store

### Purpose

The SQL store uses SQLite for structured storage of application data (UTXOs, VTXOs, transactions). Provides ACID guarantees and efficient queries.

### Configuration

```go
store.NewStore(store.Config{
    ConfigStoreType:  types.FileStore,
    AppDataStoreType: types.SQLStore,
    BaseDir:          "/path/to/data",
})
```

This creates `sqlite.db` in the `BaseDir` directory.

### Schema

The SQL store uses sqlc-generated queries with the following tables:

- **utxos**: Onchain UTXO tracking
- **vtxos**: Offchain VTXO management
- **transactions**: Transaction log with metadata

Migrations are embedded and run automatically on first initialization.

### Characteristics

- **Persistence**: SQLite database file
- **Performance**: Excellent for queries and filtering
- **ACID**: Transactional consistency
- **Indexing**: Optimized lookups by key fields
- **Use cases**: Applications with complex queries, high transaction volume

### Example

```go
store, err := store.NewStore(store.Config{
    ConfigStoreType:  types.FileStore,
    AppDataStoreType: types.SQLStore,
    BaseDir:          "/var/lib/arkwallet",
})

// Database automatically migrated
client, _ := arksdk.NewArkClient(store)
```

## KV Store

### Purpose

The KV (key-value) store uses BadgerDB for simple, fast key-value persistence of application data.

### Configuration

```go
store.NewStore(store.Config{
    ConfigStoreType:  types.FileStore,
    AppDataStoreType: types.KVStore,
    BaseDir:          "/path/to/data",
})
```

### Characteristics

- **Persistence**: BadgerDB files in subdirectories
- **Performance**: Very fast reads/writes
- **Structure**: Simple key-value pairs
- **Use cases**: High-performance applications, simpler data models

## Custom Store Implementation

To implement a custom storage backend, implement the required interfaces:

```go
type ConfigStore interface {
    AddConfig(ctx context.Context, config types.Config) error
    GetConfig(ctx context.Context) (*types.Config, error)
    CleanData(ctx context.Context) error
    Close()
}

type UtxoStore interface {
    AddUtxos(ctx context.Context, utxos []types.Utxo) error
    GetUtxos(ctx context.Context) ([]types.Utxo, error)
    // ... more methods
}

// Similar for VtxoStore and TransactionStore
```

Then create a factory function:

```go
func NewCustomStore(config store.Config) (types.Store, error) {
    return &customStore{
        configStore: NewCustomConfigStore(config.BaseDir),
        utxoStore:   NewCustomUtxoStore(config.BaseDir),
        // ...
    }, nil
}
```

## Migration and Backup

### Backup Strategy

**File Store:**

```bash
# Backup entire data directory
tar -czf wallet-backup.tar.gz /path/to/BaseDir
```

**SQL Store:**

```bash
# Backup database file
sqlite3 /path/to/BaseDir/sqlite.db ".backup wallet-backup.db"
```

**Universal: Export Seed**

```go
seed, err := client.Dump(ctx)
// Securely store seed for wallet recovery
```

### Restore Strategy

1. **From directory backup**: Extract to BaseDir and start client
2. **From seed**: Initialize new wallet with `Seed` parameter:

```go
client.Init(ctx, arksdk.InitArgs{
    Seed:       "backed_up_seed_hex",
    Password:   "password",
    WalletType: arksdk.SingleKeyWallet,
    // ... other config
})
```

### Migration Between Stores

No automatic migration is provided. To migrate:

1. Export seed from old wallet: `client.Dump(ctx)`
2. Create new store with desired backend
3. Initialize wallet with exported seed

## Performance Characteristics

| Store Type | Read Speed | Write Speed | Query Support | Disk Usage | Best For |
|------------|------------|-------------|---------------|------------|----------|
| In-Memory  | Fastest    | Fastest     | Limited       | RAM only   | Testing |
| File + KV  | Fast       | Fast        | Basic         | Moderate   | General use |
| File + SQL | Medium     | Medium      | Advanced      | Higher     | Complex queries |

## Configuration Recommendations

**Mobile/Desktop Wallet:**
```go
store.Config{
    ConfigStoreType:  types.FileStore,
    AppDataStoreType: types.SQLStore,
    BaseDir:          userConfigDir,
}
```

**High-Performance Service:**
```go
store.Config{
    ConfigStoreType:  types.FileStore,
    AppDataStoreType: types.KVStore,
    BaseDir:          "/var/lib/service",
}
```

**Testing:**
```go
store.Config{
    ConfigStoreType: types.InMemoryStore,
}
```
