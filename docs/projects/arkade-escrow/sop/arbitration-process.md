# Arbitration Process

Dispute resolution procedures for escrow contracts.

## Overview

Arbitration provides a 2-of-3 multisig escape path when parties cannot agree on settlement. The arbitrator (configured via `ARBITRATOR_PUB_KEY`) can decide to release funds to receiver or refund sender.

## Multisig Structure

**Contract Parties**:
- Sender public key
- Receiver public key
- Arbitrator public key (from environment)

**Transaction Requirements**:
- Direct settlement: Sender + Receiver signatures
- Release via arbitration: Receiver + Arbitrator signatures
- Refund via arbitration: Sender + Arbitrator signatures
- Unilateral exit: After timelock expiry (future)

## Opening Dispute

### Eligibility

**Who Can Dispute**:
- Sender
- Receiver

**When**:
- Contract status: `funded` or `pending-execution`
- Cannot dispute `completed`, `draft`, or canceled contracts

**Endpoint**: `POST /api/v1/escrows/contracts/{contractId}/dispute`

```json
{
  "reason": "Seller did not deliver goods as described"
}
```

**Authorization**: JWT token of claimant (sender or receiver)

### Contract State Transition

```
funded → under-arbitration
pending-execution → under-arbitration
```

**Database Changes**:

**Contract**:
```sql
UPDATE escrow_contracts
SET status = 'under-arbitration'
WHERE externalId = '{contractId}';
```

**Arbitration Record Created**:
```typescript
{
  externalId: "arb123xyz",
  contractId: "contract789",
  claimantPubkey: "9a99c66a...",  // Who opened dispute
  defendantPubkey: "b1a2c3d4...",  // Counterparty
  reason: "Seller did not deliver...",
  status: "pending",
  verdict: null
}
```

**Response**:
```json
{
  "externalId": "arb123xyz",
  "contractId": "contract789",
  "claimantPublicKey": "9a99c66a...",
  "defendantPublicKey": "b1a2c3d4...",
  "reason": "Seller did not deliver...",
  "status": "pending",
  "createdAt": 1697123456789,
  "updatedAt": 1697123456789
}
```

### Automatic Execution Invalidation

When dispute opens, all pending executions are canceled:

```sql
UPDATE contract_executions
SET status = 'canceled-by-arbitrator'
WHERE contractId = '{contractId}'
  AND status IN ('pending-initiator-signature',
                 'pending-counterparty-signature',
                 'pending-server-confirmation');
```

**Effect**: Prevents parties from executing while under arbitration

## Arbitrator Decision-Making

### Admin Endpoint Access

**Endpoint**: `POST /api/v1/admin/contracts/{contractId}/arbitrations/{arbitrationId}/arbitrate`

**Authentication**: Admin-only endpoint (implementation TBD)

**Request Body**:
```json
{
  "action": "settle"
}
```

**OR**

```json
{
  "action": "refund"
}
```

### Preconditions Validation

**Contract Must Be**:
- Status: `under-arbitration`
- Has matching arbitration record

**Arbitration Must Be**:
- Status: `pending`

**No Successful Executions**:
```sql
SELECT COUNT(*) FROM contract_executions
WHERE contractId = '{contractId}'
  AND status = 'executed';
-- Must return 0
```

If successful execution exists, arbitration is blocked (conflict error).

### Arbitration Actions

**Action: "settle"** (Release to Receiver)

**Database Update**:
```typescript
{
  status: "resolved",
  verdict: "release"
}
```

**Effect**: Receiver can now execute with arbitrator's pre-signature

**Action: "refund"** (Refund to Sender)

**Database Update**:
```typescript
{
  status: "resolved",
  verdict: "refund"
}
```

**Status**: Not fully implemented (throws `NotImplementedException` on execution)

**Response**:
```json
{
  "externalId": "arb123xyz",
  "contractId": "contract789",
  "status": "resolved",
  "verdict": "release",
  "updatedAt": 1697123456999
}
```

## Executing Arbitration Result

### Release Funds (Verdict: "release")

**Who Executes**: Receiver

**Endpoint**: `POST /api/v1/escrows/arbitrations/{arbitrationId}/execute`

```json
{
  "arkAddress": "ark1receiver..."
}
```

**Preconditions**:
- Arbitration status: `resolved`
- Arbitration verdict: `release`
- Executor public key: Must be receiver
- Contract status: `under-arbitration`
- Contract has VTXOs

**Transaction Creation**:
```typescript
{
  action: "release-funds",
  status: "pending-counterparty-signature",
  initiatedByPubKey: arbitratorPubKey,
  transaction: {
    requiredSigners: ["receiver"],  // Only receiver signature needed
    approvedByPubKeys: [arbitratorPubKey],  // Arbitrator pre-signed
    arkTx: "base64-psbt-with-arbitrator-sig",
    checkpoints: ["..."]
  }
}
```

**Signature Flow**:

1. **Receiver Signs**: `PATCH /api/v1/escrows/contracts/{contractId}/executions/{executionId}`
   ```json
   {
     "arkTx": "base64-receiver-signed-psbt",
     "checkpoints": ["signed-checkpoint1", "..."]
   }
   ```

2. **Automatic Submission**: Since only receiver signature required and arbitrator pre-signed, transaction submits immediately after receiver signs.

3. **State Transitions**:
   ```
   Contract: under-arbitration → pending-execution → completed
   Execution: pending-counterparty-signature → pending-server-confirmation → executed
   ```

### Refund (Verdict: "refund")

**Status**: Not implemented

