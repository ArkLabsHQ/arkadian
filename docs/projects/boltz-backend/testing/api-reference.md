# Boltz Backend — API Reference

## Base URL

**Production**: `https://api.boltz.exchange`
**Local**: `http://localhost:9001`

All endpoints return JSON responses.

## Core Endpoints

### GET /version

Get backend version and supported features.

**Response**:
```json
{
  "version": "3.13.0",
  "gitCommit": "abc123..."
}
```

### GET /getpairs

Get supported swap pairs, limits, and fees.

**Response**:
```json
{
  "pairs": {
    "BTC/BTC": {
      "hash": "...",
      "rate": 1,
      "limits": {
        "minimal": 10000,
        "maximal": 100000000
      },
      "fees": {
        "percentage": 0.1,
        "minerFees": {
          "baseAsset": 3000,
          "quoteAsset": 3000
        }
      }
    }
  }
}
```

**Key Fields**:
- `minimal`: Minimum swap amount (satoshis)
- `maximal`: Maximum swap amount (satoshis)
- `percentage`: Service fee percentage (0.1 = 0.1%)
- `minerFees`: On-chain transaction fees

### POST /createswap

Create a new submarine swap (Chain → Lightning).

**Request Body**:
```json
{
  "type": "submarine",
  "pairId": "BTC/BTC",
  "orderSide": "sell",
  "invoice": "lnbc1m1pj...",
  "refundPublicKey": "02abc123..."
}
```

