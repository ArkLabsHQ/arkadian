# Go SDK - Examples

## alice_to_bob: End-to-End Payment Demo

**Location:** `example/alice_to_bob/alice_to_bob.go`

Demonstrates wallet setup, onboarding, offchain payments, settlement, collaborative exit, and event monitoring.

### How to Run

```bash
nigiri start                           # Bitcoin regtest
make run                              # arkd server (separate terminal)
cd example/alice_to_bob && go run alice_to_bob.go
```

### Key Patterns

**Setup:**
```go
store, _ := store.NewStore(store.Config{
    ConfigStoreType:  types.InMemoryStore,
    AppDataStoreType: types.KVStore,
})
client, _ := arksdk.NewArkClient(store)
client.Init(ctx, arksdk.InitArgs{
    WalletType: arksdk.SingleKeyWallet,
    ClientType: arksdk.GrpcClient,
    ServerUrl:  "localhost:7070",
    Password:   "password",
})
```

**Onboard:**
```go
_, _, boardingAddr, _ := client.Receive(ctx)
// Fund boarding address externally
txid, _ := client.Settle(ctx)
```

**Send:**
```go
receivers := []types.Receiver{{To: recipientAddr, Amount: 1000}}
txid, _ := client.SendOffChain(ctx, false, receivers)
```

**Redeem:**
```go
txid, _ := client.CollaborativeExit(ctx, "bc1q...", 1000, false)
```

## multi_connection_demo: Concurrent Address Monitoring

**Location:** `example/multi_connection_demo/multi_connection_demo.go`

Demonstrates multiple WebSocket connections, hash-based routing, batched subscriptions, and event handling.

### How to Run

```bash
go run example/multi_connection_demo/multi_connection_demo.go
go run example/multi_connection_demo/multi_connection_demo.go -addresses 500 -connections 5
```

**Flags:** `-addresses` (100), `-connections` (3), `-batch-size` (25), `-batch-delay` (50ms), `-max-events` (5)

## Common Patterns

### Setup and Initialize

```go
store, _ := store.NewStore(store.Config{
    ConfigStoreType:  types.FileStore,
    AppDataStoreType: types.SQLStore,
    BaseDir:          "/path/to/data",
})
client, _ := arksdk.NewArkClient(store)
client.Init(ctx, arksdk.InitArgs{
    WalletType: arksdk.SingleKeyWallet,
    ServerUrl:  "localhost:7070",
    Password:   "password",
})
client.Unlock(ctx, "password")
defer client.Lock(ctx)
```

### Onboard Funds

```go
_, _, boardingAddr, _ := client.Receive(ctx)
// Fund address externally
txid, _ := client.Settle(ctx)
```

### Send Payment

```go
_, recipientAddr, _, _ := recipient.Receive(ctx)
receivers := []types.Receiver{{To: recipientAddr, Amount: 1000}}
txid, _ := client.SendOffChain(ctx, false, receivers)
```

### Redeem to Onchain

```go
txid, _ := client.CollaborativeExit(ctx, "bc1q...", amount, false)
```

## Running Examples

**Prerequisites:** Running arkd server, Bitcoin network (regtest/testnet/mainnet), Go 1.24.6+

```bash
git clone https://github.com/arkade-os/go-sdk
cd go-sdk
go run example/alice_to_bob/alice_to_bob.go
```

**Resources:** [API docs](https://pkg.go.dev/github.com/arkade-os/go-sdk) | [Nigiri](https://github.com/vulpemventures/nigiri)
