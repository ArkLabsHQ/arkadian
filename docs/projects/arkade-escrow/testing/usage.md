# Arkade Escrow - Quick Start Guide

This guide covers the basic workflow for testing and using the Arkade Escrow system.

## Prerequisites

Before starting, ensure you have:

- **Node.js 24.x** (latest stable version)
- **Nigiri** running with `--ark` flag
- **arkd** service running at `localhost:7070`

## Starting Nigiri

```bash
nigiri start --ark
```

This will start a local Bitcoin regtest environment with Ark support.

## User Signup

### Using the Signup Script

The easiest way to create a test user is with the provided signup script:

```bash
cd /path/to/arkade-escrow
node server/scripts/signup.js --local
```

This will output:

```
1. Generating keypair...
Private key (hex): <private-key>
Public key (compressed): <public-key>
Public key (x-only): <x-only-public-key>

2. Requesting challenge...
Challenge response status: 201

3. Signing...
Signature: <signature>

4. Manual verification test...
Manual signature verification: true

5. API verification...
✅ SUCCESS! {
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  userId: '8402072f-3160-44a8-aba6-32dc7540c1cf',
  publicKey: '9a99c66a064f18f93377ff5c194506d43925da02aad7897ecb56ce5e747b08e3'
}
```

**Save the `accessToken`** - you'll need it for authentication.

### Manual Signup with curl

Alternatively, sign up manually:

1. Request a challenge:
```bash
curl -X POST http://localhost:3002/api/v1/auth/signup/challenge \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:test" \
  -d '{"publicKey": "YOUR_PUBLIC_KEY"}'
```

2. Sign the `hashToSignHex` from the response using your private key

3. Verify the signature:
```bash
curl -X POST http://localhost:3002/api/v1/auth/signup/verify \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:test" \
  -d '{
    "publicKey": "YOUR_PUBLIC_KEY",
    "signature": "YOUR_SIGNATURE",
    "challengeId": "CHALLENGE_ID"
  }'
```

## Accessing Swagger UI

The interactive API documentation is available at:

```
http://localhost:3002/api/v1/docs
```

To authenticate in Swagger:
1. Click the "Authorize" button
2. Enter your JWT token: `Bearer YOUR_ACCESS_TOKEN`
3. Click "Authorize" and "Close"

## Basic Workflow

### 1. Create an Escrow Request

Create a request as a receiver:

```bash
curl -X POST http://localhost:3002/api/v1/escrows/requests \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "side": "receiver",
    "amount": 12345,
    "description": "Payment for services",
    "public": true
  }'
```

Response:
```json
{
  "data": {
    "externalId": "q3f7p9n4z81k6c0b",
    "shareUrl": "https://app.example/escrows/requests/q3f7p9n4z81k6c0b"
  }
}
```

### 2. Accept the Request (Create Contract)

As a different user (sender), accept the request:

```bash
curl -X POST http://localhost:3002/api/v1/escrows/contracts \
  -H "Authorization: Bearer SENDER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "q3f7p9n4z81k6c0b"
  }'
```

This creates a contract in `draft` status.

### 3. Accept the Draft Contract

The receiver accepts the draft to activate it:

```bash
curl -X POST http://localhost:3002/api/v1/escrows/contracts/CONTRACT_ID/accept \
  -H "Authorization: Bearer RECEIVER_ACCESS_TOKEN"
```

The contract is now in `created` status with an `arkAddress` for funding.

### 4. Fund the Contract

Fund the contract with VTXOs using Nigiri's ark CLI:

```bash
nigiri ark send --to ARK_ADDRESS --amount 12345 --password secret
```

Wait 5-10 seconds for arkd to sync. The contract status will change to `funded`.

### 5. Execute the Contract (Happy Path)

Create an execution transaction:

```bash
curl -X POST http://localhost:3002/api/v1/escrows/contracts/CONTRACT_ID/execute \
  -H "Authorization: Bearer RECEIVER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arkAddress": "DESTINATION_ARK_ADDRESS"
  }'
```

This returns an execution with `arkTx` and `checkpoints` that need to be signed by both parties.

### 6. Sign the Execution

Both parties sign the execution transaction using the SDK, then submit their signatures:

```bash
curl -X PATCH http://localhost:3002/api/v1/escrows/contracts/CONTRACT_ID/executions/EXECUTION_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arkTx": "SIGNED_PSBT_BASE64",
    "checkpoints": ["SIGNED_CHECKPOINT_1", "SIGNED_CHECKPOINT_2"]
  }'
```

Once both parties sign, the transaction is finalized and broadcast.

## Viewing Contract Details

Get contract details:

```bash
curl http://localhost:3002/api/v1/escrows/contracts/CONTRACT_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

List your contracts:

```bash
curl http://localhost:3002/api/v1/escrows/contracts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Filter by status:

```bash
curl "http://localhost:3002/api/v1/escrows/contracts?status=funded" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Health Check

Verify the API is running:

```bash
curl http://localhost:3002/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-08-26T10:00:00.000Z",
  "uptime": 12345,
  "environment": "development"
}
```
