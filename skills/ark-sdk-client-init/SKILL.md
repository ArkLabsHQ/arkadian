---
name: ark-sdk-client-init
description: SDK client initialization and configuration - client types, wallet types, stores, and connection setup
---

# SDK Client Initialization for Ark

## When to Use

Use this skill when:
- Setting up a new Ark client (ArkClient)
- Configuring wallet types (SingleKey)
- Choosing transport types (gRPC, REST)
- Setting up storage backends (File, InMemory, KV, SQL)
- Managing wallet lifecycle (init, lock, unlock)
- Connecting to an Ark server (arkd)

## Key Concepts

### 1. ArkClient Interface

The main entry point for all SDK operations:

```go
type ArkClient interface {
    // Initialization
    Init(ctx context.Context, args InitArgs) error
    InitWithWallet(ctx context.Context, args InitWithWalletArgs) error

    // Wallet management
    IsLocked(ctx context.Context) bool
    Unlock(ctx context.Context, password string) error
    Lock(ctx context.Context) error

    // Balance and addresses
    Balance(ctx context.Context) (*Balance, error)
    Receive(ctx context.Context) (onchainAddr, offchainAddr, boardingAddr string, err error)

    // Transactions
    SendOffChain(ctx context.Context, receivers []types.Receiver, opt ...Option) (string, error)
    Settle(ctx context.Context, opts ...Option) (string, error)
    CollaborativeExit(ctx context.Context, addr string, amount uint64, opts ...Option) (string, error)
    // ... more methods
}
```

### 2. Client Types

| Type | Constant | Use Case |
|------|----------|----------|
| gRPC | `GrpcClient` | Recommended, better performance, streaming |
| REST | `RestClient` | Simpler, HTTP-based, easier debugging |

### 3. Wallet Types

| Type | Constant | Description |
|------|----------|-------------|
| SingleKey | `SingleKeyWallet` | Single private key for all operations |

### 4. Store Types

| Type | Constant | Description |
|------|----------|-------------|
| InMemory | `InMemoryStore` | Ephemeral, lost on restart |
| File | `FileStore` | Persistent, file-based storage |
| KV | `KVStore` | Key-value database |
| SQL | `SQLStore` | SQL database backend |

## Code Patterns

### Pattern 1: InitArgs Structure

```go
type InitArgs struct {
    ClientType           string        // "grpc" or "rest"
    WalletType           string        // "singlekey"
    ServerUrl            string        // arkd server URL
    Seed                 string        // Private key hex (optional, generates if empty)
    Password             string        // Wallet encryption password
    ExplorerURL          string        // Blockchain explorer URL
    ExplorerPollInterval time.Duration // How often to poll explorer
    WithTransactionFeed  bool          // Enable real-time notifications
}
```
**Source**: `go-sdk/types.go:24-33`

### Pattern 2: InitWithWalletArgs Structure

```go
type InitWithWalletArgs struct {
    ClientType           string
    Wallet               wallet.WalletService  // Pre-configured wallet
    ServerUrl            string
    Seed                 string
    Password             string
    ExplorerURL          string
    ExplorerPollInterval time.Duration
    ExplorerBatchSize    uint32
    ExplorerBatchDelay   time.Duration
    WithTransactionFeed  bool
}
```
**Source**: `go-sdk/types.go:66-77`

### Pattern 3: Creating a New Client with File Store

```go
import (
    arksdk "github.com/arkade-os/go-sdk"
    filestore "github.com/arkade-os/go-sdk/store/file"
)

func createClient(datadir string) (arksdk.ArkClient, error) {
    // Create file-based store
    store, err := filestore.NewStore(datadir)
    if err != nil {
        return nil, err
    }

    // Create client with store
    client, err := arksdk.New(store)
    if err != nil {
        return nil, err
    }

    return client, nil
}
```

### Pattern 4: Initializing the Client

```go
func initClient(client arksdk.ArkClient, serverUrl, password string) error {
    ctx := context.Background()

    // Check if already initialized
    cfg, _ := client.GetConfigData(ctx)
    if cfg != nil {
        return arksdk.ErrAlreadyInitialized
    }

    // Initialize with args
    err := client.Init(ctx, arksdk.InitArgs{
        ClientType:          arksdk.GrpcClient,
        WalletType:          arksdk.SingleKeyWallet,
        ServerUrl:           serverUrl,
        Password:            password,
        WithTransactionFeed: true,  // Enable notifications
    })
    if err != nil {
        return err
    }

    // Unlock the wallet to start using it
    return client.Unlock(ctx, password)
}
```

