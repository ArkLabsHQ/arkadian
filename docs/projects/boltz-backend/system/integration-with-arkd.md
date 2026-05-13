# Boltz Backend — Integration with Ark Ecosystem

## Overview

Boltz Backend integrates with the Ark protocol ecosystem through **Fulmine**, enabling Ark users to access Lightning Network liquidity via trustless atomic swaps. This integration creates a powerful liquidity bridge between Ark's off-chain VTXOs, Lightning Network channels, and on-chain Bitcoin.

## Integration Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Ark Ecosystem                          │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────┐         ┌────────────┐                   │
│  │   arkd     │◄────────┤  Fulmine   │                   │
│  │  (Server)  │  VTXOs  │  (Wallet)  │                   │
│  └────────────┘         └─────┬──────┘                   │
│                               │                            │
│                               │ Boltz API Client          │
│                               ▼                            │
│                    ┌────────────────────┐                 │
│                    │  Boltz Backend API │                 │
│                    │  (Swap Service)    │                 │
│                    └─────────┬──────────┘                 │
│                              │                             │
└──────────────────────────────┼─────────────────────────────┘
                               │
                               ▼
                  ┌───────────────────────┐
                  │  Lightning Network    │
                  │  (LND/CLN Nodes)      │
                  └───────────────────────┘
```

## How Fulmine Uses Boltz Backend

### Current Integration (via Fulmine)

Fulmine integrates boltz-backend to provide Lightning swap functionality:

1. **Submarine Swaps** (Ark VTXOs → Lightning)
   - User initiates swap in Fulmine wallet
   - Fulmine redeems Ark VTXOs to on-chain Bitcoin
   - Fulmine calls Boltz API to create submarine swap
   - User sends on-chain Bitcoin to Boltz lockup address
   - Boltz pays Lightning invoice
   - User receives Lightning capacity

2. **Reverse Submarine Swaps** (Lightning → Ark VTXOs)
   - User initiates reverse swap in Fulmine
   - Fulmine calls Boltz API with preimage hash
   - Boltz creates hold invoice
   - User pays hold invoice via Lightning
   - Boltz locks Bitcoin on-chain
   - User claims on-chain Bitcoin
   - Fulmine boards on-chain Bitcoin into Ark (creates VTXOs)

### Integration Points

**Fulmine's Boltz Client** (`/Users/dusansekulic/code/go/boltz-backend` integration):
- Location: `${FULMINE_REPO}/internal/infrastructure/boltz-client/`
- API Calls: `createswap`, `swapstatus`, `getpairs`
- Swap Monitoring: WebSocket or polling for swap state updates
- Configuration: `FULMINE_BOLTZ_URL`, `FULMINE_BOLTZ_WS_URL`

**Boltz Backend → Fulmine (Ark RPC client)** (`lib/chain/ArkClient.ts`, `lib/chain/ArkSubscription.ts`, `lib/swap/ArkNursery.ts`):
- `ListVHTLCs`: vHTLC discovery on startup
- `GetVHTLCSpendingTx`: fetch the fully signed claim Ark transaction for a spent vHTLC (works for both finalized and pending spending txs). `ArkNursery` looks up the matching reverse/chain swap by spent-outpoint `(txid, vout)`, then calls this RPC with the swap's reconstructed `vhtlcId` to extract the preimage — replacing the prior pattern of scanning every preimage in any spending tx.
- Periodic vHTLC rescan: interval set by Ark currency config (`rescanInterval`, seconds, default `300`); a manual rescan is also reachable through the existing chain-rescan service path now that it supports Ark currencies.

See `${ARKADIAN_DIR}/docs/projects/fulmine/INDEX.md` for Fulmine implementation details.

## Use Cases for Ark Users

### 1. Lightning Liquidity Access
**Problem**: Ark users have off-chain VTXOs but need Lightning capacity.

**Solution**:
- Redeem Ark VTXOs to on-chain Bitcoin
- Submarine swap (Chain → Lightning) via Boltz
- Receive Lightning liquidity

**Flow**:
```
Ark VTXOs → On-chain (Redeem) → Boltz Submarine Swap → Lightning
```

**Example**:
```bash
# User has 1M sats in Ark VTXOs
# Wants 1M sats of Lightning capacity

