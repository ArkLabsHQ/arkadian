# Go SDK - Integration

## Overview

The go-sdk integrates with multiple services to provide complete Ark protocol functionality. This document describes how the SDK communicates with arkd servers, Bitcoin explorers, and indexer services.

## Integration with arkd Server

### Server Connection

The SDK connects to an arkd server instance to access the Ark protocol network. Two transport options are available:

**gRPC Transport (Recommended):**

```go
client.Init(ctx, arksdk.InitArgs{
    ClientType: arksdk.GrpcClient,
    ServerUrl:  "localhost:7070",
    // ...
})
```

**REST Transport:**

```go
client.Init(ctx, arksdk.InitArgs{
    ClientType: arksdk.RestClient,
    ServerUrl:  "http://localhost:8080",
    // ...
})
```

### Service Endpoints

The SDK uses three primary service interfaces on arkd:

1. **ArkService**: Core protocol operations (payments, exits, rounds)
2. **Explorer**: Bitcoin blockchain monitoring
3. **Indexer**: Historical data and VTXO tracking

## Service Usage

### Client Service (TransportClient)

The transport client handles all communication with arkd's core service.

**Key Operations:**

```go
type TransportClient interface {
    // Server information
    GetInfo(ctx) (*Info, error)

    // Round participation
    RegisterIntent(ctx, proof, message string) (string, error)
    ConfirmRegistration(ctx, intentID string) error
    DeleteIntent(ctx, proof, message string) error

    // Transaction submission
    SubmitTx(ctx, signedArkTx, checkpointTxs) (...)
    FinalizeTx(ctx, arkTxid, finalCheckpoints) error

    // Event streaming
    GetEventStream(ctx, topics []string) (<-chan BatchEventChannel, ...)
    GetTransactionsStream(ctx) (<-chan TransactionEvent, ...)
}
```

**Example Usage:**

```go
// Connect to arkd
grpcClient, err := grpcclient.NewClient("localhost:7070")
if err != nil {
    log.Fatal(err)
}
defer grpcClient.Close()

// Get server information
info, err := grpcClient.GetInfo(ctx)
fmt.Printf("Connected to arkd %s on %s\n", info.Version, info.Network)
```

### Explorer Service

The explorer service monitors Bitcoin blockchain state via the Esplora API (through arkd).

**Capabilities:**
- Address monitoring for incoming transactions
- UTXO tracking and confirmation status
- Transaction broadcast
- Block height synchronization

**Configuration:**

```go
client.Init(ctx, arksdk.InitArgs{
    // ...
    ExplorerURL:          "https://mempool.space/api", // Custom endpoint
    ExplorerPollInterval: 5 * time.Second,             // Polling frequency
})
```

If not specified, the SDK uses arkd's built-in explorer.

### Indexer Service

The indexer provides historical data about Ark protocol operations.

**Queries Available:**
- VTXO chain tracing
- Commitment transaction lookup
- Forfeit transaction retrieval
- Virtual transaction history
- Batch sweep transaction data

**Example:**

```go
indexerClient := indexergrpc.NewClient("localhost:7070")
defer indexerClient.Close()

// Get VTXO chain
chain, err := indexerClient.GetVtxoChain(ctx, vtxoOutpoint)
if err != nil {
    log.Fatal(err)
}
```

## Transport Clients

### gRPC Client

The gRPC client uses Protocol Buffers for efficient binary communication.

**Benefits:**
- Low latency (binary encoding)
- Bi-directional streaming
- Type-safe code generation
- Lower bandwidth usage

**Setup:**

```go
import grpcclient "github.com/arkade-os/go-sdk/client/grpc"

client, err := grpcclient.NewClient("localhost:7070")
if err != nil {
    return err
}
defer client.Close()
```

**Event Streaming:**

```go
eventChan, cleanup, err := client.GetEventStream(ctx, []string{
    "batch.started",
    "batch.finalized",
})
defer cleanup()

for event := range eventChan {
    if event.Err != nil {
        log.Printf("Stream error: %v", event.Err)
        continue
    }

    switch e := event.Event.(type) {
    case *client.BatchStartedEvent:
        fmt.Printf("Batch %s started\n", e.Id)
    case *client.BatchFinalizedEvent:
        fmt.Printf("Batch %s finalized: %s\n", e.Id, e.Txid)
    }
}
```

### REST Client

The REST client uses HTTP/JSON for communication, generated from OpenAPI specifications.

**Benefits:**
- Easier debugging (human-readable)
- Better firewall/proxy compatibility
- Standard HTTP tooling support
- Server-sent events for streaming

**Setup:**

```go
import restclient "github.com/arkade-os/go-sdk/client/rest"

client, err := restclient.NewClient("http://localhost:8080")
if err != nil {
    return err
}
defer client.Close()
```

