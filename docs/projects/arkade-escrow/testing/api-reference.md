# Arkade Escrow - API Reference

Complete API reference for the Arkade Escrow service. All endpoints are versioned under `/api/v1`.

## Base URL

```
Local Development: http://localhost:3002/api/v1
Production: http://api.escrow.mutinynet.arkade.sh/api/v1
```

## Authentication

Most endpoints require JWT authentication using Bearer tokens.

Include the token in the Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Response Envelope

All successful responses are wrapped in an envelope:

```json
{
  "data": { /* response payload */ }
}
```

Paginated responses include metadata:

```json
{
  "data": [ /* items */ ],
  "meta": {
    "total": 100,
    "nextCursor": "base64EncodedCursor"
  }
}
```

## Error Responses

Errors follow standard HTTP status codes:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

Common status codes:
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing or invalid JWT)
- `403` - Forbidden (not allowed to access resource)
- `404` - Not Found
- `409` - Conflict (resource state conflict)
- `500` - Internal Server Error

---

## Authentication Endpoints

### POST /auth/signup/challenge

Request a cryptographic challenge to sign for authentication.

**Request:**
```bash
curl -X POST http://localhost:3002/api/v1/auth/signup/challenge \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:test" \
  -d '{
    "publicKey": "9a99c66a064f18f93377ff5c194506d43925da02aad7897ecb56ce5e747b08e3"
  }'
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| publicKey | string | Yes | Compressed or x-only public key (hex) |

**Response (201):**
```json
{
  "challenge": {
    "scope": "signup",
    "nonce": "random-nonce-string",
    "issuedAt": "2025-10-16T12:00:00.000Z",
    "origin": "http://localhost:test"
  },
  "challengeId": "uuid-challenge-id",
  "hashToSignHex": "64-char-hex-hash",
  "expiresAt": "2025-10-16T12:10:00.000Z"
}
```

### POST /auth/signup/verify

Verify the signed challenge and receive a JWT token.

**Request:**
```bash
curl -X POST http://localhost:3002/api/v1/auth/signup/verify \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:test" \
  -d '{
    "publicKey": "9a99c66a064f18f93377ff5c194506d43925da02aad7897ecb56ce5e747b08e3",
    "signature": "schnorr-signature-hex",
    "challengeId": "uuid-challenge-id"
  }'
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| publicKey | string | Yes | Same public key from challenge request |
| signature | string | Yes | Schnorr signature of hashToSignHex (hex) |
| challengeId | string | Yes | Challenge ID from previous request |

**Response (201):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "issuedAt": 1729080000,
  "expiresAt": 1729684800,
  "userId": "8402072f-3160-44a8-aba6-32dc7540c1cf",
  "publicKey": "9a99c66a064f18f93377ff5c194506d43925da02aad7897ecb56ce5e747b08e3"
}
```

**Error Responses:**
- `400` - Invalid signature or expired challenge
- `401` - Signature verification failed

---

## Escrow Request Endpoints

### GET /escrows/requests/orderbook

Public orderbook of escrow requests (only public requests visible).

**Request:**
```bash
curl "http://localhost:3002/api/v1/escrows/requests/orderbook?limit=20&cursor=base64cursor"
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 20 | Max items to return (1-100) |
| cursor | string | - | Pagination cursor from previous response |

**Response (200):**
```json
{
  "data": [
    {
      "externalId": "q3f7p9n4z81k6c0b",
      "side": "receiver",
      "amount": 12345,
      "description": "Payment for services",
      "status": "open",
      "createdAt": 1729080000000
    }
  ],
  "meta": {
    "total": 50,
    "nextCursor": "base64EncodedCursor"
  }
}
```

### POST /escrows/requests

Create a new escrow request. Requires authentication.

**Request:**
```bash
curl -X POST http://localhost:3002/api/v1/escrows/requests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "side": "receiver",
    "amount": 12345,
    "description": "Payment for services",
    "public": true
  }'
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| side | string | Yes | "receiver" or "sender" |
| amount | number | Yes | Amount in satoshis (minimum 0) |
| description | string | Yes | Description (max 1000 chars) |
| public | boolean | No | Whether visible on orderbook (default: false) |

**Response (201):**
```json
{
  "data": {
    "externalId": "q3f7p9n4z81k6c0b",
    "shareUrl": "https://app.example/escrows/requests/q3f7p9n4z81k6c0b"
  }
}
```

### GET /escrows/requests/mine

Get authenticated user's escrow requests.

**Request:**
```bash
curl "http://localhost:3002/api/v1/escrows/requests/mine?limit=20&status=open" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 20 | Max items to return (1-100) |
| cursor | string | - | Pagination cursor |

**Response (200):**
```json
{
  "data": [
    {
      "externalId": "q3f7p9n4z81k6c0b",
      "side": "receiver",
      "amount": 12345,
      "description": "Payment for services",
      "status": "open",
      "public": true,
      "createdAt": 1729080000000
    }
  ],
  "meta": {
    "total": 10,
    "nextCursor": null
  }
}
```

### GET /escrows/requests/:externalId

