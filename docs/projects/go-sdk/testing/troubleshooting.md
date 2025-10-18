# Go SDK Troubleshooting Guide

Common issues and solutions when working with the Arkade Go SDK.

## Connection Issues

### "Connection refused" or "dial tcp: connection refused"

**Cause:** arkd server not running or incorrect URL.

**Solutions:**

```bash
# Check if arkd is running
netstat -an | grep 7070
# or
lsof -i :7070

# Start arkd if not running
cd /path/to/arkd
make run-light

# Verify correct server URL in client initialization
client.Init(ctx, arksdk.InitArgs{
    ServerUrl: "localhost:7070",  // Check port matches arkd config
    ...
})
```

### "context deadline exceeded"

**Cause:** Server not responding or network timeout.

**Solutions:**

```go
// Increase timeout
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

// Check arkd server health
curl http://localhost:7070/health

// Check arkd logs for errors
docker-compose logs -f arkd
```

## Wallet Issues

### "Invalid password" on Init

**Cause:** Wallet already initialized with different password, or storage contains existing wallet data.

**Solutions:**

```bash
# For file storage, remove existing wallet
rm -rf /path/to/storage/directory/*

# For in-memory storage, create new store instance
storeSvc, err := store.NewStore(store.Config{
    ConfigStoreType: types.InMemoryStore,
})

# Use correct password if wallet exists
err := client.Unlock(ctx, "correct_password")
```

### "Wallet not initialized" on Operations

**Cause:** Forgot to call Init() or Unlock().

**Solutions:**

```go
// Always initialize first
err := client.Init(ctx, arksdk.InitArgs{...})

// Then unlock before operations
err = client.Unlock(ctx, password)
defer client.Lock(ctx)

// Now perform operations
balance, err := client.Balance(ctx, false)
```

## Balance and Transaction Issues

### "Insufficient balance" Error

**Cause:** Not enough funds in onchain or offchain balance.

**Solutions:**

```go
// Check both balances
balance, err := client.Balance(ctx, false)
log.Printf("Onchain: %d sats", balance.OnchainBalance.SpendableAmount)
log.Printf("Offchain: %d sats", balance.OffchainBalance.Total)

// For offchain send, ensure offchain balance sufficient
// For onboard, fund boarding address first
_, _, boardingAddr, _ := client.Receive(ctx)
// Send BTC to boardingAddr, then:
txid, err := client.Settle(ctx)
```

### "Transaction failed" or SendOffChain Error

**Causes:** Multiple possible issues.

**Solutions:**

```bash
# Check arkd logs for specific error
docker-compose logs arkd | tail -50

# Verify round timing (wait for next round)
# Default: 30 seconds between rounds

# Check recipient address is valid
# Offchain addresses start with network-specific prefix

# Ensure wallet unlocked
err := client.Unlock(ctx, password)
```

### Funds Not Appearing After Send

**Cause:** Round not yet finalized or need to settle.

**Solutions:**

```go
// Wait for round to complete
time.Sleep(35 * time.Second)  // Assuming 30s round interval

// Check balance again
balance, err := client.Balance(ctx, false)

// For boarding funds, must settle first
txid, err := client.Settle(ctx)
time.Sleep(5 * time.Second)
```

## Storage Issues

### "Permission denied" File Storage Error

**Cause:** Insufficient permissions on storage directory.

**Solutions:**

```bash
# Check directory permissions
ls -la /path/to/storage/

# Fix permissions
chmod 755 /path/to/storage/
chmod 644 /path/to/storage/*

# Or use different directory
storeSvc, err := store.NewStore(store.Config{
    ConfigStoreType: types.FileStore,
    BaseDir:         "/Users/yourusername/.ark-wallet",
})
```

### "Database locked" SQLite Error

**Cause:** Multiple processes accessing same storage.

**Solutions:**

```bash
# Ensure only one client instance per storage directory
# For testing, use in-memory storage
storeSvc, err := store.NewStore(store.Config{
    ConfigStoreType: types.InMemoryStore,
})

# Or use separate directories for each client
```

## Debugging

### Enable Verbose Logging

```go
import log "github.com/sirupsen/logrus"

func main() {
    // Set debug level
    log.SetLevel(log.DebugLevel)

    // Or trace level for more detail
    log.SetLevel(log.TraceLevel)

    // Your code here...
}
```

### Check arkd Server Logs

```bash
# Docker setup
docker-compose logs -f arkd

# Direct arkd run
tail -f ~/.arkd/logs/arkd.log

# Check for specific errors
docker-compose logs arkd | grep ERROR
```

### Inspect Storage State

```bash
# File storage
ls -la /path/to/storage/
cat /path/to/storage/config.json

# Check SQLite database
sqlite3 /path/to/storage/wallet.db ".tables"
sqlite3 /path/to/storage/wallet.db "SELECT * FROM vtxos;"
```

### Verify Network Connectivity

```bash
# Test gRPC connection
grpcurl -plaintext localhost:7070 list
grpcurl -plaintext localhost:7070 ark.v1.ArkService/GetInfo

# Test REST connection (if using RestClient)
curl http://localhost:7070/v1/info
```

## FAQ

### How to restore wallet from seed?

```go
err := client.Init(ctx, arksdk.InitArgs{
    WalletType: arksdk.SingleKeyWallet,
    ClientType: arksdk.GrpcClient,
    ServerUrl:  "localhost:7070",
    Password:   "your_password",
    Seed:       "your_hex_encoded_private_key",  // Add this
})
```

### Can I change the wallet password?

Not directly. You must:
1. Export the seed (private key)
2. Create new storage
3. Restore wallet with new password using seed

### What happens if arkd is down?

- Cannot send new transactions
- Cannot receive new transactions
- Existing offchain balance safe
- Can perform unilateral exit to recover funds on-chain (advanced)

### How to migrate storage backends?

```go
// 1. Export seed from old wallet
// (Manual process - extract from old storage)

// 2. Create new storage
newStore, err := store.NewStore(store.Config{
    ConfigStoreType: types.FileStore,
    BaseDir:         "/new/path",
})

// 3. Initialize with seed
client, err := arksdk.NewArkClient(newStore)
err = client.Init(ctx, arksdk.InitArgs{
    Seed:     "exported_seed",
    Password: "password",
    // ... other args
})
```

### Why is SendOffChain taking so long?

arkd processes transactions in rounds (default: 30 seconds). Your transaction waits for the next round:
- Worst case: 30 seconds
- Average: 15 seconds
- Can check round interval in arkd config

### How to debug "Transaction not found"?

```go
// Enable transaction feed
err := client.Init(ctx, arksdk.InitArgs{
    WithTransactionFeed: true,
    // ... other args
})

// Monitor events
txsChan := client.GetTransactionEventChannel(ctx)
go func() {
    for txEvent := range txsChan {
        log.Printf("TX Event: %+v", txEvent)
    }
}()
```

## Getting Help

If issues persist:

1. Check arkd logs for server-side errors
2. Enable debug logging in SDK
3. Verify arkd and SDK versions compatible
4. File issue: https://github.com/arkade-os/go-sdk/issues

Include in bug reports:
- Go version
- SDK version
- arkd version
- Error message
- Minimal reproduction code
