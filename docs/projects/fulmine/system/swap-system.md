# Fulmine Swap System

Fulmine integrates with the Boltz protocol to enable atomic swaps between Bitcoin's on-chain layer, Ark's off-chain layer, and the Lightning Network. This document explains how the swap system works and how to use it.

## Boltz Integration

### What is Boltz?

Boltz is a privacy-first, account-free exchange protocol that enables atomic swaps between different Bitcoin layers using HTLCs (Hash Time-Locked Contracts). Fulmine uses Boltz to bridge between Ark VTXOs and Lightning Network channels.

### Why Use Boltz?

Traditional exchanges require accounts, KYC, and custody of funds. Boltz swaps are:
- **Non-custodial**: You retain control of funds via cryptographic proofs
- **Atomic**: Swaps either complete fully or fail completely - no partial states
- **Private**: No accounts or personal information required
- **Fast**: Typically complete in seconds to minutes

### Boltz API Client

Fulmine's Boltz client is implemented in `pkg/boltz/` and provides:
- **HTTP client**: REST API for creating swaps and checking limits
- **WebSocket client**: Real-time swap status updates
- **Type-safe interfaces**: Structured request/response types
- **Error handling**: Graceful degradation and retry logic

Key Boltz client methods:
```go
// Create submarine swap (Ark/on-chain → Lightning)
CreateSwap(request CreateSwapRequest) (*CreateSwapResponse, error)

// Create reverse submarine swap (Lightning → Ark/on-chain)
CreateReverseSwap(request CreateReverseSwapRequest) (*CreateReverseSwapResponse, error)

// Reveal preimage to claim reverse swap
RevealPreimage(swapId, preimage string) (*RevealPreimageResponse, error)

// Refund failed submarine swap
RefundSubmarine(swapId string, request RefundSwapRequest) (*RefundSwapResponse, error)
```

## Swap Types

### Chain Swap: Ark ↔ Bitcoin On-Chain

A chain swap moves funds directly between Ark's off-chain layer and Bitcoin on-chain without Lightning.

**Directions:**
- **Ark → BTC**: Convert Ark VTXOs to on-chain Bitcoin
- **BTC → Ark**: Convert on-chain Bitcoin to Ark VTXOs

**Use cases:**
- Move funds between Ark and on-chain without Lightning
- Larger amounts that exceed Lightning channel capacity
- Users without Lightning nodes

**Status lifecycle:**
`Pending` → `UserLocked` → `ServerLocked` → `Claimed` (success)
On failure: `Failed` / `UserLockedFailed` → `Refunded` / `RefundedUnilaterally`

Chain swaps support automatic recovery on restart - interrupted swaps resume from their last known state.

**API endpoints:**
- `POST /v1/chainswap` - Create chain swap
- `GET /v1/chainswaps` - List chain swaps
- `POST /v1/chainswap/{id}/refund` - Refund chain swap

### Submarine Swap: Ark/On-Chain → Lightning

A submarine swap moves funds from Ark's off-chain layer (or Bitcoin on-chain) to a Lightning Network channel.

**Use cases:**
- Add inbound Lightning capacity
- Pay Lightning invoices using Ark funds
- Convert off-chain VTXOs to Lightning liquidity

**Flow:**
1. User provides Lightning invoice (BOLT11 or BOLT12)
2. Fulmine extracts payment hash from invoice
3. Create VHTLC (Virtual HTLC) on Ark with payment hash
4. Send funds to VHTLC address
5. Boltz detects VHTLC funding
6. Boltz pays Lightning invoice
7. Boltz reveals preimage to claim VHTLC
8. Swap completes - funds arrive on Lightning

**Timeout and refunds:**
If Boltz fails to pay the invoice:
- Cooperative refund with Boltz participation
- Unilateral refund after timeout without Boltz

### Reverse Submarine Swap: Lightning → Ark/On-Chain

A reverse submarine swap moves funds from Lightning Network to Ark's off-chain layer (or Bitcoin on-chain).

**Use cases:**
- Drain Lightning channels to free up capacity
- Convert Lightning balance to Ark VTXOs
- Accept Lightning payments into Ark wallet

**Flow:**
1. User specifies amount to receive
2. Fulmine generates random preimage and hash
3. Create reverse swap with Boltz using preimage hash
4. Boltz creates VHTLC and provides Lightning invoice
5. Fulmine returns invoice to user
6. User (or their app) pays Lightning invoice
7. Boltz detects payment and funds VHTLC
8. Fulmine claims VHTLC with preimage
9. Funds arrive as Ark VTXOs

**Timeout and refunds:**
If VHTLC is not claimed within timeout:
- Boltz can reclaim funds
- User loses the invoice payment

