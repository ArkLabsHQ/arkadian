# Working with Storage Backends

This guide covers storage backend selection, setup, and management for the Arkade Go SDK.

## Choosing a Storage Backend

The SDK provides three storage options for different use cases:

### In-Memory Storage

**Use for:**
- Unit tests
- CI/CD pipelines
- Development prototyping
- Temporary wallets

**DO NOT use for:**
- Production wallets (data lost on restart)
- Long-lived applications
- Any scenario requiring data persistence

```go
store.NewStore(store.Config{
    ConfigStoreType:  types.InMemoryStore,
    AppDataStoreType: types.KVStore,
})
```

### File Storage (KV Store)

**Use for:**
- Single-user wallet applications
- Desktop wallets
- Mobile wallets
- Simple production deployments

**Advantages:**
- No external dependencies
- Simple backup (copy directory)
- Good performance for single-user scenarios
- Built on BadgerDB (embedded key-value store)

### SQL Storage (SQLite)

**Use for:**
- Multi-user applications
- Complex querying requirements
- Applications needing ACID guarantees
- Migration from/to other databases

**Advantages:**
- Structured data with relations
- Complex query support
- Transaction atomicity
- Easier data inspection with SQL tools

## File Storage Setup

### Directory Structure

```
~/.mywalletapp/                  # BaseDir
├── config.json                  # Wallet configuration (encrypted)
├── badger/                      # KV store data
│   ├── MANIFEST
│   ├── *.sst                    # Sorted string tables
│   └── *.vlog                   # Value logs
└── backups/                     # User-created backups
```

### Implementation

```go
package storage

import (
    "os"
    "path/filepath"
    "github.com/arkade-os/go-sdk/store"
    "github.com/arkade-os/go-sdk/types"
)

func NewFileStorage(appName string) (types.Store, error) {
    // Determine platform-specific data directory
    baseDir, err := getDataDir(appName)
    if err != nil {
        return nil, err
    }

    // Create directory with restricted permissions
    if err := os.MkdirAll(baseDir, 0700); err != nil {
        return nil, err
    }

    return store.NewStore(store.Config{
        ConfigStoreType:  types.FileStore,
        AppDataStoreType: types.KVStore,
        BaseDir:          baseDir,
    })
}

func getDataDir(appName string) (string, error) {
    home, err := os.UserHomeDir()
    if err != nil {
        return "", err
    }

    switch runtime.GOOS {
    case "darwin":
        return filepath.Join(home, "Library", "Application Support", appName), nil
    case "windows":
        return filepath.Join(os.Getenv("APPDATA"), appName), nil
    default: // linux, bsd, etc.
        return filepath.Join(home, "."+appName), nil
    }
}
```

### File Permissions

**CRITICAL:** Wallet files must be readable/writable only by the owner:

```go
func EnsureSecurePermissions(baseDir string) error {
    // Set directory to 0700 (rwx------)
    if err := os.Chmod(baseDir, 0700); err != nil {
        return err
    }

    // Walk through all files and set to 0600 (rw-------)
    return filepath.Walk(baseDir, func(path string, info os.FileInfo, err error) error {
        if err != nil {
            return err
        }
        if !info.IsDir() {
            return os.Chmod(path, 0600)
        }
        return nil
    })
}
```

### Backup Strategy

**Manual Backup:**

```go
func BackupWallet(baseDir string) (string, error) {
    timestamp := time.Now().Format("20060102-150405")
    backupPath := filepath.Join(baseDir, "backups", timestamp)

    if err := os.MkdirAll(backupPath, 0700); err != nil {
        return "", err
    }

    // Copy all files except backups directory
    files := []string{"config.json", "badger"}
    for _, file := range files {
        src := filepath.Join(baseDir, file)
        dst := filepath.Join(backupPath, file)

        if err := copyRecursive(src, dst); err != nil {
            return "", err
        }
    }

    return backupPath, nil
}
```

**Automatic Backup (Recommended):**

