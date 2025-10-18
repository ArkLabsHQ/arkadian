# Go SDK Usage Guide

Quick reference for common Arkade Go SDK operations.

## Installation

```bash
go get github.com/arkade-os/go-sdk
```

## Basic Setup

### Create Store and Client

```go
import (
    arksdk "github.com/arkade-os/go-sdk"
    "github.com/arkade-os/go-sdk/store"
    "github.com/arkade-os/go-sdk/types"
)

// In-memory storage (testing only)
storeSvc, err := store.NewStore(store.Config{
    ConfigStoreType: types.InMemoryStore,
})

// File-based storage (production)
storeSvc, err := store.NewStore(store.Config{
    ConfigStoreType: types.FileStore,
    BaseDir:         "/path/to/storage/directory",
})

client, err := arksdk.NewArkClient(storeSvc)
```

### Initialize Wallet

```go
// Initialize new wallet
err := client.Init(context.Background(), arksdk.InitArgs{
    WalletType: arksdk.SingleKeyWallet,
    ClientType: arksdk.GrpcClient,
    ServerUrl:  "localhost:7070",
    Password:   "your_password",
})

// Restore from seed
err := client.Init(context.Background(), arksdk.InitArgs{
    WalletType: arksdk.SingleKeyWallet,
    ClientType: arksdk.GrpcClient,
    ServerUrl:  "localhost:7070",
    Password:   "your_password",
    Seed:       "hex_encoded_private_key",
})
```

## Common Operations

### Unlock/Lock Wallet

```go
if err := client.Unlock(ctx, password); err != nil {
    log.Fatal(err)
}
defer client.Lock(ctx)
```

### Receive Addresses

```go
// Get both offchain and boarding addresses
_, offchainAddr, boardingAddr, err := client.Receive(ctx)
if err != nil {
    log.Fatal(err)
}
log.Printf("Offchain address: %s", offchainAddr)
log.Printf("Boarding address: %s", boardingAddr)
```

### Check Balance

```go
balance, err := client.Balance(ctx, false)
if err != nil {
    log.Fatal(err)
}

// Onchain balance
log.Printf("Onchain spendable: %d sats", balance.OnchainBalance.SpendableAmount)
log.Printf("Onchain locked: %d sats", balance.OnchainBalance.LockedAmount)

// Offchain balance
log.Printf("Offchain total: %d sats", balance.OffchainBalance.Total)
```

### Send Offchain Payment

```go
// Single recipient
amount := uint64(1000)
receivers := []types.Receiver{
    {To: recipientOffchainAddr, Amount: amount},
}

txid, err := client.SendOffChain(ctx, false, receivers)
if err != nil {
    log.Fatal(err)
}
log.Printf("Transaction: %s", txid)
```

### Multiple Recipients

```go
receivers := []types.Receiver{
    {To: addr1, Amount: 1000},
    {To: addr2, Amount: 2000},
    {To: addr3, Amount: 500},
}

txid, err := client.SendOffChain(ctx, false, receivers)
```

### Redeem to Onchain (Collaborative Exit)

```go
onchainAddress := "bc1q..."
redeemAmount := uint64(5000)

txid, err := client.CollaborativeExit(ctx, onchainAddress, redeemAmount, false)
if err != nil {
    log.Fatal(err)
}
log.Printf("Redeemed with tx: %s", txid)
```

### Settle Onboard Funds

```go
// After sending to boarding address, settle to move funds offchain
txid, err := client.Settle(ctx)
if err != nil {
    log.Fatal(err)
}
log.Printf("Settled in commitment tx: %s", txid)
```

## Transaction Feed

Enable transaction notifications during initialization:

```go
err := client.Init(context.Background(), arksdk.InitArgs{
    WalletType:          arksdk.SingleKeyWallet,
    ClientType:          arksdk.GrpcClient,
    ServerUrl:           "localhost:7070",
    Password:            "your_password",
    WithTransactionFeed: true,
})

// Listen for events
txsChan := client.GetTransactionEventChannel(ctx)
go func() {
    for txEvent := range txsChan {
        for _, tx := range txEvent.Txs {
            log.Printf("TX %s: type=%s, amount=%d",
                tx.TransactionKey.String(),
                tx.Type,
                tx.Amount,
            )
        }
    }
}()
```

## Storage Quick Reference

| Storage Type | Use Case | Configuration |
|-------------|----------|---------------|
| InMemory | Testing only | `types.InMemoryStore` |
| File | Production | `types.FileStore` + `BaseDir` |

## Client Types

| Client Type | Protocol | Best For |
|------------|----------|----------|
| GrpcClient | gRPC | Performance (recommended) |
| RestClient | REST API | Simple HTTP setup |

## Complete Example

See `${GO_SDK_REPO}/example/alice_to_bob/alice_to_bob.go` for a full end-to-end demo.