## Swap Package Implementation

The swap coordination logic is in `pkg/swap/swap.go`. The `SwapHandler` manages the entire lifecycle.

### SwapHandler Structure

```go
type SwapHandler struct {
    arkClient       arksdk.ArkClient      // Ark protocol operations
    transportClient client.TransportClient // Ark transaction submission
    indexerClient   indexer.Indexer       // Query VTXOs
    boltzSvc        *boltz.Api            // Boltz API client
    publicKey       *btcec.PublicKey      // User's public key
    timeout         uint32                // Swap timeout in seconds
}
```

### Key Methods

#### PayInvoice (Submarine Swap)
```go
func (h *SwapHandler) PayInvoice(ctx context.Context, invoice string,
    unilateralRefund func(swap Swap) error) (Swap, error)
```

Pays a BOLT11 Lightning invoice using Ark funds:
1. Decodes invoice to extract preimage hash
2. Creates swap with Boltz
3. Generates VHTLC with payment hash
4. Sends funds to VHTLC address on Ark
5. Monitors swap status via WebSocket
6. Returns swap details

The `unilateralRefund` callback is triggered if the swap fails and cooperative refund fails.

#### PayOffer (BOLT12 Submarine Swap)
```go
func (h *SwapHandler) PayOffer(ctx context.Context, offer string,
    lightningUrl string, unilateralRefund func(swap Swap) error) (Swap, error)
```

Pays a BOLT12 offer (modern Lightning invoice format):
1. Decodes offer to get amount
2. Fetches BOLT11 invoice from Boltz
3. Proceeds with submarine swap flow

#### GetInvoice (Reverse Submarine Swap)
```go
func (h *SwapHandler) GetInvoice(ctx context.Context, amount uint64,
    postProcess func(swap Swap) error) (Swap, error)
```

Generates Lightning invoice to receive funds into Ark:
1. Generates random 32-byte preimage
2. Creates reverse swap with Boltz
3. Returns invoice for user to pay
4. Monitors VHTLC funding via WebSocket
5. Claims VHTLC with preimage when funded
6. Calls `postProcess` callback on completion

### Swap State Machine

Swaps progress through states:

```go
const (
    SwapPending SwapStatus = iota
    SwapFailed
    SwapSuccess
)
```

State transitions are driven by Boltz events:
- `TransactionMempool`: VHTLC detected on-chain
- `TransactionLockupFailed`: Funding failed
- `InvoiceFailedToPay`: Lightning payment failed
- `InvoiceSettled`: Lightning payment successful
- `TransactionClaimed`: VHTLC claimed

### Swap Structure

```go
type Swap struct {
    Id           string                    // Boltz swap ID
    Invoice      string                    // Lightning invoice
    TxId         string                    // Ark transaction ID
    Timestamp    int64                     // Creation timestamp
    RedeemTxid   string                    // Redeem/refund transaction ID
    Status       SwapStatus                // Current status
    PreimageHash []byte                    // Payment hash
    TimeoutInfo  boltz.TimeoutBlockHeights // Timeout configuration
    Opts         *vhtlc.Opts               // VHTLC parameters
    Amount       uint64                    // Amount in satoshis
}
```

## VHTLC Integration

Swaps use Virtual HTLCs (VHTLCs) to enable atomic swaps within the Ark protocol. See [vhtlc.md](./vhtlc.md) for detailed VHTLC documentation.

### VHTLC Creation for Swaps

For submarine swaps, Fulmine creates a VHTLC with:
- **Receiver**: Boltz's public key (claim path)
- **Sender**: User's public key (refund path)
- **Server**: Ark server's public key (required for all paths)
- **Preimage hash**: From Lightning invoice
- **Timeouts**: Defined by Boltz

For reverse swaps:
- **Receiver**: User's public key (claim path)
- **Sender**: Boltz's public key (refund path)
- **Preimage hash**: Generated by Fulmine

### Verification

Before funding a VHTLC, Fulmine verifies:
1. VHTLC address from Boltz matches computed address
2. Preimage hash matches invoice
3. Invoice amount matches swap amount
4. Timeouts are acceptable

This prevents Boltz from attempting to scam users with mismatched VHTLCs.

## Error Handling and Refunds

### Submarine Swap Failures

