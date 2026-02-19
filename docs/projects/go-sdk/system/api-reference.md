# Go SDK - API Reference

## ArkClient Interface

The `ArkClient` is the main interface for interacting with the Ark protocol. All operations require an initialized client.

### Client Lifecycle

#### Init

Initialize a new wallet with configuration.

```go
func (client ArkClient) Init(ctx context.Context, args InitArgs) error
```

**InitArgs Configuration:**

```go
type InitArgs struct {
    ClientType           string        // "grpc" (REST removed in v0.9+)
    WalletType           string        // "singlekey" (HD wallet coming soon)
    ServerUrl            string        // arkd server address (e.g., "localhost:7070")
    Seed                 string        // (optional) hex-encoded private key for restore
    Password             string        // wallet encryption password
    ExplorerURL          string        // (optional) custom Esplora endpoint
    ExplorerPollInterval time.Duration // (optional) polling interval
    WithTransactionFeed  bool          // enable real-time transaction events
}
```

**Example:**

```go
err := client.Init(ctx, arksdk.InitArgs{
    WalletType:          arksdk.SingleKeyWallet,
    ClientType:          arksdk.GrpcClient,
    ServerUrl:           "localhost:7070",
    Password:            "secure_password",
    WithTransactionFeed: true,
})
```

#### Load

Load an existing wallet from storage.

```go
func (client ArkClient) Load(ctx context.Context) error
```

Used when wallet was previously initialized. No arguments needed.

#### Unlock

Unlock the wallet for operations.

```go
func (client ArkClient) Unlock(ctx context.Context, password string) error
```

**Example:**

```go
if err := client.Unlock(ctx, "secure_password"); err != nil {
    log.Fatal("failed to unlock:", err)
}
defer client.Lock(ctx)
```

#### Lock

Lock the wallet, clearing sensitive data from memory.

```go
func (client ArkClient) Lock(ctx context.Context) error
```

Always lock when done to protect keys in memory.

## Wallet Operations

### Receive

Get addresses for receiving funds.

```go
func (client ArkClient) Receive(ctx context.Context) (
    onchainAddr, offchainAddr, boardingAddr string, err error
)
```

**Returns:**
- `onchainAddr`: Standard Bitcoin address (not actively monitored)
- `offchainAddr`: Ark offchain address for instant payments
- `boardingAddr`: Onboarding address for moving onchain funds to offchain

**Example:**

```go
onchain, offchain, boarding, err := client.Receive(ctx)
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Send offchain payments to: %s\n", offchain)
fmt.Printf("Onboard funds at: %s\n", boarding)
```

### Balance

Query current wallet balance.

```go
func (client ArkClient) Balance(
    ctx context.Context, computeExpiryDetails bool
) (*Balance, error)
```

**Balance Structure:**

```go
type Balance struct {
    OnchainBalance  OnchainBalance
    OffchainBalance OffchainBalance
}

type OnchainBalance struct {
    SpendableAmount uint64                 // immediately spendable sats
    LockedAmount    []LockedOnchainBalance // time-locked funds
}

type OffchainBalance struct {
    Total          uint64        // total offchain sats
    NextExpiration string        // timestamp of next VTXO expiry
    Details        []VtxoDetails // breakdown by expiry time
}
```

**Example:**

```go
balance, err := client.Balance(ctx, true)
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Offchain: %d sats\n", balance.OffchainBalance.Total)
fmt.Printf("Onchain: %d sats\n", balance.OnchainBalance.SpendableAmount)

if balance.OffchainBalance.NextExpiration != "" {
    fmt.Printf("Next expiry: %s\n", balance.OffchainBalance.NextExpiration)
}
```

### SendOffChain

Send offchain payment to one or more recipients.

```go
func (client ArkClient) SendOffChain(
    ctx context.Context,
    withExpiryCoinselect bool,
    receivers []types.Receiver
) (string, error)
```

**Parameters:**
- `withExpiryCoinselect`: If true, prioritize VTXOs closest to expiry
- `receivers`: List of payment destinations

