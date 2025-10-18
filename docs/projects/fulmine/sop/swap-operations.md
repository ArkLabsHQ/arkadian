# Swap Operations

## Overview
Trustless atomic swaps via Boltz using HTLCs:
- **Submarine**: On-chain → Lightning
- **Reverse**: Lightning → On-chain

## Submarine Swap (On-chain → Lightning)

**Process:**
1. Check on-chain balance (min 1,000 sats)
2. Initiate swap via UI/API
3. Send to HTLC address
4. Wait 1-3 confirmations
5. Receive Lightning payment
6. Complete

**Web UI:**
1. http://localhost:7001/swaps → "New Submarine Swap"
2. Enter amount, review fees
3. Confirm and monitor

**API:**
```bash
curl -X POST http://localhost:7001/api/v1/swap/submarine \
     -d '{"amount": 10000}'
```

## Reverse Swap (Lightning → On-chain)

**Process:**
1. Check Lightning balance (min 1,000 sats + fees)
2. Initiate reverse swap with destination address
3. Pay Lightning invoice automatically
4. Boltz broadcasts on-chain tx
5. Wait 1-6 confirmations
6. Complete

**Web UI:**
1. http://localhost:7001/swaps → "New Reverse Submarine Swap"
2. Enter amount + Bitcoin address
3. Confirm and monitor

**API:**
```bash
curl -X POST http://localhost:7001/api/v1/swap/reverse \
     -d '{"amount": 10000, "address": "bcrt1q..."}'
```

## Parameters

**Limits:** Min 1,000 sats, max depends on Boltz liquidity
**Timeouts:** Submarine 24h, Reverse 1-3h
**Fees:** Network + service (0.1-1%) + routing

## Monitoring

**UI:** Transactions → Filter swaps → Click for details
**API:** `curl https://boltz.example.com/swap/status/<swap_id>`

## Failures

**Timeout:** Auto-refund (submarine) or payment fails (reverse)
**Network:** May delay but completes or refunds
**Insufficient funds:** Add funds and retry
**Common:** Low liquidity, congestion, invalid params, routing failures

**Logs:** `docker logs fulmine` or `$FULMINE_DATADIR/logs/`

## Testing on Regtest

See `docs/swaps.regtest.md` for full setup:
1. `nigiri start --ln`
2. Setup arkd, Boltz, LND
3. Fund wallets, open channels
4. Test with small amounts

**Quick test:**
```bash
curl -X POST http://localhost:7001/api/v1/swap/submarine -d '{"amount": 10000}'
curl -X POST http://localhost:7001/api/v1/swap/reverse -d '{"amount": 10000, "address": "bcrt1q..."}'
```

## Custom Boltz
```bash
export FULMINE_BOLTZ_URL="https://boltz.example.com"
export FULMINE_BOLTZ_WS_URL="wss://boltz.example.com/ws"
```

## Best Practices
- Test with min amounts first
- Monitor status throughout
- Keep balance for fees
- Backup IDs
- Check liquidity before large swaps

## Troubleshooting
- Stuck: Check Boltz API
- High fees: Wait for lower network fees
- Routing fail: Ensure node well-connected
- Unavailable: Verify FULMINE_BOLTZ_URL