```go
func EnableAutomaticBackups(baseDir string) {
    ticker := time.NewTicker(24 * time.Hour)

    go func() {
        for range ticker.C {
            if _, err := BackupWallet(baseDir); err != nil {
                log.Errorf("Automatic backup failed: %v", err)
            }

            // Cleanup old backups (keep last 7 days)
            cleanupOldBackups(baseDir, 7)
        }
    }()
}
```

## SQL Storage Setup

### Schema Initialization

The SDK uses embedded migrations with sqlc for type-safe queries:

```go
func NewSQLStorage(baseDir string) (types.Store, error) {
    if err := os.MkdirAll(baseDir, 0700); err != nil {
        return nil, err
    }

    return store.NewStore(store.Config{
        ConfigStoreType:  types.FileStore,
        AppDataStoreType: types.SQLStore,
        BaseDir:          baseDir,
    })
}
```

**Note:** Migrations run automatically on first Init. The SDK handles:
- Schema creation
- Version tracking
- Idempotent upgrades

### Database Location

SQLite database is stored as `sqlite.db` in BaseDir:

```
~/.mywalletapp/
├── config.json
└── sqlite.db              # SQLite database file
```

### Connection Management

**The SDK manages connections internally.** For advanced use cases:

```go
// Access underlying database (use with caution)
import sqlstore "github.com/arkade-os/go-sdk/store/sql"

db, err := sqlstore.OpenDb(filepath.Join(baseDir, "sqlite.db"))
if err != nil {
    return err
}
defer db.Close()

// Set connection pool limits
db.SetMaxOpenConns(1) // SQLite works best with single writer
db.SetMaxIdleConns(1)
```

### Manual Migrations

While SDK handles migrations, you can inspect schema:

```bash
# View schema
sqlite3 ~/.mywalletapp/sqlite.db ".schema"

# Query transactions
sqlite3 ~/.mywalletapp/sqlite.db "SELECT * FROM transactions LIMIT 10;"

# Vacuum database (reclaim space)
sqlite3 ~/.mywalletapp/sqlite.db "VACUUM;"
```

## Custom Storage Implementation

Implement the Store interface for custom backends (PostgreSQL, cloud storage, etc.):

```go
type Store interface {
    ConfigStore() ConfigStore
    UtxoStore() UtxoStore
    VtxoStore() VtxoStore
    TransactionStore() TransactionStore
    Clean(ctx context.Context)
    Close()
}
```

### Example: PostgreSQL Backend

```go
func NewPostgresStore(connString string) (types.Store, error) {
    db, err := sql.Open("postgres", connString)
    if err != nil {
        return nil, err
    }

    // Run migrations
    if err := runMigrations(db); err != nil {
        return nil, err
    }

    return &postgresStore{
        config: NewPostgresConfigStore(db),
        utxo:   NewPostgresUtxoStore(db),
        vtxo:   NewPostgresVtxoStore(db),
        tx:     NewPostgresTxStore(db),
        db:     db,
    }, nil
}
```

### State Serialization

Ensure consistent serialization for wallet state:

```go
type WalletState struct {
    Seed          []byte          `json:"seed"`
    EncryptedData []byte          `json:"encrypted_data"`
    Network       string          `json:"network"`
    Metadata      json.RawMessage `json:"metadata"`
}

func (c *ConfigStore) SaveState(ctx context.Context, state WalletState) error {
    data, err := json.Marshal(state)
    if err != nil {
        return err
    }

    // Atomic write
    return c.atomicWrite("config.json", data, 0600)
}
```

### Transaction Atomicity

Ensure atomic operations for critical updates:

```go
func (s *sqlStore) AtomicUpdate(ctx context.Context, fn func(tx *sql.Tx) error) error {
    tx, err := s.db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }

    if err := fn(tx); err != nil {
        tx.Rollback()
        return err
    }

    return tx.Commit()
}
```

## Migrating Between Backends

### In-Memory to File Storage

