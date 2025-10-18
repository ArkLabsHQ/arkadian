# Building Wallet Applications with Arkade Go SDK

This guide provides step-by-step instructions for building production-ready wallet applications using the Arkade Go SDK.

## Prerequisites

- Go 1.21 or later
- Running arkd server (regtest, testnet, or mainnet)
- Basic understanding of Bitcoin addresses and transactions

## Project Structure

Organize your wallet application following this structure:

```
wallet-app/
├── main.go                 # Entry point and UI layer
├── wallet/
│   ├── manager.go         # Wallet lifecycle management
│   ├── transactions.go    # Transaction handling
│   └── balance.go         # Balance queries
├── storage/
│   └── config.go          # Storage configuration
└── security/
    └── password.go        # Password and seed handling
```

## Storage Backend Selection

### Development vs Production

**Development/Testing:**
```go
store.NewStore(store.Config{
    ConfigStoreType:  types.InMemoryStore,
    AppDataStoreType: types.KVStore,
})
```

**Production (Simple Wallets):**
```go
store.NewStore(store.Config{
    ConfigStoreType:  types.FileStore,
    AppDataStoreType: types.KVStore,
    BaseDir:          filepath.Join(os.Getenv("HOME"), ".mywalletapp"),
})
```

**Production (Multi-User Apps):**
```go
store.NewStore(store.Config{
    ConfigStoreType:  types.FileStore,
    AppDataStoreType: types.SQLStore,
    BaseDir:          "/var/lib/mywalletapp",
})
```

## Security Considerations

### Password Handling

**CRITICAL RULES:**
- Never log passwords or seeds
- Never store passwords in plaintext
- Never pass passwords in URLs or GET requests
- Use strong password validation (min 12 characters, mixed case, numbers, symbols)

```go
func ValidatePassword(password string) error {
    if len(password) < 12 {
        return errors.New("password must be at least 12 characters")
    }
    // Add complexity checks
    return nil
}
```

### Seed Backup and Recovery

**On wallet creation, ALWAYS:**
1. Generate the seed securely (SDK handles this)
2. Display seed to user ONCE during setup
3. Require user confirmation of seed backup
4. Provide seed export only after authentication

```go
// Display seed during initial setup only
func CreateWallet(password string) (seed string, err error) {
    client, _ := arksdk.NewArkClient(storeSvc)
    if err := client.Init(ctx, arksdk.InitArgs{
        WalletType: arksdk.SingleKeyWallet,
        Password:   password,
        // Seed is auto-generated if not provided
    }); err != nil {
        return "", err
    }
    // Return seed for user backup (show only once)
    seed, _ = client.GetSeed(ctx, password)
    return seed, nil
}
```

**Never:**
- Display seed in logs or error messages
- Store seed unencrypted
- Allow seed export without authentication
- Auto-copy seed to clipboard without user consent

## Wallet Initialization Flow

### First-Time Setup

```go
func InitializeNewWallet(password string) error {
    if err := ValidatePassword(password); err != nil {
        return err
    }

    storeSvc, err := store.NewStore(store.Config{
        ConfigStoreType:  types.FileStore,
        AppDataStoreType: types.KVStore,
        BaseDir:          getWalletDir(),
    })
    if err != nil {
        return fmt.Errorf("storage init failed: %w", err)
    }

    client, err := arksdk.NewArkClient(storeSvc)
    if err != nil {
        return fmt.Errorf("client creation failed: %w", err)
    }

    if err := client.Init(ctx, arksdk.InitArgs{
        WalletType:          arksdk.SingleKeyWallet,
        ClientType:          arksdk.GrpcClient,
        ServerUrl:           "arkd.example.com:7070",
        Password:            password,
        WithTransactionFeed: true,
    }); err != nil {
        return fmt.Errorf("wallet init failed: %w", err)
    }

    return nil
}
```

### Restoring from Seed

```go
func RestoreWallet(seed, password string) error {
    // Validate seed format (hex string)
    if _, err := hex.DecodeString(seed); err != nil {
        return errors.New("invalid seed format")
    }

    // Same as InitializeNewWallet but with Seed parameter
    client.Init(ctx, arksdk.InitArgs{
        WalletType: arksdk.SingleKeyWallet,
        Seed:       seed,
        Password:   password,
        // ... other params
    })
}
```

## User Onboarding

### Boarding vs Offchain Receive

