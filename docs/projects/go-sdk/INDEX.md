---
project_id: go-sdk
version: 1.1.0
last_sync_commit: 3cc35f9ced5d71f4486566dc2ebcfe38a0158048
last_sync_date: 2026-02-19T12:00:00Z
repository_path: ${GO_SDK_REPO}
documentation_path: ${ARKADIAN_DOCS}/projects/go-sdk
commits_behind_upstream: 0
uncommitted_changes: false
default_sections_by_intent:
  qna:        ["system/project_overview.md", "testing/usage.md"]
  qa:         ["testing/usage.md", "testing/how_to_develop.md"]
  dev:        ["system/api-reference.md", "sop/building-wallets.md"]
  monitoring: ["testing/troubleshooting.md"]
aliases:
  overview: ["system/project_overview.md", "system/architecture.md"]
  usage: ["testing/usage.md", "system/api-reference.md"]
  examples: ["system/examples.md", "sop/building-wallets.md"]
  storage: ["system/storage-backends.md", "sop/working-with-storage.md"]
scripts:
  test: "make test"
  lint: "make lint"
  proto: "make proto"
  example_alice: "cd example/alice_to_bob && go run alice_to_bob.go"
---

# Ark Go SDK — Project Index

**go-sdk** is the official client library for building Ark wallets and applications in Go. It provides a high-level API for wallet operations, multiple storage backends, and integration with arkd servers via gRPC or REST.

## Directory Structure

### `${ARKADIAN_DIR}/docs/projects/go-sdk/system/` — System Architecture & API
Core documentation about the SDK architecture and API:

- **${ARKADIAN_DIR}/docs/projects/go-sdk/system/project_overview.md** — — What go-sdk is, features, and capabilities
- **${ARKADIAN_DIR}/docs/projects/go-sdk/system/architecture.md** — — Client architecture, service integration, storage model
- **${ARKADIAN_DIR}/docs/projects/go-sdk/system/api-reference.md** — — Main ArkClient interface and wallet operations
- **${ARKADIAN_DIR}/docs/projects/go-sdk/system/storage-backends.md** — — In-memory, file, and SQL storage options
- **${ARKADIAN_DIR}/docs/projects/go-sdk/system/integration.md** — — Integration with arkd server and other services
- **${ARKADIAN_DIR}/docs/projects/go-sdk/system/examples.md** — — Overview of example applications

### `${ARKADIAN_DIR}/docs/projects/go-sdk/testing/` — Usage & Development
Practical guides for using and developing with the SDK:

- **${ARKADIAN_DIR}/docs/projects/go-sdk/testing/usage.md** — — Quick start guide and common operations
- **${ARKADIAN_DIR}/docs/projects/go-sdk/testing/how_to_develop.md** — — Development setup, running tests, contributing
- **${ARKADIAN_DIR}/docs/projects/go-sdk/testing/troubleshooting.md** — — Common issues and solutions

### `${ARKADIAN_DIR}/docs/projects/go-sdk/sop/` — Standard Operating Procedures
Step-by-step guides for SDK operations:

- **${ARKADIAN_DIR}/docs/projects/go-sdk/sop/building-wallets.md** — — Guide for building wallet applications
- **${ARKADIAN_DIR}/docs/projects/go-sdk/sop/working-with-storage.md** — — Storage backend selection and usage
- **${ARKADIAN_DIR}/docs/projects/go-sdk/sop/integration-guide.md** — — Integrating SDK into applications

### `${ARKADIAN_DIR}/docs/projects/go-sdk/tasks/` — Product Requirements & Plans
Feature specifications and implementation tracking.

### `${ARKADIAN_DIR}/docs/projects/arkd/change-log/` — Recent Changes
Curated summaries of significant changes.

### `${ARKADIAN_DIR}/docs/projects/arkd/pr-report/` — Pull Request Summaries
Analysis and summaries of pull requests.

---

## Key Concepts

### ArkClient Interface
The main entry point for all SDK operations:
- Wallet initialization with `Init()` or `Load()`
- Wallet operations: Unlock, Lock, Receive, Balance, Send
- Transaction submission and signing
- Event notifications via transaction feed

### Storage Backends
Multiple storage options for different use cases:
- **In-Memory**: Testing only, no persistence
- **File**: Persistent storage for production wallets
- **SQL**: Database-backed storage (SQLite support via sqlc)

### Wallet Types
- **SingleKey**: Single key for all transactions (currently supported)
- **HD Wallet**: Hierarchical deterministic wallet (future)

### Client Types
- **gRPC Client**: High-performance communication (the only supported transport)
- **REST Client**: **[REMOVED]** as of v0.9+ - deleted in favor of gRPC-only

### Transaction Feed
Optional notifications for:
- Received funds (onchain and offchain)
- Spent funds (collaborative exit, unilateral exit)
- Real-time balance updates