```go
func MigrateToFileStorage(memStore types.Store, targetDir string) error {
    fileStore, err := store.NewStore(store.Config{
        ConfigStoreType:  types.FileStore,
        AppDataStoreType: types.KVStore,
        BaseDir:          targetDir,
    })
    if err != nil {
        return err
    }

    ctx := context.Background()

    // Copy config
    config, _ := memStore.ConfigStore().GetData(ctx)
    fileStore.ConfigStore().AddData(ctx, config)

    // Copy transactions
    txs, _ := memStore.TransactionStore().GetAll(ctx)
    for _, tx := range txs {
        fileStore.TransactionStore().AddTransaction(ctx, tx)
    }

    // Copy VTXOs
    vtxos, _ := memStore.VtxoStore().GetAll(ctx)
    for _, vtxo := range vtxos {
        fileStore.VtxoStore().AddVtxos(ctx, []types.Vtxo{vtxo})
    }

    return nil
}
```

### KV to SQL Storage

```go
func MigrateKVToSQL(kvBaseDir, sqlBaseDir string) error {
    // Open KV store (read-only)
    kvStore, err := store.NewStore(store.Config{
        ConfigStoreType:  types.FileStore,
        AppDataStoreType: types.KVStore,
        BaseDir:          kvBaseDir,
    })
    if err != nil {
        return err
    }

    // Create SQL store
    sqlStore, err := store.NewStore(store.Config{
        ConfigStoreType:  types.FileStore,
        AppDataStoreType: types.SQLStore,
        BaseDir:          sqlBaseDir,
    })
    if err != nil {
        return err
    }

    // Use same migration logic as above
    return copyStoreData(kvStore, sqlStore)
}
```

## Backup and Restore Procedures

### Full Backup

```go
func CreateFullBackup(storeSvc types.Store, baseDir string) (string, error) {
    backupFile := fmt.Sprintf("wallet-backup-%s.tar.gz", time.Now().Format("20060102"))

    // Create tar.gz archive
    f, err := os.Create(backupFile)
    if err != nil {
        return "", err
    }
    defer f.Close()

    gzw := gzip.NewWriter(f)
    defer gzw.Close()

    tw := tar.NewWriter(gzw)
    defer tw.Close()

    // Add all files from baseDir
    return backupFile, filepath.Walk(baseDir, func(path string, info os.FileInfo, err error) error {
        if err != nil || info.IsDir() {
            return err
        }

        // Skip backup directory itself
        if strings.Contains(path, "/backups/") {
            return nil
        }

        return addToTar(tw, path, baseDir)
    })
}
```

### Restore from Backup

```go
func RestoreFromBackup(backupFile, targetDir string) error {
    // Ensure target is empty or create new
    if err := os.RemoveAll(targetDir); err != nil {
        return err
    }
    if err := os.MkdirAll(targetDir, 0700); err != nil {
        return err
    }

    // Extract tar.gz
    f, err := os.Open(backupFile)
    if err != nil {
        return err
    }
    defer f.Close()

    gzr, err := gzip.NewReader(f)
    if err != nil {
        return err
    }
    defer gzr.Close()

    tr := tar.NewReader(gzr)
    return extractTar(tr, targetDir)
}
```

## Performance Considerations

### KV Store Optimization

```go
// Periodic compaction for KV store
func OptimizeKVStore(baseDir string) error {
    // BadgerDB handles this automatically, but you can force it:
    badgerPath := filepath.Join(baseDir, "badger")

    opts := badger.DefaultOptions(badgerPath)
    db, err := badger.Open(opts)
    if err != nil {
        return err
    }
    defer db.Close()

    return db.RunValueLogGC(0.5) // Reclaim 50% space threshold
}
```

### SQL Store Optimization

```bash
# Regular maintenance
sqlite3 wallet.db "ANALYZE;"
sqlite3 wallet.db "VACUUM;"
```

## Troubleshooting

**Corrupted KV store:**
```go
// Restore from last backup
RestoreFromBackup("latest-backup.tar.gz", baseDir)
```

**Locked database:**
```bash
# Check for stale lock files
rm ~/.mywalletapp/badger/LOCK
```

**Permission errors:**
```go
EnsureSecurePermissions(baseDir)
```
