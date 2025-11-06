# Arkade Wallet, Fulmine, and Boltz Integration
## Complete End-to-End Flows with All Participants

---

## Table of Contents
1. [Introduction](#introduction)
2. [System Architecture Overview](#system-architecture-overview)
3. [Participants and Their Roles](#participants-and-their-roles)
4. [Scenario 1: Alice Pays Bob's Lightning Invoice (Submarine Swap)](#scenario-1-alice-pays-bobs-lightning-invoice)
5. [Scenario 2: Bob Pays Lightning, Alice Receives VTXOs (Reverse Swap)](#scenario-2-bob-pays-lightning-alice-receives-vtxos-reverse-swap)
6. [Failure Scenarios and Recovery](#failure-scenarios-and-recovery)
7. [Message Sequences](#message-sequences)
8. [State Machines](#state-machines)
9. [Technical Deep Dive](#technical-deep-dive)

---

## Introduction

This document provides **complete end-to-end flows** for Lightning Network integration with Arkade Wallet via Boltz's infrastructure. We follow two users through realistic scenarios:

- **Alice**: Has 100,000 sats in Ark VTXOs, wants to pay Lightning invoices (Scenario 1) and receive VTXOs (Scenario 2)
- **Bob**: Has Lightning capacity, wants to receive Lightning payments (Scenario 1) and pay Alice so VTXOs come to her Arkade wallet (Scenario 2)

Both scenarios show **every participant, every message, every state change** from start to finish.

### Critical Architecture Clarification

**Regular users (Alice & Bob) only need:**
- ✅ Arkade Wallet (browser PWA)
- ✅ Service Worker with @arkade-os/sdk
- ❌ NO Fulmine daemon needed
- ❌ NO separate backend infrastructure

**Boltz Company (swap provider) runs:**
- Boltz Backend (swap coordinator API)
- Fulmine daemon (manages Boltz's Ark wallet)
- LND node (handles Lightning payments)
- PostgreSQL (stores swap state)

**Ark Company (ASP) runs:**
- arkd server (Ark protocol coordinator)

**Communication paths:**
```
Alice's Arkade ──► arkd (for Ark VTXOs)
Alice's Arkade ──► Boltz Backend (for swaps)
Boltz Backend  ──► Boltz Fulmine (internal)
Boltz Fulmine  ──► arkd (manages Boltz's VTXOs)
Boltz LND      ──► Lightning Network
```

**Key insight:** Fulmine is Boltz's infrastructure, not the user's. Users interact via simple browser wallet.

---

## System Architecture Overview

### The Complete Stack

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ALICE'S ENVIRONMENT                              │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Arkade Wallet (Browser PWA)                    │   │
│  │  ┌────────────────┐           ┌──────────────────────┐          │   │
│  │  │  React UI      │           │  Service Worker      │          │   │
│  │  │  • Balance     │◄─────────►│  • Private key       │          │   │
│  │  │  • Send form   │  state    │  • VTXO tracking     │          │   │
│  │  │  • QR scanner  │  updates  │  • SDK integration   │          │   │
│  │  │  • Apps tab    │           │  • arkd connection   │          │   │
│  │  └────────┬───────┘           └──────────┬───────────┘          │   │
│  └───────────┼──────────────────────────────┼──────────────────────┘   │
│              │                               │                          │
│              │ HTTP/gRPC                     │ HTTP/gRPC                │
│              ▼                               ▼                          │
└──────────────┼───────────────────────────────┼──────────────────────────┘
               │                               │
               │                               │
┌──────────────┼───────────────────────────────┼──────────────────────────┐
│              │                               │                          │
│              │       BOLTZ COMPANY           │                          │
│              │       (Swap Provider)         │                          │
│              │                               │                          │
│              │  ┌────────────────────────────┴───────────────┐         │
│              │  │          Boltz Backend                      │         │
│              │  │       (Swap Coordinator API)                │         │
│              │  │  • HTTP API: /createswap, /swapstatus       │         │
│              │  │  • WebSocket: swap event notifications      │         │
│              │  └────┬────────────────┬─────────────────────┬─┘         │
│              │       │                │                     │           │
│              │       │                │                     │           │
│              │  ┌────▼────────┐  ┌───▼──────────┐  ┌──────▼────────┐  │
│              │  │   Fulmine   │  │  Boltz LND   │  │  PostgreSQL   │  │
│              │  │   (Daemon)  │  │    Node      │  │   Database    │  │
│              │  │             │  │              │  │               │  │
│              │  │ • Ark wallet│  │ • Lightning  │  │ • Swap state  │  │
│              │  │ • VHTLC     │  │   routing    │  │ • Invoices    │  │
│              │  │   creation  │  │ • Invoice    │  │ • History     │  │
│              │  │ • Claims    │  │   settlement │  │               │  │
│              │  └─────┬───────┘  └──────┬───────┘  └───────────────┘  │
│              │        │                  │                             │
└──────────────┼────────┼──────────────────┼─────────────────────────────┘
               │        │                  │
               │        │ go-sdk           │
               ▼        ▼                  │
┌─────────────────────────────────────────┼──────────────────────────────┐
│                                          │                              │
│         ARK COMPANY (ASP)                │                              │
│                                          │                              │
│  ┌──────────────────────┐               │                              │
│  │    arkd Server       │               │                              │
│  │  (Ark Service        │               │                              │
│  │   Provider)          │               │                              │
│  │                      │               │                              │
│  │  • VTXO management   │               │                              │
│  │  • Round coordination│               │                              │
│  │  • Transaction signing│              │                              │
│  └──────────────────────┘               │                              │
│                                          │                              │
└──────────────────────────────────────────┼──────────────────────────────┘
                                           │
                                           │ Lightning Network
                                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      LIGHTNING NETWORK                                   │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                  Public Lightning Nodes                         │    │
│  │  • Route payments between Boltz and users                      │    │
│  │  • HTLC-based atomic payments                                  │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
               │
               │ (When Bob wants to receive/send on Lightning)
               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BOB'S ENVIRONMENT                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Arkade Wallet (Browser PWA)                    │   │
│  │  (Same architecture as Alice)                                    │   │
│  │  • Talks directly to arkd for Ark operations                    │   │
│  │  • Talks to Boltz Backend for swap operations                   │   │
│  │  • NO Fulmine daemon needed for users                           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │              Bob's LND Node (Optional)                           │   │
│  │  Only needed when Bob wants to:                                 │   │
│  │  • Pay Lightning invoices (submarine swap scenario)             │   │
│  │  • Receive Lightning payments (reverse swap scenario)           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Architecture Points:**

1. **Alice & Bob (Regular Users):**
   - Only run Arkade Wallet (browser PWA)
   - Service Worker handles Ark operations via SDK
   - Direct connection to arkd (for Ark VTXOs)
   - Direct connection to Boltz Backend (for swaps)
   - NO Fulmine daemon needed

2. **Boltz Company (Swap Service Provider):**
   - Runs Fulmine daemon (manages their Ark wallet)
   - Runs LND node (handles Lightning payments)
   - Runs Boltz Backend (coordinates swaps)
   - Runs PostgreSQL (stores swap state)

3. **Ark Company (ASP - Ark Service Provider):**
   - Runs arkd server (manages VTXO tree)
   - Coordinates rounds
   - Signs transactions

4. **Lightning Network:**
   - Public infrastructure
   - Routes payments between Boltz's LND and Bob's LND
   - Users may optionally run their own LND nodes

---

## Participants and Their Roles

### Alice (Regular User - Has Arkade Wallet)
- **Has**: 100,000 sats in Ark VTXOs
- **Components**:
  - **Arkade Wallet (Browser PWA)**
    - React UI for balance, send/receive
    - Service Worker with @arkade-os/sdk
    - Private key management (memory only)
    - VTXO tracking
  - Connects to:
    - arkd (for Ark operations)
    - Boltz Backend (for swaps)

**In Submarine Swap:** Alice wants to pay Bob's Lightning invoice using her Ark VTXOs

**In Reverse Swap:** Alice wants to receive VTXOs into her Arkade wallet (Bob pays her via Lightning)

### Bob (Regular User - Has Arkade Wallet)
- **Has**: Arkade wallet with Ark VTXOs
- **Components**:
  - **Arkade Wallet (Browser PWA)**
    - Same architecture as Alice
  - **Optional: Bob's LND Node**
    - Only needed when Bob wants to receive/send on Lightning directly

**In Submarine Swap:** Bob has Lightning node and wants to receive Lightning payment

**In Reverse Swap:** Bob has Lightning node and wants to pay Alice so VTXOs come to her Arkade wallet

### Boltz Company (Swap Service Provider)
- **Role**: Trustless atomic swap coordinator between Ark and Lightning
- **Infrastructure**:
  - **Boltz Backend**
    - HTTP API: `/createswap`, `/createreverseswap`, `/swapstatus`, `/refund`
    - WebSocket: Real-time swap event notifications
    - PostgreSQL database for swap state
  - **Fulmine Daemon**
    - Manages Boltz's own Ark wallet
    - Creates VHTLCs on Ark
    - Claims VHTLCs with preimages
    - Handles refunds
  - **Boltz LND Node**
    - Routes Lightning payments
    - Pays invoices (submarine swaps)
    - Receives hold invoices (reverse swaps)
    - Settles invoices with preimages

- **Operations**:
  - **Submarine Swaps**: Receives Ark VTXOs from Alice → Pays Bob's Lightning invoice → Claims VHTLCs
  - **Reverse Swaps**: Receives Lightning payment from Alice → Locks Ark VTXOs for Bob → Bob claims with preimage

### Ark Company (ASP - Ark Service Provider)
- **Role**: Ark protocol coordinator
- **Infrastructure**:
  - **arkd Server**
    - Manages VTXO tree state
    - Coordinates settlement rounds
    - Validates transactions
    - Co-signs VTXOs and VHTLCs
    - Provides gRPC/HTTP API for clients

- **Operations**:
  - Creates VTXOs for users
  - Processes off-chain transactions
  - Finalizes rounds every ~5-20 seconds
  - Provides unilateral exit paths

### Lightning Network
- **Role**: Public payment routing infrastructure
- **Components**:
  - Public Lightning nodes
  - Routing algorithms
  - HTLC-based payments
- **Operations**:
  - Routes payments between Boltz's LND and user LND nodes
  - Atomic payments using preimage/hash
  - Provides preimage on successful payment

---

## Scenario 1: Alice Pays Bob's Lightning Invoice

### High-Level Overview

```
Alice (Arkade) ──► Submarine Swap ──► Bob (Lightning)
   100k sats          (via Boltz)        10k sats
   (Ark VTXOs)                          (Lightning)
```

**What happens:**
1. Bob generates Lightning invoice with preimage
2. Alice pastes invoice into Arkade wallet
3. Fulmine creates VHTLC on Ark with invoice hash
4. Boltz pays Bob's Lightning invoice
5. Boltz learns preimage from Lightning payment
6. Boltz claims VHTLC using preimage
7. Swap complete: Alice paid 10k sats (Ark → Lightning → Bob)

### API Calls Summary

This section shows **only the API/RPC calls** between components in the submarine swap flow:

```
┌─────────────────┐
│ 1. Setup Phase  │
└─────────────────┘

Alice's Arkade ──────► Boltz Backend
  POST /createswap
  {
    "type": "submarine",
    "invoice": "lnbc100u1...",
    "refundPublicKey": "02alice..."
  }
  ◄────── Response
  {
    "id": "swap_xyz789",
    "address": "ark1qxyz...",
    "expectedAmount": 10000,
    "timeoutBlockHeight": 144,
    "boltzPublicKey": "03..."
  }

Boltz Backend ───────► Boltz Fulmine (internal)
  CreateVHTLC()
  {
    "sender": "alice_pubkey",
    "receiver": "boltz_pubkey",
    "preimageHash": "abc123...",
    "amount": 10000
  }
  ◄────── VHTLC address: ark1qxyz...


┌─────────────────┐
│ 2. Lock Phase   │
└─────────────────┘

Alice's Arkade ──────► arkd
  gRPC: SendOffChain()
  {
    "receivers": [{
      "address": "ark1qxyz...",
      "amount": 10000
    }]
  }
  ◄────── TxID: tx_abc123

arkd (Round Processing)
  • Validates transaction
  • Adds to pending round
  • Finalizes round (5-20s)
  • VHTLC created and confirmed

arkd ────────► Boltz Fulmine (WebSocket)
  {
    "event": "transaction.mempool",
    "swap_id": "swap_xyz789"
  }

Boltz Fulmine ───────► arkd
  GET /vtxos?address=ark1qxyz...
  ◄────── VTXO found
  {
    "vtxos": [{
      "txid": "...",
      "amount": 10000,
      "status": "confirmed"
    }]
  }


┌─────────────────────┐
│ 3. Payment Phase    │
└─────────────────────┘

Boltz LND ───────► Lightning Network
  PayInvoice(lnbc100u1...)
  ◄────── Preimage: preimage_xyz...

Bob's LND ◄────────── Lightning Network
  Invoice settled
  + 10,000 sats


┌─────────────────┐
│ 4. Claim Phase  │
└─────────────────┘

Boltz Fulmine ───────► arkd
  gRPC: SubmitTransaction()
  {
    "vtxo_id": "vhtlc_id",
    "preimage": "preimage_xyz...",
    "signature": "boltz_sig"
  }

arkd (Verification)
  • Verify: RIPEMD160(SHA256(preimage)) == hash
  • Verify: Signature valid
  • Co-sign transaction
  • Finalize claim

  ◄────── Claim successful
  {
    "txid": "claim_tx_999"
  }

Boltz Backend ───────► Alice's Arkade (WebSocket)
  {
    "event": "swap.success",
    "swap_id": "swap_xyz789",
    "status": "invoice.settled"
  }
```

### Complete Step-by-Step Flow

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│   Bob    │  │  Alice   │  │  Boltz   │  │  Boltz   │  │ Lightning│  │   arkd   │
│   (LN)   │  │ (Arkade) │  │ Backend  │  │ Fulmine  │  │ Network  │  │ Server   │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │              │              │              │              │
     │ STEP 1: Bob generates Lightning invoice (Bob has own LN node)         │
     │             │              │              │              │              │
     ├─────────────────────────►│              │              │              │
     │ lncli addinvoice          │              │              │              │
     │   --amt 10000             │              │              │              │
     │   --memo "Coffee"         │              │              │              │
     │                           │              │              │              │
     │◄────────────────────────┤              │              │              │
     │ Invoice:                  │              │              │              │
     │ lnbc100u1...              │              │              │              │
     │ Payment Hash:             │              │              │              │
     │ abc123def456...           │              │              │              │
     │                           │              │              │              │
     │ STEP 2: Bob shares invoice with Alice (QR/text)         │              │
     │                           │              │              │              │
     │────────────►│             │              │              │              │
     │ "Here's the │             │              │              │              │
     │  invoice"   │             │              │              │              │
     │             │             │              │              │              │
     │             │ STEP 3: Alice scans/pastes invoice in Arkade UI         │
     │             │              │              │              │              │
     │             │ Arkade Service Worker decodes invoice:    │              │
     │             │ • Amount: 10,000 sats       │              │              │
     │             │ • Payment Hash: abc123...   │              │              │
     │             │ • Expiry: 3600 seconds      │              │              │
     │             │              │              │              │              │
     │             │ STEP 4: Arkade calls Boltz Backend API    │              │
     │             │              │              │              │              │
     │             ├──────────────►              │              │              │
     │             │ POST /createswap            │              │              │
     │             │ {                           │              │              │
     │             │   "type": "submarine",      │              │              │
     │             │   "invoice": "lnbc100u1...",│              │              │
     │             │   "refundPublicKey": "02alice..."          │              │
     │             │ }              │              │              │              │
     │             │             │              │              │              │
     │             │              │ STEP 5: Boltz Backend coordinates with Boltz Fulmine
     │             │              │              │              │              │
     │             │              ├──────────────►              │              │
     │             │              │ Create VHTLC │              │              │
     │             │              │              │              │              │
     │             │              │              │ VHTLC Parameters:           │
     │             │              │              │ • Sender: Alice pubkey      │
     │             │              │              │ • Receiver: Boltz pubkey    │
     │             │              │              │ • Server: arkd pubkey       │
     │             │              │              │ • PreimageHash: abc123...   │
     │             │              │              │ • Timeouts: [512s, 1024s, 144 blocks]
     │             │              │              │              │              │
     │             │              │              │ Compute VHTLC address:      │
     │             │              │              │ ark1qxyz...  │              │
     │             │              │              │              │              │
     │             │              │◄─────────────┤              │              │
     │             │              │ VHTLC address│              │              │
     │             │              │              │              │              │
     │             │◄─────────────┤              │              │              │
     │             │ Response:    │              │              │              │
     │             │ {                           │              │              │
     │             │   "id": "swap_xyz789",      │              │              │
     │             │   "address": "ark1qxyz...", │              │              │
     │             │   "expectedAmount": 10000,  │              │              │
     │             │   "timeoutBlockHeight": 144,│              │              │
     │             │   "boltzPublicKey": "03..." │              │              │
     │             │ }              │              │              │              │
     │             │              │              │              │              │
     │             │ STEP 6: Alice's Arkade verifies VHTLC address             │
     │             │              │              │              │              │
     │             │ Service Worker recomputes VHTLC address    │              │
     │             │ from parameters and verifies match         │              │
     │             │              │              │              │              │
     │             │ if (computed != boltz_address) ABORT!      │              │
     │             │              │              │              │              │
     │             │ ✓ Address verified - safe to proceed       │              │
     │             │              │              │              │              │
     │             │ STEP 7: Alice sends Ark funds to VHTLC address           │
     │             │             │              │              │              │
     │             │             ├──────────────────────────────────────────►│
     │             │             │ SendOffChain(                              │
     │             │             │   receivers: [                             │
     │             │             │     {                                      │
     │             │             │       address: "ark1qxyz...",              │
     │             │             │       amount: 10000                        │
     │             │             │     }                                      │
     │             │             │   ]                                        │
     │             │             │ )              │              │              │
     │             │             │              │              │              │
     │             │             │              │              │ • arkd receives │
     │             │             │              │              │   transaction │
     │             │             │              │              │ • Validates   │
     │             │             │              │              │ • Adds to next│
     │             │             │              │              │   round       │
     │             │             │              │              │              │
     │             │             │◄─────────────────────────────────────────┤
     │             │             │ TxID: tx_abc123                            │
     │             │             │              │              │              │
     │             │             │              │ STEP 10: Wait for round    │
     │             │             │              │              │              │
     │             │             │              │              │ • Round starts│
     │             │             │              │              │ • Finalizes   │
     │             │             │              │              │ • VHTLC created│
     │             │             │              │              │              │
     │             │             │              │ STEP 11: Boltz detects VHTLC│
     │             │             │              │                              │
     │             │             │              │◄─────────────────────────────┤
     │             │             │              │ Query VTXOs:                 │
     │             │             │              │ GET /vtxos?address=ark1qxyz  │
     │             │             │              │                              │
     │             │             │              │ Response: VTXO found         │
     │             │             │              │ • Amount: 10,000 sats        │
     │             │             │              │ • Status: confirmed          │
     │             │             │              │              │              │
     │             │             │◄─────────────┤              │              │
     │             │             │ WebSocket:   │              │              │
     │             │             │ {            │              │              │
     │             │             │   "event": "transaction.mempool",          │
     │             │             │   "swap_id": "swap_xyz789"  │              │
     │             │             │ }              │              │              │
     │             │             │              │              │              │
     │             │             │              │ STEP 12: Boltz pays Lightning invoice
     │             │             │              │              │              │
     │             │             │              ├──────────────►              │
     │             │             │              │ Pay invoice:  │              │
     │             │             │              │ lnbc100u1...  │              │
     │             │             │              │              │              │
     │             │             │              │              │ STEP 13: Lightning routes payment
     │             │             │              │              │              │
     │             │             │              │              │ • Find route  │
     │             │             │              │              │   Boltz → Bob │
     │             │             │              │              │ • Create HTLCs│
     │             │             │              │              │   along route │
     │             │             │              │              │ • Forward     │
     │             │             │              │              │   payment     │
     │             │             │              │              │              │
     │             │             │              │              ├──────────────►│
     │             │             │              │              │ HTLC payment  │
     │◄────────────────────────────────────────────────────────┤              │
     │ Incoming payment!         │              │              │              │
     │ • Amount: 10,000 sats     │              │              │              │
     │ • Payment hash: abc123... │              │              │              │
     │                           │              │              │              │
     │ STEP 14: Bob's LND verifies hash and settles            │              │
     │                           │              │              │              │
     │ • Check payment hash matches invoice                    │              │
     │ • Reveal preimage: preimage_xyz                         │              │
     │                           │              │              │              │
     ├──────────────────────────────────────────────────────────►            │
     │ Settle HTLC with preimage │              │              │              │
     │                           │              │              │              │
     │                           │              │              │ STEP 15: Preimage propagates back
     │                           │              │              │              │
     │                           │              │◄─────────────┤              │
     │                           │              │ Preimage:     │              │
     │                           │              │ preimage_xyz  │              │
     │                           │              │              │              │
     │                           │              │ ✓ Invoice paid successfully  │
     │                           │              │ ✓ Boltz now knows preimage   │
     │                           │              │              │              │
     │                           │              │ STEP 16: Boltz claims VHTLC with preimage
     │                           │              │              │              │
     │                           │              │ Create claim transaction:    │
     │                           │              │ • Spend VHTLC                │
     │                           │              │ • Add preimage to witness    │
     │                           │              │ • Sign with Boltz key        │
     │                           │              │              │              │
     │                           │              ├──────────────────────────────►
     │                           │              │ SubmitTransaction(           │
     │                           │              │   vtxo_id: vhtlc_id,         │
     │                           │              │   preimage: preimage_xyz,    │
     │                           │              │   signature: boltz_sig       │
     │                           │              │ )              │              │
     │                           │              │              │              │
     │                           │              │              │ • arkd verifies:│
     │                           │              │              │   ✓ Preimage   │
     │                           │              │              │     matches    │
     │                           │              │              │   ✓ Signature  │
     │                           │              │              │     valid      │
     │                           │              │              │ • Co-signs     │
     │                           │              │              │ • Finalizes    │
     │                           │              │              │              │
     │                           │              │◄─────────────────────────────┤
     │                           │              │ Claim successful             │
     │                           │              │ TxID: claim_tx_456           │
     │                           │              │              │              │
     │                           │◄─────────────┤              │              │
     │                           │ WebSocket:   │              │              │
     │                           │ {            │              │              │
     │                           │   "event": "invoice.settled",              │
     │                           │   "swap_id": "swap_xyz789"  │              │
     │                           │ }              │              │              │
     │                           │              │              │              │
     │             │◄────────────┤              │              │              │
     │             │ Response:    │              │              │              │
     │             │ {            │              │              │              │
     │             │   "swap_id": "swap_xyz789", │              │              │
     │             │   "status": "success",      │              │              │
     │             │   "txid": "claim_tx_456"    │              │              │
     │             │ }              │              │              │              │
     │             │              │              │              │              │
     │             │ STEP 17: UI updates (Alice's balance decreased)           │
     │             │              │              │              │              │
     │             │ Service Worker detects VTXO change                        │
     │             │ • Reloads wallet                                          │
     │             │ • Updates balance: 90,000 sats                            │
     │             │              │              │              │              │
     │             ▼              ▼              ▼              ▼              ▼
     │                           │              │              │              │
     │ ✅ SWAP COMPLETE          │              │              │              │
     │                           │              │              │              │
     │ Bob received: 10,000 sats (Lightning)                  │              │
     │ Alice paid: 10,000 sats + fees (Ark VTXOs)            │              │
     │ Boltz earned: swap fee                                 │              │
     │                           │              │              │              │
```

### Timeline with Durations

```
T=0s    Bob generates Lightning invoice
        └─► Instant (< 1s)

T=1s    Alice scans invoice in Arkade wallet
        └─► User action

T=2s    Fulmine calls Boltz API to create swap
        └─► Network call (< 500ms)

T=3s    Fulmine creates and verifies VHTLC
        └─► Computation (< 100ms)

T=4s    Fulmine sends Ark transaction to arkd
        └─► Network call (< 500ms)

T=5s    Wait for Ark round to finalize
        └─► 5-20 seconds (depends on round schedule)

T=15s   VHTLC created and confirmed on Ark
        └─► Boltz detects via polling/WebSocket

T=16s   Boltz pays Lightning invoice
        └─► 1-10 seconds (depends on routing)

T=20s   Lightning payment routes to Bob
        └─► Hops through network

T=22s   Bob's LND settles payment, reveals preimage
        └─► Instant (< 100ms)

T=23s   Preimage propagates back to Boltz
        └─► Along Lightning route (< 1s)

T=24s   Boltz claims VHTLC with preimage
        └─► Submit claim transaction to arkd

T=25s   arkd verifies and co-signs claim
        └─► Verification + signing (< 500ms)

T=26s   Claim finalized on Ark
        └─► Next round or immediate

T=30s   ✅ SWAP COMPLETE (total ~30 seconds)
```

### Balance Changes

**Alice:**
```
Before:  100,000 sats (Ark VTXOs)
After:    89,500 sats (Ark VTXOs)
         -10,000 sats (payment to Bob)
            -500 sats (Boltz swap fee + Ark round fee)
```

**Bob:**
```
Before:   50,000 sats (Lightning channels)
After:    60,000 sats (Lightning channels)
         +10,000 sats (payment from Alice)
```

**Boltz:**
```
Before:  500,000 sats (Ark VTXOs)
After:   510,500 sats (Ark VTXOs)
         +10,000 sats (claimed from VHTLC)
            -100 sats (Lightning routing fees)

Net earnings: +400 sats (0.4% swap fee)
```

---

## Scenario 2: Bob Pays Lightning, Alice Receives VTXOs (Reverse Swap)

### High-Level Overview

```
Bob (Lightning) ──► Reverse Swap ──► Alice (Arkade)
    10k sats          (via Boltz)       10k sats
  (Lightning)                          (Ark VTXOs)
```

**What happens:**
1. Alice requests reverse swap via Arkade wallet
2. Alice's Arkade generates random preimage and hash
3. Alice's Arkade calls Boltz to create reverse swap
4. Boltz Fulmine creates VHTLC on Ark and Boltz Backend provides Lightning invoice
5. Bob pays Lightning invoice from his LND node
6. Boltz receives Lightning payment (holds preimage)
7. Boltz Fulmine locks funds in VHTLC on Ark
8. Alice's Arkade detects VHTLC funding
9. Alice's Arkade claims VHTLC with preimage
10. Boltz learns preimage from claim, settles Lightning payment
11. Swap complete: Alice received 10k sats as VTXOs (Bob's Lightning → Alice's Ark VTXOs)

### API Calls Summary

This section shows **only the API/RPC calls** between components in the reverse swap flow:

```
┌─────────────────┐
│ 1. Setup Phase  │
└─────────────────┘

Alice's Arkade (Generates Preimage)
  preimage = random(32 bytes)
  hash = RIPEMD160(SHA256(preimage))
  Store preimage in IndexedDB securely

Alice's Arkade ──────► Boltz Backend
  POST /createreverseswap
  {
    "type": "reversesubmarine",
    "invoiceAmount": 10000,
    "preimageHash": "abc789...",
    "claimPublicKey": "02alice..."
  }
  ◄────── Response
  {
    "id": "swap_rev456",
    "invoice": "lnbc100u1...",
    "lockupAddress": "ark1q...",
    "timeoutBlockHeight": 144,
    "boltzPublicKey": "03..."
  }

Boltz Backend ───────► Boltz LND
  AddHoldInvoice()
  {
    "amount": 10000,
    "hash": "abc789...",
    "expiry": 3600
  }
  ◄────── Invoice: lnbc100u1...


┌─────────────────────┐
│ 2. Payment Phase    │
└─────────────────────┘

Bob's LND ───────► Lightning Network
  PayInvoice(lnbc100u1...)
  • Routes through network
  • HTLCs locked with hash

Lightning Network ───────► Boltz LND
  HTLC Payment arrives
  • Amount: 10,000 sats
  • Hash: abc789...
  • Status: HELD (not settled)

Boltz LND (Hold Invoice State)
  • Payment held
  • Waiting for preimage
  • Will settle when preimage revealed


┌─────────────────┐
│ 3. Lock Phase   │
└─────────────────┘

Boltz Fulmine ───────► arkd
  gRPC: SendOffChain()
  {
    "receivers": [{
      "address": "ark1q...",  // VHTLC address for Alice
      "amount": 10000
    }]
  }
  ◄────── TxID: lock_tx_789

arkd (Round Processing)
  • Validates transaction
  • Adds to pending round
  • Finalizes round (5-20s)
  • VHTLC created and confirmed

Boltz Backend ───────► Alice's Arkade (WebSocket)
  {
    "event": "transaction.mempool",
    "swap_id": "swap_rev456"
  }

Alice's Arkade ───────► arkd
  GET /vtxos?address=ark1q...
  ◄────── VTXO found
  {
    "vtxos": [{
      "txid": "lock_tx_789",
      "amount": 10000,
      "status": "confirmed"
    }]
  }


┌─────────────────┐
│ 4. Claim Phase  │
└─────────────────┘

Alice's Arkade ───────► arkd
  gRPC: SubmitTransaction()
  {
    "vtxo_id": "vhtlc_id",
    "preimage": "deadbeef...",  // Alice's preimage
    "signature": "alice_sig"
  }

arkd (Verification)
  • Verify: RIPEMD160(SHA256(preimage)) == hash
  • Verify: Signature valid (Alice's key)
  • Co-sign transaction
  • Finalize claim
  • ⚠️ Preimage now visible on-chain in witness!

  ◄────── Claim successful
  {
    "txid": "claim_tx_999"
  }


┌──────────────────────┐
│ 5. Settlement Phase  │
└──────────────────────┘

arkd ────────► Boltz Fulmine (Monitoring)
  • Boltz monitors arkd for claim transactions
  • Extracts preimage from claim tx witness
  • Preimage: deadbeef...

Boltz LND (Settlement)
  SettleInvoice()
  {
    "preimage": "deadbeef..."
  }
  • Releases held payment
  • Settles HTLCs backward through network

Lightning Network ───────► Bob's LND
  Payment successful
  - 10,000 sats
  Preimage: deadbeef...

Boltz Backend ───────► Alice's Arkade (WebSocket)
  {
    "event": "swap.success",
    "swap_id": "swap_rev456",
    "status": "swap.claimed",
    "txid": "claim_tx_999"
  }

Alice's Arkade (Service Worker)
  VTXO_UPDATE event
  • Reload wallet
  • Update balance: +10,000 sats
  • Show success notification
```

### Complete Step-by-Step Flow

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│   Bob    │  │  Alice   │  │  Boltz   │  │  Boltz   │  │ Lightning│  │   arkd   │
│   (LN)   │  │ (Arkade) │  │ Backend  │  │ Fulmine  │  │ Network  │  │ Server   │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │              │              │              │              │
     │             │ STEP 1: Alice wants to receive 10k sats in Arkade wallet │
     │             │              │              │              │              │
     │             │ Open Arkade → Apps → Boltz Swap                          │
     │             │ Select "Receive Lightning"                               │
     │             │ Enter amount: 10,000 sats                                │
     │             │              │              │              │              │
     │             │ STEP 2: Alice's Arkade generates preimage                │
     │             │              │              │              │              │
     │             │ preimage = random(32 bytes)                              │
     │             │ preimage = deadbeef123456...                             │
     │             │              │              │              │              │
     │             │ hash = RIPEMD160(SHA256(preimage))                       │
     │             │ hash = abc789def012...                                   │
     │             │              │              │              │              │
     │             │ ⚠️ CRITICAL: Store preimage securely!                    │
     │             │              │              │              │              │
     │             │ STEP 3: Alice's Arkade calls Boltz API                   │
     │             │              │              │              │              │
     │             ├──────────────►              │              │              │
     │             │ POST /createreverseswap     │              │              │
     │             │ {                           │              │              │
     │             │   "type": "reversesubmarine",              │              │
     │             │   "invoiceAmount": 10000,   │              │              │
     │             │   "preimageHash": "abc789...",             │              │
     │             │   "claimPublicKey": "02alice..."           │              │
     │             │ }              │              │              │              │
     │             │              │              │              │              │
     │             │              │              │ STEP 4: Boltz creates reverse swap
     │             │              │              │              │              │
     │             │              │              │ • Generate swap ID          │
     │             │              │              │ • Create Lightning invoice  │
     │             │              │              │   (hold invoice)            │
     │             │              │              │ • Calculate timeouts        │
     │             │              │              │ • Prepare VHTLC params      │
     │             │              │              │              │              │
     │             │              │              │ HOLD INVOICE:               │
     │             │              │              │ • Invoice won't settle      │
     │             │              │              │   until preimage revealed   │
     │             │              │              │ • Boltz holds payment       │
     │             │              │              │              │              │
     │             │              │◄─────────────┤              │              │
     │             │              │ {                           │              │
     │             │              │   "id": "swap_rev456",      │              │
     │             │              │   "invoice": "lnbc100u1...",│              │
     │             │              │   "lockupAddress": "ark1q...",             │
     │             │              │   "timeoutBlockHeight": 144,│              │
     │             │              │   "boltzPublicKey": "03..." │              │
     │             │              │ }              │              │              │
     │             │              │              │              │              │
     │             │              │ STEP 5: Boltz stores swap (WITHOUT preimage) │
     │             │              │              │              │              │
     │             │              │ Database.save({             │              │
     │             │              │   swap_id: "swap_rev456",   │              │
     │             │              │   preimage_hash: "abc789...",              │
     │             │              │   status: "pending"         │              │
     │             │              │   claim_pubkey: "02alice..."│              │
     │             │              │ })             │              │              │
     │             │              │              │              │              │
     │             │              │ Note: Boltz does NOT have preimage!        │
     │             │              │       Only Alice has it!    │              │
     │             │              │              │              │              │
     │             │◄────────────┤              │              │              │
     │             │ Response:    │              │              │              │
     │             │ {            │              │              │              │
     │             │   "swap_id": "swap_rev456", │              │              │
     │             │   "invoice": "lnbc100u1...", │              │              │
     │             │   "expires_at": 1234567890  │              │              │
     │             │ }              │              │              │              │
     │             │              │              │              │              │
     │             │ STEP 6: Alice's Arkade UI displays invoice               │
     │             │              │              │              │              │
     │             │ • Show QR code                                            │
     │             │ • Show invoice string                                     │
     │             │ • Show "Waiting for payment..." status                    │
     │             │              │              │              │              │
     │             │ STEP 7: Alice shares invoice with Bob                    │
     │             │              │              │              │              │
     │             │──────────►  │              │              │              │
     │             │ "Pay this invoice to send me sats!"       │              │
     │             │              │              │              │              │
     │             │              │              │              │              │
     │ STEP 8: Bob pays Lightning invoice from his LN wallet                  │
     │             │              │              │              │              │
     ├─────────────────────────────────────────►              │              │
     │ lncli payinvoice lnbc100u1...            │              │              │
     │             │              │              │              │              │
     │                           │              │              │              │
     │                           │              │ STEP 9: Lightning routes payment
     │                           │              │              │              │
     │                           ├──────────────►              │              │
     │                           │ HTLC payment  │              │              │
     │                           │ Amount: 10k   │              │              │
     │                           │ Hash: abc789..│              │              │
     │                           │              │              │              │
     │                           │              │              │ STEP 10: Routes through network
     │                           │              │              │              │
     │                           │              │              │ • Find path  │
     │                           │              │              │   Bob → Boltz│
     │                           │              │              │ • Create HTLCs│
     │                           │              │              │ • Forward     │
     │                           │              │              │              │
     │                           │              │◄─────────────┤              │
     │                           │              │ HTLC arrives  │              │
     │                           │              │ at Boltz LND  │              │
     │                           │              │              │              │
     │                           │              │ STEP 11: Boltz LND receives hold invoice payment
     │                           │              │              │              │
     │                           │              │ • Payment hash matches       │
     │                           │              │ • Amount correct             │
     │                           │              │ • HOLD payment (don't settle yet!)│
     │                           │              │ • Don't reveal preimage yet  │
     │                           │              │              │              │
     │                           │              │ STEP 12: Boltz locks funds in VHTLC on Ark
     │                           │              │              │              │
     │                           │              │ Create VHTLC:                │
     │                           │              │ • Sender: Boltz pubkey       │
     │                           │              │ • Receiver: Alice pubkey     │
     │                           │              │ • Server: arkd pubkey        │
     │                           │              │ • PreimageHash: abc789...    │
     │                           │              │ • Timeouts: [512s, 1024s, 144 blocks]
     │                           │              │              │              │
     │                           │              ├──────────────────────────────►
     │                           │              │ SendOffChain(                │
     │                           │              │   receivers: [               │
     │                           │              │     {                        │
     │                           │              │       address: "ark1q...",   │
     │                           │              │       amount: 10000          │
     │                           │              │     }                        │
     │                           │              │   ]                          │
     │                           │              │ )              │              │
     │                           │              │              │              │
     │                           │              │              │ • Receives tx │
     │                           │              │              │ • Validates   │
     │                           │              │              │ • Adds to next│
     │                           │              │              │   round       │
     │                           │              │              │              │
     │                           │              │◄─────────────────────────────┤
     │                           │              │ TxID: lock_tx_789            │
     │                           │              │              │              │
     │                           │              │              │ STEP 13: Round finalizes
     │                           │              │              │              │
     │                           │              │              │ • VHTLC created│
     │                           │              │              │ • Confirmed   │
     │                           │              │              │              │
     │             │              │              │              │              │
     │             │              │ STEP 14: Alice's Arkade detects VHTLC funding
     │             │              │              │              │              │
     │             │◄────────────┤              │              │              │
     │             │ WebSocket:   │              │              │              │
     │             │ {            │              │              │              │
     │             │   "event": "transaction.mempool",          │              │
     │             │   "swap_id": "swap_rev456"  │              │              │
     │             │ }              │              │              │              │
     │             │              │              │              │              │
     │             │ ✓ VHTLC funding detected!   │              │              │
     │             │              │              │              │              │
     │             │ STEP 15: Alice's Arkade queries arkd to confirm           │
     │             │              │              │              │              │
     │             ├──────────────────────────────────────────────────────────►
     │             │ GET /vtxos?address=ark1q...               │              │
     │             │              │              │              │              │
     │             │◄─────────────────────────────────────────────────────────┤
     │             │ VTXO found:  │              │              │              │
     │             │ • Amount: 10,000 sats       │              │              │
     │             │ • Status: confirmed         │              │              │
     │             │              │              │              │              │
     │             │ STEP 16: Alice's Arkade claims VHTLC with preimage       │
     │             │              │              │              │              │
     │             │ Load preimage from IndexedDB:              │              │
     │             │ preimage = "deadbeef123456..."             │              │
     │             │              │              │              │              │
     │             │ Create claim transaction:   │              │              │
     │             │ • Spend VHTLC                │              │              │
     │             │ • Add preimage to witness   │              │              │
     │             │ • Sign with Alice's key     │              │              │
     │             │              │              │              │              │
     │             ├──────────────────────────────────────────────────────────►
     │             │ SubmitTransaction(          │              │              │
     │             │   vtxo_id: vhtlc_id,        │              │              │
     │             │   preimage: "deadbeef...",  │              │              │
     │             │   signature: alice_sig      │              │              │
     │             │ )              │              │              │              │
     │             │              │              │              │              │
     │             │              │              │ • Verifies:                 │
     │             │              │              │   ✓ RIPEMD160(SHA256(preimage))│
     │             │              │              │     matches hash            │
     │             │              │              │   ✓ Signature valid         │
     │             │              │              │ • Co-signs transaction      │
     │             │              │              │ • Finalizes claim           │
     │             │              │              │              │              │
     │             │              │◄─────────────────────────────────────────┤
     │             │              │ Claim successful                           │
     │             │              │ TxID: claim_tx_999                         │
     │             │              │              │              │              │
     │             │              │              │              │ • VTXOs transferred│
     │             │              │              │              │   to Alice   │
     │             │              │              │              │              │
     │             │              │              │ STEP 17: Boltz sees preimage in claim tx
     │             │              │              │              │              │
     │             │              │              │◄─────────────────────────────┤
     │             │              │              │ Event: VTXO claimed          │
     │             │              │              │ • Extracts preimage from     │
     │             │              │              │   claim transaction witness  │
     │             │              │              │ • Preimage: deadbeef...      │
     │             │              │              │              │              │
     │             │              │              │ ✓ Boltz now has preimage!    │
     │             │              │              │              │              │
     │             │              │              │ STEP 18: Boltz settles hold invoice
     │             │              │              │              │              │
     │             │              │              ├──────────────►              │
     │             │              │              │ Settle invoice:              │
     │             │              │              │ lnbc100u1...  │              │
     │             │              │              │ preimage:     │              │
     │             │              │              │ deadbeef...   │              │
     │             │              │              │              │              │
     │             │              │              │              │ STEP 19: Preimage propagates back
     │             │              │              │              │              │
     │             │              │              │              │ • HTLCs settle│
     │             │              │              │              │   along route │
     │             │              │              │              │ • Each hop    │
     │             │              │              │              │   learns      │
     │             │              │              │              │   preimage    │
     │             │              │              │              │              │
     │◄────────────────────────────────────────────────────────┤              │
     │ Payment successful!       │              │              │              │
     │ • Amount: 10,000 sats     │              │              │              │
     │ • Preimage: deadbeef...   │              │              │              │
     │                           │              │              │              │
     │             │              │ STEP 20: Boltz Backend updates swap status │
     │             │              │              │              │              │
     │             │              │ Database.update({           │              │
     │             │              │   swap_id: "swap_rev456",   │              │
     │             │              │   status: "success",        │              │
     │             │              │   claim_txid: "claim_tx_999"│              │
     │             │              │ })             │              │              │
     │             │              │              │              │              │
     │             │              │ Notify Alice via WebSocket: │              │
     │             │              │              │              │              │
     │             │◄────────────┤              │              │              │
     │             │ WebSocket:   │              │              │              │
     │             │ {            │              │              │              │
     │             │   "swap_id": "swap_rev456", │              │              │
     │             │   "status": "success",      │              │              │
     │             │   "txid": "claim_tx_999"    │              │              │
     │             │ }              │              │              │              │
     │             │              │              │              │              │
     │             │ STEP 21: Alice's Arkade UI updates                       │
     │             │              │              │              │              │
     │             │ Service Worker detects VTXO change                        │
     │             │ • Reloads wallet                                          │
     │             │ • Updates balance: +10,000 sats                           │
     │             │ • Shows success notification                              │
     │             │              │              │              │              │
     ▼             ▼              ▼              ▼              ▼              ▼
     │             │              │              │              │              │
     │ ✅ SWAP COMPLETE          │              │              │              │
     │             │              │              │              │              │
     │ Bob paid: 10,000 sats (Lightning)                      │              │
     │ Alice received: 10,000 sats - fees (Ark VTXOs)         │              │
     │ Boltz earned: swap fee                                  │              │
     │             │              │              │              │              │
```

### Timeline with Durations

```
T=0s    Alice requests reverse swap in Arkade
        └─► User action

T=1s    Alice's Arkade generates preimage
        └─► Cryptographic random (< 100ms)

T=2s    Alice's Arkade calls Boltz API
        └─► Network call (< 500ms)

T=3s    Boltz Backend creates hold invoice
        └─► Generate invoice (< 200ms)

T=4s    Alice shares invoice with Bob
        └─► User action (QR code, copy/paste)

T=10s   Bob pays Lightning invoice
        └─► User action

T=12s   Lightning payment routes to Boltz
        └─► 1-10 seconds (network routing)

T=15s   Boltz LND receives payment (held)
        └─► Payment held, not settled

T=16s   Boltz Fulmine locks funds in VHTLC on Ark
        └─► Submit transaction to arkd (< 500ms)

T=17s   Wait for Ark round
        └─► 5-20 seconds

T=25s   VHTLC created and confirmed
        └─► Alice's Arkade detects via WebSocket

T=26s   Alice's Arkade claims VHTLC with preimage
        └─► Submit claim transaction (< 500ms)

T=27s   arkd verifies preimage and co-signs
        └─► Verification + signing (< 500ms)

T=28s   Claim finalized, VTXOs transferred to Alice
        └─► Immediate or next round

T=29s   Boltz extracts preimage from claim
        └─► Monitor arkd for claim transaction

T=30s   Boltz settles hold invoice with preimage
        └─► Release held payment (< 500ms)

T=31s   Preimage propagates back through Lightning
        └─► HTLCs settle along route (< 2s)

T=33s   Bob's payment confirmed successful
        └─► LN wallet updates

T=35s   ✅ SWAP COMPLETE (total ~35 seconds)
```

### Balance Changes

**Alice (receiver):**
```
Before:   50,000 sats (Ark VTXOs)
After:    59,500 sats (Ark VTXOs)
         +10,000 sats (payment from Bob via Boltz)
            -500 sats (Boltz swap fee)
```

**Bob (sender):**
```
Before:   100,000 sats (Lightning channels)
After:     89,900 sats (Lightning channels)
          -10,000 sats (payment to Alice)
             -100 sats (Lightning routing fees)
```

**Boltz:**
```
Before:  510,500 sats (Ark VTXOs from previous swap)
After:   500,500 sats (Ark VTXOs)
         -10,000 sats (locked in VHTLC for Alice)
         +10,000 sats (received from Bob via Lightning)

Net earnings: +500 sats (0.5% swap fee)
```

---

## Failure Scenarios and Recovery

### Scenario A: Submarine Swap - Lightning Payment Fails

**What happens:**
Boltz cannot route payment to Bob's LN node (no route, insufficient liquidity, node offline).

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  Alice   │  │ Fulmine  │  │  Boltz   │  │   arkd   │
│ (Arkade) │  │          │  │ Backend  │  │ Server   │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │              │              │
     │ 1. VHTLC created and funded               │
     │             │              │              │
     │             │              ├──────────────►
     │             │              │ Try to pay   │
     │             │              │ invoice      │
     │             │              │              │
     │             │              │ ❌ NO ROUTE  │
     │             │              │    FOUND     │
     │             │              │              │
     │             │◄─────────────┤              │
     │             │ WebSocket:   │              │
     │             │ "swap.failed"│              │
     │             │              │              │
     │             │ RECOVERY: Cooperative Refund
     │             │              │              │
     │             ├──────────────►              │
     │             │ Request refund:              │
     │             │ POST /refund │              │
     │             │              │              │
     │             │              │ Boltz signs  │
     │             │              │ refund tx    │
     │             │              │              │
     │             │◄─────────────┤              │
     │             │ Boltz sig    │              │
     │             │              │              │
     │             ├──────────────────────────────►
     │             │ SubmitTransaction(          │
     │             │   refund_tx,                │
     │             │   sigs: [alice, boltz, arkd]│
     │             │ )              │              │
     │             │              │              │
     │             │◄─────────────────────────────┤
     │             │ Refund successful            │
     │             │              │              │
     │ ✅ Funds returned to Alice │              │
     │    (minus Ark round fee)   │              │
     │             │              │              │
```

**Timeline:**
- Failure detected: ~15-30 seconds (after Lightning routing attempts)
- Cooperative refund: ~5-10 seconds
- Total: ~20-40 seconds from swap initiation

**Alternative: Unilateral Refund (if Boltz unresponsive)**

```
     │             │              │              │
     │ Cooperative refund failed  │              │
     │             │              │              │
     │ WAIT FOR TIMEOUT (RefundLocktime = 144 blocks ≈ 24 hours)
     │             │              │              │
     │ After 24 hours:            │              │
     │             │              │              │
     │             ├──────────────────────────────►
     │             │ POST /api/v1/vhtlc/refundWithoutReceiver
     │             │ {                            │
     │             │   "preimage_hash": "abc..."  │
     │             │ }              │              │
     │             │              │              │
     │             │              │ • Verify timeout passed│
     │             │              │ • Create refund tx     │
     │             │              │ • Sign: alice + arkd   │
     │             │              │   (no Boltz needed)    │
     │             │              │              │
     │             │◄─────────────────────────────┤
     │             │ Refund successful            │
     │             │              │              │
     │ ✅ Funds returned after 24h│              │
     │             │              │              │
```

### Scenario B: Reverse Swap - Bob Doesn't Claim

**What happens:**
Bob's Fulmine crashes or goes offline before claiming VHTLC. Alice already paid Lightning invoice.

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  Alice   │  │   Bob    │  │  Boltz   │  │   arkd   │
│   (LN)   │  │ Fulmine  │  │ Backend  │  │ Server   │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │              │              │
     │ Alice paid Lightning invoice              │
     │             │              │              │
     │             │              │ Hold invoice │
     │             │              │ (waiting)    │
     │             │              │              │
     │             │              │ VHTLC locked │
     │             │              │ on Ark       │
     │             │              │              │
     │             │ ❌ Bob's Fulmine              │
     │             │    CRASHED    │              │
     │             │              │              │
     │ WAIT FOR TIMEOUT (144 blocks ≈ 24 hours)  │
     │             │              │              │
     │ After 24 hours:            │              │
     │             │              │              │
     │             │              ├──────────────►
     │             │              │ Refund VHTLC │
     │             │              │ (no claim)   │
     │             │              │              │
     │             │              │ • Create refund tx   │
     │             │              │ • Sign: boltz + arkd │
     │             │              │              │
     │             │              │◄─────────────┤
     │             │              │ Refund OK    │
     │             │              │              │
     │             │              │ Boltz gets   │
     │             │              │ funds back   │
     │             │              │              │
     │             │              │ Cancel hold  │
     │             │              │ invoice      │
     │             │              │              │
     │◄────────────────────────────┤              │
     │ Payment failed (after 24h)  │              │
     │             │              │              │
     │ ⚠️  Alice's payment returned │              │
     │     (but delayed 24 hours)  │              │
     │             │              │              │
```

**User Error - Bob's Responsibility:**
- Bob initiated reverse swap
- Bob received invoice
- Bob is responsible for monitoring and claiming
- If Bob doesn't claim, he doesn't receive funds
- Alice's payment will be refunded after timeout

**Best Practice:**
- Bob's Fulmine should monitor continuously
- Set up alerts for pending swaps
- Don't request reverse swap if Fulmine might go offline

### Scenario C: Network Partition During Submarine Swap

**What happens:**
Alice's Fulmine loses connection to arkd while VHTLC is pending.

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  Alice   │  │ Fulmine  │  │  Boltz   │  │   arkd   │
│ (Arkade) │  │          │  │ Backend  │  │ Server   │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │              │              │
     │ VHTLC transaction submitted                │
     │             │              │              │
     │             ├──────────────────────────────X
     │             │ Network      │              │
     │             │ partition!   │              │
     │             │              │              │
     │             │ ❌ Connection lost           │
     │             │              │              │
     │ UI shows: "Swap pending..."│              │
     │             │              │              │
     │             │              │ Meanwhile:   │
     │             │              │              │
     │             │              │              │ • Round finalizes│
     │             │              │              │ • VHTLC created  │
     │             │              │              │              │
     │             │              │ Boltz pays   │              │
     │             │              │ invoice OK   │              │
     │             │              │              │              │
     │             │              │ Boltz claims │              │
     │             │              │ VHTLC OK     │              │
     │             │              │              │              │
     │ SWAP ACTUALLY SUCCEEDED!   │              │              │
     │ (But Alice doesn't know)   │              │              │
     │             │              │              │              │
     │             │ Network restored             │              │
     │             │              │              │              │
     │             ├──────────────────────────────►
     │             │ Reconnect    │              │
     │             │              │              │
     │             │ Query swap status:           │
     │             │ GET /swap/xyz789             │
     │             │              │              │
     │             │◄─────────────┤              │
     │             │ Status: "success"            │
     │             │              │              │
     │             │ Reload wallet:               │
     │             │ Balance decreased correctly  │
     │             │              │              │
     │ ✅ Swap completed despite network issue    │
     │             │              │              │
```

**Key Point:**
- Swap continues even if Alice's Fulmine disconnects
- arkd and Boltz are independent
- On reconnection, Fulmine queries status
- Balance reflects correct state

---

## Message Sequences

### Submarine Swap - Message Sequence Diagram

```
Alice     Fulmine    Boltz     LN Net    arkd
  │          │         │         │         │
  │ Invoice  │         │         │         │
  ├─────────►│         │         │         │
  │          │         │         │         │
  │          │ Create  │         │         │
  │          ├────────►│         │         │
  │          │         │         │         │
  │          │◄────────┤         │         │
  │          │ Params  │         │         │
  │          │         │         │         │
  │          │         │         │   Lock  │
  │          ├─────────────────────────────►
  │          │         │         │   VHTLC │
  │          │         │         │         │
  │          │◄────────────────────────────┤
  │          │         │         │    TxID │
  │          │         │         │         │
  │          │         │◄────────┤         │
  │          │         │ Detect  │         │
  │          │         │ VHTLC   │         │
  │          │         │         │         │
  │          │         │  Pay    │         │
  │          │         ├────────►│         │
  │          │         │ Invoice │         │
  │          │         │         │         │
  │          │         │◄────────┤         │
  │          │         │Preimage │         │
  │          │         │         │         │
  │          │         │         │   Claim │
  │          │         ├─────────────────►│
  │          │         │         │  +Preimg│
  │          │         │         │         │
  │◄─────────┤         │         │         │
  │ Success  │         │         │         │
  │          │         │         │         │
```

### Reverse Swap - Message Sequence Diagram

```
Alice     Bob       Fulmine    Boltz     arkd
  │        │           │         │         │
  │        │ Request   │         │         │
  │        ├──────────►│         │         │
  │        │  Reverse  │         │         │
  │        │           │         │         │
  │        │           │ Create  │         │
  │        │           ├────────►│         │
  │        │           │+Preimg  │         │
  │        │           │  Hash   │         │
  │        │           │         │         │
  │        │           │◄────────┤         │
  │        │           │ Invoice │         │
  │        │           │         │         │
  │        │◄──────────┤         │         │
  │        │  Invoice  │         │         │
  │        │           │         │         │
  │  Pay   │           │         │         │
  ├───────►│           │         │         │
  │Invoice │           │         │         │
  │        │           │         │         │
  │        │         LN Payment  │         │
  ├─────────────────────────────►│         │
  │        │           │  (Held) │         │
  │        │           │         │         │
  │        │           │         │   Lock  │
  │        │           │         ├────────►│
  │        │           │         │  VHTLC  │
  │        │           │         │         │
  │        │           │◄────────┤         │
  │        │           │ Detect  │         │
  │        │           │ VHTLC   │         │
  │        │           │         │         │
  │        │           │         │  Claim  │
  │        │           ├─────────────────►│
  │        │           │         │ +Preimg │
  │        │           │         │         │
  │        │           │         │◄────────┤
  │        │           │         │ Extract │
  │        │           │         │ Preimg  │
  │        │           │         │         │
  │        │         Settle w/ Preimage    │
  │◄───────────────────────────┤         │
  │ Payment OK       │         │         │
  │        │           │         │         │
  │        │◄──────────┤         │         │
  │        │  Success  │         │         │
  │        │           │         │         │
```

---

## State Machines

### Submarine Swap State Machine

```
┌─────────────┐
│   PENDING   │  ← Swap initiated, VHTLC being created
└──────┬──────┘
       │
       ├──► [VHTLC Created] ──────────────────┐
       │                                      │
       │                                      ▼
       │                            ┌─────────────────┐
       │                            │ VHTLC_CONFIRMED │
       │                            └────────┬────────┘
       │                                     │
       │                                     ├──► [Boltz pays invoice]
       │                                     │
       │                                     │
       │                                     ▼
       │                            ┌─────────────────┐
       │                            │ INVOICE_SETTLED │
       │                            └────────┬────────┘
       │                                     │
       │                                     ├──► [Boltz claims VHTLC]
       │                                     │
       │                                     ▼
       │                            ┌─────────────────┐
       │                            │    SUCCESS      │ ✅ Final state
       │                            └─────────────────┘
       │
       │
       ├──► [Invoice payment fails] ────────┐
       │                                     │
       │                                     ▼
       │                            ┌─────────────────┐
       │                            │  REFUND_NEEDED  │
       │                            └────────┬────────┘
       │                                     │
       │                                     ├──► [Cooperative refund]
       │                                     │
       │                                     ▼
       │                            ┌─────────────────┐
       │                            │    REFUNDED     │ ⚠️  Final state
       │                            └─────────────────┘
       │
       │
       └──► [Timeout] ──────────────────────┐
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │     EXPIRED     │ ❌ Final state
                                    └─────────────────┘
```

### Reverse Swap State Machine

```
┌─────────────┐
│   PENDING   │  ← Reverse swap initiated, preimage generated
└──────┬──────┘
       │
       ├──► [Invoice provided to payer] ─────┐
       │                                     │
       │                                     ▼
       │                            ┌─────────────────┐
       │                            │ INVOICE_PROVIDED│
       │                            └────────┬────────┘
       │                                     │
       │                                     ├──► [Payer pays invoice]
       │                                     │
       │                                     ▼
       │                            ┌─────────────────┐
       │                            │ INVOICE_PAID    │
       │                            └────────┬────────┘
       │                                     │
       │                                     ├──► [Boltz locks VHTLC]
       │                                     │
       │                                     ▼
       │                            ┌─────────────────┐
       │                            │ VHTLC_LOCKED    │
       │                            └────────┬────────┘
       │                                     │
       │                                     ├──► [Receiver claims VHTLC]
       │                                     │
       │                                     ▼
       │                            ┌─────────────────┐
       │                            │ VHTLC_CLAIMED   │
       │                            └────────┬────────┘
       │                                     │
       │                                     ├──► [Boltz settles invoice]
       │                                     │
       │                                     ▼
       │                            ┌─────────────────┐
       │                            │    SUCCESS      │ ✅ Final state
       │                            └─────────────────┘
       │
       │
       ├──► [Receiver doesn't claim] ───────┐
       │                                     │
       │                                     ▼
       │                            ┌─────────────────┐
       │                            │  CLAIM_TIMEOUT  │
       │                            └────────┬────────┘
       │                                     │
       │                                     ├──► [Boltz refunds VHTLC]
       │                                     │
       │                                     ▼
       │                            ┌─────────────────┐
       │                            │  BOLTZ_REFUNDED │
       │                            └────────┬────────┘
       │                                     │
       │                                     ├──► [Cancel hold invoice]
       │                                     │
       │                                     ▼
       │                            ┌─────────────────┐
       │                            │  PAYMENT_FAILED │ ⚠️  Final state
       │                            └─────────────────┘
       │
       │
       └──► [Invoice expires unpaid] ────────┐
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │     EXPIRED     │ ❌ Final state
                                    └─────────────────┘
```

---

## Technical Deep Dive

### VHTLC Structure Comparison

**Submarine Swap VHTLC:**
```
Sender: Alice (wants to pay Lightning)
Receiver: Boltz (will claim after paying Lightning)
Server: arkd

Claim Path:
  Boltz reveals preimage (learned from Lightning payment)
  + Boltz signature
  + arkd signature
  → Boltz receives Ark VTXOs

Refund Path (if Lightning payment fails):
  Alice signature
  + Boltz signature (cooperative)
  + arkd signature
  OR
  Alice signature
  + arkd signature (after timeout)
  → Alice recovers funds
```

**Reverse Swap VHTLC:**
```
Sender: Boltz (locks funds for receiver)
Receiver: Bob (will claim with preimage)
Server: arkd

Claim Path:
  Bob reveals preimage (generated by Fulmine)
  + Bob signature
  + arkd signature
  → Bob receives Ark VTXOs
  → Boltz learns preimage from claim
  → Boltz settles Lightning payment with preimage

Refund Path (if Bob doesn't claim):
  Boltz signature
  + arkd signature (after timeout)
  → Boltz recovers funds
  → Hold invoice canceled
```

### Preimage Lifecycle

**Submarine Swap:**
```
1. Bob's LND generates preimage when creating invoice
   preimage = random(32 bytes)
   hash = SHA256(preimage)

2. Invoice includes payment hash:
   lnbc100u1...p=<hash>...

3. Alice's Fulmine extracts hash from invoice

4. VHTLC created with hash

5. Boltz pays Lightning invoice

6. Lightning network routes payment using hash

7. Bob's LND reveals preimage to claim payment

8. Preimage propagates back through Lightning route

9. Boltz learns preimage from Lightning payment

10. Boltz uses preimage to claim VHTLC on Ark
```

**Reverse Swap:**
```
1. Bob's Fulmine generates preimage
   preimage = random(32 bytes)
   hash = RIPEMD160(SHA256(preimage))

2. Fulmine sends hash to Boltz (keeps preimage secret!)

3. Boltz creates hold invoice with hash

4. Alice pays Lightning invoice with hash

5. Boltz's LND holds payment (doesn't settle)

6. Boltz locks funds in VHTLC on Ark with hash

7. Bob's Fulmine detects VHTLC funding

8. Bob's Fulmine claims VHTLC with preimage

9. Preimage appears in claim transaction witness

10. Boltz extracts preimage from Ark transaction

11. Boltz settles hold invoice with preimage

12. Alice's Lightning payment completes
```

### Hash Functions

**Lightning (BOLT-11):**
- Uses `SHA256(preimage)` for payment hash
- 32-byte preimage → 32-byte hash

**Ark VHTLC (Arkade/Fulmine):**
- Uses `RIPEMD160(SHA256(preimage))` for VHTLC hash
- 32-byte preimage → 32-byte SHA256 → 20-byte RIPEMD160
- Matches Lightning invoice hash format
- Saves 12 bytes in Bitcoin script

**Compatibility:**
```
Lightning Invoice:
  payment_hash = SHA256(preimage)

Ark VHTLC:
  vhtlc_hash = RIPEMD160(SHA256(preimage))

When claiming:
  Reveal preimage in VHTLC witness
  → Anyone can verify: RIPEMD160(SHA256(preimage)) == vhtlc_hash
  → Boltz extracts preimage
  → Boltz verifies: SHA256(preimage) == payment_hash
  → Compatible!
```

### Atomic Swap Guarantees

**Submarine Swap:**
```
Alice's Guarantee:
  IF Boltz pays Lightning invoice (Bob receives payment)
  THEN Boltz learns preimage
  THEN Boltz can claim VHTLC
  → Alice paid Bob via Lightning ✓

  IF Boltz doesn't pay Lightning invoice
  THEN Boltz doesn't learn preimage
  THEN Boltz cannot claim VHTLC
  THEN Alice refunds VHTLC after timeout
  → Alice keeps her funds ✓

No scenario where Alice loses funds without Bob receiving payment.
```

**Reverse Swap:**
```
Bob's Guarantee:
  IF Alice pays Lightning invoice
  THEN Boltz receives payment (held)
  THEN Boltz locks funds in VHTLC
  THEN Bob claims VHTLC with preimage
  THEN Boltz learns preimage from claim
  THEN Boltz settles hold invoice
  → Bob received funds, Alice's payment confirmed ✓

  IF Alice doesn't pay Lightning invoice
  THEN Boltz doesn't lock funds in VHTLC
  → No funds moved ✓

  IF Boltz locks funds but Bob doesn't claim
  THEN Boltz refunds after timeout
  THEN Alice's hold invoice canceled
  → Alice's funds returned (Bob's fault) ⚠️

No scenario where Alice loses funds without Bob receiving.
Scenario where Bob doesn't receive: Bob's responsibility to claim.
```

### Security Analysis

**Can Boltz steal funds?**

**Submarine Swap:**
```
NO. Boltz can only claim VHTLC if they have the preimage.
Preimage only obtained by paying Lightning invoice.
If Boltz doesn't pay Lightning invoice, Alice refunds after timeout.
```

**Reverse Swap:**
```
NO. Boltz locks their own funds in VHTLC.
Bob claims with preimage generated by Fulmine.
Boltz only learns preimage after Bob claims.
Boltz cannot claim without Bob's preimage.
```

**Can Alice/Bob double-spend?**

**Submarine Swap:**
```
NO. Alice sends funds to VHTLC on Ark.
VHTLC can only be spent by:
  - Boltz (with preimage) OR
  - Alice (refund after timeout)
Alice cannot spend VHTLC while it's locked.
```

**Reverse Swap:**
```
NO. Boltz locks funds in VHTLC on Ark.
VHTLC can only be spent by:
  - Bob (with preimage) OR
  - Boltz (refund after timeout)
Boltz cannot reclaim while VHTLC is claimable by Bob.
```

**Can arkd censor transactions?**

```
YES, but limited impact.

arkd can refuse to co-sign:
  - VHTLC creation (Alice/Boltz won't proceed)
  - VHTLC claim (triggers unilateral paths)
  - VHTLC refund (triggers unilateral paths)

Unilateral paths (without arkd):
  - After CSV delay (512-2048 seconds)
  - User can exit without arkd cooperation
  - Worst case: Funds locked for ~34 minutes

Users should monitor for arkd censorship.
If detected, exit Ark entirely (unilateral exit).
```

---

## Summary

### Key Takeaways

1. **Submarine Swap (Ark → Lightning)**
   - Alice pays Bob's Lightning invoice using Ark VTXOs
   - Boltz coordinates: creates VHTLC, pays invoice, claims VHTLC
   - Preimage flows: Bob → Lightning → Boltz → VHTLC claim
   - Total time: ~30 seconds

2. **Reverse Swap (Lightning → Ark)**
   - Bob receives Lightning payment into Arkade wallet
   - Fulmine generates preimage, Boltz creates hold invoice
   - Alice pays invoice, Boltz locks VHTLC, Bob claims with preimage
   - Preimage flows: Fulmine → VHTLC claim → Boltz → Lightning settlement
   - Total time: ~35 seconds

3. **Atomic Guarantees**
   - No trust in Boltz required
   - HTLCs ensure: payment succeeds XOR refunds
   - Worst case: Funds locked for timeout period (~24 hours)
   - Best case: Instant swap with collaborative paths

4. **Failure Recovery**
   - Submarine fail: Cooperative or unilateral refund
   - Reverse fail: Boltz refunds, hold invoice canceled
   - Network partition: Swap continues, sync on reconnect
   - Timeout: Automatic refund paths activated

5. **Security Model**
   - Trustless: Cryptographic guarantees (HTLCs)
   - Atomic: All-or-nothing execution
   - Recoverable: Multiple refund paths
   - Censor-resistant: Unilateral exit options

---

**Document created**: 2025-10-28
**Location**: `/Users/dusansekulic/Desktop/arkade-fulmine-boltz-complete-flows.md`