**Intended Flow**:
- Sender receives refund to their Ark address
- Arbitrator pre-signs
- Sender provides final signature
- Same execution pattern as release

**Current Behavior**: Throws `NotImplementedException`

## Unilateral Paths with Timelocks

**Status**: Not yet implemented in codebase

**Design Intent**:

After timelock expiry, either party can exit unilaterally without arbitrator:

**Exit Delay Configuration** (from environment):
- `VTXO_TREE_EXPIRY`: 604672 seconds (7 days)
- `UNILATERAL_EXIT_DELAY`: 86400 seconds (24 hours)
- `BOARDING_EXIT_DELAY`: 7776000 seconds (3 months)

**Future Implementation**:
1. Timelock embedded in Ark address tapscript
2. After expiry, sender can trigger refund path
3. Or receiver can trigger release path
4. No arbitrator signature required

## Arbitrator Key Management

### Development Keys

**DO NOT USE IN PRODUCTION**

`.env.example` contains test keys:
```bash
# Arbitrator (x-only public key)
ARBITRATOR_PUB_KEY=61d8b7526b6d5a46a57a01fcab370acaad1bff309da342bf4acc9077db6b4ac2

# Private key (hex) - DEVELOPMENT ONLY
# 67b4f9c22402116a4eb1ac9a6d6ceb8b67b75bd1e7165078f8bc0b6f6ece30b0
```

**These keys are publicly known - never use for real funds**

### Production Key Generation

**Step 1: Generate Private Key**

```bash
# Using OpenSSL
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Step 2: Derive Public Key**

Use secp256k1 library to derive x-only public key:

```javascript
import { utils } from '@noble/secp256k1';

const privKey = 'your-hex-private-key';
const pubKey = utils.bytesToHex(
  utils.pointFromScalar(utils.hexToBytes(privKey), true)
);
const xOnlyPubKey = pubKey.slice(2); // Remove 02/03 prefix
console.log('ARBITRATOR_PUB_KEY=' + xOnlyPubKey);
```

**Step 3: Secure Storage**

**Private Key**:
- Store in secure key management system (AWS KMS, HashiCorp Vault, etc.)
- Never commit to version control
- Never log or expose in error messages
- Rotate periodically

**Public Key**:
- Set in production environment: `ARBITRATOR_PUB_KEY=<x-only-pubkey>`
- Can be public (embedded in Ark addresses)

### Key Rotation

**Procedure**:
1. Generate new keypair
2. Deploy new `ARBITRATOR_PUB_KEY` to environment
3. Restart API server
4. **Critical**: New contracts use new key
5. **Old contracts**: Still require old arbitrator key for disputes

**Migration Strategy**:
- Keep old private key accessible for existing contracts
- Maintain mapping: `contractId → arbitratorPubKey`
- Or store `arbitratorPubKey` in contract record

## Notification System (Future)

**Design Intent**:
- Email/webhook notifications when dispute opened
- Alert arbitrator when action required
- Notify parties when verdict issued

**Not Yet Implemented**:
- `ContractArbitration` entity has no notification fields
- No email service integrated
- No webhook endpoints

**Recommended Implementation**:
1. Add `notificationsSent` field to `ContractArbitration`
2. Integrate email service (SendGrid, AWS SES)
3. Event listeners on arbitration state changes
4. Admin dashboard for pending arbitrations

## Monitoring Arbitrations

### List All Arbitrations (User View)

**Endpoint**: `GET /api/v1/escrows/arbitrations`

**Query Parameters**:
- `limit`: Max results (default 100)
- `cursor`: Pagination cursor

**Response**:
```json
{
  "items": [
    {
      "externalId": "arb123xyz",
      "contractId": "contract789",
      "claimantPublicKey": "9a99c66a...",
      "defendantPublicKey": "b1a2c3d4...",
      "reason": "Dispute reason",
      "status": "pending",
      "verdict": null,
      "createdAt": 1697123456789,
      "updatedAt": 1697123456789
    }
  ],
  "nextCursor": "base64-cursor",
  "total": 42
}
```

**Authorization**: Returns only arbitrations where user is claimant or defendant

### Admin View

**Endpoint**: `GET /api/v1/admin/contracts/{contractId}`

**Response Includes**:
```json
{
  "arbitrations": [
    {
      "externalId": "arb123xyz",
      "status": "pending",
      "verdict": null,
      "claimantPublicKey": "...",
      "defendantPublicKey": "...",
      "reason": "Dispute reason"
    }
  ]
}
```

**Lists all arbitrations for contract** (not filtered by user)

## Troubleshooting

### Dispute Cannot Be Opened

**Error**: "Contract not found for status 'funded' or 'pending-execution'"

**Cause**: Contract is in wrong state

**Solution**: Check contract status first
```bash
GET /api/v1/escrows/contracts/{contractId}

# If status is "completed", dispute is too late
# If status is "draft", must accept contract first
```

### Arbitration Already Exists

**Error**: "Contract already under arbitration"

**Cause**: Only one active arbitration per contract

**Solution**: Close existing arbitration before opening new one

### Arbitrator Cannot Execute

**Error**: "Use is not the receiver, cannot release funds"

**Cause**: Arbitrator cannot execute directly, only beneficiary can

**Solution**:
1. Arbitrator sets verdict via admin endpoint
2. Beneficiary (receiver or sender) executes with their signature

### Execution Fails After Arbitration

**Check**:
- Arbitration status: Must be `resolved`
- Arbitration verdict: Must match execution path (`release` for receiver)
- Contract VTXOs: Must still be unspent
- Executor identity: Must match verdict beneficiary