1. Fulmine: Redeem 1M sats from arkd to on-chain address
2. Fulmine: Call Boltz API to create submarine swap
3. Fulmine: Send on-chain Bitcoin to Boltz lockup address
4. Boltz: Pay Lightning invoice for 990K sats (minus fees)
5. User: Receive Lightning capacity in wallet
```

### 2. Lightning to Ark Conversion
**Problem**: User has Lightning balance but wants Ark VTXOs for faster off-chain payments.

**Solution**:
- Reverse submarine swap (Lightning → Chain) via Boltz
- Board on-chain Bitcoin into Ark
- Receive Ark VTXOs

**Flow**:
```
Lightning → Boltz Reverse Swap → On-chain → Board into Ark → VTXOs
```

**Example**:
```bash
# User has 500K sats in Lightning
# Wants to convert to Ark VTXOs

1. Fulmine: Call Boltz API to create reverse swap
2. Fulmine: Pay Boltz hold invoice via Lightning
3. Boltz: Lock Bitcoin on-chain
4. Fulmine: Claim on-chain Bitcoin with preimage
5. Fulmine: Board on-chain Bitcoin into arkd
6. arkd: Create VTXOs for user
```

### 3. Cross-Network Payment Routing
**Problem**: User wants to pay Lightning invoice but only has Ark balance.

**Solution**:
- Combine Ark redemption + submarine swap in single flow
- Seamless payment from Ark to Lightning

**Flow**:
```
Ark VTXOs → Redeem → Submarine Swap → Lightning Payment
```

### 4. Exit Strategy Diversity
**Problem**: User wants to exit Ark but Lightning is preferable to on-chain.

**Solution**:
- Use reverse swap as intermediate step
- Exit Ark → On-chain → Lightning

**Benefit**: Lightning offers more flexibility than on-chain for spending.

## Potential Direct arkd Integration

While current integration is via Fulmine, there are potential patterns for direct arkd integration:

### Pattern 1: arkd Plugin/Extension
arkd could expose a plugin interface for swap providers:
- Plugin implements swap interface (create, monitor, claim/refund)
- Boltz backend client as arkd plugin
- Users access swaps directly from arkd CLI/API

### Pattern 2: arkd Liquidity Management
arkd could use Boltz swaps for operator liquidity:
- Operator needs on-chain funds for exits
- Submarine swap: Lightning → On-chain via Boltz
- Automated liquidity rebalancing

### Pattern 3: VHTLC + Lightning Routing
Combine Ark VHTLCs with Lightning HTLCs via Boltz:
- User creates VHTLC in Ark
- Boltz converts VHTLC to Lightning HTLC
- Atomic swap between Ark and Lightning

**Note**: These patterns are theoretical and not currently implemented.

## Configuration

### Fulmine Configuration for Boltz

Environment variables in Fulmine:
```bash
# Boltz backend URL
FULMINE_BOLTZ_URL="https://api.boltz.exchange"

# Boltz WebSocket URL (for real-time swap updates)
FULMINE_BOLTZ_WS_URL="wss://api.boltz.exchange/ws"
```

### Self-Hosted Boltz Backend

For privacy or custom requirements, Ark operators can run their own Boltz instance:

```bash
# Clone boltz-backend
git clone https://github.com/BoltzExchange/boltz-backend.git
cd boltz-backend

# Configure for Ark integration
# Edit config.toml to set:
# - Bitcoin node connection
# - Lightning node connection (LND/CLN)
# - Database (PostgreSQL)

# Run backend
npm run compile
npm run start

