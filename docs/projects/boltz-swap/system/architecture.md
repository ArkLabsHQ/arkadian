# boltz-swap -- Architecture

## High-Level Architecture

```
+-------------------+     +-------------------+     +-------------------+
|   Wallet App      |     |   boltz-swap      |     |   External        |
|   (consumer)      |     |   Library         |     |   Services        |
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
| ArkadeLightning   |---->| BoltzSwapProvider |---->| Boltz API (REST)  |
| ArkadeChainSwap   |     | SwapManager       |---->| Boltz WS (stream) |
|                   |     |                   |     |                   |
|                   |     | VHTLC Scripts     |---->| arkd (via SDK)    |
|                   |     | Claim/Refund      |     | Indexer (via SDK) |
+-------------------+     +-------------------+     +-------------------+
```

## Component Breakdown

### 1. ArkadeLightning (`arkade-lightning.ts`)

Handles Lightning Network swaps (submarine and reverse):

- **sendLightningPayment()**: Creates submarine swap, sends funds to Boltz lockup address, monitors settlement
- **createLightningInvoice()**: Creates reverse swap, returns Lightning invoice for payer
- **waitAndClaim()**: Monitors reverse swap and claims VHTLC when Boltz locks funds
- **claimVHTLC()**: Constructs and submits VHTLC claim transaction (off-chain or batch)
- **refundVHTLC()**: Refunds submarine swap VHTLC when swap fails
- **restoreSwaps()**: Recovers pending swaps from Boltz API
- **enrichReverseSwapPreimage()**: Adds preimage to restored swaps for claiming
- **enrichSubmarineSwapInvoice()**: Adds invoice to restored swaps for refunding

### 2. ArkadeChainSwap (`arkade-chainswap.ts`)

Handles BTC<->ARK chain swaps:

- **arkToBtc()**: Creates chain swap from ARK to BTC, returns lockup address
- **btcToArk()**: Creates chain swap from BTC to ARK, returns BTC payment address
- **waitAndClaimBtc()**: Monitors ARK->BTC swap, claims BTC via MuSig cooperative signing
- **waitAndClaimArk()**: Monitors BTC->ARK swap, claims VHTLC on Ark
- **claimBtc()**: Builds and broadcasts BTC claim transaction with MuSig
- **claimArk()**: Builds and submits off-chain Ark claim transaction
- **refundArk()**: Refunds failed ARK->BTC swap back to Ark wallet
- **signCooperativeClaimForServer()**: Signs cooperative claim for Boltz (BTC->ARK)

### 3. BoltzSwapProvider (`boltz-swap-provider.ts`)

HTTP/WebSocket client for Boltz API v2:

- REST endpoints for creating, querying, and managing swaps
- WebSocket for real-time swap status monitoring
- Runtime type validation for all API responses (type guards)
- Network-aware URL resolution (mainnet, mutinynet, regtest)
- Status helper functions (isFinalStatus, isClaimableStatus, etc.)

### 4. SwapManager (`swap-manager.ts`)

Background swap lifecycle manager:

- WebSocket-first monitoring with automatic polling fallback
- Exponential backoff for reconnection and polling
- Auto-claim/refund when swap reaches actionable state
- Race condition prevention via per-swap locking
- Event system: onSwapUpdate, onSwapCompleted, onSwapFailed, onActionExecuted
- Per-swap subscriptions for UI components (subscribeToSwapUpdates)
- waitForSwapCompletion() for blocking callers

### 5. Utilities (`src/utils/`)

| File | Purpose |
|------|---------|
| `vhtlc.ts` | VHTLC claim/refund helpers, batch joining, off-chain TX construction |
| `signatures.ts` | X-only public key normalization, signature verification |
| `decoding.ts` | Lightning invoice decoding, Ark address validation |
| `identity.ts` | VHTLC claim identity wrapper (adds preimage witness) |
| `restoration.ts` | Extract invoice amounts and timelocks from restored swap data |
| `swap-helpers.ts` | Save/update swap status helpers |
| `polling.ts` | Polling utilities |

## Data Flow: Lightning Send (Submarine Swap)

```
1. User calls sendLightningPayment(invoice)
2. ArkadeLightning.createSubmarineSwap() -> BoltzSwapProvider -> Boltz API
3. Boltz returns lockup address + expected amount
4. wallet.sendBitcoin(address, amount) -> Sends ARK VTXO to VHTLC address
5. waitForSwapSettlement() monitors via WebSocket
6. Boltz pays Lightning invoice -> status: transaction.claimed
7. Returns preimage as proof of payment
   (If failed: refundVHTLC() reclaims the VHTLC)
```

## Data Flow: Lightning Receive (Reverse Swap)

```
1. User calls createLightningInvoice(amount)
2. ArkadeLightning.createReverseSwap() -> BoltzSwapProvider -> Boltz API
3. Boltz returns Lightning invoice + lockup address
4. External payer pays the Lightning invoice
5. Boltz locks VTXO at the VHTLC address
6. Status changes to transaction.mempool/confirmed
7. claimVHTLC() builds claim TX with preimage reveal
8. Submits off-chain TX or joins batch depending on VTXO recoverability
9. User receives ARK funds at their wallet address
```

## Data Flow: Chain Swap (ARK -> BTC)

```
1. User calls arkToBtc(btcAddress, amount)
2. Creates chain swap with ephemeral keys
3. verifyChainSwap() validates VHTLC scripts
4. Returns ARK lockup address for user to pay
5. User sends ARK to lockup -> Boltz sends BTC
6. waitAndClaimBtc() monitors swap status
7. On server confirmation: claimBtc() with MuSig cooperative signing
8. Broadcasts BTC claim transaction
```

## Security Model

- **Script Verification**: All VHTLC scripts are reconstructed locally and compared to Boltz-provided addresses ("Boltz is trying to scam us" check)
- **Preimage Security**: Random 32-byte preimages generated locally, only revealed during claim
- **X-Only Key Normalization**: All public keys validated as 32-byte x-only format
- **Ephemeral Keys**: Chain swaps use disposable keys for BTC-side signing
- **Type Guards**: Runtime validation of all Boltz API responses
