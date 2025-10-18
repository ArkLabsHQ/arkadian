# Go SDK - Project Overview

## What is go-sdk?

The Arkade Go SDK is the official Go client library for the Ark protocol. It provides a comprehensive interface for building Bitcoin applications that leverage Ark's off-chain transaction capabilities while maintaining Bitcoin's security guarantees.

## Purpose

The SDK enables developers to:
- Build wallet applications with Ark protocol support
- Integrate Ark payments into existing Bitcoin services
- Create custom clients with specialized transaction flows
- Implement off-chain payment solutions with fast settlement

## Key Features

### Multiple Storage Backends
- **In-memory store**: Fast, ephemeral storage for testing
- **File store**: Production-ready directory-based persistence
- **SQL store**: Database-backed storage using SQLite

### Dual Transport Clients
- **gRPC client**: High-performance binary protocol (recommended)
- **REST client**: HTTP-based API for broader compatibility

### Transaction Feed
Real-time notifications for received/spent funds, VTXO state changes, and UTXO events.

### Wallet Types
- **Single-key wallet**: Currently supported, uses one key for all transactions
- **HD wallet**: Planned for future releases

## Use Cases

### Wallet Applications
```go
client, _ := arksdk.NewArkClient(store)
client.Init(ctx, arksdk.InitArgs{
    WalletType: arksdk.SingleKeyWallet,
    ClientType: arksdk.GrpcClient,
    ServerUrl:  "localhost:7070",
    Password:   "secure_password",
})
```

### Payment Integrations
```go
receivers := []types.Receiver{{To: recipientAddr, Amount: 1000}}
txid, err := client.SendOffChain(ctx, false, receivers)
```

### Custom Clients
```go
signedTx, _ := client.SignTransaction(ctx, arkTx)
arkTxid, _, checkpointTxs, _ := transportClient.SubmitTx(ctx, signedTx, checkpoints)
```

## Installation

```bash
go get github.com/arkade-os/go-sdk
```

## Quick Start

```go
// 1. Setup storage
storeSvc, _ := store.NewStore(store.Config{
    ConfigStoreType:  types.FileStore,
    AppDataStoreType: types.SQLStore,
    BaseDir:          "/path/to/data",
})

// 2. Create and initialize client
client, _ := arksdk.NewArkClient(storeSvc)
client.Init(ctx, arksdk.InitArgs{
    WalletType: arksdk.SingleKeyWallet,
    ClientType: arksdk.GrpcClient,
    ServerUrl:  "localhost:7070",
    Password:   "password",
})

// 3. Unlock and use
client.Unlock(ctx, "password")
defer client.Lock(ctx)

balance, _ := client.Balance(ctx, false)
println("Offchain balance:", balance.OffchainBalance.Total)
```

## API Documentation

Complete API reference: [https://pkg.go.dev/github.com/arkade-os/go-sdk](https://pkg.go.dev/github.com/arkade-os/go-sdk)

## Related Documentation

- **architecture.md**: Client architecture and service integration
- **api-reference.md**: Detailed API documentation with examples
- **storage-backends.md**: Storage implementation guide
- **integration.md**: Integration patterns with arkd server
- **examples.md**: End-to-end usage examples
