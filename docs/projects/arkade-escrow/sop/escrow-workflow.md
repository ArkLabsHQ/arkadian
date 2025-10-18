# Escrow Workflow

Complete lifecycle walkthrough from request creation to settlement.

## Overview

The escrow system uses a state machine with the following transitions:

```
draft → created → funded → pending-execution → completed
  ↓         ↓        ↓            ↓
  └─────────┴────────┴────────────→ (canceled/rejected)
                     ↓
              under-arbitration → pending-execution → completed
```

## State Definitions

- **draft**: Contract created but not yet accepted by counterparty
- **created**: Both parties agreed, Ark address generated, awaiting funding
- **funded**: VTXOs detected at contract Ark address
- **pending-execution**: Transaction created, collecting signatures
- **completed**: Transaction submitted to Ark server successfully
- **under-arbitration**: Dispute opened, awaiting arbitrator decision

## Creating Escrow Request

### Receiver-Side Request

**Endpoint**: `POST /api/v1/escrows/requests`

```json
{
  "side": "receiver",
  "amount": 12345,
  "description": "Payment for services",
  "public": true
}
```

**Response**:
```json
{
  "externalId": "abc123def456",
  "shareUrl": "http://localhost:3000/escrows/requests/abc123def456"
}
```

**Generated ID**: 16-character nanoid (0-9a-z alphabet)

### Sender-Side Request

**Endpoint**: `POST /api/v1/escrows/requests`

```json
{
  "side": "sender",
  "amount": 12345,
  "description": "Purchase XYZ product",
  "public": false
}
```

**Public vs Private**:
- `public: true`: Appears in orderbook, anyone can create contracts
- `public: false`: Only creator sees it, must share URL manually

## Creating Contract from Request

### Draft Contract Creation

Counterparty creates draft contract from request:

**Endpoint**: `POST /api/v1/escrows/contracts`

```json
{
  "requestId": "abc123def456"
}
```

**Response**:
```json
{
  "externalId": "contract789xyz",
  "requestId": "abc123def456",
  "senderPublicKey": "9a99c66a064f18f9...",
  "receiverPublicKey": "b1a2c3d4e5f6...",
  "amount": 12345,
  "status": "draft",
  "createdAt": 1697123456789,
  "updatedAt": 1697123456789
}
```

**Authorization**: JWT token with sender/receiver public key

### Accepting Draft Contract

Counterparty accepts to transition `draft → created`:

**Endpoint**: `POST /api/v1/escrows/contracts/{contractId}/accept`

**No body required**

**Response**:
```json
{
  "externalId": "contract789xyz",
  "requestId": "abc123def456",
  "amount": 12345,
  "status": "created",
  "arkAddress": "ark1qxyz...abc",
  "createdAt": 1697123456789,
  "updatedAt": 1697123456790
}
```

**Critical**: `arkAddress` is generated here using:
- Sender public key
- Receiver public key
- Arbitrator public key (from `ARBITRATOR_PUB_KEY` env var)
- Contract nonce: `{contractId}{requestId}`

### Rejecting Draft Contract

**Endpoint**: `POST /api/v1/escrows/contracts/{contractId}/reject`

```json
{
  "reason": "Changed my mind"
}
```

**State Transition**:
- Creator rejection: `draft → canceled-by-creator`
- Counterparty rejection: `draft → rejected-by-counterparty`

**Effect**: Stops funding watcher, prevents further actions

## Funding Detection

### FundingWatcherService

Automatically polls for VTXOs at contract Ark addresses:

**Trigger**: Emitted `CONTRACT_CREATED` event starts watching

**Polling Parameters**:
- Tick interval: 2000ms (2 seconds)
- Batch size: 64 addresses per tick
- Concurrency: 8 concurrent provider calls
- Default backoff: 5000ms between checks per address
- Max backoff: 60000ms on repeated errors

**Detection Logic**:
1. Queries Ark server for spendable VTXOs at `arkAddress`
2. Compares with `lastKnownVtxoIds` (set of `txid:vout`)
3. If new VTXO found, emits `CONTRACT_FUNDED` event

**Automatic State Transition**:
```
created → funded
```

**Event Handler**: `EscrowsContractsService.onContractFunded()`

**Database Update**:
```typescript
{
  status: "funded",
  virtualCoins: [
    { txid: "abc...", vout: 0, value: 12345 }
  ]
}
```

### Manual Funding

Sender funds contract via Ark offchain transfer:

```bash
# Using Nigiri Ark CLI
nigiri ark send --to ark1qxyz...abc --amount 12345 --password secret
```

**Verification**:
```bash
# Check contract status via API
GET /api/v1/escrows/contracts/{contractId}

# Look for status: "funded" and virtualCoins array
```

## Execution Paths

### Direct Settlement (Happy Path)

Receiver initiates direct settlement to their Ark address:

**Endpoint**: `POST /api/v1/escrows/contracts/{contractId}/execute`

```json
{
  "arkAddress": "ark1receiver..."
}
```

**Preconditions**:
- Contract status: `funded`
- Initiator: Must be receiver
- VTXOs: At least one VTXO present