**Receiver Structure:**

```go
type Receiver struct {
    To     string // offchain address
    Amount uint64 // satoshis
}
```

**Example:**

```go
receivers := []types.Receiver{
    {To: recipientAddr1, Amount: 1000},
    {To: recipientAddr2, Amount: 2000},
}

txid, err := client.SendOffChain(ctx, false, receivers)
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Payment sent: %s\n", txid)
```

### SendOnchain

Send onchain Bitcoin transaction.

```go
func (client ArkClient) SendOnchain(
    ctx context.Context,
    receivers []types.Receiver
) (string, error)
```

Similar to `SendOffChain` but creates an onchain Bitcoin transaction.

## Transaction Operations

### SignTransaction

Sign a raw transaction with wallet keys.

```go
func (client ArkClient) SignTransaction(
    ctx context.Context, tx string
) (string, error)
```

Used for advanced transaction building workflows.

**Example:**

```go
signedTx, err := client.SignTransaction(ctx, unsignedTxHex)
if err != nil {
    log.Fatal(err)
}
```

### SubmitTx (via TransportClient)

Submit a signed transaction to the arkd server.

```go
func (transportClient TransportClient) SubmitTx(
    ctx context.Context,
    signedArkTx string,
    checkpointTxs []string
) (arkTxid, finalArkTx string, signedCheckpointTxs []string, err error)
```

**Returns:**
- `arkTxid`: Transaction ID
- `finalArkTx`: Server-signed transaction
- `signedCheckpointTxs`: Checkpoint transactions to counter-sign

**Example:**

```go
arkTxid, finalTx, checkpoints, err := transportClient.SubmitTx(
    ctx, signedArkTx, checkpointTxs,
)
```

### FinalizeTx (via TransportClient)

Finalize transaction by submitting counter-signed checkpoint transactions.

```go
func (transportClient TransportClient) FinalizeTx(
    ctx context.Context,
    arkTxid string,
    finalCheckpointTxs []string
) error
```

**Complete Flow:**

```go
// 1. Build and sign transaction
signedTx, _ := client.SignTransaction(ctx, arkTx)

// 2. Submit to server
arkTxid, _, serverCheckpoints, _ := transportClient.SubmitTx(
    ctx, signedTx, clientCheckpoints,
)

// 3. Counter-sign checkpoints
finalCheckpoints := make([]string, len(serverCheckpoints))
for i, cp := range serverCheckpoints {
    finalCheckpoints[i], _ = client.SignTransaction(ctx, cp)
}

// 4. Finalize
transportClient.FinalizeTx(ctx, arkTxid, finalCheckpoints)
```

### EstimateIntentFee

Estimate the fees for a given intent before submitting.

```go
func (client ArkClient) EstimateIntentFee(
    ctx context.Context,
    intent Intent,
) (int64, error)
```

Returns the estimated fee in satoshis. Fees are automatically handled during coin selection in `SendOffChain` and `CollaborativeExit`.

### FinalizePendingTxs

Finalize all pending transactions that haven't been counter-signed yet.

```go
func (client ArkClient) FinalizePendingTxs(ctx context.Context) error
```

Also available with auto-finalization support — pending transactions are automatically finalized when detected.

## Exit Operations

### CollaborativeExit

Redeem offchain funds to an onchain Bitcoin address (cooperative with server).

```go
func (client ArkClient) CollaborativeExit(
    ctx context.Context,
    addr string,
    amount uint64,
    withExpiryCoinselect bool,
    opts ...Option
) (string, error)
```

**Parameters:**
- `addr`: Bitcoin address to receive funds
- `amount`: Satoshis to redeem
- `withExpiryCoinselect`: Prioritize expiring VTXOs
- `opts`: Optional parameters including `WithExpiryThreshold(duration)` to set minimum VTXO expiry

**Example:**

```go
txid, err := client.CollaborativeExit(
    ctx,
    "bc1q...",  // onchain address
    50000,      // 50,000 sats
    false,
    arksdk.WithExpiryThreshold(24 * time.Hour), // only use VTXOs expiring after 24h
)
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Redeemed in tx: %s\n", txid)
```