Get a specific escrow request by ID.

**Request:**
```bash
curl http://localhost:3002/api/v1/escrows/requests/q3f7p9n4z81k6c0b \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**
```json
{
  "data": {
    "externalId": "q3f7p9n4z81k6c0b",
    "side": "receiver",
    "amount": 12345,
    "description": "Payment for services",
    "status": "open",
    "public": true,
    "createdAt": 1729080000000
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Not allowed to view this request (private request, not owner)
- `404` - Request not found

### DELETE /escrows/requests/:externalId

Cancel an escrow request. Only the creator can cancel, and request must be "open".

**Request:**
```bash
curl -X DELETE http://localhost:3002/api/v1/escrows/requests/q3f7p9n4z81k6c0b \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**
```json
{
  "data": {}
}
```

**Error Responses:**
- `403` - Not the request creator
- `404` - Request not found
- `409` - Request already accepted or canceled

---

## Escrow Contract Endpoints

### GET /escrows/contracts

Get authenticated user's escrow contracts.

**Request:**
```bash
curl "http://localhost:3002/api/v1/escrows/contracts?status=funded&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 20 | Max items to return (1-100) |
| cursor | string | - | Pagination cursor |
| status | string | - | Filter by status (draft, created, funded, executed, disputed, resolved) |

**Response (200):**
```json
{
  "data": [
    {
      "externalId": "a1b2c3d4e5f6",
      "requestId": "q3f7p9n4z81k6c0b",
      "sender": "sender-public-key",
      "receiver": "receiver-public-key",
      "amount": 12345,
      "arkAddress": "ark1qxy...",
      "status": "funded",
      "createdAt": 1729080000000,
      "updatedAt": 1729080100000
    }
  ],
  "meta": {
    "total": 5,
    "nextCursor": null
  }
}
```

### POST /escrows/contracts

Create a contract from a public escrow request (accept the request).

**Request:**
```bash
curl -X POST http://localhost:3002/api/v1/escrows/contracts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "q3f7p9n4z81k6c0b"
  }'
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| requestId | string | Yes | External ID of the escrow request |

**Response (201):**
```json
{
  "data": {
    "externalId": "a1b2c3d4e5f6",
    "requestId": "q3f7p9n4z81k6c0b",
    "senderPublicKey": "sender-pubkey",
    "receiverPublicKey": "receiver-pubkey",
    "amount": 12345,
    "status": "draft",
    "createdAt": 1729080000000,
    "updatedAt": 1729080000000
  }
}
```

**Error Responses:**
- `400` - Invalid request (only public requests, amount must be > 0)
- `403` - Cannot accept own request
- `404` - Request not found
- `409` - Request not open

### GET /escrows/contracts/:contractId

Get a specific contract by ID.

**Request:**
```bash
curl http://localhost:3002/api/v1/escrows/contracts/a1b2c3d4e5f6 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**
```json
{
  "data": {
    "externalId": "a1b2c3d4e5f6",
    "requestId": "q3f7p9n4z81k6c0b",
    "sender": "sender-public-key",
    "receiver": "receiver-public-key",
    "amount": 12345,
    "arkAddress": "ark1qxy...",
    "status": "funded",
    "createdAt": 1729080000000,
    "updatedAt": 1729080100000
  }
}
```

**Error Responses:**
- `403` - Not allowed to access this contract
- `404` - Contract not found

### POST /escrows/contracts/:contractId/accept

Accept a draft contract (transition from draft to created).

**Request:**
```bash
curl -X POST http://localhost:3002/api/v1/escrows/contracts/a1b2c3d4e5f6/accept \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**
```json
{
  "data": {
    "externalId": "a1b2c3d4e5f6",
    "requestId": "q3f7p9n4z81k6c0b",
    "sender": "sender-public-key",
    "receiver": "receiver-public-key",
    "amount": 12345,
    "arkAddress": "ark1qxy...",
    "status": "created",
    "createdAt": 1729080000000,
    "updatedAt": 1729080100000
  }
}
```

### POST /escrows/contracts/:contractId/reject

Reject a draft contract.

**Request:**
```bash
curl -X POST http://localhost:3002/api/v1/escrows/contracts/a1b2c3d4e5f6/reject \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Changed my mind"
  }'
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reason | string | Yes | Reason for rejection |

**Response (200):**
```json
{
  "data": {
    "externalId": "a1b2c3d4e5f6",
    "status": "rejected",
    "updatedAt": 1729080100000
  }
}
```

### POST /escrows/contracts/:contractId/execute

Create a direct settlement execution transaction for the contract.

**Request:**
```bash
curl -X POST http://localhost:3002/api/v1/escrows/contracts/a1b2c3d4e5f6/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arkAddress": "ark1destination..."
  }'
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| arkAddress | string | Yes | Destination Ark address |

**Response (201):**
```json
{
  "data": {
    "externalId": "exec-id-xyz",
    "contractId": "a1b2c3d4e5f6",
    "arkTx": "base64-encoded-psbt",
    "checkpoints": [
      "base64-checkpoint-1",
      "base64-checkpoint-2"
    ],
    "vtxo": {
      "txid": "txid-hex",
      "vout": 0,
      "value": 12345
    }
  }
}
```

**Error Responses:**
- `403` - Not allowed to execute this contract
- `404` - Contract not found

### GET /escrows/contracts/:contractId/executions

Get all executions for a contract.

**Request:**
```bash
curl http://localhost:3002/api/v1/escrows/contracts/a1b2c3d4e5f6/executions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**
```json
{
  "data": [
    {
      "externalId": "exec-id-xyz",
      "contractId": "a1b2c3d4e5f6",
      "status": "pending_signatures",
      "transaction": {
        "arkTx": "base64-psbt",
        "checkpoints": ["base64-checkpoint-1"]
      },
      "createdAt": 1729080000000
    }
  ],
  "meta": {
    "total": 1
  }
}
```

### GET /escrows/contracts/:contractId/executions/:executionId

Get a specific execution by ID.

**Request:**
```bash
curl http://localhost:3002/api/v1/escrows/contracts/a1b2c3d4e5f6/executions/exec-id-xyz \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**
```json
{
  "data": {
    "externalId": "exec-id-xyz",
    "contractId": "a1b2c3d4e5f6",
    "status": "pending_signatures",
    "transaction": {
      "arkTx": "base64-psbt",
      "checkpoints": ["base64-checkpoint-1"]
    },
    "createdAt": 1729080000000
  }
}
```

### PATCH /escrows/contracts/:contractId/executions/:executionId

Sign an execution transaction.

**Request:**
```bash
curl -X PATCH http://localhost:3002/api/v1/escrows/contracts/a1b2c3d4e5f6/executions/exec-id-xyz \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arkTx": "base64-signed-psbt",
    "checkpoints": ["base64-signed-checkpoint-1", "base64-signed-checkpoint-2"]
  }'
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| arkTx | string | Yes | Signed PSBT (base64) |
| checkpoints | array | Yes | Signed checkpoint PSBTs (base64) |