Both clients implement the same `TransportClient` interface, making switching transparent to application code.

## Bitcoin Network Integration

The SDK accesses the Bitcoin network indirectly through arkd's services:

```
┌──────────┐     gRPC/REST      ┌──────────┐
│  go-sdk  │ ◄──────────────────► │   arkd   │
└──────────┘                      └────┬─────┘
                                       │
                      ┌────────────────┼────────────────┐
                      │                │                │
                 ┌────▼────┐     ┌────▼────┐     ┌────▼────┐
                 │ Esplora │     │ Mempool │     │ Bitcoin │
                 │   API   │     │         │     │  Node   │
                 └─────────┘     └─────────┘     └─────────┘
```

The SDK does not require direct Bitcoin node access. All blockchain interaction is mediated through arkd.

## Transaction Lifecycle

### Submit → Sign → Finalize Pattern

Complex transactions follow a three-phase lifecycle:

**Phase 1: Build and Submit**

```go
// Build transaction (using ark-lib utilities)
arkTx, checkpointTxs, err := offchain.BuildTxs(inputs, outputs, closure)

// Sign with wallet
signedArkTx, err := client.SignTransaction(ctx, arkTx)

// Submit to server
arkTxid, finalArkTx, serverCheckpoints, err := transportClient.SubmitTx(
    ctx, signedArkTx, checkpointTxs,
)
```

**Phase 2: Counter-sign Checkpoints**

```go
// Server returns partially-signed checkpoint transactions
finalCheckpoints := make([]string, len(serverCheckpoints))
for i, checkpoint := range serverCheckpoints {
    finalCheckpoints[i], err = client.SignTransaction(ctx, checkpoint)
    if err != nil {
        return err
    }
}
```

**Phase 3: Finalize**

```go
// Send counter-signed checkpoints back to server
err = transportClient.FinalizeTx(ctx, arkTxid, finalCheckpoints)
if err != nil {
    return err
}
```

### Simple Send Pattern

For standard payments, use the simplified `SendOffChain` API:

```go
receivers := []types.Receiver{{To: addr, Amount: 1000}}
txid, err := client.SendOffChain(ctx, false, receivers)
```

This handles the submit → sign → finalize flow internally.

## Event Notifications via Transaction Feed

Enable real-time updates by setting `WithTransactionFeed: true`:

```go
client.Init(ctx, arksdk.InitArgs{
    // ...
    WithTransactionFeed: true,
})

// Subscribe to events
txChan := client.GetTransactionEventChannel(ctx)
vtxoChan := client.GetVtxoEventChannel(ctx)
utxoChan := client.GetUtxoEventChannel(ctx)

// Process events
go func() {
    for event := range txChan {
        for _, tx := range event.Txs {
            fmt.Printf("Transaction: %s (%d sats)\n",
                tx.TransactionKey, tx.Amount)
        }
    }
}()
```

Event channels remain open until context cancellation or client shutdown.

## Error Handling and Retries

### Network Errors

Connection errors are returned immediately. Applications should implement retry logic:

```go
var info *client.Info
for attempt := 0; attempt < 3; attempt++ {
    info, err = transportClient.GetInfo(ctx)
    if err == nil {
        break
    }
    time.Sleep(time.Second * time.Duration(attempt+1))
}
```

### Server Errors

Server-side errors (invalid transaction, insufficient balance) are returned as specific error types. Check error messages for details.

### Stream Interruptions

Event streams may close due to network issues:

```go
eventChan, cleanup, err := client.GetEventStream(ctx, topics)
defer cleanup()

for event := range eventChan {
    if event.Err != nil {
        if event.Err == client.ErrConnectionClosedByServer {
            // Reconnect and resubscribe
            eventChan, cleanup, err = client.GetEventStream(ctx, topics)
            continue
        }
        log.Printf("Stream error: %v", event.Err)
    }
    // Process event
}
```

## Health Checks

Query server status before operations:

```go
info, err := transportClient.GetInfo(ctx)
if err != nil {
    log.Fatal("Server unreachable")
}

// Check service status
if status := info.ServiceStatus["wallet"]; status != "running" {
    log.Warn("Wallet service not ready")
}
```

## Security Considerations

1. **Use TLS**: Connect to arkd via TLS in production
2. **Validate server**: Check `info.Digest` matches expected configuration
3. **Timeout contexts**: Always use contexts with timeouts for network calls
4. **Secure seed**: Never log or transmit wallet seed

**Example with TLS:**

```go
import "google.golang.org/grpc/credentials"

creds := credentials.NewClientTLSFromCert(certPool, "")
client, err := grpcclient.NewClient("arkd.example.com:7070",
    grpc.WithTransportCredentials(creds))
```