**Response**:
```json
{
  "externalId": "exec123abc",
  "contractId": "contract789xyz",
  "arkTx": "base64-encoded-psbt...",
  "checkpoints": ["checkpoint1-psbt...", "checkpoint2-psbt..."],
  "vtxo": { "txid": "abc...", "vout": 0, "value": 12345 }
}
```

**State Transition**: `funded → pending-execution`

**Execution Record Created**:
```typescript
{
  action: "direct-settle",
  status: "pending-initiator-signature",
  initiatedByPubKey: receiverPubKey,
  transaction: {
    vtxo: {...},
    arkTx: "base64-psbt",
    checkpoints: ["..."],
    requiredSigners: ["receiver", "sender"],
    approvedByPubKeys: [],
    rejectedByPubKeys: []
  }
}
```

### Multi-Sig Collection

**Step 1: Initiator Signs (Receiver)**

**Endpoint**: `PATCH /api/v1/escrows/contracts/{contractId}/executions/{executionId}`

```json
{
  "arkTx": "base64-signed-psbt",
  "checkpoints": ["signed-checkpoint1", "signed-checkpoint2"]
}
```

**Verification**:
- Tapscript signature verification at input 0
- Must match initiator public key
- Execution status: `pending-initiator-signature`

**Transition**: `pending-initiator-signature → pending-counterparty-signature`

**Step 2: Counterparty Signs (Sender)**

Same endpoint, sender provides their signatures:

```json
{
  "arkTx": "base64-signed-psbt-with-both-sigs",
  "checkpoints": ["fully-signed-checkpoint1", "..."]
}
```

**Transition**: `pending-counterparty-signature → pending-server-confirmation`

**Step 3: Automatic Submission**

When counterparty signs, service automatically:

1. Submits transaction to Ark server via `ArkService.executeEscrowTransaction()`
2. Updates execution status: `pending-server-confirmation → executed`
3. Updates contract status: `pending-execution → completed`

**Transaction Submission**:
```typescript
await arkService.executeEscrowTransaction({
  arkTx: Transaction.fromPSBT(base64.decode(arkTx)),
  checkpoints: checkpoints.map(c => Transaction.fromPSBT(base64.decode(c))),
  requiredSigners: ["receiver", "sender"]
});
```

### Release Funds (Arbitration)

Arbitrator decides to release funds to receiver:

**Triggered After**: Arbitration resolved with verdict "release"

**Endpoint**: `POST /api/v1/escrows/arbitrations/{arbitrationId}/execute`

```json
{
  "arkAddress": "ark1receiver..."
}
```

**Execution Flow**:
```typescript
{
  action: "release-funds",
  status: "pending-counterparty-signature",  // Arbitrator pre-signed
  initiatedByPubKey: arbitratorPubKey,
  transaction: {
    requiredSigners: ["receiver"],
    approvedByPubKeys: [arbitratorPubKey]  // Pre-approved
  }
}
```

**Only receiver signature required** (arbitrator + receiver = 2-of-3 multisig)

### Refund (Arbitration)

Arbitrator decides to refund sender:

**Status**: Not yet implemented (throws `NotImplementedException`)

**Future Implementation**:
- Similar to release, but funds go to sender
- Required signers: `["sender"]`
- Arbitrator pre-signs

## Cancellation Scenarios

### Before Funding

**Cancel Draft**: Reject contract before acceptance
```
draft → canceled-by-creator (if creator cancels)
draft → rejected-by-counterparty (if counterparty rejects)
```

**Effect**: Stops state machine, prevents funding watcher

### After Funding

**Open Dispute**: Only path after funding
```
funded → under-arbitration
```

Cannot cancel directly once funded. Must use arbitration.

### During Execution

**Arbitrator Override**: Arbitrator can cancel pending executions
```sql
UPDATE contract_executions
SET status = 'canceled-by-arbitrator'
WHERE status IN ('pending-initiator-signature',
                 'pending-counterparty-signature',
                 'pending-server-confirmation')
```

**Effect**: Allows creating new arbitration execution

## Verification Steps

### After Each State Transition

**Check Contract Status**:
```bash
GET /api/v1/escrows/contracts/{contractId}
```

**Expected Fields**:
- `status`: Should match expected state
- `arkAddress`: Present after `created`
- `virtualCoins`: Populated after `funded`
- `updatedAt`: Should be recent timestamp

### Before Execution

**Verify Funding**:
```bash
# Contract must have virtualCoins array
{
  "virtualCoins": [
    { "txid": "...", "vout": 0, "value": 12345 }
  ],
  "status": "funded"
}
```

**Check Executions**:
```bash
GET /api/v1/escrows/contracts/{contractId}/executions

# Should return empty array or only completed/canceled executions
# No pending executions allowed
```

### After Completion

**Verify Final State**:
```bash
GET /api/v1/escrows/contracts/{contractId}

# Expected:
{
  "status": "completed",
  "virtualCoins": []  // VTXOs spent
}
```

**Check Execution Record**:
```bash
GET /api/v1/escrows/contracts/{contractId}/executions/{executionId}

# Expected:
{
  "status": "executed",
  "transaction": {
    "approvedByPubKeys": ["receiver-pubkey", "sender-pubkey"]
  }
}
```