### Pattern 5: Restoring from Seed

```go
func restoreFromSeed(client arksdk.ArkClient, serverUrl, password, seed string) error {
    ctx := context.Background()

    err := client.Init(ctx, arksdk.InitArgs{
        ClientType:          arksdk.GrpcClient,
        WalletType:          arksdk.SingleKeyWallet,
        ServerUrl:           serverUrl,
        Password:            password,
        Seed:                seed,  // Existing private key hex
        WithTransactionFeed: true,
    })
    if err != nil {
        return err
    }

    return client.Unlock(ctx, password)
}
```

### Pattern 6: Available Constants

```go
const (
    // Transport types
    GrpcClient = client.GrpcClient  // "grpc"
    RestClient = client.RestClient  // "rest"

    // Wallet types
    SingleKeyWallet = wallet.SingleKeyWallet  // "singlekey"

    // Store types
    FileStore     = types.FileStore      // "file"
    InMemoryStore = types.InMemoryStore  // "inmemory"

    // Explorer types
    BitcoinExplorer = mempool_explorer.BitcoinExplorer
)
```
**Source**: `go-sdk/base_client.go:28-39`

### Pattern 7: Client Options

```go
type ClientOption func(*arkClient)

// Enable verbose logging
func WithVerbose() ClientOption

// Enable periodic db refresh (for transaction feed)
func WithRefreshDb(interval time.Duration) ClientOption

// Disable auto-finalization of pending txs
func WithoutFinalizePendingTxs() ClientOption
```
**Source**: `go-sdk/base_client.go:46-67`

### Pattern 8: Creating Client with Options

```go
store, _ := filestore.NewStore(datadir)
client, _ := arksdk.New(store,
    arksdk.WithVerbose(),
    arksdk.WithRefreshDb(30*time.Second),
)
```

### Pattern 9: Wallet Lock/Unlock Flow

```go
func manageWallet(client arksdk.ArkClient, password string) error {
    ctx := context.Background()

    // Check if locked
    if client.IsLocked(ctx) {
        // Unlock to use
        if err := client.Unlock(ctx, password); err != nil {
            return err
        }
    }

    // Wait for sync if using transaction feed
    syncCh := client.IsSynced(ctx)
    if syncCh != nil {
        event := <-syncCh
        if event.Err != nil {
            return event.Err
        }
    }

    // ... do operations ...

    // Lock when done (optional)
    return client.Lock(ctx)
}
```
**Source**: `go-sdk/base_client.go:106-203`

### Pattern 10: Getting Config After Init

```go
func checkConfig(client arksdk.ArkClient) error {
    ctx := context.Background()

    cfg, err := client.GetConfigData(ctx)
    if err != nil {
        return err
    }

    // Access server info
    fmt.Printf("Server: %s\n", cfg.ServerUrl)
    fmt.Printf("Network: %s\n", cfg.Network.Name)
    fmt.Printf("Signer PubKey: %x\n", cfg.SignerPubKey.SerializeCompressed())
    fmt.Printf("Exit Delay: %d blocks\n", cfg.UnilateralExitDelay.Value)
    fmt.Printf("Dust: %d sats\n", cfg.Dust)

    return nil
}
```
**Source**: `go-sdk/base_client.go:99-104`

### Pattern 11: Transaction Feed Channels

```go
func subscribeToEvents(client arksdk.ArkClient) {
    ctx := context.Background()

    // VTXO events (new, spent, updated)
    vtxoCh := client.GetVtxoEventChannel(ctx)
    go func() {
        for event := range vtxoCh {
            switch event.Type {
            case types.VtxosAdded:
                fmt.Println("New VTXOs received")
            case types.VtxosSpent:
                fmt.Println("VTXOs spent")
            case types.VtxosUpdated:
                fmt.Println("VTXOs updated")
            }
        }
    }()

    // UTXO events (onchain)
    utxoCh := client.GetUtxoEventChannel(ctx)
    go func() {
        for event := range utxoCh {
            // Handle onchain events
        }
    }()

    // Transaction events
    txCh := client.GetTransactionEventChannel(ctx)
    go func() {
        for event := range txCh {
            // Handle transaction events
        }
    }()
}
```
**Source**: `go-sdk/base_client.go:279-304`