---

## Quick Reference

### Installation
```bash
# Install SDK
go get github.com/arkade-os/go-sdk

# Import in your code
import arksdk "github.com/arkade-os/go-sdk"
```

### Basic Setup
```go
// Create store (in-memory for testing)
storeSvc, err := store.NewStore(store.Config{
    ConfigStoreType: types.InMemoryStore,
})

// Create client
client, err := arksdk.NewArkClient(storeSvc)

// Initialize wallet
err = client.Init(ctx, arksdk.InitArgs{
    WalletType: arksdk.SingleKeyWallet,
    ClientType: arksdk.GrpcClient,
    ServerUrl:  "localhost:7070",
    Password:   "your_password",
})
```

### Common Operations
```go
// Unlock wallet
err = client.Unlock(ctx, password)
defer client.Lock(ctx, password)

// Get receive addresses
offchainAddr, boardingAddr, err := client.Receive(ctx)

// Check balance
balance, err := client.Balance(ctx, false)

// Send offchain payment
receivers := []arksdk.Receiver{
    arksdk.NewBitcoinReceiver(recipientAddr, amount),
}
txid, err := client.SendOffchain(ctx, false, receivers)

// Collaborative exit (redeem to onchain)
txid, err := client.CollaborativeExit(ctx, onchainAddr, amount, false)
```

---

## Available Examples

### alice_to_bob
Complete end-to-end demonstration:
- Setting up two clients (Alice and Bob)
- Onboarding funds via boarding address
- Sending offchain payment from Alice to Bob
- Checking balances and transaction status

**Location**: `example/alice_to_bob/alice_to_bob.go`

**Run**: `cd example/alice_to_bob && go run alice_to_bob.go`

### multi_connection_demo
Demonstrates:
- Multiple concurrent client connections
- Connection pooling and management

**Location**: `example/multi_connection_demo/multi_connection_demo.go`

---

## API Documentation

Full API documentation is automatically generated and published on **pkg.go.dev**:

🔗 [https://pkg.go.dev/github.com/arkade-os/go-sdk](https://pkg.go.dev/github.com/arkade-os/go-sdk)

---

## Integration Points

### Arkd Server
- **gRPC endpoint**: Default port 7070
- **REST endpoint**: Alternative HTTP API
- **Services**: Client, Explorer, Indexer, Wallet operations

### Bitcoin Network
- Supports: regtest, testnet3, signet, mutinynet, mainnet
- Integration via arkd server's blockchain connection

### Storage Persistence
- File-based storage for wallet state
- SQL database for advanced use cases
- Custom store implementations via interface

---

## Development Commands

### Testing
```bash
# Run unit tests
make test

# Run with coverage
go test -cover ./...
```

### Code Generation
```bash
# Generate protocol buffer stubs
make proto

# Generate REST client from OpenAPI
make genrest

# Generate SQL code (for store implementations)
make sqlc
```

### Linting
```bash
# Lint code
make lint

# Format code
go fmt ./...
```

---

## Configuration Options

### InitArgs
```go
type InitArgs struct {
    ClientType          string // "grpc" or "rest"
    WalletType          string // "singlekey" (more types coming)
    ServerUrl           string // "localhost:7070"
    Seed                string // Hex-encoded private key (optional, for restore)
    Password            string // Wallet encryption password
    WithTransactionFeed bool   // Enable transaction notifications
}
```

### Store Configuration
```go
type Config struct {
    ConfigStoreType string // InMemoryStore, FileStore, or custom
    BaseDir         string // For FileStore: storage directory
}
```

---

## Advanced Usage

### Custom Transaction Building
For complex contracts or collaborative transactions:
```go
// Build transactions with ark-lib
arkTx, checkpointTxs, err := offchain.BuildTxs(inputs, outputs, closure)

// Sign with SDK
signedArkTx, err := client.SignTransaction(ctx, arkTx)

// Submit to server
arkTxid, _, signedCheckpointTxs, err := transportClient.SubmitTx(ctx, signedArkTx, checkpointTxs)

// Finalize with counter-signed checkpoints
err = transportClient.FinalizeTx(ctx, arkTxid, finalCheckpointTxs)
```

### Transaction Feed
```go
// Enable during initialization
client.Init(ctx, arksdk.InitArgs{
    // ... other args
    WithTransactionFeed: true,
})

// Listen for events
for event := range client.TransactionFeed() {
    switch event.Type {
    case "received":
        log.Printf("Received %d sats", event.Amount)
    case "spent":
        log.Printf("Spent %d sats", event.Amount)
    }
}
```

---

## Documentation Size Guidelines

To keep context lean for Claude agents:

- **usage/how-to**: ≤ 100-120 lines
- **architecture**: 400-700 words
- **API reference**: 600-1000 words
- **SOP procedures**: ≤ 120 lines

Keep files focused and cross-reference when needed.
