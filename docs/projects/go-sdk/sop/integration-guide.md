# SDK Integration Guide

This guide covers integrating the Arkade Go SDK into existing applications and services.

## Prerequisites

### Running arkd Server

The SDK requires a running arkd server. Choose your deployment:

**Local Development (Regtest):**
```bash
# Start Bitcoin regtest with nigiri
nigiri start

# Start arkd in dev mode
cd arkd
make run-light
```

**Testnet:**
```bash
# Point to testnet arkd instance
export ARKD_URL="testnet.ark.example.com:7070"
```

**Production:**
```bash
# Use production arkd endpoint
export ARKD_URL="ark.example.com:7070"
```

Verify arkd is running:
```bash
# gRPC health check
grpcurl -plaintext localhost:7070 ark.v1.ArkService/GetInfo

# Or via REST
curl http://localhost:7070/v1/info
```

## Client Configuration

### gRPC vs REST Selection

**gRPC (Recommended):**
- Better performance (binary protocol)
- Streaming support for transaction feeds
- Type-safe with protobuf
- Lower latency

```go
import arksdk "github.com/arkade-os/go-sdk"

client, err := arksdk.NewArkClient(storeSvc)
client.Init(ctx, arksdk.InitArgs{
    ClientType: arksdk.GrpcClient,  // Use gRPC
    ServerUrl:  "localhost:7070",
})
```

**REST:**
- Easier debugging (HTTP tools)
- Firewall-friendly (port 80/443)
- No protobuf dependencies

```go
client.Init(ctx, arksdk.InitArgs{
    ClientType: arksdk.RestClient,   // Use REST
    ServerUrl:  "http://localhost:7070",
})
```

### Connection Pooling

The SDK manages connections internally. For high-concurrency scenarios:

```go
import (
    "google.golang.org/grpc"
    "google.golang.org/grpc/keepalive"
)

// Custom gRPC dial options (advanced)
var kacp = keepalive.ClientParameters{
    Time:                10 * time.Second,
    Timeout:             3 * time.Second,
    PermitWithoutStream: true,
}

// SDK handles this internally, but you can customize if needed
opts := []grpc.DialOption{
    grpc.WithKeepaliveParams(kacp),
    grpc.WithDefaultCallOptions(grpc.MaxCallRecvMsgSize(10 * 1024 * 1024)),
}
```

### Timeouts and Retries

Set context timeouts for operations:

```go
func SendWithTimeout(client arksdk.ArkClient, receivers []arksdk.Receiver) error {
    // 30-second timeout for send operations
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    txid, err := client.SendOffchain(ctx, false, receivers)
    if err != nil {
        if errors.Is(err, context.DeadlineExceeded) {
            return errors.New("operation timed out - arkd may be unreachable")
        }
        return err
    }

    return nil
}
```

**Retry Logic:**

```go
func SendWithRetry(client arksdk.ArkClient, receivers []arksdk.Receiver) (string, error) {
    maxRetries := 3
    backoff := time.Second

    for i := 0; i < maxRetries; i++ {
        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        txid, err := client.SendOffchain(ctx, false, receivers)
        cancel()

        if err == nil {
            return txid, nil
        }

        // Don't retry for certain errors
        if strings.Contains(err.Error(), "insufficient balance") {
            return "", err
        }

        if i < maxRetries-1 {
            time.Sleep(backoff)
            backoff *= 2 // Exponential backoff
        }
    }

    return "", errors.New("max retries exceeded")
}
```

## Wallet Lifecycle Management

### Init vs Load Pattern

**Init:** First-time wallet creation or restoration from seed

```go
func CreateNewWallet(storeSvc types.Store, password string) (arksdk.ArkClient, error) {
    client, err := arksdk.NewArkClient(storeSvc)
    if err != nil {
        return nil, err
    }

    // Init creates new wallet (generates seed)
    if err := client.Init(ctx, arksdk.InitArgs{
        WalletType:          arksdk.SingleKeyWallet,
        ClientType:          arksdk.GrpcClient,
        ServerUrl:           "localhost:7070",
        Password:            password,
        WithTransactionFeed: true,
    }); err != nil {
        return nil, err
    }

    return client, nil
}
```

**Load:** Subsequent application starts with existing wallet

```go
func LoadExistingWallet(storeSvc types.Store) (arksdk.ArkClient, error) {
    client, err := arksdk.NewArkClient(storeSvc)
    if err != nil {
        return nil, err
    }

    // Client automatically loads existing wallet state
    // No Init() call needed if wallet already exists

    return client, nil
}
```

### Lock/Unlock Patterns

**Pattern 1: Explicit Lock/Unlock**

```go
func ExecuteTransaction(client arksdk.ArkClient, password string) error {
    // Unlock for operation
    if err := client.Unlock(ctx, password); err != nil {
        return errors.New("invalid password")
    }

    // Always lock after operation
    defer client.Lock(ctx)

    // Perform operations
    return client.SendOffchain(ctx, false, receivers)
}
```

**Pattern 2: Auto-Lock Helper**

