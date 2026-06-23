# Complete Flow: Arkade Wallet User Pays Lightning Invoice via Submarine Swaps

## Executive Summary

When an Arkade wallet user pays a Lightning invoice, the system performs a **submarine swap** - converting off-chain Ark VTXOs (Virtual Transaction Outputs) into a Lightning payment. This process involves creating a Virtual HTLC (Hash Time-Locked Contract) on Ark, coordinating with Boltz swap service, and atomically exchanging value between Ark and Lightning Network.

**Key Components:**
- **Arkade Wallet**: React PWA using @arkade-os/sdk
- **Fulmine**: Ark wallet daemon (go-based) with swap capabilities
- **Boltz Backend**: Swap coordinator service
- **Arkd**: Ark server managing VTXOs and rounds
- **Lightning Node**: User's connected LN node for receiving payment

> **Wallet UX — optimistic send + live settlement tracking (PR #668):** as of PR #668 the wallet no longer blocks the send UI until Boltz claims the HTLC (steps 9–14 below). `payInvoice` (`src/providers/swaps.tsx`) resolves as soon as the swap is **funded** — the lockup tx is observed and funds are committed/refundable — via the SDK's `waitForSwapFunded` (replacing `waitForSwapSettlement`), returning only `{ txid }` (the preimage is no longer surfaced to the UI). The user lands on the success screen immediately, where `Send/Success.tsx` shows a live `processing → completed / failed / refunded` status (`deriveLnSendStatus`, driven by `hasSubmarineStatusReached('invoice.paid')` / `isSubmarineFailedStatus` over the persisted swap in `SwapsContext`). The SDK keeps monitoring in the background, so the `SwapsList` history row still transitions Pending → Successful/Refunded via the SwapManager subscription, and a post-funding failure surfaces as "Payment failed" before the auto-refund. The blocking sequence below still describes the underlying swap mechanics; only the wallet's resolution point moved earlier (from "invoice.settled" to "swap funded").

---

## 1. HIGH-LEVEL USER JOURNEY DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER PAYMENT JOURNEY                                 │
└─────────────────────────────────────────────────────────────────────────────┘

User Action                 Wallet UI              Backend Processing
───────────                ──────────              ──────────────────

1. Paste LN Invoice
   lnbc50k...              ┌──────────┐
   └──────────────────────>│  Input   │
                           │Validation│
                           └────┬─────┘
                                │
2. Review Payment               ▼
                           ┌──────────┐
   Amount: 50,000 sats    │ Decode   │──> Payment Hash: abc123...
   Fee: ~1-3%             │ Invoice  │    Amount: 50000 sats
   [Confirm Payment]      └────┬─────┘    Expiry: 1 hour
                                │
3. Confirm                      ▼
   Click ──────────────>  ┌──────────┐
                          │ Create   │──> API: PayInvoice(invoice)
                          │  Swap    │
                          └────┬─────┘
                               │
4. Processing...               ▼
                          ┌──────────┐
   [Progress Bar]        │ VHTLC    │──> Create conditional payment
   Funding VHTLC...      │ Creation │    Lock VTXOs with preimage
                         └────┬─────┘
                              │
5. Wait for Settlement        ▼
                          ┌──────────┐
   [Spinner]             │  Watch   │──> Monitor swap status
   Payment in progress   │ Boltz WS │    via WebSocket
                         └────┬─────┘
                              │
                              ├──> Success ────┐
                              │                 │
                              └──> Failed ──────┤
                                                 ▼
6. Result                                  ┌──────────┐
                                          │ Update   │
   ✓ Payment Successful!                 │   UI     │
   TxID: abc123...                       └──────────┘
   -50,000 sats

   OR

   ✗ Payment Failed
   Refund processed
   [Retry]

Duration: ~30-120 seconds total
```

---

## 2. DETAILED SEQUENCE DIAGRAM - COMPLETE FLOW

```
┌────────┐    ┌────────┐    ┌─────────┐    ┌────────┐    ┌──────┐    ┌────┐
│ Wallet │    │Fulmine │    │  Boltz  │    │  Arkd  │    │ LN   │    │Rcpt│
│  UI    │    │Service │    │ Backend │    │ Server │    │ Node │    │Node│
└───┬────┘    └───┬────┘    └────┬────┘    └───┬────┘    └──┬───┘    └─┬──┘
    │             │              │              │            │          │
    │                                                                    │
    ├─────────────────────────────────────────────────────────────────> │
    │  1. Receive Lightning Invoice (lnbc50k...)                        │
    │<──────────────────────────────────────────────────────────────────┤
    │                                                                    │
    │  2. User pastes invoice & confirms                                │
    │─────────────>│                                                    │
    │ PayInvoice() │                                                    │
    │              │                                                    │
    │              │  3. Decode invoice to extract payment hash        │
    │              │─────┐                                              │
    │              │     │ DecodeInvoice(invoice)                      │
    │              │<────┘ → preimageHash = SHA256(preimage)           │
    │              │       → amount = 50000 sats                       │
    │              │                                                    │
    │              │  4. Create submarine swap with Boltz              │
    │              │─────────────────>│                                │
    │              │ POST /v2/swap/   │                                │
    │              │   submarine       │                                │
    │              │ {                │                                │
    │              │   from: "ARK",   │                                │
    │              │   to: "BTC",     │                                │
    │              │   invoice: "...", │                               │
    │              │   refundPubkey   │                                │
    │              │ }                │                                │
    │              │                  │                                │
    │              │<─────────────────│                                │
    │              │ {                │                                │
    │              │   id: "swap123", │                                │
    │              │   address: "ark1...", (VHTLC addr)                │
    │              │   expectedAmount,│                                │
    │              │   claimPubkey,   │                                │
    │              │   timeouts       │                                │
    │              │ }                │                                │
    │              │                  │                                │
    │              │  5. Verify VHTLC address matches expected         │
    │              │─────┐            │                                │
    │              │     │ getVHTLC(receiverPubkey, preimageHash)     │
    │              │<────┘ Compute local VHTLC taproot address         │
    │              │       Compare with Boltz address                  │
    │              │       ✓ Addresses match (security check)          │
    │              │                  │                                │
    │              │  6. Connect to Boltz WebSocket                    │
    │              │─────────────────>│                                │
    │              │ WS CONNECT       │                                │
    │              │ /v2/ws           │                                │
    │              │                  │                                │
    │              │<─────────────────│                                │
    │              │ WS CONNECTED     │                                │
    │              │                  │                                │
    │              │─────────────────>│                                │
    │              │ {op: "subscribe",│                                │
    │              │  channel:        │                                │
    │              │   "swap.update", │                                │
    │              │  args: ["swap123"]│                               │
    │              │ }                │                                │
    │              │                  │                                │
    │              │<─────────────────│                                │
    │              │ {event: "subscribe"}                              │
    │              │                  │                                │
    │              │  7. Fund VHTLC with off-chain Ark payment         │
    │              │──────────────────────────────>│                   │
    │              │ SendOffChain(                 │                   │
    │              │   to: "ark1...", (VHTLC)     │                   │
    │              │   amount: 50000               │                   │
    │              │ )                             │                   │
    │              │                               │                   │
    │              │                               │  Queue payment in │
    │              │                               │  next round       │
    │              │                               │                   │
    │              │<──────────────────────────────│                   │
    │              │ arkTxid: "vtxo123"            │                   │
    │              │                               │                   │
    │              │  8. Wait for round finalization                   │
    │              │                               │                   │
    │              │                               │  Round starts     │
    │              │                               │  (every ~5s)      │
    │              │                               │                   │
    │              │                               │  Create VTXO tree │
    │              │                               │  Sign round tx    │
    │              │                               │  Finalize         │
    │              │                               │                   │
    │              │  9. Boltz detects VTXO funding                    │
    │              │                  │<───────────│                   │
    │              │                  │ Monitor     │                  │
    │              │                  │ Indexer API │                  │
    │              │                  │             │                  │
    │              │<─────────────────│             │                  │
    │              │ WS UPDATE:       │             │                  │
    │              │ {status:         │             │                  │
    │              │  "transaction.   │             │                  │
    │              │   mempool"}      │             │                  │
    │              │                  │             │                  │
    │              │                  │ 10. Boltz pays Lightning invoice
    │              │                  │─────────────────────────────────>│
    │              │                  │   PayInvoice(lnbc50k...)       │
    │              │                  │                                │
    │              │                  │                         Find   │
    │              │                  │                         route  │
    │              │                  │                                │
    │              │                  │<────────────────────────────────│
    │              │                  │   Route found                  │
    │              │                  │                                │
    │              │                  │─────────────────────────────────>│
    │              │                  │   HTLC: 50k sats, hash, timeout │
    │              │                  │                                │
    │              │                  │                                │
    │              │                  │             ╔══════════════════╗│
    │              │                  │             ║ Multi-hop HTLC   ║│
    │              │                  │             ║ forwarding across║│
    │              │                  │             ║ Lightning Network║│
    │              │                  │             ╚══════════════════╝│
    │              │                  │                                │
    │              │                  │                             ┌──▼─┐
    │              │                  │                             │Rcpt│
    │              │                  │                             │Node│
    │              │                  │                  Verify     └──┬─┘
    │              │                  │                  invoice       │
    │              │                  │                  amount        │
    │              │                  │                             ┌──▼─┐
    │              │                  │                             │Rcpt│
    │              │                  │                             │Node│
    │              │                  │<────────────────────────────┴────┘
    │              │                  │   Preimage revealed!            │
    │              │                  │   (proves payment successful)   │
    │              │                  │                                │
    │              │                  │  11. Boltz claims VHTLC        │
    │              │                  │──────────────>│                │
    │              │                  │ SubmitTx(     │                │
    │              │                  │   claimTx +   │                │
    │              │                  │   preimage    │                │
    │              │                  │ )             │                │
    │              │                  │               │  Verify:       │
    │              │                  │               │  - Preimage OK │
    │              │                  │               │  - Signatures  │
    │              │                  │               │                │
    │              │                  │<──────────────│                │
    │              │                  │ Success       │                │
    │              │                  │               │                │
    │              │  12. Boltz notifies completion via WebSocket      │
    │              │<─────────────────│               │                │
    │              │ WS UPDATE:       │               │                │
    │              │ {status:         │               │                │
    │              │  "invoice.       │               │                │
    │              │   settled"}      │               │                │
    │              │                  │               │                │
    │              │  13. Update swap status to SUCCESS               │
    │              │─────┐            │               │                │
    │              │     │ Save to DB │               │                │
    │              │<────┘ Status: SwapSuccess        │                │
    │              │       RedeemTxid: ...            │                │
    │              │                  │               │                │
    │<─────────────│                  │               │                │
    │ {            │                  │               │                │
    │   txid: "vtxo123",              │               │                │
    │   status: "success"             │               │                │
    │ }            │                  │               │                │
    │              │                  │               │                │
    │  14. Display success to user    │               │                │
    │─────┐        │                  │               │                │
    │     │ UI     │                  │               │                │
    │<────┘ Update │                  │               │                │
    │ ✓ Payment    │                  │               │                │
    │   Successful!│                  │               │                │
    │              │                  │               │                │
    ▼              ▼                  ▼               ▼                ▼

TIMING BREAKDOWN:
- Steps 1-7: ~2-5 seconds (invoice decode, swap creation, VHTLC funding)
- Step 8: ~5-10 seconds (wait for Ark round finalization)
- Steps 9-11: ~5-20 seconds (Boltz detects funding, pays invoice, claims VHTLC)
- Steps 12-14: ~1-2 seconds (notification and UI update)
TOTAL: ~15-40 seconds typical
```

---

## 3. VHTLC (VIRTUAL HTLC) STRUCTURE - DETAILED

A VHTLC is a specialized Ark VTXO with conditional spending paths that enable atomic swaps.

### VHTLC Taproot Tree Structure

```
                           ┌─────────────────────────────┐
                           │   VHTLC Taproot Output      │
                           │   (Taproot Key = Internal   │
                           │    Key + Merkle Root)       │
                           └──────────────┬──────────────┘
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    │         Tapscript Tree (6 leaves)          │
                    └─────────────────────┬─────────────────────┘
                                          │
        ┌─────────────────────────────────┼─────────────────────────────────┐
        │                                 │                                 │
┌───────▼────────┐              ┌─────────▼──────────┐          ┌──────────▼─────────┐
│ COLLABORATIVE  │              │   COLLABORATIVE    │          │   COLLABORATIVE    │
│  CLAIM PATH    │              │   REFUND PATH      │          │ REFUND W/O RECEIVER│
│                │              │                    │          │                    │
│ Receiver +     │              │ Sender + Receiver  │          │  Sender + Server   │
│  Server        │              │  + Server          │          │                    │
│                │              │                    │          │  After refund      │
│ IF preimage    │              │ (no timelock)      │          │  locktime          │
│  revealed      │              │                    │          │                    │
└────────────────┘              └────────────────────┘          └────────────────────┘

        │                                 │                                 │
┌───────▼────────┐              ┌─────────▼──────────┐          ┌──────────▼─────────┐
│  UNILATERAL    │              │   UNILATERAL       │          │   UNILATERAL       │
│  CLAIM PATH    │              │   REFUND PATH      │          │ REFUND W/O RECEIVER│
│                │              │                    │          │                    │
│ Receiver only  │              │ Sender + Receiver  │          │  Sender only       │
│                │              │                    │          │                    │
│ IF preimage    │              │ After CSV timeout  │          │  After CSV timeout │
│  revealed      │              │  (1024 blocks)     │          │  (2048 blocks)     │
│                │              │                    │          │                    │
│ After CSV      │              │                    │          │                    │
│  timeout       │              │                    │          │                    │
│  (512 blocks)  │              │                    │          │                    │
└────────────────┘              └────────────────────┘          └────────────────────┘

SPENDING CONDITIONS EXPLAINED:

1. COLLABORATIVE CLAIM (Fastest - preferred path)
   - Participants: Receiver + Server (2-of-2 multisig)
   - Condition: Preimage must be revealed
   - Timelock: None
   - Use case: Normal successful swap (Boltz claims with preimage)
   - Script: OP_HASH160 <preimageHash> OP_EQUAL <ReceiverKey> <ServerKey> OP_2 OP_CHECKMULTISIG

2. COLLABORATIVE REFUND (Fast cooperative refund)
   - Participants: Sender + Receiver + Server (3-of-3 multisig)
   - Condition: None (mutual agreement)
   - Timelock: None
   - Use case: Swap failed, all parties agree to refund
   - Script: <SenderKey> <ReceiverKey> <ServerKey> OP_3 OP_CHECKMULTISIG

3. COLLABORATIVE REFUND WITHOUT RECEIVER (Fallback refund)
   - Participants: Sender + Server (2-of-2 multisig)
   - Condition: Absolute locktime (24 hours)
   - Timelock: CLTV (CheckLockTimeVerify)
   - Use case: Receiver disappeared, sender gets refund after timeout
   - Script: <RefundLocktime> OP_CHECKLOCKTIMEVERIFY OP_DROP <SenderKey> <ServerKey> OP_2 OP_CHECKMULTISIG

4. UNILATERAL CLAIM (Exit without cooperation)
   - Participants: Receiver only (1-of-1)
   - Condition: Preimage must be revealed
   - Timelock: CSV 512 (relative timelock ~512 seconds)
   - Use case: Receiver has preimage but can't get server signature
   - Script: <UnilateralClaimDelay> OP_CHECKSEQUENCEVERIFY OP_DROP OP_HASH160 <preimageHash> OP_EQUAL <ReceiverKey> OP_CHECKSIG

5. UNILATERAL REFUND (Exit without receiver cooperation)
   - Participants: Sender + Receiver (2-of-2 multisig)
   - Condition: None
   - Timelock: CSV 1024 (relative ~1024 seconds)
   - Use case: Swap timeout, parties refund without server
   - Script: <UnilateralRefundDelay> OP_CHECKSEQUENCEVERIFY OP_DROP <SenderKey> <ReceiverKey> OP_2 OP_CHECKMULTISIG

6. UNILATERAL REFUND WITHOUT RECEIVER (Ultimate fallback)
   - Participants: Sender only (1-of-1)
   - Condition: None
   - Timelock: CSV 2048 (relative ~2048 seconds)
   - Use case: Everyone disappeared, sender eventually gets funds back
   - Script: <UnilateralRefundWithoutReceiverDelay> OP_CHECKSEQUENCEVERIFY OP_DROP <SenderKey> OP_CHECKSIG
```

### VHTLC Code Implementation

**File: `/Users/dusansekulic/code/go/fulmine/pkg/vhtlc/vhtlc.go:20-143`**

```go
type Opts struct {
    Sender                               *btcec.PublicKey
    Receiver                             *btcec.PublicKey
    Server                               *btcec.PublicKey
    PreimageHash                         []byte // 20 bytes (RIPEMD160 of SHA256 of preimage)
    RefundLocktime                       arklib.AbsoluteLocktime
    UnilateralClaimDelay                 arklib.RelativeLocktime    // 512 seconds
    UnilateralRefundDelay                arklib.RelativeLocktime    // 1024 seconds
    UnilateralRefundWithoutReceiverDelay arklib.RelativeLocktime    // 2048 seconds
}

// Claim path: Receiver + Server with preimage
func (o Opts) claimClosure(preimageCondition []byte) *script.ConditionMultisigClosure {
    return &script.ConditionMultisigClosure{
        Condition: preimageCondition, // OP_HASH160 <hash> OP_EQUAL
        MultisigClosure: script.MultisigClosure{
            PubKeys: []*btcec.PublicKey{o.Receiver, o.Server},
        },
    }
}

// Refund path: Sender + Receiver + Server
func (o Opts) refundClosure() *script.MultisigClosure {
    return &script.MultisigClosure{
        PubKeys: []*btcec.PublicKey{o.Sender, o.Receiver, o.Server},
    }
}

// Refund without receiver: Sender + Server after CLTV timeout
func (o Opts) refundWithoutReceiverClosure() *script.CLTVMultisigClosure {
    return &script.CLTVMultisigClosure{
        MultisigClosure: script.MultisigClosure{
            PubKeys: []*btcec.PublicKey{o.Sender, o.Server},
        },
        Locktime: o.RefundLocktime, // Absolute locktime (e.g., 24 hours from now)
    }
}

// Unilateral claim: Receiver only with preimage after CSV delay
func (o Opts) unilateralClaimClosure(preimageCondition []byte) *script.ConditionCSVMultisigClosure {
    return &script.ConditionCSVMultisigClosure{
        CSVMultisigClosure: script.CSVMultisigClosure{
            MultisigClosure: script.MultisigClosure{
                PubKeys: []*btcec.PublicKey{o.Receiver},
            },
            Locktime: o.UnilateralClaimDelay, // 512 seconds
        },
        Condition: preimageCondition,
    }
}

// Unilateral refund: Sender + Receiver after CSV delay
func (o Opts) unilateralRefundClosure() *script.CSVMultisigClosure {
    return &script.CSVMultisigClosure{
        MultisigClosure: script.MultisigClosure{
            PubKeys: []*btcec.PublicKey{o.Sender, o.Receiver},
        },
        Locktime: o.UnilateralRefundDelay, // 1024 seconds
    }
}

// Unilateral refund without receiver: Sender only after CSV delay
func (o Opts) unilateralRefundWithoutReceiverClosure() *script.CSVMultisigClosure {
    return &script.CSVMultisigClosure{
        MultisigClosure: script.MultisigClosure{
            PubKeys: []*btcec.PublicKey{o.Sender},
        },
        Locktime: o.UnilateralRefundWithoutReceiverDelay, // 2048 seconds
    }
}
```

---

## 4. SUBMARINE SWAP STATE MACHINE

```
┌────────────────────────────────────────────────────────────────────┐
│                    SUBMARINE SWAP STATE MACHINE                     │
└────────────────────────────────────────────────────────────────────┘

                              ┌──────────┐
                              │  START   │
                              └─────┬────┘
                                    │
                                    │ User pastes invoice
                                    ▼
                              ┌──────────┐
                              │ INVOICE  │
                              │ DECODED  │
                              └─────┬────┘
                                    │
                                    │ PayInvoice() called
                                    ▼
                              ┌──────────┐
                              │  SWAP    │
                              │ CREATED  │ ◄─────┐ Retry on error
                              └─────┬────┘       │
                                    │            │
                                    │ Boltz API call
                                    ▼            │
                              ┌──────────┐       │
                              │  VHTLC   │       │
                              │ VERIFIED │       │
                              └─────┬────┘       │
                                    │            │
                                    │ Address matches
                                    ▼            │
                              ┌──────────┐       │
                              │ WEBSOCKET│       │
                              │CONNECTED │       │
                              └─────┬────┘       │
                                    │            │
                                    │ WS subscribed to swap ID
                                    ▼            │
                              ┌──────────┐       │
                              │  VHTLC   │       │
                              │  FUNDED  │       │
                              └─────┬────┘       │
                                    │            │
                                    │ SendOffChain() success
                                    ▼            │
                       ┌────────────┴────────────┐
                       │                         │
                       │  WAITING FOR BOLTZ      │
                       │  (monitoring WS)        │
                       │                         │
                       └────────────┬────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
           ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
           │ transaction.│  │  invoice.   │  │  invoice.   │
           │   mempool   │  │   settled   │  │ failedToPay │
           └─────┬───────┘  └─────┬───────┘  └─────┬───────┘
                 │                │                │
                 │ Boltz          │ Success!       │ Failed!
                 │ detected       │                │
                 │ funding        ▼                ▼
                 │          ┌──────────┐    ┌──────────┐
                 │          │  SWAP    │    │  SWAP    │
                 │          │ SUCCESS  │    │  FAILED  │
                 │          └──────────┘    └─────┬────┘
                 │                                 │
                 │ Boltz pays                      │ Refund VHTLC
                 │ LN invoice                      ▼
                 │                          ┌──────────┐
                 │                          │REFUNDING │
                 │                          │  VHTLC   │
                 │                          └─────┬────┘
                 │                                │
                 │                    ┌───────────┴────────────┐
                 │                    │                        │
                 │                    ▼                        ▼
                 │            ┌───────────────┐      ┌─────────────────┐
                 │            │ COLLABORATIVE │      │  UNILATERAL     │
                 │            │    REFUND     │      │    REFUND       │
                 │            │   (3-of-3)    │      │ (scheduled for  │
                 │            └───────┬───────┘      │  later timeout) │
                 │                    │              └─────────────────┘
                 │                    ▼
                 │              ┌──────────┐
                 └─────────────>│ REFUNDED │
                                └──────────┘
                                      │
                                      ▼
                                ┌──────────┐
                                │   END    │
                                └──────────┘

TIMEOUT HANDLING:

If payment times out (default: swapTimeout seconds), the flow automatically
triggers a refund:

1. Try collaborative refund (fast, requires server cooperation)
2. If fails, schedule unilateral refund (waits for timelock)
3. Unilateral refund executed after CSV timeout expires

STATE PERSISTENCE:

All swap states are persisted to database:

File: /Users/dusansekulic/code/go/fulmine/internal/core/application/service.go:1618-1633
```

---

## 5. HTLC MECHANICS AND ATOMIC SWAP PROCESS

### What Makes It Atomic?

The swap is **atomic** because both parties lock funds behind the **same preimage hash**. Either both sides complete or both sides refund - no middle ground.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ATOMIC SWAP GUARANTEE                             │
└─────────────────────────────────────────────────────────────────────┘

             ARK SIDE (VHTLC)                 LIGHTNING SIDE (HTLC)

    User locks 50k sats in VHTLC        Boltz locks 50k sats in LN HTLC
              │                                      │
              │  Same Preimage Hash: H(P)           │
              │                                      │
              ▼                                      ▼
    ┌──────────────────────┐              ┌──────────────────────┐
    │  Locked with:        │              │  Locked with:        │
    │  Hash: abc123...     │◄────────────►│  Hash: abc123...     │
    │  Timeout: T1         │   LINKED!    │  Timeout: T2         │
    │  (longer)            │              │  (shorter)           │
    └──────────────────────┘              └──────────────────────┘
              │                                      │
              │                                      │
              │         EITHER:                      │
              │                                      │
    ┌─────────┴──────────┐              ┌───────────┴─────────┐
    │                    │              │                     │
    ▼                    ▼              ▼                     ▼
┌────────┐          ┌────────┐     ┌────────┐          ┌────────┐
│SUCCESS │          │TIMEOUT │     │SUCCESS │          │TIMEOUT │
│        │          │        │     │        │          │        │
│Boltz   │          │Refund  │     │Recipient│         │Boltz   │
│reveals │          │to user │     │reveals  │         │doesn't │
│preimage│          │        │     │preimage │         │pay     │
│& claims│          │        │     │         │         │        │
└────┬───┘          └────────┘     └────┬────┘         └────────┘
     │                                   │
     │  Preimage P known                 │
     │  by all parties                   │
     │                                   │
     └───────────┬───────────────────────┘
                 │
                 ▼
          ┌──────────────┐
          │ BOTH SUCCEED │
          │   OR BOTH    │
          │   REFUND     │
          └──────────────┘

ATOMICITY PROOF:

Case 1: Happy Path (Success)
  1. Boltz sees Ark VHTLC funded
  2. Boltz pays Lightning invoice (sends HTLC with hash H(P))
  3. Recipient reveals preimage P to claim Lightning payment
  4. Boltz learns preimage P from Lightning network
  5. Boltz uses P to claim Ark VHTLC
  → Both sides complete ✓

Case 2: Boltz Can't Route Payment (Failure)
  1. Boltz sees Ark VHTLC funded
  2. Boltz tries to pay Lightning invoice but fails (no route, offline recipient)
  3. Boltz never sends Lightning HTLC
  4. Boltz cooperatively refunds Ark VHTLC to user
  → Both sides refund ✓

Case 3: Timeout (Failure)
  1. Boltz sees Ark VHTLC funded
  2. Lightning payment times out (T2 expires)
  3. Boltz gets Lightning HTLC refunded
  4. Ark VHTLC also times out (T1 expires, T1 > T2)
  5. User gets Ark VHTLC refunded
  → Both sides refund ✓

Case 4: Malicious Boltz Tries to Steal (Impossible)
  1. Boltz sees Ark VHTLC funded
  2. Boltz tries to claim Ark VHTLC without paying Lightning
  3. ❌ Cannot claim without preimage P
  4. ❌ Cannot get preimage without paying Lightning invoice
  5. Timeout occurs, user gets refund
  → Attack prevented by cryptography ✓

SECURITY PROPERTIES:

1. **Hash Lock**: Funds can only be claimed with correct preimage
2. **Time Lock**: Funds automatically refund after timeout
3. **Timeout Ordering**: T1 (Ark) > T2 (Lightning) prevents race conditions
4. **Trustless**: No party can steal, all outcomes are enforced by code
```

### Preimage Hash Calculation

**File: `/Users/dusansekulic/code/go/fulmine/pkg/swap/swap.go:143-157`**

```go
// Extract preimage hash from Lightning invoice
var preimageHash []byte

if IsBolt12Invoice(invoice) {
    decodedInvoice, err := DecodeBolt12Invoice(invoice)
    if err != nil {
        return nil, fmt.Errorf("failed to decode bolt12 invoice: %v", err)
    }
    preimageHash = decodedInvoice.PaymentHash160  // Already RIPEMD160(SHA256(preimage))
} else {
    // BOLT11 invoice
    _, hash, err := DecodeInvoice(invoice)
    if err != nil {
        return nil, fmt.Errorf("failed to decode invoice: %v", err)
    }
    preimageHash = hash  // 32-byte SHA256 hash from invoice
}

// Create VHTLC script with this hash
// File: /Users/dusansekulic/code/go/fulmine/pkg/vhtlc/vhtlc.go:206-212
func makePreimageConditionScript(preimageHash []byte) ([]byte, error) {
    return txscript.NewScriptBuilder().
        AddOp(txscript.OP_HASH160).       // Hash the provided preimage
        AddData(preimageHash).              // Compare to this hash
        AddOp(txscript.OP_EQUAL).          // Must be equal
        Script()
}
```

---

## 6. COMPLETE STEP-BY-STEP EXAMPLE

### Scenario: Alice pays 50,000 sats to Bob's Lightning invoice

**Initial State:**
- Alice has Arkade wallet with 100,000 sats in Ark VTXOs
- Bob generated Lightning invoice: `lnbc500u1...` (50,000 sats)
- Bob's invoice expires in 1 hour

---

**STEP 1: Alice Initiates Payment (t=0s)**

```
Alice's wallet UI:
1. User pastes invoice: lnbc500u1pn...
2. Wallet decodes invoice:
   - Amount: 50,000 sats
   - Payment hash: abc123def456...
   - Description: "Coffee beans"
   - Expiry: 3600 seconds
3. Wallet displays confirmation:
   "Pay 50,000 sats to Bob?"
   Fee estimate: ~1,500 sats (3%)
   [Cancel] [Confirm]
4. Alice clicks Confirm

Wallet calls Fulmine API:
POST /api/v1/swap/lightning/pay
{
  "invoice": "lnbc500u1pn..."
}
```

**Code path:**
- Wallet → Fulmine gRPC: `PayLightningInvoice()`
- Fulmine service: `service.PayInvoice(ctx, invoice)`
- File: `/Users/dusansekulic/code/go/fulmine/internal/core/application/service.go:1057`

---

**STEP 2: Decode Invoice & Create Swap (t=0.5s)**

```
Fulmine decodes invoice locally:
- Extracts payment hash: abc123def456... (32 bytes)
- Computes RIPEMD160(SHA256(hash)): xyz789abc... (20 bytes)
- Validates amount, expiry, signature

Fulmine calls Boltz API:
POST https://api.boltz.exchange/v2/swap/submarine
{
  "from": "ARK",
  "to": "BTC",
  "invoice": "lnbc500u1pn...",
  "refundPublicKey": "02f7e5962c...",  // Alice's pubkey
  "paymentTimeout": 300  // 5 minutes
}

Boltz responds (t=1s):
{
  "id": "swap_xyz789",
  "address": "ark1qswap5f3...",  // VHTLC address
  "expectedAmount": 50000,
  "claimPublicKey": "03a1b2c3d4...",  // Boltz's pubkey
  "timeoutBlockHeights": {
    "refund": 850123,
    "unilateralClaim": 512,
    "unilateralRefund": 1024,
    "unilateralRefundWithoutReceiver": 2048
  }
}
```

**Code path:**
- File: `/Users/dusansekulic/code/go/fulmine/pkg/swap/swap.go:160-169`
- File: `/Users/dusansekulic/code/go/fulmine/pkg/boltz/boltz.go:53-63`

---

**STEP 3: Verify VHTLC Address (t=1.2s - SECURITY CRITICAL)**

```
Fulmine computes VHTLC address locally:

Inputs:
- Sender: Alice's pubkey (02f7e5962c...)
- Receiver: Boltz's pubkey (03a1b2c3d4...)
- Server: Arkd server pubkey (from config)
- Preimage hash: xyz789abc... (20 bytes)
- Timeouts: {refund: 850123, unilateralClaim: 512, ...}

Computation:
1. Create 6 tapscript leaves (claim, refund, etc.)
2. Build Merkle tree from leaves
3. Compute taproot internal key
4. Combine internal key + Merkle root → taproot output key
5. Encode as Ark address: ark1qswap5f3...

Verification:
if (computed_address == boltz_response.address) {
    ✓ SAFE TO PROCEED
} else {
    ✗ ABORT - POSSIBLE ATTACK
    return error("boltz trying to scam")
}

Result: ✓ Addresses match!
```

**Code path:**
- File: `/Users/dusansekulic/code/go/fulmine/pkg/swap/swap.go:176-193`
- File: `/Users/dusansekulic/code/go/fulmine/pkg/vhtlc/vhtlc.go:162-244`

---

**STEP 4: Connect WebSocket (t=1.5s)**

```
Fulmine connects to Boltz WebSocket:
wss://api.boltz.exchange/v2/ws

1. TCP handshake
2. WebSocket upgrade
3. Connection established

Fulmine subscribes to swap:
Send: {
  "op": "subscribe",
  "channel": "swap.update",
  "args": ["swap_xyz789"]
}

Boltz acknowledges (t=2s):
Receive: {
  "event": "subscribe"
}

WebSocket now streaming updates in background goroutine
```

**Code path:**
- File: `/Users/dusansekulic/code/go/fulmine/pkg/boltz/ws.go:72-174`
- File: `/Users/dusansekulic/code/go/fulmine/pkg/boltz/ws.go:233-259`

---

**STEP 5: Fund VHTLC (t=2s)**

```
Fulmine sends off-chain Ark payment to VHTLC address:

Call Ark SDK:
receivers := []types.Receiver{{
    To: "ark1qswap5f3...",  // VHTLC address
    Amount: 50000           // Exact amount
}}

arkClient.SendOffChain(ctx, false, receivers)

Ark SDK:
1. Selects suitable VTXOs from Alice's balance:
   - VTXO #1: 30,000 sats (round_456)
   - VTXO #2: 25,000 sats (round_457)
   Total input: 55,000 sats

2. Creates payment:
   - Output 1: 50,000 sats → ark1qswap5f3... (VHTLC)
   - Output 2: 5,000 sats → alice_change_addr (change back to Alice)

3. Signs payment with Alice's key

4. Submits to Arkd for next round

Arkd queues payment (t=2.5s):
Response: {
  "arkTxid": "vtxo_payment_123"
}
```

**Code path:**
- File: `/Users/dusansekulic/code/go/fulmine/pkg/swap/swap.go:201-217`
- Ark SDK internal: Round manager queues payment

---

**STEP 6: Wait for Round Finalization (t=2.5s - t=7s)**

```
Arkd round lifecycle:
- Current round started at t=0s
- Round interval: 5 seconds
- Next round starts at t=5s

Timeline:
t=2.5s  Payment queued in round
t=5.0s  Round finalization begins
        - Arkd builds VTXO tree for all payments
        - Creates round transaction
        - Signs with server key
        - Publishes to blockchain/off-chain tree
t=7.0s  Round finalized
        - VTXO for VHTLC created
        - VTXO published to indexer
        - VTXO becomes spendable

Arkd indexer now shows:
{
  "txid": "vtxo_payment_123",
  "vout": 0,
  "address": "ark1qswap5f3...",
  "amount": 50000,
  "status": "confirmed",
  "roundId": "round_458"
}
```

**Code path:**
- Arkd internal: Round manager, VTXO tree builder

---

**STEP 7: Boltz Detects Funding (t=7.5s)**

```
Boltz backend polling Arkd indexer:
Every 2 seconds: GET /v1/indexer/vtxos?address=ark1qswap5f3...

At t=7.5s, Boltz sees new VTXO:
{
  "address": "ark1qswap5f3...",
  "amount": 50000,
  "confirmed": true,
  "txid": "vtxo_payment_123"
}

Boltz validates:
✓ Amount matches expectedAmount (50000)
✓ VTXO is confirmed
✓ Address is correct VHTLC

Boltz updates swap status → "transaction.mempool"

Boltz sends WebSocket update:
{
  "event": "update",
  "channel": "swap.update",
  "args": [{
    "id": "swap_xyz789",
    "status": "transaction.mempool"
  }]
}
```

**Code path:**
- Boltz backend: Internal indexer monitor
- WebSocket: `/Users/dusansekulic/code/go/fulmine/pkg/boltz/ws.go:136-144`

---

**STEP 8: Boltz Pays Lightning Invoice (t=8s - t=15s)**

```
Boltz's Lightning node pays invoice:

t=8s   Decode invoice
       - Amount: 50,000 sats
       - Payment hash: abc123def456...
       - Recipient: Bob's node (03bob...)
       - Expiry: 3540 seconds remaining

t=9s   Find route to Bob
       - Query Lightning graph
       - Calculate optimal path
       - Found route: Boltz → Node A → Node B → Bob (3 hops)

t=10s  Send HTLC to Node A
       - Amount: 50,150 sats (includes routing fees)
       - Hash: abc123def456...
       - Timeout: 144 blocks

       Node A receives HTLC:
       - Validates hash, amount, timeout
       - Forwards to Node B: 50,075 sats (takes 75 sat fee)

t=12s  Node B receives HTLC
       - Validates and forwards to Bob: 50,000 sats (takes 75 sat fee)

t=13s  Bob's node receives HTLC
       - Amount matches invoice: ✓ 50,000 sats
       - Hash matches: ✓ abc123def456...
       - Bob's node reveals preimage: P = "secret_preimage_xyz..."

       Bob's node sends preimage to Node B

t=14s  Settlement propagates back
       - Node B learns preimage P
       - Node B settles with Node A (reveals P)
       - Node A settles with Boltz (reveals P)

t=15s  Boltz learns preimage!
       - HTLC settled
       - 50 sats paid out
       - Preimage P now known: "secret_preimage_xyz..."

       Boltz can now claim Ark VHTLC!
```

**Lightning protocol:** BOLT #4 (Onion Routing), BOLT #2 (HTLCs)

---

**STEP 9: Boltz Claims Ark VHTLC (t=15s - t=18s)**

```
Boltz builds claim transaction:

t=15.0s  Construct claim tx
         Input:
         - VTXO: vtxo_payment_123:0
         - Script: VHTLC claim tapscript (Receiver + Server + preimage)

         Output:
         - Amount: 50,000 sats
         - Address: boltz_ark_address

         Witness:
         - Preimage: "secret_preimage_xyz..."
         - Boltz signature
         - (Server signature will be added)

t=15.5s  Sign with Boltz key
         - Compute sighash for input
         - Sign with Boltz's private key
         - Signature: 304502...

t=16.0s  Request Arkd server signature
         Submit to Arkd:
         SubmitTx(claimTx, checkpointTxs)

         Arkd validates:
         ✓ Input VTXO exists and unspent
         ✓ VHTLC script is valid claim path
         ✓ Preimage hashes correctly: HASH160(P) == xyz789abc
         ✓ Boltz signature is valid
         ✓ Checkpoint transactions valid

         Arkd adds server signature

t=17.0s  Arkd returns signed transaction
         - claimTx now has both signatures
         - Checkpoint txs signed

         Boltz calls FinalizeTx(arkTxid, checkpoints)

t=18.0s  Claim finalized!
         - VTXO transferred to Boltz
         - Alice's VTXO consumed
         - Boltz's balance increases by 50,000 sats
```

**Code path:**
- Boltz: Similar to `/Users/dusansekulic/code/go/fulmine/pkg/swap/swap.go:682-810` (claim logic)
- Arkd: Transaction validation and signing

---

**STEP 10: Boltz Sends Final Update (t=18.5s)**

```
Boltz updates swap status → "invoice.settled"

Boltz sends WebSocket message:
{
  "event": "update",
  "channel": "swap.update",
  "args": [{
    "id": "swap_xyz789",
    "status": "invoice.settled"
  }]
}

Fulmine receives update (t=18.6s):
Main swap goroutine:
select {
    case update := <-ws.Updates:
        parsedStatus := boltz.ParseEvent(update.Status)

        if parsedStatus == boltz.InvoiceSettled {
            swapDetails.Status = SwapSuccess

            // Save to database
            go func() {
                s.dbSvc.Swap().Add(ctx, domain.Swap{
                    Id: "swap_xyz789",
                    Amount: 50000,
                    Status: domain.SwapSuccess,
                    Invoice: "lnbc500u1pn...",
                    FundingTxId: "vtxo_payment_123",
                    Type: domain.SwapRegular,
                    From: boltz.CurrencyArk,
                    To: boltz.CurrencyBtc,
                    Vhtlc: vHTLC,
                    Timestamp: time.Now().Unix(),
                })
            }()

            // Return success to wallet
            return &SwapResponse{
                TxId: "vtxo_payment_123",
                SwapStatus: domain.SwapSuccess,
                Invoice: "lnbc500u1pn..."
            }, nil
        }
}
```

**Code path:**
- File: `/Users/dusansekulic/code/go/fulmine/pkg/swap/swap.go:269-272`
- File: `/Users/dusansekulic/code/go/fulmine/internal/core/application/service.go:1618-1634`

---

**STEP 11: Wallet UI Updates (t=19s)**

```
Fulmine returns to wallet:
HTTP 200 OK
{
  "txid": "vtxo_payment_123",
  "status": "success"
}

Wallet UI updates:
1. Hide loading spinner
2. Show success message:
   "✓ Payment Successful!"
   "Paid 50,000 sats to Bob"
   "Transaction: vtxo_payment_123"

3. Update balance display:
   Previous: 100,000 sats
   New: 50,000 sats (100k - 50k spent)

4. Add to transaction history:
   {
     "type": "lightning_payment",
     "amount": -50000,
     "date": "2025-01-15 14:23:45",
     "status": "confirmed",
     "invoice": "lnbc500u1pn...",
     "description": "Coffee beans"
   }

Alice sees confirmation!
Bob's wallet shows incoming payment of 50,000 sats!
```

---

### Final State Summary

**Alice:**
- Started with: 100,000 sats in Ark VTXOs
- Spent: 50,000 sats on Lightning payment
- Remaining: 50,000 sats in Ark VTXOs
- VTXOs consumed:
  - VTXO #1: 30,000 sats (spent)
  - VTXO #2: 25,000 sats (spent)
- New VTXOs created:
  - Change VTXO: 5,000 sats (back to Alice)

**Bob:**
- Received: 50,000 sats in Lightning channel
- Invoice settled
- Preimage revealed to claim payment

**Boltz:**
- Received: 50,000 sats in Ark VTXOs (claimed from VHTLC)
- Paid out: 50,000 sats on Lightning Network
- Net profit: ~150 sats in Lightning routing fees received
- Net position: Even (minus routing costs)

**Total Time:** ~19 seconds from initiation to completion ✓

---

## CONCLUSION

This comprehensive flow demonstrates how Arkade wallet users can seamlessly pay Lightning invoices using Ark off-chain balance through submarine swaps. The system combines:

1. **Ark's instant off-chain transfers** (VTXOs)
2. **Boltz's atomic swap coordination** (VHTLC + HTLC)
3. **Lightning Network's routing** (global payment network)
4. **Cryptographic guarantees** (no trust required)

The atomic swap mechanism ensures that either the payment succeeds completely (Alice pays, Bob receives) or both parties get refunded - there is no middle ground where one party loses funds. This trustless architecture enables seamless interoperability between Ark and Lightning Network without requiring centralized custody or escrow services.

---

## Related Documentation

- **Fulmine Swap System**: `/Users/dusansekulic/code/go/arkadian/docs/projects/fulmine/system/swap-system.md`
- **VHTLC Implementation**: `/Users/dusansekulic/code/go/fulmine/pkg/vhtlc/vhtlc.go`
- **Boltz Integration**: `/Users/dusansekulic/code/go/fulmine/pkg/boltz/`
- **Arkade Wallet Architecture**: `/Users/dusansekulic/code/go/arkadian/docs/projects/wallet/system/architecture.md`

---

**Last Updated:** 2025-10-25
**Version:** 1.0.0
**Maintainer:** Arkadian Documentation Team