If a submarine swap fails (invoice doesn't pay):

**Cooperative refund:**
1. Detect failure via WebSocket status update
2. Create refund transaction spending VHTLC
3. Request Boltz signature via `RefundSubmarine` API
4. Submit refund transaction to Ark
5. Funds return to user's wallet

**Unilateral refund:**
If Boltz is unavailable:
1. Wait for `RefundLocktime` to pass
2. Spend VHTLC via `RefundWithoutReceiverClosure`
3. Only requires user + server signatures
4. Submit unilateral refund transaction

### Reverse Swap Failures

If a reverse swap fails (VHTLC not claimed):
1. Boltz can reclaim VHTLC after timeout
2. User should not pay Lightning invoice if swap fails
3. Monitor swap status before payment

## Configuration

### Environment Variables

```bash
# Boltz backend URL
FULMINE_BOLTZ_URL=https://boltz.example.com

# Boltz WebSocket URL for events
FULMINE_BOLTZ_WS_URL=wss://boltz.example.com/ws

# Swap timeout in seconds (default: 120)
FULMINE_SWAP_TIMEOUT=180
```

### Default Boltz Instance

If `FULMINE_BOLTZ_URL` is not set, Fulmine uses a default Boltz instance for the configured network (mainnet, testnet, signet).

### Custom Boltz Backend

To run your own Boltz backend:
1. Clone https://github.com/BoltzExchange/boltz-backend
2. Configure for your network
3. Point Fulmine to your instance via environment variables

See `docs/swaps.regtest.md` in the Fulmine repository for a complete regtest setup.

## Usage Examples

### API: Submarine Swap

```bash
# Pay Lightning invoice using Ark funds
curl -X POST http://localhost:7001/api/v1/swap/submarine \
  -H "Content-Type: application/json" \
  -d '{
    "invoice": "lnbc1..."
  }'
```

### API: Reverse Submarine Swap

```bash
# Get Lightning invoice to receive funds
curl -X POST http://localhost:7001/api/v1/swap/reverse \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100000
  }'

# Response includes invoice
{
  "swap_id": "abc123",
  "invoice": "lnbc1...",
  "expires_at": 1234567890
}
```

### Web UI

1. Navigate to Send page
2. Select "Lightning" payment type
3. Paste Lightning invoice
4. Click "Send"
5. Monitor swap progress on Swap page

## Swap Limits

Boltz enforces minimum and maximum swap amounts to maintain liquidity and prevent dust. Fulmine checks limits before creating swaps:

```bash
# Get current swap limits
curl http://localhost:7001/api/v1/swap/limits
```

Typical limits:
- **Minimum**: 1,000 satoshis
- **Maximum**: 10,000,000 satoshis (0.1 BTC)

Limits vary by network and Boltz instance.

## Monitoring Swaps

### WebSocket Events

Boltz sends real-time status updates:
- `swap.created`: Swap initiated
- `transaction.mempool`: VHTLC detected
- `invoice.settled`: Lightning payment complete
- `transaction.claimed`: VHTLC claimed
- `swap.error`: Swap failed

Fulmine automatically subscribes to updates for active swaps.

### Database Persistence

All swaps are persisted to the database:
- **Active swaps**: Status `SwapPending`
- **Completed swaps**: Status `SwapSuccess`
- **Failed swaps**: Status `SwapFailed`

Query swap history via API:
```bash
curl http://localhost:7001/api/v1/swaps
```

## Performance Considerations

### Submarine Swap Duration
Typical flow: 10-30 seconds
- 5s: VHTLC creation and funding
- 5-15s: Boltz pays Lightning invoice
- 5-10s: VHTLC claim and settlement

### Reverse Swap Duration
Typical flow: 10-60 seconds
- Instant: Invoice generation
- 5-30s: User pays invoice (depends on Lightning routing)
- 5-20s: Boltz funds VHTLC
- 5-10s: Fulmine claims VHTLC

### Timeout Configuration

The `FULMINE_SWAP_TIMEOUT` setting controls WebSocket monitoring duration. If set too low, swaps may appear to fail even if they're still processing. Default of 120 seconds is appropriate for most networks.

## Security Considerations

1. **Preimage security**: Preimages are generated using `crypto/rand` for cryptographic security
2. **VHTLC verification**: All VHTLC parameters are validated before funding
3. **Timeout enforcement**: Refunds are only possible after agreed timeouts
4. **Atomic guarantees**: HTLCs ensure funds are never lost - either swap completes or refunds

## Troubleshooting

### Swap appears stuck
Check Boltz status via WebSocket or REST API. May need to wait for timeouts to trigger refund.

### Refund not working
Ensure timeout has passed. Try unilateral refund via `/api/v1/vhtlc/refundWithoutReceiver`.

### Invoice payment failing
Verify Lightning node has sufficient liquidity and routing path. Check invoice hasn't expired.

### VHTLC not detected
Confirm transaction was submitted to Ark. Check Ark server logs. Verify VHTLC address matches.

For more details on VHTLC mechanics and refund processes, see [vhtlc.md](./vhtlc.md).