```go
func WithUnlockedWallet(client arksdk.ArkClient, password string, fn func() error) error {
    if err := client.Unlock(ctx, password); err != nil {
        return fmt.Errorf("unlock failed: %w", err)
    }
    defer client.Lock(ctx)

    return fn()
}

// Usage
err := WithUnlockedWallet(client, password, func() error {
    return client.SendOffchain(ctx, false, receivers)
})
```

### Session Management

For web applications with multiple concurrent users:

```go
type WalletSession struct {
    client    arksdk.ArkClient
    unlocked  bool
    expiresAt time.Time
    mu        sync.RWMutex
}

func (s *WalletSession) IsUnlocked() bool {
    s.mu.RLock()
    defer s.mu.RUnlock()
    return s.unlocked && time.Now().Before(s.expiresAt)
}

func (s *WalletSession) Unlock(password string, duration time.Duration) error {
    if err := s.client.Unlock(context.Background(), password); err != nil {
        return err
    }

    s.mu.Lock()
    s.unlocked = true
    s.expiresAt = time.Now().Add(duration)
    s.mu.Unlock()

    // Auto-lock after duration
    time.AfterFunc(duration, func() {
        s.client.Lock(context.Background())
        s.mu.Lock()
        s.unlocked = false
        s.mu.Unlock()
    })

    return nil
}
```

## Transaction Submission Patterns

### Simple SendOffchain

Best for straightforward sends:

```go
func SimpleSend(client arksdk.ArkClient, toAddr string, amount uint64) (string, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    receivers := []arksdk.Receiver{
        arksdk.NewBitcoinReceiver(toAddr, amount),
    }

    return client.SendOffchain(ctx, false, receivers)
}
```

### Advanced SubmitTx + FinalizeTx

For complex contracts or collaborative transactions:

```go
import (
    grpcclient "github.com/arkade-os/go-sdk/client/grpc"
    "github.com/arkade-os/arkd/pkg/ark-lib/tree/offchain"
)

func ComplexTransaction(client arksdk.ArkClient, inputs []offchain.VtxoInput, outputs []*wire.TxOut) (string, error) {
    // Step 1: Build ark and checkpoint transactions
    arkTx, checkpointTxs, err := offchain.BuildTxs(
        inputs,
        outputs,
        batchOutputSweepClosure,
    )
    if err != nil {
        return "", err
    }

    // Step 2: Sign ark transaction
    signedArkTx, err := client.SignTransaction(ctx, arkTx)
    if err != nil {
        return "", err
    }

    // Step 3: Submit to server
    transportClient, _ := grpcclient.NewClient("localhost:7070")
    arkTxid, _, signedCheckpointTxs, err := transportClient.SubmitTx(ctx, signedArkTx, checkpointTxs)
    if err != nil {
        return "", err
    }

    // Step 4: Counter-sign checkpoint transactions
    finalCheckpointTxs := make([]string, 0, len(signedCheckpointTxs))
    for _, checkpointTx := range signedCheckpointTxs {
        finalCheckpointTx, err := client.SignTransaction(ctx, checkpointTx)
        if err != nil {
            return "", err
        }
        finalCheckpointTxs = append(finalCheckpointTxs, finalCheckpointTx)
    }

    // Step 5: Finalize transaction
    if err := transportClient.FinalizeTx(ctx, arkTxid, finalCheckpointTxs); err != nil {
        return "", err
    }

    return arkTxid, nil
}
```

### Custom Transaction Building with ark-lib

For maximum control, use ark-lib directly:

```go
import (
    arklib "github.com/arkade-os/arkd/pkg/ark-lib"
    "github.com/btcsuite/btcd/wire"
)

func BuildCustomTransaction(client arksdk.ArkClient) error {
    // Get VTXOs to spend
    balance, _ := client.Balance(ctx, false)
    vtxos := balance.OffchainBalance.Vtxos

    // Build inputs
    var inputs []offchain.VtxoInput
    for _, vtxo := range vtxos {
        inputs = append(inputs, offchain.VtxoInput{
            Outpoint: vtxo.Outpoint,
            Amount:   vtxo.Amount,
        })
    }

    // Build outputs
    outputs := []*wire.TxOut{
        {
            Value:    1000,
            PkScript: recipientScript,
        },
    }

    // Use ComplexTransaction pattern above
    return nil
}
```

## Event Handling

### Transaction Feed Setup

Monitor incoming and outgoing transactions:

```go
func MonitorTransactions(client arksdk.ArkClient) {
    // Enable transaction feed during Init
    client.Init(ctx, arksdk.InitArgs{
        WithTransactionFeed: true,
        // ... other params
    })

    // Get event channel
    txsChan := client.GetTransactionEventChannel(context.Background())

    // Process events
    go func() {
        for txEvent := range txsChan {
            for _, tx := range txEvent.Txs {
                ProcessTransaction(tx)
            }
        }
    }()
}

func ProcessTransaction(tx types.Transaction) {
    switch tx.Type {
    case "received":
        log.Printf("Received %d sats in tx %s", tx.Amount, tx.TransactionKey)
        NotifyUser("Payment received", tx.Amount)

    case "sent":
        log.Printf("Sent %d sats in tx %s", tx.Amount, tx.TransactionKey)
        UpdateBalance()

    case "boarding":
        log.Printf("Boarding completed in tx %s", tx.TransactionKey)

    case "redemption":
        log.Printf("Redemption completed in tx %s", tx.TransactionKey)
    }
}
```

