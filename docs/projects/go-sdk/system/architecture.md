# Go SDK - Architecture

## Overview

The go-sdk follows a layered architecture that separates concerns between wallet management, server communication, blockchain exploration, and data persistence. The design emphasizes modularity, allowing developers to swap implementations of storage backends, transport clients, and wallet types.

## Client Architecture

### ArkClient Interface

The `ArkClient` is the primary interface for all SDK operations. It orchestrates wallet services, transport clients, and storage to provide a unified API:

```
┌─────────────────────────────────────────┐
│           ArkClient Interface           │
├─────────────────────────────────────────┤
│  - Init / Load / Unlock / Lock          │
│  - Balance / Receive / Send             │
│  - CollaborativeExit / UnilateralExit   │
│  - ListVtxos / GetTransactionHistory    │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼─────┐       ┌──────▼──────┐
│ Wallet  │       │  Transport  │
│ Service │       │   Client    │
└─────────┘       └─────────────┘
```

The client manages state transitions between locked/unlocked states and coordinates operations across multiple services.

## Service Integration

### Client Service (TransportClient)

The transport layer handles all communication with the arkd server. Two implementations are available:

- **gRPC Client** (`client/grpc`): Binary protocol using Protocol Buffers
- **REST Client** (`client/rest`): HTTP/JSON API generated from OpenAPI spec

Both implement the same `TransportClient` interface, enabling runtime selection:

```go
type TransportClient interface {
    GetInfo(ctx) (*Info, error)
    RegisterIntent(ctx, proof, message string) (string, error)
    SubmitTx(ctx, signedTx string, checkpoints []string) (...)
    GetEventStream(ctx, topics []string) (<-chan BatchEventChannel, ...)
    // ... more methods
}
```

### Explorer Service

The explorer service monitors Bitcoin blockchain state via Esplora API:

- Address monitoring for incoming transactions
- UTXO tracking for onchain balance
- Transaction confirmation status
- Block height synchronization

### Indexer Service

The indexer provides historical data about Ark protocol operations:

- VTXO chain tracking
- Commitment transaction lookup
- Forfeit transaction retrieval
- Virtual transaction history

### Wallet Service

Wallet service manages keys and signing operations:

**Current Implementation: Single-Key Wallet**
- One private key for all transactions
- Simple backup/restore via seed export
- Stateless signing operations

**Future: HD Wallet**
- Hierarchical deterministic key derivation
- Multiple addresses with single backup
- Enhanced privacy through address rotation

## Storage Model

The SDK uses a pluggable storage architecture with four distinct stores:

```
┌────────────────────────────────────────┐
│        types.Store Interface           │
├────────────────────────────────────────┤
│  ConfigStore()     → Configuration     │
│  UtxoStore()       → Onchain UTXOs     │
│  VtxoStore()       → Offchain VTXOs    │
│  TransactionStore()→ Transaction Log   │
└────────────────────────────────────────┘
```

### Store Types

**ConfigStore**: Encrypted wallet seed and settings
**UtxoStore**: Onchain Bitcoin UTXOs (boarding addresses)
**VtxoStore**: Offchain VTXOs managed by Ark protocol
**TransactionStore**: Transaction history and metadata

Each store can be implemented independently, allowing mix-and-match configurations:

```go
store.Config{
    ConfigStoreType:  types.FileStore,    // Encrypted file
    AppDataStoreType: types.SQLStore,     // SQLite database
}
```

## Communication Patterns

### gRPC vs REST

**gRPC Client (Recommended)**
- Binary Protocol Buffers encoding
- Bi-directional streaming for events
- Lower latency and bandwidth
- Type-safe code generation

**REST Client**
- Standard HTTP/JSON
- Easier debugging and inspection
- Better firewall/proxy compatibility
- Server-sent events for streaming

Both clients share the same interface, making transport selection a configuration choice:

```go
InitArgs{
    ClientType: arksdk.GrpcClient,  // or arksdk.RestClient
    ServerUrl:  "localhost:7070",
}
```

## Event System

The SDK provides real-time event channels for monitoring state changes:

```
┌──────────────────────────────────────┐
│       Event Channels                 │
├──────────────────────────────────────┤
│  GetTransactionEventChannel()        │
│    → Received/spent transactions     │
│                                      │
│  GetVtxoEventChannel()               │
│    → VTXO created/spent/expired      │
│                                      │
│  GetUtxoEventChannel()               │
│    → Onchain UTXO changes            │
└──────────────────────────────────────┘
```

Events are delivered asynchronously via Go channels:

```go
txChan := client.GetTransactionEventChannel(ctx)
for event := range txChan {
    for _, tx := range event.Txs {
        fmt.Printf("Transaction %s: %d sats\n",
            tx.TransactionKey, tx.Amount)
    }
}
```

## Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                    │
└───────────────────┬─────────────────────────────────────┘
                    │
        ┌───────────┴────────────┐
        │                        │
┌───────▼──────┐      ┌─────────▼────────┐
│  ArkClient   │      │  TransportClient │
│              │      │  (gRPC/REST)     │
└──────┬───────┘      └─────────┬────────┘
       │                        │
   ┌───┴───┐              ┌─────┴─────┐
   │       │              │           │
┌──▼─┐  ┌─▼───┐      ┌──▼────┐  ┌───▼────┐
│Wallet│ │Store│     │Explorer│ │Indexer │
└──────┘ └─────┘     └────────┘ └────────┘
            │              │         │
        ┌───┴────┬─────┬───┴─────┐   │
        │        │     │         │   │
   ┌────▼──┐ ┌──▼──┐ ┌▼──────┐ ┌▼───▼──┐
   │Config │ │UTXO │ │Esplora│ │arkd   │
   │Store  │ │Store│ │  API  │ │Server │
   └───────┘ └─────┘ └───────┘ └───────┘
                           │         │
                           └────┬────┘
                                │
                          ┌─────▼──────┐
                          │  Bitcoin   │
                          │   Network  │
                          └────────────┘
```

## Design Principles

1. **Interface-driven**: All major components defined by interfaces for testability
2. **Pluggable backends**: Storage and transport layers are swappable
3. **State management**: Clear locked/unlocked states with proper transitions
4. **Event-driven updates**: Asynchronous notifications for state changes
5. **Type safety**: Protocol Buffers for network communication
6. **Separation of concerns**: Wallet, storage, and communication are independent