**Response (200):**
```json
{
  "data": {
    "externalId": "exec-id-xyz",
    "contractId": "a1b2c3d4e5f6",
    "status": "fully_signed",
    "transaction": {
      "arkTx": "base64-signed-psbt",
      "checkpoints": ["base64-signed-checkpoint-1"]
    },
    "updatedAt": 1729080100000
  }
}
```

---

## Admin Endpoints

### GET /admin/v1/contracts

List all contracts (admin only). No authentication currently enforced.

**Request:**
```bash
curl "http://localhost:3002/api/admin/v1/contracts?limit=20"
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|----------|-------------|
| limit | integer | 20 | Max items to return (1-100) |
| cursor | string | - | Pagination cursor |

**Response (200):**
```json
{
  "data": [
    {
      "externalId": "a1b2c3d4e5f6",
      "amount": 12345,
      "status": "funded",
      "createdAt": 1729080000000
    }
  ],
  "meta": {
    "total": 100,
    "nextCursor": "base64cursor"
  }
}
```

### GET /admin/v1/contracts/:externalId

Get full contract details including all internal state.

**Request:**
```bash
curl http://localhost:3002/api/admin/v1/contracts/a1b2c3d4e5f6
```

**Response (200):**
```json
{
  "data": {
    "contract": {
      "externalId": "a1b2c3d4e5f6",
      "requestId": "q3f7p9n4z81k6c0b",
      "sender": "sender-pubkey",
      "receiver": "receiver-pubkey",
      "amount": 12345,
      "arkAddress": "ark1qxy...",
      "status": "disputed"
    },
    "executions": [],
    "arbitrations": []
  }
}
```

### POST /admin/v1/contracts/:externalId/arbitrate

Arbitrate a disputed contract.

**Request:**
```bash
curl -X POST http://localhost:3002/api/admin/v1/contracts/a1b2c3d4e5f6/arbitrate \
  -H "Content-Type: application/json" \
  -d '{
    "disputeId": "dispute-id",
    "action": "release_to_receiver"
  }'
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| disputeId | string | Yes | ID of the dispute to arbitrate |
| action | string | Yes | Arbitration action (release_to_receiver, refund_to_sender) |

**Response (200):**
```json
{
  "data": {
    "arbitrationId": "arb-id-xyz",
    "contractId": "a1b2c3d4e5f6",
    "decision": "release_to_receiver",
    "executedAt": 1729080100000
  }
}
```

### GET /admin/v1/contracts/sse

Server-Sent Events stream for real-time contract updates.

**Request:**
```bash
curl -N http://localhost:3002/api/admin/v1/contracts/sse
```

**Event Stream:**
```
data: {"type":"contract_created","contractId":"a1b2c3d4e5f6"}

data: {"type":"contract_funded","contractId":"a1b2c3d4e5f6","amount":12345}
```

---

## Health Endpoint

### GET /health

Health check endpoint.

**Request:**
```bash
curl http://localhost:3002/health
```

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2025-10-16T12:00:00.000Z",
  "uptime": 12345,
  "environment": "development"
}
```