### Pattern 12: Cleanup and Stop

```go
func cleanup(client arksdk.ArkClient) {
    ctx := context.Background()

    // Reset: cleans store, stops all services
    client.Reset(ctx)

    // Or just stop: keeps data, stops services
    client.Stop()
}
```
**Source**: `go-sdk/base_client.go:313-358`

## File References

| Purpose | File | Key Types/Functions |
|---------|------|---------------------|
| Client interface | `go-sdk/ark_sdk.go` | `ArkClient` interface |
| Client implementation | `go-sdk/base_client.go` | `arkClient`, `Init`, `Unlock`, `Lock` |
| Init args | `go-sdk/types.go` | `InitArgs`, `InitWithWalletArgs`, `Balance` |
| SDK types | `go-sdk/types/types.go` | `Config`, `Vtxo`, `Utxo`, `Receiver` |
| Wallet interface | `go-sdk/wallet/wallet.go` | `WalletService` |
| SingleKey wallet | `go-sdk/wallet/singlekey/bitcoin_wallet.go` | `bitcoinWallet` |
| File store | `go-sdk/store/file/store.go` | `NewStore` |
| gRPC client | `go-sdk/client/grpc/client.go` | `NewClient` |
| REST client | `go-sdk/client/rest/client.go` | `NewClient` |

## Common Operations

### Operation 1: Full Initialization Flow

```go
// 1. Create store
store, _ := filestore.NewStore("~/.ark-wallet")

// 2. Create client
client, _ := arksdk.New(store, arksdk.WithVerbose())

// 3. Initialize (connects to server, creates wallet)
client.Init(ctx, arksdk.InitArgs{
    ClientType:          arksdk.GrpcClient,
    WalletType:          arksdk.SingleKeyWallet,
    ServerUrl:           "localhost:7070",
    Password:            "secure-password",
    WithTransactionFeed: true,
})

// 4. Unlock wallet
client.Unlock(ctx, "secure-password")

// 5. Wait for sync
<-client.IsSynced(ctx)

// 6. Ready to use!
balance, _ := client.Balance(ctx)
```

### Operation 2: Check and Resume Existing Wallet

```go
cfg, err := client.GetConfigData(ctx)
if err != nil {
    // Not initialized, need to init
    return client.Init(ctx, args)
}

// Already initialized, just unlock
if client.IsLocked(ctx) {
    return client.Unlock(ctx, password)
}
return nil
```

### Operation 3: Export Wallet Seed

```go
if !client.IsLocked(ctx) {
    seed, err := client.Dump(ctx)
    if err != nil {
        return err
    }
    fmt.Printf("Backup your seed: %s\n", seed)
}
```

## Balance Structure

```go
type Balance struct {
    OnchainBalance  OnchainBalance
    OffchainBalance OffchainBalance
}

type OnchainBalance struct {
    SpendableAmount uint64
    LockedAmount    []LockedOnchainBalance  // With CSV delays
}

type OffchainBalance struct {
    Total          uint64
    NextExpiration string      // When first VTXO expires
    Details        []VtxoDetails  // Per-expiration breakdown
}
```
**Source**: `go-sdk/types.go:100-124`

## Gotchas & Edge Cases

1. **Always Unlock After Init**: The wallet is locked after `Init()`. You must call `Unlock()` before using other methods.

2. **Wait for Sync**: If `WithTransactionFeed: true`, wait for `IsSynced()` before querying balance. Otherwise you get stale data.

3. **Password Required**: Password cannot be empty. It's used to encrypt the wallet data.

4. **Server Info**: Client fetches server info (signer key, fees, delays) during `Init()`. Changing server requires re-init.

5. **Store Persistence**: InMemoryStore loses all data on restart. Use FileStore for production.

6. **Transaction Feed**: Without `WithTransactionFeed`, balance queries hit the server each time (slower but no background sync).

7. **Reset vs Stop**: `Reset()` cleans data, `Stop()` preserves it. Use `Reset()` for fresh start, `Stop()` for temporary shutdown.

8. **Seed Format**: Seed is hex-encoded private key (64 chars). Don't confuse with BIP39 mnemonic.

9. **Lock Before Exit**: Always call `Lock()` or `Stop()` before exiting to ensure clean shutdown.

10. **Multiple Clients**: Don't create multiple clients with same datadir - they'll conflict. Use single instance.

---
**Skill Owner**: ark-developer
**Repos**: go-sdk