### Processing Notifications

Integrate with application notification system:

```go
type NotificationService struct {
    client arksdk.ArkClient
    userID string
}

func (n *NotificationService) Start() {
    txsChan := n.client.GetTransactionEventChannel(context.Background())

    go func() {
        for txEvent := range txsChan {
            for _, tx := range txEvent.Txs {
                if tx.Type == "received" {
                    n.sendPushNotification(tx)
                    n.updateDatabase(tx)
                }
            }
        }
    }()
}
```

### State Synchronization

Keep UI in sync with blockchain state:

```go
func SyncWalletState(client arksdk.ArkClient) {
    ticker := time.NewTicker(10 * time.Second)
    defer ticker.Stop()

    for range ticker.C {
        balance, err := client.Balance(ctx, false)
        if err != nil {
            log.Errorf("Balance sync failed: %v", err)
            continue
        }

        UpdateUI(balance)
    }
}
```

## Error Handling and Recovery

### Common Error Patterns

```go
func HandleSDKError(err error) error {
    if err == nil {
        return nil
    }

    switch {
    case strings.Contains(err.Error(), "insufficient balance"):
        return errors.New("insufficient funds - please add more balance")

    case strings.Contains(err.Error(), "locked"):
        return errors.New("wallet is locked - authentication required")

    case strings.Contains(err.Error(), "connection refused"):
        return errors.New("cannot reach arkd server - check network")

    case strings.Contains(err.Error(), "deadline exceeded"):
        return errors.New("operation timed out - please retry")

    case strings.Contains(err.Error(), "invalid password"):
        return errors.New("incorrect password")

    default:
        return fmt.Errorf("operation failed: %w", err)
    }
}
```

### Recovery Strategies

```go
func RobustOperation(client arksdk.ArkClient, operation func() error) error {
    maxRetries := 3

    for attempt := 0; attempt < maxRetries; attempt++ {
        err := operation()

        if err == nil {
            return nil
        }

        // Check if error is recoverable
        if isRecoverable(err) {
            log.Warnf("Attempt %d failed: %v, retrying...", attempt+1, err)
            time.Sleep(time.Second * time.Duration(attempt+1))
            continue
        }

        // Non-recoverable error
        return err
    }

    return errors.New("operation failed after max retries")
}

func isRecoverable(err error) bool {
    recoverable := []string{
        "connection refused",
        "deadline exceeded",
        "temporary failure",
    }

    errStr := err.Error()
    for _, keyword := range recoverable {
        if strings.Contains(errStr, keyword) {
            return true
        }
    }
    return false
}
```

## Testing Integrations

### Mock arkd for Unit Tests

```go
type MockArkClient struct {
    arksdk.ArkClient
    balance types.Balance
    txid    string
}

func (m *MockArkClient) Balance(ctx context.Context, computeExpiryDetails bool) (*types.Balance, error) {
    return &m.balance, nil
}

func (m *MockArkClient) SendOffchain(ctx context.Context, withExpiryCoinselect bool, receivers []arksdk.Receiver) (string, error) {
    return m.txid, nil
}

func TestPaymentFlow(t *testing.T) {
    mockClient := &MockArkClient{
        balance: types.Balance{
            OffchainBalance: types.OffchainBalance{Total: 100000},
        },
        txid: "abc123",
    }

    txid, err := SimpleSend(mockClient, "addr", 1000)
    assert.NoError(t, err)
    assert.Equal(t, "abc123", txid)
}
```

### Integration Tests with Regtest

```go
func TestE2EFlow(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping integration test")
    }

    // Requires running arkd on regtest
    storeSvc, _ := store.NewStore(store.Config{
        ConfigStoreType: types.InMemoryStore,
    })

    client, _ := arksdk.NewArkClient(storeSvc)
    client.Init(context.Background(), arksdk.InitArgs{
        WalletType: arksdk.SingleKeyWallet,
        ClientType: arksdk.GrpcClient,
        ServerUrl:  "localhost:7070",
        Password:   "test",
    })

    // Fund wallet
    _, boardingAddr, _, _ := client.Receive(ctx)
    fundTestAddress(t, boardingAddr, 100000)

    // Test operations
    balance, _ := client.Balance(ctx, false)
    assert.Greater(t, balance.OnchainBalance.SpendableAmount, uint64(0))
}
```

## Production Checklist

- [ ] Configure appropriate timeouts (30s for sends, 60s for settlements)
- [ ] Implement retry logic with exponential backoff
- [ ] Handle all error cases with user-friendly messages
- [ ] Enable transaction feed for real-time updates
- [ ] Lock wallet by default, unlock only for operations
- [ ] Use gRPC for better performance
- [ ] Monitor arkd health with periodic health checks
- [ ] Log errors (but never passwords or seeds)
- [ ] Implement graceful shutdown (client.Stop())
- [ ] Test with regtest before production deployment