**Request Fields**:
- `type`: Swap type (`submarine`, `reversesubmarine`, or `chain`)
- `pairId`: Trading pair (e.g., `BTC/BTC`, `L-BTC/BTC`)
- `orderSide`: `sell` for submarine, `buy` for reverse
- `invoice`: Lightning invoice (optional, can set later with `/setinvoice`)
- `refundPublicKey`: Public key for refund transaction
- `metadata` *(optional, PR #1423)*: client-supplied opaque blob encoded as HEX (regex `^(?:[0-9a-fA-F]{2})+$`, **2–2048 hex chars / 1–1024 bytes**). Persisted to the `swap_metadata` table keyed by swap id and returned on `/v2/swap/restore` for the same swap. Accepted on all three swap-create endpoints (`/v2/swap/submarine`, `/v2/swap/reverse`, `/v2/swap/chain`). Invalid hex or out-of-range length yields `INVALID_PARAMETER('metadata')`. Metadata can also be set or replaced after creation via `PATCH /v2/swap/{id}/metadata` (see below) — the write path is now an **upsert** (`SwapMetadataRepository.set`, PR #1455), so re-supplying metadata overwrites any previous value instead of erroring.

> **Submarine creation: `invoice` or `preimageHash`** *(clarified in swagger PR #1454)*. A Submarine Swap must be created with **either** an `invoice` **or** a `preimageHash` — the request `anyOf` requires at least one. `invoice` takes precedence over `preimageHash` when both are supplied; supplying only a `preimageHash` defers the invoice to a later `/setinvoice` (or `PATCH`) call. Because of this, several `SubmarineResponse` fields are **conditional**: only `id` is always present, while `bip21`, `acceptZeroConf`, and `expectedAmount` are set **only when the swap was created with an invoice**. A `claimAddress` field (the EVM address Boltz uses to claim the onchain HTLC) is present **only for swaps to EVM-based chains**.

**Response**:
```json
{
  "id": "swap_abc123",
  "bip21": "bitcoin:bc1q...?amount=0.01&label=Boltz",
  "address": "bc1q...",
  "redeemScript": "...",
  "acceptZeroConf": true,
  "expectedAmount": 1000000,
  "timeoutBlockHeight": 750000
}
```

**Response Fields**:
- `id`: Swap identifier (use for status queries)
- `address`: Bitcoin address to send funds
- `acceptZeroConf`: Whether 0-conf is accepted for this amount
- `expectedAmount`: Exact amount to send (satoshis)
- `timeoutBlockHeight`: Block height when swap expires

### POST /createswap (Reverse)

Create a reverse submarine swap (Lightning → Chain).

**Request Body**:
```json
{
  "type": "reversesubmarine",
  "pairId": "BTC/BTC",
  "orderSide": "buy",
  "invoiceAmount": 500000,
  "preimageHash": "abcdef123456...",
  "claimPublicKey": "03d4e5f6..."
}
```

**Request Fields**:
- `invoiceAmount`: Amount to receive on-chain (satoshis)
- `preimageHash`: SHA256 hash of 32-byte preimage
- `claimPublicKey`: Public key for claim transaction

**Response**:
```json
{
  "id": "swap_xyz789",
  "invoice": "lnbc5m1...",
  "redeemScript": "...",
  "lockupAddress": "bc1q...",
  "onchainAmount": 495000,
  "timeoutBlockHeight": 750100,
  "blindingKey": "..."
}
```

**Response Fields**:
- `invoice`: Lightning invoice to pay
- `lockupAddress`: Address where Boltz will lock funds
- `onchainAmount`: Amount Boltz will lock (after fees)
- `blindingKey`: For Liquid swaps (confidential transactions)

### GET /swapstatus

Get current status of a swap.

**Query Parameters**:
- `id`: Swap identifier

**Request**:
```bash
GET /swapstatus?id=swap_abc123
```

**Response** (Submarine):
```json
{
  "status": "transaction.confirmed",
  "zeroConfRejected": false,
  "transaction": {
    "id": "txhash...",
    "hex": "...",
    "eta": 120
  }
}
```

**Response** (Reverse):
```json
{
  "status": "transaction.mempool",
  "transaction": {
    "id": "txhash...",
    "hex": "01000000...",
    "eta": 600
  },
  "preimage": null
}
```

**Status Values**:

*Submarine Swaps*:
- `swap.created`: Initial state
- `invoice.set`: Invoice set (if not provided at creation)
- `transaction.mempool`: User sent funds (in mempool)
- `transaction.confirmed`: User funds confirmed
- `invoice.pending`: Paying Lightning invoice
- `invoice.paid`: Lightning payment successful
- `transaction.claimed`: Boltz claimed funds (final)
- `invoice.failedToPay`: Lightning payment failed (refund needed)
- `swap.expired`: Swap expired (refund needed)

*Reverse Swaps*:
- `swap.created`: Initial state
- `transaction.mempool`: Boltz lockup in mempool
- `transaction.confirmed`: Boltz lockup confirmed
- `transaction.claim.pending`: User cooperative-claim signing in progress (Taproot key path)
- `invoice.settled`: User claimed, invoice settled (final)
- `invoice.expired`: Invoice expired
- `transaction.failed`: Boltz failed to lock funds
- `transaction.refund.pending`: Cooperative-refund signing in progress
- `transaction.refunded`: Boltz refunded (user didn't claim)

> Cooperative claim/refund states (`transaction.claim.pending`, `transaction.refund.pending`) signal that
> a Taproot key-path cooperative signing flow is underway between client and server. See the official
> `docs/claiming-swaps.md` page in `boltz-backend` for the cooperative claim/refund protocol.

### POST /setinvoice

Set Lightning invoice for submarine swap (if not provided at creation).

**Request Body**:
```json
{
  "id": "swap_abc123",
  "invoice": "lnbc1m1pj..."
}
```

**Response**:
```json
{
  "status": "invoice.set"
}
```

### GET /getfeeestimation

Get estimated miner fees for current network conditions.

**Response**:
```json
{
  "BTC": {
    "1": 50,
    "2": 40,
    "6": 30
  }
}
```

**Fields**: Fee rates (sat/vB) for 1, 2, and 6 block confirmation targets.

## Advanced Endpoints

### POST /createchannel

Create Lightning channel as part of swap (channel creation swaps).

**Request Body**:
```json
{
  "type": "submarine",
  "pairId": "BTC/BTC",
  "orderSide": "sell",
  "invoice": "lnbc...",
  "channel": {
    "auto": true,
    "private": false,
    "inboundLiquidity": 25
  }
}
```

**Channel Fields**:
- `auto`: Automatically select channel parameters
- `private`: Create private channel
- `inboundLiquidity`: Percentage of inbound liquidity (0-50)

### POST /refundswap

Broadcast refund transaction for failed swap.

**Request Body**:
```json
{
  "id": "swap_abc123",
  "signature": "3045022100...",
  "index": 0
}
```

### POST /claimswap

Broadcast claim transaction for reverse swap.

**Request Body**:
```json
{
  "id": "swap_xyz789",
  "preimage": "abcdef123456...",
  "signature": "3045022100...",
  "index": 0
}
```

### POST /getpartialSignature

Get Boltz's partial signature for cooperative (Taproot key path) claim.

**Request Body**:
```json
{
  "id": "swap_xyz789",
  "preimage": "abcdef123456...",
  "pubNonce": "02abc...",
  "transaction": "01000000...",
  "index": 0
}
```

**Response**:
```json
{
  "partialSignature": "abcdef..."
}
```

### POST /v2/swap/restore

Restore (rescue) swaps when local state was lost. Search by an XPUB, a single public
key, multiple public keys, or — since PR #1434 — a single **EVM address**. Since PR #1468
the EVM-address search matches **both the claim and refund addresses** of swaps (submarine
swaps are back-filled with a `refundAddress` from their EVM lockup event), so EVM submarine
swaps are now restorable this way too. Returns full `RestorableSwap` details needed to
resume, claim, or refund.

**Request Body (EVM address variant)**:
```json
{
  "address": "0xAbC...40hex",
  "timestamp": 1750000000,
  "signature": "0x...130hex"
}
```

- `address`: EVM address (checksummed or lowercase) to match against the swap **claim and
  refund** addresses (PR #1468).
- `timestamp`: Unix seconds embedded in the signed message; must be within **60 seconds**
  of server time to limit replay.
- `signature`: EIP-191 `personal_sign` (65-byte hex) proving ownership of `address`. The
  signed message uses the EIP-55 checksummed address:
  ```
  Boltz swap restore
  address: <address>
  timestamp: <timestamp>
  ```

(The XPUB / public-key variants use the existing `RescueRequest` body.)

**Response**: array of `RestorableSwap`. Each `claimDetails` is discriminated by a `type` field:
- `type: "utxo"` → `RestoreClaimDetails`: swap `tree`, `keyIndex`, `lockupAddress`,
  `serverPublicKey`, required `timeoutBlockHeight`, `preimageHash` (the Ark
  `timeoutBlockHeights` field was removed).
- `type: "evm"` → `RestoreEvmClaimDetails`: `contractAddress` (EtherSwap/ERC20Swap),
  `claimAddress`, optional `EvmTransaction` (`{ id }`), `amount`, `timeoutBlockHeight`. Full
  lockup values can be reconstructed from the contract `Lockup` event filtered by preimage hash.

`refundDetails` is discriminated the same way by its `type` field (PR #1468):
- `type: "utxo"` → `RestoreRefundDetails`: swap `tree`, `keyIndex`, `lockupAddress`,
  `serverPublicKey`, `timeoutBlockHeight`.
- `type: "evm"` → `RestoreEvmRefundDetails`: `contractAddress`, optional `claimAddress`,
  optional `EvmTransaction`, `amount`, `timeoutBlockHeight` (amount/timeout are informational;
  the lockup tx and contract `Lockup` event are authoritative for the exact refund parameters).

The lockup `Transaction` object in restore responses now carries `id` + `vout` (output index)
instead of `id` + `hex`. Invalid/expired signatures return HTTP `400`.

### POST /v2/lightning/{currency}/bolt12/fetch

Fetch a BOLT12 invoice from an offer. As of PR #1469 the `amount` field is **optional**: when
the offer embeds an amount in the chain's native (bitcoin) unit, the server uses the offer's
amount, so clients need not decode the offer and echo its amount back. Omitting `amount` for an
offer that carries no bitcoin-denominated amount is rejected with HTTP `422`.

**Request Body**:
```json
{
  "offer": "lno1...",
  "amount": 100000,
  "note": "optional note"
}
```

- `offer` *(required)*: A BOLT12 offer.
- `amount` *(optional)*: Invoice amount in satoshis; required only if the offer does not embed a
  bitcoin-denominated amount.
- `note` *(optional)*: Note to include in the invoice request.

### PATCH /v2/swap/{id}/metadata

Set or replace the metadata stored alongside an existing swap (PR #1455). Works for **any**
swap type — the handler resolves `id` against submarine, reverse, and chain swap repositories
(`SwapRepository`, `ReverseSwapRepository`, `ChainSwapRepository`) and applies the write to
whichever one matches.

**Path Parameter**:
- `id`: ID of the swap.

**Request Body**:
```json
{
  "metadata": "0a1b2c..."
}
```

- `metadata` *(required)*: HEX-encoded opaque blob, same `MetadataHex` constraints as at
  creation (regex `^(?:[0-9a-fA-F]{2})+$`, **2–2048 hex chars / 1–1024 bytes**). It **replaces**
  any metadata previously stored for the swap (backed by `SwapMetadataRepository.set`, an
  upsert). Any body key other than `metadata` yields `INVALID_PARAMETER(<key>)`; invalid hex or
  out-of-range length yields `INVALID_PARAMETER('metadata')`.

**Responses**:
- `200`: metadata stored successfully; body is an empty object `{}`.
- `404`: no swap with the provided `id` exists (`ERR_SWAP_NOT_FOUND`).
- `400`: `ErrorResponse` for invalid parameters.

The stored metadata is returned on `/v2/swap/restore` for the same swap.

## WebSocket API

### Subscribe to Swap Updates

Connect to WebSocket for real-time swap updates:

**URL**: `wss://api.boltz.exchange/ws`

**Subscribe**:
```json
{
  "op": "subscribe",
  "channel": "swap.update",
  "args": ["swap_abc123"]
}
```

**Updates**:
```json
{
  "event": "update",
  "channel": "swap.update",
  "args": ["swap_abc123"],
  "status": "transaction.confirmed"
}
```

## Error Responses

All errors return HTTP status codes with JSON body:

```json
{
  "error": "Error message here",
  "code": "ERR_INVALID_AMOUNT"
}
```

A catch-all Express error middleware (`handleUnhandledError` in `lib/api/Api.ts`, PR #1453) guarantees a JSON error response even for errors that bypass a route handler's `try/catch` — e.g. `res.sendFile` (static file routes) rejecting a request with a bogus `Range` header asynchronously. The middleware forwards to the next handler if headers were already sent; otherwise it responds with `error.status`/`error.statusCode` (default `500`).

**Common Error Codes**:
- `ERR_INVALID_PAIR`: Invalid trading pair
- `ERR_INVALID_AMOUNT`: Amount outside limits
- `ERR_INVOICE_INVALID`: Invalid Lightning invoice
- `ERR_SWAP_NOT_FOUND`: Swap ID not found
- `ERR_SWAP_EXPIRED`: Swap has expired

## Rate Limiting

- **Public API**: 100 requests/minute per IP
- **Authenticated**: 1000 requests/minute (future feature)

## API Versions

### V2 API (Recommended)

All endpoints above are V2. Prefix with `/v2` for explicit versioning:

```bash
https://api.boltz.exchange/v2/getpairs
```

### V1 API (Legacy)

V1 API is deprecated. Use V2 for new integrations.

## Code Examples

### Create Submarine Swap (JavaScript)

```javascript
const response = await fetch('https://api.boltz.exchange/createswap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'submarine',
    pairId: 'BTC/BTC',
    orderSide: 'sell',
    invoice: 'lnbc1m1...',
    refundPublicKey: '02abc123...'
  })
});

const swap = await response.json();
console.log('Send to:', swap.address);
console.log('Amount:', swap.expectedAmount);
```

### Monitor Swap Status (Polling)

```javascript
async function waitForSwap(swapId) {
  while (true) {
    const res = await fetch(`https://api.boltz.exchange/swapstatus?id=${swapId}`);
    const status = await res.json();

    console.log('Status:', status.status);

    if (status.status === 'transaction.claimed') {
      console.log('Swap completed!');
      break;
    }

    if (status.status === 'invoice.failedToPay' || status.status === 'swap.expired') {
      console.log('Swap failed, refund needed');
      break;
    }

    await new Promise(r => setTimeout(r, 5000)); // Poll every 5s
  }
}
```

## Further Reading

- **Full API Documentation**: https://docs.boltz.exchange/v/api
- **Swap Lifecycle**: `/Users/dusansekulic/code/go/boltz-backend/docs/lifecycle.md`
- **Usage Guide**: `testing/usage.md`
- **Integration with Ark**: `system/integration-with-arkd.md`