**Boarding Address** (first-time users):
- Use when user has no offchain balance
- Provides onchain address for initial funding
- Funds must be settled to convert onchain → offchain

**Offchain Address** (existing users):
- Use for receiving from other Ark users
- Instant, no onchain fees
- No settlement required

```go
func GetReceiveAddresses(ctx context.Context) (string, string, error) {
    offchainAddr, boardingAddr, _, err := client.Receive(ctx)
    if err != nil {
        return "", "", err
    }

    // Show both to user, explain difference
    return offchainAddr, boardingAddr, nil
}
```

## Transaction History

Track both onchain and offchain transactions:

```go
func SetupTransactionMonitoring(client arksdk.ArkClient) {
    txsChan := client.GetTransactionEventChannel(context.Background())

    go func() {
        for txEvent := range txsChan {
            for _, tx := range txEvent.Txs {
                // Log to database/UI
                LogTransaction(Transaction{
                    TxID:      tx.TransactionKey.String(),
                    Type:      tx.Type, // received, sent, boarding, redemption
                    Amount:    tx.Amount,
                    Timestamp: time.Now(),
                })
            }
        }
    }()
}
```

## Balance Display

Always show both balances:

```go
func DisplayBalances(ctx context.Context) error {
    balance, err := client.Balance(ctx, false)
    if err != nil {
        return err
    }

    fmt.Printf("Onchain:  %d sats (spendable)\n",
        balance.OnchainBalance.SpendableAmount)
    fmt.Printf("Offchain: %d sats (instant)\n",
        balance.OffchainBalance.Total)

    return nil
}
```

## Error Handling Patterns

### Common Errors

```go
func SendTransaction(receivers []arksdk.Receiver) error {
    txid, err := client.SendOffchain(ctx, false, receivers)
    if err != nil {
        switch {
        case strings.Contains(err.Error(), "insufficient"):
            return errors.New("insufficient balance")
        case strings.Contains(err.Error(), "locked"):
            return errors.New("wallet is locked - please unlock first")
        case strings.Contains(err.Error(), "connection"):
            return errors.New("cannot reach server - check network")
        default:
            return fmt.Errorf("transaction failed: %w", err)
        }
    }
    return nil
}
```

## UI/UX Considerations

### Async Operations

Show progress for long-running operations:

```go
func SettleWithProgress(ctx context.Context) error {
    fmt.Println("Settling funds... (this may take 30-60 seconds)")

    txid, err := client.Settle(ctx)
    if err != nil {
        return err
    }

    fmt.Printf("Settlement in progress: %s\n", txid)
    fmt.Println("Your funds will be available in the next round")
    return nil
}
```

### Lock/Unlock Flow

```go
func WithUnlockedWallet(password string, fn func() error) error {
    if err := client.Unlock(ctx, password); err != nil {
        return errors.New("invalid password")
    }
    defer client.Lock(ctx)

    return fn()
}
```

## Testing Your Wallet App

### Unit Tests with Mock Storage

```go
func TestWalletCreation(t *testing.T) {
    storeSvc, _ := store.NewStore(store.Config{
        ConfigStoreType: types.InMemoryStore,
    })

    client, _ := arksdk.NewArkClient(storeSvc)
    err := client.Init(context.Background(), arksdk.InitArgs{
        WalletType: arksdk.SingleKeyWallet,
        Password:   "test123456789!",
    })

    assert.NoError(t, err)
}
```

### Integration Tests with Regtest

```go
func TestEndToEnd(t *testing.T) {
    // Requires running arkd on regtest
    client := setupTestClient("localhost:7070")

    // Fund wallet
    _, boardingAddr, _, _ := client.Receive(ctx)
    fundAddress(boardingAddr, 100000) // Use nigiri or bitcoin-cli

    // Test transactions
    balance, _ := client.Balance(ctx, false)
    assert.Greater(t, balance.OnchainBalance.SpendableAmount, uint64(0))
}
```

## Production Checklist

- [ ] Strong password validation
- [ ] Secure seed backup flow
- [ ] No sensitive data in logs
- [ ] File permissions (0600 for wallet files)
- [ ] Graceful error handling
- [ ] Transaction event monitoring
- [ ] Balance refresh on app start
- [ ] Locked-by-default wallet state
- [ ] Connection retry logic
- [ ] User education (boarding vs offchain)