# Point Fulmine to self-hosted instance
FULMINE_BOLTZ_URL="https://your-boltz-instance.com"
```

## Security Considerations

### Trust Model
- **No trust required**: Boltz swaps are atomic (HTLC-based)
- **Ark redemption**: User redeems VTXOs collaboratively with arkd
- **Boltz swap**: User executes swap with Boltz (trustless)
- **Worst case**: Swap fails, user refunds Bitcoin after timeout

### Privacy
- **Boltz knows**: Swap amounts, Bitcoin addresses, Lightning invoices
- **Boltz doesn't know**: Connection between Ark VTXOs and swap
- **Recommendation**: Use Tor/VPN when calling Boltz API from Fulmine

### Fees
- **arkd fees**: Round participation, redemption fees
- **Boltz fees**: Service fee (typically 0.1-0.5%) + miner fees
- **Total cost**: arkd fees + Boltz fees + on-chain transaction fees

## Benefits for Ark Ecosystem

### Liquidity Bridge
- Connects Ark off-chain VTXOs with Lightning Network
- Enables seamless movement between payment layers
- Reduces friction for users

### User Experience
- Single wallet (Fulmine) for Ark + Lightning + On-chain
- Automatic swap execution
- No manual channel management

### Ecosystem Growth
- Attracts Lightning users to Ark
- Attracts Ark users to Lightning
- Cross-pollination of ecosystems

### Operator Benefits
- Liquidity management tool for arkd operators
- Rebalance between on-chain and Lightning
- Optimize capital efficiency

## API Examples

### Create Submarine Swap (Chain → Lightning)

```bash
curl -X POST https://api.boltz.exchange/createswap \
  -H "Content-Type: application/json" \
  -d '{
    "type": "submarine",
    "pairId": "BTC/BTC",
    "orderSide": "sell",
    "invoice": "lnbc1m1...",
    "refundPublicKey": "02a1b2c3..."
  }'

# Response:
{
  "id": "swap_abc123",
  "address": "bc1q...",
  "expectedAmount": 1000000,
  "timeoutBlockHeight": 750000
}
```

### Create Reverse Swap (Lightning → Chain)

```bash
curl -X POST https://api.boltz.exchange/createswap \
  -H "Content-Type: application/json" \
  -d '{
    "type": "reversesubmarine",
    "pairId": "BTC/BTC",
    "orderSide": "buy",
    "invoiceAmount": 500000,
    "preimageHash": "abcdef...",
    "claimPublicKey": "03d4e5f6..."
  }'

# Response:
{
  "id": "swap_xyz789",
  "invoice": "lnbc5m1...",
  "lockupAddress": "bc1q...",
  "timeoutBlockHeight": 750100
}
```

### Check Swap Status

```bash
curl https://api.boltz.exchange/swapstatus?id=swap_abc123

# Response:
{
  "status": "transaction.confirmed",
  "transaction": {
    "id": "tx_hash...",
    "hex": "...",
    "eta": 120
  }
}
```

## Code References

### Fulmine Integration
- Boltz client implementation: `${FULMINE_REPO}/internal/infrastructure/boltz-client/`
- Swap operations: `${FULMINE_REPO}/pkg/swap/`
- VHTLC implementation: `${FULMINE_REPO}/pkg/vhtlc/`

### Boltz Backend
- API server: `/Users/dusansekulic/code/go/boltz-backend/lib/api/`
- Swap service: `/Users/dusansekulic/code/go/boltz-backend/lib/service/`
- Lightning integration: `/Users/dusansekulic/code/go/boltz-backend/lib/lightning/`

## Further Reading

- **Fulmine Documentation**: `${ARKADIAN_DIR}/docs/projects/fulmine/INDEX.md`
- **Ark Protocol**: `${ARKADIAN_DIR}/docs/projects/arkd/INDEX.md`
- **Boltz API Docs**: https://docs.boltz.exchange/v/api
- **Submarine Swaps**: https://docs.boltz.exchange/v/api/lifecycle