### Unroll

Begin unilateral exit process (non-cooperative).

```go
func (client ArkClient) Unroll(ctx context.Context) error
```

Broadcasts unroll transaction to Bitcoin network. Requires waiting for timelock.

### CompleteUnroll

Complete unilateral exit after timelock expires.

```go
func (client ArkClient) CompleteUnroll(
    ctx context.Context, to string
) (string, error)
```

**Example:**

```go
// Start unilateral exit
if err := client.Unroll(ctx); err != nil {
    log.Fatal(err)
}

// Wait for timelock...
time.Sleep(24 * time.Hour)

// Complete exit
txid, err := client.CompleteUnroll(ctx, "bc1q...")
```

## Data Queries

### ListVtxos

List all VTXOs (Virtual Transaction Outputs).

```go
func (client ArkClient) ListVtxos(ctx context.Context) (
    spendable, spent []types.Vtxo, err error
)
```

**Returns:**
- `spendable`: Currently spendable offchain coins
- `spent`: Previously spent VTXOs

### ListSpendableVtxos

List only spendable VTXOs (more efficient than ListVtxos when spent VTXOs are not needed).

```go
func (client ArkClient) ListSpendableVtxos(ctx context.Context) ([]types.Vtxo, error)
```

**Returns:**
- Currently spendable offchain coins only

**Example:**

```go
vtxos, err := client.ListSpendableVtxos(ctx)
if err != nil {
    log.Fatal(err)
}
for _, vtxo := range vtxos {
    fmt.Printf("VTXO: %s amount=%d\n", vtxo.Outpoint, vtxo.Amount)
}
```

### GetTransactionHistory

Get complete transaction history.

```go
func (client ArkClient) GetTransactionHistory(
    ctx context.Context
) ([]types.Transaction, error)
```

Returns all onchain and offchain transactions.

### Dump

Export wallet seed for backup.

```go
func (client ArkClient) Dump(ctx context.Context) (seed string, err error)
```

**Warning:** Keep seed secure. Anyone with seed can access funds.

## Event Channels

### GetTransactionEventChannel

Subscribe to real-time transaction events.

```go
func (client ArkClient) GetTransactionEventChannel(
    ctx context.Context
) <-chan types.TransactionEvent
```

**Example:**

```go
txChan := client.GetTransactionEventChannel(ctx)
go func() {
    for event := range txChan {
        for _, tx := range event.Txs {
            fmt.Printf("Transaction %s: %d sats (%s)\n",
                tx.TransactionKey, tx.Amount, tx.Type)
        }
    }
}()
```

### GetVtxoEventChannel

Subscribe to VTXO state change events.

```go
func (client ArkClient) GetVtxoEventChannel(
    ctx context.Context
) <-chan types.VtxoEvent
```

### GetUtxoEventChannel

Subscribe to onchain UTXO events.

```go
func (client ArkClient) GetUtxoEventChannel(
    ctx context.Context
) <-chan types.UtxoEvent
```

## Helper Functions

### NewBitcoinReceiver

Convenience function for creating receiver structs.

```go
func NewBitcoinReceiver(address string, amount uint64) types.Receiver
```

**Example:**

```go
receivers := []types.Receiver{
    arksdk.NewBitcoinReceiver(addr1, 1000),
    arksdk.NewBitcoinReceiver(addr2, 2000),
}
```

## Options

### WithExpiryThreshold

Set minimum expiry threshold for VTXO selection in `Settle` and `CollaborativeExit`.

```go
func WithExpiryThreshold(threshold time.Duration) Option
```

VTXOs expiring before the threshold will not be selected for coin selection.

### OptOutExpirySorting

Opt out of automatic expiry-based VTXO sorting in coin selection.

```go
func OptOutExpirySorting() Option
```

## Deprecations

### tx.Settled **[DEPRECATED]**
The `Settled` field on transaction types is deprecated. Use transaction status fields instead.
